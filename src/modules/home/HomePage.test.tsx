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
  })
})
