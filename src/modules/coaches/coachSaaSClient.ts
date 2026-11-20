/**
 * KhelGrid Coach Operations & Trainee Management SaaS Client
 * Provides complete B2B tools for verified coaches and trainers across India:
 * - Trainee roster & automated UPI monthly fee collection
 * - Multi-sport coaching batches & 1-on-1 private slots
 * - Inbound parent consultation/trial inquiry CRM
 * - Federation / NIS Patiala credentials verification status
 * 
 * Free during Grassroots Launch Phase.
 */

export interface CoachTrainee {
  id: string
  coachSlug: string
  traineeName: string
  parentName: string
  parentPhone: string
  sport: string
  ageCategory: string
  batchId: string
  batchName: string
  monthlyFee: number
  feeStatus: 'paid' | 'due_soon' | 'overdue'
  nextDueDate: string
  lastPaymentDate?: string
  upiVpa?: string
}

export interface CoachBatch {
  id: string
  coachSlug: string
  batchName: string
  sport: string
  days: string // e.g. "Mon, Wed, Fri"
  timings: string // e.g. "06:00 AM – 08:00 AM"
  ageGroup: string // e.g. "U-14 (10–14 yrs)"
  monthlyFee: number
  maxCapacity: number
  enrolledCount: number
  isActive: boolean
}

export interface CoachInquiry {
  id: string
  coachSlug: string
  referenceId: string
  athleteName: string
  parentName?: string
  phone: string
  email?: string
  sport: string
  ageCategory: string
  skillLevel: string
  objective: string
  preferredBatch: string
  status: 'new' | 'scheduled' | 'enrolled' | 'archived'
  submittedAt: string
  notes?: string
}

export interface RegisteredCoach {
  id: string
  slug: string
  name: string
  sport: string
  city: string
  state: string
  phone: string
  email: string
  certification: string
  experienceYears: number
  monthlyFee: number
  upiVpa: string
  bio?: string
  isCustom?: boolean
  verificationStatus?: 'unverified' | 'pending_review' | 'verified' | 'rejected'
}

export interface TraineeCombineBenchmark {
  id: string
  coachSlug: string
  traineeId: string
  traineeName: string
  testDate: string
  ageGroup: string
  sprint30mSeconds?: number
  verticalJumpCm?: number
  yoYoBeepLevel?: string
  proAgilitySeconds?: number
  compositePercentile: number
  tier: 'Elite (Top 5%)' | 'Advanced (Top 15%)' | 'Competitive' | 'Developing'
  notes?: string
}

export interface CoachTrainingPlan {
  id: string
  coachSlug: string
  batchId: string
  batchName: string
  weekTitle: string
  focusArea: string
  drills: {
    day: string
    title: string
    durationMinutes: number
    instructions: string
  }[]
  homeworkChallenge: string
  createdAt: string
}

export interface CoachEndorsementRecord {
  id: string
  coachSlug: string
  coachName: string
  coachCertification: string
  traineeName: string
  traineeId: string
  badgeTitle: string
  sport: string
  endorsementText: string
  awardedDate: string
  verificationHash: string
}

export const STORAGE_COACH_KEYS = {
  COACHES: 'khelgrid_coach_saas_registered_coaches',
  TRAINEES: 'khelgrid_coach_saas_trainees',
  BATCHES: 'khelgrid_coach_saas_batches',
  INQUIRIES: 'khelgrid_coach_saas_inquiries',
  COMBINES: 'khelgrid_coach_saas_combines',
  TRAINING_PLANS: 'khelgrid_coach_saas_training_plans',
  ENDORSEMENTS: 'khelgrid_coach_saas_endorsements',
}

export const INITIAL_REGISTERED_COACHES: RegisteredCoach[] = [
  {
    id: 'zaheer-farooq-coach',
    slug: 'zaheer-farooq-coach',
    name: 'Coach Zaheer Farooq',
    sport: 'Cricket',
    city: 'Delhi NCR',
    state: 'Delhi',
    phone: '9811098765',
    email: 'zaheer.coach@khelgrid.com',
    certification: 'BCCI Level 2 · NIS Patiala Senior Diploma',
    experienceYears: 14,
    monthlyFee: 3500,
    upiVpa: 'zaheer.coach@okhdfcbank',
    bio: 'Specialist pace bowling & match simulation coach. Trained over 45 state and district junior representatives.',
    verificationStatus: 'verified',
  },
  {
    id: 'anand-patil-coach',
    slug: 'anand-patil-coach',
    name: 'Coach Anand Patil',
    sport: 'Badminton',
    city: 'Pune',
    state: 'Maharashtra',
    phone: '9822012345',
    email: 'director.shivaji@khelgrid.com',
    certification: 'BWF Level 1 · BAI High Performance Certified',
    experienceYears: 11,
    monthlyFee: 4000,
    upiVpa: 'anand.coach@okaxis',
    bio: 'Former national circuit player specializing in footwork biomechanics and rally control for junior champions.',
    verificationStatus: 'verified',
  },
]

