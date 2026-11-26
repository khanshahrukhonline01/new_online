/**
 * Pure compliance risk aggregation & matrix builder for the D3 Compliance Heatmap
 * inside KhelGrid Admin Operations Analytics Dashboard.
 *
 * Aggregates real regulatory signals across:
 * 1. Trust & Safety incidents (P0–P3 disputes, hazards, fraud, sanctions)
 * 2. Verification & Evidence Vault anomalies (revoked, rejected, expired, action-required)
 * 3. Tenant & Organisation lifecycle enforcements (suspended, restricted, pending audit)
 */

export type HeatmapMatrixMode = 'partner_category' | 'incident_type'
export type HeatmapSignalScope = 'all' | 'trust_safety' | 'high_risk_only'
export type ComplianceRiskTier = 'clear' | 'low' | 'elevated' | 'high' | 'critical'
export type ComplianceSignalSource =
  | 'trust_safety'
  | 'verification_vault'
  | 'tenant_governance'

export type PartnerCategoryKey =
  | 'academies'
  | 'venues'
  | 'coaches'
  | 'organisers'
  | 'athletes'

export type IncidentTypeKey =
  | 'safety_hazard'
  | 'fraud_scam'
  | 'abuse_conduct'
  | 'credential_kyc'
  | 'lifecycle_lockout'

export type TrendDirection = 'increasing' | 'decreasing' | 'stable'

export interface Region30DayPoint {
  dayIndex: number
  dateIso: string
  dateLabel: string
  score: number
}

export interface Region30DayTrend {
  direction: TrendDirection
  startScore: number
  currentScore: number
  peakScore: number
  delta: number
  deltaPct: number | null
  points: Region30DayPoint[]
}

export interface ComplianceSignalRecord {
  id: string
  referenceCode: string
  title: string
  entityName: string
  sourceDesk: ComplianceSignalSource
  targetWorkspace: 'fraud_disputes' | 'verification_vault' | 'tenant_governance'
  region: string
  city: string
  partnerCategory: PartnerCategoryKey
  incidentType: IncidentTypeKey
  severityLabel: string
  statusLabel: string
  riskPoints: number
  /** Peak severity risk points when the incident/flag initially opened (higher than riskPoints if later closed/mitigated) */
  initialRiskPoints?: number
  isHighRisk: boolean
  /** ISO timestamp when the risk signal first became active */
  openedAt?: string
  timestamp: string
}

export interface HeatmapAxisItem {
  key: string
  label: string
  totalRisk: number
  signalCount: number
  highRiskCount?: number
  trend30d?: Region30DayTrend
}

export interface HeatmapCellDatum {
  id: string
  rowKey: string
  rowLabel: string
  colKey: string
  colLabel: string
  riskScore: number
  signalCount: number
  highRiskCount: number
  tier: ComplianceRiskTier
  signals: ComplianceSignalRecord[]
}

export interface ComplianceHeatmapMatrix {
  mode: HeatmapMatrixMode
  scope: HeatmapSignalScope
  rows: HeatmapAxisItem[]
  columns: HeatmapAxisItem[]
  cells: HeatmapCellDatum[]
  maxCellRisk: number
  totalSignals: number
  highRiskSignals: number
  topRegion: HeatmapAxisItem | null
  topColumn: HeatmapAxisItem | null
}

export const PARTNER_CATEGORY_COLUMNS: readonly { key: PartnerCategoryKey; label: string }[] = [
  { key: 'academies', label: 'Academies & Clubs' },
  { key: 'venues', label: 'Venues & Turfs' },
  { key: 'coaches', label: 'Coaches' },
  { key: 'organisers', label: 'Organisers' },
  { key: 'athletes', label: 'Athletes' },
]

export const INCIDENT_TYPE_COLUMNS: readonly { key: IncidentTypeKey; label: string }[] = [
  { key: 'safety_hazard', label: 'Safety Hazards' },
  { key: 'fraud_scam', label: 'Fraud & Extortion' },
  { key: 'abuse_conduct', label: 'Abuse & Conduct' },
  { key: 'credential_kyc', label: 'Credentials & KYC' },
  { key: 'lifecycle_lockout', label: 'Org Enforcement' },
]

