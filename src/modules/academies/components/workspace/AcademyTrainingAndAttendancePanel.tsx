import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { SiteIcon } from '../../../../shared/components/SiteIcon'
import { softDeleteTenantBatch } from '../../../../integrations/supabase/tenant-client'
import { downloadBlobFile } from '../../academyExportUtils'
import type { AcademyRoleCapabilities } from '../../academyHubTypes'
import {
  createTrainingSession,
  listAttendanceAuditLogs,
  listAttendanceForBatchDate,
  listCoachAttendanceForDate,
  saveAcademyBatchRecord,
  saveBatchAttendanceEntries,
  saveCoachAttendanceEntry,
  updateTrainingSessionStatus,
  type AcademyAthleteRecord,
  type AcademyAttendanceAuditRecord,
  type AcademyBatchRecord,
  type AcademyBranchRecord,
  type AcademyCoachAttendanceRecord,
  type AcademyCoachRecord,
  type AcademyFacilityRecord,
  type AcademySessionRecord,
  type AttendanceStatus,
} from '../../academyWorkspaceClient'

export interface AcademyTrainingAndAttendancePanelProps {
  mode: 'training' | 'attendance'
  tenantId: string
  academyName: string
  capabilities: AcademyRoleCapabilities
  branches: AcademyBranchRecord[]
  coaches: AcademyCoachRecord[]
  facilities: AcademyFacilityRecord[]
  batches: AcademyBatchRecord[]
  sessions: AcademySessionRecord[]
  athletes: AcademyAthleteRecord[]
  selectedBranchId: string | null
  onRefresh: () => Promise<void>
  onFeedback: (fb: { type: 'success' | 'error'; message: string }) => void
}

