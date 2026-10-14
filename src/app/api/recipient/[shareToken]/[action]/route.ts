import { endpoint, success, assertOrigin, jsonBody } from '@/lib/server/http';
import {
  bootstrap,
  recipientContent,
  verifyRecipient,
  closeRecipient,
} from '@/lib/server/recipient';
import { AppError } from '@/lib/server/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ shareToken: string; action: string }> };
export async function GET(request: Request, context: Context) {
  return endpoint(async () => {
    const { shareToken, action } = await context.params;
    if (action === 'bootstrap') return success(await bootstrap(shareToken, request));
    if (action === 'content') return success(await recipientContent(shareToken, request));
    throw new AppError(404, 'NOT_FOUND', 'This resource is unavailable.');
  });
}
export async function POST(request: Request, context: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { shareToken, action } = await context.params;
    if (action !== 'verify') throw new AppError(404, 'NOT_FOUND', 'This resource is unavailable.');
    return success(await verifyRecipient(shareToken, await jsonBody(request, 4096), request));
  });
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { shareToken, action } = await context.params;
    if (action !== 'session') throw new AppError(404, 'NOT_FOUND', 'This resource is unavailable.');
    await closeRecipient(shareToken, request);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } });
  });
}
