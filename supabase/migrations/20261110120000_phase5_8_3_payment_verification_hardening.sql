BEGIN;
CREATE OR REPLACE FUNCTION public.settle_razorpay_payment_verified(
  p_order_id text, p_provider_order_id text, p_payment_id text,
  p_expected_amount_paisa bigint, p_expected_currency text, p_verification_source text
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role text;
  v_payment record;
BEGIN
  v_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), auth.role());
  IF v_role <> 'service_role' AND NOT public.is_service_role_or_admin() THEN
    RETURN jsonb_build_object('status','error','error_code','UNAUTHORIZED','message','Service role required.');
  END IF;
  IF nullif(trim(coalesce(p_order_id,'')),'') IS NULL OR nullif(trim(coalesce(p_provider_order_id,'')),'') IS NULL
     OR nullif(trim(coalesce(p_payment_id,'')),'') IS NULL OR p_expected_amount_paisa IS NULL OR p_expected_amount_paisa <= 0
     OR upper(trim(coalesce(p_expected_currency,''))) = '' OR p_verification_source NOT IN ('gateway_api','webhook_verified') THEN
    RETURN jsonb_build_object('status','error','error_code','INVALID_PARAMETERS','message','All provider identifiers, positive paise amount, currency and trusted verification source are required.');
  END IF;
  SELECT id, order_id, payment_id, provider_order_id, amount_paise, round(amount * 100)::bigint AS amount_from_rupees, currency, status
    INTO v_payment FROM public.khelgrid_payments WHERE order_id = trim(p_order_id) FOR UPDATE;
  IF v_payment.id IS NULL THEN RETURN jsonb_build_object('status','error','error_code','ORDER_NOT_FOUND','message','KhelGrid payment order not found.'); END IF;
  IF v_payment.provider_order_id IS DISTINCT FROM trim(p_provider_order_id) THEN
    RETURN jsonb_build_object('status','error','error_code','PROVIDER_ORDER_MISMATCH','message','Provider order does not belong to this KhelGrid order.');
  END IF;
  IF v_payment.amount_paise <> p_expected_amount_paisa OR v_payment.amount_from_rupees <> p_expected_amount_paisa THEN
    RETURN jsonb_build_object('status','error','error_code','AMOUNT_MISMATCH','message','Expected amount must exactly match the paise ledger and rupee amount.');
  END IF;
  IF upper(v_payment.currency) <> upper(trim(p_expected_currency)) THEN RETURN jsonb_build_object('status','error','error_code','CURRENCY_MISMATCH','message','Currency does not match the KhelGrid order.'); END IF;
  IF v_payment.status = 'completed' THEN
    IF v_payment.payment_id = trim(p_payment_id) THEN
      RETURN jsonb_build_object('status','success','is_already_settled',true,'order_id',v_payment.order_id,'provider_order_id',v_payment.provider_order_id,'payment_id',v_payment.payment_id);
    END IF;
    RETURN jsonb_build_object('status','error','error_code','SETTLED_WITH_DIFFERENT_PAYMENT','message','This order is already settled with a different provider payment ID.');
  END IF;
  IF v_payment.status NOT IN ('pending','pending_verification') THEN RETURN jsonb_build_object('status','error','error_code','ORDER_NOT_SETTLEABLE','message','Order status is not eligible for settlement.'); END IF;
  IF EXISTS (SELECT 1 FROM public.khelgrid_payments p WHERE p.payment_id = trim(p_payment_id) AND p.id <> v_payment.id) THEN
    RETURN jsonb_build_object('status','error','error_code','DUPLICATE_PAYMENT_ID','message','Provider payment ID is already linked to another order.');
  END IF;
  RETURN public.settle_payment_transaction(
    p_order_id := trim(p_order_id), p_payment_id := trim(p_payment_id),
    p_verification_source := p_verification_source, p_gateway_signature := NULL,
    p_expected_amount_paisa := p_expected_amount_paisa, p_expected_currency := upper(trim(p_expected_currency))
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.settle_razorpay_payment_verified(text,text,text,bigint,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_razorpay_payment_verified(text,text,text,bigint,text,text) TO service_role;
COMMENT ON FUNCTION public.settle_razorpay_payment_verified(text,text,text,bigint,text,text) IS 'Strict Razorpay settlement adapter. Requires exact internal/provider order, payment ID, amount_paise, currency and service-role verification.';
COMMIT;
