import type {
  ListingSubscriptionInput,
  ListingSubscriptionResult,
  PaymentCustomer,
  PaymentItem,
  PaymentMethod,
  PaymentResult,
  VenueBookingResult,
  VenueSlotBookingInput,
} from './paymentTypes'

const DEFAULT_UPI_VPA = 'khelgrid@icici'
const DEFAULT_MERCHANT_NAME = 'KhelGrid Sports'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Extracts a numeric INR price from strings like '₹200/player', '₹1,200/hr', '₹500', 'Free', 0.
 */
export function parseInrPrice(price: string | number | undefined | null): number {
  if (price === undefined || price === null) return 0
  if (typeof price === 'number') return Math.max(0, price)

  const clean = price.trim().toLowerCase()
  if (clean === 'free' || clean === '₹0' || clean === '0') return 0

  // Remove commas, symbols, and extract first matching integer/float
  const matches = clean.replace(/,/g, '').match(/\d+(\.\d+)?/)
  if (!matches) return 0
  const parsed = parseFloat(matches[0])
  return Number.isNaN(parsed) ? 0 : Math.max(0, Math.round(parsed))
}

/**
 * Generates an NPCI compliant UPI Intent URI for mobile app deep-linking (GPay, PhonePe, Paytm, BHIM).
 */
export function generateUpiUri({
  vpa = DEFAULT_UPI_VPA,
  name = DEFAULT_MERCHANT_NAME,
  amount,
  transactionNote,
  orderId,
}: {
  vpa?: string
  name?: string
  amount: number
  transactionNote: string
  orderId: string
}): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: transactionNote.slice(0, 50),
    tr: orderId,
  })
  return `upi://pay?${params.toString()}`
}

/**
 * Creates an order ID like KG_ORD_1730892348_A1B2
 */
export function generateOrderId(prefix = 'KG_ORD'): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 6)
  return `${prefix}_${timestamp}_${randomPart}`.toUpperCase()
}

/**
 * Check if Razorpay live/test credentials exist in the client environment.
 */
export function getRazorpayKey(): string | null {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env
  return env?.VITE_RAZORPAY_KEY_ID || null
}

function getSafeLocalStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // Ignore restricted environments
  }
  return null
}

/**
 * Verifies gateway payment signatures against an expected server-provided hash.
 * In Phase 5.4, misleading browser signature-length validation is strictly removed.
 * Client browsers cannot establish cryptographic payment authenticity; genuine verification
 * must be performed server-side with HMAC-SHA256 and the server-held secret key.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  expectedSecretOrHash?: string
): boolean {
  if (!orderId || !paymentId || !signature) return false
  if (expectedSecretOrHash) {
    return signature.trim().toLowerCase() === expectedSecretOrHash.trim().toLowerCase()
  }
  return false
}

/**
 * Verifies a Razorpay payment cryptographically with the server backend.
 * Routes exclusively through the verify-razorpay-payment Edge Function.
 * The browser never calls privileged database settlement RPCs directly.
 */
