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
  icon: SiteIconName
  items: NavigationItem[]
}

/**
 * Single source of truth for desktop sidebar and mobile drawer navigation.
 * "available" means the destination has a working, honest user-facing page.
 * It does not imply that an external feed, account, booking, or database
 * capability is connected. Future features remain visible but non-clickable.
 */
export const navigationModules: NavigationModule[] = [
  {
    id: 'your-space',
    label: 'Your Space',
    icon: 'user-round',
    items: [
      { id: 'home', label: 'Home', href: '/', icon: 'home', module: 'your-space', available: true },
      { id: 'dashboard', label: 'My Dashboard', href: '/dashboard', icon: 'chart', module: 'your-space' },
      { id: 'saved', label: 'Saved Items', href: '/saved', icon: 'bookmark', module: 'your-space' },
    ],
  },
  {
    id: 'discover',
    label: 'Discover',
    icon: 'search',
    items: [
      { id: 'sports', label: 'All Sports', href: '/sports', icon: 'sports', module: 'discover', available: true },
      { id: 'opportunities', label: 'Trials & Opportunities', href: '/opportunities', icon: 'opportunities', module: 'discover', available: true },
      { id: 'venues', label: 'Sports Venues', href: '/venues', icon: 'venues', module: 'discover', available: true },
      { id: 'search', label: 'Search Catalogue', href: '/search', icon: 'search', module: 'discover', available: true },
      { id: 'for-you', label: 'For You', href: '/for-you', icon: 'star', module: 'discover' },
    ],
  },
  {
    id: 'play-train',
    label: 'Play & Train',
    icon: 'trophy',
    items: [
      { id: 'find-games', label: 'Find a Game', href: '/play', icon: 'sports', module: 'play-train' },
      { id: 'coaches', label: 'Coaches Directory', href: '/coaches', icon: 'users', module: 'play-train', available: true },
      { id: 'academies', label: 'Sports Academies', href: '/academies', icon: 'building', module: 'play-train', available: true },
      { id: 'events', label: 'Events & Tournaments', href: '/events', icon: 'calendar', module: 'play-train', available: true },
      { id: 'calendar', label: 'Sports Calendar', href: '/calendar', icon: 'calendar-check', module: 'play-train', available: true },
      { id: 'live-scores', label: 'Live Scores', href: '/live', icon: 'activity', module: 'play-train', available: true },
    ],
  },
  {
    id: 'athlete-tools',
    label: 'Athlete & Scouting Tools',
    icon: 'target',
    items: [
      { id: 'sports-cv', label: 'Sports CV Builder', href: '/sports-cv', icon: 'sports-cv', module: 'athlete-tools', available: true },
      { id: 'my-stats', label: 'Athlete Statistics', href: '/stats', icon: 'chart', module: 'athlete-tools' },
      { id: 'talent-scanner', label: 'Talent Scanner', href: '/talent-scanner', icon: 'target', module: 'athlete-tools' },
      { id: 'scout-portal', label: 'Scout Portal', href: '/scout-portal', icon: 'users', module: 'athlete-tools' },
      { id: 'verification', label: 'Athlete Verification', href: '/verification', icon: 'badge-check', module: 'athlete-tools' },
    ],
  },
  {
    id: 'learn-community',
    label: 'Learn & Community',
    icon: 'book-open',
    items: [
      { id: 'learning-hub', label: 'Sports Learning Hub', href: '/learning', icon: 'sports', module: 'learn-community' },
      { id: 'guides', label: 'Sports Guides', href: '/guides', icon: 'file-text', module: 'learn-community' },
      { id: 'ai-guide', label: 'AI Sports Guide', href: '/ai-guide', icon: 'activity', module: 'learn-community' },
      { id: 'blog', label: 'KhelChronicle', href: '/khelchronicle', icon: 'file-text', module: 'learn-community' },
      { id: 'community', label: 'Community', href: '/community', icon: 'users', module: 'learn-community' },
      { id: 'tools', label: 'Sports Tools', href: '/tools', icon: 'sliders', module: 'learn-community' },
    ],
  },
  {
    id: 'network',
    label: 'KhelGrid Network',
    icon: 'globe',
    items: [
      { id: 'trust', label: 'Trust Center', href: '/trust', icon: 'shield-check', module: 'network', available: true },
      { id: 'pricing', label: 'Pricing & Memberships', href: '/pricing', icon: 'wallet', module: 'network' },
      { id: 'partners', label: 'Partner with KhelGrid', href: '/partners', icon: 'building', module: 'network' },
      { id: 'careers', label: 'Careers', href: '/careers', icon: 'users', module: 'network' },
      { id: 'about', label: 'About KhelGrid', href: '/about', icon: 'info', module: 'network', available: true },
      { id: 'contact', label: 'Contact KhelGrid', href: '/contact', icon: 'mail', module: 'network', available: true },
    ],
  },
]

export const primaryNavigation = navigationModules.flatMap(section => section.items)

/** Header actions are maintained separately from feature navigation. */
export const headerNavigation = navigationModules.find(section => section.id === 'your-space')?.items ?? []

export function getNavigationHref(item: NavigationItem): string {
  return item.href
}
