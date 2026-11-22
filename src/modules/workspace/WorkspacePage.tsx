import type { MouseEvent } from 'react'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './WorkspacePage.css'

type WorkspacePageProps = {
  authUser: AuthUserProfile | null
  onOpenAuth: (tab: 'login' | 'signup') => void
  onNavigate: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

type WorkspaceLink = {
  label: string
  description: string
  href: string
  icon: 'user-round' | 'bookmark' | 'settings' | 'chart' | 'award' | 'building' | 'calendar-check' | 'shield-check'
}

export default function WorkspacePage({ authUser, onOpenAuth, onNavigate }: WorkspacePageProps) {
  const sharedLinks: WorkspaceLink[] = [
    { label: 'My profile', description: 'View your public KhelGrid profile.', href: '/profile', icon: 'user-round' },
    { label: 'Saved items', description: 'Return to opportunities and listings you saved.', href: '/saved', icon: 'bookmark' },
    { label: 'Account settings', description: 'Review available account preferences.', href: '/settings', icon: 'settings' },
  ]

  const roleLinks: Partial<Record<AuthUserProfile['role'], WorkspaceLink[]>> = {
    athlete: [{ label: 'Athlete dashboard', description: 'Open your existing athlete dashboard.', href: '/dashboard', icon: 'chart' }],
    parent: [{ label: 'Parent & athlete passbook', description: 'Open the existing parent and athlete area.', href: '/parent-portal', icon: 'shield-check' }],
    coach: [{ label: 'Coach operations', description: 'Open the coach tools currently available to your account.', href: '/coach-dashboard', icon: 'award' }],
    academy: [{ label: 'Academy operations', description: 'Open the academy tools currently available to your account.', href: '/academy-hub', icon: 'building' }],
    host: [{ label: 'Host workspace', description: 'Open the host tools currently available to your account.', href: '/host', icon: 'calendar-check' }],
    venue_owner: [{ label: 'Venue partner area', description: 'Open the venue partner tools currently available to your account.', href: '/host', icon: 'calendar-check' }],
  }

  const links = authUser ? [...(roleLinks[authUser.role] ?? []), ...sharedLinks] : []

  const handleLink = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    onNavigate(event, href)
  }

  return (
    <section className="content-page kg-workspace-page">
      <div className="kg-workspace-hero">
        <div className="kg-workspace-hero-copy">
          <p className="eyebrow">KHELGRID · YOUR SPORTS SPACE</p>
          <h1>{authUser ? `Welcome to your Workspace, ${authUser.fullName || 'member'}.` : 'One space for your sporting journey.'}</h1>
          <p className="page-intro">
            {authUser
              ? 'Access the KhelGrid tools available to your account from one place.'
              : 'Sign in to access your account, profile and the KhelGrid tools available to your role.'}
          </p>
          {!authUser && (
            <div className="kg-workspace-actions">
              <button type="button" className="kg-workspace-primary" onClick={() => onOpenAuth('login')}>
                <SiteIcon name="log-in" size={17} /> Sign in
              </button>
              <button type="button" className="kg-workspace-secondary" onClick={() => onOpenAuth('signup')}>
                Create an account <SiteIcon name="arrow-right" size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="kg-workspace-hero-mark" aria-hidden="true">
          <SiteIcon name="layout-dashboard" size={48} />
          <span>Discover · Play · Progress</span>
        </div>
      </div>

      {authUser ? (
        <>
          <section className="kg-workspace-account" aria-label="Signed-in account">
            <div className="kg-workspace-avatar" aria-hidden="true">{(authUser.fullName || 'K').charAt(0).toUpperCase()}</div>
            <div className="kg-workspace-account-copy">
              <strong>{authUser.fullName}</strong>
              <span>{authUser.email}</span>
              <small>Account role: {authUser.role.replaceAll('_', ' ')}</small>
            </div>
          </section>
          <div className="kg-workspace-section-heading">
            <div><p className="eyebrow">YOUR TOOLS</p><h2>Continue where you left off</h2></div>
          </div>
          <div className="kg-workspace-link-grid">
            {links.map(link => (
              <a key={link.href} className="kg-workspace-link-card" href={link.href} onClick={event => handleLink(event, link.href)}>
                <span className="kg-workspace-link-icon"><SiteIcon name={link.icon} size={20} /></span>
                <strong>{link.label}</strong>
                <span>{link.description}</span>
                <SiteIcon name="arrow-up-right" size={15} className="kg-workspace-link-arrow" />
              </a>
            ))}
          </div>
          <p className="kg-workspace-note">
            Workspace shortcuts reflect the current account role. Access to private records and actions must still be enforced by each destination and its backend permissions.
          </p>
        </>
      ) : (
        <>
          <div className="kg-workspace-section-heading">
            <div><p className="eyebrow">BUILT AROUND YOUR ROLE</p><h2>A connected sports ecosystem</h2></div>
            <p>One account can support more than one sporting role as those capabilities become available.</p>
          </div>
          <div className="kg-workspace-role-grid">
            <article><SiteIcon name="user-round" size={22} /><strong>Athletes & parents</strong><span>Profiles, saved opportunities and athlete tools.</span></article>
            <article><SiteIcon name="award" size={22} /><strong>Coaches</strong><span>Coaching presence and available coach tools.</span></article>
            <article><SiteIcon name="building" size={22} /><strong>Academies & clubs</strong><span>Organization information and relevant operations.</span></article>
            <article><SiteIcon name="map-pin" size={22} /><strong>Venue partners</strong><span>Venue information and supported partner tools.</span></article>
          </div>
          <p className="kg-workspace-note">
            Creating an account does not automatically verify a person or organisation, publish a listing, or activate bookings or payments. Features appear only when their underlying workflow is available.
          </p>
        </>
      )}
    </section>
  )
}
