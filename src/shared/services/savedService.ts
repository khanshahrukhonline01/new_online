import { useState, useEffect, useCallback } from 'react'
import {
  BASELINE_SAVED_ITEMS,
  STORAGE_SAVED_KEY,
  STORAGE_CHRONICLE_KEY,
  type SavedItem,
} from '../../modules/saved/savedData'
import type { Opportunity, Venue, Academy } from '../domain'

export const STORAGE_SAVED_RECORDS_KEY = 'khelgrid_saved_records_v1'
export const STORAGE_SAVED_IDS_V1 = 'khelgrid_saved_items_v1'
export const SAVED_EVENT_NAME = 'khelgrid-saved-changed'

const inMemoryStore = new Map<string, string>()
const memoryListeners = new Set<(items: SavedItem[]) => void>()

interface StorageAdapter {
  getItem: (key: string) => string | null
  setItem: (key: string, val: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

function getStorage(): StorageAdapter {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // fallback
  }
  return {
    getItem: (key: string) => inMemoryStore.get(key) || null,
    setItem: (key: string, val: string) => { inMemoryStore.set(key, val) },
    removeItem: (key: string) => { inMemoryStore.delete(key) },
    clear: () => { inMemoryStore.clear() },
  }
}

/**
 * Safely reads saved items from storage, falling back to BASELINE_SAVED_ITEMS
 */
export function getSavedItems(): SavedItem[] {
  const storage = getStorage()
  try {
    const raw = storage.getItem(STORAGE_SAVED_RECORDS_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as SavedItem[]
      if (Array.isArray(parsed)) {
        return parsed
      }
    }

    // Migrate from legacy ID list if available
    const legacyIdsRaw = storage.getItem(STORAGE_SAVED_KEY)
    if (legacyIdsRaw) {
      const legacyIds = new Set(JSON.parse(legacyIdsRaw) as string[])
      if (legacyIds.size > 0) {
        const filtered = BASELINE_SAVED_ITEMS.filter(item => legacyIds.has(item.id))
        if (filtered.length > 0) {
          syncToStorage(filtered)
          return filtered
        }
      }
    }

    // Initialize baseline items on first visit
    syncToStorage(BASELINE_SAVED_ITEMS)
    return BASELINE_SAVED_ITEMS
  } catch {
    return BASELINE_SAVED_ITEMS
  }
}

/**
 * Returns a Set of all currently saved item IDs
 */
export function getSavedIds(): Set<string> {
  return new Set(getSavedItems().map(item => item.id))
}

/**
 * Checks if a specific item is saved
 */
export function isItemSaved(id: string): boolean {
  return getSavedIds().has(id)
}

/**
 * Internal helper to keep localStorage and backwards-compatible legacy keys in sync
 */
function syncToStorage(items: SavedItem[]) {
  const storage = getStorage()
  try {
    storage.setItem(STORAGE_SAVED_RECORDS_KEY, JSON.stringify(items))
    const ids = items.map(item => item.id)
    storage.setItem(STORAGE_SAVED_KEY, JSON.stringify(ids))
    storage.setItem(STORAGE_SAVED_IDS_V1, JSON.stringify(ids))
  } catch {
    // ignore quota errors
  }
}

/**
 * Dispatches a notification to all subscribers and window listeners
 */
function dispatchSavedChanged(items: SavedItem[]) {
  // 1. Notify in-memory listeners
  memoryListeners.forEach(listener => {
    try {
      listener(items)
    } catch {
      // ignore
    }
  })

  // 2. Notify window CustomEvent if in browser
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(SAVED_EVENT_NAME, {
          detail: {
            items,
            count: items.length,
            savedIds: items.map(i => i.id),
          },
        }),
      )
    } catch {
      // fallback
    }
  }
}

/**
 * Saves a new item to bookmarks
 */
export function saveItem(item: SavedItem): void {
  const current = getSavedItems()
  if (current.some(existing => existing.id === item.id)) {
    return // Already saved
  }
  const next = [item, ...current]
  syncToStorage(next)
  dispatchSavedChanged(next)
}

