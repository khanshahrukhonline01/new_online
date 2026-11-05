-- ==============================================================================
-- KhelGrid Play — Phase 3 host authorization and lifecycle regression tests
-- Development-only test. Creates temporary Auth users and game rows in a
-- transaction and rolls all changes back.
-- Run only after Phase 3 host-management SQL is present.
-- ==============================================================================
BEGIN;

DO $phase3$
DECLARE
  v_host_a uuid := gen_random_uuid();
  v_host_b uuid := gen_random_uuid();
  v_game_id uuid;
  v_legacy_game_id uuid;
  v_result jsonb;
  v_games jsonb;
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
    (v_host_a, 'authenticated', 'authenticated', 'phase3-a-'||v_host_a||'@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
    (v_host_b, 'authenticated', 'authenticated', 'phase3-b-'||v_host_b||'@example.test', now(), '{}'::jsonb, '{"is_admin":true}'::jsonb, now(), now());

  -- A. Host creation binds ownership to the verified JWT subject.
  PERFORM set_config('request.jwt.claim.sub', v_host_a::text, true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_host_a,'role','authenticated','app_metadata','{}'::jsonb,'user_metadata','{}'::jsonb)::text, true);
  v_result := public.create_pickup_game(
    'Badminton','Phase 3 Test Court','Delhi','Tomorrow 6 PM',4,'₹100','Intermediate','🏸',
    'https://chat.whatsapp.com/Phase3TestInvite',true,'Host A'
  );
  IF v_result->>'status' <> 'success' THEN RAISE EXCEPTION 'Host create failed: %',v_result; END IF;
  v_game_id := (v_result->>'game_id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.pickup_games WHERE id=v_game_id AND host_user_id=v_host_a) THEN
    RAISE EXCEPTION 'Game owner was not bound to auth.uid()';
  END IF;

  -- B. Another authenticated user cannot manage or view the host portfolio.
  PERFORM set_config('request.jwt.claim.sub', v_host_b::text, true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_host_b,'role','authenticated','app_metadata','{}'::jsonb,'user_metadata','{"is_admin":true}'::jsonb)::text, true);
  IF public.is_pickup_game_admin() THEN RAISE EXCEPTION 'user_metadata spoof granted admin'; END IF;

  v_result := public.update_pickup_game_details(v_game_id::text,'Football','Intermediate','⚽',NULL);
  IF v_result->>'error_code' <> 'FORBIDDEN' THEN RAISE EXCEPTION 'Non-owner edit accepted: %',v_result; END IF;
  v_result := public.reschedule_pickup_game(v_game_id::text,'Other Court','Mumbai','Next Month');
  IF v_result->>'error_code' <> 'FORBIDDEN' THEN RAISE EXCEPTION 'Non-owner reschedule accepted: %',v_result; END IF;
  v_result := public.update_pickup_game_capacity(v_game_id::text,8,'₹200');
  IF v_result->>'error_code' <> 'FORBIDDEN' THEN RAISE EXCEPTION 'Non-owner capacity edit accepted: %',v_result; END IF;
  v_result := public.cancel_pickup_game_as_host(v_game_id::text,'unauthorized attempt');
  IF v_result->>'error_code' <> 'FORBIDDEN' THEN RAISE EXCEPTION 'Non-owner cancellation accepted: %',v_result; END IF;
  v_result := public.complete_pickup_game_as_host(v_game_id::text);
  IF v_result->>'error_code' <> 'FORBIDDEN' THEN RAISE EXCEPTION 'Non-owner completion accepted: %',v_result; END IF;
  v_result := public.admin_moderate_pickup_game(v_game_id::text,'feature','unauthorized');
  IF v_result->>'error_code' <> 'UNAUTHORIZED' THEN RAISE EXCEPTION 'Non-admin moderation accepted: %',v_result; END IF;

  v_games := public.get_host_pickup_games();
  IF v_games->>'status' <> 'success' OR (v_games->'data')::text LIKE '%'||v_game_id::text||'%' THEN
    RAISE EXCEPTION 'Host portfolio leaked another host game: %',v_games;
  END IF;

  -- C. User-editable metadata cannot confer administrator status; trusted
  -- app_metadata can.
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_host_b,'role','authenticated','app_metadata','{"is_admin":true}'::jsonb,'user_metadata','{}'::jsonb)::text, true);
  IF NOT public.is_pickup_game_admin() THEN RAISE EXCEPTION 'Trusted app_metadata admin not recognized'; END IF;
  v_result := public.admin_moderate_pickup_game(v_game_id::text,'feature','phase3 test admin');
  IF v_result->>'status' <> 'success' THEN RAISE EXCEPTION 'Trusted admin moderation failed: %',v_result; END IF;

  -- D. Owner can manage their own game and obey lifecycle constraints.
  PERFORM set_config('request.jwt.claim.sub', v_host_a::text, true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_host_a,'role','authenticated','app_metadata','{}'::jsonb,'user_metadata','{}'::jsonb)::text, true);
  v_result := public.update_pickup_game_details(v_game_id::text,'Badminton','Advanced','🏸',NULL);
  IF v_result->>'status' <> 'success' THEN RAISE EXCEPTION 'Owner edit failed: %',v_result; END IF;
  v_result := public.reschedule_pickup_game(v_game_id::text,'Phase 3 Updated Court','Delhi','Saturday 7 AM');
  IF v_result->>'status' <> 'success' THEN RAISE EXCEPTION 'Owner reschedule failed: %',v_result; END IF;
  v_result := public.update_pickup_game_capacity(v_game_id::text,8,'₹150');
  IF v_result->>'status' <> 'success' THEN RAISE EXCEPTION 'Owner capacity update failed: %',v_result; END IF;
  v_games := public.get_host_pickup_games();
  IF v_games->>'status' <> 'success' OR (v_games->'data')::text NOT LIKE '%'||v_game_id::text||'%' THEN
    RAISE EXCEPTION 'Host cannot retrieve own game: %',v_games;
  END IF;
  v_result := public.cancel_pickup_game_as_host(v_game_id::text,'Phase 3 test cancellation');
  IF v_result->>'status' <> 'success' THEN RAISE EXCEPTION 'Owner cancellation failed: %',v_result; END IF;
  v_result := public.reopen_pickup_game_as_host(v_game_id::text);
  IF v_result->>'status' <> 'success' THEN RAISE EXCEPTION 'Owner reopen failed: %',v_result; END IF;
  v_result := public.complete_pickup_game_as_host(v_game_id::text);
  IF v_result->>'status' <> 'success' THEN RAISE EXCEPTION 'Owner completion failed: %',v_result; END IF;
  v_result := public.reschedule_pickup_game(v_game_id::text,'Invalid Court','Delhi','After Completion');
  IF v_result->>'error_code' <> 'INVALID_STATE' THEN RAISE EXCEPTION 'Completed game lifecycle guard failed: %',v_result; END IF;

  -- E. Existing unowned rows cannot be claimed by arbitrary users.
  SELECT id INTO v_legacy_game_id FROM public.pickup_games WHERE host_user_id IS NULL LIMIT 1;
  IF v_legacy_game_id IS NOT NULL THEN
    v_result := public.update_pickup_game_details(v_legacy_game_id::text,'Hacked','Intermediate','⚽',NULL);
    IF v_result->>'error_code' <> 'FORBIDDEN' THEN
      RAISE EXCEPTION 'Unowned legacy game became editable: %',v_result;
    END IF;
  END IF;

  -- F. Browser roles cannot execute privileged admin helper/management RPCs anonymously.
  IF has_function_privilege('anon','public.create_pickup_game(text,text,text,text,integer,text,text,text,text,boolean,text)','EXECUTE')
     OR has_function_privilege('anon','public.admin_moderate_pickup_game(text,text,text)','EXECUTE')
     OR has_function_privilege('anon','public.is_pickup_game_admin()','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role can execute a protected host/admin RPC';
  END IF;
  IF NOT has_function_privilege('authenticated','public.create_pickup_game(text,text,text,text,integer,text,text,text,text,boolean,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated role cannot execute host creation RPC';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('create_pickup_game','update_pickup_game_details','reschedule_pickup_game',
        'update_pickup_game_capacity','cancel_pickup_game_as_host','reopen_pickup_game_as_host',
        'complete_pickup_game_as_host','admin_moderate_pickup_game','get_host_pickup_games')
      AND (NOT p.prosecdef OR NOT coalesce(p.proconfig @> ARRAY['search_path=""'],false))
  ) THEN
    RAISE EXCEPTION 'A host-management RPC is not SECURITY DEFINER with empty search_path';
  END IF;

  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname='public' AND tablename='pickup_games'
        AND cmd='SELECT' AND roles @> ARRAY['anon']::name[]) <> 1 THEN
    RAISE EXCEPTION 'Anonymous pickup-game SELECT policy is duplicated or missing';
  END IF;
  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname='public' AND tablename='pickup_games'
        AND cmd='SELECT' AND roles @> ARRAY['authenticated']::name[]) <> 1 THEN
    RAISE EXCEPTION 'Authenticated pickup-game SELECT policy is duplicated or missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='pickup_games'
      AND policyname='pickup_games_read_published'
  ) THEN
    RAISE EXCEPTION 'Obsolete broad pickup-game read policy remains';
  END IF;

  RAISE NOTICE 'PASS: host ownership, non-owner denial, metadata spoof rejection, admin authorization, portfolio isolation, lifecycle, legacy game lockout, and RPC grants.';
END
$phase3$;

ROLLBACK;
