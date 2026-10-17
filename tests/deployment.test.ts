import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { previewProblem } from '../scripts/preview-settings.mjs';
import postcss, { type AcceptedPlugin } from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

it('compiles actual UI utilities from src while excluding private build/test artifacts', async () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  expect(css).toContain("source('../')");
  mkdirSync('test-results', { recursive: true });
  const artifact = resolve('test-results/g3-css-scanner-artifact.html');
  writeFileSync(artifact, '<div class="translate-x-[54321px]"></div>');
  try {
    // The pinned Tailwind package carries PostCSS 8.5.23 type identities;
    // the app uses 8.5.29. Exercise the compatible runtime plugin boundary.
    const plugin = tailwindcss({ base: process.cwd() }) as unknown as AcceptedPlugin;
    const result = await postcss([plugin]).process(css, {
      from: resolve('src/app/globals.css'),
    });
    expect(result.css).toContain('display: flex');
    expect(result.css).toContain('.break-words');
    expect(result.css).toContain('.space-y-8');
    expect(result.css).not.toContain('54321px');
  } finally {
    unlinkSync(artifact);
  }
});
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

const ownerReview = {
  ...env,
  VERCEL_ENV: 'production',
  VERCEL_TARGET_ENV: 'production',
  VERCEL_PROJECT_ID: 'prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK',
  SECRETLOVE_DEPLOYMENT_MODE: 'owner-only-review',
  APP_ORIGIN: 'https://secretlove-preview.vercel.app',
  PREVIEW_SUPABASE_PROJECT_REF: 'samelfoyrujhcywcnofw',
  NEXT_PUBLIC_SUPABASE_URL: 'https://samelfoyrujhcywcnofw.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_inert_test',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_inert_test',
};

const binding = {
  projectId: ownerReview.VERCEL_PROJECT_ID,
  teamId: 'team_KJpwyYId3LugWZ4U1jnF4h67',
  origin: 'https://secretlove-production.vercel.app',
  supabaseProjectRef: 'mdoaageegovutlxhhicz',
};
const publicRelease = {
  ...ownerReview,
  SECRETLOVE_DEPLOYMENT_MODE: 'public-private-gate',
  APP_ORIGIN: binding.origin,
  SUPABASE_PROJECT_REF: binding.supabaseProjectRef,
  NEXT_PUBLIC_SUPABASE_URL: `https://${binding.supabaseProjectRef}.supabase.co`,
  PRIVACY_CONTACT_EMAIL: 'privacy@approved-domain.org',
  ENABLE_EXPERIMENTAL_COREPACK: '1',
};
it('public release requires the approved Production origin and backend, including the actual source binding', () => {
  const actualBinding = JSON.parse(
    readFileSync(new URL('../config/public-deployment.json', import.meta.url), 'utf8'),
  );
  expect(actualBinding).toEqual(binding);
  expect(previewProblem(publicRelease, binding)).toBeNull();
  expect(previewProblem(publicRelease)).toBeNull();
  for (const overrides of [
    { SUPABASE_PROJECT_REF: '' },
    { SUPABASE_PROJECT_REF: 'samelfoyrujhcywcnofw' },
    {
      SUPABASE_PROJECT_REF: 'p'.repeat(20),
      NEXT_PUBLIC_SUPABASE_URL: `https://${'p'.repeat(20)}.supabase.co`,
    },
    { NEXT_PUBLIC_SUPABASE_URL: ownerReview.NEXT_PUBLIC_SUPABASE_URL },
    { VERCEL_ENV: 'preview' },
    { VERCEL_TARGET_ENV: '' },
    { VERCEL_PROJECT_ID: 'foreign' },
    { APP_ORIGIN: 'https://other.invalid' },
    { APP_ORIGIN: ownerReview.APP_ORIGIN },
    { APP_ORIGIN: `${binding.origin}/` },
    { APP_ORIGIN: 'https://user:password@secretlove-production.vercel.app' },
    { ENABLE_EXPERIMENTAL_COREPACK: '' },
    { PRIVACY_CONTACT_EMAIL: '' },
    { PRIVACY_CONTACT_EMAIL: 'privacy@example.com' },
    { MAX_AUDIO_UPLOAD_BYTES: '' },
    { MAX_AUDIO_UPLOAD_BYTES: '16777217' },
    { SUPABASE_SERVICE_ROLE_KEY: 'legacy-inert' },
    { SECRETLOVE_TEST_PROJECT: 'isolated' },
    { RATE_LIMIT_HMAC_KEY: publicRelease.VERIFICATION_HMAC_KEY },
  ])
    expect(previewProblem({ ...publicRelease, ...overrides }, binding)).not.toBeNull();
  expect(
    previewProblem(publicRelease, { ...binding, supabaseProjectRef: 'samelfoyrujhcywcnofw' }),
  ).not.toBeNull();
});

