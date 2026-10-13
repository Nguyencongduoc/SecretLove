# SecretLove Day 1 — final test report

Report date: 2026-10-14 (Asia/Bangkok). Scope: Creator Studio only. This report audits the final recorded Day 1 executions and their assertions; no new live test accounts or application changes were made for this report. Day 2 has not started.

**Final recorded result: PASS — 8/8 browser tests, 13/13 local tests, lint, typecheck and production build. FAIL — 0 tests in the final run. NOT TESTED items remain below; a passing suite does not mean every acceptance criterion is verified.**

## Authenticated browser tests

The browser ran against a local production Next.js server connected to the isolated real Supabase project. Auth fixtures were synthetic confirmed users created through the provider's admin API. They did not exercise signup email delivery. The complete browser suite consists of four composite test cases executed in each of two projects; individual assertions are not counted as additional tests.

| Exact authenticated test case | Desktop | Mobile, 360 × 800 |
| --- | --- | --- |
| configured test creator can save, reload, preview, upload and delete a synthetic letter | PASS | PASS |
| provider recovery callback authorizes one session-bound password reset | PASS | PASS |

The other four executions also PASS: `public pages are responsive and the production CSP permits hydration` and `anonymous Studio and content/media routes fail closed`, each on desktop and mobile. Final browser totals: **8 passed, 0 failed, 0 skipped**. `test-results/.last-run.json` records `status: passed` and an empty `failedTests` array.

## Creator flow results and exact coverage

| Check | Result | Observed assertion / coverage |
| --- | --- | --- |
| Confirmed-user sign-in/dashboard | PASS — live, both layouts | Creator A signs in through the form and reaches `/studio`; the New letter action is usable. Creator B's separate API sign-in returns HTTP 200. |
| Sign-out | PASS — live, both layouts | Studio sign-out returns the browser to `/login`. Auxiliary SDK clients sign out with `scope: local`. |
| Letter creation | PASS — live, both layouts | A unique synthetic title creates a letter, navigates to a UUID editor route and opens the editor. |
| Update and explicit Save | PASS — live, both layouts | Greeting, message, verification details and optional passphrase are submitted; the saved-status message appears. |
| Reload/persistence | PASS — live, both layouts | Created title and message remain after reload. Verification name/DOB fields are blank; the owner API response omits the submitted DOB and plaintext passphrase. |
| Title update | PASS — local PostgreSQL | Restricted Save RPC changes the title, returns version `2`, and a subsequent query reads the updated title. Live title editing after creation was NOT TESTED. |
| Saved preview | PASS — live, both layouts | Owner preview shows the saved greeting and exact saved message. The default rose template is exercised. |
| Editor unsaved-state regression | PASS — fixed and live-regression verified | `setEditable(!disabled, false)` suppresses content-update emission during busy-state changes. Save notification, reload and subsequent upload now complete successfully on both layouts. |
| Stale Save | PASS — live, both layouts | An update using stale `expectedVersion: '1'` returns HTTP 409. Local PostgreSQL separately confirms the prior title is retained. |
| Letter deletion | PASS — live, both layouts | Confirmed deletion returns to Studio; the deleted letter's photo API subsequently returns HTTP 404. Immediate denial before worker execution is verified locally, not independently asserted live. |

## Private media and isolation

| Check | Result | Observed assertion / coverage |
| --- | --- | --- |
| Private upload | PASS — live, both layouts | A synthetic 40 × 30 PNG uploads successfully; the saved-photo status appears and its protected image decodes with width 40. |
| Protected owner download | PASS — live, both layouts | Owner media proxy returns HTTP 200, `image/webp` and `Cache-Control` containing `no-store`. |
| Direct Storage denial | PASS — live, both layouts | Direct downloads of that actual object fail for both Creator A and Creator B, including the owner. |
| Cross-creator database read | PASS — live, both layouts | B's `creator_letters` query for A's actual letter returns no rows and no query error. |
| Cross-creator application reads | PASS — live, both layouts | B receives HTTP 404 for A's actual letter API and actual photo proxy. |
| Browser privileged write denial | PASS — live, both layouts | B's direct `sl_save_letter` RPC is denied with PostgreSQL code `42501`. |
| Anonymous protection / CSRF | PASS — live, both layouts | Anonymous Studio redirects to login; letter/content/media API requests return 401 with no-store and no `bodyDoc`. Wrong-Origin mutation returns 403. Anonymous requests use valid random resource IDs, not the populated fixture's IDs. |
| Image normalization / invalid inputs | PASS — local | JPEG input becomes WebP without EXIF or ICC metadata; invalid SVG bytes, input over 3 MiB and a 4097-pixel-wide PNG are rejected. This is not a live upload rejection test. |

## Media cleanup

