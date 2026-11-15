-- KhelGrid Play Phase 3.5: WhatsApp invitation gating regression tests.
-- Run only on development after 20261105130000_gate_pickup_game_whatsapp_invites.
-- All fixture data and RSVP side effects are rolled back.
BEGIN;

DO $phase35$
DECLARE
  v_host uuid := gen_random_uuid();
  v_guest_token text := 'phase35-test-cancellation-token-123456';
  v_game_id uuid;
  v_rsvp jsonb;
  v_reservation_id uuid;
  v_invite jsonb;
  v_approve jsonb;
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_host, 'authenticated', 'authenticated',
    'phase35-host-'||v_host||'@example.test', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

  INSERT INTO public.pickup_games (
    slug, sport, emoji, skill_level, venue_name, city, time_label, host_name,
    host_user_id, price_per_player, spots_open, total_players, confirmed_players,
    whatsapp_group_url, status, publication_status
  ) VALUES (
    'phase35-'||substring(v_host::text,1,8), 'Badminton', '🏸', 'Intermediate',
    'Phase 3.5 Test Court', 'Delhi', 'Tomorrow 6 PM', 'Phase 3.5 Host',
    v_host, 'Free', 2, 2, 0, 'https://chat.whatsapp.com/Phase35TestInvite',
    'open', 'published'
  ) RETURNING id INTO v_game_id;

  -- Guest RSVP must still succeed atomically, but the invitation URL must be withheld.
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);

  v_rsvp := public.rsvp_pickup_game(v_game_id::text, 'Phase 3.5 Guest', '9876501234', false);
  IF v_rsvp->>'status' <> 'confirmed' THEN
    RAISE EXCEPTION 'Guest RSVP failed: %', v_rsvp;
  END IF;
  IF v_rsvp->>'whatsapp_group_url' IS NOT NULL THEN
    RAISE EXCEPTION 'Guest RSVP exposed WhatsApp invitation before verification/approval: %', v_rsvp;
  END IF;

  v_reservation_id := (v_rsvp->>'participant_id')::uuid;
  v_guest_token := v_rsvp->>'cancellation_token';

  -- Valid guest bearer token cannot bypass host approval.
  v_invite := public.get_pickup_game_whatsapp_invite(v_reservation_id, v_guest_token);
  IF v_invite->>'status' <> 'pending_approval'
     OR v_invite->>'whatsapp_group_url' IS NOT NULL THEN
    RAISE EXCEPTION 'Unapproved guest invitation was released: %', v_invite;
  END IF;

  -- A different authenticated user cannot approve this participant.
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('role','authenticated','sub',gen_random_uuid())::text, true);
  v_approve := public.approve_pickup_game_whatsapp_invite(v_reservation_id);
  IF v_approve->>'error_code' <> 'FORBIDDEN' THEN
    RAISE EXCEPTION 'Non-host invitation approval was not rejected: %', v_approve;
  END IF;

  -- Only the actual host can approve.
  PERFORM set_config('request.jwt.claim.sub', v_host::text, true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('role','authenticated','sub',v_host)::text, true);
  v_approve := public.approve_pickup_game_whatsapp_invite(v_reservation_id);
  IF v_approve->>'status' <> 'success' THEN
    RAISE EXCEPTION 'Host invitation approval failed: %', v_approve;
  END IF;

  -- The guest token can now retrieve the invitation.
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  v_invite := public.get_pickup_game_whatsapp_invite(v_reservation_id, v_guest_token);
  IF v_invite->>'status' <> 'success'
     OR v_invite->>'whatsapp_group_url' <> 'https://chat.whatsapp.com/Phase35TestInvite' THEN
    RAISE EXCEPTION 'Approved guest could not retrieve invitation: %', v_invite;
  END IF;

  IF has_function_privilege('anon','public.approve_pickup_game_whatsapp_invite(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role can approve invitations';
  END IF;
  IF NOT has_function_privilege('anon','public.get_pickup_game_whatsapp_invite(uuid,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Guest token retrieval endpoint is not available to anon';
  END IF;

  RAISE NOTICE 'PASS: RSVP hides invitations; unapproved guest cannot retrieve; non-host cannot approve; host approval releases link to valid guest token.';
END
$phase35$;

ROLLBACK;
