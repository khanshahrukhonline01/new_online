import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { ALL_INDIAN_CITIES } from '../../shared/components/citiesData'
import type { CityInfo } from '../../shared/components/citiesData'
import { TOP_CITY_SPORTS_COMPLEXES } from '../../shared/components/cityComplexesData'
import {
  getAcademies,
  getCities,
  getOpportunities,
  getPickupGames,
  getVenues,
  type CommunityListingCategory,
  type DatabasePickupGame,
} from '../../integrations/supabase/public-client'
import type { Academy, Opportunity, Venue } from '../../shared/domain'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { createBannerSvg } from '../home/homeSvgBanners'
import './CityDetailPage.css'

export interface CityDetailPageProps {
  citySlug: string
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: (category?: CommunityListingCategory) => void
}

export default function CityDetailPage({
  citySlug,
  onNavigate,
  onOpenIntake,
}: CityDetailPageProps) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [pickupGames, setPickupGames] = useState<DatabasePickupGame[]>([])
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [cityMetaList, setCityMetaList] = useState<CityInfo[]>(ALL_INDIAN_CITIES)

  const cleanSlug = (citySlug || '').toLowerCase().trim()

  // Dynamic city resolution with fallback to baseline data
  useEffect(() => {
    let active = true
    getCities().then(res => {
      if (active && res.status === 'ready' && res.data.length > 0) {
        setCityMetaList(
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

  // Resolve current active city
  const city: CityInfo = useMemo(() => {
    const found = cityMetaList.find(
      c => c.slug.toLowerCase() === cleanSlug || c.name.toLowerCase() === cleanSlug,
    )
    if (found) return found

    // Format fallback city name if user enters custom slug
    const formatted = cleanSlug
      ? cleanSlug
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : 'India'

    return {
      name: formatted,
      state: 'Sports Geography',
      zone: 'North',
      isMetro: false,
      venues: [],
      slug: cleanSlug,
    }
  }, [cityMetaList, cleanSlug])

  // Fetch all dynamic catalogues for this city
  useEffect(() => {
    let active = true

    function loadCityCatalogues() {
      setLoading(true)
      Promise.all([
        getVenues(),
        getOpportunities(),
        getPickupGames(),
        getAcademies(),
      ]).then(([vRes, oRes, pRes, aRes]) => {
        if (!active) return

        const cityNameLower = city.name.toLowerCase()
        const matchCity = (val?: string | null) => {
          if (!val) return false
          const lower = val.toLowerCase()
          return lower.includes(cityNameLower) || cityNameLower.includes(lower)
        }

        if (vRes.status === 'ready') {
          setVenues(vRes.data.filter(v => matchCity(v.city) || (v.address && matchCity(v.address))))
        }
        if (oRes.status === 'ready') {
          setOpportunities(oRes.data.filter(o => matchCity(o.city) || matchCity(o.title)))
        }
        if (pRes.status === 'ready') {
          setPickupGames(pRes.data.filter(g => matchCity(g.city)))
        }
        if (aRes.status === 'ready') {
          setAcademies(aRes.data.filter(a => matchCity(a.city) || (a.description && matchCity(a.description))))
        }

        setLoading(false)
      })
    }

    loadCityCatalogues()
    window.addEventListener('khelgrid:listing-added', loadCityCatalogues)

    return () => {
      active = false
      window.removeEventListener('khelgrid:listing-added', loadCityCatalogues)
    }
  }, [city.name])

  const handleLink = (e: MouseEvent<HTMLAnchorElement>, target: string) => {
    if (onNavigate) {
      onNavigate(e, target)
    }
  }

  // Find iconic stadiums from cityComplexesData if available
  const complexInfo = useMemo(() => {
    return TOP_CITY_SPORTS_COMPLEXES.find(
      c => c.slug.toLowerCase() === city.slug.toLowerCase() || c.city.toLowerCase() === city.name.toLowerCase(),
    )
  }, [city])

  const keyVenuesList = useMemo(() => {
    const fromCity = city.venues || []
    const fromComplexes = complexInfo?.complexes || []
    return Array.from(new Set([...fromCity, ...fromComplexes]))
  }, [city, complexInfo])

  // Related cities in same zone
  const relatedCities = useMemo(() => {
    return cityMetaList
      .filter(c => c.zone === city.zone && c.slug !== city.slug)
      .slice(0, 8)
  }, [cityMetaList, city])

  // Structured Schema.org for SEO
  const schemaData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: `${city.name} Sports Hub · KhelGrid`,
    description: `Sports directory, stadiums, SAI selection trials, training academies, and community pickup games in ${city.name}, ${city.state}.`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city.name,
      addressRegion: city.state,
      addressCountry: 'IN',
    },
    url: `https://khelgrid.com/cities/${city.slug}`,
  }), [city])

  return (
    <article className="content-page city-hub-container" aria-label={`${city.name} Sports Hub`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="city-hub-breadcrumbs">
        <a href="/" onClick={e => handleLink(e, '/')} className="city-breadcrumb-link">
          Home
        </a>
        <span className="city-breadcrumb-sep" aria-hidden="true">/</span>
        <a href="/cities" onClick={e => handleLink(e, '/cities')} className="city-breadcrumb-link">
          Cities
        </a>
        <span className="city-breadcrumb-sep" aria-hidden="true">/</span>
        <span aria-current="page" className="city-breadcrumb-current">
          {city.name}
        </span>
      </nav>

      {/* Hero Section */}
      <header className="city-hub-hero">
        <div className="city-hub-hero-eyebrow-row">
          <span className="city-hub-eyebrow">
            SPORTS CITY HUB · {city.zone.toUpperCase()} ZONE
          </span>
          {city.isMetro ? (
            <span className="city-hub-badge-metro">
              <SiteIcon name="trophy" size={12} />
              Premier Metro Sports Hub
            </span>
          ) : (
            <span className="city-hub-badge-regional">
              <SiteIcon name="map-pin" size={12} />
              State &amp; Regional Hub
            </span>
          )}
        </div>

        <h1 className="city-hub-title">{city.name} Sports Hub.</h1>
        <p className="city-hub-subtitle">
          {city.state} · Directory of premier sports venues, selection trials, community pickup games, and grassroots coaching academies.
        </p>

        {/* Live Counters */}
        <div className="city-hub-stats-grid">
          <div className="city-hub-stat-card">
            <span className="city-hub-stat-num">{loading ? '…' : venues.length}</span>
            <span className="city-hub-stat-label">Venues &amp; Turfs</span>
          </div>
          <div className="city-hub-stat-card">
            <span className="city-hub-stat-num">{loading ? '…' : opportunities.length}</span>
            <span className="city-hub-stat-label">Trials &amp; Tourneys</span>
          </div>
          <div className="city-hub-stat-card">
            <span className="city-hub-stat-num">{loading ? '…' : pickupGames.length}</span>
            <span className="city-hub-stat-label">Pickup Games</span>
          </div>
          <div className="city-hub-stat-card">
            <span className="city-hub-stat-num">{loading ? '…' : academies.length}</span>
            <span className="city-hub-stat-label">Academies</span>
          </div>
        </div>

        {/* Quick CTA Actions */}
        <div className="city-hub-hero-actions">
          {onOpenIntake && (
            <button
              type="button"
              className="city-hub-primary-btn"
              onClick={() => onOpenIntake('pickup_game')}
            >
              <SiteIcon name="calendar-check" size={15} />
              <span>+ List in {city.name}</span>
            </button>
          )}
          <a
            href={`/opportunities?city=${encodeURIComponent(city.name)}`}
            onClick={e => handleLink(e, `/opportunities?city=${encodeURIComponent(city.name)}`)}
            className="city-hub-secondary-btn"
          >
            <span>Explore Trials</span>
            <SiteIcon name="arrow-up-right" size={14} />
          </a>
          <a
            href={`/venues?city=${encodeURIComponent(city.name)}`}
            onClick={e => handleLink(e, `/venues?city=${encodeURIComponent(city.name)}`)}
            className="city-hub-secondary-btn"
          >
            <span>Explore Turfs</span>
            <SiteIcon name="arrow-up-right" size={14} />
          </a>
        </div>
      </header>

      {/* Iconic Stadiums Callout Banner */}
      {keyVenuesList.length > 0 && (
        <section className="city-hub-stadiums-banner" aria-label={`Key Stadiums in ${city.name}`}>
          <div className="city-hub-stadiums-icon">
            <SiteIcon name="trophy" size={20} />
          </div>
          <div className="city-hub-stadiums-content">
            <h2 className="city-hub-stadiums-title">Key Sports Stadiums &amp; Complexes in {city.name}</h2>
            <div className="city-hub-stadiums-chips">
              {keyVenuesList.map(vName => (
                <span key={vName} className="city-hub-stadium-chip">
                  <span className="city-hub-stadium-dot" aria-hidden="true" />
                  {vName}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION 1: Selection Trials & Tournaments */}
      <section id="city-trials" className="city-hub-section" aria-label={`Selection Trials in ${city.name}`}>
        <div className="city-hub-section-header">
          <div>
            <h2 className="city-hub-section-title">
              <SiteIcon name="trophy" size={18} style={{ color: 'var(--color-primary, #059669)' }} />
              <span>Selection Trials &amp; Tournaments</span>
            </h2>
            <p className="city-hub-section-desc">
              Verified SAI, federation, and academy selection trials in {city.name}
            </p>
          </div>
          <div className="city-hub-section-header-actions">
            {onOpenIntake && (
              <button
                type="button"
                className="city-hub-inline-btn"
                onClick={() => onOpenIntake('opportunity')}
              >
                + Submit Trial
              </button>
            )}
            <a
              href={`/opportunities?city=${encodeURIComponent(city.name)}`}
              onClick={e => handleLink(e, `/opportunities?city=${encodeURIComponent(city.name)}`)}
              className="city-hub-all-link"
            >
              <span>All Trials ({opportunities.length})</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        {opportunities.length === 0 ? (
          <div className="city-hub-empty-state">
            <SiteIcon name="trophy" size={28} />
            <h3>No open trials currently listed in {city.name}</h3>
            <p>Are you a coach, federation organizer, or club? Post your upcoming selection trials for free on KhelGrid.</p>
            {onOpenIntake && (
              <button
                type="button"
                className="city-hub-primary-btn"
                onClick={() => onOpenIntake('opportunity')}
              >
                + Post a Selection Trial in {city.name}
              </button>
            )}
          </div>
        ) : (
          <div className="city-hub-card-grid">
            {opportunities.map(opp => (
              <a
                key={opp.id}
                href={`/opportunities/${opp.slug}`}
                onClick={e => handleLink(e, `/opportunities/${opp.slug}`)}
                className="city-hub-card city-trial-card"
              >
                <div className="city-trial-header">
                  <span className="city-trial-badge">{opp.opportunity_type}</span>
                  {opp.is_featured && (
                    <span className="city-featured-pill">
                      <SiteIcon name="sparkles" size={11} /> Featured
                    </span>
                  )}
                  <span className="city-verified-pill">
                    <SiteIcon name="shield-check" size={11} /> Verified
                  </span>
                </div>
                <h3 className="city-card-title">{opp.title}</h3>
                {opp.organizer_name && (
                  <p className="city-card-meta">
                    <SiteIcon name="badge-check" size={12} />
                    <span>{opp.organizer_name}</span>
                  </p>
                )}
                <div className="city-card-footer">
                  <span className="city-card-deadline">
                    {opp.application_deadline
                      ? `Deadline: ${opp.application_deadline}`
                      : opp.starts_at
                        ? `Starts: ${opp.starts_at.slice(0, 10)}`
                        : 'Open Entry'}
                  </span>
                  <span className="city-card-cta">
                    Details <SiteIcon name="chevron-right" size={11} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: Venues & Sports Complexes */}
      <section id="city-venues" className="city-hub-section" aria-label={`Venues in ${city.name}`}>
        <div className="city-hub-section-header">
          <div>
            <h2 className="city-hub-section-title">
              <SiteIcon name="calendar-check" size={18} style={{ color: '#059669' }} />
              <span>Sports Complexes &amp; Turfs</span>
            </h2>
            <p className="city-hub-section-desc">
              Bookable turfs, multi-sport stadiums, and arena listings in {city.name}
            </p>
          </div>
          <div className="city-hub-section-header-actions">
            {onOpenIntake && (
              <button
                type="button"
                className="city-hub-inline-btn"
                onClick={() => onOpenIntake('venue')}
              >
                + List Turf
              </button>
            )}
            <a
              href={`/venues?city=${encodeURIComponent(city.name)}`}
              onClick={e => handleLink(e, `/venues?city=${encodeURIComponent(city.name)}`)}
              className="city-hub-all-link"
            >
              <span>All Venues ({venues.length})</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        {venues.length === 0 ? (
          <div className="city-hub-empty-state">
            <SiteIcon name="map-pin" size={28} />
            <h3>No turf venues listed yet in {city.name}</h3>
            <p>Do you operate a sports turf, court, or swimming pool in {city.name}? List your facility with 0% commission.</p>
            {onOpenIntake && (
              <button
                type="button"
                className="city-hub-primary-btn"
                onClick={() => onOpenIntake('venue')}
              >
                + List Turf in {city.name}
              </button>
            )}
          </div>
        ) : (
          <div className="city-hub-card-grid">
            {venues.map(v => (
              <a
                key={v.id}
                href={`/venues/${v.slug}`}
                onClick={e => handleLink(e, `/venues/${v.slug}`)}
                className="city-hub-card city-venue-card"
              >
                <div className="city-card-media-wrap">
                  <img
                    src={createBannerSvg(v.name, v.city, '🏟️', 'emerald')}
                    alt={`${v.name} — Sports Venue & Turf in ${v.city}`}
                    title={`${v.name} (${v.city})`}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={200}
                    className="city-card-media-img"
                  />
                  <div className="city-media-overlay-top">
                    {v.is_featured && (
                      <span className="city-featured-pill">
                        <SiteIcon name="sparkles" size={11} /> Featured
                      </span>
                    )}
                    <span className="city-verified-pill">
                      <SiteIcon name="shield-check" size={11} />
                      {v.government_facility ? 'Govt Facility' : 'Verified'}
                    </span>
                  </div>
                </div>
                <div className="city-card-content">
                  <h3 className="city-card-title">{v.name}</h3>
                  <p className="city-card-meta">
                    <SiteIcon name="map-pin" size={12} />
                    <span>{v.address || v.city}</span>
                  </p>
                </div>
                <div className="city-card-footer">
                  <span className="city-card-deadline">Informational Listing</span>
                  <span className="city-card-cta">
                    View <SiteIcon name="chevron-right" size={11} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Community Pickup Matches */}
      <section id="city-games" className="city-hub-section" aria-label={`Pickup Games in ${city.name}`}>
        <div className="city-hub-section-header">
          <div>
            <h2 className="city-hub-section-title">
              <SiteIcon name="activity" size={18} style={{ color: '#2563eb' }} />
              <span>Community Pickup Games</span>
            </h2>
            <p className="city-hub-section-desc">
              Join local sports matches looking for players across {city.name}
            </p>
          </div>
          <div className="city-hub-section-header-actions">
            {onOpenIntake && (
              <button
                type="button"
                className="city-hub-inline-btn"
                onClick={() => onOpenIntake('pickup_game')}
              >
                + Host Game
              </button>
            )}
            <a
              href="/play"
              onClick={e => handleLink(e, '/play')}
              className="city-hub-all-link"
            >
              <span>Play Center</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        {pickupGames.length === 0 ? (
          <div className="city-hub-empty-state">
            <SiteIcon name="activity" size={28} />
            <h3>No pickup games scheduled today in {city.name}</h3>
            <p>Missing a few players for your box cricket, football, or badminton match? Post a pickup game in seconds.</p>
            {onOpenIntake && (
              <button
                type="button"
                className="city-hub-primary-btn"
                onClick={() => onOpenIntake('pickup_game')}
              >
                + Host a Pickup Match in {city.name}
              </button>
            )}
          </div>
        ) : (
          <div className="city-hub-card-grid">
            {pickupGames.map(game => (
              <div key={game.id} className="city-hub-card city-game-card">
                <div className="city-game-header">
                  <div className="city-game-sport-badge">
                    <span>{game.emoji || '⚽'}</span>
                    <span>{game.sport}</span>
                  </div>
                  <span className={`city-skill-badge skill-${game.skill_level.toLowerCase().replace(/\s+/g, '-')}`}>
                    {game.skill_level}
                  </span>
                </div>
                <h3 className="city-card-title">{game.venue_name}</h3>
                <p className="city-card-meta">
                  <SiteIcon name="clock" size={12} />
                  <span>{game.time_label}</span>
                </p>
                <div className="city-game-stats-row">
                  <span className="city-game-price">{game.price_per_player}</span>
                  <span className="city-game-spots">
                    {game.spots_open} spots left · {game.confirmed_players}/{game.total_players} players
                  </span>
                </div>
                <div className="city-card-footer">
                  <a
                    href="/play"
                    onClick={e => handleLink(e, '/play')}
                    className="city-game-join-btn"
                  >
                    <span>Join Game</span>
                    <SiteIcon name="arrow-up-right" size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4: Training Academies */}
      <section id="city-academies" className="city-hub-section" aria-label={`Academies in ${city.name}`}>
        <div className="city-hub-section-header">
          <div>
            <h2 className="city-hub-section-title">
              <SiteIcon name="building" size={18} style={{ color: 'var(--accent)' }} />
              <span>Training Academies</span>
            </h2>
            <p className="city-hub-section-desc">
              Accredited sports coaching centres and residential academies in {city.name}
            </p>
          </div>
          <div className="city-hub-section-header-actions">
            {onOpenIntake && (
              <button
                type="button"
                className="city-hub-inline-btn"
                onClick={() => onOpenIntake('academy')}
              >
                + List Academy
              </button>
            )}
            <a
              href={`/academies?q=${encodeURIComponent(city.name)}`}
              onClick={e => handleLink(e, `/academies?q=${encodeURIComponent(city.name)}`)}
              className="city-hub-all-link"
            >
              <span>All Academies ({academies.length})</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        {academies.length === 0 ? (
          <div className="city-hub-empty-state">
            <SiteIcon name="building" size={28} />
            <h3>No academies listed yet in {city.name}</h3>
            <p>Do you run a sports coaching academy in {city.name}? List your programs to connect with aspiring athletes.</p>
            {onOpenIntake && (
              <button
                type="button"
                className="city-hub-primary-btn"
                onClick={() => onOpenIntake('academy')}
              >
                + List Academy in {city.name}
              </button>
            )}
          </div>
        ) : (
          <div className="city-hub-card-grid">
            {academies.map(acad => (
              <div key={acad.id} className="city-hub-card city-academy-card">
                <div className="city-card-media-wrap">
                  <img
                    src={createBannerSvg(acad.name, city.name, '🏛️', 'navy')}
                    alt={`${acad.name} — Sports Training Academy in ${city.name}`}
                    title={`${acad.name} (${city.name})`}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={200}
                    className="city-card-media-img"
                  />
                  <div className="city-media-overlay-top">
                    <span className="city-verified-pill">
                      <SiteIcon name="check-circle" size={11} /> Verified
                    </span>
                  </div>
                </div>
                <div className="city-card-content">
                  <h3 className="city-card-title">{acad.name}</h3>
                  <p className="city-card-meta">
                    <SiteIcon name="map-pin" size={12} />
                    <span>{acad.city}{acad.state ? `, ${acad.state}` : ''}</span>
                  </p>
                </div>
                <div className="city-card-footer">
                  <a
                    href={`/academies?q=${encodeURIComponent(acad.name)}`}
                    onClick={e => handleLink(e, `/academies?q=${encodeURIComponent(acad.name)}`)}
                    className="city-hub-all-link"
                  >
                    <span>View Programs</span>
                    <SiteIcon name="chevron-right" size={11} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5: Regional Sports Geography Explorer */}
      {relatedCities.length > 0 && (
        <section className="city-hub-section city-hub-related-section" aria-label={`Other ${city.zone} Zone Cities`}>
          <div className="city-hub-section-header">
            <div>
              <h2 className="city-hub-section-title">
                <SiteIcon name="map-pin" size={18} style={{ color: '#2563eb' }} />
                <span>Other Sports Cities in {city.zone} Zone</span>
              </h2>
              <p className="city-hub-section-desc">
                Explore nearby training hubs and state trial grounds across {city.zone} India
              </p>
            </div>
            <a
              href="/cities"
              onClick={e => handleLink(e, '/cities')}
              className="city-hub-all-link"
            >
              <span>View All 50+ Cities</span>
              <SiteIcon name="arrow-up-right" size={13} />
            </a>
          </div>

          <div className="city-hub-related-pills">
            {relatedCities.map(rc => (
              <a
                key={rc.slug}
                href={`/cities/${rc.slug}`}
                onClick={e => handleLink(e, `/cities/${rc.slug}`)}
                className="city-hub-related-pill"
              >
                <span className="city-hub-related-name">{rc.name}</span>
                <span className="city-hub-related-state">{rc.state}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
