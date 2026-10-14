import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
test('public pages are responsive and the production CSP permits hydration', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.name));
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  const headers = response!.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).not.toContain('unsafe-eval');
  expect(headers['referrer-policy']).toBe('no-referrer');
  await expect(page.getByRole('heading', { name: /Some feelings/ })).toBeVisible();
  for (const path of ['/login', '/signup', '/recover', '/reset-password']) {
    await page.goto(path);
    await expect(page.locator('form')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.locator('button[type=submit], form button').click();
    expect(
      await page.locator('form').evaluate((form) => (form as HTMLFormElement).checkValidity()),
    ).toBe(false);
  }
  expect(errors).toEqual([]);
  await page.goto('/login');
  await page.screenshot({
    path: `test-results/login-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('anonymous Studio and content/media routes fail closed', async ({ page, request }) => {
  await page.goto('/studio');
  await expect(page).toHaveURL(/\/login$/);
  const lid = randomUUID(),
    pid = randomUUID();
  for (const path of [
    '/api/letters',
    `/api/letters/${lid}`,
    `/api/letters/${lid}/photos/${pid}/media`,
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(await response.text()).not.toContain('bodyDoc');
  }
  const wrongOrigin = await request.post('/api/letters', {
    headers: { origin: 'https://other.invalid' },
    data: { title: 'Test' },
  });
  expect(wrongOrigin.status()).toBe(403);
  const reset = await request.post('/api/auth/reset', {
    headers: { origin: 'http://localhost:3000' },
    data: { password: 'test-only-password' },
  });
  expect(reset.status()).toBe(401);
  const cron = await request.get('/api/cron/cleanup');
  expect(cron.status()).toBe(401);
});
test('configured test creator can save, reload, preview, upload and delete a synthetic letter', async ({
  page,
}) => {
  const request = page.request;
  test.skip(
    !process.env.TEST_CREATOR_A_EMAIL ||
      !process.env.TEST_CREATOR_A_PASSWORD ||
      process.env.SECRETLOVE_TEST_PROJECT !== 'isolated',
    'Requires confirmed synthetic creator credentials in the isolated project.',
  );
  const title = `Studio smoke ${randomUUID()}`;
  let id: string | undefined;
  let version = '';
  try {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(process.env.TEST_CREATOR_A_EMAIL!);
    await page.getByLabel('Password', { exact: true }).fill(process.env.TEST_CREATOR_A_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/studio$/);
    await page.getByRole('link', { name: 'New letter', exact: true }).click();
    await page.getByLabel('Letter title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Create letter', exact: true }).click();
    await expect(page).toHaveURL(/\/studio\/letters\/[0-9a-f-]+$/);
    id = page.url().split('/').pop();
    await page.getByLabel('Recipient greeting name').fill('Synthetic recipient');
    await page
      .getByRole('textbox', { name: 'Letter message' })
      .fill('A synthetic letter for the integration check.');
    await page.getByLabel('Verification name').fill('Synthetic recipient');
    await page.getByLabel('Date of birth').fill('2000-01-01');
    await page.getByLabel('Optional secret passphrase').selectOption('set');
    await page.getByLabel('New passphrase').fill('synthetic-secret-for-test');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Your letter is saved.' })).toHaveText(
      'Your letter is saved.',
      { timeout: 15000 },
    );
    await page.reload();
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue(title);
    await expect(page.getByRole('textbox', { name: 'Letter message' })).toContainText(
      'synthetic letter',
    );
    await expect(page.getByLabel('Verification name')).toHaveValue('');
    await expect(page.getByLabel('Date of birth')).toHaveValue('');
    const input = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#ffcad4' },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel('Choose a photo')
      .setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: input });
    await page.getByLabel('Describe this memory').fill('Synthetic pink image');
    await page.getByRole('button', { name: 'Upload private photo' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Your private photo is saved.' }),
    ).toHaveText('Your private photo is saved.');
    const photo = page.getByRole('img', { name: 'Synthetic pink image', exact: true });
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((image) => (image as HTMLImageElement).naturalWidth), {
        timeout: 15000,
      })
      .toBe(40);
    await page.getByRole('link', { name: 'Preview saved letter' }).click();
    await expect(page.getByRole('heading', { name: 'Dear Synthetic recipient,' })).toBeVisible();
    await expect(page.getByText('A synthetic letter for the integration check.')).toBeVisible();
    const data = await request.get(`/api/letters/${id}`);
    const serialized = await data.text();
    expect(serialized).not.toContain('2000-01-01');
    expect(serialized).not.toContain('synthetic-secret-for-test');
    version = JSON.parse(serialized).data.version;
    const letter = (await (await request.get(`/api/letters/${id}`)).json()).data;
    const photoId = letter.photos[0].id;
    const b = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const signedB = await b.auth.signInWithPassword({
      email: process.env.TEST_CREATOR_B_EMAIL!,
      password: process.env.TEST_CREATOR_B_PASSWORD!,
    });
    expect(signedB.error).toBeNull();
    const foreign = await b.from('creator_letters').select('id').eq('id', id);
    expect(foreign.error).toBeNull();
    expect(foreign.data).toEqual([]);
    const forbidden = await b.rpc('sl_save_letter', {
      a: signedB.data.user!.id,
      lid: id,
      expected: version,
      changes: { title: 'Forbidden' },
    });
    expect(forbidden.error?.code).toBe('42501');
    const a = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const signedA = await a.auth.signInWithPassword({
      email: process.env.TEST_CREATOR_A_EMAIL!,
      password: process.env.TEST_CREATOR_A_PASSWORD!,
    });
    expect(signedA.error).toBeNull();
    const objectPath = `${signedA.data.user!.id}/${id}/${photoId}.webp`;
    expect((await b.storage.from('letter-media').download(objectPath)).error).not.toBeNull();
    expect((await a.storage.from('letter-media').download(objectPath)).error).not.toBeNull();
    const media = await request.get(`/api/letters/${id}/photos/${photoId}/media`);
    expect(media.status()).toBe(200);
    expect(media.headers()['content-type']).toContain('image/webp');
    expect(media.headers()['cache-control']).toContain('no-store');
    const contextB = await page.context().browser()!.newContext();
    try {
      const loginB = await contextB.request.post('http://localhost:3000/api/auth/login', {
        headers: { origin: 'http://localhost:3000' },
        data: {
          email: process.env.TEST_CREATOR_B_EMAIL,
          password: process.env.TEST_CREATOR_B_PASSWORD,
        },
      });
      expect(loginB.status()).toBe(200);
      expect((await contextB.request.get(`http://localhost:3000/api/letters/${id}`)).status()).toBe(
        404,
      );
      expect(
        (
          await contextB.request.get(
            `http://localhost:3000/api/letters/${id}/photos/${photoId}/media`,
          )
        ).status(),
      ).toBe(404);
    } finally {
      await contextB.close();
    }
    await a.auth.signOut({ scope: 'local' });
    await b.auth.signOut({ scope: 'local' });
    // A stale update cannot overwrite the saved document.
    const stale = await request.patch(`/api/letters/${id}`, {
      headers: { origin: 'http://localhost:3000' },
      data: { expectedVersion: '1', title: 'Stale overwrite' },
    });
    expect(stale.status()).toBe(409);
    const normalLoginReset = await request.post('/api/auth/reset', {
      headers: { origin: 'http://localhost:3000' },
      data: { password: 'synthetic-reset-denied' },
    });
    expect(normalLoginReset.status()).toBe(401);
    await page.getByRole('link', { name: 'Back to editor' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete letter', exact: true }).click();
    await expect(page).toHaveURL(/\/studio$/);
    id = undefined;
    const cleanup = await request.get('/api/cron/cleanup', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(cleanup.status()).toBe(200);
    expect((await cleanup.json()).data.failed).toBe(0);
    expect((await request.get(`/api/letters/${letter.id}/photos/${photoId}/media`)).status()).toBe(
      404,
    );
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    // Only the uniquely identified test letter is soft-deleted, using normal authenticated CRUD.
    if (id) {
      const current = await request.get(`/api/letters/${id}`);
      if (current.ok()) version = (await current.json()).data.version;
      if (version)
        await request.delete(`/api/letters/${id}`, {
          headers: { origin: 'http://localhost:3000' },
          data: { expectedVersion: version },
        });
    }
  }
});
test('provider recovery callback authorizes one session-bound password reset', async ({ page }) => {
  test.skip(
    process.env.SECRETLOVE_TEST_PROJECT !== 'isolated' ||
      !process.env.TEST_CREATOR_A_EMAIL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Requires isolated synthetic Auth fixtures.',
  );
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const oldPassword = process.env.TEST_CREATOR_A_PASSWORD!;
  const newPassword = `Synthetic-${randomUUID()}`;
  async function reset(password: string) {
    const link = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: process.env.TEST_CREATOR_A_EMAIL!,
    });
    expect(link.error).toBeNull();
    const token = link.data.properties?.hashed_token;
    if (!token) throw new Error('Recovery token unavailable.');
    await page.goto(`/auth/callback?token_hash=${encodeURIComponent(token)}&type=recovery`);
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel('New password').fill(password);
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page).toHaveURL(/\/studio$/);
    const replay = await page.request.post('/api/auth/reset', {
      headers: { origin: 'http://localhost:3000' },
      data: { password: oldPassword },
    });
    expect(replay.status()).toBe(401);
  }
  try {
    await reset(newPassword);
  } finally {
    await reset(oldPassword);
  }
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
