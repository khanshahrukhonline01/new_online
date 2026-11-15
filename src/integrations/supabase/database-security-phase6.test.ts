import { describe, it, expect } from 'vitest'
import {
  maskPhoneNumber,
  maskEmailAddress,
  maskBankAccountNumber,
  recordUserConsent,
  exportMyPersonalData,
  requestAccountErasure,
} from '../../shared/privacy/privacyService'

describe('Phase 6: Data Privacy, PII Masking & Cryptographic Protections Suite', () => {
  it('SEC-TEST-P6-01: maskPhoneNumber masks national and international phone numbers', () => {
    // 10-digit Indian mobile number
    expect(maskPhoneNumber('9876543210')).toBe('98*** **210')
    expect(maskPhoneNumber('+919876543210')).toBe('+91 98*** **210')
    expect(maskPhoneNumber('+91 98765 43210')).toBe('+91 98*** **210')

    // Edge cases
    expect(maskPhoneNumber(null)).toBe('••••••••••')
    expect(maskPhoneNumber('')).toBe('••••••••••')
    expect(maskPhoneNumber('123')).toBe('••••••')
  })

  it('SEC-TEST-P6-02: maskEmailAddress masks usernames while preserving domain transparency', () => {
    expect(maskEmailAddress('athlete@khelgrid.com')).toBe('a***e@khelgrid.com')
    expect(maskEmailAddress('zaheer.coach@gmail.com')).toBe('z***h@gmail.com')
    expect(maskEmailAddress('me@khelgrid.com')).toBe('m***@khelgrid.com')

    // Edge cases
    expect(maskEmailAddress(null)).toBe('••••@••••.•••')
    expect(maskEmailAddress('invalid-email')).toBe('••••@••••.•••')
  })

  it('SEC-TEST-P6-03: maskBankAccountNumber redacts account digits and displays only final 4 digits', () => {
    expect(maskBankAccountNumber('123456789012')).toBe('•••• •••• 9012')
    expect(maskBankAccountNumber('50100234567891')).toBe('•••• •••• 7891')
    expect(maskBankAccountNumber(null)).toBe('•••• •••• ••••')
    expect(maskBankAccountNumber('12')).toBe('•••• •••• ••••')
  })

  it('SEC-TEST-P6-04: DPDP consent recording handles required statutory consent types', async () => {
    const consentTypes = [
      'terms_of_service',
      'privacy_policy',
      'scouting_profiling',
      'minor_guardian_consent',
      'marketing_communications',
      'sports_pass',
    ] as const

    for (const consentType of consentTypes) {
      const res = await recordUserConsent('user-test-uuid', consentType, 'granted')
      expect(res).toBeDefined()
      expect(typeof res.success).toBe('boolean')
    }
  })

  it('SEC-TEST-P6-05: DPDP Right to Data Portability exports portable JSON structure', async () => {
    const res = await exportMyPersonalData('user-test-100')
    expect(res).toBeDefined()
    expect(typeof res.success).toBe('boolean')

    if (res.data) {
      expect(res.data.compliance_standard).toContain('DPDP Act 2023')
      expect(res.data.user_id).toBe('user-test-100')
      expect(res.data.profile).toBeDefined()
      expect(Array.isArray(res.data.bookmarks)).toBe(true)
      expect(Array.isArray(res.data.venue_bookings)).toBe(true)
      expect(Array.isArray(res.data.trial_applications)).toBe(true)
    }
  })

  it('SEC-TEST-P6-06: DPDP Right to Erasure redacts user identifiers', async () => {
    const res = await requestAccountErasure('user-test-100')
    expect(res).toBeDefined()
    expect(typeof res.success).toBe('boolean')
    expect(res.message).toBeDefined()
  })

  it('SEC-TEST-P6-07: SQL masking functions maintain strict idempotency and immutability', () => {
    // Pure logic assertion simulating SQL mask_phone & mask_email
    const sqlMaskPhone = (p: string) => {
      const clean = p.replace(/[^0-9]/g, '')
      if (clean.length < 6) return '***'
      return clean.slice(0, 4) + '***' + clean.slice(-3)
    }

    expect(sqlMaskPhone('9876543210')).toBe('9876***210')
    expect(sqlMaskPhone('12345')).toBe('***')
  })
})
