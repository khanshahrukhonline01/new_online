import type { FormEvent, MouseEvent } from 'react'
import { SiteIcon } from '../SiteIcon'
import type { AuthPartnerRole } from './authModalTypes'

export interface AuthStepIdentityPanelProps {
  mode: 'login' | 'signup'
  email: string
  password: string
  showPassword: boolean
  submitting: boolean
  errorMsg: string | null
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onLoginSubmit: (e: FormEvent) => void
  onMagicLinkSubmit: () => void
  onGoogleSignIn: () => void
  onAdvanceSignupStep: (e: FormEvent) => void
  onGoToForgotPassword: () => void
  onGoToExpiredLink: () => void
  onNavigatePartner: (
    event: MouseEvent<HTMLAnchorElement>,
    role: AuthPartnerRole,
    mode?: 'signup' | 'login',
  ) => void
}

export function AuthStepIdentityPanel({
  mode,
  email,
  password,
  showPassword,
  submitting,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onLoginSubmit,
  onMagicLinkSubmit,
  onGoogleSignIn,
  onAdvanceSignupStep,
  onGoToForgotPassword,
  onGoToExpiredLink,
  onNavigatePartner,
}: AuthStepIdentityPanelProps) {
  const isSignup = mode === 'signup'

  return (
    <div className="kg-auth-body">
      {isSignup ? (
        <>
          <p className="kg-auth-step-badge">Step 1 of 2 · Fast Account Setup</p>
          <h2 id="kg-auth-title" className="kg-auth-title">
            Start with your email &amp; password
          </h2>
        </>
      ) : (
        <h2 id="kg-auth-title" className="kg-auth-title">
          Sign in to your KhelGrid profile
        </h2>
      )}

      <button
        type="button"
        className="kg-auth-google-btn"
        onClick={onGoogleSignIn}
        disabled={submitting}
      >
        <SiteIcon name="globe" size={16} />
        <span>Continue with Google</span>
      </button>

      <div className="kg-auth-divider" aria-hidden="true">
        <span>or continue with email</span>
      </div>

      <form
        className="kg-auth-form"
        onSubmit={isSignup ? onAdvanceSignupStep : onLoginSubmit}
      >
        <div className="kg-auth-field">
          <label htmlFor="kg-auth-identity-email">Email Address</label>
          <input
            id="kg-auth-identity-email"
            type="email"
            autoComplete="email"
            placeholder="athlete@example.com"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            required
          />
        </div>

        <div className="kg-auth-field">
          <div className="kg-auth-label-row">
            <label htmlFor="kg-auth-identity-password">Password</label>
            {!isSignup && (
              <button
                type="button"
                className="kg-auth-link-btn"
                onClick={onGoToForgotPassword}
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="kg-auth-password-wrap">
            <input
              id="kg-auth-identity-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder={isSignup ? 'Minimum 8 characters' : 'Enter your password'}
              value={password}
              onChange={e => onPasswordChange(e.target.value)}
              required
            />
            <button
              type="button"
              className="kg-auth-toggle-pw"
              onClick={onTogglePassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <SiteIcon name={showPassword ? 'eye-off' : 'eye'} size={16} />
            </button>
          </div>
        </div>

        <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
          {isSignup
            ? 'Continue to Profile & Safety Check'
            : submitting
              ? 'Signing in…'
              : 'Sign In'}
        </button>

        {!isSignup && (
          <button
            type="button"
            className="kg-auth-secondary-btn"
            onClick={onMagicLinkSubmit}
            disabled={submitting}
          >
            <SiteIcon name="mail" size={15} />
            <span>Send 1-Click Magic Link / Code</span>
          </button>
        )}
      </form>

      {!isSignup && (
        <div className="kg-auth-footer-links">
          <button type="button" className="kg-auth-link-btn" onClick={onGoToExpiredLink}>
            Verification link expired?
          </button>
        </div>
      )}

      <div className="kg-auth-partner-strip">
        <p className="kg-auth-partner-strip-title">Running a sports organization or facility?</p>
        <div className="kg-auth-partner-links">
          <a
            href="/partner-signup?role=academy"
            onClick={e => onNavigatePartner(e, 'academy', 'signup')}
          >
            Academy
          </a>
          <a
            href="/partner-signup?role=coach"
            onClick={e => onNavigatePartner(e, 'coach', 'signup')}
          >
            Coach
          </a>
          <a
            href="/partner-signup?role=venue"
            onClick={e => onNavigatePartner(e, 'venue', 'signup')}
          >
            Venue / Turf
          </a>
          <a
            href="/partner-signup?role=tournament"
            onClick={e => onNavigatePartner(e, 'tournament', 'signup')}
          >
            Tournament
          </a>
        </div>
      </div>
    </div>
  )
}
