import React, { useState, useMemo, useCallback } from 'react'
import {
  getCampaigns,
  getCampaignApplications,
  updateApplicationStatus,
  getDeliverableSubmissions,
  reviewDeliverable,
  getRewardLedger,
  formatPaiseToInr,
  getCampaignBudgetBreakdown,
  fileCampaignDispute,
} from './campaignClient'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { useRouter } from '../../shared/routing/useRouter'
import './AdvertiserCampaignManagePage.css'

interface AdvertiserCampaignManagePageProps {
  onNavigate?: (event?: React.MouseEvent<HTMLAnchorElement>, target?: string) => void
}

export function AdvertiserCampaignManagePage({ onNavigate }: AdvertiserCampaignManagePageProps) {
  const { navigate } = useRouter()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [revisionModalSubmissionId, setRevisionModalSubmissionId] = useState<string | null>(null)
  const [revisionNotes, setRevisionNotes] = useState('')

  const handleNav = (targetPath: string, e?: React.MouseEvent<HTMLAnchorElement>) => {
    if (e) e.preventDefault()
    if (onNavigate) {
      onNavigate(e, targetPath)
    } else {
      navigate(targetPath, { event: e })
    }
  }

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Load all campaigns
  const campaigns = useMemo(() => {
    return getCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // Load all applications
  const applications = useMemo(() => {
    return getCampaignApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // Load all deliverables
  const deliverables = useMemo(() => {
    return getDeliverableSubmissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // Load reward ledger
  const rewardLedger = useMemo(() => {
    return getRewardLedger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // Filtered campaigns
  const displayedCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (selectedCampaignId !== 'all' && c.id !== selectedCampaignId) return false
      return true
    })
  }, [campaigns, statusFilter, selectedCampaignId])

  // Metrics
  const totalBudgetPaise = useMemo(() => {
    return campaigns.reduce((acc, c) => acc + c.totalBudgetPaise, 0)
  }, [campaigns])

  const totalRewardsApprovedPaise = useMemo(() => {
    return rewardLedger.reduce((acc, r) => acc + r.amountPaise, 0)
  }, [rewardLedger])

  const budgetBreakdown = useMemo(() => {
    if (selectedCampaignId !== 'all') {
      return getCampaignBudgetBreakdown(selectedCampaignId)
    }
    const totalBudget = campaigns.reduce((acc, c) => acc + c.totalBudgetPaise, 0)
    const committed = applications.filter(a => a.status === 'selected').length * 400000
    const paid = rewardLedger.reduce((acc, r) => acc + r.amountPaise, 0)
    const reserve = Math.max(0, totalBudget - committed)
    return {
      campaignId: 'all',
      totalBudgetPaise: totalBudget,
      committedPaise: committed,
      approvedAndPaidPaise: paid,
      availableReservePaise: reserve,
      activeAssignmentsCount: applications.filter(a => a.status === 'selected').length,
      completedDeliverablesCount: deliverables.filter(d => d.status === 'accepted').length,
    }
  }, [selectedCampaignId, campaigns, applications, rewardLedger, deliverables])

  const handleSelectCreator = (applicationId: string) => {
    const ok = updateApplicationStatus(applicationId, 'selected', 'Advertiser Director', 'Creator selected for campaign deliverable.')
    if (ok) {
      setActionFeedback('Creator selected! Deliverable slot assigned.')
      triggerRefresh()
      setTimeout(() => setActionFeedback(null), 3000)
    }
  }

  const handleDeclineCreator = (applicationId: string) => {
    const ok = updateApplicationStatus(applicationId, 'declined', 'Advertiser Director', 'Application declined.')
    if (ok) {
      setActionFeedback('Application marked as declined.')
      triggerRefresh()
      setTimeout(() => setActionFeedback(null), 3000)
    }
  }

  const handleAcceptDeliverable = (submissionId: string) => {
    const ok = reviewDeliverable(submissionId, 'accepted', 'Advertiser Director', 'Deliverable verified with compliant #Ad disclosure.')
    if (ok) {
      setActionFeedback('Deliverable accepted! Reward added to append-only ledger.')
      triggerRefresh()
      setTimeout(() => setActionFeedback(null), 3500)
    }
  }

  const handleRejectDeliverable = (submissionId: string) => {
    const ok = reviewDeliverable(submissionId, 'rejected', 'Advertiser Director', 'Deliverable does not meet campaign specifications.')
    if (ok) {
      setActionFeedback('Deliverable rejected.')
      triggerRefresh()
      setTimeout(() => setActionFeedback(null), 3000)
    }
  }

  const handleRequestRevisionSubmit = () => {
    if (!revisionModalSubmissionId) return
    if (!revisionNotes.trim()) {
      setActionFeedback('Please provide specific revision notes for the creator.')
      return
    }
    const ok = reviewDeliverable(revisionModalSubmissionId, 'revision_requested', 'Advertiser Director', revisionNotes)
    if (ok) {
      setActionFeedback('Revision requested from creator.')
      setRevisionModalSubmissionId(null)
      setRevisionNotes('')
      triggerRefresh()
      setTimeout(() => setActionFeedback(null), 3000)
    }
  }

  const handleEscalateDispute = (submission: (typeof deliverables)[0]) => {
    const res = fileCampaignDispute({
      campaignId: submission.campaignId,
      submissionId: submission.id,
      raisedBy: 'advertiser',
      reason: 'Deliverable non-compliance / specifications not met',
      statement: `Advertiser requested arbitration for deliverable ${submission.id}. Verification notes: ${submission.reviewNotes || 'Non-compliant format'}`,
      actorName: 'Campaign Owner',
    })
    if (res.success) {
      setActionFeedback('Dispute submitted for KhelGrid Admin arbitration.')
      triggerRefresh()
      setTimeout(() => setActionFeedback(null), 3500)
    }
  }

  return (
    <div className="advertiser-manage-page">
      {/* Top Breadcrumb */}
      <div className="manage-top-bar">
        <div className="manage-breadcrumbs">
          <button type="button" className="crumb-btn" onClick={() => handleNav('/')}>
            <SiteIcon name="home" size={14} /> Home
          </button>
          <span className="crumb-sep">/</span>
          <button type="button" className="crumb-btn" onClick={() => handleNav('/campaigns')}>
            Campaigns
          </button>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Advertiser Management Studio</span>
        </div>
        <div className="manage-top-actions">
          <button
            type="button"
            className="btn-sec-action"
            onClick={() => handleNav('/creator')}
          >
            <SiteIcon name="user-round" size={15} />
            <span>Switch to Creator Hub</span>
          </button>
          <button
            type="button"
            className="btn-pri-action"
            onClick={() => handleNav('/campaigns/create')}
          >
            <SiteIcon name="plus" size={15} />
            <span>Post New Campaign</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="manage-header">
        <div className="manage-badge">
          <SiteIcon name="building" size={14} />
          <span>Advertiser &amp; Academy Campaign Desk</span>
        </div>
        <h1>Campaign Management &amp; Deliverables Review</h1>
        <p>
          Monitor campaign status, review creator applications, inspect submitted live links, and approve contracted rewards into the immutable ledger.
        </p>
      </header>

      {actionFeedback && (
        <div className="action-feedback-toast" role="status">
          <SiteIcon name="check-circle" size={16} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <section className="stats-kpi-grid" aria-label="Campaign Overview Metrics">
        <div className="stat-card">
          <span className="stat-label">Total Campaigns</span>
          <strong className="stat-value">{campaigns.length}</strong>
          <span className="stat-sub">Across all sports</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Creator Applications</span>
          <strong className="stat-value">{applications.length}</strong>
          <span className="stat-sub">{applications.filter(a => a.status === 'applied').length} awaiting review</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Deliverables Received</span>
          <strong className="stat-value">{deliverables.length}</strong>
          <span className="stat-sub">{deliverables.filter(d => d.status === 'submitted').length} pending review</span>
        </div>

        <div className="stat-card highlight-green">
          <span className="stat-label">Approved Rewards (Ledger)</span>
          <strong className="stat-value">{formatPaiseToInr(totalRewardsApprovedPaise)}</strong>
          <span className="stat-sub">Total budget: {formatPaiseToInr(totalBudgetPaise)}</span>
        </div>
      </section>

      {/* Escrow Budget Tracker */}
      <section className="escrow-budget-tracker" aria-label="Escrow Budget Allocation">
        <div className="escrow-tracker-header">
          <h3>
            <SiteIcon name="shield-check" size={16} /> Escrow Budget Allocation
            {selectedCampaignId !== 'all' ? ` · ${campaigns.find(c => c.id === selectedCampaignId)?.title || ''}` : ' (All Campaigns)'}
          </h3>
          <span>Total Funded: <strong>{formatPaiseToInr(budgetBreakdown.totalBudgetPaise)}</strong></span>
        </div>

        {/* Multi-segment progress bar */}
        <div className="escrow-meter-bar">
          <div
            className="escrow-segment-paid"
            style={{ width: `${Math.min(100, (budgetBreakdown.approvedAndPaidPaise / Math.max(1, budgetBreakdown.totalBudgetPaise)) * 100)}%` }}
            title={`Paid: ${formatPaiseToInr(budgetBreakdown.approvedAndPaidPaise)}`}
          />
          <div
            className="escrow-segment-committed"
            style={{ width: `${Math.min(100, (budgetBreakdown.committedPaise / Math.max(1, budgetBreakdown.totalBudgetPaise)) * 100)}%` }}
            title={`Committed: ${formatPaiseToInr(budgetBreakdown.committedPaise)}`}
          />
          <div
            className="escrow-segment-reserve"
            style={{ width: `${Math.min(100, (budgetBreakdown.availableReservePaise / Math.max(1, budgetBreakdown.totalBudgetPaise)) * 100)}%` }}
            title={`Reserve: ${formatPaiseToInr(budgetBreakdown.availableReservePaise)}`}
          />
        </div>

        <div className="escrow-legend">
          <div className="escrow-legend-item">
            <span className="legend-dot paid" />
            <span>Approved &amp; Paid: <strong>{formatPaiseToInr(budgetBreakdown.approvedAndPaidPaise)}</strong></span>
          </div>
          <div className="escrow-legend-item">
            <span className="legend-dot committed" />
            <span>Committed to Creators: <strong>{formatPaiseToInr(budgetBreakdown.committedPaise)}</strong></span>
          </div>
          <div className="escrow-legend-item">
            <span className="legend-dot reserve" />
            <span>Unallocated Reserve: <strong>{formatPaiseToInr(budgetBreakdown.availableReservePaise)}</strong></span>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="manage-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-select-group">
            <label htmlFor="camp-filter">Campaign:</label>
            <select
              id="camp-filter"
              value={selectedCampaignId}
              onChange={e => setSelectedCampaignId(e.target.value)}
            >
              <option value="all">All Campaigns ({campaigns.length})</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-select-group">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="submitted">Submitted (Moderation)</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          className="btn-refresh"
          onClick={triggerRefresh}
          title="Refresh Data"
        >
          <SiteIcon name="refresh" size={14} /> Refresh
        </button>
      </section>

      {/* Campaigns & Deliverables Review */}
      <div className="campaigns-manage-list">
        {displayedCampaigns.length === 0 ? (
          <div className="no-data-card">
            <SiteIcon name="alert-circle" size={32} />
            <h3>No campaigns found</h3>
            <p>You haven't created any campaigns matching the selected filters yet.</p>
            <button
              type="button"
              className="btn-pri-action"
              onClick={() => handleNav('/campaigns/create')}
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          displayedCampaigns.map(camp => {
            const campApps = applications.filter(a => a.campaignId === camp.id)
            const campDeliverables = deliverables.filter(d => d.campaignId === camp.id)

            return (
              <article key={camp.id} className="manage-campaign-card">
                <div className="campaign-card-header">
                  <div>
                    <div className="card-badge-row">
                      <span className={`status-pill status-${camp.status}`}>
                        {camp.status.toUpperCase()}
                      </span>
                      <span className="sport-pill">{camp.sport}</span>
                      <span className="location-pill">{camp.locationCity}</span>
                    </div>
                    <h2 className="card-camp-title">{camp.title}</h2>
                    <p className="card-camp-org">
                      <strong>{camp.advertiserName}</strong> ({camp.advertiserRole}) · Contact: {camp.advertiserContact}
                    </p>
                  </div>

                  <div className="card-budget-summary">
                    <span className="budget-lbl">Total Budget</span>
                    <strong className="budget-val">{formatPaiseToInr(camp.totalBudgetPaise)}</strong>
                    <span className="budget-sub">{formatPaiseToInr(camp.perDeliverableFeePaise)} / deliverable</span>
                  </div>
                </div>

                {camp.status === 'submitted' && (
                  <div className="moderation-pending-callout">
                    <SiteIcon name="clock" size={16} />
                    <span>
                      This campaign is currently in editorial review by KhelGrid Admin moderators. It will be published to the public marketplace once verified.
                    </span>
                  </div>
                )}

                {/* Sub-Section 1: Creator Applications */}
                <div className="sub-manage-section">
                  <div className="sub-sec-title">
                    <SiteIcon name="users" size={16} />
                    <h3>Creator Applications ({campApps.length})</h3>
                  </div>

                  {campApps.length === 0 ? (
                    <p className="empty-sub-text">No creator applications received yet for this campaign.</p>
                  ) : (
                    <div className="applications-table-wrap">
                      <table className="manage-table" aria-label={`Applications for ${camp.title}`}>
                        <thead>
                          <tr>
                            <th>Creator</th>
                            <th>Platform &amp; Handle</th>
                            <th>Followers</th>
                            <th>Pitch Note</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campApps.map(app => (
                            <tr key={app.id}>
                              <td>
                                <strong>{app.creatorName}</strong>
                              </td>
                              <td>
                                <span className="platform-tag">{app.platform}</span>
                                <div><code>{app.creatorHandle}</code></div>
                              </td>
                              <td>{app.followerCount.toLocaleString('en-IN')}</td>
                              <td className="cell-pitch">{app.pitchNote}</td>
                              <td>
                                <span className={`app-status-badge status-${app.status}`}>
                                  {app.status}
                                </span>
                              </td>
                              <td>
                                {app.status === 'applied' && (
                                  <div className="action-btn-row">
                                    <button
                                      type="button"
                                      className="btn-action-select"
                                      onClick={() => handleSelectCreator(app.id)}
                                      title="Select this creator"
                                    >
                                      Select
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-action-decline"
                                      onClick={() => handleDeclineCreator(app.id)}
                                      title="Decline application"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                )}
                                {app.status === 'selected' && (
                                  <span className="status-note-text">Deliverable in progress</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Sub-Section 2: Deliverable Submissions */}
                <div className="sub-manage-section">
                  <div className="sub-sec-title">
                    <SiteIcon name="file-text" size={16} />
                    <h3>Deliverable Submissions ({campDeliverables.length})</h3>
                  </div>

                  {campDeliverables.length === 0 ? (
                    <p className="empty-sub-text">No deliverables submitted yet by creators.</p>
                  ) : (
                    <div className="deliverables-table-wrap">
                      <table className="manage-table" aria-label={`Deliverables for ${camp.title}`}>
                        <thead>
                          <tr>
                            <th>Creator</th>
                            <th>Format</th>
                            <th>Published Live Post Link</th>
                            <th>Disclosure (#Ad)</th>
                            <th>Reward</th>
                            <th>Status</th>
                            <th>Verification Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campDeliverables.map(sub => (
                            <tr key={sub.id}>
                              <td>
                                <strong>{sub.creatorName}</strong>
                              </td>
                              <td>
                                <span className="format-tag">{sub.deliverableType.replace('_', ' ')}</span>
                              </td>
                              <td>
                                <a
                                  href={sub.canonicalPostUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="live-post-link"
                                >
                                  <span>Open Live Post</span>
                                  <SiteIcon name="external-link" size={13} />
                                </a>
                              </td>
                              <td>
                                {sub.disclosureVerified ? (
                                  <span className="disclosure-badge verified">
                                    <SiteIcon name="check" size={12} /> #Ad Verified
                                  </span>
                                ) : (
                                  <span className="disclosure-badge unverified">Missing</span>
                                )}
                              </td>
                              <td>
                                <strong>{formatPaiseToInr(sub.rewardAmountPaise)}</strong>
                              </td>
                              <td>
                                <span className={`sub-status-badge status-${sub.status}`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td>
                                {sub.status === 'submitted' && (
                                  <div className="action-btn-row">
                                    <button
                                      type="button"
                                      className="btn-action-accept"
                                      onClick={() => handleAcceptDeliverable(sub.id)}
                                      title="Accept deliverable and approve reward into ledger"
                                    >
                                      Accept &amp; Pay
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-action-revision"
                                      onClick={() => {
                                        setRevisionModalSubmissionId(sub.id)
                                        setRevisionNotes('')
                                      }}
                                      title="Request structured revision from creator"
                                    >
                                      Revision
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-action-reject"
                                      onClick={() => handleRejectDeliverable(sub.id)}
                                      title="Reject deliverable"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-action-reject"
                                      style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
                                      onClick={() => handleEscalateDispute(sub)}
                                      title="Escalate dispute to KhelGrid Admin Desk"
                                    >
                                      Dispute
                                    </button>
                                  </div>
                                )}
                                {sub.status === 'accepted' && (
                                  <span className="reward-approved-tag">
                                    <SiteIcon name="check-circle" size={13} /> Reward Ledger Recorded
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </article>
            )
          })
        )}
      </div>
      {/* Structured Revision Request Modal */}
      {revisionModalSubmissionId && (
        <div className="modal-backdrop" onClick={() => setRevisionModalSubmissionId(null)}>
          <div
            className="campaign-modal-dialog"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rev-modal-title"
            style={{ maxWidth: '480px', margin: 'auto', background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 id="rev-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Request Deliverable Revision
              </h3>
              <button
                type="button"
                onClick={() => setRevisionModalSubmissionId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Close"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Specify the exact adjustments required from the creator (e.g. caption hashtag, audio level, or prominent disclosure).
            </p>
            <div style={{ marginBottom: '1.25rem' }}>
              <textarea
                rows={4}
                value={revisionNotes}
                onChange={e => setRevisionNotes(e.target.value)}
                placeholder="e.g. Please add #Ad disclosure in the first two lines of caption..."
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-sec-action"
                onClick={() => setRevisionModalSubmissionId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-pri-action"
                onClick={handleRequestRevisionSubmit}
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
