-- ==============================================================================
-- KhelGrid Module: Community Intake Direct Listings RLS Policies
-- Purpose: Grants anonymous and authenticated visitors permission to submit
-- community sports academies and venues with moderation queue status.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- ==============================================================================

begin;

-- 1. Academies community intake
drop policy if exists "academies_insert_community" on public.academies;
create policy "academies_insert_community" on public.academies
  for insert to anon, authenticated
  with check (
    char_length(trim(name)) >= 2
    and char_length(trim(city)) >= 1
  );

grant insert (slug, name, description, city, state, website_url, public_contact_url, publication_status, verification_status)
  on public.academies to anon, authenticated;

-- 2. Venues community intake
drop policy if exists "venues_insert_community" on public.venues;
create policy "venues_insert_community" on public.venues
  for insert to anon, authenticated
  with check (
    char_length(trim(name)) >= 1
    and char_length(trim(city)) >= 1
  );

grant insert (slug, name, description, city, address, timezone, publication_status)
  on public.venues to anon, authenticated;

-- 3. Opportunities community intake
drop policy if exists "opportunities_insert_community" on public.opportunities;
create policy "opportunities_insert_community" on public.opportunities
  for insert to anon, authenticated
  with check (
    char_length(trim(title)) >= 1
    and opportunity_type in ('trial', 'combine', 'scholarship', 'camp', 'job', 'other')
  );

grant insert (slug, title, opportunity_type, organizer_name, city, venue_name, starts_at, ends_at, application_deadline, source_url, source_name, publication_status, verification_status)
  on public.opportunities to anon, authenticated;

commit;
