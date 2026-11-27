/**
 * KhelGrid Platform-Wide SaaS Core Engine
 *
 * Pure, deterministic, server-aligned security & business logic for:
 * 1. Organization taxonomy (18 sports ecosystem categories)
 * 2. Strict Platform vs. Organization RBAC separation & module-level permissions
 * 3. Anti-privilege escalation & ownership transfer guards
 * 4. Dual Individual + Organization resource ownership evaluation
 * 5. Centralized Entitlement Engine (free-listing & verification guarantees)
 * 6. Usage Metering & Soft/Hard Limit Engine
 * 7. Complete 30-Module Platform SaaS Adoption Matrix
 */

import type {
  EntitlementEvaluationResult,
  EntitlementFeatureKey,
  EntitlementOverrideRecord,
  ModuleAdoptionEntry,
  ModulePermission,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationRecord,
  OrganizationRole,
  OrganizationType,
  OrganizationTypeMeta,
  PlanCode,
  PlatformRole,
  ResourceOwnershipRecord,
  SaaSPlanDefinition,
  SubscriptionRecord,
  UsageMeterKey,
  UsageMeterStatus,
} from './saasTypes'

// ============================================================================
// 1. ALL 18 SPORTS ECOSYSTEM ORGANIZATION CATEGORIES
// ============================================================================

export const ORGANIZATION_TYPES: readonly OrganizationTypeMeta[] = [
  { type: 'academy', label: 'Sports Academy', categoryGroup: 'Training & Venues', description: 'Grassroots & elite coaching academies managing batches, trainees, and attendance.', defaultFreeModules: ['athletes', 'coaches', 'trials'] },
  { type: 'venue', label: 'Venue Operator', categoryGroup: 'Training & Venues', description: 'Turf arenas, indoor courts, stadiums, and multi-sport complexes.', defaultFreeModules: ['venues', 'bookings'] },
  { type: 'club', label: 'Sports Club', categoryGroup: 'Training & Venues', description: 'Community, city, and professional competitive sports clubs.', defaultFreeModules: ['athletes', 'events', 'pickup_games'] },
  { type: 'coach', label: 'Independent Coaching Studio', categoryGroup: 'Training & Venues', description: 'Certified coach collectives running clinics and performance cohorts.', defaultFreeModules: ['coaches', 'athletes'] },
  { type: 'training_org', label: 'Training & Development Org', categoryGroup: 'Training & Venues', description: 'High-performance conditioning, strength, and sports science centers.', defaultFreeModules: ['athletes', 'coaches'] },
  { type: 'school', label: 'School Sports Dept', categoryGroup: 'Education', description: 'K-12 school athletic departments managing inter-school squads and trials.', defaultFreeModules: ['athletes', 'events', 'trials'] },
  { type: 'college', label: 'College Athletics', categoryGroup: 'Education', description: 'Collegiate sports teams, quota admissions, and campus grounds.', defaultFreeModules: ['athletes', 'trials', 'venues'] },
  { type: 'university', label: 'University Sports Board', categoryGroup: 'Education', description: 'AIU-affiliated university sports directorates and multi-campus facilities.', defaultFreeModules: ['athletes', 'tournaments', 'trials', 'venues'] },
  { type: 'federation', label: 'Sports Federation', categoryGroup: 'Governance & Events', description: 'National or state governing bodies managing sanctioned trials and rankings.', defaultFreeModules: ['trials', 'tournaments', 'athletes'] },
  { type: 'association', label: 'Sports Association', categoryGroup: 'Governance & Events', description: 'District and regional associations coordinating leagues and selection camps.', defaultFreeModules: ['trials', 'tournaments', 'events'] },
  { type: 'tournament', label: 'Tournament Organizer', categoryGroup: 'Governance & Events', description: 'League operators running brackets, fixtures, and verified rosters.', defaultFreeModules: ['tournaments', 'events'] },
  { type: 'event_organizer', label: 'Sports Event Organizer', categoryGroup: 'Governance & Events', description: 'Marathons, combines, showcases, and multi-discipline sports festivals.', defaultFreeModules: ['events', 'trials'] },
  { type: 'research_org', label: 'Research & Editorial Org', categoryGroup: 'Research & Enterprise', description: 'Sports science labs and academic institutions publishing to KhelChronicle.', defaultFreeModules: ['editorial', 'analytics'] },
  { type: 'media_org', label: 'Sports Media Org', categoryGroup: 'Research & Enterprise', description: 'Broadcasters, grassroots journalists, and regional sports publications.', defaultFreeModules: ['editorial', 'events'] },
  { type: 'corporate', label: 'Corporate Sports Org', categoryGroup: 'Research & Enterprise', description: 'Corporate wellness leagues, employee clubs, and CSR sports foundations.', defaultFreeModules: ['events', 'venues', 'pickup_games'] },
  { type: 'service_provider', label: 'Sports Service Provider', categoryGroup: 'Research & Enterprise', description: 'Physiotherapy, nutrition, biomechanics, and equipment service partners.', defaultFreeModules: ['coaches', 'athletes'] },
  { type: 'enterprise', label: 'Enterprise Sports Group', categoryGroup: 'Research & Enterprise', description: 'Multi-city franchise networks and national sports infrastructure groups.', defaultFreeModules: ['org_settings', 'org_team', 'analytics'] },
  { type: 'other', label: 'Other Sports Organization', categoryGroup: 'Research & Enterprise', description: 'NGOs, foundations, and community grassroots sports collectives.', defaultFreeModules: ['events', 'pickup_games'] },
] as const

