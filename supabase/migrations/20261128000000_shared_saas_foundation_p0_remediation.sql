-- =============================================================================
-- KhelGrid TOSM Sprint 1 — Shared SaaS Foundation P0 Security & Governance Remediation
-- Target: Development Environment & Hosted Dev Supabase (hznsbxvovjxvmnchzzqt)
-- =============================================================================
-- Remediates all P0 & P1 database findings across:
--   1. Tenant Provisioning Security (closes direct client INSERT on tenants; enforces
--      confirmed-email verification, strict input validation, advisory locks, and
--      idempotent verification callbacks in provision_initial_tenant_owner).
--   2. Public Directory Integrity (separates verification from directory publication
--      approval; prevents unverified/unapproved/suspended/deleted tenants from appearing
--      in tenant_public_directory; hardens RLS & purges stale unverified rows).
--   3. Multi-Tenant Authorization & Trigger Protection (fixes deleted_at bypass in
--      has_tenant_permission, prevents director self-promotion to owner, blocks
--      client tampering with tenants.owner_id/status/deleted_at & profiles.role &
--      academy_profiles.directory_academy_id/is_publicly_listed, enforces email matching
--      in accept_tenant_invitation(p_token_hash), and enables FORCE ROW LEVEL SECURITY).
--   4. Authorized Platform Moderator RPCs (separate verification vs publication vs
--      operational suspension transitions).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TENANTS SCHEMA HARDENING & VERIFICATION/PUBLICATION SEPARATION
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS directory_publication_status text NOT NULL DEFAULT 'unpublished',
  ADD COLUMN IF NOT EXISTS directory_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS directory_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS directory_rejection_reason text,
  ADD COLUMN IF NOT EXISTS provisioning_idempotency_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_directory_publication_status_check'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_directory_publication_status_check
      CHECK (directory_publication_status IN ('unpublished', 'pending_approval', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_directory_rejection_reason_len'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_directory_rejection_reason_len
      CHECK (directory_rejection_reason IS NULL OR char_length(directory_rejection_reason) <= 1000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenants_idempotency_key_len'
      AND conrelid = 'public.tenants'::regclass
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_idempotency_key_len
      CHECK (
        provisioning_idempotency_key IS NULL
        OR char_length(trim(provisioning_idempotency_key)) BETWEEN 4 AND 128
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_owner_idempotency_key
  ON public.tenants(owner_id, provisioning_idempotency_key)
  WHERE owner_id IS NOT NULL AND provisioning_idempotency_key IS NOT NULL AND deleted_at IS NULL;

-- Close direct client INSERT / DELETE bypass on public.tenants
DROP POLICY IF EXISTS "tenants_auth_insert" ON public.tenants;
REVOKE INSERT, DELETE ON public.tenants FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.tenants TO authenticated;

DROP POLICY IF EXISTS "tenants_owner_update" ON public.tenants;
CREATE POLICY "tenants_owner_update"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    status = 'active'
    AND deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR public.has_tenant_role(id, ARRAY['owner', 'org_admin', 'director'])
    )
  )
  WITH CHECK (
    status = 'active'
    AND deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR public.has_tenant_role(id, ARRAY['owner', 'org_admin', 'director'])
    )
  );

-- Lock security-critical governance columns on public.tenants against client tampering
CREATE OR REPLACE FUNCTION public.protect_tenant_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
  v_is_privileged boolean;
BEGIN
  v_is_privileged :=
    v_jwt_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
    OR public.is_academy_moderator();

  IF NOT v_is_privileged THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verification_status := 'unverified';
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
      NEW.directory_publication_status := 'unpublished';
      NEW.directory_approved_at := NULL;
      NEW.directory_approved_by := NULL;
      NEW.directory_rejection_reason := NULL;
      NEW.suspended_at := NULL;
      NEW.suspended_reason := NULL;
      NEW.deleted_at := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
        RAISE EXCEPTION 'Forbidden: tenant ownership can only change via transfer_tenant_ownership().'
          USING ERRCODE = '42501';
      END IF;

      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
         OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason
         OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
         OR NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
        RAISE EXCEPTION 'Forbidden: tenant operational status or archival flags require platform governance RPCs.'
          USING ERRCODE = '42501';
      END IF;

      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
        RAISE EXCEPTION 'Forbidden: verification status can only be modified by authorized platform moderators.'
          USING ERRCODE = '42501';
      END IF;

      IF NEW.directory_publication_status IS DISTINCT FROM OLD.directory_publication_status
         OR NEW.directory_approved_at IS DISTINCT FROM OLD.directory_approved_at
         OR NEW.directory_approved_by IS DISTINCT FROM OLD.directory_approved_by
         OR NEW.directory_rejection_reason IS DISTINCT FROM OLD.directory_rejection_reason THEN
        RAISE EXCEPTION 'Forbidden: public directory approval can only be modified by authorized platform moderators.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_tenant_verification_fields() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_tenant_verification_fields ON public.tenants;
CREATE TRIGGER trg_protect_tenant_verification_fields
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_tenant_verification_fields();

-- -----------------------------------------------------------------------------
-- 2. PUBLIC DIRECTORY PROJECTION INTEGRITY (VERIFIED + APPROVED GATE)
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenant_public_directory
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS directory_publication_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_public_directory_verified_check'
      AND conrelid = 'public.tenant_public_directory'::regclass
  ) THEN
    ALTER TABLE public.tenant_public_directory
      ADD CONSTRAINT tenant_public_directory_verified_check
      CHECK (
        verification_status = 'verified'
        AND directory_publication_status = 'approved'
        AND status = 'active'
      );
  END IF;
