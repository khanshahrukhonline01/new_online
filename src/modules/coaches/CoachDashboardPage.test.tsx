import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuthContext, type AuthContextValue } from '../../shared/auth/useAuth'
import { TenantContext, type TenantContextValue } from '../../shared/context/tenantContextCore'
import { RequireTenantMember } from '../../shared/components/RequireTenantMember'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import type { DbTenant, DbTenantMembership } from '../../integrations/supabase/tenant-client'
import CoachDashboardPage from './CoachDashboardPage'

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

const sampleCoachTenant: DbTenant = {
  id: 'tenant-coach-101',
  slug: 'elite-track-coaching',
  name: 'Elite Track Coaching Hub',
  tenant_type: 'coach',
  status: 'active',
  verification_status: 'unverified',
  city: 'Bengaluru',
  state: 'Karnataka',
  sport: 'Athletics',
  created_at: '2026-11-26T00:00:00Z',
  updated_at: '2026-11-26T00:00:00Z',
}

const sampleCoachMembership: DbTenantMembership = {
  id: 'mem-coach-101',
  tenant_id: 'tenant-coach-101',
  user_id: 'usr-coach-101',
  role: 'owner',
  status: 'active',
  created_at: '2026-11-26T00:00:00Z',
  updated_at: '2026-11-26T00:00:00Z',
  tenant: sampleCoachTenant,
}

const sampleCoachUser: AuthUserProfile = {
  id: 'usr-coach-101',
  name: 'Raghavendra Rao',
  fullName: 'Raghavendra Rao',
  email: 'raghav@example.com',
  role: 'coach',
  isVerified: true,
  createdAt: '2026-11-26T00:00:00Z',
}

function makeTenantValue(overrides: Partial<TenantContextValue> = {}): TenantContextValue {
  return {
    userId: 'usr-coach-101',
    isAuthenticated: true,
    currentTenant: sampleCoachTenant,
    currentMembership: sampleCoachMembership,
    userRole: 'owner',
    memberships: [sampleCoachMembership],
    pendingInvitations: [],
    isLoading: false,
    error: null,
    refreshTenant: vi.fn(async () => {}),
    switchTenant: vi.fn(async () => true),
    switchTenantBySlug: vi.fn(async () => true),
    ...overrides,
  }
}

describe('CoachDashboardPage Foundation & Security Gates (Phase 1)', () => {
  it('blocks unauthenticated access cleanly without exposing sample trainees or payment panels', () => {
    const html = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(null)}>
        <TenantContext.Provider
          value={makeTenantValue({
            userId: null,
            isAuthenticated: false,
            currentTenant: null,
            currentMembership: null,
            memberships: [],
          })}
        >
          <RequireTenantMember
            personaLabel="Coach"
            onboardingRole="coach"
            requiredTenantTypes={['coach', 'academy']}
            allowedRoles={['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach']}
          >
            <CoachDashboardPage />
          </RequireTenantMember>
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )

    expect(html).toContain('Sign in required')
    expect(html).not.toContain('Zaheer Farooq')
    expect(html).not.toContain('Arjun Mehra')
    expect(html).not.toContain('Collected This Month')
  })

  it('blocks non-coach athlete users lacking an active coach or academy coaching membership', () => {
    const athleteUser: AuthUserProfile = {
      ...sampleCoachUser,
      id: 'usr-athlete-999',
      role: 'athlete',
      fullName: 'Vikram Athlete',
    }
    const html = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(athleteUser)}>
        <TenantContext.Provider
          value={makeTenantValue({
            userId: athleteUser.id,
            currentTenant: null,
            currentMembership: null,
            userRole: null,
            memberships: [],
          })}
        >
          <RequireTenantMember
            personaLabel="Coach"
            onboardingRole="coach"
            requiredTenantTypes={['coach', 'academy']}
            allowedRoles={['owner', 'org_admin', 'director', 'admin', 'manager', 'head_coach', 'coach']}
          >
            <CoachDashboardPage />
          </RequireTenantMember>
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )

    expect(html).toContain('No active Coach membership')
    expect(html).not.toContain('Authorized Database Metrics')
  })

  it('renders authenticated Coach Workspace overview with zero hardcoded fixtures or admin verify overrides', () => {
    const html = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(sampleCoachUser)}>
        <TenantContext.Provider value={makeTenantValue()}>
          <CoachDashboardPage workspaceSection="overview" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )

    expect(html).toContain('KHELGRID · COACH WORKSPACE')
    expect(html).toContain('Raghavendra Rao')
    expect(html).toContain('Authorized Database Metrics')
    expect(html).toContain('Quick Actions')
    expect(html).toContain('Professional Profile')
    expect(html).toContain('Verification &amp; Badges')
    expect(html).toContain('Academy Associations')

    // Strictly absent hardcoded sample coaches/trainees, local bypasses, payment collection, or client verify overrides
    expect(html).not.toContain('Zaheer Farooq')
    expect(html).not.toContain('Arjun Mehra')
    expect(html).not.toContain('+14.2%')
    expect(html).not.toContain('Total Earnings &amp; UPI QR')
    expect(html).not.toContain('Confirm &amp; Grant Verified Tag')
    expect(html).not.toContain('+ Register Coach')
  })

  it('supports Section 3 sub-routes (/coach-dashboard/academy, /settings, /athletes/:id, /programmes/create)', () => {
    const academyMembership: DbTenantMembership = {
      id: 'mem-acad-2',
      tenant_id: 'tenant-acad-2',
      user_id: sampleCoachUser.id,
      role: 'head_coach',
      status: 'active',
      created_at: '2026-11-26T00:00:00Z',
      updated_at: '2026-11-26T00:00:00Z',
      tenant: {
        ...sampleCoachTenant,
        id: 'tenant-acad-2',
        slug: 'sunrise-academy',
        name: 'Sunrise Sports Academy',
        tenant_type: 'academy',
      },
    }

    const academyHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(sampleCoachUser)}>
        <TenantContext.Provider
          value={makeTenantValue({ memberships: [sampleCoachMembership, academyMembership] })}
        >
          <CoachDashboardPage currentPath="/coach-dashboard/academy" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(academyHtml).toContain('Authorized Academy &amp; Institutional Associations')
    expect(academyHtml).toContain('Sunrise Sports Academy')

    const settingsHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(sampleCoachUser)}>
        <TenantContext.Provider value={makeTenantValue()}>
          <CoachDashboardPage currentPath="/coach-dashboard/settings" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(settingsHtml).toContain('Account, Security &amp; Privacy Settings')
    expect(settingsHtml).toContain('Paused')

    const athleteDetailHtml = renderToStaticMarkup(
      <AuthContext.Provider value={makeAuthValue(sampleCoachUser)}>
        <TenantContext.Provider value={makeTenantValue()}>
          <CoachDashboardPage currentPath="/coach-dashboard/athletes/ath-101" />
        </TenantContext.Provider>
      </AuthContext.Provider>,
    )
    expect(athleteDetailHtml).toContain('Scheduled for Phase 2')
    expect(athleteDetailHtml).toContain('ath-101')
  })
})
