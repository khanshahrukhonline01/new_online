import { describe, expect, it } from 'vitest'
import {
  getTenantStorageKey,
  validateTenantAccess,
  canRoleAccessTab,
  maskPhone,
  maskEmail,
  maskGovtId,
  createGuardianConsentRecord,
  reconcileAcademyFeeLedger,
  calculateProratedCancellationRefund,
  generateAcademyDisasterBackup,
  validateAndRestoreAcademyBackup,
  getAcademyPreLaunchChecklist,
  generateSupportConciergeWhatsAppUrl,
  ACADEMY_ROLE_PERMISSIONS,
} from './saasLaunchReadinessService'

describe('SaaS Launch Readiness & Pre-Flight Core Service', () => {
  // Requirement 1: Multi-Tenant Database Isolation
  it('enforces multi-tenant storage key partitioning and blocks cross-tenant access', () => {
    const key1 = getTenantStorageKey('students', 'bengaluru-fc-academy')
    const key2 = getTenantStorageKey('students', 'tata-football-academy')

    expect(key1).toBe('khelgrid_tenant_bengaluru-fc-academy_students')
    expect(key2).toBe('khelgrid_tenant_tata-football-academy_students')
    expect(key1).not.toBe(key2)

    // Validate access guard
    const sameTenant = validateTenantAccess('bengaluru-fc-academy', 'bengaluru-fc-academy')
    expect(sameTenant.allowed).toBe(true)

    const crossTenant = validateTenantAccess('bengaluru-fc-academy', 'tata-football-academy')
    expect(crossTenant.allowed).toBe(false)
    expect(crossTenant.reason).toContain('Tenant isolation violation')
  })

  // Requirement 2: Academy-Specific Permissions
  it('strictly enforces role-based access control across Director, Coach, and Front-Desk', () => {
    // Director has full tab access
    expect(canRoleAccessTab('director', 'ledger')).toBe(true)
    expect(canRoleAccessTab('director', 'staff')).toBe(true)
    expect(ACADEMY_ROLE_PERMISSIONS.director.canManageFinancials).toBe(true)
    expect(ACADEMY_ROLE_PERMISSIONS.director.canEditBankUpi).toBe(true)

    // Head Coach has no access to financial ledger or staff management
    expect(canRoleAccessTab('head_coach', 'ledger')).toBe(false)
    expect(canRoleAccessTab('head_coach', 'staff')).toBe(false)
    expect(canRoleAccessTab('head_coach', 'batches')).toBe(true)
    expect(canRoleAccessTab('head_coach', 'students')).toBe(true)
    expect(ACADEMY_ROLE_PERMISSIONS.head_coach.canManageFinancials).toBe(false)
    expect(ACADEMY_ROLE_PERMISSIONS.head_coach.canMarkAttendance).toBe(true)

    // Front-Desk can record payments and view leads, but cannot delete batches or edit bank UPI
    expect(canRoleAccessTab('front_desk', 'leads')).toBe(true)
    expect(canRoleAccessTab('front_desk', 'ledger')).toBe(true)
    expect(canRoleAccessTab('front_desk', 'safeguarding')).toBe(false)
    expect(ACADEMY_ROLE_PERMISSIONS.front_desk.canRecordPayments).toBe(true)
    expect(ACADEMY_ROLE_PERMISSIONS.front_desk.canEditBankUpi).toBe(false)
  })

  // Requirement 3: Student and Minor Privacy (DPDP Act 2023)
  it('masks sensitive minor PII and records statutory guardian consent', () => {
    expect(maskPhone('9876543210')).toBe('+91 98*** ***10')
    expect(maskEmail('rahul.parent@gmail.com')).toBe('ra***@gmail.com')
    expect(maskGovtId('1234 5678 9012')).toBe('**** **** 9012')

    const consent = createGuardianConsentRecord({
      studentId: 'std-88',
      studentName: 'Vihaan Sharma',
      age: 14,
      guardianName: 'Rajesh Sharma',
      guardianRelationship: 'Father',
      guardianPhone: '9876543210',
    })

    expect(consent.isMinor).toBe(true)
    expect(consent.dpdpConsentVerified).toBe(true)
    expect(consent.guardianRelationship).toBe('Father')
    expect(consent.purpose).toContain('attendance')
  })

  // Requirement 4: Attendance and Fee Accuracy Reconciliation
  it('mathematically reconciles expected tuition fees against cash and UPI collections with zero rounding error', () => {
    const students = [
      { monthlyFee: 2500, feeStatus: 'paid' },
      { monthlyFee: 2500, feeStatus: 'paid' },
      { monthlyFee: 3000, feeStatus: 'due_soon' },
    ]
    const transactions = [
      { amount: 2500, paymentMode: 'cash', status: 'settled' },
      { amount: 2500, paymentMode: 'direct_upi', status: 'settled' },
    ]

    const result = reconcileAcademyFeeLedger({ students, transactions })

    expect(result.totalExpectedMonthly).toBe(8000)
    expect(result.totalCollected).toBe(5000)
    expect(result.cashCollected).toBe(2500)
    expect(result.upiCollected).toBe(2500)
    expect(result.outstandingArrears).toBe(3000)
    expect(result.collectionRatePercent).toBe(63) // 5000 / 8000 = 62.5% -> 63%
    expect(result.isReconciled).toBe(true)
  })

  // Requirement 8: Subscription and Cancellation Controls
  it('calculates fair prorated refunds upon student injury or relocation', () => {
    const injuryRefund = calculateProratedCancellationRefund({
      monthlyFee: 3000,
      totalSessionsInMonth: 12,
      sessionsAttended: 4,
      reason: 'injury',
    })

    // Remaining = 8 / 12 = 66.67% of 3000 = 2000 (100% refund for injury)
    expect(injuryRefund.eligibleRefundAmount).toBe(2000)
    expect(injuryRefund.academyDeduction).toBe(1000)

    const otherRefund = calculateProratedCancellationRefund({
      monthlyFee: 3000,
      totalSessionsInMonth: 12,
      sessionsAttended: 4,
      reason: 'relocation',
    })
    // 90% of 2000 = 1800
    expect(otherRefund.eligibleRefundAmount).toBe(1800)
    expect(otherRefund.academyDeduction).toBe(1200)
  })

  // Requirement 9: Disaster Recovery Backups and Restore
  it('generates an encrypted-style backup archive with checksum and validates restoration', () => {
    const mockData = {
      settings: { upiVpa: 'bengaluru@okhdfcbank' },
      batches: [{ id: 'b-1', name: 'Elite U-14' }],
      students: [{ id: 's-1', name: 'Aarav Sharma' }],
      leads: [],
      staff: [],
      transactions: [],
      passes: [],
      kits: [],
      safeguarding: [],
    }

    const backup = generateAcademyDisasterBackup('bengaluru-fc-academy', 'Bengaluru FC Academy', mockData)

    expect(backup.checksum).toContain('KG-CHK-')
    expect(backup.academySlug).toBe('bengaluru-fc-academy')

    const restore = validateAndRestoreAcademyBackup(JSON.stringify(backup), 'bengaluru-fc-academy')
    expect(restore.success).toBe(true)
    expect(restore.payload).toBeDefined()

    // Test corrupted backup rejection
    const corrupted = { ...backup, checksum: 'KG-CHK-CORRUPT' }
    const failRestore = validateAndRestoreAcademyBackup(JSON.stringify(corrupted), 'bengaluru-fc-academy')
    expect(failRestore.success).toBe(false)
    expect(failRestore.message).toContain('Checksum mismatch')
  })

  // Requirement 10: Guided Onboarding Checklist & Support Concierge
  it('computes pre-launch onboarding progress and constructs direct WhatsApp concierge link', () => {
    const checklist = getAcademyPreLaunchChecklist({
      hasUpiVpa: true,
      hasBatches: true,
      hasStudents: true,
      hasTakenAttendance: false,
      hasConfiguredStaff: false,
    })

    expect(checklist.steps.length).toBe(5)
    expect(checklist.progressPercentage).toBe(60)
    expect(checklist.isReadyForLaunch).toBe(false)

    const fullChecklist = getAcademyPreLaunchChecklist({
      hasUpiVpa: true,
      hasBatches: true,
      hasStudents: true,
      hasTakenAttendance: true,
      hasConfiguredStaff: true,
    })
    expect(fullChecklist.progressPercentage).toBe(100)
    expect(fullChecklist.isReadyForLaunch).toBe(true)

    const conciergeUrl = generateSupportConciergeWhatsAppUrl({
      academyName: 'Bengaluru FC Academy',
      directorName: 'Coach Suresh',
      queryType: 'csv_migration',
    })

    expect(conciergeUrl).toContain('https://wa.me/919876543210')
    expect(conciergeUrl).toContain(encodeURIComponent('Bengaluru FC Academy'))
    expect(conciergeUrl).toContain('Athlyne')
  })
})
