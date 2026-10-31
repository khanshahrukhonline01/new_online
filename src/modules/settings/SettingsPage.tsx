import { useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { usePreferences } from '../../shared/usePreferences'
import {
  INDIAN_SPORTS_CITIES,
  ALL_SPORTS_DISCIPLINES,
  SUPPORTED_LANGUAGES,
  playTestAlertChime,
  type ThemeMode,
  type EmailFrequency,
  type ProfileVisibility,
} from '../../shared/preferences'
import FeedbackSupportModal from '../../shared/components/FeedbackSupportModal'
import './SettingsPage.css'

interface SettingsPageProps {
  onNavigate: (e: MouseEvent<HTMLAnchorElement>, path: string) => void
}

type SettingsTab = 'account' | 'appearance' | 'sports' | 'notifications' | 'privacy' | 'support'

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const {
    preferences,
    updatePreferences,
    resetPreferences,
  } = usePreferences()

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2800)
  }

  function handleThemeChange(theme: ThemeMode) {
    updatePreferences({ theme })
    showToast(`Theme set to ${theme.charAt(0).toUpperCase() + theme.slice(1)} Mode`)
  }

  function handleLanguageChange(code: string) {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
    updatePreferences({ language: code })
    showToast(`Language set to ${lang?.name} (${lang?.nativeName})`)
  }

  function handleCityChange(city: string) {
    updatePreferences({ preferredCity: city })
    showToast(`Home sports hub updated to ${city}`)
  }

  function handleSportToggle(sport: string) {
    const exists = preferences.favoriteSports.includes(sport)
    const nextSports = exists
      ? preferences.favoriteSports.filter(s => s !== sport)
      : [...preferences.favoriteSports, sport]
    updatePreferences({ favoriteSports: nextSports })
    showToast(exists ? `Removed ${sport} from favorites` : `Added ${sport} to favorites`)
  }

  function handleReset() {
    if (window.confirm('Reset all settings and preferences back to application defaults?')) {
      resetPreferences()
      showToast('All settings reset to defaults')
    }
  }

  function handleClearCache() {
    try {
      sessionStorage.clear()
      showToast('Local search filters and session cache cleared')
    } catch {
      showToast('Cache cleared')
    }
  }

  return (
    <div className="settings-page-container">
      {/* Page Header */}
      <div className="settings-header">
        <div className="settings-header-icon">
          <SiteIcon name="settings" size={28} />
        </div>
        <div>
          <p className="eyebrow">APPLICATION &amp; ACCOUNT CONFIGURATION</p>
          <h1 className="settings-page-title">Settings &amp; Preferences</h1>
          <p className="settings-page-subtitle">
            Manage your user account, alert notifications, appearance, sports hub, and privacy options.
          </p>
        </div>
      </div>

      {toastMessage && (
        <div className="settings-global-toast" role="status" aria-live="polite">
          <SiteIcon name="check-circle" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="settings-layout">
        {/* Navigation Sidebar */}
        <aside className="settings-nav-sidebar" aria-label="Settings navigation">
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <SiteIcon name="sun" size={17} />
            <span>Appearance &amp; Display</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'sports' ? 'active' : ''}`}
            onClick={() => setActiveTab('sports')}
          >
            <SiteIcon name="trophy" size={17} />
            <span>Sports Hub &amp; Interests</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <SiteIcon name="bell" size={17} />
            <span>Notifications &amp; Audio</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <SiteIcon name="user" size={17} />
            <span>Account &amp; Profile</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <SiteIcon name="shield-check" size={17} />
            <span>Privacy &amp; Security</span>
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            <SiteIcon name="help-circle" size={17} />
            <span>Support &amp; Data Reset</span>
          </button>
        </aside>

        {/* Content Panel */}
        <main className="settings-main-panel">
          {/* TAB 1: APPEARANCE & DISPLAY */}
          {activeTab === 'appearance' && (
            <div className="settings-card-section">
              <div className="section-title-wrap">
                <h2>Appearance &amp; Display Preferences</h2>
                <p>Customize the color theme, vernacular language, and motion accessibility of KhelGrid.</p>
              </div>

              {/* Theme Mode Tiles */}
              <div className="settings-form-row">
                <label className="settings-label">Color Theme</label>
                <div className="theme-options-grid">
                  <button
                    type="button"
                    className={`theme-tile ${preferences.theme === 'light' ? 'selected' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className="theme-preview-box light-preview">
                      <div className="preview-bar" />
                      <div className="preview-card" />
                    </div>
                    <div className="theme-tile-label">
                      <SiteIcon name="sun" size={16} />
                      <span>Light Mode</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`theme-tile ${preferences.theme === 'dark' ? 'selected' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className="theme-preview-box dark-preview">
                      <div className="preview-bar" />
                      <div className="preview-card" />
                    </div>
                    <div className="theme-tile-label">
                      <SiteIcon name="moon" size={16} />
                      <span>Dark Mode</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`theme-tile ${preferences.theme === 'system' ? 'selected' : ''}`}
                    onClick={() => handleThemeChange('system')}
                  >
                    <div className="theme-preview-box system-preview">
                      <div className="preview-bar" />
                      <div className="preview-card" />
                    </div>
                    <div className="theme-tile-label">
                      <SiteIcon name="monitor" size={16} />
                      <span>System Default</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Language Selection */}
              <div className="settings-form-row">
                <label htmlFor="settings-language-select" className="settings-label">
                  Application Language / भाषा
                </label>
                <p className="settings-hint">Select your preferred Indian regional language for navigation labels.</p>
                <select
                  id="settings-language-select"
                  className="settings-select"
                  value={preferences.language}
                  onChange={e => handleLanguageChange(e.target.value)}
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} — {lang.nativeName} ({lang.region})
                    </option>
                  ))}
                </select>
              </div>

              {/* Accessibility & Reduced Motion */}
              <div className="settings-form-row">
                <div className="settings-toggle-row">
                  <div>
                    <span className="toggle-heading">Reduced Motion</span>
                    <p className="settings-hint">Minimize non-essential animations and transitions across the app.</p>
                  </div>
                  <button
                    type="button"
                    className={`pref-toggle-btn ${preferences.reducedMotion ? 'enabled' : 'disabled'}`}
                    onClick={() => {
                      const next = !preferences.reducedMotion
                      updatePreferences({ reducedMotion: next })
                      showToast(next ? 'Reduced motion enabled' : 'Reduced motion disabled')
                    }}
                    aria-pressed={preferences.reducedMotion}
                  >
                    <span className="toggle-handle" />
                  </button>
                </div>
              </div>

              {/* Compact Mode */}
              <div className="settings-form-row">
                <div className="settings-toggle-row">
                  <div>
                    <span className="toggle-heading">Compact Display Mode</span>
                    <p className="settings-hint">Display sports facility cards and trial listings in a higher-density view.</p>
                  </div>
                  <button
                    type="button"
                    className={`pref-toggle-btn ${preferences.compactMode ? 'enabled' : 'disabled'}`}
                    onClick={() => {
                      const next = !preferences.compactMode
                      updatePreferences({ compactMode: next })
                      showToast(next ? 'Compact view enabled' : 'Comfortable view enabled')
                    }}
                    aria-pressed={preferences.compactMode}
                  >
                    <span className="toggle-handle" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPORTS HUB & INTERESTS */}
          {activeTab === 'sports' && (
            <div className="settings-card-section">
              <div className="section-title-wrap">
                <h2>Sports Hub &amp; Athletic Interests</h2>
                <p>Personalize your home turf city and favorite sports to get curated trials and matches.</p>
              </div>

              {/* Primary Sports City */}
              <div className="settings-form-row">
                <label htmlFor="settings-city-select" className="settings-label">
                  Primary Sports Hub (City)
                </label>
                <p className="settings-hint">Your homepage discovery rails will prioritize venues, pickup games, and trials in this region.</p>
                <select
                  id="settings-city-select"
                  className="settings-select"
                  value={preferences.preferredCity}
                  onChange={e => handleCityChange(e.target.value)}
                >
                  {INDIAN_SPORTS_CITIES.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Favorite Sports Disciplines */}
              <div className="settings-form-row">
                <label className="settings-label">Favorite Sports Disciplines</label>
                <p className="settings-hint">Select the sports you play or follow to prioritize live scores and combines.</p>
                <div className="sports-chips-grid">
                  {ALL_SPORTS_DISCIPLINES.map(sport => {
                    const isSelected = preferences.favoriteSports.includes(sport)
                    return (
                      <button
                        key={sport}
                        type="button"
                        className={`sport-chip-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSportToggle(sport)}
                        aria-pressed={isSelected}
                      >
                        {isSelected && <SiteIcon name="check" size={14} />}
                        <span>{sport}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS & AUDIO */}
          {activeTab === 'notifications' && (
            <div className="settings-card-section">
              <div className="section-title-wrap">
                <h2>Notifications &amp; Real-time Audio</h2>
                <p>Control audio chimes for live scores, email summaries, and trial registration reminders.</p>
              </div>

              {/* Live Match Audio Alerts */}
              <div className="settings-form-row">
                <div className="settings-toggle-row">
                  <div>
                    <span className="toggle-heading">Live Match Score Chimes</span>
                    <p className="settings-hint">Play an athletic sound chime whenever a wicket falls, goal is scored, or match point occurs.</p>
                  </div>
                  <div className="toggle-with-test">
                    {preferences.soundAlerts && (
                      <button
                        type="button"
                        className="test-chime-action"
                        onClick={() => {
                          playTestAlertChime()
                          showToast('Played live match alert chime preview')
                        }}
                      >
                        <SiteIcon name="volume" size={14} />
                        <span>Preview Chime</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className={`pref-toggle-btn ${preferences.soundAlerts ? 'enabled' : 'disabled'}`}
                      onClick={() => {
                        const next = !preferences.soundAlerts
                        updatePreferences({ soundAlerts: next })
                        if (next) playTestAlertChime()
                        showToast(next ? 'Live match audio enabled' : 'Live match audio muted')
                      }}
                      aria-pressed={preferences.soundAlerts}
                    >
                      <span className="toggle-handle" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Trial Deadline Reminders */}
              <div className="settings-form-row">
                <div className="settings-toggle-row">
                  <div>
                    <span className="toggle-heading">Selection Trial Deadline Reminders</span>
                    <p className="settings-hint">Receive high-priority alerts when trial registrations in your sport close within 24 hours.</p>
                  </div>
                  <button
                    type="button"
                    className={`pref-toggle-btn ${preferences.trialDeadlineReminders ? 'enabled' : 'disabled'}`}
                    onClick={() => {
                      const next = !preferences.trialDeadlineReminders
                      updatePreferences({ trialDeadlineReminders: next })
                      showToast(next ? 'Trial deadline alerts enabled' : 'Trial deadline alerts disabled')
                    }}
                    aria-pressed={preferences.trialDeadlineReminders}
                  >
                    <span className="toggle-handle" />
                  </button>
                </div>
              </div>

              {/* Pickup Game Alerts */}
              <div className="settings-form-row">
                <div className="settings-toggle-row">
                  <div>
                    <span className="toggle-heading">Community Pickup Game Invitations</span>
                    <p className="settings-hint">Get notified when a nearby sports turf needs players to complete a team roster.</p>
                  </div>
                  <button
                    type="button"
                    className={`pref-toggle-btn ${preferences.pickupGameAlerts ? 'enabled' : 'disabled'}`}
                    onClick={() => {
                      const next = !preferences.pickupGameAlerts
                      updatePreferences({ pickupGameAlerts: next })
                      showToast(next ? 'Pickup game alerts enabled' : 'Pickup game alerts disabled')
                    }}
                    aria-pressed={preferences.pickupGameAlerts}
                  >
                    <span className="toggle-handle" />
                  </button>
                </div>
              </div>

              {/* Email Summary Frequency */}
              <div className="settings-form-row">
                <label htmlFor="settings-email-freq" className="settings-label">
                  Email Opportunity Digest Frequency
                </label>
                <select
                  id="settings-email-freq"
                  className="settings-select"
                  value={preferences.emailFrequency}
                  onChange={e => {
                    const freq = e.target.value as EmailFrequency
                    updatePreferences({ emailFrequency: freq })
                    showToast(`Email digest frequency updated to ${freq}`)
                  }}
                >
                  <option value="daily">Daily Digest (Immediate upcoming trials)</option>
                  <option value="weekly">Weekly Summary (Recommended)</option>
                  <option value="monthly">Monthly Opportunity Roundup</option>
                  <option value="never">Never (In-app only)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNT & PROFILE */}
          {activeTab === 'account' && (
            <div className="settings-card-section">
              <div className="section-title-wrap">
                <h2>Account &amp; Athlete Identity</h2>
                <p>Manage your athlete credential, digital Sports CV, and session details.</p>
              </div>

              <div className="account-status-card">
                <div className="account-avatar">
                  <SiteIcon name="user" size={32} />
                </div>
                <div className="account-details">
                  <div className="account-badge-row">
                    <span className="account-role-pill">{preferences.role}</span>
                    <span className="account-active-pill">Guest Active Session</span>
                  </div>
                  <h3>Athlete Profile</h3>
                  <p>Your local profile and community listings are saved on this browser device.</p>
                </div>
              </div>

              {/* Sports CV Wizard link */}
              <div className="settings-form-row">
                <div className="sports-cv-prompt-card">
                  <div>
                    <h4>Digital Sports CV</h4>
                    <p>Build and update your verified sports resume with achievements, positions, and video highlights.</p>
                  </div>
                  <a
                    href="/sports-cv"
                    onClick={e => onNavigate(e, '/sports-cv')}
                    className="primary-link"
                  >
                    <span>Open Sports CV Wizard</span>
                    <SiteIcon name="arrow-right" size={16} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY & VISIBILITY */}
          {activeTab === 'privacy' && (
            <div className="settings-card-section">
              <div className="section-title-wrap">
                <h2>Privacy &amp; Profile Visibility</h2>
                <p>Control who can view your Sports CV and game contact details.</p>
              </div>

              <div className="settings-form-row">
                <label className="settings-label">Sports CV Visibility</label>
                <p className="settings-hint">Choose who can discover your athletic profile during scout searches.</p>
                <div className="privacy-options-stack">
                  {[
                    {
                      id: 'public',
                      title: 'Public Discovery (Recommended)',
                      desc: 'Visible to verified scouts, tournament coaches, and fellow athletes on KhelGrid.',
                    },
                    {
                      id: 'scouts_only',
                      title: 'Verified Scouts & Coaches Only',
                      desc: 'Only SAI, Khelo India, and federation-verified scouts can view your dossier.',
                    },
                    {
                      id: 'private',
                      title: 'Private / Hidden',
                      desc: 'Hidden from search directories. Only viewable via direct link.',
                    },
                  ].map(opt => (
                    <label key={opt.id} className="privacy-radio-tile">
                      <input
                        type="radio"
                        name="profileVisibility"
                        value={opt.id}
                        checked={preferences.profileVisibility === opt.id}
                        onChange={() => {
                          updatePreferences({ profileVisibility: opt.id as ProfileVisibility })
                          showToast(`Profile visibility set to ${opt.title}`)
                        }}
                      />
                      <div>
                        <strong>{opt.title}</strong>
                        <span>{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SUPPORT & DATA RESET */}
          {activeTab === 'support' && (
            <div className="settings-card-section">
              <div className="section-title-wrap">
                <h2>Support &amp; Data Reset</h2>
                <p>Submit feedback, review official compliance policies, or reset app settings.</p>
              </div>

              <div className="support-actions-stack">
                <div className="support-action-card">
                  <div>
                    <h4>Direct Feedback &amp; Suggestions</h4>
                    <p>Have an idea or need an opportunity verified? Message our sports operations team.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-link"
                    onClick={() => setFeedbackModalOpen(true)}
                  >
                    <SiteIcon name="message" size={16} />
                    <span>Open Feedback Form</span>
                  </button>
                </div>

                <div className="support-action-card">
                  <div>
                    <h4>Clear Search Filters &amp; Cache</h4>
                    <p>Reset cached session search results, filters, and offline storage.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-link"
                    onClick={handleClearCache}
                  >
                    <SiteIcon name="refresh" size={16} />
                    <span>Clear Cache</span>
                  </button>
                </div>

                <div className="support-action-card danger-zone">
                  <div>
                    <h4>Reset All Settings to Defaults</h4>
                    <p>Restore theme, sound, city hub, and notification preferences to initial values.</p>
                  </div>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={handleReset}
                  >
                    <SiteIcon name="trash" size={16} />
                    <span>Reset Settings</span>
                  </button>
                </div>
              </div>

              <div className="policy-quick-links">
                <h4>Legal, IPR &amp; Compliance Policies</h4>
                <div className="policy-chips-row">
                  <a href="/verification-policy" onClick={e => onNavigate(e, '/verification-policy')}>
                    Verification Policy
                  </a>
                  <a href="/ipr-policy" onClick={e => onNavigate(e, '/ipr-policy')}>
                    IPR &amp; Copyright Notice
                  </a>
                  <a href="/privacy" onClick={e => onNavigate(e, '/privacy')}>
                    Privacy Policy
                  </a>
                  <a href="/terms" onClick={e => onNavigate(e, '/terms')}>
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <FeedbackSupportModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
    </div>
  )
}
