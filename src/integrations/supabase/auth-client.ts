import { getSupabaseClient } from './realtime-client'
import type { KhelGridUser } from './public-client'
import { recordUserConsent } from '../../shared/privacy/privacyService'
import { formatCaptchaAuthError, isCaptchaErrorMessage } from '../../shared/auth/captchaConfig'
export type { KhelGridUser }
export { getStoredUser } from './public-client'

export type UserRole =
  | 'athlete'
  | 'parent'
  | 'creator'
  | 'coach'
  | 'scout'
  | 'academy'
  | 'host'
  | 'venue_owner'
  | 'tournament'
  | 'organization'
  | 'submitter'
  | 'moderator'
  | 'admin'

export interface AuthUserProfile {
  id: string
  email: string
  fullName: string
  name: string // Alias for compatibility with KhelGridUser
  role: UserRole
  phone?: string
  city?: string
  avatarUrl?: string
  preferredSports?: string[]
  bio?: string
  isVerified: boolean
  createdAt: string
  updatedAt?: string
}

export type AuthAgeBand = 'u14' | 'u16' | 'u18' | 'adult'

export interface SignUpInput {
  email: string
  password?: string
  fullName: string
  role?: UserRole
  city?: string
  phone?: string
  preferredSports?: string[]
  useMagicLink?: boolean
  ageBand?: AuthAgeBand
  guardianEmail?: string
  redirectTo?: string
  captchaToken?: string
}

export interface SignInInput {
  email: string
  password?: string
  useMagicLink?: boolean
  redirectTo?: string
  captchaToken?: string
}

export interface AuthResult {
  success: boolean
  message?: string
  user?: AuthUserProfile
  requiresEmailVerification?: boolean
}

export const KHELGRID_AUTH_STORAGE_KEY = 'khelgrid_auth_user'
export const KHELGRID_AUTH_SESSION_KEY = 'khelgrid_auth_session'

let inMemoryUser: AuthUserProfile | null = null

const PRIVILEGED_ROLES: ReadonlySet<string> = new Set(['admin', 'moderator'])

/**
 * Strips privileged roles when hydrating from untrusted client sources
 * (localStorage or user-modifiable user_metadata).
 */
export function sanitizeUntrustedRole(rawRole: unknown, fallback: UserRole = 'athlete'): UserRole {
  const candidate = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : ''
  if (!candidate || PRIVILEGED_ROLES.has(candidate)) {
    return fallback
  }
  return candidate as UserRole
}

/**
 * Returns the currently stored user from localStorage or memory.
 * Never trusts privileged roles ('admin', 'moderator') read from localStorage.
 */
