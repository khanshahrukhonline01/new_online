import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export type RealtimeTable =
  | 'pickup_games'
  | 'pickup_game_participants'
  | 'opportunities'
  | 'venues'
  | 'academies'
  | 'site_announcements'

export interface RealtimeChangeEvent<T = Record<string, unknown>> {
  table: RealtimeTable
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  newRecord: T | null
  oldRecord: T | null
  source: 'supabase-realtime' | 'local-broadcast'
  timestamp: number
}

interface LocalSubscriber {
  tables: RealtimeTable[]
  callback: (event: RealtimeChangeEvent) => void
}

const localSubscribers = new Set<LocalSubscriber>()

/**
 * Returns an initialized Supabase client with Realtime WebSocket support,
 * or null if environment variables are not configured or invalid.
 */
export function getSupabaseClient(urlOverride?: string, keyOverride?: string): SupabaseClient | null {
  const urlStr = (urlOverride ?? import.meta.env.VITE_SUPABASE_URL)?.replace(/\/$/, '')
  const keyStr = keyOverride ?? import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!urlStr || !keyStr) return null

  if (!urlOverride && !keyOverride && cachedClient) return cachedClient

  try {
    const url = new URL(urlStr)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return null
    }
    const client = createClient(urlStr, keyStr, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
    if (!urlOverride && !keyOverride) {
      cachedClient = client
    }
    return client
  } catch {
    return null
  }
}

/**
 * Broadcasts a realtime change event across browser tabs and local subscribers.
 */
export function broadcastRealtimeEvent<T = Record<string, unknown>>(
  table: RealtimeTable,
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  newRecord: T | null,
  oldRecord: T | null = null,
) {
  const event: RealtimeChangeEvent<T> = {
    table,
    eventType,
    newRecord,
    oldRecord,
    source: 'local-broadcast',
    timestamp: Date.now(),
  }

  // 1. Notify in-memory local subscribers (works across all tabs/environments)
  for (const sub of localSubscribers) {
    if (sub.tables.includes(table)) {
      try {
        sub.callback(event as unknown as RealtimeChangeEvent)
      } catch {
        // Prevent subscriber errors from bubbling
      }
    }
  }

  // 2. Dispatch cross-tab BroadcastChannel and CustomEvent in browser contexts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khelgrid:realtime-update', { detail: event }))

    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('khelgrid_realtime_sync')
        bc.postMessage(event)
        bc.close()
      } catch {
        // Fallback for isolated contexts
      }
    }
  }
}

/**
 * Subscribes to Supabase Realtime Channels (postgres_changes) for the specified tables.
 * Also synchronizes across tabs via BroadcastChannel and in-memory listeners.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToRealtimeCatalogue(
  tables: RealtimeTable[],
  callback: (event: RealtimeChangeEvent) => void,
): () => void {
  const client = getSupabaseClient()
  let channel: RealtimeChannel | null = null

  // 1. Connect Supabase Realtime Channel if credentials exist
  if (client) {
    try {
      const channelId = `khelgrid-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      let ch = client.channel(channelId)

      for (const table of tables) {
        ch = ch.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          payload => {
            callback({
              table,
              eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
              newRecord: (payload.new as Record<string, unknown>) || null,
              oldRecord: (payload.old as Record<string, unknown>) || null,
              source: 'supabase-realtime',
              timestamp: Date.now(),
            })
          },
        )
      }

      ch.subscribe()
      channel = ch
    } catch {
      // Offline fallback: graceful degradation without throwing
    }
  }

  // 2. Connect multi-tab BroadcastChannel
  let broadcastChannel: BroadcastChannel | null = null
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel('khelgrid_realtime_sync')
      broadcastChannel.onmessage = e => {
        if (e.data && tables.includes(e.data.table)) {
          callback(e.data as RealtimeChangeEvent)
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  // 3. Register in-memory local subscriber
  const localSub: LocalSubscriber = { tables, callback }
  localSubscribers.add(localSub)

  // Cleanup handler
  return () => {
    if (channel && client) {
      try {
        client.removeChannel(channel)
      } catch {
        // Ignore during unmount
      }
    }
    if (broadcastChannel) {
      try {
        broadcastChannel.close()
      } catch {
        // Ignore
      }
    }
    localSubscribers.delete(localSub)
  }
}
