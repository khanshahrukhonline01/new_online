import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetStoredAuthUser,
  mockGetSupabaseClient,
  mockSignUpWithEmail,
  mockSignInWithEmail,
  mockProvisionInitialTenantOwner,
  mockTryFetchUserTenantMemberships,
  mockGetPendingTenantMemberships,
  mockAcceptTenantInvitation,
  mockRegisterCustomAcademy,
  mockRegisterCustomCoach,
  mockSaveTurfVenueSettings,
} = vi.hoisted(() => ({
  mockGetStoredAuthUser: vi.fn(),
  mockGetSupabaseClient: vi.fn(),
  mockSignUpWithEmail: vi.fn(),
  mockSignInWithEmail: vi.fn(),
  mockProvisionInitialTenantOwner: vi.fn(),
  mockTryFetchUserTenantMemberships: vi.fn(),
  mockGetPendingTenantMemberships: vi.fn(),
  mockAcceptTenantInvitation: vi.fn(),
  mockRegisterCustomAcademy: vi.fn(),
  mockRegisterCustomCoach: vi.fn(),
  mockSaveTurfVenueSettings: vi.fn(),
}))

vi.mock('../../integrations/supabase/realtime-client', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}))

vi.mock('../../integrations/supabase/auth-client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../integrations/supabase/auth-client')>()
  return {
    ...actual,
    getStoredAuthUser: mockGetStoredAuthUser,
    signUpWithEmail: mockSignUpWithEmail,
    signInWithEmail: mockSignInWithEmail,
  }
})

vi.mock('../../integrations/supabase/tenant-client', async importOriginal => {
  const actual = await importOriginal<typeof import('../../integrations/supabase/tenant-client')>()
  return {
    ...actual,
    provisionInitialTenantOwner: mockProvisionInitialTenantOwner,
    tryFetchUserTenantMemberships: mockTryFetchUserTenantMemberships,
    getPendingTenantMemberships: mockGetPendingTenantMemberships,
    acceptTenantInvitation: mockAcceptTenantInvitation,
  }
})

vi.mock('../academies/academySaaSClient', () => ({
  registerCustomAcademy: mockRegisterCustomAcademy,
}))

vi.mock('../coaches/coachSaaSClient', () => ({
  registerCustomCoach: mockRegisterCustomCoach,
}))

vi.mock('../venues/turfSlotManager', () => ({
  saveTurfVenueSettings: mockSaveTurfVenueSettings,
}))

import {
  completePartnerEmailVerification,
  normalizePartnerRole,
  onboardPartnerOrganization,
  signInPartnerAccount,
} from './partnerOnboardingService'

