-- KhelGrid Play: keep reservation counters consistent across cancellation and reopening.
-- Cancellation releases every active reservation; reopening starts with full capacity.
-- This migration is additive and preserves the existing RPC signatures and grants.
BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_pickup_game_as_host(
  p_game_id text,
  p_cancellation_reason text DEFAULT 'Match cancelled by host'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_game record;
  v_affected_confirmed integer;
  v_affected_waitlist integer;
BEGIN
  SELECT *
  INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'GAME_NOT_FOUND',
      'message', 'Game not found.'
    );
  END IF;

  IF auth.uid() IS NULL
     OR (v_game.host_user_id IS DISTINCT FROM auth.uid()
         AND NOT public.is_pickup_game_admin()) THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'FORBIDDEN',
      'message', 'You are not authorized to cancel this match.'
    );
  END IF;

  IF v_game.status = 'cancelled' THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'already_cancelled',
      'message', 'This match is already cancelled.'
    );
  END IF;

  IF v_game.status = 'completed' THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_STATE',
      'message', 'Completed matches cannot be cancelled.'
    );
  END IF;

  SELECT pg_catalog.count(*)::integer
  INTO v_affected_confirmed
  FROM public.pickup_game_participants
  WHERE game_id = p_game_id AND status = 'confirmed';

  SELECT pg_catalog.count(*)::integer
  INTO v_affected_waitlist
  FROM public.pickup_game_participants
  WHERE game_id = p_game_id AND status = 'waitlist';

  -- Lock the game first, then cancel its active reservations and reset the
  -- active counters in the same transaction. The response preserves the
  -- cancellation totals for the host's confirmation UI.
  UPDATE public.pickup_game_participants
  SET status = 'cancelled'
  WHERE game_id = p_game_id
    AND status IN ('confirmed', 'waitlist');

  UPDATE public.pickup_games
  SET status = 'cancelled',
      cancellation_reason = coalesce(
        nullif(pg_catalog.btrim(p_cancellation_reason), ''),
        'Match cancelled by host'
      ),
      cancelled_at = pg_catalog.now(),
      confirmed_players = 0,
      spots_open = total_players,
      updated_at = pg_catalog.now()
  WHERE id = v_game.id;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'success',
    'message', 'Match cancelled successfully.',
    'game_id', v_game.id,
    'confirmed_reservations_cancelled', v_affected_confirmed,
    'waitlist_reservations_cancelled', v_affected_waitlist
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_pickup_game_as_host(p_game_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_game record;
BEGIN
  SELECT *
  INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'GAME_NOT_FOUND',
      'message', 'Game not found.'
    );
  END IF;

  IF auth.uid() IS NULL
     OR (v_game.host_user_id IS DISTINCT FROM auth.uid()
         AND NOT public.is_pickup_game_admin()) THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'FORBIDDEN',
      'message', 'You are not authorized to reopen this match.'
    );
  END IF;

  IF v_game.status = 'completed' AND NOT public.is_pickup_game_admin() THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'FORBIDDEN',
      'message', 'Completed matches cannot be reopened without administrator authorization.'
    );
  END IF;

  IF v_game.status <> 'cancelled' THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_STATE',
      'message', 'Only cancelled matches can be reopened.'
    );
  END IF;

  -- A cancellation invalidates all prior confirmed and waitlisted reservations.
  -- Reopening therefore starts with no active participants and full capacity.
  UPDATE public.pickup_games
  SET status = 'open',
      confirmed_players = 0,
      spots_open = total_players,
      cancellation_reason = NULL,
      cancelled_at = NULL,
      updated_at = pg_catalog.now()
  WHERE id = v_game.id;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'success',
    'message', 'Match reopened with full capacity.',
    'game_id', v_game.id,
    'game_status', 'open',
    'confirmed_players', 0,
    'spots_open', v_game.total_players
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_moderate_pickup_game(
  p_game_id text,
  p_action text,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_game record;
BEGIN
  IF NOT public.is_pickup_game_admin() THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'UNAUTHORIZED',
      'message', 'Administrator or moderator privileges required.'
    );
  END IF;

  SELECT *
  INTO v_game
  FROM public.pickup_games
  WHERE id::text = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'GAME_NOT_FOUND',
      'message', 'Game not found.'
    );
  END IF;

  IF p_action = 'feature' THEN
    UPDATE public.pickup_games
    SET is_featured = true, updated_at = pg_catalog.now()
    WHERE id = v_game.id;
  ELSIF p_action = 'unfeature' THEN
    UPDATE public.pickup_games
    SET is_featured = false, updated_at = pg_catalog.now()
    WHERE id = v_game.id;
  ELSIF p_action = 'archive' THEN
    UPDATE public.pickup_games
    SET publication_status = 'archived', updated_at = pg_catalog.now()
    WHERE id = v_game.id;
  ELSIF p_action = 'publish' THEN
    UPDATE public.pickup_games
    SET publication_status = 'published', updated_at = pg_catalog.now()
    WHERE id = v_game.id;
  ELSIF p_action = 'force_cancel' THEN
    UPDATE public.pickup_game_participants
    SET status = 'cancelled'
    WHERE game_id = p_game_id
      AND status IN ('confirmed', 'waitlist');

    UPDATE public.pickup_games
    SET status = 'cancelled',
        cancellation_reason = coalesce(
          nullif(pg_catalog.btrim(p_notes), ''),
          'Cancelled by administrator moderation'
        ),
        cancelled_at = pg_catalog.now(),
        confirmed_players = 0,
        spots_open = total_players,
        updated_at = pg_catalog.now()
    WHERE id = v_game.id;
  ELSE
    RETURN pg_catalog.jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_ACTION',
      'message', 'Unrecognized moderation action.'
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'status', 'success',
    'message', 'Moderation action ' || p_action || ' executed successfully.',
    'game_id', v_game.id,
    'action', p_action
  );
END;
$function$;

-- Preserve the existing function ACLs. These RPCs still require their current
-- authenticated execution grants; authorization remains enforced in-function.
COMMIT;
