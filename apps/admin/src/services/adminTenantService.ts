/**
 * KhelGrid Admin Platform — Tenant & Organisation Governance Service
 *
 * Provides administrative oversight, directory queries, and governance actions
 * (verification, suspension, reactivation, audit logging) across all registered
 * sports organizations (Academies, Venues, Coaches, Tournament Promoters) operating
 * as SaaS tenants on the KhelGrid multi-tenant platform.
 *
 * Security Invariants:
 * - Administrators govern platform-level compliance and verified badges; they do NOT
 *   micro-manage an academy's training batches, student rosters or turf slots.
 * - Server-side authorization checks ensure only authorized administrators can alter
 *   tenant lifecycle or verification statuses.
 */

import { notifyRegulatoryStateChanged } from '../../../../src/shared/governance/regulatoryBridge'

export type TenantType = 'academy' | 'venue' | 'coach' | 'tournament' | 'university' | 'club'

export type TenantLifecycleStatus = 'active' | 'restricted' | 'pending_verification' | 'suspended' | 'archived'

export type TenantVerificationStatus = 'verified' | 'pending_review' | 'unverified'

export interface AdminTenantSummary {
  id: string
  slug: string
  name: string
  tenantType: TenantType
  status: TenantLifecycleStatus
  verificationStatus: TenantVerificationStatus
  city: string
  state: string
  sport: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  contactPhone: string
  contactEmail: string
  upiVpa?: string
  staffCount: number
  batchesCount: number
  studentsCount: number
  branchesCount: number
  linkedListingsCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminTenantMember {
  id: string
  userId: string
  displayName: string
  email: string
  role: 'owner' | 'director' | 'admin' | 'head_coach' | 'coach' | 'accountant' | 'front_desk' | 'staff'
  status: 'active' | 'invited' | 'suspended'
  joinedAt: string
}

export interface AdminTenantUnit {
  id: string
  name: string
  unitType: 'branch' | 'venue' | 'training_center' | 'ground' | 'court'
  city: string
  address: string
  contactPhone?: string
}

export interface AdminTenantAuditEntry {
  id: string
  timestamp: string
  operatorEmail: string
  action: string
  oldStatus?: string
  newStatus?: string
  note: string
}

export interface AdminTenantDetail extends AdminTenantSummary {
  metadata: Record<string, unknown>
  members: AdminTenantMember[]
  units: AdminTenantUnit[]
  auditTrail: AdminTenantAuditEntry[]
  accreditationDetails?: {
    regNumber?: string
    federationAffiliation?: string
    accreditationBody?: string
    verificationDocumentUrl?: string
    verifiedAt?: string
    verifiedBy?: string
  }
}

export interface AdminTenantFilter {
  query?: string
  tenantType?: string
  status?: string
  verificationStatus?: string
  sport?: string
  city?: string
}

const STORAGE_KEY = 'khelgrid_admin_tenants_v1'

const SEED_TENANTS: AdminTenantDetail[] = [
  {
    id: 'org-ncr-elite-01',
    slug: 'ncr-elite-cricket-academy',
    name: 'NCR Elite Cricket & Multisport Academy',
    tenantType: 'academy',
    status: 'active',
    verificationStatus: 'verified',
    city: 'New Delhi',
    state: 'Delhi',
    sport: 'Cricket',
    ownerId: 'usr-owner-001',
    ownerName: 'Arjun Verma',
    ownerEmail: 'arjun.verma@ncrelite.in',
    contactPhone: '+91 98110 44210',
    contactEmail: 'desk@ncreliteacademy.in',
    upiVpa: 'ncrelite@upi',
    staffCount: 14,
    batchesCount: 8,
    studentsCount: 145,
    branchesCount: 3,
    linkedListingsCount: 4,
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-11-20T14:30:00Z',
    metadata: {
      facilities: ['Floodlit Nets', 'Bowling Machines', 'Gym', 'Video Telemetry'],
      establishedYear: 2018,
    },
    accreditationDetails: {
      regNumber: 'DEL-SPT-2018-0912',
      federationAffiliation: 'Delhi & District Cricket Association (DDCA)',
      accreditationBody: 'BCCI National Cricket Academy Affiliate',
      verificationDocumentUrl: 'https://credentials.ncreliteacademy.in/ddca_affiliation_2026.pdf',
      verifiedAt: '2026-08-20T12:00:00Z',
      verifiedBy: 'verification.lead@khelgrid.com',
    },
    members: [
      {
        id: 'mem-01',
        userId: 'usr-owner-001',
        displayName: 'Arjun Verma',
        email: 'arjun.verma@ncrelite.in',
        role: 'owner',
        status: 'active',
        joinedAt: '2026-08-14T10:00:00Z',
      },
      {
        id: 'mem-02',
        userId: 'usr-coach-002',
        displayName: 'Coach Vikram Sharma',
        email: 'vikram.sharma@ncrelite.in',
        role: 'head_coach',
        status: 'active',
        joinedAt: '2026-08-16T11:00:00Z',
      },
      {
        id: 'mem-03',
        userId: 'usr-admin-003',
        displayName: 'Priya Nair',
        email: 'priya.nair@ncrelite.in',
        role: 'admin',
        status: 'active',
        joinedAt: '2026-08-18T09:30:00Z',
      },
      {
        id: 'mem-04',
        userId: 'usr-coach-004',
        displayName: 'Ravi Teja (NIS Cricket)',
        email: 'ravi.teja@ncrelite.in',
        role: 'coach',
        status: 'active',
        joinedAt: '2026-09-01T10:00:00Z',
      },
    ],
    units: [
      {
        id: 'unit-01',
        name: 'Saket Main Pavilion Ground',
        unitType: 'ground',
        city: 'New Delhi',
        address: 'Sector 3, Saket Sports Enclave, New Delhi 110017',
        contactPhone: '+91 98110 44211',
      },
      {
        id: 'unit-02',
        name: 'Noida Indoor High-Performance Centre',
        unitType: 'training_center',
        city: 'Noida',
        address: 'Plot 42, Sector 62, Noida, Uttar Pradesh 201309',
        contactPhone: '+91 98110 44212',
      },
      {
        id: 'unit-03',
        name: 'Gurugram Turf & Nets Branch',
        unitType: 'branch',
        city: 'Gurugram',
        address: 'Golf Course Extension Road, Sector 56, Gurugram 122011',
        contactPhone: '+91 98110 44213',
      },
    ],
    auditTrail: [
      {
        id: 'aud-01',
        timestamp: '2026-08-20T12:00:00Z',
        operatorEmail: 'verification.lead@khelgrid.com',
        action: 'VERIFIED_ORGANIZATION',
        oldStatus: 'pending_verification',
        newStatus: 'active',
        note: 'DDCA affiliation certificate verified. Ground inspection cleared.',
      },
      {
        id: 'aud-02',
        timestamp: '2026-10-15T15:20:00Z',
        operatorEmail: 'admin@khelgrid.com',
        action: 'BRANCH_EXPANSION_APPROVED',
        note: 'Gurugram branch added and linked to platform catalogue.',
      },
    ],
  },
  {
    id: 'org-blr-turf-02',
    slug: 'bangalore-turf-and-football-arena',
    name: 'Bangalore Turf & Football Arena',
    tenantType: 'venue',
    status: 'active',
    verificationStatus: 'verified',
    city: 'Bengaluru',
    state: 'Karnataka',
    sport: 'Football',
    ownerId: 'usr-owner-005',
    ownerName: 'Sunil Chettiar',
    ownerEmail: 'sunil@bangaloreturf.in',
    contactPhone: '+91 98450 11990',
    contactEmail: 'bookings@bangaloreturf.in',
    upiVpa: 'bangaloreturf@icici',
    staffCount: 6,
    batchesCount: 0,
    studentsCount: 0,
    branchesCount: 2,
    linkedListingsCount: 3,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-11-19T10:00:00Z',
    metadata: {
      facilities: ['FIFA Pro-grade Artificial Turf', 'Changing Rooms', 'Floodlights', 'Cafe'],
      establishedYear: 2021,
    },
    accreditationDetails: {
      regNumber: 'KA-BNG-VEN-2021-441',
      federationAffiliation: 'Karnataka State Football Association (KSFA) Registered Ground',
      accreditationBody: 'FIFA Quality Turf Standard Certificate',
      verificationDocumentUrl: 'https://credentials.bangaloreturf.in/fifa_cert_2026.pdf',
      verifiedAt: '2026-09-05T14:00:00Z',
      verifiedBy: 'verification.lead@khelgrid.com',
    },
    members: [
      {
        id: 'mem-05',
        userId: 'usr-owner-005',
        displayName: 'Sunil Chettiar',
        email: 'sunil@bangaloreturf.in',
        role: 'owner',
        status: 'active',
        joinedAt: '2026-09-01T08:00:00Z',
      },
      {
        id: 'mem-06',
        userId: 'usr-frontdesk-006',
        displayName: 'Karthik Rao',
        email: 'karthik@bangaloreturf.in',
        role: 'front_desk',
        status: 'active',
        joinedAt: '2026-09-02T10:00:00Z',
      },
    ],
    units: [
      {
        id: 'unit-04',
        name: 'Indiranagar 7-a-side Main Arena',
        unitType: 'venue',
        city: 'Bengaluru',
        address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
        contactPhone: '+91 98450 11991',
      },
      {
        id: 'unit-05',
        name: 'Koramangala 5-a-side Express Turf',
        unitType: 'venue',
        city: 'Bengaluru',
        address: '80 Feet Road, 4th Block, Koramangala, Bengaluru 560034',
        contactPhone: '+91 98450 11992',
      },
    ],
    auditTrail: [
      {
        id: 'aud-03',
        timestamp: '2026-09-05T14:00:00Z',
        operatorEmail: 'verification.lead@khelgrid.com',
        action: 'VERIFIED_VENUE',
        note: 'KSFA registered venue documentation verified. Commercial trade license approved.',
      },
    ],
  },
  {
    id: 'org-hyd-pullela-03',
    slug: 'pullela-badminton-excellence-centre',
    name: 'Pullela Badminton Excellence Centre',
    tenantType: 'academy',
    status: 'active',
    verificationStatus: 'verified',
    city: 'Hyderabad',
    state: 'Telangana',
    sport: 'Badminton',
    ownerId: 'usr-owner-007',
    ownerName: 'Anand Pullela',
    ownerEmail: 'anand@pullelabadminton.org',
    contactPhone: '+91 98490 33810',
    contactEmail: 'contact@pullelabadminton.org',
    staffCount: 18,
    batchesCount: 12,
    studentsCount: 220,
    branchesCount: 4,
    linkedListingsCount: 5,
    createdAt: '2026-07-10T09:00:00Z',
    updatedAt: '2026-11-22T16:00:00Z',
    metadata: {
      facilities: ['BWF Synthetic Wooden Courts', 'Physio & Ice Bath Facility', 'Biomechanics Lab'],
      establishedYear: 2012,
    },
    accreditationDetails: {
      regNumber: 'TS-HYD-BAI-2012-008',
      federationAffiliation: 'Badminton Association of India (BAI) High Performance Centre',
      accreditationBody: 'BWF Certified Academy Level 3',
      verificationDocumentUrl: 'https://credentials.pullelabadminton.org/bai_accreditation.pdf',
      verifiedAt: '2026-07-15T11:00:00Z',
      verifiedBy: 'verification.lead@khelgrid.com',
    },
    members: [
      {
        id: 'mem-07',
        userId: 'usr-owner-007',
        displayName: 'Anand Pullela',
        email: 'anand@pullelabadminton.org',
        role: 'owner',
        status: 'active',
        joinedAt: '2026-07-10T09:00:00Z',
      },
      {
        id: 'mem-08',
        userId: 'usr-coach-008',
        displayName: 'Manoj Reddy (BWF Coach)',
        email: 'manoj@pullelabadminton.org',
        role: 'head_coach',
        status: 'active',
        joinedAt: '2026-07-12T10:00:00Z',
      },
    ],
    units: [
      {
        id: 'unit-06',
        name: 'Gachibowli High-Performance Campus',
        unitType: 'training_center',
        city: 'Hyderabad',
        address: 'Near Old Mumbai Highway, Gachibowli, Hyderabad 500032',
        contactPhone: '+91 98490 33811',
      },
    ],
    auditTrail: [
      {
        id: 'aud-04',
        timestamp: '2026-07-15T11:00:00Z',
        operatorEmail: 'verification.lead@khelgrid.com',
        action: 'VERIFIED_ACADEMY',
        note: 'BAI High Performance accreditation confirmed.',
      },
    ],
  },
  {
    id: 'org-del-ipu-04',
    slug: 'indraprastha-university-sports-board',
    name: 'Indraprastha University Sports Board',
    tenantType: 'university',
    status: 'active',
    verificationStatus: 'pending_review',
    city: 'New Delhi',
    state: 'Delhi',
    sport: 'Athletics',
    ownerId: 'usr-owner-009',
    ownerName: 'Dr. S. K. Mehta',
    ownerEmail: 'director.sports@ipu-demo.ac.in',
    contactPhone: '+91 98101 22840',
    contactEmail: 'sportsboard@ipu-demo.ac.in',
    staffCount: 8,
    batchesCount: 4,
    studentsCount: 90,
    branchesCount: 1,
    linkedListingsCount: 2,
    createdAt: '2026-10-01T11:00:00Z',
    updatedAt: '2026-11-23T09:00:00Z',
    metadata: {
      facilities: ['400m Synthetic Track', 'Olympic Swimming Pool', 'Multipurpose Indoor Hall'],
      establishedYear: 2005,
    },
    accreditationDetails: {
      regNumber: 'AIU-UNI-DL-092',
      federationAffiliation: 'Association of Indian Universities (AIU)',
      accreditationBody: 'Ministry of Youth Affairs and Sports (MYAS)',
      verificationDocumentUrl: 'https://ipu.ac.in/sports/aiu_affiliation_2026.pdf',
    },
    members: [
      {
        id: 'mem-09',
        userId: 'usr-owner-009',
        displayName: 'Dr. S. K. Mehta',
        email: 'director.sports@ipu-demo.ac.in',
        role: 'owner',
        status: 'active',
        joinedAt: '2026-10-01T11:00:00Z',
      },
    ],
    units: [
      {
        id: 'unit-07',
        name: 'Dwarka Sports Complex Stadium',
        unitType: 'ground',
        city: 'New Delhi',
        address: 'Sector 16C, Dwarka, New Delhi 110078',
        contactPhone: '+91 98101 22841',
      },
    ],
    auditTrail: [
      {
        id: 'aud-05',
        timestamp: '2026-10-01T11:00:00Z',
        operatorEmail: 'system@khelgrid.com',
        action: 'TENANT_ONBOARDED',
        note: 'University sports board tenant profile created. Awaiting AIU circular verification.',
      },
    ],
  },
  {
    id: 'org-mum-tennis-05',
    slug: 'mumbai-premier-tennis-and-pickleball-hub',
    name: 'Mumbai Premier Tennis & Pickleball Hub',
    tenantType: 'venue',
    status: 'active',
    verificationStatus: 'verified',
    city: 'Mumbai',
    state: 'Maharashtra',
    sport: 'Tennis',
    ownerId: 'usr-owner-010',
    ownerName: 'Cyrus Mistry',
    ownerEmail: 'cyrus@mumbaitennis.in',
    contactPhone: '+91 98200 77112',
    contactEmail: 'info@mumbaitennis.in',
    staffCount: 5,
    batchesCount: 3,
    studentsCount: 45,
    branchesCount: 2,
    linkedListingsCount: 2,
    createdAt: '2026-08-25T14:00:00Z',
    updatedAt: '2026-11-21T18:00:00Z',
    metadata: {
      facilities: ['6 Acrylic Hard Courts', '4 Dedicated Pickleball Courts', 'Pro Shop'],
      establishedYear: 2020,
    },
    members: [],
    units: [],
    auditTrail: [],
  },
  {
    id: 'org-kolhapur-kushti-06',
    slug: 'kushti-akhada-pehalwan-trust',
    name: 'Kushti Akhada Pehalwan Trust',
    tenantType: 'academy',
    status: 'pending_verification',
    verificationStatus: 'pending_review',
    city: 'Kolhapur',
    state: 'Maharashtra',
    sport: 'Wrestling',
    ownerId: 'usr-owner-011',
    ownerName: 'Ustaad Bapu Patil',
    ownerEmail: 'bapupatil@akhadaptrust.org',
    contactPhone: '+91 94220 55102',
    contactEmail: 'contact@akhadaptrust.org',
    staffCount: 4,
    batchesCount: 2,
    studentsCount: 65,
    branchesCount: 1,
    linkedListingsCount: 1,
    createdAt: '2026-11-10T12:00:00Z',
    updatedAt: '2026-11-23T11:00:00Z',
    metadata: {
      facilities: ['Traditional Red Soil Mud Pit (Matti)', 'Olympic Mat Area', 'Gym'],
      establishedYear: 1984,
    },
    members: [],
    units: [],
    auditTrail: [
      {
        id: 'aud-06',
        timestamp: '2026-11-10T12:00:00Z',
        operatorEmail: 'system@khelgrid.com',
        action: 'SUBMITTED_FOR_VERIFICATION',
        note: 'Submitted trust registration deed and Maharashtra Wrestling Federation affiliation letter.',
      },
    ],
  },
  {
    id: 'org-kol-chess-07',
    slug: 'kolkata-district-junior-chess-and-esports',
    name: 'Kolkata District Junior Chess & Esports',
    tenantType: 'tournament',
    status: 'active',
    verificationStatus: 'verified',
    city: 'Kolkata',
    state: 'West Bengal',
    sport: 'Chess',
    ownerId: 'usr-owner-012',
    ownerName: 'Subir Banerjee',
    ownerEmail: 'subir@kolkatachess.in',
    contactPhone: '+91 98310 88204',
    contactEmail: 'tournaments@kolkatachess.in',
    staffCount: 3,
    batchesCount: 0,
    studentsCount: 0,
    branchesCount: 1,
    linkedListingsCount: 3,
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-11-18T14:00:00Z',
    metadata: {
      facilities: ['FIDE Rated Tournament Hall', 'DGT Electronic Boards'],
      establishedYear: 2017,
    },
    members: [],
    units: [],
    auditTrail: [],
  },
  {
    id: 'org-shimla-athletics-08',
    slug: 'himalayan-high-altitude-athletics-training',
    name: 'Himalayan High-Altitude Athletics Training',
    tenantType: 'academy',
    status: 'active',
    verificationStatus: 'verified',
    city: 'Shimla',
    state: 'Himachal Pradesh',
    sport: 'Athletics',
    ownerId: 'usr-owner-013',
    ownerName: 'Col. Ranjit Katoch',
    ownerEmail: 'rkatoch@himalayanathletics.in',
    contactPhone: '+91 94180 99420',
    contactEmail: 'highaltitude@himalayanathletics.in',
    staffCount: 7,
    batchesCount: 5,
    studentsCount: 80,
    branchesCount: 2,
    linkedListingsCount: 2,
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-11-22T10:00:00Z',
    metadata: {
      facilities: ['2200m Elevation Trail', 'Cinder Track', 'Hypoxic Recovery Centre'],
      establishedYear: 2019,
    },
    members: [],
    units: [],
    auditTrail: [],
  },
  {
    id: 'org-chn-turf-09',
    slug: 'chennai-super-strikers-futsal-and-turf',
    name: 'Chennai Super Strikers Futsal & Turf',
    tenantType: 'venue',
    status: 'suspended',
    verificationStatus: 'unverified',
    city: 'Chennai',
    state: 'Tamil Nadu',
    sport: 'Football',
    ownerId: 'usr-owner-014',
    ownerName: 'Ramesh Balan',
    ownerEmail: 'ramesh@superstrikers.in',
    contactPhone: '+91 98400 44102',
    contactEmail: 'support@superstrikers.in',
    staffCount: 3,
    batchesCount: 0,
    studentsCount: 0,
    branchesCount: 1,
    linkedListingsCount: 1,
    createdAt: '2026-04-12T11:00:00Z',
    updatedAt: '2026-11-15T16:00:00Z',
    metadata: {
      facilities: ['Covered 5-a-side Arena'],
      establishedYear: 2022,
    },
    members: [],
    units: [],
    auditTrail: [
      {
        id: 'aud-07',
        timestamp: '2026-11-15T16:00:00Z',
        operatorEmail: 'trust.safety@khelgrid.com',
        action: 'TENANT_SUSPENDED',
        oldStatus: 'active',
        newStatus: 'suspended',
        note: 'Customer complaint regarding broken perimeter netting and safety hazard. Suspended pending ground repair inspection.',
      },
    ],
  },
  {
    id: 'org-pune-taekwondo-10',
    slug: 'apex-combat-and-taekwondo-dojang',
    name: 'Apex Combat & Taekwondo Dojang',
    tenantType: 'coach',
    status: 'active',
    verificationStatus: 'pending_review',
    city: 'Pune',
    state: 'Maharashtra',
    sport: 'Martial Arts',
    ownerId: 'usr-owner-015',
    ownerName: 'Master Nitin Deshmukh',
    ownerEmail: 'master.nitin@apexcombat.in',
    contactPhone: '+91 98220 33910',
    contactEmail: 'dojang@apexcombat.in',
    staffCount: 3,
    batchesCount: 4,
    studentsCount: 50,
    branchesCount: 1,
    linkedListingsCount: 1,
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-11-20T12:00:00Z',
    metadata: {
      facilities: ['WTF Approved Mats', 'Kicking Shields', 'Electronic Scoring Sensor Pads'],
      establishedYear: 2023,
    },
    members: [],
    units: [],
    auditTrail: [],
  },
  {
    id: 'org-punjab-kabaddi-11',
    slug: 'punjab-kabaddi-warriors-club',
    name: 'Punjab Kabaddi Warriors Club',
    tenantType: 'club',
    status: 'active',
    verificationStatus: 'verified',
    city: 'Ludhiana',
    state: 'Punjab',
    sport: 'Kabaddi',
    ownerId: 'usr-owner-016',
    ownerName: 'Harpreet Singh Dhillon',
    ownerEmail: 'harpreet@punjabkabaddi.org',
    contactPhone: '+91 98140 77218',
    contactEmail: 'trials@punjabkabaddi.org',
    staffCount: 7,
    batchesCount: 3,
    studentsCount: 75,
    branchesCount: 2,
    linkedListingsCount: 2,
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-11-19T15:00:00Z',
    metadata: {
      facilities: ['Circle Kabaddi Natural Grass Arena', 'Standard Mats Hall'],
      establishedYear: 2015,
    },
    members: [],
    units: [],
    auditTrail: [],
  },
  {
    id: 'org-jpr-polo-12',
    slug: 'jaipur-royal-polo-and-equestrian-guild',
    name: 'Jaipur Royal Polo & Equestrian Guild',
    tenantType: 'venue',
    status: 'archived',
    verificationStatus: 'unverified',
    city: 'Jaipur',
    state: 'Rajasthan',
    sport: 'Equestrian',
    ownerId: 'usr-owner-017',
    ownerName: 'Raghavendra Singh',
    ownerEmail: 'raghavendra@jaipurpolo.in',
    contactPhone: '+91 98290 11094',
    contactEmail: 'contact@jaipurpolo.in',
    staffCount: 2,
    batchesCount: 0,
    studentsCount: 0,
    branchesCount: 1,
    linkedListingsCount: 0,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-09-30T17:00:00Z',
    metadata: {
      facilities: ['Polo Ground', 'Stables'],
      establishedYear: 2010,
    },
    members: [],
    units: [],
    auditTrail: [
      {
        id: 'aud-08',
        timestamp: '2026-09-30T17:00:00Z',
        operatorEmail: 'admin@khelgrid.com',
        action: 'TENANT_ARCHIVED',
        oldStatus: 'active',
        newStatus: 'archived',
        note: 'Facility seasonal hibernation / lease expiration.',
      },
    ],
  },
]

function getStoredTenants(): AdminTenantDetail[] {
  if (typeof window === 'undefined') return SEED_TENANTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return SEED_TENANTS
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return SEED_TENANTS
  } catch {
    return SEED_TENANTS
  }
}

