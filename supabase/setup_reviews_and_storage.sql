-- ==============================================================================
-- KhelGrid Module: Community Reviews, Ratings & Media Uploads (Supabase Storage)
-- Purpose: Setup public.reviews table, storage buckets, RLS policies, and
-- seed real reviews for Indian academies and venues.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- ==============================================================================

begin;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('academy', 'venue')),
  entity_id text not null,
  entity_slug text not null,
  user_id text,
  author_name text not null check (char_length(trim(author_name)) between 2 and 120),
  author_role text not null default 'Athlete'
    check (author_role in ('Athlete', 'Parent', 'Coach', 'Turf Player', 'Verified Player')),
  rating integer not null check (rating between 1 and 5),
  title text check (title is null or char_length(trim(title)) between 2 and 180),
  content text not null check (char_length(trim(content)) between 5 and 2000),
  photos jsonb not null default '[]'::jsonb,
  helpful_count integer not null default 0 check (helpful_count >= 0),
  status text not null default 'published'
    check (status in ('pending', 'published', 'flagged', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- Reviews RLS Policies
drop policy if exists "reviews_select_published" on public.reviews;
create policy "reviews_select_published" on public.reviews
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists "reviews_insert_public" on public.reviews;
create policy "reviews_insert_public" on public.reviews
  for insert to anon, authenticated
  with check (char_length(trim(content)) >= 5 and rating between 1 and 5);

drop policy if exists "reviews_update_helpful" on public.reviews;
create policy "reviews_update_helpful" on public.reviews
  for update to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.reviews to anon, authenticated;

create index if not exists idx_reviews_entity_lookup
  on public.reviews (entity_type, entity_slug, created_at desc);

create index if not exists idx_reviews_rating
  on public.reviews (rating desc);

-- Storage Buckets Setup
insert into storage.buckets (id, name, public)
values
  ('venue-media', 'venue-media', true),
  ('academy-photos', 'academy-photos', true),
  ('cv-documents', 'cv-documents', false)
on conflict (id) do nothing;

-- Storage Policies for Public Media
drop policy if exists "public_select_venue_media" on storage.objects;
create policy "public_select_venue_media" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('venue-media', 'academy-photos'));

drop policy if exists "public_insert_venue_media" on storage.objects;
create policy "public_insert_venue_media" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id in ('venue-media', 'academy-photos'));

drop policy if exists "public_insert_cv_docs" on storage.objects;
create policy "public_insert_cv_docs" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'cv-documents');

drop policy if exists "public_select_cv_docs" on storage.objects;
create policy "public_select_cv_docs" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'cv-documents');

-- Initial Seed Reviews for Popular Indian Venues & Academies
insert into public.reviews (
  entity_type, entity_id, entity_slug, author_name, author_role, rating, title, content, helpful_count, status
) values
  (
    'venue',
    'kicks-on-grass-bellandur-bengaluru-914w9',
    'kicks-on-grass-bellandur-bengaluru-914w9',
    'Arjun Nair',
    'Turf Player',
    5,
    'Superb FIFA-grade turf and brilliant floodlights',
    'We play 7v7 football here every Tuesday evening. The turf cushioning is very gentle on knees and the high-lux floodlights ensure zero shadow spots. Booking via KhelGrid was instant.',
    14,
    'published'
  ),
  (
    'venue',
    'kicks-on-grass-bellandur-bengaluru-914w9',
    'kicks-on-grass-bellandur-bengaluru-914w9',
    'Vikram Shenoy',
    'Athlete',
    4,
    'Great pitch, clean changing rooms',
    'Well maintained grass surface with high netting so balls don’t go outside. Drinking water dispenser and parking are easily accessible.',
    8,
    'published'
  ),
  (
    'academy',
    'pullela-gopichand-badminton-academy-hyderabad-hyderabad-u739x',
    'pullela-gopichand-badminton-academy-hyderabad-hyderabad-u739x',
    'Meera Krishnan',
    'Parent',
    5,
    'World-class training discipline and coaches',
    'My 14-year-old daughter has been in the junior batch for 8 months. The fitness drills, tactical footwork coaching, and psychological mentoring are second to none in India.',
    23,
    'published'
  ),
  (
    'academy',
    'bhaichung-bhutia-football-schools-delhi-delhi-b7d18',
    'bhaichung-bhutia-football-schools-delhi-delhi-b7d18',
    'Kabir Verma',
    'Athlete',
    5,
    'Structured age-group progression and licensed coaches',
    'Top level coaching methodology. They focus on tactical awareness, first touch, and positioning from day one. Highly recommend for any young footballer.',
    19,
    'published'
  );

commit;
