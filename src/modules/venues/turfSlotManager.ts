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
  parentCourtId?: string // If this is a sub-pitch (e.g. 7v7 half field inside 11v11)
  childCourtIds?: string[] // If this is a full pitch partitioned into sub-courts
}

export type TurfSlotStatus = 'available' | 'booked' | 'blocked' | 'held'

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
  holdExpiresAt?: string
  heldByPhone?: string
  isPeakHour?: boolean
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
  checkedInAt?: string
  checkedInBy?: string
}

export interface TurfPricingConfig {
  venueSlug: string
  isDynamicPricingEnabled: boolean
  peakStartHour: number // 18 (6:00 PM)
  peakEndHour: number // 23 (11:00 PM)
  peakMultiplier: number // 1.35
  weekendMultiplier: number // 1.25
  floodlightSurchargeHourly?: number // e.g. 250 INR/hr
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
    name: 'Pitch 1 — FIFA AstroTurf 7v7 (Full Ground)',
    sport: 'Football',
    surface: 'AstroTurf (FIFA 2-Star)',
    isIndoor: false,
    hasFloodlights: true,
    defaultHourlyRate: 1500,
    advanceDepositRate: 300,
    childCourtIds: ['court-kan-1a', 'court-kan-1b'],
  },
  {
    id: 'court-kan-1a',
    venueSlug: 'sree-kanteerava-stadium',
    name: 'Pitch 1A — Sub-Field 5v5 (North Box)',
    sport: 'Football',
    surface: 'AstroTurf (FIFA 2-Star)',
    isIndoor: false,
    hasFloodlights: true,
    defaultHourlyRate: 850,
    advanceDepositRate: 200,
    parentCourtId: 'court-kan-1',
  },
  {
    id: 'court-kan-1b',
    venueSlug: 'sree-kanteerava-stadium',
    name: 'Pitch 1B — Sub-Field 5v5 (South Box)',
    sport: 'Football',
    surface: 'AstroTurf (FIFA 2-Star)',
    isIndoor: false,
    hasFloodlights: true,
    defaultHourlyRate: 850,
    advanceDepositRate: 200,
    parentCourtId: 'court-kan-1',
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
  PRICING: 'khelgrid_turf_pricing_store',
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
      window.localStorage.removeItem(STORAGE_KEYS.PRICING)
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
    if (existing && (existing.status === 'booked' || existing.status === 'blocked')) {
      return existing
    }

    // Partitioning Concurrency Check 1: Parent court reservation
    if (targetCourt.parentCourtId) {
      const parentSlotId = `${venueSlug}_${targetCourt.parentCourtId}_${resolvedDate}_${timeSlot}`
      const parentSlot = storedSlots.find(s => s.id === parentSlotId)
      if (parentSlot && parentSlot.status === 'booked') {
        return {
          id: slotId,
          venueSlug,
          courtId: targetCourt.id,
          date: resolvedDate,
          timeSlot,
          status: 'blocked',
          blockedReason: `Unavailable: Full pitch is booked (${parentSlot.customerName || 'Reserved'})`,
          hourlyPrice: targetCourt.defaultHourlyRate,
          advanceDeposit: targetCourt.advanceDepositRate,
        }
      }
    }

    // Partitioning Concurrency Check 2: Child sub-court reservation
    if (targetCourt.childCourtIds && targetCourt.childCourtIds.length > 0) {
      for (const childId of targetCourt.childCourtIds) {
        const childSlotId = `${venueSlug}_${childId}_${resolvedDate}_${timeSlot}`
        const childSlot = storedSlots.find(s => s.id === childSlotId)
        if (childSlot && childSlot.status === 'booked') {
          const childCourt = courts.find(c => c.id === childId)
          return {
            id: slotId,
            venueSlug,
            courtId: targetCourt.id,
            date: resolvedDate,
            timeSlot,
            status: 'blocked',
            blockedReason: `Unavailable: Sub-pitch (${childCourt?.name || childId}) is booked`,
            hourlyPrice: targetCourt.defaultHourlyRate,
            advanceDeposit: targetCourt.advanceDepositRate,
          }
        }
      }
    }

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

  // Partitioning Concurrency Check: If this court has a parent, check if parent is booked or held
  if (court.parentCourtId) {
    const parentSlotId = `${params.venueSlug}_${court.parentCourtId}_${resolvedDate}_${params.timeSlot}`
    const parentSlot = storedSlots.find(s => s.id === parentSlotId)
    if (parentSlot && (parentSlot.status === 'booked' || parentSlot.status === 'held')) {
      return { success: false, error: 'Cannot book: The full main pitch is already reserved for this time slot.' }
    }
  }

  // Partitioning Concurrency Check: If this court is a parent court, check if any child sub-court is booked or held
  if (court.childCourtIds && court.childCourtIds.length > 0) {
    for (const childId of court.childCourtIds) {
      const childSlotId = `${params.venueSlug}_${childId}_${resolvedDate}_${params.timeSlot}`
      const childSlot = storedSlots.find(s => s.id === childSlotId)
      if (childSlot && (childSlot.status === 'booked' || childSlot.status === 'held')) {
        const childCourt = courts.find(c => c.id === childId)
        return { success: false, error: `Cannot book: Sub-court (${childCourt?.name || childId}) is already reserved for this time slot.` }
      }
    }
  }
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

// ---------------------------------------------------------------------------
// Dynamic Peak Pricing & Slot Yield Engine
// ---------------------------------------------------------------------------

export function getTurfPricingConfig(venueSlug: string): TurfPricingConfig {
  const allConfigs = loadFromStorage<Record<string, TurfPricingConfig>>(STORAGE_KEYS.PRICING, {})
  if (allConfigs[venueSlug]) return allConfigs[venueSlug]
  return {
    venueSlug,
    isDynamicPricingEnabled: true,
    peakStartHour: 18, // 06:00 PM
    peakEndHour: 23, // 11:00 PM
    peakMultiplier: 1.35,
    weekendMultiplier: 1.25,
    floodlightSurchargeHourly: 200,
  }
}

export function saveTurfPricingConfig(config: TurfPricingConfig): void {
  const allConfigs = loadFromStorage<Record<string, TurfPricingConfig>>(STORAGE_KEYS.PRICING, {})
  allConfigs[config.venueSlug] = config
  saveToStorage(STORAGE_KEYS.PRICING, allConfigs)
}

export function isSlotPeakHour(timeSlot: string, dateStr?: string): boolean {
  const match = timeSlot.match(/^(\d{1,2}):\d{2}\s*(AM|PM)/i)
  if (!match) return false
  let hour = parseInt(match[1], 10)
  const ampm = match[2].toUpperCase()
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0

  const isEvening = hour >= 18 && hour < 23
  if (dateStr) {
    const d = new Date(dateStr)
    const day = d.getDay()
    const isWeekend = day === 0 || day === 6
    if (isWeekend) return true
  }
  return isEvening
}

export function calculateSlotDynamicPrice(
  court: TurfCourt,
  timeSlot: string,
  dateStr?: string,
  customConfig?: TurfPricingConfig
): {
  hourlyPrice: number
  advanceDeposit: number
  isPeak: boolean
  peakLabel: string
  breakdown?: {
    baseRate: number
    peakSurcharge: number
    floodlightSurcharge: number
    total: number
  }
} {
  const config = customConfig || getTurfPricingConfig(court.venueSlug)
  const baseRate = court.defaultHourlyRate

  if (!config.isDynamicPricingEnabled) {
    return {
      hourlyPrice: baseRate,
      advanceDeposit: court.advanceDepositRate,
      isPeak: false,
      peakLabel: 'Standard Rate',
      breakdown: { baseRate, peakSurcharge: 0, floodlightSurcharge: 0, total: baseRate },
    }
  }

  const isPeak = isSlotPeakHour(timeSlot, dateStr)
  if (!isPeak) {
    return {
      hourlyPrice: baseRate,
      advanceDeposit: court.advanceDepositRate,
      isPeak: false,
      peakLabel: 'Off-Peak Rate',
      breakdown: { baseRate, peakSurcharge: 0, floodlightSurcharge: 0, total: baseRate },
    }
  }

  const mult = config.peakMultiplier || 1.35
  const roundedPrice = Math.round((baseRate * mult) / 50) * 50
  const peakSurcharge = roundedPrice - baseRate

  let floodlightSurcharge = 0
  const match = timeSlot.match(/^(\d{1,2}):\d{2}\s*(AM|PM)/i)
  if (match) {
    let hour = parseInt(match[1], 10)
    const ampm = match[2].toUpperCase()
    if (ampm === 'PM' && hour !== 12) hour += 12
    if (ampm === 'AM' && hour === 12) hour = 0
    if (hour >= 18 && court.hasFloodlights && config.floodlightSurchargeHourly) {
      floodlightSurcharge = config.floodlightSurchargeHourly
    }
  }

  const finalPrice = roundedPrice + floodlightSurcharge
  const roundedDeposit = Math.round((finalPrice * 0.25) / 50) * 50

  const peakLabel = floodlightSurcharge > 0
    ? '⚡ Prime Floodlit Peak'
    : '⚡ Peak Hour Rate'

  return {
    hourlyPrice: finalPrice,
    advanceDeposit: Math.max(court.advanceDepositRate, roundedDeposit),
    isPeak: true,
    peakLabel,
    breakdown: {
      baseRate,
      peakSurcharge,
      floodlightSurcharge,
      total: finalPrice,
    },
  }
}

// ---------------------------------------------------------------------------
// 10-Minute Cart Slot Hold Engine (Anti-Collision Lock)
// ---------------------------------------------------------------------------

export function holdTurfSlot(
  venueSlug: string,
  date: string,
  courtId: string,
  timeSlot: string,
  customerPhone: string
): { success: boolean; slot?: TurfSlot; message?: string } {
  const resolvedDate = normalizeDate(date)
  const slotId = `${venueSlug}_${courtId}_${resolvedDate}_${timeSlot}`
  const storedSlots = loadFromStorage<TurfSlot[]>(STORAGE_KEYS.SLOTS, [])
  const existing = storedSlots.find(s => s.id === slotId)

  if (existing?.status === 'booked') {
    return { success: false, message: 'This court slot is already booked.' }
  }
  if (existing?.status === 'blocked') {
    return { success: false, message: 'This slot is reserved for maintenance.' }
  }

  if (existing?.status === 'held' && existing.holdExpiresAt) {
    const isStillHeld = new Date(existing.holdExpiresAt).getTime() > Date.now()
    if (isStillHeld && existing.heldByPhone !== customerPhone) {
      return { success: false, message: 'This slot is currently held by another user in payment checkout.' }
    }
  }

  const courts = getTurfCourts(venueSlug)
  const court = courts.find(c => c.id === courtId) || courts[0]

  // Partitioning Concurrency Check: If court has parent
  if (court.parentCourtId) {
    const parentSlotId = `${venueSlug}_${court.parentCourtId}_${resolvedDate}_${timeSlot}`
    const parentSlot = storedSlots.find(s => s.id === parentSlotId)
    if (parentSlot && (parentSlot.status === 'booked' || parentSlot.status === 'held')) {
      return { success: false, message: 'Cannot hold: The full main pitch is already reserved for this time slot.' }
    }
  }

  // Partitioning Concurrency Check: If court has children
  if (court.childCourtIds && court.childCourtIds.length > 0) {
    for (const childId of court.childCourtIds) {
      const childSlotId = `${venueSlug}_${childId}_${resolvedDate}_${timeSlot}`
      const childSlot = storedSlots.find(s => s.id === childSlotId)
      if (childSlot && (childSlot.status === 'booked' || childSlot.status === 'held')) {
        const childCourt = courts.find(c => c.id === childId)
        return { success: false, message: `Cannot hold: Sub-court (${childCourt?.name || childId}) is already reserved for this time slot.` }
      }
    }
  }
  const pricing = calculateSlotDynamicPrice(court, timeSlot, resolvedDate)

  const holdExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  const heldSlot: TurfSlot = {
    id: slotId,
    venueSlug,
    courtId,
    date: resolvedDate,
    timeSlot,
    status: 'held',
    hourlyPrice: pricing.hourlyPrice,
    advanceDeposit: pricing.advanceDeposit,
    holdExpiresAt: holdExpiry,
    heldByPhone: customerPhone,
    isPeakHour: pricing.isPeak,
  }

  const updatedSlots = [...storedSlots.filter(s => s.id !== slotId), heldSlot]
  saveToStorage(STORAGE_KEYS.SLOTS, updatedSlots)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khelgrid:venue-booked', { detail: heldSlot }))
  }

  return { success: true, slot: heldSlot }
}

