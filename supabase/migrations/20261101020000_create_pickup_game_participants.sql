-- ==============================================================================
-- KhelGrid Migration: Pickup Game Participants, Live Concurrency & WhatsApp Link
-- Purpose: Adds whatsapp_group_url and status to public.pickup_games,
-- and creates public.pickup_game_participants for relational player RSVPs.
-- ==============================================================================

begin;

-- 1. Extend pickup_games with WhatsApp invite URL and match status
alter table public.pickup_games
  add column if not exists whatsapp_group_url text,
  add column if not exists status text not null default 'open'
    check (status in ('open', 'full', 'completed', 'cancelled'));

-- 2. Create pickup_game_participants table
create table if not exists public.pickup_game_participants (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id text,
  player_name text not null check (char_length(trim(player_name)) between 2 and 120),
  player_phone text,
  status text not null default 'confirmed' check (status in ('confirmed', 'waitlist', 'cancelled')),
  joined_at timestamptz not null default now()
);

-- 3. Row Level Security policies
alter table public.pickup_game_participants enable row level security;

drop policy if exists "pickup_game_participants_read" on public.pickup_game_participants;
create policy "pickup_game_participants_read" on public.pickup_game_participants
  for select to anon, authenticated
  using (true);

drop policy if exists "pickup_game_participants_insert" on public.pickup_game_participants;
create policy "pickup_game_participants_insert" on public.pickup_game_participants
  for insert to anon, authenticated
  with check (char_length(trim(player_name)) >= 2);

grant select, insert on public.pickup_game_participants to anon, authenticated;

-- 4. Fast lookup index for match rosters
create index if not exists idx_pickup_participants_game_id
  on public.pickup_game_participants (game_id, joined_at desc);

commit;
