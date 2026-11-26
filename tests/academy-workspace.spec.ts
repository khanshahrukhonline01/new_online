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
})
