import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  clearAuthUrlHash,
  parseAuthUrlCallback,
  resendVerificationEmail,
} from '../../integrations/supabase/auth-client'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import { completePartnerEmailVerification } from './partnerOnboardingService'

type VerificationState = 'checking' | 'success' | 'error' | 'signin'

export default function PartnerEmailVerificationPage() {
  const [state, setState] = useState<VerificationState>('checking')
  const [message, setMessage] = useState('Confirming your email and preparing your partner workspace...')
  const [resendEmail, setResendEmail] = useState('')
  const [resendSending, setResendSending] = useState(false)
  const [resendStatus, setResendStatus] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const started = useRef(false)

  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) {
      setState('error')
      setMessage('KhelGrid authentication is unavailable. Please try again later.')
      return
    }

    const callbackInfo = parseAuthUrlCallback()
    if (callbackInfo.type === 'error') {
      clearAuthUrlHash()
      setState('error')
      setMessage(
        callbackInfo.errorDescription ||
          'This verification link is invalid or has expired. Enter your registered email below to receive a fresh verification link.',
      )
      return
    }

    let active = true
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined

    const finish = async () => {
      if (started.current) return
      started.current = true
      if (fallbackTimer) clearTimeout(fallbackTimer)
      try {
        const outcome = await completePartnerEmailVerification()
        if (!active) return
        if (!outcome.success) {
          setState('error')
          setMessage(outcome.message)
          return
        }
        clearAuthUrlHash()
        setState('success')
        setMessage(outcome.message)
        if (outcome.user) {
          // The authenticated session remains the source of identity; this event only refreshes app UI.
          window.dispatchEvent(new CustomEvent('khelgrid:auth-changed', { detail: { user: outcome.user } }))
        }
        if (outcome.workspacePath) {
          window.location.replace(outcome.workspacePath)
        } else {
          setState('error')
          setMessage('Your email is verified, but no workspace destination was returned. Please sign in to continue.')
        }
      } catch (error) {
        if (!active) return
        setState('error')
        setMessage(error instanceof Error ? error.message : 'We could not finish partner verification.')
      }
    }

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) queueMicrotask(() => { void finish() })
    })

    const hasPendingToken = Boolean(callbackInfo.code || callbackInfo.tokenHash || callbackInfo.accessToken)

    const resolveSession = async () => {
      if (callbackInfo.tokenHash && callbackInfo.otpType) {
        const otpType = (
          callbackInfo.otpType === 'magiclink' ||
          callbackInfo.otpType === 'email' ||
          callbackInfo.otpType === 'invite'
            ? callbackInfo.otpType
            : 'signup'
        )
        const { data: otpData, error: otpErr } = await client.auth.verifyOtp({
          token_hash: callbackInfo.tokenHash,
          type: otpType,
        })
        if (!active) return
        if (otpData?.session?.user) {
          void finish()
          return
        }
        if (otpErr) {
          clearAuthUrlHash()
          setState('error')
          setMessage(otpErr.message || 'Verification link expired or already used. Request a fresh link below.')
          return
        }
      }

      const { data, error } = await client.auth.getSession()
      if (!active) return
      if (error) {
        setState('error')
        setMessage('We could not confirm your sign-in session. Please reopen the email link.')
        return
      }
      if (data.session?.user) {
        void finish()
        return
      }

      if (hasPendingToken) {
        fallbackTimer = setTimeout(() => {
          if (!active || started.current) return
          setState('signin')
          setMessage('Your verification link could not be completed automatically. Request a fresh link below or sign in with your registered account.')
        }, 2500)
      } else {
        setState('signin')
        setMessage('Your email link was opened, but no verified session was created. Reopen the latest email link or sign in with your registered account.')
      }
    }

    void resolveSession()

    return () => {
      active = false
      if (fallbackTimer) clearTimeout(fallbackTimer)
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleResendLink = async (event: FormEvent) => {
    event.preventDefault()
    if (!resendEmail.trim()) return
    setResendSending(true)
    setResendStatus(null)
    try {
      const res = await resendVerificationEmail(resendEmail.trim(), undefined, '/partner/verify')
      setResendStatus({
        kind: res.success ? 'success' : 'error',
        text: res.message,
      })
    } finally {
      setResendSending(false)
    }
  }

  return (
    <main className="content-page" style={{ maxWidth: 680, margin: '0 auto', paddingTop: 64, paddingBottom: 64 }}>
      <p className="eyebrow">KHELGRID · PARTNER ACCOUNT VERIFICATION</p>
      <h1>{state === 'checking' ? 'Verifying your email' : state === 'success' ? 'Email verified' : state === 'signin' ? 'Verification link opened' : 'Verification needs attention'}</h1>
      <p className="page-intro" role="status" aria-live="polite">{message}</p>
      {state !== 'checking' && state !== 'success' && (
        <>
          <form onSubmit={handleResendLink} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            <input
              type="email"
              required
              placeholder="Registered partner email"
              aria-label="Registered partner email"
              value={resendEmail}
              onChange={e => setResendEmail(e.target.value)}
              style={{ flex: '1 1 240px', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.35)' }}
            />
            <button type="submit" className="primary-link" disabled={resendSending}>
              {resendSending ? 'Sending...' : 'Resend verification link'}
            </button>
          </form>
          {resendStatus && (
            <p
              role={resendStatus.kind === 'error' ? 'alert' : 'status'}
              style={{ marginTop: 10, color: resendStatus.kind === 'error' ? '#ef4444' : '#16a34a' }}
            >
              {resendStatus.text}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <a className="primary-link" href="/partner-login?mode=login">Sign in to your partner account</a>
            <a className="primary-link" href="/partner-signup">Return to partner registration</a>
          </div>
        </>
      )}
    </main>
  )
}
