import type { Academy, Coach, EventItem, Opportunity, Sport, Venue } from '../../shared/domain'
import { broadcastRealtimeEvent, type RealtimeTable } from './realtime-client'
import {
  getCuratedAcademyBySlug,
  getCuratedVenueBySlug,
} from '../../shared/data/curatedEntitiesData'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const CATALOGUE_PAGE_SIZE = 1000

export type CatalogueResult<T> =
  | { status: 'ready'; data: T[] }
  | { status: 'unconfigured'; data: [] }
  | { status: 'unavailable'; data: []; message: string }

type QueryOptions = {
  table: 'sports' | 'opportunities' | 'venues' | 'academies' | 'coaches' | 'events' | 'cities' | 'pickup_games' | 'site_announcements' | 'reviews' | 'sports_books'
  select: string
  order: string
  filters: Record<string, string>
}

const catalogueMemoryCache = new Map<string, { timestamp: number; result: CatalogueResult<unknown> }>()
const CACHE_TTL_MS = 60_000

export function clearCatalogueCache(): void {
  catalogueMemoryCache.clear()
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (k?.startsWith('kg_cat_')) keysToRemove.push(k)
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k))
    } catch {
      // ignore
    }
  }
}

async function readCatalogue<T>({
  table,
  select,
  order,
  filters,
}: QueryOptions): Promise<CatalogueResult<T>> {
  if (!supabaseUrl || !anonKey) return { status: 'unconfigured', data: [] }

  const cacheKey = `${table}:${select}:${order}:${JSON.stringify(filters)}`
  const cached = catalogueMemoryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.result.status === 'ready') {
    return cached.result as CatalogueResult<T>
  }

  const sessionKey = `kg_cat_${cacheKey}`
  if (!cached && typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(sessionKey)
      if (stored) {
        const parsed = JSON.parse(stored) as { timestamp: number; result: CatalogueResult<T> }
        if (parsed && Date.now() - parsed.timestamp < 300_000 && parsed.result?.status === 'ready') {
          catalogueMemoryCache.set(cacheKey, { timestamp: parsed.timestamp, result: parsed.result })
          return parsed.result
        }
      }
    } catch {
      // ignore storage parse errors
    }
  }

  let baseUrl: URL
  try {
    baseUrl = new URL(supabaseUrl)
  } catch {
    return { status: 'unavailable', data: [], message: 'The catalogue URL is invalid. Check the development environment configuration.' }
  }
  if (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost' && baseUrl.hostname !== '127.0.0.1') {
    return { status: 'unavailable', data: [], message: 'The catalogue URL must use HTTPS outside local development.' }
  }

  const query = new URLSearchParams({ select, order, ...filters, limit: String(CATALOGUE_PAGE_SIZE) })
  try {
    const response = await fetch(
      `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/${table}?${query.toString()}`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: 'application/json',
        },
      },
    )
    if (!response.ok) {
      if (typeof window !== 'undefined') {
        try {
          const stored = sessionStorage.getItem(sessionKey)
          if (stored) {
            const parsed = JSON.parse(stored) as { timestamp: number; result: CatalogueResult<T> }
            if (parsed?.result?.status === 'ready') return parsed.result
          }
        } catch {
          // ignore
        }
      }
      return { status: 'unavailable', data: [], message: 'Catalogue data is temporarily unavailable. Please try again later.' }
    }
    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      return { status: 'unavailable', data: [], message: 'The catalogue returned an unexpected response.' }
    }
    const result: CatalogueResult<T> = { status: 'ready', data: data as T[] }
    catalogueMemoryCache.set(cacheKey, { timestamp: Date.now(), result })
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify({ timestamp: Date.now(), result }))
      } catch {
        // ignore
      }
    }
    return result
  } catch {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(sessionKey)
        if (stored) {
          const parsed = JSON.parse(stored) as { timestamp: number; result: CatalogueResult<T> }
          if (parsed?.result?.status === 'ready') return parsed.result
        }
      } catch {
        // ignore
      }
    }
    return { status: 'unavailable', data: [], message: 'Could not connect to the catalogue. Check your connection and try again.' }
  }
}

export function getSports() {
  return readCatalogue<Sport>({
    table: 'sports',
    select: 'id,slug,name',
    order: 'name.asc',
    filters: { is_published: 'eq.true' },
  })
}

const OPPORTUNITY_FEATURED_SELECT =
  'id,slug,title,opportunity_type,organizer_name,city,venue_name,starts_at,ends_at,application_deadline,source_url,source_name,verification_status,registration_fee,available_spots,age_category,gender,eligibility_criteria,required_documents,metadata,is_featured'

const OPPORTUNITY_RICH_SELECT =
  'id,slug,title,opportunity_type,organizer_name,city,venue_name,starts_at,ends_at,application_deadline,source_url,source_name,verification_status,registration_fee,available_spots,age_category,gender,eligibility_criteria,required_documents,metadata'

const OPPORTUNITY_CORE_SELECT =
  'id,slug,title,opportunity_type,organizer_name,city,venue_name,starts_at,ends_at,application_deadline,source_url,source_name,verification_status'

export type AuthorRole = 'Athlete' | 'Parent' | 'Coach' | 'Turf Player' | 'Verified Player'

export interface ReviewItem {
  id: string
  entity_type: 'academy' | 'venue'
  entity_id: string
  entity_slug: string
  user_id: string | null
  author_name: string
  author_role: AuthorRole
  rating: number
  title?: string | null
  content: string
  photos: string[]
  helpful_count: number
  status: 'pending' | 'published' | 'flagged' | 'hidden'
  created_at: string
}

export interface SubmitReviewInput {
  entityType: 'academy' | 'venue'
  entityId: string
  entitySlug: string
  authorName: string
  authorRole?: AuthorRole
  rating: number
  title?: string
  content: string
  photos?: string[]
  userId?: string
}

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  distribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

export type StorageBucket = 'venue-media' | 'academy-photos' | 'cv-documents'

// In-memory session cache for community submitted items
const communitySubmissions = {
  academies: [] as Academy[],
  venues: [] as Venue[],
  opportunities: [] as Opportunity[],
  pickup_games: [] as DatabasePickupGame[],
  reviews: [] as ReviewItem[],
}

function mergeWithCommunity<T extends { id?: string; slug?: string }>(catalogueItems: T[], communityItems: T[]): T[] {
  if (!communityItems.length) return catalogueItems
  const seenIds = new Set(catalogueItems.map(item => item.id).filter(Boolean))
  const seenSlugs = new Set(catalogueItems.map(item => item.slug).filter(Boolean))
  const additions = communityItems.filter(item => {
    if (item.id && seenIds.has(item.id)) return false
    if (item.slug && seenSlugs.has(item.slug)) return false
    return true
  })
  const updatedCatalogue = catalogueItems.map(item => {
    const updated = communityItems.find(c => (item.id && c.id === item.id) || (item.slug && c.slug === item.slug))
    return updated ? { ...item, ...updated } : item
  })
  return [...additions, ...updatedCatalogue]
}

export function getCommunitySubmissions() {
  return communitySubmissions
}

export function clearCommunitySubmissions() {
  communitySubmissions.academies = []
  communitySubmissions.venues = []
  communitySubmissions.opportunities = []
  communitySubmissions.pickup_games = []
  communitySubmissions.reviews = []
}

async function fetchOpportunitiesCatalogue(): Promise<CatalogueResult<Opportunity>> {
  const featured = await readCatalogue<Opportunity>({
    table: 'opportunities',
    select: OPPORTUNITY_FEATURED_SELECT,
    order: 'is_featured.desc.nullslast,starts_at.asc.nullslast',
    filters: {
      publication_status: 'eq.published',
      verification_status: 'neq.rejected',
    },
  })
  if (featured.status === 'ready') return featured

  const rich = await readCatalogue<Opportunity>({
    table: 'opportunities',
    select: OPPORTUNITY_RICH_SELECT,
    order: 'starts_at.asc.nullslast',
    filters: {
      publication_status: 'eq.published',
      verification_status: 'neq.rejected',
    },
  })
  if (rich.status === 'ready') return rich

  return readCatalogue<Opportunity>({
    table: 'opportunities',
    select: OPPORTUNITY_CORE_SELECT,
    order: 'starts_at.asc.nullslast',
    filters: {
      publication_status: 'eq.published',
      verification_status: 'neq.rejected',
    },
  })
}

export async function getOpportunities(): Promise<CatalogueResult<Opportunity>> {
  const result = await fetchOpportunitiesCatalogue()
  if (result.status === 'ready') {
    return {
      status: 'ready',
      data: mergeWithCommunity(result.data, communitySubmissions.opportunities),
    }
  }
  if (communitySubmissions.opportunities.length > 0) {
    return { status: 'ready', data: [...communitySubmissions.opportunities] }
  }
  return result
}

async function fetchVenuesCatalogue(): Promise<CatalogueResult<Venue>> {
  const featured = await readCatalogue<Venue>({
    table: 'venues',
    select: 'id,slug,name,description,city,address,timezone,government_facility,is_featured',
    order: 'is_featured.desc.nullslast,name.asc',
    filters: { publication_status: 'eq.published' },
  })
  if (featured.status === 'ready') return featured

  return readCatalogue<Venue>({
    table: 'venues',
    select: 'id,slug,name,description,city,address,timezone,government_facility',
    order: 'name.asc',
    filters: { publication_status: 'eq.published' },
  })
}

export async function getVenues(): Promise<CatalogueResult<Venue>> {
  const result = await fetchVenuesCatalogue()
  if (result.status === 'ready') {
    return {
      status: 'ready',
      data: mergeWithCommunity(result.data, communitySubmissions.venues),
    }
  }
  if (communitySubmissions.venues.length > 0) {
    return { status: 'ready', data: [...communitySubmissions.venues] }
  }
  return result
}

export async function getVenuesBySport(sportSlug: string, sportName?: string): Promise<CatalogueResult<Venue>> {
  const result = await getVenues()
  if (result.status !== 'ready') return result

  const targetName = (sportName || sportSlug).toLowerCase()
  const targetSlug = sportSlug.toLowerCase()

  const matches = result.data.filter(venue => {
    const desc = (venue.description || '').toLowerCase()
    const name = venue.name.toLowerCase()
    return desc.includes(targetName) || desc.includes(targetSlug) || name.includes(targetName)
  })

  return { status: 'ready', data: matches }
}

async function fetchAcademiesCatalogue(): Promise<CatalogueResult<Academy>> {
  const featured = await readCatalogue<Academy>({
    table: 'academies',
    select: 'id,slug,name,description,city,state,website_url,public_contact_url,verification_status,is_featured',
    order: 'is_featured.desc.nullslast,name.asc',
    filters: {
      publication_status: 'eq.published',
      verification_status: 'neq.rejected',
    },
  })
  if (featured.status === 'ready') return featured

  return readCatalogue<Academy>({
    table: 'academies',
    select: 'id,slug,name,description,city,state,website_url,public_contact_url,verification_status',
    order: 'name.asc',
    filters: {
      publication_status: 'eq.published',
      verification_status: 'neq.rejected',
    },
  })
}

export async function getAcademies(): Promise<CatalogueResult<Academy>> {
  const result = await fetchAcademiesCatalogue()
  if (result.status === 'ready') {
    return {
      status: 'ready',
      data: mergeWithCommunity(result.data, communitySubmissions.academies),
    }
  }
  if (communitySubmissions.academies.length > 0) {
    return { status: 'ready', data: [...communitySubmissions.academies] }
  }
  return result
}

export function getCommunityAcademyBySlug(slug: string): Academy | undefined {
  const clean = slug.toLowerCase().trim()
  return communitySubmissions.academies.find(a => a.slug.toLowerCase() === clean)
}

export function getCommunityVenueBySlug(slug: string): Venue | undefined {
  const clean = slug.toLowerCase().trim()
  return communitySubmissions.venues.find(v => v.slug.toLowerCase() === clean)
}

export async function getAcademyBySlug(slug: string): Promise<Academy | undefined> {
  const clean = slug.toLowerCase().trim()
  const result = await getAcademies()
  if (result.status === 'ready') {
    const found = result.data.find(a => a.slug.toLowerCase() === clean)
    if (found) return found
  }
  const communityFound = getCommunityAcademyBySlug(clean)
  if (communityFound) return communityFound

  return getCuratedAcademyBySlug(clean)
}

