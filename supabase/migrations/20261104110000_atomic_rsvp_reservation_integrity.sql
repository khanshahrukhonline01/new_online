-- ==============================================================================
-- KhelGrid Play Security — Phase 2: RSVP abuse and reservation integrity
-- This migration hardens the existing pickup-game setup:
-- - all RSVP writes happen through one atomic RPC;
-- - rate limits are concurrency-safe and keyed by hashed phone / authenticated user;
-- - guests must provide a syntactically valid phone number;
-- - draft/unpublished/closed games cannot accept RSVPs;
-- - direct participant-table access is denied;
-- - the public catalogue cannot read the private WhatsApp invite column.
--
-- Apply only to the KhelGrid development Supabase project after the pickup-game
-- setup schema exists. Do not apply to production without a separate review.
-- ==============================================================================

BEGIN;

ALTER TABLE public.pickup_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Participant rows are private. All reads/writes are performed by narrowly
-- scoped SECURITY DEFINER RPCs; browser roles receive no table privileges.
DROP POLICY IF EXISTS "pickup_game_participants_read" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_game_participants_insert" ON public.pickup_game_participants;
REVOKE ALL ON TABLE public.pickup_game_participants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.pickup_game_rsvp_rate_limits FROM PUBLIC, anon, authenticated;

-- Public game discovery must not expose whatsapp_group_url or host-only metadata.
-- Column-level SELECT is intentional: table-level SELECT would expose every column.
REVOKE ALL ON TABLE public.pickup_games FROM PUBLIC, anon, authenticated;
REVOKE SELECT (whatsapp_group_url, host_user_id, cancellation_reason, cancelled_at, completed_at)
  ON TABLE public.pickup_games FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, slug, sport, emoji, skill_level, venue_name, city, time_label, host_name,
  price_per_player, spots_open, total_players, confirmed_players, is_featured,
  publication_status, status, created_at, updated_at
) ON TABLE public.pickup_games TO anon, authenticated;

DROP POLICY IF EXISTS "pickup_games_read_published" ON public.pickup_games;
DROP POLICY IF EXISTS "pickup_games_read_published_anon" ON public.pickup_games;
DROP POLICY IF EXISTS "pickup_games_read_authenticated" ON public.pickup_games;

-- Keep the anon policy independent of the authenticated-only admin helper.
CREATE POLICY "pickup_games_read_published_anon"
  ON public.pickup_games FOR SELECT TO anon
  USING (publication_status = 'published');

CREATE POLICY "pickup_games_read_authenticated"
  ON public.pickup_games FOR SELECT TO authenticated
  USING (
    publication_status = 'published'
    OR ((SELECT auth.uid()) IS NOT NULL AND host_user_id = (SELECT auth.uid()))
    OR (SELECT public.is_pickup_game_admin())
  );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.pickup_games FROM PUBLIC, anon, authenticated;

