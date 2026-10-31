-- ==============================================================================
-- Migration: Add Rich Fields & Metadata to Opportunities Table
-- Enhances opportunity discovery with registration fee, spots, age category,
-- gender, eligibility criteria, required documents checklist, and JSONB metadata.
-- ==============================================================================

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS registration_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_spots integer,
  ADD COLUMN IF NOT EXISTS age_category text,
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS eligibility_criteria text,
  ADD COLUMN IF NOT EXISTS required_documents text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Helpful index for search & discovery filters
CREATE INDEX IF NOT EXISTS idx_opportunities_search_filters 
  ON public.opportunities(starts_at ASC, registration_fee, verification_status, city);

-- Index for full-text search on title and organizer
CREATE INDEX IF NOT EXISTS idx_opportunities_title_organizer 
  ON public.opportunities USING gin (to_tsvector('english', title || ' ' || coalesce(organizer_name, '') || ' ' || coalesce(city, '')));
