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

| Area                                                                                                                                              | Status                 | Actual final result                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Authenticated Creator CRUD/media/isolation composite                                                                                              | PASS                   | Desktop and mobile both pass; 2 executions.                                                                                            |
| Authenticated provider-recovery composite                                                                                                         | PASS                   | Desktop and mobile both pass; 2 executions.                                                                                            |
| Public forms/CSP and anonymous protection                                                                                                         | PASS                   | 4 executions; browser total 8 passed, 0 failed, 0 skipped.                                                                             |
| Editor unsaved-state regression                                                                                                                   | PASS                   | Update emission disabled for setEditable; Save notification and subsequent flows pass.                                                 |
| Create/update/Save/reload/rose preview/delete                                                                                                     | PASS                   | Live message/greeting update and persisted content; title-update behavior additionally tested locally.                                 |
| Upload/owner proxy/direct Storage denial/cross-creator reads                                                                                      | PASS                   | Actual PNG fixture uploaded; protected WebP GET 200/no-store; B letter/media GET 404; browser write RPC 42501.                         |
| Cleanup execution and logical revocation                                                                                                          | PASS, bounded coverage | Live worker 200/failed=0 and post-delete photo 404; local enqueue/lease/failure-ack tests pass.                                        |
| Physical erasure, queue drainage, actual outage/retry, orphan/stale reconciliation                                                                | NOT TESTED             | No independent object-removal/drained-queue assertion or injected live Storage failure.                                                |
| Recovery callback/proof binding/reset without proof                                                                                               | PASS, bounded coverage | Provider callback/update succeed; normal-login and cleared-proof second reset 401; binding/tampering/expiry pass locally.              |
| Copied recovery proof replay, provider-token replay/expiry, new-password login assertion                                                          | NOT TESTED             | Cleared-cookie denial does not establish server-side single-use consumption of a copied proof.                                         |
| Typecheck/lint/local tests/production build                                                                                                       | PASS                   | Exit code 0; 13 local tests across 2 files, 0 failed.                                                                                  |
| Supabase schema/configuration/client-secret scan                                                                                                  | PASS                   | Remote grants/query verified; 45 client assets scanned without finding configured server secrets.                                      |
| Current test failures                                                                                                                             | FAIL: 0                | Earlier editor and test-harness/typecheck failures were fixed; final runs pass.                                                        |
| Actual signup/confirmation/recovery email delivery                                                                                                | NOT TESTED             | Confirmed fixtures/admin-generated recovery tokens bypass email delivery.                                                              |
| Individual photo edits/removal, minimal template, formatting UI, live cross-creator application PATCH/DELETE, refresh/concurrency/rate exhaustion | NOT TESTED             | Implementation exists, but these specific end-to-end assertions were not executed. Direct privileged RPC denial was tested and passed. |
| Fixture account/data cleanup; deployed limits and scheduled cron                                                                                  | NOT TESTED / pending   | Eight synthetic accounts retained; operator cleanup and deployed checks remain.                                                        |

Historical Day 1 results: executed checks PASS; outstanding external/security checks remain below the later Day 2 evidence.

## Future customization planning — completed documentation, no implementation

Request/planning date: 2026-10-14 (Asia/Bangkok). The user authorized technical documentation only. This plan does not authorize Day 2, new feature implementation, dependency installation or database changes. Day 1 evidence above remains historical and is not a claim that the proposed features have been tested.

- [x] Review working Creator Studio types, strict validation, owner DAL/RPCs, static preview, private photo bucket and cleanup assumptions.
- [x] Confirm the live public table/view column names through read-only Supabase metadata; inspect private schema/constraints in the applied migration source. No rows/secrets printed and no database mutation.
- [x] Define separate message content, canonical template ID/revision and versioned JSON presentation overrides in ARCHITECTURE.md section 10.
- [x] Propose strict TypeScript/Zod contracts for theme, layout/effects, enable/disable music and kind-specific scene overrides, including optional separately protected final-message content.
- [x] Design trusted template/scene registries, global Letter Experience state/navigation, persistent AudioProvider/MusicPlayer interfaces, static preview and accessible fallbacks.
- [x] Propose future config/revision/final-message fields, private asset metadata/bucket and bucket-aware cleanup, without changing any migration.
- [x] Record legacy-default/read/write compatibility, asset privacy and manual-play/browser-volume/transport constraints.
- [x] Review renderer/code injection, every-request media authorization, reference races, ready-asset cleanup guards and mixed-worker claim/acknowledgement safety in SECURITY.md section 12.
- [x] Separate the small proposed Day 2 adapter/registry seam from post-MVP customization/music/3D phases in PRD.md and this plan.
- [x] Verify this revision's documentation examples: 20 local JSON/Zod shape/default/closing-text cases PASS, 0 FAIL using existing dependencies; these do not test asset membership, authorization or runtime playback. Documentation whitespace check passes. All 64 protected source/test/script/migration/dependency/config/environment files match the pre-review hashes, with no new source files. No application tests rerun or new dependencies installed; migrations/environment unchanged.
- [x] Day 1.5 approved; later user instruction authorized the complete Day 2 recipient experience. The planning-only hash/example evidence above remains historical.

Acceptance for this planning task: requested documents describe config/defaults/interfaces, database implications, privacy, compatibility and phase exit criteria consistently. Verify source/tests/scripts/migrations/package/lock/config/environment hashes remain unchanged; no application tests are rerun or presented as new-feature evidence.

## Day 2 — complete recipient experience (implemented; release gates remain)

The user approved Day 1.5 and explicitly authorized the full recipient journey, including scenes formerly planned for Day 3. This scope supersedes the earlier split. Music was excluded from that original milestone and subsequently explicitly authorized as the separate Day 2 extension below. Advanced theme/drag-and-drop editing, video and deployment remain excluded. Historical original evidence is in [docs/DAY2_TEST_REPORT.md](docs/DAY2_TEST_REPORT.md).

- [x] Read existing docs/modules and preserve Day 1 editor, authentication, ownership/RLS and private media behavior.
- [x] Add service-only publishing/share/verification/session/content/photo gateways in new migration 002. Local PostgreSQL tests pass; user manually applied SQL and confirmed read-only grants/RLS/bucket verification. Migration 001 and .env.local unchanged; no agent-executed remote SQL.
- [x] Implement draft completeness/pending-photo checks, frozen publication, expected-version ownership locks, unpublish and fresh-link republish.
- [x] Connect Studio sharing panel, copy link and locally generated QR PNG; publishing disabled while unsaved/busy/stale.
- [x] Implement generic welcome/verification, server-normalized name/DOB, optional exact passphrase, distributed limits and generic mismatch responses. UI states the low assurance of personal details.
- [x] Implement letter-bound HttpOnly/Lax/Secure production cookies, fixed expiry, protected resume without renewal, session close and per-request content/photo authorization.
- [x] Implement strict V1 shape and trusted legacy template/typed scene registries, with no stored config changes or user code execution.
- [x] Implement Motion envelope, lazy R3F pink heartbeat/pointer scene, memory gallery, safely formatted main letter, generic closing/replay and Next/Back/Skip controls. Empty gallery skipped; reduced-motion/static/WebGL-failure paths work.
- [x] Add experience-level expiry/access-loss clearing, generation/abort guards and visibility/poll revalidation. Close clears locally immediately and reports pending or failed server revocation honestly.
- [x] Historical pre-music Day 2 behavior: audio routes denied all delivery. The later authorized music extension replaces these denial stubs with selected/enabled asset authorization; audible autoplay remains prohibited.
- [x] Final typecheck/lint/build PASS; 22 local tests PASS; full desktop/360px real-Supabase browser suite 12 PASS, 0 FAIL, 0 skipped; 59 client assets pass secret scan. Earlier alert-selector and close-assertion races corrected.
- [x] Review welcome/heart/letter screenshots and record scope, dependencies and remaining coverage precisely.
- [x] Confirm real failed-WebGL initialization falls back to static content. Isolated loopback test runs use server-controlled rate namespaces; thresholds/counters remain intact, production/non-loopback behavior covered locally.
- [ ] Remove 18 tracked synthetic Auth accounts (10 new this milestone) through the operator-assisted cleanup workflow; no account deletion performed.
- [ ] Complete production/external gates below before claiming release acceptance. No automatic next milestone/deployment.

Acceptance achieved in the isolated project: a saved letter publishes/shares; unauthorized pages carry no protected content or preload; normalized correct details unlock all scenes; missing/wrong phrase fails generically; real private photos load only after authorization; transplanted cross-letter session fails; resume keeps exact expiry; confirmed Close returns 204 then content 401; unpublish/republish revokes old access/link; throttling persists and local spoofed headers do not bypass it. Legacy Creator regressions pass.

## Day 3 — security audit and stability (authorized; no deployment)

The user explicitly authorized the security audit on `feature/day-3-security-deployment`, including narrow fixes for confirmed critical/high defects, and instructed the agent to stop before deployment/Prompt 07. Day 2 scenes are preserved. Current evidence: [docs/DAY3_SECURITY_AUDIT.md](docs/DAY3_SECURITY_AUDIT.md).

