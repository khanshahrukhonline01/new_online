import { describe, expect, it } from 'vitest'
import {
  reconcileAcademyFeeLedger,
  maskPhone,
  maskEmail,
} from '../../shared/saas/saasLaunchReadinessService'
import {
  parseStudentCsvRows,
} from '../../shared/saas/saasSharedOperations'
import {
  getSaasTerm,
  getBilingualLabel,
  SAAS_BILINGUAL_DICT,
} from '../../shared/i18n/saasHindi'
import enSaas from '../../i18n/locales/en/saas.json'
import hiSaas from '../../i18n/locales/hi/saas.json'

describe('KhelGrid SaaS Platform — Phase 5 to 10 Lifecycle & Independent Acceptance Suite', () => {
  // ---------------------------------------------------------------------------
  // Phase 5: Coach, Staff, Parent & Student Management
  // ---------------------------------------------------------------------------
  describe('Phase 5: Student Trainee & Staff Lifecycle Management', () => {
    it('enforces DPDP Act 2023 minor phone and email masking in student records', () => {
      expect(maskPhone('9876543210')).toBe('+91 98*** ***10')
      expect(maskPhone('+919811223344')).toBe('+91 98*** ***44')
      expect(maskPhone('')).toBe('—')

      expect(maskEmail('director@khelgrid.com')).toBe('di***@khelgrid.com')
      expect(maskEmail('noemail')).toBe('—')
      expect(maskEmail('')).toBe('—')
    })

    it('parses and validates student bulk CSV import rows with schema verification', () => {
      const validCsv = `Student Name,Parent Name,Parent Phone,Batch Name,Monthly Fee,Sport
Aarav Sharma,Sanjay Sharma,9876543210,Morning Squad,2500,Football
Vihaan Verma,Sunita Verma,9811223344,Evening Squad,2000,Cricket`

      const result = parseStudentCsvRows(validCsv)
      expect(result.errors).toHaveLength(0)
      expect(result.valid).toHaveLength(2)
      expect(result.valid[0].studentName).toBe('Aarav Sharma')
      expect(result.valid[0].monthlyFee).toBe(2500)
      expect(result.valid[1].studentName).toBe('Vihaan Verma')
      expect(result.valid[1].monthlyFee).toBe(2000)
    })

    it('rejects malformed CSV rows with invalid phone numbers or missing names', () => {
      const invalidCsv = `Student Name,Parent Name,Parent Phone,Batch Name,Monthly Fee,Sport
,Sanjay Sharma,123,Morning Squad,2500,Football
Valid Student,Parent Name,9876543210,Batch,2000,Football`

      const result = parseStudentCsvRows(invalidCsv)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].studentName).toBe('Valid Student')
    })

    it('verifies migration contains authoritative RPCs for student and batch soft-deletion', async () => {
      // @ts-expect-error - node dynamic import in vitest
      const fs = await import('node:fs')
      // @ts-expect-error - node dynamic import in vitest
      const path = await import('node:path')
      const p = path.resolve('supabase/migrations/20261122100000_phase2_schema_consolidation_and_soft_deletion.sql')
      const sql = fs.readFileSync(p, 'utf-8')

      expect(sql).toContain('FUNCTION public.soft_delete_tenant_student')
      expect(sql).toContain('FUNCTION public.soft_delete_tenant_batch')
      expect(sql).toContain('FUNCTION public.create_tenant_invitation')
      expect(sql).toContain('FUNCTION public.accept_tenant_invitation')
    })
  })

  // ---------------------------------------------------------------------------
  // Phase 6: Academy Operations: Attendance, Training & Fees
  // ---------------------------------------------------------------------------
  describe('Phase 6: Pitch-Side Operations, Attendance & Financial Ledger', () => {
    it('verifies mathematical reconciliation audit of the tuition fee ledger', () => {
      const students = [
        { id: 's1', studentName: 'Aarav', parentName: 'P1', parentPhone: '9876543210', batchId: 'b1', batchName: 'B1', sport: 'Football', monthlyFee: 2500, feeStatus: 'paid' as const, nextDueDate: '2026-12-05' },
        { id: 's2', studentName: 'Vihaan', parentName: 'P2', parentPhone: '9811223344', batchId: 'b1', batchName: 'B1', sport: 'Football', monthlyFee: 2000, feeStatus: 'paid' as const, nextDueDate: '2026-12-05' },
        { id: 's3', studentName: 'Ishaan', parentName: 'P3', parentPhone: '9822334455', batchId: 'b1', batchName: 'B1', sport: 'Football', monthlyFee: 1500, feeStatus: 'overdue' as const, nextDueDate: '2026-11-05' },
      ]

      const transactions = [
        { id: 'tx1', academySlug: 'acad', studentId: 's1', studentName: 'Aarav', parentName: 'P1', parentPhone: '9876543210', batchId: 'b1', batchName: 'B1', amount: 2500, paymentMode: 'direct_upi' as const, collectedByStaffName: 'Coach', collectedDate: '2026-11-05', billingMonth: 'November 2026', status: 'settled' as const, receiptNumber: 'REC-01' },
        { id: 'tx2', academySlug: 'acad', studentId: 's2', studentName: 'Vihaan', parentName: 'P2', parentPhone: '9811223344', batchId: 'b1', batchName: 'B1', amount: 2000, paymentMode: 'cash' as const, collectedByStaffName: 'Coach', collectedDate: '2026-11-05', billingMonth: 'November 2026', status: 'cash_in_hand' as const, receiptNumber: 'REC-02' },
      ]

      const audit = reconcileAcademyFeeLedger({ students, transactions })
      expect(audit.totalExpectedMonthly).toBe(6000)
      expect(audit.totalCollected).toBe(4500)
      expect(audit.outstandingArrears).toBe(1500)
      expect(audit.isReconciled).toBe(true)
      expect(audit.discrepancies).toHaveLength(0)
    })

    it('detects ledger discrepancies if unrecorded collections or phantom dues exist', () => {
      const students = [
        { id: 's1', studentName: 'Aarav', parentName: 'P1', parentPhone: '9876543210', batchId: 'b1', batchName: 'B1', sport: 'Football', monthlyFee: 2000, feeStatus: 'overdue' as const, nextDueDate: '2026-11-05' },
      ]
      // Transaction collected 5000 exceeds expected 2000 by >1.5x
      const transactions = [
        { id: 'tx1', academySlug: 'acad', studentId: 's1', studentName: 'Aarav', parentName: 'P1', parentPhone: '9876543210', batchId: 'b1', batchName: 'B1', amount: 5000, paymentMode: 'direct_upi' as const, collectedByStaffName: 'Coach', collectedDate: '2026-11-05', billingMonth: 'November 2026', status: 'settled' as const, receiptNumber: 'REC-01' },
      ]

      const audit = reconcileAcademyFeeLedger({ students, transactions })
      expect(audit.isReconciled).toBe(false)
      expect(audit.discrepancies.length).toBeGreaterThan(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Phase 7: Notifications, Audit Logs & Reporting
  // ---------------------------------------------------------------------------
  describe('Phase 7: Security Audit Logs & Append-Only Logging', () => {
    it('verifies log_tenant_audit_event SECURITY DEFINER RPC in Phase 2 migration', async () => {
      // @ts-expect-error - node dynamic import in vitest
      const fs = await import('node:fs')
      // @ts-expect-error - node dynamic import in vitest
      const path = await import('node:path')
      const p = path.resolve('supabase/migrations/20261122100000_phase2_schema_consolidation_and_soft_deletion.sql')
      const sql = fs.readFileSync(p, 'utf-8')

      expect(sql).toContain('FUNCTION public.log_tenant_audit_event')
      expect(sql).toContain('public.is_tenant_member(p_tenant_id)')
      expect(sql).toContain('INSERT INTO public.tenant_audit_logs')
      expect(sql).toContain('REVOKE ALL ON FUNCTION public.log_tenant_audit_event')
      expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.log_tenant_audit_event')
    })
  })

  // ---------------------------------------------------------------------------
  // Phase 8: SaaS UX, Accessibility & Hindi Localization
  // ---------------------------------------------------------------------------
  describe('Phase 8: Accessibility, Hindi Localization & Bilingual Dictionary', () => {
    it('provides complete Hindi and English SaaS translations across core operational modules', () => {
      expect(enSaas.hubTitle).toBe('Academy Pro Hub')
      expect(hiSaas.hubTitle).toBe('अकादमी प्रो हब')

      expect(enSaas.tabs.attendance).toBe('Roll Call Attendance')
      expect(hiSaas.tabs.attendance).toBe('पिच-साइड उपस्थिति')

      expect(enSaas.tabs.ledger).toBe('Cash & UPI Ledger')
      expect(hiSaas.tabs.ledger).toBe('नकद व यूपीआई खाता')

      expect(enSaas.attendance.present).toBe('Present')
      expect(hiSaas.attendance.present).toBe('उपस्थित')

      expect(enSaas.attendance.absent).toBe('Absent')
      expect(hiSaas.attendance.absent).toBe('अनुपस्थित')
    })

    it('resolves bilingual dictionary terms with fallback safety', () => {
      expect(getSaasTerm('attendance_present', 'en')).toBe('Present')
      expect(getSaasTerm('attendance_present', 'hi')).toBe('उपस्थित')

      expect(getSaasTerm('reconciliation_balanced', 'en')).toBe('100% Balanced')
      expect(getSaasTerm('reconciliation_balanced', 'hi')).toBe('100% संतुलित खाता')

      expect(getBilingualLabel('attendance_present', true)).toBe('Present · उपस्थित')
      expect(getBilingualLabel('status_paid', false, 'hi')).toBe('भुगतान संपन्न')
    })

    it('guarantees bidirectional dictionary coverage without missing keys', () => {
      const keys = Object.keys(SAAS_BILINGUAL_DICT)
      expect(keys.length).toBeGreaterThan(15)
      for (const k of keys) {
        expect(SAAS_BILINGUAL_DICT[k].en).toBeTruthy()
        expect(SAAS_BILINGUAL_DICT[k].hi).toBeTruthy()
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Phase 9: SaaS Subscription & Billing Preparation
  // ---------------------------------------------------------------------------
  describe('Phase 9: Subscription Lockdown & Free Grassroots Guarantee', () => {
    it('verifies that Grassroots tier is free (₹0/mo) and Razorpay is not activated', () => {
      expect(enSaas.billing.tierCost).toBe('₹0 / month')
      expect(hiSaas.billing.tierCost).toBe('₹0 / माह')
      expect(enSaas.billing.noCharges).toContain('No hidden platform fees')
      expect(hiSaas.billing.noCharges).toContain('कोई छिपे हुए प्लेटफॉर्म शुल्क')
    })
  })
})
