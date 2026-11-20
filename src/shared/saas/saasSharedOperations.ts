/**
 * KhelGrid Shared SaaS Operations Service
 * Empowers Grassroots Sports Academies & Certified Coaches with:
 * 1. CSV / Spreadsheet bulk roster import with validation
 * 2. Mobile-first daily student attendance & automated WhatsApp parent roll call
 * 3. Digital official fee receipt vouchers with verification stamps & 1-click WhatsApp dispatch
 * 4. Shareable public profile WhatsApp broadcast cards
 */

// -------------------------------------------------------------
// 1. CSV / Excel Parsing & Importing
// -------------------------------------------------------------

export interface ParsedStudentImportRow {
  studentName: string
  parentName: string
  parentPhone: string
  batchName?: string
  sport?: string
  monthlyFee: number
  ageGroup?: string
}

export interface ParsedCoachTraineeImportRow {
  traineeName: string
  parentName: string
  parentPhone: string
  ageGroup: string
  batchName?: string
  monthlyFee: number
}

/**
 * Split CSV line respecting quoted commas.
 */
export function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // Skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Parse raw CSV or tab-separated text into structured student import rows.
 */
export function parseStudentCsvRows(csvText: string): {
  valid: ParsedStudentImportRow[]
  errors: string[]
} {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  const valid: ParsedStudentImportRow[] = []
  const errors: string[] = []

  if (lines.length === 0) {
    return { valid, errors: ['CSV content is empty.'] }
  }

  // Filter out comment lines
  const dataLines = lines.filter(l => !l.startsWith('#'))
  if (dataLines.length === 0) {
    return { valid, errors: ['CSV contains no data rows.'] }
  }

  // Determine if first row is header
  const firstRowCols = splitCsvLine(dataLines[0]).map(c => c.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const hasHeader = firstRowCols.some(c => c.includes('student') || c.includes('name') || c.includes('phone'))
  const rowsToProcess = hasHeader ? dataLines.slice(1) : dataLines

  rowsToProcess.forEach((line, index) => {
    const lineNum = (hasHeader ? 2 : 1) + index
    const cols = splitCsvLine(line)

    if (cols.length < 2) {
      errors.push(`Row ${lineNum}: Not enough columns (found ${cols.length}, expected at least 2).`)
      return
    }

    const studentName = cols[0]?.replace(/^"|"$/g, '').trim()
    const parentName = cols[1]?.replace(/^"|"$/g, '').trim() || 'Parent'
    const parentPhone = (cols[2] || cols[1] || '').replace(/\D/g, '')

    if (!studentName || studentName.length < 2) {
      errors.push(`Row ${lineNum}: Student name is missing or too short.`)
      return
    }

    if (parentPhone.length < 10) {
      errors.push(`Row ${lineNum}: Valid 10-digit parent phone number required for "${studentName}".`)
      return
    }

    const batchName = cols[3]?.replace(/^"|"$/g, '').trim() || undefined
    const monthlyFee = Number(cols[4]?.replace(/[^0-9.]/g, '')) || 2500
    const col5 = cols[5]?.replace(/^"|"$/g, '').trim() || undefined
    const isAgeGroup = col5 ? (col5.startsWith('U-') || col5.toLowerCase().includes('yr') || /^\d{1,2}$/.test(col5)) : false
    const ageGroup = isAgeGroup ? col5 : undefined
    const sport = isAgeGroup ? undefined : col5

    valid.push({
      studentName,
      parentName,
      parentPhone,
      batchName,
      sport,
      ageGroup,
      monthlyFee,
    })
  })

  return { valid, errors }
}

export function getSampleStudentCsv(): string {
  return [
    '# KhelGrid Official Academy Student Import Template',
    '# Format: Student Name, Parent Name, Parent WhatsApp, Batch Name, Monthly Fee (INR), Sport',
    'Student Name,Parent Name,Parent WhatsApp,Batch Name,Monthly Fee,Sport',
    'Aarav Sharma,Rajesh Sharma,9811223344,Morning Elite Squad,3500,Cricket',
    'Rohan Kulkarni,Sunil Kulkarni,9822334455,Foundation Youth Camp,2500,Football',
    'Ananya Nair,Pooja Nair,9833445566,Evening High Performance,3000,Badminton',
    'Kabir Verma,Vikram Verma,9844556677,Morning Elite Squad,3500,Cricket',
  ].join('\n')
}

export function parseCoachTraineeCsvRows(csvText: string): {
  valid: ParsedCoachTraineeImportRow[]
  errors: string[]
} {
  const { valid: studentRows, errors } = parseStudentCsvRows(csvText)
  const valid: ParsedCoachTraineeImportRow[] = studentRows.map(s => ({
    traineeName: s.studentName,
    parentName: s.parentName,
    parentPhone: s.parentPhone,
    ageGroup: s.ageGroup || 'U-14',
    batchName: s.batchName,
    monthlyFee: s.monthlyFee,
  }))

  return { valid, errors }
}

export function getSampleCoachTraineeCsv(): string {
  return [
    '# KhelGrid Official Coach Trainee Import Template',
    '# Format: Trainee Name, Parent Name, Parent WhatsApp, Batch Name, Monthly Fee (INR), Age Category',
    'Trainee Name,Parent Name,Parent WhatsApp,Batch Name,Monthly Fee,Age Category',
    'Arjun Mehra,Suresh Mehra,9811223344,Morning Fast Bowlers Clinic,3500,U-15',
    'Devika Sen,Amit Sen,9822334455,Evening Spin Masters,3000,U-13',
    'Rohan Deshmukh,Nitin Deshmukh,9833445566,Morning Fast Bowlers Clinic,3500,U-16',
  ].join('\n')
}

// -------------------------------------------------------------
// 2. Daily Attendance & WhatsApp Parent Roll Call
// -------------------------------------------------------------

export interface AttendanceStudentEntry {
  studentId: string
  studentName: string
  parentPhone: string
  status: 'present' | 'absent' | 'excused'
  checkInTime?: string
}

export interface DailyAttendanceRecord {
  id: string
  entityType: 'academy' | 'coach'
  entitySlug: string
  batchId: string
  batchName: string
  date: string // YYYY-MM-DD
  markedAt: string
  attendees: AttendanceStudentEntry[]
}

const ATTENDANCE_STORAGE_PREFIX = 'khelgrid_attendance_'
const memoryFallback = new Map<string, string>()

export function getDailyAttendanceKey(entitySlug: string, batchId: string, date: string): string {
  return `${ATTENDANCE_STORAGE_PREFIX}${entitySlug}_${batchId}_${date}`
}

export function getDailyAttendance(
  entitySlug: string,
  batchId: string,
  date: string
): DailyAttendanceRecord | null {
  const key = getDailyAttendanceKey(entitySlug, batchId, date)
  if (typeof window === 'undefined' || !window.localStorage) {
    const raw = memoryFallback.get(key)
    return raw ? JSON.parse(raw) : null
  }
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : (memoryFallback.get(key) ? JSON.parse(memoryFallback.get(key)!) : null)
  } catch {
    const raw = memoryFallback.get(key)
    return raw ? JSON.parse(raw) : null
  }
}

