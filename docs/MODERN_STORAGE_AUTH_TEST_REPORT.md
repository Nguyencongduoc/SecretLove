# Prompt 07.5 — modern secret-key Storage authentication fix

PPD-03/04 follow-up (2026-10-15): operator reports modern default-secret retirement, legacy-key disablement and post-cutover local connectivity PASS; these do not prove audio compatibility. Fresh credential-free source checks and the exact commit candidate are recorded in DAY3_SOURCE_FREEZE_REVIEW.md. The optional actual modern Storage case remains SKIPPED / NOT TESTED, and the account-specific historical fixture plan is operator-local/ignored, excluded from the commit. No permission to resume that deferred workflow is granted.

**Latest owner decision — 2026-10-15:** defer the optional local `tests/audio-live.test.ts` scenario; retain **SKIPPED / NOT TESTED**, never PASS. Do not create/upload its proposed remote fixture. The normal-login handoff and prior fixture approval are retired for this deferred test. No remote fixture was created; the earlier approved ignored local silence file remains untouched. Do not resume that fixture workflow without separate approval. Actual modern-key GET/Range/HEAD/416/isolation/anonymous/non-disclosure and >4.5 MB Vercel streaming must PASS on the separately approved protected HTTPS target before Preview acceptance. See `PREVIEW_AUDIO_ACCEPTANCE.md`; current hosted results are all NOT TESTED. Failures are release blockers; no credential/authentication fallback is approved.

2026-10-15, Asia/Bangkok. Branch: feature/day-3-preview-acceptance. Scope is the direct private audio Storage HTTP request and focused regression evidence. No remote settings, credential rotation, migration/database mutation, mail, cleanup, fixture/account mutation or deployment. Existing documentation edits and the owner's .gitignore change are preserved.

## Cause and change

