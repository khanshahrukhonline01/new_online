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

async function sha256Hex(content: string): Promise<string> {
  const enc = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(content))
  return Array.from(new Uint8Array(digest))
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

  // 1. Read raw request body before parsing to verify HMAC-SHA256
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
    entity?: string
    account_id?: string
    event: string
    id?: string
    event_id?: string
    contains?: string[]
    payload?: {
      payment?: {
        entity?: {
          id: string
          order_id: string
          amount: number
          currency: string
          status: string
          captured: boolean
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
    created_at?: number
  }

  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'MALFORMED_JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'SERVER_MISCONFIGURED' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // 3. Deterministic Event Identification
  const suppliedEventId = req.headers.get('x-razorpay-event-id') || event.event_id || event.id
  const eventId = suppliedEventId
    ? suppliedEventId.trim()
    : `body_hash_${await sha256Hex(rawBody)}`

  const paymentEntity = event.payload?.payment?.entity
  const orderId = (paymentEntity?.order_id || event.payload?.order?.entity?.id || '').trim()
  const paymentId = (paymentEntity?.id || '').trim()
  const amountPaisa = paymentEntity?.amount || event.payload?.order?.entity?.amount || 0
  const currency = (paymentEntity?.currency || event.payload?.order?.entity?.currency || 'INR').toUpperCase()

  // 4. Atomic Event Claim (Concurrency and Race Condition Protection)
  const { data: claimData, error: claimError } = await adminClient.rpc('claim_webhook_event', {
    p_event_id: eventId,
    p_event_type: event.event,
    p_order_id: orderId || null,
    p_payment_id: paymentId || null,
    p_payload_summary: {
      amount: amountPaisa,
      currency,
      received_at: new Date().toISOString(),
    },
  })

  if (claimError) {
    // Return 500 so gateway retries delivery on transient database error
    return new Response(JSON.stringify({ error: 'EVENT_CLAIM_FAILED', details: claimError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (claimData?.status === 'already_processed') {
    return new Response(JSON.stringify({ status: 'already_processed', event_id: eventId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (claimData?.status === 'ignored') {
    return new Response(JSON.stringify({ status: 'ignored', event_id: eventId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (claimData?.status === 'processing_in_flight') {
    return new Response(JSON.stringify({ status: 'processing_in_flight', event_id: eventId }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 5. Process Payment Capture or Order Settlement
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const paymentStatus = paymentEntity?.status

    // Verify payment status is captured
    if (event.event === 'payment.captured' && paymentStatus && paymentStatus !== 'captured') {
      await adminClient.rpc('finalize_webhook_event', {
        p_event_id: eventId,
        p_status: 'ignored',
        p_error_message: `Payment status was ${paymentStatus}, expected captured`,
      })
      return new Response(JSON.stringify({ error: 'PAYMENT_NOT_CAPTURED', status: paymentStatus }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (orderId && paymentId) {
      // Authoritative order verification from database
      const { data: dbOrder, error: orderErr } = await adminClient
        .from('khelgrid_payments')
        .select('id, amount, currency, status')
        .eq('order_id', orderId)
        .single()

      if (orderErr || !dbOrder) {
        await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId,
          p_status: 'failed_retryable',
          p_error_message: 'Associated order record not found in database',
        })
        return new Response(JSON.stringify({ error: 'ORDER_NOT_FOUND', order_id: orderId }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const authoritativeAmountPaisa = Math.round(Number(dbOrder.amount) * 100)
      const authoritativeCurrency = (dbOrder.currency || 'INR').toUpperCase()

      // Cross-check payload amount and currency
      if (amountPaisa > 0 && amountPaisa !== authoritativeAmountPaisa) {
        await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId,
          p_status: 'ignored',
          p_error_message: `Webhook amount (${amountPaisa}) does not match order amount (${authoritativeAmountPaisa})`,
        })
        return new Response(JSON.stringify({ error: 'AMOUNT_MISMATCH' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (currency !== authoritativeCurrency) {
        await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId,
          p_status: 'ignored',
          p_error_message: `Webhook currency (${currency}) does not match order currency (${authoritativeCurrency})`,
        })
        return new Response(JSON.stringify({ error: 'CURRENCY_MISMATCH' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Transactional settlement in PostgreSQL via canonical procedure
      const { data: settleData, error: settleError } = await adminClient.rpc('settle_payment_transaction', {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_verification_source: 'webhook_verified',
        p_gateway_signature: null,
        p_expected_amount_paisa: authoritativeAmountPaisa,
        p_expected_currency: authoritativeCurrency,
      })

      if (settleError) {
        await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId,
          p_status: 'failed_retryable',
          p_error_message: settleError.message,
        })
        return new Response(JSON.stringify({ error: 'SETTLEMENT_FAILED', details: settleError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Check if settlement quarantined payment or succeeded
      await adminClient.rpc('finalize_webhook_event', {
        p_event_id: eventId,
        p_status: 'processed',
        p_error_message: settleData?.status === 'error' ? settleData.message : null,
        p_settlement_data: settleData,
      })

      return new Response(JSON.stringify({ status: 'settled', data: settleData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Record non-settlement event as ignored
  await adminClient.rpc('finalize_webhook_event', {
    p_event_id: eventId,
    p_status: 'ignored',
    p_error_message: 'Event type not handled for payment settlement',
  })

  return new Response(JSON.stringify({ received: true, event: event.event }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
