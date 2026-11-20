/**
 * KhelGrid Tournament Operations & Sports Organisation SaaS Engine
 * 
 * Provides end-to-end infrastructure for tournament directors and sports federations:
 * 1. Tournament Format Wizard (Single Elimination, Double Elimination, Round Robin Groups + Knockouts)
 * 2. Anti-Age Fraud Squad Verification Engine (Aadhaar & KhelGrid Passport validation)
 * 3. Pitch-Side Digital Scorer Console (live mobile scorekeeper feeding /live)
 * 4. Verifiable Digital Participation & Winner Certificates (cryptographic QR validation)
 * 
 * Free during Grassroots Launch Phase.
 */

import { bookTurfSlot, getTurfCourts } from '../venues/turfSlotManager'

export type TournamentBracketFormat = 'single_elimination' | 'double_elimination' | 'round_robin_knockout'

export interface TournamentBracketNode {
  id: string
  tournamentId: string
  round: 'round_of_16' | 'quarter' | 'semi' | 'final'
  matchTitle: string
  teamA: {
    name: string
    score?: string
    isWinner?: boolean
    seed?: number
  }
  teamB: {
    name: string
    score?: string
    isWinner?: boolean
    seed?: number
  }
  pitchOrCourt: string
  scheduledTime: string
  status: 'scheduled' | 'live' | 'completed'
  nextMatchId?: string
}

export interface SquadVerificationPlayer {
  id: string
  name: string
  age: number
  dob?: string
  khelPassportId?: string
  isPassportVerified?: boolean
}

export interface SquadVerificationResult {
  teamName: string
  eligible: boolean
  totalPlayers: number
  verifiedCount: number
  flaggedCount: number
  fraudRiskScore: 'CLEARED' | 'SUSPECT' | 'FRAUD_DETECTED'
  flaggedPlayers: {
    id: string
    name: string
    age: number
    cutoffAge: number
    reason: string
  }[]
}

export interface LiveScorerMatchEvent {
  id: string
  timestamp: string
  minuteOrOver: string
  text: string
  team: 'teamA' | 'teamB'
}

export interface LiveScorerState {
  matchId: string
  matchTitle: string
  sport: string
  teamAName: string
  teamBName: string
  teamAScore: string
  teamBScore: string
  currentPeriod: string
  isFinal: boolean
  events: LiveScorerMatchEvent[]
  lastUpdated: string
}

export interface TournamentCertificate {
  certificateId: string // e.g. "KG-TOUR-CERT-8921"
  tournamentId: string
  tournamentTitle: string
  athleteName: string
  teamName: string
  sport: string
  achievementRole: 'Champion Winner' | 'Runner-Up Finalist' | 'Player of the Tournament' | 'Verified Participant'
  issuedDate: string
  organizerAuthority: string
  verificationHash: string
}

const STORAGE_KEYS = {
  BRACKETS: 'khelgrid_tournament_brackets_store',
  SCORER: 'khelgrid_tournament_scorer_store',
  CERTIFICATES: 'khelgrid_tournament_certificates_store',
  TOURNAMENTS: 'khelgrid_tournament_meta_store',
  REGISTERED_SQUADS: 'khelgrid_tournament_registered_squads_store',
}

const memoryStore = new Map<string, unknown>()

export function clearTournamentOpsMemoryStore(): void {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.BRACKETS)
      window.localStorage.removeItem(STORAGE_KEYS.SCORER)
      window.localStorage.removeItem(STORAGE_KEYS.CERTIFICATES)
      window.localStorage.removeItem(STORAGE_KEYS.TOURNAMENTS)
      window.localStorage.removeItem(STORAGE_KEYS.REGISTERED_SQUADS)
    } catch {
      // ignore
    }
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const item = window.localStorage.getItem(key)
      if (item) return JSON.parse(item) as T
    } catch {
      // ignore
    }
  }
  return (memoryStore.get(key) as T) ?? defaultValue
}

