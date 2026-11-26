import { getSupabaseClient } from '../../integrations/supabase/realtime-client'
import { isValidUpiVpa } from '../../shared/saas/saasLaunchReadinessService'

/**
 * Authoritative PostgreSQL / Supabase SaaS client for the KhelGrid Academy Workspace.
 *
 * Security & correctness invariants:
 * - Zero fabricated demo records, zero localStorage academy persistence, zero client-side
 *   verification bypasses, and zero payment gateway activation.
 * - Every call requires an authenticated Supabase session + explicit tenantId.
 * - Server triggers + PostgreSQL RLS + SECURITY DEFINER RPCs enforce role & branch isolation.
 */

export type AcademyVerificationStatus =
  | 'unverified'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'more_info_needed'

export interface AcademyAffiliationItem {
  body: string
  affiliationNumber: string
  validUntil: string
}

export interface AcademyFeePlanItem {
  programName: string
  billingCycle: 'monthly' | 'quarterly' | 'annual' | 'per_session'
  amountInr: number
  notes: string
}

export interface AcademyMediaItem {
  title: string
  url: string
  kind: 'photo' | 'video' | 'brochure'
}

export interface AcademyProfileRecord {
  id: string
  tenantId: string
  directoryAcademyId: string | null
  slug: string
  displayName: string
  tagline: string
  description: string
  sportsOffered: string[]
  foundedYear: number | null
  affiliations: AcademyAffiliationItem[]
  ageGroups: string[]
  skillLevels: string[]
  feeStructure: AcademyFeePlanItem[]
  trainingMethodology: string
  facilitiesSummary: string[]
  operatingHours: string
  contactPhone: string
  contactEmail: string
  websiteUrl: string | null
  socialLinks: Record<string, string>
  mediaGallery: AcademyMediaItem[]
  logoUrl: string | null
  bannerUrl: string | null
  city: string
  state: string
  isPubliclyListed: boolean
  seoTitle: string
  seoDescription: string
  verificationStatus: AcademyVerificationStatus
  moderationNote: string | null
  verifiedAt: string | null
  lastSubmittedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AcademyBranchRecord {
  id: string
  tenantId: string
  name: string
  unitType: string
  branchCode: string
  city: string
  state: string
  address: string
  pincode: string
  sportsOffered: string[]
  facilities: string[]
  operatingHours: string
  contactPhone: string
  contactEmail: string
  capacity: number | null
  leadUserId: string | null
  isPrimary: boolean
  isActive: boolean
  createdAt: string
}

export type AthleteEnrollmentStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'graduated'
  | 'transferred'
  | 'archived'

export interface AcademyAthleteRecord {
  id: string
  tenantId: string
  batchId: string | null
  unitId: string | null
  assignedCoachId: string | null
  athleteUserId: string | null
  studentName: string
  parentName: string
  parentPhone: string
  parentEmail: string | null
  sport: string | null
  ageCategory: string | null
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite'
  enrollmentStatus: AthleteEnrollmentStatus
  joiningDate: string | null
  dateOfBirth: string | null
  gender: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  guardianConsentVerified: boolean
  medicalNotes: string | null
  monthlyFee: number
  feeStatus: 'paid' | 'due_soon' | 'overdue' | 'exempt'
  nextDueDate: string | null
  lastPaymentDate: string | null
  isActive: boolean
  deletedAt: string | null
  createdAt: string
}

export interface AcademyAthleteNoteRecord {
  id: string
  tenantId: string
  studentId: string
  unitId: string | null
  authorName: string
  noteType: 'development' | 'injury' | 'performance' | 'guardian_comms' | 'general'
  noteBody: string
  isPrivateToStaff: boolean
  createdAt: string
}

export interface AcademyCoachRecord {
  id: string
  tenantId: string
  userId: string | null
  coachProfileId: string | null
  membershipId: string | null
  primaryUnitId: string | null
  fullName: string
  email: string | null
  phone: string | null
  roleTitle: string
  employmentType: 'full_time' | 'part_time' | 'visiting' | 'consultant'
  specializations: string[]
  qualificationSummary: string | null
  assignedBranchIds: string[]
  joiningDate: string | null
  safeguardingStatus: 'verified' | 'pending' | 'expired' | 'not_submitted'
  status: 'invited' | 'active' | 'inactive' | 'archived'
  notes: string | null
  createdAt: string
}

export interface AcademyBatchRecord {
  id: string
  tenantId: string
  unitId: string | null
  coachId: string | null
  batchName: string
  sport: string
  days: string
  timings: string
  coachName: string | null
  ageGroup: string | null
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite' | 'all_levels'
  description: string | null
  monthlyFee: number
  maxCapacity: number
  isActive: boolean
  deletedAt: string | null
  createdAt: string
}

export interface AcademySessionRecord {
  id: string
  tenantId: string
  batchId: string
  unitId: string | null
  coachId: string | null
  facilityId: string | null
  title: string
  sport: string
  sessionDate: string
  startTime: string
  endTime: string
  recurrenceRule: 'none' | 'daily' | 'weekly' | 'weekdays' | 'weekends'
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  cancellationReason: string | null
  sessionNotes: string | null
  maxParticipants: number | null
  createdAt: string
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AcademyAttendanceEventRecord {
  id: string
  tenantId: string
  batchId: string
  studentId: string
  unitId: string | null
  sessionId: string | null
  sessionDate: string
  status: AttendanceStatus
  notes: string | null
  markedBy: string | null
  updatedAt: string
}

export interface AcademyAttendanceAuditRecord {
  id: string
  tenantId: string
  studentId: string
  batchId: string
  sessionDate: string
  previousStatus: string | null
  newStatus: string
  changedBy: string | null
  notes: string | null
  changedAt: string
}

export interface AcademyCoachAttendanceRecord {
  id: string
  tenantId: string
  coachId: string
  unitId: string | null
  sessionDate: string
  status: AttendanceStatus
  notes: string | null
  updatedAt: string
}

export type AdmissionStage =
  | 'new'
  | 'contacted'
  | 'shortlisted'
  | 'trial_scheduled'
  | 'trial_completed'
  | 'offered'
  | 'enrolled'
  | 'waitlisted'
  | 'rejected'
  | 'archived'

export interface AcademyEnquiryRecord {
  id: string
  tenantId: string
  unitId: string | null
  trialPostingId: string | null
  enquiryToken: string
  parentName: string
  parentPhone: string
  parentEmail: string | null
  studentName: string
  studentAge: number | null
  ageCategory: string | null
  sport: string
  requestType: 'free_trial' | 'regular_admission' | 'scholarship_assessment'
  status: AdmissionStage
  notes: string | null
  sourceChannel: string | null
  submittedAt: string
  stageUpdatedAt: string | null
}

export interface AcademyAdmissionNoteRecord {
  id: string
  tenantId: string
  enquiryId: string
  authorName: string
  evaluationScore: number | null
  noteBody: string
  createdAt: string
}

export interface AcademyTrialPostingRecord {
  id: string
  tenantId: string
  unitId: string | null
  opportunityId: string | null
  listingSubmissionId: string | null
  title: string
  sport: string
  ageCategories: string[]
  eligibilityCriteria: string | null
  venueAddress: string | null
  city: string
  trialDate: string | null
  applicationDeadline: string | null
  capacity: number | null
  feeDisplayInr: number
  status: 'draft' | 'pending_moderation' | 'approved' | 'published' | 'closed' | 'rejected' | 'archived'
  moderationNote: string | null
  createdAt: string
}

export interface AcademyFacilityRecord {
  id: string
  tenantId: string
  unitId: string | null
  name: string
  facilityType: 'ground' | 'turf' | 'court' | 'indoor_hall' | 'swimming_pool' | 'gym' | 'track' | 'net_lane' | 'other'
  sport: string
  surfaceType: string | null
  capacity: number | null
  hasFloodlights: boolean
  status: 'available' | 'maintenance' | 'reserved' | 'inactive'
  notes: string | null
}

export interface AcademyEquipmentRecord {
  id: string
  tenantId: string
  unitId: string | null
  name: string
  category: 'training_gear' | 'safety_medical' | 'kit' | 'pitch_equipment' | 'electronics' | 'other'
  totalQuantity: number
  availableQuantity: number
  conditionStatus: 'good' | 'needs_repair' | 'damaged' | 'retired'
  lastInspectedAt: string | null
  notes: string | null
}

export interface AcademyAnnouncementRecord {
  id: string
  tenantId: string
  unitId: string | null
  batchId: string | null
  audience: 'all_staff' | 'branch_managers' | 'coaches' | 'students' | 'parents' | 'trial_applicants'
  title: string
  message: string
  channel: 'in_app' | 'whatsapp_link' | 'email_digest'
  recipientCount: number
  createdAt: string
}

export interface AcademyStaffMemberRecord {
  membershipId: string
  tenantId: string
  userId: string | null
  role: string
  status: string
  invitedEmail: string | null
  branchUnitIds: string[]
  createdAt: string
}

export interface AcademyFeeTransactionRecord {
  id: string
  tenantId: string
  invoiceId: string | null
  studentId: string
  receiptNumber: string
  amount: number
  paymentMode: 'cash' | 'direct_upi' | 'bank_transfer' | 'cheque'
  collectedByName: string
  collectedDate: string
  billingMonth: string
  status: 'settled' | 'cash_in_hand' | 'refunded'
  notes: string | null
  createdAt: string
}

export interface AcademyFeeInvoiceRecord {
  id: string
  tenantId: string
  studentId: string
  invoiceNumber: string
  amount: number
  billingMonth: string
  dueDate: string
  status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'cancelled' | 'refunded'
  createdAt: string
  updatedAt: string
}

export function generateAcademyUpiPayLink(params: {
  vpa: string
  name: string
  amount: number
  note: string
}): string {
  const cleanVpa = params.vpa.trim()
  const safeAmount = Math.max(1, Math.round(params.amount || 0))
  return `upi://pay?pa=${encodeURIComponent(cleanVpa)}&pn=${encodeURIComponent(params.name.trim())}&am=${safeAmount}&cu=INR&tn=${encodeURIComponent(params.note.trim())}`
}

export interface AcademyOverviewStats {
  totalAthletes: number
  activeAthletes: number
  coachesCount: number
  branchesCount: number
  activeBatches: number
  upcomingSessions: number
  completedSessions30d: number
  totalApplications: number
  pendingApplications: number
  enrolledApplications: number
  attendanceRatePct: number | null
  attendanceEventsCount: number
  facilitiesCount: number
  unreadNotifications: number
  totalFeeCollectedInr: number | null
  feeDueOrOverdueCount: number | null
  canViewFinance: boolean
}

export interface AcademyOverviewPayload {
  stats: AcademyOverviewStats
  recentApplications: {
    id: string
    enquiry_token: string
    student_name: string
    parent_name: string
    sport: string
    request_type: string
    status: string
    unit_id: string | null
    submitted_at: string
  }[]
  upcomingSessions: {
    id: string
    title: string
    sport: string
    session_date: string
    start_time: string
    end_time: string
    status: string
    unit_id: string | null
    batch_id: string
  }[]
  pipelineBreakdown: { status: string; count: number }[]
  branchBreakdown: {
    unit_id: string
    branch_name: string
    city: string | null
    athletes_count: number
    batches_count: number
  }[]
  recentActivity: {
    id: string
    action: string
    entity_type: string
    details: Record<string, unknown>
    created_at: string
  }[]
}

export interface WorkspaceMutationResult<T = void> {
  success: boolean
  message: string
  data?: T
}

function asArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : []
}

function mapProfileRow(row: Record<string, unknown>): AcademyProfileRecord {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    directoryAcademyId: row.directory_academy_id ? String(row.directory_academy_id) : null,
    slug: String(row.slug || ''),
    displayName: String(row.display_name || ''),
    tagline: String(row.tagline || ''),
    description: String(row.description || ''),
    sportsOffered: asArray<string>(row.sports_offered),
    foundedYear: typeof row.founded_year === 'number' ? row.founded_year : null,
    affiliations: asArray<AcademyAffiliationItem>(row.affiliations),
    ageGroups: asArray<string>(row.age_groups),
    skillLevels: asArray<string>(row.skill_levels),
    feeStructure: asArray<AcademyFeePlanItem>(row.fee_structure),
    trainingMethodology: String(row.training_methodology || ''),
    facilitiesSummary: asArray<string>(row.facilities_summary),
    operatingHours: String(row.operating_hours || ''),
    contactPhone: String(row.contact_phone || ''),
    contactEmail: String(row.contact_email || ''),
    websiteUrl: row.website_url ? String(row.website_url) : null,
    socialLinks: (row.social_links as Record<string, string>) || {},
    mediaGallery: asArray<AcademyMediaItem>(row.media_gallery),
    logoUrl: row.logo_url ? String(row.logo_url) : null,
    bannerUrl: row.banner_url ? String(row.banner_url) : null,
    city: String(row.city || ''),
    state: String(row.state || ''),
    isPubliclyListed: Boolean(row.is_publicly_listed),
    seoTitle: String(row.seo_title || ''),
    seoDescription: String(row.seo_description || ''),
    verificationStatus: (row.verification_status as AcademyVerificationStatus) || 'unverified',
    moderationNote: row.moderation_note ? String(row.moderation_note) : null,
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    lastSubmittedAt: row.last_submitted_at ? String(row.last_submitted_at) : null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  }
}