/**
 * Removes an item from bookmarks
 */
export function removeSavedItem(id: string): void {
  const current = getSavedItems()
  const next = current.filter(item => item.id !== id)
  syncToStorage(next)
  dispatchSavedChanged(next)
}

/**
 * 1-Tap toggle helper: saves if not present, removes if already present.
 * Returns true if now saved, false if removed.
 */
export function toggleSaveItem(item: SavedItem): boolean {
  if (isItemSaved(item.id)) {
    removeSavedItem(item.id)
    return false
  } else {
    saveItem(item)
    return true
  }
}

/**
 * Clears all saved items
 */
export function clearAllSavedItems(): void {
  syncToStorage([])
  const storage = getStorage()
  try {
    storage.removeItem(STORAGE_CHRONICLE_KEY)
  } catch {
    // ignore
  }
  dispatchSavedChanged([])
}

/**
 * Subscribes to saved items changes across components and browser tabs
 */
export function subscribeSavedItems(listener: (items: SavedItem[]) => void): () => void {
  memoryListeners.add(listener)

  let handleCustomEvent: ((e: Event) => void) | undefined
  let handleStorageEvent: ((e: StorageEvent) => void) | undefined

  if (typeof window !== 'undefined') {
    handleCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<{ items: SavedItem[] }>
      if (custom.detail?.items) {
        listener(custom.detail.items)
      } else {
        listener(getSavedItems())
      }
    }

    handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_SAVED_RECORDS_KEY || e.key === STORAGE_SAVED_KEY) {
        listener(getSavedItems())
      }
    }

    window.addEventListener(SAVED_EVENT_NAME, handleCustomEvent)
    window.addEventListener('storage', handleStorageEvent)
  }

  // Deliver current state immediately
  try {
    listener(getSavedItems())
  } catch {
    // ignore initial callback error
  }

  return () => {
    memoryListeners.delete(listener)
    if (typeof window !== 'undefined') {
      if (handleCustomEvent) window.removeEventListener(SAVED_EVENT_NAME, handleCustomEvent)
      if (handleStorageEvent) window.removeEventListener('storage', handleStorageEvent)
    }
  }
}

/**
 * Universal React hook for components needing dynamic bookmarking state
 */
export function useSavedItems() {
  const [items, setItems] = useState<SavedItem[]>(() => getSavedItems())

  useEffect(() => {
    return subscribeSavedItems(nextItems => {
      setItems(nextItems)
    })
  }, [])

  const savedIds = useCallback(() => new Set(items.map(i => i.id)), [items])

  const checkIsSaved = useCallback(
    (id: string) => {
      return items.some(i => i.id === id)
    },
    [items],
  )

  const toggle = useCallback((item: SavedItem) => {
    return toggleSaveItem(item)
  }, [])

  const remove = useCallback((id: string) => {
    removeSavedItem(id)
  }, [])

  const clear = useCallback(() => {
    clearAllSavedItems()
  }, [])

  return {
    items,
    count: items.length,
    savedIds: savedIds(),
    isSaved: checkIsSaved,
    toggleSave: toggle,
    removeSave: remove,
    clearAll: clear,
  }
}

/* =========================================================================
   Factory Helpers: Convert diverse domain entities to standard SavedItem
   ========================================================================= */

export function createOpportunitySavedItem(opp: Opportunity): SavedItem {
  const deadlineStr = opp.application_deadline
  const sportName = typeof opp.sport === 'string' ? opp.sport : opp.sport?.name || 'Multi-Sport'
  return {
    id: opp.id,
    title: opp.title,
    category: 'trial',
    categoryLabel: 'Selection Trial',
    sport: sportName,
    city: opp.city || 'India',
    location: opp.venue_name || opp.city || 'India',
    dateOrDeadline: deadlineStr ? `Closing ${deadlineStr.slice(0, 10)}` : 'Active Trial',
    deadlineDate: deadlineStr ? deadlineStr : undefined,
    badgeText: opp.verification_status === 'verified' ? 'Verified Trial' : 'Community Trial',
    feeOrPrice: opp.registration_fee !== undefined ? `₹${opp.registration_fee}` : 'Free Entry',
    organizerOrAuthor: opp.organizer_name || 'Official Association',
    href: `/opportunities`,
    savedAt: new Date().toISOString(),
  }
}

