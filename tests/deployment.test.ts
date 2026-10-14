import { expect, it } from 'vitest';
import { previewProblem } from '../scripts/preview-settings.mjs';
const env = {
  VERCEL: '1',
  VERCEL_ENV: 'preview',
  APP_ORIGIN: 'https://approved-preview.example.invalid',
  PREVIEW_SUPABASE_PROJECT_REF: 'a'.repeat(20),
  NEXT_PUBLIC_SUPABASE_URL: `https://${'a'.repeat(20)}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
  SUPABASE_SERVICE_ROLE_KEY: 'server-test-key',
  VERIFICATION_HMAC_KEY: Buffer.alloc(32, 1).toString('base64'),
  RATE_LIMIT_HMAC_KEY: Buffer.alloc(32, 2).toString('base64'),
  CRON_SECRET: Buffer.alloc(32, 3).toString('base64'),
  MAX_AUDIO_UPLOAD_BYTES: '16777216',
};
it('fails closed for production/unknown origins/projects without revealing setting values', () => {
  expect(previewProblem(env)).toBeNull();
  for (const override of [
    { VERCEL_ENV: 'production' },
    { VERCEL_ENV: 'development' },
    { APP_ORIGIN: 'http://10.136.153.57:3000' },
    { APP_ORIGIN: 'https://approved-preview.example.invalid/' },
    { APP_ORIGIN: 'https://user:password@approved-preview.example.invalid' },
    { PREVIEW_SUPABASE_PROJECT_REF: '' },
    { SUPABASE_SERVICE_ROLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
  ]) {
    const error = previewProblem({ ...env, ...override });
    expect(error).not.toBeNull();
    expect(error).not.toContain('password');
  }
});
it('denies shared/malformed secrets, test rate namespace and raised audio limits', () => {
  for (const override of [
    { CRON_SECRET: 'short' },
    { RATE_LIMIT_HMAC_KEY: env.VERIFICATION_HMAC_KEY },
    { SECRETLOVE_TEST_RATE_NAMESPACE: 'caller-selected-namespace' },
    { MAX_AUDIO_UPLOAD_BYTES: '16777217' },
    { MAX_AUDIO_UPLOAD_BYTES: '0' },
    { MAX_AUDIO_UPLOAD_BYTES: '1e6' },
  ])
    expect(previewProblem({ ...env, ...override })).not.toBeNull();
});
