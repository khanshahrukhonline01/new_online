/**
 * KhelGrid Admin — Module 6: Sports Creator Campaigns & Attribution Operations Service
 *
 * Centralizes creator economy governance across:
 * 1. Brand campaign brief moderation & ASCI compliance audits
 * 2. Influencer / athlete campaign application triage & authenticity scoring
 * 3. Canonical creative deliverable review (#Ad / #Sponsored URL checks)
 * 4. Social engagement attribution tracking (UTM links, CTR, verified leads, anomaly flags)
 * 5. Multi-stage milestone completion verification & append-only INR ledger (paise)
 *
 * Notice: Direct banking / payment gateway disbursements remain disabled platform-wide.
 * Approved milestones record immutable INR reward credits safely in escrow ledger state.
 */

import {
  getCampaigns,
  updateCampaignStatus,
  getCampaignApplications,
  updateApplicationStatus,
  getDeliverableSubmissions,
  reviewDeliverable,
  getRewardLedger,
  appendRewardLedgerEntry,
  getCampaignDisputes,
  resolveCampaignDispute,
  getCampaignAuditEvents,
  recordCampaignAuditEvent,
  getCreatorProfile,
  saveCreatorProfile,
  formatPaiseToInr,
  scanCampaignPolicyCompliance,
  validateDeliverableUrl,
  resetCampaignStorageForTesting,
  type Campaign,
  type CampaignStatus,
  type CampaignApplication,
  type ApplicationStatus,
  type DeliverableSubmission,
  type DeliverableStatus,
  type SocialPlatform,
  type CreatorProfile,
  type RewardLedgerEntry,
  type CampaignDispute,
  type CampaignAuditEvent,
  type PolicyScanResult,
  type UrlValidationResult,
} from '../../../../src/modules/campaigns/campaignClient'

export {
  formatPaiseToInr,
  scanCampaignPolicyCompliance,
  validateDeliverableUrl,
  type Campaign,
  type CampaignStatus,
  type CampaignApplication,
  type ApplicationStatus,
  type DeliverableSubmission,
  type DeliverableStatus,
  type SocialPlatform,
  type CreatorProfile,
  type RewardLedgerEntry,
  type CampaignDispute,
  type CampaignAuditEvent,
  type PolicyScanResult,
  type UrlValidationResult,
}

export interface OperatorActor {
  name: string
  email: string
}

export type AuthenticityRisk = 'low' | 'medium' | 'high'

export interface AdminBrandApplication extends CampaignApplication {
  sportSpecialty: string
  city: string
  audienceFitScore: number // 0 - 100
  engagementRatePercent: number
  authenticityRisk: AuthenticityRisk
  proposedConcept: string
  reviewedBy?: string
}

export type AttributionAnomalyFlag =
  | 'none'
  | 'sudden_bot_spike'
  | 'geo_mismatch'
  | 'engagement_pod'
  | 'broken_utm'

export type AttributionAuditStatus = 'verified_organic' | 'under_audit' | 'flagged_excluded'

export interface SocialAttributionRecord {
  id: string
  campaignId: string
  campaignTitle: string
  creatorId: string
  creatorName: string
  creatorHandle: string
  platform: SocialPlatform
  submissionId?: string
  trackingCode: string
  shortUrl: string
  utmTag: string
  impressions: number
  videoViews: number
  engagements: number
  engagementRatePercent: number
  linkClicks: number
  ctrPercent: number
  verifiedTrialEnquiries: number
  verifiedAcademyEnrolments: number
  conversionRatePercent: number
  authenticityScore: number // 0 - 100
  anomalyFlag: AttributionAnomalyFlag
  anomalyDetails?: string
  auditStatus: AttributionAuditStatus
  verifiedByAdmin: boolean
  lastSyncedAt: string
}

export type MilestoneStage =
  | 'brief_lock'
  | 'creative_delivery'
  | 'attribution_retention'
  | 'final_signoff'

export type MilestoneStatus =
  | 'locked'
  | 'pending_review'
  | 'approved'
  | 'revision_requested'
  | 'blocked_anomaly'

export interface CampaignMilestoneRecord {
  id: string
  campaignId: string
  campaignTitle: string
  creatorId: string
  creatorName: string
  creatorHandle: string
  milestoneCode: 'M1' | 'M2' | 'M3' | 'M4'
  stage: MilestoneStage
  title: string
  description: string
  dueDate: string
  rewardSharePaise: number
  status: MilestoneStatus
  evidenceRef?: string
  attributedEnquiries?: number
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
}

export interface ExtendedCreatorRosterItem extends CreatorProfile {
  kyiStatus: 'verified' | 'pending_review' | 'flagged'
  authenticityScore: number
  totalAttributedLeads: number
  activeCampaignsCount: number
  riskNote?: string
}

export interface CreatorOpsMicroKpiMetrics {
  totalCampaigns: number
  pendingBriefs: number
  publishedCampaigns: number
  totalApplications: number
  pendingApplications: number
  pendingDeliverables: number
  approvedDeliverables: number
  totalAttributedClicks: number
  totalVerifiedEnquiries: number
  flaggedAnomalies: number
  milestonesPendingReview: number
  milestonesApproved: number
  openDisputes: number
  approvedLedgerPaise: number
  payableLedgerPaise: number
}

export interface CreatorOpsDashboardSnapshot {
  campaigns: Campaign[]
  applications: AdminBrandApplication[]
  deliverables: DeliverableSubmission[]
  attributions: SocialAttributionRecord[]
  milestones: CampaignMilestoneRecord[]
  creators: ExtendedCreatorRosterItem[]
  disputes: CampaignDispute[]
  rewardLedger: RewardLedgerEntry[]
  auditLogs: CampaignAuditEvent[]
  metrics: CreatorOpsMicroKpiMetrics
}

const ADMIN_STORAGE_KEYS = {
  APPLICATIONS: 'khelgrid_admin_creator_apps_v1',
  ATTRIBUTIONS: 'khelgrid_admin_attribution_v1',
  MILESTONES: 'khelgrid_admin_milestones_v1',
  CREATORS: 'khelgrid_admin_creator_roster_v1',
} as const

// Safe in-memory fallback for SSR / Vitest
const adminMemoryStore = new Map<string, string>()

