import { test, expect as baseExpect } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { createClient } from '@supabase/supabase-js';
import { silentMp3 } from '../fixtures/mp3';
const expect = baseExpect.configure({ timeout: 15000 });
const origin = 'http://localhost:3000',
  headers = { origin };

test('complete UI gift with photos, music, decoded QR, every scene and real media failures', async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  test.skip(
    process.env.SECRETLOVE_TEST_PROJECT !== 'isolated' || !process.env.TEST_CREATOR_GIFT_ID,
    'Requires isolated synthetic fixtures.',
  );
  const owner = page.request;
  const recipient = await browser.newContext({
    viewport: page.viewportSize()!,
    reducedMotion: test.info().project.name === 'mobile' ? 'reduce' : 'no-preference',
  });
  const reader = await recipient.newPage(),
    title = `Complete gift ${randomUUID()}`,
    message = `A personal synthetic message, kept private. ${randomUUID()}`;
  const phrase = 'synthetic-gift-secret-phrase';
  const heartTitle = `Nhịp tim dành cho em ${randomUUID()}`;
  const heartMessage =
    '<script>window.secretloveSceneExecuted=true</script> Em là điều đặc biệt 💗';
  const closingTitle = 'Hẹn em ở những ngày bình yên';
  const closingMessage = 'Luôn ở đây cùng em.\nCảm ơn vì đã đọc lời nhắn này 💗';
  const ringPhrase = 'Cảm ơn vì đã xuất hiện 💗';
  let id = '',
    secondId = '';
  const privateRequests: string[] = [];
  reader.on('request', (r) => {
    if (/\/content$|\/media(?:\?|$)/.test(r.url())) privateRequests.push(r.method());
  });
  try {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(process.env.TEST_CREATOR_GIFT_EMAIL!);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_CREATOR_GIFT_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/studio$/);
    await page.getByRole('link', { name: 'New letter', exact: true }).click();
    await page.getByLabel('Letter title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Create letter', exact: true }).click();
    await expect(page).toHaveURL(/\/studio\/letters\/[0-9a-f-]+$/);
    id = page.url().split('/').pop()!;
    await page.getByLabel('Recipient greeting name').fill('Synthetic gift reader');
    await page.getByLabel('Verification name').fill('Synthetic Gift Reader');
    await page.getByLabel('Date of birth').fill('2000-02-29');
    await page.getByLabel('Optional secret passphrase').selectOption('set');
    await page.getByLabel('New passphrase').fill(phrase);
    await page.getByRole('textbox', { name: 'Letter message' }).fill(message);
    const template = test.info().project.name === 'mobile' ? 'minimal' : 'rose';
    await page.getByLabel('Letter template').selectOption(template);
    await page.getByLabel('Heart heading', { exact: true }).fill(heartTitle);
    await page.getByLabel('Heart revealed message', { exact: true }).fill(heartMessage);
    await page.getByLabel('Closing heading', { exact: true }).fill(closingTitle);
    await page.getByLabel('Closing message', { exact: true }).fill(closingMessage);
    await page.getByRole('button', { name: 'Add ring phrase', exact: true }).click();
    await page.getByLabel('Ring phrase 1', { exact: true }).fill(ringPhrase);
    await page.getByRole('button', { name: 'Add ring phrase', exact: true }).click();
    await page
      .getByLabel('Ring phrase 2', { exact: true })
      .fill('<script>window.bad=true</script>');
    await page.getByLabel('Ring rotation speed').selectOption('normal');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Your letter is saved.' })).toHaveText(
      'Your letter is saved.',
    );
    for (let i = 0; i < 2; i++) {
      const buffer = await sharp({
        create: {
          width: 80 + i * 10,
          height: 60,
          channels: 3,
          background: i ? '#fff5e7' : '#dda7b4',
        },
      })
        .png()
        .toBuffer();
      await page
        .getByLabel('Choose a photo')
        .setInputFiles({ name: `synthetic-memory-${i}.png`, mimeType: 'image/png', buffer });
      await page.getByLabel('Describe this memory').fill(`Synthetic gift memory ${i + 1}`);
      await page.getByRole('button', { name: 'Upload private photo', exact: true }).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Your private photo is saved.' }),
      ).toHaveText('Your private photo is saved.');
      await expect
        .poll(() =>
          page
            .getByRole('img', { name: `Synthetic gift memory ${i + 1}`, exact: true })
            .evaluate((e: HTMLImageElement) => e.naturalWidth),
        )
        .toBe(80 + i * 10);
    }
    await page.getByLabel('Choose an MP3').setInputFiles({
      name: 'authorized-synthetic-silence.mp3',
      mimeType: 'audio/mpeg',
      buffer: silentMp3(),
    });
    await page.getByLabel('I have permission to use and share this music.').check();
    const uploaded = page.waitForResponse(
      (r) => r.url().endsWith(`/letters/${id}/music`) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Upload private music', exact: true }).click();
    expect((await uploaded).status()).toBe(201);
    await page.getByLabel('Enable background music').check();
    await page.getByLabel('Loop background music').check();
    const musicSaved = page.waitForResponse(
      (r) => r.url().endsWith(`/letters/${id}/music`) && r.request().method() === 'PATCH',
    );
    await page.getByRole('button', { name: 'Save music settings', exact: true }).click();
    expect((await musicSaved).status()).toBe(200);
    await page.getByRole('button', { name: 'Play preview', exact: true }).click();
    await expect
      .poll(() => page.locator('audio').evaluate((e: HTMLAudioElement) => e.paused))
      .toBe(false);
    await page.getByRole('button', { name: 'Pause music', exact: true }).click();
    await page.getByRole('link', { name: 'Preview saved letter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Dear Synthetic gift reader,' })).toBeVisible();
    await expect(page.getByText(message)).toBeVisible();
    await expect(page.locator('article').getByRole('heading', { name: heartTitle })).toBeVisible();
    await expect(page.getByRole('heading', { name: closingTitle })).toBeVisible();
    expect(await page.evaluate(() => 'secretloveSceneExecuted' in window)).toBe(false);
    await expect(page.getByRole('img')).toHaveCount(2);
    await page.getByRole('link', { name: '← Back to editor', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/studio/letters/${id}$`));
    await page.reload();
    await expect(page.getByLabel('Heart heading', { exact: true })).toHaveValue(heartTitle);
    await expect(page.getByLabel('Heart revealed message', { exact: true })).toHaveValue(
      heartMessage,
    );
    await expect(page.getByLabel('Closing heading', { exact: true })).toHaveValue(closingTitle);
    await expect(page.getByLabel('Closing message', { exact: true })).toHaveValue(closingMessage);
    let letter = (await (await owner.get(`/api/letters/${id}`)).json()).data;
    expect(letter.templateId).toBe(template);
    expect(letter.photos).toHaveLength(2);
    expect(letter.music.enabled).toBe(true);
    const publication = page.waitForResponse(
      (r) => r.url().endsWith(`/letters/${id}/publish`) && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Publish saved letter', exact: true }).click();
    const published = await publication;
    expect(published.status()).toBe(200);
    const result = (await published.json()).data;
    letter = result.letter;
    const share = result.shareUrl,
      token = share.split('/').pop(),
      base = `/api/recipient/${token}`,
      aid = letter.audioAsset.id,
      audioUrl = `${base}/audio/${aid}/media`;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect(page.getByLabel('Private sharing link')).toHaveValue(share);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download QR', exact: true }).click();
    const qr = await download;
    expect(qr.suggestedFilename()).toBe('secretlove-qr.png');
    const png = await readFile((await qr.path())!);
    const pixels = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(pixels.info.width).toBe(768);
    const decoded = jsQR(new Uint8ClampedArray(pixels.data), pixels.info.width, pixels.info.height);
    expect(decoded?.data).toBe(share);
    for (const route of ['content', `photos/${letter.photos[0].id}/media`, `audio/${aid}/media`]) {
      expect((await recipient.request.get(`${origin}${base}/${route}`)).status()).toBe(401);
    }
    const landing = await reader.goto(share);
    expect(await landing!.text()).not.toContain(message);
    expect(await reader.content()).not.toContain('Synthetic gift reader');
    expect(await reader.content()).not.toContain(heartTitle);
    expect(await reader.content()).not.toContain(closingMessage);
    expect(await reader.content()).not.toContain(ringPhrase);
    expect(privateRequests).toEqual([]);
    await reader.getByRole('button', { name: 'Unlock your gift', exact: true }).click();
    await reader.getByLabel('Full name').fill('Wrong synthetic name');
    await reader.getByLabel('Date of birth').fill('2000-02-29');
    await reader.getByLabel('Secret passphrase').fill(phrase);
    await reader.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    await expect(reader.locator('.sl-alert')).toContainText('Those details did not unlock');
    expect(await reader.content()).not.toContain(message);
    await reader.getByLabel('Full name').fill('  Ｓynthetic   GIFT Reader  ');
    await reader.getByLabel('Secret passphrase').fill('wrong-synthetic-phrase');
    const wrong = reader.waitForResponse((r) => r.url().endsWith(`${base}/verify`));
    await reader.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    expect((await wrong).status()).toBe(401);
    await reader.getByLabel('Secret passphrase').fill(phrase);
    await reader.getByRole('button', { name: 'Unlock the gift', exact: true }).click();
    await expect(
      reader.getByRole('button', { name: 'Open the envelope', exact: true }),
    ).toBeVisible();
    const content = (await (await recipient.request.get(`${origin}${base}/content`)).json()).data;
    const expires = content.expiresAt;
    expect(content.presentation.template.id).toBe(template);
    expect(content.sceneText.heart.title).toBe(heartTitle);
    expect(content.sceneText.closing.message).toBe(closingMessage);
    expect(content.presentation.configuration.heartCustomization.textRings.phrases).toEqual([
      ringPhrase,
      '<script>window.bad=true</script>',
    ]);
    await reader.getByRole('button', { name: 'Open the envelope', exact: true }).click();
    await expect
      .poll(() =>
        reader
          .locator('.sl-envelope .sl-envelope-letter')
          .evaluate((e) => Number(getComputedStyle(e).opacity)),
      )
      .toBeGreaterThan(0.95);
    await expect
      .poll(() =>
        reader
          .locator('.sl-envelope .sl-envelope-flap')
          .evaluate((e: HTMLElement) => e.style.transform),
      )
      .toContain('rotateX(180deg)');
    await reader.getByRole('button', { name: 'Continue to the heartbeat', exact: true }).click();
    await expect(reader.getByRole('heading', { name: heartTitle })).toBeVisible();
    await expect(reader.getByLabel('Heart ring phrases')).toContainText(ringPhrase);
    expect(await reader.evaluate(() => 'bad' in window)).toBe(false);
    if (test.info().project.name === 'desktop') {
      const canvas = reader.locator('canvas');
      await expect(canvas).toBeVisible();
      const first = createHash('sha256')
        .update(await canvas.screenshot())
        .digest('hex');
      await expect
        .poll(
          async () =>
            createHash('sha256')
              .update(await canvas.screenshot())
              .digest('hex'),
          { timeout: 10000 },
        )
        .not.toBe(first);
    } else {
      await expect(reader.locator('.sl-static-heart')).toBeVisible();
      await expect(reader.locator('canvas')).toHaveCount(0);
    }
    await reader.screenshot({
      path: `test-results/gift-heart-${test.info().project.name}.png`,
      fullPage: true,
    });
    await reader.getByRole('button', { name: 'Reveal a little message', exact: true }).click();
    await expect(reader.locator('.sl-heart-scene').getByRole('status')).toContainText(heartMessage);
    expect(await reader.evaluate(() => 'secretloveSceneExecuted' in window)).toBe(false);
    await reader.getByRole('button', { name: 'Go to Memories', exact: true }).click();
    for (let i = 0; i < 2; i++) {
      await expect
        .poll(() =>
          reader
            .getByRole('img', { name: `Synthetic gift memory ${i + 1}`, exact: true })
            .evaluate((e: HTMLImageElement) => e.naturalWidth),
        )
        .toBe(80 + i * 10);
    }
    await expect
      .poll(() => reader.locator('audio').evaluate((e: HTMLAudioElement) => e.currentTime))
      .toBeGreaterThan(0.2);
    const audio = await reader.locator('audio').elementHandle();
    await reader.getByRole('button', { name: 'Go to Letter', exact: true }).click();
    expect(await reader.locator('audio').evaluate((e, previous) => e === previous, audio!)).toBe(
      true,
    );
    expect(await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.paused)).toBe(false);
    await expect(reader.getByText(message)).toBeVisible();
    await reader.getByRole('button', { name: 'Go to Closing', exact: true }).click();
    await expect(reader.getByRole('heading', { name: closingTitle })).toBeVisible();
    await expect(reader.getByText('Luôn ở đây cùng em.', { exact: false })).toBeVisible();
    await expect(
      reader.getByRole('button', { name: /Pause music|Mute music|Open with music/ }),
    ).toHaveCount(0);
    expect(await reader.locator('audio').evaluate((e: HTMLAudioElement) => e.paused)).toBe(false);
    expect(await reader.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await reader.screenshot({
      path: `test-results/gift-closing-${test.info().project.name}.png`,
      fullPage: true,
    });
    // Playwright clocks affect the entire context: use an independent context
    // and acquire its session through normal server verification, never injection.
    const expiryContext = await browser.newContext({
      viewport: page.viewportSize()!,
      reducedMotion: 'reduce',
    });
    try {
      const expiryReader = await expiryContext.newPage();
      await expiryReader.clock.install({ time: new Date() });
      expect(
        (
          await expiryContext.request.post(`${origin}${base}/verify`, {
            headers,
            data: { name: 'Synthetic Gift Reader', dateOfBirth: '2000-02-29', passphrase: phrase },
          })
        ).status(),
      ).toBe(200);
      await expiryReader.goto(share);
      await expiryReader
        .getByRole('button', { name: 'Already unlocked? Continue reading', exact: true })
        .click();
      await expiryReader.getByRole('button', { name: 'Open the envelope', exact: true }).click();
      await expect
        .poll(() => expiryReader.locator('audio').evaluate((e: HTMLAudioElement) => e.paused))
        .toBe(false);
      const expiredAudio = await expiryReader.locator('audio').elementHandle();
      await expiryReader.clock.fastForward(31 * 60 * 1000);
      await expect(
        expiryReader.getByText('Your reading session has ended. Unlock again to continue.'),
      ).toBeVisible();
      await expect(expiryReader.locator('audio')).toHaveCount(0);
      expect(
        await expiredAudio!.evaluate((e: HTMLAudioElement) => e.paused && !e.getAttribute('src')),
      ).toBe(true);
      expect(await expiryReader.content()).not.toContain(message);
    } finally {
      await expiryContext.close();
    }
    // Browser transport failures never fabricate authorization or successful private responses.
    await reader.route('**/photos/*/media', (route) => route.abort('failed'));
    const photoRecheck = reader.waitForResponse((r) => r.url().endsWith(`${base}/content`));
    await reader.getByRole('button', { name: 'Go to Memories', exact: true }).click();
    await expect(
      reader.getByText('This memory could not load. You can keep reading.').first(),
    ).toBeVisible();
    expect((await photoRecheck).status()).toBe(200);
    await reader.getByRole('button', { name: 'Go to Letter', exact: true }).click();
    await expect(reader.getByText(message)).toBeVisible();
    await reader.unroute('**/photos/*/media');
    await reader.reload();
    await expect(reader.locator('audio')).toHaveCount(0);
    await reader.route('**/audio/*/media', (route) => route.abort('failed'));
    let audioChecks = 0;
    reader.on('response', (r) => {
      if (r.url().endsWith(`${base}/content`) && r.status() === 200) audioChecks++;
    });
    await reader
      .getByRole('button', { name: 'Already unlocked? Continue reading', exact: true })
      .click();
    await expect(
      reader.getByRole('button', { name: 'Open the envelope', exact: true }),
    ).toBeVisible();
    const resumed = (await (await recipient.request.get(`${origin}${base}/content`)).json()).data;
    expect(resumed.expiresAt).toBe(expires);
    await reader.getByRole('button', { name: 'Open the envelope', exact: true }).click();
    await expect(reader.locator('.sl-soundtrack-status [role="status"]')).toContainText(
      /Music could not (play|load)/,
    );
    await expect.poll(() => audioChecks).toBeGreaterThanOrEqual(2);
    await reader.getByRole('button', { name: 'Go to Letter', exact: true }).click();
    await expect(reader.getByText(message)).toBeVisible();
    await reader.unroute('**/audio/*/media');
    // Remove only this synthetic owner's object to test a genuine missing Storage object.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const asset = await admin
      .from('letter_assets')
      .select('object_path')
      .eq('id', aid)
      .eq('letter_id', id)
      .single();
    expect(asset.error).toBeNull();
    const path = asset.data!.object_path;
    expect(path).toBe(`${process.env.TEST_CREATOR_GIFT_ID}/${id}/${aid}.mp3`);
    expect((await admin.storage.from('letter-assets').remove([path])).error).toBeNull();
    expect((await recipient.request.get(`${origin}${audioUrl}`)).status()).toBe(503);
    await reader.reload();
    audioChecks = 0;
    await reader
      .getByRole('button', { name: 'Already unlocked? Continue reading', exact: true })
      .click();
    await reader.getByRole('button', { name: 'Open the envelope', exact: true }).click();
    await expect(reader.locator('.sl-soundtrack-status [role="status"]')).toContainText(
      /Music could not (play|load)/,
    );
    await expect.poll(() => audioChecks).toBeGreaterThanOrEqual(2);
    await reader.getByRole('button', { name: 'Go to Letter', exact: true }).click();
    await expect(reader.getByText(message)).toBeVisible();
    expect(
      (await recipient.request.get(`${origin}${base}/audio/${randomUUID()}/media`)).status(),
    ).toBe(404);
    // A separately published legacy/null-config letter retains silence and cannot borrow media.
    const created = await owner.post('/api/letters', {
      headers,
      data: { title: `Legacy isolation ${randomUUID()}` },
    });
    let second = (await created.json()).data;
    secondId = second.id;
    const saved = await owner.patch(`/api/letters/${secondId}`, {
      headers,
      data: {
        expectedVersion: second.version,
        recipientDisplayName: 'Legacy synthetic reader',
        verification: { name: 'Legacy synthetic reader', dateOfBirth: '2000-01-01' },
        bodyDoc: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Legacy private content' }] },
          ],
        },
      },
    });
    second = (await saved.json()).data;
    const secondPublished = await owner.post(`/api/letters/${secondId}/publish`, {
      headers,
      data: { expectedVersion: second.version },
    });
    const secondShare = (await secondPublished.json()).data.shareUrl,
      secondBase = `/api/recipient/${secondShare.split('/').pop()}`;
    expect(secondShare).not.toBe(share);
    const cookie = (await recipient.cookies()).find(
      (c) => c.name.startsWith('sl-recipient-dev-') || c.name.startsWith('__Host-sl-recipient-'),
    )!;
    const transplantName = cookie.name.startsWith('__Host')
      ? '__Host-sl-recipient-'
      : 'sl-recipient-dev-';
    const forgedCookie = `${transplantName}${createHash('sha256').update(secondShare.split('/').pop()!).digest('hex').slice(0, 32)}=${cookie.value}`;
    expect(
      (
        await recipient.request.get(`${origin}${secondBase}/audio/${aid}/media`, {
          headers: { cookie: forgedCookie },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await recipient.request.post(`${origin}${secondBase}/verify`, {
          headers,
          data: { name: 'Legacy synthetic reader', dateOfBirth: '2000-01-01' },
        })
      ).status(),
    ).toBe(200);
    for (const route of [`audio/${aid}/media`, `photos/${letter.photos[0].id}/media`])
      expect((await recipient.request.get(`${origin}${secondBase}/${route}`)).status()).toBe(404);
    const legacyContent = (
      await (await recipient.request.get(`${origin}${secondBase}/content`)).json()
    ).data;
    expect(legacyContent.presentation.configuration.music.enabled).toBe(false);
    expect(legacyContent.presentation.configuration.music.assetId).toBeNull();
    const revoked = await owner.post(`/api/letters/${id}/unpublish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    expect(revoked.status()).toBe(200);
    for (const route of ['content', `photos/${letter.photos[0].id}/media`, `audio/${aid}/media`])
      expect((await recipient.request.get(`${origin}${base}/${route}`)).status()).toBe(404);
  } finally {
    for (const lid of [id, secondId]) {
      if (!lid) continue;
      const current = await owner.get(`/api/letters/${lid}`);
      if (current.ok()) {
        const l = (await current.json()).data;
        expect([200, 202]).toContain(
          (
            await owner.delete(`/api/letters/${lid}`, {
              headers,
              data: { expectedVersion: l.version },
            })
          ).status(),
        );
      }
    }
    await recipient.close();
  }
});
