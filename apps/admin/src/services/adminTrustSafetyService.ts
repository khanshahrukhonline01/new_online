/**
 * KhelGrid Admin Trust & Safety, Complaints & Sanctions Desk Service
 * 
 * Provides end-to-end incident triage, safety violation investigation,
 * sanction enforcement, and ban appeals governance for:
 * - Physical safety hazards & venue negligence (injuries, absent medical protocols)
 * - Minor abuse, bullying, and POSH (Prevention of Sexual Harassment) incidents
 * - Commercial fraud, fake combine extortion, and unverified fee collection
 * - Age eligibility fraud and forged athletic documentation
 * - Trademark infringement and brand impersonation (SAI/BCCI/ISL)
 * - Booking dispute resolution and escrow chargebacks
 * - Sanctions matrix (warnings, verified seal revocation, temporary lockout, permanent blacklist)
 * - Ban appeal hearings and appellate review workflows
 */

export type IncidentSeverity = 'critical_p0' | 'high_p1' | 'medium_p2' | 'low_p3'

export type IncidentCategory =
  | 'safety_hazard'
  | 'abuse_harassment'
  | 'financial_fraud'
  | 'age_eligibility_fraud'
  | 'impersonation_scam'
  | 'booking_dispute'
  | 'match_conduct'

export type IncidentStatus =
  | 'intake_pending'
  | 'under_investigation'
  | 'evidence_gathered'
  | 'sanction_issued'
  | 'case_closed'
  | 'appeal_pending'
  | 'appeal_resolved'

export type ReportedEntityType = 'coach' | 'academy' | 'venue' | 'organiser' | 'athlete' | 'tenant'

export type SanctionType =
  | 'formal_warning'
  | 'verified_seal_revocation'
  | 'public_safety_advisory'
  | 'temporary_suspension'
  | 'permanent_blacklist'
  | 'police_fir_referral'

export interface EvidenceAttachment {
  id: string
  fileName: string
  fileType: 'photo' | 'document' | 'video' | 'receipt' | 'police_fir'
  fileUrl: string
  fileSize: string
  uploadedAt: string
  uploadedBy: string
  description: string
  verifiedByOfficer: boolean
}

export interface InvestigationNote {
  id: string
  timestamp: string
  officerName: string
  officerEmail: string
  noteText: string
  actionTaken?: string
  isConfidential: boolean
}

export interface SanctionRecord {
  id: string
  type: SanctionType
  leviedBy: string
  leviedAt: string
  durationDays?: number
  expiresAt?: string
  reason: string
  publicAdvisoryText?: string
  verifiedBadgeRevoked: boolean
  isSuspended: boolean
  isActive: boolean
}

export interface BanAppealRecord {
  id: string
  appellantName: string
  appellantEmail: string
  submittedAt: string
  pleaNarrative: string
  evidenceUrl?: string
  status: 'pending' | 'upheld' | 'penalty_reduced' | 'exonerated'
  adjudicatedAt?: string
  adjudicatedBy?: string
  adjudicationNotes?: string
}

export interface TrustIncidentRecord {
  id: string
  incidentNumber: string
  title: string
  description: string
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  reportedEntityType: ReportedEntityType
  reportedEntityName: string
  reportedEntitySlug?: string
  reportedEntityId?: string
  city: string
  state: string
  venueOrLocation?: string
  reporterName: string
  reporterEmail: string
  reporterPhone?: string
  reporterRole: 'athlete' | 'parent' | 'coach' | 'venue_owner' | 'anonymous'
  assignedOfficer?: {
    name: string
    email: string
    assignedAt: string
  }
  createdAt: string
  updatedAt: string
  evidence: EvidenceAttachment[]
  investigationNotes: InvestigationNote[]
  sanctions: SanctionRecord[]
  appeals: BanAppealRecord[]
}

export interface TrustSafetyFilterOptions {
  search?: string
  status?: IncidentStatus | 'all'
  severity?: IncidentSeverity | 'all'
  category?: IncidentCategory | 'all'
  entityType?: ReportedEntityType | 'all'
}

export interface TrustSafetyMicroKpiMetrics {
  totalCases: number
  criticalP0Active: number
  underInvestigation: number
  activeSanctions: number
  appealsPending: number
  resolvedCases: number
  avgResolutionHours: number
  trustBadgesRevoked: number
}

