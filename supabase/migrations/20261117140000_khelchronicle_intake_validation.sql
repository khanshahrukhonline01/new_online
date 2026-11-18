-- KhelGrid: enforce Chronicle intake declarations at the database boundary.
-- No existing submissions are deleted or rewritten. Existing legacy rows remain
-- reviewable but cannot be approved until required evidence is present.

BEGIN;

ALTER TABLE public.chronicle_submissions
  ADD COLUMN IF NOT EXISTS license_confirmed boolean NOT NULL DEFAULT false;

ALTER POLICY chronicle_submissions_public_insert
  ON public.chronicle_submissions
  WITH CHECK (
    status = 'pending_review'
    AND submission_id IS NOT NULL
    AND article_type IN ('preprint', 'protocol', 'review', 'dataset', 'casestudy')
    AND full_text_or_url IS NOT NULL
    AND full_text_or_url LIKE 'https://%'
    AND (supplementary_url IS NULL OR supplementary_url LIKE 'https://%')
    AND data_availability IN ('open_access', 'upon_request', 'de_identified', 'restricted')
    AND ethics_clearance_number IS NOT NULL
    AND btrim(ethics_clearance_number) <> ''
    AND abstract IS NOT NULL
    AND length(btrim(abstract)) >= 50
    AND keywords IS NOT NULL
    AND btrim(keywords) <> ''
    AND human_ethics_confirmed IS TRUE
    AND minor_consent_confirmed IS TRUE
    AND license_type IN ('cc-by-4.0', 'cc-by-nc-nd-4.0')
    AND license_confirmed IS TRUE
  );

CREATE OR REPLACE FUNCTION public.validate_chronicle_submission_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NEW.submission_id IS NULL
       OR NEW.article_type IS NULL
       OR NEW.article_type NOT IN ('preprint', 'protocol', 'review', 'dataset', 'casestudy')
       OR NEW.full_text_or_url IS NULL
       OR NEW.full_text_or_url NOT LIKE 'https://%'
       OR (NEW.supplementary_url IS NOT NULL AND NEW.supplementary_url NOT LIKE 'https://%')
       OR NEW.data_availability IS NULL
       OR NEW.data_availability NOT IN ('open_access', 'upon_request', 'de_identified', 'restricted')
       OR NEW.ethics_clearance_number IS NULL
       OR btrim(NEW.ethics_clearance_number) = ''
       OR NEW.abstract IS NULL
       OR length(btrim(NEW.abstract)) < 50
       OR NEW.keywords IS NULL
       OR btrim(NEW.keywords) = ''
       OR NEW.human_ethics_confirmed IS NOT TRUE
       OR NEW.minor_consent_confirmed IS NOT TRUE
       OR NEW.license_type IS NULL
       OR NEW.license_type NOT IN ('cc-by-4.0', 'cc-by-nc-nd-4.0')
       OR NEW.license_confirmed IS NOT TRUE THEN
      RAISE EXCEPTION 'Chronicle submission cannot be approved until all manuscript, ethics, consent, and licence requirements are complete';
    END IF;
  END IF;

  IF NEW.status IN ('rejected', 'revision_requested') AND coalesce(btrim(NEW.review_notes), '') = '' THEN
    RAISE EXCEPTION 'A reason is required when rejecting or requesting revisions to a Chronicle submission';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DO $trigger$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.chronicle_submissions'::regclass
      AND tgname = 'chronicle_submission_review_guard'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER chronicle_submission_review_guard
      BEFORE UPDATE ON public.chronicle_submissions
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_chronicle_submission_review();
  END IF;
END
$trigger$;


REVOKE ALL ON FUNCTION public.validate_chronicle_submission_review()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.validate_chronicle_paper_publication()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.publication_status = 'published' THEN
    IF NEW.paper_id IS NULL OR btrim(NEW.paper_id) = ''
       OR NEW.slug IS NULL OR btrim(NEW.slug) = ''
       OR NEW.title IS NULL OR btrim(NEW.title) = ''
       OR NEW.category IS NULL OR btrim(NEW.category) = ''
       OR NEW.author_name IS NULL OR btrim(NEW.author_name) = ''
       OR NEW.author_affiliation IS NULL OR btrim(NEW.author_affiliation) = ''
       OR NEW.date_published IS NULL
       OR NEW.version IS NULL OR btrim(NEW.version) = ''
       OR NEW.license IS NULL
       OR NEW.license NOT IN ('CC BY 4.0', 'CC BY-NC-ND 4.0', 'cc-by-4.0', 'cc-by-nc-nd-4.0')
       OR NEW.ethics_statement IS NULL OR btrim(NEW.ethics_statement) = ''
       OR NEW.data_availability IS NULL OR btrim(NEW.data_availability) = ''
       OR NEW.funding_statement IS NULL OR btrim(NEW.funding_statement) = ''
       OR NEW.conflicts_of_interest IS NULL OR btrim(NEW.conflicts_of_interest) = ''
       OR NEW.keywords IS NULL OR cardinality(NEW.keywords) = 0 THEN
      RAISE EXCEPTION 'Chronicle paper cannot be published until all required manuscript metadata and declarations are complete';
    END IF;

    IF jsonb_typeof(NEW.authors) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Chronicle paper requires a structured author list';
    END IF;
    IF jsonb_array_length(NEW.authors) = 0 THEN
      RAISE EXCEPTION 'Chronicle paper requires at least one author';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.authors) AS author
      WHERE coalesce(btrim(author->>'name'), '') = ''
         OR coalesce(btrim(author->>'affiliation'), '') = ''
    ) THEN
      RAISE EXCEPTION 'Every Chronicle author must have a name and affiliation';
    END IF;

    IF jsonb_typeof(NEW.abstract) IS DISTINCT FROM 'object'
       OR coalesce(btrim(NEW.abstract->>'background'), '') = ''
       OR coalesce(btrim(NEW.abstract->>'methods'), '') = ''
       OR coalesce(btrim(NEW.abstract->>'results'), '') = ''
       OR coalesce(btrim(NEW.abstract->>'conclusion'), '') = '' THEN
      RAISE EXCEPTION 'Chronicle paper requires a complete structured abstract';
    END IF;

    IF jsonb_typeof(NEW.sections) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Chronicle paper requires full manuscript sections';
    END IF;
    IF jsonb_array_length(NEW.sections) = 0 THEN
      RAISE EXCEPTION 'Chronicle paper requires full manuscript sections';
    END IF;

    IF jsonb_typeof(NEW.reference_list) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Chronicle paper requires a reference list';
    END IF;
    IF jsonb_array_length(NEW.reference_list) = 0 THEN
      RAISE EXCEPTION 'Chronicle paper requires a reference list';
    END IF;
  END IF;

  NEW.updated_at := now();
  IF NEW.publication_status = 'published' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.reviewed_at := now();
      NEW.reviewed_by := auth.uid();
    ELSIF OLD.publication_status IS DISTINCT FROM 'published' THEN
      NEW.reviewed_at := now();
      NEW.reviewed_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_chronicle_paper_publication()
  FROM PUBLIC, anon, authenticated, service_role;

DO $paper_trigger$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.chronicle_papers'::regclass
      AND tgname = 'chronicle_paper_publication_guard'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER chronicle_paper_publication_guard
      BEFORE INSERT OR UPDATE ON public.chronicle_papers
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_chronicle_paper_publication();
  END IF;
END
$paper_trigger$;

COMMIT;
