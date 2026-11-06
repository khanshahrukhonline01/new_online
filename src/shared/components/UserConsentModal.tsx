import { useState, useEffect, useId, type MouseEvent } from 'react'
import { SiteIcon } from './SiteIcon'
import './UserConsentModal.css'

export interface UserConsentPreferences {
  essential: boolean
  locationDiscovery: boolean
  realtimeAlerts: boolean
}

export interface UserConsentData {
  accepted: boolean
  version: string
  timestamp: string
  preferences: UserConsentPreferences
}

export const USER_CONSENT_STORAGE_KEY = 'khelgrid_user_policy_consent_v1'
export const CURRENT_CONSENT_VERSION = '2026.1'

export interface UserConsentModalProps {
  isOpen?: boolean
  onClose?: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void
  forceOpen?: boolean
}

export default function UserConsentModal({
  isOpen: controlledIsOpen,
  onClose,
  onNavigate,
  forceOpen = false,
}: UserConsentModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [locationDiscovery, setLocationDiscovery] = useState(true)
  const [realtimeAlerts, setRealtimeAlerts] = useState(true)
  const [hasSavedToast, setHasSavedToast] = useState(false)

  const locationCheckboxId = useId()
  const alertsCheckboxId = useId()

  // Determine whether modal is shown
  useEffect(() => {
    if (forceOpen || controlledIsOpen === true) {
      setInternalOpen(true)
      return
    }

    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(USER_CONSENT_STORAGE_KEY)
      if (!stored) {
        // First-time visitor: reveal after a calm 700ms delay to avoid visual jank on initial load
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

  const saveConsent = (prefs: UserConsentPreferences) => {
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
              Before exploring verified selection trials, booking turfs, or connecting with scouts, please review and
              accept our community rules, data standards, and terms of use.
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

        {hasSavedToast && (
          <div className="user-consent-toast" role="status" aria-live="polite">
            <SiteIcon name="check-circle" size={16} />
            <span>Preferences saved! Welcome to KhelGrid.</span>
          </div>
        )}
      </div>
    </div>
  )
}
