/**
 * KhelGrid Academy Admissions & Batch Management SaaS Client
 * Provides complete B2B operations tools for sports academies across India:
 * - Inbound parent enquiry CRM & 1-click WhatsApp lead routing
 * - Multi-sport batch scheduling & coach allocations
 * - Student roster & automated UPI fee collection with WhatsApp reminders
 * - Selection trial digital pass generator with verifiable QR codes
 * 
 * Free during the Grassroots Launch Phase.
 */

export interface AcademyLead {
  id: string
  academySlug: string
  enquiryToken: string
  parentName: string
  parentPhone: string
  parentEmail?: string
  studentName: string
  studentAge: number | string
  sport: string
  batchType: string
  batchName?: string
  requestType: 'free_trial' | 'regular_admission' | 'scholarship_assessment'
  status: 'new' | 'contacted' | 'trial_scheduled' | 'enrolled' | 'archived'
  notes?: string
  submittedAt: string
}

export interface AcademyBatch {
  id: string
  academySlug: string
  batchName: string
  sport: string
  days: string // e.g. "Mon, Wed, Fri" or "Sat, Sun"
  timings: string // e.g. "06:00 AM – 08:00 AM"
  coachName: string
  ageGroup: string // e.g. "U-14 (8–14 yrs)"
  monthlyFee: number // in ₹
  maxCapacity: number
  enrolledCount: number
  isActive: boolean
}

export interface AcademyStudent {
  id: string
  academySlug: string
  studentName: string
  parentName: string
  parentPhone: string
  batchId: string
  batchName: string
  sport: string
  monthlyFee: number
  feeStatus: 'paid' | 'due_soon' | 'overdue'
  nextDueDate: string
  lastPaymentDate?: string
  upiVpa?: string
}

export interface AcademyTrialPass {
  id: string
  passNumber: string
  academySlug: string
  academyName: string
  studentName: string
  parentPhone: string
  sport: string
  trialDate: string
  reportingTime: string
  venueAddress: string
  reportingInstructions: string
  qrCodePayload: string
  status: 'valid' | 'used' | 'cancelled'
  issuedAt: string
  checkedInAt?: string
  checkedInBy?: string
}

export interface AcademySettings {
  academySlug: string
  academyName: string
  directorName: string
  directorWhatsApp: string
  directorEmail?: string
  upiVpa: string // e.g. "bengalurufc@okhdfcbank"
  autoWhatsAppRoutingEnabled: boolean
  isProUnlocked: boolean
}

export interface RegisteredAcademy {
  id: string
  slug: string
  name: string
  city: string
  state: string
  sport: string
  directorName?: string
  directorWhatsApp?: string
  upiVpa?: string
  isCustom?: boolean
  verificationStatus?: 'unverified' | 'pending_review' | 'verified' | 'rejected'
}

export interface AcademyStaffMember {
  id: string
  academySlug: string
  name: string
  role: 'director' | 'head_coach' | 'assistant_coach' | 'ground_staff' | 'accountant'
  phone: string
  email?: string
  qualification?: string
  assignedBatches?: string[]
  status: 'active' | 'on_leave'
  joinedDate: string
}

export interface AcademyFeeTransaction {
  id: string
  academySlug: string
  studentId: string
  studentName: string
  parentName: string
  parentPhone: string
  batchId: string
  batchName: string
  amount: number
  paymentMode: 'cash' | 'direct_upi' | 'bank_transfer' | 'cheque'
  collectedByStaffName: string
  collectedDate: string
  billingMonth: string
  receiptNumber: string
  status: 'settled' | 'cash_in_hand'
  notes?: string
}

export interface AcademyLedgerSummary {
  totalExpectedMonthly: number
  totalCollected: number
  cashCollected: number
  upiCollected: number
  pendingDues: number
  overdueCount: number
  cashInHand: number
  collectionRate: number
}

export const INITIAL_REGISTERED_ACADEMIES: RegisteredAcademy[] = [
  {
    id: 'bengaluru-fc-academy',
    slug: 'bengaluru-fc-academy',
    name: 'Bengaluru FC Residential Academy',
    city: 'Bengaluru',
    state: 'Karnataka',
    sport: 'Football',
    directorName: 'Director John K.',
    directorWhatsApp: '9845012345',
    upiVpa: 'bengalurufc@okhdfcbank',
    verificationStatus: 'verified',
  },
  {
    id: 'pullela-gopichand-badminton-academy',
    slug: 'pullela-gopichand-badminton-academy',
    name: 'Pullela Gopichand Badminton Academy',
    city: 'Hyderabad',
    state: 'Telangana',
    sport: 'Badminton',
    directorName: 'Coach Pullela G.',
    directorWhatsApp: '9849012345',
    upiVpa: 'gopichandacademy@icici',
    verificationStatus: 'verified',
  },
  {
    id: 'tata-football-academy',
    slug: 'tata-football-academy',
    name: 'Tata Football Academy',
    city: 'Jamshedpur',
    state: 'Jharkhand',
    sport: 'Football',
    directorName: 'Director Mukul C.',
    directorWhatsApp: '9835012345',
    upiVpa: 'tatafootball@sbi',
    verificationStatus: 'verified',
  },
  {
    id: 'kanpur-cricket-association-academy',
    slug: 'kanpur-cricket-association-academy',
    name: 'Green Park Cricket Academy',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    sport: 'Cricket',
    directorName: 'Coach R. K. Singh',
    directorWhatsApp: '9415012345',
    upiVpa: 'greenparkcricket@paytm',
    verificationStatus: 'verified',
  },
]

