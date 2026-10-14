# Background music fix — 2026-10-14

Scope: repair music editor feedback/state and player lifecycle; preserve the existing Creator Studio, recipient authorization, private Storage, applied migrations and upload limits. No deployment.

## Findings and fixes

1. **Selection is not upload.** The screenshot matches the editor branch without an attached audio asset. Enable was intentionally disabled until `music.assetId` existed, but the UI did not explain why. Selecting a file and acknowledging rights do not send it to Storage. The original focused desktop/mobile music suite passed before edits; no general failure of upload finalization or asset attachment was reproduced. The user's actual MP3 and original failed request are unavailable, so their specific upload failure is not diagnosed from its filename or screenshot.
2. **Errors were remote from the controls.** Upload errors appeared only near the top of the editor. Background Music now displays local progress, success and error messages and explains unavailable controls: no upload, pending/mismatched attachment, unsaved letter changes, active mutation, stale version or published letter. Ready settings require a ready asset matching the saved attachment; pending/failed uploads never unlock Enable. Save is unavailable when nothing changed. Successful upload/remove/save synchronizes local settings from the actual returned owner DTO; upload keeps music disabled until an explicit settings Save.
3. **Preview teardown on settings Save.** The player effect depended on volume/loop as well as source. Changing saved settings ran cleanup, pausing the track and removing its source even though the same track remained attached. Volume/loop updates now have separate effects; source change/unmount still pauses, removes the source and releases the resource. No Play is triggered by a settings update.
4. **LAN Origin mismatch remains enforced.** The configured origin is loopback. Requests with the supplied LAN HTTP Origin return 403 `ORIGIN_DENIED` before upload. `ApiError` retains the sanitized server error code so the editor can give an actionable inline explanation. No Origin allowlist, cookie, server authorization, RLS, Storage policy or limit was weakened. HTTP non-loopback remains unsupported; simply changing APP_ORIGIN to that HTTP IP would also fail current environment validation.

## Verification

| Check                                                | Status     | Evidence                                                                                                                                                                          |
| ---------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original focused music suite before edits            | PASS       | 2 executions, desktop/360px, real isolated Supabase; 0 failed/skipped.                                                                                                            |
| Typecheck                                            | PASS       | `pnpm typecheck`, exit 0.                                                                                                                                                         |
| Lint                                                 | PASS       | `pnpm lint`, exit 0.                                                                                                                                                              |
| Local unit/database/security integration tests       | PASS       | `pnpm test`: 36 passed, 4 files, 0 failed. Includes MP3 decoding/framing, byte/duration bounds, configuration, ranges, recipient expiry/revocation, RLS and legacy compatibility. |
| Production build                                     | PASS       | `pnpm build`, exit 0; production browser tests use this build.                                                                                                                    |
| Client secret scan                                   | PASS       | 61 client assets, values withheld; server decoder remains server-only.                                                                                                            |
| Read-only Supabase checks                            | PASS       | Music/asset schema, anonymous metadata denial and private audio bucket checks pass. No remote SQL executed.                                                                       |
| Final full browser regression                        | PASS       | 16 passed, 0 failed, 0 skipped: gift 2, music 2, recipient 4, Creator/auth 8. Desktop and 360px mobile against real isolated Supabase and the production build.                   |
| Preservation                                         | PASS       | `.env.local` and applied migrations 001–003 match hashes captured before this repair. No new dependencies or migration changes.                                                   |
| User's specific MP3 and original request             | NOT TESTED | No audio bytes or request result provided. Keep MP3 <=3 MiB, <=180 seconds, actual supported Layer III audio; configured byte cap may be lower.                                   |
| Physical device audibility/Safari/iOS/Android matrix | NOT TESTED | Chromium tests use a copyright-free silent MP3 fixture; playback state and advancing time do not prove audible output on actual hardware.                                         |
| Successful LAN HTTP hosting / production deployment  | NOT TESTED | LAN Origin denial is tested; LAN HTTP support was not introduced, and no deployment was performed.                                                                                |

The augmented music browser scenario checks: unsaved-letter lock explanation; no-track and selected-not-uploaded explanations; real server Origin denial with inline feedback; malformed MP3 422 without attachment; valid upload 201 with matching ready asset, initially disabled; Enable/volume/loop Save and reload; continuing creator playback during settings Save; published read-only controls; private owner audition; no recipient audio before unlock or Play; manually started playback, autoplay rejection feedback, same-element continuity, pause/resume/mute/volume/loop; GET/HEAD/range authorization; cross-letter/creator denial; error revalidation; close teardown; disabled-track denial; removal, physical cleanup and replacement. For inline Origin feedback, Playwright forwards the real server's denial with `route.fetch`; Chromium rewrites Origin on native same-origin requests. A separate API request directly verifies 403/code. Neither test mocks authorization success.

The full suite additionally covers missing audio bytes, actual aborted audio/photo requests, silent letters and existing Creator/auth/recipient regressions. Test accounts are synthetic confirmed fixtures in the explicitly isolated project; actual signup/confirmation/recovery email delivery remains an earlier external gate.

## Earlier runs and test corrections

- Initial augmented run: **10 PASS / 6 FAIL / 0 skipped**. Newly added music status created multiple status elements, while old gift/Studio tests expected a single global status. Selectors now identify the intended editor notice. Native browser Origin rewriting also invalidated the first fault-injection method; the revised test forwards a genuine server response.
- Next run: **14 PASS / 2 FAIL / 0 skipped**. Both enhanced music executions and both full gift flows passed. Mobile recipient-photo/Studio-photo checks exhausted the real shared creator upload quota and received 429. The newly added malformed-upload UI check duplicated the old API check. Remove the duplicate upload, retaining the stronger UI + actual 422 + no-attachment assertions. Do not increase limits or clear counters.
- Final rerun uses fresh synthetic actors and the same real quota: **16 PASS / 0 FAIL / 0 skipped**. Credential-free counts are saved in ignored `test-results/secretlove-summary.json`. No unresolved failures remain in executed checks.

## Files changed for this repair

- `src/components/music-section.tsx`: readiness, local feedback, unavailable-control explanations and returned-settings synchronization.
- `src/components/letter-editor.tsx`: contextual music lock reason.
- `src/components/music-player.tsx`: separate volume/loop updates from source cleanup.
- `src/lib/client-api.ts`: preserve sanitized server error code.
- `tests/browser/music.spec.ts`: regression/failure/Origin/readiness/settings/playback assertions.
- `tests/browser/gift-flow.spec.ts`, `tests/browser/studio.spec.ts`: scope existing notice assertions correctly when multiple accessible status regions exist.
- `TASKS.md`, this report: actual evidence and remaining gates.

## Usage and remaining work

On the development computer, use the configured localhost address. Save letter edits, choose a supported MP3, acknowledge usage rights, click **Upload private music**, wait for private-upload success/ready track, enable music, set volume/loop and click **Save music settings**. Publish only saved settings. The recipient unlocks, then clicks **Open with music**; music never starts audibly on page load. Existing Day 1 saved-letter preview remains static; creator audio audition is in the editor.

Keep the existing device/codec/deployed-resource/SMTP/cleanup-backlog release gates. Synthetic account IDs are retained in ignored `.test-fixtures.json` for operator-assisted cleanup: 46 tracked accounts, including 12 added during this repair (four completed fixture setups; the initial sandbox network attempt could not run setup). Failed runs can leave synthetic objects queued or attached; completed tests remove their test letters through the application. No claim of complete queue drainage. No new service configuration or migration is required for this repair; LAN use needs a separately configured supported origin.
