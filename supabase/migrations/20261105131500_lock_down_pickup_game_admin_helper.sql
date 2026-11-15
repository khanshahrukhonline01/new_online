-- Phase 3.5: prevent direct client invocation of the admin predicate helper.
-- Privileged SECURITY DEFINER management RPCs invoke it internally as their owner.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.is_pickup_game_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_pickup_game_admin() TO service_role;
COMMIT;
