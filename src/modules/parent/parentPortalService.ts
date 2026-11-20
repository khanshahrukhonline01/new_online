/**
 * KhelGrid Parent & Athlete Portal Service
 * 
 * Provides a 0-app-install web & PWA portal for sports academy parents and athletes across India:
 * 1. Digital Student Ground Pass & QR turnstile credential
 * 2. Real-time Attendance Passbook & Session History
 * 3. Monthly Fee Invoices & Downloadable GST Tax Receipts
 * 4. Direct 0% Commission UPI Deep-Link Invoicing (PhonePe / GPay / Paytm)
 * 5. Emergency Medical & Return-To-Play (RTP) Injury Tracker
 * 
 * Free during Grassroots Launch Phase.
 */

export interface ParentStudentProfile {
  studentId: string
  studentName: string
  rollNumber: string
  academySlug: string
  academyName: string
  academyUpiVpa: string
  batchName: string
  sport: string
  coachName: string
  parentName: string
  parentPhone: string
  monthlyFee: number
  attendancePercentage: number
  bloodGroup: string
  emergencyContactPhone: string
  activeInjuries?: string
  rtpClearance: 'CLEARED' | 'REHABILITATION' | 'RESTRICTED'
  khelPassportId: string
}

export interface ParentAttendanceSession {
  id: string
  studentId: string
  date: string
  sessionTopic: string
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED'
  markedBy: string
  coachNotes?: string
}

export interface ParentFeeInvoice {
  invoiceId: string // e.g. "INV-2026-DEL-0891"
  studentId: string
  monthYear: string // e.g. "November 2026"
  dueDate: string
  tuitionFee: number
  kitUniformFee: number
  tournamentEntryFee: number
  discountAmount: number
  netAmount: number
  status: 'PAID' | 'PENDING' | 'OVERDUE'
  paidDate?: string
  paymentMethod?: 'UPI_DIRECT' | 'CASH'
  transactionRef?: string
}

const STORAGE_KEYS = {
  PROFILES: 'khelgrid_parent_profiles_store',
  ATTENDANCE: 'khelgrid_parent_attendance_store',
  INVOICES: 'khelgrid_parent_invoices_store',
}

const memoryStore = new Map<string, unknown>()

export function clearParentPortalMemoryStore(): void {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.PROFILES)
      window.localStorage.removeItem(STORAGE_KEYS.ATTENDANCE)
      window.localStorage.removeItem(STORAGE_KEYS.INVOICES)
    } catch {
      // ignore
    }
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const item = window.localStorage.getItem(key)
      if (item) return JSON.parse(item) as T
    } catch {
      // ignore
    }
  }
  return (memoryStore.get(key) as T) ?? defaultValue
}

