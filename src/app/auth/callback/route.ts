import { NextResponse } from 'next/server';
import { ownerClient } from '@/lib/supabase/server';
import { appOrigin } from '@/lib/server/env';
import { issueRecovery } from '@/lib/server/recovery';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const origin = appOrigin();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const client = await ownerClient();
  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.user && data.session) {
      // A code callback alone cannot prove a recovery purpose. Recovery uses the token-hash template below.
      return NextResponse.redirect(`${origin}/studio`);
    }
  }
  const token = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (token && ['email', 'signup', 'recovery'].includes(type ?? '')) {
    const { data, error } = await client.auth.verifyOtp({
      token_hash: token,
      type: type as 'email' | 'signup' | 'recovery',
    });
    if (!error && data.user && data.session) {
      if (type === 'recovery') {
        await issueRecovery(data.user.id, data.session.access_token);
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}/studio`);
    }
  }
  return NextResponse.redirect(`${origin}/login?notice=confirmation_failed`);
}
