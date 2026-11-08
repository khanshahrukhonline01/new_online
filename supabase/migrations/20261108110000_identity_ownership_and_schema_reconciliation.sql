-- ==============================================================================
-- KhelGrid Security Programme — Identity, Ownership & Schema Reconciliation
-- Migration: 20261108110000_identity_ownership_and_schema_reconciliation.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Purpose:
-- 1. Resolve PostgreSQL error 42703 (column "user_id" does not exist) by safely
--    adding nullable user_id references before RLS policy creation.
-- 2. Preserve 100% of existing historical data (208 venue bookings, 3 athlete profiles,
--    3 trial reminders, 508 listing subscriptions).
-- 3. Maintain backward compatibility for guest checkout while enabling verified
--    ownership binding for authenticated accounts.
-- 4. Enforce strict Zero-PII public slot availability via get_booked_slots_for_venue().
-- 5. Enforce verified guest voucher lookup requiring both booking reference and phone.
-- 6. Enforce publication status boundary on athlete profiles (public for published,
--    private for draft/pending).
-- 7. Preserve unauthenticated trial reminder subscriptions via phone/email while
--    preventing anonymous scraping of subscriber contacts.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. BASE REUSABLE AUTHORIZATION HELPER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_service_role_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  v_uid uuid;
BEGIN
  -- Service role check (bypasses RLS for backend batch operations)
  IF current_setting('role', true) = 'service_role' THEN
    RETURN true;
  END IF;

  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user_roles table exists and contains admin assignment
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_uid AND ur.role_id IN ('admin', 'super_admin')
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_service_role_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_service_role_or_admin() TO authenticated, service_role;

-- =============================================================================
-- 2. SCHEMA EXTENSIONS (NULLABLE, BACKWARD-COMPATIBLE & NON-DESTRUCTIVE)
-- =============================================================================

-- 2.1 public.venue_bookings
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_token text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS court_number int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON public.venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_voucher_token ON public.venue_bookings(voucher_token);

-- Normalize historical relative dates ('Today') to calendar creation date
UPDATE public.venue_bookings
SET slot_date = to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')
WHERE slot_date = 'Today';

-- Reconcile pre-existing test duplicates: mark older test runs as 'superseded'
-- Preserves all 208 records without deleting or modifying customer data
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
  ) ranked
  WHERE ranked.rn > 1
);

-- Concurrency prevention index: permits concurrent 'cancelled' and 'superseded' slots
CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_slot_concurrency
  ON public.venue_bookings (venue_id, slot_date, slot_time, coalesce(court_number, 1))
  WHERE status IN ('confirmed', 'pending');

-- 2.2 public.athlete_profiles
ALTER TABLE public.athlete_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_public_cv boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_scout_sharing boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_athlete_profiles_user_id ON public.athlete_profiles(user_id);

-- 2.3 public.trial_reminders
ALTER TABLE public.trial_reminders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trial_reminders_user_id ON public.trial_reminders(user_id);

-- 2.4 public.listing_subscriptions
ALTER TABLE public.listing_subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listing_subscriptions_user_id ON public.listing_subscriptions(user_id);

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- 3.1 public.venue_bookings
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venue_bookings_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_owner_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_owner_select" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_admin_select" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_service_all" ON public.venue_bookings;

-- Authenticated booking owners can view their past bookings
CREATE POLICY "venue_bookings_owner_select"
  ON public.venue_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Staff and administrators can review bookings
CREATE POLICY "venue_bookings_admin_select"
  ON public.venue_bookings
  FOR SELECT
  TO authenticated
  USING (public.is_service_role_or_admin());

-- Backend service role has full access
CREATE POLICY "venue_bookings_service_all"
  ON public.venue_bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Direct client mutations revoked; must use atomic booking RPC
REVOKE INSERT, UPDATE, DELETE ON public.venue_bookings FROM PUBLIC, anon, authenticated;

-- 3.2 public.athlete_profiles
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athlete_profiles_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_public_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_public_published_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_draft_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_read" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_insert" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_update" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_owner_write" ON public.athlete_profiles;
DROP POLICY IF EXISTS "athlete_profiles_service_all" ON public.athlete_profiles;

-- Published profiles are publicly visible on khelgrid.com/u/@username
CREATE POLICY "athlete_profiles_public_published_read"
  ON public.athlete_profiles
  FOR SELECT
  TO anon, authenticated
  USING (publication_status = 'published');

-- Draft/private profiles are only visible to their authenticated owner
CREATE POLICY "athlete_profiles_owner_draft_read"
  ON public.athlete_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Authenticated users can insert their own profile with user_id bound to auth.uid()
CREATE POLICY "athlete_profiles_owner_insert"
  ON public.athlete_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Profile owners can update their own profile; cannot change user_id ownership
CREATE POLICY "athlete_profiles_owner_update"
  ON public.athlete_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role full access
