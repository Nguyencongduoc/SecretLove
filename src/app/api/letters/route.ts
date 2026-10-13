import { endpoint, assertOrigin, jsonBody, success } from '@/lib/server/http';
import { createLetter, listLetters } from '@/lib/server/letters';
export const dynamic = 'force-dynamic';
export async function GET() {
  return endpoint(async () => success({ items: await listLetters(), nextCursor: null }));
}
export async function POST(request: Request) {
  return endpoint(async () => {
    assertOrigin(request);
    return success(await createLetter(await jsonBody(request)), 201);
  });
}
