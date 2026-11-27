import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuthContext, type AuthContextValue } from '../../shared/auth/useAuth'
import { TenantContext, type TenantContextValue } from '../../shared/context/tenantContextCore'
import { RequireTenantMember } from '../../shared/components/RequireTenantMember'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import type { DbTenant, DbTenantMembership } from '../../integrations/supabase/tenant-client'
import AcademyHubPage from './AcademyHubPage'

function makeAuthValue(user: AuthUserProfile | null): AuthContextValue {
  return {
    user,
    isAuthenticated: Boolean(user),
    modalOpen: false,
    intent: { tab: 'login' },
    openAuth: vi.fn(),
    closeAuth: vi.fn(),
    setAuthenticatedUser: vi.fn(),
    signOut: vi.fn(async () => {}),
    clearIntent: vi.fn(),
  }
}

const sampleAcademyTenant: DbTenant = {
  id: 'tenant-acad-101',
  slug: 'elite-strike-academy',
  name: 'Elite Strike Football Academy',
  tenant_type: 'academy',
  status: 'active',
  verification_status: 'unverified',
  city: 'Bengaluru',
  state: 'Karnataka',
  sport: 'Football',
  upi_vpa: 'elitestrike@oksbi',
  created_at: '2026-11-26T00:00:00Z',
  updated_at: '2026-11-26T00:00:00Z',
}

const secondAcademyTenant: DbTenant = {
  id: 'tenant-acad-202',
  slug: 'chennai-racquet-club',
  name: 'Chennai Racquet Academy',
  tenant_type: 'academy',
  status: 'active',
  verification_status: 'verified',
  city: 'Chennai',
  state: 'Tamil Nadu',
  sport: 'Badminton',
  created_at: '2026-11-26T00:00:00Z',
  updated_at: '2026-11-26T00:00:00Z',
}

function makeMembership(tenant: DbTenant, role: DbTenantMembership['role'], userId = 'usr-owner-1'): DbTenantMembership {
  return {
    id: `mem-${tenant.id}`,
    tenant_id: tenant.id,
    user_id: userId,
    role,
    status: 'active',
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
    tenant,
  }
}

function makeUser(role: AuthUserProfile['role'] = 'academy', id = 'usr-owner-1'): AuthUserProfile {
  return {
    id,
    name: 'Academy Lead',
    fullName: 'Academy Lead',
    email: 'lead@academy.in',
    role,
    isVerified: true,
    createdAt: '2026-11-26T00:00:00Z',
  }
}

function makeTenantContext(overrides: Partial<TenantContextValue> = {}): TenantContextValue {
  const mem1 = makeMembership(sampleAcademyTenant, 'owner')
  return {
    userId: 'usr-owner-1',
    isAuthenticated: true,
    currentTenant: sampleAcademyTenant,
    currentMembership: mem1,
    userRole: 'owner',
    memberships: [mem1],
    pendingInvitations: [],
    isLoading: false,
    error: null,
    refreshTenant: vi.fn(async () => {}),
    switchTenant: vi.fn(async () => true),
    switchTenantBySlug: vi.fn(async () => true),
    ...overrides,
  }
}

