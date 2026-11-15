-- A public catalogue row must never retain a published state without verified evidence.
-- Keep unverified legacy data intact, but move it back to draft until a moderator publishes it.
BEGIN;

UPDATE public.venues
SET publication_status = 'draft'
WHERE publication_status = 'published'
  AND coalesce(verification_status, 'unverified') <> 'verified';

UPDATE public.coaches
SET publication_status = 'draft'
WHERE publication_status = 'published'
  AND coalesce(verification_status, 'unverified') <> 'verified';

UPDATE public.opportunities
SET publication_status = 'draft'
WHERE publication_status = 'published'
  AND coalesce(verification_status, 'unverified') <> 'verified';

UPDATE public.academies
SET publication_status = 'draft'
WHERE publication_status = 'published'
  AND coalesce(verification_status, 'unverified') <> 'verified';

UPDATE public.events
SET publication_status = 'draft'
WHERE publication_status = 'published'
  AND coalesce(verification_status, 'unverified') <> 'verified';

UPDATE public.pickup_games
SET publication_status = 'draft'
WHERE publication_status = 'published'
  AND coalesce(verification_status, 'unverified') <> 'verified';

COMMIT;
