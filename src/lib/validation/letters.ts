import { z } from 'zod';
import { parseRichText } from './rich-text';
import type { RichTextDoc } from '@/lib/types';

export const idSchema = z.uuid();
export const versionSchema = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine((value) => BigInt(value) <= 9223372036854775807n, 'Invalid version.');
const nameSchema = z.string().trim().min(1).max(100);
export const normalizeName = (name: string) =>
  name.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
export function validDate(date: string, today = new Date().toISOString().slice(0, 10)): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1900-01-01' || date > today) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}
const documentSchema = z.custom<RichTextDoc>((value) => {
  try {
    parseRichText(value);
    return true;
  } catch {
    return false;
  }
}, 'Use paragraphs, lists, bold or italic; maximum 10,000 characters.');
const passphrase = z
  .string()
  .refine(
    (value) =>
      [...value].length >= 12 &&
      [...value].length <= 128 &&
      new TextEncoder().encode(value).length <= 512,
    'Use 12–128 characters (maximum 512 UTF-8 bytes).',
  );
export const createLetterSchema = z.strictObject({ title: z.string().trim().min(1).max(120) });
export const versionBodySchema = z.strictObject({ expectedVersion: versionSchema });
export const saveLetterSchema = z
  .strictObject({
    expectedVersion: versionSchema,
    title: z.string().trim().min(1).max(120).optional(),
    recipientDisplayName: nameSchema.nullable().optional(),
    bodyDoc: documentSchema.optional(),
    templateId: z.enum(['rose', 'minimal']).optional(),
    verification: z
      .strictObject({
        name: nameSchema.refine(
          (value) =>
            [...normalizeName(value)].length > 0 && [...normalizeName(value)].length <= 100,
          'Invalid normalized name.',
        ),
        dateOfBirth: z.string().refine((value) => validDate(value), 'Enter a valid date of birth.'),
      })
      .optional(),
    passphrase: z
      .discriminatedUnion('action', [
        z.strictObject({ action: z.literal('set'), value: passphrase }),
        z.strictObject({ action: z.literal('remove') }),
      ])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 1, 'No changes supplied.');
export const altSchema = z.string().trim().min(1).max(200);
export const photoUpdateSchema = z.strictObject({
  expectedVersion: versionSchema,
  altText: altSchema,
});