- [x] Inspect actual routes/DAL/validators/renderer/tests, required architecture/security documents, prior reports and every applied migration 001–006.
- [x] Reproduce High recovery replay: pre-fix copied-proof denial fails; initial focused browser audit 1 PASS/1 FAIL. Normal cross-creator/Origin/logout test passes.
- [x] Add atomic digest-only server-side recovery consumption with migration 007; RLS/service-only RPCs, consume-before-provider-update and fail-closed errors. Applied migrations 001–006 unchanged. User manually applied 007 and confirmed read-only checks; agent executed no remote SQL.
- [x] Add regression tests for proof binding/expiry/tamper/replay/concurrent consumption/RPC outage/grants/pruning; exhaustively audit local app RPC permissions/search_path and all ten application-table RLS flags.
- [x] Reuse three existing tracked/marked synthetic Auth fixtures without creating a new cohort; passwords rotated only for those disposable accounts, held in memory. Read-only cleanup inventory exposes counts only. Real accounts and .env.local untouched.
- [x] Final local suite 53 PASS, 1 optional external-MP3 test SKIPPED, 0 FAIL, 7 files. Typecheck/lint/production build pass after app repair; production advisory query reports no known vulnerabilities; client-secret scan 63 assets passes. Read-only Supabase/music/scene checks pass.
- [x] Final full live desktop/360px suite: 22 PASS, 0 FAIL/skipped. Recovery repair proves first reset 200, copied original session/proof second reset 401, replayed provider callback generic denial in both projects. Gift/music/heart/recipient/Creator regressions pass; protected Range/direct Storage/cross-letter/owner/locked metadata and generic rate-limit cases pass. Credential-free summary archived in docs/assets/security/browser-summary.json.
- [x] Ten immutable-file hashes match (.env.local/package/lock/applied 001–006 pre-audit plus 007 post-manual-confirmation). Final typecheck/lint/whitespace checks pass; no dependencies/immutable migrations/environment edits or deployment. next-env.d.ts only regenerated by production build.
- [x] Explicitly identify missing public reporting, recipient persistent rejection/blocking and user-facing consent/privacy/retention disclosures. Source-review release gaps are FAIL, not passing feature tests.
- [x] Retain NO-GO for public release: privacy/abuse gaps, actual SMTP, full-song private hosting transport, deployed/device/cron/retention acceptance and synthetic cleanup remain open.
- [x] Complete docs/DAY3_SECURITY_AUDIT.md with actual results, confirmed High remediation, historical failures, affected code and manual verification. Stop after audit; no Prompt 07.
- [ ] Legacy fixture cleanup remains FAIL/pending: final read-only inventory 100 verified/tracked synthetic accounts, 10 active synthetic letters, 19 tombstones. No new cohort; whole-account/queue erasure not claimed. New-password login/provider-link expiry/parallel live reset/creator forced refresh and prior deployed/device gates remain NOT TESTED.

Audit acceptance: record actual PASS/FAIL/NOT TESTED with code/evidence/severity/remediation, preserve immutable files, verify corrected defects, and report release blockers honestly. The audit does not authorize deployment or the next prompt. Remaining release work:

- [ ] Verify real SMTP signup/confirmation/recovery delivery. Copied-proof replay is repaired in 007; record final live evidence separately from SMTP.
- [ ] Approve and implement public abuse/report/blocking and reviewed privacy/consent/retention controls.
- [ ] Approve private transport/hosting compatible with 16 MiB audio; current Vercel function payload ceiling is 4.5 MB. Never bypass authorization/private Storage to address it.
- [ ] Validate approved HTTPS deployment, Origin/CSP/cookie/metadata/URL-log behavior and Vercel's trusted-IP header boundary. Local shared-IP fallback is tested; deployment header behavior is not.
- [ ] Exercise real Safari/iOS/Android hardware/performance, full keyboard-only journey, maximum-length letter scrolling, independent QR decoding and actual 30-minute live expiry.
- [ ] Test deployed multi-instance publish/verify/revoke races, rate exhaustion/resource limits and injected provider outages.
- [ ] Independently verify queued physical removal/drainage, scheduled cron delivery and operator-assisted synthetic-account cleanup; no erasure-time SLA.
- [ ] Run deployed smoke/security checks and deploy only to a separately approved target.

Acceptance: complete all external/deployed gates with recorded evidence; no private pre-unlock data/cache leaks; real mail, hardware accessibility, failure/race handling and monitored cleanup verified. Current isolated tests do not substitute for these checks.

## Post-MVP customization implementation plan — not started

These phases add scope beyond the three-day MVP and need separate estimates/authorization. Their acceptance conditions are plans, not current PASS results. All future schema changes are new reviewed migrations; the Day 1 migration remains immutable.

### P1 — themes, layout/effects, optional closing content and additional templates

Order:

1. Approve JSON schema/capabilities and compatibility fixtures. Pin immutable legacy template definitions; define one new template using existing primitives to prove registry extensibility.
2. Separately review additive nullable `presentation_config`/`final_message_doc`, template revision and expanded template-ID constraint changes; append owner-view fields without changing existing column types/order/security-invoker/grants. Extend DAL/locked RPC contracts behind disabled feature controls. No destructive backfill or read-time writes.
3. Implement typed default/override resolution and strict server validation; reject unknown keys, CSS/URLs and unsupported font/preset IDs. Enforce enabled phase/editable option capabilities in the DAL; reject nonempty scene overrides until P3.
4. Add creator primary/background/color/font/layout/width/solid-gradient/bounded-effect controls and optional short closing text, explicit Save and static preview using the same resolver as the authorized reader. Register the optional final-message scene after the main letter. Keep viewer accessibility/motion overrides authoritative.
5. Test parity, older Save preservation, version conflicts, draft/publish rules, safe unknown-version fallback and new-template registration; run lint/typecheck/build/relevant tests before enabling writes.

Acceptance: existing letters need no data rewrite and retain Day 1 rendering/sequence; a new template works by registry registration without renderer orchestration edits; customization saves/reloads/previews consistently; a missing/empty closing message adds no stop, valid protected closing text follows the main letter and obeys 500-code-point/4-KiB limits; invalid/unsafe/out-of-phase input is rejected; older requests preserve config/closing text and pinned revisions; explicit config reset preserves template ID/revision and resolves its defaults. No music/asset uploads in P1.

### P2 — private background uploads and optional music

Order:

1. Approve audio limits/format, rights policy, server inspection/metadata-removal approach, actual browser-volume targets and hosting budgets. Proposed starting scope: one MP3 <=3 MiB/180 seconds and one normalized background <=3 MiB. No new dependencies/services are selected now.
2. Separately add private `letter_assets` metadata/bucket, owner-read RLS/service-only writes, per-kind quotas, bucket-aware cleanup jobs/cursors and reference checks. Keep legacy claims limited to photo jobs; new service-only gateways claim/acknowledge new-bucket jobs. Update existing SQL conflict targets without breaking old RPC signatures. Verify old photo jobs, mixed-worker safety and orphan scanning before new uploads are enabled.
3. Implement versioned reserve/upload/finalize/attach/detach/delete with owner/letter/kind/readiness checks and durable cleanup. Pending/ready rows count toward the single active slot per kind. Explicit detach atomically clears references, removes active metadata and queues bytes; unreferenced removal also queues cleanup. Replace only after freeing that slot; do not overwrite live bytes. Direct removal of referenced assets fails; published assets remain frozen. Failed/retried finalization responses cannot queue a ready live asset.
4. Add owner/recipient authorized audio HEAD/full/range routes and protected background delivery; every request rechecks access and exposes no Storage URL/path. Recipient routes also require current published selection and enabled audio; known unused/disabled UUIDs cannot grant delivery. Do not reuse the image-only upload endpoint for MP3s.
5. Add creator attach/enable/disable/default-volume/loop/explicit-audition controls and one AudioProvider/MusicPlayer above scene children. Implement manual Play, pause/resume/mute/unmute/volume, device-volume fallback, Next/Back/Skip continuity and close/expiry cleanup. Disable retains a validated attachment but makes no recipient requests; detach clears it. Apply default volume once and preserve recipient choices. No request before access/Play; optional media failure cannot block reading.
6. Test actual PNG/JPEG background and MP3 bytes, format/duration/size abuse, cross-owner/cross-letter/range denial, known unselected/disabled UUID denial, revoked access, real playback/seeking/volume, pause/scene transitions, atomic detach/reset cleanup, storage outage/retry and independently verified physical removal. Run all required checks and preserve Day 1 regressions.

Acceptance: creators upload/save/attach/detach one validated private track/background; enable, default volume and loop persist across reload; an authorized owner can explicitly audition a disabled attachment without changing its saved flag. Authorized recipients can start/pause/resume/mute/unmute/adjust volume with a truthful fallback where needed; navigation preserves playback time and runtime choices; loop-off ending is reflected in controls. Every GET/HEAD/range request is protected; disabled/locked/pre-Play tracks make no request; failed assets leave readable content only when access is valid; deletion retains retry jobs until physical removal is verified; old photos/cleanup and mixed old/new workers continue working. Do not claim uniform mobile volume, actual erasure or live retry without evidence.

### P3 — bounded animation and procedural 3D controls

Order: approve preset/parameter/performance limits → register typed option schemas/components → add creator controls and owner preview parity → enforce viewer reduced-motion/WebGL/static fallback → test navigation, resource disposal and low-end mobile performance → run checks before enabling.

Acceptance: creator pacing/heart color/scale choices persist, every scene can fall back/skip and the letter stays reachable; new registered effects obey the Scene Renderer contract without changing its orchestration. No arbitrary scripts/shaders, imported module URLs, uploaded models/fonts or general timeline builder. Those require a separate later design.

### Approval and readiness decisions

- [x] User approved Day 1.5 and the complete Day 2 journey/registries, then separately authorized initial MP3 music. Broader stored customization remains deferred.
- [ ] Approve the versioned JSON/contracts and optional protected final-message extension for later P1 implementation.
- [x] Implement the approved initial MP3 subset: one active track, <=3 MiB/180 seconds, manual start/default volume 0.35/loop off, explicit detach-before-replace and conservative quotas. Private background assets remain deferred.
- [x] Initial MP3 extension uses server-only mpg123-decoder, bounded frame/PCM validation and tag removal with mandatory rights acknowledgement. Deployed runtime budget and real-device browser acceptance remain release gates.
- [ ] Approve target browsers and device-volume fallback, trusted fonts/templates/layouts/effects and future phase estimates.

Broader background/theme/animation customization remains **NOT TESTED**. The subsequently authorized initial MP3 extension has separate current evidence below; historical documentation/example tests did not certify that runtime.

## Future scope

No social login, recipient accounts, multiple recipients, arbitrary HTML/editor plugins, public media, creator-authored code/templates, analytics, billing, collaboration, end-to-end encryption or automatic production deployment in this MVP. Theme/font/background/animation customization and broader music features remain deferred; initial private MP3 music is explicitly authorized as the separate extension below. The other future features in PRD.md remain deferred.

