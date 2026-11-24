import { useState, useEffect, useMemo, useCallback, type FC } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  getGateCheckInSnapshot,
  verifyAndAdmitGateToken,
  quarantineGatePass,
  syncOfflineGateBuffer,
  getTurfOversightSnapshot,
  lockTurfSlotForMaintenance,
  releaseTurfMaintenanceLock,
  getAcademyOversightSnapshot,
  verifyCoachBatchAssignment,
  recordBatchAttendanceAudit,
  exportGroundOperationsCsv,
  resetGroundOperationsForTesting,
  type MaintenanceCategory,
  type GateTelemetryState,
  type BatchOversightStatus,
} from '../services/adminGroundOperationsService'
import './AdminGroundOversightView.css'

export type GroundDeskTab = 'gate' | 'turf' | 'academy'

export interface AdminGroundOversightViewProps {
  initialDesk?: GroundDeskTab
  operatorEmail?: string
}

const DESK_HEADERS: Record<GroundDeskTab, { eyebrow: string; title: string; subtitle: string }> = {
  gate: {
    eyebrow: 'GROUND INFRASTRUCTURE · QR GATE ACCESS TELEMETRY',
    title: 'Universal QR Gate Check-In & Admission Oversight',
    subtitle:
      'Live turnstile pass verification across trials, turf bookings, tournament teams, and verified athletes with replay blocking and offline buffer sync.',
  },
  turf: {
    eyebrow: 'VENUE OPERATIONS · SLOT UTILIZATION & MAINTENANCE',
    title: 'Turf Slot Utilization, Booking & Maintenance Calendars',
    subtitle:
      'Monitor hourly pitch/court occupancy, peak utilization across Indian sports arenas, and enforce safety maintenance locks cleanly.',
  },
  academy: {
    eyebrow: 'COHORT GOVERNANCE · BATCH CAPACITY & ATTENDANCE',
    title: 'Academy Batch, Coach Credential & Attendance Oversight',
    subtitle:
      'Track cohort fill rates, weekly session attendance, coach-to-athlete safety ratios, and BCCI/AIFF/NIS credential compliance.',
  },
}

function getGateBadgeClass(state: GateTelemetryState): string {
  if (state === 'admitted') return 'ground-badge-good'
  if (state === 'duplicate_blocked' || state === 'expired_denied') return 'ground-badge-warn'
  return 'ground-badge-danger'
}

function getTurfBadgeClass(status: string): string {
  if (status === 'available') return 'ground-badge-good'
  if (status === 'booked') return 'ground-badge-info'
  if (status === 'held') return 'ground-badge-warn'
  return 'ground-badge-danger'
}

function getBatchBadgeClass(status: BatchOversightStatus): string {
  if (status === 'healthy') return 'ground-badge-good'
  if (status === 'at_capacity') return 'ground-badge-info'
  if (status === 'low_attendance_alert') return 'ground-badge-warn'
  return 'ground-badge-danger'
}

function formatTimeShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export const AdminGroundOversightView: FC<AdminGroundOversightViewProps> = ({
  initialDesk = 'gate',
  operatorEmail = 'ground.ops@khelgrid.com',
}) => {
  const [activeDesk, setActiveDesk] = useState<GroundDeskTab>(initialDesk)
  const [refreshTick, setRefreshTick] = useState(0)
  const [toast, setToast] = useState<{ text: string; isError?: boolean } | null>(null)

  // Keep synced when sidebar routes between gate_desk / turf_oversight / academy_oversight
  useEffect(() => {
    setActiveDesk(initialDesk)
  }, [initialDesk])

  // Gate Scanner Input state
  const [tokenInput, setTokenInput] = useState('')
  const [tokenFacility, setTokenFacility] = useState('Delhi Cricket Academy · Dwarka Sector 19')
  const [gateSearch, setGateSearch] = useState('')

  // Turf Filters & Maintenance Modal
  const [turfVenueFilter, setTurfVenueFilter] = useState('all')
  const [turfStatusFilter, setTurfStatusFilter] = useState('all')
  const [lockSlotModal, setLockSlotModal] = useState<{ id: string; label: string } | null>(null)
  const [lockCategory, setLockCategory] = useState<MaintenanceCategory>('turf_surface_safety')
  const [lockReason, setLockReason] = useState('')

  // Academy Search & Audit Modal
  const [academySearch, setAcademySearch] = useState('')
  const [auditBatchModal, setAuditBatchModal] = useState<{ id: string; label: string; enrolled: number } | null>(null)
  const [auditPresentCount, setAuditPresentCount] = useState(18)
  const [auditAbsentCount, setAuditAbsentCount] = useState(2)
  const [auditSafetyRatioOk, setAuditSafetyRatioOk] = useState(true)
  const [auditNotes, setAuditNotes] = useState('')

  const triggerRefresh = useCallback(() => {
    setRefreshTick(prev => prev + 1)
  }, [])

  const showToast = useCallback((text: string, isError = false) => {
    setToast({ text, isError })
    setTimeout(() => setToast(null), 3800)
  }, [])

  const gateSnapshot = useMemo(() => {
    void refreshTick
    return getGateCheckInSnapshot()
  }, [refreshTick])

  const turfSnapshot = useMemo(() => {
    void refreshTick
    return getTurfOversightSnapshot()
  }, [refreshTick])

  const academySnapshot = useMemo(() => {
    void refreshTick
    return getAcademyOversightSnapshot()
  }, [refreshTick])

  const filteredGateRecords = useMemo(() => {
    const q = gateSearch.trim().toLowerCase()
    if (!q) return gateSnapshot.records
    return gateSnapshot.records.filter(
      r =>
        r.token.toLowerCase().includes(q) ||
        r.holderName.toLowerCase().includes(q) ||
        r.facility.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q),
    )
  }, [gateSnapshot.records, gateSearch])

  const filteredTurfSlots = useMemo(() => {
    return turfSnapshot.slots.filter(s => {
      if (turfVenueFilter !== 'all' && s.venueSlug !== turfVenueFilter) return false
      if (turfStatusFilter !== 'all' && s.status !== turfStatusFilter) return false
      return true
    })
  }, [turfSnapshot.slots, turfVenueFilter, turfStatusFilter])

  const filteredBatches = useMemo(() => {
    const q = academySearch.trim().toLowerCase()
    if (!q) return academySnapshot.batches
    return academySnapshot.batches.filter(
      b =>
        b.academyName.toLowerCase().includes(q) ||
        b.batchName.toLowerCase().includes(q) ||
        b.headCoachName.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.sport.toLowerCase().includes(q),
    )
  }, [academySnapshot.batches, academySearch])

  // Handlers
  const handleVerifyGateToken = () => {
    try {
      const res = verifyAndAdmitGateToken(
        { token: tokenInput, facility: tokenFacility },
        operatorEmail,
      )
      showToast(res.message, !res.admitted)
      if (res.admitted) setTokenInput('')
      triggerRefresh()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Scan verification failed.', true)
    }
  }

  const handleQuarantinePass = (id: string) => {
    const rec = quarantineGatePass(id, operatorEmail, 'Manually quarantined from Gate Operations Desk.')
    showToast(`Quarantined pass ${rec.token}.`, true)
    triggerRefresh()
  }

  const handleSyncOfflineQueue = () => {
    const res = syncOfflineGateBuffer(operatorEmail)
    showToast(
      res.syncedCount > 0
        ? `Synchronized ${res.syncedCount} queued offline scanner entries.`
        : 'All field scanners are already synchronized.',
    )
    triggerRefresh()
  }

  const handleConfirmMaintenanceLock = () => {
    if (!lockSlotModal) return
    lockTurfSlotForMaintenance(
      lockSlotModal.id,
      operatorEmail,
      lockCategory,
      lockReason || 'Scheduled safety maintenance inspection.',
    )
    showToast(`Maintenance lock applied on ${lockSlotModal.label}.`)
    setLockSlotModal(null)
    setLockReason('')
    triggerRefresh()
  }

  const handleReleaseMaintenanceLock = (slotId: string, label: string) => {
    releaseTurfMaintenanceLock(slotId, operatorEmail, 'Safety inspection passed; slot unlocked.')
    showToast(`Maintenance lock cleared on ${label}.`)
    triggerRefresh()
  }

  const handleConfirmBatchAudit = () => {
    if (!auditBatchModal) return
    recordBatchAttendanceAudit(
      auditBatchModal.id,
      auditPresentCount,
      auditAbsentCount,
      auditSafetyRatioOk,
      operatorEmail,
      auditNotes || 'Field attendance verification completed.',
    )
    showToast(`Recorded attendance audit for ${auditBatchModal.label}.`)
    setAuditBatchModal(null)
    setAuditNotes('')
    triggerRefresh()
  }

  const handleVerifyCoach = (batchId: string, nextStatus: 'verified' | 'uncertified_flag') => {
    verifyCoachBatchAssignment(
      batchId,
      nextStatus,
      operatorEmail,
      nextStatus === 'verified' ? 'Verified NIS/BCCI/AIFF coaching credentials.' : 'Flagged missing federation license.',
    )
    showToast(`Coach credential status set to ${nextStatus.replace('_', ' ').toUpperCase()}.`)
    triggerRefresh()
  }

  const handleExportCsv = () => {
    const csv = exportGroundOperationsCsv(activeDesk)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `khelgrid-${activeDesk}-oversight-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast(`Exported ${activeDesk.toUpperCase()} oversight report to CSV.`)
  }

  const handleReset = () => {
    resetGroundOperationsForTesting()
    showToast('Ground operations seed telemetry restored.')
    triggerRefresh()
  }

  const activeMeta = DESK_HEADERS[activeDesk]

  return (
    <div className="ground-ops-desk" data-testid={`ground-desk-${activeDesk}`}>
      {/* Header Ribbon */}
      <header className="ground-ops-header">
        <div className="ground-ops-title-block">
          <div className="ground-ops-eyebrow">
            <SiteIcon name="shield-check" size={14} />
            <span>{activeMeta.eyebrow}</span>
          </div>
          <h1>{activeMeta.title}</h1>
          <p>{activeMeta.subtitle}</p>
        </div>

        <div className="ground-ops-actions">
          <button type="button" className="ground-btn ground-btn-secondary" onClick={handleExportCsv}>
            <SiteIcon name="download" size={14} />
            <span>Export CSV</span>
          </button>
          <button type="button" className="ground-btn ground-btn-secondary" onClick={handleReset}>
            <span>Reset Telemetry</span>
          </button>
          <button type="button" className="ground-btn ground-btn-primary" onClick={triggerRefresh}>
            <SiteIcon name="refresh" size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Cross-Desk Ground Operations Tab Switcher */}
      <nav className="ground-tab-bar" role="tablist" aria-label="Ground Infrastructure Desks">
        <button
          type="button"
          role="tab"
          aria-selected={activeDesk === 'gate'}
          className={`ground-tab-btn ${activeDesk === 'gate' ? 'is-active' : ''}`}
          onClick={() => setActiveDesk('gate')}
          data-testid="ground-tab-gate"
        >
          <SiteIcon name="shield-check" size={14} />
          <span>QR Gate Check-In Telemetry ({gateSnapshot.metrics.totalScansToday})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeDesk === 'turf'}
          className={`ground-tab-btn ${activeDesk === 'turf' ? 'is-active' : ''}`}
          onClick={() => setActiveDesk('turf')}
          data-testid="ground-tab-turf"
        >
          <SiteIcon name="calendar" size={14} />
          <span>Turf Utilization &amp; Maintenance ({turfSnapshot.metrics.utilizationPercent}% Occ)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeDesk === 'academy'}
          className={`ground-tab-btn ${activeDesk === 'academy' ? 'is-active' : ''}`}
          onClick={() => setActiveDesk('academy')}
          data-testid="ground-tab-academy"
        >
          <SiteIcon name="building" size={14} />
          <span>Academy Batch &amp; Attendance ({academySnapshot.metrics.totalBatchesMonitored})</span>
        </button>
      </nav>

      {/* =====================================================================
          DESK 1: QR GATE CHECK-IN TELEMETRY
         ===================================================================== */}
      {activeDesk === 'gate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} data-testid="panel-gate-desk">
          <section className="ground-kpi-grid" aria-label="Gate Telemetry Metrics">
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Gate Scans Today</span>
              <span className="ground-kpi-value">{gateSnapshot.metrics.totalScansToday}</span>
              <span className="ground-kpi-sub">{gateSnapshot.metrics.uniqueFacilitiesActive} facilities streaming</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Verified Admissions</span>
              <span className="ground-kpi-value" style={{ color: '#6ee7b7' }}>
                {gateSnapshot.metrics.admittedCount}
              </span>
              <span className="ground-kpi-sub">Clean single-entry check-ins</span>
            </div>
            <div className="ground-kpi-card kpi-alert">
              <span className="ground-kpi-label">Replay / Quarantine Blocks</span>
              <span className="ground-kpi-value" style={{ color: '#fcd34d' }}>
                {gateSnapshot.metrics.blockedAnomaliesCount}
              </span>
              <span className="ground-kpi-sub">Duplicate screenshots stopped</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Offline Buffer Queue</span>
              <span className="ground-kpi-value">{gateSnapshot.metrics.offlinePendingSyncCount}</span>
              <span className="ground-kpi-sub">Pending stadium sync</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Avg Scanner Latency</span>
              <span className="ground-kpi-value">{gateSnapshot.metrics.avgScannerLatencyMs}ms</span>
              <span className="ground-kpi-sub">Sub-200ms QR turnaround</span>
            </div>
          </section>

          <section className="ground-scanner-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>Live Credential Token &amp; Replay Verifier</strong>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Enter any trial pass, turf voucher, or team credential token (e.g. <code>#PASS-DCA-8841</code>) to test single-use admission guards.
                </div>
              </div>
              {gateSnapshot.metrics.offlinePendingSyncCount > 0 && (
                <button type="button" className="ground-btn ground-btn-warning ground-btn-sm" onClick={handleSyncOfflineQueue}>
                  Sync {gateSnapshot.metrics.offlinePendingSyncCount} Offline Records
                </button>
              )}
            </div>

            <div className="ground-scanner-form">
              <input
                type="text"
                className="ground-input"
                style={{ flex: '1 1 220px' }}
                placeholder="Enter pass token (e.g. #PASS-2026-9910)"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                data-testid="gate-token-input"
              />
              <input
                type="text"
                className="ground-input"
                style={{ flex: '1 1 240px' }}
                placeholder="Facility gate name"
                value={tokenFacility}
                onChange={e => setTokenFacility(e.target.value)}
              />
              <button
                type="button"
                className="ground-btn ground-btn-primary"
                onClick={handleVerifyGateToken}
                data-testid="gate-verify-btn"
              >
                Verify &amp; Admit Pass
              </button>
            </div>
          </section>

          <section className="ground-table-card">
            <div className="ground-table-header">
              <div>
                <h4>Gate Admission &amp; Turnstile Log Stream ({filteredGateRecords.length})</h4>
                <span className="ground-table-hint">Real-time QR / NFC scanner events across active sports venues</span>
              </div>
              <input
                type="text"
                className="ground-input"
                placeholder="Filter by token, holder, city..."
                value={gateSearch}
                onChange={e => setGateSearch(e.target.value)}
              />
            </div>
            <div className="ground-table-scroll">
              <table className="ground-data-table" aria-label="Gate Check-In Log Table">
                <thead>
                  <tr>
                    <th>Token &amp; Type</th>
                    <th>Holder &amp; Sport</th>
                    <th>Facility &amp; Gate</th>
                    <th>Method &amp; Sync</th>
                    <th>State</th>
                    <th>Timestamp</th>
                    <th>Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGateRecords.map(rec => (
                    <tr key={rec.id} data-testid={`gate-row-${rec.id}`}>
                      <td>
                        <code>{rec.token}</code>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          {rec.passType.replace('_', ' ')}
                        </div>
                      </td>
                      <td>
                        <strong>{rec.holderName}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {rec.sport} · {rec.holderPhoneMasked}
                        </div>
                      </td>
                      <td>
                        <div>{rec.facility}</div>
                        <div style={{ fontSize: '0.72rem', color: '#93c5fd' }}>
                          {rec.gateLabel} ({rec.city})
                        </div>
                      </td>
                      <td>
                        <div style={{ textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                          {rec.scanMethod.replace('_', ' ')} ({rec.latencyMs}ms)
                        </div>
                        <span style={{ fontSize: '0.72rem', color: rec.syncStatus === 'synced' ? '#6ee7b7' : '#fcd34d' }}>
                          {rec.syncStatus === 'synced' ? 'Synced' : 'Pending Offline Sync'}
                        </span>
                      </td>
                      <td>
                        <span className={`ground-badge ${getGateBadgeClass(rec.telemetryState)}`}>
                          {rec.telemetryState.replace(/_/g, ' ')}
                        </span>
                        {rec.anomalyNote && (
                          <div style={{ fontSize: '0.72rem', color: '#fcd34d', marginTop: '0.25rem', maxWidth: '210px' }}>
                            {rec.anomalyNote}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        {formatTimeShort(rec.admittedAt)}
                      </td>
                      <td>
                        {rec.telemetryState === 'admitted' && (
                          <button
                            type="button"
                            className="ground-btn ground-btn-danger ground-btn-sm"
                            onClick={() => handleQuarantinePass(rec.id)}
                          >
                            Quarantine
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          DESK 2: TURF SLOT UTILIZATION & MAINTENANCE CALENDAR
         ===================================================================== */}
      {activeDesk === 'turf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} data-testid="panel-turf-desk">
          <section className="ground-kpi-grid" aria-label="Turf Utilization Metrics">
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Daily Slots Tracked</span>
              <span className="ground-kpi-value">{turfSnapshot.metrics.totalSlotsTracked}</span>
              <span className="ground-kpi-sub">{turfSnapshot.venues.length} flagship venues</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Overall Utilization</span>
              <span className="ground-kpi-value" style={{ color: '#6ee7b7' }}>
                {turfSnapshot.metrics.utilizationPercent}%
              </span>
              <span className="ground-kpi-sub">{turfSnapshot.metrics.bookedOrHeldSlots} booked or held slots</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Peak-Hour Occupancy</span>
              <span className="ground-kpi-value" style={{ color: '#93c5fd' }}>
                {turfSnapshot.metrics.peakUtilizationPercent}%
              </span>
              <span className="ground-kpi-sub">Evening floodlight window</span>
            </div>
            <div className="ground-kpi-card kpi-alert">
              <span className="ground-kpi-label">Maintenance Locks</span>
              <span className="ground-kpi-value" style={{ color: '#fcd34d' }}>
                {turfSnapshot.metrics.maintenanceLockedSlots}
              </span>
              <span className="ground-kpi-sub">Safety / surface remediation</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Available Inventory</span>
              <span className="ground-kpi-value">{turfSnapshot.metrics.availableSlots}</span>
              <span className="ground-kpi-sub">Slot Hold Mode · Gateways Paused</span>
            </div>
          </section>

          <section className="ground-table-card">
            <div className="ground-table-header">
              <div>
                <h4>Hourly Turf Court Utilization &amp; Safety Maintenance Matrix ({filteredTurfSlots.length})</h4>
                <span className="ground-table-hint">
                  Inspect court reservations and lock unsafe surfaces for immediate remediation.
                </span>
              </div>
            </div>

            <div className="ground-filter-strip">
              <select
                className="ground-select"
                value={turfVenueFilter}
                onChange={e => setTurfVenueFilter(e.target.value)}
                data-testid="turf-venue-filter"
              >
                <option value="all">All Registered Turf Arenas</option>
                {turfSnapshot.venues.map(v => (
                  <option key={v.slug} value={v.slug}>
                    {v.name} ({v.city})
                  </option>
                ))}
              </select>

              <select
                className="ground-select"
                value={turfStatusFilter}
                onChange={e => setTurfStatusFilter(e.target.value)}
              >
                <option value="all">All Slot States</option>
                <option value="booked">Booked</option>
                <option value="held">Reservation Hold</option>
                <option value="available">Available</option>
                <option value="blocked">Maintenance Blocked</option>
              </select>
            </div>

            <div className="ground-table-scroll">
              <table className="ground-data-table" aria-label="Turf Slot Matrix">
                <thead>
                  <tr>
                    <th>Venue &amp; Court</th>
                    <th>Time Window</th>
                    <th>Sport &amp; Rate</th>
                    <th>Status</th>
                    <th>Occupant / Maintenance Reason</th>
                    <th>Operations Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTurfSlots.map(slot => (
                    <tr key={slot.id} data-testid={`turf-row-${slot.id}`}>
                      <td>
                        <strong>{slot.venueName}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#93c5fd' }}>
                          {slot.courtName} · {slot.city}
                        </div>
                      </td>
                      <td>
                        <strong>{slot.timeSlot}</strong>
                        <div style={{ fontSize: '0.72rem', color: slot.isPeakHour ? '#fcd34d' : '#94a3b8' }}>
                          {slot.isPeakHour ? '⚡ Peak Floodlight' : 'Off-Peak'} · {slot.slotDate}
                        </div>
                      </td>
                      <td>
                        <div>{slot.sport}</div>
                        <div style={{ fontSize: '0.74rem', color: '#6ee7b7' }}>₹{slot.hourlyRateInr}/hr</div>
                      </td>
                      <td>
                        <span className={`ground-badge ${getTurfBadgeClass(slot.status)}`}>
                          {slot.status === 'blocked' ? 'Maintenance Lock' : slot.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: '250px' }}>
                        {slot.status === 'blocked' ? (
                          <div style={{ color: '#fca5a5', fontSize: '0.78rem' }}>
                            <strong>{slot.maintenanceCategory?.replace(/_/g, ' ')}:</strong> {slot.blockedReason}
                          </div>
                        ) : slot.customerName ? (
                          <div>
                            <strong>{slot.customerName}</strong> (<code>{slot.bookingId}</code>)
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{slot.paymentStateLabel}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b' }}>Open for discovery bookings</span>
                        )}
                      </td>
                      <td>
                        {slot.status === 'blocked' ? (
                          <button
                            type="button"
                            className="ground-btn ground-btn-primary ground-btn-sm"
                            onClick={() => handleReleaseMaintenanceLock(slot.id, `${slot.venueName} ${slot.timeSlot}`)}
                          >
                            Clear Lock &amp; Reopen
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ground-btn ground-btn-danger ground-btn-sm"
                            onClick={() => {
                              setLockReason('')
                              setLockSlotModal({
                                id: slot.id,
                                label: `${slot.venueName} · ${slot.timeSlot}`,
                              })
                            }}
                          >
                            Lock Maintenance
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          DESK 3: ACADEMY BATCH & ATTENDANCE OVERSIGHT
         ===================================================================== */}
      {activeDesk === 'academy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} data-testid="panel-academy-desk">
          <section className="ground-kpi-grid" aria-label="Academy Oversight Metrics">
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Active Batches Audited</span>
              <span className="ground-kpi-value">{academySnapshot.metrics.totalBatchesMonitored}</span>
              <span className="ground-kpi-sub">{academySnapshot.metrics.totalEnrolledAthletes} active athletes</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Avg Batch Occupancy</span>
              <span className="ground-kpi-value" style={{ color: '#93c5fd' }}>
                {academySnapshot.metrics.avgOccupancyPercent}%
              </span>
              <span className="ground-kpi-sub">Enrolled vs capacity ceiling</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Weekly Attendance</span>
              <span className="ground-kpi-value" style={{ color: '#6ee7b7' }}>
                {academySnapshot.metrics.avgWeeklyAttendancePercent}%
              </span>
              <span className="ground-kpi-sub">Verified field roll-calls</span>
            </div>
            <div className="ground-kpi-card">
              <span className="ground-kpi-label">Coach Credential Rate</span>
              <span className="ground-kpi-value">
                {academySnapshot.metrics.verifiedCoachCoveragePercent}%
              </span>
              <span className="ground-kpi-sub">NIS / BCCI / AIFF verified</span>
            </div>
            <div className="ground-kpi-card kpi-alert">
              <span className="ground-kpi-label">Safety &amp; Ratio Alerts</span>
              <span className="ground-kpi-value" style={{ color: '#fca5a5' }}>
                {academySnapshot.metrics.complianceAlertsCount}
              </span>
              <span className="ground-kpi-sub">Over-capacity / uncertified flags</span>
            </div>
          </section>

          <section className="ground-table-card">
            <div className="ground-table-header">
              <div>
                <h4>Academy Cohorts, Coach Licensing &amp; Session Attendance ({filteredBatches.length})</h4>
                <span className="ground-table-hint">
                  Audit student-to-coach safety ratios, head coach accreditation, and session attendance logs.
                </span>
              </div>
              <input
                type="text"
                className="ground-input"
                placeholder="Search academy, coach, sport, city..."
                value={academySearch}
                onChange={e => setAcademySearch(e.target.value)}
              />
            </div>

            <div className="ground-table-scroll">
              <table className="ground-data-table" aria-label="Academy Batch Oversight Table">
                <thead>
                  <tr>
                    <th>Academy &amp; Batch Cohort</th>
                    <th>Assigned Coach &amp; License</th>
                    <th>Enrolled / Cap &amp; Ratio</th>
                    <th>7d Attendance</th>
                    <th>Oversight State</th>
                    <th>Audit Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map(bat => (
                    <tr key={bat.id} data-testid={`batch-row-${bat.id}`}>
                      <td>
                        <strong>{bat.academyName}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 600 }}>{bat.batchName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {bat.sport} · {bat.city} · {bat.ageGroup}
                        </div>
                      </td>
                      <td>
                        <strong>{bat.headCoachName}</strong>
                        <div
                          style={{
                            fontSize: '0.74rem',
                            color:
                              bat.coachCredentialStatus === 'verified'
                                ? '#6ee7b7'
                                : bat.coachCredentialStatus === 'expiring_soon'
                                  ? '#fcd34d'
                                  : '#fca5a5',
                          }}
                        >
                          {bat.coachCredentialLabel}
                        </div>
                      </td>
                      <td>
                        <strong>
                          {bat.enrolledCount} / {bat.maxCapacity}
                        </strong>{' '}
                        athletes
                        <div style={{ fontSize: '0.74rem', color: bat.coachToStudentRatio.includes('Unsafe') ? '#fca5a5' : '#94a3b8' }}>
                          Ratio: {bat.coachToStudentRatio}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: bat.weeklyAttendancePercent >= 75 ? '#6ee7b7' : '#fcd34d' }}>
                          {bat.weeklyAttendancePercent}%
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {bat.recentSessions[0]?.sessionDate || '—'}
                        </div>
                      </td>
                      <td>
                        <span className={`ground-badge ${getBatchBadgeClass(bat.oversightStatus)}`}>
                          {bat.oversightStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="ground-btn ground-btn-secondary ground-btn-sm"
                            onClick={() => {
                              setAuditPresentCount(Math.max(1, bat.enrolledCount - 2))
                              setAuditAbsentCount(2)
                              setAuditSafetyRatioOk(!bat.coachToStudentRatio.includes('Unsafe'))
                              setAuditNotes('')
                              setAuditBatchModal({
                                id: bat.id,
                                label: `${bat.academyName} · ${bat.batchName}`,
                                enrolled: bat.enrolledCount,
                              })
                            }}
                          >
                            Log Field Audit
                          </button>
                          {bat.coachCredentialStatus !== 'verified' ? (
                            <button
                              type="button"
                              className="ground-btn ground-btn-primary ground-btn-sm"
                              onClick={() => handleVerifyCoach(bat.id, 'verified')}
                            >
                              Verify Coach
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="ground-btn ground-btn-danger ground-btn-sm"
                              onClick={() => handleVerifyCoach(bat.id, 'uncertified_flag')}
                            >
                              Flag License
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* MODAL: LOCK TURF SLOT FOR MAINTENANCE */}
      {lockSlotModal && (
        <div className="ground-modal-backdrop" onClick={() => setLockSlotModal(null)}>
          <div className="ground-modal-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Lock Turf Maintenance">
            <div className="ground-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Lock Slot for Safety Maintenance</h3>
              <button type="button" className="ground-btn ground-btn-secondary ground-btn-sm" onClick={() => setLockSlotModal(null)}>
                <SiteIcon name="close" size={14} />
              </button>
            </div>
            <div className="ground-modal-body">
              <div style={{ fontSize: '0.82rem', color: '#93c5fd' }}>
                Target Slot: <strong>{lockSlotModal.label}</strong>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                Maintenance Category
                <select className="ground-select" value={lockCategory} onChange={e => setLockCategory(e.target.value as MaintenanceCategory)}>
                  <option value="turf_surface_safety">Turf Surface &amp; Peg Safety Inspection</option>
                  <option value="floodlight_electrical">Floodlight &amp; Electrical Repair</option>
                  <option value="drainage_weather">Monsoon Drainage &amp; Waterlogging</option>
                  <option value="pitch_rolling">Cricket Pitch Rolling / Curating</option>
                  <option value="emergency_trust_freeze">Emergency Trust &amp; Safety Quarantine</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                Remediation Notes / Reopen Criteria
                <textarea
                  rows={3}
                  className="ground-textarea"
                  value={lockReason}
                  onChange={e => setLockReason(e.target.value)}
                  placeholder="Describe hazard or maintenance window..."
                />
              </label>
            </div>
            <div className="ground-modal-footer">
              <button type="button" className="ground-btn ground-btn-secondary" onClick={() => setLockSlotModal(null)}>Cancel</button>
              <button type="button" className="ground-btn ground-btn-danger" onClick={handleConfirmMaintenanceLock}>Apply Maintenance Lock</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG BATCH ATTENDANCE & SAFETY AUDIT */}
      {auditBatchModal && (
        <div className="ground-modal-backdrop" onClick={() => setAuditBatchModal(null)}>
          <div className="ground-modal-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Academy Batch Attendance Audit">
            <div className="ground-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Log Batch Attendance &amp; Safety Audit</h3>
              <button type="button" className="ground-btn ground-btn-secondary ground-btn-sm" onClick={() => setAuditBatchModal(null)}>
                <SiteIcon name="close" size={14} />
              </button>
            </div>
            <div className="ground-modal-body">
              <div style={{ fontSize: '0.82rem', color: '#93c5fd' }}>
                Cohort: <strong>{auditBatchModal.label}</strong> (Enrolled: {auditBatchModal.enrolled})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  Athletes Present
                  <input type="number" className="ground-input" value={auditPresentCount} onChange={e => setAuditPresentCount(Number(e.target.value))} min={0} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  Athletes Absent
                  <input type="number" className="ground-input" value={auditAbsentCount} onChange={e => setAuditAbsentCount(Number(e.target.value))} min={0} />
                </label>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem' }}>
                <input type="checkbox" checked={auditSafetyRatioOk} onChange={e => setAuditSafetyRatioOk(e.target.checked)} />
                Coach-to-athlete safety ratio compliant on field (&le; 1:15)
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                Field Auditor Observations
                <textarea rows={3} className="ground-textarea" value={auditNotes} onChange={e => setAuditNotes(e.target.value)} placeholder="Notes on coaching presence, hydration, protective kit usage..." />
              </label>
            </div>
            <div className="ground-modal-footer">
              <button type="button" className="ground-btn ground-btn-secondary" onClick={() => setAuditBatchModal(null)}>Cancel</button>
              <button type="button" className="ground-btn ground-btn-primary" onClick={handleConfirmBatchAudit}>Save Field Audit</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="ground-toast"
          role="status"
          style={toast.isError ? { borderColor: 'rgba(239, 68, 68, 0.55)', color: '#fecaca' } : undefined}
        >
          <SiteIcon name={toast.isError ? 'alert-triangle' : 'check-circle'} size={16} />
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  )
}