export function saveDailyAttendance(record: DailyAttendanceRecord): void {
  const key = getDailyAttendanceKey(record.entitySlug, record.batchId, record.date)
  const json = JSON.stringify(record)
  memoryFallback.set(key, json)
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(key, json)
  } catch {
    // local storage quota fallback
  }
}

export function generateWhatsAppAttendanceAlertUrl(opts: {
  studentName: string
  parentPhone: string
  status: 'present' | 'absent' | 'excused'
  batchName: string
  entityName: string
  date: string
  checkInTime?: string
}): string {
  const cleanPhone = opts.parentPhone.replace(/\D/g, '')
  const phone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone.slice(-10)}`
  const timeStr = opts.checkInTime || 'today'

  let message = ''
  if (opts.status === 'present') {
    message = [
      `Namaste! 🙏`,
      `*Attendance Update:* *${opts.studentName}* has checked in and is attending *${opts.batchName}* at *${opts.entityName}* today (${opts.date} at ${timeStr}).`,
      `Session underway with focus on physical conditioning and drills.`,
      `— KhelGrid Verified Gate Roll Call`,
    ].join('\n\n')
  } else if (opts.status === 'absent') {
    message = [
      `Namaste! 🙏`,
      `*Attendance Notice:* *${opts.studentName}* was marked *ABSENT* for *${opts.batchName}* at *${opts.entityName}* today (${opts.date}).`,
      `Please let the coach/academy desk know if everything is alright or if a leave was requested.`,
      `— KhelGrid Student Safety Desk`,
    ].join('\n\n')
  } else {
    message = [
      `Namaste! 🙏`,
      `*Attendance Notice:* *${opts.studentName}* has an excused leave recorded for *${opts.batchName}* (${opts.date}).`,
      `— ${opts.entityName} via KhelGrid`,
    ].join('\n\n')
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

// -------------------------------------------------------------
// 3. Digital Fee Receipts & WhatsApp Receipt Dispatch
// -------------------------------------------------------------

export interface DigitalFeeReceipt {
  receiptNumber: string // e.g. KGR-2026-98124
  entityType: 'academy' | 'coach'
  entityName: string
  entitySlug: string
  isVerified: boolean
  upiVpa?: string
  studentId: string
  studentName: string
  parentName: string
  parentPhone: string
  batchName: string
  sport: string
  amount: number
  paymentDate: string
  paymentMonth: string
  paymentMethod: string
  referenceId: string
}

export function generateDigitalFeeReceipt(opts: {
  entityType: 'academy' | 'coach'
  entityName: string
  entitySlug: string
  isVerified: boolean
  studentId: string
  studentName: string
  parentName: string
  parentPhone: string
  batchName: string
  sport: string
  amount: number
  paymentDate?: string
  upiVpa?: string
  paymentMethod?: string
}): DigitalFeeReceipt {
  const now = new Date()
  const dateStr = opts.paymentDate || now.toISOString().slice(0, 10)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const paymentMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`
  const hash = Math.floor(10000 + Math.random() * 90000)
  const receiptNumber = `KGR-${now.getFullYear()}-${hash}`
  const referenceId = `UPI-${Date.now().toString(36).toUpperCase()}`

  return {
    receiptNumber,
    entityType: opts.entityType,
    entityName: opts.entityName,
    entitySlug: opts.entitySlug,
    isVerified: opts.isVerified,
    upiVpa: opts.upiVpa || `${opts.entitySlug}@okaxis`,
    studentId: opts.studentId,
    studentName: opts.studentName,
    parentName: opts.parentName,
    parentPhone: opts.parentPhone,
    batchName: opts.batchName,
    sport: opts.sport,
    amount: opts.amount,
    paymentDate: dateStr,
    paymentMonth,
    paymentMethod: opts.paymentMethod || 'Direct UPI 0% Commission',
    referenceId,
  }
}

