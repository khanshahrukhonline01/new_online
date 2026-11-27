import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import { subscribeRegulatoryState } from '../../../../src/shared/governance/regulatoryBridge'
import {
  exportRegulatoryComplianceBundleJson,
  exportRegulatoryComplianceCsv,
  getRegulatoryComplianceSnapshot,
  updateDsarRequestStatus,
  updateMinorSafeguardStatus,
  updateStatutoryGrievanceStatus,
  type DsarRequestRecord,
  type MinorSafeguardRecord,
  type RegulatoryComplianceSnapshot,
  type StatutoryGrievanceRecord,
} from '../services/adminRegulatoryComplianceService'
import type { AdminDeskDeepLink } from '../services/adminGlobalSearchService'
import { AdminSavedViewsBar } from './AdminSavedViewsBar'
import './AdminRegulatoryComplianceDesk.css'

export type RegulatoryComplianceTab =
  | 'dpdp_dsar'
  | 'minor_safeguards'
  | 'grievance_officer'
  | 'readiness_pack'

export interface AdminRegulatoryComplianceDeskProps {
  operatorEmail?: string
  deepLink?: AdminDeskDeepLink | null
}

function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDeadline(iso?: string): { text: string; isOverdue: boolean } {
  if (!iso) return { text: 'No expiry', isOverdue: false }
  const diffHours = Math.round((Date.parse(iso) - Date.now()) / 3_600_000)
  if (!Number.isFinite(diffHours)) return { text: iso.slice(0, 10), isOverdue: false }
  if (diffHours <= 0) {
    const absH = Math.abs(diffHours)
    return {
      text: absH >= 48 ? `Overdue by ${Math.round(absH / 24)}d` : `Overdue by ${Math.max(1, absH)}h`,
      isOverdue: true,
    }
  }
  return {
    text: diffHours >= 48 ? `Due in ${Math.round(diffHours / 24)}d` : `Due in ${diffHours}h`,
    isOverdue: false,
  }
}