export const VALID_ORGANIZATION_TYPE_SET = new Set<OrganizationType>(
  ORGANIZATION_TYPES.map(o => o.type)
)

// ============================================================================
// 2. STRICTLY SEPARATED PLATFORM VS. ORGANIZATION RBAC MATRIX
// ============================================================================

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  'platform_super_admin',
  'platform_admin',
  'security_admin',
  'platform_moderator',
  'content_moderator',
  'verification_reviewer',
  'support_operator',
  'readonly_auditor',
] as const

export const ORGANIZATION_ROLE_RANK: Record<OrganizationRole, number> = {
  owner: 100,
  org_admin: 90,
  director: 85,
  admin: 80,
  manager: 70,
  admissions_manager: 65,
  finance_manager: 65,
  content_manager: 60,
  listing_manager: 60,
  verification_coordinator: 55,
  head_coach: 55,
  accountant: 50,
  coach: 40,
  front_desk: 35,
  staff: 30,
  readonly_member: 20,
  parent: 10,
}

export const ORGANIZATION_ROLE_PERMISSIONS: Record<OrganizationRole, readonly ModulePermission[]> = {
  owner: [
    'org:settings', 'org:team', 'org:billing', 'org:audit',
    'venues:manage', 'coaches:manage', 'trials:manage', 'events:manage',
    'tournaments:manage', 'pickup_games:manage', 'bookings:manage',
    'athletes:manage', 'editorial:manage', 'analytics:view',
  ],
  org_admin: [
    'org:settings', 'org:team', 'org:audit',
    'venues:manage', 'coaches:manage', 'trials:manage', 'events:manage',
    'tournaments:manage', 'pickup_games:manage', 'bookings:manage',
    'athletes:manage', 'editorial:manage', 'analytics:view',
  ],
  director: [
    'org:settings', 'org:team', 'org:billing', 'org:audit',
    'venues:manage', 'coaches:manage', 'trials:manage', 'events:manage',
    'tournaments:manage', 'bookings:manage', 'athletes:manage', 'analytics:view',
  ],
  admin: [
    'org:team', 'venues:manage', 'coaches:manage', 'trials:manage',
    'events:manage', 'tournaments:manage', 'bookings:manage',
    'athletes:manage', 'analytics:view',
  ],
  manager: [
    'venues:manage', 'events:manage', 'tournaments:manage',
    'bookings:manage', 'athletes:manage', 'analytics:view',
  ],
  admissions_manager: ['trials:manage', 'athletes:manage', 'analytics:view'],
  finance_manager: ['org:billing', 'bookings:manage', 'analytics:view'],
  accountant: ['org:billing', 'analytics:view'],
  content_manager: ['editorial:manage', 'trials:manage', 'events:manage'],
  listing_manager: ['venues:manage', 'coaches:manage', 'trials:manage', 'events:manage'],
  verification_coordinator: ['athletes:manage', 'trials:manage'],
  head_coach: ['coaches:manage', 'athletes:manage', 'trials:manage'],
  coach: ['athletes:manage'],
  front_desk: ['bookings:manage', 'athletes:manage'],
  staff: ['bookings:manage'],
  readonly_member: ['analytics:view'],
  parent: [],
}

/**
 * Evaluates whether a user's organization membership grants a module permission.
 * Fails closed when:
 * - organization is not active (suspended / archived / pending_verification)
 * - membership is not active (invited / suspended / revoked)
 * - membership belongs to a different tenant (cross-tenant rejection)
 */
export function hasOrganizationPermission(params: {
  organization: Pick<OrganizationRecord, 'id' | 'status'> | null | undefined
  membership: Pick<OrganizationMembership, 'tenantId' | 'role' | 'status'> | null | undefined
  permission: ModulePermission
}): boolean {
  const { organization, membership, permission } = params
  if (!organization || !membership) return false
  if (organization.status !== 'active') return false
  if (membership.status !== 'active') return false
  if (membership.tenantId !== organization.id) return false

  const perms = ORGANIZATION_ROLE_PERMISSIONS[membership.role] || []
  return perms.includes(permission)
}

/**
 * Verifies that organization roles NEVER confer platform-level authority.
 */
export function hasStrictPlatformRole(params: {
  platformRoles: readonly PlatformRole[]
  required: readonly PlatformRole[]
}): boolean {
  if (!params.platformRoles || params.platformRoles.length === 0) return false
  return params.platformRoles.some(r => params.required.includes(r))
}

