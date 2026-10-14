import 'server-only';
import { randomUUID, createHmac } from 'node:crypto';
import { serviceClient } from '@/lib/supabase/service';
import { requireCreator } from './identity';
import { AppError, databaseError } from './errors';
import { secret } from './env';
import { gateDigest, hashPassphrase } from './crypto';
import {
  createLetterSchema,
  idSchema,
  saveLetterSchema,
  versionSchema,
} from '@/lib/validation/letters';
import type { Letter, LetterCard, Photo } from '@/lib/types';
import { resolvedMusic } from '@/lib/validation/music';
import { resolveSceneText } from '@/lib/validation/scene-text';
import { resolveHeart } from '@/lib/validation/heart';

export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await serviceClient().rpc(name, args);
  if (error) databaseError(error.message);
  return data as T;
}
export async function mutationLimit(userId: string, upload = false) {
  const digest = createHmac('sha256', Buffer.from(secret('RATE_LIMIT_HMAC_KEY'), 'base64'))
    .update(`${upload ? 'upload' : 'mutation'}:${userId}`)
    .digest('base64');
  const allowed = await rpc<boolean>('sl_rate_limit', {
    scope_input: upload ? 'creator_upload' : 'creator_mutation',
    digest_input: digest,
    limit_input: upload ? 12 : 60,
    seconds_input: upload ? 600 : 60,
  });
  if (!allowed)
    throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait before trying again.');
}

export async function listLetters(): Promise<LetterCard[]> {
  const { client, user } = await requireCreator();
  const { data, error } = await client
    .from('creator_letters')
    .select('id,title,status,template_id,version,created_at,updated_at')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(20);
  if (error) databaseError();
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    templateId: row.template_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getLetter(id: string): Promise<Letter> {
  idSchema.parse(id);
  const { client, user } = await requireCreator();
  const { data: row, error } = await client
    .from('creator_letters')
    .select(
      'id,title,recipient_display_name,body_doc,template_id,status,version,created_at,updated_at,published_at,presentation_config,scene_text',
    )
    .eq('id', id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) databaseError();
  if (!row) throw new AppError(404, 'NOT_FOUND', 'This letter is unavailable.');
  const { data: photos, error: photoError } = await client
    .from('letter_photos')
    .select('id,alt_text,status,created_at')
    .eq('letter_id', id)
    .order('created_at')
    .order('id');
  if (photoError) databaseError();
  const { data: assets, error: assetError } = await client
    .from('letter_assets')
    .select('id,status,duration_seconds')
    .eq('letter_id', id)
    .limit(1);
  if (assetError) databaseError();
  const flags = await rpc<{ verificationConfigured: boolean; passphraseRequired: boolean }>(
    'sl_gate_flags',
    { a: user.id, lid: id },
  );
  return {
    heartCustomization: resolveHeart(row.presentation_config?.heartCustomization),
    sceneText: resolveSceneText(row.scene_text),
    music: resolvedMusic(row.presentation_config),
    audioAsset: assets?.[0]
      ? { id: assets[0].id, status: assets[0].status, durationSeconds: assets[0].duration_seconds }
      : null,
    id: row.id,
    title: row.title,
    recipientDisplayName: row.recipient_display_name,
    bodyDoc: row.body_doc,
    templateId: row.template_id,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    ...flags,
    photos: (photos ?? []).map((photo) => ({
      id: photo.id,
      altText: photo.alt_text,
      status: photo.status,
      createdAt: photo.created_at,
    })),
  };
}

export async function createLetter(input: unknown) {
  const payload = createLetterSchema.parse(input);
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  const result = await rpc<{ id: string }>('sl_create_letter', {
    a: user.id,
    title_input: payload.title,
  });
  return getLetter(result.id);
}
export async function saveLetter(id: string, input: unknown) {
  idSchema.parse(id);
  const payload = saveLetterSchema.parse(input);
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  // Check ownership/draft before costly hashing. RPC checks again under lock.
  const current = await getLetter(id);
  if (current.status !== 'draft')
    throw new AppError(409, 'LETTER_PUBLISHED', 'Unpublish this letter before editing.');
  if (current.version !== payload.expectedVersion)
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'This letter changed. Reload it before saving again.',
    );
  if (
    payload.passphrase?.action === 'set' &&
    !current.verificationConfigured &&
    !payload.verification
  )
    throw new AppError(
      422,
      'VERIFICATION_REQUIRED',
      'Set the verification name and date of birth first.',
    );
  const { expectedVersion, verification, passphrase, ...changes } = payload;
  const stored: Record<string, unknown> = { ...changes };
  if (verification)
    stored.gate = gateDigest(
      id,
      verification.name,
      verification.dateOfBirth,
      Buffer.from(secret('VERIFICATION_HMAC_KEY'), 'base64'),
    );
  if (passphrase?.action === 'remove') stored.passphraseRecord = null;
  if (passphrase?.action === 'set') {
    const hash = await hashPassphrase(passphrase.value);
    if (!hash)
      throw new AppError(503, 'TEMPORARILY_UNAVAILABLE', 'Please try saving again in a moment.');
    stored.passphraseRecord = hash;
  }
  await rpc('sl_save_letter', { a: user.id, lid: id, expected: expectedVersion, changes: stored });
  return getLetter(id);
}
export async function deleteLetter(id: string, expected: string) {
  idSchema.parse(id);
  versionSchema.parse(expected);
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  return rpc<{ deleted: true; mediaCleanup: 'pending' | 'not_required' }>('sl_delete_letter', {
    a: user.id,
    lid: id,
    expected,
  });
}
export async function photoPath(id: string, photoId: string) {
  idSchema.parse(id);
  idSchema.parse(photoId);
  const { user } = await requireCreator();
  return rpc<string>('sl_photo_path', { a: user.id, lid: id, pid: photoId });
}
export async function changePhoto(id: string, photoId: string, expected: string, altText?: string) {
  idSchema.parse(id);
  idSchema.parse(photoId);
  versionSchema.parse(expected);
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  const result = await rpc<{ removed: boolean; version: string; mediaCleanup: string }>(
    'sl_photo_change',
    { a: user.id, lid: id, pid: photoId, expected, alt_input: altText ?? null },
  );
  return {
    ...result,
    ...(altText === undefined
      ? {}
      : { photo: (await getLetter(id)).photos.find((photo) => photo.id === photoId) as Photo }),
  };
}
export const newPhotoId = () => randomUUID();
