/**
 * KhelGrid Turf Booking Export Utilities
 * Provides CSV export for daily and monthly facility ledger records.
 */

import type { TurfBookingRecord } from './turfSlotManager'
import { downloadBlobFile } from '../academies/academyExportUtils'

export function exportTurfBookingsToCsv(bookings: TurfBookingRecord[], venueName: string): string {
  const headers = [
    'Booking Reference',
    'Venue Name',
    'Court / Pitch',
    'Sport',
    'Slot Date',
    'Slot Time',
    'Customer / Team',
    'Customer Phone',
    'Total Tariff (INR)',
    'Paid Advance (INR)',
    'Balance Due (INR)',
    'Payment Mode',
    'Booking Timestamp',
  ]

  const rows = bookings.map(b => [
    `"${b.bookingId}"`,
    `"${b.venueName.replace(/"/g, '""')}"`,
    `"${b.courtName.replace(/"/g, '""')}"`,
    `"${b.sport}"`,
    `"${b.slotDate}"`,
    `"${b.slotTime}"`,
    `"${b.customerName.replace(/"/g, '""')}"`,
    `"${b.customerPhone}"`,
    b.totalAmount,
    b.paidAmount,
    b.balanceAmount,
    `"${b.paymentStatus.toUpperCase()}"`,
    `"${b.bookedAt}"`,
  ])

  return [
    `# KhelGrid Turf Operations Booking Ledger — ${venueName}`,
    `# Exported: ${new Date().toISOString()}`,
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\n')
}

export { downloadBlobFile }