/**
 * Enforces anti-privilege escalation rules for member role modifications.
 * Mirrors PostgreSQL RLS policies on public.tenant_memberships:
 * 1. Suspended org blocks all mutations.
 * 2. Actor cannot modify their own role (prevents self-promotion).
 * 3. Cannot promote anyone to 'owner' via role update (must use atomic ownership transfer).
 * 4. Actor cannot modify a member of equal or higher rank (except owner modifying non-owners).
 * 5. Actor cannot assign a role strictly higher than or equal to their own rank (except owner).
 */
export function validateRoleChange(params: {
  organizationStatus: OrganizationRecord['status']
  actorUserId: string
  actorRole: OrganizationRole
  targetUserId: string
  targetCurrentRole: OrganizationRole
  newRole: OrganizationRole
}): { allowed: boolean; reason: string } {
  if (params.organizationStatus !== 'active') {
    return { allowed: false, reason: 'Organization is not active; role changes are blocked.' }
  }
  if (params.actorUserId === params.targetUserId) {
    return { allowed: false, reason: 'Self-modification of your own organization role is prohibited.' }
  }
  if (params.newRole === 'owner' || params.targetCurrentRole === 'owner') {
    return { allowed: false, reason: 'Owner role can only be changed through atomic Ownership Transfer.' }
  }

  const actorRank = ORGANIZATION_ROLE_RANK[params.actorRole] ?? 0
  const targetRank = ORGANIZATION_ROLE_RANK[params.targetCurrentRole] ?? 0
  const newRank = ORGANIZATION_ROLE_RANK[params.newRole] ?? 0

  if (!ORGANIZATION_ROLE_PERMISSIONS[params.actorRole]?.includes('org:team')) {
    return { allowed: false, reason: `Role "${params.actorRole}" does not hold org:team permission.` }
  }
  if (params.actorRole !== 'owner' && targetRank >= actorRank) {
    return { allowed: false, reason: 'Cannot modify a member whose role rank is equal to or higher than yours.' }
  }
  if (params.actorRole !== 'owner' && newRank >= actorRank) {
    return { allowed: false, reason: 'Cannot assign a role equal to or higher than your own role ceiling.' }
  }

  return { allowed: true, reason: 'Role change authorized.' }
}

/**
 * Validates atomic ownership transfer preconditions.
 */
export function validateOwnershipTransfer(params: {
  organization: Pick<OrganizationRecord, 'id' | 'ownerId' | 'status'>
  actorUserId: string
  targetMembership: Pick<OrganizationMembership, 'tenantId' | 'userId' | 'status' | 'role'> | null
}): { allowed: boolean; reason: string } {
  if (params.organization.status !== 'active') {
    return { allowed: false, reason: 'Cannot transfer ownership of a non-active organization.' }
  }
  if (params.organization.ownerId !== params.actorUserId) {
    return { allowed: false, reason: 'Only the current registered organization owner can transfer ownership.' }
  }
  if (!params.targetMembership || params.targetMembership.tenantId !== params.organization.id) {
    return { allowed: false, reason: 'Recipient must belong to this organization.' }
  }
  if (params.targetMembership.status !== 'active') {
    return { allowed: false, reason: 'Recipient must have an active membership.' }
  }
  if (params.targetMembership.userId === params.actorUserId) {
    return { allowed: false, reason: 'Recipient must be a different user.' }
  }
  return { allowed: true, reason: 'Ownership transfer preconditions satisfied.' }
}

// ============================================================================
// 3. INVITATION EXPIRY & TOKEN INTEGRITY HELPERS
// ============================================================================

export function isInvitationAcceptable(
  invitation: Pick<OrganizationInvitation, 'status' | 'expiresAt'>,
  now = new Date()
): { acceptable: boolean; reason: string } {
  if (invitation.status !== 'pending') {
    return { acceptable: false, reason: `Invitation status is "${invitation.status}" and cannot be accepted.` }
  }
  const expiresMs = Date.parse(invitation.expiresAt)
  if (Number.isNaN(expiresMs) || expiresMs <= now.getTime()) {
    return { acceptable: false, reason: 'Invitation token has expired.' }
  }
  return { acceptable: true, reason: 'Invitation is valid and active.' }
}

export async function hashInvitationTokenHex(rawToken: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const encoded = new TextEncoder().encode(rawToken)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Deterministic 64-hex fallback for non-WebCrypto runtimes
  let h1 = 0x811c9dc5
  let h2 = 0xdeadbeef
  for (let i = 0; i < rawToken.length; i++) {
    const ch = rawToken.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 0x01000193)
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b)
  }
  const seg = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  return `${seg(h1)}${seg(h2)}${seg(h1 ^ h2)}${seg(h1 + h2)}${seg(h2 ^ 0x5a5a5a5a)}${seg(h1 ^ 0xa5a5a5a5)}${seg(h1 * 31)}${seg(h2 * 17)}`
}

// ============================================================================
// 4. DUAL RESOURCE OWNERSHIP EVALUATOR (INDIVIDUAL + ORGANIZATION)
// ============================================================================