function loadAdminData<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch {
    // Fallback to in-memory map
  }
  const mem = adminMemoryStore.get(key)
  if (mem) {
    try {
      return JSON.parse(mem) as T
    } catch {
      return fallback
    }
  }
  return structuredClone(fallback)
}

function saveAdminData<T>(key: string, data: T): void {
  const serialized = JSON.stringify(data)
  adminMemoryStore.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Ignore storage quota / sandbox restrictions
  }
}

// =========================================================================
// REALISTIC INDIAN SPORTS SEED DATASETS (MODULE 6)
// =========================================================================

const INITIAL_ADMIN_APPLICATIONS: AdminBrandApplication[] = [
  {
    id: 'app-admin-dca-rohan',
    campaignId: 'cmp-dca-summer-2026',
    campaignTitle: 'Delhi Cricket Academy — High Performance Summer Trials 2026',
    creatorId: 'creator-rohan-cricket',
    creatorName: 'Rohan Sharma Sports',
    creatorHandle: '@rohan_cricket_insider',
    platform: 'youtube',
    followerCount: 28500,
    portfolioLink: 'https://youtube.com/@RohanCricketLab',
    pitchNote: 'Will film 60fps slow-motion bowling machine & turf net biomechanics walkthrough at Dwarka campus.',
    sportSpecialty: 'Cricket',
    city: 'Delhi NCR',
    audienceFitScore: 96,
    engagementRatePercent: 6.8,
    authenticityRisk: 'low',
    proposedConcept: '45s Vertical Short breaking down U-17 speed gun accuracy and open trial verification steps.',
    status: 'accepted',
    appliedAt: '2026-11-21T09:15:00Z',
    reviewedAt: '2026-11-21T12:30:00Z',
    reviewNote: 'Strong Delhi NCR cricket audience demographics (74% aged 13-21). Approved for Milestone Track.',
    reviewedBy: 'creator.ops@khelgrid.com',
  },
  {
    id: 'app-admin-bbfs-kabir',
    campaignId: 'cmp-bbfs-football-camp',
    campaignTitle: 'BBFS National Youth Football Combine & Residential Scholarship',
    creatorId: 'creator-kabir-football',
    creatorName: "Kabir D'Souza Football Lab",
    creatorHandle: '@kabir_pitch_talk',
    platform: 'instagram',
    followerCount: 38400,
    portfolioLink: 'https://instagram.com/kabir_pitch_talk',
    pitchNote: 'Covered Mumbai & Bengaluru grassroots leagues; ready to highlight merit scholarship combine format.',
    sportSpecialty: 'Football',
    city: 'Mumbai',
    audienceFitScore: 91,
    engagementRatePercent: 5.4,
    authenticityRisk: 'low',
    proposedConcept: 'Combine agility ladder & 1v1 sprint showcase with clear non-guarantee eligibility disclaimer.',
    status: 'applied',
    appliedAt: '2026-11-23T08:40:00Z',
  },
  {
    id: 'app-admin-kg-meera',
    campaignId: 'cmp-khelgrid-open-trials',
    campaignTitle: 'KhelGrid National Initiative — Discover Verified Free Sports Trials',
    creatorId: 'creator-meera-athletics',
    creatorName: 'Meera Nair Track & Field',
    creatorHandle: '@meera_runs_india',
    platform: 'instagram',
    followerCount: 54200,
    portfolioLink: 'https://instagram.com/meera_runs_india',
    pitchNote: 'Dedicated explainer in English & Malayalam showing young sprinters how to build a free Sports CV PDF.',
    sportSpecialty: 'Athletics',
    city: 'Bengaluru',
    audienceFitScore: 95,
    engagementRatePercent: 7.2,
    authenticityRisk: 'low',
    proposedConcept: 'Split-screen tutorial on spotting fake trial agents vs KhelGrid verified open trials.',
    status: 'shortlisted',
    appliedAt: '2026-11-23T11:20:00Z',
    reviewedAt: '2026-11-23T15:10:00Z',
    reviewNote: 'Shortlisted — pending final brief script check for Malayalam captions.',
    reviewedBy: 'moderator@khelgrid.com',
  },
  {
    id: 'app-admin-bbfs-vikram',
    campaignId: 'cmp-bbfs-football-camp',
    campaignTitle: 'BBFS National Youth Football Combine & Residential Scholarship',
    creatorId: 'creator-vikram-kabaddi',
    creatorName: 'Vikram Kabaddi Arena',
    creatorHandle: '@vikram_panga_rohtak',
    platform: 'youtube',
    followerCount: 62500,
    portfolioLink: 'https://youtube.com/@VikramPangaArena',
    pitchNote: 'Cross-sport fitness promotion for Haryana youth athletes interested in speed conditioning.',
    sportSpecialty: 'Kabaddi',
    city: 'Rohtak',
    audienceFitScore: 62,
    engagementRatePercent: 1.9,
    authenticityRisk: 'high',
    proposedConcept: 'General strength camp reel linking to football scholarship page.',
    status: 'applied',
    appliedAt: '2026-11-24T07:50:00Z',
  },
  {
    id: 'app-admin-kg-ananya',
    campaignId: 'cmp-khelgrid-open-trials',
    campaignTitle: 'KhelGrid National Initiative — Discover Verified Free Sports Trials',
    creatorId: 'creator-ananya-badminton',
    creatorName: 'Ananya Badminton Shuttle',
    creatorHandle: '@ananya_smash_hyd',
    platform: 'youtube',
    followerCount: 21800,
    portfolioLink: 'https://youtube.com/@AnanyaSmashHyd',
    pitchNote: 'State-level badminton player sharing transparent tournament registration tips across Telangana & AP.',
    sportSpecialty: 'Badminton',
    city: 'Hyderabad',
    audienceFitScore: 89,
    engagementRatePercent: 6.1,
    authenticityRisk: 'low',
    proposedConcept: 'Hindi/Telugu breakdown of verified academy listings & Sports CV export workflow.',
    status: 'selected',
    appliedAt: '2026-11-22T14:00:00Z',
    reviewedAt: '2026-11-22T17:45:00Z',
    reviewNote: 'High trust score in Telugu badminton community; approved for regional distribution.',
    reviewedBy: 'creator.ops@khelgrid.com',
  },
]