// ---------------------------------------------------------------------------
// Standard Decision & Sanction Presets
// ---------------------------------------------------------------------------
export const SANCTION_DECISION_PRESETS = [
  {
    id: 'formal-warning-first-offence',
    title: 'Formal Warning - Minor Booking or Noise Violation',
    type: 'formal_warning' as SanctionType,
    durationDays: 0,
    revocation: false,
    reason: 'First-time operational dispute with no physical harm or malicious intent. Entity placed on 90-day monitoring probation.',
  },
  {
    id: 'seal-revocation-misrepresentation',
    title: 'Verified Seal Revocation - Credential Misrepresentation',
    type: 'verified_seal_revocation' as SanctionType,
    durationDays: 180,
    revocation: true,
    reason: 'Entity displayed expired federation credentials or unapproved logo affiliations. Verified Trust Seal revoked for 180 days.',
  },
  {
    id: 'temporary-30d-suspension-safety',
    title: '30-Day Platform Lockout - Severe Turf Infrastructure Hazard',
    type: 'temporary_suspension' as SanctionType,
    durationDays: 30,
    revocation: true,
    reason: 'Failure to repair exposed iron ground anchors resulting in athlete laceration. Venue suspended from public discovery and bookings until structural re-inspection.',
  },
  {
    id: 'temporary-90d-suspension-extortion',
    title: '90-Day Suspension - Unauthorized Selection Fee Extortion',
    type: 'temporary_suspension' as SanctionType,
    durationDays: 90,
    revocation: true,
    reason: 'Extorting non-refundable ₹3,500 combine fees under false promises of professional club contracts. Suspended and flagged on consumer registry.',
  },
  {
    id: 'permanent-blacklist-minor-abuse',
    title: 'Permanent Blacklist - Child Harm / POCSO / Criminal Fraud',
    type: 'permanent_blacklist' as SanctionType,
    durationDays: undefined,
    revocation: true,
    reason: 'Zero tolerance violation: substantiated minor physical abuse, child endangerment, or identity forgery. Permanently banned from KhelGrid and referred to cyber/police cell.',
  },
]

export const APPEAL_DECISION_PRESETS = [
  {
    id: 'appeal-exonerated',
    title: 'Exonerate & Restore Access - Unambiguous Exculpatory Evidence',
    status: 'exonerated' as const,
    notes: 'Appellant submitted verified municipal inspection certificate, architect structural clearance, and signed dispute settlement. All platform privileges restored.',
  },
  {
    id: 'appeal-penalty-reduced',
    title: 'Reduce Penalty - Partial Compliance & Corrective Action',
    status: 'penalty_reduced' as const,
    notes: 'Appellant fully rectified safety hazards and issued prompt customer refund. Suspension duration reduced from 90 days to 30 days with continued compliance monitoring.',
  },
  {
    id: 'appeal-upheld-rejected',
    title: 'Reject Appeal - Sanction Upheld in Full',
    status: 'upheld' as const,
    notes: 'Appellate review determined grounds of appeal lack credible corroboration. Original disciplinary sanction remains in full force.',
  },
]

