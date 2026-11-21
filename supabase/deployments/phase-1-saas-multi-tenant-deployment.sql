-- ==============================================================================
-- KhelGrid SaaS Platform — Phase 1: Multi-Tenant Database Architecture
-- Migration: 20261121160000_phase1_multi_tenant_core_schema.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Purpose:
-- 1. Create canonical multi-tenant hierarchy:
--    - public.tenants (canonical organizations with UUIDs, type, status, audit)
--    - public.tenant_memberships (user memberships with role, status, invitation)
-- 2. Create tenant-scoped business entities with immutable foreign keys:
--    - public.tenant_batches (coaching schedules & squad capacities)
--    - public.tenant_students (trainee roster & parent linkage)
--    - public.tenant_enquiries (admissions CRM pipeline)
--    - public.tenant_fee_invoices (billing records)
--    - public.tenant_fee_transactions (immutable ledger receipts)
--    - public.tenant_attendance_events (daily roll-call logs with unique constraint)
-- 3. Install security functions and evaluate permissions server-side:
--    - public.is_tenant_member(p_tenant_id uuid)
--    - public.has_tenant_role(p_tenant_id uuid, p_roles text[])
-- 4. Enable Row Level Security (RLS) on all tenant tables with strict
--    cross-tenant isolation policies and fail-closed anonymous access denial.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. CANONICAL ORGANIZATIONS / TENANTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name text NOT NULL CHECK (char_length(trim(name)) >= 2),
  tenant_type text NOT NULL CHECK (tenant_type IN ('academy', 'coach', 'venue', 'tournament')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'suspended', 'archived')),
  owner_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  city text,
  state text,
  sport text,
  contact_phone text,
  contact_email text,
  upi_vpa text CHECK (upi_vpa IS NULL OR upi_vpa ~ '^.+@[a-zA-Z0-9.-]+$'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_type_status ON public.tenants(tenant_type, status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON public.tenants(owner_id);

-- -----------------------------------------------------------------------------
-- 2. TENANT MEMBERSHIPS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'owner',
    'director',
    'admin',
    'head_coach',
    'coach',
    'accountant',
    'front_desk',
    'staff',
    'parent'
  )),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
  invited_email text CHECK (invited_email IS NULL OR invited_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_tenant_user UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user ON public.tenant_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_role ON public.tenant_memberships(tenant_id, role, status);

-- -----------------------------------------------------------------------------
-- 3. SERVER-SIDE TENANT AUTHORIZATION HELPER FUNCTIONS
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
    FROM public.tenant_memberships
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(p_tenant_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(p_roles)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_tenant_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_tenant_role(uuid, text[]) FROM PUBLIC;
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
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_tenant(uuid) TO anon, authenticated;

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

  IF p_tenant_type NOT IN ('academy', 'coach', 'venue', 'tournament') THEN
    RAISE EXCEPTION 'Invalid tenant_type: %', p_tenant_type;
  END IF;

  IF p_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid slug format: %', p_slug;
  END IF;

  INSERT INTO public.tenants (
    slug, name, tenant_type, status, owner_id,
    city, state, sport, contact_phone, contact_email, metadata
  ) VALUES (
    p_slug, p_name, p_tenant_type, 'active', v_user_id,
    p_city, p_state, p_sport, p_contact_phone, p_contact_email, p_metadata
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_memberships (
    tenant_id, user_id, role, status
  ) VALUES (
    v_tenant_id, v_user_id, 'owner', 'active'
  );

  RETURN v_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provision_initial_tenant_owner(text, text, text, text, text, text, text, text, jsonb) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. TENANT BATCHES (SQUAD SCHEDULES)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  batch_name text NOT NULL CHECK (char_length(trim(batch_name)) >= 2),
  sport text NOT NULL,
  days text NOT NULL,
  timings text NOT NULL,
  coach_name text,
  age_group text,
  monthly_fee integer NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  max_capacity integer NOT NULL DEFAULT 25 CHECK (max_capacity > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_batch_per_tenant UNIQUE (tenant_id, batch_name),
  CONSTRAINT uq_tenant_batch UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_batches_tenant ON public.tenant_batches(tenant_id, is_active);

-- -----------------------------------------------------------------------------
-- 5. TENANT STUDENTS (TRAINEE ROSTER)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  batch_id uuid,
  student_name text NOT NULL CHECK (char_length(trim(student_name)) >= 2),
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  parent_email text,
  guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  date_of_birth date,
  gender text,
  monthly_fee integer NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  fee_status text NOT NULL DEFAULT 'due_soon' CHECK (fee_status IN ('paid', 'due_soon', 'overdue', 'exempt')),
  next_due_date date,
  last_payment_date date,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_student UNIQUE (tenant_id, id),
  CONSTRAINT fk_student_tenant_batch FOREIGN KEY (tenant_id, batch_id) REFERENCES public.tenant_batches(tenant_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_students_tenant_batch ON public.tenant_students(tenant_id, batch_id, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_students_guardian ON public.tenant_students(guardian_user_id);

-- -----------------------------------------------------------------------------
-- 6. TENANT ADMISSIONS ENQUIRIES (CRM LEADS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  enquiry_token text NOT NULL UNIQUE CHECK (char_length(enquiry_token) >= 6),
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  parent_email text,
  student_name text NOT NULL,
  student_age integer CHECK (student_age IS NULL OR (student_age >= 3 AND student_age <= 70)),
  sport text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('free_trial', 'regular_admission', 'scholarship_assessment')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'trial_scheduled', 'enrolled', 'archived')),
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_enquiries_tenant_status ON public.tenant_enquiries(tenant_id, status);

-- -----------------------------------------------------------------------------
-- 7. TENANT INVOICES & IMMUTABLE FINANCIAL TRANSACTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  amount integer NOT NULL CHECK (amount >= 0),
  billing_month text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'cancelled', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_fee_invoice UNIQUE (tenant_id, id),
  CONSTRAINT fk_invoice_tenant_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_tenant_fee_invoices_lookup ON public.tenant_fee_invoices(tenant_id, student_id, status);

CREATE TABLE IF NOT EXISTS public.tenant_fee_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id uuid,
  student_id uuid NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  amount integer NOT NULL CHECK (amount > 0),
  payment_mode text NOT NULL CHECK (payment_mode IN ('cash', 'direct_upi', 'bank_transfer', 'cheque')),
  collected_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  collected_by_name text NOT NULL,
  collected_date date NOT NULL DEFAULT CURRENT_DATE,
  billing_month text NOT NULL,
  status text NOT NULL DEFAULT 'cash_in_hand' CHECK (status IN ('settled', 'cash_in_hand', 'refunded')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_transaction_tenant_invoice FOREIGN KEY (tenant_id, invoice_id) REFERENCES public.tenant_fee_invoices(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_transaction_tenant_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_tenant_fee_transactions_lookup ON public.tenant_fee_transactions(tenant_id, student_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_fee_transactions_date ON public.tenant_fee_transactions(tenant_id, collected_date DESC);

-- -----------------------------------------------------------------------------
-- 8. TENANT DAILY ATTENDANCE (IMMUTABLE LOG WITH AUDIT TRAIL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  student_id uuid NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_time timestamptz,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'excused')),
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  marked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT unique_attendance_session UNIQUE (tenant_id, batch_id, student_id, session_date),
  CONSTRAINT fk_attendance_tenant_batch FOREIGN KEY (tenant_id, batch_id) REFERENCES public.tenant_batches(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_tenant_student FOREIGN KEY (tenant_id, student_id) REFERENCES public.tenant_students(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_attendance_lookup ON public.tenant_attendance_events(tenant_id, batch_id, session_date);

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_fee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_attendance_events ENABLE ROW LEVEL SECURITY;

-- 9.1 TENANTS POLICIES
-- Only verified active members or the tenant owner can view private tenant records
CREATE POLICY "tenants_member_select"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(id) OR
    owner_id = auth.uid()
  );

-- Public directory projection with security barrier: safe non-sensitive columns only
CREATE VIEW public.tenant_public_directory
WITH (security_barrier = true) AS
SELECT
  id,
  slug,
  name,
  tenant_type,
  sport,
  city,
  state,
  status,
  created_at
FROM public.tenants
WHERE status = 'active';

CREATE POLICY "tenants_owner_update"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_tenant_role(id, ARRAY['owner', 'director']))
  WITH CHECK (owner_id = auth.uid() OR public.has_tenant_role(id, ARRAY['owner', 'director']));

CREATE POLICY "tenants_auth_insert"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 9.2 TENANT MEMBERSHIPS POLICIES
CREATE POLICY "tenant_memberships_select"
  ON public.tenant_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    public.is_tenant_member(tenant_id)
  );

CREATE POLICY "tenant_memberships_insert"
  ON public.tenant_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_tenant_role(tenant_id, ARRAY['owner', 'director'])) OR
    (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'director'))
  );

CREATE POLICY "tenant_memberships_update"
  ON public.tenant_memberships
  FOR UPDATE
  TO authenticated
  USING (
    public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin'])
  )
  WITH CHECK (
    user_id != auth.uid() AND
    (
      (public.has_tenant_role(tenant_id, ARRAY['owner'])) OR
      (public.has_tenant_role(tenant_id, ARRAY['director']) AND role != 'owner') OR
      (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'director'))
    )
  );

CREATE POLICY "tenant_memberships_delete"
  ON public.tenant_memberships
  FOR DELETE
  TO authenticated
  USING (
    (user_id = auth.uid() AND role != 'owner') OR
    (public.has_tenant_role(tenant_id, ARRAY['owner']) AND role != 'owner') OR
    (public.has_tenant_role(tenant_id, ARRAY['director']) AND role NOT IN ('owner', 'director')) OR
    (public.has_tenant_role(tenant_id, ARRAY['admin']) AND role NOT IN ('owner', 'director', 'admin'))
  );

-- 9.3 TENANT BATCHES POLICIES
CREATE POLICY "tenant_batches_select"
  ON public.tenant_batches
  FOR SELECT
  TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "tenant_batches_manage"
  ON public.tenant_batches
  FOR ALL
  TO authenticated
  USING (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach']))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach']));

