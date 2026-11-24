import { useState, useMemo, useCallback, type FC } from 'react'
import { SiteIcon } from '../../../../src/shared/components/SiteIcon'
import {
  getAdminCreatorCampaignDashboard,
  moderateCampaignBrief,
  triageBrandApplication,
  reviewCreativeDeliverable,
  auditSocialAttribution,
  verifyCampaignMilestone,
  toggleCreatorVerificationStatus,
  arbitrateCampaignDispute,
  exportCreatorOpsLedgerToCsv,
  resetAdminCreatorOpsForTesting,
  formatPaiseToInr,
  scanCampaignPolicyCompliance,
  validateDeliverableUrl,
  type Campaign,
  type AdminBrandApplication,
  type DeliverableSubmission,
  type SocialAttributionRecord,
  type CampaignMilestoneRecord,
  type AttributionAuditStatus,
} from '../services/adminCreatorCampaignService'
import './AdminCampaignMarketplaceDesk.css'

export type AdminCampaignDeskSubTab =
  | 'campaign_moderation'
  | 'brand_applications'
  | 'deliverable_verification'
  | 'social_attribution'
  | 'milestone_completions'
  | 'dispute_arbitration'
  | 'creator_verification'
  | 'ledger_audit'

export interface AdminCampaignMarketplaceDeskProps {
  operatorEmail?: string
}

function getAuthenticityColor(score: number): string {
  if (score >= 85) return '#10b981'
  if (score >= 65) return '#f59e0b'
  return '#ef4444'
}

