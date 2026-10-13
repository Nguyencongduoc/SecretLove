import 'server-only';
import { AppError } from './errors';

function configurationError(): never {
  throw new AppError(
    503,
    'CONFIGURATION_REQUIRED',
    'Supabase is not configured. Follow the project setup guide before signing in.',
  );
}
export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) configurationError();
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' &&
      !(
        process.env.NODE_ENV !== 'production' &&
        ['localhost', '127.0.0.1'].includes(parsed.hostname)
      )
    )
      configurationError();
  } catch {
    configurationError();
  }
  return { url, key };
}
export function configured() {
  try {
    publicConfig();
    return true;
  } catch {
    return false;
  }
}
export function secret(
  name:
    'SUPABASE_SERVICE_ROLE_KEY' | 'VERIFICATION_HMAC_KEY' | 'RATE_LIMIT_HMAC_KEY' | 'CRON_SECRET',
) {
  const value = process.env[name];
  if (!value) configurationError();
  if (
    name.endsWith('HMAC_KEY') &&
    (Buffer.from(value, 'base64').length < 32 ||
      Buffer.from(value, 'base64').toString('base64') !== value)
  )
    configurationError();
  return value;
}
export function appOrigin() {
  const origin = process.env.APP_ORIGIN;
  if (!origin) configurationError();
  try {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    )
      configurationError();
  } catch {
    configurationError();
  }
  return origin;
}
