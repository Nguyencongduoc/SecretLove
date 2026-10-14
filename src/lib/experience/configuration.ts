import { z } from 'zod';
import { heartCustomizationSchema } from '@/lib/validation/heart';

const id = z.string().regex(/^[a-z][a-z0-9-]{0,47}$/);
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((value) => value.toLowerCase());
const unit = z.number().finite().min(0).max(1);
const pacing = z.enum(['gentle', 'normal']);
export const sceneOptionSchemas = {
  envelope: z.strictObject({ presetId: id, pacing }),
  heart: z.strictObject({
    presetId: id,
    pacing,
    scale: z.number().finite().min(0.75).max(1.25),
    color: color.optional(),
  }),
  gallery: z.strictObject({ presetId: id, layout: z.enum(['grid', 'carousel']) }),
  letter: z.strictObject({ presetId: id, bodySpacing: z.enum(['standard', 'relaxed']) }),
  'final-message': z.strictObject({ presetId: id, alignment: z.enum(['center', 'start']) }),
};
const override = z.discriminatedUnion('kind', [
  z.strictObject({
    slotId: id,
    kind: z.literal('envelope'),
    options: sceneOptionSchemas.envelope.partial(),
  }),
  z.strictObject({
    slotId: id,
    kind: z.literal('heart'),
    options: sceneOptionSchemas.heart.partial(),
  }),
  z.strictObject({
    slotId: id,
    kind: z.literal('gallery'),
    options: sceneOptionSchemas.gallery.partial(),
  }),
  z.strictObject({
    slotId: id,
    kind: z.literal('letter'),
    options: sceneOptionSchemas.letter.partial(),
  }),
  z.strictObject({
    slotId: id,
    kind: z.literal('final-message'),
    options: sceneOptionSchemas['final-message'].partial(),
  }),
]);
export const letterConfigurationV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    heartCustomization: heartCustomizationSchema.nullable().optional(),
    theme: z
      .strictObject({
        colors: z
          .strictObject({
            primary: color.optional(),
            background: color.optional(),
            surface: color.optional(),
            text: color.optional(),
            mutedText: color.optional(),
          })
          .optional(),
        typography: z
          .strictObject({ headingFontId: id.optional(), bodyFontId: id.optional() })
          .optional(),
        layout: z
          .strictObject({
            presetId: id,
            contentWidth: z.enum(['comfortable', 'compact']).optional(),
          })
          .optional(),
        decorativeEffects: z.strictObject({ presetId: id, intensity: unit.optional() }).optional(),
        background: z
          .discriminatedUnion('kind', [
            z.strictObject({ kind: z.literal('solid'), color }),
            z.strictObject({
              kind: z.literal('gradient'),
              angle: z.number().finite().min(0).max(360),
              colors: z.tuple([color, color]),
            }),
            z.strictObject({
              kind: z.literal('image'),
              assetId: z.uuid(),
              fit: z.enum(['cover', 'contain']),
              scrimOpacity: unit,
            }),
          ])
          .optional(),
      })
      .optional(),
    music: z
      .strictObject({
        enabled: z.boolean(),
        assetId: z.uuid().nullable(),
        defaultVolume: unit.default(0.35),
        loop: z.boolean().default(false),
        startPolicy: z.literal('manual').default('manual'),
      })
      .refine((value) => !value.enabled || value.assetId !== null)
      .optional(),
    sceneOverrides: z.array(override).max(8).optional(),
  })
  .superRefine((value, context) => {
    const slots = value.sceneOverrides?.map((scene) => scene.slotId) ?? [];
    if (new Set(slots).size !== slots.length)
      context.addIssue({ code: 'custom', message: 'Duplicate scene slots.' });
    if (new TextEncoder().encode(JSON.stringify(value)).length > 16384)
      context.addIssue({ code: 'custom', message: 'Configuration exceeds 16 KiB.' });
  });
export type LetterConfigurationV1 = z.output<typeof letterConfigurationV1Schema>;
export type SceneKind = keyof typeof sceneOptionSchemas;
export type SceneOptions<K extends SceneKind> = z.output<(typeof sceneOptionSchemas)[K]>;
export type SceneSpec = {
  [K in SceneKind]: { slotId: string; kind: K; options: SceneOptions<K> };
}[SceneKind];

// Definitions are trusted code, not remotely supplied modules or creator scripts.
const scenePlan: readonly SceneSpec[] = [
  {
    slotId: 'envelope',
    kind: 'envelope',
    options: { presetId: 'sealed-envelope', pacing: 'gentle' },
  },
  {
    slotId: 'heart',
    kind: 'heart',
    options: { presetId: 'pink-heart', pacing: 'gentle', scale: 1 },
  },
  { slotId: 'gallery', kind: 'gallery', options: { presetId: 'memory-grid', layout: 'grid' } },
  {
    slotId: 'letter',
    kind: 'letter',
    options: { presetId: 'letter-page', bodySpacing: 'relaxed' },
  },
  {
    slotId: 'final-message',
    kind: 'final-message',
    options: { presetId: 'closing', alignment: 'center' },
  },
];
export const templateRegistry = {
  rose: { id: 'rose', revision: 1, primary: '#dda7b4', surface: '#fff5e7' },
  minimal: { id: 'minimal', revision: 1, primary: '#ead3c3', surface: '#fffcf5' },
} as const;
export function resolveLegacyPresentation(templateId: 'rose' | 'minimal') {
  const template = templateRegistry[templateId];
  if (!template) throw new Error('Unsupported template.');
  return {
    template: { id: template.id, revision: template.revision },
    configuration: letterConfigurationV1Schema.parse({
      schemaVersion: 1,
      theme: {
        colors: {
          primary: template.primary,
          background: '#260c16',
          surface: template.surface,
          text: '#422431',
          mutedText: '#71565f',
        },
        typography: { headingFontId: 'classic-serif', bodyFontId: 'system-sans' },
        layout: { presetId: 'centered-letter', contentWidth: 'comfortable' },
        decorativeEffects: { presetId: 'petals', intensity: 0.25 },
        background: { kind: 'solid', color: '#260c16' },
      },
      music: {
        enabled: false,
        assetId: null,
        defaultVolume: 0.35,
        loop: false,
        startPolicy: 'manual',
      },
    }),
    scenes: scenePlan,
  };
}
