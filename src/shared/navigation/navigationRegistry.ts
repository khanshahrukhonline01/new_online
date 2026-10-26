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
