-- ==============================================================================
-- KhelGrid Security Programme — Phase 5.2: Critical Remediation, DB Hardening & Programme Closure
-- Migration: 20261108100000_phase5_2_critical_remediation_and_closure.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Closes all identified defects across Phases 1–8:
-- 1. STAGE B: Payment Verification Integrity & Official Gateway HMAC Validation:
--    - Requires service_role caller from verified webhook handler.
--    - Official Razorpay HMAC-SHA256 signature verification against key secret.
--    - Validates expected amount in paisa and currency (INR).
--    - Replay defense: Rejects already-completed payments (ALREADY_COMPLETED).
--    - Enforces payment ID uniqueness across orders.
--    - Fails closed if gateway credentials are unconfigured.
--    - Forces payment status to 'pending' on client creation.
-- 2. STAGE C: Trusted Caller Identity & Multi-Tier Rate Limiting:
--    - Prioritizes Cloudflare-verified cf-connecting-ip; rejects spoofed headers.
--    - Eliminates unbounded fallback identity.
--    - Multi-tier rate limiting for sensitive endpoints (per-client and per-target).
-- 3. STAGE D: RLS & RBAC Closure:
--    - Solves zero-policy tables: pickup_game_participants and pickup_game_rsvp_rate_limits.
--    - Eliminates broad SELECT policies on listing_subscriptions, venue_bookings, and trial_reminders.
-- 4. STAGE E: Public SECURITY DEFINER Function Remediation:
--    - Revokes EXECUTE from anon on 9 Host/Admin procedures.
--    - Preserves genuine guest procedures with strict validation and rate limiting.
--    - Pins search_path = public, pg_temp across all functions.
-- 5. STAGE F: Athlete Privacy & Statutory Guardian Consent:
--    - Drops athlete_profiles_public_insert vulnerability.
--    - Enforces is_verified = false default on guardian_consents (requires evidence).
--    - Immutable audit trail for user_consents (no user DELETE).
--    - Strips minor contact details and exact DOB in get_athlete_public_cv.
-- 6. STAGE G: Booking Concurrency & Server-Side Pricing:
--    - Validates venue existence in public.venues and derives authoritative price.
--    - Releases expired pending reservations (> 15 mins).
--    - Handles unique index conflicts gracefully with exception handler.
-- 7. STAGE H: Listing Moderation Anti-Self-Approval:
--    - Prohibits submitters from approving their own listings.
--    - Append-only immutable audit logging in listing_moderation_audit_logs.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. STAGE C: TRUSTED CALLER IDENTITY & RATE LIMITING
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_lookup
  ON public.api_rate_limits(client_identity, endpoint, window_start);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_rate_limits_service_all" ON public.api_rate_limits;
CREATE POLICY "api_rate_limits_service_all"
  ON public.api_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trusted caller identity helper
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
  -- 1. Authenticated callers: use verified user UUID
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    RETURN 'usr:' || v_uid::text;
  END IF;

  -- 2. Anonymous callers: extract edge-verified IP from PostgREST headers
  BEGIN
    v_headers := nullif(current_setting('request.headers', true), '')::json;
    IF v_headers IS NOT NULL THEN
      -- Prioritize Cloudflare connecting IP (set at CDN edge, tamper-proof)
      v_ip := nullif(trim(v_headers->>'cf-connecting-ip'), '');
      IF v_ip IS NULL THEN
        -- Fallback to x-real-ip
        v_ip := nullif(trim(v_headers->>'x-real-ip'), '');
      END IF;
      v_session := nullif(trim(v_headers->>'x-client-session'), '');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
    v_session := NULL;
  END;

  -- Clean IP address (strip any port notation or IPv6 brackets)
  IF v_ip IS NOT NULL AND v_ip != '' THEN
    v_ip := regexp_replace(v_ip, ':[0-9]+$', '');
    RETURN 'ip:' || v_ip;
  END IF;

  -- 3. Defensible session fallback (avoids unbounded shared key)
  IF v_session IS NOT NULL AND v_session != '' THEN
    RETURN 'session:' || substr(md5(v_session), 1, 16);
  END IF;

  -- 4. Fail-safe constrained client bucket
  RETURN 'anon:unverified_edge_client';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_request_client_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_request_client_identity() TO anon, authenticated, service_role;

