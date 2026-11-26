/**
 * KhelGrid Admin — Phase 2: Unified Regulatory Inbox & SLA Engine
 *
 * Aggregates all actionable governance work from across KhelGrid's desks
 * (Listing Moderation, Verification & Evidence Vault, Trust & Safety, and
 * Tenant Compliance) into a single SLA-prioritized inbox, and enables admins
 * to dispatch live Partner Compliance Banners directly to front-end workspaces.
 */

import {
  getAdminModerationListings,
  type AdminModerationListing,
  type ModerationListingType,
} from './adminModerationService'
import {
  calculateExpiryStatus,
  evaluateVerificationChecklist,
  getAdminVerifications,
  mapVerificationEntityToWorkspacePersona,
  type AdminVerificationItem,
} from './adminVerificationService'
import {
  getAdminTrustSafetyCases,
  type IncidentSeverity,
  type ReportedEntityType,
  type TrustIncidentRecord,
} from './adminTrustSafetyService'
import {
  getAdminTenants,
  type AdminTenantSummary,
  type TenantType,
} from './adminTenantService'
import {
  publishPartnerComplianceAdvisory,
  readStoredComplianceAdvisories,
  resolvePartnerComplianceAdvisory,
  type PartnerComplianceAdvisory,
  type PartnerComplianceSeverity,
  type RegulatoryWorkspaceKey,
} from '../../../../src/shared/governance/regulatoryBridge'

export type RegulatoryInboxSourceDesk =
  | 'moderation_desk'
  | 'verification_vault'
  | 'fraud_disputes'
  | 'tenant_governance'

export type SlaStatus = 'breached' | 'at_risk' | 'on_track'

export type InboxPartnerRole =
  | 'academy'
  | 'coach'
  | 'venue'
  | 'tournament'
  | 'athlete'
  | 'other'

export interface RegulatoryInboxItem {
  id: string
  entityId: string
  referenceCode: string
  sourceDesk: RegulatoryInboxSourceDesk
  sourceLabel: string
  title: string
  entityName: string
  partnerRole: InboxPartnerRole
  targetPersona: RegulatoryWorkspaceKey
  tenantSlug?: string
  city: string
  sport?: string
  statusLabel: string
  priority: 'critical' | 'high' | 'standard'
  createdAt: string
  slaTargetHours: number
  ageHours: number
  remainingHours: number
  slaStatus: SlaStatus
  slaRemainingLabel: string
  summary: string
  missingChecklistLabels?: string[]
  hasActiveNotice: boolean
}

export interface UnifiedRegulatoryInboxMetrics {
  totalActionable: number
  breachedCount: number
  atRiskCount: number
  onTrackCount: number
  activePartnerNoticesCount: number
  byDesk: Record<RegulatoryInboxSourceDesk, number>
}

export interface UnifiedRegulatoryInboxSnapshot {
  items: RegulatoryInboxItem[]
  activeAdvisories: PartnerComplianceAdvisory[]
  metrics: UnifiedRegulatoryInboxMetrics
  generatedAt: string
}

export interface SlaComputation {
  slaStatus: SlaStatus
  ageHours: number
  remainingHours: number
  slaRemainingLabel: string
}

function formatHourDuration(hours: number): string {
  const abs = Math.max(1, Math.round(Math.abs(hours)))
  if (abs >= 48) {
    const days = Math.round(abs / 24)
    return `${days}d`
  }
  return `${abs}h`
}

/**
 * Pure deterministic SLA evaluator.
 * - `remainingHours <= 0` => `'breached'`
 * - `remainingHours <= Math.min(6, slaTargetHours * 0.25)` => `'at_risk'`
 * - otherwise => `'on_track'`
 */
