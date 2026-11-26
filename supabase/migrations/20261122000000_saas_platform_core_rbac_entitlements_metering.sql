-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 2: Enterprise Multi-Tenant Core, RBAC,
-- Dual Resource Ownership, Centralized Entitlements, Metering & Audit Trail
-- Migration: 20261122000000_saas_platform_core_rbac_entitlements_metering.sql
--
-- Security & Architectural Guarantees:
-- 1. Hardens public.has_tenant_role() to verify active tenant status (closes
--    suspended-tenant write/read bypass).
-- 2. Expands public.tenants to support all 18 sports ecosystem organization
--    categories, independent verification_status, lifecycle audit timestamps,
--    and optional parent_tenant_id / lightweight tenant_units (branches/teams).
-- 3. Strictly separates Platform Roles (user_roles) from Organization Roles
--    (tenant_memberships); organization membership NEVER confers platform admin.
-- 4. Adds cryptographic expiring tenant_invitations + atomic SECURITY DEFINER
--    RPCs for accept_tenant_invitation() and transfer_tenant_ownership().
-- 5. Adds module-level RBAC (tenant_role_permissions + has_tenant_permission()).
-- 6. Adds dual resource_ownership_links supporting BOTH individual ownership
--    (athletes, coaches, independent organizers) and organization ownership.
-- 7. Adds canonical saas_plans, saas_subscriptions (payments disabled by default),
--    saas_plan_entitlements, audited saas_entitlement_overrides, saas_usage_meters,
--    saas_usage_records, and server-authoritative check_saas_entitlement() RPC.
-- 8. Keeps listing verification & free public listings 100% independent of plans.
-- 9. Adds append-only immutable public.saas_audit_logs.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. CRITICAL SECURITY REMEDIATION: HARDEN has_tenant_role() FOR SUSPENDED TENANTS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, p_roles text[])
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
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND t.status = 'active'
      AND m.role = ANY(p_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_tenant_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) TO authenticated;

-- Strict Platform Role Checker — completely isolated from tenant_memberships
CREATE OR REPLACE FUNCTION public.has_platform_role(p_roles text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_role boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF to_regclass('public.user_roles') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE $q$
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = $1
        AND is_active = true
        AND role = ANY($2)
    )
  $q$
  INTO v_has_role
  USING v_uid, p_roles;

  RETURN COALESCE(v_has_role, false);
END;
$$;

REVOKE ALL ON FUNCTION public.has_platform_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_platform_role(text[]) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. EXPAND CANONICAL ORGANIZATIONS / TENANTS FOR FULL SPORTS ECOSYSTEM
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
DECLARE
  v_conname text;
