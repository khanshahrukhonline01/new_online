import type { FormEvent, MouseEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { EmptyState } from '../../../shared/components/ui/EmptyState'
import { useFormState } from '../../../shared/hooks/useFormState'
import { CANONICAL_SAAS_PLANS, sanitizeOrganizationSlug } from '../../../shared/saas/saasCoreEngine'
import type { OrganizationRecord, OrganizationType, OrganizationTypeMeta } from '../../../shared/saas/saasTypes'
import type { SaaSWorkspaceState } from '../../../integrations/supabase/saas-platform-client'

export interface ProvisionOrgInput {
  name: string
  slug?: string
  tenantType: OrganizationType
  city: string
  stateName: string
  sport: string
  contactEmail: string
}

interface OrgOverviewAndProvisionPanelProps {
  workspace: SaaSWorkspaceState
  activeOrg: OrganizationRecord | null
  orgTypeMetaMap: Map<OrganizationType, OrganizationTypeMeta>
  groupedOrgTypes: [string, OrganizationTypeMeta[]][]
  busy: boolean
  onContextSwitch: (value: string) => void
  onRequestToggleLifecycle: (org: OrganizationRecord) => void
  onProvisionOrg: (input: ProvisionOrgInput) => Promise<boolean>
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

interface ProvisionOrgFields extends Record<string, unknown> {
  orgName: string
  orgSlug: string
  orgType: OrganizationType
  orgCity: string
  orgState: string
  orgSport: string
  orgEmail: string
}

/**
 * Organizations overview list and atomic 18-category workspace provisioning form.
 */
export function OrgOverviewAndProvisionPanel({
  workspace,
  activeOrg,
  orgTypeMetaMap,
  groupedOrgTypes,
  busy,
  onContextSwitch,
  onRequestToggleLifecycle,
  onProvisionOrg,
  onNavigate,
}: OrgOverviewAndProvisionPanelProps) {
  const form = useFormState<ProvisionOrgFields>({
    orgName: '',
    orgSlug: '',
    orgType: 'federation',
    orgCity: '',
    orgState: '',
    orgSport: '',
    orgEmail: '',
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await onProvisionOrg({
      name: form.fields.orgName,
      slug: form.fields.orgSlug || undefined,
      tenantType: form.fields.orgType,
      city: form.fields.orgCity,
      stateName: form.fields.orgState,
      sport: form.fields.orgSport,
      contactEmail: form.fields.orgEmail,
    })
    if (ok) form.reset()
  }

  return (
    <div className="org-saas-grid-2">
      <div className="org-saas-panel">
        <div className="org-saas-panel-header">
          <h2>
            <SiteIcon name="building" size={18} />
            <span>Your Organizations</span>
          </h2>
          <span className="org-saas-tag">{workspace.organizations.length} total</span>
        </div>
        <p className="org-saas-panel-desc">
          Every organization has isolated tenant boundaries, independent verification status, and fail-closed
          suspension enforcement (suspended tenants immediately lose write and entitlement access).
        </p>

        <div className="org-saas-card-list">
          {workspace.organizations.length === 0 ? (
            <EmptyState
              icon={<SiteIcon name="building" size={28} />}
              title="No linked organizations yet"
              description="Provision a sports federation, academy, university board, club, or venue workspace on the right to unlock multi-member RBAC and branch tracking."
            />
          ) : (
            workspace.organizations.map(org => {
              const mem = workspace.memberships.find(
                m => m.tenantId === org.id && m.userId === workspace.currentUserId
              )
              const sub = workspace.subscriptions.find(s => s.subjectType === 'tenant' && s.subjectId === org.id)
              const isSelected = activeOrg?.id === org.id
              const meta = orgTypeMetaMap.get(org.tenantType)

              return (
                <article
                  key={org.id}
                  className={`org-saas-item-card ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="org-saas-item-top">
                    <div>
                      <h3 className="org-saas-item-title">{org.name}</h3>
                      <p className="org-saas-item-meta">
                        {meta?.label || org.tenantType} · <span className="org-saas-code">/{org.slug}</span>
                        {org.city ? ` · ${org.city}${org.state ? `, ${org.state}` : ''}` : ''}
                        {org.sport ? ` · ${org.sport}` : ''}
                      </p>
                    </div>
                    <div className="org-saas-context-meta">
                      <span className={`org-saas-tag ${org.status === 'active' ? 'org-saas-tag--ok' : 'org-saas-tag--danger'}`}>
                        {org.status}
                      </span>
                      <span className="org-saas-tag">
                        {org.verificationStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="org-saas-item-actions">
                    <span className="org-saas-tag">Your Role: {mem?.role || 'viewer'}</span>
                    <span className="org-saas-tag">
                      Tier: {CANONICAL_SAAS_PLANS[sub?.planCode || 'org_free'].name}
                    </span>
                    {!isSelected && (
                      <button
                        type="button"
                        className="org-saas-btn org-saas-btn--primary org-saas-btn--sm"
                        onClick={() => onContextSwitch(org.id)}
                      >
                        Open Workspace
                      </button>
                    )}
                    <button
                      type="button"
                      className={`org-saas-btn org-saas-btn--sm ${org.status === 'active' ? 'org-saas-btn--danger' : 'org-saas-btn--primary'}`}
                      onClick={() => onRequestToggleLifecycle(org)}
                    >
                      {org.status === 'suspended' ? 'Reactivate Tenant' : 'Test Suspend (Fail-Closed)'}
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>

        {onNavigate && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <a
              href="/workspace/academy/overview"
              className="org-saas-btn org-saas-btn--sm"
              onClick={e => onNavigate(e, '/workspace/academy/overview')}
            >
              Open Academy Hub <SiteIcon name="arrow-up-right" size={14} />
            </a>
            <a
              href="/workspace/turf/calendar"
              className="org-saas-btn org-saas-btn--sm"
              onClick={e => onNavigate(e, '/workspace/turf/calendar')}
            >
              Open Venue Operations <SiteIcon name="arrow-up-right" size={14} />
            </a>
            <a
              href="/workspace/tournament/overview"
              className="org-saas-btn org-saas-btn--sm"
              onClick={e => onNavigate(e, '/workspace/tournament/overview')}
            >
              Open Tournament Ops <SiteIcon name="arrow-up-right" size={14} />
            </a>
          </div>
        )}
      </div>

      <div className="org-saas-panel">
        <div className="org-saas-panel-header">
          <h2>
            <SiteIcon name="plus" size={18} />
            <span>Register New Organization</span>
          </h2>
          <span className="org-saas-tag org-saas-tag--ok">Free Starter Tier</span>
        </div>
        <p className="org-saas-panel-desc">
          Provision any of KhelGrid&apos;s 18 sports ecosystem organization types using the atomic owner onboarding
          RPC. Public directory listings and verification remain completely free.
        </p>

        <form className="org-saas-form" onSubmit={handleSubmit}>
          <div className="org-saas-field">
            <label htmlFor="new-org-name">Organization Name *</label>
            <input
              id="new-org-name"
              className="org-saas-input"
              type="text"
              required
              minLength={2}
              placeholder="e.g., Maharashtra State Athletics Federation"
              value={form.fields.orgName}
              onChange={e => form.setField('orgName', e.target.value)}
            />
          </div>

          <div className="org-saas-form-row">
            <div className="org-saas-field">
              <label htmlFor="new-org-type">Organization Category (18 Types) *</label>
              <select
                id="new-org-type"
                className="org-saas-select"
                value={form.fields.orgType}
                onChange={e => form.setField('orgType', e.target.value as OrganizationType)}
              >
                {groupedOrgTypes.map(([group, items]) => (
                  <optgroup key={group} label={group}>
                    {items.map(item => (
                      <option key={item.type} value={item.type}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="org-saas-field">
              <label htmlFor="new-org-slug">URL Slug (auto-generated if blank)</label>
              <input
                id="new-org-slug"
                className="org-saas-input"
                type="text"
                placeholder={sanitizeOrganizationSlug(form.fields.orgName || 'maharashtra-athletics')}
                value={form.fields.orgSlug}
                onChange={e => form.setField('orgSlug', e.target.value)}
              />
            </div>
          </div>

          <div className="org-saas-form-row">
            <div className="org-saas-field">
              <label htmlFor="new-org-city">City</label>
              <input
                id="new-org-city"
                className="org-saas-input"
                type="text"
                placeholder="e.g., Pune"
                value={form.fields.orgCity}
                onChange={e => form.setField('orgCity', e.target.value)}
              />
            </div>
            <div className="org-saas-field">
              <label htmlFor="new-org-state">State / UT</label>
              <input
                id="new-org-state"
                className="org-saas-input"
                type="text"
                placeholder="e.g., Maharashtra"
                value={form.fields.orgState}
                onChange={e => form.setField('orgState', e.target.value)}
              />
            </div>
          </div>

          <div className="org-saas-form-row">
            <div className="org-saas-field">
              <label htmlFor="new-org-sport">Primary Sport</label>
              <input
                id="new-org-sport"
                className="org-saas-input"
                type="text"
                placeholder="e.g., Athletics, Football, Multi-Sport"
                value={form.fields.orgSport}
                onChange={e => form.setField('orgSport', e.target.value)}
              />
            </div>
            <div className="org-saas-field">
              <label htmlFor="new-org-email">Official Desk Email</label>
              <input
                id="new-org-email"
                className="org-saas-input"
                type="email"
                placeholder="office@organization.org"
                value={form.fields.orgEmail}
                onChange={e => form.setField('orgEmail', e.target.value)}
              />
            </div>
          </div>

          <p className="org-saas-field-hint">
            Category info: {orgTypeMetaMap.get(form.fields.orgType)?.description}
          </p>

          <button type="submit" className="org-saas-btn org-saas-btn--primary" disabled={busy}>
            <SiteIcon name="plus" size={16} />
            <span>Provision Organization Workspace</span>
          </button>
        </form>
      </div>
    </div>
  )
}
