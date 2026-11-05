-- Forward reconciliation of Phase 3 host management after Phase 2.
-- Re-applies host authorization schema and RPCs while preserving Phase 2
-- atomic rate counters and SHA-256 cancellation-token storage/verification.
-- Development first; never apply to production without separate approval.
-- ==============================================================================
-- KhelGrid Play Security — Phase 3: Host Authorization, Game Ownership & Lifecycle Integrity
-- Purpose:
-- 1. Add host_user_id (foreign key referencing auth.users) to public.pickup_games.
-- 2. Add cancellation and completion tracking metadata (cancellation_reason, cancelled_at, completed_at).
-- 3. Add cryptographic bearer cancellation_token to public.pickup_game_participants.
-- 4. Enforce valid game status check: ('draft', 'open', 'full', 'completed', 'cancelled').
-- 5. Revoke direct INSERT, UPDATE, DELETE on public.pickup_games from anon and authenticated.
-- 6. Establish secure Row Level Security policies for public discovery vs. host own-game access.
-- 7. Create admin authorization helper public.is_pickup_game_admin() using empty search_path.
-- 8. Harden cancel_pickup_game_reservation() with SET search_path = '' and bearer token / auth verification.
-- 9. Harden rsvp_pickup_game() with SET search_path = '', returning cancellation_token to reserving player.
-- 10. Create atomic SECURITY DEFINER game management RPC functions using SET search_path = '':
--     - public.create_pickup_game() (requires authenticated host, binds host_user_id = auth.uid())
--     - public.update_pickup_game_details() (owner or admin only; validates state)
--     - public.reschedule_pickup_game() (owner or admin only; validates state)
--     - public.update_pickup_game_capacity() (owner or admin only; prevents capacity < confirmed)
--     - public.cancel_pickup_game_as_host() (owner or admin only; cancels game and active RSVPs)
--     - public.reopen_pickup_game_as_host() (owner or admin only; blocked on completed games)
--     - public.complete_pickup_game_as_host() (owner or admin only; marks match completed)
--     - public.admin_moderate_pickup_game() (admin only; feature, unfeature, archive, force-cancel)
--     - public.get_host_pickup_games() (returns authenticated host's own games with private URLs)
-- 11. Strictly revoke EXECUTE from PUBLIC/anon on all administrative and host management functions.
-- ==============================================================================

BEGIN;

-- 1. Schema Extensions for Host Ownership, Lifecycle and Bearer Token
ALTER TABLE public.pickup_games
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_pickup_games_host_user_id
  ON public.pickup_games (host_user_id);

CREATE INDEX IF NOT EXISTS idx_pickup_games_status_pub
  ON public.pickup_games (status, publication_status);

-- Update status check constraint to include draft, open, full, completed, cancelled
ALTER TABLE public.pickup_games
  DROP CONSTRAINT IF EXISTS pickup_games_status_check;

ALTER TABLE public.pickup_games
  ADD CONSTRAINT pickup_games_status_check
  CHECK (status IN ('draft', 'open', 'full', 'completed', 'cancelled'));

-- Extend pickup_game_participants with cryptographic bearer cancellation token
ALTER TABLE public.pickup_game_participants
  ADD COLUMN IF NOT EXISTS cancellation_token text DEFAULT gen_random_uuid()::text;

-- 2. Revoke direct client manipulation (INSERT, UPDATE, DELETE) on pickup_games
DROP POLICY IF EXISTS "pickup_games_insert_community" ON public.pickup_games;
DROP POLICY IF EXISTS "pickup_games_update_spots" ON public.pickup_games;

REVOKE INSERT, UPDATE, DELETE ON public.pickup_games FROM PUBLIC, anon, authenticated;

-- 3. Admin / Moderator Authorization Helper
-- Uses SET search_path = '' and fully qualified objects according to Supabase best practices.
CREATE OR REPLACE FUNCTION public.is_pickup_game_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'admin'
    OR (coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->'app_metadata'->>'is_admin', 'false'))::boolean = true
    OR EXISTS (
      SELECT 1 FROM public.listing_moderators m
      WHERE m.user_id = auth.uid() AND m.is_active = true
    )
  );
$$;

-- 4. Secure RLS for pickup_games
DROP POLICY IF EXISTS "pickup_games_read_published" ON public.pickup_games;
CREATE POLICY "pickup_games_read_published" ON public.pickup_games
  FOR SELECT TO anon, authenticated
  USING (
    publication_status = 'published'
    OR (auth.uid() IS NOT NULL AND host_user_id = auth.uid())
    OR public.is_pickup_game_admin()
  );