const INITIAL_ATTRIBUTION_RECORDS: SocialAttributionRecord[] = [
  {
    id: 'attr-dca-rohan-01',
    campaignId: 'cmp-dca-summer-2026',
    campaignTitle: 'Delhi Cricket Academy — High Performance Summer Trials 2026',
    creatorId: 'creator-rohan-cricket',
    creatorName: 'Rohan Sharma Sports',
    creatorHandle: '@rohan_cricket_insider',
    platform: 'youtube',
    submissionId: 'sub-sample-1',
    trackingCode: 'KG-DCA-ROHAN26',
    shortUrl: 'https://khel.gg/c/dca26/rohan',
    utmTag: 'utm_source=youtube&utm_medium=creator_short&utm_campaign=dca_summer_26&utm_content=rohan',
    impressions: 48200,
    videoViews: 39450,
    engagements: 3180,
    engagementRatePercent: 6.6,
    linkClicks: 1420,
    ctrPercent: 2.95,
    verifiedTrialEnquiries: 118,
    verifiedAcademyEnrolments: 29,
    conversionRatePercent: 8.31,
    authenticityScore: 96,
    anomalyFlag: 'none',
    auditStatus: 'verified_organic',
    verifiedByAdmin: true,
    lastSyncedAt: '2026-11-24T17:30:00Z',
  },
  {
    id: 'attr-bbfs-meera-02',
    campaignId: 'cmp-bbfs-football-camp',
    campaignTitle: 'BBFS National Youth Football Combine & Residential Scholarship',
    creatorId: 'creator-meera-athletics',
    creatorName: 'Meera Nair Track & Field',
    creatorHandle: '@meera_runs_india',
    platform: 'instagram',
    trackingCode: 'KG-BBFS-MEERA26',
    shortUrl: 'https://khel.gg/c/bbfs26/meera',
    utmTag: 'utm_source=instagram&utm_medium=reel&utm_campaign=bbfs_combine_26&utm_content=meera',
    impressions: 61500,
    videoViews: 52100,
    engagements: 4490,
    engagementRatePercent: 7.3,
    linkClicks: 1890,
    ctrPercent: 3.07,
    verifiedTrialEnquiries: 164,
    verifiedAcademyEnrolments: 41,
    conversionRatePercent: 8.68,
    authenticityScore: 98,
    anomalyFlag: 'none',
    auditStatus: 'verified_organic',
    verifiedByAdmin: true,
    lastSyncedAt: '2026-11-24T18:05:00Z',
  },
  {
    id: 'attr-kg-ananya-03',
    campaignId: 'cmp-khelgrid-open-trials',
    campaignTitle: 'KhelGrid National Initiative — Discover Verified Free Sports Trials',
    creatorId: 'creator-ananya-badminton',
    creatorName: 'Ananya Badminton Shuttle',
    creatorHandle: '@ananya_smash_hyd',
    platform: 'youtube',
    trackingCode: 'KG-OPEN-ANANYA26',
    shortUrl: 'https://khel.gg/c/open26/ananya',
    utmTag: 'utm_source=youtube&utm_medium=short&utm_campaign=open_trials_26&utm_content=ananya',
    impressions: 24900,
    videoViews: 21300,
    engagements: 1580,
    engagementRatePercent: 6.35,
    linkClicks: 810,
    ctrPercent: 3.25,
    verifiedTrialEnquiries: 74,
    verifiedAcademyEnrolments: 19,
    conversionRatePercent: 9.14,
    authenticityScore: 94,
    anomalyFlag: 'none',
    auditStatus: 'verified_organic',
    verifiedByAdmin: true,
    lastSyncedAt: '2026-11-24T16:45:00Z',
  },
  {
    id: 'attr-kg-vikram-04',
    campaignId: 'cmp-khelgrid-open-trials',
    campaignTitle: 'KhelGrid National Initiative — Discover Verified Free Sports Trials',
    creatorId: 'creator-vikram-kabaddi',
    creatorName: 'Vikram Kabaddi Arena',
    creatorHandle: '@vikram_panga_rohtak',
    platform: 'youtube',
    trackingCode: 'KG-OPEN-VIKRAM26',
    shortUrl: 'https://khel.gg/c/open26/vikram',
    utmTag: 'utm_source=youtube&utm_medium=short&utm_campaign=open_trials_26&utm_content=vikram',
    impressions: 112000,
    videoViews: 108400,
    engagements: 940,
    engagementRatePercent: 0.84,
    linkClicks: 2450,
    ctrPercent: 2.19,
    verifiedTrialEnquiries: 3,
    verifiedAcademyEnrolments: 0,
    conversionRatePercent: 0.12,
    authenticityScore: 41,
    anomalyFlag: 'sudden_bot_spike',
    anomalyDetails: '78% of clicks originated from 2 datacenter ASNs outside India within 19 minutes; <0.15% Sports CV funnel conversion.',
    auditStatus: 'under_audit',
    verifiedByAdmin: false,
    lastSyncedAt: '2026-11-24T19:15:00Z',
  },
]

