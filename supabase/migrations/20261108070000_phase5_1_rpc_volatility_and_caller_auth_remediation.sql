-- ==============================================================================
-- KhelGrid — Phase 5.1: RPC Volatility, Rate Limiting & Caller Identity Remediation
-- Migration: 20261108070000_phase5_1_rpc_volatility_and_caller_auth_remediation.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Purpose:
-- 1. Fix RPC Volatility (B1):
--    - Declare get_listing_subscription_by_order and get_venue_booking_voucher as VOLATILE.
--    - Prevents runtime error: 'cannot execute INSERT in a read-only transaction'
--      when check_and_increment_rate_limit is called.
-- 2. Redesign Rate Limiting (B2):
--    - Install public.get_request_client_identity() deriving caller identity from
--      auth.uid() (for signed-in users) or trusted PostgREST gateway IP headers.
--    - Implement dual-layer rate limiting: per-client limit (defeats order ID rotation)
--      and per-target limit (defeats distributed probing).
--    - Install public.cleanup_expired_rate_limits() retention maintenance helper.
-- 3. Fix SECURITY DEFINER Caller Identity Checks (B3):
--    - Replace flawed 'current_user = service_role' checks with auth.role() and JWT claims.
--    - Inside SECURITY DEFINER functions, current_user evaluates to function owner (postgres);
--      auth.role() and request.jwt.claim.role evaluate the actual invoking API role.
--    - Install public.is_service_role_or_admin() helper.
-- 4. Payment Verification Integrity & Replay Defense (B4):
--    - Enforce server-side verification with expected amount and currency checks.
--    - Reject replayed or already-settled transactions.
-- 5. Public Profile Table PII Leakage Remediation (B6 / E2):
--    - Replace permissive profiles_public_read USING (true) with owner-only SELECT.
--    - Direct Data API queries cannot scrape emails or phone numbers.
--    - Public discovery restricted to get_public_profile(user_id) projection RPC.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TRUSTED CALLER IDENTITY & SECURITY DEFINER HELPERS (B3)
-- -----------------------------------------------------------------------------

-- Helper: Evaluates whether the active API caller possesses service_role or admin privileges
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
  v_is_admin boolean := false;
BEGIN
  -- 1. Check if caller connected with Supabase service_role key
  BEGIN
    v_jwt_role := coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      auth.role(),
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := '';
  END;

  IF v_jwt_role = 'service_role' THEN
    RETURN true;
  END IF;

  -- 2. Check if caller is an authenticated user with active 'admin' role in user_roles
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_uid AND role = 'admin' AND is_active = true
    ) INTO v_is_admin;

    IF v_is_admin THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_service_role_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_service_role_or_admin() TO anon, authenticated, service_role;

-- Helper: Extracts caller identity for rate limiting (defeats order ID rotation)
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
BEGIN
  -- Authenticated callers use their verified user UUID
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    RETURN 'usr:' || v_uid::text;
  END IF;

  -- Anonymous callers: extract gateway IP from PostgREST request headers
  BEGIN
    v_headers := nullif(current_setting('request.headers', true), '')::json;
    IF v_headers IS NOT NULL THEN
      v_ip := coalesce(
        v_headers->>'cf-connecting-ip',
        v_headers->>'x-real-ip',
        split_part(v_headers->>'x-forwarded-for', ',', 1)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  v_ip := trim(coalesce(v_ip, ''));
  IF v_ip != '' THEN
    RETURN 'ip:' || v_ip;
  END IF;

  RETURN 'anon:default_client';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_request_client_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_request_client_identity() TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. REDESIGNED RATE LIMITING & RETENTION (B1, B2)
-- -----------------------------------------------------------------------------

-- Rate limit verification helper
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_rate_key text,
  p_max_requests int DEFAULT 10,
  p_window_seconds int DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count int;
  v_clean_key text;
BEGIN
  v_clean_key := trim(coalesce(p_rate_key, ''));
  IF char_length(v_clean_key) < 2 THEN
    RETURN false;
  END IF;

  -- Discrete interval window
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.api_rate_limits (rate_key, window_start, request_count)
  VALUES (v_clean_key, v_window_start, 1)
  ON CONFLICT (rate_key, window_start)
  DO UPDATE SET request_count = public.api_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  RETURN v_current_count <= p_max_requests;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int) TO service_role;

