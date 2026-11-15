-- Phase B private trigger-function and safe search_path assertions.
BEGIN;

DO $phase_b_hardening$
DECLARE
  v_config text[];
  v_is_definer boolean;
BEGIN
  IF has_function_privilege('anon', 'public.assign_listing_submission_defaults()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.assign_listing_submission_defaults()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.log_listing_submission_created()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.log_listing_submission_created()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Phase B: trigger-only listing functions must not be directly executable by browser roles';
  END IF;

  SELECT proconfig INTO v_config
  FROM pg_proc WHERE oid = 'public.generate_catalogue_slug(text,text)'::regprocedure;
  IF NOT coalesce(v_config::text, '') LIKE '%search_path=pg_catalog%' THEN
    RAISE EXCEPTION 'Phase B: generate_catalogue_slug must pin its search_path';
  END IF;

  SELECT prosecdef INTO v_is_definer
  FROM pg_proc WHERE oid = 'public.is_listing_super_admin()'::regprocedure;
  IF v_is_definer THEN
    RAISE EXCEPTION 'Phase B: is_listing_super_admin should use invoker security';
  END IF;
END;
$phase_b_hardening$;

-- Verify the private trigger callbacks still execute through the supported
-- anonymous intake RPC after direct EXECUTE privileges have been revoked.
SET LOCAL ROLE anon;
SELECT set_config('request.headers', '{"cf-connecting-ip":"203.0.113.91"}', true);
DO $phase_b_intake$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.submit_listing_intake(
    'venue',
    'Phase B Trigger ACL Test',
    'Delhi',
    'https://example.org/phase-b-trigger-acl',
    'Temporary CI-only listing intake test.',
    NULL
  );
  IF v_result->>'status' IS DISTINCT FROM 'submitted' THEN
    RAISE EXCEPTION 'Phase B: private trigger ACL blocked supported intake: %', v_result;
  END IF;
END;
$phase_b_intake$;
RESET ROLE;

ROLLBACK;
