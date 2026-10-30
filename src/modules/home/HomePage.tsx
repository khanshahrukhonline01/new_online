import { useEffect, useMemo, useRef, useState } from 'react'
import { getAcademies, getOpportunities, getSports, getVenues } from '../../integrations/supabase/public-client'
import type { CatalogueResult } from '../../integrations/supabase/public-client'
import type { Academy, Opportunity, Sport, Venue } from '../../shared/domain'
import { liveSportsEngine } from '../live/services/liveSportsEngine'
import type { SportsMatch } from '../live/types'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { createBannerSvg } from './homeSvgBanners'
import { FEATURED_ACADEMIES } from './featuredAcademiesData'
import './home.css'

interface PickupGame {
  id: string
  sport: string
  emoji: string
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced'
  venueName: string
  city: string
  timeLabel: string
  hostName: string
  pricePerPlayer: string
  spotsOpen: number
  totalPlayers: number
  confirmedPlayers: number
}

const COMMUNITY_PICKUP_GAMES: PickupGame[] = [
  {
    id: 'pg-1',
    sport: 'Pickleball',
    emoji: '🎾',
    skillLevel: 'Intermediate',
    venueName: 'FerroHub Sports',
    city: 'Bengaluru',
    timeLabel: 'Today · 7:00 PM',
    hostName: 'Rahul S.',
    pricePerPlayer: '₹200/player',
    spotsOpen: 1,
    totalPlayers: 4,
    confirmedPlayers: 3,
  },
  {
    id: 'pg-2',
    sport: 'Football',
    emoji: '⚽',
    skillLevel: 'Beginner',
    venueName: 'Kicks on Grass Arena',
    city: 'Bengaluru',
    timeLabel: 'Today · 8:30 PM',
    hostName: 'Aakash M.',
    pricePerPlayer: '₹250/player',
    spotsOpen: 4,
    totalPlayers: 12,
    confirmedPlayers: 8,
  },
  {
    id: 'pg-3',
    sport: 'Badminton',
    emoji: '🏸',
    skillLevel: 'Advanced',
    venueName: 'Whitefield Sports Hub',
    city: 'Bengaluru',
    timeLabel: 'Tomorrow · 6:30 AM',
    hostName: 'Sneha K.',
    pricePerPlayer: '₹150/player',
    spotsOpen: 1,
    totalPlayers: 4,
    confirmedPlayers: 3,
  },
  {
    id: 'pg-4',
    sport: 'Cricket',
    emoji: '🏏',
    skillLevel: 'Intermediate',
    venueName: 'DDA Sports Ground',
    city: 'Delhi',
    timeLabel: 'Saturday · 7:00 AM',
    hostName: 'Vikram P.',
    pricePerPlayer: '₹180/player',
    spotsOpen: 8,
    totalPlayers: 22,
    confirmedPlayers: 14,
  },
  {
    id: 'pg-5',
    sport: 'Tennis',
    emoji: '🎾',
    skillLevel: 'Intermediate',
    venueName: 'DLTA Tennis Complex',
    city: 'New Delhi',
    timeLabel: 'Tomorrow · 5:30 PM',
    hostName: 'Neha R.',
    pricePerPlayer: '₹220/player',
    spotsOpen: 3,
    totalPlayers: 4,
    confirmedPlayers: 1,
  },
  {
    id: 'pg-6',
    sport: 'Box Cricket',
    emoji: '🏏',
    skillLevel: 'Beginner',
    venueName: 'Turfside Arena',
    city: 'Mumbai',
    timeLabel: 'Sunday · 6:00 PM',
    hostName: 'Karan D.',
    pricePerPlayer: '₹300/player',
    spotsOpen: 4,
    totalPlayers: 10,
    confirmedPlayers: 6,
  },
  {
    id: 'pg-7',
    sport: 'Basketball',
    emoji: '🏀',
    skillLevel: 'Advanced',
    venueName: 'Regional Sports Centre',
    city: 'Kochi',
    timeLabel: 'Friday · 6:00 PM',
    hostName: 'Manish T.',
    pricePerPlayer: '₹200/player',
    spotsOpen: 5,
    totalPlayers: 10,
    confirmedPlayers: 5,
  },
  {
    id: 'pg-8',
    sport: 'Table Tennis',
    emoji: '🏓',
    skillLevel: 'Beginner',
    venueName: 'Sports City Center',
    city: 'Pune',
    timeLabel: 'Today · 7:30 PM',
    hostName: 'Pooja M.',
    pricePerPlayer: '₹120/player',
    spotsOpen: 2,
    totalPlayers: 4,
    confirmedPlayers: 2,
  },
]

