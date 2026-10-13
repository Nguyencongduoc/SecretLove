import { endpoint, assertOrigin, jsonBody, success } from '@/lib/server/http';
import { changePhoto } from '@/lib/server/letters';
import { photoUpdateSchema, versionBodySchema } from '@/lib/validation/letters';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string; photoId: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { id, photoId } = await context.params;
    const body = photoUpdateSchema.parse(await jsonBody(request));
    return success(await changePhoto(id, photoId, body.expectedVersion, body.altText));
  });
}
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    const { id, photoId } = await context.params;
    const body = versionBodySchema.parse(await jsonBody(request));
    return success(await changePhoto(id, photoId, body.expectedVersion), 202);
  });
}
