import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getAcademies,
  getAnnouncements,
  getCities,
  getOpportunities,
  getPickupGames,
  getSports,
  getVenues,
  updatePickupGameSpots,
} from '../../integrations/supabase/public-client'
import type { CatalogueResult, DatabaseAnnouncement, DatabaseCity, DatabasePickupGame } from '../../integrations/supabase/public-client'
import { subscribeToRealtimeCatalogue } from '../../integrations/supabase/realtime-client'
import type { Academy, Opportunity, Sport, Venue } from '../../shared/domain'
import { liveSportsEngine } from '../live/services/liveSportsEngine'
import type { SportsMatch } from '../live/types'
import { SiteIcon } from '../../shared/components/SiteIcon'
import { createBannerSvg } from './homeSvgBanners'
import { HomeKhelChronicle } from './HomeKhelChronicle'
import { METRO_16_CITIES } from '../../shared/components/citiesData'
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
  is_featured?: boolean
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

interface FormattedHomeAcademy {
  id: string
  slug: string
  name: string
  est: string
  scoutBadge: string
  location: string
  sports: string
  category: string
  trialsLink: string
  cardLink: string
  svgBanner: string
}

const FEATURED_PROMINENCE_KEYWORDS = [
  'inspire institute of sport',
  'tata football academy',
  'pullela gopichand badminton',
  'mary kom boxing',
  'army sports institute',
  'reliance foundation young champs',
  'gun for glory',
  'prakash padukone badminton',
  'bengaluru fc residential',
  'netaji subhas national institute',
  'bhaichung bhutia football',
  'roundglass sports academy',
]

function getAcademyPriority(a: Academy): number {
  if (a.is_featured) return 500
  const n = a.name.toLowerCase()
  for (let i = 0; i < FEATURED_PROMINENCE_KEYWORDS.length; i++) {
    if (n.includes(FEATURED_PROMINENCE_KEYWORDS[i])) return 100 - i
  }
  const d = (a.description || '').toLowerCase()
  if (d.includes('olympic') || d.includes('khelo india accredited')) return 50
  if (d.includes('center of excellence') || d.includes('ncoe')) return 40
  return 10
}

function parseHomeAcademy(a: Academy): FormattedHomeAcademy {
  const desc = a.description || ''
  const text = `${a.name} ${desc}`.toLowerCase()

  let emoji = '🏛️'
  let sportName = 'Multi-Sport'
  let theme: 'emerald' | 'cyan' | 'amber' | 'navy' = 'navy'

  if (text.includes('football')) {
    emoji = '⚽'
    sportName = 'Football'
    theme = 'emerald'
  } else if (text.includes('badminton')) {
    emoji = '🏸'
    sportName = 'Badminton'
    theme = 'cyan'
  } else if (text.includes('shooting')) {
    emoji = '🎯'
    sportName = 'Shooting'
    theme = 'amber'
  } else if (text.includes('cricket') || text.includes('bowling')) {
    emoji = '🏏'
    sportName = 'Cricket'
    theme = 'amber'
  } else if (text.includes('boxing')) {
    emoji = '🥊'
    sportName = 'Boxing'
    theme = 'amber'
  } else if (text.includes('archery')) {
    emoji = '🏹'
    sportName = 'Archery'
    theme = 'emerald'
  } else if (text.includes('athletics') || text.includes('track')) {
    emoji = '🏃'
    sportName = 'Athletics'
    theme = 'navy'
  } else if (text.includes('swimming') || text.includes('swim')) {
    emoji = '🏊'
    sportName = 'Swimming'
    theme = 'cyan'
  } else if (text.includes('rowing')) {
    emoji = '🚣'
    sportName = 'Rowing'
    theme = 'cyan'
  } else if (text.includes('tennis')) {
    emoji = '🎾'
    sportName = 'Tennis'
    theme = 'emerald'
  } else if (text.includes('wrestling')) {
    emoji = '🤼'
    sportName = 'Wrestling'
    theme = 'navy'
  } else if (text.includes('basketball')) {
    emoji = '🏀'
    sportName = 'Basketball'
    theme = 'amber'
  }

  const yearMatch = desc.match(/\b(19\d{2}|20\d{2})\b/)
  const est = yearMatch ? `Est. ${yearMatch[1]}` : 'Accredited'

  const accredMatch = desc.match(/Accreditation:\s*([^.;\n]+)/i)
  const scoutBadge = a.is_featured
    ? 'Featured Center'
    : accredMatch
      ? accredMatch[1].trim().slice(0, 32)
      : 'Verified Academy'

  let category = 'Sports Academy'
  if (text.includes('ncoe') || text.includes('excellence')) category = 'Center of Excellence'
  else if (text.includes('olympic')) category = 'Olympic Training Center'
  else if (text.includes('khelo india')) category = 'Khelo India Accredited'
  else if (text.includes('high performance')) category = 'High Performance Hub'

  const location = `${a.city}${a.state ? `, ${a.state}` : ''}`

  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    est,
    scoutBadge,
    location,
    sports: `${emoji} ${sportName}`,
    category,
    trialsLink: `/opportunities?city=${encodeURIComponent(a.city)}`,
    cardLink: `/academies?q=${encodeURIComponent(a.name)}`,
    svgBanner: createBannerSvg(a.name, location, emoji, theme),
  }
}

