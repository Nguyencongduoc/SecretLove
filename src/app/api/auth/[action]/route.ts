import { z } from 'zod';
import { ownerClient } from '@/lib/supabase/server';
import { assertOrigin, endpoint, jsonBody, success } from '@/lib/server/http';
import { AppError } from '@/lib/server/errors';
import { appOrigin } from '@/lib/server/env';
import { requireCreator } from '@/lib/server/identity';
import { clearRecovery, requireRecovery } from '@/lib/server/recovery';
export const dynamic = 'force-dynamic';
const email = z.email().max(254);
const password = z.string().min(12, 'Use at least 12 characters.').max(128);
const credentials = z.strictObject({ email, password });
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return endpoint(async () => {
    assertOrigin(request);
    const { action } = await context.params;
    const body = await jsonBody(request, 4096);
    const client = await ownerClient();
    if (action === 'login') {
      const input = z.strictObject({ email, password: z.string().min(1).max(128) }).parse(body);
      const { data, error } = await client.auth.signInWithPassword(input);
      if (error || !data.user?.email_confirmed_at)
        throw new AppError(
          error && (error.status ?? 0) >= 500 ? 503 : 401,
          'SIGN_IN_FAILED',
          'Could not sign in. Check your email, password and confirmation email.',
        );
      return success({ signedIn: true });
    }
    if (action === 'signup') {
      const input = credentials.parse(body);
      const { error } = await client.auth.signUp({
        ...input,
        options: { emailRedirectTo: `${appOrigin()}/auth/callback` },
      });
      if (error)
        throw new AppError(
          503,
          'SIGN_UP_FAILED',
          'Registration could not finish. Please try again or contact the project owner.',
        );
      return success({
        message:
          'If registration is available for this address, check your email to confirm your account.',
      });
    }
    if (action === 'recover') {
      const input = z.strictObject({ email }).parse(body);
      const { error } = await client.auth.resetPasswordForEmail(input.email, {
        redirectTo: `${appOrigin()}/auth/callback?next=/reset-password`,
      });
      if (error)
        throw new AppError(
          503,
          'RECOVERY_FAILED',
          'A recovery email could not be requested. Please try again.',
        );
      return success({
        message: 'If this address has an account, a password recovery email is on its way.',
      });
    }
    if (action === 'reset') {
      const input = z.strictObject({ password }).parse(body);
      const { user } = await requireCreator();
      const { data } = await client.auth.getSession();
      if (!data.session)
        throw new AppError(401, 'RECOVERY_REQUIRED', 'Open a fresh recovery link.');
      // getUser above verifies the same cookie-backed token; raw session is used only to bind the proof.
      await requireRecovery(user.id, data.session.access_token);
      const { error } = await client.auth.updateUser({ password: input.password });
      if (error)
        throw new AppError(
          503,
          'RESET_FAILED',
          'Your password could not be updated. Please try again.',
        );
      await clearRecovery();
      return success({ updated: true });
    }
    if (action === 'logout') {
      z.strictObject({}).parse(body);
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error)
        throw new AppError(503, 'SIGN_OUT_FAILED', 'Could not sign out. Please try again.');
      await clearRecovery();
      return success({ signedOut: true });
    }
    throw new AppError(404, 'NOT_FOUND', 'This endpoint does not exist.');
  });
}
