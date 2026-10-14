import { endpoint } from '@/lib/server/http';
import { recipientPhoto } from '@/lib/server/recipient';
import { AppError } from '@/lib/server/errors';
import { serviceClient } from '@/lib/supabase/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareToken: string; photoId: string }> },
) {
  return endpoint(async () => {
    const { shareToken, photoId } = await params;
    const path = await recipientPhoto(shareToken, photoId, request);
    if (request.headers.has('range'))
      throw new AppError(416, 'RANGE_UNSUPPORTED', 'Image ranges are unsupported.');
    const { data, error } = await serviceClient().storage.from('letter-media').download(path);
    if (error || !data || data.size > 3145728)
      throw new AppError(503, 'TEMPORARILY_UNAVAILABLE', 'This memory could not load.');
    return new Response(await data.arrayBuffer(), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  });
}
export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ shareToken: string; photoId: string }> },
) {
  return endpoint(async () => {
    const { shareToken, photoId } = await params;
    await recipientPhoto(shareToken, photoId, request);
    return new Response(null, {
      headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' },
    });
  });
}
