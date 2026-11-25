import { useEffect, useState } from 'react'
import { SiteIcon } from '../../../shared/components/SiteIcon'
import { AttendanceRosterPanel } from '../../../shared/components/workflows/AttendanceRosterPanel'
import {
  generateWhatsAppAttendanceAlertUrl,
  getDailyAttendance,
  saveDailyAttendance,
  type DailyAttendanceRecord,
} from '../../../shared/saas/saasSharedOperations'
import {
  deleteCoachBatch,
  type CoachBatch,
  type CoachTrainee,
  type RegisteredCoach,
} from '../coachSaaSClient'

export interface CoachBatchesAndAttendancePanelProps {
  activeTab: 'batches' | 'attendance'
  selectedSlug: string
  currentCoach: RegisteredCoach
  batches: CoachBatch[]
  trainees: CoachTrainee[]
  onOpenAddBatch: () => void
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
 * Renders the Coach schedule batches grid and the pitch-side daily attendance tracker.
 */
export function CoachBatchesAndAttendancePanel({
  activeTab,
  selectedSlug,
  currentCoach,
  batches,
  trainees,
  onOpenAddBatch,
  onRefresh,
}: CoachBatchesAndAttendancePanelProps) {
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
      <div className="coach-card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Coaching Batches &amp; Schedules</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              Manage regular training camps, seasonal academies, and 1-on-1 private assessment clinics.
            </p>
          </div>
          <button
            type="button"
            className="coach-primary-btn"
            onClick={onOpenAddBatch}
          >
            <SiteIcon name="plus" size={14} />
            <span>Create New Batch</span>
          </button>
        </div>

        <div className="coach-batches-grid">
          {batches.map(b => {
            const occupancy = b.maxCapacity > 0 ? Math.round((b.enrolledCount / b.maxCapacity) * 100) : 0

            return (
              <div key={b.id} className="coach-batch-card">
                <div className="coach-batch-card-header">
                  <span className="coach-batch-sport-tag">{b.sport}</span>
                  <button
                    type="button"
                    className="coach-batch-delete-btn"
                    onClick={() => {
                      deleteCoachBatch(b.id)
                      onRefresh()
                    }}
                    title="Remove batch schedule"
                  >
                    <SiteIcon name="close" size={14} />
                  </button>
                </div>

                <h4>{b.batchName}</h4>
                <div className="coach-batch-meta">
                  <div className="batch-meta-row">
                    <SiteIcon name="calendar" size={13} />
                    <span>{b.days}</span>
                  </div>
                  <div className="batch-meta-row">
                    <SiteIcon name="clock" size={13} />
                    <span>{b.timings}</span>
                  </div>
                  <div className="batch-meta-row">
                    <SiteIcon name="users" size={13} />
                    <span>{b.ageGroup}</span>
                  </div>
                </div>

                <div className="coach-batch-capacity">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Enrolled Capacity</span>
                    <strong>{b.enrolledCount} / {b.maxCapacity} ({occupancy}%)</strong>
                  </div>
                  <div className="coach-progress-bar-bg">
                    <div
                      className="coach-progress-bar-fill"
                      style={{ width: `${Math.min(occupancy, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="coach-batch-card-footer">
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Monthly Fee</span>
                    <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                      ₹{b.monthlyFee.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <span className="coach-batch-active-pill">● Active</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const batchTrainees = trainees.filter(t => t.batchId === attendanceBatchId || batches.length === 1)
  const total = batchTrainees.length
  const presentCount = batchTrainees.filter(t => attendanceStatuses[t.id] === 'present').length
  const absentCount = batchTrainees.filter(t => attendanceStatuses[t.id] === 'absent').length
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0

  const handleSaveRollCall = () => {
    const batch = batches.find(b => b.id === attendanceBatchId) || batches[0]
    const record: DailyAttendanceRecord = {
      id: `att-${Date.now()}`,
      entityType: 'coach',
      entitySlug: selectedSlug,
      batchId: attendanceBatchId,
      batchName: batch?.batchName || 'Coaching Clinic',
      date: attendanceDate,
      markedAt: new Date().toISOString(),
      attendees: batchTrainees.map(t => ({
        studentId: t.id,
        studentName: t.traineeName,
        parentPhone: t.parentPhone,
        status: attendanceStatuses[t.id] || 'present',
        checkInTime: batch?.timings.split('–')[0]?.trim() || '06:30 AM',
      })),
    }
    saveDailyAttendance(record)
    setAttendanceSavedNotice(true)
    setTimeout(() => setAttendanceSavedNotice(false), 3000)
  }

  return (
    <div className="coach-card-panel">
      <div className="coach-att-toolbar">
        <div className="coach-att-controls">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>TRAINING BATCH</label>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>SESSION DATE</label>
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

        <div className="coach-att-stats">
          <span className="coach-att-chip">Total Squad: {total}</span>
          <span className="coach-att-chip present">Present: {presentCount} ({rate}%)</span>
          <span className="coach-att-chip absent">Absent: {absentCount}</span>
          <button
            type="button"
            className="coach-primary-btn"
            onClick={handleSaveRollCall}
          >
            <SiteIcon name="check" size={14} />
            <span>{attendanceSavedNotice ? '✓ Roll Call Saved' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      <AttendanceRosterPanel
        dateLabel={attendanceDate}
        allowedStatuses={['present', 'absent', 'excused']}
        members={batchTrainees.map(t => ({
          id: t.id,
          name: t.traineeName,
          batchName: (batches.find(b => b.id === t.batchId) || batches[0])?.batchName || currentCoach.sport,
          phone: t.parentPhone,
          status: attendanceStatuses[t.id] || 'present',
        }))}
        onToggleStatus={(memberId, nextStatus) => {
          if (nextStatus === 'present' || nextStatus === 'absent' || nextStatus === 'excused') {
            setAttendanceStatuses(prev => ({ ...prev, [memberId]: nextStatus }))
          }
        }}
        savedLabel={attendanceSavedNotice ? '✓ Roll Call Saved' : 'Save Attendance'}
        onSave={handleSaveRollCall}
        renderMemberAction={member => {
          const rawTrainee = trainees.find(t => t.id === member.id)
          if (!rawTrainee) return null
          const batch = batches.find(b => b.id === attendanceBatchId) || batches[0]
          const waAlertUrl = generateWhatsAppAttendanceAlertUrl({
            studentName: rawTrainee.traineeName,
            parentPhone: rawTrainee.parentPhone,
            status: member.status === 'late' ? 'present' : member.status,
            batchName: batch?.batchName || 'Coaching Clinic',
            entityName: currentCoach.name,
            date: attendanceDate,
            checkInTime: batch?.timings.split('–')[0]?.trim() || '06:30 AM',
          })
          return (
            <a
              href={waAlertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kg-btn kg-btn-sm"
              title={`Send ${member.status} WhatsApp notice to ${rawTrainee.parentName}`}
            >
              <SiteIcon name="phone" size={12} />
              <span>Notify Parent ({member.status})</span>
            </a>
          )
        }}
      />
    </div>
  )
}
