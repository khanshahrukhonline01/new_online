-- ==============================================================================
-- KhelGrid Academy Workspace — Multi-Tenant SaaS Foundation Migration
-- Migration: 20261126140000_academy_workspace_saas_foundation.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt / Local PostgreSQL 16 Test DB
--
-- Scope & Security Guarantees:
-- 1. Zero DROP TABLE / zero TRUNCATE; strictly additive and backward-compatible.
-- 2. Supports all 7 Academy SaaS roles + optional branch-level scoping via
--    public.academy_staff_branch_assignments and public.has_academy_permission().
-- 3. Trigger-protects verification fields on both public.tenants and
--    public.academy_profiles so only authorized platform moderators / service-role
--    workflows can approve verification badges (zero client-side bypass).
-- 4. Adds public.academy_profiles, extends public.tenant_units (branches),
--    extends public.tenant_batches, extends public.tenant_students, adds
--    public.academy_athlete_notes, public.academy_coaches,
--    public.academy_training_sessions (with conflict guard trigger), extends
--    public.tenant_attendance_events ('late', session_id, unit_id) + immutable
--    public.academy_attendance_audit_logs + public.academy_coach_attendance,
--    adds public.academy_trial_postings (moderation-gated), extends
--    public.tenant_enquiries (8-stage pipeline) + public.academy_admission_notes,
--    adds public.academy_facilities, public.academy_equipment_items, and
--    public.academy_announcements + user_notifications dispatch.
-- 5. Provides fail-closed SECURITY DEFINER RPCs with pinned search_path.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ROLE TAXONOMY, COMPOSITE KEYS & BRANCH-SCOPED AUTHORIZATION HELPERS
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_conname text;
BEGIN
  IF to_regclass('public.tenant_memberships') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_membership'
    ) THEN
      ALTER TABLE public.tenant_memberships
        ADD CONSTRAINT uq_tenant_membership UNIQUE (tenant_id, id);
    END IF;

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
        'admissions_manager',
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
  END IF;

  IF to_regclass('public.tenant_invitations') IS NOT NULL THEN
    FOR v_conname IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public'
        AND r.relname = 'tenant_invitations'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%role%'
    LOOP
      EXECUTE format('ALTER TABLE public.tenant_invitations DROP CONSTRAINT IF EXISTS %I', v_conname);
    END LOOP;

    ALTER TABLE public.tenant_invitations
      ADD CONSTRAINT tenant_invitations_role_check CHECK (role IN (
        'org_admin',
        'director',
        'admin',
        'manager',
        'admissions_manager',
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
  END IF;
END $$;

-- Allow academy notifications cleanly inside user_notifications
DO $$
DECLARE
  v_conname text;
BEGIN
  IF to_regclass('public.user_notifications') IS NOT NULL THEN
    FOR v_conname IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public'
        AND r.relname = 'user_notifications'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%category%'
    LOOP
      EXECUTE format('ALTER TABLE public.user_notifications DROP CONSTRAINT IF EXISTS %I', v_conname);
    END LOOP;

    ALTER TABLE public.user_notifications
      ADD CONSTRAINT user_notifications_category_check CHECK (category IN (
        'system',
        'opportunity',
        'pickup_game',
        'booking',
        'verification',
        'message',
        'moderation',
        'academy'
      ));
  END IF;
END $$;

-- Expand tenant_role_permissions with Academy-specific module permissions across all 7 roles
INSERT INTO public.tenant_role_permissions (role, permission) VALUES
  -- 1. Academy Owner
  ('owner', 'org:ownership_transfer'),
  ('owner', 'academy:profile.manage'),
  ('owner', 'academy:branches.manage'),
  ('owner', 'academy:athletes.view'),
  ('owner', 'academy:athletes.manage'),
  ('owner', 'academy:coaches.view'),
  ('owner', 'academy:coaches.manage'),
  ('owner', 'academy:training.view'),
  ('owner', 'academy:training.manage'),
  ('owner', 'academy:attendance.view'),
  ('owner', 'academy:attendance.manage'),
  ('owner', 'academy:admissions.view'),
  ('owner', 'academy:admissions.manage'),
  ('owner', 'academy:facilities.view'),
  ('owner', 'academy:facilities.manage'),
  ('owner', 'academy:notifications.view'),
  ('owner', 'academy:notifications.manage'),
  ('owner', 'academy:reports.view'),
  ('owner', 'academy:reports.export'),
  ('owner', 'academy:finance.view'),
  ('owner', 'academy:finance.manage'),
  ('owner', 'academy:staff.manage'),
  ('owner', 'academy:settings.manage'),
  ('owner', 'academy:verification.submit'),
  ('owner', 'academy:audit.view'),

  -- 2. Academy Administrator (org_admin / director / admin)
  ('org_admin', 'academy:profile.manage'),
  ('org_admin', 'academy:branches.manage'),
  ('org_admin', 'academy:athletes.view'),
  ('org_admin', 'academy:athletes.manage'),
  ('org_admin', 'academy:coaches.view'),
  ('org_admin', 'academy:coaches.manage'),
  ('org_admin', 'academy:training.view'),
  ('org_admin', 'academy:training.manage'),
  ('org_admin', 'academy:attendance.view'),
  ('org_admin', 'academy:attendance.manage'),
  ('org_admin', 'academy:admissions.view'),
  ('org_admin', 'academy:admissions.manage'),
  ('org_admin', 'academy:facilities.view'),
  ('org_admin', 'academy:facilities.manage'),
  ('org_admin', 'academy:notifications.view'),
  ('org_admin', 'academy:notifications.manage'),
  ('org_admin', 'academy:reports.view'),
  ('org_admin', 'academy:reports.export'),
  ('org_admin', 'academy:finance.view'),
  ('org_admin', 'academy:finance.manage'),
  ('org_admin', 'academy:staff.manage'),
  ('org_admin', 'academy:settings.manage'),
  ('org_admin', 'academy:verification.submit'),
  ('org_admin', 'academy:audit.view'),

  ('director', 'academy:profile.manage'),
  ('director', 'academy:branches.manage'),
  ('director', 'academy:athletes.view'),
  ('director', 'academy:athletes.manage'),
  ('director', 'academy:coaches.view'),
  ('director', 'academy:coaches.manage'),
  ('director', 'academy:training.view'),
  ('director', 'academy:training.manage'),
  ('director', 'academy:attendance.view'),
  ('director', 'academy:attendance.manage'),
  ('director', 'academy:admissions.view'),
  ('director', 'academy:admissions.manage'),
  ('director', 'academy:facilities.view'),
  ('director', 'academy:facilities.manage'),
  ('director', 'academy:notifications.view'),
  ('director', 'academy:notifications.manage'),
  ('director', 'academy:reports.view'),
  ('director', 'academy:reports.export'),
  ('director', 'academy:finance.view'),
  ('director', 'academy:finance.manage'),
  ('director', 'academy:staff.manage'),
  ('director', 'academy:settings.manage'),
  ('director', 'academy:verification.submit'),
  ('director', 'academy:audit.view'),

  ('admin', 'academy:profile.manage'),
  ('admin', 'academy:branches.manage'),
  ('admin', 'academy:athletes.view'),
  ('admin', 'academy:athletes.manage'),
  ('admin', 'academy:coaches.view'),
  ('admin', 'academy:coaches.manage'),
  ('admin', 'academy:training.view'),
  ('admin', 'academy:training.manage'),
  ('admin', 'academy:attendance.view'),
  ('admin', 'academy:attendance.manage'),
  ('admin', 'academy:admissions.view'),
  ('admin', 'academy:admissions.manage'),
  ('admin', 'academy:facilities.view'),
  ('admin', 'academy:facilities.manage'),
  ('admin', 'academy:notifications.view'),
  ('admin', 'academy:notifications.manage'),
  ('admin', 'academy:reports.view'),
  ('admin', 'academy:reports.export'),
  ('admin', 'academy:staff.manage'),
  ('admin', 'academy:verification.submit'),
  ('admin', 'academy:audit.view'),

  -- 3. Academy Manager (branch-scoped daily manager)
  ('manager', 'academy:branches.manage'),
  ('manager', 'academy:athletes.view'),
  ('manager', 'academy:athletes.manage'),
  ('manager', 'academy:coaches.view'),
  ('manager', 'academy:coaches.manage'),
  ('manager', 'academy:training.view'),
  ('manager', 'academy:training.manage'),
  ('manager', 'academy:attendance.view'),
  ('manager', 'academy:attendance.manage'),
  ('manager', 'academy:admissions.view'),
  ('manager', 'academy:facilities.view'),
  ('manager', 'academy:facilities.manage'),
  ('manager', 'academy:notifications.view'),
  ('manager', 'academy:notifications.manage'),
  ('manager', 'academy:reports.view'),

  -- 4. Admissions Manager (admissions_manager / front_desk)
  ('admissions_manager', 'academy:athletes.view'),
  ('admissions_manager', 'academy:athletes.manage'),
  ('admissions_manager', 'academy:training.view'),
  ('admissions_manager', 'academy:admissions.view'),
  ('admissions_manager', 'academy:admissions.manage'),
  ('admissions_manager', 'academy:notifications.view'),
  ('admissions_manager', 'academy:notifications.manage'),
  ('admissions_manager', 'academy:reports.view'),
  ('admissions_manager', 'trials:manage'),

  ('front_desk', 'academy:athletes.view'),
  ('front_desk', 'academy:athletes.manage'),
  ('front_desk', 'academy:training.view'),
  ('front_desk', 'academy:admissions.view'),
  ('front_desk', 'academy:admissions.manage'),
  ('front_desk', 'academy:notifications.view'),
  ('front_desk', 'academy:notifications.manage'),
  ('front_desk', 'academy:reports.view'),

  -- 5. Coach / Training Staff (head_coach / coach)
  ('head_coach', 'academy:athletes.view'),
  ('head_coach', 'academy:athletes.manage'),
  ('head_coach', 'academy:coaches.view'),
  ('head_coach', 'academy:coaches.manage'),
  ('head_coach', 'academy:training.view'),
  ('head_coach', 'academy:training.manage'),
  ('head_coach', 'academy:attendance.view'),
  ('head_coach', 'academy:attendance.manage'),
  ('head_coach', 'academy:admissions.view'),
  ('head_coach', 'academy:facilities.view'),
  ('head_coach', 'academy:notifications.view'),
  ('head_coach', 'academy:notifications.manage'),
  ('head_coach', 'academy:reports.view'),

  ('coach', 'academy:athletes.view'),
  ('coach', 'academy:coaches.view'),
  ('coach', 'academy:training.view'),
  ('coach', 'academy:training.manage'),
  ('coach', 'academy:attendance.view'),
  ('coach', 'academy:attendance.manage'),
  ('coach', 'academy:facilities.view'),
  ('coach', 'academy:notifications.view'),

  -- 6. Finance Manager (finance_manager / accountant)
  ('finance_manager', 'academy:athletes.view'),
  ('finance_manager', 'academy:finance.view'),
  ('finance_manager', 'academy:finance.manage'),
  ('finance_manager', 'academy:reports.view'),
  ('finance_manager', 'academy:reports.export'),
  ('finance_manager', 'academy:notifications.view'),

  ('accountant', 'academy:athletes.view'),
  ('accountant', 'academy:finance.view'),
  ('accountant', 'academy:finance.manage'),
  ('accountant', 'academy:reports.view'),
  ('accountant', 'academy:reports.export'),
  ('accountant', 'academy:notifications.view'),

  -- 7. Read-only Staff
  ('readonly_member', 'academy:athletes.view'),
  ('readonly_member', 'academy:coaches.view'),
  ('readonly_member', 'academy:training.view'),
  ('readonly_member', 'academy:attendance.view'),
  ('readonly_member', 'academy:admissions.view'),
  ('readonly_member', 'academy:facilities.view'),
  ('readonly_member', 'academy:notifications.view'),
  ('readonly_member', 'academy:reports.view')
ON CONFLICT DO NOTHING;

-- Branch assignment scoping for staff members (e.g. Academy Manager assigned to Branch A)
CREATE TABLE IF NOT EXISTS public.academy_staff_branch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  membership_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_academy_staff_branch UNIQUE (membership_id, unit_id),
  CONSTRAINT fk_asba_membership FOREIGN KEY (tenant_id, membership_id)
    REFERENCES public.tenant_memberships(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_asba_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asba_tenant_membership
  ON public.academy_staff_branch_assignments(tenant_id, membership_id);
CREATE INDEX IF NOT EXISTS idx_asba_tenant_unit
  ON public.academy_staff_branch_assignments(tenant_id, unit_id);

CREATE OR REPLACE FUNCTION public.is_academy_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_admin()
    OR public.has_platform_role(ARRAY[
      'admin',
      'platform_super_admin',
      'platform_admin',
      'moderator',
      'verification_admin'
    ]);
$$;

REVOKE ALL ON FUNCTION public.is_academy_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_academy_moderator() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_academy_branch_access(
  p_tenant_id uuid,
  p_unit_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_membership_id uuid;
  v_role text;
  v_has_branch_limits boolean;
BEGIN
  IF v_uid IS NULL OR p_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT m.id, m.role
  INTO v_membership_id, v_role
  FROM public.tenant_memberships m
  JOIN public.tenants t ON t.id = m.tenant_id
  WHERE m.tenant_id = p_tenant_id
    AND m.user_id = v_uid
    AND m.status = 'active'
    AND m.deleted_at IS NULL
    AND t.status = 'active'
    AND t.deleted_at IS NULL
  LIMIT 1;

  IF v_membership_id IS NULL THEN
    RETURN false;
  END IF;

  -- Academy Owner / Administrators have academy-wide access across all branches
  IF v_role IN ('owner', 'org_admin', 'director', 'admin') THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.academy_staff_branch_assignments a
    WHERE a.tenant_id = p_tenant_id
      AND a.membership_id = v_membership_id
  )
  INTO v_has_branch_limits;

  -- Members without explicit branch limits have full tenant-level operational access
  IF NOT v_has_branch_limits THEN
    RETURN true;
  END IF;

  IF p_unit_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.academy_staff_branch_assignments a
    WHERE a.tenant_id = p_tenant_id
      AND a.membership_id = v_membership_id
      AND a.unit_id = p_unit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.has_academy_branch_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_academy_branch_access(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_academy_permission(
  p_tenant_id uuid,
  p_permission text,
  p_unit_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.has_tenant_permission(p_tenant_id, p_permission)
    AND (
      CASE
        WHEN p_unit_id IS NULL THEN true
        ELSE public.has_academy_branch_access(p_tenant_id, p_unit_id)
      END
    );
$$;

REVOKE ALL ON FUNCTION public.has_academy_permission(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_academy_permission(uuid, text, uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. PROTECTION TRIGGERS FOR VERIFICATION STATUS & OWNER INTEGRITY
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_tenant_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
        RAISE EXCEPTION 'Forbidden: verification status can only be modified by authorized platform moderators.';
      END IF;
    END IF;
  END IF;

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
-- 3. ACADEMY PROFILES (PUBLIC DIRECTORY PROFILE + MODERATION PIPELINE)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  directory_academy_id uuid REFERENCES public.academies(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 180),
  tagline text CHECK (tagline IS NULL OR char_length(tagline) <= 240),
  description text CHECK (description IS NULL OR char_length(description) <= 6000),
  sports_offered text[] NOT NULL DEFAULT '{}'::text[],
  founded_year integer CHECK (founded_year IS NULL OR (founded_year >= 1850 AND founded_year <= 2100)),
  affiliations jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(affiliations) = 'array'),
  age_groups text[] NOT NULL DEFAULT '{}'::text[],
  skill_levels text[] NOT NULL DEFAULT ARRAY['beginner', 'intermediate', 'advanced']::text[],
  fee_structure jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(fee_structure) = 'array'),
  training_methodology text CHECK (training_methodology IS NULL OR char_length(training_methodology) <= 4000),
  facilities_summary text[] NOT NULL DEFAULT '{}'::text[],
  operating_hours text CHECK (operating_hours IS NULL OR char_length(operating_hours) <= 240),
  contact_phone text CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 40),
  contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 180),
  website_url text CHECK (website_url IS NULL OR website_url ~ '^https?://'),
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(social_links) = 'object'),
  media_gallery jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(media_gallery) = 'array'),
  logo_url text CHECK (logo_url IS NULL OR logo_url ~ '^https?://'),
  banner_url text CHECK (banner_url IS NULL OR banner_url ~ '^https?://'),
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 120),
  state text NOT NULL DEFAULT '' CHECK (char_length(state) <= 120),
  is_publicly_listed boolean NOT NULL DEFAULT false,
  seo_title text CHECK (seo_title IS NULL OR char_length(seo_title) <= 160),
  seo_description text CHECK (seo_description IS NULL OR char_length(seo_description) <= 320),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (
    verification_status IN ('unverified', 'pending_review', 'verified', 'rejected', 'more_info_needed')
  ),
  moderation_note text CHECK (moderation_note IS NULL OR char_length(moderation_note) <= 2000),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_profiles_tenant ON public.academy_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academy_profiles_verif ON public.academy_profiles(verification_status);

