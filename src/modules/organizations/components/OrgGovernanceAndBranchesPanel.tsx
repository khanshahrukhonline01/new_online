import { useState, type FormEvent } from 'react'
import { PLATFORM_SAAS_ADOPTION_MATRIX } from '../../../shared/saas/saasCoreEngine'
import type {
  OrganizationRecord,
  OrganizationUnit,
  OrganizationUnitType,
  SaaSAuditEvent,
} from '../../../shared/saas/saasTypes'

export interface OrgGovernanceAndBranchesPanelProps {
  activeOrg: OrganizationRecord | null
  orgUnits: OrganizationUnit[]
  visibleAuditLogs: SaaSAuditEvent[]
  canManageSettings: boolean
  busy: boolean
  onCreateUnit: (input: {
    name: string
    unitType: OrganizationUnitType
    city: string
  }) => Promise<boolean>
}

export function OrgGovernanceAndBranchesPanel({
  activeOrg,
  orgUnits,
  visibleAuditLogs,
  canManageSettings,
  busy,
  onCreateUnit,
}: OrgGovernanceAndBranchesPanelProps) {
  const [unitName, setUnitName] = useState('')
  const [unitType, setUnitType] = useState<OrganizationUnitType>('branch')
  const [unitCity, setUnitCity] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!unitName.trim()) return
    const ok = await onCreateUnit({
      name: unitName.trim(),
      unitType,
      city: unitCity.trim(),
    })
    if (ok) {
      setUnitName('')
      setUnitCity('')
    }
  }

  return (
    <div className="org-saas-stack">
      <div className="org-saas-grid">
        <div className="org-saas-card">
          <div className="org-saas-card-header">
            <h2>Organization Units (Branches, Teams &amp; Facilities)</h2>
            <span>{orgUnits.length} active</span>
          </div>

          <form onSubmit={handleSubmit} className="org-saas-form">
            <div className="org-saas-form-field">
              <label htmlFor="org-unit-name">Unit Name</label>
              <input
                id="org-unit-name"
                type="text"
                placeholder="e.g. South Zone Campus"
                value={unitName}
                onChange={e => setUnitName(e.target.value)}
                required
              />
            </div>
            <div className="org-saas-form-row">
              <div className="org-saas-form-field">
                <label htmlFor="org-unit-type">Unit Type</label>
                <select
                  id="org-unit-type"
                  value={unitType}
                  onChange={e => setUnitType(e.target.value as OrganizationUnitType)}
                >
                  <option value="branch">Branch</option>
                  <option value="regional_office">Regional Office</option>
                  <option value="department">Department</option>
                  <option value="team">Team</option>
                  <option value="facility">Facility</option>
                </select>
              </div>
              <div className="org-saas-form-field">
                <label htmlFor="org-unit-city">City</label>
                <input
                  id="org-unit-city"
                  type="text"
                  placeholder="City"
                  value={unitCity}
                  onChange={e => setUnitCity(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="kg-btn-primary" disabled={!activeOrg || !canManageSettings || busy}>
              Add Organization Unit
            </button>
          </form>

          {orgUnits.length > 0 && (
            <div className="org-saas-list" style={{ marginTop: '1rem' }}>
              {orgUnits.map(unit => (
                <div key={unit.id} className="org-saas-list-item">
                  <div>
                    <strong>{unit.name}</strong>
                    <p>{unit.unitType}{unit.city ? ` · ${unit.city}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="org-saas-card">
          <div className="org-saas-card-header">
            <h2>Immutable Workspace Audit Trail</h2>
            <span>{visibleAuditLogs.length} events</span>
          </div>
          {visibleAuditLogs.length === 0 ? (
            <p className="org-saas-muted">No audit events recorded in this context yet.</p>
          ) : (
            <div className="org-saas-list">
              {visibleAuditLogs.slice(0, 12).map(ev => (
                <div key={ev.id} className="org-saas-list-item">
                  <div>
                    <strong>{ev.action}</strong>
                    <p>{ev.actorLabel} · {ev.resourceType} · {new Date(ev.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="org-saas-card">
        <div className="org-saas-card-header">
          <h2>30-Module Platform SaaS Adoption Matrix</h2>
          <span>{PLATFORM_SAAS_ADOPTION_MATRIX.length} modules</span>
        </div>
        <div className="kg-data-table-scroll">
          <table className="kg-data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Ownership Mode</th>
                <th>RBAC</th>
                <th>Entitlements</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_SAAS_ADOPTION_MATRIX.map(entry => (
                <tr key={entry.id}>
                  <td><strong>{entry.moduleName}</strong></td>
                  <td>{entry.ownershipMode}</td>
                  <td>{entry.rbacRequired}</td>
                  <td>{entry.entitlementRelevance}</td>
                  <td>{entry.integrationPriority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
