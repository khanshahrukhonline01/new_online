import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  onAuthChange,
  mapToUserProfile,
  type AuthUserProfile,
} from './auth-client'

describe('Supabase Auth Client Architecture', () => {
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
    location: { origin: 'https://khelgrid.com' },
  }

  beforeEach(() => {
    store.clear()
    listeners.clear()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
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
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('1. signUpWithEmail validates email, name, and password rules', async () => {
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

  it('2. signUpWithEmail successfully registers athlete and persists session', async () => {
    const res = await signUpWithEmail({
      email: 'athlete.rohit@khelgrid.com',
      fullName: 'Rohit Verma',
      password: 'SecurePassword123',
      role: 'athlete',
      city: 'Delhi NCR',
      phone: '+91 98765 43210',
      preferredSports: ['Cricket', 'Athletics'],
    })

    expect(res.success).toBe(true)
    const stored = getStoredAuthUser()
    expect(stored).not.toBeNull()
    expect(stored?.email).toBe('athlete.rohit@khelgrid.com')
    expect(stored?.fullName).toBe('Rohit Verma')
    expect(stored?.name).toBe('Rohit Verma')
    expect(stored?.role).toBe('athlete')
    expect(stored?.city).toBe('Delhi NCR')
  })

  it('3. signInWithEmail authenticates user and updates state', async () => {
    // Attempt invalid email
    const invalidRes = await signInWithEmail({ email: 'bad' })
    expect(invalidRes.success).toBe(false)

    // Successful sign in
    const res = await signInWithEmail({
      email: 'host.fsv@khelgrid.com',
      password: 'password123',
    })

    expect(res.success).toBe(true)
    expect(res.user?.email).toBe('host.fsv@khelgrid.com')
    expect(getStoredAuthUser()?.email).toBe('host.fsv@khelgrid.com')
  })

  it('4. sendPasswordReset dispatches reset instructions', async () => {
    const badRes = await sendPasswordReset('invalid')
    expect(badRes.success).toBe(false)

    const goodRes = await sendPasswordReset('coach.patel@khelgrid.com')
    expect(goodRes.success).toBe(true)
    expect(goodRes.message).toBeDefined()
  })

  it('5. updatePassword enforces minimum length', async () => {
    const shortRes = await updatePassword('123')
    expect(shortRes.success).toBe(false)
    expect(shortRes.message).toContain('at least 6 characters')

    const okRes = await updatePassword('newSecretKey2026')
    expect(okRes.success).toBe(true)
  })

  it('6. signOut completely clears authentication session and localStorage', async () => {
    await signInWithEmail({ email: 'test.user@khelgrid.com' })
    expect(getStoredAuthUser()).not.toBeNull()

    await signOut()
    expect(getStoredAuthUser()).toBeNull()
    expect(mockLocalStorage.getItem('khelgrid_auth_user')).toBeNull()
  })

  it('7. hasRole correctly authorizes athlete, host, coach, and admin roles', () => {
    const athleteUser: AuthUserProfile = {
      id: 'usr-1',
      email: 'athlete@khelgrid.com',
      fullName: 'Sunil Chhetri',
      name: 'Sunil Chhetri',
      role: 'athlete',
      isVerified: true,
      createdAt: new Date().toISOString(),
    }

    const hostUser: AuthUserProfile = {
      id: 'usr-2',
      email: 'host@khelgrid.com',
      fullName: 'FSV Arena Manager',
      name: 'FSV Arena Manager',
      role: 'host',
      isVerified: true,
      createdAt: new Date().toISOString(),
    }

    const adminUser: AuthUserProfile = {
      id: 'usr-3',
      email: 'admin@khelgrid.com',
      fullName: 'Super Admin',
      name: 'Super Admin',
      role: 'admin',
      isVerified: true,
      createdAt: new Date().toISOString(),
    }

    expect(hasRole(athleteUser, ['athlete'])).toBe(true)
    expect(hasRole(athleteUser, ['host', 'coach'])).toBe(false)

    expect(hasRole(hostUser, ['host'])).toBe(true)
    expect(hasRole(hostUser, ['athlete'])).toBe(false)

    // Admin should automatically pass all role authorization checks
    expect(hasRole(adminUser, ['athlete'])).toBe(true)
    expect(hasRole(adminUser, ['host'])).toBe(true)
    expect(hasRole(adminUser, ['coach'])).toBe(true)
    expect(hasRole(adminUser, ['admin'])).toBe(true)

    // Null user
    expect(hasRole(null, ['athlete'])).toBe(false)
  })

  it('8. updateUserProfile merges profile updates and maintains fullName and name synchronization', async () => {
    await signUpWithEmail({
      email: 'zaheer@khelgrid.com',
      fullName: 'Coach Zaheer',
      role: 'coach',
    })

    const updated = await updateUserProfile({
      fullName: 'Coach Zaheer Farooq',
      city: 'Delhi NCR',
      bio: 'SAI NIS Patiala Certified Senior Coach',
      preferredSports: ['Cricket'],
    })

    expect(updated?.fullName).toBe('Coach Zaheer Farooq')
    expect(updated?.name).toBe('Coach Zaheer Farooq')
    expect(updated?.city).toBe('Delhi NCR')
    expect(updated?.bio).toContain('NIS Patiala')

    const stored = getStoredAuthUser()
    expect(stored?.fullName).toBe('Coach Zaheer Farooq')
    expect(stored?.name).toBe('Coach Zaheer Farooq')
  })

  it('9. onAuthChange responds to storage events and supports unsubscription', () => {
    const callback = vi.fn()
    const unsubscribe = onAuthChange(callback)

    // Initial invocation
    expect(callback).toHaveBeenCalledWith(null)

    // Update user
    const sampleUser: AuthUserProfile = {
      id: 'u-1',
      email: 'rohit@khelgrid.com',
      fullName: 'Rohit',
      name: 'Rohit',
      role: 'athlete',
      isVerified: true,
      createdAt: new Date().toISOString(),
    }
    setStoredAuthUser(sampleUser)

    expect(callback).toHaveBeenCalledWith(sampleUser)

    // Unsubscribe
    unsubscribe()
    setStoredAuthUser(null)
    // Callback should not be called again after unsubscribe
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('10. mapToUserProfile handles edge case rows gracefully', () => {
    const minimalRow = { id: 'u-99' }
    const profile = mapToUserProfile(minimalRow, 'fallback@khelgrid.com', 'scout')

    expect(profile.id).toBe('u-99')
    expect(profile.email).toBe('fallback@khelgrid.com')
    expect(profile.fullName).toBe('fallback')
    expect(profile.role).toBe('scout')
    expect(profile.isVerified).toBe(false)
  })

  it('11. parseAuthUrlCallback extracts otp_expired and access_denied hash parameters', () => {
    const rawHash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb='
    const info = parseAuthUrlCallback(rawHash)

    expect(info.type).toBe('error')
    expect(info.errorCode).toBe('otp_expired')
    expect(info.errorDescription).toBe('Email link is invalid or has expired')
  })

  it('12. parseAuthUrlCallback extracts recovery and signup tokens', () => {
    const recoveryHash = '#access_token=test-token-123&type=recovery'
    const info = parseAuthUrlCallback(recoveryHash)

    expect(info.type).toBe('recovery')
    expect(info.accessToken).toBe('test-token-123')
  })

  it('13. resendVerificationEmail validates email input properly', async () => {
    const invalid = await resendVerificationEmail('not-an-email')
    expect(invalid.success).toBe(false)
    expect(invalid.message).toContain('valid email')

    const valid = await resendVerificationEmail('athlete@khelgrid.com')
    expect(valid.success).toBe(true)
  })

  it('14. clearAuthUrlHash operates without crashing', () => {
    expect(() => clearAuthUrlHash()).not.toThrow()
  })
})
