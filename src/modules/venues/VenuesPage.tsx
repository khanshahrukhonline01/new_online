import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import {
  CatalogueEmptyState,
  CatalogueFilterPanel,
  CatalogueQuickFilters,
  CatalogueActiveChips,
  type QuickFilterPill,
} from '../../shared/components/CatalogueFilterPanel'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'

const EMPTY_VENUES: Venue[] = []

export interface VenuesPageProps {
  onOpenIntake?: () => void
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function VenuesPage({ onOpenIntake, onNavigate }: VenuesPageProps = {}) {
  const [result, setResult] = useState<CatalogueResult<Venue> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })
  const initial = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const pathCityMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/city\/([^/]+)/) : null
  const defaultCity = initial.get('city') ?? (pathCityMatch ? decodeURIComponent(pathCityMatch[1]) : '')
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [city, setCity] = useState(defaultCity)
  const [sport, setSport] = useState(initial.get('sport') ?? '')
  const [facility, setFacility] = useState(initial.get('facility') ?? '')
  const [sort, setSort] = useState(initial.get('sort') ?? 'name')

  useEffect(() => {
    let active = true
    const loadVenues = () => {
      getVenues().then(value => {
        if (active) setResult(value)
      })
    }
    loadVenues()
    window.addEventListener('khelgrid:listing-added', loadVenues)
    return () => {
      active = false
      window.removeEventListener('khelgrid:listing-added', loadVenues)
    }
  }, [])

  const records = useMemo(() => (result.status === 'ready' ? result.data : EMPTY_VENUES), [result])

  const cities = useMemo(
    () => [...new Set(records.map(item => item.city).filter((value): value is string => Boolean(value)))].sort(),
    [records],
  )

  const sports = useMemo(() => {
    const list = new Set<string>()
    records.forEach(item => {
      if (item.sport) list.add(item.sport)
      item.sports?.forEach(s => list.add(s.name))
    })
    ;['Badminton', 'Cricket', 'Football', 'Swimming', 'Tennis', 'Basketball', 'Table Tennis', 'Squash', 'Athletics'].forEach(s => list.add(s))
    return [...list].sort()
  }, [records])

  const visible = useMemo(
    () =>
      records
        .filter(
          item =>
            (!city || item.city.toLowerCase().includes(city.toLowerCase())) &&
            (!facility || String(Boolean(item.government_facility)) === facility) &&
            (!sport || (
              (item.sport && item.sport.toLowerCase().includes(sport.toLowerCase())) ||
              item.sports?.some(s => s.name.toLowerCase().includes(sport.toLowerCase())) ||
              item.name.toLowerCase().includes(sport.toLowerCase()) ||
              (item.description && item.description.toLowerCase().includes(sport.toLowerCase()))
            )) &&
            (!query.trim() ||
              [item.name, item.description, item.city, item.address].some(value =>
                value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
              )),
        )
        .sort((a, b) =>
          sort === 'city' ? (a.city ?? '').localeCompare(b.city ?? '') : a.name.localeCompare(b.name),
        ),
    [records, city, sport, query, facility, sort],
  )

  const clearAll = () => {
    setQuery('')
    setCity('')
    setSport('')
    setFacility('')
    setSort('name')
  }

  const fields = [
    { key: 'sport', label: 'Sport', value: sport, onChange: setSport, options: sports.map(value => ({ value, label: value })) },
    { key: 'city', label: 'City', value: city, onChange: setCity, options: cities.map(value => ({ value, label: value })) },
    {
      key: 'facility',
      label: 'Facility type',
      value: facility,
      onChange: setFacility,
      options: [
        { value: 'true', label: 'Government facility' },
        { value: 'false', label: 'Other facility' },
      ],
    },
  ]

  const quickFilters: QuickFilterPill[] = [
    { id: 'govt', label: 'Govt Complexes', icon: 'building', active: facility === 'true', onClick: () => setFacility(prev => prev === 'true' ? '' : 'true') },
    { id: 'badminton', label: 'Badminton Courts', icon: 'sports', active: sport === 'Badminton', onClick: () => setSport(prev => prev === 'Badminton' ? '' : 'Badminton') },
    { id: 'cricket', label: 'Cricket Turfs', icon: 'sports', active: sport === 'Cricket', onClick: () => setSport(prev => prev === 'Cricket' ? '' : 'Cricket') },
    { id: 'football', label: 'Football Grounds', icon: 'sports', active: sport === 'Football', onClick: () => setSport(prev => prev === 'Football' ? '' : 'Football') },
    { id: 'swimming', label: 'Swimming Pools', icon: 'sports', active: sport === 'Swimming', onClick: () => setSport(prev => prev === 'Swimming' ? '' : 'Swimming') },
  ]

  const hasActiveFilters = Boolean(query.trim() || city || sport || facility || sort !== 'name')

  return (
    <section className="content-page">
      <p className="eyebrow">VENUE DIRECTORY</p>
      <h1>Find a place to play.</h1>
      <p className="page-intro">
        Browse venues that have been published to the development catalogue. Booking and live availability are not
        enabled.
      </p>

      <DirectoryCallout
        variant="venue"
        tag="0% Commission"
        title="Manage a sports facility? List with 0% Fee"
        description="Showcase your courts, turfs, and grounds to athletes across India."
        buttonLabel="List your venue"
        buttonHref={onOpenIntake ? '#' : 'mailto:khelgrid@gmail.com?subject=List%20a%20sports%20venue%20on%20KhelGrid'}
        onButtonClick={onOpenIntake}
      />
      <div className="kg-catalogue-layout">
        <CatalogueFilterPanel
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Venue, location…"
          fields={fields}
          onClear={clearAll}
          sort={sort}
          onSort={setSort}
          defaultSort="name"
          resultCount={visible.length}
          totalCount={records.length}
          quickFilters={quickFilters}
        />
        <div className="kg-catalogue-results">
          <CatalogueQuickFilters items={quickFilters} />
          <CatalogueActiveChips search={query} onSearch={setQuery} fields={fields} onClear={clearAll} />
          <div className="kg-results-toolbar">
            <span>
              {visible.length} of {records.length} venues
            </span>
            <label>
              Sort by{' '}
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="name">Name A to Z</option>
                <option value="city">City</option>
              </select>
            </label>
          </div>
          <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>
            {result.status === 'ready' &&
              (visible.length ? (
                <>
                  <p className="results-count" aria-live="polite">
                    {visible.length} of {records.length} venues
                  </p>
                  <div className="catalogue-grid">
                    {visible.map(venue => (
                      <article className="catalogue-card venue-card" key={venue.id}>
                        {venue.slug.startsWith('test-only-') && (
                          <span className="test-only-label">TEST ONLY — NOT A REAL LISTING</span>
                        )}
                        <span className="card-kicker">
                          {venue.government_facility ? 'Government facility' : 'Sports venue'}
                        </span>
                        <h2>{venue.name}</h2>
                        <p>{venue.city}</p>
                        {venue.description ? <p className="venue-description">{venue.description}</p> : null}
                        <div className="card-meta">
                          <span>
                            <SiteIcon name="map-pin" size={14} /> {venue.address || venue.city}
                          </span>
                          <span>
                            <SiteIcon name="clock" size={14} /> {venue.timezone}
                          </span>
                        </div>
                        <a
                          className="card-action"
                          href={`/venues/${encodeURIComponent(venue.slug)}`}
                          onClick={event => {
                            if (onNavigate) {
                              onNavigate(event, `/venues/${encodeURIComponent(venue.slug)}`)
                            }
                          }}
                        >
                          View venue details
                        </a>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <CatalogueEmptyState
                  title={records.length ? 'No matching venues' : 'No published venues'}
                  message={
                    records.length
                      ? 'Try another search, city or facility type, or clear your filters.'
                      : 'Published venues will appear here when available.'
                  }
                  hasFilters={hasActiveFilters}
                  onClear={clearAll}
                />
              ))}
          </AsyncState>
        </div>
      </div>
    </section>
  )
}
