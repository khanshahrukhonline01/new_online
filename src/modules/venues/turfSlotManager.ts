/**
 * KhelGrid Turf & Facility Slot Booking Calendar Engine
 * Manages hourly court/pitch inventory, walk-in reservations,
 * UPI advance deposits, maintenance locks, and WhatsApp player vouchers.
 */

export interface TurfCourt {
  id: string
  venueSlug: string
  name: string
  sport: string
  surface: string
  isIndoor: boolean
  hasFloodlights: boolean
  defaultHourlyRate: number // in INR
  advanceDepositRate: number // in INR
}

export type TurfSlotStatus = 'available' | 'booked' | 'blocked'

export interface TurfSlot {
  id: string
  venueSlug: string
  courtId: string
  date: string // e.g. '2026-11-20' or 'Today'
  timeSlot: string // e.g. '07:00 PM – 08:00 PM'
  status: TurfSlotStatus
  hourlyPrice: number
  advanceDeposit: number
  bookingId?: string
  customerName?: string
  customerPhone?: string
  sport?: string
  paymentStatus?: 'upi_advance_paid' | 'pay_at_venue' | 'fully_paid'
  bookedAt?: string
  blockedReason?: string
}

export interface TurfBookingRecord {
  bookingId: string
  venueSlug: string
  venueName: string
  courtId: string
  courtName: string
  sport: string
  slotDate: string
  slotTime: string
  customerName: string
  customerPhone: string
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  paymentStatus: 'upi_advance_paid' | 'pay_at_venue' | 'fully_paid'
  upiVpa?: string
  bookedAt: string
  qrCodePayload: string
}

export interface TurfVenueSettings {
  venueSlug: string
  venueName: string
  managerName: string
  managerWhatsApp: string
  upiVpa: string
  allowPayAtVenue: boolean
  autoWhatsAppConfirmEnabled: boolean
}

export const HOURLY_TIME_SLOTS = [
  '06:00 AM – 07:00 AM',
  '07:00 AM – 08:00 AM',
  '08:00 AM – 09:00 AM',
  '09:00 AM – 10:00 AM',
  '10:00 AM – 11:00 AM',
  '11:00 AM – 12:00 PM',
  '12:00 PM – 01:00 PM',
  '01:00 PM – 02:00 PM',
  '02:00 PM – 03:00 PM',
  '03:00 PM – 04:00 PM',
  '04:00 PM – 05:00 PM',
  '05:00 PM – 06:00 PM',
  '06:00 PM – 07:00 PM',
  '07:00 PM – 08:00 PM',
  '08:00 PM – 09:00 PM',
  '09:00 PM – 10:00 PM',
  '10:00 PM – 11:00 PM',
]

export const DEFAULT_TURF_COURTS: TurfCourt[] = [
  {
    id: 'court-kan-1',
    venueSlug: 'sree-kanteerava-stadium',
    name: 'Pitch 1 — FIFA AstroTurf 7v7',
    sport: 'Football',
    surface: 'AstroTurf (FIFA 2-Star)',
    isIndoor: false,
    hasFloodlights: true,
    defaultHourlyRate: 1500,
    advanceDepositRate: 300,
  },
  {
    id: 'court-kan-2',
    venueSlug: 'sree-kanteerava-stadium',
    name: 'Pitch 2 — Floodlit Box Cricket Arena',
    sport: 'Box Cricket',
    surface: 'High-Density Turf & Net Enclosure',
    isIndoor: false,
    hasFloodlights: true,
    defaultHourlyRate: 1200,
    advanceDepositRate: 300,
  },
  {
    id: 'court-kan-3',
    venueSlug: 'sree-kanteerava-stadium',
    name: 'Court 3 — Synthetic Badminton Arena',
    sport: 'Badminton',
    surface: 'BWF Certified Synthetic Court',
    isIndoor: true,
    hasFloodlights: true,
    defaultHourlyRate: 600,
    advanceDepositRate: 200,
  },
  {
    id: 'court-tal-1',
    venueSlug: 'talkatora-indoor-stadium',
    name: 'Main Court A — BWF Synthetic',
    sport: 'Badminton',
    surface: 'International Polyurethane',
    isIndoor: true,
    hasFloodlights: true,
    defaultHourlyRate: 800,
    advanceDepositRate: 250,
  },
  {
    id: 'court-andh-1',
    venueSlug: 'andheri-sports-complex',
    name: 'Turf A — 5v5 Football Cage',
    sport: 'Football',
    surface: 'FIFA Quality AstroTurf',
    isIndoor: false,
    hasFloodlights: true,
    defaultHourlyRate: 1400,
    advanceDepositRate: 300,
  },
]

