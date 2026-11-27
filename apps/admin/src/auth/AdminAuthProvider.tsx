import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  clearAuthUrlHash,
  parseAuthUrlCallback,
  sendPasswordReset,
  signInWithEmail,
  signOut as performSupabaseSignOut,
  updatePassword,
} from '../../../../src/integrations/supabase/auth-client'
import { AuthCaptchaWidget } from '../../../../src/shared/components/auth/AuthCaptchaWidget'
import { getSupabaseClient } from '../../../../src/integrations/supabase/realtime-client'
import {
  getModerationAccessProfile,
  type ModerationAccessProfile,
} from '../../../../src/integrations/supabase/public-client'
import {
  ADMIN_MIN_PASSWORD_LENGTH,
  evaluateAdminAccessGate,
  isValidAdminAnonKey,
  validateAdminSupabaseOrigin,
  validateSafeAdminRedirectUrl,
  type AdminGateDecision,
  type VerifiedAdminIdentity,
} from './adminSecurityPolicy'

export interface AdminAuthContextValue {
  identity: VerifiedAdminIdentity
  databaseProjectRef: string
  revalidate: () => Promise<void>
  signOut: () => Promise<void>
  openPasswordReset: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth must be called within an authorized AdminAuthGate.')
  }
  return ctx
}

export interface AdminAuthGateProps {
  children: ReactNode
  /**
   * Optional override for controlled unit testing only (never used in production runtime).
   */
  initialAuthOverride?: {
    identity: VerifiedAdminIdentity
    databaseProjectRef?: string
  } | null
}

type GateAuthFormMode = 'login' | 'forgot_password' | 'set_new_password'

