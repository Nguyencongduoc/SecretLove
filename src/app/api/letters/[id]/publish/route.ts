import { assertOrigin, endpoint, jsonBody, success } from '@/lib/server/http';
import { publish } from '@/lib/server/publication';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(async () => {
    assertOrigin(request);
    return success(await publish((await params).id, await jsonBody(request)));
  });
}
