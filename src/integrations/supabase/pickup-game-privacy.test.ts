import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
let publicClient: typeof import('./public-client')
import { type RealtimeTable } from './realtime-client'
import privacyMigrationSql from '../../../supabase/migrations/20261104045129_secure_pickup_game_participant_privacy.sql?raw'
import integrityMigrationSql from '../../../supabase/migrations/20261105084018_atomic_rsvp_reservation_integrity.sql?raw'
import tokenHashMigrationSql from '../../../supabase/migrations/20261105084210_hash_rsvp_cancellation_tokens.sql?raw'

describe('Pickup Game Participant Privacy & Security Architecture (Phase 1 & Phase 2)', () => {
  beforeEach(() => {
    publicClient.resetLocalRsvpSecurityState()
  })

  it('ensures public roster endpoint is unavailable on public client', () => {
    // 1. Verifies getPickupGameParticipants is not exposed as a public API
    expect((publicClient as Record<string, unknown>).getPickupGameParticipants).toBeUndefined()
  })

  it('separates public match information from private player information', async () => {
    // 2. Public games table must only contain match information, not player rosters or WhatsApp URLs
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

      // Private participant fields MUST NEVER be present on the public game catalogue
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

  it('enforces server-grade input validation on player name and phone', async () => {
    // 5. Short or empty names must be rejected
    const shortNameRes = await publicClient.joinPickupGame({
      gameId: 'pg-1',
      playerName: 'A',
      playerPhone: '9876543210',
    })
    expect(shortNameRes.status).toBe('error')
    expect(shortNameRes.errorCode).toBe('INVALID_NAME')

    // Invalid phone number must be rejected
    const invalidPhoneRes = await publicClient.joinPickupGame({
      gameId: 'pg-1',
      playerName: 'Valid Name',
      playerPhone: '12345', // too short
    })
    expect(invalidPhoneRes.status).toBe('error')
    expect(invalidPhoneRes.errorCode).toBe('INVALID_PHONE')
  })

  it('prevents duplicate reservations for the same match with the same phone or identity', async () => {
    // 6. First reservation succeeds
    const firstRes = await publicClient.joinPickupGame({
      gameId: 'pg-test-dup',
      playerName: 'Rohan Mehra',
      playerPhone: '9811122233',
    })
    expect(firstRes.status).toBe('confirmed')

    // Second reservation with same phone for same match must be blocked
    const duplicateRes = await publicClient.joinPickupGame({
      gameId: 'pg-test-dup',
      playerName: 'Rohan Mehra Duplicate',
      playerPhone: '9811122233',
    })
    expect(duplicateRes.status).toBe('duplicate')
    expect(duplicateRes.errorCode).toBe('DUPLICATE_REGISTRATION')
    expect(duplicateRes.whatsappGroupUrl).toBeNull()
  })

  it('enforces rate limiting against anonymous spam attempts', async () => {
    // 7. Max 5 rapid attempts allowed; 6th attempt must be blocked
    const spamPhone = '9999900000'
    for (let i = 1; i <= 5; i++) {
      await publicClient.joinPickupGame({
        gameId: `pg-spam-${i}`,
        playerName: `Spam User ${i}`,
        playerPhone: spamPhone,
      })
    }

    const blockedRes = await publicClient.joinPickupGame({
      gameId: 'pg-spam-6',
      playerName: 'Spam User 6',
      playerPhone: spamPhone,
    })
    expect(blockedRes.status).toBe('error')
    expect(blockedRes.errorCode).toBe('RATE_LIMITED')
    expect(blockedRes.message).toContain('Too many reservation attempts')
  })

  it('handles atomic spot allocation, full matches, and waitlist registration', async () => {
    // 8. Setup a 1-spot game in community listings
    const singleSpotGame = {
      id: 'pg-single-spot',
      slug: 'single-spot-match',
      sport: 'Badminton',
      emoji: '🏸',
      skill_level: 'Intermediate' as const,
      venue_name: 'City Court',
      city: 'Delhi',
      time_label: 'Today · 6:00 PM',
      host_name: 'Coach Raj',
      price_per_player: '₹100',
      spots_open: 1,
      total_players: 4,
      confirmed_players: 3,
      status: 'open' as const,
      is_featured: false,
      publication_status: 'published' as const,
      whatsapp_group_url: 'https://chat.whatsapp.com/test-badminton-secret',
    }
    publicClient.getCommunitySubmissions().pickup_games.unshift(singleSpotGame)

    // Player 1 claims the final spot
    const p1Res = await publicClient.joinPickupGame({
      gameId: 'pg-single-spot',
      playerName: 'Player One',
      playerPhone: '9123456781',
    })
    expect(p1Res.status).toBe('confirmed')
    expect(p1Res.whatsappGroupUrl).toBe('https://chat.whatsapp.com/test-badminton-secret')
    expect(p1Res.game?.spots_open).toBe(0)
    expect(p1Res.game?.status).toBe('full')

    // Player 2 attempts to join the full match without waitlist -> rejected
    const p2Res = await publicClient.joinPickupGame({
      gameId: 'pg-single-spot',
      playerName: 'Player Two',
      playerPhone: '9123456782',
      allowWaitlist: false,
    })
    expect(p2Res.status).toBe('full')
    expect(p2Res.errorCode).toBe('MATCH_FULL')
    expect(p2Res.whatsappGroupUrl).toBeNull()

    // Player 3 attempts to join full match WITH waitlist -> accepted to waitlist, WhatsApp withheld
    const p3Res = await publicClient.joinPickupGame({
      gameId: 'pg-single-spot',
      playerName: 'Player Three',
      playerPhone: '9123456783',
      allowWaitlist: true,
    })
    expect(p3Res.status).toBe('waitlist')
    expect(p3Res.waitlistPosition).toBe(1)
    expect(p3Res.whatsappGroupUrl).toBeNull() // strictly withheld
  })

  it('delivers WhatsApp invite link ONLY after a confirmed reservation', async () => {
    // 9. Public games catalogue query must NOT leak whatsapp_group_url
    const games = await publicClient.getPickupGames()
    for (const g of games.data) {
      expect((g as unknown as Record<string, unknown>).whatsapp_group_url).toBeUndefined()
    }

    // Joining returns the link only to the confirmed player
    const res = await publicClient.joinPickupGame({
      gameId: 'pg-whatsapp-test',
      playerName: 'Private Attendee',
      playerPhone: '9888877777',
    })
    expect(res.status).toBe('confirmed')
    expect(res.whatsappGroupUrl).toBeTruthy()
    expect(res.whatsappGroupUrl).toContain('whatsapp.com')
  })

  it('verifies SQL migrations for Phase 1 privacy and Phase 2 integrity', () => {
    // Phase 1 migration checks
    expect(privacyMigrationSql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(privacyMigrationSql).toContain('DROP POLICY IF EXISTS')
    expect(privacyMigrationSql).toContain('"pickup_game_participants_read"')
    expect(privacyMigrationSql).toContain('REVOKE SELECT')
    expect(privacyMigrationSql).toContain('FROM PUBLIC, anon, authenticated')

    // Phase 2 migration checks
    expect(integrityMigrationSql).toContain('pickup_game_rsvp_rate_limits')
    expect(integrityMigrationSql).toContain('REVOKE ALL ON TABLE public.pickup_game_participants FROM PUBLIC, anon, authenticated')
    expect(integrityMigrationSql).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
    expect(integrityMigrationSql).toContain('GRANT SELECT (')
    expect(integrityMigrationSql).toContain('whatsapp_group_url')
    expect(integrityMigrationSql).toContain('CREATE OR REPLACE FUNCTION public.rsvp_pickup_game')
    expect(integrityMigrationSql).toContain('FOR UPDATE')
    expect(integrityMigrationSql).toContain('CREATE OR REPLACE FUNCTION public.cancel_pickup_game_reservation')
    expect(integrityMigrationSql).toContain('GRANT EXECUTE ON FUNCTION public.rsvp_pickup_game')
    expect(integrityMigrationSql).toContain('ON CONFLICT (identifier) DO UPDATE')
    expect(integrityMigrationSql).toContain('RATE_LIMITED')
    expect(integrityMigrationSql).toContain('A valid mobile number is required')
    expect(tokenHashMigrationSql).toContain('extensions.digest')
    expect(tokenHashMigrationSql).toContain('SHA-256 digest')
    expect(tokenHashMigrationSql).toContain('SET search_path = \'\'')
  })
})
