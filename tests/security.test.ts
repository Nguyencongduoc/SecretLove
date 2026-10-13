import { describe, it, expect, vi, afterEach } from 'vitest';
import sharp from 'sharp';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseRichText } from '@/lib/validation/rich-text';
import {
  normalizeName,
  validDate,
  saveLetterSchema,
  versionSchema,
} from '@/lib/validation/letters';
import { gateDigest, hashPassphrase, recoveryProof, validRecoveryProof } from '@/lib/server/crypto';
import { normalizeImage } from '@/lib/server/media';
import { assertOrigin, bytes, endpoint, jsonBody } from '@/lib/server/http';
import { RichText } from '@/components/rich-text';
afterEach(() => vi.unstubAllEnvs());
describe('untrusted input and secret handling', () => {
  it('normalizes identity names and rejects impossible dates and unsafe versions', () => {
    expect(normalizeName('  ＡLICE\t Smith  ')).toBe('alice smith');
    expect(validDate('2000-02-29')).toBe(true);
    expect(validDate('2001-02-29')).toBe(false);
    expect(validDate('2099-01-01')).toBe(false);
    expect(versionSchema.parse('9007199254740993')).toBe('9007199254740993');
    expect(versionSchema.safeParse('9223372036854775808').success).toBe(false);
    expect(
      saveLetterSchema.safeParse({ expectedVersion: '1', title: 'Test', ownerId: 'spoof' }).success,
    ).toBe(false);
  });
  it('rejects script/link/image JSON and oversized messages, and escapes ordinary text', () => {
    const document = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '<script>alert(1)</script>', marks: [{ type: 'bold' }] }],
        },
      ],
    };
    expect(
      renderToStaticMarkup(createElement(RichText, { document: parseRichText(document) })),
    ).toContain('&lt;script&gt;');
    for (const child of [
      { type: 'image', attrs: { src: 'https://evil.invalid' } },
      {
        type: 'text',
        text: 'Link',
        marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
      },
      { type: 'text', text: 'x'.repeat(10001) },
    ])
      expect(() =>
        parseRichText({ type: 'doc', content: [{ type: 'paragraph', content: [child] }] }),
      ).toThrow();
  });
  it('uses unique keyed gate digests and binds recovery proof to user, token, and expiry', async () => {
    const key = Buffer.alloc(32, 9);
    const a = gateDigest('letter', 'Test', '2000-01-01', key),
      b = gateDigest('letter', 'Test', '2000-01-01', key);
    expect(a.digest).not.toBe(b.digest);
    expect(Buffer.from(a.nonce, 'base64')).toHaveLength(16);
    expect(Buffer.from(a.digest, 'base64')).toHaveLength(32);
    const proof = recoveryProof('user', 'token', key);
    expect(validRecoveryProof(proof, 'user', 'token', key)).toBe(true);
    expect(validRecoveryProof(proof, 'other', 'token', key)).toBe(false);
    expect(validRecoveryProof(proof, 'user', 'other', key)).toBe(false);
    expect(validRecoveryProof(proof + 'x', 'user', 'token', key)).toBe(false);
    expect(
      validRecoveryProof(recoveryProof('user', 'token', key, Date.now() - 1), 'user', 'token', key),
    ).toBe(false);
    const hash = await hashPassphrase('test-only-passphrase');
    expect(hash?.N).toBe(131072);
    expect(hash?.hash).not.toContain('test-only');
  });
  it('decodes and strips metadata from supported images and rejects invalid and excessive pixels', async () => {
    const input = await sharp({
      create: { width: 40, height: 30, channels: 3, background: '#ffcad4' },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    const output = await normalizeImage(input);
    const metadata = await sharp(output.data).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(output.width).toBe(40);
    await expect(normalizeImage(Buffer.from('<svg></svg>'))).rejects.toThrow();
    await expect(normalizeImage(Buffer.alloc(3145729))).rejects.toThrow();
    const large = await sharp({
      create: { width: 4097, height: 1, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    await expect(normalizeImage(large)).rejects.toThrow();
  });
  it('enforces origin and bounded JSON, with redacted provider failures', async () => {
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    expect(() => assertOrigin(new Request('http://localhost:3000/api/letters'))).toThrow();
    expect(() =>
      assertOrigin(
        new Request('http://localhost:3000/api/letters', {
          headers: { origin: 'https://evil.invalid' },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertOrigin(
        new Request('http://localhost:3000/api/letters', {
          headers: { origin: 'http://localhost:3000' },
        }),
      ),
    ).not.toThrow();
    await expect(
      bytes(new Request('http://localhost', { method: 'POST', body: '12345' }), 4),
    ).rejects.toThrow();
    await expect(
      jsonBody(new Request('http://localhost', { method: 'POST', body: '{}' })),
    ).rejects.toThrow();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await endpoint(async () => {
      throw new Error('secret-provider-detail');
    });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret-provider-detail');
    expect(log.mock.calls.flat().join('')).not.toContain('secret-provider-detail');
    log.mockRestore();
  });
});
