/**
 * KhelGrid Platform-Wide SaaS Architecture — Canonical Type Contracts
 *
 * Covers the 11 logical SaaS layers:
 * 1. Identity  2. Platform Authorization  3. Organization & Tenant
 * 4. Membership & Invitations  5. Module-Level RBAC  6. Dual Resource Ownership
 * 7. Subscriptions (Payments Disabled)  8. Centralized Entitlements
 * 9. Usage Metering  10. Immutable Audit Logs  11. Platform Module Adoption Matrix
 */

// ---------------------------------------------------------------------------
// 1. Organization & Tenant Taxonomy (All 18 Sports Ecosystem Categories)
// ---------------------------------------------------------------------------

export type OrganizationType =
  | 'academy'
  | 'coach'
  | 'venue'
  | 'tournament'
  | 'club'
  | 'school'
  | 'college'
  | 'university'
  | 'federation'
  | 'association'
  | 'event_organizer'
  | 'corporate'
  | 'training_org'
  | 'service_provider'
  | 'research_org'
  | 'media_org'
  | 'enterprise'
  | 'other'

export interface OrganizationTypeMeta {
  type: OrganizationType
  label: string
  categoryGroup: 'Training & Venues' | 'Education' | 'Governance & Events' | 'Research & Enterprise'
  description: string
  defaultFreeModules: SaaSModuleKey[]
}

export type OrganizationStatus = 'active' | 'pending_verification' | 'suspended' | 'archived'
export type OrganizationVerificationStatus = 'unverified' | 'pending_review' | 'verified' | 'rejected'

export interface OrganizationRecord {
  id: string
  slug: string
  name: string
  tenantType: OrganizationType
  status: OrganizationStatus
  verificationStatus: OrganizationVerificationStatus
  ownerId: string
  parentTenantId?: string | null
  city?: string
  state?: string
  sport?: string
  contactEmail?: string
  contactPhone?: string
  upiVpa?: string
  suspendedReason?: string | null
  createdAt: string
  updatedAt: string
}

export type OrganizationUnitType = 'branch' | 'regional_office' | 'department' | 'team' | 'facility'

export interface OrganizationUnit {
  id: string
  tenantId: string
  name: string
  unitType: OrganizationUnitType
  city?: string
  state?: string
  leadName?: string
  isActive: boolean
  createdAt: string
}

// ---------------------------------------------------------------------------
// 2. Strictly Separated Platform Roles vs. Organization Roles
// ---------------------------------------------------------------------------

export type PlatformRole =
  | 'platform_super_admin'
  | 'platform_admin'
  | 'security_admin'
  | 'platform_moderator'
  | 'content_moderator'
  | 'verification_reviewer'
  | 'support_operator'
  | 'readonly_auditor'

export type OrganizationRole =
  | 'owner'
  | 'org_admin'
  | 'director'
  | 'admin'
  | 'manager'
  | 'admissions_manager'
  | 'finance_manager'
  | 'content_manager'
  | 'listing_manager'
  | 'verification_coordinator'
  | 'head_coach'
  | 'coach'
  | 'accountant'
  | 'front_desk'
  | 'staff'
  | 'readonly_member'
  | 'parent'

export type SaaSModuleKey =
  | 'venues'
  | 'coaches'
  | 'trials'
  | 'events'
  | 'tournaments'
  | 'pickup_games'
  | 'bookings'
  | 'athletes'
  | 'editorial'
  | 'analytics'
  | 'org_settings'
  | 'org_team'

export type ModulePermission =
  | 'org:settings'
  | 'org:team'
  | 'org:billing'
  | 'org:audit'
  | 'venues:manage'
  | 'coaches:manage'
  | 'trials:manage'
  | 'events:manage'
  | 'tournaments:manage'
  | 'pickup_games:manage'
  | 'bookings:manage'
  | 'athletes:manage'
  | 'editorial:manage'
  | 'analytics:view'

// ---------------------------------------------------------------------------
// 3. Memberships & Cryptographic Expiring Invitations
// ---------------------------------------------------------------------------

export type MembershipStatus = 'active' | 'invited' | 'suspended' | 'revoked'

