import { useState, useMemo, useCallback } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  getAdminTenants,
  getAdminTenantDetails,
  updateTenantLifecycleStatus,
  updateTenantVerificationStatus,
  addTenantAdminNote,
  exportTenantsToCsv,
  type AdminTenantDetail,
} from '../services/adminTenantService'
import {
  mapTenantTypeToInspectionTarget,
  startReadOnlyWorkspaceInspection,
} from '../../../../src/shared/governance/regulatoryBridge'
import { proposeMakerCheckerAction } from '../services/adminGovernanceEscalationService'
import './AdminTenantManagementDesk.css'

export interface AdminTenantManagementDeskProps {
  operatorEmail?: string
}

export function AdminTenantManagementDesk({
  operatorEmail = 'admin@khelgrid.com',
}: AdminTenantManagementDeskProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [verificationFilter, setVerificationFilter] = useState<string>('all')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')

  const [refreshTick, setRefreshTick] = useState(0)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [inspectionTab, setInspectionTab] = useState<'overview' | 'members' | 'units' | 'audit'>('overview')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Governance Action Modal State
  const [actionModal, setActionModal] = useState<{
    tenantId: string
    tenantName: string
    type: 'verify' | 'restrict' | 'suspend' | 'reactivate' | 'note'
  } | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [accreditationBody, setAccreditationBody] = useState('')

  const triggerRefresh = useCallback(() => {
    setRefreshTick(prev => prev + 1)
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 3500)
  }

  // Load all tenants according to filters
  const filteredTenants = useMemo(() => {
    return getAdminTenants({
      query: searchQuery,
      tenantType: typeFilter,
      status: statusFilter,
      verificationStatus: verificationFilter,
      sport: sportFilter,
      city: cityFilter,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, typeFilter, statusFilter, verificationFilter, sportFilter, cityFilter, refreshTick])

  // Aggregate metrics across entire tenant ecosystem
  const allTenants = useMemo(() => {
    return getAdminTenants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  const metrics = useMemo(() => {
    const total = allTenants.length
    const verified = allTenants.filter(t => t.verificationStatus === 'verified').length
    const pendingVerification = allTenants.filter(t => t.verificationStatus === 'pending_review' || t.status === 'pending_verification').length
    const suspended = allTenants.filter(t => t.status === 'suspended').length

    const typeCounts: Record<string, number> = {
      all: total,
      academy: allTenants.filter(t => t.tenantType === 'academy').length,
      venue: allTenants.filter(t => t.tenantType === 'venue').length,
      coach: allTenants.filter(t => t.tenantType === 'coach').length,
      tournament: allTenants.filter(t => t.tenantType === 'tournament').length,
      university: allTenants.filter(t => t.tenantType === 'university').length,
      club: allTenants.filter(t => t.tenantType === 'club').length,
    }

    return { total, verified, pendingVerification, suspended, typeCounts }
  }, [allTenants])

  // Selected tenant full detail
  const activeTenantDetail: AdminTenantDetail | null = useMemo(() => {
    if (!selectedTenantId) return null
    return getAdminTenantDetails(selectedTenantId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, refreshTick])

  const handleCopySlug = (slug: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(slug)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleExportCsv = () => {
    const csvContent = exportTenantsToCsv(filteredTenants)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `khelgrid_tenants_governance_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`Exported ${filteredTenants.length} tenant organisations to CSV.`)
  }

  const handleExecuteAction = () => {
    if (!actionModal) return

    const { tenantId, type, tenantName } = actionModal

    if (type === 'verify') {
      const res = updateTenantVerificationStatus(
        tenantId,
        'verified',
        operatorEmail,
        accreditationBody.trim() || 'Verified Sports Federation / State Accreditation',
        actionNote.trim() || 'Accreditation credentials and documents verified by administrator.'
      )
      if (res.success) {
        showToast(`Tenant "${tenantName}" granted Verified Sports Organisation seal.`)
      }
    } else if (type === 'restrict') {
      const res = updateTenantLifecycleStatus(
        tenantId,
        'restricted',
        operatorEmail,
        actionNote.trim() || 'Placed under read-only compliance restriction pending document verification.'
      )
      if (res.success) {
        showToast(`Tenant "${tenantName}" placed in Restricted (Read-Only) mode.`)
      }
    } else if (type === 'suspend') {
      const res = updateTenantLifecycleStatus(
        tenantId,
        'suspended',
        operatorEmail,
        actionNote.trim() || 'Administrative suspension for platform policy compliance.'
      )
      if (res.success) {
        showToast(`Tenant "${tenantName}" has been suspended. Public listings disabled.`)
      }
    } else if (type === 'reactivate') {
      const res = updateTenantLifecycleStatus(
        tenantId,
        'active',
        operatorEmail,
        actionNote.trim() || 'Reactivated following compliance review.'
      )
      if (res.success) {
        showToast(`Tenant "${tenantName}" reinstated to active operational status.`)
      }
    } else if (type === 'note') {
      if (!actionNote.trim()) return
      const res = addTenantAdminNote(tenantId, operatorEmail, actionNote.trim())
      if (res.success) {
        showToast(`Internal governance note recorded for "${tenantName}".`)
      }
    }

    setActionModal(null)
    setActionNote('')
    setAccreditationBody('')
    triggerRefresh()
  }

  const handleProposeSuspendDualControl = () => {
    if (!actionModal || actionModal.type !== 'suspend') return
    const targetTenant = allTenants.find(t => t.id === actionModal.tenantId)
    const target = mapTenantTypeToInspectionTarget(targetTenant?.tenantType || 'academy')
    const justification =
      actionNote.trim() ||
      'Proposed administrative suspension for platform policy compliance review.'

    const proposal = proposeMakerCheckerAction({
      actionType: 'tenant_suspension',
      sourceDesk: 'tenant_governance',
      targetEntityId: actionModal.tenantId,
      targetEntityName: actionModal.tenantName,
      targetEntitySlug: targetTenant?.slug,
      targetPersona: target.persona,
      title: `Compliance Suspension · ${actionModal.tenantName}`,
      justification,
      impactSummary: [
        'Updates Tenant Lifecycle status to SUSPENDED across all branches.',
        `Locks front-end ${target.workspaceLabel} with a live compliance notice until remediated.`,
      ],
      payload: {
        tenantId: actionModal.tenantId,
        newStatus: 'suspended',
      },
      makerEmail: operatorEmail,
    })

    addTenantAdminNote(
      actionModal.tenantId,
      operatorEmail,
      `Submitted suspension proposal ${proposal.referenceCode} for dual-control approval: ${justification}`,
    )

    setActionModal(null)
    setActionNote('')
    triggerRefresh()
    showToast(
      `Queued ${proposal.referenceCode} in Dual-Control Approvals awaiting second administrator sign-off.`,
    )
  }

  const handleInspectLiveWorkspace = (tenant: AdminTenantDetail) => {
    const session = startReadOnlyWorkspaceInspection({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      tenantType: tenant.tenantType,
      adminEmail: operatorEmail,
      durationMinutes: 30,
    })
    addTenantAdminNote(
      tenant.id,
      operatorEmail,
      `Launched 30-minute Read-Only Workspace Inspection (${session.workspaceLabel} at ${session.routePath}).`,
    )
    triggerRefresh()
    if (typeof window !== 'undefined') {
      window.location.assign(session.routePath)
    }
  }

  return (
    <div className="admin-tenant-desk-root" role="region" aria-label="Tenant & Organisation Governance Desk">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-undo-toast" role="status" aria-live="polite">
          <SiteIcon name="check-circle" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="admin-tenant-header">
        <div>
          <span className="admin-tenant-eyebrow">
            <SiteIcon name="shield-check" size={14} /> Multi-Tenant SaaS Platform Governance
          </span>
          <h1 className="admin-tenant-title">Tenant &amp; Organisation Governance</h1>
          <p className="admin-tenant-subtitle">
            Centralized oversight of all academies, clubs, venues, and coaches operating as SaaS tenants on KhelGrid.
            Govern verified trust badges, enforce compliance, inspect staff rosters, and monitor ecosystem health.
          </p>
        </div>
        <div className="admin-tenant-header-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={handleExportCsv}
            title="Download CSV export of filtered tenant organisations"
          >
            <SiteIcon name="download" size={14} />
            <span>Export CSV ({filteredTenants.length})</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={triggerRefresh}
            title="Refresh tenant directory from database"
          >
            <SiteIcon name="refresh" size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Hero KPI Ribbon */}
      <div className="admin-tenant-metrics-grid">
        <div className="admin-tenant-metric-card">
          <div className="admin-tenant-metric-icon">
            <SiteIcon name="building" size={22} />
          </div>
          <div className="admin-tenant-metric-content">
            <span className="admin-tenant-metric-label">Total SaaS Tenants</span>
            <div className="admin-tenant-metric-val-row">
              <span className="admin-tenant-metric-val">{metrics.total}</span>
              <span className="admin-tenant-metric-sub">Registered Orgs</span>
            </div>
          </div>
        </div>

        <div className="admin-tenant-metric-card is-verified">
          <div className="admin-tenant-metric-icon">
            <SiteIcon name="check-circle" size={22} />
          </div>
          <div className="admin-tenant-metric-content">
            <span className="admin-tenant-metric-label">Verified Organisations</span>
            <div className="admin-tenant-metric-val-row">
              <span className="admin-tenant-metric-val">{metrics.verified}</span>
              <span className="admin-tenant-metric-sub">
                {metrics.total > 0 ? `${Math.round((metrics.verified / metrics.total) * 100)}% verified` : '0%'}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-tenant-metric-card is-pending">
          <div className="admin-tenant-metric-icon">
            <SiteIcon name="alert-triangle" size={22} />
          </div>
          <div className="admin-tenant-metric-content">
            <span className="admin-tenant-metric-label">Pending Verification</span>
            <div className="admin-tenant-metric-val-row">
              <span className="admin-tenant-metric-val">{metrics.pendingVerification}</span>
              <span className="admin-tenant-metric-sub">Review Required</span>
            </div>
          </div>
        </div>

        <div className="admin-tenant-metric-card is-suspended">
          <div className="admin-tenant-metric-icon">
            <SiteIcon name="close" size={22} />
          </div>
          <div className="admin-tenant-metric-content">
            <span className="admin-tenant-metric-label">Suspended / Actioned</span>
            <div className="admin-tenant-metric-val-row">
              <span className="admin-tenant-metric-val">{metrics.suspended}</span>
              <span className="admin-tenant-metric-sub">Policy Held</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Type Filter Strip */}
      <div className="admin-tenant-types-bar">
        <span className="admin-tenant-types-title">
          <SiteIcon name="filter" size={13} /> Tenant Type:
        </span>
        <button
          type="button"
          className={`admin-tenant-type-pill ${typeFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('all')}
        >
          All Types <span className="admin-tenant-type-count">{metrics.typeCounts.all || 0}</span>
        </button>
        <button
          type="button"
          className={`admin-tenant-type-pill ${typeFilter === 'academy' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('academy')}
        >
          Academies <span className="admin-tenant-type-count">{metrics.typeCounts.academy || 0}</span>
        </button>
        <button
          type="button"
          className={`admin-tenant-type-pill ${typeFilter === 'venue' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('venue')}
        >
          Venues &amp; Turfs <span className="admin-tenant-type-count">{metrics.typeCounts.venue || 0}</span>
        </button>
        <button
          type="button"
          className={`admin-tenant-type-pill ${typeFilter === 'coach' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('coach')}
        >
          Coaches <span className="admin-tenant-type-count">{metrics.typeCounts.coach || 0}</span>
        </button>
        <button
          type="button"
          className={`admin-tenant-type-pill ${typeFilter === 'tournament' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('tournament')}
        >
          Tournaments <span className="admin-tenant-type-count">{metrics.typeCounts.tournament || 0}</span>
        </button>
        <button
          type="button"
          className={`admin-tenant-type-pill ${typeFilter === 'university' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('university')}
        >
          Universities <span className="admin-tenant-type-count">{metrics.typeCounts.university || 0}</span>
        </button>
        <button
          type="button"
          className={`admin-tenant-type-pill ${typeFilter === 'club' ? 'is-active' : ''}`}
          onClick={() => setTypeFilter('club')}
        >
          Clubs <span className="admin-tenant-type-count">{metrics.typeCounts.club || 0}</span>
        </button>
      </div>

      {/* Toolbar & Multi-Facet Filters */}
      <div className="admin-tenant-toolbar">
        <div className="admin-tenant-search-wrap">
          <span className="admin-tenant-search-icon">
            <SiteIcon name="search" size={14} />
          </span>
          <input
            type="search"
            className="admin-tenant-search-input"
            placeholder="Search organisation by name, slug, city, sport, owner…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search tenants"
          />
        </div>

        <div className="admin-tenant-filters-group">
          {/* Status Filter */}
          <select
            className="admin-tenant-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by lifecycle status"
          >
            <option value="all">All Lifecycle Statuses</option>
            <option value="active">Active Only</option>
            <option value="restricted">Restricted (Read-Only)</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="suspended">Suspended Only</option>
            <option value="archived">Archived</option>
          </select>

          {/* Verification Status Filter */}
          <select
            className="admin-tenant-select"
            value={verificationFilter}
            onChange={e => setVerificationFilter(e.target.value)}
            aria-label="Filter by verification seal"
          >
            <option value="all">All Verification Tiers</option>
            <option value="verified">Verified Orgs 🛡️</option>
            <option value="pending_review">Pending Review ⏱️</option>
            <option value="unverified">Unverified ⚪</option>
          </select>

          {/* Sport Filter */}
          <select
            className="admin-tenant-select"
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
            aria-label="Filter by sport discipline"
          >
            <option value="all">All Sports</option>
            <option value="Cricket">Cricket</option>
            <option value="Football">Football</option>
            <option value="Badminton">Badminton</option>
            <option value="Athletics">Athletics</option>
            <option value="Tennis">Tennis</option>
            <option value="Wrestling">Wrestling</option>
            <option value="Kabaddi">Kabaddi</option>
            <option value="Chess">Chess</option>
            <option value="Martial Arts">Martial Arts</option>
          </select>

          {/* City Filter */}
          <select
            className="admin-tenant-select"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            aria-label="Filter by city hub"
          >
            <option value="all">All Cities</option>
            <option value="New Delhi">New Delhi</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Kolkata">Kolkata</option>
            <option value="Pune">Pune</option>
            <option value="Chennai">Chennai</option>
            <option value="Kolhapur">Kolhapur</option>
            <option value="Ludhiana">Ludhiana</option>
            <option value="Shimla">Shimla</option>
          </select>

          {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || verificationFilter !== 'all' || sportFilter !== 'all' || cityFilter !== 'all') && (
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={() => {
                setSearchQuery('')
                setTypeFilter('all')
                setStatusFilter('all')
                setVerificationFilter('all')
                setSportFilter('all')
                setCityFilter('all')
              }}
              title="Reset all search filters"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="admin-tenant-table-container">
        <table className="admin-tenant-table">
          <thead>
            <tr>
              <th>Tenant Organisation</th>
              <th>Type &amp; Sport</th>
              <th>Owner &amp; Governance</th>
              <th>Scale (Branches / Staff)</th>
              <th>Verification Seal</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  <SiteIcon name="search" size={32} />
                  <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>No tenant organisations matched your filter criteria.</p>
                </td>
              </tr>
            ) : (
              filteredTenants.map(tenant => {
                const isSelected = selectedTenantId === tenant.id
                return (
                  <tr
                    key={tenant.id}
                    className={`admin-tenant-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedTenantId(tenant.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="admin-tenant-identity-cell">
                        <span className="admin-tenant-name">
                          {tenant.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="admin-tenant-slug-btn"
                            onClick={e => {
                              e.stopPropagation()
                              handleCopySlug(tenant.slug, tenant.id)
                            }}
                            title="Click to copy canonical slug"
                          >
                            <SiteIcon name="copy" size={11} />
                            <code>{tenant.slug}</code>
                            {copiedId === tenant.id && <span style={{ color: '#10b981' }}>✓</span>}
                          </button>
                        </div>
                        <div className="admin-tenant-geo-sport">
                          <span>📍 {tenant.city}, {tenant.state}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                        <span className={`admin-tenant-type-tag type-${tenant.tenantType}`}>
                          {tenant.tenantType}
                        </span>
                        <span className="admin-tenant-sport-tag">
                          {tenant.sport}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc' }}>{tenant.ownerName}</span>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{tenant.ownerEmail}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{tenant.contactPhone}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.76rem' }}>
                        <span>🏢 <strong>{tenant.branchesCount}</strong> {tenant.branchesCount === 1 ? 'branch' : 'branches'}</span>
                        <span>👥 <strong>{tenant.staffCount}</strong> staff / coaches</span>
                        {tenant.studentsCount > 0 && (
                          <span style={{ color: '#38bdf8' }}>🎓 {tenant.studentsCount} trainees</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {tenant.verificationStatus === 'verified' ? (
                        <span className="admin-tenant-badge badge-verified">
                          <SiteIcon name="shield-check" size={13} /> Verified Seal
                        </span>
                      ) : tenant.verificationStatus === 'pending_review' ? (
                        <span className="admin-tenant-badge badge-pending">
                          <SiteIcon name="clock" size={13} /> Pending Review
                        </span>
                      ) : (
                        <span className="admin-tenant-badge badge-unverified">
                          Unverified
                        </span>
                      )}
                    </td>

                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.78rem', fontWeight: 650 }}>
                        <span
                          className={`admin-tenant-status-dot ${
                            tenant.status === 'active'
                              ? 'dot-active'
                              : tenant.status === 'restricted'
                                ? 'dot-restricted'
                                : tenant.status === 'suspended'
                                  ? 'dot-suspended'
                                  : tenant.status === 'pending_verification'
                                    ? 'dot-pending'
                                    : 'dot-archived'
                          }`}
                        />
                        <span style={{ textTransform: 'capitalize' }}>
                          {tenant.status === 'pending_verification'
                            ? 'Pending Audit'
                            : tenant.status === 'restricted'
                              ? 'Restricted (Read-Only)'
                              : tenant.status}
                        </span>
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedTenantId(tenant.id)
                        }}
                      >
                        Inspect &amp; Govern →
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Side-Over Inspection & Governance Drawer */}
      {activeTenantDetail && (
        <div className="admin-tenant-drawer-backdrop" onClick={() => setSelectedTenantId(null)}>
          <aside
            className="admin-tenant-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-drawer-tenant-name"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="admin-tenant-drawer-header">
              <div className="admin-tenant-drawer-title-area">
                <span className={`admin-tenant-type-tag type-${activeTenantDetail.tenantType}`}>
                  {activeTenantDetail.tenantType}
                </span>
                <h3 id="admin-drawer-tenant-name" style={{ marginTop: '0.35rem' }}>
                  {activeTenantDetail.name}
                </h3>
                <div className="admin-tenant-drawer-badges">
                  {activeTenantDetail.verificationStatus === 'verified' ? (
                    <span className="admin-tenant-badge badge-verified">
                      <SiteIcon name="shield-check" size={12} /> Verified Sports Org
                    </span>
                  ) : (
                    <span className="admin-tenant-badge badge-pending">
                      <SiteIcon name="clock" size={12} /> {activeTenantDetail.verificationStatus}
                    </span>
                  )}
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Status: <strong style={{ textTransform: 'capitalize', color: activeTenantDetail.status === 'active' ? '#10b981' : activeTenantDetail.status === 'restricted' ? '#f59e0b' : '#f87171' }}>{activeTenantDetail.status}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="admin-drawer-close-btn"
                onClick={() => setSelectedTenantId(null)}
                aria-label="Close tenant drawer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="admin-tenant-drawer-tabs">
              <button
                type="button"
                className={`admin-tenant-drawer-tab-btn ${inspectionTab === 'overview' ? 'is-active' : ''}`}
                onClick={() => setInspectionTab('overview')}
              >
                Overview &amp; Governance
              </button>
              <button
                type="button"
                className={`admin-tenant-drawer-tab-btn ${inspectionTab === 'members' ? 'is-active' : ''}`}
                onClick={() => setInspectionTab('members')}
              >
                Members &amp; Staff ({activeTenantDetail.members.length || activeTenantDetail.staffCount})
              </button>
              <button
                type="button"
                className={`admin-tenant-drawer-tab-btn ${inspectionTab === 'units' ? 'is-active' : ''}`}
                onClick={() => setInspectionTab('units')}
              >
                Units &amp; Branches ({activeTenantDetail.units.length || activeTenantDetail.branchesCount})
              </button>
              <button
                type="button"
                className={`admin-tenant-drawer-tab-btn ${inspectionTab === 'audit' ? 'is-active' : ''}`}
                onClick={() => setInspectionTab('audit')}
              >
                Governance Audit ({activeTenantDetail.auditTrail.length})
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="admin-tenant-drawer-body">
              {inspectionTab === 'overview' && (
                <>
                  {/* Quick Governance Action Strip */}
                  <div className="admin-tenant-detail-card" style={{ borderLeft: '3px solid #38bdf8' }}>
                    <h4 className="admin-tenant-detail-title">
                      <SiteIcon name="shield-check" size={15} /> Platform Administrative Governance
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Enforce KhelGrid platform terms, grant verified organization trust badges, or suspend access in response to trust and safety violations.
                    </p>
                    <div className="admin-tenant-action-buttons">
                      {activeTenantDetail.verificationStatus !== 'verified' && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-verify-action"
                          onClick={() => setActionModal({
                            tenantId: activeTenantDetail.id,
                            tenantName: activeTenantDetail.name,
                            type: 'verify',
                          })}
                        >
                          <SiteIcon name="badge-check" size={14} /> Grant Verified Badge
                        </button>
                      )}

                      {activeTenantDetail.status === 'active' ? (
                        <>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-restrict-action"
                            onClick={() => setActionModal({
                              tenantId: activeTenantDetail.id,
                              tenantName: activeTenantDetail.name,
                              type: 'restrict',
                            })}
                          >
                            <SiteIcon name="alert-triangle" size={14} /> Restrict (Read-Only)
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-suspend-action"
                            onClick={() => setActionModal({
                              tenantId: activeTenantDetail.id,
                              tenantName: activeTenantDetail.name,
                              type: 'suspend',
                            })}
                          >
                            <SiteIcon name="close" size={14} /> Suspend Organisation
                          </button>
                        </>
                      ) : activeTenantDetail.status === 'restricted' ? (
                        <>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-reactivate-action"
                            onClick={() => setActionModal({
                              tenantId: activeTenantDetail.id,
                              tenantName: activeTenantDetail.name,
                              type: 'reactivate',
                            })}
                          >
                            <SiteIcon name="check" size={14} /> Reinstate to Active
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-suspend-action"
                            onClick={() => setActionModal({
                              tenantId: activeTenantDetail.id,
                              tenantName: activeTenantDetail.name,
                              type: 'suspend',
                            })}
                          >
                            <SiteIcon name="close" size={14} /> Escalate to Suspend
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-reactivate-action"
                          onClick={() => setActionModal({
                            tenantId: activeTenantDetail.id,
                            tenantName: activeTenantDetail.name,
                            type: 'reactivate',
                          })}
                        >
                          <SiteIcon name="check" size={14} /> Reinstate to Active
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-btn admin-btn-primary admin-btn-sm"
                        data-testid="inspect-workspace-readonly-btn"
                        onClick={() => handleInspectLiveWorkspace(activeTenantDetail)}
                        title="Open this partner's front-end dashboard in an audit-logged, read-only inspection session"
                      >
                        <SiteIcon name="eye" size={14} /> Inspect Live Workspace (Read-Only)
                      </button>

                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => setActionModal({
                          tenantId: activeTenantDetail.id,
                          tenantName: activeTenantDetail.name,
                          type: 'note',
                        })}
                      >
                        + Add Internal Note
                      </button>
                    </div>
                  </div>

                  {/* Profile & Accreditation Card */}
                  <div className="admin-tenant-detail-card">
                    <h4 className="admin-tenant-detail-title">
                      <SiteIcon name="building" size={15} /> Legal Accreditation &amp; Affiliation
                    </h4>
                    <div className="admin-tenant-grid-2col">
                      <div>
                        <div className="admin-tenant-field-label">Affiliated Federation / Body</div>
                        <div className="admin-tenant-field-val">
                          {activeTenantDetail.accreditationDetails?.federationAffiliation || 'Not Stated'}
                        </div>
                      </div>
                      <div>
                        <div className="admin-tenant-field-label">Accreditation Body</div>
                        <div className="admin-tenant-field-val">
                          {activeTenantDetail.accreditationDetails?.accreditationBody || 'None recorded'}
                        </div>
                      </div>
                      <div>
                        <div className="admin-tenant-field-label">Registration / Deed Ref</div>
                        <div className="admin-tenant-field-val">
                          <code>{activeTenantDetail.accreditationDetails?.regNumber || 'Not Submitted'}</code>
                        </div>
                      </div>
                      <div>
                        <div className="admin-tenant-field-label">Verification Timestamp</div>
                        <div className="admin-tenant-field-val">
                          {activeTenantDetail.accreditationDetails?.verifiedAt
                            ? new Date(activeTenantDetail.accreditationDetails.verifiedAt).toLocaleDateString()
                            : 'Pending'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Primary Details */}
                  <div className="admin-tenant-detail-card">
                    <h4 className="admin-tenant-detail-title">
                      <SiteIcon name="phone" size={15} /> Verified Contact &amp; Geographic Hub
                    </h4>
                    <div className="admin-tenant-grid-2col">
                      <div>
                        <div className="admin-tenant-field-label">Primary City &amp; State</div>
                        <div className="admin-tenant-field-val">
                          {activeTenantDetail.city}, {activeTenantDetail.state}
                        </div>
                      </div>
                      <div>
                        <div className="admin-tenant-field-label">Discipline / Sport</div>
                        <div className="admin-tenant-field-val">{activeTenantDetail.sport}</div>
                      </div>
                      <div>
                        <div className="admin-tenant-field-label">Contact Email</div>
                        <div className="admin-tenant-field-val">{activeTenantDetail.contactEmail}</div>
                      </div>
                      <div>
                        <div className="admin-tenant-field-label">Contact Phone</div>
                        <div className="admin-tenant-field-val">{activeTenantDetail.contactPhone}</div>
                      </div>
                      {activeTenantDetail.upiVpa && (
                        <div>
                          <div className="admin-tenant-field-label">Direct UPI VPA</div>
                          <div className="admin-tenant-field-val"><code>{activeTenantDetail.upiVpa}</code></div>
                        </div>
                      )}
                      <div>
                        <div className="admin-tenant-field-label">Onboarding Date</div>
                        <div className="admin-tenant-field-val">
                          {new Date(activeTenantDetail.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Members Tab */}
              {inspectionTab === 'members' && (
                <div>
                  <h4 className="admin-tenant-detail-title">
                    <SiteIcon name="users" size={15} /> Active Staff &amp; Coaching Members
                  </h4>
                  {activeTenantDetail.members.length === 0 ? (
                    <div className="admin-tenant-detail-card" style={{ textAlign: 'center', color: '#94a3b8' }}>
                      <p>Owner-only managed tenant ({activeTenantDetail.ownerName} &lt;{activeTenantDetail.ownerEmail}&gt;).</p>
                    </div>
                  ) : (
                    activeTenantDetail.members.map(member => (
                      <div key={member.id} className="admin-tenant-member-item">
                        <div className="admin-tenant-member-info">
                          <span className="admin-tenant-member-name">{member.displayName}</span>
                          <span className="admin-tenant-member-email">{member.email}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            Joined: {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="admin-tenant-member-role-badge">
                          {member.role.replace('_', ' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Units / Branches Tab */}
              {inspectionTab === 'units' && (
                <div>
                  <h4 className="admin-tenant-detail-title">
                    <SiteIcon name="map-pin" size={15} /> Physical Facilities &amp; Operating Branches
                  </h4>
                  {activeTenantDetail.units.length === 0 ? (
                    <div className="admin-tenant-detail-card" style={{ textAlign: 'center', color: '#94a3b8' }}>
                      <p>Single main facility located in {activeTenantDetail.city}, {activeTenantDetail.state}.</p>
                    </div>
                  ) : (
                    activeTenantDetail.units.map(unit => (
                      <div key={unit.id} className="admin-tenant-detail-card" style={{ marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 750, color: '#f8fafc', fontSize: '0.86rem' }}>{unit.name}</span>
                          <span className="admin-tenant-sport-tag">{unit.unitType}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>{unit.address}</p>
                        {unit.contactPhone && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                            Phone: {unit.contactPhone}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Audit Log Tab */}
              {inspectionTab === 'audit' && (
                <div className="admin-tenant-audit-list">
                  <h4 className="admin-tenant-detail-title">
                    <SiteIcon name="activity" size={15} /> Administrative Governance Audit Trail
                  </h4>
                  {activeTenantDetail.auditTrail.length === 0 ? (
                    <div className="admin-tenant-detail-card" style={{ textAlign: 'center', color: '#94a3b8' }}>
                      <p>No recorded governance actions for this tenant yet.</p>
                    </div>
                  ) : (
                    activeTenantDetail.auditTrail.map(entry => (
                      <div key={entry.id} className="admin-tenant-audit-card">
                        <div className="admin-tenant-audit-header">
                          <span className="admin-tenant-audit-action">{entry.action}</span>
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="admin-tenant-audit-note">{entry.note}</p>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                          By: {entry.operatorEmail}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Governance Confirmation Modal */}
      {actionModal && (
        <div className="admin-tenant-modal-backdrop" onClick={() => setActionModal(null)}>
          <div
            className="admin-tenant-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-action-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-tenant-modal-header">
              <h3 id="admin-action-modal-title">
                {actionModal.type === 'verify' && 'Grant Verified Organization Seal'}
                {actionModal.type === 'restrict' && 'Restrict Organisation (Read-Only Mode)'}
                {actionModal.type === 'suspend' && 'Suspend Tenant Organisation'}
                {actionModal.type === 'reactivate' && 'Reinstate Tenant to Active'}
                {actionModal.type === 'note' && 'Record Administrative Internal Note'}
              </h3>
              <button
                type="button"
                className="admin-drawer-close-btn"
                onClick={() => setActionModal(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="admin-tenant-modal-body">
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1' }}>
                Organisation: <strong>{actionModal.tenantName}</strong>
              </p>

              {actionModal.type === 'verify' && (
                <>
                  <label style={{ fontSize: '0.78rem', fontWeight: 650, color: '#94a3b8' }}>
                    Accreditation Body / Federation Reference:
                    <input
                      type="text"
                      className="admin-tenant-search-input"
                      placeholder="e.g. DDCA Registered Academy / KSFA Ground Standard"
                      value={accreditationBody}
                      onChange={e => setAccreditationBody(e.target.value)}
                      style={{ marginTop: '0.35rem' }}
                    />
                  </label>
                  <label style={{ fontSize: '0.78rem', fontWeight: 650, color: '#94a3b8' }}>
                    Verification Findings &amp; Document Review Notes:
                    <textarea
                      className="admin-tenant-textarea"
                      placeholder="Specify verification documents inspected (affiliation letter, ground lease, coach certificates)…"
                      value={actionNote}
                      onChange={e => setActionNote(e.target.value)}
                      style={{ marginTop: '0.35rem' }}
                    />
                  </label>
                </>
              )}

              {actionModal.type === 'restrict' && (
                <label style={{ fontSize: '0.78rem', fontWeight: 650, color: '#f59e0b' }}>
                  Compliance Restriction Notice (Displayed in Partner Dashboard):
                  <textarea
                    className="admin-tenant-textarea"
                    placeholder="Specify what documents or corrective actions are required before lifting read-only mode…"
                    value={actionNote}
                    onChange={e => setActionNote(e.target.value)}
                    style={{ marginTop: '0.35rem' }}
                  />
                </label>
              )}

              {actionModal.type === 'suspend' && (
                <label style={{ fontSize: '0.78rem', fontWeight: 650, color: '#f87171' }}>
                  Suspension Reason &amp; Policy Violation (Required):
                  <textarea
                    className="admin-tenant-textarea"
                    placeholder="Specify the safety violation, fraudulent listing, or non-compliance reason…"
                    value={actionNote}
                    onChange={e => setActionNote(e.target.value)}
                    style={{ marginTop: '0.35rem' }}
                  />
                </label>
              )}

              {actionModal.type === 'reactivate' && (
                <label style={{ fontSize: '0.78rem', fontWeight: 650, color: '#94a3b8' }}>
                  Reinstatement Note:
                  <textarea
                    className="admin-tenant-textarea"
                    placeholder="Document that corrective actions or inspections have been completed…"
                    value={actionNote}
                    onChange={e => setActionNote(e.target.value)}
                    style={{ marginTop: '0.35rem' }}
                  />
                </label>
              )}

              {actionModal.type === 'note' && (
                <label style={{ fontSize: '0.78rem', fontWeight: 650, color: '#94a3b8' }}>
                  Internal Governance Note:
                  <textarea
                    className="admin-tenant-textarea"
                    placeholder="Add operational notes or compliance memos visible only to KhelGrid administrators…"
                    value={actionNote}
                    onChange={e => setActionNote(e.target.value)}
                    style={{ marginTop: '0.35rem' }}
                  />
                </label>
              )}
            </div>

            <div className="admin-tenant-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setActionModal(null)}
              >
                Cancel
              </button>
              {actionModal.type === 'suspend' && (
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  data-testid="propose-tenant-suspend-mc-btn"
                  onClick={handleProposeSuspendDualControl}
                >
                  <SiteIcon name="shield-check" size={14} /> Submit for Dual-Control Approval
                </button>
              )}
              <button
                type="button"
                className={`admin-btn ${
                  actionModal.type === 'suspend'
                    ? 'admin-btn-reject'
                    : actionModal.type === 'restrict'
                      ? 'admin-btn-restrict-action'
                      : actionModal.type === 'verify'
                        ? 'admin-btn-verify-action'
                        : 'admin-btn-primary'
                }`}
                onClick={handleExecuteAction}
              >
                {actionModal.type === 'verify' && 'Confirm Verification'}
                {actionModal.type === 'restrict' && 'Confirm Restriction'}
                {actionModal.type === 'suspend' && 'Confirm Suspension'}
                {actionModal.type === 'reactivate' && 'Confirm Reinstatement'}
                {actionModal.type === 'note' && 'Save Internal Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
