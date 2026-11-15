import { describe, it, expect, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  BASELINE_SCOUT_ATHLETES,
  generateScoutShortlistCsv,
  saveAthleteToShortlist,
  getScoutShortlist,
  getScoutAthletes,
  clearScoutAthletesCache,
  computeAge,
  deriveAgeGroup,
  inferGender,
  deriveVerificationTier,
  deriveFederationUid,
  parseMetricsAndPercentile,
  parseAchievements,
  mapProfileToScoutAthlete,
} from './scoutingData'
import { ScoutPortalPage } from './ScoutPortalPage'
import { ScoutConnectModal } from './ScoutConnectModal'

describe('Scout Portal Module', () => {
  beforeEach(() => {
    clearScoutAthletesCache()
  })

  it('has comprehensive verified grassroots athlete normative profiles', () => {
    expect(BASELINE_SCOUT_ATHLETES.length).toBeGreaterThanOrEqual(10)

    const bowler = BASELINE_SCOUT_ATHLETES.find(a => a.sport === 'Cricket')
    expect(bowler).toBeDefined()
    expect(bowler?.metrics.sprint30mSeconds).toBeLessThan(4.5)
    expect(bowler?.percentileRank).toBeGreaterThanOrEqual(90)
    expect(bowler?.federationUid).toBeDefined()

    const runner = BASELINE_SCOUT_ATHLETES.find(a => a.sport === 'Athletics')
    expect(runner).toBeDefined()
    expect(runner?.verifiedTier).toBe('Tier-1 Verified')
  })

  it('generates valid RFC-4180 CSV scouting dossier with headers and athlete rows', () => {
    const csv = generateScoutShortlistCsv(BASELINE_SCOUT_ATHLETES.slice(0, 3))

    expect(csv).toContain('Athlete ID,Name,Sport,Position/Role')
    expect(csv).toContain('Aarav Choudhary')
    expect(csv).toContain('Kavya R. Nair')
    expect(csv).toContain('Lalrempuia Fanai')
    expect(csv).toContain('30m Sprint (s)')
    expect(csv).toContain('Vertical Jump (cm)')
  })

  it('handles shortlist persistence correctly', () => {
    const athId = 'scout-test-123'
    saveAthleteToShortlist(athId)
    const list = getScoutShortlist()
    expect(list).toContain(athId)
  })

  it('renders ScoutPortalPage markup with metrics, sort, and athlete cards', () => {
    const markup = renderToStaticMarkup(<ScoutPortalPage />)

    expect(markup).toContain('Scout Portal &amp; Verified Athlete Workbench.')
    expect(markup).toContain('850+')
    expect(markup).toContain('Scouting Book')
    expect(markup).toContain('Export CSV')
    expect(markup).toContain('Print / PDF')
    expect(markup).toContain('Performance Sort:')
    expect(markup).toContain('City / State:')
    expect(markup).toContain('Aarav Choudhary')
    expect(markup).toContain('Connect with Coach')
    expect(markup).toContain('National Grassroots Normative Rank')
  })

  it('renders ScoutConnectModal when open with POCSO standard notice', () => {
    const athlete = BASELINE_SCOUT_ATHLETES[0]
    const markup = renderToStaticMarkup(
      <ScoutConnectModal
        athlete={athlete}
        isOpen={true}
        onClose={() => {}}
      />
    )

    expect(markup).toContain(`Connect Regarding ${athlete.name}`)
    expect(markup).toContain('Scout Full Name')
    expect(markup).toContain('Club / Academy / Federation')
    expect(markup).toContain('POCSO Minor Safety Standard')
    expect(markup).toContain('Dispatch Scouting Inquiry')
  })

  describe('Database Fetcher & Athlete Mapping Logic', () => {
    it('computes age correctly from date_of_birth and raw age', () => {
      expect(computeAge(undefined, 19)).toBe(19)
      expect(computeAge('2010-05-15', undefined)).toBeGreaterThanOrEqual(14)
      expect(computeAge(null, null)).toBe(17)
    })

    it('derives accurate age groups across all standard junior tiers', () => {
      expect(deriveAgeGroup(13)).toBe('U-14')
      expect(deriveAgeGroup(15)).toBe('U-16')
      expect(deriveAgeGroup(17)).toBe('U-17')
      expect(deriveAgeGroup(19)).toBe('U-19')
      expect(deriveAgeGroup(21)).toBe('Senior')
    })

    it('infers gender accurately from positions, sports, and raw inputs', () => {
      expect(inferGender('Cricket', 'Women’s All-Rounder')).toBe('Female')
      expect(inferGender('Badminton', 'Men’s Singles Specialist')).toBe('Male')
      expect(inferGender('Boxing', 'Featherweight', 'female')).toBe('Female')
      expect(inferGender('Football', 'Striker', 'Male')).toBe('Male')
    })

    it('derives verification tiers and federation UIDs', () => {
      expect(deriveVerificationTier('verified')).toBe('Tier-1 Verified')
      expect(deriveVerificationTier('pro')).toBe('Tier-1 Verified')
      expect(deriveVerificationTier('community')).toBe('Tier-2 Verified')

      const uid = deriveFederationUid({ id: 'prof-7721' }, 'Athletics', 'Haryana')
      expect(uid).toContain('KG-HA-ATH-2026-')
    })

    it('parses metrics, telemetry speeds, and composite percentiles', () => {
      const parsed = parseMetricsAndPercentile({
        fitness_benchmarks: {
          sprint30mSeconds: 3.85,
          cmjHeightCm: 61,
          yoyoIr1Meters: 2040,
        },
        video_clips: [
          {
            telemetry: [{ metricName: 'Approach Speed', metricValue: '32.4 km/h' }],
          },
        ],
      })

      expect(parsed.metrics.sprint30mSeconds).toBe(3.85)
      expect(parsed.metrics.cmjHeightCm).toBe(61)
      expect(parsed.metrics.yoyoIr1Meters).toBe(2040)
      expect(parsed.metrics.speedOrVelocityKmph).toBe(32.4)
      expect(parsed.percentileRank).toBeGreaterThanOrEqual(90)
    })

    it('parses achievements from structured JSON or string arrays', () => {
      const parsed = parseAchievements([
        { event: 'National Junior Athletics', year: '2025', result: 'Gold Medal' },
        'Khelo India Youth Games Finalist',
      ])

      expect(parsed).toEqual([
        'National Junior Athletics (2025) — Gold Medal',
        'Khelo India Youth Games Finalist',
      ])
    })

    it('maps an athlete profile database row to a complete ScoutAthlete', () => {
      const row = {
        id: 'ath-db-101',
        username: 'sameer-khan',
        full_name: 'Sameer Khan',
        sport: 'Football',
        playing_position: 'Attacking Midfielder',
        city: 'Kochi',
        state: 'Kerala',
        date_of_birth: '2008-03-20',
        team_or_academy: 'Kerala Blasters Youth Academy',
        coach: 'NIS Coach Ramesh Nair',
        verification_status: 'verified',
        fitness_benchmarks: {
          sprint30mSeconds: 3.98,
          cmjHeightCm: 55,
          yoyoIr1Meters: 2100,
          percentileAvg: 93,
        },
        achievements: [{ event: 'Reliance Foundation Youth Champ', year: '2025', result: 'Best Playmaker' }],
        height_cm: 176,
        weight_kg: 68,
        primary_foot_or_hand: 'Left-Footed',
        summary: 'Exceptional vision and direct passing accuracy through defensive blocks.',
      }

      const athlete = mapProfileToScoutAthlete(row)

      expect(athlete.id).toBe('ath-db-101')
      expect(athlete.name).toBe('Sameer Khan')
      expect(athlete.sport).toBe('Football')
      expect(athlete.age).toBeGreaterThanOrEqual(16)
      expect(athlete.ageGroup).toBe('U-19')
      expect(athlete.city).toBe('Kochi')
      expect(athlete.state).toBe('Kerala')
      expect(athlete.verifiedTier).toBe('Tier-1 Verified')
      expect(athlete.percentileRank).toBe(93)
      expect(athlete.dominantSide).toBe('Left-Footed')
      expect(athlete.metrics.yoyoIr1Meters).toBe(2100)
    })

    it('getScoutAthletes returns merged deduplicated candidates including showcase profiles', async () => {
      const athletes = await getScoutAthletes()

      expect(athletes.length).toBeGreaterThanOrEqual(13)
      // Contains both showcase athlete and baseline scout athlete
      expect(athletes.some(a => a.name.includes('Aarav') || a.name.includes('Rohit'))).toBe(true)
      expect(athletes.some(a => a.name.includes('Priya') || a.name.includes('Tanvi'))).toBe(true)
    })
  })
})