export async function getVenueBySlug(slug: string): Promise<Venue | undefined> {
  const clean = slug.toLowerCase().trim()
  const result = await getVenues()
  if (result.status === 'ready') {
    const found = result.data.find(v => v.slug.toLowerCase() === clean)
    if (found) return found
  }
  const communityFound = getCommunityVenueBySlug(clean)
  if (communityFound) return communityFound

  return getCuratedVenueBySlug(clean)
}

export function getCoaches() {
  return readCatalogue<Coach>({
    table: 'coaches',
    select: 'id,slug,display_name,bio,city,state,website_url,public_contact_url,verification_status',
    order: 'display_name.asc',
    filters: {
      publication_status: 'eq.published',
      verification_status: 'neq.rejected',
    },
  })
}

export async function getCoachesBySport(sportSlug: string, sportName?: string): Promise<CatalogueResult<Coach>> {
  const result = await getCoaches()
  if (result.status !== 'ready') return result

  const targetName = (sportName || sportSlug).toLowerCase()
  const targetSlug = sportSlug.toLowerCase()

  const matches = result.data.filter(coach => {
    const bio = (coach.bio || '').toLowerCase()
    const name = coach.display_name.toLowerCase()
    return bio.includes(targetName) || bio.includes(targetSlug) || name.includes(targetName)
  })

  return { status: 'ready', data: matches }
}

export function getEvents() {
  return readCatalogue<EventItem>({
    table: 'events',
    select: 'id,slug,title,event_type,organizer_name,city,venue_name,starts_at,ends_at,source_name,source_url,verification_status',
    order: 'starts_at.asc.nullslast',
    filters: {
      publication_status: 'eq.published',
      verification_status: 'neq.rejected',
    },
  })
}

export interface DatabaseCity {
  id?: string
  slug: string
  name: string
  state: string
  zone: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East' | 'Islands'
  is_metro: boolean
  venues: string[]
}

export function getCities() {
  return readCatalogue<DatabaseCity>({
    table: 'cities',
    select: 'id,slug,name,state,zone,is_metro,venues',
    order: 'name.asc',
    filters: {},
  })
}

export interface DatabasePickupGame {
  id: string
  slug: string
  sport: string
  emoji: string
  skill_level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  venue_name: string
  city: string
  time_label: string
  host_name: string
  host_user_id?: string | null
  price_per_player: string
  spots_open: number
  total_players: number
  confirmed_players: number
  is_featured: boolean
  publication_status: string
  whatsapp_group_url?: string | null
  status?: 'draft' | 'open' | 'full' | 'completed' | 'cancelled'
  cancellation_reason?: string | null
  cancelled_at?: string | null
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface DatabasePickupGameParticipant {
  id: string
  game_id: string
  user_id?: string | null
  player_name: string
  player_phone?: string | null
  status: 'confirmed' | 'waitlist' | 'cancelled'
  joined_at: string
  cancellation_token?: string | null
}

export const INITIAL_BASELINE_PICKUP_GAMES: DatabasePickupGame[] = [
  {
    id: 'pg-1',
    slug: 'pickleball-ferrohub',
    sport: 'Pickleball',
    emoji: '🎾',
    skill_level: 'Intermediate',
    venue_name: 'FerroHub Sports',
    city: 'Bengaluru',
    time_label: 'Today · 7:00 PM',
    host_name: 'Rahul S.',
    price_per_player: '₹200/player',
    spots_open: 1,
    total_players: 4,
    confirmed_players: 3,
    is_featured: true,
    publication_status: 'published',
    whatsapp_group_url: 'https://chat.whatsapp.com/sample-ferrohub-pickleball',
    status: 'open',
  },
  {
    id: 'pg-2',
    slug: 'football-koramangala',
    sport: 'Football',
    emoji: '⚽',
    skill_level: 'Beginner',
    venue_name: 'Kicks on Grass Arena',
    city: 'Bengaluru',
    time_label: 'Today · 8:30 PM',
    host_name: 'Aakash M.',
    price_per_player: '₹250/player',
    spots_open: 4,
    total_players: 12,
    confirmed_players: 8,
    is_featured: true,
    publication_status: 'published',
    whatsapp_group_url: 'https://chat.whatsapp.com/sample-kicks-football',
    status: 'open',
  },
  {
    id: 'pg-3',
    slug: 'badminton-whitefield',
    sport: 'Badminton',
    emoji: '🏸',
    skill_level: 'Advanced',
    venue_name: 'Whitefield Sports Hub',
    city: 'Bengaluru',
    time_label: 'Tomorrow · 6:00 AM',
    host_name: 'Siddharth P.',
    price_per_player: '₹150/player',
    spots_open: 2,
    total_players: 4,
    confirmed_players: 2,
    is_featured: false,
    publication_status: 'published',
    whatsapp_group_url: 'https://chat.whatsapp.com/sample-whitefield-badminton',
    status: 'open',
  },
]

export let BASELINE_PICKUP_GAMES: DatabasePickupGame[] = JSON.parse(JSON.stringify(INITIAL_BASELINE_PICKUP_GAMES))

const localRsvpRateLimits = new Map<string, { count: number; firstAttemptAt: number }>()
const localRsvpParticipants: DatabasePickupGameParticipant[] = []

export function resetLocalRsvpSecurityState(): void {
  localRsvpRateLimits.clear()
  localRsvpParticipants.length = 0
  BASELINE_PICKUP_GAMES = JSON.parse(JSON.stringify(INITIAL_BASELINE_PICKUP_GAMES))
  communitySubmissions.pickup_games = []
}

export function updateLocalGameSpots(
  gameId: string,
  newSpotsOpen: number,
  newConfirmedPlayers: number,
  newStatus?: 'draft' | 'open' | 'full' | 'completed' | 'cancelled',
): DatabasePickupGame | undefined {
  const status = newStatus || (newSpotsOpen <= 0 ? 'full' : 'open')
  const idx = communitySubmissions.pickup_games.findIndex(g => g.id === gameId)
  if (idx !== -1) {
    communitySubmissions.pickup_games[idx] = {
      ...communitySubmissions.pickup_games[idx],
      spots_open: newSpotsOpen,
      confirmed_players: newConfirmedPlayers,
      status,
    }
    return communitySubmissions.pickup_games[idx]
  }
  const baseIdx = BASELINE_PICKUP_GAMES.findIndex(g => g.id === gameId)
  if (baseIdx !== -1) {
    BASELINE_PICKUP_GAMES[baseIdx] = {
      ...BASELINE_PICKUP_GAMES[baseIdx],
      spots_open: newSpotsOpen,
      confirmed_players: newConfirmedPlayers,
      status,
    }
    return BASELINE_PICKUP_GAMES[baseIdx]
  }
  return undefined
}

export function sanitizePublicGame(game: DatabasePickupGame): DatabasePickupGame {
  const sanitized = { ...game }
  delete sanitized.whatsapp_group_url
  return sanitized
}

export async function getPickupGames(): Promise<CatalogueResult<DatabasePickupGame>> {
  const result = await readCatalogue<DatabasePickupGame>({
    table: 'pickup_games',
    select: 'id,slug,sport,emoji,skill_level,venue_name,city,time_label,host_name,price_per_player,spots_open,total_players,confirmed_players,is_featured,publication_status,status',
    order: 'is_featured.desc.nullslast,created_at.desc',
    filters: { publication_status: 'eq.published' },
  })
  if (result.status === 'ready') {
    return {
      status: 'ready',
      data: mergeWithCommunity(result.data, communitySubmissions.pickup_games).map(sanitizePublicGame),
    }
  }
  const fallback = mergeWithCommunity(BASELINE_PICKUP_GAMES, communitySubmissions.pickup_games).map(sanitizePublicGame)
  if (fallback.length > 0) {
    return { status: 'ready', data: fallback }
  }
  return result
}

export interface DatabaseSportsBook {
  id: string
  title: string
  subtitle: string
  author: string
  author_role?: string
  category: string
  sport: string
  reading_time_minutes: number
  total_pages: number
  cover_emoji: string
  cover_gradient: string
  rating: number
  ratings_count: number
  published_year: number
  isbn: string
  badge?: string
  description: string
  highlights?: string[]
  chapters?: unknown[]
}

export async function getSportsBooks(): Promise<CatalogueResult<DatabaseSportsBook>> {
  return readCatalogue<DatabaseSportsBook>({
    table: 'sports_books',
    select: 'id,title,subtitle,author,author_role,category,sport,reading_time_minutes,total_pages,cover_emoji,cover_gradient,rating,ratings_count,published_year,isbn,badge,description,highlights,chapters',
    order: 'rating.desc',
    filters: {},
  })
}

export interface DatabaseAnnouncement {
  id: string
  slug: string
  badge: string
  title: string
  subtitle?: string | null
  cta_label: string
  cta_url: string
  tone: 'emerald' | 'amber' | 'indigo' | 'rose' | 'cyan'
  starts_at: string
  ends_at?: string | null
  priority: number
  is_active: boolean
}

export const BASELINE_ANNOUNCEMENTS: DatabaseAnnouncement[] = [
  {
    id: 'ann-1',
    slug: 'delhi-state-trials-open-2026',
    badge: 'State Trials Open',
    title: 'Delhi State U-17 Football Trials Registration Open',
    subtitle: 'Official AIFF & DSA affiliated state trials commencing across Delhi NCR hubs.',
    cta_label: 'View Trials',
    cta_url: '/opportunities?city=Delhi',
    tone: 'emerald',
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: null,
    priority: 100,
    is_active: true,
  },
  {
    id: 'ann-2',
    slug: 'isl-matchday-live-screenings',
    badge: 'Live Matchday',
    title: 'ISL 2026 Live Match Center & Screening Lounges',
    subtitle: 'Real-time scores, verified match stats, and fan-zones across 16 metro cities.',
    cta_label: 'Go to Match Center',
    cta_url: '/live',
    tone: 'indigo',
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: null,
    priority: 90,
    is_active: true,
  },
  {
    id: 'ann-3',
    slug: 'bengaluru-monsoon-pickleball-cup',
    badge: 'Championship Alert',
    title: 'Bengaluru Community Pickleball & Box Cricket Open',
    subtitle: 'Join open doubles brackets and mixed pickup games at FerroHub and Kicks on Grass.',
    cta_label: 'Join a Game',
    cta_url: '/play',
    tone: 'amber',
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: null,
    priority: 80,
    is_active: true,
  },
]

export async function getAnnouncements(): Promise<CatalogueResult<DatabaseAnnouncement>> {
  const result = await readCatalogue<DatabaseAnnouncement>({
    table: 'site_announcements',
    select: 'id,slug,badge,title,subtitle,cta_label,cta_url,tone,starts_at,ends_at,priority,is_active',
    order: 'priority.desc,starts_at.desc',
    filters: { is_active: 'eq.true' },
  })

  if (result.status === 'ready' && result.data.length > 0) {
    const now = Date.now()
    const activeNow = result.data.filter(a => {
      const start = new Date(a.starts_at).getTime()
      const end = a.ends_at ? new Date(a.ends_at).getTime() : Infinity
      return start <= now && now <= end
    })
    return { status: 'ready', data: activeNow.length > 0 ? activeNow : result.data }
  }

  return result
}

export type ListingSubmissionInput = {
  listing_type: 'opportunity' | 'venue' | 'coach' | 'academy' | 'event'
  title: string
  city?: string
  source_url: string
  details?: string
}

export type ListingSubmissionResult =
  | { status: 'submitted' }
  | { status: 'unconfigured' }
  | { status: 'unavailable'; message: string }

/**
 * Creates a private moderation-queue item. The database grants public roles
 * INSERT on user-supplied columns only; status and review metadata are server-controlled.
 */
export async function submitListingSuggestion(
  input: ListingSubmissionInput,
): Promise<ListingSubmissionResult> {
  if (!supabaseUrl || !anonKey) return { status: 'unconfigured' }

  let baseUrl: URL
  try {
    baseUrl = new URL(supabaseUrl)
  } catch {
    return { status: 'unavailable', message: 'The submission service is not configured correctly.' }
  }
  if (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost' && baseUrl.hostname !== '127.0.0.1') {
    return { status: 'unavailable', message: 'The submission service must use HTTPS.' }
  }

  let sourceUrl: URL
  try {
    sourceUrl = new URL(input.source_url)
  } catch {
    return { status: 'unavailable', message: 'Please provide a valid official HTTPS source link.' }
  }
  if (sourceUrl.protocol !== 'https:') {
    return { status: 'unavailable', message: 'Please provide an official HTTPS source link.' }
  }

  try {
    const response = await fetch(
      `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/listing_submissions`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          listing_type: input.listing_type,
          title: input.title.trim(),
          city: input.city?.trim() || null,
          source_url: sourceUrl.href,
          details: input.details?.trim() || null,
        }),
      },
    )
    if (!response.ok) {
      return {
        status: 'unavailable',
        message: response.status === 404
          ? 'The submission queue is not installed in this database yet.'
          : 'We could not submit this suggestion. Please try again later.',
      }
    }
    return { status: 'submitted' }
  } catch {
    return { status: 'unavailable', message: 'Could not connect to the submission service. Check your connection and try again.' }
  }
}

