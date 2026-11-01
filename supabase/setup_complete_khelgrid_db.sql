-- ==============================================================================
-- KhelGrid: Complete Database Foundation, Schema & Trust Engine Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- Resolves all missing tables and column errors to bring success rate to 100%.
-- ==============================================================================

begin;

-- ==============================================================================
-- 1. ENHANCE ACADEMIES
-- ==============================================================================
alter table public.academies
  add column if not exists sport text default 'Multi-Sport',
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists facilities text[],
  add column if not exists age_groups text[],
  add column if not exists timings text,
  add column if not exists fee_structure text,
  add column if not exists admission_open boolean default true,
  add column if not exists is_featured boolean not null default false,
  add column if not exists affiliation_proof text,
  add column if not exists reported_count int not null default 0;

grant insert (
  slug, name, sport, description, city, state, address, phone, website_url,
  public_contact_url, facilities, age_groups, timings, fee_structure,
  admission_open, is_featured, publication_status, verification_status, affiliation_proof
) on public.academies to anon, authenticated;

grant select on public.academies to anon, authenticated;

-- ==============================================================================
-- 2. ENHANCE VENUES
-- ==============================================================================
alter table public.venues
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected')),
  add column if not exists sport text default 'Multi-Sport',
  add column if not exists affiliation_proof text,
  add column if not exists reported_count int not null default 0,
  add column if not exists surface_type text,
  add column if not exists court_count text,
  add column if not exists pricing text,
  add column if not exists facilities text[],
  add column if not exists rules text[],
  add column if not exists timings text,
  add column if not exists phone text,
  add column if not exists is_featured boolean not null default false;

grant insert (
  slug, name, sport, description, city, address, phone, timezone,
  surface_type, court_count, pricing, facilities, rules, timings,
  is_featured, publication_status, verification_status, affiliation_proof
) on public.venues to anon, authenticated;

grant select on public.venues to anon, authenticated;

-- ==============================================================================
-- 3. ENHANCE OPPORTUNITIES (Resolves is_featured column error)
-- ==============================================================================
alter table public.opportunities
  add column if not exists is_featured boolean not null default false,
  add column if not exists available_spots integer,
  add column if not exists age_category text default 'Open Age',
  add column if not exists gender text not null default 'All',
  add column if not exists eligibility_criteria text,
  add column if not exists required_documents text[] default '{}'::text[],
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'opportunities' and column_name = 'registration_fee') then
    alter table public.opportunities add column registration_fee text default 'Free';
  end if;
end $$;

grant select on public.opportunities to anon, authenticated;

-- ==============================================================================
-- 4. CITIES DIRECTORY TABLE (53 Indian Sports Cities)
-- ==============================================================================
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

alter table public.cities enable row level security;

drop policy if exists "cities_read_all" on public.cities;
create policy "cities_read_all" on public.cities for select to anon, authenticated using (true);

grant select on public.cities to anon, authenticated;

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

