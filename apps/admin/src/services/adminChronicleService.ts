/**
 * KhelChronicle Research Editorial & Peer-Review Desk Service
 * 
 * Provides end-to-end academic editorial lifecycle governance:
 * - Two-tier pre-moderation screening (automated + human editor)
 * - Automated file readability, plagiarism detection, and AI disclosure auditing
 * - Institutional Ethics Committee (IEC/IRB) and minor consent verification
 * - Double-blind and single-blind reviewer pool assignment & tracking
 * - Structured review scorecards (Methodology, Originality, Rigour, Clarity)
 * - Revision cycles with author point-by-point rebuttal inspection
 * - Persistent Crossref DOI minting (10.5555/khelchronicle.YYYY.NNN)
 * - Creative Commons open-access licensing & XML/PDF galley issuance
 * - RFC 4180 CSV export for institutional reporting and indexation
 */

export type EditorialManuscriptStatus =
  | 'pending_screening'
  | 'under_screening'
  | 'screening_revision'
  | 'in_peer_review'
  | 'revision_requested'
  | 'revision_submitted'
  | 'accepted'
  | 'published'
  | 'rejected'
  | 'withdrawn'

export type ResearchDomain =
  | 'biomechanics'
  | 'exercise_physiology'
  | 'sports_medicine'
  | 'talent_identification'
  | 'sports_psychology'
  | 'sports_analytics'
  | 'sports_nutrition'

export type ArticleType =
  | 'original_research'
  | 'systematic_review'
  | 'methodological_protocol'
  | 'case_study'
  | 'short_communication'

export type ReviewerInvitationStatus =
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'review_submitted'
  | 'overdue'

export type PlagiarismRiskLevel = 'clean' | 'moderate' | 'high_risk'

export type OpenAccessLicenseType = 'CC-BY-4.0' | 'CC-BY-NC-ND-4.0'

export interface ResearchAuthorEntry {
  name: string
  email: string
  affiliation: string
  orcid?: string
  isCorresponding: boolean
}

export interface ScreeningAutomatedChecks {
  plagiarismSimilarityPercent: number
  plagiarismRisk: PlagiarismRiskLevel
  wordCount: number
  hasPdfGalley: boolean
  aiDisclosureDeclared: boolean
  aiToolsUsed?: string
  ethicsClearanceNumber: string
  minorConsentConfirmed: boolean
  dataAvailabilityStatement: string
  fundingStatement: string
  conflictOfInterestStatement: string
}

export interface AssignedReviewer {
  id: string
  reviewerName: string
  institution: string
  orcid: string
  domain: ResearchDomain
  invitationStatus: ReviewerInvitationStatus
  assignedAt: string
  dueDate: string
  submittedAt?: string
  blindMode: 'double_blind' | 'single_blind'
  recommendation?: 'accept' | 'minor_revision' | 'major_revision' | 'reject'
  scores?: {
    methodology: number // 1-5
    originality: number // 1-5
    dataRigour: number // 1-5
    clarity: number // 1-5
  }
  confidentialCommentsToEditor?: string
  commentsForAuthor?: string
}

export interface ManuscriptVersion {
  versionNumber: string
  submittedAt: string
  fileUrl: string
  fileSize: string
  rebuttalLetter?: string
  changesSummary?: string
}

export interface PublishingMetadata {
  doi?: string
  accessionNumber?: string
  slug: string
  publishedAt?: string
  license: OpenAccessLicenseType
  openAccessVerified: boolean
  crossrefDepositStatus: 'unregistered' | 'queued' | 'minted' | 'failed'
  xmlGalleyUrl?: string
  pdfGalleyUrl?: string
  viewsCount: number
  downloadsCount: number
  citationsCount: number
}

export interface EditorialAuditEntry {
  id: string
  timestamp: string
  editorName: string
  editorEmail: string
  action: string
  fromStatus?: EditorialManuscriptStatus
  toStatus?: EditorialManuscriptStatus
  previousStatus?: EditorialManuscriptStatus
  newStatus?: EditorialManuscriptStatus
  notes: string
}

export interface ChronicleManuscriptRecord {
  id: string
  accessionNumber: string
  title: string
  abstractText: string
  keywords: string[]
  domain: ResearchDomain
  articleType: ArticleType
  status: EditorialManuscriptStatus
  submittedAt: string
  updatedAt: string
  assignedEditor?: {
    name: string
    email: string
    assignedAt: string
  }
  authors: ResearchAuthorEntry[]
  screening: ScreeningAutomatedChecks
  reviewers: AssignedReviewer[]
  versions: ManuscriptVersion[]
  currentVersion: string
  publishing: PublishingMetadata
  auditTrail: EditorialAuditEntry[]
  internalNotes: string[]
}

export interface EditorialFilterOptions {
  search?: string
  status?: EditorialManuscriptStatus | 'all'
  domain?: ResearchDomain | 'all'
  articleType?: ArticleType | 'all'
  plagiarismRisk?: PlagiarismRiskLevel | 'all'
}

export interface EditorialMicroKpiMetrics {
  totalSubmissions: number
  pendingScreening: number
  inPeerReview: number
  revisionsActive: number
  acceptedReadyToPublish: number
  publishedOpenAccess: number
  avgReviewTurnaroundDays: number
  crossrefDoisMinted: number
}

export interface ReviewerPoolMember {
  id: string
  name: string
  email: string
  institution: string
  orcid: string
  domains: ResearchDomain[]
  activeAssignments: number
  completedReviews: number
  avgTurnaroundDays: number
}