BEGIN
  -- Safely replace tenant_type CHECK constraint with full 18-category ecosystem set
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'tenants'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%tenant_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.tenants
    ADD CONSTRAINT tenants_tenant_type_check CHECK (tenant_type IN (
      'academy',
      'coach',
      'venue',
      'tournament',
      'club',
      'school',
      'college',
      'university',
      'federation',
      'association',
      'event_organizer',
      'corporate',
      'training_org',
      'service_provider',
      'research_org',
      'media_org',
      'enterprise',
      'other'
    ));

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_verification_status_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_verification_status_check
      CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_no_self_parent_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_no_self_parent_check
      CHECK (parent_tenant_id IS NULL OR parent_tenant_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_parent ON public.tenants(parent_tenant_id) WHERE parent_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_verification_status ON public.tenants(verification_status);

-- Expand tenant_memberships role taxonomy cleanly while keeping backward compatibility
DO $$
DECLARE
  v_conname text;
BEGIN
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'tenant_memberships'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.tenant_memberships DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_role_check CHECK (role IN (
      'owner',
      'org_admin',
      'director',
      'admin',
      'manager',
      'finance_manager',
      'content_manager',
      'listing_manager',
      'verification_coordinator',
      'head_coach',
      'coach',
      'accountant',
      'front_desk',
      'staff',
      'readonly_member',
      'parent'
    ));
END $$;

-- Update atomic initial tenant owner provisioning RPC to support all 18 org types
CREATE OR REPLACE FUNCTION public.provision_initial_tenant_owner(
  p_slug text,
  p_name text,
  p_tenant_type text,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_sport text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to provision organization';
  END IF;

  IF p_tenant_type NOT IN (
    'academy', 'coach', 'venue', 'tournament', 'club', 'school', 'college',
    'university', 'federation', 'association', 'event_organizer', 'corporate',
    'training_org', 'service_provider', 'research_org', 'media_org',
    'enterprise', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid tenant_type: %', p_tenant_type;
  END IF;

  IF p_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid slug format: %', p_slug;
  END IF;

  INSERT INTO public.tenants (
    slug, name, tenant_type, status, verification_status, owner_id,
    city, state, sport, contact_phone, contact_email, metadata
  ) VALUES (
    p_slug, trim(p_name), p_tenant_type, 'active', 'unverified', v_user_id,
    p_city, p_state, p_sport, p_contact_phone, p_contact_email, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_memberships (
    tenant_id, user_id, role, status
  ) VALUES (
    v_tenant_id, v_user_id, 'owner', 'active'
  );

  -- Create default free_active subscription record (payments remain disabled)
  IF to_regclass('public.saas_subscriptions') IS NOT NULL AND to_regclass('public.saas_plans') IS NOT NULL THEN
    INSERT INTO public.saas_subscriptions (
      subject_type, subject_id, plan_code, status, billing_cycle, payment_collection_enabled
    ) VALUES (
      'tenant', v_tenant_id, 'org_free', 'free_active', 'none', false
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Record immutable audit entry
  IF to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (
      tenant_id, actor_user_id, action, resource_type, resource_id, details
    ) VALUES (
      v_tenant_id, v_user_id, 'organization.provisioned', 'tenant', v_tenant_id::text,
      jsonb_build_object('slug', p_slug, 'tenant_type', p_tenant_type)
    );
  END IF;

  RETURN v_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. LIGHTWEIGHT ORGANIZATION UNITS (BRANCHES, DEPARTMENTS, TEAMS, FACILITIES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) >= 2),
  unit_type text NOT NULL CHECK (unit_type IN ('branch', 'regional_office', 'department', 'team', 'facility')),
  city text,
  state text,
  lead_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_unit UNIQUE (tenant_id, id),
  CONSTRAINT uq_tenant_unit_name UNIQUE (tenant_id, unit_type, name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_units_tenant ON public.tenant_units(tenant_id, unit_type, is_active);

-- -----------------------------------------------------------------------------
-- 4. CRYPTOGRAPHIC EXPIRING INVITATIONS & ATOMIC OWNERSHIP TRANSFER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invited_email text NOT NULL CHECK (invited_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  role text NOT NULL CHECK (role IN (
    'org_admin', 'director', 'admin', 'manager', 'finance_manager',
    'content_manager', 'listing_manager', 'verification_coordinator',
    'head_coach', 'coach', 'accountant', 'front_desk', 'staff',
    'readonly_member', 'parent'
  )),
  token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Normalize legacy tenant_invitations schemas that used column "email" instead of "invited_email".
DO $$
DECLARE
  v_conname text;
BEGIN
  IF to_regclass('public.tenant_invitations') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tenant_invitations' AND column_name = 'email'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tenant_invitations' AND column_name = 'invited_email'
    ) THEN
      ALTER TABLE public.tenant_invitations RENAME COLUMN email TO invited_email;
    END IF;

    ALTER TABLE public.tenant_invitations
      ADD COLUMN IF NOT EXISTS invited_email text,
      ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
      ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

    FOR v_conname IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public'
        AND r.relname = 'tenant_invitations'
        AND c.contype = 'c'
        AND (pg_get_constraintdef(c.oid) ILIKE '%role%' OR pg_get_constraintdef(c.oid) ILIKE '%status%')
    LOOP
      EXECUTE format('ALTER TABLE public.tenant_invitations DROP CONSTRAINT IF EXISTS %I', v_conname);
    END LOOP;

    ALTER TABLE public.tenant_invitations
      ADD CONSTRAINT tenant_invitations_role_check CHECK (role IN (
        'org_admin', 'director', 'admin', 'manager', 'finance_manager',
        'content_manager', 'listing_manager', 'verification_coordinator',
        'head_coach', 'coach', 'accountant', 'front_desk', 'staff',
        'readonly_member', 'parent'
      )),
      ADD CONSTRAINT tenant_invitations_status_check CHECK (status IN (
        'pending', 'accepted', 'declined', 'revoked', 'expired'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON public.tenant_invitations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON public.tenant_invitations(lower(invited_email), status);

-- Drop legacy draft invitation RPCs with incompatible signatures/return types before replacing.
DROP FUNCTION IF EXISTS public.create_tenant_invitation(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.accept_tenant_invitation(text);

CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.tenant_invitations%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to accept invitation';
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

  IF NOT public.is_active_tenant(v_inv.tenant_id) THEN
    RAISE EXCEPTION 'Organization is not active';
  END IF;

  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status, invited_email, invited_by)
  VALUES (v_inv.tenant_id, v_uid, v_inv.role, 'active', v_inv.invited_email, v_inv.invited_by)
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = CASE WHEN public.tenant_memberships.role = 'owner' THEN 'owner' ELSE EXCLUDED.role END,
        status = 'active',
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

REVOKE ALL ON FUNCTION public.accept_tenant_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(text) TO authenticated;

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
    RAISE EXCEPTION 'Authentication required to transfer ownership';
  END IF;

  IF p_new_owner_user_id IS NULL OR p_new_owner_user_id = v_actor THEN
    RAISE EXCEPTION 'Target new owner must be a different active member';
  END IF;

  SELECT owner_id INTO v_current_owner
  FROM public.tenants
  WHERE id = p_tenant_id AND status = 'active'
  FOR UPDATE;

  IF v_current_owner IS NULL OR v_current_owner <> v_actor THEN
    RAISE EXCEPTION 'Only the active organization owner can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE tenant_id = p_tenant_id AND user_id = p_new_owner_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Target user must be an active member of this organization';
  END IF;

  UPDATE public.tenants
  SET owner_id = p_new_owner_user_id, updated_at = now()
  WHERE id = p_tenant_id;

  UPDATE public.tenant_memberships
  SET role = 'org_admin', updated_at = now()
  WHERE tenant_id = p_tenant_id AND user_id = v_actor;

  UPDATE public.tenant_memberships
  SET role = 'owner', updated_at = now()
  WHERE tenant_id = p_tenant_id AND user_id = p_new_owner_user_id;

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

REVOKE ALL ON FUNCTION public.transfer_tenant_ownership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_tenant_ownership(uuid, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. MODULE-LEVEL RBAC PERMISSION MATRIX & SERVER EVALUATOR
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_role_permissions (
  role text NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);

INSERT INTO public.tenant_role_permissions (role, permission) VALUES
  -- Owner & Org Admin: full org-scoped module permissions (NEVER platform roles)
  ('owner', 'org:settings'), ('owner', 'org:team'), ('owner', 'org:billing'), ('owner', 'org:audit'),
  ('owner', 'venues:manage'), ('owner', 'coaches:manage'), ('owner', 'trials:manage'),
  ('owner', 'events:manage'), ('owner', 'tournaments:manage'), ('owner', 'pickup_games:manage'),
  ('owner', 'bookings:manage'), ('owner', 'athletes:manage'), ('owner', 'editorial:manage'), ('owner', 'analytics:view'),
  ('org_admin', 'org:settings'), ('org_admin', 'org:team'), ('org_admin', 'org:audit'),
  ('org_admin', 'venues:manage'), ('org_admin', 'coaches:manage'), ('org_admin', 'trials:manage'),
  ('org_admin', 'events:manage'), ('org_admin', 'tournaments:manage'), ('org_admin', 'pickup_games:manage'),
  ('org_admin', 'bookings:manage'), ('org_admin', 'athletes:manage'), ('org_admin', 'editorial:manage'), ('org_admin', 'analytics:view'),
  ('director', 'org:settings'), ('director', 'org:team'), ('director', 'org:billing'), ('director', 'org:audit'),
  ('director', 'venues:manage'), ('director', 'coaches:manage'), ('director', 'trials:manage'),
  ('director', 'events:manage'), ('director', 'tournaments:manage'), ('director', 'bookings:manage'),
  ('director', 'athletes:manage'), ('director', 'analytics:view'),
  ('admin', 'org:team'), ('admin', 'venues:manage'), ('admin', 'coaches:manage'), ('admin', 'trials:manage'),
  ('admin', 'events:manage'), ('admin', 'tournaments:manage'), ('admin', 'bookings:manage'),
  ('admin', 'athletes:manage'), ('admin', 'analytics:view'),
  ('manager', 'venues:manage'), ('manager', 'events:manage'), ('manager', 'tournaments:manage'),
  ('manager', 'bookings:manage'), ('manager', 'athletes:manage'), ('manager', 'analytics:view'),
  ('finance_manager', 'org:billing'), ('finance_manager', 'bookings:manage'), ('finance_manager', 'analytics:view'),
  ('accountant', 'org:billing'), ('accountant', 'analytics:view'),
  ('content_manager', 'editorial:manage'), ('content_manager', 'trials:manage'), ('content_manager', 'events:manage'),
  ('listing_manager', 'venues:manage'), ('listing_manager', 'coaches:manage'), ('listing_manager', 'trials:manage'), ('listing_manager', 'events:manage'),
  ('verification_coordinator', 'athletes:manage'), ('verification_coordinator', 'trials:manage'),
  ('head_coach', 'coaches:manage'), ('head_coach', 'athletes:manage'), ('head_coach', 'trials:manage'),
  ('coach', 'athletes:manage'),
  ('front_desk', 'bookings:manage'), ('front_desk', 'athletes:manage'),
  ('staff', 'bookings:manage'),
  ('readonly_member', 'analytics:view')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_tenant_permission(p_tenant_id uuid, p_permission text)
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
      AND t.status = 'active'
      AND rp.permission = p_permission
  );
$$;

REVOKE ALL ON FUNCTION public.has_tenant_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_tenant_permission(uuid, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. DUAL RESOURCE OWNERSHIP (INDIVIDUAL + ORGANIZATION)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resource_ownership_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN (
    'venue', 'academy', 'coach_profile', 'opportunity', 'tournament',
    'event', 'pickup_game', 'athlete_program', 'research_paper',
    'editorial_article', 'document'
  )),
  resource_id text NOT NULL CHECK (char_length(trim(resource_id)) >= 1),
  ownership_type text NOT NULL CHECK (ownership_type IN ('individual', 'organization')),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_unit_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_resource_ownership UNIQUE (resource_type, resource_id),
  CONSTRAINT chk_dual_ownership_invariant CHECK (
    (ownership_type = 'individual' AND owner_user_id IS NOT NULL AND owner_tenant_id IS NULL) OR
    (ownership_type = 'organization' AND owner_tenant_id IS NOT NULL)
  ),
  CONSTRAINT fk_ownership_tenant_unit FOREIGN KEY (owner_tenant_id, assigned_unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_resource_ownership_tenant ON public.resource_ownership_links(owner_tenant_id, resource_type) WHERE owner_tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_ownership_user ON public.resource_ownership_links(owner_user_id, resource_type) WHERE owner_user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. CANONICAL SUBSCRIPTIONS, CENTRALIZED ENTITLEMENTS & USAGE METERING
--    (Payments remain DISABLED; free listings & verification stay independent)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saas_plans (
  code text PRIMARY KEY CHECK (code ~ '^[a-z0-9_]+$'),
  name text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('individual', 'organization', 'enterprise')),
  monthly_price_inr integer NOT NULL DEFAULT 0 CHECK (monthly_price_inr >= 0),
  billing_enabled boolean NOT NULL DEFAULT false,
  listing_publication_always_free boolean NOT NULL DEFAULT true CHECK (listing_publication_always_free = true),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.saas_plans (code, name, audience, monthly_price_inr, billing_enabled, listing_publication_always_free) VALUES
  ('individual_free', 'Athlete & Coach Free', 'individual', 0, false, true),
  ('individual_pro', 'Athlete Pro Passport (Preview)', 'individual', 499, false, true),
  ('org_free', 'Organization Starter Free', 'organization', 0, false, true),
  ('org_growth', 'Organization Growth Suite (Preview)', 'organization', 1999, false, true),
  ('org_enterprise', 'Federation & Enterprise Suite (Preview)', 'enterprise', 7999, false, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'tenant')),
  subject_id uuid NOT NULL,
  plan_code text NOT NULL REFERENCES public.saas_plans(code) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'free_active' CHECK (status IN (
    'free_active', 'trialing', 'active', 'past_due', 'grace_period', 'cancelled', 'expired', 'suspended'
  )),
  billing_cycle text NOT NULL DEFAULT 'none' CHECK (billing_cycle IN ('none', 'monthly', 'annual', 'custom')),
  payment_collection_enabled boolean NOT NULL DEFAULT false,
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  grace_ends_at timestamptz,
  cancelled_at timestamptz,
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_active_subject_subscription UNIQUE (subject_type, subject_id)
);

CREATE TABLE IF NOT EXISTS public.saas_plan_entitlements (
  plan_code text NOT NULL REFERENCES public.saas_plans(code) ON DELETE CASCADE,
  feature_key text NOT NULL CHECK (feature_key ~ '^[a-z0-9_.:-]+$'),
  is_enabled boolean NOT NULL DEFAULT true,
  is_free_community_feature boolean NOT NULL DEFAULT false,
  limit_value integer CHECK (limit_value IS NULL OR limit_value >= 0),
  PRIMARY KEY (plan_code, feature_key)
);

INSERT INTO public.saas_plan_entitlements (plan_code, feature_key, is_enabled, is_free_community_feature, limit_value) VALUES
  -- Free community & public listing guarantees across ALL plans
  ('org_free', 'listings.free_submission', true, true, NULL),
  ('org_free', 'verification.independent_review', true, true, NULL),
  ('org_free', 'org.multi_member', true, false, 5),
  ('org_free', 'org.branches', true, false, 2),
  ('org_free', 'venues.multi_location', true, false, 2),
  ('org_free', 'academy.student_management', true, false, 150),
  ('org_free', 'events.registrations', true, false, 5),
  ('org_free', 'platform.data_exports', true, false, 10),
  ('org_free', 'org.advanced_analytics', false, false, 0),
  ('org_free', 'platform.api_access', false, false, 0),
  -- Growth plan preview entitlements
  ('org_growth', 'listings.free_submission', true, true, NULL),
  ('org_growth', 'verification.independent_review', true, true, NULL),
  ('org_growth', 'org.multi_member', true, false, 25),
  ('org_growth', 'org.branches', true, false, 10),
  ('org_growth', 'venues.multi_location', true, false, 10),
  ('org_growth', 'academy.student_management', true, false, 1000),
  ('org_growth', 'events.registrations', true, false, 50),
  ('org_growth', 'platform.data_exports', true, false, 100),
  ('org_growth', 'org.advanced_analytics', true, false, NULL),
  ('org_growth', 'platform.api_access', false, false, 0),
  -- Enterprise plan preview entitlements
  ('org_enterprise', 'listings.free_submission', true, true, NULL),
  ('org_enterprise', 'verification.independent_review', true, true, NULL),
  ('org_enterprise', 'org.multi_member', true, false, 500),
  ('org_enterprise', 'org.branches', true, false, 100),
  ('org_enterprise', 'venues.multi_location', true, false, 100),
  ('org_enterprise', 'academy.student_management', true, false, 25000),
  ('org_enterprise', 'events.registrations', true, false, 500),
  ('org_enterprise', 'platform.data_exports', true, false, 5000),
  ('org_enterprise', 'org.advanced_analytics', true, false, NULL),
  ('org_enterprise', 'platform.api_access', true, false, NULL)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.saas_entitlement_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'tenant')),
  subject_id uuid NOT NULL,
  feature_key text NOT NULL,
  is_enabled boolean NOT NULL,
  override_limit integer CHECK (override_limit IS NULL OR override_limit >= 0),
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 5),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_overrides_lookup
  ON public.saas_entitlement_overrides(subject_type, subject_id, feature_key)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.saas_usage_meters (
  meter_key text PRIMARY KEY CHECK (meter_key ~ '^[a-z0-9_.:-]+$'),
  display_name text NOT NULL,
  window_type text NOT NULL CHECK (window_type IN ('current_total', 'monthly', 'daily')),
  soft_limit_ratio numeric(4,2) NOT NULL DEFAULT 0.80 CHECK (soft_limit_ratio > 0 AND soft_limit_ratio <= 1.00),
  hard_limit_enforced boolean NOT NULL DEFAULT false,
  is_community_exempt boolean NOT NULL DEFAULT false
);

INSERT INTO public.saas_usage_meters (meter_key, display_name, window_type, soft_limit_ratio, hard_limit_enforced, is_community_exempt) VALUES
  ('org.members', 'Active Organization Members', 'current_total', 0.80, true, false),
  ('org.branches', 'Branches & Facilities', 'current_total', 0.80, true, false),
  ('venues.managed', 'Managed Venues', 'current_total', 0.80, false, false),
  ('events.published_monthly', 'Published Events / Month', 'monthly', 0.80, false, false),
  ('exports.monthly', 'Data Exports / Month', 'monthly', 0.80, true, false),
  ('storage.mb', 'Document Storage (MB)', 'current_total', 0.85, true, false)
ON CONFLICT (meter_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.saas_usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('user', 'tenant')),
  subject_id uuid NOT NULL,
  meter_key text NOT NULL REFERENCES public.saas_usage_meters(meter_key) ON DELETE RESTRICT,
  window_key text NOT NULL,
  current_value integer NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_usage_window UNIQUE (subject_type, subject_id, meter_key, window_key)
);

-- Server-Authoritative Centralized Entitlement Check RPC
CREATE OR REPLACE FUNCTION public.check_saas_entitlement(
  p_subject_type text,
  p_subject_id uuid,
  p_feature_key text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sub public.saas_subscriptions%ROWTYPE;
  v_override public.saas_entitlement_overrides%ROWTYPE;
  v_plan_ent public.saas_plan_entitlements%ROWTYPE;
  v_effective_plan text := 'org_free';
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'source', 'unauthenticated', 'reason', 'Authentication required');
  END IF;

  -- Authorize caller against subject boundary
  IF p_subject_type = 'user' AND p_subject_id <> v_uid AND NOT public.has_platform_role(ARRAY['admin', 'platform_super_admin', 'platform_admin']) THEN
    RETURN jsonb_build_object('allowed', false, 'source', 'forbidden', 'reason', 'Cannot inspect another user entitlement');
  END IF;

  IF p_subject_type = 'tenant' THEN
    IF NOT public.is_active_tenant(p_subject_id) THEN
      RETURN jsonb_build_object('allowed', false, 'source', 'tenant_suspended', 'reason', 'Organization is suspended or inactive');
    END IF;
    IF NOT public.is_tenant_member(p_subject_id) AND NOT public.has_platform_role(ARRAY['admin', 'platform_super_admin', 'platform_admin']) THEN
      RETURN jsonb_build_object('allowed', false, 'source', 'forbidden', 'reason', 'Not an active member of this organization');
    END IF;
  END IF;

  -- Free community & verification features are always permitted for active subjects
  IF p_feature_key IN ('listings.free_submission', 'verification.independent_review') THEN
    RETURN jsonb_build_object('allowed', true, 'source', 'free_community_guarantee', 'limit', NULL);
  END IF;

  -- Check non-expired, non-revoked administrative override first
  SELECT * INTO v_override
  FROM public.saas_entitlement_overrides
  WHERE subject_type = p_subject_type
    AND subject_id = p_subject_id
    AND feature_key = p_feature_key
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', v_override.is_enabled,
      'source', 'admin_override',
      'limit', v_override.override_limit,
      'expires_at', v_override.expires_at
    );
  END IF;

  -- Check canonical subscription
  SELECT * INTO v_sub
  FROM public.saas_subscriptions
  WHERE subject_type = p_subject_type
    AND subject_id = p_subject_id
  LIMIT 1;

  IF FOUND THEN
    IF v_sub.status IN ('free_active', 'active', 'trialing', 'grace_period') THEN
      v_effective_plan := v_sub.plan_code;
    ELSE
      -- Expired/cancelled/suspended subscription falls back to free tier (never grants paid features)
      v_effective_plan := CASE WHEN p_subject_type = 'user' THEN 'individual_free' ELSE 'org_free' END;
    END IF;
  ELSE
    v_effective_plan := CASE WHEN p_subject_type = 'user' THEN 'individual_free' ELSE 'org_free' END;
  END IF;

  SELECT * INTO v_plan_ent
  FROM public.saas_plan_entitlements
  WHERE plan_code = v_effective_plan
    AND feature_key = p_feature_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'source', 'plan_default_deny', 'plan', v_effective_plan);
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_plan_ent.is_enabled,
    'source', 'plan',
    'plan', v_effective_plan,
    'limit', v_plan_ent.limit_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_saas_entitlement(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_saas_entitlement(text, uuid, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. APPEND-ONLY IMMUTABLE SAAS AUDIT LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saas_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (char_length(trim(action)) >= 3),
  resource_type text NOT NULL,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_audit_logs_tenant_time ON public.saas_audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_audit_logs_actor_time ON public.saas_audit_logs(actor_user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY & LEAST-PRIVILEGE GRANTS FOR ALL NEW TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE public.tenant_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_ownership_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_entitlement_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;

-- Revoke broad access first (including authenticated default privileges)
REVOKE ALL ON public.tenant_units FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.tenant_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.tenant_role_permissions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.resource_ownership_links FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.saas_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.saas_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.saas_plan_entitlements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.saas_entitlement_overrides FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.saas_usage_meters FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.saas_usage_records FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.saas_audit_logs FROM PUBLIC, anon, authenticated;

-- Least-privilege grants to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_units TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenant_invitations TO authenticated;
GRANT SELECT ON public.tenant_role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_ownership_links TO authenticated;
GRANT SELECT ON public.saas_plans TO anon, authenticated;
GRANT SELECT ON public.saas_plan_entitlements TO anon, authenticated;
GRANT SELECT ON public.saas_usage_meters TO authenticated;
GRANT SELECT ON public.saas_subscriptions TO authenticated;
GRANT SELECT ON public.saas_entitlement_overrides TO authenticated;
GRANT SELECT ON public.saas_usage_records TO authenticated;
-- Audit logs are strictly append-only (NO UPDATE, NO DELETE for authenticated)
GRANT SELECT, INSERT ON public.saas_audit_logs TO authenticated;

-- Policies: tenant_units
DROP POLICY IF EXISTS "tenant_units_select" ON public.tenant_units;
CREATE POLICY "tenant_units_select" ON public.tenant_units
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));

DROP POLICY IF EXISTS "tenant_units_manage" ON public.tenant_units;
CREATE POLICY "tenant_units_manage" ON public.tenant_units
  FOR ALL TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'org:settings'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'org:settings'));

