import type { SiteIconName } from './SiteIcon'
import type { WorkspacePersona } from '../routing'

export type CanonicalWorkspaceId =
  | 'athlete'
  | 'academy'
  | 'venue'
  | 'coach'
  | 'trial_organiser'
  | 'creator'

export interface WorkspacePillarLink {
  id: string
  label: string
  href: string
  icon: SiteIconName
  description: string
}

export interface WorkspaceContextAction {
  id: string
  label: string
  href: string
  icon: SiteIconName
  description: string
  badge?: string
}

export interface CanonicalWorkspaceConfig {
  id: CanonicalWorkspaceId
  label: string
  shortLabel: string
  subtitle: string
  icon: SiteIconName
  shellPersona: WorkspacePersona
  workspaceHref: string
  primaryCta: {
    label: string
    href: string
    icon: SiteIconName
    title: string
  }
  pillars: readonly [WorkspacePillarLink, WorkspacePillarLink, WorkspacePillarLink]
  contextActions: readonly WorkspaceContextAction[]
}

export interface WorkspaceHeaderKpi {
  id: string
  label: string
  value: string | number
  href: string
  tone: 'emerald' | 'info' | 'warning' | 'neutral'
  title: string
}

export interface WorkspaceSnapshotInput {
  isAuthenticated: boolean
  userRole?: string | null
  isVerified?: boolean
  tenantCount: number
  activeTenantName?: string | null
  savedCount: number
  cvCompletedFields: number
  cvTotalFields: number
  unreadNotifCount: number
  verificationStatus?: string | null
  academyBranchesCount: number
  academyCoachesCount: number
  academyBatchesCount: number
  venueFacilitiesCount: number
  venueEnquiriesCount: number
  venueBookingsCount: number
  coachCredentialsCount: number
  coachInquiriesCount: number
  coachOpportunitiesCount: number
  trialCount: number
  registrationCount: number
  liveUpdateCount: number
  creatorCampaignsCount: number
  creatorReachCount: number
  creatorRewardsCount: number
}

export const EMPTY_WORKSPACE_SNAPSHOT: WorkspaceSnapshotInput = {
  isAuthenticated: false,
  userRole: null,
  isVerified: false,
  tenantCount: 0,
  activeTenantName: null,
  savedCount: 0,
  cvCompletedFields: 0,
  cvTotalFields: 8,
  unreadNotifCount: 0,
  verificationStatus: null,
  academyBranchesCount: 0,
  academyCoachesCount: 0,
  academyBatchesCount: 0,
  venueFacilitiesCount: 0,
  venueEnquiriesCount: 0,
  venueBookingsCount: 0,
  coachCredentialsCount: 0,
  coachInquiriesCount: 0,
  coachOpportunitiesCount: 0,
  trialCount: 0,
  registrationCount: 0,
  liveUpdateCount: 0,
  creatorCampaignsCount: 0,
  creatorReachCount: 0,
  creatorRewardsCount: 0,
}

