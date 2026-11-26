import {
  getStoredAuthUser,
  mapToUserProfile,
  signInWithEmail,
  signUpWithEmail,
  type AuthUserProfile,
  type UserRole,
} from '../../integrations/supabase/auth-client'
import {
  acceptTenantInvitation,
  getPendingTenantMemberships,
  provisionInitialTenantOwner,
  resolveTenantWorkspacePath,
  tryFetchUserTenantMemberships,
  getUserTenantMemberships,
  type DbTenantMembership,
} from '../../integrations/supabase/tenant-client'
import type { OrganizationType } from '../../shared/saas/saasTypes'
import { registerCustomAcademy } from '../academies/academySaaSClient'
import { registerCustomCoach } from '../coaches/coachSaaSClient'
import { saveTurfVenueSettings } from '../venues/turfSlotManager'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'

export type PartnerRole = 'academy' | 'coach' | 'venue' | 'tournament' | 'organization'

export const ORGANIZATION_SUBTYPE_OPTIONS: readonly { value: OrganizationType; label: string }[] = [
  { value: 'club', label: 'Sports Club' },
  { value: 'school', label: 'School Sports Program' },
  { value: 'college', label: 'College Athletic Department' },
  { value: 'university', label: 'University Sports Board' },
  { value: 'federation', label: 'National / State Sports Federation' },
  { value: 'association', label: 'District / State Association' },
  { value: 'corporate', label: 'Corporate Sports & Wellness' },
  { value: 'training_org', label: 'High-Performance Training Org' },
  { value: 'service_provider', label: 'Sports Tech / Service Provider' },
  { value: 'research_org', label: 'Sports Science & Research Org' },
  { value: 'media_org', label: 'Sports Media / Broadcast Org' },
  { value: 'enterprise', label: 'Enterprise Multi-Branch Group' },
  { value: 'other', label: 'Other Sports Organisation' },
]

export interface PartnerRoleDefinition {
  role: PartnerRole
  label: string
  description: string
  tenantType: OrganizationType
  authRole: UserRole
  workspacePath: string
  entityLabel: string
  entityPlaceholder: string
  directorLabel: string
  directorPlaceholder: string
  defaultContactTitle: string
  accentBg: string
  accentColor: string
}

