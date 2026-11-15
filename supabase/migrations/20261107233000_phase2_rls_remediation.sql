-- ==============================================================================
-- KhelGrid — Phase 2: Row Level Security (RLS) Remediation
-- Migration: 20261107233000_phase2_rls_remediation.sql
-- Target: Live Supabase Development Database (hznsbxvovjxvmnchzzqt)
--
-- Purpose:
-- 1. SEC-001 Remediation: Restrict public.listing_subscriptions SELECT access.
--    Replace permissive USING (true) with owner-only access and provide an
--    order-specific lookup RPC.
-- 2. SEC-002 Remediation: Restrict public.venue_bookings SELECT access.
--    Prevent anonymous scraping of customer PII while preserving public slot
--    availability checks via get_booked_slots_for_venue() RPC.
-- 3. SEC-003 Remediation: Restrict public.trial_reminders SELECT access.
--    Drop public read policy so phone numbers and email addresses are not exposed.
-- 4. SEC-012 Remediation: Force Row Level Security (FORCE RLS) on all sensitive
--    commercial and personal data tables.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. REMEDIATE public.listing_subscriptions (SEC-001)
-- -----------------------------------------------------------------------------

-- Drop over-permissive public read policy
DROP POLICY IF EXISTS "listing_subscriptions_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_owner_read" ON public.listing_subscriptions;
DROP POLICY IF EXISTS "listing_subscriptions_service_read" ON public.listing_subscriptions;

-- Only authenticated subscription owners can read their own records
CREATE POLICY "listing_subscriptions_owner_read"
  ON public.listing_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Service role and admin access
CREATE POLICY "listing_subscriptions_service_read"
  ON public.listing_subscriptions
  FOR SELECT
  TO service_role
  USING (true);

-- Atomic RPC: Safe order voucher lookup without exposing table contents
CREATE OR REPLACE FUNCTION public.get_listing_subscription_by_order(p_order_id text)
RETURNS SETOF public.listing_subscriptions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT * FROM public.listing_subscriptions
  WHERE order_id = trim(p_order_id)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_subscription_by_order(text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. REMEDIATE public.venue_bookings (SEC-002)
-- -----------------------------------------------------------------------------

-- Add user_id column if not already present to associate bookings with authenticated accounts
ALTER TABLE public.venue_bookings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON public.venue_bookings(user_id);

-- Drop over-permissive public read policy
DROP POLICY IF EXISTS "venue_bookings_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_owner_read" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_service_read" ON public.venue_bookings;

-- Only authenticated booking owners can read their own bookings
CREATE POLICY "venue_bookings_owner_read"
  ON public.venue_bookings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Service role access
CREATE POLICY "venue_bookings_service_read"
  ON public.venue_bookings
  FOR SELECT
  TO service_role
  USING (true);

-- Atomic RPC: Safe single-booking voucher lookup by booking reference
CREATE OR REPLACE FUNCTION public.get_venue_booking_voucher(p_booking_ref text)
RETURNS SETOF public.venue_bookings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT * FROM public.venue_bookings
  WHERE booking_ref = trim(p_booking_ref)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_venue_booking_voucher(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_booking_voucher(text) TO anon, authenticated, service_role;

-- Atomic RPC: Anonymous and public slot availability queries (ZERO PII exposure)
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
-- 3. REMEDIATE public.trial_reminders (SEC-003)
-- -----------------------------------------------------------------------------

-- Add user_id column if not already present
ALTER TABLE public.trial_reminders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trial_reminders_user_id ON public.trial_reminders(user_id);

-- Drop over-permissive public read policy
DROP POLICY IF EXISTS "trial_reminders_public_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_owner_read" ON public.trial_reminders;
DROP POLICY IF EXISTS "trial_reminders_service_read" ON public.trial_reminders;

-- Authenticated users can only read their own reminders
CREATE POLICY "trial_reminders_owner_read"
  ON public.trial_reminders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Service role and notification dispatchers can read all reminders
CREATE POLICY "trial_reminders_service_read"
  ON public.trial_reminders
  FOR SELECT
  TO service_role
  USING (true);

-- Ensure public insert remains open so athletes can register trial notifications
-- (Preserves backward compatibility with existing reminder modals)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trial_reminders' AND policyname = 'trial_reminders_public_insert'
  ) THEN
    CREATE POLICY "trial_reminders_public_insert" ON public.trial_reminders
      FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. FORCE ROW LEVEL SECURITY (SEC-012)
-- -----------------------------------------------------------------------------
ALTER TABLE public.listing_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trial_reminders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.khelgrid_payments FORCE ROW LEVEL SECURITY;

COMMIT;
