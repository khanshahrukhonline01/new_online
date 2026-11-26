import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeSlaStatus,
  buildUnifiedRegulatoryInboxSnapshot,
  issuePartnerComplianceNoticeFromInbox,
  clearPartnerComplianceNotice,
  loadUnifiedRegulatoryInbox,
} from './adminRegulatoryInboxService'
import {
  evaluateVerificationChecklist,
  getAdminVerifications,
  resetAdminVerificationsForTesting,
  toggleVerificationChecklistItem,
  requestVerificationCorrections,
  approveVerification,
} from './adminVerificationService'
import {
  evaluateWorkspaceRegulation,
  resetComplianceAdvisoriesForTesting,
  readStoredComplianceAdvisories,
} from '../../../../src/shared/governance/regulatoryBridge'
import { getAdminModerationListings } from './adminModerationService'
import { getAdminTenants } from './adminTenantService'

describe('Phase 2: Unified Regulatory Inbox, Role Checklists & Live Partner Compliance Banners', () => {
  beforeEach(() => {
    resetComplianceAdvisoriesForTesting()
    resetAdminVerificationsForTesting()
  })

  it('computes breached, at_risk, and on_track SLA windows deterministically', () => {
    const now = Date.parse('2026-11-25T12:00:00.000Z')

    const breached = computeSlaStatus('2026-11-23T00:00:00.000Z', 24, now)
    expect(breached.slaStatus).toBe('breached')
    expect(breached.remainingHours).toBeLessThanOrEqual(0)
    expect(breached.slaRemainingLabel).toContain('Breached by')

    // 24h SLA, 21h elapsed => 3h left (<= 6h risk window) => at_risk
    const atRisk = computeSlaStatus('2026-11-24T15:00:00.000Z', 24, now)
    expect(atRisk.slaStatus).toBe('at_risk')
    expect(atRisk.remainingHours).toBe(3)
    expect(atRisk.slaRemainingLabel).toBe('Due in 3h')

    // 48h SLA, 6h elapsed => 42h left => on_track
    const onTrack = computeSlaStatus('2026-11-25T06:00:00.000Z', 48, now)
    expect(onTrack.slaStatus).toBe('on_track')
    expect(onTrack.remainingHours).toBe(42)
    expect(onTrack.slaRemainingLabel).toBe('42h left')
  })

  it('aggregates actionable items across desks and sorts SLA breached items first', () => {
    const listings = getAdminModerationListings()
    const verifications = getAdminVerifications()
    const tenants = getAdminTenants()

    const snapshot = buildUnifiedRegulatoryInboxSnapshot({
      listings,
      verifications,
      trustCases: [],
      tenants,
      advisories: [],
      nowMs: Date.parse('2026-11-25T12:00:00.000Z'),
    })

    expect(snapshot.items.length).toBeGreaterThan(0)
    expect(snapshot.metrics.totalActionable).toBe(snapshot.items.length)

    // Verify deterministic SLA ordering: breached <= at_risk <= on_track
    const rankMap = { breached: 0, at_risk: 1, on_track: 2 } as const
    for (let i = 1; i < snapshot.items.length; i++) {
      expect(rankMap[snapshot.items[i].slaStatus]).toBeGreaterThanOrEqual(
        rankMap[snapshot.items[i - 1].slaStatus],
      )
    }
  })

  it('evaluates role-specific verification checklists and persists manual overrides with audit trail', () => {
    const verifications = getAdminVerifications()
    const venueDossier = verifications.find(v => v.entityType === 'venue')
    expect(venueDossier).toBeDefined()

    const initialEval = evaluateVerificationChecklist(venueDossier!)
    expect(initialEval.totalCount).toBeGreaterThanOrEqual(3)
    expect(initialEval.items.some(i => i.mandatory)).toBe(true)

    const missingCheck = initialEval.items.find(i => !i.passed)
    if (missingCheck) {
      const updated = toggleVerificationChecklistItem(
        venueDossier!.id,
        missingCheck.id,
        true,
        'compliance.ops@khelgrid.com',
      )
      expect(updated.manualChecklistOverrides?.[missingCheck.id]).toBe(true)
      expect(updated.auditTrail[0].summary).toContain('marked as VERIFIED')

      const reEval = evaluateVerificationChecklist(updated)
      const toggled = reEval.items.find(i => i.id === missingCheck.id)
      expect(toggled?.passed).toBe(true)
      expect(toggled?.source).toBe('manual')
    }
  })

  it('publishes live partner compliance banners from Verification Corrections and clears them on Approval', () => {
    const verifications = getAdminVerifications()
    const target = verifications.find(v => v.entityType === 'venue') ?? verifications[0]
    expect(target).toBeDefined()

    requestVerificationCorrections(
      target.id,
      'Please upload Fire Safety NOC and valid Turf Lease Deed.',
      'compliance.ops@khelgrid.com',
    )

    const regulationAfterCorrection = evaluateWorkspaceRegulation({
      persona: 'turf',
    })
    const activeBanner = regulationAfterCorrection.complianceAdvisories.find(
      a => a.referenceCode === target.referenceCode,
    )
    expect(activeBanner).toBeDefined()
    expect(activeBanner?.severity).toBe('action_required')
    expect(activeBanner?.message).toContain('Fire Safety NOC')

    // Approving verification must automatically resolve and clear the partner banner
    approveVerification(target.id, 'verified_standard', 12, 'compliance.ops@khelgrid.com')

    const regulationAfterApproval = evaluateWorkspaceRegulation({
      persona: 'turf',
    })
    const remaining = regulationAfterApproval.complianceAdvisories.find(
      a => a.referenceCode === target.referenceCode,
    )
    expect(remaining).toBeUndefined()
  })

  it('dispatches and resolves live compliance notices directly from the Unified Regulatory Inbox', async () => {
    const inbox = await loadUnifiedRegulatoryInbox(Date.parse('2026-11-25T12:00:00.000Z'))
    const venueItem = inbox.items.find(i => i.targetPersona === 'turf') ?? inbox.items[0]
    expect(venueItem).toBeDefined()

    const advisory = issuePartnerComplianceNoticeFromInbox({
      item: venueItem,
      severity: 'warning',
      headline: 'Urgent Floodlight Safety Audit Due',
      message: 'Upload updated electrical safety certificate within 24 hours.',
      dueInHours: 24,
      operatorEmail: 'ops.admin@khelgrid.com',
    })

    expect(advisory.referenceCode).toBe(venueItem.referenceCode)
    expect(readStoredComplianceAdvisories().some(a => a.id === advisory.id)).toBe(true)

    const liveWorkspaceDecision = evaluateWorkspaceRegulation({
      persona: venueItem.targetPersona,
      tenantSlug: venueItem.tenantSlug,
    })
    expect(
      liveWorkspaceDecision.complianceAdvisories.some(a => a.id === advisory.id),
    ).toBe(true)

    // Clear the notice
    const cleared = clearPartnerComplianceNotice(advisory.id, 'ops.admin@khelgrid.com')
    expect(cleared).toBe(true)

    const afterClear = evaluateWorkspaceRegulation({
      persona: venueItem.targetPersona,
      tenantSlug: venueItem.tenantSlug,
    })
    expect(afterClear.complianceAdvisories.some(a => a.id === advisory.id)).toBe(false)
  })
})
