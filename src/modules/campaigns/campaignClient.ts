/**
 * KhelGrid Sports Creator Campaign Marketplace — Core Client & Service Layer
 * 
 * Provides state management, campaign briefs, creator selection, deliverable review,
 * append-only reward ledgers, and audit trails.
 * 
 * Principles:
 * - Currency strictly represented in integer minor units (paise for INR; 100 paise = ₹1.00)
 * - Zero artificial engagement payouts (no pay-per-view, no paid likes/subscribers)
 * - Mandatory advertising disclosures (#Ad, #Sponsored, #KhelGridPartner)
 * - Canonical social platform URL validation
 * - Immutable, append-only ledger entries for rewards
 */

export type CampaignStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'rejected'

export type CompensationModel =
  | 'fixed_deliverable'
  | 'fixed_package'
  | 'retainer'
  | 'shared_pool'
  | 'outcome_bonus'

export type DeliverableType =
  | 'reel_short'
  | 'full_video'
  | 'photo_carousel'
  | 'story_package'
  | 'article_interview'
  | 'event_coverage'

export type SocialPlatform = 'youtube' | 'instagram' | 'x_twitter' | 'linkedin' | 'facebook'

export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'selected'
  | 'declined'
  | 'withdrawn'
  | 'accepted'

export type DeliverableStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'accepted'
  | 'rejected'
  | 'disputed'

export type RewardStatus =
  | 'not_eligible'
  | 'pending_review'
  | 'approved'
  | 'on_hold'
  | 'payable'
  | 'paid'
  | 'reversed'
  | 'disputed'

export type CampaignCategory =
  | 'academy_admissions'
  | 'coaching_clinic'
  | 'brand_story'
  | 'tournament_awareness'
  | 'venue_showcase'
  | 'opportunity_distribution'

export type AdvertiserRole =
  | 'academy'
  | 'coach'
  | 'venue'
  | 'tournament'
  | 'sports_brand'
  | 'federation'
  | 'khelgrid'

export type DeliverableSpec = CampaignDeliverableSpec

export interface CampaignDeliverableSpec {
  id: string
  type: DeliverableType
  title: string
  quantity: number
  description: string
  formatSpec?: string
  requiredHashtags: string[]
  mandatoryDisclosure: string
  deadlineDays: number
}

export interface Campaign {
  id: string
  slug: string
  title: string
  purpose: string
  category: CampaignCategory
  sport: string
  locationCity: string
  language: string
  advertiserName: string
  advertiserRole: AdvertiserRole
  advertiserVerified: boolean
  advertiserContact: string
  status: CampaignStatus
  compensationModel: CompensationModel
  perDeliverableFeePaise: number // Integer minor units (e.g., 500000 = ₹5,000)
  totalBudgetPaise: number       // Integer minor units (e.g., 5000000 = ₹50,000)
  deliverables: CampaignDeliverableSpec[]
  keyMessages: string[]
  prohibitedClaims: string[]
  targetAudience: string
  requiredChannels: SocialPlatform[]
  termsAndConditions: string
  moderationNotes?: string
  createdAt: string
  publishedAt?: string
  deadlineAt: string
}

export interface CampaignApplication {
  id: string
  campaignId: string
  campaignTitle: string
  creatorId: string
  creatorName: string
  creatorHandle: string
  platform: SocialPlatform
  followerCount: number
  portfolioLink?: string
  pitchNote: string
  status: ApplicationStatus
  appliedAt: string
  reviewedAt?: string
  reviewNote?: string
}

export interface DeliverableSubmission {
  id: string
  campaignId: string
  campaignTitle: string
  creatorId: string
  creatorName: string
  deliverableSpecId: string
  deliverableType: DeliverableType
  canonicalPostUrl: string
  platform: SocialPlatform
  evidenceScreenshotUrl?: string
  disclosureVerified: boolean
  status: DeliverableStatus
  reviewNotes?: string
  rewardAmountPaise: number
  submittedAt: string
  reviewedAt?: string
}

export interface CreatorProfile {
  id: string
  userId: string
  displayName: string
  handle: string
  bio: string
  primarySport: string
  platforms: {
    platform: SocialPlatform
    handle: string
    channelUrl: string
    followerCount: number
    isVerified: boolean
  }[]
  locationCity: string
  languages: string[]
  isVerifiedCreator: boolean
  totalEarningsPaise: number
  completedDeliverablesCount: number
  joinedAt: string
}