export function canManageOwnedResource(params: {
  resource: ResourceOwnershipRecord
  actorUserId: string | null
  activeOrganization?: Pick<OrganizationRecord, 'id' | 'status'> | null
  actorMembership?: Pick<OrganizationMembership, 'tenantId' | 'userId' | 'role' | 'status'> | null
  requiredOrgPermission?: ModulePermission
}): { allowed: boolean; reason: string } {
  const { resource, actorUserId, activeOrganization, actorMembership } = params
  if (!actorUserId) {
    return { allowed: false, reason: 'Authentication required to manage resources.' }
  }

  if (resource.ownershipType === 'individual') {
    if (resource.ownerUserId === actorUserId) {
      return { allowed: true, reason: 'Authorized as individual resource owner.' }
    }
    return { allowed: false, reason: 'Resource belongs to another individual user.' }
  }

  // Organization ownership path
  if (!resource.ownerTenantId) {
    return { allowed: false, reason: 'Organization-owned resource is missing ownerTenantId.' }
  }
  if (!activeOrganization || activeOrganization.id !== resource.ownerTenantId) {
    return { allowed: false, reason: 'Active workspace does not match resource owning organization.' }
  }
  if (!actorMembership || actorMembership.userId !== actorUserId) {
    return { allowed: false, reason: 'Caller has no active membership in the owning organization.' }
  }

  const permission = params.requiredOrgPermission || mapResourceTypeToPermission(resource.resourceType)
  const permitted = hasOrganizationPermission({
    organization: activeOrganization,
    membership: actorMembership,
    permission,
  })
  return permitted
    ? { allowed: true, reason: `Authorized via organization permission "${permission}".` }
    : { allowed: false, reason: `Organization role "${actorMembership.role}" lacks "${permission}" or organization is inactive.` }
}

export function mapResourceTypeToPermission(resourceType: ResourceOwnershipRecord['resourceType']): ModulePermission {
  switch (resourceType) {
    case 'venue': return 'venues:manage'
    case 'coach_profile': return 'coaches:manage'
    case 'opportunity': return 'trials:manage'
    case 'tournament': return 'tournaments:manage'
    case 'event': return 'events:manage'
    case 'pickup_game': return 'pickup_games:manage'
    case 'research_paper':
    case 'editorial_article': return 'editorial:manage'
    case 'academy':
    case 'athlete_program': return 'athletes:manage'
    default: return 'org:settings'
  }
}

// ============================================================================
// 5. CANONICAL PLANS & CENTRALIZED ENTITLEMENT ENGINE (PAYMENTS DISABLED)
// ============================================================================

export const FREE_COMMUNITY_FEATURES = new Set<EntitlementFeatureKey>([
  'listings.free_submission',
  'verification.independent_review',
])