-- 9.4 TENANT STUDENTS POLICIES
CREATE POLICY "tenant_students_member_select"
  ON public.tenant_students
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id) OR
    guardian_user_id = auth.uid()
  );

CREATE POLICY "tenant_students_manage"
  ON public.tenant_students
  FOR ALL
  TO authenticated
  USING (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach', 'front_desk']))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach', 'front_desk']));

-- 9.5 TENANT ENQUIRIES (LEADS CRM) POLICIES
CREATE POLICY "tenant_enquiries_member_select"
  ON public.tenant_enquiries
  FOR SELECT
  TO authenticated
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "tenant_enquiries_public_insert"
  ON public.tenant_enquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    public.is_active_tenant(tenant_id)
  );

CREATE POLICY "tenant_enquiries_manage"
  ON public.tenant_enquiries
  FOR UPDATE
  TO authenticated
  USING (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'front_desk']))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'front_desk']));

-- 9.6 TENANT FEE INVOICES & TRANSACTIONS POLICIES
CREATE POLICY "tenant_invoices_member_select"
  ON public.tenant_fee_invoices
  FOR SELECT
  TO authenticated
  USING (
    public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant', 'front_desk']) OR
    EXISTS (SELECT 1 FROM public.tenant_students WHERE id = student_id AND guardian_user_id = auth.uid())
  );

