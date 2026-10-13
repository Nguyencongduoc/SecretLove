# SecretLove — Three-Day MVP Plan

Architecture approved by the user on 2026-10-14 (Asia/Bangkok). The user explicitly reordered Day 1 to Creator Studio, including private media and basic preview, and instructed the agent to stop after Day 1. The full MVP remains a 30–40 engineering-hour stretch estimate; external configuration and unresolved release gates affect elapsed time.

## Planning and readiness

- [x] PRD, architecture, security, database/API design, final architecture review and agent instructions created.
- [x] User architecture approval recorded; approval-pending instructions removed.
- [x] User confirmed an isolated Supabase test project and configured the required environment settings.
- [x] Existing .env.local preserved and ignored by Git; settings checked without exposing values.
- [x] Manual SQL Editor, callback/template, SMTP, local check and cleanup instructions provided in docs/SETUP.md.
- [x] User applied the initial migration manually and confirmed read-only verification results.
- [x] Read-only remote checks verify valid public key, anonymous view denial and successful service schema query.
- [ ] Confirm custom SMTP, real email confirmation/recovery delivery and approved deployment configuration.

## Day 1 — Creator Studio (authorized scope)

Goal: authenticated creators can compose, persist, manage and privately preview their own drafts with photos. No publishing or Recipient Experience implementation in this milestone.

Implementation checklist (checked means code exists; live acceptance is separate below):

- [x] Initialize Next.js App Router, TypeScript and Tailwind, with pinned runtime dependencies and project scripts.
- [x] Configure request-scoped Supabase SSR owner client, refresh proxy and separate server-only privileged client.
- [x] Validate environment/input, restrict mutation Origin, redact failures and apply private cache/security headers.
- [x] Generate additive migration for letters/photos/private gate and future share/session foundations, rate buckets, cleanup leases and scan state.
- [x] Enable RLS on application tables; grant owner SELECT only; deny anonymous reads/browser writes/privileged RPC execution/private-schema access.
- [x] Create private letter-media bucket and restrictive browser Storage denial policy.
- [x] Implement register, confirmation callback, login/logout and recovery/reset with session-bound recovery proof.
- [x] Require verified getUser identity and confirmed email; derive actor server-side and check owner/parent membership transactionally.
- [x] Connect the dashboard to real owner-scoped Supabase queries, with loading, empty and error states.
- [x] Implement draft create/read/update/delete, 20-active-letter quota, string versions and conflict-safe saves.
- [x] Build explicit-save editor: greeting, write-only verification details, optional salted-scrypt passphrase, allowlisted rich text and rose/minimal templates.
- [x] Build serialized private uploads, six-photo limit, bounded multipart/decode, normalized WebP with metadata removal, descriptions/removal and authorized media proxy.
- [x] Build owner-only saved-letter preview with safe React rich-text rendering.
- [x] Implement durable deletion jobs, retry leases, stale reservations and bounded persistent orphan scanning; provide protected worker and future daily schedule.
- [x] Add local PostgreSQL/RLS and validation/crypto/image/HTTP security tests.
- [x] Run lint and typecheck successfully; production build succeeded. Final verification evidence is recorded below.
- [x] Prepare desktop/mobile browser checks, optional live two-creator checks and additive isolated Auth fixtures; no production mocks.

Acceptance criteria:

1. A confirmed creator signs in/out, confirms registration and completes password recovery using real Supabase callbacks; anonymous Studio requests redirect to login.
2. Creator A creates/saves/reloads/previews a synthetic draft, uploads/removes a private photo and deletes the draft using application CRUD. Creator B/anonymous cannot read A's data or photo bytes.
3. The migration applies once to the isolated Supabase project, RLS/grants verify, browser roles cannot invoke privileged writes, and direct Storage access is denied.
4. Input/XSS/image/version/ownership tests pass. Quotas and stale saves deny unsafe changes; Save during upload commits conflict cleanup while retaining the concurrent Save; failed upload responses never queue an already-finalized photo.
5. Delete revokes application reads immediately and reports pending physical cleanup. A failed storage removal leaves a leased/retryable job; later authorized worker invocation completes removal.
6. Lint, typecheck, production build, local tests and desktop/360px browser checks pass. Real Auth/CRUD/media checks must be recorded before marking Day 1 fully accepted; no secrets in logs/client bundles.

