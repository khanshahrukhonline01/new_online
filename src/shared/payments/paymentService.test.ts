import { beforeEach, describe, expect, it } from 'vitest'
import {
  generateOrderId,
  generateUpiUri,
  parseInrPrice,
  recordPaymentTransaction,
  recordVenueSlotBooking,
  recordListingSubscription,
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

describe('KhelGrid Payment Service', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
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

  describe('recordPaymentTransaction', () => {
    it('records completed transaction to local receipts', async () => {
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
        paymentId: 'PAY_TEST_202',
        customer,
        item,
        method: 'upi',
        status: 'completed',
      })

      expect(result.success).toBe(true)
      expect(result.amount).toBe(200)
      expect(result.orderId).toBe('KG_TEST_101')
      expect(result.paymentId).toBe('PAY_TEST_202')
      expect(result.receiptRef).toContain('REC-')

      const receipts = JSON.parse(globalThis.localStorage.getItem('khelgrid_payment_receipts') || '[]')
      expect(receipts.length).toBeGreaterThan(0)
      expect(receipts[0].orderId).toBe('KG_TEST_101')
      expect(receipts[0].customerName).toBe('Arjun Rao')
    })
  })

  describe('recordVenueSlotBooking', () => {
    it('records slot booking to local bookings storage', async () => {
      const booking = await recordVenueSlotBooking({
        venueId: 'v-1',
        venueName: 'Sree Kanteerava Stadium',
        city: 'Bengaluru',
        sport: 'Running Track',
        slotDate: 'Today',
        slotTime: '6:00 PM – 7:00 PM',
        customerName: 'Kavita Singh',
        customerPhone: '9811223344',
        totalAmount: 500,
        paidAmount: 200,
        paymentStatus: 'paid',
      })

      expect(booking.status).toBe('success')
      expect(booking.venueName).toBe('Sree Kanteerava Stadium')
      expect(booking.bookingRef).toMatch(/^VB-/)

      const bookings = JSON.parse(globalThis.localStorage.getItem('khelgrid_venue_bookings') || '[]')
      expect(bookings.length).toBeGreaterThan(0)
      expect(bookings[0].venueName).toBe('Sree Kanteerava Stadium')
    })
  })

  describe('recordListingSubscription', () => {
    it('records 1-Day, 1-Month, 6-Month, 1-Year, and Lifelong subscriptions to local storage', async () => {
      const sub = await recordListingSubscription({
        orderId: 'KG_ORD_SUB_01',
        paymentId: 'PAY_SUB_01',
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
      })

      expect(sub.status).toBe('success')
      expect(sub.subscriptionId).toBeTruthy()
      expect(sub.planName).toBe('1-Year Listing')
      expect(sub.expiresAt).not.toBeNull()

      const cached = JSON.parse(globalThis.localStorage.getItem('khelgrid_listing_subscriptions') || '[]')
      expect(cached.length).toBeGreaterThan(0)
      expect(cached[0].listingName).toBe('Bhaichung Bhutia Football School')
      expect(cached[0].amount).toBe(4499)
    })

    it('sets null expiresAt for lifelong subscription plan', async () => {
      const sub = await recordListingSubscription({
        orderId: 'KG_ORD_LIFE_01',
        paymentId: 'PAY_LIFE_01',
        listingType: 'venue',
        listingName: 'FSV Arena Bengaluru',
        city: 'Bengaluru',
        planId: 'lifelong',
        planName: 'Lifelong Listing',
        amount: 9999,
        durationDays: 0,
        customerName: 'Arena Manager',
        customerPhone: '9900112233',
        paymentStatus: 'paid',
      })

      expect(sub.status).toBe('success')
      expect(sub.expiresAt).toBeNull()
      expect(sub.subscriptionId).toBeTruthy()
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
