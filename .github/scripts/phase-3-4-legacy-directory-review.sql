-- Verify legacy unverified catalogue records enter the private review queue and publish with verified state.
BEGIN;

DO $assert$
DECLARE
  v_venue_id uuid;
  v_coach_id uuid;
  v_trial_id uuid;
  v_venue_submission uuid;
  v_coach_submission uuid;
  v_trial_submission uuid;
BEGIN
  SELECT id INTO v_venue_id FROM public.venues WHERE slug = 'kg-ci-legacy-venue';
  SELECT id INTO v_coach_id FROM public.coaches WHERE slug = 'coach-kg-ci-legacy';
  SELECT id INTO v_trial_id FROM public.opportunities WHERE slug = 'kg-ci-legacy-trial';

  SELECT id INTO v_venue_submission FROM public.listing_submissions
  WHERE published_table = 'venues' AND published_record_id = v_venue_id AND status = 'pending_review';
  SELECT id INTO v_coach_submission FROM public.listing_submissions
  WHERE published_table = 'coaches' AND published_record_id = v_coach_id AND status = 'pending_review';
  SELECT id INTO v_trial_submission FROM public.listing_submissions
  WHERE published_table = 'opportunities' AND published_record_id = v_trial_id AND status = 'pending_review';

  IF v_venue_submission IS NULL THEN RAISE EXCEPTION 'Legacy venue was not queued for evidence review'; END IF;
  IF v_coach_submission IS NULL THEN RAISE EXCEPTION 'Legacy coach was not queued for evidence review'; END IF;
  IF v_trial_submission IS NULL THEN RAISE EXCEPTION 'Legacy trial was not queued for evidence review'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.listing_submissions
    WHERE id = v_venue_submission AND verification_status = 'unverified'
      AND details ILIKE '%legacy KhelGrid venue%'
  ) THEN RAISE EXCEPTION 'Legacy venue queue entry is not marked unverified'; END IF;

  UPDATE public.listing_submissions
  SET status = 'under_review', verification_status = 'verified'
  WHERE id IN (v_venue_submission, v_coach_submission, v_trial_submission);

  UPDATE public.listing_submissions
  SET status = 'approved'
  WHERE id IN (v_venue_submission, v_coach_submission, v_trial_submission);

  UPDATE public.listing_submissions
  SET status = 'published'
  WHERE id IN (v_venue_submission, v_coach_submission, v_trial_submission);

  IF NOT EXISTS (SELECT 1 FROM public.venues WHERE id = v_venue_id AND verification_status = 'verified' AND publication_status = 'published') THEN
    RAISE EXCEPTION 'Verified venue publication was not synchronized to its catalogue row';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coaches WHERE id = v_coach_id AND verification_status = 'verified' AND publication_status = 'published') THEN
    RAISE EXCEPTION 'Verified coach publication was not synchronized to its catalogue row';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.opportunities WHERE id = v_trial_id AND verification_status = 'verified' AND publication_status = 'published') THEN
    RAISE EXCEPTION 'Verified trial publication was not synchronized to its catalogue row';
  END IF;
END;
$assert$;

ROLLBACK;
