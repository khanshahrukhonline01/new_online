import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
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
  getAdminModerationQueue,
  startListingReview,
  approveListingSubmission,
  rejectListingSubmission,
  requestListingCorrections,
  publishListingSubmission,
  unpublishListingSubmission,
  clearCatalogueCache,
  getListingSubmissionAuditTrail,
  getListingSubmissionVersions,
  getListingPublicationDetails,
  saveListingPublicationDetails,
  type AdminModerationQueue,
  type ModeratorQueueItem,
  type SubmissionAuditItem,
  type SubmissionVersionItem,
} from '../../integrations/supabase/public-client'
import {
  getChronicleModerationQueue,
  getLocalModerationQueue,
  startManuscriptReview,
  requestManuscriptCorrections,
  approveManuscript,
  rejectManuscript,
  publishManuscriptToArchive,
  type ChronicleModerationSubmission,
  type ChronicleModerationQueueResult,
} from '../../integrations/supabase/chronicle-client'
import { RESEARCH_CATEGORIES } from '../khelchronicle/data/khelchronicleData'
import './AdminModerationPage.css'

export const MODERATION_REJECTION_PRESETS = [
  { label: 'Missing Official HTTPS Link', text: 'Missing official HTTPS registration link or circular from the organizing body.' },
  { label: 'Event Date Concluded', text: 'The stated event or trial date has already concluded. Please submit upcoming events.' },
  { label: 'Duplicate Listing', text: 'This listing is already published in the active KhelGrid catalogue.' },
  { label: 'Incomplete Venue Address', text: 'Incomplete ground address. Street locality, sports supported, and city are required.' },
  { label: 'Unaccredited Credentials', text: 'Unverified coaching or academy accreditation. Recognized certification required.' },
  { label: 'Commercial Spam', text: 'Submission flagged as commercial advertisement, product promo, or non-sports content.' },
]

export const MODERATION_CORRECTION_PRESETS = [
  { label: 'Provide Official Link', text: 'Please provide an official HTTPS registration link or federation circular to verify this trial.' },
  { label: 'Specify Age & Reporting Dates', text: 'Please specify the exact age cut-off criteria, reporting dates, and schedule for participants.' },
  { label: 'Clarify Entry Fees', text: 'Please clarify whether there is any entry fee, kit deposit, or participation charge for this event.' },
  { label: 'Provide Full Street Address', text: 'Please provide the complete street address and nearest landmark for this sports venue.' },
]

export const MODERATION_APPROVAL_PRESETS = [
  { label: 'Federation Circular Verified', text: 'Verified against official sports federation announcement and calendar.' },
  { label: 'Venue & Facilities Confirmed', text: 'Venue location, ground dimensions, and contact number verified.' },
  { label: 'Coaching Credentials Verified', text: 'Coaching certification and institute affiliation verified.' },
]

export const CHRONICLE_REJECTION_PRESETS = [
  { label: 'Ethics / Consent Missing', text: 'Inadequate participant ethics clearance or minor athlete guardian consent documentation.' },
  { label: 'Out of Scope', text: 'Methodology and subject matter fall outside sports science, kinesiology, or athletic performance scope.' },
  { label: 'Unverified Author Identity', text: 'Author institutional affiliation or ORCID credentials could not be independently authenticated.' },
  { label: 'Commercial Promotion', text: 'Submission flagged as commercial product endorsement rather than independent scientific research.' },
]

export const CHRONICLE_CORRECTION_PRESETS = [
  { label: 'Add Ethics Statement', text: 'Please upload institutional review board (IRB/IEC) approval number and ethics protocol details.' },
  { label: 'Provide Data Repository Link', text: 'Please provide a permanent DOI or OSF/Zenodo repository link for supplementary raw datasets.' },
  { label: 'Format Structured Abstract', text: 'Please format the abstract into Background, Methods, Results, and Practical Applications.' },
]

type TabFilter =
  | 'all'
  | 'pending_review'
  | 'under_review'
  | 'changes_requested'
  | 'resubmitted'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'unpublished'

type ActionDialogType =
  | 'approve'
  | 'reject'
  | 'request_corrections'
  | 'publish'
  | 'unpublish'
  | 'bulk_approve'
  | 'bulk_reject'
  | 'bulk_corrections'
  | null

export type TableDensity = 'compact' | 'cozy' | 'expanded'

const categoryFields: Record<string, Array<{ key: string; label: string; placeholder: string; required?: boolean }>> = {
  pickup_game: [
    { key: 'sport', label: 'Sport', placeholder: 'e.g. Cricket, Football, Badminton', required: true },
    { key: 'venue_name', label: 'Venue / Ground Name', placeholder: 'e.g. Shivaji Park Ground', required: true },
    { key: 'host_name', label: 'Host / Organizer Name', placeholder: 'e.g. Community Coordinator', required: true },
    { key: 'starts_at', label: 'Date & Time (ISO-8601)', placeholder: 'e.g. 2026-11-20T17:00:00Z', required: true },
    { key: 'city', label: 'City', placeholder: 'e.g. Delhi', required: true },
  ],
  opportunity: [
    { key: 'organizer_name', label: 'Organizer / Club Name', placeholder: 'e.g. Delhi FC Academy', required: true },
    { key: 'venue_name', label: 'Trial Venue Name', placeholder: 'e.g. Ambedkar Stadium', required: false },
    { key: 'city', label: 'City', placeholder: 'e.g. Delhi', required: true },
    { key: 'opportunity_type', label: 'Type', placeholder: 'e.g. trial, scholarship', required: false },
  ],
  venue: [
    { key: 'address', label: 'Street / Locality Address', placeholder: 'e.g. Sector 12, Main Sports Road', required: true },
    { key: 'sport', label: 'Sports Supported', placeholder: 'e.g. Badminton, Turf Cricket', required: false },
    { key: 'city', label: 'City', placeholder: 'e.g. Delhi', required: true },
  ],
  academy: [
    { key: 'state', label: 'State', placeholder: 'e.g. Delhi, Maharashtra', required: false },
    { key: 'city', label: 'City', placeholder: 'e.g. Delhi', required: true },
  ],
  coach: [
    { key: 'qualifications', label: 'Qualifications / Certifications', placeholder: 'e.g. NIS Certified, AFC C-License', required: true },
    { key: 'state', label: 'State', placeholder: 'e.g. Delhi, Karnataka', required: false },
    { key: 'city', label: 'City', placeholder: 'e.g. Delhi', required: true },
  ],
  event: [
    { key: 'organizer_name', label: 'Organizer Name', placeholder: 'e.g. Delhi Sports League', required: true },
    { key: 'venue_name', label: 'Venue Name', placeholder: 'e.g. Talkatora Stadium', required: true },
    { key: 'starts_at', label: 'Starts at (ISO-8601)', placeholder: 'e.g. 2026-11-25T09:00:00Z', required: true },
    { key: 'city', label: 'City', placeholder: 'e.g. Delhi', required: true },
  ],
}

export interface AdminModerationPageProps {
  initialQueue?: AdminModerationQueue | null
  initialDesk?: 'listings' | 'chronicle'
  initialChronicleQueue?: ChronicleModerationQueueResult | null
  hideDeskSwitcher?: boolean
}

