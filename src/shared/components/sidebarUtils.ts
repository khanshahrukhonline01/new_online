import type { NavigationItem, NavigationModule } from '../navigation/navigationRegistry'

export type SidebarMode = 'athlete' | 'partner'

export const PARTNER_ROUTE_PREFIXES = [
  '/organizations',
  '/partner-signup',
  '/partner-login',
  '/partner/signup',
  '/partner/login',
  '/partner/onboarding',
  '/academy/signup',
  '/academy-hub',
  '/academies/manage',
  '/coach-dashboard',
  '/coach/hub',
  '/coach/manage',
  '/tournament-ops',
  '/tournaments/manage',
  '/host',
  '/partner-dashboard',
  '/campaigns',
  '/creator',
  '/creator-hub',
  '/gate-checkin',
  '/verify-pass',
] as const

export const CURATED_RAIL_GROUPS: readonly { id: string; label: string; hrefs: readonly string[] }[] = [
  {
    id: 'rail-core',
    label: 'Core',
    hrefs: ['/', '/play', '/venues', '/opportunities'],
  },
  {
    id: 'rail-discover',
    label: 'Discover',
    hrefs: ['/sports', '/academies', '/live', '/search'],
  },
  {
    id: 'rail-athlete',
    label: 'Athlete & Workspace',
    hrefs: ['/sports-cv', '/saved', '/organizations'],
  },
] as const

const ATHLETE_MODULE_IDS = new Set([
  'your-space',
  'discover',
  'play-train',
  'athlete-tools',
  'learn-community',
])

const PARTNER_MODULE_IDS = new Set([
  'partner-saas',
  'your-space',
  'network',
])

/**
 * Strips a redundant leading "+ " (or "+") when a label is paired with a plus icon.
 */
export function stripLeadingPlus(label: string): string {
  return label.replace(/^\s*\+\s*/, '').trim()
}

/**
 * Resolves whether a sidebar navigation item matches the active application path.
 */
export function isSidebarItemActive(href: string, activePath: string): boolean {
  if (href === '/workspace') return activePath === '/workspace' || activePath === '/dashboard'
  if (href === '/') return activePath === '/'
  if (href === '/opportunities') {
    return ['/opportunities', '/trials', '/combines', '/scholarships', '/camps'].includes(activePath) || activePath.startsWith('/opportunities/')
  }
  if (href === '/venues') return activePath === '/venues' || activePath === '/book' || activePath.startsWith('/venues/')
  if (href === '/academies') {
    return activePath === '/academies' || activePath === '/academy' || activePath === '/train' || activePath.startsWith('/academies/')
  }
  if (href === '/khelchronicle') return activePath.startsWith('/khelchronicle') || activePath.startsWith('/chronicle')
  if (href === '/play') return activePath === '/play' || activePath.startsWith('/play/')
  if (href === '/live') return activePath === '/live' || activePath === '/live-scores' || activePath.startsWith('/live/')
  if (href === '/learning') return activePath === '/learning' || activePath === '/learning-hub' || activePath.startsWith('/learning/')
  return activePath === href || activePath.startsWith(`${href}/`)
}

/**
 * Determines which sidebar audience mode best matches the current route.
 */
export function resolveSidebarModeForPath(activePath: string): SidebarMode {
  const normalized = activePath.replace(/\/$/, '') || '/'
  if (
    PARTNER_ROUTE_PREFIXES.some(
      prefix => normalized === prefix || normalized.startsWith(`${prefix}/`),
    )
  ) {
    return 'partner'
  }
  return 'athlete'
}

/**
 * Filters and orders navigation modules according to the selected Athlete or Partner mode.
 * Keeps Partner & Coaching Suite prominent in Partner mode without cluttering Athlete discovery,
 * while retaining core network links in both modes.
 */
export function getModulesForMode(
  modules: readonly NavigationModule[],
  mode: SidebarMode,
): NavigationModule[] {
  if (mode === 'partner') {
    const partnerFirst = modules.filter(m => m.id === 'partner-saas')
    const rest = modules.filter(m => m.id !== 'partner-saas' && PARTNER_MODULE_IDS.has(m.id))
    return [...partnerFirst, ...rest]
  }

  return modules.filter(m => ATHLETE_MODULE_IDS.has(m.id) || m.id === 'network')
}

export interface CollapsedRailGroup {
  id: string
  label: string
  items: NavigationItem[]
}

/**
 * Builds the curated high-frequency icon rail for desktop collapsed mode,
 * grouped into clean sections separated by dividers instead of 44 flat icons.
 */
export function getCollapsedRailGroups(
  modules: readonly NavigationModule[],
): CollapsedRailGroup[] {
  const byHref = new Map<string, NavigationItem>()
  for (const mod of modules) {
    for (const item of mod.items) {
      if (!byHref.has(item.href)) {
        byHref.set(item.href, item)
      }
    }
  }

  const groups: CollapsedRailGroup[] = []
  for (const group of CURATED_RAIL_GROUPS) {
    const items = group.hrefs
      .map(href => byHref.get(href))
      .filter((item): item is NavigationItem => Boolean(item))
    if (items.length > 0) {
      groups.push({ id: group.id, label: group.label, items })
    }
  }
  return groups
}