-- Atomic RSVP. The game row lock serializes duplicate checks, spot allocation,
-- and waitlist ordering for the same game.
CREATE OR REPLACE FUNCTION public.rsvp_pickup_game(
  p_game_id text,
  p_player_name text,
  p_player_phone text DEFAULT NULL,
  p_allow_waitlist boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_clean_name text;
  v_clean_phone text;
  v_user_id text;
  v_rate_key text;
  v_rate_count integer;
  v_game record;
  v_existing_id uuid;
  v_cancellation_token text;
  v_participant_id uuid;
  v_available_spots integer;
  v_new_spots integer;
  v_new_confirmed integer;
  v_new_status text;
  v_waitlist_position integer;
BEGIN
  v_clean_name := pg_catalog.btrim(p_player_name);
  IF v_clean_name IS NULL
     OR pg_catalog.char_length(v_clean_name) < 2
     OR pg_catalog.char_length(v_clean_name) > 100 THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_NAME',
      'message', 'Player name must be between 2 and 100 characters.'
    );
  END IF;

  -- Guest RSVPs require a phone number. A phone number is a deduplication and
  -- abuse-friction signal, not proof of identity; cancellation still requires
  -- the per-reservation bearer token or an authenticated owner/host.
  IF p_player_phone IS NULL OR pg_catalog.btrim(p_player_phone) = '' THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_PHONE',
      'message', 'A valid mobile number is required to reserve a spot.'
    );
  END IF;

  v_clean_phone := pg_catalog.regexp_replace(p_player_phone, '[^0-9]', '', 'g');
  IF pg_catalog.char_length(v_clean_phone) = 12
     AND pg_catalog.starts_with(v_clean_phone, '91') THEN
    v_clean_phone := pg_catalog.substring(v_clean_phone FROM 3);
  END IF;

  IF pg_catalog.char_length(v_clean_phone) < 10
     OR pg_catalog.char_length(v_clean_phone) > 15 THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_PHONE',
      'message', 'Please provide a valid mobile number.'
    );
  END IF;

  v_user_id := auth.uid()::text;

  -- Hash the phone identifier so the rate-limit table does not store raw phone
  -- numbers. INSERT .. ON CONFLICT DO UPDATE is one atomic counter operation;
  -- unlike SELECT .. FOR UPDATE followed by INSERT, it cannot lose concurrent
  -- first-attempt increments.
  v_rate_key := 'phone:' || pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_clean_phone, 'UTF8'), 'sha256'),
    'hex'
  );

  INSERT INTO public.pickup_game_rsvp_rate_limits AS rl
    (identifier, attempt_count, first_attempt_at, last_attempt_at)
  VALUES (v_rate_key, 1, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp())
  ON CONFLICT (identifier) DO UPDATE
  SET
    attempt_count = CASE
      WHEN pg_catalog.clock_timestamp() - rl.first_attempt_at >= interval '60 seconds' THEN 1
      ELSE rl.attempt_count + 1
    END,
    first_attempt_at = CASE
      WHEN pg_catalog.clock_timestamp() - rl.first_attempt_at >= interval '60 seconds'
        THEN pg_catalog.clock_timestamp()
      ELSE rl.first_attempt_at
    END,
    last_attempt_at = pg_catalog.clock_timestamp()
  RETURNING attempt_count INTO v_rate_count;

  IF v_rate_count > 5 THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'RATE_LIMITED',
      'message', 'Too many reservation attempts. Please wait 60 seconds before trying again.'
    );
  END IF;

  -- Signed-in users also receive a stable per-account limit so changing the
  -- phone field cannot bypass the account-level counter.
  IF v_user_id IS NOT NULL THEN
    v_rate_key := 'user:' || v_user_id;
    INSERT INTO public.pickup_game_rsvp_rate_limits AS rl
      (identifier, attempt_count, first_attempt_at, last_attempt_at)
    VALUES (v_rate_key, 1, pg_catalog.clock_timestamp(), pg_catalog.clock_timestamp())
    ON CONFLICT (identifier) DO UPDATE
    SET
      attempt_count = CASE
        WHEN pg_catalog.clock_timestamp() - rl.first_attempt_at >= interval '60 seconds' THEN 1
        ELSE rl.attempt_count + 1
      END,
      first_attempt_at = CASE
        WHEN pg_catalog.clock_timestamp() - rl.first_attempt_at >= interval '60 seconds'
          THEN pg_catalog.clock_timestamp()
        ELSE rl.first_attempt_at
      END,
      last_attempt_at = pg_catalog.clock_timestamp()
    RETURNING attempt_count INTO v_rate_count;

    IF v_rate_count > 5 THEN
      RETURN pg_catalog.jsonb_build_object(
        'status', 'error',
        'error_code', 'RATE_LIMITED',
        'message', 'Too many reservation attempts. Please wait 60 seconds before trying again.'
      );
    END IF;
  END IF;

  SELECT
    id, spots_open, total_players, confirmed_players,
    whatsapp_group_url, status, publication_status
  INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND OR v_game.publication_status <> 'published' THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'GAME_NOT_FOUND',
      'message', 'The requested pickup game was not found or is not available.'
    );
  END IF;

  IF v_game.status IN ('draft', 'completed', 'cancelled') THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'GAME_CLOSED',
      'message', 'This match is closed and cannot accept reservations.'
    );
  END IF;

  SELECT id INTO v_existing_id
  FROM public.pickup_game_participants
  WHERE game_id = p_game_id
    AND status IN ('confirmed', 'waitlist')
    AND (
      player_phone = v_clean_phone
      OR (v_user_id IS NOT NULL AND user_id = v_user_id)
    )
  LIMIT 1;

  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'duplicate',
      'error_code', 'DUPLICATE_REGISTRATION',
      'message', 'You already have an active reservation or waitlist entry for this match.',
      'reservation_id', v_existing_id
    );
  END IF;

  v_available_spots := LEAST(
    v_game.spots_open,
    pg_catalog.greatest(v_game.total_players - v_game.confirmed_players, 0)
  );

  IF v_available_spots > 0 AND v_game.status <> 'full' THEN
    v_new_spots := v_available_spots - 1;
    v_new_confirmed := v_game.confirmed_players + 1;
    v_new_status := CASE WHEN v_new_spots = 0 THEN 'full' ELSE 'open' END;
    v_cancellation_token := pg_catalog.gen_random_uuid()::text;

    UPDATE public.pickup_games
    SET spots_open = v_new_spots,
        confirmed_players = v_new_confirmed,
        status = v_new_status,
        updated_at = pg_catalog.now()
    WHERE id = v_game.id;

    INSERT INTO public.pickup_game_participants (
      game_id, user_id, player_name, player_phone, status, joined_at, cancellation_token
    ) VALUES (
      p_game_id, v_user_id, v_clean_name, v_clean_phone, 'confirmed',
      pg_catalog.now(), v_cancellation_token
    ) RETURNING id INTO v_participant_id;

    RETURN pg_catalog.jsonb_build_object(
      'status', 'confirmed',
      'message', 'Spot confirmed! Welcome to the match, ' || v_clean_name || '.',
      'participant_id', v_participant_id,
      'cancellation_token', v_cancellation_token,
      'spots_open', v_new_spots,
      'confirmed_players', v_new_confirmed,
      'game_status', v_new_status,
      'whatsapp_group_url', v_game.whatsapp_group_url
    );
  END IF;

  IF COALESCE(p_allow_waitlist, false) THEN
    SELECT pg_catalog.count(*) + 1 INTO v_waitlist_position
    FROM public.pickup_game_participants
    WHERE game_id = p_game_id AND status = 'waitlist';

    v_cancellation_token := pg_catalog.gen_random_uuid()::text;
    INSERT INTO public.pickup_game_participants (
      game_id, user_id, player_name, player_phone, status, joined_at, cancellation_token
    ) VALUES (
      p_game_id, v_user_id, v_clean_name, v_clean_phone, 'waitlist',
      pg_catalog.now(), v_cancellation_token
    ) RETURNING id INTO v_participant_id;

    RETURN pg_catalog.jsonb_build_object(
      'status', 'waitlist',
      'message', 'Match is full. You have been added to the waitlist (Position #' || v_waitlist_position || ').',
      'participant_id', v_participant_id,
      'cancellation_token', v_cancellation_token,
      'waitlist_position', v_waitlist_position,
      'spots_open', 0,
      'confirmed_players', v_game.confirmed_players,
      'game_status', 'full',
      'whatsapp_group_url', NULL
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'full',
    'error_code', 'MATCH_FULL',
    'message', 'This pickup match is already full! No spots left.',
    'spots_open', 0,
    'confirmed_players', v_game.confirmed_players,
    'game_status', 'full',
    'whatsapp_group_url', NULL
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) TO anon, authenticated;


