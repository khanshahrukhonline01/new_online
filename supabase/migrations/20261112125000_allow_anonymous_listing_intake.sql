-- Anonymous users may submit a listing without creating an account.
-- The tracking key is the only public submitter credential; the queue remains private.
BEGIN;

ALTER TABLE public.listing_submissions
  ALTER COLUMN submitter_id DROP NOT NULL;

COMMENT ON COLUMN public.listing_submissions.submitter_id IS
  'Nullable for anonymous public intake. Authenticated submitters are linked when an authenticated JWT is supplied.';

COMMIT;
