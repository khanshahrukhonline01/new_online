import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import type { DbTenantMembership } from '../../../integrations/supabase/tenant-client'
import {
  getUserNotifications,
  markNotificationAsRead,
  type UserDatabaseNotification,
} from '../../../integrations/supabase/public-client'
import {
  COACH_WORKSPACE_NAV_ITEMS,
  type CoachWorkspaceSectionId,
} from '../coachDashboardTypes'
import type { CoachProfileRecord } from '../coachWorkspaceClient'

const ACADEMY_ORG_TYPES = new Set([
  'academy',
  'club',
  'school',
  'college',
  'university',
  'training_org',
])

export function CoachAcademyAssociationsPanel({
  memberships,
  currentTenantId,
  onSwitchTenant,
  onNavigate,
}: {
  memberships: DbTenantMembership[]
  currentTenantId?: string | null
  onSwitchTenant: (tenantId: string) => Promise<boolean>
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}) {
  const academyLinks = memberships.filter(
    m =>
      m.status === 'active' &&
      m.tenant?.status === 'active' &&
      ACADEMY_ORG_TYPES.has(m.tenant.tenant_type),
  )

  return (
    <section className="kg-coach-card" aria-label="Academy and institutional associations">
      <div className="kg-coach-card-head">
        <div>
          <h2>Authorized Academy &amp; Institutional Associations</h2>
          <p>
            Active coaching memberships verified via PostgreSQL RLS (`tenant_memberships`). Academy coach
            access remains strictly isolated per organization without inheriting platform admin privileges.
          </p>
        </div>
        <a
          href="/partner-signup?role=coach"
          className="kg-coach-btn-outline"
          onClick={e => onNavigate?.(e, '/partner-signup?role=coach')}
        >
          Join or Register Workspace
        </a>
      </div>

      {academyLinks.length === 0 ? (
        <EmptyState
          icon={<SiteIcon name="building" size={24} />}
          title="No academy associations linked"
          description="You are currently operating in your independent coach workspace or have not accepted an academy invitation yet."
        />
      ) : (
        <ul className="kg-coach-list">
          {academyLinks.map(m => {
            const isCurrent = m.tenant_id === currentTenantId
            return (
              <li key={m.id} className="kg-coach-list-item">
                <div>
                  <strong>{m.tenant?.name || m.tenant_id}</strong>
                  <span>
                    {m.tenant?.tenant_type} · Role: {m.role.replace(/_/g, ' ')}
                    {m.tenant?.city ? ` · ${m.tenant.city}` : ''}
                  </span>
                </div>
                <div className="kg-coach-btn-row">
                  <span className={`kg-coach-pill ${isCurrent ? 'is-success' : 'is-neutral'}`}>
                    {isCurrent ? 'Active Scope' : 'Authorized'}
                  </span>
                  {!isCurrent && (
                    <button
                      type="button"
                      className="kg-coach-btn-outline"
                      onClick={() => void onSwitchTenant(m.tenant_id)}
                    >
                      Switch Scope
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function CoachNotificationsPanel({
  userId,
  onNavigate,
}: {
  userId: string
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}) {
  const [items, setItems] = useState<UserDatabaseNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInbox = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await getUserNotifications(userId)
      setItems(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadInbox()
  }, [loadInbox])

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await markNotificationAsRead(id)
      if (updated) {
        setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)))
      }
    } catch {
      // keep existing UI state on transient failure
    }
  }

  return (
    <section className="kg-coach-card" aria-label="Coach notifications inbox">
      <div className="kg-coach-card-head">
        <div>
          <h2>Notifications Inbox</h2>
          <p>Live account and moderation notifications scoped strictly to your authenticated user ID.</p>
        </div>
        <button type="button" className="kg-coach-btn-outline" onClick={() => void loadInbox()}>
          <SiteIcon name="refresh" size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="kg-coach-alert is-error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <p className="kg-coach-muted-note" role="status">Loading notifications…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<SiteIcon name="bell" size={24} />}
          title="No notifications yet"
          description="You are all caught up. Updates on credential verification, athlete requests, and sessions appear here."
        />
      ) : (
        <ul className="kg-coach-list">
          {items.map(n => (
            <li key={n.id} className="kg-coach-list-item">
              <div>
                <strong>{n.title}</strong>
                <span>{n.message}</span>
                <small className="kg-coach-muted-note">
                  {n.category} · {new Date(n.created_at).toLocaleString('en-IN')}
                </small>
              </div>
              <div className="kg-coach-btn-row">
                {n.action_url && (
                  <a
                    href={n.action_url}
                    className="kg-coach-btn-outline"
                    onClick={e => onNavigate?.(e, n.action_url || '/coach-dashboard')}
                  >
                    Open
                  </a>
                )}
                {!n.is_read ? (
                  <button
                    type="button"
                    className="kg-coach-btn-primary"
                    onClick={() => void handleMarkRead(n.id)}
                  >
                    Mark Read
                  </button>
                ) : (
                  <span className="kg-coach-pill is-neutral">Read</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function CoachAccountSettingsPanel({
  profile,
  onSelectSection,
  onNavigate,
}: {
  profile: CoachProfileRecord | null
  onSelectSection: (section: CoachWorkspaceSectionId) => void
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}) {
  return (
    <section className="kg-coach-card kg-coach-stack" aria-label="Coach workspace account settings">
      <div className="kg-coach-card-head">
        <div>
          <h2>Account, Security &amp; Privacy Settings</h2>
          <p>
            Password management, active session controls, DPDP Act 2023 data export, and account deletion workflows
            use KhelGrid&apos;s canonical account security centre.
          </p>
        </div>
        <a
          href="/settings"
          className="kg-coach-btn-primary"
          onClick={e => onNavigate?.(e, '/settings')}
        >
          <SiteIcon name="settings" size={14} />
          <span>Open Security &amp; Privacy Settings</span>
        </a>
      </div>

      <div className="kg-coach-stat-grid">
        {profile && (
          <>
            <div className="kg-coach-stat-tile">
              <span className="kg-coach-stat-label">Direct Inquiries</span>
              <strong className="kg-coach-stat-val">
                {profile.contactPreferences.allowDirectInquiries ? 'Enabled' : 'Paused'}
              </strong>
              <span className="kg-coach-stat-meta">Manage in Professional Profile</span>
            </div>
            <div className="kg-coach-stat-tile">
              <span className="kg-coach-stat-label">Online Coaching</span>
              <strong className="kg-coach-stat-val">
                {profile.onlineCoachingAvailable ? 'Available' : 'In-Person Only'}
              </strong>
              <span className="kg-coach-stat-meta">Updated on public card after verification</span>
            </div>
          </>
        )}
        <div className="kg-coach-stat-tile">
          <span className="kg-coach-stat-label">Payment Collection</span>
          <strong className="kg-coach-stat-val">Paused</strong>
          <span className="kg-coach-stat-meta">Platform checkouts &amp; payouts are disabled</span>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="kg-coach-btn-outline"
          onClick={() => onSelectSection('profile')}
        >
          Edit Contact &amp; Availability Preferences
        </button>
      </div>
    </section>
  )
}

export function CoachPhaseRoadmapView({
  section,
  itemId,
  onSelectSection,
  onNavigate,
}: {
  section: CoachWorkspaceSectionId
  itemId?: string
  onSelectSection: (section: CoachWorkspaceSectionId) => void
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}) {
  const navMeta = COACH_WORKSPACE_NAV_ITEMS.find(item => item.id === section)
  const crossLink =
    section === 'venues'
      ? { label: 'Browse Verified Venues Directory →', href: '/venues' }
      : section === 'opportunities'
        ? { label: 'Explore Published Trials & Opportunities →', href: '/opportunities' }
        : section === 'reviews'
          ? { label: 'View Public Coaches Directory →', href: '/coaches' }
          : null

  return (
    <section className="kg-coach-card kg-coach-stack" aria-label={`${navMeta?.label || section} module`}>
      <div className="kg-coach-card-head">
        <div>
          <span className="kg-coach-pill is-info">
            Scheduled for Phase {navMeta?.phase ?? 2}
          </span>
          <h2 style={{ marginTop: '8px' }}>
            {navMeta?.label || section}
            {itemId ? ` · ${itemId}` : ''}
          </h2>
          <p>{navMeta?.description}</p>
        </div>
      </div>

      <EmptyState
        icon={<SiteIcon name={navMeta?.icon || 'chart'} size={28} />}
        title="Module Foundation Registered — Implementation Pending Approval"
        description={`Phase 1 focuses exclusively on workspace routing, authentication guards, professional profile management, verification status, and authorized overview metrics. Dedicated database tables and RLS policies for ${navMeta?.label || section} are planned cleanly for Phase ${navMeta?.phase ?? 2} with zero fabricated data.`}
        action={
          <div className="kg-coach-btn-row">
            <button
              type="button"
              className="kg-coach-btn-outline"
              onClick={() => onSelectSection('overview')}
            >
              Return to Overview
            </button>
            {crossLink && (
              <a
                href={crossLink.href}
                className="kg-coach-btn-primary"
                onClick={e => onNavigate?.(e, crossLink.href)}
              >
                {crossLink.label}
              </a>
            )}
          </div>
        }
      />
    </section>
  )
}
