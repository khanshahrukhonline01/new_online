import type { MouseEvent } from 'react'
import { SiteIcon, type SiteIconName } from '../SiteIcon'
import type { AuthPartnerRole } from './authModalTypes'

export interface AuthPartnerHandoffPanelProps {
  onSelectPartnerRole: (
    event: MouseEvent<HTMLAnchorElement>,
    role: AuthPartnerRole,
    mode?: 'signup' | 'login',
  ) => void
  onSwitchToLogin: () => void
}

const PARTNER_ROLES: ReadonlyArray<{
  role: AuthPartnerRole
  title: string
  subtitle: string
  icon: SiteIconName
}> = [
  {
    role: 'academy',
    title: 'Sports Academy',
    subtitle: 'Admissions, batches, attendance & parent passbook',
    icon: 'building',
  },
  {
    role: 'coach',
    title: 'Independent Coach',
    subtitle: 'Verified profile, schedules & athlete progress',
    icon: 'award',
  },
  {
    role: 'venue',
    title: 'Turf / Venue Owner',
    subtitle: 'Hourly court inventory, UPI settlement & gate QR',
    icon: 'map-pin',
  },
  {
    role: 'tournament',
    title: 'Trial / Tournament Organiser',
    subtitle: 'Fixtures, selection draws & live match publishing',
    icon: 'trophy',
  },
]

export function AuthPartnerHandoffPanel({
  onSelectPartnerRole,
  onSwitchToLogin,
}: AuthPartnerHandoffPanelProps) {
  return (
    <div className="kg-auth-body">
      <h2 id="kg-auth-title" className="kg-auth-title">
        Launch Your Institutional Partner Workspace
      </h2>
      <p className="kg-auth-subtitle">
        Select your organization type to provision a dedicated multi-tenant workspace with zero listing commission.
      </p>

      <div className="kg-auth-partner-grid">
        {PARTNER_ROLES.map(item => (
          <a
            key={item.role}
            href={`/partner-signup?role=${item.role}&mode=signup`}
            className="kg-auth-partner-card"
            onClick={e => onSelectPartnerRole(e, item.role, 'signup')}
          >
            <SiteIcon name={item.icon} size={18} />
            <div>
              <strong>{item.title}</strong>
              <span>{item.subtitle}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="kg-auth-footer-links">
        <button type="button" className="kg-auth-link-btn" onClick={onSwitchToLogin}>
          Already have a personal account? Sign In
        </button>
      </div>
    </div>
  )
}
