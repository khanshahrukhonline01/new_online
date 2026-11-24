import type { AdminWorkspaceTab } from '../components/AdminSidebar'

export const APPROVED_DEVELOPMENT_SUPABASE_ORIGIN = 'https://hznsbxvovjxvmnchzzqt.supabase.co'

export const ADMIN_MIN_PASSWORD_LENGTH = 12

export type AdminPlatformRole = 'moderator' | 'super_admin'

export interface VerifiedAdminIdentity {
  userId: string
  email: string
  role: AdminPlatformRole
  isActive: true
}

export interface OriginValidationResult {
  approved: boolean
  origin: string | null
  projectRef: string | null
  reason?: string
}

export type AdminGateStatus =
  | 'config_invalid'
  | 'checking'
  | 'unauthenticated'
  | 'session_expired'
  | 'access_denied'
  | 'service_unavailable'
  | 'authorized'

export interface AdminGateInput {
  configApproved: boolean
  isLoading: boolean
  hasSession: boolean
  sessionExpired?: boolean
  lookupError?: string | null
  profile: {
    user_id?: string | null
    role?: string | null
    is_active?: boolean | null
  } | null
}

export interface AdminGateDecision {
  status: AdminGateStatus
  allowWorkspaceMount: boolean
  role: AdminPlatformRole | null
  message: string
}

/**
 * Validates that a configured Supabase URL matches an exact approved origin
 * using strict URL parsing (never substring matching).
 */
