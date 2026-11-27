import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as realtimeModule from '../../integrations/supabase/realtime-client'
import {
  clearParentPortalMemoryStore,
  getParentStudentProfiles,
  getRemoteParentStudentProfiles,
  getRemoteStudentAttendanceHistory,
  getRemoteStudentFeeInvoices,
  getStudentFeeInvoices,
  recordParentUpiPayment,
  submitParentUpiProofRemote,
  generateDirectUpiDeepLink,
  generateParentFeeWhatsAppShareUrl,
  generateStudentGroundPassQrPayload,
} from './parentPortalService'

describe('Parent & Athlete Portal Service', () => {
  beforeEach(() => {
    clearParentPortalMemoryStore()
    vi.restoreAllMocks()
  })

  it('fails closed in remote guardian queries and never falls back to demo student fixtures', async () => {
    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue(null)
    expect(await getRemoteParentStudentProfiles()).toEqual([])
    expect(await getRemoteStudentAttendanceHistory('st-01')).toEqual([])
    expect(await getRemoteStudentFeeInvoices('st-01')).toEqual([])

    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)
    expect(await getRemoteParentStudentProfiles()).toEqual([])
  })

  it('fetches authorized guardian students scoped strictly by auth.uid()', async () => {
    const eqDeleted = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'stu-live-1',
          student_name: 'Riya Kapoor',
          roll_number: 'KA-101',
          parent_name: 'Meera Kapoor',
          parent_phone: '+919800001122',
          monthly_fee: 3000,
          tenant: { slug: 'karnataka-academy', name: 'Karnataka Academy', upi_vpa: 'ka@okicici', sport: 'Athletics' },
          batch: { batch_name: 'Sprint Group A', sport: 'Athletics', coach_name: 'Coach Suresh' },
        },
      ],
      error: null,
    })
    const eqGuardian = vi.fn().mockReturnValue({ is: eqDeleted })
    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'guardian-uuid-1' } }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: eqGuardian }),
      }),
    } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

    const remoteStudents = await getRemoteParentStudentProfiles()
    expect(eqGuardian).toHaveBeenCalledWith('guardian_user_id', 'guardian-uuid-1')
    expect(remoteStudents).toHaveLength(1)
    expect(remoteStudents[0].studentName).toBe('Riya Kapoor')
  })

  it('marks UTR submissions as PENDING_VERIFICATION rather than forging PAID status', async () => {
    const invoices = getStudentFeeInvoices('st-01')
    const pending = invoices.find(i => i.status === 'PENDING')!
    expect(pending).toBeDefined()

    const shortUtr = recordParentUpiPayment(pending.invoiceId, '12')
    expect(shortUtr.success).toBe(false)

    const payRes = recordParentUpiPayment(pending.invoiceId, 'UTR431289012345')
    expect(payRes.success).toBe(true)
    expect(payRes.invoice?.status).toBe('PENDING_VERIFICATION')
    expect(payRes.invoice?.status).not.toBe('PAID')
    expect(payRes.invoice?.transactionRef).toBe('UTR431289012345')

    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue(null)
    const remoteRes = await submitParentUpiProofRemote({ invoiceId: pending.invoiceId, utrRef: 'UTR431289012345' })
    expect(remoteRes.success).toBe(false)
    expect(remoteRes.status).toBe('PENDING_VERIFICATION')
  })

  it('generates direct zero-commission UPI link, WhatsApp advice, and QR ground pass from explicit student/invoice fixtures', () => {
    const student = getParentStudentProfiles('st-01')[0]
    const invoice = getStudentFeeInvoices('st-01')[0]

    const upiLink = generateDirectUpiDeepLink(invoice, student)
    expect(upiLink).toMatch(/^upi:\/\/pay\?/)
    expect(upiLink).toContain(encodeURIComponent(student.academyUpiVpa))
    expect(upiLink).toContain(`am=${invoice.netAmount}`)

    const waUrl = generateParentFeeWhatsAppShareUrl(invoice, student)
    expect(waUrl).toContain('https://wa.me/?text=')
    expect(waUrl).toContain(encodeURIComponent(student.studentName))

    const qrPayload = generateStudentGroundPassQrPayload(student)
    const parsed = JSON.parse(qrPayload)
    expect(parsed.kind).toBe('STUDENT_GROUND_PASS')
    expect(parsed.roll).toBe(student.rollNumber)
    expect(parsed.academy).toBe(student.academyName)
  })
})
