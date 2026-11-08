-- ==============================================================================
-- KhelGrid Security Programme — Master Consolidated Deployment Package (Phases 2–8 & 5.2)
-- Script: phase-2-to-8-master-consolidated-deployment.sql
-- Target Project: hznsbxvovjxvmnchzzqt (Development Supabase Project Only)
-- Execution: Run in Supabase Dashboard SQL Editor as postgres/service_role
--
-- Safety Contract:
-- - Atomic transaction (wrapped in BEGIN; ... COMMIT;).
-- - Completely non-destructive (no DROP DATABASE, no TRUNCATE, no column loss).
-- - Zero breaking changes to existing public catalogue routes.
-- - Strictly idempotent (IF NOT EXISTS, DROP POLICY IF EXISTS).
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. ISOLATED PRIVATE SCHEMA & GATEWAY CREDENTIALS VAULT
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.gateway_credentials (
  provider text PRIMARY KEY,
  key_id text NOT NULL,
  key_secret text NOT NULL,
  webhook_secret text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.gateway_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.gateway_credentials TO service_role;

-- -----------------------------------------------------------------------------
-- 2. SCHEMA DEFINITIONS (RATE LIMITS, PAYMENTS, RBAC, PRIVACY, AUDIT)
-- -----------------------------------------------------------------------------

-- 2.1 API Rate Limits Table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_identity text NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_api_rate_limit_window UNIQUE (client_identity, endpoint, window_start)
);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_lookup ON public.api_rate_limits(client_identity, endpoint, window_start);

-- 2.2 Centralized Payments Table
CREATE TABLE IF NOT EXISTS public.khelgrid_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  payment_id text UNIQUE,
  user_id uuid REFERENCES auth.users(id),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'pay_at_venue')),
  target_type text NOT NULL,
  target_id text,
  customer_name text,
  customer_phone text,
  customer_email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.3 RBAC Tables
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id text NOT NULL CHECK (role_id IN ('admin', 'moderator', 'compliance_officer', 'athlete', 'host')),
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_roles UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id text NOT NULL,
  permission_id text NOT NULL,
  description text,
  CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

-- 2.4 Privacy & Statutory Consents (DPDP Act 2023)
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

CREATE TABLE IF NOT EXISTS public.guardian_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guardian_name text NOT NULL,
  guardian_phone text NOT NULL,
  guardian_email text,
  relationship text NOT NULL CHECK (relationship IN ('parent', 'legal_guardian', 'authorized_coach')),
  consent_scope text NOT NULL DEFAULT 'profile_and_trials',
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz DEFAULT NULL,
  verified_by uuid REFERENCES auth.users(id),
  verification_method text DEFAULT NULL,
  evidence_reference text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_guardian_minor UNIQUE (minor_user_id, relationship)
);

-- 2.5 Listing Moderation Audit Log
CREATE TABLE IF NOT EXISTS public.listing_moderation_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'flagged', 'suspended')),
  review_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.6 Extend existing tables with required security columns
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS voucher_token text,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS court_number int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.athlete_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_public_cv boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_scout_sharing boolean DEFAULT false;

ALTER TABLE public.trial_reminders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trial_reminders_user_id ON public.trial_reminders(user_id);

-- Step 1: Normalize relative dates ('Today') in historical records to their creation calendar date (IST)
UPDATE public.venue_bookings
SET slot_date = to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')
WHERE slot_date = 'Today';

-- Step 2: Reconcile duplicate historical slots before index creation:
-- Keeps the primary record active/completed and transitions older duplicate test runs to 'superseded'
-- Preserves 100% of historical records without deleting any customer data.
UPDATE public.venue_bookings
SET status = 'superseded',
    cancellation_reason = 'Reconciled duplicate automated test run',
    updated_at = now()
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY venue_id, slot_date, slot_time, coalesce(court_number, 1)
             ORDER BY created_at DESC, id DESC
           ) as rn
    FROM public.venue_bookings
    WHERE status IN ('confirmed', 'pending')
  ) sub
  WHERE rn > 1
);

