/**
 * KhelGrid Admin Global Search Index & Ranking Engine
 *
 * Powers the upgraded AdminCommandPalette global search modal, indexing real records across:
 * - Users (tenant owners, coaches/staff members, listing submitters, platform operators)
 * - Venues & Organisations (academies, turfs, clubs, tournament organisers, branch units)
 * - Listings & Verifications (moderation queue listings & verification vault dossiers)
 * - Trust & Safety Incidents (P0–P3 safety, fraud, abuse, and sanction cases)
 */

import type { SiteIconName } from '../../../../src/shared/components/SiteIcon'
import type { AdminWorkspaceTab } from '../components/AdminSidebar'
import { getAdminTenants, getAdminTenantDetails } from './adminTenantService'
import { getAdminModerationListings } from './adminModerationService'
import { getAdminVerifications } from './adminVerificationService'
import { getAdminTrustSafetyCases } from './adminTrustSafetyService'
import { getPlatformGovernanceSnapshot } from './adminPlatformGovernanceService'

export type GlobalSearchEntityCategory = 'user' | 'listing' | 'venue' | 'incident'
export type GlobalSearchFilterTab = 'all' | GlobalSearchEntityCategory | 'command'

export interface AdminDeskDeepLink {
  workspace: AdminWorkspaceTab
  recordId?: string
  query?: string
  tab?: string
  nonce: number
}

export interface GlobalSearchEntityItem {
  id: string
  entityId: string
  referenceCode: string
  category: GlobalSearchEntityCategory
  title: string
  subtitle: string
  statusLabel?: string
  targetWorkspace: AdminWorkspaceTab
  targetDeskLabel: string
  focusRecordId?: string
  focusTab?: string
  focusQuery: string
  icon: SiteIconName
  searchableText: string
}

function buildSearchableText(parts: Array<string | undefined | null>): string {
  return parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(' ')
    .toLowerCase()
}

function formatStatusChip(raw?: string): string | undefined {
  if (!raw) return undefined
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
}

/**
 * Loads and indexes all live users, venues/organisations, listings/dossiers, and
 * Trust & Safety cases across the KhelGrid Admin Panel services.
 */
