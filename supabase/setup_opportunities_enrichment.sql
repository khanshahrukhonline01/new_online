-- ==============================================================================
-- KhelGrid Module: Opportunities Enrichment & Featured Flags
-- Purpose: Adds rich selection criteria, age categories, fee indicators,
-- document checklists, and featured ranking flags to public.opportunities.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/hznsbxvovjxvmnchzzqt/sql
-- ==============================================================================

begin;

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
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'opportunities' and column_name = 'registration_fee'
  ) then
    alter table public.opportunities add column registration_fee text default 'Free';
  end if;
end $$;

create index if not exists idx_opportunities_featured_starts
  on public.opportunities (is_featured desc nulls last, starts_at asc nulls last);

grant select on public.opportunities to anon, authenticated;

commit;
