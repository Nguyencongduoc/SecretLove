import { describe, it, expect, vi } from 'vitest';
import { recipientRateSubject } from '@/lib/server/recipient';
import { randomBytes, createHmac } from 'node:crypto';
import {
  letterConfigurationV1Schema,
  resolveLegacyPresentation,
  sceneOptionSchemas,
} from '@/lib/experience/configuration';
import { availableScenes } from '@/lib/experience/types';
import { verifyRecipientSchema, shareTokenSchema } from '@/lib/validation/recipient';
import { normalizeName } from '@/lib/validation/letters';
import { comparePassphrase, gateDigest, hashPassphrase } from '@/lib/server/crypto';
import { DEFAULT_SCENE_TEXT } from '@/lib/validation/scene-text';

describe('recipient validation and trusted legacy configuration', () => {
  it('isolates explicit loopback test runs without trusting headers or changing deployment subjects', () => {
    try {
      vi.stubEnv('VERCEL', '');
      vi.stubEnv('SECRETLOVE_TEST_PROJECT', '');
      vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
      vi.stubEnv('SECRETLOVE_TEST_RATE_NAMESPACE', '11111111-1111-4111-8111-111111111111');
      const request = new Request('http://localhost:3000', {
        headers: { 'x-forwarded-for': '198.51.100.1', 'x-vercel-forwarded-for': '198.51.100.2' },
      });
      expect(recipientRateSubject(request)).toBe('shared-anonymous');
      vi.stubEnv('SECRETLOVE_TEST_PROJECT', 'isolated');
      expect(recipientRateSubject(request)).toBe(
        'isolated-local-run:11111111-1111-4111-8111-111111111111',
      );
      vi.stubEnv('APP_ORIGIN', 'https://example.invalid');
      expect(recipientRateSubject(request)).toBe('shared-anonymous');
      vi.stubEnv('VERCEL', '1');
      expect(recipientRateSubject(request)).toBe('198.51.100.2');
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('uses the creator normalization and date rules without weakening matching', () => {
    const key = randomBytes(32),
      stored = gateDigest('synthetic-letter', '  Ａda   Lovelace ', '2000-02-29', key);
    const matching = createHmac('sha256', key)
      .update(
        JSON.stringify([
          'synthetic-letter',
          stored.nonce,
          normalizeName('ada lovelace'),
          '2000-02-29',
        ]),
      )
      .digest('base64');
    expect(matching).toBe(stored.digest);
    expect(
      verifyRecipientSchema.safeParse({ name: 'Reader', dateOfBirth: '2001-02-29' }).success,
    ).toBe(false);
    expect(
      verifyRecipientSchema.safeParse({
        name: 'Reader',
        dateOfBirth: '2000-01-01',
        ownerId: 'injected',
      }).success,
    ).toBe(false);
    expect(shareTokenSchema.safeParse(randomBytes(32).toString('base64url')).success).toBe(true);
    expect(shareTokenSchema.safeParse('A'.repeat(42) + 'B').success).toBe(false);
  });
  it('defaults both templates to versioned silent settings and never modifies content', () => {
    for (const template of ['rose', 'minimal'] as const) {
      const resolved = resolveLegacyPresentation(template);
      expect(resolved.template).toEqual({ id: template, revision: 1 });
      expect(resolved.configuration.schemaVersion).toBe(1);
      expect(resolved.configuration.music).toMatchObject({
        enabled: false,
        assetId: null,
        startPolicy: 'manual',
      });
      expect(resolved.scenes.map((scene) => scene.kind)).toEqual([
        'envelope',
        'heart',
        'gallery',
        'letter',
        'final-message',
      ]);
    }
    expect(() => resolveLegacyPresentation('injected' as 'rose')).toThrow();
  });
  it('rejects executable/URL configuration, wrong-kind fields and invalid audio settings', () => {
    for (const config of [
      { schemaVersion: 1, script: 'alert(1)' },
      { schemaVersion: 2 },
      {
        schemaVersion: 1,
        theme: {
          background: {
            kind: 'image',
            assetId: 'https://invalid.example',
            fit: 'cover',
            scrimOpacity: 0.5,
          },
        },
      },
      { schemaVersion: 1, music: { enabled: true, assetId: null } },
      { schemaVersion: 1, music: { enabled: false, assetId: null, defaultVolume: Infinity } },
    ])
      expect(letterConfigurationV1Schema.safeParse(config).success).toBe(false);
    expect(
      sceneOptionSchemas.heart.safeParse({
        presetId: 'pink-heart',
        pacing: 'gentle',
        scale: 1,
        alignment: 'center',
      }).success,
    ).toBe(false);
    expect(
      letterConfigurationV1Schema.safeParse({
        schemaVersion: 1,
        sceneOverrides: [
          { slotId: 'heart', kind: 'heart', options: {} },
          { slotId: 'heart', kind: 'heart', options: {} },
        ],
      }).success,
    ).toBe(false);
  });
  it('skips empty galleries while keeping the main letter and closing reachable', () => {
    const content = {
      letterId: 'fixture',
      sceneText: DEFAULT_SCENE_TEXT,
      recipientDisplayName: 'Reader',
      expiresAt: '2030-01-01T00:00:00Z',
      templateId: 'rose' as const,
      bodyDoc: { type: 'doc' as const, content: [] },
      photos: [],
      presentation: resolveLegacyPresentation('rose'),
    };
    expect(availableScenes(content).map((scene) => scene.kind)).toEqual([
      'envelope',
      'heart',
      'letter',
      'final-message',
    ]);
  });
  it('compares protected passphrases exactly and rejects corrupt hash parameters', async () => {
    const record = await hashPassphrase('synthetic-private-phrase');
    expect(record).not.toBeNull();
    expect(await comparePassphrase('synthetic-private-phrase', record)).toBe(true);
    expect(await comparePassphrase('Synthetic-private-phrase', record)).toBe(false);
    expect(await comparePassphrase('', record)).toBe(false);
    await expect(comparePassphrase('candidate', { ...record, N: 2 })).rejects.toThrow(
      'Invalid passphrase record',
    );
  });
});
