import { endpoint, assertOrigin, bytes, success } from '@/lib/server/http';
import { requireCreator } from '@/lib/server/identity';
import { uploadPhoto } from '@/lib/server/media';
import { AppError } from '@/lib/server/errors';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    assertOrigin(request);
    await requireCreator();
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.startsWith('multipart/form-data;'))
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use a multipart image upload.');
    const raw = await bytes(request, 3670016);
    let form: FormData;
    try {
      form = await new Request('http://internal.invalid', {
        method: 'POST',
        headers: { 'content-type': contentType },
        body: new Uint8Array(raw),
      }).formData();
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid upload form.');
    }
    return success(await uploadPhoto((await context.params).id, form), 201);
  });
}
