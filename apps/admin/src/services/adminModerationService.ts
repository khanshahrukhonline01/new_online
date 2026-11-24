/**
 * KhelGrid Admin Listing & Content Moderation Service
 *
 * Unified cross-workspace review desk for:
 * - Venues & Turfs
 * - Academies & Training Centers
 * - Coaches & Trainers
 * - Trials & Scouting Selections
 * - Sports Camps & Clinics
 * - Scholarships & Combines
 * - Pickup Games & Community Turf Matches
 */

export type ModerationListingType =
  | 'venue'
  | 'academy'
  | 'coach'
  | 'trial'
  | 'camp'
  | 'scholarship'
  | 'pickup_game'
  | 'other'

export type ModerationLifecycleStatus =
  | 'pending_review'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'unpublished'

export interface ListingRevisionHistory {
  version: number
  submittedAt: string
  changesSummary: string
  submittedBy: string
  previousValues?: Record<string, string | number | boolean>
}

export interface ListingAuditEntry {
  id: string
  timestamp: string
  operatorEmail: string
  action:
    | 'submitted'
    | 'review_started'
    | 'approved'
    | 'published'
    | 'changes_requested'
    | 'rejected'
    | 'unpublished'
    | 'republished'
    | 'note_added'
  summary: string
  notes?: string
  fromStatus?: ModerationLifecycleStatus
  toStatus?: ModerationLifecycleStatus
  previousStatus?: ModerationLifecycleStatus
  newStatus?: ModerationLifecycleStatus
}

export interface WorkspaceSpecificData {
  // Venues
  surfaceType?: string // e.g. "FIFA Pro 40mm Artificial Turf", "Synthetic Hard Court"
  floodlights?: boolean
  hourlyRateInr?: number
  facilities?: string[] // Parking, Shower, Dugouts, First Aid
  groundDimensions?: string
  // Academies
  ageGroups?: string // e.g. "U-9 to U-19"
  coachStudentRatio?: string // e.g. "1:12"
  admissionFeeInr?: number
  monthlyFeeInr?: number
  batchTimings?: string
  // Coaches
  experienceYears?: number
  qualifications?: string[] // "AFC A License", "NIS Diploma"
  hourlyRateCoachingInr?: number
  coachingSpecialization?: string
  // Trials
  trialStartDate?: string
  trialEndDate?: string
  reportingTime?: string
  ageCutoffDate?: string
  eligibilityCriteria?: string
  officialCircularUrl?: string
  selectionProcess?: string
  // Camps
  campDurationDays?: number
  isResidential?: boolean
  mealsIncluded?: boolean
  kitIncluded?: boolean
  // Scholarships & Combines
  scholarshipCoveragePct?: number // e.g. 100%
  selectionTestMetrics?: string[]
  // Pickup Games
  maxPlayers?: number
  currentPlayersCount?: number
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  gameSlotTime?: string
}

export interface AdminModerationListing {
  id: string
  referenceCode: string
  listingType: ModerationListingType
  title: string
  slug: string
  organizationName?: string
  tenantId?: string
  sport: string
  city: string
  state: string
  address: string
  sourceUrl?: string
  description: string
  status: ModerationLifecycleStatus
  isVerifiedTrustBadge: boolean
  priorityRank: number // 1 to 5
  submitterEmail: string
  submitterName: string
  submitterPhone: string
  version: number
  submittedAt: string
  lastAuditedAt: string
  assignedModerator?: string
  publishedAt?: string
  rejectionReason?: string
  correctionRequest?: string
  unpublishReason?: string
  moderatorNotes?: string
  workspaceData: WorkspaceSpecificData
  revisions: ListingRevisionHistory[]
  auditTrail: ListingAuditEntry[]
}

export const MODERATION_REJECTION_PRESETS = [
  { label: 'Missing Official HTTPS Link', text: 'Missing official HTTPS registration link or circular from the governing body.' },
  { label: 'Event Date Concluded', text: 'The stated event or trial date has already concluded. Please submit upcoming dates.' },
  { label: 'Duplicate Listing', text: 'This listing is already published in the active KhelGrid catalogue.' },
  { label: 'Incomplete Venue Address', text: 'Incomplete ground address. Locality, pin-code, and verified sports supported are required.' },
  { label: 'Unaccredited Credentials', text: 'Unverified coaching or academy accreditation. Recognized certification required.' },
  { label: 'Commercial Spam', text: 'Submission flagged as commercial advertisement, product promo, or non-sports content.' },
  { label: 'Age Verification Missing', text: 'Missing specific age cut-off or municipal eligibility rules for minor participants.' },
]

