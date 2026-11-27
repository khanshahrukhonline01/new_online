import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as realtimeModule from './realtime-client'
import {
  sanitizeUntrustedRole,
  syncProfileFromDatabase,
  verifyEmailOtpCode,
} from './auth-client'

describe('Sprint 1 — Shared SaaS Foundation & P0 Security Remediation Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      dispatchEvent: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('strips untrusted privileged roles (admin/moderator) from client metadata/profile inputs', () => {
    expect(sanitizeUntrustedRole('admin')).toBe('athlete')
    expect(sanitizeUntrustedRole('moderator')).toBe('athlete')
    expect(sanitizeUntrustedRole('academy')).toBe('academy')
    expect(sanitizeUntrustedRole('coach')).toBe('coach')
    expect(sanitizeUntrustedRole('unknown_role', 'coach')).toBe('coach')
  })

  it('syncProfileFromDatabase preserves email & emailConfirmedAt and downgrades tampered admin roles', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'user-p0-1',
        display_name: 'Escalation Test User',
        role: 'admin',
        created_at: '2026-11-27T00:00:00Z',
      },
      error: null,
    })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))

    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      from,
    } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

    const profile = await syncProfileFromDatabase('user-p0-1', {
      email: 'verified-coach@khelgrid.com',
      emailConfirmedAt: '2026-11-27T10:30:00Z',
    })

    expect(profile).not.toBeNull()
    expect(profile?.email).toBe('verified-coach@khelgrid.com')
    expect(profile?.isVerified).toBe(true)
    expect(profile?.role).toBe('athlete')
  })

  it('verifyEmailOtpCode derives isVerified strictly from email_confirmed_at without fabricating timestamps', async () => {
    const verifyOtpUnconfirmed = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'otp-user-1',
          email: 'pending@khelgrid.com',
          email_confirmed_at: null,
          user_metadata: { role: 'academy', full_name: 'Pending Academy' },
        },
      },
      error: null,
    })
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))

    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      auth: { verifyOtp: verifyOtpUnconfirmed },
      from,
    } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

    const unconfirmedResult = await verifyEmailOtpCode({
      email: 'pending@khelgrid.com',
      token: '123456',
      type: 'signup',
    })

    expect(unconfirmedResult.success).toBe(true)
    expect(unconfirmedResult.user?.isVerified).toBe(false)
  })

  it('enforces P0 migration invariants and Sprint 1 CI coverage in workflow definitions', async () => {
    // @ts-expect-error - node dynamic import in vitest
    const fs = await import('node:fs')
    // @ts-expect-error - node dynamic import in vitest
    const path = await import('node:path')
    const migrationPath = path.resolve(
      'supabase',
      'migrations',
      '20261128000000_shared_saas_foundation_p0_remediation.sql',
    )
    const ciPath = path.resolve('.github', 'workflows', 'ci.yml')
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8')
    const ciYaml = fs.readFileSync(ciPath, 'utf-8')

    expect(migrationSql).toContain('DROP POLICY IF EXISTS "tenants_auth_insert" ON public.tenants')
    expect(migrationSql).toContain('REVOKE INSERT, DELETE ON public.tenants FROM PUBLIC, anon, authenticated')
    expect(migrationSql).toContain('directory_publication_status')
    expect(migrationSql).toContain('NEW.verification_status = \'verified\'')
    expect(migrationSql).toContain('AND NEW.directory_publication_status = \'approved\'')
    expect(migrationSql).toContain('m.deleted_at IS NULL')
    expect(migrationSql).toContain('t.deleted_at IS NULL')
    expect(migrationSql).toContain('FORCE ROW LEVEL SECURITY')

    expect(ciYaml).toContain('20261128000000_shared_saas_foundation_p0_remediation.sql')
    expect(ciYaml).toContain('sprint1-shared-saas-assertions.sql')
    expect(ciYaml).toContain('fix/**')
  })
})