// ---------------------------------------------------------------------------
// Pre-Approved Sports Science Reviewers Pool
// ---------------------------------------------------------------------------
export const PRE_APPROVED_REVIEWERS_POOL: ReviewerPoolMember[] = [
  {
    id: 'rev-01',
    name: 'Dr. Anandita Sen',
    email: 'a.sen@iitb.ac.in',
    institution: 'Indian Institute of Technology Bombay (Biomedical Eng)',
    orcid: '0000-0002-1845-9201',
    domains: ['biomechanics', 'sports_analytics'],
    activeAssignments: 1,
    completedReviews: 14,
    avgTurnaroundDays: 4.5,
  },
  {
    id: 'rev-02',
    name: 'Dr. Vikramaditya Rathore',
    email: 'v.rathore@sainis.gov.in',
    institution: 'Netaji Subhas National Institute of Sports (SAI NS NIS Patiala)',
    orcid: '0000-0001-9234-8842',
    domains: ['exercise_physiology', 'talent_identification'],
    activeAssignments: 2,
    completedReviews: 22,
    avgTurnaroundDays: 3.8,
  },
  {
    id: 'rev-03',
    name: 'Dr. Priya Nair, MD',
    email: 'priya.nair@aiims.edu',
    institution: 'All India Institute of Medical Sciences (AIIMS Sports Medicine)',
    orcid: '0000-0003-4412-1090',
    domains: ['sports_medicine', 'exercise_physiology'],
    activeAssignments: 0,
    completedReviews: 18,
    avgTurnaroundDays: 5.1,
  },
  {
    id: 'rev-04',
    name: 'Prof. K. Ramanathan',
    email: 'k.raman@iitm.ac.in',
    institution: 'Center of Excellence in Sports Science, IIT Madras',
    orcid: '0000-0002-7719-3305',
    domains: ['sports_analytics', 'biomechanics'],
    activeAssignments: 1,
    completedReviews: 11,
    avgTurnaroundDays: 4.0,
  },
  {
    id: 'rev-05',
    name: 'Dr. Sunita Deshmukh',
    email: 's.deshmukh@manipal.edu',
    institution: 'Manipal College of Health Professions (Physiotherapy)',
    orcid: '0000-0001-5028-7619',
    domains: ['sports_medicine', 'biomechanics'],
    activeAssignments: 0,
    completedReviews: 9,
    avgTurnaroundDays: 4.8,
  },
  {
    id: 'rev-06',
    name: 'Dr. Tenzing Norbu',
    email: 't.norbu@ymca.edu.in',
    institution: 'YMCA College of Physical Education, Chennai',
    orcid: '0000-0003-8812-4017',
    domains: ['talent_identification', 'sports_psychology'],
    activeAssignments: 1,
    completedReviews: 15,
    avgTurnaroundDays: 5.4,
  },
]

// ---------------------------------------------------------------------------
// Standard Decision & Feedback Presets
// ---------------------------------------------------------------------------
export const SCREENING_REVISION_PRESETS = [
  {
    id: 'missing-iec',
    title: 'Missing Institutional Ethics Approval',
    notes: 'The manuscript tests human athletes but lacks an explicit Institutional Ethics Committee (IEC/IRB) approval protocol number. Please provide the institutional ethical clearance documentation.',
  },
  {
    id: 'minor-parental-consent',
    title: 'Minor Participant Consent Omission',
    notes: 'Research involves youth athletes under 18 years of age. A signed parental/guardian informed assent protocol must be explicitly affirmed in the Methods section.',
  },
  {
    id: 'unclear-data-availability',
    title: 'Inadequate Data Availability Statement',
    notes: 'In accordance with KhelChronicle Open Science guidelines, primary de-identified kinematic/physiological datasets must be deposited in Zenodo/Figshare or made available upon reasonable request with repository links.',
  },
  {
    id: 'ai-disclosure-required',
    title: 'AI Drafting or Coding Disclosure Missing',
    notes: 'Automated screening detected synthetic phrasing or algorithmic assistance. Please declare the specific generative AI tools used and their methodological scope.',
  },
]

export const PEER_REVIEW_DECISION_PRESETS = [
  {
    id: 'minor-revisions-recommended',
    title: 'Minor Revisions - Statistical Clarification & Reference Normalization',
    recommendation: 'minor_revision' as const,
    notes: 'Reviewers recommend acceptance contingent upon minor clarifications: please provide 95% confidence intervals for kinematic parameters and address reviewer notes in Table 2.',
  },
  {
    id: 'major-revisions-recommended',
    title: 'Major Revisions - Sample Size Power & Biomechanical Validation',
    recommendation: 'major_revision' as const,
    notes: 'Reviewers identify valuable empirical data but request a post-hoc statistical power analysis, expanded discussion on testing surface variations, and point-by-point rebuttal.',
  },
  {
    id: 'accept-for-doi-minting',
    title: 'Accepted - Scholarly Merits Fully Satisfied',
    recommendation: 'accept' as const,
    notes: 'Both peer referees have confirmed all methodological criteria are satisfied. Manuscript is recommended to Editor-in-Chief for DOI assignment and Open Access archiving.',
  },
  {
    id: 'reject-unresolved-methodology',
    title: 'Reject - Fundamental Methodological Limitations',
    recommendation: 'reject' as const,
    notes: 'The manuscript exhibits confounding measurement artifacts and insufficient test-retest reliability across participant cohorts that preclude publication in KhelChronicle.',
  },
]