export interface HomePageProps {
  onNavigate?: (event: React.MouseEvent<HTMLAnchorElement>, href: string) => void
}

export default function HomePage({ onNavigate }: HomePageProps = {}) {
  const [counts, setCounts] = useState<{
    sports?: CatalogueResult<Sport>
    opportunities?: CatalogueResult<Opportunity>
    venues?: CatalogueResult<Venue>
    academies?: CatalogueResult<Academy>
    cities?: CatalogueResult<DatabaseCity>
    pickupGames?: CatalogueResult<DatabasePickupGame>
  }>({})

  const [liveMatches, setLiveMatches] = useState<SportsMatch[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)

  const [reduceMotion, setReduceMotion] = useState(false)
  const [activeHeroSlide, setActiveHeroSlide] = useState(0)
  const [heroSearch, setHeroSearch] = useState('')
  const [selectedCity, setSelectedCity] = useState('All India')
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [seasonalAnnouncement, setSeasonalAnnouncement] = useState<DatabaseAnnouncement | null>(null)
  const [liveUpdatedIds, setLiveUpdatedIds] = useState<Set<string>>(new Set())
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null)

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

  const greetingTime = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning, Athlete'
    if (hour < 17) return 'Good afternoon, Athlete'
    return 'Good evening, Athlete'
  }, [])

  const heroDiscoveryCards = [
    {
      title: 'Live Scores',
      subtitle: 'Match Center & Feeds',
      icon: 'activity' as const,
      bgClass: 'hero-icon-rose',
      liveTag: true,
      href: '/live-scores',
    },
    {
      title: 'Trials',
      subtitle: '350+ SAI & Club',
      icon: 'trophy' as const,
      bgClass: 'hero-icon-amber',
      href: '/opportunities',
    },
    {
      title: 'KhelChronicle',
      subtitle: 'Sports Research Papers',
      icon: 'book-open' as const,
      bgClass: 'hero-icon-indigo',
      tag: 'Research',
      href: '/khelchronicle',
    },
    {
      title: 'Coaching',
      subtitle: 'Top Academies',
      icon: 'building' as const,
      bgClass: 'hero-icon-purple',
      href: '/academies',
    },
    {
      title: 'Book Turf',
      subtitle: 'Hourly Slots',
      icon: 'calendar' as const,
      bgClass: 'hero-icon-emerald',
      href: '/venues',
    },
    {
      title: 'Pickup Games',
      subtitle: 'Join Match',
      icon: 'activity' as const,
      bgClass: 'hero-icon-blue',
      href: '/play',
    },
    {
      title: 'Talent Scanner',
      subtitle: 'Fitness Benchmarks',
      icon: 'award' as const,
      bgClass: 'hero-icon-orange',
      tag: 'Scout AI',
      href: '/talent-scanner',
    },
    {
      title: 'Sports CV',
      subtitle: 'Scout Passport',
      icon: 'sparkles' as const,
      bgClass: 'hero-icon-pink',
      href: '/sports-cv',
    },
    {
      title: 'Tournaments',
      subtitle: 'State & City',
      icon: 'medal' as const,
      bgClass: 'hero-icon-cyan',
      href: '/events',
    },
    {
      title: 'All Sports',
      subtitle: '54+ Disciplines',
      icon: 'sports' as const,
      bgClass: 'hero-icon-teal',
      href: '/sports',
    },
  ]

  const quickExploreChips = [
    { label: 'Live Matches', emoji: '🔴', href: '/live-scores' },
    { label: 'Cricket Trials', emoji: '🏏', href: '/opportunities?sport=Cricket' },
    { label: 'KhelChronicle', emoji: '🔬', href: '/khelchronicle' },
    { label: 'Book Turf', emoji: '⚽', href: '/venues' },
    { label: 'Pickup Games', emoji: '🏸', href: '/play' },
    { label: 'Talent Scanner', emoji: '⚡', href: '/talent-scanner' },
    { label: 'Sports CV', emoji: '📄', href: '/sports-cv' },
  ]

  // Home page strictly features no more than 16 cities; remaining are browsable on /cities
  const homeCities = useMemo(() => {
    if (counts.cities?.status === 'ready' && counts.cities.data.length > 0) {
      const metros = counts.cities.data.filter(c => c.is_metro)
      const pool = metros.length > 0 ? metros : counts.cities.data
      return pool.slice(0, 16)
    }
    return METRO_16_CITIES.slice(0, 16)
  }, [counts.cities])

  const handleLink = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    onNavigate?.(event, href)
  }

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = heroSearch.trim()
    const target = query ? `/search?q=${encodeURIComponent(query)}` : '/search'
    if (onNavigate) {
      const syntheticEvent = {
        preventDefault: () => {},
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        button: 0,
      } as React.MouseEvent<HTMLAnchorElement>
      onNavigate(syntheticEvent, target)
    } else if (typeof window !== 'undefined') {
      window.location.href = target
    }
  }

  // Rail scroll refs
  const heroCardsRailRef = useRef<HTMLDivElement>(null)
  const liveMatchesRailRef = useRef<HTMLDivElement>(null)
  const trialsRailRef = useRef<HTMLDivElement>(null)
  const turfsRailRef = useRef<HTMLDivElement>(null)
  const pickupRailRef = useRef<HTMLDivElement>(null)
  const academiesRailRef = useRef<HTMLDivElement>(null)

  const heroSlides = [
    {
      name: 'Football',
      sport: 'Football',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1920&q=80',
      position: 'center 54%',
      alt: 'Competitive football match on floodlit stadium turf with players contesting possession',
      title: 'Indian Grassroots Football & Selection Trials on KhelGrid',
    },
    {
      name: 'Cricket',
      sport: 'Cricket',
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1920&q=80',
      position: 'center 48%',
      alt: 'Fast bowler delivering ball at championship cricket tournament stadium pitch',
      title: 'State & Zonal Cricket Combines and Selection Trials',
    },
    {
      name: 'Athletics',
      sport: 'Athletics',
      image: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=1920&q=80',
      position: 'center 42%',
      alt: 'Junior track athletes launching from starting blocks on professional synthetic running track at national sports complex',
      title: 'National Athletics Meets & SAI High Performance Centers',
    },
    {
      name: 'Basketball',
      sport: 'Basketball',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1920&q=80',
      position: 'center 48%',
      alt: 'Basketball player executing mid-air shot on indoor championship hardwood arena court',
      title: 'State & National Basketball Championships',
    },
    {
      name: 'Badminton',
      sport: 'Badminton',
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1920&q=80',
      position: 'center 45%',
      alt: 'Badminton athlete executing powerful jump smash on indoor BWF-grade synthetic court mat',
      title: 'Accredited Badminton Academies and State Ranking Tournaments',
    },
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
    const loadCatalogues = () => {
      Promise.all([
        getSports(),
        getOpportunities(),
        getVenues(),
        getAcademies(),
        getCities(),
        getPickupGames(),
        getAnnouncements(),
      ]).then(
        ([sports, opportunities, venues, academies, cities, pickupGames, announcements]) => {
          if (active) {
            setCounts({ sports, opportunities, venues, academies, cities, pickupGames })
            if (announcements.status === 'ready' && announcements.data.length > 0) {
              setSeasonalAnnouncement(announcements.data[0])
            }
          }
        },
      )
    }
    loadCatalogues()
    window.addEventListener('khelgrid:listing-added', loadCatalogues)
    return () => {
      active = false
      window.removeEventListener('khelgrid:listing-added', loadCatalogues)
    }
  }, [])

  // Realtime live subscriptions for dynamic catalogue updates
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeCatalogue(
      ['pickup_games', 'opportunities', 'venues', 'academies', 'site_announcements'],
      event => {
        if (event.table === 'pickup_games') {
          if (event.eventType === 'DELETE') {
            const deletedId = (event.oldRecord as { id?: string })?.id
            if (deletedId) {
              setCounts(prev => {
                if (!prev.pickupGames || prev.pickupGames.status !== 'ready') return prev
                return {
                  ...prev,
                  pickupGames: {
                    status: 'ready',
                    data: prev.pickupGames.data.filter(g => g.id !== deletedId),
                  },
                }
              })
            }
          } else if (event.newRecord) {
            const updated = event.newRecord as unknown as DatabasePickupGame
            setCounts(prev => {
              const base =
                prev.pickupGames?.status === 'ready' && prev.pickupGames.data.length > 0
                  ? prev.pickupGames.data
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
              const exists = base.some(g => g.id === updated.id)
              const nextData = exists
                ? base.map(g => (g.id === updated.id ? { ...g, ...updated } : g))
                : [updated, ...base]
              return {
                ...prev,
                pickupGames: { status: 'ready', data: nextData },
              }
            })
            if (updated.id) markLiveUpdated(updated.id)
          }
        } else if (event.table === 'opportunities') {
          if (event.eventType === 'DELETE') {
            const deletedId = (event.oldRecord as { id?: string })?.id
            if (deletedId) {
              setCounts(prev => {
                if (!prev.opportunities || prev.opportunities.status !== 'ready') return prev
                return {
                  ...prev,
                  opportunities: {
                    status: 'ready',
                    data: prev.opportunities.data.filter(o => o.id !== deletedId),
                  },
                }
              })
            }
          } else if (event.newRecord) {
            const record = event.newRecord as unknown as Opportunity
            setCounts(prev => {
              const base = prev.opportunities?.status === 'ready' ? prev.opportunities.data : []
              const exists = base.some(o => o.id === record.id)
              return {
                ...prev,
                opportunities: {
                  status: 'ready',
                  data: exists
                    ? base.map(o => (o.id === record.id ? { ...o, ...record } : o))
                    : [record, ...base],
                },
              }
            })
            if (record.id) markLiveUpdated(record.id)
          }
        } else if (event.table === 'venues') {
          if (event.eventType === 'DELETE') {
            const deletedId = (event.oldRecord as { id?: string })?.id
            if (deletedId) {
              setCounts(prev => {
                if (!prev.venues || prev.venues.status !== 'ready') return prev
                return {
                  ...prev,
                  venues: {
                    status: 'ready',
                    data: prev.venues.data.filter(v => v.id !== deletedId),
                  },
                }
              })
            }
          } else if (event.newRecord) {
            const record = event.newRecord as unknown as Venue
            setCounts(prev => {
              const base = prev.venues?.status === 'ready' ? prev.venues.data : []
              const exists = base.some(v => v.id === record.id)
              return {
                ...prev,
                venues: {
                  status: 'ready',
                  data: exists
                    ? base.map(v => (v.id === record.id ? { ...v, ...record } : v))
                    : [record, ...base],
                },
              }
            })
            if (record.id) markLiveUpdated(record.id)
          }
        } else if (event.table === 'academies') {
          if (event.eventType === 'DELETE') {
            const deletedId = (event.oldRecord as { id?: string })?.id
            if (deletedId) {
              setCounts(prev => {
                if (!prev.academies || prev.academies.status !== 'ready') return prev
                return {
                  ...prev,
                  academies: {
                    status: 'ready',
                    data: prev.academies.data.filter(a => a.id !== deletedId),
                  },
                }
              })
            }
          } else if (event.newRecord) {
            const record = event.newRecord as unknown as Academy
            setCounts(prev => {
              const base = prev.academies?.status === 'ready' ? prev.academies.data : []
              const exists = base.some(a => a.id === record.id)
              return {
                ...prev,
                academies: {
                  status: 'ready',
                  data: exists
                    ? base.map(a => (a.id === record.id ? { ...a, ...record } : a))
                    : [record, ...base],
                },
              }
            })
            if (record.id) markLiveUpdated(record.id)
          }
        } else if (event.table === 'site_announcements') {
          if (event.eventType === 'DELETE') {
            setSeasonalAnnouncement(null)
          } else if (event.newRecord) {
            setSeasonalAnnouncement(event.newRecord as unknown as DatabaseAnnouncement)
          }
        }
      },
    )

    return () => {
      unsubscribe()
    }
  }, [])

  const handleReserveSpot = async (
    e: React.MouseEvent,
    game: {
      id: string
      sport: string
      emoji?: string
      skillLevel: string
      venueName: string
      city: string
      timeLabel: string
      hostName: string
      pricePerPlayer: string
      spotsOpen: number
      totalPlayers: number
      confirmedPlayers: number
      is_featured?: boolean
    },
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (game.spotsOpen <= 0 || joiningGameId === game.id) return
    setJoiningGameId(game.id)
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
          skill_level: game.skillLevel as DatabasePickupGame['skill_level'],
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
      setJoiningGameId(null)
    }
  }

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
    if (reduceMotion) return
    const timer = window.setInterval(
      () => setActiveHeroSlide(current => (current + 1) % heroSlides.length),
      3500,
    )
    return () => window.clearInterval(timer)
  }, [reduceMotion, heroSlides.length])

  // Display academies: 12 dynamic institutions from Supabase database (zero hardcoding, remaining on /academies)
  const displayAcademies = useMemo(() => {
    if (counts.academies?.status !== 'ready') return []
    const sorted = [...counts.academies.data].sort((a, b) => getAcademyPriority(b) - getAcademyPriority(a))
    const seen = new Set<string>()
    const selected: FormattedHomeAcademy[] = []
    for (const item of sorted) {
      const key = item.name.toLowerCase().replace(/\s*\([^)]*\)/g, '').slice(0, 20)
      if (!seen.has(key)) {
        seen.add(key)
        selected.push(parseHomeAcademy(item))
        if (selected.length === 12) break
      }
    }
    return selected
  }, [counts.academies])

  // Selection trials: sorted by featured first, then upcoming dates / deadlines, then verified
  const displayOpportunities = useMemo(() => {
    if (counts.opportunities?.status !== 'ready') return []
    const now = Date.now()
    return [...counts.opportunities.data].sort((a, b) => {
      const aFeatured = Boolean(a.is_featured || a.metadata?.featured || a.metadata?.is_featured)
      const bFeatured = Boolean(b.is_featured || b.metadata?.featured || b.metadata?.is_featured)
      if (aFeatured !== bFeatured) return aFeatured ? -1 : 1

      const aVerified = a.verification_status === 'verified'
      const bVerified = b.verification_status === 'verified'
      if (aVerified !== bVerified) return aVerified ? -1 : 1

      const aStart = a.starts_at ? new Date(a.starts_at).getTime() : Number.POSITIVE_INFINITY
      const bStart = b.starts_at ? new Date(b.starts_at).getTime() : Number.POSITIVE_INFINITY
      const aUpcoming = aStart >= now
      const bUpcoming = bStart >= now
      if (aUpcoming && !bUpcoming) return -1
      if (!aUpcoming && bUpcoming) return 1
      if (aUpcoming && bUpcoming && aStart !== bStart) return aStart - bStart

      return (b.starts_at ?? '').localeCompare(a.starts_at ?? '')
    })
  }, [counts.opportunities])

  // Display venues: sorted by featured first, then government facility status, then alphabetical
  const displayVenues = useMemo(() => {
    if (counts.venues?.status !== 'ready') return []
    return [...counts.venues.data].sort((a, b) => {
      const aFeatured = Boolean(a.is_featured)
      const bFeatured = Boolean(b.is_featured)
      if (aFeatured !== bFeatured) return aFeatured ? -1 : 1

      const aGov = Boolean(a.government_facility)
      const bGov = Boolean(b.government_facility)
      if (aGov !== bGov) return aGov ? -1 : 1

      return a.name.localeCompare(b.name)
    })
  }, [counts.venues])

  // Pickup games: dynamic database community matches with fallback to COMMUNITY_PICKUP_GAMES
  const displayPickupGames = useMemo(() => {
    if (counts.pickupGames?.status === 'ready' && counts.pickupGames.data.length > 0) {
      return [...counts.pickupGames.data]
        .sort((a, b) => {
          if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1
          return b.confirmed_players - a.confirmed_players
        })
        .map(g => ({
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
  }, [counts.pickupGames])

  return (
    <>
      {/* 0. Full-Bleed Cinematic Hero Panel */}
      <section className="home-hero-panel home-hero-cinematic" aria-label="KhelGrid sports universe hero">
        {/* Ambient Full-Bleed Background Slides Layer */}
        <div className="home-hero-bg-layer" aria-hidden="true">
          <div className="home-hero-slides">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.name}
                className={`home-hero-bg-image${index === activeHeroSlide ? ' is-active' : ''}`}
                src={slide.image}
                alt={slide.alt}
                title={slide.title}
                width={1920}
                height={1080}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                style={{ objectPosition: slide.position }}
              />
            ))}
          </div>
          {/* Deep Directional Gradient Overlay for Contrast */}
          <div className="home-hero-bg-overlay" />
        </div>

        {/* Foreground Content - Live Site Parity Option A */}
        <div className="home-hero-foreground">
          {/* Top Row: Greeting, Heading & Location Pill */}
          <div className="home-hero-top-row">
            <div className="home-hero-heading-group">
              {seasonalAnnouncement && (
                <div className="home-hero-announcement-pill" role="status" aria-label="Featured announcement">
                  <span className={`home-hero-pill-badge tone-${seasonalAnnouncement.tone}`}>
                    {seasonalAnnouncement.badge}
                  </span>
                  <a
                    href={seasonalAnnouncement.cta_url}
                    className="home-hero-pill-link"
                    onClick={e => onNavigate?.(e, seasonalAnnouncement.cta_url)}
                  >
                    <span>{seasonalAnnouncement.title}</span>
                    <SiteIcon name="arrow-up-right" size={12} />
                  </a>
                </div>
              )}
              <div className="home-hero-greeting-line">
                <span className="home-hero-live-dot" />
                <span className="home-hero-greeting-text">{greetingTime}</span>
                <span className="home-hero-motto">· Discover. Compete.</span>
                <span className="sr-only">Source-aware listings</span>
              </div>
              <h1 className="home-hero-main-title" aria-label="Sports Across India">
                <span className="home-hero-tiranga-saffron">Sports</span>{' '}
                <span className="home-hero-tiranga-white">Across</span>{' '}
                <span className="home-hero-tiranga-green">India</span>
              </h1>
            </div>

            <div className="home-hero-location-wrap">
              <button
                type="button"
                className="home-hero-location-btn"
                onClick={() => setCityDropdownOpen(prev => !prev)}
                aria-expanded={cityDropdownOpen}
                aria-label={`Current location: ${selectedCity}. Click to change.`}
              >
                <SiteIcon name="map-pin" size={14} />
                <span>{selectedCity}</span>
                <SiteIcon name="chevron-down" size={13} />
              </button>

              {cityDropdownOpen && (
                <div className="home-hero-city-dropdown" role="menu">
                  <button
                    type="button"
                    className={`home-hero-city-option${selectedCity === 'All India' ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedCity('All India')
                      setCityDropdownOpen(false)
                    }}
                  >
                    All India
                  </button>
                  <div className="home-hero-city-divider" />
                  {homeCities.map(city => (
                    <button
                      key={city.name}
                      type="button"
                      className={`home-hero-city-option${city.name === selectedCity ? ' is-active' : ''}`}
                      onClick={() => {
                        setSelectedCity(city.name)
                        setCityDropdownOpen(false)
                        handleLink({ preventDefault: () => {} } as React.MouseEvent<HTMLAnchorElement>, `/venues?city=${encodeURIComponent(city.name)}`)
                      }}
                    >
                      {city.name}
                    </button>
                  ))}
                  <div className="home-hero-city-divider" />
                  <a
                    href="/cities"
                    className="home-hero-city-all-link"
                    onClick={e => {
                      setCityDropdownOpen(false)
                      handleLink(e, '/cities')
                    }}
                  >
                    <span>View all {counts.cities?.status === 'ready' && counts.cities.data.length > 0 ? `${counts.cities.data.length}+` : '50+'} cities</span>
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Full-Width Search Pill with embedded Find button */}
          <div className="home-hero-search-wrapper">
            <form onSubmit={handleHeroSearchSubmit} className="home-hero-search-pill" role="search" aria-label="Hero search">
              <span className="home-hero-search-icon" aria-hidden="true">
                <SiteIcon name="search" size={18} />
              </span>
              <input
                type="search"
                className="home-hero-search-input"
                placeholder="Search cricket trials, football turf, badminton..."
                value={heroSearch}
                onChange={e => setHeroSearch(e.target.value)}
                aria-label="Search cricket trials, football turf, badminton"
              />
              <button
                type="submit"
                className="home-hero-find-btn"
                aria-label="Find search results"
              >
                Find
              </button>
            </form>
          </div>

          {/* Quick Explore Chips */}
          <div className="home-hero-quick-explore" aria-label="Quick Explore">
            <span className="home-hero-qe-label">
              <SiteIcon name="sparkles" size={13} />
              <span>Quick Explore:</span>
            </span>
            <div className="home-hero-qe-chips">
              {quickExploreChips.map(chip => (
                <a
                  key={chip.label}
                  href={chip.href}
                  onClick={e => handleLink(e, chip.href)}
                  className="home-hero-qe-chip"
                >
                  <span className="home-hero-qe-emoji" aria-hidden="true">{chip.emoji}</span>
                  <span>{chip.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* The 6 Action Discovery Cards Carousel */}
          <div className="home-hero-cards-section" aria-label="Sports Discovery Engines">
            <button
              type="button"
              className="home-hero-rail-arrow prev"
              onClick={() => scrollRail(heroCardsRailRef, 'left')}
              aria-label="Scroll discovery cards left"
            >
              <SiteIcon name="arrow-left" size={14} />
            </button>

            <div className="home-hero-cards-rail" ref={heroCardsRailRef}>
              {heroDiscoveryCards.map(card => (
                <a
                  key={card.title}
                  href={card.href}
                  onClick={e => handleLink(e, card.href)}
                  className="home-hero-action-card"
                >
                  {card.liveTag && (
                    <span className="home-hero-card-live-pill">
                      <span className="home-hero-live-dot" /> LIVE
                    </span>
                  )}
                  {card.tag && (
                    <span className="home-hero-card-tag-pill">{card.tag}</span>
                  )}
                  <div className={`home-hero-card-icon-badge ${card.bgClass}`} aria-hidden="true">
                    <SiteIcon name={card.icon} size={20} />
                  </div>
                  <div className="home-hero-card-info">
                    <strong className="home-hero-card-name">{card.title}</strong>
                    <span className="home-hero-card-desc">{card.subtitle}</span>
                  </div>
                </a>
              ))}
            </div>

            <button
              type="button"
              className="home-hero-rail-arrow next"
              onClick={() => scrollRail(heroCardsRailRef, 'right')}
              aria-label="Scroll discovery cards right"
            >
              <SiteIcon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
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
          ) : counts.opportunities.status !== 'ready' || displayOpportunities.length === 0 ? (
            <div className="home-rail-status-box">No published selection trials currently available.</div>
          ) : (
            displayOpportunities.map(opp => (
              <a
                key={opp.id}
                href={`/opportunities/${opp.slug}`}
                className={`home-rail-card${liveUpdatedIds.has(opp.id) ? ' is-live-updated' : ''}`}
              >
                <div>
                  <div className="home-trial-header">
                    <span className="home-trial-type-badge">{opp.opportunity_type}</span>
                    {liveUpdatedIds.has(opp.id) && (
                      <span className="home-media-badge-live-pulse">
                        ⚡ Live Updated
                      </span>
                    )}
                    {Boolean(opp.is_featured || opp.metadata?.featured || opp.metadata?.is_featured) && (
                      <span className="home-featured-star-pill">
                        <SiteIcon name="sparkles" size={11} />
                        Featured
                      </span>
                    )}
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

      {/* 3. KhelChronicle Flagship Research Preprints Showcase */}
      <HomeKhelChronicle onNavigate={onNavigate} />

      {/* 4. FEATURED TRAINING INSTITUTIONS / ACADEMIES */}
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

        {counts.academies?.status === 'ready' && displayAcademies.length > 0 ? (
          <div
            ref={academiesRailRef}
            className="home-touch-rail"
            tabIndex={0}
            aria-label="Featured training institutions list"
          >
            {displayAcademies.map(acad => (
              <div
                key={acad.id}
                className={`home-academy-card${liveUpdatedIds.has(acad.id) ? ' is-live-updated' : ''}`}
              >
                <div>
                  <div className="home-card-media">
                    <img
                      src={acad.svgBanner}
                      alt={`${acad.name} — Accredited ${acad.category} in ${acad.location}`}
                      title={`${acad.name} · ${acad.sports}`}
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={240}
                    />
                    <div className="home-card-overlay-top-left">
                      <span className="home-media-badge-dark">{acad.est}</span>
                      {liveUpdatedIds.has(acad.id) && (
                        <span className="home-media-badge-live-pulse">
                          ⚡ Live Updated
                        </span>
                      )}
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
                    <a href={acad.cardLink} style={{ color: 'inherit', textDecoration: 'none' }}>
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
        ) : (
          <div className="home-touch-rail home-rail-loading">
            <div className="home-loading-chip">
              {counts.academies?.status === 'ready'
                ? 'No published academies yet.'
                : 'Loading accredited institutions…'}
            </div>
          </div>
        )}
      </section>

      {/* 5. BOOK TURFS & COURTS */}
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
          ) : counts.venues.status !== 'ready' || displayVenues.length === 0 ? (
            <div className="home-rail-status-box">No published venues currently available.</div>
          ) : (
            displayVenues.map(v => (
              <a
                key={v.id}
                href={`/venues/${v.slug}`}
                className={`home-rail-card${liveUpdatedIds.has(v.id) ? ' is-live-updated' : ''}`}
              >
                <div>
                  <div className="home-card-media">
                    <img
                      src={createBannerSvg(v.name, v.city, '🏟️', 'emerald')}
                      alt={`${v.name} — Sports complex and turf facility in ${v.city}`}
                      title={`${v.name} (${v.city})`}
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={240}
                    />
                    <div className="home-card-overlay-top-left">
                      <span className="home-media-badge-dark">{v.city}</span>
                      {liveUpdatedIds.has(v.id) && (
                        <span className="home-media-badge-live-pulse">
                          ⚡ Live Updated
                        </span>
                      )}
                    </div>
                    <div className="home-card-overlay-top-right">
                      {v.is_featured && (
                        <span className="home-featured-star-pill" style={{ marginRight: 4 }}>
                          <SiteIcon name="sparkles" size={11} />
                          Featured
                        </span>
                      )}
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

      {/* 6. JOIN PICKUP GAMES */}
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
              <span>Explore Games ({displayPickupGames.length})</span>
              <SiteIcon name="chevron-right" size={13} />
            </a>
          </div>
        </div>

        <div ref={pickupRailRef} className="home-touch-rail" tabIndex={0} aria-label="Pickup sports games list">
          {displayPickupGames.map(g => (
            <a
              key={g.id}
              href="/play"
              onClick={e => {
                if ((e.target as HTMLElement).closest('.home-pickup-join-btn')) {
                  e.preventDefault()
                  return
                }
                onNavigate?.(e, '/play')
              }}
              className={`home-rail-card${liveUpdatedIds.has(g.id) ? ' is-live-updated' : ''}`}
            >
              <div>
                <div className="home-card-media">
                  <img
                    src={createBannerSvg(`${g.sport} Pickup`, `${g.venueName} · ${g.city}`, g.emoji, 'cyan')}
                    alt={`${g.sport} pickup match at ${g.venueName} in ${g.city}`}
                    title={`${g.sport} Pickup — ${g.venueName}, ${g.city}`}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={240}
                  />
                  <div className="home-card-overlay-top-left">
                    <span className="home-media-badge-dark">{g.sport}</span>
                    {liveUpdatedIds.has(g.id) && (
                      <span className="home-media-badge-live-pulse">
                        ⚡ Live Updated
                      </span>
                    )}
                    {g.is_featured && (
                      <span className="home-featured-star-pill">
                        <SiteIcon name="sparkles" size={11} />
                        Featured
                      </span>
                    )}
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
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="home-pickup-join-btn"
                    disabled={g.spotsOpen <= 0 || joiningGameId === g.id}
                    onClick={e => handleReserveSpot(e, g)}
                  >
                    {joiningGameId === g.id ? 'Reserving…' : g.spotsOpen <= 0 ? 'Full' : 'Reserve Spot'}
                  </button>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Flagship Digital Tools for Athletes & Scouts */}
      <section className="focus-section home-explore-section" aria-labelledby="home-tools-heading">
        <div className="section-heading">
          <p className="eyebrow">ATHLETE &amp; SCOUTING TOOLS</p>
          <h2 id="home-tools-heading">Powerful tools for your sporting journey.</h2>
          <p className="page-intro">Interactive digital platforms to benchmark performance, build verified athlete profiles, and access Indian sports science.</p>
        </div>
        <div className="focus-grid home-feature-grid">
          <a
            className="focus-card focus-link home-feature-card"
            href="/sports-cv"
            onClick={event => onNavigate?.(event, '/sports-cv')}
          >
            <span className="feature-icon" aria-hidden="true"><SiteIcon name="sports-cv" size={22} /></span>
            <span className="card-number">01 / ATHLETE CV</span>
            <h3>Sports CV Wizard</h3>
            <p>Build an accredited, shareable digital sports resume with verified physical stats, combine cutoffs, and match records for selectors.</p>
            <span className="card-action">Build your Sports CV <span aria-hidden="true">↗</span></span>
          </a>
          <a
            className="focus-card focus-link home-feature-card"
            href="/talent-scanner"
            onClick={event => onNavigate?.(event, '/talent-scanner')}
          >
            <span className="feature-icon" aria-hidden="true"><SiteIcon name="target" size={22} /></span>
            <span className="card-number">02 / BENCHMARK</span>
            <h3>Talent Scanner</h3>
            <p>Enter your 30m sprint, vertical jump, and Yo-Yo test distance to calculate your national percentile against 4,820 grassroots peers.</p>
            <span className="card-action">Calculate your percentile <span aria-hidden="true">↗</span></span>
          </a>
          <a
            className="focus-card focus-link home-feature-card"
            href="/khelchronicle"
            onClick={event => onNavigate?.(event, '/khelchronicle')}
          >
            <span className="feature-icon" aria-hidden="true"><SiteIcon name="award" size={22} /></span>
            <span className="card-number">03 / SPORTS SCIENCE</span>
            <h3>KhelChronicle Research</h3>
            <p>Access diamond open-access research preprints, 3D motion capture biomechanics, and injury prevention kinematics for Indian sports.</p>
            <span className="card-action">Explore research preprints <span aria-hidden="true">↗</span></span>
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
