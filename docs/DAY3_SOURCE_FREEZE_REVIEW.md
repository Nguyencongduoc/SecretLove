# Prompt 07.5 — PPD-03 ledger and PPD-04 source freeze review

2026-10-15, Asia/Bangkok. Branch `feature/day-3-preview-acceptance`, base HEAD `3b55d83351132b86de7d1dc90f8778a251377f21`. This report reviews an uncommitted candidate; no new commit/revision or deployment exists as a result of this task. Operator-reported provider state is distinct from tests executed by the agent.

## Credential ledger reconciliation

| Consumer / credential | Current evidence | Status and remaining verification |
| --- | --- | --- |
| Modern secret `default` | Operator reports retired | CLOSED ON OPERATOR ATTESTATION; direct denial with the retired credential NOT TESTED. Do not retrieve/reintroduce it for this review |
| Legacy anon/service_role pair | Operator reports disabled | CLOSED ON OPERATOR ATTESTATION; direct retired-key denial NOT TESTED |
| Local public and privileged SDK / streaming consumers | Operator reports dedicated modern local keys, no PowerShell overrides, old Codex processes exited, Next rebuilt/restarted and all four connectivity checks passed after legacy disablement | PASS — operator-reported local cutover/connectivity. Does not prove direct private audio GET/Range or remote key retirement independently |
| Five previously retained Codex Node processes | Operator reports exited | Prior process-retention blocker reconciled on operator attestation; no new process environment inspection |
| Check command provenance | Reported as `pnpm check`; manifest defines `check:supabase`, no `check` script | Reported four outputs match check-supabase.mjs; exact command/time remains operator provenance, not an independently rerun provider test. This review does not read actual keys |
| Preview | Operator reports separate modern Supabase key and newly generated HMAC/Cron secrets; no deployment | Configuration attestation only; runtime provenance/protection/HTTPS tests NOT TESTED |
| GitHub workflow / Supabase Edge Functions | Operator reports none; no local definitions found in previous review | No known consumer; not a global remote account audit |
| Other jobs, integrations or copies | No additional known consumers identified | Require operator confirmation of any later-discovered consumer; no claim of exhaustive provider activity monitoring |

API-key retirement is reconciled using operator evidence. It is not direct provider-state or denial testing. Fresh Preview keys do not prove every previous application-secret consumer stopped trusting old values.

## HMAC / Cron boundary still unresolved

- `VERIFICATION_HMAC_KEY` signs v1 recipient gates and ten-minute recovery proofs. Local/other runtime trust in previously exposed values remains unconfirmed. Preserving historical gates is not permission to retain compromised keys indefinitely. Obtain a non-secret operator attestation identifying consumer/secret generation and retirement, without values or value hashes. If transition is needed, approve only exact acceptance-letter gate changes; leave historical data intact. No bulk rehash/key ring, signing-key rotation or old-key fallback. Existing sessions are not revoked merely by HMAC change.
- `RATE_LIMIT_HMAC_KEY` rotation forks counter subjects; confirm all serving consumers use approved unexposed generations, without counter clearing or test namespaces. Trusted deployment IP behavior remains an HTTPS gate.
- `CRON_SECRET` retirement needs confirmation that no caller/server still trusts the old generation. New Preview configuration is not evidence of old local caller retirement. Do not invoke valid cleanup: the worker is global, and no historical cohort deletion is approved. Future old/absent-token denial and scoped worker verification need separate authorization.

These are remaining deployment security gates, not secret-bearing source changes. Full PPD-03 must not be labeled independently verified or universally closed.

## Change review

The only application change is the private audio upstream header branch: modern `sb_secret_` uses `apikey` without opaque JWT Bearer; legacy JWT retains its compatibility header. Owner/recipient DAL authorization, private buckets, endpoint/object-path selection, Range/HEAD/416, no-store/redaction, cancellation/backpressure/deadline/concurrency and audio limits are unchanged. No dependencies or migrations changed.

Tests add modern/legacy full GET/Range/header/non-disclosure assertions, mocked owner/recipient route authorization failures and a strictly opt-in isolated live helper. The live helper remains deferred and skipped; no fixture creation or real provider calls in portable checks. Mocked DAL cases do not certify hosted ownership/session enforcement. Existing protected Preview tests are not run.

Deployment exclusions retain required source/manifests/guard/migrations. `.gitignore` preserves the owner-added `.vercel` rule, broadens fixture-inventory exclusion, excludes `.auth`, and excludes the superseded account-specific `docs/MODERN_STORAGE_FIXTURE_PLAN.md`. That local file is preserved without deletion and omitted from the proposed commit. Reviewed reports/runbooks are sanitized technical documents, intentionally proposed for version control but excluded from Vercel upload by `.vercelignore`.

Earlier operational reports preserve historical observations; new leading updates identify the operator-attested retirement and unresolved HMAC/Cron gates. The checklist's old verification-key continuity row was corrected to the approved new Preview HMAC and separate acceptance-fixture transition. No old instructions authorize deferred fixture writes.

## Commit and upload safety

