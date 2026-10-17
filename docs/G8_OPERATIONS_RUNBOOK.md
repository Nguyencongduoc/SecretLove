# G8 — Initial operations and monitoring runbook

**Current: G8.3 PAUSED by Owner after one approved request returned401.** Keep marker/evidence; do not retry, continue diagnostics or invoke the worker. Worker execution/cleanup result unconfirmed. Owner now authorizes README/documentation commit and GitHub push, not deployment or runtime changes. Historical NOT AUTHORIZED/NOT TESTED statements below refer to their recorded stages; latest decision is in completion review.

Latest [completion-gate review](G8_COMPLETION_REVIEW.md): read-only review/tabletop/documentation closure only. See [five incident scenarios](G8_INCIDENT_TABLETOP.md); actual cleanup/recovery NOT TESTED, Production invocation NOT AUTHORIZED. Do not act on a historical pending approval question or execute a helper from this runbook.

Date: 2026-10-17, Asia/Bangkok. Owner requests G8 after the [G7 report](G7_PUBLIC_ACCESS_REPORT.md). Branch `codex/g8-operations-monitoring` created and verified at the unchanged frozen runtime `4a169ff185bd464516cdebf24b066a7963ca05d6`; all uncommitted reporting work preserved. Initial scope: documentation/source review and bounded read-only checks only. No automatic monitoring service, recurring task, paid add-on or cleanup execution configured.

Actual first observation: [G8_OPERATIONS_REPORT.md](G8_OPERATIONS_REPORT.md),13/13 sampled GET checks PASS, recorded deployment READY/current binding confirmed. Owner subsequently reports no recent error/quota warnings; counts/window/resource headroom remain unverified. Runbook proposals below are not an enabled recurring monitoring service.

## Operating baseline and responsibility

- Owner/Administrator remains the operator for incidents, Creator approval, reports and deletion requests. No extra moderator/account is appointed.
- Canonical `https://secretlove-production.vercel.app`; same Vercel project `secretlove-preview` and Production backend `mdoaageegovutlxhhicz`. Historical test project remains excluded.
- Operator saved Standard Protection; G7 direct sampled canonical public, private API denial, Preview/generated protection and repaired legacy307 redirect passed. Those are prior actual samples, not newly rerun G8 checks.
- Preserve approved-Creator onboarding, server recipient gate, private Storage and exact Origin. Name/DOB is low assurance. No relaxation for an operational test.
- Source still has `crons: []`, Git auto-deployment disabled, and a privileged cleanup handler. Worker is not considered scheduled or operationally accepted. A GET to that handler can mutate data; **never treat `/api/cron/cleanup` as a read-only health probe**.

## G8 implementation order and acceptance

| Step | Scope | Acceptance / current state |
| --- | --- | --- |
| G8.1 — Baseline/runbook | Preserve G7 evidence, verify branch/source, define manual checks and incident handling | PASS for initial preparation/baseline; branch and runtime continuity checked; no new runtime behavior |
| G8.2 — Owner operational observation | Manually inspect aggregate request errors/duration/resource/usage indicators and available report/deletion intake; collect no private payloads | Initial sampled/qualitative handoff complete:13/13 checks PASS, deployment READY/current binding, owner reports no recent error/quota warnings. Numeric totals/window/resources and request handling NOT VERIFIED; no provider export/retention investigation/paid alerts |
| G8.3 — Cleanup operation design | Review current aggregate eligible state, exact global effects, secure invocation/recurrence and stopping rules | Static/source review PASS; historical six-job snapshot/prior14 local tests retained. Current preflight gaps and authorization BLOCKED; actual worker NOT TESTED/NOT AUTHORIZED |
| G8.4 — Incident/recovery readiness | Owner and five-scenario paper exercise; actual operations separately gated | [TABLETOP PASS](G8_INCIDENT_TABLETOP.md); actual containment/runtime rollback/DB/object recovery NOT TESTED. No recoverable-backup claim |
| G8.5 — Evidence closure | Track owner-accepted exceptions separately from actual acceptance | [Documentation/readiness review PASS](G8_COMPLETION_REVIEW.md); operational acceptance remains BLOCKED, underlying deferred tests NOT TESTED |

## Proposed manual observation — not a configured schedule

Suggested owner cadence: one short review during each day of initial limited operation and after a deployment/configuration change or user-reported error. This is a proposal for manual operation, not an agent promise to monitor later, a heartbeat, cron or an external uptime service. No large/load test.

