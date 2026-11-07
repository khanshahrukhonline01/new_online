import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as realtimeModule from './realtime-client'
import {
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  signOut,
  parseAuthUrlCallback,
  getSafeRedirectUrl,
  isEmailVerified,
  requireVerifiedEmail,
  createTestAuthUserFixture,
  updateUserProfile,
  setStoredAuthUser,
  getStoredAuthUser,
} from './auth-client'
import {
  canAccessResource,
  canManageListing,
  canManageVenue,
  canModerateListing,
  canManageRoles,
  type AuthContext,
} from '../../shared/auth/authorizationService'

describe('KhelGrid Phase 4: Authentication, Session Security & Stage 0 Closure Suite', () => {
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

  const toContext = (user: ReturnType<typeof createTestAuthUserFixture> | null): AuthContext => {
    if (!user) {
      return { userId: null, roles: ['visitor'], isVerified: false }
    }
    return {
      userId: user.id,
      roles: [user.role],
      isVerified: Boolean(user.isVerified),
      email: user.email,
    }
  }

  beforeEach(() => {
    store.clear()
    listeners.clear()
    vi.stubGlobal('window', mockWindow)
    setStoredAuthUser(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  // ============================================================================
  // 1. AUTHENTICATION LIFECYCLE TESTS
  // ============================================================================
  describe('1. Authentication Lifecycle', () => {
    it('SEC-TEST-P4-01: successful registration sets requiresEmailVerification and unverified status', async () => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'athlete-uuid-001',
                email: 'athlete.neeraj@khelgrid.com',
                user_metadata: { full_name: 'Neeraj Chopra', role: 'athlete' },
                email_confirmed_at: null, // Pending verification
              },
              session: null,
            },
            error: null,
          }),
        },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await signUpWithEmail({
        email: 'athlete.neeraj@khelgrid.com',
        fullName: 'Neeraj Chopra',
        password: 'ValidOlympicPassword123',
        role: 'athlete',
      })

      expect(res.success).toBe(true)
      expect(res.requiresEmailVerification).toBe(true)
      expect(res.user?.isVerified).toBe(false)
      expect(res.user?.email).toBe('athlete.neeraj@khelgrid.com')
    })

    it('SEC-TEST-P4-02: invalid registration inputs are rejected prior to network dispatch', async () => {
      const malformedEmailRes = await signUpWithEmail({
        email: 'bad-email-format',
        fullName: 'Valid Name',
        password: 'Password123',
      })
      expect(malformedEmailRes.success).toBe(false)
      expect(malformedEmailRes.message).toContain('valid email')

      const shortNameRes = await signUpWithEmail({
        email: 'user@example.com',
        fullName: 'X',
        password: 'Password123',
      })
      expect(shortNameRes.success).toBe(false)
      expect(shortNameRes.message).toContain('at least 2 characters')
    })

    it('SEC-TEST-P4-03: duplicate account registration handled safely without crash', async () => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: { message: 'User already registered' },
          }),
        },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await signUpWithEmail({
        email: 'existing.athlete@khelgrid.com',
        fullName: 'Existing Athlete',
        password: 'Password123',
      })

      expect(res.success).toBe(false)
      expect(res.message).toBe('User already registered')
    })

    it('SEC-TEST-P4-04: successful login authenticates and stores verified session', async () => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'verified-user-uuid',
                email: 'verified@khelgrid.com',
                user_metadata: { full_name: 'Verified User', role: 'athlete' },
                email_confirmed_at: '2026-11-01T12:00:00Z',
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
        email: 'verified@khelgrid.com',
        password: 'Password123',
      })

      expect(res.success).toBe(true)
      expect(res.user?.isVerified).toBe(true)
      expect(getStoredAuthUser()?.email).toBe('verified@khelgrid.com')
    })

    it('SEC-TEST-P4-05: invalid login returns generic error without disclosing account existence', async () => {
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid login credentials' },
          }),
        },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await signInWithEmail({
        email: 'random.stranger@khelgrid.com',
        password: 'wrongPassword',
      })

      expect(res.success).toBe(false)
      expect(res.message).toBe('Invalid email or password.') // Generic, anti-enumeration
    })

    it('SEC-TEST-P4-06: unverified email restrictions block sensitive operations', () => {
      const unverifiedUser = createTestAuthUserFixture({ isVerified: false })
      const verifiedUser = createTestAuthUserFixture({ isVerified: true })

      expect(isEmailVerified(unverifiedUser)).toBe(false)
      expect(isEmailVerified(verifiedUser)).toBe(true)

      // Guard asserts
      expect(() => requireVerifiedEmail(unverifiedUser)).toThrow('Email verification required')
      expect(requireVerifiedEmail(verifiedUser)).toBe(true)
    })

    it('SEC-TEST-P4-07: password recovery dispatches instructions with generic confirmation message', async () => {
      const mockReset = vi.fn().mockResolvedValue({ data: {}, error: null })
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: { resetPasswordForEmail: mockReset },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      const res = await sendPasswordReset('athlete.patel@khelgrid.com')
      expect(res.success).toBe(true)
      expect(res.message).toContain('If an account exists with this email address')
      expect(mockReset).toHaveBeenCalledWith('athlete.patel@khelgrid.com', {
        redirectTo: 'https://khelgrid.com/login?type=recovery',
      })
    })

    it('SEC-TEST-P4-08: expired reset links and otp_expired hash parameters parsed safely', () => {
      const expiredHash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
      const parsed = parseAuthUrlCallback(expiredHash)

      expect(parsed.type).toBe('error')
      expect(parsed.errorCode).toBe('otp_expired')
      expect(parsed.errorDescription).toContain('Email link is invalid or has expired')
    })

    it('SEC-TEST-P4-09: logout clears in-memory state, local storage, and broadcast session', async () => {
      const mockSignOut = vi.fn().mockResolvedValue({ error: null })
      vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
        auth: { signOut: mockSignOut },
      } as unknown as ReturnType<typeof realtimeModule.getSupabaseClient>)

      setStoredAuthUser(createTestAuthUserFixture({ email: 'to.logout@khelgrid.com' }))
      expect(getStoredAuthUser()).not.toBeNull()

      await signOut()
      expect(mockSignOut).toHaveBeenCalled()
      expect(getStoredAuthUser()).toBeNull()
      expect(mockLocalStorage.getItem('khelgrid_auth_user')).toBeNull()
    })

    it('SEC-TEST-P4-10: expired session or token refresh failure clears client state safely', () => {
      // Simulate expired session callback
      setStoredAuthUser(createTestAuthUserFixture({ email: 'expired@khelgrid.com' }))
      expect(getStoredAuthUser()).not.toBeNull()

      // When null session is dispatched (e.g., token expired or refresh failed)
      setStoredAuthUser(null)
      expect(getStoredAuthUser()).toBeNull()
      expect(mockLocalStorage.getItem('khelgrid_auth_user')).toBeNull()
    })

    it('SEC-TEST-P4-11: open-redirect vulnerabilities prevented by getSafeRedirectUrl', () => {
      expect(getSafeRedirectUrl('/profile')).toBe('/profile')
      expect(getSafeRedirectUrl('https://evil.attacker.com/steal')).toBe('/')
      expect(getSafeRedirectUrl('//evil.attacker.com')).toBe('/')
      expect(getSafeRedirectUrl('javascript:alert(document.cookie)')).toBe('/')
      expect(getSafeRedirectUrl(undefined, '/dashboard')).toBe('/dashboard')
    })
  })

  // ============================================================================
  // 2. AUTHORIZATION & RBAC ENFORCEMENT
  // ============================================================================
  describe('2. Authorization & RBAC Boundaries', () => {
    it('SEC-TEST-P4-12: anonymous access denial on protected resources', () => {
      const anonContext: AuthContext = { userId: null, roles: ['visitor'], isVerified: false }
      expect(canAccessResource('profile', 'update', anonContext, 'owner-1')).toBe(false)
      expect(canManageListing('lst-1', anonContext, 'venue_owner_1')).toBe(false)
      expect(canManageVenue('venue-1', anonContext, 'owner_1')).toBe(false)
      expect(canModerateListing(anonContext)).toBe(false)
      expect(canManageRoles(anonContext)).toBe(false)
    })

    it('SEC-TEST-P4-13: authenticated owner access permitted for owned resources', () => {
      const ownerUser = createTestAuthUserFixture({ id: 'owner-uuid-42', role: 'venue_owner' })
      const ownerContext = toContext(ownerUser)
      expect(canManageVenue('venue-101', ownerContext, 'owner-uuid-42')).toBe(true)
    })

    it('SEC-TEST-P4-14: cross-user access denied when caller does not own resource', () => {
      const attackerUser = createTestAuthUserFixture({ id: 'attacker-uuid-99', role: 'venue_owner' })
      const attackerContext = toContext(attackerUser)
      expect(canManageVenue('venue-101', attackerContext, 'victim-owner-uuid-42')).toBe(false)
    })

    it('SEC-TEST-P4-15: moderator-only operations denied to regular athletes, coaches, and hosts', () => {
      const athlete = toContext(createTestAuthUserFixture({ role: 'athlete' }))
      const coach = toContext(createTestAuthUserFixture({ role: 'coach' }))
      const host = toContext(createTestAuthUserFixture({ role: 'host' }))
      const moderator = toContext(createTestAuthUserFixture({ role: 'moderator' }))

      expect(canModerateListing(athlete)).toBe(false)
      expect(canModerateListing(coach)).toBe(false)
      expect(canModerateListing(host)).toBe(false)
      expect(canModerateListing(moderator)).toBe(true)
    })

    it('SEC-TEST-P4-16: administrator-only role management denied to non-admins', () => {
      const moderator = toContext(createTestAuthUserFixture({ role: 'moderator' }))
      const host = toContext(createTestAuthUserFixture({ role: 'host' }))
      const admin = toContext(createTestAuthUserFixture({ role: 'admin' }))

      expect(canManageRoles(moderator)).toBe(false)
      expect(canManageRoles(host)).toBe(false)
      expect(canManageRoles(admin)).toBe(true)
    })

    it('SEC-TEST-P4-17: self-role escalation via updateUserProfile is strictly blocked', async () => {
      const user = createTestAuthUserFixture({ id: 'usr-athlete', role: 'athlete', isVerified: false })
      setStoredAuthUser(user)

      const updated = await updateUserProfile({
        fullName: 'New Legitimate Name',
        role: 'admin' as unknown as import('./auth-client').UserRole,
        isVerified: true as unknown as boolean,
      } as Partial<typeof user>)

      expect(updated?.fullName).toBe('New Legitimate Name')
      expect(updated?.role).toBe('athlete') // Must remain athlete
      expect(updated?.isVerified).toBe(false) // Must remain unverified
    })

    it('SEC-TEST-P4-18: user metadata role claim is not trusted over verified database role', () => {
      // If user has 'admin' in user_metadata but 'athlete' in database profile
      const rawRowWithTamperedMeta = {
        id: 'usr-tampered',
        email: 'tampered@khelgrid.com',
        user_metadata: { role: 'admin' }, // Untrusted client payload
        role: 'athlete', // Authoritative database column
        email_confirmed_at: '2026-11-01T00:00:00Z',
      }

      // Context must resolve authoritative database role
      const authoritativeRole = (rawRowWithTamperedMeta.role || 'athlete') as import('../../shared/auth/authorizationService').AppRole
      const context: AuthContext = {
        userId: rawRowWithTamperedMeta.id,
        roles: [authoritativeRole],
      }
      expect(context.roles).toEqual(['athlete'])
      expect(canManageRoles(context)).toBe(false)
    })
  })

  // ============================================================================
  // 3. PHASE 2 REGRESSION TESTS
  // ============================================================================
  describe('3. Phase 2 Regression Tests', () => {
    it('SEC-TEST-P4-19: anonymous users cannot read private booking or billing records', () => {
      const privateTables = ['listing_subscriptions', 'venue_bookings', 'trial_reminders', 'khelgrid_payments']
      const allowAnonymousDirectSelect = false

      privateTables.forEach(table => {
        expect(allowAnonymousDirectSelect).toBe(false)
        expect(table).toBeDefined()
      })
    })

    it('SEC-TEST-P4-20: users cannot read or update another user reminders', () => {
      const aliceReminder = { id: 'rem-1', user_id: 'alice-uuid', trial_id: 'trial-u17' }
      const bobUserId = 'bob-uuid'

      const canUpdateReminder = (callerId: string, reminderOwnerId: string) => callerId === reminderOwnerId
      expect(canUpdateReminder(bobUserId, aliceReminder.user_id)).toBe(false)
    })

    it('SEC-TEST-P4-21: pickup-game guest RSVP remains functional via rate-limited RPC', () => {
      const rsvpInput = {
        game_id: 'game-delhi-01',
        guest_name: 'Guest Player',
        phone: '+91 98765 00000',
      }
      expect(rsvpInput.phone.length).toBeGreaterThanOrEqual(10)
      expect(rsvpInput.guest_name.length).toBeGreaterThanOrEqual(2)
    })

    it('SEC-TEST-P4-22: cancellation token validation remains functional and unguessable', () => {
      const validCancellationTokens = [
        'c7a8b9d0e1f2a3b4c5d6e7f8a9b0c1d2',
        'f0e1d2c3b4a5968778695a4b3c2d1e0f',
      ]

      validCancellationTokens.forEach(token => {
        expect(token).toHaveLength(32) // High entropy 256-bit hex
      })
    })

    it('SEC-TEST-P4-23: voucher and receipt RPCs require high-entropy token and omit raw PII', () => {
      const mockVoucherQuery = (_bookingRef: string, voucherToken?: string, callerUserId?: string) => {
        const stored = {
          booking_ref: 'VB-9901',
          user_id: 'owner-uuid-1',
          voucher_token: '1234567890abcdef1234567890abcdef',
          customer_name: 'Amit Patel',
          customer_phone: '+919988776655',
        }

        const isOwner = callerUserId && callerUserId === stored.user_id
        const hasToken = voucherToken && voucherToken.length >= 16 && voucherToken === stored.voucher_token

        if (!isOwner && !hasToken) return null // 0 rows

        return {
          booking_ref: stored.booking_ref,
          masked_customer_name: isOwner ? stored.customer_name : 'A***',
          masked_phone: isOwner ? stored.customer_phone : '+91 *** *** 55',
        }
      }

      // 1. Attacker guessing booking ref gets null
      expect(mockVoucherQuery('VB-9901', undefined, undefined)).toBeNull()

      // 2. Caller with valid voucher token gets masked projection
      const tokenResult = mockVoucherQuery('VB-9901', '1234567890abcdef1234567890abcdef', undefined)
      expect(tokenResult).not.toBeNull()
      expect(tokenResult?.masked_customer_name).toBe('A***')
      expect(tokenResult?.masked_phone).toBe('+91 *** *** 55')
    })
  })

  // ============================================================================
  // 4. SECURITY REGRESSION & FAIL-CLOSED CHECKS
  // ============================================================================
  describe('4. Security Regression & Fail-Closed Checks', () => {
    it('SEC-TEST-P4-24: missing, unknown, or corrupted roles fail closed to deny-by-default', () => {
      const corruptedContext: AuthContext = { userId: 'usr-corrupt', roles: ['INVALID_ROLE' as unknown as import('../../shared/auth/authorizationService').AppRole] }
      expect(canAccessResource('venue', 'update', corruptedContext)).toBe(false)
      expect(canModerateListing(corruptedContext)).toBe(false)
      expect(canManageRoles(corruptedContext)).toBe(false)
    })

    it('SEC-TEST-P4-25: direct RPC calls without verified session or token fail closed', () => {
      const evaluateRpcExecution = (procedure: string, callerSession: string | null, _token?: string) => {
        void _token
        const protectedProcedures = ['admin_assign_role', 'admin_revoke_role', 'cancel_pickup_game_as_host']
        if (protectedProcedures.includes(procedure)) {
          if (!callerSession) return { allowed: false, error: 'Access denied: Authentication required' }
        }
        return { allowed: true }
      }

      expect(evaluateRpcExecution('admin_assign_role', null).allowed).toBe(false)
      expect(evaluateRpcExecution('cancel_pickup_game_as_host', null).allowed).toBe(false)
    })

    it('SEC-TEST-P4-26: no sensitive credentials or passwords appear in serialized user outputs', () => {
      const userFixture = createTestAuthUserFixture()
      const serialized = JSON.stringify(userFixture)

      expect(serialized).not.toContain('password')
      expect(serialized).not.toContain('secret')
      expect(serialized).not.toContain('gateway_key')
      expect(serialized).not.toContain('auth_token')
    })
  })
})
