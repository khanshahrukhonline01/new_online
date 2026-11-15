-- Published state and verified state must agree for every public catalogue table.
BEGIN;

DO $published_verified$
BEGIN
  IF EXISTS (SELECT 1 FROM public.venues WHERE publication_status='published' AND coalesce(verification_status,'unverified')<>'verified') THEN
    RAISE EXCEPTION 'Phase B: unverified venue remains published';
  END IF;
  IF EXISTS (SELECT 1 FROM public.coaches WHERE publication_status='published' AND coalesce(verification_status,'unverified')<>'verified') THEN
    RAISE EXCEPTION 'Phase B: unverified coach remains published';
  END IF;
  IF EXISTS (SELECT 1 FROM public.opportunities WHERE publication_status='published' AND coalesce(verification_status,'unverified')<>'verified') THEN
    RAISE EXCEPTION 'Phase B: unverified trial/opportunity remains published';
  END IF;
  IF EXISTS (SELECT 1 FROM public.academies WHERE publication_status='published' AND coalesce(verification_status,'unverified')<>'verified') THEN
    RAISE EXCEPTION 'Phase B: unverified academy remains published';
  END IF;
  IF EXISTS (SELECT 1 FROM public.events WHERE publication_status='published' AND coalesce(verification_status,'unverified')<>'verified') THEN
    RAISE EXCEPTION 'Phase B: unverified event remains published';
  END IF;
  IF EXISTS (SELECT 1 FROM public.pickup_games WHERE publication_status='published' AND coalesce(verification_status,'unverified')<>'verified') THEN
    RAISE EXCEPTION 'Phase B: unverified pickup game remains published';
  END IF;
END;
$published_verified$;

ROLLBACK;