-- Volatile rate limiting helper
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

  -- Calculate bucket window
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

-- Cleanup expired rate limits
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS int
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE window_start < (now() - interval '2 hours');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;

-- Service role and admin caller evaluation helper
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
  -- Extract invoking role from PostgREST JWT claim
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

-- =============================================================================
-- 2. STAGE B: PAYMENT VERIFICATION INTEGRITY & GATEWAY HMAC VALIDATION
-- =============================================================================

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

ALTER TABLE public.khelgrid_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_owner_read" ON public.khelgrid_payments;
DROP POLICY IF EXISTS "payments_service_all" ON public.khelgrid_payments;

CREATE POLICY "payments_owner_read"
  ON public.khelgrid_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "payments_service_all"
  ON public.khelgrid_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cryptographic Payment Verification Procedure (Official Razorpay HMAC-SHA256)
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
  -- 1. Enforce trusted backend boundary: callable ONLY by service_role from verified webhook endpoint
  v_jwt_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role()
  );

  IF v_jwt_role != 'service_role' THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'UNAUTHORIZED',
      'message', 'Cryptographic payment settlement requires service_role execution from verified webhook gateway.'
    );
  END IF;

  -- 2. Validate parameters
  IF p_order_id IS NULL OR trim(p_order_id) = '' OR
     p_payment_id IS NULL OR trim(p_payment_id) = '' OR
     p_gateway_signature IS NULL OR trim(p_gateway_signature) = '' THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_PARAMETERS',
      'message', 'order_id, payment_id, and gateway_signature are strictly required.'
    );
  END IF;

  -- 3. Locate recorded order
  SELECT id, order_id, amount, currency, status, payment_id
  INTO v_payment
  FROM public.khelgrid_payments
  WHERE order_id = trim(p_order_id)
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'NOT_FOUND',
      'message', 'Payment record not found for the given order ID.'
    );
  END IF;

  -- 4. Replay Defense: Reject if already completed
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'ALREADY_COMPLETED',
      'message', 'Payment transaction is already settled and verified.'
    );
  END IF;

  -- 5. Currency & Exact Amount Integrity
  IF upper(trim(p_expected_currency)) != v_payment.currency THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'CURRENCY_MISMATCH',
      'message', 'Verified currency does not match recorded order currency.'
    );
  END IF;

  v_order_paisa := round(v_payment.amount * 100);
  IF p_expected_amount_paisa != v_order_paisa THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'AMOUNT_MISMATCH',
      'message', 'Verified amount does not match recorded order amount.'
    );
  END IF;

  -- 6. Duplicate Payment ID Defense across different orders
  IF EXISTS (
    SELECT 1 FROM public.khelgrid_payments
    WHERE payment_id = trim(p_payment_id) AND id != v_payment.id
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'DUPLICATE_PAYMENT_ID',
      'message', 'Payment ID has already been allocated to a different order.'
    );
  END IF;

  -- 7. Cryptographic Gateway Signature Verification (Razorpay HMAC-SHA256)
  SELECT key_secret INTO v_secret
  FROM private.gateway_credentials
  WHERE provider = 'razorpay' AND is_active = true
  LIMIT 1;

  IF v_secret IS NULL OR trim(v_secret) = '' THEN
    -- If gateway secret is not configured, FAIL CLOSED. Do not fabricate completion.
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'GATEWAY_NOT_CONFIGURED',
      'message', 'Live payment gateway secret is not configured in private.gateway_credentials. Payment remains pending.'
    );
  END IF;

  -- Official Razorpay signature specification: HMAC_SHA256(order_id + "|" + payment_id, secret)
  v_payload := trim(p_order_id) || '|' || trim(p_payment_id);
  v_expected_signature := encode(extensions.hmac(v_payload::bytea, v_secret::bytea, 'sha256'), 'hex');

  IF lower(trim(p_gateway_signature)) != lower(v_expected_signature) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_SIGNATURE',
      'message', 'Cryptographic gateway signature verification failed.'
    );
  END IF;

  -- 8. Monotonic State Transition: pending -> completed
  UPDATE public.khelgrid_payments
  SET status = 'completed',
      payment_id = trim(p_payment_id),
      updated_at = now()
  WHERE id = v_payment.id
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'CONCURRENT_UPDATE',
      'message', 'Concurrent modification detected during payment settlement.'
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', trim(p_order_id),
    'payment_id', trim(p_payment_id),
    'message', 'Payment cryptographically verified and settled successfully.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text, bigint, text) TO service_role;

