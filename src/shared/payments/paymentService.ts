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
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
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

  // Secure server-side registration; never call the SECURITY DEFINER write RPC
  // from the browser and never accept client-side settlement status.
  if (!supabaseUrl || !anonKey) {
    return { ...result, success: false, status: 'failed', errorMessage: 'Secure payment registration is unavailable.' }
  }
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/register-payment-intent`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register_payment',
        order_id: orderId,
        payment_id: paymentId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || null,
        amount: item.amount,
        item_type: item.type,
        item_id: item.id,
        payment_method: method,
        metadata: item.metadata || {},
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || data?.success !== true) {
      return { ...result, success: false, status: 'failed', errorMessage: data?.message || data?.error || 'Secure payment registration failed.' }
    }
    effectiveStatus = data.status === 'pay_at_venue' ? 'pay_at_venue' : 'pending_verification'
    result.status = effectiveStatus
    result.success = true
  } catch (err) {
    console.warn('[KhelGrid Payments] Secure payment registration failed:', err)
    return { ...result, success: false, status: 'failed', errorMessage: 'Network error registering payment intent.' }
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
/**
 * Formats a Date object into a canonical YYYY-MM-DD date in the Asia/Kolkata (IST) time zone.
 */
export function getIndiaCalendarDate(date: Date = new Date(), offsetDays: number = 0): string {
  const target = offsetDays === 0 ? date : new Date(date.getTime() + offsetDays * 86400000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(target)
}

/**
 * Normalizes relative or display booking dates ('Today', 'Tomorrow', 'Day After')
 * to canonical ISO calendar dates ('YYYY-MM-DD') in the India Standard Time (Asia/Kolkata) zone.
 */
export function normalizeBookingDate(dateStr: string): string {
  if (!dateStr) {
    return getIndiaCalendarDate()
  }
  const trimmed = dateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  const lower = trimmed.toLowerCase()
  if (lower === 'today') {
    return getIndiaCalendarDate(new Date(), 0)
  }
  if (lower === 'tomorrow') {
    return getIndiaCalendarDate(new Date(), 1)
  }
  if (lower === 'day after' || lower === 'day after tomorrow') {
    return getIndiaCalendarDate(new Date(), 2)
  }
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return getIndiaCalendarDate(parsed, 0)
  }
  return getIndiaCalendarDate()
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
        // Authoritative server-side truth: Never allow stale local storage to pollute or block slots
        return Array.from(new Set(data.map(r => r.slot_time).filter(Boolean)))
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

  // 1. Local double-booking check applies ONLY in offline/unconfigured demo mode.
  // In live mode, PostgreSQL reserve_venue_slot_atomic is the sole authoritative barrier.
  if (!supabaseUrl || !anonKey || input.simulateOfflineFailure) {
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
            bookingId: rpcData.booking_id,
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

          if (input.paymentOrderId && rpcData.booking_id && rpcData.booking_ref && !isPayAtVenue) {
            try {
              const linkRes = await fetch(`${supabaseUrl}/functions/v1/register-payment-intent`, {
                method: 'POST',
                headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'link_booking',
                  order_id: input.paymentOrderId,
                  booking_id: rpcData.booking_id,
                  booking_ref: rpcData.booking_ref,
                }),
              })
              const linkData = await linkRes.json().catch(() => null)
              if (!linkRes.ok || linkData?.linked !== true) {
                return {
                  ...remoteBooking,
                  status: 'error',
                  serverConfirmed: false,
                  errorMessage: 'The reservation was created but could not be linked to its pending payment. Contact support before retrying payment.',
                }
              }
            } catch {
              return {
                ...remoteBooking,
                status: 'error',
                serverConfirmed: false,
                errorMessage: 'The reservation was created but payment linkage could not be confirmed. Contact support before retrying payment.',
              }
            }
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
        createdAt?: string
        holdExpiresAt?: string
      }>
      if (Array.isArray(existing)) {
        const now = Date.now()
        return existing
          .filter(b => {
            const matchesVenue = (b.venueId === venueId || b.venueName === venueId)
            const matchesDate = b.slotDate === slotDate
            const notCancelled = b.status !== 'cancelled' && b.status !== 'expired'
            // Filter out expired pending holds (older than 15 mins if holdExpiresAt is set, or if createdAt is > 15 mins)
            let notExpired = true
            if (b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() <= now) {
              notExpired = false
            } else if (b.createdAt && b.status === 'pending_payment' && (now - new Date(b.createdAt).getTime() > 15 * 60 * 1000)) {
              notExpired = false
            }
            return matchesVenue && matchesDate && b.slotTime && notCancelled && notExpired
          })
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
        if (row?.success === false) return null
        const bookingStatus = row?.status ?? row?.booking_status
        if (row && row.booking_ref) {
          return {
            status: bookingStatus === 'confirmed' ? 'confirmed' : bookingStatus,
            bookingRef: row.booking_ref,
            venueName: row.venue_name,
            slotDate: row.slot_date,
            slotTime: row.slot_time,
            courtNumber: row.court_number,
            totalAmount: Number(row.total_amount || 0),
            paidAmount: Number(row.paid_amount || 0),
            paymentStatus: row.payment_status || 'pending',
            serverConfirmed: bookingStatus === 'confirmed',
            customerName: row.customer_display_name ?? row.customer_name,
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
  const subRef = `SUB-${input.planId.toUpperCase()}-${Date.now().toString().slice(-6)}`
  if (!supabaseUrl || !anonKey) {
    return { status: 'error', message: 'Secure subscription registration is unavailable.' }
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/register-payment-intent`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register_listing_subscription',
        order_id: input.orderId,
        listing_type: input.listingType,
        listing_id: input.listingId || null,
        listing_name: input.listingName,
        city: input.city,
        plan_id: input.planId,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        customer_email: input.customerEmail || null,
        payment_status: input.paymentStatus === 'pay_at_venue' ? 'pay_at_venue' : 'pending',
        idempotency_key: input.idempotencyKey || input.orderId,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || data?.success !== true) {
      return { status: 'error', message: data?.message || data?.error || 'Subscription registration failed.' }
    }
    return {
      status: 'pending_verification',
      subscriptionId: data.subscription_id || subRef,
      planName: data.plan_name || input.planName,
      expiresAt: null,
      receiptRef: subRef,
      accessToken: data.access_token,
      message: 'Subscription is pending. It activates only after independent payment settlement.',
    }
  } catch (err) {
    console.warn('[KhelGrid Payments] Secure subscription registration failed:', err)
    return { status: 'error', message: 'Network error registering subscription.' }
  }
}
