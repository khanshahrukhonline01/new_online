import { useEffect, useMemo, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'

export default function VenuesPage() {
  const [result, setResult] = useState<CatalogueResult<Venue> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  useEffect(() => { let active = true; getVenues().then(value => { if (active) setResult(value) }); return () => { active = false } }, [])
  const records = result.status === 'ready' ? result.data : []
  const cities = useMemo(() => [...new Set(records.map(item => item.city).filter(Boolean))].sort(), [records])
  const visible = useMemo(() => records.filter(item => (!city || item.city === city) && (!query.trim() || [item.name,item.description,item.city,item.address].some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))), [records,city,query])
  return <section className="content-page"><p className="eyebrow">VENUE DIRECTORY</p><h1>Find a place to play.</h1><p className="page-intro">Browse venues that have been published to the development catalogue. Booking and live availability are not enabled.</p>
    {result.status === 'ready' && <div className="catalogue-controls" role="search" aria-label="Filter venues"><label>Search<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Venue, sport, location…" /></label><label>City<select value={city} onChange={e => setCity(e.target.value)}><option value="">All cities</option>{cities.map(value => <option key={value}>{value}</option>)}</select></label><button className="secondary-link" type="button" onClick={() => { setQuery(''); setCity('') }}>Clear filters</button></div>}
    <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>{result.status === 'ready' && (visible.length ? <><p className="results-count" aria-live="polite">{visible.length} of {records.length} venues</p><div className="catalogue-grid">{visible.map(venue => <article className="catalogue-card venue-card" key={venue.id}>{venue.slug.startsWith('test-only-') && <span className="test-only-label">TEST ONLY — NOT A REAL LISTING</span>}<span className="card-kicker"><SiteIcon name="building" size={14} /> VENUE</span><h2>{venue.name}</h2><p><SiteIcon name="map-pin" size={15} /> {venue.city}</p>{venue.address && <p className="muted">{venue.address}</p>}{venue.description && <p>{venue.description}</p>}<span className="availability-note"><SiteIcon name="info" size={14} /> Availability not connected</span></article>)}</div></> : <div className="state-panel" role="status"><h3>{records.length ? 'No matching venues' : 'No published venues'}</h3><p>{records.length ? 'Change or clear your filters.' : 'Published records will appear here when available.'}</p></div>)}</AsyncState>
  </section>
}
