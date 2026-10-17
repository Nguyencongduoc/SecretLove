# G8 — Completion gate review

**Current Owner decision: G8.3 PAUSED.** After the single approved request returned401, Owner requests deferring cleanup, completing README and committing/pushing documentation to GitHub. No further cleanup diagnostic request, retry, marker removal, credential/provider change, deployment or data mutation is part of that work. Subsequent operator metadata identifies the expected deployment, but “BYPASS”/“finished” are not HTTP status codes and do not establish401 provenance. Resume only through a separately reviewed scope. The attempt remains FAIL and worker execution/post-cleanup verification unconfirmed; historical gates below retain their original timing.

Date: 2026-10-17, Asia/Bangkok. Latest user gate authorizes read-only review, documentation, non-destructive local checks and tabletop only. **Production cleanup is NOT AUTHORIZED.** Earlier pending invocation question is not approval and must not be acted on. No new remote requests, database queries, helper execution, secret access, settings changes, deployments, cleanup or Git writes performed in this review.

## A. Verified current state

- Branch directly checked: `codex/g8-operations-monitoring`; HEAD `4a169ff185bd464516cdebf24b066a7963ca05d6`.
- Start-of-review worktree:6 tracked reporting files modified,9 reporting/SQL files untracked; Git index empty. Preserve them all; this review adds/updates reports only. No commit/push/merge/reset/stage.
- Current local runtime continuity: all167 allowed deployment inputs match the frozen source manifest, including nine immutable migrations; no environment/credential file read or hashed. Current reviewed helper-source identities are pinned in ignored closure evidence for future comparison; no secret fingerprints reported.
- Latest measured Production baseline, not a fresh remote check: canonical `https://secretlove-production.vercel.app` → `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa`, READY/Production in project `secretlove-preview` (`prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`), team `team_KJpwyYId3LugWZ4U1jnF4h67`; backend `mdoaageegovutlxhhicz`. Region evidence remains prior sin1 samples. No provider state is inferred newly verified by reading local reports.
- Last G8 health sample:2026-10-17 12:46:13–12:46:19 Asia/Bangkok,13/13 bounded GET checks PASS; current review does not repeat them. Operator reports Standard Protection saved/no recent error or quota warnings; time window/counts/headroom unavailable.
- Actual attempt path `test-results/g8-operations/cleanup-once-attempt.json` absent at review. No file read/removal/reset; separate mock guard files are not real Production attempts. This observation cannot prove no call occurred from every other machine or checkout.
- Complete current G7 report, G8 report/runbook/cleanup plan, production workflow and all TASKS.md read; latest source/RPC definitions, helper and test source, local sanitized evidence reviewed. Historical unchecked entries do not undo later evidence, and later approvals do not turn unexecuted checks into PASS.

## B. G8 completion matrix

