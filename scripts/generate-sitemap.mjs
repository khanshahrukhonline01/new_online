import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateSitemapXml, buildSitemapEntries } from '../src/shared/sitemapGenerator.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicSitemap = path.resolve(rootDir, 'public', 'sitemap.xml')

async function fetchPublishedVerifiedSlugs(table) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    console.warn(`Skipping dynamic ${table} sitemap URLs: Supabase build variables are not configured.`)
    return []
  }

  const endpoint = new URL(`${supabaseUrl}/rest/v1/${table}`)
  endpoint.search = new URLSearchParams({
    select: 'slug',
    publication_status: 'eq.published',
    verification_status: 'eq.verified',
    order: 'slug.asc',
    limit: '5000',
  }).toString()

  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
        Range: '0-4999',
      },
    })
    if (!response.ok) {
      console.warn(`Skipping dynamic ${table} sitemap URLs: Supabase returned HTTP ${response.status}.`)
      return []
    }

    const rows = await response.json()
    if (!Array.isArray(rows)) return []
    return rows.filter(row => typeof row.slug === 'string' && row.slug.length > 0)
  } catch (error) {
    console.warn(`Skipping dynamic ${table} sitemap URLs: catalogue fetch failed.`, error)
    return []
  }
}

const [opportunities, venues, academies] = await Promise.all([
  fetchPublishedVerifiedSlugs('opportunities'),
  fetchPublishedVerifiedSlugs('venues'),
  fetchPublishedVerifiedSlugs('academies'),
])
const catalogues = { opportunities, venues, academies }
const xml = generateSitemapXml(catalogues)
fs.writeFileSync(publicSitemap, xml, 'utf8')
console.log(`Successfully generated ${publicSitemap} with ${buildSitemapEntries(catalogues).length} URLs.`)
