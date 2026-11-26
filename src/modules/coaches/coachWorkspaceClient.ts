import { getSupabaseClient } from '../../integrations/supabase/realtime-client'

export type CoachVerificationStatus =
  | 'unverified'
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'suspended'

export type CoachDocumentType =
  | 'coaching_license'
  | 'affiliation_certificate'
  | 'government_id'
  | 'experience_letter'
  | 'other'

export interface CoachQualificationItem {
  title: string
  institution: string
  year: string
}

export interface CoachCertificationItem {
  name: string
  authority: string
  licenseId: string
  issuedYear: string
}

export interface CoachPastAffiliationItem {
  organization: string
  role: string
  period: string
}

export interface CoachAchievementItem {
  year: string
  title: string
  detail: string
}

export interface CoachContactPreferences {
  allowWhatsApp: boolean
  allowEmail: boolean
  allowDirectInquiries: boolean
  preferredHours: string
}

export interface CoachProfileRecord {
  id: string
  userId: string
  tenantId: string | null
  directoryCoachId: string | null
  slug: string
  fullName: string
  avatarUrl: string | null
  bio: string
  sportsSpecialization: string[]
  coachingCategories: string[]
  experienceYears: number
  qualifications: CoachQualificationItem[]
  certifications: CoachCertificationItem[]
  previousAcademies: CoachPastAffiliationItem[]
  achievements: CoachAchievementItem[]
  languages: string[]
  city: string
  state: string
  serviceArea: string
  coachingMethodology: string
  onlineCoachingAvailable: boolean
  portfolioUrl: string | null
  introVideoUrl: string | null
  contactPreferences: CoachContactPreferences
  verificationStatus: CoachVerificationStatus
  verificationFeedback: string | null
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CoachProfileUpdateInput {
  fullName: string
  avatarUrl: string | null
  bio: string
  sportsSpecialization: string[]
  coachingCategories: string[]
  experienceYears: number
  qualifications: CoachQualificationItem[]
  certifications: CoachCertificationItem[]
  previousAcademies: CoachPastAffiliationItem[]
  achievements: CoachAchievementItem[]
  languages: string[]
  city: string
  state: string
  serviceArea: string
  coachingMethodology: string
  onlineCoachingAvailable: boolean
  portfolioUrl: string | null
  introVideoUrl: string | null
  contactPreferences: CoachContactPreferences
}

export interface CoachVerificationSubmissionRecord {
  id: string
  coachProfileId: string
  documentType: CoachDocumentType
  documentTitle: string
  supportingDetails: string
  supportingDocumentUrl: string | null
  status: Exclude<CoachVerificationStatus, 'unverified'>
  moderatorFeedback: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface CoachOverviewStats {
  totalAthletes: number
  activeAthletes: number
  pendingAthleteRequests: number
  activeProgrammes: number
  upcomingSessions: number
  completedSessions: number
  pendingAssessments: number
  attendanceRatePct: number | null
  attendanceEventsCount: number
  academyAssociations: number
  unreadNotifications: number
}

export interface CoachRecentRequestItem {
  id: string
  enquiry_token: string
  student_name: string
  parent_name: string
  sport: string
  request_type: string
  status: string
  submitted_at: string
}

export interface CoachRecentBatchItem {
  id: string
  batch_name: string
  sport: string
  days: string
  timings: string
  age_group?: string | null
  max_capacity: number
}

export interface CoachRecentNotificationItem {
  id: string
  category: string
  title: string
  message: string
  action_url?: string | null
  is_read: boolean
  created_at: string
}

export interface CoachOverviewPayload {
  stats: CoachOverviewStats
  recentRequests: CoachRecentRequestItem[]
  recentBatches: CoachRecentBatchItem[]
  recentNotifications: CoachRecentNotificationItem[]
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const UNCONFIGURED_DB_MSG = 'Database connection is not configured for this environment.'

const DEFAULT_CONTACT_PREFERENCES: CoachContactPreferences = {
  allowWhatsApp: true,
  allowEmail: true,
  allowDirectInquiries: true,
  preferredHours: '09:00 AM - 06:00 PM IST',
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(v => String(v || '').trim()).filter(Boolean)
    : []
}

function asRecordArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export function mapDbRowToCoachProfile(row: Record<string, unknown>): CoachProfileRecord {
  const rawPrefs = (row.contact_preferences || {}) as Record<string, unknown>
  return {
    id: String(row.id || ''),
    userId: String(row.user_id || ''),
    tenantId: row.tenant_id ? String(row.tenant_id) : null,
    directoryCoachId: row.directory_coach_id ? String(row.directory_coach_id) : null,
    slug: String(row.slug || ''),
    fullName: String(row.full_name || ''),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    bio: row.bio ? String(row.bio) : '',
    sportsSpecialization: asStringArray(row.sports_specialization),
    coachingCategories: asStringArray(row.coaching_categories),
    experienceYears: Number(row.experience_years ?? 0),
    qualifications: asRecordArray<CoachQualificationItem>(row.qualifications),
    certifications: asRecordArray<CoachCertificationItem>(row.certifications),
    previousAcademies: asRecordArray<CoachPastAffiliationItem>(row.previous_academies),
    achievements: asRecordArray<CoachAchievementItem>(row.achievements),
    languages: asStringArray(row.languages),
    city: row.city ? String(row.city) : '',
    state: row.state ? String(row.state) : '',
    serviceArea: row.service_area ? String(row.service_area) : '',
    coachingMethodology: row.coaching_methodology ? String(row.coaching_methodology) : '',
    onlineCoachingAvailable: Boolean(row.online_coaching_available),
    portfolioUrl: row.portfolio_url ? String(row.portfolio_url) : null,
    introVideoUrl: row.intro_video_url ? String(row.intro_video_url) : null,
    contactPreferences: {
      allowWhatsApp: rawPrefs.allowWhatsApp !== false,
      allowEmail: rawPrefs.allowEmail !== false,
      allowDirectInquiries: rawPrefs.allowDirectInquiries !== false,
      preferredHours: typeof rawPrefs.preferredHours === 'string' && rawPrefs.preferredHours.trim()
        ? rawPrefs.preferredHours
        : DEFAULT_CONTACT_PREFERENCES.preferredHours,
    },
    verificationStatus: (row.verification_status as CoachVerificationStatus) || 'unverified',
    verificationFeedback: row.verification_feedback ? String(row.verification_feedback) : null,
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  }
}

function mapDbRowToVerificationSubmission(row: Record<string, unknown>): CoachVerificationSubmissionRecord {
  return {
    id: String(row.id || ''),
    coachProfileId: String(row.coach_profile_id || ''),
    documentType: (row.document_type as CoachDocumentType) || 'coaching_license',
    documentTitle: String(row.document_title || ''),
    supportingDetails: String(row.supporting_details || ''),
    supportingDocumentUrl: row.supporting_document_url ? String(row.supporting_document_url) : null,
    status: (row.status as Exclude<CoachVerificationStatus, 'unverified'>) || 'pending',
    moderatorFeedback: row.moderator_feedback ? String(row.moderator_feedback) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at || ''),
  }
}

/** Computes honest profile completion from non-empty database fields. */
export function calculateCoachProfileCompleteness(profile: CoachProfileRecord): {
  percent: number
  missing: string[]
} {
  const checks: { label: string; done: boolean }[] = [
    { label: 'Full name', done: profile.fullName.trim().length >= 2 },
    { label: 'Biography', done: profile.bio.trim().length >= 20 },
    { label: 'Sports specialization', done: profile.sportsSpecialization.length > 0 },
    { label: 'Coaching categories', done: profile.coachingCategories.length > 0 },
    { label: 'Experience & methodology', done: profile.experienceYears > 0 || profile.coachingMethodology.trim().length >= 10 },
    { label: 'Qualifications or certifications', done: profile.qualifications.length > 0 || profile.certifications.length > 0 },
    { label: 'Location & service area', done: Boolean(profile.city.trim()) && Boolean(profile.serviceArea.trim()) },
    { label: 'Languages', done: profile.languages.length > 0 },
  ]
  const doneCount = checks.filter(c => c.done).length
  const missing = checks.filter(c => !c.done).map(c => c.label)
  return {
    percent: Math.round((doneCount / checks.length) * 100),
    missing,
  }
}

export async function loadOrInitializeCoachProfile(
  tenantId?: string | null
): Promise<ServiceResult<CoachProfileRecord>> {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: UNCONFIGURED_DB_MSG }
  }

