import 'server-only';
import { ownerClient } from '@/lib/supabase/server';
import { AppError } from './errors';

export async function requireCreator() {
  const client = await ownerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user || !user.email_confirmed_at)
    throw new AppError(401, 'AUTH_REQUIRED', 'Sign in with a confirmed email to continue.');
  return { client, user };
}
