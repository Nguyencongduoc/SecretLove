import 'server-only';
import { cookies } from 'next/headers';
import { appOrigin, secret } from './env';
import { recoveryProof, validRecoveryProof } from './crypto';
import { AppError } from './errors';
import { createHash } from 'node:crypto';
import { serviceClient } from '@/lib/supabase/service';

function settings() {
  const secure = new URL(appOrigin()).protocol === 'https:';
  return { name: secure ? '__Host-sl-recovery' : 'sl-recovery-dev', secure };
}
export async function issueRecovery(userId: string, accessToken: string) {
  const { name, secure } = settings();
  (await cookies()).set(
    name,
    recoveryProof(userId, accessToken, Buffer.from(secret('VERIFICATION_HMAC_KEY'), 'base64')),
    { secure, httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 },
  );
}
export async function consumeRecovery(userId: string, accessToken: string) {
  const proof = (await cookies()).get(settings().name)?.value;
  if (
    !proof ||
    !validRecoveryProof(
      proof,
      userId,
      accessToken,
      Buffer.from(secret('VERIFICATION_HMAC_KEY'), 'base64'),
    )
  )
    throw new AppError(
      401,
      'RECOVERY_REQUIRED',
      'Open a fresh password recovery link to reset your password.',
    );
  const { data, error } = await serviceClient().rpc('sl_recovery_consume', {
    a: userId,
    proof_digest: createHash('sha256').update(proof).digest('base64'),
    expires_input: new Date(Number(proof.split('.')[1])).toISOString(),
  });
  if (error)
    throw new AppError(
      503,
      'RECOVERY_UNAVAILABLE',
      'Password recovery is unavailable. Try a fresh recovery link later.',
    );
  if (data !== true)
    throw new AppError(
      401,
      'RECOVERY_REQUIRED',
      'Open a fresh password recovery link to reset your password.',
    );
  // Consumption is durable before Auth mutation. A provider failure requires a fresh link.
  await clearRecovery();
}
export async function clearRecovery() {
  (await cookies()).delete(settings().name);
}
