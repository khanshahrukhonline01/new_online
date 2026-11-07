/**
 * KhelGrid Centralized Authorization & RBAC Engine (Phase 3)
 *
 * Provides authoritative, typed, and centralized permission evaluation
 * combining Role-Based Access Control (RBAC), resource ownership,
 * and least-privilege scoping across frontend components and client services.
 *
 * NOTE: Frontend permission checks guide the user interface experience.
 * Authoritative access boundaries are strictly enforced at the PostgreSQL
 * database and Row Level Security (RLS) layers.
 */

import { getStoredAuthUser, type AuthUserProfile } from '../../integrations/supabase/auth-client'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'

export type AppRole =
  | 'visitor'
  | 'athlete'
  | 'parent'
  | 'coach'
  | 'scout'
  | 'academy'
  | 'host'
  | 'venue_owner'
  | 'submitter'
  | 'moderator'
  | 'admin'
  | 'service_role'

export type AppResource =
  | 'catalogue'
  | 'profile'
  | 'listing'
  | 'venue'
  | 'application'
  | 'match'
  | 'payment'
  | 'user_role'
  | 'audit_log'

export type ResourceAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'moderate'
  | 'score'
  | 'payout'

export type AppPermission =
  | 'catalogue:browse'
  | 'profile:view'
  | 'profile:edit'
  | 'profile:edit_other'
  | 'listing:submit'
  | 'listing:view_own'
  | 'listing:edit_own'
  | 'listing:moderate'
  | 'application:submit'
  | 'application:read_own'
  | 'application:read_scoped'
  | 'application:manage'
  | 'venue:book'
  | 'venue:manage_own'
  | 'venue:manage_all'
  | 'match:create'
  | 'match:score'
  | 'match:score_all'
  | 'payment:view_own'
  | 'payment:view_all'
  | 'user:manage_roles'
  | 'audit:view'

/**
 * Canonical Role-to-Permission Mapping Matrix
 */
export const ROLE_PERMISSIONS_MATRIX: Record<AppRole, readonly AppPermission[]> = {
  visitor: ['catalogue:browse'],
  athlete: [
    'catalogue:browse',
    'profile:view',
    'profile:edit',
    'listing:submit',
    'application:submit',
    'application:read_own',
    'venue:book',
    'payment:view_own',
  ],
  parent: [
    'catalogue:browse',
    'profile:view',
    'profile:edit',
    'listing:submit',
    'application:submit',
    'application:read_own',
    'venue:book',
    'payment:view_own',
  ],
  coach: [
    'catalogue:browse',
    'profile:view',
    'profile:edit',
    'listing:submit',
    'listing:view_own',
    'listing:edit_own',
    'application:read_scoped',
    'venue:book',
    'match:score',
    'payment:view_own',
  ],
  scout: [
    'catalogue:browse',
    'profile:view',
    'application:read_scoped',
  ],
  academy: [
    'catalogue:browse',
    'profile:view',
    'profile:edit',
    'listing:submit',
    'listing:view_own',
    'listing:edit_own',
    'application:read_scoped',
    'application:manage',
    'match:create',
    'match:score',
    'payment:view_own',
  ],
  host: [
    'catalogue:browse',
    'profile:view',
    'profile:edit',
    'listing:submit',
    'listing:view_own',
    'listing:edit_own',
    'venue:manage_own',
    'match:create',
    'match:score',
    'payment:view_own',
  ],
  venue_owner: [
    'catalogue:browse',
    'profile:view',
    'profile:edit',
    'listing:submit',
    'listing:view_own',
    'listing:edit_own',
    'venue:manage_own',
    'payment:view_own',
  ],
  submitter: [
    'catalogue:browse',
    'profile:view',
    'listing:submit',
    'listing:view_own',
    'listing:edit_own',
  ],
  moderator: [
    'catalogue:browse',
    'profile:view',
    'listing:moderate',
    'application:read_scoped',
    'match:score',
  ],
  admin: [
    'catalogue:browse',
    'profile:view',
    'profile:edit',
    'profile:edit_other',
    'listing:submit',
    'listing:view_own',
    'listing:edit_own',
    'listing:moderate',
    'application:submit',
    'application:read_own',
    'application:read_scoped',
    'application:manage',
    'venue:book',
    'venue:manage_own',
    'venue:manage_all',
    'match:create',
    'match:score',
    'match:score_all',
    'payment:view_own',
    'payment:view_all',
    'user:manage_roles',
    'audit:view',
  ],
  service_role: [
    'catalogue:browse',
    'profile:view',
    'profile:edit',
    'profile:edit_other',
    'listing:moderate',
    'venue:manage_all',
    'match:score_all',
    'payment:view_all',
    'user:manage_roles',
    'audit:view',
  ],
} as const

export interface AuthContext {
  userId: string | null
  roles: AppRole[]
  isVerified?: boolean
  email?: string
}

/**
 * Resolves current user's active context from stored auth state or remote DB.
 */
export function getCurrentAuthContext(): AuthContext {
  const user: AuthUserProfile | null = getStoredAuthUser()
  if (!user || !user.id) {
    return {
      userId: null,
      roles: ['visitor'],
      isVerified: false,
    }
  }

  const role = (user.role as AppRole) || 'athlete'
  return {
    userId: user.id,
    roles: [role],
    isVerified: Boolean(user.isVerified),
    email: user.email,
  }
}

/**
 * Fetches all roles assigned to a user from public.user_roles.
 * Falls back closed to ['visitor'] on network error or absent session.
 */