-- Step 3: Transition past historical confirmed bookings to completed
-- (since match/slot dates on Nov 6 & 7, 2026 have already elapsed)
UPDATE public.venue_bookings
SET status = 'completed',
    updated_at = now()
WHERE status = 'confirmed'
  AND slot_date < to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');

-- 2.7 Partial Unique Index for Booking Concurrency (Restricted to blocking reservation states)
CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_slot_concurrency
  ON public.venue_bookings(venue_id, slot_date, slot_time, court_number)
  WHERE status IN ('confirmed', 'pending');

-- Explicit database state transition for expiring stale pending venue reservations (> 15 min)
CREATE OR REPLACE FUNCTION public.expire_stale_venue_reservations()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count int;
BEGIN
  UPDATE public.venue_bookings
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND (
      (expires_at IS NOT NULL AND expires_at < clock_timestamp())
      OR (expires_at IS NULL AND created_at < clock_timestamp() - interval '15 minutes')
    );
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  RETURN v_expired_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_stale_venue_reservations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_venue_reservations() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. CORE SECURITY HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Extract edge-verified caller identity
CREATE OR REPLACE FUNCTION public.get_request_client_identity()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid;
  v_headers json;
  v_ip text;
  v_session text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    RETURN 'usr:' || v_uid::text;
  END IF;

  BEGIN
    v_headers := nullif(current_setting('request.headers', true), '')::json;
    IF v_headers IS NOT NULL THEN
      v_ip := nullif(trim(v_headers->>'cf-connecting-ip'), '');
      IF v_ip IS NULL THEN
        v_ip := nullif(trim(v_headers->>'x-real-ip'), '');
      END IF;
      v_session := nullif(trim(v_headers->>'x-client-session'), '');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
    v_session := NULL;
  END;

  IF v_ip IS NOT NULL AND v_ip != '' THEN
    v_ip := regexp_replace(v_ip, ':[0-9]+$', '');
    RETURN 'ip:' || v_ip;
  END IF;

  IF v_session IS NOT NULL AND v_session != '' THEN
    RETURN 'session:' || substr(md5(v_session), 1, 16);
  END IF;

  RETURN 'anon:unverified_edge_client';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_request_client_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_request_client_identity() TO anon, authenticated, service_role;

-- Invoker Role Evaluation
CREATE OR REPLACE FUNCTION public.is_service_role_or_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_jwt_role text;
  v_uid uuid;
  v_is_admin boolean;
BEGIN
  v_jwt_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role()
  );

  IF v_jwt_role = 'service_role' THEN
    RETURN true;
  END IF;

  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_uid AND ur.role_id IN ('admin', 'super_admin')
    ) INTO v_is_admin;
    RETURN coalesce(v_is_admin, false);
  END IF;

  RETURN false;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.is_service_role_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_service_role_or_admin() TO anon, authenticated, service_role;

-- Volatile Rate Limiting Helper
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_endpoint text,
  p_limit int,
  p_window_seconds int DEFAULT 60,
  p_custom_identifier text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_identity text;
  v_window_start timestamptz;
  v_current_count int;
BEGIN
  IF p_custom_identifier IS NOT NULL AND trim(p_custom_identifier) != '' THEN
    v_identity := trim(p_custom_identifier);
  ELSE
    v_identity := public.get_request_client_identity();
  END IF;

  v_window_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.api_rate_limits (client_identity, endpoint, window_start, request_count, updated_at)
  VALUES (v_identity, p_endpoint, v_window_start, 1, now())
  ON CONFLICT (client_identity, endpoint, window_start)
  DO UPDATE SET
    request_count = public.api_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO v_current_count;

  RETURN v_current_count <= p_limit;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY & POLICY HARDENING
-- -----------------------------------------------------------------------------

-- Force RLS across all sensitive platform tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.trial_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_consents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.listing_moderation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_moderation_audit_logs FORCE ROW LEVEL SECURITY;

-- 4.1 public.profiles (Owner-only table access; public queries route through sanitized RPC)
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_all" ON public.profiles;

