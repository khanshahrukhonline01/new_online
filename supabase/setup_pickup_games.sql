-- ==============================================================================
-- KhelGrid Module: Community Pickup Games & Match Coordination
-- Purpose: Creates public.pickup_games table with realtime spot availability,
-- community host coordination, player self-serve booking policies, and
-- relational pickup_game_participants with WhatsApp coordination links.
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

-- Relational Player RSVPs
create table if not exists public.pickup_game_participants (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id text,
  player_name text not null check (char_length(trim(player_name)) between 2 and 120),
  player_phone text,
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlist', 'cancelled')),
  joined_at timestamptz not null default now()
);

alter table public.pickup_games enable row level security;
alter table public.pickup_game_participants enable row level security;

-- Pickup Games RLS
drop policy if exists "pickup_games_read_published" on public.pickup_games;
create policy "pickup_games_read_published" on public.pickup_games
  for select to anon, authenticated
  using (publication_status = 'published');

drop policy if exists "pickup_games_insert_community" on public.pickup_games;
create policy "pickup_games_insert_community" on public.pickup_games
  for insert to anon, authenticated
  with check (char_length(trim(sport)) >= 2);

drop policy if exists "pickup_games_update_spots" on public.pickup_games;
create policy "pickup_games_update_spots" on public.pickup_games
  for update to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.pickup_games to anon, authenticated;

-- Pickup Game Participants RLS
drop policy if exists "pickup_game_participants_read" on public.pickup_game_participants;
create policy "pickup_game_participants_read" on public.pickup_game_participants
  for select to anon, authenticated
  using (true);

drop policy if exists "pickup_game_participants_insert" on public.pickup_game_participants;
create policy "pickup_game_participants_insert" on public.pickup_game_participants
  for insert to anon, authenticated
  with check (char_length(trim(player_name)) >= 2);

grant select, insert on public.pickup_game_participants to anon, authenticated;

create index if not exists idx_pickup_games_city_sport
  on public.pickup_games (city, sport);

create index if not exists idx_pickup_games_featured
  on public.pickup_games (is_featured desc, created_at desc);

create index if not exists idx_pickup_participants_game_id
  on public.pickup_game_participants (game_id, joined_at desc);

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