/**
 * Determines whether the Sports CV promo card should be rendered inside the sidebar/drawer.
 */
export function shouldShowSportsCvPromo(activePath: string, dismissed: boolean): boolean {
  if (dismissed) return false
  const normalized = activePath.replace(/\/$/, '') || '/'
  if (normalized === '/sports-cv' || normalized.startsWith('/sports-cv/')) return false
  return true
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Reads persisted notification IDs from localStorage, migrating legacy sessionStorage entries if present.
 */
export function readPersistedIdSet(
  key: string,
  primaryStorage?: StorageLike | null,
  legacyStorage?: StorageLike | null,
): Set<string> {
  const set = new Set<string>()
  const readFrom = (storage?: StorageLike | null) => {
    if (!storage) return
    try {
      const raw = storage.getItem(key)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') set.add(item)
        }
      }
    } catch {
      // Ignore malformed storage data
    }
  }

  readFrom(primaryStorage)
  if (set.size === 0 && legacyStorage) {
    readFrom(legacyStorage)
    if (set.size > 0 && primaryStorage) {
      try {
        primaryStorage.setItem(key, JSON.stringify(Array.from(set)))
      } catch {
        // Ignore quota errors
      }
    }
  }

  return set
}

/**
 * Writes a Set of string IDs to persistent storage safely.
 */
export function writePersistedIdSet(
  key: string,
  ids: Set<string>,
  storage?: StorageLike | null,
): void {
  if (!storage) return
  try {
    storage.setItem(key, JSON.stringify(Array.from(ids)))
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
}

export type MobileBottomNavSlot =
  | {
      kind: 'link'
      id: string
      label: string
      href: string
      icon: NavigationItem['icon']
    }
  | {
      kind: 'submit'
      id: 'submit'
      label: string
      icon: 'plus'
    }

/**
 * 5-slot mobile thumb bar (<= 700px):
 * Home · Trials · [ + ] Submit (center action sheet) · Venues · Sports
 * Search lives once in the top bar (global command search) to eliminate duplication.
 */
export const MOBILE_BOTTOM_NAV_SLOTS: readonly MobileBottomNavSlot[] = [
  { kind: 'link', id: 'home', label: 'Home', href: '/', icon: 'home' },
  { kind: 'link', id: 'opportunities', label: 'Trials', href: '/opportunities', icon: 'opportunities' },
  { kind: 'submit', id: 'submit', label: 'Submit', icon: 'plus' },
  { kind: 'link', id: 'venues', label: 'Venues', href: '/venues', icon: 'venues' },
  { kind: 'link', id: 'sports', label: 'Sports', href: '/sports', icon: 'sports' },
] as const

export interface MobileSubmitSheetOption {
  id: 'venue' | 'trial' | 'coach' | 'all' | 'chronicle'
  href: string
  icon: NavigationItem['icon']
  label: string
  description: string
  group: 'listing' | 'research'
}

export const MOBILE_SUBMIT_SHEET_OPTIONS: readonly MobileSubmitSheetOption[] = [
  {
    id: 'venue',
    href: '/submit-listing?type=venue',
    icon: 'building',
    label: 'List a Venue / Turf',
    description: 'Turfs, stadiums & indoor sports arenas',
    group: 'listing',
  },
  {
    id: 'trial',
    href: '/submit-listing?type=opportunity',
    icon: 'calendar-check',
    label: 'Submit a Trial / Tournament',
    description: 'SAI, state, club & federation trials',
    group: 'listing',
  },
  {
    id: 'coach',
    href: '/submit-listing?type=coach',
    icon: 'award',
    label: 'Join as Coach',
    description: 'Verified coaching profile & batches',
    group: 'listing',
  },
  {
    id: 'all',
    href: '/submit-listing',
    icon: 'plus',
    label: 'All Listing Types',
    description: 'Venues, trials, academies or games',
    group: 'listing',
  },
  {
    id: 'chronicle',
    href: '/khelchronicle/submit',
    icon: 'file-text',
    label: 'Submit Research Paper',
    description: 'Publish sports science in KhelChronicle',
    group: 'research',
  },
] as const

/**
 * Checks whether the current path belongs to a KhelGrid submission workflow.
 */
export function isSubmitRouteActive(activePath: string): boolean {
  const normalized = activePath.replace(/\/$/, '') || '/'
  return (
    normalized === '/submit-listing' ||
    normalized.startsWith('/submit-listing/') ||
    normalized === '/list' ||
    normalized.startsWith('/list/') ||
    normalized === '/khelchronicle/submit' ||
    normalized === '/chronicle/submit'
  )
}

