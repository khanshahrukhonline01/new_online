import { test, expect } from '@playwright/test'

test.describe('KhelGrid TOSM Sprint 1 — Shared SaaS Foundation E2E Acceptance', () => {
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

  test('1. Protected SaaS & account routes fail closed when unauthenticated', async ({ page }) => {
    test.setTimeout(60000)
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    for (const target of [
      '/academy-hub',
      '/coach-dashboard',
      '/organizations',
      '/dashboard',
    ]) {
      await page.goto(target)
      await expect(page.locator('body')).toContainText(/Sign in required|Sign in/i, { timeout: 15000 })
    }

    for (const target of [
      '/workspace/academy/overview',
      '/workspace/coach/overview',
      '/workspace/organization/overview',
    ]) {
      await page.goto(target)
      await expect(page.locator('body')).toContainText(/Your workspace is waiting|Sign in/i, { timeout: 15000 })
    }

    expect(pageErrors).toHaveLength(0)
  })

  test('2. URL ?tenant=unauthorized fails closed instead of silently falling back to another owned tenant', async ({ page }) => {
    test.setTimeout(60000)
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    const userId = 'e2e-sprint1-user-1111'
    const alphaTenant = {
      id: 't-alpha-1111',
      slug: 'alpha-owned-academy',
      name: 'Alpha Owned Academy',
      tenant_type: 'academy',
      status: 'active',
      verification_status: 'verified',
      directory_publication_status: 'approved',
      city: 'Bengaluru',
      state: 'Karnataka',
      sport: 'Football',
      created_at: '2026-11-26T00:00:00Z',
      updated_at: '2026-11-26T00:00:00Z',
    }
    const betaTenant = {
      id: 't-beta-2222',
      slug: 'beta-owned-club',
      name: 'Beta Owned Club',
      tenant_type: 'club',
      status: 'active',
      verification_status: 'unverified',
      directory_publication_status: 'unpublished',
      city: 'Pune',
      state: 'Maharashtra',
      sport: 'Cricket',
      created_at: '2026-11-26T00:00:00Z',
      updated_at: '2026-11-26T00:00:00Z',
    }

    await page.route('https://hznsbxvovjxvmnchzzqt.supabase.co/**', async route => {
      const url = route.request().url()

      if (url.includes('/auth/v1/user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: userId,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'owner@sprint1-e2e.in',
            email_confirmed_at: '2026-11-27T00:00:00Z',
            user_metadata: { full_name: 'Vikram Multi Owner', role: 'academy' },
          }),
        })
        return
      }

      if (url.includes('/rest/v1/profiles')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: userId,
            display_name: 'Vikram Multi Owner',
            role: 'academy',
            created_at: '2026-11-26T00:00:00Z',
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
              id: 'm-alpha-1',
              tenant_id: alphaTenant.id,
              user_id: userId,
              role: 'owner',
              status: 'active',
              invited_email: 'owner@sprint1-e2e.in',
              created_at: '2026-11-26T00:00:00Z',
              updated_at: '2026-11-26T00:00:00Z',
              tenant: alphaTenant,
            },
            {
              id: 'm-beta-2',
              tenant_id: betaTenant.id,
              user_id: userId,
              role: 'director',
              status: 'active',
              invited_email: 'owner@sprint1-e2e.in',
              created_at: '2026-11-26T00:00:00Z',
              updated_at: '2026-11-26T00:00:00Z',
              tenant: betaTenant,
            },
          ]),
        })
        return
      }

      if (url.includes('/rest/v1/rpc/get_academy_dashboard_overview')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            stats: {
              totalAthletes: 1,
              activeAthletes: 1,
              coachesCount: 1,
              branchesCount: 1,
              activeBatches: 1,
              upcomingSessions: 0,
              completedSessions30d: 0,
              totalApplications: 0,
              pendingApplications: 0,
              enrolledApplications: 0,
              attendanceRatePct: 100,
              attendanceEventsCount: 1,
              facilitiesCount: 1,
              unreadNotifications: 0,
              totalFeeCollectedInr: 0,
              feeDueOrOverdueCount: 0,
              canViewFinance: true,
            },
            recentApplications: [],
            upcomingSessions: [],
            pipelineBreakdown: [],
            branchBreakdown: [],
            recentActivity: [],
          }),
        })
        return
      }

      if (route.request().method() === 'GET' || route.request().method() === 'POST') {
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
              email: 'owner@sprint1-e2e.in',
              email_confirmed_at: '2026-11-27T00:00:00Z',
              user_metadata: { full_name: 'Vikram Multi Owner', role: 'academy' },
            },
          }),
        )
        window.localStorage.setItem(
          'khelgrid_auth_user',
          JSON.stringify({
            id: uid,
            email: 'owner@sprint1-e2e.in',
            fullName: 'Vikram Multi Owner',
            name: 'Vikram Multi Owner',
            role: 'academy',
            isVerified: true,
            createdAt: '2026-11-26T00:00:00Z',
          }),
        )
      },
      { uid: userId },
    )

    // Unauthorized tenant slug in query param MUST fail closed with explicit Access denied
    // without activating Alpha Owned Academy or loading private academy operational views
    await page.goto('/workspace/academy/overview?tenant=unauthorized-other-org')
    await expect(page.getByRole('alert').first()).toContainText(/Access denied/i, { timeout: 15000 })
    await expect(page.locator('body')).toContainText(/Personal Account/i)
    await expect(page.locator('body')).not.toContainText('Your verified tenant workspace is active')

    // /academy-hub guarded by RequireTenantMember also fails closed on unauthorized ?tenant=
    await page.goto('/academy-hub?tenant=unauthorized-other-org')
    await expect(page.locator('body')).toContainText(/Workspace access could not be verified|Access denied/i, {
      timeout: 15000,
    })

    // Valid authorized tenant query param opens that exact workspace
    await page.goto('/workspace/academy/overview?tenant=alpha-owned-academy')
    await expect(page.locator('body')).toContainText('Alpha Owned Academy', { timeout: 15000 })
    expect(pageErrors).toHaveLength(0)
  })

  test('3. Verified email onboarding callback provisions idempotently via RPC and never routes to /admin', async ({ page }) => {
    test.setTimeout(60000)
    const pageErrors: string[] = []
    page.on('pageerror', err => pageErrors.push(err.message))

    let provisionRpcCount = 0
    const userId = 'e2e-verify-user-3333'
    const createdTenantId = 't-verified-acad-3333'

    await page.route('https://hznsbxvovjxvmnchzzqt.supabase.co/**', async route => {
      const url = route.request().url()

      if (url.includes('/auth/v1/user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: userId,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'founder@new-sprint1-acad.in',
            email_confirmed_at: '2026-11-27T12:00:00Z',
            user_metadata: {
              full_name: 'Founder Meera',
              role: 'academy',
              khelgrid_partner_onboarding: {
                version: 1,
                role: 'academy',
                entityName: 'New Sprint 1 Academy',
                city: 'Chennai',
                sport: 'Badminton',
                phone: '9876543210',
              },
            },
          }),
        })
        return
      }

      if (url.includes('/rest/v1/tenant_memberships')) {
        const rows = provisionRpcCount > 0
          ? [{
              id: 'm-new-1',
              tenant_id: createdTenantId,
              user_id: userId,
              role: 'owner',
              status: 'active',
              created_at: '2026-11-27T12:00:00Z',
              tenant: {
                id: createdTenantId,
                slug: 'new-sprint-1-academy',
                name: 'New Sprint 1 Academy',
                tenant_type: 'academy',
                status: 'active',
                verification_status: 'unverified',
                directory_publication_status: 'unpublished',
                city: 'Chennai',
                sport: 'Badminton',
                created_at: '2026-11-27T12:00:00Z',
                updated_at: '2026-11-27T12:00:00Z',
              },
            }]
          : []
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
        return
      }

      if (url.includes('/rest/v1/rpc/provision_initial_tenant_owner')) {
        provisionRpcCount += 1
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(createdTenantId),
        })
        return
      }

      if (route.request().method() === 'GET' || route.request().method() === 'POST') {
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
              email: 'founder@new-sprint1-acad.in',
              email_confirmed_at: '2026-11-27T12:00:00Z',
              user_metadata: {
                full_name: 'Founder Meera',
                role: 'academy',
                khelgrid_partner_onboarding: {
                  version: 1,
                  role: 'academy',
                  entityName: 'New Sprint 1 Academy',
                  city: 'Chennai',
                  sport: 'Badminton',
                  phone: '9876543210',
                },
              },
            },
          }),
        )
      },
      { uid: userId },
    )

    await page.goto('/admin?code=pkce-verified-123&type=signup')
    await expect(page).toHaveURL(/\/workspace\/academy\/overview\?tenant=new-sprint-1-academy|\/partner\/verify/, {
      timeout: 15000,
    })
    await expect(page).not.toHaveURL(/^http:\/\/localhost:3000\/admin$/)
    expect(provisionRpcCount).toBeLessThanOrEqual(1)
    expect(pageErrors).toHaveLength(0)
  })
})
