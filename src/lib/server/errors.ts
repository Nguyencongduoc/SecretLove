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
  NOT_FOUND: [404, 'This letter or photo is unavailable.'],
  VERSION_CONFLICT: [409, 'This letter changed. Reload it before saving again.'],
  LETTER_PUBLISHED: [409, 'Unpublish this letter before editing.'],
  LETTER_LIMIT: [409, 'You can keep up to 20 active letters.'],
  PHOTO_LIMIT: [409, 'A letter can have up to six photos.'],
  VERIFICATION_REQUIRED: [422, 'Set the verification name and date of birth first.'],
  UPLOAD_PENDING: [409, 'Wait for the pending upload to finish.'],
};
export function databaseError(message?: string): never {
  const key = message && Object.hasOwn(errors, message) ? message : 'TEMPORARILY_UNAVAILABLE';
  const [status, text] = errors[key] ?? [
    503,
    'The service is temporarily unavailable. Please try again.',
  ];
  throw new AppError(status, key, text);
}