export function normalizeComplianceRegion(city?: string, state?: string): string {
  const c = (city || '').trim().toLowerCase()
  const s = (state || '').trim().toLowerCase()

  if (
    c.includes('delhi') ||
    c.includes('gurugram') ||
    c.includes('gurgaon') ||
    c.includes('noida') ||
    c.includes('faridabad') ||
    s === 'delhi' ||
    s.includes('delhi ncr') ||
    s === 'haryana'
  ) {
    return 'Delhi NCR'
  }
  if (c.includes('mumbai') || c.includes('pune') || c.includes('kolhapur') || s === 'maharashtra') {
    return 'Maharashtra'
  }
  if (c.includes('bengaluru') || c.includes('bangalore') || s === 'karnataka') {
    return 'Karnataka'
  }
  if (c.includes('hyderabad') || s === 'telangana') {
    return 'Telangana'
  }
  if (c.includes('chennai') || s === 'tamil nadu') {
    return 'Tamil Nadu'
  }
  if (c.includes('kolkata') || s === 'west bengal') {
    return 'West Bengal'
  }
  if (c.includes('jaipur') || s === 'rajasthan') {
    return 'Rajasthan'
  }
  if (c.includes('ludhiana') || c.includes('chandigarh') || s === 'punjab') {
    return 'Punjab'
  }
  if (state && state.trim()) return state.trim()
  if (city && city.trim()) return city.trim()
  return 'Other Regions'
}

export function normalizePartnerCategory(rawType?: string): PartnerCategoryKey {
  const t = (rawType || '').trim().toLowerCase()
  if (t === 'venue' || t === 'turf' || t === 'host') return 'venues'
  if (t === 'coach' || t === 'trainer') return 'coaches'
  if (t === 'organiser' || t === 'organizer' || t === 'tournament') return 'organisers'
  if (t === 'athlete' || t === 'player') return 'athletes'
  return 'academies'
}

export function mapTrustIncidentCategory(rawCategory?: string): IncidentTypeKey {
  const cat = (rawCategory || '').trim().toLowerCase()
  if (cat === 'safety_hazard') return 'safety_hazard'
  if (cat === 'financial_fraud' || cat === 'impersonation_scam' || cat === 'booking_dispute') {
    return 'fraud_scam'
  }
  if (cat === 'abuse_harassment' || cat === 'match_conduct') return 'abuse_conduct'
  if (cat === 'age_eligibility_fraud') return 'credential_kyc'
  return 'safety_hazard'
}

export function scoreTrustSeverity(severity: string, status: string): {
  points: number
  initialPoints: number
  isHighRisk: boolean
  label: string
} {
  const closedMultiplier = status === 'case_closed' ? 0.45 : 1
  if (severity === 'critical_p0') {
    return {
      points: Math.round(42 * closedMultiplier),
      initialPoints: 42,
      isHighRisk: status !== 'case_closed',
      label: 'Critical P0',
    }
  }
  if (severity === 'high_p1') {
    return {
      points: Math.round(28 * closedMultiplier),
      initialPoints: 28,
      isHighRisk: status !== 'case_closed',
      label: 'High P1',
    }
  }
  if (severity === 'medium_p2') {
    return {
      points: Math.round(14 * closedMultiplier),
      initialPoints: 14,
      isHighRisk: false,
      label: 'Medium P2',
    }
  }
  return {
    points: Math.round(7 * closedMultiplier),
    initialPoints: 7,
    isHighRisk: false,
    label: 'Low P3',
  }
}

export function classifyComplianceRiskTier(riskScore: number): ComplianceRiskTier {
  if (riskScore <= 0) return 'clear'
  if (riskScore < 22) return 'low'
  if (riskScore < 42) return 'elevated'
  if (riskScore < 65) return 'high'
  return 'critical'
}

