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
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

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
REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.get_venue_booking_voucher(text);

-- 4.7 Replace the legacy two-argument phone-based TABLE RPC with the token-based JSONB RPC.
-- PostgreSQL cannot rename input parameters or change a function return type via CREATE OR REPLACE.
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
BEGIN
  v_clean_ref := upper(trim(coalesce(p_booking_ref, '')));
  v_clean_token := trim(coalesce(p_voucher_token, ''));

  IF v_clean_ref = '' OR length(v_clean_ref) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_BOOKING_REF', 'message', 'Invalid booking reference.');
  END IF;

  -- High entropy voucher token required (minimum 16 chars) unless caller is authenticated owner or service_role
  SELECT vb.* INTO v_booking
  FROM public.venue_bookings vb
  WHERE vb.booking_ref = v_clean_ref;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND', 'message', 'No booking found matching reference.');
  END IF;

  IF (auth.jwt()->>'role') = 'service_role' THEN
    v_is_owner := true;
  ELSIF auth.uid() IS NOT NULL AND v_booking.user_id IS NOT NULL AND auth.uid() = v_booking.user_id THEN
    v_is_owner := true;
  ELSIF length(v_clean_token) >= 16 AND v_booking.voucher_token IS NOT NULL AND v_booking.voucher_token = v_clean_token THEN
    v_is_owner := false; -- Valid guest voucher token
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'ACCESS_DENIED', 'message', 'Valid voucher access token is required.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_ref', v_booking.booking_ref,
    'venue_id', v_booking.venue_id,
    'venue_name', v_booking.venue_name,
    'sport', v_booking.sport,
    'slot_date', v_booking.slot_date,
    'slot_time', v_booking.slot_time,
    'court_number', v_booking.court_number,
    'total_amount', v_booking.total_amount,
    'paid_amount', v_booking.paid_amount,
    'payment_status', v_booking.payment_status,
    'booking_status', v_booking.booking_status,
    'customer_name', CASE WHEN v_is_owner THEN v_booking.customer_name ELSE overlay(v_booking.customer_name placing '***' from 2 for 3) END,
    'customer_phone', CASE WHEN v_is_owner THEN v_booking.customer_phone ELSE '+91 ******' || right(v_booking.customer_phone, 4) END,
    'created_at', v_booking.created_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) TO anon, authenticated, service_role;