export const DEFAULT_COACH_BATCHES: CoachBatch[] = [
  {
    id: 'cbatch-zf-1',
    coachSlug: 'zaheer-farooq-coach',
    batchName: 'Morning Elite Fast Bowlers Camp',
    sport: 'Cricket',
    days: 'Mon, Wed, Fri',
    timings: '06:30 AM – 08:30 AM',
    ageGroup: 'U-16 (12–16 yrs)',
    monthlyFee: 3500,
    maxCapacity: 15,
    enrolledCount: 12,
    isActive: true,
  },
  {
    id: 'cbatch-zf-2',
    coachSlug: 'zaheer-farooq-coach',
    batchName: 'Evening Grassroots All-Rounders',
    sport: 'Cricket',
    days: 'Tue, Thu, Sat',
    timings: '04:30 PM – 06:30 PM',
    ageGroup: 'U-13 (8–13 yrs)',
    monthlyFee: 3000,
    maxCapacity: 20,
    enrolledCount: 16,
    isActive: true,
  },
  {
    id: 'cbatch-zf-3',
    coachSlug: 'zaheer-farooq-coach',
    batchName: 'Weekend 1-on-1 Biomechanics Clinics',
    sport: 'Cricket',
    days: 'Sat, Sun',
    timings: '09:00 AM – 11:00 AM',
    ageGroup: 'Open (Pro / Trials Prep)',
    monthlyFee: 5000,
    maxCapacity: 6,
    enrolledCount: 5,
    isActive: true,
  },
]

export const DEFAULT_COACH_TRAINEES: CoachTrainee[] = [
  {
    id: 'tr-01',
    coachSlug: 'zaheer-farooq-coach',
    traineeName: 'Arjun Mehra',
    parentName: 'Vikram Mehra',
    parentPhone: '9811122334',
    sport: 'Cricket',
    ageCategory: 'U-15',
    batchId: 'cbatch-zf-1',
    batchName: 'Morning Elite Fast Bowlers Camp',
    monthlyFee: 3500,
    feeStatus: 'paid',
    nextDueDate: '10 Dec 2026',
    lastPaymentDate: '10 Nov 2026',
    upiVpa: 'zaheer.coach@okhdfcbank',
  },
  {
    id: 'tr-02',
    coachSlug: 'zaheer-farooq-coach',
    traineeName: 'Rohan Deshmukh',
    parentName: 'Priya Deshmukh',
    parentPhone: '9822334455',
    sport: 'Cricket',
    ageCategory: 'U-14',
    batchId: 'cbatch-zf-1',
    batchName: 'Morning Elite Fast Bowlers Camp',
    monthlyFee: 3500,
    feeStatus: 'due_soon',
    nextDueDate: '25 Nov 2026',
    upiVpa: 'zaheer.coach@okhdfcbank',
  },
  {
    id: 'tr-03',
    coachSlug: 'zaheer-farooq-coach',
    traineeName: 'Samir Khan',
    parentName: 'Farhan Khan',
    parentPhone: '9844556677',
    sport: 'Cricket',
    ageCategory: 'U-12',
    batchId: 'cbatch-zf-2',
    batchName: 'Evening Grassroots All-Rounders',
    monthlyFee: 3000,
    feeStatus: 'paid',
    nextDueDate: '05 Dec 2026',
    lastPaymentDate: '05 Nov 2026',
    upiVpa: 'zaheer.coach@okhdfcbank',
  },
  {
    id: 'tr-04',
    coachSlug: 'zaheer-farooq-coach',
    traineeName: 'Devansh Roy',
    parentName: 'Amitabh Roy',
    parentPhone: '9877889900',
    sport: 'Cricket',
    ageCategory: 'U-13',
    batchId: 'cbatch-zf-2',
    batchName: 'Evening Grassroots All-Rounders',
    monthlyFee: 3000,
    feeStatus: 'overdue',
    nextDueDate: '15 Nov 2026',
    upiVpa: 'zaheer.coach@okhdfcbank',
  },
]

