# G6 — MFA setup remediation approval packet

Date: 2026-10-17, Asia/Bangkok. Branch `codex/g6-production-https-acceptance`; frozen/deployed commit `f1832f7be25a312974d79bcc9a44a9d86ffe7942` remains unchanged. **LOCAL PATCH APPROVED AND IMPLEMENTED / LOCAL CHECKS PASS / NOT DEPLOYED.** After reviewing this exact packet, the owner replied “duyệt”. Implementation is limited to the four source/test paths below and G6 documentation. No commit, push, provider mutation or deployment performed. Proposed target/retirement steps remain separately gated.

## Evidence and limits

- **PASS, operator-reported:** bootstrap verification 1/1/1/0; pre-MFA redirect/403; setup page displays “Operator two-factor security”. The earlier missing-page statement was superseded by that title.
- **FAIL, operator-reported:** displayed QR cannot be scanned by Google Authenticator, including the subsequent scan attempt. No private QR, URI, setup key or code was collected. There is no confirmed root cause for camera scanning, image quality, device behavior or encoded URI.
- **NOT VERIFIED:** current provider factor inventory and successful verification/AAL2. No evidence establishes a completed Verify request. Current `/studio` and owner API results remain unclear; no Creator bypass is claimed.
- **Confirmed source limitation:** `src/components/operator-mfa.tsx` stores only factor ID and provider QR, discarding the returned setup key/URI. It offers no manual setup-key fallback. Source also automatically unenrolls all unverified TOTP factors when starting a new enrollment; retries can replace a pending setup. Neither is permission to delete the current Production factor.
- Installed auth-js 2.117.3 exposes `totp.secret`, `totp.uri`, and `totp.qr_code`. Its type documentation recommends a password-style setup-key field for users unable to scan. [Supabase enrollment response](https://supabase.com/docs/reference/javascript/auth-mfa-enroll) and [TOTP setup flow](https://supabase.com/docs/guides/auth/auth-mfa/totp) support this fallback.

## Proposed local patch

The owner approved this exact local scope. The deployed site is unchanged; implementation below is local only.

1. **Manual setup fallback from the same enrollment.** Keep factor ID, URI and setup key together only in temporary client component state from that account's normal successful enrollment response. Show a masked, read-only setup-key field behind an explicit “Cannot scan? Enter setup key” action, with time-based setup instructions. No automatic clipboard write, local/session storage, URL/query parameter, server persistence, analytics or console logging of enrollment material. Hide/remove setup UI after successful verification and on leaving the component; do not promise physical browser-memory erasure. Never ask the operator to paste the key into chat/DevTools.
2. **QR rendering.** Generate a high-contrast local PNG QR from the same validated provider `otpauth://totp` URI using the existing `qrcode` dependency; use a white quiet zone and responsive legible sizing (target 320px). Preserve the provider's secret/algorithm/digits/period; do not invent or weaken parameters. Keep output in an `img` data URI under the existing CSP, with no remote QR/decoder service or executable SVG markup. If rendering fails, retain the same factor/setup key and offer manual setup without creating another enrollment. A better QR is a proposed mitigation, not a confirmed explanation of the current failure.
3. **Explicit enrollment state.** Remove implicit `unenroll` behavior. An existing verified factor goes to normal challenge/verification; an unexpected existing unverified factor blocks fresh enrollment and clearly requests reconciliation. While an enrollment created in this component is active, switching presentation or repeated UI clicks must preserve it and never issue duplicate enrollment. Disable conflicting operations and prevent duplicate enrollment/verification requests.
4. **Safe failure states.** Distinguish factor-list, enrollment, QR rendering and verification errors using generic non-secret text. Do not render raw provider responses or full error objects. Failed verification keeps the same pending enrollment and local fallback; never reset it by enrolling again. No automatic provider retry/deletion. Clear successful enrollment display before navigating to the operator page.
5. **Preserve authorization.** Keep server registry/AAL2 checks, Creator approval, exact Origin/CSP, private media/session policy and all migrations unchanged. Manual setup changes how the same TOTP secret reaches the owner's authenticator; it does not replace TOTP with an email/password bypass.

## Proposed implementation file manifest

| File | Scope |
| --- | --- |
| `src/components/operator-mfa.tsx` | Setup fallback, responsive QR, enrollment/verification states and removal of implicit factor deletion. |
| `src/lib/mfa-enrollment.ts` (new) | Minimal client-safe validation/QR helper and reusable enrollment decisions where needed for focused tests. No credentials or provider admin calls. |
| `tests/mfa-enrollment.test.ts` (new) | Local inert enrollment/URI/QR/state tests, including prevention of implicit deletion/duplicate enrollment. |
| `tests/browser/operator-mfa.spec.ts` (new) | Focused local browser tests with mocked identity/provider requests only; no Production or historical fixture mutations. No real QR/key artifacts. |
| G6 report, TASKS, checklist and approval notes | Actual evidence, new source-freeze requirement and remaining target gates. |

No new dependencies, package/lockfile change, environment access/change, SQL/migration, build-guard or hosting configuration change. If the proposed local browser fixture needs broader existing test infrastructure changes, present that concrete scope before making them. Do not run the existing isolated user/letter mutation harness.

## Local validation acceptance criteria

- Inert URI/QR roundtrip preserves the original enrollment information; invalid/unsupported input fails with a generic error and no material in logs/output.
- Manual setup is available when scanning/rendering fails; show/hide/verification do not create another factor or send keys to a third party.
- Verified and pending factor states behave differently; pending factors are never silently unenrolled. Conflicting/duplicate actions do not create duplicate requests; provider failures preserve safe state.
- No production key, token, cookie, QR or seed is read or used. Browser tests use only clearly synthetic local enrollment material and disable sensitive trace/video/report attachments.
- Existing access-control tests remain green: AAL1 cannot enter protected operator APIs, verified AAL2 and registry are required, and unapproved Creator access remains denied.
- Run typecheck, lint, relevant/all portable tests and production build in a controlled credential-free local snapshot. Record failures and skipped/live tests honestly. No remote test is implied by local PASS.

### Actual local results

| Check | Result | Evidence / limits |
| --- | --- | --- |
| Type generation + TypeScript | PASS | Offline snapshot, `next typegen` then `tsc --noEmit`, exit 0. |
| ESLint | PASS | Same final snapshot, exit 0. |
| Portable unit/security/SQL tests | PASS — 139 passed, 0 failed, 2 skipped | Includes 15 new helper tests: original URI/secret association, supported parameter preservation, rejection of malformed/external/inconsistent inputs with generic errors, and actual PNG decoding back to the inert URI. Existing server approval/AAL2 tests remain green. Mock/in-memory coverage, not live provider acceptance. |
| Production build | PASS | `next build --webpack`, exit 0, 38s in final run. Existing guard/configuration unchanged. |
| Browser component tests | PASS — 22 passed, 0 failed/skipped | 11 cases on desktop and 360px mobile viewport; real patched React component with mocked provider/router and inert setup values. Tests cover same-factor manual key, local PNG/image fit, masked fields, duplicate actions, no implicit deletion, reload with pending factor, existing factor, QR generator/image errors, verification failures, sanitized errors, and unmount. They do not test a real phone camera or Supabase session. |
| Network/credential boundary | PASS within local harness | Offline typecheck/lint/tests/build records 0 Node network attempts; snapshot excludes environment/private fixture files. Browser harness only serves loopback resources and asserts 0 external browser requests. No real setup key/QR/code/cookie read. Trace/video/screenshots disabled. |
| CLI deployment selection | PASS — 167 files, 0 credential/private-artifact paths | Installed Vercel CLI 64.0.2 filename selection only: 24 deny/20 retention probes; all src/public and nine migrations retained, 0 network attempts/actual secret reads. No deploy command. |
| Actual Google Authenticator/Production MFA and pending-factor state | NOT TESTED / BLOCKED | The operator's earlier real QR failure remains unresolved on the deployed target; this patch is not deployed and cannot recover discarded setup state. Separate source-freeze, deployment and account-scoped factor-reconciliation gates required. |

Final source snapshot/evidence: ignored `test-results/g6-mfa-validation-1792178293720/` (`validation-results.json`, source manifest, per-step logs, `browser-results.json`). Packaging evidence: `test-results/g6-mfa-upload-review-1792178371818/`. Full app checks use a separate same-drive snapshot and inert environment; the existing local Next server and `.env.local` are untouched. Browser tests use a standalone temporary configuration with **no webServer**, not the root live-fixture configuration.

Earlier setup failures were corrected before final results: sandbox SWC path canonicalization; a test DOM type cast; an unavailable assumed test bundler (replaced with Rolldown already installed through Vitest/Vite); and sandbox browser-cache lookup. Local tools were rerun with approved filesystem/browser access. No dependency installation or security bypass was used. These were tooling/test setup issues, not real Supabase failures. Final runs above have no unresolved local failure.

Actual behavior: setup key is masked until explicitly revealed, remasked when setup is collapsed or verification starts, and removed from UI after verification success. QR is generated locally from the validated URI; generator and image-load errors both preserve the same enrollment/manual fallback. Pending factors are never silently deleted. Lost/invalid enrollment responses block blind re-enrollment; errors expose no raw provider object. No provider SVG is executed or parsed into the DOM.

**Local patch review: GO. Target MFA acceptance/public opening: NO-GO.** Runtime/source changes invalidate the previous frozen artifact for this patch; a separately reviewed new commit/deployment is required. Do not amend or claim the original frozen SHA contains this fix.

## Current Production pending-factor recovery is a separate gate

A new UI cannot recover the previously discarded setup key from its old React state after navigation/reload. Do not promise that deployment of this patch alone resumes the old QR. Do not extract it from browser profiles, logs, DevTools exports or provider secret columns.

First review only this account's non-secret MFA metadata (factor ID/type/status/creation time), without secret/QR/URI/token fields. No inventory query or provider mutation is executed in this task. If a verified factor exists, use that existing authenticator and do not reset it. If an unverified factor exists and the owner no longer has its setup material, present its exact ID/type/status and the separate account-scoped retirement/re-enrollment decision for explicit approval. Do not delete all pending factors, delete/reset the Auth user or change passwords. Any authorized later retirement must preserve operator identity/registry and historical audit data.

## Review, deployment and target acceptance sequence

1. Owner approves the local implementation manifest above. Implement and complete local checks; stop for review without commit/push/deploy.
2. Review the new deployment-source manifest and exact changed files. The original frozen SHA remains the deployed baseline; do not amend it. Any local commit/source-freeze update needs its own approval.
3. Separately approve the exact protected Production deployment attempt for the reviewed new commit. Preserve canonical origin, new Production backend, All Deployments protection, sin1, cron-off and Git-off. No public opening or automatic retry.
4. Separately reconcile the current account's factor inventory/retirement if needed. Approve exactly one new enrollment only when its prerequisites are known; no remote mutation is authorized by this implementation plan.
5. On the approved target, test manual setup and QR compatibility privately, real verification/AAL2, operator API access after MFA, pre-MFA denial in a fresh session, and continued Creator denial. Public opening remains NO-GO until these and other G6 media/privacy/operations gates pass.

**Approved and completed scope: local source/test/documentation patch only.** No remote change, credential access, factor deletion/re-enrollment, email, SQL, fixture creation, commit, push, deploy or release is included. Stop for source review and the later exact gates.

Subsequent owner request to continue authorizes review preparation: [exact 11-file source-freeze candidate](G6_MFA_SOURCE_FREEZE_REVIEW.md). One local commit still needs separate explicit approval; no push/deploy or provider change follows from review.