export const MODERATION_CORRECTION_PRESETS = [
  { label: 'Provide Official Federation Link', text: 'Please provide an official HTTPS registration link or federation circular to verify this trial.' },
  { label: 'Specify Age & Reporting Dates', text: 'Please specify the exact age cut-off criteria, reporting time, and schedule for participants.' },
  { label: 'Clarify Entry / Kit Fees', text: 'Please clarify whether there is any entry fee, kit deposit, or participation charge for this event.' },
  { label: 'Provide Full Street Address', text: 'Please provide the complete street address, nearest landmark, and map coordinates for this venue.' },
  { label: 'Upload Coaching Certificate', text: 'Please upload valid NIS diploma or federation coaching certificate front and back.' },
]

export const MODERATION_APPROVAL_PRESETS = [
  { label: 'Federation Circular Verified', text: 'Verified against official sports federation announcement and calendar.' },
  { label: 'Venue & Facilities Confirmed', text: 'Venue location, ground dimensions, and contact number verified.' },
  { label: 'Coaching Credentials Authenticated', text: 'Coaching certification and institute affiliation verified.' },
  { label: 'Legitimate Free Public Opportunity', text: 'Non-commercial grassroots sports trial authenticated.' },
]

export const STORAGE_MODERATION_KEY = 'khelgrid_admin_listings_moderation_v1'