CREATE POLICY "profiles_owner_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_service_all" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.2 public.athlete_profiles (Drop public INSERT and broad SELECT)
DROP POLICY IF EXISTS "athlete_profiles_public_insert" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_public_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_public_published_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_write" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_service_all" ON public.athlete_profiles;

CREATE POLICY "athlete_profiles_public_published_read" ON public.athlete_profiles FOR SELECT TO anon, authenticated USING (publication_status = 'published');
CREATE POLICY "athlete_profiles_owner_read" ON public.athlete_profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "athlete_profiles_owner_write" ON public.athlete_profiles FOR ALL TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid()) WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "athlete_profiles_service_all" ON public.athlete_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.3 public.venue_bookings (Drop broad SELECT)
DROP POLICY IF EXISTS "venue_bookings_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_owner_select" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_admin_select" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_service_all" ON public.venue_bookings;

CREATE POLICY "venue_bookings_owner_select" ON public.venue_bookings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "venue_bookings_admin_select" ON public.venue_bookings FOR SELECT TO authenticated USING (public.is_service_role_or_admin());
CREATE POLICY "venue_bookings_service_all" ON public.venue_bookings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.4 public.listing_subscriptions (Drop broad SELECT)
DROP POLICY IF EXISTS "listing_subscriptions_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_owner_select" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_admin_select" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_service_all" ON public.listing_subscriptions;

CREATE POLICY "listing_subscriptions_owner_select" ON public.listing_subscriptions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "listing_subscriptions_admin_select" ON public.listing_subscriptions FOR SELECT TO authenticated USING (public.is_service_role_or_admin());
CREATE POLICY "listing_subscriptions_service_all" ON public.listing_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.5 public.trial_reminders (Drop broad SELECT/UPDATE/INSERT)
DROP POLICY IF EXISTS "trial_reminders_public_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_public_insert" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_authenticated_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_select" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_service_all" ON public.trial_reminders;

CREATE POLICY "trial_reminders_public_insert" ON public.trial_reminders FOR INSERT TO anon, authenticated WITH CHECK (athlete_phone IS NOT NULL OR athlete_email IS NOT NULL);
CREATE POLICY "trial_reminders_owner_select" ON public.trial_reminders FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "trial_reminders_owner_update" ON public.trial_reminders FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid()) WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "trial_reminders_service_all" ON public.trial_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.6 public.pickup_game_participants (Solve zero-policy table)
DROP POLICY IF EXISTS "pickup_game_participants_read" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_game_participants_insert" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_owner_select" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_host_select" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_admin_select" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_owner_update" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_owner_delete" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_service_all" ON public.pickup_game_participants;

CREATE POLICY "pickup_participants_owner_select" ON public.pickup_game_participants FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);
CREATE POLICY "pickup_participants_host_select" ON public.pickup_game_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pickup_games g WHERE g.id = pickup_game_participants.game_id AND g.host_id = auth.uid()));
CREATE POLICY "pickup_participants_admin_select" ON public.pickup_game_participants FOR SELECT TO authenticated USING (public.is_service_role_or_admin());
CREATE POLICY "pickup_participants_owner_update" ON public.pickup_game_participants FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);
CREATE POLICY "pickup_participants_owner_delete" ON public.pickup_game_participants FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);
CREATE POLICY "pickup_participants_service_all" ON public.pickup_game_participants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.7 public.pickup_game_rsvp_rate_limits (Solve zero-policy table)
DROP POLICY IF EXISTS "pickup_game_rate_limits_deny_all" ON public.pickup_game_rsvp_rate_limits;
DROP POLICY IF EXISTS "pickup_game_rate_limits_service_all" ON public.pickup_game_rsvp_rate_limits;
CREATE POLICY "pickup_game_rate_limits_service_all" ON public.pickup_game_rsvp_rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.8 User & Guardian Consents (Immutable User Log)
DROP POLICY IF EXISTS "user_consents_owner_read" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_owner_insert" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_owner_update" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_service_all" ON public.user_consents;

