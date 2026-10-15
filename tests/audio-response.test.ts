import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { audioResponse, AUDIO_STREAM_TIMEOUT_MS } from '@/lib/server/audio-response';
const path = `${randomUUID()}/${randomUUID()}/${randomUUID()}.mp3`;
const responses: Response[] = [];
const fetchMock = vi.fn();
// Inert test fixtures, never real Supabase credentials.
const modernKey = 'sb_secret_test_only_not_a_real_credential';
const legacyKey =
  'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.test-only-invalid-signature';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://storage.example.invalid');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', modernKey);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(async () => {
  for (const response of responses.splice(0)) await response.body?.cancel().catch(() => {});
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function run(request: Request, size = 10) {
  const response = await audioResponse(request, { path, size });
  responses.push(response);
  return response;
}
const request = (headers?: HeadersInit) => new Request('https://letter.invalid/audio', { headers });
function upstream(size: number, body?: ReadableStream<Uint8Array>, range?: string) {
  return new Response(
    body ??
      new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(size));
          c.close();
        },
      }),
    {
      status: range ? 206 : 200,
      headers: {
        'content-type': 'audio/mpeg',
        'content-length': String(size),
        ...(range ? { 'content-range': range } : {}),
      },
    },
  );
}
it('streams above 4.5 MB before later chunks exist, with backpressure and no public redirect/cache', async () => {
  const size = 16 * 1024 * 1024;
  let reads = 0;
  const input = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array(65536));
        if (reads === size / 65536) controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  fetchMock.mockResolvedValue(upstream(size, input));
  const response = await run(request(), size);
  expect(reads).toBe(0);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-length')).toBeNull();
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(response.headers.get('vercel-cdn-cache-control')).toBe('no-store');
  expect(response.headers.get('location')).toBeNull();
  const reader = response.body!.getReader();
  const first = await reader.read();
  expect(first.value!.byteLength).toBe(65536);
  expect(reads).toBe(1);
  let count = first.value!.byteLength;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    count += next.value.byteLength;
  }
  expect(count).toBe(size);
  reader.releaseLock();
  const [url, options] = fetchMock.mock.calls[0];
  expect(new URL(url).origin).toBe('https://storage.example.invalid');
  expect(options.redirect).toBe('manual');
  expect(options.cache).toBe('no-store');
  expect(options.headers.apikey).toBe(modernKey);
  expect(options.headers).not.toHaveProperty('Authorization');
});
it('forwards only the canonical bounded range and validates upstream selection', async () => {
  fetchMock.mockResolvedValue(upstream(4, undefined, 'bytes 6-9/10'));
  const response = await run(request({ range: 'bytes=-4', authorization: 'caller-spoof' }));
  expect(response.status).toBe(206);
  expect(response.headers.get('content-range')).toBe('bytes 6-9/10');
  expect((await response.arrayBuffer()).byteLength).toBe(4);
  expect(fetchMock.mock.calls[0][1].headers.Range).toBe('bytes=6-9');
  expect(fetchMock.mock.calls[0][1].headers.apikey).toBe(modernKey);
  expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  fetchMock.mockResolvedValue(upstream(4, undefined, 'bytes 0-3/10'));
  await expect(run(request({ range: 'bytes=6-9' }))).rejects.toMatchObject({ status: 503 });
});
it('does not fetch bytes for HEAD or invalid ranges; rejects malformed paths/size', async () => {
  const head = await run(new Request('https://letter.invalid/audio', { method: 'HEAD' }));
  expect(head.headers.get('content-length')).toBe('10');
  expect(await head.text()).toBe('');
  const invalid = await run(request({ range: 'bytes=0-1,3-4' }));
  expect(invalid.status).toBe(416);
  expect(fetchMock).not.toHaveBeenCalled();
  for (const bad of ['https://evil.invalid/file', '../file.mp3', `${path}?secret=value`])
    await expect(audioResponse(request(), { path: bad, size: 10 })).rejects.toMatchObject({
      status: 503,
    });
  await expect(run(request(), 16777217)).rejects.toMatchObject({ status: 503 });
});
it('denies redirects, errors, MIME/encoding/length mismatches without forwarding provider details', async () => {
  for (const response of [
    new Response('secret-provider-detail', { status: 403 }),
    new Response(null, { status: 302, headers: { location: 'https://evil.invalid' } }),
    new Response('12345', { headers: { 'content-type': 'text/html', 'content-length': '10' } }),
    new Response('12345', { headers: { 'content-type': 'audio/mpeg', 'content-length': '5' } }),
    new Response('1234567890', {
      headers: { 'content-type': 'audio/mpeg', 'content-length': '10', 'content-encoding': 'gzip' },
    }),
  ]) {
    fetchMock.mockResolvedValueOnce(response);
    await expect(run(request())).rejects.toMatchObject({ status: 503, code: 'AUDIO_UNAVAILABLE' });
  }
  fetchMock.mockRejectedValueOnce(new Error('secret-provider-detail'));
  await expect(run(request())).rejects.toThrow('Music could not load.');
});
it('errors on truncation/overrun after start and cancels upstream when the consumer cancels', async () => {
  for (const size of [9, 11]) {
    fetchMock.mockResolvedValueOnce(
      upstream(
        10,
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(size));
            c.close();
          },
        }),
      ),
    );
    const response = await run(request());
    await expect(response.arrayBuffer()).rejects.toThrow('Private music transfer interrupted.');
  }
  const cancel = vi.fn();
  fetchMock.mockResolvedValueOnce(upstream(10, new ReadableStream({ cancel })));
  const response = await run(request());
  await response.body!.cancel();
  expect(cancel).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls.at(-1)![1].signal.aborted).toBe(true);
});
it('holds concurrency slots through streaming and releases them after cancellation', async () => {
  fetchMock.mockImplementation(async () => upstream(10, new ReadableStream()));
  const open = await Promise.all(Array.from({ length: 4 }, () => run(request())));
  await expect(run(request())).rejects.toMatchObject({ status: 503, code: 'AUDIO_BUSY' });
  for (const response of open) await response.body!.cancel();
  const another = await run(request());
  await another.body!.cancel();
});
it('aborts slow bodies at the deadline and releases their slot', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation(async () => upstream(10, new ReadableStream()));
  const response = await run(request());
  const reader = response.body!.getReader();
  const pending = expect(reader.read()).rejects.toThrow('Private music transfer interrupted.');
  await vi.advanceTimersByTimeAsync(AUDIO_STREAM_TIMEOUT_MS + 1);
  await pending;
  reader.releaseLock();
  const another = await run(request());
  await another.body!.cancel();
});
it('cancels when the requester aborts and denies already aborted requests without Storage fetch', async () => {
  const abort = new AbortController();
  abort.abort();
  await expect(
    run(new Request('https://letter.invalid/audio', { signal: abort.signal })),
  ).rejects.toMatchObject({ status: 499 });
  expect(fetchMock).not.toHaveBeenCalled();
  const later = new AbortController();
  fetchMock.mockResolvedValueOnce(upstream(10, new ReadableStream()));
  const response = await run(new Request('https://letter.invalid/audio', { signal: later.signal }));
  later.abort();
  await expect(response.arrayBuffer()).rejects.toThrow('Private music transfer interrupted.');
});