export const SEED_MODERATION_LISTINGS: AdminModerationListing[] = [
  {
    id: 'kg-lst-101',
    referenceCode: 'KG-TRL-8821',
    listingType: 'trial',
    title: 'Delhi State U-17 Youth League Selection Trials 2026',
    slug: 'delhi-state-u17-youth-league-trials-2026',
    organizationName: 'Football Delhi (DSA)',
    tenantId: 'tenant-org-delhi-football',
    sport: 'Football',
    city: 'New Delhi',
    state: 'Delhi NCR',
    address: 'Ambedkar Stadium, Delhi Gate, New Delhi - 110002',
    sourceUrl: 'https://footballdelhi.com/circulars/u17-trials-2026',
    description: 'Official selection trials for the upcoming AIFF National Youth League Delhi State squad. Open to all registered Delhi domicile players born between 1 Jan 2010 and 31 Dec 2011.',
    status: 'pending_review',
    isVerifiedTrustBadge: true,
    priorityRank: 5,
    submitterEmail: 'technical.director@footballdelhi.com',
    submitterName: 'Sunil Dutt (Tech Director)',
    submitterPhone: '+91 98110 99882',
    version: 1,
    submittedAt: '2026-11-23T08:30:00Z',
    lastAuditedAt: '2026-11-23T08:30:00Z',
    workspaceData: {
      trialStartDate: '2026-12-15',
      trialEndDate: '2026-12-18',
      reportingTime: '07:30 AM',
      ageCutoffDate: '2010-01-01',
      eligibilityCriteria: 'Aadhaar Delhi Domicile + AIFF CRS registration UID + Municipal Birth Certificate',
      officialCircularUrl: 'https://footballdelhi.com/circulars/u17-trials-2026',
      selectionProcess: 'Phase 1: Physical fitness (Beep test & agility). Phase 2: 11v11 match assessment.',
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-11-23T08:30:00Z',
        changesSummary: 'Initial official trial announcement submitted.',
        submittedBy: 'technical.director@footballdelhi.com',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-1',
        timestamp: '2026-11-23T08:30:00Z',
        operatorEmail: 'technical.director@footballdelhi.com',
        action: 'submitted',
        summary: 'Trial submission lodged with official Football Delhi circular.',
        newStatus: 'pending_review',
      },
    ],
  },
  {
    id: 'kg-lst-102',
    referenceCode: 'KG-VEN-4190',
    listingType: 'venue',
    title: 'Bangalore Turf Arena & High Performance Ground',
    slug: 'bangalore-turf-arena-sarjapur',
    organizationName: 'Bangalore Turf Sports Pvt Ltd',
    tenantId: 'tenant-org-bangalore-turf',
    sport: 'Football',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Survey 44/2, Sarjapur Main Road, Carmelaram, Bengaluru - 560035',
    sourceUrl: 'https://bangaloreturfsports.in',
    description: 'Premier 7v7 and 11v11 artificial turf sports arena with FIFA 2-Star certified shockpad turf, Philips ArenaVision 400 Lux floodlights, player changing rooms, and spectator grandstand.',
    status: 'published',
    isVerifiedTrustBadge: true,
    priorityRank: 4,
    submitterEmail: 'operations@bangaloreturfsports.in',
    submitterName: 'Rohan Hegde (Manager)',
    submitterPhone: '+91 80 4912 8800',
    version: 2,
    submittedAt: '2026-10-10T11:00:00Z',
    lastAuditedAt: '2026-10-12T15:30:00Z',
    assignedModerator: 'lead.verifier@khelgrid.com',
    publishedAt: '2026-10-12T15:30:00Z',
    workspaceData: {
      surfaceType: 'FIFA Quality 40mm Monofilament Synthetic Turf with Eco-Infill',
      floodlights: true,
      hourlyRateInr: 1400,
      facilities: ['Dugouts', 'Player Showers', 'Filtered RO Water', 'Parking for 50 cars', 'First Aid Station'],
      groundDimensions: '65m x 45m (7v7 / 9v9)',
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-10-10T11:00:00Z',
        changesSummary: 'Initial venue submission.',
        submittedBy: 'operations@bangaloreturfsports.in',
      },
      {
        version: 2,
        submittedAt: '2026-10-12T12:00:00Z',
        changesSummary: 'Added FIFA lab test certificate and updated floodlight lux rating.',
        submittedBy: 'operations@bangaloreturfsports.in',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-2-1',
        timestamp: '2026-10-12T15:30:00Z',
        operatorEmail: 'lead.verifier@khelgrid.com',
        action: 'published',
        summary: 'BBMP Trade License and turf specs authenticated. Listing published to active catalogue.',
        previousStatus: 'under_review',
        newStatus: 'published',
      },
    ],
  },
  {
    id: 'kg-lst-103',
    referenceCode: 'KG-ACAD-3312',
    listingType: 'academy',
    title: 'Pullela Badminton Grassroots Development Centre',
    slug: 'pullela-badminton-grassroots-gachibowli',
    organizationName: 'Pullela Gopichand Badminton Foundation',
    tenantId: 'tenant-org-pullela-badminton',
    sport: 'Badminton',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'Survey No. 91, ISB Road, Gachibowli, Hyderabad - 500032',
    sourceUrl: 'https://pgba.in/grassroots',
    description: 'Full-time year-round badminton training batches for boys and girls aged 6 to 16. Led by BWF Level-2 certified coaches with 8 Yonex international synthetic courts.',
    status: 'published',
    isVerifiedTrustBadge: true,
    priorityRank: 5,
    submitterEmail: 'admissions@pgba.in',
    submitterName: 'Sujatha Rao',
    submitterPhone: '+91 40 2300 5500',
    version: 1,
    submittedAt: '2026-10-15T09:00:00Z',
    lastAuditedAt: '2026-10-16T14:00:00Z',
    assignedModerator: 'lead.verifier@khelgrid.com',
    publishedAt: '2026-10-16T14:00:00Z',
    workspaceData: {
      ageGroups: 'U-9, U-11, U-13, U-15',
      coachStudentRatio: '1:8',
      admissionFeeInr: 3000,
      monthlyFeeInr: 4500,
      batchTimings: 'Morning: 6:00 - 8:00 AM | Evening: 4:30 - 6:30 PM',
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-10-15T09:00:00Z',
        changesSummary: 'Academy registration lodged.',
        submittedBy: 'admissions@pgba.in',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-3-1',
        timestamp: '2026-10-16T14:00:00Z',
        operatorEmail: 'lead.verifier@khelgrid.com',
        action: 'published',
        summary: 'BAI affiliation authenticated. Published.',
        newStatus: 'published',
      },
    ],
  },
  {
    id: 'kg-lst-104',
    referenceCode: 'KG-COACH-9921',
    listingType: 'coach',
    title: 'Master Coach Vikramaditya Rao - Elite Cricket Fast Bowling & Batting',
    slug: 'coach-vikramaditya-rao-cricket-mumbai',
    organizationName: 'Shivaji Park Cricket Club',
    sport: 'Cricket',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Netaji Subhash Road, Shivaji Park, Dadar West, Mumbai - 400028',
    description: 'Former Ranji Trophy cricketer with 14 years coaching experience. BCCI NCA Level 2 accredited. Specializes in biomechanical fast bowling run-up corrections and video match analysis.',
    status: 'under_review',
    isVerifiedTrustBadge: false,
    priorityRank: 3,
    submitterEmail: 'vikram.cricket@gmail.com',
    submitterName: 'Vikramaditya Rao',
    submitterPhone: '+91 98210 99882',
    version: 1,
    submittedAt: '2026-11-22T14:00:00Z',
    lastAuditedAt: '2026-11-24T09:00:00Z',
    assignedModerator: 'mod.cricket@khelgrid.com',
    workspaceData: {
      experienceYears: 14,
      qualifications: ['BCCI NCA Level 2 Diploma', 'First Aid / CPR Certified'],
      hourlyRateCoachingInr: 1200,
      coachingSpecialization: 'Pace bowling biomechanics, video analysis, match tactics',
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-11-22T14:00:00Z',
        changesSummary: 'Coach profile submission.',
        submittedBy: 'vikram.cricket@gmail.com',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-4-1',
        timestamp: '2026-11-24T09:00:00Z',
        operatorEmail: 'mod.cricket@khelgrid.com',
        action: 'review_started',
        summary: 'Review started. Checking BCCI NCA expiry date.',
        newStatus: 'under_review',
      },
    ],
  },
  {
    id: 'kg-lst-105',
    referenceCode: 'KG-CMP-6610',
    listingType: 'camp',
    title: 'Winter High Altitude Endurance & Speed Athletics Camp 2026',
    slug: 'winter-high-altitude-endurance-camp-ooty',
    organizationName: 'Nilgiri Athletics Academy',
    sport: 'Athletics',
    city: 'Ooty',
    state: 'Tamil Nadu',
    address: 'HADF Stadium, Fingerpost, Udhagamandalam, Ooty - 643006',
    sourceUrl: 'https://nilgiriathletics.org/camps/winter-2026',
    description: '10-day intensive altitude training camp at 2,240m elevation for middle and long distance runners (800m, 1500m, 5000m). Conducted by NIS Patiala coach with recovery ice baths and physiotherapist support.',
    status: 'pending_review',
    isVerifiedTrustBadge: true,
    priorityRank: 4,
    submitterEmail: 'camps@nilgiriathletics.org',
    submitterName: 'Coach Ramanathan',
    submitterPhone: '+91 94430 11200',
    version: 1,
    submittedAt: '2026-11-23T16:00:00Z',
    lastAuditedAt: '2026-11-23T16:00:00Z',
    workspaceData: {
      campDurationDays: 10,
      isResidential: true,
      mealsIncluded: true,
      kitIncluded: true,
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-11-23T16:00:00Z',
        changesSummary: 'Camp announcement created.',
        submittedBy: 'camps@nilgiriathletics.org',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-5-1',
        timestamp: '2026-11-23T16:00:00Z',
        operatorEmail: 'camps@nilgiriathletics.org',
        action: 'submitted',
        summary: 'Camp prospectus uploaded.',
        newStatus: 'pending_review',
      },
    ],
  },
  {
    id: 'kg-lst-106',
    referenceCode: 'KG-SCH-2291',
    listingType: 'scholarship',
    title: 'Reliance Foundation Youth Sports (RFYS) Grassroots Football Scholarship 2026-27',
    slug: 'rfys-grassroots-football-scholarship-2026',
    organizationName: 'Reliance Foundation Youth Sports',
    sport: 'Football',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Jio Institute Sports Complex, Ulwe, Navi Mumbai - 410206',
    sourceUrl: 'https://rfyouthsports.com/scholarships',
    description: '100% fully funded residential scholarship covering academic education, elite sports coaching, room & board, sports science nutrition, and foreign exposure tours for top 30 selected athletes across India.',
    status: 'published',
    isVerifiedTrustBadge: true,
    priorityRank: 5,
    submitterEmail: 'scholarships@rfyouthsports.com',
    submitterName: 'Aditi Deshmukh',
    submitterPhone: '+91 22 4966 8000',
    version: 1,
    submittedAt: '2026-10-01T10:00:00Z',
    lastAuditedAt: '2026-10-03T11:00:00Z',
    publishedAt: '2026-10-03T11:00:00Z',
    workspaceData: {
      scholarshipCoveragePct: 100,
      selectionTestMetrics: ['Beep Test Level 12.5+', '30m Sprint < 4.1s', 'Tactical IQ Game Assessment'],
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-10-01T10:00:00Z',
        changesSummary: 'Scholarship program announcement.',
        submittedBy: 'scholarships@rfyouthsports.com',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-6-1',
        timestamp: '2026-10-03T11:00:00Z',
        operatorEmail: 'lead.verifier@khelgrid.com',
        action: 'published',
        summary: 'Official foundation scholarship verified and approved for nationwide broadcast.',
        newStatus: 'published',
      },
    ],
  },
  {
    id: 'kg-lst-107',
    referenceCode: 'KG-PKP-1049',
    listingType: 'pickup_game',
    title: 'Saturday Evening Casual 6v6 Football Match @ Powerplay Turf',
    slug: 'saturday-casual-6v6-football-powerplay-whitefield',
    organizationName: 'Whitefield Weekend Footballers',
    sport: 'Football',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Powerplay Sports Arena, ITPL Main Road, Whitefield, Bengaluru - 560066',
    description: 'Friendly casual game. Cleats or turf shoes allowed. Bibs and match balls provided. Split cost of turf among all players (approx INR 150 each). Strict zero toxicity rule.',
    status: 'published',
    isVerifiedTrustBadge: false,
    priorityRank: 2,
    submitterEmail: 'karthik.footballer@gmail.com',
    submitterName: 'Karthik Natarajan',
    submitterPhone: '+91 99800 44102',
    version: 1,
    submittedAt: '2026-11-20T18:00:00Z',
    lastAuditedAt: '2026-11-21T09:00:00Z',
    publishedAt: '2026-11-21T09:00:00Z',
    workspaceData: {
      maxPlayers: 12,
      currentPlayersCount: 8,
      skillLevel: 'Intermediate',
      gameSlotTime: 'Saturday 7:00 PM - 8:30 PM',
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-11-20T18:00:00Z',
        changesSummary: 'Casual match posted.',
        submittedBy: 'karthik.footballer@gmail.com',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-7-1',
        timestamp: '2026-11-21T09:00:00Z',
        operatorEmail: 'mod.community@khelgrid.com',
        action: 'published',
        summary: 'Community turf game verified against Powerplay arena schedule.',
        newStatus: 'published',
      },
    ],
  },
  {
    id: 'kg-lst-108',
    referenceCode: 'KG-TRL-1902',
    listingType: 'trial',
    title: 'Punjab State Junior Boxing Trials & Talent Search 2026',
    slug: 'punjab-state-junior-boxing-trials-2026',
    organizationName: 'Punjab Boxing Association (PBA)',
    sport: 'Boxing',
    city: 'Patiala',
    state: 'Punjab',
    address: 'Multipurpose Gymnasium, Polo Ground, Patiala - 147001',
    description: 'State trials for selection of Punjab squad for 2026 National Junior Boxing Championship. Weight categories: 46kg to 80+kg for boys and girls.',
    status: 'changes_requested',
    isVerifiedTrustBadge: true,
    priorityRank: 4,
    correctionRequest: 'Please specify the exact medical checkup time and mandatory anti-doping declaration requirement from PBA circular.',
    submitterEmail: 'pba.tournaments@gmail.com',
    submitterName: 'Harminder Singh (Secretary)',
    submitterPhone: '+91 175 221 4400',
    version: 1,
    submittedAt: '2026-11-19T10:00:00Z',
    lastAuditedAt: '2026-11-20T16:00:00Z',
    assignedModerator: 'mod.combat@khelgrid.com',
    workspaceData: {
      trialStartDate: '2026-12-20',
      trialEndDate: '2026-12-22',
      reportingTime: '08:00 AM',
      ageCutoffDate: '2009-01-01',
      eligibilityCriteria: 'Birth certificate + Medical fitness certificate signed by Civil Surgeon',
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-11-19T10:00:00Z',
        changesSummary: 'Initial trial listing.',
        submittedBy: 'pba.tournaments@gmail.com',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-8-1',
        timestamp: '2026-11-20T16:00:00Z',
        operatorEmail: 'mod.combat@khelgrid.com',
        action: 'changes_requested',
        summary: 'Clarification requested regarding medical checkup procedures.',
        previousStatus: 'under_review',
        newStatus: 'changes_requested',
      },
    ],
  },
  {
    id: 'kg-lst-109',
    referenceCode: 'KG-VEN-9011',
    listingType: 'venue',
    title: 'Kolkata Padel Club & Box Cricket Arena',
    slug: 'kolkata-padel-club-rajarhat',
    organizationName: 'Bengal Racket Sports Club',
    sport: 'Pickleball / Padel',
    city: 'Kolkata',
    state: 'West Bengal',
    address: 'Plot II-B, Action Area 2, New Town Rajarhat, Kolkata - 700156',
    description: '3 panoramic padel courts with panoramic glass and Mondo Supercourt XN turf. Night play with LED floodlights.',
    status: 'pending_review',
    isVerifiedTrustBadge: false,
    priorityRank: 3,
    submitterEmail: 'bookings@kolkatapadel.in',
    submitterName: 'Anirban Mukherjee',
    submitterPhone: '+91 98300 88123',
    version: 1,
    submittedAt: '2026-11-24T06:00:00Z',
    lastAuditedAt: '2026-11-24T06:00:00Z',
    workspaceData: {
      surfaceType: 'Mondo Supercourt XN Textured Monofilament',
      floodlights: true,
      hourlyRateInr: 1600,
      facilities: ['Equipment Rental', 'Cafe', 'Air-conditioned Lounge', 'Parking'],
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-11-24T06:00:00Z',
        changesSummary: 'Venue listing submission.',
        submittedBy: 'bookings@kolkatapadel.in',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-9-1',
        timestamp: '2026-11-24T06:00:00Z',
        operatorEmail: 'bookings@kolkatapadel.in',
        action: 'submitted',
        summary: 'New venue registration received.',
        newStatus: 'pending_review',
      },
    ],
  },
  {
    id: 'kg-lst-110',
    referenceCode: 'KG-SPM-0019',
    listingType: 'other',
    title: 'Guaranteed 100% Cricket Betting Tips & Match Fixing Telegram Group',
    slug: 'guaranteed-cricket-tips-telegram',
    sport: 'Cricket',
    city: 'New Delhi',
    state: 'Delhi NCR',
    address: 'Online Telegram Channel',
    description: 'Join our VIP channel for guaranteed match fixing tips, session bets, and sure jackpot calls for IPL and Big Bash.',
    status: 'rejected',
    isVerifiedTrustBadge: false,
    priorityRank: 1,
    rejectionReason: 'Flagged as illegal gambling / commercial betting promotion. Severe breach of KhelGrid Trust & Safety Policy. User flagged.',
    submitterEmail: 'bettingtips99@protonmail.com',
    submitterName: 'Anonymous Tipper',
    submitterPhone: '+91 99999 11111',
    version: 1,
    submittedAt: '2026-11-18T12:00:00Z',
    lastAuditedAt: '2026-11-18T12:15:00Z',
    assignedModerator: 'lead.verifier@khelgrid.com',
    workspaceData: {},
    revisions: [
      {
        version: 1,
        submittedAt: '2026-11-18T12:00:00Z',
        changesSummary: 'Spam submission.',
        submittedBy: 'bettingtips99@protonmail.com',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-10-1',
        timestamp: '2026-11-18T12:15:00Z',
        operatorEmail: 'lead.verifier@khelgrid.com',
        action: 'rejected',
        summary: 'Immediate rejection for sports gambling promotion.',
        previousStatus: 'pending_review',
        newStatus: 'rejected',
      },
    ],
  },
  {
    id: 'kg-lst-111',
    referenceCode: 'KG-VEN-5501',
    listingType: 'venue',
    title: 'Old Shivaji Park Football Ground - Pitch 4',
    slug: 'old-shivaji-park-pitch-4',
    organizationName: 'Shivaji Park Sports Union',
    sport: 'Football',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Shivaji Park, Dadar, Mumbai - 400028',
    description: 'Natural mud pitch available for seasonal club matches and youth leagues.',
    status: 'unpublished',
    isVerifiedTrustBadge: false,
    priorityRank: 2,
    unpublishReason: 'Venue temporarily closed for annual monsoon pitch re-laying and drainage upgrade by BMC until Jan 2027.',
    submitterEmail: 'ground.manager@shivajipark.org',
    submitterName: 'Ramesh Patil',
    submitterPhone: '+91 22 2444 9911',
    version: 2,
    submittedAt: '2026-08-15T10:00:00Z',
    lastAuditedAt: '2026-11-01T10:00:00Z',
    assignedModerator: 'mod.venues@khelgrid.com',
    workspaceData: {
      surfaceType: 'Natural Red Clay Turf',
      floodlights: false,
      hourlyRateInr: 800,
    },
    revisions: [
      {
        version: 1,
        submittedAt: '2026-08-15T10:00:00Z',
        changesSummary: 'Initial venue publish.',
        submittedBy: 'ground.manager@shivajipark.org',
      },
    ],
    auditTrail: [
      {
        id: 'aud-lst-11-1',
        timestamp: '2026-11-01T10:00:00Z',
        operatorEmail: 'mod.venues@khelgrid.com',
        action: 'unpublished',
        summary: 'Temporarily suspended due to annual municipal maintenance work.',
        previousStatus: 'published',
        newStatus: 'unpublished',
      },
    ],
  },
]