export function computeSlaStatus(
  createdAtIso: string,
  slaTargetHours: number,
  nowMs: number = Date.now(),
): SlaComputation {
  const parsedMs = Date.parse(createdAtIso)
  const safeCreatedMs = Number.isFinite(parsedMs) ? parsedMs : nowMs
  const ageHours = Math.max(0, (nowMs - safeCreatedMs) / (1000 * 60 * 60))
  const remainingHours = slaTargetHours - ageHours

  if (remainingHours <= 0) {
    return {
      slaStatus: 'breached',
      ageHours: Math.round(ageHours * 10) / 10,
      remainingHours: Math.round(remainingHours * 10) / 10,
      slaRemainingLabel: `Breached by ${formatHourDuration(remainingHours)}`,
    }
  }

  const riskThresholdHours = Math.min(6, slaTargetHours * 0.25)
  if (remainingHours <= riskThresholdHours) {
    return {
      slaStatus: 'at_risk',
      ageHours: Math.round(ageHours * 10) / 10,
      remainingHours: Math.round(remainingHours * 10) / 10,
      slaRemainingLabel: `Due in ${formatHourDuration(remainingHours)}`,
    }
  }

  return {
    slaStatus: 'on_track',
    ageHours: Math.round(ageHours * 10) / 10,
    remainingHours: Math.round(remainingHours * 10) / 10,
    slaRemainingLabel: `${formatHourDuration(remainingHours)} left`,
  }
}

function mapListingTypeToRole(listingType: ModerationListingType): {
  partnerRole: InboxPartnerRole
  targetPersona: RegulatoryWorkspaceKey
} {
  switch (listingType) {
    case 'academy':
      return { partnerRole: 'academy', targetPersona: 'academy' }
    case 'coach':
      return { partnerRole: 'coach', targetPersona: 'coach' }
    case 'venue':
    case 'pickup_game':
      return { partnerRole: 'venue', targetPersona: 'turf' }
    case 'trial':
    case 'camp':
    case 'scholarship':
      return { partnerRole: 'tournament', targetPersona: 'tournament' }
    default:
      return { partnerRole: 'other', targetPersona: 'organization' }
  }
}

function mapReportedEntityToRole(entityType: ReportedEntityType): {
  partnerRole: InboxPartnerRole
  targetPersona: RegulatoryWorkspaceKey
} {
  switch (entityType) {
    case 'academy':
    case 'tenant':
      return { partnerRole: 'academy', targetPersona: 'academy' }
    case 'coach':
      return { partnerRole: 'coach', targetPersona: 'coach' }
    case 'venue':
      return { partnerRole: 'venue', targetPersona: 'turf' }
    case 'organiser':
      return { partnerRole: 'tournament', targetPersona: 'tournament' }
    case 'athlete':
      return { partnerRole: 'athlete', targetPersona: 'athlete' }
    default:
      return { partnerRole: 'other', targetPersona: 'organization' }
  }
}

function mapTenantTypeToRole(tenantType: TenantType): {
  partnerRole: InboxPartnerRole
  targetPersona: RegulatoryWorkspaceKey
} {
  switch (tenantType) {
    case 'venue':
      return { partnerRole: 'venue', targetPersona: 'turf' }
    case 'coach':
      return { partnerRole: 'coach', targetPersona: 'coach' }
    case 'tournament':
      return { partnerRole: 'tournament', targetPersona: 'tournament' }
    case 'academy':
    case 'university':
    case 'club':
    default:
      return { partnerRole: 'academy', targetPersona: 'academy' }
  }
}

function trustSeverityToSlaHours(severity: IncidentSeverity): {
  hours: number
  priority: 'critical' | 'high' | 'standard'
} {
  switch (severity) {
    case 'critical_p0':
      return { hours: 4, priority: 'critical' }
    case 'high_p1':
      return { hours: 12, priority: 'high' }
    case 'medium_p2':
      return { hours: 24, priority: 'standard' }
    case 'low_p3':
    default:
      return { hours: 48, priority: 'standard' }
  }
}

const SLA_RANK: Record<SlaStatus, number> = {
  breached: 0,
  at_risk: 1,
  on_track: 2,
}