function persistTenants(tenants: AdminTenantDetail[]) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants))
    } catch {
      // Ignore quota errors in storage
    }
  }
  notifyRegulatoryStateChanged()
}

export function resetAdminTenantsForTesting(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  notifyRegulatoryStateChanged()
}

export function getAdminTenants(filter?: AdminTenantFilter): AdminTenantSummary[] {
  const all = getStoredTenants()
  if (!filter) return all

  return all.filter(t => {
    if (filter.query) {
      const q = filter.query.trim().toLowerCase()
      const matchName = t.name.toLowerCase().includes(q)
      const matchSlug = t.slug.toLowerCase().includes(q)
      const matchCity = t.city.toLowerCase().includes(q)
      const matchSport = t.sport.toLowerCase().includes(q)
      const matchOwner = t.ownerEmail.toLowerCase().includes(q) || t.ownerName.toLowerCase().includes(q)
      if (!matchName && !matchSlug && !matchCity && !matchSport && !matchOwner) return false
    }

    if (filter.tenantType && filter.tenantType !== 'all') {
      if (t.tenantType !== filter.tenantType) return false
    }

    if (filter.status && filter.status !== 'all') {
      if (t.status !== filter.status) return false
    }

    if (filter.verificationStatus && filter.verificationStatus !== 'all') {
      if (t.verificationStatus !== filter.verificationStatus) return false
    }

    if (filter.sport && filter.sport !== 'all') {
      if (t.sport.toLowerCase() !== filter.sport.toLowerCase()) return false
    }

    if (filter.city && filter.city !== 'all') {
      if (t.city.toLowerCase() !== filter.city.toLowerCase()) return false
    }

    return true
  })
}

