import { useMemo } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  claimQueueRecord,
  computeOperatorWorkloads,
  isClaimStale,
  KNOWN_ADMIN_OPERATORS,
  reassignQueueRecord,
  releaseQueueRecord,
  type ClaimableDeskId,
  type QueueRecordClaim,
} from '../services/adminQueueWorkflowService'
import './AdminQueueClaimControl.css'

export interface AdminQueueClaimControlProps {
  desk: ClaimableDeskId
  recordId: string
  referenceCode?: string
  recordTitle?: string
  operatorEmail: string
  claim: QueueRecordClaim | null
  compact?: boolean
  onChanged?: () => void
}

export function AdminQueueClaimControl({
  desk,
  recordId,
  referenceCode,
  recordTitle,
  operatorEmail,
  claim,
  compact = false,
  onChanged,
}: AdminQueueClaimControlProps) {
  const isMine = Boolean(claim && claim.claimedBy.toLowerCase() === operatorEmail.toLowerCase())
  const stale = claim ? isClaimStale(claim) : false

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation()
    claimQueueRecord({
      desk,
      recordId,
      operatorEmail,
      referenceCode,
      recordTitle,
    })
    onChanged?.()
  }

  const handleRelease = (e: React.MouseEvent) => {
    e.stopPropagation()
    releaseQueueRecord({ desk, recordId, operatorEmail })
    onChanged?.()
  }

  const handleReassign = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const targetEmail = e.target.value
    if (!targetEmail) return
    reassignQueueRecord({
      desk,
      recordId,
      targetOperatorEmail: targetEmail,
      actorEmail: operatorEmail,
      referenceCode,
      recordTitle,
    })
    onChanged?.()
  }

  if (!claim) {
    return (
      <div className={`admin-claim-control ${compact ? 'is-compact' : ''}`}>
        <button
          type="button"
          className="admin-claim-btn"
          onClick={handleClaim}
          data-testid={`claim-record-${recordId}`}
          title="Claim this record to signal active review"
        >
          <SiteIcon name="user" size={12} />
          <span>Claim</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className={`admin-claim-control is-claimed ${isMine ? 'is-mine' : 'is-other'} ${compact ? 'is-compact' : ''}`}
      data-testid={`claimed-indicator-${recordId}`}
      onClick={e => e.stopPropagation()}
    >
      <span className="admin-claim-status-text" title={`Claimed by ${claim.claimedBy}`}>
        {isMine ? 'In review by you' : `In review · ${claim.claimedByName}`}
        {stale ? ' (stale)' : ''}
      </span>

      {isMine ? (
        <button
          type="button"
          className="admin-claim-action-link"
          onClick={handleRelease}
          data-testid={`release-record-${recordId}`}
        >
          Release
        </button>
      ) : (
        <button
          type="button"
          className="admin-claim-action-link"
          onClick={handleClaim}
          data-testid={`takeover-record-${recordId}`}
          title={`Take over review from ${claim.claimedByName}`}
        >
          Take over
        </button>
      )}

      {!compact && (
        <select
          className="admin-claim-reassign-select"
          aria-label={`Reassign ${recordTitle || recordId}`}
          value=""
          onChange={handleReassign}
        >
          <option value="">Reassign…</option>
          {KNOWN_ADMIN_OPERATORS.map(op => (
            <option key={op.email} value={op.email}>
              {op.displayName} ({op.role})
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export type AssigneeFilterValue = 'all' | 'unclaimed' | 'mine' | string

export interface AdminAssigneeFilterBarProps {
  desk: ClaimableDeskId
  claims: QueueRecordClaim[]
  operatorEmail: string
  value: AssigneeFilterValue
  onChange: (next: AssigneeFilterValue) => void
}

export function AdminAssigneeFilterBar({
  desk,
  claims,
  operatorEmail,
  value,
  onChange,
}: AdminAssigneeFilterBarProps) {
  const deskClaims = useMemo(() => claims.filter(c => c.desk === desk), [claims, desk])
  const myCount = useMemo(
    () => deskClaims.filter(c => c.claimedBy.toLowerCase() === operatorEmail.toLowerCase()).length,
    [deskClaims, operatorEmail],
  )
  const workloads = useMemo(() => computeOperatorWorkloads(deskClaims), [deskClaims])

  return (
    <div
      className="admin-assignee-bar"
      role="group"
      aria-label="Moderator workload and assignee filter"
      data-testid={`assignee-filter-bar-${desk}`}
    >
      <span className="admin-assignee-label">Assignee</span>
      <button
        type="button"
        className={`admin-assignee-btn ${value === 'all' ? 'is-active' : ''}`}
        onClick={() => onChange('all')}
      >
        All
      </button>
      <button
        type="button"
        className={`admin-assignee-btn ${value === 'unclaimed' ? 'is-active' : ''}`}
        onClick={() => onChange('unclaimed')}
      >
        Unclaimed
      </button>
      <button
        type="button"
        className={`admin-assignee-btn ${value === 'mine' ? 'is-active' : ''}`}
        onClick={() => onChange('mine')}
      >
        Mine <span className="tabular-nums">({myCount})</span>
      </button>

      <select
        className="admin-assignee-select"
        aria-label="Filter by assigned operator"
        value={value !== 'all' && value !== 'unclaimed' && value !== 'mine' ? value : ''}
        onChange={e => onChange(e.target.value || 'all')}
      >
        <option value="">Operator Workload…</option>
        {workloads.map(w => (
          <option key={w.operatorEmail} value={w.operatorEmail}>
            {w.displayName} · {w.totalClaimed} active
          </option>
        ))}
      </select>
    </div>
  )
}