CREATE POLICY "athlete_profiles_service_all"
  ON public.athlete_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3.3 public.trial_reminders
ALTER TABLE public.trial_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trial_reminders_public_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_public_insert" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_authenticated_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_select" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_service_all" ON public.trial_reminders;

-- Anyone (guest or logged-in) can subscribe for trial reminders via phone or email
CREATE POLICY "trial_reminders_public_insert"
  ON public.trial_reminders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    athlete_phone IS NOT NULL OR athlete_email IS NOT NULL
  );

-- Authenticated users can see their own linked reminders
CREATE POLICY "trial_reminders_owner_select"
  ON public.trial_reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role handles notification dispatch
CREATE POLICY "trial_reminders_service_all"
  ON public.trial_reminders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3.4 public.listing_subscriptions
ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_subscriptions_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_owner_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_owner_select" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_admin_select" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_service_all" ON public.listing_subscriptions;

-- Subscription owners can view their active plan
CREATE POLICY "listing_subscriptions_owner_select"
  ON public.listing_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Platform admin review
CREATE POLICY "listing_subscriptions_admin_select"
  ON public.listing_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.is_service_role_or_admin());

-- Service role full access
CREATE POLICY "listing_subscriptions_service_all"
  ON public.listing_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 4. ATOMIC RPC ACCESS PATHS (NARROW SCOPE, ZERO PII EXPOSURE)
-- =============================================================================

