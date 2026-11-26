import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import OrganizationsWorkspacePage from './OrganizationsWorkspacePage'
import { AuthContext, type AuthContextValue } from '../../shared/auth/useAuth'
import { TenantContext, type TenantContextValue } from '../../shared/context/tenantContextCore'
import type { DbTenant, DbTenantMembership } from '../../integrations/supabase/tenant-client'

const sampleTenant: DbTenant = {
  id: 'org-fed-1',
  slug: 'delhi-state-athletics',
  name: 'Delhi State Athletics Association',
  tenant_type: 'federation',
  status: 'active',
  verification_status: 'verified',
  city: 'New Delhi',
  sport: 'Athletics',
  created_at: '2026-11-26T00:00:00Z',
  updated_at: '2026-11-26T00:00:00Z',
}

const sampleMembership: DbTenantMembership = {
  id: 'mem-org-1',
  tenant_id: sampleTenant.id,
  user_id: 'usr-org-owner-1',
  role: 'owner',
  status: 'active',
  created_at: '2026-11-26T00:00:00Z',
  updated_at: '2026-11-26T00:00:00Z',
  tenant: sampleTenant,
}

function makeAuthCtx(authenticated: boolean): AuthContextValue {
  return {
    user: authenticated
      ? {
          id: 'usr-org-owner-1',
          email: 'secretary@delhiathletics.in',
          fullName: 'Ananya Deshmukh',
          name: 'Ananya Deshmukh',
          role: 'organization',
          isVerified: true,
          createdAt: '2026-11-26T00:00:00Z',
        }
      : null,
    isAuthenticated: authenticated,
    modalOpen: false,
    intent: { tab: 'login' },
    openAuth: vi.fn(),
    closeAuth: vi.fn(),
    setAuthenticatedUser: vi.fn(),
    signOut: vi.fn(async () => {}),
    clearIntent: vi.fn(),
  }
}

function makeTenantCtx(authenticated: boolean): TenantContextValue {
  return {
    userId: authenticated ? 'usr-org-owner-1' : null,
    isAuthenticated: authenticated,
    currentTenant: authenticated ? sampleTenant : null,
    currentMembership: authenticated ? sampleMembership : null,
    userRole: authenticated ? 'owner' : null,
    memberships: authenticated ? [sampleMembership] : [],
    pendingInvitations: [],
    isLoading: false,
    error: null,
    refreshTenant: vi.fn(async () => {}),
    switchTenant: vi.fn(async () => true),
    switchTenantBySlug: vi.fn(async () => true),
  }
}

describe('OrganizationsWorkspacePage', () => {
  it('fails closed when unauthenticated — never renders local sandbox org state', () => {
    const html = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthCtx(false)}>
        <TenantContext.Provider value={makeTenantCtx(false)}>
          <OrganizationsWorkspacePage />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )

    expect(html).toContain('Sign in required')
    expect(html).toContain('Sign in to Organization Console')
    expect(html).not.toContain('NCR Elite Cricket Academy')
    expect(html).not.toContain('Team, RBAC &amp; Invites')
  })

  it('renders authorized SaaS organization workspace hydrated from verified TenantContext', () => {
    const html = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthCtx(true)}>
        <TenantContext.Provider value={makeTenantCtx(true)}>
          <OrganizationsWorkspacePage />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )

    expect(html).toContain('Organizations &amp; Workspace Console')
    expect(html).toContain('Delhi State Athletics Association')
    expect(html).toContain('Role: owner')
    expect(html).toContain('Payments disabled')
    expect(html).toContain('Sports Federation')
    expect(html).toContain('University Sports Board')
    expect(html).toContain('Overview &amp; Provisioning')
    expect(html).toContain('Team, RBAC &amp; Invites')
    expect(html).toContain('Permissions &amp; Ownership')
    expect(html).toContain('Entitlements &amp; Metering')
    expect(html).toContain('Branches, Matrix &amp; Audit')
    expect(html).not.toContain('NCR Elite Cricket Academy')
  })

  it('wires workspaceSection props directly to matching organization workspace tabs for authenticated members', () => {
    const membersHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthCtx(true)}>
        <TenantContext.Provider value={makeTenantCtx(true)}>
          <OrganizationsWorkspacePage workspaceSection="members" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(membersHtml).toContain('Organization Members &amp; Anti-Escalation RBAC')
    expect(membersHtml).toContain('Invite Organization Member')

    const branchesHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthCtx(true)}>
        <TenantContext.Provider value={makeTenantCtx(true)}>
          <OrganizationsWorkspacePage workspaceSection="branches" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(branchesHtml).toContain('Organization Units (Branches, Teams &amp; Facilities)')
    expect(branchesHtml).toContain('30-Module Platform SaaS Adoption Matrix')
  })
})
