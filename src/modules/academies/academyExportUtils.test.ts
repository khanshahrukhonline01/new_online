import { describe, expect, it } from 'vitest'
import { exportStudentsToCsv, generateBatchAttendanceRoster } from './academyExportUtils'
import type { AcademyStudent, AcademyBatch } from './academySaaSClient'

describe('academyExportUtils Suite', () => {
  it('formats students array into valid CSV string with headers', () => {
    const students: AcademyStudent[] = [
      {
        id: 's1',
        academySlug: 'test-academy',
        studentName: 'Aarav Kumar',
        parentName: 'Sunil Kumar',
        parentPhone: '9845012345',
        batchId: 'b1',
        batchName: 'Morning Elite U-14',
        sport: 'Football',
        monthlyFee: 2500,
        feeStatus: 'paid',
        nextDueDate: '2026-12-01',
        lastPaymentDate: '2026-11-01',
      },
    ]

    const csv = exportStudentsToCsv(students, 'Test Academy')
    expect(csv).toContain('# KhelGrid Official Student Roster — Test Academy')
    expect(csv).toContain('Student Name,Parent Name,Parent WhatsApp,Sport,Batch Name')
    expect(csv).toContain('"Aarav Kumar"')
    expect(csv).toContain('"PAID"')
    expect(csv).toContain('2500')
  })

  it('generates batch attendance roster data for coaches', () => {
    const batch: AcademyBatch = {
      id: 'b1',
      academySlug: 'test',
      batchName: 'Morning Cricket Squad',
      sport: 'Cricket',
      days: 'Mon, Wed, Fri',
      timings: '06:00 AM – 08:00 AM',
      coachName: 'Coach Sharma',
      ageGroup: 'U-14',
      monthlyFee: 2000,
      maxCapacity: 20,
      enrolledCount: 1,
      isActive: true,
    }

    const students: AcademyStudent[] = [
      {
        id: 's1',
        academySlug: 'test',
        studentName: 'Rohit',
        parentName: 'Ajay',
        parentPhone: '9876500000',
        batchId: 'b1',
        batchName: 'Morning Cricket Squad',
        sport: 'Cricket',
        monthlyFee: 2000,
        feeStatus: 'paid',
        nextDueDate: '2026-12-05',
      },
    ]

    const roster = generateBatchAttendanceRoster(batch, students)
    expect(roster.batchName).toBe('Morning Cricket Squad')
    expect(roster.coachName).toBe('Coach Sharma')
    expect(roster.students.length).toBe(1)
    expect(roster.students[0].studentName).toBe('Rohit')
  })
})
