import 'server-only';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const errors: Record<string, [number, string]> = {
  INVALID_AUDIO: [
    422,
    'This MP3 could not be validated. Cancel the upload and choose a valid file.',
  ],
  UPLOAD_EXPIRED: [409, 'This upload expired. Cancel it, reload the letter and start again.'],
  AUDIO_LIMIT: [409, 'Remove the current track before replacing it.'],
  ASSET_QUOTA: [
    409,
    'Your audio storage limit is reached. Wait for cleanup or remove unused tracks.',
  ],
  INVALID_MUSIC: [422, 'Choose a ready track belonging to this letter and valid music settings.'],
  NOT_FOUND: [404, 'This letter or photo is unavailable.'],
  VERSION_CONFLICT: [409, 'This letter changed. Reload it before saving again.'],
  LETTER_PUBLISHED: [409, 'Unpublish this letter before editing.'],
  LETTER_LIMIT: [409, 'You can keep up to 20 active letters.'],
  PHOTO_LIMIT: [409, 'A letter can have up to six photos.'],
  VERIFICATION_REQUIRED: [422, 'Set the verification name and date of birth first.'],
  UPLOAD_PENDING: [409, 'Wait for the pending upload to finish.'],
  PUBLISH_INCOMPLETE: [
    422,
    'Save a greeting, message, and verification details before publishing.',
  ],
  NOT_PUBLISHED: [409, 'Publish this letter before sharing it.'],
  ACCESS_REQUIRED: [401, 'Unlock this letter to continue.'],
};
export function databaseError(message?: string): never {
  const key = message && Object.hasOwn(errors, message) ? message : 'TEMPORARILY_UNAVAILABLE';
  const [status, text] = errors[key] ?? [
    503,
    'The service is temporarily unavailable. Please try again.',
  ];
  throw new AppError(status, key, text);
}
