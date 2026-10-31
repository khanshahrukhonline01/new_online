import type { Academy, Coach, EventItem, Opportunity, Sport, Venue } from '../../shared/domain'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const CATALOGUE_PAGE_SIZE = 1000

export type CatalogueResult<T> =
  | { status: 'ready'; data: T[] }
  | { status: 'unconfigured'; data: [] }
  | { status: 'unavailable'; data: []; message: string }

type QueryOptions = {
  table: 'sports' | 'opportunities' | 'venues' | 'academies' | 'coaches' | 'events' | 'cities' | 'pickup_games'
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

export async function getOpportunities(): Promise<CatalogueResult<Opportunity>> {
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

export async function getVenues(): Promise<CatalogueResult<Venue>> {
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

export async function getAcademies(): Promise<CatalogueResult<Academy>> {
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

export function getPickupGames() {
  return readCatalogue<DatabasePickupGame>({
    table: 'pickup_games',
    select: 'id,slug,sport,emoji,skill_level,venue_name,city,time_label,host_name,price_per_player,spots_open,total_players,confirmed_players,is_featured,publication_status',
    order: 'is_featured.desc.nullslast,created_at.desc',
    filters: { publication_status: 'eq.published' },
  })
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
