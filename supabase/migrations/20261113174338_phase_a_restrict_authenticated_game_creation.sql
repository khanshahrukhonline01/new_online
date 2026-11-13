-- Pickup-game creation already requires auth.uid() in the function body.
-- Remove anonymous RPC access so the API surface matches that contract.
BEGIN;
REVOKE ALL ON FUNCTION public.create_pickup_game(text, text, text, text, integer, text, text, text, text, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pickup_game(text, text, text, text, integer, text, text, text, text, boolean, text)
  TO authenticated;
COMMIT;