// ---------------------------------------------------------------------------
// Authentic Seed Incident Cases
// ---------------------------------------------------------------------------
const SEED_INCIDENTS: TrustIncidentRecord[] = [
  {
    id: 'inc-ts-001',
    incidentNumber: 'TS-2026-081',
    title: 'Exposed Steel Pegs on AstroTurf Pitch Resulting in Knee Laceration',
    description:
      'During an evening 7-a-side match at PlayArena Turf Andheri, an athlete slid along the sideline and suffered a 7cm deep laceration on an exposed unbolted iron anchor peg used for corner netting. The venue lacked on-site first aid or ice compression, and the supervisor refused to log the incident.',
    category: 'safety_hazard',
    severity: 'critical_p0',
    status: 'sanction_issued',
    reportedEntityType: 'venue',
    reportedEntityName: 'PlayArena Sports Turf Mumbai',
    reportedEntitySlug: 'playarena-sports-turf-andheri',
    city: 'Mumbai',
    state: 'Maharashtra',
    venueOrLocation: 'Veera Desai Road, Andheri West, Mumbai',
    reporterName: 'Aditya Sharma',
    reporterEmail: 'aditya.sharma.football@gmail.com',
    reporterPhone: '+91 98201 44510',
    reporterRole: 'athlete',
    assignedOfficer: {
      name: 'Rohan Deshmukh',
      email: 'rohan.d@khelgrid.com',
      assignedAt: '2026-11-10T09:30:00Z',
    },
    createdAt: '2026-11-09T22:15:00Z',
    updatedAt: '2026-11-14T15:20:00Z',
    evidence: [
      {
        id: 'ev-01',
        fileName: 'hospital_discharge_crit_andheri.pdf',
        fileType: 'document',
        fileUrl: '/evidence/ts-2026-081-medical.pdf',
        fileSize: '1.8 MB',
        uploadedAt: '2026-11-09T22:20:00Z',
        uploadedBy: 'Aditya Sharma',
        description: 'Kokilaben Hospital Emergency Casualty discharge summary and suture record.',
        verifiedByOfficer: true,
      },
      {
        id: 'ev-02',
        fileName: 'exposed_iron_peg_corner.jpg',
        fileType: 'photo',
        fileUrl: '/evidence/ts-2026-081-peg.jpg',
        fileSize: '3.4 MB',
        uploadedAt: '2026-11-09T22:25:00Z',
        uploadedBy: 'Aditya Sharma',
        description: 'High-res photograph of rusty exposed steel ground anchor on pitch boundary.',
        verifiedByOfficer: true,
      },
    ],
    investigationNotes: [
      {
        id: 'note-01',
        timestamp: '2026-11-10T11:00:00Z',
        officerName: 'Rohan Deshmukh',
        officerEmail: 'rohan.d@khelgrid.com',
        noteText: 'Inspected photographic evidence and hospital sutures. Pitch perimeter fails KhelGrid safety minimum standard SG-104. Venue owner contacted.',
        actionTaken: 'Summoned venue management for immediate emergency safety audit.',
        isConfidential: false,
      },
      {
        id: 'note-02',
        timestamp: '2026-11-12T14:30:00Z',
        officerName: 'Rohan Deshmukh',
        officerEmail: 'rohan.d@khelgrid.com',
        noteText: 'Venue owner admitted contractor negligence in turf maintenance. Failed to provide certified first-aid responder logs.',
        actionTaken: 'Recommended 30-day suspension and Verified Seal revocation.',
        isConfidential: true,
      },
    ],
    sanctions: [
      {
        id: 'sanc-01',
        type: 'temporary_suspension',
        leviedBy: 'Rohan Deshmukh',
        leviedAt: '2026-11-14T15:20:00Z',
        durationDays: 30,
        expiresAt: '2026-12-14T15:20:00Z',
        reason: 'Severe ground hazard causing athlete injury and lack of emergency first-aid protocols.',
        publicAdvisoryText: 'Public Notice: This turf is temporarily suspended pending structural ground anchor repairs and certified first-aid equipment installation.',
        verifiedBadgeRevoked: true,
        isSuspended: true,
        isActive: true,
      },
    ],
    appeals: [],
  },
  {
    id: 'inc-ts-002',
    incidentNumber: 'TS-2026-082',
    title: 'Extortion of ₹5,000 Registration Fees for Fake ISL Reserve Scouting Combine',
    description:
      'Youth football players across Bangalore were contacted via Instagram and WhatsApp by Apex Sports Talent Hub promising direct trials with Mohun Bagan SG and Kerala Blasters scouts upon payment of a ₹5,000 registration fee via UPI. At the venue, no club scouts were present and the organizers vanished when questioned.',
    category: 'financial_fraud',
    severity: 'critical_p0',
    status: 'under_investigation',
    reportedEntityType: 'organiser',
    reportedEntityName: 'Apex Sports Talent Management',
    reportedEntitySlug: 'apex-sports-talent-combine',
    city: 'Bengaluru',
    state: 'Karnataka',
    venueOrLocation: 'FSV Arena Hennur Road, Bengaluru',
    reporterName: 'Karthik Narayanan (Parent)',
    reporterEmail: 'karthik.parent.blr@gmail.com',
    reporterPhone: '+91 99002 81140',
    reporterRole: 'parent',
    assignedOfficer: {
      name: 'Shreya Kulkarni',
      email: 'shreya.k@khelgrid.com',
      assignedAt: '2026-11-18T10:00:00Z',
    },
    createdAt: '2026-11-17T18:40:00Z',
    updatedAt: '2026-11-20T11:15:00Z',
    evidence: [
      {
        id: 'ev-03',
        fileName: 'whatsapp_payment_demands.pdf',
        fileType: 'receipt',
        fileUrl: '/evidence/ts-2026-082-upi.pdf',
        fileSize: '2.1 MB',
        uploadedAt: '2026-11-17T18:45:00Z',
        uploadedBy: 'Karthik Narayanan',
        description: 'UPI transaction receipts to individual personal handle and false scout promise chats.',
        verifiedByOfficer: true,
      },
      {
        id: 'ev-04',
        fileName: 'kerala_blasters_disclaimer.pdf',
        fileType: 'document',
        fileUrl: '/evidence/ts-2026-082-kb-letter.pdf',
        fileSize: '0.9 MB',
        uploadedAt: '2026-11-19T14:00:00Z',
        uploadedBy: 'Shreya Kulkarni',
        description: 'Official letter from Kerala Blasters Academy confirming no tie-up with Apex Sports.',
        verifiedByOfficer: true,
      },
    ],
    investigationNotes: [
      {
        id: 'note-03',
        timestamp: '2026-11-18T14:00:00Z',
        officerName: 'Shreya Kulkarni',
        officerEmail: 'shreya.k@khelgrid.com',
        noteText: 'Cross-checked with club scouting departments. Confirmed fraudulent impersonation. At least 28 families paid ₹5,000 each (₹1.4 Lakh total fraud).',
        actionTaken: 'Flagged organizer phone numbers across platform registration tables.',
        isConfidential: true,
      },
    ],
    sanctions: [],
    appeals: [],
  },
  {
    id: 'inc-ts-003',
    incidentNumber: 'TS-2026-083',
    title: 'Physical Intimidation and Abusive Language Directed at Junior Players',
    description:
      'Multiple parents reported junior coach for repeatedly using profane language, throwing equipment at 12-year-old trainees during cricket nets practice, and threatening physical retaliation if complaints were brought to the academy management.',
    category: 'abuse_harassment',
    severity: 'high_p1',
    status: 'appeal_pending',
    reportedEntityType: 'coach',
    reportedEntityName: 'Mahesh Gokhale (Head Junior Coach)',
    reportedEntitySlug: 'mahesh-gokhale-cricket',
    city: 'Pune',
    state: 'Maharashtra',
    venueOrLocation: 'Deccan Gymkhana Nets, Pune',
    reporterName: 'Sunita Joshi',
    reporterEmail: 'sunita.joshi.pune@yahoo.com',
    reporterRole: 'parent',
    assignedOfficer: {
      name: 'Rohan Deshmukh',
      email: 'rohan.d@khelgrid.com',
      assignedAt: '2026-10-25T11:00:00Z',
    },
    createdAt: '2026-10-24T16:30:00Z',
    updatedAt: '2026-11-21T09:45:00Z',
    evidence: [
      {
        id: 'ev-05',
        fileName: 'audio_recording_nets_verbal_abuse.m4a',
        fileType: 'video',
        fileUrl: '/evidence/ts-2026-083-audio.m4a',
        fileSize: '4.8 MB',
        uploadedAt: '2026-10-24T16:35:00Z',
        uploadedBy: 'Sunita Joshi',
        description: '2-minute audio recording of explicit abusive language during U-14 net session.',
        verifiedByOfficer: true,
      },
    ],
    investigationNotes: [
      {
        id: 'note-04',
        timestamp: '2026-10-26T10:00:00Z',
        officerName: 'Rohan Deshmukh',
        officerEmail: 'rohan.d@khelgrid.com',
        noteText: 'Review of audio confirmed severe profanity and intimidation directed at minors. Direct breach of KhelGrid Child Welfare & POSH Code.',
        isConfidential: false,
      },
    ],
    sanctions: [
      {
        id: 'sanc-02',
        type: 'temporary_suspension',
        leviedBy: 'Rohan Deshmukh',
        leviedAt: '2026-10-28T12:00:00Z',
        durationDays: 90,
        expiresAt: '2026-01-26T12:00:00Z',
        reason: 'Verbal abuse, intimidation of minors, and violation of youth coaching safety code.',
        publicAdvisoryText: 'Suspended from coaching listings pending completion of mandatory Child Safeguarding & Behavioral Rehabilitation certification.',
        verifiedBadgeRevoked: true,
        isSuspended: true,
        isActive: true,
      },
    ],
    appeals: [
      {
        id: 'app-01',
        appellantName: 'Mahesh Gokhale',
        appellantEmail: 'mahesh.gokhale.coach@gmail.com',
        submittedAt: '2026-11-20T14:30:00Z',
        pleaNarrative:
          'I offer my deepest unconditional apologies to the athletes and parents. I have completed the 40-hour Sports Authority of India Child Safeguarding Certificate course and have undertaken anger management therapy with a certified sports psychologist. I submit the completion certificates and request the remaining suspension period be converted to supervised probation.',
        evidenceUrl: '/evidence/ts-2026-083-sai-certificate.pdf',
        status: 'pending',
      },
    ],
  },
  {
    id: 'inc-ts-004',
    incidentNumber: 'TS-2026-084',
    title: 'Submission of Forged Aadhaar Municipal Certificates in U-16 Football League',
    description:
      'During registration for the Delhi State Youth Championship, scrutiny of Aadhaar QR codes revealed 4 players submitted forged birth certificates showing birth year 2010 instead of 2007. The academy owner allegedly orchestrated the alterations.',
    category: 'age_eligibility_fraud',
    severity: 'high_p1',
    status: 'evidence_gathered',
    reportedEntityType: 'academy',
    reportedEntityName: 'Capital United Football Academy',
    reportedEntitySlug: 'capital-united-football-academy-delhi',
    city: 'New Delhi',
    state: 'Delhi',
    venueOrLocation: 'Jawaharlal Nehru Stadium Complex, New Delhi',
    reporterName: 'Anand Verma (League Director)',
    reporterEmail: 'anand.verma@delhifa.org',
    reporterRole: 'venue_owner',
    assignedOfficer: {
      name: 'Shreya Kulkarni',
      email: 'shreya.k@khelgrid.com',
      assignedAt: '2026-11-15T12:00:00Z',
    },
    createdAt: '2026-11-14T11:20:00Z',
    updatedAt: '2026-11-22T17:00:00Z',
    evidence: [
      {
        id: 'ev-06',
        fileName: 'qr_verification_failure_report.pdf',
        fileType: 'document',
        fileUrl: '/evidence/ts-2026-084-uidai-failure.pdf',
        fileSize: '1.2 MB',
        uploadedAt: '2026-11-14T11:25:00Z',
        uploadedBy: 'Anand Verma',
        description: 'UIDAI offline cryptographic XML signature verification mismatch on 4 certificates.',
        verifiedByOfficer: true,
      },
    ],
    investigationNotes: [
      {
        id: 'note-05',
        timestamp: '2026-11-16T15:00:00Z',
        officerName: 'Shreya Kulkarni',
        officerEmail: 'shreya.k@khelgrid.com',
        noteText: 'Evidence conclusively proves age fabrication. Summoned academy owner to show cause within 48 hours.',
        isConfidential: false,
      },
    ],
    sanctions: [],
    appeals: [],
  },
  {
    id: 'inc-ts-005',
    incidentNumber: 'TS-2026-085',
    title: 'Refusal to Refund ₹18,000 Booking Advance for Cancelled Floodlit Tournament',
    description:
      'Corporate tournament was cancelled 14 days in advance in accordance with platform refund policy. Venue manager refused to process the refund and blocked customer communications.',
    category: 'booking_dispute',
    severity: 'medium_p2',
    status: 'case_closed',
    reportedEntityType: 'venue',
    reportedEntityName: 'SkyLine Arena Turfs Hyderabad',
    reportedEntitySlug: 'skyline-arena-madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    venueOrLocation: 'Madhapur Cyber Hills, Hyderabad',
    reporterName: 'Vikram Joshi (Corporate Lead)',
    reporterEmail: 'v.joshi@techcorp.in',
    reporterRole: 'athlete',
    assignedOfficer: {
      name: 'Rohan Deshmukh',
      email: 'rohan.d@khelgrid.com',
      assignedAt: '2026-11-01T10:00:00Z',
    },
    createdAt: '2026-10-31T19:00:00Z',
    updatedAt: '2026-11-06T14:10:00Z',
    evidence: [
      {
        id: 'ev-07',
        fileName: 'bank_transfer_escrow_receipt.pdf',
        fileType: 'receipt',
        fileUrl: '/evidence/ts-2026-085-receipt.pdf',
        fileSize: '0.8 MB',
        uploadedAt: '2026-10-31T19:05:00Z',
        uploadedBy: 'Vikram Joshi',
        description: 'Payment voucher and cancellation timestamp timestamped 14 days prior.',
        verifiedByOfficer: true,
      },
    ],
    investigationNotes: [
      {
        id: 'note-06',
        timestamp: '2026-11-03T11:00:00Z',
        officerName: 'Rohan Deshmukh',
        officerEmail: 'rohan.d@khelgrid.com',
        noteText: 'Contacted venue director. Clarified that failure to process verified cancellations triggers automatic gateway escrow deduction.',
        actionTaken: 'Facilitated full ₹18,000 refund to customer account.',
        isConfidential: false,
      },
    ],
    sanctions: [
      {
        id: 'sanc-03',
        type: 'formal_warning',
        leviedBy: 'Rohan Deshmukh',
        leviedAt: '2026-11-06T14:10:00Z',
        reason: 'Violation of standard cancellation SLA. Full refund completed; warning issued for internal records.',
        verifiedBadgeRevoked: false,
        isSuspended: false,
        isActive: false,
      },
    ],
    appeals: [],
  },
  {
    id: 'inc-ts-006',
    incidentNumber: 'TS-2026-086',
    title: 'Unauthorized Claim of Official Partnership with Cricket Association of Bengal',
    description:
      'Academy brochure, banner advertisements, and KhelGrid listing falsely advertised "Official Feeder Academy of CAB and Kolkata Knight Riders". Formal cease-and-desist received from state association.',
    category: 'impersonation_scam',
    severity: 'high_p1',
    status: 'sanction_issued',
    reportedEntityType: 'academy',
    reportedEntityName: 'Royal Bengal Cricket Academy Kolkata',
    reportedEntitySlug: 'royal-bengal-cricket-academy-salt-lake',
    city: 'Kolkata',
    state: 'West Bengal',
    venueOrLocation: 'Salt Lake Sector 5, Kolkata',
    reporterName: 'Debabrata Mukherjee (CAB Legal)',
    reporterEmail: 'legal@cricketassociationofbengal.com',
    reporterRole: 'venue_owner',
    assignedOfficer: {
      name: 'Shreya Kulkarni',
      email: 'shreya.k@khelgrid.com',
      assignedAt: '2026-11-05T09:00:00Z',
    },
    createdAt: '2026-11-04T17:10:00Z',
    updatedAt: '2026-11-12T16:40:00Z',
    evidence: [
      {
        id: 'ev-08',
        fileName: 'cab_cease_and_desist_official.pdf',
        fileType: 'document',
        fileUrl: '/evidence/ts-2026-086-cab-notice.pdf',
        fileSize: '1.4 MB',
        uploadedAt: '2026-11-04T17:15:00Z',
        uploadedBy: 'Debabrata Mukherjee',
        description: 'Official legal notice from CAB demanding cessation of trademark usage.',
        verifiedByOfficer: true,
      },
    ],
    investigationNotes: [
      {
        id: 'note-07',
        timestamp: '2026-11-06T12:00:00Z',
        officerName: 'Shreya Kulkarni',
        officerEmail: 'shreya.k@khelgrid.com',
        noteText: 'Confirmed academy has zero formal affiliation or licensing agreement with CAB. Misleading prospective parents.',
        isConfidential: false,
      },
    ],
    sanctions: [
      {
        id: 'sanc-04',
        type: 'verified_seal_revocation',
        leviedBy: 'Shreya Kulkarni',
        leviedAt: '2026-11-12T16:40:00Z',
        durationDays: 180,
        expiresAt: '2026-05-11T16:40:00Z',
        reason: 'Unauthorized use of state cricket association trademark and misleading branding.',
        publicAdvisoryText: 'Public Advisory: This academy has no official affiliation with the Cricket Association of Bengal or IPL franchises.',
        verifiedBadgeRevoked: true,
        isSuspended: false,
        isActive: true,
      },
    ],
    appeals: [],
  },
  {
    id: 'inc-ts-007',
    incidentNumber: 'TS-2026-087',
    title: 'Physical Brawl and Referee Assault During Weekend Open Football League',
    description:
      'During the semi-final match of the NCR Super Cup, players and coaching staff from visiting club assaulted the match referee following a red-card decision, causing concussion and broken dental crowns.',
    category: 'match_conduct',
    severity: 'critical_p0',
    status: 'intake_pending',
    reportedEntityType: 'organiser',
    reportedEntityName: 'NCR Super Cup Management',
    city: 'Gurugram',
    state: 'Haryana',
    venueOrLocation: 'Tau Devi Lal Stadium, Gurugram',
    reporterName: 'Manish Rawat (Match Commissioner)',
    reporterEmail: 'manish.rawat@haryanafa.com',
    reporterRole: 'venue_owner',
    createdAt: '2026-11-24T14:10:00Z',
    updatedAt: '2026-11-24T14:10:00Z',
    evidence: [
      {
        id: 'ev-09',
        fileName: 'referee_assault_match_report.pdf',
        fileType: 'police_fir',
        fileUrl: '/evidence/ts-2026-087-match-fir.pdf',
        fileSize: '2.5 MB',
        uploadedAt: '2026-11-24T14:15:00Z',
        uploadedBy: 'Manish Rawat',
        description: 'Match commissioner report and Sector 29 police station General Diary entry.',
        verifiedByOfficer: false,
      },
    ],
    investigationNotes: [],
    sanctions: [],
    appeals: [],
  },
]

