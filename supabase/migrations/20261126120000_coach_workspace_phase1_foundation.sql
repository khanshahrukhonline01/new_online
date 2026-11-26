-- ==============================================================================
-- KhelGrid Coach Workspace — Phase 1: Workspace Foundation Schema & RLS
-- Migration: 20261126120000_coach_workspace_phase1_foundation.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Scope (Phase 1 Only — additive & backward-compatible):
-- 1. Create public.coach_profiles (owned 1:1 by auth.users, optionally linked
--    to tenants and public.coaches directory entry) with moderator-only
--    verification fields guarded by trigger + RLS.
-- 2. Create public.coach_verification_submissions (supporting accreditation
--    proof submissions, moderator feedback, rejection resubmission & history).
-- 3. Install SECURITY DEFINER RPCs:
--    - public.is_coach_moderator()
--    - public.ensure_coach_profile_for_user(p_tenant_id uuid)
--    - public.submit_coach_verification_request(...)
--    - public.moderate_coach_verification_submission(...)
--    - public.get_coach_dashboard_overview(p_tenant_id uuid)
-- 4. Enable & force RLS with least-privilege authenticated grants (zero anon access).
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. AUTHORIZATION HELPER (MODERATORS & PLATFORM ADMINS ONLY)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_coach_moderator()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_legacy_admin boolean := false;
BEGIN
  IF public.has_platform_role(ARRAY[
    'admin',
    'platform_super_admin',
    'platform_admin',
    'moderator',
    'verification_admin'
  ]) THEN
    RETURN true;
  END IF;

  IF to_regprocedure('public.is_admin()') IS NOT NULL THEN
    EXECUTE 'SELECT public.is_admin()' INTO v_is_legacy_admin;
    IF COALESCE(v_is_legacy_admin, false) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_coach_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_coach_moderator() TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. PROFESSIONAL COACH PROFILES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  directory_coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 140),
  avatar_url text CHECK (avatar_url IS NULL OR avatar_url ~ '^https?://'),
  bio text CHECK (bio IS NULL OR char_length(bio) <= 5000),
  sports_specialization text[] NOT NULL DEFAULT '{}'::text[],
  coaching_categories text[] NOT NULL DEFAULT '{}'::text[],
  experience_years integer NOT NULL DEFAULT 0 CHECK (experience_years >= 0 AND experience_years <= 80),
  qualifications jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(qualifications) = 'array'),
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(certifications) = 'array'),
  previous_academies jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(previous_academies) = 'array'),
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(achievements) = 'array'),
  languages text[] NOT NULL DEFAULT ARRAY['English']::text[],
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 120),
  state text NOT NULL DEFAULT '' CHECK (char_length(state) <= 120),
  service_area text NOT NULL DEFAULT '' CHECK (char_length(service_area) <= 240),
  coaching_methodology text CHECK (coaching_methodology IS NULL OR char_length(coaching_methodology) <= 4000),
  online_coaching_available boolean NOT NULL DEFAULT false,
  portfolio_url text CHECK (portfolio_url IS NULL OR portfolio_url ~ '^https?://'),
  intro_video_url text CHECK (intro_video_url IS NULL OR intro_video_url ~ '^https?://'),
  contact_preferences jsonb NOT NULL DEFAULT '{"allowWhatsApp": true, "allowEmail": true, "allowDirectInquiries": true, "preferredHours": "09:00 AM - 06:00 PM IST"}'::jsonb CHECK (jsonb_typeof(contact_preferences) = 'object'),
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (
    verification_status IN ('unverified', 'pending', 'under_review', 'verified', 'rejected', 'suspended')
  ),
  verification_feedback text CHECK (verification_feedback IS NULL OR char_length(verification_feedback) <= 2000),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_profiles_user ON public.coach_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_tenant ON public.coach_profiles(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coach_profiles_verification ON public.coach_profiles(verification_status);

-- Trigger enforcing non-moderator immutability of verification fields and ownership.
-- SECURITY INVOKER ensures `current_user` reflects the caller role ('authenticated' vs
-- table-owner inside SECURITY DEFINER RPCs), so direct REST clients cannot bypass it.
CREATE OR REPLACE FUNCTION public.protect_coach_profile_verification()
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
    OR public.is_coach_moderator();

  IF NOT v_is_privileged THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verification_status := 'unverified';
      NEW.verification_feedback := NULL;
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Forbidden: coach_profiles.user_id cannot be reassigned.';
      END IF;

      IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
         OR NEW.verification_feedback IS DISTINCT FROM OLD.verification_feedback
         OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
         OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
        RAISE EXCEPTION 'Forbidden: only authorized moderators can modify coach verification status.';
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_coach_profile_verification() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_coach_profile_verification ON public.coach_profiles;
CREATE TRIGGER trg_protect_coach_profile_verification
  BEFORE INSERT OR UPDATE ON public.coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_coach_profile_verification();

-- -----------------------------------------------------------------------------
-- 3. COACH VERIFICATION SUBMISSIONS & HISTORY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_verification_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_profile_id uuid NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  verification_claim_id uuid REFERENCES public.verification_claims(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (
    document_type IN ('coaching_license', 'affiliation_certificate', 'government_id', 'experience_letter', 'other')
  ),
  document_title text NOT NULL CHECK (char_length(trim(document_title)) BETWEEN 2 AND 180),
  supporting_details text NOT NULL CHECK (char_length(trim(supporting_details)) BETWEEN 5 AND 2000),
  supporting_document_url text CHECK (supporting_document_url IS NULL OR supporting_document_url ~ '^https?://'),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'under_review', 'verified', 'rejected', 'suspended')
  ),
  moderator_feedback text CHECK (moderator_feedback IS NULL OR char_length(moderator_feedback) <= 2000),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_verif_profile_created
  ON public.coach_verification_submissions(coach_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_verif_user_status
  ON public.coach_verification_submissions(user_id, status);

DROP TRIGGER IF EXISTS trg_coach_verif_set_updated_at ON public.coach_verification_submissions;
CREATE TRIGGER trg_coach_verif_set_updated_at
  BEFORE UPDATE ON public.coach_verification_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY & LEAST-PRIVILEGE GRANTS
-- -----------------------------------------------------------------------------
ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.coach_verification_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_verification_submissions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.coach_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.coach_verification_submissions FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.coach_profiles TO authenticated;
GRANT SELECT, INSERT ON public.coach_verification_submissions TO authenticated;
GRANT UPDATE (status, moderator_feedback, reviewed_by, reviewed_at, updated_at)
  ON public.coach_verification_submissions TO authenticated;

-- coach_profiles policies
DROP POLICY IF EXISTS "coach_profiles_select_own_or_moderator" ON public.coach_profiles;
CREATE POLICY "coach_profiles_select_own_or_moderator"
  ON public.coach_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_coach_moderator()
  );

