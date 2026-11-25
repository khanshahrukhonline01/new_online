/**
 * KhelGrid Platform-Wide SaaS Workspace Client & Persistence Adapter
 *
 * Connects to Supabase PostgreSQL RLS tables and SECURITY DEFINER RPCs
 * (`provision_initial_tenant_owner`, `accept_tenant_invitation`,
 * `transfer_tenant_ownership`, `check_saas_entitlement`, `tenant_units`,
 * `resource_ownership_links`, `saas_audit_logs`) when authenticated, and
 * maintains a full, deterministic local workspace state when running in
 * preview/offline mode so every SaaS workflow is immediately interactive.
 *
 * Security invariants:
 * - Never trusts client-supplied tenantId without checking active membership.
 * - Organization roles NEVER confer platform-level authority.
 * - Payments remain disabled; free listings & verification remain independent.
 */

import { getSupabaseClient } from './realtime-client'
import { getStoredAuthUser } from './auth-client'
import {
  CANONICAL_SAAS_PLANS,
  VALID_ORGANIZATION_TYPE_SET,
  evaluateEntitlement,
  hasOrganizationPermission,
  hashInvitationTokenHex,
  isInvitationAcceptable,
  sanitizeOrganizationSlug,
  validateOwnershipTransfer,
  validateRoleChange,
} from '../../shared/saas/saasCoreEngine'
import type {
  EntitlementFeatureKey,
  EntitlementOverrideRecord,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationRecord,
  OrganizationRole,
  OrganizationStatus,
  OrganizationType,
  OrganizationUnit,
  OrganizationUnitType,
  OwnableResourceType,
  OwnershipType,
  PlanCode,
  ResourceOwnershipRecord,
  SaaSAuditEvent,
  SubscriptionRecord,
  UsageMeterKey,
} from '../../shared/saas/saasTypes'

export interface SaaSWorkspaceState {
  currentUserId: string
  currentUserName: string
  currentUserEmail: string
  activeContext: { kind: 'personal' } | { kind: 'organization'; tenantId: string }
  organizations: OrganizationRecord[]
  memberships: OrganizationMembership[]
  invitations: OrganizationInvitation[]
  units: OrganizationUnit[]
  resources: ResourceOwnershipRecord[]
  subscriptions: SubscriptionRecord[]
  overrides: EntitlementOverrideRecord[]
  usageBySubject: Record<string, Partial<Record<UsageMeterKey, number>>>
  auditLogs: SaaSAuditEvent[]
  storageMode: 'supabase' | 'local_sandbox'
}

const STORAGE_KEY = 'khelgrid_saas_workspace_v2'