export const CANONICAL_WORKSPACES: readonly CanonicalWorkspaceConfig[] = [
  {
    id: 'athlete',
    label: 'Athlete',
    shortLabel: 'Athlete',
    subtitle: 'Profiles · Applications · Activities',
    icon: 'user-round',
    shellPersona: 'athlete',
    workspaceHref: '/workspace/athlete/overview',
    primaryCta: {
      label: 'Sports CV',
      href: '/sports-cv',
      icon: 'sports-cv',
      title: 'Build or update your KhelGrid Sports CV',
    },
    pillars: [
      {
        id: 'profiles',
        label: 'Profiles',
        href: '/workspace/athlete/profile',
        icon: 'user-round',
        description: 'Sports CV, public PlayerCard & visibility controls',
      },
      {
        id: 'applications',
        label: 'Applications',
        href: '/workspace/athlete/opportunities',
        icon: 'calendar-check',
        description: 'Selection trials, academy enquiries & submissions',
      },
      {
        id: 'activities',
        label: 'Activities',
        href: '/workspace/athlete/overview',
        icon: 'activity',
        description: 'Bookings, QR entry passes & saved deadlines',
      },
    ],
    contextActions: [
      {
        id: 'athlete-cv',
        label: 'Edit Sports CV',
        href: '/sports-cv',
        icon: 'sports-cv',
        description: 'Update bio, stats & trial eligibility dossier',
      },
      {
        id: 'athlete-passes',
        label: 'My Passes & Vouchers',
        href: '/my-passes',
        icon: 'badge-check',
        description: 'QR entry vouchers & match passbook',
      },
      {
        id: 'athlete-saved',
        label: 'Saved Deadlines',
        href: '/saved',
        icon: 'bookmark',
        description: 'Track bookmarked trials, venues & academies',
      },
      {
        id: 'athlete-parent',
        label: 'Parent & Athlete Passbook',
        href: '/parent-portal',
        icon: 'shield-check',
        description: 'Attendance & fee receipts ledger',
      },
    ],
  },
  {
    id: 'academy',
    label: 'Academy',
    shortLabel: 'Academy',
    subtitle: 'Branches · Coaches · Batches',
    icon: 'building',
    shellPersona: 'academy',
    workspaceHref: '/workspace/academy/overview',
    primaryCta: {
      label: 'Admissions Hub',
      href: '/academy-hub',
      icon: 'building',
      title: 'Open Academy Admissions & Operations Hub',
    },
    pillars: [
      {
        id: 'branches',
        label: 'Branches',
        href: '/workspace/academy/overview',
        icon: 'building',
        description: 'Campus operations, capacity & organisation units',
      },
      {
        id: 'coaches',
        label: 'Coaches',
        href: '/workspace/academy/coaches',
        icon: 'users',
        description: 'Staff roster, coach roles & credentials',
      },
      {
        id: 'batches',
        label: 'Batches',
        href: '/workspace/academy/batches',
        icon: 'calendar-check',
        description: 'Morning/evening squads, attendance & waitlists',
      },
    ],
    contextActions: [
      {
        id: 'academy-hub',
        label: 'Academy Admissions Hub',
        href: '/academy-hub',
        icon: 'building',
        description: 'Manage batches, leads & trial passes',
      },
      {
        id: 'academy-orgs',
        label: 'Organisations & Branches',
        href: '/organizations',
        icon: 'sliders',
        description: 'Multi-branch RBAC & staff invitations',
      },
      {
        id: 'academy-list',
        label: 'List Academy Free',
        href: '/submit-listing?type=academy',
        icon: 'plus',
        description: 'Submit academy profile for verification',
        badge: 'Free',
      },
    ],
  },
  {
    id: 'venue',
    label: 'Venue',
    shortLabel: 'Venue',
    subtitle: 'Facilities · Enquiries · Bookings',
    icon: 'map-pin',
    shellPersona: 'turf',
    workspaceHref: '/workspace/turf/calendar',
    primaryCta: {
      label: 'Slot Calendar',
      href: '/turf-calendar',
      icon: 'calendar-check',
      title: 'Open Turf & Facility Slot Calendar',
    },
    pillars: [
      {
        id: 'facilities',
        label: 'Facilities',
        href: '/workspace/host/facilities',
        icon: 'map-pin',
        description: 'Courts, turf pitches, lighting & maintenance locks',
      },
      {
        id: 'enquiries',
        label: 'Enquiries',
        href: '/workspace/turf/utilization',
        icon: 'mail',
        description: 'Corporate events, block leases & group requests',
      },
      {
        id: 'bookings',
        label: 'Bookings',
        href: '/workspace/turf/calendar',
        icon: 'calendar-check',
        description: 'Hourly slot grid, walk-ins & QR check-in',
      },
    ],
    contextActions: [
      {
        id: 'venue-calendar',
        label: 'Turf Slot Calendar',
        href: '/turf-calendar',
        icon: 'calendar-check',
        description: 'Manage hourly availability & maintenance locks',
      },
      {
        id: 'venue-host',
        label: 'Host & Partner Desk',
        href: '/host',
        icon: 'chart',
        description: 'Confirmed bookings & facility overview',
      },
      {
        id: 'venue-checkin',
        label: 'Gate QR Check-In',
        href: '/gate-checkin',
        icon: 'shield-check',
        description: 'Validate player & venue QR entry passes',
      },
      {
        id: 'venue-list',
        label: 'List Your Venue',
        href: '/submit-listing?type=venue',
        icon: 'plus',
        description: 'Register a turf or sports complex for free',
        badge: 'Free',
      },
    ],
  },
  {
    id: 'coach',
    label: 'Coach',
    shortLabel: 'Coach',
    subtitle: 'Profile · Credentials · Opportunities',
    icon: 'award',
    shellPersona: 'coach',
    workspaceHref: '/workspace/coach/overview',
    primaryCta: {
      label: 'Coach Hub',
      href: '/coach-dashboard',
      icon: 'award',
      title: 'Open Coach Operations Hub',
    },
    pillars: [
      {
        id: 'profile',
        label: 'Profile',
        href: '/workspace/coach/overview',
        icon: 'user-round',
        description: 'Coaching bio, sports, age groups & locations',
      },
      {
        id: 'credentials',
        label: 'Credentials',
        href: '/workspace/coach/credentials',
        icon: 'badge-check',
        description: 'NIS / Federation licenses & verification proof',
      },
      {
        id: 'opportunities',
        label: 'Opportunities',
        href: '/workspace/coach/athletes',
        icon: 'target',
        description: 'Athlete enquiries, training cohorts & combines',
      },
    ],
    contextActions: [
      {
        id: 'coach-hub',
        label: 'Coach Operations Hub',
        href: '/coach-dashboard',
        icon: 'award',
        description: 'Batches, trainee combine scores & plans',
      },
      {
        id: 'coach-verify',
        label: 'Verification Packet',
        href: '/verification',
        icon: 'shield-check',
        description: 'Submit SAI / NIS coaching accreditation',
      },
      {
        id: 'coach-list',
        label: 'Public Coach Profile',
        href: '/submit-listing?type=coach',
        icon: 'plus',
        description: 'Publish or update coach directory listing',
        badge: 'Free',
      },
    ],
  },
  {
    id: 'trial_organiser',
    label: 'Trial Organiser',
    shortLabel: 'Trials',
    subtitle: 'Trials · Registration · Updates',
    icon: 'trophy',
    shellPersona: 'tournament',
    workspaceHref: '/workspace/tournament/overview',
    primaryCta: {
      label: 'Publish Trial',
      href: '/submit-listing?type=opportunity',
      icon: 'calendar-check',
      title: 'Submit a selection trial or tournament notice for free review',
    },
    pillars: [
      {
        id: 'trials',
        label: 'Trials',
        href: '/workspace/tournament/overview',
        icon: 'trophy',
        description: 'Selection trials, combines & bracket schedules',
      },
      {
        id: 'registration',
        label: 'Registration',
        href: '/workspace/tournament/registrations',
        icon: 'users',
        description: 'Squad rosters, eligibility & participant lists',
      },
      {
        id: 'updates',
        label: 'Updates',
        href: '/workspace/tournament/brackets',
        icon: 'activity',
        description: 'Official fixtures, advisories & gate check-in',
      },
    ],
    contextActions: [
      {
        id: 'trial-ops',
        label: 'Tournament & Trial Ops',
        href: '/tournament-ops',
        icon: 'trophy',
        description: 'Fixtures, brackets & verified squad sheets',
      },
      {
        id: 'trial-checkin',
        label: 'Gate QR Check-In Desk',
        href: '/gate-checkin',
        icon: 'shield-check',
        description: 'Scan athlete passes at venue reporting desk',
      },
      {
        id: 'trial-submit',
        label: 'Submit Official Trial',
        href: '/submit-listing?type=opportunity',
        icon: 'plus',
        description: 'Publish verified federation or club selection trial',
        badge: 'Free',
      },
    ],
  },
  {
    id: 'creator',
    label: 'Creator',
    shortLabel: 'Creator',
    subtitle: 'Campaigns · Reach · Rewards',
    icon: 'sparkles',
    shellPersona: 'creator',
    workspaceHref: '/workspace/creator/overview',
    primaryCta: {
      label: 'Campaigns',
      href: '/campaigns',
      icon: 'target',
      title: 'Explore KhelGrid Sports Creator Campaigns',
    },
    pillars: [
      {
        id: 'campaigns',
        label: 'Campaigns',
        href: '/workspace/creator/campaigns',
        icon: 'target',
        description: 'Active brand & academy briefs & deliverables',
      },
      {
        id: 'reach',
        label: 'Reach',
        href: '/workspace/creator/analytics',
        icon: 'chart',
        description: 'Verified deliverable impressions & engagement',
      },
      {
        id: 'rewards',
        label: 'Rewards',
        href: '/workspace/creator/overview',
        icon: 'award',
        description: 'Deliverable review & transparent reward ledger',
      },
    ],
    contextActions: [
      {
        id: 'creator-hub',
        label: 'Creator Delivery Hub',
        href: '/creator',
        icon: 'award',
        description: 'Manage assigned deliverables & disclosures',
      },
      {
        id: 'creator-market',
        label: 'Campaign Marketplace',
        href: '/campaigns',
        icon: 'target',
        description: 'Browse verified academy & brand campaigns',
      },
      {
        id: 'creator-chronicle',
        label: 'Submit Sports Research',
        href: '/khelchronicle/submit',
        icon: 'file-text',
        description: 'Publish field reports on KhelChronicle',
      },
    ],
  },
] as const

