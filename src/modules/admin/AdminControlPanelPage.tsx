import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { signInWithEmail, signOut } from '../../integrations/supabase/auth-client'
import {
  addListingEvidence,
  approveListingSubmission,
  rejectListingSubmission,
  publishListingSubmission,
  startListingReview,
  getAdminModerationQueue,
  getListingEvidence,
  getListingModeratorAccessAudit,
  getListingVerificationQueue,
  getModerationAccessProfile,
  listListingModeratorAccounts,
  reviewListingEvidence,
  saveListingPublicationDetails,
  setListingModeratorAccess,
  verifyListingSubmission,
  type AdminModerationQueue,
  type ListingEvidenceItem,
  type ListingModeratorAccount,
  type ListingModeratorAccessAudit,
  type ModerationAccessProfile,
  type ModeratorQueueItem,
} from '../../integrations/supabase/public-client'
import './AdminControlPanelPage.css'

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
  venue: [['address', 'Full street/locality address'], ['sport', 'Sports supported']],
  opportunity: [['organizer_name', 'Verified organizer name'], ['venue_name', 'Venue name'], ['opportunity_type', 'Opportunity type']],
  academy: [['state', 'State']],
  coach: [['state', 'State'], ['qualifications', 'Reviewed qualifications']],
  event: [['organizer_name', 'Organizer name'], ['venue_name', 'Venue name'], ['event_type', 'Event type'], ['starts_at', 'Start date/time (ISO 8601)'], ['ends_at', 'End date/time (ISO 8601, optional)']],
  pickup_game: [['sport', 'Sport'], ['venue_name', 'Venue name'], ['host_name', 'Host name'], ['starts_at', 'Start date/time (ISO 8601)'], ['ends_at', 'End date/time (ISO 8601, optional)']],
  sport: [],
}