export function createVenueSavedItem(venue: Venue): SavedItem {
  return {
    id: venue.id,
    title: venue.name,
    category: 'venue',
    categoryLabel: 'Sports Venue / Turf',
    sport: venue.sport || 'Multi-Sport',
    city: venue.city,
    location: venue.address || venue.city,
    dateOrDeadline: 'Open Daily',
    badgeText: venue.verification_status === 'verified' ? 'Verified Turf' : 'Sports Complex',
    feeOrPrice: venue.pricing || '₹500 - ₹1,500/hr',
    rating: venue.rating || 4.8,
    organizerOrAuthor: venue.city,
    href: `/venues/${encodeURIComponent(venue.slug)}`,
    savedAt: new Date().toISOString(),
  }
}

export function createAcademySavedItem(academy: Academy): SavedItem {
  return {
    id: academy.id,
    title: academy.name,
    category: 'academy',
    categoryLabel: 'Sports Academy',
    sport: academy.sport || 'Multi-Sport',
    city: academy.city,
    location: academy.address || academy.city,
    dateOrDeadline: academy.admission_open ? 'Admissions Open' : 'Inquire Batches',
    badgeText: academy.verification_status === 'verified' ? 'Verified Academy' : 'Training Academy',
    feeOrPrice: academy.fee_structure || 'Fee on Request',
    rating: academy.rating || 4.9,
    organizerOrAuthor: academy.head_coach || academy.city,
    href: `/academies/${encodeURIComponent(academy.slug)}`,
    savedAt: new Date().toISOString(),
  }
}

export function createCoachSavedItem(coach: {
  id: string
  name?: string
  display_name?: string
  sport?: string
  city: string
  certification?: string
  monthly_fee?: string
  monthlyFee?: string
  rating?: number
  academy_affiliation?: string
  academyAffiliation?: string
  slug?: string
}): SavedItem {
  return {
    id: coach.id,
    title: coach.name || coach.display_name || 'Sports Coach',
    category: 'coach',
    categoryLabel: 'Certified Coach',
    sport: coach.sport || 'Multi-Sport',
    city: coach.city,
    location: coach.academy_affiliation || coach.academyAffiliation || coach.city,
    dateOrDeadline: 'Available for Training',
    badgeText: coach.certification || 'Certified Coach',
    feeOrPrice: coach.monthly_fee || coach.monthlyFee || '₹3,000 / month',
    rating: coach.rating || 4.8,
    organizerOrAuthor: coach.certification || 'Head Coach',
    href: `/coaches`,
    savedAt: new Date().toISOString(),
  }
}

export function createPickupGameSavedItem(game: {
  id: string
  sport: string
  venue_name?: string
  venueName?: string
  city: string
  spots_open?: number
  spotsOpen?: number
  price_per_player?: string
  pricePerPlayer?: string
  time_label?: string
  timeLabel?: string
  host_name?: string
  hostName?: string
}): SavedItem {
  const venue = game.venue_name || game.venueName || 'Sports Arena'
  const spots = game.spots_open ?? game.spotsOpen ?? 2
  const price = game.price_per_player || game.pricePerPlayer || '₹200/player'
  const time = game.time_label || game.timeLabel || 'Today'
  const host = game.host_name || game.hostName || 'Host'

  return {
    id: game.id,
    title: `${game.sport} Match at ${venue}`,
    category: 'pickup',
    categoryLabel: 'Community Match',
    sport: game.sport,
    city: game.city,
    location: `${venue}, ${game.city}`,
    dateOrDeadline: time,
    badgeText: `${spots} spots open`,
    feeOrPrice: price,
    organizerOrAuthor: `Host: ${host}`,
    href: `/play`,
    savedAt: new Date().toISOString(),
  }
}
