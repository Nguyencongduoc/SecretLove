import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { recoveryProof } from '@/lib/server/crypto';
const boundary = vi.hoisted(() => ({ proof: '', rpc: vi.fn(), remove: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (boundary.proof ? { value: boundary.proof } : undefined),
    delete: boundary.remove,
  }),
}));
vi.mock('@/lib/supabase/service', () => ({ serviceClient: () => ({ rpc: boundary.rpc }) }));
import { consumeRecovery } from '@/lib/server/recovery';

beforeEach(() => {
  vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
  vi.stubEnv('VERIFICATION_HMAC_KEY', Buffer.alloc(32, 7).toString('base64'));
  boundary.proof = '';
  boundary.rpc.mockReset();
  boundary.remove.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
it('rejects missing, expired, tampered and wrong-session proofs before privileged consumption', async () => {
  const key = Buffer.alloc(32, 7);
  for (const proof of [
    '',
    recoveryProof('user', 'token', key, Date.now() - 1),
    recoveryProof('other', 'token', key),
    recoveryProof('user', 'other-token', key),
    `${recoveryProof('user', 'token', key)}x`,
  ]) {
    boundary.proof = proof;
    await expect(consumeRecovery('user', 'token')).rejects.toMatchObject({ status: 401 });
  }
  expect(boundary.rpc).not.toHaveBeenCalled();
});
it('consumes only a digest and clears the proof after durable acceptance', async () => {
  boundary.proof = recoveryProof('user', 'token', Buffer.alloc(32, 7));
  boundary.rpc.mockResolvedValue({ data: true, error: null });
  await consumeRecovery('user', 'token');
  const [name, args] = boundary.rpc.mock.calls[0];
  expect(name).toBe('sl_recovery_consume');
  expect(args.a).toBe('user');
  expect(Buffer.from(args.proof_digest, 'base64')).toHaveLength(32);
  expect(JSON.stringify(args)).not.toContain(boundary.proof);
  expect(boundary.remove).toHaveBeenCalledOnce();
});
it('denies a consumed proof and fails closed on missing migration/database outage', async () => {
  boundary.proof = recoveryProof('user', 'token', Buffer.alloc(32, 7));
  boundary.rpc.mockResolvedValue({ data: false, error: null });
  await expect(consumeRecovery('user', 'token')).rejects.toMatchObject({ status: 401 });
  boundary.rpc.mockResolvedValue({ data: null, error: { message: 'secret-provider-details' } });
  await expect(consumeRecovery('user', 'token')).rejects.toMatchObject({
    status: 503,
    code: 'RECOVERY_UNAVAILABLE',
  });
  expect(boundary.remove).not.toHaveBeenCalled();
});
