-- KhelGrid Play Phase 3.5 — private schema and RPC access regression suite.
-- Run only after 20261105190000_phase35_private_schema_rpc_hardening.sql.
-- The transaction rolls back all test users, memberships, submissions and probe DDL.

BEGIN;

DO $access_matrix$
DECLARE
  v_signature text;
  v_guest text[] := ARRAY[
    'public.rsvp_pickup_game(text,text,text,boolean)',
    'public.cancel_pickup_game_reservation(uuid,text)',
    'public.get_pickup_game_whatsapp_invite(uuid,text)'
  ];
  v_public_rpc text[] := ARRAY[
    'public.admin_moderate_pickup_game(text,text,text)',
    'public.approve_pickup_game_whatsapp_invite(uuid)',
    'public.cancel_pickup_game_as_host(text,text)',
    'public.cancel_pickup_game_reservation(uuid,text)',
    'public.complete_pickup_game_as_host(text)',
    'public.create_pickup_game(text,text,text,text,integer,text,text,text,text,boolean,text)',
    'public.get_host_pickup_games()',
    'public.get_listing_submissions()',
    'public.get_pickup_game_whatsapp_invite(uuid,text)',
    'public.reopen_pickup_game_as_host(text)',
    'public.reschedule_pickup_game(text,text,text,text)',
    'public.review_listing_submission(uuid,text,text)',
    'public.rsvp_pickup_game(text,text,text,boolean)',
    'public.update_pickup_game_capacity(text,integer,text)',
    'public.update_pickup_game_details(text,text,text,text,text)'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_public_rpc LOOP
    IF pg_catalog.to_regprocedure(v_signature) IS NULL THEN
      RAISE EXCEPTION 'Missing public RPC contract: %', v_signature;
    END IF;
    IF NOT pg_catalog.has_function_privilege('authenticated', v_signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated cannot execute required public RPC: %', v_signature;
    END IF;
  END LOOP;

  FOREACH v_signature IN ARRAY v_guest LOOP
    IF NOT pg_catalog.has_function_privilege('anon', v_signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon lost guest reservation access: %', v_signature;
    END IF;
  END LOOP;

  FOREACH v_signature IN ARRAY v_public_rpc LOOP
    IF v_signature <> ALL(v_guest)
       AND pg_catalog.has_function_privilege('anon', v_signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon can execute protected RPC: %', v_signature;
    END IF;
  END LOOP;

  IF pg_catalog.has_schema_privilege('anon', 'private', 'USAGE')
     OR NOT pg_catalog.has_schema_privilege('authenticated', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'private schema USAGE access matrix is incorrect';
  END IF;

  IF pg_catalog.has_function_privilege('anon', 'private.is_listing_moderator()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', 'private.is_pickup_game_admin()', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('authenticated', 'private.is_listing_moderator()', 'EXECUTE')
     OR NOT pg_catalog.has_function_privilege('authenticated', 'private.is_pickup_game_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'private policy helper EXECUTE access matrix is incorrect';
  END IF;

  IF pg_catalog.has_function_privilege('anon', 'private.rls_auto_enable()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', 'private.rls_auto_enable()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('anon', 'private.set_updated_at()', 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', 'private.set_updated_at()', 'EXECUTE') THEN
    RAISE EXCEPTION 'internal trigger/event-trigger helpers are directly executable by browser roles';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) acl
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'A public function still grants EXECUTE to PUBLIC';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_default_acl d
    CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) acl
    WHERE d.defaclobjtype = 'f'
      AND d.defaclnamespace = 0
      AND acl.grantee = 0
      AND d.defaclrole IN (
        (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres'),
        (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin')
      )
  ) THEN
    RAISE EXCEPTION 'A global function default still grants EXECUTE to PUBLIC';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_default_acl d
    JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) acl
    WHERE n.nspname = 'public'
      AND d.defaclobjtype = 'f'
      AND acl.grantee IN (
        (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'anon'),
        (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
      )
      AND d.defaclrole IN (
        (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres'),
        (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin')
      )
  ) THEN
    RAISE EXCEPTION 'A public-schema function default still grants anon/authenticated EXECUTE';
  END IF;
END
$access_matrix$;

-- Verify that moving helpers preserved their OID-bound trigger dependencies.
DO $dependency_checks$
DECLARE
  v_trigger_count integer;
BEGIN
  SELECT count(*) INTO v_trigger_count
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE NOT t.tgisinternal
    AND n.nspname = 'private'
    AND p.proname IN (
      'enforce_listing_moderation_transition',
      'set_listing_submission_updated_at',
      'set_updated_at'
    );
  IF v_trigger_count <> 10 THEN
    RAISE EXCEPTION 'Expected 10 table triggers on private helper OIDs; found %', v_trigger_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_event_trigger e
    WHERE e.evtname = 'ensure_rls'
      AND e.evtfoid = 'private.rls_auto_enable()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'ensure_rls event trigger dependency was not preserved';
  END IF;
END
$dependency_checks$;

-- Event-trigger smoke test: the moved function must still enable RLS for new public tables.
CREATE TABLE public.phase35_private_schema_rls_probe (id integer PRIMARY KEY);
DO $event_trigger_test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'phase35_private_schema_rls_probe'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'ensure_rls did not enable RLS after the event-trigger helper moved';
  END IF;
END
$event_trigger_test$;
DROP TABLE public.phase35_private_schema_rls_probe;

-- Create moderator and non-moderator fixtures as the migration/test owner.
DO $fixtures$
DECLARE
  v_moderator uuid := pg_catalog.gen_random_uuid();
  v_non_moderator uuid := pg_catalog.gen_random_uuid();
  v_submission uuid;
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (v_moderator, 'authenticated', 'authenticated',
     'phase35-mod-' || v_moderator || '@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_non_moderator, 'authenticated', 'authenticated',
     'phase35-nonmod-' || v_non_moderator || '@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

  INSERT INTO public.listing_moderators (user_id, is_active)
  VALUES (v_moderator, true);

  INSERT INTO public.listing_submissions (
    listing_type, title, city, source_url, details
  ) VALUES (
    'venue', 'Phase 3.5 moderation regression fixture', 'Delhi',
    'https://example.test/phase35-moderation-fixture',
    'Transactional fixture; removed by rollback.'
  ) RETURNING id INTO v_submission;

  PERFORM pg_catalog.set_config('khelgrid.phase35.moderator_id', v_moderator::text, true);
  PERFORM pg_catalog.set_config('khelgrid.phase35.non_moderator_id', v_non_moderator::text, true);
  PERFORM pg_catalog.set_config('khelgrid.phase35.submission_id', v_submission::text, true);
END
$fixtures$;

-- Active moderator: helper, RLS SELECT, invoker RPC and transition trigger all work.
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  pg_catalog.current_setting('khelgrid.phase35.moderator_id'),
  true
);
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  pg_catalog.jsonb_build_object(
    'sub', pg_catalog.current_setting('khelgrid.phase35.moderator_id'),
    'role', 'authenticated',
    'app_metadata', '{}'::jsonb,
    'user_metadata', '{}'::jsonb
  )::text,
  true
);
SET LOCAL ROLE authenticated;
DO $moderator_path$
DECLARE
  v_visible integer;
BEGIN
  IF NOT private.is_listing_moderator() THEN
    RAISE EXCEPTION 'Active listing moderator helper returned false';
  END IF;

  SELECT count(*) INTO v_visible FROM public.listing_submissions;
  IF v_visible < 1 THEN
    RAISE EXCEPTION 'Moderator RLS SELECT did not expose the pending test submission';
  END IF;

  PERFORM public.review_listing_submission(
    pg_catalog.current_setting('khelgrid.phase35.submission_id')::uuid,
    'approved',
    'Phase 3.5 transactional regression test'
  );
END
$moderator_path$;
RESET ROLE;

-- Non-moderator: RLS returns no submissions and review RPC denies authorization.
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  pg_catalog.current_setting('khelgrid.phase35.non_moderator_id'),
  true
);
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  pg_catalog.jsonb_build_object(
    'sub', pg_catalog.current_setting('khelgrid.phase35.non_moderator_id'),
    'role', 'authenticated',
    'app_metadata', '{}'::jsonb,
    'user_metadata', '{}'::jsonb
  )::text,
  true
);
SET LOCAL ROLE authenticated;
DO $non_moderator_path$
DECLARE
  v_visible integer;
BEGIN
  IF private.is_listing_moderator() THEN
    RAISE EXCEPTION 'Non-moderator unexpectedly passed the helper';
  END IF;

  SELECT count(*) INTO v_visible FROM public.listing_submissions;
  IF v_visible <> 0 THEN
    RAISE EXCEPTION 'Non-moderator can read moderator-only submissions';
  END IF;

  BEGIN
    PERFORM public.review_listing_submission(
      pg_catalog.current_setting('khelgrid.phase35.submission_id')::uuid,
      'approved',
      'This must be denied'
    );
    RAISE EXCEPTION 'Non-moderator review unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END
$non_moderator_path$;
RESET ROLE;

ROLLBACK;
