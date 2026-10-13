import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicConfig } from '@/lib/server/env';

export async function ownerClient() {
  const store = await cookies();
  const { url, key } = publicConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (entries) => {
        try {
          entries.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Server Components cannot write; proxy handles refresh. */
        }
      },
    },
  });
}
