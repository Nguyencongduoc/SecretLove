import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || new URL(url).protocol !== 'https:') {
  console.error('Public Supabase configuration is missing or invalid.');
  process.exit(1);
}
const origin = process.env.APP_ORIGIN;
try {
  const parsed = new URL(origin);
  if (
    parsed.origin !== origin ||
    (parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))
  )
    throw new Error();
} catch {
  console.error('APP_ORIGIN must be an exact HTTPS origin, or loopback HTTP for local testing.');
  process.exit(1);
}
for (const name of ['VERIFICATION_HMAC_KEY', 'RATE_LIMIT_HMAC_KEY', 'CRON_SECRET']) {
  const value = process.env[name];
  if (
    !value ||
    Buffer.from(value, 'base64').length < 32 ||
    Buffer.from(value, 'base64').toString('base64') !== value
  ) {
    console.error(`${name} must contain at least 32 random bytes encoded as base64.`);
    process.exit(1);
  }
}
console.log('Local origin and security settings pass format validation (values withheld).');
const headers = { apikey: key };
try {
  const auth = await fetch(`${url}/auth/v1/settings`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!auth.ok) throw new Error('Auth settings unavailable');
  console.log('Supabase Auth endpoint accepts the configured public key.');
  const settings = await auth.json();
  if (settings.mailer_autoconfirm === true || settings.email_autoconfirm === true) {
    console.log('Enable email confirmation in Supabase before accepting Studio registration.');
    process.exitCode = 1;
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonymous = await client.from('creator_letters').select('id').limit(1);
  if (!anonymous.error || anonymous.error.code !== '42501') {
    console.log(
      `Schema/grants need verification: expected anonymous SELECT permission denial (code: ${anonymous.error?.code ?? 'none'}).`,
    );
    process.exitCode = 1;
  } else console.log('Anonymous creator data access is denied.');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Server key is missing; privileged database checks are pending.');
    process.exitCode = 1;
  } else {
    const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await service.from('creator_letters').select('id').limit(0);
    if (result.error) {
      console.log(
        `Server schema query failed (code: ${result.error.code}); apply the migration and verify the server key.`,
      );
      process.exitCode = 1;
    } else console.log('Server database query succeeded (no letter content retrieved).');
  }
} catch {
  console.error(
    'Supabase connectivity check failed. Check network access and project configuration.',
  );
  process.exitCode = 1;
}