export async function verifyPaymentWithServer({
  orderId,
  paymentId,
  gatewaySignature,
  expectedAmountPaisa,
  expectedCurrency = 'INR',
}: {
  orderId: string
  paymentId: string
  gatewaySignature: string
  expectedAmountPaisa?: number
  expectedCurrency?: string
}): Promise<{ success: boolean; status: 'completed' | 'pending_verification' | 'failed'; error?: string }> {
  if (!orderId || !paymentId || !gatewaySignature) {
    return { success: false, status: 'failed', error: 'Missing order_id, payment_id, or gateway_signature' }
  }

  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-razorpay-payment`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId.trim(),
          payment_id: paymentId.trim(),
          gateway_signature: gatewaySignature.trim(),
          expected_amount_paisa: expectedAmountPaisa,
          expected_currency: expectedCurrency,
        }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.success && data?.status === 'completed') {
          return { success: true, status: 'completed' }
        }
        if (data?.status === 'pending_verification') {
          return {
            success: false,
            status: 'pending_verification',
            error: data.message || data.error || 'Payment authorized. Awaiting capture.',
          }
        }
        if (data && !data.success) {
          return { success: false, status: 'failed', error: data.message || data.error }
        }
      } else {
        const errJson = await res.json().catch(() => null)
        if (res.status === 400) {
          return {
            success: false,
            status: 'failed',
            error: errJson?.message || errJson?.error || 'Invalid payment signature or parameters',
          }
        }
        if (res.status === 503 && errJson?.status === 'pending_verification') {
          return {
            success: false,
            status: 'pending_verification',
            error: errJson?.message || 'Gateway verification pending.',
          }
        }
      }
    } catch (err) {
      console.warn('[KhelGrid Payments] Remote payment verification call failed:', err)
    }
  }

  return {
    success: false,
    status: 'pending_verification',
    error: 'Payment recorded in pending state. Awaiting gateway settlement.',
  }
}

/**
 * Persists payment record to Supabase and browser local storage.
 * Defaults strictly to 'pending_verification' for online methods.
 * Browsers cannot declare payments as 'completed' independently.
 */
export async function recordPaymentTransaction({
  orderId,
  paymentId,
  customer,
  item,
  method,
  status = method === 'pay_at_venue' ? 'pay_at_venue' : 'pending_verification',
}: {
  orderId: string
  paymentId: string
  customer: PaymentCustomer
  item: PaymentItem
  method: PaymentMethod
  status?: 'completed' | 'pay_at_venue' | 'pending_verification' | 'failed'
  gatewaySignature?: string
}): Promise<PaymentResult> {
  const timestamp = new Date().toISOString()
  const receiptRef = `REC-${orderId.slice(-8)}-${paymentId.slice(-4)}`

  // Security safeguard (Phase 5.5): Browser client cannot declare 'completed' status.
  // Online payments must be recorded as 'pending_verification' until server verifies settlement.
  let effectiveStatus = status
  if (method !== 'pay_at_venue') {
    effectiveStatus = 'pending_verification'
  }

  const result: PaymentResult = {
    success: effectiveStatus !== 'failed',
    orderId,
    paymentId,
    amount: item.amount,
    currency: 'INR',
    method,
    status: effectiveStatus,
    timestamp,
    receiptRef,
  }

  // 1. Remote persistence first: Persist to Supabase if configured
  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/record_payment_transaction`, {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_order_id: orderId,
          p_payment_id: paymentId,
          p_customer_name: customer.name,
          p_customer_phone: customer.phone,
          p_customer_email: customer.email || null,
          p_amount: item.amount,
          p_item_type: item.type,
          p_item_id: item.id,
          p_item_title: item.title,
          p_payment_gateway: method === 'pay_at_venue' ? 'pay_at_venue' : 'upi_direct',
          p_payment_method: method,
          p_status: effectiveStatus,
          p_metadata: {
            venue_name: item.venueName,
            city: item.city,
            date_or_time: item.dateOrTime,
            receipt_ref: receiptRef,
          },
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        console.warn('[KhelGrid Payments] Remote transaction persistence failed:', errData)
        return {
          ...result,
          success: false,
          status: 'failed',
          errorMessage: errData?.message || 'Remote payment registration failed',
        }
      }
    } catch (err) {
      console.warn('[KhelGrid Payments] Remote transaction sync network error:', err)
      return {
        ...result,
        success: false,
        status: 'failed',
        errorMessage: 'Network error persisting payment transaction',
      }
    }
  }

  // 2. Persist locally ONLY for display cache after successful remote registration (or local mock)
  // Security rule (Phase 5.5): Never store gateway signatures or raw customer phone in browser storage!
  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_payment_receipts') || '[]')
      existing.unshift({
        ...result,
        customerName: customer.name,
        // Mask customer phone to prevent cleartext PII storage in browser
        customerPhone: customer.phone ? customer.phone.replace(/(\d{2})\d+(\d{2})/, '$1******$2') : undefined,
        itemTitle: item.title,
        itemType: item.type,
        venueName: item.venueName,
        city: item.city,
      })
      storage.setItem('khelgrid_payment_receipts', JSON.stringify(existing.slice(0, 50)))
    }
  } catch {
    // Ignore storage quota errors
  }

  return result
}

/**
 * Normalizes relative or display booking dates ('Today', 'Tomorrow', 'Day After')
 * to canonical ISO calendar dates ('YYYY-MM-DD') in IST time zone.
 */
export function normalizeBookingDate(dateStr: string): string {
  if (!dateStr) {
    const now = new Date()
    return now.toISOString().slice(0, 10)
  }
  const trimmed = dateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  const lower = trimmed.toLowerCase()
  const now = new Date()
  if (lower === 'today') {
    return now.toISOString().slice(0, 10)
  }
  if (lower === 'tomorrow') {
    const tmrw = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return tmrw.toISOString().slice(0, 10)
  }
  if (lower === 'day after' || lower === 'day after tomorrow') {
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    return dayAfter.toISOString().slice(0, 10)
  }
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return now.toISOString().slice(0, 10)
}

/**
 * Queries booked slots for a specific venue and date directly from PostgreSQL public.venue_bookings
 * with offline-first local cache merging.
 */
