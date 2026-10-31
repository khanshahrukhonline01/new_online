import { describe, expect, it } from 'vitest'
import {
  BASE_URL,
  SITEMAP_LASTMOD,
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
    expect(home?.lastmod).toBe(SITEMAP_LASTMOD)

    const search = entries.find(e => e.loc === `${BASE_URL}/search`)
    expect(search).toBeDefined()
    expect(search?.priority).toBe(0.9)

    const opportunities = entries.find(e => e.loc === `${BASE_URL}/opportunities`)
    expect(opportunities).toBeDefined()
    expect(opportunities?.priority).toBe(0.9)

    const talentScanner = entries.find(e => e.loc === `${BASE_URL}/talent-scanner`)
    expect(talentScanner).toBeDefined()
    expect(talentScanner?.priority).toBe(0.85)
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

  it('indexes KhelChronicle repository, all 7 disciplines, preprints, and author profiles', () => {
    const entries = buildSitemapEntries()

    // 1. Repository Index & Intake
    expect(entries.find(e => e.loc === `${BASE_URL}/khelchronicle`)).toMatchObject({
      priority: 0.95,
      changefreq: 'daily',
    })
    expect(entries.find(e => e.loc === `${BASE_URL}/khelchronicle/submit`)).toMatchObject({
      priority: 0.85,
    })

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
  })

  it('contains expected metadata and date formatting on every entry', () => {
    const entries = buildSitemapEntries()
    expect(entries.length).toBeGreaterThanOrEqual(80)

    for (const entry of entries) {
      expect(entry.loc).toMatch(/^https:\/\/khelgrid\.com\//)
      expect(entry.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(['daily', 'weekly', 'monthly', 'hourly']).toContain(entry.changefreq)
      expect(entry.priority).toBeGreaterThanOrEqual(0.5)
      expect(entry.priority).toBeLessThanOrEqual(1.0)
    }
  })
})
