-- Avoid per-row re-evaluation of auth.uid() in owner RLS policies.
-- This preserves each policy's authorization predicate while allowing PostgreSQL
-- to evaluate the JWT identity once per statement.
BEGIN;

ALTER POLICY venue_bookings_owner_select ON public.venue_bookings
  USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

ALTER POLICY trial_reminders_owner_select ON public.trial_reminders
  USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

ALTER POLICY athlete_profiles_owner_draft_read ON public.athlete_profiles
  USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

ALTER POLICY athlete_profiles_owner_insert ON public.athlete_profiles
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

ALTER POLICY athlete_profiles_owner_update ON public.athlete_profiles
  USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

ALTER POLICY listing_subscriptions_owner_read ON public.listing_subscriptions
  USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

ALTER POLICY payments_user_read ON public.khelgrid_payments
  USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));

ALTER POLICY pickup_game_participants_owner_read ON public.pickup_game_participants
  USING ((SELECT auth.uid()) IS NOT NULL AND user_id = ((SELECT auth.uid())::text));

COMMIT;
