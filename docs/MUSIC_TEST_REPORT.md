# SecretLove background music — final test report

Date: 2026-10-14 (Asia/Bangkok). Scope: the explicitly authorized music extension, followed by complete Day 1/Day 2 regressions. Tests use the isolated Supabase project and synthetic content/accounts. Migration 003 was manually applied by the user, who confirmed verification succeeded. No agent-executed remote SQL, deployment, or environment-secret disclosure.

## Final results

| Check                              | Status  | Exact result                                                                                                                                             |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                          | PASS    | Next route type generation and TypeScript --noEmit exit 0.                                                                                               |
| Lint                               | PASS    | ESLint exit 0, no errors or warnings.                                                                                                                    |
| Local tests                        | PASS    | 35 passed, 0 failed, 4 files: database 19, security 5, recipient 6, music 5.                                                                             |
| Production build                   | PASS    | Next.js production webpack build exit 0; all music/legacy routes generated successfully.                                                                 |
| Focused live music suite           | PASS    | Earlier focused execution: 2 passed, 0 failed/skipped, desktop and 360px mobile.                                                                         |
| Final full live browser suite      | PASS    | 14 passed, 0 failed, 0 skipped: music 2, recipient 4, Creator/auth 8. Saved credential-free counts in ignored test-results/secretlove-summary.json.      |
| Supabase readiness/security checks | PASS    | Config column and audio metadata query succeed without rows; anonymous metadata query denied; audio bucket private, audio/mpeg only, 3145728-byte limit. |
| Client secret scan                 | PASS    | 61 production client assets contain none of the configured server-secret values; values withheld. Decoder stays server-only.                             |
| Preservation                       | PASS    | .env.local and applied migrations 001/002 match pre-extension hashes. No destructive top-level SQL in migration 003.                                     |
| Current failures                   | FAIL: 0 | All final required checks pass.                                                                                                                          |

## Authenticated music flow — desktop and mobile

Both final executions passed these real-Supabase assertions:

1. Synthetic creator authenticates; creates/saves a real letter with recipient gate and private message.
2. Disguised MP3 bytes return 422; missing rights acknowledgement returns 400; wrong MIME returns 415; MP3 over 3 MiB returns 413.
3. Editor uploads a valid synthetic MPEG Layer III MP3 with rights acknowledgement (201), privately attaches it disabled, and explicitly previews it. Native audio reports actual playing, then pauses.
4. Enable, default volume 0.4 and loop save successfully; unsaved music preferences disable publishing; reload restores all preferences.
5. Owner audio GET returns exact sanitized fixture bytes, audio/mpeg and private no-store. Foreign creator proxy GET returns 404. Direct anonymous Supabase Storage download of the known object path is denied.
6. Published recipient audio GET and HEAD with Range before verification return 401. Unlocked reader makes **zero audio requests before Play**, and receives a visible Open with music action.
7. Injected NotAllowedError from the native Play promise produces a truthful blocked-play message and paused state. A fresh interaction successfully invokes real browser playback; currentTime advances. This tests rejection handling, not a real-device autoplay policy matrix.
8. Navigation to the main-letter scene preserves the identical audio DOM element and advancing playback time. Keyboard slider sets volume to 0.2; mute/unmute and real pause/resume succeed. Loop is set and playback wraps from near the end back to the start without pausing.
9. Authorized single Range returns 206, exactly 10 bytes and correct Content-Range; HEAD returns 200; multiple ranges return 416. Letter A's authorized reader cannot retrieve Letter B's asset under A's route (404).
10. Injected native media error pauses the player and causes protected content revalidation (200); the error message and main letter remain readable. This is an event fault injection, not a live Storage outage.
11. Close returns 204, removes the player's source and pauses its detached element; subsequent audio request returns 401.
12. Disable retains the attachment; after fresh publication/verification, recipient audio returns 404. Removal clears assetId immediately and owner delivery returns 404. Privileged test inspection proves detached bytes exist before the authenticated cleanup worker, then cannot be downloaded after it. Replacement upload succeeds.

