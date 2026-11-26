/**
 * KhelGrid Admin — Phase 3: Dispute-to-Sanction Escalation & Maker-Checker Dual Control
 *
 * Provides:
 * 1. Cross-desk Dispute-to-Sanction escalation cascading from Trust & Safety cases
 *    into Live Partner Compliance Banners, Tenant Lifecycle enforcement, and Verification
 *    Trust Seal revocation.
 * 2. Maker-Checker four-eyes dual-control approval queue for high-impact regulatory actions
 *    (tenant suspensions, permanent bans / sanctions, verification seal revocations, and
 *    platform kill-switches), strictly preventing self-approval by the proposing admin.
 */

import {
  levySanctionOnEntity,
  getAdminTrustSafetyCaseDetails,
  type ReportedEntityType,
  type SanctionType,
  type TrustIncidentRecord,
} from './adminTrustSafetyService'
import {
  getAdminTenants,
  updateTenantLifecycleStatus,
  type TenantLifecycleStatus,
} from './adminTenantService'
import {
  getAdminVerifications,
  revokeVerification,
} from './adminVerificationService'
import {
  notifyRegulatoryStateChanged,
  publishPartnerComplianceAdvisory,
  type RegulatoryWorkspaceKey,
} from '../../../../src/shared/governance/regulatoryBridge'

export const MAKER_CHECKER_STORAGE_KEY = 'khelgrid_admin_maker_checker_v1'

export type MakerCheckerActionType =
  | 'tenant_suspension'
  | 'dispute_sanction_escalation'
  | 'verification_seal_revocation'
  | 'platform_kill_switch'

export type MakerCheckerStatus =
  | 'pending_approval'
  | 'approved_executed'
  | 'rejected'
  | 'withdrawn'

export interface MakerCheckerProposal {
  id: string
  referenceCode: string
  actionType: MakerCheckerActionType
  sourceDesk: 'fraud_disputes' | 'tenant_governance' | 'verification_vault' | 'platform_governance'
  targetEntityId: string
  targetEntityName: string
  targetEntitySlug?: string
  targetPersona: RegulatoryWorkspaceKey
  title: string
  justification: string
  impactSummary: string[]
  payload: Record<string, unknown>
  makerEmail: string
  makerName: string
  createdAt: string
  status: MakerCheckerStatus
  checkerEmail?: string
  checkerNotes?: string
  decidedAt?: string
  executionSummary?: string
}

export interface EscalationImpactPreview {
  requiresDualControl: boolean
  willPublishComplianceBanner: boolean
  willUpdateTenantStatus: TenantLifecycleStatus | null
  willRevokeVerificationSeal: boolean
  summaryLines: string[]
}

export interface DisputeEscalationReceipt {
  mode: 'executed_direct' | 'queued_maker_checker'
  incidentNumber: string
  sanctionLevied: boolean
  complianceBannerPublished: boolean
  tenantStatusUpdated?: { tenantId: string; tenantName: string; newStatus: TenantLifecycleStatus }
  verificationSealRevoked?: { verificationId: string; referenceCode: string }
  makerCheckerProposal?: MakerCheckerProposal
  summary: string
}

export function mapReportedEntityToWorkspacePersona(
  entityType: ReportedEntityType,
): RegulatoryWorkspaceKey {
  switch (entityType) {
    case 'venue':
      return 'turf'
    case 'coach':
      return 'coach'
    case 'organiser':
      return 'tournament'
    case 'athlete':
      return 'athlete'
    case 'academy':
    case 'tenant':
    default:
      return 'academy'
  }
}

/**
 * Pure helper computing the exact cross-desk downstream impact of a disciplinary sanction.
 */
