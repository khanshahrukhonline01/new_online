import { useMemo, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { useFormState } from '../../../shared/hooks/useFormState'
import { canManageOwnedResource, hasOrganizationPermission } from '../../../shared/saas/saasCoreEngine'
import type {
  OrganizationMembership,
  OrganizationRecord,
  OwnableResourceType,
  OwnershipType,
  ResourceOwnershipRecord,
} from '../../../shared/saas/saasTypes'
import { ALL_MODULE_PERMISSIONS, OWNABLE_RESOURCE_TYPES } from '../organizationsTypes'

interface OrgPermissionsAndOwnershipPanelProps {
  activeOrg: OrganizationRecord | null
  activeMembership: OrganizationMembership | null
  currentUserId: string
  currentUserName: string
  resources: ResourceOwnershipRecord[]
  busy: boolean
  onBindResource: (input: {
    resourceTitle: string
    resourceType: OwnableResourceType
    ownershipType: OwnershipType
  }) => Promise<boolean>
}

interface BindResourceFields extends Record<string, unknown> {
  resTitle: string
  resType: OwnableResourceType
  resOwnerMode: OwnershipType
}

/**
 * Effective organization module permissions matrix and dual individual/organization resource ownership registry.
 */
export function OrgPermissionsAndOwnershipPanel({
  activeOrg,
  activeMembership,
  currentUserId,
  currentUserName,
  resources,
  busy,
  onBindResource,
}: OrgPermissionsAndOwnershipPanelProps) {
  const [resourceFilter, setResourceFilter] = useState<'all' | 'individual' | 'organization'>('all')
  const bindForm = useFormState<BindResourceFields>({
    resTitle: '',
    resType: 'opportunity',
    resOwnerMode: 'organization',
  })

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      if (resourceFilter === 'individual' && r.ownershipType !== 'individual') return false
      if (resourceFilter === 'organization' && r.ownershipType !== 'organization') return false
      if (activeOrg && r.ownershipType === 'organization' && r.ownerTenantId !== activeOrg.id) return false
      return true
    })
  }, [resources, resourceFilter, activeOrg])

  async function handleBindSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await onBindResource({
      resourceTitle: bindForm.fields.resTitle,
      resourceType: bindForm.fields.resType,
      ownershipType: bindForm.fields.resOwnerMode,
    })
    if (ok) bindForm.setField('resTitle', '')
  }

  return (
    <div>
      <div className="org-saas-panel">
        <div className="org-saas-panel-header">
          <h2>
            <SiteIcon name="lock" size={18} />
            <span>Effective Module Permissions ({activeMembership?.role || 'Personal Context'})</span>
          </h2>
          <span className="org-saas-tag org-saas-tag--ok">
            Platform Admin Isolation: Enforced (0 platform privileges granted by org roles)
          </span>
        </div>
        <p className="org-saas-panel-desc">
          Strict domain separation: Organization roles grant scoped module permissions inside the active tenant only
          and <strong>never</strong> confer platform moderation, verification approval, or global admin privileges.
        </p>

        <div className="org-saas-perm-grid">
          {ALL_MODULE_PERMISSIONS.map(item => {
            const granted = activeOrg
              ? hasOrganizationPermission({
                  organization: activeOrg,
                  membership: activeMembership,
                  permission: item.key,
                })
              : false
            return (
              <div
                key={item.key}
                className={`org-saas-perm-cell ${granted ? 'is-granted' : ''}`}
              >
                <div>
                  <div>{item.label}</div>
                  <div className="org-saas-item-meta">{item.key}</div>
                </div>
                <SiteIcon name={granted ? 'check-circle' : 'lock'} size={16} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="org-saas-grid-2">
        <div className="org-saas-panel">
          <div className="org-saas-panel-header">
            <h2>
              <SiteIcon name="link" size={18} />
              <span>Dual Resource Ownership Registry</span>
            </h2>
            <select
              aria-label="Filter resources by ownership mode"
              className="org-saas-select"
              style={{ width: 'auto', minWidth: 165 }}
              value={resourceFilter}
              onChange={e => setResourceFilter(e.target.value as 'all' | 'individual' | 'organization')}
            >
              <option value="all">All Visible Resources</option>
              <option value="individual">Individual Owned Only</option>
              <option value="organization">Organization Owned Only</option>
            </select>
          </div>
          <p className="org-saas-panel-desc">
            KhelGrid supports both <strong>Individual</strong> ownership (personal coach profiles, athlete CVs,
            community games) and <strong>Organization</strong> ownership (academy listings, university tournaments,
            federation trials) without forcing every user into a tenant.
          </p>

          <div className="org-saas-card-list">
            {filteredResources.length === 0 ? (
              <p className="org-saas-item-meta">No resources bound in this view yet.</p>
            ) : (
              filteredResources.map(res => {
                const access = canManageOwnedResource({
                  resource: res,
                  actorUserId: currentUserId,
                  activeOrganization: activeOrg,
                  actorMembership: activeMembership,
                })
                return (
                  <div key={res.id} className="org-saas-item-card">
                    <div className="org-saas-item-top">
                      <div>
                        <h3 className="org-saas-item-title">{res.resourceTitle}</h3>
                        <p className="org-saas-item-meta">
                          Type: <span className="org-saas-code">{res.resourceType}</span> · Ownership:{' '}
                          <strong>{res.ownershipType}</strong> · Verification: {res.verificationStatus.replace('_', ' ')}
                        </p>
                      </div>
                      <span className={`org-saas-tag ${access.allowed ? 'org-saas-tag--ok' : 'org-saas-tag--warn'}`}>
                        {access.allowed ? 'Can Manage' : 'Read / Scoped'}
                      </span>
                    </div>
                    <div className="org-saas-item-meta">{access.reason}</div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="org-saas-panel">
          <div className="org-saas-panel-header">
            <h2>
              <SiteIcon name="plus" size={18} />
              <span>Bind Resource Ownership</span>
            </h2>
          </div>
          <p className="org-saas-panel-desc">
            Register a venue, trial, tournament, coach profile, or paper under either your personal account or the
            active organization. Public listing submission remains 100% free.
          </p>

          <form className="org-saas-form" onSubmit={handleBindSubmit}>
            <div className="org-saas-field">
              <label htmlFor="res-title-input">Resource Title *</label>
              <input
                id="res-title-input"
                className="org-saas-input"
                type="text"
                required
                minLength={3}
                placeholder="e.g., West Zone U-19 Football Selection Trials"
                value={bindForm.fields.resTitle}
                onChange={e => bindForm.setField('resTitle', e.target.value)}
              />
            </div>
            <div className="org-saas-form-row">
              <div className="org-saas-field">
                <label htmlFor="res-type-select">Resource Type</label>
                <select
                  id="res-type-select"
                  className="org-saas-select"
                  value={bindForm.fields.resType}
                  onChange={e => bindForm.setField('resType', e.target.value as OwnableResourceType)}
                >
                  {OWNABLE_RESOURCE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="org-saas-field">
                <label htmlFor="res-owner-mode">Ownership Mode</label>
                <select
                  id="res-owner-mode"
                  className="org-saas-select"
                  value={bindForm.fields.resOwnerMode}
                  onChange={e => bindForm.setField('resOwnerMode', e.target.value as OwnershipType)}
                >
                  <option value="organization">Organization Owned ({activeOrg?.name || 'select org'})</option>
                  <option value="individual">Individual Owned ({currentUserName})</option>
                </select>
              </div>
            </div>
            <button type="submit" className="org-saas-btn org-saas-btn--primary" disabled={busy}>
              <SiteIcon name="check" size={15} />
              <span>Bind Resource Ownership</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
