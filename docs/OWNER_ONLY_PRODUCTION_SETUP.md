# Owner-only review on Vercel Production — operator runbook

**Latest scope change:** the owner now requests Production Public Access + Private Letter Gate. This owner-only runbook is historical preparation, not the public-release configuration. Follow [PUBLIC_PRODUCTION_WORKFLOW.md](PUBLIC_PRODUCTION_WORKFLOW.md), currently awaiting G1 decisions; do not turn off protection on the isolated-test/owner-only artifact or keep configuring it as the public backend. No rollback/deletion of existing local work or remote settings is performed by the planning step.

2026-10-15, Asia/Bangkok. The owner approved preparing this restricted review approach after the first deployment failed. This is **Vercel's Production environment with isolated test data**, not approval for public production release. No new deployment, remote configuration, fixture write, mail, cron invocation, push or commit has been performed by this preparation.

## 1. Failed attempt and changed approval boundary

PPD-06 attempt **1 of 1** was consumed by `dpl_2fYeyQBb9MQJHHPsyAFnZNexf13U`, source `81c49be824713bd51142d959b9d56b3f1f25b0f1`. Remote target and OIDC environment were `production`; state `ERROR`, code `BUILD_UTILS_SPAWN_1`. The 79 reviewed build events show the guard rejection and exit 1 before Next.js build. No retry was performed. Assigned-alias endpoint returned zero aliases; anonymous HEAD redirected to Vercel authentication. All 143 uploaded filenames passed the private-artifact denylist. No credential-shaped material was detected in the reviewed logs, and no application variable names appeared in the failed deployment's environment inventory; this is bounded evidence, not a claim about every provider-internal record.

The installed CLI removes the explicit `preview` target from its request. Vercel documents that a project's first deployment is Production. Earlier advice that the CLI flag guaranteed a first Preview was wrong. The original guard correctly stopped that context. Do not assume a failed record makes a later Preview attempt safe. [Vercel first deployment](https://vercel.com/docs/deployments/environments#first-deployment)

The former frozen revision remains historical. Local guard/configuration changes in this preparation require a new source review before use; do not redeploy the old artifact or claim it includes these fixes. A new Production attempt requires a separate explicit authorization after the exact configuration is ready. No retry authorization is carried over from the consumed attempt.

## 2. Confirmed target and protection

Read-only API evidence during preparation:

- Project `secretlove-preview`, ID `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`; team `team_KJpwyYId3LugWZ4U1jnF4h67`.
- Function region `sin1`; All Deployments Vercel Authentication; zero automation-bypass entries; no Git link. Owner-only membership and no exceptions remain operator attestations, not complete API proof.
- The project domain list contains verified `secretlove-preview.vercel.app`, with no Preview branch/custom-environment assignment or redirect. Use exact `APP_ORIGIN=https://secretlove-preview.vercel.app`. This is a confirmed project hostname, **not** a successful app deployment, HTTPS acceptance result or newly assigned alias.
- Existing settings: ten Preview-only variables, zero Production application settings. Existing Preview settings must remain intact. The proposed `secretlove-review-ngcd.vercel.app` alias is not used for this path; no alias operation is required or authorized.