export const CANONICAL_SAAS_PLANS: Record<PlanCode, SaaSPlanDefinition> = {
  individual_free: {
    code: 'individual_free',
    name: 'Athlete & Coach Free',
    audience: 'individual',
    monthlyPriceInr: 0,
    billingEnabled: false,
    listingPublicationAlwaysFree: true,
    summary: 'Free athlete passport, Sports CV, public trial discovery, and free listing submission.',
    entitlements: {
      'listings.free_submission': { enabled: true, limit: null, freeCommunity: true },
      'verification.independent_review': { enabled: true, limit: null, freeCommunity: true },
      'org.multi_member': { enabled: false, limit: 0 },
      'org.advanced_roles': { enabled: false, limit: 0 },
      'org.branches': { enabled: false, limit: 0 },
      'org.advanced_analytics': { enabled: false, limit: 0 },
      'venues.multi_location': { enabled: false, limit: 0 },
      'academy.student_management': { enabled: false, limit: 0 },
      'events.registrations': { enabled: true, limit: 3 },
      'editorial.collaboration': { enabled: true, limit: 3 },
      'platform.data_exports': { enabled: true, limit: 5 },
      'platform.api_access': { enabled: false, limit: 0 },
    },
  },
  individual_pro: {
    code: 'individual_pro',
    name: 'Athlete Pro Passport (Preview)',
    audience: 'individual',
    monthlyPriceInr: 499,
    billingEnabled: false,
    listingPublicationAlwaysFree: true,
    summary: 'Optional future individual analytics & portfolio tools (payments disabled).',
    entitlements: {
      'listings.free_submission': { enabled: true, limit: null, freeCommunity: true },
      'verification.independent_review': { enabled: true, limit: null, freeCommunity: true },
      'org.multi_member': { enabled: false, limit: 0 },
      'org.advanced_roles': { enabled: false, limit: 0 },
      'org.branches': { enabled: false, limit: 0 },
      'org.advanced_analytics': { enabled: true, limit: null },
      'venues.multi_location': { enabled: false, limit: 0 },
      'academy.student_management': { enabled: false, limit: 0 },
      'events.registrations': { enabled: true, limit: 20 },
      'editorial.collaboration': { enabled: true, limit: 20 },
      'platform.data_exports': { enabled: true, limit: 50 },
      'platform.api_access': { enabled: false, limit: 0 },
    },
  },
  org_free: {
    code: 'org_free',
    name: 'Organization Starter Free',
    audience: 'organization',
    monthlyPriceInr: 0,
    billingEnabled: false,
    listingPublicationAlwaysFree: true,
    summary: 'Operate any academy, club, school, venue, or association for free with multi-member RBAC.',
    entitlements: {
      'listings.free_submission': { enabled: true, limit: null, freeCommunity: true },
      'verification.independent_review': { enabled: true, limit: null, freeCommunity: true },
      'org.multi_member': { enabled: true, limit: 5 },
      'org.advanced_roles': { enabled: true, limit: null },
      'org.branches': { enabled: true, limit: 2 },
      'org.advanced_analytics': { enabled: false, limit: 0 },
      'venues.multi_location': { enabled: true, limit: 2 },
      'academy.student_management': { enabled: true, limit: 150 },
      'events.registrations': { enabled: true, limit: 5 },
      'editorial.collaboration': { enabled: true, limit: 5 },
      'platform.data_exports': { enabled: true, limit: 10 },
      'platform.api_access': { enabled: false, limit: 0 },
    },
  },
  org_growth: {
    code: 'org_growth',
    name: 'Organization Growth Suite (Preview)',
    audience: 'organization',
    monthlyPriceInr: 1999,
    billingEnabled: false,
    listingPublicationAlwaysFree: true,
    summary: 'Higher member, branch, venue, and export quotas plus advanced analytics (payments disabled).',
    entitlements: {
      'listings.free_submission': { enabled: true, limit: null, freeCommunity: true },
      'verification.independent_review': { enabled: true, limit: null, freeCommunity: true },
      'org.multi_member': { enabled: true, limit: 25 },
      'org.advanced_roles': { enabled: true, limit: null },
      'org.branches': { enabled: true, limit: 10 },
      'org.advanced_analytics': { enabled: true, limit: null },
      'venues.multi_location': { enabled: true, limit: 10 },
      'academy.student_management': { enabled: true, limit: 1000 },
      'events.registrations': { enabled: true, limit: 50 },
      'editorial.collaboration': { enabled: true, limit: 50 },
      'platform.data_exports': { enabled: true, limit: 100 },
      'platform.api_access': { enabled: false, limit: 0 },
    },
  },
  org_enterprise: {
    code: 'org_enterprise',
    name: 'Federation & Enterprise Suite (Preview)',
    audience: 'enterprise',
    monthlyPriceInr: 7999,
    billingEnabled: false,
    listingPublicationAlwaysFree: true,
    summary: 'Multi-city federations, universities, and enterprise sports networks with API access (payments disabled).',
    entitlements: {
      'listings.free_submission': { enabled: true, limit: null, freeCommunity: true },
      'verification.independent_review': { enabled: true, limit: null, freeCommunity: true },
      'org.multi_member': { enabled: true, limit: 500 },
      'org.advanced_roles': { enabled: true, limit: null },
      'org.branches': { enabled: true, limit: 100 },
      'org.advanced_analytics': { enabled: true, limit: null },
      'venues.multi_location': { enabled: true, limit: 100 },
      'academy.student_management': { enabled: true, limit: 25000 },
      'events.registrations': { enabled: true, limit: 500 },
      'editorial.collaboration': { enabled: true, limit: 500 },
      'platform.data_exports': { enabled: true, limit: 5000 },
      'platform.api_access': { enabled: true, limit: null },
    },
  },
}

/**
 * Single centralized question for every KhelGrid module:
 * "Does this user or organization have permission to use this feature under its current access configuration?"
 */
