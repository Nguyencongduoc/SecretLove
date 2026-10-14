import { describe, it, expect } from 'vitest';
import { inspectMp3, normalizeAudio } from '@/lib/server/mp3';
import { audioRange } from '@/lib/validation/audio-range';
import { resolvedMusic, musicSettingsSchema } from '@/lib/validation/music';
import { silentMp3 } from './fixtures/mp3';
import { AUDIO_HARD_MAX, AUDIO_MAX_SECONDS } from '@/lib/audio-limits';
import { readFile } from 'node:fs/promises';
describe('bounded private MP3 validation', () => {
  it('decodes actual MPEG Layer III silence and removes identifying tags', async () => {
    const mp3 = silentMp3();
    const id3 = Buffer.from([73, 68, 51, 4, 0, 0, 0, 0, 0, 6]);
    const tagged = Buffer.concat([
      id3,
      Buffer.from('secret'),
      mp3,
      Buffer.concat([Buffer.from('TAG'), Buffer.alloc(125)]),
    ]);
    const result = await normalizeAudio(tagged);
    expect(result.data.equals(mp3)).toBe(true);
    expect(result.duration).toBeGreaterThan(5);
  });
  it('rejects disguised, truncated, malformed and oversized audio', async () => {
    for (const value of [
      Buffer.from('not MP3'),
      silentMp3().subarray(0, -1),
      Buffer.from([73, 68, 51, 4, 0, 0, 128, 0, 0, 0]),
    ])
      await expect(normalizeAudio(value)).rejects.toMatchObject({ code: 'INVALID_AUDIO' });
    expect(() => inspectMp3(silentMp3(), 1024)).toThrow('Choose an MP3');
    expect(() =>
      inspectMp3(silentMp3(Math.ceil(((AUDIO_MAX_SECONDS + 1) * 44100) / 1152))),
    ).toThrow('valid MP3');
    expect(() => inspectMp3(Buffer.alloc(AUDIO_HARD_MAX + 1))).toThrow('Choose an MP3');
  });
  it('rejects Layer II, free bitrate, inconsistent sampling and trailing junk', () => {
    const a = silentMp3();
    a[1] = 0xfd;
    expect(() => inspectMp3(a)).toThrow();
    const b = silentMp3();
    b[2] = 0;
    expect(() => inspectMp3(b)).toThrow();
    expect(() => inspectMp3(Buffer.concat([silentMp3(), Buffer.from('junk')]))).toThrow();
  });
});
describe('full song limits', () => {
  it('decodes a five-minute MP3 above the old byte and duration caps', async () => {
    const mp3 = silentMp3(Math.floor((300 * 44100) / 1152));
    expect(mp3.length).toBeGreaterThan(3145728);
    const result = await normalizeAudio(mp3);
    expect(result.duration).toBeGreaterThan(299);
    expect(result.duration).toBeLessThanOrEqual(AUDIO_MAX_SECONDS);
    expect(result.data.equals(mp3)).toBe(true);
  });
  it.skipIf(!process.env.SECRETLOVE_AUDIO_TEST_FILE)(
    'validates an opt-in local creator MP3 without uploading or retaining it',
    async () => {
      const input = await readFile(process.env.SECRETLOVE_AUDIO_TEST_FILE!);
      const started = performance.now();
      const normalized = await normalizeAudio(input);
      expect(normalized.duration).toBeGreaterThan(0);
      expect(normalized.duration).toBeLessThanOrEqual(AUDIO_MAX_SECONDS);
      expect(normalized.data.length).toBeLessThanOrEqual(AUDIO_HARD_MAX);
      expect(inspectMp3(normalized.data).duration).toBe(normalized.duration);
      console.info(
        'Local MP3 validation: ' +
          JSON.stringify({
            inputBytes: input.length,
            sanitizedBytes: normalized.data.length,
            durationSeconds: Number(normalized.duration.toFixed(2)),
            processingMilliseconds: Math.round(performance.now() - started),
          }),
      );
    },
  );
});
describe('audio transport and legacy config', () => {
  it('supports full, bounded, open and suffix ranges without unsafe integers', () => {
    expect(audioRange(null, 100)).toBeNull();
    expect(audioRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
    expect(audioRange('bytes=95-', 100)).toEqual({ start: 95, end: 99 });
    expect(audioRange('bytes=-5', 100)).toEqual({ start: 95, end: 99 });
    expect(audioRange('bytes=5-200', 100)).toEqual({ start: 5, end: 99 });
    for (const value of [
      'bytes=0-1,4-5',
      'bytes=100-',
      'bytes=-0',
      'bytes=-',
      'bytes=10-9',
      'bytes=9007199254740992-',
      'bad',
      'bytes=1e2-',
    ])
      expect(audioRange(value, 100)).toBe(false);
  });
  it('old/unknown config is silent and unsafe music settings are rejected', () => {
    for (const config of [null, undefined, { schemaVersion: 2 }])
      expect(resolvedMusic(config).enabled).toBe(false);
    expect(
      musicSettingsSchema.safeParse({
        expectedVersion: '1',
        music: {
          enabled: true,
          assetId: null,
          defaultVolume: 1,
          loop: false,
          startPolicy: 'manual',
        },
      }).success,
    ).toBe(false);
    expect(
      musicSettingsSchema.safeParse({
        expectedVersion: '1',
        music: {
          enabled: false,
          assetId: null,
          defaultVolume: 2,
          loop: false,
          startPolicy: 'manual',
          url: 'https://invalid',
        },
      }).success,
    ).toBe(false);
  });
});