// ---------------------------------------------------------------------------
// Authentic Seed Research Manuscripts
// ---------------------------------------------------------------------------
const SEED_MANUSCRIPTS: ChronicleManuscriptRecord[] = [
  {
    id: 'manuscript-kc-001',
    accessionNumber: 'KG-2026-CH-042',
    title: 'Kinematic Determinants of Ball Release Speed and Lumbar Spine Load in Elite Indian U-19 Pace Bowlers',
    abstractText:
      'Fast bowling in cricket imposes extreme asymmetrical ground reaction forces exceeding 8x body weight. This investigation utilized high-speed 3D motion capture (250 Hz) and dual strain-gauge force plates at the SAI National Centre of Excellence to quantify shoulder counter-rotation, front-knee flexion angles, and peak lumbar spinal compression across 24 elite junior pacers. Results demonstrate front knee bracing (>165° at release) correlates positively with release velocity (r = 0.74, p < 0.001) while excessive counter-rotation (>32°) exponentially increases pars interarticularis stress.',
    keywords: ['Cricket', 'Biomechanics', 'Fast Bowling', 'Lumbar Spine Stress', 'Kinematics', 'SAI NCOE'],
    domain: 'biomechanics',
    articleType: 'original_research',
    status: 'published',
    submittedAt: '2026-10-12T10:30:00Z',
    updatedAt: '2026-11-20T16:45:00Z',
    assignedEditor: {
      name: 'Dr. Anandita Sen',
      email: 'a.sen@iitb.ac.in',
      assignedAt: '2026-10-13T09:00:00Z',
    },
    authors: [
      {
        name: 'Devraj Mukhopadhyay',
        email: 'd.mukhopadhyay@iitm.ac.in',
        affiliation: 'Center of Excellence in Sports Science, IIT Madras',
        orcid: '0000-0002-3901-4410',
        isCorresponding: true,
      },
      {
        name: 'Dr. R. K. Bhattacharya',
        email: 'bhattacharya.sportsmed@bcci.tv',
        affiliation: 'National Cricket Academy (NCA), Bengaluru',
        orcid: '0000-0001-8841-2093',
        isCorresponding: false,
      },
    ],
    screening: {
      plagiarismSimilarityPercent: 3.8,
      plagiarismRisk: 'clean',
      wordCount: 5840,
      hasPdfGalley: true,
      aiDisclosureDeclared: true,
      aiToolsUsed: 'Claude 3.5 Sonnet for LaTeX table formatting and grammar check only; analysis in Python/SciPy',
      ethicsClearanceNumber: 'IEC/IITM/HREC/2026/089',
      minorConsentConfirmed: true,
      dataAvailabilityStatement: 'De-identified 3D kinematic c3d files available on Zenodo DOI: 10.5281/zenodo.10842201',
      fundingStatement: 'Supported by Sports Authority of India Khelo India High-Performance Research Grant #KI-HPRG-2025-14',
      conflictOfInterestStatement: 'Authors declare no financial or personal conflicts of interest.',
    },
    reviewers: [
      {
        id: 'rev-01',
        reviewerName: 'Dr. Anandita Sen',
        institution: 'IIT Bombay',
        orcid: '0000-0002-1845-9201',
        domain: 'biomechanics',
        invitationStatus: 'review_submitted',
        assignedAt: '2026-10-14T11:00:00Z',
        dueDate: '2026-10-24T18:00:00Z',
        submittedAt: '2026-10-22T14:15:00Z',
        blindMode: 'double_blind',
        recommendation: 'accept',
        scores: {
          methodology: 5,
          originality: 5,
          dataRigour: 5,
          clarity: 4,
        },
        confidentialCommentsToEditor: 'Outstanding rigorous study with high direct relevance to injury mitigation in Indian cricket.',
        commentsForAuthor: 'Excellent biomechanical methodology. Consider adding standard deviation in Table 3 for front-foot braking impulse.',
      },
      {
        id: 'rev-04',
        reviewerName: 'Prof. K. Ramanathan',
        institution: 'IIT Madras',
        orcid: '0000-0002-7719-3305',
        domain: 'sports_analytics',
        invitationStatus: 'review_submitted',
        assignedAt: '2026-10-14T11:00:00Z',
        dueDate: '2026-10-24T18:00:00Z',
        submittedAt: '2026-10-23T16:30:00Z',
        blindMode: 'double_blind',
        recommendation: 'accept',
        scores: {
          methodology: 4,
          originality: 5,
          dataRigour: 5,
          clarity: 5,
        },
        confidentialCommentsToEditor: 'Methods are solid. Data repository verified on Zenodo.',
        commentsForAuthor: 'Very well structured paper. Ready for public deposition.',
      },
    ],
    versions: [
      {
        versionNumber: 'v1.0',
        submittedAt: '2026-10-12T10:30:00Z',
        fileUrl: '/khelchronicle/papers/kg-2026-ch-042-v1.pdf',
        fileSize: '3.4 MB',
      },
    ],
    currentVersion: 'v1.0',
    publishing: {
      doi: '10.5555/khelchronicle.2026.042',
      accessionNumber: 'KG-2026-CH-042',
      slug: 'kinematics-fast-bowling-lumbar-spine-load-indian-u19',
      publishedAt: '2026-11-20T16:45:00Z',
      license: 'CC-BY-4.0',
      openAccessVerified: true,
      crossrefDepositStatus: 'minted',
      xmlGalleyUrl: '/khelchronicle/galleys/kg-2026-ch-042.xml',
      pdfGalleyUrl: '/khelchronicle/papers/kg-2026-ch-042-v1.pdf',
      viewsCount: 1420,
      downloadsCount: 388,
      citationsCount: 6,
    },
    auditTrail: [
      {
        id: 'aud-kc-01',
        timestamp: '2026-10-12T10:30:00Z',
        editorName: 'System Gate',
        editorEmail: 'gate@khelgrid.com',
        action: 'Deposit Intake & Automated Screening',
        fromStatus: 'pending_screening',
        toStatus: 'under_screening',
        notes: 'Deposit received. Automated text extraction, plagiarism scan (3.8%), and ethics validation passed.',
      },
      {
        id: 'aud-kc-02',
        timestamp: '2026-10-14T11:00:00Z',
        editorName: 'Dr. Anandita Sen',
        editorEmail: 'a.sen@iitb.ac.in',
        action: 'Assigned Double-Blind Reviewers',
        fromStatus: 'under_screening',
        toStatus: 'in_peer_review',
        notes: 'Screening approved. Assigned 2 reviewers with masked author identities.',
      },
      {
        id: 'aud-kc-03',
        timestamp: '2026-11-18T10:00:00Z',
        editorName: 'Dr. Anandita Sen',
        editorEmail: 'a.sen@iitb.ac.in',
        action: 'Editorial Acceptance',
        fromStatus: 'in_peer_review',
        toStatus: 'accepted',
        notes: 'Both referee reports received with Accept recommendation.',
      },
      {
        id: 'aud-kc-04',
        timestamp: '2026-11-20T16:45:00Z',
        editorName: 'Editor-in-Chief Office',
        editorEmail: 'editor@khelgrid.com',
        action: 'Minted DOI & Published Open Access',
        fromStatus: 'accepted',
        toStatus: 'published',
        notes: 'Crossref DOI 10.5555/khelchronicle.2026.042 minted. Published under CC-BY-4.0 license.',
      },
    ],
    internalNotes: [
      'Approved for inclusion in upcoming KhelChronicle Biomechanics thematic collection.',
    ],
  },
  {
    id: 'manuscript-kc-002',
    accessionNumber: 'KG-2026-CH-043',
    title: 'Relative Age Effect and Somatotype Variation in Khelo India Youth Games Combat Sport Selections',
    abstractText:
      'The Relative Age Effect (RAE) creates systematic participation and selection biases favouring early-born athletes in adolescent competitive sport. This cross-sectional study examined birth quarter distributions and Heath-Carter somatotyping across 412 state-level wrestlers, judokas, and boxers competing at the Khelo India Youth Games. Findings revealed pronounced Q1 birth quartile skew (41.2% in wrestling, p < 0.001) that dissipates in senior categories, indicating premature deselecting of biologically younger late-maturing prospects.',
    keywords: ['Combat Sports', 'Relative Age Effect', 'Wrestling', 'Talent ID', 'Khelo India', 'Maturity'],
    domain: 'talent_identification',
    articleType: 'original_research',
    status: 'revision_submitted',
    submittedAt: '2026-10-28T14:20:00Z',
    updatedAt: '2026-11-22T09:10:00Z',
    assignedEditor: {
      name: 'Dr. Vikramaditya Rathore',
      email: 'v.rathore@sainis.gov.in',
      assignedAt: '2026-10-29T10:00:00Z',
    },
    authors: [
      {
        name: 'Dr. Harpreet Kaur',
        email: 'h.kaur@sportsauthorityofindia.gov.in',
        affiliation: 'Faculty of Sports Sciences, SAI NS NIS Patiala',
        orcid: '0000-0003-1288-7714',
        isCorresponding: true,
      },
      {
        name: 'Surinder Singh Gill',
        email: 's.gill@punjabiuniversity.ac.in',
        affiliation: 'Department of Physical Education, Punjabi University',
        orcid: '0000-0002-6019-8921',
        isCorresponding: false,
      },
    ],
    screening: {
      plagiarismSimilarityPercent: 6.2,
      plagiarismRisk: 'clean',
      wordCount: 4920,
      hasPdfGalley: true,
      aiDisclosureDeclared: false,
      ethicsClearanceNumber: 'SAI-NIS-IEC/2026/014',
      minorConsentConfirmed: true,
      dataAvailabilityStatement: 'De-identified anthropometric data tabulated in Supplementary Material 1.',
      fundingStatement: 'Supported by Ministry of Youth Affairs and Sports Target Olympic Podium Scheme (TOPS).',
      conflictOfInterestStatement: 'Authors declare no competing interests.',
    },
    reviewers: [
      {
        id: 'rev-02',
        reviewerName: 'Dr. Vikramaditya Rathore',
        institution: 'SAI NS NIS Patiala',
        orcid: '0000-0001-9234-8842',
        domain: 'talent_identification',
        invitationStatus: 'review_submitted',
        assignedAt: '2026-10-30T10:00:00Z',
        dueDate: '2026-11-10T18:00:00Z',
        submittedAt: '2026-11-08T15:20:00Z',
        blindMode: 'double_blind',
        recommendation: 'minor_revision',
        scores: {
          methodology: 4,
          originality: 5,
          dataRigour: 4,
          clarity: 4,
        },
        confidentialCommentsToEditor: 'Crucial paper on grassroots selection bias in India. Needs clear distinction between weight-classified wrestling vs non-weight judo categories.',
        commentsForAuthor: 'Please separate the Q1-Q4 breakdown by weight category classes to determine if RAE is buffered by weight limits.',
      },
      {
        id: 'rev-06',
        reviewerName: 'Dr. Tenzing Norbu',
        institution: 'YMCA College Chennai',
        orcid: '0000-0003-8812-4017',
        domain: 'talent_identification',
        invitationStatus: 'review_submitted',
        assignedAt: '2026-10-30T10:00:00Z',
        dueDate: '2026-11-10T18:00:00Z',
        submittedAt: '2026-11-09T11:45:00Z',
        blindMode: 'double_blind',
        recommendation: 'minor_revision',
        scores: {
          methodology: 4,
          originality: 4,
          dataRigour: 4,
          clarity: 4,
        },
        confidentialCommentsToEditor: 'Solid empirical sample size. Author revisions are realistic.',
        commentsForAuthor: 'Consider adding a recommendation on biological maturity banding (e.g. Khamis-Roche predicted height).',
      },
    ],
    versions: [
      {
        versionNumber: 'v1.0',
        submittedAt: '2026-10-28T14:20:00Z',
        fileUrl: '/khelchronicle/papers/kg-2026-ch-043-v1.pdf',
        fileSize: '2.8 MB',
      },
      {
        versionNumber: 'v1.1',
        submittedAt: '2026-11-22T09:10:00Z',
        fileUrl: '/khelchronicle/papers/kg-2026-ch-043-v1-1.pdf',
        fileSize: '3.1 MB',
        rebuttalLetter:
          'We thank both reviewers for insightful feedback. As requested by Reviewer 1, we have stratified birth quartile distributions by weight categories in Table 4, showing that lightweight divisions exhibit less RAE than heavyweight categories. As suggested by Reviewer 2, we have included a 3-paragraph section discussing maturity offset and biological banding models.',
        changesSummary: 'Added Table 4 (weight-class stratification) and Section 4.3 (biological banding recommendations).',
      },
    ],
    currentVersion: 'v1.1',
    publishing: {
      slug: 'relative-age-effect-somatotype-khelo-india-combat-sports',
      license: 'CC-BY-4.0',
      openAccessVerified: false,
      crossrefDepositStatus: 'queued',
      viewsCount: 840,
      downloadsCount: 195,
      citationsCount: 1,
    },
    auditTrail: [
      {
        id: 'aud-kc-05',
        timestamp: '2026-10-28T14:20:00Z',
        editorName: 'System Gate',
        editorEmail: 'gate@khelgrid.com',
        action: 'Deposit Received',
        fromStatus: 'pending_screening',
        toStatus: 'under_screening',
        notes: 'Automated screening passed (6.2% similarity, IEC documentation validated).',
      },
      {
        id: 'aud-kc-06',
        timestamp: '2026-11-10T12:00:00Z',
        editorName: 'Dr. Vikramaditya Rathore',
        editorEmail: 'v.rathore@sainis.gov.in',
        action: 'Minor Revisions Requested',
        fromStatus: 'in_peer_review',
        toStatus: 'revision_requested',
        notes: 'Both reviewers recommend minor revisions regarding weight category stratification.',
      },
      {
        id: 'aud-kc-07',
        timestamp: '2026-11-22T09:10:00Z',
        editorName: 'Dr. Harpreet Kaur (Author)',
        editorEmail: 'h.kaur@sportsauthorityofindia.gov.in',
        action: 'Revision v1.1 Deposited with Rebuttal Letter',
        fromStatus: 'revision_requested',
        toStatus: 'revision_submitted',
        notes: 'Author submitted revised galley v1.1 and comprehensive rebuttal letter.',
      },
    ],
    internalNotes: [
      'Rebuttal addresses all reviewer queries. Ready for editorial board final acceptance and DOI minting.',
    ],
  },
  {
    id: 'manuscript-kc-003',
    accessionNumber: 'KG-2026-CH-044',
    title: 'Heat Alleviation Strategies and Hydration Biomarkers for Synthetic Turf Field Hockey During Northern Indian Summer Conditions',
    abstractText:
      'Field hockey matches played on wet artificial turf during May-June in Northern India routinely experience Wet Bulb Globe Temperatures (WBGT) exceeding 33°C. This trial evaluated the efficacy of per-cooling ice slurry ingestion (7.5 g/kg) combined with cold-water immersion during quarter intervals in 18 National Centre of Excellence athletes. Core temperature (ingestible telemetry pill), urine specific gravity (USG), and sprint performance were monitored throughout a simulated 60-minute match.',
    keywords: ['Field Hockey', 'Heat Stress', 'WBGT', 'Thermoregulation', 'Hydration', 'Artificial Turf'],
    domain: 'exercise_physiology',
    articleType: 'original_research',
    status: 'in_peer_review',
    submittedAt: '2026-11-05T09:15:00Z',
    updatedAt: '2026-11-15T14:30:00Z',
    assignedEditor: {
      name: 'Dr. Priya Nair, MD',
      email: 'priya.nair@aiims.edu',
      assignedAt: '2026-11-06T11:00:00Z',
    },
    authors: [
      {
        name: 'Dr. Sanjeev Khosla',
        email: 'skhosla@aiims.edu',
        affiliation: 'Department of Sports Medicine, AIIMS New Delhi',
        orcid: '0000-0002-8812-3091',
        isCorresponding: true,
      },
      {
        name: 'Rajinder Pal Singh',
        email: 'r.singh@hockeyindia.org',
        affiliation: 'High Performance Unit, Hockey India',
        orcid: '0000-0001-9923-4518',
        isCorresponding: false,
      },
    ],
    screening: {
      plagiarismSimilarityPercent: 4.5,
      plagiarismRisk: 'clean',
      wordCount: 6150,
      hasPdfGalley: true,
      aiDisclosureDeclared: false,
      ethicsClearanceNumber: 'AIIMS/IEC/2026/0411',
      minorConsentConfirmed: false,
      dataAvailabilityStatement: 'Physiological monitoring telemetry raw logs available on request from corresponding author.',
      fundingStatement: 'Supported by AIIMS Intramural Clinical Research Scheme.',
      conflictOfInterestStatement: 'Authors declare no commercial or equipment sponsor conflicts.',
    },
    reviewers: [
      {
        id: 'rev-03',
        reviewerName: 'Dr. Priya Nair, MD',
        institution: 'AIIMS Sports Medicine',
        orcid: '0000-0003-4412-1090',
        domain: 'sports_medicine',
        invitationStatus: 'accepted',
        assignedAt: '2026-11-08T10:00:00Z',
        dueDate: '2026-11-26T18:00:00Z',
        blindMode: 'double_blind',
      },
      {
        id: 'rev-02',
        reviewerName: 'Dr. Vikramaditya Rathore',
        institution: 'SAI NS NIS Patiala',
        orcid: '0000-0001-9234-8842',
        domain: 'exercise_physiology',
        invitationStatus: 'accepted',
        assignedAt: '2026-11-08T10:00:00Z',
        dueDate: '2026-11-26T18:00:00Z',
        blindMode: 'double_blind',
      },
    ],
    versions: [
      {
        versionNumber: 'v1.0',
        submittedAt: '2026-11-05T09:15:00Z',
        fileUrl: '/khelchronicle/papers/kg-2026-ch-044-v1.pdf',
        fileSize: '4.2 MB',
      },
    ],
    currentVersion: 'v1.0',
    publishing: {
      slug: 'heat-alleviation-hydration-synthetic-turf-field-hockey-india',
      license: 'CC-BY-4.0',
      openAccessVerified: false,
      crossrefDepositStatus: 'unregistered',
      viewsCount: 310,
      downloadsCount: 78,
      citationsCount: 0,
    },
    auditTrail: [
      {
        id: 'aud-kc-08',
        timestamp: '2026-11-05T09:15:00Z',
        editorName: 'System Gate',
        editorEmail: 'gate@khelgrid.com',
        action: 'Deposit Intake & Automated Screening',
        fromStatus: 'pending_screening',
        toStatus: 'under_screening',
        notes: 'Deposit received. Plagiarism 4.5%, telemetry protocols validated.',
      },
      {
        id: 'aud-kc-09',
        timestamp: '2026-11-08T10:00:00Z',
        editorName: 'Dr. Priya Nair, MD',
        editorEmail: 'priya.nair@aiims.edu',
        action: 'Dispatched to 2 Peer Reviewers',
        fromStatus: 'under_screening',
        toStatus: 'in_peer_review',
        notes: 'Double-blind review assigned with due date Nov 26.',
      },
    ],
    internalNotes: [
      'Awaiting referee scorecards due Nov 26.',
    ],
  },
  {
    id: 'manuscript-kc-004',
    accessionNumber: 'KG-2026-CH-045',
    title: 'Automated Computer Vision Detection of Circle Penetration Geometry and Penalty Corner Conversion in Indian Hockey League',
    abstractText:
      'Video analytics in elite field hockey typically relies on labor-intensive manual tagging. This paper presents a specialized deep learning pipeline using fine-tuned YOLOv11 and DeepSORT architectures to detect attacking circle entries, player positional clustering, and penalty corner execution efficiency from broadcast and tactical overhead drone video in 32 competitive matches.',
    keywords: ['Hockey Analytics', 'Computer Vision', 'YOLOv11', 'Circle Penetration', 'Tactical Analytics'],
    domain: 'sports_analytics',
    articleType: 'original_research',
    status: 'pending_screening',
    submittedAt: '2026-11-23T18:40:00Z',
    updatedAt: '2026-11-23T18:40:00Z',
    authors: [
      {
        name: 'Arjun Venkatesh',
        email: 'arjun.v@iitb.ac.in',
        affiliation: 'Department of Computer Science & Engineering, IIT Bombay',
        orcid: '0000-0003-7721-0914',
        isCorresponding: true,
      },
      {
        name: 'Naveen Someshwar',
        email: 'naveen.s@sportstech.in',
        affiliation: 'KhelGrid Sports Technology Lab, Bengaluru',
        orcid: '0000-0002-1188-3349',
        isCorresponding: false,
      },
    ],
    screening: {
      plagiarismSimilarityPercent: 2.1,
      plagiarismRisk: 'clean',
      wordCount: 5210,
      hasPdfGalley: true,
      aiDisclosureDeclared: true,
      aiToolsUsed: 'GitHub Copilot for CUDA tracking scripts',
      ethicsClearanceNumber: 'IITB/CSE/2026/CV-011',
      minorConsentConfirmed: false,
      dataAvailabilityStatement: 'Trained model weights and annotated dataset available on GitHub repository.',
      fundingStatement: 'Supported by National Science & Technology Entrepreneurship Development Board (NSTEDB).',
      conflictOfInterestStatement: 'Authors declare no competing financial interests.',
    },
    reviewers: [],
    versions: [
      {
        versionNumber: 'v1.0',
        submittedAt: '2026-11-23T18:40:00Z',
        fileUrl: '/khelchronicle/papers/kg-2026-ch-045-v1.pdf',
        fileSize: '5.1 MB',
      },
    ],
    currentVersion: 'v1.0',
    publishing: {
      slug: 'computer-vision-detection-circle-penetration-indian-hockey',
      license: 'CC-BY-4.0',
      openAccessVerified: false,
      crossrefDepositStatus: 'unregistered',
      viewsCount: 95,
      downloadsCount: 22,
      citationsCount: 0,
    },
    auditTrail: [
      {
        id: 'aud-kc-10',
        timestamp: '2026-11-23T18:40:00Z',
        editorName: 'System Gate',
        editorEmail: 'gate@khelgrid.com',
        action: 'Deposit Intake Received',
        fromStatus: 'pending_screening',
        toStatus: 'pending_screening',
        notes: 'Deposit received. Automated screening ready for editorial verification.',
      },
    ],
    internalNotes: [],
  },
  {
    id: 'manuscript-kc-005',
    accessionNumber: 'KG-2026-CH-046',
    title: 'Force-Time Asymmetries in Countermovement Jump and Unilateral Sprint Acceleration in Sub-Junior Badminton Athletes',
    abstractText:
      'Asymmetrical lower-limb force development is a prominent risk factor for patellar tendinopathy in racket sports. Unilateral and bilateral countermovement jumps (CMJ) on dual force plates (1000 Hz) alongside 10m/20m timing gates were assessed in 36 national-level sub-junior badminton players at the Gopichand Badminton Academy. Inter-limb eccentric impulse asymmetry > 12% was observed in 44% of athletes, correlating with slower change-of-direction deficit (r = 0.58).',
    keywords: ['Badminton', 'Force Plate', 'CMJ', 'Asymmetry', 'Sprint Acceleration', 'Injury Prevention'],
    domain: 'biomechanics',
    articleType: 'original_research',
    status: 'accepted',
    submittedAt: '2026-10-18T11:00:00Z',
    updatedAt: '2026-11-21T17:15:00Z',
    assignedEditor: {
      name: 'Dr. Anandita Sen',
      email: 'a.sen@iitb.ac.in',
      assignedAt: '2026-10-19T09:30:00Z',
    },
    authors: [
      {
        name: 'Kavitha Ramachandran',
        email: 'kavitha.r@pgba.ac.in',
        affiliation: 'Pullela Gopichand Badminton Academy, Hyderabad',
        orcid: '0000-0002-9901-8842',
        isCorresponding: true,
      },
    ],
    screening: {
      plagiarismSimilarityPercent: 4.1,
      plagiarismRisk: 'clean',
      wordCount: 4620,
      hasPdfGalley: true,
      aiDisclosureDeclared: false,
      ethicsClearanceNumber: 'PGBA-HREC/2026/02',
      minorConsentConfirmed: true,
      dataAvailabilityStatement: 'Force-time metric curves available upon request.',
      fundingStatement: 'Internal academy sport science funding.',
      conflictOfInterestStatement: 'Author declares no conflict of interest.',
    },
    reviewers: [
      {
        id: 'rev-01',
        reviewerName: 'Dr. Anandita Sen',
        institution: 'IIT Bombay',
        orcid: '0000-0002-1845-9201',
        domain: 'biomechanics',
        invitationStatus: 'review_submitted',
        assignedAt: '2026-10-20T10:00:00Z',
        dueDate: '2026-11-05T18:00:00Z',
        submittedAt: '2026-11-03T16:00:00Z',
        blindMode: 'double_blind',
        recommendation: 'accept',
        scores: {
          methodology: 5,
          originality: 4,
          dataRigour: 5,
          clarity: 5,
        },
        confidentialCommentsToEditor: 'Sound force-plate protocol and practical coaching implications.',
        commentsForAuthor: 'Well written manuscript. Useful normative benchmarks for junior badminton.',
      },
    ],
    versions: [
      {
        versionNumber: 'v1.0',
        submittedAt: '2026-10-18T11:00:00Z',
        fileUrl: '/khelchronicle/papers/kg-2026-ch-046-v1.pdf',
        fileSize: '3.6 MB',
      },
    ],
    currentVersion: 'v1.0',
    publishing: {
      slug: 'force-time-asymmetries-cmj-sprint-badminton-junior',
      license: 'CC-BY-4.0',
      openAccessVerified: false,
      crossrefDepositStatus: 'queued',
      viewsCount: 480,
      downloadsCount: 110,
      citationsCount: 0,
    },
    auditTrail: [
      {
        id: 'aud-kc-11',
        timestamp: '2026-10-18T11:00:00Z',
        editorName: 'System Gate',
        editorEmail: 'gate@khelgrid.com',
        action: 'Deposit Intake',
        fromStatus: 'pending_screening',
        toStatus: 'under_screening',
        notes: 'Deposit received.',
      },
      {
        id: 'aud-kc-12',
        timestamp: '2026-11-21T17:15:00Z',
        editorName: 'Dr. Anandita Sen',
        editorEmail: 'a.sen@iitb.ac.in',
        action: 'Accepted for Publication',
        fromStatus: 'in_peer_review',
        toStatus: 'accepted',
        notes: 'Referee recommendations satisfied. Ready for DOI minting.',
      },
    ],
    internalNotes: [
      'Queued for Crossref DOI minting.',
    ],
  },
  {
    id: 'manuscript-kc-006',
    accessionNumber: 'KG-2026-CH-047',
    title: 'Efficacy of Indigenous Ashwagandha Supplementation on Salivary Cortisol and Peak Power in Rural Akhada Wrestlers',
    abstractText:
      'Traditional Dangal wrestlers train with high volume and high mechanical strain. This randomized placebo-controlled double-blind trial examined standardized Withania somnifera root extract (600 mg/day) over 8 weeks in 40 competitive akhada wrestlers in Haryana.',
    keywords: ['Wrestling', 'Akhada', 'Ashwagandha', 'Cortisol', 'Adaptogens', 'Recovery'],
    domain: 'sports_nutrition',
    articleType: 'original_research',
    status: 'screening_revision',
    submittedAt: '2026-11-20T14:00:00Z',
    updatedAt: '2026-11-22T11:30:00Z',
    assignedEditor: {
      name: 'Dr. Priya Nair, MD',
      email: 'priya.nair@aiims.edu',
      assignedAt: '2026-11-21T10:00:00Z',
    },
    authors: [
      {
        name: 'Virender Deswal',
        email: 'virender.d@mdurohtak.ac.in',
        affiliation: 'Maharshi Dayanand University, Rohtak',
        orcid: '0000-0001-6623-1190',
        isCorresponding: true,
      },
    ],
    screening: {
      plagiarismSimilarityPercent: 12.8,
      plagiarismRisk: 'moderate',
      wordCount: 3890,
      hasPdfGalley: true,
      aiDisclosureDeclared: false,
      ethicsClearanceNumber: 'PENDING_DOCUMENTATION',
      minorConsentConfirmed: false,
      dataAvailabilityStatement: 'Data available upon reasonable request.',
      fundingStatement: 'State University Research Scheme.',
      conflictOfInterestStatement: 'Authors declare no conflict of interest.',
    },
    reviewers: [],
    versions: [
      {
        versionNumber: 'v1.0',
        submittedAt: '2026-11-20T14:00:00Z',
        fileUrl: '/khelchronicle/papers/kg-2026-ch-047-v1.pdf',
        fileSize: '1.9 MB',
      },
    ],
    currentVersion: 'v1.0',
    publishing: {
      slug: 'ashwagandha-supplementation-cortisol-akhada-wrestlers',
      license: 'CC-BY-4.0',
      openAccessVerified: false,
      crossrefDepositStatus: 'unregistered',
      viewsCount: 210,
      downloadsCount: 45,
      citationsCount: 0,
    },
    auditTrail: [
      {
        id: 'aud-kc-13',
        timestamp: '2026-11-22T11:30:00Z',
        editorName: 'Dr. Priya Nair, MD',
        editorEmail: 'priya.nair@aiims.edu',
        action: 'Screening Correction Requested',
        fromStatus: 'under_screening',
        toStatus: 'screening_revision',
        notes: 'Requested clinical trial registry CTRI registration number and official IEC certificate.',
      },
    ],
    internalNotes: [
      'Awaiting author upload of CTRI registration number.',
    ],
  },
]

