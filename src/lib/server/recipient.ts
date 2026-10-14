import 'server-only';
import { resolveSceneText } from '@/lib/validation/scene-text';
import { resolvedMusic } from '@/lib/validation/music';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { cookies } from 'next/headers';
import { AppError } from './errors';
import { appOrigin, secret } from './env';
import { rpc } from './letters';
import { comparePassphrase } from './crypto';
import { normalizeName, idSchema } from '@/lib/validation/letters';
import { shareTokenSchema, verifyRecipientSchema } from '@/lib/validation/recipient';
import { resolveLegacyPresentation } from '@/lib/experience/configuration';
import { parseRichText } from '@/lib/validation/rich-text';
import type { RecipientContent } from '@/lib/experience/types';

export const tokenDigest = (token: string) => createHash('sha256').update(token).digest('base64');
function token(token: string) {
  if (!shareTokenSchema.safeParse(token).success)
    throw new AppError(404, 'NOT_FOUND', 'This letter is unavailable.');
  return tokenDigest(token);
}
const secureCookie = () =>
  process.env.NODE_ENV === 'production' || appOrigin().startsWith('https:');
export function recipientCookieName(share: string) {
  return `${secureCookie() ? '__Host-sl-recipient-' : 'sl-recipient-dev-'}${Buffer.from(token(share), 'base64').subarray(0, 16).toString('hex')}`;
}
async function sessionDigest(share: string) {
  const value = (await cookies()).get(recipientCookieName(share))?.value;
  return value && shareTokenSchema.safeParse(value).success ? tokenDigest(value) : null;
}
function rateDigest(scope: string) {
  return createHmac('sha256', Buffer.from(secret('RATE_LIMIT_HMAC_KEY'), 'base64'))
    .update(scope)
    .digest('base64');
}
export function recipientRateSubject(request: Request) {
  // This header is accepted only inside Vercel's configured hosting boundary.
  // Else share one conservative bucket; arbitrary X-Forwarded-For is never trusted.
  const supplied =
    process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') : null;
  if (supplied && supplied.length <= 45 && isIP(supplied)) return supplied;
  const namespace = process.env.SECRETLOVE_TEST_RATE_NAMESPACE;
  if (
    process.env.VERCEL !== '1' &&
    process.env.SECRETLOVE_TEST_PROJECT === 'isolated' &&
    namespace &&
    /^[0-9a-f-]{36}$/.test(namespace) &&
    ['localhost', '127.0.0.1'].includes(new URL(appOrigin()).hostname)
  )
    return `isolated-local-run:${namespace}`;
  return 'shared-anonymous';
}
async function limit(scope: string, key: string, count: number, seconds: number) {
  const allowed = await rpc<boolean>('sl_rate_limit', {
    scope_input: scope,
    digest_input: rateDigest(key),
    limit_input: count,
    seconds_input: seconds,
  });
  if (!allowed)
    throw new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait before trying again.');
}
export async function recipientRequestLimit(request: Request) {
  await limit('recipient_request', `request:${recipientRateSubject(request)}`, 120, 60);
}
export async function bootstrap(share: string, request: Request) {
  await recipientRequestLimit(request);
  return rpc<{ available: true; passphraseRequired: boolean }>('sl_bootstrap', {
    share_digest: token(share),
  });
}
export async function verifyRecipient(share: string, input: unknown, request: Request) {
  const payload = verifyRecipientSchema.parse(input);
  await recipientRequestLimit(request);
  const address = recipientRateSubject(request);
  await limit('verify_ip', `verify-ip:${address}`, 30, 900);
  const shareDigest = token(share);
  const gate = await rpc<{
    letterId: string;
    accessVersion: string;
    nonce: string;
    digest: string;
    keyVersion: number;
    passphrase: unknown;
  }>('sl_verification_gate', { share_digest: shareDigest });
  const allowed = await rpc<boolean>('sl_verification_limits', {
    ip_letter_digest: rateDigest(`verify:${gate.letterId}:${address}`),
    letter_digest: rateDigest(`letter:${gate.letterId}`),
  });
  if (!allowed)
    throw new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait before trying again.');
  if (gate.keyVersion !== 1)
    throw new AppError(503, 'TEMPORARILY_UNAVAILABLE', 'Please try again later.');
  const candidate = createHmac('sha256', Buffer.from(secret('VERIFICATION_HMAC_KEY'), 'base64'))
    .update(
      JSON.stringify([gate.letterId, gate.nonce, normalizeName(payload.name), payload.dateOfBirth]),
    )
    .digest();
  const expected = Buffer.from(gate.digest, 'base64');
  const identityMatches = expected.length === 32 && timingSafeEqual(candidate, expected);
  // Do not short circuit costly passphrase comparison on an incorrect identity.
  const phraseMatches =
    gate.passphrase === null
      ? true
      : await comparePassphrase(payload.passphrase ?? '', gate.passphrase);
  if (phraseMatches === null)
    throw new AppError(503, 'TEMPORARILY_UNAVAILABLE', 'Please try again in a moment.');
  if (!identityMatches || !phraseMatches)
    throw new AppError(
      401,
      'VERIFICATION_FAILED',
      'Those details did not unlock the letter. Please try again.',
    );
  const raw = randomBytes(32).toString('base64url');
  const result = await rpc<{ expiresAt: string }>('sl_session_issue', {
    share_digest: shareDigest,
    expected_access: gate.accessVersion,
    nonce_input: gate.nonce,
    session_digest: tokenDigest(raw),
    previous_digest: await sessionDigest(share),
  });
  (await cookies()).set(recipientCookieName(share), raw, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: 1800,
  });
  return { verified: true, ...result };
}
export async function recipientContent(share: string, request: Request): Promise<RecipientContent> {
  await recipientRequestLimit(request);
  const data = await rpc<Omit<RecipientContent, 'presentation'> & { presentationConfig: unknown }>(
    'sl_recipient_content',
    {
      share_digest: token(share),
      session_digest: await sessionDigest(share),
    },
  );
  parseRichText(data.bodyDoc);
  const { presentationConfig, ...content } = data;
  const presentation = resolveLegacyPresentation(data.templateId);
  presentation.configuration.music = resolvedMusic(presentationConfig);
  return { ...content, sceneText: resolveSceneText(data.sceneText), presentation };
}
export async function recipientAudio(share: string, assetId: string, request: Request) {
  await recipientRequestLimit(request);
  idSchema.parse(assetId);
  return rpc<{ path: string; size: number }>('sl_recipient_audio', {
    share_digest: token(share),
    session_digest: await sessionDigest(share),
    aid: assetId,
  });
}
export async function recipientPhoto(share: string, photoId: string, request: Request) {
  await recipientRequestLimit(request);
  idSchema.parse(photoId);
  return rpc<string>('sl_recipient_photo', {
    share_digest: token(share),
    session_digest: await sessionDigest(share),
    pid: photoId,
  });
}
export async function closeRecipient(share: string, request: Request) {
  await recipientRequestLimit(request);
  await rpc('sl_session_close', {
    share_digest: token(share),
    session_digest: await sessionDigest(share),
  });
  (await cookies()).set(recipientCookieName(share), '', {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
