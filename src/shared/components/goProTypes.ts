import { MEMBERSHIP_PLAN_PRICES } from '../payments/listingPricing'

export type ProBillingPeriod = 'monthly' | 'annual'

export interface ProTierOption {
  id: 'athlete' | 'coach' | 'academy'
  name: string
  tag: string
  isPopular?: boolean
  monthlyPrice: number
  annualPrice: number
  saveText: string
  features: string[]
}

export const PRO_TIERS: ProTierOption[] = [
  {
    id: 'athlete',
    name: 'Athlete Pro',
    tag: 'For Players & Rising Stars',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.athlete.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.athlete.annual,
    saveText: 'Save ₹389/yr',
    features: [
      'Golden Verified Athlete Badge',
      'Instant WhatsApp & SMS Trial Alerts',
      'Direct DM with Verified Scouts & Coaches',
      'Physical & Biomechanical Percentile Tracker',
      'Instant PDF Sports CV Export with QR Code',
    ],
  },
  {
    id: 'coach',
    name: 'Coach & Scout Pro',
    tag: 'For Mentors, Coaches & Scouts',
    isPopular: true,
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.coach.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.coach.annual,
    saveText: 'Save ₹989/yr',
    features: [
      'Unlimited Talent Scanner Searches (53 Cities)',
      'Download Verified Athlete CVs & Combine Stats',
      'Verified NIS / SAI Coach Directory Badge',
      'Direct WhatsApp & In-App Player Outreach',
      'Host Selection Trials with 0% Commission',
    ],
  },
  {
    id: 'academy',
    name: 'Academy & Turf Suite',
    tag: 'For Academies, Turfs & Clubs',
    monthlyPrice: MEMBERSHIP_PLAN_PRICES.academy.monthly,
    annualPrice: MEMBERSHIP_PLAN_PRICES.academy.annual,
    saveText: 'Save ₹2,989/yr',
    features: [
      '0% Commission on First ₹50k Monthly Bookings',
      'Top Featured Placement on City Pages & Map',
      'Automated Trial Registration & Payment Desk',
      'Multi-Coach Management & Attendance System',
      'Priority Broadcast on KhelGrid Channels',
    ],
  },
]
