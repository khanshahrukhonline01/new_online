import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import OpportunitiesPage from './OpportunitiesPage'
import {
  submitTrialApplication,
  getUserTrialApplications,
  isTrialAlreadyApplied,
} from '../../integrations/supabase/athlete-profile-client'

describe('OpportunitiesPage & Dynamic Selection Trial Applications', () => {
  it('renders opportunity discovery page with free entry filter and spots sorting', () => {
    const html = renderToStaticMarkup(<OpportunitiesPage />)

    expect(html).toContain('<h1>Your next opportunity.</h1>')
    expect(html).toContain('TRIALS · SELECTIONS · PROGRAMMES')
    expect(html).toContain('Free Entry Only (₹0)')
    expect(html).toContain('Most spots available')
    expect(html).toContain('Submit a trial')
  })

  it('submits a verified trial application with sports CV and combine benchmarks', async () => {
    const hadWindow = typeof window !== 'undefined'
    const storage = new Map<string, string>()

    if (!hadWindow) {
      ;(globalThis as unknown as { window: unknown }).window = {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, val: string) => storage.set(key, val),
          removeItem: (key: string) => storage.delete(key),
          clear: () => storage.clear(),
        },
        dispatchEvent: () => true,
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

    const res = await submitTrialApplication({
      trialSlug: 'delhi-u16-state-selection-2026',
      trialTitle: 'Delhi State U-16 Football Selection Trial',
      sport: 'Football',
      city: 'Delhi',
      venueName: 'Ambedkar Stadium',
      athleteName: 'Aarav Sharma',
      athletePhone: '9876543210',
      playingPosition: 'Central Midfielder',
      fitnessBenchmarks: {
        yoyoIr1Meters: 1920,
        sprint30mSeconds: 4.05,
        cmjHeightCm: 55,
        tier: 'National Talent Pool',
        percentileAvg: 92,
      },
      videoClipsCount: 2,
      statement: 'Proven midfielder with Delhi state tournament experience.',
    })

    expect(res.status).toBe('submitted')
    expect(res.application.applicationRef).toContain('APP-FOO-')
    expect(res.application.athleteName).toBe('Aarav Sharma')
    expect(res.application.fitnessBenchmarks?.percentileAvg).toBe(92)

    const apps = getUserTrialApplications()
    expect(apps.length).toBeGreaterThan(0)
    expect(isTrialAlreadyApplied('delhi-u16-state-selection-2026')).toBe(true)
    expect(isTrialAlreadyApplied('unknown-nonexistent-trial')).toBe(false)

    if (!hadWindow) {
      delete (globalThis as Record<string, unknown>).window
      delete (globalThis as Record<string, unknown>).CustomEvent
    }
  })
})
