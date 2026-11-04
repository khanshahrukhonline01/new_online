-- ==============================================================================
-- KhelGrid Module: Community Pickup Games & Match Coordination (Secured & Managed)
-- Purpose: Creates public.pickup_games table with realtime spot availability,
-- host ownership, relational player RSVPs, atomic server-side RSVP RPC functions,
-- and secure host game management (rescheduling, capacity, cancellation, reopening).
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- ==============================================================================

begin;

create table if not exists public.pickup_games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sport text not null check (char_length(trim(sport)) between 2 and 80),
  emoji text default '⚽',
  skill_level text not null default 'Intermediate'
    check (skill_level in ('Beginner', 'Intermediate', 'Advanced', 'All Levels')),
  venue_name text not null check (char_length(trim(venue_name)) between 2 and 180),
  city text not null check (char_length(trim(city)) between 1 and 120),
  time_label text not null check (char_length(trim(time_label)) between 2 and 120),
  host_name text not null default 'Community Host' check (char_length(trim(host_name)) between 2 and 120),
  host_user_id uuid references auth.users(id) on delete set null,
  price_per_player text not null default 'Free',
  spots_open integer not null default 1 check (spots_open >= 0),
  total_players integer not null default 10 check (total_players > 0),
  confirmed_players integer not null default 0 check (confirmed_players >= 0),
  whatsapp_group_url text,
  status text not null default 'open' check (status in ('draft', 'open', 'full', 'completed', 'cancelled')),
  is_featured boolean not null default false,
  publication_status text not null default 'published'
    check (publication_status in ('draft', 'published', 'archived')),
  cancellation_reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Relational Player RSVPs (Private - Controlled Access)
create table if not exists public.pickup_game_participants (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id text,
  player_name text not null check (char_length(trim(player_name)) between 2 and 120),
  player_phone text,
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlist', 'cancelled')),
  joined_at timestamptz not null default now()
);

-- Rate limiting tracker table
create table if not exists public.pickup_game_rsvp_rate_limits (
  identifier text primary key,
  attempt_count integer not null default 1,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now()
);

alter table public.pickup_games enable row level security;
alter table public.pickup_game_participants enable row level security;
alter table public.pickup_game_rsvp_rate_limits enable row level security;

-- Admin / Moderator Authorization Helper
create or replace function public.is_pickup_game_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') = 'admin'
    or (coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->'app_metadata'->>'is_admin', 'false'))::boolean = true
    or exists (
      select 1 from public.listing_moderators m
      where m.user_id = auth.uid() and m.is_active = true
    )
  );
$$;

-- Pickup Games RLS: Read published games and host own-game access.
-- Direct INSERT, UPDATE, and DELETE are strictly revoked. All mutations must use secure RPCs.
drop policy if exists "pickup_games_read_published" on public.pickup_games;
create policy "pickup_games_read_published" on public.pickup_games
  for select to anon, authenticated
  using (
    publication_status = 'published'
    or (auth.uid() is not null and host_user_id = auth.uid())
    or public.is_pickup_game_admin()
  );

drop policy if exists "pickup_games_insert_community" on public.pickup_games;
drop policy if exists "pickup_games_update_spots" on public.pickup_games;

grant select on public.pickup_games to anon, authenticated;
revoke insert, update, delete on public.pickup_games from public, anon, authenticated;

-- Pickup Game Participants RLS: Strict Privacy (No public read, no direct insert/update/delete)
drop policy if exists "pickup_game_participants_read" on public.pickup_game_participants;
drop policy if exists "pickup_game_participants_insert" on public.pickup_game_participants;
revoke select, insert, update, delete on public.pickup_game_participants from public, anon, authenticated;
revoke all on public.pickup_game_rsvp_rate_limits from public, anon, authenticated;

create index if not exists idx_pickup_games_city_sport
  on public.pickup_games (city, sport);

create index if not exists idx_pickup_games_featured
  on public.pickup_games (is_featured desc, created_at desc);

create index if not exists idx_pickup_games_host_user_id
  on public.pickup_games (host_user_id);

create index if not exists idx_pickup_games_status_pub
  on public.pickup_games (status, publication_status);

create index if not exists idx_pickup_participants_game_id
  on public.pickup_game_participants (game_id, joined_at desc);