// ---------------------------------------------------------------------------
// In-Memory Repository with Test Reset Capability
// ---------------------------------------------------------------------------
let chronicleManuscriptsStore: ChronicleManuscriptRecord[] = JSON.parse(
  JSON.stringify(SEED_MANUSCRIPTS),
)

export function resetAdminChronicleForTesting(): void {
  chronicleManuscriptsStore = JSON.parse(JSON.stringify(SEED_MANUSCRIPTS))
}

// ---------------------------------------------------------------------------
// Core Query & Mutation Methods
// ---------------------------------------------------------------------------

export async function getAdminChronicleManuscripts(
  filters: EditorialFilterOptions = {},
): Promise<{
  manuscripts: ChronicleManuscriptRecord[]
  metrics: EditorialMicroKpiMetrics
}> {
  let list = [...chronicleManuscriptsStore]

  if (filters.status && filters.status !== 'all') {
    list = list.filter(m => m.status === filters.status)
  }

  if (filters.domain && filters.domain !== 'all') {
    list = list.filter(m => m.domain === filters.domain)
  }

  if (filters.articleType && filters.articleType !== 'all') {
    list = list.filter(m => m.articleType === filters.articleType)
  }

  if (filters.plagiarismRisk && filters.plagiarismRisk !== 'all') {
    list = list.filter(m => m.screening.plagiarismRisk === filters.plagiarismRisk)
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim()
    list = list.filter(
      m =>
        m.title.toLowerCase().includes(q) ||
        m.accessionNumber.toLowerCase().includes(q) ||
        m.authors.some(
          a =>
            a.name.toLowerCase().includes(q) ||
            a.affiliation.toLowerCase().includes(q) ||
            (a.orcid && a.orcid.toLowerCase().includes(q)),
        ) ||
        m.keywords.some(k => k.toLowerCase().includes(k)) ||
        (m.assignedEditor && m.assignedEditor.name.toLowerCase().includes(q)),
    )
  }

  // Calculate high-fidelity metrics across all stored manuscripts
  const all = chronicleManuscriptsStore
  const metrics: EditorialMicroKpiMetrics = {
    totalSubmissions: all.length,
    pendingScreening: all.filter(m => m.status === 'pending_screening').length,
    inPeerReview: all.filter(m => m.status === 'in_peer_review').length,
    revisionsActive: all.filter(
      m => m.status === 'revision_requested' || m.status === 'revision_submitted' || m.status === 'screening_revision',
    ).length,
    acceptedReadyToPublish: all.filter(m => m.status === 'accepted').length,
    publishedOpenAccess: all.filter(m => m.status === 'published').length,
    avgReviewTurnaroundDays: 4.2,
    crossrefDoisMinted: all.filter(m => Boolean(m.publishing.doi)).length,
  }

  return { manuscripts: list, metrics }
}

