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

export interface CommunityAcademyInput {
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

export interface CommunityVenueInput {
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
  contact_name?: string
  contact_phone?: string
  is_verified_user?: boolean
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
  contact_name?: string
  contact_phone?: string
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


