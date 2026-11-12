-- Verify anonymous reads cannot see published-but-unverified directory records.
BEGIN;

INSERT INTO public.venues (slug, name, city, publication_status, verification_status)
VALUES
  ('kg-ci-unverified-venue', 'CI Unverified Venue', 'Delhi', 'published', 'unverified'),
  ('kg-ci-verified-venue', 'CI Verified Venue', 'Delhi', 'published', 'verified');

INSERT INTO public.opportunities (slug, title, opportunity_type, city, publication_status, verification_status)
VALUES
  ('kg-ci-unverified-trial', 'CI Unverified Trial', 'trial', 'Delhi', 'published', 'unverified'),
  ('kg-ci-verified-trial', 'CI Verified Trial', 'trial', 'Delhi', 'published', 'verified');

INSERT INTO public.coaches (slug, display_name, city, publication_status, verification_status)
VALUES
  ('kg-ci-unverified-coach', 'CI Unverified Coach', 'Delhi', 'published', 'unverified'),
  ('kg-ci-verified-coach', 'CI Verified Coach', 'Delhi', 'published', 'verified');

INSERT INTO public.academies (slug, name, city, publication_status, verification_status)
VALUES
  ('kg-ci-unverified-academy', 'CI Unverified Academy', 'Delhi', 'published', 'unverified'),
  ('kg-ci-verified-academy', 'CI Verified Academy', 'Delhi', 'published', 'verified');

INSERT INTO public.events (slug, title, starts_at, publication_status, verification_status)
VALUES
  ('kg-ci-unverified-event', 'CI Unverified Event', now() + interval '1 day', 'published', 'unverified'),
  ('kg-ci-verified-event', 'CI Verified Event', now() + interval '1 day', 'published', 'verified');

SET LOCAL ROLE anon;
DO $assert$
BEGIN
  IF EXISTS (SELECT 1 FROM public.venues WHERE slug = 'kg-ci-unverified-venue') THEN RAISE EXCEPTION 'Anon can read an unverified venue'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.venues WHERE slug = 'kg-ci-verified-venue') THEN RAISE EXCEPTION 'Anon cannot read a verified venue'; END IF;
  IF EXISTS (SELECT 1 FROM public.opportunities WHERE slug = 'kg-ci-unverified-trial') THEN RAISE EXCEPTION 'Anon can read an unverified trial'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.opportunities WHERE slug = 'kg-ci-verified-trial') THEN RAISE EXCEPTION 'Anon cannot read a verified trial'; END IF;
  IF EXISTS (SELECT 1 FROM public.coaches WHERE slug = 'kg-ci-unverified-coach') THEN RAISE EXCEPTION 'Anon can read an unverified coach'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.coaches WHERE slug = 'kg-ci-verified-coach') THEN RAISE EXCEPTION 'Anon cannot read a verified coach'; END IF;
  IF EXISTS (SELECT 1 FROM public.academies WHERE slug = 'kg-ci-unverified-academy') THEN RAISE EXCEPTION 'Anon can read an unverified academy'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.academies WHERE slug = 'kg-ci-verified-academy') THEN RAISE EXCEPTION 'Anon cannot read a verified academy'; END IF;
  IF EXISTS (SELECT 1 FROM public.events WHERE slug = 'kg-ci-unverified-event') THEN RAISE EXCEPTION 'Anon can read an unverified event'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE slug = 'kg-ci-verified-event') THEN RAISE EXCEPTION 'Anon cannot read a verified event'; END IF;
END;
$assert$;
RESET ROLE;
ROLLBACK;