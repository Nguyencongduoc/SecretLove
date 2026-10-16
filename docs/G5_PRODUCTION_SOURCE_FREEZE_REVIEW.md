# G5 — Production source-freeze review

Date: 2026-10-16, Asia/Bangkok. Owner requested G5, was shown the branch command and confirmed switching. Actual branch `codex/g5-production-source-freeze`; baseline HEAD `cc4f071b30604d91fed46d28a418c8d3ae7c3ad6`. Initial working tree contained exactly the 15 reviewed G4.4 files (14 tracked modifications and one untracked report); the index was empty. This review adds one G5 report and updates carried documentation, preserving application source.

**No new frozen commit exists.** G5 review prepares a concrete local-commit candidate; separate explicit manifest approval is required before staging/committing. Push, Git integration, remote settings, credentials, mail, users/fixtures, SQL, cleanup, aliases and deployment are not authorized by this task. No retry of the consumed PPD-06 attempt.

## Approved deployment intent, not deployment authority

| Item | Value / evidence boundary |
| --- | --- |
| Existing Vercel project | `secretlove-preview`, `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK` |
| Team | `team_KJpwyYId3LugWZ4U1jnF4h67` |
| Target | Production environment with protection throughout G6; public opening separately gated at G7 |
| Canonical origin | `https://secretlove-production.vercel.app` |
| Production backend | `secretlove-production`, `mdoaageegovutlxhhicz`, `https://mdoaageegovutlxhhicz.supabase.co` |
| Regions | Supabase Singapore `ap-southeast-1` operator-reported; Vercel `sin1` required, not remotely reverified here |
| Plan/data | Supabase Free/Nano/no added charges and G4.1–G4.3 completion are operator-reported, not direct provider verification |

The local `.vercel/project.json` project/team binding matches the approved IDs; only non-secret identity fields were used, never hosting values/auth files. The Vercel project is not assumed renamed. Operator reports new domain accepted and Supabase Site URL/callback settings saved; actual routing, TLS, protection, callback matching and SMTP remain NOT TESTED.

## Source review

- The only carried deployment-input changes relative to baseline HEAD are `config/public-deployment.json`, `scripts/preview-settings.mjs` and `tests/deployment.test.ts`. Runtime `src`, dependencies/package manifests, `vercel.json`, `.vercelignore` and migration history 001–009 are unchanged.
- Public mode pins the exact reviewed origin, new backend and existing project/team, requiring real provider Production context, modern public/server prefixes, independent security-key formats, explicit conservative audio cap and a non-placeholder contact. Tests exercise the actual binding/guard CLI and reject old/pending/substituted origins/backends, even when substitute environment settings agree with a substitute binding.
- Preview/historical owner-only behavior remains separate; old origin strings in that mode and historical runbooks are not the public Production target. No authorization/Storage/session/music/scene rule is weakened.
- Current docs preserve G4.1–G4.3 as operator attestations. They do not upgrade catalog/configuration results into live provider/HTTPS PASS or publish a completed privacy policy. No contact address is invented. Real credentials are neither read nor compared with source.

## Validation and upload selection

**PASS — G5 static review and candidate safety.** Evidence is retained under ignored `test-results/g5-source-review-1792167707152/`: `review-results.json`, the 164-file `source-manifest.json` and exact 16-file `commit-candidate-manifest.json`. The installed CLI's filename-selection evidence is `test-results/g5-upload-review-1792167707152/upload-manifest.json`. These manifests hash reviewed non-secret source/documents only, never environment/credential files or actual key values. No raw hashes or credentials are needed in this report.

| Check | Result | Actual evidence / limit |
| --- | --- | --- |
| Branch / baseline / index | PASS | Correct G5 branch, baseline HEAD unchanged, index empty; no staging or commit |
| Exact proposed commit set | PASS | 16 paths below; no extra changed/untracked eligible file |
| G4.4 source continuity | PASS | All 164 actual CLI-selected inputs byte-match the G4.4 validated manifest; no changed/missing/extra deployment inputs |
| Typegen / typecheck / lint / production build | PASS carried from G4.4 | Exact-input continuity verified; original exit 0 at 1 / 7 / 45 / 50 s; no fresh G5 application execution claimed |
| Unit/local integration tests | PASS carried from G4.4 | 124 PASS / 0 FAIL / 2 SKIPPED on the identical input set; mocked/local PostgreSQL boundaries, not hosted acceptance |
| Migration/runtime/package/config history | PASS | All nine migrations match reviewed G3 and baseline HEAD; runtime source, manifests/lockfile, vercel.json and exclusion files unchanged |
| Actual installed CLI upload selection | PASS | CLI 64.0.2 selection functions only, normal-directory/cloud-build mode; 164 files, 16 ignored entries; all source/public assets/nine migrations retained |
| Deployment exclusion probes | PASS | 24 deny / 17 retain cases; no credential/private-artifact paths selected |
| Filename-only read/network boundary | PASS | No secret values read; 0 network attempts and 0 other unapproved content-read attempts. The absent `.vercel/routes.json` auxiliary read was blocked before content access (one expected probe) |
| Git private-artifact probes | PASS | 11 ignored path probes, exact manifest excludes credentials/inventories/results/private plans; no force-add |
| Bounded credential-marker scan | PASS | 164 selected inputs plus 16 candidate files; only six known inert test markers in the selected tree, two in the commit candidate. No unexpected material found; this is not an exhaustive history/secret certification |
| Whitespace / preservation | PASS | Candidate trailing whitespace and git diff --check clean; no `.env.local` read/write, server restart, provider call or remote mutation |

