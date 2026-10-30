import { useEffect, useMemo, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getOpportunities } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'

function formatDate(value: string | null) {
  if (!value) return 'Date not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not provided' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(date)
}

export default function OpportunitiesPage() {
  const [result, setResult] = useState<CatalogueResult<Opportunity> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [type, setType] = useState('')
  const [verification, setVerification] = useState('')
  useEffect(() => { let active = true; getOpportunities().then(value => { if (active) setResult(value) }); return () => { active = false } }, [])
  const records = result.status === 'ready' ? result.data : []
  const cities = useMemo(() => [...new Set(records.map(item => item.city).filter((value): value is string => Boolean(value)))].sort(), [records])
  const visible = useMemo(() => records.filter(item => {
    const q = query.trim().toLocaleLowerCase()
    return (!q || [item.title,item.organizer_name,item.city,item.venue_name,item.opportunity_type].some(value => value?.toLocaleLowerCase().includes(q)))
      && (!city || item.city === city) && (!type || item.opportunity_type === type)
      && (!verification || item.verification_status === verification)
  }), [records,query,city,type,verification])
  return <section className="content-page"><p className="eyebrow">TRIALS · SELECTIONS · PROGRAMMES</p><h1>Your next opportunity.</h1><p className="page-intro">Published opportunities only. Check the source and organizer details before applying.</p>
    {result.status === 'ready' && <div className="catalogue-controls" role="search" aria-label="Filter opportunities">
      <label>Search<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Title, organiser, city…" /></label>
      <label>City<select value={city} onChange={e => setCity(e.target.value)}><option value="">All cities</option>{cities.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Type<select value={type} onChange={e => setType(e.target.value)}><option value="">All types</option>{['trial','combine','scholarship','camp','job','other'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Source status<select value={verification} onChange={e => setVerification(e.target.value)}><option value="">All statuses</option>{['verified','pending_review','unverified'].map(value => <option key={value} value={value}>{value.replace('_',' ')}</option>)}</select></label>
      <button className="secondary-link" type="button" onClick={() => { setQuery(''); setCity(''); setType(''); setVerification('') }}>Clear filters</button>
    </div>}
    <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>{result.status === 'ready' && (visible.length ? <><p className="results-count" aria-live="polite">{visible.length} of {records.length} opportunities</p><div className="listing-stack">{visible.map(item => <article className="listing-card" key={item.id}>{item.slug.startsWith('test-only-') && <span className="test-only-label">TEST ONLY — NOT A REAL LISTING</span>}<div className="listing-topline"><span className="tag"><SiteIcon name="calendar" size={14} /> {item.opportunity_type.replace('_', ' ')}</span><span className={item.verification_status === 'verified' ? 'verification verified' : 'verification'}><SiteIcon name={item.verification_status === 'verified' ? 'shield-check' : 'info'} size={14} /> {item.verification_status === 'verified' ? 'Source reviewed' : 'Not verified'}</span></div><h2>{item.title}</h2><p>{[item.organizer_name, item.city, item.venue_name].filter(Boolean).join(' · ') || 'Location or organizer not provided'}</p><div className="listing-meta"><span><SiteIcon name="calendar" size={14} /> Start: {formatDate(item.starts_at)}</span>{item.application_deadline && <span><SiteIcon name="clock" size={14} /> Deadline: {formatDate(item.application_deadline)}</span>}</div>{item.source_url && <a className="text-link" href={item.source_url} target="_blank" rel="noreferrer"><SiteIcon name="external-link" size={14} /> View source {item.source_name ? `· ${item.source_name}` : ''}</a>}</article>)}</div></> : <div className="state-panel" role="status"><h3>{records.length ? 'No matching opportunities' : 'No published opportunities'}</h3><p>{records.length ? 'Change or clear your filters.' : 'Published records will appear here when available.'}</p></div>)}</AsyncState>
  </section>
}
