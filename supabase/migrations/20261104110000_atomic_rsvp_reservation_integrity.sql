-- ==============================================================================
-- KhelGrid Play Security — Phase 2: RSVP Abuse and Reservation Integrity
-- Purpose:
-- 1. Create rate limiting tracker table for pickup game RSVP requests.
-- 2. Revoke direct INSERT on pickup_game_participants from public/anon/authenticated.
-- 3. Revoke direct UPDATE on pickup_games from public/anon/authenticated.
-- 4. Create atomic SECURITY DEFINER function public.rsvp_pickup_game():
--    - Server-side input validation (name 2-100 chars, normalized phone).
--    - Server-side rate limiting per IP / phone identifier.
--    - Duplicate reservation prevention for same match.
--    - Atomic spot allocation with row-level locking (SELECT ... FOR UPDATE).
--    - Automatic match locking (status = 'full') when spots reach 0.
--    - Waitlist support when match is full without leaking spots.
--    - WhatsApp group invitation delivery ONLY after a confirmed reservation.
-- 5. Create atomic SECURITY DEFINER function public.cancel_pickup_game_reservation():
--    - Handles cancellation with automatic promotion of next waitlisted player.
-- ==============================================================================

BEGIN;

-- 1. Rate limiting tracker table
CREATE TABLE IF NOT EXISTS public.pickup_game_rsvp_rate_limits (
  identifier text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and restrict rate limit table to internal security functions only
ALTER TABLE public.pickup_game_rsvp_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pickup_game_rsvp_rate_limits FROM PUBLIC, anon, authenticated;

-- 2. Revoke direct INSERT on pickup_game_participants
-- Direct browser insertion allows bots/scrapers to bypass validation and flood participants
REVOKE INSERT ON public.pickup_game_participants FROM PUBLIC, anon, authenticated;

-- 3. Revoke direct UPDATE on pickup_games
-- Prevents clients from arbitrary manipulation of spots_open, confirmed_players, or match status
DROP POLICY IF EXISTS "pickup_games_update_spots" ON public.pickup_games;
REVOKE UPDATE ON public.pickup_games FROM PUBLIC, anon, authenticated;

-- 4. Create atomic RSVP function
CREATE OR REPLACE FUNCTION public.rsvp_pickup_game(
  p_game_id text,
  p_player_name text,
  p_player_phone text DEFAULT NULL,
  p_allow_waitlist boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  -- Normalize phone (digits only)
  IF p_player_phone IS NOT NULL AND trim(p_player_phone) <> '' THEN
    v_clean_phone := regexp_replace(p_player_phone, '[^0-9]', '', 'g');
    -- Strip country code 91 if 12 digits
    IF char_length(v_clean_phone) = 12 AND starts_with(v_clean_phone, '91') THEN
      v_clean_phone := substring(v_clean_phone from 3);
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

  -- Derive caller IP or identifier for abuse mitigation
  BEGIN
    v_caller_ip := current_setting('request.headers', true)::jsonb->>'x-forwarded-for';
    IF v_caller_ip IS NOT NULL AND position(',' in v_caller_ip) > 0 THEN
      v_caller_ip := trim(split_part(v_caller_ip, ',', 1));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_caller_ip := NULL;
  END;

  v_rate_key := COALESCE(v_clean_phone, v_caller_ip, 'anon-' || v_clean_name);

  -- 2. Server-side Rate Limiting (max 5 requests per 60 seconds per phone/IP)
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
        -- Window expired, reset counter
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

  -- 3. Obtain caller authentication ID if verified via Supabase Auth
  BEGIN
    v_user_id := auth.uid()::text;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- 4. Lock game row for update to ensure atomic concurrency
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

  -- 5. Duplicate Reservation Prevention
  -- Check if this phone number or authenticated user already has an active spot in this game
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

  -- 6. Check Spot Availability & Concurrency
  IF v_game_record.spots_open > 0 AND v_game_record.status <> 'full' THEN
    -- Allocate confirmed spot atomically
    v_new_spots := v_game_record.spots_open - 1;
    v_new_confirmed := v_game_record.confirmed_players + 1;
    v_new_status := CASE WHEN v_new_spots = 0 THEN 'full' ELSE 'open' END;

    -- Update game
    UPDATE public.pickup_games
    SET
      spots_open = v_new_spots,
      confirmed_players = v_new_confirmed,
      status = v_new_status,
      updated_at = now()
    WHERE id = v_game_record.id;

    -- Insert participant
    INSERT INTO public.pickup_game_participants (
      game_id,
      user_id,
      player_name,
      player_phone,
      status,
      joined_at
    ) VALUES (
      p_game_id,
      v_user_id,
      v_clean_name,
      v_clean_phone,
      'confirmed',
      now()
    ) RETURNING id INTO v_participant_id;

    -- Securely return confirmation and delivery of WhatsApp link ONLY for confirmed status
    RETURN jsonb_build_object(
      'status', 'confirmed',
      'message', 'Spot confirmed! Welcome to the match, ' || v_clean_name || '.',
      'participant_id', v_participant_id,
      'spots_open', v_new_spots,
      'confirmed_players', v_new_confirmed,
      'game_status', v_new_status,
      'whatsapp_group_url', v_game_record.whatsapp_group_url
    );

  ELSE
    -- Match is full
    IF p_allow_waitlist THEN
      -- Calculate waitlist position
      SELECT COUNT(*) + 1 INTO v_waitlist_pos
      FROM public.pickup_game_participants
      WHERE game_id = p_game_id AND status = 'waitlist';

      INSERT INTO public.pickup_game_participants (
        game_id,
        user_id,
        player_name,
        player_phone,
        status,
        joined_at
      ) VALUES (
        p_game_id,
        v_user_id,
        v_clean_name,
        v_clean_phone,
        'waitlist',
        now()
      ) RETURNING id INTO v_participant_id;

      -- WhatsApp link is STRICTLY withheld from waitlisted players
      RETURN jsonb_build_object(
        'status', 'waitlist',
        'message', 'Match is full. You have been added to the waitlist (Position #' || v_waitlist_pos || ').',
        'participant_id', v_participant_id,
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

-- 5. Cancellation Function with Waitlist Auto-Promotion
CREATE OR REPLACE FUNCTION public.cancel_pickup_game_reservation(
  p_reservation_id uuid,
  p_player_phone text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_participant record;
  v_game record;
  v_next_waitlist record;
  v_clean_phone text;
  v_user_id text;
BEGIN
  BEGIN
    v_user_id := auth.uid()::text;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF p_player_phone IS NOT NULL AND trim(p_player_phone) <> '' THEN
    v_clean_phone := regexp_replace(p_player_phone, '[^0-9]', '', 'g');
    IF char_length(v_clean_phone) = 12 AND starts_with(v_clean_phone, '91') THEN
      v_clean_phone := substring(v_clean_phone from 3);
    END IF;
  ELSE
    v_clean_phone := NULL;
  END IF;

  -- Find and lock participant record
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

  -- Ensure caller owns the reservation if phone or user_id is provided
  IF v_user_id IS NOT NULL AND v_participant.user_id IS NOT NULL AND v_user_id <> v_participant.user_id THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Unauthorized to cancel this reservation.');
  END IF;

  IF v_clean_phone IS NOT NULL AND v_participant.player_phone IS NOT NULL AND v_clean_phone <> v_participant.player_phone THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Phone number does not match reservation.');
  END IF;

  IF v_participant.status = 'cancelled' THEN
    RETURN jsonb_build_object('status', 'already_cancelled', 'message', 'Reservation was already cancelled.');
  END IF;

  -- Lock game row
  SELECT * INTO v_game
  FROM public.pickup_games
  WHERE id::text = v_participant.game_id
  FOR UPDATE;

  -- Mark participant cancelled
  UPDATE public.pickup_game_participants
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  IF v_participant.status = 'confirmed' AND FOUND THEN
    -- Check if someone is on the waitlist to auto-promote
    SELECT * INTO v_next_waitlist
    FROM public.pickup_game_participants
    WHERE game_id = v_participant.game_id
      AND status = 'waitlist'
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      -- Promote waitlist player directly into the spot
      UPDATE public.pickup_game_participants
      SET status = 'confirmed'
      WHERE id = v_next_waitlist.id;

      RETURN jsonb_build_object(
        'status', 'cancelled',
        'message', 'Reservation cancelled. Spot automatically transferred to next player on waitlist.',
        'promoted_participant_id', v_next_waitlist.id
      );
    ELSE
      -- Open up the spot on the game
      UPDATE public.pickup_games
      SET
        spots_open = spots_open + 1,
        confirmed_players = GREATEST(0, confirmed_players - 1),
        status = 'open',
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

-- 6. Grant execute permissions on RPC functions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.rsvp_pickup_game(text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_reservation(uuid, text) TO anon, authenticated;

COMMIT;