export function AdminControlPanelPage() {
  const [profile, setProfile] = useState<ModerationAccessProfile | null>(null)
  const [queue, setQueue] = useState<AdminModerationQueue | null>(null)
  const [selected, setSelected] = useState<ModeratorQueueItem | null>(null)
  const [evidence, setEvidence] = useState<ListingEvidenceItem[]>([])
  const [accounts, setAccounts] = useState<ListingModeratorAccount[]>([])
  const [accessAudits, setAccessAudits] = useState<ListingModeratorAccessAudit[]>([])
  const [verificationStates, setVerificationStates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
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

  const selectSubmission = async (item: ModeratorQueueItem) => {
    setSelected(item)
    setError('')
    setNotice('')
    setStructured({})
    try {
      setEvidence(await getListingEvidence(item.id))
    } catch (cause) {
      setEvidence([])
      setError(cause instanceof Error ? cause.message : 'Could not load evidence.')
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
        <div><p className="eyebrow">KHELGRID · RESTRICTED OPERATIONS</p><h1>Moderation Control Panel</h1><p>Review submissions, record evidence, verify claims and manage authorized moderators.</p></div>
        <div className="admin-control-identity"><strong>{profile.role.replace('_', ' ')}</strong><a href="/admin">Listing review desk</a><button type="button" onClick={async () => { await signOut(); setProfile(null); setQueue(null) }}>Sign out</button></div>
      </header>
      {error && <p role="alert" className="admin-control-error">{error}</p>}
      {notice && <p role="status" className="admin-control-notice">{notice}</p>}
      <div className="admin-control-layout">
        <aside className="admin-control-queue">
          <h2>Verification &amp; listing queue</h2>
          <p>{queue?.pendingSubmissions.length ?? 0} submissions loaded</p>
          {queue?.pendingSubmissions.map(item => <button type="button" key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => void selectSubmission(item)}>
            <span>{item.listing_type} · {item.status.replace(/_/g, ' ')}</span><small>Evidence: {verificationStates[item.id] || 'unverified'}</small><strong>{item.title}</strong><small>{item.reference_number} · {item.city || 'Location missing'}</small>
          </button>)}
          {!queue?.pendingSubmissions.length && <p>No submissions in the current queue.</p>}
        </aside>
        <div className="admin-control-workspace">
          {!selected ? <div className="admin-control-empty"><h2>Select a submission</h2><p>Choose an item to inspect its evidence, verification state and publication requirements.</p></div> : <>
            <div className="admin-control-card">
              <p className="eyebrow">{selected.reference_number} · {selected.listing_type}</p>
              <h2>{selected.title}</h2><p>{selected.city || 'City not supplied'} · Editorial status: {selected.status.replace(/_/g, ' ')} · Evidence status: {verificationStates[selected.id] || 'unverified'}</p>
              <p>{selected.details || 'No additional details supplied.'}</p>
              {selected.source_url && <a href={selected.source_url} target="_blank" rel="noreferrer">Open submitted source ↗</a>}
            </div>
            <div className="admin-control-card">
              <h3>Editorial decision &amp; publication</h3>
              <p>Editorial approval, evidence verification and public publication are three separate recorded decisions.</p>
              {(selected.status === 'pending_review' || selected.status === 'resubmitted' || selected.status === 'unpublished') && <button disabled={busy} onClick={() => void handleStartReview()}>Start review &amp; assign to me</button>}
              {(selected.status === 'under_review') && <div className="admin-control-actions"><button disabled={busy} onClick={() => void handleApproval('approve')}>Approve listing</button><button disabled={busy} onClick={() => void handleApproval('reject')}>Reject listing</button></div>}
              {selected.status !== 'rejected' && selected.status !== 'published' && <label className="admin-control-full">Rejection reason (required only to reject)<textarea value={decisionReason} onChange={e => setDecisionReason(e.target.value)} maxLength={2000} /></label>}
              {selected.status === 'approved' && <div className="admin-control-form"><label>Publication slug (optional)<input value={publishSlug} onChange={e => setPublishSlug(e.target.value)} placeholder="Auto-generated if blank" /></label><button disabled={busy} onClick={() => void handlePublish()}>Publish verified listing</button></div>}
            </div>
            <div className="admin-control-card">
              <h3>Evidence register</h3>
              <p>Evidence URLs and reviewer notes are private. A verified decision requires supporting evidence and no pending or contradictory evidence.</p>
              <form onSubmit={handleAddEvidence} className="admin-control-form">
                <label>Evidence type<select value={evidenceType} onChange={e => setEvidenceType(e.target.value)}>{evidenceTypes.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>HTTPS evidence URL<input type="url" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://official-source.gov.in/…" required /></label>
                <label>What does this evidence establish?<textarea value={evidenceDescription} onChange={e => setEvidenceDescription(e.target.value)} minLength={10} maxLength={2000} required /></label>
                <button disabled={busy}>Add evidence</button>
              </form>
              {evidence.map(item => <article className="admin-control-evidence" key={item.id}>
                <strong>{item.evidence_type.replace(/_/g, ' ')} · {item.outcome}</strong><p>{item.description}</p><a href={item.evidence_url} target="_blank" rel="noreferrer">Review source ↗</a>
                {item.outcome === 'pending' && <div className="admin-control-actions">
                  <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'supports')}>Supports claim</button>
                  <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'contradicts')}>Contradicts claim</button>
                  <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'insufficient')}>Insufficient</button>
                </div>}
                {item.reviewer_notes && <p>Reviewer notes: {item.reviewer_notes}</p>}
              </article>)}
              <label className="admin-control-full">Verification notes<textarea value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)} maxLength={2000} /></label>
              <div className="admin-control-actions">
                <button disabled={busy} onClick={() => void handleVerification('verified')}>Mark evidence verified</button>
                <button disabled={busy} onClick={() => void handleVerification('rejected')}>Reject verification</button>
                <button disabled={busy} onClick={() => void handleVerification('unverified')}>Return to unverified</button>
              </div>
            </div>
            <div className="admin-control-card">
              <h3>Category-specific publication details</h3>
              <p>Only genuine, reviewed details should be entered. Missing values remain missing; the system must not invent them.</p>
              <form onSubmit={handleSaveDetails} className="admin-control-form">
                {(fieldSets[selected.listing_type] || []).map(([key,label]) => <label key={key}>{label}<input value={structured[key] || ''} onChange={e => setStructured(prev => ({ ...prev, [key]: e.target.value }))} required={!['ends_at','state'].includes(key)} /></label>)}
                <button disabled={busy}>Save publication details</button>
              </form>
            </div>
          </>}
          {profile.role === 'super_admin' && <div className="admin-control-card">
            <h3>Super-admin access management</h3>
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
            <h4>Moderator access audit history</h4>
            {accessAudits.length === 0 ? <p>No access changes recorded yet.</p> : accessAudits.map(audit => <p key={audit.id}>
              {audit.action} · <code>{audit.target_user_id}</code> · {audit.old_role || 'none'} → {audit.new_role} · {new Date(audit.created_at).toLocaleString('en-IN')}
              {audit.notes ? <small> · {audit.notes}</small> : null}
            </p>)}
          </div>}
        </div>
      </div>
    </section>
  )
}
