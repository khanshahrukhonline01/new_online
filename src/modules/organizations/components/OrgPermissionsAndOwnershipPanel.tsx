import { useState, type FormEvent } from 'react'
import { ORGANIZATION_ROLE_PERMISSIONS } from '../../../shared/saas/saasCoreEngine'
import type {
  OrganizationMembership,
  OrganizationRecord,
  OwnableResourceType,
  OwnershipType,
  ResourceOwnershipRecord,
} from '../../../shared/saas/saasTypes'

export interface OrgPermissionsAndOwnershipPanelProps {
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

const RESOURCE_TYPES: OwnableResourceType[] = [
  'venue',
  'academy',
  'coach_profile',
  'opportunity',
  'tournament',
  'event',
  'pickup_game',
  'athlete_program',
  'research_paper',
  'editorial_article',
  'document',
]

export function OrgPermissionsAndOwnershipPanel({
  activeOrg,
  activeMembership,
  currentUserName,
  resources,
  busy,
  onBindResource,
}: OrgPermissionsAndOwnershipPanelProps) {
  const [resourceTitle, setResourceTitle] = useState('')
  const [resourceType, setResourceType] = useState<OwnableResourceType>('venue')
  const [ownershipType, setOwnershipType] = useState<OwnershipType>(
    activeOrg ? 'organization' : 'individual',
  )

  const effectivePermissions = activeMembership
    ? ORGANIZATION_ROLE_PERMISSIONS[activeMembership.role] || []
    : []

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!resourceTitle.trim()) return
    const ok = await onBindResource({
      resourceTitle: resourceTitle.trim(),
      resourceType,
      ownershipType,
    })
    if (ok) setResourceTitle('')
  }

  return (
    <div className="org-saas-grid">
      <div className="org-saas-card">
        <div className="org-saas-card-header">
          <h2>Effective Role Permissions</h2>
          <span>{activeMembership ? activeMembership.role : 'Personal Context'}</span>
        </div>
        {effectivePermissions.length === 0 ? (
          <p className="org-saas-muted">
            Personal identity mode ({currentUserName}). Switch to an organization workspace to view tenant-scoped RBAC
            permissions.
          </p>
        ) : (
          <div className="org-saas-pill-wrap">
            {effectivePermissions.map(perm => (
              <span key={perm} className="org-saas-tag">{perm}</span>
            ))}
          </div>
        )}
      </div>

      <div className="org-saas-card">
        <div className="org-saas-card-header">
          <h2>Dual Resource Ownership Registry</h2>
          <span>{resources.length} bound</span>
        </div>

        <form onSubmit={handleSubmit} className="org-saas-form">
          <div className="org-saas-form-field">
            <label htmlFor="org-resource-title">Resource Title</label>
            <input
              id="org-resource-title"
              type="text"
              placeholder="e.g. Koramangala Floodlit Turf"
              value={resourceTitle}
              onChange={e => setResourceTitle(e.target.value)}
              required
            />
          </div>
          <div className="org-saas-form-row">
            <div className="org-saas-form-field">
              <label htmlFor="org-resource-type">Resource Type</label>
              <select
                id="org-resource-type"
                value={resourceType}
                onChange={e => setResourceType(e.target.value as OwnableResourceType)}
              >
                {RESOURCE_TYPES.map(rt => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
            </div>
            <div className="org-saas-form-field">
              <label htmlFor="org-ownership-type">Ownership Mode</label>
              <select
                id="org-ownership-type"
                value={ownershipType}
                onChange={e => setOwnershipType(e.target.value as OwnershipType)}
              >
                <option value="individual">Individual ({currentUserName})</option>
                <option value="organization" disabled={!activeOrg}>
                  Organization ({activeOrg?.name || 'None active'})
                </option>
              </select>
            </div>
          </div>
          <button type="submit" className="kg-btn-primary" disabled={busy}>
            Bind Resource Ownership
          </button>
        </form>

        {resources.length > 0 && (
          <div className="org-saas-list" style={{ marginTop: '1rem' }}>
            {resources.map(res => (
              <div key={res.id} className="org-saas-list-item">
                <div>
                  <strong>{res.resourceTitle}</strong>
                  <p>{res.resourceType} · {res.ownershipType} · {res.verificationStatus}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
