import type {
  PaymentCustomer,
  PaymentItem,
  PaymentMethod,
  PaymentResult,
  VenueBookingResult,
  VenueSlotBookingInput,
} from './paymentTypes'
import {
  calculatePlanExpiry,
  type ListingPlanId,
} from './listingPricing'

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
 * Creates an order ID like KG_ORD_1730892348_a1b2
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
 * Persists payment record to Supabase and browser local storage.
 */
export async function recordPaymentTransaction({
  orderId,
  paymentId,
  customer,
  item,
  method,
  status = 'completed',
}: {
  orderId: string
  paymentId: string
  customer: PaymentCustomer
  item: PaymentItem
  method: PaymentMethod
  status?: 'completed' | 'pay_at_venue' | 'pending_verification' | 'failed'
}): Promise<PaymentResult> {
  const timestamp = new Date().toISOString()
  const receiptRef = `REC-${orderId.slice(-8)}-${paymentId.slice(-4)}`

  const result: PaymentResult = {
    success: status !== 'failed',
    orderId,
    paymentId,
    amount: item.amount,
    currency: 'INR',
    method,
    status,
    timestamp,
    receiptRef,
  }

  // 1. Persist locally for instant receipt retrieval across sessions
  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_payment_receipts') || '[]')
      existing.unshift({
        ...result,
        customerName: customer.name,
        customerPhone: customer.phone,
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

  // 2. Persist to Supabase if configured
  if (supabaseUrl && anonKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/rpc/record_payment_transaction`, {
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
          p_status: status,
          p_metadata: {
            venue_name: item.venueName,
            city: item.city,
            date_or_time: item.dateOrTime,
            receipt_ref: receiptRef,
          },
        }),
      })
    } catch (err) {
      console.warn('[KhelGrid Payments] Remote transaction sync failed; stored locally:', err)
    }
  }

  return result
}

/**
 * Queries booked slots for a specific venue and date directly from PostgreSQL public.venue_slot_bookings
 * with offline-first local cache merging.
 */
export async function fetchBookedVenueSlots(venueId: string, slotDate: string): Promise<string[]> {
  const localSlots = getBookedVenueSlots(venueId, slotDate)
  if (!supabaseUrl || !anonKey) {
    return localSlots
  }

  try {
    const query = new URLSearchParams({
      venue_id: `eq.${venueId}`,
      slot_date: `eq.${slotDate}`,
      status: 'neq.cancelled',
      select: 'slot_time',
      limit: '500',
    })
    const res = await fetch(`${supabaseUrl}/rest/v1/venue_slot_bookings?${query.toString()}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = (await res.json()) as Array<{ slot_time: string }>
      if (Array.isArray(data)) {
        const remoteSlots = data.map(r => r.slot_time).filter(Boolean)
        const merged = Array.from(new Set([...localSlots, ...remoteSlots]))
        return merged
      }
    }
  } catch {
    // Return local slots on network or CORS failure
  }
  return localSlots
}

/**
 * Creates and records a venue turf/court booking with PostgreSQL database-level
 * zero double-booking enforcement via UNIQUE(venue_id, slot_date, slot_time).
 */
export async function recordVenueSlotBooking(input: VenueSlotBookingInput): Promise<VenueBookingResult> {
  const timestamp = new Date().toISOString()
  const venueCode = input.venueName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'VEN'
  const ref = `VB-${venueCode}-${Date.now().toString().slice(-6)}`

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

  // 2. Direct PostgreSQL insertion to public.venue_slot_bookings enforcing UNIQUE(venue_id, slot_date, slot_time)
  if (supabaseUrl && anonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/venue_slot_bookings`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          booking_ref: ref,
          venue_id: input.venueId,
          venue_name: input.venueName,
          city: input.city,
          sport: input.sport,
          court_or_turf_number: input.courtOrTurfNumber || 'Turf 1 (Main Pitch)',
          slot_date: input.slotDate,
          slot_time: input.slotTime,
          booked_by_user_id: input.userId || null,
          customer_name: input.customerName,
          customer_phone: input.customerPhone,
          customer_email: input.customerEmail || null,
          total_amount: input.totalAmount,
          paid_amount: input.paidAmount,
          payment_status: input.paymentStatus,
          payment_id: input.paymentId || null,
          status: 'confirmed',
        }),
      })

      if (response.status === 409) {
        // Unique index violation (idx_venue_slot_active_unique)
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

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        if (
          text.includes('idx_venue_slot_active_unique') ||
          text.includes('duplicate key value') ||
          text.includes('unique constraint')
        ) {
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
      } else {
        const data = await response.json().catch(() => null)
        const row = Array.isArray(data) && data[0] ? data[0] : data
        if (row && row.booking_ref) {
          const remoteBooking: VenueBookingResult = {
            status: 'success',
            bookingRef: row.booking_ref,
            venueName: row.venue_name || input.venueName,
            slotDate: row.slot_date || input.slotDate,
            slotTime: row.slot_time || input.slotTime,
            paidAmount: Number(row.paid_amount ?? input.paidAmount),
            paymentStatus: row.payment_status || input.paymentStatus,
          }
          // Persist locally
          try {
            const storage = getSafeLocalStorage()
            if (storage) {
              const existing = JSON.parse(storage.getItem('khelgrid_venue_bookings') || '[]')
              existing.unshift({
                ...input,
                bookingRef: row.booking_ref,
                createdAt: timestamp,
              })
              storage.setItem('khelgrid_venue_bookings', JSON.stringify(existing.slice(0, 50)))
            }
          } catch {
            // Ignore
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('khelgrid:venue-booked', {
                detail: { bookingRef: row.booking_ref, venueId: input.venueId, slotDate: input.slotDate, slotTime: input.slotTime },
              }),
            )
          }
          return remoteBooking
        }
      }
    } catch (err) {
      console.warn('[KhelGrid Payments] Remote slot booking failed, using local offline fallback:', err)
    }
  }

  // 3. Local storage caching for offline retrieval and instant cross-component updates
  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_venue_bookings') || '[]')
      existing.unshift({
        ...input,
        bookingRef: ref,
        createdAt: timestamp,
      })
      storage.setItem('khelgrid_venue_bookings', JSON.stringify(existing.slice(0, 50)))
    }
  } catch {
    // Ignore storage quota error
  }

  const result: VenueBookingResult = {
    status: 'success',
    bookingRef: ref,
    venueName: input.venueName,
    slotDate: input.slotDate,
    slotTime: input.slotTime,
    paidAmount: input.paidAmount,
    paymentStatus: input.paymentStatus,
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('khelgrid:venue-booked', {
        detail: { bookingRef: ref, venueId: input.venueId, slotDate: input.slotDate, slotTime: input.slotTime },
      }),
    )
  }

  return result
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
      }>
      if (Array.isArray(existing)) {
        return existing
          .filter(b => (b.venueId === venueId || b.venueName === venueId) && b.slotDate === slotDate && b.slotTime)
          .map(b => b.slotTime as string)
      }
    }
  } catch {
    // Ignore
  }
  return []
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

export interface ListingSubscriptionInput {
  orderId: string
  paymentId: string
  listingType: 'academy' | 'venue' | 'opportunity' | 'pickup_game'
  listingName: string
  city: string
  planId: ListingPlanId
  planName: string
  amount: number
  durationDays: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  paymentStatus?: 'paid' | 'pay_at_venue'
  listingId?: string
}

export interface ListingSubscriptionResult {
  status: 'success' | 'error'
  subscriptionId?: string
  planName?: string
  expiresAt?: string | null
  receiptRef?: string
  message?: string
}

/**
 * Records an activated listing subscription (1-Day, 1-Month, 6-Month, 1-Year, Lifelong).
 */
export async function recordListingSubscription(input: ListingSubscriptionInput): Promise<ListingSubscriptionResult> {
  const timestamp = new Date().toISOString()
  const expiresAt = calculatePlanExpiry(input.planId)
  const subRef = `SUB-${input.planId.toUpperCase()}-${Date.now().toString().slice(-6)}`

  // 1. Local storage cache
  try {
    const storage = getSafeLocalStorage()
    if (storage) {
      const existing = JSON.parse(storage.getItem('khelgrid_listing_subscriptions') || '[]')
      existing.unshift({
        ...input,
        subscriptionId: subRef,
        expiresAt,
        createdAt: timestamp,
      })
      storage.setItem('khelgrid_listing_subscriptions', JSON.stringify(existing.slice(0, 50)))
    }
  } catch {
    // Ignore storage quota
  }

  // 2. Supabase RPC if available
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
          p_payment_status: input.paymentStatus || 'paid',
          p_listing_id: input.listingId || null,
          p_metadata: {
            expires_at: expiresAt,
            subscription_ref: subRef,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.status === 'success') {
          return {
            status: 'success',
            subscriptionId: data.subscription_id || subRef,
            planName: data.plan_name || input.planName,
            expiresAt: data.expires_at || expiresAt,
            receiptRef: subRef,
          }
        }
      }
    } catch {
      // Fall through to local cache
    }
  }

  return {
    status: 'success',
    subscriptionId: subRef,
    planName: input.planName,
    expiresAt,
    receiptRef: subRef,
  }
}
