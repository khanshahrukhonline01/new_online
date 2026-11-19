import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ListingSubmissionPage, {
  buildListingDirectEmail,
  buildListingWhatsAppShare,
  getPublishedListingUrl,
  getStepClass,
} from './ListingSubmissionPage'
import type { SubmissionTrackingDetails } from '../../integrations/supabase/public-client'

describe('ListingSubmissionPage Submitter Experience Suite', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders intake form with all 7 supported categories and privacy notices', () => {
    const html = renderToStaticMarkup(<ListingSubmissionPage />)
    expect(html).toContain('Put your sports listing on the map.')
    expect(html).toContain('Venue, coach and sports-trial submissions are free.')
    expect(html).toContain('Venue, coach and sports-trial submissions are free')
    expect(html).toContain('Submit for moderator review')
    expect(html).toContain('Suggest a Listing')
    expect(html).toContain('Track Submission Status')
    expect(html).toContain('Direct Email (khelgrid@gmail.com)')

    // 7 categories
    expect(html).toContain('Sports Trial / Selection Camp')
    expect(html).toContain('Sports Venue / Arena / Turf')
    expect(html).toContain('Academy / Training Centre')
    expect(html).toContain('Coach / Personal Trainer')
    expect(html).toContain('Tournament / Sports Event')
    expect(html).toContain('Community Pickup Game')
    expect(html).toContain('New Sport Suggestion')

    // Privacy notice
    expect(html).toContain('Your submission stays private while a moderator checks the source')

    // Concierge email banner on suggestion tab
    expect(html).toContain('Direct Registration Route via Email (khelgrid@gmail.com)')
    expect(html).toContain('khelgrid@gmail.com')
  })

  it('renders tracking tab with reference number and private tracking key inputs', () => {
    const html = renderToStaticMarkup(<ListingSubmissionPage defaultTab="track" />)
    expect(html).toContain('Track Your Submission')
    expect(html).toContain('Reference Number *')
    expect(html).toContain('Private Tracking Key')
    expect(html).toContain('Check Status')
    expect(html).toContain('KHL-')
  })

  it('renders direct email registration desk when defaultTab="email" with direct mailto:khelgrid@gmail.com link and live template preview', () => {
    const html = renderToStaticMarkup(<ListingSubmissionPage defaultTab="email" />)
    expect(html).toContain('Direct Email Registration Desk · khelgrid@gmail.com')
    expect(html).toContain('khelgrid@gmail.com')
    expect(html).toContain('mailto:khelgrid@gmail.com')
    expect(html).toContain('Send Direct Email to khelgrid@gmail.com')
    expect(html).toContain('Copy Email Template')

    // 7 categories are present in email selector
    expect(html).toContain('Sports Venue / Arena / Turf')
    expect(html).toContain('Academy / Training Centre')
    expect(html).toContain('Coach / Personal Trainer')
    expect(html).toContain('Sports Trial / Selection Camp')
    expect(html).toContain('Tournament / Sports Event')
    expect(html).toContain('Community Pickup Game')
    expect(html).toContain('New Sport Suggestion')

    // Live preview bar and body
    expect(html).toContain('RECIPIENT')
    expect(html).toContain('SUBJECT LINE')
    expect(html).toContain('Dear KhelGrid Onboarding &amp; Moderation Team')
  })

  it('buildListingDirectEmail correctly structures subjects, email bodies, and mailto URLs across categories', () => {
    const trialEmail = buildListingDirectEmail({
      category: 'opportunity',
      title: 'State Open Football Selection Combine',
      city: 'Kochi, Kerala',
      contactName: 'Coach V. Nair',
      contactPhone: '+91 98470 12345',
      sourceUrl: 'https://keralafootball.org/trials-2026',
      details: 'U-17 selection camp, synthetic turf pitch, 3-day combine.',
      submitterEmail: 'coach.nair@example.com',
    })

    expect(trialEmail.subject).toContain('[KhelGrid Registration Request]')
    expect(trialEmail.subject).toContain('Sports Trial / Selection Camp')
    expect(trialEmail.subject).toContain('State Open Football Selection Combine')

    expect(trialEmail.body).toContain('State Open Football Selection Combine')
    expect(trialEmail.body).toContain('Kochi, Kerala')
    expect(trialEmail.body).toContain('Coach V. Nair')
    expect(trialEmail.body).toContain('+91 98470 12345')
    expect(trialEmail.body).toContain('https://keralafootball.org/trials-2026')
    expect(trialEmail.body).toContain('U-17 selection camp')

    expect(trialEmail.mailtoUrl).toContain('mailto:khelgrid@gmail.com')
    expect(trialEmail.mailtoUrl).toContain(encodeURIComponent('State Open Football Selection Combine'))
  })

  it('getPublishedListingUrl resolves direct canonical and clean slug URLs for each category', () => {
    expect(getPublishedListingUrl('pickup_game', 'Sunday Morning Football')).toBe('/pickup-games/sunday-morning-football')
    expect(getPublishedListingUrl('venue', 'Kanteerava Indoor Stadium')).toBe('/venues/kanteerava-indoor-stadium')
    expect(getPublishedListingUrl('coach', 'Coach Arun Sharma (Badminton)')).toBe('/coaches/coach-arun-sharma-badminton')
    expect(getPublishedListingUrl('academy', 'Tata Football Academy Jamshedpur')).toBe('/academies/tata-football-academy-jamshedpur')
    expect(getPublishedListingUrl('opportunity', 'U-17 Football Selection Trials')).toBe('/opportunities/u-17-football-selection-trials')
    expect(getPublishedListingUrl('event', 'Bengaluru Open Tennis Tournament')).toBe('/events/bengaluru-open-tennis-tournament')
  })

  it('buildListingWhatsAppShare creates community announcement message and wa.me link', () => {
    const pickupShare = buildListingWhatsAppShare({
      listingType: 'pickup_game',
      title: 'Indiranagar 5v5 Turf Football',
      origin: 'https://khelgrid.com',
    })

    expect(pickupShare.path).toBe('/pickup-games/indiranagar-5v5-turf-football')
    expect(pickupShare.fullUrl).toBe('https://khelgrid.com/pickup-games/indiranagar-5v5-turf-football')
    expect(pickupShare.message).toContain('Our game "Indiranagar 5v5 Turf Football" is officially live on KhelGrid!')
    expect(pickupShare.message).toContain('https://khelgrid.com/pickup-games/indiranagar-5v5-turf-football')
    expect(pickupShare.shareUrl).toBe(`https://wa.me/?text=${encodeURIComponent(pickupShare.message)}`)

    const venueShare = buildListingWhatsAppShare({
      listingType: 'venue',
      title: 'Smash Point Badminton Arena',
      origin: 'https://khelgrid.com',
    })
    expect(venueShare.message).toContain('Our venue "Smash Point Badminton Arena" is officially live on KhelGrid!')
    expect(venueShare.shareUrl).toContain('https%3A%2F%2Fkhelgrid.com%2Fvenues%2Fsmash-point-badminton-arena')
  })

  it('getStepClass accurately computes step classes across the 5 moderation stages', () => {
    // Stage 1: submitted
    expect(getStepClass('submitted', 'pending_review')).toBe('completed')
    expect(getStepClass('submitted', 'published')).toBe('completed')

    // Stage 2: editorial_review
    expect(getStepClass('editorial_review', 'pending_review')).toBe('active')
    expect(getStepClass('editorial_review', 'under_review')).toBe('completed')
    expect(getStepClass('editorial_review', 'changes_requested')).toBe('changes_requested')
    expect(getStepClass('editorial_review', 'rejected')).toBe('rejected')

    // Stage 3: desk_verified
    expect(getStepClass('desk_verified', 'pending_review')).toBe('')
    expect(getStepClass('desk_verified', 'under_review')).toBe('active')
    expect(getStepClass('desk_verified', 'approved')).toBe('completed')
    expect(getStepClass('desk_verified', 'published')).toBe('completed')

    // Stage 4: approved
    expect(getStepClass('approved', 'under_review')).toBe('')
    expect(getStepClass('approved', 'approved')).toBe('completed')
    expect(getStepClass('approved', 'published')).toBe('completed')

    // Stage 5: live
    expect(getStepClass('live', 'under_review')).toBe('')
    expect(getStepClass('live', 'approved')).toBe('active')
    expect(getStepClass('live', 'published')).toBe('completed')
  })

  it('renders 5-stage visual progress bar on tracking screen with all 5 labels', () => {
    const mockSubmission: SubmissionTrackingDetails = {
      id: 'sub-1',
      reference_number: 'KHL-20261119-TEST01',
      listing_type: 'pickup_game',
      title: 'South Delhi Weekend Cricket',
      city: 'Delhi',
      source_url: 'https://example.com/cricket',
      details: 'Friendly 20-over match',
      status: 'under_review',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    }

    const html = renderToStaticMarkup(
      <ListingSubmissionPage defaultTab="track" initialTrackedSubmission={mockSubmission} />
    )

    // 5-Stage Visual Progress Bar labels
    expect(html).toContain('Submitted')
    expect(html).toContain('Editorial Review')
    expect(html).toContain('Desk Verified')
    expect(html).toContain('Approved')
    expect(html).toContain('Live on KhelGrid')

    // Active under review banner
    expect(html).toContain('Under Active Review &amp; Desk Verification')
    expect(html).toContain('South Delhi Weekend Cricket')
    expect(html).toContain('KHL-20261119-TEST01')
  })

  it('renders green "Live on KhelGrid!" celebratory card with direct link and WhatsApp share when status is published', () => {
    const publishedSubmission: SubmissionTrackingDetails = {
      id: 'sub-2',
      reference_number: 'KHL-20261119-LIVE99',
      listing_type: 'venue',
      title: 'Kanteerava Sports Complex',
      city: 'Bengaluru, Karnataka',
      source_url: 'https://kanteeravastadium.in',
      details: 'Synthetic running track and outdoor courts',
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 2,
    }

    const html = renderToStaticMarkup(
      <ListingSubmissionPage defaultTab="track" initialTrackedSubmission={publishedSubmission} />
    )

    // 5-stage progress bar all completed
    expect(html).toContain('Submitted')
    expect(html).toContain('Editorial Review')
    expect(html).toContain('Desk Verified')
    expect(html).toContain('Approved')
    expect(html).toContain('Live on KhelGrid')

    // Celebratory card
    expect(html).toContain('OFFICIALLY VERIFIED &amp; LIVE')
    expect(html).toContain('Live on KhelGrid!')
    expect(html).toContain('Your sports listing has passed editorial review and desk verification.')

    // Direct button
    expect(html).toContain('View Live Listing on KhelGrid')
    expect(html).toContain('href="/venues/kanteerava-sports-complex"')

    // 1-Click WhatsApp Share button
    expect(html).toContain('Share on WhatsApp')
    expect(html).toContain('https://wa.me/?text=')
    expect(html).toContain(encodeURIComponent('Our venue "Kanteerava Sports Complex" is officially live on KhelGrid!'))

    // Direct URL display
    expect(html).toContain('Direct Public Website Link:')
    expect(html).toContain('/venues/kanteerava-sports-complex')
  })
})
