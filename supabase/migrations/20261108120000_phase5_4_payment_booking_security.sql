-- =============================================================================
-- Migration: 20261108120000_phase5_4_payment_booking_security.sql
-- Description: Phase 5.4 Server-Authoritative Payment Verification, Booking Lifecycle,
--              Voucher Cryptographic Authorization & Public RPC Privacy Hardening.
-- Safe: Strictly forward-only, idempotent, non-destructive, transaction-wrapped.
-- Preserves all historical records (venue_bookings, athlete_profiles, listing_subscriptions).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SCHEMA ENHANCEMENTS & IDEMPOTENCY COLUMNS
-- -----------------------------------------------------------------------------

-- 1.1 Idempotency and voucher token support on public.venue_bookings
ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS voucher_token text;
ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.venue_bookings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_bookings_idempotency
ON public.venue_bookings (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 1.2 Idempotency and access token support on public.listing_subscriptions
ALTER TABLE public.listing_subscriptions ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.listing_subscriptions ADD COLUMN IF NOT EXISTS access_token text;
ALTER TABLE public.listing_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_sub_idempotency
ON public.listing_subscriptions (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 1.3 Ensure private gateway credentials table exists for server-side secrets
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.gateway_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  key_id text,
  key_secret text NOT NULL,
  webhook_secret text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.gateway_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON SCHEMA private TO service_role;
GRANT ALL ON TABLE private.gateway_credentials TO service_role;

-- 1.4 Concurrency index on public.venue_bookings
CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_slot_concurrency
ON public.venue_bookings (venue_id, slot_date, slot_time, coalesce(court_number, 1))
WHERE status IN ('confirmed', 'pending');

-- -----------------------------------------------------------------------------
-- 2. HARDENED PUBLIC RPC: get_booked_slots_for_venue (Zero PII, Expiry Sweeper)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_booked_slots_for_venue(p_venue_id text, p_slot_date text)
RETURNS TABLE(slot_time text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_venue_id IS NULL OR trim(p_venue_id) = '' OR p_slot_date IS NULL OR trim(p_slot_date) = '' THEN
    RETURN;
  END IF;

  -- In-transaction sweep of expired pending reservation holds for this venue and date
  UPDATE public.venue_bookings
  SET status = 'expired',
      updated_at = now()
  WHERE (venue_id = trim(p_venue_id) OR venue_name = trim(p_venue_id))
    AND slot_date = trim(p_slot_date)
    AND status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  -- Return active blocking slots only (Confirmed or Active Pending Hold)
  RETURN QUERY
  SELECT DISTINCT vb.slot_time
  FROM public.venue_bookings vb
  WHERE (vb.venue_id = trim(p_venue_id) OR vb.venue_name = trim(p_venue_id))
    AND vb.slot_date = trim(p_slot_date)
    AND vb.status IN ('confirmed', 'pending');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_booked_slots_for_venue(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots_for_venue(text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. HARDENED ATOMIC BOOKING RPC: reserve_venue_slot_atomic
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reserve_venue_slot_atomic(
  p_venue_id text,
  p_slot_date text,
  p_slot_time text,
  p_court_number int DEFAULT 1,
  p_customer_name text DEFAULT '',
  p_customer_phone text DEFAULT '',
  p_customer_email text DEFAULT NULL,
  p_payment_method text DEFAULT 'online',
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_venue_record record;
  v_authoritative_price numeric;
  v_booking_ref text;
  v_voucher_token text;
  v_new_id uuid;
  v_court int;
  v_clean_idemp text;
  v_clean_method text;
  v_initial_status text;
  v_initial_payment_status text;
  v_expires_at timestamptz;
  v_existing_booking record;
BEGIN
  -- Derive user_id strictly from authenticated session
  v_user_id := auth.uid();

  -- Rate limiting: 20 reservation creations per minute per client
  IF NOT public.check_and_increment_rate_limit('booking_create', 20, 60) THEN
    RETURN jsonb_build_object('success', false, 'error', 'RATE_LIMITED', 'message', 'Too many booking attempts. Please wait a minute and retry.');
  END IF;

  -- Validate inputs
  IF trim(coalesce(p_venue_id, '')) = '' OR trim(coalesce(p_slot_date, '')) = '' OR trim(coalesce(p_slot_time, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARAMETERS', 'message', 'Venue ID, date, and slot time are required.');
  END IF;

  IF char_length(trim(coalesce(p_customer_name, ''))) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME', 'message', 'Customer full name must be at least 2 characters.');
  END IF;

  IF char_length(regexp_replace(trim(coalesce(p_customer_phone, '')), '[^0-9]', '', 'g')) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PHONE', 'message', 'A valid 10-digit mobile number is required.');
  END IF;

  v_court := coalesce(p_court_number, 1);
  IF v_court < 1 OR v_court > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_COURT', 'message', 'Court number must be between 1 and 50.');
  END IF;

  v_clean_method := lower(trim(coalesce(p_payment_method, 'online')));
  v_clean_idemp := nullif(trim(coalesce(p_idempotency_key, '')), '');

  -- Idempotency check: if request was already registered, return existing reservation
  IF v_clean_idemp IS NOT NULL THEN
    SELECT id, booking_ref, voucher_token, total_amount, status, payment_status, expires_at
    INTO v_existing_booking
    FROM public.venue_bookings
    WHERE idempotency_key = v_clean_idemp
    LIMIT 1;

    IF v_existing_booking.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'booking_id', v_existing_booking.id,
        'booking_ref', v_existing_booking.booking_ref,
        'voucher_token', v_existing_booking.voucher_token,
        'total_amount', v_existing_booking.total_amount,
        'status', v_existing_booking.status,
        'payment_status', v_existing_booking.payment_status,
        'expires_at', v_existing_booking.expires_at
      );
    END IF;
  END IF;

  -- Sweep expired pending reservations
  UPDATE public.venue_bookings
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  -- Authoritative venue resolution and pricing
  SELECT id, slug, name, city, sport, plan_price
  INTO v_venue_record
  FROM public.venues
  WHERE (slug = trim(p_venue_id) OR id::text = trim(p_venue_id))
  LIMIT 1;

  IF v_venue_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_VENUE', 'message', 'Requested venue does not exist or is not available for booking.');
  END IF;

  IF v_venue_record.plan_price IS NULL OR v_venue_record.plan_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRICE_UNRESOLVED', 'message', 'Authoritative venue court pricing cannot be established. Booking cannot proceed.');
  END IF;

  v_authoritative_price := v_venue_record.plan_price;

  -- Check existing active reservation
  IF EXISTS (
    SELECT 1 FROM public.venue_bookings
    WHERE venue_id = p_venue_id
      AND slot_date = p_slot_date
      AND slot_time = p_slot_time
      AND coalesce(court_number, 1) = v_court
      AND status IN ('confirmed', 'pending')
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SLOT_ALREADY_RESERVED',
      'message', 'Slot ' || p_slot_time || ' on ' || p_slot_date || ' is already reserved.'
    );
  END IF;

  -- Booking state setup
  IF v_clean_method = 'pay_at_venue' THEN
    v_initial_status := 'confirmed';
    v_initial_payment_status := 'pay_at_venue';
    v_expires_at := NULL;
  ELSE
    v_initial_status := 'pending';
    v_initial_payment_status := 'pending';
    v_expires_at := now() + interval '15 minutes';
  END IF;

  v_booking_ref := 'VB-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6)) || '-' || to_char(now(), 'MMDD');
  v_voucher_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.venue_bookings (
    booking_ref,
    venue_id,
    venue_name,
    city,
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
    expires_at,
    idempotency_key
  ) VALUES (
    v_booking_ref,
    p_venue_id,
    coalesce(v_venue_record.name, 'KhelGrid Turf Partner'),
    coalesce(v_venue_record.city, 'India'),
    coalesce(v_venue_record.sport, 'Multi-sport'),
    p_slot_date,
    p_slot_time,
    v_court,
    trim(p_customer_name),
    regexp_replace(trim(p_customer_phone), '[^0-9]', '', 'g'),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    v_authoritative_price,
    0.00,
    v_initial_payment_status,
    v_initial_status,
    v_voucher_token,
    v_user_id,
    v_expires_at,
    v_clean_idemp
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_id,
    'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token,
    'total_amount', v_authoritative_price,
    'status', v_initial_status,
    'payment_status', v_initial_payment_status,
    'user_id', v_user_id,
    'expires_at', v_expires_at
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'CONCURRENCY_CONFLICT',
    'message', 'Slot was just reserved by another player. Please select an alternate slot.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text, text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. CONFIRM VENUE BOOKING PAY AT VENUE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_venue_booking_pay_at_venue(
  p_booking_ref text,
  p_voucher_token text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_booking record;
BEGIN
  v_caller_uid := auth.uid();

  SELECT id, booking_ref, voucher_token, user_id, status, payment_status, total_amount, expires_at
  INTO v_booking
  FROM public.venue_bookings
  WHERE booking_ref = trim(coalesce(p_booking_ref, ''))
  LIMIT 1;

  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Booking reference not found.');
  END IF;

  -- Authorization check: owner OR voucher_token OR admin
  IF NOT (
    (v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid) OR
    (p_voucher_token IS NOT NULL AND length(trim(p_voucher_token)) >= 16 AND v_booking.voucher_token = trim(p_voucher_token)) OR
    public.is_service_role_or_admin()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Invalid voucher token or caller authorization.');
  END IF;

  -- Check expiry
  IF v_booking.status = 'expired' OR (v_booking.status = 'pending' AND v_booking.expires_at IS NOT NULL AND v_booking.expires_at < now()) THEN
    UPDATE public.venue_bookings SET status = 'expired', updated_at = now() WHERE id = v_booking.id;
    RETURN jsonb_build_object('success', false, 'error', 'EXPIRED', 'message', 'Reservation window has expired.');
  END IF;

  UPDATE public.venue_bookings
  SET status = 'confirmed',
      payment_status = 'pay_at_venue',
      expires_at = NULL,
      updated_at = now()
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_ref', v_booking.booking_ref,
    'status', 'confirmed',
    'payment_status', 'pay_at_venue',
    'total_amount', v_booking.total_amount
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_venue_booking_pay_at_venue(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_venue_booking_pay_at_venue(text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. SANITIZED PUBLIC RPC: get_venue_booking_voucher (Zero PII, Rate Limited)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(
  p_booking_ref text,
  p_voucher_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_clean_ref text;
  v_clean_token text;
  v_booking record;
  v_is_authorized boolean := false;
BEGIN
  v_clean_ref := trim(coalesce(p_booking_ref, ''));
  v_clean_token := trim(coalesce(p_voucher_token, ''));
  v_caller_uid := auth.uid();

  IF char_length(v_clean_ref) < 3 THEN
    RETURN NULL;
  END IF;

  -- Rate limit against brute-force reference guessing (15 requests / 60 seconds)
  IF NOT public.check_and_increment_rate_limit('booking_voucher_lookup:' || v_clean_ref, 15, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many lookup requests. Please try again later.');
  END IF;

  SELECT
    id, booking_ref, venue_name, sport, slot_date, slot_time, court_number,
    status, payment_status, total_amount, paid_amount, customer_name,
    voucher_token, user_id, expires_at
  INTO v_booking
  FROM public.venue_bookings
  WHERE booking_ref = v_clean_ref
  LIMIT 1;

  IF v_booking.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Authorization Rule: Authenticated Owner OR High-Entropy Voucher Token Match OR Admin
  IF (v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid) THEN
    v_is_authorized := true;
  ELSIF (char_length(v_clean_token) >= 16 AND v_booking.voucher_token IS NOT NULL AND v_booking.voucher_token = v_clean_token) THEN
    v_is_authorized := true;
  ELSIF public.is_service_role_or_admin() THEN
    v_is_authorized := true;
  END IF;

  -- Fail closed: unauthorized guessing yields NULL
  IF NOT v_is_authorized THEN
    RETURN NULL;
  END IF;

  -- Return strictly sanitized voucher projection (Shielding phone and email)
  RETURN jsonb_build_object(
    'booking_ref', v_booking.booking_ref,
    'venue_name', v_booking.venue_name,
    'sport', v_booking.sport,
    'slot_date', v_booking.slot_date,
    'slot_time', v_booking.slot_time,
    'court_number', coalesce(v_booking.court_number, 1),
    'status', v_booking.status,
    'payment_status', v_booking.payment_status,
    'total_amount', v_booking.total_amount,
    'paid_amount', v_booking.paid_amount,
    'is_expired', (v_booking.status = 'expired' OR (v_booking.status = 'pending' AND v_booking.expires_at IS NOT NULL AND v_booking.expires_at < now())),
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
-- 6. SANITIZED PUBLIC RPC: get_listing_subscription_by_order (Zero PII, Rate Limited)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(
  p_order_id text,
  p_access_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_clean_order text;
  v_clean_token text;
  v_sub record;
  v_is_authorized boolean := false;
BEGIN
  v_clean_order := trim(coalesce(p_order_id, ''));
  v_clean_token := trim(coalesce(p_access_token, ''));
  v_caller_uid := auth.uid();

  IF char_length(v_clean_order) < 3 THEN
    RETURN NULL;
  END IF;

  -- Rate limit against order brute-force (15 requests / 60 seconds)
  IF NOT public.check_and_increment_rate_limit('order_lookup:' || v_clean_order, 15, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
  END IF;

  SELECT
    id, order_id, user_id, listing_name, listing_type, plan_id, plan_name,
    amount, is_active, starts_at, expires_at, payment_status, access_token
  INTO v_sub
  FROM public.listing_subscriptions
  WHERE order_id = v_clean_order
  LIMIT 1;

  IF v_sub.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Authorization Rule: Authenticated Owner OR High-Entropy Token Match OR Admin
  IF (v_caller_uid IS NOT NULL AND v_sub.user_id = v_caller_uid) THEN
    v_is_authorized := true;
  ELSIF (char_length(v_clean_token) >= 16 AND v_sub.access_token IS NOT NULL AND v_sub.access_token = v_clean_token) THEN
    v_is_authorized := true;
  ELSIF public.is_service_role_or_admin() THEN
    v_is_authorized := true;
  END IF;

  -- Fail closed
  IF NOT v_is_authorized THEN
    RETURN NULL;
  END IF;

  -- Return sanitized projection (Zero PII leak: phone and email omitted)
  RETURN jsonb_build_object(
    'order_id', v_sub.order_id,
    'listing_name', v_sub.listing_name,
    'listing_type', v_sub.listing_type,
    'plan_id', v_sub.plan_id,
    'plan_name', v_sub.plan_name,
    'amount', v_sub.amount,
    'is_active', v_sub.is_active,
    'starts_at', v_sub.starts_at,
    'expires_at', v_sub.expires_at,
    'payment_status', v_sub.payment_status
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. SECURE RPC: record_listing_subscription (Untrusted Callers Cannot Self-Activate)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_listing_subscription(
  p_order_id text,
  p_payment_id text,
  p_listing_type text,
  p_listing_name text,
  p_city text,
  p_plan_id text,
  p_plan_name text,
  p_amount numeric,
  p_duration_days integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_payment_status text DEFAULT 'pending',
  p_listing_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_clean_name text;
  v_clean_phone text;
  v_clean_order text;
  v_clean_idemp text;
  v_access_token text;
  v_is_admin boolean;
  v_active boolean;
  v_status text;
  v_expires_at timestamptz;
  v_existing record;
BEGIN
  v_user_id := auth.uid();
  v_is_admin := public.is_service_role_or_admin();

  -- Rate limit: 15 creation attempts per minute
  IF NOT public.check_and_increment_rate_limit('sub_create', 15, 60) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'RATE_LIMITED', 'message', 'Too many requests. Please try again later.');
  END IF;

  v_clean_order := trim(coalesce(p_order_id, ''));
  v_clean_name := trim(coalesce(p_customer_name, ''));
  v_clean_phone := regexp_replace(trim(coalesce(p_customer_phone, '')), '[^0-9]', '', 'g');
  v_clean_idemp := nullif(trim(coalesce(p_idempotency_key, '')), '');

  IF char_length(v_clean_order) < 3 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ORDER', 'message', 'Order ID is required.');
  END IF;

  IF char_length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Full customer name must be at least 2 characters.');
  END IF;

  IF char_length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid 10-digit mobile number is required.');
  END IF;

  IF p_plan_id NOT IN ('1_day', '1_month', '6_months', '1_year', 'lifelong') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PLAN', 'message', 'Invalid listing plan identifier.');
  END IF;

  -- Idempotency check: if order or idempotency key exists, return it
  SELECT id, order_id, access_token, is_active, payment_status, expires_at
  INTO v_existing
  FROM public.listing_subscriptions
  WHERE order_id = v_clean_order
     OR (v_clean_idemp IS NOT NULL AND idempotency_key = v_clean_idemp)
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'idempotent', true,
      'order_id', v_existing.order_id,
      'access_token', v_existing.access_token,
      'is_active', v_existing.is_active,
      'payment_status', v_existing.payment_status,
      'expires_at', v_existing.expires_at
    );
  END IF;

  -- Enforce plan activation authority
  IF v_is_admin AND p_payment_status = 'paid' THEN
    v_active := true;
    v_status := 'paid';
  ELSE
    -- Untrusted client cannot self-declare 'paid' or active
    v_active := false;
    v_status := 'pending';
  END IF;

  IF p_plan_id = 'lifelong' OR p_duration_days = 0 THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;

  v_access_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.listing_subscriptions (
    order_id,
    payment_id,
    user_id,
    listing_type,
    listing_id,
    listing_name,
    city,
    plan_id,
    plan_name,
    amount,
    duration_days,
    customer_name,
    customer_phone,
    customer_email,
    starts_at,
    expires_at,
    is_active,
    payment_status,
    access_token,
    idempotency_key,
    metadata
  ) VALUES (
    v_clean_order,
    nullif(trim(coalesce(p_payment_id, '')), ''),
    v_user_id,
    p_listing_type,
    nullif(trim(coalesce(p_listing_id, '')), ''),
    trim(p_listing_name),
    trim(p_city),
    p_plan_id,
    trim(p_plan_name),
    p_amount,
    p_duration_days,
    v_clean_name,
    v_clean_phone,
    nullif(trim(coalesce(p_customer_email, '')), ''),
    now(),
    v_expires_at,
    v_active,
    v_status,
    v_access_token,
    v_clean_idemp,
    coalesce(p_metadata, '{}'::jsonb)
  );

  RETURN jsonb_build_object(
    'status', CASE WHEN v_active THEN 'success' ELSE 'pending_verification' END,
    'order_id', v_clean_order,
    'access_token', v_access_token,
    'is_active', v_active,
    'payment_status', v_status,
    'expires_at', v_expires_at,
    'message', CASE
      WHEN v_active THEN 'Subscription activated.'
      ELSE 'Subscription registered in pending verification state. Awaiting payment settlement.'
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 8. CRYPTOGRAPHIC PAYMENT VERIFICATION & ATOMIC SETTLEMENT
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_payment_signature_and_settle(
  p_order_id text,
  p_payment_id text,
  p_gateway_signature text
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, private, extensions, auth, pg_temp
AS $$
DECLARE
  v_payment record;
  v_secret text;
  v_payload text;
  v_expected_sig text;
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' OR
     p_payment_id IS NULL OR trim(p_payment_id) = '' OR
     p_gateway_signature IS NULL OR trim(p_gateway_signature) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARAMETERS', 'message', 'order_id, payment_id, and gateway_signature are required.');
  END IF;

  -- 1. Locate payment record
  SELECT id, order_id, payment_id, amount, currency, status, target_type, target_id, metadata
  INTO v_payment
  FROM public.khelgrid_payments
  WHERE order_id = trim(p_order_id)
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND', 'message', 'Payment order record was not found.');
  END IF;

  -- Replay defense
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_settled', 'message', 'Payment is already settled and confirmed.');
  END IF;

  -- Duplicate payment ID defense across orders
  IF EXISTS (
    SELECT 1 FROM public.khelgrid_payments
    WHERE payment_id = trim(p_payment_id) AND id != v_payment.id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_PAYMENT_ID', 'message', 'Payment ID has already been allocated to a different order.');
  END IF;

  -- 2. Lookup server-held secret from private.gateway_credentials
  SELECT key_secret INTO v_secret
  FROM private.gateway_credentials
  WHERE provider = 'razorpay' AND is_active = true
  LIMIT 1;

  IF v_secret IS NULL OR trim(v_secret) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'GATEWAY_NOT_CONFIGURED',
      'message', 'Live payment gateway secret is not configured in private.gateway_credentials. Payment remains pending.'
    );
  END IF;

  -- 3. Calculate HMAC-SHA256(order_id + "|" + payment_id, secret)
  v_payload := trim(p_order_id) || '|' || trim(p_payment_id);
  v_expected_sig := encode(extensions.hmac(v_payload::bytea, v_secret::bytea, 'sha256'), 'hex');

  IF lower(trim(p_gateway_signature)) != lower(v_expected_sig) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_SIGNATURE',
      'message', 'Cryptographic gateway payment signature verification failed.'
    );
  END IF;

  -- 4. Transactional Settlement: khelgrid_payments
  UPDATE public.khelgrid_payments
  SET status = 'completed',
      payment_id = trim(p_payment_id),
      updated_at = now()
  WHERE id = v_payment.id
    AND status = 'pending';

  -- 5. Transactional target activation
  -- 5.1 Venue Booking Settlement
  IF v_payment.target_type IN ('venue', 'venue_booking') OR v_payment.metadata->>'booking_ref' IS NOT NULL THEN
    UPDATE public.venue_bookings
    SET status = 'confirmed',
        payment_status = 'paid',
        paid_amount = v_payment.amount,
        payment_id = trim(p_payment_id),
        expires_at = NULL,
        updated_at = now()
    WHERE (booking_ref = coalesce(v_payment.metadata->>'booking_ref', v_payment.target_id)
           OR id::text = v_payment.target_id)
      AND status = 'pending';
  END IF;

  -- 5.2 Listing Subscription Settlement
  IF v_payment.target_type = 'listing_subscription' OR EXISTS (SELECT 1 FROM public.listing_subscriptions WHERE order_id = v_payment.order_id) THEN
    UPDATE public.listing_subscriptions
    SET is_active = true,
        payment_status = 'paid',
        payment_id = trim(p_payment_id),
        updated_at = now()
    WHERE (order_id = v_payment.order_id OR id::text = v_payment.target_id)
      AND payment_status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'order_id', trim(p_order_id),
    'payment_id', trim(p_payment_id),
    'message', 'Payment cryptographically verified and settled transactionally.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_signature_and_settle(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_payment_signature_and_settle(text, text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 9. SERVICE ROLE SETTLEMENT PROCEDURE: verify_payment_transaction
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_gateway_signature text,
  p_expected_amount_paisa bigint DEFAULT 0,
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
  v_expected_sig text;
  v_order_paisa bigint;
BEGIN
  -- Strict caller check: service_role or admin
  v_jwt_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role()
  );

  IF v_jwt_role != 'service_role' AND NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Service role required.');
  END IF;

  -- Parameter validation
  IF p_order_id IS NULL OR trim(p_order_id) = '' OR
     p_payment_id IS NULL OR trim(p_payment_id) = '' OR
     p_gateway_signature IS NULL OR trim(p_gateway_signature) = '' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PARAMETERS', 'message', 'order_id, payment_id, and gateway_signature are required.');
  END IF;

  SELECT id, order_id, amount, currency, status, target_type, target_id, metadata
  INTO v_payment
  FROM public.khelgrid_payments
  WHERE order_id = trim(p_order_id)
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Payment record not found.');
  END IF;

  -- Replay defense
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'ALREADY_COMPLETED', 'message', 'Payment transaction is already settled.');
  END IF;

  -- Duplicate payment ID defense
  IF EXISTS (
    SELECT 1 FROM public.khelgrid_payments
    WHERE payment_id = trim(p_payment_id) AND id != v_payment.id
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'DUPLICATE_PAYMENT_ID', 'message', 'Payment ID has already been allocated to a different order.');
  END IF;

  -- Amount & Currency check
  IF p_expected_amount_paisa > 0 THEN
    v_order_paisa := round(v_payment.amount * 100);
    IF p_expected_amount_paisa != v_order_paisa THEN
      RETURN jsonb_build_object('status', 'error', 'error_code', 'AMOUNT_MISMATCH', 'message', 'Verified amount does not match recorded order amount.');
    END IF;
  END IF;

  IF upper(trim(p_expected_currency)) != v_payment.currency THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'CURRENCY_MISMATCH', 'message', 'Currency mismatch.');
  END IF;

  -- Verify signature
  SELECT key_secret INTO v_secret
  FROM private.gateway_credentials
  WHERE provider = 'razorpay' AND is_active = true
  LIMIT 1;

  IF v_secret IS NULL OR trim(v_secret) = '' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GATEWAY_NOT_CONFIGURED', 'message', 'Razorpay secret is not configured. Payment remains pending.');
  END IF;

  v_payload := trim(p_order_id) || '|' || trim(p_payment_id);
  v_expected_sig := encode(extensions.hmac(v_payload::bytea, v_secret::bytea, 'sha256'), 'hex');

  IF lower(trim(p_gateway_signature)) != lower(v_expected_sig) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_SIGNATURE', 'message', 'Gateway signature verification failed.');
  END IF;

  -- Settle transactionally
  UPDATE public.khelgrid_payments
  SET status = 'completed',
      payment_id = trim(p_payment_id),
      updated_at = now()
  WHERE id = v_payment.id
    AND status = 'pending';

  -- Target activation
  IF v_payment.target_type IN ('venue', 'venue_booking') OR v_payment.metadata->>'booking_ref' IS NOT NULL THEN
    UPDATE public.venue_bookings
    SET status = 'confirmed',
        payment_status = 'paid',
        paid_amount = v_payment.amount,
        payment_id = trim(p_payment_id),
        expires_at = NULL,
        updated_at = now()
    WHERE (booking_ref = coalesce(v_payment.metadata->>'booking_ref', v_payment.target_id)
           OR id::text = v_payment.target_id)
      AND status = 'pending';
  END IF;

  IF v_payment.target_type = 'listing_subscription' OR EXISTS (SELECT 1 FROM public.listing_subscriptions WHERE order_id = v_payment.order_id) THEN
    UPDATE public.listing_subscriptions
    SET is_active = true,
        payment_status = 'paid',
        payment_id = trim(p_payment_id),
        updated_at = now()
    WHERE (order_id = v_payment.order_id OR id::text = v_payment.target_id)
      AND payment_status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', trim(p_order_id),
    'payment_id', trim(p_payment_id),
    'message', 'Payment settled successfully.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text, bigint, text) TO service_role;

COMMIT;
