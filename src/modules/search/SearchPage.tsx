import { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { getOpportunities, getSports, getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Opportunity, Sport, Venue } from '../../shared/domain'
import { AsyncState } from '../../shared/components/AsyncState'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'

type SearchRecord = { type: 'Sport' | 'Opportunity' | 'Venue'; title: string; detail: string; href: string }

export default function SearchPage({ initialQuery = '' }: { initialQuery?: string }) {
  const params = new URLSearchParams(window.location.search)
  const [query, setQuery] = useState(params.get('q') ?? initialQuery)
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance')
  useEffect(() => { setQuery(initialQuery) }, [initialQuery])
  const [sports, setSports] = useState<CatalogueResult<Sport> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  const [opportunities, setOpportunities] = useState<CatalogueResult<Opportunity> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  const [venues, setVenues] = useState<CatalogueResult<Venue> | { status: 'loading'; data: [] }>({ status: 'loading', data: [] })
  useEffect(() => {
    let active = true
    Promise.all([getSports(), getOpportunities(), getVenues()]).then(([s, o, v]) => {
      if (active) { setSports(s); setOpportunities(o); setVenues(v) }
    })
    return () => { active = false }
  }, [])
  const records = useMemo<SearchRecord[]>(() => [
    ...(sports.status === 'ready' ? sports.data.map(item => ({ type: 'Sport' as const, title: item.name, detail: 'Sports directory', href: `/sports/${encodeURIComponent(item.slug)}` })) : []),
    ...(opportunities.status === 'ready' ? opportunities.data.map(item => ({ type: 'Opportunity' as const, title: item.title, detail: [item.organizer_name, item.city].filter(Boolean).join(' · ') || 'Opportunity details', href: `/opportunities/${encodeURIComponent(item.slug)}` })) : []),
    ...(venues.status === 'ready' ? venues.data.map(item => ({ type: 'Venue' as const, title: item.name, detail: item.city, href: `/venues/${encodeURIComponent(item.slug)}` })) : []),
  ], [sports, opportunities, venues])
  const ready = [sports, opportunities, venues].some(result => result.status === 'ready')
  const pending = [sports, opportunities, venues].some(result => result.status === 'loading')
  const q = query.trim().toLocaleLowerCase()
  const results = records.filter(item => (!category || item.type.toLocaleLowerCase() === category) && (!q || `${item.title} ${item.detail} ${item.type}`.toLocaleLowerCase().includes(q))).sort((a,b) => sort === 'title' ? a.title.localeCompare(b.title) : 0)
  const fields = [{ key: 'category', label: 'Content type', value: category, onChange: setCategory, options: ['Sport','Opportunity','Venue'].map(value => ({ value: value.toLocaleLowerCase(), label: value })) }]
  return <section className="content-page"><p className="eyebrow">DISCOVER</p><h1>Search KhelGrid.</h1><p className="page-intro">Search published sports, opportunities and venue records. Results come from the connected catalogue, not sample listings.</p><div className="kg-catalogue-layout kg-no-filter-fields"><CatalogueFilterPanel search={query} onSearch={setQuery} searchPlaceholder="Sport, trial, venue or city…" fields={fields} onClear={() => { setQuery(''); setCategory('') }} /><div className="kg-catalogue-results"><div className="kg-results-toolbar"><span>Search all catalogues</span><label>Sort by <select value={sort} onChange={event => setSort(event.target.value)}><option value="relevance">Relevance</option><option value="title">Title A to Z</option></select></label></div>{pending && !ready ? <AsyncState state="loading" /> : !ready ? <AsyncState state="unconfigured" /> : results.length ? <div className="search-results" aria-live="polite"><p className="results-count">{results.length} {results.length === 1 ? 'result' : 'results'}{q ? ` for “${query.trim()}”` : ''}</p>{results.map(item => <a className="search-result" href={item.href} key={`${item.type}-${item.href}`}><span className="card-kicker">{item.type}</span><span className="search-result-title">{item.title}</span><span className="search-result-detail">{item.detail}</span><span className="search-result-arrow" aria-hidden="true"><SiteIcon name="arrow-up-right" size={16} /></span></a>)}</div> : <div className="state-panel" role="status"><span className="state-symbol" aria-hidden="true"><SiteIcon name="search" size={22} /></span><h3>No matching published records</h3><p>Try another word or clear your search. Only records available in the catalogue can appear here.</p></div>}</div></section>
}
