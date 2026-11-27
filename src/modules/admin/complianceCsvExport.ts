/**
 * Pure RFC-4180 CSV builder for KhelGrid Admin Analytics Dashboard.
 *
 * Exports the filtered Compliance Risk Heatmap (including 30-day regional risk trends),
 * the active drill-down Regulated Entities Roster, and the underlying filtered regulatory
 * signals/incidents into Excel-safe CSV files.
 */

import {
  classifyComplianceRiskTier,
  filterSignalsByDateRange,
  formatRiskTierLabel,
  getIncidentTypeLabel,
  getPartnerCategoryLabel,
  hasActiveDrilldown,
  matchesSignalDrilldown,
  type ComplianceDateRange,
  type ComplianceHeatmapMatrix,
  type ComplianceSignalRecord,
  type HeatmapAxisItem,
  type HeatmapCellDatum,
  type HeatmapDrilldownFilter,
  type HeatmapMatrixMode,
  type HeatmapSignalScope,
  type InvestigableEntityRow,
  type ResolvedComplianceDateWindow,
} from './complianceHeatmapData'

export type ComplianceCsvExportKind =
  | 'combined'
  | 'heatmap_matrix'
  | 'drilldown_entities'

export interface ComplianceCsvExportInput {
  kind: ComplianceCsvExportKind
  matrix: ComplianceHeatmapMatrix
  allSignals: ComplianceSignalRecord[]
  drilldown: HeatmapDrilldownFilter
  entities: InvestigableEntityRow[]
  entitySearch?: string
  exportedAt?: Date
}

export interface ComplianceCsvExportResult {
  filename: string
  csv: string
  regionCount: number
  entityCount: number
  signalCount: number
}

const SIGNED_NUMERIC_RE = /^-?\d+(\.\d+)?%?$/

/**
 * Escapes a single CSV value according to RFC 4180 and neutralizes CSV formula injection
 * (OWASP CWE-1236) while keeping genuine numeric values and negative deltas intact.
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : ''
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  let text = String(value)
  const firstChar = text.charAt(0)
  const isFormulaTrigger =
    firstChar === '=' ||
    firstChar === '+' ||
    firstChar === '@' ||
    firstChar === '\t' ||
    firstChar === '\r' ||
    (firstChar === '-' && !SIGNED_NUMERIC_RE.test(text.trim()))

  if (isFormulaTrigger) {
    text = `'${text}`
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function formatCsvRow(
  values: Array<string | number | boolean | null | undefined>,
): string {
  return values.map(escapeCsvCell).join(',')
}

function slugifyToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getScopeLabel(scope: HeatmapSignalScope): string {
  switch (scope) {
    case 'trust_safety':
      return 'Trust & Safety Only'
    case 'high_risk_only':
      return 'High Risk Only'
    case 'all':
    default:
      return 'All Signals'
  }
}

function getModeLabel(mode: HeatmapMatrixMode): string {
  return mode === 'partner_category' ? 'By Partner Category' : 'By Incident Type'
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

function formatTrendDirectionLabel(direction?: string): string {
  if (direction === 'increasing') return 'Risk Increasing'
  if (direction === 'decreasing') return 'Risk Improving'
  return 'Stable'
}

/**
 * Generates a clean, descriptive CSV filename incorporating export preset, active drilldown
 * tokens, signal scope, and UTC date stamp.
 */