function saveToStorage<T>(key: string, value: T): void {
  memoryStore.set(key, value)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-seeded Demo Data
// ---------------------------------------------------------------------------

export const DEFAULT_PARENT_STUDENTS: ParentStudentProfile[] = [
  {
    studentId: 'st-01',
    studentName: 'Aarav Sharma',
    rollNumber: 'DFA-2026-042',
    academySlug: 'delhi-football-academy',
    academyName: 'Delhi Football Academy',
    academyUpiVpa: 'delhifa@icici',
    batchName: 'Morning U-15 Elite Batch',
    sport: 'Football',
    coachName: 'Coach Rajesh Kumar',
    parentName: 'Sanjay Sharma',
    parentPhone: '+919876543210',
    monthlyFee: 2500,
    attendancePercentage: 94,
    bloodGroup: 'B+',
    emergencyContactPhone: '+919876543210',
    rtpClearance: 'CLEARED',
    khelPassportId: 'IN-ATH-2026-DEL-0091',
  },
  {
    studentId: 'st-02',
    studentName: 'Vihaan Verma',
    rollNumber: 'DFA-2026-058',
    academySlug: 'delhi-football-academy',
    academyName: 'Delhi Football Academy',
    academyUpiVpa: 'delhifa@icici',
    batchName: 'Morning U-15 Elite Batch',
    sport: 'Football',
    coachName: 'Coach Rajesh Kumar',
    parentName: 'Sunita Verma',
    parentPhone: '+919811223344',
    monthlyFee: 2500,
    attendancePercentage: 88,
    bloodGroup: 'O+',
    emergencyContactPhone: '+919811223344',
    activeInjuries: 'Mild ankle sprain (recovering)',
    rtpClearance: 'REHABILITATION',
    khelPassportId: 'IN-ATH-2026-DEL-0092',
  },
  {
    studentId: 'st-03',
    studentName: 'Ishaan Gupta',
    rollNumber: 'DFA-2026-091',
    academySlug: 'delhi-football-academy',
    academyName: 'Delhi Football Academy',
    academyUpiVpa: 'delhifa@icici',
    batchName: 'Evening Grassroots Juniors',
    sport: 'Football',
    coachName: 'Asst. Coach Vikram',
    parentName: 'Ramesh Gupta',
    parentPhone: '+919822334455',
    monthlyFee: 2000,
    attendancePercentage: 91,
    bloodGroup: 'A+',
    emergencyContactPhone: '+919822334455',
    rtpClearance: 'CLEARED',
    khelPassportId: 'IN-ATH-2026-DEL-0093',
  },
]

export const DEFAULT_ATTENDANCE_SESSIONS: ParentAttendanceSession[] = [
  { id: 'att-1', studentId: 'st-01', date: '2026-11-20', sessionTopic: 'Tactical Pressing & Small Sided Games', status: 'PRESENT', markedBy: 'Coach Rajesh' },
  { id: 'att-2', studentId: 'st-01', date: '2026-11-18', sessionTopic: 'Speed & Agility Combine Benchmarking', status: 'PRESENT', markedBy: 'Coach Rajesh' },
  { id: 'att-3', studentId: 'st-01', date: '2026-11-16', sessionTopic: 'Counter-Attack Transition Drills', status: 'PRESENT', markedBy: 'Coach Rajesh' },
  { id: 'att-4', studentId: 'st-01', date: '2026-11-14', sessionTopic: 'Set Piece Delivery & Corner Defending', status: 'PRESENT', markedBy: 'Coach Rajesh' },
  { id: 'att-5', studentId: 'st-01', date: '2026-11-12', sessionTopic: 'Aerobic Endurance & Interval Sprints', status: 'EXCUSED', markedBy: 'Coach Rajesh', coachNotes: 'School annual day exam leave approved.' },
  { id: 'att-6', studentId: 'st-02', date: '2026-11-20', sessionTopic: 'Light Rehab Mobility Drills', status: 'PRESENT', markedBy: 'Dr. Sneha (Physio)' },
  { id: 'att-7', studentId: 'st-02', date: '2026-11-18', sessionTopic: 'Ankle Cryotherapy & Rest', status: 'EXCUSED', markedBy: 'Dr. Sneha (Physio)' },
]

export const DEFAULT_FEE_INVOICES: ParentFeeInvoice[] = [
  {
    invoiceId: 'INV-2026-NOV-042',
    studentId: 'st-01',
    monthYear: 'November 2026',
    dueDate: '2026-11-10',
    tuitionFee: 2500,
    kitUniformFee: 0,
    tournamentEntryFee: 500,
    discountAmount: 0,
    netAmount: 3000,
    status: 'PAID',
    paidDate: '2026-11-05',
    paymentMethod: 'UPI_DIRECT',
    transactionRef: 'UPI-REF-9921448102',
  },
  {
    invoiceId: 'INV-2026-DEC-042',
    studentId: 'st-01',
    monthYear: 'December 2026',
    dueDate: '2026-12-07',
    tuitionFee: 2500,
    kitUniformFee: 0,
    tournamentEntryFee: 0,
    discountAmount: 0,
    netAmount: 2500,
    status: 'PENDING',
  },
  {
    invoiceId: 'INV-2026-DEC-058',
    studentId: 'st-02',
    monthYear: 'December 2026',
    dueDate: '2026-12-07',
    tuitionFee: 2500,
    kitUniformFee: 1200,
    tournamentEntryFee: 0,
    discountAmount: 200,
    netAmount: 3500,
    status: 'PENDING',
  },
]

// ---------------------------------------------------------------------------
// Queries & Mutations
// ---------------------------------------------------------------------------

export function getParentStudentProfiles(query?: string): ParentStudentProfile[] {
  const all = loadFromStorage<ParentStudentProfile[]>(STORAGE_KEYS.PROFILES, DEFAULT_PARENT_STUDENTS)
  if (!query) return all
  const q = query.trim().toLowerCase()
  return all.filter(s =>
    s.studentId.toLowerCase() === q ||
    s.parentPhone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
    s.studentName.toLowerCase().includes(q) ||
    s.rollNumber.toLowerCase().includes(q)
  )
}

export function getStudentAttendanceHistory(studentId: string): ParentAttendanceSession[] {
  const all = loadFromStorage<ParentAttendanceSession[]>(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE_SESSIONS)
  return all.filter(a => a.studentId === studentId)
}

export function getStudentFeeInvoices(studentId: string): ParentFeeInvoice[] {
  const all = loadFromStorage<ParentFeeInvoice[]>(STORAGE_KEYS.INVOICES, DEFAULT_FEE_INVOICES)
  return all.filter(inv => inv.studentId === studentId)
}

export function recordParentUpiPayment(
  invoiceId: string,
  utrRef: string
): { success: boolean; invoice?: ParentFeeInvoice; message: string } {
  const all = loadFromStorage<ParentFeeInvoice[]>(STORAGE_KEYS.INVOICES, DEFAULT_FEE_INVOICES)
  const invoice = all.find(i => i.invoiceId === invoiceId)

  if (!invoice) {
    return { success: false, message: 'Invoice not found.' }
  }

  invoice.status = 'PAID'
  invoice.paidDate = new Date().toISOString().slice(0, 10)
  invoice.paymentMethod = 'UPI_DIRECT'
  invoice.transactionRef = utrRef.trim() || `UPI-TXN-${Date.now().toString().slice(-6)}`

  saveToStorage(STORAGE_KEYS.INVOICES, all)
  return {
    success: true,
    invoice,
    message: `Payment confirmed via Direct UPI! Reference: ${invoice.transactionRef}`,
  }
}

export function generateDirectUpiDeepLink(invoice: ParentFeeInvoice, student: ParentStudentProfile): string {
  const vpa = student.academyUpiVpa || 'khelgrid@icici'
  const payeeName = student.academyName
  const amount = invoice.netAmount
  const note = `Fee ${invoice.monthYear} - ${student.studentName} (${student.rollNumber})`

  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`
}

export function generateParentFeeWhatsAppShareUrl(invoice: ParentFeeInvoice, student: ParentStudentProfile): string {
  const upiLink = generateDirectUpiDeepLink(invoice, student)
  const message = [
    `🧾 *FEE INVOICE & PAYMENT ADVICE — ${student.academyName}*`,
    `*Student:* ${student.studentName} (Roll: ${student.rollNumber})`,
    `*Batch:* ${student.batchName} (${student.sport})`,
    `*Invoice Ref:* #${invoice.invoiceId}`,
    `*Billing Month:* ${invoice.monthYear}`,
    `*Due Date:* ${invoice.dueDate}`,
    `--------------------------------`,
    `• Tuition Fee: ₹${invoice.tuitionFee.toLocaleString('en-IN')}`,
    invoice.kitUniformFee > 0 ? `• Kit / Uniform Fee: ₹${invoice.kitUniformFee.toLocaleString('en-IN')}` : '',
    invoice.tournamentEntryFee > 0 ? `• Tournament Entry: ₹${invoice.tournamentEntryFee.toLocaleString('en-IN')}` : '',
    invoice.discountAmount > 0 ? `• Scholarship Discount: -₹${invoice.discountAmount.toLocaleString('en-IN')}` : '',
    `*Net Payable:* ₹${invoice.netAmount.toLocaleString('en-IN')}`,
    `*Status:* ${invoice.status === 'PAID' ? '✅ PAID' : '⏳ PENDING'}`,
    `--------------------------------`,
    invoice.status === 'PAID'
      ? `Paid via UPI on ${invoice.paidDate}. Reference: ${invoice.transactionRef}`
      : `Pay instantly with 0% platform fee via UPI:\n${upiLink}\n(Opens GPay, PhonePe, or Paytm directly to ${student.academyUpiVpa})`,
    `--------------------------------`,
    `View online passbook: https://khelgrid.com/parent-portal?studentId=${student.studentId}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function generateStudentGroundPassQrPayload(student: ParentStudentProfile): string {
  return JSON.stringify({
    kind: 'STUDENT_GROUND_PASS',
    id: student.studentId,
    name: student.studentName,
    roll: student.rollNumber,
    academy: student.academyName,
    batch: student.batchName,
    passport: student.khelPassportId,
    blood: student.bloodGroup,
    emergencyPhone: student.emergencyContactPhone,
    rtp: student.rtpClearance,
  })
}
