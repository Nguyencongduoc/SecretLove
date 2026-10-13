import 'server-only';
import { cookies } from 'next/headers';
import { appOrigin, secret } from './env';
import { recoveryProof, validRecoveryProof } from './crypto';
import { AppError } from './errors';

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
export async function requireRecovery(userId: string, accessToken: string) {
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
}
export async function clearRecovery() {
  (await cookies()).delete(settings().name);
}
