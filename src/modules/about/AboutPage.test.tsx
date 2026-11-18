import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AboutPage from './AboutPage'

describe('AboutPage', () => {
  it('renders rich, authoritative publisher content without placeholder text', () => {
    const html = renderToStaticMarkup(<AboutPage />)

    expect(html).toContain('Democratizing Grassroots Sports &amp; Athletic Pathways Across India')
    expect(html).toContain('53+')
    expect(html).toContain('Indian Sports Cities &amp; Hubs')
    expect(html).toContain('34+')
    expect(html).toContain('The 5 Pillars of the KhelGrid Ecosystem')
    expect(html).toContain('khelgrid@gmail.com')
    expect(html).toContain('ipr@khelgrid.com')
    expect(html).not.toContain('coming soon')
    expect(html).not.toContain('Feature coming soon')
    expect(html).not.toContain('review required')
  })
})
