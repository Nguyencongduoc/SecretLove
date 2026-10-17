# G8.4 — Incident and recovery tabletop

Date: 2026-10-17, Asia/Bangkok. **TABLETOP ONLY**, performed by walking five hypothetical inputs through the current source/runbook and decision gates. No actual outage, disclosure, report, media deletion, secret rotation, protection change, restore, request or cleanup generated. Responsible operator in every scenario is the existing Project Owner / Administrator; no additional responder or authority appointed.

Evidence reviewed: `src/lib/server/identity.ts`, `recipient.ts`, `audio-response.ts`, `operator.ts`, `reports.ts`, `cleanup.ts`; the cleanup/Operator/media routes; migrations001/003/007/008/009; G7 evidence and G8 runbook/helper sources. Source controls and paper decisions are not proof of a successful live exercise. Earlier conditional containment approval is recorded, but this task permits no execution.

## A — Private content accessible before recipient verification

| Field | Tabletop outcome |
| --- | --- |
| Hypothetical detection signal | An independent unauthenticated request obtains protected body/photo/audio, or protected data appears in locked HTML/RSC/metadata/preloads. A generic public welcome alone is not this incident. |
| Severity / impact | Critical if private bytes are confirmed disclosed; exposure scope/affected letters initially unknown. Stop any claim that the private gate is working on that path. |
| Responsible operator | Project Owner / Administrator; identify the affected project/artifact and maintain a minimal incident reference. Owner availability/platform access is an unresolved dependency. |
| Immediate safe containment | In a real authorized response, restore All Deployments on the exact Vercel project and verify anonymous denial. In this exercise only record that decision. This may not contain direct Supabase Data API/Storage exposure, compromised service credentials or already in-flight delivery. |
| Evidence to preserve | Time/timezone, method/path category, request ID/status, tested authorization state and affected internal reference in a restricted operator record. Preserve the smallest proof; do not repost contents, full share links, cookies, recipient details or secrets. |
| Separately authorized actions | Actual platform containment under applicable gate; scoped letter hold/unpublish/session revocation, access investigation, source fix/freeze/deploy, provider permission changes or credential retirement. No bulk deletion or improvised key rotation. |
| Recovery prerequisites | Identify authorization/cache/preload/provider failure; establish affected scope; review access revocation and current approvals/holds; validate a narrowly corrected artifact and appropriate locked/cross-letter/expiry/media tests. Do not bypass the normal gate to test it. |
| Verification after resolution | No protected bytes in locked responses or shared caches; anonymous/foreign/expired/revoked access denied on content, image and audio GET/HEAD/Range; valid scoped access works. Existing G8 root/API samples alone are insufficient. |
| Reopening criteria | Exact incident-specific approval, negative tests and current artifact/domain/protection inventory accepted; owner records remaining risk. No automatic reopen after a passing homepage check. |
| Limits / dependencies | Platform protection cannot recall downloaded/screenshotted bytes. Name/DOB remains low assurance. Direct-provider exposure may require separate containment; legal notification decisions need proper review. No live containment or private-content probe performed here. |

Decision trace: hypothesized protected response → classify confidentiality incident → plan platform containment plus provider-scope review → stop mutations until exact authority and evidence exist → require incident-specific gate tests before reopening. **PASS for tabletop decision coverage; real incident response NOT TESTED.**

## B — Preview or generated deployment becomes public

| Field | Tabletop outcome |
| --- | --- |
| Hypothetical detection signal | Fresh no-cookie/no-bypass access to a recorded protected Preview/generated URL returns application content instead of expected Vercel SSO. Public canonical alone is expected. |
| Severity / impact | High protection drift; Critical if unauthorized sensitive content is also delivered. A public generic shell is not by itself proof that private letter authorization was bypassed. |
| Responsible operator | Project Owner / Administrator with Vercel project access. |
| Immediate safe containment | For a real authorized event, restore All Deployments for the same project; avoid deleting aliases or switching to None. Tabletop makes no save and no traffic change. |
| Evidence to preserve | Exact hostname category, timestamp, HTTP/status/redirect host, whether a platform/app session or bypass was used, and non-secret settings/alias metadata. No query-bearing auth URLs or bypass values. |
| Separately authorized actions | Protection/exception/share-link/team-access corrections, domain reassignment, source/deploy if required. Discovery of an unexpected member is not authorization to remove that person or rotate tokens automatically. |
| Recovery prerequisites | Resolve current versus legacy protection scope, attached Production domains, generated aliases, exceptions/bypass and member access; identify whether confidential data crossed app/provider boundaries. |
| Verification after resolution | No-cookie Preview/generated roots gated, intended Production domains only public under the approved scope, private APIs still deny unauthorized callers. Check actual affected aliases, not only the canonical page. |
| Reopening criteria | Approved protection/alias inventory and actual anonymous samples; exact owner approval to reopen canonical if containment closed it. |
| Limits / dependencies | Settings are project-wide; changing scope affects public availability. Old redirect repair does not authorize new domain/protection changes. No fresh provider settings investigation or live protection exercise performed in this task. |

