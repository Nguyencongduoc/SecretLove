# G7 — Public Access completion report

Date: 2026-10-17, Asia/Bangkok. Prepared on `codex/g7-public-access` from actual recorded results; no new remote test execution by this reporting step.

## Decision

**G7 public-opening actions: COMPLETE WITH OWNER-ACCEPTED EXCEPTIONS.** Owner explicitly approved opening with the recorded NOT TESTED risks, reported Standard Protection saved and subsequently confirmed canonical homepage access. The separately approved old-hostname redirect repair succeeded. This closes the public-opening work, not all G6 acceptance requirements or a complete security/operations certification. No skipped result is relabeled PASS.

**GO to G8 preparation and bounded read-only operational review.** Destructive/global cleanup, recurring schedules, exports, credentials, provider settings, accounts/fixtures, new deployments and paid services are not authorized by this transition. Detailed operational actions retain their exact gates. Full evidence-based release-readiness recommendation remains NO-GO for unqualified acceptance while the listed gaps persist; the owner elected to proceed under those known limitations.

## Production target

| Property | Recorded value / evidence |
| --- | --- |
| Canonical | `https://secretlove-production.vercel.app` |
| Vercel project / team | `secretlove-preview`; `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`; `team_KJpwyYId3LugWZ4U1jnF4h67` |
| Runtime commit | `4a169ff185bd464516cdebf24b066a7963ca05d6`; local continuity checks match167 deployment inputs |
| Canonical deployment | `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa`; direct alias metadata confirms binding after redirect repair |
| Production backend | `mdoaageegovutlxhhicz`; historical test backend excluded |
| Protection | Operator-reported Vercel Authentication / Standard Protection; direct sampled canonical public and Preview/generated protected responses consistent with intended scope |
| Source schedule / Git deployment | `crons: []`, `git.deploymentEnabled: false`; not newly changed or remotely scheduled |

No new deployment, application feature, migration, environment/key change, Supabase mutation, cleanup, email, Git commit or push performed during G7. Operator performed protection save; agent performed exactly one separately approved project-domain redirect PATCH. Dashboard-wide bypass/settings inventory was not independently re-certified by these HTTP samples.

## Actual acceptance results

| Check | Status | Evidence |
| --- | --- | --- |
| Canonical public homepage | PASS | Direct no-cookie/no-Authorization HTTPS GET200; browser renders SecretLove; owner finally confirms “đã oke” |
| Anonymous Creator collection API | PASS | `/api/letters`401 `AUTH_REQUIRED` |
| Anonymous Operator reports API | PASS | `/api/operator/reports`401 `AUTH_REQUIRED` |
| Studio and Operator pages | PASS | Initial post-save suite: each307 to canonical `/login`, not platform sign-in |
| Preview root | PASS |302 to Vercel `/sso-api` in post-save and post-repair samples |
| Generated deployment root | PASS |302 to Vercel `/sso-api` in both samples |
| Legacy hostname root redirect | PASS AFTER REPAIR | Initial404 `DEPLOYMENT_NOT_FOUND`; after one approved PATCH307 to exact HTTPS canonical `/` |
| Legacy login path/query | PASS |307 preserves `/login` and synthetic `legacy_probe=1`; no real token-bearing URL used |
| Domain/alias binding after repair | PASS | Safe readbacks show correct307 alias and unchanged canonical deployment |
| Runtime/source continuity and report hygiene | PASS — local |167 non-secret deployment inputs match frozen manifest; scoped reporting scans/whitespace checks, empty Git index. No credential file read |

Initial post-save suite:7 PASS /1 FAIL (redirect). Post-repair suite:7/7 PASS, plus metadata readbacks. These are overlapping bounded suites, not14 distinct end-to-end security tests. The initial failure remains historical evidence. Owner's intermediate homepage failure was later resolved by confirmation; its original browser/session cause remains unknown.

## Deferred evidence and accepted limitations

| Requirement | Status / remaining effect |
| --- | --- |
| Modern private full-song transport, bytes above4.5MB, HEAD/206/416, recipient anonymous/cross-letter/revoked-media denial | NOT TESTED on target; original suite stopped before media requests. Operator explains incomplete uploads; no application defect inferred. Optional isolated `tests/audio-live.test.ts` remains SKIPPED |
| Comprehensive locked HTML/RSC/preload/media, second-Creator ownership, negative gates/rate-IP/Origin and recovery replay/session-expiry tests | NOT TESTED where recorded G6 evidence absent; sampled APIs and local tests do not establish these outcomes |
| Audio audibility/continuity, mobile/performance/fallback matrix | Only previously reported limited visual/manual evidence; unmeasured cases NOT TESTED |
| Report/hold/deletion/worker/physical deletion/rollback operations | NOT TESTED operationally. Queue snapshot empty is not cleanup proof; worker is project-wide and unscheduled |
| Provider backup/log/retention verification | SKIPPED BY OWNER / NOT VERIFIED; do not restart the declined verification. Logs maximum30days, shorter Free/Hobby history accepted; no verified provider erasure/backup guarantee |
| Current numeric quota/headroom and alert configuration | NOT VERIFIED; owner reported no warnings without complete numeric metadata. Zero-extra-budget remains a constraint, not proven free unlimited usage |

No current redirect defect remains after the bounded repair. Other untested areas are retained as evidence gaps, not silently declared working, waived security code or invented defects. General “all okay” confirmation applies only to the instructed observed flow. User-facing draft policy is not a legal-compliance certification.

## Handoff to G8

Owner requests G8 after this report. Present a new `codex/g8-operations-monitoring` branch command, preserve uncommitted reporting work and verify branch before G8 work. Begin with a read-only runbook and manual monitoring/incident responsibilities for the existing public canonical, API denial, protection/redirect behavior, error and queue indicators under the zero-extra-charge constraint. No background automation is implied by “monitoring”.

Previously approved containment: restore All Deployments on unexpected sensitive exposure/protection failure, verify denial and investigate. Do not roll back SQL, rotate keys, delete data, invoke global cron or serve private media publicly as an improvised fix. Any planned worker/scheduler execution requires its real project-wide scope and authenticated transport reviewed separately. No automatic G8 cleanup or paid add-on.

Evidence: [G7 execution record](G7_PUBLIC_ACCESS_RELEASE.md), [completed redirect repair](G7_LEGACY_HOSTNAME_REPAIR.md), [G6 evidence limits](G6_CURRENT_ACCEPTANCE_STATUS.md). Sanitized operational outputs are ignored under `test-results/g7-public-access/`; private inventories and credentials remain excluded from Git/deployment source.
