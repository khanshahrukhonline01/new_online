import { useEffect, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'

export default function VenuesPage() {
  const [result, setResult] = useState<CatalogueResult<Venue> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  useEffect(() => { let active = true; getVenues().then(value => { if (active) setResult(value) }); return () => { active = false } }, [])
  return <section className="content-page"><p className="eyebrow">VENUE DIRECTORY</p><h1>Find a place to play.</h1><p className="page-intro">Browse venues that have been published to the development catalogue. Booking and live availability are not enabled.</p><AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>{result.status === 'ready' && (result.data.length ? <div className="catalogue-grid">{result.data.map(venue => <article className="catalogue-card venue-card" key={venue.id}><span className="card-kicker"><SiteIcon name="building" size={14} /> VENUE</span><h2>{venue.name}</h2><p><SiteIcon name="map-pin" size={15} /> {venue.city}</p>{venue.address && <p className="muted">{venue.address}</p>}{venue.description && <p>{venue.description}</p>}<span className="availability-note"><SiteIcon name="info" size={14} /> Availability not connected</span></article>)}</div> : <AsyncState state="empty" />)}</AsyncState></section>
}
