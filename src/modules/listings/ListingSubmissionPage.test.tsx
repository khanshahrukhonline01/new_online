import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ListingSubmissionPage from './ListingSubmissionPage'

describe('ListingSubmissionPage Submitter Experience Suite', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders intake form with all 7 supported categories and privacy notices', () => {
    const html = renderToStaticMarkup(<ListingSubmissionPage />)
    expect(html).toContain('Sports Directory &amp; Listing Intake')
    expect(html).toContain('Editorial Verification First')
    expect(html).toContain('Suggest a Listing')
    expect(html).toContain('Track Submission Status')

    // 7 categories
    expect(html).toContain('Sports Trial / Selection Camp')
    expect(html).toContain('Sports Venue / Arena / Turf')
    expect(html).toContain('Academy / Training Centre')
    expect(html).toContain('Coach / Personal Trainer')
    expect(html).toContain('Tournament / Sports Event')
    expect(html).toContain('Community Pickup Game')
    expect(html).toContain('New Sport Suggestion')

    // Privacy notice
    expect(html).toContain('We collect only listing details. Suggestions are not public catalogue records.')
  })

  it('renders tracking tab with reference number and private tracking key inputs', () => {
    const html = renderToStaticMarkup(<ListingSubmissionPage defaultTab="track" />)
    expect(html).toContain('Track Your Submission')
    expect(html).toContain('Reference Number *')
    expect(html).toContain('Private Tracking Key')
    expect(html).toContain('Check Status')
    expect(html).toContain('KHL-')
  })
})
