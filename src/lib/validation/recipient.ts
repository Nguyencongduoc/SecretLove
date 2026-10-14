import { z } from 'zod';
import { normalizeName, validDate } from './letters';
export const shareTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/)
  .refine((value) => {
    // Canonical base64url's final character can encode only the remaining four bits.
    return 'AEIMQUYcgkosw048'.includes(value.at(-1) ?? '');
  });
export const verifyRecipientSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(
      (value) => [...normalizeName(value)].length >= 1 && [...normalizeName(value)].length <= 100,
    ),
  dateOfBirth: z.string().refine((value) => validDate(value)),
  passphrase: z
    .string()
    .refine((value) => [...value].length <= 128 && new TextEncoder().encode(value).length <= 512)
    .optional(),
});
