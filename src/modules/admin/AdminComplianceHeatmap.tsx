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
  EMPTY_DRILLDOWN_FILTER,
  formatRiskTierLabel,
  getIncidentTypeLabel,
  getPartnerCategoryLabel,
  hasActiveDrilldown,
  matchesSignalDrilldown,
  type ComplianceRiskTier,
  type ComplianceSignalRecord,
  type HeatmapCellDatum,
  type HeatmapDrilldownFilter,
  type HeatmapMatrixMode,
  type HeatmapSignalScope,
  type IncidentTypeKey,
  type PartnerCategoryKey,
} from './complianceHeatmapData'
import './AdminComplianceHeatmap.css'

export interface AdminComplianceHeatmapProps {
  refreshKey?: number
  drilldown?: HeatmapDrilldownFilter
  onDrilldownChange?: (next: HeatmapDrilldownFilter) => void
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
}: AdminComplianceHeatmapProps) {
  const [signals, setSignals] = useState<ComplianceSignalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<HeatmapMatrixMode>('partner_category')
  const [scope, setScope] = useState<HeatmapSignalScope>('all')
  const [internalDrilldown, setInternalDrilldown] = useState<HeatmapDrilldownFilter>(
    EMPTY_DRILLDOWN_FILTER,
  )
  const [hoveredCell, setHoveredCell] = useState<{
    cell: HeatmapCellDatum
    x: number
    y: number
  } | null>(null)
  const [isDark, setIsDark] = useState<boolean>(readIsDarkTheme)
  const [containerWidth, setContainerWidth] = useState<number>(760)

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
      const next = Math.max(540, Math.floor(el.getBoundingClientRect().width))
      setContainerWidth(next)
    }
    updateWidth()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(updateWidth)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const matrix = useMemo(
    () => buildComplianceHeatmapMatrix(signals, mode, scope),
    [signals, mode, scope],
  )

  const isDrilldownActive = hasActiveDrilldown(activeDrilldown)

  // Scoped signals matching current heatmap scope filter (all / trust_safety / high_risk_only)
  const scopedSignals = useMemo(() => {
    return signals.filter(sig => {
      if (scope === 'trust_safety') return sig.sourceDesk === 'trust_safety'
      if (scope === 'high_risk_only') return sig.isHighRisk
      return true
    })
  }, [signals, scope])

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

  // D3 SVG rendering
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl || matrix.rows.length === 0 || matrix.columns.length === 0) return

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()

    const margin = { top: 52, right: 54, bottom: 52, left: 102 }
    const rowHeight = 54
    const innerWidth = Math.max(420, containerWidth - margin.left - margin.right)
    const innerHeight = matrix.rows.length * rowHeight
    const totalWidth = innerWidth + margin.left + margin.right
    const totalHeight = innerHeight + margin.top + margin.bottom

    svg
      .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
      .attr('width', '100%')
      .attr('height', totalHeight)

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
      .attr('x', innerWidth + 12)
      .attr('y', -14)
      .attr('fill', mutedTextColor)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text('Total')

    // Regional Total Risk values on the right (also clickable to filter region)
    g.selectAll('.chm-row-total')
      .data(matrix.rows)
      .enter()
      .append('text')
      .attr('class', 'chm-row-total')
      .attr('x', innerWidth + 12)
      .attr('y', d => (yScale(d.key) ?? 0) + yScale.bandwidth() / 2 + 4)
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

    const defs = svg.append('defs')
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
  }, [
    matrix,
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

              {!inspectorView.isFiltered && (
                <p className="chm-drilldown-hint">
                  Click any region name, category column, or heatmap cell to filter the data tables below.
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
