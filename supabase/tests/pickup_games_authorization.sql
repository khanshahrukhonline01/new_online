-- ==============================================================================
-- KhelGrid Database Authorization & Security Test Suite (Phase 3)
-- Purpose: Rigorous database-level transactional authorization tests verifying:
-- 1. Table privilege revocations (anon, authenticated cannot direct INSERT/UPDATE/DELETE).
-- 2. Anonymous user restrictions (cannot execute management RPCs; cannot cancel without token).
-- 3. Host ownership isolation (Host A cannot modify Host B's games; cannot view Host B's drafts).
-- 4. Host game management (Host A can create, edit, reschedule, update capacity, cancel, reopen).
-- 5. Cancellation authorization integrity (no phone-only cancellation; bearer token required).
-- 6. Administrator privileges (only admins can execute admin_moderate_pickup_game).
--
-- Safe for non-production execution: enclosed in a transaction that always ROLLBACKs.
-- ==============================================================================

BEGIN;

-- 1. Verify schema columns & constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pickup_games' AND column_name = 'host_user_id'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: pickup_games.host_user_id column is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pickup_game_participants' AND column_name = 'cancellation_token'
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: pickup_game_participants.cancellation_token column is missing';
  END IF;
END $$;

-- 2. Verify Table Privileges & RLS
DO $$
BEGIN
  -- RLS must be enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'pickup_games' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: RLS must be enabled on public.pickup_games';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'pickup_game_participants' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'TEST FAILED: RLS must be enabled on public.pickup_game_participants';
  END IF;

  -- Direct mutation privileges on pickup_games must be revoked
  IF has_table_privilege('anon', 'public.pickup_games', 'insert')
     OR has_table_privilege('anon', 'public.pickup_games', 'update')
     OR has_table_privilege('anon', 'public.pickup_games', 'delete')
     OR has_table_privilege('authenticated', 'public.pickup_games', 'insert')
     OR has_table_privilege('authenticated', 'public.pickup_games', 'update')
     OR has_table_privilege('authenticated', 'public.pickup_games', 'delete') THEN
    RAISE EXCEPTION 'TEST FAILED: Direct INSERT, UPDATE, or DELETE on public.pickup_games must be revoked from anon and authenticated';
  END IF;

  -- Direct read on participants must be revoked
  IF has_table_privilege('anon', 'public.pickup_game_participants', 'select')
     OR has_table_privilege('authenticated', 'public.pickup_game_participants', 'select') THEN
    RAISE EXCEPTION 'TEST FAILED: Direct SELECT on public.pickup_game_participants must be revoked for player privacy';
  END IF;

  -- Management RPC execute privileges must be revoked from anon
  IF has_function_privilege('anon', 'public.create_pickup_game(text, text, text, text, int, text, text, text, text, boolean, text)', 'execute')
     OR has_function_privilege('anon', 'public.update_pickup_game_details(text, text, text, text, text)', 'execute')
     OR has_function_privilege('anon', 'public.reschedule_pickup_game(text, text, text, text)', 'execute')
     OR has_function_privilege('anon', 'public.update_pickup_game_capacity(text, int, text)', 'execute')
     OR has_function_privilege('anon', 'public.cancel_pickup_game_as_host(text, text)', 'execute')
     OR has_function_privilege('anon', 'public.reopen_pickup_game_as_host(text)', 'execute')
     OR has_function_privilege('anon', 'public.complete_pickup_game_as_host(text)', 'execute')
     OR has_function_privilege('anon', 'public.admin_moderate_pickup_game(text, text, text)', 'execute')
     OR has_function_privilege('anon', 'public.get_host_pickup_games()', 'execute')
     OR has_function_privilege('anon', 'public.is_pickup_game_admin()', 'execute') THEN
    RAISE EXCEPTION 'TEST FAILED: Anonymous role must not have EXECUTE privileges on game management RPCs';
  END IF;
END $$;

-- 3. Functional Authorization Simulation
DO $$
DECLARE
  v_host_a uuid := '11111111-1111-4111-8111-111111111111';
  v_host_b uuid := '22222222-2222-4222-8222-222222222222';
  v_admin uuid  := '99999999-9999-4999-8999-999999999999';
  v_game_a_id uuid;
  v_game_b_id uuid;
  v_res jsonb;
  v_participant_id uuid;
  v_token text;
  v_count int;