export function generateWhatsAppReceiptMessageUrl(receipt: DigitalFeeReceipt): string {
  const cleanPhone = receipt.parentPhone.replace(/\D/g, '')
  const phone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone.slice(-10)}`

  const message = [
    `🧾 *OFFICIAL FEE PAYMENT RECEIPT*`,
    `*KhelGrid Verified Sports Network*`,
    `--------------------------------`,
    `*Receipt No:* ${receipt.receiptNumber}`,
    `*Student:* ${receipt.studentName}`,
    `*Parent:* ${receipt.parentName}`,
    `*Academy / Coach:* ${receipt.entityName} ${receipt.isVerified ? '🛡️ (KhelGrid Verified)' : ''}`,
    `*Batch & Sport:* ${receipt.batchName} (${receipt.sport})`,
    `*Billing Period:* ${receipt.paymentMonth}`,
    `*Amount Received:* ₹${receipt.amount.toLocaleString('en-IN')}`,
    `*Paid Date:* ${receipt.paymentDate}`,
    `*Settlement Ref:* ${receipt.referenceId}`,
    `--------------------------------`,
    `✅ Status: *PAID IN FULL (0% Platform Surcharge)*`,
    `Thank you for supporting youth grassroots sports excellence!`,
  ].join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

// -------------------------------------------------------------
// 4. Shareable Public Profile WhatsApp Broadcast Cards
// -------------------------------------------------------------

export function generateWhatsAppShareProfileUrl(opts: {
  entityType: 'academy' | 'coach'
  entityName: string
  slug: string
  sport: string
  city: string
  isVerified: boolean
}): string {
  const publicUrl = `https://khelgrid.com/${opts.entityType === 'coach' ? 'coaches' : 'academies'}/${opts.slug}`
  const badge = opts.isVerified ? '🛡️ KhelGrid Verified' : 'KhelGrid Certified'

  const message = [
    `🏅 *${opts.entityName.toUpperCase()}* (${badge})`,
    `*Sport:* ${opts.sport} · *Location:* ${opts.city}`,
    ``,
    `Admissions and trial sessions are open!`,
    `Book an on-ground trial, review coach NIS credentials, and enroll directly with 0% middleman fees:`,
    `👉 ${publicUrl}`,
    ``,
    `Empowered by KhelGrid — India's Grassroots Sports Network`,
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

// -------------------------------------------------------------
// 5. Emergency Weather & Session Cancellation Broadcast
// -------------------------------------------------------------

export function generateWhatsAppBatchBroadcastUrl(opts: {
  entityName: string
  batchName: string
  reason: 'rain_weather' | 'ground_maintenance' | 'heat_pollution' | 'holiday' | 'coach_emergency' | 'custom'
  customReason?: string
  date: string
  rescheduledTime?: string
}): string {
  const reasonMap: Record<string, string> = {
    rain_weather: 'Heavy rainfall and pitch waterlogging',
    ground_maintenance: 'Scheduled turf maintenance and ground relaying',
    heat_pollution: 'Advisory for extreme weather / heat index',
    holiday: 'Public sports holiday / festive break',
    coach_emergency: 'Coach emergency leave / technical workshop',
    custom: opts.customReason || 'Unforeseen grounds maintenance',
  }
  const reasonText = reasonMap[opts.reason] || opts.customReason || 'Unforeseen circumstances'
  const rescheduleNote = opts.rescheduledTime
    ? `\n*Rescheduled Session:* ${opts.rescheduledTime}`
    : `\n*Next Session:* As per regular batch timetable.`

  const message = [
    `⚠️ *IMPORTANT NOTICE: SESSION UPDATE*`,
    `*Academy:* ${opts.entityName}`,
    `*Batch:* ${opts.batchName}`,
    `*Date:* ${opts.date}`,
    `--------------------------------`,
    `Please note that today's training session has been *CALLED OFF* due to:`,
    `👉 *${reasonText}*.`,
    `${rescheduleNote}`,
    `--------------------------------`,
    `Student safety and optimal ground conditions remain our highest priority.`,
    `— Management Desk via KhelGrid Infrastructure`,
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

// -------------------------------------------------------------
// 6. Overdue Fee Reminder via WhatsApp
// -------------------------------------------------------------

export function generateWhatsAppPaymentReminderUrl(opts: {
  studentName: string
  parentName: string
  parentPhone: string
  academyName: string
  batchName: string
  monthlyFee: number
  dueDate: string
  upiVpa?: string
}): string {
  const cleanPhone = opts.parentPhone.replace(/\D/g, '')
  const phone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone.slice(-10)}`

  const message = [
    `Namaste ${opts.parentName} ji! 🙏`,
    `*Academy Fee Notice:* ${opts.academyName}`,
    `--------------------------------`,
    `This is a gentle reminder regarding the training fee for *${opts.studentName}* (*${opts.batchName}*).`,
    `*Amount Due:* ₹${opts.monthlyFee.toLocaleString('en-IN')}`,
    `*Due Date:* ${opts.dueDate}`,
    opts.upiVpa ? `*Direct UPI VPA:* \`${opts.upiVpa}\` (0% Commission)` : '',
    `--------------------------------`,
    `Please complete the payment directly to the academy account at your earliest convenience to maintain uninterrupted ground sessions.`,
    `An official digital receipt will be dispatched immediately upon settlement.`,
    `— KhelGrid Student Admissions Desk`,
  ].filter(Boolean).join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

// -------------------------------------------------------------
// 7. Student Evaluation & Progress Report Generator
// -------------------------------------------------------------

export interface StudentProgressReport {
  reportId: string
  studentId: string
  studentName: string
  parentName: string
  parentPhone: string
  batchName: string
  academyName: string
  sport: string
  term: string
  attendanceRate: number
  technicalGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  tacticalGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  physicalFitnessGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  disciplineGrade: 'A+' | 'A' | 'B+' | 'B' | 'C'
  coachRemarks: string
  evaluatedByCoachName: string
  evaluatedDate: string
}

export function generateWhatsAppProgressReportUrl(report: StudentProgressReport): string {
  const cleanPhone = report.parentPhone.replace(/\D/g, '')
  const phone = cleanPhone.startsWith('91') && cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone.slice(-10)}`

  const message = [
    `📊 *QUARTERLY ATHLETE EVALUATION REPORT*`,
    `*Academy:* ${report.academyName}`,
    `*Student:* ${report.studentName}`,
    `*Batch & Sport:* ${report.batchName} (${report.sport})`,
    `*Period:* ${report.term}`,
    `--------------------------------`,
    `🎯 *Attendance Consistency:* ${report.attendanceRate}%`,
    `⚽ *Technical Skill:* Grade ${report.technicalGrade}`,
    `🧠 *Tactical Awareness:* Grade ${report.tacticalGrade}`,
    `⚡ *Physical Conditioning:* Grade ${report.physicalFitnessGrade}`,
    `🤝 *Discipline & Work Ethic:* Grade ${report.disciplineGrade}`,
    `--------------------------------`,
    `*Coach Remarks:*`,
    `"${report.coachRemarks}"`,
    `— Evaluated by: *${report.evaluatedByCoachName}* on ${report.evaluatedDate}`,
    `🛡️ Official Athlete Record on KhelGrid National Infrastructure`,
  ].join('\n')

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