const PRIORITY_RANK: Record<'critical' | 'high' | 'standard', number> = {
  critical: 0,
  high: 1,
  standard: 2,
}

/**
 * Pure aggregator for deterministic unit testing and live UI rendering.
 */
export function buildUnifiedRegulatoryInboxSnapshot(params: {
  listings: AdminModerationListing[]
  verifications: AdminVerificationItem[]
  trustCases: TrustIncidentRecord[]
  tenants: AdminTenantSummary[]
  advisories: PartnerComplianceAdvisory[]
  nowMs?: number
}): UnifiedRegulatoryInboxSnapshot {
  const nowMs = params.nowMs ?? Date.now()
  const activeAdvisories = params.advisories.filter(a => a.severity !== 'resolved')
  const activeNoticeRefs = new Set(activeAdvisories.map(a => a.referenceCode))

  const items: RegulatoryInboxItem[] = []

  // 1. Listing Moderation Queue (24h SLA)
  for (const listing of params.listings) {
    if (!['pending_review', 'under_review', 'changes_requested'].includes(listing.status)) {
      continue
    }
    const { partnerRole, targetPersona } = mapListingTypeToRole(listing.listingType)
    const slaTargetHours = listing.priorityRank >= 4 ? 12 : 24
    const sla = computeSlaStatus(listing.submittedAt, slaTargetHours, nowMs)
    items.push({
      id: `inbox-mod-${listing.id}`,
      entityId: listing.id,
      referenceCode: listing.referenceCode,
      sourceDesk: 'moderation_desk',
      sourceLabel: 'Listing Moderation',
      title: listing.title,
      entityName: listing.organizationName || listing.submitterName,
      partnerRole,
      targetPersona,
      city: listing.city,
      sport: listing.sport,
      statusLabel: listing.status.replace(/_/g, ' '),
      priority: listing.priorityRank >= 4 ? 'high' : 'standard',
      createdAt: listing.submittedAt,
      slaTargetHours,
      ...sla,
      summary:
        listing.correctionRequest ||
        `${listing.listingType.replace(/_/g, ' ')} submission awaiting publication review.`,
      hasActiveNotice: activeNoticeRefs.has(listing.referenceCode),
    })
  }

  // 2. Verification & Evidence Vault (48h SLA for pending, 24h for expired/expiring)
  for (const verif of params.verifications) {
    const expiry = calculateExpiryStatus(verif.expiresAt)
    const isActionableStatus = ['pending_review', 'in_review', 'action_required', 'expired'].includes(
      verif.status,
    )
    const isExpiringSoon = verif.status === 'verified' && expiry.status === 'expiring_soon'
    if (!isActionableStatus && !isExpiringSoon) continue

    const checklist = evaluateVerificationChecklist(verif)
    const targetPersona = mapVerificationEntityToWorkspacePersona(verif.entityType)
    const partnerRole: InboxPartnerRole =
      verif.entityType === 'organiser' ? 'tournament' : verif.entityType
    const slaTargetHours = expiry.status === 'expired' ? 12 : isExpiringSoon ? 168 : 48
    const sla =
      isExpiringSoon && verif.expiresAt
        ? (() => {
            const expMs = Date.parse(verif.expiresAt)
            const hoursUntilExpiry = Number.isFinite(expMs)
              ? (expMs - nowMs) / (1000 * 60 * 60)
              : 0
            if (hoursUntilExpiry <= 0) {
              return {
                slaStatus: 'breached' as SlaStatus,
                ageHours: 0,
                remainingHours: Math.round(hoursUntilExpiry * 10) / 10,
                slaRemainingLabel: `Expired ${formatHourDuration(hoursUntilExpiry)} ago`,
              }
            }
            if (hoursUntilExpiry <= 168) {
              return {
                slaStatus: 'at_risk' as SlaStatus,
                ageHours: 0,
                remainingHours: Math.round(hoursUntilExpiry * 10) / 10,
                slaRemainingLabel: `Expires in ${formatHourDuration(hoursUntilExpiry)}`,
              }
            }
            return {
              slaStatus: 'on_track' as SlaStatus,
              ageHours: 0,
              remainingHours: Math.round(hoursUntilExpiry * 10) / 10,
              slaRemainingLabel: `Expires in ${formatHourDuration(hoursUntilExpiry)}`,
            }
          })()
        : computeSlaStatus(verif.lastAuditedAt || verif.submittedAt, slaTargetHours, nowMs)

    items.push({
      id: `inbox-verif-${verif.id}`,
      entityId: verif.id,
      referenceCode: verif.referenceCode,
      sourceDesk: 'verification_vault',
      sourceLabel: 'Verification Vault',
      title: isExpiringSoon
        ? `Renewal Due: ${verif.entityName}`
        : `Credential Audit: ${verif.entityName}`,
      entityName: verif.organizationName || verif.entityName,
      partnerRole,
      targetPersona,
      city: verif.city,
      sport: verif.sport,
      statusLabel: isExpiringSoon ? expiry.formattedLabel : verif.status.replace(/_/g, ' '),
      priority:
        expiry.status === 'expired' || verif.status === 'action_required' ? 'high' : 'standard',
      createdAt: verif.lastAuditedAt || verif.submittedAt,
      slaTargetHours,
      ...sla,
      summary:
        verif.actionRequiredNotes ||
        (checklist.mandatoryMissing.length > 0
          ? `Checklist ${checklist.passedCount}/${checklist.totalCount} · Missing: ${checklist.mandatoryMissing.map(m => m.label).join(', ')}`
          : `All mandatory ${verif.entityType} checks present (${checklist.passedCount}/${checklist.totalCount}). Ready for final sign-off.`),
      missingChecklistLabels: checklist.mandatoryMissing.map(m => m.label),
      hasActiveNotice: activeNoticeRefs.has(verif.referenceCode),
    })
  }

  // 3. Trust & Safety / Sanctions (4h P0, 12h P1, 24h P2)
  for (const incident of params.trustCases) {
    if (!['intake_pending', 'under_investigation', 'evidence_gathered', 'appeal_pending'].includes(incident.status)) {
      continue
    }
    const { hours: slaTargetHours, priority } = trustSeverityToSlaHours(incident.severity)
    const { partnerRole, targetPersona } = mapReportedEntityToRole(incident.reportedEntityType)
    const sla = computeSlaStatus(incident.createdAt, slaTargetHours, nowMs)

    items.push({
      id: `inbox-trust-${incident.id}`,
      entityId: incident.id,
      referenceCode: incident.incidentNumber,
      sourceDesk: 'fraud_disputes',
      sourceLabel: 'Trust & Safety',
      title: incident.title,
      entityName: incident.reportedEntityName,
      partnerRole,
      targetPersona,
      tenantSlug: incident.reportedEntitySlug,
      city: incident.city,
      statusLabel: incident.status.replace(/_/g, ' '),
      priority,
      createdAt: incident.createdAt,
      slaTargetHours,
      ...sla,
      summary: `${incident.category.replace(/_/g, ' ')} · ${incident.description.slice(0, 130)}`,
      hasActiveNotice: activeNoticeRefs.has(incident.incidentNumber),
    })
  }

  // 4. Tenant Compliance Holds (pending_verification, restricted, suspended)
  for (const tenant of params.tenants) {
    if (!['pending_verification', 'restricted', 'suspended'].includes(tenant.status)) {
      continue
    }
    const { partnerRole, targetPersona } = mapTenantTypeToRole(tenant.tenantType)
    const slaTargetHours = tenant.status === 'suspended' ? 24 : 48
    const sla = computeSlaStatus(tenant.updatedAt, slaTargetHours, nowMs)

    items.push({
      id: `inbox-tenant-${tenant.id}`,
      entityId: tenant.id,
      referenceCode: `TEN-${tenant.slug.slice(0, 10).toUpperCase()}`,
      sourceDesk: 'tenant_governance',
      sourceLabel: 'Tenant Governance',
      title: `${tenant.name} (${tenant.status.replace(/_/g, ' ')})`,
      entityName: tenant.name,
      partnerRole,
      targetPersona,
      tenantSlug: tenant.slug,
      city: tenant.city,
      sport: tenant.sport,
      statusLabel: tenant.status.replace(/_/g, ' '),
      priority: tenant.status === 'suspended' ? 'critical' : 'high',
      createdAt: tenant.updatedAt,
      slaTargetHours,
      ...sla,
      summary: `${tenant.tenantType} tenant in ${tenant.city} · Owner: ${tenant.ownerName} (${tenant.ownerEmail})`,
      hasActiveNotice: activeNoticeRefs.has(`TEN-${tenant.slug.slice(0, 10).toUpperCase()}`),
    })
  }

  // Deterministic SLA-first ordering
  items.sort((a, b) => {
    const slaDiff = SLA_RANK[a.slaStatus] - SLA_RANK[b.slaStatus]
    if (slaDiff !== 0) return slaDiff
    const prioDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (prioDiff !== 0) return prioDiff
    return a.remainingHours - b.remainingHours
  })

  const byDesk: Record<RegulatoryInboxSourceDesk, number> = {
    moderation_desk: 0,
    verification_vault: 0,
    fraud_disputes: 0,
    tenant_governance: 0,
  }
  let breachedCount = 0
  let atRiskCount = 0
  let onTrackCount = 0

  for (const item of items) {
    byDesk[item.sourceDesk]++
    if (item.slaStatus === 'breached') breachedCount++
    else if (item.slaStatus === 'at_risk') atRiskCount++
    else onTrackCount++
  }

  return {
    items,
    activeAdvisories,
    metrics: {
      totalActionable: items.length,
      breachedCount,
      atRiskCount,
      onTrackCount,
      activePartnerNoticesCount: activeAdvisories.length,
      byDesk,
    },
    generatedAt: new Date(nowMs).toISOString(),
  }
}