export const DEFAULT_COACH_INQUIRIES: CoachInquiry[] = [
  {
    id: 'inq-01',
    coachSlug: 'zaheer-farooq-coach',
    referenceId: 'INQ-CRI-8921',
    athleteName: 'Dhruv Sehgal',
    parentName: 'Gaurav Sehgal',
    phone: '9810198234',
    email: 'gaurav.sehgal@example.com',
    sport: 'Cricket',
    ageCategory: 'U-14',
    skillLevel: 'Intermediate',
    objective: 'Pace Bowling Action Correction & Outswinger Grip',
    preferredBatch: 'Morning Elite Fast Bowlers Camp',
    status: 'new',
    submittedAt: 'Today, 08:30 AM',
    notes: 'Wants evaluation for upcoming Delhi state junior selection trials.',
  },
  {
    id: 'inq-02',
    coachSlug: 'zaheer-farooq-coach',
    referenceId: 'INQ-CRI-8922',
    athleteName: 'Kunal Singhal',
    parentName: 'Sunil Singhal',
    phone: '9829012345',
    sport: 'Cricket',
    ageCategory: 'U-12',
    skillLevel: 'Beginner',
    objective: 'Grassroots fundamentals and fitness',
    preferredBatch: 'Evening Grassroots All-Rounders',
    status: 'scheduled',
    submittedAt: 'Yesterday, 04:15 PM',
    notes: 'Free trial assessment scheduled for Saturday 4:30 PM.',
  },
]

export const DEFAULT_COMBINES: TraineeCombineBenchmark[] = [
  {
    id: 'comb-1',
    coachSlug: 'zaheer-farooq-coach',
    traineeId: 'tr-01',
    traineeName: 'Arjun Mehra',
    testDate: '2026-11-15',
    ageGroup: 'U-15',
    sprint30mSeconds: 4.12,
    verticalJumpCm: 52,
    yoYoBeepLevel: '17.4',
    proAgilitySeconds: 4.58,
    compositePercentile: 94,
    tier: 'Elite (Top 5%)',
    notes: 'Exceptional acceleration in first 10 meters. Ready for fast-bowler zonal trials.',
  },
  {
    id: 'comb-2',
    coachSlug: 'zaheer-farooq-coach',
    traineeId: 'tr-02',
    traineeName: 'Rohan Deshmukh',
    testDate: '2026-11-12',
    ageGroup: 'U-14',
    sprint30mSeconds: 4.38,
    verticalJumpCm: 44,
    yoYoBeepLevel: '16.1',
    proAgilitySeconds: 4.82,
    compositePercentile: 82,
    tier: 'Advanced (Top 15%)',
    notes: 'Solid endurance base. Working on plyometric power generation.',
  },
]

export const DEFAULT_TRAINING_PLANS: CoachTrainingPlan[] = [
  {
    id: 'plan-1',
    coachSlug: 'zaheer-farooq-coach',
    batchId: 'cbatch-zf-1',
    batchName: 'Morning Elite Fast Bowlers Camp',
    weekTitle: 'Week 4: Biomechanical Seam Position & Target Bowling',
    focusArea: 'Wrist snapping at delivery stride and front-arm pull down',
    drills: [
      { day: 'Mon', title: 'Target Cone Bowling (Good Length Corridor)', durationMinutes: 45, instructions: '6 sets of 6 balls targeting 4x2 ft target zone at 120+ km/h' },
      { day: 'Wed', title: '4-Pace Run-up Deceleration & Follow-through', durationMinutes: 40, instructions: 'Biomechanics check on non-bowling arm stabilization' },
      { day: 'Fri', title: 'Match Simulation: Death Overs Yorkers & Slower Balls', durationMinutes: 50, instructions: 'Field placements set; defensive yorkers under pressure' },
    ],
    homeworkChallenge: 'Daily 50 wall seam snaps + 3 sets of 15 resistance band rotator cuff pulls.',
    createdAt: '2026-11-17T06:00:00Z',
  },
]

