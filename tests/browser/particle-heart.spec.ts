import { test, expect as baseExpect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const expect = baseExpect.configure({ timeout: 15000 });
const headers = { origin: 'http://localhost:3000' };
test('private heart customization, Unicode limits, actual preview, GPU lifecycle and static fallbacks', async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  test.skip(
    process.env.SECRETLOVE_TEST_PROJECT !== 'isolated' || !process.env.TEST_CREATOR_GIFT_EMAIL,
    'Requires isolated fixtures and migration 006.',
  );
  let id = '';
  const errors: string[] = [];
  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (/hydrat|Minified React error #418/i.test(text)) hydrationErrors.push('hydration-error');
      console.log(
        `Heart console category: ${text.includes('WebGL') ? 'WebGL' : (text.match(/Minified React error #\d+/)?.[0] ?? 'Other runtime error')}`,
      );
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.name);
    console.log(
      `Heart browser runtime error: ${error.message.match(/Minified React error #\d+/)?.[0] ?? error.name}`,
    );
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  try {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email address').fill(process.env.TEST_CREATOR_GIFT_EMAIL!);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.TEST_CREATOR_GIFT_PASSWORD!);
    const signedIn = page.waitForResponse(
      (response) => response.url().endsWith('/api/auth/login'),
      { timeout: 20000 },
    );
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    expect((await signedIn).status()).toBe(200);
    await expect(page).toHaveURL(/\/studio$/);
    const created = await page.request.post('/api/letters', {
      headers,
      data: { title: `Particle test ${randomUUID()}` },
    });
    expect(created.status()).toBe(201);
    const letter = (await created.json()).data;
    id = letter.id;
    await page.goto(`/studio/letters/${id}`);
    for (let i = 1; i <= 5; i++) {
      await page.getByRole('button', { name: 'Add ring phrase', exact: true }).click();
      await page
        .getByLabel(`Ring phrase ${i}`, { exact: true })
        .fill(i === 1 ? ' Cảm ơn   em 💗 ' : `With love, always ${i}`);
    }
    await expect(page.getByRole('button', { name: 'Add ring phrase', exact: true })).toBeDisabled();
    await page.getByLabel('Ring phrase 5', { exact: true }).fill('x'.repeat(61));
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('alert').first()).toContainText('1–60 Unicode');
    await page.getByRole('button', { name: 'Remove phrase 5', exact: true }).click();
    await page.getByRole('button', { name: 'Add ring phrase', exact: true }).click();
    await page.getByLabel('Ring phrase 5', { exact: true }).fill('W'.repeat(60));
    await page.getByLabel('Heart color').selectOption('purple');
    await page.getByLabel('Ring rotation speed').selectOption('fast');
    await page.getByRole('button', { name: 'Preview 3D heart', exact: true }).click();
    console.log(
      'Heart preview mode:',
      await page.locator('.sl-heart-scene').getAttribute('data-heart-mode'),
    );
    console.log(
      'Browser motion query:',
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    );
    const canvas = page.locator('canvas');
    try {
      await expect(canvas).toBeVisible();
    } catch (error) {
      console.log(
        'Heart diagnostic:',
        await page.locator('.sl-heart-viewport').evaluate((element) => ({
          mode: element.parentElement?.getAttribute('data-heart-mode'),
          width: element.clientWidth,
          height: element.clientHeight,
          children: Array.from(element.children).map((e) => ({
            tag: e.tagName,
            width: e.clientWidth,
            height: e.clientHeight,
            innerTags: Array.from(e.children).map((c) => c.tagName),
          })),
        })),
      );
      throw error;
    }
    await expect(canvas).toHaveAttribute(
      'data-particles',
      test.info().project.name === 'mobile' ? '6000' : '11000',
    );
    const bounds = await canvas.boundingBox();
    await canvas.click({ position: { x: bounds!.width / 2, y: bounds!.height * 0.32 } });
    await expect(page.locator('.sl-heart-scene').getByRole('status')).toContainText(
      'Some feelings',
    );
    await page.getByRole('button', { name: 'Reveal a little message', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.sl-heart-scene').getByRole('status')).toContainText(
      'Some feelings',
    );
    expect(
      (await (await page.request.get(`/api/letters/${id}`)).json()).data.heartCustomization.heart
        .color,
    ).toBe('pink');
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled();
    await page
      .locator('.sl-owner-heart-preview')
      .screenshot({ path: `test-results/particle-heart-five-${test.info().project.name}.png` });
    await page.getByRole('button', { name: 'Close heart preview', exact: true }).click();
    await expect(canvas).toHaveCount(0);
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByText('Your saved letter is private.', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Ring phrase 1', { exact: true })).toHaveValue('Cảm ơn em 💗');
    await page.reload();
    await expect(page.getByLabel('Heart color')).toHaveValue('purple');
    await expect(page.getByLabel('Ring phrase 1', { exact: true })).toHaveValue('Cảm ơn em 💗');
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
    await expect(page.getByLabel('Ring phrase 5', { exact: true })).toHaveValue('W'.repeat(60));
    const stored = (await (await page.request.get(`/api/letters/${id}`)).json()).data;
    const invalid = await page.request.patch(`/api/letters/${id}`, {
      headers,
      data: {
        expectedVersion: stored.version,
        heartCustomization: { ...stored.heartCustomization, script: 'alert(1)' },
      },
    });
    expect(invalid.status()).toBe(400);
    // Reset only this section; main message/copy/music stay unchanged.
    await page.getByRole('button', { name: 'Reset heart customization', exact: true }).click();
    await expect(page.getByLabel('Heart color')).toHaveValue('pink');
    await expect(page.getByLabel('Ring phrase 1', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByText('Your saved letter is private.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Preview 3D heart', exact: true }).click();
    await expect(canvas).toBeVisible();
    await page.locator('.sl-heart-viewport').scrollIntoViewIfNeeded();
    const profile = await canvas.evaluate(async (element) => {
      const samples: number[] = [];
      let last = performance.now();
      const start = last;
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          samples.push(now - last);
          last = now;
          if (now - start < 1600) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      const sorted = samples.slice(2).sort((a, b) => a - b);
      return {
        particles: element.getAttribute('data-particles'),
        drawCalls: element.getAttribute('data-draw-calls'),
        geometries: element.getAttribute('data-geometries'),
        textures: element.getAttribute('data-textures'),
        frames: sorted.length,
        medianMs: sorted[Math.floor(sorted.length * 0.5)],
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      };
    });
    await writeFile(
      `test-results/heart-profile-${test.info().project.name}.json`,
      JSON.stringify(profile, null, 2),
    );
    await page
      .locator('.sl-owner-heart-preview')
      .screenshot({ path: `test-results/particle-heart-${test.info().project.name}.png` });
    const pixels = await canvas.screenshot();
    await expect
      .poll(async () => Buffer.compare(pixels, await canvas.screenshot()), { timeout: 10000 })
      .not.toBe(0);
    // Deliberate WebGL context failure falls back and leaves reveal/navigation usable.
    await canvas.evaluate((element) =>
      element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    );
    await expect(page.locator('.sl-static-heart')).toBeVisible();
    await expect(page.getByLabel('Heart ring phrases')).toBeVisible();
    await expect(canvas).toHaveCount(0);
    await page.getByRole('button', { name: 'Close heart preview', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Preview 3D heart', exact: true }).click();
    await expect(page.locator('.sl-static-heart')).toBeVisible();
    await expect(canvas).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/studio/letters/${id}/preview`);
    await page.reload();
    await expect(page.locator('.sl-owner-heart-preview canvas')).toBeVisible();
    await expect(page.locator('.sl-owner-heart-preview')).toHaveCount(1);
    expect(hydrationErrors).toEqual([]);
    expect(errors).toEqual([]);
    // Another creator cannot write the protected config; anonymous cannot read it.
    const other = await browser.newContext();
    try {
      await other.request.post('/api/auth/login', {
        headers,
        data: {
          email: process.env.TEST_CREATOR_B_EMAIL,
          password: process.env.TEST_CREATOR_B_PASSWORD,
        },
      });
      const saved = (await (await page.request.get(`/api/letters/${id}`)).json()).data;
      expect(
        (
          await other.request.patch(`/api/letters/${id}`, {
            headers,
            data: { expectedVersion: saved.version, heartCustomization: null },
          })
        ).status(),
      ).toBe(404);
      const anon = await browser.newContext();
      try {
        expect((await anon.request.get(`/api/letters/${id}`)).status()).toBe(401);
      } finally {
        await anon.close();
      }
    } finally {
      await other.close();
    }
  } finally {
    if (id) {
      try {
        const response = await page.request.get(`/api/letters/${id}`, { timeout: 15000 });
        if (response.ok()) {
          const current = (await response.json()).data;
          await page.request.delete(`/api/letters/${id}`, {
            headers,
            timeout: 15000,
            data: { expectedVersion: current.version },
          });
        }
      } catch {
        console.log('Heart synthetic letter cleanup pending.');
      }
    }
  }
});