export interface RewardLedgerEntry {
  id: string
  creatorId: string
  campaignId: string
  deliverableSubmissionId?: string
  amountPaise: number
  currency: 'INR'
  status: RewardStatus
  description: string
  payoutLockdownNote: string
  createdAt: string
  updatedAt: string
}

export interface CampaignAuditEvent {
  id: string
  campaignId: string
  actor: string
  action: string
  entityType: 'campaign' | 'application' | 'deliverable' | 'reward'
  entityId: string
  reason?: string
  timestamp: string
}

// STORAGE KEYS
const STORAGE_KEYS = {
  CAMPAIGNS: 'khelgrid_creator_campaigns',
  APPLICATIONS: 'khelgrid_creator_applications',
  SUBMISSIONS: 'khelgrid_creator_submissions',
  CREATORS: 'khelgrid_creator_profiles',
  REWARD_LEDGER: 'khelgrid_creator_reward_ledger',
  AUDIT_LOGS: 'khelgrid_creator_audit_logs',
}

// INITIAL SEED DATA: Realistic Sports Creator Campaigns across India
const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'cmp-dca-summer-2026',
    slug: 'delhi-cricket-academy-summer-trials-2026',
    title: 'Delhi Cricket Academy — High Performance Summer Trials 2026',
    purpose: 'Promote verified grassroots cricket summer camp admissions across North India for U14 and U17 talent.',
    category: 'academy_admissions',
    sport: 'Cricket',
    locationCity: 'Delhi NCR',
    language: 'Hindi / English',
    advertiserName: 'Delhi Cricket Academy',
    advertiserRole: 'academy',
    advertiserVerified: true,
    advertiserContact: 'director@delhicricket.com',
    status: 'published',
    compensationModel: 'fixed_deliverable',
    perDeliverableFeePaise: 400000, // ₹4,000 per accepted Reel/Short
    totalBudgetPaise: 4000000,      // ₹40,000 pool
    deliverables: [
      {
        id: 'deliv-dca-1',
        type: 'reel_short',
        title: 'Pitch-side Trial Day Walkthrough Reel/Short',
        quantity: 1,
        description: 'Create a 45-60s dynamic Reel or YouTube Short showcasing nets training drills, bowling machines, and admission walkthrough.',
        requiredHashtags: ['#DelhiCricket', '#KhelGridTrials', '#GrassrootsCricket'],
        mandatoryDisclosure: 'Paid partnership with Delhi Cricket Academy · #Ad #Sponsored',
        deadlineDays: 14,
      },
    ],
    keyMessages: [
      'BCCI Level-3 certified head coach oversight',
      'Turf nets and video biomechanics analytics included in summer intake',
      'Direct link to KhelGrid verified academy profile for trial pass booking',
    ],
    prohibitedClaims: [
      'Do not guarantee IPL or Ranji Trophy selections',
      'Do not claim government quota admission guarantees',
    ],
    targetAudience: 'Parents, aspiring youth cricketers aged 12-19 in Delhi NCR & Haryana',
    requiredChannels: ['instagram', 'youtube'],
    termsAndConditions: 'Creator must submit canonical published post URL within 14 days of acceptance. Content must remain public for at least 90 days. Mandatory #Ad disclosure must be prominent in caption.',
    createdAt: '2026-11-20T10:00:00Z',
    publishedAt: '2026-11-21T09:00:00Z',
    deadlineAt: '2026-12-15T18:30:00Z',
  },
  {
    id: 'cmp-bbfs-football-camp',
    slug: 'bhaichung-bhutia-football-schools-selection-combine',
    title: 'BBFS National Youth Football Combine & Residential Scholarship',
    purpose: 'Highlight U13 & U15 football scholarship trials across Bangalore, Kolkata, and Mumbai facilities.',
    category: 'academy_admissions',
    sport: 'Football',
    locationCity: 'Bengaluru',
    language: 'English / Regional',
    advertiserName: 'Bhaichung Bhutia Football Schools',
    advertiserRole: 'academy',
    advertiserVerified: true,
    advertiserContact: 'admissions@bbfs.in',
    status: 'published',
    compensationModel: 'fixed_deliverable',
    perDeliverableFeePaise: 600000, // ₹6,000 per accepted deliverable
    totalBudgetPaise: 6000000,      // ₹60,000
    deliverables: [
      {
        id: 'deliv-bbfs-1',
        type: 'reel_short',
        title: 'Football Skills Assessment & Scholarship Notice',
        quantity: 1,
        description: 'High-energy 60-second video demonstrating agility combine drills and eligibility guidelines for full residential scholarship.',
        requiredHashtags: ['#IndianFootball', '#BBFSScholarship', '#KhelGridFootball'],
        mandatoryDisclosure: 'In collaboration with Bhaichung Bhutia Football Schools · #Ad',
        deadlineDays: 10,
      },
    ],
    keyMessages: [
      'AIFF 4-star certified residential academy curriculum',
      '100% merit-based scholarships available for top 1% combine performers',
      'Authentic trial registration exclusively via KhelGrid canonical listing',
    ],
    prohibitedClaims: [
      'Do not claim guaranteed ISL draft',
      'Do not use unlicensed professional league match footage',
    ],
    targetAudience: 'Football players aged 11-16, football fans, sports parents',
    requiredChannels: ['instagram', 'youtube'],
    termsAndConditions: 'All videos must depict fair play, certified football equipment, and proper pitch safety attire.',
    createdAt: '2026-11-21T11:00:00Z',
    publishedAt: '2026-11-21T14:00:00Z',
    deadlineAt: '2026-12-20T18:30:00Z',
  },
  {
    id: 'cmp-khelgrid-open-trials',
    slug: 'khelgrid-verified-grassroots-trials-distribution',
    title: 'KhelGrid National Initiative — Discover Verified Free Sports Trials',
    purpose: 'Educational creator campaign explaining how young athletes across Tier 2 & Tier 3 cities can discover 100% free verified sports trials without middleman agent scams.',
    category: 'opportunity_distribution',
    sport: 'Multi-Sport',
    locationCity: 'All India',
    language: 'Hindi / English / Marathi / Bengali / Tamil',
    advertiserName: 'KhelGrid Sports Foundation',
    advertiserRole: 'khelgrid',
    advertiserVerified: true,
    advertiserContact: 'editorial@khelgrid.com',
    status: 'published',
    compensationModel: 'fixed_deliverable',
    perDeliverableFeePaise: 500000, // ₹5,000 per deliverable
    totalBudgetPaise: 10000000,     // ₹1,00,000 pool
    deliverables: [
      {
        id: 'deliv-kg-1',
        type: 'reel_short',
        title: 'Sports CV & Scam-Free Trials Explainer',
        quantity: 1,
        description: 'Explain to young athletes how to generate their verified Sports CV and apply for trials with zero agent fees.',
        requiredHashtags: ['#KhelGrid', '#KheloIndia', '#GrassrootsSports', '#SportsCV'],
        mandatoryDisclosure: 'Commissioned by KhelGrid National Sports Infrastructure · #Sponsored',
        deadlineDays: 20,
      },
    ],
    keyMessages: [
      'KhelGrid trial listings are 100% free for athletes and families',
      'Sports CV PDF export is completely private and free of charge',
      'Never pay unverified agents for government trials',
    ],
    prohibitedClaims: [
      'No artificial follower or view buying',
      'No false claims of SAI employment guarantees',
    ],
    targetAudience: 'Athletes, school students, coaches, sports creators across India',
    requiredChannels: ['youtube', 'instagram', 'x_twitter'],
    termsAndConditions: 'Compliant with ASCI influencer guidelines. Genuine educational narrative required.',
    createdAt: '2026-11-22T08:00:00Z',
    publishedAt: '2026-11-22T09:00:00Z',
    deadlineAt: '2026-12-31T23:59:00Z',
  },
]

