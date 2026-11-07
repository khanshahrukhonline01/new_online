-- ==============================================================================
-- KhelGrid — Phase 2: Row Level Security (RLS) Post-Merge Verification & Remediation
-- Migration: 20261108040000_phase2_rls_post_merge_remediation.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt (PREPARED ONLY — NOT YET APPLIED)
--
-- Purpose:
-- 1. SEC-001/002/003/014 Remediation: Eliminate broad SELECT policies on listing_subscriptions,
--    venue_bookings, and trial_reminders. Replace them with strict owner-only SELECT and
--    high-entropy token-authorized receipt/voucher RPCs with zero-PII minimal projections.
-- 2. SEC-014 Hardening: Eliminate phone/email matching as authorization secrets.
--    Require authenticated session ownership (auth.uid() = user_id) OR an unguessable
--    cryptographic voucher token (voucher_token / access_token). Unauthenticated callers
--    guessing order or booking IDs receive 0 rows.
-- 3. SEC-003 Remediation: Fix unsafe trial_reminders_authenticated_update policy
--    which previously permitted any authenticated user to modify other users' reminders.
-- 4. SEC-015 Remediation: Define explicit RLS policies on tables that had RLS enabled
--    with 0 policies (pickup_game_participants, pickup_game_rsvp_rate_limits).
-- 5. SEC-016 Remediation: Revoke anonymous EXECUTE privileges on all host-only and
--    moderator-only SECURITY DEFINER stored procedures via dynamic catalog query.
--    Eliminate silent exception swallowing.
-- 6. SEC-012 Remediation: Enforce FORCE ROW LEVEL SECURITY on all sensitive tables.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SCHEMA HARDENING: USER_ID & HIGH-ENTROPY VOUCHER TOKENS
-- -----------------------------------------------------------------------------

-- Ensure venue_bookings has user_id and high-entropy voucher_token for secure access
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_token text DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON public.venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_voucher_token ON public.venue_bookings(voucher_token);

-- Ensure listing_subscriptions has user_id and high-entropy access_token
ALTER TABLE public.listing_subscriptions
  ADD COLUMN IF NOT EXISTS access_token text DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE INDEX IF NOT EXISTS idx_listing_subs_access_token ON public.listing_subscriptions(access_token);

-- -----------------------------------------------------------------------------
-- 2. REMEDIATE BROAD SELECT POLICIES (SEC-001, SEC-002, SEC-003)
-- -----------------------------------------------------------------------------

-- 2.1 public.listing_subscriptions
ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "listing_subscriptions_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_owner_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_service_read" ON public.listing_subscriptions;

CREATE POLICY "listing_subscriptions_owner_read"
  ON public.listing_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "listing_subscriptions_service_read"
  ON public.listing_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- 2.2 public.venue_bookings
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venue_bookings_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_owner_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_service_read" ON public.venue_bookings;

CREATE POLICY "venue_bookings_owner_read"
  ON public.venue_bookings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "venue_bookings_service_read"
  ON public.venue_bookings
  FOR SELECT
  TO service_role
  USING (true);

-- 2.3 public.trial_reminders
ALTER TABLE public.trial_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trial_reminders_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_service_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_authenticated_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_update" ON public.trial_reminders;

CREATE POLICY "trial_reminders_owner_read"
  ON public.trial_reminders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

CREATE POLICY "trial_reminders_service_read"
  ON public.trial_reminders
  FOR SELECT
  TO service_role
  USING (true);

-- Restrict UPDATE strictly to the reminder owner with matching WITH CHECK
CREATE POLICY "trial_reminders_owner_update"
  ON public.trial_reminders
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 3. SEC-014: HIGH-ENTROPY TOKEN & OWNER-AUTHORIZED RECEIPT & VOUCHER RPCs
-- -----------------------------------------------------------------------------

-- Drop previous function signatures
DROP FUNCTION IF EXISTS public.get_listing_subscription_by_order(text);
DROP FUNCTION IF EXISTS public.get_listing_subscription_by_order(text, text);
DROP FUNCTION IF EXISTS public.get_venue_booking_voucher(text);
DROP FUNCTION IF EXISTS public.get_venue_booking_voucher(text, text);

