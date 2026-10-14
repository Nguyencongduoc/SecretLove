import { api, ApiError } from './client-api';
import type { Letter } from './types';
import { AUDIO_HARD_MAX } from './audio-limits';
import { AUDIO_PART_BYTES } from './validation/audio-ingest';
export async function uploadMusicInChunks(
  path: string,
  form: FormData,
  onState: (letter: Letter) => void,
  progress: (message: string) => void,
) {
  const file = form.get('file');
  if (
    !(file instanceof File) ||
    !['audio/mpeg', 'audio/mp3'].includes(file.type) ||
    !/\.mp3$/i.test(file.name)
  )
    throw new ApiError('Choose one MP3 audio file.', 415, 'UNSUPPORTED_MEDIA_TYPE');
  if (!file.size || file.size > AUDIO_HARD_MAX)
    throw new ApiError('Choose an MP3 up to 16 MiB.', 413, 'PAYLOAD_TOO_LARGE');
  if (form.get('rightsAcknowledged') !== 'true')
    throw new ApiError(
      'Confirm that you have permission to use this music.',
      400,
      'VALIDATION_ERROR',
    );
  const expectedVersion = String(form.get('expectedVersion'));
  progress('Preparing your private MP3…');
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  const digest = [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
  let ingest: { id: string; assetId: string; partCount: number } | undefined;
  const reconcile = (letter: Letter) => {
    if (letter.version !== String(BigInt(expectedVersion) + 2n))
      throw new ApiError(
        'The letter changed during upload. Reload it before making more changes.',
        409,
        'VERSION_CONFLICT',
      );
    onState(letter);
    return letter;
  };
  try {
    ingest = await api(`${path}/ingests`, 'POST', {
      expectedVersion,
      byteSize: file.size,
      digest,
      rightsAcknowledged: true,
      fileType: file.type,
      extension: 'mp3',
    });
    for (let index = 0; index < ingest!.partCount; index++) {
      progress(`Uploading private MP3 chunk ${index + 1} of ${ingest!.partCount}…`);
      await api(
        `${path}/ingests/${ingest!.id}/parts/${index}`,
        'PUT',
        file.slice(index * AUDIO_PART_BYTES, (index + 1) * AUDIO_PART_BYTES),
      );
    }
    progress('Validating your private MP3…');
    return reconcile(await api<Letter>(`${path}/ingests/${ingest!.id}`, 'POST', {}));
  } catch (error) {
    if (ingest) {
      let current: Letter;
      try {
        current = await api<Letter>(`${path}/ingests/${ingest.id}`, 'DELETE');
      } catch {
        throw new ApiError(
          'Upload status could not be confirmed. Reload the letter to retry or cancel the pending upload.',
          409,
          'UPLOAD_STATE_CHANGED',
        );
      }
      reconcile(current);
      // A committed ready track may survive an interrupted response; never delete it as failed staging.
      if (current.audioAsset?.id === ingest.assetId && current.audioAsset.status === 'ready')
        return current;
    }
    throw error;
  }
}