export async function getCurrentUserRoles(userId?: string): Promise<AppRole[]> {
  const currentContext = getCurrentAuthContext()
  const targetId = userId || currentContext.userId

  if (!targetId) {
    return ['visitor']
  }

  const client = getSupabaseClient()
  if (!client) {
    // Offline / Mock fallback
    return currentContext.roles.length > 0 ? currentContext.roles : ['athlete']
  }

  try {
    const { data, error } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', targetId)
      .eq('is_active', true)

    if (error || !data || data.length === 0) {
      return currentContext.roles.length > 0 ? currentContext.roles : ['athlete']
    }

    const fetchedRoles = data.map(r => r.role as AppRole)
    return Array.from(new Set(fetchedRoles))
  } catch {
    // Fail closed
    return currentContext.roles
  }
}

/**
 * Checks whether an auth context or role set satisfies the required role.
 * System administrators implicitly satisfy all role checks.
 */
export function hasRole(requiredRole: AppRole, userRoles?: AppRole[]): boolean {
  const roles = userRoles || getCurrentAuthContext().roles
  if (roles.includes('admin') || roles.includes('service_role')) {
    return true
  }
  return roles.includes(requiredRole)
}

/**
 * Evaluates whether an auth context holds a granular permission.
 * System administrators implicitly possess all permissions.
 */
export function hasPermission(permission: AppPermission, userRoles?: AppRole[]): boolean {
  const roles = userRoles || getCurrentAuthContext().roles
  if (roles.includes('admin') || roles.includes('service_role')) {
    return true
  }

  return roles.some(role => {
    const permissions = ROLE_PERMISSIONS_MATRIX[role] || []
    return permissions.includes(permission)
  })
}

/**
 * Evaluates access to a resource action combining Role, Ownership, and Scoping.
 */
export function canAccessResource(
  resource: AppResource,
  action: ResourceAction,
  context: AuthContext,
  resourceOwnerId?: string | null
): boolean {
  // 1. Service role and system admin have universal access
  if (context.roles.includes('admin') || context.roles.includes('service_role')) {
    return true
  }

  // 2. Unauthenticated visitors are restricted exclusively to catalogue read
  if (!context.userId || context.roles.includes('visitor')) {
    return resource === 'catalogue' && action === 'read'
  }

  const isOwner = Boolean(resourceOwnerId && context.userId === resourceOwnerId)

  // 3. Domain evaluation
  switch (resource) {
    case 'catalogue':
      return action === 'read'

    case 'profile':
      if (action === 'read') return true // Public discovery profile
      if (action === 'update' || action === 'delete') return isOwner
      return false

    case 'listing':
      if (action === 'read') return true
      if (action === 'create') return hasPermission('listing:submit', context.roles)
      if (action === 'update' || action === 'delete') {
        return isOwner && hasPermission('listing:edit_own', context.roles)
      }
      if (action === 'moderate') {
        return hasPermission('listing:moderate', context.roles)
      }
      return false

    case 'venue':
      if (action === 'read') return true
      if (action === 'create' || action === 'update') {
        return isOwner && hasPermission('venue:manage_own', context.roles)
      }
      return false

    case 'application':
      if (action === 'create') return hasPermission('application:submit', context.roles)
      if (action === 'read') {
        if (isOwner) return true
        return hasPermission('application:read_scoped', context.roles)
      }
      if (action === 'update' || action === 'moderate') {
        return hasPermission('application:manage', context.roles)
      }
      return false

    case 'match':
      if (action === 'read') return true
      if (action === 'create') return hasPermission('match:create', context.roles)
      if (action === 'score') {
        if (isOwner) return true
        return hasPermission('match:score', context.roles)
      }
      return false

    case 'payment':
      if (action === 'read') return isOwner
      return false

    case 'user_role':
    case 'audit_log':
      return context.roles.includes('admin')

    default:
      return false
  }
}

/**
 * Evaluates whether current context can manage a specific directory listing.
 */
export function canManageListing(
  _listingId: string,
  context: AuthContext,
  submitterId?: string | null
): boolean {
  if (context.roles.includes('admin')) return true
  if (!context.userId) return false
  return Boolean(submitterId && context.userId === submitterId)
}

/**
 * Evaluates whether current context can review and moderate directory submissions.
 */
export function canModerateListing(context: AuthContext): boolean {
  if (context.roles.includes('admin')) return true
  return context.roles.includes('moderator')
}

/**
 * Evaluates whether current context can manage court slots and rates for a venue.
 */
export function canManageVenue(
  _venueId: string,
  context: AuthContext,
  venueHostId?: string | null
): boolean {
  if (context.roles.includes('admin')) return true
  if (!context.userId) return false
  return Boolean(
    venueHostId &&
    context.userId === venueHostId &&
    (context.roles.includes('host') || context.roles.includes('venue_owner'))
  )
}

/**
 * Evaluates whether current context can update match scores for a game.
 */
export function canUpdateLiveScore(
  _matchId: string,
  context: AuthContext,
  matchScorerId?: string | null
): boolean {
  if (context.roles.includes('admin')) return true
  if (!context.userId) return false
  return Boolean(
    (matchScorerId && context.userId === matchScorerId) ||
    context.roles.includes('host') ||
    context.roles.includes('coach') ||
    context.roles.includes('moderator')
  )
}

/**
 * Evaluates whether current context has authority to assign or revoke user roles.
 */
export function canManageRoles(context: AuthContext): boolean {
  return context.roles.includes('admin')
}
