import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { silentMp3 } from '../fixtures/mp3';
import { AUDIO_HARD_MAX } from '../../src/lib/audio-limits';
const origin = 'http://localhost:3000',
  headers = { origin };
test('private MP3 upload, owner controls, automatic recipient soundtrack, isolation and cleanup', async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  test.skip(
    process.env.SECRETLOVE_TEST_PROJECT !== 'isolated' || !process.env.TEST_CREATOR_A_EMAIL,
    'Requires isolated project and synthetic accounts.',
  );
  const owner = page.request;
  // Five-minute copyright-free audio, >3 MiB: exercise migration 004 and the
  // real larger upload/download path without publishing the creator's song.
  const fullSong = silentMp3(Math.floor((300 * 44100) / 1152));
  expect(
    (
      await owner.post('/api/auth/login', {
        headers,
        data: {
          email: process.env.TEST_CREATOR_A_EMAIL,
          password: process.env.TEST_CREATOR_A_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const outsider = await browser.newContext();
  expect(
    (
      await outsider.request.post(`${origin}/api/auth/login`, {
        headers,
        data: {
          email: process.env.TEST_CREATOR_B_EMAIL,
          password: process.env.TEST_CREATOR_B_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const context = await browser.newContext({
      viewport: page.viewportSize()!,
      reducedMotion: 'reduce',
    }),
    reader = await context.newPage();
  let id = '',
    secondId = '',
    assetPath = '';
  const musicRequests: string[] = [];
  await reader.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let rejectOnce = true;
    HTMLMediaElement.prototype.play = function () {
      if (rejectOnce) {
        rejectOnce = false;
        return Promise.reject(
          new DOMException('Synthetic autoplay restriction', 'NotAllowedError'),
        );
      }
      return original.call(this);
    };
  });
  reader.on('request', (request) => {
    if (request.url().includes('/audio/')) musicRequests.push(request.method());
  });
  try {
    let response = await owner.post('/api/letters', {
      headers,
      data: { title: `Music smoke ${randomUUID()}` },
    });
    expect(response.status()).toBe(201);
    let letter = (await response.json()).data;
    id = letter.id;
    response = await owner.patch(`/api/letters/${id}`, {
      headers,
      data: {
        expectedVersion: letter.version,
        recipientDisplayName: 'Music reader',
        bodyDoc: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'A private letter with a soundtrack.' }],
            },
          ],
        },
        verification: { name: 'Synthetic Music Reader', dateOfBirth: '2000-01-01' },
      },
    });
    expect(response.status()).toBe(200);
    letter = (await response.json()).data;
    // Malformed MP3 rejection is exercised below through the editor UI and its
    // real API response. Do not duplicate a counted upload in the shared quota.
    for (const [rights, mime, buffer, status] of [
      ['false', 'audio/mpeg', silentMp3(), 400],
      ['true', 'audio/wav', silentMp3(), 415],
      ['true', 'audio/mpeg', Buffer.alloc(AUDIO_HARD_MAX + 1), 413],
    ] as const) {
      const rejected = await owner.post(`/api/letters/${id}/music`, {
        headers,
        multipart: {
          expectedVersion: letter.version,
          rightsAcknowledged: rights,
          file: { name: 'invalid.mp3', mimeType: mime, buffer },
        },
      });
      expect(rejected.status()).toBe(status);
    }
    await page.goto(`/studio/letters/${id}`);
    const musicPanel = page.getByRole('region', { name: 'Background music settings', exact: true });
    await page.getByLabel('Title', { exact: true }).fill(`Music regression ${randomUUID()}`);
    await expect(
      musicPanel.getByText('Save your letter changes before changing music.'),
    ).toBeVisible();
    const saveLetter = page.waitForResponse(
      (r) => r.url().endsWith(`/letters/${id}`) && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    const savedLetter = await saveLetter;
    expect(savedLetter.status()).toBe(200);
    letter = (await savedLetter.json()).data;
    await expect(page.getByLabel('Enable background music')).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Save music settings', exact: true }),
    ).toBeDisabled();
    await expect(
      musicPanel.getByText('Upload a private MP3 track before enabling background music.'),
    ).toBeVisible();
    await page.getByLabel('Choose an MP3').setInputFiles({
      name: 'invalid.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('not an MP3'),
    });
    await page.getByLabel('I have permission to use and share this music.').check();
    await expect(
      musicPanel.getByText('File selected, not uploaded.', { exact: false }),
    ).toBeVisible();
    await expect(page.getByLabel('Enable background music')).toBeDisabled();
    // Forward the real server's denial to exercise inline feedback. Chromium
    // rewrites Origin on native same-origin requests, so route.fetch sends it.
    const musicRoute = `**/api/letters/${id}/music/ingests`;
    await page.route(musicRoute, async (route) => {
      const denied = await route.fetch({
        headers: { ...route.request().headers(), origin: 'http://10.136.153.57:3000' },
      });
      await route.fulfill({ response: denied });
    });
    const blockedUpload = page.waitForResponse(
      (r) => r.url().endsWith(`/letters/${id}/music/ingests`) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Upload private music', exact: true }).click();
    expect((await blockedUpload).status()).toBe(403);
    await expect(musicPanel.getByRole('alert')).toContainText(
      'This address does not match APP_ORIGIN.',
    );
    await page.unroute(musicRoute);
    const badUpload = page.waitForResponse(
      (r) =>
        new RegExp(`/letters/${id}/music/ingests/[0-9a-f-]+$`).test(r.url()) &&
        r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Upload private music', exact: true }).click();
    expect((await badUpload).status()).toBe(422);
    await expect(musicPanel.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Enable background music')).toBeDisabled();
    expect((await (await owner.get(`/api/letters/${id}`)).json()).data.audioAsset).toBeNull();
    const lanDenied = await owner.post(`/api/letters/${id}/music`, {
      headers: { origin: 'http://10.136.153.57:3000' },
      multipart: {
        expectedVersion: letter.version,
        rightsAcknowledged: 'true',
        file: { name: 'lan.mp3', mimeType: 'audio/mpeg', buffer: silentMp3() },
      },
    });
    expect(lanDenied.status()).toBe(403);
    expect((await lanDenied.json()).error.code).toBe('ORIGIN_DENIED');
    await page.getByLabel('Choose an MP3').setInputFiles({
      name: 'synthetic-silence.mp3',
      mimeType: 'audio/mpeg',
      buffer: fullSong,
    });
    await page.getByLabel('I have permission to use and share this music.').check();
    await expect(musicPanel.getByRole('alert')).toHaveCount(0);
    const partSizes: Promise<number>[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().includes(`/letters/${id}/music/ingests/`))
        // Chromium may omit Blob postData; use its transmitted Content-Length instead.
        partSizes.push(request.headerValue('content-length').then((value) => Number(value)));
    });
    const upload = page.waitForResponse(
      (r) =>
        new RegExp(`/letters/${id}/music/ingests/[0-9a-f-]+$`).test(r.url()) &&
        r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Upload private music', exact: true }).click();
    const uploadResponse = await upload;
    expect(uploadResponse.status()).toBe(201);
    expect(fullSong.length).toBeGreaterThan(4500000);
    expect(partSizes.length).toBe(Math.ceil(fullSong.length / 1048576));
    const wireSizes = await Promise.all(partSizes);
    expect(wireSizes).toEqual(
      Array.from({ length: partSizes.length }, (_, index) =>
        Math.min(1048576, fullSong.length - index * 1048576),
      ),
    );
    letter = (await uploadResponse.json()).data;
    const aid = letter.audioAsset.id;
    expect(letter.audioAsset.status).toBe('ready');
    expect(letter.audioAsset.durationSeconds).toBeGreaterThan(299);
    expect(fullSong.length).toBeGreaterThan(3145728);
    expect(letter.music.assetId).toBe(aid);
    expect(letter.music.enabled).toBe(false);
    await expect(page.getByLabel('Enable background music')).toBeEnabled();
    await expect(musicPanel.getByText('Track uploaded privately.', { exact: false })).toBeVisible();
    assetPath = `/api/letters/${id}/audio/${aid}/media`;
    await page.getByRole('button', { name: 'Play preview', exact: true }).click();
    await expect
      .poll(() => page.locator('audio').evaluate((e: HTMLAudioElement) => e.paused))
      .toBe(false);
    const previewHandle = await page.locator('audio').elementHandle();
    await page.getByLabel('Enable background music').check();
    await page.getByLabel('Loop background music').check();
    await page.getByLabel('Default volume').press('Home');
    for (let i = 0; i < 8; i++) await page.getByLabel('Default volume').press('ArrowRight');
    await expect(
      page.getByRole('button', { name: 'Publish saved letter', exact: true }),
    ).toBeDisabled();
    const settings = page.waitForResponse(
      (r) => r.url().endsWith(`/letters/${id}/music`) && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Save music settings', exact: true }).click();
    expect((await settings).status()).toBe(200);
    await expect(musicPanel.getByText('Music settings saved.', { exact: false })).toBeVisible();
    // Saving changed volume/loop must not unload a playing creator preview.
    expect(
      await page.locator('audio').evaluate((e, original) => e === original, previewHandle!),
    ).toBe(true);
    await expect
      .poll(() => page.locator('audio').evaluate((e: HTMLAudioElement) => e.paused))
      .toBe(false);
    expect(
      await page.locator('audio').evaluate((e: HTMLAudioElement) => e.getAttribute('src')),
    ).toBeTruthy();
    await page.getByRole('button', { name: 'Pause music', exact: true }).click();
    // Creator audition retains the controls removed from the recipient UI.
    await page.getByLabel('Music volume', { exact: true }).press('Home');
    for (let i = 0; i < 4; i++)
      await page.getByLabel('Music volume', { exact: true }).press('ArrowRight');
    expect(await page.locator('audio').evaluate((e: HTMLAudioElement) => e.volume)).toBeCloseTo(
      0.2,
    );
    await page.getByRole('button', { name: 'Mute music', exact: true }).click();
    expect(await page.locator('audio').evaluate((e: HTMLAudioElement) => e.muted)).toBe(true);
    await page.getByRole('button', { name: 'Unmute music', exact: true }).click();
    await page.reload();
    await expect(page.getByLabel('Enable background music')).toBeChecked();
    await expect(page.getByLabel('Loop background music')).toBeChecked();
    await expect(page.getByLabel('Default volume')).toHaveValue('0.4');
    letter = (await (await owner.get(`/api/letters/${id}`)).json()).data;
    expect((await outsider.request.get(`${origin}${assetPath}`)).status()).toBe(404);
    const ownerAudio = await owner.get(assetPath);
    expect(ownerAudio.status()).toBe(200);
    expect(ownerAudio.headers()['content-type']).toBe('audio/mpeg');
    expect(ownerAudio.headers()['cache-control']).toContain('no-store');
    expect((await ownerAudio.body()).equals(fullSong)).toBe(true);
    const published = await owner.post(`/api/letters/${id}/publish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    expect(published.status()).toBe(200);
    const share = (await published.json()).data.shareUrl,
      token = share.split('/').pop();
    await page.reload();
    await expect(
      musicPanel.getByText('Unpublish this letter before changing music.'),
    ).toBeVisible();
    await expect(page.getByLabel('Enable background music')).toBeDisabled();
    const base = `/api/recipient/${token}`,
      audioUrl = `${base}/audio/${aid}/media`;
    for (const method of ['GET', 'HEAD'])
      expect(
        (
          await context.request.fetch(`${origin}${audioUrl}`, {
            method,
            headers: { range: 'bytes=0-9' },
          })
        ).status(),
      ).toBe(401);
    await reader.goto(share);
    await reader.getByRole('button', { name: 'Unlock your gift', exact: true }).click();
    await reader.getByLabel('Full name').fill('Synthetic Music Reader');
    await reader.getByLabel('Date of birth').fill('2000-01-01');
    expect(musicRequests).toHaveLength(0);
    await reader.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    await expect(
      reader.getByText(
        'Your browser needs another interaction for sound. Open the envelope or continue the story to start the soundtrack.',
      ),
    ).toBeVisible();
    await expect(
      reader.getByRole('button', {
        name: /Open with music|Pause music|Play music|Mute music|Unmute music/,
      }),
    ).toHaveCount(0);
    await expect(reader.getByLabel('Music volume', { exact: true })).toHaveCount(0);
    expect(await reader.locator('audio').getAttribute('controls')).toBeNull();
    expect(await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
    await reader.getByRole('button', { name: 'Open the envelope', exact: true }).click();
    await expect
      .poll(() => reader.locator('audio').evaluate((e: HTMLAudioElement) => e.paused))
      .toBe(false);
    await expect
      .poll(() => reader.locator('audio').evaluate((e: HTMLAudioElement) => e.currentTime))
      .toBeGreaterThan(0.2);
    const handle = await reader.locator('audio').elementHandle();
    await reader.getByRole('button', { name: 'Go to Letter', exact: true }).click();
    expect(await reader.locator('audio').evaluate((e, original) => e === original, handle!)).toBe(
      true,
    );
    expect(
      await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.currentTime),
    ).toBeGreaterThan(0.2);
    expect(await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.volume)).toBeCloseTo(
      0.4,
    );
    expect(await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.muted)).toBe(false);
    expect(await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.loop)).toBe(true);
    await reader.locator('audio').evaluate((e: HTMLAudioElement) => {
      e.currentTime = e.duration - 0.15;
    });
    await expect
      .poll(() => reader.locator('audio').evaluate((e: HTMLAudioElement) => e.currentTime))
      .toBeLessThan(1);
    expect(await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.paused)).toBe(false);
    const range = await context.request.get(`${origin}${audioUrl}`, {
      headers: { range: 'bytes=0-9' },
    });
    expect(range.status()).toBe(206);
    expect((await range.body()).length).toBe(10);
    expect(range.headers()['content-range']).toMatch(/^bytes 0-9\//);
    expect((await context.request.head(`${origin}${audioUrl}`)).status()).toBe(200);
    expect(
      (
        await context.request.get(`${origin}${audioUrl}`, { headers: { range: 'bytes=0-9,20-30' } })
      ).status(),
    ).toBe(416);
    response = await owner.post('/api/letters', {
      headers,
      data: { title: `Other music ${randomUUID()}` },
    });
    let second = (await response.json()).data;
    secondId = second.id;
    response = await owner.post(`/api/letters/${secondId}/music`, {
      headers,
      multipart: {
        expectedVersion: second.version,
        rightsAcknowledged: 'true',
        file: { name: 'second.mp3', mimeType: 'audio/mpeg', buffer: silentMp3() },
      },
    });
    expect(response.status()).toBe(201);
    second = (await response.json()).data;
    expect(
      (await context.request.get(`${origin}${base}/audio/${second.audioAsset.id}/media`)).status(),
    ).toBe(404);
    // Browser/device controls remain effective: do not force a externally
    // paused track to restart when the user navigates to another scene.
    await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.pause());
    await reader.getByRole('button', { name: 'Go to Closing', exact: true }).click();
    expect(await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
    await reader.getByRole('button', { name: 'Go to Letter', exact: true }).click();
    // Inject the native error event and await successful protected revalidation.
    const revalidated = reader.waitForResponse((r) => r.url().endsWith(`${base}/content`));
    await reader
      .locator('audio')
      .evaluate((e: HTMLAudioElement) => e.dispatchEvent(new Event('error')));
    expect((await revalidated).status()).toBe(200);
    await expect(
      reader.getByText('Music could not load. You can keep reading or try again.'),
    ).toBeVisible();
    await expect(reader.getByText('A private letter with a soundtrack.')).toBeVisible();
    const close = reader.waitForResponse(
      (r) => r.url().endsWith(`${base}/session`) && r.request().method() === 'DELETE',
    );
    await reader.getByRole('button', { name: 'Close letter', exact: true }).first().click();
    expect((await close).status()).toBe(204);
    expect(
      await handle!.evaluate((e: HTMLAudioElement) => e.paused && !e.getAttribute('src')),
    ).toBe(true);
    expect((await context.request.get(`${origin}${audioUrl}`)).status()).toBe(401);
    letter = (await (await owner.get(`/api/letters/${id}`)).json()).data;
    response = await owner.post(`/api/letters/${id}/unpublish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    letter = (await response.json()).data;
    response = await owner.patch(`/api/letters/${id}/music`, {
      headers,
      data: { expectedVersion: letter.version, music: { ...letter.music, enabled: false } },
    });
    expect(response.status()).toBe(200);
    letter = (await response.json()).data;
    response = await owner.post(`/api/letters/${id}/publish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    const disabledShare = (await response.json()).data.shareUrl,
      disabledBase = `/api/recipient/${disabledShare.split('/').pop()}`;
    expect(
      (
        await context.request.post(`${origin}${disabledBase}/verify`, {
          headers,
          data: { name: 'Synthetic Music Reader', dateOfBirth: '2000-01-01' },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await context.request.get(`${origin}${disabledBase}/audio/${aid}/media`)).status(),
    ).toBe(404);
    letter = (await (await owner.get(`/api/letters/${id}`)).json()).data;
    response = await owner.post(`/api/letters/${id}/unpublish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    letter = (await response.json()).data;
    response = await owner.delete(`/api/letters/${id}/music`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    expect(response.status()).toBe(200);
    letter = (await response.json()).data;
    expect(letter.music.assetId).toBeNull();
    expect((await owner.get(assetPath)).status()).toBe(404);
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: assets } = await admin
      .from('letter_assets')
      .select('object_path')
      .eq('letter_id', secondId);
    const secondPath = assets?.[0]?.object_path;
    expect(secondPath).toBeTruthy();
    const oldPath = secondPath!
      .replace(`/${secondId}/`, `/${id}/`)
      .replace(`${second.audioAsset.id}.mp3`, `${aid}.mp3`);
    expect((await admin.storage.from('letter-assets').download(oldPath)).error).toBeNull();
    const publicStorage = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (await publicStorage.storage.from('letter-assets').download(oldPath)).error,
    ).not.toBeNull();
    // Delete only the exact object this test created/detached. Global cleanup
    // would also purge historical fixtures, which requires separate approval.
    expect(oldPath).toBe(`${process.env.TEST_CREATOR_A_ID}/${id}/${aid}.mp3`);
    expect((await admin.storage.from('letter-assets').remove([oldPath])).error).toBeNull();
    expect((await admin.storage.from('letter-assets').download(oldPath)).error).not.toBeNull();
    await page.goto(`/studio/letters/${id}`);
    await expect(page.getByLabel('Enable background music')).toBeDisabled();
    await page
      .getByLabel('Choose an MP3')
      .setInputFiles({ name: 'replacement.mp3', mimeType: 'audio/mpeg', buffer: silentMp3() });
    await page.getByLabel('I have permission to use and share this music.').check();
    const replace = page.waitForResponse(
      (r) =>
        new RegExp(`/letters/${id}/music/ingests/[0-9a-f-]+$`).test(r.url()) &&
        r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Upload private music', exact: true }).click();
    expect((await replace).status()).toBe(201);
  } finally {
    for (const lid of [id, secondId]) {
      if (!lid) continue;
      const found = await owner.get(`/api/letters/${lid}`);
      if (found.ok()) {
        const l = (await found.json()).data;
        await owner.delete(`/api/letters/${lid}`, {
          headers,
          data: { expectedVersion: l.version },
        });
      }
    }
    await context.close();
    await outsider.close();
  }
});