export function validateAdminSupabaseOrigin(
  rawUrl: string | undefined | null,
  allowedOrigins: readonly string[] = [APPROVED_DEVELOPMENT_SUPABASE_ORIGIN],
): OriginValidationResult {
  const trimmed = (rawUrl ?? '').toString().trim().replace(/^["']|["']$/g, '')
  if (!trimmed) {
    return {
      approved: false,
      origin: null,
      projectRef: null,
      reason: 'Supabase URL is not configured for the admin application.',
    }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return {
      approved: false,
      origin: null,
      projectRef: null,
      reason: 'Supabase URL is malformed.',
    }
  }

  if (parsed.protocol !== 'https:') {
    return {
      approved: false,
      origin: parsed.origin,
      projectRef: null,
      reason: 'Supabase URL must use HTTPS.',
    }
  }

  // Reject URLs containing credentials, non-root paths, query params, or fragments
  if (parsed.username || parsed.password || (parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
    return {
      approved: false,
      origin: parsed.origin,
      projectRef: null,
      reason: 'Supabase URL must be a clean origin with no path, query, fragment, or embedded credentials.',
    }
  }

  const normalizedAllowed = new Set(
    allowedOrigins
      .map(entry => {
        try {
          return new URL(entry).origin.toLowerCase()
        } catch {
          return ''
        }
      })
      .filter(Boolean),
  )

  const normalizedOrigin = parsed.origin.toLowerCase()
  if (!normalizedAllowed.has(normalizedOrigin)) {
    return {
      approved: false,
      origin: parsed.origin,
      projectRef: null,
      reason: 'Configured Supabase origin is not in the approved development allowlist.',
    }
  }

  const hostParts = parsed.hostname.split('.')
  const projectRef = hostParts.length >= 3 && hostParts.slice(1).join('.') === 'supabase.co'
    ? hostParts[0]
    : parsed.hostname

  return {
    approved: true,
    origin: parsed.origin,
    projectRef,
  }
}

/**
 * Validates that a Supabase anon key is explicitly present and not a placeholder.
 */
export function isValidAdminAnonKey(rawKey: string | undefined | null): boolean {
  const trimmed = (rawKey ?? '').toString().trim().replace(/^["']|["']$/g, '')
  if (!trimmed) return false
  if (trimmed === 'example' || trimmed.includes('your-anon-key') || trimmed.includes('placeholder')) {
    return false
  }
  return trimmed.length >= 40
}

/**
 * Strictly validates a password-reset redirect URL so it cannot leave the
 * current application origin or use unsafe schemes.
 */
export function validateSafeAdminRedirectUrl(
  targetUrl: string | undefined | null,
  currentOrigin: string,
): string {
  const safeFallback = `${currentOrigin.replace(/\/$/, '')}/`
  if (!targetUrl || typeof targetUrl !== 'string') return safeFallback

  const trimmed = targetUrl.trim()
  if (!trimmed) return safeFallback

  // Relative path check
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes(':') && !trimmed.includes('\\')) {
    return `${currentOrigin.replace(/\/$/, '')}${trimmed}`
  }

  try {
    const parsedTarget = new URL(trimmed)
    const parsedCurrent = new URL(currentOrigin)
    if (parsedTarget.origin.toLowerCase() !== parsedCurrent.origin.toLowerCase()) {
      return safeFallback
    }
    if (parsedTarget.protocol !== 'https:' && parsedTarget.protocol !== 'http:') {
      return safeFallback
    }
    return `${parsedTarget.origin}${parsedTarget.pathname}${parsedTarget.search}`
  } catch {
    return safeFallback
  }
}

/**
 * Rejects synthetic/fabricated evidence URLs (such as internal placeholder
 * khelgrid.com/verify/* links) and non-HTTPS URLs.
 */
export function isSyntheticOrUnsafeEvidenceUrl(rawUrl: string | undefined | null): boolean {
  const trimmed = (rawUrl ?? '').trim()
  if (!trimmed) return true

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return true
  }

  if (parsed.protocol !== 'https:') return true

  const host = parsed.hostname.toLowerCase()
  const path = parsed.pathname.toLowerCase()

  // Reject synthetic internal placeholder verification links and local/loopback hosts
  if (
    (host === 'khelgrid.com' || host.endsWith('.khelgrid.com')) &&
    path.startsWith('/verify')
  ) {
    return true
  }

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.invalid')
  ) {
    return true
  }

  return false
}

/**
 * Pure, fail-closed authorization gate state machine.
 * Never allows workspace mount unless config is approved, session exists,
 * no lookup error occurred, and the server returned an active moderator/super_admin role.
 */
export function evaluateAdminAccessGate(input: AdminGateInput): AdminGateDecision {
  if (!input.configApproved) {
    return {
      status: 'config_invalid',
      allowWorkspaceMount: false,
      role: null,
      message: 'This admin application is not configured for an approved development database.',
    }
  }

  if (input.isLoading) {
    return {
      status: 'checking',
      allowWorkspaceMount: false,
      role: null,
      message: 'Verifying authenticated session and server-side platform permissions…',
    }
  }

  if (input.sessionExpired) {
    return {
      status: 'session_expired',
      allowWorkspaceMount: false,
      role: null,
      message: 'Your administrative session expired or was revoked. Please sign in again.',
    }
  }

  if (!input.hasSession) {
    return {
      status: 'unauthenticated',
      allowWorkspaceMount: false,
      role: null,
      message: 'Sign in with an individually authorized KhelGrid operator account.',
    }
  }

  if (input.lookupError) {
    return {
      status: 'service_unavailable',
      allowWorkspaceMount: false,
      role: null,
      message: 'Authorization could not be verified with the server. Privileged access is blocked.',
    }
  }

  const isValidRole =
    input.profile?.role === 'moderator' || input.profile?.role === 'super_admin'

  if (!input.profile || input.profile.is_active !== true || !isValidRole) {
    return {
      status: 'access_denied',
      allowWorkspaceMount: false,
      role: null,
      message: 'Your account does not hold an active KhelGrid platform administration or moderation grant.',
    }
  }

  return {
    status: 'authorized',
    allowWorkspaceMount: true,
    role: input.profile.role as AdminPlatformRole,
    message: 'Authorized.',
  }
}

/**
 * Returns the workspaces that have real server-backed implementations vs.
 * workspaces quarantined as unavailable pending Phase 5 server-side tables/RPCs.
 */
export const UNAVAILABLE_LOCALSTORAGE_WORKSPACES: ReadonlySet<AdminWorkspaceTab> = new Set([
  'gate_desk',
  'turf_oversight',
  'academy_oversight',
])

export function getAllowedWorkspacesForRole(role: AdminPlatformRole | null): AdminWorkspaceTab[] {
  if (!role) return []
  // Both active moderators and super_admins can view the platform workspaces including the
  // Platform Settings & Audit Explorer desk; mutating platform feature flags, bilingual CMS
  // banners, taxonomies, and operator RBAC grants remains strictly gated to super_admin.
  return ['command', 'moderation_desk', 'analytics', 'chronicle_desk', 'tenant_governance', 'verification_vault', 'creator_campaigns', 'fraud_disputes', 'platform_governance']
}

export interface GovernanceCapabilityMatrix {
  canViewAuditExplorer: boolean
  canExportAuditCsv: boolean
  canMutateFeatureFlags: boolean
  canPublishBanners: boolean
  canEditTaxonomies: boolean
  canManageOperatorRbac: boolean
}

export function getGovernanceCapabilities(role: AdminPlatformRole | null): GovernanceCapabilityMatrix {
  const isAuthenticatedOperator = role === 'moderator' || role === 'super_admin'
  const isSuperAdmin = role === 'super_admin'
  return {
    canViewAuditExplorer: isAuthenticatedOperator,
    canExportAuditCsv: isAuthenticatedOperator,
    canMutateFeatureFlags: isSuperAdmin,
    canPublishBanners: isSuperAdmin,
    canEditTaxonomies: isSuperAdmin,
    canManageOperatorRbac: isSuperAdmin,
  }
}

export function isWorkspaceAuthorized(
  workspace: AdminWorkspaceTab,
  role: AdminPlatformRole | null,
): boolean {
  if (!role) return false
  if (UNAVAILABLE_LOCALSTORAGE_WORKSPACES.has(workspace)) return false
  return getAllowedWorkspacesForRole(role).includes(workspace)
}
