-- Harden free public listing intake with server-side validation and gateway-aware rate limiting.
-- This replaces the original intake RPC without changing its public signature or queue contract.
BEGIN;

-- A source URL may be absent at intake, but the record remains private and unverified
-- until moderators add/review sufficient evidence before publication.
ALTER TABLE public.listing_submissions
  ALTER COLUMN source_url DROP NOT NULL;

DO $source_url_constraints$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.listing_submissions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%source_url%'
  LOOP
    EXECUTE format('ALTER TABLE public.listing_submissions DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END;
$source_url_constraints$;

ALTER TABLE public.listing_submissions
  ADD CONSTRAINT listing_submissions_source_url_https_check
  CHECK (
    source_url IS NULL
    OR (char_length(source_url) <= 1000 AND source_url ~* '^https://[^/[:space:]]+([/?#][^[:space:]]*)?)
  );

CREATE OR REPLACE FUNCTION public.submit_listing_intake(
  p_listing_type text,
  p_title text,
  p_city text DEFAULT NULL,
  p_source_url text DEFAULT NULL,
  p_details text DEFAULT NULL,
  p_submitter_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_ref text;
  v_key text;
  v_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_source_url text := nullif(btrim(coalesce(p_source_url, '')), '');
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_submitter_email, ''))), '');
  v_headers json;
  v_ip text;
  v_rate_identifier text;
BEGIN
  -- Derive the rate-limit key from a verified user ID or the trusted gateway IP.
  IF auth.uid() IS NOT NULL THEN
    v_rate_identifier := 'listing_intake:usr:' || auth.uid()::text;
  ELSE
    BEGIN
      v_headers := nullif(current_setting('request.headers', true), '')::json;
      IF v_headers IS NOT NULL THEN
        v_ip := coalesce(
          nullif(trim(v_headers->>'cf-connecting-ip'), ''),
          nullif(trim(v_headers->>'x-real-ip'), '')
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
    v_rate_identifier := 'listing_intake:ip:' || md5(coalesce(v_ip, 'anon:unverified-edge-client'));
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_rate_identifier, 10, 60) THEN
    RETURN jsonb_build_object(
      'status', 'rate_limited',
      'message', 'Too many listing submissions from this connection. Please wait a minute and try again.'
    );
  END IF;

  IF p_listing_type IS NULL OR p_listing_type NOT IN ('opportunity', 'venue', 'coach', 'academy', 'event', 'pickup_game', 'sport') THEN
    RAISE EXCEPTION 'Unsupported listing type' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_title) < 2 OR char_length(v_title) > 150 THEN
    RAISE EXCEPTION 'Listing title must contain between 2 and 150 characters' USING ERRCODE = '22023';
  END IF;
  IF v_city IS NOT NULL AND char_length(v_city) > 100 THEN
    RAISE EXCEPTION 'City/location must be 100 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_details IS NOT NULL AND char_length(v_details) > 2000 THEN
    RAISE EXCEPTION 'Listing details must be 2000 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_source_url IS NOT NULL AND (
    char_length(v_source_url) > 1000 OR v_source_url !~* '^https://[^/[:space:]]+([/?#][^[:space:]]*)?
  ) THEN
    RAISE EXCEPTION 'Source URL must be a valid HTTPS URL of 1000 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND (
    char_length(v_email) > 255 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) THEN
    RAISE EXCEPTION 'Submitter email address is invalid' USING ERRCODE = '22023';
  END IF;

  v_ref := 'KHL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  v_key := encode(extensions.gen_random_bytes(24), 'hex');

  INSERT INTO public.listing_submissions (
    listing_type, title, city, source_url, details,
    reference_number, tracking_key, submitter_id, submitter_email, status
  ) VALUES (
    p_listing_type, v_title, v_city, v_source_url, v_details,
    v_ref, v_key, auth.uid(), v_email, 'pending_review'
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status', 'submitted',
    'id', v_id,
    'reference_number', v_ref,
    'tracking_key', v_key
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_listing_intake(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_listing_intake(text, text, text, text, text, text) TO anon, authenticated, service_role;

COMMIT;
)
  );

CREATE OR REPLACE FUNCTION public.submit_listing_intake(
  p_listing_type text,
  p_title text,
  p_city text DEFAULT NULL,
  p_source_url text DEFAULT NULL,
  p_details text DEFAULT NULL,
  p_submitter_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_ref text;
  v_key text;
  v_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_source_url text := nullif(btrim(coalesce(p_source_url, '')), '');
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_submitter_email, ''))), '');
  v_headers json;
  v_ip text;
  v_rate_identifier text;
