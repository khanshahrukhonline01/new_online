-- ==============================================================================
-- KhelGrid Module: Indian Sports Cities Geography Directory
-- Purpose: Creates public.cities table with 53 Indian sports cities (16 metro
-- hubs + 37 regional sports centres) and enables lightning fast RLS discovery.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- ==============================================================================

begin;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  state text not null check (char_length(trim(state)) between 1 and 120),
  zone text not null check (zone in ('North', 'South', 'East', 'West', 'Central', 'North-East', 'Islands')),
  is_metro boolean not null default false,
  venues text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cities enable row level security;

drop policy if exists "cities_read_all" on public.cities;
create policy "cities_read_all" on public.cities
  for select to anon, authenticated
  using (true);

grant select on public.cities to anon, authenticated;

create index if not exists cities_slug_idx on public.cities (slug);
create index if not exists cities_zone_idx on public.cities (zone);
create index if not exists cities_is_metro_idx on public.cities (is_metro);
create index if not exists cities_name_idx on public.cities (name);

insert into public.cities (slug, name, state, zone, is_metro, venues)
values
  ('delhi', 'Delhi', 'Delhi NCR', 'North', true, ARRAY['Jawaharlal Nehru Stadium', 'Thyagaraj Stadium', 'SAI Karni Singh Shooting Range']::text[]),
  ('mumbai', 'Mumbai', 'Maharashtra', 'West', true, ARRAY['Wankhede Stadium', 'MCA-BKC Ground', 'Cooperage Football Ground']::text[]),
  ('bengaluru', 'Bengaluru', 'Karnataka', 'South', true, ARRAY['Sree Kanteerava Stadium', 'M. Chinnaswamy Stadium', 'Kanteerava Aquatic Centre']::text[]),
  ('hyderabad', 'Hyderabad', 'Telangana', 'South', true, ARRAY['Gachibowli Stadium', 'GMC Balayogi Stadium', 'Rajiv Gandhi Cricket Stadium']::text[]),
  ('pune', 'Pune', 'Maharashtra', 'West', true, ARRAY['Shree Shiv Chhatrapati Sports Complex', 'MCA Stadium, Gahunje', 'Deccan Gymkhana']::text[]),
  ('kolkata', 'Kolkata', 'West Bengal', 'East', true, ARRAY['Salt Lake Stadium', 'Eden Gardens', 'Mohun Bagan Ground']::text[]),
  ('chennai', 'Chennai', 'Tamil Nadu', 'South', true, ARRAY['Jawaharlal Nehru Stadium', 'M. A. Chidambaram Stadium', 'SDAT Tennis Stadium']::text[]),
  ('ahmedabad', 'Ahmedabad', 'Gujarat', 'West', true, ARRAY['Narendra Modi Stadium', 'The Arena by TransStadia', 'Eka Club Sports Arena']::text[]),
  ('chandigarh', 'Chandigarh', 'Punjab & Haryana', 'North', true, ARRAY['PCA Stadium Mohali', 'Sector 16 Cricket Stadium', 'Sector 42 Hockey Stadium']::text[]),
  ('bhubaneswar', 'Bhubaneswar', 'Odisha', 'East', true, ARRAY['Kalinga Stadium', 'Kalinga Hockey Stadium', 'Biju Patnaik Swimming Pool']::text[]),
  ('lucknow', 'Lucknow', 'Uttar Pradesh', 'North', true, ARRAY['BRSABV Ekana Cricket Stadium', 'KD Singh Babu Stadium', 'BBD Badminton Academy']::text[]),
  ('jaipur', 'Jaipur', 'Rajasthan', 'North', true, ARRAY['Sawai Mansingh Stadium', 'SMS Indoor Sports Arena', 'Rajasthan Cricket Academy Ground']::text[]),
  ('bhopal', 'Bhopal', 'Madhya Pradesh', 'Central', true, ARRAY['TT Nagar Stadium', 'Major Dhyan Chand Hockey Stadium', 'SAI Regional Centre Goregaon']::text[]),
  ('kochi', 'Kochi', 'Kerala', 'South', true, ARRAY['Jawaharlal Nehru International Stadium', 'Regional Sports Centre', 'Maharajas College Ground']::text[]),
  ('ranchi', 'Ranchi', 'Jharkhand', 'East', true, ARRAY['Birsa Munda Athletics Stadium', 'JSCA International Stadium Complex', 'Mega Sports Complex Hotwar']::text[]),
  ('dehradun', 'Dehradun', 'Uttarakhand', 'North', true, ARRAY['Rajiv Gandhi International Cricket Stadium', 'Pavilion Ground', 'Maharana Pratap Sports College']::text[]),
  ('ajmer', 'Ajmer', 'Rajasthan', 'North', false, ARRAY['Mayo College Sports Ground', 'Patel Stadium']::text[]),
  ('ayodhya', 'Ayodhya', 'Uttar Pradesh', 'North', false, ARRAY['Dr. Bhim Rao Ambedkar International Sports Stadium']::text[]),
  ('guwahati', 'Guwahati', 'Assam', 'North-East', false, ARRAY['Indira Gandhi Athletic Stadium', 'Barsapara Cricket Stadium', 'Sarusajai Sports Complex']::text[]),
  ('indore', 'Indore', 'Madhya Pradesh', 'Central', false, ARRAY['Holkar Stadium', 'Nehru Stadium Indore', 'Abhay Prashal Indoor Stadium']::text[]),
  ('jammu', 'Jammu', 'Jammu & Kashmir', 'North', false, ARRAY['M.A. Stadium Jammu', 'Green Play Field Gandhi Nagar']::text[]),
  ('kanpur', 'Kanpur', 'Uttar Pradesh', 'North', false, ARRAY['Green Park Stadium', 'Palika Stadium']::text[]),
  ('srinagar', 'Srinagar', 'Jammu & Kashmir', 'North', false, ARRAY['Bakshi Stadium', 'TRC Turf Ground', 'Sher-i-Kashmir Stadium']::text[])
on conflict (slug) do nothing;

commit;