function readStoredListings(): AdminModerationListing[] {
  if (typeof window === 'undefined') return SEED_MODERATION_LISTINGS
  try {
    const raw = localStorage.getItem(STORAGE_MODERATION_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_MODERATION_KEY, JSON.stringify(SEED_MODERATION_LISTINGS))
      return SEED_MODERATION_LISTINGS
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
    return SEED_MODERATION_LISTINGS
  } catch (err) {
    console.warn('[adminModerationService] Failed reading stored moderation listings, fallback to seed', err)
    return SEED_MODERATION_LISTINGS
  }
}

function writeStoredListings(items: AdminModerationListing[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_MODERATION_KEY, JSON.stringify(items))
  } catch (err) {
    console.warn('[adminModerationService] Failed writing stored moderation listings', err)
  }
}

export function getAdminModerationListings(): AdminModerationListing[] {
  return readStoredListings()
}

export function getAdminModerationListingDetails(id: string): AdminModerationListing | null {
  const all = readStoredListings()
  return all.find(item => item.id === id || item.referenceCode === id) ?? null
}

export function startReviewListing(
  id: string,
  operatorEmail: string
): AdminModerationListing {
  const all = readStoredListings()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Listing with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: ListingAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    operatorEmail,
    action: 'review_started',
    summary: 'Moderator assigned review ticket and locked record.',
    fromStatus: existing.status,
    toStatus: 'under_review',
  }

  const updated: AdminModerationListing = {
    ...existing,
    status: 'under_review',
    assignedModerator: operatorEmail,
    lastAuditedAt: now,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredListings(all)
  return updated
}

