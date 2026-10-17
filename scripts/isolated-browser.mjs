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
  let existing = [];
  try {
    existing = JSON.parse(await readFile('.test-fixtures.json', 'utf8'));
  } catch {
    /* First isolated run. */
  }
  const previous = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (previous.error) throw new Error();
  const marked = (previous.data?.users ?? []).filter(
    (user) =>
      user.user_metadata?.secretlove_fixture === true &&
      /^secretlove-test-[0-9a-f-]{36}@example\.com$/.test(user.email ?? '') &&
      existing.some((item) => item.id === user.id),
  );
  const reuse = process.env.SECRETLOVE_REUSE_FIXTURES === '1';
  const active = reuse
    ? await service
        .from('letters')
        .select('owner_id')
        .in(
          'owner_id',
          marked.map((user) => user.id),
        )
        .is('deleted_at', null)
    : { data: [], error: null };
  if (active.error) throw new Error();
  const reusable = marked.filter(
    (user) => !active.data?.some((letter) => letter.owner_id === user.id),
  );
  const offset = Number(process.env.SECRETLOVE_REUSE_FIXTURE_OFFSET ?? '0');
  if (!Number.isSafeInteger(offset) || offset < 0 || (reuse && reusable.length < offset + 3))
    throw new Error();
  // Dedicated gift creator keeps the full suite within the real upload budget.
  // Never raise limits or clear rate counters to make a test pass.
  for (const [index, name] of ['A', 'B', 'GIFT'].entries()) {
    const email = `secretlove-test-${randomUUID()}@example.com`,
      password = randomBytes(32).toString('base64url');
    const { data, error } = reuse
      ? await service.auth.admin.updateUserById(reusable[index + offset].id, { password })
      : await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { secretlove_fixture: true },
        });
    if (error || !data.user) throw new Error();
    process.env[`TEST_CREATOR_${name}_EMAIL`] = data.user.email;
    process.env[`TEST_CREATOR_${name}_PASSWORD`] = password;
    process.env[`TEST_CREATOR_${name}_ID`] = data.user.id;
    if (!reuse)
      fixtures.push({ id: data.user.id, purpose: 'Isolated browser integration fixture' });
  }
  // No passwords, tokens, keys or email addresses are written. User IDs aid later operator cleanup.
  // Include earlier marked fixtures; Playwright clears its own output directory at startup.
  for (const user of previous.data?.users ?? [])
    if (
      user.user_metadata?.secretlove_fixture === true &&
      !existing.some((item) => item.id === user.id) &&
      !fixtures.some((item) => item.id === user.id)
    )
      existing.push({ id: user.id, purpose: 'Day 1 isolated integration fixture' });
  await writeFile('.test-fixtures.json', JSON.stringify([...existing, ...fixtures], null, 2));
  console.log(
    `${reuse ? 'Three tracked, marked synthetic Auth fixtures reused' : 'Three synthetic confirmed Auth fixtures created'}; credentials remain in process memory. Email delivery is not tested by these fixtures.`,
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
    'Synthetic account IDs are recorded in ignored .test-fixtures.json for operator-assisted cleanup. Real accounts were not changed.',
  );
} catch {
  console.error('Isolated fixture setup failed. No provider details or credentials were printed.');
  process.exitCode = 1;
}