BEGIN
  -- Derive the rate-limit key from a verified user ID or the trusted gateway IP.
  IF auth.uid() IS NOT NULL THEN
    v_rate_identifier := 'listing_intake:usr:' || auth.uid()::text;
  ELSE
    BEGIN
      v_headers := nullif(current_setting('request.headers', true), '')::json;
      IF v_headers IS NOT NULL THEN
        v_ip := coalesce(
          nullif(trim(v_headers->>'cf-connecting-ip'), ''),
          nullif(trim(v_headers->>'x-real-ip'), '')
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
    v_rate_identifier := 'listing_intake:ip:' || md5(coalesce(v_ip, 'anon:unverified-edge-client'));
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_rate_identifier, 10, 60) THEN
    RETURN jsonb_build_object(
      'status', 'rate_limited',
      'message', 'Too many listing submissions from this connection. Please wait a minute and try again.'
    );
  END IF;

  IF p_listing_type NOT IN ('opportunity', 'venue', 'coach', 'academy', 'event', 'pickup_game', 'sport') THEN
    RAISE EXCEPTION 'Unsupported listing type' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_title) < 2 OR char_length(v_title) > 150 THEN
    RAISE EXCEPTION 'Listing title must contain between 2 and 150 characters' USING ERRCODE = '22023';
  END IF;
  IF v_city IS NOT NULL AND char_length(v_city) > 100 THEN
    RAISE EXCEPTION 'City/location must be 100 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_details IS NOT NULL AND char_length(v_details) > 2000 THEN
    RAISE EXCEPTION 'Listing details must be 2000 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_source_url IS NOT NULL AND (
    char_length(v_source_url) > 1000 OR v_source_url !~* '^https://[^[:space:]]+$'
  ) THEN
    RAISE EXCEPTION 'Source URL must be a valid HTTPS URL of 1000 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND (
    char_length(v_email) > 255 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) THEN
    RAISE EXCEPTION 'Submitter email address is invalid' USING ERRCODE = '22023';
  END IF;

  v_ref := 'KHL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  v_key := encode(extensions.gen_random_bytes(24), 'hex');

  INSERT INTO public.listing_submissions (
    listing_type, title, city, source_url, details,
    reference_number, tracking_key, submitter_id, submitter_email, status
  ) VALUES (
    p_listing_type, v_title, v_city, v_source_url, v_details,
    v_ref, v_key, auth.uid(), v_email, 'pending_review'
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status', 'submitted',
    'id', v_id,
    'reference_number', v_ref,
    'tracking_key', v_key
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_listing_intake(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_listing_intake(text, text, text, text, text, text) TO anon, authenticated, service_role;

COMMIT;

  ) THEN
    RAISE EXCEPTION 'Source URL must be a valid HTTPS URL of 1000 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND (
    char_length(v_email) > 255 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) THEN
    RAISE EXCEPTION 'Submitter email address is invalid' USING ERRCODE = '22023';
  END IF;

  v_ref := 'KHL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  v_key := encode(extensions.gen_random_bytes(24), 'hex');

  INSERT INTO public.listing_submissions (
    listing_type, title, city, source_url, details,
    reference_number, tracking_key, submitter_id, submitter_email, status
  ) VALUES (
    p_listing_type, v_title, v_city, v_source_url, v_details,
    v_ref, v_key, auth.uid(), v_email, 'pending_review'
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status', 'submitted',
    'id', v_id,
    'reference_number', v_ref,
    'tracking_key', v_key
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_listing_intake(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_listing_intake(text, text, text, text, text, text) TO anon, authenticated, service_role;

COMMIT;
)
  );

CREATE OR REPLACE FUNCTION public.submit_listing_intake(
  p_listing_type text,
  p_title text,
  p_city text DEFAULT NULL,
  p_source_url text DEFAULT NULL,
  p_details text DEFAULT NULL,
  p_submitter_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_ref text;
  v_key text;
  v_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_source_url text := nullif(btrim(coalesce(p_source_url, '')), '');
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_submitter_email, ''))), '');
  v_headers json;
  v_ip text;
  v_rate_identifier text;
BEGIN
  -- Derive the rate-limit key from a verified user ID or the trusted gateway IP.
  IF auth.uid() IS NOT NULL THEN
    v_rate_identifier := 'listing_intake:usr:' || auth.uid()::text;
  ELSE
    BEGIN
      v_headers := nullif(current_setting('request.headers', true), '')::json;
      IF v_headers IS NOT NULL THEN
        v_ip := coalesce(
          nullif(trim(v_headers->>'cf-connecting-ip'), ''),
          nullif(trim(v_headers->>'x-real-ip'), '')
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
    v_rate_identifier := 'listing_intake:ip:' || md5(coalesce(v_ip, 'anon:unverified-edge-client'));
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_rate_identifier, 10, 60) THEN
    RETURN jsonb_build_object(
      'status', 'rate_limited',
      'message', 'Too many listing submissions from this connection. Please wait a minute and try again.'
    );
  END IF;

  IF p_listing_type NOT IN ('opportunity', 'venue', 'coach', 'academy', 'event', 'pickup_game', 'sport') THEN
    RAISE EXCEPTION 'Unsupported listing type' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_title) < 2 OR char_length(v_title) > 150 THEN
    RAISE EXCEPTION 'Listing title must contain between 2 and 150 characters' USING ERRCODE = '22023';
  END IF;
  IF v_city IS NOT NULL AND char_length(v_city) > 100 THEN
    RAISE EXCEPTION 'City/location must be 100 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_details IS NOT NULL AND char_length(v_details) > 2000 THEN
    RAISE EXCEPTION 'Listing details must be 2000 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_source_url IS NOT NULL AND (
    char_length(v_source_url) > 1000 OR v_source_url !~* '^https://[^[:space:]]+$'
  ) THEN
    RAISE EXCEPTION 'Source URL must be a valid HTTPS URL of 1000 characters or fewer' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND (
    char_length(v_email) > 255 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) THEN
    RAISE EXCEPTION 'Submitter email address is invalid' USING ERRCODE = '22023';
  END IF;

  v_ref := 'KHL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  v_key := encode(extensions.gen_random_bytes(24), 'hex');

  INSERT INTO public.listing_submissions (
    listing_type, title, city, source_url, details,
    reference_number, tracking_key, submitter_id, submitter_email, status
  ) VALUES (
    p_listing_type, v_title, v_city, v_source_url, v_details,
    v_ref, v_key, auth.uid(), v_email, 'pending_review'
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status', 'submitted',
    'id', v_id,
    'reference_number', v_ref,
    'tracking_key', v_key
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_listing_intake(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_listing_intake(text, text, text, text, text, text) TO anon, authenticated, service_role;

COMMIT;