const INITIAL_MILESTONES: CampaignMilestoneRecord[] = [
  {
    id: 'ms-dca-rohan-m1',
    campaignId: 'cmp-dca-summer-2026',
    campaignTitle: 'Delhi Cricket Academy — High Performance Summer Trials 2026',
    creatorId: 'creator-rohan-cricket',
    creatorName: 'Rohan Sharma Sports',
    creatorHandle: '@rohan_cricket_insider',
    milestoneCode: 'M1',
    stage: 'brief_lock',
    title: 'M1 · Brief Alignment & Mandatory #Ad Script Sign-off',
    description: 'Confirm prohibited claim guardrails (no IPL/Ranji guarantee) and caption #Ad placement.',
    dueDate: '2026-11-22T18:00:00Z',
    rewardSharePaise: 100000,
    status: 'approved',
    evidenceRef: 'Script Revision v1.2 approved',
    reviewedBy: 'creator.ops@khelgrid.com',
    reviewedAt: '2026-11-21T16:15:00Z',
    reviewNote: 'Disclosure statement matches ASCI guidelines.',
  },
  {
    id: 'ms-dca-rohan-m2',
    campaignId: 'cmp-dca-summer-2026',
    campaignTitle: 'Delhi Cricket Academy — High Performance Summer Trials 2026',
    creatorId: 'creator-rohan-cricket',
    creatorName: 'Rohan Sharma Sports',
    creatorHandle: '@rohan_cricket_insider',
    milestoneCode: 'M2',
    stage: 'creative_delivery',
    title: 'M2 · Canonical YouTube Short Publication & Disclosure Check',
    description: 'Publish vertical trial walkthrough at canonical youtube.com/shorts/* URL with live UTM tag.',
    dueDate: '2026-11-26T18:00:00Z',
    rewardSharePaise: 200000,
    status: 'pending_review',
    evidenceRef: 'https://youtube.com/shorts/delhi-cricket-trial',
  },
  {
    id: 'ms-dca-rohan-m3',
    campaignId: 'cmp-dca-summer-2026',
    campaignTitle: 'Delhi Cricket Academy — High Performance Summer Trials 2026',
    creatorId: 'creator-rohan-cricket',
    creatorName: 'Rohan Sharma Sports',
    creatorHandle: '@rohan_cricket_insider',
    milestoneCode: 'M3',
    stage: 'attribution_retention',
    title: 'M3 · 7-Day Organic Retention & Trial Enquiry Attribution Audit',
    description: 'Verify post remains public for 7 days and attributed clicks exceed 90% authenticity baseline.',
    dueDate: '2026-12-03T18:00:00Z',
    rewardSharePaise: 50000,
    status: 'pending_review',
    evidenceRef: 'KG-DCA-ROHAN26 (118 Verified Trial Enquiries)',
    attributedEnquiries: 118,
  },
  {
    id: 'ms-dca-rohan-m4',
    campaignId: 'cmp-dca-summer-2026',
    campaignTitle: 'Delhi Cricket Academy — High Performance Summer Trials 2026',
    creatorId: 'creator-rohan-cricket',
    creatorName: 'Rohan Sharma Sports',
    creatorHandle: '@rohan_cricket_insider',
    milestoneCode: 'M4',
    stage: 'final_signoff',
    title: 'M4 · Final Campaign Completion & Ledger Credit Release',
    description: 'Confirm zero unresolved disputes and append final contracted balance to INR ledger.',
    dueDate: '2026-12-10T18:00:00Z',
    rewardSharePaise: 50000,
    status: 'locked',
  },
  {
    id: 'ms-bbfs-meera-m2',
    campaignId: 'cmp-bbfs-football-camp',
    campaignTitle: 'BBFS National Youth Football Combine & Residential Scholarship',
    creatorId: 'creator-meera-athletics',
    creatorName: 'Meera Nair Track & Field',
    creatorHandle: '@meera_runs_india',
    milestoneCode: 'M2',
    stage: 'creative_delivery',
    title: 'M2 · Combine Drill Instagram Reel & #Ad Tag Audit',
    description: 'Verify canonical Instagram Reel showcases football combine sprint criteria accurately.',
    dueDate: '2026-11-28T18:00:00Z',
    rewardSharePaise: 300000,
    status: 'approved',
    evidenceRef: 'https://instagram.com/reel/bbfs-sprint-combine',
    attributedEnquiries: 164,
    reviewedBy: 'creator.ops@khelgrid.com',
    reviewedAt: '2026-11-24T11:10:00Z',
    reviewNote: 'Verified high-retention reel & active #Ad badge.',
  },
  {
    id: 'ms-bbfs-meera-m4',
    campaignId: 'cmp-bbfs-football-camp',
    campaignTitle: 'BBFS National Youth Football Combine & Residential Scholarship',
    creatorId: 'creator-meera-athletics',
    creatorName: 'Meera Nair Track & Field',
    creatorHandle: '@meera_runs_india',
    milestoneCode: 'M4',
    stage: 'final_signoff',
    title: 'M4 · Final Attribution Sign-off & Ledger Escrow Entry',
    description: 'All deliverables verified; ready for final milestone credit into immutable ledger.',
    dueDate: '2026-12-01T18:00:00Z',
    rewardSharePaise: 300000,
    status: 'pending_review',
    evidenceRef: 'KG-BBFS-MEERA26 (164 Enquiries · 41 Enrolments)',
    attributedEnquiries: 164,
  },
  {
    id: 'ms-kg-vikram-m3',
    campaignId: 'cmp-khelgrid-open-trials',
    campaignTitle: 'KhelGrid National Initiative — Discover Verified Free Sports Trials',
    creatorId: 'creator-vikram-kabaddi',
    creatorName: 'Vikram Kabaddi Arena',
    creatorHandle: '@vikram_panga_rohtak',
    milestoneCode: 'M3',
    stage: 'attribution_retention',
    title: 'M3 · Attribution Spike Audit (Automated Anomaly Freeze)',
    description: 'Milestone automatically held due to non-Indian click burst anomaly on KG-OPEN-VIKRAM26.',
    dueDate: '2026-11-29T18:00:00Z',
    rewardSharePaise: 250000,
    status: 'blocked_anomaly',
    evidenceRef: 'Flagged by Traffic Guard · Authenticity 41/100',
    attributedEnquiries: 3,
  },
]