export function buildComplianceCsvFilename(params: {
  kind: ComplianceCsvExportKind
  scope: HeatmapSignalScope
  drilldown: HeatmapDrilldownFilter
  dateWindow?: ResolvedComplianceDateWindow
  exportedAt?: Date
}): string {
  const dateStamp = (params.exportedAt ?? new Date()).toISOString().slice(0, 10)
  const prefix =
    params.kind === 'heatmap_matrix'
      ? 'khelgrid-compliance-heatmap'
      : params.kind === 'drilldown_entities'
        ? 'khelgrid-compliance-entities'
        : 'khelgrid-compliance-report'

  const tokens: string[] = []
  if (params.drilldown.region) tokens.push(slugifyToken(params.drilldown.region))
  if (params.drilldown.partnerCategory) tokens.push(slugifyToken(params.drilldown.partnerCategory))
  if (params.drilldown.incidentType) tokens.push(slugifyToken(params.drilldown.incidentType))
  if (params.scope === 'trust_safety') tokens.push('trust-safety')
  else if (params.scope === 'high_risk_only') tokens.push('high-risk')
  if (params.dateWindow && params.dateWindow.preset !== '30d') {
    tokens.push(
      params.dateWindow.preset === 'custom'
        ? `${params.dateWindow.startDateIso}-to-${params.dateWindow.endDateIso}`
        : slugifyToken(params.dateWindow.shortLabel),
    )
  }

  const scopeSegment = tokens.length > 0 ? tokens.join('-') : 'all'
  return `${prefix}-${scopeSegment}-${dateStamp}.csv`
}

export interface FilteredHeatmapProjection {
  rows: HeatmapAxisItem[]
  columns: HeatmapAxisItem[]
  cellMap: Map<string, HeatmapCellDatum>
  filteredSignals: ComplianceSignalRecord[]
}

/**
 * Projects the Compliance Heatmap matrix and signals onto the active date window, scope & drilldown filter.
 */
export function projectFilteredHeatmapForExport(
  matrix: ComplianceHeatmapMatrix,
  allSignals: ComplianceSignalRecord[],
  drilldown: HeatmapDrilldownFilter,
): FilteredHeatmapProjection {
  const range: ComplianceDateRange = {
    preset: matrix.dateWindow.preset,
    startDate: matrix.dateWindow.startDateIso,
    endDate: matrix.dateWindow.endDateIso,
  }
  const dateScopedSignals = filterSignalsByDateRange(allSignals, range, matrix.dateWindow)

  const scopedSignals = dateScopedSignals.filter(sig => {
    if (matrix.scope === 'trust_safety') return sig.sourceDesk === 'trust_safety'
    if (matrix.scope === 'high_risk_only') return sig.isHighRisk
    return true
  })

  const filteredSignals = hasActiveDrilldown(drilldown)
    ? scopedSignals.filter(sig => matchesSignalDrilldown(sig, drilldown))
    : scopedSignals

  const activeColKey =
    matrix.mode === 'partner_category' ? drilldown.partnerCategory : drilldown.incidentType

  const rows = drilldown.region
    ? matrix.rows.filter(r => r.key === drilldown.region)
    : matrix.rows

  const columns = activeColKey
    ? matrix.columns.filter(c => c.key === activeColKey)
    : matrix.columns

  // Map cells by row::col. If a cross-dimension filter is active (e.g., partnerCategory while in
  // incident_type mode), filter the cell's signals so exported cell scores match the drilldown.
  const crossDimensionActive =
    (matrix.mode === 'partner_category' && Boolean(drilldown.incidentType)) ||
    (matrix.mode === 'incident_type' && Boolean(drilldown.partnerCategory))

  const cellMap = new Map<string, HeatmapCellDatum>()
  for (const cell of matrix.cells) {
    if (drilldown.region && cell.rowKey !== drilldown.region) continue
    if (activeColKey && cell.colKey !== activeColKey) continue

    if (crossDimensionActive) {
      const matched = cell.signals.filter(sig => matchesSignalDrilldown(sig, drilldown))
      const riskScore = matched.reduce((sum, s) => sum + s.riskPoints, 0)
      cellMap.set(`${cell.rowKey}::${cell.colKey}`, {
        ...cell,
        riskScore,
        signalCount: matched.length,
        highRiskCount: matched.filter(s => s.isHighRisk).length,
        tier: classifyComplianceRiskTier(riskScore),
        signals: matched,
      })
    } else {
      cellMap.set(`${cell.rowKey}::${cell.colKey}`, cell)
    }
  }

  return { rows, columns, cellMap, filteredSignals }
}

