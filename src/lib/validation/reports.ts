import { z } from 'zod';
import { shareTokenSchema } from './recipient';
export const reportSchema = z.strictObject({
  shareToken: shareTokenSchema,
  reason: z.enum(['unwanted_contact', 'harassment', 'privacy', 'other']),
  description: z
    .string()
    .refine((v) => Array.from(v).length <= 1000 && new TextEncoder().encode(v).length <= 4000)
    .default(''),
});
