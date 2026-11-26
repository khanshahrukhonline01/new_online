import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TenantProvider } from '../../shared/context/TenantContext'
import { useTenant } from '../../shared/context/useTenant'
import { RequireTenantMember } from '../../shared/components/RequireTenantMember'
import { setStoredAuthUser, type AuthUserProfile } from '../../integrations/supabase/auth-client'
import * as realtimeModule from './realtime-client'
import {
  getTenantBySlug,
  provisionInitialTenantOwner,
  submitTenantEnquiry,
  createTenantInvitation,
  acceptTenantInvitation,
} from './tenant-client'
import AcademyHubPage from '../../modules/academies/AcademyHubPage'

describe('KhelGrid SaaS Platform — Phase 3 Tenant Auth & Context', () => {
  beforeEach(() => {
    // Reset stored user before each test
    setStoredAuthUser(null)
    vi.restoreAllMocks()
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
    expect(html).toContain('Verifying your secure workspace access')
    expect(html).not.toContain('Director Workspace')
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
    expect(html).toContain('Verifying your secure workspace access')
    expect(html).not.toContain('Director Workspace')
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

  it('provisions initial tenant owner atomically via provisionInitialTenantOwner', async () => {
    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      rpc: vi.fn().mockImplementation((name: string) => {
        if (name === 'provision_initial_tenant_owner') {
          return Promise.resolve({ data: 'mock-tenant-id-456', error: null })
        }
        return Promise.resolve({ data: null, error: null })
      }),
    } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

    const res = await provisionInitialTenantOwner({
      slug: 'delhi-cricket-academy',
      name: 'Delhi Cricket Academy',
      tenantType: 'academy',
      city: 'Delhi NCR',
      sport: 'Cricket',
      contactPhone: '9876543210',
      contactEmail: 'director@delhicricket.com',
    })

    expect(res.success).toBe(true)
    expect(res.tenantId).toBe('mock-tenant-id-456')
  })

  it('creates and accepts tenant invitations securely', async () => {
    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      rpc: vi.fn().mockImplementation((name: string) => {
        if (name === 'create_tenant_invitation') {
          return Promise.resolve({ data: 'mock-membership-id-789', error: null })
        }
        if (name === 'accept_tenant_invitation') {
          return Promise.resolve({ data: true, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      }),
    } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

    const inviteRes = await createTenantInvitation({
      tenantId: 'delhi-cricket-academy',
      invitedEmail: 'assistant.coach@gmail.com',
      role: 'coach',
    })
    expect(inviteRes.success).toBe(true)
    expect(inviteRes.membershipId).toBe('mock-membership-id-789')

    const acceptRes = await acceptTenantInvitation(inviteRes.membershipId!)
    expect(acceptRes.success).toBe(true)
  })

  it('ensures client-side role dropdown (#academy-role-select) is decommissioned in AcademyHub', () => {
    const html = renderToStaticMarkup(
      <TenantProvider>
        <AcademyHubPage />
      </TenantProvider>
    )
    expect(html).not.toContain('id="academy-role-select"')
    expect(html).not.toContain('Sandbox Preview')
    expect(html).toContain('VIEWER (AUTHENTICATING)')
  })

  it('customizes RequireTenantMember copy and partner-signup role links for venue workspaces', () => {
    setStoredAuthUser(null)
    const unauthHtml = renderToStaticMarkup(
      <TenantProvider>
        <RequireTenantMember personaLabel="Venue / Turf" onboardingRole="venue">
          <div>Protected Venue Content</div>
        </RequireTenantMember>
      </TenantProvider>
    )
    expect(unauthHtml).toContain('Verifying your secure workspace access')
    expect(unauthHtml).not.toContain('Protected Venue Content')

    setStoredAuthUser({
      id: 'usr-venue-1',
      email: 'ops@venue.in',
      fullName: 'Venue Ops',
      name: 'Venue Ops',
      role: 'academy',
      isVerified: true,
      createdAt: '2026-03-29T00:00:00Z',
    })
    const noMembershipHtml = renderToStaticMarkup(
      <TenantProvider>
        <RequireTenantMember personaLabel="Venue / Turf" onboardingRole="venue">
          <div>Protected Venue Content</div>
        </RequireTenantMember>
      </TenantProvider>
    )
    expect(noMembershipHtml).toContain('Verifying your secure workspace access')
    expect(noMembershipHtml).not.toContain('Protected Venue Content')
    expect(noMembershipHtml).not.toContain('Protected Venue Content')
  })

  it('fails closed in tenant-client CRUD/provisioning calls when Supabase client is unconfigured', async () => {
    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue(null)

    expect(await getTenantBySlug('delhi-cricket-academy')).toBeNull()

    const provRes = await provisionInitialTenantOwner({
      slug: 'offline-org',
      name: 'Offline Org',
      tenantType: 'academy',
    })
    expect(provRes.success).toBe(false)

    const enqRes = await submitTenantEnquiry({
      tenantId: '00000000-0000-0000-0000-000000000000',
      parentName: 'Test Parent',
      parentPhone: '9876543210',
      studentName: 'Test Student',
      sport: 'Cricket',
      requestType: 'free_trial',
    })
    expect(enqRes.success).toBe(false)

    const invRes = await createTenantInvitation({
      tenantId: '00000000-0000-0000-0000-000000000000',
      invitedEmail: 'staff@khelgrid.in',
      role: 'coach',
    })
    expect(invRes.success).toBe(false)

    const acceptRes = await acceptTenantInvitation('inv-1')
    expect(acceptRes.success).toBe(false)
  })
})
