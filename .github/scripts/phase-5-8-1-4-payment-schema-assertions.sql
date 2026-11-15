\set ON_ERROR_STOP on

DO $$
DECLARE
  v_row record;
  v_result jsonb;
  v_attempts integer;
  v_status text;
BEGIN
  -- Exact legacy amount backfill and status preservation.
  SELECT amount, amount_paise, status INTO v_row
  FROM public.khelgrid_payments
  WHERE order_id='KG_ORD_PHASE5814_BACKFILL_01';
  IF v_row.amount <> 499.00 OR v_row.amount_paise <> 49900 OR v_row.status <> 'completed' THEN
    RAISE EXCEPTION 'legacy completed payment backfill failed: %', row_to_json(v_row);
  END IF;

  SELECT amount, amount_paise, status INTO v_row
  FROM public.khelgrid_payments
  WHERE order_id='KG_ORD_PHASE5814_BACKFILL_02';
  IF v_row.amount <> 123.45 OR v_row.amount_paise <> 12345 OR v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'legacy pending payment backfill failed: %', row_to_json(v_row);
  END IF;

  -- Legacy INR writes synchronize to integer paise.
  INSERT INTO public.khelgrid_payments (
    order_id, customer_name, customer_phone, amount, currency, item_type,
    item_id, item_title, payment_gateway, payment_method, status, metadata
  ) VALUES (
    'KG_ORD_PHASE5814_LEGACY_01', 'Test Customer', '9999999997', 123.45, 'INR',
    'venue_booking', 'venue-test', 'Legacy writer', 'mock', 'upi', 'pending', '{}'::jsonb
  );
  SELECT amount, amount_paise INTO v_row FROM public.khelgrid_payments
  WHERE order_id='KG_ORD_PHASE5814_LEGACY_01';
  IF v_row.amount <> 123.45 OR v_row.amount_paise <> 12345 THEN
    RAISE EXCEPTION 'legacy amount insert did not synchronize to paise';
  END IF;

  -- Canonical paise update synchronizes the compatibility amount.
  UPDATE public.khelgrid_payments SET amount_paise=25000
  WHERE order_id='KG_ORD_PHASE5814_LEGACY_01';
  SELECT amount, amount_paise INTO v_row FROM public.khelgrid_payments
  WHERE order_id='KG_ORD_PHASE5814_LEGACY_01';
  IF v_row.amount <> 250.00 OR v_row.amount_paise <> 25000 THEN
    RAISE EXCEPTION 'paise update did not synchronize legacy amount';
  END IF;

  -- Legacy amount update synchronizes canonical paise.
  UPDATE public.khelgrid_payments SET amount=300.50
  WHERE order_id='KG_ORD_PHASE5814_LEGACY_01';
  SELECT amount, amount_paise INTO v_row FROM public.khelgrid_payments
  WHERE order_id='KG_ORD_PHASE5814_LEGACY_01';
  IF v_row.amount <> 300.50 OR v_row.amount_paise <> 30050 THEN
    RAISE EXCEPTION 'legacy amount update did not synchronize paise';
  END IF;

  -- Mismatched dual writes must fail closed.
  BEGIN
    UPDATE public.khelgrid_payments
    SET amount=400.00, amount_paise=40100
    WHERE order_id='KG_ORD_PHASE5814_LEGACY_01';
    RAISE EXCEPTION 'mismatched amount and paise update unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'mismatched amount and paise update unexpectedly succeeded' THEN RAISE; END IF;
  END;

  -- Provider order IDs are nullable but unique when supplied.
  UPDATE public.khelgrid_payments
  SET provider_order_id='order_rzp_phase5814_unique'
  WHERE order_id='KG_ORD_PHASE5814_LEGACY_01';
  BEGIN
    UPDATE public.khelgrid_payments
    SET provider_order_id='order_rzp_phase5814_unique'
    WHERE order_id='KG_ORD_PHASE5814_BACKFILL_01';
    RAISE EXCEPTION 'duplicate provider order ID unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Webhook claims are idempotent and reject concurrent duplicate work.
  v_result := public.claim_webhook_event(
    'evt_phase5814_retry','payment.captured','KG_ORD_PHASE5814_LEGACY_01',
    'pay_phase5814_retry','{"amount":30050,"currency":"INR"}'::jsonb
  );
  IF v_result->>'status' <> 'claimed' THEN
    RAISE EXCEPTION 'first webhook claim failed: %', v_result;
  END IF;

  v_result := public.claim_webhook_event(
    'evt_phase5814_retry','payment.captured','KG_ORD_PHASE5814_LEGACY_01',
    'pay_phase5814_retry','{"amount":30050,"currency":"INR"}'::jsonb
  );
  IF v_result->>'status' <> 'processing_in_flight' THEN
    RAISE EXCEPTION 'duplicate in-flight webhook was not blocked: %', v_result;
  END IF;

  PERFORM public.finalize_webhook_event(
    'evt_phase5814_retry','failed_retryable','temporary test failure',NULL
  );
  v_result := public.claim_webhook_event(
    'evt_phase5814_retry','payment.captured','KG_ORD_PHASE5814_LEGACY_01',
    'pay_phase5814_retry','{"amount":30050,"currency":"INR"}'::jsonb
  );
  IF v_result->>'status' <> 'claimed' THEN
    RAISE EXCEPTION 'retryable webhook event could not be reclaimed: %', v_result;
  END IF;

  SELECT attempt_count INTO v_attempts FROM public.payment_webhook_events
  WHERE event_id='evt_phase5814_retry';
  IF v_attempts <> 2 THEN
    RAISE EXCEPTION 'webhook retry attempt count incorrect: %', v_attempts;
  END IF;

  PERFORM public.finalize_webhook_event(
    'evt_phase5814_retry','processed',NULL,'{"settled":false,"test":true}'::jsonb
  );
  v_result := public.claim_webhook_event(
    'evt_phase5814_retry','payment.captured','KG_ORD_PHASE5814_LEGACY_01',
    'pay_phase5814_retry','{"amount":30050,"currency":"INR"}'::jsonb
  );
  IF v_result->>'status' <> 'already_processed' THEN
    RAISE EXCEPTION 'processed webhook event was not deduplicated: %', v_result;
  END IF;

  SELECT status, attempt_count INTO v_row
  FROM public.payment_webhook_events WHERE event_id='evt_phase5814_retry';
  IF v_row.status <> 'processed' OR v_row.attempt_count <> 2 THEN
    RAISE EXCEPTION 'webhook final state or retry count is wrong';
  END IF;

  -- Only service_role can call the webhook procedures.
  IF NOT has_function_privilege('service_role','public.claim_webhook_event(text,text,text,text,jsonb)','EXECUTE')
     OR has_function_privilege('anon','public.claim_webhook_event(text,text,text,text,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.claim_webhook_event(text,text,text,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'claim_webhook_event execute privileges are incorrect';
  END IF;
  IF NOT has_function_privilege('service_role','public.finalize_webhook_event(text,text,text,jsonb)','EXECUTE')
     OR has_function_privilege('anon','public.finalize_webhook_event(text,text,text,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.finalize_webhook_event(text,text,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'finalize_webhook_event execute privileges are incorrect';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='payment_webhook_events'
      AND policyname='webhook_events_service_all' AND 'service_role'=ANY(roles)
  ) THEN
    RAISE EXCEPTION 'webhook event service-role RLS policy missing';
  END IF;
END;
$$;

-- Confirm invalid paise amounts are rejected.
DO $phase5814$
DECLARE
  v_rejected boolean := false;
BEGIN
  BEGIN
    UPDATE public.khelgrid_payments SET amount_paise=0
    WHERE order_id='KG_ORD_PHASE5814_LEGACY_01';
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'zero paise update unexpectedly succeeded';
  END IF;
END;
$phase5814$;

SELECT 'Phase 5.8.1.4 payment schema assertions passed' AS result;
