/**
 * KhelGrid Application Preferences & Settings Service
 * Handles Theme (Light/Dark/System), Vernacular Languages, Audio Alerts,
 * Preferred Sports Hub, Motion Accessibility, and User Profile Configurations.
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type EmailFrequency = 'daily' | 'weekly' | 'monthly' | 'never'
export type ProfileVisibility = 'public' | 'scouts_only' | 'private'

export interface SupportedLanguage {
  code: string
  name: string
  nativeName: string
  flag: string
  region: string
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇮🇳', region: 'Pan-India & Global' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'North & Central India' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', region: 'Punjab, Haryana, Delhi' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', region: 'West Bengal & East India' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', region: 'Maharashtra & Western India' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', region: 'Andhra Pradesh & Telangana' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'Tamil Nadu & South India' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', region: 'Gujarat' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'Karnataka' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', region: 'Kerala' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳', region: 'Odisha' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳', region: 'Assam & North East' },
]

export const INDIAN_SPORTS_CITIES = [
  'All India',
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
  'Kochi',
  'Bhubaneswar',
] as const

export const ALL_SPORTS_DISCIPLINES = [
  'Football',
  'Cricket',
  'Badminton',
  'Tennis',
  'Basketball',
  'Athletics',
  'Kabaddi',
  'Swimming',
  'Table Tennis',
  'Volleyball',
  'Hockey',
  'Boxing',
  'Wrestling',
  'Kho-Kho',
] as const

export interface UserPreferences {
  theme: ThemeMode
  language: string
  preferredCity: string
  soundAlerts: boolean
  emailFrequency: EmailFrequency
  trialDeadlineReminders: boolean
  pickupGameAlerts: boolean
  reducedMotion: boolean
  compactMode: boolean
  favoriteSports: string[]
  role: string
  profileVisibility: ProfileVisibility
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  language: 'en',
  preferredCity: 'All India',
  soundAlerts: true,
  emailFrequency: 'weekly',
  trialDeadlineReminders: true,
  pickupGameAlerts: true,
  reducedMotion: false,
  compactMode: false,
  favoriteSports: ['Football', 'Cricket', 'Badminton'],
  role: 'Athlete',
  profileVisibility: 'public',
}

const STORAGE_KEY = 'khelgrid-user-preferences'
const THEME_STORAGE_KEY = 'khelgrid-theme'
const LANG_STORAGE_KEY = 'khelgrid-lang'

export function getStoredPreferences(): UserPreferences {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const legacyTheme = (localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme')) as ThemeMode | null
    const legacyLang = localStorage.getItem(LANG_STORAGE_KEY)

    const parsed: Partial<UserPreferences> = raw ? JSON.parse(raw) : {}
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      theme: parsed.theme || legacyTheme || DEFAULT_PREFERENCES.theme,
      language: parsed.language || legacyLang || DEFAULT_PREFERENCES.language,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(updates: Partial<UserPreferences>): UserPreferences {
  const current = getStoredPreferences()
  const next: UserPreferences = { ...current, ...updates }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      if (updates.theme) {
        localStorage.setItem(THEME_STORAGE_KEY, updates.theme)
      }
      if (updates.language) {
        localStorage.setItem(LANG_STORAGE_KEY, updates.language)
      }
      applyThemeToDOM(next.theme)
      applyAccessibilityToDOM(next.reducedMotion)
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('khelgrid-preferences-change', { detail: next }))
      }
    } catch {
      // Ignore localStorage quotas / sandbox restrictions
    }
  }

  return next
}

export function resolveEffectiveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function applyThemeToDOM(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  const effective = resolveEffectiveTheme(theme)
  const root = document.documentElement

  if (effective === 'dark') {
    root.classList.remove('light')
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
    root.style.colorScheme = 'light'
  }

  // Meta theme-color for browser address bar styling
  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.setAttribute('content', effective === 'dark' ? '#0b111b' : '#ffffff')
  }
}

export function applyAccessibilityToDOM(reducedMotion: boolean): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (reducedMotion) {
    root.setAttribute('data-reduced-motion', 'true')
  } else {
    root.removeAttribute('data-reduced-motion')
  }
}

/**
 * Synthesizes an interactive chime for live wickets, goals, and selection alert tests
 */
export function playTestAlertChime(): void {
  if (typeof window === 'undefined') return
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3) // D6

    gain.gain.setValueAtTime(0.001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.2)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.45)

    setTimeout(() => {
      try {
        void ctx.close()
      } catch (closeErr) {
        void closeErr
      }
    }, 600)
  } catch (err) {
    void err
  }
}
