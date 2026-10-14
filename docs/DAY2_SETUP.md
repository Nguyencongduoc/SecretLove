# Day 2 database setup

Apply only to the isolated Supabase test project already used for Day 1. Keep `.env.local` unchanged. The initial migration must already be applied.

1. Open Supabase Dashboard → your isolated project → SQL Editor → New query.
2. Open `supabase/migrations/202610140002_recipient_experience.sql` locally and copy its entire contents, including `begin` and `commit`.
3. Paste and run once. This migration creates service-only functions over existing tables. It does not drop/truncate/reset tables or delete data, change Day 1 RLS, add public Storage access, or seed accounts. Runtime unpublish/close functions revoke access only when explicitly called by the authorized application.
4. Run the read-only checks below. All public gateways must have `anon_execute=false`, `creator_execute=false`, `server_execute=true`. Both owner tables must retain RLS. The photo bucket must remain private.

```sql
select p.proname,
  has_function_privilege('anon',p.oid,'execute') as anon_execute,
  has_function_privilege('authenticated',p.oid,'execute') as creator_execute,
  has_function_privilege('service_role',p.oid,'execute') as server_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'sl_publish','sl_unpublish','sl_share','sl_bootstrap','sl_verification_gate',
  'sl_verification_limits','sl_session_issue','sl_recipient_content',
  'sl_recipient_photo','sl_session_close'
) order by p.proname;

select relname,relrowsecurity from pg_class
where oid in ('public.letters'::regclass,'public.letter_photos'::regclass);
select id,public from storage.buckets where id='letter-media';
```

Expected: 10 gateway rows with only server execution; both `relrowsecurity=true`; `letter-media.public=false`. These queries display no content, credentials, gate records, or session tokens.

If a statement fails, the transaction is not committed: preserve the error message without including secrets and investigate before rerunning. Do not replay migration 001 or reset the database. After success, confirm the migration/verification result so real-backend tests can proceed.

The Day 2 recipient renderer derives versioned legacy settings in memory. Stored customization, audio uploads and private background asset migrations remain future work. Audio is disabled; no audio request is made. Deployment is not part of this local milestone.

For repeatable local live tests, run the existing `scripts/isolated-browser.mjs` with `SECRETLOVE_TEST_PROJECT=isolated` in its process environment. It creates synthetic accounts, keeps credentials in memory and assigns a random server-only test rate namespace for the loopback server. Do not save this namespace in `.env.local` or production settings. Limits remain enforced; ordinary local runs share the conservative anonymous bucket and repeated verifications may legitimately return 429 until the fixed window ends. Do not clear counters or raise limits to make tests pass.
