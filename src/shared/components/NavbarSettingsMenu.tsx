import { useState, useRef, useEffect, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import {
  usePreferences,
} from '../usePreferences'
import {
  INDIAN_SPORTS_CITIES,
  playTestAlertChime,
  type ThemeMode,
} from '../preferences'
import './NavbarSettingsMenu.css'

interface NavbarSettingsMenuProps {
  onNavigate: (e: MouseEvent<HTMLAnchorElement>, path: string) => void
  onOpenFeedback: () => void
}

export default function NavbarSettingsMenu({ onNavigate, onOpenFeedback }: NavbarSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const {
    preferences,
    updatePreferences,
    currentLanguage,
    supportedLanguages,
  } = usePreferences()

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 2400)
  }

  function handleThemeChange(theme: ThemeMode) {
    updatePreferences({ theme })
    showToast(`Theme set to ${theme.charAt(0).toUpperCase() + theme.slice(1)}`)
  }

  function handleLanguageChange(code: string, name: string, nativeName: string) {
    updatePreferences({ language: code })
    showToast(`Language set to ${name} (${nativeName})`)
  }

  function handleSoundToggle() {
    const nextState = !preferences.soundAlerts
    updatePreferences({ soundAlerts: nextState })
    if (nextState) {
      playTestAlertChime()
      showToast('Sound alerts enabled (chime preview played)')
    } else {
      showToast('Sound alerts muted')
    }
  }

  function handleCityChange(city: string) {
    updatePreferences({ preferredCity: city })
    showToast(`Preferred sports hub set to ${city}`)
  }

  function handleLinkClick(e: MouseEvent<HTMLAnchorElement>, path: string) {
    setIsOpen(false)
    onNavigate(e, path)
  }

  return (
    <div className="navbar-settings-wrapper">
      <button
        id="navbar-settings-btn"
        ref={triggerRef}
        type="button"
        className={`header-icon-button header-settings-trigger ${isOpen ? 'active' : ''}`}
        title="Settings &amp; Appearance"
        aria-label="Settings and Appearance"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
      >
        <SiteIcon name="settings" size={19} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="navbar-settings-popover"
          role="menu"
          aria-labelledby="navbar-settings-btn"
        >
          {toastMessage && (
            <div className="navbar-settings-toast" role="status" aria-live="polite">
              <SiteIcon name="check-circle" size={14} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Section 1: Appearance & Theme Switcher */}
          <div className="settings-menu-section">
            <div className="settings-section-heading">
              <span>Appearance</span>
              <span className="settings-badge-subtle">
                {preferences.theme.charAt(0).toUpperCase() + preferences.theme.slice(1)}
              </span>
            </div>
            <div
              id="navbar-settings-theme-switcher"
              className="theme-switcher-segmented"
              role="group"
              aria-label="Theme switcher"
            >
              <button
                type="button"
                className={`theme-segment-btn ${preferences.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
                aria-pressed={preferences.theme === 'light'}
                title="Light Mode"
              >
                <SiteIcon name="sun" size={15} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`theme-segment-btn ${preferences.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
                aria-pressed={preferences.theme === 'dark'}
                title="Dark Mode"
              >
                <SiteIcon name="moon" size={15} />
                <span>Dark</span>
              </button>
              <button
                type="button"
                className={`theme-segment-btn ${preferences.theme === 'system' ? 'active' : ''}`}
                onClick={() => handleThemeChange('system')}
                aria-pressed={preferences.theme === 'system'}
                title="System Default"
              >
                <SiteIcon name="monitor" size={15} />
                <span>System</span>
              </button>
            </div>
          </div>

          <div className="settings-menu-divider" />

          {/* Section 2: Language Selection */}
          <div className="settings-menu-section">
            <div className="settings-section-heading">
              <span className="flex-center-gap">
                <SiteIcon name="languages" size={14} />
                <span>Language / भाषा</span>
              </span>
              <span className="settings-badge-primary">
                {currentLanguage.flag} {currentLanguage.nativeName}
              </span>
            </div>
            <div
              className="language-grid"
              role="group"
              aria-label="Language selection"
            >
              {supportedLanguages.slice(0, 8).map(lang => {
                const isSelected = preferences.language === lang.code
                return (
                  <button
                    key={lang.code}
                    type="button"
                    className={`language-option-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleLanguageChange(lang.code, lang.name, lang.nativeName)}
                    title={`${lang.name} — ${lang.region}`}
                  >
                    <span className="lang-text">
                      <span className="lang-flag">{lang.flag}</span>
                      <span>{lang.nativeName}</span>
                    </span>
                    {isSelected && <SiteIcon name="check" size={14} className="lang-check" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="settings-menu-divider" />

          {/* Section 3: Quick Preferences (Sound & Preferred City) */}
          <div className="settings-menu-section">
            <div className="settings-section-heading">
              <span>Quick Preferences</span>
            </div>

            {/* Sound alerts toggle */}
            <div className="quick-pref-row">
              <div className="pref-info">
                <span className="pref-title">
                  <SiteIcon name={preferences.soundAlerts ? 'volume' : 'volume-x'} size={15} />
                  <span>Live Match Audio</span>
                </span>
                <span className="pref-hint">Score chimes &amp; alerts</span>
              </div>
              <div className="pref-actions-group">
                {preferences.soundAlerts && (
                  <button
                    type="button"
                    className="test-chime-btn"
                    onClick={() => {
                      playTestAlertChime()
                      showToast('Played test chime')
                    }}
                    title="Test audio chime"
                    aria-label="Test audio alert chime"
                  >
                    Test
                  </button>
                )}
                <button
                  type="button"
                  className={`pref-toggle-btn ${preferences.soundAlerts ? 'enabled' : 'disabled'}`}
                  onClick={handleSoundToggle}
                  aria-pressed={preferences.soundAlerts}
                  aria-label="Toggle live score sound alerts"
                >
                  <span className="toggle-handle" />
                </button>
              </div>
            </div>

            {/* Preferred Sports City */}
            <div className="quick-city-select-group">
              <label htmlFor="navbar-city-selector" className="pref-title">
                <SiteIcon name="map-pin" size={14} />
                <span>My Sports Hub</span>
              </label>
              <select
                id="navbar-city-selector"
                value={preferences.preferredCity}
                onChange={e => handleCityChange(e.target.value)}
                className="navbar-city-dropdown"
              >
                {INDIAN_SPORTS_CITIES.map(city => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-menu-divider" />

          {/* Section 4: Company & Network */}
          <div className="settings-menu-section">
            <div className="settings-section-heading">
              <span>Company &amp; Network</span>
            </div>
            <a
              id="navbar-careers-btn"
              href="/careers"
              onClick={e => handleLinkClick(e, '/careers')}
              className="settings-menu-link"
            >
              <span className="link-title-group">
                <SiteIcon name="briefcase" size={15} className="link-icon" />
                <span>Careers</span>
              </span>
              <span className="settings-badge-emerald">Hiring</span>
            </a>
            <a
              id="navbar-partner-btn"
              href="/partner"
              onClick={e => handleLinkClick(e, '/partner')}
              className="settings-menu-link"
            >
              <span className="link-title-group">
                <SiteIcon name="handshake" size={15} className="link-icon" />
                <span>Partner with Us</span>
              </span>
              <span className="settings-badge-primary">Academies</span>
            </a>
          </div>

          <div className="settings-menu-divider" />

          {/* Section 5: Support & All Settings Footer */}
          <div className="settings-menu-footer">
            <button
              id="navbar-feedback-btn"
              type="button"
              className="settings-footer-action"
              onClick={() => {
                setIsOpen(false)
                onOpenFeedback()
              }}
            >
              <SiteIcon name="message" size={15} />
              <span>Feedback &amp; Support</span>
            </button>
            <a
              href="/settings"
              onClick={e => handleLinkClick(e, '/settings')}
              className="settings-footer-action primary"
            >
              <SiteIcon name="settings" size={15} />
              <span>All Settings</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