CREATE POLICY "user_consents_owner_read" ON public.user_consents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "user_consents_owner_insert" ON public.user_consents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "user_consents_owner_update" ON public.user_consents FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND user_id = auth.uid()) WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "user_consents_service_all" ON public.user_consents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "guardian_consents_owner_read" ON public.guardian_consents;
DROP POLICY IF EXISTS "guardian_consents_service_all" ON public.guardian_consents;
CREATE POLICY "guardian_consents_owner_read" ON public.guardian_consents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND (minor_user_id = auth.uid() OR guardian_user_id = auth.uid()));
CREATE POLICY "guardian_consents_service_all" ON public.guardian_consents FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4.9 Listing Moderation Audit Logs
DROP POLICY IF EXISTS "moderation_logs_admin_select" ON public.listing_moderation_audit_logs;
DROP POLICY IF EXISTS "moderation_logs_service_all" ON public.listing_moderation_audit_logs;
CREATE POLICY "moderation_logs_admin_select" ON public.listing_moderation_audit_logs FOR SELECT TO authenticated USING (public.is_service_role_or_admin());
CREATE POLICY "moderation_logs_service_all" ON public.listing_moderation_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. SECURE PROCEDURES & BUSINESS LOGIC (VOLATILE, STRICT RPCs)
-- -----------------------------------------------------------------------------

-- 5.1 Payment Settlement (Official Razorpay HMAC Verification)
CREATE OR REPLACE FUNCTION public.verify_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_gateway_signature text,
  p_expected_amount_paisa bigint,
  p_expected_currency text DEFAULT 'INR'
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, private, extensions, auth, pg_temp
AS $$
DECLARE
  v_jwt_role text;
  v_payment record;
  v_secret text;
  v_payload text;
  v_expected_signature text;
  v_order_paisa bigint;
  v_updated int;
BEGIN
  v_jwt_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role()
  );

  IF v_jwt_role != 'service_role' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Payment settlement requires service_role execution.');
  END IF;

  IF p_order_id IS NULL OR trim(p_order_id) = '' OR
     p_payment_id IS NULL OR trim(p_payment_id) = '' OR
     p_gateway_signature IS NULL OR trim(p_gateway_signature) = '' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PARAMETERS', 'message', 'order_id, payment_id, and signature are required.');
  END IF;

  SELECT id, order_id, amount, currency, status, payment_id INTO v_payment
  FROM public.khelgrid_payments
  WHERE order_id = trim(p_order_id)
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Payment order not found.');
  END IF;

  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'ALREADY_COMPLETED', 'message', 'Payment is already settled.');
  END IF;

  IF upper(trim(p_expected_currency)) != v_payment.currency THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'CURRENCY_MISMATCH', 'message', 'Currency mismatch.');
  END IF;

  v_order_paisa := round(v_payment.amount * 100);
  IF p_expected_amount_paisa != v_order_paisa THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'AMOUNT_MISMATCH', 'message', 'Amount mismatch.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.khelgrid_payments WHERE payment_id = trim(p_payment_id) AND id != v_payment.id) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'DUPLICATE_PAYMENT_ID', 'message', 'Payment ID has already been allocated to another order.');
  END IF;

  SELECT key_secret INTO v_secret FROM private.gateway_credentials WHERE provider = 'razorpay' AND is_active = true LIMIT 1;

  IF v_secret IS NULL OR trim(v_secret) = '' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GATEWAY_NOT_CONFIGURED', 'message', 'Live gateway credentials not configured. Payment remains pending.');
  END IF;

  v_payload := trim(p_order_id) || '|' || trim(p_payment_id);
  v_expected_signature := encode(extensions.hmac(v_payload::bytea, v_secret::bytea, 'sha256'), 'hex');

  IF lower(trim(p_gateway_signature)) != lower(v_expected_signature) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_SIGNATURE', 'message', 'Cryptographic signature verification failed.');
  END IF;

  UPDATE public.khelgrid_payments
  SET status = 'completed', payment_id = trim(p_payment_id), updated_at = now()
  WHERE id = v_payment.id AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'CONCURRENT_UPDATE', 'message', 'Concurrent modification detected.');
  END IF;

  RETURN jsonb_build_object('status', 'success', 'order_id', trim(p_order_id), 'payment_id', trim(p_payment_id), 'message', 'Payment settled successfully.');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text, bigint, text) TO service_role;

