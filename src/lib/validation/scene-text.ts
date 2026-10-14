import { z } from 'zod';

const text = (maximum: number) => z.string().trim().min(1).max(maximum);
export const sceneTextSchema = z
  .strictObject({
    heart: z.strictObject({
      eyebrow: text(80),
      title: text(160),
      prompt: text(240),
      message: text(500),
    }),
    closing: z.strictObject({ eyebrow: text(80), title: text(160), message: text(500) }),
  })
  .refine(
    (value) => new TextEncoder().encode(JSON.stringify(value)).length <= 8192,
    'Scene text exceeds 8 KiB.',
  );
export type SceneText = z.output<typeof sceneTextSchema>;
export const DEFAULT_SCENE_TEXT: SceneText = {
  heart: {
    eyebrow: 'A feeling, made visible',
    title: 'Every beat holds a thought of you',
    prompt: 'Touch the heart. There is something waiting for you.',
    message: 'Some feelings are best told in a letter. Yours is just ahead.',
  },
  closing: {
    eyebrow: 'Until the next little moment',
    title: 'Carry this feeling with you',
    message: 'A letter ends. The words can stay.\nReturn to any moment, or begin again.',
  },
};
export function resolveSceneText(value: unknown): SceneText {
  return value == null ? DEFAULT_SCENE_TEXT : sceneTextSchema.parse(value);
}