// ---------------------------------------------------------------------------
// In-Memory Repository with Test Reset Capability
// ---------------------------------------------------------------------------
let trustSafetyStore: TrustIncidentRecord[] = JSON.parse(JSON.stringify(SEED_INCIDENTS))

export function resetAdminTrustSafetyForTesting(): void {
  trustSafetyStore = JSON.parse(JSON.stringify(SEED_INCIDENTS))
}

// ---------------------------------------------------------------------------
// Core Query & Mutation Methods
// ---------------------------------------------------------------------------

export async function getAdminTrustSafetyCases(
  filters: TrustSafetyFilterOptions = {},
): Promise<{
  cases: TrustIncidentRecord[]
  metrics: TrustSafetyMicroKpiMetrics
}> {
  let list = [...trustSafetyStore]

  if (filters.status && filters.status !== 'all') {
    list = list.filter(c => c.status === filters.status)
  }

  if (filters.severity && filters.severity !== 'all') {
    list = list.filter(c => c.severity === filters.severity)
  }

  if (filters.category && filters.category !== 'all') {
    list = list.filter(c => c.category === filters.category)
  }

  if (filters.entityType && filters.entityType !== 'all') {
    list = list.filter(c => c.reportedEntityType === filters.entityType)
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim()
    list = list.filter(
      c =>
        c.incidentNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.reportedEntityName.toLowerCase().includes(q) ||
        c.reporterName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.assignedOfficer && c.assignedOfficer.name.toLowerCase().includes(q)),
    )
  }

  const all = trustSafetyStore
  const metrics: TrustSafetyMicroKpiMetrics = {
    totalCases: all.length,
    criticalP0Active: all.filter(
      c => c.severity === 'critical_p0' && c.status !== 'case_closed',
    ).length,
    underInvestigation: all.filter(
      c => c.status === 'under_investigation' || c.status === 'evidence_gathered',
    ).length,
    activeSanctions: all.filter(c => c.sanctions.some(s => s.isActive)).length,
    appealsPending: all.filter(c => c.appeals.some(a => a.status === 'pending')).length,
    resolvedCases: all.filter(c => c.status === 'case_closed').length,
    avgResolutionHours: 36.5,
    trustBadgesRevoked: all.filter(c => c.sanctions.some(s => s.verifiedBadgeRevoked)).length,
  }

  return { cases: list, metrics }
}