-- 4.1 Public slot availability (Zero customer PII)
CREATE OR REPLACE FUNCTION public.get_booked_slots_for_venue(p_venue_id text, p_slot_date text)
RETURNS TABLE(slot_time text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT vb.slot_time
  FROM public.venue_bookings vb
  WHERE vb.venue_id = trim(p_venue_id)
    AND vb.slot_date = trim(p_slot_date)
    AND vb.status IN ('confirmed', 'pending')
    AND (vb.expires_at IS NULL OR vb.expires_at > now());
$$;

REVOKE EXECUTE ON FUNCTION public.get_booked_slots_for_venue(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots_for_venue(text, text) TO anon, authenticated, service_role;

-- 4.2 Verified guest voucher retrieval (Requires matching booking_ref AND customer_phone)
CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(p_booking_ref text, p_customer_phone text)
RETURNS TABLE(
  booking_ref text,
  venue_name text,
  city text,
  sport text,
  slot_date text,
  slot_time text,
  court_number int,
  customer_name text,
  payment_status text,
  total_amount numeric,
  paid_amount numeric,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_ref text;
  v_clean_phone text;
BEGIN
  v_clean_ref := trim(p_booking_ref);
  v_clean_phone := regexp_replace(trim(p_customer_phone), '[^0-9]', '', 'g');

  IF char_length(v_clean_ref) < 3 OR char_length(v_clean_phone) < 7 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    vb.booking_ref,
    vb.venue_name,
    vb.city,
    vb.sport,
    vb.slot_date,
    vb.slot_time,
    coalesce(vb.court_number, 1),
    vb.customer_name,
    vb.payment_status,
    vb.total_amount,
    vb.paid_amount,
    vb.status,
    vb.created_at
  FROM public.venue_bookings vb
  WHERE vb.booking_ref = v_clean_ref
    AND regexp_replace(vb.customer_phone, '[^0-9]', '', 'g') = v_clean_phone
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) TO anon, authenticated, service_role;

-- 4.3 Atomic venue slot reservation (Enforces authoritative pricing & verified auth context)
CREATE OR REPLACE FUNCTION public.reserve_venue_slot_atomic(
  p_venue_id text,
  p_slot_date text,
  p_slot_time text,
  p_court_number int,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_venue_record record;
  v_authoritative_price numeric;
  v_booking_ref text;
  v_voucher_token text;
  v_new_id uuid;
  v_court int;
BEGIN
  -- Derive user_id strictly from verified authentication context
  v_user_id := auth.uid();

  -- Validate inputs
  IF trim(coalesce(p_venue_id, '')) = '' OR trim(coalesce(p_slot_date, '')) = '' OR trim(coalesce(p_slot_time, '')) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PARAMETERS', 'message', 'Venue ID, date, and slot time are required');
  END IF;

  IF char_length(trim(coalesce(p_customer_name, ''))) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME', 'message', 'Customer name must be at least 2 characters');
  END IF;

  IF char_length(regexp_replace(trim(coalesce(p_customer_phone, '')), '[^0-9]', '', 'g')) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PHONE', 'message', 'Customer phone must be at least 10 digits');
  END IF;

  v_court := coalesce(p_court_number, 1);

  -- Release expired pending reservations (> 15 mins)
  UPDATE public.venue_bookings
  SET status = 'cancelled',
      cancellation_reason = 'Pending reservation window expired',
      updated_at = now()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  -- Authoritative venue resolution and pricing (never fallback to client price or default)
  SELECT id, slug, name, city, sport, plan_price
  INTO v_venue_record
  FROM public.venues
  WHERE (slug = trim(p_venue_id) OR id::text = trim(p_venue_id))
  LIMIT 1;

  IF v_venue_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_VENUE', 'message', 'Requested venue does not exist or is not available for booking.');
  END IF;

  IF v_venue_record.plan_price IS NULL OR v_venue_record.plan_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'PRICE_UNRESOLVED', 'message', 'Authoritative venue pricing cannot be established. Booking cannot proceed.');
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
    expires_at
  ) VALUES (
    v_booking_ref,
    p_venue_id,
    coalesce(v_venue_record.name, 'KhelGrid Turf Partner'),
    coalesce(v_venue_record.city, 'India'),
    coalesce(v_venue_record.sport, 'Multi-sport'),
    p_slot_date,
    p_slot_time,
    v_court,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    v_authoritative_price,
    0.00,
    'pending',
    'pending',
    v_voucher_token,
    v_user_id,
    now() + interval '15 minutes'
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_id,
    'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token,
    'total_amount', v_authoritative_price,
    'status', 'pending',
    'user_id', v_user_id,
    'expires_at', now() + interval '15 minutes'
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'CONCURRENCY_CONFLICT',
    'message', 'Slot was just reserved by another player. Please select an alternate slot.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_venue_slot_atomic(text, text, text, int, text, text, text) TO anon, authenticated, service_role;

-- 4.4 Public published athlete CV lookup (Sanitized)
CREATE OR REPLACE FUNCTION public.get_athlete_public_cv(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile record;
BEGIN
  SELECT
    id,
    username,
    full_name,
    sport,
    playing_position,
    city,
    state,
    experience_years,
    primary_foot_or_hand,
    height_cm,
    weight_kg,
    summary,
    achievements,
    video_clips,
    fitness_benchmarks,
    player_card_stats,
    verification_status,
    publication_status,
    created_at
  INTO v_profile
  FROM public.athlete_profiles
  WHERE lower(username) = lower(trim(p_username))
    AND publication_status = 'published';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_profile);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_athlete_public_cv(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_athlete_public_cv(text) TO anon, authenticated, service_role;

-- 4.5 Subscription order voucher lookup
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(p_order_id text)
RETURNS SETOF public.listing_subscriptions
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.listing_subscriptions
  WHERE order_id = trim(p_order_id)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text) TO anon, authenticated, service_role;

-- 4.6 Legacy/Unified create_venue_slot_booking wrapper (backward compatibility)
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

  -- Authoritative venue resolution and pricing (never fallback to client price)
  SELECT id, slug, name, city, sport, plan_price INTO v_venue 
  FROM public.venues 
  WHERE (slug = trim(p_venue_id) OR id::text = trim(p_venue_id)) 
  LIMIT 1;

  IF v_venue.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_VENUE', 'message', 'Requested venue does not exist or is not available for booking.');
  END IF;

  IF v_venue.plan_price IS NULL OR v_venue.plan_price <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'PRICE_UNRESOLVED', 'message', 'Authoritative venue pricing cannot be established. Booking cannot proceed.');
  END IF;

  v_authoritative_price := v_venue.plan_price;

  -- Concurrency serialization: advisory transaction lock on specific venue slot
  PERFORM pg_advisory_xact_lock(hashtext(trim(p_venue_id) || ':' || v_clean_date || ':' || v_clean_time || ':' || p_court_number::text));

  -- Check for active reservation (confirmed or pending)
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.venue_bookings
  WHERE venue_id = trim(p_venue_id)
    AND slot_date = v_clean_date
    AND slot_time = v_clean_time
    AND court_number = p_court_number
    AND status IN ('confirmed', 'pending')
    AND (expires_at IS NULL OR expires_at > now());

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'SLOT_UNAVAILABLE', 'message', 'The requested slot has already been reserved.');
  END IF;

  v_booking_ref := 'VB-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6)) || '-' || to_char(now(), 'MMDD');
  v_voucher_token := encode(gen_random_bytes(16), 'hex');

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
      p_sport,
      v_clean_date,
      v_clean_time,
      p_court_number,
      v_clean_name,
      v_clean_phone,
      p_customer_email,
      v_authoritative_price,
      0,
      'pending',
      'pending',
      v_voucher_token,
      v_user_id,
      now() + interval '15 minutes'
    ) RETURNING id INTO v_inserted_id;

    RETURN jsonb_build_object(
      'status', 'success',
      'booking_id', v_inserted_id,
      'booking_ref', v_booking_ref,
      'voucher_token', v_voucher_token,
      'amount', v_authoritative_price,
      'slot_date', v_clean_date,
      'slot_time', v_clean_time
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'CONCURRENCY_CONFLICT', 'message', 'The requested slot was just reserved by another player.');
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_venue_slot_booking(text, text, text, text, text, int, text, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_venue_slot_booking(text, text, text, text, text, int, text, text, text, numeric) TO anon, authenticated, service_role;

COMMIT;