export function getStoredAuthUser(): AuthUserProfile | null {
  if (inMemoryUser) return inMemoryUser
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KHELGRID_AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUserProfile
    if (parsed && parsed.id && (parsed.fullName || parsed.name)) {
      if (!parsed.name && parsed.fullName) parsed.name = parsed.fullName
      if (!parsed.fullName && parsed.name) parsed.fullName = parsed.name
      parsed.role = sanitizeUntrustedRole(parsed.role, 'athlete')
      inMemoryUser = parsed
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * Persists user profile to localStorage and broadcasts the change across tabs/components.
 * Privileged roles are kept strictly in memory (never written as authority to localStorage).
 */
export function setStoredAuthUser(user: AuthUserProfile | null): void {
  inMemoryUser = user
  if (typeof window === 'undefined') return
  try {
    if (user) {
      if (!user.name && user.fullName) user.name = user.fullName
      if (!user.fullName && user.name) user.fullName = user.name
      const safeForStorage: AuthUserProfile = {
        ...user,
        role: sanitizeUntrustedRole(user.role, 'athlete'),
      }
      window.localStorage.setItem(KHELGRID_AUTH_STORAGE_KEY, JSON.stringify(safeForStorage))
    } else {
      window.localStorage.removeItem(KHELGRID_AUTH_STORAGE_KEY)
      window.localStorage.removeItem(KHELGRID_AUTH_SESSION_KEY)
    }
    window.dispatchEvent(new CustomEvent('khelgrid:auth-changed', { detail: { user } }))
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

/**
 * Validates a potential redirect URL against open-redirect attacks.
 * Strictly permits only relative paths beginning with a single '/' and rejects protocols/schemes.
 */
export function getSafeRedirectUrl(targetUrl?: string | null, fallback = '/'): string {
  if (!targetUrl || typeof targetUrl !== 'string') return fallback
  const trimmed = targetUrl.trim()
  // Reject protocol-relative '//', backslashes '\\', and any scheme containing ':'
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes(':') && !trimmed.includes('\\')) {
    return trimmed
  }
  return fallback
}

function resolveEmailRedirectUrl(redirectTo?: string): string | undefined {
  if (typeof window === 'undefined') return undefined
  const origin = window.location?.origin
  if (!origin) return undefined
  if (!redirectTo) return origin
  const safePath = getSafeRedirectUrl(redirectTo, '/')
  return safePath === '/' ? origin : `${origin}${safePath}`
}

/**
 * Checks whether an account has a confirmed email address.
 * Distinguishes authenticated sessions from email verification state.
 */
export function isEmailVerified(user: AuthUserProfile | null): boolean {
  if (!user) return false
  return Boolean(user.isVerified)
}

/**
 * Asserts that the authenticated user possesses a verified email address.
 * Throws an explicit error if unverified, protecting sensitive mutations.
 */
export function requireVerifiedEmail(user: AuthUserProfile | null): boolean {
  if (!user) {
    throw new Error('Authentication required: You must be logged in to perform this operation.')
  }
  if (!isEmailVerified(user)) {
    throw new Error('Email verification required: Please verify your email address to continue.')
  }
  return true
}

/**
 * Maps raw database profile row or Supabase user metadata to typed AuthUserProfile.
 * Derives isVerified strictly from confirmed email timestamps.
 */
export function mapToUserProfile(
  raw: Record<string, unknown>,
  fallbackEmail = '',
  fallbackRole: UserRole = 'athlete',
): AuthUserProfile {
  const name =
    String(raw.full_name || raw.display_name || raw.name || '').trim() ||
    (fallbackEmail ? fallbackEmail.split('@')[0] : 'Sports Enthusiast')

  const role = (raw.role as UserRole) || fallbackRole

  // Verified flag is derived strictly from confirmed email timestamps or verified profile flags
  const isVerified = Boolean(
    raw.email_confirmed_at ||
    raw.email_confirmed ||
    raw.is_verified ||
    raw.isVerified ||
    false,
  )

  return {
    id: String(raw.id || raw.sub || `user-${Date.now().toString(36)}`),
    email: String(raw.email || fallbackEmail).toLowerCase().trim(),
    fullName: name,
    name,
    role,
    phone: raw.phone ? String(raw.phone) : undefined,
    city: raw.city ? String(raw.city) : undefined,
    avatarUrl: raw.avatar_url ? String(raw.avatar_url) : undefined,
    preferredSports: Array.isArray(raw.preferred_sports)
      ? (raw.preferred_sports as string[])
      : [],
    bio: raw.bio ? String(raw.bio) : undefined,
    isVerified,
    createdAt: String(raw.created_at || raw.createdAt || new Date().toISOString()),
    updatedAt: raw.updated_at ? String(raw.updated_at) : undefined,
  }
}

/**
 * Synchronizes user profile from the database 'profiles' table.
 */
export async function syncProfileFromDatabase(userId: string): Promise<AuthUserProfile | null> {
  const client = getSupabaseClient()
  if (!client) return null

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error || !data) return null

    const profile = mapToUserProfile(data as Record<string, unknown>)
    setStoredAuthUser(profile)
    return profile
  } catch {
    return null
  }
}

/**
 * Sign up a new user using email and password or magic link with profile metadata.
 * Enforces input validation, prevents privilege self-elevation, and eliminates demo fallbacks.
 */
export async function signUpWithEmail(input: SignUpInput): Promise<AuthResult> {
  const cleanEmail = input.email ? input.email.trim().toLowerCase() : ''
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, message: 'Please provide a valid email address.' }
  }

  const cleanName = input.fullName ? input.fullName.trim() : ''
  if (cleanName.length < 2) {
    return { success: false, message: 'Please provide your full name (at least 2 characters).' }
  }

  if (!input.useMagicLink && input.password !== undefined && input.password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' }
  }

  // Prevent self-elevation to privileged administrator or moderator roles
  let role = input.role || 'athlete'
  if (role === 'admin' || role === 'moderator') {
    role = 'athlete'
  }

  const client = getSupabaseClient()

  // Fail closed if Supabase client is not configured: No fake dev accounts created!
  if (!client) {
    return {
      success: false,
      message: 'Authentication service is not configured. Please verify your Supabase credentials.',
    }
  }

  try {
    const cleanGuardianEmail = input.guardianEmail ? input.guardianEmail.trim().toLowerCase() : null
    const isMinorAgeBand = input.ageBand === 'u14' || input.ageBand === 'u16' || input.ageBand === 'u18'
    const redirectTarget = resolveEmailRedirectUrl(input.redirectTo)

    if (input.useMagicLink || !input.password) {
      const { error } = await client.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName,
            role,
            city: input.city || null,
            phone: input.phone || null,
            age_band: input.ageBand || null,
            guardian_email: isMinorAgeBand ? cleanGuardianEmail : null,
          },
          emailRedirectTo: redirectTarget,
          ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
        },
      })
      if (error) {
        if (isCaptchaErrorMessage(error.message)) {
          return { success: false, message: formatCaptchaAuthError(error.message) }
        }
        if (error.message?.toLowerCase().includes('rate limit') || error.status === 429) {
          return {
            success: false,
            message:
              'Email sending rate limit reached (~2/hr on Supabase built-in mail). Configure Custom SMTP in Supabase Authentication Settings or sign in with password.',
          }
        }
        return { success: false, message: error.message }
      }
      return { success: true, requiresEmailVerification: true }
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: input.password,
      options: {
        emailRedirectTo: redirectTarget,
        ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
        data: {
          full_name: cleanName,
          name: cleanName,
          role,
          city: input.city || null,
          phone: input.phone || null,
          preferred_sports: input.preferredSports || [],
          age_band: input.ageBand || null,
          guardian_email: isMinorAgeBand ? cleanGuardianEmail : null,
        },
      },
    })

    if (error) {
      if (isCaptchaErrorMessage(error.message)) {
        return { success: false, message: formatCaptchaAuthError(error.message) }
      }
      if (error.message?.toLowerCase().includes('rate limit')) {
        return {
          success: false,
          message:
            'Supabase email confirmation rate limit reached. Please wait a few minutes or sign in with your confirmed credentials.',
        }
      }
      return { success: false, message: error.message }
    }

    if (!data.user) {
      return { success: false, message: 'Sign-up could not be completed. Please try again.' }
    }

    // Newly registered users are unverified until email confirmation
    const requiresEmailVerification = Boolean(!data.user.email_confirmed_at)

    const profile = mapToUserProfile(
      {
        ...(data.user.user_metadata || {}),
        email_confirmed_at: data.user.email_confirmed_at,
      } as Record<string, unknown>,
      cleanEmail,
      role,
    )
    profile.id = data.user.id

    if (data.session) {
      setStoredAuthUser(profile)
      try {
        await client
          .from('profiles')
          .upsert({
            id: profile.id,
            display_name: profile.fullName,
            email: profile.email,
            role: profile.role,
            city: profile.city || null,
            phone: profile.phone || null,
            updated_at: new Date().toISOString(),
          })
      } catch {
        // Continue even if profile table is unprovisioned
      }
      if (isMinorAgeBand) {
        recordUserConsent(profile.id, 'minor_guardian_consent', 'granted').catch(() => {
          // Best-effort consent audit logging
        })
      }
    }

    return {
      success: true,
      user: profile,
      requiresEmailVerification: requiresEmailVerification || !data.session,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sign-up failed.'
    return { success: false, message: msg }
  }
}

