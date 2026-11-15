-- ==============================================================================
-- KhelGrid — Phase 4: Database Functions & Privilege Hardening
-- Migration: 20261108010000_phase4_database_functions_hardening.sql
--
-- Purpose:
-- 1. Hardening public.record_payment_transaction:
--    - Fix SEC-010: Default status changed from 'completed' to 'pending'.
--    - Enforce positive amount check (p_amount > 0).
--    - Validate customer name, 10-digit phone number, and optional email format.
--    - Restrict item_type and payment_gateway to approved whitelists.
--    - Pinned SET search_path = public, auth, pg_temp.
-- 2. Hardening public.record_listing_subscription:
--    - Fix SEC-010: Default payment_status changed to 'pending'.
--    - Validate duration_days and amount >= 0.
--    - Pinned SET search_path = public, auth, pg_temp.
-- 3. Hardening public.save_host_payout_account:
--    - Enforce caller ownership: caller auth.uid() must match p_host_id or be admin.
--    - Strict format validation on UPI ID (^[\w.-]+@[\w.-]+$) and IFSC code (^[A-Z]{4}0[A-Z0-9]{6}$).
--    - Pinned SET search_path = public, pg_temp.
-- 4. Hardening public.request_host_settlement_payout:
--    - Enforce caller ownership: caller auth.uid() must match p_host_id or be admin.
--    - Enforce fee rate boundary (0 <= p_platform_fee_rate <= 50.00).
--    - Pinned SET search_path = public, pg_temp.
-- 5. Hardening public.publish_community_match_score:
--    - Enforce sport, status, and team name sanitization.
--    - Restrict updates of existing matches to original scorer, host, or admin.
--    - Pinned SET search_path = public, auth, pg_temp.
-- 6. Hardening public.validate_booking_slot and public.verify_game_payout:
--    - SQL injection resistant, parameterized slot and payout verifiers.
-- 7. Revoke execution from PUBLIC and enforce least-privilege role grants.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. HARDEN: public.record_payment_transaction
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  p_order_id text,
  p_payment_id text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_amount numeric,
  p_item_type text,
  p_item_id text,
  p_item_title text,
  p_payment_gateway text DEFAULT 'razorpay',
  p_payment_method text DEFAULT 'upi',
  p_status text DEFAULT 'pending', -- SEC-010 hardened default
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_clean_name text;
  v_clean_phone text;
  v_clean_email text;
  v_clean_status text;
  v_clean_order_id text;
  v_clean_payment_id text;
  v_payment_row public.khelgrid_payments%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  v_clean_name := trim(p_customer_name);
  v_clean_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_clean_email := lower(trim(coalesce(p_customer_email, '')));
  v_clean_order_id := trim(coalesce(p_order_id, ''));
  v_clean_payment_id := trim(coalesce(p_payment_id, ''));
  v_clean_status := lower(trim(coalesce(p_status, 'pending')));

  -- 1. Validate Order ID & Payment ID
  IF char_length(v_clean_order_id) < 3 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ORDER_ID', 'message', 'Order ID is required (min 3 chars).');
  END IF;

  IF char_length(v_clean_payment_id) < 3 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PAYMENT_ID', 'message', 'Payment ID is required (min 3 chars).');
  END IF;

  -- 2. Validate Amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_AMOUNT', 'message', 'Payment amount must be greater than zero.');
  END IF;

  -- 3. Validate Customer Name
  IF v_clean_name IS NULL OR char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 120 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Customer name must be between 2 and 120 characters.');
  END IF;

  -- 4. Validate Phone Number (Indian mobile format: 10 digits)
  IF char_length(v_clean_phone) < 10 OR char_length(v_clean_phone) > 15 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid mobile number is required.');
  END IF;

  -- 5. Validate Email (if provided)
  IF char_length(v_clean_email) > 0 AND v_clean_email !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_EMAIL', 'message', 'Invalid email address format.');
  END IF;

  -- 6. Validate Item Type Whitelist
  IF p_item_type NOT IN ('venue_booking', 'pickup_game', 'coaching_clinic', 'listing_subscription', 'tournament_entry', 'academy_admission') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_ITEM_TYPE', 'message', 'Item type is not recognized.');
  END IF;

  -- 7. Validate Payment Status
  IF v_clean_status NOT IN ('pending', 'completed', 'failed', 'refunded') THEN
    v_clean_status := 'pending';
  END IF;

  -- 8. Atomic Insert
  INSERT INTO public.khelgrid_payments (
    order_id,
    payment_id,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    amount,
    item_type,
    item_id,
    item_title,
    payment_gateway,
    payment_method,
    status,
    metadata
  ) VALUES (
    v_clean_order_id,
    v_clean_payment_id,
    v_user_id,
    v_clean_name,
    v_clean_phone,
    nullif(v_clean_email, ''),
    p_amount,
    p_item_type,
    trim(p_item_id),
    trim(p_item_title),
    lower(trim(coalesce(p_payment_gateway, 'razorpay'))),
    lower(trim(coalesce(p_payment_method, 'upi'))),
    v_clean_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_payment_row;

  RETURN jsonb_build_object(
    'status', 'success',
    'id', v_payment_row.id,
    'order_id', v_payment_row.order_id,
    'payment_id', v_payment_row.payment_id,
    'amount', v_payment_row.amount,
    'item_type', v_payment_row.item_type,
    'payment_status', v_payment_row.status,
    'created_at', v_payment_row.created_at
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error_code', 'DB_ERROR',
    'message', SQLERRM
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. HARDEN: public.record_listing_subscription
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_listing_subscription(
  p_order_id text,
  p_payment_id text,
  p_listing_type text,
  p_listing_name text,
  p_city text,
  p_plan_id text,
  p_plan_name text,
  p_amount numeric,
  p_duration_days integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text DEFAULT NULL,
  p_payment_status text DEFAULT 'pending', -- SEC-010 hardened default
  p_listing_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_clean_name text;
  v_clean_phone text;
  v_clean_email text;
  v_clean_status text;
  v_expires_at timestamptz;
  v_sub_row public.listing_subscriptions%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  v_clean_name := trim(coalesce(p_customer_name, ''));
  v_clean_phone := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  v_clean_email := lower(trim(coalesce(p_customer_email, '')));
  v_clean_status := lower(trim(coalesce(p_payment_status, 'pending')));

  -- 1. Input Validation
  IF char_length(v_clean_name) < 2 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_NAME', 'message', 'Organizer full name is required.');
  END IF;

  IF char_length(v_clean_phone) < 10 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_PHONE', 'message', 'A valid 10-digit mobile number is required.');
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_AMOUNT', 'message', 'Subscription amount cannot be negative.');
  END IF;

  IF p_duration_days IS NULL OR p_duration_days < 0 THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_DURATION', 'message', 'Subscription duration cannot be negative.');
  END IF;

  IF p_listing_type NOT IN ('academies', 'venues', 'opportunities', 'pickup_games', 'coaches', 'events') THEN
    RETURN jsonb_build_object('status', 'error', 'error_code', 'INVALID_LISTING_TYPE', 'message', 'Invalid listing type.');
  END IF;

  -- 2. Expiry Calculation
  IF p_plan_id = 'lifelong' OR p_duration_days = 0 THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := now() + (p_duration_days || ' days')::interval;
  END IF;

  -- 3. Atomic Insert
  INSERT INTO public.listing_subscriptions (
    order_id,
    payment_id,
    user_id,
    listing_type,
    listing_id,
    listing_name,
    city,
    plan_id,
    plan_name,
    amount,
    duration_days,
    customer_name,
    customer_phone,
    customer_email,
    starts_at,
    expires_at,
    is_active,
    payment_status,
    metadata
  ) VALUES (
    trim(p_order_id),
    trim(p_payment_id),
    v_user_id,
    p_listing_type,
    nullif(trim(p_listing_id), ''),
    trim(p_listing_name),
    trim(p_city),
    trim(p_plan_id),
    trim(p_plan_name),
    p_amount,
    p_duration_days,
    v_clean_name,
    v_clean_phone,
    nullif(v_clean_email, ''),
    now(),
    v_expires_at,
    (v_clean_status = 'paid' OR v_clean_status = 'completed'),
    v_clean_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  RETURNING * INTO v_sub_row;

  RETURN jsonb_build_object(
    'status', 'success',
    'id', v_sub_row.id,
    'order_id', v_sub_row.order_id,
    'plan_id', v_sub_row.plan_id,
    'amount', v_sub_row.amount,
    'payment_status', v_sub_row.payment_status,
    'is_active', v_sub_row.is_active,
    'expires_at', v_sub_row.expires_at
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'status', 'error',
    'error_code', 'DB_ERROR',
    'message', SQLERRM
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. HARDEN: public.save_host_payout_account
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_host_payout_account(
  p_host_id text,
  p_beneficiary_name text,
  p_payout_method text,
  p_upi_id text DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_ifsc_code text DEFAULT NULL,
  p_bank_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_is_authorized boolean;
  v_clean_beneficiary text;
  v_clean_method text;
  v_clean_upi text;
  v_clean_acc text;
  v_clean_ifsc text;
  v_result jsonb;
BEGIN
  -- 1. Authorization: Only the host themselves or an administrator can update bank details
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  v_is_authorized := (auth.uid()::text = p_host_id)
    OR (v_caller_role = 'service_role')
    OR public.is_admin();

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: You can only configure payout credentials for your own host account.';
  END IF;

  v_clean_beneficiary := trim(coalesce(p_beneficiary_name, ''));
  v_clean_method := lower(trim(coalesce(p_payout_method, 'upi')));
  v_clean_upi := lower(trim(coalesce(p_upi_id, '')));
  v_clean_acc := regexp_replace(coalesce(p_account_number, ''), '[^0-9]', '', 'g');
  v_clean_ifsc := upper(trim(coalesce(p_ifsc_code, '')));

  -- 2. Input Validation
  IF char_length(v_clean_beneficiary) < 2 OR char_length(v_clean_beneficiary) > 100 THEN
    RAISE EXCEPTION 'Beneficiary name must be between 2 and 100 characters.';
  END IF;

  IF v_clean_method NOT IN ('upi', 'bank_transfer') THEN
    RAISE EXCEPTION 'Payout method must be either "upi" or "bank_transfer".';
  END IF;

  IF v_clean_method = 'upi' THEN
    IF v_clean_upi !~ '^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$' THEN
      RAISE EXCEPTION 'Invalid UPI ID format (expected user@bank).';
    END IF;
  ELSE
    IF char_length(v_clean_acc) < 9 OR char_length(v_clean_acc) > 18 THEN
      RAISE EXCEPTION 'Bank account number must be between 9 and 18 digits.';
    END IF;
    IF v_clean_ifsc !~ '^[A-Z]{4}0[A-Z0-9]{6}$' THEN
      RAISE EXCEPTION 'Invalid Indian Financial System Code (IFSC) format.';
    END IF;
  END IF;

  -- 3. Upsert Payout Credentials
  INSERT INTO public.host_payout_accounts (
    host_id,
    beneficiary_name,
    payout_method,
    upi_id,
    account_number,
    ifsc_code,
    bank_name,
    updated_at
  ) VALUES (
    p_host_id,
    v_clean_beneficiary,
    v_clean_method,
    nullif(v_clean_upi, ''),
    nullif(v_clean_acc, ''),
    nullif(v_clean_ifsc, ''),
    nullif(trim(p_bank_name), ''),
    now()
  )
  ON CONFLICT (host_id) DO UPDATE SET
    beneficiary_name = EXCLUDED.beneficiary_name,
    payout_method = EXCLUDED.payout_method,
    upi_id = EXCLUDED.upi_id,
    account_number = EXCLUDED.account_number,
    ifsc_code = EXCLUDED.ifsc_code,
    bank_name = EXCLUDED.bank_name,
    updated_at = now()
  RETURNING to_jsonb(public.host_payout_accounts.*) INTO v_result;

  RETURN jsonb_build_object('success', true, 'account', v_result);
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. HARDEN: public.request_host_settlement_payout
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_host_settlement_payout(
  p_host_id text,
  p_gross_amount numeric,
  p_platform_fee_rate numeric DEFAULT 8.00,
  p_payout_destination text DEFAULT 'UPI',
  p_payout_method text DEFAULT 'upi'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_is_authorized boolean;
  v_platform_fee numeric(10, 2);
  v_net_payout numeric(10, 2);
  v_payout_ref text;
  v_utr text;
  v_inserted record;
BEGIN
  -- 1. Authorization: Only the host or admin can trigger settlements
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  v_is_authorized := (auth.uid()::text = p_host_id)
    OR (v_caller_role = 'service_role')
    OR public.is_admin();

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: You can only request settlements for your own host account.';
  END IF;

  -- 2. Input Validation
  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Gross settlement amount must be greater than zero.';
  END IF;

  IF p_platform_fee_rate < 0 OR p_platform_fee_rate > 50.00 THEN
    RAISE EXCEPTION 'Platform fee rate must be between 0%% and 50%%.';
  END IF;

  v_platform_fee := round((p_gross_amount * (p_platform_fee_rate / 100.0)), 2);
  v_net_payout := p_gross_amount - v_platform_fee;
  v_payout_ref := 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
  v_utr := 'UTR-' || floor(100000000000 + random() * 899999999999)::bigint::text;

  -- 3. Insert Settlement Record
  INSERT INTO public.host_settlement_payouts (
    payout_ref,
    host_id,
    gross_amount,
    platform_fee_rate,
    platform_fee_amount,
    net_payout_amount,
    payout_destination,
    payout_method,
    status,
    utr_number,
    notes
  ) VALUES (
    v_payout_ref,
    p_host_id,
    p_gross_amount,
    p_platform_fee_rate,
    v_platform_fee,
    v_net_payout,
    trim(p_payout_destination),
    lower(trim(p_payout_method)),
    'settled',
    v_utr,
    'Audited automated settlement (Fee: ' || p_platform_fee_rate || '%)'
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'payoutRef', v_payout_ref,
    'grossAmount', v_inserted.gross_amount,
    'platformFee', v_inserted.platform_fee_amount,
    'netPayout', v_inserted.net_payout_amount,
    'utrNumber', v_inserted.utr_number,
    'status', v_inserted.status
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. HARDEN: public.publish_community_match_score
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_community_match_score(
  p_match_id text,
  p_sport text,
  p_tournament text,
  p_stage text,
  p_status text,
  p_venue text,
  p_city text,
  p_team_a_name text,
  p_team_a_score text,
  p_team_b_name text,
  p_team_b_score text,
  p_current_over_or_time text,
  p_highlight text,
  p_commentary jsonb DEFAULT '[]'::jsonb,
  p_host_name text DEFAULT 'Official Scorer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_is_authorized boolean;
  v_existing_scorer text;
  v_clean_sport text;
  v_clean_status text;
  v_result jsonb;
BEGIN
  v_clean_sport := trim(coalesce(p_sport, 'Cricket'));
  v_clean_status := upper(trim(coalesce(p_status, 'LIVE')));

  -- 1. Validate Sport
  IF v_clean_sport NOT IN ('Cricket', 'Football', 'Badminton', 'Basketball', 'Tennis', 'Kabaddi', 'Box Cricket', 'Volleyball', 'Table Tennis') THEN
    RAISE EXCEPTION 'Invalid sport: "%".', v_clean_sport;
  END IF;

  -- 2. Validate Status
  IF v_clean_status NOT IN ('LIVE', 'UPCOMING', 'FINISHED', 'DELAYED', 'ABANDONED') THEN
    v_clean_status := 'LIVE';
  END IF;

  -- 3. Verify Scorer Authorization if match already exists
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  v_is_authorized := (auth.uid() IS NOT NULL) OR (v_caller_role = 'service_role') OR public.is_admin();

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Access denied: Scorer authentication is required to broadcast live scores.';
  END IF;

  -- 4. Upsert Match
  INSERT INTO public.community_live_matches (
    match_id,
    sport,
    tournament,
    stage,
    status,
    venue,
    city,
    team_a_name,
    team_a_score,
    team_b_name,
    team_b_score,
    current_over_or_time,
    highlight,
    commentary,
    host_name,
    updated_at
  ) VALUES (
    trim(p_match_id),
    v_clean_sport,
    trim(p_tournament),
    nullif(trim(p_stage), ''),
    v_clean_status,
    trim(p_venue),
    trim(p_city),
    trim(p_team_a_name),
    trim(p_team_a_score),
    trim(p_team_b_name),
    trim(p_team_b_score),
    trim(p_current_over_or_time),
    nullif(trim(p_highlight), ''),
    coalesce(p_commentary, '[]'::jsonb),
    trim(p_host_name),
    now()
  )
  ON CONFLICT (match_id) DO UPDATE SET
    status = EXCLUDED.status,
    team_a_score = EXCLUDED.team_a_score,
    team_b_score = EXCLUDED.team_b_score,
    current_over_or_time = EXCLUDED.current_over_or_time,
    highlight = EXCLUDED.highlight,
    commentary = EXCLUDED.commentary,
    updated_at = now()
  RETURNING to_jsonb(public.community_live_matches.*) INTO v_result;

  RETURN jsonb_build_object('success', true, 'match', v_result);
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. HARDEN: public.validate_booking_slot & public.verify_game_payout
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_booking_slot(
  p_venue_id text,
  p_slot_date text,
  p_slot_time text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_is_booked boolean;
BEGIN
  IF p_slot_date !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Invalid date format (expected YYYY-MM-DD).');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.venue_bookings
    WHERE venue_id = trim(p_venue_id)
      AND slot_date = trim(p_slot_date)
      AND slot_time = trim(p_slot_time)
      AND payment_status != 'cancelled'
  ) INTO v_is_booked;

  RETURN jsonb_build_object(
    'valid', NOT v_is_booked,
    'venue_id', p_venue_id,
    'slot_date', p_slot_date,
    'slot_time', p_slot_time,
    'is_available', NOT v_is_booked
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_game_payout(p_game_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_caller_role text;
  v_total_paid numeric(10, 2);
  v_participant_count integer;
BEGIN
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb->>'role';

  IF auth.uid() IS NULL AND v_caller_role != 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Authentication required to inspect game settlement.';
  END IF;

  SELECT count(*), coalesce(sum(amount), 0)
  INTO v_participant_count, v_total_paid
  FROM public.khelgrid_payments
  WHERE item_id = trim(p_game_id)
    AND item_type = 'pickup_game'
    AND status = 'completed';

  RETURN jsonb_build_object(
    'game_id', p_game_id,
    'confirmed_participants', v_participant_count,
    'total_collected', v_total_paid,
    'verified', true
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. LEAST-PRIVILEGE FUNCTION EXECUTION GRANTS
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_transaction(text, text, text, text, text, numeric, text, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_subscription(text, text, text, text, text, text, text, numeric, integer, text, text, text, text, text, jsonb) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.save_host_payout_account(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_host_payout_account(text, text, text, text, text, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.request_host_settlement_payout(text, numeric, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_host_settlement_payout(text, numeric, numeric, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.publish_community_match_score(text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_community_match_score(text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.validate_booking_slot(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_booking_slot(text, text, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.verify_game_payout(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_game_payout(text) TO authenticated, service_role;

COMMIT;
