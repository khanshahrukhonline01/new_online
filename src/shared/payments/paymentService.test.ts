import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateOrderId,
  generateUpiUri,
  parseInrPrice,
  recordPaymentTransaction,
  recordVenueSlotBooking,
  recordListingSubscription,
  verifyPaymentSignature,
  verifyPaymentWithServer,
  fetchVenueBookingVoucher,
} from './paymentService'
import {
  LISTING_PLANS,
  getListingPlan,
  calculatePlanExpiry,
  formatPlanDuration,
} from './listingPricing'
import type { PaymentCustomer, PaymentItem } from './paymentTypes'

const memoryStorage: Record<string, string> = {}
globalThis.localStorage = {
  getItem: (k: string) => memoryStorage[k] || null,
  setItem: (k: string, v: string) => { memoryStorage[k] = v },
  removeItem: (k: string) => { delete memoryStorage[k] },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]) },
  length: 0,
  key: () => null,
} as unknown as Storage

describe('KhelGrid Payment Service — Phase 5.4 Hardened', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('parseInrPrice', () => {
    it('parses typical Indian currency strings', () => {
      expect(parseInrPrice('₹200/player')).toBe(200)
      expect(parseInrPrice('₹250')).toBe(250)
      expect(parseInrPrice('₹1,200/hr')).toBe(1200)
      expect(parseInrPrice('500')).toBe(500)
      expect(parseInrPrice(350)).toBe(350)
    })

    it('handles free and zero amounts', () => {
      expect(parseInrPrice('Free')).toBe(0)
      expect(parseInrPrice('FREE')).toBe(0)
      expect(parseInrPrice('₹0')).toBe(0)
      expect(parseInrPrice('0')).toBe(0)
      expect(parseInrPrice(null)).toBe(0)
      expect(parseInrPrice(undefined)).toBe(0)
    })
  })

  describe('generateUpiUri', () => {
    it('generates standard NPCI UPI URI', () => {
      const uri = generateUpiUri({
        amount: 250,
        transactionNote: 'Football Turf Spot',
        orderId: 'KG_ORD_123',
      })

      expect(uri).toContain('upi://pay?')
      expect(uri).toContain('pa=khelgrid%40icici')
      expect(uri).toContain('am=250.00')
      expect(uri).toContain('cu=INR')
      expect(uri).toContain('tr=KG_ORD_123')
    })
  })

  describe('generateOrderId', () => {
    it('generates unique uppercase order IDs with prefix', () => {
      const id1 = generateOrderId()
      const id2 = generateOrderId()
      expect(id1).toMatch(/^KG_ORD_/)
      expect(id2).toMatch(/^KG_ORD_/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('verifyPaymentSignature (Phase 5.4 Security Standard)', () => {
    it('strictly rejects arbitrary 16-character dummy signatures in browser', () => {
      // Exploit scenario: attacker passes 16-character dummy signature
      const isVerified = verifyPaymentSignature('order_123', 'pay_456', 'aaaaaaaaaaaaaaaa')
      expect(isVerified).toBe(false)
    })

    it('verifies signature only when exact expected cryptographic hash is provided', () => {
      const expectedHash = '9bba47a74070fb670a4a6b29c15858cf8ac9a349bcce298c4d29cf47b74a38e8'
      expect(verifyPaymentSignature('order_123', 'pay_456', expectedHash, expectedHash)).toBe(true)
      expect(verifyPaymentSignature('order_123', 'pay_456', 'wrong_signature', expectedHash)).toBe(false)
    })

    it('handles empty or missing parameters safely', () => {
      expect(verifyPaymentSignature('', '', '')).toBe(false)
      expect(verifyPaymentSignature('order_123', '', 'sig')).toBe(false)
    })
  })

  describe('recordPaymentTransaction', () => {
    it('records pay_at_venue transaction directly with pay_at_venue status', async () => {
      const item: PaymentItem = {
        id: 'match-1',
        type: 'pickup_match',
        title: 'Football 5v5',
        amount: 200,
        venueName: 'FSV Arena',
        city: 'Bengaluru',
      }
      const customer: PaymentCustomer = {
        name: 'Arjun Rao',
        phone: '9876543210',
      }

      const result = await recordPaymentTransaction({
        orderId: 'KG_TEST_101',
        paymentId: 'VENUE_101',
        customer,
        item,
        method: 'pay_at_venue',
        status: 'pay_at_venue',
      })

      expect(result.success).toBe(true)
      expect(result.amount).toBe(200)
      expect(result.status).toBe('pay_at_venue')
      expect(result.receiptRef).toContain('REC-')
    })

    it('strictly downgrades client-declared completed status to pending_verification for online methods', async () => {
      const item: PaymentItem = {
        id: 'venue-1',
        type: 'venue_booking',
        title: 'Pitch 1 Slot',
        amount: 800,
      }
      const customer: PaymentCustomer = {
        name: 'Client User',
        phone: '9876543210',
      }

      // Attacker attempts to pass status: 'completed' with dummy signature
      const res = await recordPaymentTransaction({
        orderId: 'KG_ORD_TAMPER_01',
        paymentId: 'PAY_TAMPER_01',
        customer,
        item,
        method: 'upi',
        status: 'completed',
        gatewaySignature: '1234567890abcdef',
      })

      expect(res.status).toBe('pending_verification')

      // Assert no gateway signature and phone is masked in local storage display cache
      const stored = JSON.parse(memoryStorage['khelgrid_payment_receipts'] || '[]')
      expect(stored[0]?.gatewaySignature).toBeUndefined()
      expect(stored[0]?.customerPhone).not.toBe('9876543210')
    })

    it('returns failure if remote transaction registration fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Rate limit exceeded' }),
      } as Response)

      const item: PaymentItem = { id: 'venue-1', type: 'venue_booking', title: 'Pitch 1', amount: 800 }
      const customer: PaymentCustomer = { name: 'Client User', phone: '9876543210' }

      const res = await recordPaymentTransaction({
        orderId: 'KG_ORD_FAIL_01',
        paymentId: 'PAY_FAIL_01',
        customer,
        item,
        method: 'upi',
      })

      expect(res.success).toBe(false)
      expect(res.status).toBe('failed')
    })
  })

  describe('verifyPaymentWithServer', () => {
    it('calls verify-razorpay-payment Edge Function and returns completed on server confirmation', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, status: 'completed' }),
      } as Response)

      const result = await verifyPaymentWithServer({
        orderId: 'order_test_123',
        paymentId: 'pay_test_456',
        gatewaySignature: 'valid_sig_hash',
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('completed')
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/verify-razorpay-payment'),
        expect.anything()
      )
    })

    it('returns pending_verification when Edge Function is unavailable or gateway unconfigured', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      const result = await verifyPaymentWithServer({
        orderId: 'order_test_123',
        paymentId: 'pay_test_456',
        gatewaySignature: 'sig',
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('pending_verification')
    })

    it('returns pending_verification when gateway payment is authorized but not captured (Phase 5.6)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          status: 'pending_verification',
          error: 'PAYMENT_AUTHORIZED_NOT_CAPTURED',
          message: 'Payment is authorized by bank but not yet captured by the gateway. Awaiting capture.',
        }),
      } as Response)

      const result = await verifyPaymentWithServer({
        orderId: 'order_auth_only',
        paymentId: 'pay_auth_only',
        gatewaySignature: 'sig_valid',
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe('pending_verification')
      expect(result.error).toContain('Awaiting capture')
    })
  })

  describe('recordVenueSlotBooking', () => {
    it('rejects reservation when authoritative pricing cannot be established (PRICE_UNRESOLVED) (Phase 5.6)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'PRICE_UNRESOLVED',
          message: 'No authoritative booking tariff is configured for this venue or court. Please select another facility.',
        }),
      } as Response)

      const booking = await recordVenueSlotBooking({
        venueId: 'v-unpriced',
        venueName: 'Unpriced Complex',
        city: 'Goa',
        sport: 'Football',
        slotDate: '2026-12-05',
        slotTime: '6:00 PM – 7:00 PM',
        customerName: 'Aarav Patel',
        customerPhone: '9876543210',
        totalAmount: 800,
        paidAmount: 0,
        paymentStatus: 'pending',
      })

      expect(booking.status).toBe('error')
      expect(booking.paymentStatus).toBe('cancelled')
      expect(booking.errorMessage).toContain('No authoritative booking tariff is configured')
    })

    it('confirms booking when atomic server RPC succeeds', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          booking_ref: 'VB-KAN-1234',
          voucher_token: 'token_128bit_hex_valid',
          status: 'confirmed',
          payment_status: 'pay_at_venue',
          total_amount: 500,
        }),
      } as Response)

      const booking = await recordVenueSlotBooking({
        venueId: 'v-1',
        venueName: 'Sree Kanteerava Stadium',
        city: 'Bengaluru',
        sport: 'Running Track',
        slotDate: '2026-12-05',
        slotTime: '6:00 PM – 7:00 PM',
        customerName: 'Kavita Singh',
        customerPhone: '9811223344',
        totalAmount: 500,
        paidAmount: 0,
        paymentStatus: 'pay_at_venue',
      })

      expect(booking.status).toBe('confirmed')
      expect(booking.venueName).toBe('Sree Kanteerava Stadium')
      expect(booking.bookingRef).toBe('VB-KAN-1234')
      expect(booking.serverConfirmed).toBe(true)
    })

    it('returns explicit unconfirmed state and no voucher when server reservation is unavailable', async () => {
      const res = await recordVenueSlotBooking({
        venueId: 'v-1',
        venueName: 'Sree Kanteerava Stadium',
        city: 'Bengaluru',
        sport: 'Running Track',
        slotDate: '2026-12-10',
        slotTime: '6:00 PM – 7:00 PM',
        customerName: 'Kavita Singh',
        customerPhone: '9811223344',
        totalAmount: 500,
        paidAmount: 0,
        paymentStatus: 'pay_at_venue',
        simulateOfflineFailure: true,
      })

      expect(res.status).toBe('unconfirmed')
      expect(res.bookingRef).toBe('')
      expect(res.isOfflineDraft).toBe(true)
      expect(res.serverConfirmed).toBe(false)
      expect(res.errorMessage).toContain('could not be confirmed')
    })

    it('handles concurrency conflicts gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'CONCURRENCY_CONFLICT',
          message: 'Slot was just reserved by another player.',
        }),
      } as Response)

      const res = await recordVenueSlotBooking({
        venueId: 'v-1',
        venueName: 'Sree Kanteerava Stadium',
        city: 'Bengaluru',
        sport: 'Running Track',
        slotDate: '2026-12-10',
        slotTime: '6:00 PM – 7:00 PM',
        customerName: 'Kavita Singh',
        customerPhone: '9811223344',
        totalAmount: 500,
        paidAmount: 0,
        paymentStatus: 'pay_at_venue',
      })

      expect(res.status).toBe('double_booking_conflict')
      expect(res.errorMessage).toContain('reserved')
    })
  })

  describe('fetchVenueBookingVoucher (Phase 5.4 Zero-PII)', () => {
    it('retrieves sanitized voucher with masked customer name and zero phone/email leakage', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          booking_ref: 'VB-KAN-1234',
          venue_name: 'Sree Kanteerava Stadium',
          sport: 'Running Track',
          slot_date: '2026-12-05',
          slot_time: '6:00 PM – 7:00 PM',
          court_number: 1,
          status: 'confirmed',
          payment_status: 'pay_at_venue',
          total_amount: 500,
          paid_amount: 0,
          customer_display_name: 'K***a S***h',
        }),
      } as Response)

      const voucher = await fetchVenueBookingVoucher('VB-KAN-1234', 'token_128bit_hex_valid')
      expect(voucher).not.toBeNull()
      expect(voucher?.bookingRef).toBe('VB-KAN-1234')
      expect(voucher?.customerName).toBe('K***a S***h')
      expect(voucher?.serverConfirmed).toBe(true)
      // Assert zero PII
      expect((voucher as unknown as Record<string, unknown>).customerPhone).toBeUndefined()
      expect((voucher as unknown as Record<string, unknown>).customerEmail).toBeUndefined()
    })
  })

  describe('recordListingSubscription', () => {
    it('activates subscription only when server-verified payment is confirmed', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          is_active: true,
          subscription_id: 'SUB-1_YEAR-1234',
          plan_name: '1-Year Listing',
          expires_at: '2027-11-08T12:00:00Z',
        }),
      } as Response)

      const sub = await recordListingSubscription({
        orderId: 'KG_ORD_SUB_01',
        paymentId: 'PAY_SUB_VERIFIED',
        listingType: 'academy',
        listingName: 'Bhaichung Bhutia Football School',
        city: 'Delhi',
        planId: '1_year',
        planName: '1-Year Listing',
        amount: 4499,
        durationDays: 365,
        customerName: 'Coach Pradeep',
        customerPhone: '9876543210',
        paymentStatus: 'paid',
        serverVerified: true,
      })

      expect(sub.status).toBe('success')
      expect(sub.subscriptionId).toBe('SUB-1_YEAR-1234')
      expect(sub.expiresAt).not.toBeNull()
    })

    it('rejects unverified paid listing subscription activation without verified payment status', async () => {
      const sub = await recordListingSubscription({
        orderId: 'KG_ORD_SUB_UNVERIFIED',
        paymentId: 'PAY_FAKE_123',
        listingType: 'academy',
        listingName: 'Unverified Academy',
        city: 'Delhi',
        planId: '1_year',
        planName: '1-Year Listing',
        amount: 4499,
        durationDays: 365,
        customerName: 'Coach Unverified',
        customerPhone: '9876543210',
        paymentStatus: 'paid',
        serverVerified: false,
      })

      expect(sub.status).toBe('pending_verification')
      expect(sub.expiresAt).toBeNull()
      expect(sub.message).toContain('pending verification')
    })

    it('client passing serverVerified: true cannot activate plan if server returns pending', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'pending_verification',
          is_active: false,
          subscription_id: 'SUB-1_YEAR-1234',
        }),
      } as Response)

      const sub = await recordListingSubscription({
        orderId: 'KG_ORD_SUB_ATTACK',
        paymentId: 'PAY_FORGED',
        listingType: 'academy',
        listingName: 'Attacker Academy',
        city: 'Delhi',
        planId: '1_year',
        planName: '1-Year Listing',
        amount: 4499,
        durationDays: 365,
        customerName: 'Attacker',
        customerPhone: '9876543210',
        paymentStatus: 'paid',
        serverVerified: true, // Attacker claims true!
      })

      expect(sub.status).toBe('pending_verification')
      expect(sub.expiresAt).toBeNull()
    })
  })

  describe('listingPricing helper contracts', () => {
    it('defines exactly the 5 requested listing plans with correct Indian pricing', () => {
      expect(LISTING_PLANS.length).toBe(5)
      const ids = LISTING_PLANS.map(p => p.id)
      expect(ids).toEqual(['1_day', '1_month', '6_months', '1_year', 'lifelong'])

      const dayPlan = getListingPlan('1_day')
      expect(dayPlan.price).toBe(99)
      expect(dayPlan.durationDays).toBe(1)

      const monthPlan = getListingPlan('1_month')
      expect(monthPlan.price).toBe(499)
      expect(monthPlan.durationDays).toBe(30)

      const sixMonthPlan = getListingPlan('6_months')
      expect(sixMonthPlan.price).toBe(2499)
      expect(sixMonthPlan.durationDays).toBe(180)

      const yearPlan = getListingPlan('1_year')
      expect(yearPlan.price).toBe(4499)
      expect(yearPlan.durationDays).toBe(365)
      expect(yearPlan.popular).toBe(true)

      const lifelongPlan = getListingPlan('lifelong')
      expect(lifelongPlan.price).toBe(9999)
      expect(lifelongPlan.durationDays).toBe(0)
    })

    it('formats lifelong expiry and future dates cleanly', () => {
      expect(formatPlanDuration('lifelong', null)).toBe('Lifelong (Never Expires)')
      expect(calculatePlanExpiry('lifelong')).toBeNull()
      expect(calculatePlanExpiry('1_day')).not.toBeNull()
      const future = new Date('2027-11-06T12:00:00Z').toISOString()
      expect(formatPlanDuration('1_year', future)).toContain('2027')
    })
  })
})
