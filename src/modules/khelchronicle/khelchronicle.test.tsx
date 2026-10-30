import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { KhelChronicleHome } from './KhelChronicleHome'
import { KhelChroniclePaperPage } from './KhelChroniclePaperPage'
import { KhelChronicleCategoryPage } from './KhelChronicleCategoryPage'
import { KhelChronicleAuthorPage } from './KhelChronicleAuthorPage'
import { KhelChronicleSubmitPage } from './KhelChronicleSubmitPage'
import { KhelChronicleDispatchStrip } from './KhelChronicleDispatchStrip'
import {
  generateCitations,
  searchPapers,
  getPaperBySlug,
} from './data/khelchronicleData'

describe('KhelChronicle Open Sports Research Repository', () => {
  it('renders KhelChronicle repository homepage with search, categories, and Schema.org DataCatalog', () => {
    const html = renderToStaticMarkup(<KhelChronicleHome />)

    // Heading and Brand Positioning
    expect(html).toContain('KhelChronicle · Open Sports Research Archive')
    expect(html).toContain('Open Research in Sports and Human Performance.')
    expect(html).toContain('Diamond Open Access')
    expect(html).toContain('CC BY-NC-ND 4.0')

    // Schema.org Structured Data
    expect(html).toContain('application/ld+json')
    expect(html).toContain('https://schema.org')
    expect(html).toContain('"@type":"DataCatalog"')

    // Category disciplines
    expect(html).toContain('Sports Biomechanics')
    expect(html).toContain('Exercise Physiology')
    expect(html).toContain('Sports Nutrition')
    expect(html).toContain('Sports Psychology')
    expect(html).toContain('Sports Medicine')
    expect(html).toContain('Sports Analytics')
    expect(html).toContain('Sports Development and Policy')

    // Featured paper preview
    expect(html).toContain('KG-2026-001')
    expect(html).toContain('Kinematic Correlates of Lumbar Spine Stress')
    expect(html).toContain('Dr. Vikramaditya Rathore')
  })

  it('renders test research article KG-2026-001 with full academic layout, tables, and ScholarlyArticle schema', () => {
    const html = renderToStaticMarkup(
      <KhelChroniclePaperPage slug="kinematic-correlates-lumbar-spine-stress-fast-bowlers" />
    )

    // Preprint status banner
    expect(html).toContain('KhelChronicle Open Research Preprint')
    expect(html).toContain('not yet been certified by formal peer review')

    // Paper Metadata & Identifiers
    expect(html).toContain('KG-2026-001')
    expect(html).toContain('v1.1')
    expect(html).toContain('Sports Biomechanics')
    expect(html).toContain('Kinematic Correlates of Lumbar Spine Stress and Ball Release Velocity in Indian Junior Fast Bowlers')

    // Authors and ORCID
    expect(html).toContain('Dr. Vikramaditya Rathore')
    expect(html).toContain('National Institute of Sports (NIS), Patiala')
    expect(html).toContain('0000-0002-8941-4412')
    expect(html).toContain('Dr. Alok Sen')
    expect(html).toContain('KhelGrid Sports Biomechanics &amp; Human Performance Lab')

    // Structured Abstract
    expect(html).toContain('Background:')
    expect(html).toContain('Methods:')
    expect(html).toContain('Results:')
    expect(html).toContain('Conclusion:')
    expect(html).toContain('Lumbar bone stress injuries (LBSIs) account for over 35%')

    // Academic Tables & Findings
    expect(html).toContain('Table 1: Cohort Demographic and Physical Parameters (N = 85)')
    expect(html).toContain('Peak Vertical GRF at FFC (BW)')
    expect(html).toContain('Primary Biomechanical Finding')

    // Ethics, Data Availability & References
    expect(html).toContain('Ethics &amp; Consent Statement:')
    expect(html).toContain('Institutional Ethics Committee for Human Subject Research at NIS Patiala')
    expect(html).toContain('Data Availability:')
    expect(html).toContain('KG-DATA-2026-001')
    expect(html).toContain('References')
    expect(html).toContain('Bartlett, R. M.')

    // Connected KhelGrid platform tools
    expect(html).toContain('Operationalize This Research on KhelGrid')
    expect(html).toContain('/talent-scanner')

    // Schema.org ScholarlyArticle JSON-LD
    expect(html).toContain('"@type":"ScholarlyArticle"')
  })

  it('generates valid academic citations across APA, BibTeX, MLA, Chicago, and Vancouver formats', () => {
    const paper = getPaperBySlug('KG-2026-001')!
    expect(paper).toBeDefined()

    const citations = generateCitations(paper)
    expect(citations.apa).toContain('Rathore, V., & Sen, A. (2026). Kinematic Correlates of Lumbar Spine Stress')
    expect(citations.apa).toContain('KG-2026-001')

    expect(citations.bibtex).toContain('@article{KG2026001_2026')
    expect(citations.bibtex).toContain('author    = {Dr. Vikramaditya Rathore and Dr. Alok Sen}')
    expect(citations.bibtex).toContain('journal   = {KhelChronicle Open Sports Research Archive}')

    expect(citations.mla).toContain('KhelChronicle Open Sports Research Archive')
    expect(citations.chicago).toContain('Kinematic Correlates of Lumbar Spine Stress')
    expect(citations.vancouver).toContain('KhelChronicle Open Sports Res Arch')
  })

  it('renders discipline category page correctly', () => {
    const html = renderToStaticMarkup(
      <KhelChronicleCategoryPage categorySlug="sports-biomechanics" />
    )

    expect(html).toContain('Sports Biomechanics')
    expect(html).toContain('Kinematics, inverse dynamics, ground reaction forces')
    expect(html).toContain('KG-2026-001')
  })

  it('renders author profile and bibliography page correctly', () => {
    const html = renderToStaticMarkup(
      <KhelChronicleAuthorPage authorSlug="dr-vikramaditya-rathore" />
    )

    expect(html).toContain('Dr. Vikramaditya Rathore')
    expect(html).toContain('Senior Biomechanist &amp; Movement Consultant')
    expect(html).toContain('National Institute of Sports (NIS), Patiala')
    expect(html).toContain('0000-0002-8941-4412')
    expect(html).toContain('Kinematic Correlates of Lumbar Spine Stress')
  })

  it('renders manuscript submission guidelines and intake form correctly', () => {
    const html = renderToStaticMarkup(<KhelChronicleSubmitPage />)

    expect(html).toContain('Submit Research Manuscript')
    expect(html).toContain('Editorial Screening &amp; Moderation Criteria')
    expect(html).toContain('Human Subjects &amp; Minor Athletes Protection')
    expect(html).toContain('Manuscript Title *')
    expect(html).toContain('Primary Research Discipline *')
  })

  it('renders global KhelChronicle research wire dispatch strip above footer', () => {
    const html = renderToStaticMarkup(<KhelChronicleDispatchStrip />)

    expect(html).toContain('KhelChronicle Research Wire')
    expect(html).toContain('KG-2026-001')
    expect(html).toContain('Kinematic Correlates of Lumbar Spine Stress and Ball Release Velocity in Indian Junior Fast Bowlers')
    expect(html).toContain('Explore Archive (5 Papers)')
  })

  it('filters and searches research papers accurately', () => {
    const yoYoResults = searchPapers('Yo-Yo')
    expect(yoYoResults.length).toBeGreaterThanOrEqual(1)
    expect(yoYoResults[0].paperId).toBe('KG-2026-002')

    const categoryResults = searchPapers('', 'sports-medicine')
    expect(categoryResults.length).toBeGreaterThanOrEqual(1)
    expect(categoryResults[0].paperId).toBe('KG-2026-003')

    const emptyResults = searchPapers('nonexistentquery12345')
    expect(emptyResults.length).toBe(0)
  })
})
