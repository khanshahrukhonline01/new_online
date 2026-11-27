/**
 * KhelGrid Admin — Queue Claiming & Moderator Workload Assignment Service
 *
 * Provides soft-lock record claiming ("In review by …"), workload distribution
 * across operators, reassignment, stale-claim detection, and audit logging across
 * Listing Moderation, Verification Vault, Trust & Safety, and Regulatory Inbox.
 */

import { notifyRegulatoryStateChanged } from '../../../../src/shared/governance/regulatoryBridge'
import type { UnifiedPlatformAuditRecord } from './adminPlatformGovernanceService'

export const QUEUE_CLAIMS_STORAGE_KEY = 'khelgrid_admin_queue_claims_v1'
export const QUEUE_CLAIMS_AUDIT_KEY = 'khelgrid_admin_queue_claims_audit_v1'

export type ClaimableDeskId =
  | 'post_regulation_gate'
  | 'moderation_desk'
  | 'verification_vault'
  | 'fraud_disputes'
  | 'regulatory_inbox'
  | 'regulatory_compliance'

export interface QueueRecordClaim {
  claimKey: string
  desk: ClaimableDeskId
  recordId: string
  referenceCode?: string
  recordTitle?: string
  claimedBy: string
  claimedByName: string
  claimedAt: string
  note?: string
}

export interface OperatorWorkloadSummary {
  operatorEmail: string
  displayName: string
  totalClaimed: number
  byDesk: Partial<Record<ClaimableDeskId, number>>
  oldestClaimHours: number
}

export const KNOWN_ADMIN_OPERATORS: ReadonlyArray<{ email: string; displayName: string; role: string }> = [
  { email: 'superadmin@khelgrid.com', displayName: 'Super Admin', role: 'Super Admin' },
  { email: 'moderator@khelgrid.com', displayName: 'Lead Moderator', role: 'Moderator' },
  { email: 'compliance.lead@khelgrid.com', displayName: 'Compliance Lead', role: 'Compliance' },
  { email: 'trust.ops@khelgrid.com', displayName: 'Trust & Safety Ops', role: 'Safety' },
  { email: 'dpo@khelgrid.com', displayName: 'Data Protection Officer', role: 'DPO' },
]

const memoryStore = new Map<string, string>()

function buildClaimKey(desk: ClaimableDeskId, recordId: string): string {
  return `${desk}::${recordId}`
}

