\set ON_ERROR_STOP on

CREATE TABLE public.chronicle_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  author_name text NOT NULL,
  author_affiliation text NOT NULL,
  date_published date,
  summary text NOT NULL,
  publication_status text NOT NULL DEFAULT 'published'
);
ALTER TABLE public.chronicle_papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY chronicle_papers_public_read
  ON public.chronicle_papers
  FOR SELECT TO anon, authenticated
  USING (publication_status = 'published');
GRANT SELECT ON public.chronicle_papers TO anon, authenticated;

INSERT INTO public.chronicle_papers (paper_id, slug, title, category, author_name, author_affiliation, summary)
VALUES
 ('KG-2026-001','kinematic-correlates-lumbar-spine-stress-fast-bowlers','Seed 1','sports-biomechanics','Seed Author 1','Seed Affiliation','Seed summary'),
 ('KG-2026-002','normative-fitness-percentiles-grassroots-athletes-india','Seed 2','exercise-physiology','Seed Author 2','Seed Affiliation','Seed summary'),
 ('KG-2026-004','predictive-talent-identification-models-domestic-cricket','Seed 3','sports-analytics','Seed Author 3','Seed Affiliation','Seed summary');

\ir ../../supabase/migrations/20261117123000_khelchronicle_seed_publication_gate.sql

DO $$
BEGIN
  IF (SELECT count(*) FROM public.chronicle_papers) <> 3 THEN
    RAISE EXCEPTION 'Chronicle seed rows were removed or changed unexpectedly';
  END IF;
  IF (SELECT count(*) FROM public.chronicle_papers WHERE publication_status='pending_review') <> 3 THEN
    RAISE EXCEPTION 'Chronicle seed rows are not all pending review';
  END IF;
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='chronicle_papers'
        AND column_name='publication_status') NOT LIKE '%pending_review%' THEN
    RAISE EXCEPTION 'new Chronicle papers do not default to pending_review';
  END IF;
END
$$;

SET ROLE anon;
SELECT count(*) = 0 AS anonymous_cannot_read_seeded_papers
FROM public.chronicle_papers;
\gset
\if :anonymous_cannot_read_seeded_papers
  \echo 'PASS: anonymous readers cannot see seeded Chronicle examples'
\else
  \echo 'FAIL: seeded Chronicle examples remain public'
  \quit 1
\endif
RESET ROLE;