-- Policies: tenant_invitations
DROP POLICY IF EXISTS "tenant_invitations_select" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_select" ON public.tenant_invitations
  FOR SELECT TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'org:team'));

DROP POLICY IF EXISTS "tenant_invitations_insert" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_insert" ON public.tenant_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'org:team')
    AND invited_by = auth.uid()
  );

DROP POLICY IF EXISTS "tenant_invitations_revoke" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_revoke" ON public.tenant_invitations
  FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'org:team'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'org:team') AND status IN ('revoked', 'expired'));

-- Policies: tenant_role_permissions (read-only catalogue)
DROP POLICY IF EXISTS "tenant_role_permissions_read" ON public.tenant_role_permissions;
CREATE POLICY "tenant_role_permissions_read" ON public.tenant_role_permissions
  FOR SELECT TO authenticated USING (true);

-- Policies: resource_ownership_links (dual individual + org ownership)
DROP POLICY IF EXISTS "resource_ownership_select" ON public.resource_ownership_links;
CREATE POLICY "resource_ownership_select" ON public.resource_ownership_links
  FOR SELECT TO authenticated
  USING (
    (ownership_type = 'individual' AND owner_user_id = auth.uid()) OR
    (ownership_type = 'organization' AND public.is_tenant_member(owner_tenant_id)) OR
    public.has_platform_role(ARRAY['admin', 'platform_super_admin', 'platform_admin', 'readonly_auditor'])
  );

