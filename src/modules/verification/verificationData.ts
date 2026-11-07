export type VerificationStatusType = 'verified' | 'in_review' | 'action_required' | 'submitted'

export interface VerificationRecord {
  referenceId: string
  athleteName: string
  sport: string
  federationAuthority: string
  federationId: string
  competitionLevel: string
  certificateNo: string
  city: string
  status: VerificationStatusType
  statusTitle: string
  statusDescription: string
  badgeTier?: 'Tier-1 Gold Badge' | 'Tier-2 Verified Badge'
  submittedAt: string
  reviewedAt?: string
  verificationNotes: string[]
}

export const PRESEEDED_VERIFICATION_RECORDS: Record<string, VerificationRecord> = {
  'KG-VERIF-78291': {
    referenceId: 'KG-VERIF-78291',
    athleteName: 'Rohan Sharma',
    sport: 'Athletics (100m / 200m)',
    federationAuthority: 'AFI (Athletics Federation of India)',
    federationId: 'AFI-DL-2024-9182',
    competitionLevel: 'National Junior Athletics Championships',
    certificateNo: 'AFI/NJAC/2026/G-104',
    city: 'Delhi NCR',
    status: 'verified',
    statusTitle: 'Verified · Tier-1 Gold Badge Issued',
    statusDescription: 'All identity documents, AFI registry credentials, and National Junior Championship certificates have been authenticated by the KhelGrid Verification Desk.',
    badgeTier: 'Tier-1 Gold Badge',
    submittedAt: '2026-10-15T10:30:00Z',
    reviewedAt: '2026-10-18T14:15:00Z',
    verificationNotes: [
      'Aadhaar age authenticity matched with Municipal Birth Certificate',
      'AFI digital UID confirmed in national athlete database',
      'Podium finish cross-referenced against AFI official meet result circular',
      'Eligible for direct NIS Patiala & SAI Scouting Combine nominations',
    ],
  },
  'KG-VERIF-64103': {
    referenceId: 'KG-VERIF-64103',
    athleteName: 'Ananya Deshmukh',
    sport: 'Badminton (Girls U-17 Singles)',
    federationAuthority: 'BAI (Badminton Association of India)',
    federationId: 'BAI-MH-2025-44910',
    competitionLevel: 'State Junior Badminton Championships',
    certificateNo: 'MBA/SJBC/2026/F-88',
    city: 'Pune',
    status: 'in_review',
    statusTitle: 'In Review · Document Authenticated, Awaiting Federation Match',
    statusDescription: 'Identity proof authenticated. Awaiting batch verification match from Maharashtra Badminton Association state registrar.',
    submittedAt: '2026-11-02T16:45:00Z',
    verificationNotes: [
      'Aadhaar document verified (DPDP compliant masked storage)',
      'BAI ID received; queued in weekly state affiliate sync',
      'Expected turnaround: 48-72 business hours',
    ],
  },
  'KG-VERIF-51928': {
    referenceId: 'KG-VERIF-51928',
    athleteName: 'Manpreet Singh',
    sport: 'Football (Forward / Striker)',
    federationAuthority: 'AIFF (All India Football Federation)',
    federationId: 'AIFF-CRS-2025-7719',
    competitionLevel: 'SGFI National School Football Games',
    certificateNo: 'SGFI/NSG/2025/B-201',
    city: 'Jalandhar',
    status: 'action_required',
    statusTitle: 'Action Required · Date of Birth Discrepancy',
    statusDescription: 'Discrepancy detected between Aadhaar Year of Birth and School Transfer Certificate. Please submit clarifying affidavit signed by School Principal.',
    submittedAt: '2026-10-28T11:20:00Z',
    verificationNotes: [
      'AIFF CRS profile active',
      'Action required: Submit revised Bonafide School Certificate or TW3 bone test scan',
      'Uploaded documents will be reviewed within 24 hours of re-submission',
    ],
  },
}

export const STORAGE_VERIFICATION_KEY = 'khelgrid_verification_requests_v1'

export interface VerificationSubmission {
  athleteName: string
  dob: string
  gender: string
  city: string
  state: string
  phone: string
  email: string
  documentType: 'Aadhaar Card' | 'Indian Passport' | 'Municipal Birth Certificate'
  maskedDocNumber: string
  sport: string
  federationAuthority: string
  federationId: string
  academyOrClub: string
  competitionLevel: string
  certificateNo: string
  yearOfAchievement: string
  resultPosition: string
}

const memorySubmissions: Record<string, VerificationRecord> = {}

export function submitVerificationRequest(sub: VerificationSubmission): VerificationRecord {
  const referenceId = `KG-VERIF-${Math.floor(10000 + Math.random() * 90000)}`

  const record: VerificationRecord = {
    referenceId,
    athleteName: sub.athleteName,
    sport: sub.sport,
    federationAuthority: sub.federationAuthority,
    federationId: sub.federationId,
    competitionLevel: sub.competitionLevel,
    certificateNo: sub.certificateNo,
    city: sub.city,
    status: 'submitted',
    statusTitle: 'Submitted · Document Processing Queued',
    statusDescription: 'Your verification dossier has been securely recorded. Our compliance desk cross-references credentials with official state associations.',
    submittedAt: new Date().toISOString(),
    verificationNotes: [
      `Application lodged under reference ${referenceId}`,
      `Identity proof (${sub.documentType}) accepted under DPDP Act 2023 guidelines`,
      `Federation authority (${sub.federationAuthority}) notification scheduled`,
      'Estimated review turnaround: 2-4 business days',
    ],
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_VERIFICATION_KEY)
      const map: Record<string, VerificationRecord> = stored ? JSON.parse(stored) : {}
      map[referenceId] = record
      window.localStorage.setItem(STORAGE_VERIFICATION_KEY, JSON.stringify(map))
    } catch {
      // ignore
    }
  }

  memorySubmissions[referenceId] = record
  return record
}

export function lookupVerificationStatus(refId: string): VerificationRecord | null {
  const cleanId = refId.trim().toUpperCase()

  // 1. Check pre-seeded
  if (PRESEEDED_VERIFICATION_RECORDS[cleanId]) {
    return PRESEEDED_VERIFICATION_RECORDS[cleanId]
  }

  // 2. Check localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_VERIFICATION_KEY)
      if (stored) {
        const map: Record<string, VerificationRecord> = JSON.parse(stored)
        if (map[cleanId]) return map[cleanId]
      }
    } catch {
      // ignore
    }
  }

  // 3. Check memory
  if (memorySubmissions[cleanId]) {
    return memorySubmissions[cleanId]
  }

  return null
}