const STORAGE_KEYS = {
  LEADS: 'khelgrid_academy_saas_leads',
  BATCHES: 'khelgrid_academy_saas_batches',
  STUDENTS: 'khelgrid_academy_saas_students',
  PASSES: 'khelgrid_academy_saas_trial_passes',
  SETTINGS: 'khelgrid_academy_saas_settings',
  REGISTERED_ACADEMIES: 'khelgrid_academy_saas_registered_academies',
  ONBOARDING_COMPLETED: 'khelgrid_academy_saas_onboarding_completed',
  STAFF: 'khelgrid_academy_saas_staff',
  TRANSACTIONS: 'khelgrid_academy_saas_transactions',
}

// Default Seed Data for major curated academies
const DEFAULT_BATCHES: AcademyBatch[] = [
  {
    id: 'batch-bfc-1',
    academySlug: 'bengaluru-fc-academy',
    batchName: 'Morning Elite U-14 Youth Squad',
    sport: 'Football',
    days: 'Tue, Thu, Sat',
    timings: '06:00 AM – 08:00 AM',
    coachName: 'Coach Suresh M. (AFC A-License)',
    ageGroup: 'U-14 (10–14 yrs)',
    monthlyFee: 2500,
    maxCapacity: 25,
    enrolledCount: 22,
    isActive: true,
  },
  {
    id: 'batch-bfc-2',
    academySlug: 'bengaluru-fc-academy',
    batchName: 'Weekend Grassroots Foundation',
    sport: 'Football',
    days: 'Sat, Sun',
    timings: '04:00 PM – 06:00 PM',
    coachName: 'Coach Anand Rao (AIFF D-License)',
    ageGroup: 'Grassroots (6–10 yrs)',
    monthlyFee: 1800,
    maxCapacity: 30,
    enrolledCount: 24,
    isActive: true,
  },
  {
    id: 'batch-gopichand-1',
    academySlug: 'pullela-gopichand-badminton-academy',
    batchName: 'Junior National Development Batch',
    sport: 'Badminton',
    days: 'Mon to Fri',
    timings: '06:30 AM – 08:30 AM',
    coachName: 'Coach P. Gopichand & Staff',
    ageGroup: 'Junior (11–17 yrs)',
    monthlyFee: 3500,
    maxCapacity: 20,
    enrolledCount: 19,
    isActive: true,
  },
  {
    id: 'batch-tfa-1',
    academySlug: 'tata-football-academy',
    batchName: 'All-India Cadet Combine Batch',
    sport: 'Football',
    days: 'Mon to Sat',
    timings: '06:00 AM – 08:30 AM',
    coachName: 'Coach Noel Wilson (Ex-International)',
    ageGroup: 'U-17 (14–17 yrs)',
    monthlyFee: 3000,
    maxCapacity: 28,
    enrolledCount: 26,
    isActive: true,
  },
  {
    id: 'batch-kca-1',
    academySlug: 'kanpur-cricket-association-academy',
    batchName: 'Turf Wicket Advanced Batting & Fast Bowling',
    sport: 'Cricket',
    days: 'Tue, Wed, Fri, Sun',
    timings: '03:30 PM – 06:30 PM',
    coachName: 'Coach Rakesh Shukla (BCCI Level 2)',
    ageGroup: 'U-19 (14–19 yrs)',
    monthlyFee: 2200,
    maxCapacity: 30,
    enrolledCount: 27,
    isActive: true,
  },
]

