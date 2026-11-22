import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  sanitizeUntrustedRole,
  setStoredAuthUser,
  getStoredAuthUser,
  createTestAuthUserFixture,
} from '../../integrations/supabase/auth-client'
import {
  getCurrentAuthContext,
  getCurrentUserRoles,
} from './authorizationService'

describe('Phase 1 Fail-Closed Auth & Authorization Utilities', () => {
  afterEach(() => {
    setStoredAuthUser(null)
    vi.restoreAllMocks()
  })

  it('strips admin and moderator roles from untrusted client sources', () => {
    expect(sanitizeUntrustedRole('admin')).toBe('athlete')
    expect(sanitizeUntrustedRole('moderator')).toBe('athlete')
    expect(sanitizeUntrustedRole('ADMIN')).toBe('athlete')
    expect(sanitizeUntrustedRole('coach')).toBe('coach')
  })

  it('never trusts privileged roles from localStorage or stored user context', () => {
    const forgedAdmin = createTestAuthUserFixture({ role: 'admin' })
    setStoredAuthUser(forgedAdmin)

    const ctx = getCurrentAuthContext()
    expect(ctx.roles).toEqual(['visitor'])
    expect(ctx.roles).not.toContain('admin')
    expect(ctx.roles).not.toContain('moderator')

    // Clearing in-memory cache and re-reading from storage must never produce admin
    setStoredAuthUser(null)
    expect(getStoredAuthUser()).toBeNull()
  })

  it('fails closed to visitor when server role lookup is unavailable', async () => {
    const user = createTestAuthUserFixture({ role: 'coach' })
    setStoredAuthUser(user)

    // Without a configured live Supabase client in unit tests, getCurrentUserRoles must fail closed
    const roles = await getCurrentUserRoles(user.id)
    expect(roles).toEqual(['visitor'])
  })
})