/**
 * Sign in existing user using email & password or magic link OTP.
 * Prevents account enumeration and eliminates demo fallbacks.
 */
export async function signInWithEmail(input: SignInInput): Promise<AuthResult> {
  const cleanEmail = input.email ? input.email.trim().toLowerCase() : ''
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const client = getSupabaseClient()

  // Fail closed if Supabase client is not configured: No fake dev accounts created!
  if (!client) {
    return {
      success: false,
      message: 'Authentication service is not configured. Please verify your Supabase credentials.',
    }
  }

  try {
    if (input.useMagicLink || !input.password) {
      const { error } = await client.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: resolveEmailRedirectUrl(input.redirectTo),
          ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
        },
      })
      if (error) {
        if (isCaptchaErrorMessage(error.message)) {
          return { success: false, message: formatCaptchaAuthError(error.message) }
        }
        if (error.message?.toLowerCase().includes('rate limit') || error.status === 429) {
          return {
            success: false,
            message:
              'Email sending rate limit reached (~2/hr on Supabase built-in mail). Configure Custom SMTP in Supabase Authentication Settings or sign in with password.',
          }
        }
        return { success: false, message: error.message }
      }
      return { success: true, requiresEmailVerification: true }
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: input.password,
      ...(input.captchaToken ? { options: { captchaToken: input.captchaToken } } : {}),
    })

    if (error) {
      if (isCaptchaErrorMessage(error.message)) {
        return { success: false, message: formatCaptchaAuthError(error.message) }
      }
      if (error.message?.toLowerCase().includes('rate limit')) {
        return {
          success: false,
          message:
            'Supabase email confirmation rate limit reached. Please wait a few minutes or sign in with your confirmed credentials.',
        }
      }
      return { success: false, message: 'Invalid email or password.' }
    }

    if (!data.user) {
      return { success: false, message: 'Invalid credentials. Please verify your email and password.' }
    }

    // Try fetching database profile first, otherwise fallback to metadata
    const dbProfile = await syncProfileFromDatabase(data.user.id)
    if (dbProfile) {
      dbProfile.isVerified = Boolean(data.user.email_confirmed_at || dbProfile.isVerified)
      setStoredAuthUser(dbProfile)
      return { success: true, user: dbProfile }
    }

    const metaProfile = mapToUserProfile(
      {
        ...(data.user.user_metadata || {}),
        role: sanitizeUntrustedRole(data.user.user_metadata?.role, 'athlete'),
        email_confirmed_at: data.user.email_confirmed_at,
      } as Record<string, unknown>,
      cleanEmail,
      'athlete',
    )
    metaProfile.id = data.user.id
    setStoredAuthUser(metaProfile)
    return { success: true, user: metaProfile }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sign-in failed.'
    return { success: false, message: msg }
  }
}