const INITIAL_EXTENDED_CREATORS: ExtendedCreatorRosterItem[] = [
  {
    id: 'creator-rohan-cricket',
    userId: 'usr-cr-1',
    displayName: 'Rohan Sharma Sports',
    handle: '@rohan_cricket_insider',
    bio: 'Cricket analyst, fast-bowling biomechanics student, and Delhi club league cricketer.',
    primarySport: 'Cricket',
    platforms: [
      {
        platform: 'youtube',
        handle: 'RohanCricketLab',
        channelUrl: 'https://youtube.com/@RohanCricketLab',
        followerCount: 28500,
        isVerified: true,
      },
      {
        platform: 'instagram',
        handle: 'rohan_cricket_insider',
        channelUrl: 'https://instagram.com/rohan_cricket_insider',
        followerCount: 42100,
        isVerified: true,
      },
    ],
    locationCity: 'Delhi NCR',
    languages: ['Hindi', 'English'],
    isVerifiedCreator: true,
    totalEarningsPaise: 1600000,
    completedDeliverablesCount: 4,
    joinedAt: '2026-10-15T12:00:00Z',
    kyiStatus: 'verified',
    authenticityScore: 96,
    totalAttributedLeads: 118,
    activeCampaignsCount: 2,
  },
  {
    id: 'creator-meera-athletics',
    userId: 'usr-cr-2',
    displayName: 'Meera Nair Track & Field',
    handle: '@meera_runs_india',
    bio: '400m national open track athlete sharing sprint mechanics & verified grassroots trials.',
    primarySport: 'Athletics',
    platforms: [
      {
        platform: 'instagram',
        handle: 'meera_runs_india',
        channelUrl: 'https://instagram.com/meera_runs_india',
        followerCount: 54200,
        isVerified: true,
      },
      {
        platform: 'youtube',
        handle: 'MeeraSprintIndia',
        channelUrl: 'https://youtube.com/@MeeraSprintIndia',
        followerCount: 19400,
        isVerified: true,
      },
    ],
    locationCity: 'Bengaluru',
    languages: ['English', 'Malayalam', 'Hindi'],
    isVerifiedCreator: true,
    totalEarningsPaise: 2400000,
    completedDeliverablesCount: 6,
    joinedAt: '2026-09-28T09:00:00Z',
    kyiStatus: 'verified',
    authenticityScore: 98,
    totalAttributedLeads: 164,
    activeCampaignsCount: 2,
  },
  {
    id: 'creator-kabir-football',
    userId: 'usr-cr-3',
    displayName: "Kabir D'Souza Football Lab",
    handle: '@kabir_pitch_talk',
    bio: 'AIFF D-License youth coach documenting Cooperage & Mumbai district youth leagues.',
    primarySport: 'Football',
    platforms: [
      {
        platform: 'instagram',
        handle: 'kabir_pitch_talk',
        channelUrl: 'https://instagram.com/kabir_pitch_talk',
        followerCount: 38400,
        isVerified: false,
      },
      {
        platform: 'x_twitter',
        handle: 'kabirpitchtalk',
        channelUrl: 'https://x.com/kabirpitchtalk',
        followerCount: 11200,
        isVerified: true,
      },
    ],
    locationCity: 'Mumbai',
    languages: ['English', 'Hindi', 'Marathi'],
    isVerifiedCreator: false,
    totalEarningsPaise: 500000,
    completedDeliverablesCount: 1,
    joinedAt: '2026-11-04T15:00:00Z',
    kyiStatus: 'pending_review',
    authenticityScore: 91,
    totalAttributedLeads: 32,
    activeCampaignsCount: 1,
    riskNote: 'Pending PAN / Aadhaar identity match verification.',
  },
  {
    id: 'creator-ananya-badminton',
    userId: 'usr-cr-4',
    displayName: 'Ananya Badminton Shuttle',
    handle: '@ananya_smash_hyd',
    bio: 'Senior state badminton finalist creating footwork clinics and academy transparency reviews.',
    primarySport: 'Badminton',
    platforms: [
      {
        platform: 'youtube',
        handle: 'AnanyaSmashHyd',
        channelUrl: 'https://youtube.com/@AnanyaSmashHyd',
        followerCount: 21800,
        isVerified: true,
      },
    ],
    locationCity: 'Hyderabad',
    languages: ['Telugu', 'Hindi', 'English'],
    isVerifiedCreator: true,
    totalEarningsPaise: 950000,
    completedDeliverablesCount: 3,
    joinedAt: '2026-10-20T11:30:00Z',
    kyiStatus: 'verified',
    authenticityScore: 94,
    totalAttributedLeads: 74,
    activeCampaignsCount: 1,
  },
  {
    id: 'creator-vikram-kabaddi',
    userId: 'usr-cr-5',
    displayName: 'Vikram Kabaddi Arena',
    handle: '@vikram_panga_rohtak',
    bio: 'Grassroots kabaddi highlights & open rural tournament updates across Haryana.',
    primarySport: 'Kabaddi',
    platforms: [
      {
        platform: 'youtube',
        handle: 'VikramPangaArena',
        channelUrl: 'https://youtube.com/@VikramPangaArena',
        followerCount: 62500,
        isVerified: false,
      },
    ],
    locationCity: 'Rohtak',
    languages: ['Hindi', 'Haryanvi'],
    isVerifiedCreator: false,
    totalEarningsPaise: 0,
    completedDeliverablesCount: 0,
    joinedAt: '2026-11-12T10:00:00Z',
    kyiStatus: 'flagged',
    authenticityScore: 41,
    totalAttributedLeads: 3,
    activeCampaignsCount: 1,
    riskNote: 'Traffic anomaly detected: high impression-to-lead discrepancy under investigation.',
  },
]

// =========================================================================
// UNIFIED READ & TELEMETRY AGGREGATION
// =========================================================================