export const DEFAULT_ENDORSEMENTS: CoachEndorsementRecord[] = [
  {
    id: 'end-1',
    coachSlug: 'zaheer-farooq-coach',
    coachName: 'Coach Zaheer Farooq',
    coachCertification: 'BCCI Level 2 · NIS Patiala Senior Diploma',
    traineeName: 'Arjun Mehra',
    traineeId: 'tr-01',
    badgeTitle: 'Verified Express Pace Bowler (125+ km/h)',
    sport: 'Cricket',
    endorsementText: 'Disciplined work ethic with natural upright seam release and repeatable gather. Highly recommended for district & state age-group selection.',
    awardedDate: '2026-11-18',
    verificationHash: 'KG-CERT-ZF-89214',
  },
]

// Memory fallback store
let memoryCoachStore: Record<string, unknown> = {}

export function clearCoachSaaSMemoryStore(): void {
  memoryCoachStore = {}
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_COACH_KEYS.COACHES)
      window.localStorage.removeItem(STORAGE_COACH_KEYS.TRAINEES)
      window.localStorage.removeItem(STORAGE_COACH_KEYS.BATCHES)
      window.localStorage.removeItem(STORAGE_COACH_KEYS.INQUIRIES)
      window.localStorage.removeItem(STORAGE_COACH_KEYS.COMBINES)
      window.localStorage.removeItem(STORAGE_COACH_KEYS.TRAINING_PLANS)
      window.localStorage.removeItem(STORAGE_COACH_KEYS.ENDORSEMENTS)
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
  return (memoryCoachStore[key] as T) ?? defaultValue
}

function saveToStorage<T>(key: string, value: T): void {
  memoryCoachStore[key] = value
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }
}

export function getRegisteredCoaches(): RegisteredCoach[] {
  return loadFromStorage<RegisteredCoach[]>(STORAGE_COACH_KEYS.COACHES, INITIAL_REGISTERED_COACHES)
}

export function getCurrentCoach(slug: string): RegisteredCoach {
  const all = getRegisteredCoaches()
  return (
    all.find(c => c.slug === slug) || {
      id: slug,
      slug,
      name: 'Coach Specialist',
      sport: 'Multi-Sport',
      city: 'Delhi NCR',
      state: 'Delhi',
      phone: '9876543210',
      email: 'coach@khelgrid.com',
      certification: 'SAI NIS Certified Coach',
      experienceYears: 5,
      monthlyFee: 3000,
      upiVpa: 'coach@upi',
      verificationStatus: 'pending_review',
      isCustom: true,
    }
  )
}

export function getCoachBatches(coachSlug: string): CoachBatch[] {
  const allBatches = loadFromStorage<CoachBatch[]>(STORAGE_COACH_KEYS.BATCHES, DEFAULT_COACH_BATCHES)
  return allBatches.filter(b => b.coachSlug === coachSlug)
}

export function saveCoachBatch(batch: Omit<CoachBatch, 'id' | 'enrolledCount'> & { id?: string }): CoachBatch {
  const allBatches = loadFromStorage<CoachBatch[]>(STORAGE_COACH_KEYS.BATCHES, DEFAULT_COACH_BATCHES)
  if (batch.id) {
    const updated = allBatches.map(b => (b.id === batch.id ? { ...b, ...batch } : b))
    saveToStorage(STORAGE_COACH_KEYS.BATCHES, updated)
    return updated.find(b => b.id === batch.id)!
  }
  const newBatch: CoachBatch = {
    ...batch,
    id: `cbatch-${Date.now()}`,
    enrolledCount: 0,
    isActive: true,
  }
  const updated = [newBatch, ...allBatches]
  saveToStorage(STORAGE_COACH_KEYS.BATCHES, updated)
  return newBatch
}

export function deleteCoachBatch(batchId: string): void {
  const allBatches = loadFromStorage<CoachBatch[]>(STORAGE_COACH_KEYS.BATCHES, DEFAULT_COACH_BATCHES)
  const updated = allBatches.filter(b => b.id !== batchId)
  saveToStorage(STORAGE_COACH_KEYS.BATCHES, updated)
}

export function getCoachTrainees(coachSlug: string): CoachTrainee[] {
  const allTrainees = loadFromStorage<CoachTrainee[]>(STORAGE_COACH_KEYS.TRAINEES, DEFAULT_COACH_TRAINEES)
  return allTrainees.filter(t => t.coachSlug === coachSlug)
}