/**
 * Sends a password recovery email with open-redirect protection.
 * Returns a generic confirmation message to prevent user enumeration attacks.
 */
export async function sendPasswordReset(
  email: string,
  redirectToOverride?: string,
  captchaToken?: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email ? email.trim().toLowerCase() : ''
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const client = getSupabaseClient()
  if (!client) {
    return {
      success: false,
      message: 'Authentication service is not configured. Please verify your Supabase credentials.',
    }
  }

  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://khelgrid.com'
    const defaultRedirectPath = getSafeRedirectUrl('/login?type=recovery')
    let redirectUrl = `${currentOrigin}${defaultRedirectPath}`

    if (redirectToOverride) {
      const trimmedOverride = redirectToOverride.trim()
      if (trimmedOverride.startsWith('/')) {
        redirectUrl = `${currentOrigin}${getSafeRedirectUrl(trimmedOverride)}`
      } else {
        try {
          const parsedOverride = new URL(trimmedOverride)
          const parsedCurrent = new URL(currentOrigin)
          if (
            parsedOverride.origin.toLowerCase() === parsedCurrent.origin.toLowerCase() &&
            (parsedOverride.protocol === 'https:' || parsedOverride.protocol === 'http:')
          ) {
            redirectUrl = `${parsedOverride.origin}${parsedOverride.pathname}${parsedOverride.search}`
          }
        } catch {
          // Invalid override URL falls back to safe current-origin redirect
        }
      }
    }

    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
      ...(captchaToken ? { captchaToken } : {}),
    })

    if (error) {
      if (isCaptchaErrorMessage(error.message)) {
        return {
          success: false,
          message: formatCaptchaAuthError(error.message),
        }
      }
      if (error.message?.toLowerCase().includes('rate limit')) {
        return {
          success: false,
          message:
            'Supabase email confirmation rate limit reached. Please wait a few minutes before requesting another reset email.',
        }
      }
    }

    // Generic response regardless of whether email exists (prevents user enumeration)
    return {
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been sent.',
    }
  } catch {
    return {
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been sent.',
    }
  }
}

