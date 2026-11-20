import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearTurfSlotMemoryStore,
  getTurfCourts,
  getTurfSlots,
  bookTurfSlot,
  toggleSlotBlocked,
  cancelTurfBooking,
  getTurfBookings,
  getTurfVenueSettings,
  saveTurfVenueSettings,
  generateWhatsAppTurfConfirmationUrl,
  generateTurfUpiPayLink,
  getTurfDayKpis,
  HOURLY_TIME_SLOTS,
  calculateSlotDynamicPrice,
  holdTurfSlot,
  lookupTurfBooking,
  admitTurfBooking,
  createQuickWalkInBooking,
  createRecurringSubscription,
  getRecurringSubscriptions,
  cancelRecurringSubscription,
} from './turfSlotManager'

describe('turfSlotManager Unit Suite', () => {
  beforeEach(() => {
    clearTurfSlotMemoryStore()
  })

  it('retrieves default turf courts for sree-kanteerava-stadium', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    expect(courts.length).toBeGreaterThanOrEqual(3)
    expect(courts[0].name).toContain('Pitch 1')
    expect(courts[0].sport).toBe('Football')
  })

  it('generates 17 hourly slots for any given date and court', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const slots = getTurfSlots('sree-kanteerava-stadium', '2026-11-20', courts[0].id)
    expect(slots.length).toBe(HOURLY_TIME_SLOTS.length)
    expect(slots[0].timeSlot).toBe('06:00 AM – 07:00 AM')
    expect(slots[0].status).toBe('available')
  })

  it('books an available slot and creates verifiable booking record', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0]

    const result = bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: court.id,
      courtName: court.name,
      date: '2026-11-20',
      timeSlot: '07:00 PM – 08:00 PM',
      customerName: 'Rohit Sharma',
      customerPhone: '9876543210',
      sport: 'Football',
      paymentMethod: 'upi_advance_paid',
      hourlyPrice: 1500,
      advanceDeposit: 300,
      upiVpa: 'kanteerava@okaxis',
    })

    expect(result.success).toBe(true)
    expect(result.booking).toBeDefined()
    expect(result.booking?.bookingId).toMatch(/^TRF-/)
    expect(result.booking?.customerName).toBe('Rohit Sharma')
    expect(result.booking?.paidAmount).toBe(300)
    expect(result.booking?.balanceAmount).toBe(1200)

    const slots = getTurfSlots('sree-kanteerava-stadium', '2026-11-20', court.id)
    const booked = slots.find(s => s.timeSlot === '07:00 PM – 08:00 PM')
    expect(booked?.status).toBe('booked')
    expect(booked?.customerName).toBe('Rohit Sharma')

    const allBookings = getTurfBookings('sree-kanteerava-stadium')
    expect(allBookings.length).toBe(1)
    expect(allBookings[0].customerName).toBe('Rohit Sharma')

    // Double-booking check
    const duplicate = bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: court.id,
      courtName: court.name,
      date: '2026-11-20',
      timeSlot: '07:00 PM – 08:00 PM',
      customerName: 'Another Team',
      customerPhone: '9123456780',
      paymentMethod: 'pay_at_venue',
    })
    expect(duplicate.success).toBe(false)
    expect(duplicate.error).toContain('already reserved')
  })

  it('toggles slot blocked state for maintenance', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0]

    const blocked = toggleSlotBlocked('sree-kanteerava-stadium', '2026-11-20', court.id, '11:00 AM – 12:00 PM', 'Turf Grooming')
    expect(blocked.status).toBe('blocked')
    expect(blocked.blockedReason).toBe('Turf Grooming')

    const unblocked = toggleSlotBlocked('sree-kanteerava-stadium', '2026-11-20', court.id, '11:00 AM – 12:00 PM')
    expect(unblocked.status).toBe('available')
  })

  it('cancels booking and frees up the slot', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0]

    bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: court.id,
      courtName: court.name,
      date: '2026-11-20',
      timeSlot: '08:00 PM – 09:00 PM',
      customerName: 'Vikram Verma',
      customerPhone: '9845011111',
      paymentMethod: 'pay_at_venue',
    })

    const cancelled = cancelTurfBooking('sree-kanteerava-stadium', '2026-11-20', court.id, '08:00 PM – 09:00 PM')
    expect(cancelled).toBe(true)

    const slots = getTurfSlots('sree-kanteerava-stadium', '2026-11-20', court.id)
    const slot = slots.find(s => s.timeSlot === '08:00 PM – 09:00 PM')
    expect(slot?.status).toBe('available')
  })

  it('generates WhatsApp turf booking voucher link and UPI deep-link', () => {
    const booking = {
      bookingId: 'TRF-20261120-TEST',
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: 'c1',
      courtName: 'Pitch 1 — FIFA AstroTurf',
      sport: 'Football',
      slotDate: '2026-11-20',
      slotTime: '07:00 PM – 08:00 PM',
      customerName: 'Sunil Chhetri',
      customerPhone: '9876500000',
      totalAmount: 1500,
      paidAmount: 300,
      balanceAmount: 1200,
      paymentStatus: 'upi_advance_paid' as const,
      bookedAt: new Date().toISOString(),
      qrCodePayload: 'test',
    }

    const waUrl = generateWhatsAppTurfConfirmationUrl(booking)
    expect(waUrl).toContain('https://wa.me/919876500000?text=')
    expect(waUrl).toContain(encodeURIComponent('TRF-20261120-TEST'))
    expect(waUrl).toContain(encodeURIComponent('₹1,500'))
    expect(waUrl).toContain(encodeURIComponent('₹300'))

    const upiLink = generateTurfUpiPayLink({
      vpa: 'turf@okhdfcbank',
      name: 'Kanteerava Turf',
      amount: 300,
      note: 'Advance Slot Deposit',
    })
    expect(upiLink).toContain('pa=turf%40okhdfcbank')
  })

  it('computes daily turf KPIs accurately', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0]

    bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: court.id,
      courtName: court.name,
      date: '2026-11-20',
      timeSlot: '06:00 PM – 07:00 PM',
      customerName: 'Player 1',
      customerPhone: '9845011111',
      paymentMethod: 'upi_advance_paid',
      hourlyPrice: 1500,
      advanceDeposit: 300,
    })

    const kpis = getTurfDayKpis('sree-kanteerava-stadium', '2026-11-20', court.id)
    expect(kpis.totalSlots).toBe(17)
    expect(kpis.bookedCount).toBe(1)
    expect(kpis.availableCount).toBe(16)
    expect(kpis.totalAdvanceRevenue).toBe(300)
    expect(kpis.totalProjectedRevenue).toBe(1500)
  })

  it('persists and loads turf venue settings', () => {
    saveTurfVenueSettings({
      venueSlug: 'custom-turf-arena',
      venueName: 'Custom Turf Arena',
      managerName: 'Manager Deepak',
      managerWhatsApp: '9876543210',
      upiVpa: 'customturf@icici',
      allowPayAtVenue: true,
      autoWhatsAppConfirmEnabled: true,
    })

    const loaded = getTurfVenueSettings('custom-turf-arena')
    expect(loaded.managerName).toBe('Manager Deepak')
    expect(loaded.upiVpa).toBe('customturf@icici')
  })

  it('calculates dynamic peak hour pricing and multipliers', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0] // default 1500

    const offPeak = calculateSlotDynamicPrice(court, '10:00 AM – 11:00 AM', '2026-11-20') // weekday morning
    expect(offPeak.isPeak).toBe(false)
    expect(offPeak.hourlyPrice).toBe(court.defaultHourlyRate)

    const peakEvening = calculateSlotDynamicPrice(court, '07:00 PM – 08:00 PM', '2026-11-20') // weekday 7PM
    expect(peakEvening.isPeak).toBe(true)
    expect(peakEvening.hourlyPrice).toBeGreaterThan(court.defaultHourlyRate)
  })

  it('holds a slot for 10 minutes preventing collisions and releases when expired', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0]

    const holdRes = holdTurfSlot('sree-kanteerava-stadium', '2026-11-20', court.id, '08:00 AM – 09:00 AM', '9876543210')
    expect(holdRes.success).toBe(true)
    expect(holdRes.slot?.status).toBe('held')

    // Second user with different phone cannot snatch held slot
    const secondHold = holdTurfSlot('sree-kanteerava-stadium', '2026-11-20', court.id, '08:00 AM – 09:00 AM', '9123456789')
    expect(secondHold.success).toBe(false)
    expect(secondHold.message).toContain('currently held')
  })

  it('looks up a booking and admits court entry at the ground reception', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0]

    const booked = bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: court.id,
      courtName: court.name,
      date: '2026-11-20',
      timeSlot: '09:00 PM – 10:00 PM',
      customerName: 'Aditya Mehta',
      customerPhone: '9845012345',
      paymentMethod: 'upi_advance_paid',
      hourlyPrice: 1500,
      advanceDeposit: 300,
    })

    const bookingId = booked.booking!.bookingId
    const found = lookupTurfBooking(bookingId)
    expect(found).not.toBeNull()
    expect(found?.customerName).toBe('Aditya Mehta')

    const admitRes = admitTurfBooking(bookingId, 'Gatekeeper Suresh')
    expect(admitRes.success).toBe(true)
    expect(admitRes.booking?.checkedInBy).toBe('Gatekeeper Suresh')

    // Double admission check
    const secondAdmit = admitTurfBooking(bookingId, 'Gatekeeper Suresh')
    expect(secondAdmit.success).toBe(false)
    expect(secondAdmit.message).toContain('already admitted')
  })

  it('enforces hierarchical multi-court partitioning and prevents double booking of parent/child slots', () => {
    // 1. Booking Full Pitch 1 blocks Sub-pitch 1A and 1B
    const fullPitchBooking = bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: 'court-kan-1',
      courtName: 'Full Pitch 1',
      date: '2026-11-21',
      timeSlot: '08:00 PM – 09:00 PM',
      customerName: 'Bengaluru FC U-18',
      customerPhone: '9988776655',
      paymentMethod: 'fully_paid',
    })
    expect(fullPitchBooking.success).toBe(true)

    // Sub-pitch 1A slot query shows blocked due to full pitch booking
    const subSlots = getTurfSlots('sree-kanteerava-stadium', '2026-11-21', 'court-kan-1a')
    const subBlockedSlot = subSlots.find(s => s.timeSlot === '08:00 PM – 09:00 PM')
    expect(subBlockedSlot?.status).toBe('blocked')
    expect(subBlockedSlot?.blockedReason).toContain('Full pitch is booked')

    // Attempting to book sub-pitch 1A during same slot fails
    const subPitchBooking = bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: 'court-kan-1a',
      courtName: 'Pitch 1A',
      date: '2026-11-21',
      timeSlot: '08:00 PM – 09:00 PM',
      customerName: 'Grassroots 5v5 Team',
      customerPhone: '9123456789',
      paymentMethod: 'pay_at_venue',
    })
    expect(subPitchBooking.success).toBe(false)
    expect(subPitchBooking.error).toContain('full main pitch is already reserved')

    // 2. Booking a sub-pitch on another hour blocks the full pitch
    const subPitch2 = bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: 'court-kan-1a',
      courtName: 'Pitch 1A',
      date: '2026-11-21',
      timeSlot: '06:00 PM – 07:00 PM',
      customerName: 'Local Academy',
      customerPhone: '9876543211',
      paymentMethod: 'upi_advance_paid',
    })
    expect(subPitch2.success).toBe(true)

    const fullSlots = getTurfSlots('sree-kanteerava-stadium', '2026-11-21', 'court-kan-1')
    const fullBlocked = fullSlots.find(s => s.timeSlot === '06:00 PM – 07:00 PM')
    expect(fullBlocked?.status).toBe('blocked')
    expect(fullBlocked?.blockedReason).toContain('Sub-pitch')

    // Attempting to book full pitch fails
    const fullPitchConflict = bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: 'court-kan-1',
      courtName: 'Full Pitch 1',
      date: '2026-11-21',
      timeSlot: '06:00 PM – 07:00 PM',
      customerName: 'Corporate League',
      customerPhone: '9888777666',
      paymentMethod: 'fully_paid',
    })
    expect(fullPitchConflict.success).toBe(false)
    expect(fullPitchConflict.error).toContain('Sub-court')
  })

  it('calculates floodlight surcharge and itemized pricing breakdown', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0] // Full pitch with floodlights

    const eveningFloodlit = calculateSlotDynamicPrice(court, '07:00 PM – 08:00 PM', '2026-11-21')
    expect(eveningFloodlit.isPeak).toBe(true)
    expect(eveningFloodlit.breakdown).toBeDefined()
    expect(eveningFloodlit.breakdown?.baseRate).toBe(court.defaultHourlyRate)
    expect(eveningFloodlit.breakdown?.floodlightSurcharge).toBeGreaterThan(0)
    expect(eveningFloodlit.breakdown?.total).toBe(eveningFloodlit.hourlyPrice)
  })

  it('records quick walk-in phone bookings with instant WhatsApp confirmation passes', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0]

    const walkIn = createQuickWalkInBooking({
      venueSlug: 'sree-kanteerava-stadium',
      courtId: court.id,
      date: '2026-11-25',
      timeSlot: '07:00 AM – 08:00 AM',
      customerName: 'Kunal Kapoor (Walk-In)',
      customerPhone: '9876500000',
      totalAmount: 1200,
      paidAmount: 1200,
      paymentStatus: 'fully_paid',
    })

    expect(walkIn.success).toBe(true)
    expect(walkIn.booking).toBeDefined()
    expect(walkIn.whatsappPassUrl).toContain('wa.me')
    expect(walkIn.whatsappPassUrl).toContain(encodeURIComponent('Kunal Kapoor (Walk-In)'))
  })

  it('manages recurring slot subscriptions across multiple weeks with cancellation support', () => {
    const courts = getTurfCourts('sree-kanteerava-stadium')
    const court = courts[0]

    const sub = createRecurringSubscription({
      venueSlug: 'sree-kanteerava-stadium',
      courtId: court.id,
      courtName: court.name,
      dayOfWeek: 0, // Sunday
      timeSlot: '06:00 AM – 08:00 AM',
      startDate: '2026-12-01',
      weeksCount: 8,
      customerName: 'Bengaluru Weekend FC',
      customerPhone: '9845099999',
      weeklyRate: 2000,
      advanceDepositPaid: 5000,
    })

    expect(sub.success).toBe(true)
    expect(sub.subscription?.subscriptionId).toBeDefined()
    expect(sub.subscription?.totalFee).toBe(16000)
    expect(sub.subscription?.balanceDue).toBe(11000)

    const list = getRecurringSubscriptions('sree-kanteerava-stadium')
    expect(list.some(s => s.customerName === 'Bengaluru Weekend FC')).toBe(true)

    const cancelled = cancelRecurringSubscription(sub.subscription!.subscriptionId)
    expect(cancelled).toBe(true)
    const afterCancel = getRecurringSubscriptions('sree-kanteerava-stadium').find(s => s.subscriptionId === sub.subscription!.subscriptionId)
    expect(afterCancel?.status).toBe('cancelled')
  })
})
