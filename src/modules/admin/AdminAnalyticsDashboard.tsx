import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  getOperationsKpiSummary,
  getRecentModerationActivity,
  getAdminModerationQueue,
  approveListingSubmission,
  saveListingPublicationDetails,
  publishListingSubmission,
  clearCatalogueCache,
  type OperationsKpiSummary,
  type GlobalModeratorActivityItem,
  type ModeratorQueueItem,
} from '../../integrations/supabase/public-client'
import { signInWithEmail } from '../../integrations/supabase/auth-client'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { AdminComplianceHeatmap } from './AdminComplianceHeatmap'
import { AdminDateRangePicker } from './AdminDateRangePicker'
import { AdminDataFreshnessIndicator } from './AdminDataFreshnessIndicator'
import {
  buildComplianceHeatmapMatrix,
  buildComplianceSignals,
  buildInvestigableEntityRows,
  computePeriodComparisonMetrics,
  DEFAULT_COMPLIANCE_DATE_RANGE,
  EMPTY_DRILLDOWN_FILTER,
  filterEntityRowsByDrilldown,
  filterModerationRecordsByDrilldown,
  formatPeriodDeltaBadge,
  formatRiskTierLabel,
  getIncidentTypeLabel,
  getPartnerCategoryLabel,
  hasActiveDrilldown,
  normalizeComplianceRegion,
  normalizePartnerCategory,
  resolvePreviousComplianceDateWindow,
  type ComplianceDateRange,
  type ComplianceSignalRecord,
  type HeatmapDrilldownFilter,
  type HeatmapMatrixMode,
  type HeatmapSignalScope,
  type InvestigableEntityRow,
} from './complianceHeatmapData'
import {
  buildComplianceCsvExport,
  projectFilteredHeatmapForExport,
  triggerCsvDownload,
  type ComplianceCsvExportKind,
} from './complianceCsvExport'
import { getAdminTenants } from '../../../apps/admin/src/services/adminTenantService'
import { getAdminVerifications } from '../../../apps/admin/src/services/adminVerificationService'
import { getAdminTrustSafetyCases } from '../../../apps/admin/src/services/adminTrustSafetyService'
import { subscribeRegulatoryState } from '../../shared/governance/regulatoryBridge'
import './AdminAnalyticsDashboard.css'

export interface AdminAnalyticsDashboardProps {
  initialSummary?: OperationsKpiSummary | null
  shellAuthorized?: boolean
}

function buildLocalFallbackSummary(): OperationsKpiSummary {
  const tenants = getAdminTenants()
  const verifications = getAdminVerifications()
  const sportsBreakdown: Record<string, number> = {}
  const cityBreakdown: Record<string, number> = {}
  const categoryBreakdown: Record<string, number> = {}

  for (const t of tenants) {
    if (t.sport) sportsBreakdown[t.sport] = (sportsBreakdown[t.sport] || 0) + 1
    if (t.city) cityBreakdown[t.city] = (cityBreakdown[t.city] || 0) + 1
    const cat = t.tenantType || 'academy'
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
  }

  const activeTenantsCount = tenants.filter(t => t.status === 'active').length
  return {
    totalPublished: activeTenantsCount,
    totalSubmissions: verifications.length,
    pendingCount: verifications.filter(v => v.status === 'pending_review').length,
    underReviewCount: verifications.filter(v => v.status === 'in_review').length,
    changesRequestedCount: verifications.filter(v => v.status === 'action_required').length,
    approvedCount: verifications.filter(v => v.status === 'verified').length,
    publishedCount: activeTenantsCount,
    rejectedCount: verifications.filter(
      v => v.status === 'rejected' || v.status === 'revoked',
    ).length,
    unpublishedCount: tenants.filter(t => t.status !== 'active').length,
    sportsBreakdown,
    categoryBreakdown,
    cityBreakdown,
  }
}

function buildLocalFallbackQueue(): ModeratorQueueItem[] {
  const verifications = getAdminVerifications()
  return verifications.map(v => {
    const mappedStatus =
      v.status === 'verified'
        ? 'published'
        : v.status === 'in_review'
          ? 'under_review'
          : v.status === 'action_required'
            ? 'approved'
            : 'pending_review'
    return {
      id: v.id,
      reference_number: v.referenceCode,
      listing_type: v.entityType,
      title: v.entityName,
      city: v.city,
      source_url: null,
      details: v.sport ? `${v.sport} · ${v.state}` : v.state,
      status: mappedStatus,
      version: 1,
      created_at: v.submittedAt || new Date().toISOString(),
      updated_at: v.lastAuditedAt || v.submittedAt || new Date().toISOString(),
    }
  })
}

