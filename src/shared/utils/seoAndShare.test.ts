import { describe, expect, it } from 'vitest'
import { getRouteSeoMetadata } from './seoAndShare'

describe('SEO metadata accuracy and indexability', () => {
  it('marks the moderator control panel as non-indexable', () => {
    const metadata = getRouteSeoMetadata('/admin/control')
    expect(metadata.robots).toBe('noindex, nofollow, noarchive')
    expect(metadata.canonicalUrl).toBe('https://khelgrid.com/admin/control')
  })

  it('keeps the published opportunity catalogue indexable with accurate copy', () => {
    const metadata = getRouteSeoMetadata('/opportunities')
    expect(metadata.robots).toBeUndefined()
    expect(metadata.canonicalUrl).toBe('https://khelgrid.com/opportunities')
    expect(metadata.description).toContain('Check each listing')
    expect(metadata.description).not.toContain('SAI NCOE selections')
  })

  it('does not describe venue discovery as a completed booking service', () => {
    const metadata = getRouteSeoMetadata('/venues')
    expect(metadata.description).toContain('Confirm access, pricing and availability')
    expect(metadata.description).not.toContain('hourly slots')
  })

  it('does not claim all academy listings are verified', () => {
    const metadata = getRouteSeoMetadata('/academies')
    expect(metadata.description).toContain('published sports academy')
    expect(metadata.description).not.toContain('verified sports academies')
  })

  it('keeps live scores out of the index until current match feeds are connected', () => {
    const metadata = getRouteSeoMetadata('/live-scores')
    expect(metadata.robots).toBe('noindex, follow')
    expect(metadata.description).toContain('connected, current match-data source')
  })

  it('describes Sports CV as athlete-entered rather than independently verified', () => {
    const metadata = getRouteSeoMetadata('/sports-cv')
    expect(metadata.description).toContain('not an independently verified credential')
    expect(metadata.title).not.toContain('Verified Profile')
  })
})
