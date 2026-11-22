-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 2: Schema Consolidation & Soft Deletion
-- Migration: 20261122100000_phase2_schema_consolidation_and_soft_deletion.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Purpose:
-- 1. Soft-deletion and archival lifecycle:
--    - Add deleted_at & archived_at to public.tenants, public.tenant_memberships,
--      public.tenant_batches, public.tenant_students.
-- 2. Hardened authorization functions:
--    - public.is_tenant_member(), public.has_tenant_role(), public.is_active_tenant()
--      strictly require deleted_at IS NULL and status = 'active'.
-- 3. Atomic projection trigger update:
--    - public.sync_tenant_public_directory() purges soft-deleted tenants from directory.
-- 4. Complete soft-delete RLS policy updates:
--    - public.tenant_students, public.tenant_batches, public.tenant_memberships,
--      public.tenants filter out soft-deleted records for standard queries.
-- 5. Authoritative operational RPCs:
--    - public.soft_delete_tenant_student()
--    - public.restore_tenant_student()
--    - public.soft_delete_tenant_batch()
--    - public.convert_enquiry_to_student()
--    - public.create_tenant_invitation()
--    - public.accept_tenant_invitation() (Hardened with strict NOT NULL email validation)
-- 6. Append-only tenant audit logging:
--    - public.tenant_audit_logs table with immutable security policy and
--      public.log_tenant_audit_event() RPC.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SOFT-DELETION & ARCHIVAL COLUMNS
-- -----------------------------------------------------------------------------

-- 1.1 Tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN archived_at timestamptz DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_active_alive ON public.tenants(status) WHERE deleted_at IS NULL;

-- 1.2 Tenant Memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_memberships' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.tenant_memberships ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_active_alive ON public.tenant_memberships(tenant_id, user_id, status) WHERE deleted_at IS NULL;

-- 1.3 Tenant Batches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_batches' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.tenant_batches ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_batches' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE public.tenant_batches ADD COLUMN archived_at timestamptz DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_batches_alive ON public.tenant_batches(tenant_id, is_active) WHERE deleted_at IS NULL;

-- 1.4 Tenant Students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_students' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.tenant_students ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_students_alive ON public.tenant_students(tenant_id, is_active) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 2. HARDENED TENANT AUTHORIZATION FUNCTIONS (FAIL CLOSED ON SOFT DELETION)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
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
      AND m.deleted_at IS NULL
      AND t.status = 'active'
      AND t.deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;

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
      AND m.deleted_at IS NULL
      AND t.status = 'active'
      AND t.deleted_at IS NULL
      AND m.role = ANY(p_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.has_tenant_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_active_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants
    WHERE id = p_tenant_id
      AND status = 'active'
      AND deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_tenant(uuid) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. PROJECTION TRIGGER UPDATE (PURGE SOFT-DELETED TENANTS)
-- -----------------------------------------------------------------------------

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
    -- Only active, non-deleted tenants are visible in public directory
    IF NEW.status = 'active' AND NEW.deleted_at IS NULL THEN
      INSERT INTO public.tenant_public_directory (
        id, slug, name, tenant_type, sport, city, state, status, created_at
      ) VALUES (
        NEW.id, NEW.slug, NEW.name, NEW.tenant_type, NEW.sport, NEW.city, NEW.state, NEW.status, NEW.created_at
      )
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        tenant_type = EXCLUDED.tenant_type,
        sport = EXCLUDED.sport,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at;
    ELSE
      -- Immediately purge if suspended, archived, or soft-deleted
      DELETE FROM public.tenant_public_directory WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_tenant_public_directory() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. SOFT-DELETION RLS POLICY ENFORCEMENT
-- -----------------------------------------------------------------------------

-- 4.1 Tenant Students: Exclude soft-deleted records for standard queries; allow directors to view all
DROP POLICY IF EXISTS "tenant_students_member_select" ON public.tenant_students;
CREATE POLICY "tenant_students_member_select"
  ON public.tenant_students
  FOR SELECT
  TO authenticated
  USING (
    (
      public.is_tenant_member(tenant_id) OR
      guardian_user_id = auth.uid()
    ) AND (
      deleted_at IS NULL OR
      public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])
    )
  );

