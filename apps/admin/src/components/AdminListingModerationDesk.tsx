import { useState, useMemo, useCallback, useEffect } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  getAdminModerationListings,
  getAdminModerationListingDetails,
  startReviewListing,
  approveAndPublishListing,
  requestListingRevision,
  rejectListing,
  unpublishListing,
  republishListing,
  addModerationNote,
  exportListingsToCsv,
  MODERATION_REJECTION_PRESETS,
  MODERATION_CORRECTION_PRESETS,
  MODERATION_APPROVAL_PRESETS,
  type AdminModerationListing,
} from '../services/adminModerationService'
import './AdminListingModerationDesk.css'

export interface AdminListingModerationDeskProps {
  operatorEmail?: string
}

export function AdminListingModerationDesk({
  operatorEmail = 'moderator@khelgrid.com',
}: AdminListingModerationDeskProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')

  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1)
  const [drawerTab, setDrawerTab] = useState<'preview' | 'details' | 'diff' | 'audit'>('preview')
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Governance Action Modals
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'corrections' | 'reject' | 'unpublish' | 'republish' | 'add_note'
    item: AdminModerationListing
  } | null>(null)

  const [approveNotes, setApproveNotes] = useState('')
  const [approveVerifiedBadge, setApproveVerifiedBadge] = useState(true)
  const [approvePriorityRank, setApprovePriorityRank] = useState(4)
  const [correctionNotes, setCorrectionNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [unpublishReason, setUnpublishReason] = useState('')
  const [auditNote, setAuditNote] = useState('')

  const triggerRefresh = useCallback(() => {
    setRefreshTick(prev => prev + 1)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }, [])

  // All listings
  const allListings = useMemo(() => {
    void refreshTick
    return getAdminModerationListings()
  }, [refreshTick])

  // Extract distinct sports & cities for dropdowns
  const availableSports = useMemo(() => {
    const set = new Set<string>()
    allListings.forEach(l => {
      if (l.sport) set.add(l.sport.split(' ')[0])
    })
    return Array.from(set).sort()
  }, [allListings])

  const availableCities = useMemo(() => {
    const set = new Set<string>()
    allListings.forEach(l => {
      if (l.city) set.add(l.city)
    })
    return Array.from(set).sort()
  }, [allListings])

  // Telemetry KPIs
  const telemetry = useMemo(() => {
    const total = allListings.length
    const pendingCount = allListings.filter(l => l.status === 'pending_review').length
    const underReviewCount = allListings.filter(l => l.status === 'under_review').length
    const changesRequestedCount = allListings.filter(l => l.status === 'changes_requested').length
    const publishedCount = allListings.filter(l => l.status === 'published').length
    const rejectedCount = allListings.filter(l => l.status === 'rejected').length
    const unpublishedCount = allListings.filter(l => l.status === 'unpublished').length

    const publishedRate = total > 0 ? ((publishedCount / total) * 100).toFixed(1) : '0.0'

    return {
      total,
      pendingCount,
      underReviewCount,
      changesRequestedCount,
      publishedCount,
      rejectedCount,
      unpublishedCount,
      publishedRate,
    }
  }, [allListings])

  // Multi-facet filtering logic
  const filteredListings = useMemo(() => {
    return allListings.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesRef = item.referenceCode.toLowerCase().includes(q)
        const matchesTitle = item.title.toLowerCase().includes(q)
        const matchesOrg = item.organizationName ? item.organizationName.toLowerCase().includes(q) : false
        const matchesSport = item.sport.toLowerCase().includes(q)
        const matchesCity = item.city.toLowerCase().includes(q)
        const matchesSubmitter = item.submitterName.toLowerCase().includes(q) || item.submitterEmail.toLowerCase().includes(q)
        if (!matchesRef && !matchesTitle && !matchesOrg && !matchesSport && !matchesCity && !matchesSubmitter) {
          return false
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && item.listingType !== categoryFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      // Sport filter
      if (sportFilter !== 'all' && !item.sport.toLowerCase().includes(sportFilter.toLowerCase())) {
        return false
      }

      // City filter
      if (cityFilter !== 'all' && item.city !== cityFilter) {
        return false
      }

      return true
    })
  }, [allListings, searchQuery, categoryFilter, statusFilter, sportFilter, cityFilter])

  // Selected item for slide-over drawer
  const selectedItem = useMemo(() => {
    void refreshTick
    if (!selectedId) return null
    return getAdminModerationListingDetails(selectedId)
  }, [selectedId, refreshTick])

  // Keyboard triage navigation: J/K step through queue, Enter opens drawer, Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || actionModal) return

      if (e.key === 'Escape' && selectedId) {
        e.preventDefault()
        setSelectedId(null)
        return
      }
      if (filteredListings.length === 0) return

      if (e.key.toLowerCase() === 'j') {
        e.preventDefault()
        setFocusedRowIndex(prev => Math.min(filteredListings.length - 1, prev + 1))
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setFocusedRowIndex(prev => Math.max(0, prev <= 0 ? 0 : prev - 1))
      } else if (e.key === 'Enter' && focusedRowIndex >= 0 && focusedRowIndex < filteredListings.length && !selectedId) {
        e.preventDefault()
        setSelectedId(filteredListings[focusedRowIndex].id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredListings, focusedRowIndex, selectedId, actionModal])

  // Batch toggle handlers
  const handleToggleSelectAll = () => {
    if (batchSelectedIds.length === filteredListings.length) {
      setBatchSelectedIds([])
    } else {
      setBatchSelectedIds(filteredListings.map(l => l.id))
    }
  }

  const handleToggleSelectItem = (id: string) => {
    setBatchSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleExportCsv = () => {
    const csv = exportListingsToCsv(filteredListings)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `khelgrid_listings_moderation_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${filteredListings.length} listings to CSV.`)
  }

  // Quick Action Handlers
  const handleStartReview = (item: AdminModerationListing) => {
    try {
      startReviewListing(item.id, operatorEmail)
      showToast(`Review started for ${item.referenceCode}. Ticket locked.`)
      triggerRefresh()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to start review.')
    }
  }

  const handleConfirmAction = () => {
    if (!actionModal) return

    try {
      const { type, item } = actionModal

      if (type === 'approve') {
        approveAndPublishListing(item.id, operatorEmail, {
          notes: approveNotes.trim() || undefined,
          isVerifiedTrustBadge: approveVerifiedBadge,
          priorityRank: approvePriorityRank,
        })
        showToast(`Listing ${item.referenceCode} approved & published to KhelGrid catalogue.`)
      } else if (type === 'corrections') {
        if (!correctionNotes.trim()) return
        requestListingRevision(item.id, operatorEmail, correctionNotes.trim())
        showToast(`Revision request dispatched to ${item.submitterEmail}.`)
      } else if (type === 'reject') {
        if (!rejectionReason.trim()) return
        rejectListing(item.id, operatorEmail, rejectionReason.trim())
        showToast(`Submission ${item.referenceCode} rejected.`)
      } else if (type === 'unpublish') {
        if (!unpublishReason.trim()) return
        unpublishListing(item.id, operatorEmail, unpublishReason.trim())
        showToast(`Listing ${item.referenceCode} unpublished from catalogue.`)
      } else if (type === 'republish') {
        republishListing(item.id, operatorEmail)
        showToast(`Listing ${item.referenceCode} republished.`)
      } else if (type === 'add_note') {
        if (!auditNote.trim()) return
        addModerationNote(item.id, operatorEmail, auditNote.trim())
        showToast('Administrative observation logged.')
      }

      setActionModal(null)
      setApproveNotes('')
      setCorrectionNotes('')
      setRejectionReason('')
      setUnpublishReason('')
      setAuditNote('')
      triggerRefresh()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Action failed.')
    }
  }

  // Batch actions
  const handleBatchApprove = () => {
    let count = 0
    batchSelectedIds.forEach(id => {
      try {
        approveAndPublishListing(id, operatorEmail)
        count++
      } catch {
        // continue
      }
    })
    setBatchSelectedIds([])
    showToast(`Bulk approved and published ${count} listings.`)
    triggerRefresh()
  }

  return (
    <div className="admin-mod-desk-root">
      {/* 1. Header Area */}
      <header className="admin-mod-header">
        <div>
          <div className="admin-mod-eyebrow">
            <SiteIcon name="check-circle" size={14} />
            <span>Cross-Workspace Catalogue Moderation</span>
          </div>
          <h1 className="admin-mod-title">Content & Listing Moderation Queue</h1>
          <p className="admin-mod-subtitle">
            Unified review desk for sports Venues, Academies, Coaches, Trials, Camps,
            Scholarships, and Pickup Games with approve, revise, and suspend controls.
          </p>
        </div>

        <div className="admin-mod-header-actions">
          <button
            type="button"
            className="admin-mod-btn admin-mod-btn-secondary"
            onClick={triggerRefresh}
            title="Reload moderation queue"
          >
            <SiteIcon name="refresh" size={14} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="admin-mod-btn admin-mod-btn-primary"
            onClick={handleExportCsv}
          >
            <SiteIcon name="download" size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* 2. Micro-KPI Telemetry Ribbon */}
      <section className="admin-mod-metrics-grid" aria-label="Moderation Telemetry">
        <div className="admin-mod-metric-card">
          <div className="admin-mod-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <SiteIcon name="file-text" size={18} />
          </div>
          <div className="admin-mod-metric-content">
            <span className="admin-mod-metric-value">{telemetry.total}</span>
            <span className="admin-mod-metric-label">Total Submissions</span>
          </div>
        </div>

        <div className="admin-mod-metric-card">
          <div className="admin-mod-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <SiteIcon name="clock" size={18} />
          </div>
          <div className="admin-mod-metric-content">
            <span className="admin-mod-metric-value">{telemetry.pendingCount}</span>
            <span className="admin-mod-metric-label">Pending Triage</span>
          </div>
        </div>

        <div className="admin-mod-metric-card">
          <div className="admin-mod-metric-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <SiteIcon name="eye" size={18} />
          </div>
          <div className="admin-mod-metric-content">
            <span className="admin-mod-metric-value">{telemetry.underReviewCount}</span>
            <span className="admin-mod-metric-label">Under Review</span>
          </div>
        </div>

        <div className="admin-mod-metric-card">
          <div className="admin-mod-metric-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
            <SiteIcon name="alert-triangle" size={18} />
          </div>
          <div className="admin-mod-metric-content">
            <span className="admin-mod-metric-value">{telemetry.changesRequestedCount}</span>
            <span className="admin-mod-metric-label">Revisions Needed</span>
          </div>
        </div>

        <div className="admin-mod-metric-card">
          <div className="admin-mod-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <SiteIcon name="badge-check" size={18} />
          </div>
          <div className="admin-mod-metric-content">
            <span className="admin-mod-metric-value">{telemetry.publishedCount}</span>
            <span className="admin-mod-metric-label">Published Live ({telemetry.publishedRate}%)</span>
          </div>
        </div>

        <div className="admin-mod-metric-card">
          <div className="admin-mod-metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <SiteIcon name="close" size={18} />
          </div>
          <div className="admin-mod-metric-content">
            <span className="admin-mod-metric-value">{telemetry.rejectedCount}</span>
            <span className="admin-mod-metric-label">Rejected / Spam</span>
          </div>
        </div>
      </section>

      {/* 3. Controls & Filter Pills */}
      <section className="admin-mod-controls-card">
        {/* Workspace Category Pills */}
        <div className="admin-mod-pill-filter-row">
          <span className="admin-mod-filter-group-label">Workspace:</span>
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'venue', label: 'Venues & Turfs' },
            { id: 'academy', label: 'Academies' },
            { id: 'coach', label: 'Coaches' },
            { id: 'trial', label: 'Trials & Selections' },
            { id: 'camp', label: 'Camps & Clinics' },
            { id: 'scholarship', label: 'Scholarships' },
            { id: 'pickup_game', label: 'Pickup Games' },
          ].map(cat => {
            const count = cat.id === 'all'
              ? allListings.length
              : allListings.filter(l => l.listingType === cat.id).length
            return (
              <button
                key={cat.id}
                type="button"
                className={`admin-mod-pill-btn ${categoryFilter === cat.id ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                <span>{cat.label}</span>
                <span className="admin-mod-pill-badge">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Status Lifecycle Pills */}
        <div className="admin-mod-pill-filter-row">
          <span className="admin-mod-filter-group-label">Status:</span>
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'pending_review', label: 'Pending Review' },
            { id: 'under_review', label: 'Under Review' },
            { id: 'changes_requested', label: 'Revisions Requested' },
            { id: 'published', label: 'Published / Live' },
            { id: 'unpublished', label: 'Unpublished' },
            { id: 'rejected', label: 'Rejected' },
          ].map(st => {
            const count = st.id === 'all'
              ? allListings.length
              : allListings.filter(l => l.status === st.id).length
            return (
              <button
                key={st.id}
                type="button"
                className={`admin-mod-pill-btn ${statusFilter === st.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(st.id)}
              >
                <span>{st.label}</span>
                <span className="admin-mod-pill-badge">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Secondary Inputs: Search, Sport, City, Reset */}
        <div className="admin-mod-inputs-row">
          <div className="admin-mod-search-wrap">
            <div className="admin-mod-search-icon">
              <SiteIcon name="search" size={15} />
            </div>
            <input
              type="search"
              className="admin-mod-search-input"
              placeholder="Search reference code, listing title, organization, coach, locality..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="admin-mod-select"
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
            aria-label="Filter by sport"
          >
            <option value="all">All Sports</option>
            {availableSports.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="admin-mod-select"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            aria-label="Filter by city"
          >
            <option value="all">All Hubs / Cities</option>
            {availableCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || sportFilter !== 'all' || cityFilter !== 'all') && (
            <button
              type="button"
              className="admin-mod-btn admin-mod-btn-secondary"
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setStatusFilter('all')
                setSportFilter('all')
                setCityFilter('all')
              }}
            >
              <SiteIcon name="close" size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* Batch Selection Action Bar */}
      {batchSelectedIds.length > 0 && (
        <div className="admin-mod-batch-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <SiteIcon name="check-circle" size={16} />
            <span>{batchSelectedIds.length} item{batchSelectedIds.length > 1 ? 's' : ''} selected</span>
          </div>

          <div className="admin-mod-batch-actions">
            <button
              type="button"
              className="admin-mod-btn admin-mod-btn-primary"
              onClick={handleBatchApprove}
            >
              <SiteIcon name="check" size={13} />
              <span>Approve & Publish Selected</span>
            </button>

            <button
              type="button"
              className="admin-mod-btn admin-mod-btn-secondary"
              onClick={() => setBatchSelectedIds([])}
            >
              <span>Deselect All</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Unified Listings Directory Table */}
      <section className="admin-mod-table-card">
        <div className="admin-mod-kbd-bar">
          <span className="tabular-nums">
            Showing {filteredListings.length} of {allListings.length} submissions
          </span>
          <div className="admin-mod-kbd-hints">
            <span><kbd>J</kbd> / <kbd>K</kbd> move</span>
            <span><kbd>Enter</kbd> inspect</span>
            <span><kbd>Esc</kbd> close drawer</span>
          </div>
        </div>
        <div className="admin-mod-table-wrapper">
          <table className="admin-mod-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={batchSelectedIds.length === filteredListings.length && filteredListings.length > 0}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all listings in view"
                  />
                </th>
                <th>Reference & Title</th>
                <th>Workspace Category</th>
                <th>Organization / Submitter</th>
                <th>Sport & Location</th>
                <th>Status</th>
                <th>Priority</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    No listing submissions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredListings.map((item, rowIndex) => {
                  const isSelected = batchSelectedIds.includes(item.id)
                  const isFocused = rowIndex === focusedRowIndex

                  return (
                    <tr
                      key={item.id}
                      className={`admin-mod-row ${isFocused ? 'is-keyboard-focused' : ''}`}
                      onClick={() => setFocusedRowIndex(rowIndex)}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectItem(item.id)}
                          aria-label={`Select ${item.title}`}
                        />
                      </td>

                      {/* Reference & Title */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '320px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '0.1rem 0.35rem', borderRight: '4px' }}>
                              {item.referenceCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.referenceCode)}
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                              title="Copy code"
                            >
                              <SiteIcon name={copiedCode === item.referenceCode ? 'check' : 'copy'} size={12} />
                            </button>
                            {item.isVerifiedTrustBadge && (
                              <span title="Verified Trust Seal" style={{ color: '#10b981', display: 'inline-flex' }}>
                                <SiteIcon name="badge-check" size={13} />
                              </span>
                            )}
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--adm-text, #f8fafc)', fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </span>
                        </div>
                      </td>

                      {/* Workspace Category */}
                      <td>
                        <span className={`admin-mod-cat-badge ${item.listingType}`}>
                          {item.listingType.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Organization / Submitter */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                            {item.organizationName ?? 'Direct Individual'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {item.submitterName}
                          </span>
                        </div>
                      </td>

                      {/* Sport & Location */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--adm-text-secondary, #e2e8f0)' }}>{item.sport}</span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {item.city}, {item.state}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`admin-mod-status-badge ${item.status}`}>
                          <SiteIcon
                            name={
                              item.status === 'published' ? 'check-circle' :
                              item.status === 'pending_review' ? 'clock' :
                              item.status === 'under_review' ? 'eye' :
                              item.status === 'changes_requested' ? 'alert-triangle' :
                              item.status === 'rejected' ? 'close' : 'shield-check'
                            }
                            size={12}
                          />
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Priority */}
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.priorityRank >= 4 ? '#38bdf8' : '#94a3b8' }}>
                          P{item.priorityRank}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-mod-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-mod-btn admin-mod-btn-secondary"
                            onClick={() => {
                              setSelectedId(item.id)
                              setDrawerTab('preview')
                            }}
                          >
                            <SiteIcon name="eye" size={13} />
                            <span>Inspect</span>
                          </button>

                          {item.status === 'pending_review' && (
                            <button
                              type="button"
                              className="admin-mod-btn admin-mod-btn-warning"
                              onClick={() => handleStartReview(item)}
                            >
                              <SiteIcon name="clock" size={13} />
                              <span>Start</span>
                            </button>
                          )}

                          {(item.status === 'pending_review' || item.status === 'under_review' || item.status === 'changes_requested') && (
                            <button
                              type="button"
                              className="admin-mod-btn admin-mod-btn-primary"
                              onClick={() => setActionModal({ type: 'approve', item })}
                            >
                              <SiteIcon name="check" size={13} />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================================
          5. Slide-Over Listing Inspection Drawer
          ===================================================================== */}
      {selectedItem && (
        <div
          className="admin-mod-drawer-backdrop"
          onClick={() => setSelectedId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="admin-mod-drawer"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="admin-mod-drawer-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`admin-mod-cat-badge ${selectedItem.listingType}`}>
                    {selectedItem.listingType.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#38bdf8' }}>
                    {selectedItem.referenceCode}
                  </span>
                  <span className={`admin-mod-status-badge ${selectedItem.status}`}>
                    {selectedItem.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h2 style={{ margin: '0.35rem 0 0 0', fontSize: '1.2rem', color: 'var(--adm-text, #ffffff)', fontWeight: 800 }}>
                  {selectedItem.title}
                </h2>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {selectedItem.organizationName ? `${selectedItem.organizationName} · ` : ''}
                  {selectedItem.city}, {selectedItem.state}
                </span>
              </div>

              <button
                type="button"
                className="admin-mod-drawer-close"
                onClick={() => setSelectedId(null)}
                aria-label="Close drawer"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <nav className="admin-mod-drawer-tabs" aria-label="Inspection drawer tabs">
              <button
                type="button"
                className={`admin-mod-tab-btn ${drawerTab === 'preview' ? 'active' : ''}`}
                onClick={() => setDrawerTab('preview')}
              >
                <SiteIcon name="eye" size={14} />
                <span>Card Preview & Overview</span>
              </button>

              <button
                type="button"
                className={`admin-mod-tab-btn ${drawerTab === 'details' ? 'active' : ''}`}
                onClick={() => setDrawerTab('details')}
              >
                <SiteIcon name="file-text" size={14} />
                <span>Workspace Attributes</span>
              </button>

              <button
                type="button"
                className={`admin-mod-tab-btn ${drawerTab === 'diff' ? 'active' : ''}`}
                onClick={() => setDrawerTab('diff')}
              >
                <SiteIcon name="refresh" size={14} />
                <span>Revisions (v{selectedItem.version})</span>
              </button>

              <button
                type="button"
                className={`admin-mod-tab-btn ${drawerTab === 'audit' ? 'active' : ''}`}
                onClick={() => setDrawerTab('audit')}
              >
                <SiteIcon name="activity" size={14} />
                <span>Audit Trail ({selectedItem.auditTrail.length})</span>
              </button>
            </nav>

            {/* Body */}
            <div className="admin-mod-drawer-body">
              {/* TAB 1: PREVIEW & OVERVIEW */}
              {drawerTab === 'preview' && (
                <>
                  <div className="admin-mod-card-preview">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="admin-mod-preview-badge">
                        <SiteIcon name="badge-check" size={12} />
                        KhelGrid Catalogue Listing
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Sport: <strong style={{ color: 'var(--adm-text, #ffffff)' }}>{selectedItem.sport}</strong>
                      </span>
                    </div>

                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--adm-text, #ffffff)', fontWeight: 700 }}>
                      {selectedItem.title}
                    </h3>

                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                      {selectedItem.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                      <SiteIcon name="map-pin" size={13} />
                      <span>{selectedItem.address}</span>
                    </div>

                    {selectedItem.sourceUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                        <SiteIcon name="external-link" size={13} />
                        <a
                          href={selectedItem.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#38bdf8', textDecoration: 'underline' }}
                        >
                          {selectedItem.sourceUrl}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="admin-mod-detail-box">
                    <h4 className="admin-mod-detail-title">
                      <SiteIcon name="user" size={14} />
                      <span>Submitter / Tenant Information</span>
                    </h4>
                    <div className="admin-mod-grid-2col">
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Submitter Name</span>
                        <span className="admin-mod-field-val">{selectedItem.submitterName}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Organization</span>
                        <span className="admin-mod-field-val">{selectedItem.organizationName ?? 'Direct Individual'}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Contact Email</span>
                        <span className="admin-mod-field-val">{selectedItem.submitterEmail}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Contact Phone</span>
                        <span className="admin-mod-field-val">{selectedItem.submitterPhone}</span>
                      </div>
                    </div>
                  </div>

                  {selectedItem.correctionRequest && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', display: 'block', marginBottom: '0.2rem' }}>
                        Active Revision Request Dispatched to Submitter:
                      </span>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#fef08a' }}>
                        {selectedItem.correctionRequest}
                      </p>
                    </div>
                  )}

                  {selectedItem.rejectionReason && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '0.2rem' }}>
                        Rejection Justification:
                      </span>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#fca5a5' }}>
                        {selectedItem.rejectionReason}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: WORKSPACE ATTRIBUTES */}
              {drawerTab === 'details' && (
                <div className="admin-mod-detail-box">
                  <h4 className="admin-mod-detail-title">
                    <SiteIcon name="sliders" size={14} />
                    <span>Cross-Workspace Custom Attributes</span>
                  </h4>

                  {/* Venue Attributes */}
                  {selectedItem.listingType === 'venue' && (
                    <div className="admin-mod-grid-2col">
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Surface Type</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.surfaceType ?? 'Not specified'}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Floodlights</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.floodlights ? 'Yes (Evening Matches)' : 'No'}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Hourly Rate</span>
                        <span className="admin-mod-field-val">
                          {selectedItem.workspaceData.hourlyRateInr ? `INR ${selectedItem.workspaceData.hourlyRateInr}/hr` : 'Free / Community'}
                        </span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Dimensions</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.groundDimensions ?? 'Standard'}</span>
                      </div>
                    </div>
                  )}

                  {/* Academy Attributes */}
                  {selectedItem.listingType === 'academy' && (
                    <div className="admin-mod-grid-2col">
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Age Groups</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.ageGroups ?? 'All ages'}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Coach:Student Ratio</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.coachStudentRatio ?? '1:15'}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Batch Timings</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.batchTimings ?? 'Morning & Evening'}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Monthly Training Fee</span>
                        <span className="admin-mod-field-val">
                          {selectedItem.workspaceData.monthlyFeeInr ? `INR ${selectedItem.workspaceData.monthlyFeeInr}/mo` : 'Free'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Trial Attributes */}
                  {selectedItem.listingType === 'trial' && (
                    <div className="admin-mod-grid-2col">
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Trial Dates</span>
                        <span className="admin-mod-field-val">
                          {selectedItem.workspaceData.trialStartDate} to {selectedItem.workspaceData.trialEndDate}
                        </span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Reporting Time</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.reportingTime ?? 'TBD'}</span>
                      </div>
                      <div className="admin-mod-field" style={{ gridColumn: 'span 2' }}>
                        <span className="admin-mod-field-label">Eligibility Cut-off</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.eligibilityCriteria}</span>
                      </div>
                      <div className="admin-mod-field" style={{ gridColumn: 'span 2' }}>
                        <span className="admin-mod-field-label">Selection Process</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.selectionProcess}</span>
                      </div>
                    </div>
                  )}

                  {/* Coach Attributes */}
                  {selectedItem.listingType === 'coach' && (
                    <div className="admin-mod-grid-2col">
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Coaching Experience</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.experienceYears} Years</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Hourly Fee</span>
                        <span className="admin-mod-field-val">INR {selectedItem.workspaceData.hourlyRateCoachingInr}/hr</span>
                      </div>
                      <div className="admin-mod-field" style={{ gridColumn: 'span 2' }}>
                        <span className="admin-mod-field-label">Specializations</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.coachingSpecialization}</span>
                      </div>
                    </div>
                  )}

                  {/* Pickup Game Attributes */}
                  {selectedItem.listingType === 'pickup_game' && (
                    <div className="admin-mod-grid-2col">
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Slot Timing</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.gameSlotTime}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Skill Level</span>
                        <span className="admin-mod-field-val">{selectedItem.workspaceData.skillLevel}</span>
                      </div>
                      <div className="admin-mod-field">
                        <span className="admin-mod-field-label">Players Count</span>
                        <span className="admin-mod-field-val">
                          {selectedItem.workspaceData.currentPlayersCount} / {selectedItem.workspaceData.maxPlayers} Spots Filled
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REVISIONS / DIFF */}
              {drawerTab === 'diff' && (
                <div className="admin-mod-detail-box">
                  <h4 className="admin-mod-detail-title">
                    <SiteIcon name="refresh" size={14} />
                    <span>Submission Version Diff & Changelog</span>
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {selectedItem.revisions.map(rev => (
                      <div
                        key={rev.version}
                        style={{
                          background: '#090e18',
                          border: '1px solid #1e293b',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                            Version {rev.version}
                          </span>
                          <span style={{ color: '#64748b' }}>
                            {new Date(rev.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--adm-text-secondary, #e2e8f0)' }}>
                          {rev.changesSummary}
                        </p>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          Author: {rev.submittedBy}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT TRAIL */}
              {drawerTab === 'audit' && (
                <div className="admin-mod-detail-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 className="admin-mod-detail-title">
                      <SiteIcon name="activity" size={14} />
                      <span>Moderation Audit Trail</span>
                    </h4>
                    <button
                      type="button"
                      className="admin-mod-btn admin-mod-btn-secondary"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                      onClick={() => setActionModal({ type: 'add_note', item: selectedItem })}
                    >
                      <SiteIcon name="plus" size={11} />
                      <span>Add Note</span>
                    </button>
                  </div>

                  <div className="admin-mod-audit-list">
                    {selectedItem.auditTrail.map(audit => (
                      <div key={audit.id} className="admin-mod-audit-item">
                        <div className="admin-mod-audit-bullet" />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>{audit.operatorEmail}</span>
                          <span>{new Date(audit.timestamp).toLocaleString()}</span>
                        </div>
                        <span style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600 }}>
                          {audit.summary}
                        </span>
                        {audit.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '4px', borderLeft: '2px solid #38bdf8' }}>
                            {audit.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Governance Controls */}
            <div className="admin-mod-drawer-footer">
              {selectedItem.status !== 'published' && (
                <button
                  type="button"
                  className="admin-mod-btn admin-mod-btn-primary"
                  onClick={() => setActionModal({ type: 'approve', item: selectedItem })}
                >
                  <SiteIcon name="check" size={14} />
                  <span>Approve & Publish</span>
                </button>
              )}

              {selectedItem.status !== 'changes_requested' && (
                <button
                  type="button"
                  className="admin-mod-btn admin-mod-btn-warning"
                  onClick={() => setActionModal({ type: 'corrections', item: selectedItem })}
                >
                  <SiteIcon name="alert-triangle" size={14} />
                  <span>Request Revisions</span>
                </button>
              )}

              {selectedItem.status === 'published' && (
                <button
                  type="button"
                  className="admin-mod-btn admin-mod-btn-danger"
                  onClick={() => setActionModal({ type: 'unpublish', item: selectedItem })}
                >
                  <SiteIcon name="eye-off" size={14} />
                  <span>Unpublish</span>
                </button>
              )}

              {selectedItem.status === 'unpublished' && (
                <button
                  type="button"
                  className="admin-mod-btn admin-mod-btn-primary"
                  onClick={() => setActionModal({ type: 'republish', item: selectedItem })}
                >
                  <SiteIcon name="refresh" size={14} />
                  <span>Republish</span>
                </button>
              )}

              {selectedItem.status !== 'rejected' && selectedItem.status !== 'published' && (
                <button
                  type="button"
                  className="admin-mod-btn admin-mod-btn-danger"
                  onClick={() => setActionModal({ type: 'reject', item: selectedItem })}
                >
                  <SiteIcon name="close" size={14} />
                  <span>Reject</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. Action Confirmation Modals
          ===================================================================== */}
      {actionModal && (
        <div
          className="admin-mod-modal-backdrop"
          onClick={() => setActionModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="admin-mod-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-mod-modal-header">
              <h3 className="admin-mod-modal-title">
                {actionModal.type === 'approve' && 'Approve & Publish to Catalogue'}
                {actionModal.type === 'corrections' && 'Request Revisions from Submitter'}
                {actionModal.type === 'reject' && 'Reject Submission'}
                {actionModal.type === 'unpublish' && 'Unpublish from Public Discovery'}
                {actionModal.type === 'republish' && 'Republish Listing'}
                {actionModal.type === 'add_note' && 'Add Administrative Observation'}
              </h3>
              <button
                type="button"
                className="admin-mod-drawer-close"
                onClick={() => setActionModal(null)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            <div className="admin-mod-modal-body">
              {/* APPROVE MODAL */}
              {actionModal.type === 'approve' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Publishing <strong>{actionModal.item.title}</strong> to active KhelGrid search and discovery.
                  </p>

                  <div className="admin-mod-modal-field">
                    <label className="admin-mod-modal-label">Priority Rank (1 to 5)</label>
                    <select
                      className="admin-mod-modal-select"
                      value={approvePriorityRank}
                      onChange={e => setApprovePriorityRank(Number(e.target.value))}
                    >
                      <option value={5}>P5 (Featured Top National Showcase)</option>
                      <option value={4}>P4 (High Priority State Event)</option>
                      <option value={3}>P3 (Standard Regional Hub)</option>
                      <option value={2}>P2 (Community Listing)</option>
                      <option value={1}>P1 (Low Visibility)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="trust-badge-chk"
                      checked={approveVerifiedBadge}
                      onChange={e => setApproveVerifiedBadge(e.target.checked)}
                    />
                    <label htmlFor="trust-badge-chk" style={{ fontSize: '0.8rem', color: 'var(--adm-text, #ffffff)', cursor: 'pointer' }}>
                      Grant Verified Trust Seal (evidence cross-checked)
                    </label>
                  </div>

                  <div className="admin-mod-modal-field">
                    <label className="admin-mod-modal-label">Approval Presets</label>
                    <div className="admin-mod-preset-pills">
                      {MODERATION_APPROVAL_PRESETS.map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          className="admin-mod-preset-btn"
                          onClick={() => setApproveNotes(preset.text)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="admin-mod-modal-textarea"
                      rows={2}
                      placeholder="Optional approval observation note..."
                      value={approveNotes}
                      onChange={e => setApproveNotes(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* CORRECTIONS MODAL */}
              {actionModal.type === 'corrections' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Dispatch revision instructions to <strong>{actionModal.item.submitterEmail}</strong>.
                  </p>

                  <div className="admin-mod-modal-field">
                    <label className="admin-mod-modal-label">Quick Correction Presets</label>
                    <div className="admin-mod-preset-pills">
                      {MODERATION_CORRECTION_PRESETS.map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          className="admin-mod-preset-btn"
                          onClick={() => setCorrectionNotes(preset.text)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="admin-mod-modal-textarea"
                      rows={4}
                      placeholder="Provide clear, actionable revision requests..."
                      value={correctionNotes}
                      onChange={e => setCorrectionNotes(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* REJECT MODAL */}
              {actionModal.type === 'reject' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Reject submission <strong>{actionModal.item.title}</strong>.
                  </p>

                  <div className="admin-mod-modal-field">
                    <label className="admin-mod-modal-label">Rejection Presets</label>
                    <div className="admin-mod-preset-pills">
                      {MODERATION_REJECTION_PRESETS.map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          className="admin-mod-preset-btn"
                          onClick={() => setRejectionReason(preset.text)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="admin-mod-modal-textarea"
                      rows={4}
                      placeholder="Specify rejection grounds..."
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* UNPUBLISH MODAL */}
              {actionModal.type === 'unpublish' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#f87171' }}>
                    Withdrawing <strong>{actionModal.item.title}</strong> will immediately remove it from public search and maps.
                  </p>

                  <div className="admin-mod-modal-field">
                    <label className="admin-mod-modal-label">Reason for Suspension / Withdrawal</label>
                    <textarea
                      className="admin-mod-modal-textarea"
                      rows={3}
                      placeholder="e.g. Ground undergoing seasonal drainage renovation; trial postponed by federation."
                      value={unpublishReason}
                      onChange={e => setUnpublishReason(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* REPUBLISH MODAL */}
              {actionModal.type === 'republish' && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                  Are you sure you want to reinstate and republish <strong>{actionModal.item.title}</strong> to active discovery?
                </p>
              )}

              {/* ADD NOTE MODAL */}
              {actionModal.type === 'add_note' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Add internal observation for <strong>{actionModal.item.title}</strong>.
                  </p>
                  <div className="admin-mod-modal-field">
                    <label className="admin-mod-modal-label">Administrative Observation</label>
                    <textarea
                      className="admin-mod-modal-textarea"
                      rows={3}
                      placeholder="e.g. Phone confirmed with district secretary on 24 Nov 2026."
                      value={auditNote}
                      onChange={e => setAuditNote(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="admin-mod-modal-footer">
              <button
                type="button"
                className="admin-mod-btn admin-mod-btn-secondary"
                onClick={() => setActionModal(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`admin-mod-btn ${
                  actionModal.type === 'approve' || actionModal.type === 'republish' ? 'admin-mod-btn-primary' :
                  actionModal.type === 'reject' || actionModal.type === 'unpublish' ? 'admin-mod-btn-danger' :
                  'admin-mod-btn-warning'
                }`}
                onClick={handleConfirmAction}
              >
                Confirm {actionModal.type.replace(/_/g, ' ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Toast Notification */}
      {toastMessage && (
        <div className="admin-mod-toast" role="status">
          <SiteIcon name="check" size={14} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