it('denies pending or substituted public bindings even when supplied settings match the substitute', () => {
  for (const supabaseProjectRef of [null, '', 'samelfoyrujhcywcnofw', 'p'.repeat(20)]) {
    expect(
      previewProblem(
        {
          ...publicRelease,
          SUPABASE_PROJECT_REF: supabaseProjectRef ?? '',
          NEXT_PUBLIC_SUPABASE_URL: `https://${supabaseProjectRef ?? ''}.supabase.co`,
        },
        { ...binding, supabaseProjectRef },
      ),
    ).toBe('NEW_PRODUCTION_PROJECT_BINDING_REQUIRED');
  }
  expect(
    previewProblem(
      { ...publicRelease, APP_ORIGIN: ownerReview.APP_ORIGIN },
      { ...binding, origin: ownerReview.APP_ORIGIN },
    ),
  ).toBe('PUBLIC_ORIGIN_REQUIRED');
  expect(previewProblem(publicRelease, { ...binding, projectId: 'prj_foreign' })).toBe(
    'PUBLIC_PROJECT_REQUIRED',
  );
  expect(previewProblem(publicRelease, { ...binding, teamId: 'team_foreign' })).toBe(
    'PUBLIC_PROJECT_REQUIRED',
  );
});

it('keeps public and historical owner-only targets separate', () => {
  expect(previewProblem({ ...ownerReview, APP_ORIGIN: binding.origin })).toBe(
    'OWNER_REVIEW_ORIGIN_REQUIRED',
  );
  expect(
    previewProblem({ ...ownerReview, PREVIEW_SUPABASE_PROJECT_REF: binding.supabaseProjectRef }),
  ).toBe('OWNER_REVIEW_ISOLATED_PROJECT_REQUIRED');
});

it('allows the explicitly configured owner-only Production review, preserving Preview support', () => {
  expect(previewProblem(ownerReview)).toBeNull();
  expect(previewProblem(env)).toBeNull();
  expect(previewProblem({ ...env, VERCEL_TARGET_ENV: 'production' })).toBe('PREVIEW_BUILD_ONLY');
});

it.each([
  ['provider marker', { VERCEL: '' }],
  ['explicit review mode', { SECRETLOVE_DEPLOYMENT_MODE: '' }],
  ['unknown mode', { SECRETLOVE_DEPLOYMENT_MODE: 'public-production' }],
  ['Production context', { VERCEL_ENV: 'preview' }],
  ['Production target', { VERCEL_TARGET_ENV: 'preview' }],
  ['target presence', { VERCEL_TARGET_ENV: '' }],
  ['approved project', { VERCEL_PROJECT_ID: 'prj_unapproved' }],
  ['project presence', { VERCEL_PROJECT_ID: '' }],
  ['approved isolated reference', { PREVIEW_SUPABASE_PROJECT_REF: 'a'.repeat(20) }],
  ['matching database URL', { NEXT_PUBLIC_SUPABASE_URL: `https://${'a'.repeat(20)}.supabase.co` }],
  ['canonical origin', { APP_ORIGIN: 'https://secretlove-review-ngcd.vercel.app' }],
  ['exact origin', { APP_ORIGIN: 'https://secretlove-preview.vercel.app/' }],
  ['server credential presence', { SUPABASE_SERVICE_ROLE_KEY: '' }],
  ['modern server credential', { SUPABASE_SERVICE_ROLE_KEY: 'legacy-inert-jwt' }],
  ['modern public credential', { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'legacy-inert-public' }],
  ['independent HMACs', { RATE_LIMIT_HMAC_KEY: ownerReview.VERIFICATION_HMAC_KEY }],
  ['cron format', { CRON_SECRET: 'short' }],
  ['no test namespace', { SECRETLOVE_TEST_RATE_NAMESPACE: 'caller-selected' }],
  ['unchanged upload limit', { MAX_AUDIO_UPLOAD_BYTES: '16777217' }],
])('rejects private Production review missing %s', (_name, overrides) => {
  expect(previewProblem({ ...ownerReview, ...overrides })).not.toBeNull();
});

it('keeps automatic cron cleanup and Git deployment disabled in the hosting configuration', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  expect(config.crons).toEqual([]);
  expect(config.git.deploymentEnabled).toBe(false);
  expect(config.buildCommand).toBe('node scripts/check-preview-config.mjs && pnpm build');
  expect(config.installCommand).toBe('pnpm install --frozen-lockfile');
});

it('runs the real build guard with inert settings and redacts failures', () => {
  const system = Object.fromEntries(
    ['SystemRoot', 'WINDIR', 'PATH', 'TEMP', 'TMP'].flatMap((key) =>
      process.env[key] ? [[key, process.env[key]]] : [],
    ),
  );
  for (const [settings, expectedExit] of [
    [env, 0],
    [ownerReview, 0],
    [publicRelease, 0],
    [{ ...publicRelease, APP_ORIGIN: ownerReview.APP_ORIGIN }, 1],
    [{ ...publicRelease, SUPABASE_PROJECT_REF: ownerReview.PREVIEW_SUPABASE_PROJECT_REF }, 1],
    [{ ...ownerReview, SECRETLOVE_DEPLOYMENT_MODE: '' }, 1],
    [{ ...ownerReview, CRON_SECRET: 'inert-sensitive-value-that-must-not-be-logged' }, 1],
  ] as const) {
    const run = spawnSync(process.execPath, ['scripts/check-preview-config.mjs'], {
      env: { ...system, ...settings, NODE_ENV: 'test' },
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
    });
    expect(run.status).toBe(expectedExit);
    const output = run.stdout + run.stderr;
    for (const key of [
      'SUPABASE_SERVICE_ROLE_KEY',
      'VERIFICATION_HMAC_KEY',
      'RATE_LIMIT_HMAC_KEY',
      'CRON_SECRET',
    ] as const)
      expect(output).not.toContain(settings[key]);
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
