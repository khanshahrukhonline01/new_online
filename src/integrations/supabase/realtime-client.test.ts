import { afterEach, describe, expect, it, vi } from 'vitest'
import { broadcastRealtimeEvent, getSupabaseClient, subscribeToRealtimeCatalogue } from './realtime-client'
import { updatePickupGameSpots } from './public-client'

describe('realtime client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('handles null client when credentials are not configured or invalid', () => {
    expect(getSupabaseClient('', '')).toBeNull()
    expect(getSupabaseClient('http://insecure.supabase.co', 'key')).toBeNull()
  })

  it('initializes client when valid https URL and key are provided', () => {
    const client = getSupabaseClient('https://example.supabase.co', 'sample-anon-key')
    expect(client).not.toBeNull()
  })

  it('broadcasts realtime update via universal subscriber registry', () => {
    const eventsReceived: unknown[] = []
    const unsubscribe = subscribeToRealtimeCatalogue(['pickup_games'], event => {
      eventsReceived.push(event)
    })

    const testRecord = { id: 'pg-test-1', spots_open: 3, confirmed_players: 7 }
    broadcastRealtimeEvent('pickup_games', 'UPDATE', testRecord)

    expect(eventsReceived.length).toBe(1)
    expect(eventsReceived[0]).toMatchObject({
      table: 'pickup_games',
      eventType: 'UPDATE',
      newRecord: testRecord,
      source: 'local-broadcast',
    })

    unsubscribe()
  })

  it('filters out events for tables that were not subscribed to', () => {
    const eventsReceived: unknown[] = []
    const unsubscribe = subscribeToRealtimeCatalogue(['academies'], event => {
      eventsReceived.push(event)
    })

    broadcastRealtimeEvent('pickup_games', 'UPDATE', { id: 'pg-ignored' })
    expect(eventsReceived.length).toBe(0)

    broadcastRealtimeEvent('academies', 'INSERT', { id: 'acad-included' })
    expect(eventsReceived.length).toBe(1)

    unsubscribe()
  })

  it('unsubscribes cleanly without memory leaks', () => {
    const eventsReceived: unknown[] = []
    const unsubscribe = subscribeToRealtimeCatalogue(['venues'], event => {
      eventsReceived.push(event)
    })

    broadcastRealtimeEvent('venues', 'UPDATE', { id: 'v-1' })
    expect(eventsReceived.length).toBe(1)

    unsubscribe()

    broadcastRealtimeEvent('venues', 'UPDATE', { id: 'v-2' })
    expect(eventsReceived.length).toBe(1)
  })

  it('updatePickupGameSpots updates spots and broadcasts UPDATE event', async () => {
    const eventsReceived: unknown[] = []
    const unsubscribe = subscribeToRealtimeCatalogue(['pickup_games'], event => {
      eventsReceived.push(event)
    })

    const result = await updatePickupGameSpots('pg-unit-test-1', 2, 8, {
      sport: 'Football',
      venue_name: 'Kickoff Arena',
      city: 'Delhi',
    })

    expect(result.status).toBe('updated')
    expect(result.game?.spots_open).toBe(2)
    expect(result.game?.confirmed_players).toBe(8)
    expect(result.game?.sport).toBe('Football')

    expect(eventsReceived.length).toBeGreaterThanOrEqual(1)
    const lastEvent = eventsReceived[eventsReceived.length - 1] as {
      table: string
      eventType: string
      newRecord: { spots_open: number; confirmed_players: number }
    }
    expect(lastEvent.table).toBe('pickup_games')
    expect(lastEvent.eventType).toBe('UPDATE')
    expect(lastEvent.newRecord.spots_open).toBe(2)
    expect(lastEvent.newRecord.confirmed_players).toBe(8)

    unsubscribe()
  })
})