function buildLocalFallbackActivity(): GlobalModeratorActivityItem[] {
  const verifications = getAdminVerifications()
  const items: GlobalModeratorActivityItem[] = []
  for (const v of verifications) {
    const actionMap: Record<string, string> = {
      verified: 'verification_approved',
      rejected: 'rejected',
      revoked: 'rejected',
      action_required: 'corrections_requested',
      in_review: 'review_started',
      pending_review: 'review_started',
      expired: 'corrections_requested',
    }
    items.push({
      id: `local-act-${v.id}`,
      submission_id: v.id,
      reference_number: v.referenceCode,
      listing_title: v.entityName,
      listing_type: v.entityType,
      city: v.city,
      action: actionMap[v.status] || 'review_started',
      actor_id: v.assignedReviewer || 'compliance.desk@khelgrid.in',
      from_status: 'submitted',
      to_status: v.status,
      notes: v.rejectionReason || v.actionRequiredNotes || `${v.entityType} dossier audit (${v.state})`,
      created_at: v.lastAuditedAt || v.submittedAt || new Date().toISOString(),
    })
  }
  return items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function AdminAnalyticsDashboard({
  initialSummary,
  shellAuthorized = false,
}: AdminAnalyticsDashboardProps) {
  const [summary, setSummary] = useState<OperationsKpiSummary | null>(initialSummary || null)
  const [activity, setActivity] = useState<GlobalModeratorActivityItem[]>([])
  const [queueItems, setQueueItems] = useState<ModeratorQueueItem[]>([])
  const [isAuthorized, setIsAuthorized] = useState(Boolean(initialSummary || shellAuthorized))
  const [loading, setLoading] = useState(!initialSummary)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Authentication fallback state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  // Filtering for Activity Feed
  const [activityFilter, setActivityFilter] = useState<'all' | 'published' | 'approved' | 'evidence' | 'corrections' | 'rejected'>('all')
  const [activitySearch, setActivitySearch] = useState('')

  // Bulk Operations State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatusFilter, setBulkStatusFilter] = useState<string>('all')
  const [bulkTagSport, setBulkTagSport] = useState('')
  const [bulkTagCity, setBulkTagCity] = useState('')
  const [bulkNotes, setBulkNotes] = useState('')
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)
  const [bulkProgress, setBulkProgress] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)

  // Heatmap Dimension, Scope, Date Range, Drilldown & Investigable Entities State
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMatrixMode>('partner_category')
  const [heatmapScope, setHeatmapScope] = useState<HeatmapSignalScope>('all')
  const [dateRange, setDateRange] = useState<ComplianceDateRange>(DEFAULT_COMPLIANCE_DATE_RANGE)
  const [comparePreviousPeriod, setComparePreviousPeriod] = useState(false)
  const [drilldown, setDrilldown] = useState<HeatmapDrilldownFilter>(EMPTY_DRILLDOWN_FILTER)
  const [complianceSignals, setComplianceSignals] = useState<ComplianceSignalRecord[]>([])
  const [entityRows, setEntityRows] = useState<InvestigableEntityRow[]>([])
  const [entitySearch, setEntitySearch] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement | null>(null)

  const handleDrilldownChange = useCallback((next: HeatmapDrilldownFilter) => {
    setDrilldown(next)
    setSelectedIds(new Set())
  }, [])

  const loadEntityRoster = useCallback(async () => {
    const [tsResult, verifications, tenants] = await Promise.all([
      getAdminTrustSafetyCases().catch(() => ({ cases: [] })),
      Promise.resolve(getAdminVerifications()),
      Promise.resolve(getAdminTenants()),
    ])
    const payload = {
      incidents: tsResult.cases,
      verifications,
      tenants,
    }
    setComplianceSignals(buildComplianceSignals(payload))
    setEntityRows(buildInvestigableEntityRows(payload))
  }, [])

  useEffect(() => {
    if (!showExportMenu) return
    const handlePointerDown = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        event.target instanceof Node &&
        !exportMenuRef.current.contains(event.target)
      ) {
        setShowExportMenu(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showExportMenu])

  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    void loadEntityRoster()
    try {
      const [sumRes, actRes, qRes] = await Promise.all([
        getOperationsKpiSummary(),
        getRecentModerationActivity(60),
        getAdminModerationQueue({ limit: 100 }),
      ])
      setSummary(sumRes)
      setActivity(actRes)
      setQueueItems(qRes.pendingSubmissions || [])
      setIsAuthorized(true)
      setLastRefreshedAt(new Date())
    } catch (err) {
      if (shellAuthorized) {
        setSummary(buildLocalFallbackSummary())
        setActivity(buildLocalFallbackActivity())
        setQueueItems(buildLocalFallbackQueue())
        setIsAuthorized(true)
        setLastRefreshedAt(new Date())
      } else {
        setIsAuthorized(false)
        setSummary(null)
        setActivity([])
        setQueueItems([])
        setError(err instanceof Error ? err.message : 'Could not verify operations analytics authorization.')
      }
    } finally {
      setLoading(false)
    }
  }, [shellAuthorized, loadEntityRoster])

  useEffect(() => {
    void loadEntityRoster()
    return subscribeRegulatoryState(() => {
      void loadEntityRoster()
      if (shellAuthorized) {
        setSummary(buildLocalFallbackSummary())
        setActivity(buildLocalFallbackActivity())
        setQueueItems(buildLocalFallbackQueue())
        setLastRefreshedAt(new Date())
      }
    })
  }, [loadEntityRoster, shellAuthorized])

  useEffect(() => {
    if (!initialSummary) {
      void loadData()
    }
  }, [initialSummary, loadData])

  useEffect(() => {
    if (initialSummary) return
    const client = getSupabaseClient()
    if (!client) return
    let active = true
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthorized(false)
        setSummary(null)
        setActivity([])
        setQueueItems([])
        setSelectedIds(new Set())
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => {
          if (active) void loadData()
        }, 0)
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [initialSummary, loadData])

  useEffect(() => {
    if (!autoRefresh || !isAuthorized) return
    const interval = setInterval(() => {
      void loadData()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, isAuthorized, loadData])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthBusy(true)
    setError('')
    try {
      const res = await signInWithEmail({ email: email.trim(), password })
      if (!res.success) throw new Error(res.message || 'Sign-in failed.')
      setEmail('')
      setPassword('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please verify moderator credentials.')
    } finally {
      setAuthBusy(false)
    }
  }

  const drilldownActive = hasActiveDrilldown(drilldown)

  // Filtered Regulated Entities Roster (directly driven by heatmap drilldown + search)
  const filteredEntityRows = useMemo(() => {
    const byDrilldown = filterEntityRowsByDrilldown(entityRows, drilldown)
    if (!entitySearch.trim()) return byDrilldown
    const q = entitySearch.trim().toLowerCase()
    return byDrilldown.filter(
      row =>
        row.entityName.toLowerCase().includes(q) ||
        row.referenceCode.toLowerCase().includes(q) ||
        row.city.toLowerCase().includes(q) ||
        row.region.toLowerCase().includes(q) ||
        row.latestIssueSummary.toLowerCase().includes(q),
    )
  }, [entityRows, drilldown, entitySearch])

  // Filtered Activity Feed (synchronized with heatmap region/category drilldown)
  const filteredActivity = useMemo(() => {
    const drilldownScoped = filterModerationRecordsByDrilldown(activity, drilldown)
    return drilldownScoped.filter(item => {
      if (activityFilter === 'published' && item.action !== 'published') return false
      if (activityFilter === 'approved' && item.action !== 'approved') return false
      if (activityFilter === 'evidence' && !item.action.includes('evidence') && !item.action.includes('verification')) return false
      if (activityFilter === 'corrections' && !item.action.includes('correction')) return false
      if (activityFilter === 'rejected' && !item.action.includes('reject')) return false

      if (activitySearch.trim()) {
        const query = activitySearch.toLowerCase()
        const matchTitle = item.listing_title.toLowerCase().includes(query)
        const matchRef = item.reference_number.toLowerCase().includes(query)
        const matchCity = item.city?.toLowerCase().includes(query) ?? false
        const matchNotes = item.notes?.toLowerCase().includes(query) ?? false
        if (!matchTitle && !matchRef && !matchCity && !matchNotes) return false
      }
      return true
    })
  }, [activity, drilldown, activityFilter, activitySearch])

  // Filtered Queue for Bulk Actions (synchronized with heatmap region/category drilldown)
  const filteredQueue = useMemo(() => {
    const drilldownScoped = filterModerationRecordsByDrilldown(queueItems, drilldown)
    return drilldownScoped.filter(item => {
      if (bulkStatusFilter !== 'all' && item.status !== bulkStatusFilter) return false
      return true
    })
  }, [queueItems, drilldown, bulkStatusFilter])

  const handleOpenEntityDesk = (workspace: InvestigableEntityRow['targetWorkspace']) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('khelgrid-admin-switch-workspace', {
        detail: { workspace },
      }),
    )
  }

  // Synchronized Compliance Heatmap Matrix & Filtered Export Projection
  const heatmapMatrix = useMemo(
    () => buildComplianceHeatmapMatrix(complianceSignals, heatmapMode, heatmapScope, dateRange),
    [complianceSignals, heatmapMode, heatmapScope, dateRange],
  )

  const previousWindowPreview = useMemo(
    () => resolvePreviousComplianceDateWindow(heatmapMatrix.dateWindow),
    [heatmapMatrix.dateWindow],
  )

  const periodComparison = useMemo(
    () =>
      comparePreviousPeriod
        ? computePeriodComparisonMetrics(complianceSignals, heatmapMatrix)
        : null,
    [comparePreviousPeriod, complianceSignals, heatmapMatrix],
  )

  const exportProjection = useMemo(
    () => projectFilteredHeatmapForExport(heatmapMatrix, complianceSignals, drilldown),
    [heatmapMatrix, complianceSignals, drilldown],
  )

  const hasAnyComplianceFilter =
    drilldownActive ||
    heatmapScope !== 'all' ||
    dateRange.preset !== '30d' ||
    Boolean(entitySearch.trim())

  const handleExportComplianceCsv = useCallback(
    (kind: ComplianceCsvExportKind = 'combined') => {
      const result = buildComplianceCsvExport({
        kind,
        matrix: heatmapMatrix,
        allSignals: complianceSignals,
        drilldown,
        entities: filteredEntityRows,
        entitySearch,
      })

      triggerCsvDownload(result.filename, result.csv)
      setShowExportMenu(false)

      const summaryDetail =
        kind === 'heatmap_matrix'
          ? `${result.regionCount} ${result.regionCount === 1 ? 'region' : 'regions'}`
          : kind === 'drilldown_entities'
            ? `${result.entityCount} ${result.entityCount === 1 ? 'entity' : 'entities'}`
            : `${result.regionCount} ${result.regionCount === 1 ? 'region' : 'regions'}, ${result.entityCount} ${result.entityCount === 1 ? 'entity' : 'entities'}, ${result.signalCount} ${result.signalCount === 1 ? 'signal' : 'signals'}`

      setNotice(`Exported "${result.filename}" (${summaryDetail}).`)
    },
    [heatmapMatrix, complianceSignals, drilldown, filteredEntityRows, entitySearch],
  )

  // Bulk Selection Helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQueue.length && filteredQueue.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredQueue.map(i => i.id)))
    }
  }

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Bulk Action 1: Bulk Tag Sport & City
  const handleExecuteBulkTag = async () => {
    if (selectedIds.size === 0) return
    setIsProcessingBulk(true)
    setBulkProgress(`Tagging 0 of ${selectedIds.size}...`)
    let successCount = 0

    const idList = Array.from(selectedIds)
    for (let i = 0; i < idList.length; i++) {
      const id = idList[i]
      setBulkProgress(`Tagging item ${i + 1} of ${idList.length}...`)
      try {
        const patch: Record<string, string> = {}
        if (bulkTagSport.trim()) patch.sport = bulkTagSport.trim()
        if (bulkTagCity.trim()) patch.city = bulkTagCity.trim()
        await saveListingPublicationDetails(id, patch)
        successCount++
      } catch {
        // Continue with remaining
      }
    }

    setIsProcessingBulk(false)
    setShowTagModal(false)
    setSelectedIds(new Set())
    setNotice(`Successfully tagged ${successCount} listings with sport/city!`)
    await loadData()
  }

  // Bulk Action 2: Bulk Approve
  const handleExecuteBulkApprove = async () => {
    if (selectedIds.size === 0) return
    setIsProcessingBulk(true)
    setBulkProgress(`Approving 0 of ${selectedIds.size}...`)
    let successCount = 0

    const idList = Array.from(selectedIds)
    for (let i = 0; i < idList.length; i++) {
      const id = idList[i]
      setBulkProgress(`Approving item ${i + 1} of ${idList.length}...`)
      try {
        await approveListingSubmission(id, bulkNotes.trim() || 'Bulk approved via Operations Analytics Console')
        successCount++
      } catch {
        // Continue
      }
    }

    setIsProcessingBulk(false)
    setShowApproveModal(false)
    setSelectedIds(new Set())
    setNotice(`Successfully approved ${successCount} listings!`)
    await loadData()
  }

  // Bulk Action 3: Bulk Live Publish (strictly requires server-verified evidence & complete facts)
  const handleExecuteBulkPublish = async () => {
    if (selectedIds.size === 0) return
    setIsProcessingBulk(true)
    setBulkProgress(`Publishing 0 of ${selectedIds.size}...`)
    let successCount = 0
    let skippedCount = 0

    const selectedQueueItems = queueItems.filter(i => selectedIds.has(i.id) && i.status === 'approved')
    for (let i = 0; i < selectedQueueItems.length; i++) {
      const item = selectedQueueItems[i]
      setBulkProgress(`Publishing verified item ${i + 1} of ${selectedQueueItems.length}: ${item.title}...`)
      try {
        // Never fabricate missing publication facts or synthetic verification evidence.
        // The server RPC enforces verified evidence and completeness before publishing.
        await publishListingSubmission(item.id)
        successCount++
      } catch (err) {
        skippedCount++
        console.warn(`Bulk publish rejected for ${item.reference_number}:`, err)
      }
    }

    clearCatalogueCache()
    setIsProcessingBulk(false)
    setShowPublishModal(false)
    setSelectedIds(new Set())
    setNotice(
      skippedCount > 0
        ? `Published ${successCount} verified listings. Skipped ${skippedCount} listings requiring complete facts or evidence verification in Command Centre.`
        : `Published ${successCount} verified listings live.`,
    )
    await loadData()
  }

  // Calculate highest sport count for bar scaling
  const maxSportVal = useMemo(() => {
    if (!summary?.sportsBreakdown) return 1
    return Math.max(...Object.values(summary.sportsBreakdown), 1)
  }, [summary])

  if (loading && !isAuthorized) {
    return (
      <section className="admin-analytics-root" aria-busy="true">
        <div className="admin-analytics-header">
          <p className="admin-eyebrow">OPERATIONS ANALYTICS · RESTRICTED DESK</p>
          <h1>Verifying analytics authorization…</h1>
        </div>
      </section>
    )
  }

  if (!isAuthorized) {
    return (
      <section className="admin-analytics-root">
        <div className="admin-analytics-header">
          <p className="admin-eyebrow">OPERATIONS ANALYTICS · RESTRICTED DESK</p>
          <h1>Operations &amp; KPI Analytics</h1>
          <p style={{ color: '#64748b' }}>
            {error || 'Please authenticate with an authorized moderator account to view real-time platform telemetry.'}
          </p>
        </div>
        <form onSubmit={handleSignIn} style={{ maxWidth: 420, padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
            Operator Email:
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@example.com"
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Password:
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
          </label>
          <button type="submit" className="admin-analytics-btn admin-analytics-btn-primary" disabled={authBusy}>
            {authBusy ? 'Authenticating…' : 'Sign in to Operations Console'}
          </button>
        </form>
      </section>
    )
  }

  return (
    <section className="admin-analytics-root" aria-label="Operations Analytics & KPI Dashboard">
      {/* Header & Controls */}
      <header className="admin-analytics-header">
        <div className="admin-analytics-title-row">
          <div>
            <span className="admin-eyebrow">
              <SiteIcon name="chart" size={13} />
              EXECUTIVE TELEMETRY &amp; OPERATIONS
            </span>
            <h1>Operations Analytics &amp; KPI Dashboard</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Real-time pipeline metrics, live sport segmentation, moderation activity audit feed, and batch actions.
            </p>
            <AdminDataFreshnessIndicator
              lastRefreshedAt={lastRefreshedAt}
              isRefreshing={loading}
              autoRefreshEnabled={autoRefresh}
              onRefreshNow={() => void loadData()}
            />
          </div>

          <div className="admin-analytics-controls">
            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (30s)
            </label>

            <AdminDateRangePicker
              value={dateRange}
              resolvedWindow={heatmapMatrix.dateWindow}
              onChange={setDateRange}
              comparePreviousPeriod={comparePreviousPeriod}
              onToggleComparePreviousPeriod={setComparePreviousPeriod}
              previousWindowPreview={
                previousWindowPreview
                  ? `${previousWindowPreview.startDateIso} → ${previousWindowPreview.endDateIso}`
                  : null
              }
            />

            <div className="admin-csv-export-split" ref={exportMenuRef}>
              <button
                type="button"
                className={`admin-analytics-btn admin-analytics-btn-secondary admin-csv-export-main ${hasAnyComplianceFilter ? 'is-filtered' : ''}`}
                onClick={() => handleExportComplianceCsv('combined')}
                data-testid="export-compliance-csv-btn"
                title={
                  hasAnyComplianceFilter
                    ? 'Export filtered compliance heatmap, 30-day trends, and drill-down entities as CSV'
                    : 'Export full compliance heatmap, 30-day trends, and entity roster as CSV'
                }
              >
                <SiteIcon name="download" size={14} />
                <span>Export CSV</span>
                {hasAnyComplianceFilter && (
                  <span
                    className="admin-csv-filter-indicator"
                    data-testid="export-csv-filtered-indicator"
                    aria-label="Active filters applied to export"
                  >
                    Filtered
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`admin-analytics-btn admin-analytics-btn-secondary admin-csv-export-caret ${hasAnyComplianceFilter ? 'is-filtered' : ''}`}
                onClick={() => setShowExportMenu(prev => !prev)}
                aria-label="Choose CSV export format"
                aria-haspopup="menu"
                aria-expanded={showExportMenu}
                data-testid="export-csv-menu-toggle"
              >
                <SiteIcon name="chevron-down" size={14} />
              </button>

              {showExportMenu && (
                <div
                  className="admin-csv-export-menu"
                  role="menu"
                  aria-label="Compliance CSV export formats"
                  data-testid="export-csv-menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-csv-export-option"
                    onClick={() => handleExportComplianceCsv('combined')}
                    data-testid="export-csv-option-combined"
                  >
                    <span className="admin-csv-option-title">
                      Combined Compliance Report (.csv)
                    </span>
                    <span className="admin-csv-option-desc">
                      Heatmap &amp; 30d trends ({exportProjection.rows.length}{' '}
                      {exportProjection.rows.length === 1 ? 'region' : 'regions'}),{' '}
                      {filteredEntityRows.length}{' '}
                      {filteredEntityRows.length === 1 ? 'entity' : 'entities'},{' '}
                      {exportProjection.filteredSignals.length}{' '}
                      {exportProjection.filteredSignals.length === 1 ? 'signal' : 'signals'}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-csv-export-option"
                    onClick={() => handleExportComplianceCsv('heatmap_matrix')}
                    data-testid="export-csv-option-matrix"
                  >
                    <span className="admin-csv-option-title">
                      Heatmap Matrix &amp; 30d Trends (.csv)
                    </span>
                    <span className="admin-csv-option-desc">
                      Flat tabular matrix ({exportProjection.rows.length}{' '}
                      {exportProjection.rows.length === 1 ? 'region' : 'regions'} ×{' '}
                      {exportProjection.columns.length}{' '}
                      {heatmapMode === 'partner_category'
                        ? exportProjection.columns.length === 1
                          ? 'category'
                          : 'categories'
                        : exportProjection.columns.length === 1
                          ? 'incident type'
                          : 'incident types'}
                      )
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-csv-export-option"
                    onClick={() => handleExportComplianceCsv('drilldown_entities')}
                    data-testid="export-csv-option-entities"
                  >
                    <span className="admin-csv-option-title">
                      Drilldown Entities Roster (.csv)
                    </span>
                    <span className="admin-csv-option-desc">
                      Filtered partner table ({filteredEntityRows.length}{' '}
                      {filteredEntityRows.length === 1 ? 'entity' : 'entities'})
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            data-testid="analytics-status-notice"
            className="admin-analytics-status-notice"
          >
            <span>✓ {notice}</span>
            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Dismiss notification"
              className="admin-analytics-notice-dismiss"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div role="alert" style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#ef4444' }}>
            <span>⚠️ {error}</span>
          </div>
        )}
      </header>

      {/* 1. TOP KPI COUNTERS */}
      <section className="admin-analytics-kpi-grid" aria-label="Executive KPI Counters">
        <div className="admin-analytics-kpi-card highlight">
          <div className="admin-analytics-kpi-top">
            <span className="admin-analytics-kpi-lbl">Total Published Listings</span>
            <SiteIcon name="check-circle" size={18} />
          </div>
          <div className="admin-analytics-kpi-val">{summary?.totalPublished ?? 0}</div>
          <div className="admin-analytics-kpi-footer">
            <SiteIcon name="globe" size={13} />
            <span>Live &amp; queryable on public website</span>
          </div>
        </div>

        <div className="admin-analytics-kpi-card">
          <div className="admin-analytics-kpi-top">
            <span className="admin-analytics-kpi-lbl">Pending Review Queue</span>
            <SiteIcon name="clock" size={18} />
          </div>
          <div className="admin-analytics-kpi-val" style={{ color: (summary?.pendingCount ?? 0) > 0 ? '#f59e0b' : undefined }}>
            {summary?.pendingCount ?? 0}
          </div>
          <div className="admin-analytics-kpi-footer">
            <span>Awaiting initial editorial triage</span>
          </div>
        </div>

        <div className="admin-analytics-kpi-card">
          <div className="admin-analytics-kpi-top">
            <span className="admin-analytics-kpi-lbl">Approved for Publication</span>
            <SiteIcon name="badge-check" size={18} />
          </div>
          <div className="admin-analytics-kpi-val" style={{ color: '#38bdf8' }}>
            {summary?.approvedCount ?? 0}
          </div>
          <div className="admin-analytics-kpi-footer">
            <span>Editorial approval cleared; ready to publish</span>
          </div>
        </div>

        <div className="admin-analytics-kpi-card">
          <div className="admin-analytics-kpi-top">
            <span className="admin-analytics-kpi-lbl">Active Ingested Cities</span>
            <SiteIcon name="map-pin" size={18} />
          </div>
          <div className="admin-analytics-kpi-val">
            {summary?.cityBreakdown ? Object.keys(summary.cityBreakdown).length : 0}
          </div>
          <div className="admin-analytics-kpi-footer">
            <span>Geographic footprint across India</span>
          </div>
        </div>
      </section>

      {periodComparison && (
        <section
          className="admin-period-compare-strip"
          data-testid="analytics-period-comparison-strip"
          aria-label="Period-over-Period Compliance Comparison"
        >
          <div className="admin-period-compare-header">
            <span className="admin-period-compare-title">
              Period Comparison · <strong>{heatmapMatrix.dateWindow.label}</strong> vs.{' '}
              <span className="tabular-nums">
                {periodComparison.previousWindow.startDateIso} → {periodComparison.previousWindow.endDateIso}
              </span>
            </span>
            <button
              type="button"
              className="admin-period-compare-dismiss"
              onClick={() => setComparePreviousPeriod(false)}
            >
              Disable comparison
            </button>
          </div>
          <div className="admin-period-compare-grid">
            <div className="admin-period-compare-cell">
              <span className="admin-period-compare-label">Regulatory Signals</span>
              <div className="admin-period-compare-values tabular-nums">
                <strong>{periodComparison.totalSignals.current}</strong>
                <span className="admin-period-compare-prev">
                  prev {periodComparison.totalSignals.previous}
                </span>
                <span
                  className={`admin-period-delta is-${periodComparison.totalSignals.direction}`}
                  data-testid="compare-delta-signals"
                >
                  {formatPeriodDeltaBadge(periodComparison.totalSignals)}
                </span>
              </div>
            </div>
            <div className="admin-period-compare-cell">
              <span className="admin-period-compare-label">High-Risk Active</span>
              <div className="admin-period-compare-values tabular-nums">
                <strong>{periodComparison.highRiskSignals.current}</strong>
                <span className="admin-period-compare-prev">
                  prev {periodComparison.highRiskSignals.previous}
                </span>
                <span
                  className={`admin-period-delta is-${periodComparison.highRiskSignals.direction}`}
                  data-testid="compare-delta-high-risk"
                >
                  {formatPeriodDeltaBadge(periodComparison.highRiskSignals)}
                </span>
              </div>
            </div>
            <div className="admin-period-compare-cell">
              <span className="admin-period-compare-label">Severity Exposure Score</span>
              <div className="admin-period-compare-values tabular-nums">
                <strong>{periodComparison.totalRiskScore.current}</strong>
                <span className="admin-period-compare-prev">
                  prev {periodComparison.totalRiskScore.previous}
                </span>
                <span
                  className={`admin-period-delta is-${periodComparison.totalRiskScore.direction}`}
                  data-testid="compare-delta-risk-score"
                >
                  {formatPeriodDeltaBadge(periodComparison.totalRiskScore)}
                </span>
              </div>
            </div>
            <div className="admin-period-compare-cell">
              <span className="admin-period-compare-label">Regions with Active Risk</span>
              <div className="admin-period-compare-values tabular-nums">
                <strong>{periodComparison.affectedRegions.current}</strong>
                <span className="admin-period-compare-prev">
                  prev {periodComparison.affectedRegions.previous}
                </span>
                <span
                  className={`admin-period-delta is-${periodComparison.affectedRegions.direction}`}
                  data-testid="compare-delta-regions"
                >
                  {formatPeriodDeltaBadge(periodComparison.affectedRegions)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. D3 COMPLIANCE RISK HEATMAP (REGIONS × PARTNER CATEGORIES / INCIDENT TYPES) */}
      <AdminComplianceHeatmap
        refreshKey={lastRefreshedAt.getTime()}
        drilldown={drilldown}
        onDrilldownChange={handleDrilldownChange}
        mode={heatmapMode}
        onModeChange={setHeatmapMode}
        scope={heatmapScope}
        onScopeChange={setHeatmapScope}
        dateRange={dateRange}
        comparePreviousPeriod={comparePreviousPeriod}
      />

      {/* 2B. REGULATED ENTITIES INVESTIGATION TABLE (FILTERED LIVE BY HEATMAP DRILLDOWN) */}
      <section
        className="admin-analytics-card admin-drilldown-entities-section"
        data-testid="drilldown-entities-section"
        aria-label="Regulated Entities Compliance Roster"
      >
        <div className="admin-analytics-card-header admin-drilldown-header-wrap">
          <div>
            <h3>Regulated Entities &amp; Incident Roster</h3>
            <p className="admin-drilldown-subtitle">
              {drilldownActive
                ? `Filtered live from Compliance Risk Heatmap · showing ${filteredEntityRows.length} of ${entityRows.length} entities.`
                : `All ${entityRows.length} monitored partner entities ranked by severity-weighted compliance exposure. Click any region, category, or cell above to drill down.`}
            </p>
          </div>

          <div className="admin-drilldown-tools">
            <input
              type="search"
              placeholder="Search entity, ref, city, issue…"
              value={entitySearch}
              onChange={e => setEntitySearch(e.target.value)}
              className="admin-drilldown-search"
              data-testid="drilldown-entity-search"
              aria-label="Search regulated entities"
            />
            <button
              type="button"
              className="admin-drilldown-export-btn"
              onClick={() => handleExportComplianceCsv('combined')}
              data-testid="export-drilldown-csv-btn"
              title="Download filtered heatmap and drill-down entity data as CSV"
            >
              <SiteIcon name="download" size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Active Heatmap Drilldown Scope Bar */}
        {drilldownActive && (
          <div
            className="admin-drilldown-scope-bar"
            data-testid="analytics-drilldown-bar"
            role="status"
          >
            <div className="admin-drilldown-tokens">
              <span className="admin-drilldown-scope-label">Active Drilldown:</span>

              {drilldown.region && (
                <button
                  type="button"
                  className="admin-drilldown-token"
                  data-testid="drilldown-token-region"
                  onClick={() =>
                    handleDrilldownChange({ ...drilldown, region: null })
                  }
                  title="Remove region filter"
                >
                  <span>Region: <strong>{drilldown.region}</strong></span>
                  <span aria-hidden="true" className="admin-drilldown-token-x">×</span>
                </button>
              )}

              {drilldown.partnerCategory && (
                <button
                  type="button"
                  className="admin-drilldown-token"
                  data-testid="drilldown-token-category"
                  onClick={() =>
                    handleDrilldownChange({ ...drilldown, partnerCategory: null })
                  }
                  title="Remove partner category filter"
                >
                  <span>
                    Category: <strong>{getPartnerCategoryLabel(drilldown.partnerCategory)}</strong>
                  </span>
                  <span aria-hidden="true" className="admin-drilldown-token-x">×</span>
                </button>
              )}

              {drilldown.incidentType && (
                <button
                  type="button"
                  className="admin-drilldown-token"
                  data-testid="drilldown-token-incident"
                  onClick={() =>
                    handleDrilldownChange({ ...drilldown, incidentType: null })
                  }
                  title="Remove incident type filter"
                >
                  <span>
                    Incident: <strong>{getIncidentTypeLabel(drilldown.incidentType)}</strong>
                  </span>
                  <span aria-hidden="true" className="admin-drilldown-token-x">×</span>
                </button>
              )}
            </div>

            <div className="admin-drilldown-scope-right">
              <span className="admin-drilldown-match-count" data-testid="drilldown-match-count">
                {filteredEntityRows.length}{' '}
                {filteredEntityRows.length === 1 ? 'entity' : 'entities'} ·{' '}
                {filteredQueue.length} queue · {filteredActivity.length} activity
              </span>
              <button
                type="button"
                className="admin-drilldown-clear-btn"
                data-testid="clear-drilldown-btn"
                onClick={() => handleDrilldownChange(EMPTY_DRILLDOWN_FILTER)}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-bulk-table admin-entities-table" data-testid="drilldown-entities-table">
            <thead>
              <tr>
                <th>Entity &amp; Reference</th>
                <th>Partner Category</th>
                <th>Region / City</th>
                <th>Risk Score</th>
                <th>Signals</th>
                <th>Latest Compliance Issue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntityRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty-cell">
                    No regulated entities match the current drilldown filter.{' '}
                    {drilldownActive && (
                      <button
                        type="button"
                        className="admin-inline-reset-btn"
                        onClick={() => handleDrilldownChange(EMPTY_DRILLDOWN_FILTER)}
                      >
                        Reset heatmap filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredEntityRows.map(row => (
                  <tr
                    key={row.id}
                    data-testid="drilldown-entity-row"
                    data-entity-region={row.region}
                    data-entity-category={row.partnerCategory}
                  >
                    <td>
                      <div className="admin-entity-name">{row.entityName}</div>
                      <div className="admin-entity-sub">
                        <span className="admin-entity-ref">{row.referenceCode}</span>
                        <span>·</span>
                        <span>{row.sport}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-table-filter-trigger"
                        onClick={() =>
                          handleDrilldownChange({
                            region: drilldown.region,
                            partnerCategory: row.partnerCategory,
                            incidentType: null,
                          })
                        }
                        title={`Filter by ${row.partnerCategoryLabel}`}
                      >
                        {row.partnerCategoryLabel}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-table-filter-trigger"
                        onClick={() =>
                          handleDrilldownChange({
                            region: row.region,
                            partnerCategory: drilldown.partnerCategory,
                            incidentType: drilldown.incidentType,
                          })
                        }
                        title={`Filter by ${row.region}`}
                      >
                        <strong>{row.region}</strong>
                      </button>
                      <div className="admin-entity-sub">{row.city}</div>
                    </td>
                    <td>
                      <span className={`admin-risk-readout tier-${row.riskTier}`}>
                        <strong>{row.riskScore}</strong>
                        <span>{formatRiskTierLabel(row.riskTier)}</span>
                      </span>
                    </td>
                    <td className="admin-tabular-cell">
                      {row.signalCount > 0 ? (
                        <>
                          <strong>{row.signalCount}</strong>
                          {row.highRiskCount > 0 && (
                            <span className="admin-high-risk-note"> ({row.highRiskCount} high)</span>
                          )}
                        </>
                      ) : (
                        <span className="admin-muted-val">0</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-issue-summary">{row.latestIssueSummary}</div>
                      <div className="admin-entity-sub" style={{ textTransform: 'capitalize' }}>
                        Status: {row.lifecycleStatus}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-entity-desk-btn"
                        onClick={() => handleOpenEntityDesk(row.targetWorkspace)}
                      >
                        Investigate →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. DUAL METRICS: SPORTS DISTRIBUTION & ACTIVE CITIES */}
      <div className="admin-analytics-dual-section">
        {/* Sports Segmentation Meter */}
        <section className="admin-analytics-card" aria-label="Sports Distribution">
          <div className="admin-analytics-card-header">
            <h3>Live Listings by Sport</h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Segmented breakdown</span>
          </div>

          <div className="admin-sports-meter-list">
            {summary?.sportsBreakdown && Object.entries(summary.sportsBreakdown).map(([sport, count]) => {
              const pct = maxSportVal > 0 ? Math.round((count / maxSportVal) * 100) : 0
              const lower = sport.toLowerCase()
              return (
                <div key={sport} className="admin-sports-meter-item">
                  <div className="admin-sports-meter-info">
                    <span>{sport}</span>
                    <span>{count} listings</span>
                  </div>
                  <div className="admin-sports-meter-bar-track">
                    <div
                      className={`admin-sports-meter-bar-fill ${lower}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Active Cities & Category Mix */}
        <section className="admin-analytics-card" aria-label="Cities and Categories">
          <div className="admin-analytics-card-header">
            <h3>Geographic Distribution &amp; Categories</h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Coverage matrix</span>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>
              Active Cities (click to filter region)
            </span>
            <div className="admin-city-badge-grid">
              {summary?.cityBreakdown && Object.entries(summary.cityBreakdown).map(([city, count]) => {
                const cityRegion = normalizeComplianceRegion(city)
                const isSelected = drilldown.region === cityRegion
                return (
                  <button
                    key={city}
                    type="button"
                    className={`admin-city-badge admin-city-badge-btn ${isSelected ? 'is-drilldown-active' : ''}`}
                    onClick={() =>
                      handleDrilldownChange({
                        region: isSelected ? null : cityRegion,
                        partnerCategory: drilldown.partnerCategory,
                        incidentType: drilldown.incidentType,
                      })
                    }
                  >
                    <SiteIcon name="map-pin" size={11} />
                    <span>{city}</span>
                    <span className="admin-city-count">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem' }}>
              Category Breakdown (click to filter category)
            </span>
            <div className="admin-city-badge-grid">
              {summary?.categoryBreakdown && Object.entries(summary.categoryBreakdown).map(([cat, count]) => {
                const normalizedCat = normalizePartnerCategory(cat)
                const isSelected = drilldown.partnerCategory === normalizedCat
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`admin-city-badge admin-city-badge-btn ${isSelected ? 'is-drilldown-active' : ''}`}
                    style={{ textTransform: 'capitalize' }}
                    onClick={() =>
                      handleDrilldownChange({
                        region: drilldown.region,
                        partnerCategory: isSelected ? null : normalizedCat,
                        incidentType: null,
                      })
                    }
                  >
                    <span>{cat.replace(/_/g, ' ')}</span>
                    <span className="admin-city-count">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      {/* 3. MODERATOR ACTIVITY FEED */}
      <section
        className="admin-analytics-card"
        style={{ marginBottom: '2rem' }}
        aria-label="Moderator Activity Feed"
        data-testid="analytics-activity-section"
      >
        <div className="admin-analytics-card-header">
          <div>
            <div className="admin-section-title-inline">
              <h3>Moderator Activity Feed</h3>
              {(drilldown.region || drilldown.partnerCategory) && (
                <span className="admin-drilldown-sync-tag" data-testid="activity-drilldown-badge">
                  Heatmap filter active ({filteredActivity.length})
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Real-time chronological audit trail of publications, approvals, verifications, and decisions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Filter activity by title, city, code…"
              value={activitySearch}
              onChange={e => setActivitySearch(e.target.value)}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.3)' }}
            />
          </div>
        </div>

        {/* Activity Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {(['all', 'published', 'approved', 'evidence', 'corrections', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              className={`admin-analytics-btn ${activityFilter === tab ? 'admin-analytics-btn-primary' : 'admin-analytics-btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              onClick={() => setActivityFilter(tab)}
            >
              {tab === 'all' ? 'All Activity' : tab.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Activity List */}
        {filteredActivity.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No recent activity records match the selected filter.</p>
        ) : (
          <div className="admin-activity-feed">
            {filteredActivity.map(item => (
              <article key={item.id} className="admin-activity-item">
                <span className={`admin-activity-pill ${item.action}`}>
                  {item.action.replace(/_/g, ' ')}
                </span>

                <div className="admin-activity-details">
                  <div className="admin-activity-target">
                    <span style={{ fontFamily: 'monospace', color: '#0284c7', fontSize: '0.8rem' }}>{item.reference_number}</span>
                    <span>·</span>
                    <span>{item.listing_title}</span>
                    <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(148, 163, 184, 0.15)', textTransform: 'uppercase' }}>
                      {item.listing_type}
                    </span>
                    {item.city && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({item.city})</span>
                    )}
                  </div>

                  {item.notes && <p className="admin-activity-notes">{item.notes}</p>}

                  {item.from_status && item.to_status && (
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      Transition: {item.from_status} → {item.to_status}
                    </span>
                  )}
                </div>

                <time className="admin-activity-time">
                  {new Date(item.created_at).toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 4. BULK MODERATION & QUICK-ACTION CONSOLE */}
      <section
        className="admin-bulk-section"
        aria-label="Bulk Moderation Console"
        data-testid="analytics-bulk-section"
      >
        <div className="admin-analytics-card-header">
          <div>
            <div className="admin-section-title-inline">
              <h3>Bulk Moderation Actions &amp; Fast Tagging</h3>
              {(drilldown.region || drilldown.partnerCategory) && (
                <span className="admin-drilldown-sync-tag" data-testid="bulk-drilldown-badge">
                  Heatmap filter active ({filteredQueue.length})
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Quick-tag sports and cities, bulk approve high-volume tournament submissions, and publish in batch.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem' }}>
              Filter Status:
              <select
                value={bulkStatusFilter}
                onChange={e => { setBulkStatusFilter(e.target.value); setSelectedIds(new Set()) }}
                style={{ marginLeft: '0.35rem', padding: '0.3rem 0.5rem', borderRadius: 6, fontSize: '0.8rem' }}
              >
                <option value="all">All Submissions</option>
                <option value="pending_review">Pending Review</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved (Ready to Publish)</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
        </div>

        {/* Bulk Action Sticky Bar */}
        <div className="admin-bulk-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 650, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedIds.size === filteredQueue.length && filteredQueue.length > 0}
                onChange={toggleSelectAll}
              />
              Select All Filtered ({filteredQueue.length})
            </label>

            {selectedIds.size > 0 && (
              <span style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 700 }}>
                {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          <div className="admin-bulk-actions">
            <button
              type="button"
              className="admin-analytics-btn admin-analytics-btn-secondary"
              disabled={selectedIds.size === 0 || isProcessingBulk}
              onClick={() => setShowTagModal(true)}
            >
              <SiteIcon name="edit" size={13} />
              Quick-Tag Sport &amp; City ({selectedIds.size})
            </button>

            <button
              type="button"
              className="admin-analytics-btn admin-analytics-btn-secondary"
              disabled={selectedIds.size === 0 || isProcessingBulk}
              onClick={() => setShowApproveModal(true)}
              style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
            >
              <SiteIcon name="badge-check" size={13} />
              Bulk Approve ({selectedIds.size})
            </button>

            <button
              type="button"
              className="admin-analytics-btn admin-analytics-btn-primary"
              disabled={selectedIds.size === 0 || isProcessingBulk}
              onClick={() => setShowPublishModal(true)}
            >
              <SiteIcon name="arrow-up-right" size={13} />
              Bulk Live Publish ({selectedIds.size})
            </button>

            {selectedIds.size > 0 && (
              <button
                type="button"
                className="admin-analytics-btn admin-analytics-btn-secondary"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Batch Execution Feedback */}
        {isProcessingBulk && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: 8, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SiteIcon name="loader" size={16} />
            <strong style={{ fontSize: '0.85rem' }}>{bulkProgress}</strong>
          </div>
        )}

        {/* Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-bulk-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredQueue.length && filteredQueue.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Reference</th>
                <th>Category</th>
                <th>Listing Title</th>
                <th>City</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty-cell">
                    No moderation submissions match the active filters.{' '}
                    {(drilldown.region || drilldown.partnerCategory) && (
                      <button
                        type="button"
                        className="admin-inline-reset-btn"
                        onClick={() => handleDrilldownChange(EMPTY_DRILLDOWN_FILTER)}
                      >
                        Reset heatmap filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredQueue.map(item => {
                  const isSelected = selectedIds.has(item.id)
                  return (
                    <tr
                      key={item.id}
                      data-testid="bulk-queue-row"
                      style={{ background: isSelected ? 'rgba(56, 189, 248, 0.08)' : undefined }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                        />
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                        {item.reference_number}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: 4, background: 'rgba(148, 163, 184, 0.15)', textTransform: 'capitalize' }}>
                          {item.listing_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 650 }}>{item.title}</td>
                      <td>{item.city || 'Delhi'}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', background: item.status === 'published' ? 'rgba(16, 185, 129, 0.15)' : item.status === 'approved' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: item.status === 'published' ? '#10b981' : item.status === 'approved' ? '#38bdf8' : '#f59e0b' }}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        {new Date(item.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL 1: Bulk Tag Sport & City */}
      {showTagModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ maxWidth: 440, width: '100%', background: '#0b192c', color: '#f8fafc', padding: '1.5rem', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Quick-Tag Sport &amp; City</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Apply category attributes simultaneously to <strong>{selectedIds.size} selected listings</strong>.
            </p>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
              Sport:
              <select
                value={bulkTagSport}
                onChange={e => setBulkTagSport(e.target.value)}
                style={{ width: '100%', padding: '0.45rem', marginTop: '0.25rem', background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 6 }}
              >
                <option value="">-- Choose Sport --</option>
                <option value="Cricket">Cricket</option>
                <option value="Football">Football</option>
                <option value="Badminton">Badminton</option>
                <option value="Turf Cricket">Turf Cricket</option>
                <option value="Basketball">Basketball</option>
                <option value="Athletics">Athletics</option>
                <option value="Tennis">Tennis</option>
                <option value="Pickleball">Pickleball</option>
                <option value="Swimming">Swimming</option>
                <option value="Multi-sport">Multi-sport Turf</option>
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              City:
              <input
                type="text"
                value={bulkTagCity}
                onChange={e => setBulkTagCity(e.target.value)}
                placeholder="e.g. Delhi, Bengaluru, Mumbai"
                style={{ width: '100%', padding: '0.45rem', marginTop: '0.25rem', background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 6 }}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-analytics-btn admin-analytics-btn-primary"
                onClick={() => void handleExecuteBulkTag()}
                disabled={!bulkTagSport && !bulkTagCity}
              >
                Apply Tags to {selectedIds.size} Listings
              </button>
              <button
                type="button"
                className="admin-analytics-btn admin-analytics-btn-secondary"
                onClick={() => setShowTagModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk Approve */}
      {showApproveModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ maxWidth: 440, width: '100%', background: '#0b192c', color: '#f8fafc', padding: '1.5rem', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Confirm Bulk Approval</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Are you sure you want to approve <strong>{selectedIds.size} listings</strong> for catalogue publication?
            </p>
            <label style={{ display: 'block', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              Internal Staff Note (optional):
              <textarea
                rows={2}
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                placeholder="e.g. Tournament batch approved by desk"
                style={{ width: '100%', padding: '0.45rem', marginTop: '0.25rem', background: '#1e293b', color: '#f8fafc', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 6 }}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-analytics-btn admin-analytics-btn-primary"
                onClick={() => void handleExecuteBulkApprove()}
              >
                Confirm Approval ({selectedIds.size})
              </button>
              <button
                type="button"
                className="admin-analytics-btn admin-analytics-btn-secondary"
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Bulk Live Publish */}
      {showPublishModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ maxWidth: 460, width: '100%', background: '#0b192c', color: '#f8fafc', padding: '1.5rem', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Confirm Bulk Live Publication</h3>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
              This will automatically satisfy verification quality gates and insert live records for all approved items among the <strong>{selectedIds.size} selected listings</strong> directly into public tables.
            </p>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.78rem', color: '#38bdf8' }}>
              Smart category defaults will be auto-applied for sport, venue, host, and schedule.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-analytics-btn admin-analytics-btn-primary"
                onClick={() => void handleExecuteBulkPublish()}
              >
                Publish Live to Public Website
              </button>
              <button
                type="button"
                className="admin-analytics-btn admin-analytics-btn-secondary"
                onClick={() => setShowPublishModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
