import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SpotlightSearchModal from './SpotlightSearchModal'

describe('SpotlightSearchModal component', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <SpotlightSearchModal isOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('renders modal dialog with accessible attributes and trending chips when open', () => {
    const html = renderToStaticMarkup(
      <SpotlightSearchModal isOpen={true} onClose={vi.fn()} />
    )
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-label="Search KhelGrid catalogue"')
    expect(html).toContain('placeholder="Search sports, trials, turfs, cities, academies, preprints…"')
    expect(html).toContain('POPULAR &amp; TRENDING DISCOVERY')
    expect(html).toContain('Football Trials')
    expect(html).toContain('Badminton Turfs')
    expect(html).toContain('Cricket Academies')
    expect(html).toContain('Delhi Hub')
    expect(html).toContain('Bengaluru Hub')
    expect(html).toContain('Navigate')
    expect(html).toContain('Select')
    expect(html).toContain('Close')
  })

  it('renders category filter buttons when query is non-empty', () => {
    const html = renderToStaticMarkup(
      <SpotlightSearchModal isOpen={true} onClose={vi.fn()} initialQuery="Football" />
    )
    expect(html).toContain('Filter search results by category')
    expect(html).toContain('Sports')
    expect(html).toContain('Trials')
    expect(html).toContain('Venues')
    expect(html).toContain('Cities')
    expect(html).toContain('Academies')
    expect(html).toContain('Research')
  })
})
