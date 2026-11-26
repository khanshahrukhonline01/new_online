import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as realtimeModule from '../../integrations/supabase/realtime-client'
import {
  canAccessAcademySection,
  getAcademyRoleCapabilities,
  resolveAcademyRoleTier,
  resolveAcademyRouteTarget,
} from './academyHubTypes'
import {
  calculateAcademyProfileCompleteness,
  loadAcademyDashboardOverview,
  saveAcademySecuritySettings,
  type AcademyProfileRecord,
} from './academyWorkspaceClient'

describe('Academy Workspace Client & 7-Role RBAC Matrix', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('maps all 7 Academy SaaS roles onto strict capabilities without cross-role leakage', () => {
    const owner = getAcademyRoleCapabilities('owner')
    expect(owner.tier).toBe('academy_owner')
    expect(owner.canTransferOwnership).toBe(true)
    expect(owner.canManageFinance).toBe(true)
    expect(owner.canManageStaff).toBe(true)

    const admin = getAcademyRoleCapabilities('org_admin')
    expect(admin.tier).toBe('academy_administrator')
    expect(admin.canTransferOwnership).toBe(false)
    expect(admin.canManageStaff).toBe(true)

    const manager = getAcademyRoleCapabilities('manager')
    expect(manager.tier).toBe('academy_manager')
    expect(manager.isBranchScopedCapable).toBe(true)
    expect(manager.canManageBranches).toBe(true)
    expect(manager.canViewFinance).toBe(false)

    const admissions = getAcademyRoleCapabilities('admissions_manager')
    expect(admissions.tier).toBe('admissions_manager')
    expect(admissions.canManageAdmissions).toBe(true)
    expect(admissions.canManageFinance).toBe(false)
    expect(admissions.canManageCoaches).toBe(false)

    const coach = getAcademyRoleCapabilities('coach')
    expect(coach.tier).toBe('coach_staff')
    expect(coach.canMarkAttendance).toBe(true)
    expect(coach.canManageTraining).toBe(true)
    expect(coach.canViewFinance).toBe(false)
    expect(canAccessAcademySection('coach', 'fees')).toBe(false)
    expect(canAccessAcademySection('coach', 'staff')).toBe(false)

    const finance = getAcademyRoleCapabilities('finance_manager')
    expect(finance.tier).toBe('finance_manager')
    expect(finance.canViewFinance).toBe(true)
    expect(finance.canManageFinance).toBe(true)
    expect(finance.canManageTraining).toBe(false)
    expect(canAccessAcademySection('finance_manager', 'fees')).toBe(true)
    expect(canAccessAcademySection('finance_manager', 'training')).toBe(false)

    const readonly = getAcademyRoleCapabilities('readonly_member')
    expect(readonly.tier).toBe('readonly_staff')
    expect(readonly.isReadOnly).toBe(true)
    expect(readonly.canManageAthletes).toBe(false)
    expect(readonly.canMarkAttendance).toBe(false)
    expect(readonly.canViewFinance).toBe(false)

    expect(resolveAcademyRoleTier('front_desk')).toBe('admissions_manager')
    expect(resolveAcademyRoleTier('accountant')).toBe('finance_manager')
  })

  it('resolves /academy-hub subpaths and WorkspaceShell sections deterministically', () => {
    expect(resolveAcademyRouteTarget('/academy-hub')).toEqual({ section: 'overview', detailId: null })
    expect(resolveAcademyRouteTarget('/academy-hub/admissions')).toEqual({ section: 'admissions', detailId: null })
    expect(resolveAcademyRouteTarget('/academy-hub/athletes/stu-123')).toEqual({
      section: 'athletes',
      detailId: 'stu-123',
    })
    expect(resolveAcademyRouteTarget('/workspace/academy/batches', 'batches')).toEqual({
      section: 'training',
      detailId: null,
    })
    expect(resolveAcademyRouteTarget('/workspace/academy/coaches', 'coaches')).toEqual({
      section: 'coaches',
      detailId: null,
    })
  })

  it('calculates genuine profile completeness from real filled attributes', () => {
    expect(calculateAcademyProfileCompleteness(null).percent).toBe(0)

    const partial: AcademyProfileRecord = {
      id: 'p-1',
      tenantId: 't-1',
      directoryAcademyId: null,
      slug: 'elite-sports',
      displayName: 'Elite Sports Academy',
      tagline: '',
      description: 'Dedicated high performance grassroots development academy.',
      sportsOffered: ['Football'],
      foundedYear: 2019,
      affiliations: [],
      ageGroups: ['U-13', 'U-15'],
      skillLevels: ['beginner'],
      feeStructure: [],
      trainingMethodology: '',
      facilitiesSummary: [],
      operatingHours: '',
      contactPhone: '9800001111',
      contactEmail: '',
      websiteUrl: null,
      socialLinks: {},
      mediaGallery: [],
      logoUrl: null,
      bannerUrl: null,
      city: 'Bengaluru',
      state: 'Karnataka',
      isPubliclyListed: false,
      seoTitle: '',
      seoDescription: '',
      verificationStatus: 'unverified',
      moderationNote: null,
      verifiedAt: null,
      lastSubmittedAt: null,
      createdAt: '',
      updatedAt: '',
    }

    const res = calculateAcademyProfileCompleteness(partial)
    expect(res.percent).toBe(75)
    expect(res.missing).toContain('Training methodology')
    expect(res.missing).toContain('Fee schedule')
  })

  it('fails closed cleanly when database client or UPI VPA validation fails', async () => {
    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue(null)
    const ov = await loadAcademyDashboardOverview('tenant-1')
    expect(ov.overview).toBeNull()
    expect(ov.error).toContain('unavailable')

    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      from: vi.fn(),
    } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

    const invalidVpa = await saveAcademySecuritySettings('tenant-1', {
      upiVpa: 'invalid-no-at-sign',
      dpdpMaskMinorsDefault: true,
      emergencyHotline: '',
      pocsoOfficerName: '',
    })
    expect(invalidVpa.success).toBe(false)
    expect(invalidVpa.message).toContain('UPI VPA')
  })
})
