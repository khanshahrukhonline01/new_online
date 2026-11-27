/**
 * KhelGrid Admin — Statutory & Regulatory Compliance Service
 *
 * Covers mandatory Indian & sports-platform regulatory modules:
 * 1. DPDP Act 2023 Data Subject Rights (DSAR) & Consent Ledger (Access, Correction, Erasure, Withdrawal)
 * 2. Minor & Youth Athlete Safeguards (DPDP Sec. 9 Guardian Consent, Coach Police/POCSO Clearance, POSH ICC)
 * 3. IT Rules 2021 Grievance Officer, IPR/Copyright Takedown & NADA/Anti-Doping Compliance Desk
 * 4. Statutory Readiness Evaluation & Exportable Compliance Bundles (CSV + JSON)
 */

import {
  notifyRegulatoryStateChanged,
  publishPartnerComplianceAdvisory,
  type RegulatoryWorkspaceKey,
} from '../../../../src/shared/governance/regulatoryBridge'
import type { UnifiedPlatformAuditRecord } from './adminPlatformGovernanceService'

export const REGULATORY_COMPLIANCE_STORAGE_KEYS = {
  DSAR: 'khelgrid_admin_reg_dsar_v1',
  MINOR_SAFEGUARDS: 'khelgrid_admin_reg_minor_safeguards_v1',
  GRIEVANCES: 'khelgrid_admin_reg_grievances_v1',
  AUDIT: 'khelgrid_admin_reg_audit_v1',
} as const

export type DsarRequestType = 'access' | 'correction' | 'erasure' | 'consent_withdrawal' | 'grievance_redressal'
export type DsarStatus = 'submitted' | 'identity_verified' | 'in_progress' | 'fulfilled' | 'rejected'

export interface DsarRequestRecord {
  id: string
  referenceCode: string
  subjectName: string
  subjectEmail: string
  subjectRole: 'athlete' | 'parent_guardian' | 'coach' | 'partner_staff'
  isMinorDataSubject: boolean
  requestType: DsarRequestType
  status: DsarStatus
  jurisdiction: 'DPDP_ACT_2023'
  submittedAt: string
  dueAt: string
  identityVerified: boolean
  consentPurposeScope: string
  summary: string
  assignedDpo: string
  resolutionNotes?: string
  updatedAt: string
}

export type SafeguardCheckType =
  | 'guardian_consent_sec9'
  | 'coach_police_pocso_clearance'
  | 'academy_posh_icc_filing'
  | 'anti_doping_minor_waiver'

export type SafeguardStatus = 'verified' | 'pending_review' | 'action_required' | 'restricted'

export interface MinorSafeguardRecord {
  id: string
  referenceCode: string
  entityName: string
  entityType: 'athlete' | 'coach' | 'academy' | 'tournament'
  targetPersona: RegulatoryWorkspaceKey
  ageBand?: 'u14' | 'u16' | 'u18' | 'all_youth'
  city: string
  sport: string
  checkType: SafeguardCheckType
  status: SafeguardStatus
  guardianEmail?: string
  documentReference: string
  submittedAt: string
  expiresAt?: string
  lastReviewedBy?: string
  reviewNotes: string
}

export type StatutoryGrievanceCategory =
  | 'it_rules_2021_content'
  | 'ipr_copyright_takedown'
  | 'posh_workplace_safety'
  | 'nada_anti_doping'
  | 'federation_authenticity'

export type GrievanceStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'takedown_enforced'

export interface StatutoryGrievanceRecord {
  id: string
  referenceCode: string
  category: StatutoryGrievanceCategory
  statutoryFramework: string
  complainantName: string
  complainantEmail: string
  targetEntityName: string
  targetEntityRef: string
  targetPersona: RegulatoryWorkspaceKey
  city: string
  severity: 'urgent_72h' | 'standard_15d'
  status: GrievanceStatus
  filedAt: string
  acknowledgeDueAt: string
  resolveDueAt: string
  acknowledgedAt?: string
  assignedOfficer: string
  summary: string
  resolutionOrder?: string
  updatedAt: string
}

export interface RegulatoryReadinessItem {
  id: string
  framework: string
  controlTitle: string
  status: 'compliant' | 'attention_required' | 'at_risk'
  openCount: number
  overdueCount: number
  evidenceNote: string
}

