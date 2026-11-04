import { beforeEach, describe, expect, it } from 'vitest'
import * as publicClient from './public-client'
import phase3MigrationSql from '../../../supabase/migrations/20261104120000_secure_host_game_management.sql?raw'

describe('Pickup Game Host Authorization & Game Management Security (Phase 3)', () => {
  const HOST_USER_A = 'user-host-alpha-uuid'
  const HOST_USER_B = 'user-host-beta-uuid'

  beforeEach(() => {
    publicClient.resetLocalRsvpSecurityState()
  })

  it('1. Anonymous visitor attempts to edit a game (rejected with UNAUTHORIZED)', async () => {
    // Create a game owned by Host A
    const created = await publicClient.createPickupGame({
      sport: 'Basketball',
      venueName: 'Koramangala Indoor Arena',
      city: 'Bengaluru',
      timeLabel: 'Sunday · 5:00 PM',
      totalPlayers: 10,
    }, { hostUserId: HOST_USER_A })

    expect(created.status).toBe('success')
    const gameId = created.gameId!

    // Anonymous visitor tries to edit details without any authentication
    const editRes = await publicClient.updatePickupGameDetails({
      gameId,
      sport: 'Hacked Sport',
    })
    expect(editRes.status).toBe('error')
    expect(editRes.errorCode).toBe('UNAUTHORIZED')

    // Anonymous visitor tries to reschedule
    const reschedRes = await publicClient.reschedulePickupGame({
      gameId,
      venueName: 'Malicious Venue',
      city: 'Delhi',
      timeLabel: 'Next Year',
    })
    expect(reschedRes.status).toBe('error')
    expect(reschedRes.errorCode).toBe('UNAUTHORIZED')
  })

  it('2. Authenticated non-owner attempts to edit another host\'s game (rejected with FORBIDDEN)', async () => {
    const created = await publicClient.createPickupGame({
      sport: 'Badminton',
      venueName: 'Indiranagar Club',
      city: 'Bengaluru',
      timeLabel: 'Saturday · 7:00 AM',
      totalPlayers: 4,
    }, { hostUserId: HOST_USER_A })
    const gameId = created.gameId!

    // Host B attempts to edit Host A's game
    const editRes = await publicClient.updatePickupGameDetails({
      gameId,
      sport: 'Table Tennis',
    }, { callerUserId: HOST_USER_B })

    expect(editRes.status).toBe('error')
    expect(editRes.errorCode).toBe('FORBIDDEN')

    // Host B attempts to update capacity on Host A's game
    const capRes = await publicClient.updatePickupGameCapacity({
      gameId,
      totalPlayers: 8,
    }, { callerUserId: HOST_USER_B })

    expect(capRes.status).toBe('error')
    expect(capRes.errorCode).toBe('FORBIDDEN')
  })

  it('3. Host attempts to modify their own game (allowed, returns success)', async () => {
    const created = await publicClient.createPickupGame({
      sport: 'Football 5v5',
      venueName: 'South United Football Turf',
      city: 'Bengaluru',
      timeLabel: 'Tomorrow · 6:00 PM',
      totalPlayers: 10,
      pricePerPlayer: '₹200/player',
    }, { hostUserId: HOST_USER_A })
    const gameId = created.gameId!

    // Host A updates game details
    const editRes = await publicClient.updatePickupGameDetails({
      gameId,
      sport: 'Football 6v6',
      skillLevel: 'Advanced',
    }, { callerUserId: HOST_USER_A })
    expect(editRes.status).toBe('success')

    // Host A reschedules the match
    const reschedRes = await publicClient.reschedulePickupGame({
      gameId,
      venueName: 'Denzong Turf Arena',
      city: 'Bengaluru',
      timeLabel: 'Tomorrow · 7:30 PM',
    }, { callerUserId: HOST_USER_A })
    expect(reschedRes.status).toBe('success')

    // Host A updates capacity
    const capRes = await publicClient.updatePickupGameCapacity({
      gameId,
      totalPlayers: 12,
      pricePerPlayer: '₹250/player',
    }, { callerUserId: HOST_USER_A })
    expect(capRes.status).toBe('success')
  })

  it('4. Host attempts to modify another host\'s game (rejected with FORBIDDEN)', async () => {
    const gameA = await publicClient.createPickupGame({
      sport: 'Volleyball',
      venueName: 'Gachibowli Stadium',
      city: 'Hyderabad',
      timeLabel: 'Friday · 6:00 AM',
      totalPlayers: 12,
    }, { hostUserId: HOST_USER_A })

    const res = await publicClient.reschedulePickupGame({
      gameId: gameA.gameId!,
      venueName: 'Other Stadium',
      city: 'Hyderabad',
      timeLabel: 'Friday · 8:00 AM',
    }, { callerUserId: HOST_USER_B })

    expect(res.status).toBe('error')
    expect(res.errorCode).toBe('FORBIDDEN')
  })

  it('5. Unauthorized game cancellation (rejected with UNAUTHORIZED or FORBIDDEN)', async () => {
    const created = await publicClient.createPickupGame({
      sport: 'Cricket Box',
      venueName: 'Whitefield Pitch',
      city: 'Bengaluru',
      timeLabel: 'Tonight · 9:00 PM',
      totalPlayers: 14,
    }, { hostUserId: HOST_USER_A })
    const gameId = created.gameId!

    // Anonymous cancellation attempt
    const anonCancel = await publicClient.cancelPickupGameAsHost({ gameId })
    expect(anonCancel.status).toBe('error')
    expect(anonCancel.errorCode).toBe('UNAUTHORIZED')

    // Non-owner cancellation attempt
    const otherHostCancel = await publicClient.cancelPickupGameAsHost(
      { gameId, cancellationReason: 'I want this slot' },
      { callerUserId: HOST_USER_B },
    )
    expect(otherHostCancel.status).toBe('error')
    expect(otherHostCancel.errorCode).toBe('FORBIDDEN')
  })

  it('6. Unauthorized game deletion is revoked and impossible through client', () => {
    // Verifies that no deletePickupGame method is exported on public client
    expect((publicClient as Record<string, unknown>).deletePickupGame).toBeUndefined()
    expect((publicClient as Record<string, unknown>).removePickupGame).toBeUndefined()

    // Verifies migration explicitly revokes DELETE
    expect(phase3MigrationSql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.pickup_games FROM PUBLIC, anon, authenticated;')
  })

  it('7. Enforces valid game lifecycle transitions and rejects invalid actions', async () => {
    const created = await publicClient.createPickupGame({
      sport: 'Squash',
      venueName: 'KGA Sports Complex',
      city: 'Bengaluru',
      timeLabel: 'Tomorrow · 10:00 AM',
      totalPlayers: 2,
    }, { hostUserId: HOST_USER_A })
    const gameId = created.gameId!

    // Player joins the game
    await publicClient.joinPickupGame({
      gameId,
      playerName: 'Player Squash',
      playerPhone: '9876543210',
    })

    // Attempt to reduce capacity below confirmed count (totalPlayers: 0 < confirmed: 1)
    const lowCapRes = await publicClient.updatePickupGameCapacity({
      gameId,
      totalPlayers: 0,
    }, { callerUserId: HOST_USER_A })
    expect(lowCapRes.status).toBe('error')
    expect(lowCapRes.errorCode).toBe('INVALID_INPUT')

    // Mark game as completed
    const completeRes = await publicClient.completePickupGameAsHost({ gameId }, { callerUserId: HOST_USER_A })
    expect(completeRes.status).toBe('success')

    // Attempting to reschedule a completed match must be rejected
    const reschedCompleted = await publicClient.reschedulePickupGame({
      gameId,
      venueName: 'New Venue',
      city: 'Bengaluru',
      timeLabel: 'Next Week',
    }, { callerUserId: HOST_USER_A })
    expect(reschedCompleted.status).toBe('error')
    expect(reschedCompleted.errorCode).toBe('INVALID_STATE')

    // Attempting to cancel a completed match must be rejected
    const cancelCompleted = await publicClient.cancelPickupGameAsHost({ gameId }, { callerUserId: HOST_USER_A })
    expect(cancelCompleted.status).toBe('error')
    expect(cancelCompleted.errorCode).toBe('INVALID_STATE')
  })

  it('8. Administrative moderation permissions are respected and enforced', async () => {
    const created = await publicClient.createPickupGame({
      sport: 'Tennis',
      venueName: 'Bowring Institute',
      city: 'Bengaluru',
      timeLabel: 'Sunday · 6:00 AM',
      totalPlayers: 4,
    }, { hostUserId: HOST_USER_A })
    const gameId = created.gameId!

    // Regular user attempting admin moderation must be rejected
    const regularRes = await publicClient.adminModeratePickupGame(
      { gameId, action: 'feature' },
      { isAdmin: false },
    )
    expect(regularRes.status).toBe('error')
    expect(regularRes.errorCode).toBe('UNAUTHORIZED')

    // Authorized administrator can feature
    const featureRes = await publicClient.adminModeratePickupGame(
      { gameId, action: 'feature' },
      { isAdmin: true },
    )
    expect(featureRes.status).toBe('success')

    // Administrator can archive
    const archiveRes = await publicClient.adminModeratePickupGame(
      { gameId, action: 'archive' },
      { isAdmin: true },
    )
    expect(archiveRes.status).toBe('success')

    // Administrator can force cancel
    const cancelRes = await publicClient.adminModeratePickupGame(
      { gameId, action: 'force_cancel', notes: 'Breach of community guidelines' },
      { isAdmin: true },
    )
    expect(cancelRes.status).toBe('success')
  })

  it('9. Preserves reservation integrity when a match is cancelled', async () => {
    const created = await publicClient.createPickupGame({
      sport: 'Padel Tennis',
      venueName: 'Padel Hub',
      city: 'Bengaluru',
      timeLabel: 'Saturday · 5:00 PM',
      totalPlayers: 1,
    }, { hostUserId: HOST_USER_A })
    const gameId = created.gameId!

    // Player 1 confirms spot
    const p1 = await publicClient.joinPickupGame({
      gameId,
      playerName: 'Padel Player 1',
      playerPhone: '9811100001',
    })
    expect(p1.status).toBe('confirmed')

    // Player 2 waitlists
    const p2 = await publicClient.joinPickupGame({
      gameId,
      playerName: 'Padel Player 2',
      playerPhone: '9811100002',
      allowWaitlist: true,
    })
    expect(p2.status).toBe('waitlist')

    // Host cancels the match
    const cancelRes = await publicClient.cancelPickupGameAsHost(
      { gameId, cancellationReason: 'Court waterlogged due to heavy rain' },
      { callerUserId: HOST_USER_A },
    )
    expect(cancelRes.status).toBe('success')
    expect(cancelRes.confirmedReservationsCancelled).toBe(1)
    expect(cancelRes.waitlistReservationsCancelled).toBe(1)

    // Reopening the match allows recovery by host
    const reopenRes = await publicClient.reopenPickupGameAsHost({ gameId }, { callerUserId: HOST_USER_A })
    expect(reopenRes.status).toBe('success')
  })

  it('10. Public game discovery remains functional without leaking private metadata', async () => {
    const gamesRes = await publicClient.getPickupGames()
    expect(gamesRes.status).toBe('ready')
    expect(gamesRes.data.length).toBeGreaterThan(0)

    for (const game of gamesRes.data) {
      expect(game).toHaveProperty('id')
      expect(game).toHaveProperty('sport')
      expect(game).toHaveProperty('spots_open')
      expect(game).toHaveProperty('status')

      // WhatsApp URL and participant records must not be exposed on public discovery
      expect((game as unknown as Record<string, unknown>).whatsapp_group_url).toBeUndefined()
      expect((game as unknown as Record<string, unknown>).participants).toBeUndefined()
    }
  })

  it('11. Allows hosts to retrieve their own games portfolio via getHostPickupGames', async () => {
    // Unauthenticated request rejected
    const unauthRes = await publicClient.getHostPickupGames()
    expect(unauthRes.status).toBe('error')
    expect(unauthRes.errorCode).toBe('UNAUTHORIZED')

    // Host A fetches their games
    const hostGames = await publicClient.getHostPickupGames({ hostUserId: HOST_USER_A })
    expect(hostGames.status).toBe('success')
    expect(Array.isArray(hostGames.data)).toBe(true)
  })

  it('12. WhatsApp invitation privacy remains intact for cancelled or full matches', async () => {
    const created = await publicClient.createPickupGame({
      sport: 'Table Tennis',
      venueName: 'Koramangala TT Club',
      city: 'Bengaluru',
      timeLabel: 'Tonight · 8:00 PM',
      totalPlayers: 1,
      whatsappGroupUrl: 'https://chat.whatsapp.com/secret-tt-link',
    }, { hostUserId: HOST_USER_A })
    const gameId = created.gameId!

    // Host cancels match
    await publicClient.cancelPickupGameAsHost({ gameId }, { callerUserId: HOST_USER_A })

    // Non-host discovery
    const publicGames = await publicClient.getPickupGames()
    const found = publicGames.data.find(g => g.id === gameId)
    if (found) {
      expect((found as unknown as Record<string, unknown>).whatsapp_group_url).toBeUndefined()
    }
  })

  it('13. Verifies Phase 3 SQL migration syntax, functions, RLS, and security restrictions', () => {
    // Database schema changes
    expect(phase3MigrationSql).toContain('host_user_id uuid REFERENCES auth.users(id)')
    expect(phase3MigrationSql).toContain("CHECK (status IN ('draft', 'open', 'full', 'completed', 'cancelled'))")
    expect(phase3MigrationSql).toContain('cancellation_reason text')
    expect(phase3MigrationSql).toContain('cancelled_at timestamptz')
    expect(phase3MigrationSql).toContain('completed_at timestamptz')

    // Table privilege restrictions
    expect(phase3MigrationSql).toContain('REVOKE INSERT, UPDATE, DELETE ON public.pickup_games FROM PUBLIC, anon, authenticated;')

    // Authorization helper
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.is_pickup_game_admin()')
    expect(phase3MigrationSql).toContain('SET search_path = public, pg_temp')

    // Atomic management RPCs
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.create_pickup_game(')
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.update_pickup_game_details(')
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.reschedule_pickup_game(')
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.update_pickup_game_capacity(')
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.cancel_pickup_game_as_host(')
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.reopen_pickup_game_as_host(')
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.complete_pickup_game_as_host(')
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.admin_moderate_pickup_game(')
    expect(phase3MigrationSql).toContain('CREATE OR REPLACE FUNCTION public.get_host_pickup_games()')

    // Execute permission restrictions
    expect(phase3MigrationSql).toContain('GRANT EXECUTE ON FUNCTION public.create_pickup_game')
    expect(phase3MigrationSql).toContain('TO authenticated;')
    expect(phase3MigrationSql).toContain('GRANT EXECUTE ON FUNCTION public.get_host_pickup_games() TO authenticated;')
  })
})
