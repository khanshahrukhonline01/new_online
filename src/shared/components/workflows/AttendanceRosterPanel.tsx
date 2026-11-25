/**
 * AttendanceRosterPanel.tsx
 *
 * Shared presentational roster attendance marker used across AcademyHubPage
 * and CoachDashboardPage. Ensures 44px+ touch targets, mobile-first DataTable
 * stacking (<700px), and consistent status toggles.
 */
import type { ReactNode } from 'react'
import { DataTable, type DataTableColumn } from '../ui/DataTable'
import { EmptyState } from '../ui/EmptyState'
import { SiteIcon } from '../SiteIcon'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AttendanceRosterMember {
  id: string
  name: string
  batchName?: string
  phone?: string
  status: AttendanceStatus
}

interface AttendanceRosterPanelProps {
  title?: string
  dateLabel: string
  members: AttendanceRosterMember[]
  allowedStatuses?: AttendanceStatus[]
  onToggleStatus: (memberId: string, status: AttendanceStatus) => void
  onSave?: () => void
  onNotifyAbsent?: (member: AttendanceRosterMember) => void
  renderMemberAction?: (member: AttendanceRosterMember) => ReactNode
  saving?: boolean
  savedLabel?: string
}

export function AttendanceRosterPanel({
  title = 'Daily Batch Attendance',
  dateLabel,
  members,
  allowedStatuses = ['present', 'late', 'absent'],
  onToggleStatus,
  onSave,
  onNotifyAbsent,
  renderMemberAction,
  saving = false,
  savedLabel,
}: AttendanceRosterPanelProps) {
  const presentCount = members.filter(m => m.status === 'present').length

  const columns: DataTableColumn<AttendanceRosterMember>[] = [
    { key: 'name', header: 'Athlete' },
    {
      key: 'batchName',
      header: 'Batch',
      hideOnMobile: true,
      render: row => row.batchName || 'General Batch',
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <span
          className={`kg-badge ${
            row.status === 'present' ? 'is-success' : row.status === 'absent' ? 'is-danger' : 'is-warning'
          }`}
        >
          {row.status.toUpperCase()}
        </span>
      ),
    },
  ]

  return (
    <section className="kg-workflow-card" aria-label={title}>
      <div className="gate-header-top">
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <small style={{ color: 'var(--muted)' }}>
            Date: {dateLabel} · {presentCount}/{members.length} Present
          </small>
        </div>
        {onSave && (
          <button
            type="button"
            className="kg-btn kg-btn-primary kg-touch-target"
            onClick={onSave}
            disabled={saving}
          >
            <SiteIcon name="check" size={16} />
            <span>{savedLabel || (saving ? 'Saving…' : 'Save Attendance')}</span>
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={members}
        rowKey={m => m.id}
        caption={`${title} for ${dateLabel}`}
        empty={
          <EmptyState
            title="No Athletes in This Batch"
            description="Enroll athletes into this batch first to track daily session attendance."
          />
        }
        rowActions={member => (
          <>
            {allowedStatuses.map(state => (
              <button
                key={state}
                type="button"
                className={`kg-btn kg-btn-sm ${member.status === state ? 'kg-btn-primary' : ''}`}
                aria-pressed={member.status === state}
                onClick={() => onToggleStatus(member.id, state)}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
            {renderMemberAction ? (
              renderMemberAction(member)
            ) : (
              member.status === 'absent' &&
              onNotifyAbsent && (
                <button
                  type="button"
                  className="kg-btn kg-btn-sm kg-btn-ghost"
                  onClick={() => onNotifyAbsent(member)}
                >
                  Alert Parent
                </button>
              )
            )}
          </>
        )}
      />
    </section>
  )
}