| Item | Status | Actual evidence / remaining requirement |
| --- | --- | --- |
| G7 public access state | PASS + OWNER-ACCEPTED EXCEPTION | Actual canonical/API/protection/redirect samples and operator save/confirmation; full private-media/security acceptance waived as a release decision, underlying tests still NOT TESTED |
| G8.1 baseline/runbook | PASS | Verified branch/HEAD/source continuity; approved target and runbook preserved |
| G8.2 bounded monitoring | PASS, sampled scope |13/13 earlier GETs; no rerun. One sample is not sustained uptime or provider-wide incident count |
| G8.2 capacity/usage history | OWNER-ACCEPTED EXCEPTION / NOT TESTED numerically | Owner reports none; no numeric/window/alert evidence, no unlimited-quota or zero-cost guarantee |
| G8.3 worker/helper source review | PASS, static/local scope | Full current source and SQL reviewed;14/14 prior local mock/helper tests and prior PowerShell syntax PASS carried forward, not rerun |
| G8.3 invocation readiness | BLOCKED | Historical snapshot not current; pending-audio/active-ingest/hold coverage gaps, pause/private authorization/runner/source freshness checks outstanding |
| G8.3 actual cleanup | NOT TESTED / BLOCKED | No live request, no post-deletion snapshot; latest request explicitly withholds invocation authorization |
| G8.4 tabletop | PASS, paper exercise only | Five scenario decision traces and recovery boundaries in [tabletop report](G8_INCIDENT_TABLETOP.md) |
| G8.4 actual containment/restore | NOT TESTED | No platform save, incident injection, deployment/DB/object restore or credential operation performed |
| G8.5 documentation/evidence closure | PASS for this review | Matrix, exact approval packet, STOP conditions, tabletop, evidence limits and one next action documented; all operational items remain open honestly |
| Live media/security tests | NOT TESTED + OWNER-ACCEPTED EXCEPTION | Modern full GET/bytes/HEAD/206/416/isolation/revocation and recorded negative-test gaps remain; local opt-in audio-live test still SKIPPED |
| Provider backups/log retention | OWNER-ACCEPTED EXCEPTION / NOT TESTED | Owner declined further investigation; maximum30-day log target accepts shorter history. No new investigation or verified restore/retention claim |
| Monitoring ownership/cadence | PASS for named owner; BLOCKED for guaranteed coverage | Project Owner responsible; manual daily-style cadence remains a proposal, no adopted SLA/backup responder/recurring agent or alert service verified |
| Repository/deployment preservation | PASS local; remote baseline historical | No runtime/migration/env change or remote operation in this review; no source freeze or deployment implied by new reports |
| Historical old-hostname failure | FAIL, repaired | Original404 retained; one approved redirect patch subsequently passed7/7 checks. Not a current new failure or new repair action |

**Documentation/readiness review closes; G8 full operational acceptance does not.** Source availability, historical tests, paper decisions and actual provider operations are separate evidence classes.

## C. G8.3 — Precise one-request approval packet

### Follow-up operator snapshot received

**Actual attempt result (supersedes pre-send GO):** operator returns `STOP_HTTP_ERROR_NO_RETRY`, HTTP401, requestLimit1, UTC **2026-10-17T09:34:30.688Z** (16:34:30 UTC+7). Local persistent marker independently contains the same safe result. One approved request consumed; no retry authorized and marker must remain. **Authenticated cleanup attempt FAIL; worker execution/post-cleanup acceptance NOT CONFIRMED**, not a successful cleanup. Helper correctly stopped after401 and retained its marker (observed guard behavior PASS).

Read-only source diagnosis: route compares exact `Authorization: Bearer <CRON_SECRET>` before calling cleanupMedia. Application-generated401 means comparison failed before worker invocation; missing configured secret instead maps to503. Proxy forwards request headers and adds CSP, with no cleanup login/Origin requirement or code stripping Authorization. Helper sends Bearer privately and discards non200/503 bodies/headers, so its safe result alone cannot prove whether401 originated in the route or hosting protection. No root cause established, no credential read/compared/exported, no further endpoint call. Candidate causes include wrong credential/environment, copied value differing from deployed snapshot, environment update after deployment, or upstream authorization/header handling. Operator should inspect only existing request metadata at the attempt time for path/status/function invocation/protection classification; no raw headers/bodies/token/log export or repeat request. A route-auth failure entails no worker effects by this code path, but absent response provenance is not a global no-mutation proof. Retry requires diagnosis, new current preflight and separate exact approval with preserved original attempt evidence; do not clear/copy/bypass the marker.

Quiet-window refreshed results received: main snapshot still six due/unleased/unretried staging jobs/5,432,686bytes, no non-QA/null-parent jobs, one expired recovery record, no other returned backlog; inventory/private buckets unchanged. Supplement timestamp **2026-10-17T09:28:39.518479Z** (16:28:39 UTC+7), all upload/ingest/hold/open-report/reference-conflict/missing-object counts zero, read-only true. PASS within operator-supplied aggregate scope. No physical-binary/full-orphan-scan guarantee.