export function formatRiskTierLabel(tier: ComplianceRiskTier): string {
  switch (tier) {
    case 'critical':
      return 'Critical'
    case 'high':
      return 'High'
    case 'elevated':
      return 'Elevated'
    case 'low':
      return 'Low'
    case 'clear':
    default:
      return 'Clear'
  }
}

export interface TrustIncidentLike {
  id: string
  incidentNumber: string
  title: string
  category: string
  severity: string
  status: string
  reportedEntityType: string
  reportedEntityName: string
  city: string
  state: string
  updatedAt?: string
  createdAt?: string
}

export interface VerificationItemLike {
  id: string
  referenceCode: string
  entityType: string
  entityName: string
  city: string
  state: string
  status: string
  lastAuditedAt?: string
  submittedAt?: string
}

export interface TenantSummaryLike {
  id: string
  name: string
  tenantType: string
  status: string
  verificationStatus?: string
  city: string
  state: string
  updatedAt?: string
}

/**
 * Converts Trust & Safety cases, Verification anomalies, and Tenant lifecycle holds
 * into a unified list of normalized regulatory compliance signals.
 */
export function buildComplianceSignals(input: {
  incidents: TrustIncidentLike[]
  verifications: VerificationItemLike[]
  tenants: TenantSummaryLike[]
}): ComplianceSignalRecord[] {
  const signals: ComplianceSignalRecord[] = []

  for (const inc of input.incidents) {
    const scored = scoreTrustSeverity(inc.severity, inc.status)
    const timestamp = inc.updatedAt || inc.createdAt || new Date().toISOString()
    signals.push({
      id: `ts-${inc.id}`,
      referenceCode: inc.incidentNumber,
      title: inc.title,
      entityName: inc.reportedEntityName,
      sourceDesk: 'trust_safety',
      targetWorkspace: 'fraud_disputes',
      region: normalizeComplianceRegion(inc.city, inc.state),
      city: inc.city,
      partnerCategory: normalizePartnerCategory(inc.reportedEntityType),
      incidentType: mapTrustIncidentCategory(inc.category),
      severityLabel: scored.label,
      statusLabel: inc.status.replace(/_/g, ' '),
      riskPoints: scored.points,
      initialRiskPoints: scored.initialPoints,
      isHighRisk: scored.isHighRisk,
      openedAt: inc.createdAt || timestamp,
      timestamp,
    })
  }

  for (const v of input.verifications) {
    let points = 0
    let isHighRisk = false
    let severityLabel = 'Compliance Review'

    if (v.status === 'revoked') {
      points = 32
      isHighRisk = true
      severityLabel = 'Seal Revoked'
    } else if (v.status === 'rejected') {
      points = 22
      isHighRisk = true
      severityLabel = 'Rejected Dossier'
    } else if (v.status === 'expired') {
      points = 18
      isHighRisk = false
      severityLabel = 'Expired Credential'
    } else if (v.status === 'action_required') {
      points = 14
      isHighRisk = false
      severityLabel = 'Action Required'
    } else if (v.status === 'pending_review') {
      points = 8
      isHighRisk = false
      severityLabel = 'Pending Audit'
    } else {
      continue
    }

    const verTimestamp = v.lastAuditedAt || v.submittedAt || new Date().toISOString()
    signals.push({
      id: `ver-${v.id}`,
      referenceCode: v.referenceCode,
      title: `${severityLabel} · ${v.entityName}`,
      entityName: v.entityName,
      sourceDesk: 'verification_vault',
      targetWorkspace: 'verification_vault',
      region: normalizeComplianceRegion(v.city, v.state),
      city: v.city,
      partnerCategory: normalizePartnerCategory(v.entityType),
      incidentType: 'credential_kyc',
      severityLabel,
      statusLabel: v.status.replace(/_/g, ' '),
      riskPoints: points,
      initialRiskPoints: points,
      isHighRisk,
      openedAt: verTimestamp,
      timestamp: verTimestamp,
    })
  }

  for (const t of input.tenants) {
    let points = 0
    let isHighRisk = false
    let severityLabel = ''

    if (t.status === 'suspended') {
      points = 34
      isHighRisk = true
      severityLabel = 'Org Suspended'
    } else if (t.status === 'restricted') {
      points = 20
      isHighRisk = true
      severityLabel = 'Restricted Mode'
    } else if (t.status === 'pending_verification') {
      points = 10
      isHighRisk = false
      severityLabel = 'Pending Org Audit'
    } else {
      continue
    }

    const tenTimestamp = t.updatedAt || new Date().toISOString()
    signals.push({
      id: `ten-${t.id}`,
      referenceCode: t.id.toUpperCase(),
      title: `${severityLabel} · ${t.name}`,
      entityName: t.name,
      sourceDesk: 'tenant_governance',
      targetWorkspace: 'tenant_governance',
      region: normalizeComplianceRegion(t.city, t.state),
      city: t.city,
      partnerCategory: normalizePartnerCategory(t.tenantType),
      incidentType: 'lifecycle_lockout',
      severityLabel,
      statusLabel: t.status.replace(/_/g, ' '),
      riskPoints: points,
      initialRiskPoints: points,
      isHighRisk,
      openedAt: tenTimestamp,
      timestamp: tenTimestamp,
    })
  }

  return signals.sort((a, b) => b.riskPoints - a.riskPoints)
}

