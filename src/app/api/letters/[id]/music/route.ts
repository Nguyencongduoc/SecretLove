import { endpoint, assertOrigin, bytes, jsonBody, success } from '@/lib/server/http';
import { requireCreator } from '@/lib/server/identity';
import { uploadMusic, updateMusic } from '@/lib/server/music';
import { audioLimit } from '@/lib/server/mp3';
import { AppError } from '@/lib/server/errors';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    await requireCreator();
    const type = request.headers.get('content-type') ?? '';
    if (!type.startsWith('multipart/form-data;'))
      throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Upload one MP3 file.');
    const raw = await bytes(request, audioLimit() + 65536);
    let form: FormData;
    try {
      form = await new Request('http://internal.invalid', {
        method: 'POST',
        headers: { 'content-type': type },
        body: new Uint8Array(raw),
      }).formData();
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid audio upload.');
    }
    return success(await uploadMusic((await params).id, form), 201);
  });
}
export async function PATCH(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    return success(await updateMusic((await params).id, await jsonBody(request)));
  });
}
export async function DELETE(request: Request, { params }: Context) {
  return endpoint(async () => {
    assertOrigin(request);
    return success(await updateMusic((await params).id, await jsonBody(request), true));
  });
}
