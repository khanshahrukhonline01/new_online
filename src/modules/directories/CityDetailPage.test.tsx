import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CityDetailPage from './CityDetailPage'

describe('CityDetailPage Dynamic City Sports Hub', () => {
  it('renders breadcrumbs, hero header, zone badge, and stats counters for Delhi', () => {
    const html = renderToStaticMarkup(
      <CityDetailPage citySlug="delhi" onNavigate={vi.fn()} onOpenIntake={vi.fn()} />
    )

    // Breadcrumbs
    expect(html).toContain('aria-label="Breadcrumb"')
    expect(html).toContain('Home')
    expect(html).toContain('Cities')
    expect(html).toContain('Delhi')

    // Eyebrow & Badges
    expect(html).toContain('SPORTS CITY HUB · NORTH ZONE')
    expect(html).toContain('Premier Metro Sports Hub')
    expect(html).toContain('Delhi Sports Hub.')
    expect(html).toContain('Delhi NCR')

    // Live counter labels
    expect(html).toContain('Venues &amp; Turfs')
    expect(html).toContain('Trials &amp; Tourneys')
    expect(html).toContain('Pickup Games')
    expect(html).toContain('Academies')

    // Quick CTA Actions
    expect(html).toContain('+ List in Delhi')
    expect(html).toContain('Explore Trials')
    expect(html).toContain('Explore Turfs')

    // Iconic Stadiums Spotlight
    expect(html).toContain('Key Sports Stadiums &amp; Complexes in Delhi')
    expect(html).toContain('Jawaharlal Nehru Stadium')
    expect(html).toContain('Thyagaraj Stadium')
    expect(html).toContain('SAI Karni Singh Shooting Range')

    // 4 Dynamic Sections
    expect(html).toContain('Selection Trials &amp; Tournaments')
    expect(html).toContain('Sports Complexes &amp; Turfs')
    expect(html).toContain('Community Pickup Games')
    expect(html).toContain('Training Academies')

    // Regional Geography
    expect(html).toContain('Other Sports Cities in North Zone')
  })

  it('renders correctly for Bengaluru in South Zone with iconic IT hub stadiums', () => {
    const html = renderToStaticMarkup(
      <CityDetailPage citySlug="bengaluru" onNavigate={vi.fn()} onOpenIntake={vi.fn()} />
    )

    expect(html).toContain('SPORTS CITY HUB · SOUTH ZONE')
    expect(html).toContain('Bengaluru Sports Hub.')
    expect(html).toContain('Karnataka')
    expect(html).toContain('Sree Kanteerava Stadium')
    expect(html).toContain('M. Chinnaswamy Stadium')
    expect(html).toContain('Kanteerava Aquatic Centre')
    expect(html).toContain('Other Sports Cities in South Zone')
  })

  it('gracefully handles custom or regional city slug', () => {
    const html = renderToStaticMarkup(
      <CityDetailPage citySlug="dehradun" onNavigate={vi.fn()} onOpenIntake={vi.fn()} />
    )

    expect(html).toContain('Dehradun Sports Hub.')
    expect(html).toContain('Uttarakhand')
    expect(html).toContain('Maharana Pratap Sports College')
    expect(html).toContain('+ List in Dehradun')
  })
})
