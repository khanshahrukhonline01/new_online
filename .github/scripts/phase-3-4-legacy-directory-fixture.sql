-- CI-only legacy catalogue records used to verify the moderator backfill workflow.
BEGIN;

INSERT INTO public.venues (slug, name, city, sport, publication_status, verification_status)
VALUES ('kg-ci-legacy-venue', 'CI Legacy Venue', 'Delhi', 'Multi-sport', 'draft', 'unverified')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.coaches (slug, display_name, city, publication_status, verification_status)
VALUES ('coach-kg-ci-legacy', 'CI Legacy Coach', 'Delhi', 'draft', 'unverified')
ON CONFLICT DO NOTHING;

INSERT INTO public.opportunities (slug, title, city, publication_status, verification_status)
VALUES ('kg-ci-legacy-trial', 'CI Legacy Sports Trial', 'Delhi', 'draft', 'unverified')
ON CONFLICT DO NOTHING;

COMMIT;
