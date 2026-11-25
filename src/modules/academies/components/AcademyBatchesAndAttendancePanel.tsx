import { useEffect, useState } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { AttendanceRosterPanel } from '../../../shared/components/workflows/AttendanceRosterPanel'
import { maskPhone } from '../../../shared/saas/saasLaunchReadinessService'
import {
  generateWhatsAppAttendanceAlertUrl,
  getDailyAttendance,
  saveDailyAttendance,
  type DailyAttendanceRecord,
} from '../../../shared/saas/saasSharedOperations'
import {
  recordTenantAuditLog,
  saveTenantDailyAttendance,
  softDeleteTenantBatch,
  type DbTenant,
} from '../../../integrations/supabase/tenant-client'
import { downloadBlobFile, exportAttendanceToCsv } from '../academyExportUtils'
import {
  deleteAcademyBatch,
  type AcademyBatch,
  type AcademyStudent,
  type RegisteredAcademy,
} from '../academySaaSClient'

export interface AcademyBatchesAndAttendancePanelProps {
  activeTab: 'batches' | 'attendance'
  selectedSlug: string
  currentTenant: DbTenant | null
  currentAcademy: RegisteredAcademy
  batches: AcademyBatch[]
  students: AcademyStudent[]
  dpdpSafeMode: boolean
  onOpenAddBatch: () => void
  onOpenAttendanceSheet: (batch: AcademyBatch) => void
  onOpenBroadcast: (batch: AcademyBatch) => void
  onOpenTournamentSquad: (batch: AcademyBatch) => void
  onRefresh: () => void
}

function loadAttendanceStatusMap(slug: string, batchId: string, date: string) {
  const existing = getDailyAttendance(slug, batchId, date)
  const map: Record<string, 'present' | 'absent' | 'excused'> = {}
  existing?.attendees.forEach(a => {
    map[a.studentId] = a.status
  })
  return map
}

/**
 * Renders the Academy Coaching Batches schedule grid and Daily Attendance roll call panel.
 */
