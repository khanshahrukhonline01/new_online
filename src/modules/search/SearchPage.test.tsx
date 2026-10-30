import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SearchPage from './SearchPage'
import { getChroniclePapers } from '../../integrations/supabase/chronicle-client'
import { navigationModules } from '../../shared/navigation/navigationRegistry'

describe('Global Unified Search with KhelChronicle integration', () => {
  it('renders search interface with Research (KhelChronicle) category option and updated copy', () => {
    const html = renderToStaticMarkup(<SearchPage />)

    expect(html).toContain('<h1>Search KhelGrid.</h1>')
    expect(html).toContain('sports science research preprints')
    expect(html).toContain('value="research"')
    expect(html).toContain('Research (KhelChronicle)')
    expect(html).toContain('Sport, trial, venue or city…')
  })

  it('provides research preprints in getChroniclePapers that match key search queries', async () => {
    const papersResult = await getChroniclePapers()
    expect(papersResult.status).toBe('ready')
    expect(papersResult.data.length).toBeGreaterThanOrEqual(3)

    // Fast bowling query should match KG-2026-001
    const fastBowlingMatch = papersResult.data.find(p =>
      `${p.title} ${p.keywords.join(' ')} ${p.abstract.results}`.toLowerCase().includes('fast bowling') ||
      `${p.title} ${p.keywords.join(' ')} ${p.abstract.results}`.toLowerCase().includes('bowlers')
    )
    expect(fastBowlingMatch).toBeDefined()
    expect(fastBowlingMatch?.paperId).toBe('KG-2026-001')
    expect(fastBowlingMatch?.slug).toBe('kinematic-correlates-lumbar-spine-stress-fast-bowlers')

    // Yo-Yo test query should match KG-2026-002
    const yoyoMatch = papersResult.data.find(p =>
      `${p.title} ${p.keywords.join(' ')} ${p.abstract.results}`.toLowerCase().includes('yo-yo')
    )
    expect(yoyoMatch).toBeDefined()
    expect(yoyoMatch?.paperId).toBe('KG-2026-002')

    // Biomechanics query should match category or keywords
    const biomechanicsMatch = papersResult.data.find(p =>
      p.category.includes('biomechanics') || p.keywords.some(k => k.toLowerCase().includes('biomechanics'))
    )
    expect(biomechanicsMatch).toBeDefined()
  })

  it('verifies sidebar navigation registry has activated KhelChronicle Research without "coming soon"', () => {
    const learnModule = navigationModules.find(m => m.id === 'learn-community')
    expect(learnModule).toBeDefined()

    const chronicleNav = learnModule?.items.find(item => item.id === 'khelchronicle')
    expect(chronicleNav).toBeDefined()
    expect(chronicleNav?.label).toBe('KhelChronicle Research')
    expect(chronicleNav?.href).toBe('/khelchronicle')
    expect(chronicleNav?.icon).toBe('award')
    expect(chronicleNav?.available).toBe(true)
  })
})