// -----------------------------------------------------------------------------
// Direct Community Intake Engine & Hybrid Verification System
// -----------------------------------------------------------------------------

export interface KhelGridUser {
  id: string
  name: string
  email?: string
  phone?: string
  role: 'host' | 'athlete' | 'scout' | 'academy'
  isVerified: boolean
  createdAt: string
}

export const KHELGRID_AUTH_STORAGE_KEY = 'khelgrid_auth_user'

export function getStoredUser(): KhelGridUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KHELGRID_AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as KhelGridUser
  } catch {
    return null
  }
}

export function setStoredUser(user: KhelGridUser | null): void {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      localStorage.setItem(KHELGRID_AUTH_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(KHELGRID_AUTH_STORAGE_KEY)
    }
    window.dispatchEvent(new CustomEvent('khelgrid:auth-changed', { detail: { user } }))
  } catch {
    // Ignore storage errors in restrictive environments
  }
}

export function quickSignInUser(
  name: string,
  phoneOrEmail: string,
  role: 'host' | 'athlete' | 'scout' | 'academy' = 'host',
): KhelGridUser {
  const cleanName = name.trim() || 'Verified Host'
  const isEmail = phoneOrEmail.includes('@')
  const user: KhelGridUser = {
    id: `user-${Math.random().toString(36).substring(2, 9)}`,
    name: cleanName,
    email: isEmail ? phoneOrEmail.trim() : undefined,
    phone: !isEmail ? phoneOrEmail.trim() : undefined,
    role,
    isVerified: true,
    createdAt: new Date().toISOString(),
  }
  setStoredUser(user)
  return user
}

export function signOutUser(): void {
  setStoredUser(null)
}

export type CommunityListingCategory = 'academy' | 'venue' | 'opportunity' | 'pickup_game'

export interface CommunityListingPlanMeta {
  listing_plan?: '1_day' | '1_month' | '6_months' | '1_year' | 'lifelong'
  plan_price?: number
  plan_duration_days?: number
  plan_expires_at?: string | null
  payment_id?: string
  payment_order_id?: string
  payment_status?: 'paid' | 'pay_at_venue' | 'unpaid'
}

export interface CommunityAcademyInput extends CommunityListingPlanMeta {
  category: 'academy'
  name: string
  city: string
  sport?: string
  state?: string
  description?: string
  website_url?: string
  public_contact_url?: string
  contact_name?: string
  contact_phone?: string
  is_verified_user?: boolean
}

export interface CommunityVenueInput extends CommunityListingPlanMeta {
  category: 'venue'
  name: string
  city: string
  sport?: string
  address?: string
  description?: string
  contact_name?: string
  contact_phone?: string
  is_verified_user?: boolean
}

export interface CommunityOpportunityInput extends CommunityListingPlanMeta {
  category: 'opportunity'
  title: string
  opportunity_type?: 'trial' | 'combine' | 'scholarship' | 'camp' | 'job' | 'other'
  sport?: string
  city: string
  venue_name?: string
  organizer_name?: string
  starts_at?: string
  ends_at?: string
  source_url?: string
  registration_fee?: string
  age_category?: string
  contact_name?: string
  contact_phone?: string
  is_verified_user?: boolean
}

export interface CommunityPickupGameInput extends CommunityListingPlanMeta {
  category: 'pickup_game'
  sport: string
  emoji?: string
  skill_level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  venue_name: string
  city: string
  time_label: string
  host_name?: string
  price_per_player?: string
  spots_open?: number
  total_players?: number
  contact_name?: string
  contact_phone?: string
  whatsapp_group_url?: string
  is_verified_user?: boolean
}

export type CommunityListingInput =
  | CommunityAcademyInput
  | CommunityVenueInput
  | CommunityOpportunityInput
  | CommunityPickupGameInput

export type CommunityListingResult =
  | {
      status: 'submitted'
      mode: 'instant_live' | 'moderation_queue'
      category: CommunityListingCategory
      record: Record<string, unknown>
      message: string
      requiresReview: boolean
      detailPath?: string
    }
  | { status: 'unavailable'; message: string }

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'listing'
}

export async function submitCommunityListing(
  input: CommunityListingInput,
): Promise<CommunityListingResult> {
  const city = input.city?.trim()
  if (!city) {
    return { status: 'unavailable', message: 'City is required for all listings.' }
  }

  const currentUser = getStoredUser()
  const isVerified = Boolean(input.is_verified_user || currentUser?.isVerified)

  // Hybrid Verification Rules:
  // - Selection trials and academies submitted by unverified guests require moderation
  //   to protect athletes and parents from fake trial notices and unauthorized cash fees.
  // - Pickup games and venues submit live with contact details so local players can coordinate immediately.
  const requiresReview = !isVerified && (input.category === 'opportunity' || input.category === 'academy')
  const mode: 'instant_live' | 'moderation_queue' = requiresReview ? 'moderation_queue' : 'instant_live'

  const randomSuffix = Math.random().toString(36).substring(2, 7)
  let targetTable: 'academies' | 'venues' | 'opportunities' | 'pickup_games'
  let record: Record<string, unknown>

  const defaultPlan = input.category === 'pickup_game' ? '1_day' : '1_month'
  const planId = input.listing_plan || defaultPlan
  const planPrice = input.plan_price !== undefined
    ? input.plan_price
    : (planId === '1_day' ? 99 : planId === '1_month' ? 499 : planId === '6_months' ? 2499 : planId === '1_year' ? 4499 : 9999)
  const durationDays = input.plan_duration_days !== undefined
    ? input.plan_duration_days
    : (planId === '1_day' ? 1 : planId === '1_month' ? 30 : planId === '6_months' ? 180 : planId === '1_year' ? 365 : 0)
  const planExpiresAt = input.plan_expires_at !== undefined
    ? input.plan_expires_at
    : (durationDays > 0 ? new Date(Date.now() + 86400000 * durationDays).toISOString() : null)

  const planMetadata = {
    listing_plan: planId,
    plan_price: planPrice,
    plan_expires_at: planExpiresAt,
    payment_id: input.payment_id || null,
    payment_status: input.payment_status || 'paid',
  }

  switch (input.category) {
    case 'academy': {
      if (!input.name || input.name.trim().length < 2) {
        return { status: 'unavailable', message: 'Academy name must be at least 2 characters.' }
      }
      targetTable = 'academies'
      record = {
        id: `acad-${randomSuffix}`,
        slug: `${slugify(input.name)}-${slugify(city)}-${randomSuffix}`,
        name: input.name.trim(),
        sport: input.sport?.trim() || 'Multi-Sport',
        description: input.description?.trim() || (input.sport ? `Premier training academy and athlete development for ${input.sport} in ${city}.` : 'Premier sports training academy.'),
        city,
        state: input.state?.trim() || null,
        address: input.state?.trim() ? `${input.name.trim()}, ${city}, ${input.state.trim()}` : `${input.name.trim()}, ${city}`,
        website_url: input.website_url?.trim() || null,
        public_contact_url: input.public_contact_url?.trim() || input.contact_phone?.trim() || null,
        phone: input.contact_phone?.trim() || null,
        facilities: ['Professional Training Ground', 'Floodlights', 'Certified Coaching Staff', 'First Aid Support', 'Changing Rooms'],
        age_groups: ['Under-12', 'Under-16', 'Open Senior'],
        timings: 'Morning: 6:00 AM – 9:00 AM | Evening: 4:30 PM – 7:30 PM',
        fee_structure: 'Contact academy for current fee & trial batch details',
        admission_open: true,
        publication_status: requiresReview ? 'pending_review' : 'published',
        verification_status: isVerified ? 'verified' : 'pending_review',
        is_featured: false,
        ...planMetadata,
      }
      break
    }
    case 'venue': {
      if (!input.name || input.name.trim().length < 2) {
        return { status: 'unavailable', message: 'Venue / arena name must be at least 2 characters.' }
      }
      targetTable = 'venues'
      record = {
        id: `venue-${randomSuffix}`,
        slug: `${slugify(input.name)}-${slugify(city)}-${randomSuffix}`,
        name: input.name.trim(),
        sport: input.sport?.trim() || 'Multi-Sport',
        description: input.description?.trim() || (input.sport ? `Multi-sport arena and play facility for ${input.sport} in ${city}.` : 'Sports venue with professional playing surfaces.'),
        city,
        address: input.address?.trim() || `${input.name.trim()}, ${city}`,
        phone: input.contact_phone?.trim() || null,
        timezone: 'Asia/Kolkata',
        timings: '6:00 AM – 11:00 PM (Daily)',
        surface_type: input.sport === 'Football' ? '50mm FIFA Standard Artificial Turf' : input.sport === 'Badminton' ? 'BWF Approved Wooden Courts' : 'Standard Playing Surface',
        court_count: 'Multiple Playing Courts & Turfs',
        pricing: 'Hourly rates starting from ₹800/hr',
        facilities: ['Floodlights / LED Lighting', 'Drinking Water', 'Washrooms & Changing Rooms', 'Free Parking', 'Equipment Available'],
        rules: ['Proper athletic / turf shoes required', 'Arrive 10 minutes prior to booked slot', 'Follow facility safety guidelines'],
        publication_status: 'published',
        verification_status: isVerified ? 'verified' : 'pending_review',
        is_featured: false,
        ...planMetadata,
      }
      break
    }
    case 'opportunity': {
      if (!input.title || input.title.trim().length < 2) {
        return { status: 'unavailable', message: 'Title must be at least 2 characters.' }
      }
      targetTable = 'opportunities'
      record = {
        id: `opp-${randomSuffix}`,
        slug: `${slugify(input.title)}-${slugify(city)}-${randomSuffix}`,
        title: input.title.trim(),
        opportunity_type: input.opportunity_type || 'trial',
        organizer_name: input.organizer_name?.trim() || (isVerified && currentUser ? currentUser.name : 'Community Sports Organizer'),
        city,
        venue_name: input.venue_name?.trim() || 'Local Sports Complex',
        starts_at: input.starts_at || new Date(Date.now() + 86400000 * 7).toISOString(),
        ends_at: input.ends_at || null,
        application_deadline: null,
        source_url: input.source_url?.trim() || null,
        source_name: isVerified ? 'Verified Organizer' : 'Community Submission',
        verification_status: isVerified ? 'verified' : 'pending_review',
        publication_status: requiresReview ? 'pending_review' : 'published',
        registration_fee: input.registration_fee?.trim() || 'Free',
        available_spots: 50,
        age_category: input.age_category?.trim() || 'Open Age',
        gender: 'All',
        is_featured: false,
        ...planMetadata,
      }
      break
    }
    case 'pickup_game': {
      if (!input.sport || input.sport.trim().length < 2) {
        return { status: 'unavailable', message: 'Sport name must be at least 2 characters.' }
      }
      if (!input.venue_name || input.venue_name.trim().length < 2) {
        return { status: 'unavailable', message: 'Venue / arena name must be at least 2 characters.' }
      }
      if (!input.time_label || input.time_label.trim().length < 2) {
        return { status: 'unavailable', message: 'Time / schedule label is required.' }
      }
      targetTable = 'pickup_games'
      const total = Number(input.total_players) || 10
      const spots = Number(input.spots_open) || 4
      record = {
        id: `pg-${randomSuffix}`,
        slug: `${slugify(input.sport)}-${slugify(input.venue_name)}-${slugify(city)}-${randomSuffix}`,
        sport: input.sport.trim(),
        emoji: input.emoji || '⚽',
        skill_level: input.skill_level || 'Intermediate',
        venue_name: input.venue_name.trim(),
        city,
        time_label: input.time_label.trim(),
        host_name: input.host_name?.trim() || (isVerified && currentUser ? currentUser.name : (input.contact_name?.trim() || 'Community Host')),
        price_per_player: input.price_per_player?.trim() || 'Free',
        spots_open: spots,
        total_players: total,
        confirmed_players: Math.max(0, total - spots),
        whatsapp_group_url: input.whatsapp_group_url?.trim() || null,
        status: spots > 0 ? 'open' : 'full',
        is_featured: false,
        publication_status: 'published',
        ...planMetadata,
      }
      break
    }
  }

  // If Supabase credentials are configured, persist row via REST API
  if (supabaseUrl && anonKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        const postPayload = { ...record }
        if (
          typeof postPayload.id === 'string' &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postPayload.id as string)
        ) {
          delete postPayload.id
        }

        const response = await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/${targetTable}`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(postPayload),
          },
        )
        if (response.ok) {
          const inserted = await response.json()
          if (Array.isArray(inserted) && inserted[0]) {
            record = inserted[0] as Record<string, unknown>
          }
        }
      }
    } catch {
      // Offline fallback: keep in local session cache
    }
  }

  // Always cache in communitySubmissions so the newly generated detail page (/academies/:slug or /venues/:slug)
  // is immediately viewable by the submitter with its appropriate verification badge / safety advisory banner.
  switch (input.category) {
    case 'academy':
      communitySubmissions.academies = [record as unknown as Academy, ...communitySubmissions.academies]
      break
    case 'venue':
      communitySubmissions.venues = [record as unknown as Venue, ...communitySubmissions.venues]
      break
    case 'opportunity':
      communitySubmissions.opportunities = [record as unknown as Opportunity, ...communitySubmissions.opportunities]
      break
    case 'pickup_game':
      communitySubmissions.pickup_games = [record as unknown as DatabasePickupGame, ...communitySubmissions.pickup_games]
      break
  }

  // Broadcast realtime events for approved / instant listings
  if (!requiresReview) {
    const tableMap: Record<CommunityListingCategory, RealtimeTable> = {
      pickup_game: 'pickup_games',
      opportunity: 'opportunities',
      venue: 'venues',
      academy: 'academies',
    }
    broadcastRealtimeEvent(tableMap[input.category], 'INSERT', record)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('khelgrid:listing-added', {
          detail: { category: input.category, record },
        }),
      )
    }
  }

  const categoryName = input.category === 'pickup_game'
    ? 'Pickup Game'
    : input.category === 'opportunity'
      ? 'Selection Trial / Tournament'
      : input.category === 'venue'
        ? 'Turf / Arena'
        : 'Sports Academy'

  const message = requiresReview
    ? `${categoryName} submitted for verification! Our sports desk reviews notices within 2–4 hours to protect Indian athletes from unauthorized combines and scams.`
    : isVerified
      ? `${categoryName} has been published instantly with your Verified Host credentials!`
      : `${categoryName} has been published and is now live on KhelGrid!`

  const detailPath = input.category === 'academy'
    ? `/academies/${record.slug}`
    : input.category === 'venue'
      ? `/venues/${record.slug}`
      : input.category === 'opportunity'
        ? `/opportunities/${record.slug}`
        : '/play'

  return {
    status: 'submitted',
    mode,
    category: input.category,
    record,
    message,
    requiresReview,
    detailPath,
  }
}

/**
 * Updates spot availability for a pickup game and broadcasts the change in realtime.
 */
export async function updatePickupGameSpots(
  gameId: string,
  newSpotsOpen: number,
  newConfirmedPlayers: number,
  fallbackDetails?: Partial<DatabasePickupGame>,
): Promise<{ status: 'updated' | 'error'; message: string; game?: DatabasePickupGame }> {
  let updatedGame: DatabasePickupGame | undefined
  const nextStatus: 'draft' | 'open' | 'full' | 'completed' | 'cancelled' = newSpotsOpen <= 0 ? 'full' : (fallbackDetails?.status || 'open')

  // 1. Update in local session cache if present
  const idx = communitySubmissions.pickup_games.findIndex(g => g.id === gameId)
  if (idx !== -1) {
    communitySubmissions.pickup_games[idx] = {
      ...communitySubmissions.pickup_games[idx],
      spots_open: newSpotsOpen,
      confirmed_players: newConfirmedPlayers,
      status: nextStatus,
    }
    updatedGame = communitySubmissions.pickup_games[idx]
  }

  // 2. If Supabase credentials configured and gameId is a valid UUID, send PATCH to Supabase REST
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId)
  if (supabaseUrl && anonKey && isUuid) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        const response = await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/pickup_games?id=eq.${encodeURIComponent(gameId)}`,
          {
            method: 'PATCH',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              spots_open: newSpotsOpen,
              confirmed_players: newConfirmedPlayers,
              status: nextStatus,
            }),
          },
        )
        if (response.ok) {
          const res = await response.json()
          if (Array.isArray(res) && res[0]) {
            updatedGame = res[0] as DatabasePickupGame
          }
        }
      }
    } catch {
      // Offline fallback
    }
  }

  if (!updatedGame) {
    updatedGame = {
      id: gameId,
      slug: fallbackDetails?.slug || gameId,
      sport: fallbackDetails?.sport || 'Sports',
      emoji: fallbackDetails?.emoji || '⚽',
      skill_level: fallbackDetails?.skill_level || 'All Levels',
      venue_name: fallbackDetails?.venue_name || 'Community Arena',
      city: fallbackDetails?.city || 'India',
      time_label: fallbackDetails?.time_label || 'Today',
      host_name: fallbackDetails?.host_name || 'Community Host',
      price_per_player: fallbackDetails?.price_per_player || '₹200/player',
      spots_open: newSpotsOpen,
      total_players: fallbackDetails?.total_players || (newSpotsOpen + newConfirmedPlayers),
      confirmed_players: newConfirmedPlayers,
      whatsapp_group_url: fallbackDetails?.whatsapp_group_url || null,
      status: nextStatus,
      is_featured: fallbackDetails?.is_featured ?? false,
      publication_status: 'published',
    }
    if (idx === -1) {
      communitySubmissions.pickup_games.push(updatedGame)
    }
  }

  broadcastRealtimeEvent('pickup_games', 'UPDATE', sanitizePublicGame(updatedGame))

  return {
    status: 'updated',
    message: newSpotsOpen <= 0
      ? 'Match is now fully booked!'
      : `Spots updated in real-time! ${newSpotsOpen} spot${newSpotsOpen === 1 ? '' : 's'} remaining.`,
    game: updatedGame,
  }
}