export const PARTNER_ROLE_CONFIG: Record<PartnerRole, PartnerRoleDefinition> = {
  academy: {
    role: 'academy',
    label: 'Sports Academy',
    description: 'Admissions, student batches, attendance & direct UPI fees',
    tenantType: 'academy',
    authRole: 'academy',
    workspacePath: '/workspace/academy/overview',
    entityLabel: 'Academy / Coaching Centre Name',
    entityPlaceholder: 'e.g. Bhaichung Bhutia Football Schools',
    directorLabel: 'Director / Manager Name',
    directorPlaceholder: 'e.g. Coach Rajesh Kumar',
    defaultContactTitle: 'Academy Director',
    accentBg: 'rgba(5, 150, 105, 0.1)',
    accentColor: '#059669',
  },
  coach: {
    role: 'coach',
    label: 'Coach & Trainer',
    description: 'Private trainees, combine percentiles & NIS endorsements',
    tenantType: 'coach',
    authRole: 'coach',
    workspacePath: '/workspace/coach/overview',
    entityLabel: 'Full Coach Name',
    entityPlaceholder: 'e.g. Coach Zaheer Farooq',
    directorLabel: 'Coach Full Name',
    directorPlaceholder: 'e.g. Coach Zaheer Farooq',
    defaultContactTitle: 'Head Coach',
    accentBg: 'rgba(37, 99, 235, 0.1)',
    accentColor: '#2563eb',
  },
  venue: {
    role: 'venue',
    label: 'Turf & Venue',
    description: 'Hourly courts, floodlight peak pricing & gate check-in',
    tenantType: 'venue',
    authRole: 'venue_owner',
    workspacePath: '/workspace/turf/calendar',
    entityLabel: 'Sports Complex / Turf Arena Name',
    entityPlaceholder: 'e.g. Sree Kanteerava AstroTurf Arena',
    directorLabel: 'Facility Manager Name',
    directorPlaceholder: 'e.g. Suresh Nair',
    defaultContactTitle: 'Facility Manager',
    accentBg: 'rgba(245, 158, 11, 0.1)',
    accentColor: '#d97706',
  },
  tournament: {
    role: 'tournament',
    label: 'Tournament Ops',
    description: 'Brackets, anti-age-fraud scans & pitch-side live scoring',
    tenantType: 'tournament',
    authRole: 'host',
    workspacePath: '/workspace/tournament/overview',
    entityLabel: 'Tournament / Sports Organisation Title',
    entityPlaceholder: 'e.g. National Youth Cup 2026',
    directorLabel: 'Tournament Director Name',
    directorPlaceholder: 'e.g. Vikramaditya Sen',
    defaultContactTitle: 'Tournament Director',
    accentBg: 'rgba(147, 51, 234, 0.1)',
    accentColor: '#9333ea',
  },
  organization: {
    role: 'organization',
    label: 'Club / Federation / Org',
    description: 'Branches, governance RBAC, compliance & institutional ops',
    tenantType: 'club',
    authRole: 'organization',
    workspacePath: '/workspace/organization/overview',
    entityLabel: 'Organisation / Federation / Club Name',
    entityPlaceholder: 'e.g. Delhi State Athletics Association',
    directorLabel: 'Authorized Administrator / Secretary Name',
    directorPlaceholder: 'e.g. Ananya Deshmukh',
    defaultContactTitle: 'Organisation Admin',
    accentBg: 'rgba(13, 148, 136, 0.1)',
    accentColor: '#0d9488',
  },
}

export const PARTNER_ROLES_ORDERED: readonly PartnerRoleDefinition[] = [
  PARTNER_ROLE_CONFIG.academy,
  PARTNER_ROLE_CONFIG.coach,
  PARTNER_ROLE_CONFIG.venue,
  PARTNER_ROLE_CONFIG.tournament,
  PARTNER_ROLE_CONFIG.organization,
]

const ORG_ROLE_ALIASES = new Set([
  'organization',
  'organisation',
  'org',
  'club',
  'school',
  'college',
  'university',
  'federation',
  'association',
  'corporate',
  'training_org',
  'service_provider',
  'research_org',
  'media_org',
  'enterprise',
  'other',
])

/** Normalizes query parameter or legacy alias values ('host', 'turf', org subtypes) to a canonical PartnerRole. */
export function normalizePartnerRole(raw?: string | null): PartnerRole {
  const value = (raw || '').trim().toLowerCase()
  if (value === 'coach') return 'coach'
  if (value === 'venue' || value === 'turf' || value === 'host' || value === 'venue_owner') return 'venue'
  if (value === 'tournament' || value === 'event_organizer') return 'tournament'
  if (ORG_ROLE_ALIASES.has(value)) return 'organization'
  return 'academy'
}

/** Resolves the canonical WorkspaceShell path for a partner role or user role. */
export function resolvePartnerWorkspacePath(selectedRole: PartnerRole, userRole?: UserRole): string {
  if (selectedRole) return PARTNER_ROLE_CONFIG[selectedRole].workspacePath
  if (userRole === 'coach') return PARTNER_ROLE_CONFIG.coach.workspacePath
  if (userRole === 'venue_owner') return PARTNER_ROLE_CONFIG.venue.workspacePath
  if (userRole === 'host' || userRole === 'tournament') return PARTNER_ROLE_CONFIG.tournament.workspacePath
  if (userRole === 'organization') return PARTNER_ROLE_CONFIG.organization.workspacePath
  return PARTNER_ROLE_CONFIG.academy.workspacePath
}

