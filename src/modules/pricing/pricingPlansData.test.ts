import { describe, expect, it } from 'vitest'
import { MEMBERSHIP_PLAN_PRICES } from '../../shared/payments/listingPricing'
import { PRICING_PLANS } from './pricingPlansData'
import { PRO_TIERS } from '../../shared/components/goProTypes'

describe('membership pricing catalogue consistency', () => {
  it('uses canonical server prices for every paid pricing-page plan', () => {
    const expected: Record<string, { monthly: number; annual: number }> = {
      athlete_pro: MEMBERSHIP_PLAN_PRICES.athlete_pro,
      athlete_elite: MEMBERSHIP_PLAN_PRICES.athlete_elite,
      academy_starter: MEMBERSHIP_PLAN_PRICES.academy_starter,
      academy_pro: MEMBERSHIP_PLAN_PRICES.academy_pro,
      academy_enterprise: MEMBERSHIP_PLAN_PRICES.academy_enterprise,
      venue_pro: MEMBERSHIP_PLAN_PRICES.venue_pro,
      boost_7d: MEMBERSHIP_PLAN_PRICES.boost_7d,
      boost_30d: MEMBERSHIP_PLAN_PRICES.boost_30d,
    }
    for (const plan of PRICING_PLANS) {
      const canonical = expected[plan.id]
      if (!canonical) continue
      expect(plan.monthlyPrice, plan.id + ' monthly').toBe(canonical.monthly)
      expect(plan.annualPrice, plan.id + ' annual').toBe(canonical.annual)
    }
  })

  it('uses canonical prices for every GoPro tier', () => {
    for (const tier of PRO_TIERS) {
      const canonical = MEMBERSHIP_PLAN_PRICES[tier.id]
      expect(tier.monthlyPrice, tier.id + ' monthly').toBe(canonical.monthly)
      expect(tier.annualPrice, tier.id + ' annual').toBe(canonical.annual)
    }
  })
})
