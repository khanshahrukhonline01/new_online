import React, { useState, useMemo, useCallback } from 'react'
import {
  getCreatorProfile,
  saveCreatorProfile,
  getCampaigns,
  getCampaignApplications,
  getDeliverableSubmissions,
  submitDeliverable,
  getRewardLedger,
  formatPaiseToInr,
  validateCanonicalSocialUrl,
  type CreatorProfile,
  type SocialPlatform,
  type DeliverableType,
} from './campaignClient'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './CreatorHubPage.css'

interface CreatorHubPageProps {
  onNavigate?: (event?: React.MouseEvent<HTMLAnchorElement>, target?: string) => void
}

type CreatorHubTab = 'opportunities' | 'applications' | 'submit_deliverable' | 'channels' | 'ledger'

export function CreatorHubPage({ onNavigate }: CreatorHubPageProps) {
  const [activeTab, setActiveTab] = useState<CreatorHubTab>('opportunities')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Creator profile state
  const [profile, setProfile] = useState<CreatorProfile>(() => getCreatorProfile())

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
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetPath)
      window.dispatchEvent(new PopStateEvent('popstate'))
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

  const myApplications = useMemo(() => {
    return getCampaignApplications({ creatorId: profile.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, profile.id])

  const mySubmissions = useMemo(() => {
    return getDeliverableSubmissions({ creatorId: profile.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, profile.id])

  const myLedger = useMemo(() => {
    return getRewardLedger(profile.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, profile.id])

  const totalEarningsPaise = useMemo(() => {
    return myLedger.reduce((sum, entry) => sum + entry.amountPaise, 0)
  }, [myLedger])

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

  const handleSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault()
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
    if (!newHandle.trim() || !newChannelUrl.trim()) return

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

      {/* TAB 2: MY APPLICATIONS */}
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
                {isUrlValid === true && (
                  <small className="field-hint text-green">
                    <SiteIcon name="check" size={13} /> Canonical HTTPS {subPlatform} domain verified.
                  </small>
                )}
                {isUrlValid === false && (
                  <small className="field-hint text-red">
                    <SiteIcon name="alert-circle" size={13} /> Please provide an authentic HTTPS URL matching {subPlatform}.
                  </small>
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

      {/* TAB 5: REWARD LEDGER */}
      {activeTab === 'ledger' && (
        <section className="hub-tab-content" aria-label="Append-Only Reward Ledger">
          <div className="content-sec-header">
            <h3>Append-Only Reward Ledger</h3>
            <p>Tamper-evident record of all contracted creator rewards approved for verified deliverables.</p>
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
    </div>
  )
}
