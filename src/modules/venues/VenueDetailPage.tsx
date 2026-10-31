import { useState, useEffect, type MouseEvent } from 'react'
import { getVenueBySlug, getVenues } from '../../integrations/supabase/public-client'
import type { Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { ShareBar } from '../../shared/components/ShareBar'
import { updatePageSeoMetadata } from '../../shared/utils/seoAndShare'
import { getCuratedVenueBySlug, type CuratedVenue } from '../../shared/data/curatedEntitiesData'
import './VenueDetailPage.css'

export interface VenueDetailPageProps {
  slug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: (category?: 'venue' | 'pickup_game' | 'opportunity') => void
}

export default function VenueDetailPage({ slug, onNavigate, onOpenIntake }: VenueDetailPageProps) {
  const isServer = typeof window === 'undefined'
  const initialCurated = getCuratedVenueBySlug(slug)
  const [venue, setVenue] = useState<Venue | CuratedVenue | null>(initialCurated || null)
  const [related, setRelated] = useState<Venue[]>([])
  const [loading, setLoading] = useState(!initialCurated && !isServer)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

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
  const pricingText = curated.pricing || 'Hourly rates starting from ₹800/hr'
  const ratingVal = curated.rating || 4.8
  const reviewCount = curated.review_count || 96

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
          ) : (
            <span className="venue-verified-badge">
              <SiteIcon name="shield-check" size={14} /> KhelGrid Verified Venue
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
            <span className="venue-rating">{ratingVal} ★</span>
            <span className="venue-reviews">({reviewCount} reviews)</span>
          </span>
        </div>

        {/* Primary Action Buttons */}
        <div className="venue-actions-bar">
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
    </article>
  )
}
