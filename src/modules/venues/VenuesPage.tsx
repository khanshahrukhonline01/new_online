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
import VenueMapView, { type VenueWithDistance } from './VenueMapView'
import { BookmarkButton } from '../../shared/components/BookmarkButton'
import { createVenueSavedItem } from '../../shared/services/savedService'
import {
  calculateDistanceKm,
  formatDistance,
  getVenueCoordinates,
  requestUserLocation,
  type RadiusKm,
  type UserLocation,
} from './venueGeoUtils'

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

  // Geolocation & Map States
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'active' | 'error'>('idle')
  const [geoError, setGeoError] = useState<string | null>(null)
  const [radiusKm, setRadiusKm] = useState<RadiusKm>('all')

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

  // Annotate venues with calculated driving distance from user GPS
  const venuesWithDistance: VenueWithDistance[] = useMemo(() => {
    return records.map(venue => {
      const coords = getVenueCoordinates(venue)
      const distanceKm = userLocation
        ? calculateDistanceKm(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
        : undefined
      return {
        ...venue,
        distanceKm,
      }
    })
  }, [records, userLocation])

  const visible = useMemo(
    () =>
      venuesWithDistance
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
              )) &&
            // Geolocation radius filter
            (radiusKm === 'all' || !userLocation || (item.distanceKm !== undefined && item.distanceKm <= Number(radiusKm))),
        )
        .sort((a, b) => {
          if (sort === 'distance' && a.distanceKm !== undefined && b.distanceKm !== undefined) {
            return a.distanceKm - b.distanceKm
          }
          if (sort === 'city') {
            return (a.city ?? '').localeCompare(b.city ?? '')
          }
          return a.name.localeCompare(b.name)
        }),
    [venuesWithDistance, city, sport, query, facility, sort, radiusKm, userLocation],
  )

  // 1-Tap "Near Me" GPS Handler
  const handleLocateNearMe = async () => {
    setGeoStatus('locating')
    setGeoError(null)
    try {
      const location = await requestUserLocation()
      setUserLocation(location)
      setGeoStatus('active')
      setRadiusKm(25) // Default to 25 km radius
      setSort('distance') // Automatically sort nearest first
    } catch (err: unknown) {
      setGeoStatus('error')
      setGeoError(err instanceof Error ? err.message : 'Unable to retrieve location.')
    }
  }

  // Clear GPS Location
  const handleClearLocation = () => {
    setUserLocation(null)
    setGeoStatus('idle')
    setRadiusKm('all')
    setGeoError(null)
    if (sort === 'distance') {
      setSort('name')
    }
  }

  const clearAll = () => {
    setQuery('')
    setCity('')
    setSport('')
    setFacility('')
    setSort('name')
    handleClearLocation()
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

  const hasActiveFilters = Boolean(query.trim() || city || sport || facility || sort !== 'name' || geoStatus === 'active')

  return (
    <section className="content-page">
      <p className="eyebrow">VENUE & TURF DIRECTORY</p>
      <h1>Find a place to play.</h1>
      <p className="page-intro">
        Explore sports grounds, synthetic turfs, and SAI National Centres of Excellence across India with verified coordinates and interactive directions.
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

          {/* Active Geolocation Radius Bar */}
          {geoStatus === 'active' && userLocation && (
            <div className="kg-geo-active-banner" role="region" aria-label="Active GPS radius filter">
              <div className="kg-geo-active-info">
                <span className="kg-geo-pulse-dot" aria-hidden="true" />
                <span>Showing grounds near you:</span>
              </div>
              <div className="kg-geo-radius-options">
                <button
                  type="button"
                  className={`kg-geo-radius-btn ${radiusKm === 5 ? 'is-active' : ''}`}
                  onClick={() => setRadiusKm(5)}
                >
                  Within 5 km
                </button>
                <button
                  type="button"
                  className={`kg-geo-radius-btn ${radiusKm === 10 ? 'is-active' : ''}`}
                  onClick={() => setRadiusKm(10)}
                >
                  Within 10 km
                </button>
                <button
                  type="button"
                  className={`kg-geo-radius-btn ${radiusKm === 25 ? 'is-active' : ''}`}
                  onClick={() => setRadiusKm(25)}
                >
                  Within 25 km
                </button>
                <button
                  type="button"
                  className={`kg-geo-radius-btn ${radiusKm === 50 ? 'is-active' : ''}`}
                  onClick={() => setRadiusKm(50)}
                >
                  Within 50 km
                </button>
                <button
                  type="button"
                  className={`kg-geo-radius-btn ${radiusKm === 'all' ? 'is-active' : ''}`}
                  onClick={() => setRadiusKm('all')}
                >
                  All Distances
                </button>
                <button
                  type="button"
                  className="kg-geo-clear-btn"
                  onClick={handleClearLocation}
                  title="Clear GPS location"
                  aria-label="Clear location filter"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Geolocation Warning/Error Message */}
          {geoStatus === 'error' && geoError && (
            <div className="kg-geo-error-banner" role="alert">
              <span>⚠️ {geoError}</span>
              <button
                type="button"
                className="kg-geo-clear-btn"
                onClick={() => setGeoStatus('idle')}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Results Toolbar with View Switcher & 1-Tap Near Me Button */}
          <div className="kg-results-toolbar">
            <span>
              {visible.length} of {records.length} venues
            </span>

            <div className="kg-geo-toolbar-group">
              {/* 1-Tap "Near Me" GPS Button */}
              {geoStatus !== 'active' && (
                <button
                  type="button"
                  className={`kg-geo-near-btn ${geoStatus === 'locating' ? 'is-locating' : ''}`}
                  onClick={handleLocateNearMe}
                  disabled={geoStatus === 'locating'}
                  title="Use your GPS to find sports grounds near you"
                >
                  <SiteIcon name="map-pin" size={14} />
                  <span>{geoStatus === 'locating' ? 'Locating…' : 'Near Me'}</span>
                </button>
              )}

              {/* View Switcher: Grid vs Interactive Map */}
              <div className="kg-view-toggle" role="group" aria-label="View switch">
                <button
                  type="button"
                  className={`kg-view-toggle-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                >
                  <SiteIcon name="sliders" size={13} />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  className={`kg-view-toggle-btn ${viewMode === 'map' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('map')}
                  aria-pressed={viewMode === 'map'}
                >
                  <SiteIcon name="map-pin" size={13} />
                  <span>Map</span>
                </button>
              </div>

              {/* Sort By Dropdown */}
              <label>
                Sort by{' '}
                <select value={sort} onChange={e => setSort(e.target.value)}>
                  {userLocation && <option value="distance">Distance: Nearest First</option>}
                  <option value="name">Name A to Z</option>
                  <option value="city">City</option>
                </select>
              </label>
            </div>
          </div>

          <AsyncState state={result.status} message={result.status === 'unavailable' ? result.message : undefined}>
            {result.status === 'ready' &&
              (visible.length ? (
                viewMode === 'map' ? (
                  /* Interactive OpenStreetMap / Leaflet Map View */
                  <VenueMapView
                    venues={visible}
                    userLocation={userLocation}
                    onNavigate={onNavigate}
                  />
                ) : (
                  /* Card Grid View */
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
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="card-kicker">
                                {venue.government_facility ? 'Government facility' : 'Sports venue'}
                              </span>
                              {venue.distanceKm !== undefined && (
                                <span className="venue-distance-badge" title="Driving distance from your GPS location">
                                  📍 {formatDistance(venue.distanceKm)} away
                                </span>
                              )}
                            </div>
                            <BookmarkButton item={createVenueSavedItem(venue)} />
                          </div>
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
                )
              ) : (
                <CatalogueEmptyState
                  title={records.length ? 'No matching venues' : 'No published venues'}
                  message={
                    records.length
                      ? 'Try expanding your radius, searching another city or sport, or clear your filters.'
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