-- 3.1 Subscription Order Confirmation RPC:
-- Requires authenticated owner (auth.uid() = user_id) OR high-entropy access_token.
-- Third parties guessing order_id receive 0 rows. Never returns gateway secrets or phone numbers.
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(
  p_order_id text,
  p_access_token text DEFAULT NULL
)
RETURNS TABLE (
  order_id text,
  listing_name text,
  listing_type text,
  plan_tier text,
  is_active boolean,
  expires_at timestamptz,
  status text,
  masked_customer_name text,
  masked_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_trimmed_id text := trim(p_order_id);
  v_rec record;
  v_is_authorized boolean := false;
BEGIN
  IF v_trimmed_id IS NULL OR length(v_trimmed_id) < 3 THEN
    RETURN;
  END IF;

  SELECT * INTO v_rec
  FROM public.listing_subscriptions
  WHERE listing_subscriptions.order_id = v_trimmed_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Authenticated session ownership check
  IF auth.uid() IS NOT NULL AND v_rec.user_id = auth.uid() THEN
    v_is_authorized := true;
  END IF;

  -- 2. Unguessable high-entropy token check (minimum 16 characters)
  IF p_access_token IS NOT NULL AND length(trim(p_access_token)) >= 16 THEN
    IF v_rec.access_token IS NOT NULL AND trim(p_access_token) = v_rec.access_token THEN
      v_is_authorized := true;
    END IF;
  END IF;

  -- Service role override for trusted backend workers
  IF current_user = 'service_role' THEN
    v_is_authorized := true;
  END IF;

  -- Fail-closed: unauthorized callers receive zero rows
  IF NOT v_is_authorized THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_rec.order_id,
    v_rec.listing_name,
    v_rec.listing_type,
    v_rec.plan_tier,
    v_rec.is_active,
    v_rec.expires_at,
    v_rec.status,
    CASE 
      WHEN auth.uid() IS NOT NULL AND v_rec.user_id = auth.uid() THEN v_rec.customer_name
      WHEN length(v_rec.customer_name) > 2 THEN 
        substr(v_rec.customer_name, 1, 1) || '*** ' || substr(v_rec.customer_name, length(v_rec.customer_name), 1)
      ELSE 'Customer'
    END,
    CASE 
      WHEN auth.uid() IS NOT NULL AND v_rec.user_id = auth.uid() THEN v_rec.customer_email
      WHEN v_rec.customer_email LIKE '%@%' THEN
        substr(v_rec.customer_email, 1, 1) || '***@' || split_part(v_rec.customer_email, '@', 2)
      ELSE '***@khelgrid.com'
    END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text, text) TO anon, authenticated, service_role;

-- 3.2 Venue Booking Voucher RPC:
-- Requires authenticated owner (auth.uid() = user_id) OR unguessable high-entropy voucher_token.
-- Plain phone numbers and email addresses are NOT accepted as authorization.
-- Guessing booking_ref alone yields 0 rows.
CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(
  p_booking_ref text,
  p_voucher_token text DEFAULT NULL
)
RETURNS TABLE (
  booking_ref text,
  venue_id text,
  venue_name text,
  court_or_turf_number text,
  slot_date text,
  slot_time text,
  payment_status text,
  masked_customer_name text,
  masked_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_trimmed_ref text := trim(p_booking_ref);
  v_rec record;
  v_is_authorized boolean := false;
BEGIN
  IF v_trimmed_ref IS NULL OR length(v_trimmed_ref) < 3 THEN
    RETURN;
  END IF;

  SELECT * INTO v_rec
  FROM public.venue_bookings
  WHERE venue_bookings.booking_ref = v_trimmed_ref
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Check authenticated user session ownership
  IF auth.uid() IS NOT NULL AND v_rec.user_id = auth.uid() THEN
    v_is_authorized := true;
  END IF;

  -- 2. Check high-entropy unguessable voucher token (minimum 16 characters)
  IF p_voucher_token IS NOT NULL AND length(trim(p_voucher_token)) >= 16 THEN
    IF v_rec.voucher_token IS NOT NULL AND trim(p_voucher_token) = v_rec.voucher_token THEN
      v_is_authorized := true;
    END IF;
  END IF;

  -- Service role override for trusted background jobs
  IF current_user = 'service_role' THEN
    v_is_authorized := true;
  END IF;

  -- Fail-closed: arbitrary callers guessing booking_ref receive zero rows
  IF NOT v_is_authorized THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_rec.booking_ref,
    v_rec.venue_id,
    v_rec.venue_name,
    v_rec.court_or_turf_number,
    v_rec.slot_date,
    v_rec.slot_time,
    v_rec.payment_status,
    CASE 
      WHEN auth.uid() IS NOT NULL AND v_rec.user_id = auth.uid() THEN v_rec.customer_name
      WHEN length(v_rec.customer_name) > 2 THEN 
        substr(v_rec.customer_name, 1, 1) || '***'
      ELSE 'Guest'
    END,
    CASE 
      WHEN auth.uid() IS NOT NULL AND v_rec.user_id = auth.uid() THEN v_rec.customer_phone
      WHEN length(v_rec.customer_phone) > 4 THEN 
        '+91 *** *** ' || substr(v_rec.customer_phone, length(v_rec.customer_phone) - 1)
      ELSE '+91 ***'
    END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) TO anon, authenticated, service_role;

