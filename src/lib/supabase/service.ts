import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicConfig, secret } from '@/lib/server/env';

export function serviceClient(signal?: AbortSignal) {
  // Intentionally no request headers/cookie adapter on this privileged client.
  return createClient(publicConfig().url, secret('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(signal
      ? {
          global: {
            fetch: (input: RequestInfo | URL, init?: RequestInit) =>
              fetch(input, {
                ...init,
                cache: 'no-store',
                signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
              }),
          },
        }
      : {}),
  });
}
