import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import LearningHubPage from './LearningHubPage'

describe('LearningHubPage', () => {
  it('renders the header, statistics, and category filters', () => {
    const html = renderToStaticMarkup(<LearningHubPage />)
    expect(html).toContain('Sports Books &amp; Tactical Manuals — Free to Read Online')
    expect(html).toContain('KhelGrid Sports &amp; Learning Hub')
    expect(html).toContain('Complete Books')
    expect(html).toContain('₹0 Free Forever')
    expect(html).toContain('Tactical Play')
    expect(html).toContain('Biomechanics')
    expect(html).toContain('Search sports books by title')
  })

  it('renders book cards with free to read badges and author credits', () => {
    const html = renderToStaticMarkup(<LearningHubPage />)
    expect(html).toContain('Modern Football Tactics &amp; Spatial Pressing')
    expect(html).toContain('Coach Rajeshwar Sen')
    expect(html).toContain('Cricket Fast Bowling: Biomechanics &amp; Speed Mechanics')
    expect(html).toContain('Dr. Vikramaditya Rathore')
    expect(html).toContain('100% Free Book')
    expect(html).toContain('Read Free')
  })
})
