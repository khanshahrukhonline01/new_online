import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateChronicleRssXml } from '../src/shared/feedGenerator.ts'
import { RESEARCH_PAPERS } from '../src/modules/khelchronicle/data/khelchronicleData.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const targetDir = path.resolve(rootDir, 'public', 'khelchronicle')
const publicFeed = path.resolve(targetDir, 'feed.xml')

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

const xml = generateChronicleRssXml()
fs.writeFileSync(publicFeed, xml, 'utf8')
console.log(`Successfully generated ${publicFeed} with ${RESEARCH_PAPERS.length} preprints.`)
