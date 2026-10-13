# Day 1 local setup

Day 1 is Creator Studio only. All application requests use Supabase; no mock persistence exists. The migration is additive, intended for a fresh isolated project, and must be applied once. No database reset or destructive migration is needed.

## 1. Complete the existing environment file

Keep your existing `.env.local` URL and publishable key. **Do not copy over the file.** Add these missing settings:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=your-server-secret-key
APP_ORIGIN=http://localhost:3000
VERIFICATION_HMAC_KEY=your-first-generated-value
RATE_LIMIT_HMAC_KEY=your-second-generated-value
CRON_SECRET=your-third-generated-value
```

In Supabase open **Settings → API Keys** and copy a server **secret key** (`sb_secret_…`) into `SUPABASE_SERVICE_ROLE_KEY`. A legacy `service_role` key is also accepted. Never use the publishable key in this setting, prefix it with `NEXT_PUBLIC_`, commit it, or paste it into chat. These keys bypass RLS and are used only in server-only modules. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Generate each of the three local secrets independently, running this command three times and saving each output only in your local environment file:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Keep HMAC keys stable; changing them requires reconfiguring saved verification details. Use an exact origin without a trailing slash. Deployed environments require HTTPS; HTTP is accepted only on loopback for local production-build testing. No environment values are printed by the configuration checker.

## 2. Apply the migration manually

1. Open the **isolated Supabase project** in its dashboard.
2. Open **SQL Editor → New query**.
3. Open `supabase/migrations/202610140001_creator_studio.sql` locally and copy the **entire file**, including `begin;` and `commit;`, into the editor.
4. Run it once using the project's database owner role (`postgres`). It creates the tables, indexes, restricted functions, owner SELECT policies, and private `letter-media` bucket. It does not drop or truncate existing tables or seed accounts.
5. Expect a successful transaction. If there is an error, stop and report its message; do not remove permission checks, rerun individual statements, or reset the database. A pre-existing incompatible bucket is deliberately rejected rather than altered.
6. Run the read-only verification SQL below in a new query. Save this query separately from the migration.

```sql
select tablename, rowsecurity
from pg_tables
where (schemaname = 'public' and tablename in ('letters', 'letter_photos'))
   or schemaname = 'private';

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'letter-media';

select has_table_privilege('authenticated','public.letters','SELECT') as owner_read_granted,
       has_table_privilege('authenticated','public.letters','UPDATE') as browser_update_granted,
       has_function_privilege('authenticated','public.sl_create_letter(uuid,text)','EXECUTE') as browser_rpc_granted,
       has_schema_privilege('authenticated','private','USAGE') as private_schema_granted;
```

All application tables should have `rowsecurity = true`. Bucket: `public = false`, size `3145728`, MIME `{image/webp}`. The last query should return `true, false, false, false`. Keep the `private` schema out of the Data API's exposed schemas. Never make the bucket public. Applying the file in SQL Editor does not register a CLI migration-history entry; before adopting `supabase db push`, reconcile that history rather than replaying this initial migration.

## 3. Configure email authentication

In **Authentication → Providers / Sign In** enable Email and **Confirm email**. In **Authentication → URL Configuration** set Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/reset-password`. Add the exact HTTPS equivalents when deploying.

In **Authentication → Email Templates**, use these links in your templates:

Confirm signup:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

Reset password:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

The recovery callback validates Supabase's recovery token and issues a short-lived server proof bound to that session. A normal login or arbitrary `next` parameter cannot authorize a password reset. Configure **custom SMTP** for email delivery to non-team addresses; the default sender is restricted. Use synthetic test accounts. See [SSR email confirmation](https://supabase.com/docs/guides/auth/server-side/nextjs) and [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## 4. Install, check and run

Node 22 or newer and pnpm 11.25.0:

```powershell
pnpm install --frozen-lockfile
pnpm check:supabase
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Open `http://localhost:3000`. Register, confirm email, log in, create/save/reload/preview a draft, upload a small JPEG/PNG/WebP, change its description, then remove the synthetic photo or letter. The app reports queued physical media cleanup honestly. Password recovery must also be tested using an actual email.

For the live isolation check, create two confirmed synthetic accounts and a letter as Creator A through Studio. Add `SECRETLOVE_TEST_PROJECT=isolated`, `TEST_CREATOR_A_EMAIL`, `TEST_CREATOR_A_PASSWORD`, `TEST_CREATOR_B_EMAIL`, and `TEST_CREATOR_B_PASSWORD` to the ignored environment file, then run `pnpm test:live`. It performs read-only isolation checks and an RPC invocation that must be rejected by grants. It does not create accounts, reset the database, or retrieve letter bodies. Local PGlite tests exercise the real migration SQL with test-only Supabase-owned schema fixtures; they do not certify a deployed Supabase project or cross-instance race behavior.

## 5. Media cleanup

`GET /api/cron/cleanup` requires `Authorization: Bearer <CRON_SECRET>`. It processes bounded leases/retries, stale reservations, and a persistent orphan-scan cursor. Local deletion revokes access immediately; physical cleanup requires invoking this worker. In PowerShell, use the actual secret from your local environment without putting it in source or chat:

```powershell
# Read only the local cron setting into a shell variable; do not echo it.
$taskCron = ((Get-Content .env.local | Where-Object { $_ -match '^CRON_SECRET=' }) -split '=',2)[1]
Invoke-RestMethod -Uri 'http://localhost:3000/api/cron/cleanup' -Headers @{ Authorization = "Bearer $taskCron" }
Remove-Variable taskCron
```

`vercel.json` defines a daily schedule for a future approved deployment. Configure the same server environment variables in Vercel before deploying and monitor failed/missed cleanup runs. Failed requests require a later invocation; automatic cron retries are not assumed. No deployment has been performed.

## Day 1 verification still required on your project

Public endpoint connectivity alone does not prove RLS or Studio persistence. TASKS.md records completed manual migration, live tests and remaining email/release gates. Publishing, QR codes, recipient sessions and animated scenes are later milestones.

For an explicitly isolated project, the agent can run `scripts/isolated-browser.mjs` with `SECRETLOVE_TEST_PROJECT=isolated` set in the command's environment. It creates two synthetic confirmed Auth fixtures, without sending emails, overwriting .env.local or logging/storing passwords. It then runs live desktop/mobile browser checks. Account IDs are recorded in ignored `.test-fixtures.json`; accounts remain for operator-assisted cleanup. Fixture passwords are discarded after the process. This tests real authentication/persistence/access control, but actual registration and recovery email delivery must still be tested manually.

The development linter is pinned to ESLint 9.39.5 because the current Next ESLint plugins declare compatibility through v9; ESLint 10 fails their peer constraints. The v9 package is deprecated, so upgrading the plugin/toolchain combination is a maintenance item. Runtime dependencies are pinned separately and are unaffected.
