-- Remove the earlier broad SELECT policy and retain one optimized policy
-- per API role. Public users see published games only; authenticated hosts
-- additionally see only their own games; moderators use trusted authorization.
BEGIN;
DROP POLICY IF EXISTS "pickup_games_read_published" ON public.pickup_games;
DROP POLICY IF EXISTS "pickup_games_read_published_anon" ON public.pickup_games;
DROP POLICY IF EXISTS "pickup_games_read_authenticated" ON public.pickup_games;

CREATE POLICY "pickup_games_read_published_anon"
ON public.pickup_games
FOR SELECT TO anon
USING (publication_status = 'published');

CREATE POLICY "pickup_games_read_authenticated"
ON public.pickup_games
FOR SELECT TO authenticated
USING (
  publication_status = 'published'
  OR (
    (SELECT auth.uid()) IS NOT NULL
    AND host_user_id = (SELECT auth.uid())
  )
  OR (SELECT public.is_pickup_game_admin())
);
COMMIT;
