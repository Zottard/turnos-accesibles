import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'es-AR',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'sesiones', testMatch: /sesiones\.setup\.ts/ },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, dependencies: ['sesiones'] },
    {
      name: 'celular',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } },
      testIgnore: /auth\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:3000',
    env: { DEMO_UI: '1', NUXT_PUBLIC_DEMO: 'true' },
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
})