const INITIAL_CREATOR_PROFILES: CreatorProfile[] = [
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
    totalEarningsPaise: 1600000, // ₹16,000
    completedDeliverablesCount: 4,
    joinedAt: '2026-10-15T12:00:00Z',
  },
]

export const INITIAL_REWARD_LEDGER: RewardLedgerEntry[] = [
  {
    id: 'ledg-sample-1',
    creatorId: 'creator-rohan-cricket',
    campaignId: 'cmp-dca-summer-2026',
    amountPaise: 400000,
    currency: 'INR',
    status: 'approved',
    description: 'Accepted deliverable: Pitch-side Trial Day Walkthrough Reel/Short',
    payoutLockdownNote: 'Simulated sandbox balance; live banking payouts remain safely paused.',
    createdAt: '2026-11-21T16:00:00Z',
    updatedAt: '2026-11-21T16:00:00Z',
  },
]

// In-memory fallback cache to guarantee safe operation across SSR, Node/Vitest, and browser
const memoryStorage = new Map<string, string>()

export function resetCampaignStorageForTesting(): void {
  memoryStorage.clear()
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.clear()
    } catch {
      // ignore
    }
  }
}

// HELPER: Safely load from localStorage or in-memory fallback
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    }
  } catch {
    // fallback to memoryStorage
  }

  const memRaw = memoryStorage.get(key)
  if (memRaw) {
    try {
      return JSON.parse(memRaw) as T
    } catch {
      return fallback
    }
  }

  return fallback
}