Decision trace: unexpected protected-host response → distinguish platform drift from confirmed private-data leak → plan existing containment → review full affected hostname scope → do not reopen from canonical-only evidence. **PASS for tabletop coverage; real protection rollback NOT TESTED.**

## C — Production or Supabase unavailable

| Field | Tabletop outcome |
| --- | --- |
| Hypothetical detection signal | Repeated bounded checks/user reports show DNS/TLS/platform errors,5xx or timeouts; server errors indicate provider unavailability. One slow sample or401 after logout is not proof of an outage. |
| Severity / impact | High if widespread login/reading/writing unavailable; assess scope before raising severity. Active streams may fail; queued maintenance may lag. |
| Responsible operator | Project Owner / Administrator; hosting/provider support is an external dependency, not a guaranteed responder or paid service. |
| Immediate safe containment | Stop initiating manual writes/uploads and unsupported retries; preserve fail-closed authorization and existing data. Never return mock success, public Storage or skip verification to restore availability. Do not change live settings in this exercise. |
| Evidence to preserve | Time/period, bounded error/status categories, request IDs and aggregate affected paths/services; no raw private logs or credentials. Distinguish application, Vercel, Auth, DB and Storage boundaries. |
| Separately authorized actions | Deployment rollback, env/region/provider configuration, key replacement, new capacity/paid service, public status communication, any database restore or protection change. Zero-extra-charge constraint remains. |
| Recovery prerequisites | Identify cause and provider health; establish last known compatible artifact, schema/Origin/backend binding, current access/hold state and data consistency. Restore requires an actually available validated recovery source; none is claimed here. |
| Verification after resolution | Bounded homepage, app identity, controlled recipient gate/media, private API denial and provider health checks within approved scopes. Validate writes separately; do not manufacture accounts or send emails for a health probe. |
| Reopening criteria | Owner approves any necessary changes and verifies resolved failure paths; if public was contained, separately approve reopening. No RTO/RPO or automatic failover promised. |
| Limits / dependencies | No tested backup/PITR/restore evidence, redundancy, guaranteed incident-history window or second operator. Old runtime may be schema-incompatible or predate MFA safeguards. Provider repair and fresh credentials, if needed, require separate actions. |

Decision trace: failure report → locate failing layer with bounded evidence → preserve access controls/defer unsafe writes → choose only a supported separately approved recovery → verify service and authorization together. **PASS for tabletop coverage; runtime rollback/database restore NOT TESTED.**

## D — Cleanup timeout after possible partial changes

| Field | Tabletop outcome |
| --- | --- |
| Hypothetical detection signal | After an authorized future invocation, helper prints unknown/partial/503/timeout or retains an attempt marker without a confirmed result. This review has no such live attempt. |
| Severity / impact | High operational uncertainty where irreversible removals may have occurred; Critical if active media is affected. Recovery/report/rate pruning, Storage operations and cursor writes are not one global transaction. |
| Responsible operator | Project Owner / Administrator; one designated runner/checkout for the approved window. |
| Immediate safe containment | Stop further worker calls and concurrent changes; retain the marker. Do not delete/reset it, retry from another checkout or treat client abort as cancellation of server side effects. Do not disable public access for a mere timeout without evidence of a relevant security issue. |
| Evidence to preserve | Sanitized helper status/time/HTTP/aggregate counts if available, marker presence, approved before snapshot and later read-only snapshot. Record pending leases/cursors without copying lease tokens or private paths into reports. |
| Separately authorized actions | Any further worker request, queue/lease repair, object recovery, DB/runtime restore, fixture mutation or new scheduler. A previous one-request grant does not cover retries after lease expiry. |
| Recovery prerequisites | Establish whether worker may still run; review lease/cursor/prune state and actual missing active objects; understand non-QA/hold/tombstone effects. Compare before/after state with current source and explicit data-recovery feasibility. |
| Verification after resolution | Post-snapshot active media references/counts, queue availability/retries/leases, retention effects, actual authorized object readability where approved, and bounded web/API/protection checks.200 or queue0 alone is insufficient. |
| Reopening criteria | If normal service was not contained, no reopening action is needed. If contained due confirmed exposure/data incident, require incident-specific checks and exact reopen approval. Further cleanup has its own fresh gate. |
| Limits / dependencies | Helpers do not provide server idempotency or transactional rollback across DB/Storage. Deleted bytes may be unrecoverable. Local marker is not a distributed lock; waiting five minutes does not authorize a retry. |

