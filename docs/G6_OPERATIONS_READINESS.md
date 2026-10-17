# G6 — Operations review and read-only handoff

Date: 2026-10-17, Asia/Bangkok. Preparation/source review only. Branch `codex/g6-production-https-acceptance`; frozen runtime `4a169ff185bd464516cdebf24b066a7963ca05d6`, protected deployment `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa`. Scope remains Production `mdoaageegovutlxhhicz`, canonical `https://secretlove-production.vercel.app`. Historical test backend excluded. No remote worker, SQL, settings, new services, exports, emails or fixtures executed/created by this review.

## Actual findings

| Item | Status | Evidence and consequence |
| --- | --- | --- |
| Cleanup implementation exists | PASS — source review | `src/lib/server/cleanup.ts` and migrations001/003/007/008/009 provide queue, pruning, leases/retries and three-bucket orphan scans. Existence is not operational acceptance. |
| Cron authentication | PASS — source review only | Route checks exact server `CRON_SECRET` header using length check/timing-safe comparison before calling worker. No live endpoint probe performed, even with intentionally wrong credentials. |
| Scheduled worker in frozen source | NOT CONFIGURED | `vercel.json` has `crons: []`; no approved worker execution/scheduler established in this workflow. Remote Dashboard job inventory is not independently queried. |
| Worker cleanup scope | VERIFIED PROJECT-WIDE — source | It is not fixture/cohort scoped. One authorized call can prune stale photo/ingest state, old sessions/rate/recovery records, due reports/audits, remove queued objects, hard-delete eligible letter tombstones and scan/enqueue orphans. Do not describe it as “delete only A/B staging”. |
| Hosted cleanup/deletion proof | NOT TESTED | No worker run, deletion request, physical object removal, outage/lease recovery or complete orphan sweep proven on target. Queue expiry is not physical erasure. |
| Privacy page/contact | PARTIAL — source/operator | Current page has environment-driven verified owner contact and honest low-assurance/provider/copying/deletion disclosures, but explicitly remains draft. No legal/compliance/final-policy approval inferred. |
| Report/hold/audit support | PASS — source; live NOT TESTED | G3/009 implements intake, Operator MFA/registry, transactional holds/revocation and audits; hold/resolve/prune operations not exercised in this G6 batch. |
| Logs policy meaning | DECIDED — operator | Owner now selects maximum30days, accepting shorter Free/Hobby history. This replaces earlier ambiguity; no requirement to buy30-day logging or silently add an exporter. Provider-side retention/policy verification still separate. |
| Provider quotas | PARTIAL — operator | Reply “không” is recorded as no warning reported, with interpretation stated in chat. It does not supply actual plan, numeric usage/headroom or a guarantee of zero charges. Supabase Free/zero-extra-budget is the approved intent; current Dashboard metadata pending. |
| Backup/PITR/exports and actual log window | NOT VERIFIED | Operator question pending. No backup/export/restore initiated or paid add-on enabled. |
| Rollback/containment procedure | PREPARED; NOT TESTED operationally | Preserve protection/queues/credentials/schema; inspect exact artifact and settings before an approved alias rollback. App rollback cannot undo database or Storage deletion. |

## What one worker invocation really does

The handler is Node runtime, maxDuration60seconds. Worker starts a soft40-second budget, performs stale-photo/session/rate pruning, expired recovery pruning, report/audit pruning and expired ingest handling, then claims up to20 jobs with five-minute leases. Storage deletion occurs server-side; acknowledgment uses ID/bucket/path/lease. Failures increment attempts and schedule bounded backoff. Completion also removes eligible letter tombstones older than one hour without queued jobs. No Auth account deletion is implemented here.

It scans letter-media, letter-assets and letter-audio-staging with durable cursors. Nominal50-entry bucket budget is checked between list batches of up to25, so the final batch can exceed that nominal threshold. Objects older than one hour can be reconciled as orphans. Work budget is not a hard bound on every RPC/Storage request; some SQL pruning is unbounded by row count. One run may leave leased/backoff/newly-enqueued work; queue0 or a503 alone does not prove all bytes removed. Source must not be changed to bypass authorization/limits for acceptance.

Before approving an invocation, inventory all eligible project-wide effects, not only queued part count. Any unknown non-QA jobs, unexpected tombstones/holds, missing ready-object metadata or active ingest requires review. Never run this against the historical test backend. A future exact invocation/scheduling approval must cover its real scope and authentication path.