function slugifyEntityName(name: string, prefix: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return clean || `${prefix}-${Date.now().toString(36)}`
}

function initializeVerticalRecord(params: {
  role: PartnerRole
  entityName: string
  directorName: string
  sport: string
  city: string
  phone: string
  email: string
  upiVpa: string
  certification?: string
}): { slug: string; displayName: string } {
  const cleanName = params.entityName.trim()
  const cleanDirector = params.directorName.trim() || PARTNER_ROLE_CONFIG[params.role].defaultContactTitle
  const cleanPhone = params.phone.trim()
  const cleanEmail = params.email.trim().toLowerCase()
  const cleanUpi = params.upiVpa.trim() || `${slugifyEntityName(cleanName, params.role).replace(/-/g, '')}@upi`

  switch (params.role) {
    case 'academy': {
      const created = registerCustomAcademy({
        name: cleanName,
        sport: params.sport || 'Multi-Sport',
        city: params.city || 'Delhi NCR',
        state: 'India',
        directorName: cleanDirector,
        directorWhatsApp: cleanPhone,
        upiVpa: cleanUpi,
      })
      return { slug: created.slug, displayName: created.name }
    }
    case 'coach': {
      const created = registerCustomCoach({
        name: cleanName,
        sport: params.sport || 'Cricket',
        city: params.city || 'Delhi NCR',
        state: 'India',
        phone: cleanPhone,
        email: cleanEmail,
        certification: params.certification?.trim() || 'Pending SAI / Federation Verification',
        monthlyFee: 3000,
        upiVpa: cleanUpi,
      })
      return { slug: created.slug, displayName: created.name }
    }
    case 'venue': {
      const venueSlug = slugifyEntityName(cleanName, 'turf')
      saveTurfVenueSettings({
        venueSlug,
        venueName: cleanName,
        managerName: cleanDirector,
        managerWhatsApp: cleanPhone,
        upiVpa: cleanUpi,
        allowPayAtVenue: true,
        autoWhatsAppConfirmEnabled: true,
      })
      return { slug: venueSlug, displayName: cleanName }
    }
    case 'tournament': {
      return {
        slug: slugifyEntityName(cleanName, 'tournament'),
        displayName: cleanName,
      }
    }
    case 'organization': {
      return {
        slug: slugifyEntityName(cleanName, 'org'),
        displayName: cleanName,
      }
    }
  }
}

export interface PartnerSignupInput {
  role: PartnerRole
  organizationType?: OrganizationType
  entityName: string
  directorName?: string
  sport: string
  city: string
  phone: string
  email: string
  password?: string
  upiVpa?: string
  certification?: string
  useMagicLink?: boolean
  captchaToken?: string
}

export interface PartnerOnboardingOutcome {
  success: boolean
  message: string
  workspacePath?: string
  tenantId?: string
  entitySlug?: string
  requiresEmailVerification?: boolean
  user?: AuthUserProfile
  provisioningWarning?: string
  memberships?: DbTenantMembership[]
  pendingInvitations?: DbTenantMembership[]
}

async function provisionTenantWithCollisionRetry(params: {
  slug: string
  name: string
  tenantType: OrganizationType
  city: string
  sport: string
  contactPhone: string
  contactEmail: string
  metadata: Record<string, unknown>
}) {
  const firstAttempt = await provisionInitialTenantOwner({
    slug: params.slug,
    name: params.name,
    tenantType: params.tenantType,
    city: params.city,
    sport: params.sport,
    contactPhone: params.contactPhone,
    contactEmail: params.contactEmail,
    metadata: params.metadata,
  })

  if (firstAttempt.success) return { result: firstAttempt, slug: params.slug }

  const lowerMsg = firstAttempt.message.toLowerCase()
  const isSlugConflict = lowerMsg.includes('duplicate') || lowerMsg.includes('unique') || lowerMsg.includes('23505')
  if (!isSlugConflict) {
    return { result: firstAttempt, slug: params.slug }
  }

  const retrySlug = `${params.slug}-${Date.now().toString(36).slice(-4)}`
  const secondAttempt = await provisionInitialTenantOwner({
    slug: retrySlug,
    name: params.name,
    tenantType: params.tenantType,
    city: params.city,
    sport: params.sport,
    contactPhone: params.contactPhone,
    contactEmail: params.contactEmail,
    metadata: { ...params.metadata, baseSlug: params.slug },
  })
  return { result: secondAttempt, slug: secondAttempt.success ? retrySlug : params.slug }
}

