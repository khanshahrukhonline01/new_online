import {
  RESEARCH_AUTHORS,
  RESEARCH_CATEGORIES,
  RESEARCH_PAPERS,
} from '../modules/khelchronicle/data/khelchronicleData.ts'
import { TOP_CITY_SPORTS_COMPLEXES } from './components/cityComplexesData.ts'
import { CURATED_ACADEMIES, CURATED_VENUES } from './data/curatedEntitiesData.ts'

export const BASE_URL = 'https://khelgrid.com'

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

export interface PublishedSitemapCatalogues {
  opportunities?: Array<{ slug: string }>
  venues?: Array<{ slug: string }>
  academies?: Array<{ slug: string }>
}

export function buildSitemapEntries(catalogues: PublishedSitemapCatalogues = {}): SitemapEntry[] {
  const entries: SitemapEntry[] = []

  // 1. Core Primary Hubs
  entries.push(
    { loc: `${BASE_URL}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${BASE_URL}/play`, changefreq: 'daily', priority: 0.95 },
    { loc: `${BASE_URL}/sports`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/opportunities`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/venues`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/academies`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/coaches`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/events`, changefreq: 'daily', priority: 0.9 },
    { loc: `${BASE_URL}/cities`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/talent-scanner`, changefreq: 'weekly', priority: 0.85 },
    { loc: `${BASE_URL}/sports-cv`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/learning-hub`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/guides`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/ai-guide`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${BASE_URL}/community`, changefreq: 'daily', priority: 0.8 },
    { loc: `${BASE_URL}/tools`, changefreq: 'weekly', priority: 0.8 },
  )

  // 2. All 22 Sports Directories
  for (const sport of VERIFIED_SPORTS) {
    entries.push({
      loc: `${BASE_URL}/sports/${sport}`,
      changefreq: 'weekly',
      priority: 0.8,
    })
  }

  // 3. All 16 Metro City Complex Hubs
  for (const city of TOP_CITY_SPORTS_COMPLEXES) {
    entries.push({
      loc: `${BASE_URL}${city.href}`,
      changefreq: 'weekly',
      priority: 0.8,
    })
  }

  // Detail URLs are supplied only from the read-only published + verified
  // Supabase catalogue snapshot by scripts/generate-sitemap.mjs.
  // Never add seed/demo/curated records to the public sitemap by default.

  for (const opportunity of catalogues.opportunities ?? []) {
    if (opportunity.slug) entries.push({
      loc: `${BASE_URL}/trial/${encodeURIComponent(opportunity.slug)}`,
      changefreq: 'weekly',
      priority: 0.85,
    })
  }
  for (const venue of catalogues.venues ?? []) {
    if (venue.slug) entries.push({
      loc: `${BASE_URL}/venues/${encodeURIComponent(venue.slug)}`,
      changefreq: 'weekly',
      priority: 0.75,
    })
  }
  for (const academy of catalogues.academies ?? []) {
    if (academy.slug) entries.push({
      loc: `${BASE_URL}/academies/${encodeURIComponent(academy.slug)}`,
      changefreq: 'weekly',
      priority: 0.75,
    })
  }

  // 5. KhelChronicle Open Sports Research Repository
  entries.push(
    { loc: `${BASE_URL}/khelchronicle`, changefreq: 'daily', priority: 0.95 },
  )

  // 5. KhelChronicle Categories (7 disciplines)
  for (const cat of RESEARCH_CATEGORIES) {
    entries.push({
      loc: `${BASE_URL}/khelchronicle/category/${cat.slug}`,
      changefreq: 'weekly',
      priority: 0.85,
    })
  }

  // 6. KhelChronicle Preprints (Canonical URLs for Google Scholar & Knowledge Graph)
  for (const paper of RESEARCH_PAPERS) {
    entries.push({
      loc: `${BASE_URL}/khelchronicle/${paper.slug}`,
      ...(paper.dateModified || paper.datePublished ? { lastmod: paper.dateModified || paper.datePublished } : {}),
      changefreq: 'monthly',
      priority: 0.85,
    })
  }

  // 7. KhelChronicle Author Profiles
  for (const author of Object.values(RESEARCH_AUTHORS)) {
    entries.push({
      loc: `${BASE_URL}/khelchronicle/author/${author.slug}`,
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
    '/open-science-policy',
    '/ipr-policy',
    '/contact',
  ]
  for (const policy of policies) {
    entries.push({
      loc: `${BASE_URL}${policy}`,
      changefreq: 'monthly',
      priority: 0.6,
    })
  }

  return entries
}

export function generateSitemapXml(catalogues: PublishedSitemapCatalogues = {}): string {
  const entries = buildSitemapEntries(catalogues)
  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      e => `  <url>
    <loc>${e.loc}</loc>
    ${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>\n    ` : ''}<changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(2)}</priority>
  </url>`,
    ),
    '</urlset>',
    '',
  ]
  return xmlLines.join('\n')
}
