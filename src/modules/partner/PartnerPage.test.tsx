import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PartnerPage from './PartnerPage'

describe('PartnerPage — Institutional Partnerships with KhelGrid', () => {
  it('renders the hero section with active badges and fast-track onboarding actions', () => {
    const html = renderToStaticMarkup(<PartnerPage />)

    expect(html).toContain('Institutional Partnerships')
    expect(html).toContain('500+ Active Partners Across India')
    expect(html).toContain('Partner with India’s Fastest Growing Sports Opportunity Network')
    expect(html).toContain('Apply for Partnership')
    expect(html).toContain('Open Partner Dashboard')
    expect(html).toContain('Suggest a Listing')
    expect(html).toContain('Direct Onboarding Concierge:')
    expect(html).toContain('+91 98765 43210')
    expect(html).toContain('partners@khelgrid.com')
  })

  it('renders all 4 institutional partnership tracks with benefits and action buttons', () => {
    const html = renderToStaticMarkup(<PartnerPage />)

    // Track 1: Academies
    expect(html).toContain('Sports Academies &amp; Coaching Centers')
    expect(html).toContain('Trials &amp; Talent Pipeline')
    expect(html).toContain('Official KhelGrid Verified Academy Badge')
    expect(html).toContain('Join as Sports Academy')
    expect(html).toContain('/academies')

    // Track 2: Venues & Turfs
    expect(html).toContain('Venues, Turfs &amp; Sports Complexes')
    expect(html).toContain('Bookings &amp; Monetization')
    expect(html).toContain('Zero platform commission on grassroots community trials')
    expect(html).toContain('Join as Venue / Turf Owner')
    expect(html).toContain('/venues')

    // Track 3: Tournaments
    expect(html).toContain('Tournament Organizers &amp; Associations')
    expect(html).toContain('Event Operations &amp; Brackets')
    expect(html).toContain('Digital player registration &amp; tamper-proof roster management')
    expect(html).toContain('Join as Tournament Organizer')
    expect(html).toContain('/calendar')

    // Track 4: Corporate Sponsors
    expect(html).toContain('Corporate Brands &amp; Athlete Sponsors')
    expect(html).toContain('Sponsorship &amp; Grassroots CSR')
    expect(html).toContain('Direct-to-athlete transparent grant and scholarship disbursement')
    expect(html).toContain('Join as Sponsor / CSR Partner')
    expect(html).toContain('/talent-scanner')
  })

  it('renders national institutional ecosystem credentials and social proof', () => {
    const html = renderToStaticMarkup(<PartnerPage />)

    expect(html).toContain('NATIONAL ATHLETIC FOOTPRINT')
    expect(html).toContain('Trusted by &amp; Aggregated with India’s Premier Institutions')
    expect(html).toContain('Sports Authority of India')
    expect(html).toContain('Inspire Institute of Sport')
    expect(html).toContain('Tata Football Academy')
    expect(html).toContain('Pullela Gopichand Badminton')
    expect(html).toContain('Army Sports Institute')
    expect(html).toContain('Prakash Padukone Academy')
  })

  it('renders the interactive ROI and revenue reach calculator', () => {
    const html = renderToStaticMarkup(<PartnerPage />)

    expect(html).toContain('ROI &amp; Reach Simulator')
    expect(html).toContain('Estimate Your Reach &amp; Revenue on KhelGrid')
    expect(html).toContain('Turf / Venue')
    expect(html).toContain('Hourly Slot Rate')
    expect(html).toContain('Projected Extra Monthly Revenue')
    expect(html).toContain('Projected Annual Turf Bookings')
    expect(html).toContain('Monthly Athlete Footfall')
    expect(html).toContain('Apply with this Capacity')
  })

  it('renders the 4-step onboarding workflow', () => {
    const html = renderToStaticMarkup(<PartnerPage />)

    expect(html).toContain('SIMPLE 4-STEP PROCESS')
    expect(html).toContain('How Verification &amp; Onboarding Works')
    expect(html).toContain('01')
    expect(html).toContain('Submit Application')
    expect(html).toContain('02')
    expect(html).toContain('Verification Review')
    expect(html).toContain('03')
    expect(html).toContain('Inventory &amp; Profile Setup')
    expect(html).toContain('04')
    expect(html).toContain('Go Live Across India')
  })

  it('renders the partnership application form with all required fields', () => {
    const html = renderToStaticMarkup(<PartnerPage />)

    expect(html).toContain('Partnership Application')
    expect(html).toContain('Get Started in 24 Hours')
    expect(html).toContain('Organization / Academy / Facility Name')
    expect(html).toContain('Partner Category')
    expect(html).toContain('Primary Contact Person')
    expect(html).toContain('Official Email Address')
    expect(html).toContain('Phone / WhatsApp Number')
    expect(html).toContain('City / State')
    expect(html).toContain('Sports Offered / Supported')
    expect(html).toContain('Facility Details or Partnership Goals')
    expect(html).toContain('Submit Partnership Request')
  })

  it('renders partner testimonials and frequently asked questions', () => {
    const html = renderToStaticMarkup(<PartnerPage />)

    // Testimonials
    expect(html).toContain('VOICES FROM THE GROUND')
    expect(html).toContain('What Our Partners Say')
    expect(html).toContain('Greenfield Sports Arena, Bengaluru')
    expect(html).toContain('Apex Athletic Combine, Pune')
    expect(html).toContain('Bengal Grassroots Football League, Kolkata')

    // FAQs
    expect(html).toContain('Frequently Asked Questions')
    expect(html).toContain('How long does the partner verification process take?')
    expect(html).toContain('Is there any fee to publish grassroots selection trials?')
    expect(html).toContain('How do venue and turf booking payouts work?')
    expect(html).toContain('Can I manage multiple turfs or academy branches?')
  })

  it('renders valid Schema.org WebPage JSON-LD structured data', () => {
    const html = renderToStaticMarkup(<PartnerPage />)

    expect(html).toContain('"@type":"WebPage"')
    expect(html).toContain('"name":"Partner with KhelGrid · Academies, Venues & Tournament Organizers"')
    expect(html).toContain('"@type":"SportsOrganization"')
    expect(html).toContain('"url":"https://khelgrid.com/partner"')
  })
})
