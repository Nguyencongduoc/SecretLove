# Day 3 security audit and stability

Date: 2026-10-14, Asia/Bangkok. Branch: `feature/day-3-security-deployment`. Scope: existing Creator Studio, gated recipient scenes, private photos/audio and particle-heart customization. No deployment or Prompt 07. This report supersedes historical assertions for the checks rerun here; documentation alone is not completion evidence.

## Method and actual implementation

Inspected AGENTS.md, TASKS.md, PRD/architecture/review/database/API/security documents, prior test reports, migrations 001–006, routes, server DAL, validators, client renderer/player and tests. The implementation uses Supabase verified creator identity plus owner RLS; privileged service-only transactional gateways recheck ownership. Recipient content/media uses a separate letter-bound session and publication/access-version checks on every request. Private media is delivered through authorized same-origin byte proxies, **not signed or public Storage URLs**. There is no arbitrary creator code or external music URL execution.

The current product intentionally omits recipient application playback controls after the owner's earlier approved request. Creator preview has Play/pause/volume/mute. Browser/OS pause and mute remain effective; forced uninterrupted playback is neither implemented nor promised. Name/DOB is a **low-assurance gate, not identity verification**.

Tests use a local production build, Chromium desktop/360px and the confirmed isolated Supabase project. The runner reuses three previously tracked synthetic accounts that have no active letters, requires both local ID tracking and synthetic email/metadata markers, and rotates disposable passwords in memory. No new account cohort, real-account mutation, email delivery, environment edits or agent-applied remote SQL. Test-created letters are removed through normal authenticated APIs. Global cleanup runs only in the confirmed isolated project.

## Confirmed finding and repair

**D3-01 — High: copied password-recovery proof replay.** The pre-repair live test authorized a first password update and then restored the original session/proof cookies in a second context. The second reset was not denied (assertion at the copied-reset status). Prior cleared-cookie tests had missed this case. The proof in `crypto.ts` was HMAC/user/token/expiry bound but stateless; `recovery.ts` only checked it and the reset handler cleared the caller's cookie afterward.

Remediation: new additive migration **007** adds `private.recovery_consumptions` with RLS and no browser grants. `sl_recovery_consume` is service-only, fixes search_path and atomically records a proof digest before the Auth password mutation. Duplicate/concurrent use returns false. No plaintext proof/token/password is persisted. Reset now consumes and clears the proof before update; failure after consumption requires a fresh recovery link. Authenticated cleanup prunes expired consumptions. Missing database support fails closed. The user manually applied 007 and confirmed read-only permission checks; 001–006 remain unchanged. See DAY3_RECOVERY_SETUP.md.

Local regression tests cover valid/invalid/expired/tampered/wrong-session proofs, RPC outage, duplicate/concurrent consumption, browser grants and expiry-only pruning. The initial local malformed-base64 error-code assertion failed; 007 was hardened **before application**, and the suite then passed. Initial pre-repair browser audit: 1 PASS / 1 FAIL. Final live repair: desktop and mobile first reset 200, copied-cookie second reset 401, provider callback-token replay redirected to the generic confirmation-failed login. Full final suite: 22 PASS / 0 FAIL / 0 skipped.

## Executed checks

PASS means the described assertions passed in the stated environment; it is not certification of all related behavior. NOT TESTED means no execution evidence. FAIL includes confirmed release-readiness gaps found by source review, even if automated tests are green. Severity denotes impact of control failure or release gap, not an assertion of an exploit where none was reproduced.

| Test/control | Status | Evidence / affected code | Severity | Remediation or limit |
| --- | --- | --- | --- | --- |
| Supabase environment/connectivity | PASS | `pnpm check:supabase`, exit 0; Auth public key accepted, required settings format-valid, anonymous view denied, service schema query succeeds | High | Values withheld; production settings not certified |
| Typecheck | PASS | `pnpm typecheck`, exit 0 after repair | Stability | Next route types + TypeScript |
| Lint | PASS | `pnpm lint`, exit 0 after repair | Stability | No errors |
| Unit/PostgreSQL integration suite | PASS | 53 passed, 1 optional local-file MP3 test skipped; 7 files | High | Tests apply migrations locally, use real PostgreSQL rules via PGlite; no remote SQL |
| Production build | PASS | `pnpm build`, exit 0 after repair | Stability | Dynamic private routes generated |
| Production dependency advisory query | PASS | `pnpm audit --prod`, exit 0: no known vulnerabilities reported | High | Registry snapshot, not proof of absence of unknown vulnerabilities |
| Production client secret scan | PASS | `scripts/check-bundle.mjs`: 63 client assets; no configured server-secret values | Critical | Does not certify external logs or deployment artifacts |
| Music/scene schema, anonymous denial, audio bucket | PASS | Read-only `check-music-schema.mjs`/`check-scene-schema.mjs`; private audio/mpeg bucket, 16 MiB | Critical | Photo bucket/RLS additionally covered locally and by existing live suite |
| Migration 007 manual application/grants | PASS | User confirmed complete transaction and read-only checks | High | Agent did not apply remote SQL |
| Full live browser regression | PASS | 22 passed, 0 failed/skipped; production build, real isolated Supabase; `assets/security/browser-summary.json` | High | Eleven scenarios in both desktop and 360px projects; exact coverage below |
| Immutable environment/dependencies/applied migrations | PASS | Ten hashes match: .env.local/package/lock + 001–006 from pre-audit; 007 from manual-application confirmation | Critical | No secret values printed or immutable files edited |

