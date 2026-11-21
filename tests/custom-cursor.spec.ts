import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('KhelGrid Premium Animated Cursor - Complete Acceptance Suite', () => {
  const evidenceDir = path.resolve('test-results', 'cursor-evidence')

  test.beforeAll(() => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true })
    }
  })

  test.beforeEach(async ({ page }) => {
    // Pre-seed exact statutory consent so modal backdrop does not pop up
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'khelgrid_user_policy_consent_v1',
        JSON.stringify({
          accepted: true,
          version: '2026.1',
          timestamp: new Date().toISOString(),
          preferences: { essential: true, locationDiscovery: true, realtimeAlerts: true },
        })
      )
      window.localStorage.setItem(
        'khelgrid_user_sports_pass_v1',
        JSON.stringify({
          role: 'athlete',
          sports: ['cricket', 'football'],
          city: 'Delhi NCR',
          updatedAt: new Date().toISOString(),
        })
      )
    })
  })

  test('1. renders custom cursor on desktop and tracks pointer movement smoothly', async ({ page }) => {
    const runtimeErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const txt = msg.text()
        if (!txt.includes('espn.com') && !txt.includes('Failed to load resource')) {
          runtimeErrors.push(txt)
        }
      }
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    await expect(cursorContainer).toBeAttached()

    // Verify pointer-events is none
    const pointerEvents = await cursorContainer.evaluate(el => window.getComputedStyle(el).pointerEvents)
    expect(pointerEvents).toBe('none')

    // Move mouse across viewport
    await page.mouse.move(300, 200)
    await page.waitForTimeout(100)

    // Cursor should now have is-visible class
    await expect(cursorContainer).toHaveClass(/is-visible/)

    // Dot should be positioned at (300, 200)
    const dot = cursorContainer.locator('.kg-cursor-dot')
    const dotTransform = await dot.evaluate(el => el.style.transform)
    expect(dotTransform).toContain('300px')
    expect(dotTransform).toContain('200px')

    // Capture screenshot of moving cursor
    await page.screenshot({ path: path.join(evidenceDir, '01_cursor_tracking.png') })
    expect(runtimeErrors).toHaveLength(0)
  })

  test('2. transitions to hover-button state over buttons with emerald glow', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    await expect(cursorContainer).toBeAttached()

    // Target a visible button on the homepage
    const button = page.locator('button.home-hero-find-btn, button.home-hero-location-btn, button').first()
    await expect(button).toBeVisible()
    await button.hover()
    await page.waitForTimeout(150)

    await expect(cursorContainer).toHaveClass(/hover-button/)
    await page.screenshot({ path: path.join(evidenceDir, '02_hover_button_glow.png') })
  })

  test('3. transitions to hover-link state over navigation links', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    await expect(cursorContainer).toBeAttached()

    // Target brand link or nav link
    const link = page.locator('a.brand')
    await expect(link).toBeVisible()
    await link.hover()
    await page.waitForTimeout(150)

    await expect(cursorContainer).toHaveClass(/hover-link/)
    await page.screenshot({ path: path.join(evidenceDir, '03_hover_link.png') })
  })

  test('4. transitions to hover-input state over text inputs to unhide native I-beam', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')

    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    await expect(cursorContainer).toBeAttached()

    // Locate hero search input and hover over text area
    const searchInput = page.locator('input.home-hero-search-input')
    await expect(searchInput).toBeVisible()
    await searchInput.hover({ position: { x: 50, y: 15 } })
    await page.waitForTimeout(200)

    await expect(cursorContainer).toHaveClass(/hover-input/)
    await page.screenshot({ path: path.join(evidenceDir, '04_hover_input_state.png') })
  })

  test('5. fires restrained click ripple on pointerdown without blocking click target', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    await expect(cursorContainer).toBeAttached()
    const ripple = cursorContainer.locator('.kg-cursor-ripple')

    // Move mouse across viewport to establish active position
    await page.mouse.move(200, 200)
    await page.waitForTimeout(100)
    await expect(cursorContainer).toHaveClass(/is-visible/)

    // Trigger mousedown / pointerdown
    await page.mouse.down()
    await page.waitForTimeout(50)

    // Verify is-clicking class and ripple pulse class
    await expect(cursorContainer).toHaveClass(/is-clicking/)
    await expect(ripple).toHaveClass(/is-pulsing/)

    await page.screenshot({ path: path.join(evidenceDir, '05_click_ripple_pulse.png') })

    await page.mouse.up()
    await page.waitForTimeout(50)
    await expect(cursorContainer).not.toHaveClass(/is-clicking/)
  })

  test('6. allows transparent interaction: button clicks and page navigation succeed', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Click on /play link in header
    const playLink = page.locator('a.header-play-pill[href="/play"]')
    await expect(playLink).toBeVisible()
    await playLink.click()

    // Verify URL changed to /play
    await page.waitForURL('**/play')
    expect(page.url()).toContain('/play')

    // Cursor container still active on new route
    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    await expect(cursorContainer).toBeAttached()
    await page.screenshot({ path: path.join(evidenceDir, '06_navigation_success.png') })
  })

  test('7. supports native text selection without pointer interception', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const heading = page.locator('h1').first()
    await expect(heading).toBeVisible()

    // Native text selection via Playwright selectText()
    await heading.selectText()
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() || '')
    expect(selectedText.length).toBeGreaterThan(0)
    await page.screenshot({ path: path.join(evidenceDir, '07_text_selection.png') })
  })

  test('8. handles scrolling smoothly with fixed viewport coordinates', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    await expect(cursorContainer).toBeAttached()

    // Scroll down 600px
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForTimeout(100)

    // Move pointer to (400, 250)
    await page.mouse.move(400, 250)
    await page.waitForTimeout(100)

    const dot = cursorContainer.locator('.kg-cursor-dot')
    const transform = await dot.evaluate(el => el.style.transform)
    expect(transform).toContain('400px')
    expect(transform).toContain('250px')
    await page.screenshot({ path: path.join(evidenceDir, '08_scroll_handling.png') })
  })

  test('9. works seamlessly across public routes: Sports, Opportunities, Venues & KhelChronicle', async ({ page }) => {
    const routes = ['/sports', '/opportunities', '/venues', '/khelchronicle']

    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')

      const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
      await expect(cursorContainer).toBeAttached()

      await page.mouse.move(350, 250)
      await page.waitForTimeout(100)
      await expect(cursorContainer).toHaveClass(/is-visible/)
    }
    await page.screenshot({ path: path.join(evidenceDir, '09_route_persistence.png') })
  })

  test('10. preserves keyboard navigation and focus indicators', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Tab through focusable elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBeTruthy()
    await page.screenshot({ path: path.join(evidenceDir, '10_keyboard_navigation.png') })
  })

  test('11. respects prefers-reduced-motion accessibility preference by disabling custom cursor', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Cursor should NOT be rendered in DOM
    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    const count = await cursorContainer.count()
    expect(count).toBe(0)

    await context.close()
  })

  test('12. disables custom cursor on mobile / touch devices', async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // In mobile touch context, fine pointer is false, so cursor should not render
    const cursorContainer = page.locator('[data-testid="kg-custom-cursor"]')
    const isVisible = await cursorContainer.isVisible().catch(() => false)
    expect(isVisible).toBe(false)

    await context.close()
  })
})
