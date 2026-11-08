import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const webhookSignature = req.headers.get('x-razorpay-signature')
  if (!webhookSignature) {
    return new Response(JSON.stringify({ error: 'MISSING_SIGNATURE' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: 'WEBHOOK_SECRET_NOT_CONFIGURED' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 1. Read raw request body before JSON parsing to calculate HMAC
  const rawBody = await req.text()
  const expectedSignature = await generateHmacSha256(rawBody, webhookSecret)

  const isValid = await timingSafeEqual(
    webhookSignature.trim().toLowerCase(),
    expectedSignature.toLowerCase()
  )

  if (!isValid) {
    return new Response(JSON.stringify({ error: 'INVALID_WEBHOOK_SIGNATURE' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Parse verified webhook event payload
  let event: {
    event: string
    payload?: {
      payment?: {
        entity?: {
          id: string
          order_id: string
          amount: number
          currency: string
          status: string
        }
      }
      order?: {
        entity?: {
          id: string
          amount: number
          currency: string
          status: string
        }
      }
    }
  }

  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'MALFORMED_JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Process payment capture or order settlement
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'SERVER_MISCONFIGURED' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const paymentEntity = event.payload?.payment?.entity
    const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id
    const paymentId = paymentEntity?.id
    const amountPaisa = paymentEntity?.amount || event.payload?.order?.entity?.amount || 0
    const currency = paymentEntity?.currency || 'INR'

    if (orderId && paymentId) {
      // Transactional settlement in PostgreSQL
      const { data, error } = await adminClient.rpc('verify_payment_transaction', {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_gateway_signature: webhookSignature,
        p_expected_amount_paisa: amountPaisa,
        p_expected_currency: currency,
      })

      if (error) {
        console.error('[Razorpay Webhook] Settlement RPC error:', error)
        return new Response(JSON.stringify({ error: 'SETTLEMENT_FAILED', details: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ status: 'settled', data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Acknowledge receipt of other webhook event types
  return new Response(JSON.stringify({ received: true, event: event.event }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
