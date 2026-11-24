import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminCampaignMarketplaceDesk } from './AdminCampaignMarketplaceDesk'
import {
  createCampaign,
  applyToCampaign,
  getCreatorProfile,
  getRewardLedger,
  getCampaignAuditEvents,
} from '../../../../src/modules/campaigns/campaignClient'
import {
  getAdminCreatorCampaignDashboard,
  moderateCampaignBrief,
  triageBrandApplication,
  reviewCreativeDeliverable,
  auditSocialAttribution,
  verifyCampaignMilestone,
  toggleCreatorVerificationStatus,
  arbitrateCampaignDispute,
  exportCreatorOpsLedgerToCsv,
  resetAdminCreatorOpsForTesting,
} from '../services/adminCreatorCampaignService'

const TEST_OPERATOR = {
  name: 'Senior Creator Ops',
  email: 'creator.ops@khelgrid.com',
}

describe('Module 6: Sports Creator Campaigns & Attribution Operations Desk', () => {
  beforeEach(() => {
    resetAdminCreatorOpsForTesting()
  })

  it('renders the full Module 6 glassmorphic UI, telemetry cards, payment lockdown pill, and all 8 sub-desks', () => {
    createCampaign({
      title: 'Kolkata Football Academy Grassroots League',
      purpose: 'Promote junior grassroots football league.',
      category: 'tournament_awareness',
      sport: 'Football',
      locationCity: 'Kolkata',
      language: 'Bengali & English',
      advertiserName: 'East Bengal Grassroots Trust',
      advertiserRole: 'academy',
      advertiserVerified: true,
      advertiserContact: 'grassroots@eastbengal.in',
      compensationModel: 'fixed_deliverable',
      perDeliverableFeePaise: 400000,
      totalBudgetPaise: 4000000,
      deliverables: [
        {
          id: 'del-kol-1',
          type: 'reel_short',
          title: 'Kolkata Derby Junior Trials Highlights',
          quantity: 1,
          description: 'Document under-15 trials at Salt Lake stadium training pitch.',
          requiredHashtags: ['#KolkataFootball'],
          mandatoryDisclosure: 'Paid partnership with Academy #Ad',
          deadlineDays: 7,
        },
      ],
      keyMessages: ['Free trial kits for under-15 players'],
      prohibitedClaims: ['No Indian Super League contracts guaranteed'],
      targetAudience: 'West Bengal youth footballers',
      requiredChannels: ['instagram', 'youtube'],
      termsAndConditions: 'All videos must feature #Ad disclosure.',
      deadlineAt: '2026-12-25T18:00:00Z',
    })

    const html = renderToStaticMarkup(
      <AdminCampaignMarketplaceDesk operatorEmail="creator.ops@khelgrid.com" />,
    )

    // Header & Payment Lockdown
    expect(html).toContain('Sports Creator Campaigns &amp; Attribution Operations Desk')
    expect(html).toContain('Ledger Mode · Payments Disabled')

    // Micro-KPI Telemetry Ribbon
    expect(html).toContain('Active Briefs &amp; Queue')
    expect(html).toContain('Brand Applications')
    expect(html).toContain('Deliverable Queue')
    expect(html).toContain('Attributed Trial Enquiries')
    expect(html).toContain('Milestone Completions')
    expect(html).toContain('Approved Escrow Ledger')

    // All 8 Sub-Desk Navigation Tabs
    expect(html).toContain('Campaign Moderation')
    expect(html).toContain('Brand Applications')
    expect(html).toContain('Deliverable Verification')
    expect(html).toContain('Social Attribution')
    expect(html).toContain('Milestone Completions')
    expect(html).toContain('Disputes')
    expect(html).toContain('Creator Profiles')
    expect(html).toContain('Reward Ledger &amp; Audit Trail')

    // Campaign Table & Newly Submitted Brief
    expect(html).toContain('Advertiser Campaigns')
    expect(html).toContain('Verify that campaign briefs adhere to anti-spam policies')
    expect(html).toContain('Kolkata Football Academy Grassroots League')
    expect(html).toContain('East Bengal Grassroots Trust')
    expect(html).toContain('Review Brief')
    expect(html).toContain('Approve')
  })

  it('aggregates micro-KPI metrics across seeded campaigns, applications, attribution links, and milestones', () => {
    const snap = getAdminCreatorCampaignDashboard()

    expect(snap.campaigns.length).toBeGreaterThanOrEqual(3)
    expect(snap.applications.length).toBeGreaterThanOrEqual(5)
    expect(snap.attributions.length).toBeGreaterThanOrEqual(4)
    expect(snap.milestones.length).toBeGreaterThanOrEqual(7)
    expect(snap.creators.length).toBeGreaterThanOrEqual(5)

    // Flagged anomaly count includes the synthetic bot-spike record (KG-OPEN-VIKRAM26)
    expect(snap.metrics.flaggedAnomalies).toBeGreaterThanOrEqual(1)
    expect(snap.metrics.totalVerifiedEnquiries).toBe(118 + 164 + 74 + 3)
  })

  it('merges customer-submitted applications and auto-provisions UTM attribution & M1-M4 milestones upon acceptance', () => {
    const applyRes = applyToCampaign({
      campaignId: 'cmp-dca-summer-2026',
      creatorId: 'creator-custom-pune',
      creatorName: 'Aarav Pune Fast Bowling',
      creatorHandle: '@aarav_pace_pune',
      platform: 'instagram',
      followerCount: 18400,
      pitchNote: 'Will document biomechanical release angles on AstroTurf nets.',
    })
    expect(applyRes.success).toBe(true)

    const before = getAdminCreatorCampaignDashboard()
    const mergedApp = before.applications.find(a => a.id === applyRes.application!.id)
    expect(mergedApp).toBeDefined()
    expect(mergedApp?.status).toBe('applied')

    const accepted = triageBrandApplication(
      applyRes.application!.id,
      'accepted',
      TEST_OPERATOR,
      'Verified pace bowling portfolio and Delhi/Pune reach.',
    )
    expect(accepted).toBe(true)

    const after = getAdminCreatorCampaignDashboard()
    const updatedApp = after.applications.find(a => a.id === applyRes.application!.id)
    expect(updatedApp?.status).toBe('accepted')

    // Check auto-provisioned attribution short-link
    const provisionedAttr = after.attributions.find(
      a => a.campaignId === 'cmp-dca-summer-2026' && a.creatorId === 'creator-custom-pune',
    )
    expect(provisionedAttr).toBeDefined()
    expect(provisionedAttr?.trackingCode).toMatch(/^KG-/)
    expect(provisionedAttr?.shortUrl).toContain('https://khel.gg/c/')

    // Check auto-provisioned sequential milestones (M1 pending_review, M2/M4 locked)
    const provisionedMilestones = after.milestones.filter(
      m => m.campaignId === 'cmp-dca-summer-2026' && m.creatorId === 'creator-custom-pune',
    )
    expect(provisionedMilestones.length).toBe(3)
    expect(provisionedMilestones.find(m => m.milestoneCode === 'M1')?.status).toBe('pending_review')
    expect(provisionedMilestones.find(m => m.milestoneCode === 'M2')?.status).toBe('locked')
  })

  it('excludes flagged bot-traffic anomalies from organic attribution KPIs when audited', () => {
    const before = getAdminCreatorCampaignDashboard()
    const anomalyAttr = before.attributions.find(a => a.trackingCode === 'KG-OPEN-VIKRAM26')
    expect(anomalyAttr).toBeDefined()
    const clicksBefore = before.metrics.totalAttributedClicks

    const ok = auditSocialAttribution(
      anomalyAttr!.id,
      'flagged_excluded',
      TEST_OPERATOR,
      'Confirmed datacenter click farm burst; excluded from campaign ROI telemetry.',
    )
    expect(ok).toBe(true)

    const after = getAdminCreatorCampaignDashboard()
    expect(after.metrics.totalAttributedClicks).toBe(clicksBefore - anomalyAttr!.linkClicks)
    expect(after.attributions.find(a => a.id === anomalyAttr!.id)?.auditStatus).toBe('flagged_excluded')
  })

  it('signs off milestones sequentially, unlocks the next milestone stage, and appends INR credits into the ledger', () => {
    const before = getAdminCreatorCampaignDashboard()
    const m3CountBefore = getRewardLedger('creator-rohan-cricket').length

    // Sign off Rohan's M3 milestone (unlocked already in pending_review) -> unlocks M4 locked
    const m3 = before.milestones.find(m => m.id === 'ms-dca-rohan-m3')
    expect(m3?.status).toBe('pending_review')

    const ok = verifyCampaignMilestone(
      'ms-dca-rohan-m3',
      'approved',
      TEST_OPERATOR,
      'Verified 7-day organic post retention and 118 authentic enquiries.',
    )
    expect(ok).toBe(true)

    const after = getAdminCreatorCampaignDashboard()
    expect(after.milestones.find(m => m.id === 'ms-dca-rohan-m3')?.status).toBe('approved')
    expect(after.milestones.find(m => m.id === 'ms-dca-rohan-m4')?.status).toBe('pending_review')

    const ledgerAfter = getRewardLedger('creator-rohan-cricket')
    expect(ledgerAfter.length).toBe(m3CountBefore + 1)
    expect(ledgerAfter[0].amountPaise).toBe(50000)
    expect(ledgerAfter[0].payoutLockdownNote).toContain('direct disbursements paused')
  })

  it('handles campaign brief moderation, deliverable revision/approval, creator KYI toggle, dispute arbitration, and CSV export', () => {
    const created = createCampaign({
      title: 'Jaipur Hockey Grassroots Clinic 2026',
      purpose: 'Recruit U-16 field hockey athletes.',
      category: 'coaching_clinic',
      sport: 'Hockey',
      locationCity: 'Jaipur',
      language: 'Hindi',
      advertiserName: 'Pink City Hockey Trust',
      advertiserRole: 'academy',
      advertiserVerified: true,
      advertiserContact: 'clinic@pinkcityhockey.org',
      compensationModel: 'fixed_deliverable',
      perDeliverableFeePaise: 300000,
      totalBudgetPaise: 1500000,
      deliverables: [],
      keyMessages: ['Turf shoes provided during clinic'],
      prohibitedClaims: [],
      targetAudience: 'Rajasthan junior players',
      requiredChannels: ['instagram'],
      termsAndConditions: 'Include #Ad clearly.',
      deadlineAt: '2026-12-28T18:00:00Z',
    })
    expect(created.status).toBe('submitted')

    expect(
      moderateCampaignBrief(created.id, 'published', TEST_OPERATOR, 'Compliant with fair play rules.'),
    ).toBe(true)

    // Deliverable revision & acceptance
    expect(
      reviewCreativeDeliverable('sub-sample-1', 'accepted', TEST_OPERATOR, 'Verified YouTube Short & #Ad.'),
    ).toBe(true)

    // Toggle creator KYI verification & sync check
    expect(toggleCreatorVerificationStatus('creator-rohan-cricket', false, TEST_OPERATOR)).toBe(true)
    expect(getCreatorProfile('creator-rohan-cricket').isVerifiedCreator).toBe(false)

    // Arbitrate open dispute
    expect(
      arbitrateCampaignDispute(
        'disp-sample-1',
        'creator_favored',
        TEST_OPERATOR,
        'Caption included all 3 hashtags and #Ad.',
      ),
    ).toBe(true)

    const snap = getAdminCreatorCampaignDashboard()
    expect(snap.campaigns.find(c => c.id === created.id)?.status).toBe('published')
    expect(snap.disputes.find(d => d.id === 'disp-sample-1')?.status).toBe('resolved')
    expect(getCampaignAuditEvents().length).toBeGreaterThanOrEqual(4)

    // Export CSV audit check
    const csv = exportCreatorOpsLedgerToCsv(snap)
    expect(csv).toContain('Record Type,ID,Campaign Title')
    expect(csv).toContain('ATTRIBUTION')
    expect(csv).toContain('MILESTONE')
    expect(csv).toContain('LEDGER_ENTRY')
  })
})