export async function loadUnifiedRegulatoryInbox(
  nowMs?: number,
): Promise<UnifiedRegulatoryInboxSnapshot> {
  const listings = getAdminModerationListings()
  const verifications = getAdminVerifications()
  const tenants = getAdminTenants()
  const advisories = readStoredComplianceAdvisories()
  const trustRes = await getAdminTrustSafetyCases().catch(() => null)
  const trustCases = trustRes?.cases ?? []

  return buildUnifiedRegulatoryInboxSnapshot({
    listings,
    verifications,
    trustCases,
    tenants,
    advisories,
    nowMs,
  })
}

export function issuePartnerComplianceNoticeFromInbox(params: {
  item: RegulatoryInboxItem
  severity: Exclude<PartnerComplianceSeverity, 'resolved'>
  headline: string
  message: string
  dueInHours?: number
  operatorEmail: string
}): PartnerComplianceAdvisory {
  const dueAt =
    params.dueInHours && params.dueInHours > 0
      ? new Date(Date.now() + params.dueInHours * 60 * 60 * 1000).toISOString()
      : undefined

  return publishPartnerComplianceAdvisory({
    referenceCode: params.item.referenceCode,
    sourceDesk: params.item.sourceDesk,
    targetPersona: params.item.targetPersona,
    tenantSlug: params.item.tenantSlug,
    entityName: params.item.entityName,
    severity: params.severity,
    headline: params.headline.trim() || `Compliance Action Required (${params.item.referenceCode})`,
    message: params.message.trim(),
    missingItems: params.item.missingChecklistLabels,
    dueAt,
    issuedBy: params.operatorEmail,
    actionUrl: `/workspace/${params.item.targetPersona}/overview`,
  })
}

export function clearPartnerComplianceNotice(
  idOrReferenceCode: string,
  operatorEmail: string,
): boolean {
  return resolvePartnerComplianceAdvisory(idOrReferenceCode, operatorEmail)
}