export function saveCoachTrainee(trainee: Omit<CoachTrainee, 'id'> & { id?: string }): CoachTrainee {
  const allTrainees = loadFromStorage<CoachTrainee[]>(STORAGE_COACH_KEYS.TRAINEES, DEFAULT_COACH_TRAINEES)
  if (trainee.id) {
    const updated = allTrainees.map(t => (t.id === trainee.id ? { ...t, ...trainee } : t))
    saveToStorage(STORAGE_COACH_KEYS.TRAINEES, updated)
    return updated.find(t => t.id === trainee.id)!
  }
  const newTrainee: CoachTrainee = {
    ...trainee,
    id: `tr-${Date.now()}`,
  }
  const updated = [newTrainee, ...allTrainees]
  saveToStorage(STORAGE_COACH_KEYS.TRAINEES, updated)
  return newTrainee
}

export function recordTraineePayment(traineeId: string): void {
  const allTrainees = loadFromStorage<CoachTrainee[]>(STORAGE_COACH_KEYS.TRAINEES, DEFAULT_COACH_TRAINEES)
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  const nextDue = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`

  const updated = allTrainees.map(t => {
    if (t.id !== traineeId) return t
    return {
      ...t,
      feeStatus: 'paid' as const,
      lastPaymentDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      nextDueDate: nextDue,
    }
  })
  saveToStorage(STORAGE_COACH_KEYS.TRAINEES, updated)
}

export function getCoachInquiries(coachSlug: string): CoachInquiry[] {
  const allInquiries = loadFromStorage<CoachInquiry[]>(STORAGE_COACH_KEYS.INQUIRIES, DEFAULT_COACH_INQUIRIES)
  return allInquiries.filter(i => i.coachSlug === coachSlug)
}

export function updateCoachInquiryStatus(inquiryId: string, status: CoachInquiry['status']): void {
  const allInquiries = loadFromStorage<CoachInquiry[]>(STORAGE_COACH_KEYS.INQUIRIES, DEFAULT_COACH_INQUIRIES)
  const updated = allInquiries.map(i => (i.id === inquiryId ? { ...i, status } : i))
  saveToStorage(STORAGE_COACH_KEYS.INQUIRIES, updated)
}

export function addCoachInquiry(inquiry: {
  coachSlug: string
  athleteName: string
  parentName?: string
  phone: string
  sport: string
  ageCategory?: string
  skillLevel?: string
  preferredBatch?: string
  objective?: string
  referenceId?: string
}): CoachInquiry {
  const allInquiries = loadFromStorage<CoachInquiry[]>(STORAGE_COACH_KEYS.INQUIRIES, DEFAULT_COACH_INQUIRIES)
  const newRecord: CoachInquiry = {
    id: `inq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    coachSlug: inquiry.coachSlug,
    athleteName: inquiry.athleteName,
    parentName: inquiry.parentName || 'Parent',
    phone: inquiry.phone,
    sport: inquiry.sport,
    ageCategory: inquiry.ageCategory || 'U-14',
    skillLevel: inquiry.skillLevel || 'Intermediate',
    preferredBatch: inquiry.preferredBatch || 'Regular Clinic',
    objective: inquiry.objective || 'Skill Assessment',
    status: 'new',
    referenceId: inquiry.referenceId || `INQ-${Date.now().toString(36).toUpperCase()}`,
    submittedAt: new Date().toISOString(),
  }
  const updated = [newRecord, ...allInquiries]
  saveToStorage(STORAGE_COACH_KEYS.INQUIRIES, updated)
  return newRecord
}

export function getCoachSaaSSummary(coachSlug: string) {
  const trainees = getCoachTrainees(coachSlug)
  const batches = getCoachBatches(coachSlug)
  const inquiries = getCoachInquiries(coachSlug)

  const totalTrainees = trainees.length
  const paidTrainees = trainees.filter(t => t.feeStatus === 'paid').length
  const totalRevenue = trainees.reduce((acc, t) => acc + (t.feeStatus === 'paid' ? t.monthlyFee : 0), 0)
  const pendingRevenue = trainees.reduce((acc, t) => acc + (t.feeStatus !== 'paid' ? t.monthlyFee : 0), 0)
  const newInquiriesCount = inquiries.filter(i => i.status === 'new').length

  return {
    totalTrainees,
    paidTrainees,
    totalRevenue,
    pendingRevenue,
    collectionRate: totalTrainees > 0 ? Math.round((paidTrainees / totalTrainees) * 100) : 100,
    newInquiriesCount,
    totalBatches: batches.length,
  }
}

