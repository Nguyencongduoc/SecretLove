# Prompt 07.5 — final pre-deployment security review

Latest PPD-03/04 update (2026-10-15): operator reports modern secret `default` retired, legacy anon/service_role disabled, dedicated local modern keys, old Codex processes exited, rebuild/restart and four connectivity checks PASS after disablement. Preview has no deployment and uses separate modern API/HMAC/Cron credentials. API retirement is closed **on operator attestation**, not direct provider denial tests. Local/other consumers of old HMAC/rate/Cron secrets remain unconfirmed. Earlier retirement findings below are historical; current source-freeze review, checks and exact proposed commit set are in DAY3_SOURCE_FREEZE_REVIEW.md. No commit, deployment, remote changes, real-secret reads or fixture operations authorized/performed by this follow-up.

2026-10-15, Asia/Bangkok. **Protected Preview deployment attempt: NO-GO pending the actions below.** Owner-only acceptance and public production remain independently NO-GO. This review authorizes no deployment or remote change.

## Artifact and evidence boundary

Branch verified: `feature/day-3-preview-acceptance`. HEAD: `3b55d83351132b86de7d1dc90f8778a251377f21`. The tree is **not clean**: the earlier modern Storage patch in `src/lib/server/audio-response.ts`, its test changes, untracked live/route tests and preparation documents remain uncommitted, alongside the owner's `.gitignore` addition. All were preserved. HEAD alone does not identify the patched artifact; freeze a reviewed commit or explicitly approved workspace manifest before deployment. No commit, push or Git connection was performed.

Local link identifies `secretlove-preview`, project `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`, org `team_KJpwyYId3LugWZ4U1jnF4h67`. This proves the **local link**, not current remote ownership/protection/settings. Required product/architecture/database/API/security/readiness/recovery/setup documents and relevant source/tests were reviewed. Ordered migrations 001–008 are unchanged and covered by local in-memory PostgreSQL tests. Remote application remains the earlier operator-confirmed evidence; no remote SQL/re-audit occurred now.

No real secret values or environment files were read, printed, copied, hashed or persisted. No env pull, credential-bearing dashboard inspection, authenticated remote API call, fixture query, mail, account/fixture mutation, cron, alias or deployment action occurred. Only documentation and non-secret local audit snapshots/artifacts were written; application/configuration/migration source was not edited.

## Configuration findings

| Check | Result | Evidence and limitation |
| --- | --- | --- |
| Intended canonical origin | PASS — format only | Exact operator intent: `https://secretlove-review-ngcd.vercel.app`; HTTPS, no path/query/credentials/trailing slash. Accepted by the guard with inert test settings. **Alias allocation, ownership, DNS/TLS and routing NOT VERIFIED**; no request to the candidate host |
| Expected isolated Supabase selection | PASS — reference consistency only | Expected ref `samelfoyrujhcywcnofw`, URL `https://samelfoyrujhcywcnofw.supabase.co`, from prior approved selection. Guard accepts this pair and rejects a mismatched pair. Actual hosting values/live connectivity NOT VERIFIED |
| Nine Preview variables / four Secret types | OPERATOR-REPORTED | Names/scopes/types reported by operator; no dashboard independently inspected or values accessed. Presence/type does not establish format, project pairing or retirement of old keys |
| Build guard | PASS — source/unit/inert checks | `vercel.json` runs guard before build, frozen pnpm installation and disabled Git auto-deploy. Guard rejects non-Preview/non-Vercel, invalid exact HTTPS origin/project pair, missing/shared server credential, short/noncanonical/shared security keys, deployed test-rate namespace and raised audio cap. It does not prove alias/protection/isolation/credential validity, enforce modern key type, or pin this particular origin/ref |
| Modern private audio auth | PASS — source/mocked tests | Direct Storage request sends modern keys in `apikey` without JWT Bearer; legacy JWT compatibility remains, with no approved Preview fallback. Owner/recipient authorization, private buckets, membership/path validation, Range, no redirect/cache, backpressure/cancel and limits preserved |
| Server SDK | PASS — static design; live compatibility NOT TESTED | Existing server-only client has no browser headers/cookie adapter or persisted/auto-refreshed Auth state. Privileged operations still require explicit DAL/RPC authorization. No actual modern provider request made here |
| Runtime/Origin/CSP/cookies | PASS — source; HTTPS behavior NOT TESTED | Node routes and 60-second audio/commit/cleanup durations; 45-second stream deadline. Exact Origin, private cache and recipient/recovery Secure/HttpOnly/Lax host-cookie behavior preserved. Effective hosting resources, HTTPS cookies, trusted-IP and CSP require target verification |
| CLI upload exclusions | **PASS — resolved in authorized follow-up** | Initial review found no `.vercelignore`; the subsequently authorized denylist now passes actual CLI 64.0.2 offline directory selection. 143 files selected, zero credential/private-artifact paths; source and all eight migrations retained. See follow-up evidence below. No upload occurred |

