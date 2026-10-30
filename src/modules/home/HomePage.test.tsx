import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import HomePage from './HomePage'

describe('HomePage 5 core live-website sections', () => {
  it('renders all 5 core sections with accessible landmarks and touch rails', () => {
    const html = renderToStaticMarkup(<HomePage />)

    // 1. Live Match Center
    expect(html).toContain('Live Match Center')
    expect(html).toContain('Scroll live matches left')
    expect(html).toContain('Scroll live matches right')
    expect(html).toContain('/live-scores')

    // 2. Selection Trials & Combines
    expect(html).toContain('Selection Trials &amp; Combines')
    expect(html).toContain('Verified SAI, federation &amp; academy scouting trials')
    expect(html).toContain('Scroll trials left')
    expect(html).toContain('Scroll trials right')

    // 3. Book Turfs & Courts
    expect(html).toContain('Book Turfs &amp; Courts')
    expect(html).toContain('Browse venue listings and published facilities')
    expect(html).toContain('Scroll venues left')
    expect(html).toContain('Scroll venues right')
    expect(html).toContain('Find Venues')

    // 4. Join Pickup Games
    expect(html).toContain('Join Pickup Games')
    expect(html).toContain('Connect with local players and fill missing court spots')
    expect(html).toContain('Scroll pickup games left')
    expect(html).toContain('Scroll pickup games right')
    expect(html).toContain('Pickleball')
    expect(html).toContain('FerroHub Sports')
    expect(html).toContain('₹200/player')
    expect(html).toContain('/play')

    // 5. Featured Training Institutions
    expect(html).toContain('Featured Training Institutions')
    expect(html).toContain('Accredited sports centers actively scouted on KhelGrid')
    expect(html).toContain('Scroll academies left')
    expect(html).toContain('Scroll academies right')
    expect(html).toContain('All Academies')
    expect(html).toContain('/academies')
    expect(html).toContain('Loading accredited institutions…')

    // 6. KhelChronicle Flagship Research Preprints Showcase
    expect(html).toContain('KhelChronicle · Open Sports Research Repository')
    expect(html).toContain('Empirical Sports Science &amp; National Athlete Benchmarks')
    expect(html).toContain('Diamond Open Access')
    expect(html).toContain('Kinematic Correlates of Lumbar Spine Stress')
    expect(html).toContain('KG-2026-001')
    expect(html).toContain('Normative Physical Fitness Percentiles')
    expect(html).toContain('KG-2026-002')
    expect(html).toContain('Machine Learning Predictive Modeling for Grassroots Talent Identification')
    expect(html).toContain('KG-2026-004')
    expect(html).toContain('Coaching &amp; Athlete Protocol')
    expect(html).toContain('Scouting &amp; Testing Cutoffs')
    expect(html).toContain('Talent Identification Models')
    expect(html).toContain('Quick Abstract &amp; Data')
    expect(html).toContain('Cite')
    expect(html).toContain('Operationalize On KhelGrid:')
    expect(html).toContain('/talent-scanner')
    expect(html).toContain('"@type":"ItemList"')
    expect(html).toContain('"@type":"ScholarlyArticle"')
  })
})
