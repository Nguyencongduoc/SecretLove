# SecretLove — Day 2 implementation and test report

Date: 2026-10-14 (Asia/Bangkok). The user authorized the complete recipient experience, including scenes previously scheduled for Day 3. The user confirmed manual application and read-only verification of migration 002. No remote SQL was executed by the agent; migration 001 and `.env.local` retain their original hashes. No deployment occurred.

## Implemented scope

- Studio publish/unpublish/republish and owner share retrieval, copy link and locally generated QR PNG; expected-version locks and frozen published content.
- Generic burgundy/pink/cream welcome and accessible verification; normalized name/DOB, optional exact passphrase, persistent limits and generic mismatch responses.
- Letter-bound HttpOnly session, fixed 30-minute expiry, explicit resume without renewal, close/revocation and every-request protected content/photo delivery.
- Motion envelope, lazy procedural R3F heart/pointer response, reduced-motion/static/WebGL-failure fallback, private memory gallery, safe formatted letter, generic closing/replay, stable Next/Back/Skip/scene controls.
- Strict V1 JSON shape and trusted two-template/scene registries. Legacy settings are resolved in memory, without backfills or editor/config persistence changes. No arbitrary user code or remote template/media execution.
- Experience-level expiry/access-loss cleanup, polling/visibility revalidation and abort/generation guards. Close hides content immediately, reports pending revocation and handles a failed remote close honestly.

The referenced UI image was not attached to the received request; implementation follows the supplied design language. Custom heart/closing text, persisted theme customization, private background/music uploads and the AudioProvider remain future work. Audio is disabled and protected audio routes deny delivery. No advanced theme/drag-and-drop editor or video processing was added.

## Final checks

| Check | Result | Evidence |
| --- | --- | --- |
| Typecheck | PASS | `pnpm typecheck`, exit 0. |
| Lint | PASS | `pnpm lint`, exit 0, no reported warnings/errors. |
| Local tests | PASS | `pnpm test`: 22 tests in 3 files, 0 failures. Actual migration/RLS/session tests run in local PostgreSQL/PGlite with test-only managed-schema fixtures. |
| Production build | PASS | `pnpm build`, webpack production output, exit 0; recipient and private API routes dynamic. |
| Final real-backend browser suite | PASS | 12 passed, 0 failed, 0 skipped; six tests each in desktop and 360px projects against isolated Supabase. |
| Client-secret scan | PASS | 59 built client assets scanned; configured server secrets absent, values withheld. |
| Supabase connectivity/owner denial | PASS | Public key accepted, anonymous creator data denied, server query succeeded without retrieving letter content. |
| Environment/initial migration preservation | PASS | Both protected-file hashes unchanged. |

## Recipient assertions

The real recipient composite ran twice (desktop and 360px). It uses application APIs and actual Auth/PostgreSQL/Storage data; it does not mock production responses.

| Behavior | Result | Exact coverage |
| --- | --- | --- |
| Publish, sharing and QR | PASS | Saved draft with private photo publishes; owner share field matches returned URL; local PNG download filename verified; application PATCH of published letter returns 409. QR payload decoding was not independently asserted. |
| Locked state | PASS | Active share page source lacks synthetic message; locked DOM lacks personal greeting; no content/media requests before interaction. Creator login alone yields recipient content 401. |
| Verification | PASS | Wrong name, omitted required phrase and wrong phrase return generic mismatch; normalized full-width/case/whitespace name succeeds with correct DOB/phrase; separate letter without phrase also unlocks. |
| Session | PASS | HttpOnly/Lax letter-specific cookie; reload + explicit Continue reading works and preserves exact expiresAt. Raw session/gate/path/owner data absent from content DTO. |
| Scenes | PASS | Envelope opens; heartbeat message reveals; actual desktop Canvas visible; gallery decodes real 60px WebP; bold synthetic main message readable; closing, replay and return/resume work. |
| Reduced motion/WebGL | PASS | Mobile reduced-motion heart uses no Canvas. Desktop test disables WebGL and can use static fallback then reach the main letter. Production CSP permits hydration; page error assertion passes. |
| Layout | PASS | Locked welcome and main letter have no horizontal overflow at tested desktop/360px widths. Screenshots of welcome/heart/letter inspected. A maximum-length letter and a full keyboard-only journey were not independently exercised. |
| Private images | PASS | Missing session GET/HEAD/Range 401; authorized real WebP GET 200/no-store; wrong photo ID 404; inactive/revoked share photo GET 404. Anonymous/direct Storage denial and creator isolation also pass in retained Day 1 suite. |
| Cross-letter isolation | PASS | A's raw session transplanted under B's cookie name fails content/media with 401. B's valid session cannot retrieve A's photo (404). Republished A has a new URL and cannot reuse old access. |
| Close/revocation | PASS | Explicit close returns 204 before post-close content assertion 401. Reverification works; unpublish blocks content/photo with 404; republish rotates URL and old bootstrap is 404. |
| Throttling | PASS | Sixth known-letter verification attempt returns 429/Retry-After; spoofed forwarding headers do not bypass local shared-IP limits. Local SQL also confirms denied attempts commit both scopes. |
| Audio privacy | PASS, denial only | Locked/unknown and authorized unsupported audio routes reveal no bytes, including Range; no audio playback/upload is implemented and no audible autoplay occurs. |
| Expiry, incomplete drafts and race rechecks | PASS locally | SQL rejects expired/revoked/cross-letter sessions, incomplete/pending/foreign publication and issuance after unpublish; client guards are implemented. No 30-minute live wait or deployed concurrent race test. |

Earlier browser runs stopped on an ambiguous alert selector (Next's route announcer) and an assertion made before asynchronous close completed. Both test issues were corrected; pending-close feedback was also added. An additional WebGL check confirms an actual failed renderer attempt, then a static fallback and reachable letter. Repeated unnamespaced local runs legitimately exhausted the shared 30-attempt window; the loopback-only isolated runner now scopes its rate keys per run without raising limits, trusting headers or clearing counters. The final complete suite after that correction passed all 12 executions with zero failures/skips.

## Remaining release gates / NOT TESTED

- Real SMTP signup/confirmation/recovery email delivery, deployed HTTPS/cookie/Origin/CSP headers, Vercel trusted-IP boundary, multi-instance races/resource budgets and scheduled cron delivery.
- Safari/iOS/Android hardware/performance, a complete keyboard-only journey, maximum-length letter scrolling, actual 30-minute live expiry, independent QR decoding and injected live provider outages.
- Physical object erasure and queue drainage are not independently asserted; synthetic application cleanup can remain pending. No guaranteed deletion deadline.
- Audio upload/inspection/playback, custom closing text, stored theme/animation controls and private backgrounds remain unimplemented future phases; no inherited PASS claims.
- Ten new synthetic confirmed accounts were created across the milestone's runs; 18 total remain tracked in ignored `.test-fixtures.json` for operator-assisted cleanup. Credentials remain in process memory; account deletion was not performed. Test letters are removed through application APIs in test cleanup, with physical-media cleanup asynchronous.

Day 2's executed checks pass. Production release remains conditional on the external/deployed gates; no automatic next milestone or deployment is authorized.
