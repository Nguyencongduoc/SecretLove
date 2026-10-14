import 'server-only';
import { randomBytes } from 'node:crypto';
import { getLetter, mutationLimit, rpc } from './letters';
import { requireCreator } from './identity';
import { idSchema, versionBodySchema } from '@/lib/validation/letters';
import { parseRichText, messageText } from '@/lib/validation/rich-text';
import { tokenDigest } from './recipient';
import { AppError } from './errors';
import { appOrigin } from './env';
export async function publish(id: string, input: unknown) {
  idSchema.parse(id);
  const { expectedVersion } = versionBodySchema.parse(input);
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  const current = await getLetter(id);
  if (current.status === 'draft' && !messageText(parseRichText(current.bodyDoc)))
    throw new AppError(422, 'PUBLISH_INCOMPLETE', 'Write and save a message before publishing.');
  const raw = randomBytes(32).toString('base64url');
  const result = await rpc<{ shareToken: string }>('sl_publish', {
    a: user.id,
    lid: id,
    expected: expectedVersion,
    token_input: raw,
    digest_input: tokenDigest(raw),
  });
  return { letter: await getLetter(id), shareUrl: `${appOrigin()}/l/${result.shareToken}` };
}
export async function unpublish(id: string, input: unknown) {
  idSchema.parse(id);
  const { expectedVersion } = versionBodySchema.parse(input);
  const { user } = await requireCreator();
  await mutationLimit(user.id);
  await rpc('sl_unpublish', { a: user.id, lid: id, expected: expectedVersion });
  return getLetter(id);
}
export async function shareLetter(id: string) {
  idSchema.parse(id);
  const { user } = await requireCreator();
  const shareToken = await rpc<string>('sl_share', { a: user.id, lid: id });
  return { shareUrl: `${appOrigin()}/l/${shareToken}` };
}
