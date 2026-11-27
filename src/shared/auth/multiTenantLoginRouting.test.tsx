import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from '../../App'
import { resolveRoute } from '../routing'
import WorkspacePage from '../../modules/workspace/WorkspacePage'
import { AuthTenantPickerPanel } from '../components/auth/AuthTenantPickerPanel'
import { AuthStepProfilePanel } from '../components/auth/AuthStepProfilePanel'
import {
  CONSUMER_ROLE_OPTIONS,
  PARTNER_HANDOFF_OPTIONS,
  resolvePostAuthTarget,
} from '../components/auth/authModalTypes'
import { RequireTenantMember } from '../components/RequireTenantMember'
import { TenantContext, type TenantContextValue } from '../context/tenantContextCore'
import {
  mapTenantTypeToPersona,
  resolveTenantWorkspacePath,
  type DbTenantMembership,
} from '../../integrations/supabase/tenant-client'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'

function makeUser(role: AuthUserProfile['role'], id = 'user-1'): AuthUserProfile {
  return {
    id,
    email: `${role}@khelgrid.in`,
    fullName: `Test ${role}`,
    name: `Test ${role}`,
    role,
    isVerified: true,
    createdAt: '2026-11-26T00:00:00Z',
  }
}

function makeMembership(
  id: string,
  slug: string,
  name: string,
  tenantType: NonNullable<DbTenantMembership['tenant']>['tenant_type'],
  memberRole: DbTenantMembership['role'] = 'owner',
  status: DbTenantMembership['status'] = 'active',
): DbTenantMembership {
  return {
    id,
    tenant_id: `tenant-${id}`,
    user_id: 'user-1',
    role: memberRole,
    status,
    created_at: '2026-11-26T00:00:00Z',
    updated_at: '2026-11-26T00:00:00Z',
    tenant: {
      id: `tenant-${id}`,
      slug,
      name,
      tenant_type: tenantType,
      status: 'active',
      metadata: {},
      created_at: '2026-11-26T00:00:00Z',
      updated_at: '2026-11-26T00:00:00Z',
    },
  }
}

