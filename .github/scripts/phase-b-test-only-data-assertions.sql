-- Explicit test-only legacy records must never be publicly eligible.
BEGIN;

DO $test_only$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.venues
    WHERE (name ILIKE 'TEST ONLY — NOT A REAL LISTING:%' OR slug ILIKE 'test-only-%')
      AND (publication_status = 'published' OR verification_status = 'verified')
  ) THEN
    RAISE EXCEPTION 'Phase B: test-only venue fixture remains published or verified';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.listing_submissions
    WHERE title ILIKE 'TEST ONLY — NOT A REAL LISTING:%'
      AND status <> 'rejected'
  ) THEN
    RAISE EXCEPTION 'Phase B: test-only venue submission remains in a live review state';
  END IF;
END;
$test_only$;

ROLLBACK;