export function AdminRegulatoryComplianceDesk({
  operatorEmail = 'dpo@khelgrid.com',
  deepLink = null,
}: AdminRegulatoryComplianceDeskProps) {
  const [snapshot, setSnapshot] = useState<RegulatoryComplianceSnapshot>(() =>
    getRegulatoryComplianceSnapshot(),
  )
  const [activeTab, setActiveTab] = useState<RegulatoryComplianceTab>('dpdp_dsar')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [toast, setToast] = useState<string | null>(null)
  const [actionNoteDraft, setActionNoteDraft] = useState('')
  const [selectedDsar, setSelectedDsar] = useState<DsarRequestRecord | null>(null)
  const [selectedSafeguard, setSelectedSafeguard] = useState<MinorSafeguardRecord | null>(null)
  const [selectedGrievance, setSelectedGrievance] = useState<StatutoryGrievanceRecord | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setToast(null), 3500)
    }
  }, [])

  const reloadSnapshot = useCallback(() => {
    setSnapshot(getRegulatoryComplianceSnapshot())
  }, [])

  useEffect(() => {
    reloadSnapshot()
    return subscribeRegulatoryState(reloadSnapshot)
  }, [reloadSnapshot])

  useEffect(() => {
    if (!deepLink || deepLink.workspace !== 'regulatory_compliance') return
    if (
      deepLink.tab === 'dpdp_dsar' ||
      deepLink.tab === 'minor_safeguards' ||
      deepLink.tab === 'grievance_officer' ||
      deepLink.tab === 'readiness_pack'
    ) {
      setActiveTab(deepLink.tab)
    }
    if (deepLink.savedViewFilters) {
      const f = deepLink.savedViewFilters
      if (
        f.tab === 'dpdp_dsar' ||
        f.tab === 'minor_safeguards' ||
        f.tab === 'grievance_officer' ||
        f.tab === 'readiness_pack'
      ) {
        setActiveTab(f.tab)
      }
      setStatusFilter(f.status || 'all')
      setSearchQuery(f.q || '')
    } else if (deepLink.query) {
      setSearchQuery(deepLink.query)
    }
  }, [deepLink])

  const filteredDsar = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return snapshot.dsarRequests.filter(item => {
      if (statusFilter === 'open' && (item.status === 'fulfilled' || item.status === 'rejected')) {
        return false
      }
      if (statusFilter !== 'all' && statusFilter !== 'open' && item.status !== statusFilter) {
        return false
      }
      if (q) {
        const hay = `${item.referenceCode} ${item.subjectName} ${item.subjectEmail} ${item.requestType} ${item.summary}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [snapshot.dsarRequests, searchQuery, statusFilter])

  const filteredSafeguards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return snapshot.minorSafeguards.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (q) {
        const hay = `${item.referenceCode} ${item.entityName} ${item.city} ${item.sport} ${item.checkType} ${item.documentReference}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [snapshot.minorSafeguards, searchQuery, statusFilter])

  const filteredGrievances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return snapshot.grievances.filter(item => {
      if (statusFilter === 'open' && (item.status === 'resolved' || item.status === 'takedown_enforced')) {
        return false
      }
      if (statusFilter !== 'all' && statusFilter !== 'open' && item.status !== statusFilter) {
        return false
      }
      if (q) {
        const hay = `${item.referenceCode} ${item.targetEntityName} ${item.complainantName} ${item.statutoryFramework} ${item.summary}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [snapshot.grievances, searchQuery, statusFilter])

  const handleExportCsv = () => {
    const csv = exportRegulatoryComplianceCsv(snapshot)
    triggerFileDownload(
      csv,
      `khelgrid-regulatory-registers-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;',
    )
    showToast('Exported DPDP, Minor Safeguards, and Grievance Officer registers (.csv).')
  }

  const handleExportJson = () => {
    const json = exportRegulatoryComplianceBundleJson(snapshot, operatorEmail)
    triggerFileDownload(
      json,
      `khelgrid-statutory-compliance-bundle-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;',
    )
    showToast('Exported signed Statutory Compliance Audit Pack (.json).')
  }

  const { metrics } = snapshot

  return (
    <div className="admin-reg-root" data-testid="admin-regulatory-compliance-desk">
      <header className="admin-reg-header">
        <div>
          <p className="admin-reg-kicker">
            Statutory Compliance · DPDP Act 2023 · IT Rules 2021 · POSH &amp; POCSO · NADA
          </p>
          <h1 className="admin-reg-title">Regulatory Compliance &amp; Statutory Registers</h1>
          <p className="admin-reg-subtitle">
            Manage data subject rights (DSAR), U-18 guardian consent &amp; SafeSport clearances,
            Grievance Officer takedowns, and exportable regulatory audit bundles.
          </p>
        </div>

        <div className="admin-reg-header-actions">
          <button
            type="button"
            className="admin-reg-btn"
            onClick={handleExportCsv}
            data-testid="reg-export-csv-btn"
          >
            <SiteIcon name="download" size={14} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="admin-reg-btn is-primary"
            onClick={handleExportJson}
            data-testid="reg-export-json-btn"
          >
            <SiteIcon name="shield-check" size={14} />
            <span>Compliance Pack (.json)</span>
          </button>
        </div>
      </header>

      {toast && (
        <div className="admin-reg-toast" role="status">
          <SiteIcon name="check-circle" size={15} />
          <span>{toast}</span>
        </div>
      )}

      {/* 4-Column Statutory KPI Strip */}
      <section className="admin-reg-kpi-grid" aria-label="Regulatory Compliance KPIs">
        <div className="admin-reg-kpi-card">
          <span className="admin-reg-kpi-label">Open DPDP DSARs</span>
          <strong className="admin-reg-kpi-val tabular-nums" data-testid="reg-kpi-dsar">
            {metrics.openDsarCount}
          </strong>
          <span className="admin-reg-kpi-meta tabular-nums">
            {metrics.overdueDsarCount > 0
              ? `${metrics.overdueDsarCount} overdue statutory window`
              : 'All within statutory SLA'}
          </span>
        </div>
        <div className="admin-reg-kpi-card">
          <span className="admin-reg-kpi-label">Youth &amp; Minor Safeguards</span>
          <strong className="admin-reg-kpi-val tabular-nums" data-testid="reg-kpi-safeguards">
            {metrics.pendingSafeguardsCount}
          </strong>
          <span className="admin-reg-kpi-meta tabular-nums">
            Pending Sec. 9 / PCC / POSH ICC checks
          </span>
        </div>
        <div className="admin-reg-kpi-card">
          <span className="admin-reg-kpi-label">Grievance &amp; IPR Queue</span>
          <strong className="admin-reg-kpi-val tabular-nums" data-testid="reg-kpi-grievances">
            {metrics.openGrievancesCount}
          </strong>
          <span className="admin-reg-kpi-meta tabular-nums">
            {metrics.unacknowledgedGrievancesCount} awaiting 24h IT Rules ack
          </span>
        </div>
        <div className="admin-reg-kpi-card">
          <span className="admin-reg-kpi-label">Statutory Readiness</span>
          <strong className="admin-reg-kpi-val tabular-nums" data-testid="reg-kpi-readiness">
            {metrics.overallReadinessScore}%
          </strong>
          <span className="admin-reg-kpi-meta">5 statutory frameworks monitored</span>
        </div>
      </section>

      <AdminSavedViewsBar
        desk="regulatory_compliance"
        operatorEmail={operatorEmail}
        currentFilters={{ tab: activeTab, status: statusFilter, q: searchQuery }}
        onApplyFilters={filters => {
          if (
            filters.tab === 'dpdp_dsar' ||
            filters.tab === 'minor_safeguards' ||
            filters.tab === 'grievance_officer' ||
            filters.tab === 'readiness_pack'
          ) {
            setActiveTab(filters.tab)
          }
          setStatusFilter(filters.status || 'all')
          setSearchQuery(filters.q || '')
        }}
        onResetFilters={() => {
          setStatusFilter('all')
          setSearchQuery('')
        }}
      />

      {/* Segmented Regulatory Module Tabs */}
      <div className="admin-reg-toolbar">
        <div className="admin-reg-tabs" role="tablist" aria-label="Regulatory compliance modules">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dpdp_dsar'}
            className={`admin-reg-tab ${activeTab === 'dpdp_dsar' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('dpdp_dsar')
              setStatusFilter('all')
            }}
            data-testid="reg-tab-dpdp"
          >
            DPDP Act 2023 · DSAR ({snapshot.dsarRequests.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'minor_safeguards'}
            className={`admin-reg-tab ${activeTab === 'minor_safeguards' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('minor_safeguards')
              setStatusFilter('all')
            }}
            data-testid="reg-tab-minor"
          >
            Minor Safeguards &amp; POSH ({snapshot.minorSafeguards.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'grievance_officer'}
            className={`admin-reg-tab ${activeTab === 'grievance_officer' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('grievance_officer')
              setStatusFilter('all')
            }}
            data-testid="reg-tab-grievance"
          >
            IT Rules · IPR · NADA ({snapshot.grievances.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'readiness_pack'}
            className={`admin-reg-tab ${activeTab === 'readiness_pack' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('readiness_pack')}
            data-testid="reg-tab-readiness"
          >
            Statutory Readiness Matrix
          </button>
        </div>

        {activeTab !== 'readiness_pack' && (
          <div className="admin-reg-search-row">
            <input
              type="search"
              className="admin-reg-search-input"
              placeholder="Search ref code, subject, academy, framework…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search regulatory records"
            />
            <select
              className="admin-reg-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open / Actionable</option>
              {activeTab === 'dpdp_dsar' && (
                <>
                  <option value="submitted">Submitted</option>
                  <option value="identity_verified">Identity Verified</option>
                  <option value="in_progress">In Progress</option>
                  <option value="fulfilled">Fulfilled</option>
                </>
              )}
              {activeTab === 'minor_safeguards' && (
                <>
                  <option value="pending_review">Pending Review</option>
                  <option value="action_required">Action Required</option>
                  <option value="verified">Verified</option>
                  <option value="restricted">Restricted</option>
                </>
              )}
              {activeTab === 'grievance_officer' && (
                <>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="takedown_enforced">Takedown Enforced</option>
                </>
              )}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: DPDP Act 2023 DSAR Register */}
      {activeTab === 'dpdp_dsar' && (
        <section className="admin-reg-table-card" aria-label="DPDP Act 2023 Data Subject Requests">
          <table className="admin-reg-table">
            <thead>
              <tr>
                <th>Reference &amp; Subject</th>
                <th>Request Type &amp; Scope</th>
                <th>Status</th>
                <th>Statutory SLA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDsar.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-reg-empty">
                    No DPDP data subject requests match the active filters.
                  </td>
                </tr>
              ) : (
                filteredDsar.map(item => {
                  const deadline = formatDeadline(item.dueAt)
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-reg-primary">{item.subjectName}</div>
                        <div className="admin-reg-meta tabular-nums">
                          <span>{item.referenceCode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.subjectEmail}</span>
                          {item.isMinorDataSubject && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="admin-reg-warn-text">Minor Data Subject (Sec. 9)</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-reg-primary">
                          {item.requestType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                        <div className="admin-reg-meta">{item.consentPurposeScope}</div>
                      </td>
                      <td>
                        <span className={`admin-reg-status is-${item.status}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                        <div className="admin-reg-meta">
                          {item.identityVerified ? 'ID Verified' : 'ID Pending'} · {item.assignedDpo}
                        </div>
                      </td>
                      <td className="tabular-nums">
                        <span className={deadline.isOverdue && item.status !== 'fulfilled' ? 'admin-reg-danger-text' : ''}>
                          {item.status === 'fulfilled' ? 'Completed' : deadline.text}
                        </span>
                      </td>
                      <td>
                        <div className="admin-reg-row-actions">
                          {!item.identityVerified && item.status !== 'fulfilled' && (
                            <button
                              type="button"
                              className="admin-reg-action-btn"
                              onClick={() => {
                                updateDsarRequestStatus({
                                  id: item.id,
                                  status: 'identity_verified',
                                  identityVerified: true,
                                  actorEmail: operatorEmail,
                                })
                                showToast(`Verified subject identity for ${item.referenceCode}.`)
                              }}
                              data-testid={`verify-dsar-${item.id}`}
                            >
                              Verify ID
                            </button>
                          )}
                          {item.status !== 'fulfilled' && (
                            <button
                              type="button"
                              className="admin-reg-action-btn is-primary"
                              onClick={() => {
                                setSelectedDsar(item)
                                setActionNoteDraft(item.resolutionNotes || '')
                              }}
                              data-testid={`fulfill-dsar-${item.id}`}
                            >
                              Fulfill DSAR
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
        </section>
      )}

      {/* TAB 2: Youth & Minor Safeguards */}
      {activeTab === 'minor_safeguards' && (
        <section className="admin-reg-table-card" aria-label="Youth Protection and Minor Safeguards">
          <table className="admin-reg-table">
            <thead>
              <tr>
                <th>Entity &amp; Reference</th>
                <th>Safeguard Control</th>
                <th>Status</th>
                <th>Evidence &amp; Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSafeguards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-reg-empty">
                    No minor safeguard records match the active filters.
                  </td>
                </tr>
              ) : (
                filteredSafeguards.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="admin-reg-primary">{item.entityName}</div>
                      <div className="admin-reg-meta tabular-nums">
                        <span>{item.referenceCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.city}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.sport}</span>
                        {item.ageBand && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.ageBand.toUpperCase()}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="admin-reg-primary">
                        {item.checkType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </div>
                      <div className="admin-reg-meta tabular-nums">Doc: {item.documentReference}</div>
                    </td>
                    <td>
                      <span className={`admin-reg-status is-${item.status}`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="admin-reg-note">{item.reviewNotes}</div>
                    </td>
                    <td>
                      <div className="admin-reg-row-actions">
                        {item.status !== 'verified' && (
                          <button
                            type="button"
                            className="admin-reg-action-btn is-primary"
                            onClick={() => {
                              updateMinorSafeguardStatus({
                                id: item.id,
                                status: 'verified',
                                reviewNotes: `Verified by ${operatorEmail} under KhelGrid Youth Protection Policy.`,
                                actorEmail: operatorEmail,
                              })
                              showToast(`Approved safeguard clearance for ${item.entityName}.`)
                            }}
                            data-testid={`approve-safeguard-${item.id}`}
                          >
                            Verify
                          </button>
                        )}
                        {item.status !== 'restricted' && (
                          <button
                            type="button"
                            className="admin-reg-action-btn is-danger"
                            onClick={() => {
                              setSelectedSafeguard(item)
                              setActionNoteDraft(item.reviewNotes)
                            }}
                            data-testid={`restrict-safeguard-${item.id}`}
                          >
                            Restrict / Notify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* TAB 3: Statutory Grievance Officer & IT Rules 2021 */}
      {activeTab === 'grievance_officer' && (
        <section className="admin-reg-table-card" aria-label="Statutory Grievance Officer Register">
          <table className="admin-reg-table">
            <thead>
              <tr>
                <th>Reference &amp; Target Entity</th>
                <th>Statutory Framework</th>
                <th>Status</th>
                <th>IT Rules 2021 SLA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrievances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-reg-empty">
                    No statutory grievance cases match the active filters.
                  </td>
                </tr>
              ) : (
                filteredGrievances.map(item => {
                  const ackSla = formatDeadline(item.acknowledgeDueAt)
                  const resSla = formatDeadline(item.resolveDueAt)
                  const isClosed = item.status === 'resolved' || item.status === 'takedown_enforced'
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="admin-reg-primary">{item.targetEntityName}</div>
                        <div className="admin-reg-meta tabular-nums">
                          <span>{item.referenceCode}</span>
                          <span aria-hidden="true">·</span>
                          <span>Complainant: {item.complainantName}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.city}</span>
                        </div>
                        <div className="admin-reg-note">{item.summary}</div>
                      </td>
                      <td>
                        <div className="admin-reg-primary">{item.statutoryFramework}</div>
                        <div className="admin-reg-meta">Officer: {item.assignedOfficer}</div>
                      </td>
                      <td>
                        <span className={`admin-reg-status is-${item.status}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="tabular-nums">
                        {isClosed ? (
                          <span>Order issued</span>
                        ) : item.status === 'open' ? (
                          <span className={ackSla.isOverdue ? 'admin-reg-danger-text' : ''}>
                            24h Ack: {ackSla.text}
                          </span>
                        ) : (
                          <span className={resSla.isOverdue ? 'admin-reg-danger-text' : ''}>
                            Resolve: {resSla.text}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="admin-reg-row-actions">
                          {item.status === 'open' && (
                            <button
                              type="button"
                              className="admin-reg-action-btn"
                              onClick={() => {
                                updateStatutoryGrievanceStatus({
                                  id: item.id,
                                  status: 'acknowledged',
                                  actorEmail: operatorEmail,
                                })
                                showToast(`24h statutory acknowledgment logged for ${item.referenceCode}.`)
                              }}
                              data-testid={`ack-grievance-${item.id}`}
                            >
                              Acknowledge
                            </button>
                          )}
                          {!isClosed && (
                            <button
                              type="button"
                              className="admin-reg-action-btn is-primary"
                              onClick={() => {
                                setSelectedGrievance(item)
                                setActionNoteDraft(item.resolutionOrder || '')
                              }}
                              data-testid={`resolve-grievance-${item.id}`}
                            >
                              Issue Order
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
        </section>
      )}

      {/* TAB 4: Statutory Readiness Matrix */}
      {activeTab === 'readiness_pack' && (
        <section className="admin-reg-readiness-grid" aria-label="Statutory Readiness Matrix">
          {snapshot.readiness.map(item => (
            <article key={item.id} className="admin-reg-readiness-card">
              <div className="admin-reg-readiness-top">
                <span className="admin-reg-framework-label">{item.framework}</span>
                <span className={`admin-reg-status is-${item.status}`}>
                  {item.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="admin-reg-readiness-title">{item.controlTitle}</h2>
              <p className="admin-reg-readiness-note">{item.evidenceNote}</p>
              <div className="admin-reg-meta tabular-nums">
                <span>Open items: {item.openCount}</span>
                <span aria-hidden="true">·</span>
                <span>Overdue / Critical: {item.overdueCount}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Fulfill DSAR Modal */}
      {selectedDsar && (
        <div className="admin-reg-modal-backdrop" role="dialog" aria-modal="true" aria-label="Fulfill DPDP DSAR Request">
          <div className="admin-reg-modal">
            <h2>Fulfill {selectedDsar.referenceCode}</h2>
            <p className="admin-reg-meta">
              {selectedDsar.subjectName} · {selectedDsar.requestType.replace(/_/g, ' ')}
            </p>
            <label className="admin-reg-modal-label">
              DPO Fulfillment &amp; Verification Record
              <textarea
                rows={3}
                value={actionNoteDraft}
                onChange={e => setActionNoteDraft(e.target.value)}
                placeholder="Document erasure confirmation, export delivery receipt, or rectification reference…"
              />
            </label>
            <div className="admin-reg-modal-actions">
              <button type="button" className="admin-reg-btn" onClick={() => setSelectedDsar(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-reg-btn is-primary"
                onClick={() => {
                  updateDsarRequestStatus({
                    id: selectedDsar.id,
                    status: 'fulfilled',
                    identityVerified: true,
                    resolutionNotes:
                      actionNoteDraft.trim() || 'Completed and logged under DPDP Act 2023 compliance ledger.',
                    actorEmail: operatorEmail,
                  })
                  showToast(`Fulfilled DPDP request ${selectedDsar.referenceCode}.`)
                  setSelectedDsar(null)
                }}
              >
                Confirm Fulfillment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restrict Minor Safeguard Modal */}
      {selectedSafeguard && (
        <div className="admin-reg-modal-backdrop" role="dialog" aria-modal="true" aria-label="Restrict Minor Safeguard">
          <div className="admin-reg-modal">
            <h2>Restrict &amp; Notify · {selectedSafeguard.referenceCode}</h2>
            <p className="admin-reg-meta">
              {selectedSafeguard.entityName} · Dispatches live compliance banner to partner workspace.
            </p>
            <label className="admin-reg-modal-label">
              Compliance Hold Directive
              <textarea
                rows={3}
                value={actionNoteDraft}
                onChange={e => setActionNoteDraft(e.target.value)}
                placeholder="Specify missing guardian consent, police clearance, or POSH ICC charter requirement…"
              />
            </label>
            <div className="admin-reg-modal-actions">
              <button type="button" className="admin-reg-btn" onClick={() => setSelectedSafeguard(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-reg-btn is-danger"
                onClick={() => {
                  updateMinorSafeguardStatus({
                    id: selectedSafeguard.id,
                    status: 'restricted',
                    reviewNotes:
                      actionNoteDraft.trim() || 'Minor safeguard hold enforced pending mandatory verification.',
                    dispatchPartnerBanner: true,
                    actorEmail: operatorEmail,
                  })
                  showToast(`Applied safeguard hold & dispatched partner banner for ${selectedSafeguard.entityName}.`)
                  setSelectedSafeguard(null)
                }}
              >
                Enforce Hold &amp; Dispatch Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grievance Officer Order Modal */}
      {selectedGrievance && (
        <div className="admin-reg-modal-backdrop" role="dialog" aria-modal="true" aria-label="Issue Grievance Resolution Order">
          <div className="admin-reg-modal">
            <h2>Issue Statutory Order · {selectedGrievance.referenceCode}</h2>
            <p className="admin-reg-meta">
              {selectedGrievance.targetEntityName} · {selectedGrievance.statutoryFramework}
            </p>
            <label className="admin-reg-modal-label">
              Grievance Officer Order &amp; Reasoning
              <textarea
                rows={3}
                value={actionNoteDraft}
                onChange={e => setActionNoteDraft(e.target.value)}
                placeholder="Record statutory findings, content takedown directive, or remediation completed…"
              />
            </label>
            <div className="admin-reg-modal-actions">
              <button type="button" className="admin-reg-btn" onClick={() => setSelectedGrievance(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-reg-btn is-danger"
                onClick={() => {
                  updateStatutoryGrievanceStatus({
                    id: selectedGrievance.id,
                    status: 'takedown_enforced',
                    resolutionOrder:
                      actionNoteDraft.trim() || 'Interim takedown enforced under IT Rules 2021.',
                    actorEmail: operatorEmail,
                  })
                  showToast(`Enforced takedown order for ${selectedGrievance.referenceCode}.`)
                  setSelectedGrievance(null)
                }}
              >
                Enforce Takedown
              </button>
              <button
                type="button"
                className="admin-reg-btn is-primary"
                onClick={() => {
                  updateStatutoryGrievanceStatus({
                    id: selectedGrievance.id,
                    status: 'resolved',
                    resolutionOrder:
                      actionNoteDraft.trim() || 'Grievance resolved and closed within statutory window.',
                    actorEmail: operatorEmail,
                  })
                  showToast(`Resolved statutory grievance ${selectedGrievance.referenceCode}.`)
                  setSelectedGrievance(null)
                }}
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