export function registerCustomCoach(params: {
  name: string
  sport: string
  city: string
  state?: string
  phone: string
  email: string
  certification: string
  experienceYears?: number
  monthlyFee?: number
  upiVpa?: string
}): RegisteredCoach {
  const existing = getRegisteredCoaches()
  const baseSlug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `coach-${Date.now()}`

  let slug = baseSlug
  let counter = 1
  while (existing.some(c => c.slug === slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  const newCoach: RegisteredCoach = {
    id: `custom-coach-${Date.now()}`,
    slug,
    name: params.name.trim(),
    sport: params.sport.trim() || 'Multi-Sport',
    city: params.city.trim() || 'Delhi NCR',
    state: (params.state || '').trim() || 'India',
    phone: params.phone.replace(/\D/g, ''),
    email: params.email.trim(),
    certification: params.certification.trim() || 'NIS / Federation Certified Coach',
    experienceYears: params.experienceYears || 5,
    monthlyFee: params.monthlyFee || 3000,
    upiVpa: (params.upiVpa || '').trim() || `${slug.replace(/-/g, '')}@upi`,
    isCustom: true,
    verificationStatus: 'pending_review',
  }

  const updated = [newCoach, ...existing]
  saveToStorage(STORAGE_COACH_KEYS.COACHES, updated)

  // Seed initial starter batch for this coach
  saveCoachBatch({
    coachSlug: slug,
    batchName: `Morning ${newCoach.sport} Coaching Camp`,
    sport: newCoach.sport,
    days: 'Mon, Wed, Fri',
    timings: '06:30 AM – 08:30 AM',
    ageGroup: 'U-14 (10–14 yrs)',
    monthlyFee: newCoach.monthlyFee,
    maxCapacity: 20,
    isActive: true,
  })

  return newCoach
}

export function confirmAndVerifyCoach(slug: string): boolean {
  const existing = getRegisteredCoaches()
  const match = existing.find(c => c.slug === slug)
  if (!match) return false

  match.verificationStatus = 'verified'
  const updated = existing.map(c => (c.slug === slug ? match : c))
  saveToStorage(STORAGE_COACH_KEYS.COACHES, updated)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khelgrid:coach-verified', { detail: { slug } }))
  }
  return true
}

export function revokeCoachVerification(slug: string): boolean {
  const existing = getRegisteredCoaches()
  const match = existing.find(c => c.slug === slug)
  if (!match) return false

  match.verificationStatus = 'pending_review'
  const updated = existing.map(c => (c.slug === slug ? match : c))
  saveToStorage(STORAGE_COACH_KEYS.COACHES, updated)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khelgrid:coach-verification-revoked', { detail: { slug } }))
  }
  return true
}

