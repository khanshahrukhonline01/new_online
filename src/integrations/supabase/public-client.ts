import type { Opportunity, Sport, Venue } from '../../shared/domain'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const CATALOGUE_PAGE_SIZE = 100

export type CatalogueResult<T> =
  | { status: 'ready'; data: T[] }
  | { status: 'unconfigured'; data: [] }
  | { status: 'unavailable'; data: []; message: string }

type QueryOptions = {
  table: 'sports' | 'opportunities' | 'venues'
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

export function getOpportunities() {
  return readCatalogue<Opportunity>({
    table: 'opportunities',
    select: 'id,slug,title,opportunity_type,organizer_name,city,venue_name,starts_at,ends_at,application_deadline,source_url,source_name,verification_status',
    order: 'starts_at.asc.nullslast',
    filters: {
      publication_status: 'eq.published',
      verification_status: 'neq.rejected',
    },
  })
}

export function getVenues() {
  return readCatalogue<Venue>({
    table: 'venues',
    select: 'id,slug,name,description,city,address,timezone',
    order: 'name.asc',
    filters: { publication_status: 'eq.published' },
  })
}