## Read-only Production snapshot — next step

Prepared [G6_OPERATIONS_READONLY.sql](G6_OPERATIONS_READONLY.sql). Operator checks Dashboard project reference `mdoaageegovutlxhhicz`, pastes the entire file in SQL Editor and runs once. This is not a migration. The query begins READ ONLY, sets transaction-local timeouts, calls no SecretLove RPC and performs no data writes. Ordinary SQL cannot reliably establish the Supabase reference by database name, so the Dashboard check is mandatory.

Output is one `operations_snapshot` JSON: queue counts/due/leases/retries/age/declared bytes; scan timestamps/cursor-present booleans; expired/stale/prunable counts; active ready assets missing Storage object metadata; private-bucket object metadata totals; aggregate account/role/letter/media inventory. No object name/path, actual cursor, user email/DOB, gate digest, session token, recovery proof or credential selected for output. Storage metadata totals are not provider billing or physical-byte-erasure evidence.

Local PGlite validation PASS against isolated minimal schemas matching referenced migration columns: SQL syntax, read-only flag, due versus leased jobs, hold-aware report eligibility, malformed size metadata handling, audio scan operation name, missing ready-object detection and unchanged queue rows. No provider credentials/network/database used. The operator subsequently returned the aggregate JSON recorded below; no direct agent-hosted SQL execution or permissions verification occurred. Initial helper draft was corrected to `audio_scan_v1` before handoff.

## Operator-returned snapshot (2026-10-17)

Evidence is the JSON pasted by the operator, not a direct provider query. `transaction_read_only: true` confirms the reported transaction mode. The operator subsequently clarified that the files had not all been uploaded; the absent audio/incomplete media are fixture state, not a reported program defect. SQL output itself cannot independently prove the project binding.

| Observation | Actual result | Interpretation/status |
| --- | --- | --- |
| Cleanup queue | Empty array | PASS for no recorded queued jobs at snapshot time only; not an orphan sweep or physical-erasure test. No worker invocation needed merely to clear a media queue that is empty. |
| Private bucket metadata | All three `is_public: false` | PASS — operator-returned metadata. This alone does not verify grants, authenticated delivery or anonymous object denial. |
| Bucket caps | Audio16,777,216; staging1,048,576; images3,145,728 bytes | Match reviewed limits; no limit changes. |
| Image metadata | One ready photo; one Storage object;388,102 declared bytes | No active ready photo missing object metadata reported. This is one photo total, not evidence of one per A/B letter. |
| Audio metadata | Zero ready audio assets; zero audio/staging objects and declared bytes | FIXTURE INCOMPLETE — operator clarification: files not fully uploaded. Audio acceptance NOT TESTED / prerequisite unavailable; no application defect inferred. Prior A/B media statements cannot establish current audio readiness. |
| Missing-object counters | Both zero | Photo check is useful for the reported population; audio count is vacuous with zero ready audio. Does not prove working audio, byte integrity or absence of every orphan. |
| Maintenance records | Empty array | No tracked scan timestamps/cursors available; cannot infer the worker has never run or passed. Hosted cleanup remains NOT TESTED. |
| Backlog | One expired recovery-consumption record; all other returned backlog counts zero | Expired retention item, not evidence of a valid recovery credential/replay or reason to invoke global cleanup without its separate gate. |
| Inventory | One Auth user, one active Operator, one approved Creator, two active letters | Consistent aggregate counts only; no individual identity, ownership, letter status or music configuration proven by aggregate output. |

Keep prior operator-reported upload/preview observations as historical evidence with this newer fixture clarification attached. The stopped media suite, skipped diagnostic and live audio requirements remain unpassed. The initial apparent discrepancy is explained by the operator as incomplete uploads; no code fix is justified by this snapshot. Do not repeat the skipped diagnostic, create fixtures, re-upload tracks, change configuration or run cleanup automatically. The owner may continue other read-only operational preparation; audio acceptance remains a separate uncompleted requirement, not an application FAIL or an implicit waiver.

## Retention: capability versus enabled state

