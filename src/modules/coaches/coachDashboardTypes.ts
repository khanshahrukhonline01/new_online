/**
 * Canonical section taxonomy, navigation registry, and shared data types
 * for the KhelGrid Coach Workspace (Phases 1-10).
 */

export type CoachWorkspaceSectionId =
  | 'overview'
  | 'profile'
  | 'credentials'
  | 'athletes'
  | 'programmes'
  | 'calendar'
  | 'attendance'
  | 'assessments'
  | 'video-analysis'
  | 'academy'
  | 'teams'
  | 'venues'
  | 'messages'
  | 'opportunities'
  | 'documents'
  | 'reports'
  | 'reviews'
  | 'services'
  | 'notifications'
  | 'settings'

export interface CoachWorkspaceNavItem {
  id: CoachWorkspaceSectionId
  label: string
  pathSegment: string
  group: 'foundation' | 'coaching' | 'network' | 'trust'
  phase: number
  phaseReady: boolean
  icon:
    | 'chart'
    | 'user-round'
    | 'shield-check'
    | 'users'
    | 'calendar'
    | 'clock'
    | 'check-circle'
    | 'award'
    | 'play'
    | 'building'
    | 'map-pin'
    | 'mail'
    | 'target'
    | 'file-text'
    | 'star'
    | 'sliders'
    | 'bell'
  description: string
}

export const COACH_WORKSPACE_NAV_ITEMS: readonly CoachWorkspaceNavItem[] = [
  // Phase 1 Active Foundation Modules
  {
    id: 'overview',
    label: 'Overview',
    pathSegment: '',
    group: 'foundation',
    phase: 1,
    phaseReady: true,
    icon: 'chart',
    description: 'Authorized KPI summary, quick actions, recent activity, and operational notifications.',
  },
  {
    id: 'profile',
    label: 'Professional Profile',
    pathSegment: 'profile',
    group: 'foundation',
    phase: 1,
    phaseReady: true,
    icon: 'user-round',
    description: 'Coaching identity, qualifications, previous academies, specialization, methodology, and bio.',
  },
  {
    id: 'credentials',
    label: 'Verification & Badges',
    pathSegment: 'credentials',
    group: 'foundation',
    phase: 1,
    phaseReady: true,
    icon: 'shield-check',
    description: 'Accreditation submission, review status tracking, moderator feedback, and history.',
  },
  {
    id: 'academy',
    label: 'Academy Associations',
    pathSegment: 'academy',
    group: 'network',
    phase: 1,
    phaseReady: true,
    icon: 'building',
    description: 'Authorized multi-tenant academy memberships and workspace scope.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    pathSegment: 'notifications',
    group: 'trust',
    phase: 1,
    phaseReady: true,
    icon: 'bell',
    description: 'Real user notifications across moderation, opportunities, and alerts.',
  },
  // Phase 2-4 Operational Modules (PostgreSQL + RLS backed)
  {
    id: 'athletes',
    label: 'Athletes',
    pathSegment: 'athletes',
    group: 'coaching',
    phase: 2,
    phaseReady: true,
    icon: 'users',
    description: 'Consent-gated athlete directory, invitations, transfer requests, and development notes.',
  },
  {
    id: 'programmes',
    label: 'Training Programmes',
    pathSegment: 'programmes',
    group: 'coaching',
    phase: 3,
    phaseReady: true,
    icon: 'award',
    description: 'Structured coaching curricula, exercises, athlete assignments, and progression tracking.',
  },
  {
    id: 'calendar',
    label: 'Calendar & Sessions',
    pathSegment: 'calendar',
    group: 'coaching',
    phase: 3,
    phaseReady: true,
    icon: 'calendar',
    description: 'Daily, weekly, and monthly session calendar with recurrence and verified venue slots.',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    pathSegment: 'attendance',
    group: 'coaching',
    phase: 4,
    phaseReady: true,
    icon: 'check-circle',
    description: 'Session-based roll call (Present, Absent, Late, Excused) with audit history.',
  },
  {
    id: 'assessments',
    label: 'Assessments',
    pathSegment: 'assessments',
    group: 'coaching',
    phase: 4,
    phaseReady: true,
    icon: 'award',
    description: 'Multi-category physical/technical tests and Khelo India / SAI batteries persisted in DB.',
  },
  {
    id: 'video-analysis',
    label: 'Video Analysis',
    pathSegment: 'video-analysis',
    group: 'coaching',
    phase: 8,
    phaseReady: false,
    icon: 'play',
    description: 'Private signed video uploads, technical timestamps, and athlete visual comparisons.',
  },
  {
    id: 'teams',
    label: 'Teams & Squads',
    pathSegment: 'teams',
    group: 'network',
    phase: 5,
    phaseReady: false,
    icon: 'users',
    description: 'Academy squad assignments, schedules, and role-isolated team rosters.',
  },
  {
    id: 'venues',
    label: 'Venues',
    pathSegment: 'venues',
    group: 'network',
    phase: 7,
    phaseReady: false,
    icon: 'map-pin',
    description: 'Preferred training grounds and venue directory discovery.',
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    pathSegment: 'opportunities',
    group: 'network',
    phase: 7,
    phaseReady: false,
    icon: 'target',
    description: 'Published selection trials, coaching jobs, camps, combines, and athlete recommendations.',
  },
  {
    id: 'messages',
    label: 'Messages',
    pathSegment: 'messages',
    group: 'network',
    phase: 6,
    phaseReady: false,
    icon: 'mail',
    description: 'Scoped coach-athlete, guardian, and academy announcements and direct threads.',
  },
  {
    id: 'documents',
    label: 'Documents',
    pathSegment: 'documents',
    group: 'trust',
    phase: 8,
    phaseReady: false,
    icon: 'file-text',
    description: 'Private credential certificates, qualifications, and experience documents.',
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    pathSegment: 'reports',
    group: 'trust',
    phase: 8,
    phaseReady: false,
    icon: 'chart',
    description: 'Attendance rates, programme completion, and authorized athlete progress exports.',
  },
  {
    id: 'reviews',
    label: 'Reviews & Reputation',
    pathSegment: 'reviews',
    group: 'trust',
    phase: 9,
    phaseReady: false,
    icon: 'star',
    description: 'Relationship-verified reviews and official coach responses.',
  },
  {
    id: 'services',
    label: 'Coaching Services',
    pathSegment: 'services',
    group: 'trust',
    phase: 9,
    phaseReady: false,
    icon: 'award',
    description: 'Enquiry-only service packages (platform payment collection currently paused).',
  },
  {
    id: 'settings',
    label: 'Settings',
    pathSegment: 'settings',
    group: 'trust',
    phase: 1,
    phaseReady: true,
    icon: 'sliders',
    description: 'Account privacy, notification preferences, DPDP export, and security links.',
  },
]

