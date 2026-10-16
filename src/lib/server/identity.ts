import 'server-only';
import { ownerClient } from '@/lib/supabase/server';
import { AppError } from './errors';
import { rpc } from './rpc';

export async function requireAuthenticatedUser() {
  const client = await ownerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error && (error.status ?? 0) >= 500)
    throw new AppError(
      503,
      'TEMPORARILY_UNAVAILABLE',
      'Authentication is temporarily unavailable.',
    );
  if (error || !user || !user.email_confirmed_at)
    throw new AppError(401, 'AUTH_REQUIRED', 'Sign in with a confirmed email to continue.');
  return { client, user };
}

export type CreatorAccess = { status: 'approved' | 'suspended' | 'not_approved'; version: string };
export async function requireCreator() {
  const identity = await requireAuthenticatedUser();
  const access = await rpc<CreatorAccess>('sl_creator_status', { a: identity.user.id });
  if (access?.status !== 'approved')
    throw new AppError(403, 'CREATOR_NOT_APPROVED', 'Creator access requires operator approval.');
  return identity;
}

export async function requireOperator(requireMfa = true) {
  const identity = await requireAuthenticatedUser();
  if (!(await rpc<boolean>('sl_operator_status', { a: identity.user.id })))
    throw new AppError(403, 'OPERATOR_REQUIRED', 'Operator access is required.');
  const { data, error } = await identity.client.auth.getClaims();
  if (error && (error.status ?? 0) >= 500)
    throw new AppError(
      503,
      'TEMPORARILY_UNAVAILABLE',
      'Authentication is temporarily unavailable.',
    );
  if (error || !data?.claims || data.claims.sub !== identity.user.id)
    throw new AppError(401, 'AUTH_REQUIRED', 'Sign in again to continue.');
  if (requireMfa && data.claims.aal !== 'aal2')
    throw new AppError(403, 'MFA_REQUIRED', 'Complete operator two-factor verification.');
  return identity;
}