No fresh typecheck/lint/test/build run was necessary: G5 changes only excluded documentation and verifies equality of every deployed input with the fully validated G4.4 candidate. If any deployment input changes before commit/deployment, invalidate this continuity assertion and rerun the affected checks. Inert test values and the local modern Storage/decoder skips are not operational credential/transport proof.

## Exact proposed local commit manifest — 16 files

```text
AGENTS.md
TASKS.md
config/public-deployment.json
docs/API.md
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/DEPLOYMENT.md
docs/G4_CONFIGURATION_PREPARATION.md
docs/G4_PRODUCTION_CONFIGURATION_STATUS.md
docs/G5_PRODUCTION_SOURCE_FREEZE_REVIEW.md
docs/PRD.md
docs/PRODUCTION_CHECKLIST.md
docs/PUBLIC_PRODUCTION_WORKFLOW.md
docs/SECURITY.md
scripts/preview-settings.mjs
tests/deployment.test.ts
```

Proposed commit message:

```text
fix: bind approved Production origin and backend
```

No `git add .`, `git add -A` or force-add of ignored files. At the later commit gate, compare every candidate against the final reviewed non-secret source/doc manifest, stage only these 16 explicit paths, inspect the index and stop if the file set or content changed. Creating this one local commit would not authorize push or deployment. It can archive the reviewed code while hosting prerequisites remain pending; if later source changes are required, review/test/freeze again.

The 16-file Git commit manifest and 164-file CLI upload manifest serve different purposes. Sanitized technical reports/instructions belong in the proposed commit; `.vercelignore` excludes all docs/reports, local environment/configuration files, private fixture inventories, references, dependencies and generated results from upload. Existing repository history, `.env.example`, `.npmrc` and historical reference assets are not certified for public redistribution by this bounded change review. No Git push is authorized.

## Deployment-attempt blockers

1. **Production hosting configuration/credentials NOT VERIFIED:** separately review the 12 Production-scoped app variables and provider system context without exporting values; privately configure exact APP_ORIGIN/new backend, mode, Corepack, audio limit, dedicated modern keys and independent HMAC/Cron secrets. The actual modern key's operational compatibility is not proven by inert local guard tests. Do not reuse local/Preview/retired keys or spoof provider system variables.
2. **Contact/SMTP/onboarding PENDING:** select and verify real privacy/report/deletion contact, provider/sender/domain, quotas/budget and approved inboxes; prepare token-hash invite/recovery templates. No mail or account creation is authorized. Operator/Creator registries were reported empty; exact Owner invitation/bootstrap/AAL2 and acceptance fixtures need separate scope. Provider policy must be reviewed beyond application recovery proof.
3. **Pre-G7 exposure/protection unresolved:** obtain current status-only evidence of Authentication All Deployments/owner-only, no unapproved exceptions/share links/bypasses, all actual canonical/generated/alias URLs, region/runtime/Corepack and Git auto-deployment OFF. A hostname's acceptance is not protection proof. If canonical access could be public, resolve that before any recipient fixture publication through effective verified platform protection or a separately approved default-closed server release lock/scoped acceptance design. No runtime release lock is currently implemented.
4. **Maintenance/operations readiness unresolved:** `crons: []` is unchanged, but a valid Cron secret can call the cleanup endpoint; no scheduler or invocation is approved. Review external callers and monitoring/rollback/egress/resource/retention/backup limits and plan eligibility. No stronger endpoint kill switch is claimed. Supabase Free/no backups was operator-reported; neither 30-day retention nor Storage-byte restoration/legal compliance is guaranteed.
5. **G5 authorization/freeze gates remain:** review this exact candidate, separately approve the local commit, then review a fresh exact deployment-action packet for the frozen revision after blockers are resolved. No one-attempt authorization is inferred from G5 or the old failed attempt.

## Post-deployment acceptance requirements — NOT TESTED, not local test failures

After an independently approved protected deployment and exact fixture/inbox/operation scopes, G6 must verify TLS/cookies/CSP/Origin, no private preloading, direct Auth signup denial, confirmed invite/recovery single-use, Operator AAL2/Creator ownership, real multi-connection races, private image/audio access and revocation, modern Storage GET/206/HEAD/416/anonymous/cross-letter/non-disclosure, >4.5 MB Vercel chunking/full streaming, Heart/text rings/Unicode/fallback/mobile/music continuity, trusted-IP rate limits, monitoring/rollback and scoped physical cleanup. A real transport/Auth/security failure blocks acceptance and G7. These target-only tests cannot be called PASS before deployment; they do not authorize premature deployment themselves.

The optional local modern Storage and external MP3 tests remain SKIPPED / NOT TESTED. No local fixture creation is authorized to remove those skips. No global cleanup or historical synthetic-account deletion.

## Recommendation

| Decision | Recommendation |
| --- | --- |
| Local source review / exact 16-file commit candidate | **GO**, on the evidence above; separate explicit commit approval still required |
| Completed source freeze | **PENDING**, no staged files or new commit; record the actual new SHA only after an approved commit |
| Protected Production deployment attempt | **NO-GO**, pre-attempt configuration/protection/contact/operational and exact-action gates remain open |
| Owner-only HTTPS acceptance | **NOT TESTED / NO-GO**, no approved deployed candidate or scoped real-target run |
| Public production release | **NO-GO**, requires successful G6 and separate G7 public-opening approval |

Stop after this review packet. Approval of one local commit would authorize only the exact 16-file candidate/message above, not push, settings, fixtures/mail, cleanup, aliases or deployment. Keep all G4/G6/G7 unresolved decisions visible rather than converting them into PASS through a source freeze.
