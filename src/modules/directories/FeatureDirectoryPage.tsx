import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteIcon } from '../../shared/components/SiteIcon'
import './feature-directory.css'

type Kind = 'coaches' | 'academies' | 'events' | 'calendar'
type Item = { id: string; slug: string; name?: string; display_name?: string; title?: string; bio?: string; description?: string; city?: string; state?: string; organizer_name?: string; event_type?: string; venue_name?: string; starts_at?: string; ends_at?: string; source_name?: string; source_url?: string }
type Status = 'loading' | 'ready' | 'unconfigured' | 'unavailable'
const config: Record<Kind, { title: string; eyebrow: string; intro: string; table: string; select: string; order: string }> = {
 coaches: { title: 'Coaches directory', eyebrow: 'COACHING', intro: 'Explore published coach profiles. Confirm experience, credentials and contact details directly with each coach.', table: 'coaches', select: 'id,slug,display_name,bio,city,state,publication_status', order: 'display_name.asc' },
 academies: { title: 'Sports academies', eyebrow: 'COACHING', intro: 'Browse published academy records. Confirm programme availability, admission, fees and facilities with the academy.', table: 'academies', select: 'id,slug,name,description,city,state,publication_status', order: 'name.asc' },
 events: { title: 'Events & tournaments', eyebrow: 'SPORTS EVENTS', intro: 'Discover published events with dates and source links where available. Verify changes with the organiser.', table: 'events', select: 'id,slug,title,event_type,organizer_name,city,venue_name,starts_at,ends_at,source_name,source_url,publication_status', order: 'starts_at.asc.nullslast' },
 calendar: { title: 'Sports calendar', eyebrow: 'SPORTS CALENDAR', intro: 'Filter published events by date. Dates are displayed in your browser’s local timezone; confirm changes with the organiser.', table: 'events', select: 'id,slug,title,event_type,organizer_name,city,venue_name,starts_at,ends_at,source_name,source_url,publication_status', order: 'starts_at.asc.nullslast' },
}
function isSafeExternalUrl(value: string) { try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' } catch { return false } }
function formatDate(value?: string) { if (!value) return 'Date not provided'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Date not provided' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) }

export default function FeatureDirectoryPage({ kind }: { kind: Kind }) {
 const page = config[kind]
 const [records, setRecords] = useState<Item[]>([])
 const [status, setStatus] = useState<Status>('loading')
 const [message, setMessage] = useState('')
 const [city, setCity] = useState('')
 const [query, setQuery] = useState('')
 const [fromDate, setFromDate] = useState('')
 const [toDate, setToDate] = useState('')
 const load = useCallback(async () => {
  setStatus('loading')
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) { setStatus('unconfigured'); return }
  try {
   const params = new URLSearchParams({ select: page.select, order: page.order, publication_status: 'eq.published', limit: '200' })
   const response = await fetch(url + '/rest/v1/' + page.table + '?' + params.toString(), { headers: { apikey: key, Authorization: 'Bearer ' + key } })
   if (!response.ok) { setMessage(response.status === 404 || response.status === 400 ? 'The required directory table or columns are not available in this database yet.' : 'The directory service is unavailable.'); setStatus('unavailable'); return }
   const data: unknown = await response.json()
   if (!Array.isArray(data)) { setMessage('The directory returned an unexpected response.'); setStatus('unavailable'); return }
   setRecords(data as Item[]); setStatus('ready')
  } catch { setMessage('Could not connect to the directory. Check your connection and try again.'); setStatus('unavailable') }
 }, [page])
 useEffect(() => { void load() }, [load])
 const cities = useMemo(() => [...new Set(records.map(r => r.city?.trim()).filter((v): v is string => Boolean(v)))].sort((a,b) => a.localeCompare(b)), [records])
 const visible = useMemo(() => records.filter(r => {
  const name = r.display_name ?? r.name ?? r.title ?? ''
  const matches = [name,r.bio,r.description,r.city,r.state,r.organizer_name,r.event_type,r.venue_name].some(v => v?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  if (!matches || (city && r.city !== city)) return false
  if (kind !== 'calendar') return true
  const time = r.starts_at ? new Date(r.starts_at).getTime() : Number.NaN
  const after = fromDate ? new Date(fromDate + 'T00:00:00').getTime() : Number.NEGATIVE_INFINITY
  const before = toDate ? new Date(toDate + 'T23:59:59.999').getTime() : Number.POSITIVE_INFINITY
  return Number.isFinite(time) && time >= after && time <= before
 }), [records,query,city,fromDate,toDate,kind])
 return <section className="content-page feature-directory-page">
  <p className="eyebrow">KHELGRID · {page.eyebrow}</p><h1>{page.title}</h1><p className="page-intro">{page.intro}</p>
  <div className="catalogue-controls" role="search" aria-label={'Filter ' + page.title}>
   <label>Search<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, description, location…" /></label>
   <label>City<select value={city} onChange={e => setCity(e.target.value)}><option value="">All cities</option>{cities.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
   {kind === 'calendar' && <><label>From<input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></label><label>To<input type="date" min={fromDate || undefined} value={toDate} onChange={e => setToDate(e.target.value)} /></label></>}
   <button className="secondary-link" type="button" onClick={() => { setQuery(''); setCity(''); setFromDate(''); setToDate('') }}>Clear filters</button>
  </div>
  {status === 'loading' && <div className="state-panel state-loading" role="status"><div className="state-symbol">…</div><h3>Loading published records</h3><p>No sample listings are added.</p></div>}
  {status === 'unconfigured' && <div className="state-panel state-unavailable" role="status"><div className="state-symbol">!</div><h3>Directory not connected</h3><p>Supabase public environment settings are missing. No example records are shown.</p></div>}
  {status === 'unavailable' && <div className="state-panel state-unavailable" role="alert"><div className="state-symbol">!</div><h3>Records unavailable</h3><p>{message}</p><button className="secondary-link" type="button" onClick={() => void load()}>Try again</button></div>}
  {status === 'ready' && visible.length === 0 && <div className="state-panel" role="status"><div className="state-symbol"><SiteIcon name="search" size={17} /></div><h3>{records.length ? 'No matching records' : 'No published records yet'}</h3><p>{records.length ? 'Try another search, city or date range.' : 'Records appear here after they are reviewed and published. No listings are fabricated.'}</p></div>}
  {status === 'ready' && visible.length > 0 && <div className="catalogue-grid">{visible.map(r => {
   const name = r.display_name ?? r.name ?? r.title ?? 'Untitled record'
   return <article className="catalogue-card" key={r.id}><span className="card-kicker">{kind === 'events' || kind === 'calendar' ? r.event_type ?? 'EVENT' : r.city ?? 'LOCATION NOT PROVIDED'}</span><h2>{name}</h2>
    {(r.city || r.state) && <p>{[r.city,r.state].filter(Boolean).join(', ')}</p>}{(r.bio || r.description) && <p>{r.bio ?? r.description}</p>}
    {(kind === 'events' || kind === 'calendar') && <p><strong>Starts:</strong> {formatDate(r.starts_at)}{r.ends_at ? ' · Ends: ' + formatDate(r.ends_at) : ''}</p>}
    {r.organizer_name && <p><strong>Organiser:</strong> {r.organizer_name}</p>}{r.venue_name && <p><strong>Venue:</strong> {r.venue_name}</p>}{r.source_name && <p><strong>Source:</strong> {r.source_name}</p>}
    {r.source_url && isSafeExternalUrl(r.source_url) && <a className="card-action" href={r.source_url} target="_blank" rel="noopener noreferrer">Open organiser source <SiteIcon name="arrow-up-right" size={14} /></a>}
   </article>
  })}</div>}
  <p className="coming-soon-note">Publication does not mean independent verification. Confirm source, dates, fees, eligibility and availability with the organiser.</p>
 </section>
}
