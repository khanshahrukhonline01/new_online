/**
 * Canonical server/client payment catalogue and deterministic INR pricing helpers.
 * Dependency-free so Vite and Supabase Edge Functions use identical values.
 */
export const LISTING_PLAN_PRICES = {
  '1_day': { amountRupees: 99, durationDays: 1, name: '1-Day Listing' },
  '1_month': { amountRupees: 499, durationDays: 30, name: '1-Month Listing' },
  '6_months': { amountRupees: 2499, durationDays: 180, name: '6-Month Listing' },
  '1_year': { amountRupees: 4499, durationDays: 365, name: '1-Year Listing' },
  lifelong: { amountRupees: 9999, durationDays: 0, name: 'Lifelong Listing' },
} as const

export type CanonicalListingPlanId = keyof typeof LISTING_PLAN_PRICES

export const VENUE_ADVANCE_DEPOSIT_CAP_PAISE = 30_000

export function calculateVenueAdvanceDeposit(totalSlotAmountPaise: number): number | null {
  if (!Number.isSafeInteger(totalSlotAmountPaise) || totalSlotAmountPaise <= 0) return null
  return Math.min(VENUE_ADVANCE_DEPOSIT_CAP_PAISE, totalSlotAmountPaise)
}

export const MEMBERSHIP_PRICES: Record<string, { monthly: number; annual: number }> = {
  athlete_pro: { monthly: 249, annual: 1499 },
  athlete_elite: { monthly: 499, annual: 2999 },
  academy_starter: { monthly: 799, annual: 4999 },
  academy_pro: { monthly: 1999, annual: 12999 },
  academy_enterprise: { monthly: 3999, annual: 24999 },
  venue_pro: { monthly: 1499, annual: 8999 },
  boost_7d: { monthly: 1500, annual: 1500 },
  boost_30d: { monthly: 4499, annual: 4499 },
  athlete: { monthly: 199, annual: 1999 },
  coach: { monthly: 499, annual: 4999 },
  academy: { monthly: 1499, annual: 14999 },
}

export function getCanonicalListingPlan(planId: string) {
  return Object.prototype.hasOwnProperty.call(LISTING_PLAN_PRICES, planId)
    ? LISTING_PLAN_PRICES[planId as CanonicalListingPlanId]
    : null
}

export function getCanonicalMembershipPrice(meta: Record<string, unknown>): number | null {
  const planId = String(meta.planId || '')
  const tierId = String(meta.tierId || '')
  const cycle = String(meta.billingCycle || '')
  const plan = MEMBERSHIP_PRICES[planId] || MEMBERSHIP_PRICES[tierId]
  if (!plan || (cycle !== 'monthly' && cycle !== 'annual')) return null
  return plan[cycle]
}

export function rupeesToPaise(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null
  const paise = Math.round(value * 100)
  return Number.isSafeInteger(paise) && paise > 0 ? paise : null
}

export function paiseToRupees(value: number): number | null {
  if (!Number.isSafeInteger(value) || value <= 0) return null
  return value / 100
}

export interface VenuePriceInput {
  venue: {
    slot_hourly_fee: number | string | null
    fee_provenance: string | null
    pricing_status: string | null
  }
  courts: Array<{ name: string; hourly_price_paise: number | null; is_bookable: boolean }>
  courtNumber: number
}

/**
 * Mirrors reserve_venue_slot_atomic: verified venue pricing is required;
 * use a matching bookable Court N tariff in paise when positive, otherwise
 * fall back to the venue hourly fee. The current RPC prices one slot and has
 * no duration multiplier.
 */
export function resolveVenueSlotPrice(input: VenuePriceInput): { amountRupees: number; amountPaise: number } | null {
  const { venue, courts, courtNumber } = input
  if (!Number.isInteger(courtNumber) || courtNumber < 1 || courtNumber > 50) return null
  if (venue.fee_provenance !== 'verified' || venue.pricing_status !== 'verified') return null

  const courtNames = new Set(['court ' + courtNumber, 'court' + courtNumber, String(courtNumber)])
  const court = courts.find(row => row.is_bookable && courtNames.has(row.name.trim().toLowerCase()))
  const courtPaise = court?.hourly_price_paise
  let amountPaise: number | null = null

  if (typeof courtPaise === 'number' && Number.isSafeInteger(courtPaise) && courtPaise > 0) {
    amountPaise = courtPaise
  } else {
    const venueFee = typeof venue.slot_hourly_fee === 'number'
      ? venue.slot_hourly_fee
      : venue.slot_hourly_fee === null ? NaN : Number(venue.slot_hourly_fee)
    amountPaise = rupeesToPaise(venueFee)
  }

  if (amountPaise === null) return null
  const amountRupees = paiseToRupees(amountPaise)
  return amountRupees === null ? null : { amountRupees, amountPaise }
}
