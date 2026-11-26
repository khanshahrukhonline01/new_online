import { useEffect, useRef } from 'react'
import { getCaptchaConfig, type CaptchaProvider } from '../../auth/captchaConfig'

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      theme?: 'light' | 'dark' | 'auto'
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    }
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

interface HCaptchaApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      theme?: 'light' | 'dark'
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    }
  ) => string
  reset: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
    hcaptcha?: HCaptchaApi
  }
}

const SCRIPT_URLS: Record<CaptchaProvider, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
}

function loadCaptchaScript(provider: CaptchaProvider): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve()
  }

  const ready = provider === 'turnstile' ? Boolean(window.turnstile) : Boolean(window.hcaptcha)
  if (ready) return Promise.resolve()

  const scriptId = `kg-captcha-sdk-${provider}`
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load CAPTCHA script')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = SCRIPT_URLS[provider]
    script.async = true
    script.defer = true
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    })
    script.addEventListener('error', () => reject(new Error('Failed to load CAPTCHA script')))
    document.head.appendChild(script)
  })
}

export interface AuthCaptchaWidgetProps {
  onTokenChange: (token: string) => void
  resetKey?: number
}

/**
 * Renders Cloudflare Turnstile or hCaptcha when `VITE_TURNSTILE_SITE_KEY` /
 * `VITE_HCAPTCHA_SITE_KEY` is configured so Supabase Auth Attack Protection
 * receives a verified `captchaToken`.
 */
export function AuthCaptchaWidget({ onTokenChange, resetKey = 0 }: AuthCaptchaWidgetProps) {
  const { provider, siteKey } = getCaptchaConfig()
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenChangeRef = useRef(onTokenChange)
  onTokenChangeRef.current = onTokenChange

  useEffect(() => {
    if (!siteKey || !containerRef.current || typeof window === 'undefined') return

    let active = true
    const container = containerRef.current
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    const theme = isDark ? 'dark' : 'light'

    void loadCaptchaScript(provider)
      .then(() => {
        if (!active || !container) return
        if (provider === 'turnstile' && window.turnstile) {
          widgetIdRef.current = window.turnstile.render(container, {
            sitekey: siteKey,
            theme,
            callback: token => onTokenChangeRef.current(token),
            'expired-callback': () => onTokenChangeRef.current(''),
            'error-callback': () => onTokenChangeRef.current(''),
          })
        } else if (provider === 'hcaptcha' && window.hcaptcha) {
          widgetIdRef.current = window.hcaptcha.render(container, {
            sitekey: siteKey,
            theme,
            callback: token => onTokenChangeRef.current(token),
            'expired-callback': () => onTokenChangeRef.current(''),
            'error-callback': () => onTokenChangeRef.current(''),
          })
        }
      })
      .catch(() => {
        if (active) onTokenChangeRef.current('')
      })

    return () => {
      active = false
      const widgetId = widgetIdRef.current
      widgetIdRef.current = null
      if (widgetId && provider === 'turnstile' && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch {
          // Ignore widget teardown errors
        }
      }
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [provider, siteKey])

  useEffect(() => {
    if (!siteKey || resetKey === 0) return
    onTokenChangeRef.current('')
    const widgetId = widgetIdRef.current
    if (!widgetId) return
    try {
      if (provider === 'turnstile' && window.turnstile) {
        window.turnstile.reset(widgetId)
      } else if (provider === 'hcaptcha' && window.hcaptcha) {
        window.hcaptcha.reset(widgetId)
      }
    } catch {
      // Ignore reset errors
    }
  }, [provider, resetKey, siteKey])

  if (!siteKey) return null

  return (
    <div
      className="kg-auth-captcha-wrap"
      role="group"
      aria-label="Human security verification"
      style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}
    >
      <div ref={containerRef} data-captcha-provider={provider} />
    </div>
  )
}