export function AdminModerationPage({
  initialQueue,
  initialDesk = 'listings',
  initialChronicleQueue,
  hideDeskSwitcher = false,
}: AdminModerationPageProps = {}) {
  const [activeDesk, setActiveDesk] = useState<'listings' | 'chronicle'>(initialDesk)
  const [queue, setQueue] = useState<AdminModerationQueue | null>(initialQueue ?? null)
  const [loading, setLoading] = useState(initialQueue === undefined)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Auth state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'forgot_password' | 'set_new_password'>('login')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Listing Filters & Search
  const [activeTab, setActiveTab] = useState<TabFilter>('pending_review')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Listing Detail Modal & Action State
  const [selectedItem, setSelectedItem] = useState<ModeratorQueueItem | null>(null)
  const [auditTrail, setAuditTrail] = useState<SubmissionAuditItem[]>([])
  const [versionHistory, setVersionHistory] = useState<SubmissionVersionItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [actionDialog, setActionDialog] = useState<ActionDialogType>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionNotes, setActionNotes] = useState('')
  const [targetSlug, setTargetSlug] = useState('')
  const [publishStructured, setPublishStructured] = useState<Record<string, string>>({})
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set())
  const [modalTab, setModalTab] = useState<'data' | 'preview' | 'diff' | 'evidence'>('data')
  const [chronicleModalTab, setChronicleModalTab] = useState<'data' | 'abstract' | 'evidence'>('data')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Phase 5: Batch Moderation & Bulk Actions State
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkNotes, setBulkNotes] = useState('')
  const [bulkMessage, setBulkMessage] = useState('')
  const [undoBuffer, setUndoBuffer] = useState<{
    count: number
    actionLabel: string
  } | null>(null)

  const handleCopy = (text: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 2000)
    }
  }

  // Phase 2: Table Density & Power Keyboard Navigation State
  const [tableDensity, setTableDensity] = useState<TableDensity>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('khelgrid_admin_table_density') as TableDensity | null
        if (saved === 'compact' || saved === 'cozy' || saved === 'expanded') return saved
      } catch {
        // ignore
      }
    }
    return 'cozy'
  })

  const [focusedListingIndex, setFocusedListingIndex] = useState<number>(-1)
  const [focusedChronicleIndex, setFocusedChronicleIndex] = useState<number>(-1)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  const handleDensityChange = (newDensity: TableDensity) => {
    setTableDensity(newDensity)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('khelgrid_admin_table_density', newDensity)
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    const handleCategoryFilterEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ category?: string }>).detail
      if (detail?.category) {
        setCategoryFilter(detail.category)
        setPage(1)
      }
    }
    window.addEventListener('khelgrid-admin-filter-category', handleCategoryFilterEvent)
    return () => window.removeEventListener('khelgrid-admin-filter-category', handleCategoryFilterEvent)
  }, [])

  const preparePublishDialog = async (item: ModeratorQueueItem) => {
    setSelectedItem(item)
    setActionDialog('publish')
    setTargetSlug('')
    setError('')

    const cityClean = item.city && item.city.trim().toLowerCase() !== 'india' ? item.city.trim() : 'Delhi'
    const defaults: Record<string, string> = {
      city: cityClean,
    }
    const cleanTitle = item.title.trim()
    const sportsList = ['Cricket', 'Football', 'Badminton', 'Tennis', 'Basketball', 'Pickleball', 'Athletics', 'Swimming', 'Hockey', 'Kabaddi', 'Table Tennis']
    const detectedSport = sportsList.find(s => cleanTitle.toLowerCase().includes(s.toLowerCase())) || 'Football'

    if (item.listing_type === 'pickup_game') {
      defaults.sport = detectedSport
      defaults.venue_name = cleanTitle
      defaults.host_name = 'Community Coordinator'
      const tomorrow = new Date(Date.now() + 86400000)
      tomorrow.setHours(17, 0, 0, 0)
      defaults.starts_at = tomorrow.toISOString()
    } else if (item.listing_type === 'opportunity') {
      defaults.organizer_name = cleanTitle
      defaults.venue_name = `${cityClean} Sports Ground`
      defaults.opportunity_type = 'trial'
    } else if (item.listing_type === 'venue') {
      defaults.address = `Near Sports Complex, ${cityClean}`
      defaults.sport = detectedSport
    } else if (item.listing_type === 'academy') {
      defaults.state = cityClean
    } else if (item.listing_type === 'coach') {
      defaults.qualifications = 'Certified Sports Coach & Trainer'
      defaults.state = cityClean
    } else if (item.listing_type === 'event') {
      defaults.organizer_name = cleanTitle
      defaults.venue_name = `${cityClean} Sports Arena`
      const nextWeek = new Date(Date.now() + 7 * 86400000)
      nextWeek.setHours(10, 0, 0, 0)
      defaults.starts_at = nextWeek.toISOString()
    }

    // Auto-parse structured details lines from submitter if available
    if (item.details) {
      const lines = item.details.split('\n')
      for (const line of lines) {
        const colon = line.indexOf(':')
        if (colon > 0) {
          const key = line.slice(0, colon).trim().toLowerCase()
          const val = line.slice(colon + 1).trim()
          if (val) {
            if (key.includes('sport')) defaults.sport = val
            if (key.includes('venue') || key.includes('ground')) defaults.venue_name = val
            if (key.includes('host') || key.includes('organizer')) {
              defaults.host_name = val
              defaults.organizer_name = val
            }
            if (key.includes('time') || key.includes('schedule') || key.includes('date') || key.includes('starts')) {
              try {
                const parsed = new Date(val)
                if (!isNaN(parsed.getTime())) defaults.starts_at = parsed.toISOString()
              } catch {
                // Keep default
              }
            }
            if (key.includes('qualification') || key.includes('certif')) defaults.qualifications = val
            if (key.includes('address') || key.includes('street')) defaults.address = val
          }
        }
      }
    }

    setPublishStructured(defaults)

    try {
      const pubDetails = await getListingPublicationDetails(item.id)
      if (pubDetails.structured_data && typeof pubDetails.structured_data === 'object') {
        const loaded: Record<string, string> = {}
        for (const [k, v] of Object.entries(pubDetails.structured_data)) {
          if (v != null) loaded[k] = String(v)
        }
        setPublishStructured(prev => ({ ...prev, ...loaded }))
      }
    } catch {
      // Keep defaults
    }
  }

  // Chronicle Manuscripts State
  const [chronicleQueue, setChronicleQueue] = useState<ChronicleModerationQueueResult | null>(() => {
    if (initialChronicleQueue !== undefined) return initialChronicleQueue
    const queue = getLocalModerationQueue()
    return {
      submissions: queue,
      stats: {
        pendingCount: queue.filter(s => s.status === 'pending_review').length,
        underReviewCount: queue.filter(s => s.status === 'under_review').length,
        changesRequestedCount: queue.filter(s => s.status === 'changes_requested').length,
        approvedCount: queue.filter(s => s.status === 'approved').length,
        publishedCount: queue.filter(s => s.status === 'published').length,
        rejectedCount: queue.filter(s => s.status === 'rejected').length,
        totalCount: queue.length,
      },
    }
  })
  const [chronicleActiveTab, setChronicleActiveTab] = useState<
    'all' | 'pending_review' | 'under_review' | 'changes_requested' | 'approved' | 'published' | 'rejected'
  >('pending_review')
  const [chronicleSearchTerm, setChronicleSearchTerm] = useState('')
  const [chronicleCategoryFilter, setChronicleCategoryFilter] = useState('all')
  const [chroniclePage, setChroniclePage] = useState(1)
  const [selectedManuscript, setSelectedManuscript] = useState<ChronicleModerationSubmission | null>(null)
  const [manuscriptActionDialog, setManuscriptActionDialog] = useState<
    'screen' | 'corrections' | 'approve' | 'publish' | 'reject' | null
  >(null)
  const [manuscriptActionMessage, setManuscriptActionMessage] = useState('')
  const [manuscriptActionNotes, setManuscriptActionNotes] = useState('')
  const [manuscriptTargetSlug, setManuscriptTargetSlug] = useState('')
  const [manuscriptTargetPaperId, setManuscriptTargetPaperId] = useState('')

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminModerationQueue({
        status: activeTab !== 'all' ? activeTab : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchTerm.trim() || undefined,
        limit: 100,
        sortBy,
        sortDir,
      })
      setQueue(data)
    } catch (cause) {
      setQueue(null)
      setError(cause instanceof Error ? cause.message : 'You are not authorized to access the moderation queue.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, categoryFilter, searchTerm, sortBy, sortDir])

  const loadChronicleQueue = useCallback(async () => {
    try {
      const data = await getChronicleModerationQueue({
        status: chronicleActiveTab !== 'all' ? chronicleActiveTab : undefined,
        category: chronicleCategoryFilter !== 'all' ? chronicleCategoryFilter : undefined,
        search: chronicleSearchTerm.trim() || undefined,
      })
      setChronicleQueue(data)
    } catch {
      // non-fatal in offline mode
    }
  }, [chronicleActiveTab, chronicleCategoryFilter, chronicleSearchTerm])

  useEffect(() => {
    if (initialQueue !== undefined) return
    void loadQueue()
  }, [initialQueue, loadQueue])

  useEffect(() => {
    if (initialChronicleQueue !== undefined) return
    void loadChronicleQueue()
  }, [initialChronicleQueue, loadChronicleQueue])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const callbackInfo = parseAuthUrlCallback()
    if (callbackInfo.type === 'recovery') {
      setAuthMode('set_new_password')
      setNotice('Please set a new secure password for your moderator account.')
      clearAuthUrlHash()
    }
  }, [])

  useEffect(() => {
    if (initialQueue !== undefined) return
    const client = getSupabaseClient()
    if (!client) return
    let active = true
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'SIGNED_OUT' || !session) {
        setQueue(null)
        setChronicleQueue(null)
        setSelectedItem(null)
        setSelectedManuscript(null)
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        window.setTimeout(() => {
          if (active) {
            void loadQueue()
            void loadChronicleQueue()
          }
        }, 0)
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [initialQueue, loadQueue, loadChronicleQueue])

  const handleRequestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSigningIn(true)
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
      setSigningIn(false)
    }
  }

  const handleSaveNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < 12) {
      setError('Admin passwords must be at least 12 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSigningIn(true)
    setError('')
    setNotice('')
    try {
      const res = await updatePassword(newPassword)
      if (!res.success) throw new Error(res.message || 'Could not update password.')
      setNotice('Your password has been changed successfully. You may now sign in.')
      setNewPassword('')
      setConfirmPassword('')
      setAuthMode('login')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update password.')
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSigningIn(true)
    try {
      const result = await signInWithEmail({ email, password })
      if (!result.success) {
        setError(result.message || 'Sign-in failed.')
        return
      }
      setPassword('')
      await loadQueue()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setQueue(null)
    setSelectedItem(null)
    setNotice('Signed out of the moderation desk.')
  }

  const openDetailView = async (item: ModeratorQueueItem) => {
    setSelectedItem(item)
    setActionDialog(null)
    setActionMessage('')
    setActionNotes('')
    setTargetSlug('')
    setLoadingDetails(true)
    try {
      const [audits, versions] = await Promise.all([
        getListingSubmissionAuditTrail(item.id).catch(() => []),
        getListingSubmissionVersions(item.id).catch(() => []),
      ])
      setAuditTrail(audits)
      setVersionHistory(versions)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleStartReview = async (item: ModeratorQueueItem) => {
    setBusyId(item.id)
    setError('')
    try {
      await startListingReview(item.id, item.version)
      setNotice(`Started review for "${item.title}".`)
      await loadQueue()
      if (selectedItem?.id === item.id) {
        setSelectedItem({ ...item, status: 'under_review', version: item.version + 1 })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start review.')
    } finally {
      setBusyId(null)
    }
  }

  const handleExecuteAction = async () => {
    if (!selectedItem || !actionDialog) return
    setBusyId(selectedItem.id)
    setError('')
    setNotice('')
    try {
      if (actionDialog === 'approve') {
        await approveListingSubmission(selectedItem.id, actionNotes.trim() || undefined, selectedItem.version)
        setNotice(`Submission "${selectedItem.title}" approved. Catalogue publication remains a separate step.`)
      } else if (actionDialog === 'reject') {
        if (!actionMessage.trim()) {
          setError('A rejection reason is required.')
          setBusyId(null)
          return
        }
        await rejectListingSubmission(selectedItem.id, actionMessage.trim(), actionNotes.trim() || undefined, selectedItem.version)
        setNotice(`Submission "${selectedItem.title}" rejected.`)
      } else if (actionDialog === 'request_corrections') {
        if (!actionMessage.trim() || actionMessage.trim().length < 10) {
          setError('A clear correction message for the submitter is required (at least 10 characters).')
          setBusyId(null)
          return
        }
        await requestListingCorrections(selectedItem.id, actionMessage.trim(), actionNotes.trim() || undefined, selectedItem.version)
        setNotice(`Corrections requested for "${selectedItem.title}". The submitter can now update and resubmit.`)
      } else if (actionDialog === 'publish') {
        let currentVersion = selectedItem.version

        // Save ONLY real, moderator-entered structured facts (never fabricate cities,
        // addresses, qualifications, dates, or synthetic verification evidence URLs).
        const explicitFacts = Object.fromEntries(
          Object.entries(publishStructured)
            .map(([k, v]) => [k, v.trim()])
            .filter(([, v]) => v.length > 0),
        )

        if (Object.keys(explicitFacts).length > 0) {
          const newVer = await saveListingPublicationDetails(selectedItem.id, explicitFacts, currentVersion)
          if (typeof newVer === 'number' && !isNaN(newVer)) currentVersion = newVer
        }

        // Publish strictly through server-enforced evidence & verification checks.
        // If evidence is incomplete or verification is not marked 'verified' in Control Centre,
        // the database RPC will reject publication rather than fabricating verification.
        const res = await publishListingSubmission(selectedItem.id, targetSlug.trim() || undefined, undefined, currentVersion)
        clearCatalogueCache()
        setNotice(`Published to public.${res.publishedTable} with slug "${res.slug}".`)
      } else if (actionDialog === 'unpublish') {
        if (!actionMessage.trim()) {
          setError('An unpublication reason is required.')
          setBusyId(null)
          return
        }
        await unpublishListingSubmission(selectedItem.id, actionMessage.trim(), actionNotes.trim() || undefined, selectedItem.version)
        clearCatalogueCache()
        setNotice(`Listing "${selectedItem.title}" unpublished. It is no longer visible in public catalogue queries.`)
      }
      setActionDialog(null)
      setSelectedItem(null)
      await loadQueue()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action could not be completed.')
    } finally {
      setBusyId(null)
    }
  }

  const handleExportSelectedCsv = () => {
    const selectedList = items.filter(i => selectedSubIds.has(i.id))
    if (selectedList.length === 0) return

    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const headers = ['Reference Number', 'Listing Type', 'Title', 'City', 'Status', 'Version', 'Created At', 'Source URL']
    const rows = selectedList.map(item => [
      escapeCsv(item.reference_number),
      escapeCsv(item.listing_type),
      escapeCsv(item.title),
      escapeCsv(item.city),
      escapeCsv(item.status),
      escapeCsv(item.version),
      escapeCsv(new Date(item.created_at).toISOString()),
      escapeCsv(item.source_url),
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `khelgrid_moderation_batch_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    setNotice(`Exported ${selectedList.length} selected listings to CSV.`)
  }

  const handleExecuteBulkAction = async () => {
    if (!actionDialog?.startsWith('bulk_')) return
    const selectedList = items.filter(i => selectedSubIds.has(i.id))
    if (selectedList.length === 0) return

    const action = actionDialog.replace('bulk_', '') as 'approve' | 'reject' | 'corrections'
    setBulkBusy(true)
    setError('')
    setNotice('')

    try {
      let succeeded = 0
      let failed = 0

      for (const item of selectedList) {
        try {
          if (action === 'approve') {
            await approveListingSubmission(item.id, bulkNotes.trim() || undefined, item.version)
            succeeded++
          } else if (action === 'reject') {
            if (!bulkMessage.trim()) {
              setError('A rejection reason message is required for bulk rejection.')
              setBulkBusy(false)
              return
            }
            await rejectListingSubmission(item.id, bulkMessage.trim(), bulkNotes.trim() || undefined, item.version)
            succeeded++
          } else if (action === 'corrections') {
            if (!bulkMessage.trim() || bulkMessage.trim().length < 10) {
              setError('A correction request message of at least 10 characters is required for bulk corrections.')
              setBulkBusy(false)
              return
            }
            await requestListingCorrections(item.id, bulkMessage.trim(), bulkNotes.trim() || undefined, item.version)
            succeeded++
          }
        } catch {
          failed++
        }
      }

      const actionName = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent for corrections'
      const feedback = `Successfully ${actionName} ${succeeded} submissions in batch.${failed > 0 ? ` (${failed} failed due to concurrent modification)` : ''}`
      setNotice(feedback)
      setSelectedSubIds(new Set())
      setActionDialog(null)
      setBulkMessage('')
      setBulkNotes('')

      setUndoBuffer({
        count: succeeded,
        actionLabel: actionName,
      })
      window.setTimeout(() => {
        setUndoBuffer(null)
      }, 5000)

      await loadQueue()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Bulk action failed.')
    } finally {
      setBulkBusy(false)
    }
  }

  const handleStartChronicleReview = async (item: ChronicleModerationSubmission) => {
    setBusyId(item.id)
    setError('')
    try {
      await startManuscriptReview(item.id)
      setNotice(`Started editorial screening for "${item.title}".`)
      await loadChronicleQueue()
      if (selectedManuscript?.id === item.id) {
        setSelectedManuscript({ ...item, status: 'under_review' })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start review.')
    } finally {
      setBusyId(null)
    }
  }

  const handleExecuteChronicleAction = async () => {
    if (!selectedManuscript || !manuscriptActionDialog) return
    setBusyId(selectedManuscript.id)
    setError('')
    setNotice('')
    try {
      if (manuscriptActionDialog === 'approve') {
        await approveManuscript(selectedManuscript.id, manuscriptActionNotes.trim() || undefined)
        setNotice(`Manuscript "${selectedManuscript.title}" approved for publication.`)
      } else if (manuscriptActionDialog === 'reject') {
        if (!manuscriptActionMessage.trim()) {
          setError('A rejection reason is required for the author.')
          setBusyId(null)
          return
        }
        await rejectManuscript(
          selectedManuscript.id,
          manuscriptActionMessage.trim(),
          manuscriptActionNotes.trim() || undefined
        )
        setNotice(`Manuscript "${selectedManuscript.title}" rejected.`)
      } else if (manuscriptActionDialog === 'corrections') {
        if (!manuscriptActionMessage.trim() || manuscriptActionMessage.trim().length < 10) {
          setError('A revision message of at least 10 characters is required for the author.')
          setBusyId(null)
          return
        }
        await requestManuscriptCorrections(
          selectedManuscript.id,
          manuscriptActionMessage.trim(),
          manuscriptActionNotes.trim() || undefined
        )
        setNotice(`Revisions requested for "${selectedManuscript.title}".`)
      } else if (manuscriptActionDialog === 'publish') {
        const res = await publishManuscriptToArchive(
          selectedManuscript.id,
          manuscriptTargetSlug.trim() || undefined,
          manuscriptTargetPaperId.trim() || undefined
        )
        setNotice(`Published manuscript to KhelChronicle archive with ID "${res.paperId}" and slug "${res.slug}"!`)
      }
      setManuscriptActionDialog(null)
      setSelectedManuscript(null)
      await loadChronicleQueue()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action could not be completed.')
    } finally {
      setBusyId(null)
    }
  }

  // Filter items in memory if client search or tab is applied
  const items = queue?.pendingSubmissions || []
  const filteredItems = items.filter(item => {
    if (activeTab !== 'all' && item.status !== activeTab) return false
    if (categoryFilter !== 'all' && item.listing_type !== categoryFilter) return false
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchTitle = item.title.toLowerCase().includes(term)
      const matchCity = (item.city || '').toLowerCase().includes(term)
      const matchRef = item.reference_number.toLowerCase().includes(term)
      if (!matchTitle && !matchCity && !matchRef) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize)

  // Filter Chronicle Manuscripts
  const chronicleItems = chronicleQueue?.submissions || []
  const filteredChronicleItems = chronicleItems.filter(item => {
    if (chronicleActiveTab !== 'all' && item.status !== chronicleActiveTab) return false
    if (chronicleCategoryFilter !== 'all' && item.category !== chronicleCategoryFilter) return false
    if (chronicleSearchTerm.trim()) {
      const term = chronicleSearchTerm.toLowerCase()
      const matchTitle = item.title.toLowerCase().includes(term)
      const matchAuthor = item.authorName.toLowerCase().includes(term)
      const matchAffil = (item.affiliation || '').toLowerCase().includes(term)
      const matchId = item.submissionId.toLowerCase().includes(term)
      if (!matchTitle && !matchAuthor && !matchAffil && !matchId) return false
    }
    return true
  })
  const chroniclePageSize = 10
  const totalChroniclePages = Math.max(1, Math.ceil(filteredChronicleItems.length / chroniclePageSize))
  const paginatedChronicleItems = filteredChronicleItems.slice(
    (chroniclePage - 1) * chroniclePageSize,
    chroniclePage * chroniclePageSize
  )

  // Phase 1 & 2: Power keyboard navigation (J/K/A/R/C/1/2/3/?) and Esc handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable)

      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false)
        } else if (actionDialog) {
          setActionDialog(null)
        } else if (selectedItem) {
          setSelectedItem(null)
        } else if (manuscriptActionDialog) {
          setManuscriptActionDialog(null)
        } else if (selectedManuscript) {
          setSelectedManuscript(null)
        } else if (selectedSubIds.size > 0) {
          setSelectedSubIds(new Set())
        }
        return
      }

      if (isTyping) return

      // Toggle shortcuts help with '?'
      if (e.key === '?') {
        e.preventDefault()
        setShowShortcutsModal(prev => !prev)
        return
      }

      const isListings = activeDesk === 'listings'
      const currentItems = isListings ? paginatedItems : paginatedChronicleItems
      const currentIndex = isListings ? focusedListingIndex : focusedChronicleIndex
      const setIndex = isListings ? setFocusedListingIndex : setFocusedChronicleIndex

      // Move down: 'j' or 'ArrowDown'
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (currentItems.length === 0) return
        const nextIndex = currentIndex < currentItems.length - 1 ? currentIndex + 1 : 0
        setIndex(nextIndex)
        return
      }

      // Move up: 'k' or 'ArrowUp'
      if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (currentItems.length === 0) return
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentItems.length - 1
        setIndex(prevIndex)
        return
      }

      // Open / Inspect: 'Enter' or 'o' or 'O' or ' ' (Space)
      if (e.key === 'Enter' || e.key === 'o' || e.key === 'O' || e.key === ' ') {
        if (currentIndex >= 0 && currentIndex < currentItems.length) {
          e.preventDefault()
          if (isListings) {
            void openDetailView(paginatedItems[currentIndex])
          } else {
            setSelectedManuscript(paginatedChronicleItems[currentIndex])
            setManuscriptActionDialog(null)
            setError('')
          }
        }
        return
      }

      // Quick Approve: 'a' or 'A'
      if (e.key === 'a' || e.key === 'A') {
        const item = isListings
          ? (selectedItem || (currentIndex >= 0 ? paginatedItems[currentIndex] : null))
          : (selectedManuscript || (currentIndex >= 0 ? paginatedChronicleItems[currentIndex] : null))

        if (item) {
          e.preventDefault()
          if (isListings) {
            const sub = item as ModeratorQueueItem
            setSelectedItem(sub)
            setActionDialog('approve')
            setActionNotes('')
            setError('')
          } else {
            const ms = item as ChronicleModerationSubmission
            setSelectedManuscript(ms)
            setManuscriptActionDialog('approve')
            setManuscriptActionNotes('')
            setError('')
          }
        }
        return
      }

      // Quick Reject: 'r' or 'R'
      if (e.key === 'r' || e.key === 'R') {
        const item = isListings
          ? (selectedItem || (currentIndex >= 0 ? paginatedItems[currentIndex] : null))
          : (selectedManuscript || (currentIndex >= 0 ? paginatedChronicleItems[currentIndex] : null))

        if (item) {
          e.preventDefault()
          if (isListings) {
            const sub = item as ModeratorQueueItem
            setSelectedItem(sub)
            setActionDialog('reject')
            setActionMessage('')
            setError('')
          } else {
            const ms = item as ChronicleModerationSubmission
            setSelectedManuscript(ms)
            setManuscriptActionDialog('reject')
            setManuscriptActionMessage('')
            setError('')
          }
        }
        return
      }

      // Request Corrections / Revisions: 'c' or 'C'
      if (e.key === 'c' || e.key === 'C') {
        const item = isListings
          ? (selectedItem || (currentIndex >= 0 ? paginatedItems[currentIndex] : null))
          : (selectedManuscript || (currentIndex >= 0 ? paginatedChronicleItems[currentIndex] : null))

        if (item) {
          e.preventDefault()
          if (isListings) {
            const sub = item as ModeratorQueueItem
            setSelectedItem(sub)
            setActionDialog('request_corrections')
            setActionMessage('')
            setError('')
          } else {
            const ms = item as ChronicleModerationSubmission
            setSelectedManuscript(ms)
            setManuscriptActionDialog('corrections')
            setManuscriptActionMessage('')
            setError('')
          }
        }
        return
      }

      // Phase 5: Toggle card selection with 'x' or 'X'
      if (e.key === 'x' || e.key === 'X') {
        if (currentIndex >= 0 && currentIndex < currentItems.length) {
          e.preventDefault()
          const targetId = currentItems[currentIndex].id
          setSelectedSubIds(prev => {
            const next = new Set(prev)
            if (next.has(targetId)) next.delete(targetId)
            else next.add(targetId)
            return next
          })
        }
        return
      }

      // Phase 5: Select all currently filtered items: 'Shift + A'
      if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault()
        setSelectedSubIds(new Set(currentItems.map(i => i.id)))
        return
      }

      // Phase 5: Deselect all: 'Shift + D'
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
        setSelectedSubIds(new Set())
        return
      }

      // Density shortcuts: '1' for compact, '2' for cozy, '3' for expanded
      if (e.key === '1') {
        handleDensityChange('compact')
      } else if (e.key === '2') {
        handleDensityChange('cozy')
      } else if (e.key === '3') {
        handleDensityChange('expanded')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    actionDialog,
    selectedItem,
    manuscriptActionDialog,
    selectedManuscript,
    showShortcutsModal,
    activeDesk,
    paginatedItems,
    paginatedChronicleItems,
    focusedListingIndex,
    focusedChronicleIndex,
  ])

  return (
    <section className="admin-page-root content-page">
      <header className="admin-header">
        <span className="admin-eyebrow">
          <SiteIcon name="shield-check" size={14} /> Protected Moderation Desk
        </span>
        <div className="admin-title-row">
          <div>
            <h1>Listing review queue</h1>
            <p className="admin-subtitle">
              Only accounts allowlisted in the development database can read or review these submissions. Approval does not automatically publish a listing.
            </p>
          </div>
          {queue && (
            <div className="admin-mod-card-actions">
              <span className="admin-role-badge">
                <SiteIcon name="check-circle" size={14} /> Authorized Moderator
              </span>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void handleSignOut()}>
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Desk Switcher */}
        {!hideDeskSwitcher && (
          <div className="admin-desk-switcher" role="tablist" aria-label="Moderation desk mode">
            <button
              type="button"
              role="tab"
              aria-selected={activeDesk === 'listings'}
              className={`admin-desk-btn ${activeDesk === 'listings' ? 'active' : ''}`}
              onClick={() => setActiveDesk('listings')}
            >
              <SiteIcon name="file-text" size={16} />
              <span>Directory Listings Queue</span>
              <span className="admin-desk-badge">{queue?.stats.pendingSubmissionsCount ?? 0}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDesk === 'chronicle'}
              className={`admin-desk-btn ${activeDesk === 'chronicle' ? 'active' : ''}`}
              onClick={() => { setActiveDesk('chronicle'); void loadChronicleQueue() }}
            >
              <SiteIcon name="award" size={16} />
              <span>KhelChronicle Manuscripts</span>
              <span className="admin-desk-badge chronicle">{chronicleQueue?.stats.pendingCount ?? 0}</span>
            </button>
          </div>
        )}
      </header>

      {error && (
        <p className="state-panel state-unavailable" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="state-panel state-available" role="status">
          {notice}
        </p>
      )}

      {loading && !queue ? (
        <p>Loading protected moderation desk…</p>
      ) : queue ? (
        <>
          {/* ============================================================= */}
          {/* Directory Listings Desk                                        */}
          {/* ============================================================= */}
          {activeDesk === 'listings' && (
            <>
              {/* Summary KPI Cards */}
          <div className="admin-metrics-grid">
            <div className="admin-metric-card highlight">
              <span className="admin-metric-val">{queue.stats.pendingSubmissionsCount}</span>
              <span className="admin-metric-lbl">Pending Review</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-val">{queue.stats.underReviewCount ?? 0}</span>
              <span className="admin-metric-lbl">In Review</span>
            </div>
            <div className="admin-metric-card urgent">
              <span className="admin-metric-val">{queue.stats.changesRequestedCount ?? 0}</span>
              <span className="admin-metric-lbl">Changes Requested</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-val">{queue.stats.approvedCount ?? 0}</span>
              <span className="admin-metric-lbl">Approved (Unpublished)</span>
            </div>
            <div className="admin-metric-card success">
              <span className="admin-metric-val">{queue.stats.publishedCount ?? 0}</span>
              <span className="admin-metric-lbl">Published Catalogue</span>
            </div>
          </div>

          {/* Status Tabs Navigation */}
          <nav className="admin-tabs-nav" aria-label="Moderation status filter">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'pending_review' ? 'active' : ''}`}
              onClick={() => { setActiveTab('pending_review'); setPage(1) }}
            >
              Pending <span className="admin-tab-badge">{queue.stats.pendingSubmissionsCount}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'under_review' ? 'active' : ''}`}
              onClick={() => { setActiveTab('under_review'); setPage(1) }}
            >
              Under Review <span className="admin-tab-badge">{queue.stats.underReviewCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'changes_requested' ? 'active' : ''}`}
              onClick={() => { setActiveTab('changes_requested'); setPage(1) }}
            >
              Changes Requested <span className="admin-tab-badge">{queue.stats.changesRequestedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'resubmitted' ? 'active' : ''}`}
              onClick={() => { setActiveTab('resubmitted'); setPage(1) }}
            >
              Resubmitted
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => { setActiveTab('approved'); setPage(1) }}
            >
              Approved <span className="admin-tab-badge">{queue.stats.approvedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'published' ? 'active' : ''}`}
              onClick={() => { setActiveTab('published'); setPage(1) }}
            >
              Published <span className="admin-tab-badge">{queue.stats.publishedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => { setActiveTab('rejected'); setPage(1) }}
            >
              Rejected
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'unpublished' ? 'active' : ''}`}
              onClick={() => { setActiveTab('unpublished'); setPage(1) }}
            >
              Unpublished
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveTab('all'); setPage(1) }}
            >
              All Items <span className="admin-tab-badge">{items.length}</span>
            </button>
          </nav>

          {/* Search & Filters Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-search-box">
              <SiteIcon name="search" size={16} />
              <input
                type="search"
                className="admin-search-input"
                placeholder="Search by title, city, or reference number (KHL-…)"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
              />
            </div>
            <div className="admin-filter-group">
              <label>
                Category:
                <select
                  className="admin-select"
                  value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
                >
                  <option value="all">All Categories</option>
                  <option value="opportunity">Opportunity / Trial</option>
                  <option value="venue">Venue</option>
                  <option value="academy">Academy</option>
                  <option value="coach">Coach</option>
                  <option value="event">Event</option>
                  <option value="pickup_game">Pickup Game</option>
                  <option value="sport">Sport</option>
                </select>
              </label>

              <label>
                Sort:
                <select
                  className="admin-select"
                  value={`${sortBy}-${sortDir}`}
                  onChange={e => {
                    const [f, d] = e.target.value.split('-') as ['created_at' | 'updated_at', 'desc' | 'asc']
                    setSortBy(f)
                    setSortDir(d)
                  }}
                >
                  <option value="created_at-desc">Newest First</option>
                  <option value="created_at-asc">Oldest First</option>
                  <option value="updated_at-desc">Recently Updated</option>
                </select>
              </label>

              {/* Phase 2: Table Density Switcher & Shortcuts Modal Trigger */}
              <div className="admin-density-switcher" role="group" aria-label="Table density">
                <button
                  type="button"
                  className={`admin-density-btn ${tableDensity === 'compact' ? 'active' : ''}`}
                  onClick={() => handleDensityChange('compact')}
                  title="Compact density (Key: 1)"
                >
                  Compact
                </button>
                <button
                  type="button"
                  className={`admin-density-btn ${tableDensity === 'cozy' ? 'active' : ''}`}
                  onClick={() => handleDensityChange('cozy')}
                  title="Cozy density (Key: 2)"
                >
                  Cozy
                </button>
                <button
                  type="button"
                  className={`admin-density-btn ${tableDensity === 'expanded' ? 'active' : ''}`}
                  onClick={() => handleDensityChange('expanded')}
                  title="Expanded density (Key: 3)"
                >
                  Expanded
                </button>
              </div>

              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-shortcuts-trigger"
                onClick={() => setShowShortcutsModal(true)}
                title="View Keyboard Shortcuts (?)"
              >
                <span>Shortcuts</span>
                <kbd>?</kbd>
              </button>

              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadQueue()}>
                Refresh Queue
              </button>
            </div>
          </div>

          {/* Phase 5: Enhanced Bulk Selection Header Bar */}
          <div className="admin-bulk-header-bar">
            <div className="admin-bulk-select-controls">
              <label className="admin-bulk-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedSubIds.size === paginatedItems.length && paginatedItems.length > 0}
                  onChange={() => {
                    if (selectedSubIds.size === paginatedItems.length) setSelectedSubIds(new Set())
                    else setSelectedSubIds(new Set(paginatedItems.map(p => p.id)))
                  }}
                />
                <span>Select Page ({paginatedItems.length})</span>
              </label>

              {items.length > paginatedItems.length && selectedSubIds.size < items.length && (
                <button
                  type="button"
                  className="admin-bulk-link-btn"
                  onClick={() => setSelectedSubIds(new Set(items.map(p => p.id)))}
                >
                  Select all {items.length} filtered
                </button>
              )}
            </div>

            {selectedSubIds.size > 0 && (
              <div className="admin-bulk-quick-actions">
                <span className="admin-bulk-pill-badge">
                  <SiteIcon name="check-circle" size={13} />
                  <strong>{selectedSubIds.size}</strong> selected
                </span>

                <button
                  type="button"
                  className="admin-btn admin-btn-approve admin-btn-sm"
                  onClick={() => {
                    setActionDialog('bulk_approve')
                    setBulkNotes('Approved via batch review session.')
                    setError('')
                  }}
                  title="Bulk approve selected submissions"
                >
                  <SiteIcon name="check" size={13} />
                  Approve ({selectedSubIds.size})
                </button>

                <button
                  type="button"
                  className="admin-btn admin-btn-warn admin-btn-sm"
                  onClick={() => {
                    setActionDialog('bulk_corrections')
                    setBulkMessage('')
                    setBulkNotes('')
                    setError('')
                  }}
                  title="Bulk request corrections"
                >
                  <SiteIcon name="alert-circle" size={13} />
                  Corrections
                </button>

                <button
                  type="button"
                  className="admin-btn admin-btn-reject admin-btn-sm"
                  onClick={() => {
                    setActionDialog('bulk_reject')
                    setBulkMessage('')
                    setBulkNotes('')
                    setError('')
                  }}
                  title="Bulk reject selected"
                >
                  <SiteIcon name="close" size={13} />
                  Reject
                </button>

                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={handleExportSelectedCsv}
                  title="Export selected records to CSV"
                >
                  <SiteIcon name="arrow-down-left" size={13} />
                  Export CSV
                </button>

                <button
                  type="button"
                  className="admin-btn admin-btn-ghost admin-btn-sm"
                  onClick={() => setSelectedSubIds(new Set())}
                  title="Clear selection (Shift + D)"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Submissions List */}
          {paginatedItems.length === 0 ? (
            items.length === 0 ? (
              <div className="admin-empty-celebration">
                <div className="admin-empty-icon">🎉</div>
                <h3>All caught up! Zero pending listings</h3>
                <p>Every submitted trial, tournament, and venue has been screened. New submissions from athletes and academies will appear here in real time.</p>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadQueue()}>
                  <SiteIcon name="refresh" size={14} /> Refresh Queue
                </button>
              </div>
            ) : (
              <div className="admin-empty-celebration filters">
                <SiteIcon name="search" size={28} />
                <h3>No listings match your active filters</h3>
                <p>Found 0 matching items out of {items.length} total items in this queue.</p>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setActiveTab('all'); setPage(1) }}
                >
                  Clear Search &amp; Filters
                </button>
              </div>
            )
          ) : (
            <div className={`admin-items-list density-${tableDensity}`}>
              {paginatedItems.map((sub, idx) => (
                <article
                  key={sub.id}
                  className={`admin-mod-card ${selectedItem?.id === sub.id ? 'is-active-inspected' : ''} ${focusedListingIndex === idx ? 'is-keyboard-focused' : ''}`}
                  onClick={() => void openDetailView(sub)}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void openDetailView(sub)
                  }}
                  title="Click to inspect in Right-Side Drawer (or press Enter / O)"
                >
                  {/* Phase 1: Floating Quick Action Hover Bar */}
                  <div className="admin-card-hover-actions" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="admin-hover-action-btn"
                      title="Inspect Submission in Right-Side Drawer"
                      onClick={() => void openDetailView(sub)}
                    >
                      <SiteIcon name="search" size={13} />
                      <span>Inspect</span>
                    </button>
                    {(sub.status === 'pending_review' || sub.status === 'resubmitted' || sub.status === 'unpublished') && (
                      <button
                        type="button"
                        className="admin-hover-action-btn primary"
                        title="Start Review"
                        disabled={busyId === sub.id}
                        onClick={() => void handleStartReview(sub)}
                      >
                        <SiteIcon name="activity" size={13} />
                        <span>Review</span>
                      </button>
                    )}
                    {sub.status === 'under_review' && (
                      <button
                        type="button"
                        className="admin-hover-action-btn success"
                        title="Approve Listing"
                        onClick={() => { setSelectedItem(sub); setActionDialog('approve'); setActionNotes(''); setError('') }}
                      >
                        <SiteIcon name="badge-check" size={13} />
                        <span>Approve</span>
                      </button>
                    )}
                    {sub.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-hover-action-btn publish"
                        title="Publish to Catalogue"
                        onClick={() => void preparePublishDialog(sub)}
                      >
                        <SiteIcon name="arrow-up-right" size={13} />
                        <span>Publish</span>
                      </button>
                    )}
                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-hover-action-btn warning"
                        title="Request Corrections"
                        onClick={() => { setSelectedItem(sub); setActionDialog('request_corrections'); setActionMessage(''); setError('') }}
                      >
                        <SiteIcon name="alert-circle" size={13} />
                      </button>
                    )}
                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-hover-action-btn danger"
                        title="Reject Listing"
                        onClick={() => { setSelectedItem(sub); setActionDialog('reject'); setActionMessage(''); setError('') }}
                      >
                        <SiteIcon name="close" size={13} />
                      </button>
                    )}
                    {sub.source_url && (
                      <a
                        href={sub.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-hover-action-btn link"
                        title="Open official HTTPS source ↗"
                      >
                        <SiteIcon name="arrow-up-right" size={13} />
                      </a>
                    )}
                  </div>
                  <div className="admin-mod-card-top">
                    <div className="admin-mod-card-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedSubIds.has(sub.id)}
                        onChange={() => {
                          setSelectedSubIds(prev => {
                            const next = new Set(prev)
                            if (next.has(sub.id)) next.delete(sub.id)
                            else next.add(sub.id)
                            return next
                          })
                        }}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                        aria-label={`Select ${sub.title}`}
                      />
                      <button
                        type="button"
                        className={`admin-ref-code-btn ${copiedId === sub.id ? 'is-copied' : ''}`}
                        onClick={e => handleCopy(sub.reference_number, sub.id, e)}
                        title={`Click to copy: ${sub.reference_number}`}
                      >
                        <span>{sub.reference_number}</span>
                        <span className="admin-copy-icon">
                          <SiteIcon name={copiedId === sub.id ? 'check' : 'copy'} size={11} />
                        </span>
                        {copiedId === sub.id && <span className="admin-copy-tooltip">Copied!</span>}
                      </button>
                      <span className={`admin-type-pill ${sub.listing_type}`}>{sub.listing_type}</span>
                      <h3 className="admin-item-title">{sub.title}</h3>
                    </div>
                    <span className={`admin-status-badge ${sub.status}`}>
                      {sub.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="admin-mod-card-meta">
                    {sub.city && (
                      <span>
                        <SiteIcon name="map-pin" size={14} /> {sub.city}
                      </span>
                    )}
                    <span>
                      <SiteIcon name="calendar-check" size={14} /> Submitted {new Date(sub.created_at).toLocaleDateString('en-IN')}
                    </span>
                    <span>v{sub.version}</span>
                    {sub.source_url && (
                      <a href={sub.source_url} target="_blank" rel="noreferrer" title="Verify HTTPS source">
                        Official source ↗
                      </a>
                    )}
                  </div>

                  {sub.details && <p className="admin-mod-card-desc">{sub.details}</p>}

                  {sub.correction_request && (
                    <div className="state-panel state-unavailable" style={{ margin: '0.25rem 0' }}>
                      <strong>Active Correction Request:</strong> {sub.correction_request}
                    </div>
                  )}

                  {sub.rejection_reason && (
                    <div className="state-panel state-unavailable" style={{ margin: '0.25rem 0' }}>
                      <strong>Rejection Reason:</strong> {sub.rejection_reason}
                    </div>
                  )}

                  <div className="admin-mod-card-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => void openDetailView(sub)}
                    >
                      <SiteIcon name="search" size={14} /> Inspect & History
                    </button>

                    {(sub.status === 'pending_review' || sub.status === 'resubmitted' || sub.status === 'unpublished') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === sub.id}
                        onClick={() => void handleStartReview(sub)}
                      >
                        Start Review
                      </button>
                    )}

                    {sub.status === 'under_review' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => { setSelectedItem(sub); setActionDialog('approve'); setActionNotes(''); setError('') }}
                      >
                        <SiteIcon name="badge-check" size={14} /> Approve
                      </button>
                    )}

                    {sub.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-publish"
                        onClick={() => void preparePublishDialog(sub)}
                      >
                        <SiteIcon name="arrow-up-right" size={14} /> Publish to Catalogue
                      </button>
                    )}

                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        onClick={() => { setSelectedItem(sub); setActionDialog('request_corrections'); setActionMessage(''); setError('') }}
                      >
                        Request Corrections
                      </button>
                    )}

                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => { setSelectedItem(sub); setActionDialog('reject'); setActionMessage(''); setError('') }}
                      >
                        <SiteIcon name="close" size={14} /> Reject
                      </button>
                    )}

                    {sub.status === 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => { setSelectedItem(sub); setActionDialog('unpublish'); setActionMessage(''); setError('') }}
                      >
                        Unpublish
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {Math.min((page - 1) * pageSize + 1, filteredItems.length)} -{' '}
                {Math.min(page * pageSize, filteredItems.length)} of {filteredItems.length}
              </span>
              <div className="admin-mod-card-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Submission Detail & Action Drawer */}
          {selectedItem && (
            <div
              className="admin-drawer-backdrop admin-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-sub-title"
              onClick={() => { setSelectedItem(null); setActionDialog(null) }}
            >
              <div
                className="admin-inspection-drawer admin-modal-card"
                onClick={e => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="admin-drawer-header">
                  <div className="admin-drawer-header-top">
                    <div>
                      <div className="admin-drawer-badge-row">
                        <button
                          type="button"
                          className={`admin-ref-code-btn ${copiedId === selectedItem.id ? 'is-copied' : ''}`}
                          onClick={e => handleCopy(selectedItem.reference_number, selectedItem.id, e)}
                          title={`Click to copy: ${selectedItem.reference_number}`}
                        >
                          <span>{selectedItem.reference_number}</span>
                          <span className="admin-copy-icon">
                            <SiteIcon name={copiedId === selectedItem.id ? 'check' : 'copy'} size={11} />
                          </span>
                          {copiedId === selectedItem.id && <span className="admin-copy-tooltip">Copied!</span>}
                        </button>
                        <span className={`admin-type-pill ${selectedItem.listing_type}`}>{selectedItem.listing_type}</span>
                        <span className="admin-ref-code" style={{ opacity: 0.85 }}>v{selectedItem.version}</span>
                        <span className={`admin-status-badge ${selectedItem.status}`}>
                          {selectedItem.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h2 id="modal-sub-title" className="admin-drawer-title">{selectedItem.title}</h2>
                    </div>
                    <button
                      type="button"
                      className="admin-drawer-close-btn"
                      onClick={() => { setSelectedItem(null); setActionDialog(null) }}
                      title="Close inspection drawer (Esc)"
                    >
                      <SiteIcon name="close" size={15} />
                      <span>Close</span>
                      <kbd>Esc</kbd>
                    </button>
                  </div>
                </div>

                {/* Sticky Action & Navigation Strip in Drawer */}
                <div className="admin-drawer-sticky-strip">
                  <div className="admin-modal-nav-tabs" style={{ margin: 0 }}>
                    <button
                      type="button"
                      className={`admin-modal-nav-tab ${modalTab === 'data' ? 'active' : ''}`}
                      onClick={() => setModalTab('data')}
                    >
                      <SiteIcon name="file-text" size={14} /> Submission Data
                    </button>
                    <button
                      type="button"
                      className={`admin-modal-nav-tab ${modalTab === 'preview' ? 'active' : ''}`}
                      onClick={() => setModalTab('preview')}
                    >
                      <SiteIcon name="search" size={14} /> Live Public Card Preview
                    </button>
                    <button
                      type="button"
                      className={`admin-modal-nav-tab ${modalTab === 'diff' ? 'active' : ''}`}
                      onClick={() => setModalTab('diff')}
                    >
                      <SiteIcon name="activity" size={14} /> Metadata Diff &amp; Audit
                      {(selectedItem.status === 'resubmitted' || selectedItem.version > 1) && (
                        <span className="admin-tab-micro-badge warning" style={{ marginLeft: '0.35rem' }}>v{selectedItem.version}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`admin-modal-nav-tab ${modalTab === 'evidence' ? 'active' : ''}`}
                      onClick={() => setModalTab('evidence')}
                    >
                      <SiteIcon name="link" size={14} /> Evidence &amp; Proof
                      {selectedItem.source_url && (
                        <span className="admin-tab-micro-badge" style={{ marginLeft: '0.35rem' }}>TLS</span>
                      )}
                    </button>
                  </div>

                  <div className="admin-drawer-quick-actions">
                    {(selectedItem.status === 'pending_review' || selectedItem.status === 'resubmitted' || selectedItem.status === 'unpublished') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === selectedItem.id}
                        onClick={() => void handleStartReview(selectedItem)}
                      >
                        <SiteIcon name="activity" size={14} /> Start Review
                      </button>
                    )}

                    {selectedItem.status === 'under_review' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => { setActionDialog('approve'); setActionNotes(''); setError('') }}
                      >
                        <SiteIcon name="badge-check" size={14} /> Approve
                      </button>
                    )}

                    {selectedItem.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-publish"
                        onClick={() => void preparePublishDialog(selectedItem)}
                      >
                        <SiteIcon name="arrow-up-right" size={14} /> Publish to Catalogue
                      </button>
                    )}

                    {selectedItem.status !== 'published' && selectedItem.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        onClick={() => { setActionDialog('request_corrections'); setActionMessage(''); setError('') }}
                      >
                        <SiteIcon name="alert-circle" size={14} /> Request Corrections
                      </button>
                    )}

                    {selectedItem.status !== 'published' && selectedItem.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => { setActionDialog('reject'); setActionMessage(''); setError('') }}
                      >
                        <SiteIcon name="close" size={14} /> Reject
                      </button>
                    )}

                    {selectedItem.status === 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => { setActionDialog('unpublish'); setActionMessage(''); setError('') }}
                      >
                        Unpublish
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-drawer-body admin-modal-body">
                  {modalTab === 'preview' ? (
                    <div className="admin-live-public-preview">
                      <div className="admin-preview-banner">
                        <SiteIcon name="search" size={14} />
                        <span>Live Public Preview Mode · Rendering card as seen by athletes on KhelGrid</span>
                      </div>

                      <div className="admin-preview-canvas">
                        <div className={`admin-preview-card type-${selectedItem.listing_type}`}>
                          <div className="admin-preview-card-header">
                            <span className="admin-preview-type-pill">
                              {selectedItem.listing_type === 'opportunity' ? 'TRIAL / OPPORTUNITY' :
                               selectedItem.listing_type === 'venue' ? 'SPORTS VENUE' :
                               selectedItem.listing_type === 'coach' ? 'CERTIFIED COACH' :
                               selectedItem.listing_type === 'academy' ? 'SPORTS ACADEMY' :
                               selectedItem.listing_type === 'event' ? 'TOURNAMENT' : 'PICKUP GAME'}
                            </span>
                            <span className="admin-preview-city-pill">
                              <SiteIcon name="map-pin" size={12} /> {selectedItem.city || 'India'}
                            </span>
                          </div>

                          <h3 className="admin-preview-card-title">{selectedItem.title}</h3>

                          <p className="admin-preview-card-desc">
                            {selectedItem.details ? (
                              selectedItem.details.length > 180 ? `${selectedItem.details.slice(0, 180)}…` : selectedItem.details
                            ) : 'Verified sports listing on KhelGrid Platform.'}
                          </p>

                          {selectedItem.source_url && (
                            <div className="admin-preview-source-line">
                              <SiteIcon name="external-link" size={12} />
                              <span>Official Source: {selectedItem.source_url}</span>
                            </div>
                          )}

                          <div className="admin-preview-card-bottom">
                            <div className="admin-preview-trust-tag">
                              <SiteIcon name="shield-check" size={14} />
                              <span>KhelGrid Verified</span>
                            </div>
                            <button type="button" className="admin-preview-action-btn" tabIndex={-1}>
                              {selectedItem.listing_type === 'venue' ? 'View Venue & Slots ↗' :
                               selectedItem.listing_type === 'coach' ? 'View Coach Profile ↗' :
                               selectedItem.listing_type === 'academy' ? 'Explore Academy ↗' :
                               selectedItem.listing_type === 'event' ? 'Tournament Details ↗' :
                               selectedItem.listing_type === 'pickup_game' ? 'Join Pickup Game ↗' : 'Apply on Official Site ↗'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : modalTab === 'diff' ? (
                    <div className="admin-diff-container">
                      <div className="admin-diff-audit-card">
                        <div className="admin-diff-audit-item">
                          <span className="label">Submission Version</span>
                          <span className="val">v{selectedItem.version}</span>
                        </div>
                        <div className="admin-diff-audit-item">
                          <span className="label">Current Status</span>
                          <span className="val" style={{ textTransform: 'capitalize' }}>{selectedItem.status.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="admin-diff-audit-item">
                          <span className="label">Initial Submitted</span>
                          <span className="val">{new Date(selectedItem.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div className="admin-diff-audit-item">
                          <span className="label">Last Revision</span>
                          <span className="val">{selectedItem.updated_at ? new Date(selectedItem.updated_at).toLocaleDateString('en-IN') : 'Original submission'}</span>
                        </div>
                      </div>

                      {selectedItem.correction_request && (
                        <div className="admin-diff-request-box">
                          <h4>
                            <SiteIcon name="alert-circle" size={14} />
                            Requested Changes from Moderator
                          </h4>
                          <p>{selectedItem.correction_request}</p>
                        </div>
                      )}

                      <div className="admin-diff-grid">
                        <div className="admin-diff-row">
                          <div className="admin-diff-field-header">
                            <span>Title / Listing Header</span>
                            <span>{selectedItem.version > 1 ? 'Revision v' + selectedItem.version : 'Initial Entry'}</span>
                          </div>
                          <div className="admin-diff-values">
                            {selectedItem.version > 1 ? (
                              <>
                                <div className="admin-diff-old">
                                  <span>{selectedItem.title} (Prior revision baseline)</span>
                                </div>
                                <div className="admin-diff-new">
                                  <span>{selectedItem.title}</span>
                                </div>
                              </>
                            ) : (
                              <div className="admin-diff-unchanged">
                                <span>{selectedItem.title}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="admin-diff-row">
                          <div className="admin-diff-field-header">
                            <span>Location &amp; Region</span>
                            <span>Geographic Scope</span>
                          </div>
                          <div className="admin-diff-values">
                            <div className="admin-diff-unchanged">
                              <span>City: <strong>{selectedItem.city || 'India'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="admin-diff-row">
                          <div className="admin-diff-field-header">
                            <span>Official Source &amp; Evidence</span>
                            <span>{selectedItem.source_url ? 'Supplied' : 'Pending'}</span>
                          </div>
                          <div className="admin-diff-values">
                            {selectedItem.source_url ? (
                              <div className="admin-diff-new">
                                <span>{selectedItem.source_url}</span>
                              </div>
                            ) : (
                              <div className="admin-diff-old">
                                <span>No HTTPS verification source provided</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="admin-diff-row">
                          <div className="admin-diff-field-header">
                            <span>Submission Details &amp; Operational Specs</span>
                            <span>Body Content</span>
                          </div>
                          <div className="admin-diff-values">
                            <div className="admin-diff-unchanged" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                              {selectedItem.details || 'No structured details provided.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : modalTab === 'evidence' ? (
                    <div className="admin-evidence-inspector">
                      <div className={`admin-evidence-status-banner ${selectedItem.source_url ? '' : 'missing'}`}>
                        <div className="info">
                          <SiteIcon name={selectedItem.source_url ? 'shield-check' : 'alert-circle'} size={18} />
                          <span>
                            {selectedItem.source_url
                              ? 'HTTPS Verification URL Attached'
                              : 'No Official Verification Link Attached'}
                          </span>
                        </div>
                        {selectedItem.source_url && (
                          <span className="admin-tab-micro-badge">TLS Secured</span>
                        )}
                      </div>

                      {selectedItem.source_url ? (
                        <div className="admin-evidence-card">
                          <h4>External Verification Target</h4>
                          <div className="admin-evidence-url-row">
                            <span>{selectedItem.source_url}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                            <a
                              href={selectedItem.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-btn admin-btn-approve"
                              style={{ textDecoration: 'none' }}
                            >
                              <SiteIcon name="arrow-up-right" size={14} /> Open Official Verification Page ↗
                            </a>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              onClick={e => handleCopy(selectedItem.source_url!, selectedItem.id + '-url', e)}
                            >
                              <SiteIcon name={copiedId === selectedItem.id + '-url' ? 'check' : 'copy'} size={14} />
                              {copiedId === selectedItem.id + '-url' ? 'URL Copied!' : 'Copy Source URL'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="admin-evidence-card">
                          <h4>Verification Required</h4>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                            This listing submission did not include an official federation circular, website URL, or sanctioned flyer.
                            Moderators should request official evidence before catalogue publication.
                          </p>
                          <div>
                            <button
                              type="button"
                              className="admin-btn admin-btn-warning"
                              onClick={() => {
                                setActionDialog('request_corrections')
                                setActionMessage('Please provide an official federation circular or verifiable organizer website link for age verification and schedule confirmation.')
                              }}
                            >
                              <SiteIcon name="alert-circle" size={14} /> Request Federation Evidence via Corrections
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="admin-evidence-checklist">
                        <h5>Moderator Evidence Verification Standards:</h5>
                        <ul>
                          <li>Verify that official letterhead or federation affiliation is clearly visible.</li>
                          <li>Confirm age group eligibility criteria (e.g. U-14, U-17, U-19) match the listing title.</li>
                          <li>Ensure reporting date, ground venue address, and registration fees match federation norms.</li>
                          <li>Flag and reject any suspicious contact information or unverified personal UPI payment requests.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-detail-grid">
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Listing Category</span>
                          <span className="admin-detail-val">{selectedItem.listing_type}</span>
                        </div>
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">City / Location</span>
                          <span className="admin-detail-val">{selectedItem.city || 'India'}</span>
                        </div>
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Version</span>
                          <span className="admin-detail-val">v{selectedItem.version}</span>
                        </div>
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Submitted On</span>
                          <span className="admin-detail-val">
                            {new Date(selectedItem.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="admin-detail-label">Official HTTPS Source</span>
                        <p style={{ margin: '0.25rem 0' }}>
                          {selectedItem.source_url ? (
                            <a href={selectedItem.source_url} target="_blank" rel="noreferrer">
                              {selectedItem.source_url} ↗
                            </a>
                          ) : (
                            <em>No official source URL provided by submitter</em>
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="admin-detail-label">Submitter Information & Context</span>
                        <div className="admin-mod-card-desc">
                          {selectedItem.details || <em>No additional details submitted.</em>}
                        </div>
                        <small style={{ color: '#64748b', display: 'block', marginTop: '0.35rem' }}>
                          Note: Submitter-provided data is unverified community input until checked by KhelGrid staff.
                        </small>
                      </div>
                    </>
                  )}

                  {/* Quick Action Buttons within Inspect Modal */}
                  {!actionDialog && (
                    <div className="admin-modal-quick-actions" style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {selectedItem.status === 'approved' && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-publish"
                          onClick={() => void preparePublishDialog(selectedItem)}
                        >
                          <SiteIcon name="arrow-up-right" size={14} /> Publish to Live Catalogue
                        </button>
                      )}
                      {(selectedItem.status === 'pending_review' || selectedItem.status === 'resubmitted' || selectedItem.status === 'unpublished') && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          disabled={busyId === selectedItem.id}
                          onClick={() => void handleStartReview(selectedItem)}
                        >
                          Start Review
                        </button>
                      )}
                      {selectedItem.status === 'under_review' && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-approve"
                          onClick={() => { setActionDialog('approve'); setActionNotes(''); setError('') }}
                        >
                          <SiteIcon name="badge-check" size={14} /> Approve Submission
                        </button>
                      )}
                      {selectedItem.status !== 'published' && selectedItem.status !== 'rejected' && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-warning"
                          onClick={() => { setActionDialog('request_corrections'); setActionMessage(''); setError('') }}
                        >
                          Request Corrections
                        </button>
                      )}
                      {selectedItem.status !== 'published' && selectedItem.status !== 'rejected' && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          onClick={() => { setActionDialog('reject'); setActionMessage(''); setError('') }}
                        >
                          <SiteIcon name="close" size={14} /> Reject
                        </button>
                      )}
                      {selectedItem.status === 'published' && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          onClick={() => { setActionDialog('unpublish'); setActionMessage(''); setError('') }}
                        >
                          Unpublish
                        </button>
                      )}
                    </div>
                  )}

                  {/* Action Forms within Modal */}
                  {actionDialog === 'approve' && (
                    <div className="admin-dialog-box">
                      <h3>Approve Submission for Catalogue Publication</h3>
                      <p>
                        Approval is an editorial decision only. Evidence verification is a separate step in the protected control panel, and publication is a third explicit action.
                      </p>
                      <div className="admin-preset-chips-wrap">
                        <span className="admin-preset-label">Quick Verification Note Presets:</span>
                        <div className="admin-preset-chips">
                          {MODERATION_APPROVAL_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="admin-preset-chip"
                              onClick={() => setActionNotes(preset.text)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label>
                        Internal moderator notes (optional, private to staff):
                        <textarea
                          rows={3}
                          value={actionNotes}
                          onChange={e => setActionNotes(e.target.value)}
                          placeholder="Evidence checked, sources verified, etc."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-approve"
                          disabled={busyId === selectedItem.id}
                          onClick={() => void handleExecuteAction()}
                        >
                          Confirm Approval
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {actionDialog === 'reject' && (
                    <div className="admin-dialog-box">
                      <h3>Reject Submission</h3>
                      <p>
                        Provide a polite, transparent explanation. This reason will be visible to the submitter on their tracking view.
                      </p>
                      <div className="admin-preset-chips-wrap">
                        <span className="admin-preset-label">Quick Rejection Reason Presets:</span>
                        <div className="admin-preset-chips">
                          {MODERATION_REJECTION_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="admin-preset-chip"
                              onClick={() => setActionMessage(preset.text)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label>
                        Rejection reason for submitter *:
                        <textarea
                          rows={3}
                          required
                          value={actionMessage}
                          onChange={e => setActionMessage(e.target.value)}
                          placeholder="e.g. Incomplete official contact details, duplicate listing, or expired event."
                        />
                      </label>
                      <label>
                        Internal notes (optional, staff only):
                        <textarea
                          rows={2}
                          value={actionNotes}
                          onChange={e => setActionNotes(e.target.value)}
                          placeholder="Staff rationale"
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          disabled={busyId === selectedItem.id || !actionMessage.trim()}
                          onClick={() => void handleExecuteAction()}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {actionDialog === 'request_corrections' && (
                    <div className="admin-dialog-box">
                      <h3>Request Corrections from Submitter</h3>
                      <p>
                        The submitter will see this message on their tracking portal and can edit and resubmit their submission.
                      </p>
                      <div className="admin-preset-chips-wrap">
                        <span className="admin-preset-label">Quick Revision Request Presets:</span>
                        <div className="admin-preset-chips">
                          {MODERATION_CORRECTION_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="admin-preset-chip"
                              onClick={() => setActionMessage(preset.text)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label>
                        Correction message *:
                        <textarea
                          rows={3}
                          required
                          value={actionMessage}
                          onChange={e => setActionMessage(e.target.value)}
                          placeholder="Please provide the exact court surface type and contact WhatsApp number."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-warning"
                          disabled={busyId === selectedItem.id || !actionMessage.trim()}
                          onClick={() => void handleExecuteAction()}
                        >
                          Send Correction Request
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {actionDialog === 'publish' && (
                    <div className="admin-dialog-box">
                      <h3>Publish to Public Catalogue</h3>
                      <p>
                        This will insert a live record into <strong>public.{selectedItem.listing_type === 'opportunity' ? 'opportunities' : selectedItem.listing_type === 'pickup_game' ? 'pickup_games' : selectedItem.listing_type + 's'}</strong> and mark it as published.
                      </p>

                      {/* Editable category publication facts */}
                      {categoryFields[selectedItem.listing_type] && (
                        <div
                          className="admin-publish-facts-box"
                          style={{
                            margin: '1rem 0',
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', color: '#38bdf8' }}>
                            Catalogue Attributes ({selectedItem.listing_type.replace('_', ' ')})
                          </h4>
                          <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                            These details are saved into the public catalogue table. Smart defaults have been pre-filled from the listing title and location.
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                            {categoryFields[selectedItem.listing_type].map(field => (
                              <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                                <span>{field.label} {field.required && <strong style={{ color: '#f87171' }}>*</strong>}</span>
                                <input
                                  type="text"
                                  className="admin-input"
                                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                                  value={publishStructured[field.key] ?? ''}
                                  placeholder={field.placeholder}
                                  onChange={e => setPublishStructured(prev => ({ ...prev, [field.key]: e.target.value }))}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {error && (
                        <div
                          className="admin-dialog-error"
                          role="alert"
                          style={{
                            margin: '0.85rem 0',
                            padding: '0.85rem',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.45)',
                            borderRadius: '8px',
                            color: '#fca5a5',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                            <SiteIcon name="alert-triangle" size={16} />
                            <strong style={{ fontSize: '0.9rem' }}>Publication Blocked by Quality Gate</strong>
                          </div>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', lineHeight: '1.4' }}>{error}</p>
                          <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(239, 68, 68, 0.25)' }}>
                            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>
                              Under KhelGrid Phase 3.1 policy, approved submissions must be <strong>Evidence-Verified</strong> and have complete catalogue attributes (Sport, Venue, Host, Schedule/Address) before PostgreSQL allows live catalogue publication.
                            </p>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', background: 'rgba(255, 255, 255, 0.08)' }}
                              onClick={() => {
                                setSelectedItem(null)
                                setActionDialog(null)
                                setError('')
                                window.dispatchEvent(new CustomEvent('khelgrid-admin-switch-workspace', { detail: { workspace: 'command' } }))
                              }}
                            >
                              Switch to Command Centre to verify evidence &amp; set publication facts →
                            </button>
                          </div>
                        </div>
                      )}

                      <label>
                        Custom URL slug (optional, auto-generated if left blank):
                        <input
                          type="text"
                          value={targetSlug}
                          onChange={e => setTargetSlug(e.target.value)}
                          placeholder="e.g. kanteerava-stadium-bengaluru"
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-publish"
                          disabled={busyId === selectedItem.id}
                          onClick={() => void handleExecuteAction()}
                        >
                          Confirm Live Publication
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => { setActionDialog(null); setError('') }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {actionDialog === 'unpublish' && (
                    <div className="admin-dialog-box">
                      <h3>Unpublish Catalogue Listing</h3>
                      <p>
                        This will immediately set the catalogue record status to draft, removing it from all public catalogue queries while preserving history.
                      </p>
                      <label>
                        Reason for unpublication *:
                        <textarea
                          rows={3}
                          required
                          value={actionMessage}
                          onChange={e => setActionMessage(e.target.value)}
                          placeholder="e.g. Venue permanently closed or misleading pricing report."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          disabled={busyId === selectedItem.id || !actionMessage.trim()}
                          onClick={() => void handleExecuteAction()}
                        >
                          Confirm Unpublish
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audit Trail Timeline */}
                  <div>
                    <span className="admin-detail-label">Moderation Audit History</span>
                    {loadingDetails ? (
                      <p>Loading audit trail…</p>
                    ) : auditTrail.length === 0 ? (
                      <p style={{ color: '#64748b' }}>No audit history recorded yet.</p>
                    ) : (
                      <div className="admin-audit-timeline">
                        {auditTrail.map(audit => (
                          <div key={audit.id} className="admin-audit-entry">
                            <div className="admin-audit-header">
                              <span>Action: {audit.action}</span>
                              {audit.from_status && audit.to_status && (
                                <span style={{ fontWeight: 400, color: '#64748b' }}>
                                  ({audit.from_status} → {audit.to_status})
                                </span>
                              )}
                              <span className="admin-audit-time">
                                {new Date(audit.created_at).toLocaleString('en-IN')}
                              </span>
                            </div>
                            {audit.notes && <div className="admin-audit-notes">{audit.notes}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resubmission History */}
                  {versionHistory.length > 0 && (
                    <div>
                      <span className="admin-detail-label">Previous Submitted Versions ({versionHistory.length})</span>
                      <div className="admin-items-list" style={{ marginTop: '0.5rem' }}>
                        {versionHistory.map(v => (
                          <div key={v.id} className="admin-mod-card" style={{ padding: '0.75rem' }}>
                            <div className="admin-mod-card-top">
                              <strong>v{v.version}: {v.title}</strong>
                              <span className="admin-audit-time">
                                {new Date(v.created_at).toLocaleString('en-IN')}
                              </span>
                            </div>
                            {v.details && <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>{v.details}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================= */}
      {/* KhelChronicle Manuscripts Desk                                 */}
      {/* ============================================================= */}
      {activeDesk === 'chronicle' && (
        <>
          {/* Chronicle Summary KPI Cards */}
          <div className="admin-metrics-grid">
            <div className="admin-metric-card highlight">
              <span className="admin-metric-val">{chronicleQueue?.stats.pendingCount ?? 0}</span>
              <span className="admin-metric-lbl">Pending Screening</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-val">{chronicleQueue?.stats.underReviewCount ?? 0}</span>
              <span className="admin-metric-lbl">Under Review</span>
            </div>
            <div className="admin-metric-card urgent">
              <span className="admin-metric-val">{chronicleQueue?.stats.changesRequestedCount ?? 0}</span>
              <span className="admin-metric-lbl">Revisions Requested</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-val">{chronicleQueue?.stats.approvedCount ?? 0}</span>
              <span className="admin-metric-lbl">Approved (Preprints)</span>
            </div>
            <div className="admin-metric-card success">
              <span className="admin-metric-val">{chronicleQueue?.stats.publishedCount ?? 0}</span>
              <span className="admin-metric-lbl">Published Archive</span>
            </div>
          </div>

          {/* Chronicle Status Tabs Navigation */}
          <nav className="admin-tabs-nav" aria-label="Manuscript status filter">
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'pending_review' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('pending_review'); setChroniclePage(1) }}
            >
              Pending Screening <span className="admin-tab-badge">{chronicleQueue?.stats.pendingCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'under_review' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('under_review'); setChroniclePage(1) }}
            >
              Under Review <span className="admin-tab-badge">{chronicleQueue?.stats.underReviewCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'changes_requested' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('changes_requested'); setChroniclePage(1) }}
            >
              Revisions Requested <span className="admin-tab-badge">{chronicleQueue?.stats.changesRequestedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'approved' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('approved'); setChroniclePage(1) }}
            >
              Approved <span className="admin-tab-badge">{chronicleQueue?.stats.approvedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'published' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('published'); setChroniclePage(1) }}
            >
              Published <span className="admin-tab-badge">{chronicleQueue?.stats.publishedCount ?? 0}</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'rejected' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('rejected'); setChroniclePage(1) }}
            >
              Rejected
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${chronicleActiveTab === 'all' ? 'active' : ''}`}
              onClick={() => { setChronicleActiveTab('all'); setChroniclePage(1) }}
            >
              All Manuscripts <span className="admin-tab-badge">{chronicleQueue?.submissions.length ?? 0}</span>
            </button>
          </nav>

          {/* Chronicle Search & Filters Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-search-box">
              <SiteIcon name="search" size={16} />
              <input
                type="search"
                className="admin-search-input"
                placeholder="Search manuscripts by title, author, affiliation, or ID (KG-SUB-…)"
                value={chronicleSearchTerm}
                onChange={e => { setChronicleSearchTerm(e.target.value); setChroniclePage(1) }}
              />
            </div>
            <div className="admin-filter-group">
              <label>
                Discipline:
                <select
                  className="admin-select"
                  value={chronicleCategoryFilter}
                  onChange={e => { setChronicleCategoryFilter(e.target.value); setChroniclePage(1) }}
                >
                  <option value="all">All Disciplines</option>
                  {RESEARCH_CATEGORIES.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </label>

              {/* Phase 2: Manuscripts Density Switcher & Shortcuts Modal Trigger */}
              <div className="admin-density-switcher" role="group" aria-label="Manuscripts view density">
                <button
                  type="button"
                  className={`admin-density-btn ${tableDensity === 'compact' ? 'active' : ''}`}
                  onClick={() => handleDensityChange('compact')}
                  title="Compact density (Key: 1)"
                >
                  Compact
                </button>
                <button
                  type="button"
                  className={`admin-density-btn ${tableDensity === 'cozy' ? 'active' : ''}`}
                  onClick={() => handleDensityChange('cozy')}
                  title="Cozy density (Key: 2)"
                >
                  Cozy
                </button>
                <button
                  type="button"
                  className={`admin-density-btn ${tableDensity === 'expanded' ? 'active' : ''}`}
                  onClick={() => handleDensityChange('expanded')}
                  title="Expanded density (Key: 3)"
                >
                  Expanded
                </button>
              </div>

              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-shortcuts-trigger"
                onClick={() => setShowShortcutsModal(true)}
                title="View Keyboard Shortcuts (?)"
              >
                <span>Shortcuts</span>
                <kbd>?</kbd>
              </button>

              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadChronicleQueue()}>
                Refresh Manuscripts
              </button>
            </div>
          </div>

          {/* Manuscripts List */}
          {paginatedChronicleItems.length === 0 ? (
            chronicleItems.length === 0 ? (
              <div className="admin-empty-celebration">
                <div className="admin-empty-icon">📜</div>
                <h3>All caught up! Zero pending manuscripts</h3>
                <p>Every submitted sports science paper, trial protocol, and research manuscript has been screened. New preprints will appear here in real time.</p>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void loadChronicleQueue()}>
                  <SiteIcon name="refresh" size={14} /> Refresh Manuscripts
                </button>
              </div>
            ) : (
              <div className="admin-empty-celebration filters">
                <SiteIcon name="search" size={28} />
                <h3>No manuscripts match your active filters</h3>
                <p>Found 0 matching manuscripts out of {chronicleItems.length} total manuscripts in this desk.</p>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => { setChronicleSearchTerm(''); setChronicleCategoryFilter('all'); setChronicleActiveTab('all'); setChroniclePage(1) }}
                >
                  Clear Search &amp; Filters
                </button>
              </div>
            )
          ) : (
            <div className={`admin-items-list density-${tableDensity}`}>
              {paginatedChronicleItems.map((sub, idx) => (
                <article
                  key={sub.id}
                  className={`admin-mod-card chronicle ${selectedManuscript?.id === sub.id ? 'is-active-inspected' : ''} ${focusedChronicleIndex === idx ? 'is-keyboard-focused' : ''}`}
                  onClick={() => {
                    setSelectedManuscript(sub)
                    setManuscriptActionDialog(null)
                    setError('')
                  }}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setSelectedManuscript(sub)
                      setManuscriptActionDialog(null)
                      setError('')
                    }
                  }}
                  title="Click to inspect manuscript in Right-Side Drawer (or press Enter / O)"
                >
                  {/* Phase 1: Floating Quick Action Hover Bar */}
                  <div className="admin-card-hover-actions" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="admin-hover-action-btn"
                      title="Inspect Manuscript (Open Drawer)"
                      onClick={() => {
                        setSelectedManuscript(sub)
                        setManuscriptActionDialog(null)
                        setError('')
                      }}
                    >
                      <SiteIcon name="search" size={13} />
                      <span>Inspect</span>
                    </button>
                    {(sub.status === 'pending_review' || sub.status === 'under_review') && (
                      <button
                        type="button"
                        className="admin-hover-action-btn primary"
                        title="Start Screening"
                        disabled={busyId === sub.id}
                        onClick={() => void handleStartChronicleReview(sub)}
                      >
                        <SiteIcon name="activity" size={13} />
                        <span>Screen</span>
                      </button>
                    )}
                    {sub.status !== 'approved' && sub.status !== 'published' && (
                      <button
                        type="button"
                        className="admin-hover-action-btn success"
                        title="Approve Manuscript"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('approve')
                          setManuscriptActionNotes('')
                        }}
                      >
                        <SiteIcon name="badge-check" size={13} />
                        <span>Approve</span>
                      </button>
                    )}
                    {sub.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-hover-action-btn publish"
                        title="Publish to Archive"
                        disabled={busyId === sub.id}
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('publish')
                          setManuscriptTargetSlug('')
                          setManuscriptTargetPaperId('')
                          setError('')
                        }}
                      >
                        <SiteIcon name="arrow-up-right" size={13} />
                        <span>Publish</span>
                      </button>
                    )}
                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-hover-action-btn warning"
                        title="Request Revisions"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('corrections')
                          setManuscriptActionMessage('')
                        }}
                      >
                        <SiteIcon name="alert-circle" size={13} />
                      </button>
                    )}
                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-hover-action-btn danger"
                        title="Reject Manuscript"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('reject')
                          setManuscriptActionMessage('')
                        }}
                      >
                        <SiteIcon name="close" size={13} />
                      </button>
                    )}
                    {sub.fullTextOrUrl && (
                      <a
                        href={sub.fullTextOrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-hover-action-btn link"
                        title="View Full Manuscript / Preprint ↗"
                      >
                        <SiteIcon name="arrow-up-right" size={13} />
                      </a>
                    )}
                  </div>
                  <div className="admin-mod-card-top">
                    <div className="admin-mod-card-title-group">
                      <button
                        type="button"
                        className={`admin-ref-code-btn ${copiedId === sub.id ? 'is-copied' : ''}`}
                        onClick={e => handleCopy(sub.submissionId, sub.id, e)}
                        title={`Click to copy: ${sub.submissionId}`}
                      >
                        <span>{sub.submissionId}</span>
                        <span className="admin-copy-icon">
                          <SiteIcon name={copiedId === sub.id ? 'check' : 'copy'} size={11} />
                        </span>
                        {copiedId === sub.id && <span className="admin-copy-tooltip">Copied!</span>}
                      </button>
                      <span className="admin-type-pill chronicle-discipline">{sub.categoryName || sub.category}</span>
                      <h3 className="admin-item-title">{sub.title}</h3>
                    </div>
                    <span className={`admin-status-badge ${sub.status}`}>
                      {sub.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="admin-mod-card-meta">
                    <span>
                      <SiteIcon name="user" size={14} /> {sub.authorName}
                    </span>
                    <span>
                      <SiteIcon name="map-pin" size={14} /> {sub.affiliation}
                    </span>
                    <span>
                      <SiteIcon name="calendar-check" size={14} /> Submitted {new Date(sub.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    {sub.orcid && (
                      <span className="admin-ethics-badge orcid">
                        ORCID: {sub.orcid}
                      </span>
                    )}
                  </div>

                  {/* Ethics & Compliance Verification Badges */}
                  <div className="admin-ethics-row">
                    {sub.humanEthicsConfirmed && (
                      <span className="admin-ethics-badge ok">
                        <SiteIcon name="shield-check" size={12} /> IRB Human Ethics Certified
                      </span>
                    )}
                    {sub.minorConsentConfirmed && (
                      <span className="admin-ethics-badge ok">
                        <SiteIcon name="check-circle" size={12} /> Minor Consent Verified
                      </span>
                    )}
                    <span className="admin-ethics-badge license">
                      <SiteIcon name="award" size={12} /> Diamond Open Access (No APC)
                    </span>
                  </div>

                  <p className="admin-mod-card-desc">{sub.abstract}</p>

                  {sub.correctionRequest && (
                    <div className="state-panel state-unavailable" style={{ margin: '0.25rem 0' }}>
                      <strong>Active Author Revision Request:</strong> {sub.correctionRequest}
                    </div>
                  )}

                  {sub.rejectionReason && (
                    <div className="state-panel state-unavailable" style={{ margin: '0.25rem 0' }}>
                      <strong>Rejection Reason:</strong> {sub.rejectionReason}
                    </div>
                  )}

                  <div className="admin-mod-card-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        setSelectedManuscript(sub)
                        setManuscriptActionDialog(null)
                        setManuscriptActionMessage('')
                        setManuscriptActionNotes('')
                        setManuscriptTargetSlug('')
                        setManuscriptTargetPaperId('')
                      }}
                    >
                      <SiteIcon name="search" size={14} /> Inspect Manuscript
                    </button>

                    {(sub.status === 'pending_review' || sub.status === 'under_review') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === sub.id}
                        onClick={() => void handleStartChronicleReview(sub)}
                      >
                        {sub.status === 'under_review' ? 'Screening in Progress' : 'Start Screening'}
                      </button>
                    )}

                    {sub.status !== 'approved' && sub.status !== 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('approve')
                          setManuscriptActionNotes('')
                        }}
                      >
                        <SiteIcon name="badge-check" size={14} /> Approve Manuscript
                      </button>
                    )}

                    {sub.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-publish"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('publish')
                          setManuscriptTargetSlug('')
                          setManuscriptTargetPaperId('')
                        }}
                      >
                        <SiteIcon name="arrow-up-right" size={14} /> Publish to Archive
                      </button>
                    )}

                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('corrections')
                          setManuscriptActionMessage('')
                        }}
                      >
                        Request Revisions
                      </button>
                    )}

                    {sub.status !== 'published' && sub.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => {
                          setSelectedManuscript(sub)
                          setManuscriptActionDialog('reject')
                          setManuscriptActionMessage('')
                        }}
                      >
                        <SiteIcon name="close" size={14} /> Reject
                      </button>
                    )}

                    {sub.status === 'published' && (
                      <a
                        href={`/khelchronicle/${sub.publishedSlug || sub.category}`}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-btn admin-btn-secondary"
                      >
                        View Live Preprint ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination for Manuscripts */}
          {totalChroniclePages > 1 && (
            <div className="admin-pagination">
              <span>
                Showing {Math.min((chroniclePage - 1) * chroniclePageSize + 1, filteredChronicleItems.length)} -{' '}
                {Math.min(chroniclePage * chroniclePageSize, filteredChronicleItems.length)} of {filteredChronicleItems.length}
              </span>
              <div className="admin-mod-card-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={chroniclePage <= 1}
                  onClick={() => setChroniclePage(p => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {chroniclePage} of {totalChroniclePages}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={chroniclePage >= totalChroniclePages}
                  onClick={() => setChroniclePage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Manuscript Detail & Action Modal */}
          {selectedManuscript && (
            <div
              className="admin-drawer-backdrop admin-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-ms-title"
              onClick={() => { setSelectedManuscript(null); setManuscriptActionDialog(null) }}
            >
              <div
                className="admin-inspection-drawer admin-modal-card"
                onClick={e => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="admin-drawer-header">
                  <div className="admin-drawer-header-top">
                    <div>
                      <div className="admin-drawer-badge-row">
                        <button
                          type="button"
                          className={`admin-ref-code-btn ${copiedId === selectedManuscript.id ? 'is-copied' : ''}`}
                          onClick={e => handleCopy(selectedManuscript.submissionId, selectedManuscript.id, e)}
                          title={`Click to copy: ${selectedManuscript.submissionId}`}
                        >
                          <span>{selectedManuscript.submissionId}</span>
                          <span className="admin-copy-icon">
                            <SiteIcon name={copiedId === selectedManuscript.id ? 'check' : 'copy'} size={11} />
                          </span>
                          {copiedId === selectedManuscript.id && <span className="admin-copy-tooltip">Copied!</span>}
                        </button>
                        <span className="admin-type-pill report">Peer Review</span>
                        <span className={`admin-status-badge ${selectedManuscript.status}`}>
                          {selectedManuscript.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h2 id="modal-ms-title" className="admin-drawer-title">{selectedManuscript.title}</h2>
                    </div>
                    <button
                      type="button"
                      className="admin-drawer-close-btn"
                      onClick={() => { setSelectedManuscript(null); setManuscriptActionDialog(null) }}
                      title="Close manuscript drawer (Esc)"
                    >
                      <SiteIcon name="close" size={15} />
                      <span>Close</span>
                      <kbd>Esc</kbd>
                    </button>
                  </div>
                </div>

                {/* Sticky Action Strip */}
                <div className="admin-drawer-sticky-strip">
                  <div className="admin-modal-nav-tabs" style={{ margin: 0 }}>
                    <button
                      type="button"
                      className={`admin-modal-nav-tab ${chronicleModalTab === 'data' ? 'active' : ''}`}
                      onClick={() => setChronicleModalTab('data')}
                    >
                      <SiteIcon name="file-text" size={14} /> Submission Data
                    </button>
                    <button
                      type="button"
                      className={`admin-modal-nav-tab ${chronicleModalTab === 'abstract' ? 'active' : ''}`}
                      onClick={() => setChronicleModalTab('abstract')}
                    >
                      <SiteIcon name="book-open" size={14} /> Structured Abstract
                    </button>
                    <button
                      type="button"
                      className={`admin-modal-nav-tab ${chronicleModalTab === 'evidence' ? 'active' : ''}`}
                      onClick={() => setChronicleModalTab('evidence')}
                    >
                      <SiteIcon name="link" size={14} /> Preprint &amp; Ethics
                      {selectedManuscript.fullTextOrUrl && (
                        <span className="admin-tab-micro-badge" style={{ marginLeft: '0.35rem' }}>Deposit</span>
                      )}
                    </button>
                  </div>

                  <div className="admin-drawer-quick-actions">
                    {(selectedManuscript.status === 'pending_review' || selectedManuscript.status === 'under_review') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === selectedManuscript.id}
                        onClick={() => void handleStartChronicleReview(selectedManuscript)}
                      >
                        <SiteIcon name="activity" size={14} />
                        {selectedManuscript.status === 'under_review' ? 'Screening in Progress' : 'Start Screening'}
                      </button>
                    )}

                    {selectedManuscript.status !== 'approved' && selectedManuscript.status !== 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => {
                          setManuscriptActionDialog('approve')
                          setManuscriptActionNotes('')
                          setError('')
                        }}
                      >
                        <SiteIcon name="badge-check" size={14} /> Approve Manuscript
                      </button>
                    )}

                    {selectedManuscript.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-publish"
                        disabled={busyId === selectedManuscript.id}
                        onClick={() => {
                          setManuscriptActionDialog('publish')
                          setManuscriptTargetSlug('')
                          setManuscriptTargetPaperId('')
                          setError('')
                        }}
                      >
                        <SiteIcon name="arrow-up-right" size={14} /> Publish to Archive
                      </button>
                    )}

                    {selectedManuscript.status !== 'published' && selectedManuscript.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        onClick={() => {
                          setManuscriptActionDialog('corrections')
                          setManuscriptActionMessage('')
                          setError('')
                        }}
                      >
                        <SiteIcon name="alert-circle" size={14} /> Request Revisions
                      </button>
                    )}

                    {selectedManuscript.status !== 'published' && selectedManuscript.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => {
                          setManuscriptActionDialog('reject')
                          setManuscriptActionMessage('')
                          setError('')
                        }}
                      >
                        <SiteIcon name="close" size={14} /> Reject
                      </button>
                    )}
                  </div>
                </div>

                <div className="admin-drawer-body admin-modal-body">
                  {chronicleModalTab === 'abstract' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="admin-preview-banner">
                        <SiteIcon name="book-open" size={14} />
                        <span>Peer-Review Abstract · Scientific summary for screening &amp; indexation</span>
                      </div>
                      <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', lineHeight: 1.7, fontSize: '0.92rem', color: '#1e293b' }}>
                        {selectedManuscript.abstract}
                      </div>
                      <div style={{ display: 'flex', gap: '0.65rem' }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={e => handleCopy(selectedManuscript.abstract, selectedManuscript.id + '-abs', e)}
                        >
                          <SiteIcon name={copiedId === selectedManuscript.id + '-abs' ? 'check' : 'copy'} size={14} />
                          {copiedId === selectedManuscript.id + '-abs' ? 'Abstract Copied!' : 'Copy Full Abstract'}
                        </button>
                      </div>
                    </div>
                  ) : chronicleModalTab === 'evidence' ? (
                    <div className="admin-evidence-inspector">
                      <div className={`admin-evidence-status-banner ${selectedManuscript.fullTextOrUrl ? '' : 'missing'}`}>
                        <div className="info">
                          <SiteIcon name={selectedManuscript.fullTextOrUrl ? 'shield-check' : 'alert-circle'} size={18} />
                          <span>
                            {selectedManuscript.fullTextOrUrl
                              ? 'Preprint / Manuscript Deposit Attached'
                              : 'No Deposit URL Provided'}
                          </span>
                        </div>
                        {selectedManuscript.fullTextOrUrl && (
                          <span className="admin-tab-micro-badge">DOI / URL</span>
                        )}
                      </div>

                      {selectedManuscript.fullTextOrUrl ? (
                        <div className="admin-evidence-card">
                          <h4>Preprint &amp; Open-Access Deposit</h4>
                          <div className="admin-evidence-url-row">
                            <span>{selectedManuscript.fullTextOrUrl}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                            <a
                              href={selectedManuscript.fullTextOrUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-btn admin-btn-approve"
                              style={{ textDecoration: 'none' }}
                            >
                              <SiteIcon name="arrow-up-right" size={14} /> Open Manuscript Deposit ↗
                            </a>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              onClick={e => handleCopy(selectedManuscript.fullTextOrUrl!, selectedManuscript.id + '-url', e)}
                            >
                              <SiteIcon name={copiedId === selectedManuscript.id + '-url' ? 'check' : 'copy'} size={14} />
                              {copiedId === selectedManuscript.id + '-url' ? 'URL Copied!' : 'Copy Deposit URL'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="admin-evidence-card">
                          <h4>Deposit Link Required</h4>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                            The author has not provided a direct preprint URL or open deposit link.
                          </p>
                        </div>
                      )}

                      {/* Ethics Clearances */}
                      <div className="admin-evidence-card">
                        <h4>Ethics &amp; Legal Compliance Standards</h4>
                        <div className="admin-ethics-row" style={{ marginTop: '0.35rem' }}>
                          <span className={`admin-ethics-badge ${selectedManuscript.humanEthicsConfirmed ? 'ok' : ''}`}>
                            <SiteIcon name={selectedManuscript.humanEthicsConfirmed ? 'check-circle' : 'alert-circle'} size={13} />
                            Human Subjects IRB Ethics: {selectedManuscript.humanEthicsConfirmed ? 'Confirmed' : 'Unconfirmed'}
                          </span>
                          <span className={`admin-ethics-badge ${selectedManuscript.minorConsentConfirmed ? 'ok' : ''}`}>
                            <SiteIcon name={selectedManuscript.minorConsentConfirmed ? 'check-circle' : 'alert-circle'} size={13} />
                            Minor Athletes Assent / Guardian Consent: {selectedManuscript.minorConsentConfirmed ? 'Confirmed' : 'Unconfirmed'}
                          </span>
                          <span className="admin-ethics-badge license">
                            License: {selectedManuscript.licenseType || 'CC BY-NC-ND 4.0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-detail-grid">
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Primary Author</span>
                          <span className="admin-detail-val">{selectedManuscript.authorName}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedManuscript.authorEmail}</span>
                        </div>
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Institution / Affiliation</span>
                          <span className="admin-detail-val">{selectedManuscript.affiliation}</span>
                        </div>
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">Discipline</span>
                          <span className="admin-detail-val">{selectedManuscript.categoryName || selectedManuscript.category}</span>
                        </div>
                        <div className="admin-detail-item">
                          <span className="admin-detail-label">ORCID</span>
                          <span className="admin-detail-val">{selectedManuscript.orcid || 'Not provided'}</span>
                        </div>
                        {selectedManuscript.coAuthors && (
                          <div className="admin-detail-item" style={{ gridColumn: '1 / -1' }}>
                            <span className="admin-detail-label">Co-Authors</span>
                            <span className="admin-detail-val">{selectedManuscript.coAuthors}</span>
                          </div>
                        )}
                        {selectedManuscript.fullTextOrUrl && (
                          <div className="admin-detail-item" style={{ gridColumn: '1 / -1' }}>
                            <span className="admin-detail-label">Manuscript Link / Deposit</span>
                            <a href={selectedManuscript.fullTextOrUrl} target="_blank" rel="noreferrer" className="admin-detail-val" style={{ color: '#0284c7' }}>
                              {selectedManuscript.fullTextOrUrl} ↗
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Abstract */}
                      <div>
                        <span className="admin-detail-label">Structured Abstract</span>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.35rem', lineHeight: 1.6 }}>
                          {selectedManuscript.abstract}
                        </div>
                      </div>

                      {/* Ethics Clearances */}
                      <div>
                        <span className="admin-detail-label">Ethics & Legal Compliance</span>
                        <div className="admin-ethics-row" style={{ marginTop: '0.5rem' }}>
                          <span className={`admin-ethics-badge ${selectedManuscript.humanEthicsConfirmed ? 'ok' : ''}`}>
                            <SiteIcon name={selectedManuscript.humanEthicsConfirmed ? 'check-circle' : 'alert-circle'} size={13} />
                            Human Subjects IRB Ethics: {selectedManuscript.humanEthicsConfirmed ? 'Confirmed' : 'Unconfirmed'}
                          </span>
                          <span className={`admin-ethics-badge ${selectedManuscript.minorConsentConfirmed ? 'ok' : ''}`}>
                            <SiteIcon name={selectedManuscript.minorConsentConfirmed ? 'check-circle' : 'alert-circle'} size={13} />
                            Minor Athletes Assent / Guardian Consent: {selectedManuscript.minorConsentConfirmed ? 'Confirmed' : 'Unconfirmed'}
                          </span>
                          <span className="admin-ethics-badge license">
                            License: {selectedManuscript.licenseType || 'CC BY-NC-ND 4.0'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action Dialog: Request Revisions */}
                  {manuscriptActionDialog === 'corrections' && (
                    <div className="admin-dialog-box">
                      <h3>Request Manuscript Revisions</h3>
                      <p>Send constructive peer-screening feedback to {selectedManuscript.authorName} ({selectedManuscript.authorEmail}).</p>
                      <div className="admin-preset-chips-wrap">
                        <span className="admin-preset-label">Quick Revision Presets:</span>
                        <div className="admin-preset-chips">
                          {CHRONICLE_CORRECTION_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="admin-preset-chip"
                              onClick={() => setManuscriptActionMessage(preset.text)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label>
                        Editorial Revision Feedback * (minimum 10 characters):
                        <textarea
                          rows={4}
                          value={manuscriptActionMessage}
                          onChange={e => setManuscriptActionMessage(e.target.value)}
                          placeholder="e.g. Please clarify your calibration protocol, provide the institutional ethics approval number, and check the sample standard deviations in Table 2."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-warning"
                          disabled={busyId === selectedManuscript.id || manuscriptActionMessage.trim().length < 10}
                          onClick={() => void handleExecuteChronicleAction()}
                        >
                          Send Revision Request
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setManuscriptActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Dialog: Approve */}
                  {manuscriptActionDialog === 'approve' && (
                    <div className="admin-dialog-box">
                      <h3>Approve Manuscript for KhelChronicle Archive</h3>
                      <p>This certifies that the manuscript meets ethical and scientific criteria for preprint publication.</p>
                      <label>
                        Internal Editorial Notes (optional):
                        <textarea
                          rows={2}
                          value={manuscriptActionNotes}
                          onChange={e => setManuscriptActionNotes(e.target.value)}
                          placeholder="e.g. Rigorous methodology. Approved by editorial board."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-approve"
                          disabled={busyId === selectedManuscript.id}
                          onClick={() => void handleExecuteChronicleAction()}
                        >
                          Confirm Manuscript Approval
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setManuscriptActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Dialog: Publish */}
                  {manuscriptActionDialog === 'publish' && (
                    <div className="admin-dialog-box">
                      <h3>Publish to KhelChronicle Live Archive</h3>
                      <p>This will assign an official paper ID and make the preprint accessible to coaches and researchers.</p>

                      {error && (
                        <div
                          className="admin-dialog-error"
                          role="alert"
                          style={{
                            margin: '0.85rem 0',
                            padding: '0.85rem',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.45)',
                            borderRadius: '8px',
                            color: '#fca5a5',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                            <SiteIcon name="alert-triangle" size={16} />
                            <strong style={{ fontSize: '0.9rem' }}>Publication Blocked</strong>
                          </div>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', lineHeight: '1.4' }}>{error}</p>
                        </div>
                      )}

                      <label>
                        Target Paper ID (optional, default auto-assigned):
                        <input
                          type="text"
                          value={manuscriptTargetPaperId}
                          onChange={e => setManuscriptTargetPaperId(e.target.value)}
                          placeholder="e.g. KG-2026-006"
                        />
                      </label>
                      <label>
                        Custom URL slug (optional):
                        <input
                          type="text"
                          value={manuscriptTargetSlug}
                          onChange={e => setManuscriptTargetSlug(e.target.value)}
                          placeholder="e.g. high-altitude-hypoxic-training-adaptation"
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-publish"
                          disabled={busyId === selectedManuscript.id}
                          onClick={() => void handleExecuteChronicleAction()}
                        >
                          Confirm Live Publication
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setManuscriptActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Dialog: Reject */}
                  {manuscriptActionDialog === 'reject' && (
                    <div className="admin-dialog-box">
                      <h3>Reject Manuscript</h3>
                      <p>Provide a clear scientific reason for rejecting this manuscript.</p>
                      <div className="admin-preset-chips-wrap">
                        <span className="admin-preset-label">Quick Rejection Presets:</span>
                        <div className="admin-preset-chips">
                          {CHRONICLE_REJECTION_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="admin-preset-chip"
                              onClick={() => setManuscriptActionMessage(preset.text)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label>
                        Rejection Reason * (sent to author):
                        <textarea
                          rows={3}
                          value={manuscriptActionMessage}
                          onChange={e => setManuscriptActionMessage(e.target.value)}
                          placeholder="e.g. Inadequate ethics clearance or methodology outside sports science scope."
                        />
                      </label>
                      <div className="admin-mod-card-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          disabled={busyId === selectedManuscript.id || !manuscriptActionMessage.trim()}
                          onClick={() => void handleExecuteChronicleAction()}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setManuscriptActionDialog(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bottom action controls */}
                  <div className="admin-mod-card-actions" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    {(selectedManuscript.status === 'pending_review' || selectedManuscript.status === 'under_review') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={busyId === selectedManuscript.id}
                        onClick={() => void handleStartChronicleReview(selectedManuscript)}
                      >
                        {selectedManuscript.status === 'under_review' ? 'Screening in Progress' : 'Start Screening'}
                      </button>
                    )}
                    {selectedManuscript.status !== 'approved' && selectedManuscript.status !== 'published' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-approve"
                        onClick={() => setManuscriptActionDialog('approve')}
                      >
                        Approve Manuscript
                      </button>
                    )}
                    {selectedManuscript.status === 'approved' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-publish"
                        onClick={() => setManuscriptActionDialog('publish')}
                      >
                        Publish to Archive
                      </button>
                    )}
                    {selectedManuscript.status !== 'published' && selectedManuscript.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-warning"
                        onClick={() => setManuscriptActionDialog('corrections')}
                      >
                        Request Revisions
                      </button>
                    )}
                    {selectedManuscript.status !== 'published' && selectedManuscript.status !== 'rejected' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-reject"
                        onClick={() => setManuscriptActionDialog('reject')}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  ) : (
      authMode === 'forgot_password' ? (
        <form className="admin-restricted-box" onSubmit={handleRequestPasswordReset}>
          <SiteIcon name="shield-check" size={36} />
          <h2>Reset Moderator Password</h2>
          <p>
            Enter your authorized moderator email address. We will send a secure password reset link directly to your inbox.
          </p>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: '1.25rem' }}>
            Moderator Email
            <input
              type="email"
              autoComplete="username"
              required
              className="admin-search-input"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="operator@example.com"
            />
          </label>
          <button type="submit" className="admin-btn admin-btn-approve" style={{ width: '100%', justifyContent: 'center' }} disabled={signingIn}>
            {signingIn ? 'Sending link…' : 'Send password reset link'}
          </button>
          <div style={{ marginTop: '0.85rem', textAlign: 'center' }}>
            <button
              type="button"
              className="admin-text-link"
              onClick={() => {
                setAuthMode('login')
                setError('')
                setNotice('')
              }}
            >
              ← Back to moderator sign-in
            </button>
          </div>
        </form>
      ) : authMode === 'set_new_password' ? (
        <form className="admin-restricted-box" onSubmit={handleSaveNewPassword}>
          <SiteIcon name="shield-check" size={36} />
          <h2>Set New Moderator Password</h2>
          <p>
            Create a secure new password for your moderator account (minimum 6 characters).
          </p>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.75rem' }}>
            New Password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="admin-search-input"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: '1.25rem' }}>
            Confirm New Password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="admin-search-input"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="Re-type new password"
            />
          </label>
          <button type="submit" className="admin-btn admin-btn-approve" style={{ width: '100%', justifyContent: 'center' }} disabled={signingIn}>
            {signingIn ? 'Saving…' : 'Save new password'}
          </button>
          <div style={{ marginTop: '0.85rem', textAlign: 'center' }}>
            <button
              type="button"
              className="admin-text-link"
              onClick={() => {
                setAuthMode('login')
                setError('')
                setNotice('')
              }}
            >
              ← Back to moderator sign-in
            </button>
          </div>
        </form>
      ) : (
        <form className="admin-restricted-box" onSubmit={handleSignIn}>
          <SiteIcon name="shield-check" size={36} />
          <h2>Moderator Sign-In</h2>
          <p>
            Only accounts allowlisted in the development database can open this queue; public registration does not grant moderator access.
          </p>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: '0.75rem' }}>
            Moderator Email
            <input
              type="email"
              autoComplete="username"
              required
              className="admin-search-input"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </label>
          <label style={{ display: 'block', textAlign: 'left', marginBottom: '1.25rem' }}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              className="admin-search-input"
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" className="admin-btn admin-btn-approve" style={{ width: '100%', justifyContent: 'center' }} disabled={signingIn}>
            {signingIn ? 'Verifying access…' : 'Sign in to Moderation Desk'}
          </button>
          <div style={{ marginTop: '0.85rem', textAlign: 'center' }}>
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
      )
      )}

      {/* Phase 5: Floating Bottom Bulk Actions Toolbar */}
      {selectedSubIds.size > 0 && (
        <div className="admin-bulk-floating-toolbar" role="toolbar" aria-label="Bulk actions toolbar">
          <div className="admin-bulk-info">
            <span className="admin-bulk-count-badge">
              <SiteIcon name="check-circle" size={14} />
              <strong>{selectedSubIds.size}</strong> Selected
            </span>
            {selectedSubIds.size < items.length && (
              <button
                type="button"
                className="admin-bulk-link-btn"
                onClick={() => setSelectedSubIds(new Set(items.map(i => i.id)))}
                title={`Select all ${items.length} listings in current filter`}
              >
                Select all {items.length}
              </button>
            )}
          </div>

          <div className="admin-bulk-actions-group">
            <button
              type="button"
              className="admin-bulk-btn admin-bulk-btn-approve"
              onClick={() => {
                setActionDialog('bulk_approve')
                setBulkNotes('Approved via bulk intake inspection.')
                setError('')
              }}
              title="Approve all selected listings"
            >
              <SiteIcon name="check" size={14} />
              <span>Approve All ({selectedSubIds.size})</span>
            </button>

            <button
              type="button"
              className="admin-bulk-btn admin-bulk-btn-corrections"
              onClick={() => {
                setActionDialog('bulk_corrections')
                setBulkMessage('')
                setBulkNotes('')
                setError('')
              }}
              title="Request revisions for all selected listings"
            >
              <SiteIcon name="alert-circle" size={14} />
              <span>Request Corrections</span>
            </button>

            <button
              type="button"
              className="admin-bulk-btn admin-bulk-btn-reject"
              onClick={() => {
                setActionDialog('bulk_reject')
                setBulkMessage('')
                setBulkNotes('')
                setError('')
              }}
              title="Reject all selected listings"
            >
              <SiteIcon name="close" size={14} />
              <span>Reject All</span>
            </button>

            <button
              type="button"
              className="admin-bulk-btn admin-bulk-btn-export"
              onClick={handleExportSelectedCsv}
              title="Download CSV of selected items"
            >
              <SiteIcon name="arrow-down-left" size={14} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="admin-bulk-btn admin-bulk-btn-clear"
              onClick={() => setSelectedSubIds(new Set())}
              title="Deselect all (Shift + D)"
              aria-label="Clear selection"
            >
              <SiteIcon name="close" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Phase 5: Batch Confirmation Modal */}
      {actionDialog?.startsWith('bulk_') && (
        <div className="admin-drawer-backdrop" onClick={() => !bulkBusy && setActionDialog(null)}>
          <div
            className="admin-bulk-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-bulk-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-bulk-modal-header">
              <h3 id="admin-bulk-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                {actionDialog === 'bulk_approve' ? (
                  <>
                    <span className="admin-bulk-dialog-icon is-approve"><SiteIcon name="check-circle" size={18} /></span>
                    Batch Approve {selectedSubIds.size} Listings
                  </>
                ) : actionDialog === 'bulk_reject' ? (
                  <>
                    <span className="admin-bulk-dialog-icon is-reject"><SiteIcon name="close" size={18} /></span>
                    Batch Reject {selectedSubIds.size} Listings
                  </>
                ) : (
                  <>
                    <span className="admin-bulk-dialog-icon is-warn"><SiteIcon name="alert-circle" size={18} /></span>
                    Batch Request Corrections ({selectedSubIds.size} Listings)
                  </>
                )}
              </h3>
              <button
                type="button"
                className="admin-drawer-close-btn"
                onClick={() => !bulkBusy && setActionDialog(null)}
                disabled={bulkBusy}
                aria-label="Close batch confirmation dialog"
              >
                ✕
              </button>
            </div>

            <div className="admin-bulk-modal-body">
              <p className="admin-bulk-modal-desc">
                {actionDialog === 'bulk_approve'
                  ? `You are about to approve ${selectedSubIds.size} listings in batch. Submissions will transition to approved state for publication.`
                  : actionDialog === 'bulk_reject'
                    ? `You are about to reject ${selectedSubIds.size} listings in batch. A clear rejection reason must be provided to submitters.`
                    : `You are requesting revisions on ${selectedSubIds.size} listings in batch. Explain what needs correction.`}
              </p>

              {/* Selected Listings Chip Preview */}
              <div className="admin-bulk-preview-chips">
                {items.filter(i => selectedSubIds.has(i.id)).map(item => (
                  <span key={item.id} className="admin-bulk-chip">
                    <code>{item.reference_number}</code>
                    <span>{item.title}</span>
                  </span>
                ))}
              </div>

              {/* Preset Templates */}
              {actionDialog === 'bulk_reject' && (
                <div className="admin-bulk-presets-block">
                  <label className="admin-detail-label">Preset Rejection Reason</label>
                  <div className="admin-presets-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                    {MODERATION_REJECTION_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="admin-preset-tag"
                        onClick={() => setBulkMessage(p.text)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {actionDialog === 'bulk_corrections' && (
                <div className="admin-bulk-presets-block">
                  <label className="admin-detail-label">Preset Correction Reason</label>
                  <div className="admin-presets-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                    {MODERATION_CORRECTION_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="admin-preset-tag"
                        onClick={() => setBulkMessage(p.text)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {actionDialog === 'bulk_approve' && (
                <div className="admin-bulk-presets-block">
                  <label className="admin-detail-label">Preset Verification Standard</label>
                  <div className="admin-presets-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                    {MODERATION_APPROVAL_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="admin-preset-tag"
                        onClick={() => setBulkNotes(p.text)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Input */}
              {(actionDialog === 'bulk_reject' || actionDialog === 'bulk_corrections') && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label className="admin-detail-label">
                    Feedback Message to Submitters <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    className="admin-input-textarea"
                    style={{ width: '100%', minHeight: 70, marginTop: '0.3rem', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    value={bulkMessage}
                    onChange={e => setBulkMessage(e.target.value)}
                    placeholder="Enter feedback explanation for submitters…"
                    disabled={bulkBusy}
                  />
                </div>
              )}

              <div style={{ marginTop: '0.75rem' }}>
                <label className="admin-detail-label">Internal Audit Notes (Optional)</label>
                <input
                  type="text"
                  className="admin-input-text"
                  style={{ width: '100%', padding: '0.45rem 0.6rem', marginTop: '0.3rem', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  value={bulkNotes}
                  onChange={e => setBulkNotes(e.target.value)}
                  placeholder="Audit trail note for platform records…"
                  disabled={bulkBusy}
                />
              </div>

              {error && (
                <div className="admin-dialog-error" style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.6rem' }}>
                  {error}
                </div>
              )}
            </div>

            <div className="admin-bulk-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => { setActionDialog(null); setError('') }}
                disabled={bulkBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`admin-btn ${
                  actionDialog === 'bulk_approve'
                    ? 'admin-btn-approve'
                    : actionDialog === 'bulk_reject'
                      ? 'admin-btn-reject'
                      : 'admin-btn-warn'
                }`}
                onClick={handleExecuteBulkAction}
                disabled={bulkBusy}
              >
                {bulkBusy ? 'Executing Batch…' : `Confirm Batch Action (${selectedSubIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 5: Undo Buffer Toast */}
      {undoBuffer && (
        <div className="admin-undo-toast" role="status" aria-live="polite">
          <SiteIcon name="check-circle" size={16} />
          <span>Batch {undoBuffer.actionLabel} completed for {undoBuffer.count} items.</span>
          <button
            type="button"
            className="admin-undo-dismiss-btn"
            onClick={() => setUndoBuffer(null)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Phase 2: Power Keyboard Shortcuts Cheat Sheet Dialog */}
      {showShortcutsModal && (
        <div className="admin-drawer-backdrop" onClick={() => setShowShortcutsModal(false)}>
          <div
            className="admin-shortcuts-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-shortcuts-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-shortcuts-header">
              <h3 id="admin-shortcuts-title">⚡ Power Keyboard Navigation</h3>
              <button
                type="button"
                className="admin-drawer-close-btn"
                onClick={() => setShowShortcutsModal(false)}
                aria-label="Close shortcuts modal"
              >
                ✕
              </button>
            </div>
            <div className="admin-shortcuts-grid">
              <div className="admin-shortcut-row">
                <span>Navigate items in queue</span>
                <div className="admin-keys">
                  <kbd>J</kbd> / <kbd>K</kbd> or <kbd>↓</kbd> / <kbd>↑</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Open / Inspect active item in drawer</span>
                <div className="admin-keys">
                  <kbd>Enter</kbd> or <kbd>O</kbd> or <kbd>Space</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Quick Approve active item</span>
                <div className="admin-keys">
                  <kbd>A</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Quick Reject with preset templates</span>
                <div className="admin-keys">
                  <kbd>R</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Request Corrections / Revisions</span>
                <div className="admin-keys">
                  <kbd>C</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Toggle item selection (Bulk Mode)</span>
                <div className="admin-keys">
                  <kbd>X</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Select all filtered items</span>
                <div className="admin-keys">
                  <kbd>Shift</kbd> + <kbd>A</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Deselect all items</span>
                <div className="admin-keys">
                  <kbd>Shift</kbd> + <kbd>D</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Switch table density</span>
                <div className="admin-keys">
                  <kbd>1</kbd> Compact &middot; <kbd>2</kbd> Cozy &middot; <kbd>3</kbd> Expanded
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Close drawer / Dismiss dialog</span>
                <div className="admin-keys">
                  <kbd>Esc</kbd>
                </div>
              </div>
              <div className="admin-shortcut-row">
                <span>Toggle this shortcuts cheat sheet</span>
                <div className="admin-keys">
                  <kbd>?</kbd>
                </div>
              </div>
            </div>
            <p className="admin-keyboard-nav-hint" style={{ marginTop: '0.25rem', justifyContent: 'center' }}>
              Shortcuts are safely paused while typing in search, inputs, or textareas.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
