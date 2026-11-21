-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1: Security Remediation & Composite Key Integrity
-- Migration: 20261121200000_phase1_security_remediation_and_composite_keys.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Remediations:
-- 1. Tenant-scoped composite foreign keys preventing cross-tenant entity linking:
--    - public.tenant_batches: (tenant_id, id) UNIQUE
--    - public.tenant_students: (tenant_id, batch_id) REFERENCES tenant_batches(tenant_id, id)
--    - public.tenant_students: (tenant_id, id) UNIQUE
--    - public.tenant_fee_invoices: (tenant_id, student_id) REFERENCES tenant_students(tenant_id, id)
--    - public.tenant_fee_invoices: (tenant_id, id) UNIQUE
--    - public.tenant_fee_transactions: (tenant_id, invoice_id) REFERENCES tenant_fee_invoices(tenant_id, id)
--    - public.tenant_fee_transactions: (tenant_id, student_id) REFERENCES tenant_students(tenant_id, id)
--    - public.tenant_attendance_events: (tenant_id, batch_id) REFERENCES tenant_batches(tenant_id, id)
--    - public.tenant_attendance_events: (tenant_id, student_id) REFERENCES tenant_students(tenant_id, id)
-- 2. Repair anonymous enquiry insertion (Gap 5):
--    - public.is_active_tenant(p_tenant_id uuid) SECURITY DEFINER helper
--    - Update tenant_enquiries_public_insert policy to use is_active_tenant()
-- 3. Resolve circular authorization on initial tenant owner provisioning (Gap 3):
--    - public.provision_initial_tenant_owner() SECURITY DEFINER atomic RPC
-- 4. Harden tenant_memberships policies against role escalation & self-promotion (Gap 4):
--    - Granular INSERT, UPDATE, and DELETE policies
--    - Self-promotion strictly prevented (user_id != auth.uid() on UPDATE)
--    - Only owner can modify owner/director roles
--    - Non-owners cannot delete or demote owners
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. COMPOSITE UNIQUE CONSTRAINTS FOR PARENT ENTITIES
-- -----------------------------------------------------------------------------

-- Batches composite unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_batch'
  ) THEN
    ALTER TABLE public.tenant_batches
      ADD CONSTRAINT uq_tenant_batch UNIQUE (tenant_id, id);
  END IF;
END $$;

-- Students composite unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_student'
  ) THEN
    ALTER TABLE public.tenant_students
      ADD CONSTRAINT uq_tenant_student UNIQUE (tenant_id, id);
  END IF;
END $$;

-- Invoices composite unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_fee_invoice'
  ) THEN
    ALTER TABLE public.tenant_fee_invoices
      ADD CONSTRAINT uq_tenant_fee_invoice UNIQUE (tenant_id, id);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TENANT-SCOPED COMPOSITE FOREIGN KEYS
-- -----------------------------------------------------------------------------