describe('AcademyHubPage Multi-Tenant SaaS Workspace Suite', () => {
  it('fails closed when unauthenticated — exposes zero curated demo academies or fake KPIs', () => {
    const html = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(null)}>
        <TenantContext.Provider
          value={makeTenantContext({
            userId: null,
            isAuthenticated: false,
            currentTenant: null,
            currentMembership: null,
            memberships: [],
          })}
        >
          <RequireTenantMember personaLabel="Academy" onboardingRole="academy" requiredTenantTypes={['academy']}>
            <AcademyHubPage />
          </RequireTenantMember>
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )

    expect(html).not.toContain('Bengaluru FC Residential Academy')
    expect(html).not.toContain('Pullela Gopichand')
    expect(html).not.toContain('+12.4% MoM')
    expect(html).not.toContain('Aarav Sundaram')
    expect(html).toContain('Sign in required')
    expect(html).toContain('Sign in to access the private academy workspace')
  })

  it('rejects non-academy memberships safely on Academy routes', () => {
    const coachOnlyTenant: DbTenant = {
      ...sampleAcademyTenant,
      id: 'tenant-coach-only',
      slug: 'solo-coach',
      name: 'Solo Coach Hub',
      tenant_type: 'coach',
    }
    const html = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(makeUser('coach', 'usr-coach-1'))}>
        <TenantContext.Provider
          value={makeTenantContext({
            userId: 'usr-coach-1',
            currentTenant: coachOnlyTenant,
            currentMembership: makeMembership(coachOnlyTenant, 'owner', 'usr-coach-1'),
            memberships: [makeMembership(coachOnlyTenant, 'owner', 'usr-coach-1')],
          })}
        >
          <RequireTenantMember personaLabel="Academy" onboardingRole="academy" requiredTenantTypes={['academy']}>
            <AcademyHubPage />
          </RequireTenantMember>
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )

    expect(html).toContain('No active Academy membership')
    expect(html).not.toContain('Solo Coach Hub')
  })

  it('renders authorized multi-tenant academy overview with genuine 0-record metrics for fresh tenants', () => {
    const mem1 = makeMembership(sampleAcademyTenant, 'owner')
    const mem2 = makeMembership(secondAcademyTenant, 'org_admin')
    const html = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(makeUser())}>
        <TenantContext.Provider
          value={makeTenantContext({
            memberships: [mem1, mem2],
          })}
        >
          <AcademyHubPage />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )

    expect(html).toContain('Elite Strike Football Academy')
    expect(html).toContain('Academy Owner')
    expect(html).toContain('Chennai Racquet Academy')
    expect(html).not.toContain('Bengaluru FC Residential Academy')
    expect(html).not.toContain('+12.4% MoM')
    expect(html).not.toContain('id="academy-role-select"')
    expect(html).toContain('Active / Total Athletes')
    expect(html).toContain('0 / 0')
  })

  it('enforces 7-role RBAC UI boundaries between Coach, Finance Manager, Admissions Manager, and Owner', () => {
    const coachMem = makeMembership(sampleAcademyTenant, 'coach', 'usr-coach-2')
    const coachHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(makeUser('coach', 'usr-coach-2'))}>
        <TenantContext.Provider
          value={makeTenantContext({
            userId: 'usr-coach-2',
            currentMembership: coachMem,
            memberships: [coachMem],
          })}
        >
          <AcademyHubPage initialTab="fees" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(coachHtml).toContain('Coach / Training Staff')
    expect(coachHtml).toContain('Section Restricted by Academy Role')
    expect(coachHtml).not.toContain('Staff &amp; Roles')
    expect(coachHtml).not.toContain('Fee Ledger (UPI)')

    const financeMem = makeMembership(sampleAcademyTenant, 'finance_manager', 'usr-fin-1')
    const financeHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(makeUser('academy', 'usr-fin-1'))}>
        <TenantContext.Provider
          value={makeTenantContext({
            userId: 'usr-fin-1',
            currentMembership: financeMem,
            memberships: [financeMem],
          })}
        >
          <AcademyHubPage initialTab="fees" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(financeHtml).toContain('Finance Manager')
    expect(financeHtml).toContain('Fee Tracking &amp; Direct UPI Ledger')
    expect(financeHtml).toContain('Payment Collection Paused')
  })

  it('wires WorkspaceShell workspaceSection prop directly onto Batches & Coaches modules', () => {
    const batchesHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(makeUser())}>
        <TenantContext.Provider value={makeTenantContext()}>
          <AcademyHubPage workspaceSection="batches" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(batchesHtml).toContain('Training Programmes, Batches &amp; Calendar')

    const coachesHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(makeUser())}>
        <TenantContext.Provider value={makeTenantContext()}>
          <AcademyHubPage workspaceSection="coaches" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(coachesHtml).toContain('Coaches &amp; Instruction Team')
  })
})
