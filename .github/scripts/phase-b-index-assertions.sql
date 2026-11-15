-- Verify Phase B foreign-key indexes exist.
BEGIN;

DO $phase_b_indexes$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(expected.index_name ORDER BY expected.index_name)
  INTO v_missing
  FROM (VALUES
    ('idx_academy_sports_sport_id'),
    ('idx_coach_academies_academy_id'),
    ('idx_coach_sports_sport_id'),
    ('idx_events_venue_id'),
    ('idx_venue_courts_sport_id'),
    ('idx_listing_moderator_access_audits_actor_id'),
    ('idx_listing_moderators_created_by'),
    ('idx_listing_submission_audits_actor_id'),
    ('idx_listing_submission_evidence_reviewed_by'),
    ('idx_listing_submissions_assigned_moderator_id'),
    ('idx_listing_submissions_published_by'),
    ('idx_listing_submissions_reviewed_by'),
    ('idx_listing_submissions_submitter_id'),
    ('idx_listing_submissions_unpublished_by'),
    ('idx_listing_submissions_verified_by')
  ) AS expected(index_name)
  LEFT JOIN pg_indexes i
    ON i.schemaname = 'public' AND i.indexname = expected.index_name
  WHERE i.indexname IS NULL;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Phase B missing expected FK indexes: %', v_missing;
  END IF;
END;
$phase_b_indexes$;

ROLLBACK;
