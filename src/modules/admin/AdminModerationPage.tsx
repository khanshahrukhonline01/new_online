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
import {
  getChronicleModerationQueue,
  getLocalModerationQueue,
  startManuscriptReview,
  requestManuscriptCorrections,
  approveManuscript,
  rejectManuscript,
  publishManuscriptToArchive,
  type ChronicleModerationSubmission,
  type ChronicleModerationQueueResult,
} from '../../integrations/supabase/chronicle-client'
import { RESEARCH_CATEGORIES } from '../khelchronicle/data/khelchronicleData'
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
  initialDesk?: 'listings' | 'chronicle'
  initialChronicleQueue?: ChronicleModerationQueueResult | null
}

export function AdminModerationPage({
  initialQueue,
  initialDesk = 'listings',
  initialChronicleQueue,
}: AdminModerationPageProps = {}) {
  const [activeDesk, setActiveDesk] = useState<'listings' | 'chronicle'>(initialDesk)
  const [queue, setQueue] = useState<AdminModerationQueue | null>(initialQueue ?? null)
  const [loading, setLoading] = useState(initialQueue === undefined)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Auth state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  // Listing Filters & Search
  const [activeTab, setActiveTab] = useState<TabFilter>('pending_review')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Listing Detail Modal & Action State
  const [selectedItem, setSelectedItem] = useState<ModeratorQueueItem | null>(null)
  const [auditTrail, setAuditTrail] = useState<SubmissionAuditItem[]>([])
  const [versionHistory, setVersionHistory] = useState<SubmissionVersionItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [actionDialog, setActionDialog] = useState<ActionDialogType>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionNotes, setActionNotes] = useState('')
  const [targetSlug, setTargetSlug] = useState('')

  // Chronicle Manuscripts State
  const [chronicleQueue, setChronicleQueue] = useState<ChronicleModerationQueueResult | null>(() => {
    if (initialChronicleQueue !== undefined) return initialChronicleQueue
    const queue = getLocalModerationQueue()
    return {
      submissions: queue,
      stats: {
        pendingCount: queue.filter(s => s.status === 'pending_review').length,
        underReviewCount: queue.filter(s => s.status === 'under_review').length,
        changesRequestedCount: queue.filter(s => s.status === 'changes_requested').length,
        approvedCount: queue.filter(s => s.status === 'approved').length,
        publishedCount: queue.filter(s => s.status === 'published').length,
        rejectedCount: queue.filter(s => s.status === 'rejected').length,
        totalCount: queue.length,
      },
    }
  })
  const [chronicleActiveTab, setChronicleActiveTab] = useState<
    'all' | 'pending_review' | 'under_review' | 'changes_requested' | 'approved' | 'published' | 'rejected'
  >('pending_review')
  const [chronicleSearchTerm, setChronicleSearchTerm] = useState('')
  const [chronicleCategoryFilter, setChronicleCategoryFilter] = useState('all')
  const [chroniclePage, setChroniclePage] = useState(1)
  const [selectedManuscript, setSelectedManuscript] = useState<ChronicleModerationSubmission | null>(null)
  const [manuscriptActionDialog, setManuscriptActionDialog] = useState<
    'screen' | 'corrections' | 'approve' | 'publish' | 'reject' | null
  >(null)
  const [manuscriptActionMessage, setManuscriptActionMessage] = useState('')
  const [manuscriptActionNotes, setManuscriptActionNotes] = useState('')
  const [manuscriptTargetSlug, setManuscriptTargetSlug] = useState('')
  const [manuscriptTargetPaperId, setManuscriptTargetPaperId] = useState('')

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

  const loadChronicleQueue = useCallback(async () => {
    try {
      const data = await getChronicleModerationQueue({
        status: chronicleActiveTab !== 'all' ? chronicleActiveTab : undefined,
        category: chronicleCategoryFilter !== 'all' ? chronicleCategoryFilter : undefined,
        search: chronicleSearchTerm.trim() || undefined,
      })
      setChronicleQueue(data)
    } catch {
      // non-fatal in offline mode
    }
  }, [chronicleActiveTab, chronicleCategoryFilter, chronicleSearchTerm])

  useEffect(() => {
    if (initialQueue !== undefined) return
    void loadQueue()
  }, [initialQueue, loadQueue])

  useEffect(() => {
    if (initialChronicleQueue !== undefined) return
    void loadChronicleQueue()
  }, [initialChronicleQueue, loadChronicleQueue])

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

  const handleStartChronicleReview = async (item: ChronicleModerationSubmission) => {
    setBusyId(item.id)
    setError('')
    try {
      await startManuscriptReview(item.id)
      setNotice(`Started editorial screening for "${item.title}".`)
      await loadChronicleQueue()
      if (selectedManuscript?.id === item.id) {
        setSelectedManuscript({ ...item, status: 'under_review' })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start review.')
    } finally {
      setBusyId(null)
    }
  }

  const handleExecuteChronicleAction = async () => {
    if (!selectedManuscript || !manuscriptActionDialog) return
    setBusyId(selectedManuscript.id)
    setError('')
    setNotice('')
    try {
      if (manuscriptActionDialog === 'approve') {
        await approveManuscript(selectedManuscript.id, manuscriptActionNotes.trim() || undefined)
        setNotice(`Manuscript "${selectedManuscript.title}" approved for publication.`)
      } else if (manuscriptActionDialog === 'reject') {
        if (!manuscriptActionMessage.trim()) {
          setError('A rejection reason is required for the author.')
          setBusyId(null)
          return
        }
        await rejectManuscript(
          selectedManuscript.id,
          manuscriptActionMessage.trim(),
          manuscriptActionNotes.trim() || undefined
        )
        setNotice(`Manuscript "${selectedManuscript.title}" rejected.`)
      } else if (manuscriptActionDialog === 'corrections') {
        if (!manuscriptActionMessage.trim() || manuscriptActionMessage.trim().length < 10) {
          setError('A revision message of at least 10 characters is required for the author.')
          setBusyId(null)
          return
        }
        await requestManuscriptCorrections(
          selectedManuscript.id,
          manuscriptActionMessage.trim(),
          manuscriptActionNotes.trim() || undefined
        )
        setNotice(`Revisions requested for "${selectedManuscript.title}".`)
      } else if (manuscriptActionDialog === 'publish') {
        const res = await publishManuscriptToArchive(
          selectedManuscript.id,
          manuscriptTargetSlug.trim() || undefined,
          manuscriptTargetPaperId.trim() || undefined
        )
        setNotice(`Published manuscript to KhelChronicle archive with ID "${res.paperId}" and slug "${res.slug}"!`)
      }
      setManuscriptActionDialog(null)
      setSelectedManuscript(null)
      await loadChronicleQueue()
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

  // Filter Chronicle Manuscripts
  const chronicleItems = chronicleQueue?.submissions || []
  const filteredChronicleItems = chronicleItems.filter(item => {
    if (chronicleActiveTab !== 'all' && item.status !== chronicleActiveTab) return false
    if (chronicleCategoryFilter !== 'all' && item.category !== chronicleCategoryFilter) return false
    if (chronicleSearchTerm.trim()) {
      const term = chronicleSearchTerm.toLowerCase()
      const matchTitle = item.title.toLowerCase().includes(term)
      const matchAuthor = item.authorName.toLowerCase().includes(term)
      const matchAffil = (item.affiliation || '').toLowerCase().includes(term)
      const matchId = item.submissionId.toLowerCase().includes(term)
      if (!matchTitle && !matchAuthor && !matchAffil && !matchId) return false
    }
    return true
  })
  const chroniclePageSize = 10
  const totalChroniclePages = Math.max(1, Math.ceil(filteredChronicleItems.length / chroniclePageSize))
  const paginatedChronicleItems = filteredChronicleItems.slice(
    (chroniclePage - 1) * chroniclePageSize,
    chroniclePage * chroniclePageSize
  )

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
              <a className="admin-btn admin-btn-secondary" href="/admin/control">
                Evidence &amp; Admin Control
              </a>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void handleSignOut()}>
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Desk Switcher */}
        <div className="admin-desk-switcher" role="tablist" aria-label="Moderation desk mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeDesk === 'listings'}
            className={`admin-desk-btn ${activeDesk === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveDesk('listings')}
          >
            <SiteIcon name="file-text" size={16} />
            <span>Directory Listings Queue</span>
            <span className="admin-desk-badge">{queue?.stats.pendingSubmissionsCount ?? 0}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeDesk === 'chronicle'}
            className={`admin-desk-btn ${activeDesk === 'chronicle' ? 'active' : ''}`}
            onClick={() => { setActiveDesk('chronicle'); void loadChronicleQueue() }}
          >
            <SiteIcon name="award" size={16} />
            <span>KhelChronicle Manuscripts</span>
            <span className="admin-desk-badge chronicle">{chronicleQueue?.stats.pendingCount ?? 0}</span>
          </button>
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
          {/* ============================================================= */}
          {/* Directory Listings Desk                                        */}
          {/* ============================================================= */}
          {activeDesk === 'listings' && (
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

                    {(sub.status === 'pending_review' || sub.status === 'resubmitted' || sub.status === 'unpublished') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === sub.id}
                        onClick={() => void handleStartReview(sub)}
                      >
                        Start Review
                      </button>
                    )}

                    {sub.status === 'under_review' && (
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
                        Approval is an editorial decision only. Evidence verification is a separate step in the protected control panel, and publication is a third explicit action.
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
      )}

      {/* ============================================================= */}
      {/* KhelChronicle Manuscripts Desk                                 */}
      {/* ============================================================= */}
      {activeDesk === 'chronicle' && (
        <>
          {/* Chronicle Summary KPI Cards */}
          <div className="admin-metrics-grid">
            <div className="admin-metric-card highlight">
              <span className="admin-metric-val">{chronicleQueue?.stats.pendingCount ?? 0}</span>
              <span className="admin-metric-lbl">Pending Screening</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-val">{chronicleQueue?.stats.underReviewCount ?? 0}</span>
              <span className="admin-metric-lbl">Under Review</span>
            </div>
            <div className="admin-metric-card urgent">
              <span className="admin-metric-val">{chronicleQueue?.stats.changesRequestedCount ?? 0}</span>
              <span className="admin-metric-lbl">Revisions Requested</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-val">{chronicleQueue?.stats.approvedCount ?? 0}</span>
              <span className="admin-metric-lbl">Approved (Preprints)</span>
            </div>
            <div className="admin-metric-card success">
              <span className="admin-metric-val">{chronicleQueue?.stats.publishedCount ?? 0}</span>
              <span className="admin-metric-lbl">Published Archive</span>
            </div>
          </div>

          {/* Chronicle Status Tabs Navigation */}
          <nav className="admin-tabs-nav" aria-label="Manuscript status filter">
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'pending_review' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('pending_review'); setChroniclePage(1) }}
            >
              Pending Screening <span className="admin-tab-badge">{chronicleQueue?.stats.pendingCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'under_review' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('under_review'); setChroniclePage(1) }}
            >
              Under Review <span className="admin-tab-badge">{chronicleQueue?.stats.underReviewCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'changes_requested' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('changes_requested'); setChroniclePage(1) }}
            >
              Revisions Requested <span className="admin-tab-badge">{chronicleQueue?.stats.changesRequestedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'approved' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('approved'); setChroniclePage(1) }}
            >
              Approved <span className="admin-tab-badge">{chronicleQueue?.stats.approvedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'published' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('published'); setChroniclePage(1) }}
            >
              Published <span className="admin-tab-badge">{chronicleQueue?.stats.publishedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'rejected' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('rejected'); setChroniclePage(1) }}
            >
              Rejected
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'all' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('all'); setChroniclePage(1) }}
            >
              All Manuscripts <span className="admin-tab-badge">{chronicleQueue?.submissions.length ?? 0}</span>
            </button>
          </nav>

          {/* Chronicle Search & Filters Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-search-box">
              <SiteIcon name="search" size={16} />
              <input
                type="search"
                className="admin-search-input"
                placeholder="Search manuscripts by title, author, affiliation, or ID (KG-SUB-…)"
                value={chronicleSearchTerm}
                onChange={e => { setChronicleSearchTerm(e.target.value); setChroniclePage(1) }}
              />
            </div>
            <div className="admin-filter-group">
              <label>
                Discipline:
                <select
                  className="admin-select"
                  value={chronicleCategoryFilter}
                  onChange={e => { setChronicleCategoryFilter(e.target.value); setChroniclePage(1) }}
                >
                  <option value="all">All Disciplines</option>
                  {RESEARCH_CATEGORIES.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </label>

              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadChronicleQueue()}>
                Refresh Manuscripts
              </button>
            </div>
          </div>

          {/* Manuscripts List */}
          {paginatedChronicleItems.length === 0 ? (
            <div className="state-panel">
              <p>No manuscripts match the selected status or discipline filter.</p>
            </div>
          ) : (
            <div className="admin-items-list">
              {paginatedChronicleItems.map(sub => (
                <article key={sub.id} className="admin-mod-card chronicle">
                  <div className="admin-mod-card-top">
                    <div className="admin-mod-card-title-group">
                      <span className="admin-ref-code">{sub.submissionId}</span>
                      <span className="admin-type-pill chronicle-discipline">{sub.categoryName || sub.category}</span>
                      <h3 className="admin-item-title">{sub.title}</h3>
                    </div>
                    <span className={`admin-status-badge ${sub.status}`}>
                      {sub.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="admin-mod-card-meta">
                    <span>
                      <SiteIcon name="user" size={14} /> {sub.authorName}
                    </span>
                    <span>
                      <SiteIcon name="map-pin" size={14} /> {sub.affiliation}
                    </span>
                    <span>
                      <SiteIcon name="calendar-check" size={14} /> Submitted {new Date(sub.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    {sub.orcid && (
                      <span className="admin-ethics-badge orcid">
                        ORCID: {sub.orcid}
                      </span>
                    )}
                  </div>

                  {/* Ethics & Compliance Verification Badges */}
                  <div className="admin-ethics-row">
                    {sub.humanEthicsConfirmed && (
                      <span className="admin-ethics-badge ok">
                        <SiteIcon name="shield-check" size={12} /> IRB Human Ethics Certified
                      </span>
                    )}
                    {sub.minorConsentConfirmed && (
                      <span className="admin-ethics-badge ok">
                        <SiteIcon name="check-circle" size={12} /> Minor Consent Verified
                      </span>
                    )}
                    <span className="admin-ethics-badge license">
                      <SiteIcon name="award" size={12} /> Diamond Open Access (No APC)
                    </span>
                  </div>

                  <p className="admin-mod-card-desc">{sub.abstract}</p>

                  {sub.correctionRequest && (
                    <div className="state-panel state-unavailable" style={{ margin: '0.25rem 0' }}>
                      <strong>Active Author Revision Request:</strong> {sub.correctionRequest}
                    </div>
                  )}

                  {sub.rejectionReason && (
                    <div className="state-panel state-unavailable" style={{ margin: '0.25rem 0' }}>
                      <strong>Rejection Reason:</strong> {sub.rejectionReason}
                    </div>
                  )}

                  <div className="admin-mod-card-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        setSelectedManuscript(sub)
                        setManuscriptActionDialog(null)
                        setManuscriptActionMessage('')
                        setManuscriptActionNotes('')
                        setManuscriptTargetSlug('')
                        setManuscriptTargetPaperId('')
                      }}
                    >
                      <SiteIcon name="search" size={14} /> Inspect Manuscript
                    </button>

                    {(sub.status === 'pending_review' || sub.status === 'under_review') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === sub.id}
                        onClick={() => void handleStartChronicleReview(sub)}
                      >
                        {sub.status === 'under_review' ? 'Screening in Progress' : 'Start Screening'}
                      </button>
                    )}

                    {sub.status !== 'approved' && sub.status !== 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('approve')
                          setManuscriptActionNotes('')
                        }}
                      >
                        <SiteIcon name="badge-check" size={14} /> Approve Manuscript
                      </button>
                    )}

                    {sub.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-publish"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('publish')
                          setManuscriptTargetSlug('')
                          setManuscriptTargetPaperId('')
                        }}
                      >
                        <SiteIcon name="arrow-up-right" size={14} /> Publish to Archive
                      </button>
                    )}

                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('corrections')
                          setManuscriptActionMessage('')
                        }}
                      >
                        Request Revisions
                      </button>
                    )}

                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('reject')
                          setManuscriptActionMessage('')
                        }}
                      >
                        <SiteIcon name="close" size={14} /> Reject
                      </button>
                    )}

                    {sub.status === 'published' && (
                      <a
                        href={`/khelchronicle/${sub.publishedSlug || sub.category}`}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-btn admin-btn-secondary"
                      >
                        View Live Preprint ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination for Manuscripts */}
          {totalChroniclePages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {Math.min((chroniclePage - 1) * chroniclePageSize + 1, filteredChronicleItems.length)} -{' '}
                {Math.min(chroniclePage * chroniclePageSize, filteredChronicleItems.length)} of {filteredChronicleItems.length}
              </span>
              <div className="admin-mod-card-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={chroniclePage <= 1}
                  onClick={() => setChroniclePage(p => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {chroniclePage} of {totalChroniclePages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={chroniclePage >= totalChroniclePages}
                  onClick={() => setChroniclePage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Manuscript Detail & Action Modal */}
          {selectedManuscript && (
            <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-ms-title">
              <div className="admin-modal-card">
                <div className="admin-modal-header">
                  <div>
                    <span className="admin-ref-code">{selectedManuscript.submissionId}</span>
                    <h2 id="modal-ms-title" style={{ margin: '0.35rem 0' }}>{selectedManuscript.title}</h2>
                    <span className={`admin-status-badge ${selectedManuscript.status}`}>
                      Status: {selectedManuscript.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => { setSelectedManuscript(null); setManuscriptActionDialog(null) }}
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="admin-modal-body">
                  <div className="admin-detail-grid">
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Primary Author</span>
                      <span className="admin-detail-val">{selectedManuscript.authorName}</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedManuscript.authorEmail}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Institution / Affiliation</span>
                      <span className="admin-detail-val">{selectedManuscript.affiliation}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">Discipline</span>
                      <span className="admin-detail-val">{selectedManuscript.categoryName || selectedManuscript.category}</span>
                    </div>
                    <div className="admin-detail-item">
                      <span className="admin-detail-label">ORCID</span>
                      <span className="admin-detail-val">{selectedManuscript.orcid || 'Not provided'}</span>
                    </div>
                    {selectedManuscript.coAuthors && (
                      <div className="admin-detail-item" style={{ gridColumn: '1 / -1' }}>
                        <span className="admin-detail-label">Co-Authors</span>
                        <span className="admin-detail-val">{selectedManuscript.coAuthors}</span>
                      </div>
                    )}
                    {selectedManuscript.fullTextOrUrl && (
                      <div className="admin-detail-item" style={{ gridColumn: '1 / -1' }}>
                        <span className="admin-detail-label">Manuscript Link / Deposit</span>
                        <a href={selectedManuscript.fullTextOrUrl} target="_blank" rel="noreferrer" className="admin-detail-val" style={{ color: '#0284c7' }}>
                          {selectedManuscript.fullTextOrUrl} ↗
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Abstract */}
                  <div>
                    <span className="admin-detail-label">Structured Abstract</span>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.35rem', lineHeight: 1.6 }}>
                      {selectedManuscript.abstract}
                    </div>
                  </div>

                  {/* Ethics Clearances */}
                  <div>
                    <span className="admin-detail-label">Ethics & Legal Compliance</span>
                    <div className="admin-ethics-row" style={{ marginTop: '0.5rem' }}>
                      <span className={`admin-ethics-badge ${selectedManuscript.humanEthicsConfirmed ? 'ok' : ''}`}>
                        <SiteIcon name={selectedManuscript.humanEthicsConfirmed ? 'check-circle' : 'alert-circle'} size={13} />
                        Human Subjects IRB Ethics: {selectedManuscript.humanEthicsConfirmed ? 'Confirmed' : 'Unconfirmed'}
                      </span>
                      <span className={`admin-ethics-badge ${selectedManuscript.minorConsentConfirmed ? 'ok' : ''}`}>
                        <SiteIcon name={selectedManuscript.minorConsentConfirmed ? 'check-circle' : 'alert-circle'} size={13} />
                        Minor Athletes Assent / Guardian Consent: {selectedManuscript.minorConsentConfirmed ? 'Confirmed' : 'Unconfirmed'}
                      </span>
                      <span className="admin-ethics-badge license">
                        License: {selectedManuscript.licenseType || 'CC BY-NC-ND 4.0'}
                      </span>
                    </div>
                  </div>

                  {/* Action Dialog: Request Revisions */}
                  {manuscriptActionDialog === 'corrections' && (
                    <div className="admin-dialog-box">
                      <h3>Request Manuscript Revisions</h3>
                      <p>Send constructive peer-screening feedback to {selectedManuscript.authorName} ({selectedManuscript.authorEmail}).</p>
                      <label>
                        Editorial Revision Feedback * (minimum 10 characters):
                        <textarea
                          rows={4}
                          value={manuscriptActionMessage}
                          onChange={e => setManuscriptActionMessage(e.target.value)}
                          placeholder="e.g. Please clarify your calibration protocol, provide the institutional ethics approval number, and check the sample standard deviations in Table 2."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-warning"
                          disabled={busyId === selectedManuscript.id || manuscriptActionMessage.trim().length < 10}
                          onClick={() => void handleExecuteChronicleAction()}
                        >
                          Send Revision Request
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setManuscriptActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Dialog: Approve */}
                  {manuscriptActionDialog === 'approve' && (
                    <div className="admin-dialog-box">
                      <h3>Approve Manuscript for KhelChronicle Archive</h3>
                      <p>This certifies that the manuscript meets ethical and scientific criteria for preprint publication.</p>
                      <label>
                        Internal Editorial Notes (optional):
                        <textarea
                          rows={2}
                          value={manuscriptActionNotes}
                          onChange={e => setManuscriptActionNotes(e.target.value)}
                          placeholder="e.g. Rigorous methodology. Approved by editorial board."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-approve"
                          disabled={busyId === selectedManuscript.id}
                          onClick={() => void handleExecuteChronicleAction()}
                        >
                          Confirm Manuscript Approval
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setManuscriptActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Dialog: Publish */}
                  {manuscriptActionDialog === 'publish' && (
                    <div className="admin-dialog-box">
                      <h3>Publish to KhelChronicle Live Archive</h3>
                      <p>This will assign an official paper ID and make the preprint accessible to coaches and researchers.</p>
                      <label>
                        Target Paper ID (optional, default auto-assigned):
                        <input
                          type="text"
                          value={manuscriptTargetPaperId}
                          onChange={e => setManuscriptTargetPaperId(e.target.value)}
                          placeholder="e.g. KG-2026-006"
                        />
                      </label>
                      <label>
                        Custom URL slug (optional):
                        <input
                          type="text"
                          value={manuscriptTargetSlug}
                          onChange={e => setManuscriptTargetSlug(e.target.value)}
                          placeholder="e.g. high-altitude-hypoxic-training-adaptation"
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-publish"
                          disabled={busyId === selectedManuscript.id}
                          onClick={() => void handleExecuteChronicleAction()}
                        >
                          Confirm Live Publication
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setManuscriptActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Dialog: Reject */}
                  {manuscriptActionDialog === 'reject' && (
                    <div className="admin-dialog-box">
                      <h3>Reject Manuscript</h3>
                      <p>Provide a clear scientific reason for rejecting this manuscript.</p>
                      <label>
                        Rejection Reason * (sent to author):
                        <textarea
                          rows={3}
                          value={manuscriptActionMessage}
                          onChange={e => setManuscriptActionMessage(e.target.value)}
                          placeholder="e.g. Inadequate ethics clearance or methodology outside sports science scope."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          disabled={busyId === selectedManuscript.id || !manuscriptActionMessage.trim()}
                          onClick={() => void handleExecuteChronicleAction()}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setManuscriptActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom action controls */}
                  <div className="admin-mod-card-actions" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    {(selectedManuscript.status === 'pending_review' || selectedManuscript.status === 'under_review') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === selectedManuscript.id}
                        onClick={() => void handleStartChronicleReview(selectedManuscript)}
                      >
                        {selectedManuscript.status === 'under_review' ? 'Screening in Progress' : 'Start Screening'}
                      </button>
                    )}
                    {selectedManuscript.status !== 'approved' && selectedManuscript.status !== 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => setManuscriptActionDialog('approve')}
                      >
                        Approve Manuscript
                      </button>
                    )}
                    {selectedManuscript.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-publish"
                        onClick={() => setManuscriptActionDialog('publish')}
                      >
                        Publish to Archive
                      </button>
                    )}
                    {selectedManuscript.status !== 'published' && selectedManuscript.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        onClick={() => setManuscriptActionDialog('corrections')}
                      >
                        Request Revisions
                      </button>
                    )}
                    {selectedManuscript.status !== 'published' && selectedManuscript.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => setManuscriptActionDialog('reject')}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
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