Final local pre-send review: branch/HEAD unchanged; **170/170 frozen deployment and reviewed helper/test inputs match**, actual attempt marker absent, linked project/team match. A bounded metadata check initially failed in restricted execution; direct CLI query was interrupted without result, then authorized read-only network execution returned exit0 with expected deployment ID/READY/Production all true. No raw metadata/env/build logs printed. No cleanup request or secret access by agent. **GO to provide the already-approved operator-local one-attempt helper**, conditional on the same quiet window, unchanged target/runner and privately available existing Production CRON_SECRET; STOP on changed state, format/marker/TLS issue or any unexpected result. Global orphan scanning/pruning effects remain within the reviewed packet; aggregate zeroes do not narrow that scope. No retry/recurrence authorized. Actual cleanup remains NOT TESTED until operator returns safe result and postchecks.

Latest Owner message: **“duyệt cleanup”**. Record authorization for one cleanup invocation under the already presented global-worker packet, conditional on its preflight/STOP requirements; no retry, recurrence or extra operation authorized. The requested refreshed main/supplement snapshots from the newly confirmed quiet window have not yet been returned. Therefore **execution remains BLOCKED by unmet preconditions**, not by missing approval alone. Earlier NOT AUTHORIZED statements describe the preceding review gate and are superseded only for this conditional single invocation. No helper/endpoint/secret operation performed. Before any send, also reconcile current target/source/helper/attempt state and unexpected/orphan scope under the packet; STOP on uncertainty.

Owner now confirms the prospective no-manual-data-change window has started and no other person can edit data. **Quiet-window commitment recorded by operator attestation**, not a database lock or proof of no public traffic/automated Auth/rate/report writes. Refresh both existing read-only queries once during this window because the previous post-snapshot changes were unknown; preserve their separate-transaction limitation and record returned supplement UTC time. No cleanup permission follows from this commitment. No remote queries/helper execution by agent.

Owner subsequently confirms no Vercel cleanup Cron, local helper/scheduled cleanup task or external cleanup service. **PASS for caller inventory by operator attestation**, not independent remote/process inspection. Changes after16:22:54 remain UNKNOWN. Do not infer no changes or demand reconstruction of uncertain history. Next establish a prospective Owner-controlled quiet window (no manual uploads/edits/deletions/moderation or cleanup, confirm no other authorized writer) before refreshing main/supplement preflight and presenting exact future invocation approval. This does not pause public traffic, freeze the database or prove there can be no public report/rate/session writes. Unknown external writes or new relevant state still require review. No runner action, service stop or settings change authorized by this confirmation.

Supplement results subsequently supplied by operator: `snapshot_at_utc=2026-10-17T09:22:54.774264Z` (**16:22:54.774264 UTC+7**), `transaction_read_only:true`. All returned pending photo/audio, stale audio, ingest/part/lease/finalizing, open-report/moderation/active-retention-hold and queue-reference/missing-Storage-metadata counts are zero. **PASS for returned aggregate preflight at that snapshot**, based on operator output; not an agent query, current-state guarantee, full orphan scan, binary integrity or live cleanup PASS. No identifiers/paths/secrets returned. This closes the measured supplement coverage gaps, while intervening changes/other caller activity remain UNKNOWN. The earlier main aggregate and supplement are separate transactions/times, not one atomic combined snapshot. Local `vercel.json` still has `crons:[]`; this proves source intent only, not absence of remote/external/manual callers.

Subsequent provenance confirmation: operator identifies `secretlove-production` / `mdoaageegovutlxhhicz`, confirms the existing SQL file, and estimates execution at **2026-10-17 16:17:41 UTC+7**. This closes project provenance by operator attestation, not agent/provider re-query; execution time remains approximate. Intervening data changes and other cleanup/worker activity are explicitly **UNKNOWN**. No current quiet window or absence of prior requests established.

Prepared additive documentation query [G8_PREFLIGHT_SUPPLEMENT_READONLY.sql](G8_PREFLIGHT_SUPPLEMENT_READONLY.sql), not executed: repeatable-read/read-only transaction, 10-second timeout, built-in aggregate SELECTs for pending audio/photo totals, all ingest/lease/finalizing/part totals, moderation/retention holds, open reports and queue-reference conflicts/missing Storage metadata. No RPCs, row locks, source/migration changes or sensitive output. Static schema review only; remote syntax/results NOT TESTED. Existing G6 query unchanged. These counts cannot establish future concurrency, a caller inventory, full orphan enumeration, physical bytes, legal retention coverage or job ownership integrity. Nonzero/unknown conflicts or holds require review, not an automatic deletion decision.