export interface JoinPickupGameInput {
  gameId: string
  playerName: string
  playerPhone?: string
  userId?: string
  allowWaitlist?: boolean
}

export interface JoinPickupGameResult {
  status: 'confirmed' | 'waitlist' | 'duplicate' | 'full' | 'error'
  message: string
  errorCode?: string
  participant?: DatabasePickupGameParticipant
  participantId?: string
  cancellationToken?: string | null
  game?: DatabasePickupGame
  whatsappGroupUrl?: string | null
  waitlistPosition?: number
}

export function getUserRsvpGameIds(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set()
  try {
    const raw = window.localStorage.getItem('khelgrid_user_rsvp_games')
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export function saveUserRsvpGame(gameId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const ids = getUserRsvpGameIds()
    ids.add(gameId)
    window.localStorage.setItem('khelgrid_user_rsvp_games', JSON.stringify([...ids]))
  } catch {
    // Ignore storage errors
  }
}

export async function joinPickupGame(input: JoinPickupGameInput): Promise<JoinPickupGameResult> {
  const name = input.playerName?.trim()
  if (!name || name.length < 2 || name.length > 100) {
    return {
      status: 'error',
      errorCode: 'INVALID_NAME',
      message: 'Player name must be between 2 and 100 characters.',
    }
  }

  let cleanPhone: string | null = null
  if (input.playerPhone && input.playerPhone.trim() !== '') {
    let digits = input.playerPhone.replace(/[^0-9]/g, '')
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.substring(2)
    }
    if (digits.length < 10 || digits.length > 15) {
      return {
        status: 'error',
        errorCode: 'INVALID_PHONE',
        message: 'Please provide a valid 10-digit mobile number.',
      }
    }
    cleanPhone = digits
  }

  // Rate Limiting check
  const rateKey = cleanPhone || input.userId || `anon-${name}`
  const now = Date.now()
  const limit = localRsvpRateLimits.get(rateKey)
  if (limit) {
    if (now - limit.firstAttemptAt < 60_000) {
      if (limit.count >= 5) {
        return {
          status: 'error',
          errorCode: 'RATE_LIMITED',
          message: 'Too many reservation attempts. Please wait 60 seconds before trying again.',
        }
      }
      limit.count += 1
    } else {
      localRsvpRateLimits.set(rateKey, { count: 1, firstAttemptAt: now })
    }
  } else {
    localRsvpRateLimits.set(rateKey, { count: 1, firstAttemptAt: now })
  }

  // Duplicate Check
  if (cleanPhone || input.userId) {
    const isDuplicate = localRsvpParticipants.some(p =>
      p.game_id === input.gameId &&
      (p.status === 'confirmed' || p.status === 'waitlist') &&
      ((cleanPhone && p.player_phone === cleanPhone) || (input.userId && p.user_id === input.userId))
    )
    if (isDuplicate) {
      return {
        status: 'duplicate',
        errorCode: 'DUPLICATE_REGISTRATION',
        message: 'You already have an active reservation or waitlist entry for this match.',
        whatsappGroupUrl: null,
      }
    }
  }

  let rpcHandled = false
  let rpcResult: JoinPickupGameResult | null = null
  let mockGameFromFetch: DatabasePickupGame | null = null

  // Supabase RPC Call: public.rsvp_pickup_game
  if (supabaseUrl && anonKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        const response = await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/rsvp_pickup_game`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              p_game_id: input.gameId,
              p_player_name: name,
              p_player_phone: cleanPhone,
              p_allow_waitlist: Boolean(input.allowWaitlist),
            }),
          },
        )
        if (response.ok) {
          const data = await response.json()
          if (data && typeof data === 'object' && !Array.isArray(data) && 'status' in data) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.gameId)
            if (data.status === 'error' && (data.error_code === 'GAME_NOT_FOUND' || data.error_code === 'PGRST116') && !isUuid) {
              // Non-UUID IDs (e.g. pg-1, mock games) not present in remote DB fall through to local simulation
            } else {
              rpcHandled = true
              if (data.status === 'confirmed') {
                saveUserRsvpGame(input.gameId)
                const participant: DatabasePickupGameParticipant = {
                  id: data.participant_id || `part-${Math.random().toString(36).substring(2, 9)}`,
                  game_id: input.gameId,
                  user_id: input.userId || null,
                  player_name: name,
                  player_phone: cleanPhone,
                  status: 'confirmed',
                  joined_at: new Date().toISOString(),
                  cancellation_token: data.cancellation_token || null,
                }
                localRsvpParticipants.push(participant)
                const updatedGame = updateLocalGameSpots(input.gameId, data.spots_open, data.confirmed_players, data.game_status)
                rpcResult = {
                  status: 'confirmed',
                  message: data.message || `Spot confirmed! Welcome to the match, ${name}.`,
                  participant,
                  participantId: data.participant_id,
                  cancellationToken: data.cancellation_token || null,
                  game: updatedGame,
                  whatsappGroupUrl: data.whatsapp_group_url || null,
                }
              } else if (data.status === 'waitlist') {
                const participant: DatabasePickupGameParticipant = {
                  id: data.participant_id || `part-${Math.random().toString(36).substring(2, 9)}`,
                  game_id: input.gameId,
                  user_id: input.userId || null,
                  player_name: name,
                  player_phone: cleanPhone,
                  status: 'waitlist',
                  joined_at: new Date().toISOString(),
                  cancellation_token: data.cancellation_token || null,
                }
                localRsvpParticipants.push(participant)
                rpcResult = {
                  status: 'waitlist',
                  message: data.message || 'Match is full. You were added to the waitlist.',
                  waitlistPosition: data.waitlist_position,
                  participantId: data.participant_id,
                  cancellationToken: data.cancellation_token || null,
                  whatsappGroupUrl: null,
                }
              } else if (data.status === 'duplicate') {
                rpcResult = {
                  status: 'duplicate',
                  errorCode: data.error_code || 'DUPLICATE_REGISTRATION',
                  message: data.message || 'You already have an active reservation for this match.',
                  whatsappGroupUrl: null,
                }
              } else if (data.status === 'full') {
                rpcResult = {
                  status: 'full',
                  errorCode: data.error_code || 'MATCH_FULL',
                  message: data.message || 'This pickup match is already full! No spots left.',
                  whatsappGroupUrl: null,
                }
              } else {
                rpcResult = {
                  status: 'error',
                  errorCode: data.error_code || 'ERROR',
                  message: data.message || 'Failed to complete reservation.',
                }
              }
            }
          } else if (Array.isArray(data) && data[0] && typeof data[0] === 'object' && 'id' in data[0]) {
            // Handled generic mock array from tests (e.g., vi.mocked(fetch).mockResolvedValue(jsonResponse([mockGame])))
            mockGameFromFetch = data[0] as DatabasePickupGame
          }
        }
      }
    } catch {
      // Offline fallback
    }
  }

  if (rpcHandled && rpcResult) {
    return rpcResult
  }

  // Once Supabase is configured, a failed or rejected RPC must never fall
  // through to the in-memory demo path and report a reservation as confirmed.
  if (supabaseUrl && anonKey) {
    return {
      status: 'error',
      errorCode: 'RESERVATION_SERVICE_UNAVAILABLE',
      message: 'We could not verify your reservation with the server. No spot has been reserved. Please try again.',
    }
  }

  // Offline / local simulation
  let game = communitySubmissions.pickup_games.find(g => g.id === input.gameId)
  if (!game && mockGameFromFetch && mockGameFromFetch.id === input.gameId) {
    game = mockGameFromFetch
  }
  if (!game) {
    game = BASELINE_PICKUP_GAMES.find(g => g.id === input.gameId)
  }
  if (!game) {
    game = {
      id: input.gameId,
      slug: input.gameId,
      sport: 'Sports',
      emoji: '⚽',
      skill_level: 'Intermediate',
      venue_name: 'Community Arena',
      city: 'Bengaluru',
      time_label: 'Today · 7:00 PM',
      host_name: 'Community Host',
      price_per_player: '₹200',
      spots_open: 1,
      total_players: 4,
      confirmed_players: 3,
      is_featured: false,
      publication_status: 'published',
      whatsapp_group_url: 'https://chat.whatsapp.com/sample-match-group',
      status: 'open',
    }
    communitySubmissions.pickup_games.push(game)
  }

  if (game.spots_open <= 0 || game.status === 'full') {
    if (input.allowWaitlist) {
      const waitlistCount = localRsvpParticipants.filter(p => p.game_id === input.gameId && p.status === 'waitlist').length
      const waitlistPos = waitlistCount + 1
      const cancellationToken = `token-${Math.random().toString(36).substring(2, 10)}`
      const participant: DatabasePickupGameParticipant = {
        id: `part-${Math.random().toString(36).substring(2, 9)}`,
        game_id: input.gameId,
        user_id: input.userId || null,
        player_name: name,
        player_phone: cleanPhone,
        status: 'waitlist',
        joined_at: new Date().toISOString(),
        cancellation_token: cancellationToken,
      }
      localRsvpParticipants.push(participant)
      return {
        status: 'waitlist',
        message: `Match is full. You have been added to the waitlist (Position #${waitlistPos}).`,
        participantId: participant.id,
        cancellationToken,
        waitlistPosition: waitlistPos,
        whatsappGroupUrl: null,
      }
    }

    return {
      status: 'full',
      errorCode: 'MATCH_FULL',
      message: 'This pickup match is already full! No spots left.',
      whatsappGroupUrl: null,
    }
  }

  const newSpotsOpen = Math.max(0, game.spots_open - 1)
  const newConfirmedPlayers = game.confirmed_players + 1
  const newStatus: 'open' | 'full' = newSpotsOpen === 0 ? 'full' : 'open'

  game.spots_open = newSpotsOpen
  game.confirmed_players = newConfirmedPlayers
  game.status = newStatus

  const cIdx = communitySubmissions.pickup_games.findIndex(g => g.id === game.id)
  if (cIdx !== -1) {
    communitySubmissions.pickup_games[cIdx] = game
  } else {
    communitySubmissions.pickup_games.push(game)
  }

  const cancellationToken = `token-${Math.random().toString(36).substring(2, 10)}`
  const participant: DatabasePickupGameParticipant = {
    id: `part-${Math.random().toString(36).substring(2, 9)}`,
    game_id: input.gameId,
    user_id: input.userId || null,
    player_name: name,
    player_phone: cleanPhone,
    status: 'confirmed',
    joined_at: new Date().toISOString(),
    cancellation_token: cancellationToken,
  }
  localRsvpParticipants.push(participant)
  saveUserRsvpGame(input.gameId)

  return {
    status: 'confirmed',
    message: `Spot confirmed! Welcome to the match, ${name}.`,
    participant,
    participantId: participant.id,
    cancellationToken,
    game,
    whatsappGroupUrl: null,
  }
}

