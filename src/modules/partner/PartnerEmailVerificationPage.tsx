import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import { completePartnerEmailVerification } from './partnerOnboardingService'

type VerificationState = 'checking' | 'success' | 'error' | 'signin'

export default function PartnerEmailVerificationPage() {
  const [state, setState] = useState<VerificationState>('checking')
  const [message, setMessage] = useState('Confirming your email and preparing your partner workspace...')
  const started = useRef(false)

  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) {
      setState('error')
      setMessage('KhelGrid authentication is unavailable. Please try again later.')
      return
    }

    let active = true
    const finish = async () => {
      if (started.current) return
      started.current = true
      try {
        const outcome = await completePartnerEmailVerification()
        if (!active) return
        if (!outcome.success) {
          setState('error')
          setMessage(outcome.message)
          return
        }
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
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setState('error')
        setMessage('We could not confirm your sign-in session. Please reopen the email link.')
        return
      }
      if (data.session?.user) {
        void finish()
      } else {
        setState('signin')
        setMessage('Your email link was opened, but no verified session was created. Reopen the latest email link or sign in with your registered account.')
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <main className="content-page" style={{ maxWidth: 680, margin: '0 auto', paddingTop: 64, paddingBottom: 64 }}>
      <p className="eyebrow">KHELGRID · PARTNER ACCOUNT VERIFICATION</p>
      <h1>{state === 'checking' ? 'Verifying your email' : state === 'success' ? 'Email verified' : state === 'signin' ? 'Verification link opened' : 'Verification needs attention'}</h1>
      <p className="page-intro" role="status" aria-live="polite">{message}</p>
      {state !== 'checking' && state !== 'success' && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <a className="primary-link" href="/partner-login?mode=login">Sign in to your partner account</a>
          <a className="primary-link" href="/partner-signup">Return to partner registration</a>
        </div>
      )}
    </main>
  )
}
