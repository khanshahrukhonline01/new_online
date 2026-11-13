-- Remove explicitly labelled test-only venue fixtures from public eligibility.
-- Keep the records for auditability; never delete catalogue or submission history.
BEGIN;

WITH test_submissions AS (
  UPDATE public.listing_submissions s
  SET status = 'rejected',
      verification_status = 'rejected',
      rejection_reason = 'Explicitly labelled TEST ONLY — NOT A REAL LISTING; not eligible for KhelGrid publication.',
      reviewed_at = coalesce(reviewed_at, clock_timestamp()),
      reviewed_by = NULL,
      version = version + 1,
      updated_at = clock_timestamp()
  WHERE s.title ILIKE 'TEST ONLY — NOT A REAL LISTING:%'
    AND s.status IN ('pending_review', 'under_review', 'approved')
  RETURNING s.id, s.reference_number, s.title, s.published_table, s.published_record_id
),
unpublished AS (
  UPDATE public.venues v
  SET publication_status = 'draft',
      verification_status = 'unverified'
  FROM test_submissions s
  WHERE s.published_table = 'venues' AND s.published_record_id = v.id
  RETURNING v.id
)
INSERT INTO public.listing_submission_audits (
  submission_id, action, actor_id, from_status, to_status, notes, metadata
)
SELECT
  s.id, 'rejected', NULL, 'pending_review', 'rejected',
  'Automated data-integrity cleanup: record is explicitly labelled as a test-only fixture.',
  jsonb_build_object(
    'cleanup_reason', 'explicit_test_only_fixture',
    'reference_number', s.reference_number,
    'catalogue_unpublished', true
  )
FROM test_submissions s;

-- Even if a test-only catalogue row has no linked submission, it must never be
-- published or verified as a genuine public listing.
UPDATE public.venues
SET publication_status = 'draft',
    verification_status = 'unverified'
WHERE name ILIKE 'TEST ONLY — NOT A REAL LISTING:%'
   OR slug ILIKE 'test-only-%';

COMMIT;
