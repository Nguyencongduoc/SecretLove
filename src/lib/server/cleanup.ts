import 'server-only';
import { z } from 'zod';
import { rpc } from './letters';
import { serviceClient } from '@/lib/supabase/service';
import { AppError } from './errors';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const cursorSchema = z
  .array(z.strictObject({ prefix: z.string().max(100), offset: z.number().int().min(0) }))
  .max(100);
type Job = {
  id: string;
  bucket: 'letter-media' | 'letter-assets';
  path: string;
  leaseToken: string;
};
// Bounded depth-first traversal with durable offsets. Full sweeps restart to recover pagination shifts.
export async function cleanupMedia() {
  const deadline = Date.now() + 40000;
  const stale = await rpc<number>('sl_cleanup_stale');
  await rpc<number>('sl_recovery_prune');
  let completed = 0;
  let failed = 0;
  const jobs = await rpc<Job[]>('sl_cleanup_claim_v2');
  for (const job of jobs) {
    if (Date.now() >= deadline) break;
    if (!['letter-media', 'letter-assets'].includes(job.bucket))
      throw new AppError(503, 'CLEANUP_INVALID_BUCKET', 'Cleanup could not finish.');
    const { error } = await serviceClient().storage.from(job.bucket).remove([job.path]);
    await rpc('sl_cleanup_complete_v2', {
      jid: job.id,
      bucket_input: job.bucket,
      path_input: job.path,
      token: job.leaseToken,
      succeeded: !error,
    });
    if (error) failed++;
    else completed++;
  }
  let scanned = 0;
  let scanComplete = true;
  for (const bucket of ['letter-media', 'letter-assets'] as const) {
    const storage = serviceClient().storage.from(bucket);
    const stateRpc = bucket === 'letter-media' ? 'sl_maintenance_state' : 'sl_audio_scan_state';
    const extension = bucket === 'letter-media' ? '.webp' : '.mp3';
    const stored = await rpc<unknown>(stateRpc);
    const parsed = cursorSchema.safeParse(stored);
    const frames = parsed.success && parsed.data.length ? parsed.data : [{ prefix: '', offset: 0 }];
    let bucketScanned = 0;
    while (frames.length && bucketScanned < 50 && Date.now() < deadline) {
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
        bucketScanned++;
        if (!object.id && uuid.test(object.name) && prefix.split('/').length <= 2)
          frames.push({ prefix, offset: 0 });
        if (
          object.id &&
          prefix.split('/').length === 3 &&
          uuid.test(object.name.slice(0, -extension.length)) &&
          object.name.endsWith(extension)
        ) {
          const created = Date.parse(object.created_at ?? '');
          const updated = Date.parse(object.updated_at ?? '');
          if (
            Number.isFinite(created) &&
            Number.isFinite(updated) &&
            Math.max(created, updated) < Date.now() - 3600000
          )
            await rpc(bucket === 'letter-media' ? 'sl_enqueue_orphan' : 'sl_audio_orphan', {
              path_input: prefix,
            });
        }
      }
    }
    await rpc(stateRpc, {
      new_cursor: frames.length ? frames : null,
      write_state: true,
    });
    scanComplete = scanComplete && frames.length === 0;
  }
  return {
    stale,
    scanned,
    completed,
    failed,
    remaining: await rpc<number>('sl_cleanup_remaining'),
    scanComplete,
  };
}
