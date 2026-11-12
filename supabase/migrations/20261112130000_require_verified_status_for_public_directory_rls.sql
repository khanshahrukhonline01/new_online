-- Public catalogue rows are readable only after independent evidence verification.
-- Publication status alone must never expose an unverified venue, coach, academy, event or trial.
BEGIN;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
  CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected'));

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venues_read_published ON public.venues;
CREATE POLICY venues_read_published ON public.venues
  FOR SELECT TO anon, authenticated
  USING (publication_status = 'published' AND verification_status = 'verified');

DROP POLICY IF EXISTS opportunities_read_published ON public.opportunities;
CREATE POLICY opportunities_read_published ON public.opportunities
  FOR SELECT TO anon, authenticated
  USING (publication_status = 'published' AND verification_status = 'verified');

DROP POLICY IF EXISTS coaches_read_published ON public.coaches;
CREATE POLICY coaches_read_published ON public.coaches
  FOR SELECT TO anon, authenticated
  USING (publication_status = 'published' AND verification_status = 'verified');

DROP POLICY IF EXISTS academies_read_published ON public.academies;
CREATE POLICY academies_read_published ON public.academies
  FOR SELECT TO anon, authenticated
  USING (publication_status = 'published' AND verification_status = 'verified');

DROP POLICY IF EXISTS events_read_published ON public.events;
CREATE POLICY events_read_published ON public.events
  FOR SELECT TO anon, authenticated
  USING (publication_status = 'published' AND verification_status = 'verified');

DROP POLICY IF EXISTS courts_read_for_published_venues ON public.venue_courts;
CREATE POLICY courts_read_for_published_venues ON public.venue_courts
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = venue_courts.venue_id
      AND v.publication_status = 'published'
      AND v.verification_status = 'verified'
  ));

DROP POLICY IF EXISTS academy_sports_read_published_relationships ON public.academy_sports;
CREATE POLICY academy_sports_read_published_relationships ON public.academy_sports
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.academies a WHERE a.id = academy_id AND a.publication_status = 'published' AND a.verification_status = 'verified')
    AND EXISTS (SELECT 1 FROM public.sports s WHERE s.id = sport_id AND s.is_published)
  );

DROP POLICY IF EXISTS coach_sports_read_published_relationships ON public.coach_sports;
CREATE POLICY coach_sports_read_published_relationships ON public.coach_sports
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.publication_status = 'published' AND c.verification_status = 'verified')
    AND EXISTS (SELECT 1 FROM public.sports s WHERE s.id = sport_id AND s.is_published)
  );

DROP POLICY IF EXISTS coach_academies_read_published_relationships ON public.coach_academies;
CREATE POLICY coach_academies_read_published_relationships ON public.coach_academies
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = coach_id AND c.publication_status = 'published' AND c.verification_status = 'verified')
    AND EXISTS (SELECT 1 FROM public.academies a WHERE a.id = academy_id AND a.publication_status = 'published' AND a.verification_status = 'verified')
  );

CREATE INDEX IF NOT EXISTS venues_public_verified_city_idx
  ON public.venues (publication_status, verification_status, city);
CREATE INDEX IF NOT EXISTS opportunities_public_verified_city_idx
  ON public.opportunities (publication_status, verification_status, city);
CREATE INDEX IF NOT EXISTS coaches_public_verified_city_idx
  ON public.coaches (publication_status, verification_status, city);

COMMIT;