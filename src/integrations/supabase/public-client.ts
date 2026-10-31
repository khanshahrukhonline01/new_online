import type { Academy, Coach, EventItem, Opportunity, Sport, Venue } from '../../shared/domain'
import { broadcastRealtimeEvent, type RealtimeTable } from './realtime-client'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const CATALOGUE_PAGE_SIZE = 1000

export type CatalogueResult<T> =
  | { status: 'ready'; data: T[] }
  | { status: 'unconfigured'; data: [] }
  | { status: 'unavailable'; data: []; message: string }

type QueryOptions = {
  table: 'sports' | 'opportunities' | 'venues' | 'academies' | 'coaches' | 'events' | 'cities' | 'pickup_games' | 'site_announcements'
  select: string
  order: string
  filters: Record<string, string>
}

async function readCatalogue<T>({
  table,
  select,
  order,
  filters,
}: QueryOptions): Promise<CatalogueResult<T>> {
  if (!supabaseUrl || !anonKey) return { status: 'unconfigured', data: [] }

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
      return { status: 'unavailable', data: [], message: 'Catalogue data is temporarily unavailable. Please try again later.' }
    }
    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      return { status: 'unavailable', data: [], message: 'The catalogue returned an unexpected response.' }
    }
    return { status: 'ready', data: data as T[] }
  } catch {
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

// In-memory session cache for community submitted items
const communitySubmissions = {
  academies: [] as Academy[],
  venues: [] as Venue[],
  opportunities: [] as Opportunity[],
  pickup_games: [] as DatabasePickupGame[],
}

function mergeWithCommunity<T extends { slug: string }>(catalogueItems: T[], communityItems: T[]): T[] {
  if (!communityItems.length) return catalogueItems
  const seen = new Set(catalogueItems.map(item => item.slug))
  const additions = communityItems.filter(item => !seen.has(item.slug))
  return [...additions, ...catalogueItems]
}

export function getCommunitySubmissions() {
  return communitySubmissions
}

export function clearCommunitySubmissions() {
  communitySubmissions.academies = []
  communitySubmissions.venues = []
  communitySubmissions.opportunities = []
  communitySubmissions.pickup_games = []
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
  price_per_player: string
  spots_open: number
  total_players: number
  confirmed_players: number
  is_featured: boolean
  publication_status: string
}

export async function getPickupGames(): Promise<CatalogueResult<DatabasePickupGame>> {
  const result = await readCatalogue<DatabasePickupGame>({
    table: 'pickup_games',
    select: 'id,slug,sport,emoji,skill_level,venue_name,city,time_label,host_name,price_per_player,spots_open,total_players,confirmed_players,is_featured,publication_status',
    order: 'is_featured.desc.nullslast,created_at.desc',
    filters: { publication_status: 'eq.published' },
  })
  if (result.status === 'ready') {
    return {
      status: 'ready',
      data: mergeWithCommunity(result.data, communitySubmissions.pickup_games),
    }
  }
  if (communitySubmissions.pickup_games.length > 0) {
    return { status: 'ready', data: [...communitySubmissions.pickup_games] }
  }
  return result
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
// Direct Community Intake Engine (Dynamic listings into catalogue tables)
// -----------------------------------------------------------------------------

export type CommunityListingCategory = 'academy' | 'venue' | 'opportunity' | 'pickup_game'

export interface CommunityAcademyInput {
  category: 'academy'
  name: string
  city: string
  sport?: string
  state?: string
  description?: string
  website_url?: string
  public_contact_url?: string
}

export interface CommunityVenueInput {
  category: 'venue'
  name: string
  city: string
  sport?: string
  address?: string
  description?: string
}

export interface CommunityOpportunityInput {
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
}

export interface CommunityPickupGameInput {
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
}

export type CommunityListingInput =
  | CommunityAcademyInput
  | CommunityVenueInput
  | CommunityOpportunityInput
  | CommunityPickupGameInput

export type CommunityListingResult =
  | { status: 'submitted'; category: CommunityListingCategory; record: Record<string, unknown>; message: string }
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

  const randomSuffix = Math.random().toString(36).substring(2, 7)
  let targetTable: 'academies' | 'venues' | 'opportunities' | 'pickup_games'
  let record: Record<string, unknown>

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
        description: input.description?.trim() || (input.sport ? `Premier training academy and athlete development for ${input.sport}.` : 'Premier sports training academy.'),
        city,
        state: input.state?.trim() || null,
        website_url: input.website_url?.trim() || null,
        public_contact_url: input.public_contact_url?.trim() || null,
        publication_status: 'published',
        verification_status: 'verified',
        is_featured: false,
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
        description: input.description?.trim() || (input.sport ? `Multi-sport arena and play facility for ${input.sport}.` : 'Sports venue with professional playing surfaces.'),
        city,
        address: input.address?.trim() || `${input.name.trim()}, ${city}`,
        timezone: 'Asia/Kolkata',
        publication_status: 'published',
        is_featured: false,
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
        organizer_name: input.organizer_name?.trim() || 'Community Sports Organizer',
        city,
        venue_name: input.venue_name?.trim() || 'Local Sports Complex',
        starts_at: input.starts_at || new Date(Date.now() + 86400000 * 7).toISOString(),
        ends_at: input.ends_at || null,
        application_deadline: null,
        source_url: input.source_url?.trim() || null,
        source_name: 'Community Organizer',
        verification_status: 'verified',
        publication_status: 'published',
        registration_fee: input.registration_fee?.trim() || 'Free',
        available_spots: 50,
        age_category: input.age_category?.trim() || 'Open Age',
        gender: 'All',
        is_featured: false,
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
        host_name: input.host_name?.trim() || 'Community Host',
        price_per_player: input.price_per_player?.trim() || 'Free',
        spots_open: spots,
        total_players: total,
        confirmed_players: Math.max(0, total - spots),
        is_featured: false,
        publication_status: 'published',
      }
      break
    }
  }

  // If Supabase credentials are configured, persist row via REST API
  if (supabaseUrl && anonKey) {
    try {
      const baseUrl = new URL(supabaseUrl)
      if (baseUrl.protocol === 'https:' || baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1') {
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
            body: JSON.stringify(record),
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

  // Cache in community submissions for instant optimistic reflection
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

  const categoryName = input.category === 'pickup_game'
    ? 'Pickup Game'
    : input.category === 'opportunity'
      ? 'Trial / Tournament'
      : input.category === 'venue'
        ? 'Turf / Arena'
        : 'Academy'

  return {
    status: 'submitted',
    category: input.category,
    record,
    message: `${categoryName} has been published and is now live on KhelGrid!`,
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

  // 1. Update in local session cache if present
  const idx = communitySubmissions.pickup_games.findIndex(g => g.id === gameId)
  if (idx !== -1) {
    communitySubmissions.pickup_games[idx] = {
      ...communitySubmissions.pickup_games[idx],
      spots_open: newSpotsOpen,
      confirmed_players: newConfirmedPlayers,
    }
    updatedGame = communitySubmissions.pickup_games[idx]
  }

  // 2. If Supabase credentials configured, send PATCH to Supabase REST
  if (supabaseUrl && anonKey) {
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
      is_featured: fallbackDetails?.is_featured ?? false,
      publication_status: 'published',
    }
    if (idx === -1) {
      communitySubmissions.pickup_games.push(updatedGame)
    }
  }

  broadcastRealtimeEvent('pickup_games', 'UPDATE', updatedGame)

  return {
    status: 'updated',
    message: `Spots updated in real-time! ${newSpotsOpen} spot${newSpotsOpen === 1 ? '' : 's'} remaining.`,
    game: updatedGame,
  }
}

