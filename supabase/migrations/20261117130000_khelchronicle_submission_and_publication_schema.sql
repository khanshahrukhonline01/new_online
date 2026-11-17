-- KhelGrid: complete Chronicle submission and publication records.
-- Additive only: preserve every existing submission and seeded paper row.

BEGIN;

-- Submission intake metadata. Existing rows retain their original values;
-- newly added consent flags default false and must be explicitly supplied.
ALTER TABLE public.chronicle_submissions
  ADD COLUMN IF NOT EXISTS submission_id text,
  ADD COLUMN IF NOT EXISTS article_type text,
  ADD COLUMN IF NOT EXISTS orcid text,
  ADD COLUMN IF NOT EXISTS co_authors text,
  ADD COLUMN IF NOT EXISTS keywords text,
  ADD COLUMN IF NOT EXISTS full_text_or_url text,
  ADD COLUMN IF NOT EXISTS supplementary_url text,
  ADD COLUMN IF NOT EXISTS data_availability text,
  ADD COLUMN IF NOT EXISTS ethics_clearance_number text,
  ADD COLUMN IF NOT EXISTS human_ethics_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS minor_consent_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_type text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS review_notes text;

CREATE UNIQUE INDEX IF NOT EXISTS chronicle_submissions_submission_id_uidx
  ON public.chronicle_submissions (submission_id)
  WHERE submission_id IS NOT NULL;

-- A browser submission must contain the required consent declarations, a
-- secure HTTPS full-text link, an explicit supported licence and a pending
-- status. The table remains write-only to public roles.
ALTER POLICY chronicle_submissions_public_insert
  ON public.chronicle_submissions
  WITH CHECK (
    status = 'pending_review'
    AND submission_id IS NOT NULL
    AND full_text_or_url IS NOT NULL
    AND full_text_or_url LIKE 'https://%'
    AND human_ethics_confirmed IS TRUE
    AND minor_consent_confirmed IS TRUE
    AND license_type IN ('cc-by-4.0', 'cc-by-nc-nd-4.0')
  );

-- Editorial review is restricted to the KhelGrid administrator role.
CREATE POLICY chronicle_submissions_admin_read
  ON public.chronicle_submissions
  FOR SELECT TO authenticated
  USING (public.is_pickup_game_admin());

CREATE POLICY chronicle_submissions_admin_update
  ON public.chronicle_submissions
  FOR UPDATE TO authenticated
  USING (public.is_pickup_game_admin())
  WITH CHECK (public.is_pickup_game_admin());

GRANT SELECT, UPDATE ON public.chronicle_submissions TO authenticated;

-- Expand the manuscript record so publication pages are generated from
-- reviewed database content rather than local demonstration fixtures.
ALTER TABLE public.chronicle_papers
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS sport text,
  ADD COLUMN IF NOT EXISTS sport_slug text,
  ADD COLUMN IF NOT EXISTS authors jsonb,
  ADD COLUMN IF NOT EXISTS date_modified date,
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS license text,
  ADD COLUMN IF NOT EXISTS abstract jsonb,
  ADD COLUMN IF NOT EXISTS keywords text[],
  ADD COLUMN IF NOT EXISTS downloads_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS citations_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sections jsonb,
  ADD COLUMN IF NOT EXISTS ethics_statement text,
  ADD COLUMN IF NOT EXISTS data_availability text,
  ADD COLUMN IF NOT EXISTS funding_statement text,
  ADD COLUMN IF NOT EXISTS conflicts_of_interest text,
  ADD COLUMN IF NOT EXISTS references jsonb,
  ADD COLUMN IF NOT EXISTS connected_links jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS review_notes text;

-- Administrators can inspect pending manuscripts and create/update records.
-- Public and authenticated non-admin readers remain limited to published rows.
CREATE POLICY chronicle_papers_admin_read
  ON public.chronicle_papers
  FOR SELECT TO authenticated
  USING (public.is_pickup_game_admin());

CREATE POLICY chronicle_papers_admin_insert
  ON public.chronicle_papers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_pickup_game_admin());

CREATE POLICY chronicle_papers_admin_update
  ON public.chronicle_papers
  FOR UPDATE TO authenticated
  USING (public.is_pickup_game_admin())
  WITH CHECK (public.is_pickup_game_admin());

GRANT SELECT, INSERT, UPDATE ON public.chronicle_papers TO authenticated;

COMMIT;
