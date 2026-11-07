import { getSupabaseClient } from './realtime-client'
import type { KhelGridUser } from './public-client'
export type { KhelGridUser }
export { getStoredUser } from './public-client'

export type UserRole = 'athlete' | 'host' | 'coach' | 'scout' | 'academy' | 'admin'

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

export interface SignUpInput {
  email: string
  password?: string
  fullName: string
  role?: UserRole
  city?: string
  phone?: string
  preferredSports?: string[]
  useMagicLink?: boolean
}

export interface SignInInput {
  email: string
  password?: string
  useMagicLink?: boolean
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

/**
 * Returns the currently stored user from localStorage or memory.
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
 */
export function setStoredAuthUser(user: AuthUserProfile | null): void {
  inMemoryUser = user
  if (typeof window === 'undefined') return
  try {
    if (user) {
      if (!user.name && user.fullName) user.name = user.fullName
      if (!user.fullName && user.name) user.fullName = user.name
      window.localStorage.setItem(KHELGRID_AUTH_STORAGE_KEY, JSON.stringify(user))
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
 * Maps raw database profile row or Supabase user metadata to typed AuthUserProfile.
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
    isVerified: Boolean(raw.is_verified ?? raw.isVerified ?? false),
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
 */
export async function signUpWithEmail(input: SignUpInput): Promise<AuthResult> {
  const cleanEmail = input.email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please provide a valid email address.' }
  }

  const cleanName = input.fullName.trim()
  if (cleanName.length < 2) {
    return { success: false, message: 'Please provide your full name (at least 2 characters).' }
  }

  if (!input.useMagicLink && input.password !== undefined && input.password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' }
  }

  const role = input.role || 'athlete'
  const client = getSupabaseClient()

  // Fallback for unconfigured/offline dev mode
  if (!client) {
    const localUser: AuthUserProfile = {
      id: `dev-${Date.now().toString(36)}`,
      email: cleanEmail,
      fullName: cleanName,
      name: cleanName,
      role,
      city: input.city || 'India',
      phone: input.phone,
      preferredSports: input.preferredSports || [],
      isVerified: true,
      createdAt: new Date().toISOString(),
    }
    setStoredAuthUser(localUser)
    return { success: true, user: localUser }
  }

  try {
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
          },
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      })
      if (error) return { success: false, message: error.message }
      return { success: true, requiresEmailVerification: true }
    }

    if (input.password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' }
    }

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: input.password,
      options: {
        data: {
          full_name: cleanName,
          name: cleanName,
          role,
          city: input.city || null,
          phone: input.phone || null,
          preferred_sports: input.preferredSports || [],
        },
      },
    })

    if (error) {
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

    const requiresEmailVerification = Boolean(
      data.user && !data.session && (!data.user.identities || data.user.identities.length === 0),
    )

    const profile = mapToUserProfile(
      (data.user.user_metadata || {}) as Record<string, unknown>,
      cleanEmail,
      role,
    )
    profile.id = data.user.id

    if (data.session) {
      setStoredAuthUser(profile)
      // Best-effort profile row upsert
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
 */
export async function signInWithEmail(input: SignInInput): Promise<AuthResult> {
  const cleanEmail = input.email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const client = getSupabaseClient()

  // Offline / Demo fallback
  if (!client) {
    const existing = getStoredAuthUser()
    if (existing && existing.email.toLowerCase() === cleanEmail) {
      setStoredAuthUser(existing)
      return { success: true, user: existing }
    }
    const demoUser: AuthUserProfile = {
      id: `dev-${cleanEmail.replace(/[^a-z0-9]/g, '')}`,
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0],
      name: cleanEmail.split('@')[0],
      role: 'athlete',
      isVerified: true,
      createdAt: new Date().toISOString(),
    }
    setStoredAuthUser(demoUser)
    return { success: true, user: demoUser }
  }

  try {
    if (input.useMagicLink || !input.password) {
      const { error } = await client.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      })
      if (error) return { success: false, message: error.message }
      return { success: true, requiresEmailVerification: true }
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: input.password,
    })

    if (error) {
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
      return { success: false, message: 'Invalid credentials. Please verify your email and password.' }
    }

    // Try fetching database profile first, otherwise fallback to metadata
    const dbProfile = await syncProfileFromDatabase(data.user.id)
    if (dbProfile) {
      setStoredAuthUser(dbProfile)
      return { success: true, user: dbProfile }
    }

    const metaProfile = mapToUserProfile(
      (data.user.user_metadata || {}) as Record<string, unknown>,
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
 * Sends a password recovery email.
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; message?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const client = getSupabaseClient()
  if (!client) {
    return {
      success: true,
      message: 'Password reset link sent (Development Mode: Check local browser session).',
    }
  }

  try {
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/login?type=recovery`
        : 'https://khelgrid.com/login?type=recovery'

    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    })

    if (error) {
      if (error.message?.toLowerCase().includes('rate limit')) {
        return {
          success: false,
          message:
            'Supabase email confirmation rate limit reached. Please wait a few minutes or sign in with your confirmed credentials.',
        }
      }
      return { success: false, message: error.message }
    }

    return {
      success: true,
      message: 'Password reset instructions have been emailed to you.',
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Password reset request failed.'
    return { success: false, message: msg }
  }
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
    return { success: true, message: 'Password updated successfully (Dev Mode).' }
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
 * Signs the user out of Supabase and clears stored sessions.
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
 * Updates user profile attributes both locally and in Supabase.
 */
export async function updateUserProfile(updates: Partial<AuthUserProfile>): Promise<AuthUserProfile | null> {
  const current = getStoredAuthUser()
  if (!current) return null

  const updated: AuthUserProfile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  if (updates.fullName) updated.name = updates.fullName
  if (updates.name) updated.fullName = updates.name

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

  if (typeof window !== 'undefined') {
    window.addEventListener('khelgrid:auth-changed', handleCustomEvent)
  }

  // 3. Supabase Auth listener
  const client = getSupabaseClient()
  let supabaseUnsub: (() => void) | undefined

  if (client) {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setStoredAuthUser(null)
      } else if (session?.user) {
        const user = mapToUserProfile(
          (session.user.user_metadata || {}) as Record<string, unknown>,
          session.user.email || '',
        )
        user.id = session.user.id
        setStoredAuthUser(user)
      }
    })
    supabaseUnsub = data.subscription.unsubscribe
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('khelgrid:auth-changed', handleCustomEvent)
    }
    supabaseUnsub?.()
  }
}
