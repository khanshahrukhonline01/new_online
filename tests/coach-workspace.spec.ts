import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

test.describe('KhelGrid Coach SaaS Workspace — Phase 3 Operational & Security E2E Suite', () => {
  const evidenceDir = path.resolve('test-results', 'coach-evidence')

  test.beforeAll(() => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true })
    }
  })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'khelgrid_user_policy_consent_v1',
        JSON.stringify({
          accepted: true,
          version: '2026.1',
          timestamp: new Date().toISOString(),
          preferences: { essential: true, locationDiscovery: true, realtimeAlerts: true },
        }),
      )
    })
  })

  test('1. /coach-dashboard operational subroutes fail closed when unauthenticated with zero leaked demo records', async ({ page }) => {
    test.setTimeout(60000)
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    for (const target of [
      '/coach-dashboard',
      '/coach-dashboard/athletes',
      '/coach-dashboard/programmes',
      '/coach-dashboard/calendar',
      '/coach-dashboard/attendance',
      '/coach-dashboard/assessments',
    ]) {
      await page.goto(target)
      await expect(page.locator('body')).toContainText(/Sign in required/i, { timeout: 15000 })
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toContain('Zaheer Farooq')
      expect(bodyText).not.toContain('Arjun Mehra')
      expect(bodyText).not.toContain('+14.2%')
    }

    await page.screenshot({ path: path.join(evidenceDir, '01_coach_fail_closed.png') })
    expect(pageErrors).toHaveLength(0)
  })

  test('2. authenticated Coach Workspace operates Athletes, Programmes, Calendar conflict handling, Attendance, Khelo India Assessments & mobile 390px', async ({ page }) => {
    test.setTimeout(60000)
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    const userId = 'e2e-coach-user-1111-1111-111111111111'
    const tenantId = 'e2e-coach-tenant-2222-2222-222222222222'
    const coachProfileId = 'e2e-coach-prof-3333-3333-333333333333'

    const coachAthletes = [
      {
        id: 'ca-e2e-1',
        coach_profile_id: coachProfileId,
        tenant_id: tenantId,
        athlete_user_id: null,
        tenant_student_id: null,
        full_name: 'Rohan Verma',
        guardian_name: 'Suresh Verma',
        guardian_phone: '9811122233',
        athlete_email: null,
        sport: 'Athletics',
        age_group: 'U-14',
        age_years: 13,
        gender: 'male',
        skill_level: 'Intermediate',
        relationship_status: 'active',
        consent_granted: true,
        accepted_at: '2026-11-27T00:00:00Z',
        released_at: null,
        goals_summary: '800m aerobic pace consistency',
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      },
      {
        id: 'ca-e2e-2',
        coach_profile_id: coachProfileId,
        tenant_id: tenantId,
        athlete_user_id: 'ath-linked-user-9999',
        tenant_student_id: null,
        full_name: 'Meera Joshi',
        guardian_name: null,
        guardian_phone: null,
        athlete_email: null,
        sport: 'Athletics',
        age_group: 'U-16',
        age_years: 15,
        gender: 'female',
        skill_level: 'Advanced',
        relationship_status: 'invited',
        consent_granted: false,
        accepted_at: null,
        released_at: null,
        goals_summary: '400m sprint curve biomechanics',
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      },
    ]

    const coachNotes = [
      {
        id: 'note-e2e-1',
        coach_athlete_id: 'ca-e2e-1',
        coach_profile_id: coachProfileId,
        note_type: 'injury_precaution',
        visibility: 'coach_private',
        note_body: 'Monitor right shin load during interval blocks.',
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      },
    ]

    const coachProgrammes = [
      {
        id: 'prog-e2e-1',
        coach_profile_id: coachProfileId,
        tenant_id: tenantId,
        title: 'Pre-Season Acceleration Block',
        sport: 'Athletics',
        target_age_group: 'U-16',
        difficulty_level: 'Intermediate',
        duration_weeks: 6,
        sessions_per_week: 4,
        status: 'active',
        summary: 'Block sprints and posterior-chain strength.',
        exercises: [{ name: 'A-Skip Drill', sets: '4', reps: '30m', intensity: 'RPE 7' }],
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      },
    ]

    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
    const coachSessions = [
      {
        id: 'sess-e2e-1',
        coach_profile_id: coachProfileId,
        tenant_id: tenantId,
        programme_id: 'prog-e2e-1',
        title: 'Morning Track Blocks',
        sport: 'Athletics',
        session_date: futureDate,
        start_time: '07:00:00',
        end_time: '08:30:00',
        venue_name: 'Kanteerava Track Arena',
        location_city: 'Bengaluru',
        session_mode: 'in_person',
        status: 'scheduled',
        max_participants: 12,
        notes: 'Bring spikes and hydration.',
        created_at: '2026-11-27T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
      },
    ]

    const coachAssessments = [
      {
        id: 'ass-e2e-1',
        coach_profile_id: coachProfileId,
        coach_athlete_id: 'ca-e2e-1',
        athlete_name: 'Rohan Verma',
        category: 'khelo_india',
        age_band: 'junior_9_14',
        assessment_date: '2026-11-27',
        overall_score: 88,
        grade_band: 'Grade A · SAI Talent Target',
        sai_report_code: 'SAI-KI-2026-8812',
        metrics: { bmi: 18.6, averageStars: 4.4 },
        coach_summary: 'Strong sprint turnover.',
        created_at: '2026-11-27T00:00:00Z',
      },
    ]

    await page.route('https://hznsbxvovjxvmnchzzqt.supabase.co/**', async route => {
      const url = route.request().url()
      const method = route.request().method()

      if (url.includes('/auth/v1/user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: userId,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'coach-e2e@khelgrid.in',
            email_confirmed_at: '2026-11-27T00:00:00Z',
            user_metadata: { full_name: 'Coach Priya E2E', role: 'coach' },
          }),
        })
        return
      }

      if (url.includes('/rest/v1/tenant_memberships')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'mem-e2e-c1',
              tenant_id: tenantId,
              user_id: userId,
              role: 'owner',
              status: 'active',
              invited_email: 'coach-e2e@khelgrid.in',
              created_at: '2026-11-27T00:00:00Z',
              updated_at: '2026-11-27T00:00:00Z',
              tenant: {
                id: tenantId,
                slug: 'priya-athletics-hub',
                name: 'Priya E2E Athletics Hub',
                tenant_type: 'coach',
                status: 'active',
                verification_status: 'verified',
                city: 'Bengaluru',
                state: 'Karnataka',
                sport: 'Athletics',
                created_at: '2026-11-27T00:00:00Z',
                updated_at: '2026-11-27T00:00:00Z',
              },
            },
          ]),
        })
        return
      }

      if (url.includes('/rest/v1/rpc/ensure_coach_profile_for_user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: coachProfileId,
            user_id: userId,
            tenant_id: tenantId,
            directory_coach_id: null,
            slug: 'priya-athletics-hub',
            full_name: 'Coach Priya E2E',
            avatar_url: null,
            bio: 'High-performance sprints & middle-distance track specialist.',
            sports_specialization: ['Athletics'],
            coaching_categories: ['U-16', 'U-19'],
            experience_years: 9,
            qualifications: ['NIS Patiala Diploma'],
            certifications: [],
            previous_academies: [],
            achievements: [],
            languages: ['English', 'Hindi'],
            city: 'Bengaluru',
            state: 'Karnataka',
            service_area: 'Kanteerava & Indiranagar',
            coaching_methodology: 'Periodized speed mechanics.',
            online_coaching_available: true,
            portfolio_url: null,
            intro_video_url: null,
            contact_preferences: {
              allowWhatsApp: true,
              allowEmail: true,
              allowDirectInquiries: true,
              preferredHours: '06:00 AM - 07:00 PM IST',
            },
            verification_status: 'verified',
            verification_feedback: null,
            verified_at: '2026-11-27T00:00:00Z',
            created_at: '2026-11-27T00:00:00Z',
            updated_at: '2026-11-27T00:00:00Z',
          }),
        })
        return
      }

      if (url.includes('/rest/v1/rpc/get_coach_dashboard_overview')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            stats: {
              totalAthletes: 4,
              activeAthletes: 3,
              pendingAthleteRequests: 1,
              activeProgrammes: 1,
              upcomingSessions: 1,
              completedSessions: 2,
              pendingAssessments: 1,
              attendanceRatePct: 88.5,
              attendanceEventsCount: 12,
              academyAssociations: 0,
              unreadNotifications: 0,
            },
            recentRequests: [],
            recentBatches: [],
            recentNotifications: [],
          }),
        })
        return
      }

      if (url.includes('/rest/v1/coach_athletes')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coachAthletes) })
        return
      }

      if (url.includes('/rest/v1/coach_athlete_notes')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coachNotes) })
        return
      }

      if (url.includes('/rest/v1/coach_training_programmes')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coachProgrammes) })
        return
      }

      if (url.includes('/rest/v1/coach_training_sessions')) {
        if (method === 'POST') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              code: '23P01',
              message: 'Session time conflict: another active session already overlaps this slot.',
            }),
          })
          return
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coachSessions) })
        return
      }

      if (url.includes('/rest/v1/coach_athlete_assessments')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(coachAssessments) })
        return
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })

    await page.addInitScript(
      ({ uid }) => {
        const exp = Math.floor(Date.now() / 1000) + 7200
        const payload = btoa(JSON.stringify({ sub: uid, aud: 'authenticated', role: 'authenticated', exp }))
        window.localStorage.setItem(
          'sb-hznsbxvovjxvmnchzzqt-auth-token',
          JSON.stringify({
            access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.sig`,
            refresh_token: 'e2e-refresh',
            expires_in: 7200,
            expires_at: exp,
            token_type: 'bearer',
            user: {
              id: uid,
              email: 'coach-e2e@khelgrid.in',
              email_confirmed_at: '2026-11-27T00:00:00Z',
              user_metadata: { full_name: 'Coach Priya E2E', role: 'coach' },
            },
          }),
        )
        window.localStorage.setItem(
          'khelgrid_auth_user',
          JSON.stringify({
            id: uid,
            email: 'coach-e2e@khelgrid.in',
            fullName: 'Coach Priya E2E',
            name: 'Coach Priya E2E',
            role: 'coach',
            isVerified: true,
            createdAt: '2026-11-27T00:00:00Z',
          }),
        )
      },
      { uid: userId },
    )

    // 1. Overview KPI check
    await page.goto('/coach-dashboard')
    await expect(page.locator('h1')).toContainText('Coach Priya E2E', { timeout: 15000 })
    await expect(page.locator('body')).toContainText('4 / 3')
    await expect(page.locator('body')).toContainText('88.5%')

    // 2. Athletes panel + Detail notes visibility
    await page.getByRole('tab', { name: /Athletes/i }).click()
    await expect(page.getByTestId('coach-athletes-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).toContainText('Rohan Verma')
    await expect(page.locator('body')).toContainText('Meera Joshi')
    await expect(page.locator('body')).toContainText('Pending Consent')
    await page.getByRole('button', { name: /Notes & Detail/i }).first().click()
    await expect(page.locator('body')).toContainText('Monitor right shin load during interval blocks.')
    await expect(page.locator('body')).toContainText('Coach Private')
    await page.screenshot({ path: path.join(evidenceDir, '02_coach_athletes_notes.png') })

    // 3. Training Programmes panel
    await page.getByRole('tab', { name: /Training Programmes/i }).click()
    await expect(page.getByTestId('coach-programmes-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).toContainText('Pre-Season Acceleration Block')

    // 4. Calendar & Sessions + Server Overlap Conflict Handling
    await page.getByRole('tab', { name: /Calendar & Sessions/i }).click()
    await expect(page.getByTestId('coach-calendar-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).toContainText('Morning Track Blocks')
    await page.getByRole('button', { name: /Schedule Session/i }).first().click()
    await page.getByPlaceholder('e.g. Morning Track Acceleration').fill('Overlapping Track Slot')
    await page.getByRole('button', { name: /Confirm Session Slot/i }).click()
    await expect(page.locator('body')).toContainText(/Schedule conflict: another active session already overlaps/i)

    // 5. Attendance Roll-Call panel
    await page.getByRole('tab', { name: /Attendance/i }).click()
    await expect(page.getByTestId('coach-attendance-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).toContainText('Morning Track Blocks')
    await expect(page.locator('body')).toContainText('Rohan Verma')

    // 6. Assessments & Khelo India Battery History
    await page.getByRole('tab', { name: /Assessments/i }).click()
    await expect(page.getByTestId('coach-assessments-panel')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).toContainText('SAI-KI-2026-8812')
    await expect(page.locator('body')).toContainText('Grade A · SAI Talent Target')

    // 7. Mobile 390px overflow check
    await page.setViewportSize({ width: 390, height: 844 })
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1)
    await page.screenshot({ path: path.join(evidenceDir, '03_coach_assessments_mobile.png') })

    expect(pageErrors).toHaveLength(0)
  })
})
