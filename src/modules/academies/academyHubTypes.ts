import type { SiteIconName } from '../../shared/components/SiteIcon'

/**
 * Canonical section taxonomy, 7-role RBAC permission matrix, and route resolution
 * for the KhelGrid Multi-Tenant SaaS Academy Workspace.
 */

export type AcademyWorkspaceSectionId =
  | 'overview'
  | 'profile'
  | 'branches'
  | 'athletes'
  | 'coaches'
  | 'training'
  | 'attendance'
  | 'admissions'
  | 'facilities'
  | 'notifications'
  | 'reports'
  | 'staff'
  | 'fees'
  | 'settings'

/** Backward-compatible tab type alias retained for shared types cleanly */
export type AcademyHubTab = AcademyWorkspaceSectionId

export const ACADEMY_HUB_TABS: readonly AcademyWorkspaceSectionId[] = [
  'overview',
  'profile',
  'branches',
  'athletes',
  'coaches',
  'training',
  'attendance',
  'admissions',
  'facilities',
  'notifications',
  'reports',
  'staff',
  'fees',
  'settings',
]

export type CanonicalAcademyRole =
  | 'owner'
  | 'org_admin'
  | 'director'
  | 'admin'
  | 'manager'
  | 'admissions_manager'
  | 'front_desk'
  | 'head_coach'
  | 'coach'
  | 'finance_manager'
  | 'accountant'
  | 'readonly_member'
  | 'staff'
  | 'content_manager'
  | 'listing_manager'
  | 'verification_coordinator'

export type AcademyRoleTier =
  | 'academy_owner'
  | 'academy_administrator'
  | 'academy_manager'
  | 'admissions_manager'
  | 'coach_staff'
  | 'finance_manager'
  | 'readonly_staff'

export interface AcademyRoleCapabilities {
  tier: AcademyRoleTier
  label: string
  description: string
  allowedSections: readonly AcademyWorkspaceSectionId[]
  canManageProfile: boolean
  canSubmitVerification: boolean
  canManageBranches: boolean
  canManageAthletes: boolean
  canManageCoaches: boolean
  canManageTraining: boolean
  canMarkAttendance: boolean
  canManageAdmissions: boolean
  canManageFacilities: boolean
  canSendAnnouncements: boolean
  canExportReports: boolean
  canViewFinance: boolean
  canManageFinance: boolean
  canManageStaff: boolean
  canManageSettings: boolean
  canTransferOwnership: boolean
  isBranchScopedCapable: boolean
  isReadOnly: boolean
}

