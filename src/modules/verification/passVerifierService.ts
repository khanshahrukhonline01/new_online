/**
 * KhelGrid Universal Pass Verifier Service
 * Core on-ground verification engine for all KhelGrid physical access credentials:
 * 1. Academy Selection Trial & Combine Passes (#PASS-XXXX)
 * 2. Turf & Facility Slot Booking Vouchers (#TRF-XXXX)
 * 3. Tournament Match & Team Roster Passes (#KG-TOUR-XXXX)
 * 4. Federation Athlete Verification Credentials (#KG-VERIF-XXXX)
 */

import {
  lookupTrialPass,
  admitTrialPass,
  type AcademyTrialPass,
} from '../academies/academySaaSClient'
import {
  lookupTurfBooking,
  admitTurfBooking,
  type TurfBookingRecord,
} from '../venues/turfSlotManager'
import {
  lookupTournamentPass,
  admitTournamentTeam,
  type TournamentTeamRegistration,
} from '../events/tournamentRegistrationManager'
import {
  lookupVerificationStatus,
  type VerificationRecord,
} from './verificationData'
import { getUserVenueBookings } from '../../shared/payments/paymentService'

export type PassType = 'academy_trial' | 'turf_booking' | 'tournament_team' | 'athlete_verification'

export type PassStatus = 'valid' | 'used' | 'expired' | 'invalid' | 'in_review' | 'action_required'

export interface UnifiedPassResult {
  token: string
  passType: PassType
  typeLabel: string
  status: PassStatus
  statusLabel: string
  title: string
  subtitle: string
  primaryHolder: string
  contactMasked: string
  sport: string
  venueOrFacility: string
  dateTimeSummary: string
  reportingInstructions?: string
  checkedInAt?: string
  checkedInBy?: string
  qrCodePayload: string
  badgeTier?: string
  metadata: Record<string, unknown>
  rawPayload?: AcademyTrialPass | TurfBookingRecord | TournamentTeamRegistration | VerificationRecord
}

export interface GateAdmissionLogItem {
  id: string
  token: string
  passType: PassType
  holderName: string
  sport: string
  facility: string
  admittedAt: string
  admittedBy: string
}

const GATE_LOG_KEY = 'khelgrid_gate_admission_log'
const gateLogMemoryStore: GateAdmissionLogItem[] = []

function getSafeStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // ignore
  }
  return null
}

export function clearGateAdmissionLog(): void {
  gateLogMemoryStore.length = 0
  const storage = getSafeStorage()
  if (storage) {
    try {
      storage.removeItem(GATE_LOG_KEY)
    } catch {
      // ignore
    }
  }
}

export function getGateAdmissionLogs(): GateAdmissionLogItem[] {
  let raw: string | null = null
  const storage = getSafeStorage()
  if (storage) {
    try {
      raw = storage.getItem(GATE_LOG_KEY)
    } catch {
      raw = null
    }
  }
  if (!raw) return [...gateLogMemoryStore]
  try {
    return JSON.parse(raw) as GateAdmissionLogItem[]
  } catch {
    return [...gateLogMemoryStore]
  }
}