const DEFAULT_LEADS: AcademyLead[] = [
  {
    id: 'lead-1',
    academySlug: 'bengaluru-fc-academy',
    enquiryToken: 'ENQ-FTB-92A1',
    parentName: 'Ramesh Sundaram',
    parentPhone: '9845012345',
    parentEmail: 'ramesh.s@example.com',
    studentName: 'Aarav Sundaram',
    studentAge: 12,
    sport: 'Football',
    batchType: 'morning_grassroots',
    batchName: 'Morning Elite U-14 Youth Squad',
    requestType: 'free_trial',
    status: 'new',
    notes: 'Playing as midfielder in school team, interested in trial evaluation for U-14 squad.',
    submittedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'lead-2',
    academySlug: 'bengaluru-fc-academy',
    enquiryToken: 'ENQ-FTB-81C4',
    parentName: 'Priya Narayanan',
    parentPhone: '9880098765',
    parentEmail: 'priya.n@example.com',
    studentName: 'Rohan Narayanan',
    studentAge: 9,
    sport: 'Football',
    batchType: 'weekend',
    batchName: 'Weekend Grassroots Foundation',
    requestType: 'regular_admission',
    status: 'contacted',
    notes: 'Looking for weekend batch slots, parent requested timing details on WhatsApp.',
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'lead-3',
    academySlug: 'pullela-gopichand-badminton-academy',
    enquiryToken: 'ENQ-BDM-44F2',
    parentName: 'Sunita Reddy',
    parentPhone: '9440123456',
    studentName: 'Ananya Reddy',
    studentAge: 13,
    sport: 'Badminton',
    batchType: 'weekday',
    batchName: 'Junior National Development Batch',
    requestType: 'scholarship_assessment',
    status: 'trial_scheduled',
    notes: 'District U-13 semi-finalist. Scheduled trial pass issued for Saturday.',
    submittedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
]

const DEFAULT_STUDENTS: AcademyStudent[] = [
  {
    id: 'std-1',
    academySlug: 'bengaluru-fc-academy',
    studentName: 'Aarav Sundaram',
    parentName: 'Ramesh Sundaram',
    parentPhone: '9845012345',
    batchId: 'batch-bfc-1',
    batchName: 'Morning Elite U-14 Youth Squad',
    sport: 'Football',
    monthlyFee: 2500,
    feeStatus: 'paid',
    nextDueDate: '2026-12-05',
    lastPaymentDate: '2026-11-05',
  },
  {
    id: 'std-2',
    academySlug: 'bengaluru-fc-academy',
    studentName: 'Karan Sharma',
    parentName: 'Vikas Sharma',
    parentPhone: '9845112233',
    batchId: 'batch-bfc-1',
    batchName: 'Morning Elite U-14 Youth Squad',
    sport: 'Football',
    monthlyFee: 2500,
    feeStatus: 'due_soon',
    nextDueDate: '2026-11-25',
    lastPaymentDate: '2026-10-25',
  },
  {
    id: 'std-3',
    academySlug: 'bengaluru-fc-academy',
    studentName: 'Dhruv Nair',
    parentName: 'Mahesh Nair',
    parentPhone: '9845998877',
    batchId: 'batch-bfc-2',
    batchName: 'Weekend Grassroots Foundation',
    sport: 'Football',
    monthlyFee: 1800,
    feeStatus: 'overdue',
    nextDueDate: '2026-11-10',
    lastPaymentDate: '2026-10-10',
  },
]

const DEFAULT_STAFF: AcademyStaffMember[] = [
  {
    id: 'staff-bfc-1',
    academySlug: 'bengaluru-fc-academy',
    name: 'Coach Suresh M.',
    role: 'head_coach',
    phone: '9845011223',
    email: 'suresh.m@bengalurufc.in',
    qualification: 'AFC A-License (AIFF)',
    assignedBatches: ['batch-bfc-1'],
    status: 'active',
    joinedDate: '2023-06-15',
  },
  {
    id: 'staff-bfc-2',
    academySlug: 'bengaluru-fc-academy',
    name: 'Coach Anand Rao',
    role: 'assistant_coach',
    phone: '9845022334',
    qualification: 'AIFF D-License',
    assignedBatches: ['batch-bfc-2'],
    status: 'active',
    joinedDate: '2024-01-10',
  },
  {
    id: 'staff-bfc-3',
    academySlug: 'bengaluru-fc-academy',
    name: 'Ramesh Iyer',
    role: 'accountant',
    phone: '9845033445',
    email: 'accounts@bengalurufc.in',
    status: 'active',
    joinedDate: '2022-08-01',
  },
  {
    id: 'staff-bfc-4',
    academySlug: 'bengaluru-fc-academy',
    name: 'Director John K.',
    role: 'director',
    phone: '9845012345',
    email: 'director@bengalurufc.in',
    status: 'active',
    joinedDate: '2021-03-01',
  },
]

const DEFAULT_TRANSACTIONS: AcademyFeeTransaction[] = [
  {
    id: 'tx-1',
    academySlug: 'bengaluru-fc-academy',
    studentId: 'std-1',
    studentName: 'Aarav Sundaram',
    parentName: 'Ramesh Sundaram',
    parentPhone: '9845012345',
    batchId: 'batch-bfc-1',
    batchName: 'Morning Elite U-14 Youth Squad',
    amount: 2500,
    paymentMode: 'direct_upi',
    collectedByStaffName: 'Director John K.',
    collectedDate: '2026-11-05',
    billingMonth: 'November 2026',
    receiptNumber: 'KGR-2026-88120',
    status: 'settled',
    notes: 'Paid via direct UPI (GPay)',
  },
  {
    id: 'tx-2',
    academySlug: 'bengaluru-fc-academy',
    studentId: 'std-2',
    studentName: 'Karan Sharma',
    parentName: 'Vikas Sharma',
    parentPhone: '9845112233',
    batchId: 'batch-bfc-1',
    batchName: 'Morning Elite U-14 Youth Squad',
    amount: 2500,
    paymentMode: 'cash',
    collectedByStaffName: 'Coach Suresh M.',
    collectedDate: '2026-11-08',
    billingMonth: 'November 2026',
    receiptNumber: 'KGR-2026-88121',
    status: 'cash_in_hand',
    notes: 'Cash received on ground by coach, pending bank deposit',
  },
]

// Safe In-Memory & LocalStorage Persistence
const memoryStore = new Map<string, string>()

export function clearAcademySaaSMemoryStore(): void {
  memoryStore.clear()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.LEADS)
      window.localStorage.removeItem(STORAGE_KEYS.BATCHES)
      window.localStorage.removeItem(STORAGE_KEYS.STUDENTS)
      window.localStorage.removeItem(STORAGE_KEYS.PASSES)
      window.localStorage.removeItem(STORAGE_KEYS.SETTINGS)
      window.localStorage.removeItem(STORAGE_KEYS.REGISTERED_ACADEMIES)
      window.localStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED)
      window.localStorage.removeItem(STORAGE_KEYS.STAFF)
      window.localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS)
    } catch {
      // ignore
    }
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  let raw: string | null = null
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      raw = window.localStorage.getItem(key)
    } catch {
      raw = null
    }
  }
  if (!raw && memoryStore.has(key)) {
    raw = memoryStore.get(key) || null
  }
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  const serialized = JSON.stringify(data)
  memoryStore.set(key, serialized)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, serialized)
    } catch {
      // ignore quota errors
    }
  }
}

