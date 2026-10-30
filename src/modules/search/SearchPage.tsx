import { useMemo, useState, useEffect } from 'react'
import {
  getAcademies,
  getCoaches,
  getEvents,
  getOpportunities,
  getSports,
  getVenues,
} from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Academy, Coach, EventItem, Opportunity, Sport, Venue } from '../../shared/domain'
import { AsyncState } from '../../shared/components/AsyncState'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueEmptyState, CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'

type SearchRecord = {
  type: 'Sport' | 'Opportunity' | 'Venue' | 'Academy' | 'Coach' | 'Event'
  title: string
  detail: string
  href: string
}

export default function SearchPage({ initialQuery = '' }: { initialQuery?: string }) {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const [query, setQuery] = useState(params.get('q') ?? initialQuery)
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance')
  const sportParam = params.get('sport')
  const cityParam = params.get('city')
  const filterSport = sportParam && !sportParam.toLowerCase().includes('all') ? sportParam.toLowerCase() : ''
  const filterCity = cityParam && !cityParam.toLowerCase().includes('all') ? cityParam.toLowerCase() : ''

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
    }
  }, [initialQuery])

  const [sports, setSports] = useState<CatalogueResult<Sport> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })
  const [opportunities, setOpportunities] = useState<CatalogueResult<Opportunity> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })
  const [venues, setVenues] = useState<CatalogueResult<Venue> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })
  const [academies, setAcademies] = useState<CatalogueResult<Academy> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })
  const [coaches, setCoaches] = useState<CatalogueResult<Coach> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })
  const [events, setEvents] = useState<CatalogueResult<EventItem> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })

  useEffect(() => {
    let active = true
    Promise.all([
      getSports(),
      getOpportunities(),
      getVenues(),
      getAcademies(),
      getCoaches(),
      getEvents(),
    ]).then(([s, o, v, a, c, e]) => {
      if (active) {
        setSports(s)
        setOpportunities(o)
        setVenues(v)
        setAcademies(a)
        setCoaches(c)
        setEvents(e)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const records = useMemo<SearchRecord[]>(
    () => [
      ...(sports.status === 'ready'
        ? sports.data.map(item => ({
            type: 'Sport' as const,
            title: item.name,
            detail: 'Sports directory',
            href: `/sports/${encodeURIComponent(item.slug)}`,
          }))
        : []),
      ...(opportunities.status === 'ready'
        ? opportunities.data.map(item => ({
            type: 'Opportunity' as const,
            title: item.title,
            detail: [item.organizer_name, item.city].filter(Boolean).join(' · ') || 'Opportunity details',
            href: `/opportunities/${encodeURIComponent(item.slug)}`,
          }))
        : []),
      ...(venues.status === 'ready'
        ? venues.data.map(item => ({
            type: 'Venue' as const,
            title: item.name,
            detail: item.city,
            href: `/venues/${encodeURIComponent(item.slug)}`,
          }))
        : []),
      ...(academies.status === 'ready'
        ? academies.data.map(item => ({
            type: 'Academy' as const,
            title: item.name,
            detail: [item.city, item.state].filter(Boolean).join(', ') || 'Sports academy',
            href: `/academies?q=${encodeURIComponent(item.name)}`,
          }))
        : []),
      ...(coaches.status === 'ready'
        ? coaches.data.map(item => ({
            type: 'Coach' as const,
            title: item.display_name,
            detail: [item.city, item.state].filter(Boolean).join(', ') || 'Coach profile',
            href: `/coaches?q=${encodeURIComponent(item.display_name)}`,
          }))
        : []),
      ...(events.status === 'ready'
        ? events.data.map(item => ({
            type: 'Event' as const,
            title: item.title,
            detail: [item.organizer_name, item.city].filter(Boolean).join(' · ') || 'Sports event',
            href: `/events?q=${encodeURIComponent(item.title)}`,
          }))
        : []),
    ],
    [sports, opportunities, venues, academies, coaches, events],
  )

  const ready = [sports, opportunities, venues, academies, coaches, events].some(result => result.status === 'ready')
  const pending = [sports, opportunities, venues, academies, coaches, events].some(result => result.status === 'loading')

  const q = query.trim().toLocaleLowerCase()
  const results = useMemo(
    () =>
      records
        .filter(item => {
          const text = `${item.title} ${item.detail} ${item.type}`.toLocaleLowerCase()
          if (q && !text.includes(q)) return false
          if (filterSport && !text.includes(filterSport)) return false
          if (filterCity && !text.includes(filterCity)) return false
          if (category) {
            const isTypeMatch = item.type.toLocaleLowerCase() === category.toLocaleLowerCase()
            const isTextMatch = text.includes(category.toLocaleLowerCase())
            if (!isTypeMatch && !isTextMatch) return false
          }
          return true
        })
        .sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : 0)),
    [records, category, q, filterSport, filterCity, sort],
  )

  const clearAll = () => {
    setQuery('')
    setCategory('')
    setSort('relevance')
  }

  const fields = [
    {
      key: 'category',
      label: 'Content type',
      value: category,
      onChange: setCategory,
      options: ['Sport', 'Opportunity', 'Venue', 'Academy', 'Coach', 'Event'].map(value => ({
        value: value.toLocaleLowerCase(),
        label: value,
      })),
    },
  ]

  const hasActiveFilters = Boolean(query.trim() || category || sort !== 'relevance')

  return (
    <section className="content-page">
      <p className="eyebrow">DISCOVER</p>
      <h1>Search KhelGrid.</h1>
      <p className="page-intro">
        Search published sports, opportunities, venues, academies, coaches and events. Results come from the connected
        catalogue, not sample listings.
      </p>
      <div className="kg-catalogue-layout kg-no-filter-fields">
        <CatalogueFilterPanel
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Sport, trial, venue or city…"
          fields={fields}
          onClear={clearAll}
          sort={sort}
          onSort={setSort}
          defaultSort="relevance"
          resultCount={results.length}
          totalCount={records.length}
        />
        <div className="kg-catalogue-results">
          <div className="kg-results-toolbar">
            <span>
              {results.length} of {records.length} catalogue records
            </span>
            <label>
              Sort by{' '}
              <select value={sort} onChange={event => setSort(event.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="title">Title A to Z</option>
              </select>
            </label>
          </div>
          {pending && !ready ? (
            <AsyncState state="loading" />
          ) : !ready ? (
            <AsyncState state="unconfigured" />
          ) : results.length ? (
            <div className="search-results" aria-live="polite">
              <p className="results-count">
                {results.length} {results.length === 1 ? 'result' : 'results'}
                {q ? ` for “${query.trim()}”` : ''}
              </p>
              {results.map(item => (
                <a className="search-result" href={item.href} key={`${item.type}-${item.href}`}>
                  <span className="card-kicker">{item.type}</span>
                  <span className="search-result-title">{item.title}</span>
                  <span className="search-result-detail">{item.detail}</span>
                  <span className="search-result-arrow" aria-hidden="true">
                    <SiteIcon name="arrow-up-right" size={16} />
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <CatalogueEmptyState
              title={records.length ? 'No matching published records' : 'No published records yet'}
              message={
                records.length
                  ? 'Try another word or clear your search. Only records available in the catalogue can appear here.'
                  : 'Published records will appear here when connected.'
              }
              hasFilters={hasActiveFilters}
              onClear={clearAll}
            />
          )}
        </div>
      </div>
    </section>
  )
}