## Day 2 extension — private background music (explicitly authorized)

The user's Background Music implementation request authorizes this separate extension and supersedes the original milestone's music exclusion for this feature only. No theme/background/drag-and-drop/video/deployment work is included. The user manually applied migration 003 and confirmed verification succeeded. Existing migrations 001/002 and .env.local match their pre-extension hashes.

- [x] Reuse approved strict V1 music configuration; nullable stored config and silent defaults preserve existing letters and omitted-field Save behavior.
- [x] Add private audio metadata/bucket with owner-read RLS, browser Storage denial and service-only transactional RPCs in new migration 003; review for destructive top-level SQL and supply docs/MUSIC_SETUP.md.
- [x] Implement bounded MP3 framing/actual server decoding/tag stripping, configurable lower upload cap, duration limit, rights acknowledgement, upload/mutation/byte/backlog quotas and guarded reserve/upload/finalize/failure cleanup.
- [x] Add editor upload/remove-before-replace, enable/default volume/loop Save and manual owner preview. Unsaved music preferences block publishing/preview and warn on exit; existing editor mutation/version locks remain enforced.
- [x] Implement one native audio owner outside keyed recipient scenes: source assigned only after explicit Open with music, truthful Play/Pause/loading/error, mute/unmute/keyboard volume, looping, continuity and Close/access-loss teardown. Native/device volume fallback included.
- [x] Protect owner and recipient GET/HEAD/single Range; check authorization before metadata/bytes/range validation and require current enabled selected ready same-letter asset for recipients. No public/signed/external audio. Narrow media CSP.
- [x] Implement bucket-aware cleanup worker/scans/stale reconciliation and v2 bucket/path/lease acknowledgement, keeping legacy photo claims AND acknowledgements photo-only and ready assets safe.
- [x] Final typecheck/lint/production build PASS; 35 local tests PASS across 4 files; complete real-Supabase browser suite 14 PASS, 0 FAIL, 0 skipped (music 2, recipient 4, Creator/auth 8); earlier focused music suite 2 PASS. Client secret scan PASS: 61 assets. Exact assertions/limitations are in docs/MUSIC_TEST_REPORT.md.
- [ ] Real Safari/iOS/Android hardware audibility/volume behavior and a representative CBR/VBR/CRC MP3 compatibility corpus; synthetic silent MP3 does not prove these.
- [ ] Deployed resource/egress/abuse limits, injected Storage outage/cancellation, live stale/orphan scans and entire cleanup-queue drainage. One detached test track's physical removal is independently verified per music browser execution.
- [ ] Operator-assisted cleanup of 24 tracked synthetic Auth accounts (6 added this extension, including the interrupted full run); no existing account deletion performed. An interrupted run can leave synthetic drafts/media pending cleanup.

Acceptance: a creator uploads/explicitly previews one private validated track, saves/reloads preferences and removes/replaces it; authorized recipient manually starts playback with continuity and controls; locked/disabled/foreign/expired/revoked access denies audio; optional errors revalidate and retain readable content only with confirmed access; existing silent letters and photos work; local/security/browser checks pass with remaining deployed/device gates recorded. The full suite was interrupted by the instruction update and restarted; an incomplete run is not a PASS or an application failure.

## Day 2 integration validation — completed; release gates remain

The user explicitly authorized testing the complete creator-to-recipient flow, including the separately approved music extension, negative cases, and fixes for discovered defects. No deployment or production-data changes are authorized.

- [x] Read current product/architecture/review/schema/API/security documentation and preserve environment and applied migrations.
- [x] Add one combined UI scenario with two real private photos, authorized MP3, template selection, saved-letter/editor-track preview, publication, independent QR decoding, separate recipient context and all reading scenes.
- [x] Add actual browser photo/audio request failures and a missing private Storage object restricted to the new synthetic creator's exact asset path; all recipient access still uses normal server verification/authorization.
- [x] Add a local pre-upgrade Day 1 letter before migrations 002/003 and verify preservation, ownership, publication and denial without a recipient session. Local suite: 36 PASS.
- [x] Correct outdated editor sharing caption. Correct test waits for cloud latency and documented 200/202 deletion response; no application authorization or limits changed.
- [x] Combined focused desktop/mobile flow PASS before the added clock check. Move clock simulation into a separate browser context with normal verification; the prior in-flight run had loaded the old test.
- [x] Dedicated synthetic GIFT creator keeps combined uploads within the actual quota; original A/B regressions use their own budget. No rate counter clearing or threshold increase.
- [x] Fresh full browser suite PASS: 16 passed, 0 failed, 0 skipped (gift 2, music 2, recipient 4, Creator/auth 8). Typecheck/lint/production build PASS; local tests 36 PASS; client-secret scan 61 assets PASS. Exact 19-step scenario, negative cases, earlier test failures and coverage distinctions are in docs/DAY2_INTEGRATION_TEST_REPORT.md.
- [x] Verify simulated client expiry in an independent normally verified context clears content/unloads audio; actual expired-session authorization remains covered by SQL integration tests. No session injection or server-clock/rate changes.
- [x] Visually review desktop 3D heart and mobile/desktop closing screenshots. QR now independently decodes to its generated link; rose and minimal templates pass.
- [x] No environment/migration edits; .env.local and migrations 001–003 also match hashes captured for the final verification window. Initial temporary whole-task hash baseline unavailable; no broader independent hash claim.
- [ ] Operator-assisted cleanup of 34 tracked synthetic accounts (10 added this task) and any earlier failed-run fixtures; completed tests remove their letters through application APIs, with physical cleanup queued.
- [ ] Physical device/audio/browser matrix, actual 30-minute server expiry over HTTP, deployed limits/headers/cron and external release gates remain unverified. No deployment.

## Background music repair — 2026-10-14

User authorized diagnosing/fixing Enable/Save and playback, testing isolated flows and preserving authorization, environment, migrations and limits. No deployment or broader customization.

- [x] Read architecture/security/music contracts and verify required local settings without printing values. Original real-Supabase focused music suite: 2 PASS before edits; no general upload/finalization defect reproduced.
- [x] Distinguish selection from private upload; show local progress/success/errors and concrete reasons for disabled controls. Ready matching attachment required before Enable/settings; successful mutations synchronize returned settings.
- [x] Preserve mutation/version/unsaved-state/publication locks, rights acknowledgement and <=3 MiB/180-second server validation. No automatic enabling or audible autoplay.
- [x] Separate preview volume/loop updates from teardown; saving music settings no longer unloads the unchanged playing preview. Source change/unmount still releases playback.
- [x] Retain sanitized API error code for actionable local Origin denial. Supplied LAN HTTP Origin remains denied; no authorization or Origin policy changes.
- [x] Typecheck, lint, production build and 36 local tests PASS. Client-secret scan: 61 assets PASS. Read-only music schema/private bucket/anonymous denial checks PASS. Environment and applied migrations 001–003 match pre-repair hashes.
- [x] Final full browser suite: 16 PASS, 0 FAIL, 0 skipped (gift 2, music 2, recipient 4, Creator/auth 8), desktop and 360px with real isolated Supabase. Upload/inline failure/ready attachment/Enable/settings/reload/owner preview/recipient playback/continuity/isolation/cleanup/missing media/silent legacy flows PASS. Earlier augmented run 10 PASS/6 FAIL from status selectors/Origin injection; next run 14 PASS/2 FAIL from duplicate negative upload consuming the real shared quota. Correct selectors/injection and remove only the duplicate negative upload; limits/counters unchanged. See docs/MUSIC_FIX_TEST_REPORT.md for exact evidence and coverage limits.
- [ ] User's actual MP3/original upload response, hardware audibility/mobile codec matrix and successful LAN/HTTPS hosting remain untested. All earlier release gates remain; no deployment.
- [ ] Operator-assisted cleanup of 46 tracked synthetic accounts (12 added this repair) and any failed-run test objects. Completed tests remove test letters through application APIs; physical removal of the detached music fixture is verified, full queue drainage remains untested. No existing non-test accounts changed.

## Full-song audio limits — 2026-10-14

The user requested support for a complete song around five minutes and supplied a local MP3. This explicitly authorizes revising the previous conservative audio caps only; preserve privacy, photo limits, quota/rate/session rules, environment and applied migrations. No deployment.

- [x] Inspect sample locally: 5,432,686 bytes (5.18 MiB), ~331.42 seconds (5:31), VBR. Confirm rejection by old 3 MiB/180-second caps. Do not upload/retain the user's song as a fixture.
- [x] Set shared editor/upload/protected-delivery product caps to 16 MiB/360 seconds; retain server decode/framing/metadata removal, two-inspection/eight-second budget, four downloads and 60 MiB aggregate quota. Optional server byte setting may still lower the cap; the local environment does not currently override it.
- [x] Prepare forward migration 004: validate wider CHECK constraints before replacing old constraint definitions and update only private audio bucket size. No row/object deletion, table drop, reset, RLS/grant/RPC changes or applied-migration edits. Provide manual guide and read-only checks in docs/FULL_SONG_AUDIO_SETUP.md.
- [x] Local PostgreSQL migration/data-preservation/RLS/quota tests PASS. Five-minute generated MP3 above old bounds and full decode of the supplied VBR MP3 PASS. Opt-in local suite: 39 PASS, 0 FAIL, 0 skipped (normal portable suite intentionally skips the external-file test if no path is provided).
- [x] User applied 004 and confirmed SQL verification/global Storage configuration succeeded. Automated read-only music/metadata schema, anonymous denial and private 16 MiB audio bucket checks PASS.
- [x] Final typecheck/lint/production build and client-secret scan (61 assets) PASS. Initial browser run: 14 PASS/2 FAIL; Next's 10 MiB proxy truncated the oversized multipart request into 400 instead of 413. Correct bounded 17 MiB proxy buffer, retaining each route's body/file limits; rebuild and fresh rerun PASS.
- [x] Final full browser regression: 16 PASS, 0 FAIL, 0 skipped, desktop/360px with real isolated Supabase. Music uses a five-minute synthetic >3 MiB private MP3; actual upload, matching ready metadata, owner byte download/preview, Save/reload, recipient unlock/Play/scene continuity/controls, GET/HEAD/range/session/isolation/cleanup PASS. Over-16-MiB upload now correctly returns 413. Other gift/Creator/auth/recipient regressions and old silent letters PASS. No user song uploaded to Storage.
- [x] No environment/applied-001–003 write operation performed; final-window hashes match the baseline outside browser output cleanup. Initial whole-task baseline was removed by Playwright; do not claim a whole-task independent hash audit. Migration 004 was manually applied by the user and not edited afterward.
- [ ] Operator-assisted cleanup of 52 tracked synthetic Auth accounts (6 added this change) and any older failed-run objects; completed browser tests delete their test letters through application APIs. No production data/account changes. Physical-device audibility/codec matrix and deployed resource/transport gates remain NOT TESTED.
- [ ] Vercel large upload/delivery transport: existing Function body ceiling prevents this proxy upload size. Approve/design a private bounded chunk/resumable pipeline or compatible hosting before deployment; do not introduce public/signed recipient media. Device audibility/codec/deployed-resource and previous release gates remain.

