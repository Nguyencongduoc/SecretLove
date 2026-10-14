import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEART,
  heartCustomizationSchema,
  resolveHeart,
  ringPhrases,
} from '@/lib/validation/heart';
import { heartField, heartbeat, sampleHeart } from '@/lib/experience/particle-heart';
import { saveLetterSchema } from '@/lib/validation/letters';
import { resolvedMusic } from '@/lib/validation/music';
describe('protected versioned particle-heart settings', () => {
  it('normalizes Vietnamese, counts Unicode points, and resolves bounded legacy defaults', () => {
    expect(resolveHeart(null)).toEqual(DEFAULT_HEART);
    expect(resolveHeart({ schemaVersion: 42 })).toEqual(DEFAULT_HEART);
    expect(ringPhrases(DEFAULT_HEART)).toHaveLength(3);
    const value = {
      ...DEFAULT_HEART,
      textRings: { ...DEFAULT_HEART.textRings, phrases: [' Cảm ơn   em 💗 '] },
    };
    expect(heartCustomizationSchema.parse(value).textRings.phrases).toEqual(['Cảm ơn em 💗']);
    expect(
      heartCustomizationSchema.parse({
        ...value,
        textRings: { ...value.textRings, phrases: ['💗'.repeat(60)] },
      }).textRings.phrases,
    ).toHaveLength(1);
    expect(
      ringPhrases({ ...DEFAULT_HEART, textRings: { ...DEFAULT_HEART.textRings, enabled: false } }),
    ).toEqual([]);
    expect(saveLetterSchema.parse({ expectedVersion: '1', title: 'Old Save' })).not.toHaveProperty(
      'heartCustomization',
    );
    const music = {
      enabled: false,
      assetId: null,
      defaultVolume: 0.6,
      loop: true,
      startPolicy: 'manual',
    };
    expect(resolvedMusic({ schemaVersion: 1, music, heartCustomization: value })).toEqual(music);
  });
  it('rejects excessive phrases, unknown keys, code options and illegal presets', () => {
    for (const value of [
      { ...DEFAULT_HEART, script: 'alert(1)' },
      { ...DEFAULT_HEART, schemaVersion: 2 },
      { ...DEFAULT_HEART, heart: { style: 'glb', color: 'pink', url: 'evil' } },
      { ...DEFAULT_HEART, textRings: { ...DEFAULT_HEART.textRings, phrases: Array(6).fill('x') } },
      { ...DEFAULT_HEART, textRings: { ...DEFAULT_HEART.textRings, phrases: ['x'.repeat(61)] } },
      { ...DEFAULT_HEART, textRings: { ...DEFAULT_HEART.textRings, phrases: [''] } },
      { ...DEFAULT_HEART, textRings: { ...DEFAULT_HEART.textRings, phrases: ['x\u202ex'] } },
    ])
      expect(heartCustomizationSchema.safeParse(value).success).toBe(false);
    const literal = '<script>alert(1)</script>';
    expect(
      heartCustomizationSchema.parse({
        ...DEFAULT_HEART,
        textRings: { ...DEFAULT_HEART.textRings, phrases: [literal] },
      }).textRings.phrases,
    ).toEqual([literal]);
  });
  it('samples a deterministic filled volume with depth and bounded heartbeat', () => {
    const { positions, phases } = sampleHeart(6000);
    expect(positions).toEqual(sampleHeart(6000).positions);
    expect(phases.length).toBe(6000);
    let interior = 0,
      minZ = Infinity,
      maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      const [x, y, z] = [
        positions[i] / 1.32,
        positions[i + 1] / 1.32 + 0.16,
        positions[i + 2] / 1.32,
      ];
      expect(heartField(x, y, z)).toBeLessThan(0.00001);
      if (heartField(x, y, z) < -0.04) interior++;
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    expect(interior).toBeGreaterThan(500);
    expect(maxZ - minZ).toBeGreaterThan(0.8);
    for (let t = 0; t < 20; t += 0.1) {
      expect(heartbeat(t)).toBeGreaterThanOrEqual(1);
      expect(heartbeat(t)).toBeLessThanOrEqual(1.035);
    }
  });
});