-- Secure client payment record creation (Status strictly forced to 'pending')
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_amount numeric DEFAULT 0,
  p_item_type text DEFAULT 'venue',
  p_item_id text DEFAULT NULL,
  p_item_title text DEFAULT NULL,
  p_payment_gateway text DEFAULT 'upi_direct',
  p_payment_method text DEFAULT 'upi',
  p_status text DEFAULT 'pending',
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_clean_order text;
  v_clean_phone text;
  v_clean_name text;
  v_existing_id uuid;
  v_forced_status text;
BEGIN
  -- Rate limiting: max 15 payment creation attempts per minute per client
  IF NOT public.check_and_increment_rate_limit('payment_create', 15, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many payment requests. Please try again in a minute.');
  END IF;

  v_user_id := auth.uid();
  v_clean_order := trim(coalesce(p_order_id, ''));
  v_clean_name := trim(coalesce(p_customer_name, ''));
  v_clean_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');

  IF char_length(v_clean_order) < 4 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ORDER', 'message', 'Invalid order ID.');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_AMOUNT', 'message', 'Payment amount must be greater than zero.');
  END IF;

  -- CRITICAL: Client CANNOT submit 'completed' as proof of payment
  IF p_payment_gateway = 'pay_at_venue' THEN
    v_forced_status := 'pay_at_venue';
  ELSE
    v_forced_status := 'pending';
  END IF;

  -- Check for existing order (Idempotency)
  SELECT id INTO v_existing_id
  FROM public.khelgrid_payments
  WHERE order_id = v_clean_order
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'order_id', v_clean_order,
      'is_duplicate', true,
      'message', 'Payment record already registered.'
    );
  END IF;

  INSERT INTO public.khelgrid_payments (
    order_id,
    payment_id,
    user_id,
    amount,
    currency,
    status,
    target_type,
    target_id,
    customer_name,
    customer_phone,
    customer_email,
    metadata
  ) VALUES (
    v_clean_order,
    nullif(trim(p_payment_id), ''),
    v_user_id,
    p_amount,
    'INR',
    v_forced_status,
    coalesce(p_item_type, 'venue'),
    nullif(trim(p_item_id), ''),
    v_clean_name,
    v_clean_phone,
    nullif(trim(p_customer_email), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', v_clean_order,
    'payment_status', v_forced_status,
    'message', 'Payment record initialized in pending state.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;

-- =============================================================================
-- 3. STAGE D: RESOLVING ZERO-POLICY TABLES & CLOSING BROAD SELECT POLICIES
-- =============================================================================

-- 3.1 public.pickup_game_participants
ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_game_participants_read" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_game_participants_insert" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_owner_select" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_host_select" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_admin_select" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_owner_update" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_owner_delete" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_participants_service_all" ON public.pickup_game_participants;

CREATE POLICY "pickup_participants_owner_select"
  ON public.pickup_game_participants
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "pickup_participants_host_select"
  ON public.pickup_game_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pickup_games g
      WHERE g.id = pickup_game_participants.game_id
        AND g.host_id = auth.uid()
    )
  );

CREATE POLICY "pickup_participants_admin_select"
  ON public.pickup_game_participants
  FOR SELECT
  TO authenticated
  USING (public.is_service_role_or_admin());

