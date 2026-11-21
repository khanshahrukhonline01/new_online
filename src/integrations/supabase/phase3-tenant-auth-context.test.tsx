import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TenantProvider } from '../../shared/context/TenantContext'
import { useTenant } from '../../shared/context/useTenant'
import { RequireTenantMember } from '../../shared/components/RequireTenantMember'
import { setStoredAuthUser, type AuthUserProfile } from '../../integrations/supabase/auth-client'

describe('KhelGrid SaaS Platform — Phase 3 Tenant Auth & Context', () => {
  beforeEach(() => {
    // Reset stored user before each test
    setStoredAuthUser(null)
  })

  it('renders authentication required fallback when visitor is unauthenticated', () => {
    const html = renderToStaticMarkup(
      <TenantProvider>
        <RequireTenantMember>
          <div data-testid="protected-content">Director Workspace</div>
        </RequireTenantMember>
      </TenantProvider>
    )

    // Protected content should NOT be rendered
    expect(html).not.toContain('Director Workspace')
    // Authentication required header should be visible
    expect(html).toContain('Authentication Required')
    expect(html).toContain('Sign In to Academy Workspace')
  })

  it('renders no active membership fallback when user has no linked tenant', () => {
    const mockUser: AuthUserProfile = {
      id: 'usr-123',
      email: 'coach.rahul@gmail.com',
      fullName: 'Rahul Dravid',
      name: 'Rahul Dravid',
      role: 'coach',
      isVerified: true,
      createdAt: new Date().toISOString(),
    }
    setStoredAuthUser(mockUser)

    const html = renderToStaticMarkup(
      <TenantProvider>
        <RequireTenantMember>
          <div data-testid="protected-content">Director Workspace</div>
        </RequireTenantMember>
      </TenantProvider>
    )

    // Protected content should NOT be rendered
    expect(html).not.toContain('Director Workspace')
    expect(html).toContain('No Active Academy Membership')
    expect(html).toContain('Register Your Sports Academy')
  })

  it('provides useTenant hook context values to consumers', () => {
    function ConsumerComponent() {
      const { userRole, memberships, isLoading } = useTenant()
      return (
        <div>
          <span data-testid="loading-state">{String(isLoading)}</span>
          <span data-testid="user-role">{userRole || 'none'}</span>
          <span data-testid="membership-count">{memberships.length}</span>
        </div>
      )
    }

    const html = renderToStaticMarkup(
      <TenantProvider>
        <ConsumerComponent />
      </TenantProvider>
    )

    expect(html).toContain('data-testid="loading-state"')
    expect(html).toContain('data-testid="user-role"')
    expect(html).toContain('data-testid="membership-count"')
  })
})