Decision trace: unknown result → assume possible committed partial effects → stop and preserve marker → read-only reconciliation → seek exact next action after scope is known. **PASS for tabletop coverage; live timeout recovery NOT TESTED.**

## E — Reported missing/deleted media

| Field | Tabletop outcome |
| --- | --- |
| Hypothetical detection signal | Creator/recipient reports404/503/player error or a missing memory; available metadata may disagree with Storage. Loss of letter authorization and disabled/unselected music can also explain denial. |
| Severity / impact | High for confirmed active-media loss; Critical for widespread wrongful deletion or confidentiality impact. A correctly denied expired session is not a storage-loss incident. |
| Responsible operator | Project Owner / Administrator verifies entitlement using the existing case process; no request for passwords, DOB, full letter contents or private credentials. |
| Immediate safe containment | Pause any future cleanup/removal requests and changes to affected letters while assessing. Keep buckets private and authorization intact. Do not reupload blindly, enable disabled audio, overwrite object paths or publish a raw Storage link. |
| Evidence to preserve | Restricted case reference, time, safe response/error category, expected active selection/status and relevant aggregate/job history. Preserve original privately held media only through a separately authorized recovery process; no media export in this review. |
| Separately authorized actions | Privileged object inspection, account-bound media tests, new upload/asset attachment, unpublish/edit/republish, queue changes, scoped deletion or actual object/DB restore. Operator report-detail GET also writes audit/rate state; it is not a side-effect-free diagnostic call. |
| Recovery prerequisites | Distinguish normal access denial, metadata absence, object absence and upstream credential/format/network failure. Identify a valid private original/object recovery source, its rights, matching current letter ownership/config/versions and any holds. No verified provider backup assumed. |
| Verification after resolution | Authorized current letter/media works with correct type/bytes; foreign/anonymous/revoked sessions still deny; current config persists; queues cannot immediately remove the recovered object; optional audio failure leaves permitted reading usable. |
| Reopening criteria | Owner reviews actual recovery and negative tests under the appropriate source/fixture/settings gates. A suspension/hold is not cleared automatically; old links/sessions must not be resurrected. |
| Limits / dependencies | Database metadata restore cannot recreate Storage binaries; runtime rollback cannot restore either. Creator originals may be unavailable. Delivered bytes remain unretractable. Existing deferred live audio tests are still NOT TESTED. |

Decision trace: missing-media report → verify entitlement and distinguish denial/loss → stop destructive follow-ups → establish recoverable private source → separately authorize repair and validate positive/negative access. **PASS for tabletop coverage; real media recovery NOT TESTED.**

## Recovery boundaries and exercise conclusion

| Operation | Can change | Cannot establish |
| --- | --- | --- |
| Runtime rollback | Served application artifact/routing after its exact approval | Undo SQL mutations, revive deleted objects or safely revert schema/credential state by itself |
| Database restore | DB rows to an actually available, validated recovery point | Recover Storage binaries, respect all newer revocations/holds automatically, or prove provider RPO/RTO |
| Object recovery | Restore/reupload an available authorized private original/object with compatible references | Recover unavailable originals or repair every DB/config/access-version relation automatically |
| Access revocation | Deny future authorized routes using current share/session/version/hold controls | Recall in-flight/already delivered bytes, screenshots or third-party copies |
| Platform containment | Gate project-hosted requests by restoring protection under authorization | Fix direct-provider exposure or erase data delivered earlier |

All five paper decision traces completed; **tabletop coverage PASS**, with gaps recorded. **Actual containment, runtime rollback, DB/object restore and recovery drill NOT TESTED.** Single-owner availability, authorized response access, current incident scope, actual recoverable media/backups and separately approved corrected artifacts remain dependencies. Proposed manual cadence and absence of automated monitoring are unchanged. No claim of guaranteed retention, physical deletion, zero incidents, continuous monitoring or verified restoration. No operation above executed by this tabletop.
