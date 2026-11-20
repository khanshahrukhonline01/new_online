import { describe, expect, it, beforeEach } from 'vitest'
import {
  splitCsvLine,
  parseStudentCsvRows,
  parseCoachTraineeCsvRows,
  getSampleStudentCsv,
  getSampleCoachTraineeCsv,
  getDailyAttendance,
  saveDailyAttendance,
  generateWhatsAppAttendanceAlertUrl,
  generateDigitalFeeReceipt,
  generateWhatsAppReceiptMessageUrl,
  generateWhatsAppShareProfileUrl,
} from './saasSharedOperations'

describe('KhelGrid Shared SaaS Operations Service', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  describe('CSV Parsing & Importing', () => {
    it('splits CSV lines respecting quoted commas', () => {
      const line = '"Sharma, Aarav",Rajesh Sharma,9811223344,"Morning Squad, Elite",3500'
      const parts = splitCsvLine(line)
      expect(parts).toHaveLength(5)
      expect(parts[0]).toBe('Sharma, Aarav')
      expect(parts[1]).toBe('Rajesh Sharma')
      expect(parts[2]).toBe('9811223344')
      expect(parts[3]).toBe('Morning Squad, Elite')
      expect(parts[4]).toBe('3500')
    })

    it('parses valid student rows and ignores comment headers', () => {
      const sample = getSampleStudentCsv()
      const { valid, errors } = parseStudentCsvRows(sample)
      expect(errors).toHaveLength(0)
      expect(valid.length).toBeGreaterThanOrEqual(4)
      expect(valid[0].studentName).toBe('Aarav Sharma')
      expect(valid[0].parentPhone).toBe('9811223344')
      expect(valid[0].monthlyFee).toBe(3500)
    })

    it('catches invalid phone numbers in CSV', () => {
      const invalidCsv = 'Student Name,Parent Name,Parent WhatsApp,Batch\nRohan,Suresh,123,Squad'
      const { valid, errors } = parseStudentCsvRows(invalidCsv)
      expect(valid).toHaveLength(0)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0]).toContain('Valid 10-digit parent phone')
    })

    it('parses coach trainee rows from sample template', () => {
      const sample = getSampleCoachTraineeCsv()
      const { valid, errors } = parseCoachTraineeCsvRows(sample)
      expect(errors).toHaveLength(0)
      expect(valid.length).toBe(3)
      expect(valid[0].traineeName).toBe('Arjun Mehra')
      expect(valid[0].ageGroup).toBe('U-15')
    })
  })

  describe('Daily Attendance & WhatsApp Roll Call', () => {
    it('saves and retrieves daily attendance records', () => {
      const record = {
        id: 'att-1',
        entityType: 'academy' as const,
        entitySlug: 'bengaluru-fc-academy',
        batchId: 'batch-elite',
        batchName: 'Morning Elite Squad',
        date: '2026-11-21',
        markedAt: new Date().toISOString(),
        attendees: [
          {
            studentId: 'st-1',
            studentName: 'Aarav Sharma',
            parentPhone: '9811223344',
            status: 'present' as const,
            checkInTime: '06:30 AM',
          },
          {
            studentId: 'st-2',
            studentName: 'Rohan Kulkarni',
            parentPhone: '9822334455',
            status: 'absent' as const,
          },
        ],
      }

      saveDailyAttendance(record)
      const retrieved = getDailyAttendance('bengaluru-fc-academy', 'batch-elite', '2026-11-21')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.batchName).toBe('Morning Elite Squad')
      expect(retrieved?.attendees).toHaveLength(2)
      expect(retrieved?.attendees[0].status).toBe('present')
    })

    it('generates well-formed WhatsApp attendance messages for present and absent', () => {
      const presentUrl = generateWhatsAppAttendanceAlertUrl({
        studentName: 'Aarav Sharma',
        parentPhone: '9811223344',
        status: 'present',
        batchName: 'Morning Elite Squad',
        entityName: 'Bengaluru FC Academy',
        date: '2026-11-21',
        checkInTime: '06:30 AM',
      })
      expect(presentUrl).toContain('https://wa.me/919811223344')
      expect(presentUrl).toContain(encodeURIComponent('Aarav Sharma'))
      expect(presentUrl).toContain(encodeURIComponent('checked in'))

      const absentUrl = generateWhatsAppAttendanceAlertUrl({
        studentName: 'Rohan Kulkarni',
        parentPhone: '9822334455',
        status: 'absent',
        batchName: 'Morning Elite Squad',
        entityName: 'Bengaluru FC Academy',
        date: '2026-11-21',
      })
      expect(absentUrl).toContain('https://wa.me/919822334455')
      expect(absentUrl).toContain(encodeURIComponent('ABSENT'))
    })
  })

  describe('Digital Fee Receipts & WhatsApp Receipt Dispatch', () => {
    it('generates official fee receipt with reference ID and verified status', () => {
      const receipt = generateDigitalFeeReceipt({
        entityType: 'coach',
        entityName: 'Coach Zaheer Farooq',
        entitySlug: 'zaheer-farooq-coach',
        isVerified: true,
        studentId: 'tr-1',
        studentName: 'Arjun Mehra',
        parentName: 'Suresh Mehra',
        parentPhone: '9811223344',
        batchName: 'Morning Elite Fast Bowlers Clinic',
        sport: 'Cricket',
        amount: 3500,
        upiVpa: 'zaheer@okaxis',
      })

      expect(receipt.receiptNumber).toMatch(/^KGR-2026-\d{5}$/)
      expect(receipt.studentName).toBe('Arjun Mehra')
      expect(receipt.amount).toBe(3500)
      expect(receipt.isVerified).toBe(true)

      const waReceipt = generateWhatsAppReceiptMessageUrl(receipt)
      expect(waReceipt).toContain('https://wa.me/919811223344')
      expect(waReceipt).toContain(encodeURIComponent('OFFICIAL FEE PAYMENT RECEIPT'))
      expect(waReceipt).toContain(encodeURIComponent('₹3,500'))
    })
  })

  describe('Shareable Public Profile Broadcast Cards', () => {
    it('generates shareable WhatsApp broadcast URL', () => {
      const shareUrl = generateWhatsAppShareProfileUrl({
        entityType: 'coach',
        entityName: 'Coach Zaheer Farooq',
        slug: 'zaheer-farooq-coach',
        sport: 'Cricket',
        city: 'Delhi NCR',
        isVerified: true,
      })

      expect(shareUrl).toContain('https://wa.me/?text=')
      expect(shareUrl).toContain(encodeURIComponent('COACH ZAHEER FAROOQ'))
      expect(shareUrl).toContain(encodeURIComponent('https://khelgrid.com/coaches/zaheer-farooq-coach'))
    })
  })
})
