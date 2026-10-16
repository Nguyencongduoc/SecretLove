import { assertOrigin, endpoint, jsonBody, success } from '@/lib/server/http';
import { submitReport } from '@/lib/server/reports';
export async function POST(request: Request) {
  return endpoint(async () => {
    assertOrigin(request);
    return success(await submitReport(await jsonBody(request, 8192), request), 202);
  });
}
