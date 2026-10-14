import 'server-only';
import { serviceClient } from '@/lib/supabase/service';
import { AppError } from './errors';
import type { AudioObject } from './music';
import { audioRange } from '@/lib/validation/audio-range';
import { AUDIO_HARD_MAX } from '@/lib/audio-limits';
let downloading = 0;
export async function audioResponse(request: Request, asset: AudioObject) {
  if (!Number.isSafeInteger(asset.size) || asset.size < 1 || asset.size > AUDIO_HARD_MAX)
    throw new AppError(503, 'AUDIO_UNAVAILABLE', 'Music could not load. You can keep reading.');
  const headers = new Headers({
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'private, no-store',
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
  headers.set('Content-Length', String(end - start + 1));
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${asset.size}`);
  if (request.method === 'HEAD') return new Response(null, { status: range ? 206 : 200, headers });
  if (request.signal.aborted)
    throw new AppError(499, 'CANCELLED', 'The audio request was cancelled.');
  // Bounded full object retrieval; no signed URL/redirect and no unbounded Range fan-out.
  if (downloading >= 4)
    throw new AppError(503, 'AUDIO_BUSY', 'Music is busy. You can keep reading or retry.');
  downloading++;
  try {
    const { data, error } = await serviceClient(request.signal)
      .storage.from('letter-assets')
      .download(asset.path);
    if (error || !data || data.size !== asset.size || data.size > AUDIO_HARD_MAX)
      throw new AppError(503, 'AUDIO_UNAVAILABLE', 'Music could not load. You can keep reading.');
    if (request.signal.aborted)
      throw new AppError(499, 'CANCELLED', 'The audio request was cancelled.');
    return new Response(new Uint8Array(await data.slice(start, end + 1).arrayBuffer()), {
      status: range ? 206 : 200,
      headers,
    });
  } finally {
    downloading--;
  }
}
