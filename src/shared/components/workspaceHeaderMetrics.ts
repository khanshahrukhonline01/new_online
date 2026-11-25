import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import type { WorkspaceSnapshotInput } from './workspaceHeaderEngine'

function readJsonArrayLength(key: string): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

function readSportsCvFieldCount(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0
  try {
    const raw = window.localStorage.getItem('khelgrid_cv_draft_v2')
    if (!raw) return 0
    const cv = JSON.parse(raw) as Record<string, unknown>
    if (!cv || typeof cv !== 'object') return 0
    const coreKeys = [
      'fullName',
      'primarySport',
      'city',
      'ageCategory',
      'playingPosition',
      'bio',
      'achievements',
      'stats',
    ]
    return coreKeys.filter(k => {
      const val = cv[k]
      if (Array.isArray(val)) return val.length > 0
      if (typeof val === 'string') return val.trim().length > 0
      return Boolean(val)
    }).length
  } catch {
    return 0
  }
}

function readLatestVerificationStatus(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem('khelgrid_verification_claims')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const sorted = [...parsed].sort((a, b) =>
      String(b?.submittedAt || '').localeCompare(String(a?.submittedAt || '')),
    )
    const status = sorted[0]?.status
    return typeof status === 'string' ? status : null
  } catch {
    return null
  }
}

export function readWorkspaceSnapshot(params: {
  authUser: AuthUserProfile | null
  savedCount: number
  unreadNotifCount: number
  tenantCount: number
  activeTenantName?: string | null
  tenantVerificationStatus?: string | null
}): WorkspaceSnapshotInput {
  const {
    authUser,
    savedCount,
    unreadNotifCount,
    tenantCount,
    activeTenantName,
    tenantVerificationStatus,
  } = params

  const verificationStatus = tenantVerificationStatus || readLatestVerificationStatus()

  // Read only actual user-persisted records in browser storage (never invent demo metrics)
  const academyBranchesCount = readJsonArrayLength('khelgrid_academy_registered')
  const academyCoachesCount = readJsonArrayLength('khelgrid_academy_staff')
  const academyBatchesCount = readJsonArrayLength('khelgrid_academy_batches')

  const venueFacilitiesCount = readJsonArrayLength('khelgrid_turf_courts_store')
  const venueEnquiriesCount = readJsonArrayLength('khelgrid_venue_enquiries_v1')
  const venueBookingsCount = readJsonArrayLength('khelgrid_turf_bookings_store')

  const coachInquiriesCount = readJsonArrayLength('khelgrid_coach_inquiries_v1')
  const coachBatchesCount = readJsonArrayLength('khelgrid_coach_batches')

  const trialCount = readJsonArrayLength('khelgrid_tournament_list')
  const registrationCount = readJsonArrayLength('khelgrid_tournament_team_registrations')
  const liveUpdateCount = readJsonArrayLength('khelgrid_tournament_brackets')

  const creatorCampaignsCount = readJsonArrayLength('khelgrid_creator_campaigns_joined')
  const creatorReachCount = readJsonArrayLength('khelgrid_creator_deliverables')
  const creatorRewardsCount = readJsonArrayLength('khelgrid_creator_reward_ledger')

  return {
    isAuthenticated: Boolean(authUser),
    userRole: authUser?.role ?? null,
    isVerified: Boolean(authUser?.isVerified),
    tenantCount,
    activeTenantName: activeTenantName ?? null,
    savedCount,
    cvCompletedFields: readSportsCvFieldCount(),
    cvTotalFields: 8,
    unreadNotifCount,
    verificationStatus,
    academyBranchesCount,
    academyCoachesCount,
    academyBatchesCount,
    venueFacilitiesCount,
    venueEnquiriesCount,
    venueBookingsCount,
    coachCredentialsCount: verificationStatus === 'verified' ? 1 : 0,
    coachInquiriesCount,
    coachOpportunitiesCount: coachBatchesCount,
    trialCount,
    registrationCount,
    liveUpdateCount,
    creatorCampaignsCount,
    creatorReachCount,
    creatorRewardsCount,
  }
}
