import { useState, useMemo, useCallback } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  getAdminVerifications,
  getAdminVerificationDetails,
  approveVerification,
  requestVerificationCorrections,
  rejectVerification,
  revokeVerification,
  extendVerificationExpiry,
  addVerificationAuditNote,
  exportVerificationsToCsv,
  calculateExpiryStatus,
  type AdminVerificationItem,
  type VerificationBadgeTier,
} from '../services/adminVerificationService'
import './AdminVerificationVaultDesk.css'

export interface AdminVerificationVaultDeskProps {
  operatorEmail?: string
}

export function AdminVerificationVaultDesk({
  operatorEmail = 'admin@khelgrid.com',
}: AdminVerificationVaultDeskProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expiryFilter, setExpiryFilter] = useState<string>('all')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')

  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'vault' | 'audit' | 'expiry'>('overview')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Governance Action Modal State
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'corrections' | 'reject' | 'revoke' | 'extend_expiry' | 'add_note'
    item: AdminVerificationItem
  } | null>(null)

  const [approveTier, setApproveTier] = useState<VerificationBadgeTier>('tier_1_platinum')
  const [approveMonths, setApproveMonths] = useState<number>(12)
  const [correctionsText, setCorrectionsText] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [revokeReason, setRevokeReason] = useState('')
  const [extendMonths, setExtendMonths] = useState<number>(6)
  const [noteText, setNoteText] = useState('')

  const triggerRefresh = useCallback(() => {
    setRefreshTick(prev => prev + 1)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }, [])

  // All verification records
  const allVerifications = useMemo(() => {
    // dependency on refreshTick ensures reload after actions
    void refreshTick
    return getAdminVerifications()
  }, [refreshTick])

  // Extract distinct sports & cities for dropdowns
  const availableSports = useMemo(() => {
    const set = new Set<string>()
    allVerifications.forEach(v => {
      if (v.sport) set.add(v.sport.split(' ')[0])
    })
    return Array.from(set).sort()
  }, [allVerifications])

  const availableCities = useMemo(() => {
    const set = new Set<string>()
    allVerifications.forEach(v => {
      if (v.city) set.add(v.city)
    })
    return Array.from(set).sort()
  }, [allVerifications])

  // Telemetry KPIs
  const telemetry = useMemo(() => {
    const total = allVerifications.length
    const verifiedCount = allVerifications.filter(v => v.status === 'verified').length
    const pendingCount = allVerifications.filter(v => v.status === 'pending_review' || v.status === 'in_review').length
    const actionRequiredCount = allVerifications.filter(v => v.status === 'action_required').length

    let expiringSoonCount = 0
    let expiredCount = 0
    let digitallyVerifiedDocs = 0
    let totalDocs = 0

    allVerifications.forEach(v => {
      const exp = calculateExpiryStatus(v.expiresAt)
      if (exp.status === 'expiring_soon') expiringSoonCount++
      if (exp.status === 'expired' || v.status === 'expired') expiredCount++

      v.documents.forEach(doc => {
        totalDocs++
        if (doc.isVerifiedByAuthority) digitallyVerifiedDocs++
      })
    })

    const trustRate = total > 0 ? ((verifiedCount / total) * 100).toFixed(1) : '0.0'
    const docAuthenticityRate = totalDocs > 0 ? ((digitallyVerifiedDocs / totalDocs) * 100).toFixed(1) : '100.0'

    return {
      total,
      verifiedCount,
      pendingCount,
      actionRequiredCount,
      expiringSoonCount,
      expiredCount,
      trustRate,
      docAuthenticityRate,
      totalDocs,
    }
  }, [allVerifications])

  // Multi-facet filtering logic
  const filteredVerifications = useMemo(() => {
    return allVerifications.filter(item => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesRef = item.referenceCode.toLowerCase().includes(q)
        const matchesName = item.entityName.toLowerCase().includes(q)
        const matchesOrg = item.organizationName ? item.organizationName.toLowerCase().includes(q) : false
        const matchesSport = item.sport.toLowerCase().includes(q)
        const matchesCity = item.city.toLowerCase().includes(q)
        const matchesDoc = item.documents.some(d =>
          d.title.toLowerCase().includes(q) ||
          d.documentNumber.toLowerCase().includes(q) ||
          d.issuerAuthority.toLowerCase().includes(q)
        )
        if (!matchesRef && !matchesName && !matchesOrg && !matchesSport && !matchesCity && !matchesDoc) {
          return false
        }
      }

      // Entity type filter
      if (entityFilter !== 'all' && item.entityType !== entityFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      // Expiry lifecycle filter
      if (expiryFilter !== 'all') {
        const exp = calculateExpiryStatus(item.expiresAt)
        if (expiryFilter === 'expiring_soon' && exp.status !== 'expiring_soon') return false
        if (expiryFilter === 'expired' && exp.status !== 'expired' && item.status !== 'expired') return false
        if (expiryFilter === 'valid' && exp.status !== 'valid') return false
        if (expiryFilter === 'permanent' && exp.status !== 'permanent') return false
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
  }, [allVerifications, searchQuery, entityFilter, statusFilter, expiryFilter, sportFilter, cityFilter])

  // Selected item for slide-over drawer
  const selectedItem = useMemo(() => {
    void refreshTick
    if (!selectedId) return null
    return getAdminVerificationDetails(selectedId)
  }, [selectedId, refreshTick])

  // Handlers for governance actions
  const handleCopyId = (code: string) => {
    navigator.clipboard?.writeText(code)
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExportCsv = () => {
    const csv = exportVerificationsToCsv(filteredVerifications)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `khelgrid_verification_vault_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${filteredVerifications.length} verification records to CSV.`)
  }

  const handleConfirmAction = () => {
    if (!actionModal) return

    try {
      const { type, item } = actionModal

      if (type === 'approve') {
        approveVerification(item.id, approveTier, approveMonths, operatorEmail)
        showToast(`Verification Approved for ${item.entityName}. Trust Seal granted for ${approveMonths} months.`)
      } else if (type === 'corrections') {
        if (!correctionsText.trim()) return
        requestVerificationCorrections(item.id, correctionsText.trim(), operatorEmail)
        showToast(`Clarification request dispatched to ${item.entityName}.`)
      } else if (type === 'reject') {
        if (!rejectReason.trim()) return
        rejectVerification(item.id, rejectReason.trim(), operatorEmail)
        showToast(`Verification rejected for ${item.entityName}.`)
      } else if (type === 'revoke') {
        if (!revokeReason.trim()) return
        revokeVerification(item.id, revokeReason.trim(), operatorEmail)
        showToast(`Trust Seal revoked for ${item.entityName}.`)
      } else if (type === 'extend_expiry') {
        extendVerificationExpiry(item.id, extendMonths, operatorEmail)
        showToast(`Validity extended by ${extendMonths} months for ${item.entityName}.`)
      } else if (type === 'add_note') {
        if (!noteText.trim()) return
        addVerificationAuditNote(item.id, noteText.trim(), operatorEmail)
        showToast('Administrative audit note appended.')
      }

      setActionModal(null)
      setCorrectionsText('')
      setRejectReason('')
      setRevokeReason('')
      setNoteText('')
      triggerRefresh()
    } catch (err: unknown) {
      console.error(err)
      showToast(err instanceof Error ? err.message : 'Action failed.')
    }
  }

  return (
    <div className="admin-verif-desk-root">
      {/* 1. Header & Quick Actions */}
      <header className="admin-verif-header">
        <div>
          <div className="admin-verif-eyebrow">
            <SiteIcon name="shield-check" size={14} />
            <span>KhelGrid Trust & Credential Infrastructure</span>
          </div>
          <h1 className="admin-verif-title">Verification Centre & Evidence Vault</h1>
          <p className="admin-verif-subtitle">
            Evidence-based credential authentication, federation registry cross-matching,
            and automated expiry governance for coaches, academies, turfs, organisers, and athletes.
          </p>
        </div>

        <div className="admin-verif-header-actions">
          <button
            type="button"
            className="admin-verif-btn admin-verif-btn-secondary"
            onClick={triggerRefresh}
            title="Reload records from vault ledger"
          >
            <SiteIcon name="refresh" size={14} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="admin-verif-btn admin-verif-btn-primary"
            onClick={handleExportCsv}
          >
            <SiteIcon name="download" size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* 2. Micro-KPI Telemetry Ribbon */}
      <section className="admin-verif-metrics-grid" aria-label="Verification Telemetry">
        <div className="admin-verif-metric-card">
          <div className="admin-verif-metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <SiteIcon name="file-text" size={18} />
          </div>
          <div className="admin-verif-metric-content">
            <span className="admin-verif-metric-value">{telemetry.total}</span>
            <span className="admin-verif-metric-label">Vault Dossiers</span>
          </div>
        </div>

        <div className="admin-verif-metric-card">
          <div className="admin-verif-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <SiteIcon name="badge-check" size={18} />
          </div>
          <div className="admin-verif-metric-content">
            <span className="admin-verif-metric-value">{telemetry.verifiedCount}</span>
            <span className="admin-verif-metric-label">Verified Seals ({telemetry.trustRate}%)</span>
          </div>
        </div>

        <div className="admin-verif-metric-card">
          <div className="admin-verif-metric-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
            <SiteIcon name="clock" size={18} />
          </div>
          <div className="admin-verif-metric-content">
            <span className="admin-verif-metric-value">{telemetry.pendingCount}</span>
            <span className="admin-verif-metric-label">Pending Reviews</span>
          </div>
        </div>

        <div className="admin-verif-metric-card">
          <div className="admin-verif-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <SiteIcon name="alert-triangle" size={18} />
          </div>
          <div className="admin-verif-metric-content">
            <span className="admin-verif-metric-value">{telemetry.actionRequiredCount}</span>
            <span className="admin-verif-metric-label">Discrepancies</span>
          </div>
        </div>

        <div className="admin-verif-metric-card">
          <div className="admin-verif-metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <SiteIcon name="calendar" size={18} />
          </div>
          <div className="admin-verif-metric-content">
            <span className="admin-verif-metric-value">
              {telemetry.expiringSoonCount + telemetry.expiredCount}
            </span>
            <span className="admin-verif-metric-label">Expiring / Expired</span>
          </div>
        </div>

        <div className="admin-verif-metric-card">
          <div className="admin-verif-metric-icon" style={{ background: 'rgba(45, 212, 191, 0.15)', color: '#2dd4bf' }}>
            <SiteIcon name="shield-check" size={18} />
          </div>
          <div className="admin-verif-metric-content">
            <span className="admin-verif-metric-value">{telemetry.docAuthenticityRate}%</span>
            <span className="admin-verif-metric-label">Authenticity Rate</span>
          </div>
        </div>
      </section>

      {/* 3. Multi-Facet Filter & Search Controls */}
      <section className="admin-verif-controls-card">
        {/* Entity Type Filter Pills */}
        <div className="admin-verif-pill-filter-row">
          <span className="admin-verif-filter-group-label">Entity:</span>
          {(['all', 'coach', 'academy', 'venue', 'organiser', 'athlete'] as const).map(ent => {
            const count = ent === 'all'
              ? allVerifications.length
              : allVerifications.filter(v => v.entityType === ent).length
            return (
              <button
                key={ent}
                type="button"
                className={`admin-verif-pill-btn ${entityFilter === ent ? 'active' : ''}`}
                onClick={() => setEntityFilter(ent)}
              >
                <span>{ent === 'all' ? 'All Entities' : ent.charAt(0).toUpperCase() + ent.slice(1)}</span>
                <span className="admin-verif-pill-badge">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Expiry Lifecycle Filter Pills */}
        <div className="admin-verif-pill-filter-row">
          <span className="admin-verif-filter-group-label">Lifecycle:</span>
          {[
            { id: 'all', label: 'All Lifecycles' },
            { id: 'valid', label: 'Valid (>60d)' },
            { id: 'expiring_soon', label: 'Expiring Soon (≤60d)' },
            { id: 'expired', label: 'Expired Credentials' },
            { id: 'permanent', label: 'Permanent' },
          ].map(lifecycle => (
            <button
              key={lifecycle.id}
              type="button"
              className={`admin-verif-pill-btn ${expiryFilter === lifecycle.id ? 'active' : ''}`}
              onClick={() => setExpiryFilter(lifecycle.id)}
            >
              <span>{lifecycle.label}</span>
            </button>
          ))}
        </div>

        {/* Secondary Inputs: Search, Status, Sport, City */}
        <div className="admin-verif-inputs-row">
          <div className="admin-verif-search-wrap">
            <div className="admin-verif-search-icon">
              <SiteIcon name="search" size={15} />
            </div>
            <input
              type="search"
              className="admin-verif-search-input"
              placeholder="Search reference, coach/academy name, document ID, federation authority..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="admin-verif-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by verification status"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="in_review">In Review</option>
            <option value="action_required">Action Required</option>
            <option value="verified">Verified</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
            <option value="revoked">Revoked</option>
          </select>

          <select
            className="admin-verif-select"
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
            className="admin-verif-select"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            aria-label="Filter by city"
          >
            <option value="all">All Hubs / Cities</option>
            {availableCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {(searchQuery || entityFilter !== 'all' || statusFilter !== 'all' || expiryFilter !== 'all' || sportFilter !== 'all' || cityFilter !== 'all') && (
            <button
              type="button"
              className="admin-verif-btn admin-verif-btn-secondary"
              onClick={() => {
                setSearchQuery('')
                setEntityFilter('all')
                setStatusFilter('all')
                setExpiryFilter('all')
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

      {/* 4. Verification Table */}
      <section className="admin-verif-table-card">
        <div className="admin-verif-table-wrapper">
          <table className="admin-verif-table">
            <thead>
              <tr>
                <th>Reference & Entity</th>
                <th>Sport & Affiliation</th>
                <th>Evidence Submitted</th>
                <th>Verification Method</th>
                <th>Status & Trust Seal</th>
                <th>Expiry Tracking</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVerifications.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    No verification records found matching the applied criteria.
                  </td>
                </tr>
              ) : (
                filteredVerifications.map(item => {
                  const expiry = calculateExpiryStatus(item.expiresAt)
                  const primaryDoc = item.documents[0]

                  return (
                    <tr key={item.id} className="admin-verif-row">
                      {/* 1. Reference & Entity */}
                      <td>
                        <div className="admin-verif-entity-cell">
                          <div className="admin-verif-entity-header">
                            <span className="admin-verif-entity-name">{item.entityName}</span>
                            <span className={`admin-verif-type-badge ${item.entityType}`}>
                              {item.entityType}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="admin-verif-ref-code">{item.referenceCode}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyId(item.referenceCode)}
                              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                              title="Copy Reference Code"
                            >
                              <SiteIcon name={copiedId === item.referenceCode ? 'check' : 'copy'} size={12} />
                            </button>
                            <span className="admin-verif-entity-sub">
                              · {item.city}, {item.state}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Sport & Affiliation */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.sport}</span>
                          <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                            {item.organizationName ?? 'Direct Individual Submission'}
                          </span>
                        </div>
                      </td>

                      {/* 3. Evidence Submitted */}
                      <td>
                        <div className="admin-verif-docs-cell">
                          <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.75rem' }}>
                            {item.documents.length} Document{item.documents.length > 1 ? 's' : ''}
                          </span>
                          {primaryDoc && (
                            <span className="admin-verif-doc-pill" title={primaryDoc.title}>
                              <SiteIcon name="file-text" size={11} />
                              {primaryDoc.title}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Verification Method */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9' }}>
                            {primaryDoc?.issuerAuthority ?? 'Official Registry'}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>
                            {primaryDoc?.verificationMethod.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>

                      {/* 5. Status & Trust Seal */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span className={`admin-verif-status-badge ${item.status}`}>
                            <SiteIcon
                              name={
                                item.status === 'verified' ? 'badge-check' :
                                item.status === 'pending_review' ? 'clock' :
                                item.status === 'action_required' ? 'alert-triangle' :
                                item.status === 'expired' ? 'calendar' :
                                item.status === 'rejected' ? 'close' : 'shield-check'
                              }
                              size={12}
                            />
                            {item.status.replace(/_/g, ' ')}
                          </span>

                          {item.badgeTier && (
                            <span className={`admin-verif-tier-badge ${item.badgeTier}`}>
                              <SiteIcon name="award" size={11} />
                              {item.badgeTier.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Expiry Tracking */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span className={`admin-verif-expiry-pill ${expiry.status}`}>
                            <SiteIcon name="clock" size={11} />
                            {expiry.formattedLabel}
                          </span>
                          {item.expiresAt && (
                            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              Exp: {new Date(item.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="admin-verif-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-verif-btn admin-verif-btn-secondary"
                            onClick={() => {
                              setSelectedId(item.id)
                              setDrawerTab('overview')
                            }}
                          >
                            <SiteIcon name="eye" size={13} />
                            <span>Inspect</span>
                          </button>

                          {item.status === 'pending_review' || item.status === 'in_review' ? (
                            <button
                              type="button"
                              className="admin-verif-btn admin-verif-btn-primary"
                              onClick={() => setActionModal({ type: 'approve', item })}
                            >
                              <SiteIcon name="check" size={13} />
                              <span>Verify</span>
                            </button>
                          ) : (expiry.status === 'expiring_soon' || expiry.status === 'expired') ? (
                            <button
                              type="button"
                              className="admin-verif-btn admin-verif-btn-warning"
                              onClick={() => setActionModal({ type: 'extend_expiry', item })}
                            >
                              <SiteIcon name="refresh" size={13} />
                              <span>Extend</span>
                            </button>
                          ) : null}
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
          5. Slide-Over Evidence Inspection Drawer
          ===================================================================== */}
      {selectedItem && (
        <div
          className="admin-verif-drawer-backdrop"
          onClick={() => setSelectedId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="admin-verif-drawer"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="admin-verif-drawer-header">
              <div className="admin-verif-drawer-title-area">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`admin-verif-type-badge ${selectedItem.entityType}`}>
                    {selectedItem.entityType}
                  </span>
                  <span className="admin-verif-ref-code">{selectedItem.referenceCode}</span>
                </div>
                <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', color: '#ffffff', fontWeight: 800 }}>
                  {selectedItem.entityName}
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {selectedItem.organizationName ? `${selectedItem.organizationName} · ` : ''}{selectedItem.city}, {selectedItem.state}
                </span>
              </div>

              <button
                type="button"
                className="admin-verif-drawer-close"
                onClick={() => setSelectedId(null)}
                aria-label="Close inspection drawer"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            {/* Drawer Tab Navigation */}
            <nav className="admin-verif-drawer-tabs" aria-label="Inspection tabs">
              <button
                type="button"
                className={`admin-verif-tab-btn ${drawerTab === 'overview' ? 'active' : ''}`}
                onClick={() => setDrawerTab('overview')}
              >
                <SiteIcon name="info" size={14} />
                <span>Overview</span>
              </button>

              <button
                type="button"
                className={`admin-verif-tab-btn ${drawerTab === 'vault' ? 'active' : ''}`}
                onClick={() => setDrawerTab('vault')}
              >
                <SiteIcon name="shield-check" size={14} />
                <span>Evidence Vault ({selectedItem.documents.length})</span>
              </button>

              <button
                type="button"
                className={`admin-verif-tab-btn ${drawerTab === 'audit' ? 'active' : ''}`}
                onClick={() => setDrawerTab('audit')}
              >
                <SiteIcon name="activity" size={14} />
                <span>Audit Trail ({selectedItem.auditTrail.length})</span>
              </button>

              <button
                type="button"
                className={`admin-verif-tab-btn ${drawerTab === 'expiry' ? 'active' : ''}`}
                onClick={() => setDrawerTab('expiry')}
              >
                <SiteIcon name="calendar" size={14} />
                <span>Expiry Governance</span>
              </button>
            </nav>

            {/* Drawer Body Content */}
            <div className="admin-verif-drawer-body">
              {/* TAB 1: OVERVIEW */}
              {drawerTab === 'overview' && (
                <>
                  <div className="admin-verif-detail-box">
                    <h3 className="admin-verif-detail-title">
                      <SiteIcon name="badge-check" size={14} />
                      <span>Current Credential Status</span>
                    </h3>
                    <div className="admin-verif-grid-2col">
                      <div className="admin-verif-field">
                        <span className="admin-verif-field-label">Verification State</span>
                        <div>
                          <span className={`admin-verif-status-badge ${selectedItem.status}`}>
                            {selectedItem.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="admin-verif-field">
                        <span className="admin-verif-field-label">Trust Seal Tier</span>
                        <span className="admin-verif-field-val">
                          {selectedItem.badgeTier ? selectedItem.badgeTier.replace(/_/g, ' ').toUpperCase() : 'Not Yet Awarded'}
                        </span>
                      </div>

                      <div className="admin-verif-field">
                        <span className="admin-verif-field-label">Assigned Reviewer</span>
                        <span className="admin-verif-field-val">
                          {selectedItem.assignedReviewer ?? 'Unassigned (Queue)'}
                        </span>
                      </div>

                      <div className="admin-verif-field">
                        <span className="admin-verif-field-label">Last Audited</span>
                        <span className="admin-verif-field-val">
                          {new Date(selectedItem.lastAuditedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {selectedItem.actionRequiredNotes && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '0.75rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', display: 'block', marginBottom: '0.25rem' }}>
                          Discrepancy / Action Required Notice:
                        </span>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#fde68a' }}>
                          {selectedItem.actionRequiredNotes}
                        </p>
                      </div>
                    )}

                    {selectedItem.rejectionReason && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.75rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>
                          Rejection Reason:
                        </span>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#fca5a5' }}>
                          {selectedItem.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="admin-verif-detail-box">
                    <h3 className="admin-verif-detail-title">
                      <SiteIcon name="user" size={14} />
                      <span>Contact & Sports Profile</span>
                    </h3>
                    <div className="admin-verif-grid-2col">
                      <div className="admin-verif-field">
                        <span className="admin-verif-field-label">Primary Sport</span>
                        <span className="admin-verif-field-val">{selectedItem.sport}</span>
                      </div>

                      <div className="admin-verif-field">
                        <span className="admin-verif-field-label">Location</span>
                        <span className="admin-verif-field-val">{selectedItem.city}, {selectedItem.state}</span>
                      </div>

                      <div className="admin-verif-field">
                        <span className="admin-verif-field-label">Email Address</span>
                        <span className="admin-verif-field-val">{selectedItem.contactEmail}</span>
                      </div>

                      <div className="admin-verif-field">
                        <span className="admin-verif-field-label">Contact Mobile</span>
                        <span className="admin-verif-field-val">{selectedItem.contactPhone}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: EVIDENCE VAULT */}
              {drawerTab === 'vault' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {selectedItem.documents.map((doc, i) => {
                      const docExp = calculateExpiryStatus(doc.expiresAt)

                      return (
                        <div key={doc.id} className="admin-verif-doc-card">
                          <div className="admin-verif-doc-top">
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8' }}>
                                  #{i + 1}
                                </span>
                                <span className="admin-verif-doc-name">{doc.title}</span>
                              </div>
                              <div className="admin-verif-doc-auth">
                                Issuer: {doc.issuerAuthority} · ID: {doc.documentNumber}
                              </div>
                            </div>

                            <span className={`admin-verif-status-badge ${doc.isVerifiedByAuthority ? 'verified' : 'pending_review'}`}>
                              <SiteIcon name={doc.isVerifiedByAuthority ? 'check' : 'clock'} size={11} />
                              {doc.isVerifiedByAuthority ? 'Authenticated' : 'Unchecked'}
                            </span>
                          </div>

                          {/* Watermarked Document Preview Box */}
                          <div className="admin-verif-doc-preview-mock">
                            <div className="admin-verif-preview-watermark">
                              KHELGRID VAULT EVIDENCE
                            </div>
                            <SiteIcon name="file-text" size={32} />
                            <div style={{ textAlign: 'center', zIndex: 1 }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff', display: 'block' }}>
                                {doc.title}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                File Size: {doc.fileSize} · Format: {doc.fileMimeType}
                              </span>
                            </div>
                            <div className="admin-verif-hash-row">
                              <SiteIcon name="shield-check" size={11} />
                              <span>SHA-256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069</span>
                            </div>
                          </div>

                          {/* Document Metadata Details */}
                          <div className="admin-verif-grid-2col" style={{ fontSize: '0.75rem' }}>
                            <div>
                              <span style={{ color: '#64748b' }}>Verification Method:</span>{' '}
                              <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                                {doc.verificationMethod.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b' }}>Issued On:</span>{' '}
                              <span style={{ color: '#cbd5e1' }}>
                                {new Date(doc.issuedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b' }}>Validity Expiry:</span>{' '}
                              <span style={{ color: docExp.status === 'expired' ? '#f87171' : '#cbd5e1' }}>
                                {docExp.formattedLabel}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b' }}>Uploaded On:</span>{' '}
                              <span style={{ color: '#cbd5e1' }}>
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* TAB 3: AUDIT TRAIL */}
              {drawerTab === 'audit' && (
                <div className="admin-verif-detail-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="admin-verif-detail-title">
                      <SiteIcon name="activity" size={14} />
                      <span>Chronological Verification Ledger</span>
                    </h3>
                    <button
                      type="button"
                      className="admin-verif-btn admin-verif-btn-secondary"
                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                      onClick={() => setActionModal({ type: 'add_note', item: selectedItem })}
                    >
                      <SiteIcon name="plus" size={11} />
                      <span>Add Audit Note</span>
                    </button>
                  </div>

                  <div className="admin-verif-audit-list">
                    {selectedItem.auditTrail.map(entry => (
                      <div key={entry.id} className="admin-verif-audit-item">
                        <div className="admin-verif-audit-bullet" />
                        <div className="admin-verif-audit-header">
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                            {entry.actorEmail}
                          </span>
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <span className="admin-verif-audit-summary">{entry.summary}</span>
                        {entry.notes && (
                          <div className="admin-verif-audit-notes">{entry.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: EXPIRY GOVERNANCE */}
              {drawerTab === 'expiry' && (
                <div className="admin-verif-expiry-widget">
                  <h3 className="admin-verif-detail-title">
                    <SiteIcon name="calendar" size={14} />
                    <span>Automated Expiry & Renewal Tracking</span>
                  </h3>

                  {(() => {
                    const exp = calculateExpiryStatus(selectedItem.expiresAt)
                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                            Current Expiry Status:
                          </span>
                          <span className={`admin-verif-expiry-pill ${exp.status}`}>
                            <SiteIcon name="clock" size={12} />
                            {exp.formattedLabel}
                          </span>
                        </div>

                        {selectedItem.expiresAt && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            Target Expiry Date: <strong style={{ color: '#ffffff' }}>{new Date(selectedItem.expiresAt).toLocaleDateString()}</strong>
                          </div>
                        )}

                        <div className="admin-verif-expiry-timeline-bar">
                          <div
                            className="admin-verif-expiry-timeline-fill"
                            style={{
                              width: exp.status === 'expired' ? '100%' : exp.status === 'expiring_soon' ? '85%' : '35%',
                              background: exp.status === 'expired' ? '#ef4444' : exp.status === 'expiring_soon' ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>

                        <div style={{ background: '#0b111e', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.85rem', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#38bdf8' }}>
                            Automated Renewal Protocol:
                          </p>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                            <li>Automated renewal reminders trigger at T-60 and T-30 days before expiration.</li>
                            <li>At T-0, unrenewed credentials lose the Verified Trust Seal and revert to unverified.</li>
                            <li>Admins can extend the validity or grant grace periods for pending federation renewals below.</li>
                          </ul>
                        </div>

                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="admin-verif-btn admin-verif-btn-warning"
                            onClick={() => setActionModal({ type: 'extend_expiry', item: selectedItem })}
                          >
                            <SiteIcon name="refresh" size={13} />
                            <span>Extend Validity / Grant Grace Period</span>
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="admin-verif-drawer-footer">
              {selectedItem.status !== 'verified' && (
                <button
                  type="button"
                  className="admin-verif-btn admin-verif-btn-primary"
                  onClick={() => setActionModal({ type: 'approve', item: selectedItem })}
                >
                  <SiteIcon name="badge-check" size={14} />
                  <span>Approve & Issue Trust Seal</span>
                </button>
              )}

              {selectedItem.status !== 'action_required' && (
                <button
                  type="button"
                  className="admin-verif-btn admin-verif-btn-warning"
                  onClick={() => setActionModal({ type: 'corrections', item: selectedItem })}
                >
                  <SiteIcon name="alert-triangle" size={14} />
                  <span>Request Corrections</span>
                </button>
              )}

              {selectedItem.status === 'verified' && (
                <button
                  type="button"
                  className="admin-verif-btn admin-verif-btn-danger"
                  onClick={() => setActionModal({ type: 'revoke', item: selectedItem })}
                >
                  <SiteIcon name="shield-check" size={14} />
                  <span>Revoke Seal</span>
                </button>
              )}

              {selectedItem.status !== 'rejected' && selectedItem.status !== 'verified' && (
                <button
                  type="button"
                  className="admin-verif-btn admin-verif-btn-danger"
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
          6. Governance Action Modals
          ===================================================================== */}
      {actionModal && (
        <div
          className="admin-verif-modal-backdrop"
          onClick={() => setActionModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="admin-verif-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-verif-modal-header">
              <h3 className="admin-verif-modal-title">
                {actionModal.type === 'approve' && 'Approve & Issue Trust Seal'}
                {actionModal.type === 'corrections' && 'Request Evidence Corrections'}
                {actionModal.type === 'reject' && 'Reject Verification Application'}
                {actionModal.type === 'revoke' && 'Revoke Verified Trust Seal'}
                {actionModal.type === 'extend_expiry' && 'Extend Validity / Grant Grace Period'}
                {actionModal.type === 'add_note' && 'Add Internal Administrative Note'}
              </h3>
              <button
                type="button"
                className="admin-verif-drawer-close"
                onClick={() => setActionModal(null)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            <div className="admin-verif-modal-body">
              {/* APPROVE MODAL */}
              {actionModal.type === 'approve' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Authenticating credentials for <strong>{actionModal.item.entityName}</strong> ({actionModal.item.referenceCode}).
                  </p>

                  <div className="admin-verif-modal-field">
                    <label className="admin-verif-modal-label">Trust Seal Tier</label>
                    <select
                      className="admin-verif-modal-select"
                      value={approveTier}
                      onChange={e => setApproveTier(e.target.value as VerificationBadgeTier)}
                    >
                      <option value="tier_1_platinum">Tier-1 Platinum (National/International Elite)</option>
                      <option value="tier_2_gold">Tier-2 Gold (State Association Accredited)</option>
                      <option value="verified_standard">Standard Verified (District/Municipal Compliant)</option>
                    </select>
                  </div>

                  <div className="admin-verif-modal-field">
                    <label className="admin-verif-modal-label">Validity Duration</label>
                    <select
                      className="admin-verif-modal-select"
                      value={approveMonths}
                      onChange={e => setApproveMonths(Number(e.target.value))}
                    >
                      <option value={6}>6 Months (Provisional Review)</option>
                      <option value={12}>12 Months (Standard Annual License)</option>
                      <option value={24}>24 Months (Biennial Accreditation)</option>
                      <option value={36}>36 Months (Triennial Federation Diploma)</option>
                    </select>
                  </div>
                </>
              )}

              {/* CORRECTIONS MODAL */}
              {actionModal.type === 'corrections' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Send an evidence correction request to <strong>{actionModal.item.entityName}</strong>.
                  </p>

                  <div className="admin-verif-modal-field">
                    <label className="admin-verif-modal-label">Discrepancy Details & Required Documents</label>
                    <textarea
                      className="admin-verif-modal-textarea"
                      rows={4}
                      placeholder="e.g. Affiliation certificate expired on 31 March 2026. Please upload current state association renewal receipt and municipal tax clearance."
                      value={correctionsText}
                      onChange={e => setCorrectionsText(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* REJECT MODAL */}
              {actionModal.type === 'reject' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Reject verification for <strong>{actionModal.item.entityName}</strong>. This record will be flagged in the trust & safety watch-list.
                  </p>

                  <div className="admin-verif-modal-field">
                    <label className="admin-verif-modal-label">Rejection Justification</label>
                    <textarea
                      className="admin-verif-modal-textarea"
                      rows={4}
                      placeholder="Provide specific findings (e.g. Unsanctioned commercial tournament collecting entry fees; fraudulent federation registration stamp)."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* REVOKE MODAL */}
              {actionModal.type === 'revoke' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#f87171' }}>
                    Warning: Revoking the trust seal will immediately strip verified status, remove badges across public listings, and flag the organisation.
                  </p>

                  <div className="admin-verif-modal-field">
                    <label className="admin-verif-modal-label">Revocation Reason</label>
                    <textarea
                      className="admin-verif-modal-textarea"
                      rows={3}
                      placeholder="Specify compliance violation, forged credential discovery, or federation suspension order."
                      value={revokeReason}
                      onChange={e => setRevokeReason(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* EXTEND EXPIRY MODAL */}
              {actionModal.type === 'extend_expiry' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Extend validity or grant grace period for <strong>{actionModal.item.entityName}</strong> while federation re-certification is in progress.
                  </p>

                  <div className="admin-verif-modal-field">
                    <label className="admin-verif-modal-label">Additional Extension</label>
                    <select
                      className="admin-verif-modal-select"
                      value={extendMonths}
                      onChange={e => setExtendMonths(Number(e.target.value))}
                    >
                      <option value={3}>+3 Months (Short Grace Period)</option>
                      <option value={6}>+6 Months (Interim License)</option>
                      <option value={12}>+12 Months (Full Renewal)</option>
                    </select>
                  </div>
                </>
              )}

              {/* ADD NOTE MODAL */}
              {actionModal.type === 'add_note' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Append an internal audit note to <strong>{actionModal.item.entityName}</strong>. Visible only to KhelGrid administrators.
                  </p>

                  <div className="admin-verif-modal-field">
                    <label className="admin-verif-modal-label">Internal Note</label>
                    <textarea
                      className="admin-verif-modal-textarea"
                      rows={3}
                      placeholder="e.g. Cross-verified with Maharashtra Badminton Association meeting minutes on 24 Nov 2026."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="admin-verif-modal-footer">
              <button
                type="button"
                className="admin-verif-btn admin-verif-btn-secondary"
                onClick={() => setActionModal(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`admin-verif-btn ${
                  actionModal.type === 'approve' ? 'admin-verif-btn-primary' :
                  actionModal.type === 'reject' || actionModal.type === 'revoke' ? 'admin-verif-btn-danger' :
                  'admin-verif-btn-warning'
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
        <div className="admin-verif-toast" role="status">
          <SiteIcon name="check" size={14} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