/**
 * Resends an email verification/confirmation link to the given email address.
 */
export async function resendVerificationEmail(
  email: string,
  captchaToken?: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email ? email.trim().toLowerCase() : ''
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, message: 'Please provide a valid email address.' }
  }

  const client = getSupabaseClient()
  if (!client) {
    return {
      success: false,
      message: 'Authentication service is not configured. Please verify your Supabase credentials.',
    }
  }

  try {
    const { error } = await client.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        ...(captchaToken ? { captchaToken } : {}),
      },
    })

    if (error) {
      if (isCaptchaErrorMessage(error.message)) {
        return {
          success: false,
          message: formatCaptchaAuthError(error.message),
        }
      }
      if (error.message?.toLowerCase().includes('rate limit') || error.status === 429) {
        return {
          success: false,
          message:
            'Supabase email confirmation rate limit reached. Please wait a few minutes before requesting another verification email.',
        }
      }
      return { success: false, message: error.message }
    }

    return {
      success: true,
      message: `A fresh verification link has been sent to ${cleanEmail}. Please check your inbox and spam folder.`,
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Could not resend verification email.',
    }
  }
}

export interface AuthUrlCallbackInfo {
  type: 'error' | 'recovery' | 'signup_confirmed' | null
  errorCode?: string
  errorDescription?: string
  accessToken?: string
}

/**
 * Parses authentication errors and callback tokens from URL hash or query parameters.
 */
