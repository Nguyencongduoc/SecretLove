# SecretLove — separate Preview and public release gates

Latest PPD-03/04: API-key retirement and post-disablement local connectivity are operator-attested, not direct denial evidence. Dedicated Preview API/HMAC/Cron keys are operator-reported; previous HMAC/rate/Cron consumer retirement remains unconfirmed. Source review/checks/proposed commit set: DAY3_SOURCE_FREEZE_REVIEW.md. No source-review result authorizes deployment or completes HTTPS acceptance.

Unchecked means pending; these are not test results. Prompt 07 evidence is in DAY3_DEPLOYMENT_READINESS.md; current Prompt 07.5 evidence and all seventeen pending HTTPS rows are in DAY3_PREVIEW_ACCEPTANCE_REPORT.md. No remote creation/configuration/deployment or Prompt 08 is authorized.

## Prompt 07.5 — exact operator gate (current)

- [x] Final read-only review: current feature branch/local link/guard/modern authentication inspected; intended candidate `https://secretlove-review-ngcd.vercel.app` passes inert format checks, not alias allocation/TLS verification. Nine Preview variables/four Secrets are operator-reported only.
- [x] Safe environment-free snapshot: typecheck/lint PASS, 80 local tests PASS/0 FAIL/2 SKIPPED, production build PASS on same-drive retry; first cross-drive tooling build failed. All 140 source files match working tree; no real secrets read or remote state changed.
- [x] Resolve PPD-01: authorized .vercelignore passes actual CLI 64.0.2 offline selection (143 files; zero credential/private-artifact paths), required-source retention and selected-snapshot typecheck/lint/80 tests/build. No remote upload. See security-review follow-up.
- [ ] Resolve remaining DAY3_PREDEPLOYMENT_SECURITY_REVIEW.md PPD-02–06: effective All Deployments owner-only protection, exposed-key retirement, frozen source artifact, hosting configuration/runtime confirmation and exact deployment approval.
- [ ] Separately approve exact Preview-key recipient-gate transitions; single-key HMAC cannot verify old-key gates and does not itself revoke existing recipient sessions. No cohort-wide changes or fixture creation under review authority.

- [x] Verify `feature/day-3-preview-acceptance`, initially clean code baseline `724325558c7d7b18be15bf21b4eaf793f80ec4f1`; inspect configuration, history, source security boundaries and target-test coverage.
- [x] Prepare PREVIEW_OPERATOR_CHECKLIST.md with all nine setup areas, Preview-only environment matrix and an incomplete approval packet; no target invented.
- [x] Latest owner-created project link and CLI 64.0.2 inspected; owner reports Standard Protection/no deployments. PREVIEW_ORIGIN_PLAN.md prepares a free separate CLI-alias bootstrap and approval-gated All Deployments. Effective remote protection and actual origin remain unverified.
- [x] Rerun local tests only: 69 PASS, 1 optional SKIPPED, nine files. Prior typecheck/lint/build/24 browser passes remain historical, not new HTTPS evidence.
- [ ] Confirm exact account/team, actual project ID/existence, stable HTTPS Preview origin and full alias inventory. Missing local project link does not prove remote absence.
- [ ] Obtain explicit setup/creation authorization before any remote mutation; resolve origin-before-creation dependency with the operator. Preparation/identifiers do not grant permission.
- [ ] Confirm Vercel Authentication **All Deployments** and effective owner-only membership/access groups/access grants/bypass/exemption inventory. A toggle or one /login redirect is insufficient evidence.
- [ ] Record verified Preview-scoped keys/project/origin/Auth template/redirect/SMTP changes, runtime/region/plan/resource budgets, test inboxes and monitoring/rollback plan; no Production scope.
- [ ] Present the completed exact project/origin/environment/access/revision/action packet, ask explicit deployment authorization and STOP until received.
- [ ] If choosing the manual-alias bootstrap, explicitly approve the one candidate hostname and first-Preview-then-alias dependency before any setting/deployment action; no claim it already exists. Keep the existing Production-assigned domain untouched; conflicts end the attempt. Verify exact routing/TLS/All Deployments before callbacks or use.
- [ ] After approved protected deployment, execute the guarded scenario plus missing supplemental/manual checks from the seventeen-row report. Preserve real PASS/FAIL/NOT TESTED and sanitized evidence per alias/revision.
- [ ] Approve exact new fixture deletion paths before scoped cleanup. Existing cron has no cohort selector: no valid global cron/maintenance or existing synthetic Auth deletion. Direct exact-object removal is not proof of worker drainage.
- [ ] Record separate decisions: attempt readiness, owner-only acceptance, public production. All currently NO-GO; owner acceptance is NOT TESTED.

## Before an owner-only private Preview attempt