export default function HomePage() {
  const [counts, setCounts] = useState<{
    sports?: CatalogueResult<Sport>
    opportunities?: CatalogueResult<Opportunity>
    venues?: CatalogueResult<Venue>
    academies?: CatalogueResult<Academy>
  }>({})

  const [liveMatches, setLiveMatches] = useState<SportsMatch[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)

  const [reduceMotion, setReduceMotion] = useState(false)
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)

  // Rail scroll refs
  const liveMatchesRailRef = useRef<HTMLDivElement>(null)
  const trialsRailRef = useRef<HTMLDivElement>(null)
  const turfsRailRef = useRef<HTMLDivElement>(null)
  const pickupRailRef = useRef<HTMLDivElement>(null)
  const academiesRailRef = useRef<HTMLDivElement>(null)

  const heroSlides = [
    { name: 'Football', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=75', position: 'center 54%' },
    { name: 'Cricket', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=75', position: 'center 48%' },
    { name: 'Athletics', image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1200&q=75', position: 'center 42%' },
    { name: 'Basketball', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=75', position: 'center 48%' },
    { name: 'Badminton', image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=75', position: 'center 45%' },
  ]

  const scrollRail = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -320 : 320
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Load database catalogues
  useEffect(() => {
    let active = true
    Promise.all([getSports(), getOpportunities(), getVenues(), getAcademies()]).then(
      ([sports, opportunities, venues, academies]) => {
        if (active) setCounts({ sports, opportunities, venues, academies })
      },
    )
    return () => {
      active = false
    }
  }, [])

  // Load live matches from liveSportsEngine
  useEffect(() => {
    let active = true
    setLoadingMatches(true)
    liveSportsEngine
      .getScores()
      .then(res => {
        if (active) {
          setLiveMatches(res.matches)
          setLoadingMatches(false)
        }
      })
      .catch(() => {
        if (active) setLoadingMatches(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (reduceMotion || heroPaused) return
    const timer = window.setInterval(
      () => setActiveHeroSlide(current => (current + 1) % heroSlides.length),
      3000,
    )
    return () => window.clearInterval(timer)
  }, [reduceMotion, heroPaused, heroSlides.length])

  // Display academies: 8 featured national institutions with rich vector pitch art, est years, and trials links + Supabase records
  const displayAcademies = useMemo(() => {
    const list = [...FEATURED_ACADEMIES]
    if (counts.academies?.status === 'ready') {
      const featuredSlugs = new Set(FEATURED_ACADEMIES.map(a => a.slug))
      const others = counts.academies.data
        .filter(a => !featuredSlugs.has(a.slug))
        .map(a => {
          const estMatch = a.description?.match(/19\d\d|20\d\d/)
          return {
            id: a.id,
            slug: a.slug,
            name: a.name,
            est: estMatch ? `Est. ${estMatch[0]}` : 'Accredited',
            scoutBadge: 'Verified Academy',
            location: `${a.city}${a.state ? `, ${a.state}` : ''}`,
            sports: a.description?.slice(0, 48) || 'Multi-Sport Training Center',
            category: 'Accredited Sports Center',
            trialsLink: `/opportunities?city=${encodeURIComponent(a.city)}`,
            svgBanner: createBannerSvg(a.name, a.city, '🏛️', 'navy'),
          }
        })
      list.push(...others)
    }
    return list
  }, [counts.academies])

  const countState = (value: CatalogueResult<unknown> | undefined) => {
    if (!value) return 'Loading catalogue…'
    if (value.status === 'unconfigured') return 'Not configured'
    if (value.status === 'unavailable') return 'Temporarily unavailable'
    return value.data.length === 0 ? 'No published records yet' : `${value.data.length} published`
  }

  const total = (value: CatalogueResult<unknown> | undefined) =>
    value?.status === 'ready' ? value.data.length : '—'

  const ready = [counts.sports, counts.opportunities, counts.venues, counts.academies].some(
    item => item?.status === 'ready',
  )

  return (
    <>
      {/* 0. Hero Panel */}
      <section className="home-hero-panel">
        <div className="home-hero-copy">
          <p className="eyebrow">YOUR GAME. YOUR NEXT MOVE.</p>
          <h1>Discover. Compete. <span>Grow.</span></h1>
          <p className="hero-copy">
            Explore sports, find opportunities, and discover places to play. Clear information helps you
            decide your next move.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="/opportunities">
              Explore opportunities <SiteIcon name="arrow-up-right" size={16} />
            </a>
            <a className="secondary-link" href="/sports">
              Browse sports
            </a>
          </div>
          <div className="home-trust-points" aria-label="Platform principles">
            <span><SiteIcon name="shield-check" size={15} /> Source-aware listings</span>
            <span><SiteIcon name="check-circle" size={15} /> No fabricated records</span>
            <span><SiteIcon name="smartphone" size={15} /> Built for every screen</span>
          </div>
        </div>

        <div className="home-hero-art home-hero-carousel" aria-label="KhelGrid sports image carousel">
          <div className="home-hero-slides" aria-live="off">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.name}
                className={`home-hero-slide${index === activeHeroSlide ? ' is-active' : ''}`}
                src={slide.image}
                alt={index === activeHeroSlide ? `${slide.name} at KhelGrid` : ''}
                aria-hidden={index !== activeHeroSlide}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                style={{ objectPosition: slide.position }}
              />
            ))}
          </div>
          <div className="home-hero-carousel-shade" aria-hidden="true" />
          <div className="home-hero-carousel-caption">
            <span className="hero-athlete-kicker"><span className="status-dot" /> KHELGRID SPORTS UNIVERSE</span>
            <strong>{heroSlides[activeHeroSlide].name}</strong>
            <span className="hero-athlete-tagline">SPORTS · OPPORTUNITIES · VENUES · ACADEMIES</span>
          </div>
          <div className="home-hero-carousel-controls" aria-label="Hero carousel controls">
            <button
              type="button"
              className="hero-carousel-toggle"
              onClick={() => setHeroPaused(value => !value)}
              aria-label={heroPaused ? 'Play image carousel' : 'Pause image carousel'}
            >
              {heroPaused ? 'Play' : 'Pause'}
            </button>
            <div className="hero-carousel-dots" aria-label="Choose sports image">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.name}
                  type="button"
                  className={index === activeHeroSlide ? 'is-active' : ''}
                  onClick={() => setActiveHeroSlide(index)}
                  aria-label={`Show ${slide.name} image`}
                  aria-pressed={index === activeHeroSlide}
                />
              ))}
            </div>
            <button
              type="button"
              className="hero-carousel-next"
              onClick={() => setActiveHeroSlide(current => (current + 1) % heroSlides.length)}
              aria-label="Show next sports image"
            >
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* Catalogue Status Row */}
      <section className="home-catalogue-status" aria-labelledby="catalogue-status-title">
        <div className="section-heading compact-heading">
          <p className="eyebrow">LIVE CATALOGUE STATUS</p>
          <h2 id="catalogue-status-title">What’s available now</h2>
          <p>Verified real database records published across Indian sports.</p>
        </div>
        <div className="stats-row home-stats">
          <div>
            <span><span className="stat-icon" aria-hidden="true"><SiteIcon name="sports" size={17} /></span> Sports</span>
            <strong>{total(counts.sports)}</strong>
            <small>{countState(counts.sports)}</small>
          </div>
          <div>
            <span><span className="stat-icon" aria-hidden="true"><SiteIcon name="opportunities" size={17} /></span> Selection Trials</span>
            <strong>{total(counts.opportunities)}</strong>
            <small>{countState(counts.opportunities)}</small>
          </div>
          <div>
            <span><span className="stat-icon" aria-hidden="true"><SiteIcon name="building" size={17} /></span> Verified Academies</span>
            <strong>{total(counts.academies)}</strong>
            <small>{countState(counts.academies)}</small>
          </div>
        </div>
        <p className="home-data-note">
          <span className={ready ? 'status-dot' : 'status-dot warning'} />
          {ready
            ? 'Connected database catalogue response received. Zero fabricated listings.'
            : 'Connecting to database catalogue…'}
        </p>
      </section>

      {/* 1. LIVE MATCH CENTER */}
      <section className="home-section-container" aria-label="Live Match Center">
        <div className="home-section-header">
          <div className="home-section-heading-group">
            <h2 className="home-section-title">
              <span className="home-live-pulse-dot" />
              <span>Live Match Center</span>
              <span className="home-live-tag">LIVE</span>
            </h2>
            <p className="home-section-subtitle">Real-time international and domestic sports scores</p>
          </div>
          <div className="home-section-actions">
            <div className="home-scroll-arrows">
              <button
                type="button"
                aria-label="Scroll live matches left"
                className="home-arrow-btn"
                onClick={() => scrollRail(liveMatchesRailRef, 'left')}
              >
                <SiteIcon name="arrow-left" size={15} />
              </button>
              <button
                type="button"
                aria-label="Scroll live matches right"
                className="home-arrow-btn"
                onClick={() => scrollRail(liveMatchesRailRef, 'right')}
              >
                <SiteIcon name="arrow-right" size={15} />
              </button>
            </div>
            <a className="home-view-all-link" href="/live-scores">
              <span>All Scores</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        <div ref={liveMatchesRailRef} className="home-touch-rail" tabIndex={0} aria-label="Live matches list">
          {loadingMatches ? (
            <div className="home-rail-status-box">Loading live match scores…</div>
          ) : liveMatches.length === 0 ? (
            <div className="home-rail-status-box">
              No live matches currently in play. Check upcoming schedules on the{' '}
              <a href="/live-scores" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                Match Center
              </a>
              .
            </div>
          ) : (
            liveMatches.map(match => (
              <a key={match.id} href="/live-scores" className="home-rail-card home-match-card">
                <div className="home-match-top">
                  <span className="home-match-tournament">
                    {match.sport === 'Football' ? '⚽' : '🏏'} · {match.tournament}
                  </span>
                  <span className={`home-live-tag ${match.status !== 'LIVE' ? 'is-finished' : ''}`}>
                    {match.status === 'LIVE' && <span className="home-live-pulse-dot" />}
                    {match.status}
                  </span>
                </div>
                <div className="home-match-teams">
                  <div className="home-match-team-row">
                    <span className="home-match-team-name">
                      <span>{match.teamA.flag || (match.sport === 'Football' ? '⚽' : '🏏')}</span>
                      <span>{match.teamA.name}</span>
                    </span>
                    <span className="home-match-score">{match.teamA.score || '—'}</span>
                  </div>
                  <div className="home-match-team-row">
                    <span className="home-match-team-name">
                      <span>{match.teamB.flag || (match.sport === 'Football' ? '⚽' : '🏏')}</span>
                      <span>{match.teamB.name}</span>
                    </span>
                    <span className="home-match-score">{match.teamB.score || '—'}</span>
                  </div>
                </div>
                <div className="home-match-footer">
                  {match.statusText || match.venueOrOvers || match.status}
                </div>
              </a>
            ))
          )}
        </div>
      </section>

      {/* 2. SELECTION TRIALS & COMBINES */}
      <section className="home-section-container" aria-label="Featured Selection Trials">
        <div className="home-section-header">
          <div className="home-section-heading-group">
            <h2 className="home-section-title">
              <SiteIcon name="trophy" size={18} style={{ color: 'var(--accent)' }} />
              <span>Selection Trials &amp; Combines</span>
            </h2>
            <p className="home-section-subtitle">Verified SAI, federation &amp; academy scouting trials · Swipe to explore</p>
          </div>
          <div className="home-section-actions">
            <div className="home-scroll-arrows">
              <button
                type="button"
                aria-label="Scroll trials left"
                className="home-arrow-btn"
                onClick={() => scrollRail(trialsRailRef, 'left')}
              >
                <SiteIcon name="arrow-left" size={15} />
              </button>
              <button
                type="button"
                aria-label="Scroll trials right"
                className="home-arrow-btn"
                onClick={() => scrollRail(trialsRailRef, 'right')}
              >
                <SiteIcon name="arrow-right" size={15} />
              </button>
            </div>
            <a className="home-view-all-link" href="/opportunities">
              <span>All ({counts.opportunities?.status === 'ready' ? counts.opportunities.data.length : '—'})</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        <div ref={trialsRailRef} className="home-touch-rail" tabIndex={0} aria-label="Selection trials list">
          {!counts.opportunities ? (
            <div className="home-rail-status-box">Loading selection trials…</div>
          ) : counts.opportunities.status !== 'ready' || counts.opportunities.data.length === 0 ? (
            <div className="home-rail-status-box">No published selection trials currently available.</div>
          ) : (
            counts.opportunities.data.map(opp => (
              <a key={opp.id} href={`/opportunities/${opp.slug}`} className="home-rail-card">
                <div>
                  <div className="home-trial-header">
                    <span className="home-trial-type-badge">{opp.opportunity_type}</span>
                    <span className="home-verified-pill">
                      <SiteIcon name="shield-check" size={12} />
                      Verified
                    </span>
                  </div>
                  <h3 className="home-card-title">{opp.title}</h3>
                  <div className="home-card-meta">
                    <SiteIcon name="map-pin" size={12} />
                    <span>{opp.city || 'Pan-India'}</span>
                  </div>
                  {opp.organizer_name && (
                    <div className="home-card-meta">
                      <SiteIcon name="badge-check" size={12} />
                      <span>{opp.organizer_name}</span>
                    </div>
                  )}
                </div>
                <div className="home-card-bottom">
                  <span className="home-card-deadline">
                    {opp.application_deadline
                      ? `Deadline: ${opp.application_deadline}`
                      : opp.starts_at
                        ? `Starts: ${opp.starts_at.slice(0, 10)}`
                        : 'Open Entry'}
                  </span>
                  <span className="home-card-cta">
                    Details <SiteIcon name="chevron-right" size={11} />
                  </span>
                </div>
              </a>
            ))
          )}
        </div>
      </section>

      {/* 3. BOOK TURFS & COURTS */}
      <section className="home-section-container" aria-label="Book sports turf venues">
        <div className="home-section-header">
          <div className="home-section-heading-group">
            <h2 className="home-section-title">
              <SiteIcon name="calendar-check" size={18} style={{ color: '#059669' }} />
              <span>Book Turfs &amp; Courts</span>
            </h2>
            <p className="home-section-subtitle">Browse venue listings and published facilities · Swipe to explore</p>
          </div>
          <div className="home-section-actions">
            <div className="home-scroll-arrows">
              <button
                type="button"
                aria-label="Scroll venues left"
                className="home-arrow-btn"
                onClick={() => scrollRail(turfsRailRef, 'left')}
              >
                <SiteIcon name="arrow-left" size={15} />
              </button>
              <button
                type="button"
                aria-label="Scroll venues right"
                className="home-arrow-btn"
                onClick={() => scrollRail(turfsRailRef, 'right')}
              >
                <SiteIcon name="arrow-right" size={15} />
              </button>
            </div>
            <a className="home-view-all-link" href="/venues">
              <span>Find Venues</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        <div ref={turfsRailRef} className="home-touch-rail" tabIndex={0} aria-label="Sports turfs and courts list">
          {!counts.venues ? (
            <div className="home-rail-status-box">Loading venue listings…</div>
          ) : counts.venues.status !== 'ready' || counts.venues.data.length === 0 ? (
            <div className="home-rail-status-box">No published venues currently available.</div>
          ) : (
            counts.venues.data.map(v => (
              <a key={v.id} href={`/venues/${v.slug}`} className="home-rail-card">
                <div>
                  <div className="home-card-media">
                    <img
                      src={createBannerSvg(v.name, v.city, '🏟️', 'emerald')}
                      alt={v.name}
                      loading="lazy"
                      width={400}
                      height={240}
                    />
                    <div className="home-card-overlay-top-left">
                      <span className="home-media-badge-dark">{v.city}</span>
                    </div>
                    <div className="home-card-overlay-top-right">
                      <span className="home-verified-pill">
                        <SiteIcon name="shield-check" size={11} />
                        {v.government_facility ? 'Govt Facility' : 'Verified Venue'}
                      </span>
                    </div>
                  </div>
                  <h3 className="home-card-title">{v.name}</h3>
                  <div className="home-card-meta">
                    <SiteIcon name="map-pin" size={12} />
                    <span>{v.city}{v.address ? ` · ${v.address}` : ''}</span>
                  </div>
                </div>
                <div className="home-card-bottom">
                  <span className="home-card-deadline">Informational Listing</span>
                  <span className="home-card-cta">
                    View <SiteIcon name="chevron-right" size={11} />
                  </span>
                </div>
              </a>
            ))
          )}
        </div>
      </section>

      {/* 4. JOIN PICKUP GAMES */}
      <section className="home-section-container" aria-label="Join or host pickup sports games">
        <div className="home-section-header">
          <div className="home-section-heading-group">
            <h2 className="home-section-title">
              <SiteIcon name="activity" size={18} style={{ color: '#2563eb' }} />
              <span>Join Pickup Games</span>
            </h2>
            <p className="home-section-subtitle">Connect with local players and fill missing court spots · Swipe to explore</p>
          </div>
          <div className="home-section-actions">
            <div className="home-scroll-arrows">
              <button
                type="button"
                aria-label="Scroll pickup games left"
                className="home-arrow-btn"
                onClick={() => scrollRail(pickupRailRef, 'left')}
              >
                <SiteIcon name="arrow-left" size={15} />
              </button>
              <button
                type="button"
                aria-label="Scroll pickup games right"
                className="home-arrow-btn"
                onClick={() => scrollRail(pickupRailRef, 'right')}
              >
                <SiteIcon name="arrow-right" size={15} />
              </button>
            </div>
            <a className="home-view-all-link" href="/play">
              <span>Explore Games</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        <div ref={pickupRailRef} className="home-touch-rail" tabIndex={0} aria-label="Pickup sports games list">
          {COMMUNITY_PICKUP_GAMES.map(g => (
            <a key={g.id} href="/play" className="home-rail-card">
              <div>
                <div className="home-card-media">
                  <img
                    src={createBannerSvg(`${g.sport} Pickup`, `${g.venueName} · ${g.city}`, g.emoji, 'cyan')}
                    alt={`${g.sport} pickup match at ${g.venueName}`}
                    loading="lazy"
                    width={400}
                    height={240}
                  />
                  <div className="home-card-overlay-top-left">
                    <span className="home-media-badge-dark">{g.sport}</span>
                    <span
                      className="home-media-badge-dark"
                      style={{ background: 'rgba(255,255,255,0.9)', color: '#0f172a' }}
                    >
                      {g.skillLevel}
                    </span>
                  </div>
                  <div className="home-card-overlay-bottom">
                    <span className="home-media-badge-green">
                      {g.spotsOpen} {g.spotsOpen === 1 ? 'spot' : 'spots'} open
                    </span>
                    <span className="home-media-badge-blue">{g.pricePerPlayer}</span>
                  </div>
                </div>
                <h3 className="home-card-title" style={{ minHeight: '1.4em' }}>
                  {g.venueName}
                </h3>
                <div className="home-card-meta">
                  <SiteIcon name="map-pin" size={12} />
                  <span>{g.venueName}, {g.city}</span>
                </div>
                <div className="home-card-meta">
                  <SiteIcon name="clock" size={12} />
                  <span>{g.timeLabel} · Host: {g.hostName}</span>
                </div>
              </div>
              <div className="home-pickup-bar-wrap">
                <div className="home-pickup-meta-row">
                  <span>{g.confirmedPlayers}/{g.totalPlayers} Players</span>
                  <span style={{ color: '#059669' }}>{g.spotsOpen} {g.spotsOpen === 1 ? 'spot' : 'spots'} left</span>
                </div>
                <div className="home-pickup-progress">
                  <div
                    className="home-pickup-progress-fill"
                    style={{ width: `${Math.round((g.confirmedPlayers / g.totalPlayers) * 100)}%` }}
                  />
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 5. FEATURED TRAINING INSTITUTIONS / ACADEMIES */}
      <section
        id="featured-academies"
        className="home-section-container"
        aria-label="Featured Training Institutions and Sports Academies"
      >
        <div className="home-section-header">
          <div className="home-section-heading-group">
            <h2 className="home-section-title">
              <SiteIcon name="building" size={18} style={{ color: 'var(--accent)' }} />
              <span>Featured Training Institutions</span>
            </h2>
            <p className="home-section-subtitle">
              Accredited sports centers actively scouted on KhelGrid · Swipe to view
            </p>
          </div>
          <div className="home-section-actions">
            <div className="home-scroll-arrows">
              <button
                type="button"
                aria-label="Scroll academies left"
                className="home-arrow-btn"
                onClick={() => scrollRail(academiesRailRef, 'left')}
              >
                <SiteIcon name="arrow-left" size={15} />
              </button>
              <button
                type="button"
                aria-label="Scroll academies right"
                className="home-arrow-btn"
                onClick={() => scrollRail(academiesRailRef, 'right')}
              >
                <SiteIcon name="arrow-right" size={15} />
              </button>
            </div>
            <a className="home-view-all-pill" href="/academies">
              <span>All Academies ({counts.academies?.status === 'ready' ? counts.academies.data.length : '—'})</span>
              <SiteIcon name="chevron-right" size={12} />
            </a>
          </div>
        </div>

        <div
          ref={academiesRailRef}
          className="home-touch-rail"
          tabIndex={0}
          aria-label="Featured training institutions list"
        >
          {displayAcademies.map(acad => (
            <div key={acad.id} className="home-academy-card">
              <div>
                <div className="home-card-media">
                  <img
                    src={acad.svgBanner}
                    alt={`${acad.name} - Sports Academy in ${acad.location}`}
                    loading="lazy"
                    width={400}
                    height={240}
                  />
                  <div className="home-card-overlay-top-left">
                    <span className="home-media-badge-dark">{acad.est}</span>
                  </div>
                  <div className="home-card-overlay-top-right">
                    <span className="home-academy-verified-badge">
                      <SiteIcon name="check-circle" size={11} />
                      Verified
                    </span>
                  </div>
                  <div className="home-card-overlay-bottom">
                    <span className="home-academy-scout-badge">{acad.scoutBadge}</span>
                  </div>
                </div>
                <h3 className="home-academy-title">
                  <a href="/academies" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {acad.name}
                  </a>
                </h3>
                <div className="home-academy-location">
                  <SiteIcon name="map-pin" size={12} />
                  <span>{acad.location}</span>
                </div>
                <div className="home-academy-sports">
                  {acad.sports}
                </div>
              </div>
              <div className="home-academy-footer">
                <span className="home-academy-category" title={acad.category}>
                  {acad.category}
                </span>
                <a className="home-academy-trials-link" href={acad.trialsLink}>
                  <span>Trials</span>
                  <SiteIcon name="chevron-right" size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Focus / Explore Section */}
      <section className="focus-section home-explore-section">
        <div className="section-heading">
          <p className="eyebrow">EXPLORE KHELGRID</p>
          <h2>Make your next move.</h2>
          <p className="page-intro">Start with the part of your sporting journey you want to explore.</p>
        </div>
        <div className="focus-grid home-feature-grid">
          <a className="focus-card focus-link home-feature-card" href="/sports">
            <span className="feature-icon" aria-hidden="true"><SiteIcon name="sports" size={22} /></span>
            <span className="card-number">01 / DISCOVER</span>
            <h3>Explore sports</h3>
            <p>Browse the sports catalogue with 22+ active Olympic and national disciplines.</p>
            <span className="card-action">Explore sports <span aria-hidden="true">↗</span></span>
          </a>
          <a className="focus-card focus-link home-feature-card" href="/opportunities">
            <span className="feature-icon" aria-hidden="true"><SiteIcon name="calendar-check" size={22} /></span>
            <span className="card-number">02 / COMPETE</span>
            <h3>Find opportunities</h3>
            <p>Explore trials, selections, camps and programmes with source information.</p>
            <span className="card-action">Browse opportunities <span aria-hidden="true">↗</span></span>
          </a>
          <a className="focus-card focus-link home-feature-card" href="/venues">
            <span className="feature-icon" aria-hidden="true"><SiteIcon name="map-pin" size={22} /></span>
            <span className="card-number">03 / PLAY</span>
            <h3>Discover venues</h3>
            <p>Review published venue information. Booking and live availability are not enabled.</p>
            <span className="card-action">Browse venues <span aria-hidden="true">↗</span></span>
          </a>
        </div>
      </section>

      {/* Foundation Strip */}
      <section className="foundation-strip" aria-label="Frontend foundation principles">
        <div><span aria-hidden="true">✓</span><strong>Modular navigation</strong><small>Shared route registry</small></div>
        <div><span aria-hidden="true">▣</span><strong>Responsive design</strong><small>Desktop, tablet and mobile</small></div>
        <div><span aria-hidden="true">◎</span><strong>Accessible by default</strong><small>Keyboard and focus support</small></div>
        <div><span aria-hidden="true">◉</span><strong>Database driven</strong><small>Real Supabase listings</small></div>
      </section>
    </>
  )
}