export function AcademyTrainingAndAttendancePanel({
  mode,
  tenantId,
  academyName,
  capabilities,
  branches,
  coaches,
  facilities,
  batches,
  sessions,
  athletes,
  selectedBranchId,
  onRefresh,
  onFeedback,
}: AcademyTrainingAndAttendancePanelProps) {
  // Training / Batches state
  const [trainingSubTab, setTrainingSubTab] = useState<'calendar' | 'batches'>('calendar')
  const [batchName, setBatchName] = useState('')
  const [batchSport, setBatchSport] = useState('Football')
  const [batchDays, setBatchDays] = useState('Mon, Wed, Fri')
  const [batchTimings, setBatchTimings] = useState('06:30 AM – 08:00 AM')
  const [batchAge, setBatchAge] = useState('U-14')
  const [batchBranchId, setBatchBranchId] = useState(selectedBranchId || branches[0]?.id || '')
  const [batchCoachId, setBatchCoachId] = useState(coaches[0]?.id || '')
  const [batchCap, setBatchCap] = useState('25')
  const [batchFee, setBatchFee] = useState('2000')

  const [sessTitle, setSessTitle] = useState('')
  const [sessBatchId, setSessBatchId] = useState(batches[0]?.id || '')
  const [sessBranchId, setSessBranchId] = useState(selectedBranchId || branches[0]?.id || '')
  const [sessCoachId, setSessCoachId] = useState(coaches[0]?.id || '')
  const [sessFacilityId, setSessFacilityId] = useState(facilities[0]?.id || '')
  const [sessDate, setSessDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sessStart, setSessStart] = useState('06:30')
  const [sessEnd, setSessEnd] = useState('08:00')
  const [sessRecurrence, setSessRecurrence] = useState<AcademySessionRecord['recurrenceRule']>('none')
  const [sessWeeks, setSessWeeks] = useState('4')

  // Attendance state
  const [pitchSideMode, setPitchSideMode] = useState(false)
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [attBatchId, setAttBatchId] = useState(() => batches[0]?.id || '')
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({})
  const [coachAttMap, setCoachAttMap] = useState<Record<string, AcademyCoachAttendanceRecord['status']>>({})
  const [auditLogs, setAuditLogs] = useState<AcademyAttendanceAuditRecord[]>([])

  const visibleBatches = selectedBranchId ? batches.filter(b => b.unitId === selectedBranchId) : batches
  const visibleSessions = selectedBranchId ? sessions.filter(s => s.unitId === selectedBranchId) : sessions

  useEffect(() => {
    const defaultBranch = selectedBranchId || branches[0]?.id || ''
    if (defaultBranch && (!batchBranchId || (selectedBranchId && batchBranchId !== selectedBranchId))) {
      setBatchBranchId(defaultBranch)
    }
    if (defaultBranch && (!sessBranchId || (selectedBranchId && sessBranchId !== selectedBranchId))) {
      setSessBranchId(defaultBranch)
    }
    if (!sessBatchId && visibleBatches[0]?.id) {
      setSessBatchId(visibleBatches[0].id)
    }
    if (!batchCoachId && coaches[0]?.id) {
      setBatchCoachId(coaches[0].id)
    }
    if (!sessCoachId && coaches[0]?.id) {
      setSessCoachId(coaches[0].id)
    }
    if (!sessFacilityId && facilities[0]?.id) {
      setSessFacilityId(facilities[0].id)
    }
  }, [
    selectedBranchId,
    branches,
    visibleBatches,
    coaches,
    facilities,
    batchBranchId,
    sessBranchId,
    sessBatchId,
    batchCoachId,
    sessCoachId,
    sessFacilityId,
  ])

  useEffect(() => {
    if (!attBatchId && visibleBatches[0]?.id) {
      setAttBatchId(visibleBatches[0].id)
    }
  }, [attBatchId, visibleBatches])

  useEffect(() => {
    if (mode !== 'attendance' || !tenantId || !attBatchId) return
    void listAttendanceForBatchDate(tenantId, attBatchId, attDate).then(rows => {
      const next: Record<string, AttendanceStatus> = {}
      rows.forEach(r => {
        next[r.studentId] = r.status
      })
      setStatusMap(next)
    })
    void listAttendanceAuditLogs(tenantId).then(setAuditLogs)
    void listCoachAttendanceForDate(tenantId, attDate).then(rows => {
      const next: Record<string, AttendanceStatus> = {}
      rows.forEach(r => {
        next[r.coachId] = r.status
      })
      setCoachAttMap(next)
    })
  }, [mode, tenantId, attBatchId, attDate])

  // =========================================================================
  // 1. TRAINING PROGRAMS, BATCHES & SESSION CALENDAR
  // =========================================================================
  if (mode === 'training') {
    const handleCreateBatch = async (e: FormEvent) => {
      e.preventDefault()
      const coachObj = coaches.find(c => c.id === batchCoachId)
      const res = await saveAcademyBatchRecord(tenantId, {
        unitId: batchBranchId || selectedBranchId || null,
        coachId: batchCoachId || null,
        coachName: coachObj?.fullName,
        batchName,
        sport: batchSport,
        days: batchDays,
        timings: batchTimings,
        ageGroup: batchAge,
        maxCapacity: Number(batchCap || 25),
        monthlyFee: Number(batchFee || 0),
      })
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setBatchName('')
        await onRefresh()
      }
    }

    const handleCreateSession = async (e: FormEvent) => {
      e.preventDefault()
      const b = batches.find(item => item.id === sessBatchId)
      const res = await createTrainingSession(tenantId, {
        batchId: sessBatchId,
        unitId: sessBranchId || b?.unitId || selectedBranchId || null,
        coachId: sessCoachId || b?.coachId || null,
        facilityId: sessFacilityId || null,
        title: sessTitle,
        sport: b?.sport || batchSport,
        sessionDate: sessDate,
        startTime: sessStart,
        endTime: sessEnd,
        recurrenceRule: sessRecurrence,
        repeatWeeks: Number(sessWeeks || 1),
      })
      onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
      if (res.success) {
        setSessTitle('')
        await onRefresh()
      }
    }

    return (
      <div className="kg-acad-stack" data-testid="academy-training-panel">
        <div className="kg-acad-section-head">
          <div>
            <h2>Training Programmes, Batches &amp; Calendar</h2>
            <p className="kg-acad-muted">
              Schedule batches and discrete training sessions with automatic PostgreSQL facility &amp; coach overlap validation.
            </p>
          </div>
          <div className="kg-acad-btn-row">
            <button
              type="button"
              className={trainingSubTab === 'calendar' ? 'kg-acad-btn-primary' : 'kg-acad-btn-outline'}
              onClick={() => setTrainingSubTab('calendar')}
            >
              Session Calendar ({visibleSessions.length})
            </button>
            <button
              type="button"
              className={trainingSubTab === 'batches' ? 'kg-acad-btn-primary' : 'kg-acad-btn-outline'}
              onClick={() => setTrainingSubTab('batches')}
            >
              Coaching Batches ({visibleBatches.length})
            </button>
          </div>
        </div>

        {trainingSubTab === 'calendar' ? (
          <>
            {capabilities.canManageTraining && (
              <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleCreateSession(e)}>
                <h3>Schedule Training Session (Conflict Guarded)</h3>
                <div className="kg-acad-form-grid">
                  <label className="kg-acad-field">
                    <span>Session Title *</span>
                    <input type="text" required placeholder="Morning Passing & Finishing" value={sessTitle} onChange={e => setSessTitle(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Batch *</span>
                    <select required value={sessBatchId} onChange={e => setSessBatchId(e.target.value)}>
                      <option value="">Select batch</option>
                      {visibleBatches.map(b => <option key={b.id} value={b.id}>{b.batchName} ({b.sport})</option>)}
                    </select>
                  </label>
                  <label className="kg-acad-field">
                    <span>Branch</span>
                    <select value={sessBranchId} onChange={e => setSessBranchId(e.target.value)}>
                      <option value="">Same as batch</option>
                      {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
                    </select>
                  </label>
                  <label className="kg-acad-field">
                    <span>Coach</span>
                    <select value={sessCoachId} onChange={e => setSessCoachId(e.target.value)}>
                      <option value="">Unassigned</option>
                      {coaches.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                    </select>
                  </label>
                  <label className="kg-acad-field">
                    <span>Ground / Facility</span>
                    <select value={sessFacilityId} onChange={e => setSessFacilityId(e.target.value)}>
                      <option value="">No specific pitch locked</option>
                      {facilities.map(f => <option key={f.id} value={f.id}>{f.name} ({f.facilityType})</option>)}
                    </select>
                  </label>
                  <label className="kg-acad-field">
                    <span>Date *</span>
                    <input type="date" required value={sessDate} onChange={e => setSessDate(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Start Time *</span>
                    <input type="time" required value={sessStart} onChange={e => setSessStart(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>End Time *</span>
                    <input type="time" required value={sessEnd} onChange={e => setSessEnd(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Recurrence</span>
                    <select value={sessRecurrence} onChange={e => setSessRecurrence(e.target.value as AcademySessionRecord['recurrenceRule'])}>
                      <option value="none">Single Session</option>
                      <option value="weekly">Weekly Series</option>
                    </select>
                  </label>
                  {sessRecurrence === 'weekly' && (
                    <label className="kg-acad-field">
                      <span>Repeat Weeks</span>
                      <input type="number" min={1} max={8} value={sessWeeks} onChange={e => setSessWeeks(e.target.value)} />
                    </label>
                  )}
                </div>
                <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
                  <button type="submit" className="kg-acad-btn-primary" disabled={visibleBatches.length === 0}>
                    Schedule Session
                  </button>
                </div>
              </form>
            )}

            {visibleSessions.length === 0 ? (
              <EmptyState
                title="No training sessions scheduled"
                description="Create a batch first, then schedule single or recurring training calendar sessions."
              />
            ) : (
              <div className="kg-acad-table-wrap">
                <table className="kg-acad-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Session &amp; Batch</th>
                      <th>Coach &amp; Facility</th>
                      <th>Status</th>
                      {capabilities.canManageTraining && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSessions.map(s => {
                      const batch = batches.find(b => b.id === s.batchId)?.batchName || 'Batch'
                      const coach = coaches.find(c => c.id === s.coachId)?.fullName || 'Unassigned'
                      const fac = facilities.find(f => f.id === s.facilityId)?.name || 'Open ground'
                      return (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.sessionDate}</strong>
                            <div className="kg-acad-muted">{s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}</div>
                          </td>
                          <td>
                            <strong>{s.title}</strong>
                            <div className="kg-acad-muted">{batch} · {s.sport}</div>
                          </td>
                          <td>
                            <div>{coach}</div>
                            <div className="kg-acad-muted">{fac}</div>
                          </td>
                          <td>
                            <span className={`kg-acad-pill ${s.status === 'completed' ? 'is-emerald' : s.status === 'cancelled' ? 'is-danger' : 'is-info'}`}>
                              {s.status}
                            </span>
                          </td>
                          {capabilities.canManageTraining && (
                            <td>
                              <div className="kg-acad-btn-row">
                                {s.status === 'scheduled' && (
                                  <>
                                    <button
                                      type="button"
                                      className="kg-acad-btn-outline"
                                      onClick={async () => {
                                        const res = await updateTrainingSessionStatus(tenantId, s.id, 'completed')
                                        onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                                        if (res.success) await onRefresh()
                                      }}
                                    >
                                      Complete
                                    </button>
                                    <button
                                      type="button"
                                      className="kg-acad-btn-outline is-danger"
                                      onClick={async () => {
                                        const res = await updateTrainingSessionStatus(tenantId, s.id, 'cancelled', 'Rescheduled / weather')
                                        onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                                        if (res.success) await onRefresh()
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            {capabilities.canManageTraining && (
              <form className="kg-acad-card kg-acad-form" onSubmit={e => void handleCreateBatch(e)}>
                <h3>Create Coaching Batch</h3>
                <div className="kg-acad-form-grid">
                  <label className="kg-acad-field">
                    <span>Batch Name *</span>
                    <input type="text" required placeholder="Evening U-15 Football Squad" value={batchName} onChange={e => setBatchName(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Sport *</span>
                    <input type="text" required value={batchSport} onChange={e => setBatchSport(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Days *</span>
                    <input type="text" required value={batchDays} onChange={e => setBatchDays(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Timings *</span>
                    <input type="text" required value={batchTimings} onChange={e => setBatchTimings(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Age Category</span>
                    <input type="text" value={batchAge} onChange={e => setBatchAge(e.target.value)} />
                  </label>
                  <label className="kg-acad-field">
                    <span>Branch</span>
                    <select value={batchBranchId} onChange={e => setBatchBranchId(e.target.value)}>
                      <option value="">Main / All Branches</option>
                      {branches.map(br => <option key={br.id} value={br.id}>{br.name}</option>)}
                    </select>
                  </label>
                  <label className="kg-acad-field">
                    <span>Lead Coach</span>
                    <select value={batchCoachId} onChange={e => setBatchCoachId(e.target.value)}>
                      <option value="">Unassigned</option>
                      {coaches.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                    </select>
                  </label>
                  <label className="kg-acad-field">
                    <span>Max Capacity *</span>
                    <input type="number" min={1} required value={batchCap} onChange={e => setBatchCap(e.target.value)} />
                  </label>
                  {capabilities.canViewFinance && (
                    <label className="kg-acad-field">
                      <span>Standard Fee Info (INR)</span>
                      <input type="number" min={0} value={batchFee} onChange={e => setBatchFee(e.target.value)} />
                    </label>
                  )}
                </div>
                <div className="kg-acad-btn-row" style={{ marginTop: '0.85rem' }}>
                  <button type="submit" className="kg-acad-btn-primary">Create Coaching Batch</button>
                </div>
              </form>
            )}

            {visibleBatches.length === 0 ? (
              <EmptyState title="No coaching batches created" description="Create your first squad or training group above." />
            ) : (
              <div className="kg-acad-cards-grid">
                {visibleBatches.map(b => {
                  const enrolled = athletes.filter(a => a.batchId === b.id && a.isActive).length
                  const branchName = branches.find(br => br.id === b.unitId)?.name || 'Main Campus'
                  return (
                    <article key={b.id} className="kg-acad-card">
                      <div className="kg-acad-card-head">
                        <div>
                          <h3 style={{ margin: 0 }}>{b.batchName}</h3>
                          <div className="kg-acad-muted">{b.sport} · {branchName}</div>
                        </div>
                        <span className="kg-acad-pill is-emerald">{enrolled}/{b.maxCapacity} enrolled</span>
                      </div>
                      <p className="kg-acad-muted" style={{ margin: '0.5rem 0' }}>{b.days} · {b.timings}</p>
                      <div className="kg-acad-meta-tags">
                        <span>Age: {b.ageGroup || 'Open'}</span>
                        <span>Coach: {b.coachName || 'Unassigned'}</span>
                      </div>
                      {capabilities.canManageBranches && (
                        <div className="kg-acad-btn-row" style={{ marginTop: '0.75rem' }}>
                          <button
                            type="button"
                            className="kg-acad-btn-outline is-danger"
                            onClick={async () => {
                              const res = await softDeleteTenantBatch(tenantId, b.id)
                              onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                              if (res.success) await onRefresh()
                            }}
                          >
                            Archive Batch
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // =========================================================================
  // 2. ATTENDANCE ROLL-CALL + COACH ATTENDANCE + AUDIT LOG
  // =========================================================================
  const batchAthletes = athletes.filter(a => a.batchId === attBatchId && a.isActive)
  const selectedBatchObj = batches.find(b => b.id === attBatchId)

  const handleSaveAthleteRollCall = async () => {
    if (!attBatchId || batchAthletes.length === 0) return
    const entries = batchAthletes.map(a => ({
      studentId: a.id,
      status: statusMap[a.id] || 'present',
    }))
    const res = await saveBatchAttendanceEntries({
      tenantId,
      batchId: attBatchId,
      unitId: selectedBatchObj?.unitId || selectedBranchId || null,
      sessionDate: attDate,
      entries,
    })
    onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
    if (res.success) {
      setAuditLogs(await listAttendanceAuditLogs(tenantId))
      await onRefresh()
    }
  }

  const handleExportAttendanceCsv = () => {
    const headers = ['Athlete Name', 'Batch', 'Date', 'Status']
    const rows = batchAthletes.map(a => [
      `"${a.studentName.replace(/"/g, '""')}"`,
      `"${(selectedBatchObj?.batchName || '').replace(/"/g, '""')}"`,
      `"${attDate}"`,
      `"${(statusMap[a.id] || 'present').toUpperCase()}"`,
    ].join(','))
    downloadBlobFile(
      `${academyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-attendance-${attDate}.csv`,
      [`# KhelGrid Ground Attendance Register (${attDate})`, headers.join(','), ...rows].join('\n'),
    )
  }

  return (
    <div className="kg-acad-stack" data-testid="academy-attendance-panel">
      <div className="kg-acad-section-head">
        <div>
          <h2>Ground Attendance &amp; Audit History</h2>
          <p className="kg-acad-muted">
            Log athlete and coach attendance with present, late, absent, or excused states. Every edit records an immutable PostgreSQL audit entry.
          </p>
        </div>
        <div className="kg-acad-btn-row">
          <button type="button" className="kg-acad-btn-outline" onClick={() => setPitchSideMode(v => !v)}>
            {pitchSideMode ? 'Standard View' : 'Pitch-Side Ground Mode (48px)'}
          </button>
          <button type="button" className="kg-acad-btn-outline" onClick={handleExportAttendanceCsv}>
            <SiteIcon name="download" size={15} /> Export Attendance CSV
          </button>
        </div>
      </div>

      <div className="kg-acad-filter-bar">
        <label className="kg-acad-field">
          <span>Batch</span>
          <select value={attBatchId} onChange={e => setAttBatchId(e.target.value)}>
            <option value="">Select batch</option>
            {visibleBatches.map(b => <option key={b.id} value={b.id}>{b.batchName}</option>)}
          </select>
        </label>
        <label className="kg-acad-field">
          <span>Session Date</span>
          <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} />
        </label>
      </div>

      <section className="kg-acad-card" aria-label="Athlete Roll Call">
        <div className="kg-acad-card-head">
          <h3>Athlete Roll-Call ({batchAthletes.length} trainees)</h3>
          {capabilities.canMarkAttendance && batchAthletes.length > 0 && (
            <button type="button" className="kg-acad-btn-primary" onClick={() => void handleSaveAthleteRollCall()}>
              Save Roll-Call ({attDate})
            </button>
          )}
        </div>
        {batchAthletes.length === 0 ? (
          <EmptyState
            title="No active athletes assigned to this batch"
            description="Select another batch or assign enrolled athletes to take attendance."
          />
        ) : (
          <ul className="kg-acad-list">
            {batchAthletes.map(a => {
              const curr = statusMap[a.id] || 'present'
              return (
                <li key={a.id} className="kg-acad-list-item">
                  <div>
                    <strong>{a.studentName}</strong>
                    <div className="kg-acad-muted">{a.ageCategory || ''} · {a.sport || ''}</div>
                  </div>
                  <div className="kg-acad-btn-row">
                    {(['present', 'late', 'absent', 'excused'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        disabled={!capabilities.canMarkAttendance}
                        style={pitchSideMode ? { minHeight: '48px', minWidth: '84px', fontWeight: 700 } : undefined}
                        className={curr === st ? 'kg-acad-btn-primary' : 'kg-acad-btn-outline'}
                        onClick={() => setStatusMap(prev => ({ ...prev, [a.id]: st }))}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Coach Attendance */}
      <section className="kg-acad-card" aria-label="Coach Attendance">
        <div className="kg-acad-card-head">
          <h3>Coach Daily Presence ({attDate})</h3>
        </div>
        {coaches.length === 0 ? (
          <p className="kg-acad-muted">Add coaches in the Coaches module to log coaching presence.</p>
        ) : (
          <ul className="kg-acad-list">
            {coaches.map(c => {
              const curr = coachAttMap[c.id] || 'present'
              return (
                <li key={c.id} className="kg-acad-list-item">
                  <div>
                    <strong>{c.fullName}</strong> <span className="kg-acad-muted">({c.roleTitle})</span>
                  </div>
                  <div className="kg-acad-btn-row">
                    {(['present', 'late', 'absent', 'excused'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        disabled={!capabilities.canManageCoaches}
                        className={curr === st ? 'kg-acad-btn-primary' : 'kg-acad-btn-outline'}
                        onClick={async () => {
                          setCoachAttMap(prev => ({ ...prev, [c.id]: st }))
                          const res = await saveCoachAttendanceEntry({
                            tenantId,
                            coachId: c.id,
                            unitId: c.primaryUnitId,
                            sessionDate: attDate,
                            status: st,
                          })
                          onFeedback({ type: res.success ? 'success' : 'error', message: res.message })
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Immutable Audit History */}
      <section className="kg-acad-card" aria-label="Attendance Edit Audit Trail">
        <h3>Immutable Attendance Change History</h3>
        {auditLogs.length === 0 ? (
          <p className="kg-acad-muted">No attendance mutations logged yet.</p>
        ) : (
          <div className="kg-acad-table-wrap">
            <table className="kg-acad-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Athlete</th>
                  <th>Change</th>
                  <th>Logged At</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 15).map(log => {
                  const athleteName = athletes.find(a => a.id === log.studentId)?.studentName || log.studentId.slice(0, 8)
                  return (
                    <tr key={log.id}>
                      <td>{log.sessionDate}</td>
                      <td>{athleteName}</td>
                      <td>{log.previousStatus ? `${log.previousStatus} → ` : ''}{log.newStatus}</td>
                      <td className="kg-acad-muted">{log.changedAt.replace('T', ' ').slice(0, 19)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
