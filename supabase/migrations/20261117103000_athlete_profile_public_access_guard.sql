-- KhelGrid: Fail-closed public athlete-profile access guard
-- Development-only rollout. This migration does not delete or modify profile rows.
-- Public profile publication remains paused until explicit consent and guardian
-- consent are represented and enforced by a hosted-schema-compatible workflow.

BEGIN;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polrelid = 'public.athlete_profiles'::regclass
      AND polname = 'athlete_profiles_private_public_access_guard'
  ) THEN
    CREATE POLICY athlete_profiles_private_public_access_guard
      ON public.athlete_profiles
      AS RESTRICTIVE
      FOR SELECT
      TO anon, authenticated
      USING (
        CASE
          WHEN auth.uid() IS NULL THEN false
          ELSE user_id = auth.uid() OR public.is_pickup_game_admin()
        END
      );
  END IF;
END
$migration$;

-- The current RPC predates the hosted consent schema and returns a published
-- profile projection without enforcing the consent flags present on the table.
-- Keep the function and its implementation intact for future reviewed reuse,
-- but prevent browser roles from invoking it until a consent-gated replacement
-- is installed and tested. The trusted service role retains execution.
REVOKE EXECUTE ON FUNCTION public.get_athlete_public_cv(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_athlete_public_cv(text)
  TO service_role;

COMMIT;
