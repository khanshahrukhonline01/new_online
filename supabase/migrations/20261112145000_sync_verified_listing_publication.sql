-- Keep the destination catalogue's verification state in sync with a verified publication decision.
-- Required when a moderator verifies and republishes an existing legacy catalogue row.
BEGIN;

CREATE OR REPLACE FUNCTION public.sync_verified_listing_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.status <> 'published'
     OR NEW.verification_status <> 'verified'
     OR NEW.published_record_id IS NULL
     OR NEW.published_table IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.published_table = 'venues' THEN
    UPDATE public.venues
    SET verification_status = 'verified', publication_status = 'published'
    WHERE id = NEW.published_record_id;
  ELSIF NEW.published_table = 'coaches' THEN
    UPDATE public.coaches
    SET verification_status = 'verified', publication_status = 'published'
    WHERE id = NEW.published_record_id;
  ELSIF NEW.published_table = 'opportunities' THEN
    UPDATE public.opportunities
    SET verification_status = 'verified', publication_status = 'published'
    WHERE id = NEW.published_record_id;
  ELSIF NEW.published_table = 'academies' THEN
    UPDATE public.academies
    SET verification_status = 'verified', publication_status = 'published'
    WHERE id = NEW.published_record_id;
  ELSIF NEW.published_table = 'events' THEN
    UPDATE public.events
    SET verification_status = 'verified', publication_status = 'published'
    WHERE id = NEW.published_record_id;
  ELSIF NEW.published_table = 'pickup_games' THEN
    UPDATE public.pickup_games
    SET verification_status = 'verified', publication_status = 'published'
    WHERE id = NEW.published_record_id;
  ELSIF NEW.published_table = 'sports' THEN
    UPDATE public.sports SET is_published = true
    WHERE id = NEW.published_record_id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_verified_listing_publication() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_verified_listing_publication_after_update ON public.listing_submissions;
CREATE TRIGGER sync_verified_listing_publication_after_update
AFTER UPDATE OF status, verification_status, published_record_id, published_table
ON public.listing_submissions
FOR EACH ROW
EXECUTE FUNCTION public.sync_verified_listing_publication();

COMMIT;