export const ACADEMY_ROLE_CAPABILITY_MAP: Record<AcademyRoleTier, AcademyRoleCapabilities> = {
  academy_owner: {
    tier: 'academy_owner',
    label: 'Academy Owner',
    description: 'Full SaaS academy control across all branches, finances, verification, staff, and ownership transfer.',
    allowedSections: ACADEMY_HUB_TABS,
    canManageProfile: true,
    canSubmitVerification: true,
    canManageBranches: true,
    canManageAthletes: true,
    canManageCoaches: true,
    canManageTraining: true,
    canMarkAttendance: true,
    canManageAdmissions: true,
    canManageFacilities: true,
    canSendAnnouncements: true,
    canExportReports: true,
    canViewFinance: true,
    canManageFinance: true,
    canManageStaff: true,
    canManageSettings: true,
    canTransferOwnership: true,
    isBranchScopedCapable: false,
    isReadOnly: false,
  },
  academy_administrator: {
    tier: 'academy_administrator',
    label: 'Academy Administrator',
    description: 'Manage daily academy operations, staff permissions, branches, admissions, and verification requests.',
    allowedSections: ACADEMY_HUB_TABS,
    canManageProfile: true,
    canSubmitVerification: true,
    canManageBranches: true,
    canManageAthletes: true,
    canManageCoaches: true,
    canManageTraining: true,
    canMarkAttendance: true,
    canManageAdmissions: true,
    canManageFacilities: true,
    canSendAnnouncements: true,
    canExportReports: true,
    canViewFinance: true,
    canManageFinance: true,
    canManageStaff: true,
    canManageSettings: true,
    canTransferOwnership: false,
    isBranchScopedCapable: false,
    isReadOnly: false,
  },
  academy_manager: {
    tier: 'academy_manager',
    label: 'Academy Manager',
    description: 'Manage assigned branches, athletes, coaches, schedules, facilities, and attendance records.',
    allowedSections: [
      'overview',
      'branches',
      'athletes',
      'coaches',
      'training',
      'attendance',
      'admissions',
      'facilities',
      'notifications',
      'reports',
    ],
    canManageProfile: false,
    canSubmitVerification: false,
    canManageBranches: true,
    canManageAthletes: true,
    canManageCoaches: true,
    canManageTraining: true,
    canMarkAttendance: true,
    canManageAdmissions: false,
    canManageFacilities: true,
    canSendAnnouncements: true,
    canExportReports: false,
    canViewFinance: false,
    canManageFinance: false,
    canManageStaff: false,
    canManageSettings: false,
    canTransferOwnership: false,
    isBranchScopedCapable: true,
    isReadOnly: false,
  },
  admissions_manager: {
    tier: 'admissions_manager',
    label: 'Admissions Manager',
    description: 'Manage trial postings, admission pipelines, applicant notes, and student conversion workflows.',
    allowedSections: [
      'overview',
      'athletes',
      'training',
      'admissions',
      'notifications',
      'reports',
    ],
    canManageProfile: false,
    canSubmitVerification: false,
    canManageBranches: false,
    canManageAthletes: true,
    canManageCoaches: false,
    canManageTraining: false,
    canMarkAttendance: false,
    canManageAdmissions: true,
    canManageFacilities: false,
    canSendAnnouncements: true,
    canExportReports: false,
    canViewFinance: false,
    canManageFinance: false,
    canManageStaff: false,
    canManageSettings: false,
    canTransferOwnership: false,
    isBranchScopedCapable: true,
    isReadOnly: false,
  },
  coach_staff: {
    tier: 'coach_staff',
    label: 'Coach / Training Staff',
    description: 'View assigned athletes, manage training schedules, mark daily attendance, and log coaching notes.',
    allowedSections: [
      'overview',
      'athletes',
      'coaches',
      'training',
      'attendance',
      'facilities',
      'notifications',
      'reports',
    ],
    canManageProfile: false,
    canSubmitVerification: false,
    canManageBranches: false,
    canManageAthletes: false,
    canManageCoaches: false,
    canManageTraining: true,
    canMarkAttendance: true,
    canManageAdmissions: false,
    canManageFacilities: false,
    canSendAnnouncements: false,
    canExportReports: false,
    canViewFinance: false,
    canManageFinance: false,
    canManageStaff: false,
    canManageSettings: false,
    canTransferOwnership: false,
    isBranchScopedCapable: true,
    isReadOnly: false,
  },
  finance_manager: {
    tier: 'finance_manager',
    label: 'Finance Manager',
    description: 'Access fee ledger records, direct UPI setup visibility, and export financial reconciliation reports.',
    allowedSections: [
      'overview',
      'athletes',
      'fees',
      'reports',
      'notifications',
    ],
    canManageProfile: false,
    canSubmitVerification: false,
    canManageBranches: false,
    canManageAthletes: false,
    canManageCoaches: false,
    canManageTraining: false,
    canMarkAttendance: false,
    canManageAdmissions: false,
    canManageFacilities: false,
    canSendAnnouncements: false,
    canExportReports: true,
    canViewFinance: true,
    canManageFinance: true,
    canManageStaff: false,
    canManageSettings: false,
    canTransferOwnership: false,
    isBranchScopedCapable: false,
    isReadOnly: false,
  },
  readonly_staff: {
    tier: 'readonly_staff',
    label: 'Read-Only Staff',
    description: 'View-only operational access across authorized non-financial modules.',
    allowedSections: [
      'overview',
      'athletes',
      'coaches',
      'training',
      'attendance',
      'admissions',
      'facilities',
      'notifications',
      'reports',
    ],
    canManageProfile: false,
    canSubmitVerification: false,
    canManageBranches: false,
    canManageAthletes: false,
    canManageCoaches: false,
    canManageTraining: false,
    canMarkAttendance: false,
    canManageAdmissions: false,
    canManageFacilities: false,
    canSendAnnouncements: false,
    canExportReports: false,
    canViewFinance: false,
    canManageFinance: false,
    canManageStaff: false,
    canManageSettings: false,
    canTransferOwnership: false,
    isBranchScopedCapable: true,
    isReadOnly: true,
  },
}

export function resolveAcademyRoleTier(role?: string | null): AcademyRoleTier {
  const normalized = (role || '').toLowerCase()
  if (normalized === 'owner') return 'academy_owner'
  if (normalized === 'org_admin' || normalized === 'director' || normalized === 'admin') {
    return 'academy_administrator'
  }
  if (normalized === 'manager') return 'academy_manager'
  if (normalized === 'admissions_manager' || normalized === 'front_desk' || normalized === 'verification_coordinator') {
    return 'admissions_manager'
  }
  if (normalized === 'head_coach' || normalized === 'coach') return 'coach_staff'
  if (normalized === 'finance_manager' || normalized === 'accountant') return 'finance_manager'
  return 'readonly_staff'
}

export function getAcademyRoleCapabilities(role?: string | null): AcademyRoleCapabilities {
  return ACADEMY_ROLE_CAPABILITY_MAP[resolveAcademyRoleTier(role)]
}

export function canAccessAcademySection(role: string | null | undefined, section: AcademyWorkspaceSectionId): boolean {
  const caps = getAcademyRoleCapabilities(role)
  return caps.allowedSections.includes(section)
}

export interface AcademyWorkspaceNavItem {
  id: AcademyWorkspaceSectionId
  label: string
  pathSegment: string
  group: 'operations' | 'people' | 'growth' | 'governance'
  icon: SiteIconName
  description: string
}

