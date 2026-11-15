import { useState, useId, useMemo, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './PartnerPage.css'

export interface PartnerPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  onOpenIntake?: (category?: 'academy' | 'venue' | 'opportunity' | 'pickup_game') => void
}

interface PartnerTrack {
  id: string
  icon: 'building' | 'calendar-check' | 'trophy' | 'award'
  title: string
  tag: string
  colorTone: 'amber' | 'emerald' | 'purple' | 'blue'
  description: string
  benefits: string[]
  formValue: string
  ctaText: string
  directoryLink: string
  directoryLabel: string
}

const PARTNER_TRACKS: PartnerTrack[] = [
  {
    id: 'academies',
    icon: 'building',
    title: 'Sports Academies & Coaching Centers',
    tag: 'Trials & Talent Pipeline',
    colorTone: 'amber',
    description:
      'Publish sanctioned trials, scout-verified assessments, and seasonal training camps. Attract high-potential athletes with transparent verification badges.',
    benefits: [
      'Official KhelGrid Verified Academy Badge & credibility seal',
      'Direct trial registrations & automated age/eligibility verification',
      'Talent Scout portal integration for elite athlete visibility',
      'Dedicated academy landing profile featuring NIS-certified coaches',
    ],
    formValue: 'Sports Academy',
    ctaText: 'Join as Sports Academy',
    directoryLink: '/academies',
    directoryLabel: 'Explore Academies Directory',
  },
  {
    id: 'venues',
    icon: 'calendar-check',
    title: 'Venues, Turfs & Sports Complexes',
    tag: 'Bookings & Monetization',
    colorTone: 'emerald',
    description:
      'Maximize court and pitch occupancy during off-peak and weekend hours. Receive direct digital payments and booking confirmations from players and local leagues.',
    benefits: [
      'Real-time court & slot management dashboard with UPI payouts',
      'Zero platform commission on grassroots community trials',
      'Instant UPI & direct bank payout settlements (daily / weekly)',
      'Top featured placement on local city turf discovery searches',
    ],
    formValue: 'Turf & Venue',
    ctaText: 'Join as Venue / Turf Owner',
    directoryLink: '/venues',
    directoryLabel: 'Explore Venues Directory',
  },
  {
    id: 'tournaments',
    icon: 'trophy',
    title: 'Tournament Organizers & Associations',
    tag: 'Event Operations & Brackets',
    colorTone: 'purple',
    description:
      'Run state, district, or institutional championships with digital scorecards, automated brackets, and player verification to eliminate age and eligibility fraud.',
    benefits: [
      'Digital player registration & tamper-proof roster management',
      'Live match updates and real-time tournament bracket automation',
      'Promoted tournament listings in national Sports Event Calendar',
      'Post-tournament tactical analytics publishing on KhelChronicle',
    ],
    formValue: 'Tournament Organizer',
    ctaText: 'Join as Tournament Organizer',
    directoryLink: '/calendar',
    directoryLabel: 'Explore Sports Calendar',
  },
  {
    id: 'sponsors',
    icon: 'award',
    title: 'Corporate Brands & Athlete Sponsors',
    tag: 'Sponsorship & Grassroots CSR',
    colorTone: 'blue',
    description:
      'Deploy sports scholarships, equipment grants, and grassroots CSR initiatives directly to verified, deserving athletes with verifiable performance records.',
    benefits: [
      'Direct-to-athlete transparent grant and scholarship disbursement',
      'Auditable impact reports and verifiable athletic telemetry',
      'Co-branded tournament and sports combine naming rights',
      'Grassroots athletic storytelling across 54+ sports disciplines',
    ],
    formValue: 'Brand Sponsor',
    ctaText: 'Join as Sponsor / CSR Partner',
    directoryLink: '/talent-scanner',
    directoryLabel: 'Explore Talent Scanner',
  },
]

const INSTITUTIONAL_PARTNERS = [
  { name: 'Sports Authority of India', sub: 'SAI NCOE Centers', tag: 'Govt Accreditation' },
  { name: 'Inspire Institute of Sport', sub: 'High Performance Bellary', tag: 'Olympic High Performance' },
  { name: 'Tata Football Academy', sub: 'Jamshedpur', tag: 'AIFF 4-Star Academy' },
  { name: 'Pullela Gopichand Badminton', sub: 'Hyderabad Center of Excellence', tag: 'BWF Accredited' },
  { name: 'Army Sports Institute', sub: 'ASI Pune', tag: 'Services Talent Pipeline' },
  { name: 'Prakash Padukone Academy', sub: 'PPBA Bengaluru', tag: 'National High Performance' },
]