const STORAGE_KEYS = {
  SLOTS: 'khelgrid_turf_slots_store',
  BOOKINGS: 'khelgrid_turf_bookings_store',
  COURTS: 'khelgrid_turf_courts_store',
  SETTINGS: 'khelgrid_turf_settings_store',
}

const memoryStore = new Map<string, string>()

export function clearTurfSlotMemoryStore(): void {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.SLOTS)
      window.localStorage.removeItem(STORAGE_KEYS.BOOKINGS)
      window.localStorage.removeItem(STORAGE_KEYS.COURTS)
      window.localStorage.removeItem(STORAGE_KEYS.SETTINGS)
    } catch {
      // ignore
    }
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  let raw: string | null = null
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      raw = window.localStorage.getItem(key)
    } catch {
      raw = null
    }
  }
  if (!raw && memoryStore.has(key)) {
    raw = memoryStore.get(key) || null
  }
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  const serialized = JSON.stringify(data)
  memoryStore.set(key, serialized)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, serialized)
    } catch {
      // ignore
    }
  }
}

function normalizeDate(date: string): string {
  if (date === 'Today') {
    return new Date().toISOString().slice(0, 10)
  }
  if (date === 'Tomorrow') {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().slice(0, 10)
  }
  if (date === 'Day After') {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().slice(0, 10)
  }
  return date
}

// Public API

export function getTurfCourts(venueSlug: string): TurfCourt[] {
  const allCourts = loadFromStorage<TurfCourt[]>(STORAGE_KEYS.COURTS, DEFAULT_TURF_COURTS)
  const venueCourts = allCourts.filter(c => c.venueSlug === venueSlug)
  if (venueCourts.length > 0) return venueCourts

  // Fallback court for any unconfigured venue
  return [
    {
      id: `court-${venueSlug}-1`,
      venueSlug,
      name: 'Pitch 1 — Main Turf / Court',
      sport: 'Multi-Sport Turf',
      surface: 'Grassroots AstroTurf',
      isIndoor: false,
      hasFloodlights: true,
      defaultHourlyRate: 1200,
      advanceDepositRate: 300,
    },
  ]
}

export function saveTurfCourt(court: TurfCourt): void {
  const allCourts = loadFromStorage<TurfCourt[]>(STORAGE_KEYS.COURTS, DEFAULT_TURF_COURTS)
  const index = allCourts.findIndex(c => c.id === court.id)
  const updated = index >= 0 ? allCourts.map(c => (c.id === court.id ? court : c)) : [court, ...allCourts]
  saveToStorage(STORAGE_KEYS.COURTS, updated)
}

export function getTurfSlots(venueSlug: string, date: string, courtId: string): TurfSlot[] {
  const resolvedDate = normalizeDate(date)
  const courts = getTurfCourts(venueSlug)
  const targetCourt = courts.find(c => c.id === courtId) || courts[0]
  const storedSlots = loadFromStorage<TurfSlot[]>(STORAGE_KEYS.SLOTS, [])

  return HOURLY_TIME_SLOTS.map(timeSlot => {
    const slotId = `${venueSlug}_${targetCourt.id}_${resolvedDate}_${timeSlot}`
    const existing = storedSlots.find(s => s.id === slotId)
    if (existing) return existing

    return {
      id: slotId,
      venueSlug,
      courtId: targetCourt.id,
      date: resolvedDate,
      timeSlot,
      status: 'available',
      hourlyPrice: targetCourt.defaultHourlyRate,
      advanceDeposit: targetCourt.advanceDepositRate,
    }
  })
}

