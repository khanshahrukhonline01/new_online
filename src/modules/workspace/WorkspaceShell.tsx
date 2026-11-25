/**
 * WorkspaceShell.tsx
 *
 * Unified operational shell for all KhelGrid workspace personas.
 * Renders at /workspace/:persona/:section and can host consolidated persona views.
 *
 * Shell chrome:
 *  - Persona Switcher (athlete | organization | academy | coach | turf | host | tournament | creator)
 *  - Entity / Branch Switcher (wired to TenantContext)
 *  - <= 4 KPI strip (persona-specific)
 *  - 3 primary section tabs per workspace
 */

import { useCallback, useEffect, useMemo, useState, Suspense, lazy } from 'react'
import type { MouseEvent } from 'react'
import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import type { WorkspacePersona } from '../../shared/routing'
import { TenantProvider } from '../../shared/context/TenantContext'
import { useTenant } from '../../shared/context/useTenant'
import { RequireTenantMember } from '../../shared/components/RequireTenantMember'
import { KpiStrip, type KpiItem } from '../../shared/components/ui/KpiStrip'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { PartnerVerificationStatusTracker } from '../partner/components/PartnerVerificationStatusTracker'
import { isPartnerVerificationPersona } from '../partner/partnerVerificationService'
import './WorkspaceShell.css'

interface PersonaMeta {
  label: string
  icon: 'user-round' | 'building' | 'award' | 'calendar-check' | 'map-pin' | 'shield-check' | 'target' | 'chart'
  sections: { id: string; label: string }[]
  legacyHref: string
}

const PERSONAS: Record<WorkspacePersona, PersonaMeta> = {
  athlete: {
    label: 'Athlete',
    icon: 'user-round',
    legacyHref: '/dashboard',
    sections: [
      { id: 'overview', label: 'Overview' },
      { id: 'opportunities', label: 'Opportunities' },
      { id: 'profile', label: 'Sports Profile' },
    ],
  },
  organization: {
    label: 'Organisation',
    icon: 'building',
    legacyHref: '/organizations',
    sections: [
      { id: 'overview', label: 'Overview' },
      { id: 'members', label: 'Members' },
      { id: 'branches', label: 'Branches' },
    ],
  },
  academy: {
    label: 'Academy',
    icon: 'building',
    legacyHref: '/academy-hub',
    sections: [
      { id: 'overview', label: 'Overview' },
      { id: 'batches', label: 'Batches' },
      { id: 'coaches', label: 'Coaches' },
    ],
  },
  coach: {
    label: 'Coach',
    icon: 'award',
    legacyHref: '/coach-dashboard',
    sections: [
      { id: 'overview', label: 'Overview' },
      { id: 'athletes', label: 'Athletes' },
      { id: 'credentials', label: 'Credentials' },
    ],
  },
  turf: {
    label: 'Turf',
    icon: 'calendar-check',
    legacyHref: '/turf-calendar',
    sections: [
      { id: 'calendar', label: 'Slot Calendar' },
      { id: 'utilization', label: 'Utilization' },
      { id: 'maintenance', label: 'Maintenance' },
    ],
  },
  host: {
    label: 'Host',
    icon: 'map-pin',
    legacyHref: '/host',
    sections: [
      { id: 'overview', label: 'Overview' },
      { id: 'bookings', label: 'Bookings' },
      { id: 'facilities', label: 'Facilities' },
    ],
  },
  tournament: {
    label: 'Tournament',
    icon: 'target',
    legacyHref: '/tournament-ops',
    sections: [
      { id: 'overview', label: 'Overview' },
      { id: 'registrations', label: 'Registrations' },
      { id: 'brackets', label: 'Brackets' },
    ],
  },
  creator: {
    label: 'Creator',
    icon: 'chart',
    legacyHref: '/creator',
    sections: [
      { id: 'overview', label: 'Overview' },
      { id: 'campaigns', label: 'Campaigns' },
      { id: 'analytics', label: 'Analytics' },
    ],
  },
}

