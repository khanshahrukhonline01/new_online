\set ON_ERROR_STOP on

DROP TABLE IF EXISTS public.chronicle_submissions CASCADE;

CREATE TABLE public.chronicle_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  author_name text NOT NULL,
  author_email text NOT NULL,
  affiliation text NOT NULL,
  abstract text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chronicle_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY chronicle_submissions_public_insert
  ON public.chronicle_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending_review');
GRANT INSERT ON public.chronicle_submissions TO anon, authenticated;

INSERT INTO public.chronicle_submissions (title, category, author_name, author_email, affiliation, abstract)
VALUES ('Existing pending submission', 'sports-biomechanics', 'Existing Author', 'existing@example.test',
        'Existing Institute', 'Existing abstract preserved during additive schema migration.');

\ir ../../supabase/migrations/20261117130000_khelchronicle_submission_and_publication_schema.sql
\ir ../../supabase/migrations/20261117140000_khelchronicle_intake_validation.sql

DO $$
DECLARE
  submission_count integer;
  missing_columns integer;
  insert_check text;
BEGIN
  SELECT count(*) INTO submission_count FROM public.chronicle_submissions;
  IF submission_count <> 1 THEN
    RAISE EXCEPTION 'Existing Chronicle submission row was not preserved';
  END IF;

  SELECT count(*) INTO missing_columns
  FROM (VALUES
    ('submission_id'),('article_type'),('orcid'),('co_authors'),('keywords'),
    ('full_text_or_url'),('supplementary_url'),('data_availability'),
    ('ethics_clearance_number'),('human_ethics_confirmed'),('minor_consent_confirmed'),
    ('license_type'),('license_confirmed'),('updated_at'),('reviewed_at'),('reviewed_by'),('review_notes')
  ) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name='chronicle_submissions'
      AND c.column_name=required.column_name
  );
  IF missing_columns <> 0 THEN
    RAISE EXCEPTION 'Chronicle submission schema is missing % required columns', missing_columns;
  END IF;

  SELECT with_check INTO insert_check
  FROM pg_policies
  WHERE schemaname='public' AND tablename='chronicle_submissions'
    AND policyname='chronicle_submissions_public_insert';
  IF insert_check IS NULL
     OR position('human_ethics_confirmed' in insert_check)=0
     OR position('minor_consent_confirmed' in insert_check)=0
     OR position('full_text_or_url' in insert_check)=0
     OR position('license_type' in insert_check)=0
     OR position('license_confirmed' in insert_check)=0 THEN
    RAISE EXCEPTION 'Public Chronicle intake policy does not enforce required fields';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='chronicle_submissions'
      AND policyname='chronicle_submissions_admin_read' AND cmd='SELECT'
  ) THEN
    RAISE EXCEPTION 'Chronicle admin read policy is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='chronicle_submissions'
      AND policyname='chronicle_submissions_admin_update' AND cmd='UPDATE'
  ) THEN
    RAISE EXCEPTION 'Chronicle admin update policy is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='chronicle_papers'
      AND policyname='chronicle_papers_admin_insert' AND cmd='INSERT'
  ) THEN
    RAISE EXCEPTION 'Chronicle admin paper publication policy is missing';
  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.chronicle_submissions'::regclass
      AND tgname='chronicle_submission_review_guard' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Chronicle submission approval guard trigger is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.chronicle_papers'::regclass
      AND tgname='chronicle_paper_publication_guard' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Chronicle paper publication guard trigger is missing';
  END IF;

  IF NOT has_table_privilege('anon','public.chronicle_submissions','INSERT')
     OR has_table_privilege('anon','public.chronicle_submissions','SELECT') THEN
    RAISE EXCEPTION 'Public submission role grants are too broad or too restrictive';
  END IF;

  IF NOT has_table_privilege('authenticated','public.chronicle_submissions','SELECT')
     OR NOT has_table_privilege('authenticated','public.chronicle_submissions','UPDATE') THEN
    RAISE EXCEPTION 'Authenticated admin role lacks Chronicle moderation grants';
  END IF;
END
$$;


DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    UPDATE public.chronicle_submissions
    SET status='approved'
    WHERE title='Existing pending submission';
  EXCEPTION WHEN OTHERS THEN
    IF position('cannot be approved' in SQLERRM) > 0 THEN
      denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Legacy Chronicle submission was approved without required evidence';
  END IF;

  denied := false;
  BEGIN
    UPDATE public.chronicle_papers
    SET publication_status='published'
    WHERE paper_id='KG-2026-001';
  EXCEPTION WHEN OTHERS THEN
    IF position('cannot be published' in SQLERRM) > 0 THEN
      denied := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Incomplete Chronicle paper was published';
  END IF;
END
$$;