## Automatic recipient soundtrack and editable scene copy — 2026-10-14

The user explicitly authorized no recipient playback controls, soundtrack initiation during unlock/open, and editable Heart/Closing wording. This supersedes earlier separate-Play/recipient-control and deferred-closing-copy scope for this subset only. Browser/OS sound permissions always remain effective; do not claim forced uninterruptible playback or bypass authorization. Creator preview keeps its controls; no deployment.

- [x] Add bounded plain-text Heart subtitle/heading/invitation/revealed message and Closing subtitle/heading/message to the editor, shared Save/version/dirty/freeze locks and saved owner preview.
- [x] Add nullable protected scene_text and service-only gateway support in new migration 005; preserve defaults, omitted-field Save, music/config, RLS/grants/Storage and applied migrations. Atomic tombstone trigger clears scene content. Manual guide/read-only checks in docs/SCENE_TEXT_SETUP.md.
- [x] One recipient-level background player starts after authorized user-initiated unlock/resume; NotAllowedError gives a truthful envelope/navigation interaction fallback. No app/native pause/mute/volume controls for recipients; Creator preview unchanged. Scene navigation retains the player; close/expiry/access-loss cleanup remains.
- [x] Initial local checks: typecheck/lint PASS; 43 local tests PASS, 1 optional external-MP3 test skipped. Earlier fixture publication lacked published_at and test query/ref typing/lint needed correction; no production constraint or security rule removed.
- [x] User manually applied 005 and confirmed verification. Automated read-only owner view/column and anonymous denial checks PASS; no remote SQL executed by the agent.
- [x] Final typecheck/lint/production build PASS; 43 local tests PASS, 1 optional external-MP3 test skipped; client-secret scan 61 assets PASS. Full browser suite 16 PASS, 0 FAIL, 0 skipped, desktop/360px. Custom copy Save/reload/owner preview/publish/authorized heart-reveal/closing, pre-unlock privacy and literal markup rendering PASS. Background soundtrack/NotAllowedError interaction fallback/no recipient app/native controls/Creator audition/continuity/default volume/loop/private isolation/cleanup/expiry and audio failure revalidation PASS.
- [x] Initial browser run: 14 PASS/2 FAIL from reloading before preview-to-editor navigation committed. Correct navigation wait; no assertion/security bypass. A later run was interrupted before completion and has no PASS claim; the fresh final run above passes. Scene editor reflects server-normalized text after successful Save.
- [x] Visually review desktop/mobile closing screenshots: customized Unicode/newline text wraps correctly, recipient playback controls absent. Environment/dependencies/applied migrations 001–005 match the post-interruption final-window baseline. Initial full-turn baseline was lost at interruption; no independent whole-turn hash claim. No environment/dependency/applied-migration write operation performed.
- [ ] Operator-assisted cleanup of 61 tracked synthetic Auth accounts (9 added this extension, including interrupted fixture setup) and any prior failed-run objects; no existing non-test accounts changed. Completed tests delete their letters through authorized APIs; full queue drainage not claimed.
- [ ] Physical-device audible autoplay/codec/device-controls matrix, deployed performance/transport, real email delivery and previous release gates remain NOT TESTED. Browser/OS can always silence or pause media; there is no forced-uninterruptible guarantee. No deployment.


## Day 2 extension — particle heart and private rotating text rings (2026-10-14)

User explicitly approved reference-driven redesign, original procedural geometry, bounded Studio customization and new additive migration 006. Work remains on feature/particle-heart-customization. Day 3/deployment/general animation or theme editors are not authorized.

- [x] Decode the actual local reference (1920x1200, 5.802646s), extract and inspect four representative frames before renderer changes; retain frames/metadata under references/heart.
- [x] Replace solid mesh with deterministic volumetric heart Points, bounded star/dust draws, heartbeat/float/entrance/shimmer/pointer feedback, invisible hit volume and keyboard reveal button. No GLB/GLTF or downloaded asset; original procedural source explicitly approved.
- [x] Render true tangent-oriented instanced 3D text rings with local glyph atlases, Vietnamese NFC/graphemes, measured/adaptive spacing and independent safe rotation presets; <=5 phrases/60 Unicode points, curated colors, static/reduced-motion/context-loss fallbacks and portrait framing.
- [x] Add integrated Studio controls, add/remove/count/reset, explicit unsaved actual-scene preview and saved owner preview; share Save/version/dirty/draft freeze and synchronize server-normalized settings. Preview reveal must not submit the editor form.
- [x] Extend protected outer/inner V1 JSON in existing presentation_config. Add migration 006 validator/CHECK and narrow Save/music JSON merges; preserve gates/ownership/ready/quota/version/RLS/Storage. User applied 006 manually and confirmed read-only checks. Migrations 001–005 immutable.
- [x] Add local configuration/volume/database/music-preservation/owner/version/freeze/reset/deletion/authorized-content tests. Local suite 47 PASS, 1 optional external-MP3 test SKIPPED. No test skip is represented as PASS.
- [x] Focused desktop/mobile browser tests PASS (2/2), then complete pre-final-visual suite PASS (18/18): custom Unicode/five-ring Save/reload/reset/local preview, actual pointer/keyboard interaction, no preview persistence, owner denial, reduced motion/context fallback, protected gift flows, media/music/auth regressions. Historical fallback/preview-submit/hydration-test failures corrected; an outdated waiting run was intentionally stopped, not counted PASS.
- [x] Final production build/typecheck/lint PASS; 47 local tests PASS, 1 optional external-MP3 SKIPPED. Complete final browser suite: 18 PASS, 0 FAIL, 0 skipped. Direct owner-preview refresh initially exposed SSR motion mismatch (2 focused failures); fix with static useSyncExternalStore server snapshot/live browser subscription, and rerun full suite successfully. No auth/media rule changes. Final snapshots visually compared with four reference frames; median headless interval 16.7 ms at 11000/6000 points, 7 draws/7 geometries/3 textures for three rings. Physical GPU memory/performance not claimed. Client secret scan 63 assets PASS; 8 baseline env/dependency/applied-001–005 hashes match, and 006 unchanged since manual application. Exact evidence: docs/PARTICLE_HEART_TEST_REPORT.md.
- [x] Document renderer/data/API/security/manual SQL/UAT; keep global music/session/media authorization unchanged. A diagnostic exposed only one disposable synthetic fixture password; invalidate that marked fixture credential with fresh random bytes and discard the new value. No real-account/environment credential exposed.
- [ ] Physical iOS/Android/Safari GPU/audibility/font/accessibility matrix and repeated-cycle hardware memory/battery profiling; deployed transport/SMTP/cron/resource gates remain NOT TESTED. No deployment.
- [ ] Operator-assisted cleanup of 100 tracked synthetic Auth accounts (39 added this task) and prior/interrupted test objects; complete tests remove their test letters via normal application APIs. Full queue/account drainage remains unverified.

Acceptance: inspected actual video plus compared rendered desktop/portrait screenshots; recognizable filled particle heart and readable real 3D rings; creator edits/save/reload/reset/preview/publish agree without dirty-state regression; no protected phrase before normal unlock or from another owner/letter; same soundtrack across scenes; static/motion/context/keyboard exits remain usable; final lint/typecheck/unit/build/browser checks PASS with hardware/release limitations explicitly retained.

## Prompt 07 — deployment readiness and private Preview preparation

Explicitly authorized after the completed security audit, on `feature/day-3-security-deployment`. Owner approved same-origin <=1 MiB chunks and manually applied/verified 008. Proposed project **secretlove-preview** is uncreated/unverified; **exact HTTPS origin pending**; owner-only Vercel Authentication and existing isolated Supabase project. Project creation, remote settings, deployment, public release and Prompt 08 are not authorized. Migrations 001–008 are immutable; 009 is next unused if separately required.

