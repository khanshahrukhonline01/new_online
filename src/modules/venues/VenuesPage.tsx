import { useEffect, useMemo, useState } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueEmptyState, CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'

const EMPTY_VENUES: Venue[] = []

export default function VenuesPage() {
  const [result, setResult] = useState<CatalogueResult<Venue> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })
  const initial = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const pathCityMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/city\/([^/]+)/) : null
  const defaultCity = initial.get('city') ?? (pathCityMatch ? decodeURIComponent(pathCityMatch[1]) : '')
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [city, setCity] = useState(defaultCity)
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

  const visible = useMemo(
    () =>
      records
        .filter(
          item =>
            (!city || item.city.toLowerCase().includes(city.toLowerCase())) &&
            (!facility || String(Boolean(item.government_facility)) === facility) &&
            (!query.trim() ||
              [item.name, item.description, item.city, item.address].some(value =>
                value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
              )),
        )
        .sort((a, b) =>
          sort === 'city' ? (a.city ?? '').localeCompare(b.city ?? '') : a.name.localeCompare(b.name),
        ),
    [records, city, query, facility, sort],
  )

  const clearAll = () => {
    setQuery('')
    setCity('')
    setFacility('')
    setSort('name')
  }

  const fields = [
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

  const hasActiveFilters = Boolean(query.trim() || city || facility || sort !== 'name')

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
        buttonHref="mailto:khelgrid@gmail.com?subject=List%20a%20sports%20venue%20on%20KhelGrid"
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
        />
        <div className="kg-catalogue-results">
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
                          <SiteIcon name="building" size={14} /> VENUE
                        </span>
                        <h2>{venue.name}</h2>
                        <p>
                          <SiteIcon name="map-pin" size={15} /> {venue.city}
                        </p>
                        {venue.address && <p className="muted">{venue.address}</p>}
                        {venue.description && <p>{venue.description}</p>}
                        <span className="availability-note">
                          <SiteIcon name="info" size={14} /> Availability not connected
                        </span>
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
                      : 'Published records will appear here when available.'
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
