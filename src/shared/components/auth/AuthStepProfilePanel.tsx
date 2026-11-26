import { useId, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../SiteIcon'
import type { AuthAgeBand } from '../../../integrations/supabase/auth-client'
import {
  AGE_BAND_OPTIONS,
  CONSUMER_ROLE_OPTIONS,
  MAJOR_CITIES,
  type ConsumerRole,
  type PartnerHandoffRole,
} from './authModalTypes'

interface AuthStepProfilePanelProps {
  email: string
  role: ConsumerRole
  fullName: string
  city: string
  phone: string
  ageBand: AuthAgeBand
  guardianEmail: string
  guardianConsentAccepted: boolean
  submitting: boolean
  onRoleChange: (role: ConsumerRole) => void
  onFullNameChange: (val: string) => void
  onCityChange: (val: string) => void
  onPhoneChange: (val: string) => void
  onAgeBandChange: (band: AuthAgeBand) => void
  onGuardianEmailChange: (val: string) => void
  onGuardianConsentChange: (checked: boolean) => void
  onBackStep: () => void
  onSubmitSignUp: (e: FormEvent) => void
  onNavigatePartner: (role: PartnerHandoffRole, e: MouseEvent<HTMLAnchorElement>) => void
}

/**
 * Step 2 (Adaptive Profile): Consumer role selection + minimal personal fields +
 * dynamic DPDP Act 2023 under-18 guardian verification prompt for youth athletes.
 */
export function AuthStepProfilePanel({
  email,
  role,
  fullName,
  city,
  phone,
  ageBand,
  guardianEmail,
  guardianConsentAccepted,
  submitting,
  onRoleChange,
  onFullNameChange,
  onCityChange,
  onPhoneChange,
  onAgeBandChange,
  onGuardianEmailChange,
  onGuardianConsentChange,
  onBackStep,
  onSubmitSignUp,
  onNavigatePartner,
}: AuthStepProfilePanelProps) {
  const nameId = useId()
  const cityId = useId()
  const phoneId = useId()
  const ageBandId = useId()
  const guardianEmailId = useId()
  const guardianConsentId = useId()

  const isMinorAthlete = role === 'athlete' && (ageBand === 'u14' || ageBand === 'u16' || ageBand === 'u18')

  return (
    <form className="kg-auth-form" onSubmit={onSubmitSignUp}>
      <div className="kg-auth-step-header">
        <span className="kg-auth-step-pill">Step 2 of 2 · Profile &amp; Safety</span>
        <button
          type="button"
          className="kg-text-link"
          onClick={onBackStep}
        >
          ← Change Email ({email})
        </button>
      </div>

      <h2 id="kg-auth-title" className="kg-auth-title">
        Personalize your KhelGrid profile
      </h2>
      <p className="kg-auth-subtitle">
        Pick how you participate in India’s grassroots sports ecosystem.
      </p>

      <div className="kg-auth-field">
        <span className="kg-auth-role-label">I AM JOINING AS:</span>
        <div className="kg-role-picker-grid">
          {CONSUMER_ROLE_OPTIONS.map(opt => (
            <button
              key={opt.role}
              type="button"
              className={`kg-role-card ${role === opt.role ? 'is-selected' : ''}`}
              onClick={() => onRoleChange(opt.role)}
            >
              <SiteIcon name={opt.icon} size={16} />
              <div className="kg-role-info">
                <strong>{opt.title}</strong>
                <span>{opt.subtitle}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="kg-auth-field">
        <label htmlFor={nameId}>Full Name *</label>
        <div className="kg-auth-input-wrap">
          <SiteIcon name="user-round" size={16} className="kg-input-icon" />
          <input
            id={nameId}
            type="text"
            required
            placeholder="e.g. Aakash Sharma"
            value={fullName}
            onChange={e => onFullNameChange(e.target.value)}
            autoComplete="name"
          />
        </div>
      </div>

      <div className="kg-auth-row">
        <div className="kg-auth-field">
          <label htmlFor={cityId}>Home City</label>
          <select
            id={cityId}
            value={city}
            onChange={e => onCityChange(e.target.value)}
          >
            {MAJOR_CITIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="kg-auth-field">
          <label htmlFor={phoneId}>Mobile / WhatsApp (Optional)</label>
          <div className="kg-auth-input-wrap">
            <SiteIcon name="phone" size={16} className="kg-input-icon" />
            <input
              id={phoneId}
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => onPhoneChange(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </div>
      </div>

      {role === 'athlete' && (
        <div className="kg-auth-dpdp-box">
          <div className="kg-auth-field">
            <label htmlFor={ageBandId}>Age Category (DPDP 2023 Youth Safety)</label>
            <select
              id={ageBandId}
              value={ageBand}
              onChange={e => onAgeBandChange(e.target.value as AuthAgeBand)}
            >
              {AGE_BAND_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {isMinorAthlete && (
            <div className="kg-auth-guardian-panel" role="region" aria-label="DPDP Under-18 Guardian Notice">
              <p className="kg-auth-guardian-note">
                <SiteIcon name="shield-check" size={14} />
                <span>
                  Under India’s <strong>DPDP Act 2023 (Section 9)</strong>, accounts for athletes under 18 require
                  parent/guardian awareness and never display public contact details.
                </span>
              </p>

              <div className="kg-auth-field">
                <label htmlFor={guardianEmailId}>Parent / Legal Guardian Email *</label>
                <div className="kg-auth-input-wrap">
                  <SiteIcon name="mail" size={15} className="kg-input-icon" />
                  <input
                    id={guardianEmailId}
                    type="email"
                    required={isMinorAthlete}
                    placeholder="parent.guardian@example.com"
                    value={guardianEmail}
                    onChange={e => onGuardianEmailChange(e.target.value)}
                  />
                </div>
              </div>

              <label htmlFor={guardianConsentId} className="kg-auth-checkbox-label">
                <input
                  id={guardianConsentId}
                  type="checkbox"
                  required={isMinorAthlete}
                  checked={guardianConsentAccepted}
                  onChange={e => onGuardianConsentChange(e.target.checked)}
                />
                <span>
                  I confirm parent/guardian consent to create this minor athlete account in compliance with KhelGrid’s Child Safeguarding &amp; DPDP privacy safeguards.
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      <button type="submit" className="kg-auth-submit-btn kg-touch-target" disabled={submitting}>
        {submitting ? 'Creating Account…' : 'Create KhelGrid Account'}
      </button>

      <p className="kg-auth-switch-note">
        Managing a facility or organization instead?{' '}
        <a
          href="/partner-signup?role=academy"
          className="kg-text-link"
          onClick={e => onNavigatePartner('academy', e)}
        >
          Open Express Partner Onboarding →
        </a>
      </p>

      <p className="kg-auth-terms-note">
        By registering, you agree to KhelGrid’s <a href="/terms">Terms of Use</a>,{' '}
        <a href="/privacy">Privacy Policy</a>, and DPDP Act 2023 safeguards.
      </p>
    </form>
  )
}
