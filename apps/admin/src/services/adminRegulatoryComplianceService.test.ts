import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeRegulatoryReadiness,
  exportRegulatoryComplianceBundleJson,
  exportRegulatoryComplianceCsv,
  getRegulatoryComplianceAuditEvents,
  getRegulatoryComplianceSnapshot,
  resetRegulatoryComplianceForTesting,
  updateDsarRequestStatus,
  updateMinorSafeguardStatus,
  updateStatutoryGrievanceStatus,
} from './adminRegulatoryComplianceService'
import {
  readStoredComplianceAdvisories,
  resetComplianceAdvisoriesForTesting,
} from '../../../../src/shared/governance/regulatoryBridge'

describe('adminRegulatoryComplianceService', () => {
  beforeEach(() => {
    resetRegulatoryComplianceForTesting()
    resetComplianceAdvisoriesForTesting()
  })

  it('loads statutory DPDP, Minor Safeguards, Grievance registers and readiness score', () => {
    const snap = getRegulatoryComplianceSnapshot()
    expect(snap.dsarRequests.length).toBeGreaterThanOrEqual(3)
    expect(snap.minorSafeguards.length).toBeGreaterThanOrEqual(3)
    expect(snap.grievances.length).toBeGreaterThanOrEqual(3)
    expect(snap.readiness.length).toBe(5)
    expect(snap.metrics.overallReadinessScore).toBeGreaterThan(0)
    expect(snap.metrics.overallReadinessScore).toBeLessThanOrEqual(100)
  })

  it('updates DSAR status, verifies identity, and appends an immutable regulatory audit event', () => {
    const before = getRegulatoryComplianceSnapshot()
    const target = before.dsarRequests.find(d => d.status !== 'fulfilled')
    expect(target).toBeDefined()

    const updated = updateDsarRequestStatus({
      id: target!.id,
      status: 'fulfilled',
      identityVerified: true,
      resolutionNotes: 'Completed data export & erasure confirmation dispatched.',
      actorEmail: 'dpo@khelgrid.com',
    })

    expect(updated?.status).toBe('fulfilled')
    expect(updated?.identityVerified).toBe(true)

    const after = getRegulatoryComplianceSnapshot()
    expect(after.metrics.openDsarCount).toBe(before.metrics.openDsarCount - 1)

    const audit = getRegulatoryComplianceAuditEvents()
    expect(audit[0]?.action).toBe('DPDP_DSAR_FULFILLED')
    expect(audit[0]?.targetEntity).toBe(target!.referenceCode)
  })

  it('restricts a minor safeguard and dispatches a live partner compliance advisory banner', () => {
    const snap = getRegulatoryComplianceSnapshot()
    const safeguard = snap.minorSafeguards.find(s => s.status !== 'restricted')
    expect(safeguard).toBeDefined()

    const updated = updateMinorSafeguardStatus({
      id: safeguard!.id,
      status: 'restricted',
      reviewNotes: 'Police / POCSO verification overdue; youth batch creation paused.',
      dispatchPartnerBanner: true,
      actorEmail: 'compliance.lead@khelgrid.com',
    })

    expect(updated?.status).toBe('restricted')
    const advisories = readStoredComplianceAdvisories()
    expect(advisories.some(a => a.referenceCode === safeguard!.referenceCode)).toBe(true)
  })

  it('acknowledges and enforces statutory takedown under IT Rules 2021 and exports signed bundles', () => {
    const snap = getRegulatoryComplianceSnapshot()
    const openGrievance = snap.grievances.find(g => g.status === 'open')
    expect(openGrievance).toBeDefined()

    const acked = updateStatutoryGrievanceStatus({
      id: openGrievance!.id,
      status: 'acknowledged',
      actorEmail: 'grievance.officer@khelgrid.com',
    })
    expect(acked?.acknowledgedAt).toBeTruthy()

    const enforced = updateStatutoryGrievanceStatus({
      id: openGrievance!.id,
      status: 'takedown_enforced',
      resolutionOrder: 'Interim takedown enforced under IT Rules 2021 Rule 3(2).',
      actorEmail: 'grievance.officer@khelgrid.com',
    })
    expect(enforced?.status).toBe('takedown_enforced')

    const latest = getRegulatoryComplianceSnapshot()
    const csv = exportRegulatoryComplianceCsv(latest)
    expect(csv).toContain('Register,Reference Code,Framework')
    expect(csv).toContain(openGrievance!.referenceCode)

    const jsonBundle = JSON.parse(
      exportRegulatoryComplianceBundleJson(latest, 'dpo@khelgrid.com'),
    ) as { schemaVersion: string; integrityDigest: string; dsarRegister: unknown[] }
    expect(jsonBundle.schemaVersion).toBe('khelgrid.regulatory-bundle.v1')
    expect(jsonBundle.integrityDigest).toBeTruthy()
    expect(jsonBundle.dsarRegister.length).toBe(latest.dsarRequests.length)
  })

  it('computes 100% readiness score when all statutory controls are clear', () => {
    const res = computeRegulatoryReadiness({
      dsarRequests: [],
      minorSafeguards: [],
      grievances: [],
    })
    expect(res.metrics.overallReadinessScore).toBe(100)
    expect(res.readiness.every(r => r.status === 'compliant')).toBe(true)
  })
})