-- 4.2 Tenant Batches: Exclude soft-deleted batches for standard queries; allow directors to view all
DROP POLICY IF EXISTS "tenant_batches_select" ON public.tenant_batches;
CREATE POLICY "tenant_batches_select"
  ON public.tenant_batches
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id) AND (
      deleted_at IS NULL OR
      public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])
    )
  );

-- 4.3 Tenant Memberships: Exclude soft-deleted memberships for standard queries
DROP POLICY IF EXISTS "tenant_memberships_select" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_select"
  ON public.tenant_memberships
  FOR SELECT
  TO authenticated
  USING (
    (
      user_id = auth.uid() OR
      public.is_tenant_member(tenant_id)
    ) AND (
      deleted_at IS NULL OR
      public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])
    )
  );

-- 4.4 Tenants: Exclude soft-deleted tenants from member SELECT queries
DROP POLICY IF EXISTS "tenants_member_select" ON public.tenants;
CREATE POLICY "tenants_member_select"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    (
      public.is_tenant_member(id) OR
      owner_id = auth.uid()
    ) AND (
      deleted_at IS NULL OR
      owner_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 5. AUTHORITATIVE OPERATIONAL RPCs
-- -----------------------------------------------------------------------------

-- 5.1 Soft-Delete Student Trainee
CREATE OR REPLACE FUNCTION public.soft_delete_tenant_student(
  p_tenant_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_tenant_role(p_tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach']) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to archive student';
  END IF;

  UPDATE public.tenant_students
  SET deleted_at = now(),
      is_active = false,
      updated_at = now()
  WHERE tenant_id = p_tenant_id AND id = p_student_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_tenant_student(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_tenant_student(uuid, uuid) TO authenticated;

-- 5.2 Restore Soft-Deleted Student Trainee
CREATE OR REPLACE FUNCTION public.restore_tenant_student(
  p_tenant_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.has_tenant_role(p_tenant_id, ARRAY['owner', 'director', 'admin']) THEN
    RAISE EXCEPTION 'Access denied: only directors and admins can restore archived students';
  END IF;

  UPDATE public.tenant_students
  SET deleted_at = NULL,
      is_active = true,
      updated_at = now()
  WHERE tenant_id = p_tenant_id AND id = p_student_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_tenant_student(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_tenant_student(uuid, uuid) TO authenticated;

-- 5.3 Soft-Delete Batch (Safely verifies no active enrolled students remain)
CREATE OR REPLACE FUNCTION public.soft_delete_tenant_batch(
  p_tenant_id uuid,
  p_batch_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enrolled_count integer;
BEGIN
  IF NOT public.has_tenant_role(p_tenant_id, ARRAY['owner', 'director']) THEN
    RAISE EXCEPTION 'Access denied: only owners and directors can archive coaching batches';
  END IF;

  SELECT count(*) INTO v_enrolled_count
  FROM public.tenant_students
  WHERE tenant_id = p_tenant_id
    AND batch_id = p_batch_id
    AND is_active = true
    AND deleted_at IS NULL;

  IF v_enrolled_count > 0 THEN
    RAISE EXCEPTION 'Cannot archive batch with % active enrolled students. Reassign students first.', v_enrolled_count;
  END IF;

  UPDATE public.tenant_batches
  SET deleted_at = now(),
      archived_at = now(),
      is_active = false,
      updated_at = now()
  WHERE tenant_id = p_tenant_id AND id = p_batch_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_tenant_batch(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_tenant_batch(uuid, uuid) TO authenticated;

-- 5.4 Atomic Lead Conversion (Admissions CRM -> Trainee Roster)
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
BEGIN
  IF NOT public.has_tenant_role(p_tenant_id, ARRAY['owner', 'director', 'admin', 'front_desk']) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to enroll trainees';
  END IF;

  -- Lock enquiry row
  SELECT * INTO v_enquiry
  FROM public.tenant_enquiries
  WHERE tenant_id = p_tenant_id AND id = p_enquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry not found for tenant %', p_tenant_id;
  END IF;

  -- Insert into tenant_students
  INSERT INTO public.tenant_students (
    tenant_id,
    batch_id,
    student_name,
    parent_name,
    parent_phone,
    parent_email,
    monthly_fee,
    fee_status,
    is_active
  ) VALUES (
    p_tenant_id,
    p_batch_id,
    v_enquiry.student_name,
    v_enquiry.parent_name,
    v_enquiry.parent_phone,
    v_enquiry.parent_email,
    p_monthly_fee,
    'due_soon',
    true
  )
  RETURNING id INTO v_student_id;

  -- Update enquiry status
  UPDATE public.tenant_enquiries
  SET status = 'enrolled'
  WHERE id = p_enquiry_id;

  RETURN v_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_enquiry_to_student(uuid, uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_enquiry_to_student(uuid, uuid, uuid, integer) TO authenticated;

-- 5.5 Staff Invitation Management
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
BEGIN
  IF NOT public.has_tenant_role(p_tenant_id, ARRAY['owner', 'director']) THEN
    RAISE EXCEPTION 'Access denied: only owners and directors can invite staff';
  END IF;

  IF p_invited_email IS NULL OR trim(p_invited_email) = '' THEN
    RAISE EXCEPTION 'Invited email address is required';
  END IF;

  IF p_role NOT IN ('director', 'admin', 'head_coach', 'coach', 'accountant', 'front_desk', 'staff') THEN
    RAISE EXCEPTION 'Invalid role for invitation: %', p_role;
  END IF;

  INSERT INTO public.tenant_memberships (
    tenant_id,
    role,
    status,
    invited_email,
    invited_by
  ) VALUES (
    p_tenant_id,
    p_role,
    'invited',
    lower(trim(p_invited_email)),
    auth.uid()
  )
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_tenant_invitation(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tenant_invitation(uuid, text, text) TO authenticated;

-- 5.6 Accept Staff Invitation (Hardened: Strict NOT NULL Email Match & Unique Constraint Safety)
CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(
  p_membership_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_email text;
  v_membership public.tenant_memberships%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to accept invitation';
  END IF;

  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email IS NULL OR trim(v_user_email) = '' THEN
    RAISE EXCEPTION 'Authenticated user has no verified email address';
  END IF;

  SELECT * INTO v_membership
  FROM public.tenant_memberships
  WHERE id = p_membership_id AND status = 'invited'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Valid invitation not found';
  END IF;

  -- Strictly fail-closed: invited_email must exist and match authenticated user's email
  IF v_membership.invited_email IS NULL OR lower(trim(v_membership.invited_email)) <> lower(trim(v_user_email)) THEN
    RAISE EXCEPTION 'Invitation email does not match authenticated user email';
  END IF;

  -- Handle existing membership for (tenant_id, auth.uid()) cleanly without violating unique_tenant_user
  IF EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE tenant_id = v_membership.tenant_id
      AND user_id = auth.uid()
      AND id <> p_membership_id
  ) THEN
    -- Update the existing membership to active with the invited role
    UPDATE public.tenant_memberships
    SET role = v_membership.role,
        status = 'active',
        deleted_at = NULL,
        updated_at = now()
    WHERE tenant_id = v_membership.tenant_id AND user_id = auth.uid();

    -- Remove the consumed invited membership placeholder
    DELETE FROM public.tenant_memberships WHERE id = p_membership_id;
    RETURN true;
  END IF;

  UPDATE public.tenant_memberships
  SET user_id = auth.uid(),
      status = 'active',
      deleted_at = NULL,
      updated_at = now()
  WHERE id = p_membership_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_tenant_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. APPEND-ONLY TENANT AUDIT LOGGING
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_logs_lookup ON public.tenant_audit_logs(tenant_id, created_at DESC);

ALTER TABLE public.tenant_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_audit_logs_select" ON public.tenant_audit_logs;
CREATE POLICY "tenant_audit_logs_select"
  ON public.tenant_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin']));

-- Restrict direct client inserts, updates, and deletes (append-only via internal RPCs/triggers)
REVOKE ALL ON public.tenant_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tenant_audit_logs TO authenticated;

-- 6.1 Append-Only Audit Logging RPC
CREATE OR REPLACE FUNCTION public.log_tenant_audit_event(
  p_tenant_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  IF NOT public.is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Unauthorized: must be active tenant member to write audit logs';
  END IF;

  INSERT INTO public.tenant_audit_logs (
    tenant_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    p_tenant_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_tenant_audit_event(uuid, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_tenant_audit_event(uuid, text, text, uuid, jsonb) TO authenticated;

COMMIT;
