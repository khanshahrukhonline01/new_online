/**
 * catalogueQueryCache.test.ts
 *
 * Verifies in-flight deduplication, 60s TTL caching, and cache invalidation
 * across concurrent callers of catalogueQueryCache.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetSports = vi.fn()
const mockGetOpportunities = vi.fn()
const mockGetVenues = vi.fn()
const mockGetPickupGames = vi.fn()
const mockGetAcademies = vi.fn()
const mockGetCities = vi.fn()
const mockGetAnnouncements = vi.fn()
const mockGetCoaches = vi.fn()
const mockClearCache = vi.fn()

vi.mock('../../integrations/supabase/public-client', () => ({
  getSports: mockGetSports,
  getOpportunities: mockGetOpportunities,
  getVenues: mockGetVenues,
  getPickupGames: mockGetPickupGames,
  getAcademies: mockGetAcademies,
  getCities: mockGetCities,
  getAnnouncements: mockGetAnnouncements,
  getCoaches: mockGetCoaches,
  clearCatalogueCache: mockClearCache,
}))

function readyResult<T>(data: T[]) {
  return { status: 'ready' as const, data }
}

function setupMocks() {
  mockGetSports.mockResolvedValue(readyResult([{ id: '1', name: 'Cricket', slug: 'cricket' }]))
  mockGetOpportunities.mockResolvedValue(readyResult([]))
  mockGetVenues.mockResolvedValue(readyResult([]))
  mockGetPickupGames.mockResolvedValue(readyResult([]))
  mockGetAcademies.mockResolvedValue(readyResult([]))
  mockGetCities.mockResolvedValue(readyResult([{ name: 'Mumbai', slug: 'mumbai' }]))
  mockGetAnnouncements.mockResolvedValue(readyResult([]))
  mockGetCoaches.mockResolvedValue(readyResult([]))
}

describe('catalogueQueryCache', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    setupMocks()
    const cache = await import('./catalogueQueryCache')
    cache.invalidateSharedCatalogue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deduplicates concurrent per-resource fetches so public-client is called only once', async () => {
    const { getCachedSports } = await import('./catalogueQueryCache')
    const [r1, r2, r3] = await Promise.all([getCachedSports(), getCachedSports(), getCachedSports()])

    expect(r1.status).toBe('ready')
    expect(r2.data).toHaveLength(1)
    expect(r3.data).toEqual(r1.data)
    expect(mockGetSports).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent fetchSharedCatalogue calls across multiple consumers', async () => {
    const { fetchSharedCatalogue } = await import('./catalogueQueryCache')
    const [b1, b2, b3] = await Promise.all([
      fetchSharedCatalogue(),
      fetchSharedCatalogue(),
      fetchSharedCatalogue(),
    ])

    expect(b1.sports).toHaveLength(1)
    expect(b2.cities).toHaveLength(1)
    expect(b3).toEqual(b1)
    expect(mockGetSports).toHaveBeenCalledTimes(1)
    expect(mockGetOpportunities).toHaveBeenCalledTimes(1)
    expect(mockGetVenues).toHaveBeenCalledTimes(1)
    expect(mockGetCoaches).toHaveBeenCalledTimes(1)
  })

  it('returns cached result on subsequent calls within TTL window', async () => {
    const { getCachedCities } = await import('./catalogueQueryCache')
    await getCachedCities()
    await getCachedCities()
    expect(mockGetCities).toHaveBeenCalledTimes(1)
  })

  it('invalidateSharedCatalogue clears cached state and triggers fresh fetches', async () => {
    const { getCachedSports, invalidateSharedCatalogue } = await import('./catalogueQueryCache')
    await getCachedSports()
    expect(mockGetSports).toHaveBeenCalledTimes(1)

    invalidateSharedCatalogue()
    await getCachedSports()

    expect(mockGetSports).toHaveBeenCalledTimes(2)
    expect(mockClearCache).toHaveBeenCalled()
  })

  it('handles individual rejected calls gracefully inside fetchSharedCatalogue', async () => {
    const { fetchSharedCatalogue, invalidateSharedCatalogue } = await import('./catalogueQueryCache')
    invalidateSharedCatalogue()
    mockGetSports.mockRejectedValueOnce(new Error('Network error'))

    const bundle = await fetchSharedCatalogue()
    expect(bundle.sports).toEqual([])
    expect(bundle.cities).toHaveLength(1)
  })
})