function formatOperatorName(email: string): string {
  const known = KNOWN_ADMIN_OPERATORS.find(op => op.email.toLowerCase() === email.toLowerCase())
  if (known) return known.displayName
  const local = email.split('@')[0] || email
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

const SEED_CLAIMS: QueueRecordClaim[] = [
  {
    claimKey: buildClaimKey('moderation_desk', 'mod-listing-001'),
    desk: 'moderation_desk',
    recordId: 'mod-listing-001',
    referenceCode: 'KG-ACAD-1042',
    recordTitle: 'National Football Excellence Academy',
    claimedBy: 'compliance.lead@khelgrid.com',
    claimedByName: 'Compliance Lead',
    claimedAt: minutesAgoIso(35),
    note: 'Verifying AIFF youth accreditation certificate.',
  },
  {
    claimKey: buildClaimKey('fraud_disputes', 'ts-case-001'),
    desk: 'fraud_disputes',
    recordId: 'ts-case-001',
    referenceCode: 'TS-2026-081',
    recordTitle: 'Emergency turf floodlight safety escalation',
    claimedBy: 'trust.ops@khelgrid.com',
    claimedByName: 'Trust & Safety Ops',
    claimedAt: minutesAgoIso(18),
    note: 'Coordinating site inspection photo upload.',
  },
]

function readStore<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch {
    // fallback
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

function writeStore<T>(key: string, value: T): void {
  const serialized = JSON.stringify(value)
  memoryStore.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // ignore
  }
  notifyRegulatoryStateChanged()
}

function appendClaimAudit(params: {
  desk: ClaimableDeskId
  action: string
  actor: string
  targetEntity: string
  summary: string
}): void {
  const existing = readStore<UnifiedPlatformAuditRecord[]>(QUEUE_CLAIMS_AUDIT_KEY, [])
  const timestamp = new Date().toISOString()
  const sequenceCode = `CLM-AUD-${4000 + existing.length + 1}`
  const sourceModule: UnifiedPlatformAuditRecord['sourceModule'] =
    params.desk === 'moderation_desk'
      ? 'moderation_desk'
      : params.desk === 'verification_vault'
        ? 'verification_vault'
        : params.desk === 'fraud_disputes'
          ? 'fraud_disputes'
          : 'platform_governance'

  const entry: UnifiedPlatformAuditRecord = {
    id: `clm-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sequenceCode,
    timestamp,
    sourceModule,
    action: params.action,
    actor: params.actor,
    targetEntity: params.targetEntity,
    summary: params.summary,
    severity: 'info',
    immutableChecksum: `CLM-${Math.abs(sequenceCode.length * 997 + existing.length * 131).toString(16).toUpperCase().padStart(6, '0')}`,
  }
  writeStore(QUEUE_CLAIMS_AUDIT_KEY, [entry, ...existing.slice(0, 199)])
}

export function listQueueClaims(desk?: ClaimableDeskId): QueueRecordClaim[] {
  const all = readStore<QueueRecordClaim[]>(QUEUE_CLAIMS_STORAGE_KEY, SEED_CLAIMS)
  return desk ? all.filter(c => c.desk === desk) : all
}

export function getQueueClaim(desk: ClaimableDeskId, recordId: string): QueueRecordClaim | null {
  const key = buildClaimKey(desk, recordId)
  return listQueueClaims().find(c => c.claimKey === key) ?? null
}

export function claimQueueRecord(params: {
  desk: ClaimableDeskId
  recordId: string
  operatorEmail: string
  referenceCode?: string
  recordTitle?: string
  note?: string
}): QueueRecordClaim {
  const claims = listQueueClaims()
  const key = buildClaimKey(params.desk, params.recordId)
  const nextClaim: QueueRecordClaim = {
    claimKey: key,
    desk: params.desk,
    recordId: params.recordId,
    referenceCode: params.referenceCode,
    recordTitle: params.recordTitle,
    claimedBy: params.operatorEmail,
    claimedByName: formatOperatorName(params.operatorEmail),
    claimedAt: new Date().toISOString(),
    note: params.note?.trim() || undefined,
  }
  const filtered = claims.filter(c => c.claimKey !== key)
  writeStore(QUEUE_CLAIMS_STORAGE_KEY, [nextClaim, ...filtered])

  appendClaimAudit({
    desk: params.desk,
    action: 'QUEUE_RECORD_CLAIMED',
    actor: params.operatorEmail,
    targetEntity: params.referenceCode || params.recordId,
    summary: `${nextClaim.claimedByName} claimed ${params.recordTitle || params.recordId} in ${params.desk}.`,
  })

  return nextClaim
}

export function releaseQueueRecord(params: {
  desk: ClaimableDeskId
  recordId: string
  operatorEmail: string
}): boolean {
  const claims = listQueueClaims()
  const key = buildClaimKey(params.desk, params.recordId)
  const existing = claims.find(c => c.claimKey === key)
  if (!existing) return false

  writeStore(
    QUEUE_CLAIMS_STORAGE_KEY,
    claims.filter(c => c.claimKey !== key),
  )

  appendClaimAudit({
    desk: params.desk,
    action: 'QUEUE_RECORD_RELEASED',
    actor: params.operatorEmail,
    targetEntity: existing.referenceCode || params.recordId,
    summary: `${formatOperatorName(params.operatorEmail)} released review lock on ${existing.recordTitle || params.recordId}.`,
  })
  return true
}

export function reassignQueueRecord(params: {
  desk: ClaimableDeskId
  recordId: string
  targetOperatorEmail: string
  actorEmail: string
  referenceCode?: string
  recordTitle?: string
}): QueueRecordClaim {
  const claims = listQueueClaims()
  const key = buildClaimKey(params.desk, params.recordId)
  const nextClaim: QueueRecordClaim = {
    claimKey: key,
    desk: params.desk,
    recordId: params.recordId,
    referenceCode: params.referenceCode,
    recordTitle: params.recordTitle,
    claimedBy: params.targetOperatorEmail,
    claimedByName: formatOperatorName(params.targetOperatorEmail),
    claimedAt: new Date().toISOString(),
    note: `Assigned by ${formatOperatorName(params.actorEmail)}`,
  }
  writeStore(QUEUE_CLAIMS_STORAGE_KEY, [nextClaim, ...claims.filter(c => c.claimKey !== key)])

  appendClaimAudit({
    desk: params.desk,
    action: 'QUEUE_RECORD_REASSIGNED',
    actor: params.actorEmail,
    targetEntity: params.referenceCode || params.recordId,
    summary: `Reassigned ${params.recordTitle || params.recordId} to ${nextClaim.claimedByName} (${params.targetOperatorEmail}).`,
  })
  return nextClaim
}

export function isClaimStale(claim: QueueRecordClaim, nowMs: number = Date.now(), staleThresholdHours = 2): boolean {
  const claimedMs = Date.parse(claim.claimedAt)
  if (!Number.isFinite(claimedMs)) return false
  return (nowMs - claimedMs) / 3_600_000 >= staleThresholdHours
}

/**
 * Pure aggregator for operator workload badges and filter dropdowns.
 */
export function computeOperatorWorkloads(
  claims: QueueRecordClaim[],
  nowMs: number = Date.now(),
): OperatorWorkloadSummary[] {
  const map = new Map<string, OperatorWorkloadSummary>()

  for (const op of KNOWN_ADMIN_OPERATORS) {
    map.set(op.email.toLowerCase(), {
      operatorEmail: op.email,
      displayName: op.displayName,
      totalClaimed: 0,
      byDesk: {},
      oldestClaimHours: 0,
    })
  }

  for (const c of claims) {
    const emailKey = c.claimedBy.toLowerCase()
    const current = map.get(emailKey) ?? {
      operatorEmail: c.claimedBy,
      displayName: c.claimedByName || formatOperatorName(c.claimedBy),
      totalClaimed: 0,
      byDesk: {},
      oldestClaimHours: 0,
    }
    current.totalClaimed += 1
    current.byDesk[c.desk] = (current.byDesk[c.desk] ?? 0) + 1
    const ageHrs = Math.max(0, (nowMs - Date.parse(c.claimedAt)) / 3_600_000)
    if (Number.isFinite(ageHrs) && ageHrs > current.oldestClaimHours) {
      current.oldestClaimHours = Math.round(ageHrs * 10) / 10
    }
    map.set(emailKey, current)
  }

  return Array.from(map.values()).sort((a, b) => b.totalClaimed - a.totalClaimed)
}

export function getQueueWorkflowAuditEvents(): UnifiedPlatformAuditRecord[] {
  return readStore<UnifiedPlatformAuditRecord[]>(QUEUE_CLAIMS_AUDIT_KEY, [])
}

export function resetQueueWorkflowForTesting(): void {
  memoryStore.clear()
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(QUEUE_CLAIMS_STORAGE_KEY)
      localStorage.removeItem(QUEUE_CLAIMS_AUDIT_KEY)
    } catch {
      // ignore
    }
  }
  notifyRegulatoryStateChanged()
}