export function releaseExpiredHolds(venueSlug: string, date: string): TurfSlot[] {
  const resolvedDate = normalizeDate(date)
  const storedSlots = loadFromStorage<TurfSlot[]>(STORAGE_KEYS.SLOTS, [])
  const now = Date.now()
  let hasChanges = false

  const updatedSlots = storedSlots.map(s => {
    if (s.venueSlug === venueSlug && s.date === resolvedDate && s.status === 'held' && s.holdExpiresAt) {
      if (new Date(s.holdExpiresAt).getTime() <= now) {
        hasChanges = true
        return {
          ...s,
          status: 'available' as TurfSlotStatus,
          holdExpiresAt: undefined,
          heldByPhone: undefined,
        }
      }
    }
    return s
  })

  if (hasChanges) {
    saveToStorage(STORAGE_KEYS.SLOTS, updatedSlots)
  }
  return updatedSlots.filter(s => s.venueSlug === venueSlug && s.date === resolvedDate)
}

// ---------------------------------------------------------------------------
// Universal Turf Bookings & On-Ground Check-In Desk
// ---------------------------------------------------------------------------

export function getAllTurfBookings(): TurfBookingRecord[] {
  return loadFromStorage<TurfBookingRecord[]>(STORAGE_KEYS.BOOKINGS, [])
}