export async function loadGlobalAdminSearchIndex(): Promise<GlobalSearchEntityItem[]> {
  const tenants = getAdminTenants()
  const moderationListings = getAdminModerationListings()
  const verifications = getAdminVerifications()
  const [trustSafetyRes, governanceSnap] = await Promise.all([
    getAdminTrustSafetyCases().catch(() => ({ cases: [] })),
    Promise.resolve().then(() => {
      try {
        return getPlatformGovernanceSnapshot()
      } catch {
        return null
      }
    }),
  ])

  const items: GlobalSearchEntityItem[] = []
  const seenUserKeys = new Set<string>()

  // 1. Venues, Academies & Organisations + Tenant Owners & Staff Users
  for (const tenant of tenants) {
    const details = getAdminTenantDetails(tenant.id)
    const isVenueLike = tenant.tenantType === 'venue'
    items.push({
      id: `search-venue-${tenant.id}`,
      entityId: tenant.id,
      referenceCode: tenant.id.toUpperCase(),
      category: 'venue',
      title: tenant.name,
      subtitle: `${formatStatusChip(tenant.tenantType) ?? 'Organisation'} · ${tenant.city}, ${tenant.state} · ${tenant.sport}`,
      statusLabel: formatStatusChip(tenant.status),
      targetWorkspace: 'tenant_governance',
      targetDeskLabel: 'Tenant Governance',
      focusRecordId: tenant.id,
      focusTab: 'overview',
      focusQuery: tenant.name,
      icon: isVenueLike ? 'venues' : 'building',
      searchableText: buildSearchableText([
        tenant.id,
        tenant.slug,
        tenant.name,
        tenant.tenantType,
        tenant.city,
        tenant.state,
        tenant.sport,
        tenant.ownerName,
        tenant.ownerEmail,
        tenant.contactEmail,
      ]),
    })

    // Index sub-units/grounds/branches under the organisation
    if (details?.units?.length) {
      for (const unit of details.units) {
        items.push({
          id: `search-unit-${tenant.id}-${unit.id}`,
          entityId: unit.id,
          referenceCode: unit.id.toUpperCase(),
          category: 'venue',
          title: `${unit.name} (${tenant.name})`,
          subtitle: `${formatStatusChip(unit.unitType) ?? 'Facility'} · ${unit.city} · ${unit.address}`,
          statusLabel: formatStatusChip(tenant.status),
          targetWorkspace: 'tenant_governance',
          targetDeskLabel: 'Tenant Governance',
          focusRecordId: tenant.id,
          focusTab: 'units',
          focusQuery: tenant.name,
          icon: 'map-pin',
          searchableText: buildSearchableText([
            unit.id,
            unit.name,
            unit.unitType,
            unit.city,
            unit.address,
            tenant.id,
            tenant.name,
          ]),
        })
      }
    }

    // Index owner & members as searchable Users
    const members = details?.members ?? []
    if (members.length > 0) {
      for (const member of members) {
        const userKey = (member.userId || member.email).toLowerCase()
        if (seenUserKeys.has(userKey)) continue
        seenUserKeys.add(userKey)
        items.push({
          id: `search-user-${member.userId || member.id}`,
          entityId: member.userId || member.id,
          referenceCode: (member.userId || member.id).toUpperCase(),
          category: 'user',
          title: member.displayName,
          subtitle: `${formatStatusChip(member.role) ?? 'Member'} · ${tenant.name} · ${member.email}`,
          statusLabel: formatStatusChip(member.status),
          targetWorkspace: 'tenant_governance',
          targetDeskLabel: 'Tenant Governance',
          focusRecordId: tenant.id,
          focusTab: 'members',
          focusQuery: tenant.name,
          icon: 'user',
          searchableText: buildSearchableText([
            member.userId,
            member.id,
            member.displayName,
            member.email,
            member.role,
            tenant.name,
            tenant.id,
            tenant.city,
          ]),
        })
      }
    } else if (tenant.ownerEmail) {
      const userKey = (tenant.ownerId || tenant.ownerEmail).toLowerCase()
      if (!seenUserKeys.has(userKey)) {
        seenUserKeys.add(userKey)
        items.push({
          id: `search-user-${tenant.ownerId || tenant.id}`,
          entityId: tenant.ownerId || tenant.id,
          referenceCode: (tenant.ownerId || tenant.id).toUpperCase(),
          category: 'user',
          title: tenant.ownerName,
          subtitle: `Owner · ${tenant.name} · ${tenant.ownerEmail}`,
          statusLabel: formatStatusChip(tenant.status),
          targetWorkspace: 'tenant_governance',
          targetDeskLabel: 'Tenant Governance',
          focusRecordId: tenant.id,
          focusTab: 'members',
          focusQuery: tenant.name,
          icon: 'user',
          searchableText: buildSearchableText([
            tenant.ownerId,
            tenant.ownerName,
            tenant.ownerEmail,
            tenant.name,
            tenant.city,
          ]),
        })
      }
    }
  }

  // 2. Platform Operator Accounts (Users under Platform RBAC)
  if (governanceSnap?.operators?.length) {
    for (const op of governanceSnap.operators) {
      const userKey = (op.userId || op.email).toLowerCase()
      if (seenUserKeys.has(userKey)) continue
      seenUserKeys.add(userKey)
      items.push({
        id: `search-op-${op.userId}`,
        entityId: op.userId,
        referenceCode: op.userId.toUpperCase(),
        category: 'user',
        title: op.displayName,
        subtitle: `Platform ${formatStatusChip(op.role) ?? 'Operator'} · ${op.email}`,
        statusLabel: op.isActive ? 'Active' : 'Inactive',
        targetWorkspace: 'platform_governance',
        targetDeskLabel: 'Platform RBAC',
        focusRecordId: op.userId,
        focusQuery: op.email,
        icon: 'shield-check',
        searchableText: buildSearchableText([
          op.userId,
          op.displayName,
          op.email,
          op.role,
          ...(op.assignedScopes || []),
        ]),
      })
    }
  }

  // 3. Listing Moderation Queue Records + Listing Submitters
  for (const listing of moderationListings) {
    items.push({
      id: `search-listing-${listing.id}`,
      entityId: listing.id,
      referenceCode: listing.referenceCode,
      category: 'listing',
      title: listing.title,
      subtitle: `${formatStatusChip(listing.listingType) ?? 'Listing'} · ${listing.city}, ${listing.state} · ${listing.sport}`,
      statusLabel: formatStatusChip(listing.status),
      targetWorkspace: 'moderation_desk',
      targetDeskLabel: 'Listing Moderation',
      focusRecordId: listing.id,
      focusQuery: listing.referenceCode,
      icon: listing.listingType === 'venue' ? 'venues' : 'file-text',
      searchableText: buildSearchableText([
        listing.id,
        listing.referenceCode,
        listing.title,
        listing.slug,
        listing.listingType,
        listing.organizationName,
        listing.city,
        listing.state,
        listing.sport,
        listing.submitterName,
        listing.submitterEmail,
      ]),
    })

    if (listing.submitterEmail) {
      const submitterKey = listing.submitterEmail.toLowerCase()
      if (!seenUserKeys.has(submitterKey)) {
        seenUserKeys.add(submitterKey)
        items.push({
          id: `search-submitter-${listing.id}`,
          entityId: `USR-${listing.referenceCode}`,
          referenceCode: listing.referenceCode,
          category: 'user',
          title: listing.submitterName,
          subtitle: `Listing Submitter · ${listing.submitterEmail} · ${listing.city}`,
          statusLabel: formatStatusChip(listing.status),
          targetWorkspace: 'moderation_desk',
          targetDeskLabel: 'Listing Moderation',
          focusRecordId: listing.id,
          focusQuery: listing.submitterName,
          icon: 'user',
          searchableText: buildSearchableText([
            listing.submitterName,
            listing.submitterEmail,
            listing.submitterPhone,
            listing.referenceCode,
            listing.title,
            listing.city,
          ]),
        })
      }
    }
  }

  // 4. Verification Vault Dossiers
  for (const ver of verifications) {
    const isVenue = ver.entityType === 'venue'
    items.push({
      id: `search-ver-${ver.id}`,
      entityId: ver.id,
      referenceCode: ver.referenceCode,
      category: isVenue ? 'venue' : 'listing',
      title: ver.entityName,
      subtitle: `Verification Dossier (${formatStatusChip(ver.entityType)}) · ${ver.city}, ${ver.state}${ver.sport ? ` · ${ver.sport}` : ''}`,
      statusLabel: formatStatusChip(ver.status),
      targetWorkspace: 'verification_vault',
      targetDeskLabel: 'Verification Vault',
      focusRecordId: ver.id,
      focusQuery: ver.referenceCode,
      icon: 'badge-check',
      searchableText: buildSearchableText([
        ver.id,
        ver.referenceCode,
        ver.entityName,
        ver.entityType,
        ver.city,
        ver.state,
        ver.sport,
        ver.contactEmail,
      ]),
    })
  }

  // 5. Trust & Safety Incidents
  for (const inc of trustSafetyRes.cases) {
    items.push({
      id: `search-ts-${inc.id}`,
      entityId: inc.id,
      referenceCode: inc.incidentNumber,
      category: 'incident',
      title: `${inc.reportedEntityName} — ${inc.title}`,
      subtitle: `${formatStatusChip(inc.severity)} · ${inc.city}, ${inc.state} · ${formatStatusChip(inc.category)}`,
      statusLabel: formatStatusChip(inc.status),
      targetWorkspace: 'fraud_disputes',
      targetDeskLabel: 'Trust & Safety',
      focusRecordId: inc.id,
      focusQuery: inc.incidentNumber,
      icon: 'flag',
      searchableText: buildSearchableText([
        inc.id,
        inc.incidentNumber,
        inc.title,
        inc.reportedEntityName,
        inc.reportedEntityType,
        inc.city,
        inc.state,
        inc.category,
        inc.severity,
      ]),
    })
  }

  return items
}

