import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearParentPortalMemoryStore,
  getParentStudentProfiles,
  getStudentAttendanceHistory,
  getStudentFeeInvoices,
  recordParentUpiPayment,
  generateDirectUpiDeepLink,
  generateParentFeeWhatsAppShareUrl,
  generateStudentGroundPassQrPayload,
} from './parentPortalService'

describe('Parent & Athlete Portal Service', () => {
  beforeEach(() => {
    clearParentPortalMemoryStore()
  })

  it('retrieves student profiles and filters by phone or student id', () => {
    const all = getParentStudentProfiles()
    expect(all.length).toBeGreaterThanOrEqual(3)

    const filtered = getParentStudentProfiles('st-01')
    expect(filtered.length).toBe(1)
    expect(filtered[0].studentName).toBe('Aarav Sharma')

    const phoneFilter = getParentStudentProfiles('9811223344')
    expect(phoneFilter.length).toBe(1)
    expect(phoneFilter[0].studentName).toBe('Vihaan Verma')
  })

  it('retrieves attendance session history for a student', () => {
    const sessions = getStudentAttendanceHistory('st-01')
    expect(sessions.length).toBeGreaterThan(0)
    expect(sessions.some(s => s.status === 'PRESENT')).toBe(true)
  })

  it('retrieves fee invoices and completes direct UPI payment settlement', () => {
    const invoices = getStudentFeeInvoices('st-01')
    expect(invoices.length).toBeGreaterThan(0)

    const pending = invoices.find(i => i.status === 'PENDING')!
    expect(pending).toBeDefined()

    const payRes = recordParentUpiPayment(pending.invoiceId, 'UPI-REF-TEST-1234')
    expect(payRes.success).toBe(true)
    expect(payRes.invoice?.status).toBe('PAID')
    expect(payRes.invoice?.transactionRef).toBe('UPI-REF-TEST-1234')

    const updatedList = getStudentFeeInvoices('st-01')
    const updatedInv = updatedList.find(i => i.invoiceId === pending.invoiceId)
    expect(updatedInv?.status).toBe('PAID')
  })

  it('generates direct zero-commission UPI link and WhatsApp shareable advice', () => {
    const student = getParentStudentProfiles('st-01')[0]
    const invoice = getStudentFeeInvoices('st-01')[0]

    const upiLink = generateDirectUpiDeepLink(invoice, student)
    expect(upiLink).toMatch(/^upi:\/\/pay\?/)
    expect(upiLink).toContain(encodeURIComponent(student.academyUpiVpa))
    expect(upiLink).toContain(`am=${invoice.netAmount}`)

    const waUrl = generateParentFeeWhatsAppShareUrl(invoice, student)
    expect(waUrl).toContain('https://wa.me/?text=')
    expect(waUrl).toContain(encodeURIComponent(student.studentName))
  })

  it('generates verifiable student ground pass QR payload for turnstile check-in', () => {
    const student = getParentStudentProfiles('st-01')[0]
    const qrPayload = generateStudentGroundPassQrPayload(student)
    const parsed = JSON.parse(qrPayload)
    expect(parsed.kind).toBe('STUDENT_GROUND_PASS')
    expect(parsed.roll).toBe(student.rollNumber)
    expect(parsed.academy).toBe(student.academyName)
  })
})
