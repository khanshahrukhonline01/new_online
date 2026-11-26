import type { SiteIconName } from './SiteIcon'

export type CanonicalWorkspaceId =
  | 'athlete'
  | 'academy'
  | 'venue'
  | 'coach'
  | 'trial_organiser'
  | 'creator'

export interface WorkspacePillarItem {
  id: string
  label: string
  description: string
  href: string
  icon: SiteIconName
}

export interface WorkspaceContextAction {
  id: string
  label: string
  description: string
  href: string
  icon: SiteIconName
  badge?: string
}

export interface CanonicalWorkspaceDefinition {
  id: CanonicalWorkspaceId
  label: string
  shortLabel: string
  href: string
  icon: SiteIconName
  description: string
  pillars: readonly WorkspacePillarItem[]
  contextActions: readonly WorkspaceContextAction[]
}

export const CANONICAL_WORKSPACES: readonly CanonicalWorkspaceDefinition[] = [
  {
    id: 'athlete',
    label: 'Athlete',
    shortLabel: 'Athlete',
    href: '/workspace/athlete/overview',
    icon: 'user-round',
    description: 'Trials, Sports CV, training academies, turfs, and verified achievements',
    pillars: [
      { id: 'overview', label: 'Dashboard', description: 'Track trials, bookings, and training schedule', href: '/dashboard', icon: 'home' },
      { id: 'trials', label: 'Selection Trials', description: 'Browse verified district, state, and SAI trials', href: '/opportunities', icon: 'trophy' },
      { id: 'sports-cv', label: 'Sports CV', description: 'Build and export your verified athletic portfolio', href: '/sports-cv', icon: 'award' },
      { id: 'passes', label: 'My Passes', description: 'Access QR entry passes and venue bookings', href: '/my-passes', icon: 'shield-check' },
    ],
    contextActions: [
      { id: 'find-game', label: 'Find a Pickup Game', description: 'Join local community matches near you', href: '/play', icon: 'sports', badge: 'Live' },
      { id: 'scanner', label: 'Talent Scanner', description: 'Benchmark speed, agility, and vertical metrics', href: '/talent-scanner', icon: 'target', badge: 'Free' },
    ],
  },
  {
    id: 'academy',
    label: 'Academy',
    shortLabel: 'Academy',
    href: '/academy-hub',
    icon: 'building',
    description: 'Admissions, athlete batches, attendance registers, and fee passbooks',
    pillars: [
      { id: 'admissions', label: 'Admissions Hub', description: 'Manage student enquiries and batch rosters', href: '/academy-hub', icon: 'building' },
      { id: 'organizations', label: 'Organization SaaS', description: 'Configure branches, RBAC, and team invites', href: '/organizations', icon: 'shield-check' },
      { id: 'gate', label: 'Gate Check-In', description: 'Verify athlete QR passes at academy gates', href: '/gate-checkin', icon: 'check-circle' },
    ],
    contextActions: [
      { id: 'list-academy', label: 'List Your Academy', description: 'Publish your training centre for free discovery', href: '/submit-listing?type=academy', icon: 'plus', badge: 'Free' },
    ],
  },
  {
    id: 'venue',
    label: 'Venue & Turf',
    shortLabel: 'Venue',
    href: '/turf-calendar',
    icon: 'map-pin',
    description: 'Court slot inventory, dynamic pricing, UPI settlement, and maintenance locks',
    pillars: [
      { id: 'calendar', label: 'Turf Calendar', description: 'Hourly court slots, walk-ins, and recurring packs', href: '/turf-calendar', icon: 'calendar-check' },
      { id: 'venues', label: 'Public Venues', description: 'Browse verified stadiums and arenas across India', href: '/venues', icon: 'map-pin' },
      { id: 'gate', label: 'Gate Check-In', description: 'Scan turf vouchers and admit players at entry', href: '/gate-checkin', icon: 'shield-check' },
    ],
    contextActions: [
      { id: 'list-venue', label: 'List Your Venue', description: 'Add a turf, stadium, or indoor court for free', href: '/submit-listing?type=venue', icon: 'plus', badge: '0% Fee' },
    ],
  },
  {
    id: 'coach',
    label: 'Coach',
    shortLabel: 'Coach',
    href: '/coach-dashboard',
    icon: 'award',
    description: 'Training batches, session attendance, athlete feedback, and endorsements',
    pillars: [
      { id: 'hub', label: 'Coach Hub', description: 'Daily coaching schedule, rosters, and notes', href: '/coach-dashboard', icon: 'award' },
      { id: 'directory', label: 'Coaches Directory', description: 'Explore certified grassroots coaches by city', href: '/coaches', icon: 'users' },
    ],
    contextActions: [
      { id: 'join-coach', label: 'Join as Coach', description: 'Create a verified coaching profile on KhelGrid', href: '/submit-listing?type=coach', icon: 'plus', badge: 'Free' },
    ],
  },
  {
    id: 'trial_organiser',
    label: 'Trial & Tournament',
    shortLabel: 'Organiser',
    href: '/tournament-ops',
    icon: 'trophy',
    description: 'Selection trials, tournament brackets, match fixtures, and live scoring',
    pillars: [
      { id: 'ops', label: 'Tournament Ops', description: 'Run draws, fixtures, and scorecards', href: '/tournament-ops', icon: 'trophy' },
      { id: 'live', label: 'Live Match Center', description: 'Publish live match status and brackets', href: '/live', icon: 'activity' },
    ],
    contextActions: [
      { id: 'submit-trial', label: 'Submit a Trial', description: 'Announce verified club, state, or SAI trials', href: '/submit-listing?type=opportunity', icon: 'plus', badge: 'Verified' },
    ],
  },
  {
    id: 'creator',
    label: 'Creator',
    shortLabel: 'Creator',
    href: '/creator',
    icon: 'sparkles',
    description: 'Sports creator campaigns, brand briefs, and KhelChronicle publishing',
    pillars: [
      { id: 'hub', label: 'Creator Hub', description: 'Manage sports content partnerships and payouts', href: '/creator', icon: 'sparkles' },
      { id: 'campaigns', label: 'Campaign Marketplace', description: 'Discover open sports creator campaigns', href: '/campaigns', icon: 'target' },
      { id: 'chronicle', label: 'KhelChronicle', description: 'Open sports science preprints and articles', href: '/khelchronicle', icon: 'book-open' },
    ],
    contextActions: [
      { id: 'create-campaign', label: 'Launch Campaign', description: 'Post a sports creator brief', href: '/campaigns/create', icon: 'plus', badge: 'New' },
    ],
  },
] as const

export function getCanonicalWorkspace(id: CanonicalWorkspaceId): CanonicalWorkspaceDefinition {
  return CANONICAL_WORKSPACES.find(w => w.id === id) ?? CANONICAL_WORKSPACES[0]
}