### Exact final browser scenarios

Each row below executed once on desktop and once at 360px: **2 PASS per row**, 22 total. Test source is the evidence for the listed assertions; one composite scenario is not a claim that every related edge case ran.

| Test name | Status | Evidence / assertions | Severity |
| --- | --- | --- | --- |
| Complete UI gift with photos, music, decoded QR, every scene and real media failures | PASS | `gift-flow.spec.ts`: real editor/create/save/photo/music/template/preview/publish; QR independently decoded; separate locked recipient, generic wrong credentials/429, authorized content, all scenes, persistent audio, reload/resume, simulated client expiry, network failure and missing synthetic object 503, legacy/null config isolation | Critical |
| Private MP3 upload, owner controls, automatic recipient soundtrack, isolation and cleanup | PASS | `music.spec.ts`: invalid/unsupported/overlimit/rights failures, upload/Enable/Save/reload/preview; Creator pause/volume/mute; denied anonymous GET/HEAD/Range and direct Storage; selected/enabled same-letter delivery, range 206/416, scene continuity, loop, external pause respected, error revalidation, Close unload/401, unpublish/disabled delivery, detached object physically absent after cleanup | Critical |
| Private heart customization, Unicode limits, actual preview, GPU lifecycle and static fallbacks | PASS | `particle-heart.spec.ts`: five phrases/60 points/NFC, Save/reload/reset, preview reveal without submitting/saving, live animated canvas, pointer/Enter, context-loss/reduced-motion fallback, direct preview reload, cross-owner denial and responsive framing | High |
| Unknown gifts and anonymous recipient endpoints expose no protected content | PASS | `recipient.spec.ts`: generic unavailable; content/photo/audio 404, no bodyDoc, wrong Origin 403 | Critical |
| Real published gift unlocks into all scenes, protects photos, resumes, closes and revokes | PASS | `recipient.spec.ts`: generic locked HTML/no private prefetch, normalized name + exact passphrase/no-phrase variant, HttpOnly/Lax cookie, cross-letter cookie transplant/media denial, actual photo bytes, scene/reload/Close/unpublish/republish and old-link denial | Critical |
| Copied recovery proof and provider callback cannot authorize a second reset | PASS | `security-audit.spec.ts`: first reset 200, original copied cookie/session second reset 401, consumed provider token generic failed-callback redirect | High; D3-01 fixed |
| Cross-creator mutations and missing/null/LAN origins fail closed, logout removes access | PASS | `security-audit.spec.ts`: B letter PATCH/DELETE/publish/unpublish/music PATCH 404; A missing/null/foreign/LAN Origin PATCH 403; own deletion 200; logout 200 then list 401 | Critical |
| Public pages responsive and production CSP permits hydration | PASS | `studio.spec.ts`: forms/client hydration/no page errors, no horizontal overflow, production CSP excludes unsafe-eval and denies framing, no-referrer | High |
| Anonymous Studio and content/media routes fail closed | PASS | `studio.spec.ts`: Studio redirects to login; list/letter/photo 401/no-store, reset without proof 401, unauthenticated cron 401, wrong-Origin create 403 | Critical |
| Configured creator can save, reload, preview, upload and delete a synthetic letter | PASS | `studio.spec.ts`: saved real message/verification/passphrase, write-only secrets absent on reload, authorized WebP, B RLS/GET/media denial, browser RPC/Storage denied, stale Save 409, cleanup response and logout | High |
| Provider recovery callback authorizes one session-bound password reset | PASS | `studio.spec.ts`: admin-generated recovery token callback, update, cleared-proof next reset 401, restored synthetic password and sign-out | High |

