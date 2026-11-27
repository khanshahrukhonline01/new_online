import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  approveAndReleaseTenantPost,
  blockAndQuarantineTenantPost,
  computePostRegulationMetrics,
  enqueueTenantPostForRegulation,
  exportPostRegulationCsv,
  getPostRegulationSnapshot,
  reEvaluatePendingTenantPosts,
  returnTenantPostForFix,
  TENANT_POST_CATEGORY_LABELS,
  type PostGateDisposition,
  type PostGateWorkflowStatus,
  type TenantPostCategory,
  type TenantPostEvaluationItem,
} from '../../../../src/shared/governance/postRegulationBridge'
import {
  subscribeRegulatoryState,
  type RegulatoryWorkspaceKey,
  type TenantRegulatoryStatus,
} from '../../../../src/shared/governance/regulatoryBridge'
import type { AdminDeskDeepLink } from '../services/adminGlobalSearchService'
import {
  listQueueClaims,
  type QueueRecordClaim,
} from '../services/adminQueueWorkflowService'
import {
  AdminAssigneeFilterBar,
  AdminQueueClaimControl,
  type AssigneeFilterValue,
} from './AdminQueueClaimControl'
import { AdminSavedViewsBar } from './AdminSavedViewsBar'
import './AdminPostRegulationGateDesk.css'

function matchesAssigneeFilter(
  claim: QueueRecordClaim | null,
  filter: AssigneeFilterValue,
  operatorEmail: string,
): boolean {
  if (filter === 'all') return true
  if (filter === 'unclaimed') return !claim
  if (filter === 'mine') {
    return Boolean(claim && claim.claimedBy.toLowerCase() === operatorEmail.toLowerCase())
  }
  return Boolean(claim && claim.claimedBy.toLowerCase() === filter.toLowerCase())
}

export interface AdminPostRegulationGateDeskProps {
  operatorEmail?: string
  deepLink?: AdminDeskDeepLink | null
  onOpenPolicyRules?: () => void
}