// Lazy-load domain pages (matching exact export styles)
const LazyDashboard = lazy(() => import('../dashboard/UserDashboardPage'))
const LazyAcademyHub = lazy(() => import('../academies/AcademyHubPage'))
const LazyCoachDashboard = lazy(() => import('../coaches/CoachDashboardPage'))
const LazyTurfCalendar = lazy(() => import('../venues/TurfSlotCalendarPage'))
const LazyHostDashboard = lazy(() => import('../host/HostDashboardPage'))
const LazyTournamentOps = lazy(() => import('../events/TournamentOpsPage'))
const LazyOrganizations = lazy(() => import('../organizations/OrganizationsWorkspacePage'))
const LazyCreatorHub = lazy(() => import('../campaigns/CreatorHubPage').then(m => ({ default: m.CreatorHubPage })))

interface WorkspaceShellProps {
  persona: WorkspacePersona
  section: string
  authUser: AuthUserProfile | null
  onOpenAuth: (tab?: 'login' | 'signup') => void
  onNavigate: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

export default function WorkspaceShell(props: WorkspaceShellProps) {
  return (
    <TenantProvider>
      <WorkspaceShellInner {...props} />
    </TenantProvider>
  )
}

function WorkspaceShellInner({
  persona,
  section,
  authUser,
  onOpenAuth,
  onNavigate,
}: WorkspaceShellProps) {
  const { currentTenant, memberships, userRole, switchTenant } = useTenant()
  const meta = PERSONAS[persona] ?? PERSONAS.athlete
  const resolvedSection = meta.sections.find(s => s.id === section)?.id ?? meta.sections[0].id
  const [activeSectionId, setActiveSectionId] = useState(resolvedSection)

  useEffect(() => {
    setActiveSectionId(resolvedSection)
  }, [resolvedSection])

  const handlePersonaSwitch = useCallback((target: WorkspacePersona) => {
    const targetMeta = PERSONAS[target]
    onNavigate(undefined, `/workspace/${target}/${targetMeta.sections[0].id}`)
  }, [onNavigate])

  const handleSectionSwitch = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    onNavigate(undefined, `/workspace/${persona}/${sectionId}`)
  }, [persona, onNavigate])

  const kpis: KpiItem[] = useMemo(() => {
    return [
      {
        id: 'persona',
        label: 'Active Workspace',
        value: meta.label,
        sub: `Section: ${meta.sections.find(s => s.id === activeSectionId)?.label ?? activeSectionId}`,
        trend: 'up',
      },
      {
        id: 'entity',
        label: 'Organisation / Branch',
        value: currentTenant?.name || 'Personal Account',
        sub: memberships.length > 0 ? `${memberships.length} linked workspace(s)` : 'Individual role scope',
      },
      {
        id: 'role',
        label: 'Access Scope',
        value: (userRole || authUser?.role || 'guest').replace(/_/g, ' '),
        sub: authUser?.isVerified ? 'Verified identity' : 'Standard account',
      },
      {
        id: 'modules',
        label: 'Ecosystem Links',
        value: 8,
        sub: 'Consolidated partner & athlete tools',
      },
    ]
  }, [meta, activeSectionId, currentTenant?.name, memberships.length, userRole, authUser?.role, authUser?.isVerified])

  if (!authUser) {
    return (
      <section className="kg-workspace-shell kg-workspace-shell--unauthenticated content-page" aria-label="Workspace">
        <div className="kg-shell-unauth">
          <SiteIcon name="user-round" size={40} />
          <h1>Your workspace is waiting</h1>
          <p>Sign in to access your {meta.label.toLowerCase()} workspace and all KhelGrid management tools.</p>
          <div className="kg-shell-unauth-actions">
            <button type="button" className="kg-btn kg-btn-primary kg-touch-target" onClick={() => onOpenAuth('login')}>
              Sign in
            </button>
            <button type="button" className="kg-btn kg-btn-ghost kg-touch-target" onClick={() => onOpenAuth('signup')}>
              Create account
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="kg-workspace-shell" aria-label={`${meta.label} workspace`}>
      {/* ── Persona Switcher ── */}
      <nav className="kg-persona-switcher" role="tablist" aria-label="Workspace persona">
        {(Object.entries(PERSONAS) as [WorkspacePersona, PersonaMeta][]).map(([key, p]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={persona === key}
            className={`kg-persona-btn kg-touch-target${persona === key ? ' is-active' : ''}`}
            onClick={() => handlePersonaSwitch(key)}
          >
            <SiteIcon name={p.icon} size={15} />
            <span>{p.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Shell header ── */}
      <div className="kg-shell-header">
        <div className="kg-shell-identity">
          <SiteIcon name={meta.icon} size={22} />
          <div>
            <h1 className="kg-shell-title">{meta.label} Workspace</h1>
            <p className="kg-shell-sub">{authUser.fullName || authUser.email}</p>
          </div>
        </div>

        {/* Entity/Branch Switcher */}
        <div className="kg-entity-switcher">
          <label htmlFor="kg-shell-entity-select" className="skip-link">Select organisation or branch</label>
          {memberships.length > 0 ? (
            <select
              id="kg-shell-entity-select"
              className="kg-entity-btn kg-touch-target"
              value={currentTenant?.id ?? ''}
              onChange={e => {
                if (e.target.value) void switchTenant(e.target.value)
              }}
              aria-label="Entity or branch switcher"
            >
              {memberships.map(m => (
                <option key={m.tenant_id} value={m.tenant_id}>
                  {m.tenant?.name || m.tenant_id} ({m.role})
                </option>
              ))}
            </select>
          ) : (
            <a
              href="/organizations"
              onClick={e => onNavigate(e, '/organizations')}
              className="kg-entity-btn kg-touch-target"
            >
              <SiteIcon name="building" size={14} />
              <span>Personal / Setup Org</span>
            </a>
          )}
        </div>
      </div>

      {/* ── KPI Strip (max 4) ── */}
      <div className="kg-shell-kpi">
        <KpiStrip items={kpis} />
      </div>

      {/* ── Section Tabs (3 per workspace) ── */}
      <div className="kg-shell-section-tabs" role="tablist" aria-label="Workspace sections">
        {meta.sections.slice(0, 3).map(s => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={activeSectionId === s.id}
            className={`kg-section-tab kg-touch-target${activeSectionId === s.id ? ' is-active' : ''}`}
            onClick={() => handleSectionSwitch(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Partner Verification & Moderation Tracker ── */}
      {isPartnerVerificationPersona(persona) && (
        <PartnerVerificationStatusTracker
          persona={persona}
          tenant={currentTenant}
          authUser={authUser}
        />
      )}

      {/* ── Domain Content ── */}
      <div className="kg-shell-content" role="tabpanel">
        <Suspense fallback={<div className="kg-shell-loading" role="status" aria-label="Loading workspace">Loading…</div>}>
          <PersonaContent
            persona={persona}
            section={activeSectionId}
            onOpenAuth={onOpenAuth}
            onNavigate={onNavigate}
          />
        </Suspense>
      </div>
    </section>
  )
}

function PersonaContent({ persona, section, onOpenAuth, onNavigate }: {
  persona: WorkspacePersona
  section: string
  onOpenAuth: (tab?: 'login' | 'signup') => void
  onNavigate: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}) {
  const handleStrictNav = useCallback((e: MouseEvent<HTMLAnchorElement>, target: string) => {
    onNavigate(e, target)
  }, [onNavigate])

  switch (persona) {
    case 'athlete':
      return <LazyDashboard onOpenAuth={onOpenAuth} onNavigate={handleStrictNav} />
    case 'academy':
      return (
        <RequireTenantMember onNavigate={handleStrictNav}>
          <LazyAcademyHub workspaceSection={section} onNavigate={handleStrictNav} />
        </RequireTenantMember>
      )
    case 'coach':
      return <LazyCoachDashboard workspaceSection={section} onNavigate={handleStrictNav} />
    case 'turf':
      return <LazyTurfCalendar onNavigate={handleStrictNav} />
    case 'host':
      return <LazyHostDashboard onNavigate={handleStrictNav} />
    case 'tournament':
      return <LazyTournamentOps onNavigate={handleStrictNav} />
    case 'organization':
      return <LazyOrganizations onNavigate={onNavigate} />
    case 'creator':
      return <LazyCreatorHub onNavigate={onNavigate} />
    default:
      return <LazyDashboard onOpenAuth={onOpenAuth} onNavigate={handleStrictNav} />
  }
}