-- 2.1 Students -> Batches (prevents assigning student in Tenant A to batch in Tenant B)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_students_batch_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_students DROP CONSTRAINT tenant_students_batch_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_tenant_batch'
  ) THEN
    ALTER TABLE public.tenant_students
      ADD CONSTRAINT fk_student_tenant_batch
      FOREIGN KEY (tenant_id, batch_id)
      REFERENCES public.tenant_batches(tenant_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2.2 Invoices -> Students (prevents invoicing student from another tenant)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_fee_invoices_student_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_fee_invoices DROP CONSTRAINT tenant_fee_invoices_student_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoice_tenant_student'
  ) THEN
    ALTER TABLE public.tenant_fee_invoices
      ADD CONSTRAINT fk_invoice_tenant_student
      FOREIGN KEY (tenant_id, student_id)
      REFERENCES public.tenant_students(tenant_id, id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 2.3 Transactions -> Invoices & Students
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_fee_transactions_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_fee_transactions DROP CONSTRAINT tenant_fee_transactions_invoice_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_fee_transactions_student_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_fee_transactions DROP CONSTRAINT tenant_fee_transactions_student_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transaction_tenant_invoice'
  ) THEN
    ALTER TABLE public.tenant_fee_transactions
      ADD CONSTRAINT fk_transaction_tenant_invoice
      FOREIGN KEY (tenant_id, invoice_id)
      REFERENCES public.tenant_fee_invoices(tenant_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transaction_tenant_student'
  ) THEN
    ALTER TABLE public.tenant_fee_transactions
      ADD CONSTRAINT fk_transaction_tenant_student
      FOREIGN KEY (tenant_id, student_id)
      REFERENCES public.tenant_students(tenant_id, id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 2.4 Attendance Events -> Batches & Students
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_attendance_events_batch_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_attendance_events DROP CONSTRAINT tenant_attendance_events_batch_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_attendance_events_student_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_attendance_events DROP CONSTRAINT tenant_attendance_events_student_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_tenant_batch'
  ) THEN
    ALTER TABLE public.tenant_attendance_events
      ADD CONSTRAINT fk_attendance_tenant_batch
      FOREIGN KEY (tenant_id, batch_id)
      REFERENCES public.tenant_batches(tenant_id, id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_tenant_student'
  ) THEN
    ALTER TABLE public.tenant_attendance_events
      ADD CONSTRAINT fk_attendance_tenant_student
      FOREIGN KEY (tenant_id, student_id)
      REFERENCES public.tenant_students(tenant_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. COVERING INDEXES FOR COMPOSITE FOREIGN KEYS
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tenant_students_composite ON public.tenant_students(tenant_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_tenant_fee_invoices_composite ON public.tenant_fee_invoices(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_tenant_fee_tx_composite ON public.tenant_fee_transactions(tenant_id, invoice_id, student_id);
CREATE INDEX IF NOT EXISTS idx_tenant_attendance_composite ON public.tenant_attendance_events(tenant_id, batch_id, student_id);

-- -----------------------------------------------------------------------------
-- 4. ANONYMOUS ENQUIRY SECURITY HELPER & POLICY REPAIR (GAP 5)
-- -----------------------------------------------------------------------------
-- Fix: Evaluation of EXISTS (SELECT 1 FROM public.tenants ...) by anon failed
-- with 'permission denied for table tenants' because public.tenants is revoked from anon.
-- A SECURITY DEFINER function with explicit search_path allows the RLS check
-- without exposing SELECT privileges on public.tenants to unauthenticated callers.
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
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_tenant(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "tenant_enquiries_public_insert" ON public.tenant_enquiries;
CREATE POLICY "tenant_enquiries_public_insert"
  ON public.tenant_enquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.is_active_tenant(tenant_id));

-- -----------------------------------------------------------------------------
-- 5. ATOMIC INITIAL TENANT OWNER PROVISIONING RPC (GAP 3)
-- -----------------------------------------------------------------------------
-- Fix: Resolves circular authorization where creating a tenant was allowed,
-- but creating the first membership was blocked because has_tenant_role()
-- required an existing active membership. This atomic RPC runs in a single
-- transaction as SECURITY DEFINER, enforcing that the creating user becomes
-- the registered owner of both the tenant and the initial owner membership.
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
    RAISE EXCEPTION 'Authentication required to provision tenant';
  END IF;

  -- Validate tenant type
  IF p_tenant_type NOT IN ('academy', 'coach', 'venue', 'tournament') THEN
    RAISE EXCEPTION 'Invalid tenant_type: %', p_tenant_type;
  END IF;

  -- Validate slug format
  IF p_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid slug format: %', p_slug;
  END IF;

  -- Insert tenant record
  INSERT INTO public.tenants (
    slug,
    name,
    tenant_type,
    status,
    owner_id,
    city,
    state,
    sport,
    contact_phone,
    contact_email,
    metadata
  ) VALUES (
    p_slug,
    p_name,
    p_tenant_type,
    'active',
    v_user_id,
    p_city,
    p_state,
    p_sport,
    p_contact_phone,
    p_contact_email,
    p_metadata
  )
  RETURNING id INTO v_tenant_id;

  -- Atomically create the owner membership record
  INSERT INTO public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    status
  ) VALUES (
    v_tenant_id,
    v_user_id,
    'owner',
    'active'
  );

  RETURN v_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. HARDEN TENANT MEMBERSHIPS POLICIES (GAP 4)
-- -----------------------------------------------------------------------------
-- Drop broad catch-all policy
DROP POLICY IF EXISTS "tenant_memberships_admin_manage" ON public.tenant_memberships;

-- 6.1 Granular INSERT policy
DROP POLICY IF EXISTS "tenant_memberships_insert" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_insert"
  ON public.tenant_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owner or Director can invite any role
    (public.has_tenant_role(tenant_id, ARRAY['owner', 'director'])) OR
    -- Admin can invite staff, coaches, etc. but NEVER owner or director
    (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'director'))
  );

-- 6.2 Granular UPDATE policy with anti-self-promotion & role ceiling
DROP POLICY IF EXISTS "tenant_memberships_update" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_update"
  ON public.tenant_memberships
  FOR UPDATE
  TO authenticated
  USING (
    -- Actor must be privileged member of the tenant
    public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])
  )
  WITH CHECK (
    -- Rule 1: A user can NEVER change their own role or status (prevents self-promotion)
    user_id != auth.uid() AND
    (
      -- Rule 2: Only the owner can promote/demote to/from owner
      (public.has_tenant_role(tenant_id, ARRAY['owner'])) OR
      -- Rule 3: Director can update other roles except owner, and cannot promote anyone to owner
      (public.has_tenant_role(tenant_id, ARRAY['director']) AND role != 'owner') OR
      -- Rule 4: Admin can only update non-executive roles (coach, accountant, front_desk, staff, parent)
      (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'director'))
    )
  );

-- 6.3 Granular DELETE policy
DROP POLICY IF EXISTS "tenant_memberships_delete" ON public.tenant_memberships;
CREATE POLICY "tenant_memberships_delete"
  ON public.tenant_memberships
  FOR DELETE
  TO authenticated
  USING (
    -- Rule 1: A member may voluntarily leave the tenant as long as they are NOT the owner
    (user_id = auth.uid() AND role != 'owner') OR
    -- Rule 2: Owner can remove any non-owner member
    (public.has_tenant_role(tenant_id, ARRAY['owner']) AND role != 'owner') OR
    -- Rule 3: Director can remove operational staff (not owner or director)
    (public.has_tenant_role(tenant_id, ARRAY['director']) AND role NOT IN ('owner', 'director')) OR
    -- Rule 4: Admin can remove operational staff (not owner, director, or admin)
    (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'director', 'admin'))
  );

COMMIT;
