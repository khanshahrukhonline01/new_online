import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SportsPage from './SportsPage'
import { ALL_SPORTS_DATA, getAllSportSlugs } from './data/sportsData'
import { sportIconManifest, getSportIconId } from '../../shared/sports/sportIcons'
import { VERIFIED_SPORTS } from '../../shared/sitemapGenerator'

describe('SportsPage and Sports Catalogue Consistency', () => {
  it('renders SportsPage discovery shell with proper headings and structure', () => {
    const html = renderToStaticMarkup(<SportsPage />)
    expect(html).toContain('SPORTS DIRECTORY')
    expect(html).toContain('Find your sport.')
    expect(html).toContain('Explore the sports currently published on KhelGrid.')
  })

  it('contains all 34 verified sports in ALL_SPORTS_DATA catalog', () => {
    const slugs = getAllSportSlugs()
    expect(slugs).toHaveLength(34)
    expect(VERIFIED_SPORTS).toHaveLength(34)

    for (const sport of VERIFIED_SPORTS) {
      expect(ALL_SPORTS_DATA[sport]).toBeDefined()
      expect(ALL_SPORTS_DATA[sport].name).toBeTruthy()
      expect(ALL_SPORTS_DATA[sport].governingBody.name).toBeTruthy()
      expect(ALL_SPORTS_DATA[sport].selectionPathway.length).toBeGreaterThan(0)
    }
  })

  it('maintains 1-to-1 parity between sportIconManifest and VERIFIED_SPORTS', () => {
    expect(sportIconManifest).toHaveLength(34)
    for (const sport of VERIFIED_SPORTS) {
      const iconId = getSportIconId(sport)
      expect(iconId).toBeDefined()
    }
  })
})