function buildHeatmapTableLines(
  projection: FilteredHeatmapProjection,
  includeSignalCountsPerColumn: boolean,
): string[] {
  const { rows, columns, cellMap } = projection
  const headers: string[] = ['Region']
  for (const col of columns) {
    headers.push(`${col.label} (Risk)`)
    if (includeSignalCountsPerColumn) {
      headers.push(`${col.label} (Signals)`)
    }
  }
  headers.push(
    'Filtered Total Risk',
    'Filtered Signals',
    'High-Risk Signals',
    'Risk Tier',
    '30d Start Score',
    '30d Peak Score',
    '30d Current Score',
    '30d Delta',
    '30d Delta %',
    '30d Trend Direction',
  )

  const lines: string[] = [formatCsvRow(headers)]

  for (const row of rows) {
    let rowRisk = 0
    let rowSignals = 0
    let rowHighRisk = 0
    const values: Array<string | number | null> = [row.label]

    for (const col of columns) {
      const cell = cellMap.get(`${row.key}::${col.key}`)
      const risk = cell?.riskScore ?? 0
      const count = cell?.signalCount ?? 0
      const high = cell?.highRiskCount ?? 0
      rowRisk += risk
      rowSignals += count
      rowHighRisk += high
      values.push(risk)
      if (includeSignalCountsPerColumn) {
        values.push(count)
      }
    }

    const trend = row.trend30d
    values.push(
      rowRisk,
      rowSignals,
      rowHighRisk,
      formatRiskTierLabel(classifyComplianceRiskTier(rowRisk)),
      trend?.startScore ?? 0,
      trend?.peakScore ?? 0,
      trend?.currentScore ?? row.totalRisk,
      trend?.delta ?? 0,
      trend?.deltaPct !== null && trend?.deltaPct !== undefined ? `${trend.deltaPct}%` : 'N/A',
      formatTrendDirectionLabel(trend?.direction),
    )

    lines.push(formatCsvRow(values))
  }

  return lines
}

function buildEntitiesTableLines(entities: InvestigableEntityRow[]): string[] {
  const headers = [
    'Reference Code',
    'Entity Name',
    'Partner Category',
    'Region',
    'City',
    'Sport',
    'Risk Score',
    'Risk Tier',
    'Signals',
    'High-Risk Signals',
    'Incident Types',
    'Lifecycle Status',
    'Latest Compliance Issue',
    'Target Desk',
    'Updated At',
  ]

  const lines: string[] = [formatCsvRow(headers)]
  for (const row of entities) {
    lines.push(
      formatCsvRow([
        row.referenceCode,
        row.entityName,
        row.partnerCategoryLabel,
        row.region,
        row.city,
        row.sport,
        row.riskScore,
        formatRiskTierLabel(row.riskTier),
        row.signalCount,
        row.highRiskCount,
        row.incidentTypes.map(getIncidentTypeLabel).join('; ') || 'None',
        row.lifecycleStatus,
        row.latestIssueSummary,
        row.targetWorkspace.replace(/_/g, ' '),
        row.updatedAt,
      ]),
    )
  }

  return lines
}

function buildSignalsTableLines(signals: ComplianceSignalRecord[]): string[] {
  const headers = [
    'Reference Code',
    'Entity Name',
    'Signal Title',
    'Source Desk',
    'Region',
    'City',
    'Partner Category',
    'Incident Type',
    'Severity',
    'Risk Points',
    'High Risk',
    'Status',
    'Opened At',
    'Updated At',
  ]

  const lines: string[] = [formatCsvRow(headers)]
  for (const sig of signals) {
    lines.push(
      formatCsvRow([
        sig.referenceCode,
        sig.entityName,
        sig.title,
        getSourceDeskLabel(sig.sourceDesk),
        sig.region,
        sig.city,
        getPartnerCategoryLabel(sig.partnerCategory),
        getIncidentTypeLabel(sig.incidentType),
        sig.severityLabel,
        sig.riskPoints,
        sig.isHighRisk,
        sig.statusLabel,
        sig.openedAt ?? sig.timestamp,
        sig.timestamp,
      ]),
    )
  }

  return lines
}

