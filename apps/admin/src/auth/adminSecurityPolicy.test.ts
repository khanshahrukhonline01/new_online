import { describe, expect, it } from 'vitest'
import {
  APPROVED_DEVELOPMENT_SUPABASE_ORIGIN,
  evaluateAdminAccessGate,
  getGovernanceCapabilities,
  isSyntheticOrUnsafeEvidenceUrl,
  isValidAdminAnonKey,
  isWorkspaceAuthorized,
  validateAdminSupabaseOrigin,
  validateSafeAdminRedirectUrl,
} from './adminSecurityPolicy'

describe('Phase 1 Admin Security Policy', () => {
  describe('validateAdminSupabaseOrigin (exact origin allowlist)', () => {
    it('accepts the exact approved development Supabase origin', () => {
      const res = validateAdminSupabaseOrigin(APPROVED_DEVELOPMENT_SUPABASE_ORIGIN)
      expect(res.approved).toBe(true)
      expect(res.origin).toBe(APPROVED_DEVELOPMENT_SUPABASE_ORIGIN)
      expect(res.projectRef).toBe('hznsbxvovjxvmnchzzqt')
    })

    it('rejects empty, production, HTTP, and substring-spoofed URLs', () => {
      const rejectedCases = [
        undefined,
        '',
        'https://production-project-id.supabase.co',
        'http://hznsbxvovjxvmnchzzqt.supabase.co',
        'https://evil.example/hznsbxvovjxvmnchzzqt',
        'https://hznsbxvovjxvmnchzzqt.supabase.co.evil.example',
        'https://hznsbxvovjxvmnchzzqt.supabase.co/extra-path',
        'https://hznsbxvovjxvmnchzzqt.supabase.co/?ref=1',
        'https://user:pass@hznsbxvovjxvmnchzzqt.supabase.co',
      ]
      for (const candidate of rejectedCases) {
        const res = validateAdminSupabaseOrigin(candidate)
        expect(res.approved, `expected rejection for ${String(candidate)}`).toBe(false)
      }
    })
  })

  describe('isValidAdminAnonKey', () => {
    it('rejects empty and placeholder keys and accepts realistic tokens', () => {
      expect(isValidAdminAnonKey('')).toBe(false)
      expect(isValidAdminAnonKey('example')).toBe(false)
      expect(isValidAdminAnonKey('your-anon-key-placeholder-value-1234567890')).toBe(false)
      expect(isValidAdminAnonKey('a'.repeat(64))).toBe(true)
    })
  })

  describe('validateSafeAdminRedirectUrl', () => {
    const origin = 'https://admin.khelgrid.com'

    it('allows same-origin paths and rejects external or unsafe URLs', () => {
      expect(validateSafeAdminRedirectUrl('/reset', origin)).toBe('https://admin.khelgrid.com/reset')
      expect(validateSafeAdminRedirectUrl('https://admin.khelgrid.com/login?type=recovery', origin)).toBe(
        'https://admin.khelgrid.com/login?type=recovery',
      )
      expect(validateSafeAdminRedirectUrl('https://evil.example/steal', origin)).toBe('https://admin.khelgrid.com/')
      expect(validateSafeAdminRedirectUrl('//evil.example/steal', origin)).toBe('https://admin.khelgrid.com/')
      expect(validateSafeAdminRedirectUrl('javascript:alert(1)', origin)).toBe('https://admin.khelgrid.com/')
    })
  })

  describe('isSyntheticOrUnsafeEvidenceUrl', () => {
    it('blocks internal synthetic khelgrid.com/verify URLs and non-HTTPS URLs', () => {
      expect(isSyntheticOrUnsafeEvidenceUrl('https://khelgrid.com/verify/KHL-2026-001')).toBe(true)
      expect(isSyntheticOrUnsafeEvidenceUrl('https://www.khelgrid.com/verify/KHL-2026-001')).toBe(true)
      expect(isSyntheticOrUnsafeEvidenceUrl('http://official.gov.in/notice')).toBe(true)
      expect(isSyntheticOrUnsafeEvidenceUrl('https://localhost/verify')).toBe(true)
      expect(isSyntheticOrUnsafeEvidenceUrl('https://sportsauthorityofindia.nic.in/trials/2026')).toBe(false)
    })
  })

  describe('evaluateAdminAccessGate (fail-closed state machine)', () => {
    it('blocks mount when config is invalid', () => {
      const decision = evaluateAdminAccessGate({
        configApproved: false,
        isLoading: false,
        hasSession: true,
        profile: { user_id: 'u1', role: 'super_admin', is_active: true },
      })
      expect(decision.status).toBe('config_invalid')
      expect(decision.allowWorkspaceMount).toBe(false)
    })

    it('blocks mount while auth is still resolving (prevents flash of protected chrome)', () => {
      const decision = evaluateAdminAccessGate({
        configApproved: true,
        isLoading: true,
        hasSession: false,
        profile: null,
      })
      expect(decision.status).toBe('checking')
      expect(decision.allowWorkspaceMount).toBe(false)
    })

    it('denies anonymous visitors', () => {
      const decision = evaluateAdminAccessGate({
        configApproved: true,
        isLoading: false,
        hasSession: false,
        profile: null,
      })
      expect(decision.status).toBe('unauthenticated')
      expect(decision.allowWorkspaceMount).toBe(false)
    })

    it('stops protected access on expired or revoked session', () => {
      const decision = evaluateAdminAccessGate({
        configApproved: true,
        isLoading: false,
        hasSession: false,
        sessionExpired: true,
        profile: null,
      })
      expect(decision.status).toBe('session_expired')
      expect(decision.allowWorkspaceMount).toBe(false)
    })

    it('denies ordinary authenticated users and revoked moderators', () => {
      const ordinary = evaluateAdminAccessGate({
        configApproved: true,
        isLoading: false,
        hasSession: true,
        profile: null,
      })
      expect(ordinary.status).toBe('access_denied')
      expect(ordinary.allowWorkspaceMount).toBe(false)

      const revoked = evaluateAdminAccessGate({
        configApproved: true,
        isLoading: false,
        hasSession: true,
        profile: { user_id: 'u2', role: 'moderator', is_active: false },
      })
      expect(revoked.status).toBe('access_denied')
      expect(revoked.allowWorkspaceMount).toBe(false)
    })

    it('fails closed when authorization lookup fails', () => {
      const decision = evaluateAdminAccessGate({
        configApproved: true,
        isLoading: false,
        hasSession: true,
        lookupError: 'RPC timeout',
        profile: { user_id: 'u3', role: 'super_admin', is_active: true },
      })
      expect(decision.status).toBe('service_unavailable')
      expect(decision.allowWorkspaceMount).toBe(false)
    })

    it('authorizes active moderators and super-admins with their exact server role', () => {
      const mod = evaluateAdminAccessGate({
        configApproved: true,
        isLoading: false,
        hasSession: true,
        profile: { user_id: 'u4', role: 'moderator', is_active: true },
      })
      expect(mod.status).toBe('authorized')
      expect(mod.allowWorkspaceMount).toBe(true)
      expect(mod.role).toBe('moderator')

      const sa = evaluateAdminAccessGate({
        configApproved: true,
        isLoading: false,
        hasSession: true,
        profile: { user_id: 'u5', role: 'super_admin', is_active: true },
      })
      expect(sa.status).toBe('authorized')
      expect(sa.allowWorkspaceMount).toBe(true)
      expect(sa.role).toBe('super_admin')
    })
  })

  describe('workspace authorization boundaries', () => {
    it('allows all graduated operational workspaces for active roles while blocking unauthenticated callers', () => {
      expect(isWorkspaceAuthorized('command', null)).toBe(false)
      expect(isWorkspaceAuthorized('command', 'moderator')).toBe(true)
      expect(isWorkspaceAuthorized('moderation_desk', 'moderator')).toBe(true)
      expect(isWorkspaceAuthorized('fraud_disputes', 'moderator')).toBe(true)
      expect(isWorkspaceAuthorized('fraud_disputes', 'super_admin')).toBe(true)
      expect(isWorkspaceAuthorized('platform_governance', 'moderator')).toBe(true)
      expect(isWorkspaceAuthorized('platform_governance', 'super_admin')).toBe(true)
      expect(isWorkspaceAuthorized('platform_governance', null)).toBe(false)
      expect(isWorkspaceAuthorized('gate_desk', 'moderator')).toBe(true)
      expect(isWorkspaceAuthorized('gate_desk', 'super_admin')).toBe(true)
      expect(isWorkspaceAuthorized('gate_desk', null)).toBe(false)
      expect(isWorkspaceAuthorized('turf_oversight', 'super_admin')).toBe(true)
      expect(isWorkspaceAuthorized('academy_oversight', 'super_admin')).toBe(true)

      const modCaps = getGovernanceCapabilities('moderator')
      expect(modCaps.canViewAuditExplorer).toBe(true)
      expect(modCaps.canMutateFeatureFlags).toBe(false)
      expect(modCaps.canManageOperatorRbac).toBe(false)

      const saCaps = getGovernanceCapabilities('super_admin')
      expect(saCaps.canMutateFeatureFlags).toBe(true)
      expect(saCaps.canPublishBanners).toBe(true)
      expect(saCaps.canEditTaxonomies).toBe(true)
      expect(saCaps.canManageOperatorRbac).toBe(true)
    })
  })
})
