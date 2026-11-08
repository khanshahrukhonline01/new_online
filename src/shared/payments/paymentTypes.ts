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
  paymentStatus: 'paid' | 'pay_at_venue' | 'pending'
  paymentId?: string
  userId?: string
  customerEmail?: string
  courtOrTurfNumber?: string
  courtNumber?: number
  gatewaySignature?: string
  idempotencyKey?: string
  voucherToken?: string
  simulateOfflineFailure?: boolean
}

export interface VenueBookingResult {
  status: 'success' | 'double_booking_conflict' | 'error' | 'unconfirmed' | 'pending' | 'confirmed'
  bookingRef?: string
  voucherToken?: string
  venueName?: string
  slotDate?: string
  slotTime?: string
  courtNumber?: number
  paidAmount?: number
  totalAmount?: number
  paymentStatus?: string
  message?: string
  errorMessage?: string
  isOfflineDraft?: boolean
  serverConfirmed?: boolean
  customerName?: string
}

export interface ListingSubscriptionInput {
  orderId: string
  paymentId: string
  listingType: 'academy' | 'venue' | 'opportunity' | 'pickup_game'
  listingName: string
  city: string
  planId: import('./listingPricing').ListingPlanId
  planName: string
  amount: number
  durationDays: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  paymentStatus?: 'paid' | 'pay_at_venue' | 'pending'
  listingId?: string
  serverVerified?: boolean
  idempotencyKey?: string
}

export interface ListingSubscriptionResult {
  status: 'success' | 'error' | 'pending_verification'
  subscriptionId?: string
  planName?: string
  expiresAt?: string | null
  receiptRef?: string
  message?: string
  accessToken?: string
}
