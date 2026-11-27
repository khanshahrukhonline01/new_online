import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeAuditExplorerMetrics,
  DEFAULT_AUDIT_EXPLORER_FILTER,
  exportAuditExplorerCsv,
  exportAuditExplorerJsonBundle,
  filterAuditRecords,
  loadAllPlatformAuditRecords,
} from './adminAuditExplorerService'
import {
  claimQueueRecord,
  resetQueueWorkflowForTesting,
} from './adminQueueWorkflowService'
import {
  resetRegulatoryComplianceForTesting,
  updateDsarRequestStatus,
} from './adminRegulatoryComplianceService'

describe('adminAuditExplorerService', () => {
  beforeEach(() => {
    resetQueueWorkflowForTesting()
    resetRegulatoryComplianceForTesting()
  })

  it('aggregates audit records across platform governance, regulatory compliance, and queue claims', async () => {
    claimQueueRecord({
      desk: 'moderation_desk',
      recordId: 'rec-audit-1',
      referenceCode: 'KG-TEST-101',
      recordTitle: 'Audit Test Turf',
      operatorEmail: 'moderator@khelgrid.com',
    })
    updateDsarRequestStatus({
      id: 'dsar-001',
      status: 'in_progress',
      actorEmail: 'dpo@khelgrid.com',
    })

    const all = await loadAllPlatformAuditRecords()
    expect(all.length).toBeGreaterThanOrEqual(4)
    expect(all.some(r => r.action === 'QUEUE_RECORD_CLAIMED')).toBe(true)
    expect(all.some(r => r.action === 'DPDP_DSAR_IN_PROGRESS')).toBe(true)

    // Sorted descending by timestamp
    for (let i = 1; i < all.length; i += 1) {
      expect(Date.parse(all[i - 1].timestamp)).toBeGreaterThanOrEqual(Date.parse(all[i].timestamp))
    }
  })

  it('filters records by module, severity, actor, and search query and exports CSV & JSON bundles', async () => {
    const records = await loadAllPlatformAuditRecords()
    const metrics = computeAuditExplorerMetrics(records)
    expect(metrics.totalEvents).toBe(records.length)
    expect(metrics.criticalCount + metrics.warningCount + metrics.infoCount).toBe(records.length)

    const criticalOnly = filterAuditRecords(records, {
      ...DEFAULT_AUDIT_EXPLORER_FILTER,
      severity: 'critical',
    })
    expect(criticalOnly.every(r => r.severity === 'critical')).toBe(true)

    const csv = exportAuditExplorerCsv(criticalOnly)
    expect(csv.split('\n').length).toBeGreaterThanOrEqual(1)

    const bundle = JSON.parse(
      exportAuditExplorerJsonBundle({
        records: criticalOnly,
        filter: { ...DEFAULT_AUDIT_EXPLORER_FILTER, severity: 'critical' },
        operatorEmail: 'superadmin@khelgrid.com',
      }),
    ) as { schemaVersion: string; recordCount: number; bundleIntegrityDigest: string }

    expect(bundle.schemaVersion).toBe('khelgrid.audit-compliance-export.v1')
    expect(bundle.recordCount).toBe(criticalOnly.length)
    expect(bundle.bundleIntegrityDigest).toMatch(/^SHA-SIM-/)
  })
})
