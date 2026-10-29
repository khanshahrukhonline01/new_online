import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const validUrl = 'https://example.supabase.co'
const anonKey = 'public-anon-key'

async function loadClient(url = validUrl, key = anonKey) {
  vi.resetModules()
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', key)
  return import('./public-client')
}

describe('listing suggestion submission', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('does not send data when Supabase is unconfigured', async () => {
    const client = await loadClient(validUrl, '')
    expect(await client.submitListingSuggestion({
      listing_type: 'venue', title: 'Test venue', source_url: 'https://example.org',
    })).toEqual({ status: 'unconfigured' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('only accepts HTTPS source URLs', async () => {
    const client = await loadClient()
    const result = await client.submitListingSuggestion({
      listing_type: 'venue', title: 'Test venue', source_url: 'http://example.org',
    })
    expect(result.status).toBe('unavailable')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submits only user-controlled fields and relies on database defaults for review status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 201 }))
    const client = await loadClient()
    const result = await client.submitListingSuggestion({
      listing_type: 'venue',
      title: '  Test venue  ',
      city: '  Delhi  ',
      source_url: 'https://example.org/source',
      details: '  Check opening hours  ',
    })
    expect(result).toEqual({ status: 'submitted' })
    const [requestUrl, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(requestUrl)).toBe(`${validUrl}/rest/v1/listing_submissions`)
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Prefer: 'return=minimal',
    })
    expect(JSON.parse(String(options?.body))).toEqual({
      listing_type: 'venue',
      title: 'Test venue',
      city: 'Delhi',
      source_url: 'https://example.org/source',
      details: 'Check opening hours',
    })
    expect(String(options?.body)).not.toContain('status')
    expect(String(options?.body)).not.toContain('reviewed_by')
  })

  it('reports missing database migration without pretending the submission succeeded', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('not found', { status: 404 }))
    const client = await loadClient()
    const result = await client.submitListingSuggestion({
      listing_type: 'opportunity', title: 'Trial listing', source_url: 'https://example.org',
    })
    expect(result.status).toBe('unavailable')
    expect('message' in result && result.message).toContain('not installed')
  })

  it('reports server errors without leaking response bodies', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('sensitive server detail', { status: 500 }))
    const client = await loadClient()
    const result = await client.submitListingSuggestion({
      listing_type: 'event', title: 'Sports event', source_url: 'https://example.org',
    })
    expect(result).toEqual({
      status: 'unavailable',
      message: 'We could not submit this suggestion. Please try again later.',
    })
  })
})
