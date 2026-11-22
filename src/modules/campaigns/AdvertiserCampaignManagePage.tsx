import React, { useState, useMemo, useCallback } from 'react'
import {
  getCampaigns,
  getCampaignApplications,
  updateApplicationStatus,
  getDeliverableSubmissions,
  reviewDeliverable,
  getRewardLedger,
  formatPaiseToInr,
} from './campaignClient'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './AdvertiserCampaignManagePage.css'

interface AdvertiserCampaignManagePageProps {
  onNavigate?: (event?: React.MouseEvent<HTMLAnchorElement>, target?: string) => void
}

export function AdvertiserCampaignManagePage({ onNavigate }: AdvertiserCampaignManagePageProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  const handleNav = (targetPath: string, e?: React.MouseEvent<HTMLAnchorElement>) => {
    if (e) e.preventDefault()
    if (onNavigate) {
      onNavigate(e, targetPath)
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetPath)
      window.dispatchEvent(new PopStateEvent('popstate'))
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
                                      className="btn-action-reject"
                                      onClick={() => handleRejectDeliverable(sub.id)}
                                      title="Reject deliverable"
                                    >
                                      Reject
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
    </div>
  )
}
