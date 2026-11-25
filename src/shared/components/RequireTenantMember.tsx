import React, { type ReactNode } from 'react'
import { useTenant } from '../context/useTenant'
import { getStoredAuthUser } from '../../integrations/supabase/auth-client'

export interface RequireTenantMemberProps {
  children: ReactNode
  allowedRoles?: string[]
  fallback?: ReactNode
  onNavigate?: (e: React.MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function RequireTenantMember({
  children,
  allowedRoles,
  fallback,
  onNavigate,
}: RequireTenantMemberProps) {
  const { currentTenant, currentMembership, userRole, isLoading } = useTenant()
  const user = getStoredAuthUser()

  if (isLoading) {
    return (
      <div className="kg-tenant-guard-loading" role="status">
        <p>Verifying secure tenant workspace credentials...</p>
      </div>
    )
  }

  // Check 1: User must be authenticated
  if (!user) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="kg-tenant-guard-card">
        <div className="kg-tenant-guard-icon" aria-hidden="true">🔒</div>
        <h2 className="kg-tenant-guard-title">Authentication Required</h2>
        <p className="kg-tenant-guard-desc">
          KhelGrid Academy SaaS workspaces are strictly isolated by organization. Please sign in with your institutional credentials to access management records.
        </p>
        <a
          href="/partner/onboarding?mode=login"
          onClick={e => onNavigate?.(e, '/partner/onboarding?mode=login')}
          className="kg-btn kg-btn-navy"
        >
          Sign In to Academy Workspace
        </a>
      </div>
    )
  }

  // Check 2: User must have an active tenant membership
  if (!currentTenant || !currentMembership) {
    if (fallback) return <>{fallback}</>
    return (
      <div className="kg-tenant-guard-card">
        <div className="kg-tenant-guard-icon" aria-hidden="true">🏟️</div>
        <h2 className="kg-tenant-guard-title">No Active Academy Membership</h2>
        <p className="kg-tenant-guard-desc">
          Signed in as <strong>{user.email || user.fullName}</strong>, but no active academy or coaching workspace is linked to your account.
        </p>
        <a
          href="/partner/onboarding?mode=signup"
          onClick={e => onNavigate?.(e, '/partner/onboarding?mode=signup')}
          className="kg-btn kg-btn-primary"
        >
          Register Your Sports Academy
        </a>
      </div>
    )
  }

  // Check 3: Role restrictions if specified
  if (allowedRoles && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return (
      <div className="kg-tenant-guard-card">
        <div className="kg-tenant-guard-icon" aria-hidden="true">⛔</div>
        <h2 className="kg-tenant-guard-title">Access Denied</h2>
        <p className="kg-tenant-guard-desc">
          Your assigned role (<strong>{userRole}</strong>) does not have sufficient permissions to view this workspace.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
