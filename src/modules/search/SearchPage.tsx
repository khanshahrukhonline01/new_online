import { useMemo, useState, useEffect } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueEmptyState, CatalogueFilterPanel, CatalogueActiveChips } from '../../shared/components/CatalogueFilterPanel'
import type { CanonicalWorkspaceId } from '../../shared/components/workspaceHeaderEngine'
import { CANONICAL_WORKSPACES } from '../../shared/components/workspaceHeaderEngine'
import {
  WorkspaceSearch,
  type WorkspaceSearchCategory,
  type WorkspaceSearchDatasets,
  type WorkspaceSearchSource,
} from '../workspace/WorkspaceSearch'

type SearchRecord = {
  type: 'Sport' | 'Opportunity' | 'Venue' | 'Academy' | 'Coach' | 'Event' | 'Research' | 'City' | 'Pickup' | 'Campaign' | 'Workspace'
  title: string
  detail: string
  href: string
  keywords?: string[]
}

const CATEGORY_TO_RECORD_TYPE: Record<WorkspaceSearchCategory, SearchRecord['type']> = {
  sport: 'Sport',
  trial: 'Opportunity',
  venue: 'Venue',
  academy: 'Academy',
  coach: 'Coach',
  event: 'Event',
  paper: 'Research',
  city: 'City',
  game: 'Pickup',
  campaign: 'Campaign',
  workspace: 'Workspace',
}

function isCanonicalWorkspaceId(value: string | null): value is CanonicalWorkspaceId {
  return Boolean(value && CANONICAL_WORKSPACES.some(w => w.id === value))
}

export default function SearchPage({
  initialQuery = '',
  activeHeaderPersona,
}: {
  initialQuery?: string
  activeHeaderPersona?: CanonicalWorkspaceId
}) {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const [query, setQuery] = useState(params.get('q') ?? initialQuery)
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance')
  const personaParam = params.get('persona')
  const resolvedPersona: CanonicalWorkspaceId | undefined = isCanonicalWorkspaceId(personaParam)
    ? personaParam
    : activeHeaderPersona
  const [unscoped, setUnscoped] = useState(!resolvedPersona)

  const sportParam = params.get('sport')
  const cityParam = params.get('city')
  const filterSport = sportParam && !sportParam.toLowerCase().includes('all') ? sportParam.toLowerCase() : ''
  const filterCity = cityParam && !cityParam.toLowerCase().includes('all') ? cityParam.toLowerCase() : ''

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
    }
  }, [initialQuery])

  useEffect(() => {
    setUnscoped(!resolvedPersona)
    setCategory('')
  }, [resolvedPersona])

  const effectivePersona: CanonicalWorkspaceId = resolvedPersona ?? 'athlete'
  const searchProfile = useMemo(
    () => WorkspaceSearch.getProfile(effectivePersona),
    [effectivePersona],
  )
  const activeSources = useMemo<readonly WorkspaceSearchSource[]>(
    () => WorkspaceSearch.getAllowedSources(effectivePersona, { unscoped }),
    [effectivePersona, unscoped],
  )

  const [datasets, setDatasets] = useState<WorkspaceSearchDatasets>({})
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready'>('loading')

  // Query ONLY the data sources permitted by activeSources via centralized WorkspaceSearch
  useEffect(() => {
    let active = true
    setLoadStatus('loading')
    WorkspaceSearch.loadScopeDatasets(effectivePersona, { unscoped })
      .then(({ datasets: nextDatasets }) => {
        if (!active) return
        setDatasets(nextDatasets)
        setLoadStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setDatasets({})
        setLoadStatus('ready')
      })
    return () => {
      active = false
    }
  }, [effectivePersona, unscoped])

  const records = useMemo<SearchRecord[]>(() => {
    if (loadStatus !== 'ready') return []
    const items = WorkspaceSearch.buildScopedSearchIndex(effectivePersona, datasets, { unscoped })
    return items
      .filter(item => item.source !== 'workspace')
      .map(item => ({
        type: CATEGORY_TO_RECORD_TYPE[item.category],
        title: item.title,
        detail: item.subtitle,
        href: item.href,
        keywords: item.keywords,
      }))
  }, [loadStatus, effectivePersona, datasets, unscoped])

  const ready = loadStatus === 'ready'
  const pending = loadStatus === 'loading'

  const q = query.trim().toLocaleLowerCase()
  const results = useMemo(
    () =>
      records
        .filter(item => {
          const text = `${item.title} ${item.detail} ${item.type} ${item.keywords ? item.keywords.join(' ') : ''}`.toLocaleLowerCase()
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

  const allowedTypeOptions = useMemo(() => {
    if (unscoped) {
      return ['Sport', 'Opportunity', 'Venue', 'Academy', 'Coach', 'Event', 'Research', 'City', 'Pickup']
    }
    const map: Record<WorkspaceSearchSource, SearchRecord['type'] | null> = {
      sports: 'Sport',
      trials: 'Opportunity',
      venues: 'Venue',
      academies: 'Academy',
      coaches: 'Coach',
      events: 'Event',
      papers: 'Research',
      cities: 'City',
      games: 'Pickup',
      campaigns: 'Campaign',
      workspace: null,
    }
    return activeSources
      .map(s => map[s])
      .filter((val): val is SearchRecord['type'] => Boolean(val))
  }, [activeSources, unscoped])

  const fields = [
    {
      key: 'category',
      label: 'Content type',
      value: category,
      onChange: setCategory,
      options: allowedTypeOptions.map(value => ({
        value: value.toLocaleLowerCase(),
        label: value === 'Research' ? 'Research (KhelChronicle)' : value === 'Pickup' ? 'Pickup Games' : value,
      })),
    },
  ]

  const hasActiveFilters = Boolean(query.trim() || category || sort !== 'relevance')

  return (
    <section className="content-page">
      <p className="eyebrow">{unscoped ? 'DISCOVER' : searchProfile.scopeLabel.toUpperCase()}</p>
      <h1>Search KhelGrid.</h1>
      <p className="page-intro">
        {unscoped
          ? 'Search published sports, opportunities, venues, academies, coaches, events and sports science research preprints. Results come from the connected catalogue, not sample listings.'
          : `${searchProfile.description}. Results come directly from connected workspace data sources.`}
      </p>
      {resolvedPersona && (
        <div
          className="kg-search-scope-banner"
          role="region"
          aria-label="Workspace search scope"
        >
          <span className="kg-search-scope-label">
            <span className="kg-search-scope-dot" aria-hidden="true" />
            {unscoped
              ? 'Showing results across all KhelGrid data sources'
              : `Scoped to ${searchProfile.label} Workspace (${activeSources.filter(s => s !== 'workspace').join(', ')})`}
          </span>
          <button
            type="button"
            className="kg-search-scope-btn"
            onClick={() => setUnscoped(prev => !prev)}
          >
            {unscoped ? `Scope to ${searchProfile.label}` : 'Search all KhelGrid'}
          </button>
        </div>
      )}
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
          <CatalogueActiveChips search={query} onSearch={setQuery} fields={fields} onClear={clearAll} />
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