- [x] Approved same-origin <=1 MiB upload chunks; server-validated 16 MiB/360-second cap preserved. Streaming/private/Range source and local tests prepared.
- [x] User manually applied/verified migration 008; 001–008 immutable. No browser staging grants.
- [x] Proposed project secretlove-preview, existing isolated Supabase project, Vercel Authentication and owner-only testers recorded.
- [x] Disable Git auto-deploy and prepare a Preview-only Vercel build-format guard; no project/remote setting created.
- [ ] Owner verifies project identity and plan/region/Node 24.x; any creation requires the separate authorization gate. Confirm actual stable HTTPS Preview origin. No invented URL.
- [ ] Owner confirms Protection on every URL/alias, approved tester membership and Preview-scoped credentials. Exact APP_ORIGIN/isolated project reference and callback settings verified.
- [ ] Assign monitoring/cleanup operator and verify isolated-project Storage/RLS/RPC/schema configuration including staging.
- [ ] Confirm SMTP/sender/templates and actual test inbox plan; keep public contact email pending until provided/verified.
- [ ] Explicit authorization to create a **protected Preview deployment for target testing**. This does not authorize sharing broadly, Production promotion or public access.

## Acceptance on the approved protected HTTPS target

- [ ] Privately verify this exact deployment uses the dedicated modern sb_secret_ key under unchanged SUPABASE_SERVICE_ROLE_KEY; never print the value or fall back to an exposed legacy key. PREVIEW_AUDIO_ACCEPTANCE.md's full GET/>4.5 MB Vercel stream/206/HEAD/416/cross-letter/anonymous/non-disclosure gates must all PASS. Failure, SKIPPED or NOT TESTED blocks owner-only acceptance.
- [ ] Obtain separate exact fixture mutation/deletion authorization and existing synthetic logins before testing. Use direct guarded Playwright, not isolated-browser.mjs (password/account mutation). Its current target scenario deletes its new letter in finally; approve that scope or review a leave-intact variant first. Optional local audio-live fixture remains explicitly deferred/SKIPPED, not a required local prerequisite or a target PASS.

- [ ] Unprotected access to every deployment/alias/HTML/API/static route gated by platform protection; valid operator protection credentials do not bypass application auth.
- [ ] HTTPS/TLS + exact Origin; wrong/null/missing Origin mutations denied. Generic locked HTML/RSC/metadata/no protected preload; CSP hydration/no unsafe-eval, no-referrer/nosniff/frame denial and private no-store/CDN headers.
- [ ] Signup/confirmation/recovery from real delivered email; fresh password login, used/expired/copy proof denial, normal login cannot reset; logout and forced refresh/expiry review.
- [ ] Secure/HttpOnly/Lax/Path=/ host recipient and recovery cookies on HTTPS; no Domain/session tokens in JSON/localStorage/URL.
- [ ] Full-song chunk upload above 4.5 MB succeeds (every binary request <=1 MiB; small begin/commit); bad manifest/codec/part/rights/MIME/size and stale owner/version/lease/publish cases deny safely.
- [ ] Full large GET actually crosses Vercel without payload error; Range 206/HEAD/416; expected bytes/hash; upstream redirects/errors/timeout/cancellation/concurrency behavior. This platform gate cannot be replaced by localhost tests.
- [ ] Anonymous/foreign owner/cross-letter recipient cannot read audio/photos/staging; revoked/expired/unpublished/deleted letter denies subsequent requests. Document in-flight/delivered-byte limitation.
- [ ] Real browser music begins after interaction, advances and persists across scenes; native/autoplay errors keep authorized reading available; Close/access loss tears down. Heart/custom Unicode/reduced motion/WebGL fallback/mobile framing render on target.
- [ ] Verify Vercel trusted IP overwrite/spoof resistance and distributed limiter; test namespace absent. Review shared provider-auth IP limits/CAPTCHA decisions.
- [ ] Cleanup endpoint denies absent/wrong cron secret. **Do not run unscoped maintenance against historical fixtures without separate approval.** Approved scoped cleanup/isolated fresh cohort, v3 staging jobs, failures/leases/orphans and physical erasure verified; scheduled Preview operator invocation configured (Vercel cron is production-only).
- [ ] Record aggregate monitoring, budget/egress/duration/memory/load and owner incident/rollback procedure; no private paths/request bodies in logs.
- [ ] Final local checks + approved target test evidence archived; decide GO for owner-only acceptance or NO-GO with defects. No automatic public release.

## Additional gates for public production — current NO-GO

- [ ] Reviewed real privacy/contact/disclosures, report intake/operator workflow, suspension/reinstatement and audited access implemented; no low-assurance identity claim.
- [ ] Verify proposed report 90-day/log 30-day/backup <=30-day targets against actual capabilities; document holds, active-versus-backup deletion and unsupported targets as blockers. Draft not published as final.
- [ ] Separate production Supabase/project credentials/origin/callback/SMTP and hosting authorization; operational audits and backups/restore/rotation verified.
- [ ] Complete physical Safari/iOS/Android/audio/accessibility/performance, long-reading, network/provider outages and multi-instance race/security checks.
- [ ] Exact historical synthetic cohort manifest approved before cleanup; no bulk deletion under preparation authorization.
- [ ] Production cron/monitoring/resource/egress acceptance plus explicit production deployment/public-release authorization.
