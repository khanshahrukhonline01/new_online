-- KhelGrid: Safe athlete-profile policy predicate
-- Follow-up to 20261117103000_athlete_profile_public_access_guard.sql.
-- Uses a narrowly scoped SECURITY DEFINER boolean predicate so anon can
-- evaluate the restrictive policy without receiving permission to call the
-- internal administrator helper directly.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_read_athlete_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND (
      auth.uid() = p_user_id
      OR public.is_pickup_game_admin()
    );
$function$;

REVOKE ALL ON FUNCTION public.can_read_athlete_profile(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_athlete_profile(uuid)
  TO anon, authenticated, service_role;

-- ALTER POLICY preserves the existing policy object and changes only its
-- predicate; no policy, table, row, or function is dropped.
ALTER POLICY athlete_profiles_private_public_access_guard
  ON public.athlete_profiles
  USING (public.can_read_athlete_profile(user_id));

COMMIT;
