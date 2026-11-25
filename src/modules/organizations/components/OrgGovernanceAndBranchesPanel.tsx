import { useMemo, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { useFormState } from '../../../shared/hooks/useFormState'
import { PLATFORM_SAAS_ADOPTION_MATRIX } from '../../../shared/saas/saasCoreEngine'
import type {
  OrganizationRecord,
  OrganizationUnit,
  OrganizationUnitType,
  SaaSAuditEvent,
} from '../../../shared/saas/saasTypes'
import { UNIT_TYPES } from '../organizationsTypes'

interface OrgGovernanceAndBranchesPanelProps {
  activeOrg: OrganizationRecord | null
  orgUnits: OrganizationUnit[]
  visibleAuditLogs: SaaSAuditEvent[]
  canManageSettings: boolean
  busy: boolean
  onCreateUnit: (input: { name: string; unitType: OrganizationUnitType; city: string }) => Promise<boolean>
}

interface UnitFormFields extends Record<string, unknown> {
  unitName: string
  unitType: OrganizationUnitType
  unitCity: string
}

/**
 * Organization branches/units hierarchy, immutable security audit log, and 30-module platform adoption matrix.
 */
export function OrgGovernanceAndBranchesPanel({
  activeOrg,
  orgUnits,
  visibleAuditLogs,
  canManageSettings,
  busy,
  onCreateUnit,
}: OrgGovernanceAndBranchesPanelProps) {
  const unitForm = useFormState<UnitFormFields>({
    unitName: '',
    unitType: 'branch',
    unitCity: '',
  })
  const [matrixSearch, setMatrixSearch] = useState('')
  const [matrixPriority, setMatrixPriority] = useState<string>('all')

  const filteredMatrix = useMemo(() => {
    const q = matrixSearch.trim().toLowerCase()
    return PLATFORM_SAAS_ADOPTION_MATRIX.filter(item => {
      if (matrixPriority !== 'all' && item.integrationPriority !== matrixPriority) return false
      if (!q) return true
      return (
        item.moduleName.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q) ||
        item.ownershipMode.toLowerCase().includes(q) ||
        item.rbacRequired.toLowerCase().includes(q)
      )
    })
  }, [matrixSearch, matrixPriority])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = await onCreateUnit({
      name: unitForm.fields.unitName,
      unitType: unitForm.fields.unitType,
      city: unitForm.fields.unitCity,
    })
    if (ok) {
      unitForm.setField('unitName', '')
      unitForm.setField('unitCity', '')
    }
  }

  return (
    <div>
      <div className="org-saas-grid-2">
        <div className="org-saas-panel">
          <div className="org-saas-panel-header">
            <h2>
              <SiteIcon name="map-pin" size={18} />
              <span>Organization Units (Branches, Teams &amp; Facilities)</span>
            </h2>
            <span className="org-saas-tag">{orgUnits.length} active</span>
          </div>
          <p className="org-saas-panel-desc">
            Lightweight hierarchy supporting multi-branch academies, university campus facilities, and regional
            federation wings with composite tenant FK isolation.
          </p>

          <div className="org-saas-card-list" style={{ marginBottom: 16 }}>
            {orgUnits.length === 0 ? (
              <p className="org-saas-item-meta">No branches or units added for this workspace yet.</p>
            ) : (
              orgUnits.map(unit => (
                <div key={unit.id} className="org-saas-item-card">
                  <div className="org-saas-item-top">
                    <div>
                      <h3 className="org-saas-item-title">{unit.name}</h3>
                      <p className="org-saas-item-meta">
                        {unit.unitType.replace('_', ' ')} {unit.city ? `· ${unit.city}` : ''} · Lead:{' '}
                        {unit.leadName || 'Assigned Admin'}
                      </p>
                    </div>
                    <span className="org-saas-tag org-saas-tag--ok">Active</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <form className="org-saas-form" onSubmit={handleSubmit}>
            <div className="org-saas-form-row">
              <div className="org-saas-field">
                <label htmlFor="unit-name-input">Unit Name *</label>
                <input
                  id="unit-name-input"
                  className="org-saas-input"
                  type="text"
                  required
                  minLength={2}
                  placeholder="e.g., West Zone Athletics Wing"
                  value={unitForm.fields.unitName}
                  onChange={e => unitForm.setField('unitName', e.target.value)}
                />
              </div>
              <div className="org-saas-field">
                <label htmlFor="unit-type-select">Unit Type</label>
                <select
                  id="unit-type-select"
                  className="org-saas-select"
                  value={unitForm.fields.unitType}
                  onChange={e => unitForm.setField('unitType', e.target.value as OrganizationUnitType)}
                >
                  {UNIT_TYPES.map(ut => (
                    <option key={ut.value} value={ut.value}>
                      {ut.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="org-saas-field">
              <label htmlFor="unit-city-input">City</label>
              <input
                id="unit-city-input"
                className="org-saas-input"
                type="text"
                placeholder="e.g., Mumbai"
                value={unitForm.fields.unitCity}
                onChange={e => unitForm.setField('unitCity', e.target.value)}
              />
            </div>
            <button type="submit" className="org-saas-btn org-saas-btn--primary" disabled={busy || !activeOrg}>
              <SiteIcon name="plus" size={15} />
              <span>Add Organization Unit</span>
            </button>
            {activeOrg && !canManageSettings && (
              <p className="org-saas-field-hint">
                Requires active <span className="org-saas-code">org:settings</span> permission and available{' '}
                <span className="org-saas-code">org.branches</span> quota.
              </p>
            )}
          </form>
        </div>

        <div className="org-saas-panel">
          <div className="org-saas-panel-header">
            <h2>
              <SiteIcon name="shield-check" size={18} />
              <span>Immutable Security Audit Log</span>
            </h2>
            <span className="org-saas-tag org-saas-tag--ok">Append-Only</span>
          </div>
          <p className="org-saas-panel-desc">
            Tracks provisioning, invitations, role changes, ownership transfers, lifecycle holds, and entitlement
            overrides. No UPDATE or DELETE privileges are granted to client roles in PostgreSQL.
          </p>

          <div className="org-saas-card-list">
            {visibleAuditLogs.length === 0 ? (
              <p className="org-saas-item-meta">Audit trail events appear automatically as workspace actions occur.</p>
            ) : (
              visibleAuditLogs.map(log => (
                <div key={log.id} className="org-saas-item-card">
                  <div className="org-saas-item-top">
                    <span className="org-saas-code">{log.action}</span>
                    <span className="org-saas-item-meta">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="org-saas-item-meta">
                    Actor: <strong>{log.actorLabel}</strong> · Resource: {log.resourceType}
                    {log.resourceId ? ` (${log.resourceId})` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="org-saas-panel">
        <div className="org-saas-panel-header">
          <h2>
            <SiteIcon name="globe" size={18} />
            <span>30-Module Platform SaaS Adoption Matrix</span>
          </h2>
          <span className="org-saas-tag">
            {filteredMatrix.length} / {PLATFORM_SAAS_ADOPTION_MATRIX.length} modules
          </span>
        </div>
        <p className="org-saas-panel-desc">
          Complete architectural blueprint defining how every KhelGrid module integrates with identity, dual
          ownership, RBAC, entitlements, and metering while preserving public discovery and free listings.
        </p>

        <div className="org-saas-filter-bar">
          <input
            type="search"
            aria-label="Search platform modules"
            className="org-saas-input"
            placeholder="Filter by module name, route, ownership mode, or permission..."
            value={matrixSearch}
            onChange={e => setMatrixSearch(e.target.value)}
          />
          <select
            aria-label="Filter by rollout priority"
            className="org-saas-select"
            value={matrixPriority}
            onChange={e => setMatrixPriority(e.target.value)}
          >
            <option value="all">All Integration Priorities</option>
            <option value="Now (Phase 2)">Now (Phase 2)</option>
            <option value="Next (Phase 3)">Next (Phase 3)</option>
            <option value="Not Needed (Keep Public)">Not Needed (Keep Public)</option>
          </select>
        </div>

        <div className="org-saas-table-wrap">
          <table className="org-saas-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Ownership Mode</th>
                <th>RBAC Required</th>
                <th>Entitlement Policy</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map(row => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.moduleName}</strong>
                    <div className="org-saas-item-meta">
                      <span className="org-saas-code">{row.route}</span>
                    </div>
                  </td>
                  <td>{row.ownershipMode}</td>
                  <td>
                    <span className="org-saas-code">{row.rbacRequired}</span>
                  </td>
                  <td>{row.entitlementRelevance}</td>
                  <td>
                    <span
                      className={`org-saas-tag ${
                        row.integrationPriority === 'Now (Phase 2)'
                          ? 'org-saas-tag--ok'
                          : row.integrationPriority === 'Next (Phase 3)'
                            ? 'org-saas-tag--warn'
                            : ''
                      }`}
                    >
                      {row.integrationPriority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