// HELPER: Safely save to localStorage and in-memory fallback
function saveToStorage<T>(key: string, data: T): void {
  const serialized = JSON.stringify(data)
  memoryStorage.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch (err) {
    console.warn(`[CampaignClient] Failed to save key "${key}" to localStorage:`, err)
  }
}

/**
 * Format paise into Indian Rupee string (e.g. 500000 paise -> ₹5,000)
 */
export function formatPaiseToInr(paise: number): string {
  const rupees = Math.floor(paise / 100)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees)
}

/**
 * Validates whether a submitted URL belongs to a canonical social media domain
 */
export function validateCanonicalSocialUrl(url: string, platform: SocialPlatform): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim().toLowerCase()
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:') return false

    if (platform === 'youtube') {
      return (
        parsed.hostname === 'youtube.com' ||
        parsed.hostname === 'www.youtube.com' ||
        parsed.hostname === 'youtu.be'
      )
    }
    if (platform === 'instagram') {
      return parsed.hostname === 'instagram.com' || parsed.hostname === 'www.instagram.com'
    }
    if (platform === 'x_twitter') {
      return (
        parsed.hostname === 'x.com' ||
        parsed.hostname === 'www.x.com' ||
        parsed.hostname === 'twitter.com' ||
        parsed.hostname === 'www.twitter.com'
      )
    }
    if (platform === 'linkedin') {
      return parsed.hostname === 'linkedin.com' || parsed.hostname === 'www.linkedin.com'
    }
    if (platform === 'facebook') {
      return parsed.hostname === 'facebook.com' || parsed.hostname === 'www.facebook.com'
    }
    return true
  } catch {
    return false
  }
}

// -------------------------------------------------------------------------
// CAMPAIGN REPOSITORY APIS
// -------------------------------------------------------------------------

export function getCampaigns(filters?: {
  sport?: string
  category?: string
  status?: CampaignStatus
  advertiserRole?: string
}): Campaign[] {
  const all = loadFromStorage<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS)
  return all.filter(c => {
    if (filters?.sport && filters.sport !== 'All' && c.sport.toLowerCase() !== filters.sport.toLowerCase()) return false
    if (filters?.category && filters.category !== 'All' && c.category !== filters.category) return false
    if (filters?.status && c.status !== filters.status) return false
    if (filters?.advertiserRole && c.advertiserRole !== filters.advertiserRole) return false
    return true
  })
}

export function getCampaignById(id: string): Campaign | null {
  const all = getCampaigns()
  return all.find(c => c.id === id || c.slug === id) || null
}

