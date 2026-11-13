import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { signInWithEmail, signOut } from '../../integrations/supabase/auth-client'
import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import {
  addListingEvidence,
  approveListingSubmission,
  rejectListingSubmission,
  publishListingSubmission,
  startListingReview,
  getAdminModerationQueue,
  getListingEvidence,
  getListingPublicationDetails,
  getListingModeratorAccessAudit,
  getListingVerificationQueue,
  getModerationAccessProfile,
  listListingModeratorAccounts,
  reviewListingEvidence,
  saveListingPublicationDetails,
  setListingModeratorAccess,
  verifyListingSubmission,
  unpublishListingSubmission,
  type AdminModerationQueue,
  type ListingEvidenceItem,
  type ListingModeratorAccount,
  type ListingModeratorAccessAudit,
  type ModerationAccessProfile,
  type ModeratorQueueItem,
} from '../../integrations/supabase/public-client'
import './AdminControlPanelPage.css'
import { getEvidenceChecklist } from './moderationEvidenceChecklist'

const evidenceTypes = [
  ['official_source', 'Official source'],
  ['organizer_identity', 'Organizer identity'],
  ['venue_address', 'Venue address'],
  ['event_details', 'Event details'],
  ['coach_qualification', 'Coach qualification'],
  ['academy_identity', 'Academy identity'],
  ['other', 'Other evidence'],
] as const

const fieldSets: Record<string, Array<[string, string]>> = {
  venue: [['city', 'City'], ['address', 'Full street/locality address'], ['sport', 'Sports supported']],
  opportunity: [['city', 'City'], ['organizer_name', 'Verified organizer name'], ['venue_name', 'Venue name'], ['opportunity_type', 'Opportunity type']],
  academy: [['city', 'City'], ['state', 'State']],
  coach: [['city', 'City'], ['state', 'State'], ['qualifications', 'Reviewed qualifications']],
  event: [['city', 'City'], ['organizer_name', 'Organizer name'], ['venue_name', 'Venue name'], ['event_type', 'Event type'], ['starts_at', 'Start date/time (ISO 8601)'], ['ends_at', 'End date/time (ISO 8601, optional)']],
  pickup_game: [['city', 'City'], ['sport', 'Sport'], ['venue_name', 'Venue name'], ['host_name', 'Host name'], ['starts_at', 'Start date/time (ISO 8601)'], ['ends_at', 'End date/time (ISO 8601, optional)']],
  sport: [['city', 'City']],
}