- Owner's30-day log policy is an upper bound, not guaranteed searchable history. Vercel currently documents Hobby runtime-log visibility of one hour; provider internal/security retention and other log categories are not proven erased after that window. Review actual plan/drains/exports and provider terms without collecting raw private logs. [Vercel runtime logs](https://vercel.com/docs/logs/runtime).
- Supabase documents daily backup availability by paid plan and advises Free projects to arrange independent exports. Database backups exclude Storage object binaries. Do not claim this Free project has recoverable daily backups or media protection without actual evidence. Export/restore destinations, encryption, retention and budget need a separate exact plan; no data export authorized now. [Supabase backups](https://supabase.com/docs/guides/platform/backups).
- Supabase log visibility depends on plan and quota state; recent docs also describe reduced windows after quota degradation. Do not hardcode a normal/degraded window as this project's verified setting. [Supabase logs](https://supabase.com/docs/guides/observability/logs), [Logs Query quotas](https://supabase.com/docs/guides/platform/manage-your-usage/logs-query).
- Existing report/audit90-day rules and finite holds are implemented in SQL; actual pruning depends on a functioning worker. Active-data deletion and backup expiry are distinct. No verified physical-deletion deadline, legal compliance or final privacy policy is claimed.

## Proposed zero-extra-budget operation — not activated

Owner remains the operator. Proposed manual review: inspect aggregate queue age/due/failed jobs, overdue maintenance, provider5xx/timeouts and quotas daily during initial limited access and on every deletion case. Keep a small aggregate incident log with no private URLs/payloads. Suggested warning thresholds are70% usage and90% stop admitting new Creators/review capacity; these are proposed human decisions, not configured alerts or automatic account suspension. Exact thresholds/cadence need owner adoption after real quota data arrives.

For a later scheduler, Vercel documents cron on all plans with Hobby daily minimum interval and per-hour precision; Function usage still applies. It is not unlimited free processing. Changing the source schedule requires a reviewed new artifact/deployment and explicit authorization for recurring project-wide maintenance. [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Current All Deployments protection and Cron bearer authorization are separate boundaries. A server caller cannot treat an SSO302 as worker success, follow a redirect with credentials, put `CRON_SECRET` in browser/URL/logs or invent a bypass token. No automation bypass/exception is created by this plan. Verify the chosen protected invocation mechanism before any real call; native cron delivery behavior/protection and last-run status must be accepted on the actual setup. No executable live-worker command is supplied until snapshot, scope and approved transport are known. [Cron auth/management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Incident and rollback plan

Keep All Deployments protection during G6. If later public operation exposes private content or loses auth isolation, stop further public admission and obtain/execute the authorized containment action, preserve minimal aggregate evidence and avoid destructive cleanup while investigating. Do not call a rollback a data recovery.

Use a verified compatible artifact. Previous baseline `f1832f7be25a312974d79bcc9a44a9d86ffe7942` predates MFA fallback/pending-factor safeguards, so it is not an automatically accepted rollback target. Review its known limitations before assigning a domain. Preserve new Production backend/origin, migrations001–009, active role/access state, HMAC/Cron continuity and queued objects; never reverse applied migrations, replace credentials casually or restore provider data in place. Recheck aliases/protection and any scheduler after rollback. No rollback executed or automatically authorized.

## Decisions/results still needed

Subsequent owner decision: stop the requested backup/log/retention verification. Those checks are SKIPPED BY OWNER / NOT VERIFIED, not pending repeated requests and not PASS. Earlier pending-question statements above are historical. G7 preparation is recorded separately; no verified retention guarantee, cleanup run or public readiness follows from this deferral.

1. Snapshot JSON received; incomplete media explained by operator as files not fully uploaded. Retain audio acceptance as NOT TESTED, fixture incomplete; do not repeat the skipped diagnostic or mutate fixtures automatically.
2. Actual Backup/PITR/log visibility/drains/export and plan/usage metadata; pending asynchronous questions remain open where unanswered.
3. Approved cleanup cadence/transport and exact project-wide invocation acceptance after snapshot; no blanket historical deletion.
4. Report/hold/deletion operational test scope and final retention/privacy wording/source update after provider facts, with normal new source-freeze/deployment gates if runtime text/config changes.
5. Remaining G6 security evidence, including skipped media requirements, remains as [current acceptance report](G6_CURRENT_ACCEPTANCE_STATUS.md). This review does not ask to rerun deferred metadata diagnosis and does not clear G7.

**Result: operations preparation PASS; hosted operations NOT VERIFIED; public readiness NO-GO.** No runtime, remote setting, credential, migration, commit/push/deployment or public access change performed.
