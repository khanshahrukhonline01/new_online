import { useEffect, useMemo, useState, useCallback, type FC } from 'react'
import {
  getAdminTrustSafetyCases,
  startCaseInvestigation,
  adjudicateBanAppeal,
  closeTrustSafetyCase,
  addInvestigationNote,
  exportTrustSafetyLedgerToCsv,
  resetAdminTrustSafetyForTesting,
  SANCTION_DECISION_PRESETS,
  APPEAL_DECISION_PRESETS,
  type TrustIncidentRecord,
  type IncidentSeverity,
  type IncidentCategory,
  type IncidentStatus,
  type ReportedEntityType,
  type SanctionType,
  type TrustSafetyMicroKpiMetrics,
} from '../services/adminTrustSafetyService'
import {
  computeEscalationImpactPreview,
  escalateDisputeToSanction,
} from '../services/adminGovernanceEscalationService'
import type { AdminDeskDeepLink } from '../services/adminGlobalSearchService'
import './AdminTrustSafetyDesk.css'

export interface AdminTrustSafetyDeskProps {
  operatorEmail?: string
  deepLink?: AdminDeskDeepLink | null
}

export const AdminTrustSafetyDesk: FC<AdminTrustSafetyDeskProps> = ({
  operatorEmail = 'trust.safety@khelgrid.com',
  deepLink = null,
}) => {
  const currentOfficer = useMemo(
    () => ({
      name: operatorEmail.split('@')[0] || 'Senior T&S Investigator',
      email: operatorEmail,
    }),
    [operatorEmail],
  )

  const [cases, setCases] = useState<TrustIncidentRecord[]>([])
  const [metrics, setMetrics] = useState<TrustSafetyMicroKpiMetrics>({
    totalCases: 0,
    criticalP0Active: 0,
    underInvestigation: 0,
    activeSanctions: 0,
    appealsPending: 0,
    resolvedCases: 0,
    avgResolutionHours: 36.5,
    trustBadgesRevoked: 0,
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<IncidentCategory | 'all'>('all')
  const [entityFilter, setEntityFilter] = useState<ReportedEntityType | 'all'>('all')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'narrative' | 'evidence' | 'notes' | 'sanctions' | 'appeals' | 'audit'
  >('narrative')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Modals state
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false)
  const [sanctionType, setSanctionType] = useState<SanctionType>('temporary_suspension')
  const [sanctionDurationDays, setSanctionDurationDays] = useState<number>(30)
  const [sanctionReason, setSanctionReason] = useState('')
  const [sanctionPublicAdvisory, setSanctionPublicAdvisory] = useState('')
  const [sanctionRevokeBadge, setSanctionRevokeBadge] = useState(true)
  const [sanctionSuspendAccess, setSanctionSuspendAccess] = useState(true)

  const [appealModalOpen, setAppealModalOpen] = useState(false)
  const [activeAppealId, setActiveAppealId] = useState<string | null>(null)
  const [appealDecision, setAppealDecision] = useState<'upheld' | 'penalty_reduced' | 'exonerated'>('upheld')
  const [appealNotes, setAppealNotes] = useState('')

  const [closeCaseModalOpen, setCloseCaseModalOpen] = useState(false)
  const [closeResolutionNotes, setCloseResolutionNotes] = useState('')

  const [newNoteText, setNewNoteText] = useState('')
  const [noteIsConfidential, setNoteIsConfidential] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    if (!deepLink || deepLink.workspace !== 'fraud_disputes') return
    setStatusFilter('all')
    setSeverityFilter('all')
    setCategoryFilter('all')
    setEntityFilter('all')
    setSearchQuery(deepLink.query ?? '')
    if (deepLink.recordId) {
      setSelectedCaseId(deepLink.recordId)
      setActiveDrawerTab('narrative')
    }
  }, [deepLink])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getAdminTrustSafetyCases({
        search: searchQuery,
        status: statusFilter,
        severity: severityFilter,
        category: categoryFilter,
        entityType: entityFilter,
      })
      setCases(res.cases)
      setMetrics(res.metrics)
    } catch {
      showToast('Failed to load incident cases.')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, statusFilter, severityFilter, categoryFilter, entityFilter])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const activeCase = useMemo(() => {
    if (!selectedCaseId) return null
    return cases.find(c => c.id === selectedCaseId) || null
  }, [cases, selectedCaseId])

  const handleClaimInvestigation = async (item: TrustIncidentRecord) => {
    try {
      await startCaseInvestigation(item.id, currentOfficer)
      showToast(`Assigned ${currentOfficer.name} to investigate ${item.incidentNumber}`)
      await loadData()
      setSelectedCaseId(item.id)
      setActiveDrawerTab('notes')
    } catch {
      showToast('Error claiming case.')
    }
  }

  const escalationPreview = useMemo(
    () =>
      computeEscalationImpactPreview({
        sanctionType,
        revokeVerifiedBadge: sanctionRevokeBadge,
        suspendAccess: sanctionSuspendAccess,
        durationDays: sanctionDurationDays || undefined,
      }),
    [sanctionType, sanctionRevokeBadge, sanctionSuspendAccess, sanctionDurationDays],
  )

  const handleLevySanction = async () => {
    if (!selectedCaseId || !sanctionReason.trim()) return
    try {
      const receipt = await escalateDisputeToSanction({
        caseId: selectedCaseId,
        officer: currentOfficer,
        sanctionType,
        durationDays: sanctionDurationDays || undefined,
        reason: sanctionReason,
        publicAdvisoryText: sanctionPublicAdvisory || undefined,
        revokeVerifiedBadge: sanctionRevokeBadge,
        suspendAccess: sanctionSuspendAccess,
        executionMode: 'execute_direct',
      })
      showToast(receipt.summary)
      setSanctionModalOpen(false)
      setSanctionReason('')
      setSanctionPublicAdvisory('')
      await loadData()
    } catch {
      showToast('Failed to levy sanction.')
    }
  }

  const handleProposeSanctionDualControl = async () => {
    if (!selectedCaseId || !sanctionReason.trim()) return
    try {
      const receipt = await escalateDisputeToSanction({
        caseId: selectedCaseId,
        officer: currentOfficer,
        sanctionType,
        durationDays: sanctionDurationDays || undefined,
        reason: sanctionReason,
        publicAdvisoryText: sanctionPublicAdvisory || undefined,
        revokeVerifiedBadge: sanctionRevokeBadge,
        suspendAccess: sanctionSuspendAccess,
        executionMode: 'propose_dual_control',
      })
      showToast(receipt.summary)
      setSanctionModalOpen(false)
      setSanctionReason('')
      setSanctionPublicAdvisory('')
      await loadData()
    } catch {
      showToast('Failed to queue dual-control sanction proposal.')
    }
  }

  const handleAdjudicateAppeal = async () => {
    if (!selectedCaseId || !activeAppealId || !appealNotes.trim()) return
    try {
      await adjudicateBanAppeal(selectedCaseId, activeAppealId, {
        officer: currentOfficer,
        decision: appealDecision,
        notes: appealNotes,
      })
      showToast(`Appeal adjudicated: ${appealDecision.toUpperCase()}`)
      setAppealModalOpen(false)
      setActiveAppealId(null)
      setAppealNotes('')
      await loadData()
    } catch {
      showToast('Failed to adjudicate appeal.')
    }
  }

  const handleCloseCase = async () => {
    if (!selectedCaseId || !closeResolutionNotes.trim()) return
    try {
      await closeTrustSafetyCase(selectedCaseId, {
        officer: currentOfficer,
        resolutionNotes: closeResolutionNotes,
      })
      showToast('Incident case resolved and closed.')
      setCloseCaseModalOpen(false)
      setCloseResolutionNotes('')
      await loadData()
    } catch {
      showToast('Failed to close case.')
    }
  }

  const handleAddNote = async () => {
    if (!selectedCaseId || !newNoteText.trim()) return
    try {
      await addInvestigationNote(selectedCaseId, currentOfficer, newNoteText, noteIsConfidential)
      setNewNoteText('')
      showToast('Investigation note recorded.')
      await loadData()
    } catch {
      showToast('Failed to record note.')
    }
  }

  const handleExportCsv = () => {
    const csv = exportTrustSafetyLedgerToCsv(cases)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `khelgrid-trust-safety-ledger-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Trust & Safety ledger exported to CSV.')
  }

  const handleResetForTesting = () => {
    resetAdminTrustSafetyForTesting()
    showToast('Trust & Safety seed cases reset to baseline.')
    void loadData()
  }

  return (
    <div className="trust-safety-desk" data-testid="trust-safety-desk">
      {/* 1. Header Ribbon */}
      <header className="trust-header-ribbon">
        <div className="trust-header-title-block">
          <h1>Trust & Safety, Complaints & Sanctions Desk</h1>
          <p>
            Dispute intake, safety incident investigations, disciplinary sanctions, and ban appeals governance across KhelGrid
          </p>
        </div>
        <div className="trust-header-actions">
          <button
            type="button"
            className="trust-btn trust-btn-secondary"
            onClick={handleExportCsv}
            title="Download full incident compliance ledger in RFC 4180 CSV format"
          >
            Export Compliance CSV
          </button>
          <button
            type="button"
            className="trust-btn trust-btn-secondary"
            onClick={handleResetForTesting}
            title="Reset seed incidents to baseline"
          >
            Reset Test Data
          </button>
          <button
            type="button"
            className="trust-btn trust-btn-primary"
            onClick={() => void loadData()}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* 2. Micro-KPI Telemetry Ribbon */}
      <section className="trust-kpi-grid" aria-label="Trust & Safety Incident Telemetry">
        <div className="trust-kpi-card" data-testid="kpi-total-cases">
          <span className="trust-kpi-label">Total Cases Logged</span>
          <span className="trust-kpi-value">{metrics.totalCases}</span>
          <span className="trust-kpi-subtext">All incident categories</span>
        </div>
        <div className="trust-kpi-card kpi-critical" data-testid="kpi-critical-p0">
          <span className="trust-kpi-label">
            <span className="trust-pulse-dot" /> Critical P0 Active
          </span>
          <span className="trust-kpi-value" style={{ color: '#fca5a5' }}>
            {metrics.criticalP0Active}
          </span>
          <span className="trust-kpi-subtext">Urgent SLA &lt; 4 hours</span>
        </div>
        <div className="trust-kpi-card" data-testid="kpi-under-investigation">
          <span className="trust-kpi-label">Active Investigations</span>
          <span className="trust-kpi-value">{metrics.underInvestigation}</span>
          <span className="trust-kpi-subtext">Officer assigned & evidence audit</span>
        </div>
        <div className="trust-kpi-card" data-testid="kpi-active-sanctions">
          <span className="trust-kpi-label">Active Sanctions</span>
          <span className="trust-kpi-value">{metrics.activeSanctions}</span>
          <span className="trust-kpi-subtext">Lockout / probation enforced</span>
        </div>
        <div className="trust-kpi-card" data-testid="kpi-appeals-pending">
          <span className="trust-kpi-label">Ban Appeals Pending</span>
          <span className="trust-kpi-value">{metrics.appealsPending}</span>
          <span className="trust-kpi-subtext">Appellate review queued</span>
        </div>
        <div className="trust-kpi-card" data-testid="kpi-trust-revoked">
          <span className="trust-kpi-label">Seals Revoked</span>
          <span className="trust-kpi-value">{metrics.trustBadgesRevoked}</span>
          <span className="trust-kpi-subtext">Integrity breaches penalized</span>
        </div>
      </section>

      {/* 3. Filters & Search Controls */}
      <section className="trust-filters-container">
        <div className="trust-search-row">
          <div className="trust-search-input-wrapper">
            <span className="trust-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="trust-search-input"
              placeholder="Search by incident # (TS-2026-081), entity name, reporter, city, venue…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-testid="trust-search-input"
            />
          </div>

          <select
            className="trust-select"
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as IncidentSeverity | 'all')}
            data-testid="severity-filter-select"
          >
            <option value="all">All Severities</option>
            <option value="critical_p0">Critical P0 (Violence / Minor Harm / Police FIR)</option>
            <option value="high_p1">High P1 (Severe Injury / Fraud / Extortion)</option>
            <option value="medium_p2">Medium P2 (Booking Disputes / Abusive Conduct)</option>
            <option value="low_p3">Low P3 (Operational Noise / Schedule Lapses)</option>
          </select>

          <select
            className="trust-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as IncidentCategory | 'all')}
            data-testid="category-filter-select"
          >
            <option value="all">All Incident Categories</option>
            <option value="safety_hazard">Safety Hazards & Turf Negligence</option>
            <option value="abuse_harassment">Abuse, Harassment & POSH Incidents</option>
            <option value="financial_fraud">Financial Fraud & Combine Extortion</option>
            <option value="age_eligibility_fraud">Age Eligibility & Document Forgery</option>
            <option value="impersonation_scam">Brand Impersonation & Fake Affiliation</option>
            <option value="booking_dispute">Booking Dispute & Unrefunded Escrows</option>
            <option value="match_conduct">Match Brawl & Referee Assault</option>
          </select>

          <select
            className="trust-select"
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value as ReportedEntityType | 'all')}
            data-testid="entity-filter-select"
          >
            <option value="all">All Entity Types</option>
            <option value="venue">Venues & Turfs</option>
            <option value="academy">Academies & Clubs</option>
            <option value="coach">Coaches & Trainers</option>
            <option value="organiser">Tournament Organisers</option>
            <option value="athlete">Athletes</option>
          </select>
        </div>

        <div className="trust-pills-row" role="tablist" aria-label="Status Filters">
          {(
            [
              { key: 'all', label: 'All Incidents' },
              { key: 'intake_pending', label: 'Intake Pending' },
              { key: 'under_investigation', label: 'Under Investigation' },
              { key: 'evidence_gathered', label: 'Evidence Gathered' },
              { key: 'sanction_issued', label: 'Sanctions Active' },
              { key: 'appeal_pending', label: 'Appeals Pending' },
              { key: 'case_closed', label: 'Cases Closed' },
            ] as const
          ).map(pill => {
            const count =
              pill.key === 'all'
                ? cases.length
                : cases.filter(c => c.status === pill.key).length
            return (
              <button
                key={pill.key}
                type="button"
                className={`trust-filter-pill ${statusFilter === pill.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(pill.key)}
                data-testid={`filter-pill-${pill.key}`}
              >
                <span>{pill.label}</span>
                <span className="trust-pill-badge">{count}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 4. Directory Table */}
      <section className="trust-table-card">
        <div className="trust-table-wrapper">
          <table className="trust-table">
            <thead>
              <tr>
                <th>Incident # / Severity</th>
                <th>Incident Narrative & Category</th>
                <th>Reported Entity & Location</th>
                <th>Reporter / Role</th>
                <th>Lifecycle Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading Trust & Safety cases…
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No incident cases matched the selected criteria.
                  </td>
                </tr>
              ) : (
                cases.map(c => (
                  <tr key={c.id} data-testid={`case-row-${c.id}`}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
                          {c.incidentNumber}
                        </span>
                        <span className={`trust-severity-badge trust-severity-${c.severity}`}>
                          {c.severity === 'critical_p0' && <span className="trust-pulse-dot" />}
                          {c.severity.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '380px' }}>
                        <button
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            fontWeight: 600,
                            color: '#f8fafc',
                            lineHeight: 1.35,
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setSelectedCaseId(c.id)
                            setActiveDrawerTab('narrative')
                          }}
                        >
                          {c.title}
                        </button>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Category: {c.category.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{c.reportedEntityName}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {c.reportedEntityType.toUpperCase()} · {c.city}, {c.state}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ color: '#cbd5e1' }}>{c.reporterName}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Role: {c.reporterRole.replace('_', ' ')}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={`trust-status-badge trust-status-${c.status}`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td>
                      <div className="trust-action-btn-group">
                        <button
                          type="button"
                          className="trust-row-btn trust-row-btn-primary"
                          onClick={() => {
                            setSelectedCaseId(c.id)
                            setActiveDrawerTab('narrative')
                          }}
                          data-testid={`inspect-btn-${c.id}`}
                        >
                          Inspect
                        </button>

                        {c.status === 'intake_pending' && (
                          <button
                            type="button"
                            className="trust-row-btn"
                            onClick={() => handleClaimInvestigation(c)}
                            data-testid={`claim-case-btn-${c.id}`}
                          >
                            Claim Case
                          </button>
                        )}

                        {(c.status === 'under_investigation' || c.status === 'evidence_gathered') && (
                          <button
                            type="button"
                            className="trust-row-btn"
                            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
                            onClick={() => {
                              setSelectedCaseId(c.id)
                              setSanctionModalOpen(true)
                            }}
                          >
                            Levy Sanction
                          </button>
                        )}

                        {c.status === 'appeal_pending' && (
                          <button
                            type="button"
                            className="trust-row-btn"
                            style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
                            onClick={() => {
                              setSelectedCaseId(c.id)
                              const pendingAppeal = c.appeals.find(a => a.status === 'pending')
                              setActiveAppealId(pendingAppeal?.id || null)
                              setAppealModalOpen(true)
                            }}
                          >
                            Review Appeal
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

      {/* 5. Slide-over Case Investigation Drawer */}
      {activeCase && (
        <div className="trust-drawer-backdrop" onClick={() => setSelectedCaseId(null)}>
          <div
            className="trust-drawer"
            onClick={e => e.stopPropagation()}
            data-testid="case-investigation-drawer"
          >
            {/* Drawer Header */}
            <header className="trust-drawer-header">
              <div className="trust-drawer-header-info">
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
                    {activeCase.incidentNumber}
                  </span>
                  <span className={`trust-severity-badge trust-severity-${activeCase.severity}`}>
                    {activeCase.severity.replace('_', ' ')}
                  </span>
                  <span className={`trust-status-badge trust-status-${activeCase.status}`}>
                    {activeCase.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h2>{activeCase.title}</h2>
              </div>
              <button
                type="button"
                className="trust-close-btn"
                onClick={() => setSelectedCaseId(null)}
                aria-label="Close drawer"
              >
                ✕
              </button>
            </header>

            {/* Drawer Tabs */}
            <nav className="trust-drawer-tabs">
              <button
                type="button"
                className={`trust-drawer-tab ${activeDrawerTab === 'narrative' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('narrative')}
                data-testid="drawer-tab-narrative"
              >
                Incident Narrative
              </button>
              <button
                type="button"
                className={`trust-drawer-tab ${activeDrawerTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('evidence')}
                data-testid="drawer-tab-evidence"
              >
                Evidence Vault ({activeCase.evidence.length})
              </button>
              <button
                type="button"
                className={`trust-drawer-tab ${activeDrawerTab === 'notes' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('notes')}
                data-testid="drawer-tab-notes"
              >
                Investigation Notes ({activeCase.investigationNotes.length})
              </button>
              <button
                type="button"
                className={`trust-drawer-tab ${activeDrawerTab === 'sanctions' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('sanctions')}
                data-testid="drawer-tab-sanctions"
              >
                Sanctions &amp; Penalties ({activeCase.sanctions.length})
              </button>
              <button
                type="button"
                className={`trust-drawer-tab ${activeDrawerTab === 'appeals' ? 'active' : ''}`}
                onClick={() => setActiveDrawerTab('appeals')}
                data-testid="drawer-tab-appeals"
              >
                Ban Appeals ({activeCase.appeals.length})
              </button>
            </nav>

            {/* Drawer Body */}
            <div className="trust-drawer-body">
              {/* TAB 1: NARRATIVE */}
              {activeDrawerTab === 'narrative' && (
                <>
                  <div className="trust-section-card">
                    <h3>Incident Summary &amp; Allegations</h3>
                    <p style={{ lineHeight: 1.6, color: '#cbd5e1', margin: 0, fontSize: '0.875rem' }}>
                      {activeCase.description}
                    </p>
                  </div>

                  <div className="trust-section-card">
                    <h3>Reported Entity Identity</h3>
                    <div className="trust-grid-2col">
                      <div className="trust-meta-item">
                        <span className="trust-meta-label">Entity Name</span>
                        <span className="trust-meta-value" style={{ fontWeight: 600 }}>
                          {activeCase.reportedEntityName}
                        </span>
                      </div>
                      <div className="trust-meta-item">
                        <span className="trust-meta-label">Entity Classification</span>
                        <span className="trust-meta-value">{activeCase.reportedEntityType.toUpperCase()}</span>
                      </div>
                      <div className="trust-meta-item">
                        <span className="trust-meta-label">Jurisdiction / Location</span>
                        <span className="trust-meta-value">
                          {activeCase.venueOrLocation || `${activeCase.city}, ${activeCase.state}`}
                        </span>
                      </div>
                      <div className="trust-meta-item">
                        <span className="trust-meta-label">Assigned Officer</span>
                        <span className="trust-meta-value">
                          {activeCase.assignedOfficer?.name || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="trust-section-card">
                    <h3>Reporter Information</h3>
                    <div className="trust-grid-2col">
                      <div className="trust-meta-item">
                        <span className="trust-meta-label">Reporter Name &amp; Role</span>
                        <span className="trust-meta-value">
                          {activeCase.reporterName} ({activeCase.reporterRole.replace('_', ' ')})
                        </span>
                      </div>
                      <div className="trust-meta-item">
                        <span className="trust-meta-label">Contact Email</span>
                        <span className="trust-meta-value">{activeCase.reporterEmail}</span>
                      </div>
                      {activeCase.reporterPhone && (
                        <div className="trust-meta-item">
                          <span className="trust-meta-label">Contact Phone</span>
                          <span className="trust-meta-value">{activeCase.reporterPhone}</span>
                        </div>
                      )}
                      <div className="trust-meta-item">
                        <span className="trust-meta-label">Logged Timestamp</span>
                        <span className="trust-meta-value">
                          {new Date(activeCase.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                      {activeCase.status === 'intake_pending' && (
                        <button
                          type="button"
                          className="trust-btn trust-btn-primary"
                          onClick={() => handleClaimInvestigation(activeCase)}
                        >
                          Claim Active Investigation
                        </button>
                      )}
                      <button
                        type="button"
                        className="trust-btn trust-btn-danger"
                        onClick={() => setSanctionModalOpen(true)}
                      >
                        Levy Disciplinary Sanctions
                      </button>
                      <button
                        type="button"
                        className="trust-btn trust-btn-secondary"
                        onClick={() => setCloseCaseModalOpen(true)}
                      >
                        Close / Dismiss Case
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: EVIDENCE VAULT */}
              {activeDrawerTab === 'evidence' && (
                <div className="trust-section-card">
                  <h3>Subpoenaed Evidence &amp; Verification Attachments</h3>
                  {activeCase.evidence.length === 0 ? (
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>
                      No attachments deposited yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {activeCase.evidence.map(ev => (
                        <div key={ev.id} className="trust-evidence-item">
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                              {ev.fileName}{' '}
                              {ev.verifiedByOfficer && (
                                <span style={{ fontSize: '0.6875rem', color: '#10b981' }}>
                                  ✓ Officer Verified
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {ev.description} ({ev.fileSize}) · Uploaded by {ev.uploadedBy}
                            </div>
                          </div>
                          <a
                            href={ev.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="trust-row-btn trust-row-btn-primary"
                            style={{ textDecoration: 'none' }}
                          >
                            Inspect File
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: INVESTIGATION NOTES */}
              {activeDrawerTab === 'notes' && (
                <div className="trust-section-card">
                  <h3>Investigation Log &amp; Subpoena Records</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <textarea
                      rows={3}
                      className="trust-search-input"
                      placeholder="Add investigation findings, witness statements, or subpoena responses…"
                      value={newNoteText}
                      onChange={e => setNewNoteText(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={noteIsConfidential}
                          onChange={e => setNoteIsConfidential(e.target.checked)}
                          style={{ marginRight: '0.35rem' }}
                        />
                        Mark as Confidential Law Enforcement / Legal Note
                      </label>
                      <button
                        type="button"
                        className="trust-btn trust-btn-primary"
                        onClick={handleAddNote}
                      >
                        Record Investigation Entry
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {activeCase.investigationNotes.map(n => (
                      <div
                        key={n.id}
                        style={{
                          borderLeft: n.isConfidential ? '2px solid #ef4444' : '2px solid #38bdf8',
                          paddingLeft: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            {n.officerName}{' '}
                            {n.isConfidential && (
                              <span style={{ color: '#ef4444' }}>[CONFIDENTIAL]</span>
                            )}
                          </span>
                          <span style={{ color: '#64748b' }}>
                            {new Date(n.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#cbd5e1' }}>
                          {n.noteText}
                        </p>
                        {n.actionTaken && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Action: {n.actionTaken}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SANCTIONS */}
              {activeDrawerTab === 'sanctions' && (
                <div className="trust-section-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Disciplinary Sanctions &amp; Restrictions</h3>
                    <button
                      type="button"
                      className="trust-btn trust-btn-danger"
                      onClick={() => setSanctionModalOpen(true)}
                    >
                      + Levy Sanction
                    </button>
                  </div>

                  {activeCase.sanctions.length === 0 ? (
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>
                      No disciplinary sanctions have been levied on this entity.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {activeCase.sanctions.map(s => (
                        <div key={s.id} className="trust-sanction-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase' }}>
                              {s.type.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`trust-status-badge ${
                                s.isActive ? 'trust-status-sanction_issued' : 'trust-status-case_closed'
                              }`}
                            >
                              {s.isActive ? 'Active Penalty' : 'Expired / Deactivated'}
                            </span>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#cbd5e1' }}>
                            <strong>Reason:</strong> {s.reason}
                          </p>

                          {s.publicAdvisoryText && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#fecaca' }}>
                              <strong>Public Advisory:</strong> {s.publicAdvisoryText}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span>Levied: {new Date(s.leviedAt).toLocaleDateString()}</span>
                            {s.expiresAt && <span>Expires: {new Date(s.expiresAt).toLocaleDateString()}</span>}
                            <span>Verified Seal Revoked: {s.verifiedBadgeRevoked ? 'YES' : 'NO'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: BAN APPEALS */}
              {activeDrawerTab === 'appeals' && (
                <div className="trust-section-card">
                  <h3>Appellate Review &amp; Reinstatement Pleas</h3>
                  {activeCase.appeals.length === 0 ? (
                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>
                      No ban appeals submitted for this incident.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {activeCase.appeals.map(a => (
                        <div key={a.id} className="trust-appeal-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                              Appeal by {a.appellantName} ({a.appellantEmail})
                            </span>
                            <span className={`trust-status-badge trust-status-${a.status === 'pending' ? 'appeal_pending' : 'case_closed'}`}>
                              {a.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#cbd5e1' }}>
                            <strong style={{ color: '#38bdf8' }}>Appellant Statement:</strong> {a.pleaNarrative}
                          </div>

                          {a.adjudicationNotes && (
                            <div style={{ fontSize: '0.75rem', color: '#a3e635' }}>
                              <strong>Appellate Decision ({a.adjudicatedBy}):</strong> {a.adjudicationNotes}
                            </div>
                          )}

                          {a.status === 'pending' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button
                                type="button"
                                className="trust-btn trust-btn-primary"
                                onClick={() => {
                                  setActiveAppealId(a.id)
                                  setAppealModalOpen(true)
                                }}
                              >
                                Adjudicate Appeal
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Levy Disciplinary Sanction */}
      {sanctionModalOpen && (
        <div className="trust-modal-backdrop" onClick={() => setSanctionModalOpen(false)}>
          <div className="trust-modal-card" onClick={e => e.stopPropagation()}>
            <header className="trust-modal-header">
              <h3>Levy Disciplinary Sanctions</h3>
              <button
                type="button"
                className="trust-close-btn"
                onClick={() => setSanctionModalOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="trust-modal-body">
              <div className="trust-presets-list">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                  Standard Disciplinary Presets:
                </span>
                {SANCTION_DECISION_PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    className="trust-preset-item"
                    onClick={() => {
                      setSanctionType(preset.type)
                      setSanctionDurationDays(preset.durationDays || 0)
                      setSanctionReason(preset.reason)
                      setSanctionRevokeBadge(preset.revocation)
                      setSanctionSuspendAccess(preset.type === 'temporary_suspension' || preset.type === 'permanent_blacklist')
                    }}
                  >
                    <div className="trust-preset-title">{preset.title}</div>
                    <div className="trust-preset-desc">{preset.reason}</div>
                  </div>
                ))}
              </div>

              <div className="trust-field">
                <label>Sanction Classification</label>
                <select
                  value={sanctionType}
                  onChange={e => setSanctionType(e.target.value as SanctionType)}
                >
                  <option value="formal_warning">Formal Disciplinary Warning (Probation)</option>
                  <option value="verified_seal_revocation">Verified Trust Seal Revocation</option>
                  <option value="public_safety_advisory">Public Safety Warning Advisory</option>
                  <option value="temporary_suspension">Temporary Platform Suspension</option>
                  <option value="permanent_blacklist">Permanent Platform Blacklist</option>
                  <option value="police_fir_referral">Law Enforcement / Police Referral</option>
                </select>
              </div>

              <div className="trust-field">
                <label>Suspension Duration (Days)</label>
                <select
                  value={sanctionDurationDays}
                  onChange={e => setSanctionDurationDays(Number(e.target.value))}
                >
                  <option value={0}>0 Days (Warning / Indefinite)</option>
                  <option value={30}>30 Days (Standard Infraction)</option>
                  <option value={60}>60 Days (Severe Hazard / Repeat Offence)</option>
                  <option value={90}>90 Days (Financial Fraud / Major Abuse)</option>
                  <option value={180}>180 Days (Extensive Integrity Breach)</option>
                </select>
              </div>

              <div className="trust-field">
                <label>Legal Justification &amp; Disciplinary Grounds</label>
                <textarea
                  rows={3}
                  value={sanctionReason}
                  onChange={e => setSanctionReason(e.target.value)}
                  placeholder="Detail substantiated violations of KhelGrid platform terms…"
                />
              </div>

              <div className="trust-field">
                <label>Public Safety Advisory Banner (Displayed on Listing)</label>
                <input
                  type="text"
                  value={sanctionPublicAdvisory}
                  onChange={e => setSanctionPublicAdvisory(e.target.value)}
                  placeholder="e.g. Under review for infrastructure maintenance non-compliance."
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sanctionRevokeBadge}
                    onChange={e => setSanctionRevokeBadge(e.target.checked)}
                    style={{ marginRight: '0.35rem' }}
                  />
                  Immediately Revoke Verified Trust Seal
                </label>
                <label style={{ fontSize: '0.8125rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={sanctionSuspendAccess}
                    onChange={e => setSanctionSuspendAccess(e.target.checked)}
                    style={{ marginRight: '0.35rem' }}
                  />
                  Suspend Public Bookings &amp; Listing Visibility
                </label>
              </div>

              <div
                className="trust-escalation-preview"
                data-testid="sanction-escalation-preview"
              >
                <div className="trust-escalation-preview-header">
                  <span>Cross-Desk Escalation Impact Preview</span>
                  {escalationPreview.requiresDualControl && (
                    <span className="trust-escalation-dual-badge">
                      Four-Eyes Dual-Control Recommended
                    </span>
                  )}
                </div>
                <ul className="trust-escalation-preview-list">
                  {escalationPreview.summaryLines.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
            <footer className="trust-modal-footer">
              <button
                type="button"
                className="trust-btn trust-btn-secondary"
                onClick={() => setSanctionModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="trust-btn trust-btn-secondary"
                data-testid="propose-sanction-mc-btn"
                onClick={handleProposeSanctionDualControl}
                disabled={!sanctionReason.trim()}
                title="Queue this disciplinary escalation for mandatory secondary administrator approval"
              >
                Submit for Dual-Control Approval
              </button>
              <button
                type="button"
                className="trust-btn trust-btn-danger"
                data-testid="enforce-sanction-direct-btn"
                onClick={handleLevySanction}
              >
                Enforce Sanctions
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL 2: Adjudicate Ban Appeal */}
      {appealModalOpen && (
        <div className="trust-modal-backdrop" onClick={() => setAppealModalOpen(false)}>
          <div className="trust-modal-card" onClick={e => e.stopPropagation()}>
            <header className="trust-modal-header">
              <h3>Adjudicate Ban Appeal</h3>
              <button
                type="button"
                className="trust-close-btn"
                onClick={() => setAppealModalOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="trust-modal-body">
              <div className="trust-presets-list">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                  Appellate Templates:
                </span>
                {APPEAL_DECISION_PRESETS.map(preset => (
                  <div
                    key={preset.id}
                    className="trust-preset-item"
                    onClick={() => {
                      setAppealDecision(preset.status)
                      setAppealNotes(preset.notes)
                    }}
                  >
                    <div className="trust-preset-title">{preset.title}</div>
                    <div className="trust-preset-desc">{preset.notes}</div>
                  </div>
                ))}
              </div>

              <div className="trust-field">
                <label>Appellate Adjudication</label>
                <select
                  value={appealDecision}
                  onChange={e => setAppealDecision(e.target.value as 'upheld' | 'penalty_reduced' | 'exonerated')}
                >
                  <option value="upheld">Uphold Original Sanctions (Reject Appeal)</option>
                  <option value="penalty_reduced">Reduce Penalty (Convert to Supervised Probation)</option>
                  <option value="exonerated">Exonerate &amp; Fully Restore Platform Access</option>
                </select>
              </div>

              <div className="trust-field">
                <label>Appellate Finding &amp; Rationale</label>
                <textarea
                  rows={4}
                  value={appealNotes}
                  onChange={e => setAppealNotes(e.target.value)}
                  placeholder="Record formal justification for appellate outcome…"
                />
              </div>
            </div>
            <footer className="trust-modal-footer">
              <button
                type="button"
                className="trust-btn trust-btn-secondary"
                onClick={() => setAppealModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="trust-btn trust-btn-primary"
                onClick={handleAdjudicateAppeal}
              >
                Render Appellate Ruling
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL 3: Close Case */}
      {closeCaseModalOpen && (
        <div className="trust-modal-backdrop" onClick={() => setCloseCaseModalOpen(false)}>
          <div className="trust-modal-card" onClick={e => e.stopPropagation()}>
            <header className="trust-modal-header">
              <h3>Close / Dismiss Incident Case</h3>
              <button
                type="button"
                className="trust-close-btn"
                onClick={() => setCloseCaseModalOpen(false)}
              >
                ✕
              </button>
            </header>
            <div className="trust-modal-body">
              <div className="trust-field">
                <label>Resolution Summary</label>
                <textarea
                  rows={4}
                  value={closeResolutionNotes}
                  onChange={e => setCloseResolutionNotes(e.target.value)}
                  placeholder="Document resolution outcome, customer compensation, or dismissal grounds…"
                />
              </div>
            </div>
            <footer className="trust-modal-footer">
              <button
                type="button"
                className="trust-btn trust-btn-secondary"
                onClick={() => setCloseCaseModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="trust-btn trust-btn-primary"
                onClick={handleCloseCase}
              >
                Confirm Case Closure
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="trust-toast" role="status">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
