import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetStoredAuthUser,
  mockSignUpWithEmail,
  mockSignInWithEmail,
  mockProvisionInitialTenantOwner,
  mockRegisterCustomAcademy,
  mockRegisterCustomCoach,
  mockSaveTurfVenueSettings,
} = vi.hoisted(() => ({
  mockGetStoredAuthUser: vi.fn(),
  mockSignUpWithEmail: vi.fn(),
  mockSignInWithEmail: vi.fn(),
  mockProvisionInitialTenantOwner: vi.fn(),
  mockRegisterCustomAcademy: vi.fn(),
  mockRegisterCustomCoach: vi.fn(),
  mockSaveTurfVenueSettings: vi.fn(),
}))

vi.mock('../../integrations/supabase/auth-client', () => ({
  getStoredAuthUser: mockGetStoredAuthUser,
  signUpWithEmail: mockSignUpWithEmail,
  signInWithEmail: mockSignInWithEmail,
}))

vi.mock('../../integrations/supabase/tenant-client', () => ({
  provisionInitialTenantOwner: mockProvisionInitialTenantOwner,
}))

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
  normalizePartnerRole,
  onboardPartnerOrganization,
  signInPartnerAccount,
} from './partnerOnboardingService'

describe('partnerOnboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStoredAuthUser.mockReturnValue(null)
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
})