END $$;

ALTER TABLE public.tenant_public_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_public_directory FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_public_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;

DROP POLICY IF EXISTS "tenant_public_directory_select" ON public.tenant_public_directory;
CREATE POLICY "tenant_public_directory_select"
  ON public.tenant_public_directory
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND verification_status = 'verified'
    AND directory_publication_status = 'approved'
  );

CREATE OR REPLACE FUNCTION public.sync_tenant_public_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.tenant_public_directory WHERE id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Strict gate: tenant must be active, non-deleted, verified, AND explicitly approved for public listing
    IF NEW.status = 'active'
       AND NEW.deleted_at IS NULL
       AND NEW.verification_status = 'verified'
       AND NEW.directory_publication_status = 'approved' THEN
      INSERT INTO public.tenant_public_directory (
        id,
        slug,
        name,
        tenant_type,
        sport,
        city,
        state,
        status,
        verification_status,
        directory_publication_status,
        verified_at,
        created_at
      ) VALUES (
        NEW.id,
        NEW.slug,
        NEW.name,
        NEW.tenant_type,
        NEW.sport,
        NEW.city,
        NEW.state,
        NEW.status,
        NEW.verification_status,
        NEW.directory_publication_status,
        NEW.verified_at,
        NEW.created_at
      )
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        tenant_type = EXCLUDED.tenant_type,
        sport = EXCLUDED.sport,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        status = EXCLUDED.status,
        verification_status = EXCLUDED.verification_status,
        directory_publication_status = EXCLUDED.directory_publication_status,
        verified_at = EXCLUDED.verified_at,
        created_at = EXCLUDED.created_at;
    ELSE
      -- Immediately purge if unverified, unapproved, suspended, rejected, archived, or soft-deleted
      DELETE FROM public.tenant_public_directory WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_tenant_public_directory() FROM PUBLIC, anon, authenticated;

-- Purge any unverified or unapproved rows currently lingering in the public directory projection
DELETE FROM public.tenant_public_directory d
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tenants t
  WHERE t.id = d.id
    AND t.status = 'active'
    AND t.deleted_at IS NULL
    AND t.verification_status = 'verified'
    AND t.directory_publication_status = 'approved'
);

