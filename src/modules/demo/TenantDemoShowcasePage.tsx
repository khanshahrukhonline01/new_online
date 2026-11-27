import { useState, type MouseEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import type { AuthOpenInput } from '../../shared/components/auth/authModalTypes'
import {
  DEMO_DASHBOARDS,
  type DemoDashboardId,
} from './tenantDemoData'
import './TenantDemoShowcasePage.css'

export interface TenantDemoShowcasePageProps {
  initialDashboard?: DemoDashboardId
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
  onOpenAuth?: (input?: AuthOpenInput) => void
}

type ShowcaseViewTab = 'overview' | 'modules' | 'permissions'

/**
 * Interactive, explicitly read-only sample dashboard showcase letting prospective
 * tenants and athletes inspect every role workspace without bypassing authentication
 * or exposing private database records.
 */
export default function TenantDemoShowcasePage({
  initialDashboard = 'academy',
  onNavigate,
  onOpenAuth,
}: TenantDemoShowcasePageProps) {
  const validInitial = DEMO_DASHBOARDS.some(d => d.id === initialDashboard)
    ? initialDashboard
    : 'academy'
  const [activeId, setActiveId] = useState<DemoDashboardId>(validInitial)
  const [viewTab, setViewTab] = useState<ShowcaseViewTab>('overview')
  const [filterQuery, setFilterQuery] = useState('')

  const activeSpec = DEMO_DASHBOARDS.find(d => d.id === activeId) ?? DEMO_DASHBOARDS[0]

  const filteredRecords = activeSpec.sampleRecords.filter(rec => {
    const q = filterQuery.trim().toLowerCase()
    if (!q) return true
    return (
      rec.title.toLowerCase().includes(q) ||
      rec.meta.toLowerCase().includes(q) ||
      rec.status.toLowerCase().includes(q)
    )
  })

  const launchHref =
    activeSpec.category === 'partner' && activeSpec.partnerRoleParam
      ? `/partner-signup?role=${activeSpec.partnerRoleParam}&mode=signup`
      : '/signup'

  const loginHref =
    activeSpec.category === 'partner' && activeSpec.partnerRoleParam
      ? `/partner-signup?role=${activeSpec.partnerRoleParam}&mode=login`
      : '/login'

  const handleLinkNav = (event: MouseEvent<HTMLAnchorElement>, target: string) => {
    onNavigate?.(event, target)
  }

  return (
    <section className="content-page kg-demo-page" aria-labelledby="kg-demo-heading">
      <header className="kg-demo-hero">
        <span className="kg-demo-banner-pill">
          <SiteIcon name="sparkles" size={14} />
          Interactive Product Tour · Sample Illustrative Data Only (Read-Only)
        </span>
        <h1 id="kg-demo-heading">Explore Every KhelGrid Dashboard Before You Sign Up</h1>
        <p className="page-intro">
          Preview the layout, workflows, and role permissions across all 8 core dashboards plus Scouting. This walkthrough uses sample illustrative records — launching a live workspace requires an authenticated account and tenant verification.
        </p>

        <div className="kg-demo-role-tabs" role="tablist" aria-label="Dashboard walkthrough selector">
          {DEMO_DASHBOARDS.map(spec => {
            const selected = spec.id === activeSpec.id
            return (
              <button
                key={spec.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`kg-demo-role-btn ${selected ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveId(spec.id)
                  setFilterQuery('')
                }}
              >
                <span>{spec.order}.</span>
                <span>{spec.shortLabel}</span>
              </button>
            )
          })}
        </div>
      </header>

      <article className="kg-demo-stage" aria-label={`${activeSpec.title} preview`}>
        <div className="kg-demo-stage-header">
          <div>
            <p className="eyebrow">
              {activeSpec.category === 'partner' ? 'MULTI-TENANT PARTNER WORKSPACE' : 'CONSUMER / PERSONAL WORKSPACE'} · SAMPLE VIEW
            </p>
            <h2>{activeSpec.title}</h2>
            <p>{activeSpec.tagline}</p>
            <small>
              Live dashboard route: <code>{activeSpec.realWorkspacePath}</code>
            </small>
          </div>

          <div className="kg-demo-stage-actions">
            {activeSpec.category === 'partner' ? (
              <>
                <a
                  href={launchHref}
                  className="kg-demo-cta-primary"
                  onClick={e => handleLinkNav(e, launchHref)}
                >
                  Launch Real {activeSpec.shortLabel} Workspace →
                </a>
                <a
                  href={loginHref}
                  className="kg-demo-cta-secondary"
                  onClick={e => handleLinkNav(e, loginHref)}
                >
                  Partner Sign In
                </a>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="kg-demo-cta-primary"
                  onClick={() =>
                    onOpenAuth
                      ? onOpenAuth({
                          tab: 'signup',
                          intentLabel: `Create a real account to unlock ${activeSpec.title}`,
                          redirectTo: activeSpec.realWorkspacePath,
                        })
                      : onNavigate?.(undefined, launchHref)
                  }
                >
                  Create Real Account →
                </button>
                <button
                  type="button"
                  className="kg-demo-cta-secondary"
                  onClick={() =>
                    onOpenAuth
                      ? onOpenAuth({
                          tab: 'login',
                          intentLabel: `Sign in to open ${activeSpec.title}`,
                          redirectTo: activeSpec.realWorkspacePath,
                        })
                      : onNavigate?.(undefined, loginHref)
                  }
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        <div className="kg-demo-subtabs" role="tablist" aria-label="Preview view tabs">
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === 'overview'}
            className={`kg-demo-subtab ${viewTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setViewTab('overview')}
          >
            Sample Overview &amp; KPIs
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === 'modules'}
            className={`kg-demo-subtab ${viewTab === 'modules' ? 'is-active' : ''}`}
            onClick={() => setViewTab('modules')}
          >
            Included Features ({activeSpec.modules.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewTab === 'permissions'}
            className={`kg-demo-subtab ${viewTab === 'permissions' ? 'is-active' : ''}`}
            onClick={() => setViewTab('permissions')}
          >
            Data Permissions &amp; RBAC
          </button>
        </div>

        {viewTab === 'overview' && (
          <>
            <div className="kg-demo-kpi-grid">
              {activeSpec.kpis.map(kpi => (
                <div key={kpi.label} className="kg-demo-kpi-card">
                  <span className="kg-demo-kpi-label">{kpi.label}</span>
                  <strong className="kg-demo-kpi-value">{kpi.value}</strong>
                  <span className="kg-demo-kpi-detail">{kpi.detail}</span>
                </div>
              ))}
            </div>

            <div className="kg-demo-filter-bar">
              <h3>{activeSpec.sampleHeading}</h3>
              <input
                type="search"
                className="kg-demo-filter-input"
                aria-label="Filter sample preview rows"
                placeholder="Filter sample records…"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
              />
            </div>

            <div className="kg-demo-record-list">
              {filteredRecords.map(rec => (
                <div key={rec.title} className="kg-demo-record-row">
                  <div>
                    <strong>{rec.title}</strong>
                    <span className="kg-demo-record-meta">{rec.meta}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="kg-demo-record-meta">{rec.status}</span>
                    <span className="kg-demo-badge">{rec.badge}</span>
                  </div>
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <p>No sample rows match &ldquo;{filterQuery}&rdquo;.</p>
              )}
            </div>
          </>
        )}

        {viewTab === 'modules' && (
          <div className="kg-demo-module-grid">
            {activeSpec.modules.map(mod => (
              <div key={mod.name} className="kg-demo-module-card">
                <strong>{mod.name}</strong>
                <span className="kg-demo-record-meta">{mod.summary}</span>
              </div>
            ))}
          </div>
        )}

        {viewTab === 'permissions' && (
          <div className="kg-demo-record-list">
            {activeSpec.rbacRoles.map(roleItem => (
              <div key={roleItem.role} className="kg-demo-record-row">
                <div>
                  <strong>Role: <code>{roleItem.role}</code></strong>
                  <span className="kg-demo-record-meta">{roleItem.scope}</span>
                </div>
                <span className="kg-demo-badge">RLS Enforced</span>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
