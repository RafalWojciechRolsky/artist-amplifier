import { defineConfig, devices } from '@playwright/test';

// Playwright requires a default export for config
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
        // Optionally run with Chrome channel when available
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
    },
  ],
});
