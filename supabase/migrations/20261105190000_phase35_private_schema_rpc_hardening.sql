-- KhelGrid Play Phase 3.5 — private helper schema and RPC grant hardening.
-- Forward-only, transactional migration. Review and test in a disposable/local DB first.
-- This file is intentionally NOT applied to the hosted Supabase project by this PR.

BEGIN;

-- Fail closed if the expected deployed function inventory has drifted.
DO $preflight$
DECLARE
  v_signature text;
  v_expected text[] := ARRAY[
    'public.enforce_listing_moderation_transition()',
    'public.is_listing_moderator()',
    'public.is_pickup_game_admin()',
    'public.rls_auto_enable()',
    'public.set_listing_submission_updated_at()',
    'public.set_updated_at()'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_expected LOOP
    IF pg_catalog.to_regprocedure(v_signature) IS NULL THEN
      RAISE EXCEPTION 'Phase 3.5 preflight failed: missing expected helper %', v_signature;
    END IF;
  END LOOP;
END
$preflight$;

-- The private schema must remain outside the Supabase Data API exposed-schema list.
CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated;
COMMENT ON SCHEMA private IS
  'Internal KhelGrid database helpers. Do not add this schema to PostgREST exposed schemas.';

-- Move helpers by OID so existing table triggers, the event trigger, and RLS policy
-- dependencies remain attached to the same function objects.
ALTER FUNCTION public.enforce_listing_moderation_transition() SET SCHEMA private;
ALTER FUNCTION public.is_listing_moderator() SET SCHEMA private;
ALTER FUNCTION public.is_pickup_game_admin() SET SCHEMA private;
ALTER FUNCTION public.rls_auto_enable() SET SCHEMA private;
ALTER FUNCTION public.set_listing_submission_updated_at() SET SCHEMA private;
ALTER FUNCTION public.set_updated_at() SET SCHEMA private;

-- PL/pgSQL bodies store source text rather than dependency-tracked function OIDs.
-- Rewrite every stored function body that explicitly qualified either helper.
DO $rewrite$
DECLARE
  v_function record;
  v_definition text;
BEGIN
  FOR v_function IN
    SELECT p.oid
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prokind = 'f'
      AND n.nspname IN ('public', 'private')
      AND (
        pg_catalog.pg_get_functiondef(p.oid) LIKE '%public.is_pickup_game_admin()%'
        OR pg_catalog.pg_get_functiondef(p.oid) LIKE '%public.is_listing_moderator()%'
      )
  LOOP
    v_definition := pg_catalog.pg_get_functiondef(v_function.oid);
    v_definition := pg_catalog.replace(
      v_definition,
      'public.is_pickup_game_admin()',
      'private.is_pickup_game_admin()'
    );
    v_definition := pg_catalog.replace(
      v_definition,
      'public.is_listing_moderator()',
      'private.is_listing_moderator()'
    );
    EXECUTE v_definition;
  END LOOP;
END
$rewrite$;

-- Remove all browser-facing execution rights from public functions first.
-- Then explicitly restore the 15 supported RPC contracts.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  FROM PUBLIC, anon, authenticated;

-- Guest-facing reservation contracts remain callable without a session.
GRANT EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pickup_game_whatsapp_invite(uuid, text)
  TO anon, authenticated;

-- Host, moderator, and administrator contracts require an authenticated caller.
GRANT EXECUTE ON FUNCTION public.create_pickup_game(text, text, text, text, integer, text, text, text, text, boolean, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_host_pickup_games()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_as_host(text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_pickup_game_as_host(text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_pickup_game_as_host(text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_pickup_game(text, text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pickup_game_capacity(text, integer, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_pickup_game_details(text, text, text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_pickup_game(text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pickup_game_whatsapp_invite(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_listing_submissions()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_listing_submission(uuid, text, text)
  TO authenticated;

-- Only the two helpers called directly by authenticated RLS policies / invoker
-- moderation RPCs are executable by authenticated users. No anon access.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_listing_moderator()
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_pickup_game_admin()
  TO authenticated;

-- Future functions created by either deployed migration owner must not inherit
-- PUBLIC EXECUTE. Schema-specific default grants to anon/authenticated are also
-- removed for public; service_role's existing explicit default is retained.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- Internal-schema defaults are deny-by-default, including service_role; callers
-- must receive explicit grants when a future helper genuinely needs them.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

-- Guard against a partial or unexpected rewrite before committing the migration.
DO $verify$
DECLARE
  v_count integer;
BEGIN
  IF pg_catalog.to_regprocedure('private.is_listing_moderator()') IS NULL
     OR pg_catalog.to_regprocedure('private.is_pickup_game_admin()') IS NULL
     OR pg_catalog.to_regprocedure('private.enforce_listing_moderation_transition()') IS NULL
     OR pg_catalog.to_regprocedure('private.rls_auto_enable()') IS NULL
     OR pg_catalog.to_regprocedure('private.set_listing_submission_updated_at()') IS NULL
     OR pg_catalog.to_regprocedure('private.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'Phase 3.5 verification failed: one or more helpers were not moved';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'private')
    AND p.prokind = 'f'
    AND (
      pg_catalog.pg_get_functiondef(p.oid) LIKE '%public.is_pickup_game_admin()%'
      OR pg_catalog.pg_get_functiondef(p.oid) LIKE '%public.is_listing_moderator()%'
    );
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Phase 3.5 verification failed: % stored function bodies still reference old public helper paths', v_count;
  END IF;

  IF NOT pg_catalog.has_schema_privilege('authenticated', 'private', 'USAGE')
     OR pg_catalog.has_schema_privilege('anon', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'Phase 3.5 verification failed: private schema USAGE grants are incorrect';
  END IF;

  IF NOT pg_catalog.has_function_privilege('authenticated', 'private.is_listing_moderator()', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('authenticated', 'private.is_pickup_game_admin()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', 'private.is_listing_moderator()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', 'private.is_pickup_game_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase 3.5 verification failed: private helper EXECUTE grants are incorrect';
  END IF;

  IF NOT pg_catalog.has_function_privilege('anon', 'public.rsvp_pickup_game(text,text,text,boolean)', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('anon', 'public.cancel_pickup_game_reservation(uuid,text)', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('anon', 'public.get_pickup_game_whatsapp_invite(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase 3.5 verification failed: guest reservation RPC grants were not preserved';
  END IF;

  IF pg_catalog.has_function_privilege('anon', 'public.create_pickup_game(text,text,text,text,integer,text,text,text,text,boolean,text)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', 'public.admin_moderate_pickup_game(text,text,text)', 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', 'public.get_listing_submissions()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', 'public.review_listing_submission(uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase 3.5 verification failed: anon can execute a protected RPC';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE NOT t.tgisinternal
    AND p.proname IN (
      'enforce_listing_moderation_transition',
      'set_listing_submission_updated_at',
      'set_updated_at'
    )
    AND n.nspname = 'private';
  IF v_count <> 10 THEN
    RAISE EXCEPTION 'Phase 3.5 verification failed: expected 10 table triggers bound to private helpers; found %', v_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_event_trigger e
    WHERE e.evtname = 'ensure_rls'
      AND e.evtfoid = 'private.rls_auto_enable()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Phase 3.5 verification failed: ensure_rls event trigger is not bound to private.rls_auto_enable()';
  END IF;
END
$verify$;

COMMIT;
