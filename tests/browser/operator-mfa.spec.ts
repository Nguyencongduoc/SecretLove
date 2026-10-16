import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Standalone, local-only component harness. No Next server, real Auth session or fixture.
// Resolve the bundler already installed by Vitest/Vite; no dependency is added.
const require = createRequire(import.meta.url);
const fromVitest = createRequire(require.resolve('vitest/package.json'));
const fromVite = createRequire(fromVitest.resolve('vite/package.json'));
const bundler = fromVite('rolldown') as {
  build(options: Record<string, unknown>): Promise<{ output: { type: string; code?: string }[] }>;
};

type Mode =
  | 'new'
  | 'pending'
  | 'verified'
  | 'list-error'
  | 'enroll-error'
  | 'invalid'
  | 'verify-error'
  | 'qr-error';
type Fixture = {
  mode: Mode;
  lists: number;
  enrolls: number;
  verifies: number;
  deletes: number;
  navigations: string[];
  refreshes: number;
  verifiedFactor: string;
  verificationDigits: number;
};
declare global {
  interface Window {
    __mfaFixture: Fixture;
    __unmountMfa: () => void;
  }
}
let server: Server;
let origin: string;
const externalRequests = new WeakMap<import('@playwright/test').Page, number>();
test.use({ trace: 'off', video: 'off', screenshot: 'off' });

