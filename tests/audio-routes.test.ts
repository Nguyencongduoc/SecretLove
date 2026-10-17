import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AppError } from '@/lib/server/errors';
const dal = vi.hoisted(() => ({ owner: vi.fn(), recipient: vi.fn() }));
vi.mock('@/lib/server/music', () => ({ ownerAudio: dal.owner }));
vi.mock('@/lib/server/recipient', () => ({ recipientAudio: dal.recipient }));
import {
  GET as ownerGet,
  HEAD as ownerHead,
} from '@/app/api/letters/[id]/audio/[assetId]/media/route';
import {
  GET as recipientGet,
  HEAD as recipientHead,
} from '@/app/api/recipient/[shareToken]/audio/[assetId]/media/route';
const asset = { path: `${randomUUID()}/${randomUUID()}/${randomUUID()}.mp3`, size: 10 };
const fetchMock = vi.fn();
const modern = 'sb_secret_test_only_not_a_real_credential';
const legacy = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.test-only-invalid-signature';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://storage.example.invalid');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', modern);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  dal.owner.mockReset();
  dal.recipient.mockReset();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function route(kind: 'owner' | 'recipient', method: 'GET' | 'HEAD', range?: string) {
  const request = new Request('https://letter.invalid/audio', {
    method,
    headers: range ? { range } : {},
  });
  return kind === 'owner'
    ? (method === 'HEAD' ? ownerHead : ownerGet)(request, {
        params: Promise.resolve({ id: randomUUID(), assetId: randomUUID() }),
      })
    : (method === 'HEAD' ? recipientHead : recipientGet)(request, {
        params: Promise.resolve({ shareToken: 'synthetic-share', assetId: randomUUID() }),
      });
}
for (const [format, key] of [
  ['modern', modern],
  ['legacy JWT', legacy],
] as const) {
  it.each([
    { kind: 'owner' as const, status: 401, label: 'anonymous creator' },
    { kind: 'owner' as const, status: 404, label: 'foreign creator' },
    { kind: 'recipient' as const, status: 401, label: 'locked/expired session' },
    { kind: 'recipient' as const, status: 404, label: 'revoked/foreign-letter asset' },
  ])(
    `denies $label before Storage/range metadata with ${format} credentials`,
    async ({ kind, status }) => {
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', key);
      (kind === 'owner' ? dal.owner : dal.recipient).mockRejectedValue(
        new AppError(status, 'ACCESS_DENIED', 'Access denied.'),
      );
      for (const method of ['GET', 'HEAD'] as const) {
        for (const range of [undefined, 'bytes=0-1,3-4']) {
          const response = await route(kind, method, range);
          expect(response.status).toBe(status);
          expect(response.headers.get('content-range')).toBeNull();
          const delivered = `${JSON.stringify([...response.headers])}${await response.text()}`;
          expect(delivered).not.toContain(key);
          expect(delivered).not.toContain(asset.path);
          expect(response.headers.get('cache-control')).toContain('no-store');
        }
      }
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
}
it('redacts upstream credentials/object paths in API errors and logs for both route boundaries', async () => {
  dal.owner.mockResolvedValue(asset);
  dal.recipient.mockResolvedValue(asset);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  for (const key of [modern, legacy]) {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', key);
    for (const kind of ['owner', 'recipient'] as const) {
      fetchMock.mockResolvedValueOnce(
        new Response(`Provider detail: ${key} ${asset.path}`, { status: 403 }),
      );
      const response = await route(kind, 'GET', 'bytes=0-3');
      expect(response.status).toBe(503);
      const delivered = `${JSON.stringify([...response.headers])}${await response.text()}${JSON.stringify(log.mock.calls)}`;
      expect(delivered).not.toContain(key);
      expect(delivered).not.toContain(asset.path);
      expect(delivered).not.toContain('Provider detail');
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('cache-control')).toContain('no-store');
    }
  }
});