export async function getAdminChronicleManuscriptDetails(
  id: string,
): Promise<ChronicleManuscriptRecord | null> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) return null
  return JSON.parse(JSON.stringify(item))
}

export async function startManuscriptScreening(
  id: string,
  editor: { name: string; email: string },
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) throw new Error(`Manuscript not found: ${id}`)

  const prev = item.status
  item.status = 'under_screening'
  item.updatedAt = new Date().toISOString()
  item.assignedEditor = {
    name: editor.name,
    email: editor.email,
    assignedAt: new Date().toISOString(),
  }

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    editorName: editor.name,
    editorEmail: editor.email,
    action: 'Claimed Manuscript for Initial Screening',
    fromStatus: prev,
    toStatus: 'under_screening',
    previousStatus: prev,
    newStatus: 'under_screening',
    notes: 'Editor claimed ticket to verify scope, ethical clearances, and automated scan results.',
  })

  return JSON.parse(JSON.stringify(item))
}

export async function requestScreeningCorrection(
  id: string,
  params: {
    editor: { name: string; email: string }
    reason: string
    notes: string
  },
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) throw new Error(`Manuscript not found: ${id}`)

  const prev = item.status
  item.status = 'screening_revision'
  item.updatedAt = new Date().toISOString()

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    editorName: params.editor.name,
    editorEmail: params.editor.email,
    action: 'Requested Screening Corrections from Author',
    fromStatus: prev,
    toStatus: 'screening_revision',
    previousStatus: prev,
    newStatus: 'screening_revision',
    notes: `${params.reason}: ${params.notes}`,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function assignPeerReviewers(
  id: string,
  params: {
    editor: { name: string; email: string }
    reviewers: Array<{
      id: string
      reviewerName: string
      institution: string
      orcid: string
      domain: ResearchDomain
      blindMode: 'double_blind' | 'single_blind'
      dueDays: number
    }>
    notes?: string
  },
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) throw new Error(`Manuscript not found: ${id}`)

  const prev = item.status
  item.status = 'in_peer_review'
  item.updatedAt = new Date().toISOString()

  const now = new Date()
  const newAssignments: AssignedReviewer[] = params.reviewers.map(r => {
    const due = new Date(now.getTime() + r.dueDays * 24 * 60 * 60 * 1000)
    return {
      id: r.id,
      reviewerName: r.reviewerName,
      institution: r.institution,
      orcid: r.orcid,
      domain: r.domain,
      invitationStatus: 'invited',
      assignedAt: now.toISOString(),
      dueDate: due.toISOString(),
      blindMode: r.blindMode,
    }
  })

  item.reviewers = [...item.reviewers, ...newAssignments]

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: now.toISOString(),
    editorName: params.editor.name,
    editorEmail: params.editor.email,
    action: 'Dispatched to Peer Review Pool',
    fromStatus: prev,
    toStatus: 'in_peer_review',
    previousStatus: prev,
    newStatus: 'in_peer_review',
    notes: `Assigned ${params.reviewers.length} reviewer(s) (${params.reviewers.map(r => r.reviewerName).join(', ')}). ${params.notes || ''}`,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function submitPeerReviewReport(
  manuscriptId: string,
  reviewerId: string,
  params: {
    recommendation: 'accept' | 'minor_revision' | 'major_revision' | 'reject'
    scores: {
      methodology: number
      originality: number
      dataRigour: number
      clarity: number
    }
    confidentialCommentsToEditor: string
    commentsForAuthor: string
  },
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === manuscriptId)
  if (!item) throw new Error(`Manuscript not found: ${manuscriptId}`)

  const reviewer = item.reviewers.find(r => r.id === reviewerId)
  if (!reviewer) throw new Error(`Reviewer not found on manuscript: ${reviewerId}`)

  reviewer.invitationStatus = 'review_submitted'
  reviewer.submittedAt = new Date().toISOString()
  reviewer.recommendation = params.recommendation
  reviewer.scores = params.scores
  reviewer.confidentialCommentsToEditor = params.confidentialCommentsToEditor
  reviewer.commentsForAuthor = params.commentsForAuthor

  item.updatedAt = new Date().toISOString()

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    editorName: reviewer.reviewerName,
    editorEmail: 'reviewer@khelchronicle.org',
    action: 'Peer Review Report Submitted',
    notes: `Recommendation: ${params.recommendation.toUpperCase()} (Scores: M=${params.scores.methodology}/5, O=${params.scores.originality}/5, R=${params.scores.dataRigour}/5, C=${params.scores.clarity}/5)`,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function requestManuscriptRevision(
  id: string,
  params: {
    editor: { name: string; email: string }
    decisionTitle: string
    recommendation: 'minor_revision' | 'major_revision'
    editorialLetter: string
    dueDays: number
  },
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) throw new Error(`Manuscript not found: ${id}`)

  const prev = item.status
  item.status = 'revision_requested'
  item.updatedAt = new Date().toISOString()

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    editorName: params.editor.name,
    editorEmail: params.editor.email,
    action: `Decision Issued: ${params.recommendation === 'major_revision' ? 'Major' : 'Minor'} Revisions Required`,
    fromStatus: prev,
    toStatus: 'revision_requested',
    previousStatus: prev,
    newStatus: 'revision_requested',
    notes: `${params.decisionTitle}. Author given ${params.dueDays} days to submit revised galley and point-by-point rebuttal.`,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function acceptManuscript(
  id: string,
  params: {
    editor: { name: string; email: string }
    notes: string
  },
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) throw new Error(`Manuscript not found: ${id}`)

  const prev = item.status
  item.status = 'accepted'
  item.updatedAt = new Date().toISOString()

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    editorName: params.editor.name,
    editorEmail: params.editor.email,
    action: 'Manuscript Accepted for Publication',
    fromStatus: prev,
    toStatus: 'accepted',
    previousStatus: prev,
    newStatus: 'accepted',
    notes: params.notes || 'Editorial board has confirmed all review criteria are met.',
  })

  return JSON.parse(JSON.stringify(item))
}

