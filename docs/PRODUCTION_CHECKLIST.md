# Current G6 protected HTTPS acceptance (2026-10-17)

Current evidence supersedes earlier pending freeze/deployment/contact statements below; those sections retain their historical context. See [G6 acceptance report](G6_PRODUCTION_HTTPS_ACCEPTANCE.md).

- [x] Frozen source `f1832f7be25a312974d79bcc9a44a9d86ffe7942`; protected Production deployment `dpl_BMTFiQmsxvrpSYhUdW1dsM5z5rrB` READY. Canonical alias assignment completed under separate approval; no public opening.
- [x] Direct unauthenticated HTTPS requests to canonical, immutable READY URL, system alias and historical review alias redirect to Vercel SSO. This demonstrates protection on the tested requests, not exhaustive bypass/path coverage.
- [x] **PASS, operator-reported:** after Vercel Owner login, homepage loads without error and final URL remains `https://secretlove-production.vercel.app/`.
- [x] **PASS, operator-reported direct Gmail SMTP probe:** accepted, Inbox, expected sender and unchanged fake callback link. Real Invite/Recovery happy-path results are recorded below; target replay/security negatives remain NOT TESTED.
- [x] **PASS, operator-reported:** six no-Creator-session page/API checks; Studio/operator redirect to login and owner/operator APIs return 401 `AUTH_REQUIRED`. Vercel login does not grant app access in the tested state.
- [x] Exact one-account Owner invitation scope explicitly approved: check existing identity, invite `nguyencongduociot2124@gmail.com` once only if absent in Production. No execution PASS claimed.
- [x] **PASS, operator-reported:** account absent before Invite; invitation successful; Inbox delivery; correct domain/callback; expected pending page. Auth UUID/confirmation metadata not independently verified; email sender not separately restated.
- [x] Fresh Recovery/password setup/local sign-out/login packet explicitly approved for the invited Owner account; no execution PASS claimed.
- [x] **PASS, operator-reported:** Recovery successful, Inbox, correct domain/reset page, password update and local sign-out/login successful, expected pending-access page. No credential/session values collected.
- [x] Operator supplied exact Auth UID and confirmed-email status; one-account bootstrap SQL/verification prepared in [G6 bootstrap packet](G6_OPERATOR_BOOTSTRAP.md). No independent provider metadata query claimed.
- [x] Owner explicitly approved exact first-operator transaction once and read-only verification; SQL scope unchanged from reviewed packet.
- [x] Operator reports SQL execution without error; no direct agent SQL or credential access.
- [x] **PASS, operator-reported bootstrap:** actual counts 1/1/1/0, matching exact target operator/audit and no target Creator approval. No agent provider query.
- [x] Owner approved one operator TOTP enrollment and pre/post-MFA checks per G6 packet. No execution PASS claimed.
- [x] **PASS, operator-reported:** pre-MFA redirect/403. Operator reports factor state unclear, Enroll/Verify error and failed post-MFA/continued-Creator-denial checks.
- [ ] **BLOCKED:** MFA acceptance FAIL on operator report; actual error/phase and route statuses pending. Creator authorization result NOT VERIFIED, not evidence of bypass or correct denial. Stop retries/deletions and collect read-only evidence; preserve protection. Recovery replay/Creator approval remain separate scopes.
- [x] Read-only diagnosis: expected READY deployment/protection still present; anonymous MFA route returns SSO 302 and route exists in frozen source. Operator clarifies Google Authenticator QR-scan failure and reports missing link; actual authenticated HTTP/browser error pending. No AAL2 or QR compatibility PASS.
- [x] **PASS, operator-reported correction:** `/operator/security` displays “Operator two-factor security”; no missing-route defect established. QR-scan usability and TOTP/AAL2 remain unresolved; do not re-enroll/remove factors or Verify during current diagnosis.
- [x] Prepare [local MFA remediation scope](G6_MFA_REMEDIATION_PLAN.md) after repeated scan failure. Implementation approval pending; no local patch/target PASS. Manual fallback does not recover an already discarded pending-factor key; separate inventory/retirement and redeployment gates remain.
- [x] Subsequent approval: local MFA patch implemented and validated. Typecheck/lint/build PASS; 139 portable tests PASS/2 SKIPPED; 22 mocked desktop/mobile component tests PASS. Offline CLI selection 167 files/no credentials/private artifacts. No changes to server checks, migrations, dependencies or environment.
- [ ] Review new source/freeze/commit and exact protected deployment scope; actual MFA/manual key/phone scanning and pending-factor reconciliation remain NOT TESTED on Production. No commit/deploy/provider mutation performed; public release remains NO-GO.
- [x] Prepare [exact 11-file MFA source-freeze candidate](G6_MFA_SOURCE_FREEZE_REVIEW.md) and commit message; separate local-commit approval required. App validation carried by exact-source continuity; no new live/remote verification claimed.
- [x] Source review PASS: exact 11 paths/empty index; 167 tested inputs unchanged; credential-marker/whitespace/11 Git exclusion checks PASS; nine migrations/server authorization/dependencies/hosting/guard unchanged. No staging/commit/push/deploy. Source freeze remains pending explicit local-commit approval.
- [ ] Authenticated Creator/operator/MFA, recipient gate, cookies/CSP/Origin and complete media/scene/operations acceptance.
- [ ] Actual modern private Storage GET, >4.5 MB upload/stream, Range/HEAD/416, isolation and revocation; local optional live Storage test remains SKIPPED / NOT TESTED.
- [ ] Resolve old hostname response: `secretlove-preview.vercel.app` returned 404 in the last direct probe despite configured redirect metadata. No automatic domain change is authorized.
- [ ] Separately approve any real mail/account/bootstrap/fixture/cleanup scope and final G7 public opening. **Public release remains NO-GO.**