export function createCampaign(params: Omit<Campaign, 'id' | 'slug' | 'createdAt' | 'status'> & { status?: CampaignStatus }): Campaign {
  const existing = loadFromStorage<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS)
  const baseSlug = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `campaign-${Date.now()}`

  const newCampaign: Campaign = {
    ...params,
    id: `cmp-${Date.now()}`,
    slug: `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`,
    status: params.status || 'submitted', // Sent for KhelGrid Admin moderation review
    createdAt: new Date().toISOString(),
  }

  const updated = [newCampaign, ...existing]
  saveToStorage(STORAGE_KEYS.CAMPAIGNS, updated)

  // Append audit event
  recordCampaignAuditEvent({
    campaignId: newCampaign.id,
    actor: params.advertiserName,
    action: 'campaign_created',
    entityType: 'campaign',
    entityId: newCampaign.id,
    reason: `Advertiser created campaign brief with total budget of ${formatPaiseToInr(params.totalBudgetPaise)}.`,
  })

  return newCampaign
}

export function updateCampaignStatus(
  campaignId: string,
  newStatus: CampaignStatus,
  reviewerName = 'KhelGrid Admin Moderator',
  reason?: string
): boolean {
  const existing = loadFromStorage<Campaign[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS)
  const index = existing.findIndex(c => c.id === campaignId)
  if (index === -1) return false

  const updated = [...existing]
  updated[index] = {
    ...updated[index],
    status: newStatus,
    publishedAt: newStatus === 'published' ? new Date().toISOString() : updated[index].publishedAt,
    moderationNotes: reason || updated[index].moderationNotes,
  }

  saveToStorage(STORAGE_KEYS.CAMPAIGNS, updated)

  recordCampaignAuditEvent({
    campaignId,
    actor: reviewerName,
    action: `campaign_status_${newStatus}`,
    entityType: 'campaign',
    entityId: campaignId,
    reason: reason || `Campaign status updated to ${newStatus}.`,
  })

  return true
}

// -------------------------------------------------------------------------
// CREATOR APPLICATION APIS
// -------------------------------------------------------------------------

export function getCampaignApplications(filter?: { campaignId?: string; creatorId?: string }): CampaignApplication[] {
  const all = loadFromStorage<CampaignApplication[]>(STORAGE_KEYS.APPLICATIONS, [])
  return all.filter(a => {
    if (filter?.campaignId && a.campaignId !== filter.campaignId) return false
    if (filter?.creatorId && a.creatorId !== filter.creatorId) return false
    return true
  })
}

export function applyToCampaign(params: {
  campaignId: string
  creatorId: string
  creatorName: string
  creatorHandle: string
  platform: SocialPlatform
  followerCount: number
  portfolioLink?: string
  pitchNote: string
}): { success: boolean; application?: CampaignApplication; message: string } {
  const campaign = getCampaignById(params.campaignId)
  if (!campaign) {
    return { success: false, message: 'Campaign not found' }
  }

  const existing = loadFromStorage<CampaignApplication[]>(STORAGE_KEYS.APPLICATIONS, [])
  const alreadyApplied = existing.some(a => a.campaignId === params.campaignId && a.creatorId === params.creatorId)
  if (alreadyApplied) {
    return { success: false, message: 'You have already applied to this sports campaign.' }
  }

  const newApp: CampaignApplication = {
    id: `app-${Date.now()}`,
    campaignId: params.campaignId,
    campaignTitle: campaign.title,
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    creatorHandle: params.creatorHandle,
    platform: params.platform,
    followerCount: params.followerCount,
    portfolioLink: params.portfolioLink,
    pitchNote: params.pitchNote,
    status: 'applied',
    appliedAt: new Date().toISOString(),
  }

  saveToStorage(STORAGE_KEYS.APPLICATIONS, [newApp, ...existing])

  recordCampaignAuditEvent({
    campaignId: params.campaignId,
    actor: params.creatorName,
    action: 'creator_application_submitted',
    entityType: 'application',
    entityId: newApp.id,
    reason: `Creator applied for campaign with ${params.platform} handle ${params.creatorHandle}.`,
  })

  return { success: true, application: newApp, message: 'Application submitted successfully to campaign owner!' }
}

export function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  reviewerName = 'Campaign Director',
  note?: string
): boolean {
  const existing = loadFromStorage<CampaignApplication[]>(STORAGE_KEYS.APPLICATIONS, [])
  const index = existing.findIndex(a => a.id === applicationId)
  if (index === -1) return false

  const updated = [...existing]
  updated[index] = {
    ...updated[index],
    status: newStatus,
    reviewedAt: new Date().toISOString(),
    reviewNote: note,
  }

  saveToStorage(STORAGE_KEYS.APPLICATIONS, updated)

  recordCampaignAuditEvent({
    campaignId: updated[index].campaignId,
    actor: reviewerName,
    action: `application_${newStatus}`,
    entityType: 'application',
    entityId: applicationId,
    reason: note || `Application marked as ${newStatus}.`,
  })

  return true
}

