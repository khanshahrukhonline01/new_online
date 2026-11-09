import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2, '0')).join('')
}

interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  // This endpoint is deliberately disabled until the development operator
  // explicitly enables sandbox checkout and installs test-mode credentials.
  if (Deno.env.get('RAZORPAY_CHECKOUT_ENABLED') !== 'true') {
    return json({ error: 'CHECKOUT_DISABLED' }, 503)
  }
  if (Deno.env.get('RAZORPAY_MODE') !== 'test') {
    return json({ error: 'TEST_MODE_REQUIRED' }, 503)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!supabaseUrl || !serviceRoleKey || !keyId || !keySecret) {
    return json({ error: 'SERVER_MISCONFIGURED' }, 503)
  }
  if (!keyId.startsWith('rzp_test_')) return json({ error: 'NON_TEST_RAZORPAY_KEY_REJECTED' }, 503)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'INVALID_JSON' }, 400)
  }

  const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : ''
  const checkoutToken = typeof body.checkout_token === 'string' ? body.checkout_token.trim() : ''
  if (!/^KG_ORD_[A-Z0-9]+_[A-Z0-9]{4,16}$/.test(orderId) || !/^[a-f0-9]{64}$/.test(checkoutToken)) {
    return json({ error: 'INVALID_CHECKOUT_CREDENTIALS' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const tokenHash = await sha256(checkoutToken)
  const { data: payment, error: lookupError } = await admin.from('khelgrid_payments')
    .select('id,order_id,amount_paise,currency,status,payment_gateway,payment_method,provider_order_id,provider_order_status,checkout_token_hash')
    .eq('order_id', orderId)
    .eq('checkout_token_hash', tokenHash)
    .maybeSingle()

  if (lookupError) return json({ error: 'PAYMENT_LOOKUP_FAILED' }, 500)
  if (!payment) return json({ error: 'CHECKOUT_NOT_FOUND' }, 404)
  if (payment.status !== 'pending_verification') return json({ error: 'PAYMENT_NOT_ELIGIBLE', status: payment.status }, 409)

  // Safe idempotent replay: return the existing provider order, never create another.
  if (payment.provider_order_status === 'created' && payment.provider_order_id) {
    return json({
      success: true,
      idempotent: true,
      key_id: keyId,
      order_id: payment.provider_order_id,
      amount: Number(payment.amount_paise),
      currency: payment.currency,
    })
  }
  if (payment.provider_order_status !== 'not_created' || payment.provider_order_id) {
    return json({
      error: 'ORDER_CREATION_REQUIRES_RECONCILIATION',
      provider_order_status: payment.provider_order_status,
    }, 409)
  }

  // Atomic compare-and-set. Concurrent callers cannot both create a Razorpay order.
  const { data: claimed, error: claimError } = await admin.from('khelgrid_payments')
    .update({
      provider_order_status: 'creating',
      provider_order_attempted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .eq('checkout_token_hash', tokenHash)
    .eq('provider_order_status', 'not_created')
    .is('provider_order_id', null)
    .select('id')
    .maybeSingle()

  if (claimError) return json({ error: 'ORDER_CLAIM_FAILED' }, 500)
  if (!claimed) return json({ error: 'ORDER_CREATION_IN_PROGRESS_OR_REQUIRES_RECONCILIATION' }, 409)

  const amount = Number(payment.amount_paise)
  const currency = String(payment.currency || 'INR').toUpperCase()
  if (!Number.isSafeInteger(amount) || amount <= 0 || currency !== 'INR') {
    await admin.from('khelgrid_payments')
      .update({ provider_order_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('provider_order_status', 'creating')
    return json({ error: 'INVALID_AUTHORITATIVE_AMOUNT_OR_CURRENCY' }, 409)
  }

  let response: Response
  try {
    response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: orderId,
        notes: { khelgrid_order_id: orderId, payment_record_id: payment.id },
      }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    // The provider may have created the order before the connection failed.
    // Never retry blindly: this state requires provider-side receipt reconciliation.
    await admin.from('khelgrid_payments')
      .update({ provider_order_status: 'creation_unknown', updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('provider_order_status', 'creating')
    return json({ error: 'PROVIDER_RESULT_UNKNOWN_RECONCILIATION_REQUIRED' }, 503)
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    if (response.status >= 500) {
      await admin.from('khelgrid_payments')
        .update({ provider_order_status: 'creation_unknown', updated_at: new Date().toISOString() })
        .eq('id', payment.id).eq('provider_order_status', 'creating')
      return json({ error: 'PROVIDER_RESULT_UNKNOWN_RECONCILIATION_REQUIRED', provider_status: response.status }, 503)
    }
    await admin.from('khelgrid_payments')
      .update({ provider_order_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('provider_order_status', 'creating')
    return json({ error: 'RAZORPAY_ORDER_REJECTED', provider_status: response.status, details: details.slice(0, 500) }, 502)
  }

  let providerOrder: RazorpayOrder
  try {
    providerOrder = await response.json()
  } catch {
    await admin.from('khelgrid_payments')
      .update({ provider_order_status: 'creation_unknown', updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('provider_order_status', 'creating')
    return json({ error: 'INVALID_PROVIDER_RESPONSE_RECONCILIATION_REQUIRED' }, 503)
  }

  if (!providerOrder?.id || providerOrder.amount !== amount ||
      String(providerOrder.currency).toUpperCase() !== currency ||
      providerOrder.receipt !== orderId || providerOrder.status !== 'created') {
    await admin.from('khelgrid_payments')
      .update({ provider_order_status: 'creation_unknown', updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('provider_order_status', 'creating')
    return json({ error: 'PROVIDER_ORDER_MISMATCH_RECONCILIATION_REQUIRED' }, 503)
  }

  const { data: saved, error: saveError } = await admin.from('khelgrid_payments')
    .update({
      provider_order_id: providerOrder.id,
      provider_order_status: 'created',
      provider_order_created_at: new Date().toISOString(),
      payment_gateway: 'razorpay',
      payment_method: 'razorpay',
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .eq('provider_order_status', 'creating')
    .is('provider_order_id', null)
    .select('id')
    .maybeSingle()

  if (saveError || !saved) {
    // Provider order exists but was not durably linked. Do not issue another order.
    await admin.from('khelgrid_payments')
      .update({ provider_order_status: 'creation_unknown', updated_at: new Date().toISOString() })
      .eq('id', payment.id).is('provider_order_id', null)
    return json({ error: 'PROVIDER_ORDER_CREATED_BUT_LINK_FAILED_RECONCILIATION_REQUIRED' }, 503)
  }

  return json({
    success: true,
    idempotent: false,
    key_id: keyId,
    order_id: providerOrder.id,
    amount,
    currency,
  })
})