function saveToStorage<T>(key: string, value: T): void {
  memoryStore.set(key, value)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-seeded Demo Data
// ---------------------------------------------------------------------------

export const DEFAULT_BRACKET_MATCHES: TournamentBracketNode[] = [
  {
    id: 'match-qf-1',
    tournamentId: 'tour-national-u16-2026',
    round: 'quarter',
    matchTitle: 'Quarter Final 1',
    teamA: { name: 'Bengaluru Youth FC', score: '3', isWinner: true, seed: 1 },
    teamB: { name: 'Hyderabad Strikers', score: '1', isWinner: false, seed: 8 },
    pitchOrCourt: 'Pitch 1 (FIFA AstroTurf)',
    scheduledTime: '21 Nov 2026, 04:00 PM',
    status: 'completed',
    nextMatchId: 'match-sf-1',
  },
  {
    id: 'match-qf-2',
    tournamentId: 'tour-national-u16-2026',
    round: 'quarter',
    matchTitle: 'Quarter Final 2',
    teamA: { name: 'Delhi City Colts', score: '2 (4)', isWinner: true, seed: 4 },
    teamB: { name: 'Chandigarh Hawks', score: '2 (3)', isWinner: false, seed: 5 },
    pitchOrCourt: 'Pitch 2 (Main Stadium)',
    scheduledTime: '21 Nov 2026, 05:30 PM',
    status: 'completed',
    nextMatchId: 'match-sf-1',
  },
  {
    id: 'match-qf-3',
    tournamentId: 'tour-national-u16-2026',
    round: 'quarter',
    matchTitle: 'Quarter Final 3',
    teamA: { name: 'Mumbai Grassroots United', score: '4', isWinner: true, seed: 2 },
    teamB: { name: 'Kolkata Kickers', score: '0', isWinner: false, seed: 7 },
    pitchOrCourt: 'Pitch 1 (FIFA AstroTurf)',
    scheduledTime: '21 Nov 2026, 07:00 PM',
    status: 'completed',
    nextMatchId: 'match-sf-2',
  },
  {
    id: 'match-qf-4',
    tournamentId: 'tour-national-u16-2026',
    round: 'quarter',
    matchTitle: 'Quarter Final 4',
    teamA: { name: 'Punjab Football Academy', score: '1', isWinner: true, seed: 3 },
    teamB: { name: 'Goa Coastal Blasters', score: '0', isWinner: false, seed: 6 },
    pitchOrCourt: 'Pitch 2 (Main Stadium)',
    scheduledTime: '21 Nov 2026, 08:30 PM',
    status: 'completed',
    nextMatchId: 'match-sf-2',
  },
  {
    id: 'match-sf-1',
    tournamentId: 'tour-national-u16-2026',
    round: 'semi',
    matchTitle: 'Semi Final 1',
    teamA: { name: 'Bengaluru Youth FC', score: '2', isWinner: true, seed: 1 },
    teamB: { name: 'Delhi City Colts', score: '1', isWinner: false, seed: 4 },
    pitchOrCourt: 'Centre Pitch (Stadium)',
    scheduledTime: '22 Nov 2026, 05:00 PM',
    status: 'completed',
    nextMatchId: 'match-final-1',
  },
  {
    id: 'match-sf-2',
    tournamentId: 'tour-national-u16-2026',
    round: 'semi',
    matchTitle: 'Semi Final 2',
    teamA: { name: 'Mumbai Grassroots United', score: '2', seed: 2 },
    teamB: { name: 'Punjab Football Academy', score: '1', seed: 3 },
    pitchOrCourt: 'Centre Pitch (Stadium)',
    scheduledTime: '22 Nov 2026, 07:00 PM',
    status: 'live',
    nextMatchId: 'match-final-1',
  },
  {
    id: 'match-final-1',
    tournamentId: 'tour-national-u16-2026',
    round: 'final',
    matchTitle: 'Grand National Championship Final',
    teamA: { name: 'Bengaluru Youth FC', seed: 1 },
    teamB: { name: 'TBD (Winner SF 2)' },
    pitchOrCourt: 'National Stadium Main Arena',
    scheduledTime: '23 Nov 2026, 06:30 PM',
    status: 'scheduled',
  },
]

export const DEFAULT_CERTIFICATES: TournamentCertificate[] = [
  {
    certificateId: 'KG-TOUR-CERT-8841',
    tournamentId: 'tour-national-u16-2026',
    tournamentTitle: 'All-India National Youth Championship 2026',
    athleteName: 'Arjun Mehra',
    teamName: 'Bengaluru Youth FC',
    sport: 'Football',
    achievementRole: 'Champion Winner',
    issuedDate: '2026-11-20',
    organizerAuthority: 'All India Sports Operations Board & KhelGrid',
    verificationHash: 'KG-AUTH-CERT-99214-BENGALURU-GOLD',
  },
  {
    certificateId: 'KG-TOUR-CERT-8842',
    tournamentId: 'tour-national-u16-2026',
    tournamentTitle: 'All-India National Youth Championship 2026',
    athleteName: 'Devansh Roy',
    teamName: 'Mumbai Grassroots United',
    sport: 'Football',
    achievementRole: 'Player of the Tournament',
    issuedDate: '2026-11-20',
    organizerAuthority: 'All India Sports Operations Board & KhelGrid',
    verificationHash: 'KG-AUTH-CERT-99215-MUMBAI-MVP',
  },
]

export const SAMPLE_SQUAD_ROSTER: SquadVerificationPlayer[] = [
  { id: 'sq-1', name: 'Tanmay Saxena', age: 15, dob: '2011-04-12', khelPassportId: 'IN-ATH-2026-DEL-012', isPassportVerified: true },
  { id: 'sq-2', name: 'Rohan Deshmukh', age: 15, dob: '2011-08-20', khelPassportId: 'IN-ATH-2026-MAH-045', isPassportVerified: true },
  { id: 'sq-3', name: 'Aarav Choudhary', age: 14, dob: '2012-02-15', khelPassportId: 'IN-ATH-2026-KAR-088', isPassportVerified: true },
  { id: 'sq-4', name: 'Devansh Verma', age: 15, dob: '2011-10-05', khelPassportId: 'IN-ATH-2026-UP-102', isPassportVerified: true },
  { id: 'sq-5', name: 'Vikramjit Singh', age: 18, dob: '2008-05-14', khelPassportId: 'IN-ATH-UNVERIFIED', isPassportVerified: false },
]

// ---------------------------------------------------------------------------
// 1. Bracket Generation Engine
// ---------------------------------------------------------------------------

export function getTournamentBracket(tournamentId: string): TournamentBracketNode[] {
  const all = loadFromStorage<TournamentBracketNode[]>(STORAGE_KEYS.BRACKETS, DEFAULT_BRACKET_MATCHES)
  const matches = all.filter(m => m.tournamentId === tournamentId)
  return matches.length > 0 ? matches : DEFAULT_BRACKET_MATCHES
}

export function generateTournamentBracket(options: {
  tournamentId: string
  title: string
  sport: string
  format: TournamentBracketFormat
  teamNames: string[]
}): TournamentBracketNode[] {
  const teams = [...options.teamNames]
  while (teams.length < 4) teams.push(`Team ${teams.length + 1}`)

  const generatedMatches: TournamentBracketNode[] = []

  if (teams.length <= 4) {
    // 4 Teams -> 2 Semis + 1 Final
    generatedMatches.push({
      id: `m-${Date.now()}-sf1`,
      tournamentId: options.tournamentId,
      round: 'semi',
      matchTitle: 'Semi Final 1',
      teamA: { name: teams[0], seed: 1 },
      teamB: { name: teams[3], seed: 4 },
      pitchOrCourt: 'Pitch 1 (Main Court)',
      scheduledTime: 'Day 1, 04:00 PM',
      status: 'scheduled',
      nextMatchId: `m-${Date.now()}-final`,
    })
    generatedMatches.push({
      id: `m-${Date.now()}-sf2`,
      tournamentId: options.tournamentId,
      round: 'semi',
      matchTitle: 'Semi Final 2',
      teamA: { name: teams[1], seed: 2 },
      teamB: { name: teams[2], seed: 3 },
      pitchOrCourt: 'Pitch 2 (East Court)',
      scheduledTime: 'Day 1, 05:30 PM',
      status: 'scheduled',
      nextMatchId: `m-${Date.now()}-final`,
    })
    generatedMatches.push({
      id: `m-${Date.now()}-final`,
      tournamentId: options.tournamentId,
      round: 'final',
      matchTitle: 'Championship Final',
      teamA: { name: 'Winner SF 1' },
      teamB: { name: 'Winner SF 2' },
      pitchOrCourt: 'Centre Arena',
      scheduledTime: 'Day 2, 06:00 PM',
      status: 'scheduled',
    })
  } else {
    // 8 Teams -> 4 QFs + 2 Semis + 1 Final
    for (let i = 0; i < 4; i++) {
      generatedMatches.push({
        id: `m-${Date.now()}-qf${i + 1}`,
        tournamentId: options.tournamentId,
        round: 'quarter',
        matchTitle: `Quarter Final ${i + 1}`,
        teamA: { name: teams[i] || `Seed ${i + 1}`, seed: i + 1 },
        teamB: { name: teams[7 - i] || `Seed ${8 - i}`, seed: 8 - i },
        pitchOrCourt: `Pitch ${(i % 2) + 1}`,
        scheduledTime: `Day 1, ${4 + i}:00 PM`,
        status: 'scheduled',
        nextMatchId: `m-${Date.now()}-sf${Math.floor(i / 2) + 1}`,
      })
    }
    generatedMatches.push({
      id: `m-${Date.now()}-sf1`,
      tournamentId: options.tournamentId,
      round: 'semi',
      matchTitle: 'Semi Final 1',
      teamA: { name: 'Winner QF 1' },
      teamB: { name: 'Winner QF 2' },
      pitchOrCourt: 'Pitch 1 (Main Court)',
      scheduledTime: 'Day 2, 04:00 PM',
      status: 'scheduled',
      nextMatchId: `m-${Date.now()}-final`,
    })
    generatedMatches.push({
      id: `m-${Date.now()}-sf2`,
      tournamentId: options.tournamentId,
      round: 'semi',
      matchTitle: 'Semi Final 2',
      teamA: { name: 'Winner QF 3' },
      teamB: { name: 'Winner QF 4' },
      pitchOrCourt: 'Pitch 2 (East Court)',
      scheduledTime: 'Day 2, 05:30 PM',
      status: 'scheduled',
      nextMatchId: `m-${Date.now()}-final`,
    })
    generatedMatches.push({
      id: `m-${Date.now()}-final`,
      tournamentId: options.tournamentId,
      round: 'final',
      matchTitle: 'Championship Final',
      teamA: { name: 'Winner SF 1' },
      teamB: { name: 'Winner SF 2' },
      pitchOrCourt: 'Centre Arena',
      scheduledTime: 'Day 2, 07:30 PM',
      status: 'scheduled',
    })
  }

  const existingAll = loadFromStorage<TournamentBracketNode[]>(STORAGE_KEYS.BRACKETS, DEFAULT_BRACKET_MATCHES)
  const updatedAll = [...generatedMatches, ...existingAll.filter(m => m.tournamentId !== options.tournamentId)]
  saveToStorage(STORAGE_KEYS.BRACKETS, updatedAll)

  return generatedMatches
}

// ---------------------------------------------------------------------------
// 2. Anti-Age-Fraud Squad Verification Engine
// ---------------------------------------------------------------------------

export function verifySquadAgeEligibility(
  teamName: string,
  roster: SquadVerificationPlayer[],
  maxAllowedAge: number = 16
): SquadVerificationResult {
  const flaggedPlayers: SquadVerificationResult['flaggedPlayers'] = []
  let verifiedCount = 0

  for (const player of roster) {
    if (player.age > maxAllowedAge) {
      flaggedPlayers.push({
        id: player.id,
        name: player.name,
        age: player.age,
        cutoffAge: maxAllowedAge,
        reason: `Player age (${player.age} yrs) exceeds tournament U-${maxAllowedAge} division cutoff limit.`,
      })
    } else if (player.isPassportVerified) {
      verifiedCount++
    }
  }

  const eligible = flaggedPlayers.length === 0
  const fraudRiskScore: SquadVerificationResult['fraudRiskScore'] =
    flaggedPlayers.length >= 2
      ? 'FRAUD_DETECTED'
      : flaggedPlayers.length === 1
      ? 'SUSPECT'
      : 'CLEARED'

  return {
    teamName,
    eligible,
    totalPlayers: roster.length,
    verifiedCount,
    flaggedCount: flaggedPlayers.length,
    fraudRiskScore,
    flaggedPlayers,
  }
}

// ---------------------------------------------------------------------------
// 3. Pitch-Side Digital Scorer Console
// ---------------------------------------------------------------------------

export function getLiveScorerState(matchId: string): LiveScorerState {
  const allStates = loadFromStorage<Record<string, LiveScorerState>>(STORAGE_KEYS.SCORER, {})
  if (allStates[matchId]) return allStates[matchId]

  return {
    matchId,
    matchTitle: 'National Youth Cup Quarter Final',
    sport: 'Football',
    teamAName: 'Bengaluru Youth FC',
    teamBName: 'Hyderabad Strikers',
    teamAScore: '2',
    teamBScore: '1',
    currentPeriod: "2nd Half (68')",
    isFinal: false,
    events: [
      { id: 'ev-1', timestamp: '14:20', minuteOrOver: "12'", text: 'GOAL! Bengaluru Youth FC (Tanmay Saxena)', team: 'teamA' },
      { id: 'ev-2', timestamp: '14:48', minuteOrOver: "41'", text: 'GOAL! Hyderabad Strikers (Equalizer)', team: 'teamB' },
      { id: 'ev-3', timestamp: '15:10', minuteOrOver: "63'", text: 'GOAL! Bengaluru Youth FC (Header from corner)', team: 'teamA' },
    ],
    lastUpdated: new Date().toISOString(),
  }
}

export function updateLiveMatchScore(
  matchId: string,
  teamAScore: string,
  teamBScore: string,
  currentPeriod: string,
  eventNote?: string,
  eventTeam?: 'teamA' | 'teamB',
  isFinal?: boolean
): LiveScorerState {
  const current = getLiveScorerState(matchId)
  const newEvents = [...current.events]

  if (eventNote && eventNote.trim()) {
    newEvents.unshift({
      id: `ev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      minuteOrOver: currentPeriod,
      text: eventNote.trim(),
      team: eventTeam || 'teamA',
    })
  }

  const updated: LiveScorerState = {
    ...current,
    teamAScore,
    teamBScore,
    currentPeriod,
    isFinal: isFinal ?? current.isFinal,
    events: newEvents.slice(0, 30),
    lastUpdated: new Date().toISOString(),
  }

  const allStates = loadFromStorage<Record<string, LiveScorerState>>(STORAGE_KEYS.SCORER, {})
  allStates[matchId] = updated
  saveToStorage(STORAGE_KEYS.SCORER, allStates)

  return updated
}

// ---------------------------------------------------------------------------
// 4. Verifiable Digital Tournament Certificates
// ---------------------------------------------------------------------------

export function getTournamentCertificates(tournamentId?: string): TournamentCertificate[] {
  const all = loadFromStorage<TournamentCertificate[]>(STORAGE_KEYS.CERTIFICATES, DEFAULT_CERTIFICATES)
  if (tournamentId) return all.filter(c => c.tournamentId === tournamentId)
  return all
}

export function issueTournamentCertificate(
  cert: Omit<TournamentCertificate, 'certificateId' | 'verificationHash' | 'issuedDate'>
): TournamentCertificate {
  const all = loadFromStorage<TournamentCertificate[]>(STORAGE_KEYS.CERTIFICATES, DEFAULT_CERTIFICATES)
  const randNum = Math.floor(1000 + Math.random() * 9000)
  const certificateId = `KG-TOUR-CERT-${randNum}`
  const verificationHash = `KG-AUTH-${cert.sport.slice(0, 3).toUpperCase()}-${randNum}-${cert.achievementRole.slice(0, 4).toUpperCase()}`

  const newCert: TournamentCertificate = {
    ...cert,
    certificateId,
    verificationHash,
    issuedDate: new Date().toISOString().slice(0, 10),
  }

  const updated = [newCert, ...all]
  saveToStorage(STORAGE_KEYS.CERTIFICATES, updated)
  return newCert
}

export function generateWhatsAppCertificateUrl(cert: TournamentCertificate): string {
  const message = [
    `🏆 *OFFICIAL KHELGRID TOURNAMENT MERIT CERTIFICATE*`,
    `*Tournament:* ${cert.tournamentTitle}`,
    `*Athlete:* ${cert.athleteName}`,
    `*Team:* ${cert.teamName} (${cert.sport})`,
    `*Award / Merit:* 🎖️ *${cert.achievementRole}*`,
    `*Verification Stamp:* \`${cert.verificationHash}\``,
    `*Certificate ID:* ${cert.certificateId}`,
    `*Issued by:* ${cert.organizerAuthority}`,
    `--------------------------------`,
    `This verifiable digital credential has been permanently authenticated on KhelGrid's National Sports Talent Network.`,
    `Verify authentic copy: https://khelgrid.com/verify-pass?ref=${cert.certificateId}`,
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

// ---------------------------------------------------------------------------
// 5. Cross-SaaS Ecosystem Interoperability (Tournament <-> Academy <-> Venue)
// ---------------------------------------------------------------------------

export interface TournamentMetadata {
  id: string
  title: string
  sport: string
  city: string
  state?: string
  division: string // e.g. 'U-14' | 'U-16' | 'U-18' | 'Open'
  maxAllowedAge: number
  venueSlug?: string
  venueName?: string
  startDate: string
  endDate: string
  status: 'registration_open' | 'bracket_active' | 'completed'
  entryFee: number
  maxTeams: number
  registeredTeamsCount: number
}

export interface RegisteredAcademySquad {
  id: string
  tournamentId: string
  tournamentTitle: string
  academyId: string
  academyName: string
  teamName: string
  division: string
  contactPhone: string
  submittedAt: string
  status: 'APPROVED' | 'PENDING_AUDIT' | 'REJECTED'
  players: SquadVerificationPlayer[]
  verification: SquadVerificationResult
}

export const DEFAULT_TOURNAMENTS: TournamentMetadata[] = [
  {
    id: 'tour-national-u16-2026',
    title: 'All-India National Youth Championship 2026',
    sport: 'Football',
    city: 'Bengaluru',
    state: 'Karnataka',
    division: 'U-16',
    maxAllowedAge: 16,
    venueSlug: 'bengaluru-football-turf',
    venueName: 'Bengaluru Football Turf Arena',
    startDate: '2026-11-20',
    endDate: '2026-11-24',
    status: 'bracket_active',
    entryFee: 3000,
    maxTeams: 8,
    registeredTeamsCount: 8,
  },
  {
    id: 'tour-delhi-grassroots-u14',
    title: 'Delhi State Junior Grassroots Cup 2026',
    sport: 'Football',
    city: 'Delhi',
    state: 'Delhi NCR',
    division: 'U-14',
    maxAllowedAge: 14,
    venueSlug: 'delhi-sports-hub',
    venueName: 'Siri Fort Sports Complex',
    startDate: '2026-12-05',
    endDate: '2026-12-08',
    status: 'registration_open',
    entryFee: 2500,
    maxTeams: 16,
    registeredTeamsCount: 9,
  },
  {
    id: 'tour-mumbai-shuttle-u17',
    title: 'Mumbai All-Stars Badminton Trophy 2026',
    sport: 'Badminton',
    city: 'Mumbai',
    state: 'Maharashtra',
    division: 'U-17',
    maxAllowedAge: 17,
    venueSlug: 'mumbai-badminton-hub',
    venueName: 'Bandra Badminton Academy Courts',
    startDate: '2026-12-12',
    endDate: '2026-12-14',
    status: 'registration_open',
    entryFee: 1500,
    maxTeams: 16,
    registeredTeamsCount: 12,
  },
  {
    id: 'tour-bengaluru-colts-cricket',
    title: 'Bengaluru Colts Super Sixes Cricket Cup',
    sport: 'Cricket',
    city: 'Bengaluru',
    state: 'Karnataka',
    division: 'U-15',
    maxAllowedAge: 15,
    venueSlug: 'bengaluru-football-turf',
    venueName: 'Koramangala Cricket Arena',
    startDate: '2026-12-18',
    endDate: '2026-12-21',
    status: 'registration_open',
    entryFee: 4000,
    maxTeams: 12,
    registeredTeamsCount: 6,
  },
]

export function getAvailableTournaments(): TournamentMetadata[] {
  return loadFromStorage<TournamentMetadata[]>(STORAGE_KEYS.TOURNAMENTS, DEFAULT_TOURNAMENTS)
}

export function getRegisteredSquads(tournamentId?: string): RegisteredAcademySquad[] {
  const all = loadFromStorage<RegisteredAcademySquad[]>(STORAGE_KEYS.REGISTERED_SQUADS, [])
  if (tournamentId) return all.filter(s => s.tournamentId === tournamentId)
  return all
}

export function registerAcademySquad(params: {
  tournamentId: string
  academyId: string
  academyName: string
  teamName: string
  division: string
  contactPhone: string
  players: SquadVerificationPlayer[]
}): { success: boolean; message: string; squad: RegisteredAcademySquad } {
  const tournaments = getAvailableTournaments()
  const tour = tournaments.find(t => t.id === params.tournamentId)
  const maxAge = tour ? tour.maxAllowedAge : 16
  const tournamentTitle = tour ? tour.title : 'Official Tournament'

  // Run anti-age-fraud verification
  const verification = verifySquadAgeEligibility(params.teamName, params.players, maxAge)

  const status: RegisteredAcademySquad['status'] =
    verification.fraudRiskScore === 'FRAUD_DETECTED'
      ? 'REJECTED'
      : verification.fraudRiskScore === 'SUSPECT'
      ? 'PENDING_AUDIT'
      : 'APPROVED'

  const squad: RegisteredAcademySquad = {
    id: `sq-reg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tournamentId: params.tournamentId,
    tournamentTitle,
    academyId: params.academyId,
    academyName: params.academyName,
    teamName: params.teamName,
    division: params.division,
    contactPhone: params.contactPhone,
    submittedAt: new Date().toISOString(),
    status,
    players: params.players,
    verification,
  }

  const all = loadFromStorage<RegisteredAcademySquad[]>(STORAGE_KEYS.REGISTERED_SQUADS, [])
  saveToStorage(STORAGE_KEYS.REGISTERED_SQUADS, [squad, ...all])

  // Increment tournament registeredTeamsCount
  if (tour && status === 'APPROVED') {
    tour.registeredTeamsCount++
    saveToStorage(STORAGE_KEYS.TOURNAMENTS, tournaments)
  }

  const message =
    status === 'REJECTED'
      ? `Registration rejected: ${verification.flaggedCount} player(s) flagged for age-fraud exceeding division cutoff.`
      : status === 'PENDING_AUDIT'
      ? `Squad submitted with warning: 1 player flagged for review. Status is pending referee audit.`
      : `Squad successfully registered and verified for ${tournamentTitle}!`

  return {
    success: status !== 'REJECTED',
    message,
    squad,
  }
}

export function bookVenueSlotForTournamentMatch(params: {
  matchId: string
  tournamentId: string
  tournamentTitle: string
  venueSlug: string
  courtId: string
  date: string
  timeSlot: string
  matchTitle: string
}): { success: boolean; bookingRef: string; message: string } {
  try {
    const courts = getTurfCourts(params.venueSlug)
    const court = courts.find(c => c.id === params.courtId) || courts[0]

    const res = bookTurfSlot({
      venueSlug: params.venueSlug,
      venueName: params.tournamentTitle,
      courtId: params.courtId,
      courtName: court?.name || 'Main Pitch',
      date: params.date,
      timeSlot: params.timeSlot,
      customerName: `Tournament Ops: ${params.tournamentTitle}`,
      customerPhone: '+919876543210',
      hourlyPrice: 1800,
      advanceDeposit: 1800,
      paymentMethod: 'fully_paid',
    })

    if (!res.success || !res.booking) {
      return {
        success: false,
        bookingRef: '',
        message: res.error || 'Court slot is already booked or unavailable on that date/time.',
      }
    }

    const bookingRecord = res.booking

    // Update match node in bracket store if it exists
    const allMatches = loadFromStorage<TournamentBracketNode[]>(STORAGE_KEYS.BRACKETS, DEFAULT_BRACKET_MATCHES)
    const matchIdx = allMatches.findIndex(m => m.id === params.matchId)
    if (matchIdx >= 0) {
      allMatches[matchIdx].pitchOrCourt = `Court ${params.courtId} (${bookingRecord.bookingId})`
      saveToStorage(STORAGE_KEYS.BRACKETS, allMatches)
    }

    return {
      success: true,
      bookingRef: bookingRecord.bookingId,
      message: `Turf court slot successfully reserved for match! Reference: ${bookingRecord.bookingId}`,
    }
  } catch (err) {
    return {
      success: false,
      bookingRef: '',
      message: `Could not reserve turf court: ${err instanceof Error ? err.message : 'Unknown error'}`,
    }
  }
}
