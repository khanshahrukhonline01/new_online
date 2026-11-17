import { describe, expect, it } from 'vitest'
import {
  BASE_URL,
  VERIFIED_SPORTS,
  buildSitemapEntries,
  generateSitemapXml,
} from './sitemapGenerator'

describe('Google XML Sitemap & Scholar Indexing Engine', () => {
  it('generates well-formed XML conforming to Sitemap 0.9 specification', () => {
    const xml = generateSitemapXml()

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml.trim().endsWith('</urlset>')).toBe(true)
  })

  it('indexes all core discovery hubs with high crawl priority', () => {
    const entries = buildSitemapEntries()

    const home = entries.find(e => e.loc === `${BASE_URL}/`)
    expect(home).toBeDefined()
    expect(home?.priority).toBe(1.0)
    expect(home?.changefreq).toBe('daily')
    expect(home?.lastmod).toBeUndefined()

    // Search is a user-driven utility route, not a stable crawl landing page.
    expect(entries.some(e => e.loc === `${BASE_URL}/search`)).toBe(false)

    const play = entries.find(e => e.loc === `${BASE_URL}/play`)
    expect(play).toBeDefined()
    expect(play?.priority).toBe(0.95)

    const opportunities = entries.find(e => e.loc === `${BASE_URL}/opportunities`)
    expect(opportunities).toBeDefined()
    expect(opportunities?.priority).toBe(0.9)

    const talentScanner = entries.find(e => e.loc === `${BASE_URL}/talent-scanner`)
    expect(talentScanner).toBeDefined()
    expect(talentScanner?.priority).toBe(0.85)
  })

  it('does not index the live match centre until provider permissions and current data are confirmed', () => {
    const urls = buildSitemapEntries().map(entry => entry.loc)
    expect(urls).not.toContain(`${BASE_URL}/live`)
  })

  it('indexes all 34 verified sports directories with weekly freshness', () => {
    const entries = buildSitemapEntries()
    expect(VERIFIED_SPORTS).toHaveLength(34)

    for (const sport of VERIFIED_SPORTS) {
      const match = entries.find(e => e.loc === `${BASE_URL}/sports/${sport}`)
      expect(match).toBeDefined()
      expect(match?.changefreq).toBe('weekly')
      expect(match?.priority).toBe(0.8)
    }
  })

  it('indexes all 16 metro city sports complex hubs', () => {
    const entries = buildSitemapEntries()
    const expectedCities = [
      'delhi', 'mumbai', 'bengaluru', 'hyderabad', 'pune', 'kolkata',
      'chennai', 'ahmedabad', 'chandigarh', 'bhubaneswar', 'lucknow', 'jaipur',
      'bhopal', 'kochi', 'ranchi', 'dehradun',
    ]

    for (const city of expectedCities) {
      const match = entries.find(e => e.loc === `${BASE_URL}/city/${city}`)
      expect(match).toBeDefined()
      expect(match?.priority).toBe(0.8)
      expect(match?.changefreq).toBe('weekly')
    }
  })

  it('does not index curated academy or venue detail records without a published database snapshot', () => {
    const urls = buildSitemapEntries().map(entry => entry.loc)
    expect(urls).not.toContain(`${BASE_URL}/academies/bengaluru-fc-academy`)
    expect(urls).not.toContain(`${BASE_URL}/academies/pullela-gopichand-badminton-academy`)
    expect(urls).not.toContain(`${BASE_URL}/venues/sree-kanteerava-stadium`)
  })

  it('includes trial detail URLs only from the published-and-verified snapshot', () => {
    const entries = buildSitemapEntries({ opportunities: [{ slug: 'sample-verified-trial' }] })
    const urls = entries.map(entry => entry.loc)
    expect(urls).toContain(`${BASE_URL}/trial/sample-verified-trial`)
    expect(urls).not.toContain(`${BASE_URL}/opportunities/sample-verified-trial`)
    expect(urls).not.toContain(`${BASE_URL}/trials`)
  })

  it('does not add curated trial detail URLs without a database snapshot', () => {
    const urls = buildSitemapEntries().map(entry => entry.loc)
    expect(urls.some(url => url.includes('/trial/'))).toBe(false)
    expect(urls.some(url => url.includes('/opportunities/') && url !== `${BASE_URL}/opportunities`)).toBe(false)
  })
  it('indexes KhelChronicle repository, all 7 disciplines, preprints, and author profiles', () => {
    const entries = buildSitemapEntries()

    // 1. Repository Index & Intake
    expect(entries.find(e => e.loc === `${BASE_URL}/khelchronicle`)).toMatchObject({
      priority: 0.95,
      changefreq: 'daily',
    })
    // Submission is an intake workflow, not a public research record.
    expect(entries.some(e => e.loc === `${BASE_URL}/khelchronicle/submit`)).toBe(false)

    // 2. 7 Academic Disciplines
    const disciplines = [
      'sports-biomechanics',
      'exercise-physiology',
      'sports-nutrition',
      'sports-psychology',
      'sports-medicine',
      'sports-analytics',
      'sports-policy',
    ]
    for (const slug of disciplines) {
      const cat = entries.find(e => e.loc === `${BASE_URL}/khelchronicle/category/${slug}`)
      expect(cat).toBeDefined()
      expect(cat?.priority).toBe(0.85)
    }

    // 3. Preprints (Canonical URLs for Google Scholar & CrossRef)
    const bowlerPaper = entries.find(e =>
      e.loc === `${BASE_URL}/khelchronicle/kinematic-correlates-lumbar-spine-stress-fast-bowlers`
    )
    expect(bowlerPaper).toBeDefined()
    expect(bowlerPaper?.priority).toBe(0.85)
    expect(bowlerPaper?.lastmod).toBeTruthy()

    const fitnessPaper = entries.find(e =>
      e.loc === `${BASE_URL}/khelchronicle/normative-fitness-percentiles-grassroots-athletes-india`
    )
    expect(fitnessPaper).toBeDefined()
    expect(fitnessPaper?.priority).toBe(0.85)

    // 4. Research Scholar Profiles
    const rathore = entries.find(e =>
      e.loc === `${BASE_URL}/khelchronicle/author/dr-vikramaditya-rathore`
    )
    expect(rathore).toBeDefined()
    expect(rathore?.priority).toBe(0.75)

    // 5. Open Science & Research Ethics Policy
    const openSciencePolicy = entries.find(e => e.loc === `${BASE_URL}/open-science-policy`)
    expect(openSciencePolicy).toBeDefined()
    expect(openSciencePolicy?.priority).toBe(0.6)
    expect(openSciencePolicy?.changefreq).toBe('monthly')
  })

  it('contains expected metadata and date formatting on every entry', () => {
    const entries = buildSitemapEntries()
    expect(entries.length).toBeGreaterThanOrEqual(80)

    for (const entry of entries) {
      expect(entry.loc).toMatch(/^https:\/\/khelgrid\.com\//)
      if (entry.lastmod) expect(entry.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(['daily', 'weekly', 'monthly', 'hourly']).toContain(entry.changefreq)
      expect(entry.priority).toBeGreaterThanOrEqual(0.5)
      expect(entry.priority).toBeLessThanOrEqual(1.0)
    }
  })
})