export interface RegulatoryComplianceSnapshot {
  dsarRequests: DsarRequestRecord[]
  minorSafeguards: MinorSafeguardRecord[]
  grievances: StatutoryGrievanceRecord[]
  readiness: RegulatoryReadinessItem[]
  metrics: {
    openDsarCount: number
    overdueDsarCount: number
    pendingSafeguardsCount: number
    restrictedMinorEntitiesCount: number
    openGrievancesCount: number
    unacknowledgedGrievancesCount: number
    overallReadinessScore: number
  }
}

const memoryStore = new Map<string, string>()

function readStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch {
    // fallback to memory store
  }
  const mem = memoryStore.get(key)
  if (mem) {
    try {
      return JSON.parse(mem) as T
    } catch {
      return fallback
    }
  }
  return structuredClone(fallback)
}

function writeStorage<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value)
  memoryStore.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // ignore quota errors
  }
  notifyRegulatoryStateChanged()
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function hoursFromNowIso(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}

function buildChecksum(seed: string): string {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `REG-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`
}

const SEED_DSAR_REQUESTS: DsarRequestRecord[] = [
  {
    id: 'dsar-001',
    referenceCode: 'DPDP-2026-401',
    subjectName: 'Aarav Deshmukh (Guardian: Meera Deshmukh)',
    subjectEmail: 'meera.deshmukh@example.in',
    subjectRole: 'parent_guardian',
    isMinorDataSubject: true,
    requestType: 'erasure',
    status: 'identity_verified',
    jurisdiction: 'DPDP_ACT_2023',
    submittedAt: daysAgoIso(4),
    dueAt: hoursFromNowIso(36),
    identityVerified: true,
    consentPurposeScope: 'Sports CV Public Discovery & Scout Sharing',
    summary: 'Guardian requests erasure of U-16 athlete trial video metrics and removal from public scout index under DPDP Sec. 12.',
    assignedDpo: 'dpo@khelgrid.com',
    updatedAt: daysAgoIso(1),
  },
  {
    id: 'dsar-002',
    referenceCode: 'DPDP-2026-402',
    subjectName: 'Rohan Kulkarni',
    subjectEmail: 'rohan.kulkarni@example.in',
    subjectRole: 'athlete',
    isMinorDataSubject: false,
    requestType: 'access',
    status: 'submitted',
    jurisdiction: 'DPDP_ACT_2023',
    submittedAt: daysAgoIso(2),
    dueAt: hoursFromNowIso(96),
    identityVerified: false,
    consentPurposeScope: 'Full Personal Data Summary & Processing Ledger',
    summary: 'Athlete requested machine-readable copy of stored Sports CV credentials, turf booking history, and consent timestamps.',
    assignedDpo: 'dpo@khelgrid.com',
    updatedAt: daysAgoIso(2),
  },
  {
    id: 'dsar-003',
    referenceCode: 'DPDP-2026-403',
    subjectName: 'Coach Vikram Negi',
    subjectEmail: 'vikram.negi@example.in',
    subjectRole: 'coach',
    isMinorDataSubject: false,
    requestType: 'consent_withdrawal',
    status: 'in_progress',
    jurisdiction: 'DPDP_ACT_2023',
    submittedAt: daysAgoIso(6),
    dueAt: hoursFromNowIso(-10),
    identityVerified: true,
    consentPurposeScope: 'Third-Party Federation Directory Syndication',
    summary: 'Withdrawing consent for outbound coaching directory syndication while keeping active KhelGrid roster account.',
    assignedDpo: 'privacy.ops@khelgrid.com',
    updatedAt: daysAgoIso(1),
  },
  {
    id: 'dsar-004',
    referenceCode: 'DPDP-2026-398',
    subjectName: 'Ananya Nair',
    subjectEmail: 'ananya.nair@example.in',
    subjectRole: 'athlete',
    isMinorDataSubject: false,
    requestType: 'correction',
    status: 'fulfilled',
    jurisdiction: 'DPDP_ACT_2023',
    submittedAt: daysAgoIso(11),
    dueAt: daysAgoIso(4),
    identityVerified: true,
    consentPurposeScope: 'Age Category & District Association Record',
    summary: 'Corrected state badminton ranking metadata and DOB verification record with supporting Aadhaar-masked certificate.',
    assignedDpo: 'dpo@khelgrid.com',
    resolutionNotes: 'Profile record updated and synced across KhelChronicle & Trial Passport.',
    updatedAt: daysAgoIso(5),
  },
]

