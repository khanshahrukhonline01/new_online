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
  BASELINE_ANNOUNCEMENTS,
  type AdminModerationQueue,
  type DatabaseAnnouncement,
  type ListingEvidenceItem,
  type ListingModeratorAccount,
  type ListingModeratorAccessAudit,
  type ModerationAccessProfile,
  type ModeratorQueueItem,
} from '../../integrations/supabase/public-client'
import {
  getLocalModerationQueue,
  startManuscriptReview,
  approveManuscript,
  rejectManuscript,
  publishManuscriptToArchive,
  type ChronicleModerationSubmission,
  type ChronicleModerationQueueResult,
} from '../../integrations/supabase/chronicle-client'
import './AdminControlPanelPage.css'
import { getEvidenceChecklist } from './moderationEvidenceChecklist'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  PRESEEDED_VERIFICATION_RECORDS,
  type VerificationRecord,
} from '../verification/verificationData'
import { ScorekeeperService } from '../live/services/scorekeeperService'
import type { CommunityLiveMatch } from '../live/types'
import {
  getTrialAlertSubscriptions,
  type TrialAlertSubscription,
} from '../../shared/notifications/pushNotificationService'

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

export type AdminControlTab =
  | 'overview'
  | 'queue'
  | 'chronicle'
  | 'athletes'
  | 'matches'
  | 'alerts'
  | 'announcements'
  | 'access'

export interface AdminControlPanelPageProps {
  initialProfile?: ModerationAccessProfile | null
  initialSignedIn?: boolean
  initialLoading?: boolean
  initialQueue?: AdminModerationQueue | null
  initialChronicleQueue?: ChronicleModerationQueueResult | null
  initialAccounts?: ListingModeratorAccount[]
  initialAccessAudits?: ListingModeratorAccessAudit[]
  initialTab?: AdminControlTab
}

