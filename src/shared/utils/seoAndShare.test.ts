import { describe, expect, it } from 'vitest'
import { getRouteSeoMetadata } from './seoAndShare'

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
    expect(liveScoresMeta.keywords).toContain('live cricket score wpl')
    expect(liveScoresMeta.keywords).toContain('live cricket score icc')

    const chronicleMeta = getRouteSeoMetadata('/khelchronicle')
    expect(chronicleMeta.keywords).toContain('sports science research india')
    expect(chronicleMeta.keywords).toContain('cricket biomechanics')
  })

  it('provides structured Schema.org JSON-LD data for discovery on major routes', () => {
    const homeMeta = getRouteSeoMetadata('/')
    expect(homeMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(homeMeta.jsonLd)).toContain('SearchAction')

    const sportsCvMeta = getRouteSeoMetadata('/sports-cv')
    expect(sportsCvMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(sportsCvMeta.jsonLd)).toContain('WebApplication')
    expect(JSON.stringify(sportsCvMeta.jsonLd)).toContain('Athlete Sports CV & Khel ID Builder')

    const venuesMeta = getRouteSeoMetadata('/venues')
    expect(venuesMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(venuesMeta.jsonLd)).toContain('Service')

    const chronicleMeta = getRouteSeoMetadata('/khelchronicle')
    expect(chronicleMeta.jsonLd).toBeDefined()
    expect(JSON.stringify(chronicleMeta.jsonLd)).toContain('DataCatalog')
  })
})
