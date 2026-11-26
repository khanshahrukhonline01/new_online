import {
  submitVerificationProof,
  type VerificationProofInput,
} from '../../integrations/supabase/public-client'
import {
  recordTenantAuditLog,
  type DbTenant,
} from '../../integrations/supabase/tenant-client'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import type { WorkspacePersona } from '../../shared/routing'

export type PartnerVerificationPersona =
  | 'academy'
  | 'coach'
  | 'turf'
  | 'host'
  | 'tournament'
  | 'organization'

export type PartnerModerationStatus =
  | 'unverified'
  | 'pending_review'
  | 'more_info_needed'
  | 'verified'
  | 'rejected'

export interface StoredVerificationClaim {
  id: string
  entityType: VerificationProofInput['entityType']
  entitySlug: string
  entityName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  claimantRole?: string
  documentType: VerificationProofInput['documentType']
  proofDetails: string
  status: PartnerModerationStatus
  submittedAt: string
  moderatorNotes?: string
  reviewedAt?: string
}

export interface VerificationMilestone {
  id: 'provisioned' | 'proof_submitted' | 'moderation_review' | 'public_badge'
  label: string
  state: 'done' | 'active' | 'pending' | 'blocked'
  detail: string
}

export interface PartnerVerificationSnapshot {
  persona: PartnerVerificationPersona
  claimEntityType: VerificationProofInput['entityType']
  entitySlug: string
  entityName: string
  status: PartnerModerationStatus
  statusLabel: string
  statusTone: 'success' | 'warning' | 'danger' | 'info'
  headline: string
  summary: string
  isPubliclyVerified: boolean
  completedSteps: number
  totalSteps: number
  moderatorNotes?: string
  rejectionReason?: string
  requiredEvidence: readonly string[]
  claims: StoredVerificationClaim[]
  milestones: VerificationMilestone[]
}

export const PARTNER_VERIFICATION_STORAGE_KEY = 'khelgrid_verification_claims'

export const DOCUMENT_CATEGORY_OPTIONS: readonly {
  value: VerificationProofInput['documentType']
  label: string
}[] = [
  {
    value: 'affiliation_certificate',
    label: 'Federation / State Association Affiliation (AIFF, BAI, BCCI, etc.)',
  },
  {
    value: 'coaching_license',
    label: 'Head Coach License (SAI / NIS Patiala Diploma, AFC, NIS)',
  },
  {
    value: 'ground_lease',
    label: 'Ground Ownership / Commercial Lease / Municipal Allotment',
  },
  {
    value: 'municipal_trade_license',
    label: 'Society Registration / Trust Deed / Municipal Trade License / GST',
  },
  {
    value: 'geotagged_photos',
    label: 'Geotagged Facility Photographs & Entrance Signboard',
  },
  {
    value: 'other',
    label: 'Other Official Gazette or Event Sanction Letter',
  },
]

export const PARTNER_VERIFICATION_REQUIREMENTS: Record<PartnerVerificationPersona, readonly string[]> = {
  academy: [
    'Society / Trust / Section-8 registration or State Sports Association affiliation letter',
    'Lead coach NIS / Federation accreditation reference & POCSO compliance declaration',
    'Geotagged training ground photograph showing academy signboard',
  ],
  coach: [
    'SAI / NIS Patiala Diploma, BCCI / AIFF / BWF coaching badge or federation ID',
    'Government photo ID reference for anti-impersonation check',
    'Active phone/WhatsApp number linked to parent discovery enquiries',
  ],
  turf: [
    'Municipal trade license, stadium allotment letter, or commercial ground lease',
    'Geotagged pitch, floodlight, and safety boundary photographs',
    'Active venue operator WhatsApp & direct UPI merchant reference',
  ],
  host: [
    'Facility management authorization or municipal ground allotment permit',
    'Valid venue contact and gate check-in steward details',
    'Geotagged sports complex photographs',
  ],
  tournament: [
    'District / State Sports Federation or Association tournament sanction letter',
    'Medical standby & anti-age-fraud commitment confirmation',
    'Official organizing committee contact & venue confirmation',
  ],
  organization: [
    'Organisation incorporation / Trust / Society registration certificate',
    'Authorized signatory declaration linking branches & staff roles',
    'Official domain email or federation correspondence reference',
  ],
}

const PERSONA_TO_CLAIM_ENTITY: Record<PartnerVerificationPersona, VerificationProofInput['entityType']> = {
  academy: 'academy',
  organization: 'academy',
  coach: 'coach',
  turf: 'venue',
  host: 'venue',
  tournament: 'opportunity',
}

/** Type guard identifying workspace personas eligible for Partner Verification tracking. */
export function isPartnerVerificationPersona(
  persona: WorkspacePersona
): persona is PartnerVerificationPersona {
  return persona !== 'athlete' && persona !== 'creator' && persona !== 'parent'
}