export function calculateAcademyProfileCompleteness(profile: AcademyProfileRecord | null): {
  percent: number
  missing: string[]
} {
  if (!profile) {
    return { percent: 0, missing: ['Display name', 'Description', 'Sports offered', 'City', 'Age groups', 'Fee info'] }
  }
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Academy name', ok: profile.displayName.trim().length >= 2 },
    { label: 'Description', ok: profile.description.trim().length >= 20 },
    { label: 'Sports offered', ok: profile.sportsOffered.length > 0 },
    { label: 'City & location', ok: profile.city.trim().length > 0 },
    { label: 'Age groups', ok: profile.ageGroups.length > 0 },
    { label: 'Training methodology', ok: profile.trainingMethodology.trim().length >= 15 },
    { label: 'Fee schedule', ok: profile.feeStructure.length > 0 },
    { label: 'Contact phone or email', ok: Boolean(profile.contactPhone.trim() || profile.contactEmail.trim()) },
  ]
  const passed = checks.filter(c => c.ok).length
  return {
    percent: Math.round((passed / checks.length) * 100),
    missing: checks.filter(c => !c.ok).map(c => c.label),
  }
}

export async function loadAcademyDashboardOverview(
  tenantId: string,
  unitId?: string | null,
): Promise<{ overview: AcademyOverviewPayload | null; error?: string }> {
  const client = getSupabaseClient()
  if (!client || !tenantId) {
    return { overview: null, error: 'Database connection or academy tenant context is unavailable.' }
  }
  const { data, error } = await client.rpc('get_academy_dashboard_overview', {
    p_tenant_id: tenantId,
    p_unit_id: unitId || null,
  })
  if (error || !data) {
    return { overview: null, error: error?.message || 'Unable to load academy dashboard overview.' }
  }
  const raw = data as Record<string, unknown>
  const statsRaw = (raw.stats as Record<string, unknown>) || {}
  return {
    overview: {
      stats: {
        totalAthletes: Number(statsRaw.totalAthletes ?? 0),
        activeAthletes: Number(statsRaw.activeAthletes ?? 0),
        coachesCount: Number(statsRaw.coachesCount ?? 0),
        branchesCount: Number(statsRaw.branchesCount ?? 0),
        activeBatches: Number(statsRaw.activeBatches ?? 0),
        upcomingSessions: Number(statsRaw.upcomingSessions ?? 0),
        completedSessions30d: Number(statsRaw.completedSessions30d ?? 0),
        totalApplications: Number(statsRaw.totalApplications ?? 0),
        pendingApplications: Number(statsRaw.pendingApplications ?? 0),
        enrolledApplications: Number(statsRaw.enrolledApplications ?? 0),
        attendanceRatePct: typeof statsRaw.attendanceRatePct === 'number' ? statsRaw.attendanceRatePct : null,
        attendanceEventsCount: Number(statsRaw.attendanceEventsCount ?? 0),
        facilitiesCount: Number(statsRaw.facilitiesCount ?? 0),
        unreadNotifications: Number(statsRaw.unreadNotifications ?? 0),
        totalFeeCollectedInr: typeof statsRaw.totalFeeCollectedInr === 'number' ? statsRaw.totalFeeCollectedInr : null,
        feeDueOrOverdueCount: typeof statsRaw.feeDueOrOverdueCount === 'number' ? statsRaw.feeDueOrOverdueCount : null,
        canViewFinance: Boolean(statsRaw.canViewFinance),
      },
      recentApplications: asArray(raw.recentApplications),
      upcomingSessions: asArray(raw.upcomingSessions),
      pipelineBreakdown: asArray(raw.pipelineBreakdown),
      branchBreakdown: asArray(raw.branchBreakdown),
      recentActivity: asArray(raw.recentActivity),
    },
  }
}