// -------------------------------------------------------------------------
// DELIVERABLE SUBMISSION & REVIEW APIS
// -------------------------------------------------------------------------

export function getDeliverableSubmissions(filter?: { campaignId?: string; creatorId?: string }): DeliverableSubmission[] {
  const all = loadFromStorage<DeliverableSubmission[]>(STORAGE_KEYS.SUBMISSIONS, [])
  return all.filter(s => {
    if (filter?.campaignId && s.campaignId !== filter.campaignId) return false
    if (filter?.creatorId && s.creatorId !== filter.creatorId) return false
    return true
  })
}

export function submitDeliverable(params: {
  campaignId: string
  creatorId: string
  creatorName: string
  deliverableSpecId: string
  deliverableType: DeliverableType
  canonicalPostUrl: string
  platform: SocialPlatform
  evidenceScreenshotUrl?: string
  disclosureVerified: boolean
}): { success: boolean; submission?: DeliverableSubmission; message: string } {
  // Validate canonical domain
  const isValidUrl = validateCanonicalSocialUrl(params.canonicalPostUrl, params.platform)
  if (!isValidUrl) {
    return {
      success: false,
      message: `Invalid canonical URL. Please enter an authentic ${params.platform} URL starting with https://.`,
    }
  }

  if (!params.disclosureVerified) {
    return {
      success: false,
      message: 'You must confirm that required sponsorship disclosures (#Ad, #Sponsored) are included in the post.',
    }
  }

  const campaign = getCampaignById(params.campaignId)
  if (!campaign) return { success: false, message: 'Campaign not found' }

  const existing = loadFromStorage<DeliverableSubmission[]>(STORAGE_KEYS.SUBMISSIONS, [])

  const newSub: DeliverableSubmission = {
    id: `sub-${Date.now()}`,
    campaignId: params.campaignId,
    campaignTitle: campaign.title,
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    deliverableSpecId: params.deliverableSpecId,
    deliverableType: params.deliverableType,
    canonicalPostUrl: params.canonicalPostUrl.trim(),
    platform: params.platform,
    evidenceScreenshotUrl: params.evidenceScreenshotUrl,
    disclosureVerified: params.disclosureVerified,
    status: 'submitted',
    rewardAmountPaise: campaign.perDeliverableFeePaise,
    submittedAt: new Date().toISOString(),
  }

  saveToStorage(STORAGE_KEYS.SUBMISSIONS, [newSub, ...existing])

  recordCampaignAuditEvent({
    campaignId: params.campaignId,
    actor: params.creatorName,
    action: 'deliverable_submitted',
    entityType: 'deliverable',
    entityId: newSub.id,
    reason: `Submitted post link ${params.canonicalPostUrl} for verification.`,
  })

  return { success: true, submission: newSub, message: 'Deliverable submitted for advertiser & moderator review.' }
}

export function reviewDeliverable(
  submissionId: string,
  decision: 'accepted' | 'revision_requested' | 'rejected',
  reviewerName = 'Campaign Owner',
  reviewNotes?: string
): boolean {
  const existing = loadFromStorage<DeliverableSubmission[]>(STORAGE_KEYS.SUBMISSIONS, [])
  const index = existing.findIndex(s => s.id === submissionId)
  if (index === -1) return false

  const target = existing[index]
  const updated = [...existing]
  updated[index] = {
    ...target,
    status: decision,
    reviewNotes,
    reviewedAt: new Date().toISOString(),
  }

  saveToStorage(STORAGE_KEYS.SUBMISSIONS, updated)

  // If accepted, generate an append-only reward ledger entry
  if (decision === 'accepted') {
    appendRewardLedgerEntry({
      creatorId: target.creatorId,
      campaignId: target.campaignId,
      deliverableSubmissionId: target.id,
      amountPaise: target.rewardAmountPaise,
      currency: 'INR',
      status: 'approved',
      description: `Contracted deliverable accepted: ${target.campaignTitle} (${target.deliverableType})`,
      payoutLockdownNote: 'Payout scheduled upon platform payment unfreeze. 100% compliant contracted deliverable.',
    })
  }

  recordCampaignAuditEvent({
    campaignId: target.campaignId,
    actor: reviewerName,
    action: `deliverable_${decision}`,
    entityType: 'deliverable',
    entityId: submissionId,
    reason: reviewNotes || `Deliverable decision: ${decision}.`,
  })

  return true
}

