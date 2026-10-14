import { assertOrigin, endpoint, jsonBody, success } from '@/lib/server/http';
import { unpublish } from '@/lib/server/publication';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    assertOrigin(request);
    return success(await unpublish((await params).id, await jsonBody(request)));
  });
}