src/lib/server/audio-response.ts previously sent every configured server key as both apikey and Authorization: Bearer, including opaque modern sb_secret_ keys. Modern keys are not JWTs and belong in the apikey header. The request now sends **apikey only for modern secret keys**; legacy credentials retain the existing JWT bearer plus apikey scheme. The variable remains SUPABASE_SERVICE_ROLE_KEY. [Supabase API-key guidance](https://supabase.com/docs/guides/getting-started/api-keys)

Production source inspection found one direct Storage HTTP endpoint: `/storage/v1/object/authenticated/letter-assets/{server-generated-path}` in audio-response.ts. Other image/audio uploads/downloads/list/delete paths use the existing server-only Supabase SDK. No endpoint/bucket/path/authorization or SDK client change was introduced.

Owner/recipient route DAL authorization still occurs before metadata/range/Storage work. Private buckets, membership/current-publication/session/version gates, per-request revocation, HEAD/416 behavior, canonical Range forwarding, response metadata validation, no redirect/no shared cache, 16 MiB/four slots/45-second deadline, backpressure and cancellation are unchanged. In-flight/delivered bytes can still outlive revocation; this patch does not change that limitation. Credentials, upstream paths/headers and provider errors are not forwarded to the browser.

## Actual verification

| Check | Status | Environment and evidence / limitation |
| --- | --- | --- |
| Modern outgoing authentication/full stream | PASS | Mocked fetch, tests/audio-response.test.ts: apikey present, Authorization absent; existing full 16 MiB/backpressure/cancel/concurrency/deadline tests now run with an inert modern key |
| Legacy compatibility | PASS | Mocked fetch, inert invalid-signature JWT fixture; expected apikey and Bearer scheme preserved. Does not prove that legacy keys remain enabled on the hosted project |
| Range 206/HEAD/416 | PASS | Both mocked credential modes: canonical range/Content-Range, no GET buffering/Content-Length, HEAD metadata/no bytes and 416 without Storage fetch |
| Authorization precedes Storage | PASS | tests/audio-routes.test.ts runs real route wrappers with mocked DAL denial for anonymous/foreign creator and locked/expired/revoked/foreign-letter recipient cases; GET/HEAD/invalid-range deny before fetch or range disclosure. This is a route-boundary unit test, not live identity/session evidence |
| Credential/path/error non-disclosure | PASS | Mocked upstream errors and incoming spoofed headers; response/logs omit inert keys and object paths, no redirect, generic 503, caller cookie/token not forwarded |
| Focused suite | PASS | 19 passed / 0 failed, two files, before optional live test addition |
| Final portable local suite | PASS | **80 passed / 0 failed / 2 skipped**, eleven files (ten passed, live file skipped). Skips: optional external MP3 and explicitly opt-in live modern test |
| Typecheck / lint | PASS | Final after live-test source addition, exit 0 |
| Production build | PASS | Next webpack build completed with corrected transport; not deployed |
| Client secret scan / protected-file continuity | PASS | 66 built client assets contain none of the configured server-secret values; fourteen environment/dependency/deployment/link/ignore/migration hashes unchanged, including 001–008 |
| Actual isolated modern Storage GET/Range | NOT TESTED | An actual modern credential is privately available and project origin matches the owner-confirmed isolated project. Opt-in test attempted read-only SDK/Auth/metadata prerequisites, then **SKIPPED: no reusable ready audio on an active tracked synthetic letter**. No media fixture was created, tombstoned media read or cleanup invoked |
| Actual modern RPC and anonymous Storage denial in live scenario | NOT TESTED | These assertions follow fixture selection and were not reached; preliminary SDK reads are not a completed compatibility PASS |
| Actual legacy Storage delivery | NOT TESTED | No legacy credential supplied/tested for this fix; mock compatibility only |
| New hosted owner/recipient/browser/Vercel/HTTPS acceptance | NOT TESTED | No deployment or credential/account mutations authorized. Historical Prompt 07 browser evidence remains historical |

The default local suite uses no real Storage requests. The optional tests/audio-live.test.ts requires explicit isolated/modern-key flags and the exact known isolated origin. It selects only existing locally tracked Auth IDs intersected with synthetic metadata/email markers, active letters and ready audio; it verifies the exact owner/letter/asset path internally and never emits it. It never seeds, updates, uploads, rotates passwords or calls cleanup. If a fixture is unavailable it skips truthfully. If available, it exercises the actual production streaming helper against real private Storage, full/range byte agreement, HEAD/416, modern outgoing headers and anonymous Storage denial. This is operator/backend transport testing, not recipient-authorization end-to-end testing.

## Remaining prerequisite and manual rerun

### Read-only fixture follow-up — 2026-10-15

Fresh existing-script inventory and paginated synthetic metadata queries succeeded: **100 tracked/verified accounts, 10 active letters, 61 tombstones, zero ready or pending audio on active letters**. Tombstones were counted only; no media, accounts or letters were changed. The actual opt-in modern-key test was rerun and returned **0 passed / 0 failed / 1 skipped** (`no reusable ready synthetic audio`). Its file-level pass is not a scenario PASS; real Storage/RPC/HEAD/416/header/anonymous assertions remain NOT TESTED.

`docs/MODERN_STORAGE_FIXTURE_PLAN.md` records an exact minimal proposal using one existing confirmed synthetic account, one new draft and one original 16,680-byte silence MP3 through normal authenticated Studio upload. No fixture file or database fixture was created. Existing synthetic login credentials are not configured locally; operator authorization and an existing authorized login/session are required, without password changes/admin bypass/mail. No code changed during this follow-up, so local checks were not rerun; the 80-pass and build/lint/typecheck evidence above remains historical. Preview configuration/security gates and migrations 001–008 are unchanged. Live compatibility remains blocked pending fixture approval/login.

A separately authorized operator must provide an existing **active synthetic letter with a ready private MP3** through normal authenticated Studio upload, or identify an already eligible tracked fixture. No extra key needs to be pasted into chat; the actual modern key is already privately configured. Keep keys unchanged and use the owner-confirmed isolated project. Only after that fixture exists, rerun locally:

Subsequent operator reply approved the exact one-draft/one-MP3 plan. The approved local synthetic file was generated and its 16,680-byte SHA-256 verified; the account recheck still shows confirmed synthetic status and zero active letters. No database fixture created yet. The accessible Studio remains at `/login` after recovering the initially unavailable tab, despite the operator's sign-in report. The preserved tab awaits normal login handoff, or the operator can perform the exact approved upload in their authenticated browser. No password/admin-login/account changes or auth bypass were attempted. No new live compatibility test ran after this approval; the latest actual scenario result remains SKIPPED.

```powershell
$env:SECRETLOVE_TEST_PROJECT='isolated'
$env:SECRETLOVE_LIVE_MODERN_STORAGE='1'
node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/audio-live.test.ts --disableConsoleIntercept
```

The test's generic diagnostics/boolean assertions intentionally avoid credential/path/provider-body output. It uses a read-only ingest-flags RPC, not a mutation/limiter/cleanup gateway. Do not call the global cron to prepare/drain fixtures, rotate credentials or delete existing accounts. The current skip is **NOT TESTED**, not live compatibility approval. A protected HTTPS Preview and full owner/recipient acceptance remain separate approval gates; public production remains NO-GO.
