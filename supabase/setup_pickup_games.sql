-- ==============================================================================
-- KhelGrid Module: Community Pickup Games & Match Coordination (Secured & Hardened)
-- Purpose: Creates public.pickup_games table with realtime spot availability,
-- host ownership, relational player RSVPs, atomic server-side RSVP RPC functions,
-- cryptographic bearer cancellation tokens, and secure host game management.
-- Best Practice: All SECURITY DEFINER functions use SET search_path = '' and fully qualified names.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.pickup_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sport text NOT NULL CHECK (char_length(trim(sport)) BETWEEN 2 AND 80),
  emoji text DEFAULT '⚽',
  skill_level text NOT NULL DEFAULT 'Intermediate'
    CHECK (skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels')),
  venue_name text NOT NULL CHECK (char_length(trim(venue_name)) BETWEEN 2 AND 180),
  city text NOT NULL CHECK (char_length(trim(city)) BETWEEN 1 AND 120),
  time_label text NOT NULL CHECK (char_length(trim(time_label)) BETWEEN 2 AND 120),
  host_name text NOT NULL DEFAULT 'Community Host' CHECK (char_length(trim(host_name)) BETWEEN 2 AND 120),
  host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  price_per_player text NOT NULL DEFAULT 'Free',
  spots_open integer NOT NULL DEFAULT 1 CHECK (spots_open >= 0),
  total_players integer NOT NULL DEFAULT 10 CHECK (total_players > 0),
  confirmed_players integer NOT NULL DEFAULT 0 CHECK (confirmed_players >= 0),
  whatsapp_group_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'full', 'completed', 'cancelled')),
  is_featured boolean NOT NULL DEFAULT false,
  publication_status text NOT NULL DEFAULT 'published'
    CHECK (publication_status IN ('draft', 'published', 'archived')),
  cancellation_reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Relational Player RSVPs (Private - Controlled Access)
CREATE TABLE IF NOT EXISTS public.pickup_game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  user_id text,
  player_name text NOT NULL CHECK (char_length(trim(player_name)) BETWEEN 2 AND 120),
  player_phone text,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  cancellation_token text DEFAULT gen_random_uuid()::text
);

