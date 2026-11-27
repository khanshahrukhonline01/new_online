import React, { useEffect, type ReactNode } from 'react'
import { useTenant } from '../context/useTenant'

export interface RequireTenantMemberProps {
  children: ReactNode
  allowedRoles?: string[]
  requiredTenantTypes?: string[]
  requireTenantMembership?: boolean
  fallback?: ReactNode
  personaLabel?: string
  onboardingRole?: 'academy' | 'coach' | 'venue' | 'tournament' | 'organization' | 'creator' | 'parent'
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
  const { isAuthenticated, userId, currentTenant, currentMembership, memberships, pendingInvitations = [], isLoading, error, switchTenant, acceptInvitation } = useTenant()
  const matchingMembership = requiredTenantTypes?.length
    ? memberships.find(m => m.user_id === userId && m.status === 'active' && requiredTenantTypes.includes(m.tenant?.tenant_type || '') && m.tenant?.status === 'active' && (!allowedRoles?.length || allowedRoles.includes(m.role)))
    : null
  const matchingPendingInvites = pendingInvitations.filter(inv =>
    inv.user_id === userId &&
    inv.status === 'invited' &&
    (!requiredTenantTypes?.length || requiredTenantTypes.includes(inv.tenant?.tenant_type || ''))
  )

  useEffect(() => {
    if (!isLoading && !error && isAuthenticated && matchingMembership && currentMembership?.id !== matchingMembership.id) {
      void switchTenant(matchingMembership.tenant_id)
    }
  }, [isLoading, error, isAuthenticated, matchingMembership, currentMembership?.id, switchTenant])
  const isPartnerRole = onboardingRole !== 'creator' && onboardingRole !== 'parent'
  const loginHref = isPartnerRole ? `/partner-signup?mode=login&role=${onboardingRole}` : '/login'
  const signupHref = isPartnerRole ? `/partner-signup?mode=signup&role=${onboardingRole}` : '/signup'

  if (isLoading || (!error && matchingMembership && currentMembership?.id !== matchingMembership.id)) {
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

  // Personal workspaces require a verified sign-in, not an organisation membership.
  // Do not let an unrelated tenant-membership lookup outage block an authenticated
  // athlete/parent account area.
  if (!requireTenantMembership) return <>{children}</>

  if (error) {
    return <section className="kg-tenant-guard-card" role="alert"><h2>Workspace access could not be verified</h2><p>{error}</p></section>
  }

  if (!currentTenant || !currentMembership || currentMembership.user_id !== userId || currentMembership.status !== 'active' || (requiredTenantTypes?.length && !matchingMembership)) {
    if (fallback) return <>{fallback}</>
    return (
      <section className="kg-tenant-guard-card" aria-labelledby="kg-tenant-membership-title">
        <div className="kg-tenant-guard-icon" aria-hidden="true">🏟️</div>
        <h2 id="kg-tenant-membership-title" className="kg-tenant-guard-title">No active {personaLabel} membership</h2>
        <p className="kg-tenant-guard-desc">This account has no verified active membership for this workspace. Join or register an organisation to continue.</p>
        {matchingPendingInvites.length > 0 && acceptInvitation && (
          <div className="kg-tenant-guard-invites" style={{ display: 'grid', gap: '8px', marginBottom: '12px', textAlign: 'left' }}>
            {matchingPendingInvites.map(invite => (
              <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)' }}>
                <span>
                  <strong>{invite.tenant?.name || 'Workspace'}</strong> ({invite.role})
                </span>
                <button
                  type="button"
                  className="kg-btn kg-btn-primary"
                  onClick={() => void acceptInvitation(invite.id)}
                >
                  Accept invitation
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          <a href={signupHref} onClick={e => onNavigate?.(e, signupHref)} className="kg-btn kg-btn-primary">Register / join {personaLabel}</a>
          <a href="/workspace" onClick={e => onNavigate?.(e, '/workspace')} className="kg-btn kg-btn-secondary">Switch / view active workspaces</a>
        </div>
      </section>
    )
  }

  if (currentTenant.status !== 'active' ||
      (requiredTenantTypes?.length && !requiredTenantTypes.includes(currentTenant.tenant_type)) ||
      (allowedRoles?.length && !allowedRoles.includes(currentMembership.role))) {
    if (matchingMembership && matchingMembership.tenant_id !== currentTenant.id) {
      return (
        <section className="kg-tenant-guard-card" aria-labelledby="kg-tenant-switch-title">
          <div className="kg-tenant-guard-icon" aria-hidden="true">🔄</div>
          <h2 id="kg-tenant-switch-title" className="kg-tenant-guard-title">Switch active workspace</h2>
          <p className="kg-tenant-guard-desc">
            You are currently viewing <strong>{currentTenant.name}</strong> ({currentTenant.tenant_type}). Switch to{' '}
            <strong>{matchingMembership.tenant?.name || personaLabel}</strong> to open this {personaLabel.toLowerCase()} workspace.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              className="kg-btn kg-btn-primary"
              onClick={() => switchTenant(matchingMembership.tenant_id)}
            >
              Switch to {matchingMembership.tenant?.name || personaLabel}
            </button>
            <a href="/workspace" onClick={e => onNavigate?.(e, '/workspace')} className="kg-btn kg-btn-secondary">All workspaces</a>
          </div>
        </section>
      )
    }
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
