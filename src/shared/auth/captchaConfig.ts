export type CaptchaProvider = 'turnstile' | 'hcaptcha'

export interface CaptchaConfig {
  provider: CaptchaProvider
  siteKey: string | null
}

/**
 * Resolves configured CAPTCHA provider and public site key from Vite env vars.
 * Never defaults to mock/test keys in runtime code.
 */
export function getCaptchaConfig(): CaptchaConfig {
  const turnstileKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
  if (turnstileKey) {
    return { provider: 'turnstile', siteKey: turnstileKey }
  }

  const hcaptchaKey = (import.meta.env.VITE_HCAPTCHA_SITE_KEY || '').trim()
  if (hcaptchaKey) {
    return { provider: 'hcaptcha', siteKey: hcaptchaKey }
  }

  const genericKey = (import.meta.env.VITE_CAPTCHA_SITE_KEY || '').trim()
  if (genericKey) {
    const rawProvider = (import.meta.env.VITE_CAPTCHA_PROVIDER || '').trim().toLowerCase()
    const provider: CaptchaProvider = rawProvider === 'hcaptcha' ? 'hcaptcha' : 'turnstile'
    return { provider, siteKey: genericKey }
  }

  return { provider: 'turnstile', siteKey: null }
}

/** Returns true when a CAPTCHA site key is configured for the frontend build. */
export function isCaptchaConfigured(): boolean {
  return Boolean(getCaptchaConfig().siteKey)
}

/** Detects Supabase Auth CAPTCHA protection rejection messages (`no captcha_token found`, etc.). */
export function isCaptchaErrorMessage(message?: string | null): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('captcha_token') ||
    lower.includes('captcha protection') ||
    lower.includes('captcha verification') ||
    lower.includes('hcaptcha') ||
    lower.includes('turnstile')
  )
}

/**
 * Formats an actionable, honest error message when Supabase rejects a request
 * due to missing or invalid CAPTCHA verification.
 */
export function formatCaptchaAuthError(rawMessage: string): string {
  if (isCaptchaConfigured()) {
    return 'Please complete the human verification (CAPTCHA) check before continuing.'
  }

  return (
    `Supabase rejected this request because Captcha protection is enabled on your Supabase project (${rawMessage}), ` +
    'but no CAPTCHA site key (VITE_TURNSTILE_SITE_KEY or VITE_HCAPTCHA_SITE_KEY) is configured in the frontend environment. ' +
    'Add your site key to Vercel / .env and redeploy, or disable "Enable Captcha protection" under Supabase Authentication → Attack Protection.'
  )
}
