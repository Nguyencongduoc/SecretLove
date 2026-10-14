# Day 3 single-use recovery repair — migration 007

The audit reproduced a second successful reset using copied recovery/session cookies. The prior HMAC proof was correctly bound to user/token/expiry, but cookie clearing alone did not consume it on the server.

Migration `supabase/migrations/202610140007_recovery_single_use.sql` adds a private RLS table and two service-only gateways. Consumption is atomic and occurs before the Supabase Auth password mutation. A consumed proof cannot retry after provider failure; request a fresh recovery link. No existing table/row/media is deleted during migration application. The pruning function removes only expired consumption records when the authenticated cleanup worker runs. Migrations 001–006 are unchanged.

## Manual application in the isolated project

1. Confirm the SQL Editor belongs to your isolated SecretLove test project.
2. Open the migration 007 file locally. Copy **the entire file**, including `begin`/`commit`, into a new SQL Editor query.
3. Run once. Do not rerun after success; do not change applied migrations or reset the database.
4. Run the read-only checks below. All three queries should return `true` for each protection column; the gateway query returns exactly two rows.
5. Confirm success in this chat so the full live regression suite can run against the repaired build. No credentials should be pasted.

```sql
select c.relrowsecurity as rls_enabled,
  not has_table_privilege('anon','private.recovery_consumptions','SELECT,INSERT,UPDATE,DELETE') as anon_denied,
  not has_table_privilege('authenticated','private.recovery_consumptions','SELECT,INSERT,UPDATE,DELETE') as authenticated_denied
from pg_catalog.pg_class c where c.oid='private.recovery_consumptions'::regclass;

select p.proname,
  not has_function_privilege('anon',p.oid,'EXECUTE') as anon_denied,
  not has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_denied,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_allowed,
  not p.prosecdef as invoker_security,
  'search_path=""'=any(p.proconfig) as fixed_search_path
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('sl_recovery_consume','sl_recovery_prune');

select not has_schema_privilege('anon','private','USAGE') as anon_denied,
  not has_schema_privilege('authenticated','private','USAGE') as authenticated_denied;
```

Until 007 is applied, reset and cleanup fail closed with a redacted service error. Restart the development server after updating source. Production is not approved and will not be deployed by this audit.
