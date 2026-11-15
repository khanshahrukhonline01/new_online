import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FreeSportsBooksSection from './FreeSportsBooksSection'

describe('FreeSportsBooksSection', () => {
  it('renders the section title, free reading badges, and book cards', () => {
    const html = renderToStaticMarkup(<FreeSportsBooksSection />)
    expect(html).toContain('Sports Books — Free to Read Online')
    expect(html).toContain('Open-access sports science')
    expect(html).toContain('Modern Football Tactics &amp; Spatial Pressing')
    expect(html).toContain('Cricket Fast Bowling: Biomechanics &amp; Speed Mechanics')
    expect(html).toContain('Free to Read')
    expect(html).toContain('All Books in Learning Hub')
    expect(html).toContain('href="/learning"')
  })

  it('renders scroll arrows and accessible labels', () => {
    const html = renderToStaticMarkup(<FreeSportsBooksSection />)
    expect(html).toContain('aria-label="Scroll sports books left"')
    expect(html).toContain('aria-label="Scroll sports books right"')
    expect(html).toContain('aria-label="Free sports books catalog rail"')
  })
})
