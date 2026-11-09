-- ============================================================================
-- Migration: 20261108160000_phase5_7_hosted_db_reconciliation_legacy_rpc_closure.sql
-- Module: KhelGrid Security Programme — Phase 5.7
-- Purpose:
--   1. Athlete profile ownership & RLS reconciliation:
--      - Drop permissive public insert & self update policies (athlete_profiles_public_insert, athlete_profiles_self_update)
--      - Enforce owner-only insert/update and admin moderation
--      - Prevent user_id ownership modification via trigger
--   2. Legacy SECURITY DEFINER RPC security closure:
--      - Revoke public execution of record_payment_transaction
--      - Drop legacy 15-argument record_listing_subscription overload
--      - Drop legacy create_venue_slot_booking overloads (all bookings via reserve_venue_slot_atomic)
--      - Drop legacy 7-argument reserve_venue_slot_atomic overload (with coalesce(..., 500))
--      - Drop legacy single-argument get_listing_subscription_by_order(text)
--      - Drop legacy single-argument get_venue_booking_voucher(text) and enforce 16-char token / owner verification
--   3. Payment status defaults and settlement integrity:
--      - Change unsafe DEFAULT 'paid' to DEFAULT 'pending' across listing_subscriptions, venue_bookings,
--        venues, academies, opportunities, and pickup_games
--      - Preserve all historical records
--   4. Pricing provenance & exact court matching:
--      - Add fee_provenance and pricing_status to venues
--      - Harden reserve_venue_slot_atomic with exact court matching (^Court [0-9]+$) preventing Court 1 matching Court 10
--      - Safe PRICE_UNRESOLVED handling for unverified/unavailable fees
--   5. Security Advisor compliance:
--      - Explicit RLS policies on pickup_game_participants and pickup_game_rsvp_rate_limits
--   6. Verification helper public.verify_security_schema_migrations()
--
-- Environment: KhelGrid Development Supabase (hznsbxvovjxvmnchzzqt)
-- Production restriction: Out of scope. Forward-only. Zero destructive operations.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ATHLETE PROFILE OWNERSHIP & RLS RECONCILIATION (PRIORITY 1)
-- ============================================================================

-- Drop all legacy, permissive or redundant policies on athlete_profiles
DROP POLICY IF EXISTS "athlete_profiles_public_insert" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_self_update" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_public_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_write" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_public_published_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_draft_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_insert" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_update" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_admin_all" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_service_all" ON public.athlete_profiles;

ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles FORCE ROW LEVEL SECURITY;

-- Revoke dangerous direct write grants from anon
REVOKE INSERT, UPDATE, DELETE ON public.athlete_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.athlete_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.athlete_profiles TO authenticated;
GRANT ALL ON public.athlete_profiles TO service_role;

-- 1.1 Public read for published profiles only
CREATE POLICY "athlete_profiles_public_published_read"
  ON public.athlete_profiles
  FOR SELECT
  TO anon, authenticated
  USING (publication_status = 'published');

-- 1.2 Owner read for drafts and unpublished profiles
CREATE POLICY "athlete_profiles_owner_draft_read"
  ON public.athlete_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 1.3 Owner insert: Authenticated users can insert their own profile with user_id matching auth.uid()
CREATE POLICY "athlete_profiles_owner_insert"
  ON public.athlete_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- 1.4 Owner update: Authenticated users can update permitted fields on their own profile
CREATE POLICY "athlete_profiles_owner_update"
  ON public.athlete_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 1.5 Administrator full moderation
CREATE POLICY "athlete_profiles_admin_all"
  ON public.athlete_profiles
  FOR ALL
  TO authenticated
  USING (public.is_pickup_game_admin())
  WITH CHECK (public.is_pickup_game_admin());

-- 1.6 Service role full access
CREATE POLICY "athlete_profiles_service_all"
  ON public.athlete_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 1.7 Prevent user_id ownership reassignment via trigger
CREATE OR REPLACE FUNCTION public.prevent_athlete_profile_user_id_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Cannot modify athlete profile user_id ownership';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_athlete_profile_user_id_change ON public.athlete_profiles;
CREATE TRIGGER trg_prevent_athlete_profile_user_id_change
  BEFORE UPDATE ON public.athlete_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_athlete_profile_user_id_change();


-- ============================================================================
-- 2. PAYMENT STATUS DEFAULTS & SETTLEMENT INTEGRITY (PRIORITY 3)
-- ============================================================================

-- Replace unsafe DEFAULT 'paid' with DEFAULT 'pending' across all relevant tables
-- Existing historical records remain completely untouched.

