import test from 'node:test'
import assert from 'node:assert/strict'
import {
  APPROVED_DEVELOPMENT_SUPABASE_ORIGIN,
  evaluateAdminAccessGate,
  isSyntheticOrUnsafeEvidenceUrl,
  isWorkspaceAuthorized,
  validateAdminSupabaseOrigin,
  validateSafeAdminRedirectUrl,
} from '../apps/admin/src/auth/adminSecurityPolicy'

test('exact origin allowlist rejects substring spoofing and production URLs', () => {
  assert.equal(validateAdminSupabaseOrigin(APPROVED_DEVELOPMENT_SUPABASE_ORIGIN).approved, true)
  assert.equal(validateAdminSupabaseOrigin('https://evil.example/hznsbxvovjxvmnchzzqt').approved, false)
  assert.equal(validateAdminSupabaseOrigin('https://production.supabase.co').approved, false)
  assert.equal(validateAdminSupabaseOrigin('').approved, false)
})

test('fail-closed gate blocks anonymous, ordinary, expired, and error states', () => {
  assert.equal(
    evaluateAdminAccessGate({
      configApproved: true,
      isLoading: false,
      hasSession: false,
      profile: null,
    }).allowWorkspaceMount,
    false,
  )
  assert.equal(
    evaluateAdminAccessGate({
      configApproved: true,
      isLoading: false,
      hasSession: true,
      profile: null,
    }).status,
    'access_denied',
  )
  assert.equal(
    evaluateAdminAccessGate({
      configApproved: true,
      isLoading: false,
      hasSession: true,
      lookupError: 'network down',
      profile: null,
    }).status,
    'service_unavailable',
  )
  assert.equal(
    evaluateAdminAccessGate({
      configApproved: true,
      isLoading: false,
      hasSession: true,
      profile: { user_id: 'u1', role: 'moderator', is_active: true },
    }).allowWorkspaceMount,
    true,
  )
})

test('synthetic verification URLs and cross-origin redirects are rejected', () => {
  assert.equal(isSyntheticOrUnsafeEvidenceUrl('https://khelgrid.com/verify/KHL-123'), true)
  assert.equal(isSyntheticOrUnsafeEvidenceUrl('https://sai.gov.in/official-notice'), false)
  assert.equal(
    validateSafeAdminRedirectUrl('https://evil.example/phish', 'https://admin.khelgrid.com'),
    'https://admin.khelgrid.com/',
  )
  assert.equal(isWorkspaceAuthorized('academy_oversight', 'super_admin'), true)
  assert.equal(isWorkspaceAuthorized('academy_oversight', null), false)
})