DROP POLICY IF EXISTS "resource_ownership_insert" ON public.resource_ownership_links;
CREATE POLICY "resource_ownership_insert" ON public.resource_ownership_links
  FOR INSERT TO authenticated
  WITH CHECK (
    (ownership_type = 'individual' AND owner_user_id = auth.uid() AND owner_tenant_id IS NULL) OR
    (ownership_type = 'organization' AND public.has_tenant_permission(owner_tenant_id, 'org:settings'))
  );

DROP POLICY IF EXISTS "resource_ownership_update" ON public.resource_ownership_links;
CREATE POLICY "resource_ownership_update" ON public.resource_ownership_links
  FOR UPDATE TO authenticated
  USING (
    (ownership_type = 'individual' AND owner_user_id = auth.uid()) OR
    (ownership_type = 'organization' AND public.has_tenant_permission(owner_tenant_id, 'org:settings'))
  )
  WITH CHECK (
    (ownership_type = 'individual' AND owner_user_id = auth.uid() AND owner_tenant_id IS NULL) OR
    (ownership_type = 'organization' AND public.has_tenant_permission(owner_tenant_id, 'org:settings'))
  );

DROP POLICY IF EXISTS "resource_ownership_delete" ON public.resource_ownership_links;
CREATE POLICY "resource_ownership_delete" ON public.resource_ownership_links
  FOR DELETE TO authenticated
  USING (
    (ownership_type = 'individual' AND owner_user_id = auth.uid()) OR
    (ownership_type = 'organization' AND public.has_tenant_permission(owner_tenant_id, 'org:settings'))
  );

