import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AuthModal from './AuthModal'
import { AuthStepProfilePanel } from './auth/AuthStepProfilePanel'
import { AuthRecoveryAndOtpPanel } from './auth/AuthRecoveryAndOtpPanel'
import authModalTsx from './AuthModal.tsx?raw'
// @ts-expect-error - node built-in (Vitest stubs .css?raw to empty string)
import fs from 'node:fs'
// @ts-expect-error - node built-in
import path from 'node:path'

describe('AuthModal Progressive Intent-First Redesign', () => {
  it('1. renders null when closed', () => {
    const html = renderToStaticMarkup(
      <AuthModal isOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('2. renders Step 1 Identity sign-in with Google OAuth, Magic Link/Code, Partner handoff, and NO public demo chips', () => {
    const html = renderToStaticMarkup(
      <AuthModal
        isOpen={true}
        initialTab="login"
        intentLabel="Sign in to book Kanteerava Stadium Turf"
        redirectTo="/venues/sree-kanteerava-stadium"
        onClose={vi.fn()}
      />
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="kg-auth-title"')
    expect(html).toContain('KHELGRID AUTH')
    expect(html).toContain('DPDP 2023 Secure')

    // Contextual intent banner
    expect(html).toContain('Sign in to book Kanteerava Stadium Turf')

    // Streamlined 2-tab switcher
    expect(html).toContain('Sign In')
    expect(html).toContain('Create Account')

    // Step 1 controls
    expect(html).toContain('Continue with Google')
    expect(html).toContain('Sign in to your KhelGrid profile')
    expect(html).toContain('Forgot password?')
    expect(html).toContain('Send 1-Click Magic Link / Code')

    // Guided multi-tenant partner handoff links
    expect(html).toContain('/partner-signup?role=academy')
    expect(html).toContain('/partner-signup?role=coach')
    expect(html).toContain('/partner-signup?role=venue')
    expect(html).toContain('/partner-signup?role=tournament')

    // Public demo chips removed
    expect(html).not.toContain('TEST / DEMO ACCOUNTS')
    expect(html).not.toContain('KhelGrid Admin')
  })

  it('3. renders low-friction Step 1 signup form first without overwhelming all roles upfront', () => {
    const html = renderToStaticMarkup(
      <AuthModal isOpen={true} initialTab="signup" onClose={vi.fn()} />
    )

    expect(html).toContain('Step 1 of 2 · Fast Account Setup')
    expect(html).toContain('Start with your email &amp; password')
    expect(html).toContain('Continue to Profile &amp; Safety Check')
    expect(html).toContain('Continue with Google')
  })

  it('4. renders Step 2 adaptive consumer role profile with dynamic DPDP Under-18 Guardian check for youth athletes', () => {
    const minorHtml = renderToStaticMarkup(
      <AuthStepProfilePanel
        email="junior@khelgrid.in"
        role="athlete"
        fullName="Tanmay Saxena"
        city="Delhi NCR"
        phone=""
        ageBand="u16"
        guardianEmail=""
        guardianConsentAccepted={false}
        submitting={false}
        onRoleChange={vi.fn()}
        onFullNameChange={vi.fn()}
        onCityChange={vi.fn()}
        onPhoneChange={vi.fn()}
        onAgeBandChange={vi.fn()}
        onGuardianEmailChange={vi.fn()}
        onGuardianConsentChange={vi.fn()}
        onBackStep={vi.fn()}
        onSubmitSignUp={vi.fn()}
        onNavigatePartner={vi.fn()}
      />
    )

    expect(minorHtml).toContain('Step 2 of 2 · Profile &amp; Safety')
    expect(minorHtml).toContain('Athlete / Player')
    expect(minorHtml).toContain('Parent / Guardian')
    expect(minorHtml).toContain('Talent Scout')
    expect(minorHtml).toContain('DPDP Act 2023 (Section 9)')
    expect(minorHtml).toContain('Parent / Legal Guardian Email *')
    expect(minorHtml).toContain('DPDP Under-18 Guardian Notice')

    const adultHtml = renderToStaticMarkup(
      <AuthStepProfilePanel
        email="senior@khelgrid.in"
        role="athlete"
        fullName="Rohit Verma"
        city="Mumbai"
        phone=""
        ageBand="adult"
        guardianEmail=""
        guardianConsentAccepted={false}
        submitting={false}
        onRoleChange={vi.fn()}
        onFullNameChange={vi.fn()}
        onCityChange={vi.fn()}
        onPhoneChange={vi.fn()}
        onAgeBandChange={vi.fn()}
        onGuardianEmailChange={vi.fn()}
        onGuardianConsentChange={vi.fn()}
        onBackStep={vi.fn()}
        onSubmitSignUp={vi.fn()}
        onNavigatePartner={vi.fn()}
      />
    )

    expect(adultHtml).not.toContain('Parent / Legal Guardian Email *')
  })

  it('5. renders guided Partner Workspace Handoff when opened in initialTab="partner"', () => {
    const html = renderToStaticMarkup(
      <AuthModal isOpen={true} initialTab="partner" onClose={vi.fn()} />
    )

    expect(html).toContain('Launch Your Institutional Partner Workspace')
    expect(html).toContain('/partner-signup?role=academy&amp;mode=signup')
    expect(html).toContain('/partner-signup?role=coach&amp;mode=signup')
    expect(html).toContain('/partner-signup?role=venue&amp;mode=signup')
    expect(html).toContain('/partner-signup?role=tournament&amp;mode=signup')
  })

  it('6. renders password recovery, expired link with OTP fallback, and 6-digit OTP entry states', () => {
    const forgotHtml = renderToStaticMarkup(
      <AuthModal isOpen={true} initialTab="forgot_password" onClose={vi.fn()} />
    )
    expect(forgotHtml).toContain('Reset Your Password')
    expect(forgotHtml).toContain('Send Reset Instructions')

    const expiredHtml = renderToStaticMarkup(
      <AuthModal
        isOpen={true}
        initialTab="expired_link"
        initialError="Email verification link is invalid or has expired."
        initialEmail="user@example.com"
        onClose={vi.fn()}
      />
    )
    expect(expiredHtml).toContain('Verification Link Expired')
    expect(expiredHtml).toContain('Have a 6-digit email code? Verify directly')
    expect(expiredHtml).toContain('Resend Verification Email')

    const otpHtml = renderToStaticMarkup(
      <AuthRecoveryAndOtpPanel
        view="otp_pending"
        email="athlete@example.com"
        otpCode="482910"
        newPassword=""
        confirmPassword=""
        showPassword={false}
        submitting={false}
        onEmailChange={vi.fn()}
        onOtpCodeChange={vi.fn()}
        onNewPasswordChange={vi.fn()}
        onConfirmPasswordChange={vi.fn()}
        onTogglePassword={vi.fn()}
        onVerifyOtpSubmit={vi.fn()}
        onForgotSubmit={vi.fn()}
        onResendSubmit={vi.fn()}
        onSetNewPasswordSubmit={vi.fn()}
        onBackToLogin={vi.fn()}
        onSwitchToSignup={vi.fn()}
        onSwitchToOtpEntry={vi.fn()}
      />
    )
    expect(otpHtml).toContain('6-Digit Email Verification Code')
    expect(otpHtml).toContain('Verify 6-Digit Code &amp; Continue')

    const setPassHtml = renderToStaticMarkup(
      <AuthModal isOpen={true} initialTab="set_new_password" onClose={vi.fn()} />
    )
    expect(setPassHtml).toContain('Create a New Password')
    expect(setPassHtml).toContain('Save New Password &amp; Sign In')
  })

  it('7. enforces dark-mode CSS tokens, 44px touch targets, unique DOM IDs, and modular controller architecture', () => {
    const authModalCss = fs.readFileSync(path.resolve('src/shared/components/AuthModal.css'), 'utf8')
    expect(authModalCss).toContain('var(--surface')
    expect(authModalCss).toContain('var(--surface-raised')
    expect(authModalCss).toContain('var(--text')
    expect(authModalCss).toContain('var(--muted')
    expect(authModalCss).toContain('var(--line')
    expect(authModalCss).toContain('var(--accent-soft')
    expect(authModalCss).toContain('var(--danger-soft')
    expect(authModalCss).toContain('var(--touch-min, 44px)')
    expect(authModalCss).not.toMatch(/color:\s*#047857\b/i)
    expect(authModalCss).not.toMatch(/color:\s*#92400e\b/i)
    expect(authModalCss).not.toMatch(/color:\s*#78350f\b/i)
    expect(authModalCss).not.toMatch(/background:\s*#fef2f2\b/i)

    expect(authModalTsx.split('\n').length).toBeLessThan(300)
    expect(authModalTsx).toContain('useAuthModalController')
    expect(authModalTsx).toContain('FOCUSABLE_SELECTORS')
    expect(authModalTsx).not.toMatch(/\buseState\s*\(/)

    // Rendered DOM IDs must remain strictly unique
    const html = renderToStaticMarkup(<AuthModal isOpen={true} initialTab="login" onClose={vi.fn()} />)
    const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g)).map(m => m[1])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
