import type { FormEvent } from 'react'
import { SiteIcon } from '../SiteIcon'

export interface AuthRecoveryAndOtpPanelProps {
  view: 'otp_pending' | 'forgot_password' | 'expired_link' | 'set_new_password'
  email: string
  otpCode: string
  newPassword: string
  confirmPassword: string
  showPassword: boolean
  submitting: boolean
  onEmailChange: (value: string) => void
  onOtpCodeChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onVerifyOtpSubmit: (e: FormEvent) => void
  onForgotSubmit: (e: FormEvent) => void
  onResendSubmit: (e?: FormEvent) => void
  onSetNewPasswordSubmit: (e: FormEvent) => void
  onBackToLogin: () => void
  onSwitchToSignup: () => void
  onSwitchToOtpEntry: () => void
}

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
  if (view === 'otp_pending') {
    return (
      <form className="kg-auth-form" onSubmit={onVerifyOtpSubmit}>
        <h2 id="kg-auth-title" className="kg-auth-title">
          6-Digit Email Verification Code
        </h2>
        <p className="kg-auth-subtitle">
          Enter the 6-digit code sent to <strong>{email || 'your email'}</strong> to verify your account.
        </p>

        <div className="kg-auth-field">
          <label htmlFor="kg-auth-otp-email">Email Address</label>
          <input
            id="kg-auth-otp-email"
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            required
          />
        </div>

        <div className="kg-auth-field">
          <label htmlFor="kg-auth-otp-code">6-Digit Code</label>
          <input
            id="kg-auth-otp-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otpCode}
            onChange={e => onOtpCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>

        <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify 6-Digit Code & Continue'}
        </button>

        <div className="kg-auth-footer-links">
          <button type="button" className="kg-auth-link-btn" onClick={() => onResendSubmit()}>
            Resend Verification Email
          </button>
          <button type="button" className="kg-auth-link-btn" onClick={onBackToLogin}>
            Back to Sign In
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
          Enter your registered email address and we will send secure password reset instructions.
        </p>

        <div className="kg-auth-field">
          <label htmlFor="kg-auth-forgot-email">Email Address</label>
          <input
            id="kg-auth-forgot-email"
            type="email"
            placeholder="athlete@example.com"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Reset Instructions'}
        </button>

        <div className="kg-auth-footer-links">
          <button type="button" className="kg-auth-link-btn" onClick={onBackToLogin}>
            Back to Sign In
          </button>
        </div>
      </form>
    )
  }

  if (view === 'expired_link') {
    return (
      <form className="kg-auth-form" onSubmit={onResendSubmit}>
        <h2 id="kg-auth-title" className="kg-auth-title">
          Verification Link Expired
        </h2>
        <p className="kg-auth-subtitle">
          Request a fresh verification link or verify directly with your 6-digit email code.
        </p>

        <div className="kg-auth-field">
          <label htmlFor="kg-auth-expired-email">Email Address</label>
          <input
            id="kg-auth-expired-email"
            type="email"
            placeholder="athlete@example.com"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
          {submitting ? 'Sending…' : 'Resend Verification Email'}
        </button>

        <div className="kg-auth-footer-links">
          <button type="button" className="kg-auth-link-btn" onClick={onSwitchToOtpEntry}>
            Have a 6-digit email code? Verify directly
          </button>
          <button type="button" className="kg-auth-link-btn" onClick={onSwitchToSignup}>
            Create a new account
          </button>
        </div>
      </form>
    )
  }

  return (
    <form className="kg-auth-form" onSubmit={onSetNewPasswordSubmit}>
      <h2 id="kg-auth-title" className="kg-auth-title">
        Create a New Password
      </h2>
      <p className="kg-auth-subtitle">
        Choose a strong password of at least 8 characters to secure your KhelGrid account.
      </p>

      <div className="kg-auth-field">
        <label htmlFor="kg-auth-new-password">New Password</label>
        <div className="kg-auth-password-wrap">
          <input
            id="kg-auth-new-password"
            type={showPassword ? 'text' : 'password'}
            minLength={8}
            value={newPassword}
            onChange={e => onNewPasswordChange(e.target.value)}
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

      <div className="kg-auth-field">
        <label htmlFor="kg-auth-confirm-password">Confirm New Password</label>
        <input
          id="kg-auth-confirm-password"
          type={showPassword ? 'text' : 'password'}
          minLength={8}
          value={confirmPassword}
          onChange={e => onConfirmPasswordChange(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save New Password & Sign In'}
      </button>
    </form>
  )
}