export function approveAndPublishListing(
  id: string,
  operatorEmail: string,
  options?: {
    notes?: string
    isVerifiedTrustBadge?: boolean
    priorityRank?: number
  }
): AdminModerationListing {
  const all = readStoredListings()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Listing with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: ListingAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    operatorEmail,
    action: 'published',
    summary: 'Listing approved and published to active KhelGrid catalogue.',
    notes: options?.notes ?? 'All standards and verification requirements satisfied.',
    fromStatus: existing.status,
    toStatus: 'published',
  }

  const updated: AdminModerationListing = {
    ...existing,
    status: 'published',
    publishedAt: now,
    lastAuditedAt: now,
    assignedModerator: operatorEmail,
    moderatorNotes: options?.notes ?? existing.moderatorNotes,
    isVerifiedTrustBadge: options?.isVerifiedTrustBadge ?? existing.isVerifiedTrustBadge,
    priorityRank: options?.priorityRank ?? existing.priorityRank,
    rejectionReason: undefined,
    correctionRequest: undefined,
    unpublishReason: undefined,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredListings(all)
  return updated
}

export function requestListingRevision(
  id: string,
  operatorEmail: string,
  notes: string
): AdminModerationListing {
  const all = readStoredListings()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Listing with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: ListingAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    operatorEmail,
    action: 'changes_requested',
    summary: 'Corrections / Revision requested from submitter.',
    notes,
    fromStatus: existing.status,
    toStatus: 'changes_requested',
  }

  const updated: AdminModerationListing = {
    ...existing,
    status: 'changes_requested',
    correctionRequest: notes,
    lastAuditedAt: now,
    assignedModerator: operatorEmail,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredListings(all)
  return updated
}

