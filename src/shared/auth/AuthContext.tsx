import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearAuthUrlHash,
  getStoredAuthUser,
  onAuthChange,
  parseAuthUrlCallback,
  signOut as performSignOut,
  type AuthUserProfile,
} from '../../integrations/supabase/auth-client'
import {
  normalizeAuthOpenInput,
  type AuthOpenInput,
  type AuthOpenOptions,
} from '../components/auth/authModalTypes'
import { AuthContext, type AuthContextValue } from './useAuth'

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Centralized authentication provider capturing intent context (why & where auth was requested),
 * managing modal visibility/deep-link callbacks, and synchronizing Supabase + cross-tab state.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUserProfile | null>(() => getStoredAuthUser())
  const [modalOpen, setModalOpen] = useState(false)
  const [intent, setIntent] = useState<AuthOpenOptions>({ tab: 'login' })

  useEffect(() => {
    return onAuthChange(nextUser => {
      setUser(nextUser)
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const callbackInfo = parseAuthUrlCallback()
    if (callbackInfo.type === 'error') {
      const isOtpExpired =
        callbackInfo.errorCode === 'otp_expired' ||
        callbackInfo.errorDescription?.toLowerCase().includes('expired')
      setIntent({
        tab: isOtpExpired ? 'expired_link' : 'login',
        error: isOtpExpired
          ? 'Email verification link is invalid or has expired. Enter your email or 6-digit verification code below.'
          : (callbackInfo.errorDescription || 'Authentication could not be completed. Please sign in with your credentials.'),
      })
      setModalOpen(true)
      clearAuthUrlHash()
    } else if (callbackInfo.type === 'recovery') {
      setIntent({ tab: 'set_new_password' })
      setModalOpen(true)
      clearAuthUrlHash()
    } else if (callbackInfo.type === 'signup_confirmed') {
      clearAuthUrlHash()
    }
  }, [])

  const openAuth = useCallback((input?: AuthOpenInput) => {
    const normalized = normalizeAuthOpenInput(input)
    setIntent(normalized)
    setModalOpen(true)
  }, [])

  const closeAuth = useCallback(() => {
    setModalOpen(false)
    setIntent(prev => ({ ...prev, error: undefined }))
  }, [])

  const clearIntent = useCallback(() => {
    setIntent({ tab: 'login' })
  }, [])

  const handleSignOut = useCallback(async () => {
    await performSignOut()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      modalOpen,
      intent,
      openAuth,
      closeAuth,
      setAuthenticatedUser: setUser,
      signOut: handleSignOut,
      clearIntent,
    }),
    [user, modalOpen, intent, openAuth, closeAuth, handleSignOut, clearIntent]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
