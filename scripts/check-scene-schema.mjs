import { createClient } from '@supabase/supabase-js';
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  options,
);
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  options,
);
let failed = false;
for (const [label, client, table, expected] of [
  ['Owner scene-text view', service, 'creator_letters', null],
  ['Scene-text column', service, 'letters', null],
  ['Anonymous scene-text denial', anon, 'letters', '42501'],
]) {
  const { error } = await client.from(table).select('scene_text').limit(0);
  const ok = (error?.code ?? null) === expected;
  console.log(`${label}: ${ok ? 'PASS' : 'NOT READY'}`);
  if (!ok) failed = true;
}
process.exitCode = failed ? 1 : 0;
