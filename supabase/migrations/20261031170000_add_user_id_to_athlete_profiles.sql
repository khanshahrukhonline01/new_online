-- Migration: 20261031170000_add_user_id_to_athlete_profiles.sql
-- Description: Add user_id foreign key referencing auth.users and secure owner-management RLS policies
begin;

-- 1. Add user_id column referencing auth.users
alter table public.athlete_profiles
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2. Performance Index
create index if not exists athlete_profiles_user_id_idx
  on public.athlete_profiles (user_id);

-- 3. Secure Owner Management RLS Policies
drop policy if exists "athlete_profiles_owner_update" on public.athlete_profiles;
create policy "athlete_profiles_owner_update" on public.athlete_profiles
  for update to authenticated
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "athlete_profiles_owner_delete" on public.athlete_profiles;
create policy "athlete_profiles_owner_delete" on public.athlete_profiles
  for delete to authenticated
  using (auth.uid() = user_id);

commit;