DO $$
BEGIN
  -- 2.1 listing_subscriptions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'listing_subscriptions' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.listing_subscriptions ALTER COLUMN payment_status SET DEFAULT 'pending';
  END IF;

  -- 2.2 venue_bookings
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'venue_bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.venue_bookings ALTER COLUMN payment_status SET DEFAULT 'pending';
  END IF;

  -- 2.3 venues
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.venues ALTER COLUMN payment_status SET DEFAULT 'pending';
  END IF;

  -- 2.4 academies
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'academies' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.academies ALTER COLUMN payment_status SET DEFAULT 'pending';
  END IF;

  -- 2.5 opportunities
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.opportunities ALTER COLUMN payment_status SET DEFAULT 'pending';
  END IF;

  -- 2.6 pickup_games
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pickup_games' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.pickup_games ALTER COLUMN payment_status SET DEFAULT 'pending';
  END IF;
END;
$$;


-- ============================================================================
-- 3. PRICING PROVENANCE & TARIFF RECONCILIATION (PRIORITY 4)
-- ============================================================================

-- Add provenance tracking to venues table
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS fee_provenance text DEFAULT 'unverified'
    CHECK (fee_provenance IN ('verified', 'unverified', 'exempt', 'unavailable')),
  ADD COLUMN IF NOT EXISTS pricing_status text DEFAULT 'unverified'
    CHECK (pricing_status IN ('verified', 'unverified', 'unavailable'));

-- Set fee_provenance for government facilities without verified commercial tariffs
UPDATE public.venues
SET fee_provenance = 'unverified', pricing_status = 'unverified'
WHERE government_facility = true AND (fee_provenance IS NULL OR fee_provenance = 'unverified');


-- ============================================================================
-- 4. LEGACY SECURITY DEFINER RPC SECURITY CLOSURE (PRIORITY 2)
-- ============================================================================

-- 4.1 record_payment_transaction: Revoke public execution
REVOKE EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb) TO service_role;

-- 4.2 Legacy record_listing_subscription (15-arg overload): Revoke and drop
REVOKE EXECUTE ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb);