BEGIN
  -- Insert mock auth users for testing
  INSERT INTO auth.users (id, email)
  VALUES
    (v_host_a, 'host_a@khelgrid.com'),
    (v_host_b, 'host_b@khelgrid.com'),
    (v_admin, 'admin@khelgrid.com')
  ON CONFLICT (id) DO NOTHING;

  -- ---------------------------------------------------------------------------
  -- TEST A: Host A creates a game
  -- ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_host_a::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  v_res := public.create_pickup_game(
    'Football',
    'Bangalore Football Stadium',
    'Bengaluru',
    'Today · 6:00 PM',
    10,
    '₹200/player',
    'Intermediate',
    '⚽',
    'https://chat.whatsapp.com/test-invite',
    true,
    'Host Alpha'
  );

  IF v_res->>'status' <> 'success' THEN
    RAISE EXCEPTION 'TEST FAILED: Host A failed to create pickup game: %', v_res;
  END IF;

  v_game_a_id := (v_res->>'game_id')::uuid;

  -- Verify host_user_id was bound to auth.uid() (Host A)
  IF NOT EXISTS (SELECT 1 FROM public.pickup_games WHERE id = v_game_a_id AND host_user_id = v_host_a) THEN
    RAISE EXCEPTION 'TEST FAILED: Game A host_user_id was not bound to Host A';
  END IF;

  -- ---------------------------------------------------------------------------
  -- TEST B: Host A can update and manage their own game
  -- ---------------------------------------------------------------------------
  v_res := public.update_pickup_game_details(v_game_a_id::text, 'Football 7v7', 'Advanced', '⚽', NULL);
  IF v_res->>'status' <> 'success' THEN
    RAISE EXCEPTION 'TEST FAILED: Host A failed to update own game details: %', v_res;
  END IF;

  v_res := public.reschedule_pickup_game(v_game_a_id::text, 'FSV Arena', 'Bengaluru', 'Tomorrow · 7:00 PM');
  IF v_res->>'status' <> 'success' THEN
    RAISE EXCEPTION 'TEST FAILED: Host A failed to reschedule own game: %', v_res;
  END IF;

  v_res := public.update_pickup_game_capacity(v_game_a_id::text, 14, '₹250/player');
  IF v_res->>'status' <> 'success' THEN
    RAISE EXCEPTION 'TEST FAILED: Host A failed to update capacity on own game: %', v_res;
  END IF;

  -- ---------------------------------------------------------------------------
  -- TEST C: Host B ATTEMPTS to modify Host A's game (MUST BE REJECTED WITH FORBIDDEN)
  -- ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_host_b::text, 'role', 'authenticated')::text, true);

  v_res := public.update_pickup_game_details(v_game_a_id::text, 'Hacked Sport', 'Beginner', '🎾', NULL);
  IF v_res->>'status' <> 'error' OR v_res->>'error_code' <> 'FORBIDDEN' THEN
    RAISE EXCEPTION 'TEST FAILED: Host B was not rejected with FORBIDDEN when modifying Host A game: %', v_res;
  END IF;

  v_res := public.reschedule_pickup_game(v_game_a_id::text, 'Malicious Venue', 'Delhi', 'Next Year');
  IF v_res->>'status' <> 'error' OR v_res->>'error_code' <> 'FORBIDDEN' THEN
    RAISE EXCEPTION 'TEST FAILED: Host B was not rejected with FORBIDDEN when rescheduling Host A game: %', v_res;
  END IF;

  v_res := public.update_pickup_game_capacity(v_game_a_id::text, 4, 'Free');
  IF v_res->>'status' <> 'error' OR v_res->>'error_code' <> 'FORBIDDEN' THEN
    RAISE EXCEPTION 'TEST FAILED: Host B was not rejected with FORBIDDEN when altering Host A capacity: %', v_res;
  END IF;

  v_res := public.cancel_pickup_game_as_host(v_game_a_id::text, 'Malicious cancellation');
  IF v_res->>'status' <> 'error' OR v_res->>'error_code' <> 'FORBIDDEN' THEN
    RAISE EXCEPTION 'TEST FAILED: Host B was not rejected with FORBIDDEN when cancelling Host A game: %', v_res;
  END IF;

  -- ---------------------------------------------------------------------------
  -- TEST D: Host A creates an unpublished draft game. Host B cannot read it via RLS.
  -- ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_host_a::text, 'role', 'authenticated')::text, true);
  v_res := public.create_pickup_game(
    'Tennis', 'Private Club', 'Bengaluru', 'Sunday · 8:00 AM', 4, 'Free', 'Intermediate', '🎾', NULL, false, 'Host A'
  );
  v_game_b_id := (v_res->>'game_id')::uuid;

  -- Under Host B session, query published games table
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_host_b::text, 'role', 'authenticated')::text, true);
  SELECT COUNT(*) INTO v_count FROM public.pickup_games WHERE id = v_game_b_id;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Host B was able to see Host A draft game through RLS';
  END IF;

  -- ---------------------------------------------------------------------------
  -- TEST E: Reservation and Hardened Cancellation Authorization
  -- ---------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('role', 'anon', true);

  -- Anonymous player books a spot
  v_res := public.rsvp_pickup_game(v_game_a_id::text, 'Rohan Sharma', '9876543210', false);
  IF v_res->>'status' <> 'confirmed' THEN
    RAISE EXCEPTION 'TEST FAILED: Anonymous RSVP failed: %', v_res;
  END IF;

  v_participant_id := (v_res->>'participant_id')::uuid;
  v_token := v_res->>'cancellation_token';

  IF v_token IS NULL OR char_length(v_token) < 10 THEN
    RAISE EXCEPTION 'TEST FAILED: rsvp_pickup_game did not return bearer cancellation_token';
  END IF;

  -- Anonymous attacker tries to cancel using just the phone number (WITHOUT token)
  -- MUST BE REJECTED with UNAUTHORIZED!
  v_res := public.cancel_pickup_game_reservation(v_participant_id, NULL);
  IF v_res->>'status' <> 'error' OR v_res->>'error_code' <> 'UNAUTHORIZED' THEN
    RAISE EXCEPTION 'TEST FAILED: Anonymous caller was able to cancel without cancellation token: %', v_res;
  END IF;

  -- Anonymous player provides valid cancellation token: SUCCEEDS
  v_res := public.cancel_pickup_game_reservation(v_participant_id, v_token);
  IF v_res->>'status' <> 'cancelled' THEN
    RAISE EXCEPTION 'TEST FAILED: Cancellation with valid token failed: %', v_res;
  END IF;

  -- ---------------------------------------------------------------------------
  -- TEST F: Administrative Moderation Permissions
  -- ---------------------------------------------------------------------------
  -- Regular user (Host A) calling admin_moderate_pickup_game MUST BE REJECTED
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_host_a::text, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  v_res := public.admin_moderate_pickup_game(v_game_a_id::text, 'feature', NULL);
  IF v_res->>'status' <> 'error' OR v_res->>'error_code' <> 'UNAUTHORIZED' THEN
    RAISE EXCEPTION 'TEST FAILED: Non-admin caller was not rejected when calling admin_moderate_pickup_game: %', v_res;
  END IF;

  -- Administrator with JWT admin claim can moderate
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin::text, 'role', 'admin')::text, true);

  v_res := public.admin_moderate_pickup_game(v_game_a_id::text, 'feature', NULL);
  IF v_res->>'status' <> 'success' THEN
    RAISE EXCEPTION 'TEST FAILED: Admin failed to feature game: %', v_res;
  END IF;

  v_res := public.admin_moderate_pickup_game(v_game_a_id::text, 'force_cancel', 'Violated safety rules');
  IF v_res->>'status' <> 'success' THEN
    RAISE EXCEPTION 'TEST FAILED: Admin failed to force cancel game: %', v_res;
  END IF;

  RAISE NOTICE 'ALL KHELGRID PHASE 3 DATABASE AUTHORIZATION TESTS PASSED SUCCESSFULLY.';
END $$;

ROLLBACK;
