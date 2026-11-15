import { describe, expect, it } from 'vitest'
import { getRouteSeoMetadata, updatePageSeoMetadata } from './seoAndShare'

describe('SEO & SERP Metadata Validation', () => {
  it('marks the moderator control panel as non-indexable', () => {
    const metadata = getRouteSeoMetadata('/admin/control')
    expect(metadata.robots).toBe('noindex, nofollow, noarchive')
    expect(metadata.canonicalUrl).toBe('https://khelgrid.com/admin/control')
  })

  it('keeps public catalogue routes indexable', () => {
    expect(getRouteSeoMetadata('/venues').robots).toBeUndefined()
  })

  it('enforces mobile-first title character limits (<= 70 chars) across primary routes to prevent SERP truncation', () => {
    const coreRoutes = [
      '/',
      '/play',
      '/opportunities',
      '/venues',
      '/academies',
      '/sports',
      '/live',
      '/sports-cv',
      '/talent-scanner',
      '/khelchronicle',
      '/cities',
      '/search',
      '/tools',
      '/pricing',
      '/saved',
      '/coaches',
      '/events',
      '/scout-portal',
      '/verification',
    ]

    for (const route of coreRoutes) {
      const meta = getRouteSeoMetadata(route)
      expect(
        meta.title.length,
        `Title for ${route} ("${meta.title}") exceeds 70 characters (${meta.title.length})`
      ).toBeLessThanOrEqual(70)
    }
  })

  it('incorporates high-intent search query keywords from Google Search Console', () => {
    const sportsCvMeta = getRouteSeoMetadata('/sports-cv')
    expect(sportsCvMeta.keywords).toContain('khel id')
    expect(sportsCvMeta.keywords).toContain('sports cv')
    expect(sportsCvMeta.keywords).toContain('खेल आईडी')

    const venuesMeta = getRouteSeoMetadata('/venues')
    expect(venuesMeta.keywords).toContain('khel turf')
    expect(venuesMeta.keywords).toContain('box cricket turf')

    const academiesMeta = getRouteSeoMetadata('/academies')
    expect(academiesMeta.keywords).toContain('khelo india academy near me')
    expect(academiesMeta.keywords).toContain('sai ncoe academy')

    const liveScoresMeta = getRouteSeoMetadata('/live')
    expect(liveScoresMeta.keywords).toContain('live cricket score')
    expect(liveScoresMeta.keywords).toContain('live football score')
    expect(liveScoresMeta.description).toContain('connected scoreboard feeds')
    expect(liveScoresMeta.description).not.toContain('Fastest')
    expect(liveScoresMeta.robots).toBe('noindex, follow')
    expect(liveScoresMeta.keywords).not.toContain('wpl live score')

    const chronicleMeta = getRouteSeoMetadata('/khelchronicle')
    expect(chronicleMeta.keywords).toContain('sports science research india')
    expect(chronicleMeta.keywords).toContain('cricket biomechanics')
  })

  it('provides structured Schema.org JSON-LD data for discovery on major routes', () => {
    // 1. WebSite with Google Sitelinks SearchAction
    const homeMeta = getRouteSeoMetadata('/')
    expect(homeMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(homeMeta.jsonLd)).toContain('SearchAction')
    expect(JSON.stringify(homeMeta.jsonLd)).toContain('https://khelgrid.com/search?q={search_term_string}')

    // 2. WebApplication schema for /sports-cv (Digital Khel ID builder) and /tools (Athlete calculators)
    const sportsCvMeta = getRouteSeoMetadata('/sports-cv')
    expect(sportsCvMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(sportsCvMeta.jsonLd)).toContain('WebApplication')
    expect(JSON.stringify(sportsCvMeta.jsonLd)).toContain('Athlete Sports CV & Khel ID Builder')

    const toolsMeta = getRouteSeoMetadata('/tools')
    expect(toolsMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(toolsMeta.jsonLd)).toContain('WebApplication')
    expect(JSON.stringify(toolsMeta.jsonLd)).toContain('Athlete Sports Tools & Trial Calculators')

    // 3. Service schema for sports venue and box cricket reservations on /venues
    const venuesMeta = getRouteSeoMetadata('/venues')
    expect(venuesMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(venuesMeta.jsonLd)).toContain('Service')
    expect(JSON.stringify(venuesMeta.jsonLd)).toContain('Sports Venue & Box Cricket Turf Reservation')

    // 4. DataCatalog schema for open-access preprints on /khelchronicle
    const chronicleMeta = getRouteSeoMetadata('/khelchronicle')
    expect(chronicleMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(chronicleMeta.jsonLd)).toContain('DataCatalog')
    expect(JSON.stringify(chronicleMeta.jsonLd)).toContain('KhelChronicle Open Sports Research Archive')

    // 5. ItemList schema on /opportunities and /academies
    const oppsMeta = getRouteSeoMetadata('/opportunities')
    expect(oppsMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(oppsMeta.jsonLd)).toContain('ItemList')

    const academiesMeta = getRouteSeoMetadata('/academies')
    expect(academiesMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(academiesMeta.jsonLd)).toContain('ItemList')

    // 6. Additional ItemList schemas on /sports, /coaches, /events, /cities
    expect(JSON.stringify(getRouteSeoMetadata('/sports').jsonLd)).toContain('ItemList')
    expect(JSON.stringify(getRouteSeoMetadata('/coaches').jsonLd)).toContain('ItemList')
    expect(JSON.stringify(getRouteSeoMetadata('/events').jsonLd)).toContain('ItemList')
    expect(JSON.stringify(getRouteSeoMetadata('/cities').jsonLd)).toContain('ItemList')
  })

  it('handles dynamic city sports hubs (/cities/:slug) with mobile SERP titles, geo keywords, and BreadcrumbList schema', () => {
    const kanpurMeta = getRouteSeoMetadata('/cities/kanpur')
    expect(kanpurMeta.title).toBe('Kanpur Sports Hub: Turfs, Academies & Trials · KhelGrid')
    expect(kanpurMeta.title.length).toBeLessThanOrEqual(70)
    expect(kanpurMeta.canonicalUrl).toBe('https://khelgrid.com/cities/kanpur')
    expect(kanpurMeta.keywords).toContain('cricket academy kanpur')
    expect(kanpurMeta.keywords).toContain('cricket turf in kanpur')
    expect(kanpurMeta.keywords).toContain('sports trials kanpur')
    expect(kanpurMeta.keywords).toContain('खेलग्रिड Kanpur')
    expect(JSON.stringify(kanpurMeta.jsonLd)).toContain('SportsActivityLocation')
    expect(JSON.stringify(kanpurMeta.jsonLd)).toContain('BreadcrumbList')
    expect(JSON.stringify(kanpurMeta.jsonLd)).toContain('Uttar Pradesh')

    // Legacy /city/ alias route parity
    const kanpurAliasMeta = getRouteSeoMetadata('/city/kanpur')
    expect(kanpurAliasMeta.title).toBe('Kanpur Sports Hub: Turfs, Academies & Trials · KhelGrid')
    expect(kanpurAliasMeta.canonicalUrl).toBe('https://khelgrid.com/cities/kanpur')

    // Metro city check
    const delhiMeta = getRouteSeoMetadata('/cities/delhi')
    expect(delhiMeta.title).toBe('Delhi Sports Hub: Turfs, Academies & Trials · KhelGrid')
    expect(delhiMeta.title.length).toBeLessThanOrEqual(70)
    expect(JSON.stringify(delhiMeta.jsonLd)).toContain('Delhi NCR')
  })

  it('handles dynamic sport directories (/sports/:slug) with mobile SERP titles, keywords, and BreadcrumbList schema', () => {
    const cricketMeta = getRouteSeoMetadata('/sports/cricket')
    expect(cricketMeta.title).toBe('Cricket in India: Trials, Academies & Turfs · KhelGrid')
    expect(cricketMeta.title.length).toBeLessThanOrEqual(70)
    expect(cricketMeta.canonicalUrl).toBe('https://khelgrid.com/sports/cricket')
    expect(cricketMeta.keywords).toContain('cricket in india')
    expect(cricketMeta.keywords).toContain('cricket trials')
    expect(cricketMeta.keywords).toContain('cricket academy near me')
    expect(JSON.stringify(cricketMeta.jsonLd)).toContain('SportsEvent')
    expect(JSON.stringify(cricketMeta.jsonLd)).toContain('BreadcrumbList')

    const badmintonMeta = getRouteSeoMetadata('/sports/badminton')
    expect(badmintonMeta.title).toBe('Badminton in India: Trials, Academies & Turfs · KhelGrid')
    expect(badmintonMeta.title.length).toBeLessThanOrEqual(70)
  })

  it('handles dynamic venue, academy, and trial detail routes with BreadcrumbList schema', () => {
    const venueMeta = getRouteSeoMetadata('/venues/green-park-stadium-kanpur')
    expect(venueMeta.title.length).toBeLessThanOrEqual(70)
    expect(venueMeta.canonicalUrl).toBe('https://khelgrid.com/venues/green-park-stadium-kanpur')
    expect(JSON.stringify(venueMeta.jsonLd)).toContain('SportsActivityLocation')
    expect(JSON.stringify(venueMeta.jsonLd)).toContain('BreadcrumbList')

    const academyMeta = getRouteSeoMetadata('/academies/kanpur-cricket-association-academy')
    expect(academyMeta.title.length).toBeLessThanOrEqual(70)
    expect(academyMeta.canonicalUrl).toBe('https://khelgrid.com/academies/kanpur-cricket-association-academy')
    expect(JSON.stringify(academyMeta.jsonLd)).toContain('SportsClub')
    expect(JSON.stringify(academyMeta.jsonLd)).toContain('BreadcrumbList')

    const trialMeta = getRouteSeoMetadata('/opportunities/kca-u14-cricket-trials-kanpur-2026')
    expect(trialMeta.title.length).toBeLessThanOrEqual(70)
    expect(trialMeta.canonicalUrl).toBe('https://khelgrid.com/opportunities/kca-u14-cricket-trials-kanpur-2026')
    expect(JSON.stringify(trialMeta.jsonLd)).toContain('SportsEvent')
    expect(JSON.stringify(trialMeta.jsonLd)).toContain('BreadcrumbList')
  })

  it('injects complete OpenGraph and Twitter card metadata with 1200x630 social preview tags', () => {
    const meta = getRouteSeoMetadata('/venues/green-park-stadium-kanpur')

    // Mock document in Node test environment
    const metaTags = new Map<string, string>()
    const originalDocument = globalThis.document

    globalThis.document = {
      title: '',
      querySelector: (selector: string) => {
        const match = selector.match(/meta\[(name|property)="([^"]+)"\]/)
        if (match) {
          const key = match[2]
          if (metaTags.has(key)) {
            return {
              content: metaTags.get(key),
              setAttribute: () => {},
            } as unknown as HTMLMetaElement
          }
        }
        return null
      },
      createElement: () => {
        let currentContent = ''
        let currentAttr = ''
        return {
          setAttribute: (_attr: string, val: string) => {
            currentAttr = val
          },
          set content(val: string) {
            currentContent = val
            if (currentAttr) metaTags.set(currentAttr, val)
          },
          get content() {
            return currentContent
          },
          rel: '',
          href: '',
        } as unknown as HTMLElement
      },
      head: {
        appendChild: () => {},
      },
      getElementById: () => null,
    } as unknown as Document

    try {
      const cleanup = updatePageSeoMetadata(meta)

      expect(metaTags.get('og:image')).toBe('https://khelgrid.com/assets/kg-logo.webp')
      expect(metaTags.get('og:image:width')).toBe('1200')
      expect(metaTags.get('og:image:height')).toBe('630')
      expect(metaTags.get('twitter:card')).toBe('summary_large_image')
      expect(metaTags.get('twitter:site')).toBe('@KhelGrid')
      expect(metaTags.get('og:title')).toBe(meta.title)

      cleanup()
    } finally {
      globalThis.document = originalDocument
    }
  })
})