-- 4.3 Legacy create_venue_slot_booking: revoke and drop the verified hosted signature.
-- Do not swallow errors: dependent objects or an unexpected schema must abort this transaction.
REVOKE EXECUTE ON FUNCTION public.create_venue_slot_booking(text, text, text, text, text, text, text, text, numeric, numeric, text, text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.create_venue_slot_booking(text, text, text, text, text, text, text, text, numeric, numeric, text, text);

-- 4.4 Legacy seven-argument reserve overload uses an INTEGER court number.
DROP FUNCTION IF EXISTS public.reserve_venue_slot_atomic(text, text, text, integer, text, text, text);

-- 4.5 Legacy single-argument get_listing_subscription_by_order: Revoke and drop
REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.get_listing_subscription_by_order(text);

-- 4.6 Legacy single-argument get_venue_booking_voucher: Revoke and drop
-- The hosted database has no single-argument voucher overload; do not
-- issue a non-IF-EXISTS REVOKE against a nonexistent signature.

-- 4.7 Replace the legacy phone-based TABLE RPC with a token-based JSONB RPC.
-- The response retains the frontend's status/customer_display_name fields.
REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.get_venue_booking_voucher(text, text);

CREATE FUNCTION public.get_venue_booking_voucher(
  p_booking_ref text,
  p_voucher_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_booking record;
  v_is_owner boolean := false;
  v_clean_ref text;
  v_clean_token text;
  v_display_name text;
  v_display_phone text;
BEGIN
  v_clean_ref := upper(trim(coalesce(p_booking_ref, '')));
  v_clean_token := trim(coalesce(p_voucher_token, ''));

  IF v_clean_ref = '' OR length(v_clean_ref) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_BOOKING_REF');
  END IF;

  SELECT vb.* INTO v_booking
  FROM public.venue_bookings vb
  WHERE vb.booking_ref = v_clean_ref;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF (auth.jwt()->>'role') = 'service_role' THEN
    v_is_owner := true;
  ELSIF auth.uid() IS NOT NULL
        AND v_booking.user_id IS NOT NULL
        AND auth.uid() = v_booking.user_id THEN
    v_is_owner := true;
  ELSIF length(v_clean_token) >= 16
        AND v_booking.voucher_token IS NOT NULL
        AND v_booking.voucher_token = v_clean_token THEN
    v_is_owner := false;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'ACCESS_DENIED');
  END IF;

  v_display_name := CASE
    WHEN v_is_owner THEN v_booking.customer_name
    ELSE left(v_booking.customer_name, 1) || '***'
  END;
  v_display_phone := CASE
    WHEN v_is_owner THEN v_booking.customer_phone
    ELSE repeat('*', greatest(length(v_booking.customer_phone) - 4, 0)) || right(v_booking.customer_phone, 4)
  END;

  RETURN jsonb_build_object(
    'success', true,
    'booking_ref', v_booking.booking_ref,
    'venue_id', v_booking.venue_id,
    'venue_name', v_booking.venue_name,
    'city', v_booking.city,
    'sport', v_booking.sport,
    'slot_date', v_booking.slot_date,
    'slot_time', v_booking.slot_time,
    'court_number', v_booking.court_number,
    'total_amount', v_booking.total_amount,
    'paid_amount', v_booking.paid_amount,
    'payment_status', v_booking.payment_status,
    'status', v_booking.status,
    'customer_display_name', v_display_name,
    'customer_name', v_display_name,
    'customer_phone', v_display_phone,
    'created_at', v_booking.created_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) TO anon, authenticated, service_role;

-- 4.8 Booking schema reconciliation: Phase 5.5 referenced this key before it
-- existed on the hosted table. Add it safely and enforce one booking per key.
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_bookings_idempotency
  ON public.venue_bookings (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Remove the legacy fabricated default tariff. Existing values remain in place,
-- but booking authorization below requires explicit verified pricing provenance.
ALTER TABLE public.venues
  ALTER COLUMN slot_hourly_fee DROP DEFAULT;

-- Private booking rate limiter. It stores a one-way identifier derived from the
-- normalized customer phone; it never stores the phone number itself.
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_attempt_count integer;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF nullif(trim(coalesce(p_identifier, '')), '') IS NULL
     OR p_limit < 1
     OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO public.pickup_game_rsvp_rate_limits (
    identifier, attempt_count, first_attempt_at, last_attempt_at
  )
  VALUES (p_identifier, 1, v_now, v_now)
  ON CONFLICT (identifier) DO UPDATE
  SET
    attempt_count = CASE
      WHEN public.pickup_game_rsvp_rate_limits.first_attempt_at
           <= v_now - make_interval(secs => p_window_seconds)
      THEN 1
      ELSE public.pickup_game_rsvp_rate_limits.attempt_count + 1
    END,
    first_attempt_at = CASE
      WHEN public.pickup_game_rsvp_rate_limits.first_attempt_at
           <= v_now - make_interval(secs => p_window_seconds)
      THEN v_now
      ELSE public.pickup_game_rsvp_rate_limits.first_attempt_at
    END,
    last_attempt_at = v_now
  RETURNING attempt_count INTO v_attempt_count;

  RETURN v_attempt_count <= p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer) TO service_role;

-- Keep the hosted nine-argument RPC contract: paymentService.ts sends
-- p_payment_method, and venue_bookings uses status/expires_at.
-- The hosted nine-argument function has defaults. PostgreSQL does not allow
-- CREATE OR REPLACE to remove existing argument defaults; no dependent objects
-- were found in the hosted catalog, so replace it explicitly and re-grant access.
REVOKE EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, integer, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.reserve_venue_slot_atomic(text, text, text, integer, text, text, text, text, text);

CREATE FUNCTION public.reserve_venue_slot_atomic(
  p_venue_id text,
  p_slot_date text,
  p_slot_time text,
  p_court_number integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_payment_method text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
  v_venue record;
  v_court_price_paisa integer;
  v_price numeric(10,2);
  v_booking_ref text;
  v_voucher_token text;
  v_existing record;
  v_court integer;
  v_slot_date text;
  v_phone text;
  v_email text;
  v_idempotency_key text;
  v_method text;
  v_status text;
  v_payment_status text;
  v_expires_at timestamptz;
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_booking_id uuid;
BEGIN
  p_venue_id := trim(coalesce(p_venue_id, ''));
  v_slot_date := trim(coalesce(p_slot_date, ''));
  p_slot_time := trim(coalesce(p_slot_time, ''));
  p_customer_name := trim(coalesce(p_customer_name, ''));
  v_phone := regexp_replace(trim(coalesce(p_customer_phone, '')), '[^0-9]', '', 'g');
  v_email := nullif(lower(trim(coalesce(p_customer_email, ''))), '');
  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_method := lower(trim(coalesce(p_payment_method, 'online')));
  v_court := coalesce(p_court_number, 1);

  IF p_venue_id = '' OR v_slot_date = '' OR p_slot_time = '' OR length(p_customer_name) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  END IF;
  IF length(v_phone) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PHONE');
  END IF;
  IF v_slot_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_DATE');
  END IF;
  IF v_court < 1 OR v_court > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_COURT');
  END IF;
  IF v_method NOT IN ('online', 'pay_at_venue') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PAYMENT_METHOD');
  END IF;

  IF v_idempotency_key IS NOT NULL THEN
    SELECT id, booking_ref, voucher_token, status, payment_status, total_amount, paid_amount, expires_at
      INTO v_existing
    FROM public.venue_bookings
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true, 'idempotent', true,
        'booking_id', v_existing.id, 'booking_ref', v_existing.booking_ref,
        'voucher_token', v_existing.voucher_token, 'status', v_existing.status,
        'payment_status', v_existing.payment_status, 'total_amount', v_existing.total_amount,
        'paid_amount', v_existing.paid_amount, 'expires_at', v_existing.expires_at
      );
    END IF;
  END IF;

  IF NOT public.check_and_increment_rate_limit('venue_booking:' || md5(v_phone), 20, 60) THEN
    RETURN jsonb_build_object('success', false, 'error', 'RATE_LIMITED');
  END IF;

  SELECT id, slug, name, city, sport, slot_hourly_fee, fee_provenance, pricing_status
    INTO v_venue
  FROM public.venues
  WHERE slug = p_venue_id OR id::text = p_venue_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VENUE_NOT_FOUND');
  END IF;

  IF v_venue.fee_provenance IS DISTINCT FROM 'verified'
     OR v_venue.pricing_status IS DISTINCT FROM 'verified' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRICE_UNRESOLVED');
  END IF;

  SELECT hourly_price_paise INTO v_court_price_paisa
  FROM public.venue_courts
  WHERE venue_id = v_venue.id
    AND is_bookable = true
    AND (
      lower(trim(name)) = 'court ' || v_court::text
      OR lower(trim(name)) = 'court' || v_court::text
      OR lower(trim(name)) = v_court::text
    )
  LIMIT 1;

  IF v_court_price_paisa IS NOT NULL AND v_court_price_paisa > 0 THEN
    v_price := round(v_court_price_paisa / 100.0, 2);
  ELSIF v_venue.slot_hourly_fee IS NOT NULL AND v_venue.slot_hourly_fee > 0 THEN
    v_price := v_venue.slot_hourly_fee;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'PRICE_UNRESOLVED');
  END IF;

  UPDATE public.venue_bookings
  SET status = 'expired', updated_at = v_now
  WHERE venue_id = v_venue.slug
    AND slot_date = v_slot_date
    AND status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at <= v_now;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_venue.slug || ':' || v_slot_date || ':' || p_slot_time || ':' || v_court::text, 0)
  );

  -- Recheck idempotency after taking the slot lock so concurrent retries
  -- return the original booking rather than a slot-conflict response.
  IF v_idempotency_key IS NOT NULL THEN
    SELECT id, booking_ref, voucher_token, status, payment_status, total_amount, paid_amount, expires_at
      INTO v_existing
    FROM public.venue_bookings
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true, 'idempotent', true,
        'booking_id', v_existing.id, 'booking_ref', v_existing.booking_ref,
        'voucher_token', v_existing.voucher_token, 'status', v_existing.status,
        'payment_status', v_existing.payment_status, 'total_amount', v_existing.total_amount,
        'paid_amount', v_existing.paid_amount, 'expires_at', v_existing.expires_at
      );
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.venue_bookings
    WHERE venue_id = v_venue.slug
      AND slot_date = v_slot_date
      AND slot_time = p_slot_time
      AND coalesce(court_number, 1) = v_court
      AND status IN ('confirmed', 'pending')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLOT_ALREADY_BOOKED');
  END IF;

  IF v_method = 'pay_at_venue' THEN
    v_status := 'confirmed';
    v_payment_status := 'pay_at_venue';
    v_expires_at := NULL;
  ELSE
    v_status := 'pending';
    v_payment_status := 'pending';
    v_expires_at := v_now + interval '15 minutes';
  END IF;

  v_booking_ref := 'VB-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
  v_voucher_token := encode(extensions.gen_random_bytes(24), 'hex');

  BEGIN
    INSERT INTO public.venue_bookings (
      booking_ref, venue_id, venue_name, city, sport, slot_date, slot_time,
      court_number, customer_name, customer_phone, customer_email,
      total_amount, paid_amount, status, payment_status, voucher_token,
      idempotency_key, user_id, expires_at, updated_at
    )
    VALUES (
      v_booking_ref, v_venue.slug, v_venue.name, v_venue.city, v_venue.sport,
      v_slot_date, p_slot_time, v_court, p_customer_name, v_phone, v_email,
      v_price, 0, v_status, v_payment_status, v_voucher_token,
      v_idempotency_key, v_user_id, v_expires_at, v_now
    )
    RETURNING id INTO v_booking_id;
  EXCEPTION WHEN unique_violation THEN
    IF v_idempotency_key IS NOT NULL THEN
      SELECT id, booking_ref, voucher_token, status, payment_status, total_amount, paid_amount, expires_at
        INTO v_existing
      FROM public.venue_bookings
      WHERE idempotency_key = v_idempotency_key
      LIMIT 1;
      IF FOUND THEN
        RETURN jsonb_build_object(
          'success', true, 'idempotent', true,
          'booking_id', v_existing.id, 'booking_ref', v_existing.booking_ref,
          'voucher_token', v_existing.voucher_token, 'status', v_existing.status,
          'payment_status', v_existing.payment_status, 'total_amount', v_existing.total_amount,
          'paid_amount', v_existing.paid_amount, 'expires_at', v_existing.expires_at
        );
      END IF;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'CONCURRENCY_CONFLICT');
  END;

  RETURN jsonb_build_object(
    'success', true, 'idempotent', false,
    'booking_id', v_booking_id, 'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token, 'court_number', v_court,
    'status', v_status, 'payment_status', v_payment_status,
    'total_amount', v_price, 'paid_amount', 0,
    'expires_at', v_expires_at,
    'hold_minutes', CASE WHEN v_expires_at IS NULL THEN NULL ELSE 15 END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, integer, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, integer, text, text, text, text, text) TO anon, authenticated, service_role;