- [x] Implement authorized private upstream audio streaming/Range with metadata validation, no public/signed redirect, private/CDN no-store, backpressure/cancellation, four lifetime slots and 45-second deadline. Retain per-request letter authorization and disclose in-flight/delivered-byte revocation limits.
- [x] Implement approved small begin/commit plus binary chunk endpoints, private staging and service-only transactional gateways. Owner/draft/version/Origin, immutable part/full hashes, server MP3 normalization, pending publication denial, lease/expiry, raw+candidate quota and durable cancellation/expiry cleanup preserved. No product-cap increase or dependency added.
- [x] Studio uses chunks with truthful progress/errors, expected-version reconciliation and pending-upload cancellation after reload; existing music configuration/creator controls/recipient soundtrack/heart scenes unchanged. Legacy large multipart endpoint is not certified on Vercel.
- [x] Migration 008 reviewed/tested locally and manually applied/verified by owner. Cleanup v3 handles staging; old claim/ack remains isolated. No agent-executed remote SQL.
- [x] Prepare Preview-only build guard/Vercel config with Git auto-deploy disabled; exact HTTPS Origin, isolated reference, scoped credentials, callbacks, cookie/CSP/cache/IP boundary, SMTP, cron/operator/monitoring/rotation/rollback checklist. No target URL invented or remote configuration changed.
- [x] Prepare guarded actual-HTTPS target test: large chunk upload/full streamed checksum/Range/native music/heart/cookies/revocation. Test is NOT RUN; localhost tests cannot certify provider edge compatibility.
- [x] Record approved report-led suspension after sole Project Owner/Administrator review, Close as session revocation, pending verified contact and proposed retention targets. Internal draft only; provider documentation checked, actual plans/settings NOT VERIFIED. No final privacy publishing, compliance claim or destructive account cleanup.
- [x] Initial local tests: 69 PASS, 1 optional external-file MP3 SKIPPED across 9 files; typecheck/lint/production build PASS. Supabase config/connectivity, dependency audit and client secret scan PASS. New manifest/chunk security E2E: 2 PASS desktop/360px. Final regression evidence is tracked in docs/DAY3_DEPLOYMENT_READINESS.md.
- [x] Final typecheck/lint and local suite rerun PASS (69 PASS/1 optional SKIPPED). Eleven protected-file hashes match: environment, dependencies, 001–007 baseline and 008 since manual application. No new dependency or protected-file edit.
- [x] Correct browser test measurement: Blob postData/body-size capture did not supply upload bytes despite successful server commit. Assert transmitted Content-Length matches every expected <=1 MiB part. Earlier full regression 20 PASS/2 FAIL at that assertion; corrected focused desktop music 1 PASS. No upload/security limit relaxed.
- [x] Final complete desktop/mobile regression PASS: 24 PASS, 0 FAIL, 0 SKIPPED (twelve scenarios per viewport), real isolated Supabase/local production build; includes new chunks plus existing Creator/recipient/music/heart/recovery flows. Credential-free counts archived in docs/assets/readiness/prompt07-browser-summary.json. Actual Vercel target remains NOT TESTED.
- [ ] Create/verify proposed project, exact HTTPS origin/Protection/Preview credentials and callback/SMTP settings only under separate authorization; obtain explicit protected target deployment approval, then execute target compatibility/security/SMTP/IP/cron/monitoring checks.
- [ ] Verify real provider log/backup/export/Storage deletion capabilities, contact channel and report/suspension scope before final policy or public release. Hardware/codec/performance and public audit gaps remain.
- [ ] Historical synthetic accounts/objects remain subject to precise cohort manifest and explicit cleanup approval. No bulk Auth deletion; no complete queue-drain claim.

Constraint caveat: the first focused legacy music test invoked unscoped `/api/cron/cleanup` in the isolated project before calls were excluded. It may have processed historical tombstones/queued objects beyond the authorized current-test cohort. Without a before-run object manifest, exact effects are NOT VERIFIED; do not claim historical preservation or scoped worker success. Read-only inventory afterward found 100 tracked/verified accounts, 10 active synthetic letters and 20 tombstones; no Auth accounts deleted. All subsequent browser tests omit authenticated global cron, delete only their own newly created letters and leave cleanup work queued. Music checks direct removal only of an exactly identified object created/detached by that test, not global worker drainage.

Acceptance: bounded private upload/delivery implemented with truthful local/isolated security evidence and immutable schema/config history; protected Preview/manual operational gates distinct from public release. **Private Preview deployment now NO-GO** pending actual target setup/approval/verification; **public production independently NO-GO** pending privacy/abuse/contact/retention and broader release gates. Stop after Prompt 07; no deployment or Prompt 08.

## Prompt 07.5 — private Preview setup and HTTPS acceptance (2026-10-15)

User authorized offline configuration review, preparation and **conditional** testing only after explicit setup/deployment approval on `feature/day-3-preview-acceptance`. Current code baseline `724325558c7d7b18be15bf21b4eaf793f80ec4f1` was clean at start. Previous Prompt 07 implementation is retained. This instruction supersedes the earlier stop-at-07 solely for preparation; it grants no remote creation/configuration, deployment, public release, account deletion or Prompt 08.

- [x] Inspect required readiness/audit/setup/product/architecture/security documents, current source, config and ordered 001–008 history; correct branch verified. No applied SQL/application/dependency/environment modification.
- [x] Verify local public Supabase reference `samelfoyrujhcywcnofw` and preserved loopback APP_ORIGIN without printing secret keys. Actual Vercel identity/origin/settings NOT VERIFIED; no .vercel/project.json or installed CLI, no inference that remote project is absent.
- [x] Prepare docs/PREVIEW_OPERATOR_CHECKLIST.md: all nine operator areas, effective owner-only All Deployments access review, exact Preview env/Auth/SMTP/runtime/resources/alias inventory, approval packet and safe cleanup boundary.
- [x] Rerun only local tests: 69 PASS, 1 optional external-file MP3 SKIPPED, nine files; no remote state changed. Prior typecheck/lint/build/24 E2E remain historical, not rerun or claimed as HTTPS evidence.
- [x] Record interim docs/DAY3_PREVIEW_ACCEPTANCE_REPORT.md with seventeen required target tests marked NOT TESTED, evidence/limits/corrective actions/release impact; distinguish existing target scenario's partial coverage from supplemental acceptance.
- [x] Update production checklist, deployment runbook and readiness follow-up; record separate attempt-readiness NO-GO, owner-only acceptance NO-GO/NOT TESTED and public-production NO-GO.
- [ ] Operator provides real Vercel account/team/project ID/existence, actual stable HTTPS Preview origin/aliases, resource/plan/region choices and approved sender/test inboxes. No invented target or contact.
- [ ] Present complete exact target/environment/protection/revision/action, ask explicit setup/creation/deployment authorization as applicable and STOP until received. Resolve origin-before-creation dependency explicitly; identifiers alone are not approval.
- [ ] Configure/create only within approved scope, verify owner-only All Deployments protection, then deploy one expressly approved Preview acceptance target. No unprotected discovery deployment or Production promotion.
- [ ] Execute protected HTTPS seventeen-test matrix, real authorized SMTP/callbacks, trusted-IP/metrics/rollback verification; fix confirmed defects and rerun relevant checks. No unexecuted PASS.
- [ ] Obtain exact new-fixture/path cleanup authorization and safe physical test scope. No valid global cron/historical sweep and no existing synthetic Auth deletion; current queue worker has no cohort selector.

Stop now at Phase B pending exact inputs and explicit operator approval. Phase A is offline preparation only; Phase C/owner acceptance are unfinished. No remote resources/settings, mails, SQL, global cleanup, synthetic account changes or deployment performed during this phase. No Prompt 08.

### Prompt 07.5 origin bootstrap proposal — owner setup update

- [x] Owner reports project creation/link, Standard Authentication, disabled Git auto-deployment and no deployment. Inspect local link: project prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK / org team_KJpwyYId3LugWZ4U1jnF4h67. CLI 64.0.2 version/help verified; no remote resource/API operation run. Preserve the owner's .gitignore change excluding .vercel.
- [x] Prepare docs/PREVIEW_ORIGIN_PLAN.md: compare immutable generated URL, Git/CLI-generated aliases, Production-assigned hostname and separate manual free alias; recommend the latter with All Deployments and an explicit two-stage bootstrap approval. Exact APP_ORIGIN validation and Preview-only guard need no code change. No application, migration, environment or dependency edit.
- [x] Update operator/runbook/interim report with actual local identifiers and owner-reported state; earlier no-link/CLI observations remain historical. All seventeen HTTPS checks still NOT TESTED; no new test execution claimed for this planning-only turn.
- [ ] Obtain actual scope slug, existing Production-assigned hostname, proposed separate alias and complete settings/resource/action approval packet. Candidate availability cannot be promised before allocation; no guessed URL.
- [ ] After explicit authorization only, tighten to All Deployments, configure project-level Preview values, create one --target=preview artifact, inspect it, assign only the exact approved alias and verify protection/TLS/Origin. Conflict ends the attempt; no alternate alias, Production workaround or callback/mail changes automatically.
- [ ] Configure approved exact Supabase callback settings and run separately authorized HTTPS/mail/fixture acceptance only after canonical origin verification. No global cleanup or existing synthetic account deletion.

Attempt/owner acceptance/public recommendations remain NO-GO pending their separate gates. No remote setting, alias assignment, deployment or email sent. No Prompt 08.

### Prompt 07.5 — focused modern Storage authentication fix

User approved a dedicated modern secret credential under the existing SUPABASE_SERVICE_ROLE_KEY name and authorized this narrow compatibility fix/tests only. Preserve all application authorization, private Storage and 001–008; no settings/credential rotation, mail, global cleanup or deployment.

- [x] Inspect direct Storage HTTP usage: only production audio streaming uses a handcrafted Storage request; other media operations remain on the server SDK. Modern key now uses apikey only; legacy JWT bearer behavior retained. No transport/endpoint/path/session/quota/Origin/guard change.
- [x] Add focused modern/legacy full-stream/Range/HEAD/416/header/non-disclosure tests and actual owner/recipient route-wrapper denial tests with mocked DAL. 19 focused tests PASS; mock results are not hosted authorization/key compatibility evidence.
- [x] Final typecheck/lint PASS; production build PASS. Portable suite: 80 PASS, 0 FAIL, 2 SKIPPED across eleven files (optional external MP3 and opt-in live modern Storage). Existing SQL security tests remain in-memory, not remote execution.
- [x] Add strictly opt-in read-only live test using privately configured actual modern key and only existing tracked/marked synthetic active-letter audio. Attempt SKIPPED because no reusable ready synthetic audio exists. No fixture/account/database mutation or tombstoned-media access; no actual live streaming/RPC/anonymous-media PASS claimed.
- [x] Document evidence/limits in docs/MODERN_STORAGE_AUTH_TEST_REPORT.md. Existing user documentation/.gitignore edits preserved; environment, dependencies, deployment configuration, local project link and applied 001–008 unchanged.
- [ ] Operator supplies an eligible active ready synthetic MP3 fixture through a separately authorized normal Creator flow; rerun read-only actual modern Storage helper GET/Range/HEAD/416/RPC/anonymous-denial checks. No key paste or rotation needed; modern key already privately available.
- [ ] Hosted owner/recipient/cross-letter/HTTPS/Preview acceptance remains NOT TESTED for this fix, separate from prior historical browser results. No deploy or Prompt 08.

