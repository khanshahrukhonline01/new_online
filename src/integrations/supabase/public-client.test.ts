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

  it('queries dynamic public.site_announcements catalogue', async () => {
    const mockAnnouncement = {
      id: 'ann-test',
      slug: 'test-announcement',
      badge: 'Special Event',
      title: 'National Badminton Cup',
      subtitle: 'Registrations open',
      cta_label: 'Explore',
      cta_url: '/tournaments',
      tone: 'emerald',
      starts_at: '2026-01-01T00:00:00Z',
      ends_at: null,
      priority: 100,
      is_active: true,
    }
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse([mockAnnouncement]))
    const client = await loadClient()
    const result = await client.getAnnouncements()
    expect(result.status).toBe('ready')
    expect(result.data).toEqual([mockAnnouncement])
    const [requestUrl] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.pathname).toBe('/rest/v1/site_announcements')
    expect(url.searchParams.get('is_active')).toBe('eq.true')
    expect(url.searchParams.get('order')).toContain('priority.desc')
  })


  it('validates required fields on submitCommunityListing', async () => {
    const client = await loadClient()
    const noCity = await client.submitCommunityListing({
      category: 'academy',
      name: 'Delhi Football Academy',
      city: '',
    })
    expect(noCity.status).toBe('unavailable')
    expect(noCity.message).toContain('City is required')

    const shortName = await client.submitCommunityListing({
      category: 'venue',
      name: 'A',
      city: 'Mumbai',
    })
    expect(shortName.status).toBe('unavailable')
    expect(shortName.message).toContain('at least 2 characters')
  })

  it('submits a community listing and optimistically prepends to catalogue queries', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    const client = await loadClient()

    const submitResult = await client.submitCommunityListing({
      category: 'pickup_game',
      sport: 'Basketball',
      venue_name: 'Cubbon Park Court',
      city: 'Bengaluru',
      time_label: 'Tonight · 8:00 PM',
      skill_level: 'Intermediate',
      spots_open: 2,
      total_players: 10,
    })

    expect(submitResult.status).toBe('submitted')
    if (submitResult.status === 'submitted') {
      expect(submitResult.record.sport).toBe('Basketball')
      expect(submitResult.record.city).toBe('Bengaluru')
      expect(submitResult.record.spots_open).toBe(2)
    }

    // Verify it is prepended in getPickupGames
    const games = await client.getPickupGames()
    expect(games.status).toBe('ready')
    expect(games.data.length).toBeGreaterThan(0)
    expect(games.data[0].sport).toBe('Basketball')
    expect(games.data[0].venue_name).toBe('Cubbon Park Court')
  })

  it('routes guest trials to moderation queue while verified users publish live instantly', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([]))
    const client = await loadClient()

    // 1. Guest trial submission -> moderation queue
    const guestResult = await client.submitCommunityListing({
      category: 'opportunity',
      title: 'Delhi State U-17 Open Football Trials',
      city: 'Delhi',
      contact_name: 'Coach Rakesh',
      contact_phone: '+91 98765 43210',
      is_verified_user: false,
    })

    expect(guestResult.status).toBe('submitted')
    if (guestResult.status === 'submitted') {
      expect(guestResult.mode).toBe('moderation_queue')
      expect(guestResult.requiresReview).toBe(true)
      expect(guestResult.record.publication_status).toBe('pending_review')
    }

    // 2. Verified user trial submission -> instant live
    const verifiedResult = await client.submitCommunityListing({
      category: 'opportunity',
      title: 'Karnataka State Badminton Ranking Tourney',
      city: 'Bengaluru',
      is_verified_user: true,
    })

    expect(verifiedResult.status).toBe('submitted')
    if (verifiedResult.status === 'submitted') {
      expect(verifiedResult.mode).toBe('instant_live')
      expect(verifiedResult.requiresReview).toBe(false)
      expect(verifiedResult.record.publication_status).toBe('published')
      expect(verifiedResult.record.verification_status).toBe('verified')
    }
  })

  it('handles pickup game RSVP spot reservations, WhatsApp group link retrieval, and match locking', async () => {
    const mockGame = {
      id: 'pg-test-1',
      slug: 'pickleball-indiranagar',
      sport: 'Pickleball',
      emoji: '🎾',
      skill_level: 'Intermediate',
      venue_name: 'Indiranagar Club',
      city: 'Bengaluru',
      time_label: 'Today · 7:00 PM',
      host_name: 'Host Arjun',
      price_per_player: '₹200',
      spots_open: 1,
      total_players: 4,
      confirmed_players: 3,
      is_featured: false,
      publication_status: 'published',
      whatsapp_group_url: 'https://chat.whatsapp.com/test-pickleball-group',
      status: 'open',
    }
    vi.mocked(fetch).mockResolvedValue(jsonResponse([mockGame]))
    const client = await loadClient()

    // 1. Validation failure: name < 2 chars
    const shortNameRes = await client.joinPickupGame({
      gameId: 'pg-test-1',
      playerName: 'A',
    })
    expect(shortNameRes.status).toBe('error')

    // 2. Successful reservation: spots_open becomes 0, status becomes full
    const joinRes = await client.joinPickupGame({
      gameId: 'pg-test-1',
      playerName: 'Karan Sharma',
      playerPhone: '9876543210',
    })
    expect(joinRes.status).toBe('confirmed')
    expect(joinRes.whatsappGroupUrl).toBe('https://chat.whatsapp.com/test-pickleball-group')
    expect(joinRes.participant?.player_name).toBe('Karan Sharma')
    expect(joinRes.game?.spots_open).toBe(0)
    expect(joinRes.game?.status).toBe('full')

    // 3. Match full prevention
    const fullRes = await client.joinPickupGame({
      gameId: 'pg-test-1',
      playerName: 'Second Player',
    })
    expect(fullRes.status).toBe('full')

    // 4. Participant roster retrieval
    const participants = await client.getPickupGameParticipants('pg-test-1')
    expect(participants.length).toBeGreaterThanOrEqual(1)
    expect(participants[0].player_name).toBe('Karan Sharma')
  })

  it('manages community reviews, computes stats, helpful votes, and uploads media', async () => {
    const client = await loadClient()

    // 1. Compute stats on sample reviews
    const stats = client.computeReviewStats([
      {
        id: 'r1',
        entity_type: 'venue',
        entity_id: 'v1',
        entity_slug: 'v1-slug',
        user_id: null,
        author_name: 'Player 1',
        author_role: 'Athlete',
        rating: 5,
        content: 'Great turf',
        photos: [],
        helpful_count: 3,
        status: 'published',
        created_at: new Date().toISOString(),
      },
      {
        id: 'r2',
        entity_type: 'venue',
        entity_id: 'v1',
        entity_slug: 'v1-slug',
        user_id: null,
        author_name: 'Player 2',
        author_role: 'Turf Player',
        rating: 4,
        content: 'Good lights',
        photos: ['https://example.com/court.jpg'],
        helpful_count: 1,
        status: 'published',
        created_at: new Date().toISOString(),
      },
    ])

    expect(stats.averageRating).toBe(4.5)
    expect(stats.totalReviews).toBe(2)
    expect(stats.distribution[5]).toBe(1)
    expect(stats.distribution[4]).toBe(1)

    // 2. Submit new review
    const submitRes = await client.submitReview({
      entityType: 'venue',
      entityId: 'v-test',
      entitySlug: 'v-test-slug',
      authorName: 'Rohan Mehra',
      authorRole: 'Turf Player',
      rating: 5,
      title: 'Flawless pitch condition',
      content: 'FIFA quality turf with ample free parking and clean washrooms.',
      photos: ['https://example.com/turf1.jpg'],
    })

    expect(submitRes.status).toBe('submitted')
    expect(submitRes.review?.author_name).toBe('Rohan Mehra')
    expect(submitRes.review?.rating).toBe(5)
    expect(submitRes.review?.photos).toContain('https://example.com/turf1.jpg')

    // 3. Query reviews for entity
    const reviewsRes = await client.getReviews('venue', 'v-test-slug')
    expect(reviewsRes.status).toBe('ready')
    expect(reviewsRes.data.some(r => r.author_name === 'Rohan Mehra')).toBe(true)

    // 4. Helpful vote
    if (submitRes.review?.id) {
      const voted = await client.voteHelpfulReview(submitRes.review.id)
      expect(voted).toBe(true)
      // Second vote from same session should be prevented
      const doubleVote = await client.voteHelpfulReview(submitRes.review.id)
      expect(doubleVote).toBe(false)
    }

    // 5. Media upload fallback
    const mockFile = new File(['dummy photo bytes'], 'court.jpg', { type: 'image/jpeg' })
    const uploadRes = await client.uploadMediaFile('venue-media', mockFile)
    expect(uploadRes.url).toBeDefined()
  })
})
