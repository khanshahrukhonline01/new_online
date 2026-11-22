import { useState, useMemo, useCallback } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  getCampaigns,
  updateCampaignStatus,
  getDeliverableSubmissions,
  reviewDeliverable,
  getRewardLedger,
  getCampaignAuditEvents,
  getCreatorProfile,
  saveCreatorProfile,
  formatPaiseToInr,
  type Campaign,
} from '../../../../src/modules/campaigns/campaignClient'

export type AdminCampaignDeskSubTab = 'campaign_moderation' | 'deliverable_verification' | 'creator_verification' | 'ledger_audit'

export function AdminCampaignMarketplaceDesk() {
  const [subDesk, setSubDesk] = useState<AdminCampaignDeskSubTab>('campaign_moderation')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('submitted')
  const [deskSearch, setDeskSearch] = useState('')
  const [activeReviewCampaign, setActiveReviewCampaign] = useState<Campaign | null>(null)
  const [moderationNote, setModerationNote] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Load datasets
  const allCampaigns = useMemo(() => {
    return getCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const allDeliverables = useMemo(() => {
    return getDeliverableSubmissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const rewardLedger = useMemo(() => {
    return getRewardLedger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const auditLogs = useMemo(() => {
    return getCampaignAuditEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const sampleCreator = useMemo(() => {
    return getCreatorProfile('creator-rohan-cricket')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return allCampaigns.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (deskSearch.trim()) {
        const q = deskSearch.toLowerCase()
        return (
          c.title.toLowerCase().includes(q) ||
          c.advertiserName.toLowerCase().includes(q) ||
          c.sport.toLowerCase().includes(q) ||
          c.locationCity.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allCampaigns, statusFilter, deskSearch])

  // Actions
  const handleApproveCampaign = (campaignId: string) => {
    const ok = updateCampaignStatus(
      campaignId,
      'published',
      'KhelGrid Super Admin',
      moderationNote || 'Campaign verified: budget, key messages, and disclosure statements comply with safety standards.'
    )
    if (ok) {
      showToast('Campaign approved and published to public marketplace!')
      setActiveReviewCampaign(null)
      setModerationNote('')
      triggerRefresh()
    }
  }

  const handleRejectCampaign = (campaignId: string) => {
    const ok = updateCampaignStatus(
      campaignId,
      'rejected',
      'KhelGrid Super Admin',
      moderationNote || 'Rejected: campaign contains prohibited claims or incomplete deliverables.'
    )
    if (ok) {
      showToast('Campaign status marked as rejected.')
      setActiveReviewCampaign(null)
      setModerationNote('')
      triggerRefresh()
    }
  }

  const handleApproveDeliverable = (submissionId: string) => {
    const ok = reviewDeliverable(
      submissionId,
      'accepted',
      'KhelGrid Moderator',
      'Verified live social post and confirmed #Ad disclosure compliance.'
    )
    if (ok) {
      showToast('Deliverable verified and reward credited into immutable ledger!')
      triggerRefresh()
    }
  }

  const handleRequestRevisionDeliverable = (submissionId: string) => {
    const ok = reviewDeliverable(
      submissionId,
      'revision_requested',
      'KhelGrid Moderator',
      'Missing prominent #Ad / #Sponsored hashtag in caption.'
    )
    if (ok) {
      showToast('Deliverable revision requested.')
      triggerRefresh()
    }
  }

  const handleToggleCreatorVerification = () => {
    const updated = {
      ...sampleCreator,
      isVerifiedCreator: !sampleCreator.isVerifiedCreator,
    }
    saveCreatorProfile(updated)
    showToast(`Creator verification updated: ${updated.isVerifiedCreator ? 'Verified' : 'Unverified'}`)
    triggerRefresh()
  }

  return (
    <div className="admin-ground-oversight-container">
      {/* Sub-Desk Navigation Pills */}
      <div className="admin-ground-nav-bar">
        <div className="admin-ground-tab-group" role="tablist">
          <button
            type="button"
            className={`admin-ground-tab-btn ${subDesk === 'campaign_moderation' ? 'is-active' : ''}`}
            onClick={() => setSubDesk('campaign_moderation')}
            role="tab"
            aria-selected={subDesk === 'campaign_moderation'}
          >
            <SiteIcon name="check-circle" size={15} />
            <span>Campaign Moderation ({allCampaigns.filter(c => c.status === 'submitted').length} pending)</span>
          </button>

          <button
            type="button"
            className={`admin-ground-tab-btn ${subDesk === 'deliverable_verification' ? 'is-active' : ''}`}
            onClick={() => setSubDesk('deliverable_verification')}
            role="tab"
            aria-selected={subDesk === 'deliverable_verification'}
          >
            <SiteIcon name="play" size={15} />
            <span>Deliverable Verification ({allDeliverables.filter(d => d.status === 'submitted').length})</span>
          </button>

          <button
            type="button"
            className={`admin-ground-tab-btn ${subDesk === 'creator_verification' ? 'is-active' : ''}`}
            onClick={() => setSubDesk('creator_verification')}
            role="tab"
            aria-selected={subDesk === 'creator_verification'}
          >
            <SiteIcon name="user-round" size={15} />
            <span>Creator Profiles</span>
          </button>

          <button
            type="button"
            className={`admin-ground-tab-btn ${subDesk === 'ledger_audit' ? 'is-active' : ''}`}
            onClick={() => setSubDesk('ledger_audit')}
            role="tab"
            aria-selected={subDesk === 'ledger_audit'}
          >
            <SiteIcon name="wallet" size={15} />
            <span>Reward Ledger &amp; Audit Trail</span>
          </button>
        </div>

        <button
          type="button"
          className="admin-ground-refresh-btn"
          onClick={triggerRefresh}
          title="Refresh All Records"
        >
          <SiteIcon name="refresh" size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {toastMessage && (
        <div className="admin-floating-toast" role="status" style={{ top: '80px', right: '30px', position: 'fixed', zIndex: 9999 }}>
          <SiteIcon name="check-circle" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SUB-TAB 1: CAMPAIGN MODERATION */}
      {subDesk === 'campaign_moderation' && (
        <div className="admin-oversight-body">
          <div className="admin-ground-filter-row">
            <div className="admin-ground-search-box">
              <SiteIcon name="search" size={15} />
              <input
                type="text"
                placeholder="Search campaign title, academy, sport..."
                value={deskSearch}
                onChange={e => setDeskSearch(e.target.value)}
              />
            </div>

            <div className="admin-ground-select-wrap">
              <label htmlFor="camp-status-select">Status Filter:</label>
              <select
                id="camp-status-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Campaigns</option>
                <option value="submitted">Submitted (Awaiting Approval)</option>
                <option value="published">Published (Live in Marketplace)</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="admin-ground-table-card">
            <div className="admin-table-card-header">
              <h4>Advertiser Campaigns ({filteredCampaigns.length})</h4>
              <span className="admin-table-hint">
                Verify that campaign briefs adhere to anti-spam policies and require #Ad disclosures.
              </span>
            </div>

            <div className="admin-table-responsive">
              <table className="admin-ground-data-table" aria-label="Campaign Moderation Queue">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Campaign Title</th>
                    <th>Advertiser &amp; Role</th>
                    <th>Sport &amp; City</th>
                    <th>Budget (INR)</th>
                    <th>Per Deliv Fee</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="admin-empty-cell">
                        No campaigns found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map(camp => (
                      <tr key={camp.id}>
                        <td><code>{camp.id}</code></td>
                        <td>
                          <strong>{camp.title}</strong>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{camp.category}</div>
                        </td>
                        <td>
                          {camp.advertiserName}
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>({camp.advertiserRole})</div>
                        </td>
                        <td>
                          {camp.sport} · {camp.locationCity}
                        </td>
                        <td>
                          <strong>{formatPaiseToInr(camp.totalBudgetPaise)}</strong>
                        </td>
                        <td>{formatPaiseToInr(camp.perDeliverableFeePaise)}</td>
                        <td>
                          <span className={`admin-ground-status-badge status-${camp.status}`}>
                            {camp.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="btn-action-select"
                              onClick={() => {
                                setActiveReviewCampaign(camp)
                                setModerationNote(camp.moderationNotes || '')
                              }}
                            >
                              Review Brief
                            </button>
                            {camp.status === 'submitted' && (
                              <button
                                type="button"
                                className="btn-action-accept"
                                onClick={() => handleApproveCampaign(camp.id)}
                                title="Approve immediately"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Campaign Review Modal */}
          {activeReviewCampaign && (
            <div className="modal-backdrop" onClick={() => setActiveReviewCampaign(null)}>
              <div
                className="campaign-modal-dialog"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mod-modal-title"
              >
                <div className="modal-header">
                  <div>
                    <span className="modal-eyebrow">MODERATION REVIEW · {activeReviewCampaign.id}</span>
                    <h3 id="mod-modal-title" className="modal-title">{activeReviewCampaign.title}</h3>
                  </div>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setActiveReviewCampaign(null)}
                    aria-label="Close"
                  >
                    <SiteIcon name="close" size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-data-grid">
                    <div>
                      <span className="data-label">Advertiser:</span>
                      <strong>{activeReviewCampaign.advertiserName} ({activeReviewCampaign.advertiserRole})</strong>
                    </div>
                    <div>
                      <span className="data-label">Contact Email:</span>
                      <span>{activeReviewCampaign.advertiserContact}</span>
                    </div>
                    <div>
                      <span className="data-label">Total Budget:</span>
                      <strong>{formatPaiseToInr(activeReviewCampaign.totalBudgetPaise)}</strong>
                    </div>
                    <div>
                      <span className="data-label">Per Deliverable Fee:</span>
                      <strong>{formatPaiseToInr(activeReviewCampaign.perDeliverableFeePaise)}</strong>
                    </div>
                  </div>

                  <div className="modal-sec">
                    <h4>Purpose &amp; Audience</h4>
                    <p>{activeReviewCampaign.purpose}</p>
                    <p><strong>Target:</strong> {activeReviewCampaign.targetAudience}</p>
                  </div>

                  <div className="modal-sec">
                    <h4>Deliverables</h4>
                    {activeReviewCampaign.deliverables.map(del => (
                      <div key={del.id} className="deliverable-spec-card">
                        <strong>{del.title} ({del.quantity}x {del.type})</strong>
                        <p>{del.description}</p>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                          <div><strong>Disclosure:</strong> {del.mandatoryDisclosure}</div>
                          <div><strong>Hashtags:</strong> {del.requiredHashtags.join(' ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="modal-sec">
                    <h4>Key Messages</h4>
                    <ul className="bullet-list">
                      {activeReviewCampaign.keyMessages.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>

                  {activeReviewCampaign.prohibitedClaims.length > 0 && (
                    <div className="modal-sec prohibited-box">
                      <h4>Prohibited Claims</h4>
                      <ul className="bullet-list warning-list">
                        {activeReviewCampaign.prohibitedClaims.map((claim, i) => (
                          <li key={i}>{claim}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="modal-sec">
                    <label htmlFor="mod-notes-input" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                      Moderation Notes / Decision Reason:
                    </label>
                    <textarea
                      id="mod-notes-input"
                      rows={2}
                      value={moderationNote}
                      onChange={e => setModerationNote(e.target.value)}
                      placeholder="Add compliance notes or reason for approval/rejection..."
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-sec-action"
                    onClick={() => setActiveReviewCampaign(null)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-action-decline"
                    style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                    onClick={() => handleRejectCampaign(activeReviewCampaign.id)}
                  >
                    Reject Campaign
                  </button>
                  <button
                    type="button"
                    className="btn-action-accept"
                    onClick={() => handleApproveCampaign(activeReviewCampaign.id)}
                  >
                    Approve &amp; Publish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DELIVERABLE VERIFICATION */}
      {subDesk === 'deliverable_verification' && (
        <div className="admin-oversight-body">
          <div className="admin-ground-table-card">
            <div className="admin-table-card-header">
              <h4>Submitted Social Deliverables ({allDeliverables.length})</h4>
              <span className="admin-table-hint">
                Inspect canonical social media URLs to verify compliant #Ad sponsorship disclosures and authentic athletic content.
              </span>
            </div>

            <div className="admin-table-responsive">
              <table className="admin-ground-data-table" aria-label="Deliverable Verification Desk">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Campaign</th>
                    <th>Creator</th>
                    <th>Format &amp; Platform</th>
                    <th>Canonical Post URL</th>
                    <th>#Ad Disclosure</th>
                    <th>Contracted Reward</th>
                    <th>Status</th>
                    <th>Moderation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allDeliverables.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="admin-empty-cell">
                        No deliverable submissions found.
                      </td>
                    </tr>
                  ) : (
                    allDeliverables.map(deliv => (
                      <tr key={deliv.id}>
                        <td><code>{deliv.id}</code></td>
                        <td><strong>{deliv.campaignTitle}</strong></td>
                        <td>{deliv.creatorName}</td>
                        <td>
                          <span className="platform-tag">{deliv.platform}</span> · {deliv.deliverableType}
                        </td>
                        <td>
                          <a
                            href={deliv.canonicalPostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="live-post-link"
                          >
                            <span>Inspect Post</span>
                            <SiteIcon name="external-link" size={13} />
                          </a>
                        </td>
                        <td>
                          {deliv.disclosureVerified ? (
                            <span className="disclosure-badge verified">
                              <SiteIcon name="check" size={12} /> Confirmed
                            </span>
                          ) : (
                            <span className="disclosure-badge unverified">Missing</span>
                          )}
                        </td>
                        <td>
                          <strong>{formatPaiseToInr(deliv.rewardAmountPaise)}</strong>
                        </td>
                        <td>
                          <span className={`admin-ground-status-badge status-${deliv.status}`}>
                            {deliv.status}
                          </span>
                        </td>
                        <td>
                          {deliv.status === 'submitted' ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn-action-accept"
                                onClick={() => handleApproveDeliverable(deliv.id)}
                                title="Approve deliverable and record into reward ledger"
                              >
                                Approve &amp; Pay
                              </button>
                              <button
                                type="button"
                                className="btn-action-decline"
                                onClick={() => handleRequestRevisionDeliverable(deliv.id)}
                                title="Request revision"
                              >
                                Revision
                              </button>
                            </div>
                          ) : deliv.status === 'accepted' ? (
                            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                              <SiteIcon name="check-circle" size={13} /> Recorded in Ledger
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {deliv.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CREATOR VERIFICATION */}
      {subDesk === 'creator_verification' && (
        <div className="admin-oversight-body">
          <div className="admin-ground-table-card">
            <div className="admin-table-card-header">
              <h4>Creator Verification &amp; Sports Content Integrity</h4>
              <span className="admin-table-hint">
                Review grassroots sports creators, ensure identity authenticity, and prevent sybil attacks.
              </span>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>{sampleCreator.displayName}</h3>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {sampleCreator.handle} · {sampleCreator.primarySport} · {sampleCreator.locationCity}
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      className={sampleCreator.isVerifiedCreator ? 'btn-action-decline' : 'btn-action-accept'}
                      onClick={handleToggleCreatorVerification}
                    >
                      {sampleCreator.isVerifiedCreator ? 'Revoke Verification' : 'Grant Verified Creator Badge'}
                    </button>
                  </div>
                </div>

                <p style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '0.875rem' }}>{sampleCreator.bio}</p>

                <h5 style={{ margin: '0 0 0.5rem 0', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                  Linked Channels ({sampleCreator.platforms.length})
                </h5>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {sampleCreator.platforms.map((plat, idx) => (
                    <div key={idx} style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8125rem' }}>
                      <strong>{plat.platform.toUpperCase()}</strong>: {plat.handle}
                      <div style={{ color: '#059669', fontWeight: 600 }}>{plat.followerCount.toLocaleString('en-IN')} followers</div>
                      <a href={plat.channelUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'none', fontSize: '0.75rem' }}>
                        Visit Channel
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: REWARD LEDGER & AUDIT TRAIL */}
      {subDesk === 'ledger_audit' && (
        <div className="admin-oversight-body">
          {/* Append-Only Ledger */}
          <div className="admin-ground-table-card" style={{ marginBottom: '1.5rem' }}>
            <div className="admin-table-card-header">
              <h4>Append-Only Reward Ledger ({rewardLedger.length} entries)</h4>
              <span className="admin-table-hint">
                Immutable ledger recording all contracted creator rewards approved by advertisers and moderators.
              </span>
            </div>

            <div className="admin-table-responsive">
              <table className="admin-ground-data-table" aria-label="Append-Only Reward Ledger">
                <thead>
                  <tr>
                    <th>Ledger Entry ID</th>
                    <th>Created Timestamp</th>
                    <th>Creator ID</th>
                    <th>Campaign ID</th>
                    <th>Amount (INR)</th>
                    <th>Amount (Paise)</th>
                    <th>Status</th>
                    <th>Compliance / Payout Lockdown Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rewardLedger.map(entry => (
                    <tr key={entry.id}>
                      <td><code>{entry.id}</code></td>
                      <td>{new Date(entry.createdAt).toLocaleString('en-IN')}</td>
                      <td><code>{entry.creatorId}</code></td>
                      <td><code>{entry.campaignId}</code></td>
                      <td><strong style={{ color: '#059669' }}>{formatPaiseToInr(entry.amountPaise)}</strong></td>
                      <td><code>{entry.amountPaise} paise</code></td>
                      <td>
                        <span className="admin-ground-status-badge status-published">
                          {entry.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{entry.payoutLockdownNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="admin-ground-table-card">
            <div className="admin-table-card-header">
              <h4>Campaign &amp; Marketplace Audit Logs ({auditLogs.length} events)</h4>
              <span className="admin-table-hint">
                Append-only audit trail logging all lifecycle events, actor actions, and moderation decisions.
              </span>
            </div>

            <div className="admin-table-responsive">
              <table className="admin-ground-data-table" aria-label="Audit Logs Table">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Audit Reason / Log</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-empty-cell">No audit log entries recorded yet.</td>
                    </tr>
                  ) : (
                    auditLogs.map(evt => (
                      <tr key={evt.id}>
                        <td><code>{evt.id}</code></td>
                        <td>{new Date(evt.timestamp).toLocaleString('en-IN')}</td>
                        <td><code>{evt.action}</code></td>
                        <td><strong>{evt.actor}</strong></td>
                        <td>{evt.entityType}</td>
                        <td><code>{evt.entityId}</code></td>
                        <td style={{ fontSize: '0.8125rem' }}>{evt.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