/**
 * Authenticates via Supabase Auth (or reuses an existing verified session) and
 * provisions a multi-tenant owner workspace across academy, coach, venue, or tournament.
 */
export async function onboardPartnerOrganization(
  input: PartnerSignupInput
): Promise<PartnerOnboardingOutcome> {
  const config = PARTNER_ROLE_CONFIG[input.role]
  const cleanEntityName = input.entityName.trim()
  const cleanDirectorName = (input.directorName || '').trim() || cleanEntityName || config.defaultContactTitle
  const cleanPhone = input.phone.trim()
  const cleanCity = input.city.trim() || 'Delhi NCR'
  const existingUser = getStoredAuthUser()
  const resolvedEmail = (input.email.trim() || existingUser?.email || '').toLowerCase()

  if (!cleanEntityName) {
    return { success: false, message: `Please enter your ${config.entityLabel}.` }
  }
  if (cleanPhone.replace(/\D/g, '').length < 10) {
    return { success: false, message: 'Please enter a valid 10-digit WhatsApp or mobile number.' }
  }
  if (!resolvedEmail || !resolvedEmail.includes('@')) {
    return { success: false, message: 'Please enter a valid official email address.' }
  }

  let activeUser: AuthUserProfile | undefined = existingUser || undefined

  if (!activeUser) {
    if (!input.useMagicLink && (!input.password || input.password.length < 6)) {
      return { success: false, message: 'Password must be at least 6 characters long.' }
    }

    const authResult = await signUpWithEmail({
      email: resolvedEmail,
      password: input.password,
      fullName: cleanDirectorName,
      role: config.authRole,
      city: cleanCity,
      phone: cleanPhone,
      useMagicLink: input.useMagicLink,
      redirectTo: '/partner/verify',
      partnerOnboarding: {
        version: 1,
        role: input.role,
        organizationType: input.role === 'organization' ? input.organizationType || config.tenantType : config.tenantType,
        entityName: cleanEntityName,
        directorName: cleanDirectorName,
        sport: input.sport,
        city: cleanCity,
        phone: cleanPhone,
        email: resolvedEmail,
        upiVpa: input.upiVpa?.trim() || '',
        certification: input.certification?.trim() || '',
      },
      ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
    })

    if (!authResult.success) {
      return {
        success: false,
        message: authResult.message || 'Could not create partner account.',
      }
    }

    if (authResult.requiresEmailVerification || !authResult.user) {
      return {
        success: true,
        requiresEmailVerification: true,
        user: authResult.user,
        workspacePath: config.workspacePath,
        message:
          authResult.message ||
          `Verification link sent to ${resolvedEmail}. Confirm your email, then sign in to launch your ${config.label} workspace.`,
      }
    }

    activeUser = authResult.user
  }

  const vertical = initializeVerticalRecord({
    role: input.role,
    entityName: cleanEntityName,
    directorName: cleanDirectorName,
    sport: input.sport,
    city: cleanCity,
    phone: cleanPhone,
    email: resolvedEmail,
    upiVpa: input.upiVpa || '',
    certification: input.certification,
  })

  const resolvedTenantType =
    input.role === 'organization' && input.organizationType
      ? input.organizationType
      : config.tenantType

  const { result: provisionRes, slug: provisionedSlug } = await provisionTenantWithCollisionRetry({
    slug: vertical.slug,
    name: cleanEntityName,
    tenantType: resolvedTenantType,
    city: cleanCity,
    sport: input.sport,
    contactPhone: cleanPhone,
    contactEmail: resolvedEmail,
    metadata: {
      source: 'unified_partner_onboarding',
      partnerRole: input.role,
      organizationType: resolvedTenantType,
      upiVpa: input.upiVpa?.trim() || null,
      directorName: cleanDirectorName,
      certification: input.certification?.trim() || null,
    },
  })

  if (!provisionRes.success) {
    return {
      success: false,
      message: provisionRes.message || 'Could not provision organization workspace.',
      user: activeUser,
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('khelgrid:auth-changed'))
  }

  const workspacePath = `${config.workspacePath}?tenant=${encodeURIComponent(provisionedSlug)}`
  return {
    success: true,
    user: activeUser,
    tenantId: provisionRes.tenantId,
    entitySlug: provisionedSlug,
    workspacePath,
    message: `${vertical.displayName} workspace provisioned. Opening ${config.label} console...`,
  }
}