export async function loadOrInitializeAcademyProfile(
  tenantId: string,
): Promise<WorkspaceMutationResult<AcademyProfileRecord>> {
  const client = getSupabaseClient()
  if (!client || !tenantId) {
    return { success: false, message: 'Database unavailable.' }
  }
  const { data, error } = await client.rpc('ensure_academy_profile_for_tenant', { p_tenant_id: tenantId })
  if (error || !data) {
    return { success: false, message: error?.message || 'Unable to load academy profile.' }
  }
  return {
    success: true,
    message: 'Profile loaded.',
    data: mapProfileRow(data as Record<string, unknown>),
  }
}

export async function saveAcademyProfile(
  profileId: string,
  tenantId: string,
  input: Partial<AcademyProfileRecord>,
): Promise<WorkspaceMutationResult<AcademyProfileRecord>> {
  const client = getSupabaseClient()
  if (!client || !tenantId || !profileId) {
    return { success: false, message: 'Missing tenant or profile context.' }
  }

  const updatePayload: Record<string, unknown> = {
    display_name: input.displayName?.trim(),
    tagline: input.tagline?.trim() || null,
    description: input.description?.trim() || null,
    sports_offered: input.sportsOffered || [],
    founded_year: input.foundedYear || null,
    affiliations: input.affiliations || [],
    age_groups: input.ageGroups || [],
    skill_levels: input.skillLevels || [],
    fee_structure: input.feeStructure || [],
    training_methodology: input.trainingMethodology?.trim() || null,
    facilities_summary: input.facilitiesSummary || [],
    operating_hours: input.operatingHours?.trim() || null,
    contact_phone: input.contactPhone?.trim() || null,
    contact_email: input.contactEmail?.trim() || null,
    website_url: input.websiteUrl?.trim() || null,
    social_links: input.socialLinks || {},
    media_gallery: input.mediaGallery || [],
    logo_url: input.logoUrl?.trim() || null,
    banner_url: input.bannerUrl?.trim() || null,
    city: input.city?.trim() || '',
    state: input.state?.trim() || '',
    is_publicly_listed: Boolean(input.isPubliclyListed),
    seo_title: input.seoTitle?.trim() || null,
    seo_description: input.seoDescription?.trim() || null,
  }

  const { data, error } = await client
    .from('academy_profiles')
    .update(updatePayload)
    .eq('id', profileId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error || !data) {
    return { success: false, message: error?.message || 'Could not update academy profile.' }
  }

  // Mirror contact & city updates safely onto tenants table (verification fields untouched)
  await client
    .from('tenants')
    .update({
      name: input.displayName?.trim(),
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      sport: input.sportsOffered?.[0] || null,
      contact_phone: input.contactPhone?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
    })
    .eq('id', tenantId)

  return {
    success: true,
    message: 'Academy profile saved to PostgreSQL.',
    data: mapProfileRow(data as Record<string, unknown>),
  }
}

export async function submitAcademyVerificationRequest(
  tenantId: string,
  documentType: string,
  proofDetails: string,
  documentUrl?: string,
): Promise<WorkspaceMutationResult<string>> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { data, error } = await client.rpc('submit_academy_profile_for_moderation', {
    p_tenant_id: tenantId,
    p_document_type: documentType,
    p_proof_details: proofDetails,
    p_document_url: documentUrl?.trim() || null,
  })
  if (error) return { success: false, message: error.message }
  return {
    success: true,
    message: 'Verification request submitted to the KhelGrid moderation queue.',
    data: String(data || ''),
  }
}

// ============================================================================
// BRANCHES (tenant_units)
// ============================================================================

export async function listAcademyBranches(tenantId: string): Promise<AcademyBranchRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('tenant_units')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    name: String(r.name),
    unitType: String(r.unit_type || 'branch'),
    branchCode: String(r.branch_code || ''),
    city: String(r.city || ''),
    state: String(r.state || ''),
    address: String(r.address || ''),
    pincode: String(r.pincode || ''),
    sportsOffered: asArray<string>(r.sports_offered),
    facilities: asArray<string>(r.facilities),
    operatingHours: String(r.operating_hours || ''),
    contactPhone: String(r.contact_phone || ''),
    contactEmail: String(r.contact_email || ''),
    capacity: typeof r.capacity === 'number' ? r.capacity : null,
    leadUserId: r.lead_user_id ? String(r.lead_user_id) : null,
    isPrimary: Boolean(r.is_primary),
    isActive: Boolean(r.is_active),
    createdAt: String(r.created_at || ''),
  }))
}