-- 5. Hardened Cancellation Function: cancel_pickup_game_reservation
-- Replaces guessable phone-number check with genuine ownership verification:
-- - Authenticated reservation owner (auth.uid() = participant.user_id)
-- - Authenticated game host or administrator
-- - Cryptographic bearer cancellation_token returned at booking time
-- Uses SET search_path = '' and fully qualified objects.
-- Drop Phase 2 version first: PostgreSQL cannot rename parameters via CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.cancel_pickup_game_reservation(uuid, text);
CREATE OR REPLACE FUNCTION public.cancel_pickup_game_reservation(p_reservation_id uuid, p_cancellation_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error', 'error_code', 'GAME_NOT_FOUND',
      'message', 'The associated pickup game no longer exists.'
    );
  END IF;

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
    AND (v_participant.cancellation_token = p_cancellation_token OR v_participant.cancellation_token = pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_cancellation_token, 'UTF8'), 'sha256'), 'hex')) THEN
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
$function$


-- 6. Hardened RSVP Function: rsvp_pickup_game
-- Hardens search_path = '', fully qualifies objects, and returns cryptographic bearer cancellation_token
CREATE OR REPLACE FUNCTION public.rsvp_pickup_game(p_game_id text, p_player_name text, p_player_phone text DEFAULT NULL::text, p_allow_waitlist boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
    v_clean_phone := pg_catalog.substr(v_clean_phone, 3);
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
    GREATEST(v_game.total_players - v_game.confirmed_players, 0)
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
      pg_catalog.now(), pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_cancellation_token, 'UTF8'), 'sha256'), 'hex')
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
      pg_catalog.now(), pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_cancellation_token, 'UTF8'), 'sha256'), 'hex')
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
$function$