Verification evidence (2026-10-14):

- Public Supabase Auth endpoint accepts the configured publishable key. All required local settings pass presence/format validation; their values were not printed.
- User manually applied the migration. Remote anonymous view SELECT is denied; service view query succeeds. The agent did not execute remote SQL.
- Local PostgreSQL (PGlite): application migration executed against test-only auth/storage schema fixtures; eight database/RLS/transaction tests passed.
- Five unit/security tests passed for allowlisted rendering, strict input, secret hashing/recovery binding, normalized image limits/metadata and Origin/body/error rules.
- Final lint, typecheck and 13 unit/database tests pass after formatting. Production build succeeds; client assets are scanned for server secrets. ESLint is pinned to v9 for declared Next plugin peer compatibility; its deprecation is recorded in SETUP.md.
- Four public desktop/360px browser checks passed, including hydration/CSP, form validity, anonymous Studio/content/media denial, mutation Origin, reset and cron denial. Authenticated tests initially skipped because test credentials were not provided.
- Isolated Auth fixtures may be created for live tests without sending emails or changing .env.local. Their IDs are retained in ignored .test-fixtures.json for operator-assisted cleanup. Credentials remain in process memory. These fixtures do not certify real email delivery.
- [x] Live browser suite: eight tests passed, zero failed/skipped, in desktop and 360px layouts using real Supabase. Four authenticated executions cover Creator CRUD/media/isolation and provider recovery. Four public/security executions cover forms/CSP and unauthorized access. Save/reload/preview, actual protected photo downloads, other-creator read denial and stale Save (409) PASS. Raw verification inputs are omitted from owner responses. Cleanup returns 200 with zero reported failures; full physical erasure/queue drainage was not independently asserted. Reset succeeds through a provider callback; a second reset after proof-cookie clearing is 401. Copied-proof replay was not tested.
- [x] Server-secret scan passed for client assets, Git ignores environment/fixture files, and no environment secrets were printed. No remote SQL or deployment was performed by the agent.
- [x] Live testing caught and fixed editor dirty-state feedback caused by setEditable emitting content updates. The browser test also now waits for image decoding and signs auxiliary SDK clients out locally, preserving the browser's session.
- [ ] Actual signup/confirmation/recovery email delivery and configured SMTP are not verified. Recovery tokens were generated through the provider's admin API without sending emails. This remains Day 1's manual external acceptance item.
- [ ] Eight synthetic Auth accounts from test runs remain; their IDs are retained in ignored .test-fixtures.json for operator-assisted cleanup. Failed earlier runs may have left synthetic drafts/photos attached to those accounts. No existing non-test account was changed or deleted.
- [ ] Deployed multi-instance race/resource limits and actual scheduled cron delivery remain release gates. No Day 2 work has begun.

### Final Day 1 test report — PASS / FAIL / NOT TESTED

See [docs/DAY1_TEST_REPORT.md](docs/DAY1_TEST_REPORT.md) for exact assertions, environment distinctions, historical failures and untested cases. This report records the final executions; no new live test accounts were created for reporting.

