import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import * as realtimeModule from '../../integrations/supabase/realtime-client'
import {
  resendVerificationEmail,
  sendPasswordReset,
  setStoredAuthUser,
  signInWithEmail,
  signUpWithEmail,
} from '../../integrations/supabase/auth-client'
import {
  formatCaptchaAuthError,
  getCaptchaConfig,
  isCaptchaConfigured,
  isCaptchaErrorMessage,
} from './captchaConfig'
import { AuthCaptchaWidget } from '../components/auth/AuthCaptchaWidget'

describe('Supabase Auth CAPTCHA Protection Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    setStoredAuthUser(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('detects Turnstile and hCaptcha environment configuration without hardcoded keys', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    vi.stubEnv('VITE_HCAPTCHA_SITE_KEY', '')
    vi.stubEnv('VITE_CAPTCHA_SITE_KEY', '')
    expect(getCaptchaConfig()).toEqual({ provider: 'turnstile', siteKey: null })
    expect(isCaptchaConfigured()).toBe(false)

    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '0x4AAAAAAATestKey')
    expect(getCaptchaConfig()).toEqual({ provider: 'turnstile', siteKey: '0x4AAAAAAATestKey' })
    expect(isCaptchaConfigured()).toBe(true)

    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    vi.stubEnv('VITE_HCAPTCHA_SITE_KEY', '10000000-ffff-ffff-ffff-000000000001')
    expect(getCaptchaConfig()).toEqual({
      provider: 'hcaptcha',
      siteKey: '10000000-ffff-ffff-ffff-000000000001',
    })
  })

  it('unmasks Supabase captcha protection rejections cleanly instead of showing wrong-password or generic reset success', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    vi.stubEnv('VITE_HCAPTCHA_SITE_KEY', '')
    expect(isCaptchaErrorMessage('captcha protection: request disallowed (no captcha_token found)')).toBe(true)

    const unconfiguredMsg = formatCaptchaAuthError('captcha protection: request disallowed (no captcha_token found)')
    expect(unconfiguredMsg).toContain('VITE_TURNSTILE_SITE_KEY')
    expect(unconfiguredMsg).toContain('Attack Protection')

    const mockSignInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'captcha protection: request disallowed (no captcha_token found)' },
    })
    const mockResetPasswordForEmail = vi.fn().mockResolvedValue({
      error: { message: 'captcha protection: request disallowed (no captcha_token found)' },
    })
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'captcha protection: request disallowed (no captcha_token found)' },
    })

    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        resetPasswordForEmail: mockResetPasswordForEmail,
        signUp: mockSignUp,
      },
    } as never)

    const loginRes = await signInWithEmail({
      email: 'athlete@khelgrid.in',
      password: 'password123',
    })
    expect(loginRes.success).toBe(false)
    expect(loginRes.message).toContain('Captcha protection')
    expect(loginRes.message).not.toBe('Invalid email or password.')

    const resetRes = await sendPasswordReset('athlete@khelgrid.in')
    expect(resetRes.success).toBe(false)
    expect(resetRes.message).toContain('Captcha protection')

    const signupRes = await signUpWithEmail({
      email: 'athlete@khelgrid.in',
      fullName: 'Aarav Singh',
      password: 'password123',
    })
    expect(signupRes.success).toBe(false)
    expect(signupRes.message).toContain('Captcha protection')
  })

  it('forwards verified captchaToken through all Supabase auth endpoints when provided', async () => {
    const mockSignInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com', user_metadata: { role: 'athlete', full_name: 'Aarav' } }, session: null },
      error: null,
    })
    const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
    const mockSignUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.com', user_metadata: { role: 'athlete', full_name: 'Aarav' } }, session: null },
      error: null,
    })
    const mockResetPasswordForEmail = vi.fn().mockResolvedValue({ error: null })
    const mockResend = vi.fn().mockResolvedValue({ error: null })

    vi.spyOn(realtimeModule, 'getSupabaseClient').mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signInWithOtp: mockSignInWithOtp,
        signUp: mockSignUp,
        resetPasswordForEmail: mockResetPasswordForEmail,
        resend: mockResend,
      },
    } as never)

    await signInWithEmail({
      email: 'a@b.com',
      password: 'password123',
      captchaToken: 'tok-pass',
    })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password123',
      options: { captchaToken: 'tok-pass' },
    })

    await signInWithEmail({
      email: 'a@b.com',
      useMagicLink: true,
      captchaToken: 'tok-otp',
    })
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        options: expect.objectContaining({ captchaToken: 'tok-otp' }),
      })
    )

    await signUpWithEmail({
      email: 'a@b.com',
      fullName: 'Aarav',
      password: 'password123',
      captchaToken: 'tok-signup',
    })
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        options: expect.objectContaining({ captchaToken: 'tok-signup' }),
      })
    )

    await sendPasswordReset('a@b.com', '/login', 'tok-reset')
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'a@b.com',
      expect.objectContaining({ captchaToken: 'tok-reset' })
    )

    await resendVerificationEmail('a@b.com', 'tok-resend')
    expect(mockResend).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        options: expect.objectContaining({ captchaToken: 'tok-resend' }),
      })
    )
  })

  it('renders AuthCaptchaWidget container only when a site key env var is configured', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    const hiddenHtml = renderToStaticMarkup(<AuthCaptchaWidget onTokenChange={vi.fn()} />)
    expect(hiddenHtml).toBe('')

    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '0x4AAAAAAATestKey')
    const turnstileHtml = renderToStaticMarkup(<AuthCaptchaWidget onTokenChange={vi.fn()} />)
    expect(turnstileHtml).toContain('data-captcha-provider="turnstile"')
    expect(turnstileHtml).toContain('Human security verification')
  })
})
