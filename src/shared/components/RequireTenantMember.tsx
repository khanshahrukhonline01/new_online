import React, { useEffect, type ReactNode } from 'react'
import { useTenant } from '../context/useTenant'

export interface RequireTenantMemberProps {
  children: ReactNode
  allowedRoles?: string[]
  requiredTenantTypes?: string[]
  requireTenantMembership?: boolean
  fallback?: ReactNode
  personaLabel?: string
  onboardingRole?: 'academy' | 'coach' | 'venue' | 'tournament'
  onNavigate?: (e: React.MouseEvent<HTMLAnchorElement>, target: string) => void
}

export function RequireTenantMember({
  children,
  allowedRoles,
  requiredTenantTypes,
  requireTenantMembership = true,
  fallback,
  personaLabel = 'Workspace',
  onboardingRole = 'academy',
  onNavigate,
}: RequireTenantMemberProps) {
  const { isAuthenticated, userId, currentTenant, currentMembership, memberships, isLoading, error, switchTenant } = useTenant()
  const matchingMembership = requiredTenantTypes?.length
    ? memberships.find(m => m.user_id === userId && m.status === 'active' && requiredTenantTypes.includes(m.tenant?.tenant_type || '') && m.tenant?.status === 'active' && (!allowedRoles?.length || allowedRoles.includes(m.role)))
    : null

  useEffect(() => {
    if (!isLoading && isAuthenticated && matchingMembership && currentMembership?.id !== matchingMembership.id) {
      void switchTenant(matchingMembership.tenant_id)
    }
  }, [isLoading, isAuthenticated, matchingMembership, currentMembership?.id, switchTenant])
  const loginHref = `/partner-signup?mode=login&role=${onboardingRole}`
  const signupHref = `/partner-signup?mode=signup&role=${onboardingRole}`

  if (isLoading || (matchingMembership && currentMembership?.id !== matchingMembership.id)) {
    return <div className="kg-tenant-guard-loading" role="status"><p>Verifying your secure workspace access…</p></div>
  }

  if (!isAuthenticated || !userId) {
    if (fallback) return <>{fallback}</>
    return (
      <section className="kg-tenant-guard-card" aria-labelledby="kg-tenant-auth-title">
        <div className="kg-tenant-guard-icon" aria-hidden="true">🔒</div>
        <h2 id="kg-tenant-auth-title" className="kg-tenant-guard-title">Sign in required</h2>
        <p className="kg-tenant-guard-desc">Sign in to access the private {personaLabel.toLowerCase()} workspace.</p>
        <a href={loginHref} onClick={e => onNavigate?.(e, loginHref)} className="kg-btn kg-btn-navy">Sign in</a>
      </section>
    )
  }

  if (error) {
    return <section className="kg-tenant-guard-card" role="alert"><h2>Workspace access could not be verified</h2><p>{error}</p></section>
  }

  if (!requireTenantMembership) return <>{children}</>

  if (!currentTenant || !currentMembership || currentMembership.user_id !== userId || currentMembership.status !== 'active' || (requiredTenantTypes?.length && !matchingMembership)) {
    if (fallback) return <>{fallback}</>
    return (
      <section className="kg-tenant-guard-card" aria-labelledby="kg-tenant-membership-title">
        <div className="kg-tenant-guard-icon" aria-hidden="true">🏟️</div>
        <h2 id="kg-tenant-membership-title" className="kg-tenant-guard-title">No active {personaLabel} membership</h2>
        <p className="kg-tenant-guard-desc">This account has no verified active membership for this workspace. Join or register an organisation to continue.</p>
        <a href={signupHref} onClick={e => onNavigate?.(e, signupHref)} className="kg-btn kg-btn-primary">Register / join {personaLabel}</a>
      </section>
    )
  }

  if (currentTenant.status !== 'active' ||
      (requiredTenantTypes?.length && !requiredTenantTypes.includes(currentTenant.tenant_type)) ||
      (allowedRoles?.length && !allowedRoles.includes(currentMembership.role))) {
    return (
      <section className="kg-tenant-guard-card" role="alert">
        <div className="kg-tenant-guard-icon" aria-hidden="true">⛔</div>
        <h2 className="kg-tenant-guard-title">Access denied</h2>
        <p className="kg-tenant-guard-desc">Your active membership does not grant access to this {personaLabel.toLowerCase()} workspace.</p>
      </section>
    )
  }

  return <>{children}</>
}
