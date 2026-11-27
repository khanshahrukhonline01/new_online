/**
 * KhelGrid Academy SaaS Export Utilities
 * Provides UTF-8 BOM CSV downloads for rosters, attendance records, and financial transactions.
 * UTF-8 BOM ensures seamless opening in Microsoft Excel without character corruption.
 */

import type { AcademyStudent, AcademyBatch, AcademyFeeTransaction } from './academySaaSClient'

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

export function exportAttendanceToCsv(
  batchName: string,
  date: string,
  attendees: { studentName: string; status: string; checkInTime?: string }[]
): string {
  const headers = ['Student Name', 'Attendance Status', 'Check-In Timestamp']
  const rows = attendees.map(a => [
    `"${a.studentName.replace(/"/g, '""')}"`,
    `"${a.status.toUpperCase()}"`,
    `"${a.checkInTime || 'Pitch-Side Roll-Call'}"`,
  ])

  return [
    `# KhelGrid Official Ground Attendance Register — ${batchName} (${date})`,
    `# Exported: ${new Date().toISOString()}`,
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\n')
}

export function exportTransactionsToCsv(
  transactions: AcademyFeeTransaction[],
  academyName: string
): string {
  const headers = [
    'Receipt Number',
    'Student Name',
    'Parent Name',
    'Parent Phone',
    'Batch Name',
    'Amount (INR)',
    'Payment Mode',
    'Billing Month',
    'Collected By Staff',
    'Collected Date',
    'Status',
  ]

  const rows = transactions.map(t => [
    `"${t.receiptNumber}"`,
    `"${t.studentName.replace(/"/g, '""')}"`,
    `"${t.parentName.replace(/"/g, '""')}"`,
    `"${t.parentPhone}"`,
    `"${t.batchName.replace(/"/g, '""')}"`,
    t.amount,
    `"${t.paymentMode.toUpperCase()}"`,
    `"${t.billingMonth}"`,
    `"${t.collectedByStaffName.replace(/"/g, '""')}"`,
    `"${t.collectedDate}"`,
    `"${t.status.toUpperCase()}"`,
  ])

  return [
    `# KhelGrid Audited Financial Fee Ledger — ${academyName}`,
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

  // Include UTF-8 Byte Order Mark (BOM) for CSVs so Excel renders Indic scripts cleanly
  const finalContent = mimeType.includes('csv') && !content.startsWith('\uFEFF')
    ? '\uFEFF' + content
    : content

  const blob = new Blob([finalContent], { type: mimeType })
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
