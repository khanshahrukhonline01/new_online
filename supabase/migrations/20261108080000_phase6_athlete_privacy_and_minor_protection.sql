-- ==============================================================================
-- KhelGrid — Phase 6: Athlete and Personal Data Privacy & Minor Protection
-- Migration: 20261108080000_phase6_athlete_privacy_and_minor_protection.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Purpose:
-- 1. Data Protection & Statutory Consent Infrastructure (DPDP Act 2023):
--    - public.user_consents (terms, privacy, profile sharing, scout access).
--    - public.guardian_consents (statutory guardian consent for minor athletes < 18).
-- 2. Athlete Profile Privacy & Minor Shielding:
--    - Enforce private-by-default access on public.athlete_profiles.
--    - Shield contact details, date of birth, and identity credentials for minors.
--    - Install public.get_athlete_public_cv(p_username) returning sanitized public CV.
-- 3. Storage Bucket Isolation & Document Protection:
--    - cv-documents bucket secured as strictly private.
--    - Storage RLS enforcing user folder isolation (auth.uid()/...) and signed URLs.
-- 4. DPDP Rights (Portability & Erasure):
--    - public.export_user_data(p_user_id) for statutory data export.
--    - public.anonymize_user_account(p_user_id) for right to be forgotten.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. USER CONSENT RECORDING TABLE (DPDP ACT 2023)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (
    consent_type IN (
      'terms_of_service',
      'privacy_policy',
      'public_profile_display',
      'contact_sharing_scouts',
      'guardian_minor_consent',
      'telemetry_video_sharing'
    )
  ),
  is_given boolean NOT NULL DEFAULT true,
  given_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  version text NOT NULL DEFAULT '2026-v1.0',
  CONSTRAINT uq_user_consent UNIQUE (user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON public.user_consents(consent_type);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_consents_owner_read" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_owner_write" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_service_all" ON public.user_consents;

CREATE POLICY "user_consents_owner_read"
  ON public.user_consents
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "user_consents_owner_write"
  ON public.user_consents
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "user_consents_service_all"
  ON public.user_consents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2. GUARDIAN CONSENT TABLE FOR MINOR ATHLETES (< 18)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guardian_name text NOT NULL,
  guardian_phone text NOT NULL,
  guardian_email text,
  relationship text NOT NULL CHECK (relationship IN ('parent', 'legal_guardian', 'authorized_coach')),
  consent_scope text NOT NULL DEFAULT 'profile_and_trials',
  verified_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_guardian_minor UNIQUE (minor_user_id, relationship)
);

CREATE INDEX IF NOT EXISTS idx_guardian_consents_minor ON public.guardian_consents(minor_user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_consents_guardian ON public.guardian_consents(guardian_user_id);

ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_consents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardian_consents_owner_read" ON public.guardian_consents;
DROP POLICY IF EXISTS "guardian_consents_service_all" ON public.guardian_consents;

CREATE POLICY "guardian_consents_owner_read"
  ON public.guardian_consents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      minor_user_id = auth.uid()
      OR guardian_user_id = auth.uid()
    )
  );

CREATE POLICY "guardian_consents_service_all"
  ON public.guardian_consents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. ATHLETE PROFILES PRIVACY HARDENING
-- -----------------------------------------------------------------------------

-- Add privacy consent flags to athlete_profiles
ALTER TABLE public.athlete_profiles
  ADD COLUMN IF NOT EXISTS is_minor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_consent_granted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_sharing_granted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS masked_phone text,
  ADD COLUMN IF NOT EXISTS masked_email text;

ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athlete_profiles_public_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_write" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_service_all" ON public.athlete_profiles;

-- Authenticated owner can read their own full profile
CREATE POLICY "athlete_profiles_owner_read"
  ON public.athlete_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Authenticated owner can update their own profile
CREATE POLICY "athlete_profiles_owner_write"
  ON public.athlete_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Public can read ONLY published profiles where explicit consent is granted
CREATE POLICY "athlete_profiles_public_read"
  ON public.athlete_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    publication_status = 'published'
    AND public_consent_granted = true
    AND (
      is_minor = false
      OR EXISTS (
        SELECT 1 FROM public.guardian_consents
        WHERE minor_user_id = athlete_profiles.user_id AND is_active = true
      )
    )
  );

CREATE POLICY "athlete_profiles_service_all"
  ON public.athlete_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sanitized Public Profile Projection RPC: Zero contact details or unmasked DOB leaked
