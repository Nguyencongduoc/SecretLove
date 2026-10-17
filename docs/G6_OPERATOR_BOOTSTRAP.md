# G6 — Exact first-operator bootstrap review

Date: 2026-10-17. **PASS — OPERATOR-REPORTED EXECUTION AND VERIFICATION.** After approving the exact transaction once, the owner reported no SQL error and supplied counts: operators_total=1, target_active_operators=1, target_bootstrap_audits=1, target_creator_rows=0. These match the expected 1/1/1/0. This is operator SQL Editor evidence, not an independent agent query. Do not rerun the write transaction. No remote SQL has been executed by the agent.

## Exact identity and scope

- Production project: `secretlove-production` / `mdoaageegovutlxhhicz`.
- Auth UID: `3f043619-e816-49b9-ab42-e4919ef5e3d4`.
- Account: `nguyencongduociot2124@gmail.com`.
- Email confirmation: **operator reports confirmed**, not independently queried. SQL below checks it again before writing.
- Intended writes: exactly one active `private.operator_accounts` row and one `private.operator_audit` row with action `bootstrap`, actor/subject/resource set to this UID, fresh request UUID and default timestamps/retention from migration 009.
- No Creator approval, Auth user/password change, MFA enrollment, letter/media/fixture write, cleanup, grant/RLS change or deployment. Migrations 001–009 and historical backend remain unchanged.

## Prerequisites and STOP conditions

The exact execution approval has been received. An operator with Supabase SQL Editor administrative privileges must confirm the Dashboard project reference in the address bar is **`mdoaageegovutlxhhicz`**, and then use the complete transaction below once. Do not use historical `samelfoyrujhcywcnofw`. The transaction cannot independently establish the Supabase project reference from ordinary PostgreSQL database identity; the Dashboard project check is mandatory. Do not obtain/export credentials to run it through a script.

Expected first-operator state: operator registry empty, no prior bootstrap audit, no Creator approval row for the target. Missing schema/permissions, identity/email mismatch, unconfirmed email, unexpected state or lock/statement timeout means stop and inspect read-only evidence. No `ON CONFLICT`, overwrite or automatic retry. The registry lock serializes cooperating bootstrap attempts and blocks concurrent registry changes during the short transaction. Table locks last only for this transaction, with bounded wait/time limits.

## Transaction — execution reported without error; do not rerun

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '15s';
set local search_path = '';

lock table private.operator_accounts in exclusive mode;

do $bootstrap$
declare
  target_uid constant uuid := '3f043619-e816-49b9-ab42-e4919ef5e3d4';
  verified_uid uuid;
begin
  select u.id into verified_uid
  from auth.users as u
  where u.id = target_uid
    and pg_catalog.lower(u.email) = 'nguyencongduociot2124@gmail.com'
    and u.email_confirmed_at is not null
  for share;

  if verified_uid is null then
    raise exception 'BOOTSTRAP_CONFIRMED_IDENTITY_MISMATCH';
  end if;
  if exists (select 1 from private.operator_accounts) then
    raise exception 'BOOTSTRAP_OPERATOR_REGISTRY_NOT_EMPTY';
  end if;
  if exists (select 1 from private.operator_audit where action = 'bootstrap') then
    raise exception 'BOOTSTRAP_ALREADY_RECORDED';
  end if;
  if exists (select 1 from private.creator_access where user_id = target_uid) then
    raise exception 'BOOTSTRAP_UNEXPECTED_CREATOR_ACCESS';
  end if;

  insert into private.operator_accounts (user_id, active)
  values (target_uid, true);

  insert into private.operator_audit (
    actor_id, subject_id, resource_id, request_id, action,
    before_status, after_status
  ) values (
    target_uid, target_uid, target_uid, pg_catalog.gen_random_uuid(),
    'bootstrap', 'not_registered', 'active'
  );
end
$bootstrap$;

commit;
```

An error aborts the transaction; neither write should persist. If the SQL Editor connection remains in an aborted transaction, use `ROLLBACK` only to end that failed transaction before read-only diagnosis. Do not remove data, rerun the bootstrap or disable constraints/RLS. If execution times out or the connection is lost and commit status is uncertain, check the counts below before any further action. Successful commit is intentionally not automatically reversible: any later deactivation requires a separately approved exact-UID action and an access/sole-operator review; retain its audit history.

## Read-only verification — after approved execution

```sql
select
  (select count(*) from private.operator_accounts) as operators_total,
  (select count(*) from private.operator_accounts
   where user_id = '3f043619-e816-49b9-ab42-e4919ef5e3d4'::uuid
     and active) as target_active_operators,
  (select count(*) from private.operator_audit
   where action = 'bootstrap'
     and actor_id = '3f043619-e816-49b9-ab42-e4919ef5e3d4'::uuid
     and subject_id = '3f043619-e816-49b9-ab42-e4919ef5e3d4'::uuid
     and resource_id = '3f043619-e816-49b9-ab42-e4919ef5e3d4'::uuid
     and request_id is not null) as target_bootstrap_audits,
  (select count(*) from private.creator_access
   where user_id = '3f043619-e816-49b9-ab42-e4919ef5e3d4'::uuid)
    as target_creator_rows;
```

Expected: **1 / 1 / 1 / 0** in the displayed column order. Report counts/status only; no keys, tokens, passwords or full Auth records.

Actual: **1 / 1 / 1 / 0 — PASS, operator-reported**. One active target operator and one matching bootstrap audit; target Creator rows remain zero. This does not establish MFA/AAL2, approved Creator access or permission to perform other operator actions.

## Evidence and next gate

**PASS — 9 local in-memory PostgreSQL checks**, using installed PGlite and the exact three table definitions extracted from unchanged migration 009: success and verification counts 1/1/1/0; repeat denied; missing identity; mismatched email; unconfirmed email; existing registry; prior bootstrap audit; existing target Creator row; and injected audit failure rolling back operator insertion. Each case used a fresh in-memory database; no remote credentials, Auth accounts, files containing secrets, mail, application server or provider API were used. These checks validate transaction/guard/rollback behavior locally, not hosted permissions, actual identity, lock contention across independent connections or target MFA enforcement. No new dependency or permanent test/application file was added.

Source review: migration 009 registry/audit constraints/defaults and `src/lib/server/identity.ts`. An operator registry row grants eligibility for `/operator/security`; report/moderation actions still require verified AAL2. **Bootstrap PASS is operator-reported; MFA/AAL2 remains NOT TESTED and separately gated.** Creator approval remains separate. No direct agent remote execution or independent provider query occurred. No public opening follows from bootstrap success.