DROP POLICY IF EXISTS "coach_profiles_insert_own" ON public.coach_profiles;
CREATE POLICY "coach_profiles_insert_own"
  ON public.coach_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND verification_status = 'unverified'
    AND verification_feedback IS NULL
    AND verified_at IS NULL
    AND verified_by IS NULL
    AND (
      tenant_id IS NULL
      OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach'])
    )
  );

DROP POLICY IF EXISTS "coach_profiles_update_own_or_moderator" ON public.coach_profiles;
CREATE POLICY "coach_profiles_update_own_or_moderator"
  ON public.coach_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_coach_moderator()
  )
  WITH CHECK (
    public.is_coach_moderator()
    OR (
      user_id = auth.uid()
      AND (
        tenant_id IS NULL
        OR public.has_tenant_role(tenant_id, ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach'])
      )
    )
  );

-- coach_verification_submissions policies
DROP POLICY IF EXISTS "coach_verif_select_own_or_moderator" ON public.coach_verification_submissions;
CREATE POLICY "coach_verif_select_own_or_moderator"
  ON public.coach_verification_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_coach_moderator()
  );

DROP POLICY IF EXISTS "coach_verif_insert_own" ON public.coach_verification_submissions;
CREATE POLICY "coach_verif_insert_own"
  ON public.coach_verification_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND moderator_feedback IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = coach_profile_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "coach_verif_update_moderator" ON public.coach_verification_submissions;