export function parseAuthUrlCallback(
  rawUrl?: string,
): AuthUrlCallbackInfo {
  const input = rawUrl !== undefined
    ? rawUrl
    : typeof window !== 'undefined'
      ? `${window.location.hash || ''}&${window.location.search || ''}`
      : ''

  if (!input || input === '&') return { type: null }

  const cleaned = input.replace(/^[#?]/, '').replace(/[#?]/g, '&')
  const params = new URLSearchParams(cleaned)

  const errorCode = params.get('error_code') || params.get('error')
  const errorDescription = params.get('error_description')

  if (errorCode || errorDescription) {
    return {
      type: 'error',
      errorCode: errorCode || undefined,
      errorDescription: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : undefined,
    }
  }

  const type = params.get('type')
  const accessToken = params.get('access_token')

  if (type === 'recovery') {
    return { type: 'recovery', accessToken: accessToken || undefined }
  }

  if (type === 'signup' || accessToken) {
    return { type: 'signup_confirmed', accessToken: accessToken || undefined }
  }

  return { type: null }
}

/**
 * Safely removes authentication hash fragments and error query params from the browser address bar.
 */
export function clearAuthUrlHash(): void {
  if (typeof window === 'undefined') return
  const cleanUrl = window.location?.pathname || '/'
  window.history?.replaceState?.(null, '', cleanUrl)
}

/**
 * Updates the password for the currently signed-in user.
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' }
  }

  const client = getSupabaseClient()
  if (!client) {
    return {
      success: false,
      message: 'Authentication service is not configured. Please verify your Supabase credentials.',
    }
  }

  try {
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) return { success: false, message: error.message }
    return { success: true, message: 'Password updated successfully.' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not update password.'
    return { success: false, message: msg }
  }
}

/**
 * Signs the user out of Supabase and clears stored sessions and caches.
 */
export async function signOut(): Promise<void> {
  const client = getSupabaseClient()
  if (client) {
    try {
      await client.auth.signOut()
    } catch {
      // Ignore network errors during sign out
    }
  }
  setStoredAuthUser(null)
}

/**
 * Signs out across all active devices and sessions using global scope.
 */
export async function signOutAllDevices(): Promise<void> {
  const client = getSupabaseClient()
  if (client) {
    try {
      await client.auth.signOut({ scope: 'global' })
    } catch {
      // Ignore network errors during sign out
    }
  }
  setStoredAuthUser(null)
}

/**
 * Verifies a 6-digit email OTP code directly inside the app (mitigating email link-scanner expiry).
 */
export async function verifyEmailOtpCode(params: {
  email: string
  token: string
  type?: 'signup' | 'email' | 'recovery'
}): Promise<AuthResult> {
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : ''
  const cleanToken = params.token ? params.token.trim().replace(/\s+/g, '') : ''
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, message: 'Please provide a valid email address.' }
  }
  if (!/^\d{6}$/.test(cleanToken)) {
    return { success: false, message: 'Please enter the 6-digit verification code sent to your inbox.' }
  }

  const client = getSupabaseClient()
  if (!client) {
    return {
      success: false,
      message: 'Authentication service is not configured. Please verify your Supabase credentials.',
    }
  }

  try {
    const requestedType = params.type || 'email'
    let { data, error } = await client.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: requestedType,
    })

    // Confirm-signup OTPs use type 'signup' whereas magic-link OTPs use type 'email'.
    if ((error || !data.user) && (requestedType === 'email' || requestedType === 'signup')) {
      const fallbackType = requestedType === 'email' ? 'signup' : 'email'
      const fallbackRes = await client.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: fallbackType,
      })
      if (!fallbackRes.error && fallbackRes.data.user) {
        data = fallbackRes.data
        error = null
      }
    }

    if (error || !data.user) {
      return {
        success: false,
        message: error?.message || 'Verification code is invalid or has expired.',
      }
    }

    const dbProfile = await syncProfileFromDatabase(data.user.id)
    if (dbProfile) {
      dbProfile.isVerified = true
      setStoredAuthUser(dbProfile)
      return { success: true, user: dbProfile }
    }

    const metaProfile = mapToUserProfile(
      {
        ...(data.user.user_metadata || {}),
        role: sanitizeUntrustedRole(data.user.user_metadata?.role, 'athlete'),
        email_confirmed_at: data.user.email_confirmed_at || new Date().toISOString(),
      } as Record<string, unknown>,
      cleanEmail,
      'athlete',
    )
    metaProfile.id = data.user.id
    metaProfile.isVerified = true
    setStoredAuthUser(metaProfile)
    return { success: true, user: metaProfile }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Could not verify code.',
    }
  }
}

/**
 * Initiates PKCE OAuth flow via Google while preserving a safe return URL.
 */
export async function signInWithGoogleOAuth(redirectTo?: string): Promise<{
  success: boolean
  message?: string
  url?: string
}> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      success: false,
      message: 'Google Sign-In requires Supabase Auth configuration.',
    }
  }

  try {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: resolveEmailRedirectUrl(redirectTo),
      },
    })
    if (error) {
      return { success: false, message: error.message }
    }
    return { success: true, url: data?.url }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Google Sign-In could not be started.',
    }
  }
}

/**
 * Updates user profile attributes both locally and in Supabase.
 * Shields role, id, and isVerified from client-side privilege self-escalation.
 */