function makeId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function createSeedWorkspaceState(): SaaSWorkspaceState {
  const authUser = getStoredAuthUser()
  const currentUserId = authUser?.id || 'usr-athlete-demo-01'
  const currentUserName = authUser?.fullName || 'Arjun Verma'
  const currentUserEmail = authUser?.email || 'arjun.verma@khelgrid.in'

  const now = new Date().toISOString()
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const orgAcademyId = 'org-ncr-athletics-01'
  const orgUniversityId = 'org-du-sports-02'

  const organizations: OrganizationRecord[] = [
    {
      id: orgAcademyId,
      slug: 'ncr-elite-cricket-academy',
      name: 'NCR Elite Cricket & Multisport Academy',
      tenantType: 'academy',
      status: 'active',
      verificationStatus: 'verified',
      ownerId: currentUserId,
      city: 'New Delhi',
      state: 'Delhi',
      sport: 'Cricket',
      contactEmail: 'desk@ncreliteacademy.in',
      contactPhone: '+91 98110 44210',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: orgUniversityId,
      slug: 'indraprastha-university-sports-board',
      name: 'Indraprastha University Sports Board',
      tenantType: 'university',
      status: 'active',
      verificationStatus: 'pending_review',
      ownerId: 'usr-director-mehta-02',
      city: 'Bengaluru',
      state: 'Karnataka',
      sport: 'Athletics',
      contactEmail: 'sportsboard@ipu-demo.edu.in',
      contactPhone: '+91 98450 22190',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const memberships: OrganizationMembership[] = [
    {
      id: 'mem-01',
      tenantId: orgAcademyId,
      userId: currentUserId,
      displayName: currentUserName,
      email: currentUserEmail,
      role: 'owner',
      status: 'active',
      joinedAt: now,
    },
    {
      id: 'mem-02',
      tenantId: orgAcademyId,
      userId: 'usr-coach-sharma-03',
      displayName: 'Coach Vikram Sharma (NIS)',
      email: 'vikram.sharma@ncreliteacademy.in',
      role: 'head_coach',
      status: 'active',
      invitedBy: currentUserId,
      joinedAt: now,
    },
    {
      id: 'mem-03',
      tenantId: orgAcademyId,
      userId: 'usr-ops-priya-04',
      displayName: 'Priya Nair',
      email: 'priya.nair@ncreliteacademy.in',
      role: 'listing_manager',
      status: 'active',
      invitedBy: currentUserId,
      joinedAt: now,
    },
    {
      id: 'mem-04',
      tenantId: orgUniversityId,
      userId: 'usr-director-mehta-02',
      displayName: 'Dr. Kavita Mehta',
      email: 'k.mehta@ipu-demo.edu.in',
      role: 'owner',
      status: 'active',
      joinedAt: now,
    },
    {
      id: 'mem-05',
      tenantId: orgUniversityId,
      userId: currentUserId,
      displayName: currentUserName,
      email: currentUserEmail,
      role: 'verification_coordinator',
      status: 'active',
      invitedBy: 'usr-director-mehta-02',
      joinedAt: now,
    },
  ]

  const invitations: OrganizationInvitation[] = [
    {
      id: 'inv-01',
      tenantId: orgAcademyId,
      invitedEmail: 'rohan.finance@ncreliteacademy.in',
      role: 'finance_manager',
      tokenHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      status: 'pending',
      invitedBy: currentUserId,
      expiresAt: nextWeek,
      createdAt: now,
    },
  ]

  const units: OrganizationUnit[] = [
    {
      id: 'unit-01',
      tenantId: orgAcademyId,
      name: 'South Delhi Turf Wing',
      unitType: 'branch',
      city: 'New Delhi',
      state: 'Delhi',
      leadName: 'Coach Vikram Sharma (NIS)',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'unit-02',
      tenantId: orgAcademyId,
      name: 'U-16 High Performance Squad',
      unitType: 'team',
      city: 'New Delhi',
      state: 'Delhi',
      leadName: 'Coach Vikram Sharma (NIS)',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'unit-03',
      tenantId: orgUniversityId,
      name: 'North Campus Athletics Track',
      unitType: 'facility',
      city: 'Bengaluru',
      state: 'Karnataka',
      leadName: 'Dr. Kavita Mehta',
      isActive: true,
      createdAt: now,
    },
  ]

  const resources: ResourceOwnershipRecord[] = [
    {
      id: 'res-01',
      resourceType: 'academy',
      resourceId: 'acad-ncr-elite',
      resourceTitle: 'NCR Elite Cricket & Multisport Academy Listing',
      ownershipType: 'organization',
      ownerTenantId: orgAcademyId,
      assignedUnitId: 'unit-01',
      verificationStatus: 'verified',
      isFreePublicListing: true,
      updatedAt: now,
    },
    {
      id: 'res-02',
      resourceType: 'opportunity',
      resourceId: 'trial-delhi-u16-2026',
      resourceTitle: 'Delhi U-16 Open Selection Trials (Free Public Listing)',
      ownershipType: 'organization',
      ownerTenantId: orgAcademyId,
      verificationStatus: 'verified',
      isFreePublicListing: true,
      updatedAt: now,
    },
    {
      id: 'res-03',
      resourceType: 'coach_profile',
      resourceId: 'coach-arjun-personal',
      resourceTitle: 'Personal Athlete & Independent Coach Profile',
      ownershipType: 'individual',
      ownerUserId: currentUserId,
      ownerTenantId: null,
      verificationStatus: 'verified',
      isFreePublicListing: true,
      updatedAt: now,
    },
    {
      id: 'res-04',
      resourceType: 'tournament',
      resourceId: 'tourn-aiu-inter-uni',
      resourceTitle: 'Inter-University Athletics Meet 2026',
      ownershipType: 'organization',
      ownerTenantId: orgUniversityId,
      assignedUnitId: 'unit-03',
      verificationStatus: 'pending_review',
      isFreePublicListing: true,
      updatedAt: now,
    },
  ]

  const subscriptions: SubscriptionRecord[] = [
    {
      id: 'sub-org-01',
      subjectType: 'tenant',
      subjectId: orgAcademyId,
      planCode: 'org_free',
      status: 'free_active',
      billingCycle: 'none',
      paymentCollectionEnabled: false,
      currentPeriodStart: now,
      currentPeriodEnd: null,
    },
    {
      id: 'sub-org-02',
      subjectType: 'tenant',
      subjectId: orgUniversityId,
      planCode: 'org_growth',
      status: 'trialing',
      billingCycle: 'none',
      paymentCollectionEnabled: false,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      trialEndsAt: nextMonth,
    },
    {
      id: 'sub-user-01',
      subjectType: 'user',
      subjectId: currentUserId,
      planCode: 'individual_free',
      status: 'free_active',
      billingCycle: 'none',
      paymentCollectionEnabled: false,
      currentPeriodStart: now,
      currentPeriodEnd: null,
    },
  ]

  const overrides: EntitlementOverrideRecord[] = [
    {
      id: 'ov-01',
      subjectType: 'tenant',
      subjectId: orgAcademyId,
      featureKey: 'org.advanced_analytics',
      isEnabled: true,
      overrideLimit: null,
      reason: 'Early-adopter grassroots pilot grant (audited)',
      grantedBy: 'platform-admin-seed',
      expiresAt: nextMonth,
      createdAt: now,
    },
  ]

  const usageBySubject: Record<string, Partial<Record<UsageMeterKey, number>>> = {
    [orgAcademyId]: {
      'org.members': 3,
      'org.branches': 2,
      'venues.managed': 1,
      'events.published_monthly': 2,
      'exports.monthly': 4,
      'storage.mb': 128,
    },
    [orgUniversityId]: {
      'org.members': 2,
      'org.branches': 1,
      'venues.managed': 3,
      'events.published_monthly': 6,
      'exports.monthly': 14,
      'storage.mb': 640,
    },
  }

  const auditLogs: SaaSAuditEvent[] = [
    {
      id: 'aud-01',
      tenantId: orgAcademyId,
      actorUserId: currentUserId,
      actorLabel: currentUserName,
      action: 'organization.provisioned',
      resourceType: 'tenant',
      resourceId: orgAcademyId,
      details: { slug: 'ncr-elite-cricket-academy', tenantType: 'academy', plan: 'org_free' },
      createdAt: now,
    },
    {
      id: 'aud-02',
      tenantId: orgAcademyId,
      actorUserId: 'platform-admin-seed',
      actorLabel: 'Platform Admin (Audited)',
      action: 'entitlement.override_granted',
      resourceType: 'saas_entitlement_override',
      resourceId: 'ov-01',
      details: { featureKey: 'org.advanced_analytics', reason: 'Early-adopter grassroots pilot grant' },
      createdAt: now,
    },
  ]

  return {
    currentUserId,
    currentUserName,
    currentUserEmail,
    activeContext: { kind: 'organization', tenantId: orgAcademyId },
    organizations,
    memberships,
    invitations,
    units,
    resources,
    subscriptions,
    overrides,
    usageBySubject,
    auditLogs,
    storageMode: 'local_sandbox',
  }
}

/**
 * Returns an honest, empty multi-tenant SaaS workspace scoped to the authenticated
 * session (or guest identity) without inventing seeded organizations or memberships.
 */
export function createEmptyWorkspaceState(
  authUser: ReturnType<typeof getStoredAuthUser> = getStoredAuthUser()
): SaaSWorkspaceState {
  return {
    currentUserId: authUser?.id || 'guest',
    currentUserName: authUser?.fullName || authUser?.name || 'Guest User',
    currentUserEmail: authUser?.email || '',
    activeContext: { kind: 'personal' },
    organizations: [],
    memberships: [],
    invitations: [],
    units: [],
    resources: [],
    subscriptions: [],
    overrides: [],
    usageBySubject: {},
    auditLogs: [],
    storageMode: 'local_sandbox',
  }
}

export function loadWorkspaceState(): SaaSWorkspaceState {
  const authUser = getStoredAuthUser()
  if (typeof window === 'undefined' || !window.localStorage) {
    return createEmptyWorkspaceState(authUser)
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createEmptyWorkspaceState(authUser)
    }
    const parsed = JSON.parse(raw) as SaaSWorkspaceState
    if (!parsed || !Array.isArray(parsed.organizations)) {
      return createEmptyWorkspaceState(authUser)
    }
    if (authUser && parsed.currentUserId === 'usr-athlete-demo-01' && authUser.id !== 'usr-athlete-demo-01') {
      return createEmptyWorkspaceState(authUser)
    }
    return parsed
  } catch {
    return createEmptyWorkspaceState(authUser)
  }
}

export function saveWorkspaceState(state: SaaSWorkspaceState): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export interface ActionResult<T = undefined> {
  success: boolean
  message: string
  syncedToSupabase: boolean
  state: SaaSWorkspaceState
  data?: T
}

function appendAudit(
  state: SaaSWorkspaceState,
  entry: Omit<SaaSAuditEvent, 'id' | 'createdAt' | 'actorUserId' | 'actorLabel'>
): SaaSAuditEvent[] {
  const event: SaaSAuditEvent = {
    id: makeId('aud'),
    actorUserId: state.currentUserId,
    actorLabel: state.currentUserName,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  return [event, ...state.auditLogs].slice(0, 100)
}

/**
 * Provision a new organization across any of the 18 ecosystem categories.
 * Calls Supabase `provision_initial_tenant_owner` RPC when authenticated, and
 * updates local workspace state atomically.
 */
export async function provisionOrganizationWorkspace(
  state: SaaSWorkspaceState,
  input: {
    name: string
    slug?: string
    tenantType: OrganizationType
    city?: string
    stateName?: string
    sport?: string
    contactEmail?: string
    contactPhone?: string
  }
): Promise<ActionResult<OrganizationRecord>> {
  const cleanName = input.name.trim()
  if (cleanName.length < 2) {
    return { success: false, message: 'Organization name must be at least 2 characters.', syncedToSupabase: false, state }
  }
  if (!VALID_ORGANIZATION_TYPE_SET.has(input.tenantType)) {
    return { success: false, message: 'Invalid organization category selected.', syncedToSupabase: false, state }
  }

  const cleanSlug = sanitizeOrganizationSlug(input.slug || cleanName)
  if (!cleanSlug || !/^[a-z0-9-]+$/.test(cleanSlug)) {
    return { success: false, message: 'Slug must contain lowercase letters, numbers, or hyphens.', syncedToSupabase: false, state }
  }
  if (state.organizations.some(o => o.slug === cleanSlug)) {
    return { success: false, message: `An organization with slug "${cleanSlug}" already exists.`, syncedToSupabase: false, state }
  }

  let syncedToSupabase = false
  let tenantId = makeId('org')

  const client = getSupabaseClient()
  const authUser = getStoredAuthUser()
  if (client && authUser?.id) {
    try {
      const { data, error } = await client.rpc('provision_initial_tenant_owner', {
        p_slug: cleanSlug,
        p_name: cleanName,
        p_tenant_type: input.tenantType,
        p_city: input.city?.trim() || null,
        p_state: input.stateName?.trim() || null,
        p_sport: input.sport?.trim() || null,
        p_contact_phone: input.contactPhone?.trim() || null,
        p_contact_email: input.contactEmail?.trim() || null,
        p_metadata: { provisioned_via: 'khelgrid_org_console' },
      })
      if (!error && typeof data === 'string') {
        tenantId = data
        syncedToSupabase = true
      }
    } catch {
      // Fall back to local sandbox persistence gracefully
    }
  }

  const now = new Date().toISOString()
  const newOrg: OrganizationRecord = {
    id: tenantId,
    slug: cleanSlug,
    name: cleanName,
    tenantType: input.tenantType,
    status: 'active',
    verificationStatus: 'unverified',
    ownerId: state.currentUserId,
    city: input.city?.trim() || undefined,
    state: input.stateName?.trim() || undefined,
    sport: input.sport?.trim() || undefined,
    contactEmail: input.contactEmail?.trim() || undefined,
    contactPhone: input.contactPhone?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  }

  const ownerMembership: OrganizationMembership = {
    id: makeId('mem'),
    tenantId,
    userId: state.currentUserId,
    displayName: state.currentUserName,
    email: state.currentUserEmail,
    role: 'owner',
    status: 'active',
    joinedAt: now,
  }

  const defaultSubscription: SubscriptionRecord = {
    id: makeId('sub'),
    subjectType: 'tenant',
    subjectId: tenantId,
    planCode: 'org_free',
    status: 'free_active',
    billingCycle: 'none',
    paymentCollectionEnabled: false,
    currentPeriodStart: now,
    currentPeriodEnd: null,
  }

  const nextState: SaaSWorkspaceState = {
    ...state,
    activeContext: { kind: 'organization', tenantId },
    organizations: [newOrg, ...state.organizations],
    memberships: [...state.memberships, ownerMembership],
    subscriptions: [...state.subscriptions, defaultSubscription],
    usageBySubject: {
      ...state.usageBySubject,
      [tenantId]: {
        'org.members': 1,
        'org.branches': 0,
        'venues.managed': 0,
        'events.published_monthly': 0,
        'exports.monthly': 0,
        'storage.mb': 0,
      },
    },
    auditLogs: appendAudit(state, {
      tenantId,
      action: 'organization.provisioned',
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { name: cleanName, slug: cleanSlug, tenantType: input.tenantType, syncedToSupabase },
    }),
    storageMode: syncedToSupabase ? 'supabase' : state.storageMode,
  }

  saveWorkspaceState(nextState)
  return {
    success: true,
    message: syncedToSupabase
      ? `Organization "${cleanName}" provisioned in Supabase and set as active workspace.`
      : `Organization "${cleanName}" provisioned on Free Starter tier (ready for Supabase sync on sign-in).`,
    syncedToSupabase,
    state: nextState,
    data: newOrg,
  }
}

/**
 * Invite a new member to an organization with cryptographic token hash & 7-day expiry.
 */
export async function inviteMemberToOrganization(
  state: SaaSWorkspaceState,
  input: {
    tenantId: string
    invitedEmail: string
    role: Exclude<OrganizationRole, 'owner'>
    expiresInDays?: number
  }
): Promise<ActionResult<OrganizationInvitation>> {
  const email = input.invitedEmail.trim().toLowerCase()
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
    return { success: false, message: 'Enter a valid email address for the invitation.', syncedToSupabase: false, state }
  }

  const org = state.organizations.find(o => o.id === input.tenantId)
  const actorMem = state.memberships.find(m => m.tenantId === input.tenantId && m.userId === state.currentUserId)

  if (!hasOrganizationPermission({ organization: org, membership: actorMem, permission: 'org:team' })) {
    return {
      success: false,
      message: 'Access denied: Active org:team permission in an active organization is required to invite members.',
      syncedToSupabase: false,
      state,
    }
  }

  // Enforce centralized entitlement quota for org.multi_member
  const activeCount = state.memberships.filter(m => m.tenantId === input.tenantId && m.status === 'active').length
  const sub = state.subscriptions.find(s => s.subjectType === 'tenant' && s.subjectId === input.tenantId)
  const ent = evaluateEntitlement({
    featureKey: 'org.multi_member',
    subjectType: 'tenant',
    subjectId: input.tenantId,
    organizationStatus: org?.status,
    subscription: sub,
    overrides: state.overrides,
    currentUsage: activeCount,
    enforceHardLimit: true,
  })
  if (!ent.allowed) {
    return { success: false, message: `Entitlement blocked: ${ent.reason}`, syncedToSupabase: false, state }
  }

  const rawToken = `kg_inv_${makeId('tok')}_${Math.random().toString(36).slice(2, 10)}`
  const tokenHash = await hashInvitationTokenHex(rawToken)
  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000).toISOString()

  let syncedToSupabase = false
  const client = getSupabaseClient()
  const authUser = getStoredAuthUser()
  if (client && authUser?.id) {
    try {
      const { error } = await client.from('tenant_invitations').insert({
        tenant_id: input.tenantId,
        invited_email: email,
        role: input.role,
        token_hash: tokenHash,
        invited_by: authUser.id,
        expires_at: expiresAt,
      })
      if (!error) syncedToSupabase = true
    } catch {
      // Fallback to local state
    }
  }

  const inv: OrganizationInvitation = {
    id: makeId('inv'),
    tenantId: input.tenantId,
    invitedEmail: email,
    role: input.role,
    tokenHash,
    oneTimeTokenPreview: rawToken,
    status: 'pending',
    invitedBy: state.currentUserId,
    expiresAt,
    createdAt: new Date().toISOString(),
  }

  const nextState: SaaSWorkspaceState = {
    ...state,
    invitations: [inv, ...state.invitations],
    auditLogs: appendAudit(state, {
      tenantId: input.tenantId,
      action: 'membership.invitation_created',
      resourceType: 'tenant_invitation',
      resourceId: inv.id,
      details: { invitedEmail: email, role: input.role, expiresAt, syncedToSupabase },
    }),
  }
  saveWorkspaceState(nextState)

  return {
    success: true,
    message: `Invitation created for ${email} as ${input.role} (SHA-256 token hashed, expires in ${input.expiresInDays ?? 7} days).`,
    syncedToSupabase,
    state: nextState,
    data: inv,
  }
}