/**
 * Completes partner onboarding only after Supabase confirms the current user's email.
 * The intake payload is treated as untrusted metadata: it is validated and used only
 * as descriptive tenant input. Ownership always comes from auth.uid() inside the RPC.
 */
export async function completePartnerEmailVerification(): Promise<PartnerOnboardingOutcome> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Authentication service is not configured.' }

  const { data: authData, error: authError } = await client.auth.getUser()
  const authUser = authData.user
  if (authError || !authUser || !authUser.email_confirmed_at) {
    return { success: false, message: 'Please open the verification link again after confirming your email.' }
  }

  const raw = authUser.user_metadata?.khelgrid_partner_onboarding
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { success: false, message: 'Email verified. No pending partner registration was found. Please sign in or contact KhelGrid support.' }
  }
  const pending = raw as Record<string, unknown>
  const role = pending.role
  if (pending.version !== 1 || typeof role !== 'string' || !['academy', 'coach', 'venue', 'tournament', 'organization'].includes(role)) {
    return { success: false, message: 'The pending partner registration is invalid. Please contact KhelGrid support.' }
  }

  const config = PARTNER_ROLE_CONFIG[role as PartnerRole]
  const entityName = typeof pending.entityName === 'string' ? pending.entityName.trim() : ''
  const city = typeof pending.city === 'string' ? pending.city.trim() : ''
  const sport = typeof pending.sport === 'string' ? pending.sport.trim() : ''
  const phone = typeof pending.phone === 'string' ? pending.phone.trim() : ''
  const email = (authUser.email || '').trim().toLowerCase()
  const directorName = typeof pending.directorName === 'string' ? pending.directorName.trim() : ''
  if (!entityName || !city || !sport || phone.replace(/\D/g, '').length < 10 || !email) {
    return { success: false, message: 'Your saved registration details are incomplete. Please contact KhelGrid support.' }
  }

  const baseSlug = slugifyEntityName(entityName, role)
  // Fail closed if membership verification fails; never provision against an unknown state.
  const memberships = await getUserTenantMemberships(authUser.id)
  const existing = memberships.find(m =>
    m.role === 'owner' && m.tenant?.name === entityName &&
    m.tenant?.metadata?.source === 'verified_partner_email_onboarding' &&
    m.tenant?.metadata?.partnerRole === role
  ) || memberships.find(m => m.role === 'owner' && m.tenant?.slug === baseSlug)
  if (existing?.tenant) {
    const path = resolveTenantWorkspacePath(existing)
    return { success: true, user: mapToUserProfile({ ...authUser.user_metadata, id: authUser.id, email, email_confirmed_at: authUser.email_confirmed_at }, email, config.authRole), tenantId: existing.tenant_id, entitySlug: existing.tenant.slug, workspacePath: path, message: 'Your verified partner workspace is ready.' }
  }

  const organizationType = role === 'organization' && typeof pending.organizationType === 'string'
    ? pending.organizationType as OrganizationType
    : config.tenantType
  const provisioned = await provisionTenantWithCollisionRetry({
    slug: baseSlug,
    name: entityName,
    tenantType: organizationType,
    city,
    sport,
    contactPhone: phone,
    contactEmail: email,
    metadata: {
      source: 'verified_partner_email_onboarding',
      partnerRole: role,
      organizationType,
      directorName,
      upiVpa: typeof pending.upiVpa === 'string' ? pending.upiVpa : null,
      certification: typeof pending.certification === 'string' ? pending.certification : null,
    },
  })
  if (!provisioned.result.success || !provisioned.result.tenantId) {
    return { success: false, message: provisioned.result.message || 'Your email is verified, but workspace setup could not be completed. Please retry or contact support.' }
  }

  const profile = mapToUserProfile({
    ...authUser.user_metadata,
    id: authUser.id,
    email,
    email_confirmed_at: authUser.email_confirmed_at,
  }, email, config.authRole)
  profile.id = authUser.id
  profile.role = config.authRole
  profile.isVerified = true
  const workspacePath = `${config.workspacePath}?tenant=${encodeURIComponent(provisioned.slug)}`
  return {
    success: true,
    user: profile,
    tenantId: provisioned.result.tenantId,
    entitySlug: provisioned.slug,
    workspacePath,
    message: `${entityName} is verified. Opening your ${config.label} workspace...`,
  }
}

