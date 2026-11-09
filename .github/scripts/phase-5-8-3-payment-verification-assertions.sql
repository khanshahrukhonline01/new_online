\set ON_ERROR_STOP on
BEGIN;
DO $phase583$
DECLARE v_def text; v_result jsonb;
BEGIN
  IF to_regprocedure('public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)') IS NULL THEN RAISE EXCEPTION 'strict Razorpay settlement adapter missing'; END IF;
  IF NOT has_function_privilege('service_role','public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)','EXECUTE')
     OR has_function_privilege('anon','public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)','EXECUTE')
     OR has_function_privilege('authenticated','public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)','EXECUTE') THEN RAISE EXCEPTION 'strict settlement adapter grants are unsafe'; END IF;
  SELECT pg_get_functiondef('public.settle_razorpay_payment_verified(text,text,text,bigint,text,text)'::regprocedure) INTO v_def;
  IF position('p_expected_amount_paisa <= 0' in v_def)=0 OR position('PROVIDER_ORDER_MISMATCH' in v_def)=0
     OR position('SETTLED_WITH_DIFFERENT_PAYMENT' in v_def)=0 OR position('amount_paise' in v_def)=0 THEN
    RAISE EXCEPTION 'strict settlement adapter is missing required guards';
  END IF;

  INSERT INTO public.khelgrid_payments (
    order_id, payment_id, customer_name, customer_phone, amount, amount_paise, currency,
    item_type, item_id, item_title, payment_gateway, payment_method, status,
    provider_order_id, metadata
  ) VALUES (
    'KG_ORD_PHASE583_TEST01', 'pay_phase583_original', 'Sandbox Test', '9999999995',
    125.50, 12550, 'INR', 'venue_booking', 'venue-phase583', 'Phase 5.8.3 fixture',
    'razorpay', 'razorpay', 'completed', 'order_phase583_fixture', '{}'::jsonb
  );

  PERFORM set_config('request.jwt.claim.role','service_role',true);
  v_result := public.settle_razorpay_payment_verified(
    'KG_ORD_PHASE583_TEST01','order_phase583_fixture','pay_phase583_original',12550,'INR','gateway_api'
  );
  IF v_result->>'status' <> 'success' OR v_result->>'is_already_settled' <> 'true' THEN
    RAISE EXCEPTION 'same payment ID must be idempotently accepted: %', v_result;
  END IF;

  v_result := public.settle_razorpay_payment_verified(
    'KG_ORD_PHASE583_TEST01','order_phase583_fixture','pay_phase583_different',12550,'INR','gateway_api'
  );
  IF v_result->>'error_code' <> 'SETTLED_WITH_DIFFERENT_PAYMENT' THEN
    RAISE EXCEPTION 'different payment ID must be rejected: %', v_result;
  END IF;

  v_result := public.settle_razorpay_payment_verified(
    'KG_ORD_PHASE583_TEST01','order_phase583_fixture','pay_phase583_original',12549,'INR','gateway_api'
  );
  IF v_result->>'error_code' <> 'AMOUNT_MISMATCH' THEN
    RAISE EXCEPTION 'amount mismatch must be rejected: %', v_result;
  END IF;
END;
$phase583$;
ROLLBACK;
