import { describe, expect, it, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CampaignMarketplacePage } from './CampaignMarketplacePage'
import { CampaignCreationPage } from './CampaignCreationPage'
import { AdvertiserCampaignManagePage } from './AdvertiserCampaignManagePage'
import { CreatorHubPage } from './CreatorHubPage'
import {
  resetCampaignStorageForTesting,
  createCampaign,
  applyToCampaign,
  submitDeliverable,
} from './campaignClient'

describe('KhelGrid Sports Creator Campaign Marketplace — User Frontend UI Pages', () => {
  beforeEach(() => {
    resetCampaignStorageForTesting()
  })

  describe('CampaignMarketplacePage', () => {
    it('renders marketplace hero banner, sports filters, and verified sports campaigns', () => {
      const html = renderToStaticMarkup(<CampaignMarketplacePage />)

      // Hero banner & headings
      expect(html).toContain('KhelGrid Sports Creator Campaign Marketplace')
      expect(html).toContain('Two-Sided Sports Creator Economy')
      expect(html).toContain('Anti-Spam &amp; DPDP Compliant')
      expect(html).toContain('Mandatory #Ad Disclosures')
      expect(html).toContain('Immutable Reward Ledger')

      // Navigation actions
      expect(html).toContain('Creator Hub &amp; Earnings')
      expect(html).toContain('Advertiser Dashboard')
      expect(html).toContain('Post a Campaign')

      // Sports chips & categories
      expect(html).toContain('Cricket')
      expect(html).toContain('Football')
      expect(html).toContain('Badminton')
      expect(html).toContain('Academy Admissions')
      expect(html).toContain('Tournaments &amp; Trials')

      // Initial campaigns present in catalogue
      expect(html).toContain('Delhi Cricket Academy — High Performance Summer Trials 2026')
      expect(html).toContain('BBFS National Youth Football Combine')
      expect(html).toContain('KhelGrid National Initiative')
      expect(html).toContain('View Brief')
      expect(html).toContain('Apply Now')
    })
  })

  describe('CampaignCreationPage', () => {
    it('renders the 4-step wizard for advertisers and academies', () => {
      const html = renderToStaticMarkup(<CampaignCreationPage />)

      expect(html).toContain('Create a Sports Creator Campaign')
      expect(html).toContain('Advertiser &amp; Sports Business Studio')
      expect(html).toContain('Step 1: Campaign Basics &amp; Organisation')
      expect(html).toContain('Deliverables &amp; Formats')
      expect(html).toContain('Budget &amp; Reward')
      expect(html).toContain('Guidelines &amp; Review')

      // Form inputs
      expect(html).toContain('Campaign Title *')
      expect(html).toContain('Campaign Category *')
      expect(html).toContain('Organisation Name *')
      expect(html).toContain('Contact Email *')
      expect(html).toContain('Continue to Step 2')
    })
  })

  describe('AdvertiserCampaignManagePage', () => {
    it('renders campaign management dashboard with stats, applications, and deliverable review tables', () => {
      // Seed a campaign with an application and deliverable
      const camp = createCampaign({
        title: 'Mumbai Tennis Championship 2026',
        purpose: 'Promote championship awareness.',
        category: 'tournament_awareness',
        sport: 'Tennis',
        locationCity: 'Mumbai',
        language: 'English',
        advertiserName: 'Maharashtra State Lawn Tennis Association',
        advertiserRole: 'tournament',
        advertiserVerified: true,
        advertiserContact: 'contact@mslta.org',
        compensationModel: 'fixed_deliverable',
        perDeliverableFeePaise: 500000,
        totalBudgetPaise: 5000000,
        deliverables: [
          {
            id: 'del-tennis-1',
            type: 'reel_short',
            title: 'Championship Courts Showcase',
            quantity: 1,
            description: 'Showcase centre court and player practice.',
            requiredHashtags: ['#MSLTA2026'],
            mandatoryDisclosure: 'Paid partnership with MSLTA #Ad',
            deadlineDays: 5,
          },
        ],
        keyMessages: ['Top 50 Asian juniors playing in Mumbai'],
        prohibitedClaims: ['No wild-card guarantees'],
        targetAudience: 'Junior tennis players and fans',
        requiredChannels: ['instagram', 'youtube'],
        termsAndConditions: 'All posts must have visible #Ad disclosure.',
        deadlineAt: '2026-12-15T18:00:00Z',
      })

      applyToCampaign({
        campaignId: camp.id,
        creatorId: 'creator-rohan-cricket',
        creatorName: 'Rohan Sharma',
        creatorHandle: '@rohan_tennis_eye',
        platform: 'youtube',
        followerCount: 30000,
        pitchNote: 'Specialised junior tennis match coverage in Mumbai.',
      })

      submitDeliverable({
        campaignId: camp.id,
        creatorId: 'creator-rohan-cricket',
        creatorName: 'Rohan Sharma',
        deliverableSpecId: 'del-tennis-1',
        deliverableType: 'reel_short',
        canonicalPostUrl: 'https://youtube.com/shorts/mumbai-tennis-reel-1',
        platform: 'youtube',
        disclosureVerified: true,
      })

      const html = renderToStaticMarkup(<AdvertiserCampaignManagePage />)

      expect(html).toContain('Campaign Management &amp; Deliverables Review')
      expect(html).toContain('Total Campaigns')
      expect(html).toContain('Creator Applications')
      expect(html).toContain('Deliverables Received')
      expect(html).toContain('Approved Rewards (Ledger)')

      // Check seeded campaign and sub-tables
      expect(html).toContain('Mumbai Tennis Championship 2026')
      expect(html).toContain('Rohan Sharma')
      expect(html).toContain('@rohan_tennis_eye')
      expect(html).toContain('https://youtube.com/shorts/mumbai-tennis-reel-1')
      expect(html).toContain('#Ad Verified')
    })
  })

  describe('CreatorHubPage', () => {
    it('renders the sports creator workspace with profile, tabs, and reward ledger notice', () => {
      const html = renderToStaticMarkup(<CreatorHubPage />)

      // Profile details
      expect(html).toContain('Rohan Sharma')
      expect(html).toContain('@rohan_cricket_insider')
      expect(html).toContain('Verified Creator')
      expect(html).toContain('Ledger Earnings')

      // Hub tabs
      expect(html).toContain('Opportunities')
      expect(html).toContain('My Applications')
      expect(html).toContain('Submit Deliverable')
      expect(html).toContain('Channels')
      expect(html).toContain('Reward Ledger')

      // Opportunities content
      expect(html).toContain('Verified Sports Campaigns Open for Pitch')
      expect(html).toContain('Delhi Cricket Academy — High Performance Summer Trials 2026')
    })
  })
})
