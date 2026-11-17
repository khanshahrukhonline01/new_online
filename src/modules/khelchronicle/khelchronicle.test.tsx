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
  generateRisCitation,
  searchPapers,
  getPaperBySlug,
  getPapersBySport,
  getRelatedPapers,
  RESEARCH_SPORTS,
} from './data/khelchronicleData'
import { AcademicDataChart } from './components/AcademicDataChart'

describe('KhelChronicle Open Sports Research Repository', () => {
  it('renders an empty, truthful research archive without synthetic public manuscripts', () => {
    const html = renderToStaticMarkup(<KhelChronicleHome />)
    expect(html).toContain('KhelChronicle · Open Sports Research Archive')
    expect(html).toContain('Open Research in Sports and Human Performance.')
    expect(html).toContain('Editorial screening required')
    expect(html).toContain('No reviewed public manuscripts are available yet')
    expect(html).toContain('application/ld+json')
    expect(html).toContain('"@type":"DataCatalog"')
    expect(html).toContain('Sports Biomechanics')
    expect(html).not.toContain('KG-2026-001')
    expect(html).not.toContain('4,800+')
    expect(html).not.toContain('Dr. Vikramaditya Rathore')
    expect(html).not.toContain('Diamond Open Access')
  })

    it('does not render a seeded manuscript before a reviewed database record is available', () => {
    const html = renderToStaticMarkup(
      <KhelChroniclePaperPage slug="kinematic-correlates-lumbar-spine-stress-fast-bowlers" />
    )
    expect(html).toContain('Checking manuscript publication status')
    expect(html).not.toContain('Dr. Vikramaditya Rathore')
    expect(html).not.toContain('KG-2026-001')
    expect(html).not.toContain('Lumbar bone stress injuries')
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

  it('renders discipline taxonomy without exposing seeded manuscripts', () => {
    const html = renderToStaticMarkup(
      <KhelChronicleCategoryPage categorySlug="sports-biomechanics" />
    )
    expect(html).toContain('Sports Biomechanics')
    expect(html).toContain('Checking approved public manuscripts')
    expect(html).not.toContain('KG-2026-001')
  })

    it('does not expose seeded researcher identities as public author profiles', () => {
    const html = renderToStaticMarkup(
      <KhelChronicleAuthorPage authorSlug="dr-vikramaditya-rathore" />
    )
    expect(html).toContain('Checking author record')
    expect(html).not.toContain('Dr. Vikramaditya Rathore')
    expect(html).not.toContain('0000-0002-8941-4412')
  })

    it('renders manuscript submission guidelines and intake form correctly', () => {
    const html = renderToStaticMarkup(<KhelChronicleSubmitPage />)

    expect(html).toContain('Submit Research Manuscript')
    expect(html).toContain('Editorial Screening &amp; Moderation Criteria')
    expect(html).toContain('Human Subjects &amp; Minor Athletes Protection')
    expect(html).toContain('Manuscript Title *')
    expect(html).toContain('Primary Research Discipline *')
  })

  it('does not publish a seeded paper through the global research wire', () => {
    const html = renderToStaticMarkup(<KhelChronicleDispatchStrip />)
    expect(html).toBe('')
    expect(html).not.toContain('KG-2026-001')
  })

    it('filters and searches research papers accurately', () => {
    const yoYoResults = searchPapers('Yo-Yo')
    expect(yoYoResults.length).toBeGreaterThanOrEqual(1)
    expect(yoYoResults[0].paperId).toBe('KG-2026-002')

    const categoryResults = searchPapers('', 'sports-medicine')
    expect(categoryResults.length).toBeGreaterThanOrEqual(2)
    expect(categoryResults.some(p => p.paperId === 'KG-2026-003')).toBe(true)
    expect(categoryResults.some(p => p.paperId === 'KG-2026-007')).toBe(true)

    const emptyResults = searchPapers('nonexistentquery12345')
    expect(emptyResults.length).toBe(0)
  })

  it('retrieves and validates authored preprints KG-2026-006 and KG-2026-007', () => {
    // KG-2026-006: Altitude conditioning
    const altitudePaper = getPaperBySlug('high-altitude-hypoxic-conditioning-himalayan-runners')
    expect(altitudePaper).toBeDefined()
    expect(altitudePaper?.paperId).toBe('KG-2026-006')
    expect(altitudePaper?.category).toBe('exercise-physiology')
    expect(altitudePaper?.authors.some(a => a.name === 'Dr. Tenzing Norbu')).toBe(true)
    expect(altitudePaper?.sections.some(s => s.tableData?.caption?.includes('Table 6'))).toBe(true)

    // KG-2026-007: Kabaddi injury epidemiology
    const kabaddiPaper = getPaperBySlug('injury-epidemiology-match-congestion-kabaddi')
    expect(kabaddiPaper).toBeDefined()
    expect(kabaddiPaper?.paperId).toBe('KG-2026-007')
    expect(kabaddiPaper?.category).toBe('sports-medicine')
    expect(kabaddiPaper?.authors.some(a => a.name === 'Dr. Sunita Malik')).toBe(true)
    expect(kabaddiPaper?.sections.some(s => s.tableData?.caption?.includes('Table 7'))).toBe(true)

    // Search query matches for new papers
    const altitudeSearch = searchPapers('Shillaroo')
    expect(altitudeSearch.some(p => p.paperId === 'KG-2026-006')).toBe(true)

    const kabaddiSearch = searchPapers('EVA mats')
    expect(kabaddiSearch.some(p => p.paperId === 'KG-2026-007')).toBe(true)
  })

  it('renders interactive SVG academic data charts from empirical table datasets', () => {
    const testTable = {
      caption: 'Table 6: Hematological and Physiological Markers',
      headers: ['Cohort', 'Total Hbmass (g/kg)', 'VO2max (mL/kg/min)'],
      rows: [
        ['LHTL Baseline', '11.8 ± 0.9', '66.4 ± 4.2'],
        ['LHTL Week 6', '12.6 ± 0.8', '64.5 ± 4.1'],
        ['LHTL Post-Descent', '12.5 ± 0.8', '69.3 ± 4.0'],
        ['Control Post-6W', '11.9 ± 0.9', '66.8 ± 4.1'],
      ],
    }

    const html = renderToStaticMarkup(<AcademicDataChart tableData={testTable} />)

    expect(html).toContain('kc-academic-chart-box')
    expect(html).toContain('Table 6: Hematological and Physiological Markers')
    expect(html).toContain('Total Hbmass (g/kg)')
    expect(html).toContain('VO2max (mL/kg/min)')
    expect(html).toContain('kc-academic-svg')
    expect(html).toContain('LHTL Baseline')
    expect(html).toContain('LHTL Post-Descent')
    expect(html).toContain('11.8')
  })

  it('filters research repository by sport and renders sport badges and filters', () => {
    // 0. Sport filters catalogue
    expect(RESEARCH_SPORTS.length).toBeGreaterThanOrEqual(4)

    // 1. Sport filter functions
    const cricketPapers = getPapersBySport('cricket')
    expect(cricketPapers.length).toBeGreaterThanOrEqual(2)
    expect(cricketPapers.every(p => p.sportSlug === 'cricket')).toBe(true)

    const kabaddiPapers = getPapersBySport('kabaddi')
    expect(kabaddiPapers.length).toBe(1)
    expect(kabaddiPapers[0].paperId).toBe('KG-2026-007')

    const athleticsPapers = searchPapers('', 'all', 'athletics')
    expect(athleticsPapers.length).toBe(1)
    expect(athleticsPapers[0].paperId).toBe('KG-2026-006')

    // 2. Homepage sport filter strip
    const homeHtml = renderToStaticMarkup(<KhelChronicleHome />)
    expect(homeHtml).toContain('Sport Filter:')
    expect(homeHtml).toContain('Cricket')
    expect(homeHtml).toContain('Athletics &amp; Running')
    expect(homeHtml).toContain('Kabaddi')
    expect(homeHtml).toContain('Multi-Sport &amp; Grassroots')
    expect(homeHtml).toContain('kc-sport-pill')
    expect(homeHtml).toContain('kc-paper-sport-tag')
  })

  it('supports branded academic PDF export, print-only journal header, and RIS citations', () => {
    const paper = getPaperBySlug('KG-2026-001')!
    expect(paper).toBeDefined()

    // 1. RIS citation generation
    const ris = generateRisCitation(paper)
    expect(ris).toContain('TY  - JOUR')
    expect(ris).toContain(`TI  - ${paper.title}`)
    expect(ris).toContain(`IS  - ${paper.paperId}`)
    expect(ris).toContain('JO  - KhelChronicle Open Sports Research Archive')
    expect(ris).toContain('ER  - ')

    // 2. Paper reader page contains print-only academic header & table-chart view switcher
    const pageHtml = renderToStaticMarkup(<KhelChroniclePaperPage slug="KG-2026-001" />)
    expect(pageHtml).toContain('kc-print-only-header')
    expect(pageHtml).toContain('KHELCHRONICLE OPEN SPORTS RESEARCH ARCHIVE')
    expect(pageHtml).toContain('Preprint Accession:')
    expect(pageHtml).toContain('kc-chart-switcher')
    expect(pageHtml).toContain('Academic Table')
    expect(pageHtml).toContain('Interactive Chart')
    expect(pageHtml).toContain('Related Preprints in Cricket')

    // 3. Related papers resolution
    const related = getRelatedPapers(paper, 3)
    expect(related.length).toBeGreaterThanOrEqual(1)
    expect(related.every(r => r.paperId !== paper.paperId)).toBe(true)
  })
})