CREATE OR REPLACE FUNCTION public.protect_academy_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
        RAISE EXCEPTION 'Forbidden: academy_profiles.tenant_id cannot be reassigned.';
      END IF;
      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.moderation_note IS DISTINCT FROM OLD.moderation_note
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
        RAISE EXCEPTION 'Forbidden: only authorized KhelGrid moderators can modify academy verification status.';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_academy_profile_verification() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_academy_profile_verification ON public.academy_profiles;
CREATE TRIGGER trg_protect_academy_profile_verification
  BEFORE INSERT OR UPDATE ON public.academy_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_academy_profile_verification();

-- -----------------------------------------------------------------------------
-- 4. EXTEND TENANT_UNITS FOR MULTI-BRANCH ACADEMY OPERATIONS
-- -----------------------------------------------------------------------------

ALTER TABLE public.tenant_units
  ADD COLUMN IF NOT EXISTS branch_code text CHECK (branch_code IS NULL OR char_length(branch_code) <= 40),
  ADD COLUMN IF NOT EXISTS address text CHECK (address IS NULL OR char_length(address) <= 500),
  ADD COLUMN IF NOT EXISTS pincode text CHECK (pincode IS NULL OR char_length(pincode) <= 16),
  ADD COLUMN IF NOT EXISTS sports_offered text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS facilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS operating_hours text CHECK (operating_hours IS NULL OR char_length(operating_hours) <= 240),
  ADD COLUMN IF NOT EXISTS contact_phone text CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 40),
  ADD COLUMN IF NOT EXISTS contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 180),
  ADD COLUMN IF NOT EXISTS capacity integer CHECK (capacity IS NULL OR capacity > 0),
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_units_alive
  ON public.tenant_units(tenant_id, is_active) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- 5. ACADEMY COACHES / STAFF ASSOCIATIONS (NO DUPLICATE USER ACCOUNTS)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academy_coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  coach_profile_id uuid REFERENCES public.coach_profiles(id) ON DELETE SET NULL,
  membership_id uuid,
  primary_unit_id uuid,
  full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 140),
  email text CHECK (email IS NULL OR char_length(email) <= 180),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  role_title text NOT NULL DEFAULT 'Coach' CHECK (char_length(trim(role_title)) BETWEEN 2 AND 100),
  employment_type text NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'visiting', 'consultant')),
  specializations text[] NOT NULL DEFAULT '{}'::text[],
  qualification_summary text CHECK (qualification_summary IS NULL OR char_length(qualification_summary) <= 1000),
  assigned_branch_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  joining_date date,
  safeguarding_status text NOT NULL DEFAULT 'pending' CHECK (safeguarding_status IN ('verified', 'pending', 'expired', 'not_submitted')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'inactive', 'archived')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_academy_coach UNIQUE (tenant_id, id),
  CONSTRAINT fk_ac_coach_unit FOREIGN KEY (tenant_id, primary_unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION,
  CONSTRAINT fk_ac_coach_membership FOREIGN KEY (tenant_id, membership_id)
    REFERENCES public.tenant_memberships(tenant_id, id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_academy_coaches_tenant_status
  ON public.academy_coaches(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_academy_coaches_user
  ON public.academy_coaches(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_academy_coaches_profile
  ON public.academy_coaches(coach_profile_id) WHERE coach_profile_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_academy_coaches_set_updated_at ON public.academy_coaches;
CREATE TRIGGER trg_academy_coaches_set_updated_at
  BEFORE UPDATE ON public.academy_coaches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. EXTEND TENANT_BATCHES & TENANT_STUDENTS WITH BRANCH + COACH LINKAGE
-- -----------------------------------------------------------------------------

ALTER TABLE public.tenant_batches
  ADD COLUMN IF NOT EXISTS unit_id uuid,
  ADD COLUMN IF NOT EXISTS coach_id uuid,
  ADD COLUMN IF NOT EXISTS skill_level text NOT NULL DEFAULT 'all_levels' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'elite', 'all_levels')),
  ADD COLUMN IF NOT EXISTS description text CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_batch_tenant_unit') THEN
    ALTER TABLE public.tenant_batches
      ADD CONSTRAINT fk_batch_tenant_unit
      FOREIGN KEY (tenant_id, unit_id)
      REFERENCES public.tenant_units(tenant_id, id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_batch_academy_coach') THEN
    ALTER TABLE public.tenant_batches
      ADD CONSTRAINT fk_batch_academy_coach
      FOREIGN KEY (tenant_id, coach_id)
      REFERENCES public.academy_coaches(tenant_id, id)
      ON DELETE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_batches_unit ON public.tenant_batches(tenant_id, unit_id) WHERE deleted_at IS NULL;

ALTER TABLE public.tenant_students
  ADD COLUMN IF NOT EXISTS unit_id uuid,
  ADD COLUMN IF NOT EXISTS athlete_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS athlete_profile_id uuid REFERENCES public.athlete_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_coach_id uuid,
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS age_category text,
  ADD COLUMN IF NOT EXISTS skill_level text NOT NULL DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  ADD COLUMN IF NOT EXISTS enrollment_status text NOT NULL DEFAULT 'active' CHECK (enrollment_status IN ('active', 'inactive', 'pending', 'graduated', 'transferred', 'archived')),
  ADD COLUMN IF NOT EXISTS joining_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS guardian_consent_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_notes text CHECK (medical_notes IS NULL OR char_length(medical_notes) <= 2000);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_tenant_unit') THEN
    ALTER TABLE public.tenant_students
      ADD CONSTRAINT fk_student_tenant_unit
      FOREIGN KEY (tenant_id, unit_id)
      REFERENCES public.tenant_units(tenant_id, id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_student_academy_coach') THEN
    ALTER TABLE public.tenant_students
      ADD CONSTRAINT fk_student_academy_coach
      FOREIGN KEY (tenant_id, assigned_coach_id)
      REFERENCES public.academy_coaches(tenant_id, id)
      ON DELETE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_students_unit ON public.tenant_students(tenant_id, unit_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_students_status ON public.tenant_students(tenant_id, enrollment_status) WHERE deleted_at IS NULL;

-- Private internal athlete coaching / development / injury notes (staff only, NEVER public)
CREATE TABLE IF NOT EXISTS public.academy_athlete_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  unit_id uuid,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL CHECK (char_length(trim(author_name)) >= 2),
  note_type text NOT NULL DEFAULT 'development' CHECK (note_type IN ('development', 'injury', 'performance', 'guardian_comms', 'general')),
  note_body text NOT NULL CHECK (char_length(trim(note_body)) BETWEEN 2 AND 3000),
  is_private_to_staff boolean NOT NULL DEFAULT true,
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_aan_student FOREIGN KEY (tenant_id, student_id)
    REFERENCES public.tenant_students(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_aan_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_aan_student ON public.academy_athlete_notes(tenant_id, student_id, created_at DESC) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_aan_set_updated_at ON public.academy_athlete_notes;
CREATE TRIGGER trg_aan_set_updated_at
  BEFORE UPDATE ON public.academy_athlete_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. FACILITIES, GROUNDS & EQUIPMENT INVENTORY
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academy_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id uuid,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 140),
  facility_type text NOT NULL CHECK (facility_type IN ('ground', 'turf', 'court', 'indoor_hall', 'swimming_pool', 'gym', 'track', 'net_lane', 'other')),
  sport text NOT NULL DEFAULT 'Multisport',
  surface_type text CHECK (surface_type IS NULL OR char_length(surface_type) <= 120),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  has_floodlights boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance', 'reserved', 'inactive')),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1500),
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_academy_facility UNIQUE (tenant_id, id),
  CONSTRAINT fk_af_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_academy_facilities_tenant ON public.academy_facilities(tenant_id, unit_id, status) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_af_set_updated_at ON public.academy_facilities;
CREATE TRIGGER trg_af_set_updated_at
  BEFORE UPDATE ON public.academy_facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.academy_equipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id uuid,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 140),
  category text NOT NULL CHECK (category IN ('training_gear', 'safety_medical', 'kit', 'pitch_equipment', 'electronics', 'other')),
  total_quantity integer NOT NULL DEFAULT 1 CHECK (total_quantity >= 0),
  available_quantity integer NOT NULL DEFAULT 1 CHECK (available_quantity >= 0 AND available_quantity <= total_quantity),
  condition_status text NOT NULL DEFAULT 'good' CHECK (condition_status IN ('good', 'needs_repair', 'damaged', 'retired')),
  last_inspected_at date,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_aei_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_academy_equipment_tenant ON public.academy_equipment_items(tenant_id, unit_id, condition_status) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_aei_set_updated_at ON public.academy_equipment_items;
CREATE TRIGGER trg_aei_set_updated_at
  BEFORE UPDATE ON public.academy_equipment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. DISCRETE TRAINING SESSIONS & SCHEDULE CONFLICT VALIDATION
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academy_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  unit_id uuid,
  coach_id uuid,
  facility_id uuid,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 180),
  sport text NOT NULL,
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  recurrence_rule text NOT NULL DEFAULT 'none' CHECK (recurrence_rule IN ('none', 'daily', 'weekly', 'weekdays', 'weekends')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  cancellation_reason text CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500),
  session_notes text CHECK (session_notes IS NULL OR char_length(session_notes) <= 2000),
  max_participants integer CHECK (max_participants IS NULL OR max_participants > 0),
  deleted_at timestamptz DEFAULT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_session_time_window CHECK (end_time > start_time),
  CONSTRAINT uq_academy_session UNIQUE (tenant_id, id),
  CONSTRAINT fk_ats_batch FOREIGN KEY (tenant_id, batch_id)
    REFERENCES public.tenant_batches(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_ats_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION,
  CONSTRAINT fk_ats_coach FOREIGN KEY (tenant_id, coach_id)
    REFERENCES public.academy_coaches(tenant_id, id) ON DELETE NO ACTION,
  CONSTRAINT fk_ats_facility FOREIGN KEY (tenant_id, facility_id)
    REFERENCES public.academy_facilities(tenant_id, id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_ats_tenant_date ON public.academy_training_sessions(tenant_id, session_date, start_time) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ats_batch ON public.academy_training_sessions(tenant_id, batch_id) WHERE deleted_at IS NULL;

-- Prevent overlapping active scheduled sessions on the same facility or coach on the same date
CREATE OR REPLACE FUNCTION public.prevent_academy_session_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.status IN ('cancelled') THEN
    RETURN NEW;
  END IF;

  IF NEW.facility_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.academy_training_sessions s
    WHERE s.tenant_id = NEW.tenant_id
      AND s.id <> NEW.id
      AND s.deleted_at IS NULL
      AND s.status IN ('scheduled', 'rescheduled')
      AND s.facility_id = NEW.facility_id
      AND s.session_date = NEW.session_date
      AND (s.start_time, s.end_time) OVERLAPS (NEW.start_time, NEW.end_time)
  ) THEN
    RAISE EXCEPTION 'Scheduling conflict: another active session already uses this facility during this time window.';
  END IF;

  IF NEW.coach_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.academy_training_sessions s
    WHERE s.tenant_id = NEW.tenant_id
      AND s.id <> NEW.id
      AND s.deleted_at IS NULL
      AND s.status IN ('scheduled', 'rescheduled')
      AND s.coach_id = NEW.coach_id
      AND s.session_date = NEW.session_date
      AND (s.start_time, s.end_time) OVERLAPS (NEW.start_time, NEW.end_time)
  ) THEN
    RAISE EXCEPTION 'Scheduling conflict: the assigned coach is already scheduled for another overlapping session.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_academy_session_overlap ON public.academy_training_sessions;
CREATE TRIGGER trg_prevent_academy_session_overlap
  BEFORE INSERT OR UPDATE ON public.academy_training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_academy_session_overlap();

-- -----------------------------------------------------------------------------
-- 9. ATTENDANCE EXTENSIONS ('late', session_id, unit_id) & AUDIT HISTORY
-- -----------------------------------------------------------------------------

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
      AND r.relname = 'tenant_attendance_events'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.tenant_attendance_events DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.tenant_attendance_events
    ADD CONSTRAINT tenant_attendance_events_status_check
    CHECK (status IN ('present', 'absent', 'late', 'excused'));
END $$;

ALTER TABLE public.tenant_attendance_events
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS unit_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_session') THEN
    ALTER TABLE public.tenant_attendance_events
      ADD CONSTRAINT fk_attendance_session
      FOREIGN KEY (tenant_id, session_id)
      REFERENCES public.academy_training_sessions(tenant_id, id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendance_unit') THEN
    ALTER TABLE public.tenant_attendance_events
      ADD CONSTRAINT fk_attendance_unit
      FOREIGN KEY (tenant_id, unit_id)
      REFERENCES public.tenant_units(tenant_id, id)
      ON DELETE NO ACTION;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.academy_attendance_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  attendance_event_id uuid NOT NULL REFERENCES public.tenant_attendance_events(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  session_date date NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aaal_tenant_date
  ON public.academy_attendance_audit_logs(tenant_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_academy_attendance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.notes IS DISTINCT FROM OLD.notes)) THEN
    INSERT INTO public.academy_attendance_audit_logs (
      tenant_id,
      attendance_event_id,
      student_id,
      batch_id,
      session_date,
      previous_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.student_id,
      NEW.batch_id,
      NEW.session_date,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      COALESCE(NEW.marked_by, auth.uid()),
      NEW.notes
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_academy_attendance_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_log_academy_attendance_change ON public.tenant_attendance_events;
CREATE TRIGGER trg_log_academy_attendance_change
  AFTER INSERT OR UPDATE ON public.tenant_attendance_events
  FOR EACH ROW
  EXECUTE FUNCTION public.log_academy_attendance_change();

CREATE TABLE IF NOT EXISTS public.academy_coach_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL,
  session_id uuid,
  unit_id uuid,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_coach_attendance_daily UNIQUE (tenant_id, coach_id, session_date),
  CONSTRAINT fk_aca_coach FOREIGN KEY (tenant_id, coach_id)
    REFERENCES public.academy_coaches(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_aca_session FOREIGN KEY (tenant_id, session_id)
    REFERENCES public.academy_training_sessions(tenant_id, id) ON DELETE NO ACTION,
  CONSTRAINT fk_aca_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION
);

DROP TRIGGER IF EXISTS trg_aca_set_updated_at ON public.academy_coach_attendance;
CREATE TRIGGER trg_aca_set_updated_at
  BEFORE UPDATE ON public.academy_coach_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. TRIAL POSTINGS (MODERATION-GATED) & ADMISSIONS PIPELINE EXTENSIONS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academy_trial_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id uuid,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  listing_submission_id uuid REFERENCES public.listing_submissions(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 200),
  sport text NOT NULL,
  age_categories text[] NOT NULL DEFAULT '{}'::text[],
  eligibility_criteria text CHECK (eligibility_criteria IS NULL OR char_length(eligibility_criteria) <= 2000),
  venue_address text CHECK (venue_address IS NULL OR char_length(venue_address) <= 500),
  city text NOT NULL DEFAULT '',
  trial_date date,
  application_deadline date,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  fee_display_inr integer NOT NULL DEFAULT 0 CHECK (fee_display_inr >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_moderation', 'approved', 'published', 'closed', 'rejected', 'archived')
  ),
  moderation_note text CHECK (moderation_note IS NULL OR char_length(moderation_note) <= 2000),
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_academy_trial_posting UNIQUE (tenant_id, id),
  CONSTRAINT fk_atp_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_academy_trial_postings_tenant
  ON public.academy_trial_postings(tenant_id, status) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.protect_academy_trial_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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
    IF TG_OP = 'INSERT' AND NEW.status IN ('approved', 'published') THEN
      RAISE EXCEPTION 'Forbidden: trial postings cannot self-approve publication without platform moderation.';
    ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status IN ('approved', 'published') AND OLD.status NOT IN ('approved', 'published') THEN
        RAISE EXCEPTION 'Forbidden: only moderators can approve or publish trial postings.';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_academy_trial_moderation() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_academy_trial_moderation ON public.academy_trial_postings;
CREATE TRIGGER trg_protect_academy_trial_moderation
  BEFORE INSERT OR UPDATE ON public.academy_trial_postings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_academy_trial_moderation();

-- Extend tenant_enquiries cleanly to support 8+ admission stages + branch + trial linkage
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
      AND r.relname = 'tenant_enquiries'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.tenant_enquiries DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;

  ALTER TABLE public.tenant_enquiries
    ADD CONSTRAINT tenant_enquiries_status_check CHECK (status IN (
      'new',
      'contacted',
      'shortlisted',
      'trial_scheduled',
      'trial_completed',
      'offered',
      'enrolled',
      'waitlisted',
      'rejected',
      'archived'
    ));

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tenant_enquiry') THEN
    ALTER TABLE public.tenant_enquiries
      ADD CONSTRAINT uq_tenant_enquiry UNIQUE (tenant_id, id);
  END IF;
END $$;

ALTER TABLE public.tenant_enquiries
  ADD COLUMN IF NOT EXISTS unit_id uuid,
  ADD COLUMN IF NOT EXISTS trial_posting_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS age_category text,
  ADD COLUMN IF NOT EXISTS source_channel text DEFAULT 'khelgrid_directory',
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_enquiry_unit') THEN
    ALTER TABLE public.tenant_enquiries
      ADD CONSTRAINT fk_enquiry_unit
      FOREIGN KEY (tenant_id, unit_id)
      REFERENCES public.tenant_units(tenant_id, id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_enquiry_trial_posting') THEN
    ALTER TABLE public.tenant_enquiries
      ADD CONSTRAINT fk_enquiry_trial_posting
      FOREIGN KEY (tenant_id, trial_posting_id)
      REFERENCES public.academy_trial_postings(tenant_id, id)
      ON DELETE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenant_enquiries_unit_status
  ON public.tenant_enquiries(tenant_id, unit_id, status);

-- Private internal staff notes on admission applicants (never public)
CREATE TABLE IF NOT EXISTS public.academy_admission_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  enquiry_id uuid NOT NULL,
  unit_id uuid,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL CHECK (char_length(trim(author_name)) >= 2),
  evaluation_score integer CHECK (evaluation_score IS NULL OR (evaluation_score BETWEEN 1 AND 10)),
  note_body text NOT NULL CHECK (char_length(trim(note_body)) BETWEEN 2 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_aadmn_enquiry FOREIGN KEY (tenant_id, enquiry_id)
    REFERENCES public.tenant_enquiries(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_aadmn_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_aadmn_enquiry
  ON public.academy_admission_notes(tenant_id, enquiry_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 11. ACADEMY ANNOUNCEMENTS & COMMUNICATION LOGS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academy_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id uuid,
  batch_id uuid,
  audience text NOT NULL CHECK (audience IN ('all_staff', 'branch_managers', 'coaches', 'students', 'parents', 'trial_applicants')),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 200),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 2 AND 4000),
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'whatsapp_link', 'email_digest')),
  recipient_count integer NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_ann_unit FOREIGN KEY (tenant_id, unit_id)
    REFERENCES public.tenant_units(tenant_id, id) ON DELETE NO ACTION,
  CONSTRAINT fk_ann_batch FOREIGN KEY (tenant_id, batch_id)
    REFERENCES public.tenant_batches(tenant_id, id) ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_academy_announcements_tenant
  ON public.academy_announcements(tenant_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY & LEAST-PRIVILEGE GRANTS ACROSS ALL ACADEMY TABLES
-- -----------------------------------------------------------------------------

ALTER TABLE public.academy_staff_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_staff_branch_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_coaches FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_athlete_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_athlete_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_facilities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_equipment_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_training_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_attendance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_attendance_audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_coach_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_coach_attendance FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_trial_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_trial_postings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_admission_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_admission_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.academy_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_announcements FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.academy_staff_branch_assignments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_coaches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_athlete_notes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_facilities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_equipment_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_training_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_attendance_audit_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_coach_attendance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_trial_postings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_admission_notes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academy_announcements FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE ON public.academy_staff_branch_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_coaches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_athlete_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_facilities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_equipment_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_training_sessions TO authenticated;
GRANT SELECT ON public.academy_attendance_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_coach_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academy_trial_postings TO authenticated;
GRANT SELECT, INSERT ON public.academy_admission_notes TO authenticated;
GRANT SELECT, INSERT ON public.academy_announcements TO authenticated;

-- 12.1 Branch Assignments Policies
DROP POLICY IF EXISTS "asba_select" ON public.academy_staff_branch_assignments;
CREATE POLICY "asba_select" ON public.academy_staff_branch_assignments
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:staff.manage')
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships m
      WHERE m.id = membership_id AND m.user_id = auth.uid() AND m.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "asba_manage" ON public.academy_staff_branch_assignments;
CREATE POLICY "asba_manage" ON public.academy_staff_branch_assignments
  FOR ALL TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'academy:staff.manage'))
  WITH CHECK (public.has_tenant_permission(tenant_id, 'academy:staff.manage'));

-- 12.2 Academy Profiles Policies
DROP POLICY IF EXISTS "academy_profiles_select" ON public.academy_profiles;
CREATE POLICY "academy_profiles_select" ON public.academy_profiles
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id) OR public.is_academy_moderator());

DROP POLICY IF EXISTS "academy_profiles_insert" ON public.academy_profiles;
CREATE POLICY "academy_profiles_insert" ON public.academy_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_permission(tenant_id, 'academy:profile.manage'));

DROP POLICY IF EXISTS "academy_profiles_update" ON public.academy_profiles;
CREATE POLICY "academy_profiles_update" ON public.academy_profiles
  FOR UPDATE TO authenticated
  USING (public.has_tenant_permission(tenant_id, 'academy:profile.manage') OR public.is_academy_moderator())
  WITH CHECK (public.has_tenant_permission(tenant_id, 'academy:profile.manage') OR public.is_academy_moderator());

-- 12.3 Harden Existing Core Multi-Tenant Tables for 7-Role + Branch Isolation
DROP POLICY IF EXISTS "tenant_units_select" ON public.tenant_units;
CREATE POLICY "tenant_units_select" ON public.tenant_units
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_member(tenant_id)
    AND deleted_at IS NULL
    AND public.has_academy_branch_access(tenant_id, id)
  );