export async function fetchBookedVenueSlots(venueId: string, slotDate: string): Promise<string[]> {
  const normalizedDate = normalizeBookingDate(slotDate)
  const localSlots = getBookedVenueSlots(venueId, slotDate)
  if (!supabaseUrl || !anonKey) {
    return localSlots
  }

  // Safe zero-PII RPC with in-transaction expiry sweeper
  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_booked_slots_for_venue`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_venue_id: venueId,
        p_slot_date: normalizedDate,
      }),
    })
    if (rpcRes.ok) {
      const data = (await rpcRes.json()) as Array<{ slot_time: string }>
      if (Array.isArray(data)) {
        const remoteSlots = data.map(r => r.slot_time).filter(Boolean)
        return Array.from(new Set([...localSlots, ...remoteSlots]))
      }
    }
  } catch {
    // Return local slots on network failure
  }

  return localSlots
}

/**
 * Creates and records a venue turf/court booking with PostgreSQL database-level
 * zero double-booking enforcement via reserve_venue_slot_atomic RPC.
 * In Phase 5.4, all direct browser table mutation fallbacks are permanently removed.
 */
export async function recordVenueSlotBooking(input: VenueSlotBookingInput): Promise<VenueBookingResult> {
  const timestamp = new Date().toISOString()
  const isPayAtVenue = input.paymentStatus === 'pay_at_venue'
  const normalizedDate = normalizeBookingDate(input.slotDate)
  const courtNum = input.courtNumber || (input.courtOrTurfNumber ? parseInt(input.courtOrTurfNumber.replace(/\D/g, ''), 10) || 1 : 1)
  const idempotencyKey = input.idempotencyKey || generateOrderId('IDEMP_VB')

  // 1. Instant local storage double-booking check
  const localBooked = getBookedVenueSlots(input.venueId, input.slotDate)
  if (localBooked.includes(input.slotTime)) {
    return {
      status: 'double_booking_conflict',
      bookingRef: '',
      venueName: input.venueName,
      slotDate: input.slotDate,
      slotTime: input.slotTime,
      paidAmount: 0,
      paymentStatus: 'cancelled',
      message: `Slot "${input.slotTime}" on ${input.slotDate} is already reserved. Please select a different time slot.`,
      errorMessage: `Slot "${input.slotTime}" on ${input.slotDate} is already reserved. Please select a different time slot.`,
    }
  }

  // 2. Atomic reservation via secure RPC reserve_venue_slot_atomic
  if (supabaseUrl && anonKey && !input.simulateOfflineFailure) {
    try {
      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/reserve_venue_slot_atomic`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_venue_id: input.venueId,
          p_slot_date: normalizedDate,
          p_slot_time: input.slotTime,
          p_court_number: courtNum,
          p_customer_name: input.customerName,
          p_customer_phone: input.customerPhone,
          p_customer_email: input.customerEmail || null,
          p_payment_method: isPayAtVenue ? 'pay_at_venue' : 'online',
          p_idempotency_key: idempotencyKey,
        }),
      })

      if (rpcRes.ok) {
        const rpcData = await rpcRes.json().catch(() => null)
        if (rpcData?.success && rpcData?.booking_ref) {
          const isConfirmed = rpcData.status === 'confirmed'
          const remoteBooking: VenueBookingResult = {
            status: isConfirmed ? 'confirmed' : 'pending',
            bookingRef: rpcData.booking_ref,
            voucherToken: rpcData.voucher_token,
            venueName: input.venueName,
            slotDate: normalizedDate,
            slotTime: input.slotTime,
            courtNumber: courtNum,
            totalAmount: Number(rpcData.total_amount ?? input.totalAmount),
            paidAmount: isConfirmed && !isPayAtVenue ? Number(rpcData.total_amount) : 0,
            paymentStatus: rpcData.payment_status || (isPayAtVenue ? 'pay_at_venue' : 'pending'),
            serverConfirmed: isConfirmed,
            isOfflineDraft: false,
          }

          try {
            const storage = getSafeLocalStorage()
            if (storage) {
              const existing = JSON.parse(storage.getItem('khelgrid_venue_bookings') || '[]')
              existing.unshift({
                ...input,
                bookingRef: rpcData.booking_ref,
                voucherToken: rpcData.voucher_token,
                status: remoteBooking.status,
                serverConfirmed: isConfirmed,
                createdAt: timestamp,
              })
              storage.setItem('khelgrid_venue_bookings', JSON.stringify(existing.slice(0, 50)))
            }
          } catch {
            // Ignore storage errors
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('khelgrid:venue-booked', {
                detail: {
                  bookingRef: rpcData.booking_ref,
                  venueId: input.venueId,
                  slotDate: input.slotDate,
                  slotTime: input.slotTime,
                  status: remoteBooking.status,
                },
              }),
            )
          }

          return remoteBooking
        } else if (rpcData && !rpcData.success) {
          if (rpcData.error === 'SLOT_ALREADY_RESERVED' || rpcData.error === 'CONCURRENCY_CONFLICT') {
            return {
              status: 'double_booking_conflict',
              bookingRef: '',
              venueName: input.venueName,
              slotDate: input.slotDate,
              slotTime: input.slotTime,
              paidAmount: 0,
              paymentStatus: 'cancelled',
              message: `Slot "${input.slotTime}" on ${input.slotDate} was just reserved by another player. Please select a different time slot.`,
              errorMessage: `Slot "${input.slotTime}" on ${input.slotDate} was just reserved by another player. Please select a different time slot.`,
            }
          }
          if (rpcData.error === 'INVALID_VENUE' || rpcData.error === 'PRICE_UNRESOLVED') {
            return {
              status: 'error',
              bookingRef: '',
              venueName: input.venueName,
              slotDate: input.slotDate,
              slotTime: input.slotTime,
              paidAmount: 0,
              paymentStatus: 'cancelled',
              message: rpcData.message || 'Authoritative venue pricing cannot be established.',
              errorMessage: rpcData.message || 'Authoritative venue pricing cannot be established.',
            }
          }
        }
      }
    } catch (err) {
      console.warn('[KhelGrid Payments] Remote atomic reservation RPC failed:', err)
    }
  }

  // 3. Truthful unconfirmed result on database failure or offline state
  // Notice: Direct table insertion fallbacks are completely removed. No fake vouchers issued.
  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_venue_bookings') || '[]')
      existing.unshift({
        ...input,
        bookingRef: '',
        isOfflineDraft: true,
        serverConfirmed: false,
        status: 'unconfirmed',
        createdAt: timestamp,
      })
      storage.setItem('khelgrid_venue_bookings', JSON.stringify(existing.slice(0, 50)))
    }
  } catch {
    // Ignore storage quota error
  }

  return {
    status: 'unconfirmed',
    bookingRef: '',
    venueName: input.venueName,
    slotDate: input.slotDate,
    slotTime: input.slotTime,
    paidAmount: 0,
    paymentStatus: 'pending',
    isOfflineDraft: true,
    serverConfirmed: false,
    message: 'Booking could not be confirmed with the reservation server. The slot is NOT reserved. Please verify your connection and retry.',
    errorMessage: 'Booking could not be confirmed with the reservation server. The slot is NOT reserved. Please verify your connection and retry.',
  }
}

