import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  workers: 1,
  reporter: './tests/browser/safe-reporter.ts',
  use: { baseURL: 'http://localhost:3000', trace: 'off', video: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { viewport: { width: 360, height: 800 } } },
  ],
  webServer: {
    command: `"${process.execPath}" scripts/test-server.mjs`,
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
