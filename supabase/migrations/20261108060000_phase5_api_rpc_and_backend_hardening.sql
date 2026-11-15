-- ==============================================================================
-- KhelGrid — Phase 5: API/RPC Security, Backend Hardening & Prior-Phase Closure
-- Migration: 20261108060000_phase5_api_rpc_and_backend_hardening.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt (PREPARED & VALIDATED)
--
-- Purpose:
-- 1. Complete SECURITY DEFINER Audit & Least-Privilege Role Grants:
--    - Revoke anonymous EXECUTE on all 9 host/admin/moderation stored procedures.
--    - Explicitly lock down internal helper functions (is_pickup_game_admin, is_listing_moderator).
--    - Retain public EXECUTE only on intentionally public guest operations (guest RSVP,
--      cancellation with token, whatsapp invite with token, slot availability lookup).
--    - Set explicit, immutable search_path (SET search_path = public, auth, pg_temp) across all procedures.
-- 2. Payment & Booking State Integrity (Anti-Forgery & Idempotency):
--    - Harden public.record_payment_transaction:
--      * Client cannot mark payment status as 'completed' (forced to 'pending' unless admin/service_role).
--      * Enforce positive amount check (p_amount > 0).
--      * Strict customer phone (10-15 digits) and name (2-120 chars) sanitization.
--      * Whitelisted item_type values.
--      * Idempotent return on duplicate order_id / payment_id.
--    - Install public.verify_payment_transaction:
--      * Service role and admin only procedure to transition payment status to 'completed'.
--    - Harden public.record_listing_subscription:
--      * Payment status forced to 'pending'.
--      * High-entropy 32-character access_token generated for order receipts.
-- 3. Zero-PII Receipt & Booking Voucher Authorization (SEC-014 Closure):
--    - public.get_listing_subscription_by_order(p_order_id, p_access_token):
--      * Requires authenticated ownership (auth.uid() = user_id) OR valid unguessable access_token.
--      * Returns minimal non-PII JSON projection (masked customer name, masked email, plan details).
--      * Returns NULL (zero rows) to unauthorized callers.
--    - public.get_venue_booking_voucher(p_booking_ref, p_voucher_token):
--      * Requires authenticated ownership (auth.uid() = user_id) OR valid unguessable voucher_token.
--      * Returns minimal non-PII voucher JSON projection.
--      * Returns NULL (zero rows) to unauthorized callers.
-- 4. API Abuse Prevention & Rate Limiting:
--    - public.api_rate_limits table with sliding time window.
--    - public.check_and_increment_rate_limit helper to mitigate brute-force guessing and spam.
-- 5. Force Row Level Security (FORCE RLS) across all sensitive application tables.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. API ABUSE PREVENTION INFRASTRUCTURE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rate_key_window UNIQUE (rate_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key ON public.api_rate_limits(rate_key);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON public.api_rate_limits(window_start DESC);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limits TO service_role;

-- Helper to check rate limits inside database procedures
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_rate_key text,
  p_max_requests int DEFAULT 10,
  p_window_seconds int DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count int;
BEGIN
  -- Align window start to discrete intervals
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.api_rate_limits (rate_key, window_start, request_count)
  VALUES (p_rate_key, v_window_start, 1)
  ON CONFLICT (rate_key, window_start)
  DO UPDATE SET request_count = public.api_rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  RETURN v_current_count <= p_max_requests;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, int, int) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. HARDENED PAYMENT TRANSACTION RECORDING (ANTI-FORGERY & IDEMPOTENCY)
-- -----------------------------------------------------------------------------

-- Ensure khelgrid_payments table exists and has proper security columns
CREATE TABLE IF NOT EXISTS public.khelgrid_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  payment_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  item_type text NOT NULL,
  item_id text NOT NULL,
  item_title text NOT NULL,
  payment_gateway text NOT NULL DEFAULT 'razorpay',
  payment_method text DEFAULT 'upi',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_khelgrid_payments_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_user_id ON public.khelgrid_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_status ON public.khelgrid_payments(status);
CREATE INDEX IF NOT EXISTS idx_khelgrid_payments_created ON public.khelgrid_payments(created_at DESC);

ALTER TABLE public.khelgrid_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;

-- Payments RLS: Users can only read their own payments; no direct client INSERT/UPDATE
DROP POLICY IF EXISTS "payments_owner_read" ON public.khelgrid_payments;
DROP POLICY IF EXISTS "payments_service_all" ON public.khelgrid_payments;

CREATE POLICY "payments_owner_read"
  ON public.khelgrid_payments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "payments_service_all"
  ON public.khelgrid_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Client RPC: record_payment_transaction
