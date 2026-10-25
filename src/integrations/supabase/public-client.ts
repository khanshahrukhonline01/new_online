import type { Opportunity, Sport, Venue } from '../../shared/domain'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export type CatalogueResult<T> =
  | { status: 'ready'; data: T[] }
  | { status: 'unconfigured'; data: [] }
  | { status: 'unavailable'; data: []; message: string }

async function readCatalogue<T>(table: string, select: string, order: string): Promise<CatalogueResult<T>> {
  if (!supabaseUrl || !anonKey) return { status: 'unconfigured', data: [] }
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&${order}`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
    )
    if (!response.ok) return { status: 'unavailable', data: [], message: 'Catalogue data is temporarily unavailable.' }
    const data: unknown = await response.json()
    if (!Array.isArray(data)) return { status: 'unavailable', data: [], message: 'The catalogue returned an unexpected response.' }
    return { status: 'ready', data: data as T[] }
  } catch {
    return { status: 'unavailable', data: [], message: 'Could not connect to the catalogue. Check your connection and try again.' }
  }
}

export function getSports() {
  return readCatalogue<Sport>('sports', 'id,slug,name', 'order=name.asc')
}

export function getOpportunities() {
  return readCatalogue<Opportunity>(
    'opportunities',
    'id,slug,title,opportunity_type,organizer_name,city,venue_name,starts_at,ends_at,application_deadline,source_url,source_name,verification_status',
    'order=starts_at.asc.nullslast',
  )
}

export function getVenues() {
  return readCatalogue<Venue>(
    'venues',
    'id,slug,name,description,city,address,timezone',
    'order=name.asc',
  )
}