export function AdminAuthGate({ children, initialAuthOverride }: AdminAuthGateProps) {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  const originCheck = useMemo(() => validateAdminSupabaseOrigin(rawUrl), [rawUrl])
  const anonKeyValid = useMemo(() => isValidAdminAnonKey(rawAnonKey), [rawAnonKey])
  const configApproved = originCheck.approved && anonKeyValid

  const [isLoading, setIsLoading] = useState(!initialAuthOverride)
  const [hasSession, setHasSession] = useState(Boolean(initialAuthOverride))
  const [sessionExpired, setSessionExpired] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ModerationAccessProfile | null>(
    initialAuthOverride
      ? {
          user_id: initialAuthOverride.identity.userId,
          role: initialAuthOverride.identity.role,
          is_active: true,
        }
      : null,
  )
  const [sessionEmail, setSessionEmail] = useState<string>(initialAuthOverride?.identity.email ?? '')

  const [authMode, setAuthMode] = useState<GateAuthFormMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [formNotice, setFormNotice] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const hadActiveSessionRef = useRef(Boolean(initialAuthOverride))

  const clearPrivilegedState = useCallback((markExpired = false) => {
    setHasSession(false)
    setProfile(null)
    setSessionEmail('')
    setLookupError(null)
    setSessionExpired(markExpired)
    hadActiveSessionRef.current = false
  }, [])

  const revalidate = useCallback(async () => {
    if (initialAuthOverride) return
    if (!configApproved) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLookupError(null)

    try {
      const client = getSupabaseClient()
      if (!client) {
        setHasSession(false)
        setProfile(null)
        setLookupError('Supabase client is unavailable.')
        return
      }

      const { data: sessionData, error: sessionErr } = await client.auth.getSession()
      if (sessionErr) {
        clearPrivilegedState(hadActiveSessionRef.current)
        return
      }

      if (!sessionData.session) {
        clearPrivilegedState(hadActiveSessionRef.current)
        return
      }

      const { data: userData, error: userErr } = await client.auth.getUser()
      if (userErr || !userData.user) {
        clearPrivilegedState(true)
        return
      }

      setHasSession(true)
      setSessionExpired(false)
      setSessionEmail(userData.user.email || '')
      hadActiveSessionRef.current = true

      const serverProfile = await getModerationAccessProfile()
      setProfile(serverProfile)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authorization lookup failed.'
      if (message.toLowerCase().includes('sign in') || message.toLowerCase().includes('jwt') || message.toLowerCase().includes('session')) {
        clearPrivilegedState(hadActiveSessionRef.current)
      } else {
        setProfile(null)
        setLookupError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [clearPrivilegedState, configApproved, initialAuthOverride])

  useEffect(() => {
    if (initialAuthOverride || !configApproved) return
    void revalidate()
  }, [configApproved, initialAuthOverride, revalidate])

  // Handle password recovery callback links & custom reset events
  useEffect(() => {
    if (typeof window === 'undefined') return
    const callbackInfo = parseAuthUrlCallback()
    if (callbackInfo.type === 'recovery') {
      setAuthMode('set_new_password')
      setFormNotice('Set a new password of at least 12 characters for your authorized account.')
    }

    const handleOpenReset = () => {
      setAuthMode('forgot_password')
      setFormError('')
      setFormNotice('')
    }
    window.addEventListener('khelgrid-admin-open-forgot-password', handleOpenReset)
    return () => window.removeEventListener('khelgrid-admin-open-forgot-password', handleOpenReset)
  }, [])

  // Subscribe to auth state changes, focus/visibility revalidation, and session revocation
  useEffect(() => {
    if (initialAuthOverride || !configApproved) return
    const client = getSupabaseClient()
    if (!client) return

    let active = true
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('set_new_password')
        setFormNotice('Set a new password of at least 12 characters for your authorized account.')
        return
      }
      if (event === 'SIGNED_OUT' || !session) {
        clearPrivilegedState(event !== 'SIGNED_OUT' && hadActiveSessionRef.current)
        setIsLoading(false)
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => {
          if (active) void revalidate()
        }, 0)
      }
    })

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && hadActiveSessionRef.current) {
        void revalidate()
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      active = false
      subscription.unsubscribe()
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [clearPrivilegedState, configApproved, initialAuthOverride, revalidate])

  const handleSignOut = useCallback(async () => {
    setFormBusy(true)
    setFormError('')
    setFormNotice('')
    try {
      await performSupabaseSignOut()
    } finally {
      clearPrivilegedState(false)
      setAuthMode('login')
      setFormBusy(false)
      setFormNotice('You have been signed out.')
    }
  }, [clearPrivilegedState])

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormBusy(true)
    setFormError('')
    setFormNotice('')
    setSessionExpired(false)
    try {
      const result = await signInWithEmail({
        email: email.trim(),
        password,
        ...(captchaToken ? { captchaToken } : {}),
      })
      if (!result.success) {
        setCaptchaResetKey(k => k + 1)
        setFormError(result.message || 'Invalid email or password.')
        return
      }
      setPassword('')
      setCaptchaResetKey(k => k + 1)
      await revalidate()
    } catch (err) {
      setCaptchaResetKey(k => k + 1)
      setFormError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setFormBusy(false)
    }
  }

  const handleRequestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormBusy(true)
    setFormError('')
    setFormNotice('')
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://admin.khelgrid.com'
      const safeRedirect = validateSafeAdminRedirectUrl(
        typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '/',
        origin,
      )
      const res = await sendPasswordReset(email.trim(), safeRedirect, captchaToken || undefined)
      setCaptchaResetKey(k => k + 1)
      if (!res.success) {
        setFormError(res.message)
      } else {
        setFormNotice(res.message)
      }
    } catch (err) {
      setCaptchaResetKey(k => k + 1)
      setFormError(err instanceof Error ? err.message : 'Could not send reset instructions.')
    } finally {
      setFormBusy(false)
    }
  }

  const handleSaveNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < ADMIN_MIN_PASSWORD_LENGTH) {
      setFormError(`Admin passwords must be at least ${ADMIN_MIN_PASSWORD_LENGTH} characters long.`)
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }
    setFormBusy(true)
    setFormError('')
    setFormNotice('')
    try {
      const res = await updatePassword(newPassword)
      if (!res.success) {
        setFormError(res.message || 'Could not update password.')
        return
      }
      setNewPassword('')
      setConfirmPassword('')
      clearAuthUrlHash()
      setAuthMode('login')
      setFormNotice('Password updated. Sign in with your updated credentials.')
      await revalidate()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not update password.')
    } finally {
      setFormBusy(false)
    }
  }

  const gateDecision: AdminGateDecision = useMemo(
    () =>
      evaluateAdminAccessGate({
        configApproved: Boolean(initialAuthOverride) || configApproved,
        isLoading,
        hasSession,
        sessionExpired,
        lookupError,
        profile,
      }),
    [configApproved, hasSession, initialAuthOverride, isLoading, lookupError, profile, sessionExpired],
  )

  // 1. Misconfigured or unapproved database origin — fail closed before anything else
  if (gateDecision.status === 'config_invalid') {
    return (
      <main className="khelgrid-admin-app khelgrid-admin-gate-shell" role="alert">
        <section className="admin-gate-card">
          <div className="admin-gate-brand">
            <span className="admin-gate-logo">KG</span>
            <div>
              <p className="admin-gate-eyebrow">KHELGRID · PLATFORM GOVERNANCE</p>
              <h1>KhelGrid Admin is unavailable</h1>
            </div>
          </div>
          <p className="admin-gate-alert">
            This development admin application is not configured for its approved development database.
          </p>
          <p className="admin-gate-muted">
            {!originCheck.approved
              ? originCheck.reason
              : 'Required Supabase environment credentials are missing or invalid.'}
          </p>
          <p className="admin-gate-muted">
            Contact the platform owner. Do not attempt to bypass this restriction.
          </p>
        </section>
      </main>
    )
  }

  // 2. Auth resolution in progress — zero flash of protected workspace or sidebar
  if (gateDecision.status === 'checking') {
    return (
      <main className="khelgrid-admin-app khelgrid-admin-gate-shell" aria-busy="true">
        <section className="admin-gate-card">
          <div className="admin-gate-brand">
            <span className="admin-gate-logo">KG</span>
            <div>
              <p className="admin-gate-eyebrow">KHELGRID · RESTRICTED ACCESS</p>
              <h1>Verifying platform access</h1>
            </div>
          </div>
          <p className="admin-gate-muted">{gateDecision.message}</p>
        </section>
      </main>
    )
  }

  // 3. Password recovery flow
  if (authMode === 'set_new_password') {
    return (
      <main className="khelgrid-admin-app khelgrid-admin-gate-shell">
        <section className="admin-gate-card">
          <div className="admin-gate-brand">
            <span className="admin-gate-logo">KG</span>
            <div>
              <p className="admin-gate-eyebrow">KHELGRID · ACCOUNT SECURITY</p>
              <h1>Set new admin password</h1>
            </div>
          </div>
          {formError && <p role="alert" className="admin-gate-alert">{formError}</p>}
          {formNotice && <p role="status" className="admin-gate-notice">{formNotice}</p>}
          <form className="admin-gate-form" onSubmit={handleSaveNewPassword}>
            <label>
              <span>New password (minimum {ADMIN_MIN_PASSWORD_LENGTH} characters)</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={ADMIN_MIN_PASSWORD_LENGTH}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={ADMIN_MIN_PASSWORD_LENGTH}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </label>
            <div className="admin-gate-actions">
              <button type="submit" className="admin-gate-btn-primary" disabled={formBusy}>
                {formBusy ? 'Updating…' : 'Save new password'}
              </button>
              <button
                type="button"
                className="admin-gate-btn-secondary"
                onClick={() => {
                  setAuthMode('login')
                  setFormError('')
                  setFormNotice('')
                }}
              >
                Back to sign in
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  // 4. Forgot password flow
  if (authMode === 'forgot_password') {
    return (
      <main className="khelgrid-admin-app khelgrid-admin-gate-shell">
        <section className="admin-gate-card">
          <div className="admin-gate-brand">
            <span className="admin-gate-logo">KG</span>
            <div>
              <p className="admin-gate-eyebrow">KHELGRID · ACCOUNT RECOVERY</p>
              <h1>Reset operator password</h1>
            </div>
          </div>
          {formError && <p role="alert" className="admin-gate-alert">{formError}</p>}
          {formNotice && <p role="status" className="admin-gate-notice">{formNotice}</p>}
          <p className="admin-gate-muted">
            Enter your authorized operator email address to receive a password recovery link.
          </p>
          <form className="admin-gate-form" onSubmit={handleRequestReset}>
            <label>
              <span>Operator email</span>
              <input
                type="email"
                autoComplete="username"
                placeholder="operator@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>
            <AuthCaptchaWidget resetKey={captchaResetKey} onTokenChange={setCaptchaToken} />
            <div className="admin-gate-actions">
              <button type="submit" className="admin-gate-btn-primary" disabled={formBusy}>
                {formBusy ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                className="admin-gate-btn-secondary"
                onClick={() => {
                  setAuthMode('login')
                  setFormError('')
                  setFormNotice('')
                }}
              >
                Back to sign in
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  // 5. Authenticated user with no active server-side admin/moderator grant
  if (gateDecision.status === 'access_denied') {
    return (
      <main className="khelgrid-admin-app khelgrid-admin-gate-shell" aria-labelledby="admin-denied-heading">
        <section className="admin-gate-card">
          <div className="admin-gate-brand">
            <span className="admin-gate-logo">KG</span>
            <div>
              <p className="admin-gate-eyebrow">KHELGRID · RESTRICTED ACCESS</p>
              <h1 id="admin-denied-heading">Access not authorized</h1>
            </div>
          </div>
          <p role="alert" className="admin-gate-alert">
            {gateDecision.message}
          </p>
          {sessionEmail && (
            <p className="admin-gate-muted">
              Signed in as <strong>{sessionEmail}</strong>. Public registration and ordinary user accounts do not grant access to KhelGrid Admin Operations.
            </p>
          )}
          <div className="admin-gate-actions">
            <button type="button" className="admin-gate-btn-primary" onClick={() => void handleSignOut()} disabled={formBusy}>
              {formBusy ? 'Signing out…' : 'Sign out'}
            </button>
            <button type="button" className="admin-gate-btn-secondary" onClick={() => void revalidate()} disabled={formBusy}>
              Re-check access
            </button>
          </div>
        </section>
      </main>
    )
  }

  // 6. Authorization service unavailable — fail closed
  if (gateDecision.status === 'service_unavailable') {
    return (
      <main className="khelgrid-admin-app khelgrid-admin-gate-shell" role="alert">
        <section className="admin-gate-card">
          <div className="admin-gate-brand">
            <span className="admin-gate-logo">KG</span>
            <div>
              <p className="admin-gate-eyebrow">KHELGRID · FAIL-CLOSED PROTECTION</p>
              <h1>Authorization verification unavailable</h1>
            </div>
          </div>
          <p className="admin-gate-alert">{gateDecision.message}</p>
          {lookupError && <p className="admin-gate-muted">Server response: {lookupError}</p>}
          <div className="admin-gate-actions">
            <button type="button" className="admin-gate-btn-primary" onClick={() => void revalidate()} disabled={formBusy}>
              Retry verification
            </button>
            <button type="button" className="admin-gate-btn-secondary" onClick={() => void handleSignOut()} disabled={formBusy}>
              Sign out
            </button>
          </div>
        </section>
      </main>
    )
  }

  // 7. Unauthenticated or expired session — render sign-in gate only
  if (!gateDecision.allowWorkspaceMount || !gateDecision.role || !profile?.user_id) {
    return (
      <main className="khelgrid-admin-app khelgrid-admin-gate-shell" aria-labelledby="admin-signin-heading">
        <section className="admin-gate-card">
          <div className="admin-gate-brand">
            <span className="admin-gate-logo">KG</span>
            <div>
              <p className="admin-gate-eyebrow">KHELGRID · ADMIN CONTROL CENTER</p>
              <h1 id="admin-signin-heading">Authorized Operator Sign In</h1>
            </div>
          </div>
          <p className="admin-gate-muted">
            Sign in with an individually authorized KhelGrid operator account. Access is verified on the server before any operational workspace loads.
          </p>
          {gateDecision.status === 'session_expired' && (
            <p role="alert" className="admin-gate-alert">{gateDecision.message}</p>
          )}
          {formError && <p role="alert" className="admin-gate-alert">{formError}</p>}
          {formNotice && <p role="status" className="admin-gate-notice">{formNotice}</p>}
          <form className="admin-gate-form" onSubmit={handleSignIn}>
            <label>
              <span>Operator email</span>
              <input
                type="email"
                autoComplete="username"
                placeholder="operator@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </label>
            <AuthCaptchaWidget resetKey={captchaResetKey} onTokenChange={setCaptchaToken} />
            <div className="admin-gate-actions">
              <button type="submit" className="admin-gate-btn-primary" disabled={formBusy}>
                {formBusy ? 'Verifying…' : 'Sign in securely'}
              </button>
              <button
                type="button"
                className="admin-gate-btn-link"
                onClick={() => {
                  setAuthMode('forgot_password')
                  setFormError('')
                  setFormNotice('')
                }}
              >
                Forgot password?
              </button>
            </div>
          </form>
        </section>
      </main>
    )
  }

  // 8. Authorized server-verified operator
  const contextValue: AdminAuthContextValue = {
    identity: {
      userId: profile.user_id,
      email: sessionEmail || profile.user_id,
      role: gateDecision.role,
      isActive: true,
    },
    databaseProjectRef:
      initialAuthOverride?.databaseProjectRef || originCheck.projectRef || 'unconfigured',
    revalidate,
    signOut: handleSignOut,
    openPasswordReset: () => {
      setAuthMode('forgot_password')
      setFormError('')
      setFormNotice('')
    },
  }

  return <AdminAuthContext.Provider value={contextValue}>{children}</AdminAuthContext.Provider>
}