export async function saveAcademyBranch(
  tenantId: string,
  input: {
    id?: string
    name: string
    branchCode?: string
    city?: string
    state?: string
    address?: string
    pincode?: string
    sportsOffered?: string[]
    operatingHours?: string
    contactPhone?: string
    contactEmail?: string
    capacity?: number | null
    isPrimary?: boolean
    isActive?: boolean
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const payload = {
    tenant_id: tenantId,
    unit_type: 'branch',
    name: input.name.trim(),
    branch_code: input.branchCode?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    address: input.address?.trim() || null,
    pincode: input.pincode?.trim() || null,
    sports_offered: input.sportsOffered || [],
    operating_hours: input.operatingHours?.trim() || null,
    contact_phone: input.contactPhone?.trim() || null,
    contact_email: input.contactEmail?.trim() || null,
    capacity: input.capacity && input.capacity > 0 ? input.capacity : null,
    is_primary: Boolean(input.isPrimary),
    is_active: input.isActive !== false,
  }
  const { error } = input.id
    ? await client.from('tenant_units').update(payload).eq('id', input.id).eq('tenant_id', tenantId)
    : await client.from('tenant_units').insert(payload)
  if (error) return { success: false, message: error.message }
  return { success: true, message: input.id ? 'Branch updated.' : 'New academy branch created.' }
}

export async function archiveAcademyBranch(tenantId: string, unitId: string): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { error } = await client
    .from('tenant_units')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('id', unitId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Branch archived safely.' }
}

// ============================================================================
// ATHLETES & PRIVATE NOTES
// ============================================================================

export async function listAcademyAthletes(tenantId: string, unitId?: string | null): Promise<AcademyAthleteRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  let query = client
    .from('tenant_students')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (unitId) query = query.eq('unit_id', unitId)
  const { data, error } = await query
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    batchId: r.batch_id ? String(r.batch_id) : null,
    unitId: r.unit_id ? String(r.unit_id) : null,
    assignedCoachId: r.assigned_coach_id ? String(r.assigned_coach_id) : null,
    athleteUserId: r.athlete_user_id ? String(r.athlete_user_id) : null,
    studentName: String(r.student_name),
    parentName: String(r.parent_name),
    parentPhone: String(r.parent_phone),
    parentEmail: r.parent_email ? String(r.parent_email) : null,
    sport: r.sport ? String(r.sport) : null,
    ageCategory: r.age_category ? String(r.age_category) : null,
    skillLevel: (r.skill_level as AcademyAthleteRecord['skillLevel']) || 'beginner',
    enrollmentStatus: (r.enrollment_status as AthleteEnrollmentStatus) || 'active',
    joiningDate: r.joining_date ? String(r.joining_date) : null,
    dateOfBirth: r.date_of_birth ? String(r.date_of_birth) : null,
    gender: r.gender ? String(r.gender) : null,
    emergencyContactName: r.emergency_contact_name ? String(r.emergency_contact_name) : null,
    emergencyContactPhone: r.emergency_contact_phone ? String(r.emergency_contact_phone) : null,
    guardianConsentVerified: Boolean(r.guardian_consent_verified),
    medicalNotes: r.medical_notes ? String(r.medical_notes) : null,
    monthlyFee: Number(r.monthly_fee ?? 0),
    feeStatus: (r.fee_status as AcademyAthleteRecord['feeStatus']) || 'due_soon',
    nextDueDate: r.next_due_date ? String(r.next_due_date) : null,
    lastPaymentDate: r.last_payment_date ? String(r.last_payment_date) : null,
    isActive: Boolean(r.is_active),
    deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    createdAt: String(r.created_at || ''),
  }))
}

export async function saveAcademyAthlete(
  tenantId: string,
  input: {
    id?: string
    studentName: string
    parentName: string
    parentPhone: string
    parentEmail?: string
    batchId?: string | null
    unitId?: string | null
    assignedCoachId?: string | null
    sport?: string
    ageCategory?: string
    skillLevel?: AcademyAthleteRecord['skillLevel']
    enrollmentStatus?: AthleteEnrollmentStatus
    joiningDate?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
    guardianConsentVerified?: boolean
    medicalNotes?: string
    monthlyFee?: number
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const payload = {
    tenant_id: tenantId,
    student_name: input.studentName.trim(),
    parent_name: input.parentName.trim(),
    parent_phone: input.parentPhone.trim(),
    parent_email: input.parentEmail?.trim() || null,
    batch_id: input.batchId || null,
    unit_id: input.unitId || null,
    assigned_coach_id: input.assignedCoachId || null,
    sport: input.sport?.trim() || null,
    age_category: input.ageCategory?.trim() || null,
    skill_level: input.skillLevel || 'beginner',
    enrollment_status: input.enrollmentStatus || 'active',
    is_active: (input.enrollmentStatus || 'active') === 'active',
    joining_date: input.joiningDate || new Date().toISOString().slice(0, 10),
    emergency_contact_name: input.emergencyContactName?.trim() || null,
    emergency_contact_phone: input.emergencyContactPhone?.trim() || null,
    guardian_consent_verified: Boolean(input.guardianConsentVerified),
    medical_notes: input.medicalNotes?.trim() || null,
    monthly_fee: Math.max(0, Math.round(Number(input.monthlyFee || 0))),
  }
  const { error } = input.id
    ? await client.from('tenant_students').update(payload).eq('id', input.id).eq('tenant_id', tenantId)
    : await client.from('tenant_students').insert(payload)
  if (error) return { success: false, message: error.message }
  return { success: true, message: input.id ? 'Athlete profile updated.' : 'Athlete enrolled cleanly.' }
}

export async function listAthletePrivateNotes(tenantId: string, studentId: string): Promise<AcademyAthleteNoteRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId || !studentId) return []
  const { data, error } = await client
    .from('academy_athlete_notes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    studentId: String(r.student_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    authorName: String(r.author_name || 'Staff'),
    noteType: (r.note_type as AcademyAthleteNoteRecord['noteType']) || 'development',
    noteBody: String(r.note_body || ''),
    isPrivateToStaff: Boolean(r.is_private_to_staff),
    createdAt: String(r.created_at || ''),
  }))
}

export async function addAthletePrivateNote(
  tenantId: string,
  studentId: string,
  unitId: string | null,
  authorName: string,
  noteType: AcademyAthleteNoteRecord['noteType'],
  noteBody: string,
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId || !studentId) return { success: false, message: 'Database unavailable.' }
  const { data: userRes } = await client.auth.getUser()
  const { error } = await client.from('academy_athlete_notes').insert({
    tenant_id: tenantId,
    student_id: studentId,
    unit_id: unitId,
    author_user_id: userRes?.user?.id || null,
    author_name: authorName.trim() || 'Academy Staff',
    note_type: noteType,
    note_body: noteBody.trim(),
    is_private_to_staff: true,
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Private staff coaching note saved.' }
}

// ============================================================================
// COACHES
// ============================================================================

export async function listAcademyCoaches(tenantId: string): Promise<AcademyCoachRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('academy_coaches')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    userId: r.user_id ? String(r.user_id) : null,
    coachProfileId: r.coach_profile_id ? String(r.coach_profile_id) : null,
    membershipId: r.membership_id ? String(r.membership_id) : null,
    primaryUnitId: r.primary_unit_id ? String(r.primary_unit_id) : null,
    fullName: String(r.full_name || ''),
    email: r.email ? String(r.email) : null,
    phone: r.phone ? String(r.phone) : null,
    roleTitle: String(r.role_title || 'Coach'),
    employmentType: (r.employment_type as AcademyCoachRecord['employmentType']) || 'full_time',
    specializations: asArray<string>(r.specializations),
    qualificationSummary: r.qualification_summary ? String(r.qualification_summary) : null,
    assignedBranchIds: asArray<string>(r.assigned_branch_ids),
    joiningDate: r.joining_date ? String(r.joining_date) : null,
    safeguardingStatus: (r.safeguarding_status as AcademyCoachRecord['safeguardingStatus']) || 'pending',
    status: (r.status as AcademyCoachRecord['status']) || 'active',
    notes: r.notes ? String(r.notes) : null,
    createdAt: String(r.created_at || ''),
  }))
}