// Public API Methods

export function getAcademyLeads(academySlug: string): AcademyLead[] {
  const allLeads = loadFromStorage<AcademyLead[]>(STORAGE_KEYS.LEADS, DEFAULT_LEADS)
  return allLeads.filter(l => l.academySlug === academySlug)
}

export function updateLeadStatus(leadId: string, status: AcademyLead['status'], note?: string): AcademyLead[] {
  const allLeads = loadFromStorage<AcademyLead[]>(STORAGE_KEYS.LEADS, DEFAULT_LEADS)
  const updated = allLeads.map(l => {
    if (l.id === leadId) {
      return {
        ...l,
        status,
        notes: note ? `${l.notes ? l.notes + '\n' : ''}[${new Date().toLocaleDateString('en-IN')}] ${note}` : l.notes,
      }
    }
    return l
  })
  saveToStorage(STORAGE_KEYS.LEADS, updated)
  return updated
}

export function addAcademyLead(lead: Omit<AcademyLead, 'id' | 'enquiryToken' | 'submittedAt'>): AcademyLead {
  const allLeads = loadFromStorage<AcademyLead[]>(STORAGE_KEYS.LEADS, DEFAULT_LEADS)
  const token = `ENQ-${lead.sport.slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`
  const newLead: AcademyLead = {
    ...lead,
    id: `lead-${Date.now()}`,
    enquiryToken: token,
    submittedAt: new Date().toISOString(),
  }
  const updated = [newLead, ...allLeads]
  saveToStorage(STORAGE_KEYS.LEADS, updated)
  return newLead
}

export function getAcademyBatches(academySlug: string): AcademyBatch[] {
  const allBatches = loadFromStorage<AcademyBatch[]>(STORAGE_KEYS.BATCHES, DEFAULT_BATCHES)
  return allBatches.filter(b => b.academySlug === academySlug && b.isActive)
}

export function getAllBatches(academySlug: string): AcademyBatch[] {
  const allBatches = loadFromStorage<AcademyBatch[]>(STORAGE_KEYS.BATCHES, DEFAULT_BATCHES)
  return allBatches.filter(b => b.academySlug === academySlug)
}

