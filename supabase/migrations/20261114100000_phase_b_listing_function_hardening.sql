-- Phase B function hardening: keep trigger-only SECURITY DEFINER functions private,
-- remove a mutable search_path warning, and avoid SECURITY DEFINER for a self-membership check.
BEGIN;

CREATE OR REPLACE FUNCTION public.generate_catalogue_slug(
  p_title text,
  p_prefix text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog
AS $function$
DECLARE
  v_clean text;
BEGIN
  v_clean := lower(regexp_replace(coalesce(p_title, ''), '[^a-zA-Z0-9\s-]', '', 'g'));
  v_clean := trim(both '-' from regexp_replace(v_clean, '[\s_-]+', '-', 'g'));
  IF v_clean IS NULL OR char_length(v_clean) = 0 THEN
    v_clean := coalesce(nullif(btrim(p_prefix), ''), 'item') || '-' ||
      substr(md5(gen_random_uuid()::text), 1, 8);
  END IF;
  RETURN v_clean;
END;
$function$;

-- These are trigger callbacks, not RPC endpoints. PostgreSQL checks the
-- trigger function permission when the trigger is created; direct API calls
-- are not part of the supported contract.
REVOKE ALL ON FUNCTION public.assign_listing_submission_defaults()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.log_listing_submission_created()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_listing_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.listing_moderators m
    WHERE m.user_id = auth.uid()
      AND m.is_active = true
      AND m.role = 'super_admin'
  );
$function$;

COMMIT;
