import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CANONICAL_WORKSPACES,
  EMPTY_WORKSPACE_SNAPSHOT,
  getWorkspaceConfig,
  isWorkspaceHeaderMode,
  mapCanonicalToShellPersona,
  mapShellToCanonicalPersona,
  resolveActiveWorkspacePersona,
  resolveCanonicalPersonaFromPath,
  resolveCanonicalPersonaFromRole,
  resolveWorkspaceContextMenu,
  resolveWorkspaceHeaderKpis,
} from './workspaceHeaderEngine.ts'

describe('workspaceHeaderEngine', () => {
  it('defines all six canonical KhelGrid workspaces with 3 pillars each', () => {
    assert.equal(CANONICAL_WORKSPACES.length, 6)
    const ids = CANONICAL_WORKSPACES.map(w => w.id)
    assert.deepEqual(ids, [
      'athlete',
      'academy',
      'venue',
      'coach',
      'trial_organiser',
      'creator',
    ])

    for (const ws of CANONICAL_WORKSPACES) {
      assert.equal(ws.pillars.length, 3, `${ws.id} should expose 3 primary pillars`)
      assert.ok(ws.contextActions.length >= 2, `${ws.id} should expose context actions`)
      assert.ok(ws.workspaceHref.startsWith('/workspace/'))
    }
  })

  it('maps between canonical workspaces and WorkspaceShell personas', () => {
    assert.equal(mapCanonicalToShellPersona('venue'), 'turf')
    assert.equal(mapCanonicalToShellPersona('trial_organiser'), 'tournament')
    assert.equal(mapShellToCanonicalPersona('host'), 'venue')
    assert.equal(mapShellToCanonicalPersona('turf'), 'venue')
    assert.equal(mapShellToCanonicalPersona('tournament'), 'trial_organiser')
    assert.equal(mapShellToCanonicalPersona('organization'), 'academy')
    assert.equal(mapShellToCanonicalPersona('creator'), 'creator')
  })

  it('resolves persona from workspace paths, legacy routes, roles, and overrides', () => {
    assert.equal(resolveCanonicalPersonaFromPath('/workspace/academy/batches'), 'academy')
    assert.equal(resolveCanonicalPersonaFromPath('/turf-calendar'), 'venue')
    assert.equal(resolveCanonicalPersonaFromPath('/host'), 'venue')
    assert.equal(resolveCanonicalPersonaFromPath('/tournament-ops'), 'trial_organiser')
    assert.equal(resolveCanonicalPersonaFromPath('/coach-dashboard'), 'coach')
    assert.equal(resolveCanonicalPersonaFromPath('/campaigns'), 'creator')
    assert.equal(resolveCanonicalPersonaFromPath('/sports-cv'), 'athlete')
    assert.equal(resolveCanonicalPersonaFromPath('/'), null)

    assert.equal(resolveCanonicalPersonaFromRole('venue_owner'), 'venue')
    assert.equal(resolveCanonicalPersonaFromRole('host'), 'venue')
    assert.equal(resolveCanonicalPersonaFromRole('academy'), 'academy')
    assert.equal(resolveCanonicalPersonaFromRole('coach'), 'coach')
    assert.equal(resolveCanonicalPersonaFromRole('scout'), 'trial_organiser')
    assert.equal(resolveCanonicalPersonaFromRole('creator'), 'creator')
    assert.equal(resolveCanonicalPersonaFromRole('athlete'), 'athlete')

    // Explicit /workspace/:persona overrides role and overridePersona
    assert.equal(
      resolveActiveWorkspacePersona({
        path: '/workspace/turf/calendar',
        authUserRole: 'athlete',
        overridePersona: 'creator',
      }),
      'venue',
    )

    // On discovery path, overridePersona switches header persona dynamically
    assert.equal(
      resolveActiveWorkspacePersona({
        path: '/',
        authUserRole: 'athlete',
        overridePersona: 'academy',
      }),
      'academy',
    )
  })

  it('determines header workspace mode without triggering on guest discovery root', () => {
    assert.equal(
      isWorkspaceHeaderMode({
        path: '/',
        isOperationalRoute: false,
        isAuthenticated: false,
        hasExplicitPersonaOverride: false,
      }),
      false,
    )
    assert.equal(
      isWorkspaceHeaderMode({
        path: '/workspace/athlete/overview',
        isOperationalRoute: true,
        isAuthenticated: false,
        hasExplicitPersonaOverride: false,
      }),
      true,
    )
    assert.equal(
      isWorkspaceHeaderMode({
        path: '/',
        isOperationalRoute: false,
        isAuthenticated: true,
        hasExplicitPersonaOverride: false,
      }),
      true,
    )
    assert.equal(
      isWorkspaceHeaderMode({
        path: '/',
        isOperationalRoute: false,
        isAuthenticated: false,
        hasExplicitPersonaOverride: true,
      }),
      true,
    )
  })

  it('computes workspace-specific KPIs dynamically per active persona from real snapshot data', () => {
    const snapshot = {
      ...EMPTY_WORKSPACE_SNAPSHOT,
      isAuthenticated: true,
      isVerified: true,
      savedCount: 5,
      cvCompletedFields: 6,
      cvTotalFields: 8,
      tenantCount: 2,
      academyBranchesCount: 1,
      academyCoachesCount: 4,
      academyBatchesCount: 7,
      venueFacilitiesCount: 3,
      venueEnquiriesCount: 2,
      venueBookingsCount: 9,
      verificationStatus: 'pending_review',
      coachInquiriesCount: 3,
      coachOpportunitiesCount: 4,
      trialCount: 2,
      registrationCount: 14,
      liveUpdateCount: 6,
      creatorCampaignsCount: 3,
      creatorReachCount: 8,
      creatorRewardsCount: 2,
    }

    const athleteKpis = resolveWorkspaceHeaderKpis('athlete', snapshot)
    assert.deepEqual(
      athleteKpis.map(k => [k.label, k.value]),
      [
        ['Profile', '6/8'],
        ['Saved', 5],
        ['Status', 'Verified'],
      ],
    )

    const academyKpis = resolveWorkspaceHeaderKpis('academy', snapshot)
    assert.deepEqual(
      academyKpis.map(k => [k.label, k.value]),
      [
        ['Branches', 2],
        ['Coaches', 4],
        ['Batches', 7],
      ],
    )

    const venueKpis = resolveWorkspaceHeaderKpis('venue', snapshot)
    assert.deepEqual(
      venueKpis.map(k => [k.label, k.value]),
      [
        ['Facilities', 3],
        ['Enquiries', 2],
        ['Bookings', 9],
      ],
    )

    const coachKpis = resolveWorkspaceHeaderKpis('coach', snapshot)
    assert.deepEqual(
      coachKpis.map(k => [k.label, k.value]),
      [
        ['Badge', 'Verified'],
        ['Enquiries', 3],
        ['Batches', 4],
      ],
    )

    const trialKpis = resolveWorkspaceHeaderKpis('trial_organiser', snapshot)
    assert.deepEqual(
      trialKpis.map(k => [k.label, k.value]),
      [
        ['Trials', 2],
        ['Squads', 14],
        ['Updates', 6],
      ],
    )

    const creatorKpis = resolveWorkspaceHeaderKpis('creator', snapshot)
    assert.deepEqual(
      creatorKpis.map(k => [k.label, k.value]),
      [
        ['Campaigns', 3],
        ['Deliverables', 8],
        ['Rewards', 2],
      ],
    )
  })

  it('resolves persona-specific context menu pillars and quick actions', () => {
    const venueMenu = resolveWorkspaceContextMenu('venue', true)
    assert.deepEqual(
      venueMenu.pillars.map(p => p.label),
      ['Facilities', 'Enquiries', 'Bookings'],
    )
    assert.ok(venueMenu.actions.some(a => a.href === '/turf-calendar'))

    const trialMenu = resolveWorkspaceContextMenu('trial_organiser', false)
    assert.deepEqual(
      trialMenu.pillars.map(p => p.label),
      ['Trials', 'Registration', 'Updates'],
    )
    assert.equal(trialMenu.pillars[0].badge, 'Preview')
    assert.equal(getWorkspaceConfig('creator').label, 'Creator')
  })
})
