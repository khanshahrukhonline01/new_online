import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearGateAdmissionLog,
  verifyPassToken,
  admitPassToken,
  getGateAdmissionLogs,
} from './passVerifierService'
import { clearAcademySaaSMemoryStore, createTrialPass } from '../academies/academySaaSClient'
import { clearTurfSlotMemoryStore, bookTurfSlot } from '../venues/turfSlotManager'
import { clearTournamentRegistrationsMemoryStore } from '../events/tournamentRegistrationManager'

const memoryStore: Record<string, string> = {}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k: string) => memoryStore[k] || null,
    setItem: (k: string, v: string) => { memoryStore[k] = v },
    removeItem: (k: string) => { delete memoryStore[k] },
    clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]) },
    length: 0,
    key: () => null,
  }
}

describe('Universal Pass Verifier Service Suite', () => {
  beforeEach(() => {
    clearGateAdmissionLog()
    clearAcademySaaSMemoryStore()
    clearTurfSlotMemoryStore()
    clearTournamentRegistrationsMemoryStore()
  })

  it('verifies demo tokens across all categories', () => {
    const trialDemo = verifyPassToken('PASS-CRI-DEMO')
    expect(trialDemo).not.toBeNull()
    expect(trialDemo?.passType).toBe('academy_trial')
    expect(trialDemo?.sport).toBe('Cricket')
    expect(trialDemo?.status).toBe('valid')

    const turfDemo = verifyPassToken('TRF-FTB-DEMO')
    expect(turfDemo).not.toBeNull()
    expect(turfDemo?.passType).toBe('turf_booking')
    expect(turfDemo?.sport).toBe('Football')

    const tourDemo = verifyPassToken('KG-TOUR-DEMO')
    expect(tourDemo).not.toBeNull()
    expect(tourDemo?.passType).toBe('tournament_team')
  })

  it('verifies a newly created Academy Trial Pass dynamically', () => {
    const pass = createTrialPass({
      academySlug: 'delhi-cricket-academy',
      academyName: 'Delhi Cricket Academy',
      studentName: 'Aarav Sharma',
      parentPhone: '9811223344',
      sport: 'Cricket',
      trialDate: '2026-11-25',
      reportingTime: '06:30 AM',
      venueAddress: 'Feroz Shah Kotla Outer Grounds',
    })

    const verified = verifyPassToken(pass.passNumber)
    expect(verified).not.toBeNull()
    expect(verified?.primaryHolder).toBe('Aarav Sharma')
    expect(verified?.contactMasked).toBe('+91 ••••• ••344')
    expect(verified?.status).toBe('valid')

    // Admit the athlete
    const admission = admitPassToken(pass.passNumber, 'Coach Daljit')
    expect(admission.success).toBe(true)
    expect(admission.pass?.status).toBe('used')
    expect(admission.pass?.checkedInBy).toBe('Coach Daljit')

    // Verify admission logs
    const logs = getGateAdmissionLogs()
    expect(logs.length).toBe(1)
    expect(logs[0].holderName).toBe('Aarav Sharma')
    expect(logs[0].admittedBy).toBe('Coach Daljit')

    // Double admission attempt should be rejected
    const doubleAdmission = admitPassToken(pass.passNumber, 'Coach Daljit')
    expect(doubleAdmission.success).toBe(false)
    expect(doubleAdmission.message).toContain('already admitted')
  })

  it('verifies a Turf Booking Voucher dynamically and marks court admission', () => {
    const booked = bookTurfSlot({
      venueSlug: 'sree-kanteerava-stadium',
      venueName: 'Sree Kanteerava Stadium',
      courtId: 'c1',
      courtName: 'Pitch 1',
      date: '2026-11-20',
      timeSlot: '08:00 PM – 09:00 PM',
      customerName: 'Kunal Kapoor',
      customerPhone: '9845112233',
      paymentMethod: 'upi_advance_paid',
      hourlyPrice: 1500,
      advanceDeposit: 300,
    })

    const bookingId = booked.booking!.bookingId
    const verified = verifyPassToken(bookingId)
    expect(verified).not.toBeNull()
    expect(verified?.passType).toBe('turf_booking')
    expect(verified?.primaryHolder).toBe('Kunal Kapoor')
    expect(verified?.contactMasked).toBe('+91 ••••• ••233')

    const admission = admitPassToken(bookingId, 'Gate Reception Desk')
    expect(admission.success).toBe(true)
    expect(admission.pass?.status).toBe('used')
  })

  it('verifies preseeded Tournament Team pass and admits the squad', () => {
    const verified = verifyPassToken('KG-TOUR-DELHI-104')
    expect(verified).not.toBeNull()
    expect(verified?.passType).toBe('tournament_team')
    expect(verified?.title).toContain('Delhi Strikers FC')

    const admission = admitPassToken('KG-TOUR-DELHI-104', 'Referee Sunil Kumar')
    expect(admission.success).toBe(true)
    expect(admission.message).toContain('Delhi Strikers FC')
  })

  it('verifies athlete federation credentials from verification registry', () => {
    const athleteVerif = verifyPassToken('KG-VERIF-78291')
    expect(athleteVerif).not.toBeNull()
    expect(athleteVerif?.passType).toBe('athlete_verification')
    expect(athleteVerif?.primaryHolder).toBe('Rohan Sharma')
    expect(athleteVerif?.status).toBe('valid')
  })

  it('verifies and admits a venue booking from storage fallback', () => {
    const mockRef = 'KG-VENUE-TEST-9988'
    localStorage.setItem(
      'khelgrid_venue_bookings',
      JSON.stringify([
        {
          bookingRef: mockRef,
          voucherToken: 'VOUCHER-TOKEN-77',
          venueName: 'DDA Siri Fort Complex',
          courtNumber: 2,
          customerName: 'Aditya Sen',
          sport: 'Tennis',
          slotDate: '2026-11-25',
          slotTime: '07:00 AM – 08:00 AM',
          paidAmount: 500,
          totalAmount: 500,
          paymentStatus: 'paid',
          status: 'confirmed',
        },
      ])
    )

    const verified = verifyPassToken(mockRef)
    expect(verified).not.toBeNull()
    expect(verified?.primaryHolder).toBe('Aditya Sen')
    expect(verified?.venueOrFacility).toContain('DDA Siri Fort Complex')
    expect(verified?.status).toBe('valid')

    const admit = admitPassToken(mockRef, 'Siri Fort Gate Desk')
    expect(admit.success).toBe(true)
    expect(admit.pass?.status).toBe('used')

    localStorage.removeItem('khelgrid_venue_bookings')
  })

  it('returns null for nonexistent tokens', () => {
    expect(verifyPassToken('FAKE-TOKEN-9999')).toBeNull()
  })
})