const WORKSPACE_BY_ID = new Map<CanonicalWorkspaceId, CanonicalWorkspaceConfig>(
  CANONICAL_WORKSPACES.map(w => [w.id, w]),
)

export function isValidCanonicalWorkspaceId(value: unknown): value is CanonicalWorkspaceId {
  return typeof value === 'string' && WORKSPACE_BY_ID.has(value as CanonicalWorkspaceId)
}

export function getWorkspaceConfig(persona: CanonicalWorkspaceId): CanonicalWorkspaceConfig {
  return WORKSPACE_BY_ID.get(persona) ?? CANONICAL_WORKSPACES[0]
}

export function mapCanonicalToShellPersona(persona: CanonicalWorkspaceId): WorkspacePersona {
  return getWorkspaceConfig(persona).shellPersona
}

export function mapShellToCanonicalPersona(shellPersona: WorkspacePersona | string): CanonicalWorkspaceId {
  switch (shellPersona) {
    case 'athlete':
      return 'athlete'
    case 'academy':
    case 'organization':
      return 'academy'
    case 'turf':
    case 'host':
    case 'venue':
      return 'venue'
    case 'coach':
      return 'coach'
    case 'tournament':
    case 'trial_organiser':
      return 'trial_organiser'
    case 'creator':
      return 'creator'
    default:
      return 'athlete'
  }
}