export function computeEscalationImpactPreview(params: {
  sanctionType: SanctionType
  revokeVerifiedBadge: boolean
  suspendAccess: boolean
  durationDays?: number
}): EscalationImpactPreview {
  const isHighSeverity =
    params.sanctionType === 'temporary_suspension' ||
    params.sanctionType === 'permanent_blacklist' ||
    params.sanctionType === 'police_fir_referral' ||
    params.suspendAccess

  const willUpdateTenantStatus: TenantLifecycleStatus | null =
    params.suspendAccess ||
    params.sanctionType === 'temporary_suspension' ||
    params.sanctionType === 'permanent_blacklist'
      ? 'suspended'
      : params.sanctionType === 'formal_warning' ||
          params.sanctionType === 'public_safety_advisory'
        ? 'restricted'
        : null

  const willRevokeVerificationSeal =
    params.revokeVerifiedBadge ||
    params.sanctionType === 'verified_seal_revocation' ||
    params.sanctionType === 'permanent_blacklist'

  const summaryLines: string[] = [
    'Dispatches a live Compliance Action Banner to the partner’s front-end dashboard immediately.',
  ]
  if (willUpdateTenantStatus === 'suspended') {
    summaryLines.push(
      `Suspends linked organisation workspace (${params.durationDays ? `${params.durationDays}-day lockout` : 'indefinite lockout'}) and pauses public discovery.`,
    )
  } else if (willUpdateTenantStatus === 'restricted') {
    summaryLines.push(
      'Places linked organisation into Restricted (Read-Only) compliance mode until remediated.',
    )
  }
  if (willRevokeVerificationSeal) {
    summaryLines.push(
      'Revokes any active Verified Trust Seal in the Verification & Evidence Vault.',
    )
  }

  return {
    requiresDualControl: isHighSeverity || willRevokeVerificationSeal,
    willPublishComplianceBanner: true,
    willUpdateTenantStatus,
    willRevokeVerificationSeal,
    summaryLines,
  }
}

/**
 * Pure four-eyes validation enforcing that a Maker can NEVER approve or reject their own proposal.
 */
export function validateDualControlDecision(
  proposal: Pick<MakerCheckerProposal, 'status' | 'makerEmail'>,
  checkerEmail: string,
  decision: 'approve' | 'reject' | 'withdraw',
): { valid: boolean; error?: string } {
  if (proposal.status !== 'pending_approval') {
    return {
      valid: false,
      error: `Proposal is already finalized (${proposal.status.replace(/_/g, ' ')}).`,
    }
  }

  const normalizedMaker = proposal.makerEmail.trim().toLowerCase()
  const normalizedChecker = checkerEmail.trim().toLowerCase()

  if (!normalizedChecker) {
    return { valid: false, error: 'Authenticated reviewer email is required.' }
  }

  if (decision === 'withdraw') {
    if (normalizedMaker !== normalizedChecker) {
      return {
        valid: false,
        error: 'Only the originating maker can withdraw a pending proposal.',
      }
    }
    return { valid: true }
  }

  if (normalizedMaker === normalizedChecker) {
    return {
      valid: false,
      error:
        'Four-Eyes Dual-Control Violation: The approving/rejecting Checker must be a different administrator than the Maker.',
    }
  }

  return { valid: true }
}

const SEED_MAKER_CHECKER_PROPOSALS: MakerCheckerProposal[] = [
  {
    id: 'mc-seed-101',
    referenceCode: 'MC-2026-101',
    actionType: 'dispute_sanction_escalation',
    sourceDesk: 'fraud_disputes',
    targetEntityId: 'inc-ts-002',
    targetEntityName: 'Apex Sports Talent Management',
    targetEntitySlug: 'apex-sports-talent-hub',
    targetPersona: 'tournament',
    title: '90-Day Suspension & Fraud Lockout · Apex Sports Talent Management',
    justification:
      'Substantiated ₹5,000 fake ISL reserve scouting combine extortion reported across Bengaluru (TS-2026-082). Recommending 90-day platform suspension, verified badge revocation, and live compliance banner.',
    impactSummary: [
      'Dispatches a live Compliance Action Banner to the Tournament workspace.',
      'Suspends linked organisation workspace (90-day lockout) and pauses public discovery.',
      'Revokes any active Verified Trust Seal in the Verification & Evidence Vault.',
    ],
    payload: {
      caseId: 'inc-ts-002',
      sanctionType: 'temporary_suspension',
      durationDays: 90,
      revokeVerifiedBadge: true,
      suspendAccess: true,
      publicAdvisoryText:
        'Under 90-day disciplinary suspension following unauthorized trial fee investigation (TS-2026-082).',
    },
    makerEmail: 'rohan.d@khelgrid.com',
    makerName: 'Rohan Deshmukh',
    createdAt: '2026-11-24T11:30:00Z',
    status: 'pending_approval',
  },
  {
    id: 'mc-seed-102',
    referenceCode: 'MC-2026-102',
    actionType: 'tenant_suspension',
    sourceDesk: 'tenant_governance',
    targetEntityId: 'org-pune-taekwondo-10',
    targetEntityName: 'Apex Combat & Taekwondo Dojang',
    targetEntitySlug: 'apex-combat-and-taekwondo-dojang',
    targetPersona: 'academy',
    title: 'Compliance Suspension · Apex Combat & Taekwondo Dojang',
    justification:
      'State Taekwondo Federation affiliation expired and municipal Fire Safety NOC remains outstanding past the 7-day compliance grace period.',
    impactSummary: [
      'Updates Tenant Lifecycle status to SUSPENDED across all branches.',
      'Locks front-end Academy workspace with live compliance notice until renewed proof is uploaded.',
    ],
    payload: {
      tenantId: 'org-pune-taekwondo-10',
      newStatus: 'suspended',
    },
    makerEmail: 'mod.compliance@khelgrid.com',
    makerName: 'Ananya Verma',
    createdAt: '2026-11-25T08:15:00Z',
    status: 'pending_approval',
  },
]