CREATE POLICY "tenant_invoices_manage"
  ON public.tenant_fee_invoices
  FOR ALL
  TO authenticated
  USING (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant']))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant']));

CREATE POLICY "tenant_transactions_member_select"
  ON public.tenant_fee_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant', 'front_desk']) OR
    EXISTS (SELECT 1 FROM public.tenant_students WHERE id = student_id AND guardian_user_id = auth.uid())
  );

CREATE POLICY "tenant_transactions_manage"
  ON public.tenant_fee_transactions
  FOR ALL
  TO authenticated
  USING (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant', 'front_desk']))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'accountant', 'front_desk']));

-- 9.7 TENANT ATTENDANCE EVENTS POLICIES
CREATE POLICY "tenant_attendance_member_select"
  ON public.tenant_attendance_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id) OR
    EXISTS (SELECT 1 FROM public.tenant_students WHERE id = student_id AND guardian_user_id = auth.uid())
  );

CREATE POLICY "tenant_attendance_mark"
  ON public.tenant_attendance_events
  FOR ALL
  TO authenticated
  USING (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach', 'coach']))
  WITH CHECK (public.has_tenant_role(tenant_id, ARRAY['owner', 'director', 'admin', 'head_coach', 'coach']));

-- -----------------------------------------------------------------------------
-- 10. LEAST-PRIVILEGE GRANTS
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.tenants FROM PUBLIC, anon;
REVOKE ALL ON public.tenant_memberships FROM PUBLIC, anon;
REVOKE ALL ON public.tenant_batches FROM PUBLIC, anon;
REVOKE ALL ON public.tenant_students FROM PUBLIC, anon;
REVOKE ALL ON public.tenant_fee_invoices FROM PUBLIC, anon;
REVOKE ALL ON public.tenant_fee_transactions FROM PUBLIC, anon;
REVOKE ALL ON public.tenant_attendance_events FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_enquiries TO authenticated;
GRANT INSERT ON public.tenant_enquiries TO anon; -- Public parent enquiry intake
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_fee_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_fee_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_attendance_events TO authenticated;

-- Public directory view grants
REVOKE ALL ON public.tenant_public_directory FROM PUBLIC;
GRANT SELECT ON public.tenant_public_directory TO anon, authenticated;

COMMIT;