export async function updateUserProfile(updates: Partial<AuthUserProfile>): Promise<AuthUserProfile | null> {
  const current = getStoredAuthUser()
  if (!current) return null

  // Whitelist only safe user-editable attributes (block self-elevation of role/isVerified/id/email)
  const safeUpdates: Partial<AuthUserProfile> = {}
  if (updates.fullName) {
    safeUpdates.fullName = updates.fullName.trim()
    safeUpdates.name = safeUpdates.fullName
  }
  if (updates.city !== undefined) safeUpdates.city = updates.city
  if (updates.phone !== undefined) safeUpdates.phone = updates.phone
  if (updates.avatarUrl !== undefined) safeUpdates.avatarUrl = updates.avatarUrl
  if (updates.preferredSports !== undefined) safeUpdates.preferredSports = updates.preferredSports
  if (updates.bio !== undefined) safeUpdates.bio = updates.bio

  const updated: AuthUserProfile = {
    ...current,
    ...safeUpdates,
    updatedAt: new Date().toISOString(),
  }

  setStoredAuthUser(updated)

  const client = getSupabaseClient()
  if (client) {
    try {
      await client
        .from('profiles')
        .upsert({
          id: updated.id,
          display_name: updated.fullName,
          city: updated.city || null,
          phone: updated.phone || null,
          avatar_url: updated.avatarUrl || null,
          preferred_sports: updated.preferredSports || [],
          bio: updated.bio || null,
          updated_at: updated.updatedAt,
        })
    } catch {
      // Local profile is already saved
    }
  }

  return updated
}

/**
 * Checks if the user holds one of the specified allowed roles.
 * Admins are automatically authorized for all roles.
 */
export function hasRole(user: AuthUserProfile | KhelGridUser | null, allowed: UserRole[]): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return allowed.includes(user.role as UserRole)
}

/**
 * Default granular permissions mapped to platform roles.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  athlete: [
    'profile:view',
    'profile:edit',
    'trial:submit',
    'venue:book',
    'coach:inquire',
    'review:create',
    'score:view',
  ],
  parent: [
    'profile:view',
    'profile:edit',
    'trial:submit',
    'academy:inquire',
    'venue:book',
  ],
  creator: [
    'profile:view',
    'profile:edit',
    'campaign:apply',
    'deliverable:submit',
    'reward:view',
  ],
  tournament: [
    'profile:view',
    'profile:edit',
    'tournament:manage',
    'match:create',
    'match:score',
    'trial:publish',
  ],
  organization: [
    'profile:view',
    'profile:edit',
    'org:manage',
    'org:team',
    'venue:manage',
    'academy:manage_enquiries',
    'tournament:manage',
  ],
  host: [
    'profile:view',
    'profile:edit',
    'venue:manage',
    'venue:view_payouts',
    'payout:request',
    'match:create',
    'match:score',
  ],
  venue_owner: [
    'profile:view',
    'venue:manage',
    'venue:view_payouts',
    'payout:request',
  ],
  coach: [
    'profile:view',
    'profile:edit',
    'coach:manage_inquiries',
    'coach:view_dossier',
    'match:score',
  ],
  scout: [
    'profile:view',
    'scout:view_athletes',
    'scout:export_dossier',
    'scout:view_benchmarks',
  ],
  academy: [
    'profile:view',
    'profile:edit',
    'academy:manage_enquiries',
    'academy:view_candidates',
    'trial:publish',
  ],
  submitter: [
    'listing:submit',
    'listing:view_own',
    'listing:edit_own',
  ],
  moderator: [
    'listing:moderate',
    'review:moderate',
    'report:review',
    'claim:review',
  ],
  admin: [
    'admin:assign_role',
    'admin:revoke_role',
    'listing:moderate',
    'audit:view',
    'system:config',
    'profile:view',
    'profile:edit',
    'trial:submit',
    'venue:book',
    'venue:manage',
    'coach:inquire',
    'review:create',
    'score:view',
    'match:score',
  ],
}

/**
 * Checks whether the user holds a granular permission.
 * Admins implicitly possess all permissions.
 */
export function hasPermission(user: AuthUserProfile | KhelGridUser | null, permission: string): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  const rolePerms = DEFAULT_ROLE_PERMISSIONS[user.role as UserRole] || []
  return rolePerms.includes(permission)
}