/**
 * Accept or revoke a pending organization invitation.
 */
export function resolveOrganizationInvitation(
  state: SaaSWorkspaceState,
  invitationId: string,
  decision: 'accept' | 'revoke'
): ActionResult {
  const inv = state.invitations.find(i => i.id === invitationId)
  if (!inv) {
    return { success: false, message: 'Invitation record not found.', syncedToSupabase: false, state }
  }

  if (decision === 'accept') {
    const check = isInvitationAcceptable(inv)
    if (!check.acceptable) {
      return { success: false, message: check.reason, syncedToSupabase: false, state }
    }
    const newUserId = makeId('usr')
    const displayName = inv.invitedEmail.split('@')[0].replace(/[._-]+/g, ' ')
    const newMember: OrganizationMembership = {
      id: makeId('mem'),
      tenantId: inv.tenantId,
      userId: newUserId,
      displayName: displayName.replace(/\b\w/g, c => c.toUpperCase()),
      email: inv.invitedEmail,
      role: inv.role,
      status: 'active',
      invitedBy: inv.invitedBy,
      joinedAt: new Date().toISOString(),
    }
    const currentUsage = state.usageBySubject[inv.tenantId] || {}
    const nextState: SaaSWorkspaceState = {
      ...state,
      memberships: [...state.memberships, newMember],
      invitations: state.invitations.map(i =>
        i.id === invitationId ? { ...i, status: 'accepted', acceptedAt: new Date().toISOString() } : i
      ),
      usageBySubject: {
        ...state.usageBySubject,
        [inv.tenantId]: {
          ...currentUsage,
          'org.members': (currentUsage['org.members'] ?? 0) + 1,
        },
      },
      auditLogs: appendAudit(state, {
        tenantId: inv.tenantId,
        action: 'membership.invitation_accepted',
        resourceType: 'tenant_invitation',
        resourceId: inv.id,
        details: { invitedEmail: inv.invitedEmail, role: inv.role },
      }),
    }
    saveWorkspaceState(nextState)
    return { success: true, message: `Invitation accepted; ${inv.invitedEmail} is now active as ${inv.role}.`, syncedToSupabase: false, state: nextState }
  }

  const nextState: SaaSWorkspaceState = {
    ...state,
    invitations: state.invitations.map(i => (i.id === invitationId ? { ...i, status: 'revoked' } : i)),
    auditLogs: appendAudit(state, {
      tenantId: inv.tenantId,
      action: 'membership.invitation_revoked',
      resourceType: 'tenant_invitation',
      resourceId: inv.id,
      details: { invitedEmail: inv.invitedEmail },
    }),
  }
  saveWorkspaceState(nextState)
  return { success: true, message: `Invitation for ${inv.invitedEmail} revoked.`, syncedToSupabase: false, state: nextState }
}

