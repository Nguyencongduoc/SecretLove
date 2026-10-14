import { z } from 'zod';

export const HEART_PHRASE_LIMIT = 60;
export const HEART_RING_LIMIT = 5;
const phrase = z
  .string()
  .transform((value) => value.normalize('NFC').trim().replace(/\s+/gu, ' '))
  .refine(
    (value) => [...value].length >= 1 && [...value].length <= HEART_PHRASE_LIMIT,
    'Use 1–60 Unicode characters per phrase.',
  )
  .refine(
    (value) => !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value),
    'Unsupported control characters.',
  );
export const heartCustomizationSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    heart: z.strictObject({
      style: z.literal('procedural-particle'),
      color: z.enum(['pink', 'red', 'purple']),
    }),
    textRings: z.strictObject({
      enabled: z.boolean(),
      phrases: z.array(phrase).max(HEART_RING_LIMIT),
      rotationSpeed: z.enum(['slow', 'normal', 'fast']),
    }),
  })
  .refine(
    (value) => new TextEncoder().encode(JSON.stringify(value)).length <= 4096,
    'Heart configuration exceeds 4 KiB.',
  );
export type HeartCustomization = z.output<typeof heartCustomizationSchema>;
export const DEFAULT_HEART: HeartCustomization = {
  schemaVersion: 1,
  heart: { style: 'procedural-particle', color: 'pink' },
  textRings: { enabled: true, phrases: [], rotationSpeed: 'slow' },
};
export const DEFAULT_RING_PHRASES = [
  'You are special to me',
  'Cảm ơn vì đã xuất hiện',
  'With love, always',
];
export const HEART_COLORS = { pink: '#ff78a9', red: '#ff4769', purple: '#bf8bff' } as const;
export function resolveHeart(value: unknown): HeartCustomization {
  if (value == null) return DEFAULT_HEART;
  const parsed = heartCustomizationSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_HEART;
}
export function ringPhrases(value: HeartCustomization) {
  return value.textRings.enabled
    ? value.textRings.phrases.length
      ? value.textRings.phrases
      : DEFAULT_RING_PHRASES
    : [];
}
