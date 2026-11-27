import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearAuthUrlHash,
  getStoredAuthUser,
  onAuthChange,
  parseAuthUrlCallback,
  signOut as supabaseSignOut,
  type AuthUserProfile,
} from '../../integrations/supabase/auth-client'
import {
  normalizeAuthOpenInput,
  type AuthIntentState,
  type AuthOpenInput,
} from '../components/auth/authModalTypes'

export interface AuthContextValue {
  user: AuthUserProfile | null
  modalOpen: boolean
  intent: AuthIntentState
  openAuth: (input?: AuthOpenInput) => void
  closeAuth: () => void
  setAuthenticatedUser: (user: AuthUserProfile | null) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserProfile | null>(() => getStoredAuthUser())
  const [modalOpen, setModalOpen] = useState(false)
  const [intent, setIntent] = useState<AuthIntentState>({ tab: 'login' })

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
          ? 'Email verification link is invalid or has expired. Enter your email below to receive a fresh verification link.'
          : (callbackInfo.errorDescription ||
            'Authentication could not be completed. Please sign in with your credentials.'),
      })
      setModalOpen(true)
      clearAuthUrlHash()
    } else if (callbackInfo.type === 'recovery') {
      setIntent({ tab: 'set_new_password', error: '' })
      setModalOpen(true)
      clearAuthUrlHash()
    } else if (callbackInfo.type === 'signup_confirmed') {
      clearAuthUrlHash()
    }
  }, [])

  useEffect(() => {
    return onAuthChange(nextUser => {
      setUser(nextUser)
    })
  }, [])

  const openAuth = useCallback((input?: AuthOpenInput) => {
    setIntent(normalizeAuthOpenInput(input))
    setModalOpen(true)
  }, [])

  const closeAuth = useCallback(() => {
    setModalOpen(false)
  }, [])

  const setAuthenticatedUser = useCallback((nextUser: AuthUserProfile | null) => {
    setUser(nextUser)
  }, [])

  const signOut = useCallback(async () => {
    await supabaseSignOut()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      modalOpen,
      intent,
      openAuth,
      closeAuth,
      setAuthenticatedUser,
      signOut,
    }),
    [user, modalOpen, intent, openAuth, closeAuth, setAuthenticatedUser, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