export function rejectListing(
  id: string,
  operatorEmail: string,
  reason: string
): AdminModerationListing {
  const all = readStoredListings()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Listing with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: ListingAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    operatorEmail,
    action: 'rejected',
    summary: 'Submission rejected by moderation desk.',
    notes: reason,
    fromStatus: existing.status,
    toStatus: 'rejected',
  }

  const updated: AdminModerationListing = {
    ...existing,
    status: 'rejected',
    rejectionReason: reason,
    lastAuditedAt: now,
    assignedModerator: operatorEmail,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredListings(all)
  return updated
}

export function unpublishListing(
  id: string,
  operatorEmail: string,
  reason: string
): AdminModerationListing {
  const all = readStoredListings()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Listing with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: ListingAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    operatorEmail,
    action: 'unpublished',
    summary: 'Listing withdrawn from public catalogue.',
    notes: reason,
    fromStatus: existing.status,
    toStatus: 'unpublished',
  }

  const updated: AdminModerationListing = {
    ...existing,
    status: 'unpublished',
    unpublishReason: reason,
    lastAuditedAt: now,
    assignedModerator: operatorEmail,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredListings(all)
  return updated
}

export function republishListing(
  id: string,
  operatorEmail: string
): AdminModerationListing {
  const all = readStoredListings()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Listing with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: ListingAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    operatorEmail,
    action: 'republished',
    summary: 'Listing reinstated and republished to catalogue.',
    fromStatus: existing.status,
    toStatus: 'published',
  }

  const updated: AdminModerationListing = {
    ...existing,
    status: 'published',
    unpublishReason: undefined,
    publishedAt: now,
    lastAuditedAt: now,
    assignedModerator: operatorEmail,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredListings(all)
  return updated
}

