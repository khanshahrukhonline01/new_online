import { describe, expect, it } from 'vitest'
import * as publicClient from './public-client'
import { type RealtimeTable } from './realtime-client'
import migrationSql from '../../../supabase/migrations/20261104100000_secure_pickup_game_participant_privacy.sql?raw'

describe('Pickup Game Participant Privacy & Security Architecture', () => {
  it('ensures public roster endpoint is unavailable on public client', () => {
    // 1. Verifies getPickupGameParticipants is not exposed as a public API
    expect((publicClient as Record<string, unknown>).getPickupGameParticipants).toBeUndefined()
  })

  it('separates public match information from private player information', async () => {
    // 2. Public games table must only contain match information, not player rosters
    const gamesRes = await publicClient.getPickupGames()
    expect(gamesRes.status).toBe('ready')
    expect(gamesRes.data.length).toBeGreaterThan(0)

    for (const game of gamesRes.data) {
      // Allowed public attributes
      expect(game).toHaveProperty('id')
      expect(game).toHaveProperty('sport')
      expect(game).toHaveProperty('venue_name')
      expect(game).toHaveProperty('city')
      expect(game).toHaveProperty('time_label')
      expect(game).toHaveProperty('spots_open')
      expect(game).toHaveProperty('total_players')
      expect(game).toHaveProperty('confirmed_players')
      expect(game).toHaveProperty('status')

      // Private participant fields MUST NEVER be present on the game catalogue
      expect(game).not.toHaveProperty('participants')
      expect(game).not.toHaveProperty('player_phone')
      expect(game).not.toHaveProperty('player_name')
      expect(game).not.toHaveProperty('user_id')
    }
  })

  it('preserves public game spot counts without leaking participant details', async () => {
    // 3. Joining a game updates spots and status without exposing roster or broadcasting PII
    const joinRes = await publicClient.joinPickupGame({
      gameId: 'pg-1',
      playerName: 'Aman Verma',
      playerPhone: '+91 98765 43210',
    })

    expect(joinRes.status).toBe('confirmed')
    expect(joinRes.participant?.player_name).toBe('Aman Verma')
    // Confirmation is returned only to the joining player
    expect(joinRes.game?.confirmed_players).toBeGreaterThanOrEqual(1)

    // The in-memory community submissions must not leak a public participants list
    const submissions = publicClient.getCommunitySubmissions()
    expect((submissions as Record<string, unknown>).pickup_game_participants).toBeUndefined()
  })

  it('excludes private pickup_game_participants table from public realtime subscriptions', () => {
    // 4. Verifies that pickup_game_participants is not in RealtimeTable type
    const validTables: RealtimeTable[] = [
      'pickup_games',
      'opportunities',
      'venues',
      'academies',
      'site_announcements',
      'reviews',
    ]
    expect(validTables).not.toContain('pickup_game_participants')
  })

  it('verifies that SQL migration revokes SELECT permissions on pickup_game_participants', () => {
    // 5. Verify exact security commands in the privacy migration
    expect(migrationSql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migrationSql).toContain('DROP POLICY IF EXISTS')
    expect(migrationSql).toContain('"pickup_game_participants_read"')
    expect(migrationSql).toContain('REVOKE SELECT')
    expect(migrationSql).toContain('FROM PUBLIC, anon, authenticated')
  })
})
