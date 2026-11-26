import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeEscalationImpactPreview,
  escalateDisputeToSanction,
  getMakerCheckerProposals,
  proposeMakerCheckerAction,
  resetMakerCheckerForTesting,
  reviewMakerCheckerProposal,
  validateDualControlDecision,
  withdrawMakerCheckerProposal,
} from './adminGovernanceEscalationService'
import {
  getAdminTrustSafetyCases,
  resetAdminTrustSafetyForTesting,
} from './adminTrustSafetyService'
import {
  getAdminTenantDetails,
  resetAdminTenantsForTesting,
} from './adminTenantService'
import { resetAdminVerificationsForTesting } from './adminVerificationService'
import {
  endReadOnlyWorkspaceInspection,
  evaluateWorkspaceRegulation,
  getActiveReadOnlyInspection,
  mapTenantTypeToInspectionTarget,
  resetComplianceAdvisoriesForTesting,
  startReadOnlyWorkspaceInspection,
} from '../../../../src/shared/governance/regulatoryBridge'

describe('Phase 3: Cross-Desk Dispute Escalation, Maker-Checker & Read-Only Inspector', () => {
  beforeEach(() => {
    resetMakerCheckerForTesting()
    resetAdminTrustSafetyForTesting()
    resetAdminTenantsForTesting()
    resetAdminVerificationsForTesting()
    resetComplianceAdvisoriesForTesting()
    endReadOnlyWorkspaceInspection()
  })

  it('computes accurate cross-desk escalation impact previews across severities', () => {
    const suspensionImpact = computeEscalationImpactPreview({
      sanctionType: 'temporary_suspension',
      revokeVerifiedBadge: true,
      suspendAccess: true,
      durationDays: 90,
    })
    expect(suspensionImpact.requiresDualControl).toBe(true)
    expect(suspensionImpact.willPublishComplianceBanner).toBe(true)
    expect(suspensionImpact.willUpdateTenantStatus).toBe('suspended')
    expect(suspensionImpact.willRevokeVerificationSeal).toBe(true)
    expect(suspensionImpact.summaryLines.length).toBe(3)

    const warningImpact = computeEscalationImpactPreview({
      sanctionType: 'formal_warning',
      revokeVerifiedBadge: false,
      suspendAccess: false,
    })
    expect(warningImpact.requiresDualControl).toBe(false)
    expect(warningImpact.willUpdateTenantStatus).toBe('restricted')
    expect(warningImpact.willRevokeVerificationSeal).toBe(false)
  })

  it('strictly enforces four-eyes dual-control rules (maker cannot self-approve or self-reject)', () => {
    const pendingProposal = {
      status: 'pending_approval' as const,
      makerEmail: 'ops.admin@khelgrid.com',
    }

    const selfApprove = validateDualControlDecision(
      pendingProposal,
      'OPS.ADMIN@khelgrid.com',
      'approve',
    )
    expect(selfApprove.valid).toBe(false)
    expect(selfApprove.error).toMatch(/Four-Eyes Dual-Control Violation/i)

    const selfReject = validateDualControlDecision(
      pendingProposal,
      'ops.admin@khelgrid.com',
      'reject',
    )
    expect(selfReject.valid).toBe(false)

    const selfWithdraw = validateDualControlDecision(
      pendingProposal,
      'ops.admin@khelgrid.com',
      'withdraw',
    )
    expect(selfWithdraw.valid).toBe(true)

    const checkerApprove = validateDualControlDecision(
      pendingProposal,
      'chief.compliance@khelgrid.com',
      'approve',
    )
    expect(checkerApprove.valid).toBe(true)

    const wrongWithdraw = validateDualControlDecision(
      pendingProposal,
      'chief.compliance@khelgrid.com',
      'withdraw',
    )
    expect(wrongWithdraw.valid).toBe(false)
  })

  it('executes direct dispute-to-sanction escalation and pushes live partner compliance banner', async () => {
    const { cases } = await getAdminTrustSafetyCases()
    const targetCase = cases.find(c => c.id === 'inc-ts-002') || cases[0]
    expect(targetCase).toBeDefined()

    const receipt = await escalateDisputeToSanction({
      caseId: targetCase.id,
      officer: { name: 'Ops Admin', email: 'ops.admin@khelgrid.com' },
      sanctionType: 'temporary_suspension',
      durationDays: 60,
      reason: 'Substantiated unauthorized trial fee demand across Bengaluru venues.',
      publicAdvisoryText: 'Suspended pending trial fee refund verification.',
      revokeVerifiedBadge: true,
      suspendAccess: true,
      executionMode: 'execute_direct',
    })

    expect(receipt.mode).toBe('executed_direct')
    expect(receipt.sanctionLevied).toBe(true)
    expect(receipt.complianceBannerPublished).toBe(true)

    const regulation = evaluateWorkspaceRegulation({
      persona: 'tournament',
      tenantSlug: targetCase.reportedEntitySlug,
    })
    expect(regulation.complianceAdvisories.length).toBeGreaterThan(0)
    expect(regulation.complianceAdvisories[0]?.referenceCode).toBe(targetCase.incidentNumber)
  })

  it('queues dual-control proposal, blocks self-approval, and executes full cascade on second admin approval', async () => {
    const { cases } = await getAdminTrustSafetyCases()
    const targetCase = cases.find(c => c.id === 'inc-ts-002') || cases[0]

    const queued = await escalateDisputeToSanction({
      caseId: targetCase.id,
      officer: { name: 'Investigator One', email: 'investigator.one@khelgrid.com' },
      sanctionType: 'temporary_suspension',
      durationDays: 90,
      reason: 'Confirmed extortion scheme targeting youth athletes.',
      revokeVerifiedBadge: true,
      suspendAccess: true,
      executionMode: 'propose_dual_control',
    })

    expect(queued.mode).toBe('queued_maker_checker')
    expect(queued.sanctionLevied).toBe(false)
    expect(queued.makerCheckerProposal).toBeDefined()

    const proposalId = queued.makerCheckerProposal!.id

    await expect(
      reviewMakerCheckerProposal({
        proposalId,
        decision: 'approve',
        checkerEmail: 'investigator.one@khelgrid.com',
        notes: 'Trying to self-approve',
      }),
    ).rejects.toThrow(/Four-Eyes Dual-Control Violation/i)

    const approved = await reviewMakerCheckerProposal({
      proposalId,
      decision: 'approve',
      checkerEmail: 'chief.compliance@khelgrid.com',
      checkerName: 'Chief Compliance',
      notes: 'Evidence independently verified and counter-signed.',
    })

    expect(approved.status).toBe('approved_executed')
    expect(approved.checkerEmail).toBe('chief.compliance@khelgrid.com')
    expect(approved.executionSummary).toContain(targetCase.incidentNumber)

    const regulation = evaluateWorkspaceRegulation({
      persona: 'tournament',
      tenantSlug: targetCase.reportedEntitySlug,
    })
    expect(
      regulation.complianceAdvisories.some(a => a.referenceCode === targetCase.incidentNumber),
    ).toBe(true)
  })

  it('executes tenant suspension proposal under dual control and updates tenant lifecycle status', async () => {
    const proposals = getMakerCheckerProposals()
    const tenantProposal = proposals.find(p => p.referenceCode === 'MC-2026-102')
    expect(tenantProposal).toBeDefined()

    const approved = await reviewMakerCheckerProposal({
      proposalId: tenantProposal!.id,
      decision: 'approve',
      checkerEmail: 'ops.admin@khelgrid.com',
      notes: 'Confirmed expired affiliation and Fire Safety NOC.',
    })

    expect(approved.status).toBe('approved_executed')
    const updatedTenant = getAdminTenantDetails(tenantProposal!.targetEntityId)
    expect(updatedTenant?.status).toBe('suspended')

    const regulation = evaluateWorkspaceRegulation({
      persona: 'academy',
      tenantId: tenantProposal!.targetEntityId,
    })
    expect(
      regulation.complianceAdvisories.some(a => a.referenceCode === 'MC-2026-102'),
    ).toBe(true)
  })

  it('allows maker to withdraw their own pending proposal', () => {
    const created = proposeMakerCheckerAction({
      actionType: 'tenant_suspension',
      sourceDesk: 'tenant_governance',
      targetEntityId: 'org-blr-turf-02',
      targetEntityName: 'Bangalore Turf & Football Arena',
      targetPersona: 'turf',
      title: 'Compliance Suspension · Bangalore Turf & Football Arena',
      justification: 'Pending municipal renewal check.',
      impactSummary: ['Suspends venue bookings.'],
      payload: { tenantId: 'org-blr-turf-02', newStatus: 'suspended' },
      makerEmail: 'ops.admin@khelgrid.com',
    })

    const withdrawn = withdrawMakerCheckerProposal(created.id, 'ops.admin@khelgrid.com')
    expect(withdrawn.status).toBe('withdrawn')
  })

  it('manages read-only workspace inspection sessions with expiry and clean exit', () => {
    const target = mapTenantTypeToInspectionTarget('venue')
    expect(target.routePath).toBe('/turf-calendar')
    expect(target.persona).toBe('turf')

    const session = startReadOnlyWorkspaceInspection({
      tenantId: 'org-blr-turf-02',
      tenantSlug: 'bangalore-turf-football-arena',
      tenantName: 'Bangalore Turf & Football Arena',
      tenantType: 'venue',
      adminEmail: 'ops.admin@khelgrid.com',
      durationMinutes: 30,
    })

    const active = getActiveReadOnlyInspection()
    expect(active?.tenantId).toBe('org-blr-turf-02')
    expect(active?.routePath).toBe('/turf-calendar')

    // Expired timestamp auto-clears session
    const afterExpiry = getActiveReadOnlyInspection(Date.parse(session.expiresAt) + 1000)
    expect(afterExpiry).toBeNull()
    expect(getActiveReadOnlyInspection()).toBeNull()
  })
})
