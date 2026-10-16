import 'server-only';
import { createHmac } from 'node:crypto';
import { secret } from './env';
import { rpc } from './rpc';
import { AppError } from './errors';
export async function durableLimit(scope: string, subject: string, count: number, seconds: number) {
  const digest = createHmac('sha256', Buffer.from(secret('RATE_LIMIT_HMAC_KEY'), 'base64'))
    .update(JSON.stringify([scope, subject]))
    .digest('base64');
  const allowed = await rpc<boolean>('sl_rate_limit', {
    scope_input: scope,
    digest_input: digest,
    limit_input: count,
    seconds_input: seconds,
  });
  if (!allowed) throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please try later.');
}
