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
       OR NEW.article_type NOT IN ('preprint', 'protocol', 'review', 'dataset', 'casestudy')
       OR NEW.full_text_or_url IS NULL
       OR NEW.full_text_or_url NOT LIKE 'https://%'
       OR (NEW.supplementary_url IS NOT NULL AND NEW.supplementary_url NOT LIKE 'https://%')
       OR NEW.data_availability NOT IN ('open_access', 'upon_request', 'de_identified', 'restricted')
       OR NEW.ethics_clearance_number IS NULL
       OR btrim(NEW.ethics_clearance_number) = ''
       OR NEW.abstract IS NULL
       OR length(btrim(NEW.abstract)) < 50
       OR NEW.keywords IS NULL
       OR btrim(NEW.keywords) = ''
       OR NEW.human_ethics_confirmed IS NOT TRUE
       OR NEW.minor_consent_confirmed IS NOT TRUE
       OR NEW.license_type NOT IN ('cc-by-4.0', 'cc-by-nc-nd-4.0')
       OR NEW.license_confirmed IS NOT TRUE THEN
      RAISE EXCEPTION 'Chronicle submission cannot be approved until all manuscript, ethics, consent, and licence requirements are complete';
    END IF;
  END IF;

  IF NEW.status = 'rejected' AND coalesce(btrim(NEW.review_notes), '') = '' THEN
    RAISE EXCEPTION 'A reason is required when rejecting a Chronicle submission';
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

COMMIT;
