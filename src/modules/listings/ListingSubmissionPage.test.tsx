import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ListingSubmissionPage, { buildListingDirectEmail } from './ListingSubmissionPage'

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
})
