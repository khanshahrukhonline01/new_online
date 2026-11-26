import { useState, type FormEvent, type MouseEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import type {
  OrganizationRecord,
  OrganizationType,
  OrganizationTypeMeta,
} from '../../../shared/saas/saasTypes'
import type { SaaSWorkspaceState } from '../../../integrations/supabase/saas-platform-client'

export interface ProvisionOrgInput {
  name: string
  tenantType: OrganizationType
  city?: string
  sport?: string
  contactEmail?: string
}

export interface OrgOverviewAndProvisionPanelProps {
  workspace: SaaSWorkspaceState
  activeOrg: OrganizationRecord | null
  orgTypeMetaMap: Map<OrganizationType, OrganizationTypeMeta>
  groupedOrgTypes: Array<[string, OrganizationTypeMeta[]]>
  busy: boolean
  onContextSwitch: (value: string) => void
  onRequestToggleLifecycle: (org: OrganizationRecord) => void
  onProvisionOrg: (input: ProvisionOrgInput) => Promise<boolean>
  onNavigate?: (event?: MouseEvent<HTMLAnchorElement>, target?: string) => void
}

export function OrgOverviewAndProvisionPanel({
  workspace,
  activeOrg,
  orgTypeMetaMap,
  groupedOrgTypes,
  busy,
  onContextSwitch,
  onRequestToggleLifecycle,
  onProvisionOrg,
}: OrgOverviewAndProvisionPanelProps) {
  const [name, setName] = useState('')
  const [tenantType, setTenantType] = useState<OrganizationType>('academy')
  const [city, setCity] = useState('')
  const [sport, setSport] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const ok = await onProvisionOrg({
      name: name.trim(),
      tenantType,
      city: city.trim() || undefined,
      sport: sport.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
    })
    if (ok) {
      setName('')
      setCity('')
      setSport('')
      setContactEmail('')
    }
  }

  return (
    <div className="org-saas-grid">
      <div className="org-saas-card">
        <div className="org-saas-card-header">
          <h2>Linked Organization Workspaces</h2>
          <span>{workspace.organizations.length} total</span>
        </div>

        {workspace.organizations.length === 0 ? (
          <div className="org-saas-empty">
            <SiteIcon name="building" size={24} />
            <h3>No linked organizations yet</h3>
            <p>
              Register your academy, venue, federation, university board, or sports enterprise on the right to provision
              an isolated multi-tenant workspace.
            </p>
          </div>
        ) : (
          <div className="org-saas-list">
            {workspace.organizations.map(org => {
              const meta = orgTypeMetaMap.get(org.tenantType)
              const isSelected = activeOrg?.id === org.id
              return (
                <div key={org.id} className={`org-saas-list-item ${isSelected ? 'is-active' : ''}`}>
                  <div>
                    <strong>{org.name}</strong>
                    <p>
                      {meta?.label || org.tenantType}
                      {org.city ? ` · ${org.city}` : ''}
                      {org.sport ? ` · ${org.sport}` : ''}
                    </p>
                  </div>
                  <div className="org-saas-item-actions">
                    <button
                      type="button"
                      className="kg-btn-secondary"
                      onClick={() => onContextSwitch(org.id)}
                    >
                      {isSelected ? 'Active' : 'Switch'}
                    </button>
                    <button
                      type="button"
                      className="kg-btn-secondary"
                      disabled={busy}
                      onClick={() => onRequestToggleLifecycle(org)}
                    >
                      {org.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <form className="org-saas-card" onSubmit={handleSubmit}>
        <div className="org-saas-card-header">
          <h2>Register New Organization</h2>
          <span>All 18 Ecosystem Categories</span>
        </div>

        <div className="org-saas-form-field">
          <label htmlFor="org-provision-name">Organization Name *</label>
          <input
            id="org-provision-name"
            type="text"
            placeholder="e.g. Bengaluru Athletics Federation"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div className="org-saas-form-field">
          <label htmlFor="org-provision-type">Organization Category *</label>
          <select
            id="org-provision-type"
            value={tenantType}
            onChange={e => setTenantType(e.target.value as OrganizationType)}
          >
            {groupedOrgTypes.map(([group, types]) => (
              <optgroup key={group} label={group}>
                {types.map(t => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="org-saas-form-row">
          <div className="org-saas-form-field">
            <label htmlFor="org-provision-city">City</label>
            <input
              id="org-provision-city"
              type="text"
              placeholder="e.g. Pune"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
          </div>
          <div className="org-saas-form-field">
            <label htmlFor="org-provision-sport">Primary Sport</label>
            <input
              id="org-provision-sport"
              type="text"
              placeholder="e.g. Football"
              value={sport}
              onChange={e => setSport(e.target.value)}
            />
          </div>
        </div>

        <div className="org-saas-form-field">
          <label htmlFor="org-provision-email">Official Contact Email</label>
          <input
            id="org-provision-email"
            type="email"
            placeholder="ops@organization.in"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
          />
        </div>

        <button type="submit" className="kg-btn-primary" disabled={busy}>
          <SiteIcon name="plus" size={15} />
          <span>{busy ? 'Provisioning…' : 'Create Organization Workspace'}</span>
        </button>
      </form>
    </div>
  )
}