export function getAdminCreatorCampaignDashboard(): CreatorOpsDashboardSnapshot {
  const campaigns = getCampaigns()
  const customerApps = getCampaignApplications()
  const storedAdminApps = loadAdminData<AdminBrandApplication[]>(
    ADMIN_STORAGE_KEYS.APPLICATIONS,
    INITIAL_ADMIN_APPLICATIONS,
  )

  // Merge customer-submitted applications from campaignClient with admin enriched apps
  const mergedAppsMap = new Map<string, AdminBrandApplication>()
  for (const app of storedAdminApps) {
    mergedAppsMap.set(app.id, app)
  }
  for (const cust of customerApps) {
    if (!mergedAppsMap.has(cust.id)) {
      const parentCamp = campaigns.find(c => c.id === cust.campaignId)
      mergedAppsMap.set(cust.id, {
        ...cust,
        sportSpecialty: parentCamp?.sport || 'Multi-Sport',
        city: parentCamp?.locationCity || 'India',
        audienceFitScore: 84,
        engagementRatePercent: 4.5,
        authenticityRisk: cust.followerCount > 5000 ? 'low' : 'medium',
        proposedConcept: cust.pitchNote,
      })
    }
  }
  const applications = Array.from(mergedAppsMap.values())

  const deliverables = getDeliverableSubmissions()
  const attributions = loadAdminData<SocialAttributionRecord[]>(
    ADMIN_STORAGE_KEYS.ATTRIBUTIONS,
    INITIAL_ATTRIBUTION_RECORDS,
  )
  const milestones = loadAdminData<CampaignMilestoneRecord[]>(
    ADMIN_STORAGE_KEYS.MILESTONES,
    INITIAL_MILESTONES,
  )

  // Synchronize creator verification badge changes from campaignClient
  const basePrimaryCreator = getCreatorProfile('creator-rohan-cricket')
  const rawCreators = loadAdminData<ExtendedCreatorRosterItem[]>(
    ADMIN_STORAGE_KEYS.CREATORS,
    INITIAL_EXTENDED_CREATORS,
  )
  const creators = rawCreators.map(c =>
    c.id === basePrimaryCreator.id
      ? {
          ...c,
          bio: basePrimaryCreator.bio,
          isVerifiedCreator: basePrimaryCreator.isVerifiedCreator,
          kyiStatus: basePrimaryCreator.isVerifiedCreator ? ('verified' as const) : ('pending_review' as const),
        }
      : c,
  )

  const disputes = getCampaignDisputes()
  const rewardLedger = getRewardLedger()
  const auditLogs = getCampaignAuditEvents()

  const metrics: CreatorOpsMicroKpiMetrics = {
    totalCampaigns: campaigns.length,
    pendingBriefs: campaigns.filter(c => c.status === 'submitted' || c.status === 'under_review' || c.status === 'changes_requested').length,
    publishedCampaigns: campaigns.filter(c => c.status === 'published').length,
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => a.status === 'applied' || a.status === 'shortlisted').length,
    pendingDeliverables: deliverables.filter(d => d.status === 'submitted' || d.status === 'revision_requested').length,
    approvedDeliverables: deliverables.filter(d => d.status === 'accepted').length,
    totalAttributedClicks: attributions.filter(a => a.auditStatus !== 'flagged_excluded').reduce((acc, a) => acc + a.linkClicks, 0),
    totalVerifiedEnquiries: attributions.filter(a => a.auditStatus !== 'flagged_excluded').reduce((acc, a) => acc + a.verifiedTrialEnquiries, 0),
    flaggedAnomalies: attributions.filter(a => a.anomalyFlag !== 'none' || a.auditStatus !== 'verified_organic').length,
    milestonesPendingReview: milestones.filter(m => m.status === 'pending_review' || m.status === 'revision_requested').length,
    milestonesApproved: milestones.filter(m => m.status === 'approved').length,
    openDisputes: disputes.filter(d => d.status === 'open' || d.status === 'under_review').length,
    approvedLedgerPaise: rewardLedger.filter(l => l.status === 'approved').reduce((acc, l) => acc + l.amountPaise, 0),
    payableLedgerPaise: rewardLedger.filter(l => l.status === 'payable' || l.status === 'paid').reduce((acc, l) => acc + l.amountPaise, 0),
  }

  return {
    campaigns,
    applications,
    deliverables,
    attributions,
    milestones,
    creators,
    disputes,
    rewardLedger,
    auditLogs,
    metrics,
  }
}

// =========================================================================
// MUTATION OPERATIONS
// =========================================================================

export function moderateCampaignBrief(
  campaignId: string,
  decision: CampaignStatus,
  operator: OperatorActor,
  note: string,
): boolean {
  const cleanedNote =
    note.trim() ||
    (decision === 'published'
      ? 'Campaign brief passed ASCI & Fair Selection policy verification.'
      : `Campaign status updated to ${decision}.`)

  return updateCampaignStatus(campaignId, decision, operator.name, cleanedNote)
}

export function triageBrandApplication(
  applicationId: string,
  decision: ApplicationStatus,
  operator: OperatorActor,
  note: string,
): boolean {
  // Update in customer storage if present
  updateApplicationStatus(applicationId, decision, operator.name, note)

  const apps = loadAdminData<AdminBrandApplication[]>(
    ADMIN_STORAGE_KEYS.APPLICATIONS,
    INITIAL_ADMIN_APPLICATIONS,
  )
  const idx = apps.findIndex(a => a.id === applicationId)

  let targetApp: AdminBrandApplication | undefined
  if (idx >= 0) {
    apps[idx] = {
      ...apps[idx],
      status: decision,
      reviewedAt: new Date().toISOString(),
      reviewedBy: operator.email,
      reviewNote: note.trim() || `Application ${decision} by ${operator.name}.`,
    }
    targetApp = apps[idx]
    saveAdminData(ADMIN_STORAGE_KEYS.APPLICATIONS, apps)
  } else {
    // Check customer storage for application details
    const customerApp = getCampaignApplications().find(a => a.id === applicationId)
    if (!customerApp) return false
    const campaigns = getCampaigns()
    const camp = campaigns.find(c => c.id === customerApp.campaignId)
    targetApp = {
      ...customerApp,
      status: decision,
      reviewedAt: new Date().toISOString(),
      reviewedBy: operator.email,
      reviewNote: note.trim() || `Application ${decision} by ${operator.name}.`,
      sportSpecialty: camp?.sport || 'Multi-Sport',
      city: camp?.locationCity || 'India',
      audienceFitScore: 86,
      engagementRatePercent: 4.8,
      authenticityRisk: 'low',
      proposedConcept: customerApp.pitchNote,
    }
    saveAdminData(ADMIN_STORAGE_KEYS.APPLICATIONS, [targetApp, ...apps])
  }

  recordCampaignAuditEvent({
    campaignId: targetApp.campaignId,
    actor: `${operator.name} (${operator.email})`,
    action: `admin_application_${decision}`,
    entityType: 'application',
    entityId: applicationId,
    reason: note.trim() || `Brand application marked as ${decision} for ${targetApp.creatorHandle}.`,
  })

  // Auto-provision Attribution Short-Link & Milestone Schedule upon acceptance/selection
  if (decision === 'accepted' || decision === 'selected') {
    provisionCreatorTrackingAndMilestones(targetApp)
  }

  return true
}

