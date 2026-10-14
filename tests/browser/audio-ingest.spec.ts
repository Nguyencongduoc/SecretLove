import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import { silentMp3 } from '../fixtures/mp3';
const origin = 'http://localhost:3000',
  headers = { origin };
test('private chunk manifest, owner isolation, pending publication, cancellation and large streamed delivery', async ({
  browser,
}) => {
  test.setTimeout(180000);
  test.skip(
    process.env.SECRETLOVE_TEST_PROJECT !== 'isolated' || !process.env.TEST_CREATOR_GIFT_EMAIL,
    'Requires isolated tracked fixtures.',
  );
  const owner = await browser.newContext(),
    other = await browser.newContext(),
    recipient = await browser.newContext();
  let id = '';
  try {
    for (const [context, name] of [
      [owner, 'GIFT'],
      [other, 'B'],
    ] as const)
      expect(
        (
          await context.request.post(`${origin}/api/auth/login`, {
            headers,
            data: {
              email: process.env[`TEST_CREATOR_${name}_EMAIL`],
              password: process.env[`TEST_CREATOR_${name}_PASSWORD`],
            },
          })
        ).status(),
      ).toBe(200);
    const created = await owner.request.post(`${origin}/api/letters`, {
      headers,
      data: { title: `Chunk transport ${randomUUID()}` },
    });
    expect(created.status()).toBe(201);
    let letter = (await created.json()).data;
    id = letter.id;
    const saved = await owner.request.patch(`${origin}/api/letters/${id}`, {
      headers,
      data: {
        expectedVersion: letter.version,
        recipientDisplayName: 'Synthetic chunk reader',
        verification: { name: 'Synthetic chunk reader', dateOfBirth: '2000-01-01' },
        bodyDoc: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Synthetic streaming letter' }] },
          ],
        },
      },
    });
    expect(saved.status()).toBe(200);
    letter = (await saved.json()).data;
    const song = silentMp3(Math.floor((300 * 44100) / 1152));
    expect(song.length).toBeGreaterThan(4500000);
    const correctHash = createHash('sha256').update(song).digest('hex');
    for (const hash of ['0'.repeat(64), correctHash]) {
      const began = await owner.request.post(`${origin}/api/letters/${id}/music/ingests`, {
        headers,
        data: {
          expectedVersion: letter.version,
          byteSize: song.length,
          digest: hash,
          fileType: 'audio/mpeg',
          extension: 'mp3',
          rightsAcknowledged: true,
        },
      });
      expect(began.status()).toBe(201);
      const ingest = (await began.json()).data;
      const path = `${origin}/api/letters/${id}/music/ingests/${ingest.id}`;
      expect((await other.request.post(path, { headers, data: {} })).status()).toBe(404);
      expect((await other.request.delete(path, { headers })).status()).toBe(404);
      expect(
        (
          await recipient.request.put(`${path}/parts/0`, {
            headers: { ...headers, 'content-type': 'application/octet-stream' },
            data: song.subarray(0, 1048576),
          })
        ).status(),
      ).toBe(401);
      expect(
        (
          await other.request.put(`${path}/parts/0`, {
            headers: { ...headers, 'content-type': 'application/octet-stream' },
            data: song.subarray(0, 1048576),
          })
        ).status(),
      ).toBe(404);
      expect(
        (
          await owner.request.put(`${path}/parts/0`, {
            headers: { ...headers, 'content-type': 'application/octet-stream' },
            data: Buffer.alloc(1048577),
          })
        ).status(),
      ).toBe(413);
      const pending = (await (await owner.request.get(`${origin}/api/letters/${id}`)).json()).data;
      expect(pending.audioAsset).toBeNull();
      expect(pending.audioUpload.id).toBe(ingest.id);
      expect(
        (
          await owner.request.post(`${origin}/api/letters/${id}/publish`, {
            headers,
            data: { expectedVersion: pending.version },
          })
        ).status(),
      ).toBe(409);
      expect((await owner.request.post(path, { headers, data: {} })).status()).toBe(409);
      for (let index = 0; index < ingest.partCount; index++) {
        const part = song.subarray(index * 1048576, (index + 1) * 1048576);
        const options = {
          headers: { ...headers, 'content-type': 'application/octet-stream' },
          data: part,
        };
        expect((await owner.request.put(`${path}/parts/${index}`, options)).status()).toBe(200);
        if (index === 0) {
          expect((await owner.request.put(`${path}/parts/${index}`, options)).status()).toBe(200);
          const different = Buffer.from(part);
          different[0] ^= 1;
          expect(
            (
              await owner.request.put(`${path}/parts/${index}`, { ...options, data: different })
            ).status(),
          ).toBe(422);
        }
      }
      const committed = await owner.request.post(path, { headers, data: {} });
      if (hash !== correctHash) {
        expect(committed.status()).toBe(422);
        expect(
          (
            await owner.request.get(`${origin}/api/letters/${id}/audio/${ingest.assetId}/media`)
          ).status(),
        ).toBe(404);
        const cancel = await owner.request.delete(path, { headers });
        expect(cancel.status()).toBe(200);
        letter = (await cancel.json()).data;
      } else {
        expect(committed.status()).toBe(201);
        letter = (await committed.json()).data;
        expect(letter.audioUpload).toBeNull();
      }
    }
    const audio = `${origin}/api/letters/${id}/audio/${letter.audioAsset.id}/media`;
    const full = await owner.request.get(audio);
    expect(full.status()).toBe(200);
    expect(full.headers()['content-length']).toBeUndefined();
    expect(full.headers()['cache-control']).toContain('no-store');
    expect(
      createHash('sha256')
        .update(await full.body())
        .digest('hex'),
    ).toBe(correctHash);
    const range = await owner.request.get(audio, { headers: { range: 'bytes=-25' } });
    expect(range.status()).toBe(206);
    expect(await range.body()).toEqual(song.subarray(-25));
    expect((await other.request.get(audio, { headers: { range: 'bytes=0-10' } })).status()).toBe(
      404,
    );
    const settings = await owner.request.patch(`${origin}/api/letters/${id}/music`, {
      headers,
      data: { expectedVersion: letter.version, music: { ...letter.music, enabled: true } },
    });
    expect(settings.status()).toBe(200);
    letter = (await settings.json()).data;
    const publication = await owner.request.post(`${origin}/api/letters/${id}/publish`, {
      headers,
      data: { expectedVersion: letter.version },
    });
    expect(publication.status()).toBe(200);
    const token = (await publication.json()).data.shareUrl.split('/').pop();
    const base = `${origin}/api/recipient/${token}`,
      recipientAudio = `${base}/audio/${letter.audioAsset.id}/media`;
    expect(
      (await recipient.request.get(recipientAudio, { headers: { range: 'bytes=0-10' } })).status(),
    ).toBe(401);
    expect(
      (
        await recipient.request.post(`${base}/verify`, {
          headers,
          data: { name: 'Synthetic chunk reader', dateOfBirth: '2000-01-01' },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await recipient.request.get(recipientAudio, { headers: { range: 'bytes=0-10' } })).status(),
    ).toBe(206);
    letter = (await (await owner.request.get(`${origin}/api/letters/${id}`)).json()).data;
    expect(
      (
        await owner.request.post(`${origin}/api/letters/${id}/unpublish`, {
          headers,
          data: { expectedVersion: letter.version },
        })
      ).status(),
    ).toBe(200);
    expect(
      (await recipient.request.get(recipientAudio, { headers: { range: 'bytes=0-10' } })).status(),
    ).toBe(404);
  } finally {
    if (id) {
      const current = await owner.request.get(`${origin}/api/letters/${id}`);
      if (current.ok())
        await owner.request.delete(`${origin}/api/letters/${id}`, {
          headers,
          data: { expectedVersion: (await current.json()).data.version },
        });
    }
    // Do not invoke global cron or remove historical fixture data.
    await owner.close();
    await other.close();
    await recipient.close();
  }
});
