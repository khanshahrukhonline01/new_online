import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    channel: 'msedge',
  },
  projects: [
    {
      name: 'desktop-edge',
      use: {
        viewport: { width: 1280, height: 800 },
        hasTouch: false,
      },
    },
  ],
})
