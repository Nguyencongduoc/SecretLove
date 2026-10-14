import { endpoint, success } from '@/lib/server/http';
import { shareLetter } from '@/lib/server/publication';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return endpoint(async () => success(await shareLetter((await params).id)));
}
