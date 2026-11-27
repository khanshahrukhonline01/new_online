import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  subscribeRegulatoryState,
  type PartnerComplianceSeverity,
} from '../../../../src/shared/governance/regulatoryBridge'
import {
  clearPartnerComplianceNotice,
  issuePartnerComplianceNoticeFromInbox,
  loadUnifiedRegulatoryInbox,
  type InboxPartnerRole,
  type RegulatoryInboxItem,
  type RegulatoryInboxSourceDesk,
  type SlaStatus,
  type UnifiedRegulatoryInboxSnapshot,
} from '../services/adminRegulatoryInboxService'
import type { AdminDeskDeepLink } from '../services/adminGlobalSearchService'
import {
  listQueueClaims,
  type QueueRecordClaim,
} from '../services/adminQueueWorkflowService'
import { AdminSavedViewsBar } from './AdminSavedViewsBar'
import {
  AdminAssigneeFilterBar,
  AdminQueueClaimControl,
  type AssigneeFilterValue,
} from './AdminQueueClaimControl'
import type { AdminWorkspaceTab } from './AdminSidebar'
import './AdminRegulatoryInboxDesk.css'

export interface AdminRegulatoryInboxDeskProps {
  operatorEmail?: string
  onJumpToWorkspace?: (tab: AdminWorkspaceTab) => void
  deepLink?: AdminDeskDeepLink | null
}

const DESK_FILTER_OPTIONS: Array<{ id: 'all' | RegulatoryInboxSourceDesk; label: string }> = [
  { id: 'all', label: 'All Desks' },
  { id: 'moderation_desk', label: 'Listing Moderation' },
  { id: 'verification_vault', label: 'Verification Vault' },
  { id: 'fraud_disputes', label: 'Trust & Safety' },
  { id: 'tenant_governance', label: 'Tenant Governance' },
]

const ROLE_LABELS: Record<InboxPartnerRole, string> = {
  academy: 'Academy',
  coach: 'Coach',
  venue: 'Venue / Turf',
  tournament: 'Tournament',
  athlete: 'Athlete',
  other: 'Organisation',
}

