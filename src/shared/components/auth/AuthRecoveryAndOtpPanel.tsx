import { useId, type FormEvent } from 'react'
import { SiteIcon } from '../SiteIcon'
import { evaluatePasswordStrength } from './authModalTypes'

interface AuthRecoveryAndOtpPanelProps {
  view: 'otp_pending' | 'forgot_password' | 'expired_link' | 'set_new_password'
  email: string
  otpCode: string
  newPassword: string
  confirmPassword: string
  showPassword: boolean
  submitting: boolean
  onEmailChange: (val: string) => void
  onOtpCodeChange: (val: string) => void
  onNewPasswordChange: (val: string) => void
  onConfirmPasswordChange: (val: string) => void
  onTogglePassword: () => void
  onVerifyOtpSubmit: (e: FormEvent) => void
  onForgotSubmit: (e: FormEvent) => void
  onResendSubmit: (e: FormEvent) => void
  onSetNewPasswordSubmit: (e: FormEvent) => void
  onBackToLogin: () => void
  onSwitchToSignup: () => void
  onSwitchToOtpEntry: () => void
}

/**
 * Handles in-modal 6-digit email OTP confirmation, password recovery, expired-link recovery,
 * and setting a new password with live strength guidance.
 */
export function AuthRecoveryAndOtpPanel({
  view,
  email,
  otpCode,
  newPassword,
  confirmPassword,
  showPassword,
  submitting,
  onEmailChange,
  onOtpCodeChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onTogglePassword,
  onVerifyOtpSubmit,
  onForgotSubmit,
  onResendSubmit,
  onSetNewPasswordSubmit,
  onBackToLogin,
  onSwitchToSignup,
  onSwitchToOtpEntry,
}: AuthRecoveryAndOtpPanelProps) {
  const emailId = useId()
  const otpId = useId()
  const newPassId = useId()
  const confirmPassId = useId()
  const strength = evaluatePasswordStrength(newPassword)

  if (view === 'otp_pending') {
    return (
      <form className="kg-auth-form" onSubmit={onVerifyOtpSubmit}>
        <div className="kg-auth-verification-box">
          <SiteIcon name="sparkles" size={20} className="kg-verify-icon" />
          <div>
            <strong>Verify Your Email Address</strong>
            <p>
              We sent a sign-in link and 6-digit code to <strong>{email}</strong>. Click the email link or enter the 6-digit code below.
            </p>
          </div>
        </div>

        <div className="kg-auth-field">
          <label htmlFor={otpId}>6-Digit Email Verification Code</label>
          <div className="kg-auth-input-wrap">
            <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
            <input
              id={otpId}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="e.g. 482910"
              value={otpCode}
              onChange={e => onOtpCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>
        </div>

        <button type="submit" className="kg-auth-submit-btn kg-touch-target" disabled={submitting}>
          {submitting ? 'Verifying Code…' : 'Verify 6-Digit Code & Continue'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="kg-text-link"
            onClick={e => onResendSubmit(e as unknown as FormEvent)}
            disabled={submitting}
          >
            Resend Email / Code
          </button>
          <button type="button" className="kg-text-link" onClick={onBackToLogin}>
            ← Back to Sign In
          </button>
        </div>
      </form>
    )
  }

  if (view === 'forgot_password') {
    return (
      <form className="kg-auth-form" onSubmit={onForgotSubmit}>
        <h2 id="kg-auth-title" className="kg-auth-title">
          Reset Your Password
        </h2>
        <p className="kg-auth-subtitle">
          Enter the email address registered with your KhelGrid account. We will email you
          instructions to reset your password.
        </p>

        <div className="kg-auth-field">
          <label htmlFor={emailId}>Registered Email Address</label>
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

        <button type="submit" className="kg-auth-submit-btn kg-touch-target" disabled={submitting}>
          {submitting ? 'Sending Instructions…' : 'Send Reset Instructions'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="button" className="kg-text-link" onClick={onBackToLogin}>
            ← Back to Sign In
          </button>
        </div>
      </form>
    )
  }

  if (view === 'set_new_password') {
    return (
      <form className="kg-auth-form" onSubmit={onSetNewPasswordSubmit}>
        <h2 id="kg-auth-title" className="kg-auth-title">
          Create a New Password
        </h2>
        <p className="kg-auth-subtitle">
          Enter and confirm your new secure password below (minimum 6 characters) to update your KhelGrid account.
        </p>

        <div className="kg-auth-field">
          <label htmlFor={newPassId}>New Password</label>
          <div className="kg-auth-input-wrap">
            <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
            <input
              id={newPassId}
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={e => onNewPasswordChange(e.target.value)}
              autoComplete="new-password"
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
          {newPassword.length > 0 && (
            <div className={`kg-password-strength is-score-${strength.score}`} aria-live="polite">
              <span className="kg-strength-bar" />
              <span className="kg-strength-label">Password strength: {strength.label}</span>
            </div>
          )}
        </div>

        <div className="kg-auth-field">
          <label htmlFor={confirmPassId}>Confirm New Password</label>
          <div className="kg-auth-input-wrap">
            <SiteIcon name="shield-check" size={16} className="kg-input-icon" />
            <input
              id={confirmPassId}
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="Re-type new password"
              value={confirmPassword}
              onChange={e => onConfirmPasswordChange(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button type="submit" className="kg-auth-submit-btn kg-touch-target" disabled={submitting}>
          {submitting ? 'Updating Password…' : 'Save New Password & Sign In'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="button" className="kg-text-link" onClick={onBackToLogin}>
            ← Back to Sign In
          </button>
        </div>
      </form>
    )
  }

  return (
    <form className="kg-auth-form" onSubmit={onResendSubmit}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span className="kg-auth-expired-badge" aria-hidden="true">
          <SiteIcon name="alert-circle" size={28} />
        </span>
      </div>
      <h2 id="kg-auth-title" className="kg-auth-title" style={{ textAlign: 'center' }}>
        Verification Link Expired
      </h2>
      <p className="kg-auth-subtitle" style={{ textAlign: 'center' }}>
        Email links expire after 1 hour or when pre-scanned by email security filters. Request a fresh link or enter your 6-digit email code.
      </p>

      <div className="kg-auth-field">
        <label htmlFor={emailId}>Your Registered Email</label>
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

      <button type="submit" className="kg-auth-submit-btn kg-touch-target" disabled={submitting}>
        {submitting ? 'Sending Fresh Link…' : 'Resend Verification Email'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className="kg-text-link" onClick={onSwitchToOtpEntry}>
          Have a 6-digit email code? Verify directly →
        </button>
        <button type="button" className="kg-text-link" onClick={onBackToLogin}>
          Already verified? Sign in with password
        </button>
        <button type="button" className="kg-text-link" onClick={onSwitchToSignup}>
          Need to create a new account? Register here
        </button>
      </div>
    </form>
  )
}
