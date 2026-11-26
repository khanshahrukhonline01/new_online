import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import { subscribeRegulatoryState } from '../../../../src/shared/governance/regulatoryBridge'
import {
  getMakerCheckerProposals,
  reviewMakerCheckerProposal,
  withdrawMakerCheckerProposal,
  type MakerCheckerProposal,
  type MakerCheckerStatus,
} from '../services/adminGovernanceEscalationService'
import './AdminMakerCheckerPanel.css'

export interface AdminMakerCheckerPanelProps {
  operatorEmail: string
  onNotify?: (message: string, isError?: boolean) => void
}

export function AdminMakerCheckerPanel({
  operatorEmail,
  onNotify,
}: AdminMakerCheckerPanelProps) {
  const [proposals, setProposals] = useState<MakerCheckerProposal[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | MakerCheckerStatus>('all')
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(() => {
    setProposals(getMakerCheckerProposals())
  }, [])

  useEffect(() => {
    reload()
    return subscribeRegulatoryState(reload)
  }, [reload])

  const counts = useMemo(() => {
    return {
      pending: proposals.filter(p => p.status === 'pending_approval').length,
      approved: proposals.filter(p => p.status === 'approved_executed').length,
      closedOther: proposals.filter(
        p => p.status === 'rejected' || p.status === 'withdrawn',
      ).length,
    }
  }, [proposals])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return proposals
    return proposals.filter(p => p.status === statusFilter)
  }, [proposals, statusFilter])

  const handleReview = async (
    proposal: MakerCheckerProposal,
    decision: 'approve' | 'reject',
  ) => {
    setBusyId(proposal.id)
    try {
      const updated = await reviewMakerCheckerProposal({
        proposalId: proposal.id,
        decision,
        checkerEmail: operatorEmail,
        notes: notesById[proposal.id] || '',
      })
      onNotify?.(
        decision === 'approve'
          ? `Counter-signed ${updated.referenceCode}: ${updated.executionSummary}`
          : `Rejected ${updated.referenceCode}. No platform changes applied.`,
      )
      reload()
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Dual-control decision failed.',
        true,
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleWithdraw = (proposal: MakerCheckerProposal) => {
    try {
      withdrawMakerCheckerProposal(proposal.id, operatorEmail)
      onNotify?.(`Withdrew pending proposal ${proposal.referenceCode}.`)
      reload()
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Could not withdraw proposal.',
        true,
      )
    }
  }

  return (
    <div className="admin-mc-root" data-testid="admin-maker-checker-panel">
      <div className="admin-mc-banner">
        <div className="admin-mc-banner-text">
          <span className="admin-mc-banner-title">
            <SiteIcon name="shield-check" size={16} />
            <span>Four-Eyes Dual-Control Governance Policy Active</span>
          </span>
          <p className="admin-mc-banner-sub">
            High-impact regulatory actions (organisation suspensions, dispute sanctions, and verified
            seal revocations) require a second administrator to review and counter-sign before
            execution. Makers cannot approve their own proposals.
          </p>
        </div>
      </div>

      <div className="admin-mc-stats-row">
        <div className="admin-mc-stat">
          <span className="admin-mc-stat-val" data-testid="mc-pending-count">
            {counts.pending}
          </span>
          <span className="admin-mc-stat-label">Awaiting Counter-Sign</span>
        </div>
        <div className="admin-mc-stat">
          <span className="admin-mc-stat-val" data-testid="mc-approved-count">
            {counts.approved}
          </span>
          <span className="admin-mc-stat-label">Approved &amp; Executed</span>
        </div>
        <div className="admin-mc-stat">
          <span className="admin-mc-stat-val">{counts.closedOther}</span>
          <span className="admin-mc-stat-label">Rejected / Withdrawn</span>
        </div>
      </div>

      <div className="admin-mc-filter-bar" role="group" aria-label="Filter dual-control proposals">
        {(
          [
            { id: 'all', label: `All (${proposals.length})` },
            { id: 'pending_approval', label: `Pending (${counts.pending})` },
            { id: 'approved_executed', label: `Executed (${counts.approved})` },
            { id: 'rejected', label: 'Rejected' },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`admin-mc-filter-btn ${statusFilter === tab.id ? 'is-active' : ''}`}
            onClick={() => setStatusFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-mc-list">
        {filtered.length === 0 ? (
          <div className="admin-mc-card">
            <p className="admin-mc-justification">
              No dual-control proposals in this filter view.
            </p>
          </div>
        ) : (
          filtered.map(proposal => {
            const isSelfMaker =
              proposal.makerEmail.trim().toLowerCase() ===
              operatorEmail.trim().toLowerCase()

            return (
              <article
                key={proposal.id}
                className={`admin-mc-card is-${proposal.status}`}
                data-testid="maker-checker-proposal-card"
                data-proposal-ref={proposal.referenceCode}
              >
                <div className="admin-mc-card-top">
                  <div>
                    <div className="admin-mc-meta-row">
                      <span className="admin-mc-ref">{proposal.referenceCode}</span>
                      <span className="admin-mc-action-badge">
                        {proposal.actionType.replace(/_/g, ' ')}
                      </span>
                      <span>Target: {proposal.targetEntityName}</span>
                      <span>· Maker: {proposal.makerEmail}</span>
                    </div>
                    <h3 className="admin-mc-title">{proposal.title}</h3>
                  </div>

                  <span className={`admin-mc-status-badge is-${proposal.status}`}>
                    {proposal.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="admin-mc-justification">{proposal.justification}</p>

                <div className="admin-mc-impact-box">
                  <span className="admin-mc-impact-heading">
                    Automated Downstream Enforcement on Counter-Sign
                  </span>
                  <ul className="admin-mc-impact-list">
                    {proposal.impactSummary.map(line => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                {proposal.status === 'pending_approval' ? (
                  <div className="admin-mc-decision-bar">
                    {isSelfMaker ? (
                      <>
                        <span
                          className="admin-mc-self-lock"
                          data-testid={`self-lock-${proposal.referenceCode}`}
                        >
                          <SiteIcon name="lock" size={14} />
                          <span>
                            Four-Eyes Lock: You proposed this action ({operatorEmail}). A second
                            administrator must counter-sign.
                          </span>
                        </span>

                        <div className="admin-mc-btn-group">
                          <button
                            type="button"
                            className="admin-mc-btn admin-mc-btn-approve"
                            disabled
                            title="Makers cannot approve their own proposals"
                          >
                            <SiteIcon name="lock" size={13} />
                            <span>Self-Approval Blocked</span>
                          </button>
                          <button
                            type="button"
                            className="admin-mc-btn"
                            onClick={() => handleWithdraw(proposal)}
                            data-testid={`withdraw-mc-${proposal.referenceCode}`}
                          >
                            <span>Withdraw Proposal</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="admin-mc-note-input"
                          placeholder="Optional checker review note for the immutable audit ledger…"
                          value={notesById[proposal.id] || ''}
                          onChange={e =>
                            setNotesById(prev => ({
                              ...prev,
                              [proposal.id]: e.target.value,
                            }))
                          }
                          aria-label={`Checker notes for ${proposal.referenceCode}`}
                        />

                        <div className="admin-mc-btn-group">
                          <button
                            type="button"
                            className="admin-mc-btn admin-mc-btn-reject"
                            disabled={busyId === proposal.id}
                            onClick={() => void handleReview(proposal, 'reject')}
                            data-testid={`reject-mc-${proposal.referenceCode}`}
                          >
                            <SiteIcon name="close" size={13} />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            className="admin-mc-btn admin-mc-btn-approve"
                            disabled={busyId === proposal.id}
                            onClick={() => void handleReview(proposal, 'approve')}
                            data-testid={`approve-mc-${proposal.referenceCode}`}
                          >
                            <SiteIcon name="check-circle" size={13} />
                            <span>Approve &amp; Execute</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="admin-mc-receipt">
                    <strong>
                      {proposal.status === 'approved_executed'
                        ? `Executed by Checker ${proposal.checkerEmail}`
                        : proposal.status === 'rejected'
                          ? `Rejected by Checker ${proposal.checkerEmail}`
                          : 'Withdrawn'}
                    </strong>
                    {proposal.executionSummary && <div>{proposal.executionSummary}</div>}
                    {proposal.checkerNotes && (
                      <div style={{ marginTop: '0.2rem', opacity: 0.85 }}>
                        Review Note: {proposal.checkerNotes}
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AdminMakerCheckerPanel