function triggerCsvDownload(csv: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatDispositionLabel(d: PostGateDisposition): string {
  if (d === 'hard_hold') return 'Hard Hold'
  if (d === 'manual_review') return 'Manual Review'
  return 'Auto-Clear Ready'
}

function formatWorkflowLabel(s: PostGateWorkflowStatus): string {
  switch (s) {
    case 'pending_evaluation':
      return 'Awaiting Gate'
    case 'cleared_published':
      return 'Cleared · Live'
    case 'returned_for_fix':
      return 'Returned for Fix'
    case 'blocked_quarantined':
      return 'Blocked · Held'
  }
}

export function AdminPostRegulationGateDesk({
  operatorEmail = 'admin@khelgrid.com',
  deepLink = null,
  onOpenPolicyRules,
}: AdminPostRegulationGateDeskProps) {
  const [snapshot, setSnapshot] = useState(() => getPostRegulationSnapshot())
  const [claims, setClaims] = useState<QueueRecordClaim[]>(() =>
    listQueueClaims('post_regulation_gate'),
  )
  const [workflowFilter, setWorkflowFilter] = useState<'all' | PostGateWorkflowStatus>(
    'pending_evaluation',
  )
  const [dispositionFilter, setDispositionFilter] = useState<'all' | PostGateDisposition>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | TenantPostCategory>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilterValue>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(
    () => getPostRegulationSnapshot().items[0]?.id ?? null,
  )
  const [decisionNote, setDecisionNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [showSimulator, setShowSimulator] = useState(false)

  // Simulator draft state for testing live tenant post intake
  const [simTitle, setSimTitle] = useState('')
  const [simBody, setSimBody] = useState('')
  const [simTenantName, setSimTenantName] = useState('Sunrise Cricket Academy')
  const [simCategory, setSimCategory] = useState<TenantPostCategory>('trial_opportunity')
  const [simStanding, setSimStanding] = useState<TenantRegulatoryStatus>('active')
  const [simSport, setSimSport] = useState('Cricket')
  const [simCity, setSimCity] = useState('Delhi NCR')
  const [simMinors, setSimMinors] = useState(true)
  const [simGuardianConsent, setSimGuardianConsent] = useState(false)
  const [simSponsoredDisclosure, setSimSponsoredDisclosure] = useState(false)
  const [simError, setSimError] = useState('')

  const reload = useCallback(() => {
    setSnapshot(getPostRegulationSnapshot())
    setClaims(listQueueClaims('post_regulation_gate'))
  }, [])

  useEffect(() => {
    return subscribeRegulatoryState(reload)
  }, [reload])

  useEffect(() => {
    if (!deepLink || deepLink.workspace !== 'post_regulation_gate') return
    if (deepLink.savedViewFilters) {
      const f = deepLink.savedViewFilters
      setWorkflowFilter(
        (f.workflow as 'all' | PostGateWorkflowStatus) || 'all',
      )
      setDispositionFilter(
        (f.disposition as 'all' | PostGateDisposition) || 'all',
      )
      setCategoryFilter(
        (f.category as 'all' | TenantPostCategory) || 'all',
      )
      setSearchQuery(f.query || '')
      return
    }
    if (deepLink.recordId) {
      setWorkflowFilter('all')
      setSelectedId(deepLink.recordId)
    } else if (deepLink.query) {
      setWorkflowFilter('all')
      setSearchQuery(deepLink.query)
    }
  }, [deepLink])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setToast(null), 3600)
    }
  }, [])

  const claimById = useMemo(() => {
    const map = new Map<string, QueueRecordClaim>()
    for (const c of claims) map.set(c.recordId, c)
    return map
  }, [claims])

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return snapshot.items.filter(item => {
      if (workflowFilter !== 'all' && item.workflowStatus !== workflowFilter) return false
      if (dispositionFilter !== 'all' && item.evaluation.disposition !== dispositionFilter) {
        return false
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      const claim = claimById.get(item.id) ?? null
      if (!matchesAssigneeFilter(claim, assigneeFilter, operatorEmail)) return false
      if (q) {
        const hay = `${item.referenceCode} ${item.title} ${item.body} ${item.tenantName} ${item.sport} ${item.city} ${item.submitterEmail}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [
    snapshot.items,
    workflowFilter,
    dispositionFilter,
    categoryFilter,
    claimById,
    assigneeFilter,
    operatorEmail,
    searchQuery,
  ])

  const selectedItem: TenantPostEvaluationItem | null = useMemo(() => {
    if (selectedId) {
      const found = snapshot.items.find(i => i.id === selectedId)
      if (found) return found
    }
    return filteredItems[0] ?? null
  }, [snapshot.items, selectedId, filteredItems])

  const metrics = useMemo(
    () => computePostRegulationMetrics(snapshot.items, snapshot.rules),
    [snapshot.items, snapshot.rules],
  )

  const handleApprove = (item: TenantPostEvaluationItem) => {
    const updated = approveAndReleaseTenantPost(
      item.id,
      operatorEmail,
      decisionNote.trim() || undefined,
    )
    if (updated) {
      setDecisionNote('')
      reload()
      showToast(`Approved & released ${updated.referenceCode} (${updated.tenantName}) to live catalogue.`)
    }
  }

  const handleReturnForFix = (item: TenantPostEvaluationItem) => {
    const note =
      decisionNote.trim() ||
      `Resolve flagged statutory checks (${item.evaluation.checks
        .filter(c => c.outcome !== 'pass')
        .map(c => c.ruleCode)
        .join(', ') || 'policy compliance'}) before republishing.`
    const updated = returnTenantPostForFix(item.id, operatorEmail, note)
    if (updated) {
      setDecisionNote('')
      reload()
      showToast(`Returned ${updated.referenceCode} for compliance fix & dispatched Partner Advisory Banner.`)
    }
  }

  const handleBlock = (item: TenantPostEvaluationItem) => {
    const reason =
      decisionNote.trim() ||
      `Blocked by Pre-Publication Regulation Gate: ${item.evaluation.summaryReason}`
    const updated = blockAndQuarantineTenantPost(item.id, operatorEmail, reason, true)
    if (updated) {
      setDecisionNote('')
      reload()
      showToast(`Blocked & quarantined ${updated.referenceCode}. Compliance hold logged.`)
    }
  }

  const handleReEvaluateAll = () => {
    const res = reEvaluatePendingTenantPosts(operatorEmail)
    reload()
    showToast(
      `Re-evaluated ${res.reEvaluatedCount} awaiting tenant posts (${res.hardHoldsCount} hard holds).`,
    )
  }

  const handleExportCsv = () => {
    const csv = exportPostRegulationCsv(filteredItems)
    triggerCsvDownload(
      csv,
      `khelgrid-post-regulation-gate-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    showToast(`Exported ${filteredItems.length} evaluated tenant posts to CSV.`)
  }

  const mapCategoryToPersona = (cat: TenantPostCategory): RegulatoryWorkspaceKey => {
    switch (cat) {
      case 'venue_listing':
        return 'turf'
      case 'coach_profile':
        return 'coach'
      case 'tournament_notice':
        return 'tournament'
      case 'creator_campaign':
        return 'creator'
      default:
        return 'academy'
    }
  }

  const handleSubmitSimulatedPost = (e: React.FormEvent) => {
    e.preventDefault()
    if (!simTitle.trim() || !simBody.trim()) {
      setSimError('Enter both a post title and post body to run pre-publication evaluation.')
      return
    }
    setSimError('')
    const created = enqueueTenantPostForRegulation({
      title: simTitle.trim(),
      body: simBody.trim(),
      category: simCategory,
      tenantName: simTenantName.trim() || 'Demo Partner Academy',
      tenantSlug: (simTenantName.trim() || 'demo-partner')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-'),
      tenantPersona: mapCategoryToPersona(simCategory),
      tenantStanding: simStanding,
      submitterName: 'Tenant Operator',
      submitterEmail: 'partner.ops@example.in',
      sport: simSport.trim() || 'Cricket',
      city: simCity.trim() || 'Delhi NCR',
      involvesMinors: simMinors,
      guardianConsentAttested: simGuardianConsent,
      hasSponsoredDisclosure: simSponsoredDisclosure,
      sourceRoute: '/workspace',
    })
    setSimTitle('')
    setSimBody('')
    setShowSimulator(false)
    setWorkflowFilter('pending_evaluation')
    setSelectedId(created.id)
    reload()
    showToast(
      `Evaluated "${created.referenceCode}" -> ${formatDispositionLabel(created.evaluation.disposition)} (Risk ${created.evaluation.riskScore}/100).`,
    )
  }

  return (
    <div className="admin-post-gate-root" data-testid="admin-post-regulation-gate-desk">
      <header className="admin-post-gate-header">
        <div>
          <p className="admin-post-gate-kicker">
            Pre-Publication Regulation Gate · Mandatory Tenant Post Evaluation
          </p>
          <h1 className="admin-post-gate-title">Tenant Post Pre-Publication Gate</h1>
          <p className="admin-post-gate-subtitle">
            Every post created by any tenant (Academies, Venues, Coaches, Tournaments, Creators)
            is automatically evaluated against DPDP Act 2023, Zero-Commission Anti-Fraud, IT Rules
            2021, SafeSport / NADA, and Tenant Standing before live publication.
          </p>
        </div>

        <div className="admin-post-gate-actions">
          <button
            type="button"
            className="admin-post-gate-btn"
            onClick={() => setShowSimulator(open => !open)}
            data-testid="post-gate-simulate-btn"
          >
            <SiteIcon name="plus" size={14} />
            <span>{showSimulator ? 'Close Intake Form' : 'Simulate Tenant Post'}</span>
          </button>
          <button
            type="button"
            className="admin-post-gate-btn"
            onClick={handleReEvaluateAll}
            data-testid="post-gate-rerun-btn"
          >
            <SiteIcon name="refresh" size={14} />
            <span>Re-Run Rules</span>
          </button>
          <button
            type="button"
            className="admin-post-gate-btn"
            onClick={handleExportCsv}
          >
            <SiteIcon name="download" size={14} />
            <span>Export CSV</span>
          </button>
          {onOpenPolicyRules && (
            <button
              type="button"
              className="admin-post-gate-btn is-primary"
              onClick={onOpenPolicyRules}
              data-testid="post-gate-open-rules-btn"
            >
              <SiteIcon name="shield-check" size={14} />
              <span>Policy Rules ({metrics.activeRulesCount}/{metrics.totalRulesCount})</span>
            </button>
          )}
        </div>
      </header>

      {toast && (
        <div className="admin-post-gate-toast" role="status">
          <SiteIcon name="check-circle" size={15} />
          <span>{toast}</span>
        </div>
      )}

      {/* Optional Inline Tenant Post Intake Simulator */}
      {showSimulator && (
        <form
          className="admin-post-gate-sim-card"
          onSubmit={handleSubmitSimulatedPost}
          aria-label="Simulate tenant post intake into regulation gate"
          data-testid="post-gate-simulator-form"
        >
          <div className="admin-post-gate-sim-head">
            <strong>Submit Tenant Post Through Pre-Publication Regulation Gate</strong>
            <span className="admin-post-gate-meta">
              Runs all {metrics.activeRulesCount} active statutory rules instantly before publishing
            </span>
          </div>

          <div className="admin-post-gate-sim-grid">
            <label className="admin-post-gate-field is-wide">
              <span>Post Title</span>
              <input
                type="text"
                value={simTitle}
                onChange={e => setSimTitle(e.target.value)}
                placeholder="e.g., West Delhi U-16 Open Cricket Trial — Register Now"
                data-testid="sim-post-title"
              />
            </label>
            <label className="admin-post-gate-field">
              <span>Tenant Organisation</span>
              <input
                type="text"
                value={simTenantName}
                onChange={e => setSimTenantName(e.target.value)}
                data-testid="sim-post-tenant"
              />
            </label>
            <label className="admin-post-gate-field">
              <span>Post Category</span>
              <select
                value={simCategory}
                onChange={e => setSimCategory(e.target.value as TenantPostCategory)}
                data-testid="sim-post-category"
              >
                {Object.entries(TENANT_POST_CATEGORY_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-post-gate-field">
              <span>Tenant Standing</span>
              <select
                value={simStanding}
                onChange={e => setSimStanding(e.target.value as TenantRegulatoryStatus)}
                data-testid="sim-post-standing"
              >
                <option value="active">Active (Verified)</option>
                <option value="pending_verification">Pending KYC</option>
                <option value="restricted">Restricted</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <label className="admin-post-gate-field">
              <span>Sport</span>
              <input
                type="text"
                value={simSport}
                onChange={e => setSimSport(e.target.value)}
              />
            </label>
            <label className="admin-post-gate-field">
              <span>City</span>
              <input
                type="text"
                value={simCity}
                onChange={e => setSimCity(e.target.value)}
              />
            </label>
            <label className="admin-post-gate-field is-full">
              <span>Post Description / Copy</span>
              <textarea
                rows={2}
                value={simBody}
                onChange={e => setSimBody(e.target.value)}
                placeholder="Include trial details, fees, age category, disclosures, or test keywords (e.g., personal UPI, Aadhaar, #Ad)…"
                data-testid="sim-post-body"
              />
            </label>
          </div>

          <div className="admin-post-gate-sim-checks">
            <label>
              <input
                type="checkbox"
                checked={simMinors}
                onChange={e => setSimMinors(e.target.checked)}
              />
              <span>Targets U-18 / Minor athletes</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={simGuardianConsent}
                onChange={e => setSimGuardianConsent(e.target.checked)}
              />
              <span>Verifiable DPDP Sec. 9 Guardian Consent Attached</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={simSponsoredDisclosure}
                onChange={e => setSimSponsoredDisclosure(e.target.checked)}
              />
              <span>Includes ASCI #Ad / #Sponsored Disclosure</span>
            </label>
          </div>

          {simError && (
            <p className="admin-post-gate-error" role="alert">
              {simError}
            </p>
          )}

          <div className="admin-post-gate-sim-footer">
            <button
              type="button"
              className="admin-post-gate-btn"
              onClick={() => setShowSimulator(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-post-gate-btn is-primary"
              data-testid="sim-post-submit"
            >
              Evaluate &amp; Queue Post
            </button>
          </div>
        </form>
      )}

      {/* 4 Tabular KPI Cards */}
      <section className="admin-post-gate-kpis" aria-label="Post Regulation Gate Metrics">
        <div className="admin-post-gate-kpi">
          <span className="admin-post-gate-kpi-label">Awaiting Evaluation</span>
          <strong className="tabular-nums" data-testid="post-gate-kpi-awaiting">
            {metrics.awaitingEvaluation}
          </strong>
          <span className="admin-post-gate-kpi-sub">Held prior to public visibility</span>
        </div>
        <div className="admin-post-gate-kpi">
          <span className="admin-post-gate-kpi-label">Hard Regulatory Holds</span>
          <strong className="tabular-nums is-danger" data-testid="post-gate-kpi-holds">
            {metrics.hardHolds}
          </strong>
          <span className="admin-post-gate-kpi-sub">Blocked by DPDP, Anti-Fraud, or Standing</span>
        </div>
        <div className="admin-post-gate-kpi">
          <span className="admin-post-gate-kpi-label">Manual Compliance Review</span>
          <strong className="tabular-nums is-warning">{metrics.manualReview}</strong>
          <span className="admin-post-gate-kpi-sub">IPR, ASCI disclosure, or pending KYC</span>
        </div>
        <div className="admin-post-gate-kpi">
          <span className="admin-post-gate-kpi-label">Auto-Clear Ready</span>
          <strong className="tabular-nums is-success">{metrics.autoClearEligible}</strong>
          <span className="admin-post-gate-kpi-sub">
            {metrics.clearedPublished} cleared live · {metrics.returnedForFix} returned
          </span>
        </div>
      </section>

      {/* Saved Views & Operator Workload Filter */}
      <AdminSavedViewsBar
        desk="post_regulation_gate"
        operatorEmail={operatorEmail}
        currentFilters={{
          workflow: workflowFilter,
          disposition: dispositionFilter,
          category: categoryFilter,
          query: searchQuery,
        }}
        onApplyFilters={next => {
          setWorkflowFilter((next.workflow as 'all' | PostGateWorkflowStatus) || 'all')
          setDispositionFilter((next.disposition as 'all' | PostGateDisposition) || 'all')
          setCategoryFilter((next.category as 'all' | TenantPostCategory) || 'all')
          setSearchQuery(next.query || '')
        }}
        onResetFilters={() => {
          setWorkflowFilter('pending_evaluation')
          setDispositionFilter('all')
          setCategoryFilter('all')
          setAssigneeFilter('all')
          setSearchQuery('')
        }}
      />

      {/* Filter Bar */}
      <section className="admin-post-gate-filters" aria-label="Filter tenant post queue">
        <div className="admin-post-gate-tabs" role="tablist" aria-label="Workflow status">
          {(
            [
              { id: 'pending_evaluation', label: `Awaiting Gate (${metrics.awaitingEvaluation})` },
              { id: 'returned_for_fix', label: `Returned (${metrics.returnedForFix})` },
              { id: 'blocked_quarantined', label: `Blocked (${metrics.blockedQuarantined})` },
              { id: 'cleared_published', label: `Cleared Live (${metrics.clearedPublished})` },
              { id: 'all', label: `All (${snapshot.items.length})` },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={workflowFilter === tab.id}
              className={`admin-post-gate-tab ${workflowFilter === tab.id ? 'is-active' : ''}`}
              onClick={() => setWorkflowFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="admin-post-gate-filter-controls">
          <input
            type="search"
            className="admin-post-gate-input"
            placeholder="Search reference, post title, tenant, city…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search tenant posts in regulation gate"
          />

          <select
            className="admin-post-gate-select"
            value={dispositionFilter}
            onChange={e =>
              setDispositionFilter(e.target.value as 'all' | PostGateDisposition)
            }
            aria-label="Filter by screening disposition"
          >
            <option value="all">All Dispositions</option>
            <option value="hard_hold">Hard Hold</option>
            <option value="manual_review">Manual Review</option>
            <option value="auto_clear_eligible">Auto-Clear Ready</option>
          </select>

          <select
            className="admin-post-gate-select"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as 'all' | TenantPostCategory)}
            aria-label="Filter by tenant post category"
          >
            <option value="all">All Post Categories</option>
            {Object.entries(TENANT_POST_CATEGORY_LABELS).map(([k, lbl]) => (
              <option key={k} value={k}>
                {lbl}
              </option>
            ))}
          </select>

          <AdminAssigneeFilterBar
            desk="post_regulation_gate"
            operatorEmail={operatorEmail}
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            claims={claims}
          />
        </div>
      </section>

      {/* Active Evaluation Inspector (directly above table so zero scrolling needed) */}
      {selectedItem && (
        <section
          className="admin-post-gate-inspector"
          aria-label="Selected Tenant Post Regulatory Evaluation"
          data-testid="post-gate-inspector"
        >
          <div className="admin-post-gate-inspector-head">
            <div>
              <div className="admin-post-gate-meta tabular-nums">
                {selectedItem.referenceCode} · {TENANT_POST_CATEGORY_LABELS[selectedItem.category]} ·{' '}
                {selectedItem.tenantName} ({selectedItem.tenantStanding.replace(/_/g, ' ')}) ·{' '}
                {selectedItem.sport} · {selectedItem.city}
              </div>
              <h2 className="admin-post-gate-inspector-title">{selectedItem.title}</h2>
            </div>

            <div className="admin-post-gate-score-block tabular-nums">
              <span className="admin-post-gate-meta">Automated Risk Score</span>
              <strong
                className={
                  selectedItem.evaluation.disposition === 'hard_hold'
                    ? 'is-danger'
                    : selectedItem.evaluation.disposition === 'manual_review'
                      ? 'is-warning'
                      : 'is-success'
                }
              >
                {selectedItem.evaluation.riskScore} / 100 ·{' '}
                {formatDispositionLabel(selectedItem.evaluation.disposition)}
              </strong>
            </div>
          </div>

          <p className="admin-post-gate-body-preview">{selectedItem.body}</p>

          <div className="admin-post-gate-checks-grid" aria-label="Rule-by-Rule Evaluation Breakdown">
            {selectedItem.evaluation.checks.map(check => (
              <div
                key={check.ruleId}
                className={`admin-post-gate-check-row is-${check.outcome}`}
              >
                <div className="admin-post-gate-check-top">
                  <strong>{check.ruleName}</strong>
                  <span className={`admin-post-gate-outcome is-${check.outcome}`}>
                    {check.outcome === 'fail'
                      ? `Fail (+${check.scoreContribution})`
                      : check.outcome === 'warn'
                        ? `Warn (+${check.scoreContribution})`
                        : 'Pass'}
                  </span>
                </div>
                <div className="admin-post-gate-meta">
                  {check.ruleCode} · {check.statutoryCitation} · Enforcement: {check.enforcement}
                </div>
                <p className="admin-post-gate-check-evidence">{check.evidence}</p>
                {check.remediationHint && (
                  <p className="admin-post-gate-check-hint">
                    Remediation: {check.remediationHint}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="admin-post-gate-decision-bar">
            <input
              type="text"
              className="admin-post-gate-input is-note"
              placeholder="Compliance officer note / statutory remediation instructions sent to tenant…"
              value={decisionNote}
              onChange={e => setDecisionNote(e.target.value)}
              aria-label="Compliance officer decision note"
              data-testid="post-gate-decision-note"
            />
            <div className="admin-post-gate-decision-actions">
              <button
                type="button"
                className="admin-post-gate-btn is-success"
                onClick={() => handleApprove(selectedItem)}
                data-testid="post-gate-approve-btn"
              >
                <SiteIcon name="check" size={14} />
                <span>Approve &amp; Publish</span>
              </button>
              <button
                type="button"
                className="admin-post-gate-btn is-warning"
                onClick={() => handleReturnForFix(selectedItem)}
                data-testid="post-gate-return-btn"
              >
                <SiteIcon name="alert-triangle" size={14} />
                <span>Return for Fix</span>
              </button>
              <button
                type="button"
                className="admin-post-gate-btn is-danger"
                onClick={() => handleBlock(selectedItem)}
                data-testid="post-gate-block-btn"
              >
                <SiteIcon name="close" size={14} />
                <span>Block &amp; Quarantine</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Pre-Publication Queue Table (fixed balanced widths -> zero clipping) */}
      <section className="admin-post-gate-table-wrap" aria-label="Tenant Post Pre-Publication Queue">
        <table className="admin-post-gate-table">
          <colgroup>
            <col style={{ width: '27%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Reference &amp; Tenant Post</th>
              <th>Tenant &amp; Standing</th>
              <th>Category &amp; Hub</th>
              <th>Automated Screen</th>
              <th>Gate Status</th>
              <th>Claim &amp; Review</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-post-gate-empty">
                  No tenant posts match the selected regulation filters.
                </td>
              </tr>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedItem?.id === item.id
                return (
                  <tr
                    key={item.id}
                    className={isSelected ? 'is-selected' : ''}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td>
                      <div className="admin-post-gate-cell-title" title={item.title}>
                        {item.title}
                      </div>
                      <div className="admin-post-gate-meta tabular-nums">
                        {item.referenceCode} · {item.submitterEmail}
                      </div>
                    </td>
                    <td>
                      <div className="admin-post-gate-cell-strong" title={item.tenantName}>
                        {item.tenantName}
                      </div>
                      <div
                        className={`admin-post-gate-standing is-${item.tenantStanding}`}
                      >
                        Standing: {item.tenantStanding.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td>
                      <div>{TENANT_POST_CATEGORY_LABELS[item.category]}</div>
                      <div className="admin-post-gate-meta">
                        {item.sport} · {item.city}
                      </div>
                    </td>
                    <td className="tabular-nums">
                      <div
                        className={`admin-post-gate-disp is-${item.evaluation.disposition}`}
                      >
                        {formatDispositionLabel(item.evaluation.disposition)} ({item.evaluation.riskScore})
                      </div>
                      <div className="admin-post-gate-meta">
                        {item.evaluation.failedCount} fail · {item.evaluation.passedCount} pass
                      </div>
                    </td>
                    <td>
                      <span className={`admin-post-gate-status is-${item.workflowStatus}`}>
                        {formatWorkflowLabel(item.workflowStatus)}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="admin-post-gate-row-actions">
                        <AdminQueueClaimControl
                          desk="post_regulation_gate"
                          recordId={item.id}
                          referenceCode={item.referenceCode}
                          recordTitle={item.title}
                          operatorEmail={operatorEmail}
                          claim={claimById.get(item.id) ?? null}
                          compact
                          onChanged={() => setClaims(listQueueClaims('post_regulation_gate'))}
                        />
                        <button
                          type="button"
                          className="admin-post-gate-mini-btn"
                          onClick={() => setSelectedId(item.id)}
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