test.beforeAll(async () => {
  const result = await bundler.build({
    input: 'mfa-entry',
    write: false,
    platform: 'browser',
    output: { format: 'iife', codeSplitting: false },
    transform: {
      jsx: 'react-jsx',
      define: {
        'process.env.NODE_ENV': '"production"',
        'process.env.NEXT_PUBLIC_SUPABASE_URL': '"https://mfa-fixture.example.invalid"',
        'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': '"inert-local-mfa-public-key"',
      },
    },
    logLevel: 'silent',
    plugins: [
      {
        name: 'inert-mfa-provider',
        resolveId(source: string, importer?: string) {
          if (source === 'mfa-entry') return '\0mfa-entry';
          if (source === 'actual-mfa-helper') return resolve('src/lib/mfa-enrollment.ts');
          if (['@supabase/ssr', 'next/navigation', '@/lib/mfa-enrollment'].includes(source))
            return '\0mfa:' + source;
          if (importer === '\0mfa-entry' && ['react', 'react-dom/client'].includes(source))
            return require.resolve(source);
          return null;
        },
        load(id: string) {
          if (id === '\0mfa-entry')
            return `import React from 'react'; import {createRoot} from 'react-dom/client';
            import {OperatorMfa} from ${JSON.stringify(resolve('src/components/operator-mfa.tsx'))};
            const root=createRoot(document.getElementById('app'));
            window.__unmountMfa=()=>root.unmount(); root.render(React.createElement(OperatorMfa));`;
          if (!id.startsWith('\0mfa:')) return null;
          const path = id.slice(5);
          let contents: string;
          if (path === 'next/navigation')
            contents = `export const useRouter=()=>({
          replace:path=>window.__mfaFixture.navigations.push(path),
          refresh:()=>window.__mfaFixture.refreshes++});`;
          else if (path === '@/lib/mfa-enrollment')
            contents = `
          import {parseTotpEnrollment,enrollmentQr as realQr} from 'actual-mfa-helper';
          export {parseTotpEnrollment}; export async function enrollmentQr(value){
            if(window.__mfaFixture.mode==='qr-error') throw new Error('INERT_QR_ERROR');
            return realQr(value); }`;
          else
            contents = `
          const id='11111111-1111-4111-8111-111111111111';
          const secret='JBSWY3DPEHPK3PXP';
          const delay=()=>new Promise(r=>setTimeout(r,40));
          export function createBrowserClient(){ return {auth:{mfa:{
            async listFactors(){ const s=window.__mfaFixture;s.lists++;await delay();
              if(s.mode==='list-error') return {data:null,error:{message:'INERT_PRIVATE_PROVIDER_DETAIL'}};
              const factors=s.mode==='pending'?[{id,factor_type:'totp',status:'unverified'}]:
                s.mode==='verified'?[{id,factor_type:'totp',status:'verified'}]:[];
              return {data:{all:factors,totp:factors.filter(f=>f.status==='verified')},error:null}; },
            async enroll(){ const s=window.__mfaFixture;s.enrolls++;await delay();
              if(s.mode==='enroll-error') return {data:null,error:{message:'INERT_PRIVATE_PROVIDER_DETAIL'}};
              return {data:{id,type:'totp',totp:{secret,qr_code:'inert-svg',
                uri:s.mode==='invalid'?'https://example.invalid/private':
                'otpauth://totp/SecretLove:unit%40example.invalid?secret='+secret+'&issuer=SecretLove'}},error:null}; },
            async unenroll(){window.__mfaFixture.deletes++;throw new Error('INERT_DELETE_FORBIDDEN');},
            async challengeAndVerify(input){const s=window.__mfaFixture;s.verifies++;
              s.verifiedFactor=input.factorId;s.verificationDigits=input.code.length;await delay();
              return {error:s.mode==='verify-error'?{message:'INERT_PRIVATE_PROVIDER_DETAIL'}:null};}
          }}}; }`;
          return contents;
        },
      },
    ],
  });
  const bundle = result.output.find((item) => item.type === 'chunk')?.code;
  if (!bundle) throw new Error('Local component bundle unavailable.');
  server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; img-src data:; style-src 'unsafe-inline'",
    );
    if (request.url === '/bundle.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(bundle);
    } else if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>*{box-sizing:border-box}body{margin:16px}input{max-width:100%}
        .w-full{width:100%}.max-w-80{max-width:20rem}.p-3{padding:.75rem}
        .max-w-full{max-width:100%}.h-auto{height:auto}.block{display:block}
        .bg-white{background:white}</style><div id="app"></div><script src="/bundle.js"></script>`);
    } else {
      response.statusCode = 404;
      response.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local harness unavailable.');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  if (server)
    await new Promise<void>((r, reject) => server.close((error) => (error ? reject(error) : r())));
});
test.afterEach(async ({ page }) => {
  expect(externalRequests.get(page) ?? 0).toBe(0);
});

async function open(page: import('@playwright/test').Page, mode: Mode = 'new') {
  await page.addInitScript((mode) => {
    window.__mfaFixture = {
      mode,
      lists: 0,
      enrolls: 0,
      verifies: 0,
      deletes: 0,
      navigations: [],
      refreshes: 0,
      verifiedFactor: '',
      verificationDigits: 0,
    };
  }, mode);
  externalRequests.set(page, 0);
  await page.route('**/*', (route) => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    externalRequests.set(page, (externalRequests.get(page) ?? 0) + 1);
    return route.abort();
  });
  await page.goto(origin);
}

test('same-enrollment PNG and manual key; success clears setup and locks duplicate requests', async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole('button', { name: 'Enroll authenticator', exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(page.getByAltText('Private TOTP enrollment QR')).toBeVisible();
  const imageBounds = await page.getByAltText('Private TOTP enrollment QR').boundingBox();
  expect(
    !!imageBounds &&
      imageBounds.x >= 0 &&
      imageBounds.x + imageBounds.width <= page.viewportSize()!.width,
  ).toBe(true);
  expect(await page.getByAltText('Private TOTP enrollment QR').getAttribute('src')).toMatch(
    /^data:image\/png;base64,/,
  );
  await expect(
    page.getByRole('button', { name: 'Enroll authenticator', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Cannot scan? Enter setup key' }).click();
  await expect(page.getByLabel('Private setup key')).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show setup key', exact: true }).click();
  await expect(page.getByLabel('Private setup key')).toHaveValue('JBSWY3DPEHPK3PXP');
  await page.getByRole('button', { name: 'Hide manual setup', exact: true }).click();
  await page.getByRole('button', { name: 'Cannot scan? Enter setup key' }).click();
  await expect(page.getByLabel('Private setup key')).toHaveAttribute('type', 'password');
  await page.getByLabel('Authenticator code', { exact: true }).fill('123456');
  await page.locator('form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(page.getByRole('status')).toContainText('Authenticator verified');
  await expect(page.getByLabel('Private setup key')).toHaveCount(0);
  await expect(page.getByAltText('Private TOTP enrollment QR')).toHaveCount(0);
  const state = await page.evaluate(() => ({
    ...window.__mfaFixture,
    localKeys: localStorage.length,
    sessionKeys: sessionStorage.length,
  }));
  expect(state).toMatchObject({
    enrolls: 1,
    verifies: 1,
    deletes: 0,
    navigations: ['/operator'],
    refreshes: 1,
    localKeys: 0,
    sessionKeys: 0,
    verifiedFactor: '11111111-1111-4111-8111-111111111111',
    verificationDigits: 6,
  });
});
test('pending factor blocks new enrollment without deletion, including after reload', async ({
  page,
}) => {
  await open(page, 'pending');
  await page.getByRole('button', { name: 'Enroll authenticator', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('pending authenticator setup already exists');
  expect(
    await page.evaluate(() => [window.__mfaFixture.enrolls, window.__mfaFixture.deletes]),
  ).toEqual([0, 0]);
  await page.reload();
  await page.getByRole('button', { name: 'Enroll authenticator', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('has not been removed');
  expect(
    await page.evaluate(() => [window.__mfaFixture.enrolls, window.__mfaFixture.deletes]),
  ).toEqual([0, 0]);
});
test('verified authenticator uses its existing factor without enrollment', async ({ page }) => {
  await open(page, 'verified');
  await page.getByRole('button', { name: 'Use existing authenticator', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Authenticator verified');
  expect(
    await page.evaluate(() => [
      window.__mfaFixture.enrolls,
      window.__mfaFixture.deletes,
      window.__mfaFixture.verifies,
    ]),
  ).toEqual([0, 0, 1]);
});
test('QR failure retains masked manual key and the same factor', async ({ page }) => {
  await open(page, 'qr-error');
  await page.getByRole('button', { name: 'Enroll authenticator', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('QR could not be displayed');
  await expect(page.getByLabel('Private setup key')).toHaveAttribute('type', 'password');
  await expect(page.getByLabel('Authenticator code', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => [window.__mfaFixture.enrolls, window.__mfaFixture.deletes]),
  ).toEqual([1, 0]);
});
test('browser image failure opens manual fallback without a second enrollment', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Enroll authenticator', exact: true }).click();
  await expect(page.getByAltText('Private TOTP enrollment QR')).toBeVisible();
  await page.getByAltText('Private TOTP enrollment QR').dispatchEvent('error');
  await expect(page.getByLabel('Private setup key')).toHaveAttribute('type', 'password');
  expect(
    await page.evaluate(() => [window.__mfaFixture.enrolls, window.__mfaFixture.deletes]),
  ).toEqual([1, 0]);
});
test('checking an absent authenticator never starts enrollment automatically', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Use existing authenticator', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No verified TOTP factor');
  expect(
    await page.evaluate(() => [window.__mfaFixture.enrolls, window.__mfaFixture.deletes]),
  ).toEqual([0, 0]);
});
test('verification failure preserves setup, clears code and exposes no provider detail', async ({
  page,
}) => {
  await open(page, 'verify-error');
  await page.getByRole('button', { name: 'Enroll authenticator', exact: true }).click();
  await expect(page.getByAltText('Private TOTP enrollment QR')).toBeVisible();
  await page.getByRole('button', { name: 'Cannot scan? Enter setup key' }).click();
  await page.getByRole('button', { name: 'Show setup key', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Verification could not be confirmed');
  await expect(page.getByLabel('Authenticator code', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Private setup key')).toHaveAttribute('type', 'password');
  expect(
    await page.evaluate(() => [
      window.__mfaFixture.enrolls,
      window.__mfaFixture.deletes,
      window.__mfaFixture.navigations.length,
    ]),
  ).toEqual([1, 0, 0]);
  await expect(page.locator('body')).not.toContainText('INERT_PRIVATE_PROVIDER_DETAIL');
});
for (const mode of ['list-error', 'enroll-error', 'invalid'] as const) {
  test(`${mode} fails safely without exposing raw provider data`, async ({ page }) => {
    await open(page, mode);
    await page.getByRole('button', { name: 'Enroll authenticator', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('INERT_PRIVATE_PROVIDER_DETAIL');
    await expect(page.getByLabel('Private setup key')).toHaveCount(0);
    expect(await page.evaluate(() => window.__mfaFixture.deletes)).toBe(0);
    if (mode !== 'list-error')
      await expect(
        page.getByRole('button', { name: 'Enroll authenticator', exact: true }),
      ).toBeDisabled();
  });
}
test('leaving during enrollment does not display late material or reenroll', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Enroll authenticator', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__mfaFixture.enrolls)).toBe(1);
  await page.evaluate(() => window.__unmountMfa());
  await page.waitForTimeout(150);
  await expect(page.getByAltText('Private TOTP enrollment QR')).toHaveCount(0);
  await expect(page.getByLabel('Private setup key')).toHaveCount(0);
  expect(
    await page.evaluate(() => [window.__mfaFixture.enrolls, window.__mfaFixture.deletes]),
  ).toEqual([1, 0]);
});
