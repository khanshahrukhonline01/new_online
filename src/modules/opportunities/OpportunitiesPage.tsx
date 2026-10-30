import { useEffect, useMemo, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getOpportunities } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'

function formatDate(value: string | null) {
  if (!value) return 'Date not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not provided' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(date)
}

export default function OpportunitiesPage() {
  const [result, setResult] = useState<CatalogueResult<Opportunity> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  const initial = new URLSearchParams(window.location.search)
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [city, setCity] = useState(initial.get('city') ?? '')
  const [type, setType] = useState(initial.get('type') ?? '')
  const [verification, setVerification] = useState(initial.get('status') ?? '')
  const [sort, setSort] = useState(initial.get('sort') ?? 'newest')
  const [fromDate, setFromDate] = useState(initial.get('from') ?? '')
  const [toDate, setToDate] = useState(initial.get('to') ?? '')
  useEffect(() => { let active = true; getOpportunities().then(value => { if (active) setResult(value) }); return () => { active = false } }, [])
  const records = result.status === 'ready' ? result.data : []
  const cities = useMemo(() => [...new Set(records.map(item => item.city).filter((value): value is string => Boolean(value)))].sort(), [records])
  const visible = useMemo(() => records.filter(item => {
    const q = query.trim().toLocaleLowerCase()
    const start = item.starts_at ? new Date(item.starts_at).getTime() : Number.NaN
    const after = fromDate ? new Date(fromDate + 'T00:00:00+05:30').getTime() : Number.NEGATIVE_INFINITY
    const before = toDate ? new Date(toDate + 'T23:59:59.999+05:30').getTime() : Number.POSITIVE_INFINITY
    return (!q || [item.title,item.organizer_name,item.city,item.venue_name,item.opportunity_type].some(value => value?.toLocaleLowerCase().includes(q)))
      && (!city || item.city === city) && (!type || item.opportunity_type === type)
      && (!verification || item.verification_status === verification)
      && (!fromDate || (Number.isFinite(start) && start >= after))
      && (!toDate || (Number.isFinite(start) && start <= before))
  }).sort((a,b) => sort === 'oldest' ? (a.starts_at ?? '').localeCompare(b.starts_at ?? '') : sort === 'deadline' ? (a.application_deadline ?? '9999').localeCompare(b.application_deadline ?? '9999') : (b.created_at ?? '').localeCompare(a.created_at ?? '')), [records,query,city,type,verification,fromDate,toDate,sort])
  const fields = [
    { key: 'city', label: 'City', value: city, onChange: setCity, options: cities.map(value => ({ value, label: value })) },
    { key: 'type', label: 'Opportunity type', value: type, onChange: setType, options: ['trial','combine','scholarship','camp','job','other'].map(value => ({ value, label: value[0].toUpperCase()+value.slice(1) })) },
    { key: 'status', label: 'Source status', value: verification, onChange: setVerification, options: ['verified','pending_review','unverified'].map(value => ({ value, label: value.replace('_',' ') })) },
    { key: 'from', label: 'Start date from', value: fromDate, onChange: setFromDate, options: [] },
    { key: 'to', label: 'Start date to', value: toDate, onChange: setToDate, options: [] },
  ]
  return <section className="content-page"><p className="eyebrow">TRIALS · SELECTIONS · PROGRAMMES</p><h1>Your next opportunity.</h1><p className="page-intro">Published opportunities only. Check the source and organizer details before applying.</p>
    {result.status === 'ready' && <div className="kg-catalogue-layout"><CatalogueFilterPanel search={query} onSearch={setQuery} searchPlaceholder="Title, organiser, city…" fields={fields} onClear={() => { setQuery(''); setCity(''); setType(''); setVerification(''); setFromDate(''); setToDate('') }} /><div className="kg-catalogue-results"><div className="kg-results-toolbar"><span>Browse published opportunities</span><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Date: oldest first</option><option value="deadline">Deadline soonest</option></select></label></div>}
    <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>{result.status === 'ready' && (visible.length ? <><p className="results-count" aria-live="polite">{visible.length} of {records.length} opportunities</p><div className="listing-stack">{visible.map(item => <article className="listing-card" key={item.id}>{item.slug.startsWith('test-only-') && <span className="test-only-label">TEST ONLY — NOT A REAL LISTING</span>}<div className="listing-topline"><span className="tag"><SiteIcon name="calendar" size={14} /> {item.opportunity_type.replace('_', ' ')}</span><span className={item.verification_status === 'verified' ? 'verification verified' : 'verification'}><SiteIcon name={item.verification_status === 'verified' ? 'shield-check' : 'info'} size={14} /> {item.verification_status === 'verified' ? 'Source reviewed' : 'Not verified'}</span></div><h2>{item.title}</h2><p>{[item.organizer_name, item.city, item.venue_name].filter(Boolean).join(' · ') || 'Location or organizer not provided'}</p><div className="listing-meta"><span><SiteIcon name="calendar" size={14} /> Start: {formatDate(item.starts_at)}</span>{item.application_deadline && <span><SiteIcon name="clock" size={14} /> Deadline: {formatDate(item.application_deadline)}</span>}</div>{item.source_url && <a className="text-link" href={item.source_url} target="_blank" rel="noreferrer"><SiteIcon name="external-link" size={14} /> View source {item.source_name ? `· ${item.source_name}` : ''}</a>}</article>)}</div></> : <div className="state-panel" role="status"><h3>{records.length ? 'No matching opportunities' : 'No published opportunities'}</h3><p>{records.length ? 'Change or clear your filters.' : 'Published records will appear here when available.'}</p></div>)}</AsyncState></div></div>
  </section>
}
