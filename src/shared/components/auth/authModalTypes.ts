import type { AuthAgeBand, AuthUserProfile, UserRole } from '../../../integrations/supabase/auth-client'

export type AuthModalTab =
  | 'login'
  | 'signup'
  | 'partner'
  | 'forgot_password'
  | 'expired_link'
  | 'set_new_password'

export type AuthPartnerRole = 'academy' | 'coach' | 'venue' | 'tournament'

export type AuthConsumerRole = Extract<UserRole, 'athlete' | 'parent' | 'scout'>

export type AuthOnboardingStep = 'identity' | 'profile'

export interface AuthIntentState {
  tab?: AuthModalTab
  error?: string
  prefillEmail?: string
  intentLabel?: string
  redirectTo?: string
  onAuthenticated?: (user: AuthUserProfile) => void
}

export type AuthOpenInput = AuthModalTab | AuthIntentState

export function normalizeAuthOpenInput(input?: AuthOpenInput): AuthIntentState {
  if (!input) return { tab: 'login' }
  if (typeof input === 'string') return { tab: input }
  return {
    tab: input.tab ?? 'login',
    error: input.error,
    prefillEmail: input.prefillEmail,
    intentLabel: input.intentLabel,
    redirectTo: input.redirectTo,
    onAuthenticated: input.onAuthenticated,
  }
}

export function isMinorAgeBand(ageBand: AuthAgeBand): boolean {
  return ageBand === 'u14' || ageBand === 'u16' || ageBand === 'u18'
}

export function resolvePostAuthTarget(
  user: AuthUserProfile,
  redirectTo?: string,
): string | null {
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    if (redirectTo !== '/login' && redirectTo !== '/signup' && redirectTo !== '/forgot-password') {
      return redirectTo
    }
  }
  switch (user.role) {
    case 'coach':
      return '/coach-dashboard'
    case 'academy':
      return '/academy-hub'
    case 'venue_owner':
    case 'host':
      return '/turf-calendar'
    case 'parent':
      return '/parent-portal'
    case 'scout':
      return '/scout-portal'
    default:
      return '/dashboard'
  }
}
