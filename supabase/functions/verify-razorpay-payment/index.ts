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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase credentials' }),
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
        JSON.stringify({ error: 'INVALID_PARAMETERS', message: 'Missing order_id, payment_id, or gateway_signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Official Razorpay verification: HMAC-SHA256(order_id + "|" + payment_id, secret)
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

    // Signature verified! Settle the transaction atomically in PostgreSQL using service_role
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await adminClient.rpc('verify_payment_transaction', {
      p_order_id: order_id.trim(),
      p_payment_id: payment_id.trim(),
      p_gateway_signature: gateway_signature.trim(),
      p_expected_amount_paisa: expected_amount_paisa || 0,
      p_expected_currency: (expected_currency || 'INR').toUpperCase(),
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: 'DATABASE_SETTLEMENT_ERROR', message: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, settlement: data }),
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