-- -----------------------------------------------------------------------------
-- 3. ATOMIC, VERIFIED & IDEMPOTENT PROVISIONING RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provision_initial_tenant_owner(
  p_slug text,
  p_name text,
  p_tenant_type text,
  p_city text DEFAULT NULL::text,
  p_state text DEFAULT NULL::text,
  p_sport text DEFAULT NULL::text,
  p_contact_phone text DEFAULT NULL::text,
  p_contact_email text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_has_confirmed_col boolean := false;
  v_email_confirmed_at timestamptz := NULL;
  v_clean_slug text := lower(trim(COALESCE(p_slug, '')));
  v_clean_name text := trim(COALESCE(p_name, ''));
  v_idem_key text;
  v_source text;
  v_safe_metadata jsonb;
  v_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to provision organization'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Authenticated identity record not found'
      USING ERRCODE = '42501';
  END IF;

  -- Enforce trusted backend email confirmation check whenever auth.users carries email_confirmed_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_confirmed_at'
  ) INTO v_has_confirmed_col;

  IF v_has_confirmed_col THEN
    EXECUTE 'SELECT email_confirmed_at FROM auth.users WHERE id = $1'
      INTO v_email_confirmed_at
      USING v_user_id;

    IF v_email_confirmed_at IS NULL THEN
      RAISE EXCEPTION 'Email verification is required before creating an organization workspace.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_tenant_type NOT IN (
    'academy', 'coach', 'venue', 'tournament', 'club', 'school', 'college',
    'university', 'federation', 'association', 'event_organizer', 'corporate',
    'training_org', 'service_provider', 'research_org', 'media_org',
    'enterprise', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid tenant_type: %', p_tenant_type
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 160 THEN
    RAISE EXCEPTION 'Organization name must be between 2 and 160 characters.'
      USING ERRCODE = '22023';
  END IF;

  IF v_clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR char_length(v_clean_slug) < 2 OR char_length(v_clean_slug) > 100 THEN
    RAISE EXCEPTION 'Invalid slug format: %', p_slug
      USING ERRCODE = '22023';
  END IF;

  -- Strip any client-supplied privilege/verification claims from metadata
  v_safe_metadata := COALESCE(p_metadata, '{}'::jsonb);
  IF jsonb_typeof(v_safe_metadata) <> 'object' THEN
    v_safe_metadata := '{}'::jsonb;
  END IF;
  v_safe_metadata := v_safe_metadata - ARRAY[
    'owner_id', 'verification_status', 'verified_at', 'verified_by',
    'directory_publication_status', 'email_verified', 'is_admin'
  ];

  v_idem_key := nullif(trim(COALESCE(v_safe_metadata->>'idempotency_key', v_safe_metadata->>'idempotencyKey', '')), '');
  IF v_idem_key IS NOT NULL AND (char_length(v_idem_key) < 4 OR char_length(v_idem_key) > 128) THEN
    v_idem_key := NULL;
  END IF;
  v_source := COALESCE(v_safe_metadata->>'source', '');

  -- Serialize concurrent provisioning callbacks for same user + slug or idempotency key
  PERFORM pg_advisory_xact_lock(
    hashtext('provision_tenant_' || v_user_id::text || '_' || COALESCE(v_idem_key, v_clean_slug))
  );

  -- 1. Idempotency check by explicit key
  IF v_idem_key IS NOT NULL THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE owner_id = v_user_id
      AND provisioning_idempotency_key = v_idem_key
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  -- 2. Idempotency check for repeated onboarding/verification callbacks by same user & exact org identity
  IF v_tenant_id IS NULL
     AND v_source IN ('verified_partner_email_onboarding', 'unified_partner_onboarding') THEN
    SELECT id INTO v_tenant_id
    FROM public.tenants
    WHERE owner_id = v_user_id
      AND slug = v_clean_slug
      AND lower(trim(name)) = lower(v_clean_name)
      AND tenant_type = p_tenant_type
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status)
    VALUES (v_tenant_id, v_user_id, 'owner', 'active')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;

    RETURN v_tenant_id;
  END IF;

  -- 3. Atomic tenant creation (starts unverified & unpublished in directory)
  INSERT INTO public.tenants (
    slug,
    name,
    tenant_type,
    status,
    verification_status,
    directory_publication_status,
    owner_id,
    provisioning_idempotency_key,
    city,
    state,
    sport,
    contact_phone,
    contact_email,
    metadata
  ) VALUES (
    v_clean_slug,
    v_clean_name,
    p_tenant_type,
    'active',
    'unverified',
    'unpublished',
    v_user_id,
    v_idem_key,
    nullif(trim(COALESCE(p_city, '')), ''),
    nullif(trim(COALESCE(p_state, '')), ''),
    nullif(trim(COALESCE(p_sport, '')), ''),
    nullif(trim(COALESCE(p_contact_phone, '')), ''),
    nullif(lower(trim(COALESCE(p_contact_email, ''))), ''),
    v_safe_metadata
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_memberships (
    tenant_id, user_id, role, status
  ) VALUES (
    v_tenant_id, v_user_id, 'owner', 'active'
  );

  -- Default free subscription record (platform payment collection remains paused)
  IF to_regclass('public.saas_subscriptions') IS NOT NULL AND to_regclass('public.saas_plans') IS NOT NULL THEN
    INSERT INTO public.saas_subscriptions (
      subject_type, subject_id, plan_code, status, billing_cycle, payment_collection_enabled
    ) VALUES (
      'tenant', v_tenant_id, 'org_free', 'free_active', 'none', false
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Immutable provisioning audit event
  IF to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (
      tenant_id, actor_user_id, action, resource_type, resource_id, details
    ) VALUES (
      v_tenant_id,
      v_user_id,
      'organization.provisioned',
      'tenant',
      v_tenant_id::text,
      jsonb_build_object(
        'slug', v_clean_slug,
        'tenant_type', p_tenant_type,
        'email_confirmed', v_email_confirmed_at IS NOT NULL
      )
    );
  END IF;

  RETURN v_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. MULTI-TENANT AUTHORIZATION, PRIVILEGE HARDENING & SECURITY DEFINER AUDIT
-- -----------------------------------------------------------------------------

-- 4.1 Fix soft-deletion gap in has_tenant_permission()
CREATE OR REPLACE FUNCTION public.has_tenant_permission(
  p_tenant_id uuid,
  p_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships m
    JOIN public.tenants t ON t.id = m.tenant_id
    JOIN public.tenant_role_permissions rp ON rp.role = m.role
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.deleted_at IS NULL
      AND t.status = 'active'
      AND t.deleted_at IS NULL
      AND rp.permission = p_permission
  );
$$;

REVOKE ALL ON FUNCTION public.has_tenant_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_tenant_permission(uuid, text) TO authenticated;

-- 4.2 Prevent self-escalation via update_tenant_membership_role()
CREATE OR REPLACE FUNCTION public.update_tenant_membership_role(
  p_membership_id uuid,
  p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_target_record public.tenant_memberships%ROWTYPE;
  v_owner_count integer;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_target_record
  FROM public.tenant_memberships
  WHERE id = p_membership_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF v_target_record.id IS NULL THEN
    RAISE EXCEPTION 'Active membership record not found.';
  END IF;

  IF NOT public.is_active_tenant(v_target_record.tenant_id) THEN
    RAISE EXCEPTION 'Forbidden: organization is suspended or archived.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_tenant_role(v_target_record.tenant_id, ARRAY['owner', 'director']) THEN
    RAISE EXCEPTION 'Unauthorized: Only active tenant owners or directors can alter staff roles.'
      USING ERRCODE = '42501';
  END IF;

  -- Block self-modification or self-promotion entirely
  IF v_target_record.user_id = v_caller_id THEN
    RAISE EXCEPTION 'Forbidden: callers cannot modify their own membership role.'
      USING ERRCODE = '42501';
  END IF;

  -- Ownership changes must use atomic transfer_tenant_ownership()
  IF p_new_role = 'owner' OR v_target_record.role = 'owner' THEN
    IF v_target_record.role = 'owner' AND p_new_role <> 'owner' THEN
      SELECT count(*) INTO v_owner_count
      FROM public.tenant_memberships
      WHERE tenant_id = v_target_record.tenant_id
        AND role = 'owner'
        AND status = 'active'
        AND deleted_at IS NULL;

      IF v_owner_count <= 1 THEN
        RAISE EXCEPTION 'Safety violation: Cannot demote the sole owner of the tenant organization.';
      END IF;
    END IF;
    RAISE EXCEPTION 'Ownership changes must use the atomic transfer_tenant_ownership workflow.'
      USING ERRCODE = '42501';
  END IF;

  -- Only an active owner can modify or assign director / org_admin roles
  IF (p_new_role IN ('org_admin', 'director') OR v_target_record.role IN ('org_admin', 'director'))
     AND NOT public.has_tenant_role(v_target_record.tenant_id, ARRAY['owner']) THEN
    RAISE EXCEPTION 'Forbidden: Only an active organization owner can assign or alter director/org_admin roles.'
      USING ERRCODE = '42501';
  END IF;

  IF p_new_role NOT IN (
    'org_admin', 'director', 'admin', 'manager', 'admissions_manager',
    'finance_manager', 'content_manager', 'listing_manager',
    'verification_coordinator', 'head_coach', 'coach', 'accountant',
    'front_desk', 'staff', 'readonly_member', 'parent'
  ) THEN
    RAISE EXCEPTION 'Invalid tenant role: %', p_new_role USING ERRCODE = '22023';
  END IF;

  UPDATE public.tenant_memberships
  SET role = p_new_role, updated_at = now()
  WHERE id = p_membership_id;

  IF to_regclass('public.tenant_membership_audit_logs') IS NOT NULL THEN
    INSERT INTO public.tenant_membership_audit_logs (
      tenant_id, target_user_id, actor_user_id, action, old_role, new_role, notes
    ) VALUES (
      v_target_record.tenant_id,
      v_target_record.user_id,
      v_caller_id,
      'ROLE_UPDATED',
      v_target_record.role,
      p_new_role,
      format('Staff role updated from %s to %s', v_target_record.role, p_new_role)
    );
  END IF;

  IF to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (
      tenant_id, actor_user_id, action, resource_type, resource_id, details
    ) VALUES (
      v_target_record.tenant_id,
      v_caller_id,
      'membership.role_updated',
      'tenant_membership',
      p_membership_id::text,
      jsonb_build_object('old_role', v_target_record.role, 'new_role', p_new_role)
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_tenant_membership_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_tenant_membership_role(uuid, text) TO authenticated;

-- 4.3 Harden accept_tenant_invitation(p_token_hash text) to enforce recipient email match & block owner escalation
CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(
  p_token_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_email text;
  v_has_confirmed_col boolean := false;
  v_email_confirmed_at timestamptz := NULL;
  v_inv public.tenant_invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to accept invitation' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_uid;
  IF v_user_email IS NULL OR trim(v_user_email) = '' THEN
    RAISE EXCEPTION 'Authenticated account has no email address' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_confirmed_at'
  ) INTO v_has_confirmed_col;

  IF v_has_confirmed_col THEN
    EXECUTE 'SELECT email_confirmed_at FROM auth.users WHERE id = $1'
      INTO v_email_confirmed_at
      USING v_uid;
    IF v_email_confirmed_at IS NULL THEN
      RAISE EXCEPTION 'Email confirmation is required before accepting an organization invitation'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_inv
  FROM public.tenant_invitations
  WHERE token_hash = p_token_hash
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation is invalid or no longer pending';
  END IF;

  IF v_inv.expires_at <= now() THEN
    UPDATE public.tenant_invitations SET status = 'expired' WHERE id = v_inv.id;
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF v_inv.invited_email IS NULL OR lower(trim(v_inv.invited_email)) <> lower(trim(v_user_email)) THEN
    RAISE EXCEPTION 'Forbidden: invitation recipient email does not match authenticated account.'
      USING ERRCODE = '42501';
  END IF;

  IF v_inv.role = 'owner' THEN
    RAISE EXCEPTION 'Forbidden: owner role cannot be granted via invitation token.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_active_tenant(v_inv.tenant_id) THEN
    RAISE EXCEPTION 'Organization is not active' USING ERRCODE = '42501';
  END IF;

  -- Do not allow acceptance to overwrite an actively suspended membership without admin review
  IF EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE tenant_id = v_inv.tenant_id AND user_id = v_uid AND status = 'suspended'
  ) THEN
    RAISE EXCEPTION 'Forbidden: suspended membership cannot be self-reinstated via invitation.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status, invited_email, invited_by, deleted_at)
  VALUES (v_inv.tenant_id, v_uid, v_inv.role, 'active', v_inv.invited_email, v_inv.invited_by, NULL)
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = CASE WHEN public.tenant_memberships.role = 'owner' THEN 'owner' ELSE EXCLUDED.role END,
        status = 'active',
        deleted_at = NULL,
        updated_at = now();

  UPDATE public.tenant_invitations
  SET status = 'accepted', accepted_by = v_uid, accepted_at = now()
  WHERE id = v_inv.id;

  IF to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details)
    VALUES (
      v_inv.tenant_id, v_uid, 'membership.invitation_accepted', 'tenant_invitation', v_inv.id::text,
      jsonb_build_object('role', v_inv.role)
    );
  END IF;

  RETURN v_inv.tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_tenant_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(text) TO authenticated;

-- 4.4 Harden transfer_tenant_ownership to require non-deleted tenant & membership
CREATE OR REPLACE FUNCTION public.transfer_tenant_ownership(
  p_tenant_id uuid,
  p_new_owner_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_current_owner uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required to transfer ownership' USING ERRCODE = '42501';
  END IF;

  IF p_new_owner_user_id IS NULL OR p_new_owner_user_id = v_actor THEN
    RAISE EXCEPTION 'Target new owner must be a different active member';
  END IF;

  SELECT owner_id INTO v_current_owner
  FROM public.tenants
  WHERE id = p_tenant_id AND status = 'active' AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current_owner IS NULL OR v_current_owner <> v_actor THEN
    RAISE EXCEPTION 'Forbidden: only the active organization owner can transfer ownership'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE tenant_id = p_tenant_id
      AND user_id = p_new_owner_user_id
      AND status = 'active'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Target user must be an active, non-deleted member of this organization';
  END IF;

  UPDATE public.tenants
  SET owner_id = p_new_owner_user_id, updated_at = now()
  WHERE id = p_tenant_id;

  UPDATE public.tenant_memberships
  SET role = 'org_admin', updated_at = now()
  WHERE tenant_id = p_tenant_id AND user_id = v_actor AND deleted_at IS NULL;

  UPDATE public.tenant_memberships
  SET role = 'owner', updated_at = now()
  WHERE tenant_id = p_tenant_id AND user_id = p_new_owner_user_id AND deleted_at IS NULL;

  IF to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details)
    VALUES (
      p_tenant_id, v_actor, 'organization.ownership_transferred', 'tenant', p_tenant_id::text,
      jsonb_build_object('previous_owner_id', v_actor, 'new_owner_id', p_new_owner_user_id)
    );
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_tenant_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_tenant_ownership(uuid, uuid) TO authenticated;

-- 4.5 Harden create_tenant_invitation & operational soft-delete/convert RPCs
CREATE OR REPLACE FUNCTION public.create_tenant_invitation(
  p_tenant_id uuid,
  p_invited_email text,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_membership_id uuid;
  v_clean_email text := lower(trim(COALESCE(p_invited_email, '')));
BEGIN
  IF NOT public.is_active_tenant(p_tenant_id) THEN
    RAISE EXCEPTION 'Organization is not active' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.has_tenant_role(p_tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin'])
    OR (
      to_regprocedure('public.has_tenant_permission(uuid, text)') IS NOT NULL
      AND public.has_tenant_permission(p_tenant_id, 'academy:staff.manage')
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: only owners and administrators can invite staff'
      USING ERRCODE = '42501';
  END IF;

  IF v_clean_email = '' OR v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Valid invited email address is required' USING ERRCODE = '22023';
  END IF;

  IF p_role NOT IN (
    'org_admin', 'director', 'admin', 'manager', 'admissions_manager',
    'finance_manager', 'content_manager', 'listing_manager',
    'verification_coordinator', 'head_coach', 'coach', 'accountant',
    'front_desk', 'staff', 'readonly_member'
  ) THEN
    RAISE EXCEPTION 'Invalid role for invitation: %', p_role USING ERRCODE = '22023';
  END IF;

  IF p_role IN ('org_admin', 'director') AND NOT public.has_tenant_role(p_tenant_id, ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only the Organization Owner can invite Administrators or Directors'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.tenant_memberships (
    tenant_id, role, status, invited_email, invited_by
  ) VALUES (
    p_tenant_id, p_role, 'invited', v_clean_email, auth.uid()
  )
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_tenant_invitation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_invitation(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.convert_enquiry_to_student(
  p_tenant_id uuid,
  p_enquiry_id uuid,
  p_batch_id uuid,
  p_monthly_fee integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enquiry public.tenant_enquiries%ROWTYPE;
  v_student_id uuid;
  v_fee integer := GREATEST(0, COALESCE(p_monthly_fee, 0));
BEGIN
  IF NOT public.has_tenant_role(p_tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'front_desk', 'admissions_manager']) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to enroll trainees' USING ERRCODE = '42501';
  END IF;

  IF p_batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tenant_batches
    WHERE id = p_batch_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid batch for tenant %', p_tenant_id USING ERRCODE = '23503';
  END IF;

  SELECT * INTO v_enquiry
  FROM public.tenant_enquiries
  WHERE tenant_id = p_tenant_id AND id = p_enquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry not found for tenant %', p_tenant_id;
  END IF;

  INSERT INTO public.tenant_students (
    tenant_id, batch_id, student_name, parent_name, parent_phone, parent_email, monthly_fee, fee_status, is_active
  ) VALUES (
    p_tenant_id, p_batch_id, v_enquiry.student_name, v_enquiry.parent_name, v_enquiry.parent_phone,
    v_enquiry.parent_email, v_fee, CASE WHEN v_fee = 0 THEN 'exempt' ELSE 'due_soon' END, true
  )
  RETURNING id INTO v_student_id;

  UPDATE public.tenant_enquiries
  SET status = 'enrolled'
  WHERE id = p_enquiry_id AND tenant_id = p_tenant_id;

  RETURN v_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_enquiry_to_student(uuid, uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_enquiry_to_student(uuid, uuid, uuid, integer) TO authenticated;

-- 4.6 Protect public.profiles.role against self-escalation to admin/moderator
CREATE OR REPLACE FUNCTION public.protect_profiles_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
  v_is_platform_admin boolean := (
    v_jwt_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
    OR public.has_platform_role(ARRAY['admin', 'platform_super_admin', 'platform_admin'])
  );
BEGIN
  IF NOT v_is_platform_admin THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role IN ('admin', 'moderator') THEN
        NEW.role := 'athlete';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role IN ('admin', 'moderator') THEN
        RAISE EXCEPTION 'Forbidden: privileged platform roles cannot be self-assigned.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profiles_role() FROM PUBLIC;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_protect_profiles_role ON public.profiles;
    CREATE TRIGGER trg_protect_profiles_role
      BEFORE INSERT OR UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_profiles_role();

    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 4.7 Harden public.academy_profiles against directory_academy_id & is_publicly_listed spoofing
CREATE OR REPLACE FUNCTION public.protect_academy_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_role text := COALESCE(current_setting('request.jwt.claims', true)::jsonb->>'role', '');
  v_is_privileged boolean;
BEGIN
  v_is_privileged :=
    v_jwt_role = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin')
    OR public.is_academy_moderator();

  IF NOT v_is_privileged THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verification_status := 'unverified';
      NEW.moderation_note := NULL;
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
      NEW.directory_academy_id := NULL;
      NEW.is_publicly_listed := false;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'Forbidden: academy_profiles.tenant_id cannot be reassigned.'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.directory_academy_id IS DISTINCT FROM OLD.directory_academy_id THEN
        RAISE EXCEPTION 'Forbidden: only authorized moderators can link public directory academy records.'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.is_publicly_listed = true AND OLD.verification_status <> 'verified' THEN
        RAISE EXCEPTION 'Forbidden: unverified academies cannot opt into public directory listing.'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.moderation_note IS DISTINCT FROM OLD.moderation_note
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
        RAISE EXCEPTION 'Forbidden: only authorized KhelGrid moderators can modify academy verification status.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_academy_profile_verification() FROM PUBLIC;

-- 4.8 Harden tenant_memberships RLS policies & enforce FORCE ROW LEVEL SECURITY on shared core tables
DROP POLICY IF EXISTS "tenant_memberships_insert" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_insert"
  ON public.tenant_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.has_tenant_role(tenant_id, ARRAY['owner'])
      AND role <> 'owner'
    )
    OR (
      public.has_tenant_role(tenant_id, ARRAY['director'])
      AND role NOT IN ('owner', 'director', 'org_admin')
    )
    OR (
      public.has_tenant_role(tenant_id, ARRAY['admin'])
      AND role NOT IN ('owner', 'org_admin', 'director', 'admin')
    )
  );

DROP POLICY IF EXISTS "tenant_memberships_update" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_update"
  ON public.tenant_memberships
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND user_id <> auth.uid()
    AND public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])
  )
  WITH CHECK (
    deleted_at IS NULL
    AND user_id <> auth.uid()
    AND (
      (public.has_tenant_role(tenant_id, ARRAY['owner']) AND role <> 'owner')
      OR (public.has_tenant_role(tenant_id, ARRAY['director']) AND role NOT IN ('owner', 'director', 'org_admin'))
      OR (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'org_admin', 'director', 'admin'))
    )
  );

DROP POLICY IF EXISTS "tenant_memberships_delete" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_delete"
  ON public.tenant_memberships
  FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND role <> 'owner')
    OR (public.has_tenant_role(tenant_id, ARRAY['owner']) AND role <> 'owner')
    OR (public.has_tenant_role(tenant_id, ARRAY['director']) AND role NOT IN ('owner', 'org_admin', 'director'))
    OR (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'org_admin', 'director', 'admin'))
  );

