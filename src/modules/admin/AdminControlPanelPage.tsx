import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  signInWithEmail,
  signOut,
  sendPasswordReset,
  updatePassword,
  parseAuthUrlCallback,
  clearAuthUrlHash,
} from '../../integrations/supabase/auth-client'
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
  const [authMode, setAuthMode] = useState<'login' | 'forgot_password' | 'set_new_password'>('login')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [inAppNewPassword, setInAppNewPassword] = useState('')
  const [inAppConfirmPassword, setInAppConfirmPassword] = useState('')
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
  const [moderatorResetEmail, setModeratorResetEmail] = useState('')

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
        // Clear every previously loaded private record when the session is absent,
        // expired, revoked, or no longer has an active moderation grant.
        setQueue(null)
        setSelected(null)
        setEvidence([])
        setAccounts([])
        setAccessAudits([])
        setVerificationStates({})
        setLastRefreshedAt(null)
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
      setSignedIn(false)
      setQueue(null)
      setSelected(null)
      setEvidence([])
      setAccounts([])
      setAccessAudits([])
      setVerificationStates({})
      setLastRefreshedAt(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const callbackInfo = parseAuthUrlCallback()
    if (callbackInfo.type === 'recovery') {
      setAuthMode('set_new_password')
      setNotice('Please set a new secure password for your moderator account.')
    } else if (window.location.hash.includes('reset-password') || window.location.search.includes('reset-password')) {
      setAuthMode('forgot_password')
    }

    const handleOpenForgotPassword = () => {
      setAuthMode('forgot_password')
      setError('')
      setNotice('')
    }
    window.addEventListener('khelgrid-admin-open-forgot-password', handleOpenForgotPassword)
    return () => window.removeEventListener('khelgrid-admin-open-forgot-password', handleOpenForgotPassword)
  }, [])
  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) return

    let active = true
    const clearPrivateState = () => {
      setSignedIn(false)
      setProfile(null)
      setQueue(null)
      setSelected(null)
      setEvidence([])
      setAccounts([])
      setAccessAudits([])
      setVerificationStates({})
      setLastRefreshedAt(null)
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearPrivateState()
        return
      }

      // Re-check authorization after sign-in and token/user changes. Defer the
      // async Supabase calls until after the auth callback has returned.
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => {
          if (active) void refresh()
        }, 0)
      }
    })

    const revalidateVisibleSession = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', revalidateVisibleSession)
    document.addEventListener('visibilitychange', revalidateVisibleSession)

    return () => {
      active = false
      subscription.unsubscribe()
      window.removeEventListener('focus', revalidateVisibleSession)
      document.removeEventListener('visibilitychange', revalidateVisibleSession)
    }
  }, [refresh])
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

  const activityTimeline = selected ? [
    { id: 'submitted', label: 'Submission received', detail: 'Original listing submission entered the private review queue.', at: selected.created_at },
    ...(selected.review_started_at ? [{ id: 'review-started', label: 'Review started', detail: 'A moderator claimed this submission for review.', at: selected.review_started_at }] : []),
    ...evidence.flatMap(item => [
      { id: `evidence-added-${item.id}`, label: 'Evidence added', detail: `${item.evidence_type.replace(/_/g, ' ')} · ${item.description}`, at: item.created_at },
      ...(item.reviewed_at ? [{ id: `evidence-reviewed-${item.id}`, label: 'Evidence reviewed', detail: `Outcome: ${item.outcome}${item.reviewer_notes ? ` · ${item.reviewer_notes}` : ''}`, at: item.reviewed_at }] : []),
    ]),
    ...(selected.reviewed_at ? [{ id: 'editorial-decision', label: 'Editorial decision recorded', detail: selected.status === 'rejected' ? `Rejected${selected.rejection_reason ? `: ${selected.rejection_reason}` : ''}` : 'Editorial review decision recorded.', at: selected.reviewed_at }] : []),
    ...(selected.published_at ? [{ id: 'published', label: 'Published to catalogue', detail: selected.published_table ? `Catalogue: ${selected.published_table}` : 'Listing published.', at: selected.published_at }] : []),
    ...(selected.unpublished_at ? [{ id: 'unpublished', label: 'Unpublished', detail: selected.unpublish_reason || 'Listing removed from public catalogue.', at: selected.unpublished_at }] : []),
  ].filter(item => Boolean(item.at)).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()) : []



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
      const defaultEvidenceType =
        item.listing_type === 'coach' ? 'coach_qualification' :
        item.listing_type === 'venue' ? 'venue_address' :
        item.listing_type === 'academy' ? 'academy_identity' :
        item.listing_type === 'event' ? 'event_details' :
        item.listing_type === 'pickup_game' ? 'venue_address' :
        'official_source'
      setEvidenceType(defaultEvidenceType)
      if (item.source_url) {
        const clean = item.source_url.trim()
        setEvidenceUrl(clean.startsWith('http://') ? clean.replace(/^http:\/\//i, 'https://') : clean.startsWith('https://') ? clean : `https://${clean}`)
        setEvidenceDescription(`Official source provided by submitter for ${item.title}`)
      } else {
        setEvidenceUrl('')
        setEvidenceDescription('')
      }
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

  const handleRequestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined
      const res = await sendPasswordReset(email, redirectUrl)
      if (!res.success) {
        setError(res.message || 'Could not send reset email.')
      } else {
        setNotice(res.message || 'Password reset instructions have been sent. Please check your inbox.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request password reset.')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await updatePassword(newPassword)
      if (!res.success) throw new Error(res.message || 'Could not update password.')
      setNotice('Password updated successfully! You can now sign in with your new password.')
      setNewPassword('')
      setConfirmPassword('')
      clearAuthUrlHash()
      setAuthMode('login')
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  const handleInAppPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inAppNewPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (inAppNewPassword !== inAppConfirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await updatePassword(inAppNewPassword)
      if (!res.success) throw new Error(res.message || 'Could not update password.')
      setNotice('Your password has been changed successfully.')
      setInAppNewPassword('')
      setInAppConfirmPassword('')
      setIsChangingPassword(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  const handleAddEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    setBusy(true); setError(''); setNotice('')
    try {
      const rawUrl = evidenceUrl.trim()
      const cleanUrl = rawUrl.startsWith('http://')
        ? rawUrl.replace(/^http:\/\//i, 'https://')
        : rawUrl.startsWith('https://')
          ? rawUrl
          : `https://${rawUrl}`
      await addListingEvidence({ submissionId: selected.id, evidenceType, evidenceUrl: cleanUrl, description: evidenceDescription })
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

  const handleAdminSendModeratorReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined
      const res = await sendPasswordReset(moderatorResetEmail, redirectUrl)
      if (!res.success) {
        setError(res.message || 'Could not send reset email.')
      } else {
        setNotice(`Password reset instructions sent to ${moderatorResetEmail}.`)
        setModeratorResetEmail('')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request password reset for moderator.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <section className="content-page admin-control"><p>Checking secure moderation access…</p></section>

  if (authMode === 'set_new_password') return (
    <section className="content-page admin-control">
      <p className="eyebrow">KHELGRID · RESTRICTED OPERATIONS</p>
      <h1>Set New Moderator Password</h1>
      {error && <p role="alert" className="admin-control-error">{error}</p>}
      {notice && <p role="status" className="admin-control-notice">{notice}</p>}
      <p>Create a secure new password for your moderator account (minimum 6 characters).</p>
      <form className="admin-control-login" onSubmit={handleSaveNewPassword}>
        <label>
          New Password
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
          />
        </label>
        <label>
          Confirm New Password
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-type new password"
            required
            minLength={6}
          />
        </label>
        <button disabled={busy}>{busy ? 'Updating…' : 'Save new password'}</button>
        <button
          type="button"
          className="admin-secondary-btn"
          onClick={() => {
            setAuthMode('login')
            setError('')
            setNotice('')
          }}
        >
          ← Back to sign in
        </button>
      </form>
    </section>
  )

  if (authMode === 'forgot_password') return (
    <section className="content-page admin-control">
      <p className="eyebrow">KHELGRID · RESTRICTED OPERATIONS</p>
      <h1>Reset Moderator Password</h1>
      {error && <p role="alert" className="admin-control-error">{error}</p>}
      {notice && <p role="status" className="admin-control-notice">{notice}</p>}
      <p>Enter your authorized moderator email address. We will send a secure password reset link directly to your inbox.</p>
      <form className="admin-control-login" onSubmit={handleRequestPasswordReset}>
        <label>
          Moderator email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="khelgrid@gmail.com"
            required
          />
        </label>
        <button disabled={busy}>{busy ? 'Sending…' : 'Send password reset link'}</button>
        <button
          type="button"
          className="admin-secondary-btn"
          onClick={() => {
            setAuthMode('login')
            setError('')
            setNotice('')
          }}
        >
          ← Back to sign in
        </button>
      </form>
    </section>
  )

  if (signedIn && !profile?.is_active) return (
    <section className="content-page admin-control" aria-labelledby="admin-control-denied-title">
      <p className="eyebrow">KHELGRID · RESTRICTED OPERATIONS</p>
      <h1 id="admin-control-denied-title">Access not authorized</h1>
      <p role="alert" className="admin-control-error">You are signed in, but this account is not an active KhelGrid moderator. The private queue and evidence records are unavailable to your account.</p>
      <p>Ask an existing super-admin to grant access if you have an approved moderation responsibility.</p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setAuthMode('set_new_password')}>Set / Update password</button>
        <button type="button" onClick={async () => { await signOut(); setSignedIn(false); setProfile(null) }}>Sign out</button>
      </div>
    </section>
  )

  if (!profile?.is_active) return (
    <section className="content-page admin-control">
      <p className="eyebrow">KHELGRID · RESTRICTED OPERATIONS</p>
      <h1>Moderator &amp; Super Admin Control Panel</h1>
      {error && <p role="alert" className="admin-control-error">{error}</p>}
      {notice && <p role="status" className="admin-control-notice">{notice}</p>}
      <p>Sign in with an individually authorized development moderator account. Public registration does not grant access.</p>
      <form className="admin-control-login" onSubmit={handleSignIn}>
        <label>Moderator email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <button disabled={busy}>{busy ? 'Checking…' : 'Sign in securely'}</button>
        <div className="admin-control-login-links">
          <button
            type="button"
            className="admin-text-link"
            onClick={() => {
              setAuthMode('forgot_password')
              setError('')
              setNotice('')
            }}
          >
            Forgot password? Reset via email →
          </button>
        </div>
      </form>
    </section>
  )

  return (
    <section className="content-page admin-control">
      <header className="admin-control-header">
        <div className="admin-control-brand"><span className="admin-control-brand-mark">KG</span><div><p className="eyebrow">KHELGRID / OPERATIONS</p><h1>Control Centre</h1><p>Private workspace for verification, moderation and platform governance.</p></div></div>
        <div className="admin-control-identity"><span className="admin-control-live"><i /> Development workspace</span><strong>{profile.role.replace('_', ' ')}</strong><button type="button" onClick={() => void refresh()} disabled={loading || busy}>↻ Refresh</button><button type="button" onClick={() => setIsChangingPassword(true)} disabled={loading || busy}>Change password</button><button type="button" onClick={async () => { await signOut(); setSignedIn(false); setProfile(null); setQueue(null); setSelected(null); setEvidence([]); setAccounts([]); setAccessAudits([]); setVerificationStates({}); setError(''); setNotice('') }}>Sign out</button></div>
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
      {isChangingPassword && (
        <section className="admin-control-card" style={{ maxWidth: '560px', marginBottom: '1.25rem' }} aria-label="Change password">
          <h3>Change Moderator Password</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary,#64748b)', margin: '0.35rem 0 1rem' }}>
            Set a new secure password for your currently active session (minimum 6 characters).
          </p>
          <form className="admin-control-form" onSubmit={handleInAppPasswordChange}>
            <label>
              New Password
              <input
                type="password"
                autoComplete="new-password"
                value={inAppNewPassword}
                onChange={e => setInAppNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </label>
            <label>
              Confirm New Password
              <input
                type="password"
                autoComplete="new-password"
                value={inAppConfirmPassword}
                onChange={e => setInAppConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Re-type new password"
              />
            </label>
            <div className="admin-control-actions">
              <button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Save New Password'}</button>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => {
                  setIsChangingPassword(false)
                  setInAppNewPassword('')
                  setInAppConfirmPassword('')
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
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
            <div className="admin-control-detail-grid">
              <section className="admin-control-card admin-control-timeline" aria-labelledby="admin-activity-title">
                <p className="eyebrow">REVIEW HISTORY</p><h3 id="admin-activity-title">Submission activity</h3>
                <p>Recorded events from the submission and evidence workflow, ordered by time.</p>
                {activityTimeline.length ? <ol>
                  {activityTimeline.map(event => <li key={event.id}>
                    <span className="admin-control-timeline-marker" aria-hidden="true" />
                    <div><strong>{event.label}</strong><p>{event.detail}</p><time dateTime={event.at}>{new Date(event.at).toLocaleString('en-IN')}</time></div>
                  </li>)}
                </ol> : <p>No dated activity is available for this submission yet.</p>}
              </section>
              <section className="admin-control-card admin-control-next-step" aria-label="Current workflow status">
                <p className="eyebrow">CURRENT STATE</p><h3>Review readiness</h3>
                <div className="admin-control-state-row"><span>Editorial</span><strong>{selected.status.replace(/_/g, ' ')}</strong></div>
                <div className="admin-control-state-row"><span>Evidence</span><strong>{verificationStates[selected.id] || 'unverified'}</strong></div>
                <div className="admin-control-state-row"><span>Record version</span><strong>v{selected.version}</strong></div>
                <p>Every decision is submitted to a protected database operation. The interface does not grant permissions by itself.</p>
              </section>
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

              <div style={{ margin: '0.5rem 0 1rem 0', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: '6px', fontSize: '0.82rem' }}>
                <strong style={{ display: 'block', color: '#38bdf8', marginBottom: '0.3rem' }}>How to make the correct moderation decision:</strong>
                <ul style={{ margin: '0 0 0 1.25rem', padding: 0, lineHeight: '1.45', color: '#cbd5e1' }}>
                  <li><strong>Authentic listing with official source:</strong> Enter the official HTTPS URL confirming credentials or address, click <em>Add evidence</em>, review outcome as <em>Supports claim</em>, and click <em>Mark evidence verified</em> below.</li>
                  <li><strong>Test, spam, or unverifiable listing:</strong> If no official proof exists or this is a test entry, the correct decision is to <strong>REJECT</strong>: under Workflow 01 click <em>Reject listing</em>, and click <em>Reject verification</em> below. Unverified records remain safely excluded from the public website.</li>
                </ul>
              </div>

              {['pending_review', 'under_review', 'approved', 'unpublished'].includes(selected.status) ? <form onSubmit={handleAddEvidence} className="admin-control-form">
                <div style={{ marginBottom: '0.75rem', fontSize: '0.82rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Quick Evidence Source:</span>
                  {selected.source_url && (
                    <button
                      type="button"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '4px', color: '#7dd3fc', cursor: 'pointer' }}
                      onClick={() => {
                        const clean = selected.source_url?.trim() || ''
                        setEvidenceUrl(clean.startsWith('http://') ? clean.replace(/^http:\/\//i, 'https://') : clean.startsWith('https://') ? clean : `https://${clean}`)
                      }}
                    >
                      Use Submitter Source URL
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '4px', color: '#86efac', cursor: 'pointer' }}
                    onClick={() => {
                      setEvidenceUrl(`https://khelgrid.com/verify/${encodeURIComponent(selected.reference_number)}`)
                      if (!evidenceDescription) {
                        setEvidenceDescription(`Community verification by KhelGrid moderation desk for ${selected.title}`)
                      }
                    }}
                  >
                    Auto-Fill Desk Verification URL ({selected.reference_number})
                  </button>
                </div>
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
            <h4>Send password reset email to moderator</h4>
            <p>Send an official password recovery link to any registered moderator email address.</p>
            <form onSubmit={handleAdminSendModeratorReset} className="admin-control-form">
              <label>Moderator email<input type="email" value={moderatorResetEmail} onChange={e => setModeratorResetEmail(e.target.value)} placeholder="moderator@khelgrid.com" required /></label>
              <button disabled={busy}>{busy ? 'Sending…' : 'Send password reset link'}</button>
            </form>
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
      </div>
    </section>
  )
}
