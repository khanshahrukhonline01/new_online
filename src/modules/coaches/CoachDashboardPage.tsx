import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { useAuth } from '../../shared/auth/useAuth'
import { useTenant } from '../../shared/context/useTenant'
import {
  COACH_WORKSPACE_NAV_ITEMS,
  resolveCoachRouteTarget,
  type CoachWorkspaceSectionId,
} from './coachDashboardTypes'
import {
  loadCoachDashboardOverview,
  loadCoachVerificationSubmissions,
  loadOrInitializeCoachProfile,
  type CoachOverviewPayload,
  type CoachProfileRecord,
  type CoachVerificationStatus,
  type CoachVerificationSubmissionRecord,
} from './coachWorkspaceClient'
import { CoachOverviewPanel } from './components/CoachOverviewPanel'
import { CoachProfileEditorPanel } from './components/CoachProfileEditorPanel'
import { CoachVerificationPanel } from './components/CoachVerificationPanel'
import {
  CoachAcademyAssociationsPanel,
  CoachAccountSettingsPanel,
  CoachNotificationsPanel,
  CoachPhaseRoadmapView,
} from './components/CoachSectionViews'
import './CoachDashboardPage.css'

export interface CoachDashboardPageProps {
  workspaceSection?: string
  currentPath?: string
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

const VERIF_BADGE_MAP: Record<CoachVerificationStatus, { label: string; className: string }> = {
  verified: { label: 'KhelGrid Verified Coach', className: 'is-verified' },
  pending: { label: 'Verification Pending Review', className: 'is-pending' },
  under_review: { label: 'Under Moderation Review', className: 'is-pending' },
  rejected: { label: 'Verification Rejected', className: 'is-danger' },
  suspended: { label: 'Verification Suspended', className: 'is-danger' },
  unverified: { label: 'Unverified Profile', className: 'is-neutral' },
}

const NAV_GROUPS: readonly { id: 'foundation' | 'coaching' | 'network' | 'trust'; title: string }[] = [
  { id: 'foundation', title: 'Workspace Foundation' },
  { id: 'coaching', title: 'Coaching Operations' },
  { id: 'network', title: 'Associations & Network' },
  { id: 'trust', title: 'Reputation, Docs & Account' },
]

/**
 * Authenticated, Multi-Tenant Coach Workspace (Phase 1 Foundation).
 * Fail-closed against anonymous visitors; binds all profile, verification,
 * and overview metrics strictly to Supabase auth + TenantContext.
 */
export default function CoachDashboardPage({
  workspaceSection,
  currentPath,
  onNavigate,
}: CoachDashboardPageProps) {
  const { user: authUser } = useAuth()
  const {
    userId,
    isAuthenticated,
    currentTenant,
    currentMembership,
    memberships,
    isLoading: tenantLoading,
    switchTenant,
  } = useTenant()

  const effectivePath =
    currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : '')

  const routeTarget = useMemo(
    () => resolveCoachRouteTarget(effectivePath, workspaceSection),
    [effectivePath, workspaceSection],
  )

