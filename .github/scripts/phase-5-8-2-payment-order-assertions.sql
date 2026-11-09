\set ON_ERROR_STOP on
BEGIN;

DO $phase582$
DECLARE
  v_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='khelgrid_payments'
      AND column_name='checkout_token_hash' AND data_type='text'
  ) THEN RAISE EXCEPTION 'checkout_token_hash column missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='khelgrid_payments'
      AND column_name='provider_order_status' AND data_type='text'
  ) THEN RAISE EXCEPTION 'provider_order_status column missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.khelgrid_payments'::regclass
      AND conname='khelgrid_payments_provider_order_status_check'
  ) THEN RAISE EXCEPTION 'provider order status constraint missing'; END IF;

  INSERT INTO public.khelgrid_payments (
    order_id, customer_name, customer_phone, amount, amount_paise, currency,
    item_type, item_id, item_title, payment_gateway, payment_method, status,
    metadata, checkout_token_hash, provider_order_status
  ) VALUES (
    'KG_ORD_PHASE582_TEST01', 'Sandbox Test', '9999999996', 125.50, 12550, 'INR',
    'venue_booking', 'venue-sandbox', 'Sandbox test payment', 'razorpay', 'razorpay',
    'pending_verification', '{}'::jsonb, repeat('a',64), 'not_created'
  );

  UPDATE public.khelgrid_payments
    SET provider_order_status='creating'
    WHERE order_id='KG_ORD_PHASE582_TEST01';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'provider order creating transition failed'; END IF;

  UPDATE public.khelgrid_payments
    SET provider_order_id='order_sandbox_fixture_01',
        provider_order_status='created',
        provider_order_created_at=now()
    WHERE order_id='KG_ORD_PHASE582_TEST01' AND provider_order_status='creating';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RAISE EXCEPTION 'provider order created transition failed'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.khelgrid_payments
    WHERE order_id='KG_ORD_PHASE582_TEST01'
      AND amount_paise=12550
      AND provider_order_id='order_sandbox_fixture_01'
      AND provider_order_status='created'
      AND checkout_token_hash=repeat('a',64)
  ) THEN RAISE EXCEPTION 'provider order lifecycle persistence failed'; END IF;

  BEGIN
    UPDATE public.khelgrid_payments SET provider_order_status='unknown_state'
    WHERE order_id='KG_ORD_PHASE582_TEST01';
    RAISE EXCEPTION 'invalid provider order state unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$phase582$;

ROLLBACK;
