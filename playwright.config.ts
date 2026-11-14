import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:3001'
const remoteAdmin = Boolean(process.env.ADMIN_BASE_URL)

export default defineConfig({
  testDir: './tests/admin',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : {},
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  ...(remoteAdmin ? {} : {
    webServer: {
      command: 'npm run dev:admin -- --host 127.0.0.1',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_SUPABASE_URL: 'https://hznsbxvovjxvmnchzzqt.supabase.co',
        VITE_SUPABASE_ANON_KEY: process.env.KG_DEV_SUPABASE_ANON_KEY || 'local-placeholder-key',
      },
    },
  }),
})