const DEFAULT_REGIONS = [
  'Delhi NCR',
  'Maharashtra',
  'Karnataka',
  'Telangana',
  'West Bengal',
  'Tamil Nadu',
]

const DAY_MS = 24 * 60 * 60 * 1000
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseTimestampMs(raw?: string): number | null {
  if (!raw) return null
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : null
}

function formatUtcDayLabel(ms: number): string {
  const d = new Date(ms)
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

/**
 * Anchors the 30-day trend window end to the latest signal day (or today if no signals exist),
 * ensuring real incident timelines are always framed cleanly inside the 30-day window.
 */
export function resolveTrendWindowEndDate(signals: ComplianceSignalRecord[]): Date {
  let maxMs = 0
  for (const sig of signals) {
    const t1 = parseTimestampMs(sig.timestamp)
    const t2 = parseTimestampMs(sig.openedAt)
    if (t1 !== null && t1 > maxMs) maxMs = t1
    if (t2 !== null && t2 > maxMs) maxMs = t2
  }
  const anchor = maxMs > 0 ? new Date(maxMs) : new Date()
  return new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate(), 23, 59, 59, 999),
  )
}

/**
 * Computes a deterministic 30-day daily compliance risk trajectory for a single region.
 * Final day score (dayIndex 29) always matches the region's current totalRisk.
 */
export function buildRegion30DayTrend(
  regionSignals: ComplianceSignalRecord[],
  referenceEndDate?: Date,
): Region30DayTrend {
  const endDate = referenceEndDate ?? resolveTrendWindowEndDate(regionSignals)
  const endUtcDayStart = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
    0,
    0,
    0,
    0,
  )
  const startUtcDayStart = endUtcDayStart - 29 * DAY_MS

  const normalizedSignals = regionSignals.map(sig => {
    const updatedMs = parseTimestampMs(sig.timestamp) ?? endUtcDayStart
    const openedMs = parseTimestampMs(sig.openedAt) ?? updatedMs
    return {
      effectiveOpenMs: Math.min(openedMs, updatedMs),
      updatedMs,
      initialPoints: sig.initialRiskPoints ?? sig.riskPoints,
      currentPoints: sig.riskPoints,
    }
  })

  const points: Region30DayPoint[] = []
  let peakScore = 0

  for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
    const dayStartMs = startUtcDayStart + dayIndex * DAY_MS
    const dayEndMs = dayStartMs + DAY_MS - 1
    let score = 0

    for (const sig of normalizedSignals) {
      if (dayEndMs < sig.effectiveOpenMs) {
        continue
      }
      if (sig.currentPoints < sig.initialPoints && dayEndMs < sig.updatedMs) {
        score += sig.initialPoints
      } else {
        score += sig.currentPoints
      }
    }

    if (score > peakScore) peakScore = score
    points.push({
      dayIndex,
      dateIso: new Date(dayStartMs).toISOString().slice(0, 10),
      dateLabel: formatUtcDayLabel(dayStartMs),
      score,
    })
  }

  const startScore = points[0]?.score ?? 0
  const currentScore = points[points.length - 1]?.score ?? 0

  let direction: TrendDirection = 'stable'
  let delta = currentScore - startScore
  let referenceBase = startScore

  if (currentScore < peakScore && (startScore === 0 || currentScore <= startScore)) {
    // Risk peaked within the 30-day window and has since declined via mitigation/case closure
    direction = 'decreasing'
    delta = currentScore - peakScore
    referenceBase = peakScore
  } else if (currentScore > startScore) {
    direction = 'increasing'
    delta = currentScore - startScore
    referenceBase = startScore
  } else if (currentScore < startScore) {
    direction = 'decreasing'
    delta = currentScore - startScore
    referenceBase = startScore
  } else {
    direction = 'stable'
    delta = 0
  }

  const deltaPct =
    referenceBase > 0 ? Math.round((delta / referenceBase) * 100) : null

  return {
    direction,
    startScore,
    currentScore,
    peakScore,
    delta,
    deltaPct,
    points,
  }
}