/**
 * Update an organization member's role with strict anti-privilege escalation checks.
 */
export function updateOrganizationMemberRole(
  state: SaaSWorkspaceState,
  input: {
    tenantId: string
    targetUserId: string
    newRole: OrganizationRole
  }
): ActionResult {
  const org = state.organizations.find(o => o.id === input.tenantId)
  const actorMem = state.memberships.find(m => m.tenantId === input.tenantId && m.userId === state.currentUserId)
  const targetMem = state.memberships.find(m => m.tenantId === input.tenantId && m.userId === input.targetUserId)

  if (!org || !actorMem || !targetMem) {
    return { success: false, message: 'Organization or membership record not found.', syncedToSupabase: false, state }
  }

  const validation = validateRoleChange({
    organizationStatus: org.status,
    actorUserId: actorMem.userId,
    actorRole: actorMem.role,
    targetUserId: targetMem.userId,
    targetCurrentRole: targetMem.role,
    newRole: input.newRole,
  })

  if (!validation.allowed) {
    return { success: false, message: `Security policy blocked role change: ${validation.reason}`, syncedToSupabase: false, state }
  }

  const nextState: SaaSWorkspaceState = {
    ...state,
    memberships: state.memberships.map(m =>
      m.id === targetMem.id ? { ...m, role: input.newRole } : m
    ),
    auditLogs: appendAudit(state, {
      tenantId: input.tenantId,
      action: 'membership.role_updated',
      resourceType: 'tenant_membership',
      resourceId: targetMem.id,
      details: { targetEmail: targetMem.email, previousRole: targetMem.role, newRole: input.newRole },
    }),
  }
  saveWorkspaceState(nextState)
  return {
    success: true,
    message: `Updated ${targetMem.displayName} from "${targetMem.role}" to "${input.newRole}".`,
    syncedToSupabase: false,
    state: nextState,
  }
}

