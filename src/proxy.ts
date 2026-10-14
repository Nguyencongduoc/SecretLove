import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { randomBytes } from 'node:crypto';

export async function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  let supabaseOrigin = '';
  try {
    supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
  } catch {
    /* Setup errors remain fail-closed in the DAL. */
  }
  const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'self' ${supabaseOrigin}${process.env.NODE_ENV === 'development' ? ' ws: wss:' : ''}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`;
  headers.set('Content-Security-Policy', policy);
  let response = NextResponse.next({ request: { headers } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key && request.nextUrl.pathname.startsWith('/studio')) {
    const client = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (entries) => {
          entries.forEach(({ name, value }) => request.cookies.set(name, value));
          headers.set('cookie', request.headers.get('cookie') ?? '');
          response = NextResponse.next({ request: { headers } });
          entries.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await client.auth.getUser();
  }
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