export function bookTurfSlot(params: {
  venueSlug: string
  venueName: string
  courtId: string
  courtName: string
  date: string
  timeSlot: string
  customerName: string
  customerPhone: string
  sport?: string
  paymentMethod: 'upi_advance_paid' | 'pay_at_venue' | 'fully_paid'
  hourlyPrice?: number
  advanceDeposit?: number
  upiVpa?: string
}): { success: boolean; slot?: TurfSlot; booking?: TurfBookingRecord; error?: string } {
  const resolvedDate = normalizeDate(params.date)
  const slotId = `${params.venueSlug}_${params.courtId}_${resolvedDate}_${params.timeSlot}`
  const storedSlots = loadFromStorage<TurfSlot[]>(STORAGE_KEYS.SLOTS, [])
  const existingSlot = storedSlots.find(s => s.id === slotId)

  if (existingSlot && existingSlot.status === 'booked') {
    return { success: false, error: 'This time slot is already reserved.' }
  }

  const courts = getTurfCourts(params.venueSlug)
  const court = courts.find(c => c.id === params.courtId) || courts[0]
  const totalAmount = params.hourlyPrice ?? court.defaultHourlyRate
  const deposit = params.advanceDeposit ?? court.advanceDepositRate
  const paidAmount = params.paymentMethod === 'fully_paid' ? totalAmount : params.paymentMethod === 'upi_advance_paid' ? deposit : 0
  const balanceAmount = Math.max(0, totalAmount - paidAmount)

  const bookingId = `TRF-${resolvedDate.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const qrPayload = JSON.stringify({
    ref: bookingId,
    venue: params.venueName,
    court: params.courtName,
    date: resolvedDate,
    time: params.timeSlot,
    player: params.customerName,
    status: params.paymentMethod,
  })

  const newBooking: TurfBookingRecord = {
    bookingId,
    venueSlug: params.venueSlug,
    venueName: params.venueName,
    courtId: params.courtId,
    courtName: params.courtName,
    sport: params.sport || court.sport,
    slotDate: resolvedDate,
    slotTime: params.timeSlot,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    totalAmount,
    paidAmount,
    balanceAmount,
    paymentStatus: params.paymentMethod,
    upiVpa: params.upiVpa,
    bookedAt: new Date().toISOString(),
    qrCodePayload: qrPayload,
  }

  const newSlot: TurfSlot = {
    id: slotId,
    venueSlug: params.venueSlug,
    courtId: params.courtId,
    date: resolvedDate,
    timeSlot: params.timeSlot,
    status: 'booked',
    hourlyPrice: totalAmount,
    advanceDeposit: deposit,
    bookingId,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    sport: newBooking.sport,
    paymentStatus: params.paymentMethod,
    bookedAt: newBooking.bookedAt,
  }

  const updatedSlots = [...storedSlots.filter(s => s.id !== slotId), newSlot]
  saveToStorage(STORAGE_KEYS.SLOTS, updatedSlots)

  const storedBookings = loadFromStorage<TurfBookingRecord[]>(STORAGE_KEYS.BOOKINGS, [])
  saveToStorage(STORAGE_KEYS.BOOKINGS, [newBooking, ...storedBookings])

  // Broadcast cross-window sync event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khelgrid:venue-booked', { detail: newBooking }))
  }

  return { success: true, slot: newSlot, booking: newBooking }
}

export function toggleSlotBlocked(
  venueSlug: string,
  date: string,
  courtId: string,
  timeSlot: string,
  reason: string = 'Turf Maintenance / Closed'
): TurfSlot {
  const resolvedDate = normalizeDate(date)
  const slotId = `${venueSlug}_${courtId}_${resolvedDate}_${timeSlot}`
  const storedSlots = loadFromStorage<TurfSlot[]>(STORAGE_KEYS.SLOTS, [])
  const existing = storedSlots.find(s => s.id === slotId)
  const courts = getTurfCourts(venueSlug)
  const court = courts.find(c => c.id === courtId) || courts[0]

  const nextStatus: TurfSlotStatus = existing?.status === 'blocked' ? 'available' : 'blocked'

  const updatedSlot: TurfSlot = {
    id: slotId,
    venueSlug,
    courtId,
    date: resolvedDate,
    timeSlot,
    status: nextStatus,
    hourlyPrice: existing?.hourlyPrice ?? court.defaultHourlyRate,
    advanceDeposit: existing?.advanceDeposit ?? court.advanceDepositRate,
    blockedReason: nextStatus === 'blocked' ? reason : undefined,
  }

  const updatedSlots = [...storedSlots.filter(s => s.id !== slotId), updatedSlot]
  saveToStorage(STORAGE_KEYS.SLOTS, updatedSlots)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khelgrid:venue-booked', { detail: updatedSlot }))
  }

  return updatedSlot
}

export function cancelTurfBooking(venueSlug: string, date: string, courtId: string, timeSlot: string): boolean {
  const resolvedDate = normalizeDate(date)
  const slotId = `${venueSlug}_${courtId}_${resolvedDate}_${timeSlot}`
  const storedSlots = loadFromStorage<TurfSlot[]>(STORAGE_KEYS.SLOTS, [])
  const existing = storedSlots.find(s => s.id === slotId)
  if (!existing || existing.status !== 'booked') return false

  const courts = getTurfCourts(venueSlug)
  const court = courts.find(c => c.id === courtId) || courts[0]

  const freedSlot: TurfSlot = {
    id: slotId,
    venueSlug,
    courtId,
    date: resolvedDate,
    timeSlot,
    status: 'available',
    hourlyPrice: court.defaultHourlyRate,
    advanceDeposit: court.advanceDepositRate,
  }

  const updatedSlots = [...storedSlots.filter(s => s.id !== slotId), freedSlot]
  saveToStorage(STORAGE_KEYS.SLOTS, updatedSlots)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khelgrid:venue-booked', { detail: freedSlot }))
  }

  return true
}

export function getTurfBookings(venueSlug: string): TurfBookingRecord[] {
  const allBookings = loadFromStorage<TurfBookingRecord[]>(STORAGE_KEYS.BOOKINGS, [])
  return allBookings.filter(b => b.venueSlug === venueSlug)
}

export function getTurfVenueSettings(venueSlug: string, venueNameFallback = 'Sports Arena'): TurfVenueSettings {
  const allSettings = loadFromStorage<Record<string, TurfVenueSettings>>(STORAGE_KEYS.SETTINGS, {})
  if (allSettings[venueSlug]) return allSettings[venueSlug]

  return {
    venueSlug,
    venueName: venueNameFallback,
    managerName: 'Turf Operations Desk',
    managerWhatsApp: '9845012345',
    upiVpa: `${venueSlug.replace(/[^a-z0-9]/g, '')}@okaxis`,
    allowPayAtVenue: true,
    autoWhatsAppConfirmEnabled: true,
  }
}

export function saveTurfVenueSettings(settings: TurfVenueSettings): void {
  const allSettings = loadFromStorage<Record<string, TurfVenueSettings>>(STORAGE_KEYS.SETTINGS, {})
  allSettings[settings.venueSlug] = settings
  saveToStorage(STORAGE_KEYS.SETTINGS, allSettings)
}

export function generateWhatsAppTurfConfirmationUrl(booking: TurfBookingRecord, managerPhone?: string): string {
  const cleanPhone = (managerPhone || booking.customerPhone).replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`

  const message = [
    `🏟️ *Slot Booking Confirmation — ${booking.venueName}*`,
    ``,
    `Hi *${booking.customerName}*, your turf/court reservation is confirmed!`,
    ``,
    `📅 Date: *${booking.slotDate}*`,
    `⏰ Time: *${booking.slotTime}*`,
    `📍 Court: *${booking.courtName}* (${booking.sport})`,
    `🔖 Booking Ref: *#${booking.bookingId}*`,
    ``,
    `💰 Total Tariff: *₹${booking.totalAmount.toLocaleString('en-IN')}*`,
    `✅ Advance Paid: *₹${booking.paidAmount.toLocaleString('en-IN')}*`,
    booking.balanceAmount > 0
      ? `⏳ Balance at Venue: *₹${booking.balanceAmount.toLocaleString('en-IN')}*`
      : `🎉 Fully Paid via UPI`,
    ``,
    `Please report 10 minutes prior to your slot time with appropriate sports footwear.`,
    `Warm regards,`,
    `Turf Management · ${booking.venueName}`,
  ].join('\n')

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
}

export function generateTurfUpiPayLink(params: {
  vpa: string
  name: string
  amount: number
  note: string
}): string {
  const { vpa, name, amount, note } = params
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`
}

export function getTurfDayKpis(venueSlug: string, date: string, courtId: string) {
  const slots = getTurfSlots(venueSlug, date, courtId)
  const totalSlots = slots.length
  const bookedSlots = slots.filter(s => s.status === 'booked')
  const blockedSlots = slots.filter(s => s.status === 'blocked')
  const availableSlots = slots.filter(s => s.status === 'available')

  const totalAdvanceRevenue = bookedSlots.reduce((acc, s) => acc + s.advanceDeposit, 0)
  const totalProjectedRevenue = bookedSlots.reduce((acc, s) => acc + s.hourlyPrice, 0)

  return {
    totalSlots,
    bookedCount: bookedSlots.length,
    blockedCount: blockedSlots.length,
    availableCount: availableSlots.length,
    occupancyRate: totalSlots > 0 ? Math.round((bookedSlots.length / totalSlots) * 100) : 0,
    totalAdvanceRevenue,
    totalProjectedRevenue,
  }
}