-- 7. RPC: create_pickup_game
-- Requires authenticated host (auth.uid()), binds host_user_id, validates inputs and creates slug.
CREATE OR REPLACE FUNCTION public.create_pickup_game(
  p_sport text,
  p_venue_name text,
  p_city text,
  p_time_label text,
  p_total_players int,
  p_price_per_player text DEFAULT 'Free',
  p_skill_level text DEFAULT 'Intermediate',
  p_emoji text DEFAULT '⚽',
  p_whatsapp_group_url text DEFAULT NULL,
  p_publish_immediately boolean DEFAULT true,
  p_host_display_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_clean_sport text;
  v_clean_venue text;
  v_clean_city text;
  v_clean_time text;
  v_clean_price text;
  v_clean_skill text;
  v_clean_emoji text;
  v_clean_whatsapp text;
  v_clean_host text;
  v_game_id uuid;
  v_slug text;
  v_base_slug text;
  v_slug_suffix text;
  v_status text;
  v_pub_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL AND NOT public.is_pickup_game_admin() THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'UNAUTHORIZED',
      'message', 'Authentication required. You must be signed in with a verified account to create a pickup match.'
    );
  END IF;

  v_clean_sport := trim(p_sport);
  IF v_clean_sport IS NULL OR char_length(v_clean_sport) < 2 OR char_length(v_clean_sport) > 80 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_SPORT', 'message', 'Sport must be between 2 and 80 characters.');
  END IF;

  v_clean_venue := trim(p_venue_name);
  IF v_clean_venue IS NULL OR char_length(v_clean_venue) < 2 OR char_length(v_clean_venue) > 180 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_VENUE', 'message', 'Venue name must be between 2 and 180 characters.');
  END IF;

  v_clean_city := trim(p_city);
  IF v_clean_city IS NULL OR char_length(v_clean_city) < 1 OR char_length(v_clean_city) > 120 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_CITY', 'message', 'City must be between 1 and 120 characters.');
  END IF;

  v_clean_time := trim(p_time_label);
  IF v_clean_time IS NULL OR char_length(v_clean_time) < 2 OR char_length(v_clean_time) > 120 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_TIME', 'message', 'Time label must be between 2 and 120 characters.');
  END IF;

  IF p_total_players IS NULL OR p_total_players < 2 OR p_total_players > 200 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_CAPACITY', 'message', 'Total players must be between 2 and 200.');
  END IF;

  v_clean_skill := coalesce(trim(p_skill_level), 'Intermediate');
  IF v_clean_skill NOT IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_SKILL_LEVEL', 'message', 'Skill level must be Beginner, Intermediate, Advanced, or All Levels.');
  END IF;

  v_clean_price := coalesce(nullif(trim(p_price_per_player), ''), 'Free');
  v_clean_emoji := coalesce(nullif(trim(p_emoji), ''), '⚽');

  IF p_whatsapp_group_url IS NOT NULL AND trim(p_whatsapp_group_url) <> '' THEN
    v_clean_whatsapp := trim(p_whatsapp_group_url);
    IF NOT (v_clean_whatsapp ~* '^https:\/\/(chat\.whatsapp\.com\/[A-Za-z0-9_-]+|wa\.me\/[0-9]+)') THEN
      RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_WHATSAPP_URL', 'message', 'WhatsApp URL must be a valid chat.whatsapp.com invite link or wa.me link.');
    END IF;
  ELSE
    v_clean_whatsapp := NULL;
  END IF;

  v_clean_host := coalesce(nullif(trim(p_host_display_name), ''), 'Community Host');

  IF p_publish_immediately THEN
    v_status := 'open';
    v_pub_status := 'published';
  ELSE
    v_status := 'draft';
    v_pub_status := 'draft';
  END IF;

  v_base_slug := lower(regexp_replace(v_clean_sport || '-' || v_clean_city || '-' || v_clean_venue, '[^a-z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  IF char_length(v_base_slug) > 80 THEN
    v_base_slug := substring(v_base_slug from 1 for 80);
  END IF;
  v_slug_suffix := substring(gen_random_uuid()::text from 1 for 6);
  v_slug := v_base_slug || '-' || v_slug_suffix;

  INSERT INTO public.pickup_games (
    slug,
    sport,
    emoji,
    skill_level,
    venue_name,
    city,
    time_label,
    host_name,
    host_user_id,
    price_per_player,
    spots_open,
    total_players,
    confirmed_players,
    whatsapp_group_url,
    status,
    is_featured,
    publication_status,
    created_at,
    updated_at
  ) VALUES (
    v_slug,
    v_clean_sport,
    v_clean_emoji,
    v_clean_skill,
    v_clean_venue,
    v_clean_city,
    v_clean_time,
    v_clean_host,
    v_user_id,
    v_clean_price,
    p_total_players,
    p_total_players,
    0,
    v_clean_whatsapp,
    v_status,
    false,
    v_pub_status,
    now(),
    now()
  ) RETURNING id INTO v_game_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Pickup match created successfully.',
    'game_id', v_game_id,
    'slug', v_slug,
    'game_status', v_status,
    'publication_status', v_pub_status
  );
END;
$$;

-- 8. RPC: update_pickup_game_details
CREATE OR REPLACE FUNCTION public.update_pickup_game_details(
  p_game_id text,
  p_sport text DEFAULT NULL,
  p_skill_level text DEFAULT NULL,
  p_emoji text DEFAULT NULL,
  p_whatsapp_group_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game record;
  v_clean_whatsapp text;
BEGIN
  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  END IF;

  IF auth.uid() IS NULL OR (v_game.host_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_pickup_game_admin()) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to edit this match.');
  END IF;

  IF v_game.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Completed games cannot be edited.');
  END IF;
  IF v_game.status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Cancelled games cannot be edited. Reopen the game first.');
  END IF;

  IF p_skill_level IS NOT NULL AND p_skill_level NOT IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_SKILL_LEVEL', 'message', 'Invalid skill level.');
  END IF;

  IF p_whatsapp_group_url IS NOT NULL AND trim(p_whatsapp_group_url) <> '' THEN
    v_clean_whatsapp := trim(p_whatsapp_group_url);
    IF NOT (v_clean_whatsapp ~* '^https:\/\/(chat\.whatsapp\.com\/[A-Za-z0-9_-]+|wa\.me\/[0-9]+)') THEN
      RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_WHATSAPP_URL', 'message', 'Invalid WhatsApp URL.');
    END IF;
  ELSE
    v_clean_whatsapp := v_game.whatsapp_group_url;
  END IF;

  UPDATE public.pickup_games
  SET
    sport = coalesce(nullif(trim(p_sport), ''), sport),
    skill_level = coalesce(p_skill_level, skill_level),
    emoji = coalesce(nullif(trim(p_emoji), ''), emoji),
    whatsapp_group_url = v_clean_whatsapp,
    updated_at = now()
  WHERE id = v_game.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Match details updated successfully.',
    'game_id', v_game.id
  );
END;
$$;

-- 9. RPC: reschedule_pickup_game
CREATE OR REPLACE FUNCTION public.reschedule_pickup_game(
  p_game_id text,
  p_venue_name text,
  p_city text,
  p_time_label text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game record;
BEGIN
  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  END IF;

  IF auth.uid() IS NULL OR (v_game.host_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_pickup_game_admin()) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to reschedule this match.');
  END IF;

  IF v_game.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Cannot reschedule a completed or cancelled match.');
  END IF;

  IF char_length(trim(p_venue_name)) < 2 OR char_length(trim(p_city)) < 1 OR char_length(trim(p_time_label)) < 2 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_INPUT', 'message', 'Venue, city, and time label must be provided.');
  END IF;

  UPDATE public.pickup_games
  SET
    venue_name = trim(p_venue_name),
    city = trim(p_city),
    time_label = trim(p_time_label),
    updated_at = now()
  WHERE id = v_game.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Match rescheduled successfully.',
    'game_id', v_game.id,
    'venue_name', trim(p_venue_name),
    'city', trim(p_city),
    'time_label', trim(p_time_label)
  );
END;
$$;

-- 10. RPC: update_pickup_game_capacity
CREATE OR REPLACE FUNCTION public.update_pickup_game_capacity(
  p_game_id text,
  p_total_players int,
  p_price_per_player text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game record;
  v_new_spots int;
  v_new_status text;
BEGIN
  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  END IF;

  IF auth.uid() IS NULL OR (v_game.host_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_pickup_game_admin()) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to alter capacity for this match.');
  END IF;

  IF v_game.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Cannot alter capacity on a completed or cancelled match.');
  END IF;

  IF p_total_players IS NULL OR p_total_players < 2 OR p_total_players > 200 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_CAPACITY', 'message', 'Total capacity must be between 2 and 200.');
  END IF;

  IF p_total_players < v_game.confirmed_players THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'CAPACITY_BELOW_CONFIRMED',
      'message', 'Total capacity cannot be reduced below the number of confirmed players (' || v_game.confirmed_players || ').'
    );
  END IF;

  v_new_spots := p_total_players - v_game.confirmed_players;
  v_new_status := CASE WHEN v_new_spots = 0 THEN 'full' ELSE 'open' END;

  UPDATE public.pickup_games
  SET
    total_players = p_total_players,
    spots_open = v_new_spots,
    status = v_new_status,
    price_per_player = coalesce(nullif(trim(p_price_per_player), ''), price_per_player),
    updated_at = now()
  WHERE id = v_game.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Capacity updated successfully.',
    'game_id', v_game.id,
    'total_players', p_total_players,
    'spots_open', v_new_spots,
    'game_status', v_new_status
  );
