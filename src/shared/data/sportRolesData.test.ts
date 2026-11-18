import { describe, it, expect } from 'vitest'
import {
  getSportRolePreset,
  formatTechnicalIndicators,
  POPULAR_SPORTS_LIST,
  SPORT_ROLE_PRESETS,
} from './sportRolesData'

describe('Sport-Specific Role Presets & Technical Indicators', () => {
  it('returns valid presets for major Indian sports', () => {
    expect(POPULAR_SPORTS_LIST).toContain('Cricket')
    expect(POPULAR_SPORTS_LIST).toContain('Football')
    expect(POPULAR_SPORTS_LIST).toContain('Athletics')
    expect(POPULAR_SPORTS_LIST).toContain('Badminton')
    expect(POPULAR_SPORTS_LIST).toContain('Kabaddi')

    // Cricket
    const cricket = getSportRolePreset('Cricket')
    expect(cricket).not.toBeNull()
    expect(cricket?.technicalFields.battingStyles).toContain('Right-Hand Bat (RHB)')
    expect(cricket?.technicalFields.bowlingStyles).toContain('Right-Arm Fast (135+ km/h)')
    expect(cricket?.primaryPositions).toContain('Fast Bowling All-Rounder')

    // Football
    const football = getSportRolePreset('Football')
    expect(football).not.toBeNull()
    expect(football?.technicalFields.preferredFeet).toContain('Left Foot (Dominant)')
    expect(football?.primaryPositions).toContain('Center Back (CB)')

    // Athletics
    const athletics = getSportRolePreset('Athletics')
    expect(athletics).not.toBeNull()
    expect(athletics?.technicalFields.athleticsEvents).toContain('100m Sprint')
    expect(athletics?.technicalFields.athleticsEvents).toContain('Javelin Throw')

    // Badminton
    const badminton = getSportRolePreset('Badminton')
    expect(badminton).not.toBeNull()
    expect(badminton?.technicalFields.racketHands).toContain('Left-Handed (Southpaw)')
    expect(badminton?.technicalFields.playingStyles).toContain('Attacking Singles (Smash & Net Domination)')

    // Kabaddi
    const kabaddi = getSportRolePreset('Kabaddi')
    expect(kabaddi).not.toBeNull()
    expect(kabaddi?.primaryPositions).toContain('Right Corner (Defense Anchor)')
    expect(kabaddi?.technicalFields.signatureMoves).toContain('Ankle Hold (Kona Catch)')
  })

  it('handles fuzzy sport names gracefully', () => {
    expect(getSportRolePreset('Cricket U-19')).toBe(SPORT_ROLE_PRESETS.cricket)
    expect(getSportRolePreset('Association Football')).toBe(SPORT_ROLE_PRESETS.football)
    expect(getSportRolePreset('Track and Field Running')).toBe(SPORT_ROLE_PRESETS.athletics)
    expect(getSportRolePreset('Unknown Sport XYZ')).toBeNull()
    expect(getSportRolePreset(undefined)).toBeNull()
  })

  it('formats technical scouting indicators string properly for Cricket', () => {
    const formatted = formatTechnicalIndicators({
      sport: 'Cricket',
      battingStyle: 'Left-Hand Bat (LHB)',
      bowlingStyle: 'Right-Arm Fast (135+ km/h)',
    })
    expect(formatted).toBe('Batting: Left-Hand Bat (LHB) · Bowling: Right-Arm Fast (135+ km/h)')
  })

  it('formats technical indicators for Athletics with PB and SB', () => {
    const formatted = formatTechnicalIndicators({
      sport: 'Athletics',
      athleticsEvent: '100m Sprint',
      personalBest: '10.42s',
      seasonBest: '10.51s',
    })
    expect(formatted).toBe('Event: 100m Sprint · PB: 10.42s · SB: 10.51s')
  })

  it('formats technical indicators for Football with Foot and Tactical Role', () => {
    const formatted = formatTechnicalIndicators({
      sport: 'Football',
      preferredFoot: 'Left Foot',
      tacticalPosition: 'Inverted Winger',
    })
    expect(formatted).toBe('Foot: Left Foot · Role: Inverted Winger')
  })

  it('formats technical indicators for Badminton with Racket Hand and Style', () => {
    const formatted = formatTechnicalIndicators({
      sport: 'Badminton',
      racketHand: 'Left-Handed (Southpaw)',
      playingStyle: 'Attacking Singles',
    })
    expect(formatted).toBe('Hand: Left-Handed (Southpaw) · Style: Attacking Singles')
  })
})