const VALID_SECTION_IDS = new Set<string>(COACH_WORKSPACE_NAV_ITEMS.map(item => item.id))

export function isCoachWorkspaceSection(value?: string | null): value is CoachWorkspaceSectionId {
  return Boolean(value && VALID_SECTION_IDS.has(value))
}

/** Resolves WorkspaceShell or URL sub-route segments onto a canonical CoachWorkspaceSectionId. */
export function resolveCoachSection(section?: string | null): CoachWorkspaceSectionId {
  if (!section) return 'overview'
  if (isCoachWorkspaceSection(section)) return section
  return 'overview'
}

/** Parses `/coach-dashboard/...` or `/workspace/coach/...` route URLs into section + optional entityId. */
export function resolveCoachRouteTarget(pathname?: string | null, fallbackSection?: string): {
  section: CoachWorkspaceSectionId
  itemId?: string
} {
  const clean = (pathname || '').replace(/\/+$/, '') || ''
  if (clean.startsWith('/coach-dashboard/')) {
    const rest = clean.slice('/coach-dashboard/'.length)
    const [head, second] = rest.split('/')
    if (head === 'sessions' && second) {
      return { section: 'calendar', itemId: decodeURIComponent(second) }
    }
    if (head === 'athletes' && second) {
      return { section: 'athletes', itemId: decodeURIComponent(second) }
    }
    if (head === 'programmes' && second) {
      return { section: 'programmes', itemId: decodeURIComponent(second) }
    }
    if (isCoachWorkspaceSection(head)) {
      return { section: head }
    }
  }
  return { section: resolveCoachSection(fallbackSection) }
}

/** Legacy compatibility types retained cleanly for un-migrated panel modules. */
export type CoachHubTab = CoachWorkspaceSectionId

export interface CoachSummaryStats {
  totalTrainees: number
  paidTrainees: number
  totalRevenue: number
  pendingRevenue: number
  collectionRate: number
  totalBatches: number
  newInquiriesCount: number
}

export function resolveCoachTabForSection(section?: string): CoachHubTab | null {
  if (!section) return null
  return isCoachWorkspaceSection(section) ? section : null
}
