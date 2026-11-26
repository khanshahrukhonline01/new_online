import { useContext, type MouseEvent } from 'react'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import { resolveTenantWorkspacePath } from '../../integrations/supabase/tenant-client'
import { SiteIcon } from '../../shared/components/SiteIcon'
import type { AuthOpenInput } from '../../shared/components/auth/authModalTypes'
import { TenantContext } from '../../shared/context/tenantContextCore'
import './WorkspacePage.css'

type WorkspacePageProps = {
  authUser: AuthUserProfile | null
  onOpenAuth: (input?: AuthOpenInput) => void
  onNavigate: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

type WorkspaceLink = {
  label: string
  description: string
  href: string
  icon: 'user-round' | 'bookmark' | 'settings' | 'chart' | 'award' | 'building' | 'calendar-check' | 'shield-check' | 'target' | 'sparkles'
}

export default function WorkspacePage({ authUser, onOpenAuth, onNavigate }: WorkspacePageProps) {
  const tenantCtx = useContext(TenantContext)
  const memberships = tenantCtx?.memberships ?? []
  const pendingInvitations = tenantCtx?.pendingInvitations ?? []
  const currentTenantId = tenantCtx?.currentTenant?.id
  const acceptInvitation = tenantCtx?.acceptInvitation

  const sharedLinks: WorkspaceLink[] = [
    { label: 'Launch partner / org workspace', description: 'Register an academy, coach, turf venue, tournament, or club/federation.', href: '/partner-signup?mode=signup', icon: 'sparkles' },
    { label: 'My profile', description: 'View your public KhelGrid profile.', href: '/profile', icon: 'user-round' },
    { label: 'Saved items', description: 'Return to opportunities and listings you saved.', href: '/saved', icon: 'bookmark' },
    { label: 'Account settings', description: 'Review available account preferences.', href: '/settings', icon: 'settings' },
  ]

  const roleLinks: Partial<Record<AuthUserProfile['role'], WorkspaceLink[]>> = {
    athlete: [{ label: 'Athlete dashboard', description: 'Open your existing athlete dashboard.', href: '/workspace/athlete/overview', icon: 'chart' }],
    parent: [{ label: 'Parent & athlete passbook', description: 'Open attendance, fee ledger & safety passbook.', href: '/workspace/parent/attendance', icon: 'shield-check' }],
    creator: [{ label: 'Creator studio hub', description: 'Open campaigns, live stream overlays & payouts.', href: '/workspace/creator/overview', icon: 'sparkles' }],
    scout: [{ label: 'Scout portal', description: 'Open the scouting tools currently available to your account.', href: '/scout-portal', icon: 'target' }],
    coach: [{ label: 'Coach operations', description: 'Open the coach tools currently available to your account.', href: '/workspace/coach/overview', icon: 'award' }],
    academy: [{ label: 'Academy operations', description: 'Open the academy tools currently available to your account.', href: '/workspace/academy/overview', icon: 'building' }],
    tournament: [{ label: 'Tournament operations', description: 'Open fixtures, bracket audit & live scoring.', href: '/workspace/tournament/overview', icon: 'calendar-check' }],
    organization: [{ label: 'Organisation console', description: 'Open institutional governance, branches & compliance.', href: '/workspace/organization/overview', icon: 'building' }],
    host: [
      { label: 'Host workspace', description: 'Open venue host overview and payout ledger.', href: '/workspace/host/overview', icon: 'calendar-check' },
      { label: 'Turf slot calendar', description: 'Open court slots & gate check-ins.', href: '/workspace/turf/calendar', icon: 'calendar-check' },
    ],
    venue_owner: [
      { label: 'Turf slot calendar', description: 'Open hourly slots & WhatsApp vouchers.', href: '/workspace/turf/calendar', icon: 'calendar-check' },
      { label: 'Venue host overview', description: 'Open the venue partner overview.', href: '/workspace/host/overview', icon: 'building' },
    ],
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
              ? 'Access the KhelGrid tools and multi-tenant dashboards available to your account from one place.'
              : 'Sign in to access your account, profile and the KhelGrid tools available to your role.'}
          </p>
          {!authUser && (
            <div className="kg-workspace-actions">
              <button
                type="button"
                className="kg-workspace-primary"
                onClick={() =>
                  onOpenAuth({
                    tab: 'login',
                    intentLabel: 'Sign in to unlock your KhelGrid Workspace tools',
                    redirectTo: '/workspace',
                  })
                }
              >
                <SiteIcon name="user-round" size={17} /> Sign in
              </button>
              <button
                type="button"
                className="kg-workspace-secondary"
                onClick={() =>
                  onOpenAuth({
                    tab: 'signup',
                    intentLabel: 'Create a free KhelGrid account to start your sports journey',
                    redirectTo: '/workspace',
                  })
                }
              >
                Create an account <SiteIcon name="arrow-right" size={16} />
              </button>
              <a
                href="/partner-signup?mode=login"
                className="kg-workspace-secondary"
                onClick={event => handleLink(event, '/partner-signup?mode=login')}
              >
                Partner / Staff Login <SiteIcon name="building" size={16} />
              </a>
            </div>
          )}
        </div>
        <div className="kg-workspace-hero-mark" aria-hidden="true">
          <SiteIcon name="chart" size={48} />
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
              <small>Account role: {authUser.role.replace(/_/g, ' ')}</small>
            </div>
          </section>

          {memberships.length > 0 && (
            <>
              <div className="kg-workspace-section-heading">
                <div><p className="eyebrow">VERIFIED TENANT WORKSPACES</p><h2>Active Organisation Dashboards</h2></div>
              </div>
              <div className="kg-workspace-link-grid">
                {memberships.map(membership => {
                  const target = resolveTenantWorkspacePath(membership)
                  const isCurrent = membership.tenant_id === currentTenantId
                  return (
                    <a
                      key={membership.id}
                      className={`kg-workspace-link-card ${isCurrent ? 'is-active' : ''}`}
                      href={target}
                      onClick={event => handleLink(event, target)}
                    >
                      <span className="kg-workspace-link-icon"><SiteIcon name="building" size={20} /></span>
                      <strong>{membership.tenant?.name || 'Workspace'}</strong>
                      <span>
                        {(membership.tenant?.tenant_type || 'organization').replace(/_/g, ' ')} · Role: {membership.role.replace(/_/g, ' ')}
                        {isCurrent ? ' (Active)' : ''}
                      </span>
                      <SiteIcon name="arrow-up-right" size={15} className="kg-workspace-link-arrow" />
                    </a>
                  )
                })}
              </div>
            </>
          )}

          {pendingInvitations.length > 0 && acceptInvitation && (
            <>
              <div className="kg-workspace-section-heading">
                <div><p className="eyebrow">TEAM INVITATIONS</p><h2>Pending Workspace Invites</h2></div>
              </div>
              <div className="kg-workspace-link-grid">
                {pendingInvitations.map(invite => (
                  <div key={invite.id} className="kg-workspace-link-card">
                    <span className="kg-workspace-link-icon"><SiteIcon name="sparkles" size={20} /></span>
                    <strong>{invite.tenant?.name || 'Workspace'}</strong>
                    <span>Invited role: {invite.role.replace(/_/g, ' ')}</span>
                    <button
                      type="button"
                      className="kg-workspace-primary"
                      onClick={() => void acceptInvitation(invite.id)}
                    >
                      Accept invitation
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

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
