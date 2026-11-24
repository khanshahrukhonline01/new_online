/**
 * KhelGrid Admin Verification Centre & Evidence Vault Service
 * 
 * Provides evidence-based credential authentication, federation registry
 * cross-matching, automated expiry tracking, and audit governance for:
 * - Coaches (NIS Patiala, SAI badges, AFC/AIFF licenses, POSH/police clearance)
 * - Academies (Societies/Sec-8 registration, GSTIN, State affiliation, Fire NOC)
 * - Venues (Municipal trade license, Fire NOC, FIFA/FIH turf certification)
 * - Organisers (Federation sanction letters, medical standby indemnity)
 * - Athletes (Federation UID, age/municipal records, merit certificates)
 */

export type VerificationEntityType = 'coach' | 'academy' | 'venue' | 'organiser' | 'athlete'

export type VerificationStatus =
  | 'pending_review'
  | 'in_review'
  | 'action_required'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'revoked'

export type VerificationBadgeTier =
  | 'tier_1_platinum'
  | 'tier_2_gold'
  | 'verified_standard'

export type DocumentCategory =
  | 'federation_license'
  | 'government_registration'
  | 'nis_diploma'
  | 'coaching_badge'
  | 'safety_fire_noc'
  | 'identity_age_proof'
  | 'event_sanction'
  | 'merit_certificate'

export type VerificationMethod =
  | 'digital_registry_api'
  | 'qr_code_cryptographic'
  | 'manual_gazette_cross_match'
  | 'affidavit_physical'

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'permanent'

export interface EvidenceDocument {
  id: string
  title: string
  category: DocumentCategory
  issuerAuthority: string
  documentNumber: string
  maskedIdentifier?: string
  fileUrl: string
  fileSize: string
  fileMimeType: string
  uploadedAt: string
  issuedAt: string
  expiresAt?: string
  isVerifiedByAuthority: boolean
  verificationMethod: VerificationMethod
  metadata?: Record<string, string | number | boolean>
}

export interface VerificationAuditEntry {
  id: string
  timestamp: string
  actorEmail: string
  action:
    | 'submitted'
    | 'assigned_reviewer'
    | 'clarification_requested'
    | 'verified_approved'
    | 'rejected'
    | 'revoked'
    | 'expiry_extended'
    | 'note_added'
  summary: string
  previousStatus?: VerificationStatus
  newStatus?: VerificationStatus
  notes?: string
}

export interface AdminVerificationItem {
  id: string
  referenceCode: string
  entityType: VerificationEntityType
  entityName: string
  organizationName?: string
  contactEmail: string
  contactPhone: string
  city: string
  state: string
  sport: string
  status: VerificationStatus
  badgeTier?: VerificationBadgeTier
  documents: EvidenceDocument[]
  submittedAt: string
  lastAuditedAt: string
  assignedReviewer?: string
  verifiedAt?: string
  expiresAt?: string
  rejectionReason?: string
  actionRequiredNotes?: string
  auditTrail: VerificationAuditEntry[]
}

export interface ExpiryCalculationResult {
  status: ExpiryStatus
  daysRemaining: number | null
  formattedLabel: string
}

/**
 * Calculates time-bound expiry status based on target date
 */
export function calculateExpiryStatus(expiresAt?: string): ExpiryCalculationResult {
  if (!expiresAt) {
    return {
      status: 'permanent',
      daysRemaining: null,
      formattedLabel: 'Permanent / Non-expiring',
    }
  }

  const now = new Date()
  const expDate = new Date(expiresAt)
  const diffMs = expDate.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysRemaining <= 0) {
    return {
      status: 'expired',
      daysRemaining,
      formattedLabel: `Expired (${Math.abs(daysRemaining)}d ago)`,
    }
  }

  if (daysRemaining <= 60) {
    return {
      status: 'expiring_soon',
      daysRemaining,
      formattedLabel: `Expiring in ${daysRemaining} days`,
    }
  }

  return {
    status: 'valid',
    daysRemaining,
    formattedLabel: `Valid (${daysRemaining} days left)`,
  }
}

export const STORAGE_VERIFICATION_KEY = 'khelgrid_admin_verification_vault_v1'

