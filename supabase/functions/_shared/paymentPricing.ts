/**
 * Canonical payment pricing catalogue shared between frontend display and Edge Functions.
 */

export interface ListingPlanPriceSpec {
  amountRupees: number
  durationDays: number
  name: string
}

export const LISTING_PLAN_PRICES = {
  '1_day': { amountRupees: 99, durationDays: 1, name: '1-Day Listing' },
  '1_month': { amountRupees: 499, durationDays: 30, name: '1-Month Listing' },
  '6_months': { amountRupees: 2499, durationDays: 180, name: '6-Month Listing' },
  '1_year': { amountRupees: 4499, durationDays: 365, name: '1-Year Listing' },
  lifelong: { amountRupees: 9999, durationDays: 0, name: 'Lifelong Listing' },
} as const satisfies Record<string, ListingPlanPriceSpec>

export interface MembershipPriceSpec {
  monthly: number
  annual: number
}

export const MEMBERSHIP_PRICES = {
  athlete: { monthly: 199, annual: 1999 },
  coach: { monthly: 499, annual: 4999 },
  academy: { monthly: 1499, annual: 14999 },
  athlete_pro: { monthly: 249, annual: 1499 },
  athlete_elite: { monthly: 499, annual: 2999 },
  academy_starter: { monthly: 999, annual: 5999 },
  academy_pro: { monthly: 2499, annual: 14999 },
  academy_enterprise: { monthly: 4166, annual: 24999 },
  venue_pro: { monthly: 1499, annual: 9999 },
  boost_7d: { monthly: 499, annual: 499 },
  boost_30d: { monthly: 1499, annual: 1499 },
} as const satisfies Record<string, MembershipPriceSpec>

const VENUE_ADVANCE_DEPOSIT_CAP_PAISE = 30000 // ₹300 cap

export function getCanonicalListingPlan(planId: string): ListingPlanPriceSpec | null {
  if (!planId || !Object.prototype.hasOwnProperty.call(LISTING_PLAN_PRICES, planId)) {
    return null
  }
  return { ...LISTING_PLAN_PRICES[planId as keyof typeof LISTING_PLAN_PRICES] }
}

export function getCanonicalMembershipPrice(params: {
  planId?: string
  tierId?: string
  billingCycle?: string
}): number | null {
  const key = params.planId ?? params.tierId
  const cycle = params.billingCycle
  if (!key || (cycle !== 'monthly' && cycle !== 'annual')) {
    return null
  }
  if (!Object.prototype.hasOwnProperty.call(MEMBERSHIP_PRICES, key)) {
    return null
  }
  const spec = MEMBERSHIP_PRICES[key as keyof typeof MEMBERSHIP_PRICES]
  return spec[cycle]
}

export function rupeesToPaise(rupees: number | string | null | undefined): number | null {
  if (rupees === null || rupees === undefined || rupees === '') return null
  const num = typeof rupees === 'string' ? Number(rupees) : rupees
  if (!Number.isFinite(num) || num <= 0) return null
  const paise = Math.round(num * 100)
  return paise > 0 ? paise : null
}

export function paiseToRupees(paise: number): number | null {
  if (!Number.isFinite(paise) || !Number.isInteger(paise) || paise <= 0) return null
  return Number((paise / 100).toFixed(2))
}

export function calculateVenueAdvanceDeposit(fullSlotPaise: number): number | null {
  if (!Number.isFinite(fullSlotPaise) || !Number.isInteger(fullSlotPaise) || fullSlotPaise <= 0) {
    return null
  }
  return Math.min(fullSlotPaise, VENUE_ADVANCE_DEPOSIT_CAP_PAISE)
}

export interface VenuePricingInput {
  venue: {
    slot_hourly_fee?: number | string | null
    fee_provenance?: string | null
    pricing_status?: string | null
  } | null
  courts?: Array<{
    name?: string | null
    hourly_price_paise?: number | null
    is_bookable?: boolean | null
  }>
  courtNumber: number
}

export function resolveVenueSlotPrice(
  input: VenuePricingInput,
): { amountRupees: number; amountPaise: number } | null {
  const { venue, courts = [], courtNumber } = input
  if (!venue) return null
  if (!Number.isInteger(courtNumber) || courtNumber < 1) return null
  if (venue.fee_provenance !== 'verified' || venue.pricing_status !== 'verified') {
    return null
  }

  const targetName = `court ${courtNumber}`
  const matchedCourt = courts.find(
    c => c.is_bookable === true && (c.name ?? '').trim().toLowerCase() === targetName,
  )

  if (
    matchedCourt &&
    typeof matchedCourt.hourly_price_paise === 'number' &&
    Number.isInteger(matchedCourt.hourly_price_paise) &&
    matchedCourt.hourly_price_paise > 0
  ) {
    const amountRupees = paiseToRupees(matchedCourt.hourly_price_paise)
    if (amountRupees !== null) {
      return { amountRupees, amountPaise: matchedCourt.hourly_price_paise }
    }
  }

  const fallbackPaise = rupeesToPaise(venue.slot_hourly_fee)
  if (fallbackPaise === null) return null
  const amountRupees = paiseToRupees(fallbackPaise)
  if (amountRupees === null) return null
  return { amountRupees, amountPaise: fallbackPaise }
}
