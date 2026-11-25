import React, { useState, useMemo, useCallback } from 'react'
import {
  getCreatorProfileForUser,
  saveCreatorProfile,
  getCampaigns,
  getCampaignApplications,
  getDeliverableSubmissions,
  submitDeliverable,
  getRewardLedger,
  formatPaiseToInr,
  validateCanonicalSocialUrl,
  validateDeliverableUrl,
  getCreatorEarningsSummary,
  type CreatorProfile,
  type SocialPlatform,
  type DeliverableType,
} from './campaignClient'
import { getStoredAuthUser } from '../../integrations/supabase/auth-client'
import { EmptyState } from '../../shared/components/ui/EmptyState'
import { useFormState } from '../../shared/hooks/useFormState'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { useRouter } from '../../shared/routing/useRouter'
import './CreatorHubPage.css'

interface CreatorHubPageProps {
  onNavigate?: (event?: React.MouseEvent<HTMLAnchorElement>, target?: string) => void
}

type CreatorHubTab = 'opportunities' | 'kanban_pipeline' | 'applications' | 'submit_deliverable' | 'channels' | 'ledger'

export function CreatorHubPage({ onNavigate }: CreatorHubPageProps) {
  const { navigate } = useRouter()
  const authUser = getStoredAuthUser()
  const [activeTab, setActiveTab] = useState<CreatorHubTab>('opportunities')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Creator profile state (requires authenticated user or explicit registration — no fabricated demo profile)
  const [profile, setProfile] = useState<CreatorProfile | null>(() =>
    getCreatorProfileForUser(authUser?.id),
  )

  const onboardForm = useFormState({
    displayName: authUser?.fullName || '',
    handle: authUser?.fullName
      ? `@${authUser.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
      : '',
    primarySport: authUser?.preferredSports?.[0] || 'Cricket',
    locationCity: authUser?.city || 'Delhi NCR',
    bio: 'Grassroots Indian sports creator covering verified trials and coaching stories.',
  })

  // Deliverable submission state
  const [subCampaignId, setSubCampaignId] = useState<string>('')
  const [subDeliverableType, setSubDeliverableType] = useState<DeliverableType>('reel_short')
  const [subCanonicalUrl, setSubCanonicalUrl] = useState('')
  const [subPlatform, setSubPlatform] = useState<SocialPlatform>('youtube')
  const [subDisclosureConfirmed, setSubDisclosureConfirmed] = useState(false)
  const [submissionFeedback, setSubmissionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // New channel state
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>('instagram')
  const [newHandle, setNewHandle] = useState('')
  const [newChannelUrl, setNewChannelUrl] = useState('')
  const [newFollowers, setNewFollowers] = useState<number>(5000)

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

  // Live data loads
  const campaigns = useMemo(() => {
    return getCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const profileId = profile?.id ?? ''

  const myApplications = useMemo(() => {
    if (!profileId) return []
    return getCampaignApplications({ creatorId: profileId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, profileId])

  const mySubmissions = useMemo(() => {
    if (!profileId) return []
    return getDeliverableSubmissions({ creatorId: profileId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, profileId])

  const myLedger = useMemo(() => {
    if (!profileId) return []
    return getRewardLedger(profileId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, profileId])

  const totalEarningsPaise = useMemo(() => {
    return myLedger.reduce((sum, entry) => sum + entry.amountPaise, 0)
  }, [myLedger])

  const earningsSummary = useMemo(() => {
    if (!profileId) {
      return {
        clearedPaise: 0,
        pendingReviewPaise: 0,
        disputedPaise: 0,
        lifetimeEarnedPaise: 0,
        completedDeliverablesCount: 0,
      }
    }
    return getCreatorEarningsSummary(profileId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, refreshTrigger])

  // Selected campaigns eligible for deliverable submission
  const eligibleSelectedCampaigns = useMemo(() => {
    const selectedIds = new Set(
      myApplications.filter(a => a.status === 'selected').map(a => a.campaignId)
    )
    return campaigns.filter(c => selectedIds.has(c.id))
  }, [campaigns, myApplications])

  // Real-time URL validation
  const isUrlValid = useMemo(() => {
    if (!subCanonicalUrl.trim()) return null
    return validateCanonicalSocialUrl(subCanonicalUrl, subPlatform)
  }, [subCanonicalUrl, subPlatform])

  const liveUrlValidation = useMemo(() => {
    if (!subCanonicalUrl.trim()) return null
    return validateDeliverableUrl(subCanonicalUrl, subPlatform)
  }, [subCanonicalUrl, subPlatform])

  const handleDownloadStatement = () => {
    if (typeof window === 'undefined' || !profile) return
    const rows = [
      ['Transaction ID', 'Date', 'Description', 'Amount Paise', 'Amount INR', 'Status'],
      ...myLedger.map(l => [
        l.id,
        new Date(l.createdAt).toLocaleDateString('en-IN'),
        `"${l.description.replace(/"/g, '""')}"`,
        l.amountPaise.toString(),
        formatPaiseToInr(l.amountPaise).replace(/₹\s*/, 'INR '),
        l.status,
      ]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `khelgrid_creator_statement_${profile.handle.replace('@', '')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSubmissionFeedback(null)

    if (!subCampaignId) {
      setSubmissionFeedback({ type: 'error', message: 'Please select a campaign for this deliverable.' })
      return
    }

    if (!isUrlValid) {
      setSubmissionFeedback({
        type: 'error',
        message: `Please enter a valid, canonical HTTPS ${subPlatform} URL.`,
      })
      return
    }

    if (!subDisclosureConfirmed) {
      setSubmissionFeedback({
        type: 'error',
        message: 'You must confirm that required sponsorship disclosures (#Ad, #Sponsored) are in the post.',
      })
      return
    }

    const res = submitDeliverable({
      campaignId: subCampaignId,
      creatorId: profile.id,
      creatorName: profile.displayName,
      deliverableSpecId: `spec-${Date.now()}`,
      deliverableType: subDeliverableType,
      canonicalPostUrl: subCanonicalUrl.trim(),
      platform: subPlatform,
      disclosureVerified: true,
    })

    if (res.success) {
      setSubmissionFeedback({
        type: 'success',
        message: 'Deliverable submitted! Campaign owner and moderators have been notified.',
      })
      setSubCanonicalUrl('')
      setSubDisclosureConfirmed(false)
      triggerRefresh()
    } else {
      setSubmissionFeedback({ type: 'error', message: res.message })
    }
  }

  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !newHandle.trim() || !newChannelUrl.trim()) return

    const updatedProfile: CreatorProfile = {
      ...profile,
      platforms: [
        ...profile.platforms,
        {
          platform: newPlatform,
          handle: newHandle.trim(),
          channelUrl: newChannelUrl.trim(),
          followerCount: Number(newFollowers) || 0,
          isVerified: false,
        },
      ],
    }

    saveCreatorProfile(updatedProfile)
    setProfile(updatedProfile)
    setNewHandle('')
    setNewChannelUrl('')
  }

  return (
    <div className="creator-hub-page">
      {/* Top Breadcrumbs */}
      <div className="hub-top-bar">
        <div className="hub-breadcrumbs">
          <button type="button" className="crumb-btn" onClick={() => handleNav('/')}>
            <SiteIcon name="home" size={14} /> Home
          </button>
          <span className="crumb-sep">/</span>
          <button type="button" className="crumb-btn" onClick={() => handleNav('/campaigns')}>
            Campaigns
          </button>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Sports Creator Hub</span>
        </div>

        <div className="hub-top-actions">
          <button
            type="button"
            className="btn-sec-action"
            onClick={() => handleNav('/campaigns')}
          >
            <SiteIcon name="search" size={15} />
            <span>Discover Campaigns</span>
          </button>
          <button
            type="button"
            className="btn-sec-action"
            onClick={() => handleNav('/campaigns/manage')}
          >
            <SiteIcon name="building" size={15} />
            <span>Advertiser Desk</span>
          </button>
        </div>
      </div>

      {/* Creator Profile Guard & Honest Onboarding */}
      {!profile ? (
        <section className="kg-workflow-card" aria-label="Creator onboarding">
          {!authUser ? (
            <EmptyState
              icon={<SiteIcon name="award" size={26} />}
              title="Sign in to open your Sports Creator Hub"
              description="Pitch to verified academies and tournaments, track campaign deliverables, and manage reward ledgers under your own account."
              action={
                <>
                  <a href="/login" onClick={e => handleNav('/login', e)} className="kg-btn kg-btn-primary kg-touch-target">
                    Sign In
                  </a>
                  <a href="/campaigns" onClick={e => handleNav('/campaigns', e)} className="kg-btn kg-touch-target">
                    Browse Public Campaigns
                  </a>
                </>
              }
            />
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault()
                if (!onboardForm.fields.displayName.trim() || !onboardForm.fields.handle.trim()) {
                  onboardForm.setError('displayName', 'Display name and creator handle are required.')
                  return
                }
                const newProfile: CreatorProfile = {
                  id: `creator-${authUser.id}`,
                  userId: authUser.id,
                  displayName: onboardForm.fields.displayName.trim(),
                  handle: onboardForm.fields.handle.trim().startsWith('@')
                    ? onboardForm.fields.handle.trim()
                    : `@${onboardForm.fields.handle.trim()}`,
                  bio: onboardForm.fields.bio.trim(),
                  primarySport: onboardForm.fields.primarySport.trim() || 'Multi-Sport',
                  platforms: [],
                  locationCity: onboardForm.fields.locationCity.trim() || 'India',
                  languages: ['English', 'Hindi'],
                  isVerifiedCreator: Boolean(authUser.isVerified),
                  totalEarningsPaise: 0,
                  completedDeliverablesCount: 0,
                  joinedAt: new Date().toISOString(),
                }
                saveCreatorProfile(newProfile)
                setProfile(newProfile)
              }}
            >
              <h2 style={{ margin: '0 0 0.5rem' }}>Complete Your Sports Creator Profile</h2>
              <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.88rem' }}>
                Set up your creator identity for {authUser.email} to apply for brand briefs and submit deliverables.
              </p>
              <div className="kg-form-grid">
                <label className="kg-form-field">
                  <span>Creator Display Name *</span>
                  <input
                    className="kg-form-input"
                    value={onboardForm.fields.displayName}
                    onChange={e => onboardForm.setField('displayName', e.target.value)}
                    placeholder="e.g. Mumbai Pitch Diary"
                  />
                </label>
                <label className="kg-form-field">
                  <span>Primary Handle *</span>
                  <input
                    className="kg-form-input"
                    value={onboardForm.fields.handle}
                    onChange={e => onboardForm.setField('handle', e.target.value)}
                    placeholder="@your_handle"
                  />
                </label>
                <label className="kg-form-field">
                  <span>Primary Sport</span>
                  <input
                    className="kg-form-input"
                    value={onboardForm.fields.primarySport}
                    onChange={e => onboardForm.setField('primarySport', e.target.value)}
                  />
                </label>
                <label className="kg-form-field">
                  <span>City</span>
                  <input
                    className="kg-form-input"
                    value={onboardForm.fields.locationCity}
                    onChange={e => onboardForm.setField('locationCity', e.target.value)}
                  />
                </label>
              </div>
              {onboardForm.errors.displayName && (
                <p className="kg-field-error">{onboardForm.errors.displayName}</p>
              )}
              <div className="host-action-row">
                <button type="submit" className="kg-btn kg-btn-primary kg-touch-target">
                  Activate Creator Workspace
                </button>
              </div>
            </form>
          )}
        </section>
      ) : (
        <>
      {/* Creator Profile Hero Card */}
      <header className="creator-profile-card">
        <div className="creator-card-left">
          <div className="creator-avatar">
            {profile.displayName.charAt(0)}
          </div>
          <div>
            <div className="creator-name-row">
              <h2>{profile.displayName}</h2>
              {profile.isVerifiedCreator && (
                <span className="creator-verified-badge" title="Verified Sports Creator">
                  <SiteIcon name="badge-check" size={16} />
                  <span>Verified Creator</span>
                </span>
              )}
            </div>
            <p className="creator-handle">{profile.handle} · {profile.primarySport} · {profile.locationCity}</p>
            <p className="creator-bio">{profile.bio}</p>
          </div>
        </div>

        <div className="creator-card-stats">
          <div className="c-stat-box">
            <span className="c-stat-lbl">Ledger Earnings</span>
            <strong className="c-stat-val text-green">{formatPaiseToInr(totalEarningsPaise)}</strong>
            <span className="c-stat-sub">Sandbox ledger balance</span>
          </div>
          <div className="c-stat-box">
            <span className="c-stat-lbl">Applications</span>
            <strong className="c-stat-val">{myApplications.length}</strong>
            <span className="c-stat-sub">{myApplications.filter(a => a.status === 'selected').length} selected</span>
          </div>
          <div className="c-stat-box">
            <span className="c-stat-lbl">Deliverables</span>
            <strong className="c-stat-val">{mySubmissions.length}</strong>
            <span className="c-stat-sub">{mySubmissions.filter(s => s.status === 'accepted').length} accepted</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="hub-tabs-bar" role="tablist" aria-label="Creator Hub Navigation">
        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'opportunities' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('opportunities')}
          role="tab"
          aria-selected={activeTab === 'opportunities'}
        >
          <SiteIcon name="award" size={15} />
          <span>Opportunities ({campaigns.length})</span>
        </button>
        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'kanban_pipeline' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('kanban_pipeline')}
          role="tab"
          aria-selected={activeTab === 'kanban_pipeline'}
        >
          <SiteIcon name="award" size={15} />
          <span>Deliverable Pipeline</span>
        </button>
        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'applications' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('applications')}
          role="tab"
          aria-selected={activeTab === 'applications'}
        >
          <SiteIcon name="file-text" size={15} />
          <span>My Applications ({myApplications.length})</span>
        </button>
        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'submit_deliverable' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('submit_deliverable')}
          role="tab"
          aria-selected={activeTab === 'submit_deliverable'}
        >
          <SiteIcon name="upload" size={15} />
          <span>Submit Deliverable</span>
        </button>
        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'channels' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('channels')}
          role="tab"
          aria-selected={activeTab === 'channels'}
        >
          <SiteIcon name="share" size={15} />
          <span>Channels ({profile.platforms.length})</span>
        </button>
        <button
          type="button"
          className={`hub-tab-btn ${activeTab === 'ledger' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('ledger')}
          role="tab"
          aria-selected={activeTab === 'ledger'}
        >
          <SiteIcon name="wallet" size={15} />
          <span>Reward Ledger ({myLedger.length})</span>
        </button>
      </nav>

      {/* TAB 1: OPPORTUNITIES */}
      {activeTab === 'opportunities' && (
        <section className="hub-tab-content" aria-label="Opportunities">
          <div className="content-sec-header">
            <h3>Verified Sports Campaigns Open for Pitch</h3>
            <p>Browse active campaigns from grassroots academies, coaches, and sports brands.</p>
          </div>

          <div className="opp-cards-grid">
            {campaigns.map(camp => {
              const applied = myApplications.find(a => a.campaignId === camp.id)

              return (
                <div key={camp.id} className="opp-mini-card">
                  <div className="mini-card-top">
                    <span className="mini-sport-badge">{camp.sport}</span>
                    <span className="mini-city">{camp.locationCity}</span>
                  </div>
                  <h4>{camp.title}</h4>
                  <p className="mini-adv"><strong>{camp.advertiserName}</strong> ({camp.advertiserRole})</p>
                  <p className="mini-purpose">{camp.purpose}</p>

                  <div className="mini-card-footer">
                    <div className="mini-reward">
                      <span>Reward:</span>
                      <strong>{formatPaiseToInr(camp.perDeliverableFeePaise)}</strong>
                    </div>

                    {applied ? (
                      <span className={`applied-pill status-${applied.status}`}>
                        {applied.status === 'applied' ? 'Applied' : applied.status.toUpperCase()}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-apply-mini"
                        onClick={() => handleNav('/campaigns')}
                      >
                        Pitch Now
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* TAB 2: KANBAN PIPELINE */}
      {activeTab === 'kanban_pipeline' && (
        <section className="hub-tab-content" aria-label="Deliverable Pipeline">
          <div className="content-sec-header">
            <h3>Creator Deliverable Pipeline</h3>
            <p>Track your content assignments from selection to verification and reward payout.</p>
          </div>

          <div className="kanban-board">
            {/* Column 1: Contracted / In Production */}
            <div className="kanban-column">
              <div className="kanban-col-header">
                <h4>1. In Production</h4>
                <span className="kanban-col-count">
                  {myApplications.filter(a => a.status === 'selected').length}
                </span>
              </div>
              {myApplications.filter(a => a.status === 'selected').length === 0 ? (
                <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center' }}>
                  No active assignments
                </div>
              ) : (
                myApplications.filter(a => a.status === 'selected').map(app => (
                  <div key={app.id} className="kanban-card">
                    <h5>{app.campaignTitle}</h5>
                    <div className="kanban-meta-row">
                      <span className="platform-tag">{app.platform}</span>
                      <span className="kanban-fee">Contracted</span>
                    </div>
                    <button
                      type="button"
                      className="btn-submit-quick"
                      onClick={() => {
                        setSubCampaignId(app.campaignId)
                        setActiveTab('submit_deliverable')
                      }}
                    >
                      Submit Link
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Column 2: Submitted / Under Review */}
            <div className="kanban-column">
              <div className="kanban-col-header">
                <h4>2. Under Review</h4>
                <span className="kanban-col-count">
                  {mySubmissions.filter(s => s.status === 'submitted').length}
                </span>
              </div>
              {mySubmissions.filter(s => s.status === 'submitted').length === 0 ? (
                <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center' }}>
                  No pending reviews
                </div>
              ) : (
                mySubmissions.filter(s => s.status === 'submitted').map(sub => (
                  <div key={sub.id} className="kanban-card">
                    <h5>{sub.campaignTitle}</h5>
                    <div className="kanban-meta-row">
                      <span className="platform-tag">{sub.platform}</span>
                      <span className="kanban-fee">{formatPaiseToInr(sub.rewardAmountPaise)}</span>
                    </div>
                    <a href={sub.canonicalPostUrl} target="_blank" rel="noopener noreferrer" className="live-post-link">
                      <span>View Live Post</span>
                      <SiteIcon name="external-link" size={12} />
                    </a>
                  </div>
                ))
              )}
            </div>

            {/* Column 3: Revision Requested */}
            <div className="kanban-column">
              <div className="kanban-col-header">
                <h4>3. Revisions</h4>
                <span className="kanban-col-count">
                  {mySubmissions.filter(s => s.status === 'revision_requested').length}
                </span>
              </div>
              {mySubmissions.filter(s => s.status === 'revision_requested').length === 0 ? (
                <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center' }}>
                  Zero revisions required
                </div>
              ) : (
                mySubmissions.filter(s => s.status === 'revision_requested').map(sub => (
                  <div key={sub.id} className="kanban-card" style={{ borderLeft: '3px solid #f59e0b' }}>
                    <h5>{sub.campaignTitle}</h5>
                    <p style={{ fontSize: '0.75rem', color: '#b45309', margin: '4px 0' }}>
                      <strong>Feedback:</strong> {sub.reviewNotes || 'Please adjust caption disclosure.'}
                    </p>
                    <button
                      type="button"
                      className="btn-submit-quick"
                      onClick={() => {
                        setSubCampaignId(sub.campaignId)
                        setSubCanonicalUrl(sub.canonicalPostUrl)
                        setActiveTab('submit_deliverable')
                      }}
                    >
                      Resubmit Link
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Column 4: Approved & Rewarded */}
            <div className="kanban-column">
              <div className="kanban-col-header">
                <h4>4. Approved &amp; Paid</h4>
                <span className="kanban-col-count">
                  {mySubmissions.filter(s => s.status === 'accepted').length}
                </span>
              </div>
              {mySubmissions.filter(s => s.status === 'accepted').length === 0 ? (
                <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center' }}>
                  No approved items yet
                </div>
              ) : (
                mySubmissions.filter(s => s.status === 'accepted').map(sub => (
                  <div key={sub.id} className="kanban-card" style={{ borderLeft: '3px solid #10b981' }}>
                    <h5>{sub.campaignTitle}</h5>
                    <div className="kanban-meta-row">
                      <span className="platform-tag">{sub.platform}</span>
                      <span className="kanban-fee text-green">{formatPaiseToInr(sub.rewardAmountPaise)}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                      ✓ Credited in Ledger
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: MY APPLICATIONS */}
      {activeTab === 'applications' && (
        <section className="hub-tab-content" aria-label="My Applications">
          <div className="content-sec-header">
            <h3>My Campaign Applications</h3>
            <p>Track pitches submitted to sports advertisers and academies.</p>
          </div>

          {myApplications.length === 0 ? (
            <div className="empty-tab-state">
              <SiteIcon name="file-text" size={32} />
              <h4>No applications yet</h4>
              <p>Explore active opportunities and submit pitches to sports campaigns.</p>
              <button
                type="button"
                className="btn-pri-action"
                onClick={() => setActiveTab('opportunities')}
              >
                Browse Opportunities
              </button>
            </div>
          ) : (
            <div className="applications-table-wrap">
              <table className="manage-table" aria-label="My Campaign Applications">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Platform &amp; Handle</th>
                    <th>My Pitch Note</th>
                    <th>Applied At</th>
                    <th>Status</th>
                    <th>Next Steps</th>
                  </tr>
                </thead>
                <tbody>
                  {myApplications.map(app => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.campaignTitle}</strong>
                      </td>
                      <td>
                        <span className="platform-tag">{app.platform}</span>
                        <div><code>{app.creatorHandle}</code></div>
                      </td>
                      <td className="cell-pitch">{app.pitchNote}</td>
                      <td>{new Date(app.appliedAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className={`app-status-badge status-${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>
                        {app.status === 'selected' ? (
                          <button
                            type="button"
                            className="btn-submit-quick"
                            onClick={() => {
                              setSubCampaignId(app.campaignId)
                              setActiveTab('submit_deliverable')
                            }}
                          >
                            Submit Deliverable
                          </button>
                        ) : app.status === 'applied' ? (
                          <span className="text-muted">Awaiting advertiser decision</span>
                        ) : (
                          <span className="text-muted">Completed / Archived</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: SUBMIT DELIVERABLE */}
      {activeTab === 'submit_deliverable' && (
        <section className="hub-tab-content" aria-label="Submit Deliverable">
          <div className="content-sec-header">
            <h3>Submit Completed Deliverable</h3>
            <p>Provide the live canonical URL of your published social media post for advertiser and moderator verification.</p>
          </div>

          <div className="submission-form-container">
            {submissionFeedback && (
              <div className={`apply-feedback-banner ${submissionFeedback.type}`} role="alert">
                <SiteIcon name={submissionFeedback.type === 'success' ? 'check-circle' : 'alert-circle'} size={18} />
                <span>{submissionFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitDeliverable} className="deliverable-form">
              <div className="form-group">
                <label htmlFor="select-campaign">Campaign *</label>
                <select
                  id="select-campaign"
                  value={subCampaignId}
                  onChange={e => setSubCampaignId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Campaign --</option>
                  {eligibleSelectedCampaigns.length > 0 ? (
                    eligibleSelectedCampaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.sport} · {formatPaiseToInr(c.perDeliverableFeePaise)})
                      </option>
                    ))
                  ) : (
                    campaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.sport} · {formatPaiseToInr(c.perDeliverableFeePaise)})
                      </option>
                    ))
                  )}
                </select>
                <small className="field-hint">
                  {eligibleSelectedCampaigns.length > 0
                    ? 'Showing campaigns where your creator pitch was selected.'
                    : 'Showing available campaigns.'}
                </small>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="del-platform">Social Media Platform *</label>
                  <select
                    id="del-platform"
                    value={subPlatform}
                    onChange={e => setSubPlatform(e.target.value as SocialPlatform)}
                  >
                    <option value="youtube">YouTube (Video / Shorts)</option>
                    <option value="instagram">Instagram (Reel / Post)</option>
                    <option value="x_twitter">X / Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="del-format-type">Deliverable Format *</label>
                  <select
                    id="del-format-type"
                    value={subDeliverableType}
                    onChange={e => setSubDeliverableType(e.target.value as DeliverableType)}
                  >
                    <option value="reel_short">Reel / YouTube Short</option>
                    <option value="long_video">Long-Form Video</option>
                    <option value="post_photo">Carousel / Photo Post</option>
                    <option value="story_status">Story / Status Series</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="canonical-url">Canonical Published Post URL *</label>
                <input
                  id="canonical-url"
                  type="url"
                  placeholder={
                    subPlatform === 'youtube'
                      ? 'https://youtube.com/shorts/... or https://youtu.be/...'
                      : 'https://instagram.com/reel/...'
                  }
                  value={subCanonicalUrl}
                  onChange={e => setSubCanonicalUrl(e.target.value)}
                  required
                />
                {liveUrlValidation && (
                  <div style={{
                    marginTop: '0.4rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    background: liveUrlValidation.valid ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${liveUrlValidation.valid ? '#bbf7d0' : '#fecaca'}`,
                  }}>
                    {liveUrlValidation.valid ? (
                      <span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <SiteIcon name="check-circle" size={14} />
                        <strong>Valid {liveUrlValidation.platform} URL:</strong> {liveUrlValidation.domain} canonical post detected.
                      </span>
                    ) : (
                      <span style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <SiteIcon name="alert-circle" size={14} />
                        {liveUrlValidation.error}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="disclosure-checkbox-wrap">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={subDisclosureConfirmed}
                    onChange={e => setSubDisclosureConfirmed(e.target.checked)}
                    required
                  />
                  <span>
                    I confirm that required sponsorship disclosures (<strong>#Ad #Sponsored</strong>) are clearly visible in the published caption and content.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="btn-pri-action btn-submit-deliv"
              >
                <SiteIcon name="upload" size={16} />
                <span>Submit Deliverable for Review</span>
              </button>
            </form>

            {/* Submissions List */}
            {mySubmissions.length > 0 && (
              <div className="recent-submissions-box">
                <h4>My Submitted Deliverables ({mySubmissions.length})</h4>
                <div className="deliverables-table-wrap">
                  <table className="manage-table" aria-label="My Submitted Deliverables">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Format</th>
                        <th>Post URL</th>
                        <th>Disclosure</th>
                        <th>Reward</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mySubmissions.map(sub => (
                        <tr key={sub.id}>
                          <td><strong>{sub.campaignTitle}</strong></td>
                          <td><span className="format-tag">{sub.deliverableType.replace('_', ' ')}</span></td>
                          <td>
                            <a
                              href={sub.canonicalPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="live-post-link"
                            >
                              <span>View Post</span>
                              <SiteIcon name="external-link" size={12} />
                            </a>
                          </td>
                          <td>
                            {sub.disclosureVerified ? (
                              <span className="disclosure-badge verified">Verified</span>
                            ) : (
                              <span className="disclosure-badge unverified">Missing</span>
                            )}
                          </td>
                          <td>{formatPaiseToInr(sub.rewardAmountPaise)}</td>
                          <td>
                            <span className={`sub-status-badge status-${sub.status}`}>
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 4: CHANNELS */}
      {activeTab === 'channels' && (
        <section className="hub-tab-content" aria-label="Creator Channels">
          <div className="content-sec-header">
            <h3>Linked Social Media Channels</h3>
            <p>Manage your verified sports channels and subscriber counts.</p>
          </div>

          <div className="channels-grid">
            {profile.platforms.map((plat, idx) => (
              <div key={idx} className="channel-card">
                <div className="ch-top">
                  <span className="ch-platform-pill">{plat.platform.toUpperCase()}</span>
                  {plat.isVerified && (
                    <span className="verified-icon" title="Channel Verified">
                      <SiteIcon name="badge-check" size={15} />
                    </span>
                  )}
                </div>
                <h4 className="ch-handle">@{plat.handle.replace(/^@/, '')}</h4>
                <p className="ch-subs">
                  <strong>{plat.followerCount.toLocaleString('en-IN')}</strong> followers / subscribers
                </p>
                <a
                  href={plat.channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ch-link"
                >
                  <span>Open Channel</span>
                  <SiteIcon name="external-link" size={12} />
                </a>
              </div>
            ))}
          </div>

          <div className="add-channel-box">
            <h4>Link Another Sports Channel</h4>
            <form onSubmit={handleAddChannel} className="add-channel-form">
              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="new-ch-plat">Platform</label>
                  <select
                    id="new-ch-plat"
                    value={newPlatform}
                    onChange={e => setNewPlatform(e.target.value as SocialPlatform)}
                  >
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="x_twitter">X / Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="new-ch-handle">Handle</label>
                  <input
                    id="new-ch-handle"
                    type="text"
                    placeholder="@handle"
                    value={newHandle}
                    onChange={e => setNewHandle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new-ch-followers">Followers / Subscribers</label>
                  <input
                    id="new-ch-followers"
                    type="number"
                    min="100"
                    value={newFollowers}
                    onChange={e => setNewFollowers(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="new-ch-url">Channel URL</label>
                <input
                  id="new-ch-url"
                  type="url"
                  placeholder="https://..."
                  value={newChannelUrl}
                  onChange={e => setNewChannelUrl(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-sec-action">
                <SiteIcon name="plus" size={14} />
                <span>Link Channel</span>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 6: REWARD LEDGER */}
      {activeTab === 'ledger' && (
        <section className="hub-tab-content" aria-label="Append-Only Reward Ledger">
          <div className="content-sec-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3>Append-Only Reward Ledger</h3>
              <p>Tamper-evident record of all contracted creator rewards approved for verified deliverables.</p>
            </div>
            {myLedger.length > 0 && (
              <button
                type="button"
                className="btn-sec-action"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handleDownloadStatement}
                title="Export tamper-evident ledger as CSV statement"
              >
                <SiteIcon name="download" size={14} />
                <span>Download Statement (CSV)</span>
              </button>
            )}
          </div>

          {/* Earnings Summary Banner */}
          <div className="earnings-summary-banner">
            <div className="earnings-box">
              <span className="earnings-box-lbl">Cleared Balance</span>
              <div className="earnings-box-val text-green">{formatPaiseToInr(earningsSummary.clearedPaise)}</div>
              <small style={{ color: '#64748b' }}>Approved &amp; payable</small>
            </div>
            <div className="earnings-box">
              <span className="earnings-box-lbl">In Review / Escrow</span>
              <div className="earnings-box-val">{formatPaiseToInr(earningsSummary.pendingReviewPaise)}</div>
              <small style={{ color: '#64748b' }}>Pending advertiser review</small>
            </div>
            <div className="earnings-box">
              <span className="earnings-box-lbl">Lifetime Earned</span>
              <div className="earnings-box-val">{formatPaiseToInr(earningsSummary.lifetimeEarnedPaise)}</div>
              <small style={{ color: '#64748b' }}>{earningsSummary.completedDeliverablesCount} verified deliverables</small>
            </div>
          </div>

          <div className="ledger-notice-callout">
            <SiteIcon name="shield-check" size={24} />
            <div>
              <strong>Sandbox Ledger Notice:</strong>
              <p>
                In strict adherence to KhelGrid financial safety invariants, creator reward payouts remain in simulated sandbox mode.
                All approved deliverables are permanently credited to this immutable ledger. Live banking payouts will be executed upon payment gateway unfreeze.
              </p>
            </div>
          </div>

          <div className="ledger-table-wrap">
            <table className="manage-table" aria-label="Creator Reward Ledger Entries">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date &amp; Time</th>
                  <th>Deliverable Description</th>
                  <th>Amount (Paise / INR)</th>
                  <th>Ledger Status</th>
                  <th>Compliance Note</th>
                </tr>
              </thead>
              <tbody>
                {myLedger.map(entry => (
                  <tr key={entry.id}>
                    <td><code>{entry.id}</code></td>
                    <td>{new Date(entry.createdAt).toLocaleString('en-IN')}</td>
                    <td>{entry.description}</td>
                    <td>
                      <strong className="text-green">{formatPaiseToInr(entry.amountPaise)}</strong>
                      <div className="text-muted"><small>({entry.amountPaise} paise)</small></div>
                    </td>
                    <td>
                      <span className="ledger-status-pill">
                        <SiteIcon name="check-circle" size={12} /> {entry.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="cell-pitch"><small>{entry.payoutLockdownNote}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
        </>
      )}
    </div>
  )
}