-- Rate limiting tracker table
CREATE TABLE IF NOT EXISTS public.pickup_game_rsvp_rate_limits (
  identifier text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

-- Schema upgrades for existing tables (idempotent)
ALTER TABLE public.pickup_games
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.pickup_games
  DROP CONSTRAINT IF EXISTS pickup_games_status_check;

ALTER TABLE public.pickup_games
  ADD CONSTRAINT pickup_games_status_check
  CHECK (status IN ('draft', 'open', 'full', 'completed', 'cancelled'));

ALTER TABLE public.pickup_game_participants
  ADD COLUMN IF NOT EXISTS cancellation_token text DEFAULT gen_random_uuid()::text;

ALTER TABLE public.pickup_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Admin / Moderator Authorization Helper
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

-- Pickup Games RLS: Read published games and host own-game access.
-- Direct INSERT, UPDATE, and DELETE are strictly revoked. All mutations must use secure RPCs.
DROP POLICY IF EXISTS "pickup_games_read_published" ON public.pickup_games;
CREATE POLICY "pickup_games_read_published" ON public.pickup_games
  FOR SELECT TO anon, authenticated
  USING (
    publication_status = 'published'
    OR (auth.uid() IS NOT NULL AND host_user_id = auth.uid())
    OR public.is_pickup_game_admin()
  );

DROP POLICY IF EXISTS "pickup_games_insert_community" ON public.pickup_games;
DROP POLICY IF EXISTS "pickup_games_update_spots" ON public.pickup_games;

GRANT SELECT ON public.pickup_games TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pickup_games FROM PUBLIC, anon, authenticated;

-- Pickup Game Participants RLS: Strict Privacy (No public read, no direct insert/update/delete)
DROP POLICY IF EXISTS "pickup_game_participants_read" ON public.pickup_game_participants;
DROP POLICY IF EXISTS "pickup_game_participants_insert" ON public.pickup_game_participants;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.pickup_game_participants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.pickup_game_rsvp_rate_limits FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_pickup_games_city_sport
  ON public.pickup_games (city, sport);

CREATE INDEX IF NOT EXISTS idx_pickup_games_featured
  ON public.pickup_games (is_featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pickup_games_host_user_id
  ON public.pickup_games (host_user_id);

CREATE INDEX IF NOT EXISTS idx_pickup_games_status_pub
  ON public.pickup_games (status, publication_status);

CREATE INDEX IF NOT EXISTS idx_pickup_participants_game_id
  ON public.pickup_game_participants (game_id, joined_at DESC);

-- 4. Atomic RSVP Function
CREATE OR REPLACE FUNCTION public.rsvp_pickup_game(
  p_game_id text,
  p_player_name text,
  p_player_phone text DEFAULT NULL,
  p_allow_waitlist boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clean_name text;
  v_clean_phone text;
  v_game_record record;
  v_existing_id uuid;
  v_caller_ip text;
  v_rate_key text;
  v_rate_count int;
  v_rate_first timestamptz;
  v_new_spots int;
  v_new_confirmed int;
  v_new_status text;
  v_participant_id uuid;
  v_waitlist_pos int;
  v_user_id text;
  v_cancellation_token text;
BEGIN
  -- 1. Server-side Input Validation
  v_clean_name := trim(p_player_name);
  IF v_clean_name IS NULL OR char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 100 THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_NAME',
      'message', 'Player name must be between 2 and 100 characters.'
    );
  END IF;

  -- Normalize phone
  IF p_player_phone IS NOT NULL AND trim(p_player_phone) <> '' THEN
    v_clean_phone := regexp_replace(p_player_phone, '[^0-9]', '', 'g');
    IF char_length(v_clean_phone) = 12 AND starts_with(v_clean_phone, '91') THEN
      v_clean_phone := substring(v_clean_phone FROM 3);
    END IF;

    IF char_length(v_clean_phone) < 10 OR char_length(v_clean_phone) > 15 THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'error_code', 'INVALID_PHONE',
        'message', 'Please provide a valid 10-digit mobile number.'
      );
    END IF;
  ELSE
    v_clean_phone := NULL;
  END IF;

  -- Derive caller IP or identifier for rate limiting
  BEGIN
    v_caller_ip := current_setting('request.headers', true)::jsonb->>'x-forwarded-for';
    IF v_caller_ip IS NOT NULL AND position(',' IN v_caller_ip) > 0 THEN
      v_caller_ip := trim(split_part(v_caller_ip, ',', 1));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_caller_ip := NULL;
  END;

  v_rate_key := coalesce(v_clean_phone, v_caller_ip, 'anon-' || v_clean_name);

  -- 2. Server-side Rate Limiting (max 5 requests per 60 seconds)
  IF v_rate_key IS NOT NULL THEN
    SELECT attempt_count, first_attempt_at INTO v_rate_count, v_rate_first
    FROM public.pickup_game_rsvp_rate_limits
    WHERE identifier = v_rate_key
    FOR UPDATE;

    IF FOUND THEN
      IF now() - v_rate_first < interval '60 seconds' THEN
        IF v_rate_count >= 5 THEN
          RETURN jsonb_build_object(
            'status', 'error',
            'error_code', 'RATE_LIMITED',
            'message', 'Too many reservation attempts. Please wait 60 seconds before trying again.'
          );
        END IF;
        UPDATE public.pickup_game_rsvp_rate_limits
        SET attempt_count = attempt_count + 1, last_attempt_at = now()
        WHERE identifier = v_rate_key;
      ELSE
        UPDATE public.pickup_game_rsvp_rate_limits
        SET attempt_count = 1, first_attempt_at = now(), last_attempt_at = now()
        WHERE identifier = v_rate_key;
      END IF;
    ELSE
      INSERT INTO public.pickup_game_rsvp_rate_limits (identifier, attempt_count, first_attempt_at, last_attempt_at)
      VALUES (v_rate_key, 1, now(), now())
      ON CONFLICT (identifier) DO NOTHING;
    END IF;
  END IF;

  -- 3. Obtain caller auth id if verified
  BEGIN
    v_user_id := auth.uid()::text;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- 4. Lock game row for update
  SELECT id, spots_open, total_players, confirmed_players, whatsapp_group_url, status
  INTO v_game_record
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'GAME_NOT_FOUND',
      'message', 'The requested pickup game was not found or has expired.'
    );
  END IF;

  IF v_game_record.status IN ('completed', 'cancelled') THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'GAME_CLOSED',
      'message', 'This match has been ' || v_game_record.status || ' and cannot accept reservations.'
    );
  END IF;

  -- 5. Duplicate Reservation Prevention
  IF v_clean_phone IS NOT NULL OR v_user_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.pickup_game_participants
    WHERE game_id = p_game_id
      AND status IN ('confirmed', 'waitlist')
      AND (
        (v_clean_phone IS NOT NULL AND player_phone = v_clean_phone) OR
        (v_user_id IS NOT NULL AND user_id = v_user_id)
      )
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'status', 'duplicate',
        'error_code', 'DUPLICATE_REGISTRATION',
        'message', 'You already have an active reservation or waitlist entry for this match.',
        'reservation_id', v_existing_id
      );
    END IF;
  END IF;

  -- 6. Generate cryptographic bearer cancellation token
  v_cancellation_token := gen_random_uuid()::text;

  -- 7. Spot Allocation & Concurrency
  IF v_game_record.spots_open > 0 AND v_game_record.status <> 'full' THEN
    v_new_spots := v_game_record.spots_open - 1;
    v_new_confirmed := v_game_record.confirmed_players + 1;
    v_new_status := CASE WHEN v_new_spots = 0 THEN 'full' ELSE 'open' END;

    UPDATE public.pickup_games
    SET
      spots_open = v_new_spots,
      confirmed_players = v_new_confirmed,
      status = v_new_status,
      updated_at = now()
    WHERE id = v_game_record.id;

    INSERT INTO public.pickup_game_participants (
      game_id,
      user_id,
      player_name,
      player_phone,
      status,
      joined_at,
      cancellation_token
    ) VALUES (
      p_game_id,
      v_user_id,
      v_clean_name,
      v_clean_phone,
      'confirmed',
      now(),
      v_cancellation_token
    ) RETURNING id INTO v_participant_id;

    RETURN jsonb_build_object(
      'status', 'confirmed',
      'message', 'Spot confirmed! Welcome to the match, ' || v_clean_name || '.',
      'participant_id', v_participant_id,
      'cancellation_token', v_cancellation_token,
      'spots_open', v_new_spots,
      'confirmed_players', v_new_confirmed,
      'game_status', v_new_status,
      'whatsapp_group_url', v_game_record.whatsapp_group_url
    );

  ELSE
    IF p_allow_waitlist THEN
      SELECT count(*) + 1 INTO v_waitlist_pos
      FROM public.pickup_game_participants
      WHERE game_id = p_game_id AND status = 'waitlist';

      INSERT INTO public.pickup_game_participants (
        game_id,
        user_id,
        player_name,
        player_phone,
        status,
        joined_at,
        cancellation_token
      ) VALUES (
        p_game_id,
        v_user_id,
        v_clean_name,
        v_clean_phone,
        'waitlist',
        now(),
        v_cancellation_token
      ) RETURNING id INTO v_participant_id;

      RETURN jsonb_build_object(
        'status', 'waitlist',
        'message', 'Match is full. You have been added to the waitlist (Position #' || v_waitlist_pos || ').',
        'participant_id', v_participant_id,
        'cancellation_token', v_cancellation_token,
        'waitlist_position', v_waitlist_pos,
        'spots_open', 0,
        'confirmed_players', v_game_record.confirmed_players,
        'game_status', 'full',
        'whatsapp_group_url', null
      );
    ELSE
      RETURN jsonb_build_object(
        'status', 'full',
        'error_code', 'MATCH_FULL',
        'message', 'This pickup match is already full! No spots left.',
        'spots_open', 0,
        'confirmed_players', v_game_record.confirmed_players,
        'game_status', 'full',
        'whatsapp_group_url', null
      );
    END IF;
  END IF;
