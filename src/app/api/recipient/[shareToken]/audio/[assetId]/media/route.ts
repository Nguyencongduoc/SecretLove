import { endpoint } from '@/lib/server/http';
import { recipientAudio } from '@/lib/server/recipient';
import { audioResponse } from '@/lib/server/audio-response';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string; assetId: string }> },
) {
  return endpoint(async () => {
    const { shareToken, assetId } = await params;
    return audioResponse(request, await recipientAudio(shareToken, assetId, request));
  });
}
export const HEAD = GET;
