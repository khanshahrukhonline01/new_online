-- Phase 3.5 private-schema hardening: permission and API-boundary regression gates
-- This test is intentionally expected to fail against the pre-migration baseline.
-- Run only after the implementation migration is applied to a disposable test DB
-- or in a transaction that is guaranteed to ROLLBACK.

begin;

do $$
declare
  fn record;
  protected_functions text[] := array[
    'public.create_pickup_game',
    'public.get_host_pickup_games',
    'public.cancel_pickup_game_as_host',
    'public.complete_pickup_game_as_host',
    'public.reopen_pickup_game_as_host',
    'public.reschedule_pickup_game',
    'public.update_pickup_game_capacity',
    'public.update_pickup_game_details',
    'public.admin_moderate_pickup_game',
    'public.approve_pickup_game_whatsapp_invite'
  ];
  guest_functions text[] := array[
    'public.rsvp_pickup_game',
    'public.cancel_pickup_game_reservation',
    'public.get_pickup_game_whatsapp_invite'
  ];
  signature text;
begin
  if not exists (select 1 from pg_namespace where nspname = 'private') then
    raise exception 'private schema does not exist';
  end if;

  foreach signature in array protected_functions loop
    if to_regprocedure(signature) is null then
      raise exception 'Required public RPC wrapper missing: %', signature;
    end if;
    if has_function_privilege('anon', to_regprocedure(signature), 'EXECUTE') then
      raise exception 'Anonymous role can execute protected host/admin RPC: %', signature;
    end if;
    if not has_function_privilege('authenticated', to_regprocedure(signature), 'EXECUTE') then
      raise exception 'Authenticated role cannot execute expected host/admin RPC: %', signature;
    end if;
  end loop;

  foreach signature in array guest_functions loop
    if to_regprocedure(signature) is null then
      raise exception 'Required guest RPC wrapper missing: %', signature;
    end if;
    if not has_function_privilege('anon', to_regprocedure(signature), 'EXECUTE') then
      raise exception 'Guest RPC lost anonymous execution: %', signature;
    end if;
  end loop;

  if has_function_privilege('anon', 'public.is_pickup_game_admin()', 'EXECUTE') then
    raise exception 'Anonymous role can execute internal pickup-game admin helper';
  end if;
  if has_function_privilege('authenticated', 'public.is_pickup_game_admin()', 'EXECUTE') then
    raise exception 'Authenticated role can execute internal pickup-game admin helper';
  end if;
  if has_function_privilege('anon', 'public.is_listing_moderator()', 'EXECUTE') then
    raise exception 'Anonymous role can execute internal listing moderator helper';
  end if;
  if has_function_privilege('authenticated', 'public.is_listing_moderator()', 'EXECUTE') then
    raise exception 'Authenticated role can execute internal listing moderator helper';
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'API roles have USAGE on private schema';
  end if;
end $$;

rollback;
