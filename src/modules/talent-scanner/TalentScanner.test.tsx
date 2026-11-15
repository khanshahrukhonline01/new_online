import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TalentScannerPage } from './TalentScannerPage'
import { saveAthleteFitnessBenchmarks } from '../../integrations/supabase/athlete-profile-client'
import {
  ATHLETE_PRESETS,
  NORMATIVE_BENCHMARKS,
  calculatePercentile,
  getTalentTier,
} from './normativeData'

describe('Talent Scanner Operationalized with KhelChronicle Normative Percentiles (KG-2026-002)', () => {
  it('correctly calculates percentiles based on empirical benchmarks from paper KG-2026-002', () => {
    const u16Male = NORMATIVE_BENCHMARKS.Male['U-16']

    // Yo-Yo IR1: 1520m is exactly 50th percentile for U-16 Male
    const yoyoMedian = calculatePercentile(1520, u16Male.yoyo_ir1_meters, true)
    expect(yoyoMedian).toBe(50)

    // Yo-Yo IR1: 2040m is 90th percentile
    const yoyoElite = calculatePercentile(2040, u16Male.yoyo_ir1_meters, true)
    expect(yoyoElite).toBe(90)

    // 30m Sprint: 4.22s is 50th percentile (lower is faster)
    const sprintMedian = calculatePercentile(4.22, u16Male.sprint_30m_seconds, false)
    expect(sprintMedian).toBe(50)

    // 30m Sprint: 3.92s is 90th percentile
    const sprintElite = calculatePercentile(3.92, u16Male.sprint_30m_seconds, false)
    expect(sprintElite).toBe(90)

    // CMJ: 45cm is 50th percentile
    const cmjMedian = calculatePercentile(45, u16Male.cmj_height_cm, true)
    expect(cmjMedian).toBe(50)

    // CMJ: 57cm is 90th percentile
    const cmjElite = calculatePercentile(57, u16Male.cmj_height_cm, true)
    expect(cmjElite).toBe(90)
  })

  it('assigns correct talent tier classifications based on composite percentiles', () => {
    expect(getTalentTier(94).name).toContain('National Talent Pool')
    expect(getTalentTier(82).name).toContain('State Academy Contender')
    expect(getTalentTier(62).name).toContain('District Competitive Standard')
    expect(getTalentTier(38).name).toContain('Grassroots Development Standard')
  })

  it('provides verified athlete presets across sports, ages, and genders', () => {
    expect(ATHLETE_PRESETS.length).toBeGreaterThanOrEqual(4)
    for (const preset of ATHLETE_PRESETS) {
      expect(preset.label).toBeTruthy()
      expect(preset.sport).toBeTruthy()
      expect(preset.yoyo).toBeGreaterThan(500)
      expect(preset.sprint).toBeLessThan(5.0)
      expect(preset.cmj).toBeGreaterThan(30)
    }
  })

  it('renders complete Talent Scanner UI with scorecard, scientific citation, and cross-platform CTAs', () => {
    const html = renderToStaticMarkup(<TalentScannerPage />)

    // Heading & Value proposition
    expect(html).toContain('Talent Scanner · Objective Grassroots Benchmarks')
    expect(html).toContain('4,820 grassroots athletes')
    expect(html).toContain('KG-2026-002')

    // Standardized field test controls
    expect(html).toContain('Yo-Yo IR1 Test Distance')
    expect(html).toContain('30m Electronic Sprint Time')
    expect(html).toContain('Countermovement Jump (CMJ)')

    // Quick presets
    expect(html).toContain('U-16 Elite Football Winger')
    expect(html).toContain('U-19 Fast Bowling Candidate')

    // Scientific Citation Box linking to KhelChronicle
    expect(html).toContain('Dr. Rajeshwari Nair &amp; Dr. Alok Sen')
    expect(html).toContain('Normative Physical Fitness Percentiles')
    expect(html).toContain('/khelchronicle/normative-fitness-percentiles-grassroots-athletes-india')

    // Retention and engagement action links
    expect(html).toContain('/sports-cv')
    expect(html).toContain('Add Score to KhelGrid Sports CV')
    expect(html).toContain('/opportunities?sport=Football')
    expect(html).toContain('/academies?sport=Football')
    expect(html).toContain('Save Benchmarks to My Player Card')
    expect(html).toContain('Download Official Combine Scorecard')
    expect(html).toContain('Explore Top Verified Talent in Scout Portal')

    // Structured Data
    expect(html).toContain('application/ld+json')
    expect(html).toContain('"@type":"WebApplication"')
    expect(html).toContain('"name":"KhelGrid Talent Scanner"')
  })

  it('saves fitness benchmarks to local storage profile and dispatches cross-component update event', async () => {
    const hadWindow = typeof window !== 'undefined'
    const storage = new Map<string, string>()
    const listeners: Record<string, ((ev: unknown) => void)[]> = {}

    if (!hadWindow) {
      ;(globalThis as unknown as { window: unknown }).window = {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, val: string) => storage.set(key, val),
          removeItem: (key: string) => storage.delete(key),
          clear: () => storage.clear(),
        },
        addEventListener: (event: string, fn: (ev: unknown) => void) => {
          listeners[event] = listeners[event] || []
          listeners[event].push(fn)
        },
        removeEventListener: (event: string, fn: (ev: unknown) => void) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter(cb => cb !== fn)
          }
        },
        dispatchEvent: (ev: { type: string }) => {
          const cbs = listeners[ev.type] || []
          for (const cb of cbs) cb(ev)
          return true
        },
      }
      ;(globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class {
        type: string
        detail: unknown
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type
          this.detail = init?.detail
        }
      }
    }

    let dispatched = false
    const listener = () => {
      dispatched = true
    }
    window.addEventListener('khelgrid:benchmarks-updated', listener)

    const result = await saveAthleteFitnessBenchmarks({
      yoyoIr1Meters: 1840,
      sprint30mSeconds: 4.12,
      cmjHeightCm: 52,
      tier: 'State Academy Contender (Top 25%)',
      percentileAvg: 82,
      sport: 'Football',
      gender: 'Male',
      ageCategory: 'U-16',
    })

    expect(result.status).toBeDefined()
    expect(result.profile.fitnessBenchmarks).toBeDefined()
    expect(result.profile.fitnessBenchmarks?.yoyoIr1Meters).toBe(1840)
    expect(result.profile.fitnessBenchmarks?.sprint30mSeconds).toBe(4.12)
    expect(result.profile.fitnessBenchmarks?.cmjHeightCm).toBe(52)
    expect(result.profile.fitnessBenchmarks?.percentileAvg).toBe(82)
    expect(dispatched).toBe(true)

    window.removeEventListener('khelgrid:benchmarks-updated', listener)

    if (!hadWindow) {
      delete (globalThis as Record<string, unknown>).window
      delete (globalThis as Record<string, unknown>).CustomEvent
    }
  })
})
