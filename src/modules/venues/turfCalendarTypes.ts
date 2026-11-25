export type TurfShellSection = 'calendar' | 'utilization' | 'maintenance'

export type TurfActiveDrawer =
  | null
  | 'booking'
  | 'voucher'
  | 'settings'
  | 'pricing'
  | 'walkin'
  | 'recurring'

export interface CuratedTurfVenue {
  slug: string
  name: string
  city: string
  sport: string
}

export const CURATED_TURF_VENUES: readonly CuratedTurfVenue[] = [
  { slug: 'sree-kanteerava-stadium', name: 'Sree Kanteerava Stadium', city: 'Bengaluru', sport: 'Football, Box Cricket & Badminton' },
  { slug: 'talkatora-indoor-stadium', name: 'Talkatora Indoor Stadium', city: 'Delhi', sport: 'Badminton & Table Tennis' },
  { slug: 'andheri-sports-complex', name: 'Andheri Sports Complex', city: 'Mumbai', sport: 'Football Turf & Cricket Nets' },
  { slug: 'decathlon-anubhava-turf', name: 'Decathlon Anubhava Turf Arena', city: 'Bengaluru', sport: '5v5 AstroTurf & Basketball' },
]

/** Resolves curated facility metadata or safe fallback for a dynamic venue slug. */
export function resolveTurfVenueMeta(venueSlug: string): CuratedTurfVenue {
  return (
    CURATED_TURF_VENUES.find(v => v.slug === venueSlug) || {
      slug: venueSlug,
      name: 'Grassroots Sports Complex',
      city: 'India',
      sport: 'Multi-Sport Turf',
    }
  )
}
