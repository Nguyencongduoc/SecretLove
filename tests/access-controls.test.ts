import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const b = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  getClaims: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
  verifyOtp: vi.fn(),
  recovery: vi.fn(),
  admin: vi.fn(),
  getSession: vi.fn(),
  consume: vi.fn(),
  login: vi.fn(),
  recover: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  ownerClient: async () => ({
    auth: {
      getUser: b.getUser,
      getClaims: b.getClaims,
      signUp: b.signUp,
      updateUser: b.updateUser,
      verifyOtp: b.verifyOtp,
      getSession: b.getSession,
      signInWithPassword: b.login,
      resetPasswordForEmail: b.recover,
    },
  }),
}));
vi.mock('@/lib/supabase/service', () => ({
  serviceClient: () => ({ auth: { admin: { getUserById: b.admin } }, rpc: b.rpc }),
}));
vi.mock('@/lib/server/recovery', () => ({
  issueRecovery: b.recovery,
  clearRecovery: vi.fn(),
  consumeRecovery: b.consume,
}));
import { requireAuthenticatedUser, requireCreator, requireOperator } from '@/lib/server/identity';
import { POST } from '@/app/api/auth/[action]/route';
import { GET as callback } from '@/app/auth/callback/route';
import { POST as reportRoute } from '@/app/api/reports/route';
import { operatorMutate } from '@/lib/server/operator';
import { reportSchema } from '@/lib/validation/reports';
import { revision } from '@/lib/validation/access';
const id = '11111111-1111-4111-8111-111111111111';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
  vi.stubEnv('RATE_LIMIT_HMAC_KEY', Buffer.alloc(32, 4).toString('base64'));
  b.getUser.mockResolvedValue({
    data: { user: { id, email_confirmed_at: 'now', user_metadata: { approved: true } } },
    error: null,
  });
  b.getClaims.mockResolvedValue({ data: { claims: { sub: id, aal: 'aal2' } }, error: null });
  b.rpc.mockImplementation(async (name: string) => ({
    data: name === 'sl_creator_status' ? { status: 'approved', version: '1' } : true,
    error: null,
  }));
});
afterEach(() => vi.unstubAllEnvs());
it('reset uses confirmed identity even without Creator approval and stops before Auth mutation on invalid proof', async () => {
  b.rpc.mockResolvedValue({ data: { status: 'suspended', version: '2' }, error: null });
  b.getSession.mockResolvedValue({ data: { session: { access_token: 'inert-recovery-session' } } });
  b.updateUser.mockResolvedValue({ error: null });
  b.consume.mockResolvedValue(undefined);
  const request = () =>
    new Request('http://localhost:3000/api/auth/reset', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'inert-password-for-unit-test' }),
    });
  expect((await POST(request(), { params: Promise.resolve({ action: 'reset' }) })).status).toBe(
    200,
  );
  expect(b.rpc).not.toHaveBeenCalled();
  expect(b.consume).toHaveBeenCalledWith(id, 'inert-recovery-session');
  b.updateUser.mockClear();
  b.consume.mockRejectedValue(new Error('inert invalid proof'));
  expect((await POST(request(), { params: Promise.resolve({ action: 'reset' }) })).status).toBe(
    503,
  );
  expect(b.updateUser).not.toHaveBeenCalled();
});
it('auth throttles login and recovery before calling provider; provider-outage identity fails closed', async () => {
  b.rpc.mockResolvedValue({ data: false, error: null });
  for (const action of ['login', 'recover']) {
    const r = await POST(
      new Request(`http://localhost:3000/api/auth/${action}`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
        body: JSON.stringify(
          action === 'login'
            ? { email: 'unit@example.invalid', password: 'inert-password' }
            : { email: 'unit@example.invalid' },
        ),
      }),
      { params: Promise.resolve({ action }) },
    );
    expect(r.status).toBe(429);
  }
  expect(b.login).not.toHaveBeenCalled();
  expect(b.recover).not.toHaveBeenCalled();
  b.getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
  await expect(requireAuthenticatedUser()).rejects.toMatchObject({ status: 503 });
});
it('checks fresh membership, ignores self metadata, and preserves authenticated recovery identity', async () => {
  b.rpc.mockResolvedValue({ data: { status: 'not_approved', version: '0' }, error: null });
  await expect(requireCreator()).rejects.toMatchObject({
    code: 'CREATOR_NOT_APPROVED',
    status: 403,
  });
  expect((await requireAuthenticatedUser()).user.id).toBe(id);
  b.rpc.mockResolvedValue({
    data: null,
    error: { message: 'missing migration / provider private detail' },
  });
  await expect(requireCreator()).rejects.toMatchObject({
    status: 503,
    code: 'TEMPORARILY_UNAVAILABLE',
  });
});
it('operator requires registry, verified matching claims and AAL2; AAL1 only opens MFA setup', async () => {
  b.getClaims.mockResolvedValue({ data: { claims: { sub: id, aal: 'aal1' } }, error: null });
  await expect(requireOperator()).rejects.toMatchObject({ code: 'MFA_REQUIRED' });
  expect((await requireOperator(false)).user.id).toBe(id);
  b.getClaims.mockResolvedValue({ data: { claims: { sub: 'foreign', aal: 'aal2' } }, error: null });
  await expect(requireOperator()).rejects.toMatchObject({ status: 401 });
  b.rpc.mockResolvedValue({ data: false, error: null });
  await expect(requireOperator(false)).rejects.toMatchObject({ code: 'OPERATOR_REQUIRED' });
});
it('closed signup never calls provider and Origin denial precedes all Auth calls', async () => {
  for (const [origin, status] of [
    ['http://localhost:3000', 403],
    ['https://foreign.invalid', 403],
  ] as const) {
    const r = await POST(
      new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: '{}',
      }),
      { params: Promise.resolve({ action: 'signup' }) },
    );
    expect(r.status).toBe(status);
  }
  expect(b.signUp).not.toHaveBeenCalled();
});
it('invite callback verifies invite OTP but never issues a recovery proof', async () => {
  b.verifyOtp.mockResolvedValue({
    data: { user: { id }, session: { access_token: 'inert-session' } },
    error: null,
  });
  const r = await callback(
    new Request('http://localhost:3000/auth/callback?type=invite&token_hash=inert'),
  );
  expect(b.verifyOtp).toHaveBeenCalledWith({ type: 'invite', token_hash: 'inert' });
  expect(b.recovery).not.toHaveBeenCalled();
  expect(r.headers.get('location')).toContain('/access-pending?notice=invited');
});
it('reports consume committed domain-separated counters before lookup and return real generic receipt', async () => {
  const token = 'A'.repeat(43);
  b.rpc.mockImplementation(async (name: string) => ({
    data: name === 'sl_report_submit' ? { received: true, reference: id } : true,
    error: null,
  }));
  const request = () =>
    new Request('http://localhost:3000/api/reports', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({
        shareToken: token,
        reason: 'privacy',
        description: '<script>plain text</script>',
      }),
    });
  const r = await reportRoute(request());
  expect(r.status).toBe(202);
  expect((await r.json()).data.reference).toBe(id);
  expect(b.rpc.mock.calls.map((c) => c[0])).toEqual([
    'sl_rate_limit',
    'sl_rate_limit',
    'sl_rate_limit',
    'sl_rate_limit',
    'sl_report_submit',
  ]);
  for (const [, args] of b.rpc.mock.calls.slice(0, 4))
    expect(JSON.stringify(args)).not.toContain(token);
  b.rpc.mockClear();
  b.rpc.mockResolvedValue({ data: false, error: null });
  expect((await reportRoute(request())).status).toBe(429);
  expect(b.rpc).toHaveBeenCalledOnce();
});
it('report body/type/origin limits fail without target lookup; schema rejects Unicode overflow and unknown fields', async () => {
  for (const [headers, body, status] of [
    [{ origin: 'http://localhost:3000', 'content-type': 'text/plain' }, '{}', 415],
    [{ origin: 'https://evil.invalid', 'content-type': 'application/json' }, '{}', 403],
    [
      { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      ' '.repeat(8193),
      413,
    ],
  ] as const) {
    expect(
      (
        await reportRoute(
          new Request('http://localhost:3000/api/reports', { method: 'POST', headers, body }),
        )
      ).status,
    ).toBe(status);
  }
  expect(b.rpc).not.toHaveBeenCalled();
  expect(
    reportSchema.safeParse({
      shareToken: 'A'.repeat(43),
      reason: 'privacy',
      description: '💗'.repeat(1001),
    }).success,
  ).toBe(false);
  expect(
    reportSchema.safeParse({ shareToken: 'A'.repeat(43), reason: 'privacy', aal: 'aal2' }).success,
  ).toBe(false);
  for (const bad of ['-1', '01', '1e3', '9223372036854775808'])
    expect(revision.safeParse(bad).success).toBe(false);
  expect(revision.parse('0')).toBe('0');
});
it('approval checks confirmed target with Admin SDK and never trusts body identity or sends email', async () => {
  b.admin.mockResolvedValue({
    data: { user: null },
    error: { status: 503, message: 'inert provider detail' },
  });
  await expect(
    operatorMutate('access', id, {
      expectedVersion: '0',
      action: 'approve',
      reasonCode: 'review_complete',
    }),
  ).rejects.toMatchObject({ status: 503 });
  b.admin.mockResolvedValue({ data: { user: { id, email_confirmed_at: null } }, error: null });
  await expect(
    operatorMutate('access', id, {
      expectedVersion: '0',
      action: 'approve',
      reasonCode: 'review_complete',
    }),
  ).rejects.toMatchObject({ code: 'CONFIRMED_USER_REQUIRED' });
  expect(b.rpc.mock.calls.some((c) => c[0] === 'sl_creator_access_set')).toBe(false);
  b.admin.mockResolvedValue({ data: { user: { id, email_confirmed_at: 'now' } }, error: null });
  await operatorMutate('access', id, {
    expectedVersion: '0',
    action: 'approve',
    reasonCode: 'review_complete',
  });
  expect(b.rpc.mock.calls.at(-1)?.[0]).toBe('sl_creator_access_set');
  await expect(
    operatorMutate('access', id, {
      expectedVersion: '0',
      action: 'approve',
      reasonCode: 'review_complete',
      a: 'foreign',
    }),
  ).rejects.toThrow();
});
