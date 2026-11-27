import type { AuthUserProfile } from '../../integrations/supabase/auth-client'
import {
  EMPTY_WORKSPACE_SNAPSHOT,
  type WorkspaceSnapshotInput,
} from './workspaceHeaderEngine'

export interface ReadWorkspaceSnapshotParams {
  authUser: AuthUserProfile | null
  savedCount: number
  unreadNotifCount: number
  tenantCount: number
  activeTenantName?: string | null
  tenantVerificationStatus?: string | null
}

function readJsonArrayLength(key: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return 0
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

function readJsonObject<T extends Record<string, unknown>>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as T
    }
    return null
  } catch {
    return null
  }
}

function countPopulatedCvFields(authUser: AuthUserProfile | null): { completed: number; total: number } {
  const total = EMPTY_WORKSPACE_SNAPSHOT.cvTotalFields
  const storedCv =
    readJsonObject<Record<string, unknown>>('khelgrid_sports_cv_v1') ||
    readJsonObject<Record<string, unknown>>('khelgrid_sports_cv_draft')

  if (storedCv) {
    const keys = [
      'fullName',
      'sport',
      'city',
      'position',
      'ageGroup',
      'bio',
      'achievements',
      'academy',
    ]
    const completed = keys.reduce((acc, field) => {
      const value = storedCv[field]
      if (typeof value === 'string' && value.trim().length > 0) return acc + 1
      if (Array.isArray(value) && value.length > 0) return acc + 1
      return acc
    }, 0)
    return { completed: Math.min(total, completed), total }
  }

  if (!authUser) return { completed: 0, total }

  let baseline = 0
  if (authUser.fullName?.trim()) baseline += 1
  if (authUser.email?.trim()) baseline += 1
  if (authUser.city?.trim()) baseline += 1
  if (authUser.preferredSports && authUser.preferredSports.length > 0) baseline += 1
  if (authUser.bio?.trim()) baseline += 1
  return { completed: Math.min(total, baseline), total }
}

/**
 * Aggregates lightweight, SSR-safe workspace header KPI metrics from live auth/tenant
 * state and persisted browser workspace records.
 */
export function readWorkspaceSnapshot({
  authUser,
  savedCount,
  unreadNotifCount,
  tenantCount,
  activeTenantName = null,
  tenantVerificationStatus = null,
}: ReadWorkspaceSnapshotParams): WorkspaceSnapshotInput {
  const cvStats = countPopulatedCvFields(authUser)
  const venueBookingsCount = readJsonArrayLength('khelgrid_venue_bookings')
  const partnerInquiriesCount = readJsonArrayLength('khelgrid_partner_inquiries')
  const coachInquiriesCount = readJsonArrayLength('khelgrid_coach_inquiries')
  const eventInquiriesCount = readJsonArrayLength('khelgrid_event_inquiries')

  return {
    ...EMPTY_WORKSPACE_SNAPSHOT,
    isAuthenticated: Boolean(authUser),
    userRole: authUser?.role ?? null,
    isVerified: Boolean(authUser?.isVerified || tenantVerificationStatus === 'verified'),
    tenantCount,
    activeTenantName,
    savedCount,
    cvCompletedFields: cvStats.completed,
    cvTotalFields: cvStats.total,
    unreadNotifCount,
    verificationStatus: tenantVerificationStatus ?? (authUser?.isVerified ? 'verified' : null),
    academyBranchesCount: tenantCount,
    venueEnquiriesCount: partnerInquiriesCount,
    venueBookingsCount,
    coachInquiriesCount,
    registrationCount: eventInquiriesCount,
  }
}
