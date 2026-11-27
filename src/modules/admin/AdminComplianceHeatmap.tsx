import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { getAdminTrustSafetyCases } from '../../../apps/admin/src/services/adminTrustSafetyService'
import { getAdminVerifications } from '../../../apps/admin/src/services/adminVerificationService'
import { getAdminTenants } from '../../../apps/admin/src/services/adminTenantService'
import { subscribeRegulatoryState } from '../../shared/governance/regulatoryBridge'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  buildComplianceHeatmapMatrix,
  buildComplianceSignals,
  classifyComplianceRiskTier,
  computePeriodComparisonMetrics,
  DEFAULT_COMPLIANCE_DATE_RANGE,
  EMPTY_DRILLDOWN_FILTER,
  filterSignalsByDateRange,
  formatRiskTierLabel,
  formatTrendDeltaLabel,
  getIncidentTypeLabel,
  getPartnerCategoryLabel,
  hasActiveDrilldown,
  matchesSignalDrilldown,
  type ComplianceDateRange,
  type ComplianceRiskTier,
  type ComplianceSignalRecord,
  type HeatmapAxisItem,
  type HeatmapCellDatum,
  type HeatmapDrilldownFilter,
  type HeatmapMatrixMode,
  type HeatmapSignalScope,
  type IncidentTypeKey,
  type PartnerCategoryKey,
  type Region30DayTrend,
} from './complianceHeatmapData'
import './AdminComplianceHeatmap.css'

export interface AdminComplianceHeatmapProps {
  refreshKey?: number
  drilldown?: HeatmapDrilldownFilter
  onDrilldownChange?: (next: HeatmapDrilldownFilter) => void
  mode?: HeatmapMatrixMode
  onModeChange?: (next: HeatmapMatrixMode) => void
  scope?: HeatmapSignalScope
  onScopeChange?: (next: HeatmapSignalScope) => void
  dateRange?: ComplianceDateRange
  comparePreviousPeriod?: boolean
}

function readIsDarkTheme(): boolean {
  if (typeof document === 'undefined') return true
  const root = document.documentElement
  const adminTheme = root.getAttribute('data-admin-theme')
  if (adminTheme === 'light') return false
  if (adminTheme === 'dark' || adminTheme === 'cosmic') return true
  if (root.classList.contains('dark')) return true
  return root.getAttribute('data-theme') === 'dark'
}

function getSourceDeskLabel(source: ComplianceSignalRecord['sourceDesk']): string {
  switch (source) {
    case 'trust_safety':
      return 'Trust & Safety'
    case 'verification_vault':
      return 'Verification Vault'
    case 'tenant_governance':
      return 'Tenant Governance'
  }
}

