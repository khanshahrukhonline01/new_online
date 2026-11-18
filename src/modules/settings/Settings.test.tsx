import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import NavbarSettingsMenu from '../../shared/components/NavbarSettingsMenu'
import SettingsPage from './SettingsPage'
import FeedbackSupportModal from '../../shared/components/FeedbackSupportModal'
import {
  DEFAULT_PREFERENCES,
  getStoredPreferences,
  savePreferences,
  resolveEffectiveTheme,
  SUPPORTED_LANGUAGES,
  INDIAN_SPORTS_CITIES,
} from '../../shared/preferences'

// In-memory localStorage mock for node test environment
const storageMock: Record<string, string> = {}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, val: string) => { storageMock[key] = String(val) },
    removeItem: (key: string) => { delete storageMock[key] },
    clear: () => {
      Object.keys(storageMock).forEach(k => delete storageMock[k])
    },
    key: () => null,
    length: 0,
  } as unknown as Storage
}

describe('Settings & Preferences System', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('provides comprehensive default preferences', () => {
    const prefs = getStoredPreferences()
    expect(prefs.theme).toBe(DEFAULT_PREFERENCES.theme)
    expect(prefs.language).toBe('en')
    expect(prefs.preferredCity).toBe('All India')
    expect(prefs.soundAlerts).toBe(true)
    expect(prefs.emailFrequency).toBe('weekly')
    expect(prefs.trialDeadlineReminders).toBe(true)
    expect(prefs.pickupGameAlerts).toBe(true)
    expect(prefs.reducedMotion).toBe(false)
    expect(prefs.compactMode).toBe(false)
    expect(prefs.favoriteSports).toContain('Football')
    expect(prefs.favoriteSports).toContain('Cricket')
    expect(prefs.profileVisibility).toBe('public')
  })

  it('persists preference updates and returns updated state', () => {
    const updated = savePreferences({
      theme: 'dark',
      language: 'hi',
      preferredCity: 'Delhi NCR',
      soundAlerts: false,
    })
    expect(updated.theme).toBe('dark')
    expect(updated.language).toBe('hi')
    expect(updated.preferredCity).toBe('Delhi NCR')
    expect(updated.soundAlerts).toBe(false)

    const reloaded = getStoredPreferences()
    expect(reloaded.theme).toBe('dark')
    expect(reloaded.language).toBe('hi')
    expect(reloaded.preferredCity).toBe('Delhi NCR')
    expect(reloaded.soundAlerts).toBe(false)
  })

  it('correctly resolves effective theme values', () => {
    expect(resolveEffectiveTheme('light')).toBe('light')
    expect(resolveEffectiveTheme('dark')).toBe('dark')
    expect(['light', 'dark']).toContain(resolveEffectiveTheme('system'))
  })

  it('includes key Indian regional languages and major sports cities', () => {
    const langCodes = SUPPORTED_LANGUAGES.map(l => l.code)
    expect(langCodes).toContain('en')
    expect(langCodes).toContain('hi')
    expect(langCodes).toContain('pa')
    expect(langCodes).toContain('bn')
    expect(langCodes).toContain('mr')
    expect(langCodes).toContain('ta')

    expect(INDIAN_SPORTS_CITIES).toContain('Delhi NCR')
    expect(INDIAN_SPORTS_CITIES).toContain('Bengaluru')
    expect(INDIAN_SPORTS_CITIES).toContain('Mumbai')
  })

  it('renders top navbar settings button with accessible attributes', () => {
    const html = renderToStaticMarkup(
      <NavbarSettingsMenu onNavigate={vi.fn()} onOpenFeedback={vi.fn()} />
    )
    expect(html).toContain('id="navbar-settings-btn"')
    expect(html).toContain('title="Settings &amp; Appearance"')
    expect(html).toContain('aria-label="Settings and Appearance"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('aria-expanded="false"')
  })

  it('renders full SettingsPage with all navigation tabs and sections', () => {
    const html = renderToStaticMarkup(
      <SettingsPage onNavigate={vi.fn()} />
    )
    expect(html).toContain('Settings &amp; Preferences')
    expect(html).toContain('APPLICATION &amp; ACCOUNT CONFIGURATION')
    expect(html).toContain('Appearance &amp; Display')
    expect(html).toContain('Sports Hub &amp; Interests')
    expect(html).toContain('Notifications &amp; Audio')
    expect(html).toContain('Account &amp; Profile')
    expect(html).toContain('Privacy &amp; Security')
    expect(html).toContain('Support &amp; Data Reset')
    expect(html).toContain('Light Mode')
    expect(html).toContain('Dark Mode')
    expect(html).toContain('System Default')
    expect(html).toContain('Application Language / भाषा')
    expect(html).toContain('Reduced Motion')
    expect(html).toContain('Compact Display Mode')
  })

  it('renders FeedbackSupportModal when opened', () => {
    const html = renderToStaticMarkup(
      <FeedbackSupportModal isOpen={true} onClose={vi.fn()} />
    )
    expect(html).toContain('Feedback &amp; Support')
    expect(html).toContain('Help us improve KhelGrid for athletes and academies across India.')
    expect(html).toContain('Suggestion')
    expect(html).toContain('Bug Report')
    expect(html).toContain('New Feature')
    expect(html).toContain('Listing Help')
    expect(html).toContain('Your Email or WhatsApp')
    expect(html).toContain('Send Message')
  })

  it('does not render FeedbackSupportModal when closed', () => {
    const html = renderToStaticMarkup(
      <FeedbackSupportModal isOpen={false} onClose={vi.fn()} />
    )
    expect(html).toBe('')
  })
})