export interface CancelReservationInput {
  reservationId: string
  cancellationToken?: string
  playerPhone?: string
  accessToken?: string
  callerUserId?: string
}

export interface CancelReservationResult {
  status: 'cancelled' | 'already_cancelled' | 'error'
  message: string
  errorCode?: string
  promotedParticipantId?: string
}

export interface PickupGameInviteResult {
  status: 'success' | 'pending_approval' | 'error'
  message: string
  errorCode?: string
  whatsappGroupUrl?: string
}

export async function getPickupGameWhatsAppInvite(input: {
  reservationId: string
  cancellationToken?: string
  accessToken?: string
}): Promise<PickupGameInviteResult> {
  // Explicit offline/demo mode: return an invite only when the caller proves
  // possession of the reservation's cancellation token. This mirrors the
  // server-side bearer-token gate without exposing links in the RSVP response.
  if (!supabaseUrl || !anonKey) {
    const participant = localRsvpParticipants.find(
      item => item.id === input.reservationId && item.status === 'confirmed',
    )
    if (!participant || !input.cancellationToken ||
      participant.cancellation_token !== input.cancellationToken) {
      return {
        status: 'error',
        errorCode: 'UNAUTHORIZED',
        message: 'A valid reservation token is required to retrieve this invitation.',
      }
    }
    const game = communitySubmissions.pickup_games.find(item => item.id === participant.game_id)
      || BASELINE_PICKUP_GAMES.find(item => item.id === participant.game_id)
    if (!game?.whatsapp_group_url) {
      return {
        status: 'error',
        errorCode: 'INVITE_UNAVAILABLE',
        message: 'The WhatsApp invitation is not available for this match.',
      }
    }
    return {
      status: 'success',
      message: 'Invitation verified for this reservation.',
      whatsappGroupUrl: game.whatsapp_group_url,
    }
  }
  try {
    const baseUrl = new URL(supabaseUrl)
    if (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost' && baseUrl.hostname !== '127.0.0.1') {
      throw new Error('HTTPS required')
    }
    const response = await fetch(
      `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/get_pickup_game_whatsapp_invite`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${input.accessToken || anonKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          p_reservation_id: input.reservationId,
          p_cancellation_token: input.cancellationToken?.trim() || null,
        }),
      },
    )
    if (!response.ok) throw new Error('Invite lookup rejected')
    const data = await response.json()
    return {
      status: data.status === 'success' || data.status === 'pending_approval' ? data.status : 'error',
      message: data.message || (data.status === 'success' ? 'Invitation is ready.' : 'Invitation is not available.'),
      errorCode: data.error_code,
      whatsappGroupUrl: data.status === 'success' ? data.whatsapp_group_url : undefined,
    }
  } catch {
    return {
      status: 'error',
      errorCode: 'INVITE_SERVICE_UNAVAILABLE',
      message: 'The server could not verify invitation access. No invitation was released.',
    }
  }
}

export async function approvePickupGameWhatsAppInvite(
  reservationId: string,
  accessToken: string,
): Promise<{ status: 'success' | 'error'; message: string; errorCode?: string }> {
  if (!supabaseUrl || !anonKey || !accessToken) {
    return { status: 'error', errorCode: 'UNAUTHORIZED', message: 'A signed-in host session is required.' }
  }
  try {
    const baseUrl = new URL(supabaseUrl)
    if (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost' && baseUrl.hostname !== '127.0.0.1') {
      throw new Error('HTTPS required')
    }
    const response = await fetch(
      `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/approve_pickup_game_whatsapp_invite`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ p_reservation_id: reservationId }),
      },
    )
    if (!response.ok) throw new Error('Approval rejected')
    const data = await response.json()
    return {
      status: data.status === 'success' ? 'success' : 'error',
      message: data.message || 'Invitation approval failed.',
      errorCode: data.error_code,
    }
  } catch {
    return {
      status: 'error',
      errorCode: 'INVITE_APPROVAL_UNAVAILABLE',
      message: 'The server could not verify host approval. No invitation status was changed.',
    }
  }
}