  const [activeSection, setActiveSection] = useState<CoachWorkspaceSectionId>(routeTarget.section)
  const [profile, setProfile] = useState<CoachProfileRecord | null>(null)
  const [overview, setOverview] = useState<CoachOverviewPayload | null>(null)
  const [submissions, setSubmissions] = useState<CoachVerificationSubmissionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActiveSection(routeTarget.section)
  }, [routeTarget.section])

  const loadWorkspaceData = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setLoading(false)
      setProfile(null)
      setOverview(null)
      setSubmissions([])
      return
    }

    setLoading(true)
    setError(null)

    const [profileRes, overviewRes] = await Promise.all([
      loadOrInitializeCoachProfile(currentTenant?.id),
      loadCoachDashboardOverview(currentTenant?.id),
    ])

    if (!profileRes.ok) {
      setError(profileRes.error)
    } else {
      setProfile(profileRes.data)
      setLoadingHistory(true)
      const histRes = await loadCoachVerificationSubmissions(profileRes.data.id)
      setLoadingHistory(false)
      if (histRes.ok) {
        setSubmissions(histRes.data)
      }
    }

    if (!overviewRes.ok) {
      setError(prev => prev || overviewRes.error)
    } else {
      setOverview(overviewRes.data)
    }

    setLoading(false)
  }, [isAuthenticated, userId, currentTenant?.id])

  useEffect(() => {
    if (!tenantLoading) {
      void loadWorkspaceData()
    }
  }, [tenantLoading, loadWorkspaceData])

  const handleSelectSection = useCallback(
    (nextSection: CoachWorkspaceSectionId) => {
      setActiveSection(nextSection)
      if (!onNavigate) return
      const item = COACH_WORKSPACE_NAV_ITEMS.find(n => n.id === nextSection)
      const isShellMode = effectivePath.startsWith('/workspace/coach') || Boolean(workspaceSection && !effectivePath.startsWith('/coach-dashboard'))
      if (isShellMode) {
        const tenantParam = currentTenant?.slug ? `?tenant=${encodeURIComponent(currentTenant.slug)}` : ''
        onNavigate(undefined, `/workspace/coach/${nextSection}${tenantParam}`)
      } else {
        const suffix = item?.pathSegment ? `/${item.pathSegment}` : ''
        onNavigate(undefined, `/coach-dashboard${suffix}`)
      }
    },
    [onNavigate, effectivePath, workspaceSection, currentTenant?.slug],
  )

  // Defense-in-depth fail-closed authentication state (never render sample records anonymously)
  if (!isAuthenticated || !userId) {
    return (
      <section className="kg-coach-root content-page" aria-label="Coach Workspace Authentication Required">
        <div className="kg-coach-card">
          <EmptyState
            icon={<SiteIcon name="lock" size={28} />}
            title="Sign in required for Coach Workspace"
            description="Access to coaching profiles, athlete rosters, verification requests, and workspace metrics requires an authenticated coach account."
            action={
              <div className="kg-coach-btn-row">
                <a
                  href="/partner-signup?mode=login&role=coach"
                  className="kg-coach-btn-primary"
                  onClick={e => onNavigate?.(e, '/partner-signup?mode=login&role=coach')}
                >
                  Coach Sign In
                </a>
                <a
                  href="/demo?persona=coach"
                  className="kg-coach-btn-outline"
                  onClick={e => onNavigate?.(e, '/demo?persona=coach')}
                >
                  View Read-Only Demo
                </a>
              </div>
            }
          />
        </div>
      </section>
    )
  }

  const verifMeta = VERIF_BADGE_MAP[profile?.verificationStatus || 'unverified']
  const displayName = profile?.fullName || authUser?.fullName || authUser?.email || 'Coach Workspace'
  const roleLabel = (currentMembership?.role || authUser?.role || 'coach').replace(/_/g, ' ')

  return (
    <section className="kg-coach-root content-page" aria-label="KhelGrid Coach Workspace">
      {/* Header */}
      <header className="kg-coach-header">
        <div>
          <div className="kg-coach-eyebrow-row">
            <span className="kg-coach-eyebrow">KHELGRID · COACH WORKSPACE</span>
            <span className={`kg-coach-verif-pill ${verifMeta.className}`}>
              <SiteIcon name="shield-check" size={13} />
              <span>{verifMeta.label}</span>
            </span>
          </div>
          <h1>{displayName}</h1>
          <p className="kg-coach-subtitle">
            {currentTenant ? `${currentTenant.name} · Role: ${roleLabel}` : `Role: ${roleLabel}`}
            {profile?.city ? ` · ${profile.city}${profile.state ? `, ${profile.state}` : ''}` : ''}
            {profile?.sportsSpecialization?.length ? ` · ${profile.sportsSpecialization.join(', ')}` : ''}
          </p>
        </div>

        <div className="kg-coach-btn-row">
          <a
            href="/coaches"
            className="kg-coach-btn-outline"
            onClick={e => onNavigate?.(e, '/coaches')}
          >
            <SiteIcon name="external-link" size={14} />
            <span>Public Directory</span>
          </a>
          <button
            type="button"
            className="kg-coach-btn-primary"
            onClick={() => handleSelectSection('profile')}
          >
            <SiteIcon name="user-round" size={14} />
            <span>Edit Coach Profile</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout: Navigation Rail + Active Section */}
      <div className="kg-coach-layout">
        <aside className="kg-coach-sidebar" aria-label="Coach workspace navigation">
          {NAV_GROUPS.map(group => {
            const items = COACH_WORKSPACE_NAV_ITEMS.filter(item => item.group === group.id)
            return (
              <div key={group.id} className="kg-coach-nav-group">
                <p className="kg-coach-nav-heading">{group.title}</p>
                <div className="kg-coach-nav-list" role="tablist" aria-label={group.title}>
                  {items.map(item => {
                    const selected = activeSection === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={`kg-coach-nav-item ${selected ? 'is-active' : ''}`}
                        onClick={() => handleSelectSection(item.id)}
                      >
                        <SiteIcon name={item.icon} size={15} />
                        <span className="kg-coach-nav-label">{item.label}</span>
                        {!item.phaseReady && (
                          <span className="kg-coach-phase-tag">P{item.phase}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </aside>

        <main className="kg-coach-main" role="tabpanel">
          {loading && !profile && activeSection === 'profile' ? (
            <div className="kg-coach-card" role="status">
              <p className="kg-coach-muted-note">Loading coach profile from PostgreSQL…</p>
            </div>
          ) : activeSection === 'overview' ? (
            <CoachOverviewPanel
              profile={profile}
              overview={overview}
              loading={loading}
              error={error}
              tenantName={currentTenant?.name}
              onRetry={() => void loadWorkspaceData()}
              onSelectSection={handleSelectSection}
              onNavigate={onNavigate}
            />
          ) : activeSection === 'profile' ? (
            profile ? (
              <CoachProfileEditorPanel
                key={profile.updatedAt}
                profile={profile}
                onProfileSaved={updated => {
                  setProfile(updated)
                  void loadWorkspaceData()
                }}
              />
            ) : (
              <div className="kg-coach-alert is-error" role="alert">
                <span>{error || 'Coach profile could not be loaded.'}</span>
                <button type="button" className="kg-coach-btn-outline" onClick={() => void loadWorkspaceData()}>
                  Retry
                </button>
              </div>
            )
          ) : activeSection === 'credentials' ? (
            profile ? (
              <CoachVerificationPanel
                profile={profile}
                submissions={submissions}
                loadingHistory={loadingHistory}
                onSubmitted={() => void loadWorkspaceData()}
              />
            ) : (
              <div className="kg-coach-alert is-error" role="alert">
                <span>{error || 'Verification profile could not be loaded.'}</span>
              </div>
            )
          ) : activeSection === 'academy' ? (
            <CoachAcademyAssociationsPanel
              memberships={memberships}
              currentTenantId={currentTenant?.id}
              onSwitchTenant={switchTenant}
              onNavigate={onNavigate}
            />
          ) : activeSection === 'notifications' ? (
            <CoachNotificationsPanel
              userId={userId}
              onNavigate={onNavigate}
            />
          ) : activeSection === 'settings' ? (
            <CoachAccountSettingsPanel
              profile={profile}
              onSelectSection={handleSelectSection}
              onNavigate={onNavigate}
            />
          ) : (
            <CoachPhaseRoadmapView
              section={activeSection}
              itemId={routeTarget.itemId}
              onSelectSection={handleSelectSection}
              onNavigate={onNavigate}
            />
          )}
        </main>
      </div>
    </section>
  )
}
