import { defineConfig } from '@playwright/test'

/**
 * End-to-end tests against the built site (npm run build first; CI does). They cover what the unit tests cannot: the
 * real HTML a crawler gets, the language prefixes and the redirect to a stored language, and accessibility in a real
 * browser. There is no API behind the server, so they stick to what does not depend on it.
 *
 *   npm run build; npm run test:e2e
 *
 * Locally the installed Chrome is used; in CI the Chromium that `playwright install` downloads.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-spa.mjs --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
