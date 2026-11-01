import { useState, useEffect, type MouseEvent } from 'react'
import { getAcademyBySlug, getAcademies, getCommunityAcademyBySlug } from '../../integrations/supabase/public-client'
import type { Academy } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { ShareBar } from '../../shared/components/ShareBar'
import { updatePageSeoMetadata } from '../../shared/utils/seoAndShare'
import { getCuratedAcademyBySlug, type CuratedAcademy } from '../../shared/data/curatedEntitiesData'
import ReportListingModal from '../../shared/components/ReportListingModal'
import VerificationClaimModal from '../../shared/components/VerificationClaimModal'
import { CommunityReviewsSection } from '../../shared/components/CommunityReviewsSection'
import './AcademyDetailPage.css'

export interface AcademyDetailPageProps {
  slug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: () => void
}

export default function AcademyDetailPage({ slug, onNavigate }: AcademyDetailPageProps) {
  const isServer = typeof window === 'undefined'
  const initialCurated = getCuratedAcademyBySlug(slug) || getCommunityAcademyBySlug(slug)
  const [academy, setAcademy] = useState<Academy | CuratedAcademy | null>(initialCurated || null)
  const [related, setRelated] = useState<Academy[]>([])
  const [loading, setLoading] = useState(!initialCurated && !isServer)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)

  useEffect(() => {
    let active = true
    if (!initialCurated) setLoading(true)

    getAcademyBySlug(slug).then(found => {
      if (!active) return
      if (found) {
        setAcademy(found)
      } else {
        // Fallback check
        const curated = getCuratedAcademyBySlug(slug)
        setAcademy(curated || null)
      }
      setLoading(false)
    })

    getAcademies().then(res => {
      if (!active) return
      if (res.status === 'ready') {
        setRelated(res.data.filter(a => a.slug !== slug).slice(0, 3))
      }
    })

    return () => {
      active = false
    }
  }, [slug, initialCurated])

  // SEO & Schema.org Structured Data
  useEffect(() => {
    if (!academy) return

    const pageTitle = `${academy.name} — Sports Academy in ${academy.city} | KhelGrid`
    const pageDesc = academy.description || `Explore ${academy.name} in ${academy.city}, India. Certified coaching, facilities, age groups, timings, and admission enquiry on KhelGrid.`
    const pageUrl = `https://khelgrid.com/academies/${academy.slug}`

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SportsClub',
      name: academy.name,
      description: pageDesc,
      url: pageUrl,
      address: {
        '@type': 'PostalAddress',
        addressLocality: academy.city,
        addressRegion: academy.state || 'India',
        addressCountry: 'IN',
        streetAddress: (academy as CuratedAcademy).address || `${academy.name}, ${academy.city}`,
      },
      telephone: (academy as CuratedAcademy).phone || undefined,
      sport: (academy as CuratedAcademy).sport || 'Multi-Sport',
      priceRange: '₹₹',
    }

    const cleanup = updatePageSeoMetadata({
      title: pageTitle,
      description: pageDesc,
      canonicalUrl: pageUrl,
      ogType: 'place',
      keywords: [
        academy.name,
        `${academy.name} ${academy.city}`,
        `${(academy as CuratedAcademy).sport || 'Sports'} academy in ${academy.city}`,
        'sports academy admission',
        'youth sports trials',
        'KhelGrid verified academy',
      ],
      jsonLd,
    })

    return cleanup
  }, [academy])

  if (loading) {
    return (
      <div className="content-page academy-loading-container" role="status">
        <div className="academy-loading-spinner" />
        <p>Loading academy profile and verified credentials…</p>
      </div>
    )
  }

  if (!academy) {
    return (
      <div className="content-page academy-not-found">
        <a className="text-link" href="/academies" onClick={e => onNavigate?.(e, '/academies')}>
          <SiteIcon name="arrow-left" size={15} /> Back to Academies Directory
        </a>
        <div className="state-panel">
          <span className="state-symbol">○</span>
          <h2>Academy Record Not Found</h2>
          <p>
            We could not find an academy matching <code>{slug}</code>. It may have been renamed or moved.
          </p>
          <div className="academy-not-found-actions">
            <a className="primary-link" href="/academies" onClick={e => onNavigate?.(e, '/academies')}>
              Browse All Academies
            </a>
          </div>
        </div>
      </div>
    )
  }

  const curated = academy as Partial<CuratedAcademy>
  const sportName = curated.sport || 'Multi-Sport'
  const fullAddress = curated.address || `${academy.name}, ${academy.city}${academy.state ? `, ${academy.state}` : ''}`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
  const whatsappUrl =
    curated.public_contact_url ||
    `https://wa.me/?text=${encodeURIComponent(`Hi, I found ${academy.name} on KhelGrid and would like to enquire about trial sessions and admission.`)}`

  const facilitiesList = curated.facilities || [
    'Regulation Playing Ground / Turf',
    'Floodlights for Evening Batches',
    'Certified Coaching Staff',
    'Changing Rooms & Washrooms',
    'First Aid & Ice Support',
    'Drinking Water Station',
    'Player Lockers',
    'Visitor Parking',
  ]

  const ageGroupsList = curated.age_groups || ['Under-10 Grassroots', 'Under-14 Sub-Junior', 'Under-17 Junior', 'Open Senior']
  const timingsText = curated.timings || 'Morning: 6:00 AM – 8:30 AM | Evening: 4:30 PM – 7:00 PM (Tuesday – Sunday)'
  const feeText = curated.fee_structure || 'Contact academy directly for current batch fees and trial sessions'
  const ratingVal = curated.rating || 4.9
  const reviewCount = curated.review_count || 128

  const faqs = curated.faqs || [
    {
      question: `How can I register for a trial session at ${academy.name}?`,
      answer: `You can reach out directly via WhatsApp using the 'Enquire on WhatsApp' button above or call the front desk. Trial sessions are usually scheduled during weekday morning or evening training slots.`,
    },
    {
      question: `What age groups are accepted for training?`,
      answer: `${academy.name} accepts boys and girls across ${ageGroupsList.join(', ')}. Athletes are grouped by age category and skill level to ensure appropriate developmental pacing.`,
    },
    {
      question: `What equipment and attire should athletes bring?`,
      answer: `Athletes should wear standard athletic attire, sport-appropriate shoes (turf shoes or non-marking court shoes as required), shin guards/protective gear, and bring personal hydration bottles.`,
    },
    {
      question: `Are there merit-based scholarships or fee concessions?`,
      answer: `Outstanding athletes who excel in district and state tournaments or show exceptional potential during trial assessments are eligible for academy fee concessions and equipment sponsorship.`,
    },
  ]

  return (
    <article className="content-page academy-detail-page">
      {/* Breadcrumb Navigation */}
      <nav className="academy-breadcrumbs" aria-label="Breadcrumbs">
        <a href="/" onClick={e => onNavigate?.(e, '/')}>Home</a>
        <span aria-hidden="true">/</span>
        <a href="/academies" onClick={e => onNavigate?.(e, '/academies')}>Academies</a>
        <span aria-hidden="true">/</span>
        <a href={`/cities/${academy.city.toLowerCase()}`} onClick={e => onNavigate?.(e, `/cities/${academy.city.toLowerCase()}`)}>
          {academy.city}
        </a>
        <span aria-hidden="true">/</span>
        <span className="current" aria-current="page">{academy.name}</span>
      </nav>

      {/* Hero Header */}
      <header className="academy-hero-header">
        <div className="academy-badge-strip">
          <span className="academy-sport-pill">{sportName}</span>
          {(academy as Partial<Academy>).verification_status === 'verified' ? (
            <span className="academy-verified-badge">
              <SiteIcon name="shield-check" size={14} /> KhelGrid Verified Academy
            </span>
          ) : (
            <span className="academy-unverified-badge">
              <SiteIcon name="alert-triangle" size={14} /> Pending Verification
            </span>
          )}
          {curated.admission_open !== false && (
            <span className="academy-status-open">🟢 Admissions Open</span>
          )}
        </div>

        <h1 className="academy-title">{academy.name}</h1>

        <div className="academy-meta-row">
          <span className="academy-meta-item">
            <SiteIcon name="map-pin" size={16} />
            <span>{academy.city}{academy.state ? `, ${academy.state}` : ''}</span>
          </span>
          <span className="academy-meta-item">
            <SiteIcon name="star" size={15} />
            <span className="academy-rating">{ratingVal} ★</span>
            <span className="academy-reviews">({reviewCount} reviews)</span>
          </span>
          {curated.head_coach && (
            <span className="academy-meta-item">
              <SiteIcon name="award" size={16} />
              <span>Head Coach: <strong>{curated.head_coach}</strong></span>
            </span>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="academy-actions-bar">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="academy-btn academy-btn-primary"
          >
            <SiteIcon name="message" size={16} />
            <span>Enquire on WhatsApp</span>
          </a>

          {curated.phone && (
            <a href={`tel:${curated.phone.replace(/\s+/g, '')}`} className="academy-btn academy-btn-secondary">
              <SiteIcon name="phone" size={16} />
              <span>Call Direct</span>
            </a>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="academy-btn academy-btn-secondary"
          >
            <SiteIcon name="map-pin" size={16} />
            <span>Get Directions</span>
          </a>

          {academy.website_url && (
            <a
              href={academy.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="academy-btn academy-btn-secondary"
            >
              <SiteIcon name="external-link" size={16} />
              <span>Official Website</span>
            </a>
          )}
        </div>

        {/* Social Share Bar */}
        <div className="academy-share-wrapper">
          <ShareBar
            title={academy.name}
            text={`Check out ${academy.name} in ${academy.city} on KhelGrid — verified sports academy:`}
            url={`https://khelgrid.com/academies/${academy.slug}`}
          />
        </div>
      </header>

      {/* Anti-Scam Athlete & Parent Safety Advisory Banner */}
      {(academy as Partial<Academy>).verification_status !== 'verified' && (
        <section className="entity-scam-advisory-banner" role="alert">
          <div className="scam-advisory-badge">
            <SiteIcon name="alert-triangle" size={24} />
          </div>
          <div className="scam-advisory-body">
            <h3>⚠️ Athlete &amp; Parent Safety Advisory — Unverified Community Listing</h3>
            <p>
              This sports academy was submitted by a community contributor and is currently undergoing credential, ground lease, and coach license authentication by the KhelGrid Sports Desk.
              <strong> Do not transfer advance admission fees, pay trial registration money online, or share banking OTPs</strong> without inspecting the training facility and verifying coach qualifications in person.
            </p>
            <div className="scam-advisory-actions">
              <button
                type="button"
                className="scam-btn-claim"
                onClick={() => setIsClaimModalOpen(true)}
              >
                <SiteIcon name="shield-check" size={14} /> Official Academy Staff? Verify this Listing
              </button>
              <button
                type="button"
                className="scam-btn-report"
                onClick={() => setIsReportModalOpen(true)}
              >
                <SiteIcon name="flag" size={14} /> Report Suspicious Listing
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Highlights Bar */}
      <section className="academy-highlights-grid" aria-label="Key Academy Highlights">
        <div className="highlight-card">
          <span className="highlight-label">Age Groups Coached</span>
          <strong className="highlight-value">{ageGroupsList.join(' · ')}</strong>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Training Batches</span>
          <strong className="highlight-value">{timingsText}</strong>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Fee Structure</span>
          <strong className="highlight-value">{feeText}</strong>
        </div>
        <div className="highlight-card">
          <span className="highlight-label">Curriculum Standard</span>
          <strong className="highlight-value">Federation Aligned Tactical Progression</strong>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="academy-content-columns">
        <div className="academy-main-column">
          {/* About Section */}
          <section className="academy-section">
            <h2>About {academy.name}</h2>
            <div className="academy-prose">
              <p>{academy.description}</p>
              <p>
                Athlete development at {academy.name} emphasizes age-appropriate physical conditioning,
                biomechanically sound skill fundamentals, match intelligence, and sportsman spirit.
                Trainees receive continuous feedback, tactical evaluations, and opportunities to compete
                in recognized district, state, and national tournaments.
              </p>
            </div>
          </section>

          {/* Curriculum Highlights */}
          {curated.curriculum_highlights && curated.curriculum_highlights.length > 0 && (
            <section className="academy-section">
              <h3>Training Curriculum &amp; Methodology</h3>
              <ul className="academy-curriculum-list">
                {curated.curriculum_highlights.map((point, index) => (
                  <li key={index}>
                    <SiteIcon name="check" size={16} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Facilities & Amenities */}
          <section className="academy-section">
            <h2>Facilities &amp; Infrastructure</h2>
            <div className="academy-facilities-grid">
              {facilitiesList.map((facility, index) => (
                <div className="facility-pill" key={index}>
                  <SiteIcon name="check-circle" size={16} />
                  <span>{facility}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Location & Maps Section */}
          <section className="academy-section">
            <h2>Location &amp; Ground Access</h2>
            <div className="academy-location-card">
              <div className="location-info">
                <SiteIcon name="map-pin" size={20} />
                <div>
                  <strong>{academy.name} Ground</strong>
                  <p>{fullAddress}</p>
                </div>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="academy-btn academy-btn-primary location-directions-btn"
              >
                <SiteIcon name="map" size={16} />
                <span>Open in Google Maps</span>
              </a>
            </div>
          </section>

          {/* FAQs Accordion */}
          <section className="academy-section academy-faqs">
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
            entityType="academy"
            entityId={academy.id}
            entitySlug={academy.slug}
            entityName={academy.name}
            sport={sportName}
            city={academy.city}
          />
        </div>

        {/* Sidebar / Quick Inquiry Box */}
        <aside className="academy-sidebar-column">
          <div className="academy-inquiry-box">
            <h3>Interested in Joining?</h3>
            <p>
              Send an instant inquiry directly to the coaching staff of {academy.name} to confirm trial availability.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="academy-btn academy-btn-whatsapp-block"
            >
              <SiteIcon name="message" size={18} />
              <span>Message on WhatsApp</span>
            </a>

            {curated.phone && (
              <a href={`tel:${curated.phone.replace(/\s+/g, '')}`} className="academy-btn academy-btn-call-block">
                <SiteIcon name="phone" size={17} />
                <span>Call {curated.phone}</span>
              </a>
            )}

            <div className="academy-disclaimer-note">
              <SiteIcon name="shield-check" size={14} />
              <span>Verified KhelGrid Listing · Direct coach access with 0% platform surcharge.</span>
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

          {/* Related Academies */}
          {related.length > 0 && (
            <div className="academy-related-box">
              <h3>More Sports Academies</h3>
              <div className="related-academies-list">
                {related.map(rel => (
                  <a
                    key={rel.id}
                    href={`/academies/${rel.slug}`}
                    onClick={e => onNavigate?.(e, `/academies/${rel.slug}`)}
                    className="related-academy-item"
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
        entityType="academy"
        entitySlug={academy.slug}
        entityName={academy.name}
      />

      <VerificationClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        entityType="academy"
        entitySlug={academy.slug}
        entityName={academy.name}
      />
    </article>
  )
}