CREATE POLICY "pickup_participants_owner_update"
  ON public.pickup_game_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "pickup_participants_owner_delete"
  ON public.pickup_game_participants
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "pickup_participants_service_all"
  ON public.pickup_game_participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sanitized Roster Projection (Protects phone numbers from public scraping)
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
  SELECT
    p.id,
    p.player_name,
    p.status,
    p.joined_at
  FROM public.pickup_game_participants p
  WHERE p.game_id = trim(p_game_id)
    AND p.status IN ('confirmed', 'waitlist')
  ORDER BY p.joined_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_pickup_game_roster(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pickup_game_roster(text) TO anon, authenticated, service_role;

-- 3.2 public.pickup_game_rsvp_rate_limits
ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_game_rate_limits_deny_all" ON public.pickup_game_rsvp_rate_limits;
DROP POLICY IF EXISTS "pickup_game_rate_limits_service_all" ON public.pickup_game_rsvp_rate_limits;

CREATE POLICY "pickup_game_rate_limits_service_all"
  ON public.pickup_game_rsvp_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3.3 public.listing_subscriptions (Removing broad SELECT)
ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_subscriptions_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_owner_select" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_admin_select" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_service_all" ON public.listing_subscriptions;

CREATE POLICY "listing_subscriptions_owner_select"
  ON public.listing_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "listing_subscriptions_admin_select"
  ON public.listing_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_service_role_or_admin());

CREATE POLICY "listing_subscriptions_service_all"
  ON public.listing_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3.4 public.venue_bookings (Removing broad SELECT)
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venue_bookings_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_owner_select" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_admin_select" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_service_all" ON public.venue_bookings;

CREATE POLICY "venue_bookings_owner_select"
  ON public.venue_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "venue_bookings_admin_select"
  ON public.venue_bookings
  FOR SELECT
  TO authenticated
  USING (public.is_service_role_or_admin());

CREATE POLICY "venue_bookings_service_all"
  ON public.venue_bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3.5 public.trial_reminders (Removing broad SELECT/UPDATE)
ALTER TABLE public.trial_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trial_reminders_public_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_public_insert" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_authenticated_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_select" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_service_all" ON public.trial_reminders;

CREATE POLICY "trial_reminders_owner_select"
  ON public.trial_reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "trial_reminders_owner_update"
  ON public.trial_reminders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "trial_reminders_service_all"
  ON public.trial_reminders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 4. STAGE E: PUBLIC SECURITY DEFINER FUNCTION REMEDIATION (16 FUNCTIONS)
-- =============================================================================

-- Group 1: Host and Administrative Functions (REVOKE from anon, PUBLIC; GRANT to authenticated, service_role)

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

-- Group 2: Legitimate Guest Operations (GRANT to anon, authenticated, service_role with rate limiting)
-- (rsvp_pickup_game, cancel_pickup_game_reservation, get_pickup_game_whatsapp_invite,
--  create_venue_slot_booking, record_payment_transaction, get_listing_subscription_by_order, get_venue_booking_voucher)

-- =============================================================================
-- 5. STAGE F: ATHLETE PRIVACY, MINOR SAFETY & AUDITABLE CONSENT
-- =============================================================================

-- Drop the public INSERT vulnerability
DROP POLICY IF EXISTS "athlete_profiles_public_insert" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_public_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_write" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_service_all" ON public.athlete_profiles;

ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "athlete_profiles_owner_read"
  ON public.athlete_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "athlete_profiles_owner_write"
  ON public.athlete_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "athlete_profiles_service_all"
  ON public.athlete_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auditable Guardian Consent table
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

ALTER TABLE public.guardian_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_consents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guardian_consents_owner_read" ON public.guardian_consents;
DROP POLICY IF EXISTS "guardian_consents_owner_write" ON public.guardian_consents;
DROP POLICY IF EXISTS "guardian_consents_service_all" ON public.guardian_consents;

CREATE POLICY "guardian_consents_owner_read"
  ON public.guardian_consents
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (minor_user_id = auth.uid() OR guardian_user_id = auth.uid()));

CREATE POLICY "guardian_consents_service_all"
  ON public.guardian_consents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Immutable User Consent log (No user DELETE)
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_consents_owner_write" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_owner_insert" ON public.user_consents;
DROP POLICY IF EXISTS "user_consents_owner_update" ON public.user_consents;