export function saveAcademyBatch(batch: Omit<AcademyBatch, 'id' | 'enrolledCount'> & { id?: string }): AcademyBatch {
  const allBatches = loadFromStorage<AcademyBatch[]>(STORAGE_KEYS.BATCHES, DEFAULT_BATCHES)
  if (batch.id) {
    const updated = allBatches.map(b => (b.id === batch.id ? { ...b, ...batch } : b))
    saveToStorage(STORAGE_KEYS.BATCHES, updated)
    return updated.find(b => b.id === batch.id)!
  }
  const newBatch: AcademyBatch = {
    ...batch,
    id: `batch-${Date.now()}`,
    enrolledCount: 0,
  }
  const updated = [newBatch, ...allBatches]
  saveToStorage(STORAGE_KEYS.BATCHES, updated)
  return newBatch
}

export function deleteAcademyBatch(batchId: string): void {
  const allBatches = loadFromStorage<AcademyBatch[]>(STORAGE_KEYS.BATCHES, DEFAULT_BATCHES)
  const updated = allBatches.filter(b => b.id !== batchId)
  saveToStorage(STORAGE_KEYS.BATCHES, updated)
}

export function getAcademyStudents(academySlug: string): AcademyStudent[] {
  const allStudents = loadFromStorage<AcademyStudent[]>(STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS)
  return allStudents.filter(s => s.academySlug === academySlug)
}

export function saveAcademyStudent(student: Omit<AcademyStudent, 'id'> & { id?: string }): AcademyStudent {
  const allStudents = loadFromStorage<AcademyStudent[]>(STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS)
  if (student.id) {
    const updated = allStudents.map(s => (s.id === student.id ? { ...s, ...student } : s))
    saveToStorage(STORAGE_KEYS.STUDENTS, updated)
    return updated.find(s => s.id === student.id)!
  }
  const newStudent: AcademyStudent = {
    ...student,
    id: `std-${Date.now()}`,
  }
  const updated = [newStudent, ...allStudents]
  saveToStorage(STORAGE_KEYS.STUDENTS, updated)
  return newStudent
}

export function recordStudentPayment(studentId: string, amount?: number, method: 'upi' | 'cash' = 'upi'): AcademyStudent | null {
  const allStudents = loadFromStorage<AcademyStudent[]>(STORAGE_KEYS.STUDENTS, DEFAULT_STUDENTS)
  const student = allStudents.find(s => s.id === studentId)
  if (!student) return null

  // Calculate next month's due date
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  const nextDueDate = nextMonth.toISOString().slice(0, 10)

  const updatedStudent: AcademyStudent = {
    ...student,
    monthlyFee: typeof amount === 'number' && amount > 0 ? amount : student.monthlyFee,
    feeStatus: 'paid',
    lastPaymentDate: `${now.toISOString().slice(0, 10)} (${method.toUpperCase()})`,
    nextDueDate,
  }

  const updatedAll = allStudents.map(s => (s.id === studentId ? updatedStudent : s))
  saveToStorage(STORAGE_KEYS.STUDENTS, updatedAll)
  return updatedStudent
}

export function getAllAcademyTrialPasses(): AcademyTrialPass[] {
  return loadFromStorage<AcademyTrialPass[]>(STORAGE_KEYS.PASSES, [])
}

export function lookupTrialPass(passNumber: string): AcademyTrialPass | null {
  const clean = passNumber.trim().toUpperCase()
  const all = getAllAcademyTrialPasses()
  return all.find(p => p.passNumber.toUpperCase() === clean || p.id.toUpperCase() === clean) || null
}

export function admitTrialPass(
  passNumber: string,
  gatekeeperName: string = 'Ground Gatekeeper'
): { success: boolean; message: string; pass?: AcademyTrialPass } {
  const clean = passNumber.trim().toUpperCase()
  const all = getAllAcademyTrialPasses()
  const existing = all.find(p => p.passNumber.toUpperCase() === clean || p.id.toUpperCase() === clean)

  if (!existing) {
    return { success: false, message: 'Selection trial pass not found' }
  }

  if (existing.status === 'used') {
    return {
      success: false,
      message: `Pass was already admitted at ${existing.checkedInAt ? new Date(existing.checkedInAt).toLocaleTimeString() : 'the ground'}${existing.checkedInBy ? ` by ${existing.checkedInBy}` : ''}.`,
      pass: existing,
    }
  }

  if (existing.status === 'cancelled') {
    return { success: false, message: 'This selection pass has been cancelled by the academy.', pass: existing }
  }

  const updated: AcademyTrialPass = {
    ...existing,
    status: 'used',
    checkedInAt: new Date().toISOString(),
    checkedInBy: gatekeeperName,
  }

  const updatedList = all.map(p => (p.id === existing.id ? updated : p))
  saveToStorage(STORAGE_KEYS.PASSES, updatedList)

  // Sync to Academy CRM lead if matching
  try {
    const leads = getAcademyLeads(existing.academySlug)
    const matchingLead = leads.find(
      l => l.studentName.toLowerCase() === existing.studentName.toLowerCase() || l.parentPhone === existing.parentPhone
    )
    if (matchingLead) {
      updateLeadStatus(matchingLead.id, 'enrolled')
    }
  } catch {
    // ignore
  }

  return {
    success: true,
    message: `Athlete ${existing.studentName} successfully admitted for ${existing.sport} trial at ${existing.academyName}!`,
    pass: updated,
  }
}

