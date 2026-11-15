import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../i18n'
import AcademyDetailPage from './AcademyDetailPage'

const academyFixture = {
  id: 'academy-test-001',
  slug: 'verified-test-academy',
  name: 'Verified Test Academy',
  description: 'Synthetic test fixture for a published academy record.',
  city: 'Bengaluru',
  state: 'Karnataka',
  address: 'Test Road',
  phone: null,
  website_url: null,
  public_contact_url: null,
  verification_status: 'verified',
  publication_status: 'published',
  sport: 'Football',
  facilities: ['Training ground'],
  age_groups: ['U-14'],
}

async function loadPublicClient() {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://khelgrid-test.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.resetModules()
  const client = await import('../../integrations/supabase/public-client')
  client.clearCatalogueCache()
  return client
}

describe('AcademyDetailPage — published and verified catalogue access', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      const data = url.includes('/rpc/submit_listing_intake')
        ? { status: 'submitted', reference_number: 'KHL-20261112-ACA001', tracking_key: 'private-academy-test-key' }
        : url.includes('/rest/v1/academies?')
          ? [academyFixture]
          : []
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }))
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('loads a published, verified academy from the catalogue by its exact slug', async () => {
    const { getAcademyBySlug } = await loadPublicClient()
    const academy = await getAcademyBySlug('verified-test-academy')

    expect(academy?.id).toBe('academy-test-001')
    expect(academy?.name).toBe('Verified Test Academy')
    expect(academy?.verification_status).toBe('verified')

    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]))
    expect(requestUrl.pathname).toBe('/rest/v1/academies')
    expect(requestUrl.searchParams.get('publication_status')).toBe('eq.published')
    expect(requestUrl.searchParams.get('verification_status')).toBe('eq.verified')
  })

  it('does not resolve a slug that is absent from the published catalogue', async () => {
    const { getAcademyBySlug } = await loadPublicClient()
    const academy = await getAcademyBySlug('missing-test-academy')
    expect(academy).toBeUndefined()
  })

  it('renders the not-found state for an unknown academy slug', () => {
    const html = renderToStaticMarkup(
      <AcademyDetailPage slug="non-existent-sports-academy-xyz" onNavigate={vi.fn()} />
    )
    expect(html).toContain('Academy Record Not Found')
    expect(html).toContain('Browse All Academies')
  })

  it('keeps community academies out of the public detail route until moderation', async () => {
    const { submitCommunityListing } = await loadPublicClient()
    const result = await submitCommunityListing({
      category: 'academy',
      name: 'Shimla High Altitude Football Club',
      city: 'Shimla',
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
    expect(String(rpcCall?.[0])).not.toContain('/rest/v1/academies')
    const html = renderToStaticMarkup(<AcademyDetailPage slug="shimla-high-altitude-football-club" onNavigate={vi.fn()} />)
    expect(html).toContain('Academy Record Not Found')
  })

  it('submits a dynamic academy admission enquiry and registers an official token (ENQ-XXX)', async () => {
    const { submitAcademyEnquiry, getUserAcademyEnquiries, isAcademyEnquirySubmitted } = await import('../../integrations/supabase/athlete-profile-client')

    const hadWindow = typeof window !== 'undefined'
    const storage = new Map<string, string>()

    if (!hadWindow) {
      ;(globalThis as unknown as { window: unknown }).window = {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, val: string) => storage.set(key, val),
          removeItem: (key: string) => storage.delete(key),
          clear: () => storage.clear(),
        },
        dispatchEvent: () => true,
      }
      ;(globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class {
        type: string
        detail: unknown
        constructor(type: string, init?: { detail?: unknown }) {
          this.type = type
          this.detail = init?.detail
        }
      }
    }

    const res = await submitAcademyEnquiry({
      academySlug: 'bengaluru-fc-academy',
      academyName: 'Bengaluru FC Youth Academy',
      sport: 'Football',
      city: 'Bengaluru',
      state: 'Karnataka',
      batchType: 'weekend',
      skillLevel: 'intermediate',
      requestType: 'free_trial',
      athleteName: 'Vihaan Sen',
      athletePhone: '9876543210',
      playingPosition: 'Attacking Midfielder',
      fitnessBenchmarks: {
        percentileAvg: 88,
        tier: 'National Talent Pool',
      },
    })

    expect(res.status).toBe('submitted')
    expect(res.enquiry.enquiryToken).toMatch(/^ENQ-[A-Z]{3}-[A-Z0-9]+$/)
    expect(res.enquiry.academySlug).toBe('bengaluru-fc-academy')
    expect(res.enquiry.batchType).toBe('weekend')

    expect(isAcademyEnquirySubmitted('bengaluru-fc-academy')).toBe(true)
    const all = getUserAcademyEnquiries()
    expect(all.length).toBeGreaterThan(0)
    expect(all[0].enquiryToken).toBe(res.enquiry.enquiryToken)
  })
})

