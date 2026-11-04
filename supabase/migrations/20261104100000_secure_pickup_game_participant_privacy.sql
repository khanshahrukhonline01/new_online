-- ==============================================================================
-- KhelGrid Migration: Secure Pickup Game Participant Privacy
-- Purpose: Ensures Row Level Security is strictly enabled on pickup_game_participants,
-- removes the dangerous public read policy, and revokes direct SELECT permissions from
-- PUBLIC, anon, and authenticated roles. This prevents public scraping or harvesting
-- of player names, phone numbers, and reservation history via the Supabase REST API.
-- ==============================================================================

BEGIN;

-- Ensure Row Level Security is enabled
ALTER TABLE public.pickup_game_participants
ENABLE ROW LEVEL SECURITY;

-- Remove the public read policy
DROP POLICY IF EXISTS
  "pickup_game_participants_read"
ON public.pickup_game_participants;

-- Remove direct read permissions
REVOKE SELECT
ON public.pickup_game_participants
FROM PUBLIC, anon, authenticated;

COMMIT;
