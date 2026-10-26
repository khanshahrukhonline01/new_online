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
 * Only routes handled by App.tsx are listed. Search stays in its own module
 * because the header renders a dedicated search control outside its links.
 */
export const navigationModules: NavigationModule[] = [
  {
    id: 'core',
    label: 'Explore',
    items: [
      { id: 'home', label: 'Home', href: '/', icon: 'home', module: 'core' },
      {
        id: 'sports',
        label: 'Sports',
        href: '/sports',
        icon: 'sports',
        module: 'sports',
        children: [
          { id: 'all-sports', label: 'All sports', href: '/sports', icon: 'sports', module: 'sports' },
        ],
      },
      { id: 'opportunities', label: 'Trials & opportunities', href: '/opportunities', icon: 'opportunities', module: 'opportunities' },
      { id: 'venues', label: 'Venues', href: '/venues', icon: 'venues', module: 'venues' },
    ],
  },
  {
    id: 'discovery-tools',
    label: 'Discovery tools',
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

export function getNavigationHref(item: NavigationItem): string {
  return item.href
}