### Prompt 07.5 — actual modern Storage fixture review (2026-10-15)

**Latest decision supersedes pending fixture/login steps below:** operator deferred the optional local live test. Do not create/upload its draft/MP3; keep actual SKIPPED / NOT TESTED result. Previous fixture approval/login handoff is retired. No remote draft/audio fixture was created; earlier approved local silence file remains untouched. Any later fixture writes require separate approval.

- [x] Run the existing read-only inventory and paginated marked/tracked synthetic metadata selection against the isolated project: 100 verified accounts, 10 active letters, 61 tombstones, zero ready/pending audio on active letters. No historical data/accounts changed; counts are not a cleanup claim.
- [x] Rerun `tests/audio-live.test.ts` with the privately configured actual modern key: **0 PASS / 0 FAIL / 1 SKIPPED**, missing ready synthetic MP3. Full GET/Range/HEAD/416/RPC/header/anonymous-media assertions remain NOT TESTED.
- [x] Prepare `docs/MODERN_STORAGE_FIXTURE_PLAN.md`: exact confirmed synthetic Creator ID, one new draft, one copyright-free silence MP3, existing normal authenticated Studio upload, no publication or historical modification, no cleanup/mail/password changes. No fixture file created; source bytes computed in memory only.
- [x] Receive explicit approval for the exact fixture scope; operator reports an existing authorized login/session. Browser access still requires independent verification. A/B/GIFT test login inputs are absent locally; account/password changes or admin auth bypass are not allowed.
- [x] Subsequent operator reply approves the exact one-draft/one-MP3 plan. Generate only the approved local 16,680-byte synthetic MP3 in ignored test-results/fixtures; checksum matches. Read-only recheck confirms approved account is synthetic/confirmed with zero active letters. No database fixture created yet.
- [ ] Complete normal Studio login handoff. Operator reported sign-in, but the accessible recovered Codex tab still redirects to /login; it is now marked to remain open. Do not treat that report alone as successful browser authorization or bypass login. Operator may complete the exact approved upload in an already authenticated browser instead. No new approval is needed for the existing scope.
- [ ] After approval and ready attachment, execute actual isolated modern Storage assertions; record PASS/FAIL/SKIPPED and independent expected bytes. Leave fixture intact for separately approved scoped cleanup. Rerun affected local checks if test/application code changes.

No application/test code change in this review; earlier local 80 PASS/2 SKIPPED, typecheck/lint/build evidence remains historical. Environment, applied 001–008 and Preview/deployment security configuration preserved. Stop at fixture approval/login blocker; no deployment or Prompt 08.

### Prompt 07.5 — resume Preview preparation; local fixture deferred

- [x] Record owner deferral of optional local live fixture and retire prior creation/upload/login handoff authorization. Preserve tests/audio-live.test.ts unchanged with latest SKIPPED / NOT TESTED result; no additional fixture creation/upload/cleanup.
- [x] Prepare PREVIEW_AUDIO_ACCEPTANCE.md with mandatory actual-target modern credential, authenticated GET, >4.5 MB full stream/hash, Range 206, HEAD/invalid range, cross-letter/anonymous denial, non-disclosure and revocation gates. All NOT TESTED; failure/missing evidence blocks owner-only acceptance/release.
- [x] Review existing HTTPS target scenario and mark its coverage gaps. Correct deployment/report/operator runbooks to direct guarded Playwright with privately supplied existing synthetic credentials; do not use password-changing/account-creating isolated-browser.mjs. Require separate approval for all fixture mutations and the scenario's finally deletion or a reviewed leave-intact variant.
- [x] Preserve application/test source, runtime/config/deployment guard, environment, private Storage authorization and applied 001–008. Documentation-only preparation: no new typecheck/lint/unit/build/HTTPS execution claimed; earlier checks remain historical.
- [ ] Obtain actual Vercel scope slug, Production-assigned hostname, proposed separate alias, effective owner-only All Deployments evidence, runtime/region/resources and SMTP sender/inbox choices. No invented origin or values.
- [ ] Present completed exact Preview settings/deployment/alias packet and wait for explicit authorization. Protected initial target for acceptance testing may be separately approved; local live-test deferral does not itself authorize or prohibit that attempt.
- [ ] Only after protected target and separate test/fixture/mail approvals, execute all HTTPS acceptance, including required modern Storage gates. No unexecuted PASS, legacy credential fallback, global cleanup, Production promotion or Prompt 08.

Current recommendations: deployment attempt NO-GO pending exact configuration/action approval; owner-only acceptance NO-GO / NOT TESTED pending target gates; public production independently NO-GO. No remote settings/deployment/mail/database mutations during this follow-up.

### Prompt 07.5 — final pre-deployment security review (2026-10-15)

- [x] Inspect actual branch/dirty tree/current HEAD/local project link/guard/configuration/security/HMAC/Storage/test source and unchanged 001–008. Preserve earlier patches and owner edits; no application/configuration changes or real secret reads.
- [x] Record operator-reported nine Preview variables/four server Secrets and intended `https://secretlove-review-ngcd.vercel.app`. Inert format/project checks PASS; actual hosting values, alias allocation/TLS/routing/effective protection NOT VERIFIED. No secret values compared or copied.
- [x] Reconfirm current official Vercel pages: Authentication + All Deployments available on all plans; older conflicting search-cache result superseded. Operator-reported Standard still does not prove protection of production-classified/manual aliases or owner-only access.
- [x] Safe local source-snapshot checks without env files/real credentials: type generation/typecheck PASS, lint PASS, **80 tests PASS / 0 FAIL / 2 SKIPPED**, build PASS on same-drive retry. First cross-drive snapshot build failed dependency path resolution, retained as tooling evidence; no app fix. All 140 source/config/test/SQL files match original working tree.
- [x] Keep optional modern Storage live scenario SKIPPED / NOT TESTED; no provider request/remote fixture creation. Required actual modern GET/206/HEAD/416/isolation/anonymous/non-disclosure/>4.5 MB Vercel acceptance remains NOT TESTED and failure is a release blocker.
- [x] Create DAY3_PREDEPLOYMENT_SECURITY_REVIEW.md with evidence, severity, minimum separately approved exact-letter HMAC reconfiguration, recovery/session/rate/cron continuity and exposed-key retirement obligations. Update preparation/runbook/acceptance/checklist records.
- [x] PPD-01 packaging blocker subsequently resolved under explicit local-change approval: root .vercelignore plus actual CLI 64.0.2 offline selection audit. Initial missing-file finding remains historical; see follow-up below. No upload/leak or remote configuration change.
- [ ] Confirm effective All Deployments owner-only protection, exposed-key retirement/consumer transition, runtime/configuration and reviewed deploy artifact including uncommitted modern patch. Nine variable names alone are not proof of correct values or old-key retirement.
- [ ] Present completed exact one protected Preview/candidate-alias packet and wait for explicit deployment authorization. Separately approve recipient-gate fixtures, callbacks/mail and any deletion; no global cleanup or automatic creation.

Attempt NO-GO pending PPD-01–06; owner-only acceptance NO-GO / NOT TESTED; public production independently NO-GO. No remote settings/rotation/DB/fixtures/cron/alias/Git/deployment action or Prompt 08. Stop after report.

### Prompt 07.5 — resolve source-upload exclusions (2026-10-15)

- [x] Create minimal root .vercelignore under explicit operator approval: exclude environment/local config, account inventories, generated artifacts/results, private docs/plans/reports and reference media; retain required application/test source, manifests, pnpm workspace, Next config, guard scripts and 001–008. Local .npmrc has no active settings; no values emitted.
- [x] Exercise installed CLI 64.0.2 actual ignore/tree functions offline in normal directory/cloud-build mode, with clean environment, network blocks and content-read guards: **143 files selected / 16 ignored entries / zero credential or private-artifact paths**, no selected symlinks or routes override. **19 deny / 15 retention probes PASS**; all src/migrations retained and public-asset probe allowed. No deployment frontend/hash/upload/auth API called.
- [x] Bounded selected-source credential-marker check: zero violations, only inert test markers; no actual environment/fixture credential contents read or values printed/persisted. Artifact manifest and reproducible offline helper saved outside deploy inputs.
- [x] Check exact selected-file snapshot with no env files or real keys: typecheck PASS, lint PASS, **80 unit tests PASS / 0 FAIL / 2 SKIPPED**, production build PASS. Optional modern live Storage remains SKIPPED / NOT TESTED; actual provider/HTTPS/streaming tests not run. No fresh cloud dependency-install claim.
- [x] Record PPD-01 resolution/evidence in DAY3_PREDEPLOYMENT_SECURITY_REVIEW.md and refresh packaging gates. Existing application/test patches, owner edits, guard/configuration and migration history preserved; no automatic commit.
- [ ] Resolve remaining PPD-02–06 and obtain explicit protected Preview deployment authorization; separately authorize target fixture/mail actions. Packaging PASS does not grant deployment or certify modern hosted streaming.

Stop for review. Deployment attempt NO-GO pending remaining gates; owner-only acceptance and public production independently NO-GO. No remote service/database/credential/alias/deployment changes or Prompt 08.

### Prompt 07.5 — PPD-02 credential security review (2026-10-15)

