/**
 * Canonical, provider-neutral payment order lifecycle.
 *
 * These states describe online payment orders only. Pay-at-venue is a separate
 * fulfilment/payment arrangement and must never be treated as captured online funds.
 * State changes are performed by trusted server/provider reconciliation paths only.
 */
export type PaymentOrderStatus =
  | 'created'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'cancelled'
  | 'refund_pending'
  | 'partially_refunded'
  | 'refunded'
  | 'reconciliation_required'

export type PaymentOrderActor = 'system' | 'provider' | 'admin'

export type PaymentProvider = 'razorpay' | 'cashfree' | 'mock'

export interface PaymentOrderContract {
  /** Internal KhelGrid order UUID; never supplied by the browser as authority. */
  id: string
  /** Unique KhelGrid-facing order number, distinct from provider order ID. */
  orderNumber: string
  provider: PaymentProvider
  providerOrderId?: string
  providerPaymentId?: string
  amountPaise: number
  currency: 'INR'
  status: PaymentOrderStatus
  idempotencyKey: string
  createdAt: string
  expiresAt?: string
  capturedAt?: string
  refundedAmountPaise?: number
}

const TRANSITIONS: Record<PaymentOrderStatus, Partial<Record<PaymentOrderStatus, PaymentOrderActor[]>>> = {
  created: {
    pending: ['system'],
    cancelled: ['system', 'admin'],
    failed: ['system', 'provider'],
    reconciliation_required: ['system', 'provider', 'admin'],
  },
  pending: {
    authorized: ['provider'],
    captured: ['provider', 'system'],
    failed: ['provider', 'system'],
    cancelled: ['provider', 'system', 'admin'],
    reconciliation_required: ['provider', 'system', 'admin'],
  },
  authorized: {
    captured: ['provider', 'system'],
    failed: ['provider', 'system'],
    cancelled: ['provider', 'system', 'admin'],
    reconciliation_required: ['provider', 'system', 'admin'],
  },
  captured: {
    refund_pending: ['system', 'admin'],
    reconciliation_required: ['system', 'provider', 'admin'],
  },
  failed: {},
  cancelled: {},
  refund_pending: {
    partially_refunded: ['provider', 'system'],
    refunded: ['provider', 'system'],
    reconciliation_required: ['provider', 'system', 'admin'],
  },
  partially_refunded: {
    refund_pending: ['system', 'admin'],
    refunded: ['provider', 'system'],
    reconciliation_required: ['provider', 'system', 'admin'],
  },
  refunded: {},
  reconciliation_required: {
    pending: ['admin'],
    authorized: ['admin'],
    captured: ['admin'],
    failed: ['admin'],
    cancelled: ['admin'],
    refund_pending: ['admin'],
    partially_refunded: ['admin'],
    refunded: ['admin'],
  },
}

/** Returns true only for an explicitly allowed trusted transition. */
export function canTransitionPaymentOrder(
  from: PaymentOrderStatus,
  to: PaymentOrderStatus,
  actor: PaymentOrderActor,
): boolean {
  if (from === to) return false
  return TRANSITIONS[from][to]?.includes(actor) ?? false
}

/** Convert legacy database statuses without conflating offline payment with online capture. */
export function mapLegacyPaymentStatus(status: string): PaymentOrderStatus | null {
  switch (status) {
    case 'pending':
    case 'pending_verification':
      return 'pending'
    case 'completed':
      return 'captured'
    case 'failed':
      return 'failed'
    case 'refunded':
      return 'refunded'
    case 'reconciliation_required':
      return 'reconciliation_required'
    case 'pay_at_venue':
      return null
    default:
      return null
  }
}

/** Amounts are persisted in paise and must be positive safe integers for online orders. */
export function isValidPaymentOrderAmount(amountPaise: number): boolean {
  return Number.isSafeInteger(amountPaise) && amountPaise > 0
}