export async function mintDoiAndPublish(
  id: string,
  params: {
    editor: { name: string; email: string }
    license: OpenAccessLicenseType
    customDoiSuffix?: string
    notes?: string
  },
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) throw new Error(`Manuscript not found: ${id}`)

  const prev = item.status
  item.status = 'published'
  item.updatedAt = new Date().toISOString()

  const currentYear = new Date().getFullYear()
  const serialNumber = item.accessionNumber.split('-').pop() || '001'
  const doi = `10.5555/khelchronicle.${currentYear}.${params.customDoiSuffix || serialNumber}`

  item.publishing = {
    ...item.publishing,
    doi,
    license: params.license,
    openAccessVerified: true,
    publishedAt: new Date().toISOString(),
    crossrefDepositStatus: 'minted',
    xmlGalleyUrl: `/khelchronicle/galleys/${item.accessionNumber.toLowerCase()}.xml`,
    pdfGalleyUrl: item.versions[0]?.fileUrl || `/khelchronicle/papers/${item.accessionNumber.toLowerCase()}.pdf`,
  }

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    editorName: params.editor.name,
    editorEmail: params.editor.email,
    action: 'Minted Crossref DOI & Published Open Access',
    fromStatus: prev,
    toStatus: 'published',
    previousStatus: prev,
    newStatus: 'published',
    notes: `Crossref DOI ${doi} minted. Published under ${params.license}. ${params.notes || ''}`,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function rejectManuscript(
  id: string,
  params: {
    editor: { name: string; email: string }
    reason: string
    editorialLetter: string
  },
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) throw new Error(`Manuscript not found: ${id}`)

  const prev = item.status
  item.status = 'rejected'
  item.updatedAt = new Date().toISOString()

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    editorName: params.editor.name,
    editorEmail: params.editor.email,
    action: 'Manuscript Declined / Rejected',
    fromStatus: prev,
    toStatus: 'rejected',
    previousStatus: prev,
    newStatus: 'rejected',
    notes: `Reason: ${params.reason}. Letter: ${params.editorialLetter}`,
  })

  return JSON.parse(JSON.stringify(item))
}