/** Maps a workspace persona to the Supabase `verification_claims.entity_type` check constraint. */
export function mapPersonaToClaimEntityType(
  persona: PartnerVerificationPersona
): VerificationProofInput['entityType'] {
  return PERSONA_TO_CLAIM_ENTITY[persona]
}

/** Reads locally submitted verification claims from browser storage safely (SSR-safe). */
export function getStoredVerificationClaimsForEntity(entitySlug?: string): StoredVerificationClaim[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(PARTNER_VERIFICATION_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const clean = parsed.filter(
      (item): item is StoredVerificationClaim =>
        Boolean(item && typeof item === 'object' && 'entitySlug' in item && 'proofDetails' in item)
    )
    if (!entitySlug) return clean
    return clean
      .filter(c => c.entitySlug === entitySlug)
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
  } catch {
    return []
  }
}

function resolveModerationStatus(params: {
  tenant?: DbTenant | null
  localVerificationStatus?: PartnerModerationStatus
  claims: StoredVerificationClaim[]
}): PartnerModerationStatus {
  const { tenant, localVerificationStatus, claims } = params

  if (tenant?.verification_status) {
    if (tenant.verification_status === 'unverified' && claims.length > 0) {
      return claims[0].status === 'more_info_needed'
        ? 'more_info_needed'
        : claims[0].status === 'rejected'
          ? 'rejected'
          : 'pending_review'
    }
    return tenant.verification_status
  }

  if (localVerificationStatus && localVerificationStatus !== 'unverified') {
    return localVerificationStatus
  }

  if (claims.length > 0) {
    const latest = claims[0]
    if (latest.status === 'more_info_needed' || latest.status === 'rejected' || latest.status === 'pending_review') {
      return latest.status
    }
    return 'pending_review'
  }

  return 'unverified'
}

function buildStatusSummary(status: PartnerModerationStatus, entityName: string) {
  switch (status) {
    case 'verified':
      return {
        statusLabel: 'KhelGrid Verified',
        statusTone: 'success' as const,
        headline: 'Official KhelGrid Verified Partner',
        summary: `${entityName} has passed accreditation review and carries the public Verified Partner badge across athlete search & discovery.`,
      }
    case 'pending_review':
      return {
        statusLabel: 'Pending Moderation Review',
        statusTone: 'info' as const,
        headline: 'Moderation Desk Review In Progress (Est. 2–4 hrs)',
        summary: `Internal SaaS operations remain fully unlocked while the KhelGrid Editorial Moderation Desk audits credentials for ${entityName}.`,
      }
    case 'more_info_needed':
      return {
        statusLabel: 'Clarification Requested',
        statusTone: 'warning' as const,
        headline: 'Moderator Requested Updated Evidence',
        summary: `Please review the moderation note below and submit updated accreditation or facility documentation for ${entityName}.`,
      }
    case 'rejected':
      return {
        statusLabel: 'Verification Rejected',
        statusTone: 'danger' as const,
        headline: 'Accreditation Submission Not Approved',
        summary: `Your public badge is paused until corrected evidence is uploaded addressing the moderator reason below.`,
      }
    case 'unverified':
    default:
      return {
        statusLabel: 'Unverified · Proof Required',
        statusTone: 'warning' as const,
        headline: 'Submit Accreditation Proof for Public Verified Badge',
        summary: `Your private workspace is active. Submit federation accreditation, coaching diploma, or facility proof to unlock public directory ranking.`,
      }
  }
}

/**
 * Computes a complete, honest Verification & Moderation Status snapshot for a partner workspace.
 */
