import { describe, expect, it } from 'vitest'
import { exportTurfBookingsToCsv } from './turfExportUtils'
import type { TurfBookingRecord } from './turfSlotManager'

describe('turfExportUtils Suite', () => {
  it('formats turf bookings array into valid CSV with headers', () => {
    const bookings: TurfBookingRecord[] = [
      {
        bookingId: 'TRF-20261120-A1B2',
        venueSlug: 'kanteerava',
        venueName: 'Sree Kanteerava Stadium',
        courtId: 'c1',
        courtName: 'Pitch 1 — FIFA AstroTurf',
        sport: 'Football',
        slotDate: '2026-11-20',
        slotTime: '07:00 PM – 08:00 PM',
        customerName: 'Vikram Verma',
        customerPhone: '9845011111',
        totalAmount: 1500,
        paidAmount: 300,
        balanceAmount: 1200,
        paymentStatus: 'upi_advance_paid',
        bookedAt: '2026-11-20T10:00:00Z',
        qrCodePayload: 'test',
      },
    ]

    const csv = exportTurfBookingsToCsv(bookings, 'Sree Kanteerava Stadium')
    expect(csv).toContain('# KhelGrid Turf Operations Booking Ledger — Sree Kanteerava Stadium')
    expect(csv).toContain('Booking Reference,Venue Name,Court / Pitch,Sport,Slot Date,Slot Time')
    expect(csv).toContain('TRF-20261120-A1B2')
    expect(csv).toContain('Vikram Verma')
    expect(csv).toContain('1500')
    expect(csv).toContain('300')
  })
})
