import 'server-only';
import { z } from 'zod';
import { rpc } from './letters';
import { serviceClient } from '@/lib/supabase/service';
import { AppError } from './errors';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const cursorSchema = z
  .array(z.strictObject({ prefix: z.string().max(100), offset: z.number().int().min(0) }))
  .max(100);
type Job = { id: string; path: string; leaseToken: string };
// Bounded depth-first traversal with durable offsets. Full sweeps restart to recover pagination shifts.
export async function cleanupMedia() {
  const deadline = Date.now() + 40000;
  const storage = serviceClient().storage.from('letter-media');
  const stale = await rpc<number>('sl_cleanup_stale');
  const stored = await rpc<unknown>('sl_maintenance_state');
  const parsed = cursorSchema.safeParse(stored);
  const frames = parsed.success && parsed.data.length ? parsed.data : [{ prefix: '', offset: 0 }];
  let scanned = 0;
  let completed = 0;
  let failed = 0;
  while (frames.length && scanned < 100 && Date.now() < deadline) {
    const frame = frames[frames.length - 1];
    const { data, error } = await storage.list(frame.prefix, {
      limit: 25,
      offset: frame.offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error || !data)
      throw new AppError(
        503,
        'CLEANUP_SCAN_FAILED',
        'Media cleanup could not finish. Retry the authenticated cleanup request later.',
      );
    if (data.length < 25) frames.pop();
    else frame.offset += data.length;
    for (const object of data) {
      const prefix = frame.prefix ? `${frame.prefix}/${object.name}` : object.name;
      scanned++;
      if (!object.id && uuid.test(object.name) && prefix.split('/').length <= 2)
        frames.push({ prefix, offset: 0 });
      if (
        object.id &&
        prefix.split('/').length === 3 &&
        uuid.test(object.name.replace(/\.webp$/, '')) &&
        object.name.endsWith('.webp')
      ) {
        const created = Date.parse(object.created_at ?? '');
        const updated = Date.parse(object.updated_at ?? '');
        if (
          Number.isFinite(created) &&
          Number.isFinite(updated) &&
          Math.max(created, updated) < Date.now() - 3600000
        )
          await rpc('sl_enqueue_orphan', { path_input: prefix });
      }
    }
  }
  await rpc('sl_maintenance_state', {
    new_cursor: frames.length ? frames : null,
    write_state: true,
  });
  if (Date.now() < deadline) {
    const jobs = await rpc<Job[]>('sl_cleanup_claim');
    for (const job of jobs) {
      if (Date.now() >= deadline) break; // Unacknowledged leases expire for a later invocation.
      const { error } = await storage.remove([job.path]);
      await rpc('sl_cleanup_complete', { jid: job.id, token: job.leaseToken, succeeded: !error });
      if (error) failed++;
      else completed++;
    }
  }
  return {
    stale,
    scanned,
    completed,
    failed,
    remaining: await rpc<number>('sl_cleanup_remaining'),
    scanComplete: frames.length === 0,
  };
}