Current headless heart profile: 11,000/6,000 desktop/mobile particles; 7 draws/7 geometries/3 textures; median frame interval 16.7 ms, p95 16.7/16.8 ms over 95 samples each. This is bounded Chromium evidence, not physical GPU timing, battery, audibility or independently proven VRAM reclamation.

## Authorization and application coverage

| Test/control | Status | Evidence / affected code | Severity | Remediation or remaining limit |
| --- | --- | --- | --- | --- |
| Registration + delivered email confirmation/recovery | NOT TESTED | `/api/auth/[action]`, `/auth/callback`, AuthForm inspected; fixtures/admin links do not send email | High release gate | Configure SMTP/sender/templates/allowlist; complete real inbox flow |
| Creator session forced refresh/expiry + stolen old JWT after logout | NOT TESTED | `requireCreator` uses getUser; SSR/proxy refresh inspected | Medium | Ordinary login/logout is covered by E2E; no instantaneous JWT revocation claim |
| New-password login, expired provider recovery link and real parallel HTTP reset race | NOT TESTED | Reset/update and copied-proof denial pass; no dedicated new-password login/provider-expiry/parallel live requests executed | High coverage gap | Local concurrent consumption has one winner; these provider/live variants still need verification |
| Owner RLS, browser writes, private schema and RPC privileges | PASS | `tests/database.test.ts`: actual migrations, role switching, owner SELECT/browser mutation denial; all application RPC grants/invoker/search_path and ten table RLS flags checked | Critical | Service role still trusted; full live catalog snapshot not independently retrieved |
| Transaction ownership/version/frozen publication | PASS | Local foreign writes/stale saves/pending publication/quota/ready cleanup tests; `private.lock_letter`, DAL | High | Multi-host PostgreSQL concurrency/load remains untested |
| Recipient expiry, close, access-version and letter binding | PASS | Local gateways deny missing/foreign/expired/revoked sessions and media; issue after unpublish denies | Critical | Real 30-minute server expiry over HTTP not executed |
| Verification normalization/passphrase | PASS | Unicode/calendar/exact scrypt/corrupt-hash tests; `recipient.ts`, validators | High | Personal details remain guessable; cannot promise identity |
| Distributed limits and fail-closed configuration | PASS | SQL denied attempts persist; subject tests reject spoofed local forwarding headers and scope test namespace | High | Deployed trusted IP boundary and provider-wide outage not exercised |
| Safe structured message/scene/ring text | PASS | Script/link/image JSON rejected; React escaped text; strict Unicode/preset/length schemas; local rendering tests | High | Full malicious-input corpus or independent penetration test not performed |
| Origin/body/error rules | PASS | Unit tests deny missing/foreign Origin and oversized/malformed bodies; endpoint redacts provider errors and logs codes | High | Live missing/null/LAN checks in added E2E; no security exception for LAN HTTP |
| MP3/image byte-content validation | PASS | Decoder/framing/tag/duration/byte caps; image decode/re-encode/metadata/pixel limits | High | Limits not raised; broader VBR/CRC/device codec corpus and decoder load untested |
| Audio Range parser | PASS | Single bounded/open/suffix ranges; rejects multiple/unsafe/invalid input; auth precedes range metadata in routes | High | Repeated seeks fetch full bounded object; load/egress cost untested |
| Durable deletion, stale/orphan/ready guards and leases | PASS | Local enqueue/ready protection/expiry-bound bucket/path acknowledgements and retries | High | Live outage/queue drainage/cron/backup erasure remain separate gates |
| Public metadata and cache design | PASS | Generic `/l/[shareToken]` metadata/shell; no protected DAL preload; private no-store proxy/API headers inspected | Critical | Browser response/no-prefetch assertions in regression suite; deployed headers untested |
| Application logging | PASS | Source logs request ID/code/aggregate counts, not provider errors, credentials or letter bodies; error redaction test | High | Infrastructure logs/share URLs/retention require manual audit |

## Privacy, abuse and release gaps

