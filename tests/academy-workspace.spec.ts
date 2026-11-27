import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

test.describe('KhelGrid Academy SaaS Workspace — Security & Responsive E2E Acceptance Suite', () => {
  const evidenceDir = path.resolve('test-results', 'academy-evidence')

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

  test('1. /academy-hub subroutes fail closed when unauthenticated with zero leaked demo records', async ({ page }) => {
    test.setTimeout(60000)
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    const academyHubPaths = [
      '/academy-hub',
      '/academy-hub/profile',
      '/academy-hub/athletes',
      '/academy-hub/admissions',
      '/academy-hub/fees',
    ]

    for (const target of academyHubPaths) {
      await page.goto(target)
      await expect(page.locator('body')).toContainText(/Sign in required/i, { timeout: 15000 })

      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toContain('Bengaluru FC Residential Academy')
      expect(bodyText).not.toContain('+12.4% MoM')
      expect(bodyText).not.toContain('Aarav Sundaram')
    }

    await page.screenshot({ path: path.join(evidenceDir, '01_academy_fail_closed_desktop.png') })

    await page.goto('/workspace/academy/overview')
    await expect(page.locator('body')).toContainText(/Your workspace is waiting/i, { timeout: 15000 })
    expect(pageErrors).toHaveLength(0)
  })

  test('2. /academy-hub mobile viewport (390px) renders cleanly without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/academy-hub')
    await expect(page.locator('body')).toContainText(/Sign in required/i, { timeout: 15000 })

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1)
    await page.screenshot({ path: path.join(evidenceDir, '02_academy_fail_closed_mobile.png') })
  })

  test('3. public /academies directory and /coach-dashboard route remain intact with zero runtime crashes', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    await page.goto('/academies')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(350)
    await expect(page.locator('h1')).toBeVisible()

    await page.goto('/coach-dashboard')
    await expect(page.locator('body')).toContainText(/Sign in required/i, { timeout: 15000 })
    expect(pageErrors).toHaveLength(0)
  })

  test('4. tenant /admin isolation and verification callback forwarding work without exposing Admin UI', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    await page.goto('/')
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0)

    await page.goto('/admin')
    await expect(page.locator('body')).toContainText(/This page isn’t here yet|Page not available/i, { timeout: 15000 })
    await expect(page.locator('body')).not.toContainText(/Authorized Operator Sign In|Admin Control Center/i)

    await page.goto('/admin?code=pkce-demo-123&type=signup')
    await expect(page).toHaveURL(/\/partner\/verify/, { timeout: 15000 })
    await expect(page.locator('body')).toContainText(/PARTNER ACCOUNT VERIFICATION/i, { timeout: 15000 })
    expect(pageErrors).toHaveLength(0)
  })

  test('5. legacy operational routes (/turf-calendar, /tournament-ops, /organizations, /parent-portal, /workspace/organization/overview) fail closed when unauthenticated', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    for (const target of ['/turf-calendar', '/tournament-ops', '/organizations', '/parent-portal']) {
      await page.goto(target)
      await expect(page.locator('body')).toContainText(/Sign in required/i, { timeout: 15000 })
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toContain('INV-2026-NOV-042')
      expect(bodyText).not.toContain('NCR Elite Cricket')
      expect(bodyText).not.toContain('Bengaluru Youth FC')
    }

    await page.goto('/workspace/organization/overview')
    await expect(page.locator('body')).toContainText(/Your workspace is waiting|Sign in/i, { timeout: 15000 })
    expect(pageErrors).toHaveLength(0)
  })

  test('6. authenticated Academy Workspace workflows test async profile hydration, 7-role gates, fees, branches, and mobile responsiveness', async ({ page }) => {
    test.setTimeout(60000)
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    const userId = 'e2e-owner-1111-1111-111111111111'
    const tenantId = 'e2e-tenant-2222-2222-222222222222'
    let activeRole = 'owner'

    const baseTenant = {
      id: tenantId,
      slug: 'apex-e2e-academy',
      name: 'Apex E2E Football Academy',
      tenant_type: 'academy',
      status: 'active',
      verification_status: 'verified',
      city: 'Bengaluru',
      state: 'Karnataka',
      sport: 'Football',
      upi_vpa: 'apex@oksbi',
      settings: {
        dpdpMaskMinorsDefault: true,
        emergencyHotline: '9900012345',
        pocsoOfficerName: 'Inspector Kavita Rao',
      },
      created_at: '2026-11-26T00:00:00Z',
      updated_at: '2026-11-26T00:00:00Z',
    }

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
            email: 'owner@apex-e2e.in',
            email_confirmed_at: '2026-11-26T00:00:00Z',
            user_metadata: { full_name: 'Rajesh E2E Director', role: 'academy' },
          }),
        })
        return
      }

      if (url.includes('/rest/v1/tenant_memberships')) {
        const rows = [
          {
            id: 'e2e-mem-1',
            tenant_id: tenantId,
            user_id: userId,
            role: activeRole,
            status: 'active',
            invited_email: 'owner@apex-e2e.in',
            created_at: '2026-11-26T00:00:00Z',
            updated_at: '2026-11-26T00:00:00Z',
            tenant: baseTenant,
          },
        ]
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(rows),
        })
        return
      }

      if (url.includes('/rest/v1/rpc/get_academy_dashboard_overview')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            stats: {
              totalAthletes: 12,
              activeAthletes: 10,
              coachesCount: 3,
              branchesCount: 2,
              activeBatches: 4,
              upcomingSessions: 5,
              completedSessions30d: 18,
              totalApplications: 7,
              pendingApplications: 3,
              enrolledApplications: 4,
              attendanceRatePct: 92,
              attendanceEventsCount: 120,
              facilitiesCount: 2,
              unreadNotifications: 1,
              totalFeeCollectedInr: activeRole === 'owner' ? 25000 : null,
              feeDueOrOverdueCount: activeRole === 'owner' ? 1 : null,
              canViewFinance: activeRole === 'owner',
            },
            recentApplications: [],
            upcomingSessions: [],
            pipelineBreakdown: [{ status: 'enrolled', count: 4 }],
            branchBreakdown: [],
            recentActivity: [],
          }),
        })
        return
      }

      if (url.includes('/rest/v1/rpc/ensure_academy_profile_for_tenant')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'e2e-prof-1',
            tenant_id: tenantId,
            slug: 'apex-e2e-academy',
            display_name: 'Apex E2E Football Academy',
            tagline: 'High-Performance Grassroots Football',
            description: 'AIFF-aligned residential and day-boarding training programme.',
            sports_offered: ['Football'],
            founded_year: 2018,
            affiliations: [],
            age_groups: ['U-13', 'U-15'],
            skill_levels: ['beginner', 'advanced'],
            fee_structure: [],
            training_methodology: 'Small-sided tactical games and biomechanics.',
            facilities_summary: ['FIFA Pro Turf'],
            operating_hours: '06:00 AM - 08:00 PM',
            contact_phone: '9900012345',
            contact_email: 'owner@apex-e2e.in',
            website_url: null,
            social_links: {},
            media_gallery: [],
            city: 'Bengaluru',
            state: 'Karnataka',
            is_publicly_listed: true,
            verification_status: 'verified',
            created_at: '2026-11-26T00:00:00Z',
            updated_at: '2026-11-26T00:00:00Z',
          }),
        })
        return
      }

      if (url.includes('/rest/v1/tenant_units')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'unit-e2e-1',
              tenant_id: tenantId,
              name: 'North Campus Turf',
              unit_type: 'branch',
              branch_code: 'NC-01',
              city: 'Bengaluru',
              state: 'Karnataka',
              is_primary: true,
              is_active: true,
              created_at: '2026-11-26T00:00:00Z',
            },
            {
              id: 'unit-e2e-2',
              tenant_id: tenantId,
              name: 'South Campus Ground',
              unit_type: 'branch',
              branch_code: 'SC-02',
              city: 'Bengaluru',
              state: 'Karnataka',
              is_primary: false,
              is_active: true,
              created_at: '2026-11-26T00:00:00Z',
            },
          ]),
        })
        return
      }

      if (url.includes('/rest/v1/tenant_fee_invoices')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'inv-e2e-1',
              tenant_id: tenantId,
              student_id: 'stu-e2e-1',
              invoice_number: 'INV-2026-1201',
              amount: 2500,
              billing_month: '2026-12',
              due_date: '2026-12-10',
              status: 'issued',
              created_at: '2026-11-26T00:00:00Z',
              updated_at: '2026-11-26T00:00:00Z',
            },
          ]),
        })
        return
      }

      if (method === 'GET' || method === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
        return
      }
      await route.continue()
    })

    await page.addInitScript(
      ({ uid }) => {
        const exp = Math.floor(Date.now() / 1000) + 7200
        const fakeJwtPayload = btoa(JSON.stringify({ sub: uid, aud: 'authenticated', role: 'authenticated', exp }))
        const fakeJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakeJwtPayload}.sig`
        window.localStorage.setItem(
          'sb-hznsbxvovjxvmnchzzqt-auth-token',
          JSON.stringify({
            access_token: fakeJwt,
            refresh_token: 'e2e-refresh',
            expires_in: 7200,
            expires_at: exp,
            token_type: 'bearer',
            user: {
              id: uid,
              email: 'owner@apex-e2e.in',
              email_confirmed_at: '2026-11-26T00:00:00Z',
              user_metadata: { full_name: 'Rajesh E2E Director', role: 'academy' },
            },
          }),
        )
        window.localStorage.setItem(
          'khelgrid_auth_user',
          JSON.stringify({
            id: uid,
            email: 'owner@apex-e2e.in',
            fullName: 'Rajesh E2E Director',
            name: 'Rajesh E2E Director',
            role: 'academy',
            isVerified: true,
            createdAt: '2026-11-26T00:00:00Z',
          }),
        )
      },
      { uid: userId },
    )

    await page.goto('/academy-hub')
    await expect(page.getByTestId('academy-workspace-root')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h1')).toContainText('Apex E2E Football Academy')
    await expect(page.getByTestId('academy-role-badge')).toContainText('Academy Owner')
    await expect(page.locator('body')).toContainText('10 / 12')

    // Verify async profile form hydration preserves loaded database fields
    await page.getByRole('button', { name: /Academy Profile/i }).first().click()
    await expect(page.getByLabel('Tagline')).toHaveValue('High-Performance Grassroots Football', { timeout: 10000 })

    // Verify invoice ledger panel works and displays DB invoice
    await page.getByRole('button', { name: /Fee Ledger \(UPI\)/i }).first().click()
    await expect(page.getByTestId('academy-fees-panel')).toBeVisible()
    await expect(page.locator('body')).toContainText('INV-2026-1201')

    // Mobile 390px responsive viewport check
    await page.setViewportSize({ width: 390, height: 844 })
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1)

    // Switch backend role to coach & verify strict fail-closed Fees UI restriction
    activeRole = 'coach'
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/academy-hub/fees')
    await expect(page.getByTestId('academy-role-badge')).toContainText('Coach / Training Staff', { timeout: 15000 })
    await expect(page.locator('body')).toContainText('Section Restricted by Academy Role')
    expect(pageErrors).toHaveLength(0)
  })
})