function provisionCreatorTrackingAndMilestones(app: AdminBrandApplication): void {
  const attrs = loadAdminData<SocialAttributionRecord[]>(
    ADMIN_STORAGE_KEYS.ATTRIBUTIONS,
    INITIAL_ATTRIBUTION_RECORDS,
  )
  const existingAttr = attrs.some(
    a => a.campaignId === app.campaignId && a.creatorId === app.creatorId,
  )

  const handleSlug = app.creatorHandle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'CREATOR'
  const campSlug = app.campaignId.replace(/^cmp-/, '').slice(0, 6).toUpperCase()

  if (!existingAttr) {
    const newAttr: SocialAttributionRecord = {
      id: `attr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      campaignId: app.campaignId,
      campaignTitle: app.campaignTitle,
      creatorId: app.creatorId,
      creatorName: app.creatorName,
      creatorHandle: app.creatorHandle,
      platform: app.platform,
      trackingCode: `KG-${campSlug}-${handleSlug}`,
      shortUrl: `https://khel.gg/c/${campSlug.toLowerCase()}/${handleSlug.toLowerCase()}`,
      utmTag: `utm_source=${app.platform}&utm_medium=creator&utm_campaign=${app.campaignId}&utm_content=${handleSlug.toLowerCase()}`,
      impressions: 0,
      videoViews: 0,
      engagements: 0,
      engagementRatePercent: 0,
      linkClicks: 0,
      ctrPercent: 0,
      verifiedTrialEnquiries: 0,
      verifiedAcademyEnrolments: 0,
      conversionRatePercent: 0,
      authenticityScore: app.authenticityRisk === 'low' ? 92 : 70,
      anomalyFlag: 'none',
      auditStatus: 'verified_organic',
      verifiedByAdmin: true,
      lastSyncedAt: new Date().toISOString(),
    }
    saveAdminData(ADMIN_STORAGE_KEYS.ATTRIBUTIONS, [newAttr, ...attrs])
  }

  const milestones = loadAdminData<CampaignMilestoneRecord[]>(
    ADMIN_STORAGE_KEYS.MILESTONES,
    INITIAL_MILESTONES,
  )
  const hasMilestones = milestones.some(
    m => m.campaignId === app.campaignId && m.creatorId === app.creatorId,
  )

  if (!hasMilestones) {
    const camp = getCampaigns().find(c => c.id === app.campaignId)
    const feePaise = camp?.perDeliverableFeePaise || 400000
    const m1Paise = Math.round(feePaise * 0.25)
    const m2Paise = Math.round(feePaise * 0.5)
    const m3Paise = feePaise - m1Paise - m2Paise
    const dueBase = new Date(Date.now() + 7 * 86400_000).toISOString()

    const generated: CampaignMilestoneRecord[] = [
      {
        id: `ms-${Date.now()}-m1`,
        campaignId: app.campaignId,
        campaignTitle: app.campaignTitle,
        creatorId: app.creatorId,
        creatorName: app.creatorName,
        creatorHandle: app.creatorHandle,
        milestoneCode: 'M1',
        stage: 'brief_lock',
        title: 'M1 · Brief Alignment & Mandatory #Ad Disclosure Lock',
        description: 'Review creator concept & confirm no guaranteed selection promises.',
        dueDate: dueBase,
        rewardSharePaise: m1Paise,
        status: 'pending_review',
        evidenceRef: `Tracking code KG-${campSlug}-${handleSlug} issued`,
      },
      {
        id: `ms-${Date.now()}-m2`,
        campaignId: app.campaignId,
        campaignTitle: app.campaignTitle,
        creatorId: app.creatorId,
        creatorName: app.creatorName,
        creatorHandle: app.creatorHandle,
        milestoneCode: 'M2',
        stage: 'creative_delivery',
        title: 'M2 · Canonical Creative Submission & Live Disclosure Check',
        description: 'Submit verified HTTPS social post link featuring mandatory #Ad or #Sponsored tag.',
        dueDate: new Date(Date.now() + 14 * 86400_000).toISOString(),
        rewardSharePaise: m2Paise,
        status: 'locked',
      },
      {
        id: `ms-${Date.now()}-m4`,
        campaignId: app.campaignId,
        campaignTitle: app.campaignTitle,
        creatorId: app.creatorId,
        creatorName: app.creatorName,
        creatorHandle: app.creatorHandle,
        milestoneCode: 'M4',
        stage: 'final_signoff',
        title: 'M4 · Final Attribution Audit & Ledger Escrow Entry',
        description: 'Verify organic attribution signals and credit contracted INR reward into immutable ledger.',
        dueDate: new Date(Date.now() + 21 * 86400_000).toISOString(),
        rewardSharePaise: m3Paise,
        status: 'locked',
      },
    ]

    saveAdminData(ADMIN_STORAGE_KEYS.MILESTONES, [...generated, ...milestones])
  }
}

export function reviewCreativeDeliverable(
  submissionId: string,
  decision: 'accepted' | 'revision_requested' | 'rejected',
  operator: OperatorActor,
  note: string,
): boolean {
  const defaultNote =
    decision === 'accepted'
      ? 'Verified canonical post URL and compliant #Ad sponsorship disclosure.'
      : decision === 'revision_requested'
        ? 'Revision required: ensure prominent #Ad / #Sponsored disclosure and working UTM short-link.'
        : 'Deliverable rejected due to policy or authenticity non-compliance.'

  return reviewDeliverable(submissionId, decision, operator.name, note.trim() || defaultNote)
}

export function auditSocialAttribution(
  attributionId: string,
  decision: AttributionAuditStatus,
  operator: OperatorActor,
  note: string,
  overrideAnomalyFlag?: AttributionAnomalyFlag,
): boolean {
  const records = loadAdminData<SocialAttributionRecord[]>(
    ADMIN_STORAGE_KEYS.ATTRIBUTIONS,
    INITIAL_ATTRIBUTION_RECORDS,
  )
  const idx = records.findIndex(r => r.id === attributionId)
  if (idx === -1) return false

  const target = records[idx]
  records[idx] = {
    ...target,
    auditStatus: decision,
    verifiedByAdmin: decision === 'verified_organic',
    anomalyFlag:
      overrideAnomalyFlag !== undefined
        ? overrideAnomalyFlag
        : decision === 'verified_organic'
          ? 'none'
          : target.anomalyFlag === 'none'
            ? 'sudden_bot_spike'
            : target.anomalyFlag,
    anomalyDetails: note.trim() || target.anomalyDetails,
    lastSyncedAt: new Date().toISOString(),
  }

  saveAdminData(ADMIN_STORAGE_KEYS.ATTRIBUTIONS, records)

  recordCampaignAuditEvent({
    campaignId: target.campaignId,
    actor: `${operator.name} (${operator.email})`,
    action: `attribution_${decision}`,
    entityType: 'campaign',
    entityId: attributionId,
    reason: note.trim() || `Attribution tracking ${target.trackingCode} marked as ${decision}.`,
  })

  return true
}

