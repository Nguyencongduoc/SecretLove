# Internal privacy, abuse and retention planning draft

Current G6 status (2026-10-17): **draft, not final or legally/operationally certified**. A draft disclosure is implemented on the protected deployed `/privacy` page; it is not a final public policy. Contact `nguyencongduociot2124@gmail.com` is operator-controlled/verified, canonical Production/new backend are established, and report/role/hold/audit/retention code exists through009. Earlier planning/“not implemented” statements below describe historical proposals, not current code. Actual worker/provider retention/backup capabilities still need evidence. No public opening or historical cleanup authorized by this update. See [G6 operations review](G6_OPERATIONS_READINESS.md).

Owner decision in G6: **application/security logs have a maximum30-day retention target; shorter Free/Hobby history is acceptable**. This removes any implied minimum30-day searchable-history requirement or need to buy extended logging. Accessible history is not proof of provider-internal physical deletion; actual log categories/drains/exports/retention and provider policy remain to be verified. Current runtime wording is still draft; any final wording change follows a separate reviewed source/deployment gate. No final privacy-policy publication or compliance claim.

## Operator and request workflow

Project Owner/Administrator is the sole operator for reports, suspension/reinstatement and deletion requests. No additional moderator is authorized. Future operator access must be restricted, authenticated strongly and audited; a service key is not a public admin login.

Proposed flow: receive a bounded request through a reviewed intake/contact channel; issue a generic request ID without exposing letter/creator identity; rate-limit and validate; assess urgency/abuse; verify requester entitlement before disclosing data or approving account deletion; resolve against server-owned letter/publication IDs; record operator/reason/action/time/outcome; notify only through an explicitly authorized verified channel; close and start retention timer. No automatic messaging is implemented. Store minimal report facts/reason, not the entire private letter/photos/DOB/passphrase by default. Operator private evidence access must be justified and logged; no private content in audit logs.

Selected rejection approach: **report-led suspension after operator review**. Close immediately revokes the current reading session but is not a persistent block. A report alone must not automatically unpublish/delete a creator's content. Proposed suspension should deny new content/media/sessions, revoke current application access and prevent casual republish bypass; review whether the hold binds to a publication or the whole letter before implementing DB/admin behavior. Reinstatement needs a recorded owner decision and fresh link/session semantics. Anonymous name/DOB readers cannot reliably support person-wide/creator-wide blocking across devices; stronger identity is deferred.

## Proposed retention targets

| Data | Owner-proposed target | Actual verification / release gate |
| --- | --- | --- |
| Active letters/private media | Until creator deletes letter or account closes, subject to applicable obligations | Implemented letter deletion; account workflow/operational proof pending |
| Abuse reports | 90 days after resolution, unless documented investigation/retention requirement | Report system/hold authority/automatic pruning not implemented; clock must start at resolution |
| App/security logs | Maximum30days; shorter plan history accepted by owner, excluding secrets/private letter contents from application logging | Actual plan/window/drains/provider-internal retention NOT VERIFIED; no requirement to purchase30-day history |
| Backups | Target maximum 30 days, subject to real provider capabilities | Confirm project plan/PITR/backup schedule/off-site exports, deletion expiry and support policy. Target NOT VERIFIED; unsupported target is a blocker |
| Deleted active data | Revoke application access promptly; physical deletion through authenticated durable queue | No deadline promise until worker/provider/outage/cron verified; in-flight/delivered copies cannot be recalled |
| Raw staged MP3 chunks | Short-lived pending transfer; expire after 15 minutes, queue/orphan reconciliation | Logical expiry is not physical erasure; confirm v3 worker delivery and backlog/outage handling |
| Preview synthetic data | Approved, verified cleanup after testing | No blanket approval for 100 accounts; precise manifest and separate approval required |

Active-data deletion and backup deletion are different events. Application delete does not selectively erase an old provider backup, platform access log, forwarded email, or recipient-saved copy. Retention targets are not legal obligations or proof of permission to retain data. Document any justified hold, authorized approver, review/expiry and narrow access; do not invent jurisdiction-specific rules.

## Capability verification before final policy

Operator must record actual Supabase/Vercel plan, region, backup/PITR/log retention and export/drain settings; compare them with the targets above; confirm account/Storage byte deletion and cleanup monitoring; verify incidental URL/referrer/platform logs and retention access. Provider documentation describes available capabilities, not this project's enabled configuration. If <=30-day backup or 30-day log retention cannot be enforced, record a blocker and obtain a revised target/provider decision instead of publishing an unsupported promise. See [Supabase backups](https://supabase.com/docs/guides/platform/backups) and [Vercel runtime logs](https://vercel.com/docs/observability/runtime-logs).

Documentation verification performed: Supabase documents plan-dependent daily database-backup windows and separate PITR settings; database backups contain Storage metadata, **not uploaded Storage objects**. Inventory any independent media backup/export separately. Vercel documents runtime-log retention of one hour on Hobby, one day on Pro, three days on Enterprise, or thirty days with applicable Observability Plus. A base plan cannot be assumed to provide the proposed thirty-day log history. These provider capabilities do not verify this project's plan, administrative/support retention, external drains, exports or erasure guarantees. Actual configuration verification remains NOT TESTED and a release gate. The owner must clarify whether thirty days is a required history window, an upper bound, or both before selecting paid logging/export settings; no spending or policy revision is authorized here.

## Minimal implementation sequence — separate approval required

1. Provide/verify real contact channel and review policy wording, collection/purpose/permission disclosures, providers/regions and retention matrix.
2. Implement bounded generic report intake and private operator queue with rate/Origin controls; no unauthenticated destructive suspension powers.
3. Approve publication-versus-letter suspension semantics and add the next unused reviewed migration/admin workflow with auditable actions, revocation tests and safe reinstatement.
4. Add linked reviewed disclosure at signup/editor/unlock. Keep low-assurance and authorized-copying limits clear. A checkbox or music-rights assertion is not proof of legal compliance.
5. Define verified deletion request workflow, account FK/staging/cleanup handling and physical/backup evidence. Test only an expressly approved synthetic account/cohort.
6. Implement report/log retention only after hold and provider policy review; do not activate destructive historical cleanup by a preparation task.

Public release blockers: unverified contact, absent report/suspension/intake/audit controls, unverified/unsupported retention, incomplete provider/cleanup evidence and appropriate policy review. A restricted synthetic-data Preview can be assessed separately, but it must not display this draft as a final privacy policy or imply public readiness.
