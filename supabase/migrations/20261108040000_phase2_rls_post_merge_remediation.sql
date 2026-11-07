-- ==============================================================================
-- KhelGrid — Phase 2: Row Level Security (RLS) Post-Merge Verification & Remediation
-- Migration: 20261108040000_phase2_rls_post_merge_remediation.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt (PREPARED ONLY — NOT YET APPLIED)
--
-- Purpose:
-- 1. SEC-014 Remediation: Eliminate whole-row PII disclosure in receipt and voucher
--    RPCs (get_listing_subscription_by_order and get_venue_booking_voucher).
--    Replace SETOF public.* with minimal, zero-PII table projections.
-- 2. SEC-003 Remediation: Fix unsafe trial_reminders_authenticated_update policy
--    which previously permitted any authenticated user to modify other users' reminders.
-- 3. SEC-015 Remediation: Define explicit RLS policies on tables that had RLS enabled
--    with 0 policies (pickup_game_participants, pickup_game_rsvp_rate_limits).
-- 4. SEC-016 Remediation: Revoke anonymous EXECUTE privileges on all host-only and
--    moderator-only SECURITY DEFINER stored procedures via dynamic catalog query
--    to eliminate function signature mismatches.
-- 5. SEC-012 Remediation: Enforce FORCE ROW LEVEL SECURITY on all user-facing tables.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SEC-014: REMEDIATE WHOLE-ROW RECEIPT & VOUCHER RPCs (ZERO-PII PROJECTIONS)
-- -----------------------------------------------------------------------------

-- Drop previous whole-row SETOF functions if they exist
DROP FUNCTION IF EXISTS public.get_listing_subscription_by_order(text);
DROP FUNCTION IF EXISTS public.get_venue_booking_voucher(text);

-- 1.1 Minimal projection for subscription order confirmation (NO RAW PII, NO GATEWAY CREDENTIALS)
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(p_order_id text)
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

  -- Verify authorization: Caller must be owner, service_role, or receive masked projection
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

REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text) TO anon, authenticated, service_role;

-- 1.2 Minimal projection for venue booking vouchers (NO SENSITIVE PHONE/EMAIL TO ARBITRARY CALLERS)
CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(
  p_booking_ref text,
  p_verification_contact text DEFAULT NULL
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
  v_is_owner boolean := false;
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

  -- Check if authenticated user is the booking owner
  IF auth.uid() IS NOT NULL AND v_rec.user_id = auth.uid() THEN
    v_is_owner := true;
  END IF;

  -- Check if caller provided matching phone or email verification credential
  IF p_verification_contact IS NOT NULL AND (
    trim(p_verification_contact) = v_rec.customer_phone
    OR trim(p_verification_contact) = v_rec.customer_email
  ) THEN
    v_is_owner := true;
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
      WHEN v_is_owner THEN v_rec.customer_name
      WHEN length(v_rec.customer_name) > 2 THEN 
        substr(v_rec.customer_name, 1, 1) || '***'
      ELSE 'Guest'
    END,
    CASE 
      WHEN v_is_owner THEN v_rec.customer_phone
      WHEN length(v_rec.customer_phone) > 4 THEN 
        '+91 *** *** ' || substr(v_rec.customer_phone, length(v_rec.customer_phone) - 1)
      ELSE '+91 ***'
    END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(text, text) TO anon, authenticated, service_role;

-- 1.3 Verified zero-PII slot availability RPC
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
-- 2. SEC-003: REMEDIATE TRIAL_REMINDERS UNSAFE UPDATE POLICY
-- -----------------------------------------------------------------------------

-- Drop over-permissive update policy that allowed any authenticated user to update all records
DROP POLICY IF EXISTS "trial_reminders_authenticated_update" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_update" ON public.trial_reminders;

-- Restrict UPDATE strictly to the reminder owner
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
-- 3. SEC-015: DEFINE EXPLICIT RLS POLICIES ON ZERO-POLICY TABLES
-- -----------------------------------------------------------------------------

-- 3.1 public.pickup_game_participants
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

-- 3.2 public.pickup_game_rsvp_rate_limits
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
-- 4. SEC-016: REVOKE ANONYMOUS EXECUTE ON HOST & MODERATOR FUNCTIONS
-- -----------------------------------------------------------------------------

-- Dynamically query pg_proc to accurately resolve all function overloads without signature mismatches
DO $$
DECLARE
  r RECORD;
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
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5. SEC-012: ENFORCE FORCE ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits FORCE ROW LEVEL SECURITY;

COMMIT;
