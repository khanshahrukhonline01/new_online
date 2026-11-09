import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

type PaymentType = 'pickup_match' | 'venue_booking' | 'trial_registration' | 'listing_plan' | 'membership'
type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'pay_at_venue'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseInr(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value * 100) / 100
  if (typeof value !== 'string') return null
  const clean = value.trim().toLowerCase()
  if (clean === 'free' || clean === '₹0' || clean === '0') return 0
  const match = clean.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/)
  if (!match) return null
  const amount = Number(match[0])
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2, '0')).join('')
}

function listingPlan(planId: string): { amount: number; days: number; name: string } | null {
  const plans: Record<string, { amount: number; days: number; name: string }> = {
    '1_day': { amount: 99, days: 1, name: '1-Day Listing' },
    '1_month': { amount: 499, days: 30, name: '1-Month Listing' },
    '6_months': { amount: 2499, days: 180, name: '6-Month Listing' },
    '1_year': { amount: 4499, days: 365, name: '1-Year Listing' },
    lifelong: { amount: 9999, days: 0, name: 'Lifelong Listing' },
  }
  return plans[planId] || null
}

function membershipPrice(meta: Record<string, unknown>): number | null {
  const planId = String(meta.planId || '')
  const cycle = String(meta.billingCycle || '')
  const pricingPlans: Record<string, { monthly: number; annual: number }> = {
    athlete_pro: { monthly: 249, annual: 1499 },
    athlete_elite: { monthly: 499, annual: 2999 },
    academy_starter: { monthly: 799, annual: 4999 },
    academy_pro: { monthly: 1999, annual: 12999 },
    academy_enterprise: { monthly: 3999, annual: 24999 },
    venue_pro: { monthly: 1499, annual: 8999 },
    boost_7d: { monthly: 1500, annual: 1500 },
    boost_30d: { monthly: 4499, annual: 4499 },
  }
  const proTiers: Record<string, { monthly: number; annual: number }> = {
    athlete: { monthly: 199, annual: 1999 },
    coach: { monthly: 499, annual: 4999 },
    academy: { monthly: 1499, annual: 14999 },
  }
  const prices = pricingPlans[planId] || proTiers[String(meta.tierId || '')]
  return prices?.[cycle as 'monthly' | 'annual'] ?? null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: 'SERVER_MISCONFIGURED' }, 503)

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  let userId: string | null = null
  if (token && token !== anonKey) {
    const { data } = await authClient.auth.getUser(token)
    userId = data.user?.id || null
    if (!userId) return json({ error: 'INVALID_SESSION' }, 401)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'INVALID_JSON' }, 400)
  }

  const action = body.action || 'register_payment'
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rateKey = await sha256([clientIp, userId || 'anonymous', String(body.customer_phone || '')].join(':'))

  const { data: allowed, error: rateError } = await admin.rpc('consume_payment_registration_rate_limit', {
    p_identifier: rateKey,
    p_limit: action === 'link_booking' ? 30 : 12,
    p_window_seconds: 600,
  })
  if (rateError || allowed !== true) return json({ error: 'RATE_LIMITED' }, 429)

  // Link a previously reserved venue slot to its pending payment. Matching venue,
  // phone and amount prevents a caller from attaching an unrelated booking.
  if (action === 'link_booking') {
    const orderId = String(body.order_id || '').trim()
    const bookingId = String(body.booking_id || '').trim()
    const bookingRef = String(body.booking_ref || '').trim()
    if (!/^KG_ORD_[A-Z0-9]+_[A-Z0-9]{4,16}$/.test(orderId) || !bookingId || !bookingRef) {
      return json({ error: 'INVALID_LINK_PARAMETERS' }, 400)
    }
    const { data: payment, error: paymentError } = await admin.from('khelgrid_payments')
      .select('id,item_type,item_id,amount,customer_phone,user_id,status,metadata')
      .eq('order_id', orderId).single()
    const { data: booking, error: bookingError } = await admin.from('venue_bookings')
      .select('id,booking_ref,venue_id,total_amount,customer_phone,status')
      .eq('id', bookingId).eq('booking_ref', bookingRef).single()
    if (paymentError || !payment || bookingError || !booking) return json({ error: 'PAYMENT_OR_BOOKING_NOT_FOUND' }, 404)
    if (payment.item_type !== 'venue_booking' || payment.status !== 'pending_verification' || (payment.user_id && payment.user_id !== userId)) return json({ error: 'PAYMENT_NOT_LINKABLE' }, 409)
    const { data: venue } = await admin.from('venues').select('id,slug').eq('id', payment.item_id).single()
    if (!venue || venue.slug !== booking.venue_id || payment.customer_phone !== booking.customer_phone ||
        Number(payment.amount) > Number(booking.total_amount)) return json({ error: 'BOOKING_PAYMENT_MISMATCH' }, 409)
    const metadata = { ...(payment.metadata || {}), booking_ref: booking.booking_ref }
    const { error: updateError } = await admin.from('khelgrid_payments')
      .update({ target_type: 'venue_booking', target_id: booking.id, metadata })
      .eq('id', payment.id).eq('status', 'pending_verification')
    if (updateError) return json({ error: 'BOOKING_LINK_FAILED' }, 500)
    return json({ success: true, linked: true })
  }

  if (action === 'register_listing_subscription') {
    const orderId = String(body.order_id || '').trim()
    const planId = String(body.plan_id || '')
    const plan = listingPlan(planId)
    const listingType = String(body.listing_type || '')
    const listingName = String(body.listing_name || '').trim()
    const city = String(body.city || '').trim()
    const customerName = String(body.customer_name || '').trim()
    const phone = String(body.customer_phone || '').replace(/\D/g, '')
    const idempotencyKey = String(body.idempotency_key || orderId).trim()
    if (!/^KG_ORD_[A-Z0-9]+_[A-Z0-9]{4,16}$/.test(orderId) || !plan ||
        !['academy', 'venue', 'opportunity', 'pickup_game'].includes(listingType) ||
        listingName.length < 2 || city.length < 2 || customerName.length < 2 || phone.length < 10 ||
        !idempotencyKey || idempotencyKey.length > 128) return json({ error: 'INVALID_SUBSCRIPTION' }, 400)

    const { data: existingByOrder } = await admin.from('listing_subscriptions')
      .select('id,order_id,plan_id,amount,payment_status,is_active,access_token')
      .eq('order_id', orderId).maybeSingle()
    const { data: existingByKey } = existingByOrder ? { data: null } : await admin.from('listing_subscriptions')
      .select('id,order_id,plan_id,amount,payment_status,is_active,access_token')
      .eq('idempotency_key', idempotencyKey).maybeSingle()
    const existing = existingByOrder || existingByKey
    if (existing) {
      if (existing.plan_id !== planId || Number(existing.amount) !== plan.amount || existing.is_active) {
        return json({ error: 'ORDER_CONFLICT' }, 409)
      }
      return json({ success: true, status: 'pending_verification', is_active: false, subscription_id: existing.id, access_token: existing.access_token })
    }

    const accessToken = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(v => v.toString(16).padStart(2, '0')).join('')
    const { data: paymentIntent, error: paymentLookupError } = await admin.from('khelgrid_payments')
      .select('id,amount,item_type,customer_phone,status')
      .eq('order_id', orderId).single()
    if (paymentLookupError || !paymentIntent || paymentIntent.item_type !== 'listing_plan' ||
        Number(paymentIntent.amount) !== plan.amount || paymentIntent.customer_phone !== phone ||
        paymentIntent.status !== 'pending_verification') {
      return json({ error: 'PAYMENT_INTENT_MISMATCH' }, 409)
    }

    const { data: subscription, error: insertError } = await admin.from('listing_subscriptions').insert({
      order_id: orderId,
      payment_id: null,
      user_id: userId,
      listing_type: listingType,
      listing_id: body.listing_id ? String(body.listing_id) : null,
      listing_name: listingName,
      city,
      plan_id: planId,
      plan_name: plan.name,
      amount: plan.amount,
      duration_days: plan.days,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: body.customer_email ? String(body.customer_email).trim().toLowerCase() : null,
      starts_at: new Date().toISOString(),
      expires_at: null,
      is_active: false,
      payment_status: 'pending',
      metadata: { source: 'register-payment-intent' },
      access_token: accessToken,
      idempotency_key: idempotencyKey,
      updated_at: new Date().toISOString(),
    }).select('id,plan_id,plan_name,is_active,payment_status,access_token').single()
    if (insertError || !subscription) return json({ error: 'SUBSCRIPTION_REGISTRATION_FAILED' }, 500)
    const { error: linkError } = await admin.from('khelgrid_payments')
      .update({
        target_type: 'listing_subscription',
        target_id: subscription.id,
        metadata: { subscription_id: subscription.id, plan_id: planId },
      })
      .eq('id', paymentIntent.id)
      .eq('status', 'pending_verification')
    if (linkError) {
      await admin.from('listing_subscriptions').delete().eq('id', subscription.id)
      return json({ error: 'SUBSCRIPTION_PAYMENT_LINK_FAILED' }, 500)
    }
    return json({ success: true, status: 'pending_verification', is_active: false, subscription_id: subscription.id, plan_id: subscription.plan_id, plan_name: subscription.plan_name, payment_status: subscription.payment_status, access_token: subscription.access_token })
  }

  const orderId = String(body.order_id || '').trim()
  const paymentId = String(body.payment_id || '').trim()
  const customerName = String(body.customer_name || '').trim()
  const customerPhone = String(body.customer_phone || '').replace(/\D/g, '')
  const customerEmail = body.customer_email ? String(body.customer_email).trim().toLowerCase() : null
  const itemType = String(body.item_type || '') as PaymentType
  const itemId = String(body.item_id || '').trim()
  const requestedAmount = Number(body.amount)
  const method = String(body.payment_method || '') as PaymentMethod
  const idempotencyKey = String(body.idempotency_key || orderId).trim()

  if (!/^KG_ORD_[A-Z0-9]+_[A-Z0-9]{4,16}$/.test(orderId) || !itemId ||
      customerName.length < 2 || customerPhone.length < 10 ||
      !Number.isFinite(requestedAmount) || requestedAmount <= 0 ||
      !['pickup_match','venue_booking','trial_registration','listing_plan','membership'].includes(itemType) ||
      !['upi','pay_at_venue'].includes(method) || !idempotencyKey || idempotencyKey.length > 128) {
    return json({ error: 'INVALID_PAYMENT_INTENT' }, 400)
  }

  let expectedAmount: number | null = null
  let itemTitle = ''
  let targetType = itemType
  let targetId = itemId
  const metadata: Record<string, unknown> = {}

  if (itemType === 'listing_plan') {
    const plan = listingPlan(String((body.metadata as Record<string, unknown> | undefined)?.planId || ''))
    if (!plan) return json({ error: 'INVALID_PLAN' }, 400)
    expectedAmount = plan.amount
    itemTitle = plan.name
    metadata.plan_id = String((body.metadata as Record<string, unknown>).planId)
  } else if (itemType === 'membership') {
    const meta = (body.metadata || {}) as Record<string, unknown>
    expectedAmount = membershipPrice(meta)
    if (expectedAmount === null) return json({ error: 'INVALID_MEMBERSHIP_PLAN' }, 400)
    itemTitle = `KhelGrid Membership ${String(meta.planId || meta.tierId)}`
    metadata.plan_id = String(meta.planId || meta.tierId)
    metadata.tier_id = meta.tierId ? String(meta.tierId) : null
    metadata.audience = meta.audience ? String(meta.audience) : null
    metadata.billing_cycle = String(meta.billingCycle)
  } else if (itemType === 'trial_registration') {
    const { data, error } = await admin.from('opportunities')
      .select('id,title,registration_fee,publication_status').eq('id', itemId).single()
    if (error || !data || data.publication_status !== 'published') return json({ error: 'TRIAL_NOT_AVAILABLE' }, 404)
    expectedAmount = Number(data.registration_fee)
    itemTitle = data.title
  } else if (itemType === 'pickup_match') {
    const { data, error } = await admin.from('pickup_games')
      .select('id,sport,price_per_player,publication_status,status').eq('id', itemId).single()
    if (error || !data || data.publication_status !== 'published' || data.status !== 'open') return json({ error: 'MATCH_NOT_AVAILABLE' }, 404)
    expectedAmount = parseInr(data.price_per_player)
    if (expectedAmount === null) return json({ error: 'PRICE_UNRESOLVED' }, 409)
    itemTitle = `${data.sport} Match Spot`
  } else if (itemType === 'venue_booking') {
    const { data, error } = await admin.from('venues')
      .select('id,name,slot_hourly_fee,fee_provenance,pricing_status,publication_status')
      .eq('id', itemId).single()
    if (error || !data || data.publication_status !== 'published') return json({ error: 'VENUE_NOT_AVAILABLE' }, 404)
    if (data.fee_provenance !== 'verified' || data.pricing_status !== 'verified' || !data.slot_hourly_fee || data.slot_hourly_fee <= 0) {
      return json({ error: 'PRICE_UNRESOLVED' }, 409)
    }
    expectedAmount = Math.min(300, Number(data.slot_hourly_fee))
    itemTitle = `${data.name} Court Slot`
    metadata.venue_id = data.id
  }

  if (expectedAmount === null || !Number.isFinite(expectedAmount) || expectedAmount <= 0 ||
      Math.round(expectedAmount * 100) !== Math.round(requestedAmount * 100)) {
    return json({ error: 'AMOUNT_MISMATCH', message: 'The submitted amount does not match the authoritative server price.' }, 409)
  }

  const { data: existing, error: existingError } = await admin.from('khelgrid_payments')
    .select('id,amount,item_type,item_id,status,customer_phone')
    .eq('order_id', orderId).maybeSingle()
  if (existingError) return json({ error: 'PAYMENT_LOOKUP_FAILED' }, 500)
  if (existing) {
    if (Number(existing.amount) !== expectedAmount || existing.item_type !== itemType ||
        existing.item_id !== itemId || existing.customer_phone !== customerPhone) {
      return json({ error: 'ORDER_CONFLICT' }, 409)
    }
    return json({ success: true, status: existing.status, order_id: orderId, idempotent: true })
  }

  const online = method !== 'pay_at_venue'
  const status = online ? 'pending_verification' : 'pay_at_venue'
  const gateway = online ? 'upi_direct' : 'pay_at_venue'
  const { data: payment, error: paymentError } = await admin.from('khelgrid_payments').insert({
    order_id: orderId,
    payment_id: null,
    user_id: userId,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    amount: expectedAmount,
    currency: 'INR',
    item_type: itemType,
    item_id: itemId,
    item_title: itemTitle,
    payment_gateway: gateway,
    payment_method: online ? 'upi' : 'pay_at_venue',
    status,
    target_type: targetType,
    target_id: targetId,
    idempotency_key: idempotencyKey,
    metadata: { ...metadata, submitted_reference: paymentId || null, registered_at: new Date().toISOString() },
  }).select('id,order_id,amount,status').single()

  if (paymentError || !payment) return json({ error: 'PAYMENT_REGISTRATION_FAILED' }, 500)
  return json({ success: true, status, order_id: payment.order_id, amount: payment.amount, message: online ? 'Payment reference received. Awaiting independent verification.' : 'Pay-at-venue intent registered; no online payment has been collected.' })
})