const ONBOARDING_STEPS = [
  {
    step: '01',
    title: 'Submit Application',
    desc: 'Fill out the 2-minute partnership request below with facility or organization details.',
  },
  {
    step: '02',
    title: 'Verification Review',
    desc: 'Our compliance team checks credentials, facility standards, and safety within 24 hours.',
  },
  {
    step: '03',
    title: 'Inventory & Profile Setup',
    desc: 'Configure available court slots, coaching schedules, trial dates, or tournament rules.',
  },
  {
    step: '04',
    title: 'Go Live Across India',
    desc: 'Start receiving verified trial applicants, bookings, and direct athlete inquiries.',
  },
]

const PARTNER_TESTIMONIALS = [
  {
    quote:
      'KhelGrid doubled our weekend turf slot occupancy within the first 45 days. The UPI payout settlement system is transparent, automated, and effortless.',
    author: 'Rajeev Menon',
    role: 'Managing Partner',
    entity: 'Greenfield Sports Arena, Bengaluru',
    sport: 'Football & Box Cricket',
  },
  {
    quote:
      'Publishing our state selection trials on KhelGrid brought in over 340 verified junior applicants across Karnataka and Maharashtra without any age falsification disputes.',
    author: 'Coach Vikram Singh (NIS Gold Medalist)',
    role: 'Director of Coaching',
    entity: 'Apex Athletic Combine, Pune',
    sport: 'Athletics & Badminton',
  },
  {
    quote:
      'The automated bracket integration and verified athlete CVs streamlined our district football championship. KhelGrid is indispensable for modern sports operations.',
    author: 'Arunav Sengupta',
    role: 'General Secretary',
    entity: 'Bengal Grassroots Football League, Kolkata',
    sport: 'Football',
  },
]

const PARTNER_FAQS = [
  {
    q: 'How long does the partner verification process take?',
    a: 'Initial review is completed within 24 business hours. Once you submit the form, a dedicated KhelGrid partner manager will contact you via email and WhatsApp to verify documents, photos, and coach credentials.',
  },
  {
    q: 'Is there any fee to publish grassroots selection trials?',
    a: 'No. Sanctioned, free-to-enter grassroots trials and federation selection combines can be published on KhelGrid with 0% platform listing fee to support Indian youth athletics.',
  },
  {
    q: 'How do venue and turf booking payouts work?',
    a: 'When athletes book slots through KhelGrid, payments are collected digitally via secure UPI / Net Banking. Payouts are settled directly into your registered bank account on a daily or weekly schedule with 0 hidden fees.',
  },
  {
    q: 'Can I manage multiple turfs or academy branches?',
    a: 'Yes. Our Host & Partner Dashboard supports multi-facility inventory. You can manage multiple cities, distinct turf surfaces, coach rosters, and schedules under a single master partner login.',
  },
  {
    q: 'What is required to earn the KhelGrid Verified Partner Badge?',
    a: 'Academies and venues must verify physical location, ownership/lease documents, certified coaching staff (NIS/SAI/Federation certified), and safe drinking water/medical first-aid amenities.',
  },
  {
    q: 'Can corporate brands sponsor specific talent categories?',
    a: 'Yes. Corporate CSR partners and brands can target specific age groups, economic strata, sports disciplines, or gender quotas with auditable biometric tracking via KhelGrid Talent Scanner.',
  },
]

interface PartnerInquirySubmission {
  id: string
  refCode: string
  orgName: string
  category: string
  contactName: string
  email: string
  phone: string
  city: string
  sports: string
  details: string
  submittedAt: string
}

