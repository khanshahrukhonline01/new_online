import { useState, useEffect, useId, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import {
  type UserRole,
  type UserConsentPreferences,
  type UserConsentData,
  type UserSportsPassData,
  USER_CONSENT_STORAGE_KEY,
  CURRENT_CONSENT_VERSION,
  USER_SPORTS_PASS_STORAGE_KEY,
  SPORTS_PASS_ROLES,
  SPORTS_PASS_DISCIPLINES,
  SPORTS_PASS_CITIES,
} from './userConsentTypes'
import './UserConsentModal.css'

export {
  USER_CONSENT_STORAGE_KEY,
  CURRENT_CONSENT_VERSION,
  USER_SPORTS_PASS_STORAGE_KEY,
  SPORTS_PASS_ROLES,
  SPORTS_PASS_DISCIPLINES,
  SPORTS_PASS_CITIES,
}
export type { UserRole, UserConsentPreferences, UserConsentData, UserSportsPassData }

export interface UserConsentModalProps {
  isOpen?: boolean
  onClose?: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  forceOpen?: boolean
  initialTab?: 'sports_pass' | 'rules_privacy'
}

export default function UserConsentModal({
  isOpen: controlledIsOpen,
  onClose,
  onNavigate,
  forceOpen = false,
  initialTab = 'sports_pass',
}: UserConsentModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'sports_pass' | 'rules_privacy'>(initialTab)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [locationDiscovery, setLocationDiscovery] = useState(true)
  const [realtimeAlerts, setRealtimeAlerts] = useState(true)
  const [hasSavedToast, setHasSavedToast] = useState(false)

  // Sports Pass state
  const [selectedRole, setSelectedRole] = useState<UserRole>('athlete')
  const [selectedSports, setSelectedSports] = useState<string[]>(['cricket', 'football'])
  const [selectedCity, setSelectedCity] = useState<string>('Delhi NCR')

  const locationCheckboxId = useId()
  const alertsCheckboxId = useId()

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Determine whether modal is shown and load existing preferences
  useEffect(() => {
    if (forceOpen || controlledIsOpen === true) {
      setInternalOpen(true)
      return
    }

    if (typeof window === 'undefined') return

    try {
      // Check stored sports pass
      const storedPass = localStorage.getItem(USER_SPORTS_PASS_STORAGE_KEY)
      if (storedPass) {
        const pass = JSON.parse(storedPass) as UserSportsPassData
        if (pass.role) setSelectedRole(pass.role)
        if (pass.sports && pass.sports.length > 0) setSelectedSports(pass.sports)
        if (pass.city) setSelectedCity(pass.city)
      }

      const stored = localStorage.getItem(USER_CONSENT_STORAGE_KEY)
      if (!stored) {
        // First-time visitor: reveal after a calm 700ms delay
        const timer = setTimeout(() => {
          setInternalOpen(true)
        }, 700)
        return () => clearTimeout(timer)
      } else {
        const parsed = JSON.parse(stored) as UserConsentData
        if (parsed.version !== CURRENT_CONSENT_VERSION) {
          // Version updated
          setInternalOpen(true)
        } else if (parsed.preferences) {
          setLocationDiscovery(parsed.preferences.locationDiscovery ?? true)
          setRealtimeAlerts(parsed.preferences.realtimeAlerts ?? true)
        }
      }
    } catch {
      // Storage unavailable or blocked
      setInternalOpen(true)
    }
  }, [forceOpen, controlledIsOpen])

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    onNavigate?.(e, href)
  }

  const toggleSport = (sportId: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sportId)) {
        if (prev.length === 1) return prev // Keep at least one
        return prev.filter(s => s !== sportId)
      }
      return [...prev, sportId]
    })
  }

  const saveSportsPass = () => {
    const sportsPassData: UserSportsPassData = {
      role: selectedRole,
      sports: selectedSports,
      city: selectedCity,
      updatedAt: new Date().toISOString(),
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(USER_SPORTS_PASS_STORAGE_KEY, JSON.stringify(sportsPassData))
        window.dispatchEvent(new CustomEvent('khelgrid:sports-pass-updated', { detail: sportsPassData }))
      } catch {
        // ignore quota error
      }
    }
  }

  const saveConsent = (prefs: UserConsentPreferences) => {
    saveSportsPass()

    const data: UserConsentData = {
      accepted: true,
      version: CURRENT_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      preferences: prefs,
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(USER_CONSENT_STORAGE_KEY, JSON.stringify(data))
        window.dispatchEvent(new CustomEvent('khelgrid:consent-updated', { detail: data }))
      } catch {
        // ignore storage quota error
      }
    }

    setHasSavedToast(true)
    setTimeout(() => {
      setHasSavedToast(false)
      setInternalOpen(false)
      onClose?.()
    }, 450)
  }

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      locationDiscovery: true,
      realtimeAlerts: true,
    })
  }

  const handleSaveCustom = () => {
    saveConsent({
      essential: true,
      locationDiscovery,
      realtimeAlerts,
    })
  }

  const handleDismiss = () => {
    // If dismissed without customizing, save standard consent so the user isn't pestered on every reload
    saveConsent({
      essential: true,
      locationDiscovery,
      realtimeAlerts,
    })
  }

  if (!internalOpen && !controlledIsOpen) {
    return null
  }

  return (
    <div
      className="user-consent-backdrop"
      role="presentation"
      onClick={handleDismiss}
    >
      <div
        className="user-consent-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-consent-title"
        aria-describedby="user-consent-desc"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Tiranga and Shield Badge */}
        <div className="user-consent-header">
          <div className="user-consent-title-group">
            <div className="user-consent-badges">
              <span className="user-consent-tiranga-badge">
                <span className="tiranga-dot saffron" />
                <span className="tiranga-dot white" />
                <span className="tiranga-dot green" />
                <span>KhelGrid Standards</span>
              </span>
              <span className="user-consent-dpdp-badge">
                <SiteIcon name="shield-check" size={13} />
                <span>DPDP Act 2023 Compliant</span>
              </span>
            </div>
            <h2 id="user-consent-title" className="user-consent-title">
              Welcome to KhelGrid · Sports Opportunity Network
            </h2>
            <p id="user-consent-desc" className="user-consent-subtitle">
              Personalize your sports feed and review our community safety standards, verified trial guidelines, and data privacy policies.
            </p>
          </div>

          <button
            type="button"
            className="user-consent-close-btn"
            onClick={handleDismiss}
            aria-label="Dismiss and continue with standard settings"
            title="Accept standard settings and close"
          >
            <SiteIcon name="close" size={16} />
          </button>
        </div>

        {/* Tab Switcher: Sports Pass vs Rules & Privacy */}
        <div className="user-consent-tabs-nav" role="tablist" aria-label="Onboarding sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sports_pass'}
            className={`user-consent-tab-btn ${activeTab === 'sports_pass' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('sports_pass')}
          >
            <SiteIcon name="award" size={14} />
            <span>1. Sports Pass &amp; Interests (खेलग्रिड पास)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rules_privacy'}
            className={`user-consent-tab-btn ${activeTab === 'rules_privacy' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('rules_privacy')}
          >
            <SiteIcon name="shield-check" size={14} />
            <span>2. Rules &amp; Privacy (नियम व सुरक्षा)</span>
          </button>
        </div>

        {/* TAB 1: SPORTS PASS & INTERESTS */}
        {activeTab === 'sports_pass' && (
          <div className="sports-pass-section" role="tabpanel" aria-label="Personalize Sports Pass">
            {/* Step 1: Who are you? */}
            <div className="sports-pass-block">
              <span className="sports-pass-step-label">1. WHAT BRINGS YOU TO KHELGRID? (आपकी भूमिका)</span>
              <div className="sports-pass-roles-grid">
                {SPORTS_PASS_ROLES.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    className={`sports-pass-role-card ${selectedRole === role.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <div className="sports-pass-role-header">
                      <span className="sports-pass-role-title">{role.title}</span>
                      {selectedRole === role.id && (
                        <SiteIcon name="check-circle" size={14} className="sports-pass-check-icon" />
                      )}
                    </div>
                    <span className="sports-pass-role-vern">{role.vernacular}</span>
                    <span className="sports-pass-role-desc">{role.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Choose Your Sports */}
            <div className="sports-pass-block">
              <div className="sports-pass-block-header">
                <span className="sports-pass-step-label">2. CHOOSE YOUR SPORTS (अपने खेल चुनें)</span>
                <span className="sports-pass-count-tag">{selectedSports.length} selected</span>
              </div>
              <div className="sports-pass-sports-grid">
                {SPORTS_PASS_DISCIPLINES.map(sport => {
                  const isChecked = selectedSports.includes(sport.id)
                  return (
                    <button
                      key={sport.id}
                      type="button"
                      className={`sports-pass-sport-chip ${isChecked ? 'is-selected' : ''}`}
                      onClick={() => toggleSport(sport.id)}
                    >
                      <span className="sports-pass-emoji">{sport.emoji}</span>
                      <span className="sports-pass-sport-name">{sport.name}</span>
                      <span className="sports-pass-sport-vern">({sport.vernacular})</span>
                      {isChecked && <SiteIcon name="check" size={13} className="sports-pass-mini-check" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 3: Your Home Metro Hub */}
            <div className="sports-pass-block">
              <span className="sports-pass-step-label">3. YOUR HOME SPORTS HUB (आपका शहर)</span>
              <div className="sports-pass-cities-row">
                {SPORTS_PASS_CITIES.map(city => (
                  <button
                    key={city}
                    type="button"
                    className={`sports-pass-city-pill ${selectedCity === city ? 'is-selected' : ''}`}
                    onClick={() => setSelectedCity(city)}
                  >
                    <SiteIcon name="map-pin" size={12} />
                    <span>{city}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Strip: DPDP guarantee & direct advance */}
            <div className="sports-pass-footer-strip">
              <div className="sports-pass-privacy-callout">
                <SiteIcon name="shield-check" size={15} style={{ color: '#16a34a' }} />
                <span>
                  <strong>100% Private on Your Device.</strong> In accordance with India's DPDP Act 2023, your preferences remain strictly confidential.
                </span>
              </div>

              <div className="sports-pass-actions-row">
                <button
                  type="button"
                  className="user-consent-btn-secondary"
                  onClick={() => setActiveTab('rules_privacy')}
                >
                  <SiteIcon name="file-text" size={14} />
                  <span>Review Rules &amp; Policies →</span>
                </button>

                <button
                  type="button"
                  className="user-consent-btn-primary"
                  onClick={handleAcceptAll}
                >
                  <SiteIcon name="check-circle" size={15} />
                  <span>Accept &amp; Continue</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RULES, SAFETY & PRIVACY */}
        {activeTab === 'rules_privacy' && (
          <div className="rules-privacy-section" role="tabpanel" aria-label="Rules and Privacy">
            {/* 4 Essential Guarantees & Guidelines */}
            <div className="user-consent-rules-grid">
              <div className="user-consent-rule-item">
                <div className="user-consent-rule-icon tone-emerald">
                  <SiteIcon name="shield-check" size={18} />
                </div>
                <div className="user-consent-rule-content">
                  <strong>Child Safety &amp; Youth Protection</strong>
                  <span>
                    All youth selection trials and combines adhere to Indian child protection guidelines (POCSO &amp;
                    anti-fraud age verification).
                  </span>
                </div>
              </div>

              <div className="user-consent-rule-item">
                <div className="user-consent-rule-icon tone-blue">
                  <SiteIcon name="file-text" size={18} />
                </div>
                <div className="user-consent-rule-content">
                  <strong>Transparent Terms &amp; Privacy</strong>
                  <span>
                    We process your information in accordance with our{' '}
                    <a href="/terms" onClick={e => handleLinkClick(e, '/terms')} className="user-consent-inline-link">
                      Terms of Use
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" onClick={e => handleLinkClick(e, '/privacy')} className="user-consent-inline-link">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </div>
              </div>

              <div className="user-consent-rule-item">
                <div className="user-consent-rule-icon tone-purple">
                  <SiteIcon name="award" size={18} />
                </div>
                <div className="user-consent-rule-content">
                  <strong>IPR &amp; Authentic Telemetry</strong>
                  <span>
                    Research preprints on KhelChronicle and verified scout metrics are protected under Indian copyright law.
                    Identity abuse is prohibited.
                  </span>
                </div>
              </div>

              <div className="user-consent-rule-item">
                <div className="user-consent-rule-icon tone-amber">
                  <SiteIcon name="star" size={18} />
                </div>
                <div className="user-consent-rule-content">
                  <strong>Local Preferences &amp; 0ms Caching</strong>
                  <span>
                    Your chosen city, sport disciplines, and saved trials are stored locally on your device for instant 0ms
                    navigation.
                  </span>
                </div>
              </div>
            </div>

            {/* Granular Preference Customizer (Expandable) */}
            {showCustomizer && (
              <div className="user-consent-customizer" role="region" aria-label="Consent Preferences">
                <div className="user-consent-customizer-header">
                  <SiteIcon name="sliders" size={15} />
                  <span>Customize Device Preferences</span>
                </div>

                <div className="user-consent-toggle-list">
                  {/* 1. Essential (Locked) */}
                  <div className="user-consent-toggle-row is-locked">
                    <div>
                      <div className="user-consent-toggle-title">
                        <span>Essential Security &amp; Offline Caching</span>
                        <span className="user-consent-pill-locked">Always Active</span>
                      </div>
                      <p className="user-consent-toggle-desc">
                        Required for basic site navigation, account sessions, trial search indexes, and security.
                      </p>
                    </div>
                    <input type="checkbox" checked disabled className="user-consent-checkbox" />
                  </div>

                  {/* 2. Location Discovery */}
                  <label htmlFor={locationCheckboxId} className="user-consent-toggle-row">
                    <div>
                      <div className="user-consent-toggle-title">
                        <span>Local City Discovery &amp; Filters</span>
                      </div>
                      <p className="user-consent-toggle-desc">
                        Remembers your selected city (e.g. Mumbai, Bengaluru) to filter trials, turfs, and pickup games in
                        place.
                      </p>
                    </div>
                    <input
                      id={locationCheckboxId}
                      type="checkbox"
                      checked={locationDiscovery}
                      onChange={e => setLocationDiscovery(e.target.checked)}
                      className="user-consent-checkbox"
                    />
                  </label>

                  {/* 3. Realtime Alerts */}
                  <label htmlFor={alertsCheckboxId} className="user-consent-toggle-row">
                    <div>
                      <div className="user-consent-toggle-title">
                        <span>Real-Time Match Scores &amp; Trial Deadlines</span>
                      </div>
                      <p className="user-consent-toggle-desc">
                        Enables cross-tab synchronization for live scores, remaining pickup game spots, and saved alerts.
                      </p>
                    </div>
                    <input
                      id={alertsCheckboxId}
                      type="checkbox"
                      checked={realtimeAlerts}
                      onChange={e => setRealtimeAlerts(e.target.checked)}
                      className="user-consent-checkbox"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Quick Links Footer */}
            <div className="user-consent-policy-bar">
              <span className="user-consent-policy-label">Quick Links:</span>
              <a href="/terms" onClick={e => handleLinkClick(e, '/terms')}>Terms</a>
              <span>·</span>
              <a href="/privacy" onClick={e => handleLinkClick(e, '/privacy')}>Privacy</a>
              <span>·</span>
              <a href="/ipr-policy" onClick={e => handleLinkClick(e, '/ipr-policy')}>IPR Policy</a>
              <span>·</span>
              <a href="/verification-policy" onClick={e => handleLinkClick(e, '/verification-policy')}>Verification</a>
              <span>·</span>
              <a href="/posh-policy" onClick={e => handleLinkClick(e, '/posh-policy')}>POSH</a>
            </div>

            {/* Action Button Row */}
            <div className="user-consent-actions">
              <button
                type="button"
                className="user-consent-btn-secondary"
                onClick={() => setShowCustomizer(prev => !prev)}
              >
                <SiteIcon name="sliders" size={14} />
                <span>{showCustomizer ? 'Hide Preferences' : 'Customize Preferences'}</span>
              </button>

              <button
                type="button"
                className="user-consent-btn-secondary"
                onClick={() => setActiveTab('sports_pass')}
              >
                <SiteIcon name="arrow-left" size={14} />
                <span>Back to Sports Pass</span>
              </button>

              {showCustomizer ? (
                <button
                  type="button"
                  className="user-consent-btn-primary"
                  onClick={handleSaveCustom}
                >
                  <SiteIcon name="check" size={14} />
                  <span>Save My Preferences</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="user-consent-btn-primary"
                  onClick={handleAcceptAll}
                >
                  <SiteIcon name="check-circle" size={15} />
                  <span>Accept &amp; Continue</span>
                </button>
              )}
            </div>
          </div>
        )}

        {hasSavedToast && (
          <div className="user-consent-toast" role="status" aria-live="polite">
            <SiteIcon name="check-circle" size={16} />
            <span>Sports Pass &amp; Preferences saved! Welcome to KhelGrid.</span>
          </div>
        )}
      </div>
    </div>
  )
}
