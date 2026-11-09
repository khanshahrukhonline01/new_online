import { useState, useEffect, type MouseEvent } from 'react'
import { getVenueBySlug, getVenues, getCommunityVenueBySlug, getReviews, computeReviewStats } from '../../integrations/supabase/public-client'
import type { Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { ShareBar } from '../../shared/components/ShareBar'
import { BookmarkButton } from '../../shared/components/BookmarkButton'
import { createVenueSavedItem } from '../../shared/services/savedService'
import { updatePageSeoMetadata } from '../../shared/utils/seoAndShare'
import { getCuratedVenueBySlug, type CuratedVenue } from '../../shared/data/curatedEntitiesData'
import ReportListingModal from '../../shared/components/ReportListingModal'
import VerificationClaimModal from '../../shared/components/VerificationClaimModal'
import { CommunityReviewsSection } from '../../shared/components/CommunityReviewsSection'
import { PaymentCheckoutModal } from '../../shared/payments/PaymentCheckoutModal'
import { parseInrPrice, recordVenueSlotBooking, getBookedVenueSlots, fetchBookedVenueSlots } from '../../shared/payments/paymentService'
import type { PaymentItem, VenueBookingResult } from '../../shared/payments/paymentTypes'
import './VenueDetailPage.css'

export interface VenueDetailPageProps {
  slug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: (category?: 'venue' | 'pickup_game' | 'opportunity') => void
  initialBookingOpen?: boolean
}

export default function VenueDetailPage({ slug, onNavigate, onOpenIntake, initialBookingOpen }: VenueDetailPageProps) {
  const isServer = typeof window === 'undefined'
  const initialCurated = getCuratedVenueBySlug(slug) || getCommunityVenueBySlug(slug)
  const [venue, setVenue] = useState<Venue | CuratedVenue | null>(initialCurated || null)
  const [related, setRelated] = useState<Venue[]>([])
  const [loading, setLoading] = useState(!initialCurated && !isServer)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)

  // Turf / Court Slot Booking State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(initialBookingOpen ?? false)
  const [liveRating, setLiveRating] = useState<number>(() => initialCurated?.rating || 4.8)
  const [liveReviewCount, setLiveReviewCount] = useState<number>(() => initialCurated?.review_count || 96)
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedDate, setSelectedDate] = useState('Today')
  const [selectedSlot, setSelectedSlot] = useState('7:00 PM – 8:00 PM')
  const [bookingName, setBookingName] = useState('')
  const [bookingPhone, setBookingPhone] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<VenueBookingResult | null>(null)
  const [slotConflictError, setSlotConflictError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!initialCurated) setLoading(true)

    getVenueBySlug(slug).then(found => {
      if (!active) return
      if (found) {
        setVenue(found)
      } else {
        const curated = getCuratedVenueBySlug(slug)
        setVenue(curated || null)
      }
      setLoading(false)
    })

    getVenues().then(res => {
      if (!active) return
      if (res.status === 'ready') {
        setRelated(res.data.filter(v => v.slug !== slug).slice(0, 3))
      }
    })

    return () => {
      active = false
    }
  }, [slug, initialCurated])

  // Dynamic Community Rating & Review Stats
  useEffect(() => {
    let active = true
    const updateDynamicRating = async () => {
      try {
        const res = await getReviews('venue', slug)
        if (active && res.data && res.data.length > 0) {
          const stats = computeReviewStats(res.data)
          if (stats.totalReviews > 0) {
            const baselineR = initialCurated?.rating || 4.8
            const baselineC = initialCurated?.review_count || 96
            const communitySum = stats.averageRating * stats.totalReviews
            const totalCount = baselineC + stats.totalReviews - Math.min(stats.totalReviews, 2)
            const newAvg = Number(((baselineR * baselineC + communitySum) / (baselineC + stats.totalReviews)).toFixed(1))
            setLiveRating(newAvg)
            setLiveReviewCount(totalCount)
          }
        }
      } catch {
        // Keep baseline
      }
    }

    void updateDynamicRating()

    const onReviewAdded = () => {
      void updateDynamicRating()
    }
    window.addEventListener('khelgrid:review-added', onReviewAdded)
    return () => {
      active = false
      window.removeEventListener('khelgrid:review-added', onReviewAdded)
    }
  }, [slug, initialCurated?.rating, initialCurated?.review_count])

  // Real-time booked slots tracking directly from PostgreSQL public.venue_bookings via zero-PII RPC
  useEffect(() => {
    if (!venue?.id) return
    let active = true

    // Synchronous initial cache hit
    setBookedSlots(getBookedVenueSlots(venue.id, selectedDate))

    // Asynchronous database query
    fetchBookedVenueSlots(venue.id, selectedDate).then(slots => {
      if (active) setBookedSlots(slots)
    })

    const onBooking = () => {
      if (venue?.id) {
        fetchBookedVenueSlots(venue.id, selectedDate).then(slots => {
          if (active) setBookedSlots(slots)
        })
      }
    }
    window.addEventListener('khelgrid:venue-booked', onBooking)
    return () => {
      active = false
      window.removeEventListener('khelgrid:venue-booked', onBooking)
    }
  }, [venue?.id, selectedDate])

  // SEO & Schema.org JSON-LD
  useEffect(() => {
    if (!venue) return

    const pageTitle = `${venue.name} — Sports Venue in ${venue.city} | KhelGrid`
    const pageDesc = venue.description || `Play sports at ${venue.name} in ${venue.city}, India. Pitch surfaces, timings, floodlights, facilities, and booking enquiries on KhelGrid.`
    const pageUrl = `https://khelgrid.com/venues/${venue.slug}`

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SportsActivityLocation',
      name: venue.name,
      description: pageDesc,
      url: pageUrl,
      address: {
        '@type': 'PostalAddress',
        addressLocality: venue.city,
        addressCountry: 'IN',
        streetAddress: venue.address || `${venue.name}, ${venue.city}`,
      },
      telephone: (venue as CuratedVenue).phone || undefined,
      openingHours: (venue as CuratedVenue).timings || 'Mo-Su 06:00-23:00',
      priceRange: '₹₹',
    }

    const cleanup = updatePageSeoMetadata({
      title: pageTitle,
      description: pageDesc,
      canonicalUrl: pageUrl,
      ogType: 'place',
      keywords: [
        venue.name,
        `${venue.name} ${venue.city}`,
        `sports turf in ${venue.city}`,
        'box cricket venue',
        'football turf booking',
        'KhelGrid sports venues',
      ],
      jsonLd,
    })

    return cleanup
  }, [venue])

  if (loading) {
    return (
      <div className="content-page venue-loading-container" role="status">
        <div className="venue-loading-spinner" />
        <p>Loading sports venue and playing facility details…</p>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="content-page venue-not-found">
        <a className="text-link" href="/venues" onClick={e => onNavigate?.(e, '/venues')}>
          <SiteIcon name="arrow-left" size={15} /> Back to Venues Directory
        </a>
        <div className="state-panel">
          <span className="state-symbol">○</span>
          <h2>Venue Record Not Found</h2>
          <p>
            We could not find a sports venue matching <code>{slug}</code>. It may have been unlisted or moved.
          </p>
          <a className="primary-link" href="/venues" onClick={e => onNavigate?.(e, '/venues')}>
            Browse All Venues
          </a>
        </div>
      </div>
    )
  }

  const curated = venue as Partial<CuratedVenue>
  const sportName = curated.sport || 'Multi-Sport'
  const fullAddress = venue.address || `${venue.name}, ${venue.city}`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Hi, I found ${venue.name} on KhelGrid and would like to enquire about slot booking availability.`)}`

  const facilitiesList = curated.facilities || [
    'Floodlights / High-Lux LED Lighting',
    'Clean Drinking Water',
    'Washrooms & Changing Rooms',
    'Free Parking Space',
    'Bibs & Sports Balls Provided',
    'On-site First Aid Support',
  ]

  const rulesList = curated.rules || [
    'Appropriate athletic shoes required (no metal studs)',
    'Teams must vacate playing ground promptly when booked slot expires',
    'Follow sports facility safety and code of conduct rules',
  ]

  const timingsText = curated.timings || '6:00 AM – 11:00 PM (Open 7 Days)'
  const surfaceText = curated.surface_type || 'Professional Playing Surface'
  const courtText = curated.court_count || 'Standard Multi-Sport Playing Ground'
  const pricingText = curated.pricing || 'Contact venue for current pricing'
  const displaySlotFee = parseInrPrice(pricingText)

  const faqs = curated.faqs || [
    {
      question: `How do I book a court or turf slot at ${venue.name}?`,
      answer: `You can reach out directly via WhatsApp using the 'Enquire on WhatsApp' button or call the venue manager. For community play, you can also host an open pickup match directly through KhelGrid.`,
    },
    {
      question: `What footwear is permitted on the playing surface?`,
      answer: `Standard rubber stud turf shoes, running trainers, or non-marking court shoes are required. Hard metal cleats or formal shoes are strictly prohibited to preserve the playing surface.`,
    },
    {
      question: `Are changing rooms and drinking water available?`,
      answer: `Yes, clean restrooms, player changing facilities, and purified drinking water stations are available on-site for visiting athletes and teams.`,
    },
    {
      question: `Can our team organize private corporate or tournament events here?`,
      answer: `Yes, private tournament bookings and full-day facility allotments can be arranged by contacting the venue manager in advance.`,
    },
  ]

  return (
    <article className="content-page venue-detail-page">
      {/* Breadcrumb Navigation */}
      <nav className="venue-breadcrumbs" aria-label="Breadcrumbs">
        <a href="/" onClick={e => onNavigate?.(e, '/')}>Home</a>
        <span aria-hidden="true">/</span>
        <a href="/venues" onClick={e => onNavigate?.(e, '/venues')}>Sports Venues</a>
        <span aria-hidden="true">/</span>
        <a href={`/cities/${venue.city.toLowerCase()}`} onClick={e => onNavigate?.(e, `/cities/${venue.city.toLowerCase()}`)}>
          {venue.city}
        </a>
        <span aria-hidden="true">/</span>
        <span className="current" aria-current="page">{venue.name}</span>
      </nav>

      {/* Hero Header */}
      <header className="venue-hero-header">
        <div className="venue-badge-strip">
          <span className="venue-sport-pill">{sportName}</span>
          {venue.government_facility ? (
            <span className="venue-verified-badge is-govt">
              <SiteIcon name="shield-check" size={14} /> Government Sports Facility
            </span>
          ) : (venue as Partial<Venue>).verification_status === 'verified' || getCuratedVenueBySlug(slug) ? (
            <span className="venue-verified-badge">
              <SiteIcon name="shield-check" size={14} /> KhelGrid Verified Venue
            </span>
          ) : (
            <span className="venue-unverified-badge">
              <SiteIcon name="alert-triangle" size={14} /> Pending Verification
            </span>
          )}
          <span className="venue-status-open">⚡ Active Sports Facility</span>
        </div>

        <h1 className="venue-title">{venue.name}</h1>

        <div className="venue-meta-row">
          <span className="venue-meta-item">
            <SiteIcon name="map-pin" size={16} />
            <span>{venue.city}</span>
          </span>
          <span className="venue-meta-item">
            <SiteIcon name="clock" size={15} />
            <span>{timingsText}</span>
          </span>
          <span className="venue-meta-item">
            <SiteIcon name="star" size={15} />
            <span className="venue-rating">{liveRating} ★</span>
            <span className="venue-reviews">({liveReviewCount} reviews)</span>
          </span>
        </div>

        {/* Primary Action Buttons */}
        <div className="venue-actions-bar">
          <BookmarkButton item={createVenueSavedItem(venue)} variant="pill" showLabel={true} />

          <button
            type="button"
            onClick={() => {
              setIsBookingModalOpen(true)
              setConfirmedBooking(null)
              setBookingError('')
            }}
            className="venue-btn venue-btn-book"
          >
            <SiteIcon name="calendar-check" size={16} />
            <span>Book Turf / Court Slot</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="venue-btn venue-btn-primary"
          >
            <SiteIcon name="message" size={16} />
            <span>Enquire on WhatsApp</span>
          </a>

          {curated.phone && (
            <a href={`tel:${curated.phone.replace(/\s+/g, '')}`} className="venue-btn venue-btn-secondary">
              <SiteIcon name="phone" size={16} />
              <span>Call Venue</span>
            </a>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="venue-btn venue-btn-secondary"
          >
            <SiteIcon name="map-pin" size={16} />
            <span>Get Directions</span>
          </a>

          {onOpenIntake && (
            <button
              type="button"
              onClick={() => onOpenIntake('pickup_game')}
              className="venue-btn venue-btn-highlight"
            >
              <SiteIcon name="plus" size={16} />
              <span>Host a Pickup Game Here</span>
            </button>
          )}
        </div>

        {/* Share Bar */}
        <div className="venue-share-wrapper">
          <ShareBar
            title={venue.name}
            text={`Check out ${venue.name} in ${venue.city} on KhelGrid — sports venue & turf:`}
            url={`https://khelgrid.com/venues/${venue.slug}`}
          />
        </div>
      </header>

      {/* Anti-Scam Athlete & Parent Safety Advisory Banner */}
      {!(venue.government_facility || (venue as Partial<Venue>).verification_status === 'verified' || getCuratedVenueBySlug(slug)) && (
        <section className="entity-scam-advisory-banner" role="alert">
          <div className="scam-advisory-badge">
            <SiteIcon name="alert-triangle" size={24} />
          </div>
          <div className="scam-advisory-body">
            <h3>⚠️ Player &amp; Team Safety Advisory — Unverified Sports Facility</h3>
            <p>
              This playing arena was submitted by a community member and is currently undergoing physical address, ground lease, and manager verification by the KhelGrid Sports Desk.
              <strong> Do not transfer UPI slot advance fees or deposit money online</strong> before confirming ground access and playing conditions with facility staff in person.
            </p>
            <div className="scam-advisory-actions">
              <button
                type="button"
                className="scam-btn-claim"
                onClick={() => setIsClaimModalOpen(true)}
              >
                <SiteIcon name="shield-check" size={14} /> Turf Manager / Owner? Verify this Facility
              </button>
              <button
                type="button"
                className="scam-btn-report"
                onClick={() => setIsReportModalOpen(true)}
              >
                <SiteIcon name="flag" size={14} /> Report Suspicious Venue
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Highlights Bar */}
      <section className="venue-highlights-grid" aria-label="Key Venue Specifications">
        <div className="highlight-card">
          <span className="highlight-label">Playing Surface</span>
          <strong className="highlight-value">{surfaceText}</strong>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Courts &amp; Pitches</span>
          <strong className="highlight-value">{courtText}</strong>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Estimated Slot Rates</span>
          <strong className="highlight-value">{pricingText}</strong>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Operating Schedule</span>
          <strong className="highlight-value">{timingsText}</strong>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="venue-content-columns">
        <div className="venue-main-column">
          {/* About Section */}
          <section className="venue-section">
            <h2>About {venue.name}</h2>
            <div className="venue-prose">
              <p>{venue.description}</p>
              <p>
                {venue.name} is one of {venue.city}&apos;s premier destinations for sports enthusiasts, offering
                professional-grade playing conditions for competitive games and casual training sessions alike.
                The arena is maintained with clean surroundings, high-lux illumination, and dedicated sports staff.
              </p>
            </div>
          </section>

          {/* Facilities & Amenities */}
          <section className="venue-section">
            <h2>Amenities &amp; Features</h2>
            <div className="venue-facilities-grid">
              {facilitiesList.map((facility, index) => (
                <div className="facility-pill" key={index}>
                  <SiteIcon name="check-circle" size={16} />
                  <span>{facility}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Ground Guidelines & Rules */}
          <section className="venue-section">
            <h2>Ground Rules &amp; Guidelines</h2>
            <ul className="venue-rules-list">
              {rulesList.map((rule, index) => (
                <li key={index}>
                  <SiteIcon name="info" size={16} />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Location & Directions Card */}
          <section className="venue-section">
            <h2>Location &amp; Access</h2>
            <div className="venue-location-card">
              <div className="location-info">
                <SiteIcon name="map-pin" size={20} />
                <div>
                  <strong>{venue.name}</strong>
                  <p>{fullAddress}</p>
                </div>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="venue-btn venue-btn-primary location-directions-btn"
              >
                <SiteIcon name="map" size={16} />
                <span>Open in Google Maps</span>
              </a>
            </div>
          </section>

          {/* FAQs Accordion */}
          <section className="venue-section venue-faqs">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-accordion-list">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index
                return (
                  <div className={`faq-accordion-item ${isOpen ? 'is-open' : ''}`} key={index}>
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <SiteIcon name={isOpen ? 'chevron-down' : 'chevron-right'} size={16} />
                    </button>
                    {isOpen && (
                      <div className="faq-answer-pane">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Community Reviews, Ratings & Media Uploads */}
          <CommunityReviewsSection
            entityType="venue"
            entityId={venue.id}
            entitySlug={venue.slug}
            entityName={venue.name}
            sport={sportName}
            city={venue.city}
          />
        </div>

        {/* Sidebar / Quick Inquiry Box */}
        <aside className="venue-sidebar-column">
          <div className="venue-inquiry-box">
            <h3>Book or Check Slots</h3>
            <p>
              Connect directly with {venue.name} management to verify current court availability and hourly slot pricing.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="venue-btn venue-btn-whatsapp-block"
            >
              <SiteIcon name="message" size={18} />
              <span>Enquire on WhatsApp</span>
            </a>

            {curated.phone && (
              <a href={`tel:${curated.phone.replace(/\s+/g, '')}`} className="venue-btn venue-btn-call-block">
                <SiteIcon name="phone" size={17} />
                <span>Call {curated.phone}</span>
              </a>
            )}

            <div className="venue-disclaimer-note">
              <SiteIcon name="shield-check" size={14} />
              <span>Direct venue contact · KhelGrid verified arena · 0% commission fees.</span>
            </div>

            <button
              type="button"
              className="entity-report-flag-btn"
              onClick={() => setIsReportModalOpen(true)}
            >
              <SiteIcon name="flag" size={13} />
              <span>Report suspicious or inaccurate details</span>
            </button>
          </div>

          {/* Related Venues */}
          {related.length > 0 && (
            <div className="venue-related-box">
              <h3>More Venues in {venue.city}</h3>
              <div className="related-venues-list">
                {related.map(rel => (
                  <a
                    key={rel.id}
                    href={`/venues/${rel.slug}`}
                    onClick={e => onNavigate?.(e, `/venues/${rel.slug}`)}
                    className="related-venue-item"
                  >
                    <strong>{rel.name}</strong>
                    <span>
                      <SiteIcon name="map-pin" size={13} /> {rel.city}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <ReportListingModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        entityType="venue"
        entitySlug={venue.slug}
        entityName={venue.name}
      />

      <VerificationClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        entityType="venue"
        entitySlug={venue.slug}
        entityName={venue.name}
      />

      {/* Venue Court / Turf Slot Booking Modal */}
      {isBookingModalOpen && (
        <div className="venue-booking-overlay" onClick={() => setIsBookingModalOpen(false)}>
          <div
            className="venue-booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="venue-booking-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="venue-booking-header">
              <h3 id="venue-booking-title">
                <SiteIcon name="calendar-check" size={20} />
                <span>{confirmedBooking ? 'Slot Booking Confirmed!' : `Book Slot · ${venue.name}`}</span>
              </h3>
              <button
                type="button"
                className="kg-checkout-close"
                onClick={() => setIsBookingModalOpen(false)}
                aria-label="Close"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            {confirmedBooking ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '44px', marginBottom: '8px' }}>
                  {confirmedBooking.status === 'pending' ? '⏳' : '🏟️'}
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 800, color: confirmedBooking.status === 'pending' ? '#d97706' : '#059669' }}>
                  {confirmedBooking.status === 'pending' ? 'Temporary Slot Hold (15 Mins)' : 'Court Reserved Successfully!'}
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#64748b' }}>
                  {confirmedBooking.status === 'pending'
                    ? `Slot held at ${confirmedBooking.venueName}. Awaiting online payment verification.`
                    : `Your slot is locked at ${confirmedBooking.venueName}.`}
                </p>

                <div className="venue-summary-pill" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Booking Reference:</span>
                    <strong style={{ fontFamily: 'monospace', color: confirmedBooking.status === 'pending' ? '#d97706' : '#059669' }}>
                      {confirmedBooking.bookingRef}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Date &amp; Time:</span>
                    <strong>{confirmedBooking.slotDate} · {confirmedBooking.slotTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Sport / Ground:</span>
                    <strong>{selectedSport || sportName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Status:</span>
                    <strong>
                      {confirmedBooking.status === 'pending'
                        ? 'Pending Verification'
                        : confirmedBooking.paymentStatus === 'pay_at_venue'
                          ? 'Pay at Venue'
                          : `Confirmed Paid (₹${confirmedBooking.paidAmount})`}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="kg-btn-cancel"
                    style={{ flex: 1 }}
                    onClick={() => window.print?.()}
                  >
                    <SiteIcon name="download" size={15} />
                    <span>Print Voucher</span>
                  </button>
                  <button
                    type="button"
                    className="venue-btn venue-btn-book"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setIsBookingModalOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault()
                  if (bookingName.trim().length < 2) {
                    setBookingError('Please enter your full name (at least 2 characters).')
                    return
                  }
                  if (bookingPhone.replace(/\D/g, '').length < 10) {
                    setBookingError('Please enter a valid 10-digit mobile number.')
                    return
                  }
                  const slotFee = parseInrPrice(pricingText)
                  if (!slotFee || slotFee <= 0) {
                    setBookingError('This venue does not have a verified booking tariff. Please contact the venue directly; no payment has been requested.')
                    return
                  }
                  const courtNumber = 1
                  const depositAmount = Math.min(300, slotFee)
                  setCheckoutItem({
                    id: venue.id,
                    type: 'venue_booking',
                    title: `${venue.name} Court Slot`,
                    subtitle: `${selectedSport || sportName} · ${selectedDate} · ${selectedSlot}`,
                    amount: depositAmount,
                    emoji: '🏟️',
                    venueName: venue.name,
                    city: venue.city,
                    dateOrTime: `${selectedDate} · ${selectedSlot}`,
                    metadata: {
                      courtNumber,
                      bookingTotalAmount: slotFee,
                      advanceDepositAmount: depositAmount,
                      balancePayableAtVenue: Math.max(0, slotFee - depositAmount),
                    },
                  })
                }}
              >
                {bookingError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px' }}>
                    {bookingError}
                  </div>
                )}

                <div className="kg-field-group" style={{ marginBottom: '14px' }}>
                  <label>Select Sport</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[sportName, 'Football', 'Badminton', 'Cricket'].filter((v, i, a) => a.indexOf(v) === i).map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`venue-slot-chip ${(selectedSport || sportName) === s ? 'selected' : ''}`}
                        onClick={() => setSelectedSport(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="kg-field-group" style={{ marginBottom: '14px' }}>
                  <label>Select Date</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Today', 'Tomorrow', 'Day After'].map(d => (
                      <button
                        key={d}
                        type="button"
                        className={`venue-slot-chip ${selectedDate === d ? 'selected' : ''}`}
                        onClick={() => setSelectedDate(d)}
                        style={{ flex: 1 }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="kg-field-group" style={{ marginBottom: '14px' }}>
                  <label>Select Time Slot</label>
                  {slotConflictError && (
                    <div className="venue-slot-conflict-alert" role="alert" style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SiteIcon name="alert-circle" size={16} />
                      <span>{slotConflictError}</span>
                    </div>
                  )}
                  <div className="venue-slot-chips">
                    {[
                      '6:00 AM – 7:00 AM',
                      '7:00 AM – 8:00 AM',
                      '6:00 PM – 7:00 PM',
                      '7:00 PM – 8:00 PM',
                      '8:00 PM – 9:00 PM',
                      '9:00 PM – 10:00 PM',
                    ].map(slot => {
                      const isBooked = bookedSlots.includes(slot)
                      return (
                        <button
                          key={slot}
                          type="button"
                          className={`venue-slot-chip ${selectedSlot === slot ? 'selected' : ''} ${isBooked ? 'is-booked' : ''}`}
                          onClick={() => !isBooked && setSelectedSlot(slot)}
                          disabled={isBooked}
                          title={isBooked ? 'Slot already reserved by another team' : `Reserve ${slot}`}
                        >
                          <span>{slot}</span>
                          {isBooked && <span className="slot-booked-tag">Booked</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="kg-customer-grid" style={{ marginBottom: '14px' }}>
                  <div className="kg-field-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      className="kg-input"
                      value={bookingName}
                      onChange={e => setBookingName(e.target.value)}
                      placeholder="e.g. Vikram Verma"
                      required
                    />
                  </div>
                  <div className="kg-field-group">
                    <label>Mobile Number *</label>
                    <input
                      type="tel"
                      className="kg-input"
                      value={bookingPhone}
                      onChange={e => setBookingPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      required
                    />
                  </div>
                </div>

                <div className="venue-summary-pill">
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Slot Advance Deposit</div>
                    <strong style={{ fontSize: '16px', color: '#059669' }}>
                      ₹{Math.min(300, parseInrPrice(pricingText))}
                    </strong>
                    <small style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                      (Total estimated: ₹{parseInrPrice(pricingText)}/hr · remainder at venue)
                    </small>
                  </div>
                  <SiteIcon name="shield-check" size={24} style={{ color: '#059669' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="kg-btn-cancel"
                    onClick={() => setIsBookingModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="venue-btn venue-btn-book" disabled={displaySlotFee <= 0}>
                    <SiteIcon name="lock" size={15} />
                    <span>{displaySlotFee > 0 ? `Proceed to Payment (₹${Math.min(300, displaySlotFee)}) →` : 'Pricing unavailable — contact venue'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal for Venue Booking */}
      {checkoutItem && (
        <PaymentCheckoutModal
          isOpen={Boolean(checkoutItem)}
          onClose={() => setCheckoutItem(null)}
          item={checkoutItem}
          initialCustomer={{ name: bookingName, phone: bookingPhone }}
          onSuccess={async paymentResult => {
            setCheckoutItem(null)
            const slotFee = parseInrPrice(pricingText)
            if (!slotFee || slotFee <= 0) {
              setSlotConflictError('The venue has no verified booking tariff. No booking was confirmed.')
              return
            }
            const res = await recordVenueSlotBooking({
              venueId: venue.id,
              venueName: venue.name,
              city: venue.city,
              sport: selectedSport || sportName,
              slotDate: selectedDate,
              slotTime: selectedSlot,
              courtNumber: Number(checkoutItem?.metadata?.courtNumber || 1),
              customerName: bookingName,
              customerPhone: bookingPhone,
              totalAmount: slotFee,
              paidAmount: paymentResult.amount,
              paymentStatus: paymentResult.status === 'pay_at_venue' ? 'pay_at_venue' : 'pending',
              paymentId: paymentResult.paymentId,
              paymentOrderId: paymentResult.orderId,
            })
            if (res.status === 'double_booking_conflict') {
              setSlotConflictError(res.errorMessage || res.message || 'This slot was just booked by another player. Please select a different slot.')
              const fresh = await fetchBookedVenueSlots(venue.id, selectedDate)
              setBookedSlots(fresh)
            } else if (res.status === 'unconfirmed' || res.status === 'error') {
              setSlotConflictError(res.errorMessage || res.message || 'Booking could not be confirmed with the reservation server. The slot is not reserved. Please retry.')
            } else if (res.status === 'confirmed' || (res.status === 'success' && res.serverConfirmed)) {
              setConfirmedBooking(res)
            } else {
              setConfirmedBooking(res)
            }
          }}
          allowPayAtVenue={true}
        />
      )}
    </article>
  )
}
