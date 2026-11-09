import { LISTING_PLAN_PRICES } from '../../../supabase/functions/_shared/paymentPricing'

export type ListingPlanId = '1_day' | '1_month' | '6_months' | '1_year' | 'lifelong'

export interface ListingPlan {
  id: ListingPlanId
  name: string
  durationLabel: string
  durationDays: number // 1, 30, 180, 365, 0 (lifelong)
  price: number // in INR
  originalPrice?: number
  savingsLabel?: string
  badge?: string
  popular?: boolean
  description: string
  features: string[]
}

export const LISTING_PLANS: ListingPlan[] = [
  {
    id: '1_day',
    name: '1-Day Listing',
    durationLabel: '24 Hours (1 Day)',
    durationDays: LISTING_PLAN_PRICES['1_day'].durationDays,
    price: LISTING_PLAN_PRICES['1_day'].amountRupees,
    originalPrice: 199,
    savingsLabel: '50% Off Flash',
    badge: '1-Day Pass',
    description: 'Perfect for quick single-day pickup matches, popups, or urgent 1-day open trials.',
    features: [
      '24-Hour Active Listing Visibility',
      'Direct WhatsApp & Phone Connect',
      'Instant Search Indexing across City',
      'Shareable Match / Trial Link',
    ],
  },
  {
    id: '1_month',
    name: '1-Month Listing',
    durationLabel: '30 Days (Monthly)',
    durationDays: LISTING_PLAN_PRICES['1_month'].durationDays,
    price: LISTING_PLAN_PRICES['1_month'].amountRupees,
    originalPrice: 699,
    savingsLabel: 'Save 28%',
    description: 'Great for monthly training batches, seasonal turf booking slots, and active community leagues.',
    features: [
      '30 Days Continuous Active Presence',
      'Verified Organizer / Host Badge',
      'Direct Player WhatsApp Inquiries',
      'Social Share Cards & QR Code',
    ],
  },
  {
    id: '6_months',
    name: '6-Month Listing',
    durationLabel: '180 Days (Semi-Annual)',
    durationDays: LISTING_PLAN_PRICES['6_months'].durationDays,
    price: LISTING_PLAN_PRICES['6_months'].amountRupees,
    originalPrice: 2999,
    savingsLabel: 'Save 17%',
    badge: 'Semi-Annual',
    description: 'Designed for competitive sports academies, tournament seasons, and busy turf venues.',
    features: [
      '180 Days Listing Duration',
      'Priority City Directory Placement',
      'Promoted Search Visibility',
      'Schedule & Pricing Updates Anytime',
      'Dedicated WhatsApp Listing Support',
    ],
  },
  {
    id: '1_year',
    name: '1-Year Listing',
    durationLabel: '365 Days (Annual)',
    durationDays: LISTING_PLAN_PRICES['1_year'].durationDays,
    price: LISTING_PLAN_PRICES['1_year'].amountRupees,
    originalPrice: 5999,
    savingsLabel: 'Save 25%',
    popular: true,
    badge: 'Most Popular',
    description: 'Maximum reach and year-round athlete registrations for established academies and sports complexes.',
    features: [
      '365 Days Guaranteed Directory Listing',
      'Top Ranking in City & Sports Searches',
      'Featured Academy / Venue Spotlight Badge',
      'Unlimited Program & Timing Updates',
      'Direct Athlete Admissions & Trial Routing',
      'Priority Customer & Host Support',
    ],
  },
  {
    id: 'lifelong',
    name: 'Lifelong Listing',
    durationLabel: 'Lifetime (Never Expires)',
    durationDays: LISTING_PLAN_PRICES.lifelong.durationDays,
    price: LISTING_PLAN_PRICES.lifelong.amountRupees,
    originalPrice: 14999,
    savingsLabel: 'One-Time Payment',
    badge: 'VIP Lifetime',
    description: 'Permanent verified presence on KhelGrid with zero renewal fees forever, highest priority ranking, and VIP gold badge.',
    features: [
      'Permanent Lifetime Presence on KhelGrid',
      'Never Expires · Zero Renewal Fees Ever',
      'VIP Gold Verified Host Badge',
      'Highest Search & Discovery Priority',
      'Featured Spotlight on City Directory Header',
      'Dedicated Account Manager & Concierge',
    ],
  },
]

export function getListingPlan(planId: ListingPlanId): ListingPlan {
  const plan = LISTING_PLANS.find(p => p.id === planId)
  return plan || LISTING_PLANS[1] // Default to 1-Month
}

export function calculatePlanExpiry(planId: ListingPlanId, fromDate = new Date()): string | null {
  const plan = getListingPlan(planId)
  if (plan.durationDays === 0) return null // Lifelong / Never expires
  const expiry = new Date(fromDate)
  expiry.setDate(expiry.getDate() + plan.durationDays)
  return expiry.toISOString()
}

export function formatPlanDuration(planId: ListingPlanId, expiryDate?: string | null): string {
  if (planId === 'lifelong' || !expiryDate) return 'Lifelong (Never Expires)'
  try {
    const d = new Date(expiryDate)
    return `Valid until ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
  } catch {
    return 'Active'
  }
}
