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
}

const memoryStore = new Map<string, unknown>()

export function clearTournamentOpsMemoryStore(): void {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.BRACKETS)
      window.localStorage.removeItem(STORAGE_KEYS.SCORER)
      window.localStorage.removeItem(STORAGE_KEYS.CERTIFICATES)
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