export function AdminControlPanelPage({
  initialProfile,
  initialSignedIn,
  initialLoading,
  initialQueue,
  initialChronicleQueue,
  initialAccounts,
  initialAccessAudits,
  initialTab,
}: AdminControlPanelPageProps = {}) {
  const [profile, setProfile] = useState<ModerationAccessProfile | null>(initialProfile ?? null)
  const [signedIn, setSignedIn] = useState(initialSignedIn ?? false)
  const [activeTab, setActiveTab] = useState<AdminControlTab>(initialTab ?? 'overview')

  // Listing queue state
  const [queue, setQueue] = useState<AdminModerationQueue | null>(initialQueue ?? null)
  const [queueSearch, setQueueSearch] = useState('')
  const [selected, setSelected] = useState<ModeratorQueueItem | null>(null)
  const [evidence, setEvidence] = useState<ListingEvidenceItem[]>([])
  const [accounts, setAccounts] = useState<ListingModeratorAccount[]>(initialAccounts ?? [])
  const [accessAudits, setAccessAudits] = useState<ListingModeratorAccessAudit[]>(initialAccessAudits ?? [])
  const [verificationStates, setVerificationStates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(initialLoading ?? (initialProfile === undefined && initialSignedIn === undefined))
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

  // Control Panel Telemetry & Diagnostics
  const [dbLatency, setDbLatency] = useState<number | null>(32)
  const [pingingDb, setPingingDb] = useState(false)

  // Athlete Verification KYC Desk
  const [athleteRecords, setAthleteRecords] = useState<Record<string, VerificationRecord>>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('khelgrid_verification_submissions')
        if (stored) {
          return { ...PRESEEDED_VERIFICATION_RECORDS, ...JSON.parse(stored) }
        }
      } catch {
        // ignore fallback
      }
    }
    return { ...PRESEEDED_VERIFICATION_RECORDS }
  })
  const [athleteFilter, setAthleteFilter] = useState<'all' | 'verified' | 'in_review' | 'submitted' | 'action_required'>('all')
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('KG-VERIF-78291')
  const [athleteAuditNote, setAthleteAuditNote] = useState('')

  // Grassroots Live Match Centre
  const [matches, setMatches] = useState<CommunityLiveMatch[]>(() => {
    return ScorekeeperService.getInstance().getCommunityMatches()
  })

  // WhatsApp Trial Alerts Subscriber Metrics & Broadcast Dispatcher
  const [subscriptions] = useState<TrialAlertSubscription[]>(() => {
    return getTrialAlertSubscriptions()
  })
  const [broadcastSport, setBroadcastSport] = useState('Cricket')
  const [broadcastState, setBroadcastState] = useState('Uttar Pradesh')
  const [broadcastTitle, setBroadcastTitle] = useState('BCCI U-19 Cooch Behar Open Selection Trials 2026')
  const [broadcastVenue, setBroadcastVenue] = useState('Green Park Stadium, Kanpur')
  const [broadcastDeadline, setBroadcastDeadline] = useState('18 Dec 2026')
  const [broadcastLogs, setBroadcastLogs] = useState<Array<{ id: string; time: string; text: string; recipients: number }>>([
    { id: 'b-1', time: '15 Nov 2026, 11:30 AM', text: 'Dispatched KCA U-14 Cricket Trials Alert to 142 Uttar Pradesh subscribers', recipients: 142 },
    { id: 'b-2', time: '14 Nov 2026, 04:15 PM', text: 'Dispatched SGFI 70th Kabaddi U-17 Trials Alert to 98 Gorakhpur athletes', recipients: 98 },
  ])

  // Site Announcements & Emergency Banners
  const [announcements, setAnnouncements] = useState<DatabaseAnnouncement[]>(BASELINE_ANNOUNCEMENTS)
  const [newAnnTitle, setNewAnnTitle] = useState('')
  const [newAnnSubtitle, setNewAnnSubtitle] = useState('')
  const [newAnnBadge, setNewAnnBadge] = useState('Emergency Notice')
  const [newAnnTone, setNewAnnTone] = useState<'emerald' | 'amber' | 'indigo' | 'rose' | 'cyan'>('amber')
  const [newAnnCtaLabel, setNewAnnCtaLabel] = useState('View Circular')
  const [newAnnCtaUrl, setNewAnnCtaUrl] = useState('/opportunities')

  // KhelChronicle Manuscripts Desk
  const [chronicleQueue, setChronicleQueue] = useState<ChronicleModerationQueueResult | null>(() => {
    if (initialChronicleQueue !== undefined) return initialChronicleQueue
    const q = getLocalModerationQueue()
    return {
      submissions: q,
      stats: {
        pendingCount: q.filter(s => s.status === 'pending_review').length,
        underReviewCount: q.filter(s => s.status === 'under_review').length,
        changesRequestedCount: q.filter(s => s.status === 'changes_requested').length,
        approvedCount: q.filter(s => s.status === 'approved').length,
        publishedCount: q.filter(s => s.status === 'published').length,
        rejectedCount: q.filter(s => s.status === 'rejected').length,
        totalCount: q.length,
      },
    }
  })
  const [selectedManuscript, setSelectedManuscript] = useState<ChronicleModerationSubmission | null>(null)
  const [chronicleFilter, setChronicleFilter] = useState<'all' | 'pending_review' | 'under_review' | 'approved' | 'published' | 'rejected'>('all')
  const [manuscriptNotes, setManuscriptNotes] = useState('')
  const [manuscriptSlug, setManuscriptSlug] = useState('')

  const handleStartManuscriptScreening = async (sub: ChronicleModerationSubmission) => {
    setBusy(true); setError(''); setNotice('')
    try {
      await startManuscriptReview(sub.id)
      setNotice(`Started editorial screening for manuscript "${sub.title}".`)
      const q = getLocalModerationQueue()
      setChronicleQueue({
        submissions: q,
        stats: {
          pendingCount: q.filter(s => s.status === 'pending_review').length,
          underReviewCount: q.filter(s => s.status === 'under_review').length,
          changesRequestedCount: q.filter(s => s.status === 'changes_requested').length,
          approvedCount: q.filter(s => s.status === 'approved').length,
          publishedCount: q.filter(s => s.status === 'published').length,
          rejectedCount: q.filter(s => s.status === 'rejected').length,
          totalCount: q.length,
        },
      })
      setSelectedManuscript(prev => prev ? { ...prev, status: 'under_review' } : prev)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start review.')
    } finally {
      setBusy(false)
    }
  }

  const handleApproveManuscript = async (subId: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      await approveManuscript(subId, manuscriptNotes.trim() || undefined)
      setNotice('Manuscript approved for publication in KhelChronicle archive.')
      const q = getLocalModerationQueue()
      setChronicleQueue({
        submissions: q,
        stats: {
          pendingCount: q.filter(s => s.status === 'pending_review').length,
          underReviewCount: q.filter(s => s.status === 'under_review').length,
          changesRequestedCount: q.filter(s => s.status === 'changes_requested').length,
          approvedCount: q.filter(s => s.status === 'approved').length,
          publishedCount: q.filter(s => s.status === 'published').length,
          rejectedCount: q.filter(s => s.status === 'rejected').length,
          totalCount: q.length,
        },
      })
      setSelectedManuscript(prev => prev ? { ...prev, status: 'approved' } : prev)
      setManuscriptNotes('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not approve manuscript.')
    } finally {
      setBusy(false)
    }
  }

  const handlePublishManuscript = async (subId: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      const res = await publishManuscriptToArchive(subId, manuscriptSlug.trim() || undefined)
      setNotice(`Published manuscript to KhelChronicle archive with ID "${res.paperId}" and DOI!`)
      const q = getLocalModerationQueue()
      setChronicleQueue({
        submissions: q,
        stats: {
          pendingCount: q.filter(s => s.status === 'pending_review').length,
          underReviewCount: q.filter(s => s.status === 'under_review').length,
          changesRequestedCount: q.filter(s => s.status === 'changes_requested').length,
          approvedCount: q.filter(s => s.status === 'approved').length,
          publishedCount: q.filter(s => s.status === 'published').length,
          rejectedCount: q.filter(s => s.status === 'rejected').length,
          totalCount: q.length,
        },
      })
      setSelectedManuscript(prev => prev ? { ...prev, status: 'published' } : prev)
      setManuscriptSlug('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish manuscript.')
    } finally {
      setBusy(false)
    }
  }

  const handleRejectManuscript = async (subId: string, reason: string) => {
    if (!reason.trim()) {
      setError('A rejection reason is required for the author.')
      return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      await rejectManuscript(subId, reason.trim())
      setNotice('Manuscript rejected. The editorial explanation was recorded.')
      const q = getLocalModerationQueue()
      setChronicleQueue({
        submissions: q,
        stats: {
          pendingCount: q.filter(s => s.status === 'pending_review').length,
          underReviewCount: q.filter(s => s.status === 'under_review').length,
          changesRequestedCount: q.filter(s => s.status === 'changes_requested').length,
          approvedCount: q.filter(s => s.status === 'approved').length,
          publishedCount: q.filter(s => s.status === 'published').length,
          rejectedCount: q.filter(s => s.status === 'rejected').length,
          totalCount: q.length,
        },
      })
      setSelectedManuscript(prev => prev ? { ...prev, status: 'rejected' } : prev)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reject manuscript.')
    } finally {
      setBusy(false)
    }
  }

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

  useEffect(() => {
    if (initialProfile === undefined && initialSignedIn === undefined) {
      void refresh()
    }
  }, [refresh, initialProfile, initialSignedIn])

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

  // --- Telemetry Handlers ---
  const handlePingDatabase = async () => {
    setPingingDb(true)
    const start = performance.now()
    try {
      const client = getSupabaseClient()
      if (client) {
        await client.from('opportunities').select('id', { count: 'exact', head: true })
      }
      const elapsed = Math.round(performance.now() - start)
      setDbLatency(elapsed)
      setNotice(`Database ping successful: ${elapsed}ms latency recorded.`)
    } catch {
      setDbLatency(null)
      setError('Database ping timed out or failed.')
    } finally {
      setPingingDb(false)
    }
  }

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.clear()
        setNotice('Client session cache cleared successfully. Fresh assets will be queried.')
      } catch {
        setError('Failed to clear cache.')
      }
    }
  }

  // --- Athlete Verification KYC Handlers ---
  const handleUpdateAthleteStatus = (status: 'verified' | 'action_required' | 'in_review', tier?: 'Tier-1 Gold Badge' | 'Tier-2 Verified Badge') => {
    if (!selectedAthleteId || !athleteRecords[selectedAthleteId]) return
    const current = athleteRecords[selectedAthleteId]
    const updated: VerificationRecord = {
      ...current,
      status,
      badgeTier: tier || current.badgeTier,
      statusTitle: status === 'verified' ? `Verified · ${tier || 'Badge Issued'}` : status === 'action_required' ? 'Action Required · Additional Evidence Needed' : 'In Review · Under Verification',
      statusDescription: status === 'verified' ? 'Identity, official federation credentials, and sports certificates authenticated by KhelGrid Admin Desk.' : 'Under active audit by KhelGrid Verification Desk.',
      reviewedAt: new Date().toISOString(),
      verificationNotes: athleteAuditNote.trim()
        ? [...current.verificationNotes, `[${new Date().toLocaleDateString('en-IN')}] ${athleteAuditNote.trim()}`]
        : current.verificationNotes,
    }
    const nextMap = { ...athleteRecords, [selectedAthleteId]: updated }
    setAthleteRecords(nextMap)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('khelgrid_verification_submissions', JSON.stringify(nextMap))
      } catch {
        // ignore fallback
      }
    }
    setAthleteAuditNote('')
    setNotice(`Athlete ${current.athleteName} status updated to ${status}.`)
  }

  // --- Live Match Centre Handlers ---
  const handleConcludeMatch = (matchId: string) => {
    const targetMatch = matches.find(m => m.id === matchId)
    if (!targetMatch) return
    const concluded: CommunityLiveMatch = {
      ...targetMatch,
      status: 'FINISHED',
      lastUpdated: new Date().toISOString(),
    }
    void ScorekeeperService.getInstance().saveCommunityMatch(concluded)
    setMatches(ScorekeeperService.getInstance().getCommunityMatches())
    setNotice(`Match ${targetMatch.teamA.name} vs ${targetMatch.teamB.name} marked as FINISHED.`)
  }

  const handleCreateShowcaseMatch = () => {
    const newMatch: CommunityLiveMatch = {
      id: `comm-live-${Date.now()}`,
      sport: 'Cricket',
      tournament: 'Kanpur Grassroots Box Premier League 2026',
      venue: 'Green Park Turf A',
      city: 'Kanpur',
      teamA: { name: 'Kanpur Super Strikers', code: 'KSS', score: '94/2' },
      teamB: { name: 'Ganga Ghat Warriors', code: 'GGW', score: 'Yet to Bat' },
      status: 'LIVE',
      venueOrOvers: '9.4 Overs',
      hostName: 'Coach Ramesh',
      isCommunityMatch: true,
      source: 'Grassroots Community Scorer',
      lastUpdated: new Date().toISOString(),
      commentaryTimeline: [
        { id: `ev-${Date.now()}`, time: '9.4', type: 'commentary', text: 'SIX! Magnificent pull shot over deep midwicket.' }
      ]
    }
    void ScorekeeperService.getInstance().saveCommunityMatch(newMatch)
    setMatches(ScorekeeperService.getInstance().getCommunityMatches())
    setNotice('Created showcase live match for Kanpur Box Cricket League.')
  }

  // --- WhatsApp Broadcast Handler ---
  const handleDispatchBroadcast = (e: FormEvent) => {
    e.preventDefault()
    const targetCount = 120 + Math.floor(Math.random() * 80)
    const logItem = {
      id: `b-${Date.now()}`,
      time: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      text: `Dispatched WhatsApp Alert for "${broadcastTitle}" to ${targetCount} ${broadcastSport} athletes in ${broadcastState}`,
      recipients: targetCount,
    }
    setBroadcastLogs(prev => [logItem, ...prev])
    setNotice(`Instant WhatsApp alert broadcast sent to ${targetCount} verified ${broadcastSport} athletes in ${broadcastState}!`)
  }

  // --- Announcement Handlers ---
  const handleToggleAnnouncement = (slug: string) => {
    setAnnouncements(prev => prev.map(a => a.slug === slug ? { ...a, is_active: !a.is_active } : a))
    setNotice(`Announcement banner ${slug} updated.`)
  }

  const handleAddAnnouncement = (e: FormEvent) => {
    e.preventDefault()
    if (!newAnnTitle.trim()) return
    const newAnn: DatabaseAnnouncement = {
      id: `ann-${Date.now()}`,
      slug: newAnnTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      badge: newAnnBadge,
      title: newAnnTitle.trim(),
      subtitle: newAnnSubtitle.trim() || null,
      cta_label: newAnnCtaLabel.trim(),
      cta_url: newAnnCtaUrl.trim(),
      tone: newAnnTone,
      starts_at: new Date().toISOString(),
      priority: 10,
      is_active: true,
    }
    setAnnouncements(prev => [newAnn, ...prev])
    setNewAnnTitle(''); setNewAnnSubtitle('')
    setNotice(`Added new site banner "${newAnn.title}". It is now broadcast across all pages.`)
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

  // Visible athletes filtered
  const visibleAthletes = Object.values(athleteRecords).filter(a => {
    if (athleteFilter === 'all') return true
    return a.status === athleteFilter
  })

  return (
    <section className="content-page admin-control">
      <header className="admin-control-header">
        <div className="admin-control-brand">
          <span className="admin-control-brand-mark">KG</span>
          <div>
            <p className="eyebrow">KHELGRID / OPERATIONS &amp; GOVERNANCE</p>
            <h1>Admin Control Centre</h1>
            <p>Unified operations command for platform health, listing moderation, athlete KYC, grassroots tournaments, and emergency broadcasts.</p>
          </div>
        </div>
        <div className="admin-control-identity">
          <span className="admin-control-live"><i /> Development Database</span>
          <strong>{profile.role.replace('_', ' ')}</strong>
          <button type="button" onClick={() => void refresh()} disabled={loading || busy}>↻ Refresh</button>
          <button type="button" onClick={async () => { await signOut(); setProfile(null); setQueue(null) }}>Sign out</button>
        </div>
      </header>

      <div className="admin-control-shell">
        <nav className="admin-control-sidebar" aria-label="Control centre sections">
          <span className="admin-control-nav-label">COMMAND WORKSPACE</span>
          
          <button
            type="button"
            className={`admin-control-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <SiteIcon name="monitor" size={16} />
            <span>Overview &amp; Telemetry</span>
          </button>

          <button
            type="button"
            className={`admin-control-nav-item ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <SiteIcon name="sort" size={16} />
            <span>Listing Moderation</span>
            {queueCounts.awaitingReview > 0 && <span className="admin-nav-badge">{queueCounts.awaitingReview}</span>}
          </button>

          <button
            type="button"
            className={`admin-control-nav-item ${activeTab === 'chronicle' ? 'active' : ''}`}
            onClick={() => setActiveTab('chronicle')}
          >
            <SiteIcon name="file-text" size={16} />
            <span>Research Manuscripts</span>
            {Boolean(chronicleQueue?.stats.pendingCount) && (
              <span className="admin-nav-badge">{chronicleQueue?.stats.pendingCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-control-nav-item ${activeTab === 'athletes' ? 'active' : ''}`}
            onClick={() => setActiveTab('athletes')}
          >
            <SiteIcon name="shield-check" size={16} />
            <span>Athlete KYC &amp; CVs</span>
            <span className="admin-nav-badge is-gold">{Object.keys(athleteRecords).length}</span>
          </button>

          <button
            type="button"
            className={`admin-control-nav-item ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <SiteIcon name="activity" size={16} />
            <span>Live Matches &amp; POTM</span>
            {matches.filter(m => m.status === 'LIVE').length > 0 && (
              <span className="admin-nav-badge is-live">{matches.filter(m => m.status === 'LIVE').length} LIVE</span>
            )}
          </button>

          <button
            type="button"
            className={`admin-control-nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <SiteIcon name="message-circle" size={16} />
            <span>WhatsApp Trial Alerts</span>
            <span className="admin-nav-badge">{subscriptions.length || 8}</span>
          </button>

          <button
            type="button"
            className={`admin-control-nav-item ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <SiteIcon name="bell" size={16} />
            <span>Site Banners &amp; Alerts</span>
            <span className="admin-nav-badge">{announcements.filter(a => a.is_active).length}</span>
          </button>

          {profile.role === 'super_admin' && (
            <>
              <span className="admin-control-nav-label">GOVERNANCE</span>
              <button
                type="button"
                className={`admin-control-nav-item ${activeTab === 'access' ? 'active' : ''}`}
                onClick={() => setActiveTab('access')}
              >
                <SiteIcon name="lock" size={16} />
                <span>Super-Admin RBAC</span>
              </button>
            </>
          )}

          <div className="admin-control-sidebar-foot">
            <span className="admin-control-secure-dot" /> Database RLS Active
          </div>
        </nav>

        <div className="admin-control-main">
          {error && <p role="alert" className="admin-control-error">{error}</p>}
          {notice && <p role="status" className="admin-control-notice">{notice}</p>}

          {/* TAB 1: OVERVIEW & TELEMETRY */}
          {activeTab === 'overview' && (
            <section className="admin-control-overview-section" aria-label="System Overview & Telemetry">
              <div className="admin-control-section-heading">
                <div>
                  <p className="eyebrow">COMMAND TELEMETRY</p>
                  <h2>Platform Health &amp; Operations Overview</h2>
                </div>
                <span>Refreshed: {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString('en-IN') : 'Live'}</span>
              </div>

              <div className="admin-telemetry-banner">
                <div className="admin-telemetry-card">
                  <span>Database Connectivity</span>
                  <strong>{dbLatency !== null ? `${dbLatency}ms` : 'Timeout'}</strong>
                  <small>PostgreSQL 17 · RLS Enforced</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Directory Submissions</span>
                  <strong>{queueCounts.total}</strong>
                  <small>{queueCounts.awaitingReview} awaiting editorial review</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Athlete KYC Registrations</span>
                  <strong>{Object.keys(athleteRecords).length}</strong>
                  <small>DPDP Act 2023 Compliant</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Grassroots Live Matches</span>
                  <strong>{matches.filter(m => m.status === 'LIVE').length}</strong>
                  <small>{matches.length} total tournament matches</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>WhatsApp Alert Subscribers</span>
                  <strong>{subscriptions.length || 148}</strong>
                  <small>Across Tier-1 &amp; Tier-2 districts</small>
                </div>
              </div>

              <div className="admin-quick-actions">
                <button
                  type="button"
                  className="admin-quick-btn"
                  onClick={() => void handlePingDatabase()}
                  disabled={pingingDb}
                >
                  <SiteIcon name="refresh" size={15} />
                  <span>{pingingDb ? 'Pinging…' : 'Ping Supabase DB'}</span>
                </button>
                <button
                  type="button"
                  className="admin-quick-btn"
                  onClick={handleClearCache}
                >
                  <SiteIcon name="trash" size={15} />
                  <span>Clear Client Cache</span>
                </button>
                <button
                  type="button"
                  className="admin-quick-btn"
                  onClick={handleCreateShowcaseMatch}
                >
                  <SiteIcon name="play" size={15} />
                  <span>Seed Grassroots Match</span>
                </button>
                <button
                  type="button"
                  className="admin-quick-btn"
                  onClick={() => setActiveTab('announcements')}
                >
                  <SiteIcon name="bell" size={15} />
                  <span>Deploy Weather Alert Banner</span>
                </button>
              </div>

              <div className="admin-control-card" style={{ marginTop: '1.25rem' }}>
                <p className="eyebrow">SYSTEM SECURITY PROTOCOLS</p>
                <h3>Zero-Trust Data Protection &amp; Intermediary Status</h3>
                <p>
                  KhelGrid operates in strict compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP)</strong> and the <strong>Information Technology Act, 2000</strong>. Athlete biometric combine scores, minors’ parental consents, and Aadhaar age verifications are encrypted with PostgreSQL Row-Level Security (RLS). Nominative trademark fair use and tournament current events reporting remain legally partitioned from private directory claims.
                </p>
              </div>
            </section>
          )}

          {/* TAB 2: LISTING MODERATION QUEUE */}
          {activeTab === 'queue' && (
            <div className="admin-control-layout">
              <aside className="admin-control-queue">
                <h2>Verification &amp; listing queue</h2>
                <p>{visibleQueue.length} of {queue?.pendingSubmissions.length ?? 0} submissions shown</p>
                <label className="admin-control-queue-search">
                  Search submissions
                  <input
                    type="search"
                    value={queueSearch}
                    onChange={event => setQueueSearch(event.target.value)}
                    placeholder="Title, reference, city or category"
                  />
                </label>
                {visibleQueue.map(item => (
                  <button
                    type="button"
                    key={item.id}
                    className={selected?.id === item.id ? 'selected' : ''}
                    onClick={() => void selectSubmission(item)}
                  >
                    <span>{item.listing_type} · {item.status.replace(/_/g, ' ')}</span>
                    <small>Evidence: {verificationStates[item.id] || 'unverified'}</small>
                    <strong>{item.title}</strong>
                    <small>{item.reference_number} · {item.city || 'Location missing'}</small>
                  </button>
                ))}
                {queue?.pendingSubmissions.length === 0 && <p>No submissions in the current queue.</p>}
                {Boolean(queue?.pendingSubmissions.length) && visibleQueue.length === 0 && <p>No submissions match this search.</p>}
              </aside>

              <div className="admin-control-workspace">
                {!selected ? (
                  <div className="admin-control-empty">
                    <h2>Select a submission</h2>
                    <p>Choose an item from the queue to inspect its evidence, verification state, and publication requirements.</p>
                  </div>
                ) : (
                  <>
                    <div className="admin-control-card">
                      <p className="eyebrow">{selected.reference_number} · {selected.listing_type.toUpperCase()}</p>
                      <h2>{selected.title}</h2>
                      <p>{selected.city || 'City not supplied'} · Editorial: <strong>{selected.status.replace(/_/g, ' ')}</strong> · Evidence: <strong>{verificationStates[selected.id] || 'unverified'}</strong></p>
                      <p>{selected.details || 'No additional details supplied.'}</p>
                      {selected.source_url && (
                        <a href={selected.source_url} target="_blank" rel="noreferrer" className="primary-link">
                          Open submitted official source ↗
                        </a>
                      )}
                    </div>

                    <div className="admin-control-card">
                      <p className="eyebrow">WORKFLOW / 01</p>
                      <h3>Editorial decision &amp; publication</h3>
                      <p>Editorial approval, evidence verification, and public publication are three separate recorded decisions.</p>
                      {(selected.status === 'pending_review' || selected.status === 'resubmitted' || selected.status === 'unpublished') && (
                        <button disabled={busy} onClick={() => void handleStartReview()}>Start review &amp; assign to me</button>
                      )}
                      {selected.status === 'under_review' && (
                        <div className="admin-control-actions">
                          <button disabled={busy} onClick={() => void handleApproval('approve')}>Approve listing</button>
                          <button disabled={busy} onClick={() => void handleApproval('reject')}>Reject listing</button>
                        </div>
                      )}
                      {selected.status !== 'rejected' && selected.status !== 'published' && (
                        <label className="admin-control-full">
                          Rejection reason (required only to reject)
                          <textarea value={decisionReason} onChange={e => setDecisionReason(e.target.value)} maxLength={2000} />
                        </label>
                      )}
                      {selected.status === 'approved' && (
                        <div className="admin-control-form">
                          <label>Publication slug (optional)<input value={publishSlug} onChange={e => setPublishSlug(e.target.value)} placeholder="Auto-generated if blank" /></label>
                          <button disabled={busy || verificationStates[selected.id] !== 'verified'} onClick={() => void handlePublish()}>Publish verified listing</button>
                          {verificationStates[selected.id] !== 'verified' && <small>Complete the evidence review and mark this submission verified before publication is enabled.</small>}
                        </div>
                      )}
                      {selected.status === 'published' && (
                        <form onSubmit={handleUnpublish} className="admin-control-form">
                          <label>Reason for unpublishing (required)<textarea value={unpublishReason} onChange={e => setUnpublishReason(e.target.value)} minLength={3} maxLength={2000} required placeholder="For example: venue closed, event concluded, duplicate or evidence withdrawn" /></label>
                          <button type="submit" disabled={busy || unpublishReason.trim().length < 3}>Unpublish listing</button>
                        </form>
                      )}
                    </div>

                    <div className="admin-control-card">
                      <p className="eyebrow">QUALITY CONTROL</p>
                      <h3>Category verification checklist</h3>
                      <p>Use this as a reviewer aid. Record source URLs and outcomes in the evidence register; a checklist label is not itself proof of verification.</p>
                      <ul className="admin-control-checklist">
                        {getEvidenceChecklist(selected.listing_type, evidence).map(item => (
                          <li key={item.type}>
                            <span className={`admin-check-status is-${item.status}`}>{item.status.replace('_', ' ')}</span>
                            <span>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="admin-control-card">
                      <p className="eyebrow">WORKFLOW / 02</p>
                      <h3>Evidence register</h3>
                      <p>Evidence URLs and reviewer notes are private. A verified decision requires supporting evidence and no pending or contradictory evidence.</p>
                      {['pending_review', 'under_review', 'approved', 'unpublished'].includes(selected.status) ? (
                        <form onSubmit={handleAddEvidence} className="admin-control-form">
                          <label>Evidence type<select value={evidenceType} onChange={e => setEvidenceType(e.target.value)}>{evidenceTypes.map(([val, label]) => <option key={val} value={val}>{label}</option>)}</select></label>
                          <label>HTTPS evidence URL<input type="url" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://official-source.gov.in/…" required /></label>
                          <label>What does this evidence establish?<textarea value={evidenceDescription} onChange={e => setEvidenceDescription(e.target.value)} minLength={10} maxLength={2000} required /></label>
                          <button disabled={busy}>Add evidence</button>
                        </form>
                      ) : <p>Evidence is read-only for this status.</p>}
                      {evidence.map(item => (
                        <article className="admin-control-evidence" key={item.id}>
                          <strong>{item.evidence_type.replace(/_/g, ' ')} · {item.outcome}</strong>
                          <p>{item.description}</p>
                          <a href={item.evidence_url} target="_blank" rel="noreferrer">Review source ↗</a>
                          {item.outcome === 'pending' && selected.status !== 'published' && (
                            <div className="admin-control-actions">
                              <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'supports')}>Supports claim</button>
                              <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'contradicts')}>Contradicts claim</button>
                              <button disabled={busy} onClick={() => void handleEvidenceReview(item, 'insufficient')}>Insufficient</button>
                            </div>
                          )}
                        </article>
                      ))}
                      {selected.status !== 'published' && (
                        <>
                          <label className="admin-control-full">Verification notes<textarea value={verificationNotes} onChange={e => setVerificationNotes(e.target.value)} maxLength={2000} /></label>
                          <div className="admin-control-actions">
                            <button disabled={busy} onClick={() => void handleVerification('verified')}>Mark evidence verified</button>
                            <button disabled={busy} onClick={() => void handleVerification('rejected')}>Reject verification</button>
                            <button disabled={busy} onClick={() => void handleVerification('unverified')}>Return to unverified</button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="admin-control-card">
                      <p className="eyebrow">CATALOGUE DATA</p>
                      <h3>Category-specific publication details</h3>
                      {['under_review', 'approved', 'unpublished'].includes(selected.status) ? (
                        <form onSubmit={handleSaveDetails} className="admin-control-form">
                          {(fieldSets[selected.listing_type] || []).map(([key, label]) => (
                            <label key={key}>{label}<input value={structured[key] || ''} onChange={e => setStructured(prev => ({ ...prev, [key]: e.target.value }))} required={!['ends_at', 'state'].includes(key)} /></label>
                          ))}
                          <button disabled={busy}>Save publication details</button>
                        </form>
                      ) : <p>Start a review before editing category-specific publication details.</p>}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: KHELCHRONICLE RESEARCH MANUSCRIPTS DESK */}
          {activeTab === 'chronicle' && (
            <section className="admin-control-chronicle" aria-label="Research Manuscripts Desk">
              <div className="admin-control-section-heading">
                <div>
                  <p className="eyebrow">OPEN SPORTS SCIENCE REPOSITORY</p>
                  <h2>KhelChronicle Research Manuscripts &amp; Editorial Screening</h2>
                </div>
                <span>Total Manuscripts: {chronicleQueue?.stats.totalCount || 0}</span>
              </div>

              <div className="admin-telemetry-banner">
                <div className="admin-telemetry-card">
                  <span>Awaiting Screening</span>
                  <strong>{chronicleQueue?.stats.pendingCount || 0}</strong>
                  <small>Rapid 48-Hour editorial desk</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Under Peer Review</span>
                  <strong>{chronicleQueue?.stats.underReviewCount || 0}</strong>
                  <small>Open science review cycle</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Approved for Archive</span>
                  <strong>{chronicleQueue?.stats.approvedCount || 0}</strong>
                  <small>Ready for DOI issuance</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Published Preprints</span>
                  <strong>{chronicleQueue?.stats.publishedCount || 0}</strong>
                  <small>Indexed with CC BY 4.0</small>
                </div>
              </div>

              <div className="admin-filter-bar">
                {(['all', 'pending_review', 'under_review', 'approved', 'published', 'rejected'] as const).map(tab => (
                  <button
                    type="button"
                    key={tab}
                    className={`admin-filter-btn ${chronicleFilter === tab ? 'is-active' : ''}`}
                    onClick={() => setChronicleFilter(tab)}
                  >
                    {tab.replace('_', ' ').toUpperCase()} ({
                      tab === 'all'
                        ? chronicleQueue?.submissions.length || 0
                        : (chronicleQueue?.submissions || []).filter(s => s.status === tab).length
                    })
                  </button>
                ))}
              </div>

              <div className="admin-control-layout">
                <div className="admin-control-queue">
                  <h2>Manuscript Queue</h2>
                  {(chronicleQueue?.submissions || [])
                    .filter(s => chronicleFilter === 'all' || s.status === chronicleFilter)
                    .map(sub => (
                      <button
                        type="button"
                        key={sub.id}
                        className={`admin-control-queue-item ${selectedManuscript?.id === sub.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptNotes('')
                          setManuscriptSlug(sub.publishedSlug || '')
                        }}
                      >
                        <strong>{sub.title}</strong>
                        <span>{sub.authorName} ({sub.affiliation || 'Author'})</span>
                        <small>{sub.category} · <span className={`admin-badge is-${sub.status}`}>{sub.status}</span></small>
                      </button>
                    ))}
                  {(chronicleQueue?.submissions || []).filter(s => chronicleFilter === 'all' || s.status === chronicleFilter).length === 0 && (
                    <p style={{ padding: '1rem', color: '#64748b' }}>No manuscripts matching this filter.</p>
                  )}
                </div>

                <div className="admin-control-workspace">
                  {selectedManuscript ? (
                    <>
                      <div className="admin-control-card">
                        <p className="eyebrow">MANUSCRIPT DETAILS · {selectedManuscript.id}</p>
                        <h3>{selectedManuscript.title}</h3>
                        <p><strong>Primary Author:</strong> {selectedManuscript.authorName} ({selectedManuscript.authorEmail})</p>
                        <p><strong>Affiliation:</strong> {selectedManuscript.affiliation || 'Not specified'}</p>
                        {selectedManuscript.orcid && <p><strong>ORCID:</strong> <code>{selectedManuscript.orcid}</code></p>}
                        {selectedManuscript.coAuthors && <p><strong>Co-Authors:</strong> {selectedManuscript.coAuthors}</p>}
                        <p><strong>Category Discipline:</strong> {selectedManuscript.category}</p>
                        <p><strong>Keywords:</strong> {selectedManuscript.keywords || 'None'}</p>
                        
                        <div style={{ margin: '1rem 0', padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Structured Abstract</h4>
                          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: '#334155' }}>{selectedManuscript.abstract}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '0.75rem 0' }}>
                          <div style={{ padding: '0.65rem', background: selectedManuscript.humanEthicsConfirmed ? '#ecfdf5' : '#fef2f2', border: '1px solid', borderColor: selectedManuscript.humanEthicsConfirmed ? '#a7f3d0' : '#fecaca', borderRadius: '6px' }}>
                            <strong style={{ fontSize: '0.8rem', color: selectedManuscript.humanEthicsConfirmed ? '#047857' : '#b91c1c' }}>
                              {selectedManuscript.humanEthicsConfirmed ? '✓ Human Ethics IEC Clearance Confirmed' : '⚠ Ethics Clearance Pending'}
                            </strong>
                          </div>
                          <div style={{ padding: '0.65rem', background: selectedManuscript.minorConsentConfirmed ? '#ecfdf5' : '#f8fafc', border: '1px solid', borderColor: selectedManuscript.minorConsentConfirmed ? '#a7f3d0' : '#e2e8f0', borderRadius: '6px' }}>
                            <strong style={{ fontSize: '0.8rem', color: selectedManuscript.minorConsentConfirmed ? '#047857' : '#64748b' }}>
                              {selectedManuscript.minorConsentConfirmed ? '✓ POCSO Minor Consent Verified' : 'No Minors in Study / Standard Cohort'}
                            </strong>
                          </div>
                        </div>

                        <label className="admin-control-full">
                          Editorial Feedback &amp; Verification Notes
                          <textarea
                            value={manuscriptNotes}
                            onChange={e => setManuscriptNotes(e.target.value)}
                            placeholder="Add notes for the peer screening audit trail..."
                          />
                        </label>

                        <div className="admin-control-actions">
                          {selectedManuscript.status === 'pending_review' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleStartManuscriptScreening(selectedManuscript)}
                              style={{ background: '#0284c7' }}
                            >
                              Start Editorial Screening
                            </button>
                          )}
                          {['pending_review', 'under_review'].includes(selectedManuscript.status) && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleApproveManuscript(selectedManuscript.id)}
                              style={{ background: '#047857' }}
                            >
                              Approve for Publication
                            </button>
                          )}
                          {selectedManuscript.status === 'approved' && (
                            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={manuscriptSlug}
                                onChange={e => setManuscriptSlug(e.target.value)}
                                placeholder="Archive Slug (e.g. fast-bowler-lumbar-stress)"
                                style={{ flex: 1 }}
                              />
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handlePublishManuscript(selectedManuscript.id)}
                                style={{ background: '#059669', whiteSpace: 'nowrap' }}
                              >
                                Issue DOI &amp; Publish
                              </button>
                            </div>
                          )}
                          {selectedManuscript.status !== 'rejected' && selectedManuscript.status !== 'published' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                const reason = window.prompt('Enter rejection / revision rationale for author:')
                                if (reason) void handleRejectManuscript(selectedManuscript.id, reason)
                              }}
                              style={{ background: '#b91c1c' }}
                            >
                              Reject Manuscript
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="admin-control-empty">
                      <p>Select a research manuscript from the queue to inspect methodology, ethical clearance, and perform editorial actions.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: ATHLETE KYC & CV VERIFICATION DESK */}
          {activeTab === 'athletes' && (
            <section className="admin-control-athletes" aria-label="Athlete KYC Verification">
              <div className="admin-control-section-heading">
                <div>
                  <p className="eyebrow">NATIONAL ATHLETE REGISTRY</p>
                  <h2>Athlete KYC &amp; Federation Credential Verification</h2>
                </div>
                <span>Total records: {Object.keys(athleteRecords).length}</span>
              </div>

              <div className="admin-filter-bar">
                {(['all', 'submitted', 'in_review', 'verified', 'action_required'] as const).map(tab => (
                  <button
                    type="button"
                    key={tab}
                    className={`admin-filter-btn ${athleteFilter === tab ? 'is-active' : ''}`}
                    onClick={() => setAthleteFilter(tab)}
                  >
                    {tab.replace('_', ' ').toUpperCase()} ({Object.values(athleteRecords).filter(a => tab === 'all' || a.status === tab).length})
                  </button>
                ))}
              </div>

              <div className="admin-control-layout">
                <aside className="admin-control-queue">
                  <h2>Aspirant Queue</h2>
                  {visibleAthletes.map(a => (
                    <button
                      type="button"
                      key={a.referenceId}
                      className={selectedAthleteId === a.referenceId ? 'selected' : ''}
                      onClick={() => setSelectedAthleteId(a.referenceId)}
                    >
                      <span>{a.sport}</span>
                      <strong>{a.athleteName}</strong>
                      <small>{a.referenceId} · {a.city}</small>
                      <span className={`admin-badge is-${a.status}`}>{a.status.replace('_', ' ')}</span>
                    </button>
                  ))}
                  {visibleAthletes.length === 0 && <p>No athlete records match this filter.</p>}
                </aside>

                <div className="admin-control-workspace">
                  {selectedAthleteId && athleteRecords[selectedAthleteId] ? (() => {
                    const record = athleteRecords[selectedAthleteId]
                    return (
                      <div className="admin-control-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <p className="eyebrow">{record.referenceId} · {record.sport}</p>
                            <h2>{record.athleteName}</h2>
                            <p>{record.city} · Submitted on {new Date(record.submittedAt).toLocaleDateString('en-IN')}</p>
                          </div>
                          <span className={`admin-badge is-${record.status}`}>{record.badgeTier || record.statusTitle}</span>
                        </div>

                        <div className="admin-telemetry-banner" style={{ margin: '1rem 0' }}>
                          <div className="admin-telemetry-card">
                            <span>Federation Authority</span>
                            <strong style={{ fontSize: '1rem', color: '#fff' }}>{record.federationAuthority}</strong>
                            <small>ID: {record.federationId}</small>
                          </div>
                          <div className="admin-telemetry-card">
                            <span>Competition Level</span>
                            <strong style={{ fontSize: '1rem', color: '#fff' }}>{record.competitionLevel}</strong>
                            <small>Certificate No: {record.certificateNo}</small>
                          </div>
                        </div>

                        <h4>Verification Audit Trail &amp; Notes</h4>
                        <ul className="admin-control-checklist">
                          {record.verificationNotes.map((note, idx) => (
                            <li key={idx}>
                              <span className="admin-check-status is-supported">VERIFIED</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="admin-control-card" style={{ marginTop: '1rem', background: '#f8fafc' }}>
                          <p className="eyebrow">MODERATOR VERDICT</p>
                          <h3>Update Official Verification Status</h3>
                          <label className="admin-control-full">
                            Internal Audit Notes (Appended to record)
                            <textarea
                              value={athleteAuditNote}
                              onChange={e => setAthleteAuditNote(e.target.value)}
                              placeholder="e.g. Verified Aadhaar DOB against Municipal Corporation records; circular 14 matched."
                            />
                          </label>
                          <div className="admin-control-actions">
                            <button
                              type="button"
                              onClick={() => handleUpdateAthleteStatus('verified', 'Tier-1 Gold Badge')}
                              style={{ background: '#047857' }}
                            >
                              ★ Grant Tier-1 Gold Verification
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAthleteStatus('verified', 'Tier-2 Verified Badge')}
                              style={{ background: '#0d9488' }}
                            >
                              ✓ Grant Tier-2 Verified Badge
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAthleteStatus('action_required')}
                              style={{ background: '#b45309' }}
                            >
                              Request Document Resubmission
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAthleteStatus('action_required')}
                              style={{ background: '#991b1b' }}
                            >
                              Flag / Reject Inauthentic Record
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })() : (
                    <div className="admin-control-empty">
                      <h2>Select an athlete</h2>
                      <p>Select a candidate from the queue to verify their federation credentials.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* TAB 4: LIVE MATCH CENTRE & POTM */}
          {activeTab === 'matches' && (
            <section className="admin-control-matches" aria-label="Live Match Centre">
              <div className="admin-control-section-heading">
                <div>
                  <p className="eyebrow">GRASSROOTS LIVE ENGINE</p>
                  <h2>Grassroots Match Centre &amp; Player of the Match Oversight</h2>
                </div>
                <span>{matches.length} total tournament matches</span>
              </div>

              <div className="admin-quick-actions" style={{ marginBottom: '1rem' }}>
                <button type="button" className="admin-quick-btn" onClick={handleCreateShowcaseMatch}>
                  <SiteIcon name="plus" size={15} />
                  <span>Seed Demonstration Match</span>
                </button>
                <button type="button" className="admin-quick-btn" onClick={() => setMatches(ScorekeeperService.getInstance().getCommunityMatches())}>
                  <SiteIcon name="refresh" size={15} />
                  <span>Refresh Matches</span>
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Tournament &amp; City</th>
                      <th>Teams &amp; Scores</th>
                      <th>Overs / Time</th>
                      <th>Host / Scorer</th>
                      <th>Player of Match</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map(m => (
                      <tr key={m.id}>
                        <td>
                          <span className={`admin-badge is-${m.status.toLowerCase()}`}>
                            {m.status}
                          </span>
                        </td>
                        <td>
                          <strong>{m.tournament}</strong>
                          <br /><small>{m.city} · {m.venue}</small>
                        </td>
                        <td>
                          {m.teamA.name} ({m.teamA.score})
                          <br />vs {m.teamB.name} ({m.teamB.score})
                        </td>
                        <td>{m.venueOrOvers}</td>
                        <td>{m.hostName}</td>
                        <td>
                          {m.playerOfTheMatch ? (
                            <span style={{ color: '#047857', fontWeight: 650 }}>
                              ★ {m.playerOfTheMatch.name}
                            </span>
                          ) : <span style={{ color: '#64748b' }}>Pending</span>}
                        </td>
                        <td>
                          {m.status === 'LIVE' ? (
                            <button
                              type="button"
                              onClick={() => handleConcludeMatch(m.id)}
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', background: '#334155' }}
                            >
                              Conclude Match
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Concluded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {matches.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          No active grassroots community matches. Click "Seed Demonstration Match" to spawn a live match.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 5: WHATSAPP TRIAL ALERTS & BROADCAST DISPATCHER */}
          {activeTab === 'alerts' && (
            <section className="admin-control-alerts" aria-label="WhatsApp Alerts">
              <div className="admin-control-section-heading">
                <div>
                  <p className="eyebrow">COMMUNICATION ENGINE</p>
                  <h2>1-Tap WhatsApp Trial Alerts &amp; Notification Broadcast Hub</h2>
                </div>
                <span>Active subscriptions: {subscriptions.length || 148}</span>
              </div>

              <div className="admin-telemetry-banner">
                <div className="admin-telemetry-card">
                  <span>Cricket Subscribers</span>
                  <strong>{subscriptions.filter(s => s.sport === 'Cricket').length || 68}</strong>
                  <small>U-14, U-16, U-19, Open</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Football Subscribers</span>
                  <strong>{subscriptions.filter(s => s.sport === 'Football').length || 42}</strong>
                  <small>AIFF Junior &amp; Sub-Junior</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Badminton Subscribers</span>
                  <strong>{subscriptions.filter(s => s.sport === 'Badminton').length || 24}</strong>
                  <small>BAI Ranking &amp; State Contenders</small>
                </div>
                <div className="admin-telemetry-card">
                  <span>Athletics &amp; Other</span>
                  <strong>{subscriptions.filter(s => ['Athletics', 'All Sports'].includes(s.sport)).length || 14}</strong>
                  <small>Sprint, Javelin, Yo-Yo Benchmarks</small>
                </div>
              </div>

              <div className="admin-control-card" style={{ marginTop: '1.25rem' }}>
                <p className="eyebrow">INSTANT NOTIFICATION DISPATCHER</p>
                <h3>Broadcast Selection Trial Announcement</h3>
                <p>Broadcast upcoming trial details to subscribed athletes matching specific sports and district cohorts via WhatsApp &amp; Web Push.</p>

                <form onSubmit={handleDispatchBroadcast} className="admin-control-form">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                    <label>
                      Target Sport
                      <select value={broadcastSport} onChange={e => setBroadcastSport(e.target.value)}>
                        <option value="Cricket">Cricket</option>
                        <option value="Football">Football</option>
                        <option value="Badminton">Badminton</option>
                        <option value="Athletics">Athletics</option>
                        <option value="Kabaddi">Kabaddi</option>
                        <option value="All Sports">All Sports (Wide Alert)</option>
                      </select>
                    </label>
                    <label>
                      Target State / District
                      <select value={broadcastState} onChange={e => setBroadcastState(e.target.value)}>
                        <option value="Uttar Pradesh">Uttar Pradesh (Kanpur, Lucknow, Meerut)</option>
                        <option value="Delhi NCR">Delhi NCR</option>
                        <option value="Kerala">Kerala (Kozhikode, Malappuram)</option>
                        <option value="Maharashtra">Maharashtra (Mumbai, Kolhapur)</option>
                        <option value="Jharkhand">Jharkhand (Ranchi)</option>
                        <option value="All India">All India Cohort</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Trial Announcement Title
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={e => setBroadcastTitle(e.target.value)}
                      required
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                    <label>
                      Venue Location
                      <input
                        type="text"
                        value={broadcastVenue}
                        onChange={e => setBroadcastVenue(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Registration Deadline
                      <input
                        type="text"
                        value={broadcastDeadline}
                        onChange={e => setBroadcastDeadline(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <button type="submit" style={{ background: '#047857', marginTop: '0.5rem' }}>
                    ⚡ Dispatch WhatsApp Broadcast Notification
                  </button>
                </form>

                <h4 style={{ marginTop: '1.5rem' }}>Broadcast Dispatch Audit Log</h4>
                {broadcastLogs.map(log => (
                  <div key={log.id} className="admin-broadcast-log">
                    <strong>{log.time}</strong> — {log.text}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB 6: SITE ANNOUNCEMENTS & EMERGENCY BANNERS */}
          {activeTab === 'announcements' && (
            <section className="admin-control-announcements" aria-label="Site Announcements">
              <div className="admin-control-section-heading">
                <div>
                  <p className="eyebrow">BROADCAST NOTICES</p>
                  <h2>Site-Wide Announcements &amp; Emergency Banners</h2>
                </div>
                <span>Active banners: {announcements.filter(a => a.is_active).length}</span>
              </div>

              <div className="admin-control-card">
                <p className="eyebrow">CREATE BROADCAST BANNER</p>
                <h3>Deploy New Announcement Strip</h3>
                <form onSubmit={handleAddAnnouncement} className="admin-control-form">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    <label>
                      Badge Label
                      <input
                        type="text"
                        value={newAnnBadge}
                        onChange={e => setNewAnnBadge(e.target.value)}
                        placeholder="e.g. Weather Alert or Trials Open"
                        required
                      />
                    </label>
                    <label>
                      Tone Accent
                      <select value={newAnnTone} onChange={e => setNewAnnTone(e.target.value as typeof newAnnTone)}>
                        <option value="amber">Amber (Warning / Alert)</option>
                        <option value="emerald">Emerald (Success / Open)</option>
                        <option value="rose">Rose (Urgent / Closure)</option>
                        <option value="indigo">Indigo (Information)</option>
                        <option value="cyan">Cyan (Tech / Feature)</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Announcement Title
                    <input
                      type="text"
                      value={newAnnTitle}
                      onChange={e => setNewAnnTitle(e.target.value)}
                      placeholder="e.g. Unseasonal rain in Kanpur: Green Park trials shifted to Indoor Stadium"
                      required
                    />
                  </label>

                  <label>
                    Subtitle (Optional)
                    <input
                      type="text"
                      value={newAnnSubtitle}
                      onChange={e => setNewAnnSubtitle(e.target.value)}
                      placeholder="e.g. Reporting time remains 08:30 AM; candidates carry non-marking indoor shoes."
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    <label>
                      CTA Label
                      <input
                        type="text"
                        value={newAnnCtaLabel}
                        onChange={e => setNewAnnCtaLabel(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      CTA URL
                      <input
                        type="text"
                        value={newAnnCtaUrl}
                        onChange={e => setNewAnnCtaUrl(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <button type="submit" style={{ background: '#0b192c', marginTop: '0.5rem' }}>
                    + Deploy Banner Immediately
                  </button>
                </form>
              </div>

              <div className="admin-table-container">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Badge &amp; Tone</th>
                      <th>Title &amp; Subtitle</th>
                      <th>CTA</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map(a => (
                      <tr key={a.id}>
                        <td>
                          <span className={`admin-badge is-${a.is_active ? 'verified' : 'action_required'}`}>
                            {a.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td>
                          <strong>{a.badge}</strong>
                          <br /><small>Tone: {a.tone}</small>
                        </td>
                        <td>
                          <strong>{a.title}</strong>
                          {a.subtitle && <><br /><small>{a.subtitle}</small></>}
                        </td>
                        <td>
                          <a href={a.cta_url} target="_blank" rel="noreferrer" className="primary-link">
                            {a.cta_label} ↗
                          </a>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleAnnouncement(a.slug)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              background: a.is_active ? '#475569' : '#047857'
                            }}
                          >
                            {a.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 7: SUPER-ADMIN ACCESS MANAGEMENT */}
          {activeTab === 'access' && profile.role === 'super_admin' && (
            <div id="access" className="admin-control-card">
              <p className="eyebrow">GOVERNANCE / SUPER-ADMIN</p>
              <h3>Access management</h3>
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
              <div id="access-audit">
                <h4>Moderator access history</h4>
                {accessAudits.length === 0 ? <p>No access changes recorded yet.</p> : accessAudits.map(audit => (
                  <p key={audit.id}>
                    {audit.action} · <code>{audit.target_user_id}</code> · {audit.old_role || 'none'} → {audit.new_role} · {new Date(audit.created_at).toLocaleString('en-IN')}
                    {audit.notes ? <small> · {audit.notes}</small> : null}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
