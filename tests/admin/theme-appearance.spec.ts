import { test, expect } from '@playwright/test'

test.describe('KhelGrid admin appearance preferences', () => {
  test('offers all three accent palettes and applies the selected palette', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const accent = page.getByLabel('Accent colour')

    await expect(accent).toBeVisible()
    await expect(accent.locator('option')).toHaveCount(3)

    for (const value of ['green', 'blue', 'orange'] as const) {
      await accent.selectOption(value)
      await expect(html).toHaveAttribute('data-accent', value)
      await expect.poll(() => page.evaluate(() => {
        const stored = localStorage.getItem('khelgrid-user-preferences')
        return stored ? JSON.parse(stored).accent : null
      })).toBe(value)
    }
  })

  test('supports Light, Dark and System appearance modes', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const appearance = page.getByLabel('Appearance')

    for (const mode of ['light', 'dark', 'system'] as const) {
      await appearance.selectOption(mode)
      await expect.poll(() => page.evaluate(() => {
        const stored = localStorage.getItem('khelgrid-user-preferences')
        return stored ? JSON.parse(stored).theme : null
      })).toBe(mode)
      if (mode === 'light') await expect(html).toHaveClass(/light/)
      if (mode === 'dark') await expect(html).toHaveClass(/dark/)
      if (mode === 'system') await expect(html).toHaveClass(/light|dark/)
    }
  })

  test('restores accent and appearance after refresh', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Accent colour').selectOption('orange')
    await page.getByLabel('Appearance').selectOption('dark')
    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-accent', 'orange')
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByLabel('Accent colour')).toHaveValue('orange')
    await expect(page.getByLabel('Appearance')).toHaveValue('dark')
  })

  test('appearance controls remain usable on a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/')
    await page.getByLabel('Accent colour').selectOption('blue')
    await page.getByLabel('Appearance').selectOption('light')

    await expect(page.locator('html')).toHaveAttribute('data-accent', 'blue')
    await expect(page.getByLabel('Accent colour')).toBeVisible()
    await expect(page.getByLabel('Appearance')).toBeVisible()
  })
})