-- Cancellation uses the same lock order as RSVP (game first, participant second)
-- to avoid a game/participant deadlock under concurrent RSVP and cancellation.
CREATE OR REPLACE FUNCTION public.cancel_pickup_game_reservation(
  p_reservation_id uuid,
  p_cancellation_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_game_id text;
  v_game record;
  v_participant record;
  v_next_waitlist record;
  v_user_id text;
  v_authorized boolean := false;
BEGIN
  SELECT game_id INTO v_game_id
  FROM public.pickup_game_participants
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error', 'error_code', 'RESERVATION_NOT_FOUND',
      'message', 'Reservation record not found.'
    );
  END IF;

  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = v_game_id
  FOR UPDATE;

  SELECT * INTO v_participant
  FROM public.pickup_game_participants
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND OR v_participant.game_id <> v_game_id THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error', 'error_code', 'RESERVATION_NOT_FOUND',
      'message', 'Reservation record not found.'
    );
  END IF;

  v_user_id := auth.uid()::text;

  IF v_user_id IS NOT NULL AND (
    (v_game.host_user_id IS NOT NULL AND v_user_id = v_game.host_user_id::text)
    OR (v_participant.user_id IS NOT NULL AND v_user_id = v_participant.user_id)
    OR public.is_pickup_game_admin()
  ) THEN
    v_authorized := true;
  ELSIF p_cancellation_token IS NOT NULL
    AND v_participant.cancellation_token IS NOT NULL
    AND pg_catalog.length(p_cancellation_token) >= 20
    AND v_participant.cancellation_token = p_cancellation_token THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error', 'error_code', 'UNAUTHORIZED',
      'message', 'A valid cancellation token or authenticated reservation owner/host is required.'
    );
  END IF;

  IF v_participant.status = 'cancelled' THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'already_cancelled', 'message', 'Reservation was already cancelled.'
    );
  END IF;

  UPDATE public.pickup_game_participants
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  IF v_participant.status = 'confirmed' THEN
    SELECT * INTO v_next_waitlist
    FROM public.pickup_game_participants
    WHERE game_id = v_game_id AND status = 'waitlist'
    ORDER BY joined_at ASC, id ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.pickup_game_participants
      SET status = 'confirmed'
      WHERE id = v_next_waitlist.id;

      RETURN pg_catalog.jsonb_build_object(
        'status', 'cancelled',
        'message', 'Reservation cancelled. The next waitlisted player was promoted.',
        'promoted_participant_id', v_next_waitlist.id
      );
    END IF;

    UPDATE public.pickup_games
    SET spots_open = LEAST(total_players - confirmed_players + 1, spots_open + 1),
        confirmed_players = GREATEST(0, confirmed_players - 1),
        status = CASE WHEN status = 'full' THEN 'open' ELSE status END,
        updated_at = pg_catalog.now()
    WHERE id = v_game.id;

    RETURN pg_catalog.jsonb_build_object(
      'status', 'cancelled',
      'message', 'Reservation cancelled and spot reopened successfully.'
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'cancelled', 'message', 'Waitlist reservation cancelled.'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) TO anon, authenticated;

-- The bearer-token cancellation RPC is installed by the pickup-game setup /
-- host-management migration. Keep its explicit guest and authenticated access.
REVOKE EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) TO anon, authenticated;

COMMIT;