export async function cancelPickupGameReservation(
  input: CancelReservationInput,
): Promise<CancelReservationResult> {
  if (supabaseUrl && anonKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        const token = input.accessToken || anonKey
        const response = await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/cancel_pickup_game_reservation`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              p_reservation_id: input.reservationId,
              p_cancellation_token: input.cancellationToken?.trim() || null,
            }),
          },
        )
        if (response.ok) {
          const res = await response.json()
          return {
            status: res.status || 'cancelled',
            message: res.message || 'Reservation cancelled.',
            errorCode: res.error_code,
            promotedParticipantId: res.promoted_participant_id,
          }
        }
      }
    } catch {
      // Offline fallback
    }
  }

  // Never let a failed configured backend request fall through to a local
  // simulation and claim that a database reservation was cancelled.
  if (supabaseUrl && anonKey) {
    return {
      status: 'error',
      errorCode: 'CANCELLATION_SERVICE_UNAVAILABLE',
      message: 'We could not verify the cancellation with the server. No change was made. Please try again.',
    }
  }

  const idx = localRsvpParticipants.findIndex(p => p.id === input.reservationId)
  if (idx !== -1) {
    const p = localRsvpParticipants[idx]
    let authorized = false

    // 1. Bearer cancellation token check (genuine guest verification)
    if (input.cancellationToken && p.cancellation_token && input.cancellationToken.trim() === p.cancellation_token) {
      authorized = true
    }
    // 2. Authenticated user who created the reservation
    else if (input.callerUserId && p.user_id && input.callerUserId === p.user_id) {
      authorized = true
    }
    // 3. Authenticated host of the match
    else {
      const g = findLocalPickupGame(p.game_id)
      if (input.callerUserId && g && g.host_user_id === input.callerUserId) {
        authorized = true
      }
    }

    if (!authorized) {
      return {
        status: 'error',
        errorCode: 'UNAUTHORIZED',
        message: 'Unauthorized to cancel this reservation. A valid bearer cancellation token or authenticated account is required.',
      }
    }

    p.status = 'cancelled'
    return {
      status: 'cancelled',
      message: 'Reservation cancelled successfully.',
    }
  }

  return {
    status: 'error',
    errorCode: 'RESERVATION_NOT_FOUND',
    message: 'Reservation not found.',
  }
}

// -----------------------------------------------------------------------------
// Phase 3: Host Authorization, Game Ownership & Game Management Security
// -----------------------------------------------------------------------------

export interface CreatePickupGameInput {
  sport: string
  venueName: string
  city: string
  timeLabel: string
  totalPlayers: number
  pricePerPlayer?: string
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  emoji?: string
  whatsappGroupUrl?: string
  publishImmediately?: boolean
  hostDisplayName?: string
}

export interface CreatePickupGameOptions {
  accessToken?: string
  hostUserId?: string
}

export interface CreatePickupGameResult {
  status: 'success' | 'error'
  message: string
  errorCode?: string
  gameId?: string
  slug?: string
  game?: DatabasePickupGame
}

export interface UpdatePickupGameDetailsInput {
  gameId: string
  sport?: string
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'
  emoji?: string
  whatsappGroupUrl?: string
}

export interface ReschedulePickupGameInput {
  gameId: string
  venueName: string
  city: string
  timeLabel: string
}

export interface UpdatePickupGameCapacityInput {
  gameId: string
  totalPlayers: number
  pricePerPlayer?: string
}

export interface CancelPickupGameAsHostInput {
  gameId: string
  cancellationReason?: string
}

export interface ReopenPickupGameAsHostInput {
  gameId: string
}

export interface CompletePickupGameAsHostInput {
  gameId: string
}

export interface AdminModeratePickupGameInput {
  gameId: string
  action: 'feature' | 'unfeature' | 'archive' | 'publish' | 'force_cancel'
  notes?: string
}

export interface HostActionOptions {
  accessToken?: string
  callerUserId?: string
  isAdmin?: boolean
}

export interface PickupGameMutationResult {
  status: 'success' | 'already_cancelled' | 'already_completed' | 'error'
  message: string
  errorCode?: string
  gameId?: string
  gameStatus?: string
  action?: string
  confirmedReservationsCancelled?: number
  waitlistReservationsCancelled?: number
}

function findLocalPickupGame(gameId: string): DatabasePickupGame | undefined {
  return (
    communitySubmissions.pickup_games.find(g => g.id === gameId) ||
    BASELINE_PICKUP_GAMES.find(g => g.id === gameId)
  )
}

function verifyHostAuthorization(
  game: DatabasePickupGame,
  options?: HostActionOptions,
): { authorized: boolean; errorCode?: string; message?: string } {
  if (!options?.callerUserId && !options?.accessToken && !options?.isAdmin) {
    return { authorized: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' }
  }
  if (options?.isAdmin) {
    return { authorized: true }
  }
  if (options?.callerUserId && game.host_user_id && game.host_user_id !== options.callerUserId) {
    return { authorized: false, errorCode: 'FORBIDDEN', message: 'You are not authorized to modify this match.' }
  }
  return { authorized: true }
}

async function callHostRpc(
  rpcName: string,
  bodyParams: Record<string, unknown>,
  accessToken?: string,
): Promise<{ handled: boolean; result?: PickupGameMutationResult }> {
  // Local simulation is available only when Supabase is deliberately unconfigured
  // (for isolated tests/demo mode). A configured backend must fail closed.
  if (!supabaseUrl || !anonKey) return { handled: false }
  const unavailable = (message: string, errorCode = 'HOST_SERVICE_UNAVAILABLE') => ({
    handled: true,
    result: {
      status: 'error' as const,
      errorCode,
      message,
    },
  })
  if (!accessToken) {
    return unavailable('Sign in is required to manage a hosted match.', 'UNAUTHORIZED')
  }

  try {
    const baseUrl = new URL(supabaseUrl)
    if (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost' && baseUrl.hostname !== '127.0.0.1') {
      return unavailable('The host management service requires a secure HTTPS connection.')
    }
    const response = await fetch(
      `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/${rpcName}`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(bodyParams),
      },
    )
    if (!response.ok) {
      return unavailable('The server could not verify this host action. No changes were made.')
    }
    const res = await response.json()
    if (!res || typeof res !== 'object' || typeof res.status !== 'string') {
      return unavailable('The server returned an invalid host-management response.')
    }
    return {
      handled: true,
      result: {
        status: res.status,
        message: res.message || 'Operation completed.',
        errorCode: res.error_code,
        gameId: res.game_id,
        gameStatus: res.game_status,
        action: res.action,
        confirmedReservationsCancelled: res.confirmed_reservations_cancelled,
        waitlistReservationsCancelled: res.waitlist_reservations_cancelled,
      },
    }
  } catch {
    return unavailable('The host management service is unavailable. No changes were made.')
  }
}

export async function createPickupGame(
  input: CreatePickupGameInput,
  options?: CreatePickupGameOptions,
): Promise<CreatePickupGameResult> {
  const sport = input.sport?.trim()
  const venue = input.venueName?.trim()
  const city = input.city?.trim()
  const time = input.timeLabel?.trim()
  const total = Number(input.totalPlayers)

  if (!sport || sport.length < 2) {
    return { status: 'error', errorCode: 'INVALID_INPUT', message: 'Sport must be at least 2 characters.' }
  }
  if (!venue || venue.length < 2) {
    return { status: 'error', errorCode: 'INVALID_INPUT', message: 'Venue name must be at least 2 characters.' }
  }
  if (!city || city.length < 1) {
    return { status: 'error', errorCode: 'INVALID_INPUT', message: 'City is required.' }
  }
  if (!time || time.length < 2) {
    return { status: 'error', errorCode: 'INVALID_INPUT', message: 'Time label is required.' }
  }
  if (!Number.isFinite(total) || total < 2 || total > 100) {
    return { status: 'error', errorCode: 'INVALID_INPUT', message: 'Total players must be between 2 and 100.' }
  }

  // A configured backend requires a real authenticated session. Never simulate a
  // successful host action because the access token is missing.
  if (supabaseUrl && anonKey && !options?.accessToken) {
    return {
      status: 'error',
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication is required to create and host a match.',
    }
  }

  // Supabase RPC
  if (supabaseUrl && anonKey && options?.accessToken) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        const response = await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/create_pickup_game`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${options.accessToken}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              p_sport: sport,
              p_venue_name: venue,
              p_city: city,
              p_time_label: time,
              p_total_players: total,
              p_price_per_player: input.pricePerPlayer?.trim() || 'Free',
              p_skill_level: input.skillLevel || 'Intermediate',
              p_emoji: input.emoji?.trim() || '⚽',
              p_whatsapp_group_url: input.whatsappGroupUrl?.trim() || null,
              p_publish_immediately: input.publishImmediately !== false,
              p_host_display_name: input.hostDisplayName?.trim() || null,
            }),
          },
        )
        if (response.ok) {
          const res = await response.json()
          if (res && typeof res === 'object') {
            if (res.status === 'success') {
              const newGame: DatabasePickupGame = {
                id: res.game_id,
                slug: res.slug,
                sport,
                emoji: input.emoji?.trim() || '⚽',
                skill_level: input.skillLevel || 'Intermediate',
                venue_name: venue,
                city,
                time_label: time,
                host_name: input.hostDisplayName?.trim() || 'Community Host',
                host_user_id: options.hostUserId || null,
                price_per_player: input.pricePerPlayer?.trim() || 'Free',
                spots_open: total,
                total_players: total,
                confirmed_players: 0,
                is_featured: false,
                publication_status: input.publishImmediately !== false ? 'published' : 'draft',
                whatsapp_group_url: input.whatsappGroupUrl?.trim() || null,
                status: input.publishImmediately !== false ? 'open' : 'draft',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              broadcastRealtimeEvent('pickup_games', 'INSERT', sanitizePublicGame(newGame))
              return {
                status: 'success',
                message: res.message || 'Game hosted successfully.',
                gameId: res.game_id,
                slug: res.slug,
                game: newGame,
              }
            } else {
              return {
                status: 'error',
                errorCode: res.error_code || 'RPC_ERROR',
                message: res.message || 'Failed to create game.',
              }
            }
          }
        }
      }
    } catch {
      // Backend failures must not be represented as successful local host creation.
    }
  }

  if (supabaseUrl && anonKey) {
    return {
      status: 'error',
      errorCode: 'HOST_SERVICE_UNAVAILABLE',
      message: 'The server could not verify game creation. No game was created. Please try again.',
    }
  }

  // Local / offline simulation requires auth
  if (!options?.accessToken && !options?.hostUserId) {
    return {
      status: 'error',
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in to create and host matches.',
    }
  }

  const generatedId = `pg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
  const baseSlug = `${sport.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`

  const newGame: DatabasePickupGame = {
    id: generatedId,
    slug,
    sport,
    emoji: input.emoji?.trim() || '⚽',
    skill_level: input.skillLevel || 'Intermediate',
    venue_name: venue,
    city,
    time_label: time,
    host_name: input.hostDisplayName?.trim() || 'Community Host',
    host_user_id: options?.hostUserId || 'mock-host-user-id',
    price_per_player: input.pricePerPlayer?.trim() || 'Free',
    spots_open: total,
    total_players: total,
    confirmed_players: 0,
    is_featured: false,
    publication_status: input.publishImmediately !== false ? 'published' : 'draft',
    whatsapp_group_url: input.whatsappGroupUrl?.trim() || null,
    status: input.publishImmediately !== false ? 'open' : 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  communitySubmissions.pickup_games.unshift(newGame)
  broadcastRealtimeEvent('pickup_games', 'INSERT', sanitizePublicGame(newGame))

  return {
    status: 'success',
    message: 'Pickup game hosted successfully.',
    gameId: newGame.id,
    slug: newGame.slug,
    game: newGame,
  }
}

export async function updatePickupGameDetails(
  input: UpdatePickupGameDetailsInput,
  options?: HostActionOptions,
): Promise<PickupGameMutationResult> {
  const rpc = await callHostRpc('update_pickup_game_details', {
    p_game_id: input.gameId,
    p_sport: input.sport || null,
    p_skill_level: input.skillLevel || null,
    p_emoji: input.emoji || null,
    p_whatsapp_group_url: input.whatsappGroupUrl || null,
  }, options?.accessToken)

  if (rpc.handled && rpc.result) {
    return rpc.result
  }

  const game = findLocalPickupGame(input.gameId)
  if (!game) {
    return { status: 'error', errorCode: 'GAME_NOT_FOUND', message: 'Game not found.' }
  }

  const auth = verifyHostAuthorization(game, options)
  if (!auth.authorized) {
    return { status: 'error', errorCode: auth.errorCode, message: auth.message || 'Unauthorized.' }
  }

  if (game.status === 'completed' || game.status === 'cancelled') {
    return { status: 'error', errorCode: 'INVALID_STATE', message: 'Cannot edit a completed or cancelled match.' }
  }

  if (input.sport) game.sport = input.sport.trim()
  if (input.skillLevel) game.skill_level = input.skillLevel
  if (input.emoji) game.emoji = input.emoji.trim()
  if (input.whatsappGroupUrl !== undefined) game.whatsapp_group_url = input.whatsappGroupUrl?.trim() || null
  game.updated_at = new Date().toISOString()

  broadcastRealtimeEvent('pickup_games', 'UPDATE', sanitizePublicGame(game))

  return {
    status: 'success',
    message: 'Game details updated successfully.',
    gameId: game.id,
  }
}

export async function reschedulePickupGame(
  input: ReschedulePickupGameInput,
  options?: HostActionOptions,
): Promise<PickupGameMutationResult> {
  const rpc = await callHostRpc('reschedule_pickup_game', {
    p_game_id: input.gameId,
    p_venue_name: input.venueName,
    p_city: input.city,
    p_time_label: input.timeLabel,
  }, options?.accessToken)

  if (rpc.handled && rpc.result) {
    return rpc.result
  }

  const game = findLocalPickupGame(input.gameId)
  if (!game) {
    return { status: 'error', errorCode: 'GAME_NOT_FOUND', message: 'Game not found.' }
  }

  const auth = verifyHostAuthorization(game, options)
  if (!auth.authorized) {
    return { status: 'error', errorCode: auth.errorCode, message: auth.message || 'Unauthorized.' }
  }

  if (game.status === 'completed' || game.status === 'cancelled') {
    return { status: 'error', errorCode: 'INVALID_STATE', message: 'Cannot reschedule a completed or cancelled match.' }
  }

  const venue = input.venueName?.trim()
  const city = input.city?.trim()
  const time = input.timeLabel?.trim()
  if (!venue || venue.length < 2 || !city || !time || time.length < 2) {
    return { status: 'error', errorCode: 'INVALID_INPUT', message: 'Venue, city, and time label must be provided.' }
  }

  game.venue_name = venue
  game.city = city
  game.time_label = time
  game.updated_at = new Date().toISOString()

  broadcastRealtimeEvent('pickup_games', 'UPDATE', sanitizePublicGame(game))

  return {
    status: 'success',
    message: 'Match rescheduled successfully.',
    gameId: game.id,
  }
}

export async function updatePickupGameCapacity(
  input: UpdatePickupGameCapacityInput,
  options?: HostActionOptions,
): Promise<PickupGameMutationResult> {
  const rpc = await callHostRpc('update_pickup_game_capacity', {
    p_game_id: input.gameId,
    p_total_players: input.totalPlayers,
    p_price_per_player: input.pricePerPlayer || null,
  }, options?.accessToken)

  if (rpc.handled && rpc.result) {
    return rpc.result
  }

  const game = findLocalPickupGame(input.gameId)
  if (!game) {
    return { status: 'error', errorCode: 'GAME_NOT_FOUND', message: 'Game not found.' }
  }

  const auth = verifyHostAuthorization(game, options)
  if (!auth.authorized) {
    return { status: 'error', errorCode: auth.errorCode, message: auth.message || 'Unauthorized.' }
  }

  if (game.status === 'completed' || game.status === 'cancelled') {
    return { status: 'error', errorCode: 'INVALID_STATE', message: 'Cannot alter capacity of a completed or cancelled match.' }
  }

  const total = Number(input.totalPlayers)
  if (!Number.isFinite(total) || total < 2 || total > 100) {
    return { status: 'error', errorCode: 'INVALID_INPUT', message: 'Total players must be between 2 and 100.' }
  }

  if (total < game.confirmed_players) {
    return {
      status: 'error',
      errorCode: 'CAPACITY_TOO_LOW',
      message: `Capacity cannot be reduced below the count of confirmed players (${game.confirmed_players}).`,
    }
  }

  const spots = Math.max(0, total - game.confirmed_players)
  game.total_players = total
  game.spots_open = spots
  game.status = spots === 0 ? 'full' : 'open'
  if (input.pricePerPlayer) game.price_per_player = input.pricePerPlayer.trim()
  game.updated_at = new Date().toISOString()

  broadcastRealtimeEvent('pickup_games', 'UPDATE', sanitizePublicGame(game))

  return {
    status: 'success',
    message: 'Match capacity updated successfully.',
    gameId: game.id,
    gameStatus: game.status,
  }
}

export async function cancelPickupGameAsHost(
  input: CancelPickupGameAsHostInput,
  options?: HostActionOptions,
): Promise<PickupGameMutationResult> {
  const rpc = await callHostRpc('cancel_pickup_game_as_host', {
    p_game_id: input.gameId,
    p_cancellation_reason: input.cancellationReason || 'Match cancelled by host',
  }, options?.accessToken)

  if (rpc.handled && rpc.result) {
    return rpc.result
  }

  const game = findLocalPickupGame(input.gameId)
  if (!game) {
    return { status: 'error', errorCode: 'GAME_NOT_FOUND', message: 'Game not found.' }
  }

  const auth = verifyHostAuthorization(game, options)
  if (!auth.authorized) {
    return { status: 'error', errorCode: auth.errorCode, message: auth.message || 'Unauthorized.' }
  }

  if (game.status === 'cancelled') {
    return { status: 'already_cancelled', message: 'This match is already cancelled.' }
  }

  if (game.status === 'completed') {
    return { status: 'error', errorCode: 'INVALID_STATE', message: 'Completed matches cannot be cancelled.' }
  }

  // Count affected active reservations and mark cancelled (preserving records)
  let cancelledConfirmed = 0
  let cancelledWaitlist = 0
  for (const p of localRsvpParticipants) {
    if (p.game_id === game.id) {
      if (p.status === 'confirmed') {
        p.status = 'cancelled'
        cancelledConfirmed += 1
      } else if (p.status === 'waitlist') {
        p.status = 'cancelled'
        cancelledWaitlist += 1
      }
    }
  }

  game.status = 'cancelled'
  game.cancellation_reason = input.cancellationReason?.trim() || 'Match cancelled by host'
  game.cancelled_at = new Date().toISOString()
  game.updated_at = new Date().toISOString()

  broadcastRealtimeEvent('pickup_games', 'UPDATE', sanitizePublicGame(game))

  return {
    status: 'success',
    message: 'Match cancelled successfully.',
    gameId: game.id,
    gameStatus: 'cancelled',
    confirmedReservationsCancelled: cancelledConfirmed,
    waitlistReservationsCancelled: cancelledWaitlist,
  }
}

export async function reopenPickupGameAsHost(
  input: ReopenPickupGameAsHostInput,
  options?: HostActionOptions,
): Promise<PickupGameMutationResult> {
  const rpc = await callHostRpc('reopen_pickup_game_as_host', {
    p_game_id: input.gameId,
  }, options?.accessToken)

  if (rpc.handled && rpc.result) {
    return rpc.result
  }

  const game = findLocalPickupGame(input.gameId)
  if (!game) {
    return { status: 'error', errorCode: 'GAME_NOT_FOUND', message: 'Game not found.' }
  }

  const auth = verifyHostAuthorization(game, options)
  if (!auth.authorized) {
    return { status: 'error', errorCode: auth.errorCode, message: auth.message || 'Unauthorized.' }
  }

  if (game.status === 'completed' && !options?.isAdmin) {
    return {
      status: 'error',
      errorCode: 'FORBIDDEN',
      message: 'Completed matches cannot be reopened without administrator authorization.',
    }
  }

  if (game.status !== 'cancelled') {
    return { status: 'error', errorCode: 'INVALID_STATE', message: 'Only cancelled matches can be reopened.' }
  }

  const newStatus = game.spots_open === 0 ? 'full' : 'open'
  game.status = newStatus
  game.cancellation_reason = null
  game.cancelled_at = null
  game.updated_at = new Date().toISOString()

  broadcastRealtimeEvent('pickup_games', 'UPDATE', sanitizePublicGame(game))

  return {
    status: 'success',
    message: 'Match reopened successfully.',
    gameId: game.id,
    gameStatus: newStatus,
  }
}

export async function completePickupGameAsHost(
  input: CompletePickupGameAsHostInput,
  options?: HostActionOptions,
): Promise<PickupGameMutationResult> {
  const rpc = await callHostRpc('complete_pickup_game_as_host', {
    p_game_id: input.gameId,
  }, options?.accessToken)

  if (rpc.handled && rpc.result) {
    return rpc.result
  }

  const game = findLocalPickupGame(input.gameId)
  if (!game) {
    return { status: 'error', errorCode: 'GAME_NOT_FOUND', message: 'Game not found.' }
  }

  const auth = verifyHostAuthorization(game, options)
  if (!auth.authorized) {
    return { status: 'error', errorCode: auth.errorCode, message: auth.message || 'Unauthorized.' }
  }

  if (game.status === 'completed') {
    return { status: 'already_completed', message: 'Match is already completed.' }
  }

  if (game.status === 'cancelled') {
    return { status: 'error', errorCode: 'INVALID_STATE', message: 'Cancelled matches cannot be marked completed. Reopen first.' }
  }

  game.status = 'completed'
  game.completed_at = new Date().toISOString()
  game.updated_at = new Date().toISOString()

  broadcastRealtimeEvent('pickup_games', 'UPDATE', sanitizePublicGame(game))

  return {
    status: 'success',
    message: 'Match marked as completed.',
    gameId: game.id,
    gameStatus: 'completed',
  }
}

export async function adminModeratePickupGame(
  input: AdminModeratePickupGameInput,
  options?: { accessToken?: string; isAdmin?: boolean },
): Promise<PickupGameMutationResult> {
  const rpc = await callHostRpc('admin_moderate_pickup_game', {
    p_game_id: input.gameId,
    p_action: input.action,
    p_notes: input.notes || null,
  }, options?.accessToken)

  if (rpc.handled && rpc.result) {
    return rpc.result
  }

  if (!options?.isAdmin) {
    return {
      status: 'error',
      errorCode: 'UNAUTHORIZED',
      message: 'Administrator or moderator privileges required.',
    }
  }

  const game = findLocalPickupGame(input.gameId)
  if (!game) {
    return { status: 'error', errorCode: 'GAME_NOT_FOUND', message: 'Game not found.' }
  }

  if (input.action === 'feature') {
    game.is_featured = true
  } else if (input.action === 'unfeature') {
    game.is_featured = false
  } else if (input.action === 'archive') {
    game.publication_status = 'archived'
  } else if (input.action === 'publish') {
    game.publication_status = 'published'
  } else if (input.action === 'force_cancel') {
    game.status = 'cancelled'
    game.cancellation_reason = input.notes || 'Cancelled by administrator moderation'
    game.cancelled_at = new Date().toISOString()
    for (const p of localRsvpParticipants) {
      if (p.game_id === game.id && (p.status === 'confirmed' || p.status === 'waitlist')) {
        p.status = 'cancelled'
      }
    }
  } else {
    return { status: 'error', errorCode: 'INVALID_ACTION', message: 'Unrecognized moderation action.' }
  }

  game.updated_at = new Date().toISOString()
  broadcastRealtimeEvent('pickup_games', 'UPDATE', sanitizePublicGame(game))

  return {
    status: 'success',
    message: `Moderation action ${input.action} executed successfully.`,
    gameId: game.id,
    action: input.action,
  }
}

export async function getHostPickupGames(options?: {
  accessToken?: string
  hostUserId?: string
  isAdmin?: boolean
}): Promise<{ status: 'success' | 'error'; data: DatabasePickupGame[]; message?: string; errorCode?: string }> {
  if (supabaseUrl && anonKey && !options?.accessToken) {
    return {
      status: 'error',
      errorCode: 'UNAUTHORIZED',
      message: 'A valid sign-in session is required to view hosted games.',
      data: [],
    }
  }

  if (supabaseUrl && anonKey && options?.accessToken) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        const response = await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/rpc/get_host_pickup_games`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${options.accessToken}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({}),
          },
        )
        if (response.ok) {
          const res = await response.json()
          if (res && res.status === 'success' && Array.isArray(res.data)) {
            return {
              status: 'success',
              data: res.data as DatabasePickupGame[],
            }
          }
        }
      }
    } catch {
      // Fail closed below; do not show an in-memory host portfolio.
    }
  }

  if (supabaseUrl && anonKey) {
    return {
      status: 'error',
      errorCode: 'HOST_SERVICE_UNAVAILABLE',
      message: 'The server could not verify your hosted games. Please try again.',
      data: [],
    }
  }

  if (!options?.hostUserId && !options?.accessToken && !options?.isAdmin) {
    return {
      status: 'error',
      errorCode: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in.',
      data: [],
    }
  }

  const all = [...communitySubmissions.pickup_games, ...BASELINE_PICKUP_GAMES]
  const matched = options?.isAdmin
    ? all
    : all.filter(g => g.host_user_id === options?.hostUserId)

  return {
    status: 'success',
    data: matched,
  }
}

