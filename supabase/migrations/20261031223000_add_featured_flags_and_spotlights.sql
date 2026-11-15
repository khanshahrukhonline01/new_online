-- ==============================================================================
-- Migration: 20261031223000_add_featured_flags_and_spotlights.sql
-- Description: Add is_featured boolean flag and spotlight indexes to
-- opportunities, academies, and venues for dynamic homepage rails.
-- ==============================================================================

begin;

alter table public.opportunities
  add column if not exists is_featured boolean not null default false;

alter table public.academies
  add column if not exists is_featured boolean not null default false;

alter table public.venues
  add column if not exists is_featured boolean not null default false;

create index if not exists idx_opportunities_featured_starts
  on public.opportunities(is_featured desc, starts_at asc);

create index if not exists idx_academies_featured_name
  on public.academies(is_featured desc, name asc);

create index if not exists idx_venues_featured_name
  on public.venues(is_featured desc, name asc);

commit;
