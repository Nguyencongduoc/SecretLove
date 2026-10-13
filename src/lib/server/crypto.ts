import 'server-only';
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { normalizeName } from '@/lib/validation/letters';

export function gateDigest(letterId: string, name: string, dateOfBirth: string, key: Buffer) {
  const nonce = randomBytes(16).toString('base64');
  return {
    nonce,
    digest: createHmac('sha256', key)
      .update(JSON.stringify([letterId, nonce, normalizeName(name), dateOfBirth]))
      .digest('base64'),
  };
}
let activeHashes = 0;
export async function hashPassphrase(value: string) {
  if (activeHashes >= 2) return null;
  activeHashes++;
  try {
    const salt = randomBytes(16).toString('base64');
    const hash = await new Promise<Buffer>((resolve, reject) =>
      scryptCallback(
        value,
        Buffer.from(salt, 'base64'),
        32,
        { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 },
        (error, result) => (error ? reject(error) : resolve(result)),
      ),
    );
    return {
      algorithm: 'scrypt',
      version: 1,
      N: 131072,
      r: 8,
      p: 1,
      salt,
      hash: hash.toString('base64'),
    };
  } finally {
    activeHashes--;
  }
}
export function recoveryProof(
  userId: string,
  accessToken: string,
  key: Buffer,
  expires = Date.now() + 600000,
) {
  const data = `${userId}.${expires}.${createHmac('sha256', key).update(`recovery-token:${accessToken}`).digest('base64url')}`;
  return `${data}.${createHmac('sha256', key).update(`recovery-proof:${data}`).digest('base64url')}`;
}
export function validRecoveryProof(
  proof: string,
  userId: string,
  accessToken: string,
  key: Buffer,
) {
  const parts = proof.split('.');
  if (
    parts.length !== 4 ||
    parts[0] !== userId ||
    !/^\d{13}$/.test(parts[1]) ||
    Number(parts[1]) <= Date.now() ||
    Number(parts[1]) > Date.now() + 600000
  )
    return false;
  const expected = recoveryProof(userId, accessToken, key, Number(parts[1]));
  const left = Buffer.from(proof);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