  try {
    const { data, error } = await client.rpc('ensure_coach_profile_for_user', {
      p_tenant_id: tenantId || null,
    })

    if (error) {
      return { ok: false, error: error.message || 'Could not load coach profile.' }
    }
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'Coach profile record was not returned.' }
    }

    return { ok: true, data: mapDbRowToCoachProfile(data as Record<string, unknown>) }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected error loading coach profile.',
    }
  }
}

export async function updateCoachProfile(
  profileId: string,
  input: CoachProfileUpdateInput
): Promise<ServiceResult<CoachProfileRecord>> {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: 'Database connection is not configured.' }
  }

  const trimmedName = input.fullName.trim()
  if (trimmedName.length < 2) {
    return { ok: false, error: 'Full name must be at least 2 characters.' }
  }

  for (const [label, url] of [
    ['Profile photo URL', input.avatarUrl],
    ['Portfolio URL', input.portfolioUrl],
    ['Introduction video URL', input.introVideoUrl],
  ] as const) {
    if (url && !/^https?:\/\//i.test(url.trim())) {
      return { ok: false, error: `${label} must start with https:// or http://.` }
    }
  }

  try {
    const { data, error } = await client
      .from('coach_profiles')
      .update({
        full_name: trimmedName,
        avatar_url: input.avatarUrl?.trim() || null,
        bio: input.bio.trim() || null,
        sports_specialization: input.sportsSpecialization,
        coaching_categories: input.coachingCategories,
        experience_years: Math.max(0, Math.min(80, Math.round(input.experienceYears || 0))),
        qualifications: input.qualifications,
        certifications: input.certifications,
        previous_academies: input.previousAcademies,
        achievements: input.achievements,
        languages: input.languages,
        city: input.city.trim(),
        state: input.state.trim(),
        service_area: input.serviceArea.trim(),
        coaching_methodology: input.coachingMethodology.trim() || null,
        online_coaching_available: Boolean(input.onlineCoachingAvailable),
        portfolio_url: input.portfolioUrl?.trim() || null,
        intro_video_url: input.introVideoUrl?.trim() || null,
        contact_preferences: input.contactPreferences,
      })
      .eq('id', profileId)
      .select('*')
      .single()

    if (error) {
      return { ok: false, error: error.message || 'Could not save coach profile updates.' }
    }

    return { ok: true, data: mapDbRowToCoachProfile(data as Record<string, unknown>) }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected error saving profile.',
    }
  }
}