export function addModerationNote(
  id: string,
  operatorEmail: string,
  note: string
): AdminModerationListing {
  const all = readStoredListings()
  const idx = all.findIndex(item => item.id === id)
  if (idx === -1) {
    throw new Error(`Listing with id "${id}" not found.`)
  }

  const existing = all[idx]
  const now = new Date().toISOString()

  const newAudit: ListingAuditEntry = {
    id: `aud-${Date.now()}`,
    timestamp: now,
    operatorEmail,
    action: 'note_added',
    summary: 'Administrative audit observation recorded.',
    notes: note,
  }

  const updated: AdminModerationListing = {
    ...existing,
    lastAuditedAt: now,
    auditTrail: [newAudit, ...existing.auditTrail],
  }

  all[idx] = updated
  writeStoredListings(all)
  return updated
}

export function exportListingsToCsv(items: AdminModerationListing[]): string {
  const headers = [
    'Reference Code',
    'Category',
    'Title',
    'Organization',
    'Sport',
    'City',
    'State',
    'Status',
    'Verified Trust Badge',
    'Priority Rank',
    'Submitter Name',
    'Submitter Email',
    'Submitter Phone',
    'Submitted At',
    'Assigned Moderator',
    'Published At',
  ]

  const rows = items.map(item => [
    item.referenceCode,
    item.listingType,
    item.title,
    item.organizationName ?? 'Direct Individual',
    item.sport,
    item.city,
    item.state,
    item.status,
    item.isVerifiedTrustBadge ? 'Yes' : 'No',
    String(item.priorityRank),
    item.submitterName,
    item.submitterEmail,
    item.submitterPhone,
    item.submittedAt,
    item.assignedModerator ?? 'Unassigned',
    item.publishedAt ?? '',
  ])

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

export function resetAdminListingsForTesting(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_MODERATION_KEY)
  }
}