export function getAdminTenantDetails(tenantId: string): AdminTenantDetail | null {
  const all = getStoredTenants()
  const found = all.find(t => t.id === tenantId)
  return found || null
}

export function updateTenantLifecycleStatus(
  tenantId: string,
  newStatus: TenantLifecycleStatus,
  operatorEmail: string,
  reasonNote: string
): { success: boolean; error?: string } {
  const all = getStoredTenants()
  const idx = all.findIndex(t => t.id === tenantId)
  if (idx === -1) return { success: false, error: 'Tenant organisation not found' }

  const tenant = all[idx]
  const oldStatus = tenant.status
  const updatedTenant: AdminTenantDetail = {
    ...tenant,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    auditTrail: [
      {
        id: `aud-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        operatorEmail,
        action: `STATUS_CHANGE_TO_${newStatus.toUpperCase()}`,
        oldStatus,
        newStatus,
        note: reasonNote,
      },
      ...tenant.auditTrail,
    ],
  }

  all[idx] = updatedTenant
  persistTenants(all)
  return { success: true }
}

export function updateTenantVerificationStatus(
  tenantId: string,
  newVerification: TenantVerificationStatus,
  operatorEmail: string,
  accreditationBody: string,
  justificationNote: string
): { success: boolean; error?: string } {
  const all = getStoredTenants()
  const idx = all.findIndex(t => t.id === tenantId)
  if (idx === -1) return { success: false, error: 'Tenant organisation not found' }

  const tenant = all[idx]
  const oldVerification = tenant.verificationStatus
  const updatedTenant: AdminTenantDetail = {
    ...tenant,
    verificationStatus: newVerification,
    status: newVerification === 'verified' && tenant.status === 'pending_verification' ? 'active' : tenant.status,
    updatedAt: new Date().toISOString(),
    accreditationDetails: {
      ...tenant.accreditationDetails,
      accreditationBody: accreditationBody || tenant.accreditationDetails?.accreditationBody,
      verifiedAt: newVerification === 'verified' ? new Date().toISOString() : undefined,
      verifiedBy: newVerification === 'verified' ? operatorEmail : undefined,
    },
    auditTrail: [
      {
        id: `aud-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        operatorEmail,
        action: `VERIFICATION_SET_TO_${newVerification.toUpperCase()}`,
        oldStatus: oldVerification,
        newStatus: newVerification,
        note: justificationNote,
      },
      ...tenant.auditTrail,
    ],
  }

  all[idx] = updatedTenant
  persistTenants(all)
  return { success: true }
}