export function getAcademyTrialPasses(academySlug: string): AcademyTrialPass[] {
  const allPasses = loadFromStorage<AcademyTrialPass[]>(STORAGE_KEYS.PASSES, [])
  return allPasses.filter(p => p.academySlug === academySlug)
}

export function createTrialPass(input: {
  academySlug: string
  academyName: string
  studentName: string
  parentPhone: string
  sport: string
  trialDate: string
  reportingTime: string
  venueAddress: string
  reportingInstructions?: string
}): AcademyTrialPass {
  const allPasses = loadFromStorage<AcademyTrialPass[]>(STORAGE_KEYS.PASSES, [])
  const passNumber = `PASS-${input.sport.slice(0, 3).toUpperCase()}-${Date.now().toString(36).slice(-5).toUpperCase()}`
  const qrCodePayload = `https://khelgrid.com/verify-pass?id=${passNumber}&sport=${encodeURIComponent(input.sport)}`

  const newPass: AcademyTrialPass = {
    id: `pass-${Date.now()}`,
    passNumber,
    academySlug: input.academySlug,
    academyName: input.academyName,
    studentName: input.studentName,
    parentPhone: input.parentPhone,
    sport: input.sport,
    trialDate: input.trialDate,
    reportingTime: input.reportingTime,
    venueAddress: input.venueAddress,
    reportingInstructions: input.reportingInstructions || 'Please arrive 15 minutes before reporting time with appropriate sporting kit and valid age proof.',
    qrCodePayload,
    status: 'valid',
    issuedAt: new Date().toISOString(),
  }

  const updated = [newPass, ...allPasses]
  saveToStorage(STORAGE_KEYS.PASSES, updated)
  return newPass
}

export function getAcademySettings(academySlug: string, defaultName = 'Sports Academy'): AcademySettings {
  const allSettings = loadFromStorage<Record<string, AcademySettings>>(STORAGE_KEYS.SETTINGS, {})
  if (allSettings[academySlug]) {
    return allSettings[academySlug]
  }
  return {
    academySlug,
    academyName: defaultName,
    directorName: 'Academy Coaching Director',
    directorWhatsApp: '9845012345',
    directorEmail: 'admissions@khelgrid.com',
    upiVpa: 'academy@upi',
    autoWhatsAppRoutingEnabled: true,
    isProUnlocked: true, // Free during Grassroots Launch Phase
  }
}

export function saveAcademySettings(settings: AcademySettings): void {
  const allSettings = loadFromStorage<Record<string, AcademySettings>>(STORAGE_KEYS.SETTINGS, {})
  allSettings[settings.academySlug] = settings
  saveToStorage(STORAGE_KEYS.SETTINGS, allSettings)
}

// WhatsApp Routing & Deep-Link Generators

export function generateWhatsAppLeadRoutingUrl(lead: AcademyLead, directorWhatsApp: string): string {
  const cleanPhone = directorWhatsApp.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
  const message = [
    `*KhelGrid Academy Lead Alert* 🏆`,
    ``,
    `Candidate: *${lead.studentName}* (Age: ${lead.studentAge})`,
    `Parent: ${lead.parentName} (${lead.parentPhone})`,
    `Sport: ${lead.sport}`,
    `Batch: ${lead.batchName || lead.batchType}`,
    `Request Type: ${lead.requestType === 'free_trial' ? 'Free Trial' : lead.requestType === 'scholarship_assessment' ? 'Scholarship' : 'Regular Admission'}`,
    `Token: ${lead.enquiryToken}`,
    ``,
    `Notes: "${lead.notes || 'Interested in batch admission'}"`,
    ``,
    `_Sent via KhelGrid Academy Admissions Desk_`,
  ].join('\n')

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
}

export function generateWhatsAppParentContactUrl(lead: AcademyLead, academyName: string): string {
  const cleanPhone = lead.parentPhone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
  const message = [
    `Dear ${lead.parentName},`,
    ``,
    `Greetings from *${academyName}*!`,
    ``,
    `We received your admission enquiry on KhelGrid for *${lead.studentName}* (${lead.sport}).`,
    `We would love to invite you for an on-ground session/trial.`,
    ``,
    `Enquiry Ref: *${lead.enquiryToken}*`,
    `Please let us know your preferred date and time this week.`,
    ``,
    `Warm regards,`,
    `Admissions Team · ${academyName}`,
  ].join('\n')

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
}

