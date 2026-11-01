import {
  RESEARCH_AUTHORS,
  RESEARCH_CATEGORIES,
  RESEARCH_PAPERS,
} from '../modules/khelchronicle/data/khelchronicleData.ts'
import { TOP_CITY_SPORTS_COMPLEXES } from './components/cityComplexesData.ts'
import { CURATED_ACADEMIES, CURATED_VENUES } from './data/curatedEntitiesData.ts'

export const BASE_URL = 'https://khelgrid.com'
export const SITEMAP_LASTMOD = '2026-10-30'

export const VERIFIED_SPORTS = [
  'archery',
  'athletics',
  'badminton',
  'basketball',
  'boxing',
  'chess',
  'cricket',
  'cycling',
  'equestrian',
  'fencing',
  'football',
  'futsal',
  'golf',
  'gymnastics',
  'handball',
  'hockey',
  'judo',
  'kabaddi',
  'karate',
  'martial-arts',
  'pickleball',
  'rowing',
  'rugby',
  'shooting',
  'skating',
  'squash',
  'swimming',
  'table-tennis',
  'taekwondo',
  'tennis',
  'volleyball',
  'weightlifting',
  'wrestling',
  'yoga',
] as const

export interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export function buildSitemapEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = []

  // 1. Core Primary Hubs
  entries.push(
    { loc: `${BASE_URL}/`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 1.0 },
    { loc: `${BASE_URL}/play`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.95 },
    { loc: `${BASE_URL}/sports`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/opportunities`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/trials`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/venues`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/book`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/academies`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/train`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/coaches`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/events`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/tournaments`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/search`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/cities`, lastmod: SITEMAP_LASTMOD, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/talent-scanner`, lastmod: SITEMAP_LASTMOD, changefreq: 'weekly', priority: 0.85 },
    { loc: `${BASE_URL}/sports-cv`, lastmod: SITEMAP_LASTMOD, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/live`, lastmod: SITEMAP_LASTMOD, changefreq: 'hourly', priority: 0.9 },
    { loc: `${BASE_URL}/learning-hub`, lastmod: SITEMAP_LASTMOD, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/guides`, lastmod: SITEMAP_LASTMOD, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/ai-guide`, lastmod: SITEMAP_LASTMOD, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/community`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.8 },
    { loc: `${BASE_URL}/tools`, lastmod: SITEMAP_LASTMOD, changefreq: 'weekly', priority: 0.8 },
  )

  // 2. All 22 Sports Directories
  for (const sport of VERIFIED_SPORTS) {
    entries.push({
      loc: `${BASE_URL}/sports/${sport}`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'weekly',
      priority: 0.8,
    })
  }

  // 3. All 16 Metro City Complex Hubs
  for (const city of TOP_CITY_SPORTS_COMPLEXES) {
    entries.push({
      loc: `${BASE_URL}${city.href}`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'weekly',
      priority: 0.8,
    })
  }

  // 4. Curated Academies & Venues Detail Pages
  for (const academy of CURATED_ACADEMIES) {
    if (academy.slug) {
      entries.push({
        loc: `${BASE_URL}/academies/${academy.slug}`,
        lastmod: SITEMAP_LASTMOD,
        changefreq: 'weekly',
        priority: 0.85,
      })
    }
  }

  for (const venue of CURATED_VENUES) {
    if (venue.slug) {
      entries.push({
        loc: `${BASE_URL}/venues/${venue.slug}`,
        lastmod: SITEMAP_LASTMOD,
        changefreq: 'weekly',
        priority: 0.85,
      })
    }
  }

  // 5. KhelChronicle Open Sports Research Repository
  entries.push(
    { loc: `${BASE_URL}/khelchronicle`, lastmod: SITEMAP_LASTMOD, changefreq: 'daily', priority: 0.95 },
    { loc: `${BASE_URL}/khelchronicle/submit`, lastmod: SITEMAP_LASTMOD, changefreq: 'monthly', priority: 0.85 },
  )

  // 5. KhelChronicle Categories (7 disciplines)
  for (const cat of RESEARCH_CATEGORIES) {
    entries.push({
      loc: `${BASE_URL}/khelchronicle/category/${cat.slug}`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'weekly',
      priority: 0.85,
    })
  }

  // 6. KhelChronicle Preprints (Canonical URLs for Google Scholar & Knowledge Graph)
  for (const paper of RESEARCH_PAPERS) {
    entries.push({
      loc: `${BASE_URL}/khelchronicle/${paper.slug}`,
      lastmod: paper.dateModified || paper.datePublished || SITEMAP_LASTMOD,
      changefreq: 'monthly',
      priority: 0.85,
    })
  }

  // 7. KhelChronicle Author Profiles
  for (const author of Object.values(RESEARCH_AUTHORS)) {
    entries.push({
      loc: `${BASE_URL}/khelchronicle/author/${author.slug}`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'monthly',
      priority: 0.75,
    })
  }

  // 8. Trust, Editorial & Policies
  const policies = [
    '/about',
    '/trust',
    '/privacy',
    '/terms',
    '/editorial-policy',
    '/ipr-policy',
    '/contact',
  ]
  for (const policy of policies) {
    entries.push({
      loc: `${BASE_URL}${policy}`,
      lastmod: SITEMAP_LASTMOD,
      changefreq: 'monthly',
      priority: 0.6,
    })
  }

  return entries
}

export function generateSitemapXml(): string {
  const entries = buildSitemapEntries()
  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      e => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod || SITEMAP_LASTMOD}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(2)}</priority>
  </url>`,
    ),
    '</urlset>',
    '',
  ]
  return xmlLines.join('\n')
}