Use a cookie-free browser or bounded request for public checks. Expected samples:

| Target | Expected result | Respond to deviation |
| --- | --- | --- |
| Canonical root |200 generic homepage | Inspect status/error first; distinguish provider failure and application login, do not bypass security |
| Canonical Creator and Operator APIs without identity |401 `AUTH_REQUIRED` | Unexpected private data is a security incident; do not copy response payload |
| Studio/Operator without identity | Redirect to application login | Do not confuse Creator login with Vercel Authentication |
| Old project hostname |307 to canonical; approved path/query preserved | Check alias/domain metadata; no repeated blind PATCH or redeploy |
| Review Preview and generated deployment roots | Vercel SSO redirect | Unexpected public content is a protection-scope incident |

No real letter-token URLs, password-recovery links, cookies, MFA material, DOB/name, private media paths or secrets in diagnostic output. Do not test signup/recovery/report POSTs, recipient brute-force, fixture uploads/deletions or cron as generic uptime checks. Functional writes require their actual approved scope.

Owner may view existing provider summaries for error counts, latency/duration, memory/resource usage, Storage/DB/egress quota and delivery errors without changing settings. Record only aggregates; do not export raw logs or add a drain. No current numeric headroom or configured alert has been verified. Suggested70% warning/90% capacity review thresholds from earlier preparation remain proposals, not active alerts or an unlimited-zero-cost guarantee. Respect zero additional charges; stop before upgrades, paid add-ons, extra providers or auto-upgrade settings.

For existing report/deletion intake, record received/open/overdue aggregate counts and next action. Do not resolve, suspend, reinstate, delete or promise a deadline just to complete the checklist. Those change access/data and need the appropriate request/verification and scope. Privacy/legal status and provider retention remain as previously documented; the owner declined further backup/log/retention verification, so do not repeat that investigation or claim it passed.

## Incident response

1. Capture UTC or Asia/Bangkok time, affected public path category, HTTP/error code, request ID if safe, and aggregate impact. Keep private contents/links and credentials out. Confirm whether failure is reproducible with a small bounded check; no uncontrolled retries.
2. For a private-content leak, cross-letter access or unexpectedly public protected hostname, use the already-approved same-project containment: restore Vercel Authentication / All Deployments and verify anonymous SSO denial. Record actual action/result. Do not confuse closing public access with revoking every application session or recalling delivered files.
3. Ordinary availability/redirect failures require diagnosis. Do not apply emergency deletion, rotate HMACs/keys, promote an older deployment, roll back migrations or alter Origin/Storage authorization as a shortcut. Such changes have separate exact review/approval.
4. Preserve minimal safe evidence; assign owner action, stop admission/promotion as needed and record cause only when supported. Runtime rollback and data restore are different operations; no verified backup/restore guarantee exists here.
5. Reopening after security containment is a new concrete approval gate with incident-specific checks. No automatic reopen or recurring secret-bearing browser requests.

## Cleanup constraints

Source re-review confirms secret comparison precedes `cleanupMedia()`, Node maxDuration60seconds and a soft40-second worker budget. Worker invokes stale/recovery/report/ingest pruning, leased Storage jobs and orphan scans across three private buckets. It is project-wide, can hard-delete eligible letter tombstones, and does not delete Auth accounts. It is not an A/B-only cleanup endpoint. See [detailed effects](G6_OPERATIONS_READINESS.md).

Before any real worker operation: fresh read-only inventory, explicit eligible scope/global effects, existing holds/active uploads, secure server-side transport, execution/recurrence budget and exact operator approval. Never place CRON_SECRET in a browser, URL, report, screenshot or shell history; do not remove route authentication or create a platform bypass. Current canonical public scope does not grant worker authorization. No invocation command is included in this initial runbook.

## Minimal incident/observation entry

```text
Time + timezone:
Check/path category:
Observed HTTP/error code or aggregate metric:
Evidence source: direct / operator / source-only
Status: PASS / FAIL / NOT TESTED
Impact:
Owner action and exact authorization, if applicable:
Retest/result:
Next review:
```

Store only sanitized observations; existing maximum30-day log policy accepts shorter history and is not verified provider retention. Source/test artifacts with private data remain ignored and excluded from deployment. No real incident, alert delivery, worker success, restore, full security acceptance or sustained uptime claimed by writing this runbook.
