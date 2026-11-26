import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  clearAuthUrlHash,
  getStoredAuthUser,
  isRestrictedAdminPath,
  onAuthChange,
  parseAuthUrlCallback,
  signOut as performSignOut,
  type AuthUserProfile,
} from '../../integrations/supabase/auth-client'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import {
  normalizeAuthOpenInput,
  type AuthOpenInput,
  type AuthOpenOptions,
} from '../components/auth/authModalTypes'
import { AuthContext, type AuthContextValue } from './useAuth'

interface AuthProviderProps {
  children: ReactNode
}

function isPartnerVerifyRoute(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase() || '/'
  return normalized === '/partner/verify'
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
    const pathname = window.location?.pathname || '/'
    const callbackInfo = parseAuthUrlCallback()
    if (callbackInfo.type === null) return

    // Never leave verification links on /admin* or consume URL params before /partner/verify mounts.
    if (isRestrictedAdminPath(pathname)) {
      if (callbackInfo.type === 'signup_confirmed' || callbackInfo.type === 'error') {
        const search = window.location.search || ''
        const hash = window.location.hash || ''
        window.location.replace(`/partner/verify${search}${hash}`)
      }
      return
    }

    if (isPartnerVerifyRoute(pathname)) {
      return
    }

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
      return
    }

    if (callbackInfo.type === 'recovery') {
      setIntent({ tab: 'set_new_password' })
      setModalOpen(true)
      clearAuthUrlHash()
      return
    }

    if (callbackInfo.type === 'signup_confirmed') {
      const client = getSupabaseClient()
      if (!client) {
        clearAuthUrlHash()
        return
      }
      let active = true
      const routeConfirmedPartnerOrClear = async () => {
        try {
          const { data } = await client.auth.getSession()
          if (!active) return
          const sessionUser = data.session?.user
          const meta = sessionUser?.user_metadata as Record<string, unknown> | undefined
          if (sessionUser?.email_confirmed_at && meta?.khelgrid_partner_onboarding) {
            window.location.replace('/partner/verify')
            return
          }
          if (sessionUser || (!callbackInfo.code && !callbackInfo.tokenHash)) {
            clearAuthUrlHash()
          }
        } catch {
          if (active) clearAuthUrlHash()
        }
      }
      void routeConfirmedPartnerOrClear()
      return () => {
        active = false
      }
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
