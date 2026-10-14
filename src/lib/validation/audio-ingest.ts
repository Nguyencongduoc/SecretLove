import { z } from 'zod';
import { versionSchema } from './letters';
import { AUDIO_HARD_MAX } from '@/lib/audio-limits';
export const AUDIO_PART_BYTES = 1048576;
export const ingestBeginSchema = z.strictObject({
  expectedVersion: versionSchema,
  byteSize: z.number().int().min(1).max(AUDIO_HARD_MAX),
  digest: z.string().regex(/^[0-9a-f]{64}$/),
  rightsAcknowledged: z.literal(true),
  fileType: z.enum(['audio/mpeg', 'audio/mp3']),
  extension: z.literal('mp3'),
});
export const partIndexSchema = z
  .string()
  .regex(/^(?:[0-9]|1[0-5])$/)
  .transform(Number);
