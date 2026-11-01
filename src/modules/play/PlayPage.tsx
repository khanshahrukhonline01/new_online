import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import { getPickupGames, updatePickupGameSpots } from '../../integrations/supabase/public-client'
import type { CatalogueResult, DatabasePickupGame } from '../../integrations/supabase/public-client'
import { subscribeToRealtimeCatalogue } from '../../integrations/supabase/realtime-client'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { CatalogueEmptyState, CatalogueFilterPanel } from '../../shared/components/CatalogueFilterPanel'
import { DirectoryCallout } from '../../shared/components/DirectoryCallout'
import { createBannerSvg } from '../home/homeSvgBanners'
import { COMMUNITY_PICKUP_GAMES, type PickupGame } from './pickupData'
import './PlayPage.css'

export interface PlayPageProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, target: string) => void
  onOpenIntake?: () => void
}

export default function PlayPage({ onNavigate, onOpenIntake }: PlayPageProps = {}) {
  const [result, setResult] = useState<CatalogueResult<DatabasePickupGame> | { status: 'loading'; data: [] }>({
    status: 'loading',
    data: [],
  })

  const [liveUpdatedIds, setLiveUpdatedIds] = useState<Set<string>>(new Set())
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const markLiveUpdated = (id: string) => {
    setLiveUpdatedIds(prev => new Set(prev).add(id))
    window.setTimeout(() => {
      setLiveUpdatedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 3500)
  }

  const initial = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const [query, setQuery] = useState(initial.get('q') ?? '')
  const [sport, setSport] = useState(initial.get('sport') ?? '')
  const [city, setCity] = useState(initial.get('city') ?? '')
  const [skillLevel, setSkillLevel] = useState(initial.get('level') ?? '')
  const [sort, setSort] = useState(initial.get('sort') ?? 'featured')

  useEffect(() => {
    let active = true
    const loadGames = () => {
      getPickupGames().then(res => {
        if (active) setResult(res)
      })
    }
    loadGames()
    window.addEventListener('khelgrid:listing-added', loadGames)
    return () => {
      active = false
      window.removeEventListener('khelgrid:listing-added', loadGames)
    }
  }, [])

  // Realtime subscription for instant auto-refresh without page reloads
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeCatalogue(['pickup_games'], event => {
      if (event.eventType === 'DELETE') {
        const deletedId = (event.oldRecord as { id?: string })?.id
        if (deletedId) {
          setResult(prev => {
            if (prev.status !== 'ready') return prev
            return {
              status: 'ready',
              data: prev.data.filter(g => g.id !== deletedId),
            }
          })
        }
      } else if (event.newRecord) {
        const updated = event.newRecord as unknown as DatabasePickupGame
        setResult(prev => {
          const current =
            prev.status === 'ready' && prev.data.length > 0
              ? prev.data
              : COMMUNITY_PICKUP_GAMES.map(c => ({
                  id: c.id,
                  slug: c.id,
                  sport: c.sport,
                  emoji: c.emoji,
                  skill_level: c.skillLevel,
                  venue_name: c.venueName,
                  city: c.city,
                  time_label: c.timeLabel,
                  host_name: c.hostName,
                  price_per_player: c.pricePerPlayer,
                  spots_open: c.spotsOpen,
                  total_players: c.totalPlayers,
                  confirmed_players: c.confirmedPlayers,
                  is_featured: c.is_featured ?? false,
                  publication_status: 'published',
                }))
          const exists = current.some(g => g.id === updated.id)
          const nextData = exists
            ? current.map(g => (g.id === updated.id ? { ...g, ...updated } : g))
            : [updated, ...current]
          return { status: 'ready', data: nextData }
        })
        if (updated.id) {
          markLiveUpdated(updated.id)
        }
      }
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const handleReserve = async (game: PickupGame) => {
    if (game.spotsOpen <= 0 || joiningId === game.id) return
    setJoiningId(game.id)
    try {
      await updatePickupGameSpots(
        game.id,
        Math.max(0, game.spotsOpen - 1),
        game.confirmedPlayers + 1,
        {
          id: game.id,
          slug: game.id,
          sport: game.sport,
          emoji: game.emoji,
          skill_level: game.skillLevel,
          venue_name: game.venueName,
          city: game.city,
          time_label: game.timeLabel,
          host_name: game.hostName,
          price_per_player: game.pricePerPlayer,
          spots_open: Math.max(0, game.spotsOpen - 1),
          total_players: game.totalPlayers,
          confirmed_players: game.confirmedPlayers + 1,
          is_featured: game.is_featured,
        },
      )
    } finally {
      setJoiningId(null)
    }
  }

  const records = useMemo<PickupGame[]>(() => {
    if (result.status === 'ready' && result.data.length > 0) {
      return result.data.map(g => ({
        id: g.id,
        sport: g.sport,
        emoji: g.emoji || '⚽',
        skillLevel: (g.skill_level as 'Beginner' | 'Intermediate' | 'Advanced') || 'Intermediate',
        venueName: g.venue_name,
        city: g.city,
        timeLabel: g.time_label,
        hostName: g.host_name,
        pricePerPlayer: g.price_per_player,
        spotsOpen: g.spots_open,
        totalPlayers: g.total_players,
        confirmedPlayers: g.confirmed_players,
        is_featured: g.is_featured,
      }))
    }
    return COMMUNITY_PICKUP_GAMES
  }, [result])

  const sports = useMemo(
    () => [...new Set(records.map(r => r.sport))].sort((a, b) => a.localeCompare(b)),
    [records],
  )

  const cities = useMemo(
    () => [...new Set(records.map(r => r.city))].sort((a, b) => a.localeCompare(b)),
    [records],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records
      .filter(item => {
        if (q) {
          const match = [item.sport, item.venueName, item.city, item.hostName, item.skillLevel].some(v =>
            v.toLowerCase().includes(q),
          )
          if (!match) return false
        }
        if (sport && item.sport.toLowerCase() !== sport.toLowerCase()) return false
        if (city && item.city.toLowerCase() !== city.toLowerCase()) return false
        if (skillLevel && item.skillLevel.toLowerCase() !== skillLevel.toLowerCase()) return false
        return true
      })
      .sort((a, b) => {
        if (sort === 'featured') {
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
          return b.confirmedPlayers - a.confirmedPlayers
        }
        if (sort === 'spots') return b.spotsOpen - a.spotsOpen
        if (sort === 'players') return b.confirmedPlayers - a.confirmedPlayers
        return a.sport.localeCompare(b.sport)
      })
  }, [records, query, sport, city, skillLevel, sort])

  const clearAll = () => {
    setQuery('')
    setSport('')
    setCity('')
    setSkillLevel('')
    setSort('featured')
  }

  const fields = [
    {
      key: 'sport',
      label: 'Sport',
      value: sport,
      onChange: setSport,
      options: sports.map(s => ({ value: s, label: s })),
    },
    {
      key: 'city',
      label: 'City',
      value: city,
      onChange: setCity,
      options: cities.map(c => ({ value: c, label: c })),
    },
    {
      key: 'level',
      label: 'Skill level',
      value: skillLevel,
      onChange: setSkillLevel,
      options: [
        { value: 'Beginner', label: 'Beginner' },
        { value: 'Intermediate', label: 'Intermediate' },
        { value: 'Advanced', label: 'Advanced' },
      ],
    },
  ]

  const hasActiveFilters = Boolean(query.trim() || sport || city || skillLevel || sort !== 'featured')

  return (
    <section className="content-page play-page">
      <nav aria-label="breadcrumb" className="play-breadcrumb">
        <ol>
          <li>
            <a href="/" onClick={e => onNavigate?.(e, '/')}>
              <SiteIcon name="home" size={14} />
              <span>Home</span>
            </a>
          </li>
          <li aria-hidden="true">
            <SiteIcon name="chevron-right" size={12} />
          </li>
          <li aria-current="page">
            <span>Play · Find games</span>
          </li>
        </ol>
      </nav>

      <p className="eyebrow">COMMUNITY MATCHES · PICKUP GAMES</p>
      <h1>Join local pickup games.</h1>
      <p className="page-intro">
        Connect with local athletes, fill missing court spots, and play your favourite sports across India.
      </p>

      <DirectoryCallout
        variant="opportunity"
        tag="Host Match"
        title="Hosting a match and need players? Post a Game"
        description="Fill missing spots on your court or turf. Set sport, venue, skill level, and split costs with local players."
        buttonLabel="Host a match"
        buttonHref={onOpenIntake ? '#' : 'mailto:khelgrid@gmail.com?subject=Host%20a%20pickup%20match%20on%20KhelGrid'}
        onButtonClick={onOpenIntake}
      />

      <AsyncState state={result.status === 'loading' ? 'ready' : result.status}>
        <div className="kg-catalogue-layout">
          <CatalogueFilterPanel
            search={query}
            onSearch={setQuery}
            searchPlaceholder="Sport, venue, city or host…"
            fields={fields}
            onClear={clearAll}
            sort={sort}
            onSort={setSort}
            defaultSort="featured"
            resultCount={visible.length}
            totalCount={records.length}
          />

          <div className="kg-catalogue-results">
            <div className="kg-results-toolbar">
              <span>
                {visible.length} of {records.length} pickup games
              </span>
              <label>
                Sort by{' '}
                <select value={sort} onChange={e => setSort(e.target.value)}>
                  <option value="featured">Featured First</option>
                  <option value="spots">Most Spots Open</option>
                  <option value="players">Most Confirmed Players</option>
                  <option value="sport">Sport Name</option>
                </select>
              </label>
            </div>

            {visible.length ? (
              <div className="play-grid" role="list" aria-label="Pickup sports games">
                {visible.map(game => (
                  <article
                    key={game.id}
                    className={`play-card${liveUpdatedIds.has(game.id) ? ' is-live-updated' : ''}`}
                    role="listitem"
                  >
                    <div>
                      <div className="play-card-media">
                        <img
                          src={createBannerSvg(`${game.sport} Pickup`, `${game.venueName} · ${game.city}`, game.emoji, 'cyan')}
                          alt={`${game.sport} pickup game at ${game.venueName} in ${game.city}`}
                          title={`${game.sport} Community Match · ${game.venueName}, ${game.city}`}
                          loading="lazy"
                          decoding="async"
                          width={400}
                          height={200}
                        />
                        <div className="play-card-overlay-top-left">
                          <span className="home-media-badge-dark">{game.sport}</span>
                          {liveUpdatedIds.has(game.id) && (
                            <span className="play-badge-live-pulse">
                              ⚡ Live Updated
                            </span>
                          )}
                          {game.is_featured && (
                            <span className="home-featured-star-pill">
                              <SiteIcon name="sparkles" size={11} />
                              Featured
                            </span>
                          )}
                          <span className="play-badge-skill">{game.skillLevel}</span>
                        </div>
                        <div className="play-card-overlay-bottom">
                          <span className="play-badge-spots">
                            {game.spotsOpen} {game.spotsOpen === 1 ? 'spot' : 'spots'} open
                          </span>
                          <span className="play-badge-price">{game.pricePerPlayer}</span>
                        </div>
                      </div>

                      <div className="play-card-body">
                        <h2 className="play-card-title">{game.venueName}</h2>
                        <div className="play-card-meta">
                          <SiteIcon name="map-pin" size={13} />
                          {onNavigate ? (
                            <a
                              href={`/venues?city=${encodeURIComponent(game.city)}`}
                              onClick={e => onNavigate(e, `/venues?city=${encodeURIComponent(game.city)}`)}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              {game.venueName}, {game.city}
                            </a>
                          ) : (
                            <span>{game.venueName}, {game.city}</span>
                          )}
                        </div>
                        <div className="play-card-meta">
                          <SiteIcon name="clock" size={13} />
                          <span>{game.timeLabel} · Host: {game.hostName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="play-card-footer">
                      <div className="play-progress-wrap">
                        <div className="play-meta-row">
                          <span>{game.confirmedPlayers}/{game.totalPlayers} Players Confirmed</span>
                          <span style={{ color: '#059669' }}>
                            {game.spotsOpen} {game.spotsOpen === 1 ? 'spot' : 'spots'} left
                          </span>
                        </div>
                        <div className="play-progress-track">
                          <div
                            className="play-progress-bar"
                            style={{
                              width: `${Math.min(100, Math.round((game.confirmedPlayers / game.totalPlayers) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {game.spotsOpen <= 0 ? 'All spots filled' : `${game.spotsOpen} spots available`}
                        </span>
                        <button
                          type="button"
                          className="play-join-btn"
                          disabled={game.spotsOpen <= 0 || joiningId === game.id}
                          onClick={() => handleReserve(game)}
                        >
                          {joiningId === game.id ? 'Reserving…' : game.spotsOpen <= 0 ? 'Full' : 'Reserve Spot'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <CatalogueEmptyState
                onClear={clearAll}
                hasFilters={hasActiveFilters}
              />
            )}
          </div>
        </div>
      </AsyncState>
    </section>
  )
}
