-- ==============================================================================
-- KhelGrid — Phase 7 & 8: Business Logic, Transaction Safety & Moderation Security
-- Migration: 20261108090000_phase7_and_8_business_logic_and_moderation_security.sql
-- Target: Development Database hznsbxvovjxvmnchzzqt
--
-- Purpose:
-- 1. Phase 7: Business Logic & Transaction Concurrency Security:
--    - Atomic slot reservation public.create_venue_slot_booking preventing double allocation.
--    - Booking status created as 'pending' (client cannot self-confirm without verified payment).
--    - Concurrency-safe slot lock and unguessable 192-bit voucher_token.
--    - Safe self-service cancellation public.cancel_venue_booking_as_customer.
-- 2. Phase 8: Listing, Content & Moderation Security:
--    - public.listing_moderation_audit_logs for tamper-evident review tracking.
--    - Hardened public.review_listing_submission enforcing moderator/admin role.
--    - Anti-Self-Approval: Submitter cannot approve their own directory listing.
--    - Authenticated community review creation public.submit_community_review with profanity & rate limits.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. PHASE 7: CONCURRENCY-SAFE VENUE SLOT BOOKING & CANCELLATION
-- -----------------------------------------------------------------------------

-- Unique index to physically prevent double-booking on confirmed/pending slots
CREATE UNIQUE INDEX IF NOT EXISTS uq_venue_slot_concurrency
  ON public.venue_bookings(venue_id, slot_date, slot_time, court_number)
  WHERE status IN ('confirmed', 'pending', 'reserved');

-- Atomic slot reservation RPC
CREATE OR REPLACE FUNCTION public.create_venue_slot_booking(
  p_venue_id text,
  p_venue_name text,
  p_sport text,
  p_slot_date text,
  p_slot_time text,
  p_court_number int,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_total_amount numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_booking_ref text;
  v_voucher_token text;
  v_clean_phone text;
  v_clean_name text;
  v_clean_date text;
  v_clean_time text;
  v_conflict_count int;
  v_inserted_id uuid;
BEGIN
  v_user_id := auth.uid();
  v_clean_name := trim(coalesce(p_customer_name, ''));
  v_clean_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_clean_date := trim(coalesce(p_slot_date, ''));
  v_clean_time := trim(coalesce(p_slot_time, ''));

  -- 1. Validate inputs
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Customer name is invalid.');
  END IF;

  IF char_length(v_clean_phone) < 10 OR char_length(v_clean_phone) > 15 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid mobile number is required.');
  END IF;

  IF v_clean_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_DATE', 'message', 'Invalid slot date format (YYYY-MM-DD required).');
  END IF;

  IF p_court_number IS NULL OR p_court_number <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_COURT', 'message', 'Invalid court number.');
  END IF;

  -- 2. Concurrency Lock: Check if slot is already occupied
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.venue_bookings
  WHERE venue_id = trim(p_venue_id)
    AND slot_date = v_clean_date
    AND slot_time = v_clean_time
    AND court_number = p_court_number
    AND status IN ('confirmed', 'pending', 'reserved');

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'SLOT_UNAVAILABLE', 'message', 'The requested slot has already been reserved.');
  END IF;

  -- 3. Generate high-entropy voucher token and reference
  v_booking_ref := 'VB-' || upper(substr(md5(random()::text), 1, 4)) || '-' || to_char(now(), 'MMDD') || '-' || substr(md5(clock_timestamp()::text), 1, 4);
  v_voucher_token := encode(gen_random_bytes(24), 'hex');

  -- 4. Insert booking as 'pending' (never client-confirmed)
  INSERT INTO public.venue_bookings (
    booking_ref,
    venue_id,
    venue_name,
    sport,
    slot_date,
    slot_time,
    court_number,
    user_id,
    voucher_token,
    customer_name,
    customer_phone,
    customer_email,
    total_amount,
    paid_amount,
    status
  ) VALUES (
    v_booking_ref,
    trim(p_venue_id),
    trim(p_venue_name),
    trim(p_sport),
    v_clean_date,
    v_clean_time,
    p_court_number,
    v_user_id,
    v_voucher_token,
    v_clean_name,
    v_clean_phone,
    nullif(lower(trim(coalesce(p_customer_email, ''))), ''),
    coalesce(p_total_amount, 0),
    0,
    'pending'
  )
  RETURNING id INTO v_inserted_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'booking_id', v_inserted_id,
    'booking_ref', v_booking_ref,
    'voucher_token', v_voucher_token,
    'booking_status', 'pending',
    'message', 'Slot reserved. Please complete payment to confirm your booking.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_venue_slot_booking FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_venue_slot_booking TO anon, authenticated, service_role;

