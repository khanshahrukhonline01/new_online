-- KhelGrid: keep seeded Chronicle examples out of the public research archive.
-- The initial seed script labels these as flagship preprints; they are not
-- evidence of reviewed, complete manuscripts. Preserve the rows for editorial
-- review, but require explicit publication approval for future records.

BEGIN;

ALTER TABLE public.chronicle_papers
  ALTER COLUMN publication_status SET DEFAULT 'pending_review';

UPDATE public.chronicle_papers
SET publication_status = 'pending_review'
WHERE paper_id IN ('KG-2026-001', 'KG-2026-002', 'KG-2026-004')
  AND slug IN (
    'kinematic-correlates-lumbar-spine-stress-fast-bowlers',
    'normative-fitness-percentiles-grassroots-athletes-india',
    'predictive-talent-identification-models-domestic-cricket'
  )
  AND publication_status = 'published';

COMMIT;