| Test/control | Status | Evidence / affected code | Severity | Required action |
| --- | --- | --- | --- | --- |
| Unwanted-letter reporting | FAIL | No reporting route/form/operator workflow in actual source | High public-release gap | Approve minimal report intake, handling, retention and access policy before public launch |
| Recipient rejection/persistent blocking | FAIL | Only Close/session revocation exists in RecipientExperience; no durable rejection/block list | High public-release gap | Define recipient/privacy-preserving block behavior; Close is not a substitute |
| User-facing consent/privacy/retention disclosures | FAIL | Home/Auth/editor have no linked privacy/retention policy; music rights acknowledgement and low-assurance warning are narrower controls | High public-release gap | Supply reviewed policy, contact/process and permission disclosure; do not invent legal compliance |
| Account deletion operational flow | NOT TESTED | Auth FK RESTRICT; documentation requires operator-assisted letter/Storage cleanup | Medium | Test only a specifically approved synthetic account after cleanup; self-service deletion remains deferred |
| Physical retention/backups/platform log configuration | NOT TESTED | Cleanup logic exists; provider settings and deployed schedule not verified | High release gate | Document retention, access, incident response and scheduled worker monitoring |
| Synthetic fixture cleanup | FAIL | Final read-only inventory: 100 tracked/verified synthetic Auth accounts, 10 active synthetic letters and 19 tombstones remain | Medium | Audit adds no accounts. Bulk legacy removal not executed; operator must review IDs, remove owned letters through APIs, drain/verify media, purge dependencies before Auth removal |
| Full-size private audio on intended Vercel Functions | FAIL | App accepts/proxies up to 16 MiB; current documented function request/response body cap is 4.5 MB | High stability gate | Approve compatible private transport/hosting; no public bucket or unchecked signed URL workaround |
| Deployed HTTPS cookies/CSP/Origin/cache/IP/cron | NOT TESTED | No deployment authorized or performed | High release gate | Test approved HTTPS target separately |
| Physical mobile/Safari/audio/performance/accessibility | NOT TESTED | Chromium viewport is not real hardware; silent MP3 playback does not prove audibility | Medium | Test devices, screen reader, initially unavailable WebGL, live OS motion changes, long reading and repeated GPU teardown |

Vercel's [function payload limit](https://vercel.com/docs/functions/limitations) supports the transport gap above. Supabase documents [Auth sessions/JWT lifetime after sign-out](https://supabase.com/docs/guides/auth/sessions) and [provider Auth rate limits and proxy IP forwarding](https://supabase.com/docs/guides/auth/rate-limits). Creator auth currently uses provider limits; no application CAPTCHA or dedicated per-client auth limiter exists, and server proxying can share a provider IP budget. Validate configuration before public exposure; this is not evidence of unlimited brute-force access.

## Remaining manual verification and recommendation

**NO-GO for public release/deployment.** The confirmed High replay defect is fixed and its final live denial tests pass. Remaining blockers: public privacy/abuse controls, SMTP delivery, full-song hosting decision and deployed/device/cleanup/retention acceptance. No Critical or High authorization defect remains confirmed in the executed final checks; this is not a comprehensive penetration-test certification. Passing local and isolated checks allow continued isolated development, not public release approval. No environment/dependency/applied-migration changes or deployment occurred.

The single-use proof restricts the application's reset endpoint. It does not revoke every previously issued Supabase JWT or impose an equivalent recovery-proof requirement on Supabase Auth's own API. Provider password-change/reauthentication policy and stolen-token exposure require separate configuration review; do not claim immediate global invalidation or that this repair neutralizes an already compromised authenticated session.

Do not erase historical FAIL results. The recovery repair must show both its pre-fix failure and post-fix evidence. Separate local SQL expiry from real server-clock expiry; native event simulation from actual provider outage; one removed object from whole-queue erasure; device viewport from physical hardware. No other confirmed critical/high authorization defect is asserted merely from a documentation claim or hypothetical risk.

## Changed files

- `src/lib/server/recovery.ts`, `src/app/api/auth/[action]/route.ts`: durable single-use proof consumption and truthful fresh-link errors.
- `src/lib/server/cleanup.ts`: prune expired recovery consumptions through the authenticated worker.
- `supabase/migrations/202610140007_recovery_single_use.sql`, `docs/DAY3_RECOVERY_SETUP.md`: additive private schema/grants repair and manual instructions.
- `tests/recovery.test.ts`, `tests/database.test.ts`, `tests/browser/security-audit.spec.ts`: denial/concurrency/outage/catalog/real-cookie regressions.
- `scripts/isolated-browser.mjs`, `scripts/audit-isolated-fixtures.mjs`: opt-in reuse of tracked fixtures and read-only aggregate leftover counts.
- `docs/SECURITY.md`, this report and `TASKS.md`: repair, evidence and release gaps.
- `next-env.d.ts`: regenerated by production build from development to production type paths; no manual functionality change.
