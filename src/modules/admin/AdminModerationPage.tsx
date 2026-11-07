import { useState, useEffect, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  getStoredUser,
  signInWithEmail,
  type KhelGridUser,
} from '../../integrations/supabase/auth-client'
import {
  getAdminModerationQueue,
  moderateListingSubmission,
  moderateVerificationClaim,
  moderateListingReport,
  type AdminModerationQueue,
} from '../../integrations/supabase/public-client'
import './AdminModerationPage.css'

export interface AdminModerationPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
}

type TabType = 'submissions' | 'claims' | 'reports' | 'athletes'

export function AdminModerationPage({ onNavigate }: AdminModerationPageProps) {
  const [currentUser, setCurrentUser] = useState<KhelGridUser | null>(() => getStoredUser())
  const [queue, setQueue] = useState<AdminModerationQueue | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('submissions')
  const [submissionFilter, setSubmissionFilter] = useState<string>('all')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    const data = await getAdminModerationQueue()
    setQueue(data)
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [currentUser])

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (onNavigate) {
      onNavigate(event, href)
    }
  }

  const handleDemoAdminLogin = async () => {
    const res = await signInWithEmail({ email: 'admin@khelgrid.com', password: 'admin123' })
    if (res.user) {
      setCurrentUser(res.user)
      showToast('Signed in successfully as Platform Admin')
    }
  }

  const handleApproveSubmission = async (id: string, title: string) => {
    await moderateListingSubmission(id, 'approved', 'Approved by administrative desk review')
    showToast(`✓ Approved: "${title}" is now published`)
    void loadData()
  }

  const handleRejectSubmission = async (id: string, title: string) => {
    await moderateListingSubmission(id, 'rejected', 'Declined: Incomplete or unverifiable source proof')
    showToast(`✗ Rejected: "${title}" marked as declined`)
    void loadData()
  }

  const handleVerifyClaim = async (id: string, name: string) => {
    await moderateVerificationClaim(id, 'verified', 'Official documentation accepted')
    showToast(`✓ Verified claim: "${name}" granted official badge`)
    void loadData()
  }

  const handleRejectClaim = async (id: string, name: string) => {
    await moderateVerificationClaim(id, 'rejected', 'Proof document could not be authenticated')
    showToast(`✗ Rejected claim for "${name}"`)
    void loadData()
  }

  const handleResolveReport = async (id: string, name: string) => {
    await moderateListingReport(id, 'resolved', 'Investigated and resolved')
    showToast(`✓ Resolved report for "${name}"`)
    void loadData()
  }

  const handleDismissReport = async (id: string, name: string) => {
    await moderateListingReport(id, 'dismissed', 'Dismissed as false report')
    showToast(`Notice: Dismissed report for "${name}"`)
    void loadData()
  }

  // Role Gate: Must be admin
  const isAdmin = currentUser?.role === 'admin'

  if (!isAdmin) {
    return (
      <div className="admin-page-root">
        <div className="admin-restricted-box">
          <SiteIcon name="shield-check" size={44} />
          <h2>Administrative Moderation Desk</h2>
          <p>
            Access to the central moderation desk is restricted to authorized platform administrators, NIS
            scouts, and verified entity moderators.
          </p>
          <button type="button" className="admin-btn admin-btn-approve" onClick={handleDemoAdminLogin}>
            <SiteIcon name="user-round" size={16} />
            <span>Sign In as Demo Admin (admin@khelgrid.com)</span>
          </button>
        </div>
      </div>
    )
  }

  const filteredSubmissions =
    queue?.pendingSubmissions.filter(s => {
      if (submissionFilter === 'all') return true
      return s.listing_type === submissionFilter
    }) ?? []

  return (
    <div className="admin-page-root">
      {/* Header */}
      <header className="admin-header">
        <span className="admin-eyebrow">
          <SiteIcon name="shield-check" size={14} /> Platform Moderation &amp; Trust Desk
        </span>
        <div className="admin-title-row">
          <div>
            <h1>Central Administrative Desk</h1>
            <p className="admin-subtitle">
              Review incoming turf submissions, verify coach credentials, approve academy claims, and resolve
              athlete safety reports in real time.
            </p>
          </div>
          <div className="admin-role-badge">
            <SiteIcon name="badge-check" size={15} />
            <span>Logged in as Admin ({currentUser.fullName})</span>
          </div>
        </div>

        {/* Live Metrics Overview */}
        {queue && (
          <div className="admin-metrics-grid">
            <div className="admin-metric-card highlight">
              <span className="admin-metric-val">{queue.stats.pendingSubmissionsCount}</span>
              <span className="admin-metric-lbl">Pending Submissions</span>
            </div>
            <div className="admin-metric-card highlight">
              <span className="admin-metric-val">{queue.stats.pendingClaimsCount}</span>
              <span className="admin-metric-lbl">Verification Claims</span>
            </div>
            <div className="admin-metric-card urgent">
              <span className="admin-metric-val">{queue.stats.pendingReportsCount}</span>
              <span className="admin-metric-lbl">Open Scam Reports</span>
            </div>
            <div className="admin-metric-card success">
              <span className="admin-metric-val">{queue.stats.totalVenues + queue.stats.totalAcademies}</span>
              <span className="admin-metric-lbl">Live Catalogues</span>
            </div>
          </div>
        )}
      </header>

      {/* Tabs Navigation */}
      <nav className="admin-tabs-nav" aria-label="Moderation desks">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          <SiteIcon name="file-text" size={16} />
          <span>Submissions Queue</span>
          {queue && (
            <span className="admin-tab-badge">
              {queue.pendingSubmissions.filter(s => s.status === 'pending_review').length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          <SiteIcon name="badge-check" size={16} />
          <span>Entity Claims &amp; Proof</span>
          {queue && (
            <span className="admin-tab-badge">
              {queue.pendingClaims.filter(c => c.status === 'pending_review').length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <SiteIcon name="alert-triangle" size={16} />
          <span>Trust &amp; Safety Scam Desk</span>
          {queue && (
            <span className="admin-tab-badge">
              {queue.pendingReports.filter(r => r.status === 'pending' || r.status === 'investigating').length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'athletes' ? 'active' : ''}`}
          onClick={() => setActiveTab('athletes')}
        >
          <SiteIcon name="trophy" size={16} />
          <span>Athlete Badge Verification</span>
        </button>
      </nav>

      {/* Tab 1: Submissions Queue */}
      {activeTab === 'submissions' && (
        <section aria-label="Listing submissions">
          {/* Sub-filter pills */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {['all', 'venue', 'academy', 'opportunity', 'coach', 'event'].map(type => (
              <button
                key={type}
                type="button"
                className={`admin-btn ${submissionFilter === type ? 'admin-btn-approve' : 'admin-btn-secondary'}`}
                style={{ textTransform: 'capitalize' }}
                onClick={() => setSubmissionFilter(type)}
              >
                {type === 'all' ? 'All Submissions' : `${type}s`}
              </button>
            ))}
          </div>

          {loading ? (
            <p>Loading pending submissions…</p>
          ) : filteredSubmissions.length === 0 ? (
            <p style={{ color: '#64748b' }}>No pending submissions matching this filter.</p>
          ) : (
            <div className="admin-items-list">
              {filteredSubmissions.map(sub => (
                <article key={sub.id} className="admin-mod-card">
                  <div className="admin-mod-card-top">
                    <div className="admin-mod-card-title-group">
                      <span className={`admin-type-pill ${sub.listing_type}`}>{sub.listing_type}</span>
                      <h3 className="admin-item-title">{sub.title}</h3>
                    </div>
                    <span className={`admin-status-badge ${sub.status}`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="admin-mod-card-meta">
                    {sub.city && (
                      <span>
                        <SiteIcon name="map-pin" size={14} /> {sub.city}
                      </span>
                    )}
                    <span>
                      <SiteIcon name="calendar-check" size={14} />{' '}
                      {new Date(sub.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {sub.source_url && (
                      <a href={sub.source_url} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>
                        Source URL ↗
                      </a>
                    )}
                  </div>

                  {sub.details && <p className="admin-mod-card-desc">{sub.details}</p>}

                  {sub.status === 'pending_review' && (
                    <div className="admin-mod-card-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => handleApproveSubmission(sub.id, sub.title)}
                      >
                        <SiteIcon name="badge-check" size={14} />
                        <span>Approve &amp; Publish</span>
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => handleRejectSubmission(sub.id, sub.title)}
                      >
                        <SiteIcon name="close" size={14} />
                        <span>Decline Submission</span>
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Claims Desk */}
      {activeTab === 'claims' && (
        <section aria-label="Entity claims">
          {queue?.pendingClaims.length === 0 ? (
            <p style={{ color: '#64748b' }}>No pending entity verification claims.</p>
          ) : (
            <div className="admin-items-list">
              {queue?.pendingClaims.map(claim => (
                <article key={claim.id} className="admin-mod-card">
                  <div className="admin-mod-card-top">
                    <div className="admin-mod-card-title-group">
                      <span className={`admin-type-pill ${claim.entity_type}`}>{claim.entity_type}</span>
                      <h3 className="admin-item-title">{claim.entity_name}</h3>
                    </div>
                    <span className={`admin-status-badge ${claim.status}`}>
                      {claim.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="admin-mod-card-meta">
                    <span>
                      <SiteIcon name="user-round" size={14} /> {claim.contact_name}{' '}
                      {claim.claimant_role ? `(${claim.claimant_role})` : ''}
                    </span>
                    <span>
                      <SiteIcon name="phone" size={14} /> {claim.contact_phone}
                    </span>
                    {claim.contact_email && <span>{claim.contact_email}</span>}
                    <span>Document: {claim.document_type.replace('_', ' ')}</span>
                  </div>

                  <p className="admin-mod-card-desc">{claim.proof_details}</p>

                  {claim.status === 'pending_review' && (
                    <div className="admin-mod-card-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => handleVerifyClaim(claim.id, claim.entity_name)}
                      >
                        <SiteIcon name="badge-check" size={14} />
                        <span>Grant Official Verification Badge</span>
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => handleRejectClaim(claim.id, claim.entity_name)}
                      >
                        <SiteIcon name="close" size={14} />
                        <span>Reject Claim</span>
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Trust & Safety Scam Desk */}
      {activeTab === 'reports' && (
        <section aria-label="Scam reports">
          {queue?.pendingReports.length === 0 ? (
            <p style={{ color: '#64748b' }}>No active scam reports or fraud complaints.</p>
          ) : (
            <div className="admin-items-list">
              {queue?.pendingReports.map(rep => (
                <article key={rep.id} className="admin-mod-card">
                  <div className="admin-mod-card-top">
                    <div className="admin-mod-card-title-group">
                      <span className="admin-type-pill report">FRAUD REPORT</span>
                      <h3 className="admin-item-title">{rep.entity_name}</h3>
                    </div>
                    <span className={`admin-status-badge ${rep.status}`}>{rep.status}</span>
                  </div>

                  <div className="admin-mod-card-meta">
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>
                      Violation: {rep.reason.replace('_', ' ').toUpperCase()}
                    </span>
                    {rep.reporter_email && <span>Reporter: {rep.reporter_email}</span>}
                    {rep.reporter_phone && <span>Phone: {rep.reporter_phone}</span>}
                  </div>

                  <p className="admin-mod-card-desc" style={{ borderColor: '#ef4444' }}>
                    {rep.details}
                  </p>

                  <div className="admin-mod-card-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-approve"
                      onClick={() => handleResolveReport(rep.id, rep.entity_name)}
                    >
                      <SiteIcon name="badge-check" size={14} />
                      <span>Resolve &amp; Take Action</span>
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => handleDismissReport(rep.id, rep.entity_name)}
                    >
                      <span>Dismiss Report</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 4: Athlete Verification Desk */}
      {activeTab === 'athletes' && (
        <section aria-label="Athlete verification">
          <div className="admin-mod-card">
            <h3 className="admin-item-title">Scout &amp; NIS Athlete Verification Hub</h3>
            <p className="admin-subtitle">
              Verify national tournament medals, SGFI school games certificates, and SAI NIS Patiala talent
              evaluations.
            </p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a
                href="/verification"
                className="admin-btn admin-btn-approve"
                onClick={e => handleLinkClick(e, '/verification')}
              >
                <SiteIcon name="award" size={15} />
                <span>Open 3-Step Verification Desk</span>
              </a>
              <a
                href="/scout-portal"
                className="admin-btn admin-btn-secondary"
                onClick={e => handleLinkClick(e, '/scout-portal')}
              >
                <SiteIcon name="search" size={15} />
                <span>Open Scout Search Workbench</span>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="admin-toast-banner" role="status">
          <SiteIcon name="badge-check" size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
export default AdminModerationPage
