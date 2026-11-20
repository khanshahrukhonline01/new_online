import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearTournamentOpsMemoryStore,
  getTournamentBracket,
  generateTournamentBracket,
  verifySquadAgeEligibility,
  getLiveScorerState,
  updateLiveMatchScore,
  getTournamentCertificates,
  issueTournamentCertificate,
  generateWhatsAppCertificateUrl,
  SAMPLE_SQUAD_ROSTER,
  getAvailableTournaments,
  registerAcademySquad,
  bookVenueSlotForTournamentMatch,
} from './tournamentOpsEngine'

describe('tournamentOpsEngine Unit Suite', () => {
  beforeEach(() => {
    clearTournamentOpsMemoryStore()
  })

  it('retrieves default tournament bracket matches and progression tree', () => {
    const matches = getTournamentBracket('tour-national-u16-2026')
    expect(matches.length).toBeGreaterThanOrEqual(4)
    expect(matches.some(m => m.round === 'quarter')).toBe(true)
    expect(matches.some(m => m.round === 'semi')).toBe(true)
    expect(matches.some(m => m.round === 'final')).toBe(true)
  })

  it('generates an 8-team single elimination knockout tournament bracket', () => {
    const teams = [
      'Delhi Dynamos',
      'Mumbai Strikers',
      'Kolkata Knights',
      'Bengaluru Blasters',
      'Chennai Champions',
      'Goa Giants',
      'Punjab Panthers',
      'Hyderabad Heroes',
    ]

    const bracket = generateTournamentBracket({
      tournamentId: 'custom-tour-8',
      title: 'State Youth Championship',
      sport: 'Football',
      format: 'single_elimination',
      teamNames: teams,
    })

    expect(bracket.length).toBe(7) // 4 QF + 2 SF + 1 Final
    const qfs = bracket.filter(m => m.round === 'quarter')
    const sfs = bracket.filter(m => m.round === 'semi')
    const finalMatch = bracket.find(m => m.round === 'final')

    expect(qfs.length).toBe(4)
    expect(sfs.length).toBe(2)
    expect(finalMatch).toBeDefined()
    expect(qfs[0].teamA.name).toBe('Delhi Dynamos')
  })

  it('generates a 4-team tournament bracket with 2 Semis and 1 Final', () => {
    const teams = ['Team A', 'Team B', 'Team C', 'Team D']
    const bracket = generateTournamentBracket({
      tournamentId: 'custom-tour-4',
      title: 'Zonal Fast-Pitch',
      sport: 'Box Cricket',
      format: 'single_elimination',
      teamNames: teams,
    })

    expect(bracket.length).toBe(3) // 2 SF + 1 Final
    expect(bracket.filter(m => m.round === 'semi').length).toBe(2)
    expect(bracket.find(m => m.round === 'final')).toBeDefined()
  })

  it('scans a squad roster for age-eligibility and detects over-age players', () => {
    // Cutoff age is 16. Vikramjit Singh is 18.
    const scan = verifySquadAgeEligibility('Delhi Colts FC', SAMPLE_SQUAD_ROSTER, 16)
    expect(scan.eligible).toBe(false)
    expect(scan.flaggedCount).toBe(1)
    expect(scan.fraudRiskScore).toBe('SUSPECT')
    expect(scan.flaggedPlayers[0].name).toBe('Vikramjit Singh')
    expect(scan.flaggedPlayers[0].reason).toContain('exceeds tournament U-16 division')
  })

  it('clears squad with 100% eligible verified athletes', () => {
    const cleanRoster = SAMPLE_SQUAD_ROSTER.filter(p => p.age <= 16)
    const scan = verifySquadAgeEligibility('Clean Youth FC', cleanRoster, 16)
    expect(scan.eligible).toBe(true)
    expect(scan.flaggedCount).toBe(0)
    expect(scan.fraudRiskScore).toBe('CLEARED')
    expect(scan.verifiedCount).toBe(cleanRoster.length)
  })

  it('updates live match score and registers pitch-side match events', () => {
    const matchId = 'live-test-m1'
    const updated = updateLiveMatchScore(
      matchId,
      '3',
      '2',
      "2nd Half (75')",
      'GOAL! Screamer from 25 yards out by Sameer Khan',
      'teamA'
    )

    expect(updated.teamAScore).toBe('3')
    expect(updated.teamBScore).toBe('2')
    expect(updated.currentPeriod).toBe("2nd Half (75')")
    expect(updated.events[0].text).toContain('Screamer from 25 yards')

    const loaded = getLiveScorerState(matchId)
    expect(loaded.teamAScore).toBe('3')
    expect(loaded.events.length).toBeGreaterThan(0)
  })

  it('issues digital tournament certificates and generates WhatsApp dispatch link', () => {
    const cert = issueTournamentCertificate({
      tournamentId: 'tour-national-u16-2026',
      tournamentTitle: 'All-India National Youth Championship 2026',
      athleteName: 'Aarav Choudhary',
      teamName: 'Bengaluru Youth FC',
      sport: 'Football',
      achievementRole: 'Champion Winner',
      organizerAuthority: 'All India Sports Operations Board & KhelGrid',
    })

    expect(cert.certificateId).toMatch(/^KG-TOUR-CERT-/)
    expect(cert.verificationHash).toContain('KG-AUTH-FOO')

    const certificates = getTournamentCertificates('tour-national-u16-2026')
    expect(certificates.some(c => c.athleteName === 'Aarav Choudhary')).toBe(true)

    const waUrl = generateWhatsAppCertificateUrl(cert)
    expect(waUrl).toContain('https://wa.me/?text=')
    expect(waUrl).toContain('Aarav%20Choudhary')
    expect(waUrl).toContain('Champion%20Winner')
  })

  it('provides available tournaments and registers academy squads with age checks', () => {
    const tournaments = getAvailableTournaments()
    expect(tournaments.length).toBeGreaterThanOrEqual(4)
    const delhiTour = tournaments.find(t => t.id === 'tour-delhi-grassroots-u14')!

    const cleanSquad = [
      { id: 'p1', name: 'Kabir Verma', age: 13, dob: '2013-05-10', isPassportVerified: true },
      { id: 'p2', name: 'Manav Sharma', age: 14, dob: '2012-08-14', isPassportVerified: true },
    ]

    const regResult = registerAcademySquad({
      tournamentId: delhiTour.id,
      academyId: 'delhi-fa',
      academyName: 'Delhi Football Academy',
      teamName: 'Delhi FA Juniors U-14',
      division: 'U-14',
      contactPhone: '+919876543210',
      players: cleanSquad,
    })

    expect(regResult.success).toBe(true)
    expect(regResult.squad.status).toBe('APPROVED')
    expect(regResult.message).toContain('successfully registered')
  })

  it('cross-SaaS books venue turf court slot for scheduled tournament match', () => {
    const res = bookVenueSlotForTournamentMatch({
      matchId: 'match-qf-1',
      tournamentId: 'tour-national-u16-2026',
      tournamentTitle: 'All-India National Youth Championship 2026',
      venueSlug: 'sree-kanteerava-stadium',
      courtId: 'court-kan-1',
      date: '2026-11-26',
      timeSlot: '04:00 PM – 05:00 PM',
      matchTitle: 'Quarter Final 1',
    })

    expect(res.success).toBe(true)
    expect(res.bookingRef).toMatch(/^TRF-/)
  })
})