/**
 * Assigns a role to a user via the atomic admin RPC.
 * Only callable by authorized system administrators.
 */
export async function adminAssignRole(
  targetUserId: string,
  role: UserRole,
  notes?: string,
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return { success: false, message: 'Authentication service is not configured.' }
  }

  try {
    const { error } = await client.rpc('admin_assign_role', {
      p_target_user_id: targetUserId,
      p_role: role,
      p_notes: notes || null,
    })

    if (error) {
      return { success: false, message: error.message }
    }
    return { success: true, message: `Successfully assigned role ${role}.` }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to assign role.',
    }
  }
}

/**
 * Revokes a role from a user via the atomic admin RPC.
 * Only callable by authorized system administrators.
 */
export async function adminRevokeRole(
  targetUserId: string,
  role: UserRole,
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient()
  if (!client) {
    return { success: false, message: 'Authentication service is not configured.' }
  }

  try {
    const { error } = await client.rpc('admin_revoke_role', {
      p_target_user_id: targetUserId,
      p_role: role,
    })

    if (error) {
      return { success: false, message: error.message }
    }
    return { success: true, message: `Successfully revoked role ${role}.` }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to revoke role.',
    }
  }
}

/**
 * Subscribes to authentication state changes across the application.
 * Returns an unsubscribe cleanup function.
 */
export function onAuthChange(callback: (user: AuthUserProfile | null) => void): () => void {
  // 1. Initial callback with current user
  callback(getStoredAuthUser())

  // 2. CustomEvent listener
  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent<{ user: AuthUserProfile | null }>).detail
    callback(detail?.user ?? null)
  }

  // 3. Cross-tab StorageEvent listener
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === KHELGRID_AUTH_STORAGE_KEY || e.key === null) {
      callback(getStoredAuthUser())
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('khelgrid:auth-changed', handleCustomEvent)
    window.addEventListener('storage', handleStorageEvent)
  }

  // 4. Supabase Auth listener
  const client = getSupabaseClient()
  let supabaseUnsub: (() => void) | undefined

  if (client) {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setStoredAuthUser(null)
      } else if (session?.user) {
        const user = mapToUserProfile(
          {
            ...(session.user.user_metadata || {}),
            // Never elevate platform privileges from user-modifiable user_metadata
            role: sanitizeUntrustedRole(session.user.user_metadata?.role, 'athlete'),
            email_confirmed_at: session.user.email_confirmed_at,
          } as Record<string, unknown>,
          session.user.email || '',
        )
        user.id = session.user.id
        setStoredAuthUser(user)
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          syncProfileFromDatabase(session.user.id).then(dbProfile => {
            if (dbProfile) setStoredAuthUser(dbProfile)
          }).catch(() => {
            // Keep metadata profile if profiles table query fails
          })
        }
      }
    })
    supabaseUnsub = data.subscription.unsubscribe
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('khelgrid:auth-changed', handleCustomEvent)
      window.removeEventListener('storage', handleStorageEvent)
    }
    supabaseUnsub?.()
  }
}

/**
 * Isolated test fixture creator for unit testing.
 * Provides safe mock identities without introducing backdoors in application auth.
 */
export function createTestAuthUserFixture(overrides: Partial<AuthUserProfile> = {}): AuthUserProfile {
  return {
    id: overrides.id || `fixture-${Math.random().toString(36).substring(2, 9)}`,
    email: overrides.email || 'fixture.athlete@khelgrid.com',
    fullName: overrides.fullName || 'Test Athlete',
    name: overrides.fullName || 'Test Athlete',
    role: overrides.role || 'athlete',
    city: overrides.city || 'Mumbai',
    phone: overrides.phone || '+91 98000 00000',
    preferredSports: overrides.preferredSports || ['Cricket'],
    isVerified: overrides.isVerified ?? false,
    createdAt: overrides.createdAt || new Date().toISOString(),
  }
}