-- ============================================================================
-- 5. EXPLICIT RLS ON INTERNAL/BACKEND TABLES (PRIORITY 9)
-- ============================================================================

-- 5.1 pickup_game_participants
ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_game_participants_owner_read" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_game_participants_service_all" ON public.pickup_game_participants;

CREATE POLICY "pickup_game_participants_owner_read"
  ON public.pickup_game_participants
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "pickup_game_participants_service_all"
  ON public.pickup_game_participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5.2 pickup_game_rsvp_rate_limits
ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_game_rsvp_rate_limits_service_all" ON public.pickup_game_rsvp_rate_limits;

CREATE POLICY "pickup_game_rsvp_rate_limits_service_all"
  ON public.pickup_game_rsvp_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- 6. READ-ONLY VERIFICATION AUDIT FUNCTION (PRIORITY 5 & 9)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_security_schema_migrations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, information_schema, pg_catalog, pg_temp
AS $$
DECLARE
  v_has_permissive_insert boolean;
  v_has_permissive_update boolean;
  v_sub_default text;
  v_vb_default text;
  v_legacy_15_arg_exists boolean;
  v_legacy_sub_by_order_exists boolean;
BEGIN
  -- Check permissive policies on athlete_profiles
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'athlete_profiles'
      AND policyname = 'athlete_profiles_public_insert'
  ) INTO v_has_permissive_insert;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'athlete_profiles'
      AND policyname = 'athlete_profiles_self_update'
  ) INTO v_has_permissive_update;

  -- Check defaults on listing_subscriptions and venue_bookings
  SELECT column_default INTO v_sub_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'listing_subscriptions' AND column_name = 'payment_status';

  SELECT column_default INTO v_vb_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'venue_bookings' AND column_name = 'payment_status';

  -- Check legacy overloads
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'record_listing_subscription' AND pronargs = 15
  ) INTO v_legacy_15_arg_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_listing_subscription_by_order' AND pronargs = 1
  ) INTO v_legacy_sub_by_order_exists;

  RETURN jsonb_build_object(
    'phase', '5.7',
    'status', CASE
      WHEN NOT v_has_permissive_insert
       AND NOT v_has_permissive_update
       AND NOT v_legacy_15_arg_exists
       AND NOT v_legacy_sub_by_order_exists
       AND (v_sub_default LIKE '%pending%')
       AND (v_vb_default LIKE '%pending%')
      THEN 'fully_reconciled'
      ELSE 'reconciliation_pending'
    END,
    'checks', jsonb_build_object(
      'athlete_profiles_permissive_insert_dropped', NOT v_has_permissive_insert,
      'athlete_profiles_permissive_update_dropped', NOT v_has_permissive_update,
      'listing_subscription_payment_status_default', v_sub_default,
      'venue_booking_payment_status_default', v_vb_default,
      'legacy_15_arg_subscription_rpc_dropped', NOT v_legacy_15_arg_exists,
      'legacy_1_arg_subscription_by_order_rpc_dropped', NOT v_legacy_sub_by_order_exists
    ),
    'verified_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_security_schema_migrations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_security_schema_migrations() TO anon, authenticated, service_role;

COMMIT;
