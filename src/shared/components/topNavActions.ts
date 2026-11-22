import type { SiteIconName } from './SiteIcon'

export interface TopNavSubmitAction {
  id: 'all' | 'venue' | 'trial' | 'coach' | 'chronicle'
  href: string
  className: string
  icon: SiteIconName
  translationKey: string
  defaultLabel: string
  description: string
  title: string
}

export const TOP_NAV_SUBMIT_ACTIONS: readonly TopNavSubmitAction[] = [
  {
    id: 'all',
    href: '/submit-listing',
    className: 'header-action-link header-action-add',
    icon: 'plus',
    translationKey: 'listOnKhelgrid',
    defaultLabel: '+ List on KhelGrid',
    description: 'Submit any venue, trial, academy, coach or game',
    title: 'Submit a venue, coach, trial, academy or community listing for free review',
  },
  {
    id: 'venue',
    href: '/submit-listing?type=venue',
    className: 'header-action-link',
    icon: 'building',
    translationKey: 'listVenue',
    defaultLabel: 'List your venue',
    description: 'Turfs, stadiums, indoor courts & sports complexes',
    title: 'Submit a free venue listing for evidence review',
  },
  {
    id: 'trial',
    href: '/submit-listing?type=opportunity',
    className: 'header-action-link header-action-secondary',
    icon: 'calendar-check',
    translationKey: 'submitTrial',
    defaultLabel: 'Submit a trial',
    description: 'SAI, club, state or federation selection trials',
    title: 'Submit a free sports trial listing for evidence review',
  },
  {
    id: 'coach',
    href: '/submit-listing?type=coach',
    className: 'header-action-link header-action-coach',
    icon: 'award',
    translationKey: 'joinAsCoach',
    defaultLabel: 'Join as Coach',
    description: 'Verified coaching profile & student batch intake',
    title: 'Submit a free coach listing for evidence review',
  },
  {
    id: 'chronicle',
    href: '/khelchronicle/submit',
    className: 'header-action-link header-action-chronicle',
    icon: 'file-text',
    translationKey: 'submitPaper',
    defaultLabel: 'Submit Paper',
    description: 'Publish sports science research in KhelChronicle',
    title: 'Submit research manuscript to KhelChronicle',
  },
] as const

export interface TopNavWorkspaceLink {
  id: string
  href: string
  label: string
  description: string
  icon: SiteIconName
}

export const TOP_NAV_WORKSPACE_LINKS: readonly TopNavWorkspaceLink[] = [
  { id: 'organizations', href: '/organizations', label: 'Organizations & SaaS Hub', description: 'Set up and manage your organisation workspace', icon: 'building' },
  { id: 'partner-onboarding', href: '/partner-signup', label: 'Partner Setup & Login', description: 'Partner onboarding and workspace access', icon: 'handshake' },
  { id: 'academy', href: '/academy-hub', label: 'Academy Admissions & Operations', description: 'Admissions, batches, attendance and fees', icon: 'building' },
  { id: 'coach', href: '/coach-dashboard', label: 'Coach Operations Hub', description: 'Manage coaching batches and daily operations', icon: 'award' },
  { id: 'venue', href: '/turf-calendar', label: 'Venue & Facility Operations', description: 'Manage facilities and slot operations', icon: 'calendar-check' },
  { id: 'tournament', href: '/tournament-ops', label: 'Tournament Operations', description: 'Manage tournament workflows and operations', icon: 'trophy' },
  { id: 'check-in', href: '/gate-checkin', label: 'Gate QR Check-In Desk', description: 'Manage participant entry and pass scanning', icon: 'shield-check' },
  { id: 'passbook', href: '/parent-portal', label: 'Parent & Athlete Passbook', description: 'View athlete records, passes and updates', icon: 'user-round' },
] as const

export interface RoleHubLink {
  href: string
  label: string
  icon: SiteIconName
  title: string
  isActive: boolean
}

export function resolveRoleHubLink(
  role: string | undefined | null,
  currentPath: string,
): RoleHubLink {
  if (role === 'coach') {
    return {
      href: '/coach-dashboard',
      label: 'Coach Hub',
      icon: 'award',
      title: 'Coach Operations Hub — batches, attendance & fees',
      isActive: currentPath === '/coach-dashboard',
    }
  }

  if (role === 'academy' || role === 'host' || role === 'venue_owner') {
    return {
      href: '/academy-hub',
      label: 'Academy Hub',
      icon: 'building',
      title: 'Academy Admissions Hub — squads, attendance & passes',
      isActive: currentPath === '/academy-hub',
    }
  }

  return {
    href: '/academy-hub',
    label: 'Academy Hub',
    icon: 'building',
    title: 'Academy Admissions & Coach Operations Hub',
    isActive: currentPath === '/academy-hub' || currentPath === '/coach-dashboard',
  }
}

export function formatUnreadBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null
  return count > 9 ? '9+' : String(Math.floor(count))
}