/**
 * Deterministically ranks global search records by exact ID/code match, prefix match,
 * title match, and multi-token field match.
 */
export function rankGlobalSearchItems(
  items: GlobalSearchEntityItem[],
  rawQuery: string,
  categoryFilter: GlobalSearchFilterTab = 'all',
  limit = 24,
): GlobalSearchEntityItem[] {
  if (categoryFilter === 'command') return []

  const scoped =
    categoryFilter === 'all'
      ? items
      : items.filter(item => item.category === categoryFilter)

  const q = rawQuery.trim().toLowerCase()
  if (!q) {
    // When empty, return a balanced preview across categories
    if (categoryFilter !== 'all') {
      return scoped.slice(0, Math.min(limit, 12))
    }
    const perCatLimit = 3
    const buckets: Record<GlobalSearchEntityCategory, GlobalSearchEntityItem[]> = {
      user: [],
      venue: [],
      listing: [],
      incident: [],
    }
    for (const item of scoped) {
      if (buckets[item.category].length < perCatLimit) {
        buckets[item.category].push(item)
      }
    }
    return [...buckets.user, ...buckets.venue, ...buckets.listing, ...buckets.incident]
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  const scored: Array<{ item: GlobalSearchEntityItem; score: number }> = []

  for (const item of scoped) {
    const idLower = item.entityId.toLowerCase()
    const refLower = item.referenceCode.toLowerCase()
    const titleLower = item.title.toLowerCase()

    // Require every whitespace token to match somewhere in searchableText
    const matchesAllTokens = tokens.every(tok => item.searchableText.includes(tok))
    if (!matchesAllTokens) continue

    let score = 40
    if (idLower === q || refLower === q || titleLower === q) {
      score = 120
    } else if (idLower.startsWith(q) || refLower.startsWith(q)) {
      score = 100
    } else if (titleLower.startsWith(q)) {
      score = 90
    } else if (idLower.includes(q) || refLower.includes(q)) {
      score = 80
    } else if (titleLower.includes(q)) {
      score = 70
    }

    scored.push({ item, score })
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.item.title.localeCompare(b.item.title)
    })
    .slice(0, limit)
    .map(entry => entry.item)
}
