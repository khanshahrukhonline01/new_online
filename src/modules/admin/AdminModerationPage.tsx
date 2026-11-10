import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { signInWithEmail, signOut } from '../../integrations/supabase/auth-client'
import {
  getAdminModerationQueue,
  startListingReview,
  approveListingSubmission,
  rejectListingSubmission,
  requestListingCorrections,
  publishListingSubmission,
  unpublishListingSubmission,
  getListingSubmissionAuditTrail,
  getListingSubmissionVersions,
  type AdminModerationQueue,
  type ModeratorQueueItem,
  type SubmissionAuditItem,
  type SubmissionVersionItem,
} from '../../integrations/supabase/public-client'
import './AdminModerationPage.css'

type TabFilter =
  | 'all'
  | 'pending_review'
  | 'under_review'
  | 'changes_requested'
  | 'resubmitted'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'unpublished'

type ActionDialogType =
  | 'approve'
  | 'reject'
  | 'request_corrections'
  | 'publish'
  | 'unpublish'
  | null

export interface AdminModerationPageProps {
  initialQueue?: AdminModerationQueue | null
}

export function AdminModerationPage({ initialQueue }: AdminModerationPageProps = {}) {
  const [queue, setQueue] = useState<AdminModerationQueue | null>(initialQueue ?? null)
  const [loading, setLoading] = useState(initialQueue === undefined)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Auth state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  // Filters & Search
  const [activeTab, setActiveTab] = useState<TabFilter>('pending_review')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Detail Modal & Action State
  const [selectedItem, setSelectedItem] = useState<ModeratorQueueItem | null>(null)
  const [auditTrail, setAuditTrail] = useState<SubmissionAuditItem[]>([])
  const [versionHistory, setVersionHistory] = useState<SubmissionVersionItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [actionDialog, setActionDialog] = useState<ActionDialogType>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionNotes, setActionNotes] = useState('')
  const [targetSlug, setTargetSlug] = useState('')

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminModerationQueue({
        status: activeTab !== 'all' ? activeTab : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchTerm.trim() || undefined,
        limit: 100,
        sortBy,
        sortDir,
      })
      setQueue(data)
    } catch (cause) {
      setQueue(null)
      setError(cause instanceof Error ? cause.message : 'You are not authorized to access the moderation queue.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, categoryFilter, searchTerm, sortBy, sortDir])

  useEffect(() => {
    if (initialQueue !== undefined) return
    void loadQueue()
  }, [initialQueue, loadQueue])

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSigningIn(true)
    try {
      const result = await signInWithEmail({ email, password })
      if (!result.success) {
        setError(result.message || 'Sign-in failed.')
        return
      }
      setPassword('')
      await loadQueue()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setQueue(null)
    setSelectedItem(null)
    setNotice('Signed out of the moderation desk.')
  }

  const openDetailView = async (item: ModeratorQueueItem) => {
    setSelectedItem(item)
    setActionDialog(null)
    setActionMessage('')
    setActionNotes('')
    setTargetSlug('')
    setLoadingDetails(true)
    try {
      const [audits, versions] = await Promise.all([
        getListingSubmissionAuditTrail(item.id).catch(() => []),
        getListingSubmissionVersions(item.id).catch(() => []),
      ])
      setAuditTrail(audits)
      setVersionHistory(versions)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleStartReview = async (item: ModeratorQueueItem) => {
    setBusyId(item.id)
    setError('')
    try {
      await startListingReview(item.id, item.version)
      setNotice(`Started review for "${item.title}".`)
      await loadQueue()
      if (selectedItem?.id === item.id) {
        setSelectedItem({ ...item, status: 'under_review', version: item.version + 1 })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start review.')
    } finally {
      setBusyId(null)
    }
  }

  const handleExecuteAction = async () => {
    if (!selectedItem || !actionDialog) return
    setBusyId(selectedItem.id)
    setError('')
    setNotice('')
    try {
      if (actionDialog === 'approve') {
        await approveListingSubmission(selectedItem.id, actionNotes.trim() || undefined, selectedItem.version)
        setNotice(`Submission "${selectedItem.title}" approved. Catalogue publication remains a separate step.`)
      } else if (actionDialog === 'reject') {
        if (!actionMessage.trim()) {
          setError('A rejection reason is required.')
          setBusyId(null)
          return
        }
        await rejectListingSubmission(selectedItem.id, actionMessage.trim(), actionNotes.trim() || undefined, selectedItem.version)
        setNotice(`Submission "${selectedItem.title}" rejected.`)
      } else if (actionDialog === 'request_corrections') {
        if (!actionMessage.trim() || actionMessage.trim().length < 10) {
          setError('A clear correction message for the submitter is required (at least 10 characters).')
          setBusyId(null)
          return
        }
        await requestListingCorrections(selectedItem.id, actionMessage.trim(), actionNotes.trim() || undefined, selectedItem.version)
        setNotice(`Corrections requested for "${selectedItem.title}". The submitter can now update and resubmit.`)
      } else if (actionDialog === 'publish') {
        const res = await publishListingSubmission(selectedItem.id, targetSlug.trim() || undefined, undefined, selectedItem.version)
        setNotice(`Published to ${res.publishedTable} with slug "${res.slug}"!`)
      } else if (actionDialog === 'unpublish') {
        if (!actionMessage.trim()) {
          setError('An unpublication reason is required.')
          setBusyId(null)
          return
        }
        await unpublishListingSubmission(selectedItem.id, actionMessage.trim(), actionNotes.trim() || undefined, selectedItem.version)
        setNotice(`Listing "${selectedItem.title}" unpublished. It is no longer visible in public catalogue queries.`)
      }
      setActionDialog(null)
      setSelectedItem(null)
      await loadQueue()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action could not be completed.')
    } finally {
      setBusyId(null)
    }
  }

  // Filter items in memory if client search or tab is applied
  const items = queue?.pendingSubmissions || []
  const filteredItems = items.filter(item => {
    if (activeTab !== 'all' && item.status !== activeTab) return false
    if (categoryFilter !== 'all' && item.listing_type !== categoryFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchTitle = item.title.toLowerCase().includes(term)
      const matchCity = (item.city || '').toLowerCase().includes(term)
      const matchRef = item.reference_number.toLowerCase().includes(term)
      if (!matchTitle && !matchCity && !matchRef) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)

  return (
    <section className="admin-page-root content-page">
      <header className="admin-header">
        <span className="admin-eyebrow">
          <SiteIcon name="shield-check" size={14} /> Protected Moderation Desk
        </span>
        <div className="admin-title-row">
          <div>
            <h1>Listing review queue</h1>
            <p className="admin-subtitle">
              Only accounts allowlisted in the development database can read or review these submissions. Approval does not automatically publish a listing.
            </p>
          </div>
          {queue && (
            <div className="admin-mod-card-actions">
              <span className="admin-role-badge">
                <SiteIcon name="check-circle" size={14} /> Authorized Moderator
              </span>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void handleSignOut()}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {error && (
        <p className="state-panel state-unavailable" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="state-panel state-available" role="status">
          {notice}
        </p>
      )}

      {loading && !queue ? (
        <p>Loading protected moderation desk…</p>
      ) : queue ? (
        <>
          {/* Summary KPI Cards */}
          <div className="admin-metrics-grid">
            <div className="admin-metric-card highlight">
              <span className="admin-metric-val">{queue.stats.pendingSubmissionsCount}</span>
              <span className="admin-metric-lbl">Pending Review</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-val">{queue.stats.underReviewCount ?? 0}</span>
              <span className="admin-metric-lbl">In Review</span>
            </div>
            <div className="admin-metric-card urgent">
              <span className="admin-metric-val">{queue.stats.changesRequestedCount ?? 0}</span>
              <span className="admin-metric-lbl">Changes Requested</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-val">{queue.stats.approvedCount ?? 0}</span>
              <span className="admin-metric-lbl">Approved (Unpublished)</span>
            </div>
            <div className="admin-metric-card success">
              <span className="admin-metric-val">{queue.stats.publishedCount ?? 0}</span>
              <span className="admin-metric-lbl">Published Catalogue</span>
            </div>
          </div>

          {/* Status Tabs Navigation */}
          <nav className="admin-tabs-nav" aria-label="Moderation status filter">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'pending_review' ? 'active' : ''}`}
              onClick={() => { setActiveTab('pending_review'); setPage(1) }}
            >
              Pending <span className="admin-tab-badge">{queue.stats.pendingSubmissionsCount}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'under_review' ? 'active' : ''}`}
              onClick={() => { setActiveTab('under_review'); setPage(1) }}
            >
              Under Review <span className="admin-tab-badge">{queue.stats.underReviewCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'changes_requested' ? 'active' : ''}`}
              onClick={() => { setActiveTab('changes_requested'); setPage(1) }}
            >
              Changes Requested <span className="admin-tab-badge">{queue.stats.changesRequestedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'resubmitted' ? 'active' : ''}`}
              onClick={() => { setActiveTab('resubmitted'); setPage(1) }}
            >
              Resubmitted
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => { setActiveTab('approved'); setPage(1) }}
            >
              Approved <span className="admin-tab-badge">{queue.stats.approvedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'published' ? 'active' : ''}`}
              onClick={() => { setActiveTab('published'); setPage(1) }}
            >
              Published <span className="admin-tab-badge">{queue.stats.publishedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => { setActiveTab('rejected'); setPage(1) }}
            >
              Rejected
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'unpublished' ? 'active' : ''}`}
              onClick={() => { setActiveTab('unpublished'); setPage(1) }}
            >
              Unpublished
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveTab('all'); setPage(1) }}
            >
              All Items <span className="admin-tab-badge">{items.length}</span>
            </button>
          </nav>

          {/* Search & Filters Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-search-box">
              <SiteIcon name="search" size={16} />
              <input
                type="search"
                className="admin-search-input"
                placeholder="Search by title, city, or reference number (KHL-…)"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
              />
            </div>
            <div className="admin-filter-group">
              <label>
                Category:
                <select
                  className="admin-select"
                  value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
                >
                  <option value="all">All Categories</option>
                  <option value="opportunity">Opportunity / Trial</option>
                  <option value="venue">Venue</option>
                  <option value="academy">Academy</option>
                  <option value="coach">Coach</option>
                  <option value="event">Event</option>
                  <option value="pickup_game">Pickup Game</option>
                  <option value="sport">Sport</option>
                </select>
              </label>

              <label>
                Sort:
                <select
                  className="admin-select"
                  value={`${sortBy}-${sortDir}`}
                  onChange={e => {
                    const [f, d] = e.target.value.split('-') as ['created_at' | 'updated_at', 'desc' | 'asc']
                    setSortBy(f)
                    setSortDir(d)
                  }}
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="updated_at-desc">Recently Updated</option>
                </select>
              </label>

              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadQueue()}>
                Refresh Queue
              </button>
            </div>
          </div>

          {/* Submissions List */}
          {paginatedItems.length === 0 ? (
            <div className="state-panel">
              <p>No listings match the selected status or filters.</p>
            </div>
          ) : (
            <div className="admin-items-list">
              {paginatedItems.map(sub => (
                <article key={sub.id} className="admin-mod-card">
                  <div className="admin-mod-card-top">
                    <div className="admin-mod-card-title-group">
                      <span className="admin-ref-code">{sub.reference_number}</span>
                      <span className={`admin-type-pill ${sub.listing_type}`}>{sub.listing_type}</span>
                      <h3 className="admin-item-title">{sub.title}</h3>
                    </div>
                    <span className={`admin-status-badge ${sub.status}`}>
                      {sub.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="admin-mod-card-meta">
                    {sub.city && (
                      <span>
                        <SiteIcon name="map-pin" size={14} /> {sub.city}
                      </span>
                    )}
                    <span>
                      <SiteIcon name="calendar-check" size={14} /> Submitted {new Date(sub.created_at).toLocaleDateString('en-IN')}
                    </span>
                    <span>v{sub.version}</span>
                    {sub.source_url && (
                      <a href={sub.source_url} target="_blank" rel="noreferrer" title="Verify HTTPS source">
                        Official source ↗
                      </a>
                    )}
                  </div>

                  {sub.details && <p className="admin-mod-card-desc">{sub.details}</p>}

                  {sub.correction_request && (
                    <div className="state-panel state-unavailable" style={{ margin: '0.25rem 0' }}>
                      <strong>Active Correction Request:</strong> {sub.correction_request}
                    </div>
                  )}

                  {sub.rejection_reason && (
                    <div className="state-panel state-unavailable" style={{ margin: '0.25rem 0' }}>
                      <strong>Rejection Reason:</strong> {sub.rejection_reason}
                    </div>
                  )}

                  <div className="admin-mod-card-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => void openDetailView(sub)}
                    >
                      <SiteIcon name="search" size={14} /> Inspect & History
                    </button>

                    {(sub.status === 'pending_review' || sub.status === 'resubmitted') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === sub.id}
                        onClick={() => void handleStartReview(sub)}
                      >
                        Start Review
                      </button>
                    )}

                    {sub.status !== 'approved' && sub.status !== 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => { setSelectedItem(sub); setActionDialog('approve'); setActionNotes('') }}
                      >
                        <SiteIcon name="badge-check" size={14} /> Approve
                      </button>
                    )}

                    {sub.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-publish"
                        onClick={() => { setSelectedItem(sub); setActionDialog('publish'); setTargetSlug('') }}
                      >
                        <SiteIcon name="arrow-up-right" size={14} /> Publish to Catalogue
                      </button>
                    )}

                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        onClick={() => { setSelectedItem(sub); setActionDialog('request_corrections'); setActionMessage('') }}
                      >
                        Request Corrections
                      </button>
                    )}

                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => { setSelectedItem(sub); setActionDialog('reject'); setActionMessage('') }}
                      >
                        <SiteIcon name="close" size={14} /> Reject
                      </button>
                    )}

                    {sub.status === 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => { setSelectedItem(sub); setActionDialog('unpublish'); setActionMessage('') }}
                      >
                        Unpublish
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {Math.min((page - 1) * pageSize + 1, filteredItems.length)} -{' '}
                {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}
              </span>
              <div className="admin-mod-card-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Submission Detail & Action Modal */}
          {selectedItem && (
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-sub-title">
              <div className="admin-modal-card">
                <div className="admin-modal-header">
                  <div>
                    <span className="admin-ref-code">{selectedItem.reference_number}</span>
                    <h2 id="modal-sub-title" style={{ margin: '0.35rem 0' }}>{selectedItem.title}</h2>
                    <span className={`admin-status-badge ${selectedItem.status}`}>
                      Status: {selectedItem.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => { setSelectedItem(null); setActionDialog(null) }}
                  >
                    Close
                  </button>
                </div>

                <div className="admin-modal-body">
                  <div className="admin-detail-grid">
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Listing Category</span>
                      <span className="admin-detail-val">{selectedItem.listing_type}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">City / Location</span>
                      <span className="admin-detail-val">{selectedItem.city || 'India'}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Version</span>
                      <span className="admin-detail-val">v{selectedItem.version}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Submitted On</span>
                      <span className="admin-detail-val">
                        {new Date(selectedItem.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="admin-detail-label">Official HTTPS Source</span>
                    <p style={{ margin: '0.25rem 0' }}>
                      {selectedItem.source_url ? (
                        <a href={selectedItem.source_url} target="_blank" rel="noreferrer">
                          {selectedItem.source_url} ↗
                        </a>
                      ) : (
                        <em>No official source URL provided by submitter</em>
                      )}
                    </p>
                  </div>

                  <div>
                    <span className="admin-detail-label">Submitter Information & Context</span>
                    <div className="admin-mod-card-desc">
                      {selectedItem.details || <em>No additional details submitted.</em>}
                    </div>
                    <small style={{ color: '#64748b', display: 'block', marginTop: '0.35rem' }}>
                      Note: Submitter-provided data is unverified community input until checked by KhelGrid staff.
                    </small>
                  </div>

                  {/* Action Forms within Modal */}
                  {actionDialog === 'approve' && (
                    <div className="admin-dialog-box">
                      <h3>Approve Submission for Catalogue Publication</h3>
                      <p>
                        Approval marks this intake suggestion as verified. It does NOT automatically publish a public record. Catalogue publication remains a separate explicit step.
                      </p>
                      <label>
                        Internal moderator notes (optional, private to staff):
                        <textarea
                          rows={3}
                          value={actionNotes}
                          onChange={e => setActionNotes(e.target.value)}
                          placeholder="Evidence checked, sources verified, etc."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-approve"
                          disabled={busyId === selectedItem.id}
                          onClick={() => void handleExecuteAction()}
                        >
                          Confirm Approval
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {actionDialog === 'reject' && (
                    <div className="admin-dialog-box">
                      <h3>Reject Submission</h3>
                      <p>
                        Provide a polite, transparent explanation. This reason will be visible to the submitter on their tracking view.
                      </p>
                      <label>
                        Rejection reason for submitter *:
                        <textarea
                          rows={3}
                          required
                          value={actionMessage}
                          onChange={e => setActionMessage(e.target.value)}
                          placeholder="e.g. Incomplete official contact details, duplicate listing, or expired event."
                        />
                      </label>
                      <label>
                        Internal notes (optional, staff only):
                        <textarea
                          rows={2}
                          value={actionNotes}
                          onChange={e => setActionNotes(e.target.value)}
                          placeholder="Staff rationale"
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          disabled={busyId === selectedItem.id || !actionMessage.trim()}
                          onClick={() => void handleExecuteAction()}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {actionDialog === 'request_corrections' && (
                    <div className="admin-dialog-box">
                      <h3>Request Corrections from Submitter</h3>
                      <p>
                        The submitter will see this message on their tracking portal and can edit and resubmit their submission.
                      </p>
                      <label>
                        Correction message *:
                        <textarea
                          rows={3}
                          required
                          value={actionMessage}
                          onChange={e => setActionMessage(e.target.value)}
                          placeholder="Please provide the exact court surface type and contact WhatsApp number."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-warning"
                          disabled={busyId === selectedItem.id || !actionMessage.trim()}
                          onClick={() => void handleExecuteAction()}
                        >
                          Send Correction Request
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {actionDialog === 'publish' && (
                    <div className="admin-dialog-box">
                      <h3>Publish to Public Catalogue</h3>
                      <p>
                        This will insert a live record into <strong>public.{selectedItem.listing_type === 'opportunity' ? 'opportunities' : selectedItem.listing_type === 'pickup_game' ? 'pickup_games' : selectedItem.listing_type + 's'}</strong> and mark it as published.
                      </p>
                      <label>
                        Custom URL slug (optional, auto-generated if left blank):
                        <input
                          type="text"
                          value={targetSlug}
                          onChange={e => setTargetSlug(e.target.value)}
                          placeholder="e.g. kanteerava-stadium-bengaluru"
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-publish"
                          disabled={busyId === selectedItem.id}
                          onClick={() => void handleExecuteAction()}
                        >
                          Confirm Live Publication
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {actionDialog === 'unpublish' && (
                    <div className="admin-dialog-box">
                      <h3>Unpublish Catalogue Listing</h3>
                      <p>
                        This will immediately set the catalogue record status to draft, removing it from all public catalogue queries while preserving history.
                      </p>
                      <label>
                        Reason for unpublication *:
                        <textarea
                          rows={3}
                          required
                          value={actionMessage}
                          onChange={e => setActionMessage(e.target.value)}
                          placeholder="e.g. Venue permanently closed or misleading pricing report."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          disabled={busyId === selectedItem.id || !actionMessage.trim()}
                          onClick={() => void handleExecuteAction()}
                        >
                          Confirm Unpublish
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audit Trail Timeline */}
                  <div>
                    <span className="admin-detail-label">Moderation Audit History</span>
                    {loadingDetails ? (
                      <p>Loading audit trail…</p>
                    ) : auditTrail.length === 0 ? (
                      <p style={{ color: '#64748b' }}>No audit history recorded yet.</p>
                    ) : (
                      <div className="admin-audit-timeline">
                        {auditTrail.map(audit => (
                          <div key={audit.id} className="admin-audit-entry">
                            <div className="admin-audit-header">
                              <span>Action: {audit.action}</span>
                              {audit.from_status && audit.to_status && (
                                <span style={{ fontWeight: 400, color: '#64748b' }}>
                                  ({audit.from_status} → {audit.to_status})
                                </span>
                              )}
                              <span className="admin-audit-time">
                                {new Date(audit.created_at).toLocaleString('en-IN')}
                              </span>
                            </div>
                            {audit.notes && <div className="admin-audit-notes">{audit.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resubmission History */}
                  {versionHistory.length > 0 && (
                    <div>
                      <span className="admin-detail-label">Previous Submitted Versions ({versionHistory.length})</span>
                      <div className="admin-items-list" style={{ marginTop: '0.5rem' }}>
                        {versionHistory.map(v => (
                          <div key={v.id} className="admin-mod-card" style={{ padding: '0.75rem' }}>
                            <div className="admin-mod-card-top">
                              <strong>v{v.version}: {v.title}</strong>
                              <span className="admin-audit-time">
                                {new Date(v.created_at).toLocaleString('en-IN')}
                              </span>
                            </div>
                            {v.details && <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>{v.details}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <form className="admin-restricted-box" onSubmit={handleSignIn}>
          <SiteIcon name="shield-check" size={36} />
          <h2>Moderator Sign-In</h2>
          <p>
            Only accounts allowlisted in the development database can open this queue; public registration does not grant moderator access.
          </p>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.75rem' }}>
            Moderator Email
            <input
              type="email"
              autoComplete="username"
              required
              className="admin-search-input"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </label>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: '1.25rem' }}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              className="admin-search-input"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" className="admin-btn admin-btn-approve" style={{ width: '100%', justifyContent: 'center' }} disabled={signingIn}>
            {signingIn ? 'Verifying access…' : 'Sign in to Moderation Desk'}
          </button>
        </form>
      )}
    </section>
  )
}
