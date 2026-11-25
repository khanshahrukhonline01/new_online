import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import {
  evaluatePasswordStrength,
  normalizeAuthOpenInput,
  resolvePostAuthTarget,
} from '../components/auth/authModalTypes'
import { createTestAuthUserFixture } from '../../integrations/supabase/auth-client'

function AuthConsumerProbe() {
  const { isAuthenticated, intent } = useAuth()
  return (
    <div>
      <span data-testid="auth-flag">{String(isAuthenticated)}</span>
      <span data-testid="intent-tab">{intent.tab || 'none'}</span>
    </div>
  )
}

describe('AuthContext & Intent-First Routing Helpers', () => {
  it('normalizes both legacy tab strings and structured AuthOpenOptions with safe redirect sanitization', () => {
    expect(normalizeAuthOpenInput('signup')).toEqual({ tab: 'signup' })
    expect(
      normalizeAuthOpenInput({
        tab: 'login',
        intentLabel: 'Book Kanteerava Pitch 1',
        redirectTo: '/venues/sree-kanteerava-stadium',
      })
    ).toEqual({
      tab: 'login',
      intentLabel: 'Book Kanteerava Pitch 1',
      redirectTo: '/venues/sree-kanteerava-stadium',
      prefillEmail: undefined,
      error: undefined,
      onAuthenticated: undefined,
    })

    // Rejects open-redirect protocols
    expect(
      normalizeAuthOpenInput({
        tab: 'login',
        redirectTo: 'https://evil.example.com/phish',
      }).redirectTo
    ).toBe('/')
  })

  it('prioritizes explicit pending redirectTo over generic role workspace fallback', () => {
    const academyUser = createTestAuthUserFixture({ role: 'academy' })
    expect(resolvePostAuthTarget(academyUser, '/opportunities/bengaluru-trials/apply')).toBe(
      '/opportunities/bengaluru-trials/apply'
    )
    expect(resolvePostAuthTarget(academyUser)).toBe('/workspace/academy/overview')

    const coachUser = createTestAuthUserFixture({ role: 'coach' })
    expect(resolvePostAuthTarget(coachUser)).toBe('/workspace/coach/overview')
  })

  it('scores password strength across short, fair, and strong tiers', () => {
    expect(evaluatePasswordStrength('abc')).toEqual({ label: 'Too short', score: 1 })
    expect(evaluatePasswordStrength('khelgrid')).toEqual({ label: 'Fair', score: 2 })
    expect(evaluatePasswordStrength('KhelGrid@2026')).toEqual({ label: 'Strong', score: 3 })
  })

  it('renders AuthProvider SSR context cleanly to children', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <AuthConsumerProbe />
      </AuthProvider>
    )
    expect(html).toContain('data-testid="auth-flag"')
    expect(html).toContain('login')
  })
})