export function formatTrendDeltaLabel(trend?: Region30DayTrend): string {
  if (!trend) return '—'
  if (trend.direction === 'increasing' && trend.delta > 0) {
    return `↑ +${trend.delta}`
  }
  if (trend.direction === 'decreasing' && trend.delta < 0) {
    return `↓ ${trend.delta}`
  }
  return trend.currentScore > 0 ? '→ 0' : '—'
}

/**
 * Builds the 2D compliance risk heatmap matrix ready for D3 rendering.
 */
export function buildComplianceHeatmapMatrix(
  allSignals: ComplianceSignalRecord[],
  mode: HeatmapMatrixMode = 'partner_category',
  scope: HeatmapSignalScope = 'all',
): ComplianceHeatmapMatrix {
  const filteredSignals = allSignals.filter(sig => {
    if (scope === 'trust_safety') return sig.sourceDesk === 'trust_safety'
    if (scope === 'high_risk_only') return sig.isHighRisk
    return true
  })

  const columnDefs =
    mode === 'partner_category' ? PARTNER_CATEGORY_COLUMNS : INCIDENT_TYPE_COLUMNS

  // Ensure canonical Indian metro regions always appear alongside any additional regions in signals
  const regionSet = new Set<string>(DEFAULT_REGIONS)
  for (const sig of filteredSignals) {
    regionSet.add(sig.region)
  }

  const rowTotals = new Map<string, { totalRisk: number; signalCount: number }>()
  for (const r of regionSet) {
    rowTotals.set(r, { totalRisk: 0, signalCount: 0 })
  }

  const colTotals = new Map<string, { totalRisk: number; signalCount: number }>()
  for (const col of columnDefs) {
    colTotals.set(col.key, { totalRisk: 0, signalCount: 0 })
  }

  const cellBuckets = new Map<string, ComplianceSignalRecord[]>()
  for (const sig of filteredSignals) {
    const colKey = mode === 'partner_category' ? sig.partnerCategory : sig.incidentType
    const cellKey = `${sig.region}::${colKey}`
    const bucket = cellBuckets.get(cellKey) || []
    bucket.push(sig)
    cellBuckets.set(cellKey, bucket)

    const rt = rowTotals.get(sig.region) || { totalRisk: 0, signalCount: 0 }
    rt.totalRisk += sig.riskPoints
    rt.signalCount += 1
    rowTotals.set(sig.region, rt)

    const ct = colTotals.get(colKey)
    if (ct) {
      ct.totalRisk += sig.riskPoints
      ct.signalCount += 1
    }
  }

  const rowHighRiskTotals = new Map<string, number>()
  const signalsByRegion = new Map<string, ComplianceSignalRecord[]>()
  for (const r of regionSet) {
    rowHighRiskTotals.set(r, 0)
    signalsByRegion.set(r, [])
  }
  for (const sig of filteredSignals) {
    const list = signalsByRegion.get(sig.region) || []
    list.push(sig)
    signalsByRegion.set(sig.region, list)
    if (sig.isHighRisk) {
      rowHighRiskTotals.set(sig.region, (rowHighRiskTotals.get(sig.region) ?? 0) + 1)
    }
  }

  const trendReferenceDate = resolveTrendWindowEndDate(filteredSignals)

  // Sort regions descending by total risk score (highest-risk regions surface at top)
  const rows: HeatmapAxisItem[] = Array.from(regionSet)
    .map(region => ({
      key: region,
      label: region,
      totalRisk: rowTotals.get(region)?.totalRisk ?? 0,
      signalCount: rowTotals.get(region)?.signalCount ?? 0,
      highRiskCount: rowHighRiskTotals.get(region) ?? 0,
      trend30d: buildRegion30DayTrend(
        signalsByRegion.get(region) || [],
        trendReferenceDate,
      ),
    }))
    .sort((a, b) => {
      if (b.totalRisk !== a.totalRisk) return b.totalRisk - a.totalRisk
      return a.label.localeCompare(b.label)
    })

  const columns: HeatmapAxisItem[] = columnDefs.map(col => ({
    key: col.key,
    label: col.label,
    totalRisk: colTotals.get(col.key)?.totalRisk ?? 0,
    signalCount: colTotals.get(col.key)?.signalCount ?? 0,
  }))

  const cells: HeatmapCellDatum[] = []
  let maxCellRisk = 0

  for (const row of rows) {
    for (const col of columns) {
      const bucket = (cellBuckets.get(`${row.key}::${col.key}`) || []).sort(
        (a, b) => b.riskPoints - a.riskPoints,
      )
      const riskScore = bucket.reduce((sum, item) => sum + item.riskPoints, 0)
      const highRiskCount = bucket.filter(item => item.isHighRisk).length
      if (riskScore > maxCellRisk) maxCellRisk = riskScore

      cells.push({
        id: `${row.key}::${col.key}`,
        rowKey: row.key,
        rowLabel: row.label,
        colKey: col.key,
        colLabel: col.label,
        riskScore,
        signalCount: bucket.length,
        highRiskCount,
        tier: classifyComplianceRiskTier(riskScore),
        signals: bucket,
      })
    }
  }

  const topRegion = rows.find(r => r.totalRisk > 0) ?? null
  const topColumn =
    [...columns].sort((a, b) => b.totalRisk - a.totalRisk).find(c => c.totalRisk > 0) ?? null

  return {
    mode,
    scope,
    rows,
    columns,
    cells,
    maxCellRisk,
    totalSignals: filteredSignals.length,
    highRiskSignals: filteredSignals.filter(s => s.isHighRisk).length,
    topRegion,
    topColumn,
  }
}