export function verifyCampaignMilestone(
  milestoneId: string,
  decision: 'approved' | 'revision_requested' | 'blocked_anomaly',
  operator: OperatorActor,
  note: string,
): boolean {
  const milestones = loadAdminData<CampaignMilestoneRecord[]>(
    ADMIN_STORAGE_KEYS.MILESTONES,
    INITIAL_MILESTONES,
  )
  const idx = milestones.findIndex(m => m.id === milestoneId)
  if (idx === -1) return false

  const target = milestones[idx]
  milestones[idx] = {
    ...target,
    status: decision,
    reviewedBy: operator.email,
    reviewedAt: new Date().toISOString(),
    reviewNote: note.trim() || `Milestone ${target.milestoneCode} marked as ${decision}.`,
  }

  // Unlock next sequential milestone in same (campaignId, creatorId) track when approved
  if (decision === 'approved') {
    const order = ['M1', 'M2', 'M3', 'M4']
    const nextCode = order[order.indexOf(target.milestoneCode) + 1]
    if (nextCode) {
      const nextIdx = milestones.findIndex(
        m =>
          m.campaignId === target.campaignId &&
          m.creatorId === target.creatorId &&
          m.milestoneCode === nextCode &&
          m.status === 'locked',
      )
      if (nextIdx >= 0) {
        milestones[nextIdx] = {
          ...milestones[nextIdx],
          status: 'pending_review',
        }
      }
    }

    // Record verified milestone ledger credit in INR paise (respecting payment lockdown)
    appendRewardLedgerEntry({
      creatorId: target.creatorId,
      campaignId: target.campaignId,
      amountPaise: target.rewardSharePaise,
      currency: 'INR',
      status: 'approved',
      description: `Milestone ${target.milestoneCode} verified: ${target.campaignTitle}`,
      payoutLockdownNote: `Milestone verified by ${operator.name}. Credited to immutable INR escrow ledger (direct disbursements paused).`,
    })
  }

  saveAdminData(ADMIN_STORAGE_KEYS.MILESTONES, milestones)

  recordCampaignAuditEvent({
    campaignId: target.campaignId,
    actor: `${operator.name} (${operator.email})`,
    action: `milestone_${decision}`,
    entityType: 'reward',
    entityId: milestoneId,
    reason: note.trim() || `Milestone ${target.milestoneCode} for ${target.creatorHandle} updated to ${decision}.`,
  })

  return true
}

export function toggleCreatorVerificationStatus(
  creatorId: string,
  verified: boolean,
  operator: OperatorActor,
  note?: string,
): boolean {
  const roster = loadAdminData<ExtendedCreatorRosterItem[]>(
    ADMIN_STORAGE_KEYS.CREATORS,
    INITIAL_EXTENDED_CREATORS,
  )
  const idx = roster.findIndex(c => c.id === creatorId)
  if (idx === -1) return false

  roster[idx] = {
    ...roster[idx],
    isVerifiedCreator: verified,
    kyiStatus: verified ? 'verified' : 'pending_review',
    riskNote: note || roster[idx].riskNote,
  }
  saveAdminData(ADMIN_STORAGE_KEYS.CREATORS, roster)

  // Keep primary campaignClient creator synced if applicable
  const baseCreator = getCreatorProfile(creatorId)
  if (baseCreator.id === creatorId) {
    saveCreatorProfile({
      ...baseCreator,
      isVerifiedCreator: verified,
    })
  }

  recordCampaignAuditEvent({
    campaignId: 'system-creator-kyi',
    actor: `${operator.name} (${operator.email})`,
    action: verified ? 'creator_kyi_verified' : 'creator_kyi_revoked',
    entityType: 'campaign',
    entityId: creatorId,
    reason: note || `Creator ${roster[idx].handle} KYI verification set to ${verified ? 'VERIFIED' : 'REVOKED'}.`,
  })

  return true
}

export function arbitrateCampaignDispute(
  disputeId: string,
  resolution: 'creator_favored' | 'advertiser_favored' | 'split',
  operator: OperatorActor,
  note: string,
): boolean {
  return resolveCampaignDispute(
    disputeId,
    resolution,
    note.trim() || `Resolved via Creator & Attribution Desk (${resolution.replace('_', ' ')}).`,
    operator.name,
  )
}

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const raw = value === undefined || value === null ? '' : String(value)
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function exportCreatorOpsLedgerToCsv(snapshot: CreatorOpsDashboardSnapshot): string {
  const headers = [
    'Record Type',
    'ID',
    'Campaign Title',
    'Creator Name',
    'Creator Handle',
    'Tracking / Code',
    'Metric / Value',
    'Amount (INR)',
    'Status / Audit State',
    'Timestamp / Due',
  ]

  const rows: string[][] = []

  for (const attr of snapshot.attributions) {
    rows.push([
      'ATTRIBUTION',
      attr.id,
      attr.campaignTitle,
      attr.creatorName,
      attr.creatorHandle,
      attr.trackingCode,
      `${attr.linkClicks} clicks / ${attr.verifiedTrialEnquiries} enquiries (${attr.ctrPercent.toFixed(2)}% CTR · Auth ${attr.authenticityScore}/100)`,
      '-',
      `${attr.auditStatus} (${attr.anomalyFlag})`,
      attr.lastSyncedAt,
    ])
  }

  for (const ms of snapshot.milestones) {
    rows.push([
      'MILESTONE',
      ms.id,
      ms.campaignTitle,
      ms.creatorName,
      ms.creatorHandle,
      ms.milestoneCode,
      ms.title,
      formatPaiseToInr(ms.rewardSharePaise),
      ms.status,
      ms.dueDate,
    ])
  }

  for (const ledg of snapshot.rewardLedger) {
    rows.push([
      'LEDGER_ENTRY',
      ledg.id,
      ledg.campaignId,
      ledg.creatorId,
      '-',
      ledg.currency,
      ledg.description,
      formatPaiseToInr(ledg.amountPaise),
      ledg.status,
      ledg.updatedAt,
    ])
  }

  return [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
}

export function resetAdminCreatorOpsForTesting(): void {
  resetCampaignStorageForTesting()
  adminMemoryStore.clear()
  if (typeof localStorage !== 'undefined') {
    try {
      Object.values(ADMIN_STORAGE_KEYS).forEach(k => localStorage.removeItem(k))
    } catch {
      // ignore
    }
  }
}
