import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../i18n'
import AcademyDetailPage from './AcademyDetailPage'

describe('AcademyDetailPage published-record privacy boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      const data = url.includes('/rpc/submit_listing_intake')
        ? { status: 'submitted', reference_number: 'KHL-20261112-ACA001', tracking_key: 'private-academy-test-key' }
        : []
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }))
    }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it.each([
    'bengaluru-fc-academy',
    'pullela-gopichand-badminton-academy',
    'mary-kom-regional-boxing-foundation',
  ])('does not expose unverified curated academy data for %s', slug => {
    const html = renderToStaticMarkup(<AcademyDetailPage slug={slug} onNavigate={vi.fn()} />)
    expect(html).toContain('Academy Record Not Found')
    expect(html).not.toContain('Verified Academy')
    expect(html).not.toContain('AFC Pro Licensed Coaching Staff')
    expect(html).not.toContain('Olympic medalists and international champions')
  })

  it('does not offer admission or trial enrolment for an unpublished academy', () => {
    const html = renderToStaticMarkup(
      <AcademyDetailPage slug="bengaluru-fc-academy" onNavigate={vi.fn()} initialEnrolOpen />
    )
    expect(html).toContain('Academy Record Not Found')
    expect(html).not.toContain('Official Academy Admission &amp; Trial Desk')
    expect(html).not.toContain('Apply for Admission / Free Trial Class')
  })

  it('renders the not-found state for an unknown academy', () => {
    const html = renderToStaticMarkup(
      <AcademyDetailPage slug="non-existent-sports-academy-xyz" onNavigate={vi.fn()} />
    )
    expect(html).toContain('Academy Record Not Found')
    expect(html).toContain('Browse All Academies')
  })

  it('keeps community academies out of the public detail route until moderation', async () => {
    const { submitCommunityListing } = await import('../../integrations/supabase/public-client')
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
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/rest/v1/rpc/submit_listing_intake')
    expect(String(url)).not.toContain('/rest/v1/academies')
    const html = renderToStaticMarkup(<AcademyDetailPage slug="shimla-high-altitude-football-club" onNavigate={vi.fn()} />)
    expect(html).toContain('Academy Record Not Found')
  })
})