END;
$$;

-- 11. RPC: cancel_pickup_game_as_host
CREATE OR REPLACE FUNCTION public.cancel_pickup_game_as_host(
  p_game_id text,
  p_cancellation_reason text DEFAULT 'Match cancelled by host'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game record;
  v_affected_confirmed int;
  v_affected_waitlist int;
BEGIN
  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  END IF;

  IF auth.uid() IS NULL OR (v_game.host_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_pickup_game_admin()) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to cancel this match.');
  END IF;

  IF v_game.status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'already_cancelled', 'message', 'This match is already cancelled.');
  END IF;

  IF v_game.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Completed matches cannot be cancelled.');
  END IF;

  SELECT count(*) INTO v_affected_confirmed
  FROM public.pickup_game_participants
  WHERE game_id = p_game_id AND status = 'confirmed';

  SELECT count(*) INTO v_affected_waitlist
  FROM public.pickup_game_participants
  WHERE game_id = p_game_id AND status = 'waitlist';

  UPDATE public.pickup_games
  SET
    status = 'cancelled',
    cancellation_reason = coalesce(nullif(trim(p_cancellation_reason), ''), 'Match cancelled by host'),
    cancelled_at = now(),
    updated_at = now()
  WHERE id = v_game.id;

  -- Reservation Integrity: mark active reservations cancelled, preserving history
  UPDATE public.pickup_game_participants
  SET status = 'cancelled'
  WHERE game_id = p_game_id AND status IN ('confirmed', 'waitlist');

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Match cancelled successfully.',
    'game_id', v_game.id,
    'confirmed_reservations_cancelled', v_affected_confirmed,
    'waitlist_reservations_cancelled', v_affected_waitlist
  );
END;
$$;

-- 12. RPC: reopen_pickup_game_as_host
CREATE OR REPLACE FUNCTION public.reopen_pickup_game_as_host(
  p_game_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game record;
  v_new_status text;
BEGIN
  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  END IF;

  IF auth.uid() IS NULL OR (v_game.host_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_pickup_game_admin()) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to reopen this match.');
  END IF;

  IF v_game.status = 'completed' AND NOT public.is_pickup_game_admin() THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Completed matches cannot be reopened without administrator authorization.');
  END IF;

  IF v_game.status <> 'cancelled' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Only cancelled matches can be reopened.');
  END IF;

  v_new_status := CASE WHEN v_game.spots_open = 0 THEN 'full' ELSE 'open' END;

  UPDATE public.pickup_games
  SET
    status = v_new_status,
    cancellation_reason = NULL,
    cancelled_at = NULL,
    updated_at = now()
  WHERE id = v_game.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Match reopened successfully.',
    'game_id', v_game.id,
    'game_status', v_new_status
  );
