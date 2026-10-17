import { z } from 'zod';
import { assertOrigin, endpoint, jsonBody, success } from '@/lib/server/http';
import { operatorDetail, operatorMutate, operatorRead } from '@/lib/server/operator';
import { AppError } from '@/lib/server/errors';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ segments: string[] }> };
export async function GET(request: Request, context: Context) {
  return endpoint(async () => {
    const s = (await context.params).segments;
    const url = new URL(request.url);
    z.strictObject({ cursor: z.uuid().optional() }).parse(Object.fromEntries(url.searchParams));
    if (s.length === 1 && (s[0] === 'reports' || s[0] === 'creators'))
      return success(await operatorRead(s[0], url.searchParams.get('cursor')));
    if (s.length === 2 && s[0] === 'reports') return success(await operatorDetail(s[1]));
    throw new AppError(404, 'NOT_FOUND', 'This endpoint is unavailable.');
  });
}
async function mutate(request: Request, context: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const s = (await context.params).segments;
    const kind =
      request.method === 'PUT' && s.length === 2 && s[0] === 'creators'
        ? 'access'
        : request.method === 'PATCH' && s.length === 2 && s[0] === 'reports'
          ? 'resolve'
          : request.method === 'POST' &&
              s.length === 3 &&
              s[0] === 'letters' &&
              s[2] === 'moderation'
            ? 'moderate'
            : request.method === 'POST' && s.length === 3 && s[0] === 'letters' && s[2] === 'delete'
              ? 'delete'
              : null;
    if (!kind) throw new AppError(404, 'NOT_FOUND', 'This endpoint is unavailable.');
    return success(
      await operatorMutate(kind, s[1], await jsonBody(request, 8192)),
      kind === 'delete' ? 202 : 200,
    );
  });
}
export const POST = mutate;
export const PUT = mutate;
export const PATCH = mutate;
