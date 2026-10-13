import { timingSafeEqual } from 'node:crypto';
import { cleanupMedia } from '@/lib/server/cleanup';
import { endpoint, success } from '@/lib/server/http';
import { secret } from '@/lib/server/env';
import { AppError } from '@/lib/server/errors';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  return endpoint(async () => {
    const actual = Buffer.from(request.headers.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${secret('CRON_SECRET')}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new AppError(401, 'UNAUTHORIZED', 'Cleanup authorization required.');
    const result = await cleanupMedia();
    return success(result, result.failed ? 503 : 200);
  });
}