function formatDateShort(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export const AdminCampaignMarketplaceDesk: FC<AdminCampaignMarketplaceDeskProps> = ({
  operatorEmail = 'creator.ops@khelgrid.com',
}) => {
  const operator = useMemo(
    () => ({
      name: operatorEmail.split('@')[0] || 'Creator Operations Lead',
      email: operatorEmail,
    }),
    [operatorEmail],
  )

  const [subDesk, setSubDesk] = useState<AdminCampaignDeskSubTab>('campaign_moderation')
  const [refreshTick, setRefreshTick] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Slide-over inspection drawer state
  const [inspectingCampaign, setInspectingCampaign] = useState<Campaign | null>(null)
  const [inspectingApplication, setInspectingApplication] = useState<AdminBrandApplication | null>(null)
  const [inspectingAttribution, setInspectingAttribution] = useState<SocialAttributionRecord | null>(null)
  const [drawerNote, setDrawerNote] = useState('')

  // Revision / Audit Confirmation Modal state
  const [decisionModal, setDecisionModal] = useState<{
    kind: 'deliverable_revision' | 'milestone_review' | 'attribution_audit'
    id: string
    title: string
    actionLabel: string
    targetDecision: string
  } | null>(null)
  const [decisionReason, setDecisionReason] = useState('')

  const triggerRefresh = useCallback(() => {
    setRefreshTick(prev => prev + 1)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }, [])

  const snapshot = useMemo(() => {
    void refreshTick
    return getAdminCreatorCampaignDashboard()
  }, [refreshTick])

  const {
    campaigns,
    applications,
    deliverables,
    attributions,
    milestones,
    creators,
    disputes,
    rewardLedger,
    auditLogs,
    metrics,
  } = snapshot

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!normalizedQuery) return true
      return (
        c.title.toLowerCase().includes(normalizedQuery) ||
        c.advertiserName.toLowerCase().includes(normalizedQuery) ||
        c.sport.toLowerCase().includes(normalizedQuery) ||
        c.locationCity.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [campaigns, statusFilter, normalizedQuery])

  const filteredApplications = useMemo(() => {
    return applications.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (!normalizedQuery) return true
      return (
        a.creatorName.toLowerCase().includes(normalizedQuery) ||
        a.creatorHandle.toLowerCase().includes(normalizedQuery) ||
        a.campaignTitle.toLowerCase().includes(normalizedQuery) ||
        a.sportSpecialty.toLowerCase().includes(normalizedQuery) ||
        a.city.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [applications, statusFilter, normalizedQuery])

  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (!normalizedQuery) return true
      return (
        d.campaignTitle.toLowerCase().includes(normalizedQuery) ||
        d.creatorName.toLowerCase().includes(normalizedQuery) ||
        d.canonicalPostUrl.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [deliverables, statusFilter, normalizedQuery])

  const filteredAttributions = useMemo(() => {
    return attributions.filter(a => {
      if (statusFilter !== 'all' && a.auditStatus !== statusFilter) return false
      if (!normalizedQuery) return true
      return (
        a.trackingCode.toLowerCase().includes(normalizedQuery) ||
        a.creatorHandle.toLowerCase().includes(normalizedQuery) ||
        a.creatorName.toLowerCase().includes(normalizedQuery) ||
        a.campaignTitle.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [attributions, statusFilter, normalizedQuery])

  const filteredMilestones = useMemo(() => {
    return milestones.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false
      if (!normalizedQuery) return true
      return (
        m.title.toLowerCase().includes(normalizedQuery) ||
        m.creatorName.toLowerCase().includes(normalizedQuery) ||
        m.creatorHandle.toLowerCase().includes(normalizedQuery) ||
        m.campaignTitle.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [milestones, statusFilter, normalizedQuery])

  const activeCampaignPolicyScan = useMemo(() => {
    if (!inspectingCampaign) return null
    return scanCampaignPolicyCompliance(
      `${inspectingCampaign.title} ${inspectingCampaign.purpose} ${inspectingCampaign.keyMessages.join(' ')} ${inspectingCampaign.termsAndConditions} ${inspectingCampaign.prohibitedClaims.join(' ')}`,
    )
  }, [inspectingCampaign])

  const handleTabSwitch = (nextTab: AdminCampaignDeskSubTab) => {
    setSubDesk(nextTab)
    setStatusFilter('all')
    setSearchQuery('')
  }

  // Action Handlers
  const handleCampaignDecision = (
    campaignId: string,
    decision: 'published' | 'changes_requested' | 'rejected' | 'paused' | 'completed',
    note: string,
  ) => {
    const ok = moderateCampaignBrief(campaignId, decision, operator, note)
    if (ok) {
      showToast(`Campaign ${campaignId} updated to ${decision.replace('_', ' ').toUpperCase()}.`)
      setInspectingCampaign(null)
      setDrawerNote('')
      triggerRefresh()
    }
  }

  const handleApplicationDecision = (
    appId: string,
    decision: 'shortlisted' | 'selected' | 'accepted' | 'declined',
    note: string,
  ) => {
    const ok = triageBrandApplication(appId, decision, operator, note)
    if (ok) {
      const extra =
        decision === 'accepted' || decision === 'selected'
          ? ' Attribution UTM link and Milestone contract provisioned.'
          : ''
      showToast(`Application marked ${decision.toUpperCase()}.${extra}`)
      setInspectingApplication(null)
      setDrawerNote('')
      triggerRefresh()
    }
  }

  const handleDeliverableDecision = (
    deliv: DeliverableSubmission,
    decision: 'accepted' | 'revision_requested' | 'rejected',
    note: string,
  ) => {
    const ok = reviewCreativeDeliverable(deliv.id, decision, operator, note)
    if (ok) {
      showToast(
        decision === 'accepted'
          ? `Deliverable accepted (${formatPaiseToInr(deliv.rewardAmountPaise)} credited to ledger).`
          : `Deliverable marked as ${decision.replace('_', ' ')}.`,
      )
      triggerRefresh()
    }
  }

  const handleAttributionAudit = (
    attrId: string,
    status: AttributionAuditStatus,
    note: string,
  ) => {
    const ok = auditSocialAttribution(attrId, status, operator, note)
    if (ok) {
      showToast(`Attribution audit status updated to ${status.replace('_', ' ').toUpperCase()}.`)
      setInspectingAttribution(null)
      setDrawerNote('')
      triggerRefresh()
    }
  }

  const handleMilestoneDecision = (
    milestone: CampaignMilestoneRecord,
    decision: 'approved' | 'revision_requested' | 'blocked_anomaly',
    note: string,
  ) => {
    const ok = verifyCampaignMilestone(milestone.id, decision, operator, note)
    if (ok) {
      showToast(
        decision === 'approved'
          ? `${milestone.milestoneCode} verified and ${formatPaiseToInr(milestone.rewardSharePaise)} credited to ledger.`
          : `${milestone.milestoneCode} marked as ${decision.replace('_', ' ')}.`,
      )
      triggerRefresh()
    }
  }

  const handleToggleCreatorKyi = (creatorId: string, currentVerified: boolean) => {
    const ok = toggleCreatorVerificationStatus(creatorId, !currentVerified, operator)
    if (ok) {
      showToast(`Creator KYI verification updated to ${!currentVerified ? 'VERIFIED' : 'PENDING REVIEW'}.`)
      triggerRefresh()
    }
  }

  const handleResolveDispute = (
    disputeId: string,
    resolution: 'creator_favored' | 'advertiser_favored' | 'split',
  ) => {
    const ok = arbitrateCampaignDispute(
      disputeId,
      resolution,
      operator,
      `Arbitrated by ${operator.email}: ${resolution.replace('_', ' ')}`,
    )
    if (ok) {
      showToast(`Campaign dispute resolved (${resolution.replace('_', ' ')}).`)
      triggerRefresh()
    }
  }

  const handleConfirmModal = () => {
    if (!decisionModal) return
    const reason = decisionReason.trim() || 'Reviewed and actioned via Creator Operations Desk.'
    if (decisionModal.kind === 'deliverable_revision') {
      const target = deliverables.find(d => d.id === decisionModal.id)
      if (target) {
        handleDeliverableDecision(
          target,
          decisionModal.targetDecision as 'revision_requested' | 'rejected',
          reason,
        )
      }
    } else if (decisionModal.kind === 'milestone_review') {
      const target = milestones.find(m => m.id === decisionModal.id)
      if (target) {
        handleMilestoneDecision(
          target,
          decisionModal.targetDecision as 'approved' | 'revision_requested' | 'blocked_anomaly',
          reason,
        )
      }
    } else if (decisionModal.kind === 'attribution_audit') {
      handleAttributionAudit(
        decisionModal.id,
        decisionModal.targetDecision as AttributionAuditStatus,
        reason,
      )
    }
    setDecisionModal(null)
    setDecisionReason('')
  }

  const handleExportCsv = () => {
    const csv = exportCreatorOpsLedgerToCsv(snapshot)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `khelgrid-creator-attribution-ledger-${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Creator attribution & milestone ledger exported to CSV.')
  }

  const handleResetTestData = () => {
    resetAdminCreatorOpsForTesting()
    setInspectingCampaign(null)
    setInspectingApplication(null)
    setInspectingAttribution(null)
    showToast('Creator operations & attribution seed ledger restored.')
    triggerRefresh()
  }

  return (
    <div className="creator-ops-desk" data-testid="creator-attribution-desk">
      {/* 1. Header Ribbon */}
      <header className="creator-ops-header">
        <div className="creator-ops-title-block">
          <div className="creator-ops-eyebrow">
            <SiteIcon name="award" size={14} />
            <span>KHELGRID CREATOR ECONOMY · MODULE 6 GOVERNANCE</span>
          </div>
          <h1>Sports Creator Campaigns &amp; Attribution Operations Desk</h1>
          <p>
            Manage influencer &amp; athlete brand campaign applications, verify #Ad creative deliverables, track UTM social attribution conversions, and sign off campaign milestones.
          </p>
        </div>

        <div className="creator-ops-header-actions">
          <span className="creator-lockdown-pill" title="Direct bank disbursements remain safely disabled until gateway activation">
            <SiteIcon name="lock" size={13} />
            <span>Ledger Mode · Payments Disabled</span>
          </span>
          <button
            type="button"
            className="creator-ops-btn creator-ops-btn-secondary"
            onClick={handleExportCsv}
          >
            <SiteIcon name="download" size={14} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="creator-ops-btn creator-ops-btn-secondary"
            onClick={handleResetTestData}
          >
            <span>Reset Seed Data</span>
          </button>
          <button
            type="button"
            className="creator-ops-btn creator-ops-btn-primary"
            onClick={triggerRefresh}
          >
            <SiteIcon name="refresh" size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* 2. Micro-KPI Telemetry Ribbon */}
      <section className="creator-kpi-grid" aria-label="Creator Operations Telemetry">
        <div className="creator-kpi-card" data-testid="kpi-campaigns">
          <span className="creator-kpi-label">Active Briefs &amp; Queue</span>
          <span className="creator-kpi-value">{metrics.totalCampaigns}</span>
          <span className="creator-kpi-sub">
            {metrics.publishedCampaigns} live · {metrics.pendingBriefs} pending review
          </span>
        </div>

        <div className="creator-kpi-card kpi-highlight" data-testid="kpi-applications">
          <span className="creator-kpi-label">Brand Applications</span>
          <span className="creator-kpi-value">{metrics.pendingApplications}</span>
          <span className="creator-kpi-sub">
            Pending triage of {metrics.totalApplications} total creator pitches
          </span>
        </div>

        <div className="creator-kpi-card" data-testid="kpi-deliverables">
          <span className="creator-kpi-label">Deliverable Queue</span>
          <span className="creator-kpi-value">{metrics.pendingDeliverables}</span>
          <span className="creator-kpi-sub">
            {metrics.approvedDeliverables} verified with #Ad compliance
          </span>
        </div>

        <div className="creator-kpi-card kpi-alert" data-testid="kpi-attribution">
          <span className="creator-kpi-label">
            {metrics.flaggedAnomalies > 0 && <span className="creator-pulse-dot" />}
            Attributed Trial Enquiries
          </span>
          <span className="creator-kpi-value">{metrics.totalVerifiedEnquiries}</span>
          <span className="creator-kpi-sub">
            {metrics.totalAttributedClicks.toLocaleString('en-IN')} organic clicks · {metrics.flaggedAnomalies} anomaly flag
          </span>
        </div>

        <div className="creator-kpi-card" data-testid="kpi-milestones">
          <span className="creator-kpi-label">Milestone Completions</span>
          <span className="creator-kpi-value">{metrics.milestonesPendingReview}</span>
          <span className="creator-kpi-sub">
            Awaiting sign-off · {metrics.milestonesApproved} approved
          </span>
        </div>

        <div className="creator-kpi-card" data-testid="kpi-ledger">
          <span className="creator-kpi-label">Approved Escrow Ledger</span>
          <span className="creator-kpi-value" style={{ color: '#6ee7b7' }}>
            {formatPaiseToInr(metrics.approvedLedgerPaise)}
          </span>
          <span className="creator-kpi-sub">
            {metrics.openDisputes} open disputes · Ledger credits only
          </span>
        </div>
      </section>

      {/* 3. Sub-Desk Navigation Tabs */}
      <nav className="creator-nav-container" aria-label="Module 6 Sub-Desks">
        <div className="creator-tab-list" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={subDesk === 'campaign_moderation'}
            className={`creator-tab-btn ${subDesk === 'campaign_moderation' ? 'is-active' : ''}`}
            onClick={() => handleTabSwitch('campaign_moderation')}
            data-testid="tab-campaign-moderation"
          >
            <span>Campaign Moderation</span>
            <span className="creator-tab-count">{metrics.pendingBriefs} pending</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subDesk === 'brand_applications'}
            className={`creator-tab-btn ${subDesk === 'brand_applications' ? 'is-active' : ''}`}
            onClick={() => handleTabSwitch('brand_applications')}
            data-testid="tab-brand-applications"
          >
            <span>Brand Applications</span>
            <span className="creator-tab-count">{metrics.pendingApplications}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subDesk === 'deliverable_verification'}
            className={`creator-tab-btn ${subDesk === 'deliverable_verification' ? 'is-active' : ''}`}
            onClick={() => handleTabSwitch('deliverable_verification')}
            data-testid="tab-deliverable-verification"
          >
            <span>Deliverable Verification</span>
            <span className="creator-tab-count">{metrics.pendingDeliverables}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subDesk === 'social_attribution'}
            className={`creator-tab-btn ${subDesk === 'social_attribution' ? 'is-active' : ''}`}
            onClick={() => handleTabSwitch('social_attribution')}
            data-testid="tab-social-attribution"
          >
            <span>Social Attribution</span>
            <span className="creator-tab-count">{attributions.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subDesk === 'milestone_completions'}
            className={`creator-tab-btn ${subDesk === 'milestone_completions' ? 'is-active' : ''}`}
            onClick={() => handleTabSwitch('milestone_completions')}
            data-testid="tab-milestone-completions"
          >
            <span>Milestone Completions</span>
            <span className="creator-tab-count">{metrics.milestonesPendingReview}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subDesk === 'dispute_arbitration'}
            className={`creator-tab-btn ${subDesk === 'dispute_arbitration' ? 'is-active' : ''}`}
            onClick={() => handleTabSwitch('dispute_arbitration')}
            data-testid="tab-disputes"
          >
            <span>Disputes</span>
            <span className="creator-tab-count">{metrics.openDisputes} open</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subDesk === 'creator_verification'}
            className={`creator-tab-btn ${subDesk === 'creator_verification' ? 'is-active' : ''}`}
            onClick={() => handleTabSwitch('creator_verification')}
            data-testid="tab-creator-profiles"
          >
            <span>Creator Profiles</span>
            <span className="creator-tab-count">{creators.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subDesk === 'ledger_audit'}
            className={`creator-tab-btn ${subDesk === 'ledger_audit' ? 'is-active' : ''}`}
            onClick={() => handleTabSwitch('ledger_audit')}
            data-testid="tab-ledger-audit"
          >
            <span>Reward Ledger &amp; Audit Trail</span>
            <span className="creator-tab-count">{rewardLedger.length}</span>
          </button>
        </div>
      </nav>

      {/* 4. Search & Status Toolbar (shared across primary operational tables) */}
      {(subDesk === 'campaign_moderation' ||
        subDesk === 'brand_applications' ||
        subDesk === 'deliverable_verification' ||
        subDesk === 'social_attribution' ||
        subDesk === 'milestone_completions') && (
        <section className="creator-filter-bar" aria-label="Search and Filters">
          <div className="creator-search-wrap">
            <span className="creator-search-icon" aria-hidden="true">
              <SiteIcon name="search" size={15} />
            </span>
            <input
              type="text"
              className="creator-search-input"
              placeholder="Search campaign title, creator handle @..., UTM code KG-..., sport, or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              data-testid="creator-ops-search"
            />
          </div>

          <div className="creator-select-wrap">
            <label htmlFor="creator-ops-status-filter">Status:</label>
            <select
              id="creator-ops-status-filter"
              className="creator-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              data-testid="creator-ops-status-filter"
            >
              <option value="all">All Records</option>
              {subDesk === 'campaign_moderation' && (
                <>
                  <option value="submitted">Submitted (Awaiting Approval)</option>
                  <option value="published">Published (Live)</option>
                  <option value="changes_requested">Changes Requested</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </>
              )}
              {subDesk === 'brand_applications' && (
                <>
                  <option value="applied">Applied (New Pitch)</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="selected">Selected</option>
                  <option value="accepted">Accepted (Active Track)</option>
                  <option value="declined">Declined</option>
                </>
              )}
              {subDesk === 'deliverable_verification' && (
                <>
                  <option value="submitted">Submitted (Awaiting Check)</option>
                  <option value="revision_requested">Revision Requested</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </>
              )}
              {subDesk === 'social_attribution' && (
                <>
                  <option value="verified_organic">Verified Organic</option>
                  <option value="under_audit">Under Anomaly Audit</option>
                  <option value="flagged_excluded">Flagged &amp; Excluded</option>
                </>
              )}
              {subDesk === 'milestone_completions' && (
                <>
                  <option value="pending_review">Pending Sign-off</option>
                  <option value="approved">Approved</option>
                  <option value="locked">Locked (Sequential)</option>
                  <option value="blocked_anomaly">Blocked (Attribution Anomaly)</option>
                  <option value="revision_requested">Revision Requested</option>
                </>
              )}
            </select>
          </div>
        </section>
      )}

      {/* SUB-DESK 1: CAMPAIGN MODERATION */}
      {subDesk === 'campaign_moderation' && (
        <section className="creator-table-card">
          <div className="creator-table-header">
            <div>
              <h4>Advertiser Campaigns ({filteredCampaigns.length})</h4>
              <span className="creator-table-hint">
                Verify that campaign briefs adhere to anti-spam policies, ASCI rules, and require #Ad disclosures.
              </span>
            </div>
          </div>

          <div className="creator-table-scroll">
            <table className="creator-data-table" aria-label="Campaign Moderation Queue">
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
                    <td colSpan={8} className="creator-empty-row">
                      No campaigns found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map(camp => (
                    <tr key={camp.id} data-testid={`campaign-row-${camp.id}`}>
                      <td><code>{camp.id}</code></td>
                      <td>
                        <strong style={{ color: '#f8fafc' }}>{camp.title}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          {camp.category.replace(/_/g, ' ')} · Deadline {formatDateShort(camp.deadlineAt)}
                        </div>
                      </td>
                      <td>
                        <div>{camp.advertiserName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>({camp.advertiserRole})</div>
                      </td>
                      <td>{camp.sport} · {camp.locationCity}</td>
                      <td><strong>{formatPaiseToInr(camp.totalBudgetPaise)}</strong></td>
                      <td>{formatPaiseToInr(camp.perDeliverableFeePaise)}</td>
                      <td>
                        <span className={`creator-badge badge-${camp.status}`}>
                          {camp.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="creator-ops-btn creator-ops-btn-secondary creator-ops-btn-sm"
                            onClick={() => {
                              setInspectingCampaign(camp)
                              setDrawerNote(camp.moderationNotes || '')
                            }}
                          >
                            Review Brief
                          </button>
                          {(camp.status === 'submitted' || camp.status === 'under_review' || camp.status === 'changes_requested') && (
                            <button
                              type="button"
                              className="creator-ops-btn creator-ops-btn-success creator-ops-btn-sm"
                              onClick={() =>
                                handleCampaignDecision(
                                  camp.id,
                                  'published',
                                  'Approved after ASCI & Fair Selection policy verification.',
                                )
                              }
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
        </section>
      )}

      {/* SUB-DESK 2: BRAND APPLICATIONS TRIAGE */}
      {subDesk === 'brand_applications' && (
        <section className="creator-table-card" data-testid="brand-applications-panel">
          <div className="creator-table-header">
            <div>
              <h4>Influencer &amp; Athlete Brand Applications ({filteredApplications.length})</h4>
              <span className="creator-table-hint">
                Screen creator pitches, inspect audience fit &amp; bot-risk scores, and auto-provision attribution short-links on acceptance.
              </span>
            </div>
          </div>

          <div className="creator-table-scroll">
            <table className="creator-data-table" aria-label="Brand Applications Queue">
              <thead>
                <tr>
                  <th>Creator &amp; Handle</th>
                  <th>Campaign Brief</th>
                  <th>Channel &amp; Reach</th>
                  <th>Audience Fit / Authenticity</th>
                  <th>Pitch Concept</th>
                  <th>Status</th>
                  <th>Triage Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="creator-empty-row">
                      No brand applications matched the active search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map(app => (
                    <tr key={app.id} data-testid={`application-row-${app.id}`}>
                      <td>
                        <strong>{app.creatorName}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#c4b5fd' }}>{app.creatorHandle}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {app.sportSpecialty} · {app.city}
                        </div>
                      </td>
                      <td style={{ maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600 }}>{app.campaignTitle}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Applied {formatDateShort(app.appliedAt)}</div>
                      </td>
                      <td>
                        <div style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.74rem' }}>{app.platform}</div>
                        <div>{app.followerCount.toLocaleString('en-IN')} followers</div>
                        <div style={{ fontSize: '0.72rem', color: '#6ee7b7' }}>{app.engagementRatePercent.toFixed(1)}% ER</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>Fit: {app.audienceFitScore}/100</div>
                        <div style={{ marginTop: '0.25rem' }}>
                          <span className={`creator-badge badge-${app.authenticityRisk}`}>
                            Risk: {app.authenticityRisk}
                          </span>
                        </div>
                      </td>
                      <td style={{ maxWidth: '250px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                        {app.proposedConcept}
                      </td>
                      <td>
                        <span className={`creator-badge badge-${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="creator-ops-btn creator-ops-btn-secondary creator-ops-btn-sm"
                            onClick={() => {
                              setInspectingApplication(app)
                              setDrawerNote(app.reviewNote || '')
                            }}
                          >
                            Inspect Pitch
                          </button>
                          {(app.status === 'applied' || app.status === 'shortlisted') && (
                            <>
                              <button
                                type="button"
                                className="creator-ops-btn creator-ops-btn-success creator-ops-btn-sm"
                                onClick={() =>
                                  handleApplicationDecision(
                                    app.id,
                                    'accepted',
                                    'Approved for campaign milestone track & UTM attribution issuance.',
                                  )
                                }
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="creator-ops-btn creator-ops-btn-danger creator-ops-btn-sm"
                                onClick={() =>
                                  handleApplicationDecision(
                                    app.id,
                                    'declined',
                                    'Declined due to audience mismatch or authenticity risk.',
                                  )
                                }
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUB-DESK 3: DELIVERABLE VERIFICATION */}
      {subDesk === 'deliverable_verification' && (
        <section className="creator-table-card" data-testid="deliverables-panel">
          <div className="creator-table-header">
            <div>
              <h4>Submitted Creative Deliverables ({filteredDeliverables.length})</h4>
              <span className="creator-table-hint">
                Verify canonical HTTPS social URLs, confirm prominent #Ad / #Sponsored disclosures, and credit verified milestones into the INR ledger.
              </span>
            </div>
          </div>

          <div className="creator-table-scroll">
            <table className="creator-data-table" aria-label="Deliverable Verification Desk">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Campaign</th>
                  <th>Creator</th>
                  <th>Platform &amp; Format</th>
                  <th>Canonical Post URL</th>
                  <th>#Ad Disclosure</th>
                  <th>Contracted Credit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliverables.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="creator-empty-row">
                      No creative deliverables matched current filters.
                    </td>
                  </tr>
                ) : (
                  filteredDeliverables.map(deliv => {
                    const urlCheck = validateDeliverableUrl(deliv.canonicalPostUrl, deliv.platform)
                    return (
                      <tr key={deliv.id} data-testid={`deliverable-row-${deliv.id}`}>
                        <td><code>{deliv.id}</code></td>
                        <td><strong>{deliv.campaignTitle}</strong></td>
                        <td>{deliv.creatorName}</td>
                        <td>
                          <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{deliv.platform}</span> ·{' '}
                          {deliv.deliverableType.replace('_', ' ')}
                        </td>
                        <td>
                          <a
                            href={deliv.canonicalPostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#93c5fd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>Inspect Live Post</span>
                            <SiteIcon name="external-link" size={12} />
                          </a>
                          <div style={{ fontSize: '0.7rem', color: urlCheck.valid ? '#6ee7b7' : '#fca5a5', marginTop: '0.2rem' }}>
                            {urlCheck.valid ? `✓ Canonical ${urlCheck.domain}` : `⚠ ${urlCheck.error}`}
                          </div>
                        </td>
                        <td>
                          <span className={`creator-badge ${deliv.disclosureVerified ? 'badge-verified' : 'badge-high'}`}>
                            {deliv.disclosureVerified ? 'Confirmed #Ad' : 'Missing Tag'}
                          </span>
                        </td>
                        <td><strong>{formatPaiseToInr(deliv.rewardAmountPaise)}</strong></td>
                        <td>
                          <span className={`creator-badge badge-${deliv.status}`}>
                            {deliv.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          {deliv.status === 'submitted' || deliv.status === 'revision_requested' ? (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="creator-ops-btn creator-ops-btn-success creator-ops-btn-sm"
                                onClick={() =>
                                  handleDeliverableDecision(
                                    deliv,
                                    'accepted',
                                    'Verified live social URL and compliant #Ad disclosure.',
                                  )
                                }
                              >
                                Approve Credit
                              </button>
                              <button
                                type="button"
                                className="creator-ops-btn creator-ops-btn-warning creator-ops-btn-sm"
                                onClick={() => {
                                  setDecisionReason('')
                                  setDecisionModal({
                                    kind: 'deliverable_revision',
                                    id: deliv.id,
                                    title: `Request Deliverable Revision · ${deliv.creatorName}`,
                                    actionLabel: 'Send Revision Request',
                                    targetDecision: 'revision_requested',
                                  })
                                }}
                              >
                                Revision
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 600 }}>
                              {deliv.status === 'accepted' ? '✓ Credited in Ledger' : deliv.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUB-DESK 4: SOCIAL ENGAGEMENT ATTRIBUTION TRACKING */}
      {subDesk === 'social_attribution' && (
        <section className="creator-table-card" data-testid="social-attribution-panel">
          <div className="creator-table-header">
            <div>
              <h4>Social Engagement Attribution &amp; Anomaly Guard ({filteredAttributions.length})</h4>
              <span className="creator-table-hint">
                Track UTM referral performance from creator content to verified KhelGrid trial bookings while isolating synthetic traffic spikes.
              </span>
            </div>
          </div>

          <div className="attr-funnel-grid">
            <div className="attr-funnel-card">
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Organic Reach Funnel</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 750, marginTop: '0.25rem' }}>
                {attributions
                  .filter(a => a.auditStatus !== 'flagged_excluded')
                  .reduce((sum, a) => sum + a.impressions, 0)
                  .toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>impressions</span>
              </div>
            </div>
            <div className="attr-funnel-card">
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Tracked Link Clicks</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 750, marginTop: '0.25rem', color: '#93c5fd' }}>
                {metrics.totalAttributedClicks.toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>verified referrals</span>
              </div>
            </div>
            <div className="attr-funnel-card">
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Trial &amp; Academy Leads</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 750, marginTop: '0.25rem', color: '#6ee7b7' }}>
                {metrics.totalVerifiedEnquiries.toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  ({attributions
                    .filter(a => a.auditStatus !== 'flagged_excluded')
                    .reduce((sum, a) => sum + a.verifiedAcademyEnrolments, 0)}{' '}
                  enrolments)
                </span>
              </div>
            </div>
          </div>

          <div className="creator-table-scroll">
            <table className="creator-data-table" aria-label="Social Attribution Tracking Table">
              <thead>
                <tr>
                  <th>Tracking Code &amp; Short URL</th>
                  <th>Creator &amp; Campaign</th>
                  <th>Impressions / Eng Rate</th>
                  <th>Clicks &amp; CTR%</th>
                  <th>Verified Leads / Conv%</th>
                  <th>Authenticity Score</th>
                  <th>Audit Status</th>
                  <th>Controls</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttributions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="creator-empty-row">
                      No attribution tracking links matched your search.
                    </td>
                  </tr>
                ) : (
                  filteredAttributions.map(attr => (
                    <tr key={attr.id} data-testid={`attribution-row-${attr.id}`}>
                      <td>
                        <span className="attr-code-chip">{attr.trackingCode}</span>
                        <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginTop: '0.25rem' }}>{attr.shortUrl}</div>
                      </td>
                      <td style={{ maxWidth: '230px' }}>
                        <strong>{attr.creatorName}</strong> ({attr.creatorHandle})
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{attr.campaignTitle}</div>
                      </td>
                      <td>
                        <div>{attr.impressions.toLocaleString('en-IN')} impr</div>
                        <div style={{ fontSize: '0.74rem', color: '#c4b5fd' }}>{attr.engagementRatePercent.toFixed(2)}% ER</div>
                      </td>
                      <td>
                        <strong>{attr.linkClicks.toLocaleString('en-IN')}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{attr.ctrPercent.toFixed(2)}% CTR</div>
                      </td>
                      <td>
                        <strong style={{ color: '#6ee7b7' }}>{attr.verifiedTrialEnquiries} enquiries</strong>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {attr.verifiedAcademyEnrolments} enrols ({attr.conversionRatePercent.toFixed(2)}%)
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: getAuthenticityColor(attr.authenticityScore) }}>
                          {attr.authenticityScore}/100
                        </div>
                        <div className="attr-score-bar-wrap">
                          <div
                            className="attr-score-bar-fill"
                            style={{
                              width: `${attr.authenticityScore}%`,
                              background: getAuthenticityColor(attr.authenticityScore),
                            }}
                          />
                        </div>
                        {attr.anomalyFlag !== 'none' && (
                          <div style={{ fontSize: '0.68rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                            ⚠ {attr.anomalyFlag.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`creator-badge badge-${attr.auditStatus}`}>
                          {attr.auditStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="creator-ops-btn creator-ops-btn-secondary creator-ops-btn-sm"
                            onClick={() => {
                              setInspectingAttribution(attr)
                              setDrawerNote(attr.anomalyDetails || '')
                            }}
                          >
                            Audit Funnel
                          </button>
                          {attr.auditStatus !== 'flagged_excluded' && (
                            <button
                              type="button"
                              className="creator-ops-btn creator-ops-btn-danger creator-ops-btn-sm"
                              onClick={() =>
                                handleAttributionAudit(
                                  attr.id,
                                  'flagged_excluded',
                                  'Traffic burst excluded from milestone attribution calculations.',
                                )
                              }
                            >
                              Exclude Bot Traffic
                            </button>
                          )}
                          {attr.auditStatus !== 'verified_organic' && (
                            <button
                              type="button"
                              className="creator-ops-btn creator-ops-btn-success creator-ops-btn-sm"
                              onClick={() =>
                                handleAttributionAudit(
                                  attr.id,
                                  'verified_organic',
                                  'Manually verified authentic grassroots sports traffic.',
                                )
                              }
                            >
                              Verify Organic
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
        </section>
      )}

      {/* SUB-DESK 5: MILESTONE COMPLETIONS */}
      {subDesk === 'milestone_completions' && (
        <section className="creator-table-card" data-testid="milestones-panel">
          <div className="creator-table-header">
            <div>
              <h4>Contract Milestone Completions ({filteredMilestones.length})</h4>
              <span className="creator-table-hint">
                Verify sequential M1–M4 creator contract stages. Approving a milestone unlocks the next stage and records an immutable INR credit entry.
              </span>
            </div>
          </div>

          <div className="creator-table-scroll">
            <table className="creator-data-table" aria-label="Milestone Completions Queue">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Milestone Title &amp; Deliverable</th>
                  <th>Creator &amp; Campaign</th>
                  <th>Evidence &amp; Attribution</th>
                  <th>Credit Share (INR)</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Sign-off Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMilestones.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="creator-empty-row">
                      No campaign milestones matched current filters.
                    </td>
                  </tr>
                ) : (
                  filteredMilestones.map(ms => (
                    <tr key={ms.id} data-testid={`milestone-row-${ms.id}`}>
                      <td><span className="attr-code-chip">{ms.milestoneCode}</span></td>
                      <td style={{ maxWidth: '250px' }}>
                        <strong>{ms.title}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.15rem' }}>{ms.description}</div>
                      </td>
                      <td style={{ maxWidth: '210px' }}>
                        <div><strong>{ms.creatorName}</strong></div>
                        <div style={{ fontSize: '0.74rem', color: '#c4b5fd' }}>{ms.creatorHandle}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{ms.campaignTitle}</div>
                      </td>
                      <td style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                        {ms.evidenceRef || 'Awaiting submission'}
                        {ms.attributedEnquiries !== undefined && (
                          <div style={{ color: '#6ee7b7', marginTop: '0.15rem' }}>
                            {ms.attributedEnquiries} attributed leads
                          </div>
                        )}
                      </td>
                      <td><strong>{formatPaiseToInr(ms.rewardSharePaise)}</strong></td>
                      <td>{formatDateShort(ms.dueDate)}</td>
                      <td>
                        <span className={`creator-badge badge-${ms.status}`}>
                          {ms.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {ms.status === 'pending_review' || ms.status === 'revision_requested' || ms.status === 'blocked_anomaly' ? (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="creator-ops-btn creator-ops-btn-success creator-ops-btn-sm"
                              onClick={() =>
                                handleMilestoneDecision(
                                  ms,
                                  'approved',
                                  `${ms.milestoneCode} verified & ledger credit authorized.`,
                                )
                              }
                            >
                              Sign Off
                            </button>
                            <button
                              type="button"
                              className="creator-ops-btn creator-ops-btn-warning creator-ops-btn-sm"
                              onClick={() => {
                                setDecisionReason('')
                                setDecisionModal({
                                  kind: 'milestone_review',
                                  id: ms.id,
                                  title: `Milestone Decision · ${ms.milestoneCode} (${ms.creatorHandle})`,
                                  actionLabel: 'Request Revision',
                                  targetDecision: 'revision_requested',
                                })
                              }}
                            >
                              Request Revision
                            </button>
                          </div>
                        ) : ms.status === 'approved' ? (
                          <span style={{ fontSize: '0.74rem', color: '#6ee7b7', fontWeight: 600 }}>
                            ✓ Signed Off ({formatDateShort(ms.reviewedAt)})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            Unlocks after prior stage
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUB-DESK 6: DISPUTE ARBITRATION */}
      {subDesk === 'dispute_arbitration' && (
        <section className="creator-table-card" data-testid="disputes-panel">
          <div className="creator-table-header">
            <div>
              <h4>3-Way Campaign Dispute Arbitration ({disputes.length})</h4>
              <span className="creator-table-hint">
                Impartial resolution of delivery disagreements between sports brands/academies and creators.
              </span>
            </div>
          </div>

          <div className="creator-table-scroll">
            <table className="creator-data-table" aria-label="Disputes Table">
              <thead>
                <tr>
                  <th>Dispute Ref</th>
                  <th>Campaign</th>
                  <th>Parties</th>
                  <th>Raised By</th>
                  <th>Reason &amp; Statement</th>
                  <th>Status</th>
                  <th>Arbitration Decision</th>
                </tr>
              </thead>
              <tbody>
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="creator-empty-row">No active campaign disputes found.</td>
                  </tr>
                ) : (
                  disputes.map(disp => (
                    <tr key={disp.id}>
                      <td><code>{disp.id}</code></td>
                      <td><strong>{disp.campaignTitle}</strong></td>
                      <td>
                        <div><strong>Creator:</strong> {disp.creatorName}</div>
                        <div><strong>Brand:</strong> {disp.advertiserName}</div>
                      </td>
                      <td>
                        <span className={`creator-badge badge-${disp.raisedBy === 'creator' ? 'submitted' : 'changes_requested'}`}>
                          {disp.raisedBy}
                        </span>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <strong>{disp.reason}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.2rem' }}>{disp.statement}</div>
                        {disp.resolutionNotes && (
                          <div style={{ fontSize: '0.74rem', color: '#93c5fd', marginTop: '0.25rem' }}>
                            Resolution: {disp.resolutionNotes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`creator-badge badge-${disp.status}`}>{disp.status}</span>
                      </td>
                      <td>
                        {disp.status === 'open' || disp.status === 'under_review' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <button
                              type="button"
                              className="creator-ops-btn creator-ops-btn-success creator-ops-btn-sm"
                              onClick={() => handleResolveDispute(disp.id, 'creator_favored')}
                            >
                              Credit to Creator
                            </button>
                            <button
                              type="button"
                              className="creator-ops-btn creator-ops-btn-danger creator-ops-btn-sm"
                              onClick={() => handleResolveDispute(disp.id, 'advertiser_favored')}
                            >
                              Return to Brand Escrow
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#6ee7b7', fontWeight: 600 }}>
                            Resolved ({disp.resolution?.replace('_', ' ')})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SUB-DESK 7: CREATOR PROFILES & KYI DIRECTORY */}
      {subDesk === 'creator_verification' && (
        <section className="creator-table-card" data-testid="creator-profiles-panel">
          <div className="creator-table-header">
            <div>
              <h4>Creator Verification &amp; Sports Content Integrity ({creators.length})</h4>
              <span className="creator-table-hint">
                Verify grassroots athletes and sports storytellers, audit channel authenticity, and prevent sybil manipulation.
              </span>
            </div>
          </div>

          <div className="creator-roster-grid">
            {creators.map(cr => (
              <div key={cr.id} className="creator-profile-card" data-testid={`creator-card-${cr.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.08rem', color: '#f8fafc' }}>{cr.displayName}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#c4b5fd' }}>
                      {cr.handle} · {cr.primarySport} · {cr.locationCity}
                    </div>
                  </div>
                  <span className={`creator-badge badge-${cr.kyiStatus}`}>
                    {cr.kyiStatus.replace('_', ' ')}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.45 }}>{cr.bio}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
                  <span>Authenticity: <strong style={{ color: getAuthenticityColor(cr.authenticityScore) }}>{cr.authenticityScore}/100</strong></span>
                  <span>Attributed Leads: <strong style={{ color: '#6ee7b7' }}>{cr.totalAttributedLeads}</strong></span>
                  <span>Completed: <strong>{cr.completedDeliverablesCount}</strong></span>
                </div>

                {cr.riskNote && (
                  <div style={{ fontSize: '0.75rem', color: '#fcd34d', background: 'rgba(245, 158, 11, 0.1)', padding: '0.45rem 0.65rem', borderRadius: '0.45rem' }}>
                    ⚠ {cr.riskNote}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {cr.platforms.map((plat, idx) => (
                    <div key={idx} className="creator-channel-chip">
                      <div style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem', color: '#94a3b8' }}>
                        {plat.platform}
                      </div>
                      <div style={{ fontWeight: 600 }}>{plat.handle}</div>
                      <div style={{ color: '#6ee7b7', fontSize: '0.74rem' }}>
                        {plat.followerCount.toLocaleString('en-IN')} followers
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.35rem' }}>
                  <button
                    type="button"
                    className={`creator-ops-btn creator-ops-btn-sm ${
                      cr.isVerifiedCreator ? 'creator-ops-btn-warning' : 'creator-ops-btn-success'
                    }`}
                    onClick={() => handleToggleCreatorKyi(cr.id, cr.isVerifiedCreator)}
                  >
                    {cr.isVerifiedCreator ? 'Revoke Verified Badge' : 'Grant Verified Creator Badge'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SUB-DESK 8: REWARD LEDGER & AUDIT TRAIL */}
      {subDesk === 'ledger_audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="creator-payment-lock-banner" role="status">
            <div>
              <strong>Platform Payment Lockdown Active:</strong> All bank disbursements &amp; gateway payouts remain safely paused. Verified deliverables and milestones are recorded in this append-only INR escrow ledger in integer paise.
            </div>
            <span>Approved Ledger Credits: <strong>{formatPaiseToInr(metrics.approvedLedgerPaise)}</strong></span>
          </div>

          <section className="creator-table-card">
            <div className="creator-table-header">
              <div>
                <h4>Append-Only Reward Ledger ({rewardLedger.length} entries)</h4>
                <span className="creator-table-hint">
                  Immutable INR ledger recording contracted creator credits approved via Deliverable Verification or Milestone Sign-off.
                </span>
              </div>
            </div>

            <div className="creator-table-scroll">
              <table className="creator-data-table" aria-label="Append-Only Reward Ledger">
                <thead>
                  <tr>
                    <th>Ledger ID</th>
                    <th>Timestamp</th>
                    <th>Creator ID</th>
                    <th>Campaign ID</th>
                    <th>Amount (INR)</th>
                    <th>Paise</th>
                    <th>Status</th>
                    <th>Escrow Lockdown Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rewardLedger.map(entry => (
                    <tr key={entry.id}>
                      <td><code>{entry.id}</code></td>
                      <td>{formatDateShort(entry.createdAt)}</td>
                      <td><code>{entry.creatorId}</code></td>
                      <td><code>{entry.campaignId}</code></td>
                      <td><strong style={{ color: '#6ee7b7' }}>{formatPaiseToInr(entry.amountPaise)}</strong></td>
                      <td><code>{entry.amountPaise}</code></td>
                      <td><span className={`creator-badge badge-${entry.status}`}>{entry.status}</span></td>
                      <td style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{entry.payoutLockdownNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="creator-table-card">
            <div className="creator-table-header">
              <div>
                <h4>Creator Economy Audit Logs ({auditLogs.length} events)</h4>
                <span className="creator-table-hint">
                  Immutable operator &amp; platform event log covering brief approvals, application decisions, attribution audits, and milestone sign-offs.
                </span>
              </div>
            </div>

            <div className="creator-table-scroll">
              <table className="creator-data-table" aria-label="Audit Logs Table">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Audit Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="creator-empty-row">No audit log entries recorded in this session yet.</td>
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
                        <td style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{evt.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* SLIDE-OVER DRAWER 1: CAMPAIGN BRIEF REVIEW */}
      {inspectingCampaign && (
        <div className="creator-drawer-backdrop" onClick={() => setInspectingCampaign(null)}>
          <aside
            className="creator-drawer-panel"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Campaign Brief Inspection"
          >
            <div className="creator-drawer-header">
              <div>
                <div className="creator-ops-eyebrow">BRIEF COMPLIANCE REVIEW · {inspectingCampaign.id}</div>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{inspectingCampaign.title}</h2>
              </div>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-secondary creator-ops-btn-sm"
                onClick={() => setInspectingCampaign(null)}
                aria-label="Close"
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            <div className="creator-drawer-body">
              {activeCampaignPolicyScan && (
                <div className={`creator-policy-card ${activeCampaignPolicyScan.isCompliant ? 'is-pass' : 'is-warn'}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>ASCI &amp; Fair Selection Policy Score: {activeCampaignPolicyScan.score}/100</strong>
                    <span className={`creator-badge ${activeCampaignPolicyScan.isCompliant ? 'badge-verified' : 'badge-medium'}`}>
                      {activeCampaignPolicyScan.isCompliant ? 'Compliant' : 'Attention Required'}
                    </span>
                  </div>
                  {activeCampaignPolicyScan.flaggedTerms.length > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '0.35rem' }}>
                      Flagged claims: {activeCampaignPolicyScan.flaggedTerms.join(', ')}
                    </div>
                  )}
                  {activeCampaignPolicyScan.recommendations.length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
                      {activeCampaignPolicyScan.recommendations.join(' · ')}
                    </div>
                  )}
                </div>
              )}

              <div className="creator-detail-grid">
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Advertiser</div>
                  <strong>{inspectingCampaign.advertiserName} ({inspectingCampaign.advertiserRole})</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Total Pool</div>
                  <strong>{formatPaiseToInr(inspectingCampaign.totalBudgetPaise)}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Per Deliverable Credit</div>
                  <strong>{formatPaiseToInr(inspectingCampaign.perDeliverableFeePaise)}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sport &amp; City</div>
                  <strong>{inspectingCampaign.sport} · {inspectingCampaign.locationCity}</strong>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.88rem' }}>Campaign Purpose &amp; Target Audience</h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>{inspectingCampaign.purpose}</p>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <strong>Target:</strong> {inspectingCampaign.targetAudience}
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.45rem 0', fontSize: '0.88rem' }}>Required Deliverables</h4>
                {inspectingCampaign.deliverables.map(d => (
                  <div key={d.id} className="creator-detail-grid" style={{ marginBottom: '0.5rem' }}>
                    <div>
                      <strong>{d.title} ({d.quantity}x {d.type})</strong>
                      <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.2rem' }}>{d.description}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6ee7b7', marginTop: '0.25rem' }}>
                        Disclosure: {d.mandatoryDisclosure}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="brief-drawer-note" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Moderation Decision Note
                </label>
                <textarea
                  id="brief-drawer-note"
                  rows={3}
                  className="creator-textarea"
                  value={drawerNote}
                  onChange={e => setDrawerNote(e.target.value)}
                  placeholder="Enter approval compliance note or required disclosure corrections..."
                />
              </div>
            </div>

            <div className="creator-drawer-footer">
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-secondary"
                onClick={() => setInspectingCampaign(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-warning"
                onClick={() =>
                  handleCampaignDecision(
                    inspectingCampaign.id,
                    'changes_requested',
                    drawerNote || 'Clarify #Ad disclosure placement and target eligibility terms.',
                  )
                }
              >
                Request Revisions
              </button>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-danger"
                onClick={() =>
                  handleCampaignDecision(
                    inspectingCampaign.id,
                    'rejected',
                    drawerNote || 'Rejected for Fair Selection or ASCI policy non-compliance.',
                  )
                }
              >
                Reject Brief
              </button>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-success"
                onClick={() =>
                  handleCampaignDecision(
                    inspectingCampaign.id,
                    'published',
                    drawerNote || 'Campaign brief verified & published to creator marketplace.',
                  )
                }
              >
                Approve &amp; Publish
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* SLIDE-OVER DRAWER 2: BRAND APPLICATION PITCH REVIEW */}
      {inspectingApplication && (
        <div className="creator-drawer-backdrop" onClick={() => setInspectingApplication(null)}>
          <aside
            className="creator-drawer-panel"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Creator Application Inspection"
          >
            <div className="creator-drawer-header">
              <div>
                <div className="creator-ops-eyebrow">CREATOR APPLICATION · {inspectingApplication.id}</div>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{inspectingApplication.creatorName}</h2>
              </div>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-secondary creator-ops-btn-sm"
                onClick={() => setInspectingApplication(null)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            <div className="creator-drawer-body">
              <div className="creator-detail-grid">
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Handle &amp; Platform</div>
                  <strong>{inspectingApplication.creatorHandle} ({inspectingApplication.platform})</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Followers / Eng Rate</div>
                  <strong>{inspectingApplication.followerCount.toLocaleString('en-IN')} · {inspectingApplication.engagementRatePercent.toFixed(1)}%</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Audience Fit Score</div>
                  <strong>{inspectingApplication.audienceFitScore}/100</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Authenticity Risk</div>
                  <span className={`creator-badge badge-${inspectingApplication.authenticityRisk}`}>
                    {inspectingApplication.authenticityRisk}
                  </span>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.88rem' }}>Creator Pitch &amp; Production Concept</h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>{inspectingApplication.pitchNote}</p>
                <p style={{ margin: '0.45rem 0 0 0', fontSize: '0.8rem', color: '#c4b5fd' }}>
                  <strong>Concept:</strong> {inspectingApplication.proposedConcept}
                </p>
              </div>

              <div>
                <label htmlFor="app-drawer-note" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Selection Review Note
                </label>
                <textarea
                  id="app-drawer-note"
                  rows={3}
                  className="creator-textarea"
                  value={drawerNote}
                  onChange={e => setDrawerNote(e.target.value)}
                  placeholder="Enter application triage notes..."
                />
              </div>
            </div>

            <div className="creator-drawer-footer">
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-secondary"
                onClick={() => handleApplicationDecision(inspectingApplication.id, 'shortlisted', drawerNote || 'Shortlisted for brand review.')}
              >
                Shortlist
              </button>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-danger"
                onClick={() => handleApplicationDecision(inspectingApplication.id, 'declined', drawerNote || 'Declined due to sport/audience fit.')}
              >
                Decline
              </button>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-success"
                onClick={() =>
                  handleApplicationDecision(
                    inspectingApplication.id,
                    'accepted',
                    drawerNote || 'Accepted — provisioned attribution link & milestone track.',
                  )
                }
              >
                Accept &amp; Provision Milestones
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* SLIDE-OVER DRAWER 3: ATTRIBUTION FUNNEL AUDIT */}
      {inspectingAttribution && (
        <div className="creator-drawer-backdrop" onClick={() => setInspectingAttribution(null)}>
          <aside
            className="creator-drawer-panel"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Attribution Telemetry Inspection"
          >
            <div className="creator-drawer-header">
              <div>
                <div className="creator-ops-eyebrow">ATTRIBUTION AUDIT · {inspectingAttribution.trackingCode}</div>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{inspectingAttribution.creatorName}</h2>
              </div>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-secondary creator-ops-btn-sm"
                onClick={() => setInspectingAttribution(null)}
              >
                <SiteIcon name="close" size={16} />
              </button>
            </div>

            <div className="creator-drawer-body">
              <div className="creator-detail-grid">
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Short URL</div>
                  <strong style={{ color: '#93c5fd' }}>{inspectingAttribution.shortUrl}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>CTR / Conversion</div>
                  <strong>{inspectingAttribution.ctrPercent.toFixed(2)}% CTR · {inspectingAttribution.conversionRatePercent.toFixed(2)}% Conv</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Trial Enquiries</div>
                  <strong style={{ color: '#6ee7b7' }}>{inspectingAttribution.verifiedTrialEnquiries}</strong>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Authenticity Score</div>
                  <strong style={{ color: getAuthenticityColor(inspectingAttribution.authenticityScore) }}>
                    {inspectingAttribution.authenticityScore}/100
                  </strong>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.88rem' }}>Canonical UTM Parameters</h4>
                <code style={{ display: 'block', padding: '0.65rem', background: 'rgba(2,6,23,0.7)', borderRadius: '0.45rem', fontSize: '0.76rem', color: '#ddd6fe', wordBreak: 'break-all' }}>
                  {inspectingAttribution.utmTag}
                </code>
              </div>

              {inspectingAttribution.anomalyDetails && (
                <div className="creator-policy-card is-warn">
                  <strong>Anomaly Alert ({inspectingAttribution.anomalyFlag}):</strong>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{inspectingAttribution.anomalyDetails}</div>
                </div>
              )}

              <div>
                <label htmlFor="attr-drawer-note" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Traffic Audit Decision Note
                </label>
                <textarea
                  id="attr-drawer-note"
                  rows={3}
                  className="creator-textarea"
                  value={drawerNote}
                  onChange={e => setDrawerNote(e.target.value)}
                  placeholder="Document traffic verification or anomaly quarantine reasoning..."
                />
              </div>
            </div>

            <div className="creator-drawer-footer">
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-danger"
                onClick={() =>
                  handleAttributionAudit(
                    inspectingAttribution.id,
                    'flagged_excluded',
                    drawerNote || 'Quarantined due to non-organic click pattern.',
                  )
                }
              >
                Exclude Bot Traffic
              </button>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-success"
                onClick={() =>
                  handleAttributionAudit(
                    inspectingAttribution.id,
                    'verified_organic',
                    drawerNote || 'Confirmed organic grassroots sports referral traffic.',
                  )
                }
              >
                Mark Verified Organic
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* STRUCTURED DECISION MODAL */}
      {decisionModal && (
        <div className="creator-modal-backdrop" onClick={() => setDecisionModal(null)}>
          <div
            className="creator-modal-dialog"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={decisionModal.title}
          >
            <div className="creator-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{decisionModal.title}</h3>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-secondary creator-ops-btn-sm"
                onClick={() => setDecisionModal(null)}
              >
                <SiteIcon name="close" size={14} />
              </button>
            </div>
            <div className="creator-modal-body">
              <label htmlFor="decision-reason-input" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Specify Checklist Guidance / Audit Reason
              </label>
              <textarea
                id="decision-reason-input"
                rows={3}
                className="creator-textarea"
                value={decisionReason}
                onChange={e => setDecisionReason(e.target.value)}
                placeholder="Example: Caption missing visible #Ad tag or broken UTM short-link..."
              />
            </div>
            <div className="creator-modal-footer">
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-secondary"
                onClick={() => setDecisionModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="creator-ops-btn creator-ops-btn-primary"
                onClick={handleConfirmModal}
              >
                {decisionModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="creator-toast" role="status">
          <SiteIcon name="check-circle" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
