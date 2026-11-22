import React, { useState, useMemo } from 'react'
import {
  getCampaigns,
  applyToCampaign,
  formatPaiseToInr,
  type Campaign,
  type SocialPlatform,
} from './campaignClient'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './CampaignMarketplacePage.css'

interface CampaignMarketplacePageProps {
  onNavigate?: (event?: React.MouseEvent<HTMLAnchorElement>, target?: string) => void
}

export function CampaignMarketplacePage({ onNavigate }: CampaignMarketplacePageProps) {
  const [selectedSport, setSelectedSport] = useState<string>('All')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeModalCampaign, setActiveModalCampaign] = useState<Campaign | null>(null)
  const [applyModalCampaign, setApplyModalCampaign] = useState<Campaign | null>(null)

  // Creator apply form state
  const [creatorName, setCreatorName] = useState('Rohan Sharma')
  const [creatorHandle, setCreatorHandle] = useState('@rohan_cricket_insider')
  const [platform, setPlatform] = useState<SocialPlatform>('youtube')
  const [followerCount, setFollowerCount] = useState<number>(28500)
  const [portfolioLink, setPortfolioLink] = useState('https://youtube.com/@RohanCricketLab')
  const [pitchNote, setPitchNote] = useState('')
  const [disclosureAgreed, setDisclosureAgreed] = useState(false)
  const [applyFeedback, setApplyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleNav = (targetPath: string, e?: React.MouseEvent<HTMLAnchorElement>) => {
    if (e) e.preventDefault()
    if (onNavigate) {
      onNavigate(e, targetPath)
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetPath)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // Load published campaigns
  const campaigns = useMemo(() => {
    return getCampaigns({
      sport: selectedSport,
      category: selectedCategory,
    })
  }, [selectedSport, selectedCategory])

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.advertiserName.toLowerCase().includes(q) ||
      c.locationCity.toLowerCase().includes(q) ||
      c.sport.toLowerCase().includes(q)
    )
  }, [campaigns, searchQuery])

  const sportsList = ['All', 'Cricket', 'Football', 'Badminton', 'Tennis', 'Basketball', 'Athletics', 'Kabaddi']
  const categoriesList = [
    { id: 'All', label: 'All Categories' },
    { id: 'academy_admissions', label: 'Academy Admissions' },
    { id: 'tournament_promotion', label: 'Tournaments & Trials' },
    { id: 'brand_apparel', label: 'Apparel & Gear' },
    { id: 'coaching_clinics', label: 'Coaching Clinics' },
    { id: 'venue_awareness', label: 'Venue Awareness' },
  ]

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyModalCampaign) return

    if (!disclosureAgreed) {
      setApplyFeedback({
        type: 'error',
        message: 'You must agree to include mandatory #Ad / #Sponsored disclosures in all deliverables.',
      })
      return
    }

    if (!pitchNote.trim()) {
      setApplyFeedback({
        type: 'error',
        message: 'Please provide a short pitch note explaining your content angle.',
      })
      return
    }

    const res = applyToCampaign({
      campaignId: applyModalCampaign.id,
      creatorId: 'creator-rohan-cricket',
      creatorName,
      creatorHandle,
      platform,
      followerCount: Number(followerCount) || 1000,
      portfolioLink,
      pitchNote,
    })

    if (res.success) {
      setApplyFeedback({
        type: 'success',
        message: 'Your creator application was submitted! The campaign owner will review your pitch.',
      })
      setTimeout(() => {
        setApplyModalCampaign(null)
        setApplyFeedback(null)
        setPitchNote('')
      }, 1800)
    } else {
      setApplyFeedback({
        type: 'error',
        message: res.message,
      })
    }
  }

  return (
    <div className="campaign-marketplace-page">
      {/* Top Breadcrumb & Status */}
      <div className="marketplace-top-bar">
        <div className="marketplace-breadcrumbs">
          <button type="button" className="crumb-btn" onClick={() => handleNav('/')}>
            <SiteIcon name="home" size={14} /> Home
          </button>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Sports Creator Marketplace</span>
        </div>
        <div className="marketplace-nav-actions">
          <button
            type="button"
            className="btn-sec-action"
            onClick={() => handleNav('/creator')}
          >
            <SiteIcon name="user-round" size={15} />
            <span>Creator Hub &amp; Earnings</span>
          </button>
          <button
            type="button"
            className="btn-sec-action"
            onClick={() => handleNav('/campaigns/manage')}
          >
            <SiteIcon name="chart" size={15} />
            <span>Advertiser Dashboard</span>
          </button>
          <button
            type="button"
            className="btn-pri-action"
            onClick={() => handleNav('/campaigns/create')}
          >
            <SiteIcon name="plus" size={15} />
            <span>Post a Campaign</span>
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <header className="marketplace-hero">
        <div className="hero-pill">
          <SiteIcon name="award" size={14} />
          <span>Two-Sided Sports Creator Economy · Indian Grassroots Ecosystem</span>
        </div>
        <h1 className="hero-title">KhelGrid Sports Creator Campaign Marketplace</h1>
        <p className="hero-subtitle">
          Commission authentic content from verified sports athletes, academy trainees, coaches, and sports storytellers.
          Zero artificial engagement. Guaranteed rewards upon verified deliverable acceptance.
        </p>
        <div className="hero-highlights">
          <div className="highlight-item">
            <SiteIcon name="shield-check" size={16} />
            <span>Anti-Spam &amp; DPDP Compliant</span>
          </div>
          <div className="highlight-item">
            <SiteIcon name="check-circle" size={16} />
            <span>Mandatory #Ad Disclosures</span>
          </div>
          <div className="highlight-item">
            <SiteIcon name="wallet" size={16} />
            <span>Immutable Reward Ledger</span>
          </div>
          <div className="highlight-item">
            <SiteIcon name="sparkles" size={16} />
            <span>100% Free Advertiser Listing</span>
          </div>
        </div>
      </header>

      {/* Filter & Search Bar */}
      <section className="marketplace-filters" aria-label="Marketplace Filters">
        <div className="filter-row-top">
          <div className="search-input-wrap">
            <SiteIcon name="search" size={16} />
            <input
              type="text"
              placeholder="Search campaigns by sport, academy, brand, or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search campaigns"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <SiteIcon name="close" size={14} />
              </button>
            )}
          </div>
          <div className="category-select-wrap">
            <label htmlFor="category-filter" className="sr-only">Filter Category</label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              {categoriesList.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sports Chips */}
        <div className="sports-chips-bar" role="tablist" aria-label="Sport categories">
          {sportsList.map(sport => (
            <button
              key={sport}
              type="button"
              className={`sport-chip ${selectedSport === sport ? 'is-active' : ''}`}
              onClick={() => setSelectedSport(sport)}
              role="tab"
              aria-selected={selectedSport === sport}
            >
              {sport}
            </button>
          ))}
        </div>
      </section>

      {/* Campaign Grid */}
      <section className="marketplace-results-section">
        <div className="results-header">
          <h2>
            Active Opportunities ({filteredCampaigns.length})
          </h2>
          <span className="results-note">
            Showing verified campaigns open for creator applications
          </span>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="no-campaigns-empty">
            <SiteIcon name="alert-circle" size={32} />
            <h3>No campaigns found matching your criteria</h3>
            <p>Try resetting your sport filter or search query to discover other opportunities.</p>
            <button
              type="button"
              className="btn-sec-action"
              onClick={() => {
                setSelectedSport('All')
                setSelectedCategory('All')
                setSearchQuery('')
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="campaign-grid">
            {filteredCampaigns.map(camp => (
              <article key={camp.id} className="campaign-card">
                <div className="card-top-meta">
                  <span className="card-role-badge">{camp.advertiserRole.toUpperCase()}</span>
                  <span className="card-sport-badge">{camp.sport}</span>
                  <span className="card-city">{camp.locationCity}</span>
                </div>

                <h3 className="card-title">{camp.title}</h3>
                <p className="card-advertiser">
                  <strong>{camp.advertiserName}</strong>
                  {camp.advertiserVerified && (
                    <span className="verified-icon" title="Verified Advertiser">
                      <SiteIcon name="badge-check" size={14} />
                    </span>
                  )}
                </p>

                <p className="card-purpose">{camp.purpose}</p>

                <div className="card-deliverables-box">
                  <span className="box-label">Deliverables:</span>
                  <ul className="deliverable-tags">
                    {camp.deliverables.map(del => (
                      <li key={del.id} className="deliverable-tag">
                        <SiteIcon name="play" size={12} />
                        <span>{del.quantity}x {del.type.replace('_', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card-footer-meta">
                  <div className="reward-info">
                    <span className="reward-label">Creator Reward</span>
                    <strong className="reward-amount">
                      {formatPaiseToInr(camp.perDeliverableFeePaise)}
                      <small> / deliverable</small>
                    </strong>
                  </div>

                  <div className="card-cta-group">
                    <button
                      type="button"
                      className="btn-view-brief"
                      onClick={() => setActiveModalCampaign(camp)}
                    >
                      View Brief
                    </button>
                    <button
                      type="button"
                      className="btn-apply-fast"
                      onClick={() => {
                        setApplyModalCampaign(camp)
                        setApplyFeedback(null)
                      }}
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Campaign Brief Drawer / Modal */}
      {activeModalCampaign && (
        <div className="modal-backdrop" onClick={() => setActiveModalCampaign(null)}>
          <div
            className="campaign-modal-dialog"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="brief-title"
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">
                  {activeModalCampaign.advertiserRole.toUpperCase()} · {activeModalCampaign.sport} · {activeModalCampaign.locationCity}
                </span>
                <h2 id="brief-title" className="modal-title">{activeModalCampaign.title}</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModalCampaign(null)}
                aria-label="Close dialog"
              >
                <SiteIcon name="close" size={20} />
              </button>
            </div>

            <div className="modal-body">
              <section className="modal-sec">
                <h4>Advertiser &amp; Budget</h4>
                <div className="modal-data-grid">
                  <div>
                    <span className="data-label">Organiser:</span>
                    <strong>{activeModalCampaign.advertiserName}</strong>
                  </div>
                  <div>
                    <span className="data-label">Compensation:</span>
                    <strong>{formatPaiseToInr(activeModalCampaign.perDeliverableFeePaise)} per deliverable</strong>
                  </div>
                  <div>
                    <span className="data-label">Total Campaign Budget:</span>
                    <strong>{formatPaiseToInr(activeModalCampaign.totalBudgetPaise)}</strong>
                  </div>
                  <div>
                    <span className="data-label">Language:</span>
                    <span>{activeModalCampaign.language}</span>
                  </div>
                </div>
              </section>

              <section className="modal-sec">
                <h4>Campaign Purpose &amp; Audience</h4>
                <p>{activeModalCampaign.purpose}</p>
                <p><strong>Target Audience:</strong> {activeModalCampaign.targetAudience}</p>
              </section>

              <section className="modal-sec">
                <h4>Key Messages to Include</h4>
                <ul className="bullet-list">
                  {activeModalCampaign.keyMessages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </section>

              {activeModalCampaign.prohibitedClaims.length > 0 && (
                <section className="modal-sec prohibited-box">
                  <h4>Prohibited Claims &amp; Anti-Spam Standards</h4>
                  <ul className="bullet-list warning-list">
                    {activeModalCampaign.prohibitedClaims.map((claim, i) => (
                      <li key={i}>{claim}</li>
                    ))}
                    <li>No artificial views, likes, bot farms, or follower rings.</li>
                  </ul>
                </section>
              )}

              <section className="modal-sec">
                <h4>Contracted Deliverable Specifications</h4>
                {activeModalCampaign.deliverables.map(del => (
                  <div key={del.id} className="deliverable-spec-card">
                    <div className="del-header">
                      <strong>{del.title} ({del.quantity}x {del.type})</strong>
                      <span className="deadline-badge">{del.deadlineDays} days turnaround</span>
                    </div>
                    <p>{del.description}</p>
                    <div className="del-rules">
                      <div><strong>Mandatory Disclosure:</strong> {del.mandatoryDisclosure}</div>
                      <div><strong>Required Hashtags:</strong> {del.requiredHashtags.join(' ')}</div>
                    </div>
                  </div>
                ))}
              </section>

              <section className="modal-sec">
                <h4>Terms &amp; Platform Invariants</h4>
                <p className="terms-text">{activeModalCampaign.termsAndConditions}</p>
                <div className="platform-invariant-notice">
                  <SiteIcon name="shield-check" size={16} />
                  <span>
                    Simulated Sandbox Balance Notice: All accepted deliverable rewards are recorded into KhelGrid's immutable append-only reward ledger.
                  </span>
                </div>
              </section>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-sec-action"
                onClick={() => setActiveModalCampaign(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-pri-action"
                onClick={() => {
                  setApplyModalCampaign(activeModalCampaign)
                  setActiveModalCampaign(null)
                  setApplyFeedback(null)
                }}
              >
                Apply to this Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creator Application Modal */}
      {applyModalCampaign && (
        <div className="modal-backdrop" onClick={() => setApplyModalCampaign(null)}>
          <div
            className="campaign-modal-dialog apply-dialog"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-title"
          >
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">CREATOR APPLICATION</span>
                <h2 id="apply-title" className="modal-title">Apply for &ldquo;{applyModalCampaign.title}&rdquo;</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setApplyModalCampaign(null)}
                aria-label="Close application dialog"
              >
                <SiteIcon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit}>
              <div className="modal-body">
                {applyFeedback && (
                  <div className={`apply-feedback-banner ${applyFeedback.type}`} role="alert">
                    <SiteIcon name={applyFeedback.type === 'success' ? 'check-circle' : 'alert-circle'} size={18} />
                    <span>{applyFeedback.message}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="creator-name">Full Name</label>
                    <input
                      id="creator-name"
                      type="text"
                      value={creatorName}
                      onChange={e => setCreatorName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="creator-handle">Primary Social Handle</label>
                    <input
                      id="creator-handle"
                      type="text"
                      value={creatorHandle}
                      onChange={e => setCreatorHandle(e.target.value)}
                      placeholder="@handle"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="creator-platform">Primary Platform</label>
                    <select
                      id="creator-platform"
                      value={platform}
                      onChange={e => setPlatform(e.target.value as SocialPlatform)}
                    >
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="x_twitter">X / Twitter</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="facebook">Facebook</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="creator-followers">Followers / Subscribers</label>
                    <input
                      id="creator-followers"
                      type="number"
                      value={followerCount}
                      onChange={e => setFollowerCount(Number(e.target.value))}
                      min="100"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="portfolio-url">Channel or Portfolio URL</label>
                  <input
                    id="portfolio-url"
                    type="url"
                    value={portfolioLink}
                    onChange={e => setPortfolioLink(e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pitch-note">Pitch Note / Proposed Angle</label>
                  <textarea
                    id="pitch-note"
                    rows={4}
                    value={pitchNote}
                    onChange={e => setPitchNote(e.target.value)}
                    placeholder="Describe how you will cover this academy or brand. Mention your typical audience engagement..."
                    required
                  />
                </div>

                <div className="disclosure-checkbox-wrap">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={disclosureAgreed}
                      onChange={e => setDisclosureAgreed(e.target.checked)}
                      required
                    />
                    <span>
                      I agree to include clear, conspicuous sponsorship disclosures (<strong>#Ad #Sponsored</strong>) and comply with Indian consumer protection standards.
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-sec-action"
                  onClick={() => setApplyModalCampaign(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pri-action"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