export function generateWhatsAppFeeReminderUrl(student: AcademyStudent, academyName: string, upiVpa?: string): string {
  const cleanPhone = student.parentPhone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
  const upiLink = upiVpa
    ? `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(academyName)}&am=${student.monthlyFee}&cu=INR&tn=${encodeURIComponent(`Coaching Fee - ${student.studentName}`)}`
    : ''

  const message = [
    `Dear ${student.parentName},`,
    ``,
    `This is a gentle reminder from *${academyName}* that the monthly coaching fee for *${student.studentName}* (${student.batchName}) is due:`,
    ``,
    `Amount: *₹${student.monthlyFee.toLocaleString('en-IN')}*`,
    `Due Date: *${student.nextDueDate}*`,
    upiVpa ? `UPI ID: *${upiVpa}*` : '',
    upiLink ? `Direct UPI Pay: ${upiLink}` : '',
    ``,
    `You can pay directly via any UPI app (GPay, PhonePe, Paytm). Kindly share the transaction screenshot once completed.`,
    ``,
    `Thank you,`,
    `Administration · ${academyName}`,
  ].filter(Boolean).join('\n')

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
}

export function generateUpiPayLink(params: { vpa: string; name: string; amount: number; note: string }): string {
  const { vpa, name, amount, note } = params
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`
}

export function getAcademySaaSSummary(academySlug: string) {
  const leads = getAcademyLeads(academySlug)
  const batches = getAcademyBatches(academySlug)
  const students = getAcademyStudents(academySlug)
  const passes = getAcademyTrialPasses(academySlug)

  const newLeadsCount = leads.filter(l => l.status === 'new').length
  const totalStudents = students.length
  const paidStudents = students.filter(s => s.feeStatus === 'paid').length
  const totalRevenue = students.reduce((acc, s) => acc + (s.feeStatus === 'paid' ? s.monthlyFee : 0), 0)
  const pendingRevenue = students.reduce((acc, s) => acc + (s.feeStatus !== 'paid' ? s.monthlyFee : 0), 0)

  return {
    totalLeads: leads.length,
    newLeadsCount,
    totalBatches: batches.length,
    totalStudents,
    paidStudents,
    totalRevenue,
    pendingRevenue,
    collectionRate: totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 100,
    trialPassesCount: passes.length,
  }
}

export function getRegisteredAcademies(): RegisteredAcademy[] {
  return loadFromStorage<RegisteredAcademy[]>(STORAGE_KEYS.REGISTERED_ACADEMIES, INITIAL_REGISTERED_ACADEMIES)
}

export function registerCustomAcademy(params: {
  name: string
  sport: string
  city: string
  state?: string
  directorName: string
  directorWhatsApp: string
  upiVpa: string
}): RegisteredAcademy {
  const existing = getRegisteredAcademies()
  const baseSlug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `academy-${Date.now()}`

  let slug = baseSlug
  let counter = 1
  while (existing.some(a => a.slug === slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  const newAcademy: RegisteredAcademy = {
    id: `custom-acad-${Date.now()}`,
    slug,
    name: params.name.trim(),
    sport: params.sport.trim() || 'Multi-Sport',
    city: params.city.trim() || 'India',
    state: (params.state || '').trim() || 'India',
    directorName: params.directorName.trim(),
    directorWhatsApp: params.directorWhatsApp.replace(/\D/g, ''),
    upiVpa: params.upiVpa.trim(),
    isCustom: true,
    verificationStatus: 'pending_review',
  }

  const updated = [newAcademy, ...existing]
  saveToStorage(STORAGE_KEYS.REGISTERED_ACADEMIES, updated)

  // Seed default settings for this newly registered academy
  saveAcademySettings({
    academySlug: slug,
    academyName: newAcademy.name,
    directorName: newAcademy.directorName || '',
    directorWhatsApp: newAcademy.directorWhatsApp || '',
    upiVpa: newAcademy.upiVpa || '',
    autoWhatsAppRoutingEnabled: true,
    isProUnlocked: true,
  })

  markOnboardingCompleted()
  return newAcademy
}

export function confirmAndVerifyAcademy(slug: string): boolean {
  const academies = getRegisteredAcademies()
  let found = false
  const updated = academies.map(a => {
    if (a.slug === slug) {
      found = true
      return { ...a, verificationStatus: 'verified' as const }
    }
    return a
  })
  if (found) {
    saveToStorage(STORAGE_KEYS.REGISTERED_ACADEMIES, updated)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khelgrid:academy-verified', { detail: { slug } }))
    }
  }
  return found
}

export function revokeAcademyVerification(slug: string): boolean {
  const academies = getRegisteredAcademies()
  let found = false
  const updated = academies.map(a => {
    if (a.slug === slug) {
      found = true
      return { ...a, verificationStatus: 'pending_review' as const }
    }
    return a
  })
  if (found) {
    saveToStorage(STORAGE_KEYS.REGISTERED_ACADEMIES, updated)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('khelgrid:academy-verification-revoked', { detail: { slug } }))
    }
  }
  return found
}

export function hasCompletedOnboarding(): boolean {
  return loadFromStorage<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETED, false)
}

export function markOnboardingCompleted(): void {
  saveToStorage(STORAGE_KEYS.ONBOARDING_COMPLETED, true)
}

// -------------------------------------------------------------
// Academy Staff & Multi-Coach Operations
// -------------------------------------------------------------

export function getAcademyStaff(academySlug: string): AcademyStaffMember[] {
  const allStaff = loadFromStorage<AcademyStaffMember[]>(STORAGE_KEYS.STAFF, DEFAULT_STAFF)
  return allStaff.filter(s => s.academySlug === academySlug)
}

export function saveAcademyStaffMember(member: Omit<AcademyStaffMember, 'id'> & { id?: string }): AcademyStaffMember {
  const allStaff = loadFromStorage<AcademyStaffMember[]>(STORAGE_KEYS.STAFF, DEFAULT_STAFF)
  if (member.id) {
    const updated = allStaff.map(s => (s.id === member.id ? { ...s, ...member } : s))
    saveToStorage(STORAGE_KEYS.STAFF, updated)
    return updated.find(s => s.id === member.id)!
  }
  const newStaff: AcademyStaffMember = {
    ...member,
    id: `staff-${Date.now()}`,
  }
  const updated = [newStaff, ...allStaff]
  saveToStorage(STORAGE_KEYS.STAFF, updated)
  return newStaff
}

export function deleteAcademyStaffMember(memberId: string): void {
  const allStaff = loadFromStorage<AcademyStaffMember[]>(STORAGE_KEYS.STAFF, DEFAULT_STAFF)
  const updated = allStaff.filter(s => s.id !== memberId)
  saveToStorage(STORAGE_KEYS.STAFF, updated)
}

// -------------------------------------------------------------
// Academy Cash & UPI Financial Ledger
// -------------------------------------------------------------

export function getAcademyFeeTransactions(academySlug: string): AcademyFeeTransaction[] {
  const allTx = loadFromStorage<AcademyFeeTransaction[]>(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS)
  return allTx.filter(t => t.academySlug === academySlug)
}

export function recordFeeTransaction(tx: Omit<AcademyFeeTransaction, 'id' | 'receiptNumber'>): AcademyFeeTransaction {
  const allTx = loadFromStorage<AcademyFeeTransaction[]>(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS)
  const receiptNumber = `KGR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
  const newTx: AcademyFeeTransaction = {
    ...tx,
    id: `tx-${Date.now()}`,
    receiptNumber,
  }
  const updated = [newTx, ...allTx]
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, updated)
  return newTx
}

