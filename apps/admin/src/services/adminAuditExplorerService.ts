/**
 * KhelGrid Admin — Centralized Cross-Desk Audit Trail Explorer Service
 *
 * Aggregates immutable audit events across Platform Governance, Listing Moderation,
 * Verification Vault, Trust & Safety, Tenant Governance, Regulatory Compliance (DPDP /
 * IT Rules / POSH / NADA), and Queue Workflow Claims — with pure multi-facet filtering
 * and CSV + JSON compliance bundle export.
 */

import {
  exportPlatformAuditToCsv,
  getPlatformGovernanceSnapshot,
  type AuditSeverity,
  type AuditSourceModule,
  type UnifiedPlatformAuditRecord,
} from './adminPlatformGovernanceService'
import { getRegulatoryComplianceAuditEvents } from './adminRegulatoryComplianceService'
import { getQueueWorkflowAuditEvents } from './adminQueueWorkflowService'
import { getPostRegulationAuditEvents } from '../../../../src/shared/governance/postRegulationBridge'

export interface AuditExplorerFilter {
  query: string
  sourceModule: 'all' | AuditSourceModule
  severity: 'all' | AuditSeverity
  actorEmail: string
  actionType: string
  startDateIso: string
  endDateIso: string
}

export const DEFAULT_AUDIT_EXPLORER_FILTER: AuditExplorerFilter = {
  query: '',
  sourceModule: 'all',
  severity: 'all',
  actorEmail: 'all',
  actionType: 'all',
  startDateIso: '',
  endDateIso: '',
}

export interface AuditExplorerMetrics {
  totalEvents: number
  criticalCount: number
  warningCount: number
  infoCount: number
  uniqueOperators: number
  uniqueModules: number
}

/**
 * Loads and deduplicates unified audit records from all desks in descending chronological order.
 */
export async function loadAllPlatformAuditRecords(): Promise<UnifiedPlatformAuditRecord[]> {
  const govRecords = await getPlatformGovernanceSnapshot()
    .then(snap => (Array.isArray(snap.auditEvents) ? snap.auditEvents : []))
    .catch(() => [] as UnifiedPlatformAuditRecord[])
  const regRecords = getRegulatoryComplianceAuditEvents()
  const postGateRecords = getPostRegulationAuditEvents()
  const claimRecords = getQueueWorkflowAuditEvents()

  const seen = new Set<string>()
  const merged: UnifiedPlatformAuditRecord[] = []

  for (const rec of [...postGateRecords, ...regRecords, ...claimRecords, ...govRecords]) {
    if (seen.has(rec.id)) continue
    seen.add(rec.id)
    merged.push(rec)
  }

  return merged.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
}

/**
 * Pure deterministic multi-facet audit filter for unit testing and live UI rendering.
 */
export function filterAuditRecords(
  records: UnifiedPlatformAuditRecord[],
  filter: AuditExplorerFilter,
): UnifiedPlatformAuditRecord[] {
  const q = filter.query.trim().toLowerCase()
  const startMs = filter.startDateIso ? Date.parse(`${filter.startDateIso}T00:00:00.000Z`) : null
  const endMs = filter.endDateIso ? Date.parse(`${filter.endDateIso}T23:59:59.999Z`) : null

  return records.filter(rec => {
    if (filter.sourceModule !== 'all' && rec.sourceModule !== filter.sourceModule) return false
    if (filter.severity !== 'all' && rec.severity !== filter.severity) return false
    if (
      filter.actorEmail &&
      filter.actorEmail !== 'all' &&
      rec.actor.toLowerCase() !== filter.actorEmail.toLowerCase()
    ) {
      return false
    }
    if (
      filter.actionType &&
      filter.actionType !== 'all' &&
      rec.action !== filter.actionType
    ) {
      return false
    }

    const tsMs = Date.parse(rec.timestamp)
    if (startMs !== null && Number.isFinite(startMs) && Number.isFinite(tsMs) && tsMs < startMs) {
      return false
    }
    if (endMs !== null && Number.isFinite(endMs) && Number.isFinite(tsMs) && tsMs > endMs) {
      return false
    }

    if (q) {
      const hay = `${rec.sequenceCode} ${rec.action} ${rec.actor} ${rec.targetEntity} ${rec.summary} ${rec.immutableChecksum} ${rec.sourceModule}`.toLowerCase()
      if (!hay.includes(q)) return false
    }

    return true
  })
}

export function computeAuditExplorerMetrics(
  records: UnifiedPlatformAuditRecord[],
): AuditExplorerMetrics {
  const operators = new Set<string>()
  const modules = new Set<string>()
  let criticalCount = 0
  let warningCount = 0
  let infoCount = 0

  for (const rec of records) {
    operators.add(rec.actor.toLowerCase())
    modules.add(rec.sourceModule)
    if (rec.severity === 'critical') criticalCount += 1
    else if (rec.severity === 'warning') warningCount += 1
    else infoCount += 1
  }

  return {
    totalEvents: records.length,
    criticalCount,
    warningCount,
    infoCount,
    uniqueOperators: operators.size,
    uniqueModules: modules.size,
  }
}

export function exportAuditExplorerCsv(records: UnifiedPlatformAuditRecord[]): string {
  return exportPlatformAuditToCsv(records)
}

export function exportAuditExplorerJsonBundle(params: {
  records: UnifiedPlatformAuditRecord[]
  filter: AuditExplorerFilter
  operatorEmail: string
}): string {
  const exportedAt = new Date().toISOString()
  let hash = 2166136261
  const seed = `${exportedAt}|${params.operatorEmail}|${params.records.length}|${params.records[0]?.immutableChecksum ?? 'empty'}`
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return JSON.stringify(
    {
      schemaVersion: 'khelgrid.audit-compliance-export.v1',
      exportedAt,
      exportedBy: params.operatorEmail,
      filterScope: params.filter,
      recordCount: params.records.length,
      bundleIntegrityDigest: `SHA-SIM-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`,
      events: params.records,
    },
    null,
    2,
  )
}