const SEED_MINOR_SAFEGUARDS: MinorSafeguardRecord[] = [
  {
    id: 'ms-001',
    referenceCode: 'SAFE-U16-104',
    entityName: 'Delhi NCR Youth Football Academy',
    entityType: 'academy',
    targetPersona: 'academy',
    ageBand: 'u16',
    city: 'Delhi',
    sport: 'Football',
    checkType: 'academy_posh_icc_filing',
    status: 'action_required',
    documentReference: 'POSH-ICC-DL-2026-19',
    submittedAt: daysAgoIso(7),
    expiresAt: hoursFromNowIso(48),
    reviewNotes: 'Annual POSH Internal Complaints Committee (ICC) constitution charter missing external member signature.',
  },
  {
    id: 'ms-002',
    referenceCode: 'SAFE-U14-109',
    entityName: 'Kabir Sharma (U-14 Cricket Passport)',
    entityType: 'athlete',
    targetPersona: 'athlete',
    ageBand: 'u14',
    city: 'Mumbai',
    sport: 'Cricket',
    checkType: 'guardian_consent_sec9',
    status: 'pending_review',
    guardianEmail: 'sanjay.sharma@example.in',
    documentReference: 'DPDP-SEC9-OTP-8821',
    submittedAt: daysAgoIso(1),
    reviewNotes: 'Verifiable parental consent token submitted; awaiting KYC match before unlocking public trial showcase.',
  },
  {
    id: 'ms-003',
    referenceCode: 'SAFE-COACH-212',
    entityName: 'Coach Rajeshwar Singh',
    entityType: 'coach',
    targetPersona: 'coach',
    ageBand: 'all_youth',
    city: 'Bengaluru',
    sport: 'Badminton',
    checkType: 'coach_police_pocso_clearance',
    status: 'pending_review',
    documentReference: 'PCC-KA-2026-4410',
    submittedAt: daysAgoIso(3),
    expiresAt: hoursFromNowIso(24 * 180),
    reviewNotes: 'Karnataka Police Clearance Certificate & SafeSport Child Protection undertaking uploaded for U-18 batches.',
  },
  {
    id: 'ms-004',
    referenceCode: 'SAFE-TRN-308',
    entityName: 'Pune State Junior Athletics Meet',
    entityType: 'tournament',
    targetPersona: 'tournament',
    ageBand: 'u18',
    city: 'Pune',
    sport: 'Athletics',
    checkType: 'anti_doping_minor_waiver',
    status: 'verified',
    documentReference: 'NADA-YOUTH-MH-2026',
    submittedAt: daysAgoIso(14),
    expiresAt: hoursFromNowIso(24 * 320),
    lastReviewedBy: 'compliance.lead@khelgrid.com',
    reviewNotes: 'NADA India Youth Anti-Doping education & parental medical emergency consent verified.',
  },
]