export function settleCashInHand(transactionId: string): void {
  const allTx = loadFromStorage<AcademyFeeTransaction[]>(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS)
  const updated = allTx.map(t => (t.id === transactionId ? { ...t, status: 'settled' as const } : t))
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, updated)
}

export function getAcademyLedgerSummary(academySlug: string): AcademyLedgerSummary {
  const students = getAcademyStudents(academySlug)
  const transactions = getAcademyFeeTransactions(academySlug)

  const totalExpectedMonthly = students.reduce((sum, s) => sum + s.monthlyFee, 0)
  const totalCollected = transactions.reduce((sum, t) => sum + t.amount, 0)
  const cashCollected = transactions.filter(t => t.paymentMode === 'cash').reduce((sum, t) => sum + t.amount, 0)
  const upiCollected = transactions.filter(t => t.paymentMode === 'direct_upi').reduce((sum, t) => sum + t.amount, 0)
  const pendingDues = Math.max(0, totalExpectedMonthly - totalCollected)
  const overdueCount = students.filter(s => s.feeStatus === 'overdue').length
  const cashInHand = transactions.filter(t => t.paymentMode === 'cash' && t.status === 'cash_in_hand').reduce((sum, t) => sum + t.amount, 0)
  const collectionRate = totalExpectedMonthly > 0 ? Math.round((totalCollected / totalExpectedMonthly) * 100) : 100

  return {
    totalExpectedMonthly,
    totalCollected,
    cashCollected,
    upiCollected,
    pendingDues,
    overdueCount,
    cashInHand,
    collectionRate,
  }
}
