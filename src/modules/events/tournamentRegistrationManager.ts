/**
 * KhelGrid Tournament Registration & Team Roster Management Engine
 * Standardized registration, player age verification, team roster management,
 * and referee match-day check-in tokens across Indian grassroots sports tournaments.
 */

export interface TournamentPlayer {
  id: string
  name: string
  jerseyNo: string | number
  age: number | string
  position?: string
  khelIdOrSportsCv?: string
}

export interface TournamentTeamRegistration {
  id: string
  passNumber: string // e.g. "KG-TOUR-9182A"
  tournamentId: string
  tournamentTitle: string
  sport: string
  city: string
  teamName: string
  captainName: string
  captainPhone: string
  captainEmail?: string
  roster: TournamentPlayer[]
  entryFee: string
  paymentStatus: 'free' | 'upi_verified' | 'unpaid'
  reportingVenue: string
  reportingDate: string
  registeredAt: string
  checkedInAt?: string
  checkedInBy?: string
  qrCodePayload: string
}

const STORAGE_KEY = 'khelgrid_tournament_team_registrations'
const memoryStore = new Map<string, string>()

export function clearTournamentRegistrationsMemoryStore(): void {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}

function loadFromStorage(): TournamentTeamRegistration[] {
  let raw: string | null = null
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      raw = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      raw = null
    }
  }
  if (!raw && memoryStore.has(STORAGE_KEY)) {
    raw = memoryStore.get(STORAGE_KEY) || null
  }
  if (!raw) return PRESEEDED_TOURNAMENT_REGISTRATIONS
  try {
    return JSON.parse(raw) as TournamentTeamRegistration[]
  } catch {
    return PRESEEDED_TOURNAMENT_REGISTRATIONS
  }
}

function saveToStorage(data: TournamentTeamRegistration[]): void {
  const serialized = JSON.stringify(data)
  memoryStore.set(STORAGE_KEY, serialized)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialized)
    } catch {
      // ignore quota
    }
  }
}

export const PRESEEDED_TOURNAMENT_REGISTRATIONS: TournamentTeamRegistration[] = [
  {
    id: 'tour-reg-delhi-fc',
    passNumber: 'KG-TOUR-DELHI-104',
    tournamentId: 'evt-kiyg-2026',
    tournamentTitle: 'Khelo India Youth Games (KIYG) 2026',
    sport: 'Football',
    city: 'Bhopal',
    teamName: 'Delhi Strikers FC',
    captainName: 'Sameer Khan',
    captainPhone: '9811223344',
    captainEmail: 'sameer.khan@delhistrikers.com',
    roster: [
      { id: 'p1', name: 'Sameer Khan', jerseyNo: 10, age: 17, position: 'Forward / Striker', khelIdOrSportsCv: 'KG-ATH-SKHAN10' },
      { id: 'p2', name: 'Aarav Choudhary', jerseyNo: 7, age: 17, position: 'Winger', khelIdOrSportsCv: 'KG-ATH-AARAVC' },
      { id: 'p3', name: 'Manish Rawat', jerseyNo: 4, age: 16, position: 'Center Back', khelIdOrSportsCv: 'KG-ATH-MRAWAT' },
      { id: 'p4', name: 'Gurpreet Singh', jerseyNo: 1, age: 18, position: 'Goalkeeper', khelIdOrSportsCv: 'KG-ATH-GSINGH1' },
      { id: 'p5', name: 'Kabir Varma', jerseyNo: 8, age: 17, position: 'Midfielder', khelIdOrSportsCv: 'KG-ATH-KVARMA' },
    ],
    entryFee: 'Free (State Selection Quota)',
    paymentStatus: 'upi_verified',
    reportingVenue: 'Tatya Tope Stadium, Pitch 1',
    reportingDate: '2026-12-10',
    registeredAt: '2026-11-15T11:00:00Z',
    qrCodePayload: 'https://khelgrid.com/verify-pass?id=KG-TOUR-DELHI-104&sport=Football',
  },
  {
    id: 'tour-reg-bengaluru-shuttlers',
    passNumber: 'KG-TOUR-BLR-208',
    tournamentId: 'evt-sgfi-badminton-2026',
    tournamentTitle: '68th SGFI National School Badminton Games',
    sport: 'Badminton',
    city: 'Bengaluru',
    teamName: 'Bengaluru Smashers U-17',
    captainName: 'Pooja Hegde',
    captainPhone: '9845001122',
    captainEmail: 'pooja.blr@gmail.com',
    roster: [
      { id: 'p-b1', name: 'Pooja Hegde', jerseyNo: 1, age: 16, position: 'Singles / Doubles', khelIdOrSportsCv: 'KG-ATH-PHEGDE' },
      { id: 'p-b2', name: 'Tanvi Kamath', jerseyNo: 2, age: 15, position: 'Doubles', khelIdOrSportsCv: 'KG-ATH-TKAMATH' },
      { id: 'p-b3', name: 'Sneha Rao', jerseyNo: 3, age: 16, position: 'Singles Reserve' },
    ],
    entryFee: '₹1,500',
    paymentStatus: 'upi_verified',
    reportingVenue: 'Kanteerava Indoor Stadium, Court 3',
    reportingDate: '2026-12-15',
    registeredAt: '2026-11-17T09:30:00Z',
    qrCodePayload: 'https://khelgrid.com/verify-pass?id=KG-TOUR-BLR-208&sport=Badminton',
  },
]