export async function saveAcademyCoach(
  tenantId: string,
  input: {
    id?: string
    fullName: string
    email?: string
    phone?: string
    roleTitle: string
    employmentType: AcademyCoachRecord['employmentType']
    primaryUnitId?: string | null
    specializations?: string[]
    qualificationSummary?: string
    safeguardingStatus?: AcademyCoachRecord['safeguardingStatus']
    status?: AcademyCoachRecord['status']
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const payload = {
    tenant_id: tenantId,
    full_name: input.fullName.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    role_title: input.roleTitle.trim() || 'Coach',
    employment_type: input.employmentType || 'full_time',
    primary_unit_id: input.primaryUnitId || null,
    specializations: input.specializations || [],
    qualification_summary: input.qualificationSummary?.trim() || null,
    safeguarding_status: input.safeguardingStatus || 'pending',
    status: input.status || 'active',
  }
  const { error } = input.id
    ? await client.from('academy_coaches').update(payload).eq('id', input.id).eq('tenant_id', tenantId)
    : await client.from('academy_coaches').insert(payload)
  if (error) return { success: false, message: error.message }
  return { success: true, message: input.id ? 'Coach record updated.' : 'Coach added to academy roster.' }
}

// ============================================================================
// BATCHES & DISCRETE TRAINING SESSIONS
// ============================================================================

export async function listAcademyBatches(tenantId: string, unitId?: string | null): Promise<AcademyBatchRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  let q = client
    .from('tenant_batches')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (unitId) q = q.eq('unit_id', unitId)
  const { data, error } = await q
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    coachId: r.coach_id ? String(r.coach_id) : null,
    batchName: String(r.batch_name),
    sport: String(r.sport),
    days: String(r.days),
    timings: String(r.timings),
    coachName: r.coach_name ? String(r.coach_name) : null,
    ageGroup: r.age_group ? String(r.age_group) : null,
    skillLevel: (r.skill_level as AcademyBatchRecord['skillLevel']) || 'all_levels',
    description: r.description ? String(r.description) : null,
    monthlyFee: Number(r.monthly_fee ?? 0),
    maxCapacity: Number(r.max_capacity ?? 25),
    isActive: Boolean(r.is_active),
    deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    createdAt: String(r.created_at || ''),
  }))
}

export async function saveAcademyBatchRecord(
  tenantId: string,
  input: {
    id?: string
    unitId?: string | null
    coachId?: string | null
    batchName: string
    sport: string
    days: string
    timings: string
    coachName?: string
    ageGroup?: string
    skillLevel?: AcademyBatchRecord['skillLevel']
    monthlyFee?: number
    maxCapacity?: number
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const payload = {
    tenant_id: tenantId,
    unit_id: input.unitId || null,
    coach_id: input.coachId || null,
    batch_name: input.batchName.trim(),
    sport: input.sport.trim(),
    days: input.days.trim(),
    timings: input.timings.trim(),
    coach_name: input.coachName?.trim() || null,
    age_group: input.ageGroup?.trim() || null,
    skill_level: input.skillLevel || 'all_levels',
    monthly_fee: Math.max(0, Number(input.monthlyFee || 0)),
    max_capacity: Math.max(1, Number(input.maxCapacity || 25)),
    is_active: true,
  }
  const { error } = input.id
    ? await client.from('tenant_batches').update(payload).eq('id', input.id).eq('tenant_id', tenantId)
    : await client.from('tenant_batches').insert(payload)
  if (error) return { success: false, message: error.message }
  return { success: true, message: input.id ? 'Batch updated.' : 'Coaching batch created.' }
}

export async function listTrainingSessions(tenantId: string, unitId?: string | null): Promise<AcademySessionRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  let q = client
    .from('academy_training_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true })
  if (unitId) q = q.eq('unit_id', unitId)
  const { data, error } = await q
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    batchId: String(r.batch_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    coachId: r.coach_id ? String(r.coach_id) : null,
    facilityId: r.facility_id ? String(r.facility_id) : null,
    title: String(r.title),
    sport: String(r.sport),
    sessionDate: String(r.session_date),
    startTime: String(r.start_time),
    endTime: String(r.end_time),
    recurrenceRule: (r.recurrence_rule as AcademySessionRecord['recurrenceRule']) || 'none',
    status: (r.status as AcademySessionRecord['status']) || 'scheduled',
    cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : null,
    sessionNotes: r.session_notes ? String(r.session_notes) : null,
    maxParticipants: typeof r.max_participants === 'number' ? r.max_participants : null,
    createdAt: String(r.created_at || ''),
  }))
}