CREATE POLICY "coach_verif_update_moderator"
  ON public.coach_verification_submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_coach_moderator())
  WITH CHECK (public.is_coach_moderator());

-- -----------------------------------------------------------------------------
-- 5. SECURITY DEFINER RPCs FOR FOUNDATION WORKFLOWS
-- -----------------------------------------------------------------------------

-- 5.1 Initialize or retrieve the authenticated coach's profile cleanly
CREATE OR REPLACE FUNCTION public.ensure_coach_profile_for_user(
  p_tenant_id uuid DEFAULT NULL
)
RETURNS public.coach_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing public.coach_profiles%ROWTYPE;
  v_profile_name text;
  v_profile_city text := '';
  v_profile_sport text := '';
  v_base_slug text;
  v_slug text;
  v_tenant public.tenants%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to load or create coach profile.';
  END IF;

  IF p_tenant_id IS NOT NULL THEN
    IF NOT public.has_tenant_role(
      p_tenant_id,
      ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach']
    ) THEN
      RAISE EXCEPTION 'Forbidden: caller does not hold a coach-eligible membership on tenant %.', p_tenant_id;
    END IF;
  END IF;

  SELECT * INTO v_existing
  FROM public.coach_profiles
  WHERE user_id = v_user_id;

  IF FOUND THEN
    IF v_existing.tenant_id IS NULL AND p_tenant_id IS NOT NULL THEN
      SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
      IF FOUND AND v_tenant.tenant_type = 'coach' THEN
        UPDATE public.coach_profiles
        SET tenant_id = v_tenant.id,
            updated_at = now()
        WHERE id = v_existing.id
        RETURNING * INTO v_existing;
      END IF;
    END IF;
    RETURN v_existing;
  END IF;

  SELECT
    COALESCE(NULLIF(trim(p.display_name), ''), split_part(COALESCE(u.email, 'coach'), '@', 1), 'KhelGrid Coach'),
    COALESCE(NULLIF(trim(p.city), ''), '')
  INTO v_profile_name, v_profile_city
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = v_user_id;

  IF p_tenant_id IS NOT NULL THEN
    SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id;
    IF FOUND THEN
      IF COALESCE(trim(v_tenant.city), '') <> '' THEN
        v_profile_city := trim(v_tenant.city);
      END IF;
      v_profile_sport := COALESCE(v_tenant.sport, '');
      IF v_profile_name IS NULL OR char_length(trim(v_profile_name)) < 2 THEN
        v_profile_name := v_tenant.name;
      END IF;
    END IF;
  END IF;

  v_profile_name := COALESCE(NULLIF(trim(v_profile_name), ''), 'Coach Profile');
  v_base_slug := lower(regexp_replace(v_profile_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' FROM v_base_slug);
  IF v_base_slug = '' THEN
    v_base_slug := 'coach';
  END IF;
  v_slug := v_base_slug || '-' || substr(replace(v_user_id::text, '-', ''), 1, 6);

  INSERT INTO public.coach_profiles (
    user_id,
    tenant_id,
    slug,
    full_name,
    sports_specialization,
    city,
    state,
    verification_status
  ) VALUES (
    v_user_id,
    CASE WHEN v_tenant.id IS NOT NULL AND v_tenant.tenant_type = 'coach' THEN v_tenant.id ELSE NULL END,
    v_slug,
    v_profile_name,
    CASE WHEN v_profile_sport <> '' THEN ARRAY[v_profile_sport] ELSE '{}'::text[] END,
    v_profile_city,
    COALESCE(v_tenant.state, ''),
    'unverified'
  )
  RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_coach_profile_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_coach_profile_for_user(uuid) TO authenticated;

-- 5.2 Submit or resubmit verification proof cleanly (queues moderator review)
CREATE OR REPLACE FUNCTION public.submit_coach_verification_request(
  p_coach_profile_id uuid,
  p_document_type text,
  p_document_title text,
  p_supporting_details text,
  p_supporting_document_url text DEFAULT NULL
)
RETURNS public.coach_verification_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.coach_profiles%ROWTYPE;
  v_claim_type text;
  v_claim_id uuid;
  v_submission public.coach_verification_submissions%ROWTYPE;
  v_phone text := '0000000000';
  v_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_profile
  FROM public.coach_profiles
  WHERE id = p_coach_profile_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coach profile not found or access denied.';
  END IF;

  IF v_profile.verification_status = 'suspended' THEN
    RAISE EXCEPTION 'Verification resubmission is blocked while account verification is suspended.';
  END IF;

  IF v_profile.verification_status IN ('pending', 'under_review') THEN
    RAISE EXCEPTION 'A verification review is already in progress for this profile.';
  END IF;

  v_claim_type := CASE
    WHEN p_document_type IN ('coaching_license', 'affiliation_certificate') THEN p_document_type
    ELSE 'other'
  END;

  SELECT COALESCE(NULLIF(trim(p.phone), ''), '0000000000'), COALESCE(u.email, p.email)
  INTO v_phone, v_email
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = v_user_id;

  IF char_length(regexp_replace(COALESCE(v_phone, ''), '[^0-9]', '', 'g')) < 8 THEN
    v_phone := '9999999999';
  END IF;

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
    'coach',
    v_profile.slug,
    v_profile.full_name,
    v_profile.full_name,
    v_phone,
    v_email,
    'coach',
    v_claim_type,
    trim(p_document_title) || ' — ' || trim(p_supporting_details),
    'pending_review'
  )
  RETURNING id INTO v_claim_id;

  INSERT INTO public.coach_verification_submissions (
    coach_profile_id,
    user_id,
    tenant_id,
    verification_claim_id,
    document_type,
    document_title,
    supporting_details,
    supporting_document_url,
    status
  ) VALUES (
    v_profile.id,
    v_user_id,
    v_profile.tenant_id,
    v_claim_id,
    p_document_type,
    trim(p_document_title),
    trim(p_supporting_details),
    NULLIF(trim(COALESCE(p_supporting_document_url, '')), ''),
    'pending'
  )
  RETURNING * INTO v_submission;

  IF v_profile.verification_status IN ('unverified', 'rejected') THEN
    UPDATE public.coach_profiles
    SET verification_status = 'pending',
        updated_at = now()
    WHERE id = v_profile.id;
  END IF;

  IF v_profile.tenant_id IS NOT NULL AND to_regclass('public.saas_audit_logs') IS NOT NULL THEN
    INSERT INTO public.saas_audit_logs (
      tenant_id, actor_user_id, action, resource_type, resource_id, details
    ) VALUES (
      v_profile.tenant_id,
      v_user_id,
      'coach.verification.submitted',
      'coach_profile',
      v_profile.id::text,
      jsonb_build_object('submission_id', v_submission.id, 'document_type', p_document_type)
    );
  END IF;

  RETURN v_submission;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_coach_verification_request(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_coach_verification_request(uuid, text, text, text, text) TO authenticated;

-- 5.3 Moderator-only review RPC (updates submission, coach profile, audit & notification)
CREATE OR REPLACE FUNCTION public.moderate_coach_verification_submission(
  p_submission_id uuid,
  p_decision text,
  p_feedback text DEFAULT NULL
)
RETURNS public.coach_verification_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mod_id uuid := auth.uid();
  v_sub public.coach_verification_submissions%ROWTYPE;
BEGIN
  IF v_mod_id IS NULL OR NOT public.is_coach_moderator() THEN
    RAISE EXCEPTION 'Forbidden: only authorized moderators can review coach verification.';
  END IF;

  IF p_decision NOT IN ('under_review', 'verified', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid moderation decision: %', p_decision;
  END IF;

  IF p_decision IN ('rejected', 'suspended') AND char_length(trim(COALESCE(p_feedback, ''))) < 5 THEN
    RAISE EXCEPTION 'Moderator feedback (min 5 characters) is required when rejecting or suspending verification.';
  END IF;

  UPDATE public.coach_verification_submissions
  SET status = p_decision,
      moderator_feedback = NULLIF(trim(COALESCE(p_feedback, '')), ''),
      reviewed_by = v_mod_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_submission_id
  RETURNING * INTO v_sub;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification submission not found: %', p_submission_id;
  END IF;

  UPDATE public.coach_profiles
  SET verification_status = p_decision,
      verification_feedback = NULLIF(trim(COALESCE(p_feedback, '')), ''),
      verified_at = CASE WHEN p_decision = 'verified' THEN now() ELSE NULL END,
      verified_by = CASE WHEN p_decision = 'verified' THEN v_mod_id ELSE verified_by END,
      updated_at = now()
  WHERE id = v_sub.coach_profile_id;

  IF v_sub.verification_claim_id IS NOT NULL THEN
    UPDATE public.verification_claims
    SET status = CASE
      WHEN p_decision = 'verified' THEN 'verified'
      WHEN p_decision = 'rejected' THEN 'rejected'
      WHEN p_decision = 'suspended' THEN 'more_info_needed'
      ELSE 'pending_review'
    END,
    updated_at = now()
    WHERE id = v_sub.verification_claim_id;
  END IF;

  IF v_sub.tenant_id IS NOT NULL THEN
    UPDATE public.tenants
    SET verification_status = CASE
      WHEN p_decision = 'verified' THEN 'verified'
      WHEN p_decision = 'rejected' THEN 'rejected'
      WHEN p_decision = 'suspended' THEN 'unverified'
      ELSE 'pending_review'
    END,
    verified_at = CASE WHEN p_decision = 'verified' THEN now() ELSE verified_at END,
    verified_by = CASE WHEN p_decision = 'verified' THEN v_mod_id ELSE verified_by END,
    updated_at = now()
    WHERE id = v_sub.tenant_id;
  END IF;

  IF to_regclass('public.user_notifications') IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id, category, title, message, action_url, metadata
    ) VALUES (
      v_sub.user_id,
      'verification',
      'Coach Verification Status: ' || upper(replace(p_decision, '_', ' ')),
      COALESCE(NULLIF(trim(COALESCE(p_feedback, '')), ''), 'Your coach credentials review status has been updated.'),
      '/coach-dashboard/profile',
      jsonb_build_object('submission_id', v_sub.id, 'decision', p_decision)
    );
  END IF;

  RETURN v_sub;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_coach_verification_submission(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_coach_verification_submission(uuid, text, text) TO authenticated;

-- 5.4 Server-computed Overview Statistics & Authorized Recent Activity RPC
CREATE OR REPLACE FUNCTION public.get_coach_dashboard_overview(
  p_tenant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total_athletes integer := 0;
  v_active_athletes integer := 0;
  v_pending_requests integer := 0;
  v_active_programmes integer := 0;
  v_upcoming_sessions integer := 0;
  v_completed_sessions integer := 0;
  v_pending_assessments integer := 0;
  v_attendance_rate numeric := NULL;
  v_attendance_total integer := 0;
  v_academy_associations integer := 0;
  v_unread_notifications integer := 0;
  v_recent_requests jsonb := '[]'::jsonb;
  v_recent_batches jsonb := '[]'::jsonb;
  v_recent_notifications jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view coach overview.';
  END IF;

  IF p_tenant_id IS NOT NULL THEN
    IF NOT public.is_tenant_member(p_tenant_id)
       OR NOT public.has_tenant_role(
         p_tenant_id,
         ARRAY['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach']
       ) THEN
      RAISE EXCEPTION 'Forbidden: caller lacks coach-eligible active membership on tenant %.', p_tenant_id;
    END IF;

    SELECT count(*)::int, count(*) FILTER (WHERE is_active = true)::int
    INTO v_total_athletes, v_active_athletes
    FROM public.tenant_students
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL;

    SELECT count(*)::int
    INTO v_pending_requests
    FROM public.tenant_enquiries
    WHERE tenant_id = p_tenant_id
      AND status IN ('new', 'contacted', 'trial_scheduled');

    SELECT count(*)::int
    INTO v_active_programmes
    FROM public.tenant_batches
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND is_active = true;

    SELECT
      count(DISTINCT (batch_id::text || ':' || session_date::text))::int,
      count(*)::int,
      ROUND(100.0 * count(*) FILTER (WHERE status = 'present') / NULLIF(count(*), 0), 1)
    INTO v_completed_sessions, v_attendance_total, v_attendance_rate
    FROM public.tenant_attendance_events
    WHERE tenant_id = p_tenant_id
      AND session_date >= (CURRENT_DATE - INTERVAL '30 days');

    SELECT COALESCE(jsonb_agg(row_to_json(req)), '[]'::jsonb)
    INTO v_recent_requests
    FROM (
      SELECT id, enquiry_token, student_name, parent_name, sport, request_type, status, submitted_at
      FROM public.tenant_enquiries
      WHERE tenant_id = p_tenant_id
        AND status IN ('new', 'contacted', 'trial_scheduled')
      ORDER BY submitted_at DESC
      LIMIT 5
    ) req;

    SELECT COALESCE(jsonb_agg(row_to_json(bat)), '[]'::jsonb)
    INTO v_recent_batches
    FROM (
      SELECT id, batch_name, sport, days, timings, age_group, max_capacity
      FROM public.tenant_batches
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 5
    ) bat;
  END IF;

  -- Academy / institutional coaching associations for the signed-in coach user
  SELECT count(*)::int
  INTO v_academy_associations
  FROM public.tenant_memberships m
  JOIN public.tenants t ON t.id = m.tenant_id
  WHERE m.user_id = v_user_id
    AND m.status = 'active'
    AND m.deleted_at IS NULL
    AND t.status = 'active'
    AND t.deleted_at IS NULL
    AND t.tenant_type IN ('academy', 'club', 'school', 'college', 'university', 'training_org')
    AND m.role IN ('owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach');

  IF to_regclass('public.user_notifications') IS NOT NULL THEN
    SELECT count(*)::int
    INTO v_unread_notifications
    FROM public.user_notifications
    WHERE user_id = v_user_id
      AND is_read = false;

    SELECT COALESCE(jsonb_agg(row_to_json(notif)), '[]'::jsonb)
    INTO v_recent_notifications
    FROM (
      SELECT id, category, title, message, action_url, is_read, created_at
      FROM public.user_notifications
      WHERE user_id = v_user_id
      ORDER BY created_at DESC
      LIMIT 5
    ) notif;
  END IF;

  RETURN jsonb_build_object(
    'stats', jsonb_build_object(
      'totalAthletes', v_total_athletes,
      'activeAthletes', v_active_athletes,
      'pendingAthleteRequests', v_pending_requests,
      'activeProgrammes', v_active_programmes,
      'upcomingSessions', v_upcoming_sessions,
      'completedSessions', v_completed_sessions,
      'pendingAssessments', v_pending_assessments,
      'attendanceRatePct', v_attendance_rate,
      'attendanceEventsCount', v_attendance_total,
      'academyAssociations', v_academy_associations,
      'unreadNotifications', v_unread_notifications
    ),
    'recentRequests', v_recent_requests,
    'recentBatches', v_recent_batches,
    'recentNotifications', v_recent_notifications
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_coach_dashboard_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coach_dashboard_overview(uuid) TO authenticated;

COMMIT;