/**
 * Generates the UTF-8 BOM + RFC-4180 CSV payload and deterministic filename for the requested
 * export preset.
 */
export function buildComplianceCsvExport(
  input: ComplianceCsvExportInput,
): ComplianceCsvExportResult {
  const exportedAt = input.exportedAt ?? new Date()
  const projection = projectFilteredHeatmapForExport(
    input.matrix,
    input.allSignals,
    input.drilldown,
  )

  const filename = buildComplianceCsvFilename({
    kind: input.kind,
    scope: input.matrix.scope,
    drilldown: input.drilldown,
    dateWindow: input.matrix.dateWindow,
    exportedAt,
  })

  let lines: string[] = []

  if (input.kind === 'heatmap_matrix') {
    lines = buildHeatmapTableLines(projection, true)
  } else if (input.kind === 'drilldown_entities') {
    lines = buildEntitiesTableLines(input.entities)
  } else {
    // Combined report: Metadata summary + Filtered Heatmap Matrix & Trends + Entities + Signals
    const summaryLines = [
      formatCsvRow(['SECTION', 'KHELGRID COMPLIANCE HEATMAP & DRILLDOWN EXPORT']),
      formatCsvRow(['Exported At (UTC)', exportedAt.toISOString()]),
      formatCsvRow([
        'Date Scope',
        `${input.matrix.dateWindow.label} (${input.matrix.dateWindow.startDateIso} to ${input.matrix.dateWindow.endDateIso})`,
      ]),
      formatCsvRow(['Matrix Dimension', getModeLabel(input.matrix.mode)]),
      formatCsvRow(['Signal Scope', getScopeLabel(input.matrix.scope)]),
      formatCsvRow(['Region Filter', input.drilldown.region ?? 'All Regions']),
      formatCsvRow([
        'Partner Category Filter',
        input.drilldown.partnerCategory
          ? getPartnerCategoryLabel(input.drilldown.partnerCategory)
          : 'All Categories',
      ]),
      formatCsvRow([
        'Incident Type Filter',
        input.drilldown.incidentType
          ? getIncidentTypeLabel(input.drilldown.incidentType)
          : 'All Incident Types',
      ]),
      formatCsvRow([
        'Entity Search Query',
        input.entitySearch?.trim() ? input.entitySearch.trim() : 'None',
      ]),
      formatCsvRow(['Regions Exported', projection.rows.length]),
      formatCsvRow(['Regulated Entities Exported', input.entities.length]),
      formatCsvRow(['Regulatory Signals Exported', projection.filteredSignals.length]),
    ]

    lines = [
      ...summaryLines,
      '',
      formatCsvRow(['SECTION', 'FILTERED COMPLIANCE HEATMAP & 30-DAY TRENDS']),
      ...buildHeatmapTableLines(projection, false),
      '',
      formatCsvRow(['SECTION', 'DRILLDOWN REGULATED ENTITIES ROSTER']),
      ...buildEntitiesTableLines(input.entities),
      '',
      formatCsvRow(['SECTION', 'UNDERLYING REGULATORY SIGNALS & INCIDENTS']),
      ...buildSignalsTableLines(projection.filteredSignals),
    ]
  }

  return {
    filename,
    csv: `\uFEFF${lines.join('\r\n')}\r\n`,
    regionCount: projection.rows.length,
    entityCount: input.entities.length,
    signalCount: projection.filteredSignals.length,
  }
}

/**
 * Triggers an immediate client-side CSV file download without opening popups or alerts.
 */
export function triggerCsvDownload(filename: string, csvContent: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}
