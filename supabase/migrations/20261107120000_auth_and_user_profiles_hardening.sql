-- Migration: 20261107120000_auth_and_user_profiles_hardening.sql
-- Purpose: Complete Supabase Auth integration, automatic user profile synchronization,
--          role-based authorization, and row-level security policies.

begin;

-- 1. Create or extend public.profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 100),
  email text,
  avatar_url text,
  city text check (city is null or char_length(city) <= 120),
  phone text check (phone is null or char_length(phone) <= 30),
  role text not null default 'athlete' check (role in ('athlete', 'host', 'coach', 'scout', 'academy', 'admin')),
  preferred_sports text[] default '{}',
  bio text check (bio is null or char_length(bio) <= 500),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure newly added columns exist if table was previously created with minimal schema
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text check (phone is null or char_length(phone) <= 30);
alter table public.profiles add column if not exists role text not null default 'athlete' check (role in ('athlete', 'host', 'coach', 'scout', 'academy', 'admin'));
alter table public.profiles add column if not exists preferred_sports text[] default '{}';
alter table public.profiles add column if not exists bio text check (bio is null or char_length(bio) <= 500);
alter table public.profiles add column if not exists is_verified boolean not null default false;

-- Indexes for performance
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_city_idx on public.profiles (city);

-- 2. Automated user profile synchronization trigger on auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  user_full_name text;
  user_role text;
  user_city text;
  user_phone text;
begin
  user_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'athlete@khelgrid.com'), '@', 1)
  );

  user_role := coalesce(new.raw_user_meta_data->>'role', 'athlete');
  if user_role not in ('athlete', 'host', 'coach', 'scout', 'academy', 'admin') then
    user_role := 'athlete';
  end if;

  user_city := new.raw_user_meta_data->>'city';
  user_phone := coalesce(new.raw_user_meta_data->>'phone', new.phone);

  insert into public.profiles (
    id,
    display_name,
    email,
    role,
    city,
    phone,
    avatar_url,
    is_verified,
    created_at,
    updated_at
  )
  values (
    new.id,
    user_full_name,
    new.email,
    user_role,
    user_city,
    user_phone,
    new.raw_user_meta_data->>'avatar_url',
    false,
    now(),
    now()
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    email = coalesce(excluded.email, public.profiles.email),
    role = coalesce(excluded.role, public.profiles.role),
    city = coalesce(excluded.city, public.profiles.city),
    phone = coalesce(excluded.phone, public.profiles.phone),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

-- Drop and recreate trigger on auth.users if auth schema is accessible
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'auth' and tablename = 'users') then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end;
$$;

-- 3. Role-Based Authorization Helpers
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.has_role(required_role text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (role = required_role or role = 'admin')
  );
$$;

-- Revoke dangerous direct execution
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

revoke execute on function public.has_role(text) from public;
grant execute on function public.has_role(text) to authenticated, service_role;

-- 4. Row Level Security Policies
alter table public.profiles enable row level security;

-- Public read: Anyone can read basic sports profiles (display_name, role, city, sports, avatar)
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
  for select
  to anon, authenticated
  using (true);

-- Users can insert their own profile
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    -- Regular users cannot self-assign admin role on insert
    and (role != 'admin' or public.is_admin())
  );

-- Users can only update their own profile; cannot self-elevate to admin
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevent non-admins from self-promoting to admin
    and (role != 'admin' or public.is_admin())
  );

-- Only admins or the user themselves can delete their profile
drop policy if exists "profiles_delete_own_or_admin" on public.profiles;
create policy "profiles_delete_own_or_admin" on public.profiles
  for delete
  to authenticated
  using (auth.uid() = id or public.is_admin());

commit;
