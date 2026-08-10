import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The app has no build step: `serve` hands out the repository files as-is,
  // which is exactly what GitHub Pages will do in production.
  webServer: {
    command: `npx serve . --listen ${PORT} --no-clipboard`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
