export type TurfShellSection = 'calendar' | 'utilization' | 'maintenance'

export type TurfActiveDrawer =
  | 'booking'
  | 'voucher'
  | 'pricing'
  | 'recurring'
  | 'settings'
  | 'walkin'
  | null

export interface CuratedTurfVenueMeta {
  slug: string
  name: string
  city: string
}

export const CURATED_TURF_VENUES: readonly CuratedTurfVenueMeta[] = [
  { slug: 'sree-kanteerava-stadium', name: 'Sree Kanteerava Stadium', city: 'Bengaluru' },
  { slug: 'jawaharlal-nehru-stadium-delhi', name: 'Jawaharlal Nehru Stadium', city: 'New Delhi' },
  { slug: 'cooperage-football-ground', name: 'Cooperage Football Ground', city: 'Mumbai' },
  { slug: 'gachibowli-athletic-complex', name: 'Gachibowli Athletic Complex', city: 'Hyderabad' },
  { slug: 'balewadi-sports-complex', name: 'Shree Shiv Chhatrapati Sports Complex', city: 'Pune' },
] as const

export function resolveTurfVenueMeta(slug: string): CuratedTurfVenueMeta {
  const match = CURATED_TURF_VENUES.find(v => v.slug === slug)
  if (match) return match
  const formattedName = slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
  return {
    slug,
    name: formattedName || 'KhelGrid Sports Facility',
    city: 'India',
  }
}