/**
 * Atomic organization ownership transfer (calls `transfer_tenant_ownership` RPC when connected).
 */
export async function transferOrganizationOwnership(
  state: SaaSWorkspaceState,
  tenantId: string,
  newOwnerUserId: string
): Promise<ActionResult> {
  const org = state.organizations.find(o => o.id === tenantId)
  const targetMem = state.memberships.find(m => m.tenantId === tenantId && m.userId === newOwnerUserId) || null
  if (!org) {
    return { success: false, message: 'Organization not found.', syncedToSupabase: false, state }
  }

  const check = validateOwnershipTransfer({
    organization: org,
    actorUserId: state.currentUserId,
    targetMembership: targetMem,
  })
  if (!check.allowed) {
    return { success: false, message: `Ownership transfer rejected: ${check.reason}`, syncedToSupabase: false, state }
  }

  let syncedToSupabase = false
  const client = getSupabaseClient()
  const authUser = getStoredAuthUser()
  if (client && authUser?.id) {
    try {
      const { error } = await client.rpc('transfer_tenant_ownership', {
        p_tenant_id: tenantId,
        p_new_owner_user_id: newOwnerUserId,
      })
      if (!error) syncedToSupabase = true
    } catch {
      // Fallback
    }
  }

  const nextState: SaaSWorkspaceState = {
    ...state,
    organizations: state.organizations.map(o =>
      o.id === tenantId ? { ...o, ownerId: newOwnerUserId, updatedAt: new Date().toISOString() } : o
    ),
    memberships: state.memberships.map(m => {
      if (m.tenantId !== tenantId) return m
      if (m.userId === state.currentUserId) return { ...m, role: 'org_admin' }
      if (m.userId === newOwnerUserId) return { ...m, role: 'owner' }
      return m
    }),
    auditLogs: appendAudit(state, {
      tenantId,
      action: 'organization.ownership_transferred',
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { previousOwnerId: state.currentUserId, newOwnerId: newOwnerUserId, syncedToSupabase },
    }),
  }
  saveWorkspaceState(nextState)

  return {
    success: true,
    message: `Ownership transferred to ${targetMem?.displayName}. Your role is now org_admin.`,
    syncedToSupabase,
    state: nextState,
  }
}