-- Policies: plans, entitlements, meters (public/auth read-only)
DROP POLICY IF EXISTS "saas_plans_read" ON public.saas_plans;
CREATE POLICY "saas_plans_read" ON public.saas_plans
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "saas_plan_entitlements_read" ON public.saas_plan_entitlements;
CREATE POLICY "saas_plan_entitlements_read" ON public.saas_plan_entitlements
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "saas_usage_meters_read" ON public.saas_usage_meters;
CREATE POLICY "saas_usage_meters_read" ON public.saas_usage_meters
  FOR SELECT TO authenticated USING (true);

-- Policies: subscriptions, overrides, usage (read-only for subject; clients CANNOT forge subscriptions or usage!)
DROP POLICY IF EXISTS "saas_subscriptions_select" ON public.saas_subscriptions;
CREATE POLICY "saas_subscriptions_select" ON public.saas_subscriptions
  FOR SELECT TO authenticated
  USING (
    (subject_type = 'user' AND subject_id = auth.uid()) OR
    (subject_type = 'tenant' AND public.is_tenant_member(subject_id)) OR
    public.has_platform_role(ARRAY['admin', 'platform_super_admin', 'platform_admin', 'readonly_auditor'])
  );

DROP POLICY IF EXISTS "saas_entitlement_overrides_select" ON public.saas_entitlement_overrides;
CREATE POLICY "saas_entitlement_overrides_select" ON public.saas_entitlement_overrides
  FOR SELECT TO authenticated
  USING (
    (subject_type = 'user' AND subject_id = auth.uid()) OR
    (subject_type = 'tenant' AND public.is_tenant_member(subject_id)) OR
    public.has_platform_role(ARRAY['admin', 'platform_super_admin', 'platform_admin', 'readonly_auditor'])
  );