export default function PartnerPage({ onNavigate, onOpenIntake }: PartnerPageProps = {}) {
  // Form State
  const [partnerType, setPartnerType] = useState<string>('Sports Academy')
  const [orgName, setOrgName] = useState<string>('')
  const [contactPerson, setContactPerson] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [sportsOffered, setSportsOffered] = useState<string>('')
  const [facilityDetails, setFacilityDetails] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [copiedRef, setCopiedRef] = useState<boolean>(false)

  // Interactive ROI Calculator State
  const [calculatorMode, setCalculatorMode] = useState<'venue' | 'academy' | 'tournament'>('venue')
  const [venueRatePerHour, setVenueRatePerHour] = useState<number>(1200)
  const [venueMonthlySlots, setVenueMonthlySlots] = useState<number>(45)

  const [academyStudents, setAcademyStudents] = useState<number>(25)
  const [academyMonthlyFee, setAcademyMonthlyFee] = useState<number>(3500)

  const [tournamentTeams, setTournamentTeams] = useState<number>(32)
  const [tournamentEntryFee, setTournamentEntryFee] = useState<number>(2500)

  // Active FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  const orgInputId = useId()
  const typeSelectId = useId()
  const contactInputId = useId()
  const emailInputId = useId()
  const phoneInputId = useId()
  const cityInputId = useId()
  const sportsInputId = useId()
  const detailsInputId = useId()

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    onNavigate?.(e, href)
  }

  const handleSelectTrack = (formValue: string) => {
    setPartnerType(formValue)
    const el = document.getElementById('partner-form-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Calculate dynamic ROI estimates
  const calculatedMetrics = useMemo(() => {
    if (calculatorMode === 'venue') {
      const grossMonthly = venueRatePerHour * venueMonthlySlots
      const annualGross = grossMonthly * 12
      const estimatedAthletes = venueMonthlySlots * 10
      return {
        primaryLabel: 'Projected Extra Monthly Revenue',
        primaryValue: `₹${grossMonthly.toLocaleString('en-IN')}`,
        secondaryLabel: 'Projected Annual Turf Bookings',
        secondaryValue: `₹${annualGross.toLocaleString('en-IN')}`,
        tertiaryLabel: 'Monthly Athlete Footfall',
        tertiaryValue: `${estimatedAthletes.toLocaleString('en-IN')}+ Players`,
      }
    }

    if (calculatorMode === 'academy') {
      const monthlyGross = academyStudents * academyMonthlyFee
      const annualGross = monthlyGross * 12
      const estimatedScoutViews = academyStudents * 40
      return {
        primaryLabel: 'Annual Admissions Gross Revenue',
        primaryValue: `₹${annualGross.toLocaleString('en-IN')}`,
        secondaryLabel: 'Monthly Coaching Subscription Pool',
        secondaryValue: `₹${monthlyGross.toLocaleString('en-IN')}`,
        tertiaryLabel: 'Scout Profile Impressions',
        tertiaryValue: `${estimatedScoutViews.toLocaleString('en-IN')}+ Views`,
      }
    }

    // Tournament
    const grossPrizePool = tournamentTeams * tournamentEntryFee
    const totalAthletes = tournamentTeams * 14
    return {
      primaryLabel: 'Tournament Gross Entry Pool',
      primaryValue: `₹${grossPrizePool.toLocaleString('en-IN')}`,
      secondaryLabel: 'Participating Youth Athletes',
      secondaryValue: `${totalAthletes.toLocaleString('en-IN')} Athletes`,
      tertiaryLabel: 'Digital Scorecard Viewers',
      tertiaryValue: `${(tournamentTeams * 350).toLocaleString('en-IN')}+ Live Views`,
    }
  }, [
    calculatorMode,
    venueRatePerHour,
    venueMonthlySlots,
    academyStudents,
    academyMonthlyFee,
    tournamentTeams,
    tournamentEntryFee,
  ])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!orgName.trim()) {
      setValidationError('Please enter your Organization or Academy name.')
      return
    }
    if (!contactPerson.trim()) {
      setValidationError('Please provide the primary contact person’s name.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setValidationError('Please provide a valid official email address.')
      return
    }
    if (!phone.trim() || phone.length < 8) {
      setValidationError('Please provide a valid contact phone or WhatsApp number.')
      return
    }
    if (!city.trim()) {
      setValidationError('Please provide the primary operating city or state.')
      return
    }

    setIsSubmitting(true)

    // Generate unique verification reference code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const refCode = `KG-PTR-2026-${randomSuffix}`

    const record: PartnerInquirySubmission = {
      id: `inquiry-${Date.now()}`,
      refCode,
      orgName: orgName.trim(),
      category: partnerType,
      contactName: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
      sports: sportsOffered.trim(),
      details: facilityDetails.trim(),
      submittedAt: new Date().toISOString(),
    }

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('khelgrid_partner_inquiries')
          const existing: PartnerInquirySubmission[] = stored ? JSON.parse(stored) : []
          existing.unshift(record)
          localStorage.setItem('khelgrid_partner_inquiries', JSON.stringify(existing))
          window.dispatchEvent(new CustomEvent('khelgrid:partner-inquiry-submitted', { detail: record }))
        } catch {
          // ignore storage error
        }
      }

      setIsSubmitting(false)
      setSubmittedRef(refCode)
    }, 500)
  }

  const handleCopyRef = () => {
    if (!submittedRef) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(submittedRef)
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    }
  }

  return (
    <main className="partner-page-shell" id="main-content">
      {/* JSON-LD Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Partner with KhelGrid · Academies, Venues & Tournament Organizers',
            description:
              'Partner with KhelGrid to list verified athletic trials, monetize sports turfs, and connect with thousands of scouts and youth athletes across India.',
            url: 'https://khelgrid.com/partner',
            isPartOf: {
              '@type': 'SportsOrganization',
              name: 'KhelGrid',
              url: 'https://khelgrid.com',
            },
          }),
        }}
      />

      {/* 1. HERO SECTION */}
      <section className="partner-hero" aria-label="Partner with KhelGrid Hero">
        <div className="partner-container">
          <div className="partner-hero-content">
            <div className="partner-hero-badges">
              <span className="partner-badge-primary">
                <SiteIcon name="handshake" size={14} />
                <span>Institutional Partnerships</span>
              </span>
              <span className="partner-badge-live">
                <span className="partner-live-dot" />
                <span>500+ Active Partners Across India</span>
              </span>
            </div>

            <h1 className="partner-hero-title">
              Partner with India’s Fastest Growing Sports Opportunity Network
            </h1>

            <p className="partner-hero-subtitle">
              Join leading academies, venues, and tournament organizers. Scale your reach, verify genuine sporting
              opportunities, and connect directly with thousands of athletes, coaches, and talent scouts.
            </p>

            <div className="partner-hero-actions">
              <a
                href="#partner-form-section"
                className="partner-btn-primary"
                onClick={e => {
                  e.preventDefault()
                  document.getElementById('partner-form-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                <span>Apply for Partnership</span>
                <SiteIcon name="arrow-right" size={14} />
              </a>

              <a
                href="/host"
                className="partner-btn-secondary"
                onClick={e => handleLink(e, '/host')}
              >
                <SiteIcon name="briefcase" size={14} />
                <span>Open Partner Dashboard</span>
              </a>

              <button
                type="button"
                className="partner-btn-ghost"
                onClick={() => onOpenIntake?.('academy')}
              >
                <SiteIcon name="plus" size={14} />
                <span>Suggest a Listing</span>
              </button>
            </div>

            {/* Fast-Track Contact Bar */}
            <div className="partner-fast-track">
              <span className="partner-fast-track-label">Direct Onboarding Concierge:</span>
              <a
                href="https://wa.me/919876543210?text=Hello%20KhelGrid%20Partnerships%20Team%2C%20I%20would%20like%20to%20partner%20with%20KhelGrid"
                target="_blank"
                rel="noopener noreferrer"
                className="partner-fast-track-link"
              >
                <SiteIcon name="phone" size={13} />
                <span>WhatsApp: +91 98765 43210</span>
              </a>
              <span className="partner-fast-track-divider">·</span>
              <a href="mailto:partners@khelgrid.com" className="partner-fast-track-link">
                <SiteIcon name="mail" size={13} />
                <span>partners@khelgrid.com</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ACCREDITED INSTITUTIONAL ECOSYSTEM SOCIAL PROOF */}
      <section className="partner-ecosystem-section" aria-label="Institutional Partners">
        <div className="partner-container">
          <div className="partner-ecosystem-header">
            <span className="partner-sub-eyebrow">NATIONAL ATHLETIC FOOTPRINT</span>
            <h2 className="partner-ecosystem-title">Trusted by &amp; Aggregated with India’s Premier Institutions</h2>
          </div>

          <div className="partner-ecosystem-grid">
            {INSTITUTIONAL_PARTNERS.map(inst => (
              <div key={inst.name} className="partner-ecosystem-card">
                <div className="partner-ecosystem-card-top">
                  <span className="partner-ecosystem-badge">{inst.tag}</span>
                  <SiteIcon name="shield-check" size={16} className="text-emerald" />
                </div>
                <strong className="partner-ecosystem-card-name">{inst.name}</strong>
                <span className="partner-ecosystem-card-sub">{inst.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. THE 4 PARTNERSHIP TRACKS */}
      <section className="partner-tracks-section" aria-label="Partnership Tracks">
        <div className="partner-container">
          <div className="partner-section-header">
            <span className="partner-sub-eyebrow">TAILORED OPPORTUNITY TRACKS</span>
            <h2 className="partner-section-heading">How You Can Partner with KhelGrid</h2>
            <p className="partner-section-desc">
              Whether you run a regional multi-sport academy, manage a synthetic floodlit turf, or organize state
              championships, KhelGrid provides the verification and digital tools you need to succeed.
            </p>
          </div>

          <div className="partner-tracks-grid">
            {PARTNER_TRACKS.map(track => (
              <div key={track.id} className={`partner-track-card tone-${track.colorTone}`}>
                <div className="partner-track-top">
                  <div className={`partner-track-icon-wrap tone-${track.colorTone}`}>
                    <SiteIcon name={track.icon} size={22} />
                  </div>
                  <span className="partner-track-tag">{track.tag}</span>
                </div>

                <h3 className="partner-track-title">{track.title}</h3>
                <p className="partner-track-desc">{track.description}</p>

                <div className="partner-track-benefits-list">
                  <span className="partner-benefits-heading">Key Partner Privileges:</span>
                  {track.benefits.map((b, idx) => (
                    <div key={idx} className="partner-benefit-item">
                      <SiteIcon name="check-circle" size={15} className="text-emerald" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>

                <div className="partner-track-footer">
                  <button
                    type="button"
                    className="partner-track-action-btn"
                    onClick={() => handleSelectTrack(track.formValue)}
                  >
                    <span>{track.ctaText}</span>
                    <SiteIcon name="arrow-right" size={13} />
                  </button>
                  <a
                    href={track.directoryLink}
                    onClick={e => handleLink(e, track.directoryLink)}
                    className="partner-track-dir-link"
                  >
                    <span>{track.directoryLabel}</span>
                    <SiteIcon name="arrow-up-right" size={11} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE REVENUE & REACH CALCULATOR */}
      <section className="partner-calculator-section" aria-label="Partner ROI and Revenue Estimator">
        <div className="partner-container">
          <div className="partner-calc-wrapper">
            <div className="partner-calc-intro">
              <span className="partner-calc-badge">
                <SiteIcon name="activity" size={13} />
                <span>ROI &amp; Reach Simulator</span>
              </span>
              <h2 className="partner-calc-title">Estimate Your Reach &amp; Revenue on KhelGrid</h2>
              <p className="partner-calc-desc">
                Simulate potential monthly revenue, footfall, and talent scout visibility based on your existing facility
                capacity and booking rates.
              </p>

              {/* Mode Toggle Tabs */}
              <div className="partner-calc-tabs" role="tablist">
                <button
                  type="button"
                  className={`partner-calc-tab${calculatorMode === 'venue' ? ' is-active' : ''}`}
                  onClick={() => setCalculatorMode('venue')}
                >
                  <SiteIcon name="calendar-check" size={14} />
                  <span>Turf / Venue</span>
                </button>
                <button
                  type="button"
                  className={`partner-calc-tab${calculatorMode === 'academy' ? ' is-active' : ''}`}
                  onClick={() => setCalculatorMode('academy')}
                >
                  <SiteIcon name="building" size={14} />
                  <span>Sports Academy</span>
                </button>
                <button
                  type="button"
                  className={`partner-calc-tab${calculatorMode === 'tournament' ? ' is-active' : ''}`}
                  onClick={() => setCalculatorMode('tournament')}
                >
                  <SiteIcon name="trophy" size={14} />
                  <span>Tournament</span>
                </button>
              </div>

              {/* Dynamic Sliders based on Mode */}
              <div className="partner-calc-inputs">
                {calculatorMode === 'venue' && (
                  <>
                    <div className="partner-calc-slider-group">
                      <div className="partner-calc-slider-labels">
                        <label htmlFor="venue-hourly-rate">Hourly Slot Rate</label>
                        <strong>₹{venueRatePerHour.toLocaleString('en-IN')}/hr</strong>
                      </div>
                      <input
                        id="venue-hourly-rate"
                        type="range"
                        min={500}
                        max={3500}
                        step={100}
                        value={venueRatePerHour}
                        onChange={e => setVenueRatePerHour(Number(e.target.value))}
                        className="partner-slider"
                      />
                    </div>
                    <div className="partner-calc-slider-group">
                      <div className="partner-calc-slider-labels">
                        <label htmlFor="venue-monthly-slots">Off-Peak &amp; Weekend Slots per Month</label>
                        <strong>{venueMonthlySlots} slots</strong>
                      </div>
                      <input
                        id="venue-monthly-slots"
                        type="range"
                        min={10}
                        max={160}
                        step={5}
                        value={venueMonthlySlots}
                        onChange={e => setVenueMonthlySlots(Number(e.target.value))}
                        className="partner-slider"
                      />
                    </div>
                  </>
                )}

                {calculatorMode === 'academy' && (
                  <>
                    <div className="partner-calc-slider-group">
                      <div className="partner-calc-slider-labels">
                        <label htmlFor="academy-fee">Monthly Coaching Fee per Student</label>
                        <strong>₹{academyMonthlyFee.toLocaleString('en-IN')}/mo</strong>
                      </div>
                      <input
                        id="academy-fee"
                        type="range"
                        min={1000}
                        max={12000}
                        step={250}
                        value={academyMonthlyFee}
                        onChange={e => setAcademyMonthlyFee(Number(e.target.value))}
                        className="partner-slider"
                      />
                    </div>
                    <div className="partner-calc-slider-group">
                      <div className="partner-calc-slider-labels">
                        <label htmlFor="academy-capacity">Target New Trainee Admissions per Year</label>
                        <strong>{academyStudents} Students</strong>
                      </div>
                      <input
                        id="academy-capacity"
                        type="range"
                        min={10}
                        max={150}
                        step={5}
                        value={academyStudents}
                        onChange={e => setAcademyStudents(Number(e.target.value))}
                        className="partner-slider"
                      />
                    </div>
                  </>
                )}

                {calculatorMode === 'tournament' && (
                  <>
                    <div className="partner-calc-slider-group">
                      <div className="partner-calc-slider-labels">
                        <label htmlFor="tourney-fee">Entry Fee per Team</label>
                        <strong>₹{tournamentEntryFee.toLocaleString('en-IN')}</strong>
                      </div>
                      <input
                        id="tourney-fee"
                        type="range"
                        min={500}
                        max={10000}
                        step={250}
                        value={tournamentEntryFee}
                        onChange={e => setTournamentEntryFee(Number(e.target.value))}
                        className="partner-slider"
                      />
                    </div>
                    <div className="partner-calc-slider-group">
                      <div className="partner-calc-slider-labels">
                        <label htmlFor="tourney-teams">Registered Teams</label>
                        <strong>{tournamentTeams} Teams</strong>
                      </div>
                      <input
                        id="tourney-teams"
                        type="range"
                        min={8}
                        max={128}
                        step={8}
                        value={tournamentTeams}
                        onChange={e => setTournamentTeams(Number(e.target.value))}
                        className="partner-slider"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Metrics Output Card */}
            <div className="partner-calc-results">
              <div className="partner-calc-result-header">
                <span className="partner-calc-metric-chip">Estimated Return</span>
                <span className="partner-calc-verified-badge">
                  <SiteIcon name="badge-check" size={13} />
                  <span>KhelGrid Projection</span>
                </span>
              </div>

              <div className="partner-calc-primary-metric">
                <span className="partner-calc-metric-label">{calculatedMetrics.primaryLabel}</span>
                <strong className="partner-calc-metric-number">{calculatedMetrics.primaryValue}</strong>
              </div>

              <div className="partner-calc-metric-grid">
                <div className="partner-calc-sub-metric">
                  <span className="partner-calc-sub-label">{calculatedMetrics.secondaryLabel}</span>
                  <strong className="partner-calc-sub-number">{calculatedMetrics.secondaryValue}</strong>
                </div>
                <div className="partner-calc-sub-metric">
                  <span className="partner-calc-sub-label">{calculatedMetrics.tertiaryLabel}</span>
                  <strong className="partner-calc-sub-number">{calculatedMetrics.tertiaryValue}</strong>
                </div>
              </div>

              <div className="partner-calc-callout">
                <SiteIcon name="shield-check" size={18} className="text-emerald shrink-0" />
                <p>
                  Calculated based on average 78% conversion velocity recorded across Bengaluru, Mumbai, and Delhi NCR
                  partner listings.
                </p>
              </div>

              <button
                type="button"
                className="partner-calc-cta"
                onClick={() => {
                  const formType =
                    calculatorMode === 'venue'
                      ? 'Turf & Venue'
                      : calculatorMode === 'academy'
                        ? 'Sports Academy'
                        : 'Tournament Organizer'
                  handleSelectTrack(formType)
                }}
              >
                <span>Apply with this Capacity</span>
                <SiteIcon name="arrow-right" size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 4-STEP ONBOARDING WORKFLOW */}
      <section className="partner-workflow-section" aria-label="Onboarding Workflow">
        <div className="partner-container">
          <div className="partner-section-header">
            <span className="partner-sub-eyebrow">SIMPLE 4-STEP PROCESS</span>
            <h2 className="partner-section-heading">How Verification &amp; Onboarding Works</h2>
            <p className="partner-section-desc">
              We uphold strict trust &amp; safety standards to protect youth athletes while ensuring our partner facilities
              get setup swiftly.
            </p>
          </div>

          <div className="partner-steps-grid">
            {ONBOARDING_STEPS.map(s => (
              <div key={s.step} className="partner-step-card">
                <span className="partner-step-number">{s.step}</span>
                <h3 className="partner-step-title">{s.title}</h3>
                <p className="partner-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. PARTNERSHIP APPLICATION FORM */}
      <section id="partner-form-section" className="partner-form-section" aria-label="Partnership Application Form">
        <div className="partner-container">
          <div className="partner-form-card">
            <div className="partner-form-header">
              <span className="partner-form-badge">
                <SiteIcon name="handshake" size={14} />
                <span>Partnership Application</span>
              </span>
              <h2 className="partner-form-title">Get Started in 24 Hours</h2>
              <p className="partner-form-subtitle">
                Submit your facility, academy, or organization details. Our dedicated institutional onboarding team will
                review your application and contact you promptly.
              </p>
            </div>

            {submittedRef ? (
              <div className="partner-success-state" role="status" aria-live="polite">
                <div className="partner-success-icon-wrap">
                  <SiteIcon name="check-circle" size={44} className="text-emerald" />
                </div>
                <h3 className="partner-success-title">Partnership Request Received!</h3>
                <p className="partner-success-desc">
                  Thank you for partnering with KhelGrid. Your application ticket has been registered in our verified
                  partner queue. A dedicated account manager will connect with you within 24 hours.
                </p>

                <div className="partner-ticket-box">
                  <span className="partner-ticket-label">Application Reference ID:</span>
                  <div className="partner-ticket-code-row">
                    <strong className="partner-ticket-code">{submittedRef}</strong>
                    <button
                      type="button"
                      className="partner-ticket-copy-btn"
                      onClick={handleCopyRef}
                      aria-label="Copy application reference code"
                    >
                      <SiteIcon name={copiedRef ? 'check' : 'copy'} size={14} />
                      <span>{copiedRef ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="partner-success-actions">
                  <a
                    href="https://wa.me/919876543210?text=Hello%20KhelGrid%20Team%2C%20I%20have%20submitted%20partnership%20application%20ref%3A%20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="partner-btn-primary"
                  >
                    <SiteIcon name="phone" size={14} />
                    <span>Chat with Onboarding Manager</span>
                  </a>

                  <button
                    type="button"
                    className="partner-btn-secondary"
                    onClick={() => {
                      setSubmittedRef(null)
                      setOrgName('')
                      setContactPerson('')
                      setEmail('')
                      setPhone('')
                      setCity('')
                      setSportsOffered('')
                      setFacilityDetails('')
                    }}
                  >
                    <span>Submit Another Application</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="partner-form" noValidate>
                {validationError && (
                  <div className="partner-form-error" role="alert">
                    <SiteIcon name="alert-circle" size={15} />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="partner-form-grid">
                  {/* Org Name */}
                  <div className="partner-form-field">
                    <label htmlFor={orgInputId} className="partner-form-label">
                      Organization / Academy / Facility Name <span className="req">*</span>
                    </label>
                    <input
                      id={orgInputId}
                      type="text"
                      className="partner-form-input"
                      placeholder="e.g. Apex Cricket Academy or FSV Sports Arena"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Partner Type */}
                  <div className="partner-form-field">
                    <label htmlFor={typeSelectId} className="partner-form-label">
                      Partner Category <span className="req">*</span>
                    </label>
                    <select
                      id={typeSelectId}
                      className="partner-form-select"
                      value={partnerType}
                      onChange={e => setPartnerType(e.target.value)}
                      required
                    >
                      <option value="Sports Academy">Sports Academy / Coaching Facility</option>
                      <option value="Turf & Venue">Turf / Sports Complex / Court Owner</option>
                      <option value="Tournament Organizer">Tournament Organizer / Association</option>
                      <option value="Brand Sponsor">Corporate Sponsor / CSR Foundation</option>
                    </select>
                  </div>

                  {/* Primary Contact Person */}
                  <div className="partner-form-field">
                    <label htmlFor={contactInputId} className="partner-form-label">
                      Primary Contact Person <span className="req">*</span>
                    </label>
                    <input
                      id={contactInputId}
                      type="text"
                      className="partner-form-input"
                      placeholder="e.g. Coach Vikram Singh / Facility Manager"
                      value={contactPerson}
                      onChange={e => setContactPerson(e.target.value)}
                      required
                    />
                  </div>

                  {/* Official Email */}
                  <div className="partner-form-field">
                    <label htmlFor={emailInputId} className="partner-form-label">
                      Official Email Address <span className="req">*</span>
                    </label>
                    <input
                      id={emailInputId}
                      type="email"
                      className="partner-form-input"
                      placeholder="director@academy.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Phone / WhatsApp */}
                  <div className="partner-form-field">
                    <label htmlFor={phoneInputId} className="partner-form-label">
                      Phone / WhatsApp Number <span className="req">*</span>
                    </label>
                    <input
                      id={phoneInputId}
                      type="tel"
                      className="partner-form-input"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  {/* City & State */}
                  <div className="partner-form-field">
                    <label htmlFor={cityInputId} className="partner-form-label">
                      City / State <span className="req">*</span>
                    </label>
                    <input
                      id={cityInputId}
                      type="text"
                      className="partner-form-input"
                      placeholder="e.g. Bengaluru, Karnataka or New Delhi"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      required
                    />
                  </div>

                  {/* Sports Offered */}
                  <div className="partner-form-field full-width">
                    <label htmlFor={sportsInputId} className="partner-form-label">
                      Sports Offered / Supported
                    </label>
                    <input
                      id={sportsInputId}
                      type="text"
                      className="partner-form-input"
                      placeholder="e.g. Cricket, Football, Badminton, Swimming, Athletics, Pickleball"
                      value={sportsOffered}
                      onChange={e => setSportsOffered(e.target.value)}
                    />
                  </div>

                  {/* Facility Details / Goals */}
                  <div className="partner-form-field full-width">
                    <label htmlFor={detailsInputId} className="partner-form-label">
                      Facility Details or Partnership Goals
                    </label>
                    <textarea
                      id={detailsInputId}
                      rows={3}
                      className="partner-form-textarea"
                      placeholder="Tell us about your upcoming trials, number of courts/pitches, or specific requirements..."
                      value={facilityDetails}
                      onChange={e => setFacilityDetails(e.target.value)}
                    />
                  </div>
                </div>

                <div className="partner-form-footer">
                  <span className="partner-form-privacy-note">
                    <SiteIcon name="shield-check" size={13} className="text-emerald" />
                    <span>Your contact information is confidential and protected by KhelGrid Trust Policy.</span>
                  </span>

                  <button
                    type="submit"
                    className="partner-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <SiteIcon name="loader" size={14} className="partner-spinner" />
                        <span>Submitting Application…</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Partnership Request</span>
                        <SiteIcon name="arrow-right" size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 7. PARTNER TESTIMONIALS */}
      <section className="partner-testimonials-section" aria-label="Partner Testimonials">
        <div className="partner-container">
          <div className="partner-section-header">
            <span className="partner-sub-eyebrow">VOICES FROM THE GROUND</span>
            <h2 className="partner-section-heading">What Our Partners Say</h2>
          </div>

          <div className="partner-testimonials-grid">
            {PARTNER_TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="partner-testimonial-card">
                <p className="partner-testimonial-quote">“{t.quote}”</p>
                <div className="partner-testimonial-author-row">
                  <div>
                    <strong className="partner-author-name">{t.author}</strong>
                    <span className="partner-author-role">{t.role}</span>
                    <span className="partner-author-entity">{t.entity}</span>
                  </div>
                  <span className="partner-author-sport">{t.sport}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS */}
      <section className="partner-faq-section" aria-label="Partnership Frequently Asked Questions">
        <div className="partner-container">
          <div className="partner-section-header">
            <span className="partner-sub-eyebrow">HELP &amp; CLARITY</span>
            <h2 className="partner-section-heading">Frequently Asked Questions</h2>
          </div>

          <div className="partner-faq-accordion">
            {PARTNER_FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div key={idx} className={`partner-faq-item${isOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="partner-faq-question"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <SiteIcon name={isOpen ? 'chevron-down' : 'chevron-right'} size={16} />
                  </button>
                  {isOpen && (
                    <div className="partner-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
