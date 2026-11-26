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
  createAcademyFeeInvoice,
  generateAcademyUpiPayLink,
  listAcademyFeeInvoices,
  loadAcademyDashboardOverview,
  recordAcademyFeeReceipt,
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

  it('builds valid direct UPI deep links, manages invoices/receipts, and preserves existing tenant settings', async () => {
    const upi = generateAcademyUpiPayLink({
      vpa: 'academy@oksbi',
      name: 'Apex Academy',
      amount: 2500,
      note: 'December Fee',
    })
    expect(upi).toBe(
      'upi://pay?pa=academy%40oksbi&pn=Apex%20Academy&am=2500&cu=INR&tn=December%20Fee',
    )

    const orderCalls: unknown[] = []
    const insertInvoiceSpy = vi.fn().mockResolvedValue({ error: null })
    const insertTxSpy = vi.fn().mockResolvedValue({ error: null })
    const eqStudentSpy = vi.fn().mockResolvedValue({ error: null })
    const eqTenantSpy = vi.fn().mockReturnValue({ eq: eqStudentSpy })
    const updateInvoiceSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })
    const updateTenantEqSpy = vi.fn().mockResolvedValue({ error: null })
    const updateTenantSpy = vi.fn().mockReturnValue({ eq: updateTenantEqSpy })

    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-fin' } }, error: null }) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tenant_fee_invoices') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: async () => {
                    orderCalls.push(true)
                    return {
                      data: [
                        {
                          id: 'inv-1',
                          tenant_id: 't-1',
                          student_id: 'stu-1',
                          invoice_number: 'INV-202612-0001',
                          amount: 3000,
                          billing_month: '2026-12',
                          due_date: '2026-12-05',
                          status: 'issued',
                          created_at: '2026-12-01T00:00:00Z',
                          updated_at: '2026-12-01T00:00:00Z',
                        },
                      ],
                      error: null,
                    }
                  },
                }),
              }),
            }),
            insert: insertInvoiceSpy,
            update: updateInvoiceSpy,
          }
        }
        if (table === 'tenant_fee_transactions') {
          return { insert: insertTxSpy }
        }
        if (table === 'tenant_students') {
          return { update: () => ({ eq: eqTenantSpy }) }
        }
        if (table === 'tenants') {
          return { update: updateTenantSpy }
        }
        return {}
      }),
    } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

    const invoices = await listAcademyFeeInvoices('t-1')
    expect(orderCalls).toHaveLength(1)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].invoiceNumber).toBe('INV-202612-0001')

    const invRes = await createAcademyFeeInvoice({
      tenantId: 't-1',
      studentId: 'stu-1',
      amount: 3000,
      billingMonth: '2026-12',
      dueDate: '2026-12-05',
    })
    expect(invRes.success).toBe(true)
    expect(insertInvoiceSpy).toHaveBeenCalledTimes(1)

    const settleRes = await recordAcademyFeeReceipt({
      tenantId: 't-1',
      studentId: 'stu-1',
      invoiceId: 'inv-1',
      amount: 3000,
      paymentMode: 'direct_upi',
      collectedByName: 'Finance Lead',
      billingMonth: '2026-12',
    })
    expect(settleRes.success).toBe(true)
    expect(updateInvoiceSpy).toHaveBeenCalledTimes(1)

    const saveRes = await saveAcademySecuritySettings('t-1', {
      upiVpa: 'apex@oksbi',
      dpdpMaskMinorsDefault: true,
      emergencyHotline: '9900112233',
      pocsoOfficerName: 'Meera Nair',
      existingSettings: { customFlag: 'keep-me' },
    })
    expect(saveRes.success).toBe(true)
    expect(updateTenantSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        upi_vpa: 'apex@oksbi',
        settings: expect.objectContaining({
          customFlag: 'keep-me',
          dpdpMaskMinorsDefault: true,
          emergencyHotline: '9900112233',
          pocsoOfficerName: 'Meera Nair',
          onlineGatewayPaused: true,
        }),
      }),
    )
  })
})
