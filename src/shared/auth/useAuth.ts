import { createContext, useContext } from 'react'
import { getStoredAuthUser, signOut, type AuthUserProfile } from '../../integrations/supabase/auth-client'
import type { AuthOpenInput, AuthOpenOptions } from '../components/auth/authModalTypes'

export interface AuthContextValue {
  user: AuthUserProfile | null
  isAuthenticated: boolean
  modalOpen: boolean
  intent: AuthOpenOptions
  openAuth: (input?: AuthOpenInput) => void
  closeAuth: () => void
  setAuthenticatedUser: (user: AuthUserProfile | null) => void
  signOut: () => Promise<void>
  clearIntent: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Reads centralized authentication state and intent-preserving auth triggers.
 * Provides an SSR/test-safe fallback when mounted outside an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx) return ctx

  const fallbackUser = getStoredAuthUser()
  return {
    user: fallbackUser,
    isAuthenticated: Boolean(fallbackUser),
    modalOpen: false,
    intent: { tab: 'login' },
    openAuth: () => {},
    closeAuth: () => {},
    setAuthenticatedUser: () => {},
    signOut,
    clearIntent: () => {},
  }
}