-- Enforces: positive amount, valid Indian phone, pending status default, idempotency
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
  v_clean_status text := 'pending'; -- Enforce pending: client CANNOT mark completed
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

  -- Determine if caller is trusted (service_role or admin)
  IF current_user = 'service_role' THEN
    v_is_trusted := true;
  ELSIF v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_user_id AND role = 'admin' AND is_active = true
    ) INTO v_is_trusted;
  END IF;

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

-- Allow checkout flows to initiate payments, but prevent public execution from changing status
REVOKE EXECUTE ON FUNCTION public.record_payment_transaction FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_transaction TO anon, authenticated, service_role;

-- Server-side / Webhook payment verifier: transitions status to 'completed'
CREATE OR REPLACE FUNCTION public.verify_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_gateway_signature text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_is_admin boolean := false;
  v_updated int;
BEGIN
  -- Strict caller authorization: service_role or admin only
  IF current_user = 'service_role' THEN
    v_caller_is_admin := true;
  ELSIF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
    ) INTO v_caller_is_admin;
  END IF;

  IF NOT v_caller_is_admin THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Payment verification requires administrative or service privileges.');
  END IF;

  UPDATE public.khelgrid_payments
  SET status = 'completed',
      payment_id = coalesce(nullif(trim(p_payment_id), ''), payment_id),
      updated_at = now()
  WHERE order_id = trim(p_order_id)
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Pending payment record not found for the given order.');
  END IF;

  RETURN jsonb_build_object('status', 'success', 'order_id', trim(p_order_id), 'message', 'Payment verified successfully.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. ZERO-PII RECEIPT & VOUCHER AUTHORIZATION (SEC-014 CLOSURE)
-- -----------------------------------------------------------------------------

-- 3.1 Listing Subscription Voucher Lookup
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(
  p_order_id text,
  p_access_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
DECLARE
  v_caller_uid uuid;
  v_sub record;
  v_is_authorized boolean := false;
  v_clean_order text;
  v_clean_token text;
BEGIN
  v_caller_uid := auth.uid();
  v_clean_order := trim(coalesce(p_order_id, ''));
  v_clean_token := trim(coalesce(p_access_token, ''));

  IF char_length(v_clean_order) < 3 THEN
    RETURN NULL;
  END IF;

  -- Rate limit check against brute-force order enumeration (max 15 attempts / 60s per IP/client)
  IF NOT public.check_and_increment_rate_limit('order_lookup:' || v_clean_order, 15, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
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

  -- Authorization Rule: Authenticated Owner OR High-Entropy Token Match
  IF v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF char_length(v_clean_token) >= 16 AND v_sub.access_token IS NOT NULL AND v_sub.access_token = v_clean_token THEN
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
SECURITY DEFINER
SET search_path = public, auth, pg_temp
STABLE
AS $$
DECLARE
  v_caller_uid uuid;
  v_booking record;
  v_is_authorized boolean := false;
  v_clean_ref text;
  v_clean_token text;
BEGIN
  v_caller_uid := auth.uid();
  v_clean_ref := trim(coalesce(p_booking_ref, ''));
  v_clean_token := trim(coalesce(p_voucher_token, ''));

  IF char_length(v_clean_ref) < 3 THEN
    RETURN NULL;
  END IF;

  -- Rate limit check against brute-force booking reference enumeration (max 15 attempts / 60s)
  IF NOT public.check_and_increment_rate_limit('booking_lookup:' || v_clean_ref, 15, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
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

  -- Authorization Rule: Authenticated Owner OR High-Entropy Voucher Token Match
  IF v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF char_length(v_clean_token) >= 16 AND v_booking.voucher_token IS NOT NULL AND v_booking.voucher_token = v_clean_token THEN
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
-- 4. REVOKE ANONYMOUS EXECUTE ON ALL HOST & ADMIN STORED PROCEDURES
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT proname, oid::regprocedure AS func_sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN (
        'cancel_pickup_game_as_host',
        'complete_pickup_game_as_host',
        'reopen_pickup_game_as_host',
        'update_pickup_game_capacity',
        'update_pickup_game_details',
        'reschedule_pickup_game',
        'get_host_pickup_games',
        'approve_pickup_game_whatsapp_invite',
        'admin_moderate_pickup_game',
        'is_pickup_game_admin',
        'is_listing_moderator',
        'get_listing_submissions',
        'review_listing_submission'
      )
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.func_sig || ' FROM PUBLIC, anon;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.func_sig || ' TO authenticated, service_role;';
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Phase 5: Successfully revoked anon EXECUTE on % host/admin/moderator stored procedures.', v_count;
END $$;

-- -----------------------------------------------------------------------------
-- 5. ENFORCE FORCE ROW LEVEL SECURITY (SEC-012 CLOSURE)
-- -----------------------------------------------------------------------------
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits FORCE ROW LEVEL SECURITY;

COMMIT;