export function AdminControlPanelPage() {
  const [profile, setProfile] = useState<ModerationAccessProfile | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [queue, setQueue] = useState<AdminModerationQueue | null>(null)
  const [queueSearch, setQueueSearch] = useState('')
  const [selected, setSelected] = useState<ModeratorQueueItem | null>(null)
  const [evidence, setEvidence] = useState<ListingEvidenceItem[]>([])
  const [accounts, setAccounts] = useState<ListingModeratorAccount[]>([])
  const [accessAudits, setAccessAudits] = useState<ListingModeratorAccessAudit[]>([])
  const [verificationStates, setVerificationStates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [evidenceType, setEvidenceType] = useState('official_source')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceDescription, setEvidenceDescription] = useState('')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [unpublishReason, setUnpublishReason] = useState('')
  const [publishSlug, setPublishSlug] = useState('')
  const [structured, setStructured] = useState<Record<string, string>>({})
  const [targetUserId, setTargetUserId] = useState('')
  const [targetRole, setTargetRole] = useState<'moderator' | 'super_admin'>('moderator')
  const [targetActive, setTargetActive] = useState(true)
  const [accessNotes, setAccessNotes] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const client = getSupabaseClient()
      if (!client) throw new Error('Authentication service is not configured.')
      const { data: authData, error: authError } = await client.auth.getUser()
      if (authError) throw authError
      setSignedIn(Boolean(authData.user))
      const current = await getModerationAccessProfile()
      setProfile(current)
      if (!current?.is_active) {
        setQueue(null)
        setAccounts([])
        return
      }
      const [data, verificationRows] = await Promise.all([
        getAdminModerationQueue({ status: 'all', limit: 100, sortBy: 'created_at', sortDir: 'desc' }),
        getListingVerificationQueue('all'),
      ])
      setQueue(data)
      setLastRefreshedAt(new Date())
      setVerificationStates(Object.fromEntries(verificationRows.map(row => [row.id, row.verification_status])))
      if (current.role === 'super_admin') {
        const [authorizedAccounts, auditRows] = await Promise.all([
          listListingModeratorAccounts(),
          getListingModeratorAccessAudit(100),
        ])
        setAccounts(authorizedAccounts)
        setAccessAudits(auditRows)
      } else {
        setAccounts([])
        setAccessAudits([])
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the protected control panel.')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  const queueItems = queue?.pendingSubmissions ?? []
  const queueCounts = {
    total: queueItems.length,
    awaitingReview: queueItems.filter(item => ['pending_review', 'resubmitted'].includes(item.status)).length,
    underReview: queueItems.filter(item => item.status === 'under_review').length,
    approved: queueItems.filter(item => item.status === 'approved').length,
    published: queueItems.filter(item => item.status === 'published').length,
  }
  const visibleQueue = queueItems.filter(item => {
    const query = queueSearch.trim().toLowerCase()
    if (!query) return true
    return [item.title, item.reference_number, item.city, item.listing_type, item.status].some(value => value?.toLowerCase().includes(query))
  })


  const selectSubmission = async (item: ModeratorQueueItem) => {
    setSelected(item)
    setError('')
    setNotice('')
    try {
      const [evidenceRows, publicationDetails] = await Promise.all([
        getListingEvidence(item.id),
        getListingPublicationDetails(item.id),
      ])
      setEvidence(evidenceRows)
      setStructured(Object.fromEntries(
        Object.entries(publicationDetails.structured_data).map(([key, value]) => [
          key,
          value == null ? '' : typeof value === 'string' ? value : String(value),
        ]),
      ))
      setSelected({ ...item, version: publicationDetails.version })
      setVerificationStates(prev => ({ ...prev, [item.id]: publicationDetails.verification_status }))
    } catch (cause) {
      setEvidence([])
      setStructured({})
      setError(cause instanceof Error ? cause.message : 'Could not load evidence and publication details.')
    }
  }

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await signInWithEmail({ email, password })
      if (!result.success) throw new Error(result.message || 'Sign-in failed.')
      setPassword('')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleAddEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      await addListingEvidence({ submissionId: selected.id, evidenceType, evidenceUrl, description: evidenceDescription })
      setEvidence(await getListingEvidence(selected.id))
      setSelected(prev => prev ? { ...prev, version: prev.version + 1 } : prev)
      setVerificationStates(prev => ({ ...prev, [selected.id]: 'unverified' }))
      setEvidenceUrl(''); setEvidenceDescription('')
      setNotice('Evidence added to the private verification record. The prior verification decision, if any, has been invalidated.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add evidence.')
    } finally { setBusy(false) }
  }

  const handleEvidenceReview = async (item: ListingEvidenceItem, outcome: 'supports' | 'contradicts' | 'insufficient') => {
    setBusy(true); setError(''); setNotice('')
    try {
      await reviewListingEvidence(item.id, outcome)
      if (selected) {
        setEvidence(await getListingEvidence(selected.id))
        setSelected(prev => prev ? { ...prev, version: prev.version + 1 } : prev)
        setVerificationStates(prev => ({ ...prev, [selected.id]: 'unverified' }))
      }
      setNotice('Evidence review saved and added to the audit trail. Re-verification is required after evidence changes.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not review evidence.')
    } finally { setBusy(false) }
  }

  const handleStartReview = async () => {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      await startListingReview(selected.id, selected.version)
      setNotice('Submission assigned to your review queue.')
      await refresh()
      setSelected(prev => prev ? { ...prev, status: 'under_review', version: prev.version + 1 } : prev)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start review.') }
    finally { setBusy(false) }
  }

  const handleApproval = async (decision: 'approve' | 'reject') => {
    if (!selected) return
    if (decision === 'reject' && decisionReason.trim().length < 3) { setError('A clear rejection reason of at least 3 characters is required.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      if (decision === 'approve') await approveListingSubmission(selected.id, verificationNotes, selected.version)
      else await rejectListingSubmission(selected.id, decisionReason.trim(), verificationNotes, selected.version)
      setNotice(decision === 'approve' ? 'Editorial approval recorded. Evidence verification and publication remain separate.' : 'Submission rejected. The reason has been recorded.')
      await refresh()
      setSelected(prev => prev ? { ...prev, status: decision === 'approve' ? 'approved' : 'rejected', version: prev.version + 1 } : prev)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the moderation decision.') }
    finally { setBusy(false) }
  }

  const handlePublish = async () => {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await publishListingSubmission(selected.id, publishSlug.trim() || undefined, undefined, selected.version)
      setNotice('Published ' + result.publishedTable + ' record ' + result.slug + '.')
      await refresh()
      setSelected(prev => prev ? { ...prev, status: 'published', version: prev.version + 1 } : prev)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Publication failed.') }
    finally { setBusy(false) }
  }
  const handleUnpublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    if (unpublishReason.trim().length < 3) {
      setError('Please provide a clear unpublishing reason (at least 3 characters).')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      await unpublishListingSubmission(selected.id, unpublishReason.trim(), undefined, selected.version)
      setUnpublishReason('')
      setNotice('Listing unpublished. It is no longer available in public catalogue queries; the audit history is retained.')
      await refresh()
      setSelected(prev => prev ? { ...prev, status: 'unpublished', version: prev.version + 1 } : prev)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not unpublish listing.')
    } finally { setBusy(false) }
  }

  const handleVerification = async (decision: 'verified' | 'rejected' | 'unverified') => {
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      await verifyListingSubmission(selected.id, decision, verificationNotes)
      setVerificationStates(prev => ({ ...prev, [selected.id]: decision }))
      setNotice(`Verification status updated to ${decision}. Approval and publication remain separate decisions.`)
      await refresh()
      setSelected(prev => prev ? { ...prev, version: prev.version + 1 } : prev)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification decision failed.')
    } finally { setBusy(false) }
  }

  const handleSaveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      const clean = Object.fromEntries(Object.entries(structured).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value !== ''))
      await saveListingPublicationDetails(selected.id, clean, selected.version)
      setNotice('Category-specific publication details saved.')
      await refresh()
      setSelected(prev => prev ? { ...prev, version: prev.version + 1 } : prev)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save publication details.')
    } finally { setBusy(false) }
  }

  const handleAccessUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await setListingModeratorAccess({ userId: targetUserId.trim(), role: targetRole, isActive: targetActive, notes: accessNotes })
      setNotice('Moderator access updated and recorded in the access audit log.')
      setTargetUserId(''); setAccessNotes('')
      const [authorizedAccounts, auditRows] = await Promise.all([
        listListingModeratorAccounts(),
        getListingModeratorAccessAudit(100),
      ])
      setAccounts(authorizedAccounts)
      setAccessAudits(auditRows)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update moderator access.')
    } finally { setBusy(false) }
  }

  if (loading) return <section className="content-page admin-control"><p>Checking secure moderation access…</p></section>

  if (signedIn && !profile?.is_active) return (
    <section className="content-page admin-control" aria-labelledby="admin-control-denied-title">
      <p className="eyebrow">KHELGRID · RESTRICTED OPERATIONS</p>
      <h1 id="admin-control-denied-title">Access not authorized</h1>
      <p role="alert" className="admin-control-error">You are signed in, but this account is not an active KhelGrid moderator. The private queue and evidence records are unavailable to your account.</p>
      <p>Ask an existing super-admin to grant access if you have an approved moderation responsibility.</p>
      <button type="button" onClick={async () => { await signOut(); setSignedIn(false); setProfile(null) }}>Sign out</button>
    </section>
  )

  if (!profile?.is_active) return (
    <section className="content-page admin-control">
      <p className="eyebrow">KHELGRID · RESTRICTED OPERATIONS</p>
      <h1>Moderator &amp; Super Admin Control Panel</h1>
      {error && <p role="alert" className="admin-control-error">{error}</p>}
      <p>Sign in with an individually authorized development moderator account. Public registration does not grant access.</p>
      <form className="admin-control-login" onSubmit={handleSignIn}>
        <label>Moderator email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <button disabled={busy}>{busy ? 'Checking…' : 'Sign in securely'}</button>
      </form>
    </section>
  )

  return (
    <section className="content-page admin-control">
      <header className="admin-control-header">
        <div className="admin-control-brand"><span className="admin-control-brand-mark">KG</span><div><p className="eyebrow">KHELGRID / OPERATIONS</p><h1>Control Centre</h1><p>Private workspace for verification, moderation and platform governance.</p></div></div>
        <div className="admin-control-identity"><span className="admin-control-live"><i /> Development workspace</span><strong>{profile.role.replace('_', ' ')}</strong><button type="button" onClick={() => void refresh()} disabled={loading || busy}>↻ Refresh</button><button type="button" onClick={async () => { await signOut(); setProfile(null); setQueue(null) }}>Sign out</button></div>
      </header>
      <div className="admin-control-shell">
        <nav className="admin-control-sidebar" aria-label="Control centre sections">
          <span className="admin-control-nav-label">WORKSPACE</span>
          <a className="active" href="#overview">▦ <span>Overview</span></a>
          <a href="#queue">☷ <span>Listing moderation</span></a>
          <a href="#evidence">◈ <span>Evidence review</span></a>
          <a href="#publication">↗ <span>Publication workflow</span></a>
          {profile.role === 'super_admin' && <><span className="admin-control-nav-label">GOVERNANCE</span><a href="#access">♙ <span>Access management</span></a><a href="#access-audit">◷ <span>Access history</span></a></>}
          <div className="admin-control-sidebar-foot"><span className="admin-control-secure-dot" /> Protected by database authorization</div>
        </nav>
        <div className="admin-control-main">
      {error && <p role="alert" className="admin-control-error">{error}</p>}
      {notice && <p role="status" className="admin-control-notice">{notice}</p>}
      <section id="overview" className="admin-control-overview-section" aria-label="Live moderation overview">
        <div className="admin-control-section-heading"><div><p className="eyebrow">AT A GLANCE</p><h2>Moderation overview</h2></div><span>Queue snapshot · {queueItems.length} loaded records</span></div>
        <div className="admin-control-overview">
        <div className="admin-control-stat"><span>Loaded submissions</span><strong>{queueCounts.total}</strong><small>Latest queue records · maximum 100 loaded</small></div>
        <div className="admin-control-stat"><span>Awaiting review</span><strong>{queueCounts.awaitingReview}</strong><small>Pending review or resubmitted</small></div>
        <div className="admin-control-stat"><span>Under review</span><strong>{queueCounts.underReview}</strong><small>Currently claimed by moderators</small></div>
        <div className="admin-control-stat"><span>Approved</span><strong>{queueCounts.approved}</strong><small>Editorial approval recorded</small></div>
        <div className="admin-control-stat"><span>Published</span><strong>{queueCounts.published}</strong><small>Published records in loaded queue</small></div>
        </div>
      </section>
      <div className="admin-control-overview-meta"><span>Access: active database-authorized {profile.role.replace('_', ' ')}</span><span>Data refreshed: {lastRefreshedAt ? lastRefreshedAt.toLocaleString('en-IN') : 'Not yet refreshed'}</span></div>
      <div className="admin-control-layout">
        <aside id="queue" className="admin-control-queue">
          <h2>Verification &amp; listing queue</h2>
          <p>{visibleQueue.length} of {queue?.pendingSubmissions.length ?? 0} submissions shown</p>
          <label className="admin-control-queue-search">Search submissions<input type="search" value={queueSearch} onChange={event => setQueueSearch(event.target.value)} placeholder="Title, reference, city or category" /></label>
          {visibleQueue.map(item => <button type="button" key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => void selectSubmission(item)}>
            <span>{item.listing_type} · {item.status.replace(/_/g, ' ')}</span><small>Evidence: {verificationStates[item.id] || 'unverified'}</small><strong>{item.title}</strong><small>{item.reference_number} · {item.city || 'Location missing'}</small>
          </button>)}
          {queue?.pendingSubmissions.length === 0 && <p>No submissions in the current queue.</p>}
          {Boolean(queue?.pendingSubmissions.length) && visibleQueue.length === 0 && <p>No submissions match this search.</p>}
        </aside>
        <div className="admin-control-workspace">
          {!selected ? <div className="admin-control-empty"><h2>Select a submission</h2><p>Choose an item to inspect its evidence, verification state and publication requirements.</p></div> : <>
            <div className="admin-control-card">
              <p className="eyebrow">{selected.reference_number} · {selected.listing_type}</p>
              <h2>{selected.title}</h2><p>{selected.city || 'City not supplied'} · Editorial status: {selected.status.replace(/_/g, ' ')} · Evidence status: {verificationStates[selected.id] || 'unverified'}</p>
              <p>{selected.details || 'No additional details supplied.'}</p>
              {selected.source_url && <a href={selected.source_url} target="_blank" rel="noreferrer">Open submitted source ↗</a>}
            </div>
            <div id="publication" className="admin-control-card">
              <p className="eyebrow">WORKFLOW / 01</p><h3>Editorial decision &amp; publication</h3>
              <p>Editorial approval, evidence verification and public publication are three separate recorded decisions.</p>
              {(selected.status === 'pending_review' || selected.status === 'resubmitted' || selected.status === 'unpublished') && <button disabled={busy} onClick={() => void handleStartReview()}>Start review &amp; assign to me</button>}
              {(selected.status === 'under_review') && <div className="admin-control-actions"><button disabled={busy} onClick={() => void handleApproval('approve')}>Approve listing</button><button disabled={busy} onClick={() => void handleApproval('reject')}>Reject listing</button></div>}
              {selected.status !== 'rejected' && selected.status !== 'published' && <label className="admin-control-full">Rejection reason (required only to reject)<textarea value={decisionReason} onChange={e => setDecisionReason(e.target.value)} maxLength={2000} /></label>}
              {selected.status === 'approved' && <div className="admin-control-form"><label>Publication slug (optional)<input value={publishSlug} onChange={e => setPublishSlug(e.target.value)} placeholder="Auto-generated if blank" /></label><button disabled={busy || verificationStates[selected.id] !== 'verified'} onClick={() => void handlePublish()}>Publish verified listing</button>
                {verificationStates[selected.id] !== 'verified' && <small>Complete the evidence review and mark this submission verified before publication is enabled.</small>}</div>}
              {selected.status === 'published' && <form onSubmit={handleUnpublish} className="admin-control-form">
                <label>Reason for unpublishing (required)<textarea value={unpublishReason} onChange={e => setUnpublishReason(e.target.value)} minLength={3} maxLength={2000} required placeholder="For example: venue closed, event concluded, duplicate or evidence withdrawn" /></label>
                <button type="submit" disabled={busy || unpublishReason.trim().length < 3}>Unpublish listing</button>
              </form>}
            </div>
            <div className="admin-control-card">
              <p className="eyebrow">QUALITY CONTROL</p><h3>Category verification checklist</h3>
              <p>Use this as a reviewer aid. Record source URLs and outcomes in the evidence register; a checklist label is not itself proof of verification.</p>
              <ul className="admin-control-checklist">
                {getEvidenceChecklist(selected.listing_type, evidence).map(item => <li key={item.type}>
                  <span className={`admin-check-status is-${item.status}`}>{item.status.replace('_', ' ')}</span>
                  <span>{item.label}</span>
                </li>)}
              </ul>
              <p className="admin-control-caution">Do not treat a social profile, WhatsApp message or map pin as conclusive proof by itself. Independently confirm high-impact claims and never infer missing dates, fees, addresses or organizer details.</p>
            </div>
            <div id="evidence" className="admin-control-card">
              <p className="eyebrow">WORKFLOW / 02</p><h3>Evidence register</h3>
              <p>Evidence URLs and reviewer notes are private. A verified decision requires supporting evidence and no pending or contradictory evidence.</p>
              {['pending_review', 'under_review', 'approved', 'unpublished'].includes(selected.status) ? <form onSubmit={handleAddEvidence} className="admin-control-form">
                <label>Evidence type<select value={evidenceType} onChange={e => setEvidenceType(e.target.value)}>{evidenceTypes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>HTTPS evidence URL<input type="url" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://official-source.gov.in/…" required /></label>
                <label>What does this evidence establish?<textarea value={evidenceDescription} onChange={e => setEvidenceDescription(e.target.value)} minLength={10} maxLength={2000} required /></label>
                <button disabled={busy}>Add evidence</button>
              </form> : <p>Evidence is read-only for this status. Claim review or unpublish the record before changing its evidence.</p>}
              {evidence.map(item => <article className="admin-control-evidence" key={item.id}>
                <strong>{item.evidence_type.replace(/_/g, ' ')} · {item.outcome}</strong><p>{item.description}</p><a href={item.evidence_url} target="_blank" rel="noreferrer">Review source ↗</a>
                {item.outcome === 'pending' && selected.status !== 'published' && <div className="admin-control-actions">
                  <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'supports')}>Supports claim</button>
                  <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'contradicts')}>Contradicts claim</button>
                  <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'insufficient')}>Insufficient</button>
                </div>}
                {item.reviewer_notes && <p>Reviewer notes: {item.reviewer_notes}</p>}
              </article>)}
              {selected.status === 'published' ? <p>Verification is locked while this listing is published. Unpublish it before changing the evidence decision.</p> : <>
                <label className="admin-control-full">Verification notes<textarea value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)} maxLength={2000} /></label>
                <div className="admin-control-actions">
                  <button disabled={busy} onClick={() => void handleVerification('verified')}>Mark evidence verified</button>
                  <button disabled={busy} onClick={() => void handleVerification('rejected')}>Reject verification</button>
                  <button disabled={busy} onClick={() => void handleVerification('unverified')}>Return to unverified</button>
                </div>
              </>}
            </div>
            <div className="admin-control-card">
              <p className="eyebrow">CATALOGUE DATA</p><h3>Category-specific publication details</h3>
              <p>Only genuine, reviewed details should be entered. Missing values remain missing; the system must not invent them.</p>
              {['under_review', 'approved', 'unpublished'].includes(selected.status) ? <form onSubmit={handleSaveDetails} className="admin-control-form">
                {(fieldSets[selected.listing_type] || []).map(([key,label]) => <label key={key}>{label}<input value={structured[key] || ''} onChange={e => setStructured(prev => ({ ...prev, [key]: e.target.value }))} required={!['ends_at','state'].includes(key)} /></label>)}
                <button disabled={busy}>Save publication details</button>
              </form> : <p>Start a review before editing category-specific publication details.</p>}
            </div>
          </>}
          {profile.role === 'super_admin' && <div id="access" className="admin-control-card">
            <p className="eyebrow">GOVERNANCE / SUPER-ADMIN</p><h3>Access management</h3>
            <p>Grant or revoke moderator access using an existing Auth user UUID. The database prevents removal of the last active super-admin.</p>
            <form onSubmit={handleAccessUpdate} className="admin-control-form">
              <label>Auth user UUID<input value={targetUserId} onChange={e => setTargetUserId(e.target.value)} required pattern="[0-9a-fA-F-]{36}" /></label>
              <label>Role<select value={targetRole} onChange={e => setTargetRole(e.target.value as 'moderator' | 'super_admin')}><option value="moderator">Moderator</option><option value="super_admin">Super admin</option></select></label>
              <label>Access state<select value={targetActive ? 'active' : 'inactive'} onChange={e => setTargetActive(e.target.value === 'active')}><option value="active">Active</option><option value="inactive">Revoked / inactive</option></select></label>
              <label>Reason / notes<textarea value={accessNotes} onChange={e => setAccessNotes(e.target.value)} maxLength={1000} /></label>
              <button disabled={busy}>Save access change</button>
            </form>
            <h4>Authorized accounts</h4>
            {accounts.map(account => <p key={account.user_id}><code>{account.user_id}</code> · {account.role} · {account.is_active ? 'Active' : 'Inactive'}</p>)}
            <div id="access-audit"><h4>Moderator access history</h4>
            {accessAudits.length === 0 ? <p>No access changes recorded yet.</p> : accessAudits.map(audit => <p key={audit.id}>
              {audit.action} · <code>{audit.target_user_id}</code> · {audit.old_role || 'none'} → {audit.new_role} · {new Date(audit.created_at).toLocaleString('en-IN')}
              {audit.notes ? <small> · {audit.notes}</small> : null}
            </p>)}
            </div>
          </div>}
        </div>
        </div>
      </div>
    </section>
  )
}