export async function addEditorialInternalNote(
  id: string,
  editor: { name: string; email: string },
  note: string,
): Promise<ChronicleManuscriptRecord> {
  const item = chronicleManuscriptsStore.find(m => m.id === id)
  if (!item) throw new Error(`Manuscript not found: ${id}`)

  const timestamp = new Date().toISOString()
  item.internalNotes.unshift(`[${timestamp} · ${editor.name}] ${note}`)

  item.auditTrail.unshift({
    id: `aud-${Date.now()}`,
    timestamp,
    editorName: editor.name,
    editorEmail: editor.email,
    action: 'Added Confidential Editorial Note',
    notes: note,
  })

  return JSON.parse(JSON.stringify(item))
}

// ---------------------------------------------------------------------------
// RFC 4180 CSV Export
// ---------------------------------------------------------------------------
export function exportChronicleRegistryToCsv(manuscripts: ChronicleManuscriptRecord[]): string {
  const headers = [
    'Accession Number',
    'Title',
    'Domain',
    'Article Type',
    'Editorial Status',
    'Primary Author',
    'Author Affiliation',
    'ORCID',
    'Assigned Editor',
    'Plagiarism Similarity %',
    'Ethics Protocol',
    'Minor Consent',
    'DOI',
    'License',
    'Submission Date',
    'Publication Date',
    'Versions Count',
  ]

  const rows = manuscripts.map(m => {
    const primaryAuthor = m.authors.find(a => a.isCorresponding) || m.authors[0]
    return [
      m.accessionNumber,
      `"${m.title.replace(/"/g, '""')}"`,
      m.domain,
      m.articleType,
      m.status,
      `"${(primaryAuthor?.name || '').replace(/"/g, '""')}"`,
      `"${(primaryAuthor?.affiliation || '').replace(/"/g, '""')}"`,
      primaryAuthor?.orcid || '',
      `"${(m.assignedEditor?.name || 'Unassigned').replace(/"/g, '""')}"`,
      `${m.screening.plagiarismSimilarityPercent}%`,
      `"${(m.screening.ethicsClearanceNumber || '').replace(/"/g, '""')}"`,
      m.screening.minorConsentConfirmed ? 'YES' : 'NO',
      m.publishing.doi || 'N/A',
      m.publishing.license,
      m.submittedAt,
      m.publishing.publishedAt || 'N/A',
      m.versions.length,
    ]
  })

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
}
