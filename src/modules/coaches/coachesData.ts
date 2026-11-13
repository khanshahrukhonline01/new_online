export type CredentialAuthority =
  | 'all'
  | 'sai-nis'
  | 'bcci'
  | 'aiff-afc'
  | 'bwf-bai'
  | 'world-athletics'
  | 'iba-boxing'
  | 'itf-aita'
  | 'asca-sfi'
  | 'wfi-akfi'

export interface VerifiedCoach {
  id: string
  slug: string
  name: string
  sport: string
  sportCategory: string
  avatarUrl?: string
  certification: string
  credentialAuthority: CredentialAuthority
  authorityLabel: string
  city: string
  state: string
  experienceYears: number
  academyAffiliation: string
  monthlyFee: string
  feeRangeCategory: 'under-3k' | '3k-7k' | 'premium' | 'subsidized' | 'unknown'
  studentTrackRecord: string
  specialties: string[]
  languages: string[]
  rating: number
  reviewCount: number
  verifiedBadge: string
  websiteUrl?: string
  publicContactUrl?: string
  bio: string
  availableForOneOnOne: boolean
  availableForBatches: boolean
}

export interface CoachInquiryData {
  id: string
  coachId: string
  coachName: string
  athleteName: string
  parentName?: string
  phone: string
  email?: string
  ageCategory: string
  skillLevel: string
  objective: string
  preferredBatch: string
  notes?: string
  submittedAt: string
  referenceId: string
}

export const STORAGE_COACH_INQUIRIES_KEY = 'khelgrid_coach_inquiries_v1'

export const COACH_CREDENTIALS: Array<{ id: CredentialAuthority; label: string }> = [
  { id: 'all', label: 'All Credentials' },
  { id: 'sai-nis', label: 'SAI / NIS Patiala Diploma' },
  { id: 'bcci', label: 'BCCI Level 1–3 (Cricket)' },
  { id: 'aiff-afc', label: 'AIFF / AFC Licences (Football)' },
  { id: 'bwf-bai', label: 'BWF / BAI Certified (Badminton)' },
  { id: 'world-athletics', label: 'World Athletics CECS (Track & Field)' },
  { id: 'iba-boxing', label: 'IBA 1-Star / 2-Star (Boxing)' },
  { id: 'itf-aita', label: 'ITF / AITA Certified (Tennis)' },
  { id: 'asca-sfi', label: 'ASCA / SFI (Swimming)' },
  { id: 'wfi-akfi', label: 'WFI / AKFI (Wrestling & Kabaddi)' },
]

export const COACH_SPORTS = [
  'All Sports',
  'Cricket',
  'Football',
  'Badminton',
  'Athletics',
  'Boxing',
  'Tennis',
  'Swimming',
  'Wrestling',
  'Kabaddi',
  'Table Tennis',
  'Basketball',
]

export const COACH_CITIES = [
  'All Cities',
  'Delhi NCR',
  'Bengaluru',
  'Mumbai',
  'Hyderabad',
  'Kolkata',
  'Chennai',
  'Pune',
  'Patiala',
  'Imphal',
  'Jaipur',
  'Srinagar',
]

export function saveCoachInquiry(inquiry: Omit<CoachInquiryData, 'id' | 'submittedAt' | 'referenceId'>): CoachInquiryData {
  const referenceId = `KG-COACH-${Math.floor(100000 + Math.random() * 900000)}`
  const record: CoachInquiryData = {
    ...inquiry,
    id: `inq-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    referenceId,
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_COACH_INQUIRIES_KEY)
      const existing: CoachInquiryData[] = raw ? JSON.parse(raw) : []
      existing.unshift(record)
      localStorage.setItem(STORAGE_COACH_INQUIRIES_KEY, JSON.stringify(existing.slice(0, 50)))
    } catch {
      // localStorage error fallback
    }
  }

  return record
}

export function getStoredCoachInquiries(): CoachInquiryData[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = localStorage.getItem(STORAGE_COACH_INQUIRIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
