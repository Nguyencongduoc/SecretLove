import { createClient } from '@supabase/supabase-js';
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
let failed = false;
for (const [label, client, table, columns, expected] of [
  ['Music schema', service, 'creator_letters', 'presentation_config', null],
  ['Audio metadata schema', service, 'letter_assets', 'id', null],
  ['Anonymous metadata denial', anon, 'letter_assets', 'id', '42501'],
]) {
  const { error } = await client.from(table).select(columns).limit(0);
  const pass = (error?.code ?? null) === expected;
  console.log(`${label}: ${pass ? 'PASS' : 'NOT READY'}`);
  if (!pass) failed = true;
}
const { data: bucket, error } = await service.storage.getBucket('letter-assets');
const privateBucket =
  !error &&
  bucket.public === false &&
  Number(bucket.file_size_limit) === 16777216 &&
  JSON.stringify(bucket.allowed_mime_types) === JSON.stringify(['audio/mpeg']);
console.log(`Private audio bucket: ${privateBucket ? 'PASS' : 'NOT READY'}`);
if (!privateBucket) failed = true;
process.exitCode = failed ? 1 : 0;
