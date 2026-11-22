import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdminCampaignMarketplaceDesk } from './AdminCampaignMarketplaceDesk'
import {
  resetCampaignStorageForTesting,
  createCampaign,
} from '../../../../src/modules/campaigns/campaignClient'

describe('AdminCampaignMarketplaceDesk Component & Moderation Views', () => {
  beforeEach(() => {
    resetCampaignStorageForTesting()
  })

  it('renders campaign moderation queue and navigation sub-desks', () => {
    // Seed a submitted campaign
    createCampaign({
      title: 'Kolkata Football Academy Grassroots League',
      purpose: 'Promote junior grassroots football league.',
      category: 'tournament_promotion',
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

    const html = renderToStaticMarkup(<AdminCampaignMarketplaceDesk />)

    // Sub-desk navigation pills
    expect(html).toContain('Campaign Moderation')
    expect(html).toContain('Deliverable Verification')
    expect(html).toContain('Creator Profiles')
    expect(html).toContain('Reward Ledger &amp; Audit Trail')

    // Table header & guidance
    expect(html).toContain('Advertiser Campaigns')
    expect(html).toContain('Verify that campaign briefs adhere to anti-spam policies')

    // Seeded campaign appears in table
    expect(html).toContain('Kolkata Football Academy Grassroots League')
    expect(html).toContain('East Bengal Grassroots Trust')
    expect(html).toContain('Review Brief')
    expect(html).toContain('Approve')
  })
})
