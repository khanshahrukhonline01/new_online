import { useId, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../SiteIcon'
import { evaluatePasswordStrength, PARTNER_HANDOFF_OPTIONS, type PartnerHandoffRole } from './authModalTypes'

interface AuthStepIdentityPanelProps {
  mode: 'login' | 'signup'
  email: string
  password: string
  showPassword: boolean
  submitting: boolean
  errorMsg: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onLoginSubmit: (e: FormEvent) => void
  onMagicLinkSubmit: () => void
  onGoogleSignIn: () => void
  onAdvanceSignupStep: (e: FormEvent) => void
  onGoToForgotPassword: () => void
  onGoToExpiredLink: () => void
  onNavigatePartner: (role: PartnerHandoffRole, e: MouseEvent<HTMLAnchorElement>, mode?: 'signup' | 'login') => void
}

/**
 * Step 1 (Identity): Clean email/password sign-in, 1-click magic link/code, Google OAuth trigger,
 * or 2-field consumer signup start + guided handoff to multi-tenant Partner Onboarding.
 */
export function AuthStepIdentityPanel({
  mode,
  email,
  password,
  showPassword,
  submitting,
  errorMsg,
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
  const emailId = useId()
  const passwordId = useId()
  const strength = evaluatePasswordStrength(password)

  const isLogin = mode === 'login'

  return (
    <div className="kg-auth-form">
      <div className="kg-auth-step-header">
        <span className="kg-auth-step-pill">
          {isLogin ? 'Step 1 of 1 · Verify Identity' : 'Step 1 of 2 · Fast Account Setup'}
        </span>
      </div>

      <h2 id="kg-auth-title" className="kg-auth-title">
        {isLogin ? 'Sign in to your KhelGrid profile' : 'Start with your email & password'}
      </h2>
      <p className="kg-auth-subtitle">
        {isLogin
          ? 'Continue to your saved trials, bookings, Athlete CV, or partner workspace.'
          : 'Takes under 15 seconds — customize your athlete, parent, or scout role in the next step.'}
      </p>

      <button
        type="button"
        className="kg-auth-oauth-btn kg-touch-target"
        onClick={onGoogleSignIn}
        disabled={submitting}
      >
        <SiteIcon name="globe" size={16} />
        <span>Continue with Google</span>
      </button>

      <div className="kg-auth-divider">
        <span>OR WITH EMAIL</span>
      </div>

      <form onSubmit={isLogin ? onLoginSubmit : onAdvanceSignupStep} className="kg-auth-form-inner">
        <div className="kg-auth-field">
          <label htmlFor={emailId}>Email Address</label>
          <div className="kg-auth-input-wrap">
            <SiteIcon name="mail" size={16} className="kg-input-icon" />
            <input
              id={emailId}
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={e => onEmailChange(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="kg-auth-field">
          <div className="kg-field-header">
            <label htmlFor={passwordId}>
              {isLogin ? 'Password' : 'Create Password (min 6 characters)'}
            </label>
            {isLogin && (
              <button
                type="button"
                className="kg-text-link"
                onClick={onGoToForgotPassword}
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="kg-auth-input-wrap">
            <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
            <input
              id={passwordId}
              type={showPassword ? 'text' : 'password'}
              required
              minLength={isLogin ? undefined : 6}
              placeholder={isLogin ? '••••••••' : 'At least 6 characters'}
              value={password}
              onChange={e => onPasswordChange(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className="kg-password-toggle"
              onClick={onTogglePassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <SiteIcon name={showPassword ? 'eye-off' : 'eye'} size={15} />
            </button>
          </div>
          {!isLogin && password.length > 0 && (
            <div className={`kg-password-strength is-score-${strength.score}`} aria-live="polite">
              <span className="kg-strength-bar" />
              <span className="kg-strength-label">Password strength: {strength.label}</span>
            </div>
          )}
        </div>

        {isLogin &&
          errorMsg &&
          (errorMsg.toLowerCase().includes('confirm') || errorMsg.toLowerCase().includes('expired')) && (
            <div className="kg-auth-inline-action">
              <button
                type="button"
                className="kg-text-link kg-text-link--bold"
                onClick={onGoToExpiredLink}
              >
                ✉️ Need a fresh link or enter 6-digit code? →
              </button>
            </div>
          )}

        <button type="submit" className="kg-auth-submit-btn kg-touch-target" disabled={submitting}>
          {isLogin
            ? submitting
              ? 'Signing in…'
              : 'Sign In with Password'
            : 'Continue to Profile & Safety Check →'}
        </button>

        {isLogin && (
          <button
            type="button"
            className="kg-auth-magic-btn kg-touch-target"
            onClick={onMagicLinkSubmit}
            disabled={submitting}
          >
            <SiteIcon name="sparkles" size={15} />
            <span>Send 1-Click Magic Link / Code</span>
          </button>
        )}
      </form>

      <div className="kg-auth-partner-handoff">
        <div className="kg-auth-partner-handoff-head">
          <SiteIcon name="building" size={15} />
          <div>
            <strong>Managing an Academy, Venue, Coach, Tournament, or Organization?</strong>
            <span>Launch onboarding or sign in to a dedicated multi-tenant dashboard.</span>
          </div>
        </div>
        <div className="kg-auth-partner-pills">
          {PARTNER_HANDOFF_OPTIONS.map(opt => (
            <a
              key={opt.role}
              href={`/partner-signup?role=${opt.role}`}
              className="kg-auth-partner-chip"
              onClick={e => onNavigatePartner(opt.role, e)}
            >
              <SiteIcon name={opt.icon} size={13} />
              <span>{opt.title}</span>
            </a>
          ))}
        </div>
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <a
            href="/partner-signup?role=academy&mode=login"
            className="kg-text-link kg-text-link--bold"
            onClick={e => onNavigatePartner('academy', e, 'login')}
          >
            Partner / Organization Sign In →
          </a>
        </div>
      </div>
    </div>
  )
}
