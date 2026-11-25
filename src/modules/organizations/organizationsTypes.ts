import type {
  EntitlementFeatureKey,
  ModulePermission,
  OrganizationRole,
  OrganizationUnitType,
  OwnableResourceType,
} from '../../shared/saas/saasTypes'

export type WorkspaceTab = 'overview' | 'team' | 'permissions' | 'entitlements' | 'governance'
export type OrganizationShellSection = 'overview' | 'members' | 'branches'

/** Maps unified WorkspaceShell section IDs to OrganizationsWorkspace tabs. */
export function resolveOrgTabForSection(section?: string): WorkspaceTab {
  switch (section) {
    case 'members':
      return 'team'
    case 'branches':
      return 'governance'
    case 'overview':
    default:
      return 'overview'
  }
}

export const ASSIGNABLE_ROLES: Exclude<OrganizationRole, 'owner'>[] = [
  'org_admin',
  'director',
  'admin',
  'manager',
  'finance_manager',
  'content_manager',
  'listing_manager',
  'verification_coordinator',
  'head_coach',
  'coach',
  'accountant',
  'front_desk',
  'staff',
  'readonly_member',
  'parent',
]

export const ALL_MODULE_PERMISSIONS: { key: ModulePermission; label: string; module: string }[] = [
  { key: 'org:settings', label: 'Org Settings & Units', module: 'Organization' },
  { key: 'org:team', label: 'Team & Invitations', module: 'Organization' },
  { key: 'org:billing', label: 'Plan & Billing Readiness', module: 'Organization' },
  { key: 'org:audit', label: 'Security Audit Log', module: 'Organization' },
  { key: 'venues:manage', label: 'Venues & Turf Ops', module: 'Venues' },
  { key: 'coaches:manage', label: 'Coach Directory Ops', module: 'Coaches' },
  { key: 'trials:manage', label: 'Trials & Scholarships', module: 'Opportunities' },
  { key: 'events:manage', label: 'Sports Events', module: 'Events' },
  { key: 'tournaments:manage', label: 'Tournament Brackets', module: 'Tournaments' },
  { key: 'pickup_games:manage', label: 'Community Pickup Games', module: 'Play' },
  { key: 'bookings:manage', label: 'Slot & Desk Bookings', module: 'Bookings' },
  { key: 'athletes:manage', label: 'Athletes & Batches', module: 'Academy' },
  { key: 'editorial:manage', label: 'Editorial & Research', module: 'KhelChronicle' },
  { key: 'analytics:view', label: 'Tenant Analytics', module: 'Analytics' },
]

export const FEATURE_KEYS: { key: EntitlementFeatureKey; label: string }[] = [
  { key: 'listings.free_submission', label: 'Free Public Listing Submission (Guaranteed Free)' },
  { key: 'verification.independent_review', label: 'Independent Verification Review (Guaranteed Free)' },
  { key: 'org.multi_member', label: 'Multi-Member Organization Seats' },
  { key: 'org.advanced_roles', label: 'Module-Level RBAC Roles' },
  { key: 'org.branches', label: 'Branches, Departments & Units' },
  { key: 'org.advanced_analytics', label: 'Advanced Organization Analytics' },
  { key: 'venues.multi_location', label: 'Multi-Location Venue Operations' },
  { key: 'academy.student_management', label: 'Academy Student & Batch Management' },
  { key: 'events.registrations', label: 'Events & Tournament Registrations' },
  { key: 'editorial.collaboration', label: 'Editorial & Research Collaboration' },
  { key: 'platform.data_exports', label: 'Monthly Data Exports' },
  { key: 'platform.api_access', label: 'Enterprise API Access' },
]

export const OWNABLE_RESOURCE_TYPES: { value: OwnableResourceType; label: string }[] = [
  { value: 'venue', label: 'Sports Venue / Turf' },
  { value: 'academy', label: 'Sports Academy' },
  { value: 'coach_profile', label: 'Coach Profile' },
  { value: 'opportunity', label: 'Selection Trial / Scholarship' },
  { value: 'tournament', label: 'Tournament / League' },
  { value: 'event', label: 'Sports Event / Camp' },
  { value: 'pickup_game', label: 'Community Pickup Game' },
  { value: 'research_paper', label: 'KhelChronicle Research Paper' },
  { value: 'editorial_article', label: 'Editorial Publication' },
]

export const UNIT_TYPES: { value: OrganizationUnitType; label: string }[] = [
  { value: 'branch', label: 'Branch / Campus' },
  { value: 'regional_office', label: 'Regional Office' },
  { value: 'department', label: 'Department' },
  { value: 'team', label: 'Team / Squad' },
  { value: 'facility', label: 'Facility / Ground' },
]
