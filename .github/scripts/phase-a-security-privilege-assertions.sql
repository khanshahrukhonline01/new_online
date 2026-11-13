-- Phase A least-privilege and RLS regression assertions.
BEGIN;

DO $$
DECLARE
  v_bad text;
BEGIN
  -- Every table in the exposed public schema must have RLS enabled.
  SELECT string_agg(format('%I.%I', n.nspname, c.relname), ', ')
    INTO v_bad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND NOT c.relrowsecurity;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Phase A: RLS disabled on public tables: %', v_bad;
  END IF;

  -- No untrusted API role may hold table-level destructive/DDL-adjacent rights.
  SELECT string_agg(format('%I.%I (%s)', n.nspname, c.relname, r.rolname), ', ')
    INTO v_bad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN (VALUES ('anon'::regrole), ('authenticated'::regrole)) AS r(rolname)
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND (
      has_table_privilege(r.rolname, c.oid, 'TRUNCATE')
      OR has_table_privilege(r.rolname, c.oid, 'REFERENCES')
      OR has_table_privilege(r.rolname, c.oid, 'TRIGGER')
      OR has_table_privilege(r.rolname, c.oid, 'DELETE')
    );
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Phase A: excessive table privileges remain: %', v_bad;
  END IF;

  -- Direct table writes are limited to explicitly supported workflows.
  IF has_table_privilege('anon', 'public.athlete_profiles', 'INSERT')
     OR has_table_privilege('anon', 'public.athlete_profiles', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.payment_webhook_events', 'INSERT')
     OR has_table_privilege('authenticated', 'public.payment_webhook_events', 'UPDATE')
     OR has_table_privilege('anon', 'public.payment_webhook_events', 'SELECT')
     OR has_table_privilege('authenticated', 'public.payment_webhook_events', 'SELECT')
     OR has_table_privilege('anon', 'public.venue_bookings', 'SELECT')
     OR has_table_privilege('anon', 'public.athlete_profile_moderation_audit', 'SELECT')
     OR has_table_privilege('authenticated', 'public.athlete_profile_moderation_audit', 'SELECT')
     OR has_table_privilege('anon', 'public.payment_manual_verification_audit', 'SELECT')
     OR has_table_privilege('authenticated', 'public.payment_manual_verification_audit', 'SELECT') THEN
    RAISE EXCEPTION 'Phase A: sensitive table grants are too broad';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT') THEN
    RAISE EXCEPTION 'Phase A: authenticated users cannot read their own profiles';
  END IF;

  IF NOT has_table_privilege('anon', 'public.venues', 'SELECT')
     OR NOT has_table_privilege('anon', 'public.opportunities', 'SELECT')
     OR NOT has_table_privilege('anon', 'public.listing_submissions', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.athlete_profiles', 'UPDATE')
     OR NOT has_table_privilege('authenticated', 'public.venue_bookings', 'SELECT') THEN
    RAISE EXCEPTION 'Phase A: required application privileges are missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='S'
      AND (has_sequence_privilege('anon',c.oid,'USAGE') OR has_sequence_privilege('authenticated',c.oid,'USAGE'))
  ) THEN
    RAISE EXCEPTION 'Phase A: browser roles have unnecessary sequence privileges';
  END IF;

  -- Host/admin-only functions cannot be executed by
  -- authenticated clients whose identity is checked inside each function.
  IF has_function_privilege('anon', 'public.admin_moderate_pickup_game(text,text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.approve_pickup_game_whatsapp_invite(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.cancel_pickup_game_as_host(text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.complete_pickup_game_as_host(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_host_pickup_games()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.reopen_pickup_game_as_host(text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.reschedule_pickup_game(text,text,text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.update_pickup_game_capacity(text,integer,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.update_pickup_game_details(text,text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase A: anonymous execution remains on host/admin RPCs';
  END IF;

  IF has_function_privilege('anon', 'public.create_pickup_game(text,text,text,text,integer,text,text,text,text,boolean,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.create_pickup_game(text,text,text,text,integer,text,text,text,text,boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase A: pickup-game creation execution does not match authenticated-only contract';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.admin_moderate_pickup_game(text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.is_pickup_game_admin()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.is_service_role_or_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase A: required authenticated moderation/RLS function grants are missing';
  END IF;

  IF has_function_privilege('anon', 'public.is_pickup_game_admin()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.is_service_role_or_admin()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.check_and_increment_rate_limit(text,integer,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.check_and_increment_rate_limit(text,integer,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.prevent_athlete_profile_user_id_change()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.prevent_athlete_profile_user_id_change()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.set_listing_subscription_activation_window()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.set_listing_subscription_activation_window()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.verify_security_schema_migrations()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.verify_security_schema_migrations()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase A: internal SECURITY DEFINER helper remains directly executable';
  END IF;

  -- Owner policies must use statement-level auth.uid() evaluation.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND (
        (tablename='venue_bookings' AND policyname='venue_bookings_owner_select' AND qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%')
        OR (tablename='trial_reminders' AND policyname='trial_reminders_owner_select' AND qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%')
        OR (tablename='athlete_profiles' AND policyname IN ('athlete_profiles_owner_draft_read','athlete_profiles_owner_insert','athlete_profiles_owner_update')
            AND coalesce(qual,'') || coalesce(with_check,'') LIKE '%auth.uid()%'
            AND coalesce(qual,'') || coalesce(with_check,'') NOT LIKE '%SELECT auth.uid()%')
        OR (tablename='listing_subscriptions' AND policyname='listing_subscriptions_owner_read' AND qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%')
        OR (tablename='khelgrid_payments' AND policyname='payments_user_read' AND qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%')
        OR (tablename='pickup_game_participants' AND policyname='pickup_game_participants_owner_read' AND qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%')
      )
  ) THEN
    RAISE EXCEPTION 'Phase A: owner RLS policy still evaluates auth.uid() per row';
  END IF;

  -- Future postgres-owned public objects must not inherit broad API privileges.
  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND (
        (d.defaclobjtype = 'r' AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole))
        OR (d.defaclobjtype = 'S' AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole))
        OR (d.defaclobjtype = 'f' AND (a.grantee = 0 OR a.grantee IN ('anon'::regrole, 'authenticated'::regrole))
            AND a.privilege_type = 'EXECUTE')
      )
  ) THEN
    RAISE EXCEPTION 'Phase A: insecure default privileges remain for postgres-owned public objects';
  END IF;

  -- The private schema must not be exposed to browser roles.
  IF has_schema_privilege('anon', 'private', 'USAGE')
     OR has_schema_privilege('authenticated', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'Phase A: private schema is exposed to browser roles';
  END IF;
END;
$$;

-- Verify the owner policy at row level: an authenticated user sees their own
-- booking and cannot see another user's booking.
INSERT INTO auth.users (id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.venue_bookings
  (booking_ref, venue_id, venue_name, city, sport, slot_date, slot_time,
   customer_name, customer_phone, total_amount, paid_amount, user_id)
VALUES
  ('PHASEA-RLS-OWN-TEST', 'phase-a-test', 'Phase A Test Venue', 'Delhi', 'Football',
   '2099-01-01', '10:00', 'Test Owner', '9000000001', 100, 0,
   '11111111-1111-4111-8111-111111111111'),
  ('PHASEA-RLS-OTHER-TEST', 'phase-a-test', 'Phase A Test Venue', 'Delhi', 'Football',
   '2099-01-01', '11:00', 'Other Owner', '9000000002', 100, 0,
   '22222222-2222-4222-8222-222222222222');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $phasea$
DECLARE
  v_own integer;
  v_other integer;
BEGIN
  SELECT count(*) INTO v_own
  FROM public.venue_bookings WHERE booking_ref='PHASEA-RLS-OWN-TEST';
  SELECT count(*) INTO v_other
  FROM public.venue_bookings WHERE booking_ref='PHASEA-RLS-OTHER-TEST';
  IF v_own <> 1 OR v_other <> 0 THEN
    RAISE EXCEPTION 'Phase A: venue booking owner RLS failed (own %, other %)',v_own,v_other;
  END IF;
END;
$phasea$;
RESET ROLE;

ROLLBACK;
