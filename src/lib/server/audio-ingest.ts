import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { requireCreator } from './identity';
import { getLetter, mutationLimit, rpc } from './letters';
import { AppError } from './errors';
import { audioLimit, normalizeAudio } from './mp3';
import { secret } from './env';
import { idSchema } from '@/lib/validation/letters';
import {
  AUDIO_PART_BYTES,
  ingestBeginSchema,
  partIndexSchema,
} from '@/lib/validation/audio-ingest';
import { serviceClient } from '@/lib/supabase/service';
const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');
export async function beginAudioIngest(id: string, input: unknown) {
  idSchema.parse(id);
  const value = ingestBeginSchema.parse(input);
  if (value.byteSize > audioLimit())
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'This MP3 exceeds the upload limit.');
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  await mutationLimit(user.id, true);
  return rpc<{ id: string; assetId: string; partCount: number; expiresAt: string }>(
    'sl_ingest_begin',
    {
      a: user.id,
      lid: id,
      expected: value.expectedVersion,
      size_input: value.byteSize,
      digest_input: value.digest,
    },
  );
}
export async function ingestActor(id: string, ingestId: string) {
  idSchema.parse(id);
  idSchema.parse(ingestId);
  return (await requireCreator()).user.id;
}
export async function ingestPartLimit(actor: string) {
  const allowed = await rpc<boolean>('sl_rate_limit', {
    scope_input: 'creator_audio_part',
    digest_input: createHmac('sha256', Buffer.from(secret('RATE_LIMIT_HMAC_KEY'), 'base64'))
      .update(`audio-part:${actor}`)
      .digest('base64'),
    limit_input: 120,
    seconds_input: 60,
  });
  if (!allowed) throw new AppError(429, 'RATE_LIMITED', 'Too many upload chunks. Please wait.');
}
export async function storeAudioPart(
  actor: string,
  id: string,
  ingestId: string,
  index: string,
  data: Buffer,
  signal: AbortSignal,
) {
  const partIndex = partIndexSchema.parse(index);
  if (!data.length || data.length > AUDIO_PART_BYTES)
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Upload chunks must be at most 1 MiB.');
  const args = {
    a: actor,
    lid: id,
    iid: ingestId,
    index_input: partIndex,
    size_input: data.length,
    digest_input: digest(data),
  };
  const part = await rpc<{ path: string; ready: boolean }>('sl_ingest_part', args);
  if (part.ready) return { stored: true };
  const storage = serviceClient(signal).storage.from('letter-audio-staging');
  const upload = await storage.upload(part.path, data, {
    contentType: 'application/octet-stream',
    cacheControl: '0',
    upsert: false,
  });
  if (upload.error) {
    // A retry/ambiguous response may encounter an immutable object already uploaded.
    const existing = await storage.download(part.path);
    if (
      existing.error ||
      !existing.data ||
      existing.data.size !== data.length ||
      digest(Buffer.from(await existing.data.arrayBuffer())) !== args.digest_input
    )
      throw new AppError(
        503,
        'UPLOAD_FAILED',
        'This chunk did not finish. Retry or cancel the upload.',
      );
  }
  await rpc('sl_ingest_part', { ...args, mark_ready: true });
  return { stored: true };
}
type Commit = {
  lease: string;
  assetId: string;
  size: number;
  digest: string;
  parts: { path: string; size: number; digest: string }[];
};
let assembling = 0;
export async function commitAudioIngest(id: string, ingestId: string, requestSignal: AbortSignal) {
  const actor = await ingestActor(id, ingestId);
  await mutationLimit(actor);
  if (assembling >= 2)
    throw new AppError(503, 'AUDIO_BUSY', 'Music validation is busy. Retry shortly.');
  assembling++;
  let upload: Commit | undefined;
  try {
    upload = await rpc<Commit>('sl_ingest_commit_begin', { a: actor, lid: id, iid: ingestId });
    if (
      !upload ||
      upload.size < 1 ||
      upload.size > audioLimit() ||
      upload.parts.length < 1 ||
      upload.parts.length > 16
    )
      throw new AppError(503, 'UPLOAD_FAILED', 'The upload could not be validated.');
    const signal = AbortSignal.any([requestSignal, AbortSignal.timeout(45000)]);
    const service = serviceClient(signal);
    const chunks: Buffer[] = [];
    for (const part of upload.parts) {
      const result = await service.storage.from('letter-audio-staging').download(part.path);
      if (
        result.error ||
        !result.data ||
        result.data.size !== part.size ||
        part.size > AUDIO_PART_BYTES
      )
        throw new AppError(
          503,
          'UPLOAD_FAILED',
          'Some upload chunks could not load. Retry or cancel the upload.',
        );
      const chunk = Buffer.from(await result.data.arrayBuffer());
      if (digest(chunk) !== part.digest)
        throw new AppError(422, 'INVALID_AUDIO', 'The upload did not match its manifest.');
      chunks.push(chunk);
    }
    const input = Buffer.concat(chunks);
    if (input.length !== upload.size || digest(input) !== upload.digest)
      throw new AppError(422, 'INVALID_AUDIO', 'The upload did not match its manifest.');
    const audio = await normalizeAudio(input);
    if (signal.aborted)
      throw new AppError(503, 'UPLOAD_FAILED', 'Validation timed out. Retry or cancel the upload.');
    const path = `${actor}/${id}/${upload.assetId}.mp3`;
    const result = await service.storage
      .from('letter-assets')
      .upload(path, audio.data, { contentType: 'audio/mpeg', cacheControl: '0', upsert: false });
    if (result.error) {
      const existing = await service.storage.from('letter-assets').download(path);
      if (
        existing.error ||
        !existing.data ||
        existing.data.size !== audio.data.length ||
        digest(Buffer.from(await existing.data.arrayBuffer())) !== digest(audio.data)
      )
        throw new AppError(
          503,
          'UPLOAD_FAILED',
          'The validated track could not be stored. Retry or cancel the upload.',
        );
    }
    if (signal.aborted)
      throw new AppError(503, 'UPLOAD_FAILED', 'Validation timed out. Retry or cancel the upload.');
    await rpc('sl_ingest_commit_finish', {
      a: actor,
      lid: id,
      iid: ingestId,
      lease_input: upload.lease,
      size_input: audio.data.length,
      duration_input: audio.duration,
    });
    return await getLetter(id);
  } catch (error) {
    if (upload) {
      try {
        await rpc('sl_ingest_release', {
          a: actor,
          lid: id,
          iid: ingestId,
          lease_input: upload.lease,
        });
      } catch {
        console.error(JSON.stringify({ code: 'INGEST_RELEASE_PENDING' }));
      }
    }
    // Staging/candidate bytes stay privately reserved until retry, cancellation or durable expiry cleanup.
    throw error;
  } finally {
    assembling--;
  }
}
export async function cancelAudioIngest(id: string, ingestId: string) {
  const actor = await ingestActor(id, ingestId);
  await mutationLimit(actor);
  await rpc('sl_ingest_cancel', { a: actor, lid: id, iid: ingestId });
  return getLetter(id);
}
