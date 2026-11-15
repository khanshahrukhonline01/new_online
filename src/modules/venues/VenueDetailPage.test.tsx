import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../i18n'
import VenueDetailPage from './VenueDetailPage'

const venueFixture = {
  id: 'venue-test-001',
  slug: 'verified-test-venue',
  name: 'Verified Test Sports Venue',
  description: 'Synthetic test fixture for a published venue record.',
  city: 'Delhi',
  state: 'Delhi',
  address: 'Test Road',
  timezone: 'Asia/Kolkata',
  phone: null,
  verification_status: 'verified',
  publication_status: 'published',
  sport: 'Football',
  surface_type: 'Synthetic test surface',
  facilities: ['Training pitch'],
}

async function loadPublicClient() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://khelgrid-test.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.resetModules()
  const client = await import('../../integrations/supabase/public-client')
  client.clearCatalogueCache()
  return client
}

describe('VenueDetailPage — published and verified catalogue access', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      const data = url.includes('/rpc/submit_listing_intake')
        ? { status: 'submitted', reference_number: 'KHL-20261112-VEN001', tracking_key: 'private-venue-test-key' }
        : url.includes('/rest/v1/venues?')
          ? (() => {
              const requestedSlug = new URL(url).searchParams.get('slug')?.replace(/^ilike\./, '')
              return !requestedSlug || requestedSlug.toLowerCase() === venueFixture.slug.toLowerCase()
                ? [venueFixture]
                : []
            })()
          : []
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }))
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('loads a published, verified venue from the catalogue by its exact slug', async () => {
    const { getVenueBySlug } = await loadPublicClient()
    const venue = await getVenueBySlug('verified-test-venue')

    expect(venue?.id).toBe('venue-test-001')
    expect(venue?.name).toBe('Verified Test Sports Venue')
    expect(venue?.verification_status).toBe('verified')

    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]))
    expect(requestUrl.pathname).toBe('/rest/v1/venues')
    expect(requestUrl.searchParams.get('publication_status')).toBe('eq.published')
    expect(requestUrl.searchParams.get('verification_status')).toBe('eq.verified')
  })

  it('does not resolve a slug that is absent from the published catalogue', async () => {
    const { getVenueBySlug } = await loadPublicClient()
    const venue = await getVenueBySlug('missing-test-venue')
    expect(venue).toBeUndefined()
  })

  it('renders the not-found state for an unknown venue slug', () => {
    const html = renderToStaticMarkup(
      <VenueDetailPage slug="unknown-sports-ground-999" onNavigate={vi.fn()} />
    )
    expect(html).toContain('Venue Record Not Found')
    expect(html).toContain('Browse All Venues')
  })

  it('keeps community venues out of the public detail route until moderation', async () => {
    const { submitCommunityListing } = await loadPublicClient()
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
    const rpcCall = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('/rpc/submit_listing_intake'))
    expect(String(rpcCall?.[0])).toContain('/rest/v1/rpc/submit_listing_intake')
    expect(String(rpcCall?.[0])).not.toContain('/rest/v1/venues')
    const html = renderToStaticMarkup(<VenueDetailPage slug="ranchi-sector-4-community-box-turf" onNavigate={vi.fn()} />)
    expect(html).toContain('Venue Record Not Found')
  })
})
