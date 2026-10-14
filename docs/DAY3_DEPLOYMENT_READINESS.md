# Prompt 07 — deployment readiness and private Preview preparation

Branch: `feature/day-3-security-deployment`. Prepared after Prompt 06; historical audit evidence is not counted as a new execution. User approved same-origin chunks and manually applied/verified additive 008. Proposed Vercel project: **secretlove-preview**, uncreated/unverified. Exact HTTPS origin: **PENDING**. Vercel Authentication, **project owner only**, existing isolated Supabase test project. **Deployment authorization not granted.** No URL invented, remote project/settings created, deployment/promotion or Prompt 08.

## Recommendation

**Private Preview: NO-GO to deploy now.** The upload/delivery transport is implemented and locally/live-isolated tested, but actual project/origin/Protection/environment/SMTP/monitoring configuration and explicit deployment authorization are missing. Actual Vercel streaming/upload acceptance is NOT TESTED. Once pre-attempt gates are fulfilled, request approval for a locked owner-only deployment solely to execute target gates; this is separate from acceptance for broader testers.

**Public production: NO-GO independently.** Report/suspension/privacy UI and real contact are not implemented/verified, retention targets/provider enforcement and physical/deployed operational gates remain open. Passing transport tests does not close those gaps.

## Implemented audio design

- Studio sends a small owner/draft/version/rights-authorized begin request, binary indexed chunks <=1 MiB, then a small commit request. One pending ingest/letter, <=16 parts, 15-minute expiry, 90-second commit lease. New parts budget 120/min/creator; original 60 mutations/min and 12 uploads/10min unchanged. Product cap stays **16 MiB/360 seconds**.
- Staging is a third **private** Supabase bucket, service-only paths/metadata with RLS and browser restrictive denial. Server verifies immutable part/file hashes, assembles a bounded input, runs existing actual MP3 codec/tag/duration checks, persists sanitized output then transactionally attaches disabled music. Raw chunks never enter recipient media routes. Existing templates/heart/messages/music V1 wire semantics are preserved.
- The unchanged 60 MiB/100-job creator budget accounts for temporary raw+candidate bytes (2x declared size), pending/queued parts and legacy uploads. Client reconciles expected version, offers cancellation after reload and blocks silent concurrency adoption. Cancel/expiry/delete queues parts/candidate; attach keeps ready output, clears ingest and queues only raw staging. Mixed cleanup versions are protected; v3 worker/scanner handles staging.
- Authorized owner/recipient GET/Range now uses a private upstream stream, canonical ranges, validated status/length/MIME/encoding, no signed/public URL/redirect, no shared caching, no SDK full-object Blob. Backpressure/cancellation, four lifetime stream slots and 45-second deadline constrain transfers; assembler concurrency two. Range seeks retrieve only selected bytes upstream. GET omits Content-Length to retain streaming, HEAD returns authorized metadata.
- Authorization is checked at request start. Later requests deny after close/expiry/unpublish/delete; already-started/delivered bytes may survive revocation. Midstream failures terminate the transfer and leave the existing player's truthful error/revalidation flow. No instant recall or forced audible playback guarantee.

Vercel's [body-size guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) explicitly distinguishes request limits from streamed responses. Source/local tests follow that documented design; they do not prove the provider edge accepts it. The guarded actual-target test is prepared in playwright.preview.config.ts/tests/preview/audio-target.spec.ts and is **not run**. Legacy >4.5 MB buffered upload API remains compatible locally but is not the Vercel upload strategy.

## Current execution evidence

| Check | Status | Actual evidence / limit |
| --- | --- | --- |
| Migration 008 local PostgreSQL/RLS/grant/lifecycle/quota/mixed-worker tests | PASS | New ingest tests + exhaustive RPC/search_path/RLS assertions; twelve application tables now have RLS |
| 008 remote application | PASS | User manually applied whole migration and confirmed read-only checks; agent ran no remote SQL |
| Local suite | PASS | 69 passed, 1 optional external-file MP3 skipped, 9 files; 0 final failures |
| Typecheck/lint | PASS | Final after target-test header-type correction; exit 0 |
| Supabase settings/query check | PASS | Required setting format, verified Auth-key access, anonymous owner-view denial and service query; no secret values printed |
| Production dependency audit | PASS | pnpm audit --prod: no known reported vulnerabilities at execution time |
| Client bundle secret scan | PASS | 66 assets scanned for configured server-secret values; none found |
| Protected file history | PASS | Eleven hash comparisons: .env.local, package/lock, 001–007 baseline and 008 since manual application unchanged; no dependency introduced |
| Production build | PASS | Next webpack build includes ingest/stream routes; local production build, not deployed |
| Focused music before global-cleanup exclusion | PASS | 1 desktop execution: actual >4.5 MB five-minute upload/player/Range succeeds; see constraint caveat below |
| New manifest/chunk/large-stream security E2E | PASS | 2 executions desktop/360px: pending publish/incomplete commit 409; anonymous 401/foreign owner 404; oversized chunk 413; changed duplicate and wrong full manifest 422; cancellation then valid ready commit; full streamed checksum, suffix Range and unpublish denial |
| Final complete Creator/recipient/heart/music/recovery/chunk E2E | PASS | 24 passed / 0 failed / 0 skipped: twelve scenarios each on desktop and 360px mobile against real isolated Supabase and the local production build; no authenticated global cleanup |
| Actual Vercel/HTTPS target compatibility | NOT TESTED | No project, URL, configuration or deployment approval; target test guard prevents accidental execution |
| Real SMTP/callback inbox delivery | NOT TESTED | Admin-generated recovery fixtures do not certify emails |
| Deployed IP/protection/cron/load/retention/device matrix | NOT TESTED | Plans/checklists only; no remote settings changed |
| Historical bulk account deletion | NOT PERFORMED | 100 tracked/verified accounts remain; no bulk deletion approved |
| Global cleanup historical preservation | NOT TESTED | One early legacy test invoked unscoped maintenance; no before-run per-object manifest, see caveat |