export function resolveCanonicalPersonaFromRole(role?: string | null): CanonicalWorkspaceId {
  const normalized = (role || '').trim().toLowerCase()
  switch (normalized) {
    case 'academy':
    case 'organization':
      return 'academy'
    case 'coach':
      return 'coach'
    case 'host':
    case 'venue_owner':
    case 'venue':
    case 'turf':
      return 'venue'
    case 'tournament':
    case 'trial_organiser':
    case 'scout':
    case 'moderator':
    case 'admin':
      return 'trial_organiser'
    case 'creator':
      return 'creator'
    case 'athlete':
    case 'parent':
    case 'submitter':
    default:
      return 'athlete'
  }
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

export function resolveCanonicalPersonaFromPath(pathname: string): CanonicalWorkspaceId | null {
  const path = normalizePath(pathname)

  if (path.startsWith('/workspace/')) {
    const seg = path.slice('/workspace/'.length).split('/')[0]
    if (seg) return mapShellToCanonicalPersona(seg)
  }

  if (path === '/academy-hub' || path === '/academies/manage' || path === '/organizations' || path === '/workspaces') {
    return 'academy'
  }
  if (path === '/coach-dashboard' || path === '/coach/hub' || path === '/coach/manage') {
    return 'coach'
  }
  if (path === '/turf-calendar' || path === '/venues/manage' || path === '/turf' || path === '/host' || path === '/partner-dashboard') {
    return 'venue'
  }
  if (path === '/tournament-ops' || path === '/tournaments/manage' || path === '/tournament-management' || path === '/gate-checkin' || path === '/verify-pass') {
    return 'trial_organiser'
  }
  if (path === '/creator' || path === '/creator-hub' || path === '/campaigns' || path.startsWith('/campaigns/')) {
    return 'creator'
  }
  if (path === '/dashboard' || path === '/sports-cv' || path === '/parent-portal' || path === '/my-passes' || path === '/passes' || path === '/saved') {
    return 'athlete'
  }

  return null
}

export function resolveActiveWorkspacePersona(params: {
  path: string
  authUserRole?: string | null
  overridePersona?: CanonicalWorkspaceId | null
}): CanonicalWorkspaceId {
  const pathPersona = resolveCanonicalPersonaFromPath(params.path)
  // Explicit /workspace/:persona or legacy operational route always wins over generic role
  if (pathPersona && (normalizePath(params.path).startsWith('/workspace/') || !params.overridePersona)) {
    return pathPersona
  }
  if (params.overridePersona && isValidCanonicalWorkspaceId(params.overridePersona)) {
    return params.overridePersona
  }
  if (pathPersona) {
    return pathPersona
  }
  return resolveCanonicalPersonaFromRole(params.authUserRole)
}

export function isWorkspaceHeaderMode(params: {
  path: string
  isOperationalRoute: boolean
  isAuthenticated: boolean
  hasExplicitPersonaOverride: boolean
}): boolean {
  if (params.isOperationalRoute) return true
  if (params.hasExplicitPersonaOverride) return true
  if (params.isAuthenticated) return true
  const path = normalizePath(params.path)
  return path === '/workspace' || path.startsWith('/workspace/')
}

function formatVerificationLabel(status?: string | null, isVerified?: boolean): string {
  if (status === 'verified' || isVerified) return 'Verified'
  if (status === 'pending_review') return 'In Review'
  if (status === 'more_info_needed') return 'Needs Info'
  if (status === 'rejected') return 'Action Req'
  return 'Unverified'
}

function verificationTone(status?: string | null, isVerified?: boolean): WorkspaceHeaderKpi['tone'] {
  if (status === 'verified' || isVerified) return 'emerald'
  if (status === 'pending_review') return 'info'
  if (status === 'more_info_needed' || status === 'rejected') return 'warning'
  return 'neutral'
}

export function resolveWorkspaceHeaderKpis(
  persona: CanonicalWorkspaceId,
  snapshot: WorkspaceSnapshotInput,
): readonly WorkspaceHeaderKpi[] {
  const totalCv = snapshot.cvTotalFields > 0 ? snapshot.cvTotalFields : 8

  switch (persona) {
    case 'athlete':
      return [
        {
          id: 'athlete-cv',
          label: 'Profile',
          value: `${snapshot.cvCompletedFields}/${totalCv}`,
          href: '/sports-cv',
          tone: snapshot.cvCompletedFields >= 6 ? 'emerald' : 'info',
          title: 'Populated Sports CV fields',
        },
        {
          id: 'athlete-saved',
          label: 'Saved',
          value: snapshot.savedCount,
          href: '/saved',
          tone: snapshot.savedCount > 0 ? 'emerald' : 'neutral',
          title: 'Saved trials, venues & academies',
        },
        {
          id: 'athlete-status',
          label: 'Status',
          value: snapshot.isAuthenticated ? (snapshot.isVerified ? 'Verified' : 'Member') : 'Guest',
          href: '/workspace/athlete/overview',
          tone: snapshot.isVerified ? 'emerald' : snapshot.isAuthenticated ? 'info' : 'neutral',
          title: 'Athlete account verification status',
        },
      ]

    case 'academy':
      return [
        {
          id: 'academy-branches',
          label: 'Branches',
          value: Math.max(snapshot.tenantCount, snapshot.academyBranchesCount),
          href: '/workspace/academy/overview',
          tone: Math.max(snapshot.tenantCount, snapshot.academyBranchesCount) > 0 ? 'emerald' : 'neutral',
          title: 'Linked academy organisations & branches',
        },
        {
          id: 'academy-coaches',
          label: 'Coaches',
          value: snapshot.academyCoachesCount,
          href: '/workspace/academy/coaches',
          tone: snapshot.academyCoachesCount > 0 ? 'info' : 'neutral',
          title: 'Active coaching staff records',
        },
        {
          id: 'academy-batches',
          label: 'Batches',
          value: snapshot.academyBatchesCount,
          href: '/workspace/academy/batches',
          tone: snapshot.academyBatchesCount > 0 ? 'emerald' : 'neutral',
          title: 'Configured training batches',
        },
      ]

    case 'venue':
      return [
        {
          id: 'venue-facilities',
          label: 'Facilities',
          value: snapshot.venueFacilitiesCount,
          href: '/workspace/host/facilities',
          tone: snapshot.venueFacilitiesCount > 0 ? 'info' : 'neutral',
          title: 'Configured pitches, courts & facilities',
        },
        {
          id: 'venue-enquiries',
          label: 'Enquiries',
          value: snapshot.venueEnquiriesCount,
          href: '/workspace/turf/utilization',
          tone: snapshot.venueEnquiriesCount > 0 ? 'warning' : 'neutral',
          title: 'Venue block booking & event enquiries',
        },
        {
          id: 'venue-bookings',
          label: 'Bookings',
          value: snapshot.venueBookingsCount,
          href: '/workspace/turf/calendar',
          tone: snapshot.venueBookingsCount > 0 ? 'emerald' : 'neutral',
          title: 'Recorded slot bookings',
        },
      ]

    case 'coach':
      return [
        {
          id: 'coach-creds',
          label: 'Badge',
          value: formatVerificationLabel(snapshot.verificationStatus, snapshot.isVerified),
          href: '/workspace/coach/credentials',
          tone: verificationTone(snapshot.verificationStatus, snapshot.isVerified),
          title: 'Coaching accreditation & verification status',
        },
        {
          id: 'coach-inquiries',
          label: 'Enquiries',
          value: snapshot.coachInquiriesCount,
          href: '/workspace/coach/athletes',
          tone: snapshot.coachInquiriesCount > 0 ? 'emerald' : 'neutral',
          title: 'Athlete & parent training enquiries',
        },
        {
          id: 'coach-opps',
          label: 'Batches',
          value: snapshot.coachOpportunitiesCount,
          href: '/coach-dashboard',
          tone: snapshot.coachOpportunitiesCount > 0 ? 'info' : 'neutral',
          title: 'Active coach training cohorts',
        },
      ]

    case 'trial_organiser':
      return [
        {
          id: 'trials-active',
          label: 'Trials',
          value: snapshot.trialCount,
          href: '/workspace/tournament/overview',
          tone: snapshot.trialCount > 0 ? 'emerald' : 'neutral',
          title: 'Configured trial & tournament schedules',
        },
        {
          id: 'trials-registrations',
          label: 'Squads',
          value: snapshot.registrationCount,
          href: '/workspace/tournament/registrations',
          tone: snapshot.registrationCount > 0 ? 'info' : 'neutral',
          title: 'Registered squads & participants',
        },
        {
          id: 'trials-updates',
          label: 'Updates',
          value: snapshot.liveUpdateCount,
          href: '/workspace/tournament/brackets',
          tone: snapshot.liveUpdateCount > 0 ? 'emerald' : 'neutral',
          title: 'Published bracket & match advisories',
        },
      ]

    case 'creator':
      return [
        {
          id: 'creator-campaigns',
          label: 'Campaigns',
          value: snapshot.creatorCampaignsCount,
          href: '/workspace/creator/campaigns',
          tone: snapshot.creatorCampaignsCount > 0 ? 'emerald' : 'neutral',
          title: 'Active campaign participation records',
        },
        {
          id: 'creator-reach',
          label: 'Deliverables',
          value: snapshot.creatorReachCount,
          href: '/workspace/creator/analytics',
          tone: snapshot.creatorReachCount > 0 ? 'info' : 'neutral',
          title: 'Submitted campaign deliverables',
        },
        {
          id: 'creator-rewards',
          label: 'Rewards',
          value: snapshot.creatorRewardsCount,
          href: '/workspace/creator/overview',
          tone: snapshot.creatorRewardsCount > 0 ? 'emerald' : 'neutral',
          title: 'Approved reward ledger entries',
        },
      ]
  }
}

export function resolveWorkspaceContextMenu(
  persona: CanonicalWorkspaceId,
  isAuthenticated: boolean,
): {
  pillars: readonly WorkspaceContextAction[]
  actions: readonly WorkspaceContextAction[]
} {
  const config = getWorkspaceConfig(persona)
  const pillars: WorkspaceContextAction[] = config.pillars.map(p => ({
    ...p,
    badge: isAuthenticated ? undefined : 'Preview',
  }))
  return {
    pillars,
    actions: config.contextActions,
  }
}
