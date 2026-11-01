import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import VenueDetailPage from './VenueDetailPage'

describe('VenueDetailPage — Dedicated Venue Hub & Court Specifications', () => {
  it('renders Sree Kanteerava Stadium with surface specs, amenities, directions, and pickup action', () => {
    const onOpenIntakeMock = vi.fn()
    const html = renderToStaticMarkup(
      <VenueDetailPage
        slug="sree-kanteerava-stadium"
        onNavigate={vi.fn()}
        onOpenIntake={onOpenIntakeMock}
      />
    )

    // Name & Sport
    expect(html).toContain('Sree Kanteerava Stadium')
    expect(html).toContain('Athletics &amp; Football')
    expect(html).toContain('Bengaluru')

    // Government verification badge
    expect(html).toContain('Government Sports Facility')
    expect(html).toContain('Active Sports Facility')

    // Action buttons
    expect(html).toContain('Enquire on WhatsApp')
    expect(html).toContain('Call Venue')
    expect(html).toContain('Get Directions')
    expect(html).toContain('Host a Pickup Game Here')

    // Surface & Specifications
    expect(html).toContain('Playing Surface')
    expect(html).toContain('IAAF Certified Synthetic Track')
    expect(html).toContain('Courts &amp; Pitches')
    expect(html).toContain('Estimated Slot Rates')

    // Amenities & Features
    expect(html).toContain('Amenities &amp; Features')
    expect(html).toContain('8-Lane Synthetic Athletic Track')
    expect(html).toContain('25,000 Capacity Stadium Seating')

    // Ground Guidelines
    expect(html).toContain('Ground Rules &amp; Guidelines')
    expect(html).toContain('Spikes with max 6mm length allowed on synthetic track')

    // ShareBar & FAQs
    expect(html).toContain('Share:')
    expect(html).toContain('Frequently Asked Questions')
    expect(html).toContain('Is the track open for general public morning jogging?')
  })

  it('renders Jawaharlal Nehru Stadium in Delhi with SAI credentials', () => {
    const html = renderToStaticMarkup(
      <VenueDetailPage slug="jawaharlal-nehru-stadium" onNavigate={vi.fn()} />
    )

    expect(html).toContain('Jawaharlal Nehru Stadium')
    expect(html).toContain('Delhi')
    expect(html).toContain('Government Sports Facility')
    expect(html).toContain('Olympic Standard Mondo Track &amp; Hybrid Grass Pitch')
    expect(html).toContain('Olympic Regulation Mondo Athletics Track')
  })

  it('renders Cooperage Football Ground in Mumbai with FIFA 2-star turf', () => {
    const html = renderToStaticMarkup(
      <VenueDetailPage slug="cooperage-football-ground" onNavigate={vi.fn()} />
    )

    expect(html).toContain('Cooperage Football Ground')
    expect(html).toContain('Mumbai')
    expect(html).toContain('FIFA 2-Star Quality Pro Artificial Turf')
    expect(html).toContain('LED Floodlights for Night Matches')
  })

  it('renders 404 not found state gracefully when venue slug does not exist', () => {
    const html = renderToStaticMarkup(
      <VenueDetailPage slug="unknown-sports-ground-999" onNavigate={vi.fn()} />
    )

    expect(html).toContain('Venue Record Not Found')
    expect(html).toContain('Browse All Venues')
  })

  it('renders anti-scam safety advisory banner and pending verification badge on unverified community venue', async () => {
    const { submitCommunityListing } = await import('../../integrations/supabase/public-client')
    const subResult = await submitCommunityListing({
      category: 'venue',
      name: 'Ranchi Sector 4 Community Box Turf',
      city: 'Ranchi',
      sport: 'Football',
      is_verified_user: false,
    })

    expect(subResult.status).toBe('submitted')
    const slug = (subResult as unknown as { record: { slug: string } }).record.slug

    const html = renderToStaticMarkup(
      <VenueDetailPage slug={slug} onNavigate={vi.fn()} />
    )

    expect(html).toContain('Pending Verification')
    expect(html).toContain('Player &amp; Team Safety Advisory — Unverified Sports Facility')
    expect(html).toContain('Do not transfer UPI slot advance fees')
    expect(html).toContain('Turf Manager / Owner? Verify this Facility')
    expect(html).toContain('Report Suspicious Venue')
  })
})
