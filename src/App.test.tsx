import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { resolveRoute } from './shared/routing'

describe('KhelGrid discovery shell', () => {
  it('renders the current core discovery journeys', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Explore sports')
    expect(html).toContain('Explore opportunities')
    expect(html).toContain('Browse venues')
    expect(html).toContain('Discover. Compete.')
    expect(html).toContain('Source-aware listings')
    expect(html).toContain('What’s available now')
    expect(html).toContain('Skip to content')
    expect(html).toContain('Search KhelGrid')
    expect(html).toContain('aria-label="Main navigation"')
    expect(html).toContain('id="primary-navigation"')
    expect(html).toContain('aria-controls="mobile-sidebar-drawer"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-label="Open main navigation"')
    expect(html).toContain('aria-current="page"')
  })

  it('clearly states that live feeds and account services are not connected yet', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('live feeds and account services are not connected yet')
    expect(html).toContain('Not a booking or live-score service')
  })
})

describe('route resolution', () => {
  it.each([
    ['/', 'home'],
    ['/sports', 'sports-index'],
    ['/sports/football', 'sport-detail'],
    ['/opportunities', 'opportunities-index'],
    ['/trials', 'opportunities-index'],
    ['/opportunities/example-trial', 'opportunity-detail'],
    ['/venues', 'venues-index'],
    ['/book', 'venues-index'],
    ['/venues/example-venue', 'venue-detail'],
    ['/search', 'search'],
    ['/not-a-route', 'not-found'],
    ['/sports/football/extra', 'not-found'],
  ] as const)('resolves %s as %s', (path, expected) => {
    expect(resolveRoute(path).name).toBe(expected)
  })

  it('normalizes trailing slashes and safely handles malformed URL encoding', () => {
    expect(resolveRoute('/sports/football/').name).toBe('sport-detail')
    expect(resolveRoute('/sports/%E0%A4%A')).toMatchObject({ name: 'sport-detail', slug: '%E0%A4%A' })
  })
})


describe('catalogue search', () => {
  it('renders an accessible search field without inventing result records', async () => {
    const { default: SearchPage } = await import('./modules/search/SearchPage')
    const html = renderToStaticMarkup(<SearchPage />)
    expect(html).toContain('Search the catalogue')
    expect(html).toContain('catalogue-search')
    expect(html).toContain('not sample listings')
    expect(html).toContain('Results come from the connected catalogue')
  })
})
