import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PricingPage from './PricingPage'
import {
  ATHLETE_PLANS,
  ACADEMY_PLANS,
  VENUE_PLANS,
  ORGANIZER_BOOST_PLANS,
  PRICING_FAQS,
} from './pricingPlansData'

describe('PricingPage Component', () => {
  it('renders hero title, breadcrumb, badge, and stats ribbon', () => {
    const html = renderToStaticMarkup(<PricingPage />)

    expect(html).toContain('Simple, Transparent Sports Memberships')
    expect(html).toContain('Pricing &amp; Memberships')
    expect(html).toContain('Free directory listings · Memberships are separate')
    expect(html).toContain('Venue, coach &amp; trial submissions')
    expect(html).toContain('No paid verification')
    expect(html).not.toContain('45,000+')
    expect(html).not.toContain('850+')
  })

  it('renders audience switcher buttons and billing cycle options', () => {
    const html = renderToStaticMarkup(<PricingPage />)

    expect(html).toContain('Khiladi / Athlete Pass')
    expect(html).toContain('Academies &amp; Coaches')
    expect(html).toContain('Turfs &amp; Grounds')
    expect(html).toContain('Trials &amp; Opportunities')
    expect(html).toContain('Monthly Billing')
    expect(html).toContain('Annual Billing')
    expect(html).toContain('Save up to 50%')
  })

  it('renders default athlete plans with pricing and features', () => {
    const html = renderToStaticMarkup(<PricingPage />)

    for (const plan of ATHLETE_PLANS) {
      expect(html).toContain(plan.name.replace(/&/g, '&amp;'))
      expect(html).toContain(plan.hindiName)
    }
    expect(html).toContain('Most Popular for Khiladis')
    expect(html).toContain('Golden Verified Scout Badge on your digital Sports CV')
    expect(html).toContain('Instant WhatsApp &amp; SMS Trial Alerts')
  })

  it('renders academy plans when initialSegment="academy"', () => {
    const html = renderToStaticMarkup(<PricingPage initialSegment="academy" />)

    for (const plan of ACADEMY_PLANS) {
      expect(html).toContain(plan.name.replace(/&/g, '&amp;'))
      expect(html).toContain(plan.hindiName)
    }
    expect(html).toContain('Direct WhatsApp admissions routing')
    expect(html).toContain('Best for Academies')
    expect(html).toContain('Host Selection Trials &amp; Camps')
  })

  it('renders venue plans when initialSegment="venue"', () => {
    const html = renderToStaticMarkup(<PricingPage initialSegment="venue" />)

    for (const plan of VENUE_PLANS) {
      expect(html).toContain(plan.name.replace(/&/g, '&amp;'))
      expect(html).toContain(plan.hindiName)
    }
    expect(html).toContain('Free Venue Listing')
    expect(html).toContain('No listing subscription or checkout')
    expect(html).toContain('Venue, coach and trial listings are free. Verification is not for sale.')
    expect(html).not.toContain('Featured #1 placement')
  })

  it('renders organizer boost plans when initialSegment="organizer"', () => {
    const html = renderToStaticMarkup(<PricingPage initialSegment="organizer" />)

    for (const plan of ORGANIZER_BOOST_PLANS) {
      expect(html).toContain(plan.name.replace(/&/g, '&amp;'))
      expect(html).toContain(plan.hindiName)
    }
    expect(html).toContain('Free Trial &amp; Opportunity Listing')
    expect(html).toContain('No listing payment, boost fee or subscription')
    expect(html).not.toContain('Pinned &quot;Featured Trial&quot; top card')
  })

  it('renders interactive ROI Simulator for academies', () => {
    const html = renderToStaticMarkup(<PricingPage initialSegment="academy" />)

    expect(html).toContain('How KhelGrid Academy Partner Pays For Itself')
    expect(html).toContain('Return on Investment Simulator')
    expect(html).toContain('ESTIMATED ANNUAL REVENUE ADDED')
    expect(html).toContain('Net Annual Profit Gain:')
    expect(html).toContain('New Students Enrolled via KhelGrid / Month')
  })

  it('renders trust and safety guarantee cards', () => {
    const html = renderToStaticMarkup(<PricingPage />)

    expect(html).toContain('Evidence-led trial review')
    expect(html).toContain('No payment for directory listings')
    expect(html).toContain('Clear fee information')
  })

  it('renders FAQ accordion section with questions and answers', () => {
    const html = renderToStaticMarkup(<PricingPage />)

    expect(html).toContain('Frequently Asked Questions')
    for (const faq of PRICING_FAQS) {
      const qClean = faq.question.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      expect(html).toContain(qClean)
      expect(html).toContain(faq.hindiQuestion.replace(/"/g, '&quot;'))
    }
    // First FAQ is open by default
    expect(html).toContain('No. Venue, coach and sports-trial directory submissions and evidence review are free.')
  })

  it('renders enterprise CSR partnership section with contact links', () => {
    const html = renderToStaticMarkup(<PricingPage />)

    expect(html).toContain('State Federations &amp; CSR Foundations')
    expect(html).toContain('Looking to Sponsor Grassroots Athletes or District Combines?')
    expect(html).toContain('Contact CSR Partnerships')
    expect(html).toContain('mailto:khelgrid@gmail.com?subject=CSR%20Sports%20Sponsorship%20Enquiry')
  })
})