// -------------------------------------------------------------------------
// APPEND-ONLY REWARD LEDGER APIS
// -------------------------------------------------------------------------

export function getRewardLedger(creatorId?: string): RewardLedgerEntry[] {
  const all = loadFromStorage<RewardLedgerEntry[]>(STORAGE_KEYS.REWARD_LEDGER, INITIAL_REWARD_LEDGER)
  if (creatorId) {
    return all.filter(l => l.creatorId === creatorId)
  }
  return all
}

export function appendRewardLedgerEntry(params: Omit<RewardLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>): RewardLedgerEntry {
  const existing = loadFromStorage<RewardLedgerEntry[]>(STORAGE_KEYS.REWARD_LEDGER, INITIAL_REWARD_LEDGER)
  const newEntry: RewardLedgerEntry = {
    ...params,
    id: `ledg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  saveToStorage(STORAGE_KEYS.REWARD_LEDGER, [newEntry, ...existing])

  recordCampaignAuditEvent({
    campaignId: params.campaignId,
    actor: 'System Finance Controller',
    action: 'reward_ledger_appended',
    entityType: 'reward',
    entityId: newEntry.id,
    reason: `Appended approved reward of ${formatPaiseToInr(params.amountPaise)} for creator ${params.creatorId}.`,
  })

  return newEntry
}

// -------------------------------------------------------------------------
// CREATOR PROFILE APIS
// -------------------------------------------------------------------------

export function getCreatorProfile(userId?: string): CreatorProfile {
  const all = loadFromStorage<CreatorProfile[]>(STORAGE_KEYS.CREATORS, INITIAL_CREATOR_PROFILES)
  if (userId) {
    const match = all.find(c => c.userId === userId || c.id === userId)
    if (match) return match
  }
  return all[0] || {
    id: 'creator-guest',
    userId: 'usr-guest',
    displayName: 'Guest Sports Creator',
    handle: '@khelgrid_creator',
    bio: 'Independent grassroots sports storyteller.',
    primarySport: 'Cricket',
    platforms: [],
    locationCity: 'Delhi NCR',
    languages: ['Hindi', 'English'],
    isVerifiedCreator: false,
    totalEarningsPaise: 0,
    completedDeliverablesCount: 0,
    joinedAt: new Date().toISOString(),
  }
}

export function saveCreatorProfile(profile: CreatorProfile): void {
  const all = loadFromStorage<CreatorProfile[]>(STORAGE_KEYS.CREATORS, INITIAL_CREATOR_PROFILES)
  const index = all.findIndex(c => c.id === profile.id)
  let updated: CreatorProfile[]
  if (index >= 0) {
    updated = [...all]
    updated[index] = profile
  } else {
    updated = [profile, ...all]
  }
  saveToStorage(STORAGE_KEYS.CREATORS, updated)
}

// -------------------------------------------------------------------------
// AUDIT LOG APIS
// -------------------------------------------------------------------------

export function getCampaignAuditEvents(campaignId?: string): CampaignAuditEvent[] {
  const all = loadFromStorage<CampaignAuditEvent[]>(STORAGE_KEYS.AUDIT_LOGS, [])
  if (campaignId) {
    return all.filter(e => e.campaignId === campaignId)
  }
  return all
}

export function recordCampaignAuditEvent(event: Omit<CampaignAuditEvent, 'id' | 'timestamp'>): void {
  const all = loadFromStorage<CampaignAuditEvent[]>(STORAGE_KEYS.AUDIT_LOGS, [])
  const newEvent: CampaignAuditEvent = {
    ...event,
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  }
  saveToStorage(STORAGE_KEYS.AUDIT_LOGS, [newEvent, ...all])
}
