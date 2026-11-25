import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as realtimeModule from './realtime-client'
import {
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  updatePassword,
  signOut,
  resendVerificationEmail,
  parseAuthUrlCallback,
  clearAuthUrlHash,
  getStoredAuthUser,
  setStoredAuthUser,
  updateUserProfile,
  hasRole,
  hasPermission,
  getSafeRedirectUrl,
  isEmailVerified,
  requireVerifiedEmail,
  createTestAuthUserFixture,
  adminAssignRole,
  adminRevokeRole,
  type AuthUserProfile,
  type UserRole,
} from './auth-client'

describe('Supabase Auth Client Architecture & Session Security', () => {
  const store = new Map<string, string>()
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  }

  const listeners = new Map<string, Set<(e: unknown) => void>>()
  const mockWindow = {
    localStorage: mockLocalStorage,
    addEventListener: (event: string, cb: (e: unknown) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(cb)
    },
    removeEventListener: (event: string, cb: (e: unknown) => void) => {
      listeners.get(event)?.delete(cb)
    },
    dispatchEvent: (event: { type: string; detail?: unknown }) => {
      const cbs = listeners.get(event.type)
      if (cbs) cbs.forEach(cb => cb(event))
      return true
    },
    location: { origin: 'https://khelgrid.com', pathname: '/' },
    history: { replaceState: vi.fn() },
  }

  beforeEach(() => {
    store.clear()
    listeners.clear()
    vi.stubGlobal('window', mockWindow)
    if (typeof globalThis.CustomEvent === 'undefined') {
      class CustomEventPolyfill {
        type: string
        detail: unknown
        constructor(type: string, params?: { detail: unknown }) {
          this.type = type
          this.detail = params?.detail
        }
      }
      vi.stubGlobal('CustomEvent', CustomEventPolyfill)
    }
    setStoredAuthUser(null)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  // ============================================================================
  // 1. INPUT VALIDATION & ROLE PROTECTION
  // ============================================================================
  describe('1. Input Validation & Role Protection', () => {
    it('validates email, name, and password rules before network call', async () => {
      const invalidEmailRes = await signUpWithEmail({
        email: 'notanemail',
        fullName: 'Aakash Verma',
        password: 'validPassword123',
      })
      expect(invalidEmailRes.success).toBe(false)
      expect(invalidEmailRes.message).toContain('valid email')

      const shortNameRes = await signUpWithEmail({
        email: 'aakash@example.com',
        fullName: 'A',
        password: 'validPassword123',
      })
      expect(shortNameRes.success).toBe(false)
      expect(shortNameRes.message).toContain('at least 2 characters')

      const shortPassRes = await signUpWithEmail({
        email: 'aakash@example.com',
        fullName: 'Aakash Verma',
        password: '123',
      })
      expect(shortPassRes.success).toBe(false)
      expect(shortPassRes.message).toContain('at least 6 characters')
    })

    it('demotes self-requested admin or moderator roles during registration', async () => {
      let registeredRole: string | undefined

      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          signUp: vi.fn().mockImplementation((opts: { options?: { data?: { role?: string } } }) => {
            registeredRole = opts.options?.data?.role
            return Promise.resolve({
              data: {
                user: {
                  id: 'usr-new',
                  email: 'attacker@example.com',
                  user_metadata: { full_name: 'Attacker', role: registeredRole },
                  email_confirmed_at: null,
                },
                session: null,
              },
              error: null,
            })
          }),
        },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await signUpWithEmail({
        email: 'attacker@example.com',
        fullName: 'Attacker User',
        password: 'StrongPassword123',
        role: 'admin', // Attempted self-promotion
      })

      expect(res.success).toBe(true)
      expect(registeredRole).toBe('athlete') // Must be demoted
      expect(res.user?.role).toBe('athlete')
    })
  })

  // ============================================================================
  // 2. UNCONFIGURED CLIENT HANDLING (NO SILENT DEMO FALLBACKS)
  // ============================================================================
  describe('2. Unconfigured Client Handling (Zero Fake Accounts)', () => {
    beforeEach(() => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue(null)
    })

    it('signUpWithEmail fails explicitly when Supabase is unconfigured', async () => {
      const res = await signUpWithEmail({
        email: 'user@example.com',
        fullName: 'Valid User',
        password: 'validPassword123',
      })
      expect(res.success).toBe(false)
      expect(res.message).toContain('not configured')
      expect(getStoredAuthUser()).toBeNull()
    })

    it('signInWithEmail fails explicitly when Supabase is unconfigured', async () => {
      const res = await signInWithEmail({
        email: 'user@example.com',
        password: 'validPassword123',
      })
      expect(res.success).toBe(false)
      expect(res.message).toContain('not configured')
      expect(getStoredAuthUser()).toBeNull()
    })

    it('sendPasswordReset fails explicitly when unconfigured', async () => {
      const res = await sendPasswordReset('user@example.com')
      expect(res.success).toBe(false)
      expect(res.message).toContain('not configured')
    })

    it('updatePassword fails explicitly when unconfigured', async () => {
      const res = await updatePassword('newSecretPassword123')
      expect(res.success).toBe(false)
      expect(res.message).toContain('not configured')
    })

    it('resendVerificationEmail fails explicitly when unconfigured', async () => {
      const res = await resendVerificationEmail('user@example.com')
      expect(res.success).toBe(false)
      expect(res.message).toContain('not configured')
    })

    it('adminAssignRole and adminRevokeRole fail explicitly when unconfigured', async () => {
      const assignRes = await adminAssignRole('usr-1', 'coach')
      expect(assignRes.success).toBe(false)
      expect(assignRes.message).toContain('not configured')

      const revokeRes = await adminRevokeRole('usr-1', 'coach')
      expect(revokeRes.success).toBe(false)
      expect(revokeRes.message).toContain('not configured')
    })
  })

  // ============================================================================
  // 3. CONFIGURED CLIENT AUTHENTICATION FLOWS
  // ============================================================================
  describe('3. Configured Client Authentication Flows', () => {
    it('signUpWithEmail registers user, requires email verification, and sets isVerified to false', async () => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'uuid-1234',
                email: 'rohit@khelgrid.com',
                user_metadata: { full_name: 'Rohit Verma', role: 'athlete', city: 'Delhi NCR' },
                email_confirmed_at: null, // Unverified
              },
              session: null,
            },
            error: null,
          }),
        },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await signUpWithEmail({
        email: 'rohit@khelgrid.com',
        fullName: 'Rohit Verma',
        password: 'SecurePassword123',
        role: 'athlete',
        city: 'Delhi NCR',
      })

      expect(res.success).toBe(true)
      expect(res.requiresEmailVerification).toBe(true)
      expect(res.user?.isVerified).toBe(false)
      expect(res.user?.email).toBe('rohit@khelgrid.com')
      expect(res.user?.fullName).toBe('Rohit Verma')
    })

    it('signInWithEmail authenticates user and populates session store', async () => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'uuid-host-1',
                email: 'host.fsv@khelgrid.com',
                user_metadata: { full_name: 'FSV Host', role: 'host' },
                email_confirmed_at: '2026-11-01T00:00:00Z', // Verified
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await signInWithEmail({
        email: 'host.fsv@khelgrid.com',
        password: 'password123',
      })

      expect(res.success).toBe(true)
      expect(res.user?.email).toBe('host.fsv@khelgrid.com')
      expect(res.user?.isVerified).toBe(true)
      expect(getStoredAuthUser()?.email).toBe('host.fsv@khelgrid.com')
    })

    it('signInWithEmail returns generic error message on invalid credentials', async () => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid login credentials' },
          }),
        },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await signInWithEmail({
        email: 'nobody@khelgrid.com',
        password: 'wrongPassword',
      })

      expect(res.success).toBe(false)
      expect(res.message).toBe('Invalid email or password.')
    })

    it('sendPasswordReset dispatches reset instructions with generic enumeration-safe response', async () => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await sendPasswordReset('coach.patel@khelgrid.com')
      expect(res.success).toBe(true)
      expect(res.message).toContain('If an account exists')
    })

    it('updatePassword calls auth.updateUser and enforces minimum length', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null })
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: { updateUser: mockUpdate },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const shortRes = await updatePassword('123')
      expect(shortRes.success).toBe(false)
      expect(shortRes.message).toContain('at least 6 characters')

      const validRes = await updatePassword('NewSecurePass2026')
      expect(validRes.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({ password: 'NewSecurePass2026' })
    })

    it('signOut completely clears authentication session, in-memory cache, and localStorage', async () => {
      const mockSignOut = vi.fn().mockResolvedValue({ error: null })
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: { signOut: mockSignOut },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const fixture = createTestAuthUserFixture({ email: 'signout.test@khelgrid.com' })
      setStoredAuthUser(fixture)
      expect(getStoredAuthUser()).not.toBeNull()

      await signOut()
      expect(mockSignOut).toHaveBeenCalled()
      expect(getStoredAuthUser()).toBeNull()
      expect(mockLocalStorage.getItem('khelgrid_auth_user')).toBeNull()
    })
  })

  // ============================================================================
  // 4. OPEN-REDIRECT PREVENTION & SAFE REDIRECTION
  // ============================================================================
  describe('4. Open-Redirect Prevention (getSafeRedirectUrl)', () => {
    it('accepts safe relative paths', () => {
      expect(getSafeRedirectUrl('/dashboard')).toBe('/dashboard')
      expect(getSafeRedirectUrl('/login?type=recovery')).toBe('/login?type=recovery')
      expect(getSafeRedirectUrl('/venues/turf-01')).toBe('/venues/turf-01')
    })

    it('rejects external absolute URLs and defaults to fallback', () => {
      expect(getSafeRedirectUrl('https://malicious.com')).toBe('/')
      expect(getSafeRedirectUrl('http://attacker.com/evil')).toBe('/')
      expect(getSafeRedirectUrl('//attacker.com/evil')).toBe('/')
    })

    it('rejects javascript: and data: pseudo-protocols', () => {
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/')
      expect(getSafeRedirectUrl('data:text/html,<script>')).toBe('/')
      expect(getSafeRedirectUrl('/\\evil.com')).toBe('/')
    })

    it('respects custom fallback path', () => {
      expect(getSafeRedirectUrl('https://bad.com', '/profile')).toBe('/profile')
      expect(getSafeRedirectUrl(null, '/home')).toBe('/home')
    })
  })

  // ============================================================================
  // 5. EMAIL VERIFICATION STATE DISTINCTION
  // ============================================================================
  describe('5. Email Verification State Distinction', () => {
    it('isEmailVerified correctly checks isVerified flag', () => {
      const verifiedUser = createTestAuthUserFixture({ isVerified: true })
      const unverifiedUser = createTestAuthUserFixture({ isVerified: false })

      expect(isEmailVerified(verifiedUser)).toBe(true)
      expect(isEmailVerified(unverifiedUser)).toBe(false)
      expect(isEmailVerified(null)).toBe(false)
    })

    it('requireVerifiedEmail asserts verification and rejects unverified users', () => {
      const verifiedUser = createTestAuthUserFixture({ isVerified: true })
      const unverifiedUser = createTestAuthUserFixture({ isVerified: false })

      expect(requireVerifiedEmail(verifiedUser)).toBe(true)
      expect(() => requireVerifiedEmail(unverifiedUser)).toThrow('Email verification required')
      expect(() => requireVerifiedEmail(null)).toThrow('Authentication required')
    })
  })

  // ============================================================================
  // 6. PROFILE SECURITY & PRIVILEGE TAMPERING PREVENTION
  // ============================================================================
  describe('6. Profile Security & Privilege Tampering Prevention', () => {
    it('updateUserProfile shields role and isVerified from client mutation', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        from: vi.fn().mockReturnValue({
          upsert: mockUpsert,
        }),
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const user = createTestAuthUserFixture({ role: 'athlete', isVerified: false })
      setStoredAuthUser(user)

      // Attacker attempts to escalate role and fake verification in updateUserProfile
      const updated = await updateUserProfile({
        fullName: 'Legit Name Change',
        role: 'admin' as unknown as UserRole,
        isVerified: true as unknown as boolean,
      } as Partial<AuthUserProfile>)

      expect(updated?.fullName).toBe('Legit Name Change')
      expect(updated?.role).toBe('athlete') // Unchanged!
      expect(updated?.isVerified).toBe(false) // Unchanged!
      expect(getStoredAuthUser()?.role).toBe('athlete')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'Legit Name Change',
        }),
      )
    }, 10000)
  })

  // ============================================================================
  // 7. ROLE & PERMISSION HELPERS
  // ============================================================================
  describe('7. Role & Permission Matrix Checks', () => {
    it('hasRole correctly authorizes athlete, host, coach, and admin roles', () => {
      const athlete = createTestAuthUserFixture({ role: 'athlete' })
      const host = createTestAuthUserFixture({ role: 'host' })
      const admin = createTestAuthUserFixture({ role: 'admin' })

      expect(hasRole(athlete, ['athlete'])).toBe(true)
      expect(hasRole(athlete, ['host'])).toBe(false)
      expect(hasRole(host, ['host'])).toBe(true)
      expect(hasRole(admin, ['athlete'])).toBe(true) // Admin passes all
      expect(hasRole(admin, ['admin'])).toBe(true)
      expect(hasRole(null, ['athlete'])).toBe(false)
    })

    it('hasPermission verifies granular capabilities and grants admins wildcard', () => {
      const athlete = createTestAuthUserFixture({ role: 'athlete' })
      const coach = createTestAuthUserFixture({ role: 'coach' })
      const admin = createTestAuthUserFixture({ role: 'admin' })

      expect(hasPermission(athlete, 'trial:submit')).toBe(true)
      expect(hasPermission(athlete, 'admin:assign_role')).toBe(false)

      expect(hasPermission(coach, 'coach:manage_inquiries')).toBe(true)
      expect(hasPermission(coach, 'admin:assign_role')).toBe(false)

      expect(hasPermission(admin, 'admin:assign_role')).toBe(true)
      expect(hasPermission(admin, 'any:arbitrary_permission')).toBe(true)
      expect(hasPermission(null, 'profile:view')).toBe(false)
    })
  })

  // ============================================================================
  // 8. URL AUTH CALLBACKS & PARSING
  // ============================================================================
  describe('8. URL Callback Parsing & Hash Cleanup', () => {
    it('parseAuthUrlCallback extracts otp_expired and access_denied hash parameters', () => {
      const hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'
      const parsed = parseAuthUrlCallback(hash)

      expect(parsed.type).toBe('error')
      expect(parsed.errorCode).toBe('otp_expired')
      expect(parsed.errorDescription).toBe('Email link is invalid')
    })

    it('parseAuthUrlCallback extracts recovery and signup tokens', () => {
      const recoveryHash = '#type=recovery&access_token=token-12345'
      const parsedRecovery = parseAuthUrlCallback(recoveryHash)
      expect(parsedRecovery.type).toBe('recovery')
      expect(parsedRecovery.accessToken).toBe('token-12345')

      const signupHash = '#type=signup&access_token=token-67890'
      const parsedSignup = parseAuthUrlCallback(signupHash)
      expect(parsedSignup.type).toBe('signup_confirmed')
      expect(parsedSignup.accessToken).toBe('token-67890')
    })

    it('clearAuthUrlHash operates without crashing', () => {
      expect(() => clearAuthUrlHash()).not.toThrow()
    })
  })
})
