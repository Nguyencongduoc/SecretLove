# G4 packet — preparation only, not execution permission

Before G4, present `git switch -c codex/g4-production-configuration` and verify the owner switched and approved that phase. G3 produced source and local tests only. Do not run this packet automatically.

## Required operator inputs

1. Approve creating a **new empty Production Supabase** in the chosen region, separate from `samelfoyrujhcywcnofw`. Provide public project reference/URL only; keep keys in hosting settings. No transfer of historical synthetic data.
2. Provide and verify the real privacy/report/deletion contact, approved inboxes and owner Auth identity. Review final policy, provider logs/backups/retention limits, SMTP budget, rate/abuse controls and monitoring ownership. Draft targets are not operational guarantees.
3. Approve exact backend, project, resource/action and read-only verification scope before any remote write. Existing Vercel project remains `secretlove-preview`, Production canonical intent `https://secretlove-preview.vercel.app`, `sin1`; no authority to deploy or open access follows from this document.

## Manual backend sequence, after explicit approval

1. Confirm the new project's empty inventory. Review and apply **001–009 in order**, once each, using the SQL Editor. Never edit applied migrations, disable RLS, seed approvals broadly or apply 009 to the old isolated test project. If a transaction fails, stop and inspect status rather than replaying partial history blindly.
2. Run read-only catalog checks below and retain status-only evidence. Registry/approval rows should initially be empty. Private Storage must remain private with browser access denied.
3. Set Auth new-user signup OFF, email confirmation ON, unused anonymous/social providers OFF. Configure exact Site URL and callback allowlist; do not use wildcard origins. Review direct provider password-change/reauthentication and token lifetime separately: application recovery proof does not restrict every provider API.
4. Configure SMTP privately and review invite/recovery token-hash templates: invitation `type=invite`, recovery `type=recovery`, exact `/auth/callback`; allow only individually approved inbox tests. No automatic mail from this packet. Invitation is followed by a **fresh** recovery email to set password; neither action grants approval.
5. Separately authorize one Owner invitation/account and obtain its confirmed Auth UUID privately. Before bootstrap, present exact UUID and SQL for review. A one-time DB-admin transaction must verify that confirmed Auth user, insert **only that UUID** into `private.operator_accounts`, and insert an `operator_audit` row (`bootstrap`, actor/subject UUID, fresh request UUID, timestamp). No role-grant RPC or app self-bootstrap exists. Do not invent/bootstrap a UUID in G3.
6. Owner signs in, opens `/operator/security`, enrolls TOTP and verifies AAL2. Reports/actions must deny AAL1 and nonoperator sessions. Operator-only identity does not grant Creator rights. Approve only each confirmed Creator UUID using expected access revision `0` for a missing row. No blanket approval/import.

```sql
-- Read-only, safe metadata; run ONLY on the separately approved new backend.
select n.nspname, c.relname, c.relrowsecurity
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and (n.nspname='private' or
 (n.nspname='public' and c.relname in ('letters','letter_photos','letter_assets')))
order by 1,2;
select count(*) as operators from private.operator_accounts;
select count(*) as creator_approvals from private.creator_access;
select id,public,file_size_limit from storage.buckets
where id in ('letter-media','letter-assets','letter-audio-staging');
select n.nspname,p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as user_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') as server_execute
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' or (n.nspname='public' and p.proname like 'sl\_%' escape '\')
order by 1,2;
```

Expected: all app tables RLS ON; browser cannot use private schema/tables; anon cannot execute gateways. Only `sl_creator_is_active()` is authenticated-executable and SECURITY DEFINER, zero arguments and empty search path; other gateways service-only/security-invoker. The security-invoker view preserves underlying owner/approval RLS. Missing 009 must fail closed, not fallback to old access behavior.

## Hosting variables and source binding

After the actual new project reference is reviewed, update only its public identifier in `config/public-deployment.json` under a reviewed source change; validate again and freeze later in G5. Current null intentionally blocks public deployment. Keep Vercel Authentication **All Deployments**, Owner-only through G6; G7 public opening requires separate approval. Cron stays off, Git auto-deployment off. Do not redeploy the old failed artifact.

Production-scoped entries (12): `APP_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_REF`, `MAX_AUDIO_UPLOAD_BYTES`, `ENABLE_EXPERIMENTAL_COREPACK`, `SECRETLOVE_DEPLOYMENT_MODE`, `PRIVACY_CONTACT_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`, `VERIFICATION_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY`, `CRON_SECRET`. Last four are independent new Production-only Sensitive settings. Mode is `public-private-gate`, Corepack is `1`, audio cap at most `16777216`; exact URL/reference/origin must match approved binding. No Preview-reference fallback. Provider Vercel system variables must be authentic, not manually spoofed. Never pull/export/print settings or reuse local/test secrets.

## Scoped operational/deletion acceptance

- Approve new-backend fixtures/mail actions by exact manifest before creation. No old synthetic user deletion or global cleanup against the historical project.
- Receive request via verified contact; record bounded case reference, verify entitlement, review holds and obtain exact deletion scope. Operator deletion requires UUID/version/case/reason; it revokes and queues, not physical completion. Suspended owners need not be reapproved for scoped operator deletion.
- Schedule/invoke the authenticated worker only after project, manifest and operational permission. Verify leases, stale/late uploads, orphan sweeps, actual absence of bytes and tombstone/FK dependencies. Zero jobs alone is insufficient. Auth deletion is a separate last, manually approved action; sole-operator deletion requires handover.
- Open reports expire at 90 days from creation; resolved reports at 90 days from resolution. Audit deadlines extend to linked resolution when later. Bounded worker pruning processes at most 100 reports + 100 audit rows per call. Before a deadline, operator reviews unresolved cases. Any finite hold extension requires separately reviewed exact IDs, approver, reason/case, review date and an audit record in the same transaction; no broad retention SQL or infinite hold. Provider backups are separate.
- True multi-connection verify/hold, publish/hold, finalize/suspend and delete/hold races, real SMTP/MFA/signup denial, isolated RLS and scoped worker behavior require evidence. Local PGlite command queuing is not a deadlock test.

Stop on missing binding/contact/operator authority, incorrect project/Origin/protection, unexpected grants, public buckets, unverified provider capability, failed actual modern Storage or failed revocation. G5 source freeze, G6 single protected deployment/HTTPS acceptance and G7 public opening remain separate gates.
