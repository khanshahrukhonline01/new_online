import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  BASELINE_SCOUT_ATHLETES,
  generateScoutShortlistCsv,
  saveAthleteToShortlist,
  getScoutShortlist,
} from './scoutingData'
import { ScoutPortalPage } from './ScoutPortalPage'
import { ScoutConnectModal } from './ScoutConnectModal'

describe('Scout Portal Module', () => {
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

  it('renders ScoutPortalPage markup with metrics and athlete cards', () => {
    const markup = renderToStaticMarkup(<ScoutPortalPage />)

    expect(markup).toContain('Scout Portal &amp; Verified Athlete Workbench.')
    expect(markup).toContain('850+')
    expect(markup).toContain('Scouting Book')
    expect(markup).toContain('Export CSV')
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
})
