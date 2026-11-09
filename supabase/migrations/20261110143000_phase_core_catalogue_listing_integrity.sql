-- Core catalogue and listing integrity hardening.
-- Public users may submit a private suggestion, but may never write catalogue rows.
-- All community listing categories enter listing_submissions for moderator review.
begin;

-- A source link is strongly encouraged but cannot be invented for a community submitter.
alter table public.listing_submissions
  alter column source_url drop not null;

alter table public.listing_submissions
  drop constraint if exists listing_submissions_listing_type_check;
alter table public.listing_submissions
  add constraint listing_submissions_listing_type_check
  check (listing_type in ('opportunity', 'venue', 'coach', 'academy', 'event', 'pickup_game'));

-- Restore the deliberately narrow column-level INSERT grant for the public queue.
revoke all on public.listing_submissions from public, anon, authenticated;
grant insert (listing_type, title, city, source_url, details)
  on public.listing_submissions to anon, authenticated;
grant select on public.listing_submissions to authenticated;
grant update (status, moderator_notes, reviewed_at, reviewed_by)
  on public.listing_submissions to authenticated;

-- Catalogue records are curated/published by trusted staff only.
-- Remove broad community INSERT policies and direct public DML privileges.
drop policy if exists academies_insert_community on public.academies;
drop policy if exists venues_insert_community on public.venues;
drop policy if exists opportunities_insert_community on public.opportunities;
drop policy if exists pickup_games_insert_community on public.pickup_games;

revoke insert, update, delete on public.academies from public, anon, authenticated;
revoke insert, update, delete on public.venues from public, anon, authenticated;
revoke insert, update, delete on public.opportunities from public, anon, authenticated;
revoke insert, update, delete on public.pickup_games from public, anon, authenticated;

-- Trusted server-side catalogue publication remains available to service_role.
grant insert, update, delete on public.academies, public.venues, public.opportunities, public.pickup_games to service_role;

-- The queue's existing RLS policies and transition trigger continue to enforce
-- pending-only public submissions and allowlisted moderator review.
commit;
