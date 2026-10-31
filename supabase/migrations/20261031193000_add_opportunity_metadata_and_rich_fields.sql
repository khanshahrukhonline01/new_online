-- ==============================================================================
-- Migration: 20261031193000_add_opportunity_metadata_and_rich_fields.sql
-- Description: Add rich fields and metadata to opportunities table
-- Enhances opportunity discovery with registration fee, spots, age category,
-- gender, eligibility criteria, required documents checklist, and JSONB metadata.
-- ==============================================================================

begin;

alter table public.opportunities
  add column if not exists registration_fee integer not null default 0,
  add column if not exists available_spots integer,
  add column if not exists age_category text,
  add column if not exists gender text not null default 'open',
  add column if not exists eligibility_criteria text,
  add column if not exists required_documents text[] default '{}'::text[],
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Helpful index for search & discovery filters
create index if not exists idx_opportunities_search_filters 
  on public.opportunities(starts_at asc, registration_fee, verification_status, city);

commit;
