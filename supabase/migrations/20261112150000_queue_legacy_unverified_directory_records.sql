-- Put existing unverified venue, coach and trial catalogue rows into the private moderation queue.
-- Existing rows remain hidden until a moderator reviews evidence and republishes them.
BEGIN;

WITH legacy_records AS (
  SELECT
    'venue'::text AS listing_type,
    v.id AS record_id,
    'venues'::text AS published_table,
    v.name AS title,
    CASE WHEN char_length(v.city) <= 100 THEN v.city ELSE NULL END AS city,
    CASE
      WHEN v.source_url ~* '^https://' AND char_length(v.source_url) <= 1000 AND v.source_url !~ '[[:space:]]'
      THEN v.source_url ELSE NULL
    END AS source_url,
    left(concat_ws(E'\n',
      'Legacy KhelGrid venue record imported for independent evidence review.',
      'Existing catalogue record ID: ' || v.id::text,
      'This record must remain unpublished until a moderator reviews supporting venue-address evidence.'
    ), 1900) AS details,
    jsonb_build_object(
      'legacy_record_id', v.id,
      'legacy_source_table', 'venues',
      'name', v.name,
      'city', v.city,
      'address', v.address,
      'description', v.description,
      'source_url', v.source_url
    ) AS structured_data
  FROM public.venues v
  WHERE coalesce(v.verification_status, 'unverified') <> 'verified'
    AND char_length(v.name) BETWEEN 2 AND 150

  UNION ALL

  SELECT
    'coach'::text,
    c.id,
    'coaches'::text,
    c.display_name,
    CASE WHEN char_length(c.city) <= 100 THEN c.city ELSE NULL END,
    CASE
      WHEN c.website_url ~* '^https://' AND char_length(c.website_url) <= 1000 AND c.website_url !~ '[[:space:]]'
      THEN c.website_url ELSE NULL
    END,
    left(concat_ws(E'\n',
      'Legacy KhelGrid coach record imported for independent credential review.',
      'Existing catalogue record ID: ' || c.id::text,
      'This record must remain unpublished until a moderator reviews coach-qualification evidence.'
    ), 1900),
    jsonb_build_object(
      'legacy_record_id', c.id,
      'legacy_source_table', 'coaches',
      'display_name', c.display_name,
      'city', c.city,
      'bio', c.bio,
      'qualifications', c.qualifications,
      'website_url', c.website_url
    )
  FROM public.coaches c
  WHERE coalesce(c.verification_status, 'unverified') <> 'verified'
    AND c.slug LIKE 'coach-%'
    AND char_length(c.display_name) BETWEEN 2 AND 150

  UNION ALL

  SELECT
    'opportunity'::text,
    o.id,
    'opportunities'::text,
    o.title,
    CASE WHEN char_length(o.city) <= 100 THEN o.city ELSE NULL END,
    CASE
      WHEN o.source_url ~* '^https://' AND char_length(o.source_url) <= 1000 AND o.source_url !~ '[[:space:]]'
      THEN o.source_url ELSE NULL
    END,
    left(concat_ws(E'\n',
      'Legacy KhelGrid sports-trial/opportunity record imported for independent source review.',
      'Existing catalogue record ID: ' || o.id::text,
      'This record must remain unpublished until a moderator reviews official organiser and trial details.'
    ), 1900),
    jsonb_build_object(
      'legacy_record_id', o.id,
      'legacy_source_table', 'opportunities',
      'title', o.title,
      'city', o.city,
      'opportunity_type', o.opportunity_type,
      'organizer_name', o.organizer_name,
      'venue_name', o.venue_name,
      'source_name', o.source_name,
      'source_url', o.source_url
    )
  FROM public.opportunities o
  WHERE coalesce(o.verification_status, 'unverified') <> 'verified'
    AND char_length(o.title) BETWEEN 2 AND 150
),
to_queue AS (
  SELECT lr.*
  FROM legacy_records lr
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.listing_submissions s
    WHERE s.published_record_id = lr.record_id
      AND s.published_table = lr.published_table
  )
),
inserted AS (
  INSERT INTO public.listing_submissions (
    listing_type, title, city, source_url, details,
    reference_number, tracking_key, submitter_id, submitter_email,
    status, verification_status, published_record_id, published_table, structured_data
  )
  SELECT
    listing_type,
    title,
    city,
    source_url,
    details,
    'KHL-LEGACY-' || upper(substr(md5(published_table || ':' || record_id::text), 1, 12)),
    encode(extensions.gen_random_bytes(24), 'hex'),
    NULL,
    NULL,
    'pending_review',
    'unverified',
    record_id,
    published_table,
    structured_data
  FROM to_queue
  RETURNING id, listing_type, published_record_id, published_table
)
INSERT INTO public.listing_submission_audits (
  submission_id, action, actor_id, notes, metadata
)
SELECT
  id,
  'submitted',
  NULL,
  'Legacy catalogue record imported into the private queue for independent evidence review.',
  jsonb_build_object(
    'origin', 'legacy_catalogue_backfill',
    'listing_type', listing_type,
    'published_record_id', published_record_id,
    'published_table', published_table
  )
FROM inserted;

COMMIT;
