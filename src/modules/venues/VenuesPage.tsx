import { useEffect, useMemo, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'

export default function VenuesPage() {
  const [result, setResult] = useState<CatalogueResult<Venue> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  const initial = new URLSearchParams(window.location.search)
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [city, setCity] = useState(initial.get('city') ?? '')
  const [facility, setFacility] = useState(initial.get('facility') ?? '')
  const [sort, setSort] = useState(initial.get('sort') ?? 'name')
  useEffect(() => { let active = true; getVenues().then(value => { if (active) setResult(value) }); return () => { active = false } }, [])
  const records = result.status === 'ready' ? result.data : []
  const cities = useMemo(() => [...new Set(records.map(item => item.city).filter(Boolean))].sort(), [records])
  const visible = useMemo(() => records.filter(item => (!city || item.city === city) && (!facility || String(Boolean(item.government_facility)) === facility) && (!query.trim() || [item.name,item.description,item.city,item.address].some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))).sort((a,b) => sort === 'city' ? (a.city ?? '').localeCompare(b.city ?? '') : a.name.localeCompare(b.name)), [records,city,query,facility,sort])
  const fields = [
    { key: 'city', label: 'City', value: city, onChange: setCity, options: cities.map(value => ({ value, label: value })) },
    { key: 'facility', label: 'Facility type', value: facility, onChange: setFacility, options: [{ value: 'true', label: 'Government facility' }, { value: 'false', label: 'Other facility' }] },
  ]
  return <section className="content-page"><p className="eyebrow">VENUE DIRECTORY</p><h1>Find a place to play.</h1><p className="page-intro">Browse venues that have been published to the development catalogue. Booking and live availability are not enabled.</p>
    <div className="kg-catalogue-layout"><CatalogueFilterPanel search={query} onSearch={setQuery} searchPlaceholder="Venue, location…" fields={fields} onClear={() => { setQuery(''); setCity(''); setFacility('') }} /><div className="kg-catalogue-results"><div className="kg-results-toolbar"><span>Explore published venues</span><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name</option><option value="city">City</option></select></label></div>
    <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>{result.status === 'ready' && (visible.length ? <><p className="results-count" aria-live="polite">{visible.length} of {records.length} venues</p><div className="catalogue-grid">{visible.map(venue => <article className="catalogue-card venue-card" key={venue.id}>{venue.slug.startsWith('test-only-') && <span className="test-only-label">TEST ONLY — NOT A REAL LISTING</span>}<span className="card-kicker"><SiteIcon name="building" size={14} /> VENUE</span><h2>{venue.name}</h2><p><SiteIcon name="map-pin" size={15} /> {venue.city}</p>{venue.address && <p className="muted">{venue.address}</p>}{venue.description && <p>{venue.description}</p>}<span className="availability-note"><SiteIcon name="info" size={14} /> Availability not connected</span></article>)}</div></> : <div className="state-panel" role="status"><h3>{records.length ? 'No matching venues' : 'No published venues'}</h3><p>{records.length ? 'Change or clear your filters.' : 'Published records will appear here when available.'}</p></div>)}</AsyncState></div></div>
  </section>
}
