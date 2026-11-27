import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import { subscribeRegulatoryState } from '../../../../src/shared/governance/regulatoryBridge'
import {
  computeAuditExplorerMetrics,
  DEFAULT_AUDIT_EXPLORER_FILTER,
  exportAuditExplorerCsv,
  exportAuditExplorerJsonBundle,
  filterAuditRecords,
  loadAllPlatformAuditRecords,
  type AuditExplorerFilter,
} from '../services/adminAuditExplorerService'
import type {
  AuditSeverity,
  AuditSourceModule,
  UnifiedPlatformAuditRecord,
} from '../services/adminPlatformGovernanceService'
import type { AdminDeskDeepLink } from '../services/adminGlobalSearchService'
import { AdminSavedViewsBar } from './AdminSavedViewsBar'
import './AdminAuditExplorerDesk.css'

export interface AdminAuditExplorerDeskProps {
  operatorEmail?: string
  deepLink?: AdminDeskDeepLink | null
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function AdminAuditExplorerDesk({
  operatorEmail = 'admin@khelgrid.com',
  deepLink = null,
}: AdminAuditExplorerDeskProps) {
  const [allRecords, setAllRecords] = useState<UnifiedPlatformAuditRecord[]>([])
  const [filter, setFilter] = useState<AuditExplorerFilter>(DEFAULT_AUDIT_EXPLORER_FILTER)
  const [selectedEvent, setSelectedEvent] = useState<UnifiedPlatformAuditRecord | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const reloadRecords = useCallback(async () => {
    const records = await loadAllPlatformAuditRecords()
    setAllRecords(records)
  }, [])

  useEffect(() => {
    void reloadRecords()
    return subscribeRegulatoryState(() => {
      void reloadRecords()
    })
  }, [reloadRecords])

  useEffect(() => {
    if (!deepLink || deepLink.workspace !== 'audit_explorer') return
    if (deepLink.savedViewFilters) {
      const f = deepLink.savedViewFilters
      setFilter({
        query: f.query || '',
        sourceModule: (f.sourceModule as AuditExplorerFilter['sourceModule']) || 'all',
        severity: (f.severity as AuditExplorerFilter['severity']) || 'all',
        actorEmail: f.actorEmail || 'all',
        actionType: f.actionType || 'all',
        startDateIso: f.startDateIso || '',
        endDateIso: f.endDateIso || '',
      })
    } else if (deepLink.query) {
      setFilter(prev => ({ ...prev, query: deepLink.query ?? '' }))
    }
  }, [deepLink])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setToast(null), 3200)
    }
  }, [])

  const availableActors = useMemo(
    () => Array.from(new Set(allRecords.map(r => r.actor))).sort(),
    [allRecords],
  )
  const availableModules = useMemo(
    () => Array.from(new Set(allRecords.map(r => r.sourceModule))).sort(),
    [allRecords],
  )
  const availableActions = useMemo(
    () => Array.from(new Set(allRecords.map(r => r.action))).sort(),
    [allRecords],
  )

  const filteredRecords = useMemo(
    () => filterAuditRecords(allRecords, filter),
    [allRecords, filter],
  )
  const metrics = useMemo(() => computeAuditExplorerMetrics(filteredRecords), [filteredRecords])

  const handleExportCsv = () => {
    const csv = exportAuditExplorerCsv(filteredRecords)
    triggerDownload(
      csv,
      `khelgrid-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;',
    )
    showToast(`Exported ${filteredRecords.length} audit events as RFC 4180 CSV.`)
  }

  const handleExportJson = () => {
    const json = exportAuditExplorerJsonBundle({
      records: filteredRecords,
      filter,
      operatorEmail,
    })
    triggerDownload(
      json,
      `khelgrid-audit-compliance-bundle-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;',
    )
    showToast(`Exported signed JSON compliance bundle (${filteredRecords.length} events).`)
  }

  return (
    <div className="admin-audit-root" data-testid="admin-audit-explorer-desk">
      <header className="admin-audit-header">
        <div>
          <p className="admin-audit-kicker">Immutable Governance Ledger · Cross-Desk Traceability</p>
          <h1 className="admin-audit-title">Centralized Audit Trail Explorer</h1>
          <p className="admin-audit-subtitle">
            Search and verify operator actions across Moderation, Verification Vault, Trust &amp; Safety,
            DPDP &amp; Statutory Compliance, Queue Claims, and RBAC changes.
          </p>
        </div>

        <div className="admin-audit-actions">
          <button
            type="button"
            className="admin-audit-btn"
            onClick={reloadRecords}
            data-testid="audit-refresh-btn"
          >
            <SiteIcon name="refresh" size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="admin-audit-btn"
            onClick={handleExportCsv}
            data-testid="audit-export-csv-btn"
          >
            <SiteIcon name="download" size={14} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="admin-audit-btn is-primary"
            onClick={handleExportJson}
            data-testid="audit-export-json-btn"
          >
            <SiteIcon name="shield-check" size={14} />
            <span>Export JSON Bundle</span>
          </button>
        </div>
      </header>

      {toast && (
        <div className="admin-audit-toast" role="status">
          <SiteIcon name="check-circle" size={15} />
          <span>{toast}</span>
        </div>
      )}

      {/* Compact Metrics Row */}
      <section className="admin-audit-metrics-grid" aria-label="Audit Explorer Summary Metrics">
        <div className="admin-audit-metric">
          <span>Matching Events</span>
          <strong className="tabular-nums" data-testid="audit-kpi-total">{metrics.totalEvents}</strong>
        </div>
        <div className="admin-audit-metric">
          <span>Critical Actions</span>
          <strong className="tabular-nums is-critical" data-testid="audit-kpi-critical">{metrics.criticalCount}</strong>
        </div>
        <div className="admin-audit-metric">
          <span>Warnings</span>
          <strong className="tabular-nums is-warning">{metrics.warningCount}</strong>
        </div>
        <div className="admin-audit-metric">
          <span>Active Operators</span>
          <strong className="tabular-nums">{metrics.uniqueOperators}</strong>
        </div>
      </section>

      <AdminSavedViewsBar
        desk="audit_explorer"
        operatorEmail={operatorEmail}
        currentFilters={{
          severity: filter.severity,
          sourceModule: filter.sourceModule,
          actorEmail: filter.actorEmail,
          actionType: filter.actionType,
          query: filter.query,
          startDateIso: filter.startDateIso,
          endDateIso: filter.endDateIso,
        }}
        onApplyFilters={next => {
          setFilter({
            query: next.query || '',
            sourceModule: (next.sourceModule as AuditExplorerFilter['sourceModule']) || 'all',
            severity: (next.severity as AuditExplorerFilter['severity']) || 'all',
            actorEmail: next.actorEmail || 'all',
            actionType: next.actionType || 'all',
            startDateIso: next.startDateIso || '',
            endDateIso: next.endDateIso || '',
          })
        }}
        onResetFilters={() => setFilter(DEFAULT_AUDIT_EXPLORER_FILTER)}
      />

      {/* Multi-Facet Filter Bar */}
      <section className="admin-audit-filters" aria-label="Audit Trail Filters">
        <input
          type="search"
          className="admin-audit-input is-search"
          placeholder="Search entity ID, action, operator, checksum, summary…"
          value={filter.query}
          onChange={e => setFilter(prev => ({ ...prev, query: e.target.value }))}
          aria-label="Search audit events"
          data-testid="audit-search-input"
        />

        <select
          className="admin-audit-select"
          value={filter.sourceModule}
          onChange={e =>
            setFilter(prev => ({
              ...prev,
              sourceModule: e.target.value as 'all' | AuditSourceModule,
            }))
          }
          aria-label="Filter by workspace desk"
          data-testid="audit-module-select"
        >
          <option value="all">All Workspaces</option>
          {availableModules.map(mod => (
            <option key={mod} value={mod}>
              {mod.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          className="admin-audit-select"
          value={filter.actorEmail}
          onChange={e => setFilter(prev => ({ ...prev, actorEmail: e.target.value }))}
          aria-label="Filter by operator email"
          data-testid="audit-operator-select"
        >
          <option value="all">All Operators</option>
          {availableActors.map(actor => (
            <option key={actor} value={actor}>
              {actor}
            </option>
          ))}
        </select>

        <select
          className="admin-audit-select"
          value={filter.actionType}
          onChange={e => setFilter(prev => ({ ...prev, actionType: e.target.value }))}
          aria-label="Filter by action type"
          data-testid="audit-action-select"
        >
          <option value="all">All Actions</option>
          {availableActions.map(act => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>

        <select
          className="admin-audit-select"
          value={filter.severity}
          onChange={e =>
            setFilter(prev => ({
              ...prev,
              severity: e.target.value as 'all' | AuditSeverity,
            }))
          }
          aria-label="Filter by severity"
          data-testid="audit-severity-select"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <input
          type="date"
          className="admin-audit-input"
          value={filter.startDateIso}
          onChange={e => setFilter(prev => ({ ...prev, startDateIso: e.target.value }))}
          aria-label="Audit start date"
          data-testid="audit-start-date"
        />
        <input
          type="date"
          className="admin-audit-input"
          value={filter.endDateIso}
          onChange={e => setFilter(prev => ({ ...prev, endDateIso: e.target.value }))}
          aria-label="Audit end date"
          data-testid="audit-end-date"
        />
      </section>

      {selectedEvent && (
        <section
          className="admin-audit-inspector"
          aria-label="Selected Audit Event Integrity Record"
          data-testid="audit-integrity-inspector"
        >
          <div className="admin-audit-inspector-head">
            <strong>
              Integrity Record · {selectedEvent.sequenceCode} · {selectedEvent.action}
            </strong>
            <button
              type="button"
              className="admin-audit-btn"
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </button>
          </div>
          <div className="admin-audit-inspector-grid tabular-nums">
            <div>
              <span>Actor:</span> <strong>{selectedEvent.actor}</strong>
            </div>
            <div>
              <span>Entity:</span> <code>{selectedEvent.targetEntity}</code>
            </div>
            <div>
              <span>Timestamp (UTC):</span> <code>{selectedEvent.timestamp}</code>
            </div>
            <div>
              <span>Immutable Checksum:</span> <code>{selectedEvent.immutableChecksum}</code>
            </div>
          </div>
          <p className="admin-audit-inspector-summary">{selectedEvent.summary}</p>
        </section>
      )}

      {/* Main Audit Ledger Table */}
      <section className="admin-audit-table-wrap" aria-label="Unified Audit Ledger">
        <table className="admin-audit-table">
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '21%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Timestamp &amp; Seq</th>
              <th>Operator</th>
              <th>Module &amp; Action</th>
              <th>Target Entity</th>
              <th>Summary</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-audit-empty">
                  No audit events match the selected filters.
                </td>
              </tr>
            ) : (
              filteredRecords.slice(0, 100).map(rec => (
                <tr
                  key={rec.id}
                  className={selectedEvent?.id === rec.id ? 'is-selected' : ''}
                  onClick={() => setSelectedEvent(rec)}
                >
                  <td className="tabular-nums admin-audit-time-cell">
                    <div>{new Date(rec.timestamp).toLocaleString()}</div>
                    <div className="admin-audit-meta">{rec.sequenceCode}</div>
                  </td>
                  <td>
                    <div className="admin-audit-actor" title={rec.actor}>{rec.actor}</div>
                  </td>
                  <td>
                    <div className="admin-audit-action-code">{rec.action}</div>
                    <div className="admin-audit-meta">{rec.sourceModule.replace(/_/g, ' ')}</div>
                  </td>
                  <td className="tabular-nums admin-audit-entity-cell">
                    <code>{rec.targetEntity}</code>
                  </td>
                  <td className="admin-audit-summary-cell" title={rec.summary}>
                    <div className="admin-audit-summary-clamp">{rec.summary}</div>
                  </td>
                  <td>
                    <span className={`admin-audit-sev is-${rec.severity}`}>
                      {rec.severity}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