let makerCheckerMemoryStore: MakerCheckerProposal[] | null = null

function cloneProposals(list: MakerCheckerProposal[]): MakerCheckerProposal[] {
  return JSON.parse(JSON.stringify(list)) as MakerCheckerProposal[]
}

function readStoredProposals(): MakerCheckerProposal[] {
  if (typeof window === 'undefined') {
    if (!makerCheckerMemoryStore) {
      makerCheckerMemoryStore = cloneProposals(SEED_MAKER_CHECKER_PROPOSALS)
    }
    return cloneProposals(makerCheckerMemoryStore)
  }

  try {
    const raw = window.localStorage.getItem(MAKER_CHECKER_STORAGE_KEY)
    if (!raw) {
      const seeded = cloneProposals(SEED_MAKER_CHECKER_PROPOSALS)
      window.localStorage.setItem(MAKER_CHECKER_STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed as MakerCheckerProposal[]
    }
    return cloneProposals(SEED_MAKER_CHECKER_PROPOSALS)
  } catch {
    return cloneProposals(SEED_MAKER_CHECKER_PROPOSALS)
  }
}

function writeStoredProposals(list: MakerCheckerProposal[]): void {
  makerCheckerMemoryStore = cloneProposals(list)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MAKER_CHECKER_STORAGE_KEY, JSON.stringify(list))
    } catch {
      // ignore quota errors
    }
  }
  notifyRegulatoryStateChanged()
}

export function getMakerCheckerProposals(): MakerCheckerProposal[] {
  return readStoredProposals()
}