- [x] **PASS — source review:** map SUPABASE_SERVICE_ROLE_KEY, VERIFICATION_HMAC_KEY, RATE_LIMIT_HMAC_KEY and CRON_SECRET across SDK/direct Storage, RPCs, gates/recovery, rate buckets, cron, local helpers and tests. Modern apikey-only streaming patch preserved; legacy compatibility in code is not permission to reuse exposed credentials.
- [x] **PASS — local metadata/source:** verify local secretlove-preview project link and Preview-only guard; document guard limitations and hosting metadata that can be reviewed without Reveal/export. Nine Preview variables/four Secrets and Standard Authentication remain operator-reported, not independently proven configuration.
- [x] **PASS — approved plan/source:** retain new Preview verification HMAC decision, preserve historical synthetic letters, and define separately authorized exact-letter gate reconfiguration and fresh recovery proofs. Rotation does not automatically revoke existing recipient sessions; rate buckets change and cron callers need coordination.
- [x] Create docs/DAY3_CREDENTIAL_SECURITY_REVIEW.md and update the pre-deployment security report with ordered manual replacement/revocation, dependency/effect, containment, rollback and status-only evidence requirements. No secret values or fingerprints inspected/recorded; no .env.local contents read.
- [ ] **BLOCKED:** operator attests current local/remote consumer identities and exposed Supabase/HMAC/cron retirement, then provides non-secret denial evidence after separately authorized actions. Current old-key use is UNKNOWN; do not claim new credential creation retired the old one.
- [ ] **BLOCKED:** confirm actual Preview metadata/overrides, effective All Deployments owner-only protection, reviewed source artifact and exact deployment authorization. Existing finding IDs PPD-02/03/05 remain unchanged.
- [ ] **NOT TESTED:** actual modern private Storage GET/206/HEAD/416, anonymous/cross-letter denial, credential/path non-disclosure and >4.5 MB Vercel streaming must PASS during separately approved HTTPS acceptance. Local audio-live.test.ts remains owner-deferred SKIPPED / NOT TESTED; no fixture creation/upload authorized by this review.
- [ ] **NOT TESTED:** targeted recipient-gate transition, fresh recovery/SMTP, trusted deployment-IP behavior and scoped operational acceptance require separate fixture/mail/lifecycle permissions. No global cleanup or historical account/password/data changes.

Documentation-only review: no fresh typecheck/lint/test/build run; latest actual PPD-01 checks remain PASS (80 tests PASS / 0 FAIL / 2 SKIPPED). Runtime, tests, migrations 001–008, environment and remote settings untouched. Attempt NO-GO pending PPD-02–06; owner-only acceptance NO-GO / NOT TESTED; public production independently NO-GO. Stop for operator action; no commit, deployment or Prompt 08.

### Prompt 07.5 — PPD-03 reconciliation / PPD-04 source-freeze preparation (2026-10-15)

- [x] Close API-key retirement ledger on **operator attestation**: modern secret default retired, legacy anon/service_role disabled, dedicated local modern keys, no PowerShell overrides, old Codex processes exited, rebuild/restart and four connectivity checks PASS after disablement. Separate Preview modern API/new HMAC/Cron secrets and no existing deployment are operator-reported. No direct provider-state/retired-key denial test or secret read performed here.
- [ ] **BLOCKED — remaining application-secret retirement:** obtain non-secret attestation for old verification/rate HMAC/Cron trust at local/other consumers and callers. Fresh Preview settings do not retire old local trust. Preserve historical data; exact gate edits and any operational tests need separate authorization. No automatic session invalidation, key-ring fallback or valid global cleanup invocation.
- [x] Review all tracked/untracked changes: narrow modern Storage upstream header patch, regression/route tests, opt-in deferred live test, deployment exclusions and sanitized runbooks/reports. Applied 001–008 match HEAD after checkout-line-ending normalization; no dependencies/guard/authorization/limits changed.
- [x] Harden Git exclusions without touching private files: wildcard synthetic inventories, .auth and the superseded account-specific local fixture plan; preserve owner-added .vercel rule. Propose an exact 18-file commit allowlist; no staging or automatic commit.
- [x] Repeat actual offline CLI selection: 143 retained deployment files, 16 ignored entries, zero credential/private-artifact paths, 19 deny/15 retention probes, all source/8 migrations retained, zero network attempts. Absent routes.json auxiliary read was blocked before content access. Commit candidate initially passes bounded marker/filename checks: 18 files, empty index, 11 private-path exclusion cases, four inert test markers only.
- [x] **PASS:** controlled same-drive source snapshot typegen/typecheck, lint, **80 tests PASS / 0 FAIL / 2 SKIPPED**, production build (exit 0, 221 s), and continuity for all 143 deployment inputs. Existing dependencies reused; no real credentials/env files/live opt-ins/provider calls, fixture mutations or running-app build output used. Initial harness-only junction/line-ending aborts repaired without app/migration edits.
- [x] **PASS:** exact 18-file final candidate inventory, bounded credential-shape check (only four inert test markers), empty index, 11 Git private-path deny probes and whitespace check. Source/docs hashes are non-secret inputs only. No secret-file/value hashing, staging or commit. Evidence and proposed message recorded in DAY3_SOURCE_FREEZE_REVIEW.md.
- [ ] Actual modern private GET/206/HEAD/416/isolation/non-disclosure/>4.5 MB Vercel acceptance remains **NOT TESTED**. Optional local live test and external MP3 opt-ins remain SKIPPED; no test fixture creation is authorized.

**GO for the reviewed 18-file source-freeze candidate; actual PPD-04 commit/frozen revision remains pending separate instruction.** API retirement closed on operator attestation; direct retired-key denial NOT TESTED, old application-secret trust unresolved. Deployment/owner-only acceptance/public production remain separately NO-GO. No remote changes, credential rotation, cleanup, fixture writes, commit/push/deployment or Prompt 08.
## Latest — owner-only Vercel Production preparation (2026-10-15)

User approved preparing the restricted Production approach after the failed first deployment. This authorizes local preparation, not a retry, public access, remote secret edits, mail, cron, fixtures, commit or push. The one prior PPD-06 attempt is consumed: `dpl_2fYeyQBb9MQJHHPsyAFnZNexf13U`, actual Production, ERROR, guard rejection before Next.js build. The old frozen commit is historical; current changes require a new review.

- [x] Read-only provider evidence: exact project/team, `sin1`, Authentication All Deployments, zero automation bypasses, no Git link; verified project hostname `secretlove-preview.vercel.app`; zero Production app settings and ten Preview entries. Current protection exceptions/Owner-only membership remain operator attestations. No remote setting changes.
- [x] Add explicit `owner-only-review` build opt-in for Production, pinned project ID, isolated project/ref/URL and exact confirmed origin; require modern public/server prefixes. Preserve Preview support, secret-format/separation, namespace and upload-cap checks. This guard is not proof of platform protection.
- [x] Remove automatic cleanup schedule from vercel.json (`crons: []`), retaining authenticated endpoint and Git auto-deployment disabled. No cleanup/cron request or historical deletion.
- [x] Add guard/context/credential/Origin/cap regression cases, real guard CLI tests using inert settings, and absence-of-cron/config regression.
- [x] Create docs/OWNER_ONLY_PRODUCTION_SETUP.md with exact 11 Production-variable names/scopes, no secret values, callbacks, no-cron prerequisite, source/one-attempt approval and post-deploy acceptance plan; refresh deployment checklist pointers.
- [x] **PASS — local validation:** credential-free snapshot typegen (11 s), typecheck (5 s), lint (7 s), **102 tests PASS / 0 FAIL / 2 SKIPPED** (11 files, 24 deployment-policy cases) and production build (190 s), all exit 0. Initial new-test TypeScript subprocess environment error fixed before the final full run. No provider requests/fixture writes/actual hosted-secret validation in these checks. Evidence: ignored test-results/owner-review-validation-1792049041856.
- [x] **PASS — packaging/history:** installed CLI still selects exactly 143 files with no private artifact/credential paths; 19 deny/15 retain probes, all eight migrations unchanged and validated source continuity PASS. New file contents supersede the old freeze; no old source-hash equality claim. Git index remains empty; no commit/push.
- [ ] Operator configures Production entries privately; confirms protection/no cron/SMTP callback readiness, plan eligibility and quota. No value retrieval/export or remote changes authorized here.
- [ ] Review/freeze new source and separately authorize exactly one new Production attempt. No deployment command executed; old failed artifact must not be redeployed.
- [ ] Hosted modern audio GET/206/HEAD/416/anonymous/cross-letter/non-disclosure/>4.5 MB streaming, auth/HTTPS/revocation/Heart/music/IP/SMTP acceptance remain NOT TESTED. Optional local modern live test stays deferred/SKIPPED; no fixture creation.

Owner-only acceptance/public release remain NO-GO pending their respective tests and privacy/operational gates. No Prompt 08.

## Latest — Production Public Access + Private Letter Gate workflow (2026-10-15)

The owner requests a public website with private letter access and operator approval step by step. This authorizes the workflow/source review now; implementation, settings, migrations, commit/push, mail/fixture mutations, a new deployment and public opening remain separate approval gates. Previous owner-only work is preserved and paused as a public-release path; the consumed PPD-06 attempt is not renewed.

- [x] Review actual route/DAL/guard/config/migration inventory and audit gaps: Creator requires verified Supabase user/ownership; recipient content/media is letter-session bound; public report/privacy/operator controls and closed Creator onboarding are not implemented. Storage/HTTPS actual transport remains NOT TESTED. Migrations present only 001–008.
- [x] Create docs/PUBLIC_PRODUCTION_WORKFLOW.md with exposure matrix, proposed dedicated clean Production Supabase, Standard Protection on public Production domains (other deployments protected), G1–G8 approvals/acceptance and explicit no-retry/no-public-change boundaries. Existing owner-only/runtime/test/migrations/env files remain unchanged in this planning turn.
- [x] Refresh deployment/checklist/owner-only runbook pointers so the old isolated-test mode cannot be mistaken for the public-release packet. No new local app test/build run claimed for documentation-only changes; earlier 102 PASS/2 SKIPPED applies to the owner-only candidate, not unimplemented public features.
- [x] **G1 complete — owner decisions:** workflow approved and G1 started; owner explicitly chose a new separate Production Supabase and approved-Creator-only initial onboarding. Record in docs/G1_PRODUCTION_DECISIONS.md. Contact/new backend identifiers remain PENDING for later configuration/release; no remote mutation or public acceptance claim.
- [x] G2 design work approved on codex/g2-production-design; design prepared in G2_PUBLIC_PRODUCTION_DESIGN.md for owner review. All proposed controls remain unimplemented; next unused migration is currently 009, not created.
- [x] Owner approved G3 on codex/g3-production-implementation (2026-10-16). Local source implementation and tests are recorded below; G4 remote/configuration work is not authorized.
- [ ] G4–G6: individually approved backend/hosting/Auth/SMTP/cron configuration, new source review/freeze and one protected Production attempt, exact fixtures/mail scopes and mandatory actual-target acceptance. No historical synthetic data migration/deletion or global cleanup against test project.
- [ ] G7–G8: separate public-opening authorization for the accepted artifact, anonymous access/gate verification, protected nonproduction URLs and approved monitoring/containment/cleanup operations.

