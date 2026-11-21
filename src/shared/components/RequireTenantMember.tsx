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
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <p>Verifying secure tenant workspace credentials...</p>
      </div>
    )
  }

  // Check 1: User must be authenticated
  if (!user) {
    if (fallback) return <>{fallback}</>
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '32px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Authentication Required
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
          KhelGrid Academy SaaS workspaces are strictly isolated by organization. Please sign in with your institutional credentials to access management records.
        </p>
        <a
          href="/partner/onboarding?mode=login"
          onClick={e => onNavigate?.(e, '/partner/onboarding?mode=login')}
          style={{ display: 'inline-block', padding: '10px 20px', background: '#0B192C', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}
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
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '32px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏟️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          No Active Academy Membership
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
          Signed in as <strong>{user.email || user.fullName}</strong>, but no active academy or coaching workspace is linked to your account.
        </p>
        <a
          href="/partner/onboarding?mode=signup"
          onClick={e => onNavigate?.(e, '/partner/onboarding?mode=signup')}
          style={{ display: 'inline-block', padding: '10px 20px', background: '#10B981', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}
        >
          Register Your Sports Academy
        </a>
      </div>
    )
  }

  // Check 3: Role restrictions if specified
  if (allowedRoles && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '32px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⛔</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Access Denied
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
          Your assigned role (<strong>{userRole}</strong>) does not have sufficient permissions to view this workspace.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
