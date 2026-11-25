import {
  getSafeRedirectUrl,
  type AuthAgeBand,
  type AuthUserProfile,
  type UserRole,
} from '../../../integrations/supabase/auth-client'

export type AuthModalTab =
  | 'login'
  | 'signup'
  | 'partner'
  | 'forgot_password'
  | 'expired_link'
  | 'set_new_password'

export type OnboardingStep = 'identity' | 'profile'

export interface AuthOpenOptions {
  tab?: AuthModalTab
  intentLabel?: string
  redirectTo?: string
  prefillEmail?: string
  error?: string
  onAuthenticated?: (user: AuthUserProfile) => void
}

export type AuthOpenInput = 'login' | 'signup' | AuthOpenOptions

export interface ConsumerRoleOption {
  role: Extract<UserRole, 'athlete' | 'parent' | 'scout'>
  title: string
  subtitle: string
  icon: 'user-round' | 'users' | 'search'
}

export interface PartnerHandoffOption {
  role: 'academy' | 'coach' | 'venue' | 'tournament'
  title: string
  subtitle: string
  icon: 'building' | 'award' | 'venues' | 'sparkles'
}

export const CONSUMER_ROLE_OPTIONS: readonly ConsumerRoleOption[] = [
  {
    role: 'athlete',
    title: 'Athlete / Player',
    subtitle: 'Trials, Sports CV & verified match stats',
    icon: 'user-round',
  },
  {
    role: 'parent',
    title: 'Parent / Guardian',
    subtitle: 'Track academies, safety & trial passes',
    icon: 'users',
  },
  {
    role: 'scout',
    title: 'Talent Scout',
    subtitle: 'Evaluate normative combines & prospect CVs',
    icon: 'search',
  },
]

export const PARTNER_HANDOFF_OPTIONS: readonly PartnerHandoffOption[] = [
  {
    role: 'academy',
    title: 'Sports Academy',
    subtitle: 'Admissions, batches & fee ledger',
    icon: 'building',
  },
  {
    role: 'coach',
    title: 'Certified Coach',
    subtitle: 'Trainee roster & evaluations',
    icon: 'award',
  },
  {
    role: 'venue',
    title: 'Turf & Venue',
    subtitle: 'Hourly slots & WhatsApp vouchers',
    icon: 'venues',
  },
  {
    role: 'tournament',
    title: 'Tournament Ops',
    subtitle: 'Brackets, age audit & live scorer',
    icon: 'sparkles',
  },
]

export const AGE_BAND_OPTIONS: readonly {
  value: AuthAgeBand
  label: string
  requiresGuardianNotice: boolean
}[] = [
  { value: 'adult', label: '18+ Senior Athlete / Independent', requiresGuardianNotice: false },
  { value: 'u18', label: 'Under-18 Junior (16–17 yrs)', requiresGuardianNotice: true },
  { value: 'u16', label: 'Under-16 Youth (14–15 yrs)', requiresGuardianNotice: true },
  { value: 'u14', label: 'Under-14 Sub-Junior (<14 yrs)', requiresGuardianNotice: true },
]

export const MAJOR_CITIES: readonly string[] = [
  'Delhi NCR',
  'Bengaluru',
  'Mumbai',
  'Hyderabad',
  'Kolkata',
  'Chennai',
  'Pune',
  'Ahmedabad',
  'Chandigarh',
  'Jaipur',
  'Lucknow',
  'Bhopal',
  'Patna',
  'Dehradun',
  'Ranchi',
  'Guwahati',
  'Other',
]

/** Normalizes legacy `'login' | 'signup'` triggers or structured intent options into AuthOpenOptions. */
export function normalizeAuthOpenInput(input?: AuthOpenInput): AuthOpenOptions {
  if (!input) return { tab: 'login' }
  if (typeof input === 'string') {
    return { tab: input }
  }
  return {
    tab: input.tab || 'login',
    intentLabel: input.intentLabel,
    redirectTo: input.redirectTo ? getSafeRedirectUrl(input.redirectTo) : undefined,
    prefillEmail: input.prefillEmail,
    error: input.error,
    onAuthenticated: input.onAuthenticated,
  }
}

/**
 * Resolves post-authentication route, prioritizing explicit pending workflow `redirectTo`
 * before falling back to role-based workspace routing.
 */
export function resolvePostAuthTarget(user: AuthUserProfile, redirectTo?: string): string | null {
  if (redirectTo) {
    const safe = getSafeRedirectUrl(redirectTo, '')
    if (safe) return safe
  }

  switch (user.role) {
    case 'academy':
      return '/workspace/academy/overview'
    case 'venue_owner':
      return '/workspace/turf/calendar'
    case 'host':
      return '/workspace/host/overview'
    case 'coach':
      return '/workspace/coach/overview'
    case 'athlete':
    case 'parent':
      return '/workspace/athlete/overview'
    default:
      return null
  }
}

/** Evaluates password strength cleanly for inline security guidance. */
export function evaluatePasswordStrength(password: string): {
  label: 'Too short' | 'Fair' | 'Strong'
  score: 1 | 2 | 3
} {
  if (!password || password.length < 6) {
    return { label: 'Too short', score: 1 }
  }
  const hasMixed = /[a-z]/.test(password) && /[A-Z0-9!@#$%^&*]/.test(password)
  if (password.length >= 10 && hasMixed) {
    return { label: 'Strong', score: 3 }
  }
  return { label: 'Fair', score: 2 }
}