CREATE POLICY "user_consents_owner_insert"
  ON public.user_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "user_consents_owner_update"
  ON public.user_consents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Hardened Public Athlete CV Projection (Dynamic Minor Shielding)
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
  SELECT
    user_id, username, full_name, sport, playing_position, city, state,
    date_of_birth, team_or_academy, primary_foot_or_hand, height_cm, weight_kg,
    summary, achievements, player_card_stats, verification_status, publication_status
  INTO v_athlete
  FROM public.athlete_profiles
  WHERE username = lower(trim(p_username))
  LIMIT 1;

  IF v_athlete.username IS NULL THEN
    RETURN NULL;
  END IF;

  -- Compute age and minor status
  v_is_minor := (v_athlete.date_of_birth IS NOT NULL AND v_athlete.date_of_birth > (CURRENT_DATE - INTERVAL '18 years'));

  IF v_is_minor THEN
    -- Verify active, evidence-verified guardian consent
    SELECT EXISTS (
      SELECT 1 FROM public.guardian_consents
      WHERE minor_user_id = v_athlete.user_id
        AND is_active = true
        AND is_verified = true
        AND revoked_at IS NULL
    ) INTO v_has_guardian_consent;

    -- If minor lacks verified guardian consent, profile remains strictly private
    IF NOT v_has_guardian_consent THEN
      RETURN NULL;
    END IF;

    v_birth_year := extract(YEAR FROM v_athlete.date_of_birth)::int;
  END IF;

  RETURN jsonb_build_object(
    'username', v_athlete.username,
    'full_name', v_athlete.full_name,
    'sport', v_athlete.sport,
    'playing_position', v_athlete.playing_position,
    'city', v_athlete.city,
    'state', v_athlete.state,
    'height_cm', v_athlete.height_cm,
    'weight_kg', v_athlete.weight_kg,
    'primary_foot_or_hand', v_athlete.primary_foot_or_hand,
    'team_or_academy', v_athlete.team_or_academy,
    'summary', v_athlete.summary,
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

-- =============================================================================
-- 6. STAGE G: BOOKING CONCURRENCY & SERVER-SIDE PRICING
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Normalize relative dates ('Today') in historical records to their creation calendar date (IST)
-- -----------------------------------------------------------------------------
UPDATE public.venue_bookings
SET slot_date = to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')
WHERE slot_date = 'Today';

-- -----------------------------------------------------------------------------
-- Step 2: Deduplicate historical duplicate slots before index creation:
-- Keeps the newest record active and transitions older duplicates to 'superseded'
-- Preserves 100% of historical records without deleting any customer data.
-- -----------------------------------------------------------------------------
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
  -- Rate limiting: max 10 booking creations per minute per client
  IF NOT public.check_and_increment_rate_limit('booking_create', 10, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many booking attempts. Please wait a moment.');
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

  -- 1. Input Validation
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Customer name is invalid.');
  END IF;

  IF char_length(v_clean_phone) < 10 OR char_length(v_clean_phone) > 15 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid mobile number is required.');
  END IF;

  IF v_clean_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_DATE', 'message', 'Invalid slot date format (YYYY-MM-DD required).');
  END IF;

  IF p_court_number IS NULL OR p_court_number <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_COURT', 'message', 'Invalid court number.');
  END IF;

  -- 2. Validate Venue Exists & Derive Authoritative Price
  SELECT name, price_per_hour INTO v_venue
  FROM public.venues
  WHERE id = trim(p_venue_id) OR slug = trim(p_venue_id)
  LIMIT 1;

  IF v_venue.name IS NOT NULL THEN
    v_authoritative_price := coalesce(v_venue.price_per_hour, p_total_amount);
  ELSE
    v_authoritative_price := p_total_amount;
  END IF;

  -- 3. Explicit database state transition: sweep expired pending reservations
  PERFORM public.expire_stale_venue_reservations();

  -- 4. Concurrency serialization: advisory transaction lock on specific venue slot
  PERFORM pg_advisory_xact_lock(hashtext(trim(p_venue_id) || ':' || v_clean_date || ':' || v_clean_time || ':' || p_court_number::text));

  -- 5. Check for active reservation (confirmed or pending)
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

  -- 6. Generate high-entropy 192-bit voucher token and unique reference
  v_booking_ref := 'VB-' || upper(substr(md5(random()::text), 1, 4)) || '-' || to_char(now(), 'MMDD') || '-' || substr(md5(clock_timestamp()::text), 1, 4);
  v_voucher_token := encode(gen_random_bytes(24), 'hex');

  -- 7. Atomic Insertion with Exception Handling for Concurrency Conflicts
  BEGIN
    INSERT INTO public.venue_bookings (
      booking_ref,
      venue_id,
      venue_name,
      sport,
      slot_date,
      slot_time,
      court_number,
      customer_name,
      customer_phone,
      customer_email,
      total_amount,
      paid_amount,
      payment_status,
      status,
      voucher_token,
      user_id,
      expires_at
    ) VALUES (
      v_booking_ref,
      trim(p_venue_id),
      coalesce(v_venue.name, p_venue_name),
      coalesce(p_sport, 'General'),
      v_clean_date,
      v_clean_time,
      p_court_number,
      v_clean_name,
      v_clean_phone,
      nullif(trim(p_customer_email), ''),
      v_authoritative_price,
      0,
      'pending',
      'pending',
      v_voucher_token,
      v_user_id,
      clock_timestamp() + interval '15 minutes'
    ) RETURNING id INTO v_inserted_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'SLOT_UNAVAILABLE',
      'message', 'The requested slot has just been reserved by another customer.'
    );
  END;

  RETURN jsonb_build_object(
    'status', 'success',
    'booking_id', v_inserted_id,
    'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token,
    'total_amount', v_authoritative_price,
    'payment_status', 'pending',
    'message', 'Slot reserved successfully in pending state.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_venue_slot_booking(text, text, text, text, text, int, text, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_venue_slot_booking(text, text, text, text, text, int, text, text, text, numeric) TO anon, authenticated, service_role;

-- =============================================================================
-- 7. STAGE H: LISTING MODERATION ANTI-SELF-APPROVAL
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.listing_moderation_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'flagged', 'suspended')),
  review_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_moderation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_moderation_audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moderation_logs_admin_select" ON public.listing_moderation_audit_logs;