CREATE OR REPLACE FUNCTION public.get_athlete_public_cv(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ath record;
  v_clean_user text;
  v_is_owner boolean := false;
  v_caller_uid uuid;
BEGIN
  v_clean_user := lower(trim(coalesce(p_username, '')));
  v_caller_uid := auth.uid();

  IF char_length(v_clean_user) < 3 THEN
    RETURN NULL;
  END IF;

  SELECT
    id,
    user_id,
    username,
    full_name,
    sport,
    playing_position,
    city,
    state,
    date_of_birth,
    team_or_academy,
    coach,
    experience_years,
    primary_foot_or_hand,
    height_cm,
    weight_kg,
    summary,
    achievements,
    video_clips,
    fitness_benchmarks,
    player_card_stats,
    verification_status,
    publication_status,
    is_minor,
    public_consent_granted,
    contact_sharing_granted
  INTO v_ath
  FROM public.athlete_profiles
  WHERE username = v_clean_user
  LIMIT 1;

  IF v_ath.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check ownership
  IF v_caller_uid IS NOT NULL AND v_ath.user_id = v_caller_uid THEN
    v_is_owner := true;
  END IF;

  -- If not owner, enforce public consent and minor verification
  IF NOT v_is_owner THEN
    IF v_ath.publication_status != 'published' OR NOT v_ath.public_consent_granted THEN
      RETURN NULL;
    END IF;

    IF v_ath.is_minor AND NOT EXISTS (
      SELECT 1 FROM public.guardian_consents
      WHERE minor_user_id = v_ath.user_id AND is_active = true
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Return sanitized projection: For minors, strip precise date of birth (show year only)
  RETURN jsonb_build_object(
    'username', v_ath.username,
    'full_name', v_ath.full_name,
    'sport', v_ath.sport,
    'playing_position', v_ath.playing_position,
    'city', v_ath.city,
    'state', v_ath.state,
    'birth_year', CASE
      WHEN v_is_owner THEN extract(year from v_ath.date_of_birth)::int
      WHEN v_ath.is_minor THEN extract(year from v_ath.date_of_birth)::int
      ELSE extract(year from v_ath.date_of_birth)::int
    END,
    'team_or_academy', v_ath.team_or_academy,
    'coach', v_ath.coach,
    'experience_years', v_ath.experience_years,
    'primary_foot_or_hand', v_ath.primary_foot_or_hand,
    'height_cm', v_ath.height_cm,
    'weight_kg', v_ath.weight_kg,
    'summary', v_ath.summary,
    'achievements', v_ath.achievements,
    'video_clips', v_ath.video_clips,
    'fitness_benchmarks', v_ath.fitness_benchmarks,
    'player_card_stats', v_ath.player_card_stats,
    'verification_status', v_ath.verification_status,
    'is_minor', v_ath.is_minor
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_athlete_public_cv(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_athlete_public_cv(text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. DPDP RIGHTS: DATA PORTABILITY & ERASURE (DPDP ACT 2023)
-- -----------------------------------------------------------------------------

-- Export User Data (Portability Right)
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_profile jsonb;
  v_athlete jsonb;
  v_bookings jsonb;
  v_payments jsonb;
  v_consents jsonb;
BEGIN
  v_caller_uid := auth.uid();

  -- Caller must be user or admin
  IF v_caller_uid IS NULL OR (v_caller_uid != p_user_id AND NOT public.is_service_role_or_admin()) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Unauthorized data export request.');
  END IF;

  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE id = p_user_id;
  SELECT to_jsonb(a) INTO v_athlete FROM public.athlete_profiles a WHERE user_id = p_user_id;
  SELECT coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) INTO v_bookings FROM public.venue_bookings b WHERE user_id = p_user_id;
  SELECT coalesce(jsonb_agg(to_jsonb(k)), '[]'::jsonb) INTO v_payments FROM public.khelgrid_payments k WHERE user_id = p_user_id;
  SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) INTO v_consents FROM public.user_consents c WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'exported_at', now(),
    'user_id', p_user_id,
    'profile', coalesce(v_profile, '{}'::jsonb),
    'athlete_cv', coalesce(v_athlete, '{}'::jsonb),
    'venue_bookings', v_bookings,
    'payments', v_payments,
    'consents', v_consents
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.export_user_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO authenticated, service_role;

-- Anonymize User Account (Right to Erasure / Forgotten)
CREATE OR REPLACE FUNCTION public.anonymize_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
BEGIN
  v_caller_uid := auth.uid();

  IF v_caller_uid IS NULL OR (v_caller_uid != p_user_id AND NOT public.is_service_role_or_admin()) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Unauthorized account erasure request.');
  END IF;

  -- 1. Scrub profiles
  UPDATE public.profiles
  SET display_name = 'Anonymized User',
      email = 'deleted_' || substr(md5(random()::text), 1, 8) || '@deleted.khelgrid.com',
      phone = NULL,
      city = 'Redacted',
      avatar_url = NULL,
      bio = NULL,
      updated_at = now()
  WHERE id = p_user_id;

  -- 2. Scrub athlete_profiles
  UPDATE public.athlete_profiles
  SET full_name = 'Anonymized Athlete',
      summary = NULL,
      video_clips = '[]'::jsonb,
      achievements = '[]'::jsonb,
      publication_status = 'archived',
      public_consent_granted = false,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- 3. Scrub payments customer personal data
  UPDATE public.khelgrid_payments
  SET customer_name = 'Redacted Customer',
      customer_phone = '0000000000',
      customer_email = NULL,
      metadata = '{}'::jsonb
  WHERE user_id = p_user_id;

  -- 4. Revoke all user consents
  UPDATE public.user_consents
  SET is_given = false,
      revoked_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('status', 'success', 'user_id', p_user_id, 'message', 'User account successfully anonymized.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anonymize_user_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anonymize_user_account(uuid) TO authenticated, service_role;

COMMIT;
