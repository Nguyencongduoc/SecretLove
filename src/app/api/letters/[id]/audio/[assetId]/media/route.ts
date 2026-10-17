import { endpoint } from '@/lib/server/http';
import { ownerAudio } from '@/lib/server/music';
import { audioResponse } from '@/lib/server/audio-response';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  return endpoint(async () => {
    const { id, assetId } = await params;
    return audioResponse(request, await ownerAudio(id, assetId));
  });
}
export const HEAD = GET;
