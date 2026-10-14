// Additive synthetic Auth fixtures only. Never overwrite .env.local or send emails.
import { createClient } from '@supabase/supabase-js';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
if (process.env.SECRETLOVE_TEST_PROJECT !== 'isolated') {
  console.error('This runner requires an explicitly confirmed isolated project.');
  process.exit(1);
}
// Server-controlled loopback-only test namespace; no client header or raised limits.
// Prevents repeated synthetic runs sharing real fixed-window IP counters.
process.env.SECRETLOVE_TEST_RATE_NAMESPACE = randomUUID();
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const fixtures = [];
try {
  // Dedicated gift creator keeps the full suite within the real upload budget.
  // Never raise limits or clear rate counters to make a test pass.
  for (const name of ['A', 'B', 'GIFT']) {
    const email = `secretlove-test-${randomUUID()}@example.com`,
      password = randomBytes(32).toString('base64url');
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { secretlove_fixture: true },
    });
    if (error || !data.user) throw new Error();
    process.env[`TEST_CREATOR_${name}_EMAIL`] = email;
    process.env[`TEST_CREATOR_${name}_PASSWORD`] = password;
    process.env[`TEST_CREATOR_${name}_ID`] = data.user.id;
    fixtures.push({ id: data.user.id, purpose: 'Isolated browser integration fixture' });
  }
  // No passwords, tokens, keys or email addresses are written. User IDs aid later operator cleanup.
  let existing = [];
  try {
    existing = JSON.parse(await readFile('.test-fixtures.json', 'utf8'));
  } catch {
    /* First isolated run. */
  }
  // Include earlier marked fixtures; Playwright clears its own output directory at startup.
  const previous = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const user of previous.data?.users ?? [])
    if (
      user.user_metadata?.secretlove_fixture === true &&
      !existing.some((item) => item.id === user.id) &&
      !fixtures.some((item) => item.id === user.id)
    )
      existing.push({ id: user.id, purpose: 'Day 1 isolated integration fixture' });
  await writeFile('.test-fixtures.json', JSON.stringify([...existing, ...fixtures], null, 2));
  console.log(
    'Three synthetic confirmed Auth fixtures created; credentials remain in process memory. Email delivery is not tested by these fixtures.',
  );
  const child = spawn(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
    {
      env: process.env,
      stdio: 'inherit',
    },
  );
  const code = await new Promise((resolve) => child.on('exit', resolve));
  process.exitCode = typeof code === 'number' ? code : 1;
  console.log(
    'Synthetic account IDs are recorded in ignored .test-fixtures.json for operator-assisted cleanup. No existing accounts were changed.',
  );
} catch {
  console.error('Isolated fixture setup failed. No provider details or credentials were printed.');
  process.exitCode = 1;
}
