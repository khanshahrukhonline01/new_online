import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { AsyncState } from '../../shared/components/AsyncState'
import {
  getPickupGames,
  joinPickupGame,
  getUserRsvpGameIds,
  getStoredUser,
} from '../../integrations/supabase/public-client'
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
  const [joinedGameIds, setJoinedGameIds] = useState<Set<string>>(() => getUserRsvpGameIds())

  // RSVP Modal State
  const [rsvpModalGame, setRsvpModalGame] = useState<PickupGame | null>(null)
  const [rsvpName, setRsvpName] = useState(() => getStoredUser()?.name || '')
  const [rsvpPhone, setRsvpPhone] = useState(() => getStoredUser()?.phone || '')
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [rsvpSuccess, setRsvpSuccess] = useState<{
    game: PickupGame
    whatsappGroupUrl?: string | null
    participantName: string
  } | null>(null)

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

  // Realtime subscription for instant auto-refresh across clients
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
                  whatsapp_group_url: c.whatsappGroupUrl || null,
                  status: c.status || (c.spotsOpen <= 0 ? 'full' : 'open'),
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

  const handleOpenRsvp = (game: PickupGame) => {
    if (game.spotsOpen <= 0 || game.status === 'full') return
    setRsvpModalGame(game)
    setRsvpError('')
    setRsvpSuccess(null)
    const stored = getStoredUser()
    if (stored?.name && !rsvpName) setRsvpName(stored.name)
    if (stored?.phone && !rsvpPhone) setRsvpPhone(stored.phone)
  }

  const handleCloseRsvp = () => {
    setRsvpModalGame(null)
    setRsvpSuccess(null)
    setRsvpError('')
  }

  const handleConfirmRsvp = async (e: FormEvent) => {
    e.preventDefault()
    if (!rsvpModalGame) return

    const name = rsvpName.trim()
    if (name.length < 2) {
      setRsvpError('Please enter your full name (at least 2 characters).')
      return
    }

    setRsvpSubmitting(true)
    setRsvpError('')

    try {
      const res = await joinPickupGame({
        gameId: rsvpModalGame.id,
        playerName: name,
        playerPhone: rsvpPhone.trim() || undefined,
      })

      if (res.status === 'confirmed') {
        setJoinedGameIds(prev => new Set(prev).add(rsvpModalGame.id))
        setRsvpSuccess({
          game: rsvpModalGame,
          whatsappGroupUrl: res.whatsappGroupUrl || rsvpModalGame.whatsappGroupUrl || null,
          participantName: name,
        })
        markLiveUpdated(rsvpModalGame.id)

        // Optimistically update local results
        setResult(prev => {
          if (prev.status !== 'ready') return prev
          return {
            status: 'ready',
            data: prev.data.map(g =>
              g.id === rsvpModalGame.id
                ? {
                    ...g,
                    spots_open: Math.max(0, g.spots_open - 1),
                    confirmed_players: g.confirmed_players + 1,
                    status: g.spots_open - 1 <= 0 ? 'full' : 'open',
                  }
                : g,
            ),
          }
        })
      } else if (res.status === 'full') {
        setRsvpError('Sorry, this match just filled up! All spots are taken.')
      } else {
        setRsvpError(res.message || 'Could not complete reservation. Please try again.')
      }
    } catch {
      setRsvpError('Failed to reserve spot. Please check your network connection.')
    } finally {
      setRsvpSubmitting(false)
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
        whatsappGroupUrl: g.whatsapp_group_url || undefined,
        status: (g.status as 'open' | 'full' | 'completed' | 'cancelled') || (g.spots_open <= 0 ? 'full' : 'open'),
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
        Connect with local athletes, fill missing court spots, coordinate matches via WhatsApp, and play your favourite sports across India.
      </p>

      <DirectoryCallout
        variant="opportunity"
        tag="Host Match"
        title="Hosting a match and need players? Post a Game"
        description="Fill missing spots on your court or turf. Set sport, venue, skill level, and share an instant WhatsApp group link with players."
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
                {visible.map(game => {
                  const isConfirmed = joinedGameIds.has(game.id)
                  const isFull = game.spotsOpen <= 0 || game.status === 'full'

                  return (
                    <article
                      key={game.id}
                      className={`play-card${liveUpdatedIds.has(game.id) ? ' is-live-updated' : ''}${isFull ? ' is-full' : ''}`}
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
                            {isFull ? (
                              <span className="play-badge-full">Match Full</span>
                            ) : (
                              <span className="play-badge-spots">
                                {game.spotsOpen} {game.spotsOpen === 1 ? 'spot' : 'spots'} open
                              </span>
                            )}
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
                            <span style={{ color: isFull ? '#ef4444' : '#059669' }}>
                              {isFull ? '0 spots left' : `${game.spotsOpen} ${game.spotsOpen === 1 ? 'spot' : 'spots'} left`}
                            </span>
                          </div>
                          <div className="play-progress-track">
                            <div
                              className="play-progress-bar"
                              style={{
                                width: `${Math.min(100, Math.round((game.confirmedPlayers / game.totalPlayers) * 100))}%`,
                                background: isFull ? '#ef4444' : undefined,
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            {isFull ? 'All spots filled' : `${game.spotsOpen} spots available`}
                          </span>

                          {isConfirmed ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="play-badge-confirmed">
                                <SiteIcon name="check" size={12} /> Confirmed
                              </span>
                              {game.whatsappGroupUrl && (
                                <a
                                  href={game.whatsappGroupUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="play-whatsapp-btn"
                                  title="Open match coordination WhatsApp group"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <SiteIcon name="message-circle" size={13} />
                                  <span>WhatsApp Group</span>
                                </a>
                              )}
                            </div>
                          ) : isFull ? (
                            <button
                              type="button"
                              className="play-join-btn is-full"
                              disabled
                              title="All spots in this match are filled"
                            >
                              Full
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="play-join-btn"
                              onClick={() => handleOpenRsvp(game)}
                            >
                              Reserve Spot
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
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

      {/* Interactive RSVP & Player Coordination Modal */}
      {rsvpModalGame && (
        <div className="play-rsvp-overlay" onClick={handleCloseRsvp}>
          <div
            className="play-rsvp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rsvp-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="play-rsvp-header">
              <h3 id="rsvp-modal-title">
                <span>{rsvpModalGame.emoji}</span>
                <span>{rsvpSuccess ? 'Spot Confirmed!' : `Reserve Spot · ${rsvpModalGame.sport}`}</span>
              </h3>
              <button
                type="button"
                className="play-rsvp-close-btn"
                onClick={handleCloseRsvp}
                aria-label="Close dialog"
              >
                <SiteIcon name="close" size={18} />
              </button>
            </div>

            {rsvpSuccess ? (
              <div className="play-rsvp-success">
                <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
                  <div style={{ fontSize: '42px', marginBottom: '8px' }}>🎉</div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>
                    You're Playing with {rsvpSuccess.game.hostName}!
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                    Your spot is locked at <strong>{rsvpSuccess.game.venueName}</strong>, {rsvpSuccess.game.city}.
                  </p>
                </div>

                {rsvpSuccess.whatsappGroupUrl && (
                  <div className="play-whatsapp-unlock-card">
                    <h4>
                      <SiteIcon name="message-circle" size={18} />
                      <span>Instant Match WhatsApp Group</span>
                    </h4>
                    <p>
                      Join the match group to coordinate pitch directions, bib colors, team formations, and live arrival updates with {rsvpSuccess.game.hostName}.
                    </p>
                    <a
                      href={rsvpSuccess.whatsappGroupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="play-whatsapp-link-btn"
                    >
                      <SiteIcon name="message-circle" size={17} />
                      <span>Open WhatsApp Group Link →</span>
                    </a>
                  </div>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="play-rsvp-submit-btn"
                    onClick={handleCloseRsvp}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmRsvp} className="play-rsvp-form">
                <div className="play-rsvp-summary-box">
                  <div className="play-rsvp-summary-row">
                    <span>Venue:</span>
                    <strong>{rsvpModalGame.venueName}, {rsvpModalGame.city}</strong>
                  </div>
                  <div className="play-rsvp-summary-row">
                    <span>Time:</span>
                    <strong>{rsvpModalGame.timeLabel}</strong>
                  </div>
                  <div className="play-rsvp-summary-row">
                    <span>Price &amp; Spots:</span>
                    <strong>{rsvpModalGame.pricePerPlayer} · {rsvpModalGame.spotsOpen} spots remaining</strong>
                  </div>
                </div>

                {rsvpError && (
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                    {rsvpError}
                  </div>
                )}

                <label className="play-rsvp-field">
                  <span>Your Full Name *</span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Arjun Rao"
                    value={rsvpName}
                    onChange={e => setRsvpName(e.target.value)}
                    autoFocus
                  />
                </label>

                <label className="play-rsvp-field">
                  <span>Phone Number / WhatsApp (Optional)</span>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={rsvpPhone}
                    onChange={e => setRsvpPhone(e.target.value)}
                  />
                  <small style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>
                    Used by the host solely for match coordination &amp; venue gate entry.
                  </small>
                </label>

                <div className="play-rsvp-actions">
                  <button
                    type="button"
                    className="play-rsvp-cancel-btn"
                    onClick={handleCloseRsvp}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="play-rsvp-submit-btn"
                    disabled={rsvpSubmitting}
                  >
                    {rsvpSubmitting ? 'Reserving…' : 'Confirm Spot'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
