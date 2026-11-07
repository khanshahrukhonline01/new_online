export type PaymentItemType =
  | 'pickup_match'
  | 'venue_booking'
  | 'trial_registration'
  | 'athlete_verification'
  | 'listing_plan'
  | 'membership'

export type { ListingPlanId, ListingPlan } from './listingPricing'

export type PaymentMethod =
  | 'upi'
  | 'card'
  | 'netbanking'
  | 'wallet'
  | 'pay_at_venue'

export interface PaymentItem {
  id: string
  type: PaymentItemType
  title: string
  subtitle?: string
  amount: number
  currency?: string
  emoji?: string
  venueName?: string
  city?: string
  dateOrTime?: string
  metadata?: Record<string, unknown>
}

export interface PaymentCustomer {
  name: string
  phone: string
  email?: string
}

export interface PaymentResult {
  success: boolean
  orderId: string
  paymentId: string
  amount: number
  currency: string
  method: PaymentMethod
  status: 'completed' | 'pay_at_venue' | 'pending_verification' | 'failed'
  timestamp: string
  receiptRef: string
  errorMessage?: string
}

export interface VenueSlotBookingInput {
  venueId: string
  venueName: string
  city: string
  sport: string
  slotDate: string
  slotTime: string
  customerName: string
  customerPhone: string
  totalAmount: number
  paidAmount: number
  paymentStatus: 'paid' | 'pay_at_venue'
  paymentId?: string
}

export interface VenueBookingResult {
  status: 'success' | 'error'
  bookingRef?: string
  venueName?: string
  slotDate?: string
  slotTime?: string
  paidAmount?: number
  paymentStatus?: string
  message?: string
}