export async function getAdminTrustSafetyCaseDetails(
  id: string,
): Promise<TrustIncidentRecord | null> {
  const item = trustSafetyStore.find(c => c.id === id)
  if (!item) return null
  return JSON.parse(JSON.stringify(item))
}

export async function startCaseInvestigation(
  id: string,
  officer: { name: string; email: string },
): Promise<TrustIncidentRecord> {
  const item = trustSafetyStore.find(c => c.id === id)
  if (!item) throw new Error(`Incident case not found: ${id}`)

  item.status = 'under_investigation'
  item.updatedAt = new Date().toISOString()
  item.assignedOfficer = {
    name: officer.name,
    email: officer.email,
    assignedAt: new Date().toISOString(),
  }

  item.investigationNotes.unshift({
    id: `note-${Date.now()}`,
    timestamp: new Date().toISOString(),
    officerName: officer.name,
    officerEmail: officer.email,
    noteText: 'Claimed incident case for active investigation. Subpoenaing evidence and notifying respondent.',
    actionTaken: 'Assigned Senior T&S Investigator.',
    isConfidential: false,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function levySanctionOnEntity(
  id: string,
  params: {
    officer: { name: string; email: string }
    sanctionType: SanctionType
    durationDays?: number
    reason: string
    publicAdvisoryText?: string
    revokeVerifiedBadge: boolean
    suspendAccess: boolean
  },
): Promise<TrustIncidentRecord> {
  const item = trustSafetyStore.find(c => c.id === id)
  if (!item) throw new Error(`Incident case not found: ${id}`)

  const now = new Date()
  const expiresAt = params.durationDays
    ? new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined

  const newSanction: SanctionRecord = {
    id: `sanc-${Date.now()}`,
    type: params.sanctionType,
    leviedBy: params.officer.name,
    leviedAt: now.toISOString(),
    durationDays: params.durationDays,
    expiresAt,
    reason: params.reason,
    publicAdvisoryText: params.publicAdvisoryText,
    verifiedBadgeRevoked: params.revokeVerifiedBadge,
    isSuspended: params.suspendAccess,
    isActive: true,
  }

  item.status = 'sanction_issued'
  item.updatedAt = now.toISOString()
  item.sanctions.unshift(newSanction)

  item.investigationNotes.unshift({
    id: `note-${Date.now()}`,
    timestamp: now.toISOString(),
    officerName: params.officer.name,
    officerEmail: params.officer.email,
    noteText: `Formal sanction levied: ${params.sanctionType.replace(/_/g, ' ').toUpperCase()}. Reason: ${params.reason}`,
    actionTaken: `Levied ${params.sanctionType}. RevokeBadge=${params.revokeVerifiedBadge}, Suspend=${params.suspendAccess}.`,
    isConfidential: false,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function submitBanAppeal(
  id: string,
  params: {
    appellantName: string
    appellantEmail: string
    pleaNarrative: string
    evidenceUrl?: string
  },
): Promise<TrustIncidentRecord> {
  const item = trustSafetyStore.find(c => c.id === id)
  if (!item) throw new Error(`Incident case not found: ${id}`)

  const appeal: BanAppealRecord = {
    id: `app-${Date.now()}`,
    appellantName: params.appellantName,
    appellantEmail: params.appellantEmail,
    submittedAt: new Date().toISOString(),
    pleaNarrative: params.pleaNarrative,
    evidenceUrl: params.evidenceUrl,
    status: 'pending',
  }

  item.status = 'appeal_pending'
  item.updatedAt = new Date().toISOString()
  item.appeals.unshift(appeal)

  item.investigationNotes.unshift({
    id: `note-${Date.now()}`,
    timestamp: new Date().toISOString(),
    officerName: 'Appellate Registry',
    officerEmail: 'appeals@khelgrid.com',
    noteText: `Formal appeal lodged by ${params.appellantName}. Case queued for appellate review.`,
    isConfidential: false,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function adjudicateBanAppeal(
  caseId: string,
  appealId: string,
  params: {
    officer: { name: string; email: string }
    decision: 'upheld' | 'penalty_reduced' | 'exonerated'
    notes: string
  },
): Promise<TrustIncidentRecord> {
  const item = trustSafetyStore.find(c => c.id === caseId)
  if (!item) throw new Error(`Incident case not found: ${caseId}`)

  const appeal = item.appeals.find(a => a.id === appealId)
  if (!appeal) throw new Error(`Appeal not found: ${appealId}`)

  appeal.status = params.decision
  appeal.adjudicatedAt = new Date().toISOString()
  appeal.adjudicatedBy = params.officer.name
  appeal.adjudicationNotes = params.notes

  item.status = params.decision === 'exonerated' ? 'case_closed' : 'appeal_resolved'
  item.updatedAt = new Date().toISOString()

  // If exonerated, deactivate sanctions
  if (params.decision === 'exonerated') {
    item.sanctions.forEach(s => {
      s.isActive = false
    })
  }

  item.investigationNotes.unshift({
    id: `note-${Date.now()}`,
    timestamp: new Date().toISOString(),
    officerName: params.officer.name,
    officerEmail: params.officer.email,
    noteText: `Appellate decision rendered: ${params.decision.toUpperCase()}. Notes: ${params.notes}`,
    actionTaken: `Appellate adjudication: ${params.decision}.`,
    isConfidential: false,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function closeTrustSafetyCase(
  id: string,
  params: {
    officer: { name: string; email: string }
    resolutionNotes: string
  },
): Promise<TrustIncidentRecord> {
  const item = trustSafetyStore.find(c => c.id === id)
  if (!item) throw new Error(`Incident case not found: ${id}`)

  item.status = 'case_closed'
  item.updatedAt = new Date().toISOString()

  item.investigationNotes.unshift({
    id: `note-${Date.now()}`,
    timestamp: new Date().toISOString(),
    officerName: params.officer.name,
    officerEmail: params.officer.email,
    noteText: `Case closed and archived. Resolution: ${params.resolutionNotes}`,
    actionTaken: 'Case closed.',
    isConfidential: false,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function addInvestigationNote(
  id: string,
  officer: { name: string; email: string },
  noteText: string,
  isConfidential = false,
): Promise<TrustIncidentRecord> {
  const item = trustSafetyStore.find(c => c.id === id)
  if (!item) throw new Error(`Incident case not found: ${id}`)

  item.updatedAt = new Date().toISOString()
  item.investigationNotes.unshift({
    id: `note-${Date.now()}`,
    timestamp: new Date().toISOString(),
    officerName: officer.name,
    officerEmail: officer.email,
    noteText,
    isConfidential,
  })

  return JSON.parse(JSON.stringify(item))
}

// ---------------------------------------------------------------------------
// RFC 4180 CSV Export
// ---------------------------------------------------------------------------
export function exportTrustSafetyLedgerToCsv(cases: TrustIncidentRecord[]): string {
  const headers = [
    'Incident Number',
    'Severity',
    'Status',
    'Category',
    'Title',
    'Reported Entity Name',
    'Entity Type',
    'City',
    'State',
    'Reporter Name',
    'Reporter Role',
    'Assigned Officer',
    'Active Sanctions Count',
    'Appeals Count',
    'Created Date',
  ]

  const rows = cases.map(c => [
    c.incidentNumber,
    c.severity,
    c.status,
    c.category,
    `"${c.title.replace(/"/g, '""')}"`,
    `"${c.reportedEntityName.replace(/"/g, '""')}"`,
    c.reportedEntityType,
    `"${c.city.replace(/"/g, '""')}"`,
    `"${c.state.replace(/"/g, '""')}"`,
    `"${c.reporterName.replace(/"/g, '""')}"`,
    c.reporterRole,
    `"${(c.assignedOfficer?.name || 'Unassigned').replace(/"/g, '""')}"`,
    c.sanctions.filter(s => s.isActive).length,
    c.appeals.length,
    c.createdAt,
  ])

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
}