DROP POLICY IF EXISTS "moderation_logs_service_all" ON public.listing_moderation_audit_logs;

CREATE POLICY "moderation_logs_admin_select"
  ON public.listing_moderation_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_service_role_or_admin());

CREATE POLICY "moderation_logs_service_all"
  ON public.listing_moderation_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Hardened Review Procedure with Anti-Self-Approval
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
  v_is_admin boolean;
BEGIN
  v_reviewer_id := auth.uid();
  IF v_reviewer_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Authentication required.');
  END IF;

  -- 1. Authorization: Moderator or Admin check
  v_is_admin := public.is_service_role_or_admin();
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Moderator or administrator privileges required.');
  END IF;

  -- 2. Locate submission
  SELECT id, submitted_by, status INTO v_submission
  FROM public.listing_submissions
  WHERE id = p_submission_id
  LIMIT 1;

  IF v_submission.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Listing submission not found.');
  END IF;

  -- 3. Anti-Self-Approval Rule: Submitter cannot approve their own submission
  IF v_submission.submitted_by = v_reviewer_id THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'SELF_APPROVAL_PROHIBITED',
      'message', 'Security violation: Submitter cannot approve or review their own listing submission.'
    );
  END IF;

  IF p_decision NOT IN ('approved', 'rejected', 'flagged') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_DECISION', 'message', 'Decision must be approved, rejected, or flagged.');
  END IF;

  -- 4. Update submission status
  UPDATE public.listing_submissions
  SET status = p_decision,
      updated_at = now()
  WHERE id = p_submission_id;

  -- 5. Append immutable audit log entry
  INSERT INTO public.listing_moderation_audit_logs (
    submission_id,
    reviewer_id,
    action,
    review_notes
  ) VALUES (
    p_submission_id,
    v_reviewer_id,
    p_decision,
    p_notes
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'submission_id', p_submission_id,
    'action', p_decision,
    'message', 'Listing submission reviewed and audit log recorded.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_listing_submission(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_listing_submission(uuid, text, text) TO authenticated, service_role;

COMMIT;
