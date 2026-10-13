import 'server-only';
import sharp from 'sharp';
import { serviceClient } from '@/lib/supabase/service';
import { requireCreator } from './identity';
import { getLetter, mutationLimit, newPhotoId, rpc } from './letters';
import { AppError } from './errors';
import { altSchema, idSchema, versionSchema } from '@/lib/validation/letters';

export const MAX_IMAGE = 3145728;
let decoding = 0;
export async function normalizeImage(input: Buffer) {
  if (!input.length || input.length > MAX_IMAGE)
    throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Choose an image up to 3 MiB.');
  if (decoding >= 2)
    throw new AppError(503, 'TEMPORARILY_UNAVAILABLE', 'Please try this upload again in a moment.');
  decoding++;
  try {
    const image = sharp(input, {
      limitInputPixels: 16000000,
      failOn: 'warning',
      sequentialRead: true,
    });
    const meta = await image.metadata();
    if (
      !['jpeg', 'png', 'webp'].includes(meta.format ?? '') ||
      (meta.pages ?? 1) > 1 ||
      !meta.width ||
      !meta.height ||
      meta.width > 4096 ||
      meta.height > 4096
    )
      throw new AppError(
        422,
        'INVALID_IMAGE',
        'Use a non-animated JPEG, PNG or WebP up to 4096 pixels per side.',
      );
    const { data, info } = await image
      .rotate()
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > MAX_IMAGE)
      throw new AppError(
        413,
        'PAYLOAD_TOO_LARGE',
        'The processed image is too large. Compress it and try again.',
      );
    return { data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      422,
      'INVALID_IMAGE',
      'This image could not be read. Use a valid JPEG, PNG or WebP.',
    );
  } finally {
    decoding--;
  }
}
export async function uploadPhoto(id: string, form: FormData) {
  idSchema.parse(id);
  const expected = versionSchema.parse(form.get('expectedVersion'));
  const altText = altSchema.parse(form.get('altText') || 'Photo memory');
  const entries = Array.from(form.keys());
  if (
    entries.some((key) => !['file', 'expectedVersion', 'altText'].includes(key)) ||
    form.getAll('file').length !== 1 ||
    form.getAll('expectedVersion').length !== 1 ||
    form.getAll('altText').length > 1
  )
    throw new AppError(400, 'VALIDATION_ERROR', 'Send one file and valid upload fields.');
  const file = form.get('file');
  if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Choose a JPEG, PNG or WebP image.');
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  await mutationLimit(user.id, true);
  const current = await getLetter(id);
  if (current.status !== 'draft')
    throw new AppError(409, 'LETTER_PUBLISHED', 'Unpublish before uploading photos.');
  if (current.version !== expected)
    throw new AppError(409, 'VERSION_CONFLICT', 'This letter changed. Reload it before uploading.');
  const image = await normalizeImage(Buffer.from(await file.arrayBuffer()));
  const photoId = newPhotoId();
  const reservation = await rpc<{ path: string; reservedVersion: string }>('sl_photo_reserve', {
    a: user.id,
    lid: id,
    expected,
    pid: photoId,
    info: { byteSize: image.data.length, width: image.width, height: image.height, altText },
  });
  try {
    const { error } = await serviceClient()
      .storage.from('letter-media')
      .upload(reservation.path, image.data, {
        contentType: 'image/webp',
        cacheControl: '0',
        upsert: false,
      });
    if (error)
      throw new AppError(
        503,
        'TEMPORARILY_UNAVAILABLE',
        'The upload did not finish. Reload before trying again.',
      );
    const result = await rpc<{ conflict: boolean; version?: string }>('sl_photo_finalize', {
      a: user.id,
      lid: id,
      pid: photoId,
      reserved: reservation.reservedVersion,
    });
    if (result.conflict)
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'The letter changed during upload. Your image will be cleaned up; reload before trying again.',
      );
    const updated = await getLetter(id);
    return { photo: updated.photos.find((photo) => photo.id === photoId), version: result.version };
  } catch (error) {
    // Preserve original failure; a failed cleanup enqueue is reconciled from the pending reservation.
    try {
      await rpc('sl_photo_fail', { a: user.id, lid: id, pid: photoId });
    } catch {
      console.error(JSON.stringify({ code: 'UPLOAD_CLEANUP_PENDING' }));
    }
    throw error;
  }
}
