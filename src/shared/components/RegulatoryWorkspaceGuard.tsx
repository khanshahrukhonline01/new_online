import { useEffect, useMemo, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { SiteIcon } from './SiteIcon'
import { useTenant } from '../context/useTenant'
import {
  BANNER_AUDIENCE_LABELS,
  WORKSPACE_AUDIENCE_BY_PERSONA,
  endReadOnlyWorkspaceInspection,
  evaluateWorkspaceRegulation,
  getActiveReadOnlyInspection,
  subscribeRegulatoryState,
  type RegulatoryWorkspaceKey,
} from '../governance/regulatoryBridge'

export interface RegulatoryWorkspaceGuardProps {
  persona: RegulatoryWorkspaceKey
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
  children: ReactNode
}

function formatGovernanceTimestamp(iso?: string): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function RegulatoryWorkspaceGuard({
  persona,
  onNavigate,
  children,
}: RegulatoryWorkspaceGuardProps) {
  const { currentTenant } = useTenant()
  const [syncTick, setSyncTick] = useState(0)
  const [readOnlyBlockedNotice, setReadOnlyBlockedNotice] = useState<string | null>(null)

  useEffect(() => {
    return subscribeRegulatoryState(() => {
      setSyncTick(prev => prev + 1)
    })
  }, [])

  const activeInspection = useMemo(() => {
    void syncTick
    return getActiveReadOnlyInspection()
  }, [syncTick])

  const decision = useMemo(() => {
    void syncTick
    return evaluateWorkspaceRegulation({
      persona,
      tenantId: activeInspection?.tenantId || currentTenant?.id,
      tenantSlug: activeInspection?.tenantSlug || currentTenant?.slug,
    })
  }, [persona, activeInspection?.tenantId, activeInspection?.tenantSlug, currentTenant?.id, currentTenant?.slug, syncTick])

  const audienceLabel = BANNER_AUDIENCE_LABELS[WORKSPACE_AUDIENCE_BY_PERSONA[persona]]
  const formattedTime = formatGovernanceTimestamp(decision.updatedAt)

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (onNavigate && target.startsWith('/')) {
      onNavigate(e, target)
    }
  }

  const handleExitInspection = (e: MouseEvent<HTMLAnchorElement>) => {
    endReadOnlyWorkspaceInspection()
    handleLink(e, '/admin')
  }

  const handleReadOnlySubmitCapture = (e: FormEvent<HTMLDivElement>) => {
    if (!activeInspection) return
    e.preventDefault()
    e.stopPropagation()
    setReadOnlyBlockedNotice(
      'Write action blocked: You are viewing this partner workspace in Read-Only Admin Inspection Mode.',
    )
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setReadOnlyBlockedNotice(null), 3500)
    }
  }

  const readOnlyInspectionBar = activeInspection ? (
    <div
      className="kg-readonly-inspection-bar"
      role="region"
      aria-label="Read-Only Admin Workspace Inspection"
      data-testid="admin-readonly-inspection-bar"
    >
      <div className="kg-readonly-inspection-info">
        <span className="kg-readonly-inspection-badge">
          <SiteIcon name="eye" size={13} />
          <span>Read-Only Admin Inspection</span>
        </span>
        <strong className="kg-readonly-inspection-org">{activeInspection.tenantName}</strong>
        <code className="kg-readonly-inspection-slug">{activeInspection.tenantSlug}</code>
        <span className="kg-readonly-inspection-meta">
          Inspector: {activeInspection.adminEmail} · Mutations locked
        </span>
      </div>
      <a
        href="/admin"
        className="kg-readonly-inspection-exit"
        data-testid="exit-readonly-inspection-btn"
        onClick={handleExitInspection}
      >
        <SiteIcon name="arrow-left" size={14} />
        <span>Exit Inspection &amp; Return to Admin</span>
      </a>
    </div>
  ) : null

  const targetedBroadcastStrip = decision.targetedBanners.length > 0 ? (
    <div
      className="kg-regulatory-broadcast-stack"
      role="region"
      aria-label={`KhelGrid advisory for ${audienceLabel}`}
      data-testid="regulatory-targeted-broadcast"
    >
      {decision.targetedBanners.map(banner => (
        <div key={banner.id} className={`kg-regulatory-broadcast tone-${banner.tone}`}>
          <div className="kg-regulatory-broadcast-main">
            <div className="kg-regulatory-broadcast-meta">
              <span className="kg-regulatory-broadcast-badge">{banner.badge}</span>
              <span className="kg-regulatory-broadcast-scope">Notice for {audienceLabel}</span>
            </div>
            <strong className="kg-regulatory-broadcast-title">{banner.title}</strong>
            {banner.subtitle && (
              <p className="kg-regulatory-broadcast-sub">{banner.subtitle}</p>
            )}
          </div>
          {banner.cta_url && (
            <a
              href={banner.cta_url}
              className="kg-regulatory-broadcast-cta"
              onClick={e => handleLink(e, banner.cta_url)}
            >
              <span>{banner.cta_label || 'View Details'}</span>
              <SiteIcon name="arrow-up-right" size={14} />
            </a>
          )}
        </div>
      ))}
    </div>
  ) : null

  const complianceAdvisoriesStrip =
    decision.complianceAdvisories.length > 0 ? (
      <div
        className="kg-compliance-advisory-stack"
        role="region"
        aria-label="Live Partner Compliance Advisories"
        data-testid="partner-compliance-banner-stack"
      >
        {decision.complianceAdvisories.map(advisory => {
          const sevLabel =
            advisory.severity === 'action_required'
              ? 'Compliance Action Required'
              : advisory.severity === 'expiring_soon'
                ? 'Credential Renewal Due'
                : 'Compliance Warning'
          const dueLabel = formatGovernanceTimestamp(advisory.dueAt)

          return (
            <div
              key={advisory.id}
              className={`kg-compliance-advisory is-${advisory.severity}`}
              role="alert"
              data-testid="partner-compliance-banner"
              data-advisory-ref={advisory.referenceCode}
            >
              <div className="kg-compliance-advisory-main">
                <div className="kg-compliance-advisory-meta">
                  <span className="kg-compliance-advisory-badge">
                    <SiteIcon name="alert-triangle" size={12} />
                    <span>{sevLabel}</span>
                  </span>
                  <code className="kg-compliance-advisory-ref">{advisory.referenceCode}</code>
                  <span className="kg-compliance-advisory-entity">{advisory.entityName}</span>
                  {dueLabel && (
                    <span className="kg-compliance-advisory-due">Due {dueLabel}</span>
                  )}
                </div>

                <strong className="kg-compliance-advisory-title">{advisory.headline}</strong>
                <p className="kg-compliance-advisory-msg">{advisory.message}</p>

                {advisory.missingItems && advisory.missingItems.length > 0 && (
                  <ul className="kg-compliance-advisory-missing">
                    {advisory.missingItems.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="kg-compliance-advisory-actions">
                <a
                  href={advisory.actionUrl || '/help-feedback'}
                  className="kg-compliance-advisory-cta"
                  onClick={e => handleLink(e, advisory.actionUrl || '/help-feedback')}
                >
                  <span>Submit / Update Evidence</span>
                  <SiteIcon name="arrow-up-right" size={14} />
                </a>
                <span className="kg-compliance-advisory-issuer">
                  Issued by {advisory.issuedBy}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    ) : null

  if (
    decision.state === 'maintenance' ||
    decision.state === 'module_disabled' ||
    decision.state === 'suspended'
  ) {
    const statusLabel =
      decision.state === 'maintenance'
        ? 'Platform Maintenance'
        : decision.state === 'module_disabled'
          ? 'Workspace Paused by Admin'
          : 'Organisation Suspended'

    const iconName =
      decision.state === 'suspended'
        ? 'alert-triangle'
        : decision.state === 'maintenance'
          ? 'sliders'
          : 'lock'

    return (
      <section
        className={`kg-regulatory-lockout is-${decision.state}`}
        role="alert"
        aria-live="assertive"
        data-testid="regulatory-workspace-lockout"
        data-regulatory-state={decision.state}
      >
        {readOnlyInspectionBar}
        {targetedBroadcastStrip}
        <div className="kg-regulatory-lockout-card">
          <div className="kg-regulatory-lockout-head">
            <span className="kg-regulatory-lockout-icon" aria-hidden="true">
              <SiteIcon name={iconName} size={22} />
            </span>
            <span className="kg-regulatory-lockout-tag">{statusLabel}</span>
          </div>

          <h2 className="kg-regulatory-lockout-title">{decision.headline}</h2>
          <p className="kg-regulatory-lockout-reason">{decision.reason}</p>

          {(decision.affectedTenantName || decision.actorEmail || formattedTime) && (
            <dl className="kg-regulatory-lockout-meta">
              {decision.affectedTenantName && (
                <div>
                  <dt>Organisation</dt>
                  <dd>{decision.affectedTenantName}</dd>
                </div>
              )}
              {decision.flagKey && (
                <div>
                  <dt>Control Policy</dt>
                  <dd><code>{decision.flagKey}</code></dd>
                </div>
              )}
              {decision.actorEmail && (
                <div>
                  <dt>Issued By</dt>
                  <dd>{decision.actorEmail}</dd>
                </div>
              )}
              {formattedTime && (
                <div>
                  <dt>Updated</dt>
                  <dd>{formattedTime}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="kg-regulatory-lockout-actions">
            <a
              href="/"
              className="kg-btn kg-btn-primary"
              onClick={e => handleLink(e, '/')}
            >
              Return to Discovery Home
            </a>
            <a
              href="/help-feedback"
              className="kg-btn kg-btn-secondary"
              onClick={e => handleLink(e, '/help-feedback')}
            >
              Contact Compliance &amp; Support
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div
      className={`kg-regulatory-wrapper${decision.state === 'restricted' ? ' is-restricted' : ''}${activeInspection ? ' is-readonly-inspecting' : ''}`}
      data-regulatory-state={decision.state}
    >
      {readOnlyInspectionBar}
      {readOnlyBlockedNotice && (
        <div className="kg-readonly-blocked-toast" role="status">
          <SiteIcon name="lock" size={14} />
          <span>{readOnlyBlockedNotice}</span>
        </div>
      )}
      {targetedBroadcastStrip}
      {complianceAdvisoriesStrip}

      {decision.state === 'restricted' && (
        <div
          className="kg-regulatory-restricted-banner"
          role="status"
          aria-live="polite"
          data-testid="regulatory-workspace-restricted-banner"
        >
          <div className="kg-regulatory-restricted-head">
            <SiteIcon name="alert-triangle" size={18} />
            <div>
              <strong>{decision.headline}</strong>
              {decision.affectedTenantName && (
                <span className="kg-regulatory-restricted-org"> · {decision.affectedTenantName}</span>
              )}
            </div>
          </div>
          <p className="kg-regulatory-restricted-body">{decision.reason}</p>
          <div className="kg-regulatory-restricted-foot">
            <span>
              Existing operations remain visible in read-only compliance mode.
              {formattedTime ? ` Updated ${formattedTime}.` : ''}
            </span>
            <a
              href="/help-feedback"
              className="kg-regulatory-restricted-link"
              onClick={e => handleLink(e, '/help-feedback')}
            >
              Submit Compliance Resolution →
            </a>
          </div>
        </div>
      )}

      <div
        className={activeInspection ? 'kg-readonly-inspection-surface' : undefined}
        onSubmitCapture={handleReadOnlySubmitCapture}
      >
        {children}
      </div>
    </div>
  )
}

export default RegulatoryWorkspaceGuard