Operator supplied another aggregate snapshot after the completion review. It reports `transaction_read_only:true`; six due staging jobs, no leases/retries/non-QA/null-parent jobs,5,432,686 queued bytes; one expired recovery record; other returned backlog counts zero. Oldest job age is43,227seconds versus31,674 in the earlier snapshot (+11,553seconds). Inventories, declared bytes, private bucket flags and limits are unchanged: one ready audio, seven ready photos, two active letters, one Auth user, one active operator and one approved creator. Maintenance remains empty. These are operator-supplied aggregate results, not agent database/Storage verification or a physical-object integrity test.

The payload contains neither an execution timestamp nor project reference; Production binding and exact execution time still require operator confirmation. Receipt does not establish the quiet window or resolve missing pending-audio/active-ingest/hold/orphan/job-correspondence coverage. No cleanup approval is inferred, no helper/endpoint invoked and no additional SQL executed. Invocation readiness remains **BLOCKED**. Do not request another identical snapshot solely to fill those missing fields; reconcile provenance and obtain separately reviewed missing-state evidence first.

### Known evidence and freshness

Historical operator aggregate:6 due staging jobs/5,432,686 declared bytes, no leases/retries/non-QA jobs;1 expired recovery record;1 ready audio/7 ready photos/2 active letters/1 Auth user; no known eligible tombstones; all buckets private, maintenance empty. This does not guarantee current eligibility, exact object-to-job correspondence, absence of in-progress work or absence of holds. Media byte/playback authorization is not established by metadata counts.

Freshness means the same operator-controlled quiet window immediately before any future approval/request, with checked project, unchanged source/helper identity and recorded time; any intervening data/config/worker change invalidates that assessment. No arbitrary permanent validity or automatic renewal is granted.

Exact existing approved aggregate SQL: `D:\D\SecretLove\docs\G6_OPERATIONS_READONLY.sql`. Operator checks Dashboard project `mdoaageegovutlxhhicz`, pastes the entire file in SQL Editor and runs once; return only `operations_snapshot` and non-secret execution time/project confirmation. READ ONLY/timeouts/built-in aggregate queries, no SecretLove RPC or DML. Agent executes no remote SQL.

**Coverage gap:** that existing SQL counts stale pending photos, expired ingests and due hold-aware report/audit prunes, but not stale pending audio assets, all active/leased ingests, all live retention/moderation holds, orphan eligibility or individual job correspondence. It cannot independently satisfy every STOP condition. Do not alter the approved file, infer missing populations zero or approve cleanup from its output alone. Additional unresolved state needs separately reviewed read-only evidence/owner concurrency confirmation before a mutation gate.

### All possible worker effects, in deployed order

| Stage/source | Actual global effect and safety limit |
| --- | --- |
| Endpoint | Timing-safe comparison of server Cron bearer before `cleanupMedia`; Node maxDuration60seconds. Public canonical is not worker permission. No route call in this task |
| `sl_cleanup_stale` latest003 | Pending photo AND audio rows older1hour, up to20 distinct parent letters per kind; lock parent, queue object cleanup, delete pending metadata, advance affected letter version/time. Ready rows excluded. Stale completion can conflict with a slow/concurrent upload |
| Same stale RPC | Delete expired rate buckets and recipient sessions expired by more than24hours; these deletes are not batch-row-limited. Access expiry is enforced independently, not delayed until pruning |
| `sl_recovery_prune`007 | Delete expired recovery-consumption ledger rows; no Auth user/password deletion. Valid reset still requires unexpired bound proof; pruning is not a new reset grant |
| `sl_report_prune`009 | Delete up to100 eligible audits and100 reports using purge_after and finite hold_until, SKIP LOCKED. Report retention holds are distinct from letter moderation; neither proves a blanket hold on Storage jobs/tombstones |
| `sl_ingest_stale`008 | Up to20 selected expired/unleased ingest parents; delete ingest and cascading part metadata, trigger queues parts and candidate audio unless already ready, advance affected letter revisions. Staging expiry/queueing is not physical deletion |
| Claim/delete/complete008 | Claim up to20 due jobs across all three buckets,5minute leases; private Storage removal then bucket/path/token/unexpired-lease-bound acknowledgement. Failures increment attempts, clear lease, back off. Expired acknowledgement can leave a job despite a Storage call; counts alone are not proof of full state |
| Completion tombstones008 | Each completion also hard-deletes ALL eligible letter tombstones older1hour with no remaining job, not just that job's letter. Historical tombstone count cannot constrain future eligible rows |
| Orphan scans001/003/008 | Scan image/audio/staging with durable state; eligible three-part UUID paths older1hour (created AND updated age), enqueue when reference absent; writes cursor/last-success state. Nominal50-entry per-bucket check occurs between up-to25-entry batches and may overshoot. New queued orphans may need another separately approved invocation |