Safety review PASS: the index is empty; the complete changed/untracked eligible set matches the exact 18-file allowlist. Eleven credential/inventory/state/result/private-plan path probes are Git-ignored. Bounded common credential-shape/assignment/private-key markers find no unexpected material; only four explicitly inert modern/invalid-JWT test literals occur. No `git add`, index write, commit or push is performed. These checks are not proof that arbitrary future files or all repository history contain no secrets. No credential file, private account inventory or actual secret value is read, compared, hashed or saved. The excluded local fixture plan remains intact.

Actual CLI 64.0.2 offline normal-directory selection was repeated: 143 selected files, 16 ignored entries, all source/8 migrations retained, 19 deny/15 retention cases, no credential/private-artifact paths and zero network attempts. The absent auxiliary routes.json probe was blocked before content access; no override exists. This is filename-selection evidence, not an upload/deployment. Source/docs manifests hash reviewed non-secret inputs only, never credential files or actual values.

The earlier tracked reference images/video, historical summary artifacts, `.npmrc` and `.env.example` are not new candidates in this change set. This task neither removes them from existing history nor certifies historical assets for redistribution. The proposed commit is restricted to the exact reviewed allowlist below; do not use `git add .`, `git add -A` or force-add ignored files.

## Proposed exact commit set — 18 files

```text
.gitignore
.vercelignore
TASKS.md
src/lib/server/audio-response.ts
tests/audio-response.test.ts
tests/audio-routes.test.ts
tests/audio-live.test.ts
docs/DAY3_CREDENTIAL_SECURITY_REVIEW.md
docs/DAY3_PREDEPLOYMENT_SECURITY_REVIEW.md
docs/DAY3_SOURCE_FREEZE_REVIEW.md
docs/DAY3_DEPLOYMENT_READINESS.md
docs/DAY3_PREVIEW_ACCEPTANCE_REPORT.md
docs/DEPLOYMENT.md
docs/PREVIEW_OPERATOR_CHECKLIST.md
docs/PRODUCTION_CHECKLIST.md
docs/MODERN_STORAGE_AUTH_TEST_REPORT.md
docs/PREVIEW_AUDIO_ACCEPTANCE.md
docs/PREVIEW_ORIGIN_PLAN.md
```

Proposed commit message:

```text
fix: support modern Storage keys and prepare protected Preview
```

No commit is authorized or made by this preparation. A source freeze is only completed after the exact reviewed candidate is committed under separate instruction and its resulting revision recorded. Any input change requires appropriate renewed review/checks.

## Validation and recommendation

| Check | Result | Actual evidence / limits |
| --- | --- | --- |
| Type generation + typecheck | PASS | `next typegen` (14 s), `tsc --noEmit` (7 s), exit 0 |
| Lint | PASS | `eslint .`, exit 0 (89 s) |
| Portable unit/in-memory PostgreSQL tests | PASS | Vitest: **80 PASS / 0 FAIL / 2 SKIPPED**, eleven files, exit 0 (21 s process wall time) |
| Optional modern live Storage / external MP3 | SKIPPED / NOT TESTED | Both opt-ins absent; no provider request or fixture mutation |
| Production build | PASS | `next build --webpack`, exit 0 (221 s); baseline experimental proxy-buffer/no-cache notices, no detected build error |
| Source continuity | PASS | All 143 copied deployment files still match working tree after checks. All 8 migrations match HEAD after Git checkout line-ending normalization |
| Git candidate/whitespace | PASS | 18 reviewed files, empty index, bounded marker check and 11 deny probes; `git diff --check` exit 0 |
| Hosted guard/modern Storage/HTTPS/browser acceptance | NOT TESTED | No deployment, actual hosting-secret validation, SMTP, live browser or provider transport tests |

Checks ran in a fresh same-drive source snapshot under ignored `.pnpm-store`, using existing installed dependencies via a local junction. Child environment was limited to OS/path settings and CI/telemetry flags, with no env files, real app/Preview credentials, test login inputs or live/file opt-ins. Direct installed tool entrypoints match package scripts; no pnpm env loader/provider helper/fresh install ran. The existing local server's `.next` output was not changed. Two initial audit-helper attempts stopped before checks (sandbox junction permission; strict byte comparison encountering ordinary Windows checkout line endings); the corrected harness completed, with no application or migration repair.

Credential-free evidence outside deployment inputs:

- [Validation results](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-source-freeze-20261015/validation-results.json), [validated deployment-source manifest](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-source-freeze-20261015/source-manifest.json).
- [Exact commit-candidate manifest](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-source-freeze-20261015/commit-candidate-manifest.json), [actual CLI selection](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-upload-exclusions-20261015-1792044184281/upload-manifest.json).

**GO for the reviewed 18-file source-freeze candidate.** This is readiness to create the proposed commit under separate instruction, not a completed freeze or deployment authorization. PPD-04 has no new frozen Git revision yet. API retirement is operator-attested; direct denial remains NOT TESTED and old application-secret consumer retirement remains unresolved. Do not report full PPD-03 independently verified.

**Private Preview attempt, owner-only acceptance and public production remain NO-GO** for their separate unresolved protection/configuration/authorization, HMAC/Cron, HTTPS/Storage and privacy/operational gates. Modern actual GET/206/HEAD/416/cross-letter/anonymous/non-disclosure/>4.5 MB Vercel streaming remain NOT TESTED. Stop after reporting; no commit/push/deploy, remote changes, cleanup, fixtures or Prompt 08.