# Historical G4 Production configuration (2026-10-16)

- [x] **G5 local review PASS:** 164 inputs exactly match validated G4.4; installed CLI selection 164 files/nine migrations, 24 deny/17 retain probes, 0 network attempts; exact 16-file commit candidate, bounded marker/whitespace checks and 11 Git exclusion probes PASS. See [G5 review](G5_PRODUCTION_SOURCE_FREEZE_REVIEW.md). No fresh app test/build execution claimed; G4.4 checks carried forward by exact continuity.
- [ ] **G5 actual source freeze PENDING:** separately approve/stage/commit only the reviewed 16-file manifest and record its actual SHA. No commit, push, provider settings, deployment or public opening is authorized by this review; pre-attempt blockers remain.

- [x] Owner-approved Production origin `https://secretlove-production.vercel.app`, backend `mdoaageegovutlxhhicz`; existing Vercel project/team IDs retained in source. See [G4 evidence](G4_PRODUCTION_CONFIGURATION_STATUS.md).
- [x] **Operator-reported PASS:** G4.1 Free/Nano/Singapore/Healthy and no additional charges; G4.2 migrations 001–009, 17 RLS tables, grants/view/RPC checks, three private buckets and 19 zero-count inventories; G4.3 providers and requested Site URL/callback settings saved/reloaded. Not independently queried in G4.4.
- [x] **G4.4 local PASS:** snapshot typegen/typecheck/lint, 124 tests PASS / 0 FAIL / 2 SKIPPED, production build; all 164 deployment inputs stable, 0 observed network attempts, nine migrations unchanged, no real credentials. Evidence in the G4 report; this is not hosted acceptance or deployment authority.
- [ ] Review/configure Production hosting settings privately under separate approval; G4.4 does not read or change them. Real contact, SMTP and approved inboxes remain pending.
- [ ] Resolve pre-G7 exposure: prove All Deployments protection on every URL or separately approve a server release lock. Current build guard does not gate recipient access at runtime. Cron schedule is off; authenticated cleanup remains callable with the valid secret.
- [ ] G5 source review/freeze and exact deployment approval, G6 actual HTTPS/Auth/MFA/Storage/audio/scene/operations acceptance, G7 public-opening approval. No deployment, fixture, mail, cleanup or public opening follows from local checks.

# Earlier public Production workflow — G2 design prepared (2026-10-15)

The owner requests public website access with server-enforced private letters and approval at every step. Follow [PUBLIC_PRODUCTION_WORKFLOW.md](PUBLIC_PRODUCTION_WORKFLOW.md): model/data/onboarding/contact decision → design → implement/test → separately approved configuration → reviewed source/single protected Production attempt → HTTPS acceptance → separately approved Standard Protection/public-domain opening. No current FAIL/NOT TESTED result is cleared by this proposal. Do not expose the prepared owner-only/test artifact by disabling protection. No remote settings/deployment/public opening is performed here.

- [x] G1: workflow approved; owner chose separate Production backend and approved-Creator-only onboarding. Evidence/remaining inputs in G1_PRODUCTION_DECISIONS.md.
- [x] G2 design work authorized on codex/g2-production-design; proposed schema/API/RLS/RPC/onboarding/MFA/hold/deletion/public guard and file/test scope documented in G2_PUBLIC_PRODUCTION_DESIGN.md. Not implemented or tested as new behavior.
- [ ] Owner reviews proposed G2 decisions and authorizes G3 scope/branch; no automatic feature/SQL/remote/deployment action.
- [ ] Contact/backend identifiers/domain/plan/provider operational verification remain pending for configuration/release; do not invent values or mark app/hosting acceptance PASS.
- [ ] G2–G6: approved privacy/report/operator/signup/public-guard scope, local/provider/HTTPS/transport acceptance and exact one-attempt authorization.
- [ ] G7: explicit public-opening packet for the accepted artifact; verify canonical public/private gate plus retained protection on other URLs.
- [ ] G8: approved monitoring, cleanup/retention and containment operations. Existing historical fixture cohort remains untouched.

# Earlier restricted Production path (2026-10-15)

The original PPD-06 attempt is consumed and failed before app build. The owner approved preparation for **Owner-only Vercel Production using isolated test data**. This does not grant public release or a second deployment. [OWNER_ONLY_PRODUCTION_SETUP.md](OWNER_ONLY_PRODUCTION_SETUP.md) supersedes the earlier Preview-only targeting instructions for this path.

- [ ] Review new source after explicit owner-review guard changes; old frozen commit does not include them.
- [x] Local candidate validation: typecheck/lint/build PASS, **102 tests PASS / 2 SKIPPED**, source selection 143/no private artifacts, eight migrations unchanged. Actual hosted checks remain NOT TESTED; see the runbook for evidence and scope.
- [ ] Operator configures 11 Production-only variables/four Sensitive, exact confirmed project origin, provider system variables and unchanged guarded build/install settings; secrets never in reports.
- [ ] Reverify All Deployments/Owner-only, no bypass/exception/share links, `sin1`, plan eligibility and quota headroom.
- [ ] Verify `crons: []` and no active scheduled jobs; no global cleanup/invocation or historical fixture deletion approved.
- [ ] Confirm isolated Supabase exact callbacks/Site URL and SMTP/test-inbox plan without weakening recovery.
- [ ] Read-only preflight, reviewed new source and explicit one-attempt Production authorization before any deployment.
- [ ] Actual modern Storage/large streaming/auth/HTTPS/Heart/music gates remain NOT TESTED. Optional local fixture test remains deferred.
- [ ] Public production release remains NO-GO for separate privacy/abuse/retention/operational gaps.

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
