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

    // 7. Flagship Digital Tools (Sports CV, Talent Scanner, KhelChronicle)
    expect(html).toContain('ATHLETE &amp; SCOUTING TOOLS')
    expect(html).toContain('Powerful tools for your sporting journey.')
    expect(html).toContain('Sports CV Wizard')
    expect(html).toContain('/sports-cv')
    expect(html).toContain('Talent Scanner')
    expect(html).toContain('KhelChronicle Research')
    expect(html).toContain('/khelchronicle')

    // 8. Hero Quick Search & Discovery Action Cards (Live Website Parity Option A)
    expect(html).toContain('Sports Across <span class="home-hero-title-green">India</span>')
    expect(html).toContain('Search cricket trials, football turf, badminton...')
    expect(html).toContain('Quick Explore:')
    expect(html).toContain('home-hero-action-card')
    expect(html).toContain('Live Scores')
    expect(html).toContain('href="/live-scores"')
    expect(html).toContain('Trials')
    expect(html).toContain('href="/opportunities"')
    expect(html).toContain('Book Turf')
    expect(html).toContain('href="/venues"')
    expect(html).toContain('Pickup Games')
    expect(html).toContain('href="/play"')
    expect(html).toContain('Coaching')
    expect(html).toContain('href="/academies"')
    expect(html).toContain('KhelChronicle')
    expect(html).toContain('Sports CV')
    expect(html).toContain('href="/sports-cv"')
    expect(html).toContain('Tournaments')
    expect(html).toContain('href="/events"')
    expect(html).toContain('Talent Scanner')
    expect(html).toContain('href="/talent-scanner"')
  })
})