export function generateWhatsAppParentReplyUrl(inquiry: CoachInquiry, coachName: string): string {
  const cleanPhone = inquiry.phone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`

  const message = [
    `Dear ${inquiry.parentName || 'Parent'},`,
    ``,
    `Greetings from *${coachName}*!`,
    ``,
    `I received your coaching inquiry on KhelGrid for *${inquiry.athleteName}* (${inquiry.sport} · ${inquiry.skillLevel}).`,
    `Ref ID: *${inquiry.referenceId}*`,
    ``,
    `I would be delighted to invite ${inquiry.athleteName} for an on-ground assessment & trial session.`,
    `Please let me know if ${inquiry.preferredBatch} suits your schedule this week.`,
    ``,
    `Warm regards,`,
    `${coachName} · Verified Coach, KhelGrid`,
  ].join('\n')

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
}

export function generateWhatsAppTraineeFeeReminderUrl(trainee: CoachTrainee, coachName: string, upiVpa?: string): string {
  const cleanPhone = trainee.parentPhone.replace(/\D/g, '')
  const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
  const vpa = upiVpa || trainee.upiVpa || ''
  const upiLink = vpa
    ? `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(coachName)}&am=${trainee.monthlyFee}&cu=INR&tn=${encodeURIComponent(`Coaching Fee - ${trainee.traineeName}`)}`
    : ''

  const message = [
    `Dear ${trainee.parentName},`,
    ``,
    `This is a gentle coaching fee reminder from *${coachName}* for *${trainee.traineeName}* (${trainee.batchName}):`,
    ``,
    `Monthly Fee: *₹${trainee.monthlyFee.toLocaleString('en-IN')}*`,
    `Due Date: *${trainee.nextDueDate}*`,
    vpa ? `UPI ID: *${vpa}*` : '',
    upiLink ? `Direct UPI Pay: ${upiLink}` : '',
    ``,
    `Kindly share the transaction receipt after payment. Thank you for your continued support!`,
    ``,
    `Regards,`,
    `${coachName}`,
  ].filter(Boolean).join('\n')

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
}

export function generateUpiPayLink(params: { vpa: string; name: string; amount: number; note: string }): string {
  const { vpa, name, amount, note } = params
  return `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`
}

// -------------------------------------------------------------
// Combine Performance Benchmarks (KhelChronicle Normative Standards)
// -------------------------------------------------------------

export function calculateCombinePercentile(opts: {
  ageGroup: string
  sprint30m?: number
  verticalJump?: number
  yoYoLevel?: number
  proAgility?: number
}): { percentile: number; tier: 'Elite (Top 5%)' | 'Advanced (Top 15%)' | 'Competitive' | 'Developing' } {
  let scoreSum = 0
  let count = 0

  if (opts.sprint30m && opts.sprint30m > 0) {
    count++
    // Sprint: Lower is better. 4.10s = 98%, 4.30s = 85%, 4.50s = 70%, 4.80s = 45%
    if (opts.sprint30m <= 4.15) scoreSum += 95
    else if (opts.sprint30m <= 4.35) scoreSum += 85
    else if (opts.sprint30m <= 4.60) scoreSum += 70
    else scoreSum += 50
  }

  if (opts.verticalJump && opts.verticalJump > 0) {
    count++
    // Vertical Jump: Higher is better. 52cm = 95%, 45cm = 85%, 38cm = 65%
    if (opts.verticalJump >= 50) scoreSum += 95
    else if (opts.verticalJump >= 44) scoreSum += 85
    else if (opts.verticalJump >= 38) scoreSum += 70
    else scoreSum += 50
  }

  if (opts.yoYoLevel && opts.yoYoLevel > 0) {
    count++
    if (opts.yoYoLevel >= 17.0) scoreSum += 96
    else if (opts.yoYoLevel >= 15.5) scoreSum += 84
    else if (opts.yoYoLevel >= 14.0) scoreSum += 70
    else scoreSum += 50
  }

  if (opts.proAgility && opts.proAgility > 0) {
    count++
    if (opts.proAgility <= 4.60) scoreSum += 95
    else if (opts.proAgility <= 4.85) scoreSum += 84
    else scoreSum += 65
  }

  const percentile = count > 0 ? Math.round(scoreSum / count) : 75
  let tier: 'Elite (Top 5%)' | 'Advanced (Top 15%)' | 'Competitive' | 'Developing' = 'Developing'
  if (percentile >= 90) tier = 'Elite (Top 5%)'
  else if (percentile >= 80) tier = 'Advanced (Top 15%)'
  else if (percentile >= 65) tier = 'Competitive'

  return { percentile, tier }
}

export function getTraineeCombines(coachSlug: string): TraineeCombineBenchmark[] {
  const all = loadFromStorage<TraineeCombineBenchmark[]>(STORAGE_COACH_KEYS.COMBINES, DEFAULT_COMBINES)
  return all.filter(c => c.coachSlug === coachSlug)
}

export function saveTraineeCombine(combine: Omit<TraineeCombineBenchmark, 'id'> & { id?: string }): TraineeCombineBenchmark {
  const all = loadFromStorage<TraineeCombineBenchmark[]>(STORAGE_COACH_KEYS.COMBINES, DEFAULT_COMBINES)
  if (combine.id) {
    const updated = all.map(c => (c.id === combine.id ? { ...c, ...combine } : c))
    saveToStorage(STORAGE_COACH_KEYS.COMBINES, updated)
    return updated.find(c => c.id === combine.id)!
  }
  const newComb: TraineeCombineBenchmark = {
    ...combine,
    id: `comb-${Date.now()}`,
  }
  const updated = [newComb, ...all]
  saveToStorage(STORAGE_COACH_KEYS.COMBINES, updated)
  return newComb
}

// -------------------------------------------------------------
// Training Drill & Curriculum Planner
// -------------------------------------------------------------

export function getCoachTrainingPlans(coachSlug: string): CoachTrainingPlan[] {
  const all = loadFromStorage<CoachTrainingPlan[]>(STORAGE_COACH_KEYS.TRAINING_PLANS, DEFAULT_TRAINING_PLANS)
  return all.filter(p => p.coachSlug === coachSlug)
}

export function saveCoachTrainingPlan(plan: Omit<CoachTrainingPlan, 'id' | 'createdAt'> & { id?: string }): CoachTrainingPlan {
  const all = loadFromStorage<CoachTrainingPlan[]>(STORAGE_COACH_KEYS.TRAINING_PLANS, DEFAULT_TRAINING_PLANS)
  if (plan.id) {
    const updated = all.map(p => (p.id === plan.id ? { ...p, ...plan } : p))
    saveToStorage(STORAGE_COACH_KEYS.TRAINING_PLANS, updated)
    return updated.find(p => p.id === plan.id)!
  }
  const newPlan: CoachTrainingPlan = {
    ...plan,
    id: `plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  const updated = [newPlan, ...all]
  saveToStorage(STORAGE_COACH_KEYS.TRAINING_PLANS, updated)
  return newPlan
}

