\set ON_ERROR_STOP on

-- The hosted-schema fixture does not include the public CV RPC. Install a
-- harmless test stub with the historical broad grant so this test proves the
-- migration actually removes browser access.
DO $$
BEGIN
  IF to_regprocedure('public.get_athlete_public_cv(text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.get_athlete_public_cv(p_username text)
      RETURNS jsonb
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public, pg_temp
      AS 'SELECT NULL::jsonb'
    $fn$;
  END IF;
END
$$;
GRANT EXECUTE ON FUNCTION public.get_athlete_public_cv(text)
  TO PUBLIC, anon, authenticated, service_role;

-- Apply the real migration under test.
\ir ../../supabase/migrations/20261117103000_athlete_profile_public_access_guard.sql

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_athlete_public_cv(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can still execute get_athlete_public_cv';
  END IF;
  IF has_function_privilege('authenticated', 'public.get_athlete_public_cv(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can still execute get_athlete_public_cv';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.get_athlete_public_cv(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role lost get_athlete_public_cv compatibility';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.athlete_profiles'::regclass
      AND polname = 'athlete_profiles_private_public_access_guard'
      AND NOT polpermissive
      AND polcmd = 'r'
  ) THEN
    RAISE EXCEPTION 'restrictive athlete profile SELECT guard is missing';
  END IF;
END
$$;

-- Exercise the restrictive policy in an isolated transaction. This test-only
-- policy mirrors the owner-read policy present in the hosted development DB.
BEGIN;
CREATE OR REPLACE FUNCTION public.is_pickup_game_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT coalesce(current_setting('test.is_pickup_game_admin', true), 'false') = 'true'
$fn$;
GRANT EXECUTE ON FUNCTION public.is_pickup_game_admin() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.athlete_profiles'::regclass
      AND polname = 'athlete_profiles_owner_draft_read'
  ) THEN
    CREATE POLICY athlete_profiles_owner_draft_read
      ON public.athlete_profiles
      FOR SELECT TO authenticated
      USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
  END IF;
END
$$;

GRANT SELECT ON TABLE public.athlete_profiles TO anon, authenticated;

INSERT INTO public.athlete_profiles (username, full_name, sport, user_id, publication_status)
VALUES ('ci-athlete-guard-test', 'CI Athlete Guard', 'Athletics',
        '11111111-1111-4111-8111-111111111111', 'published');

SET LOCAL ROLE anon;
SELECT count(*) = 0 AS anon_denied
FROM public.athlete_profiles WHERE username = 'ci-athlete-guard-test';
\gset
\if :anon_denied
  \echo 'PASS: anonymous profile read denied'
\else
  \echo 'FAIL: anonymous profile read was allowed'
  \quit 1
\endif
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
SET LOCAL ROLE authenticated;
SELECT count(*) = 1 AS owner_allowed
FROM public.athlete_profiles WHERE username = 'ci-athlete-guard-test';
\gset
\if :owner_allowed
  \echo 'PASS: profile owner can read own profile'
\else
  \echo 'FAIL: profile owner cannot read own profile'
  \quit 1
\endif
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SET LOCAL ROLE authenticated;
SELECT count(*) = 0 AS other_user_denied
FROM public.athlete_profiles WHERE username = 'ci-athlete-guard-test';
\gset
\if :other_user_denied
  \echo 'PASS: other authenticated user cannot read profile'
\else
  \echo 'FAIL: other authenticated user read profile'
  \quit 1
\endif
RESET ROLE;

SET LOCAL request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
SET LOCAL test.is_pickup_game_admin = 'true';
SET LOCAL ROLE authenticated;
SELECT count(*) = 1 AS admin_allowed
FROM public.athlete_profiles WHERE username = 'ci-athlete-guard-test';
\gset
\if :admin_allowed
  \echo 'PASS: authorized administrator can read profile'
\else
  \echo 'FAIL: authorized administrator cannot read profile'
  \quit 1
\endif
RESET ROLE;
ROLLBACK;