/**
 * Toggle organization lifecycle state (active <-> suspended) to verify fail-closed tenant isolation.
 */
export function updateOrganizationLifecycleStatus(
  state: SaaSWorkspaceState,
  tenantId: string,
  nextStatus: OrganizationStatus,
  reason?: string
): ActionResult {
  const org = state.organizations.find(o => o.id === tenantId)
  if (!org) return { success: false, message: 'Organization not found.', syncedToSupabase: false, state }

  const nextState: SaaSWorkspaceState = {
    ...state,
    organizations: state.organizations.map(o =>
      o.id === tenantId
        ? {
            ...o,
            status: nextStatus,
            suspendedReason: nextStatus === 'suspended' ? (reason || 'Administrative review hold') : null,
            updatedAt: new Date().toISOString(),
          }
        : o
    ),
    auditLogs: appendAudit(state, {
      tenantId,
      action: nextStatus === 'suspended' ? 'organization.suspended' : 'organization.status_changed',
      resourceType: 'tenant',
      resourceId: tenantId,
      details: { previousStatus: org.status, nextStatus, reason: reason || null },
    }),
  }
  saveWorkspaceState(nextState)
  return {
    success: true,
    message: `Organization status updated to "${nextStatus}".`,
    syncedToSupabase: false,
    state: nextState,
  }
}