export function generateWhatsAppTrainingPlanUrl(plan: CoachTrainingPlan, coachName: string): string {
  const drillsList = plan.drills.map(d => `• *${d.day}:* ${d.title} (${d.durationMinutes} min)\n  _${d.instructions}_`).join('\n\n')

  const message = [
    `📋 *WEEKLY TRAINING DRILLS & FOCUS*`,
    `*Coach:* ${coachName}`,
    `*Batch:* ${plan.batchName}`,
    `*Curriculum:* ${plan.weekTitle}`,
    `*Key Focus:* ${plan.focusArea}`,
    `--------------------------------`,
    drillsList,
    `--------------------------------`,
    `🏠 *Home Practice Challenge:*`,
    `${plan.homeworkChallenge}`,
    `— KhelGrid Coach Operations`,
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

// -------------------------------------------------------------
// Official Coach Endorsements
// -------------------------------------------------------------

export function getCoachEndorsements(coachSlug: string): CoachEndorsementRecord[] {
  const all = loadFromStorage<CoachEndorsementRecord[]>(STORAGE_COACH_KEYS.ENDORSEMENTS, DEFAULT_ENDORSEMENTS)
  return all.filter(e => e.coachSlug === coachSlug)
}

export function awardCoachEndorsement(endorsement: Omit<CoachEndorsementRecord, 'id' | 'verificationHash' | 'awardedDate'>): CoachEndorsementRecord {
  const all = loadFromStorage<CoachEndorsementRecord[]>(STORAGE_COACH_KEYS.ENDORSEMENTS, DEFAULT_ENDORSEMENTS)
  const verificationHash = `KG-CERT-${endorsement.coachSlug.slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`
  const newEnd: CoachEndorsementRecord = {
    ...endorsement,
    id: `end-${Date.now()}`,
    verificationHash,
    awardedDate: new Date().toISOString().slice(0, 10),
  }
  const updated = [newEnd, ...all]
  saveToStorage(STORAGE_COACH_KEYS.ENDORSEMENTS, updated)
  return newEnd
}

export function generateWhatsAppEndorsementUrl(endorsement: CoachEndorsementRecord): string {
  const message = [
    `🛡️ *OFFICIAL COACH VERIFIED ENDORSEMENT*`,
    `*Athlete:* ${endorsement.traineeName}`,
    `*Sport:* ${endorsement.sport}`,
    `*Badge Awarded:* 🎖️ ${endorsement.badgeTitle}`,
    `*Endorsing Coach:* ${endorsement.coachName} (${endorsement.coachCertification})`,
    `*Verification Stamp:* \`${endorsement.verificationHash}\``,
    `--------------------------------`,
    `"${endorsement.endorsementText}"`,
    `--------------------------------`,
    `Permanently attached to official KhelGrid National Sports CV.`,
    `— Verified by KhelGrid National Scouting Network`,
  ].join('\n')

  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