| Area | Status | Actual final result |
| --- | --- | --- |
| Authenticated Creator CRUD/media/isolation composite | PASS | Desktop and mobile both pass; 2 executions. |
| Authenticated provider-recovery composite | PASS | Desktop and mobile both pass; 2 executions. |
| Public forms/CSP and anonymous protection | PASS | 4 executions; browser total 8 passed, 0 failed, 0 skipped. |
| Editor unsaved-state regression | PASS | Update emission disabled for setEditable; Save notification and subsequent flows pass. |
| Create/update/Save/reload/rose preview/delete | PASS | Live message/greeting update and persisted content; title-update behavior additionally tested locally. |
| Upload/owner proxy/direct Storage denial/cross-creator reads | PASS | Actual PNG fixture uploaded; protected WebP GET 200/no-store; B letter/media GET 404; browser write RPC 42501. |
| Cleanup execution and logical revocation | PASS, bounded coverage | Live worker 200/failed=0 and post-delete photo 404; local enqueue/lease/failure-ack tests pass. |
| Physical erasure, queue drainage, actual outage/retry, orphan/stale reconciliation | NOT TESTED | No independent object-removal/drained-queue assertion or injected live Storage failure. |
| Recovery callback/proof binding/reset without proof | PASS, bounded coverage | Provider callback/update succeed; normal-login and cleared-proof second reset 401; binding/tampering/expiry pass locally. |
| Copied recovery proof replay, provider-token replay/expiry, new-password login assertion | NOT TESTED | Cleared-cookie denial does not establish server-side single-use consumption of a copied proof. |
| Typecheck/lint/local tests/production build | PASS | Exit code 0; 13 local tests across 2 files, 0 failed. |
| Supabase schema/configuration/client-secret scan | PASS | Remote grants/query verified; 45 client assets scanned without finding configured server secrets. |
| Current test failures | FAIL: 0 | Earlier editor and test-harness/typecheck failures were fixed; final runs pass. |
| Actual signup/confirmation/recovery email delivery | NOT TESTED | Confirmed fixtures/admin-generated recovery tokens bypass email delivery. |
| Individual photo edits/removal, minimal template, formatting UI, live cross-creator application PATCH/DELETE, refresh/concurrency/rate exhaustion | NOT TESTED | Implementation exists, but these specific end-to-end assertions were not executed. Direct privileged RPC denial was tested and passed. |
| Fixture account/data cleanup; deployed limits and scheduled cron | NOT TESTED / pending | Eight synthetic accounts retained; operator cleanup and deployed checks remain. |

Day 1's executed checks PASS; full acceptance is conditional on outstanding external/security checks above. Day 2 remains not started.

## Day 2 — publishing, sharing and recipient access (not started)

Goal: complete the approved publish → share → verify → read → revoke backend flow. Start only after a new user instruction.

- [ ] Implement transactional completeness checks, frozen publication, share-token rotation, unpublish and fresh-link republish.
- [ ] Add creator sharing panel, copy link and local QR PNG download.
- [ ] Implement minimal recipient bootstrap, name/DOB/passphrase verification, durable trusted-IP limits and letter-bound 30-minute sessions.
- [ ] Add protected content/media, fixed-expiry resume and session close routes; authorization rechecked for every request.
- [ ] Verify publication/session races, stale access versions, expired/revoked/cross-letter sessions, incomplete/pending drafts and cleanup failures against isolated Supabase.
- [ ] Run lint/typecheck/build/relevant tests, update evidence and stop at the milestone.

Acceptance: a creator publishes and shares a working link/QR; only correctly verified recipients can read; unauthorized bootstrap contains no content; unpublish/delete denies new content/media requests; old links fail after republish; original expiry is preserved on resume; all checks pass with real persistence.

## Day 3 — recipient scenes and release validation (not started)

- [ ] Add romantic generic landing, accessible verification/resume controls, Motion envelope, lazy R3F heart, photo gallery and final letter scene.
- [ ] Add keyboard navigation, reduced-motion/WebGL static fallbacks, empty-gallery skip and expiry/close state clearing.
- [ ] Verify 360px layout, focus/error handling and animation performance.
- [ ] Audit pre-unlock HTML/RSC/metadata/logs, cookie/Origin/cache rules and two-creator isolation with actual media.
- [ ] Validate function payload/memory budgets, SMTP, scheduled cleanup, recovery and operator-assisted account removal.
- [ ] Complete SECURITY.md release gates and prepare a reviewable candidate; deploy only to a separately approved target.
- [ ] Run all checks and isolated deployed smoke tests; record evidence before marking the MVP accepted.

Acceptance: real create-to-read journey works, keyboard/reduced-motion/WebGL-disabled readers can finish, no protected pre-unlock content or anonymous media leaks, revocation/expiry stop subsequent reads, and all release checks pass. Daily cleanup requires monitored invocations; no automatic retry or guaranteed erasure deadline is claimed.

## Future scope

No social login, recipient accounts, multiple recipients, arbitrary HTML/editor plugins, public media, custom template builder, analytics, billing, collaboration, end-to-end encryption or automatic production deployment in this MVP. The features identified as future in PRD.md remain outside these milestones.