-- 3.3 Verified zero-PII slot availability RPC (Publicly callable by anon & authenticated)
CREATE OR REPLACE FUNCTION public.get_booked_slots_for_venue(p_venue_id text, p_slot_date text)
RETURNS TABLE (slot_time text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT slot_time FROM public.venue_bookings
  WHERE venue_id = trim(p_venue_id)
    AND slot_date = trim(p_slot_date)
    AND payment_status != 'cancelled';
$$;

REVOKE EXECUTE ON FUNCTION public.get_booked_slots_for_venue(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots_for_venue(text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. SEC-015: DEFINE EXPLICIT RLS POLICIES ON ZERO-POLICY TABLES
-- -----------------------------------------------------------------------------

-- 4.1 public.pickup_game_participants
ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_game_participants_anon_deny" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_game_participants_owner_select" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_game_participants_host_select" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_game_participants_service_all" ON public.pickup_game_participants;

-- Direct anonymous access is completely denied
CREATE POLICY "pickup_game_participants_anon_deny"
  ON public.pickup_game_participants
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Authenticated player can only view their own participant record (cancellation token hidden by PostgREST view)
CREATE POLICY "pickup_game_participants_owner_select"
  ON public.pickup_game_participants
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Authenticated host can view participants for games they host
CREATE POLICY "pickup_game_participants_host_select"
  ON public.pickup_game_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pickup_games g
      WHERE g.id = pickup_game_participants.game_id
        AND g.host_id = auth.uid()::text
    )
  );

-- Service role full access for backend processing
CREATE POLICY "pickup_game_participants_service_all"
  ON public.pickup_game_participants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4.2 public.pickup_game_rsvp_rate_limits
ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_game_rate_limits_deny_all" ON public.pickup_game_rsvp_rate_limits;
DROP POLICY IF EXISTS "pickup_game_rate_limits_service_all" ON public.pickup_game_rsvp_rate_limits;

-- Clients cannot read, insert, update, or delete rate limits directly
CREATE POLICY "pickup_game_rate_limits_deny_all"
  ON public.pickup_game_rsvp_rate_limits
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "pickup_game_rate_limits_service_all"
  ON public.pickup_game_rsvp_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. SEC-016: REVOKE ANONYMOUS EXECUTE ON HOST & MODERATOR FUNCTIONS
-- -----------------------------------------------------------------------------

-- Dynamically query pg_proc to accurately resolve all function overloads without signature mismatches.
-- No silent error swallowing.
DO $$
DECLARE
  r RECORD;
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
        'admin_moderate_pickup_game'
      )
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.func_sig || ' FROM PUBLIC, anon;';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.func_sig || ' TO authenticated, service_role;';
    v_count := v_count + 1;
  END LOOP;
  
  -- Log hardened procedure count
  RAISE NOTICE 'Hardened EXECUTE permissions on % host/moderation procedures.', v_count;
END $$;

-- -----------------------------------------------------------------------------
-- 6. SEC-012: ENFORCE FORCE ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits FORCE ROW LEVEL SECURITY;

COMMIT;