Before deployment, manually recheck Settings → Deployment Protection: Vercel Authentication / Require Log In / All Deployments, no exceptions, share links or automation bypasses, and only the approved Owner in the team. The application build guard cannot verify these remote controls. Do not set a flag that claims protection as a substitute for checking it. [Deployment Protection](https://vercel.com/docs/deployment-protection)

## 3. Configure Production variables manually

Open Vercel → `secretlove-preview` → Settings → Environment Variables. Add separate **Production-only** entries below; do not add Production to the existing Preview APP_ORIGIN entry, because its origin differs. Do not touch `.env.local`, use CLI env pull/export, paste credentials in chat, put credentials in commands, or reveal Secret entries. Use the operator's secure original records for the already approved hosted-test credentials. If those records are unavailable, stop and report the missing names; key creation/rotation is a separate decision.

| Name | Production value / operator action | Type |
| --- | --- | --- |
| APP_ORIGIN | `https://secretlove-preview.vercel.app` (no trailing slash) | Config |
| NEXT_PUBLIC_SUPABASE_URL | `https://samelfoyrujhcywcnofw.supabase.co` | Config |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Existing approved modern hosted-test publishable credential, supplied privately | Config; intentionally public in client bundle |
| PREVIEW_SUPABASE_PROJECT_REF | `samelfoyrujhcywcnofw`; historical variable name retained | Config |
| MAX_AUDIO_UPLOAD_BYTES | `16777216` | Config |
| ENABLE_EXPERIMENTAL_COREPACK | `1` | Config |
| SECRETLOVE_DEPLOYMENT_MODE | `owner-only-review` | Config; Production-only explicit opt-in |
| SUPABASE_SERVICE_ROLE_KEY | Existing dedicated modern `sb_secret_` hosted-test key (`secretlove_vercel_preview`); variable name retained | Secret / Sensitive |
| VERIFICATION_HMAC_KEY | Existing independently generated hosted-review value from the secure operator record | Secret / Sensitive |
| RATE_LIMIT_HMAC_KEY | Existing separate hosted-review value | Secret / Sensitive |
| CRON_SECRET | Existing separate hosted-review value; required format, **no schedule or invocation authorized** | Secret / Sensitive |

Total: **11 Production entries, four Sensitive**. Do not use retired legacy/default keys or local development credentials. Keep the hosted verification HMAC separate from local development; old synthetic letter gates may need separately approved normal Studio reconfiguration. Existing sessions are not revoked by HMAC rotation. Do not bulk-edit historical letters or create test fixtures merely to pass deployment.

Keep provider System Environment Variables enabled. Vercel supplies `VERCEL=1`, `VERCEL_ENV=production`, `VERCEL_TARGET_ENV=production` and the project ID. **Do not manually set/override these to fool the guard.** Node `24.x`, install `pnpm install --frozen-lockfile`, build `node scripts/check-preview-config.mjs && pnpm build`, region `sin1`; no CLI build/env overrides. Corepack uses pinned pnpm `11.25.0`.

## 4. New build policy and cron safety

Without the explicit owner-review mode, Production still fails. The mode requires the actual Production context, the approved Vercel project ID, exact isolated Supabase reference/URL, exact confirmed project hostname, and modern key prefixes. All existing Origin-format, independent canonical base64 >=32-byte secrets, public/server separation, upload cap and deployed test-namespace checks still apply. Ordinary Preview support remains, without falsely labelling a Production context Preview. Prefix/format validation does not prove credential validity, permissions or owner-only protection.

`vercel.json` now has `crons: []`. A successful Production deployment must **not** automatically schedule the global cleanup endpoint against historical test data. The endpoint and its existing authorization stay intact; do not call it, add a bypass or restore a schedule. Vercel schedules run on Production; removing schedule configuration is therefore necessary for this limited scope. Confirm the deployment's effective cron list is empty and manually inspect Settings → Cron Jobs before approving the attempt. Any unexpected existing job requires separate operator action. [Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

Physical cleanup may remain pending with no worker; monitor it only within a separately approved scope. Public operational readiness still requires an approved cleanup/retention plan. Removing the schedule is not a deletion or cleanup claim.

## 5. Supabase callbacks, mail and access

In the existing isolated Supabase project's Authentication → URL Configuration, the intended hosted Site URL is `https://secretlove-preview.vercel.app`. Preserve needed exact localhost redirects; add only these hosted redirect URLs when the operator approves that configuration step:

- `https://secretlove-preview.vercel.app/auth/callback`
- `https://secretlove-preview.vercel.app/auth/callback?next=/reset-password`

Use the existing approved token-hash recovery email template and `/auth/callback` implementation. Do not replace it with a code-only callback or change passwords to test. Before changing Site URL, review any email-template reliance on `.SiteURL` because the isolated project is shared with local development. SMTP/signup/recovery mail is not sent by this preparation; use only approved test inboxes under a later test authorization. Keep confirmation enabled. A recipient must pass both platform protection and the application's existing letter-bound gate; no public-recipient access is enabled by this plan.

## 6. Review and single-attempt gate

1. Finish local validation and inspect the changed-file/upload manifest. Review and freeze the new source under separate commit authorization; the old frozen hash is not the candidate.
2. Operator configures the 11 Production entries privately and confirms their scope/types, protection, owner membership, callbacks status, no active cron jobs, plan eligibility and quota headroom. No value or fingerprint is required in chat.
3. Read-only preflight verifies project/team, new source, upload exclusions, region/protection, metadata scopes and non-secret configuration statuses. Secret validity remains a hosted acceptance test.
4. Present the exact new source revision, project/team, canonical origin, **Production** target, protection and one intended cloud deployment action. Wait for explicit authorization of one new attempt. Do not retry automatically, assign aliases, connect Git, run cron or send mail.
5. Only then execute a Production cloud build for the reviewed source. No command is executed or authorized by this runbook. Do not use dashboard Redeploy on the old failed artifact, a prebuilt artifact, `--public`, or build/env overrides.
6. Inspect actual target/status/project/source/region/cron configuration and all generated URLs. An unauthenticated client must meet Vercel authentication. Stop on any mismatch, public access or build failure; containment/removal/retry needs separately scoped authorization.

## 7. Acceptance and current status

Local validation completed in a credential-free same-drive source snapshot, with installed dependencies reused and the localhost build output untouched:

| Check | Actual result |
| --- | --- |
| Next type generation / TypeScript | PASS — exit 0 (11 s / 5 s) |
| ESLint | PASS — exit 0 (7 s) |
| Unit/in-memory PostgreSQL suite | PASS — **102 PASS / 0 FAIL / 2 SKIPPED**, 11 files; includes 24 deployment-policy tests (8 s process time) |
| Production build | PASS — `next build --webpack`, exit 0 (190 s); no remote build or actual hosted-secret check |
| Source selection and safety | PASS — installed CLI selects 143 files, 19 deny/15 retention probes, no private credential/fixture paths, no selected symlink/routes override; bounded marker scan only inert test material |
| Migrations and source continuity | PASS — all eight migrations unchanged; all 143 validated deployment inputs match the current working tree after checks |
| Hosted modern Storage / browser / SMTP acceptance | NOT TESTED — no deployment, fixture mutation or mail |

Evidence: ignored local `test-results/owner-review-validation-1792049041856/validation-results.json` and per-check logs. No real app credentials/env files/live opt-ins were passed to the checks. The first validation attempt caught a missing `NODE_ENV` type in the new test subprocess environment; it was fixed and the final complete run above passed. Its earlier failed snapshot is retained as tooling evidence, not presented as a successful run. The optional external MP3 and modern Storage live tests remain SKIPPED.

Remote settings have not been changed. New source is uncommitted. Attempt readiness remains blocked on operator configuration/review/authorization; owner-only acceptance and public release are **NO-GO** until their own gates pass.

Required actual-target tests remain **NOT TESTED**: secure cookies/CSP/exact Origin, login/owner isolation/recovery single-use, real SMTP delivery, protected recipient flow and revocation, fresh separately authorized gate fixtures, modern private audio GET/206/HEAD/416, anonymous/cross-letter denial and credential/path non-disclosure, >4.5 MB Vercel streaming/chunk uploads, Heart/rings/music continuity, trusted-IP/rate limiting and resource/egress monitoring. The optional local modern Storage test remains deferred/SKIPPED; do not create its abandoned fixture.

Public release additionally needs privacy contact, reviewed reporting/rejection/retention controls, verified deletion/backup/log operations and appropriate product/legal review. No compliance claim or public launch follows from an owner-only Vercel Production build.
