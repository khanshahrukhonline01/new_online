import type { SiteIconName } from '../components/SiteIcon'

export type NavigationItem = {
  id: string
  label: string
  href: string
  icon: SiteIconName
  module: string
  children?: NavigationItem[]
}

export type NavigationModule = {
  id: string
  label: string
  items: NavigationItem[]
}

/** Shared navigation source for desktop header, sidebar, and mobile drawer.
 * Only routes handled by App.tsx are listed. The groups are shared by the
 * desktop sidebar and mobile drawer; global search also remains in the header.
 */
export const navigationModules: NavigationModule[] = [
  {
    id: 'discover',
    label: 'Discover',
    items: [
      { id: 'home', label: 'Home', href: '/', icon: 'home', module: 'core' },
      {
        id: 'sports',
        label: 'Sports',
        href: '/sports',
        icon: 'sports',
        module: 'sports',
      },
      { id: 'opportunities', label: 'Trials & opportunities', href: '/opportunities', icon: 'opportunities', module: 'opportunities' },
      { id: 'venues', label: 'Venues', href: '/venues', icon: 'venues', module: 'venues' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { id: 'search', label: 'Search', href: '/search', icon: 'search', module: 'search' },
    ],
  },
  {
    id: 'athlete-tools',
    label: 'Athlete tools',
    items: [
      { id: 'sports-cv', label: 'Sports CV', href: '/sports-cv', icon: 'sports-cv', module: 'sports-cv' },
    ],
  },
]

export const primaryNavigation = navigationModules.flatMap(section => section.items)

/** Main header links come from the Discover group; full menu remains grouped. */
export const headerNavigation = navigationModules.find(section => section.id === 'discover')?.items ?? []

export function getNavigationHref(item: NavigationItem): string {
  return item.href
}