export interface HeatmapDrilldownFilter {
  region: string | null
  partnerCategory: PartnerCategoryKey | null
  incidentType: IncidentTypeKey | null
}

export const EMPTY_DRILLDOWN_FILTER: HeatmapDrilldownFilter = {
  region: null,
  partnerCategory: null,
  incidentType: null,
}

export function hasActiveDrilldown(filter: HeatmapDrilldownFilter): boolean {
  return Boolean(filter.region || filter.partnerCategory || filter.incidentType)
}

export function getPartnerCategoryLabel(key: PartnerCategoryKey): string {
  return PARTNER_CATEGORY_COLUMNS.find(c => c.key === key)?.label ?? key
}

export function getIncidentTypeLabel(key: IncidentTypeKey): string {
  return INCIDENT_TYPE_COLUMNS.find(c => c.key === key)?.label ?? key
}

export function matchesSignalDrilldown(
  signal: ComplianceSignalRecord,
  filter: HeatmapDrilldownFilter,
): boolean {
  if (filter.region && signal.region !== filter.region) return false
  if (filter.partnerCategory && signal.partnerCategory !== filter.partnerCategory) return false
  if (filter.incidentType && signal.incidentType !== filter.incidentType) return false
  return true
}

export interface InvestigableEntityRow {
  id: string
  referenceCode: string
  entityName: string
  partnerCategory: PartnerCategoryKey
  partnerCategoryLabel: string
  region: string
  city: string
  sport: string
  lifecycleStatus: string
  riskScore: number
  riskTier: ComplianceRiskTier
  signalCount: number
  highRiskCount: number
  incidentTypes: IncidentTypeKey[]
  latestIssueSummary: string
  targetWorkspace: 'fraud_disputes' | 'verification_vault' | 'tenant_governance'
  updatedAt: string
}

