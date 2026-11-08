import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const aBuf = enc.encode(a)
  const bBuf = enc.encode(b)
  if (aBuf.byteLength !== bBuf.byteLength) {
    return false
  }
  let diff = 0
  for (let i = 0; i < aBuf.byteLength; i++) {
    diff |= aBuf[i] ^ bBuf[i]
  }
  return diff === 0
}

async function generateHmacSha256(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
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
          message: 'Razorpay key secret is not configured on the server. Payment remains pending.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: VerifyPaymentPayload = await req.json()
    const { order_id, payment_id, gateway_signature, expected_amount_paisa, expected_currency } = body

    if (!order_id || !payment_id || !gateway_signature) {
      return new Response(
        JSON.stringify({ error: 'INVALID_PARAMETERS', message: 'order_id, payment_id, and gateway_signature are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Official Razorpay checkout verification: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const payload = `${order_id.trim()}|${payment_id.trim()}`
    const expectedSignature = await generateHmacSha256(payload, keySecret)

    const isValid = await timingSafeEqual(
      gateway_signature.trim().toLowerCase(),
      expectedSignature.toLowerCase()
    )

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'INVALID_SIGNATURE', message: 'Cryptographic payment signature mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch authoritative order record from database using service_role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: paymentRecord, error: fetchError } = await adminClient
      .from('khelgrid_payments')
      .select('id, order_id, amount, currency, status')
      .eq('order_id', order_id.trim())
      .single()

    if (fetchError || !paymentRecord) {
      return new Response(
        JSON.stringify({ error: 'ORDER_NOT_FOUND', message: 'Order record does not exist.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authoritative amount in paise derived strictly from database record
    const authoritativeAmountPaisa = Math.round(Number(paymentRecord.amount) * 100)
    const authoritativeCurrency = (paymentRecord.currency || 'INR').toUpperCase()

    if (expected_amount_paisa && expected_amount_paisa !== authoritativeAmountPaisa) {
      return new Response(
        JSON.stringify({
          error: 'AMOUNT_MISMATCH',
          message: `Supplied amount (${expected_amount_paisa}) does not match authoritative order amount (${authoritativeAmountPaisa}).`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (expected_currency && expected_currency.toUpperCase() !== authoritativeCurrency) {
      return new Response(
        JSON.stringify({ error: 'CURRENCY_MISMATCH', message: 'Currency mismatch.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Settle transaction atomically in PostgreSQL via canonical procedure
    const { data: settlementData, error: settleError } = await adminClient.rpc('settle_payment_transaction', {
      p_order_id: order_id.trim(),
      p_payment_id: payment_id.trim(),
      p_verification_source: 'checkout_hmac',
      p_gateway_signature: gateway_signature.trim(),
      p_expected_amount_paisa: authoritativeAmountPaisa,
      p_expected_currency: authoritativeCurrency,
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
        order_id: order_id.trim(),
        payment_id: payment_id.trim(),
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
