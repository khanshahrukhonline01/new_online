import { beforeEach, describe, expect, it } from 'vitest'
import {
  generateOrderId,
  generateUpiUri,
  parseInrPrice,
  recordPaymentTransaction,
  recordVenueSlotBooking,
} from './paymentService'
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
})