export interface OrganizationMembership {
  id: string
  tenantId: string
  userId: string
  displayName: string
  email: string
  role: OrganizationRole
  status: MembershipStatus
  invitedBy?: string
  joinedAt: string
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'

export interface OrganizationInvitation {
  id: string
  tenantId: string
  invitedEmail: string
  role: Exclude<OrganizationRole, 'owner'>
  tokenHash: string
  /** Plaintext token shown once upon creation; never persisted to database */
  oneTimeTokenPreview?: string
  status: InvitationStatus
  invitedBy: string
  expiresAt: string
  createdAt: string
  acceptedAt?: string
}

// ---------------------------------------------------------------------------
// 4. Dual Resource Ownership (Individual + Organization)
// ---------------------------------------------------------------------------

export type OwnableResourceType =
  | 'venue'
  | 'academy'
  | 'coach_profile'
  | 'opportunity'
  | 'tournament'
  | 'event'
  | 'pickup_game'
  | 'athlete_program'
  | 'research_paper'
  | 'editorial_article'
  | 'document'

export type OwnershipType = 'individual' | 'organization'

export interface ResourceOwnershipRecord {
  id: string
  resourceType: OwnableResourceType
  resourceId: string
  resourceTitle: string
  ownershipType: OwnershipType
  ownerUserId?: string | null
  ownerTenantId?: string | null
  assignedUnitId?: string | null
  verificationStatus: 'unverified' | 'pending_review' | 'verified'
  isFreePublicListing: boolean
  updatedAt: string
}

// ---------------------------------------------------------------------------
// 5. Canonical Subscriptions, Centralized Entitlements & Usage Metering
// ---------------------------------------------------------------------------

export type PlanCode =
  | 'individual_free'
  | 'individual_pro'
  | 'org_free'
  | 'org_growth'
  | 'org_enterprise'

export type SubscriptionStatus =
  | 'free_active'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'cancelled'
  | 'expired'
  | 'suspended'

export interface SaaSPlanDefinition {
  code: PlanCode
  name: string
  audience: 'individual' | 'organization' | 'enterprise'
  monthlyPriceInr: number
  billingEnabled: false // Payment collection strictly disabled
  listingPublicationAlwaysFree: true
  summary: string
  entitlements: Record<EntitlementFeatureKey, { enabled: boolean; limit: number | null; freeCommunity?: boolean }>
}

export interface SubscriptionRecord {
  id: string
  subjectType: 'user' | 'tenant'
  subjectId: string
  planCode: PlanCode
  status: SubscriptionStatus
  billingCycle: 'none' | 'monthly' | 'annual' | 'custom'
  paymentCollectionEnabled: false
  currentPeriodStart: string
  currentPeriodEnd?: string | null
  trialEndsAt?: string | null
  graceEndsAt?: string | null
}

export type EntitlementFeatureKey =
  | 'listings.free_submission'
  | 'verification.independent_review'
  | 'org.multi_member'
  | 'org.advanced_roles'
  | 'org.branches'
  | 'org.advanced_analytics'
  | 'venues.multi_location'
  | 'academy.student_management'
  | 'events.registrations'
  | 'editorial.collaboration'
  | 'platform.data_exports'
  | 'platform.api_access'

export interface EntitlementOverrideRecord {
  id: string
  subjectType: 'user' | 'tenant'
  subjectId: string
  featureKey: EntitlementFeatureKey
  isEnabled: boolean
  overrideLimit?: number | null
  reason: string
  grantedBy: string
  expiresAt?: string | null
  revokedAt?: string | null
  createdAt: string
}

export interface EntitlementEvaluationResult {
  allowed: boolean
  featureKey: EntitlementFeatureKey
  source:
    | 'free_community_guarantee'
    | 'tenant_suspended'
    | 'admin_override'
    | 'plan'
    | 'subscription_fallback_free'
    | 'quota_hard_limit'
    | 'default_deny'
  planCode: PlanCode
  limit: number | null
  currentUsage?: number
  remaining?: number | null
  softLimitReached?: boolean
  hardLimitReached?: boolean
  reason: string
}

export type UsageMeterKey =
  | 'org.members'
  | 'org.branches'
  | 'venues.managed'
  | 'events.published_monthly'
  | 'exports.monthly'
  | 'storage.mb'

export interface UsageMeterStatus {
  meterKey: UsageMeterKey
  displayName: string
  windowType: 'current_total' | 'monthly' | 'daily'
  currentValue: number
  limit: number | null
  utilizationPercent: number
  softLimitRatio: number
  softLimitReached: boolean
  hardLimitReached: boolean
  hardLimitEnforced: boolean
}

// ---------------------------------------------------------------------------
// 6. Immutable Audit Log & Platform-Wide Adoption Matrix
// ---------------------------------------------------------------------------

export interface SaaSAuditEvent {
  id: string
  tenantId: string | null
  actorUserId: string
  actorLabel: string
  action: string
  resourceType: string
  resourceId?: string
  details: Record<string, unknown>
  createdAt: string
}

export interface ModuleAdoptionEntry {
  id: string
  moduleName: string
  route: string
  ownershipMode: 'Public Read-Only' | 'Individual Only' | 'Dual (Individual + Org)' | 'Organization Scoped' | 'Platform Control Plane'
  tenantRelationship: string
  rbacRequired: string
  entitlementRelevance: 'Always Free / Community' | 'Optional Premium Enhancements' | 'Platform Internal Only'
  meteringRelevance: string
  integrationPriority: 'Now (Phase 2)' | 'Next (Phase 3)' | 'Not Needed (Keep Public)'
}