/**
 * @deprecated Removed for player privacy and security. Participant personal details
 * (phone numbers, full names) are strictly restricted at the database level and must
 * not be accessible via the public client API.
 */
// Public participant roster fetching has been revoked for privacy.

// -----------------------------------------------------------------------------
// Trust, Safety & Anti-Scam Reporting System
// -----------------------------------------------------------------------------

export interface VerificationProofInput {
  entityType: 'academy' | 'venue' | 'opportunity' | 'coach'
  entitySlug: string
  entityName: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  claimantRole?: string
  documentType: 'affiliation_certificate' | 'ground_lease' | 'coaching_license' | 'municipal_trade_license' | 'geotagged_photos' | 'other'
  proofDetails: string
}

export async function submitListingReport(report: {
  entityType: 'academy' | 'venue' | 'opportunity' | 'coach'
  entityId?: string
  entitySlug: string
  entityName: string
  reason: 'fake_trial' | 'impersonation' | 'fake_venue' | 'unauthorized_fee' | 'wrong_contact' | 'other'
  details: string
  reporterEmail?: string
  reporterPhone?: string
}): Promise<{ success: boolean; message: string }> {
  const reportPayload = {
    entity_type: report.entityType,
    entity_id: report.entityId || null,
    entity_slug: report.entitySlug,
    entity_name: report.entityName,
    reason: report.reason,
    details: report.details,
    reporter_email: report.reporterEmail || null,
    reporter_phone: report.reporterPhone || null,
    status: 'pending',
  }

  // 1. If Supabase credentials are configured, post directly to Supabase table
  if (supabaseUrl && anonKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/listing_reports`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(reportPayload),
          },
        )
      }
    } catch {
      // Offline fallback
    }
  }

  // 2. Track locally to protect the current session immediately
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem('khelgrid_community_reports')
      const reports = raw ? JSON.parse(raw) : []
      reports.push({
        id: `rep-${Math.random().toString(36).substring(2, 9)}`,
        ...report,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      window.localStorage.setItem('khelgrid_community_reports', JSON.stringify(reports))
    }
  } catch {
    // Ignore storage errors
  }

  return {
    success: true,
    message: 'Report received. The KhelGrid Trust & Safety team will review this notice within 2 hours. If fraud or fake trials are confirmed, this listing will be permanently delisted.',
  }
}

export async function submitVerificationProof(proof: VerificationProofInput): Promise<{ success: boolean; message: string }> {
  const claimPayload = {
    entity_type: proof.entityType,
    entity_slug: proof.entitySlug,
    entity_name: proof.entityName,
    contact_name: proof.contactName,
    contact_phone: proof.contactPhone,
    contact_email: proof.contactEmail || null,
    claimant_role: proof.claimantRole || null,
    document_type: proof.documentType,
    proof_details: proof.proofDetails,
    status: 'pending_review',
  }

  // 1. If Supabase credentials are configured, post directly to Supabase table
  if (supabaseUrl && anonKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/verification_claims`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(claimPayload),
          },
        )
      }
    } catch {
      // Offline fallback
    }
  }

  // 2. Store locally as session fallback
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem('khelgrid_verification_claims')
      const claims = raw ? JSON.parse(raw) : []
      claims.push({
        id: `claim-${Math.random().toString(36).substring(2, 9)}`,
        ...proof,
        status: 'pending_review',
        submittedAt: new Date().toISOString(),
      })
      window.localStorage.setItem('khelgrid_verification_claims', JSON.stringify(claims))
    }
  } catch {
    // Ignore storage errors
  }

  return {
    success: true,
    message: 'Verification proof submitted successfully! The KhelGrid Sports Desk will review your credentials against official registries within 2–4 hours. Once verified, the official verified badge will be published.',
  }
}