export function AdminComplianceHeatmap({
  refreshKey = 0,
  drilldown,
  onDrilldownChange,
  mode: controlledMode,
  onModeChange,
  scope: controlledScope,
  onScopeChange,
  dateRange = DEFAULT_COMPLIANCE_DATE_RANGE,
  comparePreviousPeriod = false,
}: AdminComplianceHeatmapProps) {
  const [signals, setSignals] = useState<ComplianceSignalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [internalMode, setInternalMode] = useState<HeatmapMatrixMode>('partner_category')
  const [internalScope, setInternalScope] = useState<HeatmapSignalScope>('all')
  const [internalDrilldown, setInternalDrilldown] = useState<HeatmapDrilldownFilter>(
    EMPTY_DRILLDOWN_FILTER,
  )
  const [hoveredCell, setHoveredCell] = useState<{
    cell: HeatmapCellDatum
    x: number
    y: number
  } | null>(null)
  const [hoveredTrend, setHoveredTrend] = useState<{
    row: HeatmapAxisItem
    trend: Region30DayTrend
    x: number
    y: number
  } | null>(null)
  const [isDark, setIsDark] = useState<boolean>(readIsDarkTheme)
  const [containerWidth, setContainerWidth] = useState<number>(820)

  const mode = controlledMode ?? internalMode
  const scope = controlledScope ?? internalScope

  const setMode = useCallback(
    (next: HeatmapMatrixMode) => {
      if (onModeChange) {
        onModeChange(next)
      } else {
        setInternalMode(next)
      }
    },
    [onModeChange],
  )

  const setScope = useCallback(
    (next: HeatmapSignalScope) => {
      if (onScopeChange) {
        onScopeChange(next)
      } else {
        setInternalScope(next)
      }
    },
    [onScopeChange],
  )

  const activeDrilldown = drilldown ?? internalDrilldown
  const setDrilldown = useCallback(
    (next: HeatmapDrilldownFilter) => {
      if (onDrilldownChange) {
        onDrilldownChange(next)
      } else {
        setInternalDrilldown(next)
      }
    },
    [onDrilldownChange],
  )

  const chartWrapRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Load real regulatory signals across Trust & Safety, Verification Vault, and Tenant Governance
  const loadRegulatorySignals = useCallback(async () => {
    setLoading(true)
    try {
      const [tsResult, verifications, tenants] = await Promise.all([
        getAdminTrustSafetyCases().catch(() => ({ cases: [] })),
        Promise.resolve(getAdminVerifications()),
        Promise.resolve(getAdminTenants()),
      ])

      const aggregated = buildComplianceSignals({
        incidents: tsResult.cases,
        verifications,
        tenants,
      })
      setSignals(aggregated)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRegulatorySignals()
    return subscribeRegulatoryState(() => {
      void loadRegulatorySignals()
    })
  }, [loadRegulatorySignals, refreshKey])

  // Watch light/dark theme attribute toggles so D3 SVG fills and ink contrast update immediately
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
    const syncTheme = () => setIsDark(readIsDarkTheme())
    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-admin-theme', 'data-theme', 'class'],
    })
    return () => observer.disconnect()
  }, [])

  // Measure SVG container width cleanly
  useEffect(() => {
    const el = chartWrapRef.current
    if (!el) return
    const updateWidth = () => {
      const next = Math.max(660, Math.floor(el.getBoundingClientRect().width))
      setContainerWidth(next)
    }
    updateWidth()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(updateWidth)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const matrix = useMemo(
    () => buildComplianceHeatmapMatrix(signals, mode, scope, dateRange),
    [signals, mode, scope, dateRange],
  )

  const periodComparison = useMemo(
    () =>
      comparePreviousPeriod
        ? computePeriodComparisonMetrics(signals, matrix)
        : null,
    [comparePreviousPeriod, signals, matrix],
  )

  const isDrilldownActive = hasActiveDrilldown(activeDrilldown)

  // Scoped signals matching current heatmap date range + scope filter (all / trust_safety / high_risk_only)
  const scopedSignals = useMemo(() => {
    const dateFiltered = filterSignalsByDateRange(signals, dateRange, matrix.dateWindow)
    return dateFiltered.filter(sig => {
      if (scope === 'trust_safety') return sig.sourceDesk === 'trust_safety'
      if (scope === 'high_risk_only') return sig.isHighRisk
      return true
    })
  }, [signals, dateRange, matrix.dateWindow, scope])

  // Determine the highest-risk cell for default preview when no drilldown filter is active
  const previewCell: HeatmapCellDatum | null = useMemo(() => {
    const highest = [...matrix.cells]
      .filter(c => c.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore)[0]
    return highest ?? matrix.cells[0] ?? null
  }, [matrix])

  // Toggle handlers for Region axis, Column axis, and Cell clicks
  const handleToggleRegionDrilldown = useCallback(
    (regionKey: string) => {
      const isExactSame =
        activeDrilldown.region === regionKey &&
        activeDrilldown.partnerCategory === null &&
        activeDrilldown.incidentType === null
      setDrilldown(
        isExactSame
          ? EMPTY_DRILLDOWN_FILTER
          : { region: regionKey, partnerCategory: null, incidentType: null },
      )
    },
    [activeDrilldown, setDrilldown],
  )

  const handleToggleColumnDrilldown = useCallback(
    (colKey: string) => {
      if (mode === 'partner_category') {
        const key = colKey as PartnerCategoryKey
        const isExactSame =
          activeDrilldown.region === null &&
          activeDrilldown.partnerCategory === key &&
          activeDrilldown.incidentType === null
        setDrilldown(
          isExactSame
            ? EMPTY_DRILLDOWN_FILTER
            : { region: null, partnerCategory: key, incidentType: null },
        )
      } else {
        const key = colKey as IncidentTypeKey
        const isExactSame =
          activeDrilldown.region === null &&
          activeDrilldown.partnerCategory === null &&
          activeDrilldown.incidentType === key
        setDrilldown(
          isExactSame
            ? EMPTY_DRILLDOWN_FILTER
            : { region: null, partnerCategory: null, incidentType: key },
        )
      }
    },
    [activeDrilldown, mode, setDrilldown],
  )

  const handleToggleCellDrilldown = useCallback(
    (cell: HeatmapCellDatum) => {
      if (mode === 'partner_category') {
        const key = cell.colKey as PartnerCategoryKey
        const isExactSame =
          activeDrilldown.region === cell.rowKey &&
          activeDrilldown.partnerCategory === key &&
          activeDrilldown.incidentType === null
        setDrilldown(
          isExactSame
            ? EMPTY_DRILLDOWN_FILTER
            : { region: cell.rowKey, partnerCategory: key, incidentType: null },
        )
      } else {
        const key = cell.colKey as IncidentTypeKey
        const isExactSame =
          activeDrilldown.region === cell.rowKey &&
          activeDrilldown.partnerCategory === null &&
          activeDrilldown.incidentType === key
        setDrilldown(
          isExactSame
            ? EMPTY_DRILLDOWN_FILTER
            : { region: cell.rowKey, partnerCategory: null, incidentType: key },
        )
      }
    },
    [activeDrilldown, mode, setDrilldown],
  )

  // Compute inspector summary for either the active drilldown (region, column, or cell) or default preview cell
  const inspectorView = useMemo<{
    kicker: string
    title: string
    riskScore: number
    tier: ComplianceRiskTier
    signalCount: number
    highRiskCount: number
    signals: ComplianceSignalRecord[]
    isFiltered: boolean
    emptySubject: string
  } | null>(() => {
    if (isDrilldownActive) {
      const matching = scopedSignals
        .filter(sig => matchesSignalDrilldown(sig, activeDrilldown))
        .sort((a, b) => b.riskPoints - a.riskPoints)
      const riskScore = matching.reduce((sum, s) => sum + s.riskPoints, 0)
      const highRiskCount = matching.filter(s => s.isHighRisk).length

      const colLabel = activeDrilldown.partnerCategory
        ? getPartnerCategoryLabel(activeDrilldown.partnerCategory)
        : activeDrilldown.incidentType
          ? getIncidentTypeLabel(activeDrilldown.incidentType)
          : null

      let kicker = 'Active Drilldown'
      let title = ''
      if (activeDrilldown.region && colLabel) {
        kicker = 'Cell Drilldown · Filtering Tables'
        title = `${activeDrilldown.region} · ${colLabel}`
      } else if (activeDrilldown.region) {
        kicker = 'Region Drilldown · Filtering Tables'
        title = activeDrilldown.region
      } else if (colLabel) {
        kicker = activeDrilldown.partnerCategory
          ? 'Partner Category Drilldown · Filtering Tables'
          : 'Incident Type Drilldown · Filtering Tables'
        title = colLabel
      }

      return {
        kicker,
        title,
        riskScore,
        tier: classifyComplianceRiskTier(riskScore),
        signalCount: matching.length,
        highRiskCount,
        signals: matching,
        isFiltered: true,
        emptySubject: title,
      }
    }

    if (!previewCell) return null
    return {
      kicker: 'Highest-Risk Cell Preview',
      title: `${previewCell.rowLabel} · ${previewCell.colLabel}`,
      riskScore: previewCell.riskScore,
      tier: previewCell.tier,
      signalCount: previewCell.signalCount,
      highRiskCount: previewCell.highRiskCount,
      signals: previewCell.signals,
      isFiltered: false,
      emptySubject: `${previewCell.colLabel} in ${previewCell.rowLabel}`,
    }
  }, [isDrilldownActive, scopedSignals, activeDrilldown, previewCell])

  // Count how many regions are rising or improving over the 30-day window
  const trendSummary = useMemo(() => {
    let rising = 0
    let improving = 0
    for (const row of matrix.rows) {
      if (row.trend30d?.direction === 'increasing') rising += 1
      else if (row.trend30d?.direction === 'decreasing') improving += 1
    }
    return { rising, improving }
  }, [matrix.rows])

  // Resolve the active region row to display its 30-day trajectory inside the right-hand inspector
  const inspectorRegionRow = useMemo<HeatmapAxisItem | null>(() => {
    const targetRegionKey = activeDrilldown.region ?? previewCell?.rowKey ?? null
    if (!targetRegionKey) return null
    return matrix.rows.find(r => r.key === targetRegionKey) ?? null
  }, [activeDrilldown.region, previewCell, matrix.rows])

  // D3 SVG rendering
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl || matrix.rows.length === 0 || matrix.columns.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const margin = { top: 52, right: 196, bottom: 52, left: 102 }
    const rowHeight = 54
    const innerWidth = Math.max(410, containerWidth - margin.left - margin.right)
    const innerHeight = matrix.rows.length * rowHeight
    const totalWidth = innerWidth + margin.left + margin.right
    const totalHeight = innerHeight + margin.top + margin.bottom

    svg
      .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
      .attr('width', '100%')
      .attr('height', totalHeight)

    const defs = svg.append('defs')
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const xScale = d3
      .scaleBand<string>()
      .domain(matrix.columns.map(c => c.key))
      .range([0, innerWidth])
      .padding(0.08)

    const yScale = d3
      .scaleBand<string>()
      .domain(matrix.rows.map(r => r.key))
      .range([0, innerHeight])
      .padding(0.12)

    const maxDomain = Math.max(matrix.maxCellRisk, 60)
    const colorScale = isDark
      ? d3
          .scaleLinear<string>()
          .domain([0, maxDomain * 0.25, maxDomain * 0.55, maxDomain * 0.8, maxDomain])
          .range(['#131c2e', '#1e3a5f', '#b45309', '#dc2626', '#991b1b'])
          .clamp(true)
      : d3
          .scaleLinear<string>()
          .domain([0, maxDomain * 0.25, maxDomain * 0.55, maxDomain * 0.8, maxDomain])
          .range(['#f1f5f9', '#dbeafe', '#f59e0b', '#ef4444', '#b91c1c'])
          .clamp(true)

    const colLabelByKey = new Map(matrix.columns.map(c => [c.key, c.label]))
    const axisTextColor = isDark ? '#cbd5e1' : '#334155'
    const axisActiveColor = isDark ? '#38bdf8' : '#0284c7'
    const mutedTextColor = isDark ? '#64748b' : '#94a3b8'
    const cellBorderColor = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)'
    const selectedStroke = isDark ? '#38bdf8' : '#0f172a'

    const activeColKey =
      mode === 'partner_category' ? activeDrilldown.partnerCategory : activeDrilldown.incidentType

    const isCellMatchedByDrilldown = (cell: HeatmapCellDatum): boolean => {
      if (!isDrilldownActive) return true
      if (activeDrilldown.region && cell.rowKey !== activeDrilldown.region) return false
      if (activeColKey && cell.colKey !== activeColKey) return false
      return true
    }

    const isCellSelectedOutline = (cell: HeatmapCellDatum): boolean => {
      if (isDrilldownActive) {
        if (activeDrilldown.region && activeColKey) {
          return cell.rowKey === activeDrilldown.region && cell.colKey === activeColKey
        }
        if (activeDrilldown.region && !activeColKey) {
          return cell.rowKey === activeDrilldown.region && cell.riskScore > 0
        }
        if (!activeDrilldown.region && activeColKey) {
          return cell.colKey === activeColKey && cell.riskScore > 0
        }
        return false
      }
      return previewCell?.id === cell.id
    }

    const splitHeaderLines = (label: string): string[] => {
      if (label.length <= 11) return [label]
      if (label.includes(' & ')) {
        const [left, right] = label.split(' & ')
        return [`${left} &`, right]
      }
      const parts = label.split(' ')
      if (parts.length >= 2) {
        return [parts[0], parts.slice(1).join(' ')]
      }
      return [label]
    }

    // Top X Axis (Clickable Partner Categories or Incident Types with full hit-target rects)
    const xHeaderGroup = g.append('g').attr('class', 'chm-axis chm-axis-x')
    const xBtnGroups = xHeaderGroup
      .selectAll<SVGGElement, (typeof matrix.columns)[number]>('.chm-x-axis-btn')
      .data(matrix.columns, d => d.key)
      .enter()
      .append('g')
      .attr('class', d =>
        `chm-axis-btn chm-x-axis-btn ${activeColKey === d.key ? 'is-axis-selected' : ''}`,
      )
      .attr('transform', d => `translate(${xScale(d.key) ?? 0}, -44)`)
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('data-testid', d => `heatmap-col-${d.key}`)
      .attr('aria-pressed', d => (activeColKey === d.key ? 'true' : 'false'))
      .attr('aria-label', d => `Filter tables by ${d.label}`)
      .style('cursor', 'pointer')
      .on('click', (_event: MouseEvent, d) => handleToggleColumnDrilldown(d.key))
      .on('keydown', (event: KeyboardEvent, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleToggleColumnDrilldown(d.key)
        }
      })

    xBtnGroups
      .append('rect')
      .attr('class', 'chm-axis-hit')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', xScale.bandwidth())
      .attr('height', 36)
      .attr('rx', 6)
      .attr('fill', d =>
        activeColKey === d.key
          ? isDark
            ? 'rgba(56, 189, 248, 0.16)'
            : 'rgba(14, 165, 233, 0.12)'
          : 'transparent',
      )
      .attr('stroke', d =>
        activeColKey === d.key
          ? isDark
            ? 'rgba(56, 189, 248, 0.5)'
            : 'rgba(2, 132, 199, 0.45)'
          : 'transparent',
      )

    xBtnGroups.each(function (d) {
      const grp = d3.select(this)
      const label = colLabelByKey.get(d.key) || d.label
      const lines = splitHeaderLines(label)
      const isSelectedCol = activeColKey === d.key
      const txt = grp
        .append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('fill', isSelectedCol ? axisActiveColor : axisTextColor)
        .style('font-size', '11.5px')
        .style('font-weight', isSelectedCol ? '700' : '600')
        .style('font-family', 'inherit')

      if (lines.length === 1) {
        txt.attr('y', 22).text(lines[0])
      } else {
        txt.attr('y', 15)
        txt.append('tspan').attr('x', xScale.bandwidth() / 2).attr('dy', '0em').text(lines[0])
        txt.append('tspan').attr('x', xScale.bandwidth() / 2).attr('dy', '1.25em').text(lines[1])
      }
    })

    // Left Y Axis (Clickable Regions with full hit-target rects for row-wide drilldown)
    const yHeaderGroup = g.append('g').attr('class', 'chm-axis chm-axis-y')
    const yBtnWidth = margin.left - 10
    const yBtnGroups = yHeaderGroup
      .selectAll<SVGGElement, (typeof matrix.rows)[number]>('.chm-y-axis-btn')
      .data(matrix.rows, d => d.key)
      .enter()
      .append('g')
      .attr('class', d =>
        `chm-axis-btn chm-y-axis-btn ${activeDrilldown.region === d.key ? 'is-axis-selected' : ''}`,
      )
      .attr('transform', d => `translate(${-margin.left + 2}, ${yScale(d.key) ?? 0})`)
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('data-testid', d => `heatmap-region-${d.key.toLowerCase().replace(/\s+/g, '-')}`)
      .attr('aria-pressed', d => (activeDrilldown.region === d.key ? 'true' : 'false'))
      .attr('aria-label', d => `Filter tables by region ${d.label}`)
      .style('cursor', 'pointer')
      .on('click', (_event: MouseEvent, d) => handleToggleRegionDrilldown(d.key))
      .on('keydown', (event: KeyboardEvent, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleToggleRegionDrilldown(d.key)
        }
      })

    yBtnGroups
      .append('rect')
      .attr('class', 'chm-axis-hit')
      .attr('x', 0)
      .attr('y', 4)
      .attr('width', yBtnWidth)
      .attr('height', Math.max(24, yScale.bandwidth() - 8))
      .attr('rx', 6)
      .attr('fill', d =>
        activeDrilldown.region === d.key
          ? isDark
            ? 'rgba(56, 189, 248, 0.16)'
            : 'rgba(14, 165, 233, 0.12)'
          : 'transparent',
      )
      .attr('stroke', d =>
        activeDrilldown.region === d.key
          ? isDark
            ? 'rgba(56, 189, 248, 0.5)'
            : 'rgba(2, 132, 199, 0.45)'
          : 'transparent',
      )

    yBtnGroups
      .append('text')
      .attr('x', yBtnWidth - 8)
      .attr('y', yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .style('pointer-events', 'none')
      .style('fill', d => (activeDrilldown.region === d.key ? axisActiveColor : axisTextColor))
      .style('font-size', '12px')
      .style('font-weight', d => (activeDrilldown.region === d.key ? '700' : '600'))
      .style('font-family', 'inherit')
      .text(d => d.label)

    // Right column header: Regional Total Risk
    g.append('text')
      .attr('x', innerWidth + 24)
      .attr('y', -14)
      .attr('text-anchor', 'middle')
      .attr('fill', mutedTextColor)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Total')

    // Subtle divider between Total and 30d Trend sparkline column
    g.append('line')
      .attr('x1', innerWidth + 48)
      .attr('x2', innerWidth + 48)
      .attr('y1', -26)
      .attr('y2', innerHeight)
      .attr('stroke', cellBorderColor)
      .attr('stroke-width', 1)

    // Dynamic Trend column header reflecting active date range window
    g.append('text')
      .attr('x', innerWidth + 58)
      .attr('y', -14)
      .attr('fill', mutedTextColor)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(`${matrix.dateWindow.shortLabel} Trend`)

    // Regional Total Risk values on the right (clickable to filter region)
    g.selectAll('.chm-row-total')
      .data(matrix.rows)
      .enter()
      .append('text')
      .attr('class', 'chm-row-total')
      .attr('x', innerWidth + 24)
      .attr('y', d => (yScale(d.key) ?? 0) + yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', d => {
        if (activeDrilldown.region === d.key) return axisActiveColor
        return d.totalRisk >= 60 ? (isDark ? '#fca5a5' : '#b91c1c') : axisTextColor
      })
      .attr('font-size', '12px')
      .attr('font-weight', d => (d.totalRisk > 0 || activeDrilldown.region === d.key ? '700' : '500'))
      .style('font-variant-numeric', 'tabular-nums')
      .style('cursor', 'pointer')
      .style('opacity', d =>
        activeDrilldown.region && activeDrilldown.region !== d.key ? 0.35 : 1,
      )
      .on('click', (_event: MouseEvent, d) => handleToggleRegionDrilldown(d.key))
      .text(d => (d.totalRisk > 0 ? String(d.totalRisk) : '0'))

    // D3 Dynamic Date-Window Trend Sparklines & Directional Deltas for Each Region
    const trendUpStroke = isDark ? '#f87171' : '#dc2626'
    const trendDownStroke = isDark ? '#34d399' : '#059669'
    const trendStableStroke = isDark ? '#64748b' : '#94a3b8'

    const trendGradients: { id: string; color: string }[] = [
      { id: isDark ? 'chm-spark-up-dark' : 'chm-spark-up-light', color: trendUpStroke },
      { id: isDark ? 'chm-spark-down-dark' : 'chm-spark-down-light', color: trendDownStroke },
      { id: isDark ? 'chm-spark-flat-dark' : 'chm-spark-flat-light', color: trendStableStroke },
    ]
    trendGradients.forEach(({ id, color }) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%')
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', isDark ? 0.28 : 0.22)
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.02)
    })

    const sparkXStart = 4
    const sparkWidth = 76
    const maxPointIndex = Math.max(1, (matrix.rows[0]?.trend30d?.points.length ?? 30) - 1)
    const sparkXScale = d3.scaleLinear().domain([0, maxPointIndex]).range([sparkXStart, sparkXStart + sparkWidth])
    const trendRowHeight = yScale.bandwidth()
    const sparkTop = 9
    const sparkBottom = trendRowHeight - 9

    const trendGroups = g
      .selectAll<SVGGElement, HeatmapAxisItem>('.chm-row-trend-group')
      .data(matrix.rows, d => d.key)
      .enter()
      .append('g')
      .attr('class', d =>
        `chm-row-trend-group ${activeDrilldown.region === d.key ? 'is-trend-selected' : ''}`,
      )
      .attr('transform', d => `translate(${innerWidth + 54}, ${yScale(d.key) ?? 0})`)
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('data-testid', d => `heatmap-trend-${d.key.toLowerCase().replace(/\s+/g, '-')}`)
      .attr('data-trend-direction', d => d.trend30d?.direction ?? 'stable')
      .attr(
        'aria-label',
        d =>
          `${d.label} 30-day trend: ${d.trend30d?.direction ?? 'stable'}, ${formatTrendDeltaLabel(d.trend30d)}`,
      )
      .style('cursor', 'pointer')
      .style('opacity', d =>
        activeDrilldown.region && activeDrilldown.region !== d.key ? 0.35 : 1,
      )

    // Hit-target backing plate for crisp hover/click feel
    trendGroups
      .append('rect')
      .attr('class', 'chm-trend-hit')
      .attr('x', 0)
      .attr('y', 2)
      .attr('width', 136)
      .attr('height', Math.max(24, trendRowHeight - 4))
      .attr('rx', 6)
      .attr('fill', d =>
        activeDrilldown.region === d.key
          ? isDark
            ? 'rgba(56, 189, 248, 0.12)'
            : 'rgba(14, 165, 233, 0.08)'
          : 'transparent',
      )
      .attr('stroke', d =>
        activeDrilldown.region === d.key
          ? isDark
            ? 'rgba(56, 189, 248, 0.45)'
            : 'rgba(2, 132, 199, 0.38)'
          : 'transparent',
      )

    trendGroups.each(function (row) {
      const grp = d3.select(this)
      const trend = row.trend30d
      if (!trend || trend.points.length === 0) return

      const isHighRiskRegion = row.totalRisk >= 42 || (row.highRiskCount ?? 0) > 0
      const strokeColor =
        trend.direction === 'increasing'
          ? trendUpStroke
          : trend.direction === 'decreasing'
            ? trendDownStroke
            : trendStableStroke
      const gradId =
        trend.direction === 'increasing'
          ? isDark
            ? 'chm-spark-up-dark'
            : 'chm-spark-up-light'
          : trend.direction === 'decreasing'
            ? isDark
              ? 'chm-spark-down-dark'
              : 'chm-spark-down-light'
            : isDark
              ? 'chm-spark-flat-dark'
              : 'chm-spark-flat-light'

      const prevTrend = periodComparison?.previousTrendsByRegion[row.key]
      const yMax = Math.max(trend.peakScore, prevTrend?.peakScore ?? 0, 20)
      const sparkYScale = d3.scaleLinear().domain([0, yMax]).range([sparkBottom, sparkTop])

      // Subtle baseline
      grp
        .append('line')
        .attr('x1', sparkXStart)
        .attr('x2', sparkXStart + sparkWidth)
        .attr('y1', sparkBottom)
        .attr('y2', sparkBottom)
        .attr('stroke', cellBorderColor)
        .attr('stroke-dasharray', '2,2')
        .style('pointer-events', 'none')

      // Area fill under the 30-day curve
      if (trend.peakScore > 0) {
        const areaGen = d3
          .area<(typeof trend.points)[number]>()
          .x(p => sparkXScale(p.dayIndex))
          .y0(sparkBottom)
          .y1(p => sparkYScale(p.score))
          .curve(d3.curveMonotoneX)

        grp
          .append('path')
          .datum(trend.points)
          .attr('d', areaGen)
          .attr('fill', `url(#${gradId})`)
          .style('pointer-events', 'none')
      }

      // Previous-period dashed comparison baseline series
      if (prevTrend && prevTrend.points.length > 0) {
        const prevMaxIdx = Math.max(1, prevTrend.points.length - 1)
        const prevXScale = d3
          .scaleLinear()
          .domain([0, prevMaxIdx])
          .range([sparkXStart, sparkXStart + sparkWidth])
        const prevLineGen = d3
          .line<(typeof prevTrend.points)[number]>()
          .x(p => prevXScale(p.dayIndex))
          .y(p => sparkYScale(p.score))
          .curve(d3.curveMonotoneX)

        grp
          .append('path')
          .datum(prevTrend.points)
          .attr('class', 'chm-prev-sparkline-path')
          .attr('data-testid', `prev-trend-line-${row.key.toLowerCase().replace(/\s+/g, '-')}`)
          .attr('d', prevLineGen)
          .attr('fill', 'none')
          .attr('stroke', isDark ? '#94a3b8' : '#64748b')
          .attr('stroke-width', 1.3)
          .attr('stroke-dasharray', '4,3')
          .attr('opacity', 0.85)
          .style('pointer-events', 'none')
      }

      // Main 30-day trend line
      const lineGen = d3
        .line<(typeof trend.points)[number]>()
        .x(p => sparkXScale(p.dayIndex))
        .y(p => sparkYScale(p.score))
        .curve(d3.curveMonotoneX)

      grp
        .append('path')
        .datum(trend.points)
        .attr('class', 'chm-sparkline-path')
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', strokeColor)
        .attr('stroke-width', isHighRiskRegion ? 2 : 1.5)
        .attr('stroke-linecap', 'round')
        .style('pointer-events', 'none')

      // Endpoint dot highlighting current day score
      const lastPt = trend.points[trend.points.length - 1]
      if (lastPt && trend.peakScore > 0) {
        grp
          .append('circle')
          .attr('cx', sparkXScale(lastPt.dayIndex))
          .attr('cy', sparkYScale(lastPt.score))
          .attr('r', isHighRiskRegion ? 3 : 2.3)
          .attr('fill', strokeColor)
          .style('pointer-events', 'none')
      }

      // Directional numeric delta label right of sparkline
      grp
        .append('text')
        .attr('x', 132)
        .attr('y', trendRowHeight / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', strokeColor)
        .attr('font-size', '11px')
        .attr('font-weight', trend.direction !== 'stable' ? '700' : '500')
        .style('font-variant-numeric', 'tabular-nums')
        .style('pointer-events', 'none')
        .text(formatTrendDeltaLabel(trend))
    })

    // Trend hover tooltip & click-to-drilldown handlers
    trendGroups
      .on('mouseenter', function (event: MouseEvent, row: HeatmapAxisItem) {
        if (!row.trend30d) return
        d3.select(this).style('opacity', 1)
        const wrapRect = chartWrapRef.current?.getBoundingClientRect()
        if (wrapRect) {
          setHoveredCell(null)
          setHoveredTrend({
            row,
            trend: row.trend30d,
            x: event.clientX - wrapRect.left,
            y: event.clientY - wrapRect.top,
          })
        }
      })
      .on('mousemove', function (event: MouseEvent, row: HeatmapAxisItem) {
        if (!row.trend30d) return
        const wrapRect = chartWrapRef.current?.getBoundingClientRect()
        if (wrapRect) {
          setHoveredTrend({
            row,
            trend: row.trend30d,
            x: event.clientX - wrapRect.left,
            y: event.clientY - wrapRect.top,
          })
        }
      })
      .on('mouseleave', function (_event: MouseEvent, row: HeatmapAxisItem) {
        d3.select(this).style(
          'opacity',
          activeDrilldown.region && activeDrilldown.region !== row.key ? 0.35 : 1,
        )
        setHoveredTrend(null)
      })
      .on('click', (_event: MouseEvent, row: HeatmapAxisItem) => {
        handleToggleRegionDrilldown(row.key)
      })
      .on('keydown', (event: KeyboardEvent, row: HeatmapAxisItem) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleToggleRegionDrilldown(row.key)
        }
      })

    // Heatmap Cells
    const cellGroups = g
      .selectAll<SVGGElement, HeatmapCellDatum>('.chm-cell-group')
      .data(matrix.cells, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'chm-cell-group')
      .attr('transform', d => `translate(${xScale(d.colKey) ?? 0}, ${yScale(d.rowKey) ?? 0})`)
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('data-testid', d => `heatmap-cell-${d.rowKey.toLowerCase().replace(/\s+/g, '-')}-${d.colKey}`)
      .attr('data-risk-score', d => String(d.riskScore))
      .attr('data-risk-tier', d => d.tier)
      .attr('data-drilldown-match', d => (isCellMatchedByDrilldown(d) ? 'true' : 'false'))
      .attr(
        'aria-label',
        d =>
          `Filter tables by ${d.rowLabel}, ${d.colLabel}: risk score ${d.riskScore}, ${formatRiskTierLabel(d.tier)}, ${d.signalCount} regulatory ${d.signalCount === 1 ? 'signal' : 'signals'}`,
      )
      .style('cursor', 'pointer')
      .style('opacity', d => (isCellMatchedByDrilldown(d) ? 1 : 0.3))

    const bw = xScale.bandwidth()
    const bh = yScale.bandwidth()

    cellGroups
      .append('rect')
      .attr('class', 'chm-cell-rect')
      .attr('width', bw)
      .attr('height', bh)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', d => (d.riskScore === 0 ? (isDark ? '#0f172a' : '#f8fafc') : colorScale(d.riskScore)))
      .attr('stroke', d => (isCellSelectedOutline(d) ? selectedStroke : cellBorderColor))
      .attr('stroke-width', d => (isCellSelectedOutline(d) ? 2 : 1))

    // Primary risk score figure inside cell
    cellGroups
      .append('text')
      .attr('x', bw / 2)
      .attr('y', d => (d.riskScore > 0 ? bh / 2 - 2 : bh / 2 + 4))
      .attr('text-anchor', 'middle')
      .attr('font-size', d => (d.riskScore > 0 ? '14px' : '12px'))
      .attr('font-weight', d => (d.riskScore > 0 ? '700' : '400'))
      .style('font-variant-numeric', 'tabular-nums')
      .style('pointer-events', 'none')
      .attr('fill', d => {
        if (d.riskScore === 0) return mutedTextColor
        const ratio = d.riskScore / maxDomain
        if (isDark) return '#f8fafc'
        return ratio >= 0.45 ? '#ffffff' : '#0f172a'
      })
      .text(d => (d.riskScore > 0 ? String(d.riskScore) : '—'))

    // Secondary compact count + tier line inside populated cells
    cellGroups
      .filter(d => d.riskScore > 0)
      .append('text')
      .attr('x', bw / 2)
      .attr('y', bh / 2 + 13)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .style('font-variant-numeric', 'tabular-nums')
      .style('pointer-events', 'none')
      .attr('fill', d => {
        const ratio = d.riskScore / maxDomain
        if (isDark) return 'rgba(248, 250, 252, 0.85)'
        return ratio >= 0.45 ? 'rgba(255, 255, 255, 0.9)' : '#334155'
      })
      .text(d =>
        bw < 104
          ? `${d.signalCount} · ${formatRiskTierLabel(d.tier)}`
          : `${d.signalCount} ${d.signalCount === 1 ? 'case' : 'cases'} · ${formatRiskTierLabel(d.tier)}`,
      )

    // Hover & Click interaction handlers
    cellGroups
      .on('mouseenter', function (event: MouseEvent, d: HeatmapCellDatum) {
        d3.select(this)
          .style('opacity', 1)
          .select('rect')
          .attr('stroke', selectedStroke)
          .attr('stroke-width', 2)
        const wrapRect = chartWrapRef.current?.getBoundingClientRect()
        if (wrapRect) {
          setHoveredCell({
            cell: d,
            x: event.clientX - wrapRect.left,
            y: event.clientY - wrapRect.top,
          })
        }
      })
      .on('mousemove', function (event: MouseEvent, d: HeatmapCellDatum) {
        const wrapRect = chartWrapRef.current?.getBoundingClientRect()
        if (wrapRect) {
          setHoveredCell({
            cell: d,
            x: event.clientX - wrapRect.left,
            y: event.clientY - wrapRect.top,
          })
        }
      })
      .on('mouseleave', function (_event: MouseEvent, d: HeatmapCellDatum) {
        d3.select(this)
          .style('opacity', isCellMatchedByDrilldown(d) ? 1 : 0.3)
          .select('rect')
          .attr('stroke', isCellSelectedOutline(d) ? selectedStroke : cellBorderColor)
          .attr('stroke-width', isCellSelectedOutline(d) ? 2 : 1)
        setHoveredCell(null)
      })
      .on('click', (_event: MouseEvent, d: HeatmapCellDatum) => {
        handleToggleCellDrilldown(d)
      })
      .on('keydown', (event: KeyboardEvent, d: HeatmapCellDatum) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleToggleCellDrilldown(d)
        }
      })

    // D3 Continuous Color Legend at bottom of SVG
    const legendWidth = Math.min(260, innerWidth * 0.55)
    const legendHeight = 10
    const legendY = innerHeight + 24
    const gradientId = isDark ? 'chm-legend-grad-dark' : 'chm-legend-grad-light'

    const linearGrad = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%')

    const stops = [0, 0.25, 0.55, 0.8, 1]
    stops.forEach(s => {
      linearGrad
        .append('stop')
        .attr('offset', `${s * 100}%`)
        .attr('stop-color', s === 0 ? (isDark ? '#0f172a' : '#f8fafc') : colorScale(s * maxDomain))
    })

    const legendGroup = g
      .append('g')
      .attr('class', 'chm-legend')
      .attr('transform', `translate(0, ${legendY})`)

    legendGroup
      .append('text')
      .attr('x', 0)
      .attr('y', -6)
      .attr('fill', mutedTextColor)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Risk Intensity Scale (Severity-Weighted Score)')

    legendGroup
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 3)
      .attr('fill', `url(#${gradientId})`)
      .attr('stroke', cellBorderColor)

    const legendTicks = [
      { pos: 0, label: '0 Clear' },
      { pos: legendWidth * 0.35, label: 'Low' },
      { pos: legendWidth * 0.65, label: 'High' },
      { pos: legendWidth, label: `${maxDomain}+ Critical` },
    ]
    legendTicks.forEach((t, idx) => {
      legendGroup
        .append('text')
        .attr('x', t.pos)
        .attr('y', 23)
        .attr('text-anchor', idx === 0 ? 'start' : idx === legendTicks.length - 1 ? 'end' : 'middle')
        .attr('fill', mutedTextColor)
        .attr('font-size', '10px')
        .style('font-variant-numeric', 'tabular-nums')
        .text(t.label)
    })

    if (periodComparison) {
      const compLegendX = legendWidth + 28
      legendGroup
        .append('line')
        .attr('x1', compLegendX)
        .attr('x2', compLegendX + 22)
        .attr('y1', 5)
        .attr('y2', 5)
        .attr('stroke', isDark ? '#94a3b8' : '#64748b')
        .attr('stroke-width', 1.6)
        .attr('stroke-dasharray', '4,3')
      legendGroup
        .append('text')
        .attr('x', compLegendX + 28)
        .attr('y', 9)
        .attr('fill', mutedTextColor)
        .attr('font-size', '10.5px')
        .attr('font-weight', '600')
        .text(`Dashed baseline: ${periodComparison.previousWindow.startDateIso} → ${periodComparison.previousWindow.endDateIso}`)
    }
  }, [
    matrix,
    periodComparison,
    isDark,
    containerWidth,
    activeDrilldown,
    isDrilldownActive,
    mode,
    previewCell,
    handleToggleRegionDrilldown,
    handleToggleColumnDrilldown,
    handleToggleCellDrilldown,
  ])

  const handleJumpToDesk = (workspace: ComplianceSignalRecord['targetWorkspace']) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('khelgrid-admin-switch-workspace', {
        detail: { workspace },
      }),
    )
  }

  return (
    <section
      className="admin-compliance-heatmap-card"
      data-testid="compliance-risk-heatmap"
      aria-label="Compliance Risk Heatmap"
    >
      {/* Header & Controls */}
      <div className="chm-header">
        <div className="chm-heading-group">
          <h2>Compliance Risk Heatmap</h2>
          <p className="chm-meta-summary" data-testid="heatmap-summary-meta">
            <span>{matrix.totalSignals} regulatory signals</span>
            <span aria-hidden="true">·</span>
            <span>{matrix.highRiskSignals} high-risk active</span>
            {matrix.topRegion && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Top risk region: <strong>{matrix.topRegion.label}</strong> ({matrix.topRegion.totalRisk})
                </span>
              </>
            )}
            {matrix.topColumn && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Highest exposure: <strong>{matrix.topColumn.label}</strong>
                </span>
              </>
            )}
            {(trendSummary.rising > 0 || trendSummary.improving > 0) && (
              <>
                <span aria-hidden="true">·</span>
                <span data-testid="heatmap-trend-summary">
                  {matrix.dateWindow.shortLabel} trend:{' '}
                  {trendSummary.rising > 0 && (
                    <strong className="chm-meta-rising">{trendSummary.rising} rising</strong>
                  )}
                  {trendSummary.rising > 0 && trendSummary.improving > 0 && ', '}
                  {trendSummary.improving > 0 && (
                    <strong className="chm-meta-improving">{trendSummary.improving} improving</strong>
                  )}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span data-testid="heatmap-window-badge">
              Scope: <strong>{matrix.dateWindow.label}</strong>
            </span>
          </p>
        </div>

        <div className="chm-controls">
          <div className="chm-segmented" role="group" aria-label="Heatmap matrix dimension">
            <button
              type="button"
              className={`chm-seg-btn ${mode === 'partner_category' ? 'is-active' : ''}`}
              onClick={() => {
                setMode('partner_category')
                setDrilldown({
                  region: activeDrilldown.region,
                  partnerCategory: activeDrilldown.partnerCategory,
                  incidentType: null,
                })
              }}
              data-testid="heatmap-mode-partner"
            >
              By Partner Category
            </button>
            <button
              type="button"
              className={`chm-seg-btn ${mode === 'incident_type' ? 'is-active' : ''}`}
              onClick={() => {
                setMode('incident_type')
                setDrilldown({
                  region: activeDrilldown.region,
                  partnerCategory: null,
                  incidentType: activeDrilldown.incidentType,
                })
              }}
              data-testid="heatmap-mode-incident"
            >
              By Incident Type
            </button>
          </div>

          <div className="chm-segmented" role="group" aria-label="Regulatory signal filter">
            <button
              type="button"
              className={`chm-seg-btn ${scope === 'all' ? 'is-active' : ''}`}
              onClick={() => setScope('all')}
              data-testid="heatmap-scope-all"
            >
              All Signals
            </button>
            <button
              type="button"
              className={`chm-seg-btn ${scope === 'trust_safety' ? 'is-active' : ''}`}
              onClick={() => setScope('trust_safety')}
              data-testid="heatmap-scope-ts"
            >
              Trust &amp; Safety
            </button>
            <button
              type="button"
              className={`chm-seg-btn ${scope === 'high_risk_only' ? 'is-active' : ''}`}
              onClick={() => setScope('high_risk_only')}
              data-testid="heatmap-scope-high"
            >
              High Risk Only
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: D3 Matrix Left + Cell Incident Breakdown Right */}
      <div className="chm-body-grid">
        <div className="chm-chart-pane" ref={chartWrapRef}>
          {loading && signals.length === 0 ? (
            <div className="chm-empty-state">Loading compliance risk matrix…</div>
          ) : (
            <svg
              ref={svgRef}
              className="chm-svg"
              data-testid="d3-heatmap-svg"
              role="img"
              aria-label="Interactive D3 compliance risk heatmap by region and category"
            />
          )}

          {hoveredCell && (
            <div
              className="chm-tooltip"
              style={{
                left: `${Math.min(Math.max(hoveredCell.x + 14, 12), Math.max(containerWidth - 230, 12))}px`,
                top: `${Math.max(hoveredCell.y - 16, 8)}px`,
              }}
              role="tooltip"
            >
              <div className="chm-tooltip-title">
                {hoveredCell.cell.rowLabel} · {hoveredCell.cell.colLabel}
              </div>
              <div className="chm-tooltip-metrics">
                <span>
                  Risk Score: <strong>{hoveredCell.cell.riskScore}</strong> ({formatRiskTierLabel(hoveredCell.cell.tier)})
                </span>
                <span>
                  {hoveredCell.cell.signalCount}{' '}
                  {hoveredCell.cell.signalCount === 1 ? 'signal' : 'signals'} ({hoveredCell.cell.highRiskCount} high-risk)
                </span>
              </div>
            </div>
          )}
          {hoveredTrend && (
            <div
              className="chm-tooltip chm-trend-tooltip"
              data-testid="heatmap-trend-tooltip"
              style={{
                left: `${Math.min(Math.max(hoveredTrend.x - 210, 12), Math.max(containerWidth - 250, 12))}px`,
                top: `${Math.max(hoveredTrend.y - 20, 8)}px`,
              }}
              role="tooltip"
            >
              <div className="chm-tooltip-title">
                {hoveredTrend.row.label} · {matrix.dateWindow.label} Risk Trend
              </div>
              <div className="chm-tooltip-metrics">
                <span>
                  Trajectory:{' '}
                  <strong className={`chm-trend-word dir-${hoveredTrend.trend.direction}`}>
                    {hoveredTrend.trend.direction === 'increasing'
                      ? 'Risk Increasing'
                      : hoveredTrend.trend.direction === 'decreasing'
                        ? 'Risk Decreasing'
                        : 'Stable'}
                  </strong>{' '}
                  ({formatTrendDeltaLabel(hoveredTrend.trend)}
                  {hoveredTrend.trend.deltaPct !== null
                    ? `, ${hoveredTrend.trend.deltaPct > 0 ? '+' : ''}${hoveredTrend.trend.deltaPct}%`
                    : ''}
                  )
                </span>
                <span>
                  {matrix.dateWindow.shortLabel} Start: <strong>{hoveredTrend.trend.startScore}</strong> → Current:{' '}
                  <strong>{hoveredTrend.trend.currentScore}</strong> · Peak:{' '}
                  <strong>{hoveredTrend.trend.peakScore}</strong>
                </span>
                <span>
                  Window: {hoveredTrend.trend.points[0]?.dateLabel} –{' '}
                  {hoveredTrend.trend.points[hoveredTrend.trend.points.length - 1]?.dateLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Cell / Region / Category Drill-Down Panel */}
        <aside
          className="chm-inspector-pane"
          data-testid="heatmap-cell-inspector"
          aria-label="Selected region and category incident breakdown"
        >
          {inspectorView ? (
            <>
              <div className="chm-inspector-head">
                <div>
                  <span className="chm-inspector-kicker">{inspectorView.kicker}</span>
                  <h3>{inspectorView.title}</h3>
                </div>
                <div className={`chm-tier-readout tier-${inspectorView.tier}`}>
                  <span className="chm-tier-score">{inspectorView.riskScore}</span>
                  <span className="chm-tier-name">{formatRiskTierLabel(inspectorView.tier)}</span>
                </div>
              </div>

              <div className="chm-inspector-meta-row">
                <div className="chm-inspector-meta">
                  <span>
                    {inspectorView.signalCount}{' '}
                    {inspectorView.signalCount === 1 ? 'regulatory record' : 'regulatory records'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{inspectorView.highRiskCount} high-risk</span>
                </div>
                {inspectorView.isFiltered ? (
                  <button
                    type="button"
                    className="chm-reset-link"
                    onClick={() => setDrilldown(EMPTY_DRILLDOWN_FILTER)}
                    data-testid="heatmap-clear-drilldown"
                  >
                    Clear filter
                  </button>
                ) : (
                  previewCell && (
                    <button
                      type="button"
                      className="chm-reset-link"
                      onClick={() => handleToggleCellDrilldown(previewCell)}
                      data-testid="heatmap-apply-preview-filter"
                    >
                      Filter tables ↓
                    </button>
                  )
                )}
              </div>

              {inspectorRegionRow?.trend30d && (
                <Inspector30DayMiniChart
                  regionLabel={inspectorRegionRow.label}
                  windowLabel={matrix.dateWindow.label}
                  trend={inspectorRegionRow.trend30d}
                  isDark={isDark}
                />
              )}

              {!inspectorView.isFiltered && (
                <p className="chm-drilldown-hint">
                  Click any region name, category column, trend line, or heatmap cell to filter the data tables below.
                </p>
              )}

              {inspectorView.signals.length === 0 ? (
                <div className="chm-inspector-empty">
                  <SiteIcon name="shield-check" size={20} />
                  <p>
                    No open compliance incidents recorded for{' '}
                    <strong>{inspectorView.emptySubject}</strong> under the active filter.
                  </p>
                </div>
              ) : (
                <ul className="chm-signal-list">
                  {inspectorView.signals.map(sig => (
                    <li key={sig.id} className="chm-signal-item" data-testid="heatmap-signal-item">
                      <div className="chm-signal-top">
                        <span className="chm-signal-ref">{sig.referenceCode}</span>
                        <span className={`chm-signal-severity ${sig.isHighRisk ? 'is-high' : ''}`}>
                          {sig.severityLabel} · +{sig.riskPoints}
                        </span>
                      </div>
                      <div className="chm-signal-entity">{sig.entityName}</div>
                      <p className="chm-signal-desc">{sig.title}</p>
                      <div className="chm-signal-footer">
                        <span className="chm-signal-meta-line">
                          {getSourceDeskLabel(sig.sourceDesk)} · {sig.city} · {sig.statusLabel}
                        </span>
                        <button
                          type="button"
                          className="chm-desk-link"
                          onClick={() => handleJumpToDesk(sig.targetWorkspace)}
                        >
                          Open Desk →
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="chm-inspector-empty">
              <p>Click any region, category, or cell in the heatmap to inspect underlying compliance incidents.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

interface Inspector30DayMiniChartProps {
  regionLabel: string
  windowLabel: string
  trend: Region30DayTrend
  isDark: boolean
}

function Inspector30DayMiniChart({
  regionLabel,
  windowLabel,
  trend,
  isDark,
}: Inspector30DayMiniChartProps) {
  const width = 280
  const height = 66
  const pad = { top: 8, right: 8, bottom: 18, left: 6 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const maxIdx = Math.max(1, trend.points.length - 1)
  const xScale = d3.scaleLinear().domain([0, maxIdx]).range([pad.left, pad.left + innerW])
  const yMax = Math.max(trend.peakScore, 20)
  const yScale = d3.scaleLinear().domain([0, yMax]).range([pad.top + innerH, pad.top])

  const linePath =
    d3
      .line<(typeof trend.points)[number]>()
      .x(p => xScale(p.dayIndex))
      .y(p => yScale(p.score))
      .curve(d3.curveMonotoneX)(trend.points) ?? ''

  const areaPath =
    d3
      .area<(typeof trend.points)[number]>()
      .x(p => xScale(p.dayIndex))
      .y0(pad.top + innerH)
      .y1(p => yScale(p.score))
      .curve(d3.curveMonotoneX)(trend.points) ?? ''

  const strokeColor =
    trend.direction === 'increasing'
      ? isDark
        ? '#f87171'
        : '#dc2626'
      : trend.direction === 'decreasing'
        ? isDark
          ? '#34d399'
          : '#059669'
        : isDark
          ? '#94a3b8'
          : '#64748b'

  const gradId = `chm-insp-grad-${trend.direction}-${isDark ? 'd' : 'l'}`
  const startPt = trend.points[0]
  const midPt = trend.points[Math.floor(trend.points.length / 2)]
  const endPt = trend.points[trend.points.length - 1]
  const gridStroke = isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.1)'
  const labelInk = isDark ? '#94a3b8' : '#64748b'

  return (
    <div
      className="chm-inspector-trend-box"
      data-testid="inspector-trend-chart"
      data-trend-direction={trend.direction}
    >
      <div className="chm-inspector-trend-head">
        <span className="chm-inspector-trend-title">{regionLabel} · {windowLabel}</span>
        <span className={`chm-inspector-trend-delta dir-${trend.direction}`}>
          {formatTrendDeltaLabel(trend)}
          {trend.deltaPct !== null ? ` (${trend.deltaPct > 0 ? '+' : ''}${trend.deltaPct}%)` : ''}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chm-inspector-trend-svg"
        role="img"
        aria-label={`${regionLabel} 30-day compliance risk trend from ${trend.startScore} to ${trend.currentScore}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={isDark ? 0.28 : 0.22} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <line
          x1={pad.left}
          x2={pad.left + innerW}
          y1={pad.top + innerH}
          y2={pad.top + innerH}
          stroke={gridStroke}
          strokeDasharray="2,2"
        />
        <line
          x1={pad.left}
          x2={pad.left + innerW}
          y1={pad.top}
          y2={pad.top}
          stroke={gridStroke}
          strokeDasharray="2,3"
        />

        {trend.peakScore > 0 && <path d={areaPath} fill={`url(#${gradId})`} />}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
        />

        {endPt && trend.peakScore > 0 && (
          <circle
            cx={xScale(endPt.dayIndex)}
            cy={yScale(endPt.score)}
            r={3.2}
            fill={strokeColor}
          />
        )}

        {startPt && (
          <text x={pad.left} y={height - 3} fontSize="9.5" fill={labelInk}>
            {startPt.dateLabel}
          </text>
        )}
        {midPt && (
          <text
            x={pad.left + innerW / 2}
            y={height - 3}
            textAnchor="middle"
            fontSize="9.5"
            fill={labelInk}
          >
            {midPt.dateLabel}
          </text>
        )}
        {endPt && (
          <text
            x={pad.left + innerW}
            y={height - 3}
            textAnchor="end"
            fontSize="9.5"
            fill={labelInk}
          >
            {endPt.dateLabel}
          </text>
        )}
      </svg>

      <div className="chm-inspector-trend-stats">
        <span>Start: <strong>{trend.startScore}</strong></span>
        <span>Peak: <strong>{trend.peakScore}</strong></span>
        <span>Current: <strong>{trend.currentScore}</strong></span>
      </div>
    </div>
  )
}

