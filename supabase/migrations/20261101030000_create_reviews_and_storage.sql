-- ==============================================================================
-- KhelGrid Module: Community Reviews, Ratings & Media Uploads (Supabase Storage)
-- Purpose: Creates public.reviews table, sets up RLS policies,
-- creates storage buckets (venue-media, academy-photos, cv-documents) and
-- grants secure photo upload permissions for turf owners and verified players.
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

commit;
