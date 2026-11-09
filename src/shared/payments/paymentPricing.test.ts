import { describe, expect, it } from 'vitest'
import {
  getCanonicalListingPlan,
  getCanonicalMembershipPrice,
  paiseToRupees,
  resolveVenueSlotPrice,
  rupeesToPaise,
} from '../../../supabase/functions/_shared/paymentPricing'

describe('canonical payment pricing', () => {
  it('uses one canonical listing plan catalogue', () => {
    expect(getCanonicalListingPlan('1_month')).toEqual({
      amountRupees: 499, durationDays: 30, name: '1-Month Listing',
    })
    expect(getCanonicalListingPlan('unknown')).toBeNull()
  })

  it('resolves membership price only for known plan and billing cycle', () => {
    expect(getCanonicalMembershipPrice({ planId: 'athlete_pro', billingCycle: 'monthly' })).toBe(249)
    expect(getCanonicalMembershipPrice({ tierId: 'coach', billingCycle: 'annual' })).toBe(4999)
    expect(getCanonicalMembershipPrice({ planId: 'unknown', billingCycle: 'monthly' })).toBeNull()
    expect(getCanonicalMembershipPrice({ planId: 'athlete_pro', billingCycle: 'weekly' })).toBeNull()
  })

  it('converts INR and paise without floating point drift', () => {
    expect(rupeesToPaise(0.01)).toBe(1)
    expect(rupeesToPaise(249.99)).toBe(24999)
    expect(rupeesToPaise(0)).toBeNull()
    expect(rupeesToPaise(Number.NaN)).toBeNull()
    expect(paiseToRupees(1)).toBe(0.01)
    expect(paiseToRupees(1.5)).toBeNull()
  })

  it('uses verified court-specific paise price above the former ₹300 cap', () => {
    expect(resolveVenueSlotPrice({
      venue: { slot_hourly_fee: 900, fee_provenance: 'verified', pricing_status: 'verified' },
      courts: [{ name: 'Court 2', hourly_price_paise: 82500, is_bookable: true }],
      courtNumber: 2,
    })).toEqual({ amountRupees: 825, amountPaise: 82500 })
  })

  it('falls back to verified venue fee if selected court has no positive tariff', () => {
    expect(resolveVenueSlotPrice({
      venue: { slot_hourly_fee: '475.50', fee_provenance: 'verified', pricing_status: 'verified' },
      courts: [{ name: 'Court 1', hourly_price_paise: null, is_bookable: true }],
      courtNumber: 1,
    })).toEqual({ amountRupees: 475.5, amountPaise: 47550 })
  })

  it('rejects unverified venue prices, invalid courts and unbookable courts', () => {
    expect(resolveVenueSlotPrice({
      venue: { slot_hourly_fee: 500, fee_provenance: 'unverified', pricing_status: 'verified' },
      courts: [], courtNumber: 1,
    })).toBeNull()
    expect(resolveVenueSlotPrice({
      venue: { slot_hourly_fee: 500, fee_provenance: 'verified', pricing_status: 'verified' },
      courts: [{ name: 'Court 2', hourly_price_paise: 80000, is_bookable: false }],
      courtNumber: 2,
    })).toBeNull()
    expect(resolveVenueSlotPrice({
      venue: { slot_hourly_fee: 500, fee_provenance: 'verified', pricing_status: 'verified' },
      courts: [], courtNumber: 0,
    })).toBeNull()
  })
})