export function evaluateEntitlement(params: {
  featureKey: EntitlementFeatureKey
  subjectType: 'user' | 'tenant'
  subjectId: string
  organizationStatus?: OrganizationRecord['status']
  subscription?: SubscriptionRecord | null
  overrides?: readonly EntitlementOverrideRecord[]
  currentUsage?: number
  enforceHardLimit?: boolean
  now?: Date
}): EntitlementEvaluationResult {
  const now = params.now ?? new Date()
  const fallbackPlan: PlanCode = params.subjectType === 'user' ? 'individual_free' : 'org_free'

  // 1. Suspended / archived organization fails closed on ALL features
  if (params.subjectType === 'tenant' && params.organizationStatus && params.organizationStatus !== 'active') {
    return {
      allowed: false,
      featureKey: params.featureKey,
      source: 'tenant_suspended',
      planCode: params.subscription?.planCode ?? fallbackPlan,
      limit: 0,
      reason: `Organization is currently "${params.organizationStatus}". Access to "${params.featureKey}" is suspended.`,
    }
  }

  // 2. Free community & independent verification guarantee (never paywalled)
  if (FREE_COMMUNITY_FEATURES.has(params.featureKey)) {
    return {
      allowed: true,
      featureKey: params.featureKey,
      source: 'free_community_guarantee',
      planCode: params.subscription?.planCode ?? fallbackPlan,
      limit: null,
      reason: 'Free public community & independent verification feature — never gated by paid plans.',
    }
  }

  // 3. Check active, non-expired, non-revoked administrative override
  const activeOverride = (params.overrides || []).find(ov => {
    if (ov.subjectType !== params.subjectType || ov.subjectId !== params.subjectId) return false
    if (ov.featureKey !== params.featureKey) return false
    if (ov.revokedAt) return false
    if (ov.expiresAt && Date.parse(ov.expiresAt) <= now.getTime()) return false
    return true
  })

  if (activeOverride) {
    const limit = activeOverride.overrideLimit ?? null
    const usage = params.currentUsage ?? 0
    const hardLimitReached = limit !== null && usage >= limit
    const allowed = activeOverride.isEnabled && !(params.enforceHardLimit && hardLimitReached)
    return {
      allowed,
      featureKey: params.featureKey,
      source: hardLimitReached && params.enforceHardLimit ? 'quota_hard_limit' : 'admin_override',
      planCode: params.subscription?.planCode ?? fallbackPlan,
      limit,
      currentUsage: params.currentUsage,
      remaining: limit === null ? null : Math.max(0, limit - usage),
      softLimitReached: limit !== null && limit > 0 && usage / limit >= 0.8,
      hardLimitReached,
      reason: activeOverride.isEnabled
        ? `Granted by audited admin override: ${activeOverride.reason}`
        : `Disabled by audited admin override: ${activeOverride.reason}`,
    }
  }

  // 4. Resolve effective plan from subscription lifecycle state
  const sub = params.subscription
  const isSubscriptionActive = Boolean(
    sub &&
    ['free_active', 'active', 'trialing', 'grace_period'].includes(sub.status) &&
    (!sub.currentPeriodEnd || Date.parse(sub.currentPeriodEnd) > now.getTime())
  )

  const effectivePlanCode: PlanCode = isSubscriptionActive && sub ? sub.planCode : fallbackPlan
  const usedFallback = Boolean(sub && !isSubscriptionActive)
  const plan = CANONICAL_SAAS_PLANS[effectivePlanCode] || CANONICAL_SAAS_PLANS[fallbackPlan]
  const entry = plan.entitlements[params.featureKey]

  if (!entry) {
    return {
      allowed: false,
      featureKey: params.featureKey,
      source: 'default_deny',
      planCode: effectivePlanCode,
      limit: 0,
      reason: `Feature "${params.featureKey}" is not defined on plan "${plan.name}".`,
    }
  }

  const limit = entry.limit
  const usage = params.currentUsage ?? 0
  const softLimitReached = limit !== null && limit > 0 && usage / limit >= 0.8
  const hardLimitReached = limit !== null && usage >= limit

  if (!entry.enabled) {
    return {
      allowed: false,
      featureKey: params.featureKey,
      source: usedFallback ? 'subscription_fallback_free' : 'plan',
      planCode: effectivePlanCode,
      limit,
      currentUsage: params.currentUsage,
      remaining: 0,
      softLimitReached: false,
      hardLimitReached: false,
      reason: usedFallback
        ? `Subscription is "${sub?.status}"; fell back to "${plan.name}" where "${params.featureKey}" is unavailable.`
        : `Feature "${params.featureKey}" is not included in "${plan.name}".`,
    }
  }

  if (params.enforceHardLimit && hardLimitReached) {
    return {
      allowed: false,
      featureKey: params.featureKey,
      source: 'quota_hard_limit',
      planCode: effectivePlanCode,
      limit,
      currentUsage: usage,
      remaining: 0,
      softLimitReached: true,
      hardLimitReached: true,
      reason: `Hard quota reached (${usage}/${limit}) on "${plan.name}".`,
    }
  }

  return {
    allowed: true,
    featureKey: params.featureKey,
    source: usedFallback ? 'subscription_fallback_free' : 'plan',
    planCode: effectivePlanCode,
    limit,
    currentUsage: params.currentUsage,
    remaining: limit === null ? null : Math.max(0, limit - usage),
    softLimitReached,
    hardLimitReached,
    reason: `Allowed under "${plan.name}"${limit !== null ? ` (${usage}/${limit} used)` : ' (unlimited)'}.`,
  }
}

// ============================================================================
// 6. USAGE METERING ENGINE
// ============================================================================

export const USAGE_METER_DEFINITIONS: Record<
  UsageMeterKey,
  { displayName: string; windowType: 'current_total' | 'monthly' | 'daily'; featureKey: EntitlementFeatureKey; softLimitRatio: number; hardLimitEnforced: boolean }
> = {
  'org.members': { displayName: 'Active Organization Members', windowType: 'current_total', featureKey: 'org.multi_member', softLimitRatio: 0.8, hardLimitEnforced: true },
  'org.branches': { displayName: 'Branches, Departments & Teams', windowType: 'current_total', featureKey: 'org.branches', softLimitRatio: 0.8, hardLimitEnforced: true },
  'venues.managed': { displayName: 'Managed Venue Locations', windowType: 'current_total', featureKey: 'venues.multi_location', softLimitRatio: 0.8, hardLimitEnforced: false },
  'events.published_monthly': { displayName: 'Events & Tournaments / Month', windowType: 'monthly', featureKey: 'events.registrations', softLimitRatio: 0.8, hardLimitEnforced: false },
  'exports.monthly': { displayName: 'Data Exports / Month', windowType: 'monthly', featureKey: 'platform.data_exports', softLimitRatio: 0.8, hardLimitEnforced: true },
  'storage.mb': { displayName: 'Document Storage (MB)', windowType: 'current_total', featureKey: 'platform.data_exports', softLimitRatio: 0.85, hardLimitEnforced: true },
}