-- 4. Atomic RSVP Function
create or replace function public.rsvp_pickup_game(
  p_game_id text,
  p_player_name text,
  p_player_phone text default null,
  p_allow_waitlist boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
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
begin
  -- 1. Server-side Input Validation
  v_clean_name := trim(p_player_name);
  if v_clean_name is null or char_length(v_clean_name) < 2 or char_length(v_clean_name) > 100 then
    return jsonb_build_object(
      'status', 'error',
      'error_code', 'INVALID_NAME',
      'message', 'Player name must be between 2 and 100 characters.'
    );
  end if;

  -- Normalize phone
  if p_player_phone is not null and trim(p_player_phone) <> '' then
    v_clean_phone := regexp_replace(p_player_phone, '[^0-9]', '', 'g');
    if char_length(v_clean_phone) = 12 and starts_with(v_clean_phone, '91') then
      v_clean_phone := substring(v_clean_phone from 3);
    end if;

    if char_length(v_clean_phone) < 10 or char_length(v_clean_phone) > 15 then
      return jsonb_build_object(
        'status', 'error',
        'error_code', 'INVALID_PHONE',
        'message', 'Please provide a valid 10-digit mobile number.'
      );
    end if;
  else
    v_clean_phone := null;
  end if;

  -- Derive caller IP or identifier for rate limiting
  begin
    v_caller_ip := current_setting('request.headers', true)::jsonb->>'x-forwarded-for';
    if v_caller_ip is not null and position(',' in v_caller_ip) > 0 then
      v_caller_ip := trim(split_part(v_caller_ip, ',', 1));
    end if;
  exception when others then
    v_caller_ip := null;
  end;

  v_rate_key := coalesce(v_clean_phone, v_caller_ip, 'anon-' || v_clean_name);

  -- 2. Server-side Rate Limiting (max 5 requests per 60 seconds)
  if v_rate_key is not null then
    select attempt_count, first_attempt_at into v_rate_count, v_rate_first
    from public.pickup_game_rsvp_rate_limits
    where identifier = v_rate_key
    for update;

    if found then
      if now() - v_rate_first < interval '60 seconds' then
        if v_rate_count >= 5 then
          return jsonb_build_object(
            'status', 'error',
            'error_code', 'RATE_LIMITED',
            'message', 'Too many reservation attempts. Please wait 60 seconds before trying again.'
          );
        end if;
        update public.pickup_game_rsvp_rate_limits
        set attempt_count = attempt_count + 1, last_attempt_at = now()
        where identifier = v_rate_key;
      else
        update public.pickup_game_rsvp_rate_limits
        set attempt_count = 1, first_attempt_at = now(), last_attempt_at = now()
        where identifier = v_rate_key;
      end if;
    else
      insert into public.pickup_game_rsvp_rate_limits (identifier, attempt_count, first_attempt_at, last_attempt_at)
      values (v_rate_key, 1, now(), now())
      on conflict (identifier) do nothing;
    end if;
  end if;

  -- 3. Obtain caller authentication ID if verified via Supabase Auth
  begin
    v_user_id := auth.uid()::text;
  exception when others then
    v_user_id := null;
  end;

  -- 4. Lock game row for update to ensure atomic concurrency
  select id, spots_open, total_players, confirmed_players, whatsapp_group_url, status
  into v_game_record
  from public.pickup_games
  where id::text = p_game_id
  for update;

  if not found then
    return jsonb_build_object(
      'status', 'error',
      'error_code', 'GAME_NOT_FOUND',
      'message', 'The requested pickup game was not found or has expired.'
    );
  end if;

  -- 5. Duplicate Reservation Prevention
  if v_clean_phone is not null or v_user_id is not null then
    select id into v_existing_id
    from public.pickup_game_participants
    where game_id = p_game_id
      and status in ('confirmed', 'waitlist')
      and (
        (v_clean_phone is not null and player_phone = v_clean_phone) or
        (v_user_id is not null and user_id = v_user_id)
      )
    limit 1;

    if found then
      return jsonb_build_object(
        'status', 'duplicate',
        'error_code', 'DUPLICATE_REGISTRATION',
        'message', 'You already have an active reservation or waitlist entry for this match.',
        'reservation_id', v_existing_id
      );
    end if;
  end if;

  -- 6. Check Spot Availability & Concurrency
  if v_game_record.spots_open > 0 and v_game_record.status <> 'full' then
    v_new_spots := v_game_record.spots_open - 1;
    v_new_confirmed := v_game_record.confirmed_players + 1;
    v_new_status := case when v_new_spots = 0 then 'full' else 'open' end;

    update public.pickup_games
    set
      spots_open = v_new_spots,
      confirmed_players = v_new_confirmed,
      status = v_new_status,
      updated_at = now()
    where id = v_game_record.id;

    insert into public.pickup_game_participants (
      game_id,
      user_id,
      player_name,
      player_phone,
      status,
      joined_at
    ) values (
      p_game_id,
      v_user_id,
      v_clean_name,
      v_clean_phone,
      'confirmed',
      now()
    ) returning id into v_participant_id;

    -- Return confirmation with WhatsApp link ONLY upon confirmed reservation
    return jsonb_build_object(
      'status', 'confirmed',
      'message', 'Spot confirmed! Welcome to the match, ' || v_clean_name || '.',
      'participant_id', v_participant_id,
      'spots_open', v_new_spots,
      'confirmed_players', v_new_confirmed,
      'game_status', v_new_status,
      'whatsapp_group_url', v_game_record.whatsapp_group_url
    );

  else
    -- Match is full
    if p_allow_waitlist then
      select count(*) + 1 into v_waitlist_pos
      from public.pickup_game_participants
      where game_id = p_game_id and status = 'waitlist';

      insert into public.pickup_game_participants (
        game_id,
        user_id,
        player_name,
        player_phone,
        status,
        joined_at
      ) values (
        p_game_id,
        v_user_id,
        v_clean_name,
        v_clean_phone,
        'waitlist',
        now()
      ) returning id into v_participant_id;

      return jsonb_build_object(
        'status', 'waitlist',
        'message', 'Match is full. You have been added to the waitlist (Position #' || v_waitlist_pos || ').',
        'participant_id', v_participant_id,
        'waitlist_position', v_waitlist_pos,
        'spots_open', 0,
        'confirmed_players', v_game_record.confirmed_players,
        'game_status', 'full',
        'whatsapp_group_url', null
      );
    else
      return jsonb_build_object(
        'status', 'full',
        'error_code', 'MATCH_FULL',
        'message', 'This pickup match is already full! No spots left.',
        'spots_open', 0,
        'confirmed_players', v_game_record.confirmed_players,
        'game_status', 'full',
        'whatsapp_group_url', null
      );
    end if;
  end if;
end;
$$;

-- 5. Cancellation Function with Strengthened Verification & Waitlist Auto-Promotion
create or replace function public.cancel_pickup_game_reservation(
  p_reservation_id uuid,
  p_player_phone text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_participant record;
  v_game record;
  v_next_waitlist record;
  v_clean_phone text;
  v_user_id text;
  v_caller_is_authorized boolean := false;
begin
  begin
    v_user_id := auth.uid()::text;
  exception when others then
    v_user_id := null;
  end;

  if p_player_phone is not null and trim(p_player_phone) <> '' then
    v_clean_phone := regexp_replace(p_player_phone, '[^0-9]', '', 'g');
    if char_length(v_clean_phone) = 12 and starts_with(v_clean_phone, '91') then
      v_clean_phone := substring(v_clean_phone from 3);
    end if;
  else
    v_clean_phone := null;
  end if;

  select * into v_participant
  from public.pickup_game_participants
  where id = p_reservation_id
  for update;

  if not found then
    return jsonb_build_object(
      'status', 'error',
      'error_code', 'RESERVATION_NOT_FOUND',
      'message', 'Reservation record not found.'
    );
  end if;

  select * into v_game
  from public.pickup_games
  where id::text = v_participant.game_id
  for update;

  -- Caller verification:
  if v_user_id is not null and ((v_game.host_user_id is not null and v_user_id = v_game.host_user_id::text) or public.is_pickup_game_admin()) then
    v_caller_is_authorized := true;
  elsif v_participant.user_id is not null then
    if v_user_id is not null and v_user_id = v_participant.user_id then
      v_caller_is_authorized := true;
    else
      v_caller_is_authorized := false;
    end if;
  elsif v_participant.player_phone is not null and v_clean_phone is not null and v_clean_phone = v_participant.player_phone then
    v_caller_is_authorized := true;
  else
    v_caller_is_authorized := false;
  end if;

  if not v_caller_is_authorized then
    return jsonb_build_object(
      'status', 'error',
      'error_code', 'UNAUTHORIZED',
      'message', 'Unauthorized to cancel this reservation. Verification credentials required.'
    );
  end if;

  if v_participant.status = 'cancelled' then
    return jsonb_build_object('status', 'already_cancelled', 'message', 'Reservation was already cancelled.');
  end if;

  update public.pickup_game_participants
  set status = 'cancelled'
  where id = p_reservation_id;

  if v_participant.status = 'confirmed' and found then
    select * into v_next_waitlist
    from public.pickup_game_participants
    where game_id = v_participant.game_id
      and status = 'waitlist'
    order by joined_at asc
    limit 1
    for update;

    if found then
      update public.pickup_game_participants
      set status = 'confirmed'
      where id = v_next_waitlist.id;

      return jsonb_build_object(
        'status', 'cancelled',
        'message', 'Reservation cancelled. Spot automatically transferred to next player on waitlist.',
        'promoted_participant_id', v_next_waitlist.id
      );
    else
      update public.pickup_games
      set
        spots_open = spots_open + 1,
        confirmed_players = greatest(0, confirmed_players - 1),
        status = case when status = 'full' then 'open' else status end,
        updated_at = now()
      where id = v_game.id;

      return jsonb_build_object(
        'status', 'cancelled',
        'message', 'Reservation cancelled and spot reopened successfully.'
      );
    end if;
  else
    return jsonb_build_object(
      'status', 'cancelled',
      'message', 'Waitlist reservation cancelled.'
    );
  end if;
end;
$$;

-- 6. RPC: create_pickup_game
create or replace function public.create_pickup_game(
  p_sport text,
  p_venue_name text,
  p_city text,
  p_time_label text,
  p_total_players int,
  p_price_per_player text default 'Free',
  p_skill_level text default 'Intermediate',
  p_emoji text default '⚽',
  p_whatsapp_group_url text default null,
  p_publish_immediately boolean default true,
  p_host_display_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
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
begin
  v_user_id := auth.uid();
  if v_user_id is null and not public.is_pickup_game_admin() then
    return jsonb_build_object(
      'status', 'error',
      'error_code', 'UNAUTHORIZED',
      'message', 'Authentication required. You must be signed in with a verified account to create a pickup match.'
    );
  end if;

  v_clean_sport := trim(p_sport);
  if v_clean_sport is null or char_length(v_clean_sport) < 2 or char_length(v_clean_sport) > 80 then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_SPORT', 'message', 'Sport must be between 2 and 80 characters.');
  end if;

  v_clean_venue := trim(p_venue_name);
  if v_clean_venue is null or char_length(v_clean_venue) < 2 or char_length(v_clean_venue) > 180 then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_VENUE', 'message', 'Venue name must be between 2 and 180 characters.');
  end if;

  v_clean_city := trim(p_city);
  if v_clean_city is null or char_length(v_clean_city) < 1 or char_length(v_clean_city) > 120 then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_CITY', 'message', 'City must be between 1 and 120 characters.');
  end if;

  v_clean_time := trim(p_time_label);
  if v_clean_time is null or char_length(v_clean_time) < 2 or char_length(v_clean_time) > 120 then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_TIME', 'message', 'Time label must be between 2 and 120 characters.');
  end if;

  if p_total_players is null or p_total_players < 2 or p_total_players > 200 then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_CAPACITY', 'message', 'Total players must be between 2 and 200.');
  end if;

  v_clean_skill := coalesce(trim(p_skill_level), 'Intermediate');
  if v_clean_skill not in ('Beginner', 'Intermediate', 'Advanced', 'All Levels') then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_SKILL_LEVEL', 'message', 'Skill level must be Beginner, Intermediate, Advanced, or All Levels.');
  end if;

  v_clean_price := coalesce(nullif(trim(p_price_per_player), ''), 'Free');
  v_clean_emoji := coalesce(nullif(trim(p_emoji), ''), '⚽');

  if p_whatsapp_group_url is not null and trim(p_whatsapp_group_url) <> '' then
    v_clean_whatsapp := trim(p_whatsapp_group_url);
    if not (v_clean_whatsapp ~* '^https:\/\/(chat\.whatsapp\.com\/[A-Za-z0-9_-]+|wa\.me\/[0-9]+)') then
      return jsonb_build_object('status', 'error', 'error_code', 'INVALID_WHATSAPP_URL', 'message', 'WhatsApp URL must be a valid chat.whatsapp.com invite link or wa.me link.');
    end if;
  else
    v_clean_whatsapp := null;
  end if;

  v_clean_host := coalesce(nullif(trim(p_host_display_name), ''), 'Community Host');

  if p_publish_immediately then
    v_status := 'open';
    v_pub_status := 'published';
  else
    v_status := 'draft';
    v_pub_status := 'draft';
  end if;

  v_base_slug := lower(regexp_replace(v_clean_sport || '-' || v_clean_city || '-' || v_clean_venue, '[^a-z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  if char_length(v_base_slug) > 80 then
    v_base_slug := substring(v_base_slug from 1 for 80);
  end if;
  v_slug_suffix := substring(gen_random_uuid()::text from 1 for 6);
  v_slug := v_base_slug || '-' || v_slug_suffix;

  insert into public.pickup_games (
    slug, sport, emoji, skill_level, venue_name, city, time_label,
    host_name, host_user_id, price_per_player, spots_open, total_players,
    confirmed_players, whatsapp_group_url, status, is_featured, publication_status,
    created_at, updated_at
  ) values (
    v_slug, v_clean_sport, v_clean_emoji, v_clean_skill, v_clean_venue, v_clean_city, v_clean_time,
    v_clean_host, v_user_id, v_clean_price, p_total_players, p_total_players,
    0, v_clean_whatsapp, v_status, false, v_pub_status,
    now(), now()
  ) returning id into v_game_id;

  return jsonb_build_object(
    'status', 'success',
    'message', 'Pickup match created successfully.',
    'game_id', v_game_id,
    'slug', v_slug,
    'game_status', v_status,
    'publication_status', v_pub_status
  );
end;
$$;

-- 7. RPC: update_pickup_game_details
create or replace function public.update_pickup_game_details(
  p_game_id text,
  p_sport text default null,
  p_skill_level text default null,
  p_emoji text default null,
  p_whatsapp_group_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game record;
  v_clean_whatsapp text;
begin
  select * into v_game
  from public.pickup_games
  where id::text = p_game_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  end if;

  if auth.uid() is null or (v_game.host_user_id is distinct from auth.uid() and not public.is_pickup_game_admin()) then
    return jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to edit this match.');
  end if;

  if v_game.status = 'completed' then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Completed games cannot be edited.');
  end if;
  if v_game.status = 'cancelled' then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Cancelled games cannot be edited. Reopen the game first.');
  end if;

  if p_skill_level is not null and p_skill_level not in ('Beginner', 'Intermediate', 'Advanced', 'All Levels') then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_SKILL_LEVEL', 'message', 'Invalid skill level.');
  end if;

  if p_whatsapp_group_url is not null and trim(p_whatsapp_group_url) <> '' then
    v_clean_whatsapp := trim(p_whatsapp_group_url);
    if not (v_clean_whatsapp ~* '^https:\/\/(chat\.whatsapp\.com\/[A-Za-z0-9_-]+|wa\.me\/[0-9]+)') then
      return jsonb_build_object('status', 'error', 'error_code', 'INVALID_WHATSAPP_URL', 'message', 'Invalid WhatsApp URL.');
    end if;
  else
    v_clean_whatsapp := v_game.whatsapp_group_url;
  end if;

  update public.pickup_games
  set
    sport = coalesce(nullif(trim(p_sport), ''), sport),
    skill_level = coalesce(p_skill_level, skill_level),
    emoji = coalesce(nullif(trim(p_emoji), ''), emoji),
    whatsapp_group_url = v_clean_whatsapp,
    updated_at = now()
  where id = v_game.id;

  return jsonb_build_object(
    'status', 'success',
    'message', 'Match details updated successfully.',
    'game_id', v_game.id
  );
end;
$$;

-- 8. RPC: reschedule_pickup_game
create or replace function public.reschedule_pickup_game(
  p_game_id text,
  p_venue_name text,
  p_city text,
  p_time_label text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game record;
begin
  select * into v_game
  from public.pickup_games
  where id::text = p_game_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  end if;

  if auth.uid() is null or (v_game.host_user_id is distinct from auth.uid() and not public.is_pickup_game_admin()) then
    return jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to reschedule this match.');
  end if;

  if v_game.status in ('completed', 'cancelled') then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Cannot reschedule a completed or cancelled match.');
  end if;

  if char_length(trim(p_venue_name)) < 2 or char_length(trim(p_city)) < 1 or char_length(trim(p_time_label)) < 2 then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_INPUT', 'message', 'Venue, city, and time label must be provided.');
  end if;

  update public.pickup_games
  set
    venue_name = trim(p_venue_name),
    city = trim(p_city),
    time_label = trim(p_time_label),
    updated_at = now()
  where id = v_game.id;

  return jsonb_build_object(
    'status', 'success',
    'message', 'Match rescheduled successfully.',
    'game_id', v_game.id,
    'venue_name', trim(p_venue_name),
    'city', trim(p_city),
    'time_label', trim(p_time_label)
  );
end;
$$;

-- 9. RPC: update_pickup_game_capacity
create or replace function public.update_pickup_game_capacity(
  p_game_id text,
  p_total_players int,
  p_price_per_player text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game record;
  v_new_spots int;
  v_new_status text;
begin
  select * into v_game
  from public.pickup_games
  where id::text = p_game_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  end if;

  if auth.uid() is null or (v_game.host_user_id is distinct from auth.uid() and not public.is_pickup_game_admin()) then
    return jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to alter capacity for this match.');
  end if;

  if v_game.status in ('completed', 'cancelled') then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Cannot alter capacity on a completed or cancelled match.');
  end if;

  if p_total_players is null or p_total_players < 2 or p_total_players > 200 then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_CAPACITY', 'message', 'Total capacity must be between 2 and 200.');
  end if;

  if p_total_players < v_game.confirmed_players then
    return jsonb_build_object(
      'status', 'error',
      'error_code', 'CAPACITY_BELOW_CONFIRMED',
      'message', 'Total capacity cannot be reduced below the number of confirmed players (' || v_game.confirmed_players || ').'
    );
  end if;

  v_new_spots := p_total_players - v_game.confirmed_players;
  v_new_status := case when v_new_spots = 0 then 'full' else 'open' end;

  update public.pickup_games
  set
    total_players = p_total_players,
    spots_open = v_new_spots,
    status = v_new_status,
    price_per_player = coalesce(nullif(trim(p_price_per_player), ''), price_per_player),
    updated_at = now()
  where id = v_game.id;

  return jsonb_build_object(
    'status', 'success',
    'message', 'Capacity updated successfully.',
    'game_id', v_game.id,
    'total_players', p_total_players,
    'spots_open', v_new_spots,
    'game_status', v_new_status
  );
end;
$$;

-- 10. RPC: cancel_pickup_game_as_host
create or replace function public.cancel_pickup_game_as_host(
  p_game_id text,
  p_cancellation_reason text default 'Match cancelled by host'
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game record;
  v_affected_confirmed int;
  v_affected_waitlist int;
begin
  select * into v_game
  from public.pickup_games
  where id::text = p_game_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  end if;

  if auth.uid() is null or (v_game.host_user_id is distinct from auth.uid() and not public.is_pickup_game_admin()) then
    return jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to cancel this match.');
  end if;

  if v_game.status = 'cancelled' then
    return jsonb_build_object('status', 'already_cancelled', 'message', 'This match is already cancelled.');
  end if;

  if v_game.status = 'completed' then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Completed matches cannot be cancelled.');
  end if;

  select count(*) into v_affected_confirmed
  from public.pickup_game_participants
  where game_id = p_game_id and status = 'confirmed';

  select count(*) into v_affected_waitlist
  from public.pickup_game_participants
  where game_id = p_game_id and status = 'waitlist';

  update public.pickup_games
  set
    status = 'cancelled',
    cancellation_reason = coalesce(nullif(trim(p_cancellation_reason), ''), 'Match cancelled by host'),
    cancelled_at = now(),
    updated_at = now()
  where id = v_game.id;

  -- Reservation Integrity: mark active reservations cancelled, preserving history
  update public.pickup_game_participants
  set status = 'cancelled'
  where game_id = p_game_id and status in ('confirmed', 'waitlist');

  return jsonb_build_object(
    'status', 'success',
    'message', 'Match cancelled successfully.',
    'game_id', v_game.id,
    'confirmed_reservations_cancelled', v_affected_confirmed,
    'waitlist_reservations_cancelled', v_affected_waitlist
  );
end;
$$;

-- 11. RPC: reopen_pickup_game_as_host
create or replace function public.reopen_pickup_game_as_host(
  p_game_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game record;
  v_new_status text;
begin
  select * into v_game
  from public.pickup_games
  where id::text = p_game_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  end if;

  if auth.uid() is null or (v_game.host_user_id is distinct from auth.uid() and not public.is_pickup_game_admin()) then
    return jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to reopen this match.');
  end if;

  if v_game.status = 'completed' and not public.is_pickup_game_admin() then
    return jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Completed matches cannot be reopened without administrator authorization.');
  end if;

  if v_game.status <> 'cancelled' then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Only cancelled matches can be reopened.');
  end if;

  v_new_status := case when v_game.spots_open = 0 then 'full' else 'open' end;

  update public.pickup_games
  set
    status = v_new_status,
    cancellation_reason = null,
    cancelled_at = null,
    updated_at = now()
  where id = v_game.id;

  return jsonb_build_object(
    'status', 'success',
    'message', 'Match reopened successfully.',
    'game_id', v_game.id,
    'game_status', v_new_status
  );
end;
$$;

-- 12. RPC: complete_pickup_game_as_host
create or replace function public.complete_pickup_game_as_host(
  p_game_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game record;
begin
  select * into v_game
  from public.pickup_games
  where id::text = p_game_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  end if;

  if auth.uid() is null or (v_game.host_user_id is distinct from auth.uid() and not public.is_pickup_game_admin()) then
    return jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'You are not authorized to complete this match.');
  end if;

  if v_game.status = 'completed' then
    return jsonb_build_object('status', 'already_completed', 'message', 'Match is already completed.');
  end if;

  if v_game.status = 'cancelled' then
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Cancelled matches cannot be marked completed. Reopen first.');
  end if;

  update public.pickup_games
  set
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  where id = v_game.id;

  return jsonb_build_object(
    'status', 'success',
    'message', 'Match marked as completed.',
    'game_id', v_game.id,
    'game_status', 'completed'
  );
end;
$$;

-- 13. RPC: admin_moderate_pickup_game
create or replace function public.admin_moderate_pickup_game(
  p_game_id text,
  p_action text,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game record;
begin
  if not public.is_pickup_game_admin() then
    return jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Administrator or moderator privileges required.');
  end if;

  select * into v_game
  from public.pickup_games
  where id::text = p_game_id
  for update;

  if not found then
    return jsonb_build_object('status', 'error', 'error_code', 'GAME_NOT_FOUND', 'message', 'Game not found.');
  end if;

  if p_action = 'feature' then
    update public.pickup_games set is_featured = true, updated_at = now() where id = v_game.id;
  elsif p_action = 'unfeature' then
    update public.pickup_games set is_featured = false, updated_at = now() where id = v_game.id;
  elsif p_action = 'archive' then
    update public.pickup_games set publication_status = 'archived', updated_at = now() where id = v_game.id;
  elsif p_action = 'publish' then
    update public.pickup_games set publication_status = 'published', updated_at = now() where id = v_game.id;
  elsif p_action = 'force_cancel' then
    update public.pickup_games
    set status = 'cancelled',
        cancellation_reason = coalesce(p_notes, 'Cancelled by administrator moderation'),
        cancelled_at = now(),
        updated_at = now()
    where id = v_game.id;
    update public.pickup_game_participants
    set status = 'cancelled'
    where game_id = p_game_id and status in ('confirmed', 'waitlist');
  else
    return jsonb_build_object('status', 'error', 'error_code', 'INVALID_ACTION', 'message', 'Unrecognized moderation action.');
  end if;

  return jsonb_build_object(
    'status', 'success',
    'message', 'Moderation action ' || p_action || ' executed successfully.',
    'game_id', v_game.id,
    'action', p_action
  );
end;
$$;

-- 14. RPC: get_host_pickup_games
create or replace function public.get_host_pickup_games()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_games jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Authentication required.', 'data', '[]'::jsonb);
  end if;

  select jsonb_agg(to_jsonb(g)) into v_games
  from (
    select
      id, slug, sport, emoji, skill_level, venue_name, city, time_label,
      host_name, host_user_id, price_per_player, spots_open, total_players,
      confirmed_players, whatsapp_group_url, status, is_featured,
      publication_status, cancellation_reason, cancelled_at, completed_at, created_at, updated_at
    from public.pickup_games
    where host_user_id = v_user_id
       or public.is_pickup_game_admin()
    order by created_at desc
  ) g;

  return jsonb_build_object(
    'status', 'success',
    'data', coalesce(v_games, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.is_pickup_game_admin() to authenticated;
grant execute on function public.rsvp_pickup_game(text, text, text, boolean) to anon, authenticated;
grant execute on function public.cancel_pickup_game_reservation(uuid, text) to anon, authenticated;
grant execute on function public.create_pickup_game(text, text, text, text, int, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.update_pickup_game_details(text, text, text, text, text) to authenticated;
grant execute on function public.reschedule_pickup_game(text, text, text, text) to authenticated;
grant execute on function public.update_pickup_game_capacity(text, int, text) to authenticated;
grant execute on function public.cancel_pickup_game_as_host(text, text) to authenticated;
grant execute on function public.reopen_pickup_game_as_host(text) to authenticated;
grant execute on function public.complete_pickup_game_as_host(text) to authenticated;
grant execute on function public.admin_moderate_pickup_game(text, text, text) to authenticated;
grant execute on function public.get_host_pickup_games() to authenticated;

-- Seed baseline games
insert into public.pickup_games (
  slug, sport, emoji, skill_level, venue_name, city, time_label, host_name,
  price_per_player, spots_open, total_players, confirmed_players, whatsapp_group_url, status, is_featured, publication_status
) values
  ('ferrohub-pickleball-bengaluru', 'Pickleball', '🎾', 'Intermediate', 'FerroHub Sports', 'Bengaluru', 'Today · 7:00 PM', 'Rahul S.', '₹200/player', 1, 4, 3, 'https://chat.whatsapp.com/sample-ferrohub-pickleball', 'open', true, 'published'),
  ('kicks-on-grass-football-bengaluru', 'Football', '⚽', 'Beginner', 'Kicks on Grass Arena', 'Bengaluru', 'Today · 8:30 PM', 'Aakash M.', '₹250/player', 4, 12, 8, 'https://chat.whatsapp.com/sample-kicks-football', 'open', true, 'published'),
  ('whitefield-badminton-bengaluru', 'Badminton', '🏸', 'Advanced', 'Whitefield Sports Hub', 'Bengaluru', 'Tomorrow · 6:30 AM', 'Sneha K.', '₹150/player', 1, 4, 3, 'https://chat.whatsapp.com/sample-whitefield-badminton', 'open', false, 'published'),
  ('dda-cricket-delhi', 'Cricket', '🏏', 'Intermediate', 'DDA Sports Ground', 'Delhi', 'Saturday · 7:00 AM', 'Vikram P.', '₹180/player', 8, 22, 14, 'https://chat.whatsapp.com/sample-dda-cricket', 'open', true, 'published'),
  ('dlta-tennis-new-delhi', 'Tennis', '🎾', 'Intermediate', 'DLTA Tennis Complex', 'New Delhi', 'Tomorrow · 5:30 PM', 'Neha R.', '₹220/player', 3, 4, 1, 'https://chat.whatsapp.com/sample-dlta-tennis', 'open', false, 'published'),
  ('turfside-box-cricket-mumbai', 'Box Cricket', '🏏', 'Beginner', 'Turfside Arena', 'Mumbai', 'Sunday · 6:00 PM', 'Karan D.', '₹300/player', 4, 10, 6, 'https://chat.whatsapp.com/sample-turfside-cricket', 'open', false, 'published'),
  ('regional-sports-centre-basketball-kochi', 'Basketball', '🏀', 'Advanced', 'Regional Sports Centre', 'Kochi', 'Friday · 6:00 PM', 'Fahad A.', '₹120/player', 2, 10, 8, 'https://chat.whatsapp.com/sample-kochi-basketball', 'open', false, 'published')
on conflict (slug) do nothing;

commit;