DROP POLICY IF EXISTS "tenant_units_manage" ON public.tenant_units;
CREATE POLICY "tenant_units_manage" ON public.tenant_units
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'org:settings')
    OR (
      public.has_tenant_permission(tenant_id, 'academy:branches.manage')
      AND public.has_academy_branch_access(tenant_id, id)
    )
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'org:settings')
    OR (
      public.has_tenant_permission(tenant_id, 'academy:branches.manage')
      AND public.has_academy_branch_access(tenant_id, id)
    )
  );

DROP POLICY IF EXISTS "tenant_batches_select" ON public.tenant_batches;
CREATE POLICY "tenant_batches_select" ON public.tenant_batches
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_member(tenant_id)
    AND (
      deleted_at IS NULL
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin'])
    )
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "tenant_batches_manage" ON public.tenant_batches;
CREATE POLICY "tenant_batches_manage" ON public.tenant_batches
  FOR ALL TO authenticated
  USING (
    (
      public.has_tenant_permission(tenant_id, 'academy:training.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach'])
    )
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    (
      public.has_tenant_permission(tenant_id, 'academy:training.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach'])
    )
    AND public.has_academy_branch_access(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS "tenant_students_member_select" ON public.tenant_students;
CREATE POLICY "tenant_students_member_select" ON public.tenant_students
  FOR SELECT TO authenticated
  USING (
    (
      guardian_user_id = auth.uid()
      OR athlete_user_id = auth.uid()
      OR (
        public.is_tenant_member(tenant_id)
        AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
      )
    )
    AND (
      deleted_at IS NULL
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin'])
    )
  );

DROP POLICY IF EXISTS "tenant_students_manage" ON public.tenant_students;
CREATE POLICY "tenant_students_manage" ON public.tenant_students
  FOR ALL TO authenticated
  USING (
    (
      public.has_tenant_permission(tenant_id, 'academy:athletes.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'admissions_manager', 'head_coach', 'front_desk'])
    )
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    (
      public.has_tenant_permission(tenant_id, 'academy:athletes.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'admissions_manager', 'head_coach', 'front_desk'])
    )
    AND public.has_academy_branch_access(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS "tenant_enquiries_member_select" ON public.tenant_enquiries;
CREATE POLICY "tenant_enquiries_member_select" ON public.tenant_enquiries
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_member(tenant_id)
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "tenant_enquiries_manage" ON public.tenant_enquiries;
CREATE POLICY "tenant_enquiries_manage" ON public.tenant_enquiries
  FOR UPDATE TO authenticated
  USING (
    (
      public.has_tenant_permission(tenant_id, 'academy:admissions.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'admissions_manager', 'front_desk'])
    )
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    (
      public.has_tenant_permission(tenant_id, 'academy:admissions.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'admissions_manager', 'front_desk'])
    )
    AND public.has_academy_branch_access(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS "tenant_invoices_member_select" ON public.tenant_fee_invoices;
CREATE POLICY "tenant_invoices_member_select" ON public.tenant_fee_invoices
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:finance.view')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant', 'front_desk'])
    OR EXISTS (
      SELECT 1 FROM public.tenant_students s
      WHERE s.id = student_id AND (s.guardian_user_id = auth.uid() OR s.athlete_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tenant_invoices_manage" ON public.tenant_fee_invoices;
CREATE POLICY "tenant_invoices_manage" ON public.tenant_fee_invoices
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant'])
  );

DROP POLICY IF EXISTS "tenant_transactions_member_select" ON public.tenant_fee_transactions;
CREATE POLICY "tenant_transactions_member_select" ON public.tenant_fee_transactions
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:finance.view')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant', 'front_desk'])
    OR EXISTS (
      SELECT 1 FROM public.tenant_students s
      WHERE s.id = student_id AND (s.guardian_user_id = auth.uid() OR s.athlete_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tenant_transactions_manage" ON public.tenant_fee_transactions;
CREATE POLICY "tenant_transactions_manage" ON public.tenant_fee_transactions
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant', 'front_desk'])
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:finance.manage')
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant', 'front_desk'])
  );

DROP POLICY IF EXISTS "tenant_attendance_member_select" ON public.tenant_attendance_events;
CREATE POLICY "tenant_attendance_member_select" ON public.tenant_attendance_events
  FOR SELECT TO authenticated
  USING (
    (
      public.is_tenant_member(tenant_id)
      AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
    )
    OR EXISTS (
      SELECT 1 FROM public.tenant_students s
      WHERE s.id = student_id AND (s.guardian_user_id = auth.uid() OR s.athlete_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "tenant_attendance_mark" ON public.tenant_attendance_events;
CREATE POLICY "tenant_attendance_mark" ON public.tenant_attendance_events
  FOR ALL TO authenticated
  USING (
    (
      public.has_tenant_permission(tenant_id, 'academy:attendance.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach'])
    )
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    (
      public.has_tenant_permission(tenant_id, 'academy:attendance.manage')
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach'])
    )
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

-- 12.4 Policies for New Academy Tables
DROP POLICY IF EXISTS "academy_coaches_select" ON public.academy_coaches;
CREATE POLICY "academy_coaches_select" ON public.academy_coaches
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      user_id = auth.uid()
      OR (
        public.has_tenant_permission(tenant_id, 'academy:coaches.view')
        AND (primary_unit_id IS NULL OR public.has_academy_branch_access(tenant_id, primary_unit_id))
      )
    )
  );

DROP POLICY IF EXISTS "academy_coaches_manage" ON public.academy_coaches;
CREATE POLICY "academy_coaches_manage" ON public.academy_coaches
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:coaches.manage')
    AND (primary_unit_id IS NULL OR public.has_academy_branch_access(tenant_id, primary_unit_id))
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:coaches.manage')
    AND (primary_unit_id IS NULL OR public.has_academy_branch_access(tenant_id, primary_unit_id))
  );

DROP POLICY IF EXISTS "academy_athlete_notes_select" ON public.academy_athlete_notes;
CREATE POLICY "academy_athlete_notes_select" ON public.academy_athlete_notes
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.has_tenant_permission(tenant_id, 'academy:athletes.view')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_athlete_notes_manage" ON public.academy_athlete_notes;
CREATE POLICY "academy_athlete_notes_manage" ON public.academy_athlete_notes
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:athletes.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:athletes.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_facilities_select" ON public.academy_facilities;
CREATE POLICY "academy_facilities_select" ON public.academy_facilities
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_tenant_member(tenant_id)
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_facilities_manage" ON public.academy_facilities;
CREATE POLICY "academy_facilities_manage" ON public.academy_facilities
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:facilities.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:facilities.manage')
    AND public.has_academy_branch_access(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS "academy_equipment_select" ON public.academy_equipment_items;
CREATE POLICY "academy_equipment_select" ON public.academy_equipment_items
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_tenant_member(tenant_id)
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_equipment_manage" ON public.academy_equipment_items;
CREATE POLICY "academy_equipment_manage" ON public.academy_equipment_items
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:facilities.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:facilities.manage')
    AND public.has_academy_branch_access(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS "academy_sessions_select" ON public.academy_training_sessions;
CREATE POLICY "academy_sessions_select" ON public.academy_training_sessions
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_tenant_member(tenant_id)
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_sessions_manage" ON public.academy_training_sessions;
CREATE POLICY "academy_sessions_manage" ON public.academy_training_sessions
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:training.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:training.manage')
    AND public.has_academy_branch_access(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS "academy_attendance_audit_select" ON public.academy_attendance_audit_logs;
CREATE POLICY "academy_attendance_audit_select" ON public.academy_attendance_audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:attendance.view')
    OR public.has_tenant_permission(tenant_id, 'academy:audit.view')
  );

DROP POLICY IF EXISTS "academy_coach_attendance_select" ON public.academy_coach_attendance;
CREATE POLICY "academy_coach_attendance_select" ON public.academy_coach_attendance
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:attendance.view')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_coach_attendance_manage" ON public.academy_coach_attendance;
CREATE POLICY "academy_coach_attendance_manage" ON public.academy_coach_attendance
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:coaches.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:coaches.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_trial_postings_select" ON public.academy_trial_postings;
CREATE POLICY "academy_trial_postings_select" ON public.academy_trial_postings
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      public.is_academy_moderator()
      OR (
        public.is_tenant_member(tenant_id)
        AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
      )
    )
  );

DROP POLICY IF EXISTS "academy_trial_postings_manage" ON public.academy_trial_postings;
CREATE POLICY "academy_trial_postings_manage" ON public.academy_trial_postings
  FOR ALL TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:admissions.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  )
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:admissions.manage')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_admission_notes_select" ON public.academy_admission_notes;
CREATE POLICY "academy_admission_notes_select" ON public.academy_admission_notes
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_permission(tenant_id, 'academy:admissions.view')
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_admission_notes_insert" ON public.academy_admission_notes;
CREATE POLICY "academy_admission_notes_insert" ON public.academy_admission_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:admissions.manage')
    AND author_user_id = auth.uid()
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_announcements_select" ON public.academy_announcements;
CREATE POLICY "academy_announcements_select" ON public.academy_announcements
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_member(tenant_id)
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

DROP POLICY IF EXISTS "academy_announcements_insert" ON public.academy_announcements;
CREATE POLICY "academy_announcements_insert" ON public.academy_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_tenant_permission(tenant_id, 'academy:notifications.manage')
    AND created_by = auth.uid()
    AND (unit_id IS NULL OR public.has_academy_branch_access(tenant_id, unit_id))
  );

-- -----------------------------------------------------------------------------
-- 13. AUTHORITATIVE ACADEMY SAAS SECURITY DEFINER RPCs
-- -----------------------------------------------------------------------------

-- 13.1 Ensure / Initialize 1:1 Academy Profile from Tenant Record
CREATE OR REPLACE FUNCTION public.ensure_academy_profile_for_tenant(p_tenant_id uuid)
RETURNS public.academy_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant public.tenants%ROWTYPE;
  v_profile public.academy_profiles%ROWTYPE;
  v_dir_id uuid;
  v_slug text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Forbidden: active tenant membership required';
  END IF;

  SELECT * INTO v_tenant
  FROM public.tenants
  WHERE id = p_tenant_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Academy tenant not found';
  END IF;

  SELECT * INTO v_profile
  FROM public.academy_profiles
  WHERE tenant_id = p_tenant_id;

  IF FOUND THEN
    RETURN v_profile;
  END IF;

  SELECT id INTO v_dir_id
  FROM public.academies
  WHERE slug = v_tenant.slug
  LIMIT 1;

  v_slug := regexp_replace(lower(COALESCE(v_tenant.slug, 'academy-' || left(p_tenant_id::text, 8))), '[^a-z0-9-]+', '-', 'g');
  v_slug := trim(both '-' FROM v_slug);
  IF v_slug = '' THEN
    v_slug := 'academy-' || left(p_tenant_id::text, 8);
  END IF;

  INSERT INTO public.academy_profiles (
    tenant_id,
    directory_academy_id,
    slug,
    display_name,
    sports_offered,
    city,
    state,
    contact_phone,
    contact_email,
    verification_status
  ) VALUES (
    p_tenant_id,
    v_dir_id,
    v_slug,
    v_tenant.name,
    CASE WHEN v_tenant.sport IS NOT NULL AND trim(v_tenant.sport) <> '' THEN ARRAY[v_tenant.sport] ELSE '{}'::text[] END,
    COALESCE(v_tenant.city, ''),
    COALESCE(v_tenant.state, ''),
    v_tenant.contact_phone,
    v_tenant.contact_email,
    CASE
      WHEN v_tenant.verification_status IN ('unverified', 'pending_review', 'verified', 'rejected', 'more_info_needed')
      THEN v_tenant.verification_status
      ELSE 'unverified'
    END
  )
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_academy_profile_for_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_academy_profile_for_tenant(uuid) TO authenticated;

-- 13.2 Submit Academy Profile for KhelGrid Moderation & Verification
CREATE OR REPLACE FUNCTION public.submit_academy_profile_for_moderation(
  p_tenant_id uuid,
  p_document_type text DEFAULT 'affiliation_certificate',
  p_proof_details text DEFAULT '',
  p_document_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.academy_profiles%ROWTYPE;
  v_submission_id uuid;
  v_contact_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_tenant_permission(p_tenant_id, 'academy:verification.submit') THEN
    RAISE EXCEPTION 'Forbidden: only academy owners and administrators can submit verification requests';
  END IF;

  IF char_length(trim(COALESCE(p_proof_details, ''))) < 5 THEN
    RAISE EXCEPTION 'Please provide verification proof details (minimum 5 characters)';
  END IF;

  v_profile := public.ensure_academy_profile_for_tenant(p_tenant_id);

  SELECT COALESCE(display_name, 'Academy Representative')
  INTO v_contact_name
  FROM public.profiles
  WHERE id = v_uid;

  INSERT INTO public.verification_claims (
    entity_type,
    entity_slug,
    entity_name,
    contact_name,
    contact_phone,
    contact_email,
    claimant_role,
    document_type,
    proof_details,
    status
  ) VALUES (
    'academy',
    v_profile.slug,
    v_profile.display_name,
    COALESCE(v_contact_name, 'Academy Owner'),
    COALESCE(NULLIF(trim(COALESCE(v_profile.contact_phone, '')), ''), '0000000000'),
    v_profile.contact_email,
    'academy_owner',
    CASE
      WHEN p_document_type IN ('affiliation_certificate', 'ground_lease', 'coaching_license', 'municipal_trade_license', 'geotagged_photos', 'other')
      THEN p_document_type
      ELSE 'affiliation_certificate'
    END,
    trim(p_proof_details) || COALESCE(' [Document: ' || p_document_url || ']', ''),
    'pending_review'
  );

  INSERT INTO public.listing_submissions (
    submitter_id,
    listing_type,
    payload,
    source_url,
    status
  ) VALUES (
    v_uid,
    'academy',
    jsonb_build_object(
      'tenant_id', p_tenant_id,
      'slug', v_profile.slug,
      'name', v_profile.display_name,
      'city', v_profile.city,
      'state', v_profile.state,
      'sports', v_profile.sports_offered,
      'proof_details', trim(p_proof_details)
    ),
    CASE WHEN p_document_url ~ '^https?://' THEN p_document_url ELSE NULL END,
    'pending'
  )
  RETURNING id INTO v_submission_id;

  UPDATE public.academy_profiles
  SET verification_status = 'pending_review',
      last_submitted_at = now(),
      updated_at = now()
  WHERE id = v_profile.id;

  UPDATE public.tenants
  SET verification_status = 'pending_review',
      updated_at = now()
  WHERE id = p_tenant_id;

  INSERT INTO public.tenant_audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    v_uid,
    'academy.verification_submitted',
    'academy_profiles',
    v_profile.id,
    jsonb_build_object('submission_id', v_submission_id, 'document_type', p_document_type)
  );

  RETURN v_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_academy_profile_for_moderation(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_academy_profile_for_moderation(uuid, text, text, text) TO authenticated;

-- 13.3 Submit Academy Trial Posting for Moderation (non-bypassable publication gate)
CREATE OR REPLACE FUNCTION public.submit_academy_trial_for_moderation(p_trial_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trial public.academy_trial_postings%ROWTYPE;
  v_sub_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_trial
  FROM public.academy_trial_postings
  WHERE id = p_trial_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trial posting not found';
  END IF;

  IF NOT public.has_academy_permission(v_trial.tenant_id, 'academy:admissions.manage', v_trial.unit_id) THEN
    RAISE EXCEPTION 'Forbidden: insufficient permissions to submit this trial for moderation';
  END IF;

  INSERT INTO public.listing_submissions (
    submitter_id,
    listing_type,
    payload,
    status
  ) VALUES (
    v_uid,
    'trial',
    jsonb_build_object(
      'tenant_id', v_trial.tenant_id,
      'trial_posting_id', v_trial.id,
      'title', v_trial.title,
      'sport', v_trial.sport,
      'city', v_trial.city,
      'trial_date', v_trial.trial_date,
      'application_deadline', v_trial.application_deadline,
      'age_categories', v_trial.age_categories,
      'fee_display_inr', v_trial.fee_display_inr
    ),
    'pending'
  )
  RETURNING id INTO v_sub_id;

  UPDATE public.academy_trial_postings
  SET status = 'pending_moderation',
      listing_submission_id = v_sub_id,
      updated_at = now()
  WHERE id = v_trial.id;

  RETURN v_sub_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_academy_trial_for_moderation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_academy_trial_for_moderation(uuid) TO authenticated;

-- 13.4 Expand create_tenant_invitation + Add Branch-Aware Staff Invite & Update RPCs
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
  IF NOT (
    public.has_tenant_role(p_tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin'])
    OR public.has_tenant_permission(p_tenant_id, 'academy:staff.manage')
  ) THEN
    RAISE EXCEPTION 'Access denied: only owners and administrators can invite staff';
  END IF;

  IF p_invited_email IS NULL OR trim(p_invited_email) = '' THEN
    RAISE EXCEPTION 'Invited email address is required';
  END IF;

  IF p_role NOT IN (
    'org_admin', 'director', 'admin', 'manager', 'admissions_manager',
    'finance_manager', 'head_coach', 'coach', 'accountant',
    'front_desk', 'staff', 'readonly_member'
  ) THEN
    RAISE EXCEPTION 'Invalid role for invitation: %', p_role;
  END IF;

  -- Non-owners cannot invite top-level director/org_admin roles
  IF p_role IN ('org_admin', 'director') AND NOT public.has_tenant_role(p_tenant_id, ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only the Academy Owner can invite Administrators or Directors';
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

CREATE OR REPLACE FUNCTION public.invite_academy_staff_member(
  p_tenant_id uuid,
  p_invited_email text,
  p_role text,
  p_unit_ids uuid[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_membership_id uuid;
  v_unit_id uuid;
BEGIN
  v_membership_id := public.create_tenant_invitation(p_tenant_id, p_invited_email, p_role);

  IF p_unit_ids IS NOT NULL AND array_length(p_unit_ids, 1) > 0 THEN
    FOREACH v_unit_id IN ARRAY p_unit_ids LOOP
      IF EXISTS (
        SELECT 1 FROM public.tenant_units u
        WHERE u.id = v_unit_id AND u.tenant_id = p_tenant_id AND u.deleted_at IS NULL
      ) THEN
        INSERT INTO public.academy_staff_branch_assignments (
          tenant_id, membership_id, unit_id, assigned_by
        ) VALUES (
          p_tenant_id, v_membership_id, v_unit_id, auth.uid()
        )
        ON CONFLICT (membership_id, unit_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.tenant_audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    auth.uid(),
    'academy.staff_invited',
    'tenant_memberships',
    v_membership_id,
    jsonb_build_object('invited_email', lower(trim(p_invited_email)), 'role', p_role, 'unit_ids', COALESCE(to_jsonb(p_unit_ids), '[]'::jsonb))
  );

  RETURN v_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_academy_staff_member(uuid, text, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_academy_staff_member(uuid, text, text, uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_academy_staff_membership(
  p_tenant_id uuid,
  p_membership_id uuid,
  p_new_role text,
  p_unit_ids uuid[] DEFAULT NULL,
  p_status text DEFAULT 'active'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target public.tenant_memberships%ROWTYPE;
  v_unit_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_tenant_permission(p_tenant_id, 'academy:staff.manage') THEN
    RAISE EXCEPTION 'Forbidden: insufficient permissions to manage academy staff';
  END IF;

  SELECT * INTO v_target
  FROM public.tenant_memberships
  WHERE tenant_id = p_tenant_id AND id = p_membership_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff membership not found';
  END IF;

  -- Strictly forbid self-promotion / self-role edit
  IF v_target.user_id = v_actor THEN
    RAISE EXCEPTION 'Forbidden: you cannot modify your own role or membership status';
  END IF;

  IF v_target.role = 'owner' OR p_new_role = 'owner' THEN
    RAISE EXCEPTION 'Owner role changes must use the atomic ownership transfer workflow';
  END IF;

  IF p_new_role IN ('org_admin', 'director') AND NOT public.has_tenant_role(p_tenant_id, ARRAY['owner']) THEN
    RAISE EXCEPTION 'Only the Academy Owner can assign Administrator or Director roles';
  END IF;

  IF p_new_role NOT IN (
    'org_admin', 'director', 'admin', 'manager', 'admissions_manager',
    'finance_manager', 'head_coach', 'coach', 'accountant',
    'front_desk', 'staff', 'readonly_member'
  ) THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  IF p_status NOT IN ('active', 'suspended', 'revoked') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  UPDATE public.tenant_memberships
  SET role = p_new_role,
      status = p_status,
      updated_at = now()
  WHERE id = p_membership_id AND tenant_id = p_tenant_id;

  IF p_unit_ids IS NOT NULL THEN
    DELETE FROM public.academy_staff_branch_assignments
    WHERE tenant_id = p_tenant_id AND membership_id = p_membership_id;

    FOREACH v_unit_id IN ARRAY p_unit_ids LOOP
      IF EXISTS (
        SELECT 1 FROM public.tenant_units u
        WHERE u.id = v_unit_id AND u.tenant_id = p_tenant_id AND u.deleted_at IS NULL
      ) THEN
        INSERT INTO public.academy_staff_branch_assignments (
          tenant_id, membership_id, unit_id, assigned_by
        ) VALUES (
          p_tenant_id, p_membership_id, v_unit_id, v_actor
        )
        ON CONFLICT (membership_id, unit_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.tenant_audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    v_actor,
    'academy.staff_updated',
    'tenant_memberships',
    p_membership_id,
    jsonb_build_object('new_role', p_new_role, 'status', p_status)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_academy_staff_membership(uuid, uuid, text, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_academy_staff_membership(uuid, uuid, text, uuid[], text) TO authenticated;

-- 13.5 Convert Admissions Applicant to Athlete Student Record (with branch + audit log)
CREATE OR REPLACE FUNCTION public.convert_academy_enquiry_to_student(
  p_tenant_id uuid,
  p_enquiry_id uuid,
  p_batch_id uuid DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_monthly_fee integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_enquiry public.tenant_enquiries%ROWTYPE;
  v_student_id uuid;
  v_effective_unit_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_enquiry
  FROM public.tenant_enquiries
  WHERE tenant_id = p_tenant_id AND id = p_enquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application / enquiry not found for this academy';
  END IF;

  v_effective_unit_id := COALESCE(p_unit_id, v_enquiry.unit_id);

  IF NOT public.has_academy_permission(p_tenant_id, 'academy:admissions.manage', v_effective_unit_id) THEN
    RAISE EXCEPTION 'Forbidden: insufficient permissions to admit candidate';
  END IF;

  INSERT INTO public.tenant_students (
    tenant_id,
    batch_id,
    unit_id,
    student_name,
    parent_name,
    parent_phone,
    parent_email,
    sport,
    age_category,
    enrollment_status,
    joining_date,
    monthly_fee,
    fee_status,
    is_active
  ) VALUES (
    p_tenant_id,
    p_batch_id,
    v_effective_unit_id,
    v_enquiry.student_name,
    v_enquiry.parent_name,
    v_enquiry.parent_phone,
    v_enquiry.parent_email,
    v_enquiry.sport,
    v_enquiry.age_category,
    'active',
    CURRENT_DATE,
    GREATEST(0, COALESCE(p_monthly_fee, 0)),
    CASE WHEN COALESCE(p_monthly_fee, 0) = 0 THEN 'exempt' ELSE 'due_soon' END,
    true
  )
  RETURNING id INTO v_student_id;

  UPDATE public.tenant_enquiries
  SET status = 'enrolled',
      unit_id = v_effective_unit_id,
      stage_updated_at = now()
  WHERE id = p_enquiry_id AND tenant_id = p_tenant_id;

  INSERT INTO public.tenant_audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, details)
  VALUES (
    p_tenant_id,
    v_uid,
    'academy.applicant_enrolled',
    'tenant_students',
    v_student_id,
    jsonb_build_object('enquiry_id', p_enquiry_id, 'batch_id', p_batch_id, 'unit_id', v_effective_unit_id)
  );

  RETURN v_student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_academy_enquiry_to_student(uuid, uuid, uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_academy_enquiry_to_student(uuid, uuid, uuid, uuid, integer) TO authenticated;

-- 13.6 Publish Academy Announcement + Fan-Out User Notifications
CREATE OR REPLACE FUNCTION public.publish_academy_announcement(
  p_tenant_id uuid,
  p_audience text,
  p_title text,
  p_message text,
  p_unit_id uuid DEFAULT NULL,
  p_batch_id uuid DEFAULT NULL,
  p_channel text DEFAULT 'in_app'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_announcement_id uuid;
  v_recipient_count integer := 0;
  v_recipient_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_academy_permission(p_tenant_id, 'academy:notifications.manage', p_unit_id) THEN
    RAISE EXCEPTION 'Forbidden: insufficient permissions to send academy announcements';
  END IF;

  INSERT INTO public.academy_announcements (
    tenant_id, unit_id, batch_id, audience, title, message, channel, created_by
  ) VALUES (
    p_tenant_id, p_unit_id, p_batch_id, p_audience, trim(p_title), trim(p_message), p_channel, v_uid
  )
  RETURNING id INTO v_announcement_id;

  IF p_audience IN ('all_staff', 'branch_managers', 'coaches') THEN
    FOR v_recipient_id IN
      SELECT DISTINCT m.user_id
      FROM public.tenant_memberships m
      WHERE m.tenant_id = p_tenant_id
        AND m.status = 'active'
        AND m.deleted_at IS NULL
        AND m.user_id IS NOT NULL
        AND (
          p_audience = 'all_staff'
          OR (p_audience = 'branch_managers' AND m.role IN ('owner', 'org_admin', 'director', 'admin', 'manager'))
          OR (p_audience = 'coaches' AND m.role IN ('head_coach', 'coach'))
        )
    LOOP
      INSERT INTO public.user_notifications (
        user_id, category, title, message, action_url, metadata
      ) VALUES (
        v_recipient_id,
        'academy',
        trim(p_title),
        trim(p_message),
        '/academy-hub/notifications',
        jsonb_build_object('tenant_id', p_tenant_id, 'announcement_id', v_announcement_id)
      );
      v_recipient_count := v_recipient_count + 1;
    END LOOP;
  ELSIF p_audience IN ('students', 'parents') THEN
    FOR v_recipient_id IN
      SELECT DISTINCT u_id
      FROM (
        SELECT s.athlete_user_id AS u_id
        FROM public.tenant_students s
        WHERE s.tenant_id = p_tenant_id
          AND s.deleted_at IS NULL
          AND s.is_active = true
          AND (p_batch_id IS NULL OR s.batch_id = p_batch_id)
          AND (p_unit_id IS NULL OR s.unit_id = p_unit_id)
          AND p_audience = 'students'
          AND s.athlete_user_id IS NOT NULL
        UNION
        SELECT s.guardian_user_id AS u_id
        FROM public.tenant_students s
        WHERE s.tenant_id = p_tenant_id
          AND s.deleted_at IS NULL
          AND s.is_active = true
          AND (p_batch_id IS NULL OR s.batch_id = p_batch_id)
          AND (p_unit_id IS NULL OR s.unit_id = p_unit_id)
          AND p_audience = 'parents'
          AND s.guardian_user_id IS NOT NULL
      ) recipients
    LOOP
      INSERT INTO public.user_notifications (
        user_id, category, title, message, action_url, metadata
      ) VALUES (
        v_recipient_id,
        'academy',
        trim(p_title),
        trim(p_message),
        '/notifications',
        jsonb_build_object('tenant_id', p_tenant_id, 'announcement_id', v_announcement_id)
      );
      v_recipient_count := v_recipient_count + 1;
    END LOOP;
  END IF;

  UPDATE public.academy_announcements
  SET recipient_count = v_recipient_count
  WHERE id = v_announcement_id;

  RETURN v_announcement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_academy_announcement(uuid, text, text, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_academy_announcement(uuid, text, text, text, uuid, uuid, text) TO authenticated;

-- 13.7 Genuine PostgreSQL Academy Dashboard Overview & Analytics RPC
CREATE OR REPLACE FUNCTION public.get_academy_dashboard_overview(
  p_tenant_id uuid,
  p_unit_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_can_view_finance boolean := false;
  v_total_athletes integer := 0;
  v_active_athletes integer := 0;
  v_coaches_count integer := 0;
  v_branches_count integer := 0;
  v_active_batches integer := 0;
  v_upcoming_sessions integer := 0;
  v_completed_sessions integer := 0;
  v_pending_applications integer := 0;
  v_total_applications integer := 0;
  v_enrolled_applications integer := 0;
  v_attendance_total integer := 0;
  v_attendance_present integer := 0;
  v_attendance_rate numeric := NULL;
  v_facilities_count integer := 0;
  v_unread_notifications integer := 0;
  v_total_fee_collected bigint := NULL;
  v_fee_overdue_count integer := NULL;
  v_recent_applications jsonb := '[]'::jsonb;
  v_upcoming_sessions_list jsonb := '[]'::jsonb;
  v_recent_activity jsonb := '[]'::jsonb;
  v_pipeline_breakdown jsonb := '[]'::jsonb;
  v_branch_breakdown jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Forbidden: active academy membership required';
  END IF;

  IF p_unit_id IS NOT NULL AND NOT public.has_academy_branch_access(p_tenant_id, p_unit_id) THEN
    RAISE EXCEPTION 'Forbidden: caller does not have access to this academy branch';
  END IF;

  v_can_view_finance :=
    public.has_tenant_permission(p_tenant_id, 'academy:finance.view')
    OR public.has_tenant_role(p_tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'finance_manager', 'accountant']);

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE is_active = true AND enrollment_status = 'active')::int
  INTO v_total_athletes, v_active_athletes
  FROM public.tenant_students s
  WHERE s.tenant_id = p_tenant_id
    AND s.deleted_at IS NULL
    AND (p_unit_id IS NULL OR s.unit_id = p_unit_id)
    AND (s.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, s.unit_id));

  SELECT count(*)::int
  INTO v_coaches_count
  FROM public.academy_coaches c
  WHERE c.tenant_id = p_tenant_id
    AND c.deleted_at IS NULL
    AND c.status = 'active'
    AND (p_unit_id IS NULL OR c.primary_unit_id = p_unit_id)
    AND (c.primary_unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, c.primary_unit_id));

  SELECT count(*)::int
  INTO v_branches_count
  FROM public.tenant_units u
  WHERE u.tenant_id = p_tenant_id
    AND u.deleted_at IS NULL
    AND u.is_active = true
    AND u.unit_type IN ('branch', 'regional_office', 'facility')
    AND public.has_academy_branch_access(p_tenant_id, u.id);

  SELECT count(*)::int
  INTO v_active_batches
  FROM public.tenant_batches b
  WHERE b.tenant_id = p_tenant_id
    AND b.deleted_at IS NULL
    AND b.is_active = true
    AND (p_unit_id IS NULL OR b.unit_id = p_unit_id)
    AND (b.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, b.unit_id));

  SELECT
    count(*) FILTER (WHERE s.status IN ('scheduled', 'rescheduled') AND s.session_date >= CURRENT_DATE AND s.session_date <= CURRENT_DATE + 7)::int,
    count(*) FILTER (WHERE s.status = 'completed' AND s.session_date >= CURRENT_DATE - 30)::int
  INTO v_upcoming_sessions, v_completed_sessions
  FROM public.academy_training_sessions s
  WHERE s.tenant_id = p_tenant_id
    AND s.deleted_at IS NULL
    AND (p_unit_id IS NULL OR s.unit_id = p_unit_id)
    AND (s.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, s.unit_id));

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE status IN ('new', 'contacted', 'shortlisted', 'trial_scheduled', 'trial_completed', 'offered'))::int,
    count(*) FILTER (WHERE status = 'enrolled')::int
  INTO v_total_applications, v_pending_applications, v_enrolled_applications
  FROM public.tenant_enquiries e
  WHERE e.tenant_id = p_tenant_id
    AND (p_unit_id IS NULL OR e.unit_id = p_unit_id)
    AND (e.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, e.unit_id));

  SELECT
    count(*)::int,
    count(*) FILTER (WHERE a.status IN ('present', 'late'))::int
  INTO v_attendance_total, v_attendance_present
  FROM public.tenant_attendance_events a
  WHERE a.tenant_id = p_tenant_id
    AND a.session_date >= (CURRENT_DATE - 30)
    AND (p_unit_id IS NULL OR a.unit_id = p_unit_id)
    AND (a.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, a.unit_id));

  IF v_attendance_total > 0 THEN
    v_attendance_rate := ROUND((100.0 * v_attendance_present) / v_attendance_total, 1);
  END IF;

  SELECT count(*)::int
  INTO v_facilities_count
  FROM public.academy_facilities f
  WHERE f.tenant_id = p_tenant_id
    AND f.deleted_at IS NULL
    AND f.status <> 'inactive'
    AND (p_unit_id IS NULL OR f.unit_id = p_unit_id)
    AND (f.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, f.unit_id));

  SELECT count(*)::int
  INTO v_unread_notifications
  FROM public.user_notifications n
  WHERE n.user_id = v_uid
    AND n.is_read = false;

  IF v_can_view_finance THEN
    SELECT COALESCE(sum(amount), 0)::bigint
    INTO v_total_fee_collected
    FROM public.tenant_fee_transactions ft
    WHERE ft.tenant_id = p_tenant_id
      AND ft.status <> 'refunded';

    SELECT count(*)::int
    INTO v_fee_overdue_count
    FROM public.tenant_students s
    WHERE s.tenant_id = p_tenant_id
      AND s.deleted_at IS NULL
      AND s.is_active = true
      AND s.fee_status IN ('overdue', 'due_soon')
      AND (p_unit_id IS NULL OR s.unit_id = p_unit_id);
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(app_row)), '[]'::jsonb)
  INTO v_recent_applications
  FROM (
    SELECT e.id, e.enquiry_token, e.student_name, e.parent_name, e.sport, e.request_type, e.status, e.unit_id, e.submitted_at
    FROM public.tenant_enquiries e
    WHERE e.tenant_id = p_tenant_id
      AND (p_unit_id IS NULL OR e.unit_id = p_unit_id)
      AND (e.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, e.unit_id))
    ORDER BY e.submitted_at DESC
    LIMIT 6
  ) app_row;

  SELECT COALESCE(jsonb_agg(row_to_json(sess_row)), '[]'::jsonb)
  INTO v_upcoming_sessions_list
  FROM (
    SELECT s.id, s.title, s.sport, s.session_date, s.start_time, s.end_time, s.status, s.unit_id, s.batch_id
    FROM public.academy_training_sessions s
    WHERE s.tenant_id = p_tenant_id
      AND s.deleted_at IS NULL
      AND s.status IN ('scheduled', 'rescheduled')
      AND s.session_date >= CURRENT_DATE
      AND (p_unit_id IS NULL OR s.unit_id = p_unit_id)
      AND (s.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, s.unit_id))
    ORDER BY s.session_date ASC, s.start_time ASC
    LIMIT 6
  ) sess_row;

  SELECT COALESCE(jsonb_agg(row_to_json(pipe_row)), '[]'::jsonb)
  INTO v_pipeline_breakdown
  FROM (
    SELECT e.status, count(*)::int AS count
    FROM public.tenant_enquiries e
    WHERE e.tenant_id = p_tenant_id
      AND (p_unit_id IS NULL OR e.unit_id = p_unit_id)
      AND (e.unit_id IS NULL OR public.has_academy_branch_access(p_tenant_id, e.unit_id))
    GROUP BY e.status
    ORDER BY count(*) DESC
  ) pipe_row;

  SELECT COALESCE(jsonb_agg(row_to_json(br_row)), '[]'::jsonb)
  INTO v_branch_breakdown
  FROM (
    SELECT
      u.id AS unit_id,
      u.name AS branch_name,
      u.city,
      (SELECT count(*)::int FROM public.tenant_students s WHERE s.tenant_id = p_tenant_id AND s.unit_id = u.id AND s.deleted_at IS NULL AND s.is_active = true) AS athletes_count,
      (SELECT count(*)::int FROM public.tenant_batches b WHERE b.tenant_id = p_tenant_id AND b.unit_id = u.id AND b.deleted_at IS NULL AND b.is_active = true) AS batches_count
    FROM public.tenant_units u
    WHERE u.tenant_id = p_tenant_id
      AND u.deleted_at IS NULL
      AND u.is_active = true
      AND public.has_academy_branch_access(p_tenant_id, u.id)
    ORDER BY u.is_primary DESC, u.created_at ASC
  ) br_row;

  IF public.has_tenant_permission(p_tenant_id, 'academy:audit.view') THEN
    SELECT COALESCE(jsonb_agg(row_to_json(act_row)), '[]'::jsonb)
    INTO v_recent_activity
    FROM (
      SELECT l.id, l.action, l.entity_type, l.details, l.created_at
      FROM public.tenant_audit_logs l
      WHERE l.tenant_id = p_tenant_id
      ORDER BY l.created_at DESC
      LIMIT 8
    ) act_row;
  END IF;

  RETURN jsonb_build_object(
    'stats', jsonb_build_object(
      'totalAthletes', v_total_athletes,
      'activeAthletes', v_active_athletes,
      'coachesCount', v_coaches_count,
      'branchesCount', v_branches_count,
      'activeBatches', v_active_batches,
      'upcomingSessions', v_upcoming_sessions,
      'completedSessions30d', v_completed_sessions,
      'totalApplications', v_total_applications,
      'pendingApplications', v_pending_applications,
      'enrolledApplications', v_enrolled_applications,
      'attendanceRatePct', v_attendance_rate,
      'attendanceEventsCount', v_attendance_total,
      'facilitiesCount', v_facilities_count,
      'unreadNotifications', v_unread_notifications,
      'totalFeeCollectedInr', v_total_fee_collected,
      'feeDueOrOverdueCount', v_fee_overdue_count,
      'canViewFinance', v_can_view_finance
    ),
    'recentApplications', v_recent_applications,
    'upcomingSessions', v_upcoming_sessions_list,
    'pipelineBreakdown', v_pipeline_breakdown,
    'branchBreakdown', v_branch_breakdown,
    'recentActivity', v_recent_activity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_academy_dashboard_overview(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_academy_dashboard_overview(uuid, uuid) TO authenticated;

COMMIT;
