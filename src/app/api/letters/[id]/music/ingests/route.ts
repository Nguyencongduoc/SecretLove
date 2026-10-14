import { assertOrigin, endpoint, jsonBody, success } from '@/lib/server/http';
import { beginAudioIngest } from '@/lib/server/audio-ingest';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    assertOrigin(request);
    return success(await beginAudioIngest((await params).id, await jsonBody(request, 4096)), 201);
  });
}
