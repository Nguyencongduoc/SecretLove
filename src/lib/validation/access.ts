import { z } from 'zod';
export const revision = z
  .string()
  .regex(/^(0|[1-9][0-9]{0,18})$/)
  .refine((v) => /^(0|[1-9][0-9]{0,18})$/.test(v) && BigInt(v) <= 9223372036854775807n);
export const reasonCode = z.enum(['abuse', 'privacy', 'review_complete', 'deletion_request']);
export const accessAction = z.strictObject({
  expectedVersion: revision,
  action: z.enum(['approve', 'suspend']),
  reasonCode,
});
export const moderationAction = z.strictObject({
  expectedModerationVersion: revision,
  action: z.enum(['hold', 'clear']),
  reasonCode,
  reportId: z.uuid().optional(),
});
export const resolutionAction = z.strictObject({
  expectedVersion: revision,
  resolution: z.enum(['dismissed', 'action_taken', 'unresolved_target']),
});
export const deletionAction = z.strictObject({
  expectedVersion: revision.refine((v) => v !== '0'),
  requestReference: z.string().regex(/^[A-Za-z0-9_-]{3,80}$/),
  reasonCode: z.enum(['abuse', 'privacy', 'deletion_request']),
});
