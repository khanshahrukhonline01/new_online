import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { ALL_INDIAN_CITIES } from '../../shared/components/citiesData'
import type { CityInfo } from '../../shared/components/citiesData'
import { getCities } from '../../integrations/supabase/public-client'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'
import './CitiesPage.css'

interface CitiesPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
}

export default function CitiesPage({ onNavigate }: CitiesPageProps) {
  const [cities, setCities] = useState<CityInfo[]>(ALL_INDIAN_CITIES)
  const [search, setSearch] = useState('')
  const [selectedZone, setSelectedZone] = useState<string>('All')

  useEffect(() => {
    let active = true
    getCities().then(res => {
      if (active && res.status === 'ready' && res.data.length > 0) {
        setCities(
          res.data.map(c => ({
            name: c.name,
            state: c.state,
            zone: c.zone,
            isMetro: Boolean(c.is_metro),
            venues: c.venues || [],
            slug: c.slug,
          })),
        )
      }
    })
    return () => {
      active = false
    }
  }, [])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (onNavigate) {
      onNavigate(e, target)
    }
  }

  const zones = useMemo(() => {
    const list = ['All', 'North', 'South', 'West', 'East', 'Central', 'North-East', 'Islands']
    return list.map(z => ({
      name: z,
      count: z === 'All' ? cities.length : cities.filter(c => c.zone === z).length,
    }))
  }, [cities])

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cities.filter(city => {
      const matchZone = selectedZone === 'All' || city.zone === selectedZone
      const matchSearch =
        !q ||
        city.name.toLowerCase().includes(q) ||
        city.state.toLowerCase().includes(q) ||
        city.venues.some(v => v.toLowerCase().includes(q))
      return matchZone && matchSearch
    })
  }, [cities, search, selectedZone])

  const visibleMetro = useMemo(() => filteredCities.filter(c => c.isMetro), [filteredCities])
  const visibleRemaining = useMemo(() => filteredCities.filter(c => !c.isMetro), [filteredCities])

  return (
    <section className="content-page cities-page-container">
      <p className="eyebrow">NATIONAL SPORTS GEOGRAPHY</p>
      <h1>Sports Cities Across India.</h1>
      <p className="page-intro">
        Explore {cities.length}+ active sports cities across India. Discover premier metropolitan hubs with iconic
        stadiums, alongside regional training centres, selection trial grounds, and sports academies.
      </p>

      <DirectoryCallout
        variant="venue"
        tag="Pan-India Reach"
        title="Host or manage sports venues across India? List with 0% Commission"
        description="Connect with athletes, state associations, and coaches across all 50+ Indian cities in the grid."
        buttonLabel="List your sports facility"
        buttonHref="mailto:khelgrid@gmail.com?subject=List%20sports%20facility%20on%20KhelGrid"
      />

      {/* Filter and Search Bar */}
      <div className="cities-toolbar">
        <div className="cities-search-wrap">
          <SiteIcon name="search" size={16} />
          <input
            type="search"
            className="cities-search-input"
            placeholder="Search by city, state, or stadium name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search cities and stadiums"
          />
          {search && (
            <button
              type="button"
              className="cities-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="cities-zone-pills" role="tablist" aria-label="Filter by geographic zone">
          {zones.map(z => (
            <button
              key={z.name}
              type="button"
              className={`cities-zone-pill${selectedZone === z.name ? ' is-active' : ''}`}
              onClick={() => setSelectedZone(z.name)}
              role="tab"
              aria-selected={selectedZone === z.name}
            >
              {z.name} <small>({z.count})</small>
            </button>
          ))}
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="cities-summary-bar">
        <span>
          Showing {filteredCities.length} of {cities.length} cities
          {selectedZone !== 'All' ? ` in ${selectedZone} Zone` : ''}
          {search.trim() ? ` matching “${search.trim()}”` : ''}
        </span>
        {(search.trim() || selectedZone !== 'All') && (
          <button
            type="button"
            className="cities-reset-btn"
            onClick={() => {
              setSearch('')
              setSelectedZone('All')
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      {filteredCities.length === 0 ? (
        <div className="cities-empty-state">
          <SiteIcon name="map-pin" size={32} />
          <h3>No matching cities found</h3>
          <p>We couldn’t find any city or stadium matching your filters. Try clearing your search.</p>
          <button
            type="button"
            className="primary-link"
            onClick={() => {
              setSearch('')
              setSelectedZone('All')
            }}
          >
            Show all cities
          </button>
        </div>
      ) : (
        <>
          {/* SECTION 1: Top 16 Metro Sports Hubs */}
          {visibleMetro.length > 0 && (
            <div className="cities-section">
              <div className="cities-section-header">
                <div>
                  <h2 className="cities-section-title">
                    <SiteIcon name="trophy" size={18} style={{ color: 'var(--color-primary, #059669)' }} />
                    <span>Top 16 Metropolitan Sports Hubs</span>
                  </h2>
                  <p className="cities-section-desc">
                    Premier metropolitan sports centres equipped with multi-sport Olympic stadiums, high-performance training centres, and professional league arenas.
                  </p>
                </div>
                <span className="cities-count-badge">{visibleMetro.length} Hubs</span>
              </div>

              <div className="cities-card-grid">
                {visibleMetro.map(city => (
                  <CityCard key={city.slug} city={city} onNavigate={handleLink} />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: Remaining State & Regional Sports Cities */}
          {visibleRemaining.length > 0 && (
            <div className="cities-section" style={{ marginTop: '2.5rem' }}>
              <div className="cities-section-header">
                <div>
                  <h2 className="cities-section-title">
                    <SiteIcon name="map-pin" size={18} style={{ color: '#2563eb' }} />
                    <span>State & Regional Sports Cities ({visibleRemaining.length})</span>
                  </h2>
                  <p className="cities-section-desc">
                    Emerging sports centres hosting state association selection trials, SAI residential training centres, and grassroots academies across India.
                  </p>
                </div>
                <span className="cities-count-badge" style={{ borderColor: 'rgba(37,99,235,0.3)', color: '#2563eb', background: 'rgba(37,99,235,0.08)' }}>
                  {visibleRemaining.length} Cities
                </span>
              </div>

              <div className="cities-card-grid">
                {visibleRemaining.map(city => (
                  <CityCard key={city.slug} city={city} onNavigate={handleLink} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function CityCard({
  city,
  onNavigate,
}: {
  city: CityInfo
  onNavigate: (e: MouseEvent<HTMLAnchorElement>, target: string) => void
}) {
  return (
    <article className={`city-card${city.isMetro ? ' is-metro-card' : ''}`}>
      <div className="city-card-header">
        <div>
          <h3 className="city-card-name">
            <a
              href={`/cities/${city.slug}`}
              onClick={e => onNavigate(e, `/cities/${city.slug}`)}
              style={{ color: 'inherit', textDecoration: 'none' }}
              title={`Open ${city.name} Sports Hub`}
            >
              {city.name}
            </a>
          </h3>
          <p className="city-card-state">{city.state}</p>
        </div>
        <span className={`city-zone-tag zone-${city.zone.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
          {city.zone}
        </span>
      </div>

      {city.venues.length > 0 && (
        <div className="city-card-venues">
          <p className="city-venues-label">Key Stadiums & Grounds:</p>
          <ul className="city-venues-list">
            {city.venues.slice(0, 3).map(venue => (
              <li key={venue}>
                <span className="city-venue-dot" aria-hidden="true" />
                <span>{venue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="city-card-actions">
        <a
          href={`/cities/${city.slug}`}
          onClick={e => onNavigate(e, `/cities/${city.slug}`)}
          className="city-action-link"
          style={{ fontWeight: 600, color: 'var(--color-primary, #059669)' }}
          title={`Open ${city.name} Sports Hub`}
        >
          <span>Hub</span>
          <SiteIcon name="arrow-up-right" size={13} />
        </a>
        <a
          href={`/venues?city=${encodeURIComponent(city.name)}`}
          onClick={e => onNavigate(e, `/venues?city=${encodeURIComponent(city.name)}`)}
          className="city-action-link"
          title={`View sports venues in ${city.name}`}
        >
          <span>Venues</span>
          <SiteIcon name="arrow-up-right" size={13} />
        </a>
        <a
          href={`/opportunities?city=${encodeURIComponent(city.name)}`}
          onClick={e => onNavigate(e, `/opportunities?city=${encodeURIComponent(city.name)}`)}
          className="city-action-link"
          title={`View trials in ${city.name}`}
        >
          <span>Trials</span>
          <SiteIcon name="arrow-up-right" size={13} />
        </a>
        <a
          href={`/academies?q=${encodeURIComponent(city.name)}`}
          onClick={e => onNavigate(e, `/academies?q=${encodeURIComponent(city.name)}`)}
          className="city-action-link"
          title={`View academies in ${city.name}`}
        >
          <span>Academies</span>
          <SiteIcon name="arrow-up-right" size={13} />
        </a>
      </div>
    </article>
  )
}