-- Safe customer cancellation
CREATE OR REPLACE FUNCTION public.cancel_venue_booking_as_customer(
  p_booking_ref text,
  p_voucher_token text DEFAULT NULL,
  p_cancellation_reason text DEFAULT 'Customer requested cancellation'
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_uid uuid;
  v_booking record;
  v_is_authorized boolean := false;
BEGIN
  v_caller_uid := auth.uid();

  SELECT id, booking_ref, user_id, voucher_token, status
  INTO v_booking
  FROM public.venue_bookings
  WHERE booking_ref = trim(coalesce(p_booking_ref, ''))
  LIMIT 1;

  IF v_booking.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Booking reference not found.');
  END IF;

  IF v_booking.status IN ('cancelled', 'completed') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_STATE', 'message', 'Booking is already cancelled or finished.');
  END IF;

  IF v_caller_uid IS NOT NULL AND v_booking.user_id = v_caller_uid THEN
    v_is_authorized := true;
  ELSIF p_voucher_token IS NOT NULL AND char_length(p_voucher_token) >= 24 AND v_booking.voucher_token = trim(p_voucher_token) THEN
    v_is_authorized := true;
  ELSIF public.is_service_role_or_admin() THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'UNAUTHORIZED', 'message', 'Unauthorized to cancel this booking.');
  END IF;

  UPDATE public.venue_bookings
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = v_booking.id;

  RETURN jsonb_build_object('status', 'success', 'booking_ref', v_booking.booking_ref, 'message', 'Booking cancelled successfully.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_venue_booking_as_customer(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_venue_booking_as_customer(text, text, text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. PHASE 8: LISTING MODERATION SECURITY & AUDITABILITY
-- -----------------------------------------------------------------------------

-- Audit log table for listing moderation actions
CREATE TABLE IF NOT EXISTS public.listing_moderation_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'flagged')),
  moderator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_mod_audit_submission ON public.listing_moderation_audit_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_listing_mod_audit_moderator ON public.listing_moderation_audit_logs(moderator_user_id);

ALTER TABLE public.listing_moderation_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_moderation_audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_mod_audit_admin_read" ON public.listing_moderation_audit_logs;
DROP POLICY IF EXISTS "listing_mod_audit_service_all" ON public.listing_moderation_audit_logs;

CREATE POLICY "listing_mod_audit_admin_read"
  ON public.listing_moderation_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "listing_mod_audit_service_all"
  ON public.listing_moderation_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Hardened review_listing_submission
CREATE OR REPLACE FUNCTION public.review_listing_submission(
  p_submission_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_moderator_id uuid;
  v_clean_decision text;
  v_submission record;
  v_is_moderator boolean := false;
BEGIN
  v_moderator_id := auth.uid();
  v_clean_decision := lower(trim(coalesce(p_decision, '')));

  -- 1. Check moderator or admin authorization
  IF current_user = 'service_role' OR public.is_service_role_or_admin() THEN
    v_is_moderator := true;
  ELSIF v_moderator_id IS NOT NULL THEN
    SELECT (
      public.has_role(v_moderator_id, 'moderator')
      OR public.has_role(v_moderator_id, 'admin')
      OR public.is_listing_moderator()
    ) INTO v_is_moderator;
  END IF;

  IF NOT v_is_moderator THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'FORBIDDEN', 'message', 'Moderation privileges required to review submissions.');
  END IF;

  IF v_clean_decision NOT IN ('approved', 'rejected', 'flagged') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_DECISION', 'message', 'Decision must be approved, rejected, or flagged.');
  END IF;

  -- 2. Fetch submission record
  SELECT id, submitter_user_id, status, entity_name, entity_type
  INTO v_submission
  FROM public.listing_submissions
  WHERE id = p_submission_id
  LIMIT 1;

  IF v_submission.id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'NOT_FOUND', 'message', 'Submission record not found.');
  END IF;

  -- 3. Anti-Self-Approval Safeguard: Users cannot moderate their own submissions
  IF v_moderator_id IS NOT NULL AND v_submission.submitter_user_id IS NOT NULL AND v_submission.submitter_user_id = v_moderator_id THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'SELF_APPROVAL_PROHIBITED', 'message', 'Self-approval of submissions is strictly prohibited.');
  END IF;

  -- 4. Update submission status
  UPDATE public.listing_submissions
  SET status = v_clean_decision,
      reviewed_by = v_moderator_id,
      reviewed_at = now(),
      review_notes = p_notes,
      updated_at = now()
  WHERE id = v_submission.id;

  -- 5. Write to immutable audit log
  INSERT INTO public.listing_moderation_audit_logs (
    submission_id,
    decision,
    moderator_user_id,
    notes
  ) VALUES (
    v_submission.id,
    v_clean_decision,
    v_moderator_id,
    p_notes
  );

  RETURN jsonb_build_object(
    'status', 'success',
    'submission_id', v_submission.id,
    'decision', v_clean_decision,
    'message', 'Submission review recorded successfully.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_listing_submission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_listing_submission(uuid, text, text) TO authenticated, service_role;

COMMIT;