export function getBookedVenueSlots(venueId: string, slotDate: string): string[] {
  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_venue_bookings') || '[]') as Array<{
        venueId?: string
        venueName?: string
        slotDate?: string
        slotTime?: string
        status?: string
      }>
      if (Array.isArray(existing)) {
        return existing
          .filter(b => (b.venueId === venueId || b.venueName === venueId) && b.slotDate === slotDate && b.slotTime && b.status !== 'cancelled' && b.status !== 'expired')
          .map(b => b.slotTime as string)
      }
    }
  } catch {
    // Ignore
  }
  return []
}

/**
 * Verified single-booking voucher lookup requiring high-entropy voucher token
 * or authenticated owner context (zero enumeration, zero public PII scraping).
 */
export async function fetchVenueBookingVoucher(
  bookingRef: string,
  voucherToken?: string,
): Promise<VenueBookingResult | null> {
  const cleanRef = bookingRef.trim()
  const cleanToken = (voucherToken || '').trim()
  if (!cleanRef) {
    return null
  }

  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_venue_booking_voucher`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_booking_ref: cleanRef,
          p_voucher_token: cleanToken || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const row = Array.isArray(data) && data[0] ? data[0] : data
        if (row && row.booking_ref) {
          return {
            status: row.status === 'confirmed' ? 'confirmed' : row.status,
            bookingRef: row.booking_ref,
            venueName: row.venue_name,
            slotDate: row.slot_date,
            slotTime: row.slot_time,
            courtNumber: row.court_number,
            totalAmount: Number(row.total_amount || 0),
            paidAmount: Number(row.paid_amount || 0),
            paymentStatus: row.payment_status || 'pending',
            serverConfirmed: row.status === 'confirmed',
            customerName: row.customer_display_name,
          }
        }
      }
    } catch {
      // Fallback to local storage for user's own display
    }
  }

  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_venue_bookings') || '[]') as Array<{
        bookingRef?: string
        voucherToken?: string
        venueName?: string
        slotDate?: string
        slotTime?: string
        paidAmount?: number
        totalAmount?: number
        paymentStatus?: string
        status?: string
      }>
      const match = existing.find(
        b => b.bookingRef === cleanRef && (!cleanToken || b.voucherToken === cleanToken)
      )
      if (match) {
        return {
          status: match.status === 'confirmed' ? 'confirmed' : 'pending',
          bookingRef: match.bookingRef || cleanRef,
          venueName: match.venueName || '',
          slotDate: match.slotDate || '',
          slotTime: match.slotTime || '',
          totalAmount: match.totalAmount || 0,
          paidAmount: match.paidAmount || 0,
          paymentStatus: match.paymentStatus || 'pending',
          serverConfirmed: false,
        }
      }
    }
  } catch {
    // Ignore
  }

  return null
}

export function getUserVenueBookings(): Array<VenueBookingResult & { createdAt?: string; customerName?: string; venueId?: string; city?: string; sport?: string }> {
  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_venue_bookings') || '[]')
      if (Array.isArray(existing)) {
        return existing
      }
    }
  } catch {
    // Ignore
  }
  return []
}

/**
 * Records an activated listing subscription (1-Day, 1-Month, 6-Month, 1-Year, Lifelong).
 * Browser clients cannot self-activate paid subscriptions. All online subscriptions require
 * verified backend payment confirmation via Edge Function or Webhook.
 */
export async function recordListingSubscription(input: ListingSubscriptionInput): Promise<ListingSubscriptionResult> {
  const timestamp = new Date().toISOString()
  const subRef = `SUB-${input.planId.toUpperCase()}-${Date.now().toString().slice(-6)}`
  const isPayAtVenue = input.paymentStatus === 'pay_at_venue'

  // Security rule (Phase 5.5): Browser client can NEVER self-activate paid subscriptions.
  // We completely reject client-supplied `serverVerified: true` or `paymentStatus: 'paid'` as authorization.
  // All online subscriptions must be registered in 'pending_verification' status until the server verifies settlement.

  // 1. Supabase RPC registration
  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/record_listing_subscription`, {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_order_id: input.orderId,
          p_payment_id: input.paymentId,
          p_listing_type: input.listingType,
          p_listing_name: input.listingName,
          p_city: input.city,
          p_plan_id: input.planId,
          p_plan_name: input.planName,
          p_amount: input.amount,
          p_duration_days: input.durationDays,
          p_customer_name: input.customerName,
          p_customer_phone: input.customerPhone,
          p_customer_email: input.customerEmail || null,
          p_payment_status: isPayAtVenue ? 'pay_at_venue' : 'pending',
          p_listing_id: input.listingId || null,
          p_idempotency_key: input.idempotencyKey || null,
          p_metadata: {
            subscription_ref: subRef,
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data && data.status === 'success' && data.is_active) {
          // Authorized server-side activation (e.g. admin or pre-verified order)
          return {
            status: 'success',
            subscriptionId: data.subscription_id || subRef,
            planName: data.plan_name || input.planName,
            expiresAt: data.expires_at,
            receiptRef: subRef,
            accessToken: data.access_token,
          }
        }
        if (data && (data.status === 'pending_verification' || data.status === 'success')) {
          // Normal secure online path: registered in pending state awaiting gateway settlement
          return {
            status: 'pending_verification',
            subscriptionId: subRef,
            planName: input.planName,
            expiresAt: null,
            receiptRef: subRef,
            accessToken: data.access_token,
            message: data.message || 'Subscription pending payment verification.',
          }
        }
      }
    } catch (err) {
      console.warn('[KhelGrid Payments] Remote subscription registration error:', err)
    }
  }

  // 2. Truthful unconfirmed/pending result on offline or database unconfigured state
  // Notice: Client NEVER self-activates from local storage or fabricated payment IDs!
  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_listing_subscriptions') || '[]')
      existing.unshift({
        ...input,
        subscriptionId: subRef,
        expiresAt: null,
        is_active: false,
        paymentStatus: isPayAtVenue ? 'pay_at_venue' : 'pending',
        createdAt: timestamp,
      })
      storage.setItem('khelgrid_listing_subscriptions', JSON.stringify(existing.slice(0, 50)))
    }
  } catch {
    // Ignore storage quota
  }

  return {
    status: 'pending_verification',
    subscriptionId: subRef,
    planName: input.planName,
    expiresAt: null,
    receiptRef: subRef,
    message: 'Subscription registered in pending verification state. Awaiting payment settlement.',
  }
}
