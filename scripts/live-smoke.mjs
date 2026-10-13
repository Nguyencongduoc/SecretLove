// Read-only isolation check. Configure two confirmed synthetic users in the isolated test project.
import { createClient } from '@supabase/supabase-js';
if (process.env.SECRETLOVE_TEST_PROJECT !== 'isolated') {
  console.error('Set SECRETLOVE_TEST_PROJECT=isolated before running live checks.');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
function client() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
try {
  const a = client(),
    b = client();
  const signedA = await a.auth.signInWithPassword({
    email: process.env.TEST_CREATOR_A_EMAIL ?? '',
    password: process.env.TEST_CREATOR_A_PASSWORD ?? '',
  });
  const signedB = await b.auth.signInWithPassword({
    email: process.env.TEST_CREATOR_B_EMAIL ?? '',
    password: process.env.TEST_CREATOR_B_PASSWORD ?? '',
  });
  if (
    signedA.error ||
    signedB.error ||
    !signedA.data.user?.email_confirmed_at ||
    !signedB.data.user?.email_confirmed_at ||
    signedA.data.user.id === signedB.data.user.id
  )
    throw new Error();
  const own = await a.from('creator_letters').select('id').limit(1);
  if (own.error || !own.data?.length) {
    console.log('Create a synthetic letter as Creator A in Studio, then rerun.');
    process.exitCode = 1;
  } else {
    const foreign = await b.from('creator_letters').select('id').eq('id', own.data[0].id);
    const anon = await client().from('creator_letters').select('id').eq('id', own.data[0].id);
    const directWrite = await b.rpc('sl_save_letter', {
      a: signedA.data.user.id,
      lid: own.data[0].id,
      expected: '1',
      changes: { title: 'Forbidden' },
    });
    const media = await b.storage.from('letter-media').list();
    if (
      foreign.error ||
      foreign.data.length ||
      !anon.error ||
      !directWrite.error ||
      (!media.error && media.data.length)
    )
      throw new Error();
    console.log(
      'Live owner read, cross-creator isolation, anonymous denial, browser RPC denial and media listing checks passed.',
    );
  }
  await a.auth.signOut({ scope: 'local' });
  await b.auth.signOut({ scope: 'local' });
} catch {
  console.error(
    'Live checks failed or confirmed test credentials are missing. No provider details or credentials were logged.',
  );
  process.exitCode = 1;
}