END;
$$;

-- 13. RPC: complete_pickup_game_as_host
CREATE OR REPLACE FUNCTION public.complete_pickup_game_as_host(
  p_game_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game record;
BEGIN
  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  END IF;

  IF auth.uid() IS NULL OR (v_game.host_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_pickup_game_admin()) THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to complete this match.');
  END IF;

  IF v_game.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'already_completed', 'message', 'Match is already completed.');
  END IF;

  IF v_game.status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Cancelled matches cannot be marked completed. Reopen first.');
  END IF;

  UPDATE public.pickup_games
  SET
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  WHERE id = v_game.id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Match marked as completed.',
    'game_id', v_game.id,
    'game_status', 'completed'
  );
END;
$$;

-- 14. RPC: admin_moderate_pickup_game
CREATE OR REPLACE FUNCTION public.admin_moderate_pickup_game(
  p_game_id text,
  p_action text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_game record;
BEGIN
  IF NOT public.is_pickup_game_admin() THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Administrator or moderator privileges required.');
  END IF;

  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  END IF;

  IF p_action = 'feature' THEN
    UPDATE public.pickup_games SET is_featured = true, updated_at = now() WHERE id = v_game.id;
  ELSIF p_action = 'unfeature' THEN
    UPDATE public.pickup_games SET is_featured = false, updated_at = now() WHERE id = v_game.id;
  ELSIF p_action = 'archive' THEN
    UPDATE public.pickup_games SET publication_status = 'archived', updated_at = now() WHERE id = v_game.id;
  ELSIF p_action = 'publish' THEN
    UPDATE public.pickup_games SET publication_status = 'published', updated_at = now() WHERE id = v_game.id;
  ELSIF p_action = 'force_cancel' THEN
    UPDATE public.pickup_games
    SET status = 'cancelled',
        cancellation_reason = coalesce(p_notes, 'Cancelled by administrator moderation'),
        cancelled_at = now(),
        updated_at = now()
    WHERE id = v_game.id;
    UPDATE public.pickup_game_participants
    SET status = 'cancelled'
    WHERE game_id = p_game_id AND status IN ('confirmed', 'waitlist');
  ELSE
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ACTION', 'message', 'Unrecognized moderation action.');
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Moderation action ' || p_action || ' executed successfully.',
    'game_id', v_game.id,
    'action', p_action
  );
END;
$$;

-- 15. RPC: get_host_pickup_games
CREATE OR REPLACE FUNCTION public.get_host_pickup_games()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_games jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Authentication required.', 'data', '[]'::jsonb);
  END IF;

  SELECT jsonb_agg(to_jsonb(g)) INTO v_games
  FROM (
    SELECT
      id, slug, sport, emoji, skill_level, venue_name, city, time_label,
      host_name, host_user_id, price_per_player, spots_open, total_players,
      confirmed_players, whatsapp_group_url, status, is_featured,
      publication_status, cancellation_reason, cancelled_at, completed_at, created_at, updated_at
    FROM public.pickup_games
    WHERE host_user_id = v_user_id
       OR public.is_pickup_game_admin()
    ORDER BY created_at DESC
  ) g;

  RETURN jsonb_build_object(
    'status', 'success',
    'data', coalesce(v_games, '[]'::jsonb)
  );
END;
$$;

-- 16. Permissions & Grants
-- Revoke all default PUBLIC and anon execute permissions from helper and management functions
REVOKE EXECUTE ON FUNCTION public.is_pickup_game_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pickup_game_admin() TO authenticated;

-- Player RSVP and cancellation: public/anon guest access protected by bearer token / auth
REVOKE EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) TO anon, authenticated;

-- Host & Administrator game management: strictly restricted to authenticated users
REVOKE EXECUTE ON FUNCTION public.create_pickup_game(text, text, text, text, int, text, text, text, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pickup_game(text, text, text, text, int, text, text, text, text, boolean, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_pickup_game_details(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pickup_game_details(text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reschedule_pickup_game(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_pickup_game(text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_pickup_game_capacity(text, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pickup_game_capacity(text, int, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_pickup_game_as_host(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_as_host(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reopen_pickup_game_as_host(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_pickup_game_as_host(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_pickup_game_as_host(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_pickup_game_as_host(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_moderate_pickup_game(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_pickup_game(text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_host_pickup_games() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_host_pickup_games() TO authenticated;

COMMIT;
