# G8.3 — Cleanup design and preflight handoff

**Current decision: G8.3 PAUSED by Owner after401.** Preserve the attempt marker; do not retry or continue credential/remote diagnosis. Documentation commit/push is authorized separately and does not resume cleanup. Latest status in completion review supersedes historical preparation text below.

**Latest actual outcome:** the separately approved one request returned HTTP401 / `STOP_HTTP_ERROR_NO_RETRY` at2026-10-17T09:34:30.688Z. Attempt consumed; persistent marker retained. No retry, marker removal, credential/settings/source change authorized. Authenticated attempt FAIL; actual worker effects unconfirmed. Read-only provenance diagnosis in [completion review](G8_COMPLETION_REVIEW.md) supersedes historical pending/GO statuses below. Never run helper again under the consumed approval.

Latest completion-gate review: [G8_COMPLETION_REVIEW.md](G8_COMPLETION_REVIEW.md). **READ-ONLY/TABLETOP ONLY; no Production invocation authorized.** Historical six-job snapshot is not current preflight. Current source review identifies incomplete snapshot coverage (pending audio, active ingests and complete hold state), so live readiness is BLOCKED. Previous invitation to approve a run is not approval and is not actionable under this gate. Do not run either helper, enter CRON_SECRET or remove a marker.

Date: 2026-10-17, Asia/Bangkok. Branch `codex/g8-operations-monitoring`; runtime unchanged. Planning only: **no cleanup, cron invocation, SQL execution, deployment, credential read/export or remote setting/data change performed**. No additional charge/add-on or recurring job configured.

## Minimal proposed approach

Begin with one separately reviewed manual worker invocation, not an enabled recurring schedule. First collect fresh read-only state from Production `mdoaageegovutlxhhicz`. Then present exact eligible project-wide effects and transport for operator approval. Do not infer this approval from the owner reporting no errors/quota warnings or asking to begin G8.

Use [G6_OPERATIONS_READONLY.sql](G6_OPERATIONS_READONLY.sql) as the existing validated aggregate query. In the exact Production Dashboard SQL Editor, run the full file once and return only `operations_snapshot` JSON. The script begins READ ONLY and contains no application RPC, secret/object-path output or DML. This is neither a migration nor a worker invocation. It is a fresh eligibility check because data can change after the previous snapshot; not a repeat of the skipped audio diagnostic or backup/retention investigation.

Prior snapshot recorded zero queue jobs/expired ingests/tombstones, one expired recovery record and no maintenance rows. Those are historical values, not current cleanup authorization or evidence a cleanup already succeeded. Owner explained incomplete media uploads; no new media upload is required solely for this preflight. Do not copy credentials or run SQL against the historical backend.

## Historical operator snapshot and future approval candidate

Owner previously returned a read-only snapshot: six due jobs in `letter-audio-staging`, six matching-count staging objects and5,432,686 declared queued bytes, no leases/retries, max attempts0, all jobs linked to QA A/B. One expired recovery-consumption record; other returned eligible backlog/tombstone/missing-ready-object counts zero. One ready audio/object (5,432,542bytes), seven ready photos/objects (5,609,862bytes), two active letters, one Auth user/active Operator/approved Creator; all buckets private. Maintenance rows empty. Job oldest age31,674seconds at that snapshot. Evidence is historical/operator-supplied, not a current direct database query or proof of exact object-to-job identities.

This supersedes prior zero-audio/one-photo fixture counts: ready media now exists, but actual playback/bytes/Range authorization remains NOT TESTED. Counts/metadata alone do not establish that deferred acceptance. No request to upload more media or repeat the skipped diagnosis.

Future candidate, after resolving the review gates: **one manual authenticated request to the global Production worker** on canonical `/api/cron/cleanup`, with uploads/edits/reports/deletions/moderation and other callers paused during the check/run. Six staging jobs (~5.18MiB) and one expired recovery record are historical expected work only; no current eligible bound inferred. Approval must cover actual project-wide pruning/scans/cursor writes described below, not falsely promise a six-chunk-only filter. Healthy ready-photo/audio references and active letters should remain intact, verified after the call. No Auth user removal, historical-backend activity, recurring job or automatic second request.

If concurrent uploads/unknown state have appeared, project/deployment is mismatched or operator lacks private access to the existing Production CRON_SECRET, stop before sending. Do not rotate/extract another credential. Returned snapshot is not perpetual authorization for future new jobs.

## Project-wide effects requiring review

The deployed worker has no cohort/letter filter. One request can:

- Prune stale photo state and old session/rate/recovery records; expired audio ingests can be removed, their parts queued, and affected letter revisions advanced.
- Prune eligible reports/audits according to SQL retention/finite holds, each bounded100 rows; some other pruning is not row-bounded.
- Claim up to20 due jobs with five-minute leases and remove objects from the private image/audio/staging buckets, acknowledging success or retry state.
- Hard-delete eligible letter tombstones older than one hour without remaining jobs when job completion runs; not only the job's particular letter.
- Scan/reconcile older orphan objects and save maintenance cursor state, potentially enqueueing work for another future run. A soft40-second budget and route60-second limit do not guarantee every external request finishes.