Worker's40-second budget starts before RPCs and is checked in loops; it is not a universal SQL/network timeout. Expired records/leases can become eligible during a run. Different RPC/Storage effects are not one atomic transaction. Active uploads/edits, hold changes, deletes/publication and multiple callers can change versions/eligibility; pause and reconcile rather than claiming these races are operationally proven safe. No Auth account deletion or cohort filter exists in this worker.

### Helper review

| Property | Review result / limitation |
| --- | --- |
| Destination | PASS static: exact HTTPS canonical `/api/cron/cleanup`, no caller URL parameter; preserve TLS defaults, no code disables certificate verification |
| Redirect/retry/cookies | PASS static: manual redirects, credentials omit, one fetch expression and no retry loop. A3xx stops; no forwarding bearer to another host |
| One attempt | PASS static/local: exclusive persistent marker reserved before fetch; marker failure sends none. Scope is this path/checkout, not distributed/server idempotency; copying runner or removing marker is not allowed |
| Secret handling | Hidden PowerShell input, stdin only to Node; no source/env/arguments/history/log write intended; clear/dispose references/BSTR. No actual CRON_SECRET accessed. Managed memory is not guaranteed perfectly erased; trusted operator terminal/Node/TLS environment required |
| Secret format | Helper requires canonical base64>=32bytes; app Cron reader merely requires a value. Actual private Production format not inspected. A mismatch stops before request; do not rotate/extract a key to force compatibility |
| Size/time bounds | Response JSON16KiB/input2KiB,70second AbortSignal; no new timeout test run. Client timeout cannot cancel effects already committed server-side |
| Disclosure | Only known nonnegative numeric aggregates/boolean/status/time retained; raw response/error/Location/path/headers not printed. No secret input used for this review |
| Failure/unknown result |401/redirect/network/malformed/partial/503 stops; marker remains and result never proves physical deletion. `HANDLER_COMPLETED_NEEDS_POSTCHECK` requires post-state verification |
| Wrapper limitation | PowerShell catches STOP without an explicit nonzero process exit in catch. Do not use outer PowerShell exit alone as success or automation permission; inspect safe JSON/status/marker. Static limitation, not a live failure reproduction; helper unchanged |
| Validation history |14/14 prior mocked/local tests and prior AST syntax PASS. Read current source/test evidence; no helper import/execution or repeat of those tests in this review |

### Required exact future authorization and STOP conditions

Future packet must name the exact project/team/canonical/deployment/backend, current worker and helper review, fresh eligible/global effects, quiet data window, one designated runner/checkout, valid private authorization and before/after verification. Existing helper prepares one request; it is not permission to run now. Secrets must remain private. Approval wording must cover all global effects above, not just six chunks. No retries, schedule, account removal, historical-backend activity, provider setting/source/deploy change or physical-deletion guarantee.

**STOP before sending** for any of: (1) unexpected eligible rows/count/bytes; (2) new non-QA/null-parent jobs or unknown object associations; (3) active/concurrent upload/edit/delete/report/moderation or another worker/caller; (4) unknown/changed holds or tombstones; (5) project/team/deployment/origin/backend mismatch; (6) missing private authorization or helper format mismatch; (7) worker/migration/helper changed or current deployed version unverified; (8) marker present, unreadable, missing provenance or prior-attempt history unknown; (9) snapshot stale/coverage gaps unresolved; (10) missing explicit new invocation approval. Never remove an attempt marker or create replacement credentials as a workaround.

