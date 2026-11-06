import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import CommunityListingModal from './CommunityListingModal'

describe('CommunityListingModal', () => {
  it('does not render when isOpen is false', () => {
    const html = renderToStaticMarkup(<CommunityListingModal isOpen={false} onClose={vi.fn()} />)
    expect(html).toBe('')
  })

  it('renders all category tabs, titles, and form controls when open', () => {
    const html = renderToStaticMarkup(
      <CommunityListingModal isOpen={true} onClose={vi.fn()} defaultCategory="pickup_game" />
    )

    // Modal role and headings
    expect(html).toContain('role="dialog"')
    expect(html).toContain('+ List on KhelGrid')
    expect(html).toContain('KHELGRID · COMMUNITY INTAKE')
    expect(html).toContain('Publish a new sports academy, turf arena, selection trial, or pickup match')

    // Category switcher tabs
    expect(html).toContain('Pickup Game')
    expect(html).toContain('Trial / Tourney')
    expect(html).toContain('Turf / Arena')
    expect(html).toContain('Academy')

    // Default pickup game fields
    expect(html).toContain('Sport *')
    expect(html).toContain('Venue / Turf Name *')
    expect(html).toContain('City *')
    expect(html).toContain('Date &amp; Time *')
    expect(html).toContain('Price / Player')
    expect(html).toContain('Open Spots')
    expect(html).toContain('Publish Listing Now')
  })

  it('renders Academy specific fields when defaultCategory is academy', () => {
    const html = renderToStaticMarkup(
      <CommunityListingModal isOpen={true} onClose={vi.fn()} defaultCategory="academy" />
    )

    expect(html).toContain('Academy Name *')
    expect(html).toContain('Prakash Padukone Badminton Academy')
    expect(html).toContain('About Academy &amp; Coaching Programs')
  })

  it('renders Venue specific fields when defaultCategory is venue', () => {
    const html = renderToStaticMarkup(
      <CommunityListingModal isOpen={true} onClose={vi.fn()} defaultCategory="venue" />
    )

    expect(html).toContain('Venue / Turf Name *')
    expect(html).toContain('Supported Sports')
    expect(html).toContain('Facilities / Description')
  })

  it('renders Opportunity specific fields and verification button when defaultCategory is opportunity', () => {
    const html = renderToStaticMarkup(
      <CommunityListingModal isOpen={true} onClose={vi.fn()} defaultCategory="opportunity" />
    )

    expect(html).toContain('Trial or Tournament Title *')
    expect(html).toContain('Opportunity Type')
    expect(html).toContain('Selection Trial')
    expect(html).toContain('Tournament')
    expect(html).toContain('Submit for Verification (2-4 hrs)')
  })

  it('renders Guest Mode bar and contact fields for unauthenticated visitors', () => {
    const html = renderToStaticMarkup(
      <CommunityListingModal isOpen={true} onClose={vi.fn()} defaultCategory="pickup_game" />
    )

    expect(html).toContain('Guest Mode:')
    expect(html).toContain('Sign In for Instant Publishing')
    expect(html).toContain('Organizer / Host Contact')
    expect(html).toContain('Your Name / Organizer *')
    expect(html).toContain('Contact WhatsApp / Phone *')
  })

  it('renders all 5 listing payment plans with durations and pricing in INR', () => {
    const html = renderToStaticMarkup(
      <CommunityListingModal isOpen={true} onClose={vi.fn()} defaultCategory="venue" />
    )

    // Plans Section Heading
    expect(html).toContain('Select Listing Plan &amp; Duration *')

    // 1-Day Flash / Single-day Pass (₹99)
    expect(html).toContain('1-Day Listing')
    expect(html).toContain('24 Hours (1 Day)')
    expect(html).toContain('₹99')

    // 1-Month Plan (₹499)
    expect(html).toContain('1-Month Listing')
    expect(html).toContain('30 Days (Monthly)')
    expect(html).toContain('₹499')

    // 6-Month Semi-Annual Plan (₹2,499)
    expect(html).toContain('6-Month Listing')
    expect(html).toContain('180 Days (Semi-Annual)')
    expect(html).toContain('₹2,499')

    // 1-Year Annual Plan (₹4,499)
    expect(html).toContain('1-Year Listing')
    expect(html).toContain('365 Days (Annual)')
    expect(html).toContain('₹4,499')

    // Lifelong / Lifetime Plan (₹9,999)
    expect(html).toContain('Lifelong Listing')
    expect(html).toContain('Lifetime (Never Expires)')
    expect(html).toContain('₹9,999')
    expect(html).toContain('VIP Lifetime')
  })
})
