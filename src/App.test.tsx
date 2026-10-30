import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'
import { resolveRoute } from './shared/routing'
import { navigationModules, primaryNavigation } from './shared/navigation/navigationRegistry'

describe('KhelGrid discovery shell', () => {
  it('renders the current core discovery journeys', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Sports CV Wizard')
    expect(html).toContain('Talent Scanner')
    expect(html).toContain('Discover. Compete.')
    expect(html).toContain('Source-aware listings')
    expect(html).toContain('Live Match Center')
    expect(html).toContain('Skip to content')
    expect(html).toContain('Search KhelGrid')
    expect(html).toContain('aria-label="Sidebar navigation"')
    expect(html).toContain('Search KhelGrid catalogue')
    expect(html).toContain('aria-label="Browse sports"')
    expect(html).toContain('Cricket')
    expect(html).toContain('aria-label="Scroll sports right"')
    expect(html).not.toContain('id="primary-navigation"')
    expect(html).toContain('aria-controls="app-sidebar"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-label="Toggle main navigation"')
    expect(html).toContain('aria-current="page"')
  })

  it('clearly states that live feeds and account services are not connected yet', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('live feeds and account services are not connected yet')
    expect(html).toContain('Not a booking or live-score service')
    expect(html).toContain('India’s grid for sports trials, venues, coaching and athlete profiles.')
    expect(html).toContain('aria-label="Explore KhelGrid"')
    expect(html).toContain('Contact KhelGrid')
    expect(html).toContain('Explore sports on KhelGrid')
    expect(html).toContain('footer-quick-chips')
    expect(html).toContain('Grow with KhelGrid')
    expect(html).toContain('Go Pro · ₹499/month')
    expect(html).toContain('Copyright notice')
    expect(html).toContain('Explore KhelGrid Products')
    expect(html).toContain('IPR, AI &amp; Copyright Notice')
    expect(html).toContain('Sports Network Index')
    expect(html).toContain('ipr@khelgrid.com')
    expect(html).toContain('KhelChronicle')
    expect(html).toContain('Frequently Asked Questions')
    expect(html).toContain('Got questions? We have answers.')
    expect(html).toContain('Game, Sport &amp; Play Across India')
    expect(html).toContain('54+ Verified Directories')
    expect(html).toContain('Akhada, Dangal &amp; Combat')
    expect(html).toContain('Govt Sports Quota Recruitment')
    expect(html).toContain('Top Sports Complexes in Cities')
    expect(html).toContain('Explore all 16 cities')
    expect(html).toContain('Jawaharlal Nehru Stadium')
    expect(html).toContain('Wankhede Stadium')
    expect(html).toContain('Sree Kanteerava Stadium')
  })
})

describe('route resolution', () => {
  it.each([
    ['/', 'home'],
    ['/sports', 'sports-index'],
    ['/sports/football', 'sport-detail'],
    ['/sport/football', 'sport-detail'],
    ['/opportunities', 'opportunities-index'],
    ['/trials', 'opportunities-index'],
    ['/opportunities/example-trial', 'opportunity-detail'],
    ['/venues', 'venues-index'],
    ['/book', 'venues-index'],
    ['/venues/example-venue', 'venue-detail'],
    ['/search', 'search'],
    ['/khelchronicle', 'khelchronicle-index'],
    ['/chronicle', 'khelchronicle-index'],
    ['/khelchronicle/submit', 'khelchronicle-submit'],
    ['/learning-hub', 'feature'],
    ['/start-from-zero', 'feature'],
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
    expect(html).toContain('<h1>Search KhelGrid.</h1>')
    expect(html).toContain('aria-label="Catalogue filters"')
    expect(html).toContain('type="search"')
    expect(html).toContain('Sport, trial, venue or city…')
    expect(html).toContain('not sample listings')
    expect(html).toContain('Results come from the connected catalogue')
  })
})

describe('shared navigation route coverage', () => {
  it('keeps Search in Discover while including it in combined navigation', () => {
    expect(navigationModules.find(section => section.id === 'discover')?.items.map(item => item.href))
      .toContain('/search')
    expect(primaryNavigation.map(item => item.href)).toContain('/search')
  })
})


describe('permanent sidebar layout contract', () => {
  it('starts in the compact icon-rail state without changing the page shell structure', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('class="app-shell foundation-v1 sidebar-is-collapsed"')
    expect(html).toContain('id="app-sidebar" class="app-sidebar is-collapsed"')
    expect(html).toContain('<main id="main-content" class="page-shell">')
    expect(html).toContain('class="site-footer')
    expect(html).toContain('aria-label="Toggle main navigation"')
  })

  it('keeps navigation destinations and utility actions available in the compact rail', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('href="/sports"')
    expect(html).toContain('href="/opportunities"')
    expect(html).toContain('href="/venues"')
    expect(html).toContain('href="/search"')
    expect(html).toContain('aria-label="Notifications"')
    expect(html).toContain('aria-label="Help and feedback"')
    expect(html).toContain('aria-label="Your profile"')
  })

  it('keeps mobile drawer markup separate from the permanent desktop rail', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('id="mobile-sidebar-drawer"')
    expect(html).toContain('class="mobile-bottom-nav"')
    expect(html).toContain('aria-label="Mobile navigation"')
  })
})