After a separately approved future request, retain only safe result, obtain approved read-only post-state, verify ready media/letters/auth counts, jobs/leases/retries/scans and bounded service/denial/protection checks.200, queue0, metadata absence or scanComplete alone cannot prove all physical bytes erased or recoverable. Partial/timeout/unknown means stop for reconciliation, not automatic retry. This review does none of these operations.

## D. Incident and recovery tabletop

Five hypothetical traces completed in [G8_INCIDENT_TABLETOP.md](G8_INCIDENT_TABLETOP.md): A private disclosure; B protected-host exposure; C availability loss; D ambiguous cleanup; E missing media. Each includes detection, severity/impact, owner, containment, minimal evidence, separate permissions, recovery prerequisites, verification, reopening and gaps.

Key distinctions: runtime rollback changes served code, database restore needs an actual valid recovery point, object recovery needs available authorized binaries, access revocation affects future requests, and already delivered/in-flight bytes cannot be recalled. Restoring platform protection does not repair direct Supabase exposure. Tabletop PASS does not demonstrate a real operation; all actual containment/restore drills remain NOT TESTED. No incident artificially generated, email sent, platform closed or data modified.

## E. Evidence closure assessment

**Closed:** source/helper review, historical evidence reconciliation, current preservation/guard check, explicit global effects/coverage gaps, conditional one-request packet, five-scenario tabletop and documented next gate. All supplied documents read; no repeated completed tests.

**Not closed:** actual cleanup and post-delete evidence, physical-erasure/complete sweep, live containment/runtime rollback/DB/object restore, sustained monitoring/alert delivery, validated numeric capacity, live media/security exceptions and final provider retention/privacy guarantees. Owner accepted some unknown risks for G7 and declined provider backup/log work; acceptance is not technical proof. Do not promise permanent retention, a deletion deadline, tested PITR, continuous coverage, zero incidents or unlimited quotas.

Owner remains responsible. Proposed manual cadence is not an adopted/operationally verified schedule; no automation or paid service created. Operator report-detail GET writes audit and list/media GETs can consume durable limits, so a future live diagnostic must not be called mutation-free solely because its method is GET.

## F. Exactly one next operator action

**No further G8.3 action while paused.** Preserve the failed attempt/marker and existing privacy/security limitations. Owner authorizes documentation completion and Git commit/push only; no diagnostics/retry/cleanup resumes automatically. Historical request-metadata review may be revisited under a later scope if needed.

## G. Separate GO / NO-GO

| Decision | Recommendation |
| --- | --- |
| G8 documentation/readiness review closure | **GO**, within the source-review/tabletop/evidence scope and with operational blockers explicitly retained |
| G8 full operational acceptance | **NO-GO / BLOCKED**: live cleanup/post-state, actual recovery, capacity/cadence and deferred acceptance absent |
| Production cleanup invocation | **NO-GO for another attempt**: one approved request consumed, HTTP401/FAIL; worker execution unconfirmed, marker preserved. Diagnose read-only before any separately approved remediation/retry |
| Further deployment or public/settings changes | **NO-GO / NOT AUTHORIZED in this task**: preserve existing public state; no new deploy/alias/protection/key/SQL action |

Final local validation: **167/167 frozen source inputs match**, zero source mismatches; five reviewed G8 documents have no broken relative links or matches for the bounded credential/share-token exposure patterns. `git diff --check` PASS (line-ending notices only), index empty, branch/HEAD unchanged. Actual root attempt marker absent at inspection. Helper/test source identities saved for future change detection; these are not a historical test-execution manifest. Validation records are Git-ignored. No application/helper tests re-executed, helper invoked, remote request made or credential read. Pattern scanning is a bounded hygiene check, not a guarantee about all files or provider state.

Stop after reporting. Local closure-source/hygiene evidence under ignored `test-results/g8-operations/`; no secrets or private runtime values read, copied or fingerprinted.
