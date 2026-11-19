import { useState, useEffect, type MouseEvent } from 'react'
import { getAcademyBySlug, getAcademies, getReviews, computeReviewStats } from '../../integrations/supabase/public-client'
import type { Academy } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { ShareBar } from '../../shared/components/ShareBar'
import { BookmarkButton } from '../../shared/components/BookmarkButton'
import { createAcademySavedItem } from '../../shared/services/savedService'
import { updatePageSeoMetadata } from '../../shared/utils/seoAndShare'
import ReportListingModal from '../../shared/components/ReportListingModal'
import VerificationClaimModal from '../../shared/components/VerificationClaimModal'
import { CommunityReviewsSection } from '../../shared/components/CommunityReviewsSection'
import { AcademyEnquiryModal } from './AcademyEnquiryModal'
import { isAcademyEnquirySubmitted } from '../../integrations/supabase/athlete-profile-client'
import { getAcademyBatches } from './academySaaSClient'
import './AcademyDetailPage.css'

export interface AcademyDetailPageProps {
  slug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: () => void
  initialEnrolOpen?: boolean
}

export default function AcademyDetailPage({ slug, onNavigate, initialEnrolOpen }: AcademyDetailPageProps) {
  const isServer = typeof window === 'undefined'
  const [academy, setAcademy] = useState<Academy | null>(null)
  const [related, setRelated] = useState<Academy[]>([])
  const [loading, setLoading] = useState(!isServer)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [isEnrolModalOpen, setIsEnrolModalOpen] = useState(Boolean(initialEnrolOpen))
  const [isEnquired, setIsEnquired] = useState(() => isAcademyEnquirySubmitted(slug))
  const [liveRating, setLiveRating] = useState<number>(0)
  const [liveReviewCount, setLiveReviewCount] = useState<number>(0)

  useEffect(() => {
    const onEnquiryUpdated = () => {
      setIsEnquired(isAcademyEnquirySubmitted(slug))
    }
    window.addEventListener('khelgrid:academy-enquiry-submitted', onEnquiryUpdated)
    return () => {
      window.removeEventListener('khelgrid:academy-enquiry-submitted', onEnquiryUpdated)
    }
  }, [slug])

  useEffect(() => {
    let active = true
    setLoading(true)
    getAcademyBySlug(slug).then(found => {
      if (!active) return
      setAcademy(found ?? null)
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
  }, [slug])

  // Dynamic Community Rating & Review Stats
  useEffect(() => {
    let active = true
    const updateDynamicRating = async () => {
      try {
        const res = await getReviews('academy', slug)
        if (active && res.data && res.data.length > 0) {
          const stats = computeReviewStats(res.data)
          if (stats.totalReviews > 0) {
            const baselineR = academy?.rating ?? 0
            const baselineC = academy?.review_count ?? 0
            const communitySum = stats.averageRating * stats.totalReviews
            const totalCount = baselineC + stats.totalReviews
            const newAvg = baselineC > 0 ? Number(((baselineR * baselineC + communitySum) / totalCount).toFixed(1)) : stats.averageRating
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
  }, [slug, academy?.rating, academy?.review_count])

  // SEO & Schema.org Structured Data
  useEffect(() => {
    if (!academy) return

    const pageTitle = `${academy.name} — Sports Academy in ${academy.city} | KhelGrid`
    const pageDesc = academy.description || `${academy.name} in ${academy.city}. Confirm programmes, coaching, admissions and fees directly with the academy.`
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
        ...(academy.state ? { addressRegion: academy.state } : {}),
        addressCountry: 'IN',
        ...(academy.address ? { streetAddress: academy.address } : {}),
      },
      ...(academy.phone ? { telephone: academy.phone } : {}),
      ...(academy.sport ? { sport: academy.sport } : {}),
    }

    const cleanup = updatePageSeoMetadata({
      title: pageTitle,
      description: pageDesc,
      canonicalUrl: pageUrl,
      ogType: 'place',
      keywords: [
        academy.name,
        `${academy.name} ${academy.city}`,
        `${academy.sport || 'Sports'} academy in ${academy.city}`,
        'sports academy admission',
        'youth sports trials',
        'KhelGrid verified academy',
      ],
      robots: academy.verification_status === 'verified' ? undefined : 'noindex, follow',
      jsonLd: academy.verification_status === 'verified' ? jsonLd : undefined,
    })

    return cleanup
  }, [academy])

  if (loading) {
    return (
      <div className="content-page academy-loading-container" role="status">
        <div className="academy-loading-spinner" />
        <p>Loading published academy details…</p>
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

  const sportName = academy.sport || academy.sports?.map(sport => typeof sport === 'string' ? sport : sport.name).join(', ') || 'Sport not specified'
  const fullAddress = academy.address || [academy.city, academy.state].filter(Boolean).join(', ')
  const mapsUrl = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : undefined
  const contactUrl = academy.public_contact_url || academy.website_url || undefined

  const facilitiesList = academy.facilities || []

  const ageGroupsList = academy.age_groups || []
  const timingsText = academy.timings || 'Not provided'
  const feeText = academy.fee_structure || 'Contact academy to confirm current fees'

  const faqs = academy.faqs || []
  const publishedBatches = getAcademyBatches(academy.slug)

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
          {academy.admission_open === true && (
            <span className="academy-status-open">🟢 Admissions Open</span>
          )}
        </div>

        <h1 className="academy-title">{academy.name}</h1>

        <div className="academy-meta-row">
          <span className="academy-meta-item">
            <SiteIcon name="map-pin" size={16} />
            <span>{academy.city}{academy.state ? `, ${academy.state}` : ''}</span>
          </span>
          {liveReviewCount > 0 && (
            <span className="academy-meta-item">
              <SiteIcon name="star" size={15} />
              <span className="academy-rating">{liveRating} ★</span>
              <span className="academy-reviews">({liveReviewCount} reviews)</span>
            </span>
          )}
          {academy.head_coach && (
            <span className="academy-meta-item">
              <SiteIcon name="award" size={16} />
              <span>Head Coach: <strong>{academy.head_coach}</strong></span>
            </span>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="academy-actions-bar">
          <BookmarkButton item={createAcademySavedItem(academy)} variant="pill" showLabel={true} />

          {isEnquired ? (
            <button
              type="button"
              className="academy-btn academy-btn-enrolled"
              onClick={() => setIsEnrolModalOpen(true)}
            >
              <SiteIcon name="shield-check" size={16} />
              <span>Enquiry Active · View Token</span>
            </button>
          ) : (
            <button
              type="button"
              className="academy-btn academy-btn-enrol-highlight"
              onClick={() => setIsEnrolModalOpen(true)}
            >
              <SiteIcon name="award" size={16} />
              <span>Send Admission Enquiry</span>
            </button>
          )}

          {contactUrl && (
            <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="academy-btn academy-btn-primary">
              <SiteIcon name="external-link" size={16} />
              <span>Contact Academy</span>
            </a>
          )}

          {academy.phone && (
            <a href={`tel:${academy.phone.replace(/\s+/g, '')}`} className="academy-btn academy-btn-secondary">
              <SiteIcon name="phone" size={16} />
              <span>Call Direct</span>
            </a>
          )}

          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="academy-btn academy-btn-secondary">
              <SiteIcon name="map-pin" size={16} />
              <span>Get Directions</span>
            </a>
          )}

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

          <a
            href={`/academy-hub?academy=${academy.slug}`}
            onClick={event => onNavigate?.(event, `/academy-hub?academy=${academy.slug}`)}
            className="academy-btn academy-btn-secondary"
            title="Open Academy Admissions & Batch Management SaaS Hub"
          >
            <SiteIcon name="award" size={16} />
            <span>Admissions Hub (Free)</span>
          </a>
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
          <span className="highlight-label">Training Focus</span>
          <strong className="highlight-value">{academy.curriculum_highlights?.slice(0, 2).join(' · ') || 'Not provided'}</strong>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="academy-content-columns">
        <div className="academy-main-column">
          {/* About Section */}
          <section className="academy-section">
            <h2>About {academy.name}</h2>
            <div className="academy-prose">
              {academy.description && <p>{academy.description}</p>}
            </div>
          </section>

          {/* Curriculum Highlights */}
          {academy.curriculum_highlights && academy.curriculum_highlights.length > 0 && (
            <section className="academy-section">
              <h3>Training Curriculum &amp; Methodology</h3>
              <ul className="academy-curriculum-list">
                {academy.curriculum_highlights.map((point, index) => (
                  <li key={index}>
                    <SiteIcon name="check" size={16} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Published Coaching Batches & Schedules */}
          {publishedBatches.length > 0 && (
            <section className="academy-section" data-testid="published-batches-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0 }}>Official Training Batches &amp; Timings</h3>
                <span style={{ fontSize: '0.8rem', background: '#ecfdf5', color: '#047857', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                  🟢 Admissions Open
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1rem' }}>
                Verified coaching batches and training schedules managed directly by the academy coaching staff.
              </p>
              <div className="academy-batches-grid">
                {publishedBatches.map(b => (
                  <div className="academy-batch-card" key={b.id} style={{ border: '1px solid #bbf7d0', background: '#fcfdfc' }}>
                    <div className="academy-batch-header">
                      <h4 className="academy-batch-title" style={{ fontSize: '1.05rem' }}>{b.batchName}</h4>
                      <span className="academy-batch-sport-pill">{b.sport}</span>
                    </div>
                    <div className="academy-batch-meta-list" style={{ fontSize: '0.85rem' }}>
                      <div className="academy-batch-meta-item">
                        <SiteIcon name="calendar" size={14} />
                        <span><strong>Days:</strong> {b.days}</span>
                      </div>
                      <div className="academy-batch-meta-item">
                        <SiteIcon name="calendar-check" size={14} />
                        <span><strong>Timings:</strong> {b.timings}</span>
                      </div>
                      <div className="academy-batch-meta-item">
                        <SiteIcon name="award" size={14} />
                        <span><strong>Coach:</strong> {b.coachName}</span>
                      </div>
                      <div className="academy-batch-meta-item">
                        <SiteIcon name="user" size={14} />
                        <span><strong>Age Group:</strong> {b.ageGroup}</span>
                      </div>
                    </div>
                    <div className="academy-batch-footer">
                      <div>
                        <strong style={{ fontSize: '1.15rem', color: '#059669' }}>₹{b.monthlyFee.toLocaleString('en-IN')}</strong>
                        <small style={{ color: '#64748b' }}> / month</small>
                      </div>
                      <button
                        type="button"
                        className="academy-btn academy-btn-primary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                        onClick={() => setIsEnrolModalOpen(true)}
                      >
                        Enquire for Batch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Facilities are shown only when supplied in the published record. */}
          {facilitiesList.length > 0 && <section className="academy-section">
            <h2>Facilities &amp; Infrastructure</h2>
            <div className="academy-facilities-grid">
              {facilitiesList.map((facility, index) => (
                <div className="facility-pill" key={index}>
                  <SiteIcon name="check-circle" size={16} />
                  <span>{facility}</span>
                </div>
              ))}
            </div>
          </section>}

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
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="academy-btn academy-btn-primary location-directions-btn">
                  <SiteIcon name="map" size={16} />
                  <span>Open in Google Maps</span>
                </a>
              )}
            </div>
          </section>

          {/* FAQs are shown only when supplied in the published record. */}
          {faqs.length > 0 && <section className="academy-section academy-faqs">
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
          </section>}

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
              Send an enquiry to ask the academy about its programmes, admissions and trial options.
            </p>

            {isEnquired ? (
              <div className="academy-enquiry-active-box">
                <div className="active-badge-header">
                  <SiteIcon name="badge-check" size={18} />
                  <strong>Admission Enquiry Active</strong>
                </div>
                <p>Application registered with coaching staff. Check status in My Dashboard.</p>
                <button
                  type="button"
                  className="academy-btn academy-btn-secondary"
                  style={{ width: '100%', marginTop: '6px' }}
                  onClick={() => setIsEnrolModalOpen(true)}
                >
                  View Enquiry Details
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="academy-btn academy-btn-enrol-block"
                onClick={() => setIsEnrolModalOpen(true)}
              >
                <SiteIcon name="award" size={18} />
                <span>Send Admission Enquiry</span>
              </button>
            )}

            {contactUrl && (
              <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="academy-btn academy-btn-whatsapp-block">
                <SiteIcon name="external-link" size={18} />
                <span>Contact Academy</span>
              </a>
            )}

            {academy.phone && (
              <a href={`tel:${academy.phone.replace(/\s+/g, '')}`} className="academy-btn academy-btn-call-block">
                <SiteIcon name="phone" size={17} />
                <span>Call {academy.phone}</span>
              </a>
            )}

            <div className="academy-disclaimer-note">
              <SiteIcon name="shield-check" size={14} />
              <span>Published, source-reviewed listing. Confirm coaching, admission terms and fees directly with the academy.</span>
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

      {isEnrolModalOpen && (
        <AcademyEnquiryModal
          academy={academy}
          onClose={() => setIsEnrolModalOpen(false)}
          onSuccess={() => setIsEnquired(true)}
          onNavigate={onNavigate}
        />
      )}
    </article>
  )
}
