import { describe, expect, it } from 'vitest'
import {
  CANONICAL_SAAS_PLANS,
  ORGANIZATION_TYPES,
  PLATFORM_ROLES,
  PLATFORM_SAAS_ADOPTION_MATRIX,
  canManageOwnedResource,
  computeUsageMeterStatuses,
  evaluateEntitlement,
  hasOrganizationPermission,
  hasStrictPlatformRole,
  hashInvitationTokenHex,
  isInvitationAcceptable,
  sanitizeOrganizationSlug,
  validateOwnershipTransfer,
  validateRoleChange,
} from './saasCoreEngine'
import {
  bindResourceOwnership,
  createOrganizationUnit,
  createSeedWorkspaceState,
  grantAuditedEntitlementOverride,
  inviteMemberToOrganization,
  previewSwitchSubscriptionPlan,
  provisionOrganizationWorkspace,
  resolveOrganizationInvitation,
  transferOrganizationOwnership,
  updateOrganizationLifecycleStatus,
  updateOrganizationMemberRole,
} from '../../integrations/supabase/saas-platform-client'
import type { OrganizationRecord, ResourceOwnershipRecord, SubscriptionRecord } from './saasTypes'

describe('KhelGrid Platform-Wide SaaS Core Engine & Security Guards', () => {
  it('supports all 18 canonical sports ecosystem organization categories and sanitizes slugs safely', () => {
    expect(ORGANIZATION_TYPES).toHaveLength(18)
    const types = new Set(ORGANIZATION_TYPES.map(t => t.type))
    for (const expected of [
      'academy', 'coach', 'venue', 'tournament', 'club', 'school', 'college',
      'university', 'federation', 'association', 'event_organizer', 'corporate',
      'training_org', 'service_provider', 'research_org', 'media_org', 'enterprise', 'other',
    ] as const) {
      expect(types.has(expected)).toBe(true)
    }

    expect(sanitizeOrganizationSlug('  All India Athletics Federation!! 2026  ')).toBe('all-india-athletics-federation-2026')
    expect(sanitizeOrganizationSlug('---Multi___Space & Symbols---')).toBe('multi-space-symbols')
  })

  it('strictly separates Platform roles from Organization roles (org owner/admin never grants platform access)', () => {
    expect(PLATFORM_ROLES).toContain('platform_super_admin')
    expect(PLATFORM_ROLES).toContain('verification_reviewer')
    expect(hasStrictPlatformRole({ platformRoles: [], required: ['platform_admin', 'platform_super_admin'] })).toBe(false)
    expect(
      hasStrictPlatformRole({
        platformRoles: ['verification_reviewer'],
        required: ['platform_super_admin', 'security_admin'],
      })
    ).toBe(false)
    expect(
      hasStrictPlatformRole({
        platformRoles: ['verification_reviewer'],
        required: ['verification_reviewer', 'platform_moderator'],
      })
    ).toBe(true)
  })

  it('fails closed on suspended or archived organizations and cross-tenant memberships', () => {
    const activeOrg = { id: 'org-1', status: 'active' as const }
    const suspendedOrg = { id: 'org-1', status: 'suspended' as const }
    const archivedOrg = { id: 'org-1', status: 'archived' as const }
    const ownerMem = { tenantId: 'org-1', role: 'owner' as const, status: 'active' as const }
    const crossTenantMem = { tenantId: 'org-2', role: 'owner' as const, status: 'active' as const }
    const revokedMem = { tenantId: 'org-1', role: 'org_admin' as const, status: 'revoked' as const }

    expect(hasOrganizationPermission({ organization: activeOrg, membership: ownerMem, permission: 'org:team' })).toBe(true)
    expect(hasOrganizationPermission({ organization: suspendedOrg, membership: ownerMem, permission: 'org:team' })).toBe(false)
    expect(hasOrganizationPermission({ organization: archivedOrg, membership: ownerMem, permission: 'org:settings' })).toBe(false)
    expect(hasOrganizationPermission({ organization: activeOrg, membership: crossTenantMem, permission: 'org:team' })).toBe(false)
    expect(hasOrganizationPermission({ organization: activeOrg, membership: revokedMem, permission: 'org:team' })).toBe(false)
  })

  it('blocks privilege escalation: self-promotion, role ceiling breach, and owner mutation via role change', () => {
    // Self-promotion blocked
    expect(
      validateRoleChange({
        organizationStatus: 'active',
        actorUserId: 'u1',
        actorRole: 'org_admin',
        targetUserId: 'u1',
        targetCurrentRole: 'org_admin',
        newRole: 'owner',
      }).allowed
    ).toBe(false)

    // Promoting to owner via role change blocked even for current owner
    expect(
      validateRoleChange({
        organizationStatus: 'active',
        actorUserId: 'u1',
        actorRole: 'owner',
        targetUserId: 'u2',
        targetCurrentRole: 'org_admin',
        newRole: 'owner',
      }).allowed
    ).toBe(false)

    // Manager lacks org:team permission
    expect(
      validateRoleChange({
        organizationStatus: 'active',
        actorUserId: 'u2',
        actorRole: 'manager',
        targetUserId: 'u3',
        targetCurrentRole: 'coach',
        newRole: 'head_coach',
      }).allowed
    ).toBe(false)

    // Admin cannot promote someone to org_admin (exceeds ceiling)
    expect(
      validateRoleChange({
        organizationStatus: 'active',
        actorUserId: 'u2',
        actorRole: 'admin',
        targetUserId: 'u3',
        targetCurrentRole: 'coach',
        newRole: 'org_admin',
      }).allowed
    ).toBe(false)

    // Owner CAN promote a coach to head_coach in an active organization
    expect(
      validateRoleChange({
        organizationStatus: 'active',
        actorUserId: 'u1',
        actorRole: 'owner',
        targetUserId: 'u3',
        targetCurrentRole: 'coach',
        newRole: 'head_coach',
      }).allowed
    ).toBe(true)

    // Suspended org blocks valid owner role update
    expect(
      validateRoleChange({
        organizationStatus: 'suspended',
        actorUserId: 'u1',
        actorRole: 'owner',
        targetUserId: 'u3',
        targetCurrentRole: 'coach',
        newRole: 'head_coach',
      }).allowed
    ).toBe(false)
  })

  it('validates atomic ownership transfer preconditions strictly', () => {
    const org: Pick<OrganizationRecord, 'id' | 'ownerId' | 'status'> = {
      id: 'org-1',
      ownerId: 'owner-1',
      status: 'active',
    }
    expect(
      validateOwnershipTransfer({
        organization: org,
        actorUserId: 'non-owner',
        targetMembership: { tenantId: 'org-1', userId: 'u2', status: 'active', role: 'org_admin' },
      }).allowed
    ).toBe(false)

    expect(
      validateOwnershipTransfer({
        organization: org,
        actorUserId: 'owner-1',
        targetMembership: { tenantId: 'org-2', userId: 'u2', status: 'active', role: 'org_admin' },
      }).allowed
    ).toBe(false)

    expect(
      validateOwnershipTransfer({
        organization: org,
        actorUserId: 'owner-1',
        targetMembership: { tenantId: 'org-1', userId: 'u2', status: 'active', role: 'org_admin' },
      }).allowed
    ).toBe(true)
  })

  it('hashes invitation tokens with 64-hex SHA-256 and rejects expired or revoked invites', async () => {
    const hash1 = await hashInvitationTokenHex('kg_inv_secret_token_123')
    const hash2 = await hashInvitationTokenHex('kg_inv_secret_token_123')
    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)

    const future = new Date(Date.now() + 60_000).toISOString()
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(isInvitationAcceptable({ status: 'pending', expiresAt: future }).acceptable).toBe(true)
    expect(isInvitationAcceptable({ status: 'pending', expiresAt: past }).acceptable).toBe(false)
    expect(isInvitationAcceptable({ status: 'revoked', expiresAt: future }).acceptable).toBe(false)
  })

  it('enforces dual Individual vs. Organization resource ownership isolation', () => {
    const personalRes: ResourceOwnershipRecord = {
      id: 'r1',
      resourceType: 'coach_profile',
      resourceId: 'c1',
      resourceTitle: 'Personal Coach Profile',
      ownershipType: 'individual',
      ownerUserId: 'u1',
      ownerTenantId: null,
      verificationStatus: 'verified',
      isFreePublicListing: true,
      updatedAt: new Date().toISOString(),
    }

    expect(canManageOwnedResource({ resource: personalRes, actorUserId: 'u1' }).allowed).toBe(true)
    expect(canManageOwnedResource({ resource: personalRes, actorUserId: 'u2' }).allowed).toBe(false)

    const orgRes: ResourceOwnershipRecord = {
      id: 'r2',
      resourceType: 'venue',
      resourceId: 'v1',
      resourceTitle: 'South Turf Arena',
      ownershipType: 'organization',
      ownerUserId: null,
      ownerTenantId: 'org-1',
      verificationStatus: 'verified',
      isFreePublicListing: true,
      updatedAt: new Date().toISOString(),
    }

    // Wrong active org -> blocked
    expect(
      canManageOwnedResource({
        resource: orgRes,
        actorUserId: 'u1',
        activeOrganization: { id: 'org-2', status: 'active' },
        actorMembership: { tenantId: 'org-2', userId: 'u1', role: 'owner', status: 'active' },
      }).allowed
    ).toBe(false)

    // Matching org + listing_manager (has venues:manage) -> allowed
    expect(
      canManageOwnedResource({
        resource: orgRes,
        actorUserId: 'u1',
        activeOrganization: { id: 'org-1', status: 'active' },
        actorMembership: { tenantId: 'org-1', userId: 'u1', role: 'listing_manager', status: 'active' },
      }).allowed
    ).toBe(true)

    // Matching org + coach (lacks venues:manage) -> blocked
    expect(
      canManageOwnedResource({
        resource: orgRes,
        actorUserId: 'u1',
        activeOrganization: { id: 'org-1', status: 'active' },
        actorMembership: { tenantId: 'org-1', userId: 'u1', role: 'coach', status: 'active' },
      }).allowed
    ).toBe(false)
  })

  it('guarantees free public listings & independent verification, enforces quotas, overrides, and payments disabled', () => {
    // Every canonical plan must have payments disabled and free listings guaranteed
    for (const plan of Object.values(CANONICAL_SAAS_PLANS)) {
      expect(plan.billingEnabled).toBe(false)
      expect(plan.listingPublicationAlwaysFree).toBe(true)
    }

    // Free listing & verification always allowed on active tenant even with expired sub
    const expiredSub: SubscriptionRecord = {
      id: 'sub-exp',
      subjectType: 'tenant',
      subjectId: 'org-1',
      planCode: 'org_enterprise',
      status: 'expired',
      billingCycle: 'none',
      paymentCollectionEnabled: false,
      currentPeriodStart: new Date(Date.now() - 86400_000 * 60).toISOString(),
      currentPeriodEnd: new Date(Date.now() - 86400_000).toISOString(),
    }
    expect(
      evaluateEntitlement({
        featureKey: 'listings.free_submission',
        subjectType: 'tenant',
        subjectId: 'org-1',
        organizationStatus: 'active',
        subscription: expiredSub,
      }).source
    ).toBe('free_community_guarantee')

    // Expired enterprise sub falls back to org_free -> API access denied
    const fallbackApi = evaluateEntitlement({
      featureKey: 'platform.api_access',
      subjectType: 'tenant',
      subjectId: 'org-1',
      organizationStatus: 'active',
      subscription: expiredSub,
    })
    expect(fallbackApi.allowed).toBe(false)
    expect(fallbackApi.source).toBe('subscription_fallback_free')

    // Hard quota enforced on org_free members (limit 5)
    const hardLimit = evaluateEntitlement({
      featureKey: 'org.multi_member',
      subjectType: 'tenant',
      subjectId: 'org-1',
      organizationStatus: 'active',
      currentUsage: 5,
      enforceHardLimit: true,
    })
    expect(hardLimit.allowed).toBe(false)
    expect(hardLimit.source).toBe('quota_hard_limit')

    // Suspended tenant fails closed even on free features
    const suspended = evaluateEntitlement({
      featureKey: 'org.multi_member',
      subjectType: 'tenant',
      subjectId: 'org-1',
      organizationStatus: 'suspended',
    })
    expect(suspended.allowed).toBe(false)
    expect(suspended.source).toBe('tenant_suspended')
  })

  it('computes usage meter utilization and soft/hard limits accurately and includes all 30 platform modules', () => {
    const meters = computeUsageMeterStatuses({
      planCode: 'org_free',
      subjectId: 'org-1',
      usageValues: { 'org.members': 4, 'org.branches': 2 },
    })
    const membersMeter = meters.find(m => m.meterKey === 'org.members')!
    const branchesMeter = meters.find(m => m.meterKey === 'org.branches')!

    expect(membersMeter.utilizationPercent).toBe(80)
    expect(membersMeter.softLimitReached).toBe(true)
    expect(membersMeter.hardLimitReached).toBe(false)

    expect(branchesMeter.utilizationPercent).toBe(100)
    expect(branchesMeter.hardLimitReached).toBe(true)

    expect(PLATFORM_SAAS_ADOPTION_MATRIX).toHaveLength(30)
  })

  it('runs end-to-end workspace mutations with audit trails and fail-closed enforcement', async () => {
    let state = createSeedWorkspaceState()
    const initialAuditCount = state.auditLogs.length

    // 1. Provision a new Sports Federation workspace
    const prov = await provisionOrganizationWorkspace(state, {
      name: 'Karnataka Athletics Association',
      tenantType: 'federation',
      city: 'Bengaluru',
      stateName: 'Karnataka',
      sport: 'Athletics',
    })
    expect(prov.success).toBe(true)
    expect(prov.data?.tenantType).toBe('federation')
    state = prov.state
    expect(state.auditLogs.length).toBeGreaterThan(initialAuditCount)
    const fedId = prov.data!.id

    // 2. Invite a member -> SHA-256 hashed -> accept invitation
    const inv = await inviteMemberToOrganization(state, {
      tenantId: fedId,
      invitedEmail: 'secretary@kaafed.in',
      role: 'org_admin',
    })
    expect(inv.success).toBe(true)
    expect(inv.data?.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    state = inv.state

    const accepted = resolveOrganizationInvitation(state, inv.data!.id, 'accept')
    expect(accepted.success).toBe(true)
    state = accepted.state
    const newAdmin = state.memberships.find(m => m.tenantId === fedId && m.email === 'secretary@kaafed.in')!
    expect(newAdmin.role).toBe('org_admin')

    // 3. Create unit + bind dual ownership resource + override + preview plan switch
    const unitRes = await createOrganizationUnit(state, {
      tenantId: fedId,
      name: 'Mysuru Regional Office',
      unitType: 'regional_office',
      city: 'Mysuru',
    })
    expect(unitRes.success).toBe(true)
    state = unitRes.state

    const bindRes = await bindResourceOwnership(state, {
      resourceType: 'opportunity',
      resourceTitle: 'Karnataka State U-18 Open Trials',
      ownershipType: 'organization',
      ownerTenantId: fedId,
    })
    expect(bindRes.success).toBe(true)
    expect(bindRes.data?.isFreePublicListing).toBe(true)
    state = bindRes.state

    const ovRes = grantAuditedEntitlementOverride(state, {
      subjectType: 'tenant',
      subjectId: fedId,
      featureKey: 'org.branches',
      isEnabled: true,
      overrideLimit: 20,
      reason: 'State federation multi-district pilot',
    })
    expect(ovRes.success).toBe(true)
    state = ovRes.state

    const switchRes = previewSwitchSubscriptionPlan(state, 'tenant', fedId, 'org_growth')
    expect(switchRes.success).toBe(true)
    state = switchRes.state

    // 4. Role update & suspend fail-closed verification
    const roleRes = updateOrganizationMemberRole(state, {
      tenantId: fedId,
      targetUserId: newAdmin.userId,
      newRole: 'director',
    })
    expect(roleRes.success).toBe(true)
    state = roleRes.state

    const suspendRes = updateOrganizationLifecycleStatus(state, fedId, 'suspended', 'Compliance hold')
    expect(suspendRes.success).toBe(true)
    state = suspendRes.state

    // Attempting to invite while suspended MUST fail closed
    const blockedInvite = await inviteMemberToOrganization(state, {
      tenantId: fedId,
      invitedEmail: 'blocked@kaafed.in',
      role: 'coach',
    })
    expect(blockedInvite.success).toBe(false)

    // Reactivate & execute atomic ownership transfer
    state = updateOrganizationLifecycleStatus(state, fedId, 'active').state
    const transferRes = await transferOrganizationOwnership(state, fedId, newAdmin.userId)
    expect(transferRes.success).toBe(true)
    state = transferRes.state
    expect(state.organizations.find(o => o.id === fedId)?.ownerId).toBe(newAdmin.userId)
  })

  it('verifies PostgreSQL SaaS core migration follows CI safety, RLS, and payments-disabled invariants', async () => {
    // @ts-expect-error - node built-in
    const fs = await import('node:fs')
    // @ts-expect-error - node built-in
    const path = await import('node:path')
    const migrationPath = path.resolve(
      'supabase/migrations/20261122000000_saas_platform_core_rbac_entitlements_metering.sql'
    )
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Transaction boundaries & zero destructive operations
    expect(sql).toMatch(/\bBEGIN\b/)
    expect(sql).toMatch(/\bCOMMIT\b/)
    expect(sql).not.toMatch(/\bDROP\s+TABLE\b/i)
    expect(sql).not.toMatch(/\bTRUNCATE\b/i)

    // P1 Fix: has_tenant_role enforces t.status = 'active'
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.has_tenant_role[\s\S]*?t\.status = 'active'/i)

    // Strict Platform role separation
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.has_platform_role/i)

    // Payments disabled & free listings guaranteed in DB
    expect(sql).toMatch(/billing_enabled BOOLEAN NOT NULL DEFAULT false/i)
    expect(sql).toMatch(/payment_collection_enabled BOOLEAN NOT NULL DEFAULT false/i)

    // Immutable audit logs: no UPDATE/DELETE granted to authenticated
    expect(sql).toMatch(/REVOKE ALL ON public\.saas_audit_logs FROM PUBLIC, anon, authenticated;/i)
    expect(sql).toMatch(/GRANT SELECT, INSERT ON public\.saas_audit_logs TO authenticated;/i)
  })
})
