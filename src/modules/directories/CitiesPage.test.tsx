import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CitiesPage from './CitiesPage'
import { ALL_INDIAN_CITIES, METRO_16_CITIES, REMAINING_CITIES } from '../../shared/components/citiesData'

describe('CitiesPage national sports geography directory', () => {
  it('renders all 53 sports cities partitioned into 16 metro hubs and 37 regional cities', () => {
    const html = renderToStaticMarkup(<CitiesPage />)

    // Heading, Eyebrow & Intro
    expect(html).toContain('NATIONAL SPORTS GEOGRAPHY')
    expect(html).toContain('Sports Cities Across India.')
    expect(html).toContain('Top 16 Metropolitan Sports Hubs')
    expect(html).toContain('State &amp; Regional Sports Cities')

    // Verified data lengths
    expect(ALL_INDIAN_CITIES.length).toBe(53)
    expect(METRO_16_CITIES.length).toBe(16)
    expect(REMAINING_CITIES.length).toBe(37)

    // Check Premier Metro Cities
    expect(html).toContain('Delhi')
    expect(html).toContain('Jawaharlal Nehru Stadium')
    expect(html).toContain('Mumbai')
    expect(html).toContain('Wankhede Stadium')
    expect(html).toContain('Bengaluru')
    expect(html).toContain('Sree Kanteerava Stadium')
    expect(html).toContain('Kolkata')
    expect(html).toContain('Salt Lake Stadium')

    // Check Regional Sports Cities
    expect(html).toContain('Itanagar')
    expect(html).toContain('Sagar')
    expect(html).toContain('Dewas')
    expect(html).toContain('Ajmer')
    expect(html).toContain('Bareilly')
    expect(html).toContain('Satna')

    // Filter controls and search
    expect(html).toContain('Search by city, state, or stadium name…')
    expect(html).toContain('North-East')
    expect(html).toContain('Islands')
  })
})