export const SEED_ADMIN_VERIFICATIONS: AdminVerificationItem[] = [
  {
    id: 'kg-verif-001',
    referenceCode: 'KG-COACH-7721',
    entityType: 'coach',
    entityName: 'Coach Rajesh Kumar',
    organizationName: 'NCR Elite Football Residency',
    contactEmail: 'rajesh.kumar@ncrelite.com',
    contactPhone: '+91 98110 44219',
    city: 'New Delhi',
    state: 'Delhi NCR',
    sport: 'Football',
    status: 'verified',
    badgeTier: 'tier_1_platinum',
    submittedAt: '2026-09-10T10:30:00Z',
    lastAuditedAt: '2026-11-20T14:15:00Z',
    assignedReviewer: 'lead.verifier@khelgrid.com',
    verifiedAt: '2026-09-15T16:00:00Z',
    expiresAt: '2027-01-15T23:59:59Z', // ~52 days remaining => expiring_soon
    documents: [
      {
        id: 'doc-001-aiff',
        title: "AIFF / AFC 'A' Diploma Coaching License",
        category: 'coaching_badge',
        issuerAuthority: 'All India Football Federation (AIFF) & AFC',
        documentNumber: 'AIFF-AFC-A-2024-9104',
        fileUrl: '/evidence/aiff_a_license_rajesh.pdf',
        fileSize: '3.4 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-09-10T10:32:00Z',
        issuedAt: '2024-01-15T00:00:00Z',
        expiresAt: '2027-01-15T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
        metadata: {
          licenseLevel: 'AFC A Diploma',
          registryVerifiedId: 'AIFF-COACH-7741',
        },
      },
      {
        id: 'doc-001-nis',
        title: 'NIS Patiala Diploma in Sports Coaching (Football)',
        category: 'nis_diploma',
        issuerAuthority: 'Netaji Subhas National Institute of Sports (SAI)',
        documentNumber: 'SAI-NIS-DIP-2018-FB-412',
        fileUrl: '/evidence/sai_nis_rajesh.pdf',
        fileSize: '4.8 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-09-10T10:34:00Z',
        issuedAt: '2018-06-30T00:00:00Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
      {
        id: 'doc-001-posh',
        title: 'Child Safeguarding & POSH Compliance Certificate',
        category: 'safety_fire_noc',
        issuerAuthority: 'Safeguarding in Indian Sports Initiative',
        documentNumber: 'POSH-SAFE-2025-098',
        fileUrl: '/evidence/posh_rajesh.pdf',
        fileSize: '1.2 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-09-10T10:35:00Z',
        issuedAt: '2025-05-10T00:00:00Z',
        expiresAt: '2027-05-10T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
    ],
    auditTrail: [
      {
        id: 'aud-001-1',
        timestamp: '2026-09-10T10:35:00Z',
        actorEmail: 'rajesh.kumar@ncrelite.com',
        action: 'submitted',
        summary: 'Coach qualification verification packet submitted with 3 credentials.',
        newStatus: 'pending_review',
      },
      {
        id: 'aud-001-2',
        timestamp: '2026-09-12T11:20:00Z',
        actorEmail: 'lead.verifier@khelgrid.com',
        action: 'assigned_reviewer',
        summary: 'Assigned to Lead Verifier for AFC license API cross-check.',
        newStatus: 'in_review',
      },
      {
        id: 'aud-001-3',
        timestamp: '2026-09-15T16:00:00Z',
        actorEmail: 'lead.verifier@khelgrid.com',
        action: 'verified_approved',
        summary: 'AIFF Central Coach Registry match confirmed. Tier-1 Platinum Trust Seal awarded.',
        previousStatus: 'in_review',
        newStatus: 'verified',
        notes: 'License active; upcoming triennial renewal notice scheduled for Dec 2026.',
      },
    ],
  },
  {
    id: 'kg-verif-002',
    referenceCode: 'KG-ACAD-8832',
    entityType: 'academy',
    entityName: 'Bengaluru Grassroots Badminton Academy',
    organizationName: 'Bengaluru Grassroots Sports Trust',
    contactEmail: 'admissions@bgba.in',
    contactPhone: '+91 80 4912 3000',
    city: 'Bengaluru',
    state: 'Karnataka',
    sport: 'Badminton',
    status: 'pending_review',
    submittedAt: '2026-11-21T09:15:00Z',
    lastAuditedAt: '2026-11-21T09:15:00Z',
    documents: [
      {
        id: 'doc-002-soc',
        title: 'Karnataka Societies Registration Act Certificate',
        category: 'government_registration',
        issuerAuthority: 'Registrar of Societies, Govt of Karnataka',
        documentNumber: 'DRB-3/SOR/114/2021-22',
        fileUrl: '/evidence/karnataka_society_bgba.pdf',
        fileSize: '2.1 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-11-21T09:16:00Z',
        issuedAt: '2021-08-14T00:00:00Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'manual_gazette_cross_match',
      },
      {
        id: 'doc-002-bai',
        title: 'BAI Affiliation Certificate (Karnataka Badminton Association)',
        category: 'federation_license',
        issuerAuthority: 'Karnataka Badminton Association (KBA / BAI)',
        documentNumber: 'KBA/AFFIL/2026/ACAD-44',
        fileUrl: '/evidence/kba_affiliation.pdf',
        fileSize: '1.9 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-11-21T09:18:00Z',
        issuedAt: '2026-04-01T00:00:00Z',
        expiresAt: '2027-03-31T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
      },
      {
        id: 'doc-002-fire',
        title: 'Karnataka State Fire & Emergency Services NOC',
        category: 'safety_fire_noc',
        issuerAuthority: 'Karnataka State Fire & Emergency Services',
        documentNumber: 'FES/NOC/BLR-EAST/2026/891',
        fileUrl: '/evidence/fire_noc_bgba.pdf',
        fileSize: '3.1 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-11-21T09:20:00Z',
        issuedAt: '2026-02-10T00:00:00Z',
        expiresAt: '2027-02-09T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
    ],
    auditTrail: [
      {
        id: 'aud-002-1',
        timestamp: '2026-11-21T09:20:00Z',
        actorEmail: 'admissions@bgba.in',
        action: 'submitted',
        summary: 'Academy registration packet submitted with KBA affiliation & Fire NOC.',
        newStatus: 'pending_review',
      },
    ],
  },
  {
    id: 'kg-verif-003',
    referenceCode: 'KG-VENUE-9104',
    entityType: 'venue',
    entityName: 'Decathlon Arena Whitefield',
    organizationName: 'Decathlon Sports India Pvt Ltd',
    contactEmail: 'facilities.whitefield@decathlon.in',
    contactPhone: '+91 80 6711 9000',
    city: 'Bengaluru',
    state: 'Karnataka',
    sport: 'Multi-Sport (Football / Box Cricket / Tennis)',
    status: 'verified',
    badgeTier: 'tier_1_platinum',
    submittedAt: '2026-08-01T14:00:00Z',
    lastAuditedAt: '2026-11-10T12:00:00Z',
    assignedReviewer: 'lead.verifier@khelgrid.com',
    verifiedAt: '2026-08-05T15:30:00Z',
    expiresAt: '2027-08-05T23:59:59Z',
    documents: [
      {
        id: 'doc-003-trade',
        title: 'BBMP Commercial Trade License for Sports Facility',
        category: 'government_registration',
        issuerAuthority: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
        documentNumber: 'BBMP/TL/MAH/2026-27/00491',
        fileUrl: '/evidence/bbmp_trade_license.pdf',
        fileSize: '2.5 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-08-01T14:10:00Z',
        issuedAt: '2026-04-01T00:00:00Z',
        expiresAt: '2027-03-31T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
      },
      {
        id: 'doc-003-fifa',
        title: 'FIFA Quality Programme Laboratory Turf Test Certificate',
        category: 'safety_fire_noc',
        issuerAuthority: 'FIFA Quality Programme / Labosport UK',
        documentNumber: 'FIFA-QUAL-TURF-2025-IND-88',
        fileUrl: '/evidence/fifa_turf_cert.pdf',
        fileSize: '5.2 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-08-01T14:15:00Z',
        issuedAt: '2025-06-20T00:00:00Z',
        expiresAt: '2028-06-19T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
    ],
    auditTrail: [
      {
        id: 'aud-003-1',
        timestamp: '2026-08-01T14:20:00Z',
        actorEmail: 'facilities.whitefield@decathlon.in',
        action: 'submitted',
        summary: 'Commercial venue verification packet uploaded.',
        newStatus: 'pending_review',
      },
      {
        id: 'aud-003-2',
        timestamp: '2026-08-05T15:30:00Z',
        actorEmail: 'lead.verifier@khelgrid.com',
        action: 'verified_approved',
        summary: 'BBMP Trade License and FIFA Quality turf test authenticated.',
        previousStatus: 'pending_review',
        newStatus: 'verified',
      },
    ],
  },
  {
    id: 'kg-verif-004',
    referenceCode: 'KG-ORG-6619',
    entityType: 'organiser',
    entityName: 'Subroto Mukerjee Sports Education Society',
    organizationName: 'Subroto Cup Organising Committee (IAF)',
    contactEmail: 'admin@subrotocup.in',
    contactPhone: '+91 11 2568 7100',
    city: 'New Delhi',
    state: 'Delhi NCR',
    sport: 'Football',
    status: 'verified',
    badgeTier: 'tier_1_platinum',
    submittedAt: '2026-07-15T11:00:00Z',
    lastAuditedAt: '2026-10-18T16:00:00Z',
    assignedReviewer: 'lead.verifier@khelgrid.com',
    verifiedAt: '2026-07-20T10:00:00Z',
    expiresAt: '2027-07-20T23:59:59Z',
    documents: [
      {
        id: 'doc-004-aiff',
        title: 'AIFF Official National Tournament Sanction Letter',
        category: 'event_sanction',
        issuerAuthority: 'All India Football Federation (AIFF)',
        documentNumber: 'AIFF/COMP/SANCT/2026/SC-63',
        fileUrl: '/evidence/subroto_aiff_sanction.pdf',
        fileSize: '2.8 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-07-15T11:05:00Z',
        issuedAt: '2026-06-01T00:00:00Z',
        expiresAt: '2027-05-31T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
      },
      {
        id: 'doc-004-myas',
        title: 'Ministry of Youth Affairs & Sports (MYAS) Recognition Order',
        category: 'government_registration',
        issuerAuthority: 'Ministry of Youth Affairs and Sports, GoI',
        documentNumber: 'MYAS/SPORTS/NAT-TOUR/2026-09',
        fileUrl: '/evidence/myas_recognition.pdf',
        fileSize: '1.7 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-07-15T11:10:00Z',
        issuedAt: '2026-05-15T00:00:00Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'manual_gazette_cross_match',
      },
    ],
    auditTrail: [
      {
        id: 'aud-004-1',
        timestamp: '2026-07-20T10:00:00Z',
        actorEmail: 'lead.verifier@khelgrid.com',
        action: 'verified_approved',
        summary: 'Sanction letter from AIFF authenticated against federation calendar.',
        newStatus: 'verified',
      },
    ],
  },
  {
    id: 'kg-verif-005',
    referenceCode: 'KG-ATH-5501',
    entityType: 'athlete',
    entityName: 'Aarav Mehta',
    contactEmail: 'aarav.athletics@gmail.com',
    contactPhone: '+91 97230 11982',
    city: 'Ahmedabad',
    state: 'Gujarat',
    sport: 'Athletics (400m / 800m)',
    status: 'in_review',
    submittedAt: '2026-11-22T14:30:00Z',
    lastAuditedAt: '2026-11-23T10:00:00Z',
    assignedReviewer: 'mod.athletics@khelgrid.com',
    documents: [
      {
        id: 'doc-005-afi',
        title: 'Athletics Federation of India (AFI) Athlete UID',
        category: 'federation_license',
        issuerAuthority: 'Athletics Federation of India (AFI)',
        documentNumber: 'AFI-GJ-2025-00918',
        fileUrl: '/evidence/afi_uid_aarav.pdf',
        fileSize: '1.4 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-11-22T14:32:00Z',
        issuedAt: '2025-02-10T00:00:00Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
      },
      {
        id: 'doc-005-birth',
        title: 'Municipal Corporation Birth Certificate (Age Verification)',
        category: 'identity_age_proof',
        issuerAuthority: 'Ahmedabad Municipal Corporation (AMC)',
        documentNumber: 'AMC/BIRTH/2009/44819',
        maskedIdentifier: 'AMC-B-XXXX-4819',
        fileUrl: '/evidence/birth_cert_aarav.pdf',
        fileSize: '2.3 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-11-22T14:35:00Z',
        issuedAt: '2009-07-22T00:00:00Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
    ],
    auditTrail: [
      {
        id: 'aud-005-1',
        timestamp: '2026-11-22T14:35:00Z',
        actorEmail: 'aarav.athletics@gmail.com',
        action: 'submitted',
        summary: 'Junior Athlete U-18 verification packet submitted.',
        newStatus: 'pending_review',
      },
      {
        id: 'aud-005-2',
        timestamp: '2026-11-23T10:00:00Z',
        actorEmail: 'mod.athletics@khelgrid.com',
        action: 'assigned_reviewer',
        summary: 'Assigned to Athletics Specialist for AFI state circular cross-reference.',
        previousStatus: 'pending_review',
        newStatus: 'in_review',
      },
    ],
  },
  {
    id: 'kg-verif-006',
    referenceCode: 'KG-COACH-4190',
    entityType: 'coach',
    entityName: 'Coach Sunita Devi',
    organizationName: 'Haryana Boxing Center of Excellence',
    contactEmail: 'sunita.boxer@haryana-sports.org',
    contactPhone: '+91 94160 55812',
    city: 'Bhiwani',
    state: 'Haryana',
    sport: 'Boxing',
    status: 'verified',
    badgeTier: 'tier_1_platinum',
    submittedAt: '2026-06-12T10:00:00Z',
    lastAuditedAt: '2026-11-15T11:00:00Z',
    assignedReviewer: 'lead.verifier@khelgrid.com',
    verifiedAt: '2026-06-18T14:00:00Z',
    expiresAt: '2028-06-18T23:59:59Z',
    documents: [
      {
        id: 'doc-006-nis',
        title: 'NIS Patiala Senior Master Diploma in Boxing Coaching',
        category: 'nis_diploma',
        issuerAuthority: 'Netaji Subhas National Institute of Sports (SAI)',
        documentNumber: 'SAI-NIS-DIP-2016-BX-102',
        fileUrl: '/evidence/nis_boxing_sunita.pdf',
        fileSize: '4.1 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-06-12T10:05:00Z',
        issuedAt: '2016-05-30T00:00:00Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
      {
        id: 'doc-006-bfi',
        title: 'Boxing Federation of India (BFI) 3-Star National Coach Card',
        category: 'coaching_badge',
        issuerAuthority: 'Boxing Federation of India (BFI)',
        documentNumber: 'BFI-COACH-3S-2024-88',
        fileUrl: '/evidence/bfi_coach_card.pdf',
        fileSize: '2.0 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-06-12T10:10:00Z',
        issuedAt: '2024-03-01T00:00:00Z',
        expiresAt: '2027-02-28T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
      },
    ],
    auditTrail: [
      {
        id: 'aud-006-1',
        timestamp: '2026-06-18T14:00:00Z',
        actorEmail: 'lead.verifier@khelgrid.com',
        action: 'verified_approved',
        summary: 'BFI 3-Star and NIS Master credentials cross-authenticated with SAI roster.',
        newStatus: 'verified',
      },
    ],
  },
  {
    id: 'kg-verif-007',
    referenceCode: 'KG-ACAD-3319',
    entityType: 'academy',
    entityName: 'Delhi Smashers Table Tennis Hub',
    organizationName: 'Delhi Table Tennis Promotion Trust',
    contactEmail: 'contact@delhismashers.in',
    contactPhone: '+91 11 4100 2938',
    city: 'New Delhi',
    state: 'Delhi NCR',
    sport: 'Table Tennis',
    status: 'action_required',
    actionRequiredNotes: 'The submitted TTFI State Affiliation Certificate expired on 31 March 2026. Please upload current 2026-27 renewal receipt and updated Fire NOC.',
    submittedAt: '2026-11-18T15:00:00Z',
    lastAuditedAt: '2026-11-20T17:30:00Z',
    assignedReviewer: 'mod.tabletennis@khelgrid.com',
    documents: [
      {
        id: 'doc-007-ttfi',
        title: 'Table Tennis Federation of India Affiliation Certificate',
        category: 'federation_license',
        issuerAuthority: 'Delhi Table Tennis Association (DTTA / TTFI)',
        documentNumber: 'DTTA/AFFIL/2025/ACAD-19',
        fileUrl: '/evidence/dtta_expired_cert.pdf',
        fileSize: '2.7 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-11-18T15:05:00Z',
        issuedAt: '2025-04-01T00:00:00Z',
        expiresAt: '2026-03-31T23:59:59Z', // already expired!
        isVerifiedByAuthority: false,
        verificationMethod: 'manual_gazette_cross_match',
      },
    ],
    auditTrail: [
      {
        id: 'aud-007-1',
        timestamp: '2026-11-18T15:10:00Z',
        actorEmail: 'contact@delhismashers.in',
        action: 'submitted',
        summary: 'Initial academy accreditation packet received.',
        newStatus: 'pending_review',
      },
      {
        id: 'aud-007-2',
        timestamp: '2026-11-20T17:30:00Z',
        actorEmail: 'mod.tabletennis@khelgrid.com',
        action: 'clarification_requested',
        summary: 'Affiliation certificate found expired. Re-upload requested.',
        previousStatus: 'pending_review',
        newStatus: 'action_required',
        notes: 'Notice dispatched via in-app banner and email notification.',
      },
    ],
  },
  {
    id: 'kg-verif-008',
    referenceCode: 'KG-VENUE-2901',
    entityType: 'venue',
    entityName: 'Velocity Padel & Pickleball Arena',
    organizationName: 'Velocity Racket Sports LLP',
    contactEmail: 'operations@velocitypadel.com',
    contactPhone: '+91 98200 44910',
    city: 'Mumbai',
    state: 'Maharashtra',
    sport: 'Pickleball / Padel',
    status: 'pending_review',
    submittedAt: '2026-11-23T11:45:00Z',
    lastAuditedAt: '2026-11-23T11:45:00Z',
    documents: [
      {
        id: 'doc-008-mcgm',
        title: 'Brihanmumbai Municipal Corporation (BMC/MCGM) Trade License',
        category: 'government_registration',
        issuerAuthority: 'Brihanmumbai Municipal Corporation (BMC)',
        documentNumber: 'BMC/HE/2026/TR-99120',
        fileUrl: '/evidence/bmc_trade_license_velocity.pdf',
        fileSize: '2.4 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-11-23T11:48:00Z',
        issuedAt: '2026-05-01T00:00:00Z',
        expiresAt: '2027-04-30T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
      {
        id: 'doc-008-ipa',
        title: 'Indian Pickleball Association Certified Court Specs',
        category: 'safety_fire_noc',
        issuerAuthority: 'All India Pickleball Association (AIPA)',
        documentNumber: 'AIPA/COURT-CERT/2026/MUM-04',
        fileUrl: '/evidence/aipa_court_cert.pdf',
        fileSize: '3.6 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-11-23T11:50:00Z',
        issuedAt: '2026-06-15T00:00:00Z',
        expiresAt: '2028-06-14T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
      },
    ],
    auditTrail: [
      {
        id: 'aud-008-1',
        timestamp: '2026-11-23T11:50:00Z',
        actorEmail: 'operations@velocitypadel.com',
        action: 'submitted',
        summary: 'New venue verification packet lodged.',
        newStatus: 'pending_review',
      },
    ],
  },
  {
    id: 'kg-verif-009',
    referenceCode: 'KG-COACH-1092',
    entityType: 'coach',
    entityName: 'Coach Vikramaditya Rao',
    organizationName: 'Shivaji Park Cricket Club',
    contactEmail: 'vikram.cricket@gmail.com',
    contactPhone: '+91 98210 99882',
    city: 'Mumbai',
    state: 'Maharashtra',
    sport: 'Cricket',
    status: 'expired',
    badgeTier: 'tier_2_gold',
    submittedAt: '2023-11-01T10:00:00Z',
    lastAuditedAt: '2026-11-24T08:00:00Z',
    assignedReviewer: 'lead.verifier@khelgrid.com',
    verifiedAt: '2023-11-05T12:00:00Z',
    expiresAt: '2026-11-05T23:59:59Z', // Expired ~19 days ago!
    documents: [
      {
        id: 'doc-009-bcci',
        title: 'BCCI National Cricket Academy (NCA) Level 2 Coach Certificate',
        category: 'coaching_badge',
        issuerAuthority: 'Board of Control for Cricket in India (BCCI / NCA)',
        documentNumber: 'BCCI-NCA-L2-2023-CR-441',
        fileUrl: '/evidence/bcci_nca_vikram.pdf',
        fileSize: '3.8 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2023-11-01T10:05:00Z',
        issuedAt: '2023-11-05T00:00:00Z',
        expiresAt: '2026-11-05T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
    ],
    auditTrail: [
      {
        id: 'aud-009-1',
        timestamp: '2023-11-05T12:00:00Z',
        actorEmail: 'lead.verifier@khelgrid.com',
        action: 'verified_approved',
        summary: 'BCCI NCA certification verified. 3-year trust seal issued.',
        newStatus: 'verified',
      },
      {
        id: 'aud-009-2',
        timestamp: '2026-11-06T00:01:00Z',
        actorEmail: 'system.daemon@khelgrid.com',
        action: 'note_added',
        summary: 'Automated expiry tracker flagged credential as expired. Status updated to expired.',
        previousStatus: 'verified',
        newStatus: 'expired',
      },
    ],
  },
  {
    id: 'kg-verif-010',
    referenceCode: 'KG-ORG-9901',
    entityType: 'organiser',
    entityName: 'Haryana Wrestling State Championship Committee',
    organizationName: 'Haryana Wrestling Association (HWA / WFI)',
    contactEmail: 'tournaments@haryanawrestling.org',
    contactPhone: '+91 1262 248900',
    city: 'Rohtak',
    state: 'Haryana',
    sport: 'Wrestling',
    status: 'verified',
    badgeTier: 'tier_1_platinum',
    submittedAt: '2026-10-01T09:00:00Z',
    lastAuditedAt: '2026-10-05T11:00:00Z',
    assignedReviewer: 'lead.verifier@khelgrid.com',
    verifiedAt: '2026-10-05T11:00:00Z',
    expiresAt: '2027-10-05T23:59:59Z',
    documents: [
      {
        id: 'doc-010-wfi',
        title: 'WFI Official Sanction Order & Referee Allocation Roster',
        category: 'event_sanction',
        issuerAuthority: 'Wrestling Federation of India (WFI)',
        documentNumber: 'WFI/SANCT/STATE/2026/09',
        fileUrl: '/evidence/wfi_sanction_rohtak.pdf',
        fileSize: '3.0 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-10-01T09:05:00Z',
        issuedAt: '2026-09-15T00:00:00Z',
        expiresAt: '2027-09-14T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
      },
      {
        id: 'doc-010-nada',
        title: 'National Anti-Doping Agency (NADA) Briefing & Compliance Undertaking',
        category: 'safety_fire_noc',
        issuerAuthority: 'National Anti-Doping Agency (NADA India)',
        documentNumber: 'NADA/CLEAN-SPORT/2026/HWA-44',
        fileUrl: '/evidence/nada_compliance.pdf',
        fileSize: '1.5 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-10-01T09:10:00Z',
        issuedAt: '2026-09-20T00:00:00Z',
        expiresAt: '2027-09-19T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
    ],
    auditTrail: [
      {
        id: 'aud-010-1',
        timestamp: '2026-10-05T11:00:00Z',
        actorEmail: 'lead.verifier@khelgrid.com',
        action: 'verified_approved',
        summary: 'WFI sanction and NADA anti-doping undertakings validated.',
        newStatus: 'verified',
      },
    ],
  },
  {
    id: 'kg-verif-011',
    referenceCode: 'KG-ATH-9011',
    entityType: 'athlete',
    entityName: 'Riya Sen',
    contactEmail: 'riya.aquatics@gmail.com',
    contactPhone: '+91 98300 22109',
    city: 'Kolkata',
    state: 'West Bengal',
    sport: 'Swimming (100m / 200m Freestyle)',
    status: 'verified',
    badgeTier: 'tier_2_gold',
    submittedAt: '2026-09-25T14:00:00Z',
    lastAuditedAt: '2026-10-02T16:00:00Z',
    assignedReviewer: 'mod.aquatics@khelgrid.com',
    verifiedAt: '2026-10-02T16:00:00Z',
    expiresAt: '2027-10-02T23:59:59Z',
    documents: [
      {
        id: 'doc-011-sfi',
        title: 'Swimming Federation of India (SFI) National Swimmer UID Card',
        category: 'federation_license',
        issuerAuthority: 'Swimming Federation of India (SFI)',
        documentNumber: 'SFI-WB-2024-SW-771',
        fileUrl: '/evidence/sfi_uid_riya.pdf',
        fileSize: '1.6 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-09-25T14:05:00Z',
        issuedAt: '2024-04-10T00:00:00Z',
        expiresAt: '2027-04-09T23:59:59Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'digital_registry_api',
      },
      {
        id: 'doc-011-merit',
        title: 'National Junior Aquatics Championship Gold Medal Certificate',
        category: 'merit_certificate',
        issuerAuthority: 'Swimming Federation of India (SFI)',
        documentNumber: 'SFI/NJAC/2026/GOLD-402',
        fileUrl: '/evidence/swimming_gold_cert.pdf',
        fileSize: '3.1 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-09-25T14:10:00Z',
        issuedAt: '2026-07-28T00:00:00Z',
        isVerifiedByAuthority: true,
        verificationMethod: 'qr_code_cryptographic',
      },
    ],
    auditTrail: [
      {
        id: 'aud-011-1',
        timestamp: '2026-10-02T16:00:00Z',
        actorEmail: 'mod.aquatics@khelgrid.com',
        action: 'verified_approved',
        summary: 'SFI database cross-referenced; National podium finish confirmed.',
        newStatus: 'verified',
      },
    ],
  },
  {
    id: 'kg-verif-012',
    referenceCode: 'KG-ORG-1199',
    entityType: 'organiser',
    entityName: 'Mega Premier Gully League',
    organizationName: 'Commercial Street Marketing Ent',
    contactEmail: 'contact@megagullycricket.in',
    contactPhone: '+91 99999 00112',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    sport: 'Cricket',
    status: 'rejected',
    rejectionReason: 'Failed federation verification. No sanction from Uttar Pradesh Cricket Association (UPCA) or district sports council. Commercial tournament collecting registration fees without sanctioned player insurance or official match referee rosters.',
    submittedAt: '2026-10-10T12:00:00Z',
    lastAuditedAt: '2026-10-12T15:00:00Z',
    assignedReviewer: 'lead.verifier@khelgrid.com',
    documents: [
      {
        id: 'doc-012-fake',
        title: 'Purported District Sports Association Sanction Stamp',
        category: 'event_sanction',
        issuerAuthority: 'Unverified Local Entity',
        documentNumber: 'UNVERIF/SANCT/2026/001',
        fileUrl: '/evidence/unverified_sanction_stamp.pdf',
        fileSize: '1.1 MB',
        fileMimeType: 'application/pdf',
        uploadedAt: '2026-10-10T12:05:00Z',
        issuedAt: '2026-10-01T00:00:00Z',
        isVerifiedByAuthority: false,
        verificationMethod: 'manual_gazette_cross_match',
      },
    ],
    auditTrail: [
      {
        id: 'aud-012-1',
        timestamp: '2026-10-10T12:10:00Z',
        actorEmail: 'contact@megagullycricket.in',
        action: 'submitted',
        summary: 'Commercial tournament approval requested.',
        newStatus: 'pending_review',
      },
      {
        id: 'aud-012-2',
        timestamp: '2026-10-12T15:00:00Z',
        actorEmail: 'lead.verifier@khelgrid.com',
        action: 'rejected',
        summary: 'Rejected due to absence of legitimate state cricket association sanction.',
        previousStatus: 'pending_review',
        newStatus: 'rejected',
        notes: 'Commercial organizer flagged in trust & safety watch-list.',
      },
    ],
  },
]

function readStoredVerifications(): AdminVerificationItem[] {
  if (typeof window === 'undefined') return SEED_ADMIN_VERIFICATIONS
  try {
    const raw = localStorage.getItem(STORAGE_VERIFICATION_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_VERIFICATION_KEY, JSON.stringify(SEED_ADMIN_VERIFICATIONS))
      return SEED_ADMIN_VERIFICATIONS
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return SEED_ADMIN_VERIFICATIONS
  } catch (err) {
    console.warn('[adminVerificationService] Failed reading stored verifications, fallback to seed', err)
    return SEED_ADMIN_VERIFICATIONS
  }
}

function writeStoredVerifications(items: AdminVerificationItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_VERIFICATION_KEY, JSON.stringify(items))
  } catch (err) {
    console.warn('[adminVerificationService] Failed writing stored verifications', err)
  }
}

export function getAdminVerifications(): AdminVerificationItem[] {
  return readStoredVerifications()
}

export function getAdminVerificationDetails(id: string): AdminVerificationItem | null {
  const all = readStoredVerifications()
  return all.find(item => item.id === id || item.referenceCode === id) ?? null
}

export function approveVerification(
  id: string,
  tier: VerificationBadgeTier,
  validityMonths: number,
  operatorEmail: string,
  note?: string
): AdminVerificationItem {
  const all = readStoredVerifications()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Verification record with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date()
  const expiry = new Date(now)
  expiry.setMonth(expiry.getMonth() + validityMonths)

  const newAudit: VerificationAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now.toISOString(),
    actorEmail: operatorEmail,
    action: 'verified_approved',
    summary: `Verification Approved. Awarded ${tier.replace(/_/g, ' ').toUpperCase()} Trust Seal for ${validityMonths} months.`,
    previousStatus: existing.status,
    newStatus: 'verified',
    notes: note ?? 'All submitted evidence authenticated against official state/national registry.',
  }

  const updated: AdminVerificationItem = {
    ...existing,
    status: 'verified',
    badgeTier: tier,
    verifiedAt: now.toISOString(),
    expiresAt: expiry.toISOString(),
    lastAuditedAt: now.toISOString(),
    assignedReviewer: operatorEmail,
    actionRequiredNotes: undefined,
    rejectionReason: undefined,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredVerifications(all)
  return updated
}

export function requestVerificationCorrections(
  id: string,
  notes: string,
  operatorEmail: string
): AdminVerificationItem {
  const all = readStoredVerifications()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Verification record with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: VerificationAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    actorEmail: operatorEmail,
    action: 'clarification_requested',
    summary: 'Evidence Clarification / Correction Requested.',
    previousStatus: existing.status,
    newStatus: 'action_required',
    notes,
  }

  const updated: AdminVerificationItem = {
    ...existing,
    status: 'action_required',
    actionRequiredNotes: notes,
    lastAuditedAt: now,
    assignedReviewer: operatorEmail,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredVerifications(all)
  return updated
}

export function rejectVerification(
  id: string,
  reason: string,
  operatorEmail: string
): AdminVerificationItem {
  const all = readStoredVerifications()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Verification record with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: VerificationAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    actorEmail: operatorEmail,
    action: 'rejected',
    summary: 'Verification Application Rejected.',
    previousStatus: existing.status,
    newStatus: 'rejected',
    notes: reason,
  }

  const updated: AdminVerificationItem = {
    ...existing,
    status: 'rejected',
    rejectionReason: reason,
    lastAuditedAt: now,
    assignedReviewer: operatorEmail,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredVerifications(all)
  return updated
}

export function revokeVerification(
  id: string,
  reason: string,
  operatorEmail: string
): AdminVerificationItem {
  const all = readStoredVerifications()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Verification record with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: VerificationAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    actorEmail: operatorEmail,
    action: 'revoked',
    summary: 'Verified Trust Seal Revoked due to compliance or fraud notice.',
    previousStatus: existing.status,
    newStatus: 'revoked',
    notes: reason,
  }

  const updated: AdminVerificationItem = {
    ...existing,
    status: 'revoked',
    badgeTier: undefined,
    rejectionReason: reason,
    lastAuditedAt: now,
    assignedReviewer: operatorEmail,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredVerifications(all)
  return updated
}

export function extendVerificationExpiry(
  id: string,
  additionalMonths: number,
  operatorEmail: string,
  note?: string
): AdminVerificationItem {
  const all = readStoredVerifications()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Verification record with id "${id}" not found.`)
  }

  const existing = all[idx]
  const baseDate = existing.expiresAt ? new Date(existing.expiresAt) : new Date()
  // If already in the past, extend from today
  const effectiveBase = baseDate.getTime() < Date.now() ? new Date() : baseDate
  const newExpiry = new Date(effectiveBase)
  newExpiry.setMonth(newExpiry.getMonth() + additionalMonths)

  const now = new Date().toISOString()

  const newAudit: VerificationAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    actorEmail: operatorEmail,
    action: 'expiry_extended',
    summary: `Credential validity extended by ${additionalMonths} months until ${newExpiry.toISOString().slice(0, 10)}.`,
    previousStatus: existing.status,
    newStatus: 'verified',
    notes: note ?? 'Grace period / license renewal extension granted.',
  }

  const updated: AdminVerificationItem = {
    ...existing,
    status: 'verified',
    expiresAt: newExpiry.toISOString(),
    lastAuditedAt: now,
    assignedReviewer: operatorEmail,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredVerifications(all)
  return updated
}

export function addVerificationAuditNote(
  id: string,
  note: string,
  operatorEmail: string
): AdminVerificationItem {
  const all = readStoredVerifications()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Verification record with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: VerificationAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    actorEmail: operatorEmail,
    action: 'note_added',
    summary: 'Internal Administrative Audit Note recorded.',
    notes: note,
  }

  const updated: AdminVerificationItem = {
    ...existing,
    lastAuditedAt: now,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredVerifications(all)
  return updated
}

/**
 * Generates RFC 4180 compliant CSV of verification records
 */
export function exportVerificationsToCsv(items: AdminVerificationItem[]): string {
  const headers = [
    'Reference Code',
    'Entity Type',
    'Entity Name',
    'Organization',
    'Sport',
    'City',
    'State',
    'Status',
    'Badge Tier',
    'Documents Count',
    'Submitted At',
    'Verified At',
    'Expires At',
    'Expiry Days Remaining',
    'Assigned Reviewer',
  ]

  const rows = items.map(item => {
    const exp = calculateExpiryStatus(item.expiresAt)
    return [
      item.referenceCode,
      item.entityType,
      item.entityName,
      item.organizationName ?? 'Direct Individual',
      item.sport,
      item.city,
      item.state,
      item.status,
      item.badgeTier ?? 'none',
      String(item.documents.length),
      item.submittedAt,
      item.verifiedAt ?? '',
      item.expiresAt ?? '',
      exp.daysRemaining !== null ? String(exp.daysRemaining) : 'permanent',
      item.assignedReviewer ?? 'unassigned',
    ]
  })

  const escapeCell = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ].join('\r\n')

  return csvContent
}

/**
 * Resets local storage cache to pristine seed state for tests
 */
export function resetAdminVerificationsForTesting(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_VERIFICATION_KEY)
  }
}
