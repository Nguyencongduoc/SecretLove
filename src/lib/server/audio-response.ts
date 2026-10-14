import 'server-only';
import { publicConfig, secret } from './env';
import { AppError } from './errors';
import type { AudioObject } from './music';
import { audioRange } from '@/lib/validation/audio-range';
import { AUDIO_HARD_MAX } from '@/lib/audio-limits';
let downloading = 0;
export const AUDIO_STREAM_TIMEOUT_MS = 45000;
export async function audioResponse(request: Request, asset: AudioObject) {
  if (
    !Number.isSafeInteger(asset.size) ||
    asset.size < 1 ||
    asset.size > AUDIO_HARD_MAX ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp3$/.test(
      asset.path,
    )
  )
    throw new AppError(503, 'AUDIO_UNAVAILABLE', 'Music could not load. You can keep reading.');
  const headers = new Headers({
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'private, no-store, no-transform',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Accept-Ranges': 'bytes',
  });
  const range = audioRange(request.headers.get('range'), asset.size);
  if (range === false) {
    headers.set('Content-Range', `bytes */${asset.size}`);
    return new Response(null, { status: 416, headers });
  }
  const start = range?.start ?? 0,
    end = range?.end ?? asset.size - 1;
  const expectedBytes = end - start + 1;
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${asset.size}`);
  if (request.method === 'HEAD') {
    headers.set('Content-Length', String(expectedBytes));
    return new Response(null, { status: range ? 206 : 200, headers });
  }
  if (request.signal.aborted)
    throw new AppError(499, 'CANCELLED', 'The audio request was cancelled.');
  // Authorization already ran in the route. Hold a slot for the entire stream lifetime.
  if (downloading >= 4)
    throw new AppError(503, 'AUDIO_BUSY', 'Music is busy. You can keep reading or retry.');
  downloading++;
  const abort = new AbortController();
  let done = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let output: ReadableStreamDefaultController<Uint8Array> | undefined;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(deadline);
    request.signal.removeEventListener('abort', interrupted);
    abort.signal.removeEventListener('abort', interrupted);
    downloading--;
  };
  const interrupted = () => {
    if (done) return;
    finish();
    abort.abort();
    void reader?.cancel().catch(() => {});
    output?.error(new Error('Private music transfer interrupted.'));
  };
  const deadline = setTimeout(interrupted, AUDIO_STREAM_TIMEOUT_MS);
  request.signal.addEventListener('abort', interrupted, { once: true });
  abort.signal.addEventListener('abort', interrupted, { once: true });
  try {
    const key = secret('SUPABASE_SERVICE_ROLE_KEY');
    const upstream = await fetch(
      new URL(`/storage/v1/object/authenticated/letter-assets/${asset.path}`, publicConfig().url),
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Accept-Encoding': 'identity',
          ...(range ? { Range: `bytes=${start}-${end}` } : {}),
        },
        cache: 'no-store',
        redirect: 'manual',
        signal: abort.signal,
      },
    );
    if (
      done ||
      request.signal.aborted ||
      !upstream.body ||
      upstream.status !== (range ? 206 : 200) ||
      upstream.headers.get('content-length') !== String(expectedBytes) ||
      upstream.headers.get('content-type')?.split(';')[0].trim() !== 'audio/mpeg' ||
      ![null, 'identity'].includes(upstream.headers.get('content-encoding')) ||
      (range && upstream.headers.get('content-range') !== `bytes ${start}-${end}/${asset.size}`)
    ) {
      void upstream.body?.cancel().catch(() => {});
      throw new AppError(503, 'AUDIO_UNAVAILABLE', 'Music could not load. You can keep reading.');
    }
    reader = upstream.body.getReader();
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>(
      {
        start(controller) {
          output = controller;
        },
        async pull(controller) {
          try {
            const next = await reader!.read();
            if (done) return;
            if (next.done) {
              if (sent !== expectedBytes) throw new Error();
              finish();
              reader!.releaseLock();
              controller.close();
            } else {
              if (sent + next.value.byteLength > expectedBytes) throw new Error();
              sent += next.value.byteLength;
              controller.enqueue(next.value);
            }
          } catch {
            if (done) return;
            finish();
            abort.abort();
            void reader?.cancel().catch(() => {});
            controller.error(new Error('Private music transfer interrupted.'));
          }
        },
        async cancel() {
          finish();
          abort.abort();
          await reader?.cancel().catch(() => {});
        },
      },
      { highWaterMark: 0 },
    );
    // No Content-Length on streamed GET: do not turn it into a buffered Function response.
    return new Response(stream, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error) {
    finish();
    abort.abort();
    if (error instanceof AppError) throw error;
    throw new AppError(503, 'AUDIO_UNAVAILABLE', 'Music could not load. You can keep reading.');
  }
}
