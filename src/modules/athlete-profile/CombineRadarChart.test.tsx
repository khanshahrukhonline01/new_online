import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CombineRadarChart } from './CombineRadarChart'
import { SHOWCASE_ATHLETE_PROFILES } from '../../integrations/supabase/athlete-profile-client'

describe('CombineRadarChart (Physical & Biomechanical Hexagon Radar)', () => {
  it('renders SVG radar chart with all 6 axes for Rohit Verma', () => {
    const profile = SHOWCASE_ATHLETE_PROFILES['rohit-verma']
    const html = renderToStaticMarkup(<CombineRadarChart profile={profile} />)

    // Verify header and badge
    expect(html).toContain('NORMATIVE COMBINE RADAR')
    expect(html).toContain('Physical &amp; Biomechanical Hexagon')
    expect(html).toContain('Cohort: SAI National Juniors')

    // Verify all 6 axes are present
    expect(html).toContain('SPEED')
    expect(html).toContain('ENDURANCE')
    expect(html).toContain('POWER')
    expect(html).toContain('AGILITY')
    expect(html).toContain('STAMINA')
    expect(html).toContain('TECHNIQUE')

    // Verify benchmark values calculated from profile benchmarks
    expect(html).toContain('4.02s') // sprint30mSeconds
    expect(html).toContain('1960m') // yoyoIr1Meters
    expect(html).toContain('54 cm') // cmjHeightCm

    // Verify SVG structure
    expect(html).toContain('combine-radar-svg')
    expect(html).toContain('radar-athlete-polygon')
    expect(html).toContain('radar-grid-ring')
  })

  it('renders graceful defaults when athlete has partial or no fitness benchmarks', () => {
    const minimalProfile = {
      ...SHOWCASE_ATHLETE_PROFILES['rohit-verma'],
      fitnessBenchmarks: undefined,
      videoClips: [],
    }
    const html = renderToStaticMarkup(<CombineRadarChart profile={minimalProfile} />)

    expect(html).toContain('NORMATIVE COMBINE RADAR')
    expect(html).toContain('SPEED')
    expect(html).toContain('Overall Combine Rating:')
    expect(html).toContain('OVR')
  })
})