Synthetic MP3 is copyright-free encoded silence. Browser decoding, native playback state/time, looping and volume properties are tested; physical audibility is not asserted. Creator audition is provided in the editor; the existing basic saved-letter preview page remains unchanged.

## Local security/business-rule evidence

Migration tests apply 001 → 002 → 003 in local PostgreSQL (PGlite), including a deliberately broad pre-existing Storage policy. PASS: one pending/ready slot; owner/draft/version enforcement; foreign/unready/arbitrary references rejected; old Save preserves config; pending audio blocks publishing; stale finalize queues only failed reservation; ready finalize/failure retries do not queue live audio; detach frees slot atomically; pending plus queued bytes count toward aggregate quotas; owner metadata RLS and browser Storage/RPC denial; current enabled selection only; transplanted A session against published B audio gateway denied; expired/revoked sessions denied; tombstone queues audio; stale reservation reconciles; ready asset not orphaned; legacy claim **and acknowledgement** cannot consume audio jobs; v2 bucket/path/lease binding and failed-job backoff. Existing photo/letter/rate/lease/publication tests continue passing.

MP3 tests decode real Layer III frames in bounded batches; strip synthetic ID3v2/ID3v1 tags; reject disguised/truncated/malformed/oversized/over-duration data, unsupported Layer II/free bitrate and trailing junk. Range tests cover full, suffix, open-ended, clamped, multiple, reversed, zero suffix, unsatisfiable and unsafe-integer forms. Strict music settings reject unsafe bounds/unknown URL fields; null/unknown-version configuration remains silent. Legacy recipient and Creator browser flows pass, including photos, normalized verification/passphrase, WebGL fallback, sessions/revocation and provider recovery.

## NOT TESTED / release limitations

Changed areas: editor music section/player and editor unsaved-state integration; recipient host/controller styling; strict music/Range validation and server MP3/audio DAL; owner/recipient upload/settings/delivery APIs; additive migration 003 and bucket-aware cleanup; server cancellation/CSP; MP3 decoder dependency/server packaging; security/database/browser tests and setup/schema-check documentation. Applied migrations 001/002, environment secrets and unrelated Day 1 features are preserved.

- Physical Safari/iOS/Android audibility, codec/volume behavior and native/device-volume fallback; mobile tests use desktop Chromium with a 360px viewport.
- Representative real-world CBR/VBR/CRC/ID3-footer/APE MP3 corpus. Initial format is deliberately conservative; free-bitrate and changing sample-rate/channel-count streams are rejected.
- Real network/provider outage, stalled download/abort, decode timeout/concurrency saturation and deployed resource/egress/abuse limits. Transport is bounded at 3 MiB/four concurrent downloads per server process, forwards cancellation with a 15-second timeout, and slices full Storage downloads for ranges; repeated seeks incur egress.
- Live stale/orphan sweeps, injected cleanup outage/retry and **entire** queue drainage. Physical removal of the selected detached synthetic track is proven; this is not an erasure-time SLA or backup deletion claim.
- Full keyboard-only reading journey, live 30-minute expiry while audio is playing and real deployed HTTPS/header/cron behavior. Music volume keyboard interaction and Close teardown are tested; DB expiry/revocation denial is tested locally.
- Rights/licensing verification, SMTP delivery and production deployment; creator acknowledgement is a reminder, not licensing proof.
- Operator cleanup of 24 tracked synthetic Auth accounts (6 added this extension). IDs only are retained in ignored .test-fixtures.json; credentials remained in process memory. Interrupted tests may have left synthetic drafts/media; current completed tests delete their synthetic letters through application APIs, while final media deletion remains queued.

Earlier test fixtures omitted published_at in local setup and an APIResponse/Response test variable caused a build type error; those test issues were fixed. A full browser run was interrupted by updated instructions and restarted, so the incomplete run is not counted as PASS/FAIL. Sandbox canonical-path restrictions temporarily prevented package/type resolution; checks passed with required workspace access, without weakening source checks. No known application failure remains in the final runs.

Broader background/theme/animation/drag-and-drop/video features remain deferred. No next milestone or deployment was started.
