import { useState, useEffect, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  submitListingIntake,
  getSubmissionTrackingStatus,
  resubmitListingSubmission,
  type ListingSubmissionInput,
  type SubmissionTrackingDetails,
} from '../../integrations/supabase/public-client'
import './ListingSubmissionPage.css'

const listingTypes: Array<{ id: ListingSubmissionInput['listing_type']; label: string }> = [
  { id: 'opportunity', label: 'Sports Trial / Selection Camp' },
  { id: 'venue', label: 'Sports Venue / Arena / Turf' },
  { id: 'academy', label: 'Academy / Training Centre' },
  { id: 'coach', label: 'Coach / Personal Trainer' },
  { id: 'event', label: 'Tournament / Sports Event' },
  { id: 'pickup_game', label: 'Community Pickup Game' },
  { id: 'sport', label: 'New Sport Suggestion' },
]

export interface ListingSubmissionPageProps {
  defaultTab?: 'submit' | 'track'
}

export default function ListingSubmissionPage({ defaultTab = 'submit' }: ListingSubmissionPageProps) {
  const [activeTab, setActiveTab] = useState<'submit' | 'track'>(defaultTab)

  // Submission Form State
  const [kind, setKind] = useState<ListingSubmissionInput['listing_type']>('opportunity')
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [details, setDetails] = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Submission Result State
  const [submittedData, setSubmittedData] = useState<{
    referenceNumber: string
    trackingKey: string
    title: string
    listingType: string
  } | null>(null)

  // Tracking State
  const [trackRef, setTrackRef] = useState('')
  const [trackKey, setTrackKey] = useState('')
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [trackedSubmission, setTrackedSubmission] = useState<SubmissionTrackingDetails | null>(null)
  const [trackError, setTrackError] = useState('')
  const [trackNotice, setTrackNotice] = useState('')

  // Resubmission State
  const [resubmitTitle, setResubmitTitle] = useState('')
  const [resubmitCity, setResubmitCity] = useState('')
  const [resubmitSourceUrl, setResubmitSourceUrl] = useState('')
  const [resubmitDetails, setResubmitDetails] = useState('')
  const [resubmitting, setResubmitting] = useState(false)

  // Auto-fill from query params (?ref=...&key=...)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref') || params.get('reference')
    const key = params.get('key') || params.get('tracking_key')
    if (ref) {
      setTrackRef(ref)
      if (key) setTrackKey(key)
      setActiveTab('track')
      void performTrackingLookup(ref, key || undefined)
    }
  }, [])

  async function performTrackingLookup(refNum: string, keyVal?: string) {
    if (!refNum.trim()) {
      setTrackError('Please enter a valid submission reference number.')
      return
    }
    setTrackingLoading(true)
    setTrackError('')
    setTrackNotice('')
    try {
      const res = await getSubmissionTrackingStatus(refNum.trim(), keyVal?.trim() || undefined)
      if (res.status === 'found') {
        setTrackedSubmission(res.data)
        setResubmitTitle(res.data.title)
        setResubmitCity(res.data.city || '')
        setResubmitSourceUrl(res.data.source_url || '')
        setResubmitDetails(res.data.details || '')
      } else {
        setTrackedSubmission(null)
        setTrackError(res.message)
      }
    } catch (err) {
      setTrackedSubmission(null)
      setTrackError(err instanceof Error ? err.message : 'Could not retrieve tracking details.')
    } finally {
      setTrackingLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setSubmittedData(null)

    if (title.trim().length < 2) {
      setSubmitError('Enter a listing title with at least 2 characters.')
      return
    }

    let normalizedSource = ''
    if (sourceUrl.trim()) {
      try {
        const parsed = new URL(sourceUrl.trim())
        if (parsed.protocol !== 'https:') throw new Error('HTTPS required')
        normalizedSource = parsed.href
      } catch {
        setSubmitError('Official source must be a valid HTTPS URL (e.g. https://…).')
        return
      }
    }

    setSubmitting(true)
    try {
      const result = await submitListingIntake({
        listing_type: kind,
        title: title.trim(),
        city: city.trim(),
        source_url: normalizedSource,
        details: details.trim(),
        submitter_email: submitterEmail.trim() || undefined,
      })

      if (result.status === 'submitted') {
        const refNumber = result.reference_number || `KHL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        const tKey = result.tracking_key || ''

        setSubmittedData({
          referenceNumber: refNumber,
          trackingKey: tKey,
          title: title.trim(),
          listingType: kind,
        })

        setTrackRef(refNumber)
        setTrackKey(tKey)

        setTitle('')
        setCity('')
        setSourceUrl('')
        setDetails('')
        setSubmitterEmail('')
      } else if (result.status === 'unconfigured') {
        setSubmitError('Database submissions are not configured on this deployment. No listing was submitted.')
      } else {
        setSubmitError(result.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTrackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await performTrackingLookup(trackRef, trackKey || undefined)
  }

  async function handleResubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trackedSubmission || !trackKey) return

    setResubmitting(true)
    setTrackError('')
    setTrackNotice('')

    try {
      const res = await resubmitListingSubmission(trackedSubmission.reference_number, trackKey, {
        title: resubmitTitle.trim(),
        city: resubmitCity.trim(),
        source_url: resubmitSourceUrl.trim() || undefined,
        details: resubmitDetails.trim(),
      })

      if (res.success) {
        setTrackNotice('Listing resubmitted successfully! It has returned to the moderation queue for review.')
        await performTrackingLookup(trackedSubmission.reference_number, trackKey)
      } else {
        setTrackError(res.message || 'Resubmission could not be processed.')
      }
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : 'Resubmission failed.')
    } finally {
      setResubmitting(false)
    }
  }

  function getStepClass(step: string, currentStatus: string) {
    if (step === 'submitted') return 'completed'
    if (step === 'under_review') {
      if (['under_review', 'changes_requested', 'resubmitted', 'approved', 'published'].includes(currentStatus)) return 'completed'
      return ''
    }
    if (step === 'decision') {
      if (currentStatus === 'rejected') return 'rejected'
      if (currentStatus === 'changes_requested') return 'changes_requested'
      if (['approved', 'published'].includes(currentStatus)) return 'completed'
      return ''
    }
    if (step === 'published') {
      if (currentStatus === 'published') return 'completed'
      return ''
    }
    return ''
  }

  return (
    <section className="content-page listing-submission-page">
      <p className="eyebrow">KHELGRID · LISTING INTAKE & MODERATION</p>
      <h1>Put your sports listing on the map.</h1>
      <p className="page-intro">
        Share a genuine sports trial, venue, coach, academy, event or community opportunity. KhelGrid reviews submissions before anything is published.
      </p>

      {/* Navigation Tabs */}
      <nav className="listing-tabs-nav" aria-label="Intake options">
        <button
          type="button"
          className={`listing-tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          <SiteIcon name="plus" size={16} /> Suggest a Listing
        </button>
        <button
          type="button"
          className={`listing-tab-btn ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => setActiveTab('track')}
        >
          <SiteIcon name="search" size={16} /> Track Submission Status
        </button>
      </nav>

      {/* Tab 1: Submit Form */}
      {activeTab === 'submit' && (
        <>
          <div className="listing-free-banner" role="note">
            <span className="listing-free-icon"><SiteIcon name="shield-check" size={20} /></span>
            <div>
              <strong>Free to submit · No listing payment</strong>
              <p>Venue, coach and sports-trial listings are free. There is no listing subscription, checkout or payment step. KhelGrid reviews the information and supporting evidence before publication.</p>
            </div>
          </div>
          <div className="cv-privacy-note" role="note">
            <SiteIcon name="shield-check" size={18} />
            <span>
              <strong>Review before publication.</strong> Your submission stays private while a moderator checks the source, key facts and category-specific evidence. Editorial approval and evidence verification are recorded separately.
            </span>
          </div>

          {submittedData && (
            <div className="listing-success-box" role="status">
              <h2><SiteIcon name="check-circle" size={22} /> Suggestion Received for Moderator Review</h2>
              <p>Your listing has been assigned a unique reference code. Save this code and your private tracking key to monitor review progress or respond to correction requests.</p>
              
              <div className="listing-ref-highlight">
                <div>
                  <small style={{ color: '#065f46', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Reference Number</small>
                  <span className="listing-ref-val">{submittedData.referenceNumber}</span>
                </div>
                {submittedData.trackingKey && (
                  <div style={{ marginLeft: 'auto' }}>
                    <small style={{ color: '#065f46', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Private Tracking Key</small>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#1f2937' }}>{submittedData.trackingKey}</span>
                  </div>
                )}
              </div>

              <div className="cv-actions" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="primary-link"
                  onClick={() => {
                    setActiveTab('track')
                    void performTrackingLookup(submittedData.referenceNumber, submittedData.trackingKey)
                  }}
                >
                  <SiteIcon name="search" size={16} /> Track Status Now
                </button>
                <button
                  type="button"
                  className="secondary-link"
                  onClick={() => setSubmittedData(null)}
                >
                  Submit Another Listing
                </button>
              </div>
            </div>
          )}

          <form className="sports-cv-form" onSubmit={handleSubmit}>
            <fieldset disabled={submitting}>
              <legend>Listing details</legend>
              <div className="cv-field-grid">
                <label>
                  Listing category *
                  <select
                    required
                    value={kind}
                    onChange={e => setKind(e.target.value as ListingSubmissionInput['listing_type'])}
                  >
                    {listingTypes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="listing-category-guidance" aria-live="polite">
                  {kind === 'venue' && 'For a venue: include its full public address, sports and facilities, operating hours, and an official website or public contact page.'}
                  {kind === 'coach' && 'For a coach: include the sports coached, qualification and issuing body, experience, city, and a public professional profile or academy page. Credentials are checked separately.'}
                  {kind === 'opportunity' && 'For a trial: include the organiser, trial dates and deadline, age/eligibility criteria, venue, and the official notice or registration link. Mention an athlete entry fee only when the organiser has published it.'}
                  {kind === 'academy' && 'For an academy: include its public address, sports, programmes, coach details and official website or public contact page.'}
                  {kind === 'event' && 'For an event: include the organiser, venue, actual dates, event rules and official announcement.'}
                  {kind === 'pickup_game' && 'For a community game: include the public venue, host, sport, actual date/time and participation terms.'}
                  {kind === 'sport' && 'For a new sport: share its recognised governing body or an authoritative source where available.'}
                </p>

                <label>
                  Listing title *
                  <input
                    required
                    minLength={2}
                    maxLength={150}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={kind === 'venue' ? 'e.g. Public venue or sports complex name' : kind === 'coach' ? 'e.g. Coach name and primary sport' : kind === 'opportunity' ? 'e.g. U-17 Football Selection Trials' : 'Enter the official listing name'}
                  />
                </label>

                <label>
                  City / Location
                  <input
                    maxLength={100}
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru, Karnataka"
                  />
                </label>

                <label>
                  Official HTTPS Source URL
                  <input
                    type="url"
                    maxLength={1000}
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label>
                Useful Context & Facilities
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder={kind === 'venue' ? 'Full address/locality, sports offered, courts or surfaces, facilities, timings and official contact route.' : kind === 'coach' ? 'Qualification, issuing authority, years of experience, coaching specialities, languages and academy affiliation. Do not include private personal details.' : kind === 'opportunity' ? 'Organiser, trial date, deadline, age group, eligibility, required documents, venue and any organiser-published athlete entry fee.' : 'Add useful, source-backed details such as dates, eligibility, facilities, organiser or public contact information.'}
                />
              </label>

              <label>
                Submitter Contact / Notification Email (optional)
                <input
                  type="email"
                  maxLength={255}
                  value={submitterEmail}
                  onChange={e => setSubmitterEmail(e.target.value)}
                  placeholder="your-email@example.com (used for review updates)"
                />
              </label>
            </fieldset>

            {submitError && (
              <p className="state-panel state-unavailable" role="alert">
                {submitError}
              </p>
            )}

            <div className="cv-actions">
              <button className="primary-link" type="submit" disabled={submitting}>
                {submitting ? 'Submitting for review…' : 'Submit free listing for review'} <SiteIcon name="arrow-up-right" size={16} />
              </button>
            </div>
          </form>

          <div className="state-panel state-unavailable" style={{ marginTop: '2rem' }}>
            <div className="state-symbol">!</div>
            <h2>Publication requires verified moderation</h2>
            <p>
              Submitting a listing is free and does not buy approval or a verified badge. Only listings that meet the evidence and publication requirements are added to KhelGrid's public catalogue.
            </p>
          </div>
        </>
      )}

      {/* Tab 2: Track Submission Status */}
      {activeTab === 'track' && (
        <div className="listing-tracker-card">
          <h2>Track Your Submission</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Enter your unique reference number and private tracking key to check moderation progress, view moderator feedback, or provide requested corrections.
          </p>

          <form onSubmit={handleTrackSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <label style={{ flex: 1, minWidth: '220px' }}>
              Reference Number *
              <input
                required
                className="admin-search-input"
                style={{ padding: '0.65rem', marginTop: '0.25rem' }}
                value={trackRef}
                onChange={e => setTrackRef(e.target.value)}
                placeholder="e.g. KHL-20261110-A1B2C3"
              />
            </label>

            <label style={{ flex: 1, minWidth: '220px' }}>
              Private Tracking Key (if provided)
              <input
                className="admin-search-input"
                style={{ padding: '0.65rem', marginTop: '0.25rem' }}
                value={trackKey}
                onChange={e => setTrackKey(e.target.value)}
                placeholder="Paste your private tracking key"
              />
            </label>

            <button type="submit" className="primary-link" style={{ padding: '0.75rem 1.25rem' }} disabled={trackingLoading}>
              {trackingLoading ? 'Checking…' : 'Check Status'}
            </button>
          </form>

          {trackError && (
            <p className="state-panel state-unavailable" role="alert">
              {trackError}
            </p>
          )}

          {trackNotice && (
            <p className="state-panel state-available" role="status">
              {trackNotice}
            </p>
          )}

          {trackedSubmission && (
            <div>
              {/* Stepper Timeline */}
              <div className="listing-stepper">
                <div className={`listing-step ${getStepClass('submitted', trackedSubmission.status)}`}>
                  <div className="listing-step-circle">1</div>
                  <span className="listing-step-lbl">Submitted</span>
                </div>
                <div className={`listing-step ${getStepClass('under_review', trackedSubmission.status)}`}>
                  <div className="listing-step-circle">2</div>
                  <span className="listing-step-lbl">In Review</span>
                </div>
                <div className={`listing-step ${getStepClass('decision', trackedSubmission.status)}`}>
                  <div className="listing-step-circle">3</div>
                  <span className="listing-step-lbl">Decision</span>
                </div>
                <div className={`listing-step ${getStepClass('published', trackedSubmission.status)}`}>
                  <div className="listing-step-circle">4</div>
                  <span className="listing-step-lbl">Published</span>
                </div>
              </div>

              {/* Status Message Banners */}
              {trackedSubmission.status === 'pending_review' && (
                <div className="listing-status-banner pending">
                  <SiteIcon name="calendar-check" size={20} />
                  <div>
                    <strong>Awaiting Moderator Review</strong>
                    <p style={{ margin: '0.25rem 0' }}>Your suggestion has been logged and is waiting in the queue. Moderators verify source URLs and details in the order received.</p>
                  </div>
                </div>
              )}

              {trackedSubmission.status === 'under_review' && (
                <div className="listing-status-banner pending">
                  <SiteIcon name="search" size={20} />
                  <div>
                    <strong>Under Active Review</strong>
                    <p style={{ margin: '0.25rem 0' }}>A KhelGrid moderator has begun reviewing this listing and checking source credentials.</p>
                  </div>
                </div>
              )}

              {trackedSubmission.status === 'changes_requested' && (
                <div className="listing-status-banner changes_requested">
                  <SiteIcon name="close" size={20} />
                  <div>
                    <strong>Corrections Requested</strong>
                    <p style={{ margin: '0.25rem 0' }}>
                      The moderator requested updates: <em>"{trackedSubmission.correction_request}"</em>
                    </p>
                    <p style={{ margin: '0.25rem 0' }}>Please review the form below, adjust the required fields, and resubmit.</p>
                  </div>
                </div>
              )}

              {trackedSubmission.status === 'resubmitted' && (
                <div className="listing-status-banner pending">
                  <SiteIcon name="check-circle" size={20} />
                  <div>
                    <strong>Resubmitted – Awaiting Follow-up Review</strong>
                    <p style={{ margin: '0.25rem 0' }}>Your updated details were received and are back in the moderation queue for editorial verification.</p>
                  </div>
                </div>
              )}

              {trackedSubmission.status === 'approved' && (
                <div className="listing-status-banner approved">
                  <SiteIcon name="badge-check" size={20} />
                  <div>
                    <strong>Approved by Moderation Desk</strong>
                    <p style={{ margin: '0.25rem 0' }}>Your submission has been verified and approved. It is queued for live catalogue publication.</p>
                  </div>
                </div>
              )}

              {trackedSubmission.status === 'published' && (
                <div className="listing-status-banner published">
                  <SiteIcon name="check-circle" size={20} />
                  <div>
                    <strong>Published on KhelGrid!</strong>
                    <p style={{ margin: '0.25rem 0' }}>This listing is now published and active in KhelGrid's public sports directory.</p>
                  </div>
                </div>
              )}

              {trackedSubmission.status === 'rejected' && (
                <div className="listing-status-banner rejected">
                  <SiteIcon name="close" size={20} />
                  <div>
                    <strong>Submission Rejected</strong>
                    <p style={{ margin: '0.25rem 0' }}>Reason: {trackedSubmission.rejection_reason || 'Could not be verified according to catalogue standards.'}</p>
                  </div>
                </div>
              )}

              {/* Inline Resubmission Form (only when changes_requested) */}
              {trackedSubmission.status === 'changes_requested' && (
                <form className="listing-resubmit-form" onSubmit={handleResubmit}>
                  <h3>Edit & Resubmit Listing</h3>
                  <p style={{ color: '#64748b' }}>
                    Adjust the title, city, official HTTPS source URL, or details as requested by the moderator.
                  </p>
                  <div className="cv-field-grid">
                    <label>
                      Listing Title *
                      <input
                        required
                        minLength={2}
                        maxLength={150}
                        value={resubmitTitle}
                        onChange={e => setResubmitTitle(e.target.value)}
                      />
                    </label>
                    <label>
                      City / Location
                      <input
                        maxLength={100}
                        value={resubmitCity}
                        onChange={e => setResubmitCity(e.target.value)}
                      />
                    </label>
                    <label>
                      Official HTTPS Source URL
                      <input
                        type="url"
                        value={resubmitSourceUrl}
                        onChange={e => setResubmitSourceUrl(e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Updated Context & Details
                    <textarea
                      rows={4}
                      maxLength={2000}
                      value={resubmitDetails}
                      onChange={e => setResubmitDetails(e.target.value)}
                    />
                  </label>
                  <div className="cv-actions" style={{ marginTop: '1rem' }}>
                    <button type="submit" className="primary-link" disabled={resubmitting}>
                      {resubmitting ? 'Resubmitting…' : 'Resubmit for Review'}
                    </button>
                  </div>
                </form>
              )}

              {/* Summary Details */}
              <div className="listing-tracker-details">
                <div>
                  <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Reference</small>
                  <p style={{ margin: '0.25rem 0', fontWeight: 700 }}>{trackedSubmission.reference_number}</p>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Title</small>
                  <p style={{ margin: '0.25rem 0', fontWeight: 700 }}>{trackedSubmission.title}</p>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Category</small>
                  <p style={{ margin: '0.25rem 0' }}>{trackedSubmission.listing_type}</p>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Location</small>
                  <p style={{ margin: '0.25rem 0' }}>{trackedSubmission.city || 'India'}</p>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Version</small>
                  <p style={{ margin: '0.25rem 0' }}>v{trackedSubmission.version}</p>
                </div>
                <div>
                  <small style={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Submitted Date</small>
                  <p style={{ margin: '0.25rem 0' }}>{new Date(trackedSubmission.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