export function AcademyBatchesAndAttendancePanel({
  activeTab,
  selectedSlug,
  currentTenant,
  currentAcademy,
  batches,
  students,
  dpdpSafeMode,
  onOpenAddBatch,
  onOpenAttendanceSheet,
  onOpenBroadcast,
  onOpenTournamentSquad,
  onRefresh,
}: AcademyBatchesAndAttendancePanelProps) {
  const [pitchSideMode, setPitchSideMode] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [attendanceBatchId, setAttendanceBatchId] = useState(() => batches[0]?.id || '')
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, 'present' | 'absent' | 'excused'>>(() =>
    loadAttendanceStatusMap(selectedSlug, batches[0]?.id || '', new Date().toISOString().slice(0, 10))
  )
  const [attendanceSavedNotice, setAttendanceSavedNotice] = useState(false)

  useEffect(() => {
    const nextBatch = batches.some(b => b.id === attendanceBatchId) ? attendanceBatchId : (batches[0]?.id || '')
    setAttendanceBatchId(nextBatch)
    setAttendanceStatuses(loadAttendanceStatusMap(selectedSlug, nextBatch, attendanceDate))
  }, [selectedSlug, batches, attendanceBatchId, attendanceDate])

  if (activeTab === 'batches') {
    return (
      <section aria-labelledby="batches-section-heading">
        <div className="academy-hub-section-header">
          <div>
            <h2 id="batches-section-heading" className="academy-hub-section-title">
              Coaching Batches &amp; Timings
            </h2>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
              Manage morning, evening, and weekend batches. Published batches appear live on your KhelGrid public listing.
            </p>
          </div>

          <button
            type="button"
            className="academy-hub-primary-btn"
            onClick={onOpenAddBatch}
          >
            <SiteIcon name="plus" size={16} /> Create Coaching Batch
          </button>
        </div>

        <div className="academy-batches-grid">
          {batches.map(batch => (
            <div className="academy-batch-card" key={batch.id}>
              <div className="academy-batch-header">
                <h3 className="academy-batch-title">{batch.batchName}</h3>
                <span className="academy-batch-sport-pill">{batch.sport}</span>
              </div>

              <div className="academy-batch-meta-list">
                <div className="academy-batch-meta-item">
                  <SiteIcon name="calendar" size={16} />
                  <span><strong>Days:</strong> {batch.days}</span>
                </div>
                <div className="academy-batch-meta-item">
                  <SiteIcon name="calendar-check" size={16} />
                  <span><strong>Timings:</strong> {batch.timings}</span>
                </div>
                <div className="academy-batch-meta-item">
                  <SiteIcon name="award" size={16} />
                  <span><strong>Coach:</strong> {batch.coachName}</span>
                </div>
                <div className="academy-batch-meta-item">
                  <SiteIcon name="user" size={16} />
                  <span><strong>Age Group:</strong> {batch.ageGroup}</span>
                </div>
              </div>

              <div className="academy-batch-footer">
                <div>
                  <span className="academy-batch-fee">₹{batch.monthlyFee.toLocaleString('en-IN')}</span>
                  <small style={{ color: '#64748b' }}> / month</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="academy-batch-capacity">
                    {batch.enrolledCount} / {batch.maxCapacity} slots filled
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="academy-hub-btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                      onClick={() => onOpenAttendanceSheet(batch)}
                    >
                      <SiteIcon name="calendar-check" size={12} />
                      <span>Attendance Sheet</span>
                    </button>
                    <button
                      type="button"
                      className="academy-hub-btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' }}
                      onClick={() => onOpenBroadcast(batch)}
                      title="Broadcast weather, rainout, or emergency cancellation notice to parents via WhatsApp"
                    >
                      <SiteIcon name="alert-triangle" size={12} />
                      <span>Session Notice</span>
                    </button>
                    <button
                      type="button"
                      className="academy-hub-btn-outline"
                      style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#1d4ed8', borderColor: '#bfdbfe', background: '#eff6ff' }}
                      onClick={() => onOpenTournamentSquad(batch)}
                      title="Register batch squad directly into an active tournament on Tournament Ops"
                    >
                      <SiteIcon name="trophy" size={12} />
                      <span>Enter Tournament</span>
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer' }}
                      onClick={() => {
                        if (currentTenant?.id && batch.id.length > 30) {
                          softDeleteTenantBatch(currentTenant.id, batch.id)
                            .catch(err => console.warn('[AcademyHub] Remote soft delete batch error:', err))

                          recordTenantAuditLog({
                            tenantId: currentTenant.id,
                            action: 'soft_delete_batch',
                            entityType: 'tenant_batches',
                            entityId: batch.id,
                            details: { batchName: batch.batchName },
                          }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
                        }
                        deleteAcademyBatch(batch.id)
                        onRefresh()
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const batchStudents = students.filter(s => s.batchId === attendanceBatchId || batches.length === 1)
  const total = batchStudents.length
  const presentCount = batchStudents.filter(s => attendanceStatuses[s.id] === 'present').length
  const absentCount = batchStudents.filter(s => attendanceStatuses[s.id] === 'absent').length
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0

  const handleSaveRollCall = () => {
    const batch = batches.find(b => b.id === attendanceBatchId) || batches[0]
    const record: DailyAttendanceRecord = {
      id: `att-${Date.now()}`,
      entityType: 'academy',
      entitySlug: selectedSlug,
      batchId: attendanceBatchId,
      batchName: batch?.batchName || 'Coaching Squad',
      date: attendanceDate,
      markedAt: new Date().toISOString(),
      attendees: batchStudents.map(s => ({
        studentId: s.id,
        studentName: s.studentName,
        parentPhone: s.parentPhone,
        status: attendanceStatuses[s.id] || 'present',
        checkInTime: batch?.timings.split('–')[0]?.trim() || '06:00 AM',
      })),
    }
    saveDailyAttendance(record)

    if (currentTenant?.id) {
      const remoteAttendees = batchStudents.map(s => ({
        studentId: s.id,
        status: attendanceStatuses[s.id] || 'present',
        checkInTime: new Date().toISOString(),
      }))
      saveTenantDailyAttendance(
        currentTenant.id,
        attendanceBatchId.length > 30 ? attendanceBatchId : '00000000-0000-0000-0000-000000000000',
        attendanceDate,
        remoteAttendees
      ).catch(err => console.warn('[AcademyHub] Remote attendance save error:', err))

      recordTenantAuditLog({
        tenantId: currentTenant.id,
        action: 'save_attendance_roll_call',
        entityType: 'tenant_attendance_events',
        details: {
          date: attendanceDate,
          batchId: attendanceBatchId,
          presentCount,
          absentCount,
        },
      }).catch(err => console.warn('[AcademyHub] Audit log error:', err))
    }

    setAttendanceSavedNotice(true)
    setTimeout(() => setAttendanceSavedNotice(false), 3000)
  }

  return (
    <section aria-labelledby="attendance-section-heading">
      <div className="academy-hub-section-header">
        <div>
          <h2 id="attendance-section-heading" className="academy-hub-section-title">
            Daily Student Attendance &amp; WhatsApp Roll Call
          </h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
            Mark on-ground attendance for morning &amp; evening squads with 1-click WhatsApp arrival notifications to parents.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="coach-filter-select"
            value={attendanceBatchId}
            onChange={e => {
              const bId = e.target.value
              setAttendanceBatchId(bId)
              setAttendanceStatuses(loadAttendanceStatusMap(selectedSlug, bId, attendanceDate))
            }}
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.batchName} ({b.timings})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={attendanceDate}
            onChange={e => {
              const nextDate = e.target.value
              setAttendanceDate(nextDate)
              setAttendanceStatuses(loadAttendanceStatusMap(selectedSlug, attendanceBatchId, nextDate))
            }}
            className="coach-search-input"
            style={{ width: 'auto' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span className="coach-att-chip">Total Squad: {total}</span>
          <span className="coach-att-chip present">Present: {presentCount} ({rate}%)</span>
          <span className="coach-att-chip absent">Absent: {absentCount}</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="academy-hub-btn-outline"
            style={{
              padding: '0.45rem 0.8rem',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: pitchSideMode ? '#1e293b' : '#ffffff',
              color: pitchSideMode ? '#38bdf8' : '#334155',
              borderColor: pitchSideMode ? '#38bdf8' : '#cbd5e1',
              fontWeight: 650,
            }}
            onClick={() => setPitchSideMode(v => !v)}
            title="High-contrast 48px touch targets for direct on-field smartphone roll call"
          >
            <SiteIcon name="sparkles" size={15} />
            <span>{pitchSideMode ? 'Pitch-Side Mode: ON' : 'Pitch-Side Mode: OFF'}</span>
          </button>

          <button
            type="button"
            className="academy-hub-btn-outline"
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onClick={() => {
              const batch = batches.find(b => b.id === attendanceBatchId) || batches[0]
              const csv = exportAttendanceToCsv(
                batch?.batchName || 'Squad',
                attendanceDate,
                batchStudents.map(s => ({
                  studentName: s.studentName,
                  status: attendanceStatuses[s.id] || 'present',
                  checkInTime: batch?.timings.split('–')[0]?.trim() || '06:00 AM',
                }))
              )
              downloadBlobFile(`${currentAcademy.slug}-attendance-${attendanceDate}.csv`, csv)
            }}
          >
            <SiteIcon name="download" size={15} /> Export Attendance CSV
          </button>

          <button
            type="button"
            className="academy-hub-primary-btn"
            onClick={handleSaveRollCall}
          >
            <SiteIcon name="check" size={15} />
            <span>{attendanceSavedNotice ? '✓ Attendance Saved' : 'Save Attendance Roll Call'}</span>
          </button>
        </div>
      </div>

      <AttendanceRosterPanel
        dateLabel={attendanceDate}
        allowedStatuses={['present', 'absent', 'excused']}
        members={batchStudents.map(s => ({
          id: s.id,
          name: s.studentName,
          batchName: s.batchName,
          phone: dpdpSafeMode ? maskPhone(s.parentPhone) : `+91 ${s.parentPhone}`,
          status: attendanceStatuses[s.id] || 'present',
        }))}
        onToggleStatus={(memberId, nextStatus) => {
          if (nextStatus === 'present' || nextStatus === 'absent' || nextStatus === 'excused') {
            setAttendanceStatuses(prev => ({ ...prev, [memberId]: nextStatus }))
          }
        }}
        renderMemberAction={member => {
          const s = students.find(st => st.id === member.id)
          if (!s) return null
          const currentBatch = batches.find(b => b.id === attendanceBatchId) || batches[0]
          const waAlertUrl = generateWhatsAppAttendanceAlertUrl({
            studentName: s.studentName,
            parentPhone: s.parentPhone,
            status: member.status === 'late' ? 'present' : member.status,
            batchName: currentBatch?.batchName || 'Academy Squad',
            entityName: currentAcademy.name,
            date: attendanceDate,
            checkInTime: currentBatch?.timings.split('–')[0]?.trim() || '06:00 AM',
          })
          return (
            <a
              href={waAlertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kg-btn kg-btn-sm"
              title={`Send ${member.status} WhatsApp notice to ${s.parentName}`}
            >
              <SiteIcon name="phone" size={13} />
              <span>Notify Parent ({member.status})</span>
            </a>
          )
        }}
      />
    </section>
  )
}
