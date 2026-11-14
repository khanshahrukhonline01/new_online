import { test, expect, type Page } from '@playwright/test'

const identities = {
  ordinary: {
    email: process.env.KG_ADMIN_TEST_USER_EMAIL,
    password: process.env.KG_ADMIN_TEST_USER_PASSWORD,
  },
  moderator: {
    email: process.env.KG_ADMIN_TEST_MODERATOR_EMAIL,
    password: process.env.KG_ADMIN_TEST_MODERATOR_PASSWORD,
  },
  superAdmin: {
    email: process.env.KG_ADMIN_TEST_SUPER_ADMIN_EMAIL,
    password: process.env.KG_ADMIN_TEST_SUPER_ADMIN_PASSWORD,
  },
}

async function signIn(page: Page, email?: string, password?: string) {
  test.skip(!email || !password, 'Set the dedicated development test identity secrets to run this acceptance case.')
  await page.goto('/')
  await page.getByLabel('Moderator email').fill(email!)
  await page.getByLabel('Password').fill(password!)
  await page.getByRole('button', { name: 'Sign in securely' }).click()
}

test.describe('KhelGrid private admin access boundaries', () => {
  test('anonymous visitors see only the sign-in surface', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Moderator & Super Admin Control Panel' })).toBeVisible()
    await expect(page.getByLabel('Moderator email')).toBeVisible()
    await expect(page.getByText('Verification & listing queue')).toHaveCount(0)
    await expect(page.getByText('Access management')).toHaveCount(0)
  })

  test('ordinary authenticated users are denied private moderation data', async ({ page }) => {
    await signIn(page, identities.ordinary.email, identities.ordinary.password)
    await expect(page.getByRole('heading', { name: 'Access not authorized' })).toBeVisible()
    await expect(page.getByText(/private queue and evidence records are unavailable/i)).toBeVisible()
    await expect(page.getByText('Verification & listing queue')).toHaveCount(0)
  })

  test('the existing moderator can use listing moderation but not super-admin governance', async ({ page }) => {
    await signIn(page, identities.moderator.email, identities.moderator.password)
    await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible()
    await expect(page.getByText('Verification & listing queue')).toBeVisible()
    await expect(page.getByText('Access management')).toHaveCount(0)
    await expect(page.getByText('Access history')).toHaveCount(0)
  })

  test('the dedicated super-admin can access governance controls', async ({ page }) => {
    await signIn(page, identities.superAdmin.email, identities.superAdmin.password)
    await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible()
    await expect(page.getByText('Access management')).toBeVisible()
    await expect(page.getByText('Access history')).toBeVisible()
  })

  test('sign-out clears the authenticated control panel and returns to sign-in', async ({ page }) => {
    await signIn(page, identities.moderator.email, identities.moderator.password)
    await expect(page.getByRole('heading', { name: 'Control Centre' })).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByLabel('Moderator email')).toBeVisible()
    await expect(page.getByText('Verification & listing queue')).toHaveCount(0)
  })
})
