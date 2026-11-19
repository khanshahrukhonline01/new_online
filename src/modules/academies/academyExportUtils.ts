/**
 * KhelGrid Academy SaaS Export Utilities
 * Provides CSV roster downloads and formatted attendance sheet data.
 */

import type { AcademyStudent, AcademyBatch } from './academySaaSClient'

export function exportStudentsToCsv(students: AcademyStudent[], academyName: string): string {
  const headers = [
    'Student Name',
    'Parent Name',
    'Parent WhatsApp',
    'Sport',
    'Batch Name',
    'Monthly Fee (INR)',
    'Fee Status',
    'Last Payment Date',
    'Next Due Date',
  ]

  const rows = students.map(s => [
    `"${s.studentName.replace(/"/g, '""')}"`,
    `"${s.parentName.replace(/"/g, '""')}"`,
    `"${s.parentPhone}"`,
    `"${s.sport}"`,
    `"${s.batchName.replace(/"/g, '""')}"`,
    s.monthlyFee,
    `"${s.feeStatus.toUpperCase()}"`,
    `"${s.lastPaymentDate || 'N/A'}"`,
    `"${s.nextDueDate}"`,
  ])

  return [
    `# KhelGrid Official Student Roster — ${academyName}`,
    `# Exported: ${new Date().toISOString()}`,
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\n')
}

export function generateBatchAttendanceRoster(batch: AcademyBatch, students: AcademyStudent[]) {
  const batchStudents = students.filter(s => s.batchId === batch.id || s.batchName === batch.batchName)
  return {
    batchName: batch.batchName,
    sport: batch.sport,
    coachName: batch.coachName,
    timings: batch.timings,
    days: batch.days,
    students: batchStudents.map(s => ({
      id: s.id,
      studentName: s.studentName,
      parentPhone: s.parentPhone,
      feeStatus: s.feeStatus,
    })),
  }
}

export function downloadBlobFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;'): void {
  if (typeof window === 'undefined' || !window.Blob) return

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