describe('partnerOnboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProvisionInitialTenantOwner.mockReset()
    mockGetStoredAuthUser.mockReturnValue(null)
    mockGetSupabaseClient.mockReturnValue(null)
    mockTryFetchUserTenantMemberships.mockResolvedValue([])
    mockGetPendingTenantMemberships.mockResolvedValue([])
    mockRegisterCustomAcademy.mockImplementation((params: { name: string }) => ({
      slug: params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: params.name,
    }))
    mockRegisterCustomCoach.mockImplementation((params: { name: string }) => ({
      slug: params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: params.name,
    }))
  })

  it('normalizes legacy and role query aliases to canonical partner roles', () => {
    expect(normalizePartnerRole('academy')).toBe('academy')
    expect(normalizePartnerRole('coach')).toBe('coach')
    expect(normalizePartnerRole('turf')).toBe('venue')
    expect(normalizePartnerRole('host')).toBe('venue')
    expect(normalizePartnerRole('venue_owner')).toBe('venue')
    expect(normalizePartnerRole('tournament')).toBe('tournament')
    expect(normalizePartnerRole('unknown')).toBe('academy')
  })

  it.each([
    {
      role: 'academy' as const,
      expectedAuthRole: 'academy',
      expectedTenantType: 'academy',
      expectedBasePath: '/workspace/academy/overview',
      entityName: 'Apex Cricket Academy',
    },
    {
      role: 'coach' as const,
      expectedAuthRole: 'coach',
      expectedTenantType: 'coach',
      expectedBasePath: '/workspace/coach/overview',
      entityName: 'Coach Zaheer Farooq',
    },
    {
      role: 'venue' as const,
      expectedAuthRole: 'venue_owner',
      expectedTenantType: 'venue',
      expectedBasePath: '/workspace/turf/calendar',
      entityName: 'Kanteerava Turf Arena',
    },
    {
      role: 'tournament' as const,
      expectedAuthRole: 'host',
      expectedTenantType: 'tournament',
      expectedBasePath: '/workspace/tournament/overview',
      entityName: 'National Youth Cup 2026',
    },
  ])(
    'authenticates and provisions multi-tenant ownership for role "$role"',
    async ({ role, expectedAuthRole, expectedTenantType, expectedBasePath, entityName }) => {
      mockSignUpWithEmail.mockResolvedValue({
        success: true,
        requiresEmailVerification: false,
        user: {
          id: 'user-123',
          email: 'partner@khelgrid.com',
          fullName: 'Director Name',
          name: 'Director Name',
          role: expectedAuthRole,
          isVerified: true,
          createdAt: '2026-11-25T00:00:00Z',
        },
      })
      mockProvisionInitialTenantOwner.mockResolvedValue({
        success: true,
        tenantId: `tenant-${role}-1`,
        message: 'Provisioned',
      })

      const outcome = await onboardPartnerOrganization({
        role,
        entityName,
        directorName: 'Director Name',
        sport: 'Cricket',
        city: 'Bengaluru',
        phone: '9876543210',
        email: 'partner@khelgrid.com',
        password: 'securePassword123',
        upiVpa: 'partner@okaxis',
        certification: role === 'coach' ? 'BCCI Level 2' : undefined,
      })

      expect(mockSignUpWithEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'partner@khelgrid.com',
          role: expectedAuthRole,
          city: 'Bengaluru',
          phone: '9876543210',
          redirectTo: '/partner/verify',
          partnerOnboarding: expect.objectContaining({
            version: 1,
            role,
            entityName,
            city: 'Bengaluru',
            phone: '9876543210',
          }),
        })
      )
      expect(mockProvisionInitialTenantOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantType: expectedTenantType,
          name: entityName,
          city: 'Bengaluru',
          sport: 'Cricket',
        })
      )
      expect(outcome.success).toBe(true)
      expect(outcome.tenantId).toBe(`tenant-${role}-1`)
      expect(outcome.workspacePath?.startsWith(`${expectedBasePath}?tenant=`)).toBe(true)
    }
  )

  it('does not treat a cached local profile as an authenticated partner session', async () => {
    mockGetStoredAuthUser.mockReturnValue({
      id: 'cached-user',
      email: 'cached@khelgrid.com',
      fullName: 'Cached User',
      name: 'Cached User',
      role: 'academy',
      isVerified: true,
      createdAt: '2026-11-20T00:00:00Z',
    })
    mockSignUpWithEmail.mockResolvedValue({
      success: true,
      requiresEmailVerification: true,
      message: 'Verification email sent',
    })

    const outcome = await onboardPartnerOrganization({
      role: 'academy',
      entityName: 'Cached Academy',
      sport: 'Football',
      city: 'Delhi NCR',
      phone: '9876543210',
      email: 'cached@khelgrid.com',
      password: 'password123',
    })

    expect(mockSignUpWithEmail).toHaveBeenCalled()
    expect(outcome.requiresEmailVerification).toBe(true)
    expect(mockProvisionInitialTenantOwner).not.toHaveBeenCalled()
  })

  it('halts provisioning and returns verification status when email confirmation is required', async () => {
    mockSignUpWithEmail.mockResolvedValue({
      success: true,
      requiresEmailVerification: true,
      user: {
        id: 'user-pending',
        email: 'pending@khelgrid.com',
        fullName: 'Pending Director',
        name: 'Pending Director',
        role: 'academy',
        isVerified: false,
        createdAt: '2026-11-25T00:00:00Z',
      },
    })

    const outcome = await onboardPartnerOrganization({
      role: 'academy',
      entityName: 'Rising Star Academy',
      sport: 'Football',
      city: 'Mumbai',
      phone: '9876543210',
      email: 'pending@khelgrid.com',
      password: 'password123',
    })

    expect(outcome.success).toBe(true)
    expect(outcome.requiresEmailVerification).toBe(true)
    expect(mockProvisionInitialTenantOwner).not.toHaveBeenCalled()
    expect(mockRegisterCustomAcademy).not.toHaveBeenCalled()
  })

  it('allows an already-authenticated user to provision a tenant without calling signUpWithEmail', async () => {
    mockGetStoredAuthUser.mockReturnValue({
      id: 'existing-user-1',
      email: 'owner@khelgrid.com',
      fullName: 'Existing Owner',
      name: 'Existing Owner',
      role: 'academy',
      isVerified: true,
      createdAt: '2026-11-20T00:00:00Z',
    })
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: {
            id: 'existing-user-1',
            email: 'owner@khelgrid.com',
            email_confirmed_at: '2026-11-20T00:00:00Z',
            user_metadata: { full_name: 'Existing Owner' },
          } },
          error: null,
        }),
      },
    })
    mockProvisionInitialTenantOwner.mockResolvedValue({
      success: true,
      tenantId: 'tenant-venue-99',
      message: 'Provisioned',
    })

    const outcome = await onboardPartnerOrganization({
      role: 'venue',
      entityName: 'Metro Box Turf',
      sport: 'Football',
      city: 'Pune',
      phone: '9876543210',
      email: '',
    })

    expect(mockSignUpWithEmail).not.toHaveBeenCalled()
    expect(mockSaveTurfVenueSettings).toHaveBeenCalledTimes(1)
    expect(mockProvisionInitialTenantOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantType: 'venue',
        slug: 'metro-box-turf',
        contactEmail: 'owner@khelgrid.com',
      })
    )
    expect(outcome.success).toBe(true)
    expect(outcome.workspacePath).toBe('/workspace/turf/calendar?tenant=metro-box-turf')
  })

  it('retries tenant provisioning once if slug collision occurs', async () => {
    mockGetStoredAuthUser.mockReturnValue({
      id: 'existing-user-1',
      email: 'owner@khelgrid.com',
      fullName: 'Existing Owner',
      name: 'Existing Owner',
      role: 'host',
      isVerified: true,
      createdAt: '2026-11-20T00:00:00Z',
    })
    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: {
            id: 'existing-user-1',
            email: 'owner@khelgrid.com',
            email_confirmed_at: '2026-11-20T00:00:00Z',
            user_metadata: { full_name: 'Existing Owner' },
          } },
          error: null,
        }),
      },
    })
    mockProvisionInitialTenantOwner
      .mockResolvedValueOnce({ success: false, message: 'duplicate key value violates unique constraint (23505)' })
      .mockResolvedValueOnce({ success: true, tenantId: 'tenant-tour-retry', message: 'Provisioned' })

    const outcome = await onboardPartnerOrganization({
      role: 'tournament',
      entityName: 'Super League',
      sport: 'Cricket',
      city: 'Delhi NCR',
      phone: '9876543210',
      email: 'owner@khelgrid.com',
    })

    expect(mockProvisionInitialTenantOwner).toHaveBeenCalledTimes(2)
    expect(outcome.success).toBe(true)
    expect(outcome.entitySlug?.startsWith('super-league-')).toBe(true)
  })

  it('authenticates existing partners through signInWithEmail without bypasses', async () => {
    mockSignInWithEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'coach-user-1',
        email: 'coach@khelgrid.com',
        fullName: 'Coach Vikram',
        name: 'Coach Vikram',
        role: 'coach',
        isVerified: true,
        createdAt: '2026-11-20T00:00:00Z',
      },
    })

    const res = await signInPartnerAccount({
      role: 'coach',
      email: 'coach@khelgrid.com',
      password: 'password123',
    })

    expect(mockSignInWithEmail).toHaveBeenCalledWith({
      email: 'coach@khelgrid.com',
      password: 'password123',
      useMagicLink: undefined,
    })
    expect(res.success).toBe(true)
    expect(res.workspacePath).toBe('/workspace/coach/overview')

    const failedValidation = await signInPartnerAccount({
      role: 'coach',
      email: 'invalid-email',
      password: '123',
    })
    expect(failedValidation.success).toBe(false)
  })

  it('normalizes organization aliases and provisions custom institutional tenant types', async () => {
    expect(normalizePartnerRole('organization')).toBe('organization')
    expect(normalizePartnerRole('federation')).toBe('organization')
    expect(normalizePartnerRole('club')).toBe('organization')
    expect(normalizePartnerRole('school')).toBe('organization')
    expect(normalizePartnerRole('event_organizer')).toBe('tournament')

    mockGetStoredAuthUser.mockReturnValue(null)
    mockSignUpWithEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'org-user-1',
        email: 'secretary@delhiathletics.in',
        fullName: 'Ananya Deshmukh',
        name: 'Ananya Deshmukh',
        role: 'organization',
        isVerified: true,
        createdAt: '2026-11-26T00:00:00Z',
      },
    })
    mockProvisionInitialTenantOwner.mockResolvedValue({
      success: true,
      tenantId: 'tenant-fed-1',
      message: 'Provisioned',
    })

    const res = await onboardPartnerOrganization({
      role: 'organization',
      organizationType: 'federation',
      entityName: 'Delhi State Athletics Association',
      directorName: 'Ananya Deshmukh',
      sport: 'Athletics',
      city: 'Delhi NCR',
      phone: '9876543210',
      email: 'secretary@delhiathletics.in',
      password: 'password123',
    })

    expect(mockSignUpWithEmail).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'organization' }),
    )
    expect(mockProvisionInitialTenantOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantType: 'federation',
        slug: 'delhi-state-athletics-association',
      }),
    )
    expect(res.success).toBe(true)
    expect(res.workspacePath).toBe('/workspace/organization/overview?tenant=delhi-state-athletics-association')
  })

  it('resolves multi-tenant memberships and pending invites cleanly during partner sign-in', async () => {
    mockTryFetchUserTenantMemberships.mockResolvedValue([
      {
        id: 'm1',
        tenant_id: 't1',
        user_id: 'multi-1',
        role: 'owner',
        status: 'active',
        created_at: '2026-11-26T00:00:00Z',
        tenant: {
          id: 't1',
          slug: 'alpha-academy',
          name: 'Alpha Academy',
          tenant_type: 'academy',
          status: 'active',
          metadata: {},
          created_at: '2026-11-26T00:00:00Z',
          updated_at: '2026-11-26T00:00:00Z',
        },
      },
      {
        id: 'm2',
        tenant_id: 't2',
        user_id: 'multi-1',
        role: 'director',
        status: 'active',
        created_at: '2026-11-26T00:00:00Z',
        tenant: {
          id: 't2',
          slug: 'metro-turf',
          name: 'Metro Turf',
          tenant_type: 'venue',
          status: 'active',
          metadata: {},
          created_at: '2026-11-26T00:00:00Z',
          updated_at: '2026-11-26T00:00:00Z',
        },
      },
    ])
    mockGetPendingTenantMemberships.mockResolvedValue([])
    mockSignInWithEmail.mockResolvedValue({
      success: true,
      user: {
        id: 'multi-1',
        email: 'multi@khelgrid.com',
        fullName: 'Multi Owner',
        name: 'Multi Owner',
        role: 'academy',
        isVerified: true,
        createdAt: '2026-11-26T00:00:00Z',
      },
    })

    const res = await signInPartnerAccount({
      role: 'academy',
      email: 'multi@khelgrid.com',
      password: 'password123',
    })

    expect(res.success).toBe(true)
    expect(res.workspacePath).toBeUndefined()
    expect(res.memberships).toHaveLength(2)
  })

  it('deduplicates concurrent completePartnerEmailVerification calls and forwards idempotency_key', async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'verify-user-99',
          email: 'founder@new-academy.in',
          email_confirmed_at: '2026-11-27T12:00:00Z',
          user_metadata: {
            full_name: 'Founder Rao',
            khelgrid_partner_onboarding: {
              version: 1,
              role: 'academy',
              entityName: 'New Generation Sports Academy',
              city: 'Pune',
              sport: 'Badminton',
              phone: '9876543210',
            },
          },
        },
      },
      error: null,
    })
    const orderMock = vi.fn().mockResolvedValue({ data: [], error: null })
    const eqStatusMock = vi.fn(() => ({ order: orderMock }))
    const eqUserMock = vi.fn(() => ({ eq: eqStatusMock }))
    const selectMock = vi.fn(() => ({ eq: eqUserMock }))
    const fromMock = vi.fn(() => ({ select: selectMock }))

    mockGetSupabaseClient.mockReturnValue({ auth: { getUser: getUserMock }, from: fromMock })
    mockTryFetchUserTenantMemberships.mockResolvedValue([])
    mockProvisionInitialTenantOwner.mockResolvedValue({
      success: true,
      tenantId: 'tenant-idemp-99',
      message: 'Provisioned',
    })

    const [r1, r2] = await Promise.all([
      completePartnerEmailVerification(),
      completePartnerEmailVerification(),
    ])

    expect(getUserMock).toHaveBeenCalledTimes(1)
    expect(mockProvisionInitialTenantOwner).toHaveBeenCalledTimes(1)
    expect(mockProvisionInitialTenantOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: 'verified_partner_email_onboarding',
          idempotency_key: 'verify-v1:verify-user-99:academy:new-generation-sports-academy',
        }),
      }),
    )
    expect(r1).toEqual(r2)
    expect(r1.success).toBe(true)
    expect(r1.tenantId).toBe('tenant-idemp-99')
  })
})
