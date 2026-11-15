-- Phase B queue and catalogue foreign-key indexes.
-- These support moderation joins, audit lookups, and FK maintenance without
-- changing row visibility or authorization behavior.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_academy_sports_sport_id
  ON public.academy_sports (sport_id);
CREATE INDEX IF NOT EXISTS idx_coach_academies_academy_id
  ON public.coach_academies (academy_id);
CREATE INDEX IF NOT EXISTS idx_coach_sports_sport_id
  ON public.coach_sports (sport_id);
CREATE INDEX IF NOT EXISTS idx_events_venue_id
  ON public.events (venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_courts_sport_id
  ON public.venue_courts (sport_id);

CREATE INDEX IF NOT EXISTS idx_listing_moderator_access_audits_actor_id
  ON public.listing_moderator_access_audits (actor_id);
CREATE INDEX IF NOT EXISTS idx_listing_moderators_created_by
  ON public.listing_moderators (created_by);
CREATE INDEX IF NOT EXISTS idx_listing_submission_audits_actor_id
  ON public.listing_submission_audits (actor_id);
CREATE INDEX IF NOT EXISTS idx_listing_submission_evidence_reviewed_by
  ON public.listing_submission_evidence (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_listing_submissions_assigned_moderator_id
  ON public.listing_submissions (assigned_moderator_id);
CREATE INDEX IF NOT EXISTS idx_listing_submissions_published_by
  ON public.listing_submissions (published_by);
CREATE INDEX IF NOT EXISTS idx_listing_submissions_reviewed_by
  ON public.listing_submissions (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_listing_submissions_submitter_id
  ON public.listing_submissions (submitter_id);
CREATE INDEX IF NOT EXISTS idx_listing_submissions_unpublished_by
  ON public.listing_submissions (unpublished_by);
CREATE INDEX IF NOT EXISTS idx_listing_submissions_verified_by
  ON public.listing_submissions (verified_by);

COMMIT;
