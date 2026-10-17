import { assertOrigin, endpoint, jsonBody, success } from '@/lib/server/http';
import { cancelAudioIngest, commitAudioIngest } from '@/lib/server/audio-ingest';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ id: string; ingestId: string }> };
export async function POST(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    z.strictObject({}).parse(await jsonBody(request, 256));
    const { id, ingestId } = await params;
    return success(await commitAudioIngest(id, ingestId, request.signal), 201);
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { id, ingestId } = await params;
    return success(await cancelAudioIngest(id, ingestId));
  });
}
