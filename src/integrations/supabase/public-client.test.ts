import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const validUrl = 'https://example.supabase.co'
const anonKey = 'public-anon-key'

async function loadClient(url = validUrl, key = anonKey) {
  vi.resetModules()
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', key)
  return import('./public-client')
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('public catalogue client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns an explicit unconfigured state when credentials are missing', async () => {
    const client = await loadClient(validUrl, '')
    expect(await client.getSports()).toEqual({ status: 'unconfigured', data: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects malformed catalogue URLs without making a request', async () => {
    const client = await loadClient('not-a-url')
    const result = await client.getSports()
    expect(result.status).toBe('unavailable')
    expect(result.data).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requires HTTPS outside localhost', async () => {
    const client = await loadClient('http://catalogue.example.com')
    const result = await client.getSports()
    expect(result.status).toBe('unavailable')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('allows HTTP for local development', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))
    const client = await loadClient('http://localhost:54321')
    const result = await client.getSports()
    expect(result).toEqual({ status: 'ready', data: [] })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it.each([
    ['sports', 'is_published', 'eq.true'],
    ['opportunities', 'publication_status', 'eq.published'],
    ['venues', 'publication_status', 'eq.published'],
    ['academies', 'publication_status', 'eq.published'],
    ['coaches', 'publication_status', 'eq.published'],
    ['events', 'publication_status', 'eq.published'],
  ] as const)('queries published %s with bounded results', async (table, filterKey, filterValue) => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([{ id: 'record-1' }]))
    const client = await loadClient()
    const result = table === 'sports'
      ? await client.getSports()
      : table === 'opportunities'
        ? await client.getOpportunities()
        : table === 'venues'
          ? await client.getVenues()
          : table === 'academies'
            ? await client.getAcademies()
            : table === 'coaches'
              ? await client.getCoaches()
              : await client.getEvents()

    expect(result).toEqual({ status: 'ready', data: [{ id: 'record-1' }] })
    const [requestUrl, options] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.pathname).toBe(`/rest/v1/${table}`)
    expect(url.searchParams.get(filterKey)).toBe(filterValue)
    expect(url.searchParams.get('limit')).toBe('1000')
    expect(options?.headers).toMatchObject({
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    })
  })

  it('excludes rejected opportunities from public results', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))
    const client = await loadClient()
    await client.getOpportunities()
    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]))
    expect(requestUrl.searchParams.get('verification_status')).toBe('neq.rejected')
  })

  it('returns an empty ready catalogue when the database has no published rows', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([]))
    const client = await loadClient()
    expect(await client.getVenues()).toEqual({ status: 'ready', data: [] })
  })

  it('queries dynamic public.cities catalogue', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([{ slug: 'delhi', name: 'Delhi', is_metro: true }]))
    const client = await loadClient()
    const result = await client.getCities()
    expect(result).toEqual({ status: 'ready', data: [{ slug: 'delhi', name: 'Delhi', is_metro: true }] })
    const [requestUrl] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.pathname).toBe('/rest/v1/cities')
    expect(url.searchParams.get('limit')).toBe('1000')
  })

  it('returns unavailable when Supabase rejects the request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: 'permission denied' }, 403))
    const client = await loadClient()
    const result = await client.getVenues()
    expect(result.status).toBe('unavailable')
    expect(result.data).toEqual([])
    expect('message' in result && result.message.length).toBeGreaterThan(0)
  })

  it('returns unavailable when the response is not an array', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ data: [] }))
    const client = await loadClient()
    const result = await client.getSports()
    expect(result.status).toBe('unavailable')
    expect(result.data).toEqual([])
  })

  it('returns unavailable when the network request fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
    const client = await loadClient()
    const result = await client.getOpportunities()
    expect(result.status).toBe('unavailable')
    expect(result.data).toEqual([])
  })

  it('falls back to secondary query when is_featured column is not yet present on remote DB', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: 'column is_featured does not exist' }, 400))
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([{ id: 'opp-1', title: 'SAI Trial' }]))
    const client = await loadClient()
    const result = await client.getOpportunities()
    expect(result).toEqual({ status: 'ready', data: [{ id: 'opp-1', title: 'SAI Trial' }] })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('queries venues and academies with is_featured in select and order', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([{ id: 'v-1', name: 'Kanteerava', is_featured: true }]))
    const client = await loadClient()
    const result = await client.getVenues()
    expect(result).toEqual({ status: 'ready', data: [{ id: 'v-1', name: 'Kanteerava', is_featured: true }] })
    const [requestUrl] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.searchParams.get('select')).toContain('is_featured')
    expect(url.searchParams.get('order')).toContain('is_featured.desc')
  })

  it('queries dynamic public.pickup_games catalogue', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([{ id: 'pg-1', sport: 'Pickleball', city: 'Bengaluru', is_featured: true }]))
    const client = await loadClient()
    const result = await client.getPickupGames()
    expect(result).toEqual({ status: 'ready', data: [{ id: 'pg-1', sport: 'Pickleball', city: 'Bengaluru', is_featured: true }] })
    const [requestUrl] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.pathname).toBe('/rest/v1/pickup_games')
    expect(url.searchParams.get('publication_status')).toBe('eq.published')
    expect(url.searchParams.get('order')).toContain('is_featured.desc')
  })
})
