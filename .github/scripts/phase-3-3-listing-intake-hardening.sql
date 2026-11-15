-- Verify server-side validation and gateway-aware rate limiting for anonymous listing intake.
BEGIN;

SELECT set_config('request.headers', '{"cf-connecting-ip":"203.0.113.44"}', true);
SET LOCAL ROLE anon;

DO $assert$
DECLARE
  v_result jsonb;
  v_index integer;
BEGIN
  PERFORM set_config('request.headers', '{}', true);
  v_result := public.submit_listing_intake(
    'venue', 'No Trusted IP Venue', 'Delhi', 'https://example.org/venue',
    'This request has no trusted gateway IP and must fail closed.', NULL
  );
  IF v_result->>'status' IS DISTINCT FROM 'unavailable' THEN
    RAISE EXCEPTION 'Missing trusted client IP must fail closed, got %', v_result;
  END IF;

  PERFORM set_config('request.headers', '{"cf-connecting-ip":"203.0.113.44"}', true);
  FOR v_index IN 1..10 LOOP
    v_result := public.submit_listing_intake(
      'venue',
      'Rate Limit Test Venue ' || v_index,
      'Delhi',
      'https://example.org/venue',
      'A test-only venue address and evidence description',
      NULL
    );
    IF v_result->>'status' IS DISTINCT FROM 'submitted' THEN
      RAISE EXCEPTION 'Expected valid listing submission % to be accepted, got %', v_index, v_result;
    END IF;
  END LOOP;

  v_result := public.submit_listing_intake(
    'venue',
    'Rate Limit Test Venue 11',
    'Delhi',
    'https://example.org/venue',
    'A test-only venue address and evidence description',
    NULL
  );
  IF v_result->>'status' IS DISTINCT FROM 'rate_limited' THEN
    RAISE EXCEPTION 'Expected the 11th submission in one minute to be rate limited, got %', v_result;
  END IF;

  PERFORM set_config('request.headers', '{"cf-connecting-ip":"203.0.113.45"}', true);

  v_result := public.submit_listing_intake(
    'coach',
    'Coach Profile Without Source Yet',
    'Delhi',
    NULL,
    'Profile is accepted privately but cannot be published until evidence is reviewed.',
    NULL
  );
  IF v_result->>'status' IS DISTINCT FROM 'submitted' THEN
    RAISE EXCEPTION 'A source-less listing should be accepted into the private review queue, got %', v_result;
  END IF;

  BEGIN
    PERFORM public.submit_listing_intake(
      'venue',
      repeat('x', 151),
      'Delhi',
      'https://example.org/venue',
      'Test details',
      NULL
    );
    RAISE EXCEPTION 'Overlength listing title unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  BEGIN
    PERFORM public.submit_listing_intake(
      'venue',
      'Invalid source URL venue',
      'Delhi',
      'http://example.org/venue',
      'Test details',
      NULL
    );
    RAISE EXCEPTION 'Non-HTTPS source URL unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
END;
$assert$;

RESET ROLE;
ROLLBACK;
