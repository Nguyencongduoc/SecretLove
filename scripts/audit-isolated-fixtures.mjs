// Read-only counts for trusted local fixture IDs intersected with synthetic Auth markers.
// No email, password, token, letter content or object path is emitted.
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
if (process.env.SECRETLOVE_TEST_PROJECT !== 'isolated') process.exit(1);
try {
  const tracked = JSON.parse(await readFile('.test-fixtures.json', 'utf8'));
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const ids = [];
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error();
    for (const user of data.users)
      if (
        tracked.some((item) => item.id === user.id) &&
        user.user_metadata?.secretlove_fixture === true &&
        /^secretlove-test-[0-9a-f-]{36}@example\.com$/.test(user.email ?? '')
      )
        ids.push(user.id);
    if (data.users.length < 1000) break;
  }
  if (!ids.length) throw new Error();
  const active = await client
    .from('letters')
    .select('id', { head: true, count: 'exact' })
    .in('owner_id', ids)
    .is('deleted_at', null);
  const deleted = await client
    .from('letters')
    .select('id', { head: true, count: 'exact' })
    .in('owner_id', ids)
    .not('deleted_at', 'is', null);
  if (active.error || deleted.error) throw new Error();
  console.log(
    JSON.stringify({
      trackedAccounts: tracked.length,
      verifiedSyntheticAccounts: ids.length,
      activeSyntheticLetters: active.count,
      syntheticTombstones: deleted.count,
    }),
  );
} catch {
  console.error('Read-only isolated fixture inventory failed; details withheld.');
  process.exitCode = 1;
}