Operator-reported names: `APP_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `PREVIEW_SUPABASE_PROJECT_REF`, `MAX_AUDIO_UPLOAD_BYTES`, `SUPABASE_SERVICE_ROLE_KEY`, `VERIFICATION_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY`, `CRON_SECRET`. Expected four Secret entries are the server credential, two HMAC keys and cron secret; privately confirm names/scopes. No further manually supplied application server secret was identified. The guard also requires provider-injected `VERCEL=1` and `VERCEL_ENV=preview`; verify system-variable exposure and remote build/install commands. Do not deploy test credentials or `SECRETLOVE_TEST_RATE_NAMESPACE`.

Privately confirm the dedicated credential is modern `sb_secret_`, project/key pairing, independent canonical base64 security keys of at least 32 bytes, and intended **16,777,216-byte** audio cap. This report does not attest to unseen values. Secret classification hides stored values; it does not establish validity or revoke older credentials. [Vercel Config/Secret variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

## Deployment Protection and manual alias

Operator-reported: project creation, Preview-only settings, Authentication/Standard Protection, Git auto-deploy disabled and no deployment. **Unverified:** effective scope, owner-only memberships/grants/share links/bypass/exemptions, domain classification/availability, runtime/resources and remote command overrides.

Directly opened Vercel documentation updated September 15, 2026 lists Authentication + **All Deployments on all plans, including Hobby**, without an additional protection charge. An older conflicting search-cache result is superseded. No paid upgrade is inferred or authorized. [Current scope](https://vercel.com/docs/deployment-protection), [current availability](https://vercel.com/docs/deployment-protection/usage-and-pricing)

Standard excludes production domains. Pointing a manual alias at a Preview artifact does not establish protection. Before attempting deployment, operator must confirm **Authentication + All Deployments and effective owner-only access**, including grants/share links/bypass/exceptions. The toggle alone is insufficient; platform cookies are URL-specific. [Access rules](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)

Leave the existing Production-assigned hostname untouched. `secretlove-review-ngcd.vercel.app` is **a candidate, not an allocated alias**. A later exact packet must approve one protected `--target=preview` cloud deployment and binding only this candidate to the actual returned Preview artifact under the verified account/org. Confirm protection on the generated URL before binding and every alias afterward. Conflict/missing protection ends the attempt; no alternative hostname, public bootstrap, Production promotion, wildcard or Origin bypass. Canonical routing/TLS/protection must be verified before separately authorized callback configuration. The current format guard does not require the candidate to resolve during build; no bootstrap bypass is needed.

## New Preview HMAC and minimum recipient-gate transition

No old/new secret comparison was performed. If the new Preview verification HMAC differs, historical name/DOB digests **fail closed on Preview**. Code supports one verification key, requires stored version 1 and has no key ring; raw DOB is not retained, so transparent rehashing is impossible. Creator Auth/content/media are not encrypted by this HMAC. Old gates can still work in an old-key environment, but differently keyed servers cannot reliably share gate edits for the same letters.

**Changing this HMAC does not itself revoke recipient sessions or share links.** Their digests use SHA-256; publication/access version/expiry/revocation enforce access. Do not claim strong identity verification or automatic session invalidation.

Minimum plan, **not authorized/executed**:

1. Approve only exact synthetic A/B test-letter IDs and existing normal Creator logins needed for HTTPS isolation acceptance. No historical/cohort rewrite. If new Preview fixtures are needed, request a precise separate creation plan; the deferred local fixture remains unauthorized for creation.
2. If an approved letter is published, unpublish using normal owner Preview Studio/API and its current version; draft letters omit that step.
3. On the Preview origin using the new HMAC, save both known synthetic name and DOB through the existing editor/API. This generates a new nonce/digest and advances access/version state. Preserve body, media, heart configuration and passphrase hash unless separately approved. No direct private-table writes or invented key version 2.
4. Republish only if approved, generating a new link; verify new recipient sessions and denial of obsolete link/session access. Reserve these gate edits for Preview; do not later overwrite them from the old-key local Studio.

Required writes are only approved letters' normal unpublish/save/publish transitions. Exact IDs/inputs/lifecycle permissions must be approved first; no migration, account/password change, cleanup or historical modification. A transition plan can precede initial protected deployment, but successful recipient verification remains an acceptance gate.

The same HMAC signs ten-minute recovery proofs: old application proofs fail under a new key; fresh approved callbacks issue new proofs, with migration 007 single-use consumption retained. Supabase OTP/JWT validity and normal Creator login are not themselves rotated by an application HMAC change. Fresh callback/delivery/replay testing requires separate mail authorization; do not reset passwords or send links now.

New rate HMAC creates different DB bucket subjects; old counters persist until normal expiry, with no historical continuity or authorization to clear them/raise limits. New cron secret requires private caller updates but does not scope cleanup to new fixtures. Preview receives no automatic Production-only cron schedule; do not invoke global cleanup on the historical shared project.

## Previously exposed credential retirement

Status: **NOT VERIFIED**. New Preview values and Secret labels do not retire compromised values. Obtain private operator confirmation, never values.

- Inventory every consumer of previously exposed Supabase server credentials, including local tooling/CI/old artifacts. Replace with dedicated modern credentials, verify in a separately approved test and retire compromised keys. Delete an exposed modern secret key; deactivate legacy API keys after updating consumers. Adding a modern key alone leaves legacy keys valid. Verify retired credentials no longer grant privilege. Follow provider guidance for legacy JWT trust if necessary; do not automatically rotate/revoke Auth signing keys or equate a leaked API token with a leaked signing secret. [Supabase key retirement](https://supabase.com/docs/guides/getting-started/api-keys), [signing-key lifecycle](https://supabase.com/docs/guides/auth/signing-keys)
- Do not preserve/reintroduce exposed verification/rate HMAC or cron values to make fixtures pass. Plan exact gate/session transitions and fresh recovery proofs, update consumers and retire old processes/artifacts/callers still trusting them. No key ring or bulk DOB rehash exists. Keep keys independent.
- Historical fixtures may remain intact with old-key verification unavailable on Preview; this does not justify retaining a compromised privileged credential. Existing recipient sessions need separately authorized lifecycle revocation where required, not an assumed consequence of key rotation.
- Do not overwrite `.env.local`, commit replacements, dump/pull hosting env or include values in evidence. If controlled retirement is unresolved, keep NO-GO; no exposed legacy fallback.

## Safe local verification

An allowlisted source/config/test/SQL snapshot excluded every environment file, local fixture inventory and Vercel credentials/link. Tools ran with a clean child environment containing ordinary OS/path settings plus CI/telemetry flags, no real app/Preview credentials or live/file opt-ins. Existing installed dependencies were reused; no fresh package install/dependency audit ran. These are package-script-equivalent tool entrypoints, not an actual Vercel build with hosting values.

| Check | Result | Evidence |
| --- | --- | --- |
| Type generation/typecheck | PASS | `next typegen`, `tsc --noEmit`: exit 0 |
| Lint | PASS | `eslint .`: exit 0 |
| Portable tests | PASS | **80 passed / 0 failed / 2 skipped**, 11 files; in-memory PostgreSQL and mocked provider/authorization transport |
| Optional modern live Storage | **SKIPPED / NOT TESTED** | Owner-deferred; no provider request or remote fixture creation |
| Optional external MP3 | SKIPPED | No file opt-in |
| Production compilation | PASS on retry | `next build --webpack`: exit 0 without env files/real credentials. First cross-drive snapshot failed resolving linked Next modules; identical source on drive D passed. No app/config fix or limit change |
| Source continuity | PASS | All **140** copied source/config/test/SQL files still match working tree; includes immutable 001–008. No secret-file hash computed |
| Actual hosting guard/key values, HTTPS/SMTP/media, fresh dependency install | NOT TESTED | Local/inert checks do not certify these |

Credential-free artifacts: [initial checks](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-predeploy-20261015-1792007693852/audit-check-results.json), [successful build retry](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-predeploy-20261015-1792007693852/build-retry-results.json), [source manifest](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-predeploy-20261015-1792007693852/audit-source-manifest.json). This is a source manifest, not the CLI upload manifest. No actual-value client-secret scan under the secret-read embargo.

## Operator actions and GO/NO-GO

| ID / severity | Required action | Current disposition |
| --- | --- | --- |
| PPD-01 / High | Review/add explicit CLI exclusions or approve an audited source-only upload root; verify upload manifest without reading secrets | **RESOLVED / PASS** in authorized local follow-up below; no remote upload |
| PPD-02 / High | Confirm All Deployments + effective owner-only access and full alias/account/org inventory | NOT VERIFIED |
| PPD-03 / Critical if compromised privilege remains | Privately confirm exposed-key retirement and HMAC/cron consumer transition | NOT VERIFIED |
| PPD-04 / Artifact traceability | Freeze reviewed source including modern patch/tests; record exact approved revision/manifest | Dirty tree, no frozen deploy artifact |
| PPD-05 / Configuration | Privately attest nine names/scopes/types/formats/project/key/cap, system vars, commands, Node/region/resources/budget | Operator-reported configuration only |
| PPD-06 / Authorization | Present exact protected Preview/candidate-alias action and stop/rollback conditions; wait for explicit deployment permission | NOT GRANTED |
| PPD-07 / Acceptance prerequisites | Separately approve exact test letters/gates, callback/SMTP/inbox and mutation/deletion scopes | Proposed only |
| PPD-08 / Security/stability acceptance | PASS modern GET/206/HEAD/416/cross-letter/anonymous/non-disclosure and >4.5 MB Vercel streaming plus broader HTTPS matrix | All NOT TESTED; failure/skip blocks acceptance |

Proposed minimum `.vercelignore` for a **later approved local configuration change**, not created now:

```gitignore
.env*
.test-fixtures.json
.git/
.vercel/
node_modules/
.next/
.pnpm-store/
test-results/
playwright-report/
coverage/
*.tsbuildinfo
references/
```

Privately review other local credential/config files, including `.npmrc`, before approving upload; its contents were not inspected. Preserve build-required files and verify the complete upload manifest. The sample list is not completed upload evidence. [CLI exclusions](https://vercel.com/docs/deployments/vercel-ignore), [default ignored files](https://vercel.com/docs/builds/build-features)

**Attempt readiness: NO-GO now.** Local code/checks permit preparing a protected acceptance target, but packaging, protection, retirement, artifact/configuration and authorization gates remain. Once resolved, an initial protected Preview may be separately approved solely for evidence; the optional local Storage skip is not itself an attempt blocker.

**Owner-only acceptance: NO-GO / NOT TESTED.** Modern-key actual private GET, Range 206, HEAD/invalid range, cross-letter/anonymous denial, no credential/path disclosure and audio >4.5 MB across Vercel must PASS per PREVIEW_AUDIO_ACCEPTANCE.md. All broader HTTPS/SMTP/security/operational gates also remain. **Public production: NO-GO independently**, including existing privacy/contact/reporting/retention gaps. Stop here; no settings, keys, DB records, fixtures, cron, alias, Git connection, deployment or Prompt 08 follows automatically.

## Authorized source-upload exclusion follow-up — 2026-10-15

The operator subsequently authorized the local `.vercelignore` change and checks, without remote changes or deployment. This resolves **PPD-01**; earlier packaging findings and the proposed sample list above are historical. The actual 23-line file is [.vercelignore](/D:/D/SecretLove/.vercelignore).

The denylist excludes environment files (including the example), local `.npmrc`, synthetic account inventories, `.auth`, Git/Vercel local metadata, dependencies/build/cache outputs, logs/type caches, test/coverage/browser results, internal docs/reports/plans and reference media. Directory rules have no trailing slash so the installed CLI prunes the directories themselves as well as their contents. Source, package/lock/workspace manifests, Next/TypeScript/PostCSS configuration, guard scripts, test source and all applied migrations remain included. Ordinary public-asset paths are allowed; no public directory currently exists. `tests/fixtures/mp3.ts` is harmless generator source retained for dependent tests/TypeScript checking; generated MP3s and account inventories are excluded. `.npmrc` classification returned zero active settings and no values; its omission does not remove pnpm configuration, which remains in the workspace/manifest files.

Used the installed **Vercel CLI 64.0.2 client library's actual `getVercelIgnore` and `buildFileTree`**, normal directory/cloud-build mode, not a hand-written substitute or deployment dry run. No `createDeployment`, hashing/upload API, login/env-pull, archive or prebuilt action was invoked. The audit cleared inherited application environment entries, blocked network calls and guarded project content reads; it consumed ignore rules and filesystem metadata only. The CLI's auxiliary `.vercel/routes.json` probe was blocked before content access; that override was independently absent by filename metadata. No route override or selected symlink exists. Explicit file-list/prebuilt/route-override modes require a new review and are not certified by this check.

| Follow-up verification | Result | Actual evidence |
| --- | --- | --- |
| Offline actual CLI file selection | PASS | **143 files**, 16 ignored entries, **zero credentials/private artifacts selected**, zero network attempts |
| Deny/retention policy probes | PASS | **19 deny / 15 retention cases**; path strings only, no new fixtures. Retains every existing src file and all **8 migrations**, manifests/configuration/guard and public-asset probe |
| Selected-file safety markers | PASS — bounded static check | 143 selected source/config files checked for common modern/legacy/other credential/private-key shapes; zero violations, four inert test markers. No actual secret values searched, emitted or persisted; no environment/fixture credential files read. This does not certify arbitrary future files or replace rerunning selection after input changes |
| Type generation/typecheck | PASS | Actual selected-file snapshot, `next typegen` / `tsc --noEmit`, exit 0 |
| Lint | PASS | Same snapshot, `eslint .`, exit 0 |
| Portable tests | PASS | **80 passed / 0 failed / 2 skipped**, 11 files; mocked provider/in-memory DB only |
| Production build | PASS | Same selected-file snapshot, `next build --webpack`, exit 0; no env files or real credentials; installed dependencies reused |
| Final selected-source continuity | PASS | All 143 selected-file hashes still match the working tree after validation; no migration/guard/runtime/dependency edit |
| Optional modern live Storage / external MP3 | SKIPPED / NOT TESTED | Both opt-ins absent; modern provider/HTTPS/Vercel streaming acceptance still mandatory and NOT TESTED |
| Remote upload/fresh cloud install/hosting acceptance | NOT TESTED | No deployment, remote configuration, credentials, databases or aliases changed; frozen cloud dependency install and runtime still require approved target evidence |

Credential-free evidence: [actual upload manifest](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-upload-exclusions-20261015-1792009025149/upload-manifest.json), [local checks](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-upload-exclusions-20261015-1792009025149/validation-results.json), [offline audit helper](/C:/Users/Admin/.codex/visualizations/2026/10/13/01a1369c-cea7-7810-b9a3-e02172c45ebb/secretlove-upload-exclusions-20261015-1792009025149/audit-upload-selection.mjs). These remain outside deploy inputs; the same-drive validation snapshot is under the now-excluded `.pnpm-store`.

Only `.vercelignore` and preparation/report documents were changed in this follow-up. Existing auth/Storage patches and owner edits are preserved; no runtime/source/guard/migration/security-value change. **Deployment attempt remains NO-GO for PPD-02–06**, including effective protection, retirement/configuration/artifact confirmation and explicit authorization. Owner-only acceptance/public release remain independently NO-GO. No commit, deployment or remote action.

## PPD-02 credential security review follow-up — 2026-10-15

Read-only consumer/dependency and non-secret metadata review is documented in [DAY3_CREDENTIAL_SECURITY_REVIEW.md](/D:/D/SecretLove/docs/DAY3_CREDENTIAL_SECURITY_REVIEW.md), including the ordered manual rotation/revocation checklist, continuity effects, rollback boundaries and required evidence. The follow-up milestone name does not renumber PPD-02 protection, PPD-03 retirement, PPD-05 configuration or PPD-08 acceptance findings.

| Follow-up gate | Status | Evidence / remaining action |
| --- | --- | --- |
| Four credential consumer/dependency inventory | PASS — source review | Privileged SDK/direct Storage/RPC, verification/recovery, rate subjects, cron, helper scripts and mocked/live test consumers mapped; no actual values inspected |
| Local project link / guard design | PASS — local metadata/source | `secretlove-preview` link retained; exact HTTPS/ref consistency, Preview-only build and independent-key validation remain. Guard does not prove modern-key validity, intended alias allocation, isolation or revocation |
| Actual old credential use / retirement | BLOCKED | `.env.local` exists by filename metadata only. Its key identity and values loaded into local processes, CI, jobs, historical artifacts or other remote consumers are UNKNOWN. Dedicated new key creation is not old-key retirement; operator consumer/revocation/denial attestations required |
| Preview variable scopes/types/protection | BLOCKED / NOT TESTED independently | Nine Preview variables/four Secrets and Standard Authentication remain operator-reported. Safe metadata can confirm names/scopes/types/overrides and effective access without Reveal/export; All Deployments owner-only coverage still pending |
| New Preview verification HMAC plan | PASS — approved decision/source | Preserve historical letters. Single v1 key affects gates and recovery proofs; no transparent rehash or session revocation. Reconfigure only separately authorized exact acceptance letters through normal authenticated unpublish/save/republication |
| Modern Storage / protected HTTPS | NOT TESTED | Optional local live test remains owner-deferred SKIPPED; actual GET/206/HEAD/416, isolation/anonymous denial, non-disclosure and >4.5 MB Vercel streaming are mandatory acceptance gates |
| Local checks | PASS — prior PPD-01 evidence, not rerun | Latest actual checks: typecheck/lint/build PASS; 80 PASS / 0 FAIL / 2 SKIPPED. Documentation-only follow-up does not rerun helpers that load real credentials |

No secret values, fingerprints, credential-file contents or process environments were inspected, exported or saved. No credential rotation/revocation, fixture mutation, cleanup, email, remote configuration, migration/source edit, commit or deployment performed. Migrations 001–008 preserved. **Attempt NO-GO pending remaining PPD-02–06; owner-only acceptance NO-GO / NOT TESTED; public production independently NO-GO.** Stop for operator evidence and separate authorization; no Prompt 08.
