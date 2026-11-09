import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { classifyProviderPayment, fetchRazorpayPayment, verifyHmacSha256, type RazorpayPayment } from '../_shared/razorpayVerification.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyPaymentPayload {
  order_id: string
  payment_id: string
  gateway_signature: string
  expected_amount_paisa?: number
  expected_currency?: string
}

interface RazorpayPaymentEntity {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  order_id: string | null
  invoice_id: string | null
  international: boolean
  method: string
  amount_refunded: number
  refund_status: string | null
  captured: boolean
  description?: string
  card_id?: string | null
  bank?: string | null
  wallet?: string | null
  vpa?: string | null
  email?: string
  contact?: string
  created_at: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'SERVER_MISCONFIGURED', message: 'Missing server database configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!keySecret) {
      return new Response(
        JSON.stringify({
          error: 'GATEWAY_NOT_CONFIGURED',
          status: 'pending_verification',
          message: 'Razorpay key secret is not configured on the server. Payment remains in pending verification.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: VerifyPaymentPayload = await req.json()
    const { order_id, payment_id, gateway_signature } = body

    if (!order_id || !payment_id || !gateway_signature) {
      return new Response(
        JSON.stringify({ error: 'INVALID_PARAMETERS', message: 'order_id, payment_id, and gateway_signature are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanOrderId = order_id.trim()
    const cleanPaymentId = payment_id.trim()
    const cleanSig = gateway_signature.trim()

    // 1. Official Razorpay checkout verification: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const payload = `${cleanOrderId}|${cleanPaymentId}`
    const isHmacValid = await verifyHmacSha256(payload, keySecret, cleanSig)

    if (!isHmacValid) {
      return new Response(
        JSON.stringify({ error: 'INVALID_SIGNATURE', message: 'Cryptographic payment signature mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch authoritative order record from database using service_role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: paymentRecord, error: fetchError } = await adminClient
      .from('khelgrid_payments')
      .select('id, order_id, provider_order_id, amount_paise, currency, status')
      .eq('provider_order_id', cleanOrderId)
      .single()

    if (fetchError || !paymentRecord) {
      return new Response(
        JSON.stringify({ error: 'ORDER_NOT_FOUND', message: 'Order record does not exist.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authoritativeAmountPaisa = Number(paymentRecord.amount_paise)
    const authoritativeCurrency = (paymentRecord.currency || 'INR').toUpperCase()

    // 3. Server-side Gateway API Capture Verification (Phase 5.6 Hardening)
    if (!keyId) {
      // Gateway key ID missing: cannot perform secondary gateway API capture check
      return new Response(
        JSON.stringify({
          error: 'GATEWAY_CREDENTIALS_MISSING',
          status: 'pending_verification',
          message: 'Razorpay key ID is not configured on the server. Payment remains in pending verification.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let rzpPayment: RazorpayPayment
    try {
      rzpPayment = await fetchRazorpayPayment(cleanPaymentId, keyId, keySecret)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Provider verification unavailable'
      return new Response(JSON.stringify({ error: 'GATEWAY_API_ERROR', status: 'pending_verification', message: message.slice(0, 200) }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const providerCheck = classifyProviderPayment(rzpPayment, {
      paymentId: cleanPaymentId, providerOrderId: cleanOrderId,
      amountPaise: authoritativeAmountPaisa, currency: authoritativeCurrency,
    })
    if (providerCheck.disposition === 'authorized') {
      return new Response(JSON.stringify({ success: false, status: 'pending_verification', error: 'PAYMENT_AUTHORIZED_NOT_CAPTURED', message: providerCheck.reason }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (providerCheck.disposition !== 'captured') {
      return new Response(JSON.stringify({
        success: false, status: providerCheck.disposition === 'refunded' ? 'refunded' : 'failed',
        error: providerCheck.disposition === 'mismatch' ? 'PROVIDER_PAYMENT_MISMATCH' : 'PAYMENT_NOT_CAPTURED',
        message: providerCheck.reason,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Settle transaction atomically in PostgreSQL via canonical procedure
    const { data: settlementData, error: settleError } = await adminClient.rpc('settle_razorpay_payment_verified', {
      p_order_id: paymentRecord.order_id,
      p_provider_order_id: cleanOrderId,
      p_payment_id: cleanPaymentId,
      p_expected_amount_paisa: authoritativeAmountPaisa,
      p_expected_currency: authoritativeCurrency,
      p_verification_source: 'gateway_api',
    })

    if (settleError) {
      return new Response(
        JSON.stringify({ error: 'SETTLEMENT_ERROR', message: settleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (settlementData?.status === 'error') {
      return new Response(
        JSON.stringify({ error: settlementData.error_code, message: settlementData.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 'completed',
        order_id: paymentRecord.order_id,
        provider_order_id: cleanOrderId,
        payment_id: cleanPaymentId,
        settlement: settlementData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
