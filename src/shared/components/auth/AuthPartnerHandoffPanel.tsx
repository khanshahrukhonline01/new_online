import type { MouseEvent } from 'react'
import { SiteIcon } from '../SiteIcon'
import { PARTNER_HANDOFF_OPTIONS, type PartnerHandoffRole } from './authModalTypes'

interface AuthPartnerHandoffPanelProps {
  onSelectPartnerRole: (role: PartnerHandoffRole, e: MouseEvent<HTMLAnchorElement>, mode?: 'signup' | 'login') => void
  onSwitchToLogin: () => void
}

/**
 * Guided partner onboarding launcher directing institutional operators to /partner-signup
 * rather than duplicating multi-tenant provisioning inside the consumer AuthModal.
 */
export function AuthPartnerHandoffPanel({
  onSelectPartnerRole,
  onSwitchToLogin,
}: AuthPartnerHandoffPanelProps) {
  return (
    <div className="kg-auth-form">
      <div className="kg-auth-step-header">
        <span className="kg-auth-step-pill">Multi-Tenant SaaS Onboarding</span>
      </div>

      <h2 id="kg-auth-title" className="kg-auth-title">
        Launch Your Institutional Partner Workspace
      </h2>
      <p className="kg-auth-subtitle">
        Provision an isolated multi-tenant workspace for Academies, Certified Coaches, Turf Venues, or Tournaments with real role verification.
      </p>

      <div className="kg-role-picker-grid">
        {PARTNER_HANDOFF_OPTIONS.map(opt => (
          <a
            key={opt.role}
            href={`/partner-signup?role=${opt.role}&mode=signup`}
            className="kg-role-card is-handoff-link"
            onClick={e => onSelectPartnerRole(opt.role, e)}
          >
            <SiteIcon name={opt.icon} size={17} />
            <div className="kg-role-info">
              <strong>{opt.title}</strong>
              <span>{opt.subtitle}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="kg-auth-partner-trust-note">
        <SiteIcon name="shield-check" size={16} />
        <div>
          <strong>Single Canonical Onboarding &amp; Tenant Isolation</strong>
          Selecting a partner category launches our dedicated `/partner-signup` provisioning wizard connected directly to `/workspace`.
        </div>
      </div>

      <p className="kg-auth-switch-note">
        Already provisioned your workspace?{' '}
        <button type="button" className="kg-text-link" onClick={onSwitchToLogin}>
          Sign In here →
        </button>
      </p>
    </div>
  )
}