export function lookupTurfBooking(bookingId: string): TurfBookingRecord | null {
  const clean = bookingId.trim().toUpperCase()
  const all = getAllTurfBookings()
  return all.find(b => b.bookingId.toUpperCase() === clean) || null
}

export function admitTurfBooking(
  bookingId: string,
  gatekeeperName: string = 'Turf Ground Reception'
): { success: boolean; message: string; booking?: TurfBookingRecord } {
  const clean = bookingId.trim().toUpperCase()
  const all = getAllTurfBookings()
  const existing = all.find(b => b.bookingId.toUpperCase() === clean)

  if (!existing) {
    return { success: false, message: 'Turf booking voucher not found' }
  }

  if (existing.checkedInAt) {
    return {
      success: false,
      message: `Turf court was already admitted at ${new Date(existing.checkedInAt).toLocaleTimeString()}${existing.checkedInBy ? ` by ${existing.checkedInBy}` : ''}.`,
      booking: existing,
    }
  }

  const updated: TurfBookingRecord = {
    ...existing,
    checkedInAt: new Date().toISOString(),
    checkedInBy: gatekeeperName,
  }

  const updatedList = all.map(b => (b.bookingId === existing.bookingId ? updated : b))
  saveToStorage(STORAGE_KEYS.BOOKINGS, updatedList)

  return {
    success: true,
    message: `Court access confirmed for ${existing.customerName} on ${existing.courtName}!`,
    booking: updated,
  }
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
