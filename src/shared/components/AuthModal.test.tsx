import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import AuthModal from './AuthModal'

describe('AuthModal Component', () => {
  it('1. renders null when closed', () => {
    const html = renderToStaticMarkup(
      <AuthModal isOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })

  it('2. renders full accessible dialog structure when open in login mode', () => {
    const html = renderToStaticMarkup(
      <AuthModal isOpen={true} initialTab="login" onClose={vi.fn()} />
    )

    // Modal dialog accessibility semantics
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-labelledby="kg-auth-title"')

    // Branding & DPDP Badge
    expect(html).toContain('KHELGRID AUTH')
    expect(html).toContain('DPDP 2023 Secure')

    // Tab switcher
    expect(html).toContain('Sign In')
    expect(html).toContain('Create Account')
    expect(html).toContain('Recovery')

    // Login form fields
    expect(html).toContain('Sign in to your KhelGrid profile')
    expect(html).toContain('Email Address')
    expect(html).toContain('Password')
    expect(html).toContain('Forgot password?')
    expect(html).toContain('Sign In with Password')
    expect(html).toContain('Send 1-Click Magic Login Link')

    // Fast demo accounts
    expect(html).toContain('TEST / DEMO ACCOUNTS')
    expect(html).toContain('Rohit Verma (Athlete)')
    expect(html).toContain('FSV Arena (Turf Host)')
    expect(html).toContain('Zaheer Farooq (Coach)')
    expect(html).toContain('KhelGrid Admin')
  })

  it('3. renders full signup form with multi-role selector when opened in signup mode', () => {
    const html = renderToStaticMarkup(
      <AuthModal isOpen={true} initialTab="signup" onClose={vi.fn()} />
    )

    expect(html).toContain('Join KhelGrid Sports Network')
    expect(html).toContain('I AM JOINING AS:')

    // Roles
    expect(html).toContain('Athlete / Player')
    expect(html).toContain('Turf &amp; Venue Host')
    expect(html).toContain('Certified Coach')
    expect(html).toContain('Talent Scout')

    // Registration fields
    expect(html).toContain('Full Name')
    expect(html).toContain('Email Address')
    expect(html).toContain('Password (min 6 characters)')
    expect(html).toContain('Home City')
    expect(html).toContain('Mobile / WhatsApp (Optional)')
    expect(html).toContain('Create KhelGrid Account')
    expect(html).toContain('DPDP Act standards')
  })

  it('4. renders password recovery form when opened in forgot_password mode', () => {
    const html = renderToStaticMarkup(
      <AuthModal isOpen={true} initialTab="forgot_password" onClose={vi.fn()} />
    )

    expect(html).toContain('Reset Your Password')
    expect(html).toContain('Registered Email Address')
    expect(html).toContain('Send Reset Instructions')
    expect(html).toContain('Back to Sign In')
  })
})