**Public release NO-GO pending the documented gaps and approvals. Workflow approved; G1 closure is recorded below, with G2 design scope next for owner review.** No remote change, deployment, alias, commit/push, credential access/rotation, mail, fixture write or cleanup.

### G1 execution and closure (2026-10-15)

- [x] Record the owner's explicit workflow approval and two G1 answers: create a separate Production Supabase; only approved Creators can create letters in the initial public release. Recipient public access still requires the private letter gate for content/media.
- [x] Recheck branch/HEAD/dirty candidate, local project/team link and source signup/identity/cron behavior. Read-only remote project metadata matches approved project/team, Node 24.x, guarded build/install, system variables, sin1, Authentication All Deployments, zero automation bypass entries and no Git link. Queried expected settings show Preview scope; no key values retrieved and no Production readiness claim.
- [x] Create G1_PRODUCTION_DECISIONS.md with approved model, evidence/attestation boundaries, remaining identifiers/contact/configuration and future approval gates. Update workflow status. No new app code/test/config changes; previous owner-only candidate preserved.
- [x] No fresh app tests/build for documentation-only G1; historical 102 PASS/2 SKIPPED remains specific to its earlier candidate. Hosted security/audio/SMTP/public tests NOT TESTED. No backend/account/fixture creation, SQL, mail, cleanup, credential change, commit/push, deployment or protection changes.
- [x] Owner switched to codex/g2-production-design and approved starting G2 design. Output now prepared for review; no G3 implementation or remote authority. Public release remains NO-GO until later gates pass.

### G2 — public Production technical design (2026-10-15)

- [x] Confirm actual branch codex/g2-production-design, same HEAD and carried uncommitted Owner-only/docs candidate. Preserve source/config/tests/migrations/env and historical data; no automatic branch change/commit/push.
- [x] Inspect latest migration 001–008 definitions, RLS/view/service-only RPC paths, creator identity, auth callback/recovery, recipient media/session flows and cleanup. Find approval/hold coverage must extend beyond private.lock_letter; invitation callback support absent; neither finding is a claim that G2 features are already implemented.
- [x] Prepare G2_PUBLIC_PRODUCTION_DESIGN.md: five private tables, narrow authenticated boolean RLS helper, service-only gateways and lock/revoke/no-resurrection rules; closed onboarding/invite plus preserved recovery proof; operator aal2/bootstrap; bounded report/operator APIs, privacy/deletion/retention/public binding, planned G3 slices/files and local/hosted acceptance matrix. Migration 009 is a proposal only, not created or applied.
- [x] Update PRD/architecture/database/API/security/workflow/checklist/deployment pointers with explicit PROPOSED/NOT IMPLEMENTED status. Record per-phase branch rule in AGENTS.md. No actual app/SQL/dependency changes in G2.
- [x] **PASS — planning validation:** design linked by eight central docs, git diff --check clean, all 143 deployment inputs unchanged against the last validated Owner-only candidate; exactly eight migrations and no 009 file; Git index empty. No secret/credential content or fingerprints read/printed, no new app tests/build or live provider test. Design consistency review distinguishes app recovery proof from direct provider password policy and mock/local checks from hosted acceptance.
- [x] Owner approved G3 scope on 2026-10-16, following the reviewed G2 decisions: invitation+recovery onboarding, operator MFA, letter/Creator suspension semantics, report/Auth rate/retention defaults, scoped deletion and new-backend public guard. Contact/provider/ref/keys/inboxes/UUID/retention/plan facts remain pending for later gates.
- [x] Implement/test locally under explicit G3 approval on its new phase branch; see latest G3 evidence below. All G2 feature tests and hosted modern Storage/HTTPS/SMTP/public acceptance remain NOT TESTED. Prior 102 PASS/2 SKIPPED/build applies only to previous Owner-only candidate.

No credentials read/revealed, backend/account/fixture/email/SQL/cleanup/remote changes, commit/push/deployment/alias/protection change or automatic G3. Public release NO-GO.

## G3 — Public-release implementation (2026-10-16)

Owner explicitly approved G3 after switching to `codex/g3-production-implementation`; initial clean HEAD `5f25d2ec7f5aebd67274d0234ff612105833e02a`. This supersedes the earlier awaiting-G3 status, while preserving G4–G7 approval gates. No commit, push, remote SQL/settings, real fixture/account/mail/cleanup or deployment is authorized here.

- [x] Implement separate authenticated identity / approved Creator / registry + verified AAL2 operator; pending access, closed app signup, invite callback and recovery independent of Creator role. Add durable auth/operator/report throttles and refresh operator/pending sessions through the proxy.
- [x] Add migration **009** only: private approval/operator/report/moderation/audit tables, narrow authenticated RLS predicate, owner-policy checks and coverage of direct and transitive Creator/recipient RPCs. Registry remains empty; no auto-approval or user backfill. **001–008 unchanged. 009 NOT APPLIED remotely.**
- [x] Implement real report intake, minimal paginated operator UI/APIs, audited detail reads and revision-checked approval/suspension/hold/clear/scoped tombstone. Revocation is atomic; clear/reapproval never restores links/publication/sessions. Keep failure cleanup/Close separate; audit failures roll back mutations.
- [x] Implement operator-only TOTP setup/challenge via existing SDK, without role bootstrap/self-grant/account creation/email APIs. Preserve Creator preview, rich-text restrictions, private media and recipient scenes/music. Add owner hold banner and public privacy/report/request links.
- [x] Implement finite report/audit retention gateway and case-reference audit for scoped deletion. Cron remains off and has not run. Policy is explicitly draft, contact pending; physical deletion/backups and legal compliance are not claimed.
- [x] Add `public-private-gate` guard and public identifier binding. Real new Production Supabase reference deliberately **null/PENDING**; guard fails closed until G4 review. Old isolated project cannot be selected in public mode; no Preview reference fallback, security bypass, dependency or secret-file change.
- [x] Add local regression tests covering in-memory approval/RLS/RPC catalog coverage, held/revoked content/photo/audio, no resurrection, suspended finalize/ingest cleanup, revision/null/concurrency-command checks, cross-owner held-share error isolation, audit rollback, report bounds/retention, mocked MFA/identity/signup/invite/reset/rates and public guard. In-memory Creator factories approve only explicit disposable fixtures; no hosted synthetic backfill.
- [x] **PASS — final snapshot typegen/typecheck/lint and tests: 122 PASS / 0 FAIL / 2 SKIPPED**, 12 test files. PGlite DB: 42 PASS; new mocked access/API boundary suite: 9 PASS. Optional local live modern Storage and optional decoder-capacity test remain SKIPPED. Evidence: ignored `test-results/g3-validation-1792124435371`; no `.env.local`, real credential or live opt-in in the snapshot. Earlier development failures were fixed; earlier runs whose source changed while building are not the final continuity evidence.
- [x] Bound Tailwind scanning to src; controlled PostCSS probe completed in ~0.2 s versus default timeout at 5 s. Regression verifies real UI utilities and rejects artifact-only classes. No dependency or guard/security removal.
- [x] **PASS — final production build**, exit 0 in 99 s; typegen 1 s, typecheck 18 s, lint 26 s (no warnings), tests 15 s. Full final snapshot result **PASS**, all **164 deployment inputs unchanged during validation**; no reuse of partial earlier builds. Evidence: ignored `test-results/g3-validation-1792124435371/validation-results.json` and logs/source manifest. This is a local Next.js production compilation, not Vercel/HTTPS acceptance.
- [x] **PASS — CLI packaging review:** actual installed CLI selects **164** required source files, nine migrations, public binding retained; 19 deny / 15 retain probes. No credential/private artifact selected, zero network requests or secret-value reads. Filename-only guard blocked one attempted content read. All eight historical migrations unchanged. New source manifest supersedes the old 143-file freeze; it is not permission to commit/upload/deploy.
- [x] Create `docs/G3_PUBLIC_RELEASE_IMPLEMENTATION.md` and `docs/G4_CONFIGURATION_PREPARATION.md`; refresh central docs/status. G4 packet is preparation, not execution permission.
- [ ] **NOT TESTED — independent PostgreSQL connection/deadlock races.** PGlite serializes queued operations; successful stale-command/rollback assertions do not certify verify/hold/publish/finalize/suspend scheduling on real Postgres.
- [ ] **NOT TESTED — actual new backend/provider/browser acceptance:** signup denial at direct Auth, confirmed invite + separate recovery delivery, single-use reset, real TOTP/AAL2/operator bootstrap/approval, raw RLS/PostgREST and scoped worker/physical erasure. Requires new backend plus individually authorized accounts/inboxes/fixtures; do not use historical synthetic accounts.
- [ ] **NOT TESTED — HTTPS/Vercel modern Storage full GET/>4.5 MB chunks and stream/206/HEAD/416/anonymous/cross-letter/revocation/non-disclosure, cookies/CSP/Origin/trusted IP, Heart/music/mobile, logging/egress/rollback and provider retention capabilities.** Remain release blockers; no deployment yet.

G3 is a local implementation review, not public readiness. New project ref/keys, verified contact, operator UUID/inboxes, final policy/provider settings and operations remain pending. **Deployment/public release NO-GO** until later gates. Stop for review before G4; do not apply 009, create backend resources, invite users, run cron or deploy automatically.
