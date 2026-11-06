-- ==============================================================================
-- KhelGrid Play — Phase 2 database integrity regression tests
-- Safe to run in the development database: all generated records are rolled back.
-- Run only after the Phase 1 privacy and Phase 2 RSVP migrations.
-- ==============================================================================
BEGIN;

DO $phase2_test$
DECLARE
  v_game_id uuid;
  v_slug text;
  v_res jsonb;
  v_duplicate jsonb;
  v_waitlist jsonb;
  v_unauthorized_cancel jsonb;
  v_valid_cancel jsonb;
  v_phone text := '98765' || lpad((floor(random() * 100000)::integer)::text, 5, '0');
  v_waitlist_phone text := '91234' || lpad((floor(random() * 100000)::integer)::text, 5, '0');
  v_token text;
  v_stored_token text;
  i integer;
BEGIN
  -- A. Database-level permissions and RLS.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'pickup_game_participants'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Phase 2 failed: participant RLS is not enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'pickup_game_rsvp_rate_limits'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Phase 2 failed: rate-limit RLS is not enabled';
  END IF;

  IF has_table_privilege('anon', 'public.pickup_game_participants', 'SELECT')
     OR has_table_privilege('authenticated', 'public.pickup_game_participants', 'SELECT')
     OR has_table_privilege('anon', 'public.pickup_game_participants', 'INSERT')
     OR has_table_privilege('authenticated', 'public.pickup_game_participants', 'INSERT')
     OR has_table_privilege('anon', 'public.pickup_games', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.pickup_games', 'UPDATE') THEN
    RAISE EXCEPTION 'Phase 2 failed: direct participant/game mutation or participant reads remain granted';
  END IF;

  IF NOT has_column_privilege('anon', 'public.pickup_games', 'sport', 'SELECT')
     OR has_column_privilege('anon', 'public.pickup_games', 'whatsapp_group_url', 'SELECT')
     OR has_column_privilege('authenticated', 'public.pickup_games', 'host_user_id', 'SELECT') THEN
    RAISE EXCEPTION 'Phase 2 failed: public/private pickup game column grants are incorrect';
  END IF;

  IF NOT has_function_privilege('anon', 'public.rsvp_pickup_game(text,text,text,boolean)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.cancel_pickup_game_reservation(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.is_pickup_game_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase 2 failed: RSVP/cancellation/admin helper execute grants are incorrect';
  END IF;

  -- B. Confirmed RSVP, duplicate prevention, waitlist and cancellation ownership.
  v_game_id := pg_catalog.gen_random_uuid();
  v_slug := 'phase2-test-' || pg_catalog.substr(pg_catalog.md5(random()::text), 1, 12);

  INSERT INTO public.pickup_games (
    id, slug, sport, emoji, skill_level, venue_name, city, time_label,
    host_name, price_per_player, spots_open, total_players, confirmed_players,
    is_featured, publication_status, status
  ) VALUES (
    v_game_id, v_slug, 'Badminton', '🏸', 'Intermediate', 'Phase 2 Test Court',
    'Delhi', 'Test slot', 'Test Host', '₹100', 1, 1, 0, false, 'published', 'open'
  );

  v_res := public.rsvp_pickup_game(v_game_id::text, 'Phase Two Player', v_phone, false);
  IF v_res->>'status' <> 'confirmed' THEN
    RAISE EXCEPTION 'Expected confirmed RSVP, got %', v_res;
  END IF;

  v_token := v_res->>'cancellation_token';
  IF v_token IS NULL OR pg_catalog.length(v_token) < 20 THEN
    RAISE EXCEPTION 'RSVP did not return a strong cancellation bearer token';
  END IF;

  SELECT cancellation_token INTO v_stored_token
  FROM public.pickup_game_participants
  WHERE id = (v_res->>'participant_id')::uuid;

  IF v_stored_token = v_token OR pg_catalog.length(v_stored_token) <> 64 THEN
    RAISE EXCEPTION 'Cancellation bearer token is not stored as a SHA-256 digest';
  END IF;

  v_duplicate := public.rsvp_pickup_game(v_game_id::text, 'Duplicate Player', v_phone, true);
  IF v_duplicate->>'status' <> 'duplicate' THEN
    RAISE EXCEPTION 'Duplicate RSVP was not blocked: %', v_duplicate;
  END IF;

  v_waitlist := public.rsvp_pickup_game(v_game_id::text, 'Waitlist Player', v_waitlist_phone, true);
  IF v_waitlist->>'status' <> 'waitlist'
     OR v_waitlist->'whatsapp_group_url' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'Waitlist behavior or invite withholding failed: %', v_waitlist;
  END IF;

  v_unauthorized_cancel := public.cancel_pickup_game_reservation(
    (v_res->>'participant_id')::uuid, NULL
  );
  IF v_unauthorized_cancel->>'status' <> 'error'
     OR v_unauthorized_cancel->>'error_code' <> 'UNAUTHORIZED' THEN
    RAISE EXCEPTION 'Cancellation without bearer token was accepted: %', v_unauthorized_cancel;
  END IF;

  v_valid_cancel := public.cancel_pickup_game_reservation(
    (v_res->>'participant_id')::uuid, v_token
  );
  IF v_valid_cancel->>'status' <> 'cancelled'
     OR v_valid_cancel->>'promoted_participant_id' IS NULL THEN
    RAISE EXCEPTION 'Valid cancellation did not promote the next waitlisted player: %', v_valid_cancel;
  END IF;

  -- C. Atomic rate limit: five phone-keyed attempts pass, the sixth is blocked.
  v_phone := '90000' || lpad((floor(random() * 100000)::integer)::text, 5, '0');
  FOR i IN 1..6 LOOP
    v_game_id := pg_catalog.gen_random_uuid();
    v_slug := 'phase2-rate-' || pg_catalog.substr(pg_catalog.md5(random()::text), 1, 12);
    INSERT INTO public.pickup_games (
      id, slug, sport, emoji, skill_level, venue_name, city, time_label,
      host_name, price_per_player, spots_open, total_players, confirmed_players,
      is_featured, publication_status, status
    ) VALUES (
      v_game_id, v_slug, 'Badminton', '🏸', 'Intermediate', 'Phase 2 Rate Test',
      'Delhi', 'Test slot', 'Test Host', '₹100', 1, 1, 0, false, 'published', 'open'
    );

    v_res := public.rsvp_pickup_game(v_game_id::text, 'Rate Test Player', v_phone, false);
    IF i <= 5 AND v_res->>'status' <> 'confirmed' THEN
      RAISE EXCEPTION 'Rate limit blocked attempt % too early: %', i, v_res;
    END IF;
    IF i = 6 AND (
      v_res->>'status' <> 'error' OR v_res->>'error_code' <> 'RATE_LIMITED'
    ) THEN
      RAISE EXCEPTION 'Sixth RSVP attempt was not rate limited: %', v_res;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.pickup_game_rsvp_rate_limits
    WHERE identifier IN (v_phone, 'phone:' || pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(v_phone, 'UTF8'), 'sha256'), 'hex'
    ))
      AND identifier = v_phone
  ) THEN
    RAISE EXCEPTION 'Raw phone number was stored in rate-limit identifiers';
  END IF;

  RAISE NOTICE 'PASS: Phase 2 database permission, RSVP, duplicate, waitlist, cancellation, token hashing, and rate-limit tests.';
END
$phase2_test$;

ROLLBACK;
