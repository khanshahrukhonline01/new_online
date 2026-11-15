-- Migration: 20261031213000_create_cities_table.sql
-- Description: Create public.cities table and seed 53 Indian sports cities for fully dynamic national geography
begin;

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  state text not null,
  zone text not null check (zone in ('North', 'South', 'East', 'West', 'Central', 'North-East', 'Islands')),
  is_metro boolean not null default false,
  venues text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: Public read access for anonymous and authenticated users
alter table public.cities enable row level security;

drop policy if exists "cities_read_all" on public.cities;
create policy "cities_read_all" on public.cities
  for select
  using (true);

-- Indexes for lightning fast lookups
create index if not exists cities_slug_idx on public.cities (slug);
create index if not exists cities_zone_idx on public.cities (zone);
create index if not exists cities_is_metro_idx on public.cities (is_metro);
create index if not exists cities_name_idx on public.cities (name);

-- Seed all 53 initial Indian sports cities
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
  ('ballia', 'Ballia', 'Uttar Pradesh', 'North', false, ARRAY['Veer LORIK Sports Stadium']::text[]),
  ('bareilly', 'Bareilly', 'Uttar Pradesh', 'North', false, ARRAY['Major Dhyan Chand Sports Stadium Bareilly']::text[]),
  ('bikaner', 'Bikaner', 'Rajasthan', 'North', false, ARRAY['Dr. Karni Singh Stadium Bikaner']::text[]),
  ('chhatarpur', 'Chhatarpur', 'Madhya Pradesh', 'Central', false, ARRAY['Chhatarpur District Sports Stadium']::text[]),
  ('chhatrapati-sambhajinagar', 'Chhatrapati Sambhajinagar', 'Maharashtra', 'West', false, ARRAY['SAI National Centre of Excellence Aurangabad', 'Garware Stadium']::text[]),
  ('dewas', 'Dewas', 'Madhya Pradesh', 'Central', false, ARRAY['Kushabhau Thakre Stadium Dewas']::text[]),
  ('dimapur', 'Dimapur', 'Nagaland', 'North-East', false, ARRAY['Dimapur District Sports Complex (DDSC) Stadium']::text[]),
  ('gandhinagar', 'Gandhinagar', 'Gujarat', 'West', false, ARRAY['SAI Western Training Centre Gandhinagar']::text[]),
  ('gorakhpur', 'Gorakhpur', 'Uttar Pradesh', 'North', false, ARRAY['Regional Sports Stadium Gorakhpur']::text[]),
  ('guna', 'Guna', 'Madhya Pradesh', 'Central', false, ARRAY['Sanjay Stadium Guna']::text[]),
  ('guwahati', 'Guwahati', 'Assam', 'North-East', false, ARRAY['Indira Gandhi Athletic Stadium', 'Barsapara Cricket Stadium', 'Sarusajai Sports Complex']::text[]),
  ('gwalior', 'Gwalior', 'Madhya Pradesh', 'Central', false, ARRAY['Captain Roop Singh Stadium', 'LNIPE Sports Complex']::text[]),
  ('indore', 'Indore', 'Madhya Pradesh', 'Central', false, ARRAY['Holkar Stadium', 'Nehru Stadium Indore', 'Abhay Prashal Indoor Stadium']::text[]),
  ('itanagar', 'Itanagar', 'Arunachal Pradesh', 'North-East', false, ARRAY['Rajiv Gandhi Stadium', 'Yupia Cricket Ground']::text[]),
  ('jammu', 'Jammu', 'Jammu & Kashmir', 'North', false, ARRAY['M.A. Stadium Jammu', 'Green Play Field Gandhi Nagar']::text[]),
  ('kanpur', 'Kanpur', 'Uttar Pradesh', 'North', false, ARRAY['Green Park Stadium', 'Palika Stadium']::text[]),
  ('kotagiri', 'Kotagiri', 'Tamil Nadu', 'South', false, ARRAY['Nilgiris District Sports Complex']::text[]),
  ('ludhiana', 'Ludhiana', 'Punjab', 'North', false, ARRAY['Guru Nanak Stadium', 'PAU Sports Complex']::text[]),
  ('mandrem', 'Mandrem', 'Goa', 'West', false, ARRAY['Goa State Shooting Range Mandrem', 'Peddem Sports Complex']::text[]),
  ('mandsaur', 'Mandsaur', 'Madhya Pradesh', 'Central', false, ARRAY['Khel Parisar Mandsaur']::text[]),
  ('mehalpur', 'Mehalpur', 'Punjab', 'North', false, ARRAY['Jarnail Singh Memorial Football Stadium Mahilpur']::text[]),
  ('namchi', 'Namchi', 'Sikkim', 'North-East', false, ARRAY['Bhaichung Stadium Namchi']::text[]),
  ('narshinghpur', 'Narshinghpur', 'Madhya Pradesh', 'Central', false, ARRAY['Narshinghpur District Sports Ground']::text[]),
  ('north-and-middle-andaman', 'North and Middle Andaman', 'Andaman & Nicobar Islands', 'Islands', false, ARRAY['Netaji Stadium Mayabunder', 'GSSS Baratang Grounds']::text[]),
  ('raipur', 'Raipur', 'Chhattisgarh', 'Central', false, ARRAY['Shaheed Veer Narayan Singh Stadium', 'Sardar Vallabhbhai Patel International Hockey Stadium']::text[]),
  ('raisen', 'Raisen', 'Madhya Pradesh', 'Central', false, ARRAY['Raisen District Sports Complex']::text[]),
  ('sagar', 'Sagar', 'Madhya Pradesh', 'Central', false, ARRAY['Pt. Ravishankar Shukla Stadium Sagar']::text[]),
  ('satna', 'Satna', 'Madhya Pradesh', 'Central', false, ARRAY['Satna District Sports Stadium']::text[]),
  ('sehore', 'Sehore', 'Madhya Pradesh', 'Central', false, ARRAY['Church Ground Sehore', 'Bhopal Naka Sports Complex']::text[]),
  ('shirdi-ahilyanagar', 'Shirdi-Ahilyanagar', 'Maharashtra', 'West', false, ARRAY['Shirdi Sai Sansthan Sports Complex']::text[]),
  ('shivpuri', 'Shivpuri', 'Madhya Pradesh', 'Central', false, ARRAY['Madhav Rao Scindia Sports Complex Shivpuri']::text[]),
  ('sikar', 'Sikar', 'Rajasthan', 'North', false, ARRAY['District Sports Stadium Sikar']::text[]),
  ('sri-vijaya-puram', 'Sri Vijaya Puram', 'Andaman & Nicobar Islands', 'Islands', false, ARRAY['Netaji Subhash Chandra Bose Stadium Port Blair', 'SAI STC Centre']::text[]),
  ('srinagar', 'Srinagar', 'Jammu & Kashmir', 'North', false, ARRAY['Bakshi Stadium', 'TRC Turf Ground', 'Sher-i-Kashmir Stadium']::text[]),
  ('sundargarh', 'Sundargarh', 'Odisha', 'East', false, ARRAY['Birsa Munda International Hockey Stadium Rourkela', 'SAI Training Centre Sundargarh']::text[])
on conflict (slug) do update set
  name = excluded.name,
  state = excluded.state,
  zone = excluded.zone,
  is_metro = excluded.is_metro,
  venues = excluded.venues,
  updated_at = now();

commit;
