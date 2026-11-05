-- KhelGrid Play Phase 3.5: gated WhatsApp invitations and RPC authorization.
-- Forward-only migration. Apply to development first; production is intentionally untouched.
BEGIN;

ALTER TABLE public.pickup_game_participants
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_invite_approved_at timestamptz;

COMMENT ON COLUMN public.pickup_game_participants.phone_verified_at IS
  'Set only by a trusted phone-verification provider callback/service role; never by browser clients.';
COMMENT ON COLUMN public.pickup_game_participants.whatsapp_invite_approved_at IS
  'Set by the authenticated host or trusted administrator after reviewing the reservation.';

-- Preserve the deployed atomic RSVP/rate-limit/token implementation, changing only
-- the successful-confirmation response so a guest never receives the invitation URL.
DO $migration$
DECLARE
  v_definition text;
  v_old text := '''whatsapp_group_url'', v_game.whatsapp_group_url';
  v_new text := '''whatsapp_group_url'', NULL';
BEGIN
  SELECT pg_catalog.pg_get_functiondef(
    'public.rsvp_pickup_game(text,text,text,boolean)'::regprocedure
  ) INTO v_definition;

  IF pg_catalog.strpos(v_definition, v_old) = 0 THEN
    RAISE EXCEPTION 'Expected RSVP invitation response was not found; refusing to overwrite an unexpected function definition.';
  END IF;

  v_definition := pg_catalog.replace(v_definition, v_old, v_new);
  EXECUTE v_definition;
END
$migration$;

-- Hosts explicitly approve a participant invitation only after reviewing the RSVP.
CREATE OR REPLACE FUNCTION public.approve_pickup_game_whatsapp_invite(
  p_reservation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_game_id text;
  v_host_id uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','UNAUTHORIZED',
      'message','Sign in as the game host to approve an invitation.');
  END IF;

  SELECT game_id INTO v_game_id
  FROM public.pickup_game_participants
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','RESERVATION_NOT_FOUND',
      'message','Reservation not found.');
  END IF;

  SELECT host_user_id, status INTO v_host_id, v_status
  FROM public.pickup_games
  WHERE id::text = v_game_id
  FOR UPDATE;

  IF NOT FOUND OR (v_host_id IS DISTINCT FROM auth.uid() AND NOT public.is_pickup_game_admin()) THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','FORBIDDEN',
      'message','Only the game host or an authorized administrator can approve this invitation.');
  END IF;

  IF v_status IN ('cancelled','completed','draft') THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','GAME_CLOSED',
      'message','Invitations cannot be approved for this game.');
  END IF;

  UPDATE public.pickup_game_participants
  SET whatsapp_invite_approved_at = pg_catalog.now()
  WHERE id = p_reservation_id AND status = 'confirmed';

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','RESERVATION_NOT_CONFIRMED',
      'message','Only confirmed participants can receive a WhatsApp invitation.');
  END IF;

  RETURN pg_catalog.jsonb_build_object('status','success','message','WhatsApp invitation approved.');
END;
$function$;

-- A guest retrieves the invitation only with their one-time bearer cancellation token.
-- Signed-in participants may alternatively prove ownership through auth.uid().
CREATE OR REPLACE FUNCTION public.get_pickup_game_whatsapp_invite(
  p_reservation_id uuid,
  p_cancellation_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_participant record;
  v_game record;
  v_authorized boolean := false;
BEGIN
  SELECT id, game_id, user_id, status, cancellation_token,
         phone_verified_at, whatsapp_invite_approved_at
  INTO v_participant
  FROM public.pickup_game_participants
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','RESERVATION_NOT_FOUND',
      'message','Reservation not found.');
  END IF;

  IF v_participant.status <> 'confirmed' THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','RESERVATION_NOT_CONFIRMED',
      'message','Only confirmed participants can retrieve an invitation.');
  END IF;

  IF auth.uid() IS NOT NULL AND v_participant.user_id = auth.uid()::text THEN
    v_authorized := true;
  ELSIF p_cancellation_token IS NOT NULL
    AND pg_catalog.length(p_cancellation_token) >= 20
    AND v_participant.cancellation_token =
      pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_cancellation_token,'UTF8'),'sha256'),'hex') THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','UNAUTHORIZED',
      'message','A valid reservation token or authenticated reservation owner is required.');
  END IF;

  IF v_participant.phone_verified_at IS NULL
     AND v_participant.whatsapp_invite_approved_at IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('status','pending_approval','error_code','INVITE_NOT_APPROVED',
      'message','Your reservation is confirmed. The WhatsApp invitation will be available after phone verification or host approval.');
  END IF;

  SELECT status, whatsapp_group_url INTO v_game
  FROM public.pickup_games
  WHERE id::text = v_participant.game_id;

  IF NOT FOUND OR v_game.status IN ('cancelled','completed','draft') OR v_game.whatsapp_group_url IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('status','error','error_code','INVITE_UNAVAILABLE',
      'message','The WhatsApp invitation is not available for this game.');
  END IF;

  RETURN pg_catalog.jsonb_build_object('status','success','whatsapp_group_url',v_game.whatsapp_group_url);
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_pickup_game_whatsapp_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pickup_game_whatsapp_invite(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_pickup_game_whatsapp_invite(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pickup_game_whatsapp_invite(uuid,text) TO anon, authenticated;

-- Browser roles cannot mark phone numbers as verified. Only trusted service operations
-- may write phone_verified_at after an OTP/provider callback has been validated.
REVOKE UPDATE (phone_verified_at, whatsapp_invite_approved_at)
  ON public.pickup_game_participants FROM PUBLIC, anon, authenticated;

COMMIT;
