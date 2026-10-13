import { endpoint, assertOrigin, jsonBody, success } from '@/lib/server/http';
import { getLetter, saveLetter, deleteLetter } from '@/lib/server/letters';
import { versionBodySchema } from '@/lib/validation/letters';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) {
  return endpoint(async () => success(await getLetter((await context.params).id)));
}
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    return success(await saveLetter((await context.params).id, await jsonBody(request)));
  });
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { expectedVersion } = versionBodySchema.parse(await jsonBody(request));
    const result = await deleteLetter((await context.params).id, expectedVersion);
    return success(result, result.mediaCleanup === 'pending' ? 202 : 200);
  });
}