function appendGateAdmissionLog(item: GateAdmissionLogItem): void {
  gateLogMemoryStore.unshift(item)
  const storage = getSafeStorage()
  if (storage) {
    try {
      const existing = getGateAdmissionLogs()
      const updated = [item, ...existing.filter(i => i.id !== item.id)].slice(0, 50)
      storage.setItem(GATE_LOG_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }
  }
}

function maskPhone(phone?: string): string {
  if (!phone) return 'Protected'
  const clean = phone.replace(/\D/g, '')
  if (clean.length < 10) return 'Verified Member'
  return `+91 ••••• ••${clean.slice(-3)}`
}

// Demo fallback passes for instant on-ground testing
export const DEMO_PASSES: Record<string, UnifiedPassResult> = {
  'PASS-CRI-DEMO': {
    token: 'PASS-CRI-DEMO',
    passType: 'academy_trial',
    typeLabel: 'Academy Selection Trial Pass',
    status: 'valid',
    statusLabel: 'Valid for Entry · Selection Trial',
    title: 'Selection Trial Pass · Cricket U-16 Squad',
    subtitle: 'Karnataka Institute of Cricket (KIOC), Bengaluru',
    primaryHolder: 'Dhruv Jaiswal (Age: 15)',
    contactMasked: '+91 ••••• ••421',
    sport: 'Cricket',
    venueOrFacility: 'KIOC Grounds, Shivaji Nagar, Bengaluru',
    dateTimeSummary: '2026-11-22 at 06:30 AM',
    reportingInstructions: 'Report with complete white kit, spikes, and valid municipal birth certificate.',
    qrCodePayload: 'https://khelgrid.com/verify-pass?id=PASS-CRI-DEMO&sport=Cricket',
    metadata: {
      academyName: 'Karnataka Institute of Cricket (KIOC)',
      batch: 'Fast Bowlers & All-Rounders Combine',
    },
  },
  'TRF-FTB-DEMO': {
    token: 'TRF-FTB-DEMO',
    passType: 'turf_booking',
    typeLabel: 'Turf Court Booking Voucher',
    status: 'valid',
    statusLabel: 'Court Reserved · UPI Advance Verified',
    title: 'Turf Pitch 1 (5v5 AstroTurf)',
    subtitle: 'Sree Kanteerava Outdoor Complex, Bengaluru',
    primaryHolder: 'Kabir Roy & Squad',
    contactMasked: '+91 ••••• ••890',
    sport: 'Football',
    venueOrFacility: 'Sree Kanteerava Outdoor Complex, Pitch 1',
    dateTimeSummary: '2026-11-20 · 07:00 PM – 08:00 PM',
    reportingInstructions: 'Non-metal studs only. Report 10 mins before slot kick-off.',
    qrCodePayload: 'https://khelgrid.com/verify-pass?id=TRF-FTB-DEMO&sport=Football',
    metadata: {
      totalAmount: 1500,
      paidAmount: 300,
      balanceAmount: 1200,
      paymentStatus: 'upi_advance_paid',
    },
  },
  'KG-TOUR-DEMO': {
    token: 'KG-TOUR-DEMO',
    passType: 'tournament_team',
    typeLabel: 'Tournament Team & Match Pass',
    status: 'valid',
    statusLabel: 'Team Cleared · Roster Verified',
    title: 'Delhi Strikers FC (5 Players)',
    subtitle: 'Khelo India Youth Games (KIYG) 2026',
    primaryHolder: 'Captain: Sameer Khan',
    contactMasked: '+91 ••••• ••344',
    sport: 'Football',
    venueOrFacility: 'Tatya Tope Stadium, Bhopal',
    dateTimeSummary: '2026-12-10 · Match Day 1',
    reportingInstructions: 'Team bibs or matching jerseys required. Captain to sign referee sheet.',
    qrCodePayload: 'https://khelgrid.com/verify-pass?id=KG-TOUR-DEMO&sport=Football',
    metadata: {
      rosterCount: 5,
      entryFee: 'Free (State Selection Quota)',
    },
  },
}

/**
 * Universally looks up any pass token across trial passes, turf vouchers, tournament passes, or athlete certs.
 */
export function verifyPassToken(rawToken: string): UnifiedPassResult | null {
  const token = rawToken.trim().toUpperCase()
  if (!token) return null

  // 1. Check Demo / Preseeded Tokens
  if (DEMO_PASSES[token]) {
    return DEMO_PASSES[token]
  }

  // 2. Check Academy Trial Pass (#PASS-XXXX or #KHL-PASS-XXXX)
  const trialPass = lookupTrialPass(token)
  if (trialPass) {
    const isUsed = trialPass.status === 'used'
    const isCancelled = trialPass.status === 'cancelled'
    const status: PassStatus = isCancelled ? 'invalid' : isUsed ? 'used' : 'valid'

    return {
      token: trialPass.passNumber,
      passType: 'academy_trial',
      typeLabel: 'Academy Selection Trial Pass',
      status,
      statusLabel: isUsed
        ? `Admitted at ${trialPass.checkedInAt ? new Date(trialPass.checkedInAt).toLocaleTimeString() : 'ground'}`
        : isCancelled
          ? 'Pass Cancelled'
          : 'Valid for Entry · Ready for Trial',
      title: `${trialPass.studentName} · Selection Trial`,
      subtitle: trialPass.academyName,
      primaryHolder: `${trialPass.studentName}`,
      contactMasked: maskPhone(trialPass.parentPhone),
      sport: trialPass.sport,
      venueOrFacility: trialPass.venueAddress,
      dateTimeSummary: `${trialPass.trialDate} at ${trialPass.reportingTime}`,
      reportingInstructions: trialPass.reportingInstructions,
      checkedInAt: trialPass.checkedInAt,
      checkedInBy: trialPass.checkedInBy,
      qrCodePayload: trialPass.qrCodePayload,
      metadata: {
        academySlug: trialPass.academySlug,
        academyName: trialPass.academyName,
      },
      rawPayload: trialPass,
    }
  }

  // 3. Check Turf Court Slot Booking (#TRF-XXXX or #KG-TURF-XXXX)
  const turfBooking = lookupTurfBooking(token)
  if (turfBooking) {
    const isCheckedIn = Boolean(turfBooking.checkedInAt)
    return {
      token: turfBooking.bookingId,
      passType: 'turf_booking',
      typeLabel: 'Turf Court Booking Voucher',
      status: isCheckedIn ? 'used' : 'valid',
      statusLabel: isCheckedIn
        ? `Court Admitted at ${new Date(turfBooking.checkedInAt!).toLocaleTimeString()}`
        : 'Confirmed Reservation · Ready for Play',
      title: `${turfBooking.courtName}`,
      subtitle: turfBooking.venueName,
      primaryHolder: turfBooking.customerName,
      contactMasked: maskPhone(turfBooking.customerPhone),
      sport: turfBooking.sport,
      venueOrFacility: `${turfBooking.venueName} · ${turfBooking.courtName}`,
      dateTimeSummary: `${turfBooking.slotDate} · ${turfBooking.slotTime}`,
      reportingInstructions: `Show this voucher at turf reception. Balance due at venue: ₹${turfBooking.balanceAmount}.`,
      checkedInAt: turfBooking.checkedInAt,
      checkedInBy: turfBooking.checkedInBy,
      qrCodePayload: turfBooking.qrCodePayload,
      metadata: {
        totalAmount: turfBooking.totalAmount,
        paidAmount: turfBooking.paidAmount,
        balanceAmount: turfBooking.balanceAmount,
        paymentStatus: turfBooking.paymentStatus,
        upiVpa: turfBooking.upiVpa,
      },
      rawPayload: turfBooking,
    }
  }

  // 3b. Check User Venue Booking Record (#KG-VENUE-XXXX or voucherToken)
  const userVenueBookings = getUserVenueBookings()
  const matchedVenueBooking = userVenueBookings.find(
    b => (b.bookingRef && b.bookingRef.toUpperCase() === token) ||
         (b.voucherToken && b.voucherToken.toUpperCase() === token)
  )
  if (matchedVenueBooking) {
    const isAdmitted = Boolean((matchedVenueBooking as unknown as { checkedInAt?: string }).checkedInAt)
    return {
      token: matchedVenueBooking.bookingRef || matchedVenueBooking.voucherToken || token,
      passType: 'turf_booking',
      typeLabel: 'Turf Court Booking Voucher',
      status: isAdmitted ? 'used' : 'valid',
      statusLabel: isAdmitted
        ? `Admitted at ${new Date((matchedVenueBooking as unknown as { checkedInAt: string }).checkedInAt).toLocaleTimeString()}`
        : 'Confirmed Reservation · Ready for Play',
      title: `${matchedVenueBooking.venueName || 'Sports Venue'} · Court ${matchedVenueBooking.courtNumber || 1}`,
      subtitle: matchedVenueBooking.venueName || 'KhelGrid Partner Venue',
      primaryHolder: matchedVenueBooking.customerName || 'Verified Player',
      contactMasked: 'Masked · Verified Player',
      sport: matchedVenueBooking.sport || 'Sports Turf',
      venueOrFacility: `${matchedVenueBooking.venueName || 'Sports Venue'} · Court ${matchedVenueBooking.courtNumber || 1}`,
      dateTimeSummary: `${matchedVenueBooking.slotDate || 'Upcoming'} · ${matchedVenueBooking.slotTime || 'Slot'}`,
      reportingInstructions: `Show this voucher at turf reception. Balance paid: ₹${matchedVenueBooking.paidAmount || 0}.`,
      checkedInAt: (matchedVenueBooking as unknown as { checkedInAt?: string }).checkedInAt,
      checkedInBy: (matchedVenueBooking as unknown as { checkedInBy?: string }).checkedInBy,
      qrCodePayload: `https://khelgrid.com/verify-pass?id=${matchedVenueBooking.bookingRef || token}`,
      metadata: {
        totalAmount: matchedVenueBooking.totalAmount,
        paidAmount: matchedVenueBooking.paidAmount,
        paymentStatus: matchedVenueBooking.paymentStatus,
        bookingRef: matchedVenueBooking.bookingRef,
      },
    }
  }

  // 4. Check Tournament Match & Team Pass (#KG-TOUR-XXXX)
  const tourPass = lookupTournamentPass(token)
  if (tourPass) {
    const isAdmitted = Boolean(tourPass.checkedInAt)
    return {
      token: tourPass.passNumber,
      passType: 'tournament_team',
      typeLabel: 'Tournament Team Match Pass',
      status: isAdmitted ? 'used' : 'valid',
      statusLabel: isAdmitted
        ? `Team Admitted at ${new Date(tourPass.checkedInAt!).toLocaleTimeString()}`
        : 'Team Verified · Roster Cleared',
      title: `${tourPass.teamName} (${tourPass.roster.length} Players)`,
      subtitle: tourPass.tournamentTitle,
      primaryHolder: `Captain: ${tourPass.captainName}`,
      contactMasked: maskPhone(tourPass.captainPhone),
      sport: tourPass.sport,
      venueOrFacility: `${tourPass.reportingVenue}, ${tourPass.city}`,
      dateTimeSummary: `${tourPass.reportingDate}`,
      reportingInstructions: 'Captain must present all player Khel IDs or age proofs during table check-in.',
      checkedInAt: tourPass.checkedInAt,
      checkedInBy: tourPass.checkedInBy,
      qrCodePayload: tourPass.qrCodePayload,
      metadata: {
        roster: tourPass.roster,
        rosterCount: tourPass.roster.length,
        entryFee: tourPass.entryFee,
        paymentStatus: tourPass.paymentStatus,
      },
      rawPayload: tourPass,
    }
  }

  // 5. Check Athlete Verification Credential (#KG-VERIF-XXXX)
  const verifRecord = lookupVerificationStatus(token)
  if (verifRecord) {
    const isVerified = verifRecord.status === 'verified'
    const status: PassStatus = isVerified ? 'valid' : verifRecord.status === 'in_review' ? 'in_review' : 'action_required'

    return {
      token: verifRecord.referenceId,
      passType: 'athlete_verification',
      typeLabel: 'Federation Athlete Credential',
      status,
      statusLabel: verifRecord.statusTitle,
      title: `${verifRecord.athleteName} · ${verifRecord.sport}`,
      subtitle: `${verifRecord.federationAuthority} · ${verifRecord.federationId}`,
      primaryHolder: verifRecord.athleteName,
      contactMasked: 'Aadhaar & Federation Authenticated',
      sport: verifRecord.sport,
      venueOrFacility: `${verifRecord.competitionLevel} · ${verifRecord.city}`,
      dateTimeSummary: `Issued: ${verifRecord.reviewedAt ? new Date(verifRecord.reviewedAt).toLocaleDateString() : 'In Verification'}`,
      badgeTier: verifRecord.badgeTier,
      reportingInstructions: verifRecord.statusDescription,
      qrCodePayload: `https://khelgrid.com/verification?ref=${verifRecord.referenceId}`,
      metadata: {
        certificateNo: verifRecord.certificateNo,
        notes: verifRecord.verificationNotes,
      },
      rawPayload: verifRecord,
    }
  }

  return null
}

/**
 * Admits a pass token on ground and registers it in the gatekeeper's audit log.
 */
export function admitPassToken(
  rawToken: string,
  gatekeeperName: string = 'Ground Gatekeeper'
): { success: boolean; message: string; pass?: UnifiedPassResult } {
  const token = rawToken.trim().toUpperCase()
  const current = verifyPassToken(token)

  if (!current) {
    return { success: false, message: 'Invalid or unrecognized KhelGrid pass token.' }
  }

  if (current.status === 'used') {
    return {
      success: false,
      message: `Pass was already admitted on-ground at ${current.checkedInAt ? new Date(current.checkedInAt).toLocaleTimeString() : 'gate'}${current.checkedInBy ? ` by ${current.checkedInBy}` : ''}.`,
      pass: current,
    }
  }

  if (current.passType === 'academy_trial') {
    const res = admitTrialPass(token, gatekeeperName)
    if (!res.success) return { success: false, message: res.message, pass: current }
    const updated = verifyPassToken(token)!
    appendGateAdmissionLog({
      id: `gate-log-${Date.now()}`,
      token: updated.token,
      passType: updated.passType,
      holderName: updated.primaryHolder,
      sport: updated.sport,
      facility: updated.venueOrFacility,
      admittedAt: updated.checkedInAt || new Date().toISOString(),
      admittedBy: gatekeeperName,
    })
    return { success: true, message: res.message, pass: updated }
  }

  if (current.passType === 'turf_booking') {
    const res = admitTurfBooking(token, gatekeeperName)
    if (res.success) {
      const updated = verifyPassToken(token)!
      appendGateAdmissionLog({
        id: `gate-log-${Date.now()}`,
        token: updated.token,
        passType: updated.passType,
        holderName: updated.primaryHolder,
        sport: updated.sport,
        facility: updated.venueOrFacility,
        admittedAt: updated.checkedInAt || new Date().toISOString(),
        admittedBy: gatekeeperName,
      })
      return { success: true, message: res.message, pass: updated }
    }

    // Fallback: check and admit in khelgrid_venue_bookings
    const venueStorage = getSafeStorage()
    if (venueStorage) {
      try {
        const raw = venueStorage.getItem('khelgrid_venue_bookings')
        if (raw) {
          const existing = JSON.parse(raw) as Array<Record<string, unknown>>
          const idx = existing.findIndex(
            b => (b.bookingRef as string)?.toUpperCase() === token || (b.voucherToken as string)?.toUpperCase() === token
          )
          if (idx !== -1) {
            existing[idx].checkedInAt = new Date().toISOString()
            existing[idx].checkedInBy = gatekeeperName
            venueStorage.setItem('khelgrid_venue_bookings', JSON.stringify(existing))
            const updated = verifyPassToken(token)!
            appendGateAdmissionLog({
              id: `gate-log-${Date.now()}`,
              token: updated.token,
              passType: updated.passType,
              holderName: updated.primaryHolder,
              sport: updated.sport,
              facility: updated.venueOrFacility,
              admittedAt: updated.checkedInAt || new Date().toISOString(),
              admittedBy: gatekeeperName,
            })
            return {
              success: true,
              message: `Booking voucher #${token} verified and admitted at gate.`,
              pass: updated,
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return { success: false, message: res.message, pass: current }
  }

  if (current.passType === 'tournament_team') {
    const res = admitTournamentTeam(token, gatekeeperName)
    if (!res.success) return { success: false, message: res.message, pass: current }
    const updated = verifyPassToken(token)!
    appendGateAdmissionLog({
      id: `gate-log-${Date.now()}`,
      token: updated.token,
      passType: updated.passType,
      holderName: updated.primaryHolder,
      sport: updated.sport,
      facility: updated.venueOrFacility,
      admittedAt: updated.checkedInAt || new Date().toISOString(),
      admittedBy: gatekeeperName,
    })
    return { success: true, message: res.message, pass: updated }
  }

  // Demo pass admission
  const admittedDemo: UnifiedPassResult = {
    ...current,
    status: 'used',
    checkedInAt: new Date().toISOString(),
    checkedInBy: gatekeeperName,
    statusLabel: `Admitted at ${new Date().toLocaleTimeString()} by ${gatekeeperName}`,
  }
  DEMO_PASSES[token] = admittedDemo
  appendGateAdmissionLog({
    id: `gate-log-${Date.now()}`,
    token: admittedDemo.token,
    passType: admittedDemo.passType,
    holderName: admittedDemo.primaryHolder,
    sport: admittedDemo.sport,
    facility: admittedDemo.venueOrFacility,
    admittedAt: admittedDemo.checkedInAt!,
    admittedBy: gatekeeperName,
  })

  return {
    success: true,
    message: `Entry verified and admitted for ${current.primaryHolder}!`,
    pass: admittedDemo,
  }
}