const SEED_GRIEVANCES: StatutoryGrievanceRecord[] = [
  {
    id: 'grv-001',
    referenceCode: 'GRV-IT21-701',
    category: 'ipr_copyright_takedown',
    statutoryFramework: 'IT Rules 2021 · Copyright Act Sec. 52',
    complainantName: 'ProSports Broadcast Legal Desk',
    complainantEmail: 'ipr.legal@prosports.example',
    targetEntityName: 'Apex Turf Arena · Match Highlights',
    targetEntityRef: 'KG-VENUE-2901',
    targetPersona: 'turf',
    city: 'Chennai',
    severity: 'urgent_72h',
    status: 'open',
    filedAt: daysAgoIso(1),
    acknowledgeDueAt: hoursFromNowIso(-2),
    resolveDueAt: hoursFromNowIso(46),
    assignedOfficer: 'grievance.officer@khelgrid.com',
    summary: 'Notice of unauthorized broadcast clip embedded in tournament media showcase; requests 72-hour interim takedown.',
    updatedAt: daysAgoIso(1),
  },
  {
    id: 'grv-002',
    referenceCode: 'GRV-POSH-704',
    category: 'posh_workplace_safety',
    statutoryFramework: 'POSH Act 2013 · SafeSport Protocol',
    complainantName: 'Confidential Protected Reporter',
    complainantEmail: 'protected.case.704@khelgrid.internal',
    targetEntityName: 'Northern Star Cricket Academy',
    targetEntityRef: 'ORG-DEL-ACAD-02',
    targetPersona: 'academy',
    city: 'Delhi',
    severity: 'urgent_72h',
    status: 'acknowledged',
    filedAt: daysAgoIso(2),
    acknowledgeDueAt: daysAgoIso(1),
    resolveDueAt: hoursFromNowIso(24),
    acknowledgedAt: daysAgoIso(1.5),
    assignedOfficer: 'posh.icc@khelgrid.com',
    summary: 'Formal SafeSport & POSH conduct escalation involving visiting conditioning trainer; ICC inquiry opened.',
    updatedAt: daysAgoIso(1),
  },
  {
    id: 'grv-003',
    referenceCode: 'GRV-NADA-709',
    category: 'nada_anti_doping',
    statutoryFramework: 'National Anti-Doping Act 2022 · WADA Code',
    complainantName: 'State Athletics Integrity Cell',
    complainantEmail: 'integrity@athletics.example.in',
    targetEntityName: 'Deccan Sprint Combine U-19',
    targetEntityRef: 'TRIAL-HYD-112',
    targetPersona: 'tournament',
    city: 'Hyderabad',
    severity: 'standard_15d',
    status: 'investigating',
    filedAt: daysAgoIso(5),
    acknowledgeDueAt: daysAgoIso(4),
    resolveDueAt: hoursFromNowIso(24 * 10),
    acknowledgedAt: daysAgoIso(4.5),
    assignedOfficer: 'compliance.lead@khelgrid.com',
    summary: 'Verification requested on supplement sponsor claims advertised on U-19 combine flyer to ensure NADA compliance.',
    updatedAt: daysAgoIso(2),
  },
  {
    id: 'grv-004',
    referenceCode: 'GRV-FED-695',
    category: 'federation_authenticity',
    statutoryFramework: 'National Sports Development Code · IT Rules 2021',
    complainantName: 'AIFF Regional Compliance Desk',
    complainantEmail: 'compliance@federation.example.in',
    targetEntityName: 'Metro Kickers Football Trial',
    targetEntityRef: 'KG-TRIAL-884',
    targetPersona: 'tournament',
    city: 'Bengaluru',
    severity: 'standard_15d',
    status: 'resolved',
    filedAt: daysAgoIso(12),
    acknowledgeDueAt: daysAgoIso(11),
    resolveDueAt: hoursFromNowIso(24 * 3),
    acknowledgedAt: daysAgoIso(11.6),
    assignedOfficer: 'grievance.officer@khelgrid.com',
    summary: 'Verified district association sanction letter; corrected listing disclaimer to distinguish private club trial from state federation selection.',
    resolutionOrder: 'Listing amended with verified organizer badge and explicit non-federation disclosure.',
    updatedAt: daysAgoIso(6),
  },
]

const SEED_REGULATORY_AUDIT: UnifiedPlatformAuditRecord[] = [
  {
    id: 'reg-aud-001',
    sequenceCode: 'REG-AUD-9001',
    timestamp: daysAgoIso(1),
    sourceModule: 'platform_governance',
    action: 'DPDP_IDENTITY_VERIFIED',
    actor: 'dpo@khelgrid.com',
    targetEntity: 'DPDP-2026-401',
    summary: 'Verified guardian identity for U-16 erasure request under DPDP Act 2023 Section 12.',
    severity: 'warning',
    immutableChecksum: buildChecksum('REG-AUD-9001|DPDP-2026-401'),
  },
  {
    id: 'reg-aud-002',
    sequenceCode: 'REG-AUD-9002',
    timestamp: daysAgoIso(1.5),
    sourceModule: 'fraud_disputes',
    action: 'GRIEVANCE_ACKNOWLEDGED_IT21',
    actor: 'posh.icc@khelgrid.com',
    targetEntity: 'GRV-POSH-704',
    summary: 'Issued 24h statutory acknowledgment and initiated SafeSport / POSH ICC confidential review.',
    severity: 'critical',
    immutableChecksum: buildChecksum('REG-AUD-9002|GRV-POSH-704'),
  },
]

