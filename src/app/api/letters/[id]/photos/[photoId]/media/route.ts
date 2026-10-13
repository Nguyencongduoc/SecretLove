import { endpoint } from '@/lib/server/http';
import { photoPath } from '@/lib/server/letters';
import { serviceClient } from '@/lib/supabase/service';
import { AppError } from '@/lib/server/errors';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; photoId: string }> },
) {
  return endpoint(async () => {
    const { id, photoId } = await context.params;
    const path = await photoPath(id, photoId);
    if (request.headers.has('range'))
      throw new AppError(416, 'RANGE_NOT_SUPPORTED', 'Image ranges are not supported.');
    const { data, error } = await serviceClient().storage.from('letter-media').download(path);
    if (error || !data || data.size > 3145728)
      throw new AppError(503, 'TEMPORARILY_UNAVAILABLE', 'This image is temporarily unavailable.');
    return new Response(data, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  });
}