export function AdminRegulatoryInboxDesk({
  operatorEmail = 'admin@khelgrid.com',
  onJumpToWorkspace,
  deepLink = null,
}: AdminRegulatoryInboxDeskProps) {
  const [snapshot, setSnapshot] = useState<UnifiedRegulatoryInboxSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deskFilter, setDeskFilter] = useState<'all' | RegulatoryInboxSourceDesk>('all')
  const [slaFilter, setSlaFilter] = useState<'all' | SlaStatus>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | InboxPartnerRole>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilterValue>('all')
  const [claims, setClaims] = useState<QueueRecordClaim[]>(() => listQueueClaims('regulatory_inbox'))
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Live Compliance Notice Modal State
  const [noticeModalItem, setNoticeModalItem] = useState<RegulatoryInboxItem | null>(null)
  const [noticeSeverity, setNoticeSeverity] =
    useState<Exclude<PartnerComplianceSeverity, 'resolved'>>('action_required')
  const [noticeHeadline, setNoticeHeadline] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [noticeDueHours, setNoticeDueHours] = useState<number>(48)

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setToastMessage(null), 3500)
    }
  }, [])

  const refreshInbox = useCallback(async () => {
    setIsLoading(true)
    try {
      const next = await loadUnifiedRegulatoryInbox()
      setSnapshot(next)
      setClaims(listQueueClaims('regulatory_inbox'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshInbox()
    return subscribeRegulatoryState(() => {
      void refreshInbox()
    })
  }, [refreshInbox])

  const applySavedFilters = useCallback(
    (filters: Record<string, string>, viewName?: string) => {
      setDeskFilter((filters.desk as 'all' | RegulatoryInboxSourceDesk) || 'all')
      setSlaFilter((filters.sla as 'all' | SlaStatus) || 'all')
      setRoleFilter((filters.role as 'all' | InboxPartnerRole) || 'all')
      setAssigneeFilter(filters.assignee || 'all')
      setSearchQuery(filters.search || '')
      if (viewName) {
        showToast(`Applied saved view "${viewName}".`)
      }
    },
    [showToast],
  )

  useEffect(() => {
    if (!deepLink || deepLink.workspace !== 'regulatory_inbox') return
    if (deepLink.savedViewFilters) {
      applySavedFilters(deepLink.savedViewFilters)
      return
    }
    if (deepLink.query) {
      setSearchQuery(deepLink.query)
    }
  }, [deepLink, applySavedFilters])

  const claimByRecordId = useMemo(() => {
    const map = new Map<string, QueueRecordClaim>()
    for (const c of claims) {
      map.set(c.recordId, c)
    }
    return map
  }, [claims])

  const filteredItems = useMemo(() => {
    if (!snapshot) return []
    const q = searchQuery.trim().toLowerCase()
    return snapshot.items.filter(item => {
      if (deskFilter !== 'all' && item.sourceDesk !== deskFilter) return false
      if (slaFilter !== 'all' && item.slaStatus !== slaFilter) return false
      if (roleFilter !== 'all' && item.partnerRole !== roleFilter) return false
      if (assigneeFilter !== 'all') {
        const claim = claimByRecordId.get(item.id)
        if (assigneeFilter === 'unclaimed' && claim) return false
        if (
          assigneeFilter === 'mine' &&
          (!claim || claim.claimedBy.toLowerCase() !== operatorEmail.toLowerCase())
        ) {
          return false
        }
        if (
          assigneeFilter !== 'unclaimed' &&
          assigneeFilter !== 'mine' &&
          (!claim || claim.claimedBy.toLowerCase() !== assigneeFilter.toLowerCase())
        ) {
          return false
        }
      }
      if (q) {
        const matches =
          item.referenceCode.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.entityName.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          (item.sport && item.sport.toLowerCase().includes(q))
        if (!matches) return false
      }
      return true
    })
  }, [
    snapshot,
    searchQuery,
    deskFilter,
    slaFilter,
    roleFilter,
    assigneeFilter,
    claimByRecordId,
    operatorEmail,
  ])

  const openNoticeModal = (item: RegulatoryInboxItem) => {
    setNoticeModalItem(item)
    setNoticeSeverity(item.slaStatus === 'breached' ? 'action_required' : 'warning')
    setNoticeHeadline(
      item.missingChecklistLabels && item.missingChecklistLabels.length > 0
        ? `Compliance Documents Required (${item.referenceCode})`
        : `Regulatory Action Required · ${item.entityName}`,
    )
    setNoticeMessage(
      item.missingChecklistLabels && item.missingChecklistLabels.length > 0
        ? `Please upload the following mandatory items to keep your KhelGrid listing active: ${item.missingChecklistLabels.join('; ')}.`
        : `${item.summary} Please review and respond via your KhelGrid partner dashboard.`,
    )
    setNoticeDueHours(item.slaStatus === 'breached' ? 24 : 48)
  }

  const handleDispatchNotice = () => {
    if (!noticeModalItem || !noticeMessage.trim()) return
    issuePartnerComplianceNoticeFromInbox({
      item: noticeModalItem,
      severity: noticeSeverity,
      headline: noticeHeadline.trim(),
      message: noticeMessage.trim(),
      dueInHours: noticeDueHours,
      operatorEmail,
    })
    showToast(
      `Live compliance banner dispatched to ${noticeModalItem.entityName} (${ROLE_LABELS[noticeModalItem.partnerRole]} workspace).`,
    )
    setNoticeModalItem(null)
    void refreshInbox()
  }

  const handleResolveNotice = (id: string, entityName: string) => {
    clearPartnerComplianceNotice(id, operatorEmail)
    showToast(`Compliance banner cleared for ${entityName}.`)
    void refreshInbox()
  }

  const metrics = snapshot?.metrics ?? {
    totalActionable: 0,
    breachedCount: 0,
    atRiskCount: 0,
    onTrackCount: 0,
    activePartnerNoticesCount: 0,
    byDesk: {
      moderation_desk: 0,
      verification_vault: 0,
      fraud_disputes: 0,
      tenant_governance: 0,
    },
  }

  return (
    <div className="admin-inbox-root" data-testid="admin-regulatory-inbox-desk">
      {/* Header */}
      <header className="admin-inbox-header">
        <div>
          <div className="admin-inbox-eyebrow">
            <SiteIcon name="bell" size={14} />
            <span>KhelGrid Operations · Unified Regulatory Control</span>
          </div>
          <h1 className="admin-inbox-title">Unified Regulatory Inbox &amp; SLA Command</h1>
          <p className="admin-inbox-subtitle">
            Every pending listing review, credential dossier, trust incident, and tenant compliance hold
            in one SLA-prioritized queue. Dispatch live compliance banners straight to partner dashboards.
          </p>
        </div>

        <div className="admin-inbox-header-actions">
          <button
            type="button"
            className="admin-inbox-btn"
            onClick={() => void refreshInbox()}
            disabled={isLoading}
          >
            <SiteIcon name="refresh" size={14} />
            <span>{isLoading ? 'Syncing…' : 'Refresh SLA Queue'}</span>
          </button>
        </div>
      </header>

      {/* 4-Card SLA KPI Strip */}
      <section className="admin-inbox-kpi-grid" aria-label="Regulatory SLA Metrics">
        <div className="admin-inbox-kpi-card is-total">
          <div className="admin-inbox-kpi-icon">
            <SiteIcon name="activity" size={18} />
          </div>
          <div className="admin-inbox-kpi-meta">
            <span className="admin-inbox-kpi-val" data-testid="inbox-kpi-total">
              {metrics.totalActionable}
            </span>
            <span className="admin-inbox-kpi-label">Total Actionable</span>
          </div>
        </div>

        <div className="admin-inbox-kpi-card is-breached">
          <div className="admin-inbox-kpi-icon">
            <SiteIcon name="alert-triangle" size={18} />
          </div>
          <div className="admin-inbox-kpi-meta">
            <span className="admin-inbox-kpi-val" data-testid="inbox-kpi-breached">
              {metrics.breachedCount}
            </span>
            <span className="admin-inbox-kpi-label">SLA Breached</span>
          </div>
        </div>

        <div className="admin-inbox-kpi-card is-at-risk">
          <div className="admin-inbox-kpi-icon">
            <SiteIcon name="clock" size={18} />
          </div>
          <div className="admin-inbox-kpi-meta">
            <span className="admin-inbox-kpi-val" data-testid="inbox-kpi-at-risk">
              {metrics.atRiskCount}
            </span>
            <span className="admin-inbox-kpi-label">Due Soon (At Risk)</span>
          </div>
        </div>

        <div className="admin-inbox-kpi-card is-notices">
          <div className="admin-inbox-kpi-icon">
            <SiteIcon name="bell" size={18} />
          </div>
          <div className="admin-inbox-kpi-meta">
            <span className="admin-inbox-kpi-val" data-testid="inbox-kpi-notices">
              {metrics.activePartnerNoticesCount}
            </span>
            <span className="admin-inbox-kpi-label">Live Partner Banners</span>
          </div>
        </div>
      </section>

      {/* Saved Filter Views & Moderator Workload */}
      <AdminSavedViewsBar
        desk="regulatory_inbox"
        currentFilters={{
          desk: deskFilter,
          sla: slaFilter,
          role: roleFilter,
          assignee: assigneeFilter,
          search: searchQuery,
        }}
        onApplyFilters={applySavedFilters}
        onResetFilters={() => {
          setSearchQuery('')
          setDeskFilter('all')
          setSlaFilter('all')
          setRoleFilter('all')
          setAssigneeFilter('all')
        }}
        operatorEmail={operatorEmail}
      />

      {/* Faceted Filters */}
      <section className="admin-inbox-filters-card" aria-label="Regulatory Inbox Filters">
        <AdminAssigneeFilterBar
          desk="regulatory_inbox"
          claims={claims}
          operatorEmail={operatorEmail}
          value={assigneeFilter}
          onChange={setAssigneeFilter}
        />
        <div className="admin-inbox-filter-row">
          <span className="admin-inbox-filter-label">Source Desk:</span>
          {DESK_FILTER_OPTIONS.map(opt => {
            const count =
              opt.id === 'all' ? metrics.totalActionable : metrics.byDesk[opt.id]
            return (
              <button
                key={opt.id}
                type="button"
                className={`admin-inbox-tab-chip ${deskFilter === opt.id ? 'is-active' : ''}`}
                onClick={() => setDeskFilter(opt.id)}
              >
                <span>{opt.label}</span>
                <span className="admin-inbox-chip-count">({count})</span>
              </button>
            )
          })}
        </div>

        <div className="admin-inbox-controls-row">
          <div className="admin-inbox-search-wrap">
            <span className="admin-inbox-search-icon" aria-hidden="true">
              <SiteIcon name="search" size={15} />
            </span>
            <input
              type="search"
              className="admin-inbox-search-input"
              placeholder="Search ref code, academy, turf, coach, city, or missing checklist item…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search unified regulatory inbox"
            />
          </div>

          <select
            className="admin-inbox-select"
            value={slaFilter}
            onChange={e => setSlaFilter(e.target.value as 'all' | SlaStatus)}
            aria-label="Filter by SLA status"
          >
            <option value="all">All SLA States</option>
            <option value="breached">SLA Breached</option>
            <option value="at_risk">At Risk (Due Soon)</option>
            <option value="on_track">On Track</option>
          </select>

          <select
            className="admin-inbox-select"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as 'all' | InboxPartnerRole)}
            aria-label="Filter by partner role"
          >
            <option value="all">All Partner Roles</option>
            <option value="academy">Academy</option>
            <option value="coach">Coach</option>
            <option value="venue">Venue / Turf</option>
            <option value="tournament">Tournament</option>
            <option value="athlete">Athlete</option>
          </select>

          {(searchQuery || deskFilter !== 'all' || slaFilter !== 'all' || roleFilter !== 'all' || assigneeFilter !== 'all') && (
            <button
              type="button"
              className="admin-inbox-btn"
              onClick={() => {
                setSearchQuery('')
                setDeskFilter('all')
                setSlaFilter('all')
                setRoleFilter('all')
                setAssigneeFilter('all')
              }}
            >
              <SiteIcon name="close" size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* SLA-Prioritized Queue Table */}
      <section className="admin-inbox-table-card" aria-label="Unified Regulatory Queue">
        <div className="admin-inbox-table-head-bar">
          <h2 className="admin-inbox-section-title">
            <SiteIcon name="shield-check" size={16} />
            <span>Actionable Governance Queue ({filteredItems.length})</span>
          </h2>
          <span className="admin-inbox-section-meta">
            Sorted automatically: SLA Breached → At Risk → On Track
          </span>
        </div>

        <div className="admin-inbox-table-wrap">
          <table className="admin-inbox-table" data-testid="regulatory-inbox-table">
            <thead>
              <tr>
                <th>Ref &amp; Desk</th>
                <th>Entity &amp; Partner Role</th>
                <th>Status &amp; Regulatory Summary</th>
                <th>SLA Window</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-inbox-empty">
                    No actionable items match the selected SLA or desk filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} data-testid="regulatory-inbox-row">
                    <td>
                      <div className="admin-inbox-ref-cell">
                        <span className="admin-inbox-ref-code">{item.referenceCode}</span>
                        <span className="admin-inbox-desk-tag">{item.sourceLabel}</span>
                      </div>
                    </td>

                    <td>
                      <div className="admin-inbox-entity-cell">
                        <span className="admin-inbox-entity-title">{item.title}</span>
                        <span className="admin-inbox-entity-sub">
                          {item.entityName} · {ROLE_LABELS[item.partnerRole]} · {item.city}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="admin-inbox-summary-cell">
                        <span className="admin-inbox-status-text">{item.statusLabel}</span>
                        <span className="admin-inbox-summary-text">{item.summary}</span>
                        {item.hasActiveNotice && (
                          <span className="admin-inbox-notice-active-tag">
                            <SiteIcon name="bell" size={11} />
                            <span>Live Banner Active on Partner Dashboard</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className={`admin-inbox-sla-badge is-${item.slaStatus}`}>
                        <SiteIcon
                          name={
                            item.slaStatus === 'breached'
                              ? 'alert-triangle'
                              : item.slaStatus === 'at_risk'
                                ? 'clock'
                                : 'check-circle'
                          }
                          size={12}
                        />
                        <span>{item.slaRemainingLabel}</span>
                      </span>
                      <span className="admin-inbox-sla-target">
                        Target SLA: {item.slaTargetHours}h
                      </span>
                    </td>

                    <td>
                      <div className="admin-inbox-actions">
                        <AdminQueueClaimControl
                          desk="regulatory_inbox"
                          recordId={item.id}
                          referenceCode={item.referenceCode}
                          recordTitle={item.title}
                          operatorEmail={operatorEmail}
                          claim={claimByRecordId.get(item.id) ?? null}
                          compact
                          onChanged={() => setClaims(listQueueClaims('regulatory_inbox'))}
                        />
                        <button
                          type="button"
                          className="admin-inbox-btn admin-inbox-btn-warning"
                          onClick={() => openNoticeModal(item)}
                          data-testid={`send-notice-${item.referenceCode}`}
                        >
                          <SiteIcon name="bell" size={13} />
                          <span>{item.hasActiveNotice ? 'Update Notice' : 'Send Notice'}</span>
                        </button>

                        {onJumpToWorkspace && (
                          <button
                            type="button"
                            className="admin-inbox-btn"
                            onClick={() => onJumpToWorkspace(item.sourceDesk)}
                          >
                            <span>Open Desk</span>
                            <SiteIcon name="arrow-up-right" size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active Partner Compliance Banners Ledger */}
      <section
        className="admin-inbox-notices-panel"
        aria-label="Active Partner Compliance Banners"
        data-testid="active-compliance-notices-panel"
      >
        <div className="admin-inbox-table-head-bar">
          <h2 className="admin-inbox-section-title">
            <SiteIcon name="flag" size={16} />
            <span>
              Live Partner Compliance Banners ({snapshot?.activeAdvisories.length ?? 0})
            </span>
          </h2>
          <span className="admin-inbox-section-meta">
            Displayed in real time inside front-end partner dashboards until resolved
          </span>
        </div>

        <div className="admin-inbox-notices-list">
          {!snapshot || snapshot.activeAdvisories.length === 0 ? (
            <div className="admin-inbox-empty">
              No active partner compliance notices. Send a notice from the queue above or request
              document corrections from the Verification Vault to alert a partner live.
            </div>
          ) : (
            snapshot.activeAdvisories.map(advisory => (
              <div key={advisory.id} className="admin-inbox-notice-row">
                <div className="admin-inbox-notice-main">
                  <div className="admin-inbox-notice-meta">
                    <span className={`admin-inbox-sev-tag is-${advisory.severity}`}>
                      {advisory.severity.replace(/_/g, ' ')}
                    </span>
                    <span className="admin-inbox-ref-code">{advisory.referenceCode}</span>
                    <span>Target: {advisory.targetPersona.toUpperCase()} Workspace</span>
                    <span>· {advisory.entityName}</span>
                    <span>· Issued by {advisory.issuedBy}</span>
                  </div>
                  <span className="admin-inbox-notice-headline">{advisory.headline}</span>
                  <p className="admin-inbox-notice-msg">{advisory.message}</p>
                </div>

                <button
                  type="button"
                  className="admin-inbox-btn admin-inbox-btn-success"
                  onClick={() => handleResolveNotice(advisory.id, advisory.entityName)}
                  data-testid={`resolve-notice-${advisory.referenceCode}`}
                >
                  <SiteIcon name="check-circle" size={14} />
                  <span>Resolve &amp; Clear</span>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Send Live Compliance Notice Modal */}
      {noticeModalItem && (
        <div
          className="admin-inbox-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inbox-notice-modal-title"
          onClick={() => setNoticeModalItem(null)}
        >
          <div className="admin-inbox-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-inbox-modal-header">
              <h3 id="inbox-notice-modal-title" className="admin-inbox-modal-title">
                Dispatch Live Partner Compliance Banner
              </h3>
              <button
                type="button"
                className="admin-inbox-modal-close"
                onClick={() => setNoticeModalItem(null)}
                aria-label="Close compliance notice modal"
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            <div className="admin-inbox-modal-body">
              <div className="admin-inbox-modal-context">
                <strong>{noticeModalItem.entityName}</strong> ({noticeModalItem.referenceCode}) ·
                Will appear immediately in the{' '}
                <strong>{ROLE_LABELS[noticeModalItem.partnerRole]}</strong> front-end dashboard.
              </div>

              <div className="admin-inbox-field">
                <label htmlFor="inbox-notice-severity">Banner Severity</label>
                <select
                  id="inbox-notice-severity"
                  className="admin-inbox-modal-select"
                  value={noticeSeverity}
                  onChange={e =>
                    setNoticeSeverity(
                      e.target.value as Exclude<PartnerComplianceSeverity, 'resolved'>,
                    )
                  }
                >
                  <option value="action_required">Action Required (Red Compliance Banner)</option>
                  <option value="warning">Compliance Warning (Amber Advisory)</option>
                  <option value="expiring_soon">Credential Expiring Soon (Renewal Notice)</option>
                </select>
              </div>

              <div className="admin-inbox-field">
                <label htmlFor="inbox-notice-headline">Banner Headline</label>
                <input
                  id="inbox-notice-headline"
                  type="text"
                  className="admin-inbox-input"
                  value={noticeHeadline}
                  onChange={e => setNoticeHeadline(e.target.value)}
                />
              </div>

              <div className="admin-inbox-field">
                <label htmlFor="inbox-notice-message">Partner Action Instructions *</label>
                <textarea
                  id="inbox-notice-message"
                  className="admin-inbox-textarea"
                  rows={4}
                  value={noticeMessage}
                  onChange={e => setNoticeMessage(e.target.value)}
                />
              </div>

              <div className="admin-inbox-field">
                <label htmlFor="inbox-notice-due">Response Deadline Window</label>
                <select
                  id="inbox-notice-due"
                  className="admin-inbox-modal-select"
                  value={noticeDueHours}
                  onChange={e => setNoticeDueHours(Number(e.target.value))}
                >
                  <option value={24}>24 Hours (Urgent)</option>
                  <option value={48}>48 Hours (Standard)</option>
                  <option value={72}>72 Hours</option>
                  <option value={168}>7 Days</option>
                </select>
              </div>
            </div>

            <div className="admin-inbox-modal-footer">
              <button
                type="button"
                className="admin-inbox-btn"
                onClick={() => setNoticeModalItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-inbox-btn admin-inbox-btn-primary"
                disabled={!noticeMessage.trim()}
                onClick={handleDispatchNotice}
                data-testid="confirm-dispatch-compliance-notice"
              >
                <SiteIcon name="bell" size={14} />
                <span>Publish Live to Partner Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="admin-inbox-toast" role="status">
          <SiteIcon name="check-circle" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}

export default AdminRegulatoryInboxDesk
