import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import VenuesPage from './VenuesPage'

// Mock getVenues from public-client
vi.mock('../../integrations/supabase/public-client', () => ({
  getVenues: vi.fn().mockResolvedValue({
    status: 'ready',
    data: [
      {
        id: 'v1',
        slug: 'sai-ncoe-bengaluru',
        name: 'SAI NCOE Bengaluru',
        city: 'Bengaluru',
        address: 'Kengeri, Bengaluru',
        description: 'Elite training centre for athletics, hockey and badminton.',
        timezone: 'Asia/Kolkata',
        government_facility: true,
        sport: 'Badminton',
      },
      {
        id: 'v2',
        slug: 'jln-stadium-delhi',
        name: 'Jawaharlal Nehru Stadium',
        city: 'Delhi',
        address: 'Pragati Vihar, New Delhi',
        description: 'Multi-purpose stadium and sports complex.',
        timezone: 'Asia/Kolkata',
        government_facility: true,
        sport: 'Football',
      },
    ],
  }),
}))

describe('VenuesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders venue directory header, controls, and callout banner', () => {
    const html = renderToStaticMarkup(<VenuesPage />)

    expect(html).toContain('VENUE &amp; TURF DIRECTORY')
    expect(html).toContain('Find a place to play.')
    expect(html).toContain('Manage a sports facility? List with 0% Fee')
  })

  it('renders Near Me GPS button and Grid/Map view switcher', () => {
    const html = renderToStaticMarkup(<VenuesPage />)

    expect(html).toContain('Near Me')
    expect(html).toContain('Grid')
    expect(html).toContain('Map')
    expect(html).toContain('kg-view-toggle')
  })

  it('renders venue filter panel with sport, city and facility dropdowns', () => {
    const html = renderToStaticMarkup(<VenuesPage />)

    expect(html).toContain('Sport')
    expect(html).toContain('City')
    expect(html).toContain('Facility type')
  })
})
