-- ==============================================================================
-- KhelGrid Security Programme — Phase 5.5: Payment Gateway Architecture & Settlement Integrity
-- Migration: 20261108130000_phase5_5_payment_gateway_integration.sql
-- Target Project: hznsbxvovjxvmnchzzqt (Development Supabase Project Only)
--
-- Safety Contract:
-- - Atomic transaction (BEGIN ... COMMIT;)
-- - Non-destructive (no DROP TABLE, no TRUNCATE)
-- - Zero row deletions
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. SCHEMA ENHANCEMENTS: WEBHOOK IDEMPOTENCY & VENUE TARIFF DECOUPLING
-- -----------------------------------------------------------------------------

-- 1.1 Webhook Idempotency Events Table
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  order_id text,
  payment_id text,
  status text NOT NULL DEFAULT 'processed',
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_lookup
  ON public.payment_webhook_events(event_id);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_events_service_all" ON public.payment_webhook_events;
CREATE POLICY "webhook_events_service_all" ON public.payment_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1.2 Decouple Venue Court Booking Tariff from B2B Listing Subscription Plan
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS slot_hourly_fee numeric(10, 2) DEFAULT 800;

UPDATE public.venues
SET slot_hourly_fee = 800
WHERE slot_hourly_fee IS NULL OR slot_hourly_fee <= 0;

-- -----------------------------------------------------------------------------
-- 2. CANONICAL SERVER-SIDE PAYMENT SETTLEMENT RPC (SERVICE_ROLE ONLY)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.settle_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_verification_source text, -- 'checkout_hmac' | 'webhook_verified' | 'gateway_api'
  p_gateway_signature text DEFAULT NULL,
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
  v_clean_order text;
  v_clean_payment text;
BEGIN
  -- 1. Strict caller verification: service_role or admin ONLY
  v_jwt_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role()
  );

  IF v_jwt_role != 'service_role' AND NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Payment settlement requires service_role execution.');
  END IF;

  v_clean_order := trim(coalesce(p_order_id, ''));
  v_clean_payment := trim(coalesce(p_payment_id, ''));

  IF v_clean_order = '' OR v_clean_payment = '' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PARAMETERS', 'message', 'order_id and payment_id are required.');
  END IF;

  -- 2. Locate and lock payment record in transaction (FOR UPDATE)
  SELECT id, order_id, payment_id, amount, currency, status, target_type, target_id, metadata
  INTO v_payment
  FROM public.khelgrid_payments
  WHERE order_id = v_clean_order
  FOR UPDATE
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Payment record not found.');
  END IF;

  -- 3. Replay defense: idempotent acknowledgment if already completed
  IF v_payment.status = 'completed' THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'is_already_settled', true,
      'order_id', v_clean_order,
      'payment_id', coalesce(v_payment.payment_id, v_clean_payment),
      'message', 'Payment is already settled and confirmed.'
    );
  END IF;

  -- 4. Duplicate payment ID defense across different orders
  IF EXISTS (
    SELECT 1 FROM public.khelgrid_payments
    WHERE payment_id = v_clean_payment AND id != v_payment.id
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'DUPLICATE_PAYMENT_ID', 'message', 'Payment ID has already been allocated to a different order.');
  END IF;

  -- 5. Exact Authoritative Amount & Currency Verification
  v_order_paisa := round(v_payment.amount * 100);
  IF p_expected_amount_paisa > 0 AND p_expected_amount_paisa != v_order_paisa THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'AMOUNT_MISMATCH',
      'message', 'Verified amount (' || p_expected_amount_paisa || ' paise) does not match recorded order amount (' || v_order_paisa || ' paise).'
    );
  END IF;

  IF upper(trim(p_expected_currency)) != v_payment.currency THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'CURRENCY_MISMATCH', 'message', 'Currency mismatch.');
  END IF;

  -- 6. Verification Source Validation
  IF p_verification_source = 'checkout_hmac' THEN
    IF p_gateway_signature IS NULL OR trim(p_gateway_signature) = '' THEN
      RETURN jsonb_build_object('status', 'error', 'error_code', 'MISSING_SIGNATURE', 'message', 'Gateway checkout signature required for checkout verification.');
    END IF;

    -- Lookup server-held secret from private.gateway_credentials
    SELECT key_secret INTO v_secret
    FROM private.gateway_credentials
    WHERE provider = 'razorpay' AND is_active = true
    LIMIT 1;

    IF v_secret IS NULL OR trim(v_secret) = '' THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'error_code', 'GATEWAY_NOT_CONFIGURED',
        'message', 'Live payment gateway secret is not configured in private.gateway_credentials. Payment remains pending.'
      );
    END IF;

    -- Verify HMAC-SHA256(order_id + "|" + payment_id, secret)
    v_payload := v_clean_order || '|' || v_clean_payment;
    v_expected_sig := encode(extensions.hmac(v_payload::bytea, v_secret::bytea, 'sha256'), 'hex');

    IF lower(trim(p_gateway_signature)) != lower(v_expected_sig) THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'error_code', 'INVALID_SIGNATURE',
        'message', 'Cryptographic gateway payment signature verification failed.'
      );
    END IF;

  ELSIF p_verification_source IN ('webhook_verified', 'gateway_api') THEN
    -- Signature verified externally by authorized server Edge Function
    NULL;
  ELSE
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_SOURCE', 'message', 'Unsupported verification source.');
  END IF;

  -- 7. Transactional Payment Record Settlement
  UPDATE public.khelgrid_payments
  SET status = 'completed',
      payment_id = v_clean_payment,
      updated_at = now()
  WHERE id = v_payment.id
    AND status IN ('pending', 'pending_verification');

  -- 8. Transactional Target Activation
  -- 8.1 Venue Booking Settlement
  IF v_payment.target_type IN ('venue', 'venue_booking') OR v_payment.metadata->>'booking_ref' IS NOT NULL THEN
    UPDATE public.venue_bookings
    SET status = 'confirmed',
        payment_status = 'paid',
        paid_amount = v_payment.amount,
        payment_id = v_clean_payment,
        expires_at = NULL,
        updated_at = now()
    WHERE (booking_ref = coalesce(v_payment.metadata->>'booking_ref', v_payment.target_id)
           OR id::text = v_payment.target_id)
      AND status = 'pending';
  END IF;

  -- 8.2 Listing Subscription Settlement
  IF v_payment.target_type = 'listing_subscription' OR EXISTS (SELECT 1 FROM public.listing_subscriptions WHERE order_id = v_payment.order_id) THEN
    UPDATE public.listing_subscriptions
    SET is_active = true,
        payment_status = 'paid',
        payment_id = v_clean_payment,
        updated_at = now()
    WHERE (order_id = v_payment.order_id OR id::text = v_payment.target_id)
      AND payment_status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', v_clean_order,
    'payment_id', v_clean_payment,
    'amount', v_payment.amount,
    'currency', v_payment.currency,
    'message', 'Payment cryptographically verified and settled transactionally.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.settle_payment_transaction(text, text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payment_transaction(text, text, text, text, bigint, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. HARDENED SERVICE-ROLE ADAPTER PROCEDURES (RESTRICTED TO SERVICE_ROLE ONLY)
