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
  filterAndSortPapers,
  getPaperBySlug,
  getPapersBySport,
  getRelatedPapers,
  RESEARCH_SPORTS,
  RESEARCH_METHODOLOGIES,
} from './data/khelchronicleData'
import {
  getChroniclePaperComments,
  addChroniclePaperComment,
  voteChronicleCommentHelpful,
} from '../../integrations/supabase/chronicle-client'
import { AcademicDataChart } from './components/AcademicDataChart'
import { NormativeBenchmarkCalculator } from './components/NormativeBenchmarkCalculator'

describe('KhelChronicle Open Sports Research Repository', () => {
  it('renders KhelChronicle repository homepage with search, categories, and Schema.org DataCatalog', () => {
    const html = renderToStaticMarkup(<KhelChronicleHome />)

    // Heading and Brand Positioning
    expect(html).toContain('KhelChronicle · Open Sports Research Archive')
    expect(html).toContain('Open Research in Sports and Human Performance.')
    expect(html).toContain('Diamond Open Access')
    expect(html).toContain('CC BY 4.0')

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
    expect(html).toContain('Explore Archive (7 Papers)')
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

  it('filters and sorts research papers across study methodology, charts, benchmarks, and citations', () => {
    // 1. Methodology catalogue
    expect(RESEARCH_METHODOLOGIES.length).toBeGreaterThanOrEqual(5)

    // 2. Filter by methodology
    const fieldTrialPapers = filterAndSortPapers({ methodology: 'field-trial' })
    expect(fieldTrialPapers.length).toBeGreaterThanOrEqual(2)
    expect(fieldTrialPapers.some(p => p.paperId === 'KG-2026-002')).toBe(true)
    expect(fieldTrialPapers.some(p => p.paperId === 'KG-2026-006')).toBe(true)

    const epidemiologyPapers = filterAndSortPapers({ methodology: 'epidemiology' })
    expect(epidemiologyPapers.length).toBe(1)
    expect(epidemiologyPapers[0].paperId).toBe('KG-2026-007')

    const mlPapers = filterAndSortPapers({ methodology: 'ml-analytics' })
    expect(mlPapers.length).toBe(1)
    expect(mlPapers[0].paperId).toBe('KG-2026-004')

    // 3. Filter by interactive chart availability
    const chartPapers = filterAndSortPapers({ hasChartOnly: true })
    expect(chartPapers.length).toBeGreaterThanOrEqual(4)
    expect(chartPapers.every(p => p.hasInteractiveChart)).toBe(true)

    // 4. Filter by normative benchmarks
    const benchmarkPapers = filterAndSortPapers({ hasBenchmarksOnly: true })
    expect(benchmarkPapers.length).toBeGreaterThanOrEqual(3)
    expect(benchmarkPapers.every(p => p.hasNormativeBenchmarks)).toBe(true)

    // 5. Sort by citations (descending)
    const sortedByCitations = filterAndSortPapers({ sort: 'citations' })
    expect(sortedByCitations[0].metrics.citations).toBeGreaterThanOrEqual(sortedByCitations[1].metrics.citations)
    expect(sortedByCitations[1].metrics.citations).toBeGreaterThanOrEqual(sortedByCitations[2].metrics.citations)

    // 6. Sort by downloads (descending)
    const sortedByDownloads = filterAndSortPapers({ sort: 'downloads' })
    expect(sortedByDownloads[0].metrics.downloads).toBeGreaterThanOrEqual(sortedByDownloads[1].metrics.downloads)

    // 7. Sort by shortest reading time (ascending)
    const sortedByReadingTime = filterAndSortPapers({ sort: 'reading_time' })
    expect(sortedByReadingTime[0].readingTimeMinutes).toBeLessThanOrEqual(sortedByReadingTime[sortedByReadingTime.length - 1].readingTimeMinutes)
  })

  it('renders methodology pills, empirical feature toggles, sort controls, and trending keywords on homepage', () => {
    const homeHtml = renderToStaticMarkup(<KhelChronicleHome />)

    // 1. Methodology filter bar
    expect(homeHtml).toContain('Methodology:')
    expect(homeHtml).toContain('Empirical Field Trials')
    expect(homeHtml).toContain('3D Motion Capture &amp; Kinematics')
    expect(homeHtml).toContain('Machine Learning &amp; Predictive AI')
    expect(homeHtml).toContain('Epidemiological Injury Registry')
    expect(homeHtml).toContain('Policy &amp; Grassroots Surveys')

    // 2. Empirical feature toggles
    expect(homeHtml).toContain('Interactive Charts')
    expect(homeHtml).toContain('Normative Cutoffs')

    // 3. Sort controls and toolbar
    expect(homeHtml).toContain('Sort by:')
    expect(homeHtml).toContain('Newest Published')
    expect(homeHtml).toContain('Most Cited')
    expect(homeHtml).toContain('Most Downloaded')
    expect(homeHtml).toContain('Shortest Reading Time')

    // 4. Trending research keywords cloud
    expect(homeHtml).toContain('Trending Topics:')
    expect(homeHtml).toContain('#YoYoIR1')
    expect(homeHtml).toContain('#FastBowling')
    expect(homeHtml).toContain('#HighAltitude')
    expect(homeHtml).toContain('#KabaddiInjuries')
  })

  it('renders SportRxiv server navigation tabs and information panels (About, Moderation Policy, Author Guidelines, FAQ)', () => {
    const homeHtml = renderToStaticMarkup(<KhelChronicleHome />)

    // SportRxiv Server Navigation Tabs
    expect(homeHtml).toContain('Preprints Archive')
    expect(homeHtml).toContain('About KhelChronicle')
    expect(homeHtml).toContain('Editorial &amp; Moderation Policy')
    expect(homeHtml).toContain('Author Guidelines')
    expect(homeHtml).toContain('Open Science Policies')
    expect(homeHtml).toContain('FAQ')
  })

  it('renders Crossref persistent DOI, STORK open science badges, bilingual coach takeaways, and supplementary files on preprint page', () => {
    const paperHtml = renderToStaticMarkup(
      <KhelChroniclePaperPage slug="kinematic-correlates-lumbar-spine-stress-fast-bowlers" />
    )

    // Persistent DOI banner
    expect(paperHtml).toContain('https://doi.org/10.51224/khelchronicle.2026.001')
    expect(paperHtml).toContain('Copy DOI')
    expect(paperHtml).toContain('Copy Link')

    // STORK Open Science Badges
    expect(paperHtml).toContain('Open Science Badges:')
    expect(paperHtml).toContain('Open Data')
    expect(paperHtml).toContain('Open Materials / Code')
    expect(paperHtml).toContain('Preregistered Study')
    expect(paperHtml).toContain('CC BY 4.0')

    // Bilingual Grassroots Coaching Takeaways
    expect(paperHtml).toContain('Grassroots Coaching Takeaways &amp; Field Implications')
    expect(paperHtml).toContain('English')
    expect(paperHtml).toContain('हिंदी (Hindi)')
    expect(paperHtml).toContain('Maintain shoulder counter-rotation under 25°')

    // Supplementary Datasets Table
    expect(paperHtml).toContain('Supplementary Datasets &amp; Protocols')
    expect(paperHtml).toContain('KG-2026-001-raw-telemetry.csv')
    expect(paperHtml).toContain('KG-2026-001-mocap-protocol.pdf')
    expect(paperHtml).toContain('Download')

    // Community Discussion & Peer Reviews
    expect(paperHtml).toContain('Community Discussion &amp; Peer Reviews')
    expect(paperHtml).toContain('Dr. Ramesh Sundaram')
    expect(paperHtml).toContain('Leave a Scientific Comment / Feedback')
    expect(paperHtml).toContain('Post Peer Feedback')
  })

  it('supports expanded academic citations including DOI, Harvard, and SportRxiv attribution', () => {
    const paper = getPaperBySlug('kinematic-correlates-lumbar-spine-stress-fast-bowlers')
    expect(paper).toBeDefined()
    if (!paper) return

    const citations = generateCitations(paper)
    expect(citations.apa).toContain('https://doi.org/10.51224/khelchronicle.2026.001')
    expect(citations.bibtex).toContain('doi       = {10.51224/khelchronicle.2026.001}')
    expect(citations.bibtex).toContain('publisher = {KhelGrid Sports Research / SportRxiv India}')
    expect(citations.harvard).toContain('doi: 10.51224/khelchronicle.2026.001')

    const ris = generateRisCitation(paper)
    expect(ris).toContain('DO  - 10.51224/khelchronicle.2026.001')
    expect(ris).toContain('JO  - KhelChronicle Open Sports Research Archive (SportRxiv India)')
  })

  it('renders Phase 1 Two-Column layout, Phase 5 Trust Ribbon, and Phase 2 Scholarly Action Cards on homepage', () => {
    const html = renderToStaticMarkup(<KhelChronicleHome />)

    // Phase 5: Institutional Trust Ribbon & Live Stats
    expect(html).toContain('kc-trust-ribbon')
    expect(html).toContain('Preprints Indexed')
    expect(html).toContain('Repository Views')
    expect(html).toContain('Manuscript Downloads')
    expect(html).toContain('Athletes Tested')
    expect(html).toContain('100% Diamond Open Access')
    expect(html).toContain('SAI NCOE')
    expect(html).toContain('LNIPE Gwalior')
    expect(html).toContain('AIIMS Sports Medicine')
    expect(html).toContain('STORK Network')
    expect(html).toContain('Crossref DOIs')

    // Phase 1: Two-Column Layout and Left Sticky Filter Rail
    expect(html).toContain('kc-two-col-layout')
    expect(html).toContain('kc-filter-sidebar')
    expect(html).toContain('kc-main-feed')
    expect(html).toContain('Filter Repository')
    expect(html).toContain('Study Methodology')
    expect(html).toContain('Normative Calculator Tool')

    // Phase 2: Scholarly Action Cards with 1-click Galley, Cite & DOI copy
    expect(html).toContain('kc-card-doi-pill')
    expect(html).toContain('doi:10.51224/khelchronicle.2026.001')
    expect(html).toContain('Read Galley')
    expect(html).toContain('Cite')
    expect(html).toContain('kc-serif-title')
  })

  it('renders Phase 1 Two-Column Reading Layout on paper page with Sticky TOC rail and Print Field Cue Card', () => {
    const html = renderToStaticMarkup(
      <KhelChroniclePaperPage slug="kinematic-correlates-lumbar-spine-stress-fast-bowlers" />
    )

    // Two-column paper layout & Sticky TOC rail
    expect(html).toContain('kc-paper-two-col-layout')
    expect(html).toContain('kc-paper-article-col')
    expect(html).toContain('kc-paper-toc-rail')
    expect(html).toContain('On This Page')

    // Table of contents jump links
    expect(html).toContain('href="#abstract"')
    expect(html).toContain('href="#takeaways"')
    expect(html).toContain('href="#supplements"')
    expect(html).toContain('href="#ethics"')
    expect(html).toContain('href="#references"')
    expect(html).toContain('href="#comments"')

    // Sticky Action Box
    expect(html).toContain('Read Manuscript Galley')
    expect(html).toContain('Download PDF / Print')
    expect(html).toContain('Cite This Preprint')

    // Print Field Cue Card Button
    expect(html).toContain('Print Field Cue Card')
  })

  it('renders Phase 3 NormativeBenchmarkCalculator with test selection, percentile gauges, and bilingual advice', () => {
    const html = renderToStaticMarkup(<NormativeBenchmarkCalculator />)

    // Header & Tool Information
    expect(html).toContain('Indian Athlete Normative Benchmark Calculator')
    expect(html).toContain('Interactive National Norms Tool')
    expect(html).toContain('4,820 grassroots athletes')

    // Form Controls
    expect(html).toContain('benchmark-test-select')
    expect(html).toContain('Yo-Yo Intermittent Recovery Level 1')
    expect(html).toContain('30m Electronic Sprint')
    expect(html).toContain('Countermovement Jump Height')

    expect(html).toContain('benchmark-age-select')
    expect(html).toContain('Under-14')
    expect(html).toContain('Under-16')
    expect(html).toContain('Under-19')
    expect(html).toContain('Senior Open')

    expect(html).toContain('benchmark-gender-select')
    expect(html).toContain('Male Athletes')
    expect(html).toContain('Female Athletes')

    // Percentile Progress Gauge
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('kc-calc-gauge-fill')

    // Bilingual Coaching Advice
    expect(html).toContain('Coaching Action (English):')
    expect(html).toContain('कोच के लिए सुझाव (हिंदी):')
  })

  it('embeds NormativeBenchmarkCalculator directly in empirical benchmark paper KG-2026-002', () => {
    const html = renderToStaticMarkup(
      <KhelChroniclePaperPage slug="normative-fitness-percentiles-grassroots-athletes-india" />
    )

    // Must embed calculator under #calculator anchor
    expect(html).toContain('id="calculator"')
    expect(html).toContain('Indian Athlete Normative Benchmark Calculator')
    expect(html).toContain('href="#calculator"')
  })

  it('renders international standard preprint features: Version of Record (VoR) banner, Revisions changelog, Altmetric score, and comment filter tabs', () => {
    const html = renderToStaticMarkup(
      <KhelChroniclePaperPage slug="normative-fitness-percentiles-grassroots-athletes-india" />
    )

    // Version of Record (VoR) Journal Publication Banner
    expect(html).toContain('PEER-REVIEWED VERSION OF RECORD (VoR) PUBLISHED')
    expect(html).toContain('Indian Journal of Exercise Physiology')
    expect(html).toContain('10.51224/ijep.2026.012')

    // Revision History Pill Trigger
    expect(html).toContain('kc-version-history-btn')
    expect(html).toContain('Revisions (')

    // Altmetric Attention Score Card
    expect(html).toContain('kc-altmetric-card')
    expect(html).toContain('Attention Score')
    expect(html).toContain('Global Scholarly Reach')
    expect(html).toContain('Policy &amp; Guideline Citations')
    expect(html).toContain('Mendeley / Zotero Saves')

    // Peer Comment Type Filter Tabs
    expect(html).toContain('All Comments (')
    expect(html).toContain('🔬 Peer Reviews (')
    expect(html).toContain('❓ Methodological Queries (')
    expect(html).toContain('📋 Replication Notes (')
    expect(html).toContain('💬 Academic Discussion (')

    // Rich Peer Review Submission Form
    expect(html).toContain('Leave a Scientific Comment / Feedback &amp; Peer Review')
    expect(html).toContain('id="comment-author"')
    expect(html).toContain('id="comment-affiliation"')
    expect(html).toContain('id="comment-orcid"')
    expect(html).toContain('id="comment-type-select"')
    expect(html).toContain('id="comment-coi"')
    expect(html).toContain('id="comment-content"')
  })

  it('fetches, adds, and upvotes database-backed peer comments via chronicle-client', async () => {
    const testSlug = 'kinematic-correlates-lumbar-spine-stress-fast-bowlers'

    // Fetch existing comments
    const initialComments = await getChroniclePaperComments(testSlug)
    expect(Array.isArray(initialComments)).toBe(true)
    expect(initialComments.length).toBeGreaterThan(0)
    expect(initialComments[0].author).toBeDefined()
    expect(initialComments[0].affiliation).toBeDefined()

    // Add a new peer review comment
    const newComment = await addChroniclePaperComment(testSlug, {
      author: 'Dr. Ramesh Sundaram',
      affiliation: 'National Cricket Academy (NCA), Bengaluru',
      role: 'Lead Fast Bowling Biomechanist',
      orcid: '0000-0003-1234-5678',
      commentType: 'peer_review',
      competingInterests: 'Biomechanics advisor to BCCI pathways',
      content: 'Independent high-speed kinematic video validation corroborates the 28-degree threshold within +/- 1.2 degrees.',
    })

    expect(newComment.id).toBeDefined()
    expect(newComment.author).toBe('Dr. Ramesh Sundaram')
    expect(newComment.affiliation).toBe('National Cricket Academy (NCA), Bengaluru')
    expect(newComment.commentType).toBe('peer_review')
    expect(newComment.orcid).toBe('0000-0003-1234-5678')
    expect(newComment.competingInterests).toContain('BCCI pathways')
    expect(newComment.helpfulCount).toBe(0)

    // Upvote comment as helpful
    const voteResult = await voteChronicleCommentHelpful(newComment.id, testSlug)
    expect(voteResult.helpfulCount).toBe(1)

    // Upvote again
    const secondVote = await voteChronicleCommentHelpful(newComment.id, testSlug)
    expect(secondVote.helpfulCount).toBe(2)

    // Validation checks
    await expect(
      addChroniclePaperComment(testSlug, {
        author: 'A',
        affiliation: 'SAI',
        content: 'Valid content exceeding minimum character threshold.',
      })
    ).rejects.toThrow('full name')

    await expect(
      addChroniclePaperComment(testSlug, {
        author: 'Valid Name',
        affiliation: 'S',
        content: 'Valid content exceeding minimum character threshold.',
      })
    ).rejects.toThrow('university')

    await expect(
      addChroniclePaperComment(testSlug, {
        author: 'Valid Name',
        affiliation: 'Valid University',
        content: 'Short',
      })
    ).rejects.toThrow('at least 10 characters')
  })
})
