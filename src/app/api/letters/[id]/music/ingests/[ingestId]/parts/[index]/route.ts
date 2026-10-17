import { assertOrigin, bytes, endpoint, success } from '@/lib/server/http';
import { ingestActor, ingestPartLimit, storeAudioPart } from '@/lib/server/audio-ingest';
import { AUDIO_PART_BYTES } from '@/lib/validation/audio-ingest';
import { AppError } from '@/lib/server/errors';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; ingestId: string; index: string }> },
) {
  return endpoint(async () => {
    assertOrigin(request);
    const { id, ingestId, index } = await params;
    const actor = await ingestActor(id, ingestId);
    await ingestPartLimit(actor);
    if (request.headers.get('content-type') !== 'application/octet-stream')
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send a binary upload chunk.');
    return success(
      await storeAudioPart(
        actor,
        id,
        ingestId,
        index,
        await bytes(request, AUDIO_PART_BYTES),
        request.signal,
      ),
    );
  });
}