END;
$$;

-- 5. Cancellation Function: cancel_pickup_game_reservation
-- Drop first to allow parameter rename from Phase 2 (p_player_phone -> p_cancellation_token)
DROP FUNCTION IF EXISTS public.cancel_pickup_game_reservation(uuid, text);
CREATE OR REPLACE FUNCTION public.cancel_pickup_game_reservation(
  p_reservation_id uuid,
  p_cancellation_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_participant record;
  v_game record;
  v_next_waitlist record;
  v_user_id text;
  v_clean_token text;
  v_caller_is_authorized boolean := false;
BEGIN
  BEGIN
    v_user_id := auth.uid()::text;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  v_clean_token := nullif(trim(p_cancellation_token), '');

  SELECT * INTO v_participant
  FROM public.pickup_game_participants
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'RESERVATION_NOT_FOUND',
      'message', 'Reservation record not found.'
    );
  END IF;

  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = v_participant.game_id
  FOR UPDATE;

  -- Genuine ownership verification
  IF v_user_id IS NOT NULL AND ((v_game.host_user_id IS NOT NULL AND v_user_id = v_game.host_user_id::text) OR public.is_pickup_game_admin()) THEN
    v_caller_is_authorized := true;
  ELSIF v_user_id IS NOT NULL AND v_participant.user_id IS NOT NULL AND v_user_id = v_participant.user_id THEN
    v_caller_is_authorized := true;
  ELSIF v_clean_token IS NOT NULL AND v_participant.cancellation_token IS NOT NULL AND v_participant.cancellation_token = v_clean_token THEN
    v_caller_is_authorized := true;
  ELSE
    v_caller_is_authorized := false;
  END IF;

  IF NOT v_caller_is_authorized THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_code', 'UNAUTHORIZED',
      'message', 'Unauthorized to cancel this reservation. A valid bearer cancellation token or authenticated account is required.'
    );
  END IF;

  IF v_participant.status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'already_cancelled', 'message', 'Reservation was already cancelled.');
  END IF;

  UPDATE public.pickup_game_participants
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  IF v_participant.status = 'confirmed' THEN
    SELECT * INTO v_next_waitlist
    FROM public.pickup_game_participants
    WHERE game_id = v_participant.game_id
      AND status = 'waitlist'
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.pickup_game_participants
      SET status = 'confirmed'
      WHERE id = v_next_waitlist.id;

      RETURN jsonb_build_object(
        'status', 'cancelled',
        'message', 'Reservation cancelled. Spot automatically transferred to next player on waitlist.',
        'promoted_participant_id', v_next_waitlist.id
      );
    ELSE
      UPDATE public.pickup_games
      SET
        spots_open = spots_open + 1,
        confirmed_players = greatest(0, confirmed_players - 1),
        status = CASE WHEN status = 'full' THEN 'open' ELSE status END,
        updated_at = now()
      WHERE id = v_game.id;

      RETURN jsonb_build_object(
        'status', 'cancelled',
        'message', 'Reservation cancelled and spot reopened successfully.'
      );
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'status', 'cancelled',
      'message', 'Waitlist reservation cancelled.'
    );
  END IF;
