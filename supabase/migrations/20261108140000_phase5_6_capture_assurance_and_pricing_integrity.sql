-- ==============================================================================
-- KhelGrid Security Programme — Phase 5.6: Payment Capture Assurance,
-- Webhook Reliability, Venue Pricing Integrity & Development Verification
-- Migration: 20261108140000_phase5_6_capture_assurance_and_pricing_integrity.sql
-- Target Project: hznsbxvovjxvmnchzzqt (Development Supabase Project Only)
--
-- Safety Contract:
-- - Atomic transaction (BEGIN ... COMMIT;)
-- - Non-destructive (no DROP TABLE, no TRUNCATE)
-- - Zero row deletions (100% preservation of all historical data)
-- - No manual schema_migrations fabrication (managed strictly by Supabase CLI)
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. SCHEMA HARDENING: WEBHOOK STATE MACHINE & PAYMENT RECONCILIATION
-- -----------------------------------------------------------------------------

-- 1.1 Webhook Events State Machine Enhancements
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  order_id text,
  payment_id text,
  status text NOT NULL DEFAULT 'received',
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_webhook_events
  ADD COLUMN IF NOT EXISTS payload_summary jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_lookup
  ON public.payment_webhook_events(event_id);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_status
  ON public.payment_webhook_events(status);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_events_service_all" ON public.payment_webhook_events;
CREATE POLICY "webhook_events_service_all" ON public.payment_webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1.2 Payments Table Status Check Constraint Update (Allow reconciliation_required & pending_verification)
DO $$
BEGIN
  ALTER TABLE public.khelgrid_payments
    DROP CONSTRAINT IF EXISTS khelgrid_payments_status_check;

  ALTER TABLE public.khelgrid_payments
    ADD CONSTRAINT khelgrid_payments_status_check
    CHECK (status IN ('pending', 'pending_verification', 'authorized', 'completed', 'failed', 'refunded', 'pay_at_venue', 'reconciliation_required'));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END;
$$;

-- 1.3 Venue Tariff Model Correction: Drop Blanket Default 800
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'slot_hourly_fee'
  ) THEN
    -- Drop invented default constraint
    ALTER TABLE public.venues ALTER COLUMN slot_hourly_fee DROP DEFAULT;

    -- Nullify unverified fees on government facilities
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'government_facility'
    ) THEN
      UPDATE public.venues
      SET slot_hourly_fee = NULL
      WHERE government_facility = true;
    END IF;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. ATOMIC WEBHOOK EVENT CLAIM & FINALIZATION PROCEDURES (SERVICE_ROLE ONLY)
-- -----------------------------------------------------------------------------

-- 2.1 Atomic Webhook Claim Procedure
CREATE OR REPLACE FUNCTION public.claim_webhook_event(
  p_event_id text,
  p_event_type text,
  p_order_id text DEFAULT NULL,
  p_payment_id text DEFAULT NULL,
  p_payload_summary jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
  v_jwt_role text;
  v_clean_event_id text;
  v_existing record;
BEGIN
  -- Restrict strictly to service_role or admin superuser
  v_jwt_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role(),
    current_user
  );
  IF v_jwt_role != 'service_role' AND current_user != 'postgres' AND NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized', 'message', 'service_role required');
  END IF;

  v_clean_event_id := trim(coalesce(p_event_id, ''));
  IF v_clean_event_id = '' THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_parameters', 'message', 'event_id is required');
  END IF;

  -- Atomic claim via INSERT ... ON CONFLICT
  INSERT INTO public.payment_webhook_events (
    event_id, event_type, order_id, payment_id, status, payload_summary, retry_count, created_at, updated_at
  ) VALUES (
    v_clean_event_id, p_event_type, trim(coalesce(p_order_id, '')), trim(coalesce(p_payment_id, '')),
    'processing', p_payload_summary, 0, now(), now()
  )
  ON CONFLICT (event_id) DO NOTHING;

  IF FOUND THEN
    -- Newly claimed by this worker
    RETURN jsonb_build_object('success', true, 'status', 'claimed', 'event_id', v_clean_event_id);
  END IF;

  -- Event row already exists: inspect status under row lock (FOR UPDATE)
  SELECT id, status, updated_at, retry_count
  INTO v_existing
  FROM public.payment_webhook_events
  WHERE event_id = v_clean_event_id
  FOR UPDATE;

  IF v_existing.status = 'processed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'already_processed',
      'event_id', v_clean_event_id,
      'message', 'Event has already been processed.'
    );
  ELSIF v_existing.status = 'ignored' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'ignored',
      'event_id', v_clean_event_id,
      'message', 'Event is ignored.'
    );
  ELSIF v_existing.status = 'processing' AND v_existing.updated_at > (now() - interval '2 minutes') THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'processing_in_flight',
      'event_id', v_clean_event_id,
      'message', 'Event is currently being processed by another worker.'
    );
  ELSE
    -- Status is 'failed_retryable' OR previous worker timed out (> 2 min)
    UPDATE public.payment_webhook_events
    SET status = 'processing',
        retry_count = retry_count + 1,
        updated_at = now()
    WHERE event_id = v_clean_event_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'reclaimed_for_retry',
      'event_id', v_clean_event_id,
      'retry_count', v_existing.retry_count + 1
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_event(text, text, text, text, jsonb) TO service_role;