export async function loadCoachVerificationSubmissions(
  coachProfileId: string
): Promise<ServiceResult<CoachVerificationSubmissionRecord[]>> {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: 'Database connection is not configured.' }
  }

  try {
    const { data, error } = await client
      .from('coach_verification_submissions')
      .select('*')
      .eq('coach_profile_id', coachProfileId)
      .order('created_at', { ascending: false })

    if (error) {
      return { ok: false, error: error.message || 'Could not load verification history.' }
    }

    const rows = Array.isArray(data) ? data : []
    return {
      ok: true,
      data: rows.map(row => mapDbRowToVerificationSubmission(row as Record<string, unknown>)),
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected error loading verification history.',
    }
  }
}

export async function submitCoachVerification(params: {
  coachProfileId: string
  documentType: CoachDocumentType
  documentTitle: string
  supportingDetails: string
  supportingDocumentUrl?: string
}): Promise<ServiceResult<CoachVerificationSubmissionRecord>> {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: 'Database connection is not configured.' }
  }

  if (params.documentTitle.trim().length < 2) {
    return { ok: false, error: 'Document title must be at least 2 characters.' }
  }
  if (params.supportingDetails.trim().length < 5) {
    return { ok: false, error: 'Please include at least 5 characters describing your accreditation proof.' }
  }
  const cleanDocUrl = params.supportingDocumentUrl?.trim() || ''
  if (cleanDocUrl && !/^https?:\/\//i.test(cleanDocUrl)) {
    return { ok: false, error: 'Supporting document link must start with https:// or http://.' }
  }

  try {
    const { data, error } = await client.rpc('submit_coach_verification_request', {
      p_coach_profile_id: params.coachProfileId,
      p_document_type: params.documentType,
      p_document_title: params.documentTitle.trim(),
      p_supporting_details: params.supportingDetails.trim(),
      p_supporting_document_url: cleanDocUrl || null,
    })

    if (error) {
      return { ok: false, error: error.message || 'Could not submit verification request.' }
    }

    return {
      ok: true,
      data: mapDbRowToVerificationSubmission(data as Record<string, unknown>),
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected error submitting verification.',
    }
  }
}

export async function loadCoachDashboardOverview(
  tenantId?: string | null
): Promise<ServiceResult<CoachOverviewPayload>> {
  const client = getSupabaseClient()
  if (!client) {
    return { ok: false, error: UNCONFIGURED_DB_MSG }
  }

  try {
    const { data, error } = await client.rpc('get_coach_dashboard_overview', {
      p_tenant_id: tenantId || null,
    })

    if (error) {
      return { ok: false, error: error.message || 'Could not load coach overview metrics.' }
    }

    const raw = (data || {}) as Record<string, unknown>
    const rawStats = (raw.stats || {}) as Record<string, unknown>

    return {
      ok: true,
      data: {
        stats: {
          totalAthletes: Number(rawStats.totalAthletes ?? 0),
          activeAthletes: Number(rawStats.activeAthletes ?? 0),
          pendingAthleteRequests: Number(rawStats.pendingAthleteRequests ?? 0),
          activeProgrammes: Number(rawStats.activeProgrammes ?? 0),
          upcomingSessions: Number(rawStats.upcomingSessions ?? 0),
          completedSessions: Number(rawStats.completedSessions ?? 0),
          pendingAssessments: Number(rawStats.pendingAssessments ?? 0),
          attendanceRatePct:
            rawStats.attendanceRatePct === null || rawStats.attendanceRatePct === undefined
              ? null
              : Number(rawStats.attendanceRatePct),
          attendanceEventsCount: Number(rawStats.attendanceEventsCount ?? 0),
          academyAssociations: Number(rawStats.academyAssociations ?? 0),
          unreadNotifications: Number(rawStats.unreadNotifications ?? 0),
        },
        recentRequests: asRecordArray<CoachRecentRequestItem>(raw.recentRequests),
        recentBatches: asRecordArray<CoachRecentBatchItem>(raw.recentBatches),
        recentNotifications: asRecordArray<CoachRecentNotificationItem>(raw.recentNotifications),
      },
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected error loading coach overview.',
    }
  }
}
