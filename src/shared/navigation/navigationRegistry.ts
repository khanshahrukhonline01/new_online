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
      { id: 'workspace', label: 'Workspace', href: '/workspace', icon: 'chart', module: 'your-space', available: true },
      { id: 'parent-portal', label: 'Parent & Athlete Passbook', href: '/parent-portal', icon: 'shield-check', module: 'your-space', available: true },
      { id: 'my-passes', label: 'My Passes & Vouchers', href: '/my-passes', icon: 'badge-check', module: 'your-space', available: true },
      { id: 'saved', label: 'Saved Items', href: '/saved', icon: 'bookmark', module: 'your-space', available: true },
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
      { id: 'for-you', label: 'For You', href: '/for-you', icon: 'star', module: 'discover', available: true },
    ],
  },
  {
    id: 'play-train',
    label: 'Play & Match Center',
    icon: 'trophy',
    items: [
      { id: 'find-games', label: 'Play · Find games', href: '/play', icon: 'sports', module: 'play-train', available: true },
      { id: 'lacrosse-sixes', label: 'Lacrosse Sixes Game', href: '/play/lacrosse-sixes', icon: 'trophy', module: 'play-train', available: true },
      { id: 'turf-calendar', label: 'Turf Hourly Slots', href: '/turf-calendar', icon: 'calendar-check', module: 'play-train', available: true },
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
      { id: 'my-stats', label: 'Athlete Statistics', href: '/stats', icon: 'chart', module: 'athlete-tools', available: true },
      { id: 'talent-scanner', label: 'Talent Scanner', href: '/talent-scanner', icon: 'target', module: 'athlete-tools', available: true },
      { id: 'scout-portal', label: 'Scout Portal', href: '/scout-portal', icon: 'users', module: 'athlete-tools', available: true },
      { id: 'verification', label: 'Athlete Verification', href: '/verification', icon: 'badge-check', module: 'athlete-tools', available: true },
    ],
  },
  {
    id: 'partner-saas',
    label: 'Partner & Coaching Suite',
    icon: 'handshake',
    items: [
      { id: 'organizations-hub', label: 'Organizations & SaaS Hub', href: '/organizations', icon: 'building', module: 'partner-saas', available: true },
      { id: 'partner-onboarding', label: 'Partner Setup & Login (30s)', href: '/partner-signup', icon: 'handshake', module: 'partner-saas', available: true },
      { id: 'academy-hub', label: 'Academy Admissions Hub', href: '/academy-hub', icon: 'building', module: 'partner-saas', available: true },
      { id: 'coach-dashboard', label: 'Coach Operations Hub', href: '/coach-dashboard', icon: 'award', module: 'partner-saas', available: true },
      { id: 'tournament-ops', label: 'Tournament Operations', href: '/tournament-ops', icon: 'trophy', module: 'partner-saas', available: true },
      { id: 'host-dashboard', label: 'Turf & Host Dashboard', href: '/host', icon: 'calendar-check', module: 'partner-saas', available: true },
      { id: 'creator-campaigns', label: 'Creator Campaign Marketplace', href: '/campaigns', icon: 'award', module: 'partner-saas', available: true },
      { id: 'creator-hub', label: 'Sports Creator Hub', href: '/creator', icon: 'user-round', module: 'partner-saas', available: true },
      { id: 'gate-checkin', label: 'Gate QR Check-In Desk', href: '/gate-checkin', icon: 'shield-check', module: 'partner-saas', available: true },
    ],
  },
  {
    id: 'learn-community',
    label: 'Learn & Community',
    icon: 'file-text',
    items: [
      { id: 'learning-hub', label: 'Sports Learning Hub', href: '/learning', icon: 'book-open', module: 'learn-community', available: true },
      { id: 'guides', label: 'Sports Guides', href: '/guides', icon: 'file-text', module: 'learn-community', available: true },
      { id: 'ai-guide', label: 'AI Sports Guide', href: '/ai-guide', icon: 'activity', module: 'learn-community', available: true },
      { id: 'khelchronicle', label: 'KhelChronicle Research', href: '/khelchronicle', icon: 'award', module: 'learn-community', available: true },
      { id: 'community', label: 'Community', href: '/community', icon: 'users', module: 'learn-community', available: true },
      { id: 'tools', label: 'Sports Tools & Calculators', href: '/tools', icon: 'sliders', module: 'learn-community', available: true },
    ],
  },
  {
    id: 'network',
    label: 'KhelGrid Network',
    icon: 'globe',
    items: [
      { id: 'trust', label: 'Trust Center', href: '/trust', icon: 'shield-check', module: 'network', available: true },
      { id: 'pricing', label: 'Pricing & Memberships', href: '/pricing', icon: 'wallet', module: 'network', available: true },
      { id: 'partners', label: 'Partner with KhelGrid', href: '/partners', icon: 'handshake', module: 'network', available: true },
      { id: 'careers', label: 'Careers', href: '/careers', icon: 'users', module: 'network', available: true },
      { id: 'about', label: 'About KhelGrid', href: '/about', icon: 'info', module: 'network', available: true },
      { id: 'contact', label: 'Contact KhelGrid', href: '/contact', icon: 'mail', module: 'network', available: true },
    ],
  },
]

export const primaryNavigation = navigationModules.flatMap(section => section.items)

/** Header actions are maintained separately from feature navigation. */
export const headerNavigation = (navigationModules.find(section => section.id === 'your-space')?.items ?? []).filter(item => ['/', '/workspace', '/dashboard', '/saved'].includes(item.href))

export function getNavigationHref(item: NavigationItem): string {
  return item.href
}