-- Rate limit retention cleanup helper
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits(p_retention_minutes int DEFAULT 60)
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
  WHERE window_start < now() - (p_retention_minutes || ' minutes')::interval;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rate_limits(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits(int) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. VOLATILITY & DUAL-TIER RATE-LIMITED VOUCHER & RECEIPT RPCS (B1, B2, B5)
-- -----------------------------------------------------------------------------

-- 3.1 Listing Subscription Voucher Lookup
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(
  p_order_id text,
  p_access_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_sub record;
  v_is_authorized boolean := false;
  v_clean_order text;
  v_clean_token text;
  v_client_id text;
BEGIN
  v_caller_uid := auth.uid();
  v_clean_order := trim(coalesce(p_order_id, ''));
  v_clean_token := trim(coalesce(p_access_token, ''));
  v_client_id := public.get_request_client_identity();

  IF char_length(v_clean_order) < 3 THEN
    RETURN NULL;
  END IF;

  -- Dual-Tier Rate Limit:
  -- Tier 1: Per-client limit (max 20 lookups / 60s per client IP or user; defeats order rotation)
  IF NOT public.check_and_increment_rate_limit('order_lookup:' || v_client_id, 20, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
  END IF;

  -- Tier 2: Per-target limit (max 10 lookups / 60s on this specific order; defeats distributed brute-force)
  IF NOT public.check_and_increment_rate_limit('order_lookup:target:' || v_clean_order, 10, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests for this order. Please try again later.');
  END IF;

  SELECT
    id,
    order_id,
    user_id,
    listing_name,
    listing_type,
    plan_tier,
    is_active,
    expires_at,
    payment_status,
    access_token,
    customer_name,
    customer_email
  INTO v_sub
  FROM public.listing_subscriptions
  WHERE order_id = v_clean_order
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Authorization Rule: Authenticated Owner OR 192-bit High-Entropy Token Match
  IF v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF char_length(v_clean_token) >= 24 AND v_sub.access_token IS NOT NULL AND v_sub.access_token = v_clean_token THEN
    v_is_authorized := true;
  END IF;

  -- Fail closed: unauthenticated guessing yields NULL (zero rows in PostgREST)
  IF NOT v_is_authorized THEN
    RETURN NULL;
  END IF;

  -- Return sanitized receipt projection (Zero PII leak: phone and internal gateway secrets omitted)
  RETURN jsonb_build_object(
    'order_id', v_sub.order_id,
    'listing_name', v_sub.listing_name,
    'listing_type', v_sub.listing_type,
    'plan_tier', v_sub.plan_tier,
    'is_active', v_sub.is_active,
    'expires_at', v_sub.expires_at,
    'payment_status', v_sub.payment_status,
    'customer_display_name', CASE
      WHEN v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid THEN v_sub.customer_name
      ELSE regexp_replace(v_sub.customer_name, '(?<=^.).+(?=.?$)', '***')
    END,
    'customer_masked_email', CASE
      WHEN v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid THEN v_sub.customer_email
      WHEN v_sub.customer_email IS NOT NULL THEN regexp_replace(v_sub.customer_email, '(?<=^.).+(?=@)', '***')
      ELSE NULL
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text, text) TO anon, authenticated, service_role;

-- 3.2 Venue Booking Voucher Lookup
CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(
  p_booking_ref text,
  p_voucher_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_booking record;
  v_is_authorized boolean := false;
  v_clean_ref text;
  v_clean_token text;
  v_client_id text;
BEGIN
  v_caller_uid := auth.uid();
  v_clean_ref := trim(coalesce(p_booking_ref, ''));
  v_clean_token := trim(coalesce(p_voucher_token, ''));
  v_client_id := public.get_request_client_identity();

  IF char_length(v_clean_ref) < 3 THEN
    RETURN NULL;
  END IF;

  -- Dual-Tier Rate Limit:
  IF NOT public.check_and_increment_rate_limit('booking_lookup:' || v_client_id, 20, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
  END IF;

  IF NOT public.check_and_increment_rate_limit('booking_lookup:target:' || v_clean_ref, 10, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests for this booking. Please try again later.');
  END IF;

  SELECT
    id,
    booking_ref,
    venue_id,
    venue_name,
    sport,
    slot_date,
    slot_time,
    court_number,
    status,
    user_id,
    voucher_token,
    customer_name
  INTO v_booking
  FROM public.venue_bookings
  WHERE booking_ref = v_clean_ref
  LIMIT 1;

  IF v_booking.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Authorization Rule: Authenticated Owner OR 192-bit High-Entropy Voucher Token Match
  IF v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF char_length(v_clean_token) >= 24 AND v_booking.voucher_token IS NOT NULL AND v_booking.voucher_token = v_clean_token THEN
    v_is_authorized := true;
  END IF;

  -- Fail closed: unauthenticated guessing yields NULL
  IF NOT v_is_authorized THEN
    RETURN NULL;
  END IF;

  -- Return sanitized booking voucher projection (Shielding phone and payment identifiers)
  RETURN jsonb_build_object(
    'booking_ref', v_booking.booking_ref,
    'venue_id', v_booking.venue_id,
    'venue_name', v_booking.venue_name,
    'sport', v_booking.sport,
    'slot_date', v_booking.slot_date,
    'slot_time', v_booking.slot_time,
    'court_number', v_booking.court_number,
    'status', v_booking.status,
    'customer_display_name', CASE
      WHEN v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid THEN v_booking.customer_name
      ELSE regexp_replace(v_booking.customer_name, '(?<=^.).+(?=.?$)', '***')
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. HARDEN PAYMENT VERIFICATION & REPLAY DEFENSE (B3, B4)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_amount numeric,
  p_item_type text,
  p_item_id text,
  p_item_title text,
  p_payment_gateway text DEFAULT 'razorpay',
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
  v_clean_name text;
  v_clean_phone text;
  v_clean_email text;
  v_clean_order_id text;
  v_clean_payment_id text;
  v_clean_item_type text;
  v_clean_status text := 'pending';
  v_existing_id uuid;
  v_existing_status text;
  v_inserted_id uuid;
  v_is_trusted boolean := false;
BEGIN
  v_user_id := auth.uid();
  v_clean_name := trim(coalesce(p_customer_name, ''));
  v_clean_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_clean_email := lower(trim(coalesce(p_customer_email, '')));
  v_clean_order_id := trim(coalesce(p_order_id, ''));
  v_clean_payment_id := trim(coalesce(p_payment_id, ''));
  v_clean_item_type := lower(trim(coalesce(p_item_type, '')));

  -- Use verified helper to determine trusted caller status
  v_is_trusted := public.is_service_role_or_admin();

  -- Only trusted callers can directly record a 'completed' status
  IF v_is_trusted AND lower(trim(coalesce(p_status, ''))) = 'completed' THEN
    v_clean_status := 'completed';
  END IF;

  -- 1. Validate Order ID & Payment ID
  IF char_length(v_clean_order_id) < 3 OR char_length(v_clean_order_id) > 100 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ORDER_ID', 'message', 'Order ID must be between 3 and 100 characters.');
  END IF;

  -- 2. Validate Amount (Strictly Positive)
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_AMOUNT', 'message', 'Payment amount must be greater than zero.');
  END IF;

  -- 3. Validate Customer Name
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Customer name must be between 2 and 120 characters.');
  END IF;

  -- 4. Validate Phone Number (Indian mobile format: 10-15 digits)
  IF char_length(v_clean_phone) < 10 OR char_length(v_clean_phone) > 15 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid mobile number is required (10 to 15 digits).');
  END IF;

  -- 5. Validate Email (if provided)
  IF char_length(v_clean_email) > 0 AND v_clean_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_EMAIL', 'message', 'Invalid email address format.');
  END IF;

  -- 6. Validate Item Type Whitelist
  IF v_clean_item_type NOT IN ('venue_booking', 'pickup_game', 'coaching', 'listing_subscription', 'tournament_entry', 'academy_admission') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ITEM_TYPE', 'message', 'Item type is not recognized.');
  END IF;

  -- 7. Idempotency Check: if order already exists, return existing status without overwriting
  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.khelgrid_payments
  WHERE order_id = v_clean_order_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'idempotent', true,
      'payment_id', v_existing_id,
      'order_id', v_clean_order_id,
      'payment_status', v_existing_status,
      'message', 'Transaction already recorded.'
    );
  END IF;

  -- 8. Atomic Insert
  INSERT INTO public.khelgrid_payments (
    order_id,
    payment_id,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    amount,
    currency,
    item_type,
    item_id,
    item_title,
    payment_gateway,
    payment_method,
    status,
    metadata
  ) VALUES (
    v_clean_order_id,
    nullif(v_clean_payment_id, ''),
    v_user_id,
    v_clean_name,
    v_clean_phone,
    nullif(v_clean_email, ''),
    p_amount,
    'INR',
    v_clean_item_type,
    trim(coalesce(p_item_id, '')),
    trim(coalesce(p_item_title, '')),
    lower(trim(coalesce(p_payment_gateway, 'razorpay'))),
    lower(trim(coalesce(p_payment_method, 'upi'))),
    v_clean_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_inserted_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'idempotent', false,
    'payment_id', v_inserted_id,
    'order_id', v_clean_order_id,
    'payment_status', v_clean_status,
    'message', 'Payment intent recorded as pending verification.'
  );
END;
$$;

-- Server-side / Webhook payment verifier with amount validation & replay defense
CREATE OR REPLACE FUNCTION public.verify_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_expected_amount numeric DEFAULT NULL,
  p_expected_currency text DEFAULT 'INR',
  p_gateway_signature text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_payment record;
  v_updated int;
BEGIN
  -- Strict caller authorization: service_role or admin only
  IF NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Payment verification requires administrative or service privileges.');
  END IF;

  -- Locate existing record
  SELECT id, order_id, amount, currency, status, payment_id
  INTO v_payment
  FROM public.khelgrid_payments
  WHERE order_id = trim(p_order_id)
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Payment record not found for the given order.');
  END IF;

  -- Replay Defense: Reject if already completed
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'ALREADY_COMPLETED',
      'message', 'Payment transaction is already settled and verified.'
    );
  END IF;

  -- Amount & Currency Integrity: Verify amount matches originally recorded order
  IF p_expected_amount IS NOT NULL AND v_payment.amount != p_expected_amount THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'AMOUNT_MISMATCH',
      'message', 'Verified amount does not match original order amount.'
    );
  END IF;

  IF p_expected_currency IS NOT NULL AND v_payment.currency != upper(trim(p_expected_currency)) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'CURRENCY_MISMATCH',
      'message', 'Verified currency does not match original order currency.'
    );
  END IF;

  -- State Transition: pending -> completed
  UPDATE public.khelgrid_payments
  SET status = 'completed',
      payment_id = coalesce(nullif(trim(p_payment_id), ''), payment_id),
      updated_at = now()
  WHERE id = v_payment.id
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'CONCURRENT_UPDATE', 'message', 'Concurrent modification detected during payment verification.');
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', trim(p_order_id),
    'payment_id', coalesce(nullif(trim(p_payment_id), ''), v_payment.payment_id),
    'message', 'Payment verified and settled successfully.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, numeric, text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 5. PROFILE ROLE SELF-ESCALATION TRIGGER CALLER IDENTITY FIX (B3, B6)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_is_trusted boolean := false;
BEGIN
  -- Use verified helper to check if caller is service_role or admin
  v_is_trusted := public.is_service_role_or_admin();

  -- Trusted service workers and administrators can update all fields
  IF v_is_trusted THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Regular users cannot self-escalate role, verification status, or change user ID
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Access denied: Profile role can only be altered by system administrators.';
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Access denied: Verification status can only be modified by identity verification desks.';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Access denied: User identifier cannot be changed.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. PUBLIC PROFILE TABLE PII LEAKAGE REMEDIATION (B6 / E2)
-- -----------------------------------------------------------------------------

-- Drop permissive public read policy that exposed phone and email to direct queries
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_read" ON public.profiles;

-- Authenticated users can only read their OWN full profile
CREATE POLICY "profiles_owner_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND id = auth.uid()
  );

-- Enforce FORCE ROW LEVEL SECURITY on profiles
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

COMMIT;
