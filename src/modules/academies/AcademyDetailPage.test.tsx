import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import '../../i18n'
import AcademyDetailPage from './AcademyDetailPage'

describe('AcademyDetailPage — Dedicated Academy Hub & Rich Content', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      const data = url.includes('/rpc/submit_listing_intake')
        ? { status: 'submitted', reference_number: 'KHL-20261112-ACA001', tracking_key: 'private-academy-test-key' }
        : []
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }))
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('renders Bengaluru FC Youth Academy with complete rich content, credentials, and curriculum', () => {
    const html = renderToStaticMarkup(
      <AcademyDetailPage slug="bengaluru-fc-academy" onNavigate={vi.fn()} />
    )

    // Name & Sport
    expect(html).toContain('Bengaluru FC Youth Academy')
    expect(html).toContain('Football')

    // Location & Verified Badge
    expect(html).toContain('Bengaluru, Karnataka')
    expect(html).toContain('Verified Academy')

    // Contact & Admission actions
    expect(html).toContain('Enquire on WhatsApp')
    expect(html).toContain('wa.me')
    expect(html).toContain('Official Website')
    expect(html).toContain('bengalurufc.com')

    // Curriculum & Methodology
    expect(html).toContain('Training Curriculum &amp; Methodology')
    expect(html).toContain('FIFA Standard Artificial Turf')
    expect(html).toContain('Sports Science &amp; Recovery Lab')

    // Timings, Coach, Fees
    expect(html).toContain('Head Coach:')
    expect(html).toContain('AFC Pro Licensed Coaching Staff')
    expect(html).toContain('Age Groups Coached')
    expect(html).toContain('Fee Structure')

    // Multi-channel ShareBar
    expect(html).toContain('Share:')
    expect(html).toContain('WhatsApp')
    expect(html).toContain('Copy Link')

    // FAQs
    expect(html).toContain('Frequently Asked Questions')
    expect(html).toContain('How do I register for a trial session at Bengaluru FC Academy?')
  })

  it('renders Pullela Gopichand Badminton Academy with Olympic coaching credentials', () => {
    const html = renderToStaticMarkup(
      <AcademyDetailPage slug="pullela-gopichand-badminton-academy" onNavigate={vi.fn()} />
    )

    expect(html).toContain('Pullela Gopichand Badminton Academy')
    expect(html).toContain('Badminton')
    expect(html).toContain('Hyderabad, Telangana')
    expect(html).toContain('Pullela Gopichand')
    expect(html).toContain('8 BWF Tournament Synthetic Wooden Courts')
    expect(html).toContain('Olympic medalists and international champions')
  })

  it('renders Mary Kom Boxing Regional Academy with SAI accredited pedigree', () => {
    const html = renderToStaticMarkup(
      <AcademyDetailPage slug="mary-kom-regional-boxing-foundation" onNavigate={vi.fn()} />
    )

    expect(html).toContain('Mary Kom Regional Boxing Foundation')
    expect(html).toContain('Boxing')
    expect(html).toContain('Imphal, Manipur')
    expect(html).toContain('MC Mary Kom')
    expect(html).toContain('3 International Boxing Sparring Rings')
  })

  it('renders 404 state gracefully with return navigation when academy is not found', () => {
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


  it('renders Apply for Admission / Free Trial Class button and enrolment modal when requested', () => {
    const htmlNormal = renderToStaticMarkup(
      <AcademyDetailPage slug="bengaluru-fc-academy" onNavigate={vi.fn()} />
    )
    expect(htmlNormal).toContain('Apply for Admission / Free Trial Class')
    expect(htmlNormal).toContain('Apply for Admission / Free Trial')

    const htmlEnrol = renderToStaticMarkup(
      <AcademyDetailPage slug="bengaluru-fc-academy" onNavigate={vi.fn()} initialEnrolOpen={true} />
    )
    expect(htmlEnrol).toContain('Official Academy Admission &amp; Trial Desk')
    expect(htmlEnrol).toContain('Select Program / Trial Option')
    expect(htmlEnrol).toContain('Free Trial Class')
    expect(htmlEnrol).toContain('Weekend Development')
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
