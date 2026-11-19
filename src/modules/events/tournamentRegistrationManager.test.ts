import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearTournamentRegistrationsMemoryStore,
  getTournamentRegistrations,
  lookupTournamentPass,
  registerTournamentTeam,
  admitTournamentTeam,
} from './tournamentRegistrationManager'

describe('Tournament Registration & Team Roster Manager', () => {
  beforeEach(() => {
    clearTournamentRegistrationsMemoryStore()
  })

  it('retrieves preseeded tournament registrations', () => {
    const list = getTournamentRegistrations()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0].teamName).toBe('Delhi Strikers FC')
  })

  it('looks up a pass by passNumber case-insensitively', () => {
    const pass = lookupTournamentPass('kg-tour-delhi-104')
    expect(pass).not.toBeNull()
    expect(pass?.captainName).toBe('Sameer Khan')
    expect(pass?.roster.length).toBe(5)
  })

  it('registers a new tournament team with unique pass number and QR payload', () => {
    const reg = registerTournamentTeam({
      tournamentId: 'evt-test',
      tournamentTitle: 'Mumbai Monsoon Cup',
      sport: 'Football',
      city: 'Mumbai',
      teamName: 'Bandra FC',
      captainName: 'Kabir Roy',
      captainPhone: '9876543210',
      roster: [
        { id: 'p1', name: 'Kabir Roy', jerseyNo: 10, age: 16, position: 'Forward' },
        { id: 'p2', name: 'Zaid Ali', jerseyNo: 9, age: 15, position: 'Winger' },
      ],
      entryFee: '₹1,000',
      reportingVenue: 'Cooperage Football Ground',
      reportingDate: '2026-12-20',
    })

    expect(reg.passNumber).toMatch(/^KG-TOUR-FOO-/)
    expect(reg.qrCodePayload).toContain('https://khelgrid.com/verify-pass?id=')
    expect(reg.roster.length).toBe(2)

    const lookedUp = lookupTournamentPass(reg.passNumber)
    expect(lookedUp?.teamName).toBe('Bandra FC')
  })

  it('admits a team and prevents duplicate check-in at the ground', () => {
    const firstCheck = admitTournamentTeam('KG-TOUR-BLR-208', 'Referee Anand Rao')
    expect(firstCheck.success).toBe(true)
    expect(firstCheck.registration?.checkedInAt).toBeDefined()
    expect(firstCheck.registration?.checkedInBy).toBe('Referee Anand Rao')

    // Second check should fail with duplicate prevention
    const secondCheck = admitTournamentTeam('KG-TOUR-BLR-208', 'Official Sunil')
    expect(secondCheck.success).toBe(false)
    expect(secondCheck.message).toContain('already checked in today')
  })
})
