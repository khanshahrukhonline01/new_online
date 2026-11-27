import type { MouseEvent } from 'react'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { KpiStrip, type KpiItem } from '../../../shared/components/ui/KpiStrip'
import { SiteIcon, type SiteIconName } from '../../../shared/components/SiteIcon'
import type { CoachWorkspaceSectionId } from '../coachDashboardTypes'
import {
  calculateCoachProfileCompleteness,
  type CoachOverviewPayload,
  type CoachProfileRecord,
} from '../coachWorkspaceClient'

export interface CoachOverviewPanelProps {
  profile: CoachProfileRecord | null
  overview: CoachOverviewPayload | null
  loading: boolean
  error: string | null
  tenantName?: string | null
  onRetry: () => void
  onSelectSection: (section: CoachWorkspaceSectionId) => void
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

interface QuickActionSpec {
  label: string
  icon: SiteIconName
  targetSection?: CoachWorkspaceSectionId
  href?: string
  note: string
}

const QUICK_ACTIONS: readonly QuickActionSpec[] = [
  { label: 'Add Athlete', icon: 'plus', targetSection: 'athletes', note: 'Consent-first athlete roster' },
  { label: 'Invite Athlete', icon: 'mail', targetSection: 'athletes', note: 'Consent-based invitation' },
  { label: 'Create Programme', icon: 'award', targetSection: 'programmes', note: 'Curricula & drill plans' },
  { label: 'Schedule Session', icon: 'calendar', targetSection: 'calendar', note: 'Calendar & conflict guard' },
  { label: 'Record Attendance', icon: 'check-circle', targetSection: 'attendance', note: 'Session roll-call' },
  { label: 'Create Assessment', icon: 'activity', targetSection: 'assessments', note: 'Khelo India & skill tests' },
  { label: 'Upload Certificate', icon: 'upload', targetSection: 'credentials', note: 'Submit accreditation proof' },
  { label: 'View Opportunities', icon: 'target', href: '/opportunities', note: 'Published trials & jobs' },
]

/** Renders the Coach Workspace Overview (Section 4) driven strictly by authorized database metrics. */
export function CoachOverviewPanel({
  profile,
  overview,
  loading,
  error,
  tenantName,
  onRetry,
  onSelectSection,
  onNavigate,
}: CoachOverviewPanelProps) {
  const stats = overview?.stats
  const completeness = profile ? calculateCoachProfileCompleteness(profile) : null

  const primaryKpis: KpiItem[] = [
    {
      id: 'athletes',
      label: 'Total / Active Athletes',
      value: stats ? `${stats.totalAthletes} / ${stats.activeAthletes}` : '0 / 0',
      sub: tenantName ? `Scoped to ${tenantName}` : 'Coach workspace',
    },
    {
      id: 'programmes-sessions',
      label: 'Active Programmes · Sessions',
      value: stats ? `${stats.activeProgrammes} · ${stats.upcomingSessions}` : '0 · 0',
      sub: `${stats?.completedSessions ?? 0} completed sessions logged`,
    },
    {
      id: 'attendance-assessments',
      label: 'Attendance · Assessments',
      value: stats?.attendanceRatePct !== null && stats?.attendanceRatePct !== undefined
        ? `${stats.attendanceRatePct}%`
        : 'No logs',
      sub: `${stats?.pendingAssessments ?? 0} pending assessments · ${stats?.pendingAthleteRequests ?? 0} requests`,
      trend: stats?.attendanceRatePct !== null && stats?.attendanceRatePct !== undefined ? 'up' : 'neutral',
    },
    {
      id: 'associations-alerts',
      label: 'Academies · Unread Alerts',
      value: stats ? `${stats.academyAssociations} · ${stats.unreadNotifications}` : '0 · 0',
      sub: 'Verified associations & inbox',
    },
  ]

  const detailStats: readonly { label: string; value: string | number; meta: string }[] = [
    { label: 'Total Athletes', value: stats?.totalAthletes ?? 0, meta: 'Authorized tenant roster' },
    { label: 'Active Athletes', value: stats?.activeAthletes ?? 0, meta: 'Currently active status' },
    { label: 'Pending Athlete Requests', value: stats?.pendingAthleteRequests ?? 0, meta: 'Awaiting review/acceptance' },
    { label: 'Active Training Programmes', value: stats?.activeProgrammes ?? 0, meta: 'Assigned tenant programmes/batches' },
    { label: 'Upcoming Training Sessions', value: stats?.upcomingSessions ?? 0, meta: 'Scheduled future sessions' },
    { label: 'Completed Sessions', value: stats?.completedSessions ?? 0, meta: 'Attendance sessions recorded (30d)' },
    { label: 'Pending Assessments', value: stats?.pendingAssessments ?? 0, meta: 'Scheduled evaluations queued' },
    {
      label: 'Attendance Overview',
      value: stats?.attendanceRatePct !== null && stats?.attendanceRatePct !== undefined
        ? `${stats.attendanceRatePct}%`
        : '—',
      meta: `${stats?.attendanceEventsCount ?? 0} roll-call entries (30d)`,
    },
    { label: 'Academy Associations', value: stats?.academyAssociations ?? 0, meta: 'Active academy/club links' },
    { label: 'Unread Notifications', value: stats?.unreadNotifications ?? 0, meta: 'Inbox unread count' },
  ]

  return (
    <div className="kg-coach-stack">
      {error && (
        <div className="kg-coach-alert is-error" role="alert">
          <div>
            <strong>Could not load live coach metrics</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="kg-coach-btn-outline" onClick={onRetry}>
            <SiteIcon name="refresh" size={14} />
            <span>Retry</span>
          </button>
        </div>
      )}

      <KpiStrip items={primaryKpis} loading={loading} />

      {/* Profile Readiness Strip */}
      {profile && completeness && (
        <section className="kg-coach-card" aria-label="Coach profile readiness">
          <div className="kg-coach-card-head">
            <div>
              <h2>Professional Profile &amp; Verification Readiness</h2>
              <p>
                Profile completion: <strong>{completeness.percent}%</strong>
                {completeness.missing.length > 0
                  ? ` · Next fields to add: ${completeness.missing.slice(0, 3).join(', ')}`
                  : ' · All core profile sections populated'}
              </p>
            </div>
            <div className="kg-coach-btn-row">
              <button
                type="button"
                className="kg-coach-btn-outline"
                onClick={() => onSelectSection('profile')}
              >
                <SiteIcon name="edit" size={14} />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                className="kg-coach-btn-primary"
                onClick={() => onSelectSection('credentials')}
              >
                <SiteIcon name="shield-check" size={14} />
                <span>Verification Status</span>
              </button>
            </div>
          </div>
          <div className="kg-coach-progress-track" aria-hidden="true">
            <div className="kg-coach-progress-fill" style={{ width: `${completeness.percent}%` }} />
          </div>
        </section>
      )}

      {/* Full 10-metric authorized breakdown */}
      <section className="kg-coach-card" aria-labelledby="kg-coach-metrics-heading">
        <div className="kg-coach-card-head">
          <div>
            <h2 id="kg-coach-metrics-heading">Authorized Database Metrics</h2>
            <p>Calculated solely from verified Supabase tenant, membership, attendance, and notification records.</p>
          </div>
        </div>
        <div className="kg-coach-stat-grid">
          {detailStats.map(item => (
            <div key={item.label} className="kg-coach-stat-tile">
              <span className="kg-coach-stat-label">{item.label}</span>
              <strong className="kg-coach-stat-val">{loading ? '…' : item.value}</strong>
              <span className="kg-coach-stat-meta">{item.meta}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="kg-coach-card" aria-labelledby="kg-coach-actions-heading">
        <div className="kg-coach-card-head">
          <div>
            <h2 id="kg-coach-actions-heading">Quick Actions</h2>
            <p>Jump directly to verified workspace flows and published platform directories.</p>
          </div>
        </div>
        <div className="kg-coach-quick-grid">
          {QUICK_ACTIONS.map(action =>
            action.href ? (
              <a
                key={action.label}
                href={action.href}
                className="kg-coach-quick-btn"
                onClick={e => onNavigate?.(e, action.href)}
              >
                <SiteIcon name={action.icon} size={16} />
                <div>
                  <strong>{action.label}</strong>
                  <span>{action.note}</span>
                </div>
              </a>
            ) : (
              <button
                key={action.label}
                type="button"
                className="kg-coach-quick-btn"
                onClick={() => action.targetSection && onSelectSection(action.targetSection)}
              >
                <SiteIcon name={action.icon} size={16} />
                <div>
                  <strong>{action.label}</strong>
                  <span>{action.note}</span>
                </div>
              </button>
            ),
          )}
        </div>
      </section>

      {/* Overview Operational Sections */}
      <div className="kg-coach-two-col">
        <section className="kg-coach-card" aria-label="Upcoming sessions and active batches">
          <div className="kg-coach-card-head">
            <h3>Upcoming Sessions &amp; Active Programmes</h3>
            <button type="button" className="kg-coach-link-btn" onClick={() => onSelectSection('calendar')}>
              Calendar →
            </button>
          </div>
          {overview && overview.recentBatches.length > 0 ? (
            <ul className="kg-coach-list">
              {overview.recentBatches.map(batch => (
                <li key={batch.id} className="kg-coach-list-item">
                  <div>
                    <strong>{batch.batch_name}</strong>
                    <span>{batch.sport} · {batch.days} · {batch.timings}</span>
                  </div>
                  <span className="kg-coach-pill is-neutral">{batch.age_group || 'Open'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<SiteIcon name="calendar" size={24} />}
              title="No scheduled sessions yet"
              description="Schedule a session in Calendar & Sessions or configure an academy batch to track upcoming workouts."
            />
          )}
        </section>

        <section className="kg-coach-card" aria-label="Pending requests and athlete activity">
          <div className="kg-coach-card-head">
            <h3>Pending Athlete Requests</h3>
            <button type="button" className="kg-coach-link-btn" onClick={() => onSelectSection('athletes')}>
              Athletes →
            </button>
          </div>
          {overview && overview.recentRequests.length > 0 ? (
            <ul className="kg-coach-list">
              {overview.recentRequests.map(req => (
                <li key={req.id} className="kg-coach-list-item">
                  <div>
                    <strong>{req.student_name}</strong>
                    <span>{req.sport} · Ref {req.enquiry_token}</span>
                  </div>
                  <span className="kg-coach-pill is-info">{req.status.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<SiteIcon name="users" size={24} />}
              title="No pending requests"
              description="Consent-gated athlete invitations and incoming athlete requests will appear here cleanly once Phase 2 is enabled."
            />
          )}
        </section>

        <section className="kg-coach-card" aria-label="Recent assessments and athlete progress">
          <div className="kg-coach-card-head">
            <h3>Recent Assessments &amp; Progress</h3>
            <button type="button" className="kg-coach-link-btn" onClick={() => onSelectSection('assessments')}>
              Assessments →
            </button>
          </div>
          <EmptyState
            icon={<SiteIcon name="award" size={24} />}
            title="No assessments recorded yet"
            description="Only coach-recorded database evaluations are shown here. Structured multi-category assessments activate in Phase 4."
          />
        </section>

        <section className="kg-coach-card" aria-label="Upcoming reminders and notifications">
          <div className="kg-coach-card-head">
            <h3>Important Notifications &amp; Reminders</h3>
            <button type="button" className="kg-coach-link-btn" onClick={() => onSelectSection('notifications')}>
              Open Inbox →
            </button>
          </div>
          {overview && overview.recentNotifications.length > 0 ? (
            <ul className="kg-coach-list">
              {overview.recentNotifications.map(item => (
                <li key={item.id} className="kg-coach-list-item">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.message}</span>
                  </div>
                  <span className={`kg-coach-pill ${item.is_read ? 'is-neutral' : 'is-emerald'}`}>
                    {item.is_read ? 'Read' : 'Unread'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<SiteIcon name="bell" size={24} />}
              title="No notifications yet"
              description="Verification decisions, athlete requests, and upcoming reminders from PostgreSQL appear here."
            />
          )}
        </section>
      </div>
    </div>
  )
}
