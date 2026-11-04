-- ==============================================================================
-- KhelGrid Module: Community Pickup Games & Match Coordination (Secured)
-- Purpose: Creates public.pickup_games table with realtime spot availability,
-- community host coordination, player self-serve booking policies,
-- relational pickup_game_participants, and server-side atomic RSVP RPC functions.
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
  price_per_player text not null default 'Free',
  spots_open integer not null default 1 check (spots_open >= 0),
  total_players integer not null default 10 check (total_players > 0),
  confirmed_players integer not null default 0 check (confirmed_players >= 0),
  whatsapp_group_url text,
  status text not null default 'open' check (status in ('open', 'full', 'completed', 'cancelled')),
  is_featured boolean not null default false,
  publication_status text not null default 'published'
    check (publication_status in ('draft', 'published', 'archived')),
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

-- Pickup Games RLS: Read published games and insert new community games only.
-- Spot updates are handled strictly by the atomic server-side rsvp_pickup_game function.
drop policy if exists "pickup_games_read_published" on public.pickup_games;
create policy "pickup_games_read_published" on public.pickup_games
  for select to anon, authenticated
  using (publication_status = 'published');

drop policy if exists "pickup_games_insert_community" on public.pickup_games;
create policy "pickup_games_insert_community" on public.pickup_games
  for insert to anon, authenticated
  with check (char_length(trim(sport)) >= 2);

drop policy if exists "pickup_games_update_spots" on public.pickup_games;
grant select, insert on public.pickup_games to anon, authenticated;

-- Pickup Game Participants RLS: Strict Privacy (No public read, no direct insert)
drop policy if exists "pickup_game_participants_read" on public.pickup_game_participants;
drop policy if exists "pickup_game_participants_insert" on public.pickup_game_participants;
revoke select, insert, update, delete on public.pickup_game_participants from public, anon, authenticated;
revoke all on public.pickup_game_rsvp_rate_limits from public, anon, authenticated;

create index if not exists idx_pickup_games_city_sport
  on public.pickup_games (city, sport);

create index if not exists idx_pickup_games_featured
  on public.pickup_games (is_featured desc, created_at desc);

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

  -- Caller identifier for rate limiting
  begin
    v_caller_ip := current_setting('request.headers', true)::jsonb->>'x-forwarded-for';
    if v_caller_ip is not null and position(',' in v_caller_ip) > 0 then
      v_caller_ip := trim(split_part(v_caller_ip, ',', 1));
    end if;
  exception when others then
    v_caller_ip := null;
  end;

  v_rate_key := coalesce(v_clean_phone, v_caller_ip, 'anon-' || v_clean_name);

  -- 2. Server-side Rate Limiting (max 5 requests per 60 seconds per phone/IP)
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

  begin
    v_user_id := auth.uid()::text;
  exception when others then
    v_user_id := null;
  end;

  -- 3. Lock game row for update to ensure atomic concurrency
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

  -- 4. Duplicate Reservation Prevention
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

  -- 5. Check Spot Availability & Concurrency
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

-- 5. Cancellation Function with Waitlist Auto-Promotion
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

  if v_user_id is not null and v_participant.user_id is not null and v_user_id <> v_participant.user_id then
    return jsonb_build_object('status', 'error', 'message', 'Unauthorized to cancel this reservation.');
  end if;

  if v_clean_phone is not null and v_participant.player_phone is not null and v_clean_phone <> v_participant.player_phone then
    return jsonb_build_object('status', 'error', 'message', 'Phone number does not match reservation.');
  end if;

  if v_participant.status = 'cancelled' then
    return jsonb_build_object('status', 'already_cancelled', 'message', 'Reservation was already cancelled.');
  end if;

  select * into v_game
  from public.pickup_games
  where id::text = v_participant.game_id
  for update;

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
        status = 'open',
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

grant execute on function public.rsvp_pickup_game(text, text, text, boolean) to anon, authenticated;
grant execute on function public.cancel_pickup_game_reservation(uuid, text) to anon, authenticated;

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