export function getPartnerVerificationSnapshot(params: {
  persona: PartnerVerificationPersona
  tenant?: DbTenant | null
  authUser?: AuthUserProfile | null
  entitySlug?: string
  entityName?: string
  localVerificationStatus?: PartnerModerationStatus
}): PartnerVerificationSnapshot {
  const entitySlug =
    params.tenant?.slug ||
    params.entitySlug ||
    `${params.persona}-workspace`
  const entityName =
    params.tenant?.name ||
    params.entityName ||
    params.authUser?.fullName ||
    'Your Partner Workspace'

  const claims = getStoredVerificationClaimsForEntity(entitySlug)
  const status = resolveModerationStatus({
    tenant: params.tenant,
    localVerificationStatus: params.localVerificationStatus,
    claims,
  })

  const meta = (params.tenant?.metadata || {}) as Record<string, unknown>
  const rejectionReason =
    (typeof meta.rejection_reason === 'string' && meta.rejection_reason.trim()) ||
    claims.find(c => c.status === 'rejected' && c.moderatorNotes)?.moderatorNotes ||
    undefined
  const moderationNotes =
    (typeof meta.moderation_notes === 'string' && meta.moderation_notes.trim()) ||
    claims[0]?.moderatorNotes ||
    undefined

  const hasSubmittedProof = claims.length > 0 || status === 'verified' || status === 'pending_review' || status === 'rejected' || status === 'more_info_needed'

  const milestones: VerificationMilestone[] = [
    {
      id: 'provisioned',
      label: 'Workspace Provisioned',
      state: 'done',
      detail: 'Private SaaS operations console and UPI workflows active.',
    },
    {
      id: 'proof_submitted',
      label: 'Credentials Submitted',
      state: hasSubmittedProof ? 'done' : 'active',
      detail:
        claims.length > 0
          ? `${claims.length} proof submission(s) logged (latest: ${new Date(claims[0].submittedAt).toLocaleDateString('en-IN')}).`
          : status === 'verified'
            ? 'Verified credential packet recorded on registry.'
            : 'Upload federation, NIS, municipal lease, or geotagged photos.',
    },
    {
      id: 'moderation_review',
      label: 'Moderation Desk Audit',
      state:
        status === 'verified'
          ? 'done'
          : status === 'rejected' || status === 'more_info_needed'
            ? 'blocked'
            : status === 'pending_review'
              ? 'active'
              : 'pending',
      detail:
        status === 'verified'
          ? 'Approved by KhelGrid Verification Vault desk.'
          : status === 'rejected'
            ? rejectionReason || 'Rejected — submit corrected credentials to re-open review.'
            : status === 'more_info_needed'
              ? moderationNotes || 'Reviewer requested clearer registration or photo evidence.'
              : status === 'pending_review'
                ? 'Under active editorial cross-check (2–4 hr SLA).'
                : 'Queued automatically once credential proof is submitted.',
    },
    {
      id: 'public_badge',
      label: 'Verified Public Badge',
      state: status === 'verified' ? 'done' : 'pending',
      detail:
        status === 'verified'
          ? 'Public KhelGrid Verified badge active on search & discovery cards.'
          : 'Unlocks automatically after moderation approval.',
    },
  ]

  const completedSteps = milestones.filter(m => m.state === 'done').length
  const copy = buildStatusSummary(status, entityName)

  return {
    persona: params.persona,
    claimEntityType: mapPersonaToClaimEntityType(params.persona),
    entitySlug,
    entityName,
    status,
    statusLabel: copy.statusLabel,
    statusTone: copy.statusTone,
    headline: copy.headline,
    summary: copy.summary,
    isPubliclyVerified: status === 'verified',
    completedSteps,
    totalSteps: milestones.length,
    moderatorNotes: moderationNotes,
    rejectionReason,
    requiredEvidence: PARTNER_VERIFICATION_REQUIREMENTS[params.persona],
    claims,
    milestones,
  }
}

export interface SubmitPartnerVerificationInput {
  persona: PartnerVerificationPersona
  entitySlug: string
  entityName: string
  tenantId?: string
  documentType: VerificationProofInput['documentType']
  proofDetails: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  claimantRole?: string
}

/**
 * Submits credential or facility evidence to `verification_claims` via `submitVerificationProof`
 * and logs an immutable audit entry when bound to a PostgreSQL tenant.
 */
export async function submitPartnerVerificationClaim(
  input: SubmitPartnerVerificationInput
): Promise<{ success: boolean; message: string }> {
  if (!input.contactName.trim() || input.contactName.trim().length < 2) {
    return { success: false, message: 'Please enter an authorized contact name (minimum 2 characters).' }
  }
  if (input.contactPhone.replace(/\D/g, '').length < 8) {
    return { success: false, message: 'Please enter a valid 10-digit WhatsApp or contact number.' }
  }
  if (!input.proofDetails.trim() || input.proofDetails.trim().length < 5) {
    return {
      success: false,
      message: 'Please include credential numbers, registry IDs, or shared document links (minimum 5 characters).',
    }
  }

  const claimEntityType = mapPersonaToClaimEntityType(input.persona)
  const result = await submitVerificationProof({
    entityType: claimEntityType,
    entitySlug: input.entitySlug,
    entityName: input.entityName,
    contactName: input.contactName.trim(),
    contactPhone: input.contactPhone.trim(),
    contactEmail: input.contactEmail?.trim() || undefined,
    claimantRole: input.claimantRole || input.persona,
    documentType: input.documentType,
    proofDetails: input.proofDetails.trim(),
  })

  if (result.success && input.tenantId) {
    recordTenantAuditLog({
      tenantId: input.tenantId,
      action: 'verification_proof_submitted',
      entityType: 'verification_claims',
      details: {
        entitySlug: input.entitySlug,
        documentType: input.documentType,
        persona: input.persona,
      },
    }).catch(err => console.warn('[PartnerVerification] Audit log warning:', err))
  }

  if (result.success && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('khelgrid:verification-changed'))
  }

  return result
}