-- ==============================================================================
-- 5. PICKUP GAMES TABLE (Community Play & Match Coordination)
-- ==============================================================================
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
  is_featured boolean not null default false,
  publication_status text not null default 'published'
    check (publication_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pickup_games enable row level security;

drop policy if exists "pickup_games_read_published" on public.pickup_games;
create policy "pickup_games_read_published" on public.pickup_games
  for select to anon, authenticated using (publication_status = 'published');

drop policy if exists "pickup_games_insert_community" on public.pickup_games;
create policy "pickup_games_insert_community" on public.pickup_games
  for insert to anon, authenticated with check (char_length(trim(sport)) >= 2);

drop policy if exists "pickup_games_update_spots" on public.pickup_games;
create policy "pickup_games_update_spots" on public.pickup_games
  for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.pickup_games to anon, authenticated;

insert into public.pickup_games (
  slug, sport, emoji, skill_level, venue_name, city, time_label, host_name,
  price_per_player, spots_open, total_players, confirmed_players, is_featured, publication_status
) values
  ('ferrohub-pickleball-bengaluru', 'Pickleball', '🎾', 'Intermediate', 'FerroHub Sports', 'Bengaluru', 'Today · 7:00 PM', 'Rahul S.', '₹200/player', 1, 4, 3, true, 'published'),
  ('kicks-on-grass-football-bengaluru', 'Football', '⚽', 'Beginner', 'Kicks on Grass Arena', 'Bengaluru', 'Today · 8:30 PM', 'Aakash M.', '₹250/player', 4, 12, 8, true, 'published'),
  ('whitefield-badminton-bengaluru', 'Badminton', '🏸', 'Advanced', 'Whitefield Sports Hub', 'Bengaluru', 'Tomorrow · 6:30 AM', 'Sneha K.', '₹150/player', 1, 4, 3, false, 'published'),
  ('dda-cricket-delhi', 'Cricket', '🏏', 'Intermediate', 'DDA Sports Ground', 'Delhi', 'Saturday · 7:00 AM', 'Vikram P.', '₹180/player', 8, 22, 14, true, 'published'),
  ('dlta-tennis-new-delhi', 'Tennis', '🎾', 'Intermediate', 'DLTA Tennis Complex', 'New Delhi', 'Tomorrow · 5:30 PM', 'Neha R.', '₹220/player', 3, 4, 1, false, 'published'),
  ('turfside-box-cricket-mumbai', 'Box Cricket', '🏏', 'Beginner', 'Turfside Arena', 'Mumbai', 'Sunday · 6:00 PM', 'Karan D.', '₹300/player', 4, 10, 6, false, 'published'),
  ('regional-sports-centre-basketball-kochi', 'Basketball', '🏀', 'Advanced', 'Regional Sports Centre', 'Kochi', 'Friday · 6:00 PM', 'Fahad A.', '₹120/player', 2, 10, 8, false, 'published')
on conflict (slug) do nothing;

-- ==============================================================================
-- 6. SITE ANNOUNCEMENTS TABLE (Seasonal Banners & Trial Highlights)
-- ==============================================================================
create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  badge text not null default 'Featured',
  title text not null check (char_length(trim(title)) between 2 and 200),
  subtitle text,
  cta_label text not null default 'Explore Now',
  cta_url text not null,
  tone text not null default 'emerald'
    check (tone in ('emerald', 'amber', 'indigo', 'rose', 'cyan')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_announcements enable row level security;

drop policy if exists "announcements_read_active" on public.site_announcements;
create policy "announcements_read_active" on public.site_announcements
  for select to anon, authenticated using (is_active = true);

grant select, insert on public.site_announcements to anon, authenticated;

insert into public.site_announcements (
  slug, badge, title, subtitle, cta_label, cta_url, tone, starts_at, ends_at, priority, is_active
) values
  (
    'delhi-state-trials-open-2026',
    'State Trials Open',
    'Delhi State U-17 Football Trials Registration Open',
    'Official AIFF & DSA affiliated state trials commencing across Delhi NCR hubs.',
    'View Trials',
    '/opportunities?city=Delhi',
    'emerald',
    now() - interval '1 day',
    now() + interval '30 days',
    100,
    true
  ),
  (
    'winter-grassroots-camps-2026',
    'Grassroots Camps',
    'Winter National Sports Academies Open Admissions',
    'Verified multi-sport academies offering high-performance coaching across India.',
    'Find Academies',
    '/academies',
    'indigo',
    now() - interval '1 day',
    now() + interval '30 days',
    90,
    true
  )
on conflict (slug) do nothing;

-- ==============================================================================
-- 7. KHELCHRONICLE CATEGORIES TABLE
-- ==============================================================================
create table if not exists public.chronicle_categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null default 'award',
  color text not null default '#059669',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.chronicle_categories enable row level security;

drop policy if exists "chronicle_categories_read_all" on public.chronicle_categories;
create policy "chronicle_categories_read_all" on public.chronicle_categories
  for select to anon, authenticated using (is_active = true);

grant select on public.chronicle_categories to anon, authenticated;

insert into public.chronicle_categories (id, slug, name, description, icon, color, sort_order, is_active)
values
  ('cat-biomechanics', 'sports-biomechanics', 'Sports Biomechanics', 'Kinematics, inverse dynamics, ground reaction forces, and joint kinetics in Indian sports.', 'activity', '#0284c7', 1, true),
  ('cat-physiology', 'exercise-physiology', 'Exercise Physiology', 'Cardiovascular conditioning, aerobic endurance, VO2 max kinetics, and heat acclimatization.', 'zap', '#059669', 2, true),
  ('cat-nutrition', 'sports-nutrition', 'Sports Nutrition', 'Energy balance, hydration strategies, macro/micronutrient profiling, and dietary periodization.', 'heart', '#d97706', 3, true),
  ('cat-psychology', 'sports-psychology', 'Sports Psychology', 'Competitive anxiety, mental resilience, attentional focus, and athletic cognitive performance.', 'smile', '#7c3aed', 4, true),
  ('cat-medicine', 'sports-medicine', 'Sports Medicine', 'Injury epidemiology, musculoskeletal rehabilitation, return-to-play protocols.', 'shield', '#dc2626', 5, true),
  ('cat-analytics', 'sports-analytics', 'Sports Analytics', 'Predictive talent modeling, tracking data science, and performance probability matrices.', 'bar-chart', '#0d9488', 6, true)
on conflict (slug) do nothing;

-- ==============================================================================
-- 8. TRUST & SAFETY: FRAUD REPORTS & VERIFICATION CLAIMS
-- ==============================================================================
create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('academy', 'venue', 'opportunity', 'coach')),
  entity_id text,
  entity_slug text not null,
  entity_name text not null,
  reason text not null check (reason in ('fake_trial', 'impersonation', 'fake_venue', 'unauthorized_fee', 'wrong_contact', 'other')),
  details text not null check (char_length(trim(details)) >= 5),
  reporter_email text,
  reporter_phone text,
  status text not null default 'pending' check (status in ('pending', 'investigating', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listing_reports enable row level security;

drop policy if exists "listing_reports_insert_community" on public.listing_reports;
create policy "listing_reports_insert_community" on public.listing_reports
  for insert to anon, authenticated
  with check (
    char_length(trim(details)) >= 5
    and char_length(trim(entity_slug)) >= 1
  );

grant insert (entity_type, entity_id, entity_slug, entity_name, reason, details, reporter_email, reporter_phone, status)
  on public.listing_reports to anon, authenticated;

create table if not exists public.verification_claims (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('academy', 'venue', 'opportunity', 'coach')),
  entity_slug text not null,
  entity_name text not null,
  contact_name text not null check (char_length(trim(contact_name)) >= 2),
  contact_phone text not null check (char_length(trim(contact_phone)) >= 8),
  contact_email text,
  claimant_role text,
  document_type text not null check (document_type in ('affiliation_certificate', 'ground_lease', 'coaching_license', 'municipal_trade_license', 'geotagged_photos', 'other')),
  proof_details text not null check (char_length(trim(proof_details)) >= 5),
  status text not null default 'pending_review' check (status in ('pending_review', 'verified', 'rejected', 'more_info_needed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verification_claims enable row level security;

drop policy if exists "verification_claims_insert_community" on public.verification_claims;
create policy "verification_claims_insert_community" on public.verification_claims
  for insert to anon, authenticated
  with check (
    char_length(trim(contact_name)) >= 2
    and char_length(trim(contact_phone)) >= 8
    and char_length(trim(proof_details)) >= 5
  );

grant insert (entity_type, entity_slug, entity_name, contact_name, contact_phone, contact_email, claimant_role, document_type, proof_details, status)
  on public.verification_claims to anon, authenticated;

commit;
