import { describe, expect, it } from 'vitest'
import {
  canTransitionPaymentOrder,
  isValidPaymentOrderAmount,
  mapLegacyPaymentStatus,
} from './paymentLifecycle'

describe('canonical payment order lifecycle', () => {
  it('allows provider-confirmed pending to captured transitions', () => {
    expect(canTransitionPaymentOrder('pending', 'captured', 'provider')).toBe(true)
    expect(canTransitionPaymentOrder('pending', 'captured', 'admin')).toBe(false)
  })

  it('does not permit browser-like/untrusted actors or illegal transitions', () => {
    expect(canTransitionPaymentOrder('created', 'captured', 'system')).toBe(false)
    expect(canTransitionPaymentOrder('captured', 'failed', 'provider')).toBe(false)
    expect(canTransitionPaymentOrder('refunded', 'captured', 'admin')).toBe(false)
    expect(canTransitionPaymentOrder('pending', 'pending', 'provider')).toBe(false)
  })

  it('requires admin reconciliation to leave the quarantine state', () => {
    expect(canTransitionPaymentOrder('reconciliation_required', 'captured', 'provider')).toBe(false)
    expect(canTransitionPaymentOrder('reconciliation_required', 'captured', 'admin')).toBe(true)
  })

  it('keeps pay-at-venue separate from captured online payment', () => {
    expect(mapLegacyPaymentStatus('pay_at_venue')).toBeNull()
    expect(mapLegacyPaymentStatus('completed')).toBe('captured')
    expect(mapLegacyPaymentStatus('pending_verification')).toBe('pending')
  })

  it('accepts only positive safe-integer paise amounts', () => {
    expect(isValidPaymentOrderAmount(1)).toBe(true)
    expect(isValidPaymentOrderAmount(30000)).toBe(true)
    expect(isValidPaymentOrderAmount(0)).toBe(false)
    expect(isValidPaymentOrderAmount(-1)).toBe(false)
    expect(isValidPaymentOrderAmount(1.5)).toBe(false)
    expect(isValidPaymentOrderAmount(Number.MAX_SAFE_INTEGER + 1)).toBe(false)
  })
})
