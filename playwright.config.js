import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.PLAYWRIGHT_PORT || 4173
const baseURL = `http://127.0.0.1:${PORT}`
const webServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER
  ? undefined
  : {
      command: `node ./scripts/playwright-vite-server.mjs ${PORT}`,
      stdout: 'ignore',
      stderr: 'pipe',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    }

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          env: {
            MOZ_DISABLE_CONTENT_SANDBOX: '1',
          },
          firefoxUserPrefs: {
            'security.sandbox.content.level': 0,
          },
        },
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