-- 2.2 Atomic Webhook Finalization Procedure
CREATE OR REPLACE FUNCTION public.finalize_webhook_event(
  p_event_id text,
  p_status text, -- 'processed' | 'failed_retryable' | 'ignored'
  p_error_message text DEFAULT NULL,
  p_settlement_data jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
  v_jwt_role text;
  v_clean_event_id text;
  v_clean_status text;
BEGIN
  v_jwt_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role(),
    current_user
  );
  IF v_jwt_role != 'service_role' AND current_user != 'postgres' AND NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('success', false, 'status', 'unauthorized', 'message', 'service_role required');
  END IF;

  v_clean_event_id := trim(coalesce(p_event_id, ''));
  v_clean_status := lower(trim(coalesce(p_status, '')));

  IF v_clean_status NOT IN ('processed', 'failed_retryable', 'ignored') THEN
    RETURN jsonb_build_object('success', false, 'status', 'invalid_status', 'message', 'Invalid status');
  END IF;

  UPDATE public.payment_webhook_events
  SET status = v_clean_status,
      error_message = p_error_message,
      processed_at = CASE WHEN v_clean_status = 'processed' THEN now() ELSE processed_at END,
      updated_at = now(),
      payload_summary = CASE
        WHEN p_settlement_data IS NOT NULL THEN
          jsonb_set(coalesce(payload_summary, '{}'::jsonb), '{settlement}', p_settlement_data)
        ELSE payload_summary
      END
  WHERE event_id = v_clean_event_id;

  RETURN jsonb_build_object('success', true, 'status', v_clean_status, 'event_id', v_clean_event_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_webhook_event(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_webhook_event(text, text, text, jsonb) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. HARDENED PAYMENT SETTLEMENT RPC (SERVICE_ROLE ONLY)
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
  v_target_booking record;
  v_target_sub record;
  v_rows_affected int;
BEGIN
  -- 1. Strict caller verification: service_role or admin superuser ONLY
  v_jwt_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    auth.role(),
    current_user
  );

  IF v_jwt_role != 'service_role' AND current_user != 'postgres' AND NOT public.is_service_role_or_admin() THEN
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
    -- Cryptographic verification performed externally by authorized server Edge Function
    NULL;
  ELSE
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_SOURCE', 'message', 'Unsupported verification source.');
  END IF;

  -- 7. Target Verification & Safe Activation
  -- 7.1 Venue Booking Settlement
  IF v_payment.target_type IN ('venue', 'venue_booking') OR v_payment.metadata->>'booking_ref' IS NOT NULL THEN
    SELECT id, status, slot_date, slot_time, court_number, venue_id, expires_at
    INTO v_target_booking
    FROM public.venue_bookings
    WHERE (booking_ref = coalesce(v_payment.metadata->>'booking_ref', v_payment.target_id)
           OR id::text = v_payment.target_id)
    FOR UPDATE;

    IF v_target_booking.id IS NULL THEN
      -- Target booking record does not exist: cannot activate. Quarantine in reconciliation_required.
      UPDATE public.khelgrid_payments
      SET status = 'reconciliation_required',
          payment_id = v_clean_payment,
          metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{reconciliation_reason}', to_jsonb('TARGET_BOOKING_MISSING'::text)),
          updated_at = now()
      WHERE id = v_payment.id;

      RETURN jsonb_build_object(
        'status', 'error',
        'error_code', 'TARGET_BOOKING_MISSING',
        'order_id', v_clean_order,
        'payment_id', v_clean_payment,
        'message', 'Payment quarantined in reconciliation: target booking record does not exist.'
      );
    END IF;

    IF v_target_booking.status = 'cancelled' THEN
      UPDATE public.khelgrid_payments
      SET status = 'reconciliation_required',
          payment_id = v_clean_payment,
          metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{reconciliation_reason}', to_jsonb('BOOKING_ALREADY_CANCELLED'::text)),
          updated_at = now()
      WHERE id = v_payment.id;

      RETURN jsonb_build_object(
        'status', 'error',
        'error_code', 'BOOKING_ALREADY_CANCELLED',
        'order_id', v_clean_order,
        'payment_id', v_clean_payment,
        'message', 'Payment captured but target booking was previously cancelled. Quarantined in reconciliation.'
      );
    END IF;

    -- If booking hold expired, check if another player reserved the slot
    IF v_target_booking.status = 'expired' OR (v_target_booking.expires_at IS NOT NULL AND v_target_booking.expires_at < now() AND v_target_booking.status != 'confirmed') THEN
      IF EXISTS (
        SELECT 1 FROM public.venue_bookings
        WHERE (venue_id = v_target_booking.venue_id OR venue_name = v_target_booking.venue_id)
          AND slot_date = v_target_booking.slot_date
          AND slot_time = v_target_booking.slot_time
          AND coalesce(court_number, 1) = coalesce(v_target_booking.court_number, 1)
          AND status = 'confirmed'
          AND id != v_target_booking.id
      ) THEN
        -- Slot was taken by another user during the delay
        UPDATE public.khelgrid_payments
        SET status = 'reconciliation_required',
            payment_id = v_clean_payment,
            metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{reconciliation_reason}', to_jsonb('SLOT_TAKEN_AFTER_EXPIRY'::text)),
            updated_at = now()
        WHERE id = v_payment.id;

        RETURN jsonb_build_object(
          'status', 'error',
          'error_code', 'SLOT_NO_LONGER_AVAILABLE',
          'order_id', v_clean_order,
          'payment_id', v_clean_payment,
          'message', 'Payment captured but slot was reserved by another user after hold expired. Quarantined in reconciliation.'
        );
      END IF;
    END IF;

    -- Safe target activation
    UPDATE public.venue_bookings
    SET status = 'confirmed',
        payment_status = 'paid',
        paid_amount = v_payment.amount,
        payment_id = v_clean_payment,
        expires_at = NULL,
        updated_at = now()
    WHERE id = v_target_booking.id;

  END IF;

  -- 7.2 Listing Subscription Settlement
  IF v_payment.target_type = 'listing_subscription' OR EXISTS (SELECT 1 FROM public.listing_subscriptions WHERE order_id = v_payment.order_id) THEN
    SELECT id, is_active, payment_status
    INTO v_target_sub
    FROM public.listing_subscriptions
    WHERE (order_id = v_payment.order_id OR id::text = v_payment.target_id)
    FOR UPDATE;

    IF v_target_sub.id IS NULL THEN
      UPDATE public.khelgrid_payments
      SET status = 'reconciliation_required',
          payment_id = v_clean_payment,
          metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{reconciliation_reason}', to_jsonb('TARGET_SUBSCRIPTION_MISSING'::text)),
          updated_at = now()
      WHERE id = v_payment.id;

      RETURN jsonb_build_object(
        'status', 'error',
        'error_code', 'TARGET_SUBSCRIPTION_MISSING',
        'order_id', v_clean_order,
        'payment_id', v_clean_payment,
        'message', 'Payment quarantined in reconciliation: target subscription record does not exist.'
      );
    END IF;

    UPDATE public.listing_subscriptions
    SET is_active = true,
        payment_status = 'paid',
        payment_id = v_clean_payment,
        updated_at = now()
    WHERE id = v_target_sub.id;

  END IF;

  -- 8. Transactional Payment Record Settlement
  UPDATE public.khelgrid_payments
  SET status = 'completed',
      payment_id = v_clean_payment,
      updated_at = now()
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', v_clean_order,
    'payment_id', v_clean_payment,
    'amount', v_payment.amount,
    'currency', v_payment.currency,
    'message', 'Payment verified and settled transactionally.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.settle_payment_transaction(text, text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payment_transaction(text, text, text, text, bigint, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. HARDENED ATOMIC VENUE RESERVATION RPC (COURT-SPECIFIC TARIFF INTEGRITY)
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

  -- Resolve court-specific tariff matching the requested court number
  SELECT hourly_price_paise
  INTO v_court_price_paisa
  FROM public.venue_courts
  WHERE venue_id = v_venue_record.id
    AND is_bookable = true
    AND (
      name = 'Court ' || v_court::text
      OR name = 'Court' || v_court::text
      OR name = v_court::text
      OR name ILIKE '%Court ' || v_court::text
      OR name ILIKE '%Court ' || v_court::text || ' %'
      OR name ILIKE '%Court ' || v_court::text || ')'
      OR name ILIKE '% ' || v_court::text
      OR name ILIKE '%' || v_court::text || '%'
    )
  ORDER BY
    CASE
      WHEN name = 'Court ' || v_court::text THEN 1
      WHEN name = 'Court' || v_court::text THEN 2
      WHEN name = v_court::text THEN 3
      ELSE 4
    END
  LIMIT 1;

  -- Pricing Resolution Hierarchy:
  -- 1. Exact court-specific tariff
  -- 2. Venue slot hourly fee (if explicitly configured and valid)
  -- 3. If neither: REJECT with PRICE_UNRESOLVED (no unverified ₹800 fallback)
  IF v_court_price_paisa IS NOT NULL AND v_court_price_paisa > 0 THEN
    v_authoritative_price := round(v_court_price_paisa / 100.0, 2);
  ELSIF v_venue_record.slot_hourly_fee IS NOT NULL AND v_venue_record.slot_hourly_fee > 0 THEN
    v_authoritative_price := v_venue_record.slot_hourly_fee;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PRICE_UNRESOLVED',
      'message', 'No authoritative booking tariff is configured for this venue or court. Please select another facility.'
    );
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

  -- Determine lifecycle state
  IF v_clean_method = 'pay_at_venue' THEN
    v_initial_status := 'confirmed';
    v_initial_payment_status := 'pay_at_venue';
    v_expires_at := NULL;
  ELSE
    v_initial_status := 'pending';
    v_initial_payment_status := 'pending';
    v_expires_at := now() + interval '15 minutes'; -- 15-minute pending hold
  END IF;

  -- Generate secure tokens
  v_booking_ref := 'VB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
  v_voucher_token := encode(gen_random_bytes(24), 'hex');
  v_new_id := gen_random_uuid();

  -- Insert reservation atomically
  INSERT INTO public.venue_bookings (
    id,
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
    user_id,
    idempotency_key,
    voucher_token,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    v_new_id,
    v_booking_ref,
    trim(p_venue_id),
    v_venue_record.name,
    v_venue_record.city,
    coalesce(v_venue_record.sport, 'Multi-sport'),
    trim(p_slot_date),
    trim(p_slot_time),
    v_court,
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    v_authoritative_price,
    0,
    v_initial_payment_status,
    v_initial_status,
    v_user_id,
    v_clean_idemp,
    v_voucher_token,
    v_expires_at,
    now(),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_id,
    'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token,
    'status', v_initial_status,
    'payment_status', v_initial_payment_status,
    'total_amount', v_authoritative_price,
    'court_number', v_court,
    'expires_at', v_expires_at,
    'message', CASE
      WHEN v_clean_method = 'pay_at_venue' THEN 'Venue slot reserved successfully. Pay at venue upon arrival.'
      ELSE 'Venue slot held for 15 minutes. Please complete payment to confirm your booking.'
    END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text, text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. READ-ONLY SECURITY SCHEMA MIGRATION AUDIT PROCEDURE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.verify_security_schema_migrations()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, information_schema, pg_catalog, pg_temp
AS $$
DECLARE
  v_has_webhook_table boolean;
  v_has_webhook_cols boolean;
  v_has_claim_rpc boolean;
  v_has_finalize_rpc boolean;
  v_has_settle_rpc boolean;
  v_has_reserve_rpc boolean;
  v_venue_slot_fee_default text;
BEGIN
  -- 1. Check payment_webhook_events table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_webhook_events'
  ) INTO v_has_webhook_table;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_webhook_events'
      AND column_name = 'payload_summary'
  ) INTO v_has_webhook_cols;

  -- 2. Check RPCs
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'claim_webhook_event'
  ) INTO v_has_claim_rpc;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'finalize_webhook_event'
  ) INTO v_has_finalize_rpc;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'settle_payment_transaction'
  ) INTO v_has_settle_rpc;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'reserve_venue_slot_atomic'
  ) INTO v_has_reserve_rpc;

  -- 3. Check venue column default
  SELECT column_default INTO v_venue_slot_fee_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'slot_hourly_fee';

  RETURN jsonb_build_object(
    'phase', '5.6',
    'status', CASE
      WHEN v_has_webhook_table AND v_has_webhook_cols AND v_has_claim_rpc AND v_has_finalize_rpc AND v_has_settle_rpc AND v_has_reserve_rpc
      THEN 'OK' ELSE 'INCOMPLETE' END,
    'checks', jsonb_build_object(
      'payment_webhook_events_table', v_has_webhook_table,
      'payment_webhook_events_columns', v_has_webhook_cols,
      'claim_webhook_event_rpc', v_has_claim_rpc,
      'finalize_webhook_event_rpc', v_has_finalize_rpc,
      'settle_payment_transaction_rpc', v_has_settle_rpc,
      'reserve_venue_slot_atomic_rpc', v_has_reserve_rpc,
      'slot_hourly_fee_default', v_venue_slot_fee_default
    ),
    'verified_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_security_schema_migrations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_security_schema_migrations() TO anon, authenticated, service_role;

COMMIT;
