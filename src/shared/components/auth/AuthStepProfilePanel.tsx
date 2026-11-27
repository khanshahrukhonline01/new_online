import type { FormEvent, MouseEvent } from 'react'
import type { AuthAgeBand } from '../../../integrations/supabase/auth-client'
import { SiteIcon } from '../SiteIcon'
import {
  isMinorAgeBand,
  type AuthConsumerRole,
  type AuthPartnerRole,
} from './authModalTypes'

export interface AuthStepProfilePanelProps {
  email: string
  role: AuthConsumerRole
  fullName: string
  city: string
  phone: string
  ageBand: AuthAgeBand
  guardianEmail: string
  guardianConsentAccepted: boolean
  submitting: boolean
  onRoleChange: (role: AuthConsumerRole) => void
  onFullNameChange: (value: string) => void
  onCityChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onAgeBandChange: (band: AuthAgeBand) => void
  onGuardianEmailChange: (value: string) => void
  onGuardianConsentChange: (checked: boolean) => void
  onBackStep: () => void
  onSubmitSignUp: (e: FormEvent) => void
  onNavigatePartner: (
    event: MouseEvent<HTMLAnchorElement>,
    role: AuthPartnerRole,
    mode?: 'signup' | 'login',
  ) => void
}

const ROLE_OPTIONS: ReadonlyArray<{ id: AuthConsumerRole; label: string }> = [
  { id: 'athlete', label: 'Athlete / Player' },
  { id: 'parent', label: 'Parent / Guardian' },
  { id: 'scout', label: 'Talent Scout' },
]

const AGE_BAND_OPTIONS: ReadonlyArray<{ id: AuthAgeBand; label: string }> = [
  { id: 'adult', label: '18+ Adult' },
  { id: 'u18', label: 'Under 18 (16–17)' },
  { id: 'u16', label: 'Under 16 (14–15)' },
  { id: 'u14', label: 'Under 14' },
]

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
  const requiresGuardian = role === 'athlete' && isMinorAgeBand(ageBand)

  return (
    <form className="kg-auth-form" onSubmit={onSubmitSignUp}>
      <p className="kg-auth-step-badge">Step 2 of 2 · Profile &amp; Safety</p>
      <h2 id="kg-auth-title" className="kg-auth-title">
        Complete your sports profile
      </h2>
      <p className="kg-auth-subtitle">Account: {email}</p>

      <div className="kg-auth-field">
        <label>Account Role</label>
        <div className="kg-auth-role-grid" role="radiogroup" aria-label="Account role">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={role === opt.id}
              className={`kg-auth-role-chip ${role === opt.id ? 'is-selected' : ''}`}
              onClick={() => onRoleChange(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="kg-auth-field">
        <label htmlFor="kg-auth-fullname">Full Name *</label>
        <input
          id="kg-auth-fullname"
          type="text"
          placeholder="e.g. Aarav Sharma"
          value={fullName}
          onChange={e => onFullNameChange(e.target.value)}
          required
        />
      </div>

      <div className="kg-auth-two-col">
        <div className="kg-auth-field">
          <label htmlFor="kg-auth-city">City</label>
          <input
            id="kg-auth-city"
            type="text"
            placeholder="e.g. Bengaluru"
            value={city}
            onChange={e => onCityChange(e.target.value)}
          />
        </div>
        <div className="kg-auth-field">
          <label htmlFor="kg-auth-phone">Phone (Optional)</label>
          <input
            id="kg-auth-phone"
            type="tel"
            placeholder="+91 98XXXXXXXX"
            value={phone}
            onChange={e => onPhoneChange(e.target.value)}
          />
        </div>
      </div>

      {role === 'athlete' && (
        <div className="kg-auth-field">
          <label htmlFor="kg-auth-ageband">Age Category (DPDP Act 2023 Safety)</label>
          <select
            id="kg-auth-ageband"
            value={ageBand}
            onChange={e => onAgeBandChange(e.target.value as AuthAgeBand)}
          >
            {AGE_BAND_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {requiresGuardian && (
        <div className="kg-auth-dpdp-box" role="region" aria-label="DPDP Under-18 Guardian Notice">
          <strong>DPDP Under-18 Guardian Notice</strong>
          <p>
            Under India&apos;s DPDP Act 2023 (Section 9), verifiable parental or legal guardian consent is required for
            athletes under 18 years of age.
          </p>
          <div className="kg-auth-field">
            <label htmlFor="kg-auth-guardian-email">Parent / Legal Guardian Email *</label>
            <input
              id="kg-auth-guardian-email"
              type="email"
              placeholder="parent@example.com"
              value={guardianEmail}
              onChange={e => onGuardianEmailChange(e.target.value)}
              required
            />
          </div>
          <label className="kg-auth-checkbox-row">
            <input
              type="checkbox"
              checked={guardianConsentAccepted}
              onChange={e => onGuardianConsentChange(e.target.checked)}
              required
            />
            <span>I confirm my parent or legal guardian approves this KhelGrid athlete profile.</span>
          </label>
        </div>
      )}

      <div className="kg-auth-actions-row">
        <button type="button" className="kg-auth-secondary-btn" onClick={onBackStep}>
          <SiteIcon name="arrow-left" size={14} />
          <span>Back</span>
        </button>
        <button type="submit" className="kg-auth-submit-btn" disabled={submitting}>
          {submitting ? 'Creating Account…' : 'Create KhelGrid Account'}
        </button>
      </div>

      <div className="kg-auth-footer-links">
        <a
          href="/partner-signup?role=academy&mode=signup"
          onClick={e => onNavigatePartner(e, 'academy', 'signup')}
        >
          Setting up an academy, venue, or coach hub instead?
        </a>
      </div>
    </form>
  )
}