export interface TenantEntityInput extends TenantSummaryLike {
  sport?: string
}

/**
 * Consolidates partner entities across Tenants, Verification Vault, and Trust & Safety
 * into a unified, risk-ranked roster suitable for instant heatmap drilldown investigation.
 */
export function buildInvestigableEntityRows(input: {
  incidents: TrustIncidentLike[]
  verifications: VerificationItemLike[]
  tenants: TenantEntityInput[]
}): InvestigableEntityRow[] {
  const signals = buildComplianceSignals(input)

  interface Accumulator {
    id: string
    referenceCode: string
    entityName: string
    partnerCategory: PartnerCategoryKey
    region: string
    city: string
    sport: string
    lifecycleStatus: string
    riskScore: number
    signalCount: number
    highRiskCount: number
    incidentTypes: Set<IncidentTypeKey>
    topSignalTitle: string
    topSignalPoints: number
    targetWorkspace: 'fraud_disputes' | 'verification_vault' | 'tenant_governance'
    updatedAt: string
  }

  const byKey = new Map<string, Accumulator>()
  const makeKey = (name: string, category: PartnerCategoryKey) =>
    `${name.trim().toLowerCase()}::${category}`

  const upsertBase = (params: {
    id: string
    referenceCode: string
    entityName: string
    partnerCategory: PartnerCategoryKey
    region: string
    city: string
    sport?: string
    lifecycleStatus: string
    targetWorkspace: 'fraud_disputes' | 'verification_vault' | 'tenant_governance'
    updatedAt: string
  }): Accumulator => {
    const key = makeKey(params.entityName, params.partnerCategory)
    const existing = byKey.get(key)
    if (existing) {
      if (!existing.sport && params.sport) existing.sport = params.sport
      if (existing.city === 'India' && params.city) existing.city = params.city
      return existing
    }
    const created: Accumulator = {
      id: params.id,
      referenceCode: params.referenceCode,
      entityName: params.entityName,
      partnerCategory: params.partnerCategory,
      region: params.region,
      city: params.city || 'India',
      sport: params.sport || 'Multi-Sport',
      lifecycleStatus: params.lifecycleStatus,
      riskScore: 0,
      signalCount: 0,
      highRiskCount: 0,
      incidentTypes: new Set<IncidentTypeKey>(),
      topSignalTitle: 'Compliant · No open escalations',
      topSignalPoints: -1,
      targetWorkspace: params.targetWorkspace,
      updatedAt: params.updatedAt,
    }
    byKey.set(key, created)
    return created
  }

  for (const t of input.tenants) {
    const category = normalizePartnerCategory(t.tenantType)
    upsertBase({
      id: `entity-ten-${t.id}`,
      referenceCode: t.id.toUpperCase(),
      entityName: t.name,
      partnerCategory: category,
      region: normalizeComplianceRegion(t.city, t.state),
      city: t.city,
      sport: t.sport,
      lifecycleStatus: t.status.replace(/_/g, ' '),
      targetWorkspace: 'tenant_governance',
      updatedAt: t.updatedAt || new Date().toISOString(),
    })
  }

  for (const v of input.verifications) {
    const category = normalizePartnerCategory(v.entityType)
    const acc = upsertBase({
      id: `entity-ver-${v.id}`,
      referenceCode: v.referenceCode,
      entityName: v.entityName,
      partnerCategory: category,
      region: normalizeComplianceRegion(v.city, v.state),
      city: v.city,
      lifecycleStatus: v.status.replace(/_/g, ' '),
      targetWorkspace: 'verification_vault',
      updatedAt: v.lastAuditedAt || v.submittedAt || new Date().toISOString(),
    })
    if (acc.referenceCode.startsWith('TEN-')) {
      acc.referenceCode = v.referenceCode
    }
  }

  for (const sig of signals) {
    const acc = upsertBase({
      id: `entity-sig-${sig.id}`,
      referenceCode: sig.referenceCode,
      entityName: sig.entityName,
      partnerCategory: sig.partnerCategory,
      region: sig.region,
      city: sig.city,
      lifecycleStatus: sig.statusLabel,
      targetWorkspace: sig.targetWorkspace,
      updatedAt: sig.timestamp,
    })

    acc.riskScore += sig.riskPoints
    acc.signalCount += 1
    if (sig.isHighRisk) acc.highRiskCount += 1
    acc.incidentTypes.add(sig.incidentType)

    if (sig.riskPoints > acc.topSignalPoints) {
      acc.topSignalPoints = sig.riskPoints
      acc.topSignalTitle = sig.title
      acc.targetWorkspace = sig.targetWorkspace
      acc.lifecycleStatus = sig.statusLabel
      if (sig.sourceDesk === 'trust_safety') {
        acc.referenceCode = sig.referenceCode
      }
    }
    if (sig.timestamp > acc.updatedAt) {
      acc.updatedAt = sig.timestamp
    }
  }

  return Array.from(byKey.values())
    .map<InvestigableEntityRow>(acc => ({
      id: acc.id,
      referenceCode: acc.referenceCode,
      entityName: acc.entityName,
      partnerCategory: acc.partnerCategory,
      partnerCategoryLabel: getPartnerCategoryLabel(acc.partnerCategory),
      region: acc.region,
      city: acc.city,
      sport: acc.sport,
      lifecycleStatus: acc.lifecycleStatus,
      riskScore: acc.riskScore,
      riskTier: classifyComplianceRiskTier(acc.riskScore),
      signalCount: acc.signalCount,
      highRiskCount: acc.highRiskCount,
      incidentTypes: Array.from(acc.incidentTypes),
      latestIssueSummary: acc.topSignalTitle,
      targetWorkspace: acc.targetWorkspace,
      updatedAt: acc.updatedAt,
    }))
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore
      if (b.highRiskCount !== a.highRiskCount) return b.highRiskCount - a.highRiskCount
      return a.entityName.localeCompare(b.entityName)
    })
}

