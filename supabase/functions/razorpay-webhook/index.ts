import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { classifySettlementResult } from '../_shared/webhookSettlement.ts'
import { classifyProviderPayment, fetchRazorpayPayment } from '../_shared/razorpayVerification.ts'

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
  // Razorpay's order_id is the provider ID; the internal KhelGrid order ID is stored separately.
  const providerOrderId = (paymentEntity?.order_id || event.payload?.order?.entity?.id || '').trim()
  const paymentId = (paymentEntity?.id || '').trim()
  const amountPaisa = paymentEntity?.amount ?? event.payload?.order?.entity?.amount ?? 0
  const currency = (paymentEntity?.currency || event.payload?.order?.entity?.currency || 'INR').toUpperCase()

  // 4. Atomic Event Claim (Concurrency and Race Condition Protection)
  const { data: claimData, error: claimError } = await adminClient.rpc('claim_webhook_event', {
    p_event_id: eventId,
    p_event_type: event.event,
    p_order_id: providerOrderId || null,
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

  if (claimData?.status !== 'claimed') {
    return new Response(JSON.stringify({ error: 'EVENT_CLAIM_NOT_CONFIRMED', status: claimData?.status || 'unknown' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 5. Process Payment Capture or Order Settlement
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const paymentStatus = paymentEntity?.status

    // Verify payment status is captured
    if (event.event === 'payment.captured' && (paymentStatus !== 'captured' || paymentEntity?.captured !== true)) {
      await adminClient.rpc('finalize_webhook_event', {
        p_event_id: eventId,
        p_status: 'failed_terminal',
        p_error_message: `Payment status was ${paymentStatus || 'missing'}, expected captured`,
      })
      return new Response(JSON.stringify({ error: 'PAYMENT_NOT_CAPTURED', status: paymentStatus }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!providerOrderId || !paymentId) {
      const { error: finalizeError } = await adminClient.rpc('finalize_webhook_event', {
        p_event_id: eventId,
        p_status: 'failed_terminal',
        p_error_message: 'Captured payment event is missing provider order ID or payment ID',
      })
      if (finalizeError) {
        return new Response(JSON.stringify({ error: 'EVENT_FINALIZATION_FAILED', details: finalizeError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ status: 'quarantined', error: 'MISSING_PAYMENT_IDENTIFIERS' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    {
      // Authoritative order verification from database
      const { data: dbOrder, error: orderErr } = await adminClient
        .from('khelgrid_payments')
        .select('id, order_id, amount_paise, currency, status')
        .eq('provider_order_id', providerOrderId)
        .single()

      if (orderErr || !dbOrder) {
        await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId,
          p_status: 'failed_retryable',
          p_error_message: 'No KhelGrid payment matches this Razorpay provider order ID',
        })
        return new Response(JSON.stringify({ error: 'ORDER_NOT_FOUND', provider_order_id: providerOrderId }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const authoritativeAmountPaisa = Number(dbOrder.amount_paise)
      const authoritativeCurrency = (dbOrder.currency || 'INR').toUpperCase()
      const keyId = Deno.env.get('RAZORPAY_KEY_ID')
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
      if (!keyId || !keySecret) {
        const { error: finalizeError } = await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId, p_status: 'failed_retryable',
          p_error_message: 'Razorpay API credentials are unavailable for independent payment verification',
        })
        if (finalizeError) return new Response(JSON.stringify({ error: 'EVENT_FINALIZATION_FAILED' }), { status: 500 })
        return new Response(JSON.stringify({ error: 'PROVIDER_VERIFICATION_UNAVAILABLE' }), { status: 503 })
      }

      let providerPayment
      try {
        providerPayment = await fetchRazorpayPayment(paymentId, keyId, keySecret)
      } catch (error) {
        const { error: finalizeError } = await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId, p_status: 'failed_retryable',
          p_error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Razorpay API unavailable',
        })
        if (finalizeError) return new Response(JSON.stringify({ error: 'EVENT_FINALIZATION_FAILED' }), { status: 500 })
        return new Response(JSON.stringify({ error: 'PROVIDER_VERIFICATION_RETRY_REQUIRED' }), { status: 503 })
      }

      const providerCheck = classifyProviderPayment(providerPayment, {
        paymentId, providerOrderId, amountPaise: authoritativeAmountPaisa, currency: authoritativeCurrency,
      })
      if (providerCheck.disposition !== 'captured') {
        const terminal = providerCheck.disposition !== 'authorized'
        const { error: finalizeError } = await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId, p_status: terminal ? 'failed_terminal' : 'failed_retryable',
          p_error_message: providerCheck.reason,
        })
        if (finalizeError) return new Response(JSON.stringify({ error: 'EVENT_FINALIZATION_FAILED' }), { status: 500 })
        return new Response(JSON.stringify({ error: 'PROVIDER_PAYMENT_NOT_SETTLEABLE', status: providerCheck.disposition }), { status: terminal ? 200 : 503 })
      }

      // Cross-check signed webhook amount and currency against the authoritative ledger.
      if (!Number.isSafeInteger(amountPaisa) || amountPaisa <= 0 || amountPaisa !== authoritativeAmountPaisa) {
        await adminClient.rpc('finalize_webhook_event', {
          p_event_id: eventId,
          p_status: 'failed_terminal',
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
          p_status: 'failed_terminal',
          p_error_message: `Webhook currency (${currency}) does not match order currency (${authoritativeCurrency})`,
        })
        return new Response(JSON.stringify({ error: 'CURRENCY_MISMATCH' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Transactional settlement in PostgreSQL via canonical procedure
      const { data: settleData, error: settleError } = await adminClient.rpc('settle_razorpay_payment_verified', {
        p_order_id: dbOrder.order_id,
        p_provider_order_id: providerOrderId,
        p_payment_id: paymentId,
        p_expected_amount_paisa: authoritativeAmountPaisa,
        p_expected_currency: authoritativeCurrency,
        p_verification_source: 'webhook_verified',
      })

      const settlement = classifySettlementResult(settleData, settleError)
      const { error: finalizeError } = await adminClient.rpc('finalize_webhook_event', {
        p_event_id: eventId,
        p_status: settlement.disposition,
        p_error_message: settlement.reason || null,
        p_settlement_data: settleData ?? null,
      })

      if (finalizeError) {
        // Do not acknowledge to Razorpay: event remains recoverable and can be retried.
        return new Response(JSON.stringify({ error: 'EVENT_FINALIZATION_FAILED', details: finalizeError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (settlement.disposition === 'failed_retryable') {
        return new Response(JSON.stringify({ error: 'SETTLEMENT_RETRY_REQUIRED', details: settlement.reason }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (settlement.disposition === 'failed_terminal') {
        // Business rejection is quarantined for operator review; a blind gateway retry
        // cannot fix an amount/order/payment-ID mismatch.
        return new Response(JSON.stringify({ status: 'quarantined', reason: settlement.reason }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

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
