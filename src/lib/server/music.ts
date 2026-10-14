import 'server-only';
import { randomUUID, createHmac } from 'node:crypto';
import { secret } from './env';
import { requireCreator } from './identity';
import { getLetter, mutationLimit, rpc } from './letters';
import { AppError } from './errors';
import { idSchema, versionBodySchema, versionSchema } from '@/lib/validation/letters';
import { musicSettingsSchema } from '@/lib/validation/music';
import { normalizeAudio, audioLimit } from './mp3';
import { serviceClient } from '@/lib/supabase/service';
export type AudioObject = { path: string; size: number };
export async function uploadMusic(id: string, form: FormData) {
  idSchema.parse(id);
  const expected = versionSchema.parse(form.get('expectedVersion'));
  if (
    [...form.keys()].some((k) => !['file', 'expectedVersion', 'rightsAcknowledged'].includes(k)) ||
    form.getAll('file').length !== 1 ||
    form.getAll('expectedVersion').length !== 1 ||
    form.getAll('rightsAcknowledged').length !== 1 ||
    form.get('rightsAcknowledged') !== 'true'
  )
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Confirm that you have permission to use this music.',
    );
  const file = form.get('file');
  if (
    !(file instanceof File) ||
    !['audio/mpeg', 'audio/mp3'].includes(file.type) ||
    !/\.mp3$/i.test(file.name)
  )
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Choose one MP3 audio file.');
  if (file.size > audioLimit())
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'This MP3 exceeds the upload limit.');
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  await mutationLimit(user.id, true);
  const current = await getLetter(id);
  if (current.status !== 'draft')
    throw new AppError(409, 'LETTER_PUBLISHED', 'Unpublish before changing music.');
  if (current.version !== expected)
    throw new AppError(409, 'VERSION_CONFLICT', 'Reload the letter before uploading.');
  const audio = await normalizeAudio(Buffer.from(await file.arrayBuffer())),
    aid = randomUUID();
  const reserved = await rpc<{ path: string; reservedVersion: string }>('sl_audio_reserve', {
    a: user.id,
    lid: id,
    expected,
    aid,
    size_input: audio.data.length,
    duration_input: audio.duration,
  });
  try {
    const { error } = await serviceClient()
      .storage.from('letter-assets')
      .upload(reserved.path, audio.data, {
        contentType: 'audio/mpeg',
        cacheControl: '0',
        upsert: false,
      });
    if (error)
      throw new AppError(
        503,
        'UPLOAD_FAILED',
        'Upload did not finish. Reload before trying again.',
      );
    const result = await rpc<{ conflict: boolean }>('sl_audio_finalize', {
      a: user.id,
      lid: id,
      aid,
      reserved: reserved.reservedVersion,
    });
    if (result.conflict)
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'The letter changed during upload. Reload before trying again.',
      );
    return await getLetter(id);
  } catch (error) {
    try {
      await rpc('sl_audio_fail', { a: user.id, lid: id, aid });
    } catch {
      console.error(JSON.stringify({ code: 'AUDIO_CLEANUP_PENDING' }));
    }
    throw error;
  }
}
export async function updateMusic(id: string, input: unknown, remove = false) {
  idSchema.parse(id);
  const payload = remove ? versionBodySchema.parse(input) : musicSettingsSchema.parse(input);
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  await rpc(remove ? 'sl_music_remove' : 'sl_music_settings', {
    a: user.id,
    lid: id,
    expected: payload.expectedVersion,
    ...('music' in payload ? { music_input: payload.music } : {}),
  });
  return getLetter(id);
}
export async function ownerAudio(id: string, aid: string) {
  idSchema.parse(id);
  idSchema.parse(aid);
  const { user } = await requireCreator();
  const allowed = await rpc<boolean>('sl_rate_limit', {
    scope_input: 'creator_audio_read',
    digest_input: createHmac('sha256', Buffer.from(secret('RATE_LIMIT_HMAC_KEY'), 'base64'))
      .update(`audio:${user.id}`)
      .digest('base64'),
    limit_input: 120,
    seconds_input: 60,
  });
  if (!allowed) throw new AppError(429, 'RATE_LIMITED', 'Too many music requests. Please wait.');
  return rpc<AudioObject>('sl_owner_audio', { a: user.id, lid: id, aid });
}