export const ACADEMY_WORKSPACE_NAV_ITEMS: readonly AcademyWorkspaceNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    pathSegment: '',
    group: 'operations',
    icon: 'chart',
    description: 'Live multi-branch academy summary, recent applications, and upcoming sessions.',
  },
  {
    id: 'profile',
    label: 'Academy Profile',
    pathSegment: 'profile',
    group: 'operations',
    icon: 'building',
    description: 'Public listing details, sports, fee info, media gallery, preview & verification.',
  },
  {
    id: 'branches',
    label: 'Branches',
    pathSegment: 'branches',
    group: 'operations',
    icon: 'map-pin',
    description: 'Training centres, campus codes, branch managers, and capacity allocation.',
  },
  {
    id: 'athletes',
    label: 'Athletes',
    pathSegment: 'athletes',
    group: 'people',
    icon: 'users',
    description: 'Enrolled athletes roster, branch/batch filters, detail view & private coaching notes.',
  },
  {
    id: 'coaches',
    label: 'Coaches',
    pathSegment: 'coaches',
    group: 'people',
    icon: 'award',
    description: 'Coaching staff linked to KhelGrid coach accounts, assignments & safeguarding.',
  },
  {
    id: 'training',
    label: 'Batches & Schedule',
    pathSegment: 'training',
    group: 'people',
    icon: 'calendar',
    description: 'Batch groups, discrete training calendar sessions, and facility/coach conflict checks.',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    pathSegment: 'attendance',
    group: 'people',
    icon: 'check-circle',
    description: 'Daily roll-call (present/absent/late/excused), coach attendance & edit audit log.',
  },
  {
    id: 'admissions',
    label: 'Trials & Admissions',
    pathSegment: 'admissions',
    group: 'growth',
    icon: 'target',
    description: 'Moderation-gated trial postings and 8-stage admissions enquiry CRM.',
  },
  {
    id: 'facilities',
    label: 'Facilities & Gear',
    pathSegment: 'facilities',
    group: 'growth',
    icon: 'venues',
    description: 'Turfs, grounds, indoor halls, and branch equipment stock & condition tracking.',
  },
  {
    id: 'notifications',
    label: 'Communications',
    pathSegment: 'notifications',
    group: 'growth',
    icon: 'bell',
    description: 'Target announcements to staff, coaches, or parents via KhelGrid & WhatsApp links.',
  },
  {
    id: 'reports',
    label: 'Reports & Exports',
    pathSegment: 'reports',
    group: 'governance',
    icon: 'file-text',
    description: 'Attendance trends, admissions funnel analytics, branch loads & UTF-8 CSV exports.',
  },
  {
    id: 'fees',
    label: 'Fee Ledger (UPI)',
    pathSegment: 'fees',
    group: 'governance',
    icon: 'wallet',
    description: 'Fee tracking & direct zero-commission UPI ledger (online gateway paused).',
  },
  {
    id: 'staff',
    label: 'Staff & Roles',
    pathSegment: 'staff',
    group: 'governance',
    icon: 'shield-check',
    description: '7-role RBAC staff invitations, branch scoping, and deactivation controls.',
  },
  {
    id: 'settings',
    label: 'Settings & Security',
    pathSegment: 'settings',
    group: 'governance',
    icon: 'sliders',
    description: 'DPDP minor privacy, UPI VPA config, audit logs, and owner transfer.',
  },
]

const PATH_TO_SECTION: Record<string, AcademyWorkspaceSectionId> = {
  overview: 'overview',
  profile: 'profile',
  branches: 'branches',
  athletes: 'athletes',
  students: 'athletes',
  coaches: 'coaches',
  training: 'training',
  batches: 'training',
  sessions: 'training',
  attendance: 'attendance',
  admissions: 'admissions',
  trials: 'admissions',
  leads: 'admissions',
  facilities: 'facilities',
  equipment: 'facilities',
  notifications: 'notifications',
  reports: 'reports',
  staff: 'staff',
  fees: 'fees',
  ledger: 'fees',
  settings: 'settings',
  'audit-logs': 'settings',
  audit_logs: 'settings',
}

export function resolveAcademyTabForSection(section?: string): AcademyWorkspaceSectionId | null {
  if (!section) return null
  return PATH_TO_SECTION[section.toLowerCase()] ?? null
}

export function resolveAcademyRouteTarget(
  pathname: string,
  workspaceSection?: string,
): { section: AcademyWorkspaceSectionId; detailId: string | null } {
  const clean = (pathname || '').split('?')[0].replace(/\/+$/, '')
  if (clean.startsWith('/academy-hub/')) {
    const rest = clean.slice('/academy-hub/'.length).split('/').filter(Boolean)
    const mapped = resolveAcademyTabForSection(rest[0])
    if (mapped) {
      return {
        section: mapped,
        detailId: rest[1] || null,
      }
    }
  }
  const sectionMapped = resolveAcademyTabForSection(workspaceSection)
  return { section: sectionMapped ?? 'overview', detailId: null }
}