/**
 * Filters the regulated entities investigation table by the active heatmap drilldown.
 */
export function filterEntityRowsByDrilldown(
  rows: InvestigableEntityRow[],
  filter: HeatmapDrilldownFilter,
): InvestigableEntityRow[] {
  if (!hasActiveDrilldown(filter)) return rows
  return rows.filter(row => {
    if (filter.region && row.region !== filter.region) return false
    if (filter.partnerCategory && row.partnerCategory !== filter.partnerCategory) return false
    if (filter.incidentType && !row.incidentTypes.includes(filter.incidentType)) return false
    return true
  })
}

/**
 * Filters moderation queue submissions or activity feed records by active heatmap region
 * and/or partner category drilldown.
 */
export function filterModerationRecordsByDrilldown<
  T extends { city?: string | null; listing_type?: string | null },
>(items: T[], filter: HeatmapDrilldownFilter): T[] {
  if (!filter.region && !filter.partnerCategory) return items
  return items.filter(item => {
    if (filter.region) {
      const normalizedRegion = normalizeComplianceRegion(item.city ?? undefined)
      if (normalizedRegion !== filter.region) return false
    }
    if (filter.partnerCategory) {
      const normalizedCategory = normalizePartnerCategory(item.listing_type ?? undefined)
      if (normalizedCategory !== filter.partnerCategory) return false
    }
    return true
  })
}