export function computeUsageMeterStatuses(params: {
  planCode: PlanCode
  usageValues: Partial<Record<UsageMeterKey, number>>
  overrides?: readonly EntitlementOverrideRecord[]
  subjectId: string
}): UsageMeterStatus[] {
  const plan = CANONICAL_SAAS_PLANS[params.planCode] || CANONICAL_SAAS_PLANS.org_free
  return (Object.keys(USAGE_METER_DEFINITIONS) as UsageMeterKey[]).map(meterKey => {
    const def = USAGE_METER_DEFINITIONS[meterKey]
    const currentValue = Math.max(0, params.usageValues[meterKey] ?? 0)
    const activeOverride = (params.overrides || []).find(
      ov => ov.subjectId === params.subjectId && ov.featureKey === def.featureKey && !ov.revokedAt
    )
    const limit =
      meterKey === 'storage.mb'
        ? (params.planCode === 'org_enterprise' ? 25000 : params.planCode === 'org_growth' ? 5000 : 500)
        : activeOverride?.overrideLimit !== undefined
          ? activeOverride.overrideLimit
          : plan.entitlements[def.featureKey]?.limit ?? null

    const utilizationPercent = limit && limit > 0 ? Math.min(100, Math.round((currentValue / limit) * 100)) : 0
    const softLimitReached = limit !== null && limit > 0 && currentValue / limit >= def.softLimitRatio
    const hardLimitReached = limit !== null && currentValue >= limit

    return {
      meterKey,
      displayName: def.displayName,
      windowType: def.windowType,
      currentValue,
      limit,
      utilizationPercent,
      softLimitRatio: def.softLimitRatio,
      softLimitReached,
      hardLimitReached,
      hardLimitEnforced: def.hardLimitEnforced,
    }
  })
}

// ============================================================================
// 7. COMPLETE 30-MODULE PLATFORM-WIDE SAAS ADOPTION MATRIX
// ============================================================================

