import { test, expect } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { silentMp3 } from '../fixtures/mp3';
test('approved private Vercel target accepts full-song chunks, streams authorized bytes and revokes playback', async ({
  browser,
  playwright,
}) => {
  const origin = process.env.SECRETLOVE_PREVIEW_ORIGIN!,
    headers = { origin };
  const bypass = process.env.SECRETLOVE_PREVIEW_AUTOMATION_SECRET;
  const protection: Record<string, string> = bypass ? { 'x-vercel-protection-bypass': bypass } : {};
  const state = process.env.SECRETLOVE_PREVIEW_STORAGE_STATE;
  if (!bypass && !state)
    throw new Error(
      'Approved owner protection credentials are required; values must stay out of chat.',
    );
  const owner = await browser.newContext({ storageState: state, extraHTTPHeaders: protection }),
    reader = await browser.newContext({ storageState: state, extraHTTPHeaders: protection });
  const locked = await playwright.request.newContext();
  let id = '';
  try {
    const gated = await locked.get(`${origin}/login`, { maxRedirects: 0 });
    expect([301, 302, 303, 307, 308, 401, 403]).toContain(gated.status());
    const shell = await owner.request.get(`${origin}/login`);
    expect(shell.status()).toBe(200);
    expect(shell.headers()['content-security-policy']).toContain(
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin,
    );
    const login = await owner.request.post(`${origin}/api/auth/login`, {
      headers,
      data: {
        email: process.env.TEST_CREATOR_GIFT_EMAIL,
        password: process.env.TEST_CREATOR_GIFT_PASSWORD,
      },
    });
    expect(login.status()).toBe(200);
    expect(login.headers()['x-vercel-id']).toBeTruthy();
    const created = await owner.request.post(`${origin}/api/letters`, {
      headers,
      data: { title: `Preview transport ${randomUUID()}` },
    });
    expect(created.status()).toBe(201);
    let letter = (await created.json()).data;
    id = letter.id;
    const saved = await owner.request.patch(`${origin}/api/letters/${id}`, {
      headers,
      data: {
        expectedVersion: letter.version,
        recipientDisplayName: 'Preview synthetic reader',
        verification: { name: 'Preview synthetic reader', dateOfBirth: '2000-01-01' },
        bodyDoc: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Synthetic target validation' }] },
          ],
        },
      },
    });
    expect(saved.status()).toBe(200);
    letter = (await saved.json()).data;
    const bytes = silentMp3(Math.floor((300 * 44100) / 1152)),
      digest = createHash('sha256').update(bytes).digest('hex');
    expect(bytes.length).toBeGreaterThan(4500000);
    const begin = await owner.request.post(`${origin}/api/letters/${id}/music/ingests`, {
      headers,
      data: {
        expectedVersion: letter.version,
        byteSize: bytes.length,
        digest,
        fileType: 'audio/mpeg',
        extension: 'mp3',
        rightsAcknowledged: true,
      },
    });
    expect(begin.status()).toBe(201);
    const ingest = (await begin.json()).data;
    for (let index = 0; index < ingest.partCount; index++) {
      const chunk = bytes.subarray(index * 1048576, (index + 1) * 1048576);
      expect(chunk.length).toBeLessThanOrEqual(1048576);
      expect(
        (
          await owner.request.put(
            `${origin}/api/letters/${id}/music/ingests/${ingest.id}/parts/${index}`,
            { headers: { ...headers, 'content-type': 'application/octet-stream' }, data: chunk },
          )
        ).status(),
      ).toBe(200);
    }
    const commit = await owner.request.post(
      `${origin}/api/letters/${id}/music/ingests/${ingest.id}`,
      { headers, data: {} },
    );
    expect(commit.status()).toBe(201);
    letter = (await commit.json()).data;
    const audio = `${origin}/api/letters/${id}/audio/${letter.audioAsset.id}/media`;
    const full = await owner.request.get(audio);
    expect(full.status()).toBe(200);
    expect(full.headers()['x-vercel-id']).toBeTruthy();
    expect(full.headers()['cache-control']).toContain('no-store');
    expect(full.headers().location).toBeUndefined();
    expect((await full.body()).length).toBe(bytes.length);
    expect(
      createHash('sha256')
        .update(await full.body())
        .digest('hex'),
    ).toBe(digest);
    const suffix = await owner.request.get(audio, { headers: { range: 'bytes=-64' } });
    expect(suffix.status()).toBe(206);
    expect(await suffix.body()).toEqual(bytes.subarray(-64));
    expect((await owner.request.head(audio)).status()).toBe(200);
    expect((await owner.request.get(audio, { headers: { range: 'bytes=0-1,3-4' } })).status()).toBe(
      416,
    );
    const settings = await owner.request.patch(`${origin}/api/letters/${id}/music`, {
      headers,
      data: {
        expectedVersion: letter.version,
        music: { ...letter.music, enabled: true, loop: true },
      },
    });
    expect(settings.status()).toBe(200);
    letter = (await settings.json()).data;
    const published = await owner.request.post(`${origin}/api/letters/${id}/publish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    expect(published.status()).toBe(200);
    const share = (await published.json()).data.shareUrl;
    expect(new URL(share).origin).toBe(origin);
    const base = `${origin}/api/recipient/${share.split('/').pop()}`,
      media = `${base}/audio/${letter.audioAsset.id}/media`;
    expect((await reader.request.get(media, { headers: { range: 'bytes=0-9' } })).status()).toBe(
      401,
    );
    const page = await reader.newPage();
    // Never send automation-protection credentials to an external origin.
    await page.route('**/*', async (route) => {
      const request = route.request(),
        values = { ...request.headers() };
      if (new URL(request.url()).origin !== origin) delete values['x-vercel-protection-bypass'];
      await route.continue({ headers: values });
    });
    const landing = await page.goto(share);
    expect(landing?.status()).toBe(200);
    expect(await landing!.text()).not.toContain('Synthetic target validation');
    expect(landing!.headers()['content-security-policy']).not.toContain('unsafe-eval');
    await page.getByRole('button', { name: 'Unlock your gift', exact: true }).click();
    await page.getByLabel('Full name').fill('Preview synthetic reader');
    await page.getByLabel('Date of birth').fill('2000-01-01');
    await page.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Open the envelope', exact: true }),
    ).toBeVisible();
    const cookie = (await reader.cookies()).find((cookie) =>
      cookie.name.startsWith('__Host-sl-recipient-'),
    );
    expect(cookie?.secure).toBe(true);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.path).toBe('/');
    await page.getByRole('button', { name: 'Open the envelope', exact: true }).click();
    await expect
      .poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime))
      .toBeGreaterThan(0.2);
    const handle = await page.locator('audio').elementHandle();
    await page.getByRole('button', { name: 'Go to Heartbeat', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Reveal a little message' })).toBeVisible();
    expect(await page.locator('audio').evaluate((audio, old) => audio === old, handle!)).toBe(true);
    await page.getByRole('button', { name: 'Go to Letter', exact: true }).click();
    await expect(page.getByText('Synthetic target validation')).toBeVisible();
    letter = (await (await owner.request.get(`${origin}/api/letters/${id}`)).json()).data;
    expect(
      (
        await owner.request.post(`${origin}/api/letters/${id}/unpublish`, {
          headers,
          data: { expectedVersion: letter.version },
        })
      ).status(),
    ).toBe(200);
    expect((await reader.request.get(media, { headers: { range: 'bytes=0-9' } })).status()).toBe(
      404,
    );
    await page.reload();
    await expect(page.locator('audio')).toHaveCount(0);
    // Cron auth denial is safe; do not execute global cleanup of historical test data.
    expect((await owner.request.get(`${origin}/api/cron/cleanup`)).status()).toBe(401);
  } finally {
    if (id) {
      const current = await owner.request.get(`${origin}/api/letters/${id}`);
      if (current.ok())
        await owner.request.delete(`${origin}/api/letters/${id}`, {
          headers,
          data: { expectedVersion: (await current.json()).data.version },
        });
    }
    await owner.close();
    await reader.close();
    await locked.dispose();
  }
});
