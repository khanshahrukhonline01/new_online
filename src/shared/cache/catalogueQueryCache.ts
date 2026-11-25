/**
 * catalogueQueryCache.ts
 *
 * Shared per-resource & bundle query deduplication + TTL cache layer on top of
 * `public-client.ts`. Multiple callers (HomePage, SpotlightSearchModal,
 * NotificationCenterDrawer, SiteAnnouncementBanner, ForYouPage) mounting on
 * the same tick share the exact same in-flight promise and 60s cached payload.
 */

import { useEffect, useReducer, useRef } from 'react'
import {
  getSports,
  getOpportunities,
  getVenues,
  getPickupGames,
  getAcademies,
  getCities,
  getAnnouncements,
  getCoaches,
  clearCatalogueCache as _clearPublicCatalogueCache,
  type CatalogueResult,
  type DatabaseAnnouncement,
  type DatabaseCity,
  type DatabasePickupGame,
} from '../../integrations/supabase/public-client'
import type { Academy, Coach, Opportunity, Sport, Venue } from '../domain'

export { clearCatalogueCache } from '../../integrations/supabase/public-client'

const SHARED_TTL_MS = 60_000

interface ResourceEntry<T> {
  timestamp: number
  result?: CatalogueResult<T>
  inFlight?: Promise<CatalogueResult<T>>
}

const resourceCache = new Map<string, ResourceEntry<unknown>>()

function fetchWithDedup<T>(key: string, fetcher: () => Promise<CatalogueResult<T>>): Promise<CatalogueResult<T>> {
  const existing = resourceCache.get(key) as ResourceEntry<T> | undefined
  const now = Date.now()

  if (existing?.result && now - existing.timestamp < SHARED_TTL_MS) {
    return Promise.resolve(existing.result)
  }
  if (existing?.inFlight) {
    return existing.inFlight
  }

  const entry: ResourceEntry<T> = { timestamp: 0 }
  const promise = fetcher()
    .then(res => {
      entry.result = res
      entry.timestamp = Date.now()
      entry.inFlight = undefined
      return res
    })
    .catch((err: unknown) => {
      entry.inFlight = undefined
      resourceCache.delete(key)
      throw err
    })

  entry.inFlight = promise
  resourceCache.set(key, entry as ResourceEntry<unknown>)
  return promise
}

export function getCachedSports(): Promise<CatalogueResult<Sport>> {
  return fetchWithDedup('sports', getSports)
}

export function getCachedOpportunities(): Promise<CatalogueResult<Opportunity>> {
  return fetchWithDedup('opportunities', getOpportunities)
}

export function getCachedVenues(): Promise<CatalogueResult<Venue>> {
  return fetchWithDedup('venues', getVenues)
}

export function getCachedPickupGames(): Promise<CatalogueResult<DatabasePickupGame>> {
  return fetchWithDedup('pickup_games', getPickupGames)
}

export function getCachedAcademies(): Promise<CatalogueResult<Academy>> {
  return fetchWithDedup('academies', getAcademies)
}

export function getCachedCities(): Promise<CatalogueResult<DatabaseCity>> {
  return fetchWithDedup('cities', getCities)
}

export function getCachedAnnouncements(): Promise<CatalogueResult<DatabaseAnnouncement>> {
  return fetchWithDedup('announcements', getAnnouncements)
}

export function getCachedCoaches(): Promise<CatalogueResult<Coach>> {
  return fetchWithDedup('coaches', getCoaches)
}

export interface CatalogueData {
  sports: Sport[]
  opportunities: Opportunity[]
  venues: Venue[]
  pickupGames: DatabasePickupGame[]
  academies: Academy[]
  cities: DatabaseCity[]
  announcements: DatabaseAnnouncement[]
  coaches: Coach[]
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface CatalogueState {
  data: CatalogueData
  loadState: LoadState
  error: string | null
}

type CatalogueAction =
  | { type: 'LOADING' }
  | { type: 'READY'; payload: CatalogueData }
  | { type: 'ERROR'; payload: string }

const EMPTY: CatalogueData = {
  sports: [],
  opportunities: [],
  venues: [],
  pickupGames: [],
  academies: [],
  cities: [],
  announcements: [],
  coaches: [],
}

function reducer(state: CatalogueState, action: CatalogueAction): CatalogueState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loadState: 'loading', error: null }
    case 'READY':
      return { data: action.payload, loadState: 'ready', error: null }
    case 'ERROR':
      return { ...state, loadState: 'error', error: action.payload }
    default:
      return state
  }
}

let _sharedPromise: Promise<CatalogueData> | null = null
let _sharedResult: CatalogueData | null = null
let _sharedTimestamp = 0

export function fetchSharedCatalogue(): Promise<CatalogueData> {
  const now = Date.now()
  if (_sharedResult && now - _sharedTimestamp < SHARED_TTL_MS) {
    return Promise.resolve(_sharedResult)
  }
  if (_sharedPromise) return _sharedPromise

  _sharedPromise = Promise.allSettled([
    getCachedSports(),
    getCachedOpportunities(),
    getCachedVenues(),
    getCachedPickupGames(),
    getCachedAcademies(),
    getCachedCities(),
    getCachedAnnouncements(),
    getCachedCoaches(),
  ])
    .then(([sports, opps, venues, games, academies, cities, ann, coaches]) => {
      const data: CatalogueData = {
        sports: sports.status === 'fulfilled' ? sports.value.data : [],
        opportunities: opps.status === 'fulfilled' ? opps.value.data : [],
        venues: venues.status === 'fulfilled' ? venues.value.data : [],
        pickupGames: games.status === 'fulfilled' ? games.value.data : [],
        academies: academies.status === 'fulfilled' ? academies.value.data : [],
        cities: cities.status === 'fulfilled' ? cities.value.data : [],
        announcements: ann.status === 'fulfilled' ? ann.value.data : [],
        coaches: coaches.status === 'fulfilled' ? coaches.value.data : [],
      }
      _sharedResult = data
      _sharedTimestamp = Date.now()
      _sharedPromise = null
      return data
    })
    .catch((err: unknown) => {
      _sharedPromise = null
      throw err
    })

  return _sharedPromise
}

/** Invalidate both per-resource shared cache and public-client underlying cache. */
export function invalidateSharedCatalogue(): void {
  resourceCache.clear()
  _sharedResult = null
  _sharedTimestamp = 0
  _sharedPromise = null
  _clearPublicCatalogueCache()
}

const INITIAL_STATE: CatalogueState = { data: EMPTY, loadState: 'idle', error: null }

export function useSharedCatalogueData() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    dispatch({ type: 'LOADING' })

    fetchSharedCatalogue()
      .then(data => {
        if (mounted.current) dispatch({ type: 'READY', payload: data })
      })
      .catch((err: unknown) => {
        if (mounted.current) {
          dispatch({ type: 'ERROR', payload: err instanceof Error ? err.message : 'Catalogue unavailable' })
        }
      })

    return () => {
      mounted.current = false
    }
  }, [])

  return {
    data: state.data,
    loadState: state.loadState,
    isLoading: state.loadState === 'loading' || state.loadState === 'idle',
    isReady: state.loadState === 'ready',
    error: state.error,
  }
}
