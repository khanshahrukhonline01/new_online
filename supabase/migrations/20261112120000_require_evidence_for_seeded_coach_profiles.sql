-- Free directory submissions: coach evidence review must not be bypassed by seed status.
-- These legacy sample rows were bulk-labelled verified without per-coach evidence records.
-- Keep them out of the public catalogue until an authorised reviewer verifies each profile.
BEGIN;

UPDATE public.coaches
SET
  publication_status = 'draft',
  verification_status = 'unverified'
WHERE slug IN (
  'chandrakant-pandit',
  'tarak-sinha',
  'syed-abdul-rahim',
  'clifford-miranda',
  'gurbax-singh-sandhu',
  'harendra-singh',
  'vijay-sharma',
  'soumyadeep-roy',
  'nandan-bal',
  'dharmendra-tiwari',
  'bishweshwar-nandi',
  'nihar-ameen',
  'yashpal-solanki',
  'sagar-lagu',
  'r-k-sharma',
  'ismail-baig',
  'scott-flemming',
  'ge-sridharan',
  'rb-ramesh',
  'cyrus-poncha',
  'tarun-sardesai',
  'radhakrishnan-nair',
  'vimal-kumar',
  'virender-singh',
  'e-bhaskaran'
)
AND (
  publication_status IS DISTINCT FROM 'draft'
  OR verification_status IS DISTINCT FROM 'unverified'
);

COMMIT;