DROP POLICY IF EXISTS "saas_usage_records_select" ON public.saas_usage_records;
CREATE POLICY "saas_usage_records_select" ON public.saas_usage_records
  FOR SELECT TO authenticated
  USING (
    (subject_type = 'user' AND subject_id = auth.uid()) OR
    (subject_type = 'tenant' AND public.is_tenant_member(subject_id)) OR
    public.has_platform_role(ARRAY['admin', 'platform_super_admin', 'platform_admin', 'readonly_auditor'])
  );

-- Policies: saas_audit_logs (append-only)
DROP POLICY IF EXISTS "saas_audit_logs_select" ON public.saas_audit_logs;
CREATE POLICY "saas_audit_logs_select" ON public.saas_audit_logs
  FOR SELECT TO authenticated
  USING (
    (tenant_id IS NOT NULL AND public.has_tenant_permission(tenant_id, 'org:audit')) OR
    (tenant_id IS NULL AND actor_user_id = auth.uid()) OR
    public.has_platform_role(ARRAY['admin', 'platform_super_admin', 'platform_admin', 'security_admin', 'readonly_auditor'])
  );

DROP POLICY IF EXISTS "saas_audit_logs_insert" ON public.saas_audit_logs;
CREATE POLICY "saas_audit_logs_insert" ON public.saas_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid() AND
    (tenant_id IS NULL OR public.is_tenant_member(tenant_id))
  );

-- -----------------------------------------------------------------------------
-- 10. INLINE ARCHITECTURAL VALIDATION ASSERTIONS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'tenant_units',
    'tenant_invitations',
    'tenant_role_permissions',
    'resource_ownership_links',
    'saas_plans',
    'saas_subscriptions',
    'saas_plan_entitlements',
    'saas_entitlement_overrides',
    'saas_usage_meters',
    'saas_usage_records',
    'saas_audit_logs'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = v_table AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'Assertion Failed: RLS not enabled on public.%', v_table;
    END IF;
  END LOOP;

  -- Assert authenticated cannot forge subscriptions, overrides, or mutate audit logs
  IF has_table_privilege('authenticated', 'public.saas_subscriptions', 'INSERT')
     OR has_table_privilege('authenticated', 'public.saas_subscriptions', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.saas_entitlement_overrides', 'INSERT')
     OR has_table_privilege('authenticated', 'public.saas_audit_logs', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.saas_audit_logs', 'DELETE') THEN
    RAISE EXCEPTION 'Assertion Failed: Excessive write privilege granted on protected SaaS tables';
  END IF;
END $$;

COMMIT;