function recordRegulatoryAudit(params: {
  sourceModule: UnifiedPlatformAuditRecord['sourceModule']
  action: string
  actor: string
  targetEntity: string
  summary: string
  severity: UnifiedPlatformAuditRecord['severity']
}): void {
  const existing = readStorage<UnifiedPlatformAuditRecord[]>(
    REGULATORY_COMPLIANCE_STORAGE_KEYS.AUDIT,
    SEED_REGULATORY_AUDIT,
  )
  const timestamp = new Date().toISOString()
  const sequenceCode = `REG-AUD-${9000 + existing.length + 1}`
  const next: UnifiedPlatformAuditRecord = {
    id: `reg-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sequenceCode,
    timestamp,
    sourceModule: params.sourceModule,
    action: params.action,
    actor: params.actor,
    targetEntity: params.targetEntity,
    summary: params.summary,
    severity: params.severity,
    immutableChecksum: buildChecksum(`${sequenceCode}|${timestamp}|${params.targetEntity}|${params.action}`),
  }
  writeStorage(REGULATORY_COMPLIANCE_STORAGE_KEYS.AUDIT, [next, ...existing])
}

export function getRegulatoryComplianceAuditEvents(): UnifiedPlatformAuditRecord[] {
  return readStorage<UnifiedPlatformAuditRecord[]>(
    REGULATORY_COMPLIANCE_STORAGE_KEYS.AUDIT,
    SEED_REGULATORY_AUDIT,
  )
}

/**
 * Pure statutory readiness evaluator for unit tests and live UI rendering.
 */
export function computeRegulatoryReadiness(params: {
  dsarRequests: DsarRequestRecord[]
  minorSafeguards: MinorSafeguardRecord[]
  grievances: StatutoryGrievanceRecord[]
  nowMs?: number
}): {
  readiness: RegulatoryReadinessItem[]
  metrics: RegulatoryComplianceSnapshot['metrics']
} {
  const nowMs = params.nowMs ?? Date.now()

  const openDsars = params.dsarRequests.filter(r => r.status !== 'fulfilled' && r.status !== 'rejected')
  const overdueDsars = openDsars.filter(r => Date.parse(r.dueAt) <= nowMs)

  const pendingSafeguards = params.minorSafeguards.filter(
    s => s.status === 'pending_review' || s.status === 'action_required',
  )
  const restrictedMinor = params.minorSafeguards.filter(s => s.status === 'restricted')

  const openGrievances = params.grievances.filter(
    g => g.status !== 'resolved' && g.status !== 'takedown_enforced',
  )
  const unackGrievances = openGrievances.filter(g => g.status === 'open')
  const overdueGrievances = openGrievances.filter(
    g =>
      (g.status === 'open' && Date.parse(g.acknowledgeDueAt) <= nowMs) ||
      Date.parse(g.resolveDueAt) <= nowMs,
  )

  const poshGrievances = openGrievances.filter(g => g.category === 'posh_workplace_safety')
  const poshFilingsPending = pendingSafeguards.filter(s => s.checkType === 'academy_posh_icc_filing')

  const nadaOpen = openGrievances.filter(
    g => g.category === 'nada_anti_doping' || g.category === 'federation_authenticity',
  )

  const readiness: RegulatoryReadinessItem[] = [
    {
      id: 'reg-dpdp-2023',
      framework: 'DPDP Act 2023',
      controlTitle: 'Data Subject Access, Erasure & Consent Withdrawal',
      status:
        overdueDsars.length > 0
          ? 'at_risk'
          : openDsars.length > 0
            ? 'attention_required'
            : 'compliant',
      openCount: openDsars.length,
      overdueCount: overdueDsars.length,
      evidenceNote:
        overdueDsars.length > 0
          ? `${overdueDsars.length} statutory DSAR window(s) overdue for DPO completion.`
          : `${openDsars.length} open DSAR ticket(s) within statutory window.`,
    },
    {
      id: 'reg-minor-sec9',
      framework: 'DPDP Sec. 9 & POCSO',
      controlTitle: 'Verifiable Guardian Consent & Youth Coach Clearance',
      status:
        restrictedMinor.length > 0
          ? 'at_risk'
          : pendingSafeguards.length > 0
            ? 'attention_required'
            : 'compliant',
      openCount: pendingSafeguards.length,
      overdueCount: restrictedMinor.length,
      evidenceNote:
        pendingSafeguards.length > 0
          ? `${pendingSafeguards.length} youth safeguard verification(s) awaiting review.`
          : 'All youth guardian consents and coach clearances verified.',
    },
    {
      id: 'reg-it-rules-2021',
      framework: 'IT Rules 2021 & Copyright',
      controlTitle: '24h Grievance Acknowledgment & 72h IPR Takedown SLA',
      status:
        overdueGrievances.length > 0
          ? 'at_risk'
          : unackGrievances.length > 0
            ? 'attention_required'
            : 'compliant',
      openCount: openGrievances.length,
      overdueCount: overdueGrievances.length,
      evidenceNote:
        overdueGrievances.length > 0
          ? `${overdueGrievances.length} grievance(s) past 24h acknowledgment or resolution deadline.`
          : `${openGrievances.length} active grievance(s) tracked with Grievance Officer.`,
    },
    {
      id: 'reg-posh-2013',
      framework: 'POSH Act 2013 & SafeSport',
      controlTitle: 'Academy ICC Charter & Protected Escalation Handling',
      status:
        poshGrievances.length > 0
          ? 'at_risk'
          : poshFilingsPending.length > 0
            ? 'attention_required'
            : 'compliant',
      openCount: poshGrievances.length + poshFilingsPending.length,
      overdueCount: poshGrievances.length,
      evidenceNote:
        poshGrievances.length > 0
          ? `${poshGrievances.length} confidential POSH / SafeSport case(s) active.`
          : `${poshFilingsPending.length} academy ICC charter renewal(s) pending.`,
    },
    {
      id: 'reg-nada-sports',
      framework: 'NADA Act 2022 & Sports Code',
      controlTitle: 'Anti-Doping Disclosures & Federation Authenticity',
      status: nadaOpen.length > 0 ? 'attention_required' : 'compliant',
      openCount: nadaOpen.length,
      overdueCount: 0,
      evidenceNote:
        nadaOpen.length > 0
          ? `${nadaOpen.length} anti-doping / federation authenticity check(s) under review.`
          : 'All published trial listings verified against federation & NADA policies.',
    },
  ]

  const scorePoints = readiness.reduce((acc, item) => {
    if (item.status === 'compliant') return acc + 20
    if (item.status === 'attention_required') return acc + 14
    return acc + 7
  }, 0)

  return {
    readiness,
    metrics: {
      openDsarCount: openDsars.length,
      overdueDsarCount: overdueDsars.length,
      pendingSafeguardsCount: pendingSafeguards.length,
      restrictedMinorEntitiesCount: restrictedMinor.length,
      openGrievancesCount: openGrievances.length,
      unacknowledgedGrievancesCount: unackGrievances.length,
      overallReadinessScore: Math.max(0, Math.min(100, scorePoints)),
    },
  }
}

export function getRegulatoryComplianceSnapshot(nowMs?: number): RegulatoryComplianceSnapshot {
  const dsarRequests = readStorage<DsarRequestRecord[]>(
    REGULATORY_COMPLIANCE_STORAGE_KEYS.DSAR,
    SEED_DSAR_REQUESTS,
  )
  const minorSafeguards = readStorage<MinorSafeguardRecord[]>(
    REGULATORY_COMPLIANCE_STORAGE_KEYS.MINOR_SAFEGUARDS,
    SEED_MINOR_SAFEGUARDS,
  )
  const grievances = readStorage<StatutoryGrievanceRecord[]>(
    REGULATORY_COMPLIANCE_STORAGE_KEYS.GRIEVANCES,
    SEED_GRIEVANCES,
  )

  const { readiness, metrics } = computeRegulatoryReadiness({
    dsarRequests,
    minorSafeguards,
    grievances,
    nowMs,
  })

  return {
    dsarRequests,
    minorSafeguards,
    grievances,
    readiness,
    metrics,
  }
}

export function updateDsarRequestStatus(params: {
  id: string
  status: DsarStatus
  identityVerified?: boolean
  resolutionNotes?: string
  actorEmail: string
}): DsarRequestRecord | null {
  const list = readStorage<DsarRequestRecord[]>(
    REGULATORY_COMPLIANCE_STORAGE_KEYS.DSAR,
    SEED_DSAR_REQUESTS,
  )
  const idx = list.findIndex(r => r.id === params.id)
  if (idx < 0) return null

  const current = list[idx]
  const updated: DsarRequestRecord = {
    ...current,
    status: params.status,
    identityVerified: params.identityVerified ?? current.identityVerified,
    resolutionNotes: params.resolutionNotes?.trim() || current.resolutionNotes,
    updatedAt: new Date().toISOString(),
  }
  const next = [...list]
  next[idx] = updated
  writeStorage(REGULATORY_COMPLIANCE_STORAGE_KEYS.DSAR, next)

  recordRegulatoryAudit({
    sourceModule: 'platform_governance',
    action: `DPDP_DSAR_${params.status.toUpperCase()}`,
    actor: params.actorEmail,
    targetEntity: updated.referenceCode,
    summary: `DPDP ${updated.requestType} request for ${updated.subjectName} moved to ${params.status}.${updated.resolutionNotes ? ` Note: ${updated.resolutionNotes}` : ''}`,
    severity: params.status === 'fulfilled' ? 'info' : 'warning',
  })
  return updated
}

export function updateMinorSafeguardStatus(params: {
  id: string
  status: SafeguardStatus
  reviewNotes?: string
  dispatchPartnerBanner?: boolean
  actorEmail: string
}): MinorSafeguardRecord | null {
  const list = readStorage<MinorSafeguardRecord[]>(
    REGULATORY_COMPLIANCE_STORAGE_KEYS.MINOR_SAFEGUARDS,
    SEED_MINOR_SAFEGUARDS,
  )
  const idx = list.findIndex(r => r.id === params.id)
  if (idx < 0) return null

  const current = list[idx]
  const updated: MinorSafeguardRecord = {
    ...current,
    status: params.status,
    lastReviewedBy: params.actorEmail,
    reviewNotes: params.reviewNotes?.trim() || current.reviewNotes,
  }
  const next = [...list]
  next[idx] = updated
  writeStorage(REGULATORY_COMPLIANCE_STORAGE_KEYS.MINOR_SAFEGUARDS, next)

  if (params.dispatchPartnerBanner && (params.status === 'action_required' || params.status === 'restricted')) {
    publishPartnerComplianceAdvisory({
      id: `safeguard-adv-${updated.id}`,
      targetPersona: updated.targetPersona,
      entityName: updated.entityName,
      sourceDesk: 'verification_vault',
      severity: 'action_required',
      headline:
        params.status === 'restricted'
          ? `Minor Safeguard Hold · ${updated.referenceCode}`
          : `Youth Protection Clearance Required · ${updated.referenceCode}`,
      message: updated.reviewNotes,
      actionUrl: '/workspace',
      issuedBy: params.actorEmail,
      referenceCode: updated.referenceCode,
    })
  }

  recordRegulatoryAudit({
    sourceModule: 'verification_vault',
    action: `MINOR_SAFEGUARD_${params.status.toUpperCase()}`,
    actor: params.actorEmail,
    targetEntity: updated.referenceCode,
    summary: `Safeguard (${updated.checkType}) for ${updated.entityName} updated to ${params.status}. ${updated.reviewNotes}`,
    severity: params.status === 'restricted' ? 'critical' : 'warning',
  })
  return updated
}

export function updateStatutoryGrievanceStatus(params: {
  id: string
  status: GrievanceStatus
  resolutionOrder?: string
  actorEmail: string
}): StatutoryGrievanceRecord | null {
  const list = readStorage<StatutoryGrievanceRecord[]>(
    REGULATORY_COMPLIANCE_STORAGE_KEYS.GRIEVANCES,
    SEED_GRIEVANCES,
  )
  const idx = list.findIndex(g => g.id === params.id)
  if (idx < 0) return null

  const current = list[idx]
  const nowIso = new Date().toISOString()
  const updated: StatutoryGrievanceRecord = {
    ...current,
    status: params.status,
    acknowledgedAt:
      params.status === 'acknowledged' && !current.acknowledgedAt ? nowIso : current.acknowledgedAt,
    resolutionOrder: params.resolutionOrder?.trim() || current.resolutionOrder,
    updatedAt: nowIso,
  }
  const next = [...list]
  next[idx] = updated
  writeStorage(REGULATORY_COMPLIANCE_STORAGE_KEYS.GRIEVANCES, next)

  if (params.status === 'takedown_enforced') {
    publishPartnerComplianceAdvisory({
      id: `grievance-adv-${updated.id}`,
      targetPersona: updated.targetPersona,
      entityName: updated.targetEntityName,
      sourceDesk: 'fraud_disputes',
      severity: 'action_required',
      headline: `Statutory Takedown Enforced · ${updated.referenceCode}`,
      message:
        updated.resolutionOrder ||
        `Interim takedown applied under ${updated.statutoryFramework}. Contact Grievance Officer to submit a counter-notice.`,
      actionUrl: '/workspace',
      issuedBy: params.actorEmail,
      referenceCode: updated.referenceCode,
    })
  }

  recordRegulatoryAudit({
    sourceModule: 'fraud_disputes',
    action: `STATUTORY_GRIEVANCE_${params.status.toUpperCase()}`,
    actor: params.actorEmail,
    targetEntity: updated.referenceCode,
    summary: `${updated.statutoryFramework} case against ${updated.targetEntityName} updated to ${params.status}.${updated.resolutionOrder ? ` Order: ${updated.resolutionOrder}` : ''}`,
    severity: params.status === 'takedown_enforced' ? 'critical' : 'warning',
  })
  return updated
}

export function exportRegulatoryComplianceBundleJson(
  snapshot: RegulatoryComplianceSnapshot,
  operatorEmail: string,
): string {
  const exportedAt = new Date().toISOString()
  const payload = {
    schemaVersion: 'khelgrid.regulatory-bundle.v1',
    exportedAt,
    exportedBy: operatorEmail,
    jurisdictions: [
      'DPDP Act 2023 (India)',
      'Information Technology (Intermediary Guidelines) Rules 2021',
      'POSH Act 2013 & POCSO SafeSport',
      'National Anti-Doping Act 2022',
    ],
    metrics: snapshot.metrics,
    readinessControls: snapshot.readiness,
    dsarRegister: snapshot.dsarRequests,
    minorSafeguardsRegister: snapshot.minorSafeguards,
    grievanceOfficerRegister: snapshot.grievances,
    integrityDigest: buildChecksum(
      `${exportedAt}|${operatorEmail}|${snapshot.dsarRequests.length}|${snapshot.grievances.length}`,
    ),
  }
  return JSON.stringify(payload, null, 2)
}

function escapeCsvCell(value: unknown): string {
  const raw = value === undefined || value === null ? '' : String(value)
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function exportRegulatoryComplianceCsv(snapshot: RegulatoryComplianceSnapshot): string {
  const headers = [
    'Register',
    'Reference Code',
    'Framework',
    'Subject / Entity',
    'Category / Type',
    'Status',
    'Due / Expiry',
    'Summary / Notes',
  ]
  const rows: string[][] = []

  for (const d of snapshot.dsarRequests) {
    rows.push([
      'DPDP DSAR',
      d.referenceCode,
      d.jurisdiction,
      d.subjectName,
      d.requestType,
      d.status,
      d.dueAt,
      d.summary,
    ])
  }
  for (const s of snapshot.minorSafeguards) {
    rows.push([
      'Minor Safeguard',
      s.referenceCode,
      'DPDP Sec 9 / POSH / POCSO',
      s.entityName,
      s.checkType,
      s.status,
      s.expiresAt || 'N/A',
      s.reviewNotes,
    ])
  }
  for (const g of snapshot.grievances) {
    rows.push([
      'Statutory Grievance',
      g.referenceCode,
      g.statutoryFramework,
      g.targetEntityName,
      g.category,
      g.status,
      g.resolveDueAt,
      g.summary,
    ])
  }

  return [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
}

export function resetRegulatoryComplianceForTesting(): void {
  memoryStore.clear()
  if (typeof localStorage !== 'undefined') {
    try {
      Object.values(REGULATORY_COMPLIANCE_STORAGE_KEYS).forEach(k => localStorage.removeItem(k))
    } catch {
      // ignore
    }
  }
  notifyRegulatoryStateChanged()
}