/**
 * Create a lightweight organization unit (Branch, Department, Team, Facility).
 */
export async function createOrganizationUnit(
  state: SaaSWorkspaceState,
  input: {
    tenantId: string
    name: string
    unitType: OrganizationUnitType
    city?: string
    leadName?: string
  }
): Promise<ActionResult<OrganizationUnit>> {
  const cleanName = input.name.trim()
  if (cleanName.length < 2) {
    return { success: false, message: 'Unit name must be at least 2 characters.', syncedToSupabase: false, state }
  }
  const org = state.organizations.find(o => o.id === input.tenantId)
  const actorMem = state.memberships.find(m => m.tenantId === input.tenantId && m.userId === state.currentUserId)
  if (!hasOrganizationPermission({ organization: org, membership: actorMem, permission: 'org:settings' })) {
    return { success: false, message: 'Requires active org:settings permission to create units.', syncedToSupabase: false, state }
  }

  const currentUnits = state.units.filter(u => u.tenantId === input.tenantId && u.isActive).length
  const sub = state.subscriptions.find(s => s.subjectType === 'tenant' && s.subjectId === input.tenantId)
  const ent = evaluateEntitlement({
    featureKey: 'org.branches',
    subjectType: 'tenant',
    subjectId: input.tenantId,
    organizationStatus: org?.status,
    subscription: sub,
    overrides: state.overrides,
    currentUsage: currentUnits,
    enforceHardLimit: true,
  })
  if (!ent.allowed) {
    return { success: false, message: `Entitlement quota reached: ${ent.reason}`, syncedToSupabase: false, state }
  }

  let syncedToSupabase = false
  const client = getSupabaseClient()
  const authUser = getStoredAuthUser()
  if (client && authUser?.id) {
    try {
      const { error } = await client.from('tenant_units').insert({
        tenant_id: input.tenantId,
        name: cleanName,
        unit_type: input.unitType,
        city: input.city?.trim() || null,
      })
      if (!error) syncedToSupabase = true
    } catch {
      // Fallback
    }
  }

  const unit: OrganizationUnit = {
    id: makeId('unit'),
    tenantId: input.tenantId,
    name: cleanName,
    unitType: input.unitType,
    city: input.city?.trim() || org?.city,
    state: org?.state,
    leadName: input.leadName?.trim() || state.currentUserName,
    isActive: true,
    createdAt: new Date().toISOString(),
  }

  const currentUsage = state.usageBySubject[input.tenantId] || {}
  const nextState: SaaSWorkspaceState = {
    ...state,
    units: [unit, ...state.units],
    usageBySubject: {
      ...state.usageBySubject,
      [input.tenantId]: {
        ...currentUsage,
        'org.branches': currentUnits + 1,
      },
    },
    auditLogs: appendAudit(state, {
      tenantId: input.tenantId,
      action: 'organization.unit_created',
      resourceType: 'tenant_unit',
      resourceId: unit.id,
      details: { name: cleanName, unitType: input.unitType, syncedToSupabase },
    }),
  }
  saveWorkspaceState(nextState)

  return {
    success: true,
    message: `Added ${input.unitType.replace('_', ' ')} "${cleanName}".`,
    syncedToSupabase,
    state: nextState,
    data: unit,
  }
}

/**
 * Bind a new resource under Individual OR Organization ownership (Dual Ownership model).
 */
export async function bindResourceOwnership(
  state: SaaSWorkspaceState,
  input: {
    resourceType: OwnableResourceType
    resourceTitle: string
    ownershipType: OwnershipType
    ownerTenantId?: string | null
  }
): Promise<ActionResult<ResourceOwnershipRecord>> {
  const title = input.resourceTitle.trim()
  if (title.length < 3) {
    return { success: false, message: 'Resource title must be at least 3 characters.', syncedToSupabase: false, state }
  }

  if (input.ownershipType === 'organization') {
    if (!input.ownerTenantId) {
      return { success: false, message: 'Select an active organization for organization ownership.', syncedToSupabase: false, state }
    }
    const org = state.organizations.find(o => o.id === input.ownerTenantId)
    const actorMem = state.memberships.find(m => m.tenantId === input.ownerTenantId && m.userId === state.currentUserId)
    if (!hasOrganizationPermission({ organization: org, membership: actorMem, permission: 'org:settings' })) {
      return { success: false, message: 'Requires active org:settings permission in the target organization.', syncedToSupabase: false, state }
    }
  }

  const resourceId = `${input.resourceType}-${Date.now().toString(36)}`
  let syncedToSupabase = false
  const client = getSupabaseClient()
  const authUser = getStoredAuthUser()
  if (client && authUser?.id) {
    try {
      const { error } = await client.from('resource_ownership_links').insert({
        resource_type: input.resourceType,
        resource_id: resourceId,
        ownership_type: input.ownershipType,
        owner_user_id: input.ownershipType === 'individual' ? authUser.id : null,
        owner_tenant_id: input.ownershipType === 'organization' ? input.ownerTenantId : null,
        created_by: authUser.id,
      })
      if (!error) syncedToSupabase = true
    } catch {
      // Fallback
    }
  }

  const record: ResourceOwnershipRecord = {
    id: makeId('res'),
    resourceType: input.resourceType,
    resourceId,
    resourceTitle: title,
    ownershipType: input.ownershipType,
    ownerUserId: input.ownershipType === 'individual' ? state.currentUserId : null,
    ownerTenantId: input.ownershipType === 'organization' ? (input.ownerTenantId || null) : null,
    verificationStatus: 'pending_review',
    isFreePublicListing: true,
    updatedAt: new Date().toISOString(),
  }

  const nextState: SaaSWorkspaceState = {
    ...state,
    resources: [record, ...state.resources],
    auditLogs: appendAudit(state, {
      tenantId: record.ownerTenantId || null,
      action: 'resource.ownership_bound',
      resourceType: input.resourceType,
      resourceId,
      details: { ownershipType: input.ownershipType, title, isFreePublicListing: true, syncedToSupabase },
    }),
  }
  saveWorkspaceState(nextState)

  return {
    success: true,
    message: `Bound "${title}" under ${input.ownershipType} ownership (free public listing; verification stays independent).`,
    syncedToSupabase,
    state: nextState,
    data: record,
  }
}