Earlier local failures: a bounded cleanup-claim assertion assumed its job was in the first twenty despite older local jobs; the test now orders its own fixture. An optional HTTPS-target test's header-union type failed typecheck; fixed with explicit string header map. The first full browser regression had 20 PASS/2 FAIL at the new upload-size measurement: Chromium did not supply captured Blob postData; request.sizes also did not match the transmitted body. The corrected test verifies each transmitted Content-Length against its exact expected <=1 MiB chunk, and the focused desktop music rerun passed. Independent live tests deny actual >1 MiB bodies with 413, verify full-file hashes and never depend solely on client claims. No quota, validation or authorization was lowered and no applied migration changed. Final results above distinguish historical failures from final acceptance.

Final browser counts are archived in assets/readiness/prompt07-browser-summary.json. Evidence code: tests/audio-response.test.ts (stream/backpressure/cancel/deadline/upstream metadata bounds), tests/database.test.ts (ingest ownership/leases/quota/lifecycle/grants/mixed workers), tests/browser/audio-ingest.spec.ts (real large manifest/chunk/Range/denial), tests/browser/music.spec.ts (UI upload/enable/save/reload/preview, same global soundtrack, errors/isolation/revocation), tests/deployment.test.ts (guard), and the existing gift/heart/Studio/recipient/recovery browser scenarios. The real browser upload has a five-minute synthetic MP3 above 4.5 MB; unit streaming exercises the full 16 MiB cap. Neither proves hardware audibility or deployed provider buffering/resource behavior.

**Remaining FAIL results: none in the final executed local/browser checks.** No newly confirmed open critical/high implementation defect from this preparation; that statement is bounded by executed tests. Deployment-target compatibility, real mail delivery, full operational cleanup and public privacy controls remain unverified/missing and prevent release. Streaming compatibility is a prepared, documented design awaiting actual Vercel acceptance, not an unconditional production certification.

### Constraint caveat and correction

The first focused legacy music test invoked `/api/cron/cleanup` before its historical side effects were excluded. That handler can purge old tombstones/queued objects throughout the isolated project, broader than the user's no-historical-deletion instruction. This was acknowledged and the calls removed from subsequent authenticated browser tests. The following read-only inventory found **100 tracked/verified accounts, 10 active synthetic letters and 20 tombstones**. Account/active counts match the prior audit; without a before-run cohort/object manifest, exact historical tombstone/object effects cannot be attributed or a no-erasure claim made. No Auth accounts were deleted. Do not call this invocation a scoped cleanup success.

Subsequent tests delete only their newly created letters through normal authenticated APIs, leave durable cleanup work pending and never invoke global cron. The music test verifies direct removal of one exactly identified newly created/detached object, distinct from proof of worker drainage. All historical cohort/queue cleanup still needs an explicit manifest and approval. The production worker remains unchanged in scope; applying 008 does not itself run it.

## Configuration and policy preparation

vercel.json specifies frozen pnpm installation/Next build, disables automatic Git deployments and runs a Preview-only format guard. It creates no project/protection setting. Guard denies Production/unknown exact origin/isolated reference/shared or missing keys/namespace/raised audio cap. Vercel HTTPS runtime origin also fails closed. APP_ORIGIN/callback allowlists cannot be configured until actual URL is provided; no wildcard/Host-derived trust.

DEPLOYMENT.md covers operator-controlled Protection/aliases/region/Node, scoped environment variables, HMAC continuity/rotation, real SMTP delivery plan, Production-only Vercel cron versus approved Preview operator invocation, monitoring/egress/timeout budgets, spoof-resistant IP acceptance, secret rotation and compatible rollback. PRODUCTION_CHECKLIST.md separates pre-attempt and target acceptance from public release gates.

Owner approved **report-led suspension after administrator review**, with Close remaining current-session revocation. Sole operator: Project Owner/Administrator, restricted/audited access; no moderators. Proposed targets: active letters/media until creator deletion/account closure, reports 90 days after resolution (documented hold exceptions), redacted logs 30 days, backups <=30 days subject to capabilities, queued physical deletion without deadline, approved synthetic cleanup after testing. **Contact email pending** and provider settings/target support unverified. PRIVACY_RETENTION_DRAFT.md is an internal draft, not published/final/legal certification; unsupported targets are blockers.

## Pending manual actions

1. Owner verifies/creates proposed project only under separate authorization, selects plan/region and confirms exact HTTPS Preview origin plus Protection/tester settings. No deployment until explicit approval.
2. Operator configures Preview-only project reference/keys/origin/SMTP/callbacks; preserve verification HMAC continuity with the shared isolated DB or reconfigure only approved newly created synthetic gates. No production data/key reuse.
3. Approve initial locked target test deployment and protected automation/state inputs, then run prepared target tests and broader HTTPS/SMTP/IP/cron/physical checks. Record platform results; do not substitute localhost passes.
4. Provide verified contact and review policy/suspension scope; verify actual log/backup capabilities/retention/export/holds and cleanup monitoring before final disclosures.
5. Review precise historical fixture/account/letter/object manifest and authorize any cleanup separately. No automatic bulk deletion.

Changed implementation: audio-response/ingest DAL and validators, three ingest routes, Studio chunk uploader/pending cancellation/DTO, cleanup v3 integration, deployment guard/Vercel config, local/browser/guarded target tests. Applied 001–007 and .env.local/dependencies are preserved; new 008 was manually applied and locked. No public/remote deployment occurred.