-- -----------------------------------------------------------------------------

-- 3.1 verify_payment_transaction (Adapts legacy calls to canonical settlement)
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
BEGIN
  RETURN public.settle_payment_transaction(
    p_order_id := p_order_id,
    p_payment_id := p_payment_id,
    p_verification_source := 'checkout_hmac',
    p_gateway_signature := p_gateway_signature,
    p_expected_amount_paisa := p_expected_amount_paisa,
    p_expected_currency := p_expected_currency
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_transaction(text, text, text, bigint, text) TO service_role;

-- 3.2 verify_payment_signature_and_settle (RESTRICTED STRICTLY TO SERVICE_ROLE)
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
BEGIN
  RETURN public.settle_payment_transaction(
    p_order_id := p_order_id,
    p_payment_id := p_payment_id,
    p_verification_source := 'checkout_hmac',
    p_gateway_signature := p_gateway_signature,
    p_expected_amount_paisa := 0,
    p_expected_currency := 'INR'
  );
END;
$$;

-- Strict revocation: public/anon/authenticated can NEVER call settlement directly
REVOKE EXECUTE ON FUNCTION public.verify_payment_signature_and_settle(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_signature_and_settle(text, text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. HARDENED VENUE BOOKING RPC (CORRECT COURT TARIFF RESOLUTION)
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
  v_court_price_paisa int;
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
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_COURT', 'message', 'Invalid court number.');
  END IF;

  v_clean_idemp := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_clean_method := lower(trim(coalesce(p_payment_method, 'online')));

  -- Idempotency check: return existing booking if already issued with this key
  IF v_clean_idemp IS NOT NULL THEN
    SELECT id, booking_ref, voucher_token, status, payment_status, total_amount, paid_amount, expires_at
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
        'status', v_existing_booking.status,
        'payment_status', v_existing_booking.payment_status,
        'total_amount', v_existing_booking.total_amount,
        'paid_amount', v_existing_booking.paid_amount,
        'expires_at', v_existing_booking.expires_at
      );
    END IF;
  END IF;

  -- Resolve authoritative venue record
  SELECT id, slug, name, city, sport, slot_hourly_fee
  INTO v_venue_record
  FROM public.venues
  WHERE (slug = trim(p_venue_id) OR id::text = trim(p_venue_id))
  LIMIT 1;

  IF v_venue_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_VENUE', 'message', 'Requested venue does not exist or is not available for booking.');
  END IF;

  -- Authoritative pricing: established from court tariff or venue slot hourly fee (NOT listing plan price)
  SELECT hourly_price_paise INTO v_court_price_paisa
  FROM public.venue_courts
  WHERE venue_id = v_venue_record.id AND is_bookable = true
  LIMIT 1;

  IF v_court_price_paisa IS NOT NULL AND v_court_price_paisa > 0 THEN
    v_authoritative_price := round(v_court_price_paisa / 100.0, 2);
  ELSIF v_venue_record.slot_hourly_fee IS NOT NULL AND v_venue_record.slot_hourly_fee > 0 THEN
    v_authoritative_price := v_venue_record.slot_hourly_fee;
  ELSE
    v_authoritative_price := 800; -- Standard court rate fallback
  END IF;

  -- In-transaction sweep: expire stale pending reservations for this venue/date
  UPDATE public.venue_bookings
  SET status = 'expired',
      updated_at = now()
  WHERE (venue_id = trim(p_venue_id) OR venue_name = trim(p_venue_id))
    AND slot_date = trim(p_slot_date)
    AND status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  -- Concurrency Serialization: Advisory transaction lock on the specific venue slot and court
  PERFORM pg_advisory_xact_lock(
    hashtext(trim(p_venue_id) || ':' || trim(p_slot_date) || ':' || trim(p_slot_time) || ':' || v_court::text)
  );

  -- Check for existing active reservation (confirmed or pending hold)
  IF EXISTS (
    SELECT 1 FROM public.venue_bookings
    WHERE (venue_id = trim(p_venue_id) OR venue_name = trim(p_venue_id))
      AND slot_date = trim(p_slot_date)
      AND slot_time = trim(p_slot_time)
      AND coalesce(court_number, 1) = v_court
      AND status IN ('confirmed', 'pending')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SLOT_UNAVAILABLE',
      'message', 'The requested slot is already reserved for Court ' || v_court || '. Please select another time or court.'
    );
  END IF;

  -- Lifecycle initial state
  IF v_clean_method = 'pay_at_venue' THEN
    v_initial_status := 'confirmed';
    v_initial_payment_status := 'pay_at_venue';
    v_expires_at := NULL;
  ELSE
    -- Online gateway payment: Temporary slot hold with 15-minute TTL
    v_initial_status := 'pending';
    v_initial_payment_status := 'pending';
    v_expires_at := now() + interval '15 minutes';
  END IF;

  v_booking_ref := 'VB-' || upper(substr(md5(random()::text), 1, 4)) || '-' || to_char(now(), 'MMDD') || '-' || substr(md5(clock_timestamp()::text), 1, 4);
  v_voucher_token := encode(gen_random_bytes(24), 'hex');

  BEGIN
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
      status,
      payment_status,
      voucher_token,
      idempotency_key,
      user_id,
      expires_at
    ) VALUES (
      v_booking_ref,
      trim(p_venue_id),
      coalesce(v_venue_record.name, 'KhelGrid Arena'),
      coalesce(v_venue_record.city, 'India'),
      coalesce(v_venue_record.sport, 'Multi-Sport'),
      trim(p_slot_date),
      trim(p_slot_time),
      v_court,
      trim(p_customer_name),
      regexp_replace(trim(p_customer_phone), '[^0-9]', '', 'g'),
      nullif(trim(coalesce(p_customer_email, '')), ''),
      v_authoritative_price,
      0,
      v_initial_status,
      v_initial_payment_status,
      v_voucher_token,
      v_clean_idemp,
      v_user_id,
      v_expires_at
    ) RETURNING id INTO v_new_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CONCURRENCY_CONFLICT',
      'message', 'The requested slot was reserved by another player while processing. Please choose an alternative slot.'
    );
  END;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_id,
    'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token,
    'court_number', v_court,
    'status', v_initial_status,
    'payment_status', v_initial_payment_status,
    'total_amount', v_authoritative_price,
    'expires_at', v_expires_at,
    'hold_minutes', 15
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text, text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. SECURE LISTING SUBSCRIPTION RPC (PREVENTS CLIENT SELF-ACTIVATION)
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

  -- Idempotency check: if order exists, return it
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

  -- Enforce plan activation authority:
  -- Untrusted clients can NEVER self-activate.
  -- Only service_role or admin callers can create directly active subscriptions.
  IF v_is_admin AND p_payment_status = 'paid' THEN
    v_active := true;
    v_status := 'paid';
  ELSE
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
-- 6. RECORD SCHEMA MIGRATION IN SUPABASE METADATA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);

INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
  ('20261108130000', 'phase5_5_payment_gateway_integration')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;

COMMIT;