It does not delete Auth users. No historical synthetic accounts or data on the test project may be touched. A fresh snapshot with non-QA/unknown jobs, unexpected tombstones/holds, missing ready-object metadata, large backlog or possible in-progress uploads requires review before any invocation. Aggregate totals alone cannot certify every eligible object; clarify discrepancies and concurrent upload state without exposing paths/content.

## Proposed transport — not authorized or executed yet

Exact future endpoint would be same canonical HTTPS `/api/cron/cleanup`, using existing Production `CRON_SECRET` bearer authorization from an operator-controlled server-side/terminal process. Standard Protection leaves canonical public, but route secret authentication remains mandatory before worker logic. Do not request or fetch the secret value in chat, from Vercel environment APIs, or from the unrelated local `.env.local`.

Before providing an executable invocation helper, review a design that prompts privately, keeps the value in process memory, sends it only to the exact approved HTTPS origin, follows no redirects, disables no TLS verification, persists/prints no headers or secrets and makes **at most one request**. Do not put a secret in command arguments, source, shell history, browser, query string or reports. An operator with no private access to the existing Production secret must stop rather than extract credentials or improvise a key rotation.

No deployment/protection bypass, public bucket, auth exception, temporary RLS change, fixture write or new Cron schedule is part of this design. The operator-local helper below is prepared for review; invocation approval remains pending, and no live request has been sent.

## Reviewed operator-local helper — do not run before approval

Prepared ignored `test-results/g8-operations/cleanup-once.ps1` plus `cleanup-once.mjs`. They are not application source, migrations or deployment inputs. PowerShell requires typed exact operation confirmation and prompts for **existing Production CRON_SECRET only** with hidden input, passes it by private stdin to Node, clears references/disposes the secure value/BSTR afterwards. It does not read `.env.local`, Vercel environment APIs or a Supabase server key. Runtime-managed string memory cannot be promised perfectly erased; no secret is intentionally written or printed.

Node validates configured base64 input policy, pins the HTTPS canonical endpoint, keeps TLS verification, disables cookies/redirect following, uses a70-second timeout and makes at most one fetch call. An exclusive local `cleanup-once-attempt.json` marker is reserved before any request. Existing marker prevents a rerun, including after a timeout or unknown result; never remove it to work around a STOP. Only safe aggregate fields/status/timestamps are persisted, no response body/error message/header/token/path. Response JSON is capped16KiB; malformed/redirect/HTTP error/partial/network failure stops without retry. Timeout is not a rollback of server effects. No actual attempt marker is created by preparation/tests at that path.

**Local validation PASS:14/14 mocked/local helper tests**, including pinned destination/auth header, exclusive persistent guard, no call on invalid confirmation/format, no redirect/retry,401/503/partial/transport failures, safe-field redaction, malformed/oversize bodies, aggregate typing and persistence failure. PowerShell AST syntax PASS without executing the script. Test credentials are inert synthetic values; local file guard uses separate ignored test directories. No live worker or real credential involved; counts are separate from main app tests and not a cleanup PASS.

## Future acceptance and stopping rules

Current review expands STOP requirements: unexpected eligible records, any new non-QA/null-parent job or unknown object correspondence, active concurrent uploads/edits/deletions/reports/hold changes/other worker, unknown holds/tombstones, project/team/deployment/backend/origin mismatch, missing private authorization, changed/unverified worker/helper/migration source, uncertain or present attempt marker, stale/incomplete preflight, or no new exact invocation approval. Stop without retry or changing a guard/credential. Existing SQL does not output every required population: stale pending audio, active ingest/lease totals and full hold state remain gaps even after refreshing it. Do not assume zero or alter that approved SQL silently.

Helper limitations retained: exclusive marker is local, not distributed idempotency; manual wrapper catch has no explicit nonzero exit, so outer exit alone never proves success; actual operator terminal/TLS configuration/private secret compatibility not verified. Fourteen earlier tests are historical/local only; current review reads source, pins it for future comparison and does not execute helpers or rerun tests. These limits and all global effects are detailed in the completion review. Report/Operator detail GETs also write audit/rate state and are not mutation-free diagnostics.

1. Validate fresh project/state and pause if eligibility or concurrent uploads are unclear. Get exact one-invocation approval; inspect/confirm secret-safe helper without exposing secret values.
2. Interpret200 as handler completion only; inspect safe aggregate `stale/scanned/completed/failed/remaining/scanComplete`. A503, timeout, partial scan, lease/backoff or unknown result is not an automatic retry authorization.
3. Obtain a fresh read-only snapshot after the approved invocation; compare eligible changes and cursor/job state. Empty queue or200 alone is not physical-erasure, backup expiry or full sweep proof. Do not promise a deletion deadline.
4. Retest bounded homepage/API-denial/redirect/protection health after the operation. Unexpected access/data behavior invokes the existing incident process; deleting more data is not a rollback.
5. Stop after one request and report actual effects. Further calls, recurrence, scheduler/source/deployment changes or paid services require their own concrete scopes. Do not silently enable a daily job to make the milestone complete.

Current status: **source/helper review PASS within stated static limits; current eligibility/source/authorization gates BLOCKED; live cleanup NOT TESTED / NOT AUTHORIZED**. Documentation/tabletop closure does not clear operations. Only next recommendation is refreshing the existing read-only snapshot; it is necessary but not sufficient for invocation readiness. Existing live media/security/retention exceptions remain unchanged.