it.each([
  { kind: 'modern', key: modernKey, bearer: null },
  { kind: 'legacy JWT', key: legacyKey, bearer: `Bearer ${legacyKey}` },
])(
  'uses supported $kind headers for private GET/Range without exposing credentials',
  async ({ key, bearer }) => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', key);
    for (const range of [undefined, 'bytes=2-5']) {
      fetchMock.mockResolvedValueOnce(
        upstream(range ? 4 : 10, undefined, range ? 'bytes 2-5/10' : undefined),
      );
      const response = await run(
        request({
          ...(range ? { range } : {}),
          authorization: 'Bearer caller-token-must-not-be-forwarded',
          apikey: 'caller-key-must-not-be-forwarded',
          cookie: 'caller-cookie-must-not-be-forwarded',
        }),
      );
      expect(response.status).toBe(range ? 206 : 200);
      const [url, options] = fetchMock.mock.calls.at(-1)!;
      expect(new URL(url).pathname).toBe(`/storage/v1/object/authenticated/letter-assets/${path}`);
      const sent = new Headers(options.headers);
      expect(sent.get('apikey')).toBe(key);
      expect(sent.get('authorization')).toBe(bearer);
      expect(sent.get('cookie')).toBeNull();
      expect(sent.get('range')).toBe(range ?? null);
      expect(sent.get('accept-encoding')).toBe('identity');
      const delivered = `${JSON.stringify([...response.headers])}${await response.text()}`;
      for (const privateValue of [
        key,
        path,
        'storage.example.invalid',
        'caller-token-must-not-be-forwarded',
      ])
        expect(delivered).not.toContain(privateValue);
      expect(response.headers.get('location')).toBeNull();
      expect(response.headers.get('content-length')).toBeNull();
    }
    fetchMock.mockClear();
    const head = await run(
      new Request('https://letter.invalid/audio', {
        method: 'HEAD',
        headers: { range: 'bytes=2-5' },
      }),
    );
    expect(head.status).toBe(206);
    expect(head.headers.get('content-length')).toBe('4');
    expect(head.body).toBeNull();
    const invalid = await run(request({ range: 'bytes=10-' }));
    expect(invalid.status).toBe(416);
    expect(invalid.headers.get('content-range')).toBe('bytes */10');
    expect(invalid.body).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  },
);