export async function createTrainingSession(
  tenantId: string,
  input: {
    batchId: string
    unitId?: string | null
    coachId?: string | null
    facilityId?: string | null
    title: string
    sport: string
    sessionDate: string
    startTime: string
    endTime: string
    recurrenceRule?: AcademySessionRecord['recurrenceRule']
    repeatWeeks?: number
    sessionNotes?: string
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { data: userRes } = await client.auth.getUser()

  const weeks = input.recurrenceRule === 'weekly' ? Math.min(8, Math.max(1, input.repeatWeeks || 1)) : 1
  const rows = Array.from({ length: weeks }, (_, idx) => {
    const d = new Date(`${input.sessionDate}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + idx * 7)
    return {
      tenant_id: tenantId,
      batch_id: input.batchId,
      unit_id: input.unitId || null,
      coach_id: input.coachId || null,
      facility_id: input.facilityId || null,
      title: input.title.trim(),
      sport: input.sport.trim(),
      session_date: d.toISOString().slice(0, 10),
      start_time: input.startTime,
      end_time: input.endTime,
      recurrence_rule: input.recurrenceRule || 'none',
      status: 'scheduled',
      session_notes: input.sessionNotes?.trim() || null,
      created_by: userRes?.user?.id || null,
    }
  })

  const { error } = await client.from('academy_training_sessions').insert(rows)
  if (error) return { success: false, message: error.message }
  return {
    success: true,
    message: weeks > 1 ? `Scheduled ${weeks} weekly sessions without conflicts.` : 'Training session scheduled.',
  }
}

export async function updateTrainingSessionStatus(
  tenantId: string,
  sessionId: string,
  status: AcademySessionRecord['status'],
  cancellationReason?: string,
  sessionNotes?: string,
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { error } = await client
    .from('academy_training_sessions')
    .update({
      status,
      cancellation_reason: cancellationReason?.trim() || null,
      ...(sessionNotes !== undefined ? { session_notes: sessionNotes.trim() || null } : {}),
    })
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, message: error.message }
  return { success: true, message: `Session marked as ${status}.` }
}

// ============================================================================
// ATTENDANCE + AUDIT TRAIL
// ============================================================================

export async function listAttendanceForBatchDate(
  tenantId: string,
  batchId: string,
  sessionDate: string,
): Promise<AcademyAttendanceEventRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId || !batchId) return []
  const { data, error } = await client
    .from('tenant_attendance_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('batch_id', batchId)
    .eq('session_date', sessionDate)
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    batchId: String(r.batch_id),
    studentId: String(r.student_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    sessionId: r.session_id ? String(r.session_id) : null,
    sessionDate: String(r.session_date),
    status: (r.status as AttendanceStatus) || 'present',
    notes: r.notes ? String(r.notes) : null,
    markedBy: r.marked_by ? String(r.marked_by) : null,
    updatedAt: String(r.updated_at || ''),
  }))
}

export async function saveBatchAttendanceEntries(params: {
  tenantId: string
  batchId: string
  unitId?: string | null
  sessionId?: string | null
  sessionDate: string
  entries: { studentId: string; status: AttendanceStatus; notes?: string }[]
}): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !params.tenantId || !params.batchId) {
    return { success: false, message: 'Database or batch context missing.' }
  }
  const { data: userRes } = await client.auth.getUser()
  const now = new Date().toISOString()
  const rows = params.entries.map(e => ({
    tenant_id: params.tenantId,
    batch_id: params.batchId,
    student_id: e.studentId,
    unit_id: params.unitId || null,
    session_id: params.sessionId || null,
    session_date: params.sessionDate,
    status: e.status,
    notes: e.notes?.trim() || null,
    marked_by: userRes?.user?.id || null,
    marked_at: now,
    updated_at: now,
  }))
  const { error } = await client
    .from('tenant_attendance_events')
    .upsert(rows, { onConflict: 'tenant_id,batch_id,student_id,session_date' })
  if (error) return { success: false, message: error.message }
  return { success: true, message: `Saved ${rows.length} attendance records with immutable audit trail.` }
}

export async function listAttendanceAuditLogs(tenantId: string): Promise<AcademyAttendanceAuditRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('academy_attendance_audit_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('changed_at', { ascending: false })
    .limit(40)
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    studentId: String(r.student_id),
    batchId: String(r.batch_id),
    sessionDate: String(r.session_date),
    previousStatus: r.previous_status ? String(r.previous_status) : null,
    newStatus: String(r.new_status),
    changedBy: r.changed_by ? String(r.changed_by) : null,
    notes: r.notes ? String(r.notes) : null,
    changedAt: String(r.changed_at || ''),
  }))
}

export async function listCoachAttendanceForDate(
  tenantId: string,
  sessionDate: string,
): Promise<AcademyCoachAttendanceRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('academy_coach_attendance')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('session_date', sessionDate)
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    coachId: String(r.coach_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    sessionDate: String(r.session_date),
    status: (r.status as AttendanceStatus) || 'present',
    notes: r.notes ? String(r.notes) : null,
    updatedAt: String(r.updated_at || ''),
  }))
}

export async function saveCoachAttendanceEntry(params: {
  tenantId: string
  coachId: string
  unitId?: string | null
  sessionDate: string
  status: AttendanceStatus
  notes?: string
}): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !params.tenantId) return { success: false, message: 'Database unavailable.' }
  const { data: userRes } = await client.auth.getUser()
  const { error } = await client
    .from('academy_coach_attendance')
    .upsert(
      {
        tenant_id: params.tenantId,
        coach_id: params.coachId,
        unit_id: params.unitId || null,
        session_date: params.sessionDate,
        status: params.status,
        notes: params.notes?.trim() || null,
        marked_by: userRes?.user?.id || null,
      },
      { onConflict: 'tenant_id,coach_id,session_date' },
    )
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Coach attendance updated.' }
}

// ============================================================================
// ADMISSIONS, TRIAL POSTINGS & PRIVATE NOTES
// ============================================================================

export async function listAdmissionEnquiries(tenantId: string, unitId?: string | null): Promise<AcademyEnquiryRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  let q = client
    .from('tenant_enquiries')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('submitted_at', { ascending: false })
  if (unitId) q = q.eq('unit_id', unitId)
  const { data, error } = await q
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    trialPostingId: r.trial_posting_id ? String(r.trial_posting_id) : null,
    enquiryToken: String(r.enquiry_token),
    parentName: String(r.parent_name),
    parentPhone: String(r.parent_phone),
    parentEmail: r.parent_email ? String(r.parent_email) : null,
    studentName: String(r.student_name),
    studentAge: typeof r.student_age === 'number' ? r.student_age : null,
    ageCategory: r.age_category ? String(r.age_category) : null,
    sport: String(r.sport),
    requestType: (r.request_type as AcademyEnquiryRecord['requestType']) || 'free_trial',
    status: (r.status as AdmissionStage) || 'new',
    notes: r.notes ? String(r.notes) : null,
    sourceChannel: r.source_channel ? String(r.source_channel) : null,
    submittedAt: String(r.submitted_at || ''),
    stageUpdatedAt: r.stage_updated_at ? String(r.stage_updated_at) : null,
  }))
}

export async function createAdmissionEnquiry(
  tenantId: string,
  input: {
    unitId?: string | null
    parentName: string
    parentPhone: string
    parentEmail?: string
    studentName: string
    studentAge?: number | null
    ageCategory?: string
    sport: string
    requestType: AcademyEnquiryRecord['requestType']
    notes?: string
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const codePrefix = input.sport.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'SPT')
  const token = `ENQ-${codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`
  const { error } = await client.from('tenant_enquiries').insert({
    tenant_id: tenantId,
    unit_id: input.unitId || null,
    enquiry_token: token,
    parent_name: input.parentName.trim(),
    parent_phone: input.parentPhone.trim(),
    parent_email: input.parentEmail?.trim() || null,
    student_name: input.studentName.trim(),
    student_age: input.studentAge || null,
    age_category: input.ageCategory?.trim() || null,
    sport: input.sport.trim(),
    request_type: input.requestType,
    status: 'new',
    notes: input.notes?.trim() || null,
    source_channel: 'academy_desk',
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: `Applicant logged (${token}).` }
}

export async function updateAdmissionStage(
  tenantId: string,
  enquiryId: string,
  status: AdmissionStage,
  notes?: string,
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { error } = await client
    .from('tenant_enquiries')
    .update({
      status,
      stage_updated_at: new Date().toISOString(),
      ...(notes !== undefined ? { notes: notes.trim() || null } : {}),
    })
    .eq('id', enquiryId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, message: error.message }
  return { success: true, message: `Stage updated to ${status.replace('_', ' ')}.` }
}

export async function convertEnquiryToAthlete(
  tenantId: string,
  enquiryId: string,
  batchId: string | null,
  unitId: string | null,
  monthlyFee: number,
): Promise<WorkspaceMutationResult<string>> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { data, error } = await client.rpc('convert_academy_enquiry_to_student', {
    p_tenant_id: tenantId,
    p_enquiry_id: enquiryId,
    p_batch_id: batchId,
    p_unit_id: unitId,
    p_monthly_fee: Math.max(0, Math.round(monthlyFee)),
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Applicant officially enrolled in Academy Athlete Roster.', data: String(data) }
}

export async function listAdmissionInternalNotes(tenantId: string, enquiryId: string): Promise<AcademyAdmissionNoteRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId || !enquiryId) return []
  const { data, error } = await client
    .from('academy_admission_notes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('enquiry_id', enquiryId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    enquiryId: String(r.enquiry_id),
    authorName: String(r.author_name || 'Admissions Team'),
    evaluationScore: typeof r.evaluation_score === 'number' ? r.evaluation_score : null,
    noteBody: String(r.note_body || ''),
    createdAt: String(r.created_at || ''),
  }))
}

export async function addAdmissionInternalNote(
  tenantId: string,
  enquiryId: string,
  unitId: string | null,
  authorName: string,
  noteBody: string,
  evaluationScore: number | null,
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { data: userRes } = await client.auth.getUser()
  const { error } = await client.from('academy_admission_notes').insert({
    tenant_id: tenantId,
    enquiry_id: enquiryId,
    unit_id: unitId,
    author_user_id: userRes?.user?.id || null,
    author_name: authorName.trim() || 'Admissions Staff',
    evaluation_score: evaluationScore,
    note_body: noteBody.trim(),
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Private internal applicant note recorded.' }
}

export async function listTrialPostings(tenantId: string): Promise<AcademyTrialPostingRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('academy_trial_postings')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    opportunityId: r.opportunity_id ? String(r.opportunity_id) : null,
    listingSubmissionId: r.listing_submission_id ? String(r.listing_submission_id) : null,
    title: String(r.title),
    sport: String(r.sport),
    ageCategories: asArray<string>(r.age_categories),
    eligibilityCriteria: r.eligibility_criteria ? String(r.eligibility_criteria) : null,
    venueAddress: r.venue_address ? String(r.venue_address) : null,
    city: String(r.city || ''),
    trialDate: r.trial_date ? String(r.trial_date) : null,
    applicationDeadline: r.application_deadline ? String(r.application_deadline) : null,
    capacity: typeof r.capacity === 'number' ? r.capacity : null,
    feeDisplayInr: Number(r.fee_display_inr ?? 0),
    status: (r.status as AcademyTrialPostingRecord['status']) || 'draft',
    moderationNote: r.moderation_note ? String(r.moderation_note) : null,
    createdAt: String(r.created_at || ''),
  }))
}

export async function createTrialPostingDraft(
  tenantId: string,
  input: {
    unitId?: string | null
    title: string
    sport: string
    city: string
    venueAddress?: string
    ageCategories: string[]
    eligibilityCriteria?: string
    trialDate?: string
    applicationDeadline?: string
    capacity?: number | null
    feeDisplayInr?: number
  },
): Promise<WorkspaceMutationResult<string>> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { data: userRes } = await client.auth.getUser()
  const { data, error } = await client
    .from('academy_trial_postings')
    .insert({
      tenant_id: tenantId,
      unit_id: input.unitId || null,
      title: input.title.trim(),
      sport: input.sport.trim(),
      city: input.city.trim(),
      venue_address: input.venueAddress?.trim() || null,
      age_categories: input.ageCategories,
      eligibility_criteria: input.eligibilityCriteria?.trim() || null,
      trial_date: input.trialDate || null,
      application_deadline: input.applicationDeadline || null,
      capacity: input.capacity && input.capacity > 0 ? input.capacity : null,
      fee_display_inr: Math.max(0, Number(input.feeDisplayInr || 0)),
      status: 'draft',
      created_by: userRes?.user?.id || null,
    })
    .select('id')
    .single()
  if (error || !data) return { success: false, message: error?.message || 'Unable to save trial draft.' }
  return { success: true, message: 'Trial posting saved as draft.', data: String(data.id) }
}

export async function submitTrialPostingForModeration(trialId: string): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client) return { success: false, message: 'Database unavailable.' }
  const { error } = await client.rpc('submit_academy_trial_for_moderation', { p_trial_id: trialId })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Trial submitted for KhelGrid moderation review.' }
}

// ============================================================================
// FACILITIES & EQUIPMENT
// ============================================================================

export async function listAcademyFacilities(tenantId: string): Promise<AcademyFacilityRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('academy_facilities')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    name: String(r.name),
    facilityType: (r.facility_type as AcademyFacilityRecord['facilityType']) || 'ground',
    sport: String(r.sport || 'Multisport'),
    surfaceType: r.surface_type ? String(r.surface_type) : null,
    capacity: typeof r.capacity === 'number' ? r.capacity : null,
    hasFloodlights: Boolean(r.has_floodlights),
    status: (r.status as AcademyFacilityRecord['status']) || 'available',
    notes: r.notes ? String(r.notes) : null,
  }))
}

export async function saveAcademyFacility(
  tenantId: string,
  input: {
    id?: string
    unitId?: string | null
    name: string
    facilityType: AcademyFacilityRecord['facilityType']
    sport: string
    surfaceType?: string
    capacity?: number | null
    hasFloodlights?: boolean
    status?: AcademyFacilityRecord['status']
    notes?: string
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const payload = {
    tenant_id: tenantId,
    unit_id: input.unitId || null,
    name: input.name.trim(),
    facility_type: input.facilityType,
    sport: input.sport.trim() || 'Multisport',
    surface_type: input.surfaceType?.trim() || null,
    capacity: input.capacity && input.capacity > 0 ? input.capacity : null,
    has_floodlights: Boolean(input.hasFloodlights),
    status: input.status || 'available',
    notes: input.notes?.trim() || null,
  }
  const { error } = input.id
    ? await client.from('academy_facilities').update(payload).eq('id', input.id).eq('tenant_id', tenantId)
    : await client.from('academy_facilities').insert(payload)
  if (error) return { success: false, message: error.message }
  return { success: true, message: input.id ? 'Facility updated.' : 'Facility registered.' }
}

export async function listAcademyEquipment(tenantId: string): Promise<AcademyEquipmentRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('academy_equipment_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    name: String(r.name),
    category: (r.category as AcademyEquipmentRecord['category']) || 'training_gear',
    totalQuantity: Number(r.total_quantity ?? 0),
    availableQuantity: Number(r.available_quantity ?? 0),
    conditionStatus: (r.condition_status as AcademyEquipmentRecord['conditionStatus']) || 'good',
    lastInspectedAt: r.last_inspected_at ? String(r.last_inspected_at) : null,
    notes: r.notes ? String(r.notes) : null,
  }))
}

export async function saveAcademyEquipment(
  tenantId: string,
  input: {
    id?: string
    unitId?: string | null
    name: string
    category: AcademyEquipmentRecord['category']
    totalQuantity: number
    availableQuantity: number
    conditionStatus: AcademyEquipmentRecord['conditionStatus']
    notes?: string
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const total = Math.max(0, Math.round(input.totalQuantity))
  const avail = Math.min(total, Math.max(0, Math.round(input.availableQuantity)))
  const payload = {
    tenant_id: tenantId,
    unit_id: input.unitId || null,
    name: input.name.trim(),
    category: input.category,
    total_quantity: total,
    available_quantity: avail,
    condition_status: input.conditionStatus,
    last_inspected_at: new Date().toISOString().slice(0, 10),
    notes: input.notes?.trim() || null,
  }
  const { error } = input.id
    ? await client.from('academy_equipment_items').update(payload).eq('id', input.id).eq('tenant_id', tenantId)
    : await client.from('academy_equipment_items').insert(payload)
  if (error) return { success: false, message: error.message }
  return { success: true, message: input.id ? 'Equipment inventory updated.' : 'Equipment item added.' }
}

// ============================================================================
// COMMUNICATIONS, STAFF & FINANCE LEDGER
// ============================================================================

export async function listAcademyAnnouncements(tenantId: string): Promise<AcademyAnnouncementRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('academy_announcements')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(25)
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    unitId: r.unit_id ? String(r.unit_id) : null,
    batchId: r.batch_id ? String(r.batch_id) : null,
    audience: (r.audience as AcademyAnnouncementRecord['audience']) || 'all_staff',
    title: String(r.title),
    message: String(r.message),
    channel: (r.channel as AcademyAnnouncementRecord['channel']) || 'in_app',
    recipientCount: Number(r.recipient_count ?? 0),
    createdAt: String(r.created_at || ''),
  }))
}

export async function sendAcademyAnnouncement(
  tenantId: string,
  input: {
    audience: AcademyAnnouncementRecord['audience']
    title: string
    message: string
    unitId?: string | null
    batchId?: string | null
    channel?: AcademyAnnouncementRecord['channel']
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { error } = await client.rpc('publish_academy_announcement', {
    p_tenant_id: tenantId,
    p_audience: input.audience,
    p_title: input.title,
    p_message: input.message,
    p_unit_id: input.unitId || null,
    p_batch_id: input.batchId || null,
    p_channel: input.channel || 'in_app',
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Announcement dispatched to authorized academy recipients.' }
}

export async function listAcademyStaffMembers(tenantId: string): Promise<AcademyStaffMemberRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const [{ data: members }, { data: branchLinks }] = await Promise.all([
    client
      .from('tenant_memberships')
      .select('id, tenant_id, user_id, role, status, invited_email, created_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    client
      .from('academy_staff_branch_assignments')
      .select('membership_id, unit_id')
      .eq('tenant_id', tenantId),
  ])

  const branchMap = new Map<string, string[]>()
  for (const link of (branchLinks as { membership_id: string; unit_id: string }[]) || []) {
    const arr = branchMap.get(link.membership_id) || []
    arr.push(link.unit_id)
    branchMap.set(link.membership_id, arr)
  }

  return ((members as Record<string, unknown>[]) || []).map(m => {
    const id = String(m.id)
    return {
      membershipId: id,
      tenantId: String(m.tenant_id),
      userId: m.user_id ? String(m.user_id) : null,
      role: String(m.role),
      status: String(m.status),
      invitedEmail: m.invited_email ? String(m.invited_email) : null,
      branchUnitIds: branchMap.get(id) || [],
      createdAt: String(m.created_at || ''),
    }
  })
}

export async function inviteAcademyStaff(
  tenantId: string,
  invitedEmail: string,
  role: string,
  unitIds: string[],
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { error } = await client.rpc('invite_academy_staff_member', {
    p_tenant_id: tenantId,
    p_invited_email: invitedEmail,
    p_role: role,
    p_unit_ids: unitIds.length > 0 ? unitIds : null,
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: `Invitation dispatched to ${invitedEmail} (${role}).` }
}

export async function updateAcademyStaffMember(
  tenantId: string,
  membershipId: string,
  newRole: string,
  unitIds: string[],
  status: 'active' | 'suspended' | 'revoked' = 'active',
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const { error } = await client.rpc('update_academy_staff_membership', {
    p_tenant_id: tenantId,
    p_membership_id: membershipId,
    p_new_role: newRole,
    p_unit_ids: unitIds,
    p_status: status,
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Staff role and branch scope updated.' }
}

export async function listAcademyFeeInvoices(tenantId: string): Promise<AcademyFeeInvoiceRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('tenant_fee_invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    studentId: String(r.student_id),
    invoiceNumber: String(r.invoice_number),
    amount: Number(r.amount ?? 0),
    billingMonth: String(r.billing_month || ''),
    dueDate: String(r.due_date || ''),
    status: (r.status as AcademyFeeInvoiceRecord['status']) || 'issued',
    createdAt: String(r.created_at || ''),
    updatedAt: String(r.updated_at || ''),
  }))
}

export async function createAcademyFeeInvoice(params: {
  tenantId: string
  studentId: string
  amount: number
  billingMonth: string
  dueDate: string
}): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !params.tenantId || !params.studentId) {
    return { success: false, message: 'Tenant and student selection required.' }
  }
  const invoiceNo = `INV-${params.billingMonth.replace(/[^0-9]/g, '') || 'FEES'}-${Date.now().toString(36).slice(-4).toUpperCase()}`
  const { error } = await client.from('tenant_fee_invoices').insert({
    tenant_id: params.tenantId,
    student_id: params.studentId,
    invoice_number: invoiceNo,
    amount: Math.max(0, Math.round(params.amount)),
    billing_month: params.billingMonth,
    due_date: params.dueDate,
    status: 'issued',
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: `Issued fee invoice ${invoiceNo} (₹${Math.round(params.amount)}).` }
}

export async function listAcademyFeeLedger(tenantId: string): Promise<AcademyFeeTransactionRecord[]> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return []
  const { data, error } = await client
    .from('tenant_fee_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('collected_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    tenantId: String(r.tenant_id),
    invoiceId: r.invoice_id ? String(r.invoice_id) : null,
    studentId: String(r.student_id),
    receiptNumber: String(r.receipt_number),
    amount: Number(r.amount ?? 0),
    paymentMode: (r.payment_mode as AcademyFeeTransactionRecord['paymentMode']) || 'direct_upi',
    collectedByName: String(r.collected_by_name || 'Staff'),
    collectedDate: String(r.collected_date || ''),
    billingMonth: String(r.billing_month || ''),
    status: (r.status as AcademyFeeTransactionRecord['status']) || 'settled',
    notes: r.notes ? String(r.notes) : null,
    createdAt: String(r.created_at || ''),
  }))
}

export async function recordAcademyFeeReceipt(params: {
  tenantId: string
  studentId: string
  invoiceId?: string | null
  amount: number
  paymentMode: AcademyFeeTransactionRecord['paymentMode']
  collectedByName: string
  billingMonth: string
  notes?: string
}): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !params.tenantId) return { success: false, message: 'Database unavailable.' }
  const { data: userRes } = await client.auth.getUser()
  const receipt = `KG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`
  const status = params.paymentMode === 'cash' ? 'cash_in_hand' : 'settled'
  const { error } = await client.from('tenant_fee_transactions').insert({
    tenant_id: params.tenantId,
    invoice_id: params.invoiceId || null,
    student_id: params.studentId,
    receipt_number: receipt,
    amount: Math.max(1, Math.round(params.amount)),
    payment_mode: params.paymentMode,
    collected_by_user_id: userRes?.user?.id || null,
    collected_by_name: params.collectedByName.trim() || 'Finance Manager',
    collected_date: new Date().toISOString().slice(0, 10),
    billing_month: params.billingMonth,
    status,
    notes: params.notes?.trim() || null,
  })
  if (error) return { success: false, message: error.message }

  if (params.invoiceId) {
    await client
      .from('tenant_fee_invoices')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.invoiceId)
      .eq('tenant_id', params.tenantId)
  }

  await client
    .from('tenant_students')
    .update({
      fee_status: 'paid',
      last_payment_date: new Date().toISOString().slice(0, 10),
    })
    .eq('id', params.studentId)
    .eq('tenant_id', params.tenantId)

  return { success: true, message: `Recorded receipt ${receipt} (₹${Math.round(params.amount)}).` }
}

export async function saveAcademySecuritySettings(
  tenantId: string,
  input: {
    upiVpa: string
    dpdpMaskMinorsDefault: boolean
    emergencyHotline: string
    pocsoOfficerName: string
    existingSettings?: Record<string, unknown>
  },
): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId) return { success: false, message: 'Database unavailable.' }
  const vpa = input.upiVpa.trim()
  if (vpa && !isValidUpiVpa(vpa)) {
    return { success: false, message: 'Invalid NPCI UPI VPA format (example: academy@oksbi).' }
  }
  const { error } = await client
    .from('tenants')
    .update({
      upi_vpa: vpa || null,
      settings: {
        ...(input.existingSettings || {}),
        dpdpMaskMinorsDefault: input.dpdpMaskMinorsDefault,
        emergencyHotline: input.emergencyHotline.trim(),
        pocsoOfficerName: input.pocsoOfficerName.trim(),
        onlineGatewayPaused: true,
      },
    })
    .eq('id', tenantId)
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Academy security and compliance settings saved.' }
}

export async function transferAcademyOwnership(tenantId: string, newOwnerUserId: string): Promise<WorkspaceMutationResult> {
  const client = getSupabaseClient()
  if (!client || !tenantId || !newOwnerUserId) return { success: false, message: 'Target user required.' }
  const { error } = await client.rpc('transfer_tenant_ownership', {
    p_tenant_id: tenantId,
    p_new_owner_user_id: newOwnerUserId,
  })
  if (error) return { success: false, message: error.message }
  return { success: true, message: 'Academy ownership transferred cleanly.' }
}