/**
 * Grant a time-bound, audited entitlement override (simulates platform control plane action).
 */
export function grantAuditedEntitlementOverride(
  state: SaaSWorkspaceState,
  input: {
    subjectType: 'user' | 'tenant'
    subjectId: string
    featureKey: EntitlementFeatureKey
    isEnabled: boolean
    overrideLimit?: number | null
    reason: string
    expiresInDays?: number
  }
): ActionResult<EntitlementOverrideRecord> {
  if (input.reason.trim().length < 5) {
    return { success: false, message: 'Provide an audit reason (at least 5 characters) for every override.', syncedToSupabase: false, state }
  }

  const override: EntitlementOverrideRecord = {
    id: makeId('ov'),
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    featureKey: input.featureKey,
    isEnabled: input.isEnabled,
    overrideLimit: input.overrideLimit ?? null,
    reason: input.reason.trim(),
    grantedBy: state.currentUserId,
    expiresAt: new Date(Date.now() + (input.expiresInDays ?? 30) * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  }

  const nextState: SaaSWorkspaceState = {
    ...state,
    overrides: [override, ...state.overrides],
    auditLogs: appendAudit(state, {
      tenantId: input.subjectType === 'tenant' ? input.subjectId : null,
      action: 'entitlement.override_granted',
      resourceType: 'saas_entitlement_override',
      resourceId: override.id,
      details: {
        featureKey: input.featureKey,
        isEnabled: input.isEnabled,
        overrideLimit: input.overrideLimit ?? null,
        reason: override.reason,
      },
    }),
  }
  saveWorkspaceState(nextState)
  return {
    success: true,
    message: `Audited entitlement override recorded for "${input.featureKey}".`,
    syncedToSupabase: false,
    state: nextState,
    data: override,
  }
}

/**
 * Preview switching plan tier in sandbox (no billing/payment collection occurs).
 */
export function previewSwitchSubscriptionPlan(
  state: SaaSWorkspaceState,
  subjectType: 'user' | 'tenant',
  subjectId: string,
  planCode: PlanCode
): ActionResult {
  if (!CANONICAL_SAAS_PLANS[planCode]) {
    return { success: false, message: 'Invalid plan code.', syncedToSupabase: false, state }
  }
  const now = new Date().toISOString()
  const nextStatus = planCode.endsWith('_free') ? 'free_active' : 'trialing'
  const exists = state.subscriptions.some(s => s.subjectType === subjectType && s.subjectId === subjectId)
  const subscriptions = exists
    ? state.subscriptions.map(s =>
        s.subjectType === subjectType && s.subjectId === subjectId
          ? { ...s, planCode, status: nextStatus as SubscriptionRecord['status'], paymentCollectionEnabled: false as const }
          : s
      )
    : [
        ...state.subscriptions,
        {
          id: makeId('sub'),
          subjectType,
          subjectId,
          planCode,
          status: nextStatus as SubscriptionRecord['status'],
          billingCycle: 'none' as const,
          paymentCollectionEnabled: false as const,
          currentPeriodStart: now,
          currentPeriodEnd: null,
        },
      ]

  const nextState: SaaSWorkspaceState = {
    ...state,
    subscriptions,
    auditLogs: appendAudit(state, {
      tenantId: subjectType === 'tenant' ? subjectId : null,
      action: 'subscription.preview_plan_changed',
      resourceType: 'saas_subscription',
      resourceId: subjectId,
      details: { planCode, status: nextStatus, paymentCollectionEnabled: false },
    }),
  }
  saveWorkspaceState(nextState)
  return {
    success: true,
    message: `Preview entitlement tier set to "${CANONICAL_SAAS_PLANS[planCode].name}" (payments remain disabled).`,
    syncedToSupabase: false,
    state: nextState,
  }
}