describe('Multi-tenant & All-Persona Frontend Login Routing', () => {
  it('routes partner email verification to the public verification page', () => {
    expect(resolveRoute('/partner/verify')).toEqual({
      name: 'feature',
      canonicalPath: '/partner/verify',
      slug: 'Partner Email Verification',
    })
  })

  it('exposes all consumer onboarding tracks including creator in AuthModal Step 2', () => {
    const roles = CONSUMER_ROLE_OPTIONS.map(o => o.role)
    expect(roles).toEqual(['athlete', 'parent', 'scout', 'creator'])

    const html = renderToStaticMarkup(
      <AuthStepProfilePanel
        email="creator@khelgrid.in"
        role="creator"
        fullName="Maya Studio"
        city="Bengaluru"
        phone=""
        ageBand="adult"
        guardianEmail=""
        guardianConsentAccepted={false}
        submitting={false}
        onRoleChange={vi.fn()}
        onFullNameChange={vi.fn()}
        onCityChange={vi.fn()}
        onPhoneChange={vi.fn()}
        onAgeBandChange={vi.fn()}
        onGuardianEmailChange={vi.fn()}
        onGuardianConsentChange={vi.fn()}
        onBackStep={vi.fn()}
        onSubmitSignUp={vi.fn()}
        onNavigatePartner={vi.fn()}
      />
    )
    expect(html).toContain('Sports Creator')
  })

  it('exposes all 5 institutional partner categories including club/federation/org', () => {
    const partnerRoles = PARTNER_HANDOFF_OPTIONS.map(o => o.role)
    expect(partnerRoles).toEqual(['academy', 'coach', 'venue', 'tournament', 'organization'])
  })

  it('maps all 18 Postgres tenant_type categories and RBAC roles to canonical dashboards', () => {
    expect(mapTenantTypeToPersona('academy', 'owner')).toBe('academy')
    expect(mapTenantTypeToPersona('academy', 'head_coach')).toBe('coach')
    expect(mapTenantTypeToPersona('academy', 'coach')).toBe('coach')
    expect(mapTenantTypeToPersona('coach', 'owner')).toBe('coach')
    expect(mapTenantTypeToPersona('venue', 'front_desk')).toBe('turf')
    expect(mapTenantTypeToPersona('tournament', 'director')).toBe('tournament')
    expect(mapTenantTypeToPersona('event_organizer', 'owner')).toBe('tournament')
    expect(mapTenantTypeToPersona('academy', 'parent')).toBe('parent')

    const orgTypes = [
      'club',
      'school',
      'college',
      'university',
      'federation',
      'association',
      'corporate',
      'training_org',
      'service_provider',
      'research_org',
      'media_org',
      'enterprise',
      'other',
    ] as const
    for (const orgType of orgTypes) {
      expect(mapTenantTypeToPersona(orgType, 'org_admin')).toBe('organization')
    }

    const fedMembership = makeMembership('m-fed', 'delhi-federation', 'Delhi Athletics Fed', 'federation', 'org_admin')
    expect(resolveTenantWorkspacePath(fedMembership)).toBe('/workspace/organization/overview?tenant=delhi-federation')
  })

  it('routes every role and active membership count via resolvePostAuthTarget', () => {
    expect(resolvePostAuthTarget(makeUser('athlete'))).toBe('/workspace/athlete/overview')
    expect(resolvePostAuthTarget(makeUser('parent'))).toBe('/workspace/parent/attendance')
    expect(resolvePostAuthTarget(makeUser('creator'))).toBe('/workspace/creator/overview')
    expect(resolvePostAuthTarget(makeUser('scout'))).toBe('/scout-portal')
    expect(resolvePostAuthTarget(makeUser('coach'))).toBe('/workspace/coach/overview')
    expect(resolvePostAuthTarget(makeUser('academy'))).toBe('/workspace/academy/overview')
    expect(resolvePostAuthTarget(makeUser('venue_owner'))).toBe('/workspace/turf/calendar')
    expect(resolvePostAuthTarget(makeUser('host'))).toBe('/workspace/host/overview')
    expect(resolvePostAuthTarget(makeUser('tournament'))).toBe('/workspace/tournament/overview')
    expect(resolvePostAuthTarget(makeUser('organization'))).toBe('/workspace/organization/overview')

    // Explicit redirectTo always wins when safe
    expect(resolvePostAuthTarget(makeUser('academy'), '/trials/u17?city=delhi')).toBe('/trials/u17?city=delhi')

    // Staff member whose profile role is 'athlete' but holds a verified academy coach membership
    const staffAthlete = makeUser('athlete')
    const coachMembership = makeMembership('m-coach', 'stars-fa', 'Stars Football Academy', 'academy', 'head_coach')
    expect(resolvePostAuthTarget(staffAthlete, undefined, [coachMembership])).toBe('/workspace/coach/overview?tenant=stars-fa')

    // Multi-tenant holder routes to /workspace unified switcher by default
    const secondMembership = makeMembership('m-turf', 'kanteerava-turf', 'Kanteerava Turf', 'venue', 'owner')
    expect(resolvePostAuthTarget(staffAthlete, undefined, [coachMembership, secondMembership])).toBe('/workspace')
  })

  it('renders AuthTenantPickerPanel for multi-tenant accounts and pending invitations', () => {
    const active = [
      makeMembership('1', 'bb-academy', 'BB Football Academy', 'academy', 'director'),
      makeMembership('2', 'south-turf', 'South Turf Arena', 'venue', 'owner'),
    ]
    const pending = [
      makeMembership('3', 'national-cup', 'National Youth Cup', 'tournament', 'verification_coordinator', 'invited'),
    ]

    const html = renderToStaticMarkup(
      <AuthTenantPickerPanel
        user={makeUser('academy')}
        memberships={active}
        pendingInvitations={pending}
        personalFallbackPath="/workspace/athlete/overview"
        submitting={false}
        onSelectTarget={vi.fn()}
        onAcceptInvitation={vi.fn()}
      />
    )

    expect(html).toContain('Choose Your Dashboard')
    expect(html).toContain('BB Football Academy')
    expect(html).toContain('/workspace/academy/overview?tenant=bb-academy')
    expect(html).toContain('South Turf Arena')
    expect(html).toContain('/workspace/turf/calendar?tenant=south-turf')
    expect(html).toContain('Pending Team Invitations (1)')
    expect(html).toContain('National Youth Cup')
    expect(html).toContain('Accept &amp; Open')
  })

  it('surfaces active multi-tenant dashboards and pending invitations on WorkspacePage', () => {
    const academy = makeMembership('1', 'alpha-fc', 'Alpha FC Academy', 'academy', 'owner')
    const invite = makeMembership('2', 'state-school', 'State Sports School', 'school', 'manager', 'invited')
    const ctx: TenantContextValue = {
      userId: 'user-1',
      isAuthenticated: true,
      currentTenant: academy.tenant!,
      currentMembership: academy,
      userRole: 'owner',
      memberships: [academy],
      pendingInvitations: [invite],
      isLoading: false,
      error: null,
      refreshTenant: async () => {},
      switchTenant: async () => true,
      switchTenantBySlug: async () => true,
      acceptInvitation: async () => ({ success: true, message: 'Accepted' }),
    }

    const html = renderToStaticMarkup(
      <TenantContext.Provider value={ctx}>
        <WorkspacePage authUser={makeUser('creator')} onOpenAuth={vi.fn()} onNavigate={vi.fn()} />
      </TenantContext.Provider>
    )

    expect(html).toContain('Active Organisation Dashboards')
    expect(html).toContain('Alpha FC Academy')
    expect(html).toContain('Pending Workspace Invites')
    expect(html).toContain('State Sports School')
    expect(html).toContain('Creator studio hub')
  })

  it('surfaces inline invitation accept and workspace switcher inside RequireTenantMember', () => {
    const academy = makeMembership('1', 'alpha-fc', 'Alpha FC', 'academy', 'owner')
    const venueInvite = makeMembership('2', 'arena-turf', 'Arena Turf', 'venue', 'front_desk', 'invited')
    const ctx: TenantContextValue = {
      userId: 'user-1',
      isAuthenticated: true,
      currentTenant: academy.tenant!,
      currentMembership: academy,
      userRole: 'owner',
      memberships: [academy],
      pendingInvitations: [venueInvite],
      isLoading: false,
      error: null,
      refreshTenant: async () => {},
      switchTenant: async () => true,
      switchTenantBySlug: async () => true,
      acceptInvitation: async () => ({ success: true, message: 'Accepted' }),
    }

    const html = renderToStaticMarkup(
      <TenantContext.Provider value={ctx}>
        <RequireTenantMember personaLabel="Venue / Turf" onboardingRole="venue" requiredTenantTypes={['venue']}>
          <div>Turf Slot Calendar Content</div>
        </RequireTenantMember>
      </TenantContext.Provider>
    )

    expect(html).toContain('No active Venue / Turf membership')
    expect(html).toContain('Arena Turf')
    expect(html).toContain('Accept invitation')
    expect(html).toContain('Switch / view active workspaces')
    expect(html).not.toContain('Turf Slot Calendar Content')

    const activeVenue = makeMembership('3', 'kanteerava-turf', 'Kanteerava Turf', 'venue', 'owner', 'active')
    const multiCtx: TenantContextValue = {
      ...ctx,
      memberships: [academy, activeVenue],
      pendingInvitations: [],
    }
    const autoSwitchHtml = renderToStaticMarkup(
      <TenantContext.Provider value={multiCtx}>
        <RequireTenantMember personaLabel="Venue / Turf" onboardingRole="venue" requiredTenantTypes={['venue']}>
          <div>Turf Slot Calendar Content</div>
        </RequireTenantMember>
      </TenantContext.Provider>
    )
    expect(autoSwitchHtml).toContain('Verifying your secure workspace access')
    expect(autoSwitchHtml).not.toContain('Access denied')
  })

  it('handles direct /login route in App without falling back to FeatureComingSoonPage', () => {
    const html = renderToStaticMarkup(<App initialPath="/login" />)
    expect(html).not.toContain('Feature Coming Soon')
    expect(html).toContain('Sign in')
    expect(html).toContain('Partner / Staff Login')
  })

  it('keeps Admin Panel isolated out of the public & tenant application routes and footers', () => {
    const homeHtml = renderToStaticMarkup(<App initialPath="/" />)
    expect(homeHtml).not.toContain('href="/admin"')
    expect(homeHtml).not.toContain('Admin Panel')

    const academyWorkspaceHtml = renderToStaticMarkup(<App initialPath="/workspace/academy/overview" />)
    expect(academyWorkspaceHtml).not.toContain('href="/admin"')
    expect(academyWorkspaceHtml).not.toContain('Admin Panel')

    const adminRouteHtml = renderToStaticMarkup(<App initialPath="/admin" />)
    expect(adminRouteHtml).not.toContain('AdminPreviewPortal')
    expect(adminRouteHtml).not.toContain('Authorized Operator Sign In')
    expect(adminRouteHtml).toContain('This page isn’t here yet.')

    expect(resolvePostAuthTarget(makeUser('academy'), '/admin')).toBe('/workspace/academy/overview')
  })

  it('guards legacy operational routes (/turf-calendar, /tournament-ops, /organizations, /parent-portal, /host) fail-closed', () => {
    for (const guardedPath of ['/turf-calendar', '/tournament-ops', '/organizations', '/parent-portal', '/host']) {
      const html = renderToStaticMarkup(<App initialPath={guardedPath} />)
      expect(html).toContain('Verifying your secure workspace access')
      expect(html).not.toContain('Bengaluru Youth FC')
      expect(html).not.toContain('NCR Elite Cricket')
      expect(html).not.toContain('INV-2026-NOV-042')
      expect(html).not.toContain('Turf &amp; Facility Slot Booking Calendar')
    }
  })
})
