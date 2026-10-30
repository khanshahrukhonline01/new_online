import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateSitemapXml, buildSitemapEntries } from '../src/shared/sitemapGenerator.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicSitemap = path.resolve(rootDir, 'public', 'sitemap.xml')

const xml = generateSitemapXml()
fs.writeFileSync(publicSitemap, xml, 'utf8')
console.log(`Successfully generated ${publicSitemap} with ${buildSitemapEntries().length} URLs.`)