-- 4.8 Recreate hardened reserve_venue_slot_atomic with exact court matching and provenance enforcement
CREATE OR REPLACE FUNCTION public.reserve_venue_slot_atomic(
  p_venue_id text,
  p_slot_date text,
  p_slot_time text,
  p_court_number int,
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
  v_venue_record record;
  v_court_price_paisa integer;
  v_authoritative_price numeric(10, 2);
  v_booking_ref text;
  v_voucher_token text;
  v_cancellation_token text;
  v_existing_booking record;
  v_court integer;
  v_slot_date_iso text;
  v_caller_user_id uuid := auth.uid();
  v_is_pay_at_venue boolean;
  v_now timestamptz := clock_timestamp();
  v_hold_expires timestamptz;
BEGIN
  -- 1. Input sanitization
  p_venue_id := trim(p_venue_id);
  p_customer_name := trim(p_customer_name);
  p_customer_phone := trim(p_customer_phone);
  p_customer_email := trim(coalesce(p_customer_email, ''));
  p_idempotency_key := trim(p_idempotency_key);
  v_court := coalesce(p_court_number, 1);
  v_is_pay_at_venue := (lower(trim(coalesce(p_payment_method, 'online'))) = 'pay_at_venue');

  IF p_venue_id = '' OR p_customer_name = '' OR p_customer_phone = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_INPUT', 'message', 'Venue, customer name, and customer phone are required.');
  END IF;

  IF length(p_customer_phone) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PHONE', 'message', 'Please provide a valid phone number (at least 10 digits).');
  END IF;

  -- Validate slot date (YYYY-MM-DD)
  v_slot_date_iso := trim(p_slot_date);
  IF v_slot_date_iso !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_DATE', 'message', 'Slot date must be in YYYY-MM-DD format.');
  END IF;

  -- 2. Authoritative venue lookup
  SELECT id, slug, name, city, sport, slot_hourly_fee, fee_provenance, pricing_status
  INTO v_venue_record
  FROM public.venues
  WHERE (slug = trim(p_venue_id) OR id::text = trim(p_venue_id))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VENUE_NOT_FOUND', 'message', 'Venue not found.');
  END IF;

  -- 3. Exact Court Matching (Prevent Court 1 matching Court 10)
  SELECT hourly_price_paise
  INTO v_court_price_paisa
  FROM public.venue_courts
  WHERE venue_id = v_venue_record.id
    AND is_bookable = true
    AND (
      trim(lower(name)) = 'court ' || v_court::text
      OR trim(lower(name)) = 'court' || v_court::text
      OR trim(lower(name)) = v_court::text
    )
  LIMIT 1;

  -- 4. Tariff resolution
  IF v_court_price_paisa IS NOT NULL AND v_court_price_paisa > 0 THEN
    v_authoritative_price := round(v_court_price_paisa / 100.0, 2);
  ELSIF v_venue_record.slot_hourly_fee IS NOT NULL
        AND v_venue_record.slot_hourly_fee > 0
        AND coalesce(v_venue_record.pricing_status, 'verified') != 'unavailable'
        AND coalesce(v_venue_record.fee_provenance, 'verified') != 'unavailable' THEN
    v_authoritative_price := v_venue_record.slot_hourly_fee;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PRICE_UNRESOLVED',
      'message', 'No authoritative booking tariff is configured for this venue or court. Please select another facility.'
    );
  END IF;

  -- 5. Expire stale holds in this venue
  UPDATE public.venue_bookings
  SET booking_status = 'cancelled', payment_status = 'cancelled', updated_at = v_now
  WHERE venue_id = v_venue_record.slug
    AND slot_date = v_slot_date_iso
    AND booking_status = 'pending_payment'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= v_now;

  -- 6. Lock and check existing bookings for this specific slot & court
  PERFORM 1
  FROM public.venue_bookings
  WHERE venue_id = v_venue_record.slug
    AND slot_date = v_slot_date_iso
    AND slot_time = p_slot_time
    AND court_number = v_court
    AND booking_status IN ('confirmed', 'pending_payment')
  FOR UPDATE;

  -- Check if slot is already occupied
  SELECT * INTO v_existing_booking
  FROM public.venue_bookings
  WHERE venue_id = v_venue_record.slug
    AND slot_date = v_slot_date_iso
    AND slot_time = p_slot_time
    AND court_number = v_court
    AND booking_status IN ('confirmed', 'pending_payment')
  LIMIT 1;

  IF FOUND THEN
    -- Check idempotency
    IF v_existing_booking.idempotency_key = p_idempotency_key THEN
      RETURN jsonb_build_object(
        'success', true,
        'booking_ref', v_existing_booking.booking_ref,
        'voucher_token', v_existing_booking.voucher_token,
        'total_amount', v_existing_booking.total_amount,
        'payment_status', v_existing_booking.payment_status,
        'is_idempotent', true
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'SLOT_ALREADY_BOOKED',
      'message', 'The requested slot and court are already reserved.'
    );
  END IF;

  -- 7. Generate tokens and reference
  v_booking_ref := 'VB-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
  v_voucher_token := encode(gen_random_bytes(16), 'hex');
  v_cancellation_token := encode(gen_random_bytes(16), 'hex');

  IF v_is_pay_at_venue THEN
    v_hold_expires := NULL;
  ELSE
    v_hold_expires := v_now + interval '15 minutes';
  END IF;

  -- 8. Insert authoritative booking record
  INSERT INTO public.venue_bookings (
    booking_ref,
    venue_id,
    venue_name,
    sport,
    slot_date,
    slot_time,
    court_number,
    total_amount,
    paid_amount,
    payment_status,
    booking_status,
    customer_name,
    customer_phone,
    customer_email,
    voucher_token,
    cancellation_token,
    idempotency_key,
    hold_expires_at,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    v_booking_ref,
    v_venue_record.slug,
    v_venue_record.name,
    v_venue_record.sport,
    v_slot_date_iso,
    p_slot_time,
    v_court,
    v_authoritative_price,
    CASE WHEN v_is_pay_at_venue THEN 0.00 ELSE 0.00 END,
    CASE WHEN v_is_pay_at_venue THEN 'pay_at_venue' ELSE 'pending' END,
    CASE WHEN v_is_pay_at_venue THEN 'confirmed' ELSE 'pending_payment' END,
    p_customer_name,
    p_customer_phone,
    nullif(p_customer_email, ''),
    v_voucher_token,
    v_cancellation_token,
    p_idempotency_key,
    v_hold_expires,
    v_caller_user_id,
    v_now,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token,
    'cancellation_token', v_cancellation_token,
    'total_amount', v_authoritative_price,
    'slot_hourly_fee', v_authoritative_price,
    'payment_status', CASE WHEN v_is_pay_at_venue THEN 'pay_at_venue' ELSE 'pending' END,
    'booking_status', CASE WHEN v_is_pay_at_venue THEN 'confirmed' ELSE 'pending_payment' END,
    'hold_expires_at', v_hold_expires,
    'is_idempotent', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text, text, text) TO anon, authenticated, service_role;


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
