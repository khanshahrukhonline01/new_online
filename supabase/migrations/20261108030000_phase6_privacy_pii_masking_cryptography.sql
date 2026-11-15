-- ==============================================================================
-- KhelGrid — Phase 6: Data Privacy, PII Masking & Cryptographic Protections
-- Migration: 20261108030000_phase6_privacy_pii_masking_cryptography.sql
--
-- Purpose:
-- 1. Create SQL PII masking functions:
--    - public.mask_phone(text): e.g. +91 98*** **210
--    - public.mask_email(text): e.g. a***e@domain.com
-- 2. Pgcrypto-backed column encryption helpers for sensitive banking credentials:
--    - public.encrypt_secret_data(text, text)
--    - public.decrypt_secret_data(bytea, text)
--    - Update public.host_payout_accounts with encrypted_account_number & account_number_last4
-- 3. Digital Personal Data Protection (DPDP Act 2023) Compliance:
--    - public.user_consents table with auditable consent lifecycle
--    - public.export_user_data(uuid): Right to Data Portability (JSON export)
--    - public.anonymize_user_account(uuid): Right to Erasure / Right to be Forgotten
-- 4. Enable strict Row Level Security (RLS) on all privacy and consent tables.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS & MASKING FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1.1 Phone Number Masking (e.g. +919876543210 -> +91 98*** **210)
CREATE OR REPLACE FUNCTION public.mask_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR char_length(trim(p_phone)) < 6 THEN '***'
    WHEN char_length(regexp_replace(p_phone, '[^0-9]', '', 'g')) >= 10 THEN
      substring(trim(p_phone) from 1 for 4) || '***' || substring(trim(p_phone) from char_length(trim(p_phone)) - 2 for 3)
    ELSE '***-***'
  END;
$$;

-- 1.2 Email Address Masking (e.g. athlete@khelgrid.com -> a***e@khelgrid.com)
CREATE OR REPLACE FUNCTION public.mask_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_email IS NULL OR p_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN '***@***.***'
    WHEN char_length(split_part(p_email, '@', 1)) <= 2 THEN
      substring(split_part(p_email, '@', 1) from 1 for 1) || '***@' || split_part(p_email, '@', 2)
    ELSE
      substring(split_part(p_email, '@', 1) from 1 for 1) || '***' ||
      substring(split_part(p_email, '@', 1) from char_length(split_part(p_email, '@', 1)) for 1) ||
      '@' || split_part(p_email, '@', 2)
  END;
$$;

-- -----------------------------------------------------------------------------
-- 2. PGCRYPTO COLUMN ENCRYPTION HELPERS
-- -----------------------------------------------------------------------------

-- Encrypt sensitive string data
CREATE OR REPLACE FUNCTION public.encrypt_secret_data(
  p_plaintext text,
  p_secret_key text
)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pgp_sym_encrypt(p_plaintext, p_secret_key);
$$;

