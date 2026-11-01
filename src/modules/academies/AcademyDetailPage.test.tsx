import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AcademyDetailPage from './AcademyDetailPage'

describe('AcademyDetailPage — Dedicated Academy Hub & Rich Content', () => {
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

  it('renders anti-scam safety advisory banner and pending verification badge on unverified community academy', async () => {
    const { submitCommunityListing } = await import('../../integrations/supabase/public-client')
    const subResult = await submitCommunityListing({
      category: 'academy',
      name: 'Shimla High Altitude Football Club',
      city: 'Shimla',
      sport: 'Football',
      is_verified_user: false,
    })

    expect(subResult.status).toBe('submitted')
    const slug = (subResult as unknown as { record: { slug: string } }).record.slug

    const html = renderToStaticMarkup(
      <AcademyDetailPage slug={slug} onNavigate={vi.fn()} />
    )

    expect(html).toContain('Pending Verification')
    expect(html).toContain('Athlete &amp; Parent Safety Advisory — Unverified Community Listing')
    expect(html).toContain('Do not transfer advance admission fees')
    expect(html).toContain('Official Academy Staff? Verify this Listing')
    expect(html).toContain('Report Suspicious Listing')
  })
})
