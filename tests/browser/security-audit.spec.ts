import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const origin = 'http://localhost:3000';
const headers = { origin };
test.beforeEach(() => {
  test.skip(
    process.env.SECRETLOVE_TEST_PROJECT !== 'isolated' || !process.env.TEST_CREATOR_B_EMAIL,
    'Requires tracked synthetic fixtures in an isolated project.',
  );
});

test('copied recovery proof and provider callback cannot authorize a second reset', async ({
  browser,
}) => {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const context = await browser.newContext();
  const replay = await browser.newContext();
  try {
    const link = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: process.env.TEST_CREATOR_B_EMAIL!,
    });
    expect(link.error).toBeNull();
    const token = link.data.properties?.hashed_token;
    if (!token) throw new Error('Synthetic recovery callback unavailable.');
    const page = await context.newPage();
    await page.goto(`/auth/callback?token_hash=${encodeURIComponent(token)}&type=recovery`);
    await expect(page).toHaveURL(/\/reset-password$/);
    // Snapshot only in process memory. Neither credentials nor proof values are printed.
    await replay.addCookies(await context.cookies());
    const first = await context.request.post(`${origin}/api/auth/reset`, {
      headers,
      data: { password: `Synthetic-${randomUUID()}` },
    });
    expect(first.status()).toBe(200);
    const copied = await replay.request.post(`${origin}/api/auth/reset`, {
      headers,
      data: { password: `Synthetic-${randomUUID()}` },
    });
    expect(copied.status()).toBe(401);
    const callbackReplay = await context.request.get(
      `${origin}/auth/callback?token_hash=${encodeURIComponent(token)}&type=recovery`,
      { maxRedirects: 0 },
    );
    expect(callbackReplay.headers().location).toBe(`${origin}/login?notice=confirmation_failed`);
  } finally {
    // Restore only the verified synthetic B account for the rest of the suite.
    const restored = await admin.auth.admin.updateUserById(process.env.TEST_CREATOR_B_ID!, {
      password: process.env.TEST_CREATOR_B_PASSWORD!,
    });
    expect(restored.error).toBeNull();
    await context.close();
    await replay.close();
  }
});

test('cross-creator mutations and missing/null/LAN origins fail closed, logout removes access', async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  let id = '';
  try {
    for (const [context, name] of [
      [a, 'A'],
      [b, 'B'],
    ] as const) {
      const login = await context.request.post(`${origin}/api/auth/login`, {
        headers,
        data: {
          email: process.env[`TEST_CREATOR_${name}_EMAIL`],
          password: process.env[`TEST_CREATOR_${name}_PASSWORD`],
        },
      });
      expect(login.status()).toBe(200);
    }
    const created = await a.request.post(`${origin}/api/letters`, {
      headers,
      data: { title: `Audit ${randomUUID()}` },
    });
    expect(created.status()).toBe(201);
    const letter = (await created.json()).data;
    id = letter.id;
    for (const path of ['', '/publish', '/unpublish', '/music']) {
      const result =
        path === '' || path === '/music'
          ? await b.request.patch(`${origin}/api/letters/${id}${path}`, {
              headers,
              data:
                path === ''
                  ? { expectedVersion: letter.version, title: 'Foreign write' }
                  : {
                      expectedVersion: letter.version,
                      music: {
                        enabled: false,
                        assetId: null,
                        defaultVolume: 0.3,
                        loop: false,
                        startPolicy: 'manual',
                      },
                    },
            })
          : await b.request.post(`${origin}/api/letters/${id}${path}`, {
              headers,
              data: { expectedVersion: letter.version },
            });
      expect(result.status()).toBe(404);
    }
    expect(
      (
        await b.request.delete(`${origin}/api/letters/${id}`, {
          headers,
          data: { expectedVersion: letter.version },
        })
      ).status(),
    ).toBe(404);
    for (const supplied of [
      undefined,
      'null',
      'http://10.136.153.57:3000',
      'https://evil.invalid',
    ]) {
      expect(
        (
          await a.request.patch(`${origin}/api/letters/${id}`, {
            headers: supplied ? { origin: supplied } : {},
            data: { expectedVersion: letter.version, title: 'Denied origin' },
          })
        ).status(),
      ).toBe(403);
    }
    expect(
      (
        await a.request.delete(`${origin}/api/letters/${id}`, {
          headers,
          data: { expectedVersion: letter.version },
        })
      ).status(),
    ).toBe(200);
    id = '';
    expect(
      (await a.request.post(`${origin}/api/auth/logout`, { headers, data: {} })).status(),
    ).toBe(200);
    expect((await a.request.get(`${origin}/api/letters`)).status()).toBe(401);
  } finally {
    if (id) {
      const current = await a.request.get(`${origin}/api/letters/${id}`);
      if (current.ok())
        await a.request.delete(`${origin}/api/letters/${id}`, {
          headers,
          data: { expectedVersion: (await current.json()).data.version },
        });
    }
    await a.close();
    await b.close();
  }
});
