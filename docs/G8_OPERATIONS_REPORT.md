# G8 — Initial operational observation

Current follow-up: Owner pauses G8.3 after one approved helper request returned401 at2026-10-17T09:34:30.688Z. Attempt FAIL, worker execution/post-cleanup results unconfirmed; no retry authorized. Documentation/readiness closure remains distinct from operational acceptance. README/documentation commit/push requested; no deployment or data operation.

Latest review: [G8 completion gate](G8_COMPLETION_REVIEW.md) and [incident tabletop](G8_INCIDENT_TABLETOP.md). Documentation/tabletop scope closes with recorded gaps; no completed test repeated and no live operation executed. Actual cleanup/containment/restore remain NOT TESTED; current invocation BLOCKED and NOT AUTHORIZED. Historical public samples and operator attestations below retain their original scope.

Date: 2026-10-17, Asia/Bangkok. Branch verified `codex/g8-operations-monitoring`; frozen runtime `4a169ff185bd464516cdebf24b066a7963ca05d6`. User requests starting G8. This report records actual bounded read-only observations, not newly enabled monitoring/cleanup or complete release certification.

## Current status

**G8.1 baseline/runbook PASS. G8.2 public health/security samples PASS13/13; owner reports no recent error/quota warnings, without numeric counts or a time window. G8.4 tabletop and G8.5 documentation review now complete; full operational acceptance BLOCKED.** G8.3 live worker and actual recovery acceptance remain separate. G7's owner-accepted NOT TESTED limitations are preserved.

The observation ran on 2026-10-17 from12:46:13 to12:46:19 Asia/Bangkok (05:46:13–05:46:19 UTC). Each path received one HTTPS GET with no Cookie/Authorization and manual redirect handling. No cron, recipient verification, report submission, recovery mail, load test, account/fixture write or private token URL used. No raw page content, private data, credentials, CSP nonce or redirect query retained in evidence.

## Actual HTTP results

| Target | Expected / observed | Status |
| --- | --- | --- |
| Canonical homepage |200 | PASS |
| Creator login page |200 | PASS |
| Privacy page |200 | PASS — availability only, not final policy validation |
| Deletion-request information page |200 | PASS — availability only, no deletion submitted |
| Report form page |200 | PASS — availability only, no report submitted |
| Creator `/api/letters` |401 `AUTH_REQUIRED` | PASS |
| Operator `/api/operator/reports` |401 `AUTH_REQUIRED` | PASS |
| `/studio` |307 to same-origin HTTPS `/login` | PASS |
| `/operator` |307 to same-origin HTTPS `/login` | PASS |
| Old hostname root |307 to HTTPS canonical `/` | PASS |
| Old hostname `/login?g8_probe=1` |307 to canonical `/login`, synthetic query preserved | PASS |
| Review Preview root |302 to Vercel `/sso-api` | PASS |
| Recorded immutable deployment root |302 to Vercel `/sso-api` | PASS |

For all nine sampled application routes, booleans passed for private/no-store cache, CSP presence, default-src self, nonce-bearing script policy, object-src none, frame-ancestors none, same-origin media, nosniff, no-referrer and HSTS. Non-application redirects were not judged against application-header expectations. This is not exhaustive CSP analysis or every private route/media authorization test.

Per-request observed elapsed time ranges115–1,949ms, including client network/TLS and response handling. It is a tiny sequential sample, not p95, a performance budget result, Function duration, cold-start diagnosis or sustained uptime. No timeout/5xx observed in these13 requests; provider-wide incident counts remain unknown.

## Deployment and source baseline

Read-only Vercel CLI inspect reports the exact recorded deployment READY / Production, exit0. Safe canonical alias metadata points to `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa` in project `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`, without a canonical redirect. Local project link matches approved project/team. No build logs, environment values or credentials requested/exported; no deploy or provider setting changed.

Source retains `crons: []` and disabled Git auto-deployment. Runtime/source continuity checked against the167-input frozen allowlist; documentation-only changes do not require repeating earlier passing app checks. Current reporting validation and whitespace checks are separate from the prior typecheck/lint/build139 portable tests/22 mocked MFA browser tests; no new app-suite PASS invented.

Evidence is ignored under `test-results/g8-operations/initial-observation.json` and `deployment-baseline.json`. Only sanitized aggregate/status/timing/boolean metadata retained; private artifacts remain excluded from Git/deployment source.

## First operational log entry

```text
Time: 2026-10-17 12:46 Asia/Bangkok
Scope: one sample per13 approved public/denial/protection/redirect paths
Evidence: direct HTTPS GET; safe CLI deployment/alias metadata
Status: PASS13/13 HTTP samples; recorded deployment READY/current binding PASS
Incident observed in this sample: none
Action: record baseline; no remediation or remote mutation required
Limits: no sustained uptime, provider usage/error totals, private audio or worker proof
```

This entry does not mean there were no incidents outside the sampled requests. No alert delivery or on-call automation tested/configured.

## Subsequent owner Dashboard response

Owner replies “không” to the combined question about recent Vercel5xx/Function timeouts and Supabase Database/Storage/Egress quota warnings. Record **no such errors/warnings reported — operator attestation**, not a direct provider query or measured zero count. No period, numeric usage/headroom, duration/memory totals or warning configuration supplied; these remain NOT VERIFIED. This closes the requested qualitative handoff without asking to repeat declined backup/log/retention work. It does not prove zero costs, absence of every incident or unlimited capacity.

## Remaining operational work

1. Qualitative Dashboard handoff received: none reported. Numeric resource/usage/error history remains NOT VERIFIED; no further raw-log/secret request or declined backup/retention investigation initiated.
2. [G8 cleanup design](G8_CLEANUP_PLAN.md) retains a historical operator snapshot: six due unleased/unretried QA A/B staging jobs (5,432,686 declared bytes), one expired recovery record, other returned eligible counts zero; one ready audio, seven photos/two active letters, missing-object counters zero/all buckets private. Not current eligibility or playback authorization. Helper source reviewed, prior14/14 mocked/local tests and syntax PASS carried without rerun. Current review identifies preflight coverage/guard/runtime limitations; fresh read-only state and explicit authorization needed, live invocation NOT AUTHORIZED by latest scope. No schedule, deletion deadline or credential disclosure.
3. Five-scenario tabletop completed as paper decisions only; actual report/deletion handling, containment drill, restore/rollback and deferred live media/security tests remain NOT TESTED. No account removal, fixture mutation or risk-free/compliance claim.

Proceed with bounded G8 operational preparation/manual observations under the zero-extra-charge constraint. No background monitoring task, repeated polling, cron or paid service is implied. No source-feature change, commit/push, deployment, API mutation, credential operation, Supabase write or cleanup performed in this G8 observation.