END;
$$;

-- 6. RPC: create_pickup_game
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
    v_base_slug := substring(v_base_slug FROM 1 FOR 80);
  END IF;
  v_slug_suffix := substring(gen_random_uuid()::text FROM 1 FOR 6);
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

-- 7. RPC: update_pickup_game_details
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

-- 8. RPC: reschedule_pickup_game
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

-- 9. RPC: update_pickup_game_capacity
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

-- 10. RPC: cancel_pickup_game_as_host
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

-- 11. RPC: reopen_pickup_game_as_host
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

-- 12. RPC: complete_pickup_game_as_host
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

-- 13. RPC: admin_moderate_pickup_game
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

-- 14. RPC: get_host_pickup_games
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

-- 15. Grants & Permissions
REVOKE EXECUTE ON FUNCTION public.is_pickup_game_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pickup_game_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) TO anon, authenticated;

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

-- Seed baseline games
INSERT INTO public.pickup_games (
  slug, sport, emoji, skill_level, venue_name, city, time_label,
  host_name, price_per_player, spots_open, total_players, confirmed_players,
  is_featured, publication_status, whatsapp_group_url, status
) VALUES
  (
    'pickleball-ferrohub-evening', 'Pickleball', '🎾', 'Intermediate',
    'FerroHub Sports Arena', 'Bengaluru', 'Today · 7:00 PM',
    'Rahul Sharma', '₹200/player', 1, 4, 3,
    true, 'published', 'https://chat.whatsapp.com/sample-ferrohub-pickleball', 'open'
  ),
  (
    'football-koramangala-turf', 'Football', '⚽', 'Beginner',
    'Kicks on Grass Arena', 'Bengaluru', 'Today · 8:30 PM',
    'Aakash Mehta', '₹250/player', 4, 12, 8,
    true, 'published', 'https://chat.whatsapp.com/sample-kicks-football', 'open'
  ),
  (
    'badminton-whitefield-morning', 'Badminton', '🏸', 'Advanced',
    'Whitefield Sports Hub', 'Bengaluru', 'Tomorrow · 6:00 AM',
    'Siddharth Patel', '₹150/player', 2, 4, 2,
    false, 'published', 'https://chat.whatsapp.com/sample-whitefield-badminton', 'open'
  )
ON CONFLICT (slug) DO NOTHING;

COMMIT;


-- ==============================================================================
-- Phase 2 hardening overlay
-- Keep this bootstrap script aligned with the separately versioned migrations.
-- The overlay is deliberately repeated here so a fresh development setup gets
-- the same atomic RSVP, private-column grants, fail-closed cancellation and
-- hashed bearer-token behavior as an already-migrated development database.
-- ==============================================================================

-- Source migration: supabase/migrations/20261104110000_atomic_rsvp_reservation_integrity.sql
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


-- Source migration: supabase/migrations/20261105100000_fix_rsvp_greatest_expression.sql
-- Corrective Phase 2 patch: PostgreSQL GREATEST is a SQL special expression,
-- not a schema-qualified function call.
BEGIN;
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

COMMIT;


-- Source migration: supabase/migrations/20261105101000_hash_rsvp_cancellation_tokens.sql
-- Store only a SHA-256 digest of guest cancellation bearer tokens.
-- The raw token is returned once to the RSVP caller; legacy plaintext tokens remain valid during migration.
BEGIN;
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
$function$;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) TO anon, authenticated;
COMMIT;


-- Source migration: supabase/migrations/20261105102000_fix_hash_migration_greatest.sql
-- Store only a SHA-256 digest of guest cancellation bearer tokens.
-- The raw token is returned once to the RSVP caller; legacy plaintext tokens remain valid during migration.
BEGIN;
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
$function$;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) TO anon, authenticated;
COMMIT;