| Check | Result | Observed assertion / coverage |
| --- | --- | --- |
| Authorized worker invocation | PASS — live, both layouts | Cleanup returns HTTP 200 and `data.failed === 0`. |
| Unauthorized worker invocation | PASS — live, both layouts | A request without the bearer secret returns HTTP 401. |
| Deleted-photo access | PASS — live, both layouts | Photo proxy returns 404 after deletion and worker invocation. |
| Logical deletion / cleanup enqueue | PASS — local PostgreSQL | Delete clears title/greeting, removes photo access and returns `mediaCleanup: pending`. Upload-conflict cleanup is committed while preserving the intervening Save. |
| Cleanup lease / failed acknowledgement | PASS — local PostgreSQL | A second claim cannot obtain leased jobs; an incorrect lease token cannot acknowledge a job; simulated failure retains the job and increments attempts. |
| Independent physical erasure verification | NOT TESTED | No post-worker service Storage download/list assertion proves the particular file is gone; no assertion checks `completed > 0` or `remaining === 0`. HTTP 200/zero reported failures alone does not establish a fully drained queue. |
| Storage outage and eventual retry | NOT TESTED — live | No actual Storage deletion failure followed by a later successful worker retry was induced. |
| Stale/orphan reconciliation and scheduled delivery | NOT TESTED | No aged reservation/orphan, cursor pagination shift, worker-crash recovery or deployed daily cron test was executed. |

## Password recovery security

| Check | Result | Observed assertion / coverage |
| --- | --- | --- |
| Provider recovery callback | PASS — live, both layouts | A real Supabase admin-generated recovery token reaches `/reset-password`; submitting a new password succeeds and returns to Studio. A fresh callback restores the fixture's original password. No email is sent. |
| Reset from ordinary login | PASS — live, both layouts | A normal signed-in creator without recovery proof receives HTTP 401. Anonymous reset is also 401. |
| Reset after proof-cookie removal | PASS — live, both layouts | A second reset request following successful reset receives HTTP 401. Coverage is limited to the browser's cleared proof cookie. |
| Proof binding / tampering / expiry | PASS — local | Proof is accepted for the matching user/token, rejected for another user/token, tampering and expired proof. |
| Copied-proof replay / expired provider links | NOT TESTED — live | The test does not restore a captured proof cookie or replay the provider callback token. The proof is stateless; server-side single-use consumption of a copied proof has not been established. |
| Password login after change | NOT TESTED as a dedicated assertion | Callback and update success are asserted; the suite does not explicitly sign in using the newly changed password. |
| SMTP and normal signup/recovery requests | NOT TESTED end to end | Actual registration confirmation, recovery-request email delivery and clicking those delivered emails remain manual external acceptance items. |

## Local test and build results

| Command / check | Final status | Exact result |
| --- | --- | --- |
| `pnpm typecheck` | PASS | Route type generation and TypeScript complete with exit code 0. |
| `pnpm lint` | PASS | ESLint completes with exit code 0 and no reported lint errors or warnings. |
| `pnpm test` | PASS | 2 files, 13 tests passed; 0 failed. Eight PostgreSQL/RLS tests and five validation/security tests. |
| `pnpm build` | PASS | Next.js production compilation, TypeScript, page generation and build tracing complete with exit code 0. |
| Live isolated browser runner | PASS | 8 passed, 0 failed, 0 skipped: four authenticated and four public/security executions. |
| Supabase configuration/schema check | PASS | Local setting formats valid, Auth accepts public key, anonymous view SELECT denied, service schema query succeeds. No protected letter content is retrieved by this checker. |
| Client secret scan | PASS | 45 client assets scanned; no configured service/HMAC/cron secret values found. |
| Git/environment checks | PASS | `.env.local` and `.test-fixtures.json` ignored; `.env.local` preserved; `git diff --check` passes. |

All eight local database cases PASS: owner isolation/browser-write denial; restrictive private-bucket policy; letter quota/optimistic versions; incomplete-gate rejection; upload-conflict cleanup; photo quota/finalized-photo retry protection/membership/deletion; cleanup leases/failure acknowledgement; durable rate counts.

All five local security cases PASS: identity/date/version/actor validation; rich-text allowlist/escaping/size rejection; keyed digests/scrypt/recovery binding; image decode/metadata/limits; Origin/body limits/redacted errors. PostgreSQL runs in PGlite with test-only Supabase-owned schema fixtures, not a deployed multi-connection environment.

## Earlier failures and remaining work

**FAIL — earlier executions, resolved:** the editor emitted an update when re-enabled and became dirty after Save; the initial image assertion ran before decoding; auxiliary SDK default global sign-out invalidated the browser session. These observed failures were corrected. A recovery-test nullability type error was also fixed. The independent request context was additionally corrected to share browser cookies before later assertions could execute successfully. Final suites have no failing tests. ESLint 10 peer constraints failed during toolchain selection; the compatible v9 pin resolves those constraints, but v9 deprecation remains a documented maintenance issue.

**NOT TESTED / pending:** individual photo description edits/removal, minimal-template selection, formatting-toolbar interactions, live cross-creator mutation attempts through application PATCH/DELETE routes, forced creator-session refresh/expiry, live malformed/multipart/animated image inputs, concurrent multi-connection quotas/upload races, live rate-limit exhaustion, production payload/memory budgets, Vercel deployment and cron delivery. Publishing, QR sharing and Recipient Experience are unimplemented later milestones.

Eight synthetic Auth accounts remain, with IDs in ignored `.test-fixtures.json`; some earlier failed runs may have retained synthetic drafts/photos. Operator-assisted cleanup has not been performed. No pre-existing non-test account was changed or deleted.

Day 1 implementation is delivered and the executed checks PASS. Full acceptance remains conditional on the explicitly untested email and cleanup/release items. This report does not mark Day 2 started or approve deployment.

Evidence: `tests/browser/studio.spec.ts`, `tests/database.test.ts`, `tests/security.test.ts`, `src/components/message-editor.tsx`, the final command outputs recorded in this task and `test-results/.last-run.json`.
