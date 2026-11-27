import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCoachRouteTarget } from './coachDashboardTypes'
import {
  calculateCoachProfileCompleteness,
  loadCoachDashboardOverview,
  loadOrInitializeCoachProfile,
  mapDbRowToCoachProfile,
  submitCoachVerification,
  updateCoachProfile,
} from './coachWorkspaceClient'

const { mockGetSupabaseClient } = vi.hoisted(() => ({
  mockGetSupabaseClient: vi.fn(),
}))

vi.mock('../../integrations/supabase/realtime-client', () => ({
  getSupabaseClient: mockGetSupabaseClient,
}))

describe('coachWorkspaceClient & Phase 1 SQL Foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSupabaseClient.mockReturnValue(null)
  })

  it('fails closed when Supabase client is unconfigured instead of returning mock coaches', async () => {
    const profileRes = await loadOrInitializeCoachProfile('tenant-1')
    expect(profileRes).toEqual({
      ok: false,
      error: 'Database connection is not configured for this environment.',
    })

    const overviewRes = await loadCoachDashboardOverview('tenant-1')
    expect(overviewRes).toEqual({
      ok: false,
      error: 'Database connection is not configured for this environment.',
    })
  })

  it('rejects non-http URLs when updating coach profile or submitting verification', async () => {
    mockGetSupabaseClient.mockReturnValue({ from: vi.fn(), rpc: vi.fn() })

    const baseInput = {
      fullName: 'Coach Priya Sharma',
      avatarUrl: null,
      bio: 'Long-distance endurance and middle-distance athletics coach.',
      sportsSpecialization: ['Athletics'],
      coachingCategories: ['U-19'],
      experienceYears: 8,
      qualifications: [],
      certifications: [],
      previousAcademies: [],
      achievements: [],
      languages: ['English', 'Hindi'],
      city: 'Pune',
      state: 'Maharashtra',
      serviceArea: 'Shivajinagar',
      coachingMethodology: 'Periodized aerobic base.',
      onlineCoachingAvailable: true,
      portfolioUrl: 'javascript:alert(1)',
      introVideoUrl: null,
      contactPreferences: {
        allowWhatsApp: true,
        allowEmail: true,
        allowDirectInquiries: true,
        preferredHours: '08:00 AM - 06:00 PM IST',
      },
    }

    const res = await updateCoachProfile('cp-1', baseInput)
    expect(res).toEqual({
      ok: false,
      error: 'Portfolio URL must start with https:// or http://.',
    })

    const verifRes = await submitCoachVerification({
      coachProfileId: 'cp-1',
      documentType: 'coaching_license',
      documentTitle: 'NSNIS Diploma',
      supportingDetails: 'NIS Patiala Roll #4421',
      supportingDocumentUrl: 'ftp://invalid.example.com/doc.pdf',
    })
    expect(verifRes).toEqual({
      ok: false,
      error: 'Supporting document link must start with https:// or http://.',
    })
  })

  it('calls authorized Supabase RPCs and maps overview statistics cleanly', async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: {
        stats: {
          totalAthletes: 12,
          activeAthletes: 10,
          pendingAthleteRequests: 2,
          activeProgrammes: 3,
          upcomingSessions: 0,
          completedSessions: 8,
          pendingAssessments: 0,
          attendanceRatePct: 91.5,
          attendanceEventsCount: 40,
          academyAssociations: 1,
          unreadNotifications: 3,
        },
        recentRequests: [],
        recentBatches: [],
        recentNotifications: [],
      },
      error: null,
    })

    mockGetSupabaseClient.mockReturnValue({ rpc: rpcMock })

    const res = await loadCoachDashboardOverview('tenant-coach-1')
    expect(rpcMock).toHaveBeenCalledWith('get_coach_dashboard_overview', {
      p_tenant_id: 'tenant-coach-1',
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data.stats.totalAthletes).toBe(12)
      expect(res.data.stats.attendanceRatePct).toBe(91.5)
      expect(res.data.stats.unreadNotifications).toBe(3)
    }
  })

  it('computes honest profile completeness from actual DB fields', () => {
    const sparse = mapDbRowToCoachProfile({
      id: 'cp-2',
      user_id: 'u-2',
      slug: 'coach-u2',
      full_name: 'Coach Dev',
      verification_status: 'unverified',
    })
    const completeness = calculateCoachProfileCompleteness(sparse)
    expect(completeness.percent).toBeLessThan(50)
    expect(completeness.missing).toContain('Biography')
  })

  it('parses Section 3 deep sub-routes onto canonical section IDs and entity IDs', () => {
    expect(resolveCoachRouteTarget('/coach-dashboard/profile')).toEqual({ section: 'profile' })
    expect(resolveCoachRouteTarget('/coach-dashboard/athletes/ath-42')).toEqual({
      section: 'athletes',
      itemId: 'ath-42',
    })
    expect(resolveCoachRouteTarget('/coach-dashboard/programmes/create')).toEqual({
      section: 'programmes',
      itemId: 'create',
    })
    expect(resolveCoachRouteTarget('/coach-dashboard/sessions/sess-9')).toEqual({
      section: 'calendar',
      itemId: 'sess-9',
    })
    expect(resolveCoachRouteTarget('/workspace/coach/assessments', 'assessments')).toEqual({
      section: 'assessments',
    })
  })

  it('enforces trigger/RLS verification immutability and least-privilege grants in Phase 1 migration', async () => {
    // @ts-expect-error - node built-in
    const fs = await import('node:fs')
    // @ts-expect-error - node built-in
    const path = await import('node:path')
    const sqlPath = path.resolve('supabase/migrations/20261126120000_coach_workspace_phase1_foundation.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    // Trigger must run as SECURITY INVOKER so current_user preserves caller role
    expect(sql).toContain('protect_coach_profile_verification()')
    expect(sql).toMatch(/protect_coach_profile_verification\(\)[\s\S]*SECURITY INVOKER/)
    expect(sql).toContain('only authorized moderators can modify coach verification status')

    // RLS forced & anon revoked
    expect(sql).toContain('ALTER TABLE public.coach_profiles FORCE ROW LEVEL SECURITY')
    expect(sql).toContain('ALTER TABLE public.coach_verification_submissions FORCE ROW LEVEL SECURITY')
    expect(sql).toContain('REVOKE ALL ON public.coach_profiles FROM PUBLIC, anon, authenticated')

    // Non-destructive policy
    expect(sql.toUpperCase()).not.toContain('DROP TABLE')
    expect(sql.toUpperCase()).not.toContain('TRUNCATE')
  })
})
