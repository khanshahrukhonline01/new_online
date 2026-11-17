import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../i18n'
import VenueDetailPage from './VenueDetailPage'

describe('VenueDetailPage published-record privacy boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      const data = url.includes('/rpc/submit_listing_intake')
        ? { status: 'submitted', reference_number: 'KHL-20261112-VEN001', tracking_key: 'private-venue-test-key' }
        : []
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }))
    }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it.each([
    'sree-kanteerava-stadium',
    'jawaharlal-nehru-stadium',
    'cooperage-football-ground',
  ])('does not expose unverified curated venue data for %s', slug => {
    const html = renderToStaticMarkup(<VenueDetailPage slug={slug} onNavigate={vi.fn()} />)
    expect(html).toContain('Venue Record Not Found')
    expect(html).not.toContain('Government Sports Facility')
    expect(html).not.toContain('IAAF Certified Synthetic Track')
    expect(html).not.toContain('FIFA 2-Star Quality Pro Artificial Turf')
  })

  it('renders the not-found state for an unknown venue', () => {
    const html = renderToStaticMarkup(
      <VenueDetailPage slug="unknown-sports-ground-999" onNavigate={vi.fn()} />
    )
    expect(html).toContain('Venue Record Not Found')
    expect(html).toContain('Browse All Venues')
  })

  it('keeps community venues out of the public detail route until moderation', async () => {
    const { submitCommunityListing } = await import('../../integrations/supabase/public-client')
    const result = await submitCommunityListing({
      category: 'venue',
      name: 'Ranchi Sector 4 Community Box Turf',
      city: 'Ranchi',
      sport: 'Football',
    })
    expect(result.status).toBe('submitted')
    if (result.status === 'submitted') {
      expect(result.mode).toBe('moderation_queue')
      expect(result.record.publication_status).toBe('pending_review')
      expect(result.detailPath).toBeUndefined()
    }
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/rest/v1/rpc/submit_listing_intake')
    expect(String(url)).not.toContain('/rest/v1/venues')
    const html = renderToStaticMarkup(<VenueDetailPage slug="ranchi-sector-4-community-box-turf" onNavigate={vi.fn()} />)
    expect(html).toContain('Venue Record Not Found')
  })
})