-- Decrypt sensitive string data
CREATE OR REPLACE FUNCTION public.decrypt_secret_data(
  p_ciphertext bytea,
  p_secret_key text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pgp_sym_decrypt(p_ciphertext, p_secret_key);
$$;

-- Revoke direct execution of decryption from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.encrypt_secret_data(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encrypt_secret_data(text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.decrypt_secret_data(bytea, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_secret_data(bytea, text) TO service_role;

-- 2.1 Update host_payout_accounts with encrypted account columns idempotently
ALTER TABLE public.host_payout_accounts
  ADD COLUMN IF NOT EXISTS encrypted_account_number bytea,
  ADD COLUMN IF NOT EXISTS account_number_last4 text;

-- -----------------------------------------------------------------------------
-- 3. DPDP ACT 2023 USER CONSENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (
    consent_type IN (
      'terms_of_service',
      'privacy_policy',
      'scouting_profiling',
      'minor_guardian_consent',
      'marketing_communications',
      'sports_pass'
    )
  ),
  status text NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'withdrawn')),
  version text NOT NULL DEFAULT 'v1.0',
  ip_hash text,
  user_agent_hash text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON public.user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON public.user_consents(consent_type, status);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents FORCE ROW LEVEL SECURITY;

-- Consents RLS: Users can view and manage only their own consents
DROP POLICY IF EXISTS "user_consents_owner_read" ON public.user_consents;
CREATE POLICY "user_consents_owner_read"
  ON public.user_consents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_consents_owner_insert" ON public.user_consents;
CREATE POLICY "user_consents_owner_insert"
  ON public.user_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_consents_owner_update" ON public.user_consents;
CREATE POLICY "user_consents_owner_update"
  ON public.user_consents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. DPDP ACT 2023: RIGHT TO DATA PORTABILITY (EXPORT)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_is_authorized boolean;
  v_profile jsonb;
  v_bookmarks jsonb;
  v_bookings jsonb;
  v_inquiries jsonb;
  v_applications jsonb;
  v_enquiries jsonb;
  v_consents jsonb;
BEGIN
  -- 1. Authorization: Only the user themselves or an administrator can export their dossier
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  v_is_authorized := (auth.uid() = p_user_id)
    OR (v_caller_role = 'service_role')
    OR public.is_admin();

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: You can only export data for your own account.';
  END IF;

  -- 2. Extract Profile
  SELECT to_jsonb(p) INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id;

  -- 3. Extract Bookmarks
  SELECT coalesce(jsonb_agg(b), '[]'::jsonb) INTO v_bookmarks
  FROM public.user_bookmarks b
  WHERE b.user_id = p_user_id;

  -- 4. Extract Venue Bookings
  SELECT coalesce(jsonb_agg(vb), '[]'::jsonb) INTO v_bookings
  FROM public.venue_slot_bookings vb
  WHERE vb.booked_by_user_id = p_user_id;

  -- 5. Extract Coach Inquiries
  SELECT coalesce(jsonb_agg(ci), '[]'::jsonb) INTO v_inquiries
  FROM public.coach_inquiries ci
  WHERE ci.user_id = p_user_id;

  -- 6. Extract Trial Applications
  SELECT coalesce(jsonb_agg(ta), '[]'::jsonb) INTO v_applications
  FROM public.trial_applications ta
  WHERE ta.user_id = p_user_id;

  -- 7. Extract Academy Enquiries
  SELECT coalesce(jsonb_agg(ae), '[]'::jsonb) INTO v_enquiries
  FROM public.academy_enquiries ae
  WHERE ae.user_id = p_user_id;

  -- 8. Extract Consents
  SELECT coalesce(jsonb_agg(c), '[]'::jsonb) INTO v_consents
  FROM public.user_consents c
  WHERE c.user_id = p_user_id;

  RETURN jsonb_build_object(
    'exported_at', now(),
    'compliance_standard', 'DPDP Act 2023 (Section 12: Right to Data Portability)',
    'user_id', p_user_id,
    'profile', coalesce(v_profile, '{}'::jsonb),
    'bookmarks', v_bookmarks,
    'venue_bookings', v_bookings,
    'coach_inquiries', v_inquiries,
    'trial_applications', v_applications,
    'academy_enquiries', v_enquiries,
    'consents', v_consents
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. DPDP ACT 2023: RIGHT TO ERASURE / RIGHT TO BE FORGOTTEN
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anonymize_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_is_authorized boolean;
  v_anonymized_alias text;
BEGIN
  -- 1. Authorization: Only the user themselves or an administrator can invoke erasure
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  v_is_authorized := (auth.uid() = p_user_id)
    OR (v_caller_role = 'service_role')
    OR public.is_admin();

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: You can only request data erasure for your own account.';
  END IF;

  v_anonymized_alias := 'Deleted Athlete ' || substr(md5(random()::text), 1, 6);

  -- 2. Anonymize Profile Data in public.profiles
  UPDATE public.profiles
  SET
    display_name = v_anonymized_alias,
    email = 'erased_' || substr(md5(random()::text), 1, 8) || '@khelgrid.erased',
    phone = NULL,
    avatar_url = NULL,
    bio = NULL,
    city = 'Confidential',
    is_verified = false,
    updated_at = now()
  WHERE id = p_user_id;

  -- 3. Delete Non-Financial User Data
  DELETE FROM public.user_bookmarks WHERE user_id = p_user_id;

  -- 4. Anonymize Application & Enquiry Dossiers
  UPDATE public.trial_applications
  SET
    athlete_name = v_anonymized_alias,
    athlete_phone = '0000000000',
    athlete_email = NULL,
    statement = 'Dossier personal details erased upon athlete request under DPDP Act 2023.',
    summary = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.academy_enquiries
  SET
    athlete_name = v_anonymized_alias,
    athlete_phone = '0000000000',
    athlete_email = NULL,
    statement = 'Admission inquiry personal details erased upon athlete request under DPDP Act 2023.',
    updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.coach_inquiries
  SET
    athlete_name = v_anonymized_alias,
    parent_name = NULL,
    phone = '0000000000',
    email = NULL,
    objective = 'Contact details erased upon request.',
    updated_at = now()
  WHERE user_id = p_user_id;

  -- 5. Anonymize Booking Records (Preserving slot uniqueness and financial integrity)
  UPDATE public.venue_slot_bookings
  SET
    customer_name = 'Anonymized Player',
    customer_phone = '0000000000',
    customer_email = NULL,
    notes = 'Customer PII redacted for privacy compliance.'
  WHERE booked_by_user_id = p_user_id;

  -- 6. Mark All Consents as Withdrawn
  UPDATE public.user_consents
  SET status = 'withdrawn', withdrawn_at = now(), updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'erased_at', now(),
    'compliance_standard', 'DPDP Act 2023 (Section 12: Right to Erasure / Right to be Forgotten)',
    'user_id', p_user_id,
    'message', 'User personal data, dossiers, and contact identifiers successfully redacted.'
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. LEAST-PRIVILEGE GRANTS ON DPDP FUNCTIONS
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.export_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.anonymize_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymize_user_account(uuid) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated, service_role;

COMMIT;