export function addTenantAdminNote(
  tenantId: string,
  operatorEmail: string,
  note: string
): { success: boolean; error?: string } {
  const all = getStoredTenants()
  const idx = all.findIndex(t => t.id === tenantId)
  if (idx === -1) return { success: false, error: 'Tenant organisation not found' }

  const tenant = all[idx]
  const updatedTenant: AdminTenantDetail = {
    ...tenant,
    updatedAt: new Date().toISOString(),
    auditTrail: [
      {
        id: `aud-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        operatorEmail,
        action: 'ADMIN_INTERNAL_NOTE',
        note,
      },
      ...tenant.auditTrail,
    ],
  }

  all[idx] = updatedTenant
  persistTenants(all)
  return { success: true }
}

export function exportTenantsToCsv(tenants: AdminTenantSummary[]): string {
  const headers = [
    'Tenant ID',
    'Slug',
    'Organisation Name',
    'Tenant Type',
    'Sport',
    'City',
    'State',
    'Status',
    'Verification Status',
    'Owner Name',
    'Owner Email',
    'Contact Phone',
    'Staff Count',
    'Branches Count',
    'Batches Count',
    'Students Count',
    'Created At',
  ]

  const escapeCell = (str: string | number | undefined | null): string => {
    const val = str === null || str === undefined ? '' : String(str)
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const rows = tenants.map(t => [
    t.id,
    t.slug,
    t.name,
    t.tenantType,
    t.sport,
    t.city,
    t.state,
    t.status,
    t.verificationStatus,
    t.ownerName,
    t.ownerEmail,
    t.contactPhone,
    t.staffCount,
    t.branchesCount,
    t.batchesCount,
    t.studentsCount,
    t.createdAt,
  ])

  return [headers.join(','), ...rows.map(r => r.map(escapeCell).join(','))].join('\r\n')
}
