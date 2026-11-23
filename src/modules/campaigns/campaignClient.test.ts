import { describe, expect, it, beforeEach } from 'vitest'
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaignStatus,
  applyToCampaign,
  updateApplicationStatus,
  submitDeliverable,
  reviewDeliverable,
  getRewardLedger,
  formatPaiseToInr,
  validateCanonicalSocialUrl,
  getCampaignAuditEvents,
  getCreatorProfile,
  saveCreatorProfile,
  resetCampaignStorageForTesting,
  validateDeliverableUrl,
  scanCampaignPolicyCompliance,
  getCampaignBudgetBreakdown,
  getCreatorEarningsSummary,
  fileCampaignDispute,
  resolveCampaignDispute,
  getCampaignDisputes,
  authorizeRewardPayoutBatch,
} from './campaignClient'

describe('KhelGrid Sports Creator Campaign Marketplace — Client Engine', () => {
  beforeEach(() => {
    resetCampaignStorageForTesting()
  })

  describe('Financial Invariants & Formatting', () => {
    it('formats integer paise into Indian Rupee strings with currency symbol', () => {
      expect(formatPaiseToInr(500000)).toMatch(/₹\s*5,000/)
      expect(formatPaiseToInr(400000)).toMatch(/₹\s*4,000/)
      expect(formatPaiseToInr(10000000)).toMatch(/₹\s*1,00,000/)
      expect(formatPaiseToInr(0)).toMatch(/₹\s*0/)
    })
  })

  describe('Social Platform Canonical URL Validation', () => {
    it('accepts canonical HTTPS YouTube URLs and rejects non-canonical or insecure domains', () => {
      expect(validateCanonicalSocialUrl('https://youtube.com/shorts/abc123xyz', 'youtube')).toBe(true)
      expect(validateCanonicalSocialUrl('https://www.youtube.com/watch?v=12345', 'youtube')).toBe(true)
      expect(validateCanonicalSocialUrl('https://youtu.be/abc123xyz', 'youtube')).toBe(true)

      // Insecure or fake domains
      expect(validateCanonicalSocialUrl('http://youtube.com/shorts/123', 'youtube')).toBe(false)
      expect(validateCanonicalSocialUrl('https://fake-youtube.com/video', 'youtube')).toBe(false)
      expect(validateCanonicalSocialUrl('not-a-url', 'youtube')).toBe(false)
    })

    it('accepts canonical Instagram URLs and rejects malformed domains', () => {
      expect(validateCanonicalSocialUrl('https://instagram.com/reel/C7xyz123/', 'instagram')).toBe(true)
      expect(validateCanonicalSocialUrl('https://www.instagram.com/p/C7xyz123/', 'instagram')).toBe(true)
      expect(validateCanonicalSocialUrl('https://tiktok.com/@sports', 'instagram')).toBe(false)
    })

    it('accepts canonical X / Twitter URLs', () => {
      expect(validateCanonicalSocialUrl('https://x.com/khelgrid/status/123456789', 'x_twitter')).toBe(true)
      expect(validateCanonicalSocialUrl('https://twitter.com/khelgrid/status/123456789', 'x_twitter')).toBe(true)
      expect(validateCanonicalSocialUrl('https://random-site.com/tweet', 'x_twitter')).toBe(false)
    })
  })

  describe('Campaign Lifecycle & Moderation', () => {
    it('retrieves initial verified sports campaigns and supports sport filtering', () => {
      const all = getCampaigns()
      expect(all.length).toBeGreaterThanOrEqual(3)

      const cricketOnly = getCampaigns({ sport: 'Cricket' })
      expect(cricketOnly.length).toBeGreaterThanOrEqual(1)
      expect(cricketOnly.every(c => c.sport === 'Cricket')).toBe(true)
    })

    it('creates an advertiser campaign in submitted state and logs audit event', () => {
      const newCamp = createCampaign({
        title: 'Bengaluru Badminton Academy League 2026',
        purpose: 'Promote junior badminton singles league.',
        category: 'academy_admissions',
        sport: 'Badminton',
        locationCity: 'Bengaluru',
        language: 'English / Kannada',
        advertiserName: 'Prakash Padukone Badminton Center',
        advertiserRole: 'academy',
        advertiserVerified: true,
        advertiserContact: 'contact@padukonebadminton.in',
        compensationModel: 'fixed_deliverable',
        perDeliverableFeePaise: 350000, // ₹3,500
        totalBudgetPaise: 3500000,      // ₹35,000
        deliverables: [
          {
            id: 'del-1',
            type: 'reel_short',
            title: 'Court Tour & Coaching Drills',
            quantity: 1,
            description: 'Showcase courts and junior smash coaching.',
            requiredHashtags: ['#BadmintonIndia'],
            mandatoryDisclosure: 'Paid partnership with Padukone Academy #Ad',
            deadlineDays: 7,
          },
        ],
        keyMessages: ['State-of-the-art wooden courts', 'Former international coach training'],
        prohibitedClaims: ['No Olympic qualification guarantees'],
        targetAudience: 'Junior badminton players aged 10-18 in Bengaluru',
        requiredChannels: ['instagram', 'youtube'],
        termsAndConditions: 'Creator must display #Ad prominently in caption.',
        deadlineAt: '2026-12-30T18:00:00Z',
      })

      expect(newCamp.id).toMatch(/^cmp-/)
      expect(newCamp.status).toBe('submitted')

      // Check audit log
      const audit = getCampaignAuditEvents(newCamp.id)
      expect(audit.length).toBeGreaterThanOrEqual(1)
      expect(audit[0].action).toBe('campaign_created')

      // Admin approves campaign
      const approved = updateCampaignStatus(newCamp.id, 'published', 'Admin Moderator', 'Verified academy credentials and budget.')
      expect(approved).toBe(true)

      const fetched = getCampaignById(newCamp.id)
      expect(fetched?.status).toBe('published')
    })
  })

  describe('Creator Applications, Deliverables & Reward Ledger', () => {
    it('processes application, selections, deliverable submissions and appends to reward ledger', () => {
      const campaignId = 'cmp-dca-summer-2026'

      // Step 1: Creator applies
      const appResult = applyToCampaign({
        campaignId,
        creatorId: 'creator-rohan-cricket',
        creatorName: 'Rohan Sharma',
        creatorHandle: '@rohan_cricket_insider',
        platform: 'youtube',
        followerCount: 28500,
        pitchNote: 'I produce cricket net session breakdowns with high youth engagement in Delhi NCR.',
      })
      expect(appResult.success).toBe(true)
      expect(appResult.application).toBeDefined()

      // Duplicate application is blocked
      const dupResult = applyToCampaign({
        campaignId,
        creatorId: 'creator-rohan-cricket',
        creatorName: 'Rohan Sharma',
        creatorHandle: '@rohan_cricket_insider',
        platform: 'youtube',
        followerCount: 28500,
        pitchNote: 'Second attempt.',
      })
      expect(dupResult.success).toBe(false)
      expect(dupResult.message).toContain('already applied')

      // Step 2: Advertiser selects creator
      const selected = updateApplicationStatus(appResult.application!.id, 'selected', 'DCA Director', 'Approved for pitch-side trial walkthrough.')
      expect(selected).toBe(true)

      // Step 3: Creator submits deliverable (fails if disclosure not checked)
      const invalidSub = submitDeliverable({
        campaignId,
        creatorId: 'creator-rohan-cricket',
        creatorName: 'Rohan Sharma',
        deliverableSpecId: 'deliv-dca-1',
        deliverableType: 'reel_short',
        canonicalPostUrl: 'https://youtube.com/shorts/delhi-cricket-trial',
        platform: 'youtube',
        disclosureVerified: false, // not confirmed
      })
      expect(invalidSub.success).toBe(false)
      expect(invalidSub.message).toContain('sponsorship disclosures')

      // Creator submits deliverable with valid URL and disclosure
      const validSub = submitDeliverable({
        campaignId,
        creatorId: 'creator-rohan-cricket',
        creatorName: 'Rohan Sharma',
        deliverableSpecId: 'deliv-dca-1',
        deliverableType: 'reel_short',
        canonicalPostUrl: 'https://youtube.com/shorts/delhi-cricket-trial',
        platform: 'youtube',
        disclosureVerified: true,
      })
      expect(validSub.success).toBe(true)
      expect(validSub.submission?.rewardAmountPaise).toBe(400000)

      // Step 4: Advertiser reviews deliverable and approves it
      const initialLedger = getRewardLedger('creator-rohan-cricket')
      const initialCount = initialLedger.length

      const reviewed = reviewDeliverable(validSub.submission!.id, 'accepted', 'DCA Director', 'High quality reel, accurate trial date mentions.')
      expect(reviewed).toBe(true)

      // Step 5: Verify append-only ledger entry created
      const updatedLedger = getRewardLedger('creator-rohan-cricket')
      expect(updatedLedger.length).toBe(initialCount + 1)
      const latestEntry = updatedLedger[0]
      expect(latestEntry.amountPaise).toBe(400000)
      expect(latestEntry.status).toBe('approved')
      expect(latestEntry.description).toContain('Contracted deliverable accepted')
    })
  })

  describe('Creator Profile Management', () => {
    it('retrieves and saves creator profile', () => {
      const profile = getCreatorProfile('usr-cr-1')
      expect(profile.displayName).toBe('Rohan Sharma Sports')

      profile.bio = 'Updated bio for Indian athletics and cricket.'
      saveCreatorProfile(profile)

      const reloaded = getCreatorProfile('usr-cr-1')
      expect(reloaded.bio).toBe('Updated bio for Indian athletics and cricket.')
    })
  })

  describe('Policy Compliance & Claims Heuristic Scanner', () => {
    it('flags prohibited selection guarantee claims and missing disclosure instructions', () => {
      const badText = 'Join our academy camp! We offer 100% selection guarantee for state team.'
      const res = scanCampaignPolicyCompliance(badText)
      expect(res.isCompliant).toBe(false)
      expect(res.flaggedTerms).toContain('100% selection guarantee')
      expect(res.hasMandatoryDisclosureNotice).toBe(false)
      expect(res.score).toBeLessThan(70)
    })

    it('passes compliant campaign briefs with proper disclosure notices', () => {
      const goodText = 'Grassroots athletic clinic promoting sprint biomechanics. Mandatory disclosure: #Ad #KhelGrid in caption.'
      const res = scanCampaignPolicyCompliance(goodText)
      expect(res.isCompliant).toBe(true)
      expect(res.flaggedTerms.length).toBe(0)
      expect(res.hasMandatoryDisclosureNotice).toBe(true)
      expect(res.score).toBe(100)
    })
  })

  describe('Enhanced Deliverable URL Validator', () => {
    it('validates canonical Instagram and YouTube video and reel links with format inspection', () => {
      const validIg = validateDeliverableUrl('https://instagram.com/reel/DE_12345/', 'instagram')
      expect(validIg.valid).toBe(true)
      expect(validIg.platform).toBe('instagram')

      const invalidIg = validateDeliverableUrl('https://instagram.com/stories/user/123/', 'instagram')
      expect(invalidIg.valid).toBe(false)
      expect(invalidIg.error).toContain('reel')

      const validYt = validateDeliverableUrl('https://youtube.com/shorts/xyz123', 'youtube')
      expect(validYt.valid).toBe(true)
      expect(validYt.platform).toBe('youtube')
    })
  })

  describe('Budget Escrow & Earnings Breakdown Invariants', () => {
    it('computes campaign budget breakdown with integer paise arithmetic', () => {
      const breakdown = getCampaignBudgetBreakdown('cmp-dca-summer-2026')
      expect(breakdown.totalBudgetPaise).toBe(4000000)
      expect(breakdown.availableReservePaise).toBeLessThanOrEqual(breakdown.totalBudgetPaise)
      expect(breakdown.totalBudgetPaise).toBeGreaterThan(0)
    })

    it('computes creator earnings summary with cleared and pending balances', () => {
      const summary = getCreatorEarningsSummary('creator-rohan-cricket')
      expect(summary.clearedPaise).toBeGreaterThanOrEqual(0)
      expect(summary.lifetimeEarnedPaise).toBeGreaterThanOrEqual(summary.clearedPaise)
    })
  })

  describe('Campaign Disputes & Payout Authorization', () => {
    it('files, reviews and resolves a 3-way dispute in creator favor with ledger credit', () => {
      const allDisputesBefore = getCampaignDisputes()
      expect(allDisputesBefore.length).toBeGreaterThanOrEqual(1)

      const disputeRes = fileCampaignDispute({
        campaignId: 'cmp-dca-summer-2026',
        submissionId: 'sub-sample-1',
        raisedBy: 'creator',
        reason: 'Unjustified rejection',
        statement: 'The reel contains all sponsor guidelines and required audio tracks.',
        actorName: 'Rohan Sharma',
      })
      expect(disputeRes.success).toBe(true)
      expect(disputeRes.dispute?.status).toBe('open')

      const initialLedger = getRewardLedger('creator-rohan-cricket')
      const countBefore = initialLedger.length

      const resolved = resolveCampaignDispute(
        disputeRes.dispute!.id,
        'creator_favored',
        'Moderator verified video meets all brief deliverables.',
        'KhelGrid Senior Arbiter'
      )
      expect(resolved).toBe(true)

      const updatedLedger = getRewardLedger('creator-rohan-cricket')
      expect(updatedLedger.length).toBe(countBefore + 1)
      expect(updatedLedger[0].description).toContain('Dispute resolved in creator favor')
    })

    it('authorizes reward payout batch for approved ledger entries', () => {
      const ledger = getRewardLedger()
      const approvedIds = ledger.filter(l => l.status === 'approved').map(l => l.id)
      if (approvedIds.length > 0) {
        const authRes = authorizeRewardPayoutBatch(approvedIds, 'Senior Treasury Officer')
        expect(authRes.success).toBe(true)
        expect(authRes.count).toBe(approvedIds.length)
        expect(authRes.totalPaise).toBeGreaterThan(0)
      }
    })
  })
})