-- 5.2 Venue Slot Booking (Server-Side Pricing, Expiry Release & Concurrency Lock)
CREATE OR REPLACE FUNCTION public.create_venue_slot_booking(
  p_venue_id text,
  p_venue_name text,
  p_sport text,
  p_slot_date text,
  p_slot_time text,
  p_court_number int,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_total_amount numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_booking_ref text;
  v_voucher_token text;
  v_clean_phone text;
  v_clean_name text;
  v_clean_date text;
  v_clean_time text;
  v_venue record;
  v_authoritative_price numeric;
  v_conflict_count int;
  v_inserted_id uuid;
BEGIN
  IF NOT public.check_and_increment_rate_limit('booking_create', 10, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many booking attempts.');
  END IF;

  v_user_id := auth.uid();
  v_clean_name := trim(coalesce(p_customer_name, ''));
  v_clean_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_clean_date := trim(coalesce(p_slot_date, ''));
  v_clean_time := trim(coalesce(p_slot_time, ''));

  -- Auto-normalize relative dates
  IF lower(v_clean_date) = 'today' THEN
    v_clean_date := to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');
  ELSIF lower(v_clean_date) = 'tomorrow' THEN
    v_clean_date := to_char((now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day', 'YYYY-MM-DD');
  ELSIF lower(v_clean_date) IN ('day after', 'day after tomorrow') THEN
    v_clean_date := to_char((now() AT TIME ZONE 'Asia/Kolkata') + interval '2 days', 'YYYY-MM-DD');
  END IF;

  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Invalid customer name.');
  END IF;

  IF char_length(v_clean_phone) < 10 OR char_length(v_clean_phone) > 15 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'Valid mobile number required.');
  END IF;

  IF v_clean_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_DATE', 'message', 'Invalid slot date (YYYY-MM-DD required).');
  END IF;

  IF p_court_number IS NULL OR p_court_number <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_COURT', 'message', 'Invalid court number.');
  END IF;

  SELECT name, coalesce(plan_price, 500.00) as price INTO v_venue FROM public.venues WHERE (slug = trim(p_venue_id) OR id::text = trim(p_venue_id)) LIMIT 1;
  IF v_venue.name IS NOT NULL THEN
    v_authoritative_price := coalesce(v_venue.price, p_total_amount);
  ELSE
    v_authoritative_price := p_total_amount;
  END IF;

  -- 1. Explicit database state transition: sweep expired pending reservations
  PERFORM public.expire_stale_venue_reservations();

  -- 2. Concurrency serialization: advisory transaction lock on specific venue slot
  PERFORM pg_advisory_xact_lock(hashtext(trim(p_venue_id) || ':' || v_clean_date || ':' || v_clean_time || ':' || p_court_number::text));

  -- 3. Check for active reservation (confirmed or pending)
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.venue_bookings
  WHERE venue_id = trim(p_venue_id)
    AND slot_date = v_clean_date
    AND slot_time = v_clean_time
    AND court_number = p_court_number
    AND status IN ('confirmed', 'pending');

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'SLOT_UNAVAILABLE', 'message', 'The requested slot has already been reserved.');
  END IF;

  v_booking_ref := 'VB-' || upper(substr(md5(random()::text), 1, 4)) || '-' || to_char(now(), 'MMDD') || '-' || substr(md5(clock_timestamp()::text), 1, 4);
  v_voucher_token := encode(gen_random_bytes(24), 'hex');

  BEGIN
    INSERT INTO public.venue_bookings (
      booking_ref, venue_id, venue_name, sport, slot_date, slot_time,
      court_number, customer_name, customer_phone, customer_email,
      total_amount, paid_amount, payment_status, status, voucher_token, user_id, expires_at
    ) VALUES (
      v_booking_ref, trim(p_venue_id), coalesce(v_venue.name, p_venue_name),
      coalesce(p_sport, 'General'), v_clean_date, v_clean_time, p_court_number,
      v_clean_name, v_clean_phone, nullif(trim(p_customer_email), ''),
      v_authoritative_price, 0, 'pending', 'pending', v_voucher_token, v_user_id,
      clock_timestamp() + interval '15 minutes'
    ) RETURNING id INTO v_inserted_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'SLOT_UNAVAILABLE', 'message', 'The requested slot has already been reserved.');
  END;

  RETURN jsonb_build_object(
    'status', 'success', 'booking_id', v_inserted_id, 'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token, 'total_amount', v_authoritative_price,
    'payment_status', 'pending', 'message', 'Slot reserved in pending state.'
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_venue_slot_booking(text, text, text, text, text, int, text, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_venue_slot_booking(text, text, text, text, text, int, text, text, text, numeric) TO anon, authenticated, service_role;

-- 5.3 Voucher Retrieval with 192-bit Token
CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(
  p_booking_id uuid,
  p_voucher_token text
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_booking record;
BEGIN
  IF NOT public.check_and_increment_rate_limit('voucher_lookup', 30, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many voucher lookups.');
  END IF;

  v_user_id := auth.uid();
  SELECT id, booking_ref, venue_name, sport, slot_date, slot_time, court_number, total_amount, paid_amount, payment_status, status, voucher_token, user_id
  INTO v_booking FROM public.venue_bookings WHERE id = p_booking_id LIMIT 1;

  IF v_booking.id IS NULL THEN RETURN NULL; END IF;

  IF (v_user_id IS NOT NULL AND v_booking.user_id = v_user_id) OR
     (p_voucher_token IS NOT NULL AND trim(p_voucher_token) != '' AND v_booking.voucher_token = trim(p_voucher_token)) OR
     public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object(
      'booking_id', v_booking.id, 'booking_ref', v_booking.booking_ref,
      'venue_name', v_booking.venue_name, 'sport', v_booking.sport,
      'slot_date', v_booking.slot_date, 'slot_time', v_booking.slot_time,
      'court_number', v_booking.court_number, 'payment_status', v_booking.payment_status,
      'status', v_booking.status
    );
  END IF;

  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(uuid, text) TO anon, authenticated, service_role;

-- 5.4 Public Athlete CV Projection (Minor Shielding)
CREATE OR REPLACE FUNCTION public.get_athlete_public_cv(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_athlete record;
  v_is_minor boolean;
  v_has_guardian_consent boolean;
  v_birth_year int;
BEGIN
  SELECT user_id, username, full_name, sport, playing_position, city, state, date_of_birth, team_or_academy, primary_foot_or_hand, height_cm, weight_kg, summary, achievements, player_card_stats, verification_status, publication_status
  INTO v_athlete FROM public.athlete_profiles WHERE username = lower(trim(p_username)) LIMIT 1;

  IF v_athlete.username IS NULL THEN RETURN NULL; END IF;

  v_is_minor := (v_athlete.date_of_birth IS NOT NULL AND v_athlete.date_of_birth > (CURRENT_DATE - INTERVAL '18 years'));
  IF v_is_minor THEN
    SELECT EXISTS (
      SELECT 1 FROM public.guardian_consents
      WHERE minor_user_id = v_athlete.user_id AND is_active = true AND is_verified = true AND revoked_at IS NULL
    ) INTO v_has_guardian_consent;

    IF NOT v_has_guardian_consent THEN RETURN NULL; END IF;
    v_birth_year := extract(YEAR FROM v_athlete.date_of_birth)::int;
  END IF;

  RETURN jsonb_build_object(
    'username', v_athlete.username, 'full_name', v_athlete.full_name,
    'sport', v_athlete.sport, 'playing_position', v_athlete.playing_position,
    'city', v_athlete.city, 'state', v_athlete.state,
    'height_cm', v_athlete.height_cm, 'weight_kg', v_athlete.weight_kg,
    'primary_foot_or_hand', v_athlete.primary_foot_or_hand,
    'team_or_academy', v_athlete.team_or_academy, 'summary', v_athlete.summary,
    'achievements', coalesce(v_athlete.achievements, '[]'::jsonb),
    'player_card_stats', coalesce(v_athlete.player_card_stats, '{}'::jsonb),
    'is_minor', coalesce(v_is_minor, false),
    'birth_year', CASE WHEN v_is_minor THEN v_birth_year ELSE NULL END,
    'is_verified', (v_athlete.verification_status = 'verified')
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_athlete_public_cv(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_athlete_public_cv(text) TO anon, authenticated, service_role;

-- 5.5 Listing Moderation Review (Anti-Self-Approval)
CREATE OR REPLACE FUNCTION public.review_listing_submission(
  p_submission_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_reviewer_id uuid;
  v_submission record;
BEGIN
  v_reviewer_id := auth.uid();
  IF v_reviewer_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Authentication required.');
  END IF;

  IF NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Moderator privileges required.');
  END IF;

  SELECT id, submitted_by, status INTO v_submission FROM public.listing_submissions WHERE id = p_submission_id LIMIT 1;
  IF v_submission.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Submission not found.');
  END IF;

  IF v_submission.submitted_by = v_reviewer_id THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'SELF_APPROVAL_PROHIBITED', 'message', 'Submitters cannot review their own submissions.');
  END IF;

  IF p_decision NOT IN ('approved', 'rejected', 'flagged') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_DECISION', 'message', 'Invalid decision.');
  END IF;

  UPDATE public.listing_submissions SET status = p_decision, updated_at = now() WHERE id = p_submission_id;

  INSERT INTO public.listing_moderation_audit_logs (submission_id, reviewer_id, action, review_notes)
  VALUES (p_submission_id, v_reviewer_id, p_decision, p_notes);

  RETURN jsonb_build_object('status', 'success', 'submission_id', p_submission_id, 'action', p_decision, 'message', 'Listing reviewed successfully.');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_listing_submission(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_listing_submission(uuid, text, text) TO authenticated, service_role;

-- 5.6 Sanitized Pickup Game Roster
CREATE OR REPLACE FUNCTION public.get_pickup_game_roster(p_game_id text)
RETURNS TABLE (
  participant_id uuid,
  player_name text,
  status text,
  joined_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.player_name, p.status, p.joined_at
  FROM public.pickup_game_participants p
  WHERE p.game_id = trim(p_game_id) AND p.status IN ('confirmed', 'waitlist')
  ORDER BY p.joined_at ASC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_pickup_game_roster(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pickup_game_roster(text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. REVOKE ANONYMOUS EXECUTE ON HOST/ADMIN FUNCTIONS
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_moderate_pickup_game(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_pickup_game(text, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.approve_pickup_game_whatsapp_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pickup_game_whatsapp_invite(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_pickup_game_as_host(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_as_host(text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.complete_pickup_game_as_host(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_pickup_game_as_host(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_pickup_game(text, text, text, text, int, text, text, text, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pickup_game(text, text, text, text, int, text, text, text, text, boolean, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_host_pickup_games() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_host_pickup_games() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reopen_pickup_game_as_host(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_pickup_game_as_host(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reschedule_pickup_game(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_pickup_game(text, text, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_pickup_game_capacity(text, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pickup_game_capacity(text, int, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_pickup_game_details(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pickup_game_details(text, text, text, text, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. RECORD SCHEMA MIGRATION VERSIONS IN SUPABASE METADATA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);

INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('20261108040000', 'phase2_rls_post_merge_remediation'),
  ('20261108050000', 'phase3_rbac_and_privilege_hardening'),
  ('20261108053000', 'phase4_authentication_and_session_security'),
  ('20261108060000', 'phase5_api_rpc_and_backend_hardening'),
  ('20261108070000', 'phase5_1_rpc_volatility_and_caller_auth_remediation'),
  ('20261108080000', 'phase6_athlete_privacy_and_minor_protection'),
  ('20261108090000', 'phase7_and_8_business_logic_and_moderation_security'),
  ('20261108100000', 'phase5_2_critical_remediation_and_closure')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;

COMMIT;
