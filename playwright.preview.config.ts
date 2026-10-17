import { defineConfig, devices } from '@playwright/test';
const origin = process.env.SECRETLOVE_PREVIEW_ORIGIN;
let validOrigin = false;
try {
  const parsed = new URL(origin ?? '');
  validOrigin =
    parsed.origin === origin &&
    parsed.protocol === 'https:' &&
    !['localhost', '127.0.0.1'].includes(parsed.hostname);
} catch {
  /* Never print a malformed environment value. */
}
if (
  process.env.SECRETLOVE_PREVIEW_TEST_APPROVED !== '1' ||
  process.env.SECRETLOVE_TEST_PROJECT !== 'isolated' ||
  !validOrigin
)
  throw new Error(
    'An explicitly approved exact HTTPS private Preview and isolated fixtures are required. No target assumed.',
  );
export default defineConfig({
  testDir: './tests/preview',
  timeout: 180000,
  workers: 1,
  retries: 0,
  reporter: './tests/browser/safe-reporter.ts',
  use: { baseURL: origin, trace: 'off', video: 'off' },
  projects: [
    { name: 'preview-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'preview-mobile', use: { viewport: { width: 360, height: 800 } } },
  ],
  // No local server: these assertions must hit the actual approved HTTPS target.
});