/** Authenticates an existing partner account via Supabase Auth without client-side bypasses. */
export async function signInPartnerAccount(input: {
  role: PartnerRole
  email: string
  password?: string
  useMagicLink?: boolean
  captchaToken?: string
}): Promise<PartnerOnboardingOutcome> {
  const cleanEmail = input.email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please enter your registered email address.' }
  }

  if (!input.useMagicLink && (!input.password || input.password.length < 6)) {
    return { success: false, message: 'Please enter your account password (minimum 6 characters).' }
  }

  const authRes = await signInWithEmail({
    email: cleanEmail,
    password: input.password,
    useMagicLink: input.useMagicLink,
    ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
  })

  if (!authRes.success) {
    return {
      success: false,
      message: authRes.message || 'Sign-in failed. Verify your email and password.',
    }
  }

  if (authRes.requiresEmailVerification) {
    return {
      success: true,
      requiresEmailVerification: true,
      message: `One-click sign-in link sent to ${cleanEmail}. Check your inbox to continue.`,
    }
  }

  const resolvedUser = authRes.user
  const [memberships, pendingInvitations] = resolvedUser
    ? await Promise.all([
        tryFetchUserTenantMemberships(resolvedUser.id),
        getPendingTenantMemberships(resolvedUser.id),
      ])
    : [[], []]

  const activeMemberships = memberships.filter(
    m => m.status === 'active' && m.tenant?.status === 'active'
  )

  if (activeMemberships.length > 1 || pendingInvitations.length > 0) {
    return {
      success: true,
      user: resolvedUser,
      memberships: activeMemberships,
      pendingInvitations,
      message: `Signed in! Choose a tenant workspace or accept a pending team invitation below.`,
    }
  }

  const preferredMembership =
    activeMemberships.find(m => m.tenant?.tenant_type === PARTNER_ROLE_CONFIG[input.role].tenantType) ||
    activeMemberships[0]

  const workspacePath = preferredMembership
    ? resolveTenantWorkspacePath(preferredMembership)
    : PARTNER_ROLE_CONFIG[input.role].workspacePath

  return {
    success: true,
    user: resolvedUser,
    memberships: activeMemberships,
    pendingInvitations,
    workspacePath,
    message: `Signed in! Opening ${preferredMembership?.tenant?.name || PARTNER_ROLE_CONFIG[input.role].label} workspace...`,
  }
}

export { acceptTenantInvitation }