DO $$
DECLARE
  v_tbl text;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY[
    'tenants',
    'tenant_memberships',
    'tenant_units',
    'tenant_public_directory',
    'tenant_invitations',
    'saas_subscriptions',
    'saas_audit_logs',
    'tenant_audit_logs',
    'academy_staff_branch_assignments'
  ]
  LOOP
    IF to_regclass('public.' || v_tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_tbl);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', v_tbl);
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5. PLATFORM MODERATION & PUBLICATION APPROVAL GOVERNANCE RPCs
-- -----------------------------------------------------------------------------

-- 5.1 Step A: Moderator verifies tenant identity/compliance (does NOT auto-publish!)
CREATE OR REPLACE FUNCTION public.admin_moderate_tenant_verification(
  p_tenant_id uuid,
  p_verification_status text,
  p_note text DEFAULT NULL::text
)
RETURNS public.tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_tenant public.tenants%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT public.is_academy_moderator() THEN
    RAISE EXCEPTION 'Forbidden: platform moderator privileges required.' USING ERRCODE = '42501';
  END IF;

  IF p_verification_status NOT IN ('unverified', 'pending_review', 'verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid verification_status: %', p_verification_status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found.', p_tenant_id;
  END IF;

  UPDATE public.tenants
  SET
    verification_status = p_verification_status,
    verified_at = CASE WHEN p_verification_status = 'verified' THEN COALESCE(verified_at, now()) ELSE NULL END,
    verified_by = CASE WHEN p_verification_status = 'verified' THEN v_actor ELSE NULL END,
    -- Moving verification away from verified immediately unpublishes from public directory
    directory_publication_status = CASE
      WHEN p_verification_status <> 'verified' AND directory_publication_status = 'approved' THEN 'unpublished'
      ELSE directory_publication_status
    END,
    updated_at = now()
  WHERE id = p_tenant_id
  RETURNING * INTO v_tenant;

  IF to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details)
    VALUES (
      p_tenant_id,
      v_actor,
      'tenant.verification_moderated',
      'tenant',
      p_tenant_id::text,
      jsonb_build_object('verification_status', p_verification_status, 'note', p_note)
    );
  END IF;

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_tenant_verification(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_tenant_verification(uuid, text, text) TO authenticated;

-- 5.2 Step B: Moderator separates publication approval from identity verification
CREATE OR REPLACE FUNCTION public.admin_set_tenant_directory_publication(
  p_tenant_id uuid,
  p_publication_status text,
  p_reason text DEFAULT NULL::text
)
RETURNS public.tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_tenant public.tenants%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT public.is_academy_moderator() THEN
    RAISE EXCEPTION 'Forbidden: platform moderator privileges required.' USING ERRCODE = '42501';
  END IF;

  IF p_publication_status NOT IN ('unpublished', 'pending_approval', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid directory_publication_status: %', p_publication_status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found.', p_tenant_id;
  END IF;

  IF p_publication_status = 'approved' AND (v_tenant.verification_status <> 'verified' OR v_tenant.status <> 'active') THEN
    RAISE EXCEPTION 'Cannot approve public directory listing for an unverified or non-active tenant.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.tenants
  SET
    directory_publication_status = p_publication_status,
    directory_approved_at = CASE WHEN p_publication_status = 'approved' THEN now() ELSE NULL END,
    directory_approved_by = CASE WHEN p_publication_status = 'approved' THEN v_actor ELSE NULL END,
    directory_rejection_reason = CASE WHEN p_publication_status = 'rejected' THEN p_reason ELSE NULL END,
    updated_at = now()
  WHERE id = p_tenant_id
  RETURNING * INTO v_tenant;

  IF to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details)
    VALUES (
      p_tenant_id,
      v_actor,
      'tenant.directory_publication_updated',
      'tenant',
      p_tenant_id::text,
      jsonb_build_object('directory_publication_status', p_publication_status, 'reason', p_reason)
    );
  END IF;

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_tenant_directory_publication(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_tenant_directory_publication(uuid, text, text) TO authenticated;

-- 5.3 Moderator operational suspension / reactivation / soft deletion control
CREATE OR REPLACE FUNCTION public.admin_set_tenant_operational_status(
  p_tenant_id uuid,
  p_status text,
  p_reason text DEFAULT NULL::text
)
RETURNS public.tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_tenant public.tenants%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT public.is_academy_moderator() THEN
    RAISE EXCEPTION 'Forbidden: platform moderator privileges required.' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('active', 'pending_verification', 'suspended', 'archived') THEN
    RAISE EXCEPTION 'Invalid tenant operational status: %', p_status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found.', p_tenant_id;
  END IF;

  UPDATE public.tenants
  SET
    status = p_status,
    suspended_at = CASE WHEN p_status = 'suspended' THEN now() ELSE NULL END,
    suspended_reason = CASE WHEN p_status = 'suspended' THEN p_reason ELSE NULL END,
    archived_at = CASE WHEN p_status = 'archived' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_tenant_id
  RETURNING * INTO v_tenant;

  IF to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (tenant_id, actor_user_id, action, resource_type, resource_id, details)
    VALUES (
      p_tenant_id,
      v_actor,
      'tenant.operational_status_changed',
      'tenant',
      p_tenant_id::text,
      jsonb_build_object('status', p_status, 'reason', p_reason)
    );
  END IF;

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_tenant_operational_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_tenant_operational_status(uuid, text, text) TO authenticated;

COMMIT;