export function getTournamentRegistrations(tournamentId?: string): TournamentTeamRegistration[] {
  const all = loadFromStorage()
  if (!tournamentId) return all
  return all.filter(r => r.tournamentId === tournamentId)
}

export function lookupTournamentPass(passNumber: string): TournamentTeamRegistration | null {
  const clean = passNumber.trim().toUpperCase()
  const all = loadFromStorage()
  return all.find(r => r.passNumber.toUpperCase() === clean || r.id.toUpperCase() === clean) || null
}

export function registerTournamentTeam(params: {
  tournamentId: string
  tournamentTitle: string
  sport: string
  city: string
  teamName: string
  captainName: string
  captainPhone: string
  captainEmail?: string
  roster: TournamentPlayer[]
  entryFee: string
  reportingVenue: string
  reportingDate: string
}): TournamentTeamRegistration {
  const existing = loadFromStorage()
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
  const sportPrefix = (params.sport.slice(0, 3) || 'SPT').toUpperCase()
  const passNumber = `KG-TOUR-${sportPrefix}-${randomSuffix}`
  const qrCodePayload = `https://khelgrid.com/verify-pass?id=${passNumber}&sport=${encodeURIComponent(params.sport)}`

  const newReg: TournamentTeamRegistration = {
    id: `tour-reg-${Date.now()}`,
    passNumber,
    tournamentId: params.tournamentId,
    tournamentTitle: params.tournamentTitle,
    sport: params.sport,
    city: params.city,
    teamName: params.teamName.trim(),
    captainName: params.captainName.trim(),
    captainPhone: params.captainPhone.trim(),
    captainEmail: params.captainEmail?.trim(),
    roster: params.roster,
    entryFee: params.entryFee,
    paymentStatus: params.entryFee.toLowerCase().includes('free') ? 'free' : 'upi_verified',
    reportingVenue: params.reportingVenue,
    reportingDate: params.reportingDate,
    registeredAt: new Date().toISOString(),
    qrCodePayload,
  }

  saveToStorage([newReg, ...existing])
  return newReg
}

export function admitTournamentTeam(
  passNumber: string,
  officialName: string = 'Match Referee'
): { success: boolean; message: string; registration?: TournamentTeamRegistration } {
  const clean = passNumber.trim().toUpperCase()
  const all = loadFromStorage()
  const existing = all.find(r => r.passNumber.toUpperCase() === clean || r.id.toUpperCase() === clean)

  if (!existing) {
    return { success: false, message: 'Tournament match pass not found' }
  }

  if (existing.checkedInAt) {
    return {
      success: false,
      message: `Team ${existing.teamName} was already checked in today at ${new Date(existing.checkedInAt).toLocaleTimeString()}${existing.checkedInBy ? ` by ${existing.checkedInBy}` : ''}.`,
      registration: existing,
    }
  }

  const updated: TournamentTeamRegistration = {
    ...existing,
    checkedInAt: new Date().toISOString(),
    checkedInBy: officialName,
  }

  const updatedList = all.map(r => (r.id === existing.id ? updated : r))
  saveToStorage(updatedList)

  return {
    success: true,
    message: `Team "${existing.teamName}" verified and admitted! ${existing.roster.length} roster players cleared for match entry.`,
    registration: updated,
  }
}
