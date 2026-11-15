import { describe, expect, it } from 'vitest'
import { buildSitemapEntries, generateSitemapXml } from './sitemapGenerator'

describe('SEO sitemap eligibility', () => {
  it('includes only canonical hub URLs, not known aliases or noindex live scores', () => {
    const urls = buildSitemapEntries().map(entry => entry.loc)
    expect(urls).toContain('https://khelgrid.com/opportunities')
    expect(urls).toContain('https://khelgrid.com/venues')
    expect(urls).toContain('https://khelgrid.com/academies')
    expect(urls).not.toContain('https://khelgrid.com/trials')
    expect(urls).not.toContain('https://khelgrid.com/book')
    expect(urls).not.toContain('https://khelgrid.com/train')
    expect(urls).not.toContain('https://khelgrid.com/live')
    expect(urls).not.toContain('https://khelgrid.com/search')
  })

  it('adds trial, venue and academy details only from supplied verified-public catalogue rows', () => {
    const entries = buildSitemapEntries({
      opportunities: [{ slug: 't-aiu-wushu-inter-university-trials-2026' }],
      venues: [{ slug: 'verified-venue' }],
      academies: [{ slug: 'verified-academy' }],
    })
    const urls = entries.map(entry => entry.loc)
    expect(urls).toContain('https://khelgrid.com/trial/t-aiu-wushu-inter-university-trials-2026')
    expect(urls).toContain('https://khelgrid.com/venues/verified-venue')
    expect(urls).toContain('https://khelgrid.com/academies/verified-academy')
  })

  it('does not add curated/demo detail records when no catalogue snapshot is supplied', () => {
    const urls = buildSitemapEntries().map(entry => entry.loc)
    expect(urls.some(url => url.includes('/venues/') && url !== 'https://khelgrid.com/venues')).toBe(false)
    expect(urls.some(url => url.includes('/academies/') && url !== 'https://khelgrid.com/academies')).toBe(false)
  })

  it('does not invent last-modified dates for pages without source timestamps', () => {
    const xml = generateSitemapXml()
    expect(xml).not.toContain('<lastmod>2026-10-30</lastmod>')
  })
})
