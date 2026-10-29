import type { SiteIconName } from '../components/SiteIcon'

export type NavigationItem = {
  id: string
  label: string
  href: string
  icon: SiteIconName
  module: string
  available?: boolean
}

export type NavigationModule = {
  id: string
  label: string
  items: NavigationItem[]
}

/**
 * Single source of truth for desktop sidebar and mobile drawer navigation.
 * Only destinations implemented in this app are enabled. Future destinations
 * remain visible but disabled until their routes and services are ready.
 */
export const navigationModules: NavigationModule[] = [
  {
    id: 'core',
    label: 'Your Space',
    items: [
      { id: 'home', label: 'Home', href: '/', icon: 'home', module: 'core', available: true },
      { id: 'dashboard', label: 'My Dashboard', href: '/dashboard', icon: 'chart', module: 'core' },
    ],
  },
  {
    id: 'play',
    label: 'Play & Match Center',
    items: [
      { id: 'sports', label: 'Explore sports', href: '/sports', icon: 'sports', module: 'play', available: true },
      { id: 'trials', label: 'Search Trials & Opportunities', href: '/opportunities', icon: 'opportunities', module: 'play', available: true },
      { id: 'live-scores', label: 'Live Scores', href: '/live', icon: 'activity', module: 'play', available: true },
      { id: 'find-games', label: 'Play · Find games', href: '/play', icon: 'sports', module: 'play' },
      { id: 'venues', label: 'Book venues', href: '/venues', icon: 'venues', module: 'play', available: true },
      { id: 'coaches', label: 'Coaches', href: '/coaches', icon: 'users', module: 'play', available: true },
      { id: 'academies', label: 'Academies', href: '/academies', icon: 'building', module: 'play', available: true },
      { id: 'events', label: 'Events & tournaments', href: '/events', icon: 'calendar', module: 'play' },
    ],
  },
  {
    id: 'athlete',
    label: 'Scouting & Athlete Pipeline',
    items: [
      { id: 'my-stats', label: 'My Stats', href: '/stats', icon: 'chart', module: 'athlete' },
      { id: 'sports-cv', label: 'Sports CV Wizard', href: '/sports-cv', icon: 'sports-cv', module: 'athlete' },
      { id: 'talent-scanner', label: 'Talent Scanner', href: '/talent-scanner', icon: 'target', module: 'athlete' },
      { id: 'scout-portal', label: 'Scout Portal', href: '/scout-portal', icon: 'users', module: 'athlete' },
      { id: 'verification', label: 'Verification', href: '/verification', icon: 'badge-check', module: 'athlete' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge & Community',
    items: [
      { id: 'learning-hub', label: 'Sports & Learning Hub', href: '/learning', icon: 'sports', module: 'knowledge' },
      { id: 'guides', label: 'Guides', href: '/guides', icon: 'file-text', module: 'knowledge' },
      { id: 'ai-guide', label: 'AI Guide', href: '/ai-guide', icon: 'activity', module: 'knowledge' },
      { id: 'blog', label: 'Blog · KhelChronicle', href: '/khelchronicle', icon: 'file-text', module: 'knowledge' },
      { id: 'community', label: 'Community', href: '/community', icon: 'users', module: 'knowledge' },
      { id: 'search', label: 'Search', href: '/search', icon: 'search', module: 'knowledge', available: true },
      { id: 'tools', label: 'Tools & calculators', href: '/tools', icon: 'sliders', module: 'knowledge' },
    ],
  },
  {
    id: 'network',
    label: 'Network & Ecosystem',
    items: [
      { id: 'calendar', label: 'Sports Calendar', href: '/calendar', icon: 'calendar', module: 'network' },
      { id: 'for-you', label: 'For You', href: '/for-you', icon: 'star', module: 'network' },
      { id: 'trust', label: 'Trust Center', href: '/trust', icon: 'shield-check', module: 'network' },
      { id: 'pricing', label: 'Pricing & Memberships', href: '/pricing', icon: 'wallet', module: 'network' },
      { id: 'mobile-app', label: 'Mobile App', href: '/mobile-app', icon: 'smartphone', module: 'network' },
      { id: 'careers', label: 'Careers', href: '/careers', icon: 'users', module: 'network' },
      { id: 'partners', label: 'Partner with Us', href: '/partners', icon: 'building', module: 'network' },
      { id: 'about', label: 'About', href: '/about', icon: 'globe', module: 'network' },
    ],
  },
]

export const primaryNavigation = navigationModules.flatMap(section => section.items)

/** Header actions are maintained separately from feature navigation. */
export const headerNavigation = navigationModules.find(section => section.id === 'core')?.items ?? []

export function getNavigationHref(item: NavigationItem): string {
  return item.href
}
