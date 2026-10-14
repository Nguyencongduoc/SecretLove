import { test, expect } from '@playwright/test';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';
const origin = 'http://localhost:3000';
test('unknown gifts and anonymous recipient endpoints expose no protected content', async ({
  page,
  request,
}) => {
  const token = randomBytes(32).toString('base64url');
  for (const endpoint of [
    'bootstrap',
    'content',
    `photos/${randomUUID()}/media`,
    `audio/${randomUUID()}/media`,
  ]) {
    const response = await request.get(`/api/recipient/${token}/${endpoint}`);
    expect(response.status()).toBe(404);
    expect(response.headers()['cache-control']).toContain('no-store');
    expect(await response.text()).not.toContain('bodyDoc');
  }
  const foreign = await request.post(`/api/recipient/${token}/verify`, {
    headers: { origin: 'https://invalid.example' },
    data: { name: 'Synthetic', dateOfBirth: '2000-01-01' },
  });
  expect(foreign.status()).toBe(403);
  await page.goto(`/l/${token}`);
  await expect(page.getByRole('heading', { name: 'This gift is unavailable' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('real published gift unlocks into all scenes, protects photos, resumes, closes and revokes', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  test.skip(
    !process.env.TEST_CREATOR_A_EMAIL || process.env.SECRETLOVE_TEST_PROJECT !== 'isolated',
    'Requires isolated synthetic creator credentials.',
  );
  const owner = page.request;
  const headers = { origin };
  const login = await owner.post('/api/auth/login', {
    headers,
    data: {
      email: process.env.TEST_CREATOR_A_EMAIL,
      password: process.env.TEST_CREATOR_A_PASSWORD,
    },
  });
  expect(login.status()).toBe(200);
  let id = '';
  let secondId = '';
  const recipient = await browser.newContext({
    viewport: page.viewportSize()!,
    reducedMotion: test.info().project.name === 'mobile' ? 'reduce' : 'no-preference',
  });
  const reader = await recipient.newPage();
  const pageErrors: string[] = [];
  reader.on('pageerror', (error) => pageErrors.push(error.name));
  try {
    const created = await owner.post('/api/letters', {
      headers,
      data: { title: `Recipient smoke ${randomUUID()}` },
    });
    expect(created.status()).toBe(201);
    let letter = (await created.json()).data;
    id = letter.id;
    const privateMessage = `Private synthetic words ${randomUUID()}`;
    const saved = await owner.patch(`/api/letters/${id}`, {
      headers,
      data: {
        expectedVersion: letter.version,
        recipientDisplayName: 'Synthetic recipient',
        bodyDoc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: privateMessage, marks: [{ type: 'bold' }] }],
            },
          ],
        },
        verification: { name: 'Synthetic Reader', dateOfBirth: '2000-02-29' },
        passphrase: { action: 'set', value: 'synthetic-private-passphrase' },
      },
    });
    expect(saved.status()).toBe(200);
    letter = (await saved.json()).data;
    const input = await sharp({
      create: { width: 60, height: 40, channels: 3, background: '#dca6b4' },
    })
      .png()
      .toBuffer();
    const upload = await owner.post(`/api/letters/${id}/photos`, {
      headers,
      multipart: {
        expectedVersion: letter.version,
        altText: 'Synthetic rose memory',
        file: { name: 'memory.png', mimeType: 'image/png', buffer: input },
      },
    });
    expect(upload.status()).toBe(201);
    const photo = (await upload.json()).data;
    letter.version = photo.version;
    const published = await owner.post(`/api/letters/${id}/publish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    expect(published.status()).toBe(200);
    const publication = (await published.json()).data;
    letter = publication.letter;
    const token = publication.shareUrl.split('/').pop();
    const base = `/api/recipient/${token}`;
    await page.goto(`/studio/letters/${id}`);
    await expect(page.getByLabel('Private sharing link')).toHaveValue(publication.shareUrl);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download QR', exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('secretlove-qr.png');
    expect(
      (
        await owner.patch(`/api/letters/${id}`, {
          headers,
          data: { expectedVersion: letter.version, title: 'Forbidden' },
        })
      ).status(),
    ).toBe(409);
    // Creator login does not substitute for a recipient session.
    expect((await owner.get(`${base}/content`)).status()).toBe(401);
    expect(
      (await recipient.request.get(`${origin}${base}/photos/${photo.photo.id}/media`)).status(),
    ).toBe(401);
    expect(
      (
        await recipient.request.get(`${origin}${base}/photos/${photo.photo.id}/media`, {
          headers: { range: 'bytes=0-10' },
        })
      ).status(),
    ).toBe(401);
    expect(
      (await recipient.request.head(`${origin}${base}/photos/${photo.photo.id}/media`)).status(),
    ).toBe(401);
    const protectedRequests: string[] = [];
    reader.on('request', (request) => {
      if (request.url().includes(`${base}/content`) || request.url().includes('/media'))
        protectedRequests.push('private');
    });
    const landing = await reader.goto(publication.shareUrl);
    expect(landing?.status()).toBe(200);
    expect(await landing!.text()).not.toContain(privateMessage);
    await expect(
      reader.getByRole('button', { name: 'Unlock your gift', exact: true }),
    ).toBeEnabled();
    expect(await reader.content()).not.toContain('Synthetic recipient');
    expect(protectedRequests).toEqual([]);
    await reader.screenshot({
      path: `test-results/recipient-welcome-${test.info().project.name}.png`,
      fullPage: true,
    });
    await reader.getByRole('button', { name: 'Unlock your gift', exact: true }).click();
    await reader.getByLabel('Full name').fill('Wrong synthetic reader');
    await reader.getByLabel('Date of birth', { exact: true }).fill('2000-02-29');
    await reader.getByLabel('Secret passphrase').fill('synthetic-private-passphrase');
    await reader.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    await expect(reader.locator('.sl-alert')).toContainText('Those details did not unlock');
    expect(await reader.content()).not.toContain(privateMessage);
    await reader.getByLabel('Full name').fill('  Ｓynthetic   READER ');
    await reader.getByLabel('Secret passphrase').fill('');
    const missing = reader.waitForResponse(
      (response) =>
        response.url().endsWith(`${base}/verify`) && response.request().method() === 'POST',
    );
    await reader.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    expect((await missing).status()).toBe(401);
    await expect(reader.locator('.sl-alert')).toContainText('Those details did not unlock');
    await reader.getByLabel('Secret passphrase').fill('wrong-synthetic-passphrase');
    const incorrect = reader.waitForResponse(
      (response) =>
        response.url().endsWith(`${base}/verify`) && response.request().method() === 'POST',
    );
    await reader.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    expect((await incorrect).status()).toBe(401);
    await reader.getByLabel('Secret passphrase').fill('synthetic-private-passphrase');
    await reader.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    await expect(
      reader.getByRole('heading', { name: 'A little piece of someone’s heart' }),
    ).toBeVisible();
    const content = await recipient.request.get(`${origin}${base}/content`);
    expect(content.status()).toBe(200);
    const unlocked = (await content.json()).data;
    expect(unlocked.presentation.configuration.music.enabled).toBe(false);
    const serialized = JSON.stringify(unlocked);
    expect(serialized).not.toMatch(/identity_digest|passphrase|object_path|owner_id/);
    const cookie = (await recipient.cookies()).find(
      (cookie) =>
        cookie.name.startsWith('__Host-sl-recipient-') ||
        cookie.name.startsWith('sl-recipient-dev-'),
    );
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    const secondCreated = await owner.post('/api/letters', {
      headers,
      data: { title: `Second recipient isolation ${randomUUID()}` },
    });
    expect(secondCreated.status()).toBe(201);
    let second = (await secondCreated.json()).data;
    secondId = second.id;
    const secondSaved = await owner.patch(`/api/letters/${secondId}`, {
      headers,
      data: {
        expectedVersion: second.version,
        recipientDisplayName: 'Second synthetic reader',
        bodyDoc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Second synthetic private message' }],
            },
          ],
        },
        verification: { name: 'Second Synthetic Reader', dateOfBirth: '2000-01-01' },
      },
    });
    expect(secondSaved.status()).toBe(200);
    second = (await secondSaved.json()).data;
    const secondPublished = await owner.post(`/api/letters/${secondId}/publish`, {
      headers,
      data: { expectedVersion: second.version },
    });
    expect(secondPublished.status()).toBe(200);
    const secondToken = (await secondPublished.json()).data.shareUrl.split('/').pop();
    const secondBase = `/api/recipient/${secondToken}`;
    const transplantedName =
      cookie!.name.slice(0, -32) +
      createHash('sha256').update(secondToken).digest('hex').slice(0, 32);
    const transplanted = { cookie: `${transplantedName}=${cookie!.value}` };
    expect(
      (
        await recipient.request.get(`${origin}${secondBase}/content`, { headers: transplanted })
      ).status(),
    ).toBe(401);
    expect(
      (
        await recipient.request.get(`${origin}${secondBase}/photos/${photo.photo.id}/media`, {
          headers: transplanted,
        })
      ).status(),
    ).toBe(401);
    const noPhrase = await recipient.request.post(`${origin}${secondBase}/verify`, {
      headers,
      data: { name: 'Second Synthetic Reader', dateOfBirth: '2000-01-01' },
    });
    expect(noPhrase.status()).toBe(200);
    // B's valid session cannot borrow a photo from A.
    expect(
      (
        await recipient.request.get(`${origin}${secondBase}/photos/${photo.photo.id}/media`)
      ).status(),
    ).toBe(404);
    await reader.getByRole('button', { name: 'Open the envelope' }).click();
    await reader.getByRole('button', { name: 'Continue to the heartbeat' }).click();
    await expect(
      reader.getByRole('heading', { name: 'Every beat holds a thought of you' }),
    ).toBeVisible();
    await reader.getByRole('button', { name: 'Reveal a little message' }).click();
    await expect(reader.getByRole('status')).toContainText('Some feelings');
    await reader.screenshot({
      path: `test-results/recipient-heart-${test.info().project.name}.png`,
      fullPage: true,
    });
    if (test.info().project.name === 'mobile')
      await expect(reader.locator('canvas')).toHaveCount(0);
    else await expect(reader.locator('canvas')).toBeVisible();
    await reader.getByRole('button', { name: 'Go to Memories' }).click();
    const image = reader.getByRole('img', { name: 'Synthetic rose memory' });
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBe(60);
    const media = await recipient.request.get(`${origin}${base}/photos/${photo.photo.id}/media`);
    expect(media.status()).toBe(200);
    expect(media.headers()['content-type']).toContain('image/webp');
    expect(media.headers()['cache-control']).toContain('no-store');
    expect(
      (await recipient.request.get(`${origin}${base}/photos/${randomUUID()}/media`)).status(),
    ).toBe(404);
    expect(
      (
        await recipient.request.get(`${origin}${base}/audio/${randomUUID()}/media`, {
          headers: { range: 'bytes=0-3' },
        })
      ).status(),
    ).toBe(404);
    await reader.getByRole('button', { name: 'Go to Letter', exact: true }).click();
    await expect(reader.getByText(privateMessage)).toBeVisible();
    await reader.screenshot({
      path: `test-results/recipient-letter-${test.info().project.name}.png`,
      fullPage: true,
    });
    expect(await reader.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await reader.getByRole('button', { name: 'Go to Closing' }).click();
    await expect(
      reader.getByRole('heading', { name: 'Carry this feeling with you' }),
    ).toBeVisible();
    await reader.getByRole('button', { name: 'Replay the experience' }).click();
    await expect(reader.getByRole('button', { name: 'Open the envelope' })).toBeVisible();
    await reader.reload();
    await expect(
      reader.getByRole('button', { name: 'Already unlocked? Continue reading' }),
    ).toBeEnabled();
    await reader.getByRole('button', { name: 'Already unlocked? Continue reading' }).click();
    await expect(
      reader.getByRole('heading', { name: 'A little piece of someone’s heart' }),
    ).toBeVisible();
    const resumed = (await (await recipient.request.get(`${origin}${base}/content`)).json()).data;
    expect(resumed.expiresAt).toBe(unlocked.expiresAt);
    if (test.info().project.name === 'desktop') {
      const fallback = await recipient.newPage();
      await fallback.addInitScript(() => {
        const state = window as typeof window & { __slWebglRequests: number };
        state.__slWebglRequests = 0;
        const original = HTMLCanvasElement.prototype.getContext;
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
          value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
            if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') {
              state.__slWebglRequests++;
              return null;
            }
            return Reflect.apply(original, this, [type, ...args]);
          },
        });
      });
      await fallback.goto(publication.shareUrl);
      await fallback.getByRole('button', { name: 'Already unlocked? Continue reading' }).click();
      await fallback.getByRole('button', { name: 'Go to Heartbeat' }).click();
      await expect
        .poll(() =>
          fallback.evaluate(
            () => (window as typeof window & { __slWebglRequests: number }).__slWebglRequests,
          ),
        )
        .toBeGreaterThan(0);
      await expect(fallback.locator('.sl-static-heart')).toBeVisible();
      await expect(fallback.locator('canvas')).toHaveCount(0);
      await fallback.getByRole('button', { name: 'Go to Letter', exact: true }).click();
      await expect(fallback.getByText(privateMessage)).toBeVisible();
      await fallback.close();
    }
    const closing = reader.waitForResponse(
      (response) =>
        response.url().endsWith(`${base}/session`) && response.request().method() === 'DELETE',
    );
    await reader.getByRole('button', { name: 'Close letter', exact: true }).click();
    await expect(reader.getByRole('heading', { name: 'A moment, held close' })).toBeVisible();
    expect((await closing).status()).toBe(204);
    expect((await recipient.request.get(`${origin}${base}/content`)).status()).toBe(401);
    const verify = await recipient.request.post(`${origin}${base}/verify`, {
      headers,
      data: {
        name: 'Synthetic Reader',
        dateOfBirth: '2000-02-29',
        passphrase: 'synthetic-private-passphrase',
      },
    });
    expect(verify.status()).toBe(200);
    const revoke = await owner.post(`/api/letters/${id}/unpublish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    expect(revoke.status()).toBe(200);
    letter = (await revoke.json()).data;
    expect((await recipient.request.get(`${origin}${base}/content`)).status()).toBe(404);
    expect(
      (await recipient.request.get(`${origin}${base}/photos/${photo.photo.id}/media`)).status(),
    ).toBe(404);
    const again = await owner.post(`/api/letters/${id}/publish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    expect(again.status()).toBe(200);
    const fresh = (await again.json()).data;
    expect(fresh.shareUrl).not.toBe(publication.shareUrl);
    expect((await recipient.request.get(`${origin}${base}/bootstrap`)).status()).toBe(404);
    const otherBase = `/api/recipient/${fresh.shareUrl.split('/').pop()}`;
    expect((await recipient.request.get(`${origin}${otherBase}/content`)).status()).toBe(401);
    const limited = await recipient.request.post(`${origin}${otherBase}/verify`, {
      headers: {
        ...headers,
        'x-forwarded-for': '198.51.100.222',
        'x-vercel-forwarded-for': '198.51.100.223',
      },
      data: {
        name: 'Synthetic Reader',
        dateOfBirth: '2000-02-29',
        passphrase: 'synthetic-private-passphrase',
      },
    });
    expect(limited.status()).toBe(429);
    expect(limited.headers()['retry-after']).toBeTruthy();
    expect(pageErrors).toEqual([]);
  } finally {
    if (secondId) {
      const current = await owner.get(`/api/letters/${secondId}`);
      if (current.ok())
        await owner.delete(`/api/letters/${secondId}`, {
          headers,
          data: { expectedVersion: (await current.json()).data.version },
        });
    }
    if (id) {
      const current = await owner.get(`/api/letters/${id}`);
      if (current.ok())
        await owner.delete(`/api/letters/${id}`, {
          headers,
          data: { expectedVersion: (await current.json()).data.version },
        });
    }
    await recipient.close();
  }
});