export const PLATFORM_SAAS_ADOPTION_MATRIX: readonly ModuleAdoptionEntry[] = [
  { id: 'm01', moduleName: 'Public Homepage', route: '/', ownershipMode: 'Public Read-Only', tenantRelationship: 'None (public discovery)', rbacRequired: 'None', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Not Needed (Keep Public)' },
  { id: 'm02', moduleName: 'Sports Directory', route: '/sports', ownershipMode: 'Public Read-Only', tenantRelationship: 'None (canonical taxonomy)', rbacRequired: 'Platform editorial only', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Not Needed (Keep Public)' },
  { id: 'm03', moduleName: 'Venue Directory', route: '/venues', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Optional owner_tenant_id link', rbacRequired: 'venues:manage for edit', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None for public listing', integrationPriority: 'Now (Phase 2)' },
  { id: 'm04', moduleName: 'Academy Directory', route: '/academies', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Optional owner_tenant_id link', rbacRequired: 'athletes:manage / listing_manager', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None for public listing', integrationPriority: 'Now (Phase 2)' },
  { id: 'm05', moduleName: 'Coach Directory', route: '/coaches', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Individual coach or org staff', rbacRequired: 'coaches:manage or self', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Now (Phase 2)' },
  { id: 'm06', moduleName: 'Trial Listings', route: '/opportunities', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Federation/academy/individual submitter', rbacRequired: 'trials:manage + moderation', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None (always free)', integrationPriority: 'Now (Phase 2)' },
  { id: 'm07', moduleName: 'Scholarship Listings', route: '/scholarships', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'University/foundation/federation', rbacRequired: 'trials:manage + moderation', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Now (Phase 2)' },
  { id: 'm08', moduleName: 'Camps', route: '/camps', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Academy/club/coach organizer', rbacRequired: 'events:manage', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'Optional event registrations', integrationPriority: 'Next (Phase 3)' },
  { id: 'm09', moduleName: 'Combines', route: '/combines', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Federation/scout/club organizer', rbacRequired: 'trials:manage', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'Combine exports', integrationPriority: 'Next (Phase 3)' },
  { id: 'm10', moduleName: 'Tournaments', route: '/events', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Tournament/association org or host', rbacRequired: 'tournaments:manage', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'events.published_monthly', integrationPriority: 'Now (Phase 2)' },
  { id: 'm11', moduleName: 'Events & Tournament Ops', route: '/tournament-ops', ownershipMode: 'Organization Scoped', tenantRelationship: 'Strict tenant_id isolation', rbacRequired: 'tournaments:manage, events:manage', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'events.published_monthly', integrationPriority: 'Now (Phase 2)' },
  { id: 'm12', moduleName: 'Pickup Games', route: '/play', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Individual host or club/venue', rbacRequired: 'pickup_games:manage or host', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None (community free)', integrationPriority: 'Not Needed (Keep Public)' },
  { id: 'm13', moduleName: 'Athlete Profiles', route: '/u/:username', ownershipMode: 'Individual Only', tenantRelationship: 'Retains personal identity', rbacRequired: 'Owner + privacy guard', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Now (Phase 2)' },
  { id: 'm14', moduleName: 'Athlete Dashboards', route: '/dashboard', ownershipMode: 'Individual Only', tenantRelationship: 'Switches to org workspaces cleanly', rbacRequired: 'Authenticated self', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'None', integrationPriority: 'Now (Phase 2)' },
  { id: 'm15', moduleName: 'Organization Dashboards', route: '/organizations', ownershipMode: 'Organization Scoped', tenantRelationship: 'Canonical tenants + memberships', rbacRequired: 'org:settings, org:team, org:audit', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'org.members, org.branches', integrationPriority: 'Now (Phase 2)' },
  { id: 'm16', moduleName: 'Venue Management & Turf Calendar', route: '/turf-calendar', ownershipMode: 'Organization Scoped', tenantRelationship: 'Strict tenant_id + units', rbacRequired: 'venues:manage, bookings:manage', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'venues.managed', integrationPriority: 'Now (Phase 2)' },
  { id: 'm17', moduleName: 'Academy Management Hub', route: '/academy-hub', ownershipMode: 'Organization Scoped', tenantRelationship: 'Canonical Phase 1 + Phase 2 RLS', rbacRequired: 'athletes:manage, org:billing', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'academy.student_management', integrationPriority: 'Now (Phase 2)' },
  { id: 'm18', moduleName: 'Booking System', route: '/host', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Venue tenant + player user', rbacRequired: 'bookings:manage', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'None (payments disabled)', integrationPriority: 'Next (Phase 3)' },
  { id: 'm19', moduleName: 'Notification System', route: '/notifications', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'User + tenant-scoped alerts', rbacRequired: 'Subject membership check', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Next (Phase 3)' },
  { id: 'm20', moduleName: 'KhelChronicle Public Archive', route: '/khelchronicle', ownershipMode: 'Public Read-Only', tenantRelationship: 'Diamond Open Access', rbacRequired: 'Public read', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Not Needed (Keep Public)' },
  { id: 'm21', moduleName: 'Editorial Management', route: '/khelchronicle/submit', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Author user or research_org', rbacRequired: 'editorial:manage + peer review', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'None', integrationPriority: 'Next (Phase 3)' },
  { id: 'm22', moduleName: 'Research Publishing', route: '/khelchronicle', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'Research org affiliation', rbacRequired: 'content_moderator / reviewer', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Next (Phase 3)' },
  { id: 'm23', moduleName: 'Analytics', route: '/organizations', ownershipMode: 'Organization Scoped', tenantRelationship: 'Tenant-scoped KPIs', rbacRequired: 'analytics:view', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'exports.monthly', integrationPriority: 'Now (Phase 2)' },
  { id: 'm24', moduleName: 'Global Search', route: '/search', ownershipMode: 'Public Read-Only', tenantRelationship: 'Public verified projections only', rbacRequired: 'Public read', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Not Needed (Keep Public)' },
  { id: 'm25', moduleName: 'File & Document Management', route: '/verification', ownershipMode: 'Dual (Individual + Org)', tenantRelationship: 'User or tenant isolated buckets', rbacRequired: 'Owner / org:settings', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'storage.mb', integrationPriority: 'Next (Phase 3)' },
  { id: 'm26', moduleName: 'Admin Control Plane', route: 'apps/admin', ownershipMode: 'Platform Control Plane', tenantRelationship: 'Cross-tenant audited oversight', rbacRequired: 'platform_super_admin / platform_admin', entitlementRelevance: 'Platform Internal Only', meteringRelevance: 'Platform telemetry', integrationPriority: 'Now (Phase 2)' },
  { id: 'm27', moduleName: 'Moderation Desk', route: 'apps/admin', ownershipMode: 'Platform Control Plane', tenantRelationship: 'Independent of billing/plans', rbacRequired: 'platform_moderator / verification_reviewer', entitlementRelevance: 'Platform Internal Only', meteringRelevance: 'None', integrationPriority: 'Now (Phase 2)' },
  { id: 'm28', moduleName: 'Verification Workflows', route: '/verification', ownershipMode: 'Platform Control Plane', tenantRelationship: 'Decoupled from subscriptions', rbacRequired: 'verification_reviewer', entitlementRelevance: 'Always Free / Community', meteringRelevance: 'None', integrationPriority: 'Now (Phase 2)' },
  { id: 'm29', moduleName: 'Future API Integrations', route: '/organizations', ownershipMode: 'Organization Scoped', tenantRelationship: 'Tenant API keys & scopes', rbacRequired: 'org:settings + platform.api_access', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'API quotas (future)', integrationPriority: 'Next (Phase 3)' },
  { id: 'm30', moduleName: 'Future Enterprise Tools', route: '/organizations', ownershipMode: 'Organization Scoped', tenantRelationship: 'Parent/branch enterprise orgs', rbacRequired: 'owner / org_admin', entitlementRelevance: 'Optional Premium Enhancements', meteringRelevance: 'All enterprise meters', integrationPriority: 'Next (Phase 3)' },
] as const

export function sanitizeOrganizationSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}