export function proposeMakerCheckerAction(params: {
  actionType: MakerCheckerActionType
  sourceDesk: MakerCheckerProposal['sourceDesk']
  targetEntityId: string
  targetEntityName: string
  targetEntitySlug?: string
  targetPersona: RegulatoryWorkspaceKey
  title: string
  justification: string
  impactSummary: string[]
  payload: Record<string, unknown>
  makerEmail: string
  makerName?: string
}): MakerCheckerProposal {
  const list = readStoredProposals()
  const seq = 100 + list.length + 1
  const proposal: MakerCheckerProposal = {
    id: `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    referenceCode: `MC-2026-${seq}`,
    actionType: params.actionType,
    sourceDesk: params.sourceDesk,
    targetEntityId: params.targetEntityId,
    targetEntityName: params.targetEntityName,
    targetEntitySlug: params.targetEntitySlug,
    targetPersona: params.targetPersona,
    title: params.title.trim(),
    justification: params.justification.trim(),
    impactSummary: params.impactSummary,
    payload: params.payload,
    makerEmail: params.makerEmail,
    makerName: params.makerName || params.makerEmail.split('@')[0] || 'Compliance Officer',
    createdAt: new Date().toISOString(),
    status: 'pending_approval',
  }

  writeStoredProposals([proposal, ...list])
  return proposal
}

async function executeDisputeCascade(
  incident: TrustIncidentRecord,
  params: {
    officer: { name: string; email: string }
    sanctionType: SanctionType
    durationDays?: number
    reason: string
    publicAdvisoryText?: string
    revokeVerifiedBadge: boolean
    suspendAccess: boolean
  },
): Promise<DisputeEscalationReceipt> {
  // 1. Levy sanction inside Trust & Safety case ledger
  await levySanctionOnEntity(incident.id, params)

  const impact = computeEscalationImpactPreview({
    sanctionType: params.sanctionType,
    revokeVerifiedBadge: params.revokeVerifiedBadge,
    suspendAccess: params.suspendAccess,
    durationDays: params.durationDays,
  })

  const persona = mapReportedEntityToWorkspacePersona(incident.reportedEntityType)

  // 2. Push Live Partner Compliance Banner to the reported entity's workspace
  const dueAt = params.durationDays
    ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined

  publishPartnerComplianceAdvisory({
    referenceCode: incident.incidentNumber,
    sourceDesk: 'fraud_disputes',
    targetPersona: persona,
    tenantSlug: incident.reportedEntitySlug,
    entityName: incident.reportedEntityName,
    severity:
      impact.willUpdateTenantStatus === 'suspended' ? 'action_required' : 'warning',
    headline: `Disciplinary Sanction Enforced · ${params.sanctionType.replace(/_/g, ' ').toUpperCase()} (${incident.incidentNumber})`,
    message: params.publicAdvisoryText || params.reason,
    dueAt,
    issuedBy: params.officer.email,
    actionUrl: '/help-feedback',
  })

  // 3. Cross-desk Tenant Lifecycle Enforcement (if matching tenant exists)
  let tenantStatusUpdated: DisputeEscalationReceipt['tenantStatusUpdated']
  if (impact.willUpdateTenantStatus) {
    const tenants = getAdminTenants()
    const normalizedName = incident.reportedEntityName.toLowerCase()
    const normalizedSlug = incident.reportedEntitySlug?.toLowerCase()
    const matchedTenant = tenants.find(
      t =>
        (normalizedSlug && t.slug.toLowerCase() === normalizedSlug) ||
        t.name.toLowerCase() === normalizedName ||
        t.name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(t.name.toLowerCase()),
    )

    if (matchedTenant) {
      const updateRes = updateTenantLifecycleStatus(
        matchedTenant.id,
        impact.willUpdateTenantStatus,
        params.officer.email,
        `Escalated from Trust & Safety Case ${incident.incidentNumber}: ${params.reason}`,
      )
      if (updateRes.success) {
        tenantStatusUpdated = {
          tenantId: matchedTenant.id,
          tenantName: matchedTenant.name,
          newStatus: impact.willUpdateTenantStatus,
        }
      }
    }
  }

  // 4. Cross-desk Verification Seal Revocation (if matching dossier exists)
  let verificationSealRevoked: DisputeEscalationReceipt['verificationSealRevoked']
  if (impact.willRevokeVerificationSeal) {
    const verifs = getAdminVerifications()
    const normalizedName = incident.reportedEntityName.toLowerCase()
    const matchedVerif = verifs.find(
      v =>
        v.status === 'verified' &&
        (v.entityName.toLowerCase() === normalizedName ||
          (v.organizationName && v.organizationName.toLowerCase() === normalizedName) ||
          v.entityName.toLowerCase().includes(normalizedName)),
    )
    if (matchedVerif) {
      revokeVerification(
        matchedVerif.id,
        `Revoked via Trust & Safety Escalation (${incident.incidentNumber}): ${params.reason}`,
        params.officer.email,
      )
      verificationSealRevoked = {
        verificationId: matchedVerif.id,
        referenceCode: matchedVerif.referenceCode,
      }
    }
  }

  const executedSteps = [
    `Sanction levied on ${incident.incidentNumber}`,
    `Live compliance banner dispatched to ${persona.toUpperCase()} workspace`,
  ]
  if (tenantStatusUpdated) {
    executedSteps.push(
      `Tenant "${tenantStatusUpdated.tenantName}" set to ${tenantStatusUpdated.newStatus.toUpperCase()}`,
    )
  }
  if (verificationSealRevoked) {
    executedSteps.push(
      `Verification Seal ${verificationSealRevoked.referenceCode} revoked`,
    )
  }

  notifyRegulatoryStateChanged()

  return {
    mode: 'executed_direct',
    incidentNumber: incident.incidentNumber,
    sanctionLevied: true,
    complianceBannerPublished: true,
    tenantStatusUpdated,
    verificationSealRevoked,
    summary: executedSteps.join(' · '),
  }
}

export async function escalateDisputeToSanction(params: {
  caseId: string
  officer: { name: string; email: string }
  sanctionType: SanctionType
  durationDays?: number
  reason: string
  publicAdvisoryText?: string
  revokeVerifiedBadge: boolean
  suspendAccess: boolean
  executionMode: 'execute_direct' | 'propose_dual_control'
}): Promise<DisputeEscalationReceipt> {
  const incident = await getAdminTrustSafetyCaseDetails(params.caseId)
  if (!incident) {
    throw new Error(`Incident case not found: ${params.caseId}`)
  }

  const impact = computeEscalationImpactPreview({
    sanctionType: params.sanctionType,
    revokeVerifiedBadge: params.revokeVerifiedBadge,
    suspendAccess: params.suspendAccess,
    durationDays: params.durationDays,
  })

  if (params.executionMode === 'propose_dual_control') {
    const persona = mapReportedEntityToWorkspacePersona(incident.reportedEntityType)
    const proposal = proposeMakerCheckerAction({
      actionType: 'dispute_sanction_escalation',
      sourceDesk: 'fraud_disputes',
      targetEntityId: incident.id,
      targetEntityName: incident.reportedEntityName,
      targetEntitySlug: incident.reportedEntitySlug,
      targetPersona: persona,
      title: `${params.sanctionType.replace(/_/g, ' ').toUpperCase()} · ${incident.reportedEntityName} (${incident.incidentNumber})`,
      justification: params.reason,
      impactSummary: impact.summaryLines,
      payload: {
        caseId: incident.id,
        sanctionType: params.sanctionType,
        durationDays: params.durationDays,
        publicAdvisoryText: params.publicAdvisoryText,
        revokeVerifiedBadge: params.revokeVerifiedBadge,
        suspendAccess: params.suspendAccess,
      },
      makerEmail: params.officer.email,
      makerName: params.officer.name,
    })

    return {
      mode: 'queued_maker_checker',
      incidentNumber: incident.incidentNumber,
      sanctionLevied: false,
      complianceBannerPublished: false,
      makerCheckerProposal: proposal,
      summary: `Submitted ${proposal.referenceCode} to Dual-Control Approval Queue awaiting second administrator sign-off.`,
    }
  }

  return executeDisputeCascade(incident, {
    officer: params.officer,
    sanctionType: params.sanctionType,
    durationDays: params.durationDays,
    reason: params.reason,
    publicAdvisoryText: params.publicAdvisoryText,
    revokeVerifiedBadge: params.revokeVerifiedBadge,
    suspendAccess: params.suspendAccess,
  })
}

export async function reviewMakerCheckerProposal(params: {
  proposalId: string
  decision: 'approve' | 'reject'
  checkerEmail: string
  checkerName?: string
  notes: string
}): Promise<MakerCheckerProposal> {
  const list = readStoredProposals()
  const idx = list.findIndex(p => p.id === params.proposalId)
  if (idx === -1) {
    throw new Error(`Maker-Checker proposal not found: ${params.proposalId}`)
  }

  const proposal = list[idx]
  const validation = validateDualControlDecision(
    proposal,
    params.checkerEmail,
    params.decision,
  )
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const now = new Date().toISOString()

  if (params.decision === 'reject') {
    const updated: MakerCheckerProposal = {
      ...proposal,
      status: 'rejected',
      checkerEmail: params.checkerEmail,
      checkerNotes: params.notes.trim() || 'Rejected by secondary compliance reviewer.',
      decidedAt: now,
      executionSummary: 'Proposal rejected. No platform-wide changes applied.',
    }
    list[idx] = updated
    writeStoredProposals(list)
    return updated
  }

  // Approve & Execute real downstream regulatory cascade!
  let executionSummary = 'Approved and executed via dual-control governance.'

  if (proposal.actionType === 'dispute_sanction_escalation') {
    const caseId = String(proposal.payload.caseId || proposal.targetEntityId)
    const incident = await getAdminTrustSafetyCaseDetails(caseId)
    if (incident) {
      const receipt = await executeDisputeCascade(incident, {
        officer: {
          name: params.checkerName || params.checkerEmail.split('@')[0] || 'Checker Admin',
          email: params.checkerEmail,
        },
        sanctionType: (proposal.payload.sanctionType as SanctionType) || 'temporary_suspension',
        durationDays:
          typeof proposal.payload.durationDays === 'number'
            ? proposal.payload.durationDays
            : undefined,
        reason: `${proposal.justification} [Dual-Control Approved by ${params.checkerEmail}]`,
        publicAdvisoryText:
          typeof proposal.payload.publicAdvisoryText === 'string'
            ? proposal.payload.publicAdvisoryText
            : undefined,
        revokeVerifiedBadge: Boolean(proposal.payload.revokeVerifiedBadge),
        suspendAccess: Boolean(proposal.payload.suspendAccess),
      })
      executionSummary = receipt.summary
    } else {
      // Fallback live compliance notice if case ID not in seed
      publishPartnerComplianceAdvisory({
        referenceCode: proposal.referenceCode,
        sourceDesk: 'fraud_disputes',
        targetPersona: proposal.targetPersona,
        tenantSlug: proposal.targetEntitySlug,
        entityName: proposal.targetEntityName,
        severity: 'action_required',
        headline: proposal.title,
        message: proposal.justification,
        issuedBy: params.checkerEmail,
        actionUrl: '/help-feedback',
      })
      executionSummary = `Live compliance sanction banner dispatched to ${proposal.targetEntityName}.`
    }
  } else if (proposal.actionType === 'tenant_suspension') {
    const tenantId = String(proposal.payload.tenantId || proposal.targetEntityId)
    const newStatus = (proposal.payload.newStatus as TenantLifecycleStatus) || 'suspended'
    const res = updateTenantLifecycleStatus(
      tenantId,
      newStatus,
      params.checkerEmail,
      `${proposal.justification} [Dual-Control ${proposal.referenceCode} approved by ${params.checkerEmail}]`,
    )
    publishPartnerComplianceAdvisory({
      referenceCode: proposal.referenceCode,
      sourceDesk: 'tenant_governance',
      targetPersona: proposal.targetPersona,
      tenantId,
      tenantSlug: proposal.targetEntitySlug,
      entityName: proposal.targetEntityName,
      severity: 'action_required',
      headline: `Organisation ${newStatus.toUpperCase()} (${proposal.referenceCode})`,
      message: proposal.justification,
      issuedBy: params.checkerEmail,
      actionUrl: '/help-feedback',
    })
    executionSummary = res.success
      ? `Tenant "${proposal.targetEntityName}" updated to ${newStatus.toUpperCase()} and live compliance banner published.`
      : `Live compliance notice published for "${proposal.targetEntityName}" (tenant record archived/external).`
  } else if (proposal.actionType === 'verification_seal_revocation') {
    const verifId = String(proposal.payload.verificationId || proposal.targetEntityId)
    try {
      revokeVerification(
        verifId,
        `${proposal.justification} [Dual-Control ${proposal.referenceCode}]`,
        params.checkerEmail,
      )
      executionSummary = `Verified Trust Seal revoked for ${proposal.targetEntityName} and partner alerted.`
    } catch {
      publishPartnerComplianceAdvisory({
        referenceCode: proposal.referenceCode,
        sourceDesk: 'verification_vault',
        targetPersona: proposal.targetPersona,
        entityName: proposal.targetEntityName,
        severity: 'warning',
        headline: `Verified Seal Revocation Notice (${proposal.referenceCode})`,
        message: proposal.justification,
        issuedBy: params.checkerEmail,
        actionUrl: '/help-feedback',
      })
      executionSummary = `Compliance revocation notice dispatched to ${proposal.targetEntityName}.`
    }
  }

  const updated: MakerCheckerProposal = {
    ...proposal,
    status: 'approved_executed',
    checkerEmail: params.checkerEmail,
    checkerNotes: params.notes.trim() || 'Reviewed evidence and counter-signed under dual control.',
    decidedAt: now,
    executionSummary,
  }
  list[idx] = updated
  writeStoredProposals(list)
  return updated
}

export function withdrawMakerCheckerProposal(
  proposalId: string,
  makerEmail: string,
): MakerCheckerProposal {
  const list = readStoredProposals()
  const idx = list.findIndex(p => p.id === proposalId)
  if (idx === -1) {
    throw new Error(`Maker-Checker proposal not found: ${proposalId}`)
  }

  const proposal = list[idx]
  const validation = validateDualControlDecision(proposal, makerEmail, 'withdraw')
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const updated: MakerCheckerProposal = {
    ...proposal,
    status: 'withdrawn',
    decidedAt: new Date().toISOString(),
    executionSummary: `Withdrawn by maker (${makerEmail}) prior to secondary approval.`,
  }
  list[idx] = updated
  writeStoredProposals(list)
  return updated
}

export function resetMakerCheckerForTesting(): void {
  makerCheckerMemoryStore = cloneProposals(SEED_MAKER_CHECKER_PROPOSALS)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(MAKER_CHECKER_STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}