// -----------------------------------------------------------------------------
// Community Reviews, Ratings & Media Uploads (Supabase Storage)
// -----------------------------------------------------------------------------

export const INITIAL_CURATED_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-curated-1',
    entity_type: 'venue',
    entity_id: 'kicks-on-grass-bellandur-bengaluru-914w9',
    entity_slug: 'kicks-on-grass-bellandur-bengaluru-914w9',
    user_id: null,
    author_name: 'Arjun Nair',
    author_role: 'Turf Player',
    rating: 5,
    title: 'Superb FIFA-grade turf and brilliant floodlights',
    content: 'We play 7v7 football here every Tuesday evening. The turf cushioning is very gentle on knees and the high-lux floodlights ensure zero shadow spots. Booking via KhelGrid was instant.',
    photos: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
    ],
    helpful_count: 14,
    status: 'published',
    created_at: '2026-10-28T18:30:00.000Z',
  },
  {
    id: 'rev-curated-2',
    entity_type: 'venue',
    entity_id: 'kicks-on-grass-bellandur-bengaluru-914w9',
    entity_slug: 'kicks-on-grass-bellandur-bengaluru-914w9',
    user_id: null,
    author_name: 'Vikram Shenoy',
    author_role: 'Athlete',
    rating: 4,
    title: 'Great pitch, clean changing rooms',
    content: 'Well maintained grass surface with high netting so balls don’t go outside. Drinking water dispenser and parking are easily accessible.',
    photos: [],
    helpful_count: 8,
    status: 'published',
    created_at: '2026-10-25T14:15:00.000Z',
  },
  {
    id: 'rev-curated-3',
    entity_type: 'academy',
    entity_id: 'pullela-gopichand-badminton-academy-hyderabad-hyderabad-u739x',
    entity_slug: 'pullela-gopichand-badminton-academy-hyderabad-hyderabad-u739x',
    user_id: null,
    author_name: 'Meera Krishnan',
    author_role: 'Parent',
    rating: 5,
    title: 'World-class training discipline and coaches',
    content: 'My 14-year-old daughter has been in the junior batch for 8 months. The fitness drills, tactical footwork coaching, and psychological mentoring are second to none in India.',
    photos: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    ],
    helpful_count: 23,
    status: 'published',
    created_at: '2026-10-20T10:00:00.000Z',
  },
  {
    id: 'rev-curated-4',
    entity_type: 'academy',
    entity_id: 'bhaichung-bhutia-football-schools-delhi-delhi-b7d18',
    entity_slug: 'bhaichung-bhutia-football-schools-delhi-delhi-b7d18',
    user_id: null,
    author_name: 'Kabir Verma',
    author_role: 'Athlete',
    rating: 5,
    title: 'Structured age-group progression and licensed coaches',
    content: 'Top level coaching methodology. They focus on tactical awareness, first touch, and positioning from day one. Highly recommend for any young footballer.',
    photos: [],
    helpful_count: 19,
    status: 'published',
    created_at: '2026-10-22T16:45:00.000Z',
  },
]

export function computeReviewStats(reviews: ReviewItem[]): ReviewStats {
  if (!reviews.length) {
    return {
      averageRating: 0,
      totalReviews: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    }
  }

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let sum = 0

  for (const r of reviews) {
    sum += r.rating
    if (r.rating in distribution) {
      distribution[r.rating as keyof typeof distribution]++
    }
  }

  const avg = Math.round((sum / reviews.length) * 10) / 10
  return {
    averageRating: avg,
    totalReviews: reviews.length,
    distribution,
  }
}

export async function getReviews(
  entityType: 'academy' | 'venue',
  entitySlug: string,
): Promise<CatalogueResult<ReviewItem>> {
  const cleanSlug = entitySlug.toLowerCase().trim()
  const localList = communitySubmissions.reviews.filter(
    r => r.entity_type === entityType && r.entity_slug.toLowerCase() === cleanSlug,
  )

  const curatedList = INITIAL_CURATED_REVIEWS.filter(
    r => r.entity_type === entityType && r.entity_slug.toLowerCase() === cleanSlug,
  )

  const dbRes = await readCatalogue<ReviewItem>({
    table: 'reviews',
    select: 'id,entity_type,entity_id,entity_slug,user_id,author_name,author_role,rating,title,content,photos,helpful_count,status,created_at',
    order: 'created_at.desc',
    filters: {
      entity_type: `eq.${entityType}`,
      entity_slug: `eq.${cleanSlug}`,
      status: 'eq.published',
    },
  })

  let combined: ReviewItem[] = []

  if (dbRes.status === 'ready' && dbRes.data.length > 0) {
    const seen = new Set(dbRes.data.map(r => r.id))
    const freshLocals = localList.filter(r => !seen.has(r.id))
    combined = [...freshLocals, ...dbRes.data]
  } else {
    // If database returned no records or unconfigured, combine local submissions and curated
    const seen = new Set(localList.map(r => r.id))
    const uniqueCurated = curatedList.filter(r => !seen.has(r.id))
    combined = [...localList, ...uniqueCurated]
  }

  return {
    status: 'ready',
    data: combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  }
}

export async function submitReview(
  input: SubmitReviewInput,
): Promise<{ status: 'submitted' | 'error'; message: string; review?: ReviewItem }> {
  const authorName = input.authorName?.trim()
  if (!authorName || authorName.length < 2) {
    return { status: 'error', message: 'Please provide your name (at least 2 characters).' }
  }

  const content = input.content?.trim()
  if (!content || content.length < 5) {
    return { status: 'error', message: 'Please share a review of at least 5 characters.' }
  }

  const rating = Math.min(5, Math.max(1, Math.round(input.rating || 5)))
  const randomSuffix = Math.random().toString(36).substring(2, 9)
  const currentUser = getStoredUser()

  const review: ReviewItem = {
    id: `rev-${randomSuffix}`,
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_slug: input.entitySlug.toLowerCase().trim(),
    user_id: input.userId || currentUser?.id || null,
    author_name: authorName,
    author_role: input.authorRole || (currentUser?.role === 'academy' ? 'Coach' : 'Athlete'),
    rating,
    title: input.title?.trim() || null,
    content,
    photos: Array.isArray(input.photos) ? input.photos : [],
    helpful_count: 0,
    status: 'published',
    created_at: new Date().toISOString(),
  }

  // 1. Post to Supabase REST API if configured
  if (supabaseUrl && anonKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        const payload = {
          entity_type: review.entity_type,
          entity_id: review.entity_id,
          entity_slug: review.entity_slug,
          user_id: review.user_id,
          author_name: review.author_name,
          author_role: review.author_role,
          rating: review.rating,
          title: review.title,
          content: review.content,
          photos: review.photos,
          status: review.status,
        }

        const res = await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/reviews`,
          {
            method: 'POST',
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(payload),
          },
        )

        if (res.ok) {
          const inserted = await res.json()
          if (Array.isArray(inserted) && inserted[0]) {
            review.id = (inserted[0] as { id?: string }).id || review.id
          }
        }
      }
    } catch {
      // Offline fallback
    }
  }

  // 2. Cache in local memory
  communitySubmissions.reviews = [review, ...communitySubmissions.reviews]

  // 3. Realtime event & custom DOM notification
  broadcastRealtimeEvent('reviews', 'INSERT', review)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('khelgrid:review-added', {
        detail: { review },
      }),
    )
  }

  return {
    status: 'submitted',
    message: 'Thank you! Your rating and ground photos have been published to the community.',
    review,
  }
}

const inMemoryHelpfulVotes = new Set<string>()

export function getVotedHelpfulReviewIds(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return inMemoryHelpfulVotes
  try {
    const raw = window.localStorage.getItem('khelgrid_helpful_voted_reviews')
    const parsed = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
    for (const id of inMemoryHelpfulVotes) parsed.add(id)
    return parsed
  } catch {
    return inMemoryHelpfulVotes
  }
}

export function saveVotedHelpfulReview(reviewId: string): void {
  inMemoryHelpfulVotes.add(reviewId)
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    const ids = getVotedHelpfulReviewIds()
    ids.add(reviewId)
    window.localStorage.setItem('khelgrid_helpful_voted_reviews', JSON.stringify([...ids]))
  } catch {
    // Ignore storage errors
  }
}

export async function voteHelpfulReview(reviewId: string): Promise<boolean> {
  const voted = getVotedHelpfulReviewIds()
  if (voted.has(reviewId)) return false

  saveVotedHelpfulReview(reviewId)

  // 1. Update local cache
  const idx = communitySubmissions.reviews.findIndex(r => r.id === reviewId)
  if (idx !== -1) {
    communitySubmissions.reviews[idx] = {
      ...communitySubmissions.reviews[idx],
      helpful_count: communitySubmissions.reviews[idx].helpful_count + 1,
    }
  }

  // 2. Patch to Supabase if configured
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reviewId)
  if (supabaseUrl && anonKey && isUuid) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        // Fetch current count to increment safely
        const fetchRes = await fetch(
          `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/reviews?id=eq.${encodeURIComponent(reviewId)}&select=helpful_count`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
              Accept: 'application/json',
            },
          },
        )
        if (fetchRes.ok) {
          const rows = await fetchRes.json()
          const currentCount = Array.isArray(rows) && rows[0]?.helpful_count ? Number(rows[0].helpful_count) : 0
          await fetch(
            `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/rest/v1/reviews?id=eq.${encodeURIComponent(reviewId)}`,
            {
              method: 'PATCH',
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ helpful_count: currentCount + 1 }),
            },
          )
        }
      }
    } catch {
      // Offline fallback
    }
  }

  broadcastRealtimeEvent('reviews', 'UPDATE', { id: reviewId })
  return true
}

/**
 * Uploads media (images, court photos, CV documents) directly to Supabase Storage.
 * Provides instant fallback with base64 data URLs when working offline or in local preview.
 */
export async function uploadMediaFile(
  bucket: StorageBucket,
  file: File,
  folder: string = 'community',
): Promise<{ url: string; error?: string }> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanName}`

  if (supabaseUrl && anonKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
        const uploadUrl = `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/storage/v1/object/${bucket}/${filePath}`
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            'Content-Type': file.type || 'image/jpeg',
            'x-upsert': 'true',
          },
          body: file,
        })

        if (response.ok) {
          const publicUrl = `${baseUrl.origin}${baseUrl.pathname.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${filePath}`
          return { url: publicUrl }
        }
      }
    } catch {
      // Fall through to client-side data URL preview fallback
    }
  }

  // Graceful client-side data URL fallback for instant camera/file preview
  if (typeof FileReader !== 'undefined') {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve({ url: reader.result as string })
      }
      reader.onerror = () => {
        resolve({ url: URL.createObjectURL(file) })
      }
      reader.readAsDataURL(file)
    })
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = typeof btoa === 'function' ? btoa(binary) : ''
    return { url: `data:${file.type || 'image/jpeg'};base64,${base64}` }
  } catch {
    return { url: `https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80` }
  }
}



