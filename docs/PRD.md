# SecretLove — MVP Product Requirements

Status: Day 1 Creator Studio and Day 2 recipient journey are implemented. The latest user instruction additionally authorizes private background MP3 uploads and playback as a Day 2 extension. Broader theme/background/animation editors remain deferred; protected Heart/Closing copy and the bounded particle-heart/text-ring subset are explicitly authorized. Historical results are in DAY2_TEST_REPORT.md; current music evidence is in MUSIC_TEST_REPORT.md and TASKS.md.
Planning date: 2026-10-14 (Asia/Bangkok). The three implementation days start after approval and environment readiness.

## 1. Product and objective

Music extension acceptance: an owner uploads one authorized MP3 (server-validated, at most 16 MiB/360 seconds after migration 004), previews it, saves enabled/default-volume/loop preferences and removes or replaces it. The user's full-song request supersedes the original 3 MiB/180-second audio caps; six minutes accommodates their 5:31 example. The latest request replaces recipient playback controls with soundtrack initiation after authorized user-initiated unlock/resume, retrying on envelope/scene interaction if browser permissions require it. Creator preview controls remain. The same player persists across scenes; browser/OS can always silence/pause audio. No track request before authorization, no public/external audio, no recipient delivery of disabled tracks. Audio errors leave the authorized letter readable; Close/access loss unload playback. Legacy letters stay silent. Browser/device volume restrictions receive native/device guidance. Manual migration, passing isolated five-minute acceptance and remaining hosting limits are in FULL_SONG_AUDIO_SETUP.md; Vercel needs a separately approved upload transport before large-file deployment.

SecretLove lets an authenticated creator compose a private digital letter, add personal photos, and share a link or QR code. The recipient verifies access and moves through an envelope, pink heart, memories, and letter scene.

The MVP must prove one complete journey: create a draft → preview → publish → share → verify → read → revoke access. Privacy and working persistence take priority over animation polish.

Historical planning baseline: README.md and AGENTS.md only. The repository now contains the Day 1 application, migration, and tests; TASKS.md distinguishes implemented code from pending live acceptance.

## 2. Assumptions and boundaries

- One experienced full-stack engineer; a three-day private-beta target with external setup complete beforehand. Final review estimates 30–40 engineering hours including integration/security checks, so a strict 24-hour implementation budget is not reliable. Approve contingency or explicit scope changes before coding; modest private beta traffic only.
- One creator owns each letter; exactly one intended recipient per letter. A recipient has no account.
- Creator authentication uses Supabase email/password, email confirmation, sign-out, and password recovery. No social providers in the MVP.
- English interface initially; names and messages support Unicode. No translation system.
- The MVP exposes two fixed templates: `rose` and `minimal`. Both use the same content and reading sequence. The trusted registry supports developer extension; creator theme/scene controls remain deferred, while initial MP3 music controls are implemented as the separately authorized extension.
- Name + date of birth is explicitly a **low-security access gate**, not identity proof. An optional separately shared passphrase adds resistance to guessing.
- Creators have permission to use the recipient's details and photos. This product does not offer end-to-end encryption or prevent screenshots/downloads after access.
- Supabase and Vercel accounts, an email delivery configuration, and deployment secrets are available before Day 1. Delays in provisioning move the schedule.

## 3. Required MVP features

| Area              | Required behavior                                                                                    | Acceptance criteria                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication    | Register, confirm email, sign in/out, recover password                                               | Unauthenticated Studio requests are denied; creator A cannot access creator B's data; callback redirects are allowlisted.                                                     |
| Dashboard         | List own drafts/published letters; new/edit/preview/share/delete actions                             | Empty, loading, error states; private titles visible only to owner; creation date and status displayed.                                                                       |
| Draft editor      | Private title, recipient display name, verification name/DOB, optional passphrase, message, template | Explicit Save with unsaved-change warning; server validation; refresh restores saved data; secret fields never returned.                                                      |
| Rich text         | Paragraphs, line breaks, bold, italic, ordered/unordered lists                                       | Structured JSON with a small node/mark allowlist; no raw HTML, links, embeds, scripts, or external media. Maximum 10,000 visible characters and 64 KiB serialized body.       |
| Photos            | Upload, inspect, remove up to six images in upload order; alt text editable                          | JPEG/PNG/WebP only; maximum 3 MiB input each; server validates decoded image, strips metadata, stores private normalized bytes. No photos is valid.                           |
| Templates         | Select rose/minimal presets                                                                          | Both responsive at 360 px; recipient template choice disclosed only after access.                                                                                             |
| Preview           | Owner-only preview using saved content and the real scene components                                 | Works without publishing or issuing a recipient session; labelled preview; unsaved edits require Save first.                                                                  |
| Publish/share     | Validate and publish saved draft; copy link; download QR PNG                                         | At least one non-whitespace message character and configured verification required; no pending uploads; unguessable link; QR encodes only that link and is generated locally. |
| Edit/revoke       | Published content is frozen; Unpublish before editing                                                | Unpublish immediately denies subsequent protected requests and invalidates sessions. Republish creates a fresh link; old QR/link stays unavailable.                           |
| Delete            | Confirm destructive action and delete own letter                                                     | Immediate logical removal and access denial; storage cleanup retried separately. UI distinguishes removal from pending physical cleanup.                                      |
| Recipient landing | Generic romantic welcome, verification form                                                          | No title, recipient identity, DOB, photo, message, private template, or credential hint in HTML, metadata, hydration, or preload requests.                                    |
| Verification      | Name + DOB and passphrase if configured                                                              | Generic incorrect-details message; field labels and accessible errors; distributed rate limits; success creates a letter-bound server session.                                |
| Reading           | Envelope opening → pink heart → photo gallery → final rich-text letter                               | Explicit Next/Skip/Back controls; keyboard/touch operation; empty gallery skipped; session expiry prompts verification again.                                                 |
| Animation         | Motion envelope and lightweight procedural R3F pink heart                                            | Lazy-load 3D after access; no external model assets; static heart fallback for reduced motion, unavailable WebGL, or runtime failure.                                         |

All forms/buttons need labels, visible focus, useful validation, and disabled/pending states. Retryable network errors must retain user input without presenting fake success. No autoplay audio or animation required to reveal the letter.

## 4. User flows and lifecycle

### Creator

1. Register, confirm email, and sign in.
2. Create draft; set recipient details, basic rich text, optional photos/passphrase, and template; Save.
3. Preview the saved letter as owner; return to edit if needed.
4. Publish. Show copyable `/l/{shareToken}` link, QR, and a reminder to share the passphrase separately.
5. To edit or revoke, Unpublish. Save changes and republish to obtain a new link/QR.
6. Delete with confirmation; show removal status even if storage cleanup is pending.

State transitions: `draft → published → draft`; either active state can become deleted. Publish is idempotent for an already-published revision. Editing/upload/removal is permitted only while draft. No separate published snapshot or version history in this MVP.

### Recipient

1. Open link/scan QR; view generic welcome and available/unavailable state.
2. Submit name/DOB and, when required, passphrase. The presence of a passphrase gate is the only public per-letter setting.
3. On success, receive an HttpOnly session cookie; fetch protected content.
4. Open envelope, view/skip heart, browse memories, read letter.
5. Return within the fixed 30-minute session lifetime using a generic Continue reading control; the server validates the existing cookie before returning content. Close letter revokes the current session. A new verification is needed after expiry, unpublish, deletion, or republish.

## 5. Limits and product decisions

- Maximum 20 active letters per creator; maximum six photos per letter; no paid plans or billing. Server transactions enforce quotas under concurrency.
- Title: 1–120 trimmed characters; display and verification name: 1–100 characters; alt text: 1–200 characters (default “Photo memory” when omitted).
- DOB: valid Gregorian calendar date in `YYYY-MM-DD`, from 1900-01-01 through today's UTC date. A date value has no time zone conversion; no age eligibility rule is inferred from it.
- Passphrase: optional, 12–128 Unicode code points, at most 512 UTF-8 bytes; exact case/spacing comparison. Blank draft field on reload means unchanged, not removal; an explicit remove control is needed.
- Verification names use a documented normalization: Unicode NFKC, trim, collapse whitespace, locale-independent lowercase; retain accents and punctuation. Validate the normalized value too; the creator UI explains matching and previews normalization during entry. There is no multiple-recipient name-collision feature.
- DOB is write-only. Creator sees whether verification is configured; changing verification requires re-entering both name and DOB. Recipient display name is stored separately for the unlocked greeting.
- Passphrase configuration requires an existing verification gate or name/DOB in the same Save. Reject an attempt to set a passphrase alone on an unconfigured draft; retain form input so the creator can finish configuration.
- Photo order is upload order. Reordering/captions and advanced editor tools are deferred.
- Sessions are independent per letter and can exist on multiple devices; no “one-time read” claim.

## 6. Future features (excluded from three-day MVP)

Section 9 records the historical broader customization plan. The latest user request separately authorizes and implements its initial private MP3 subset; theme/color/font/background and animation/3D controls and additional template authoring remain outside the three-day commitment.

Other excluded features: social login/MFA, stronger recipient verification (email OTP/account), scheduled delivery, expiry settings, read receipts/analytics, recipient replies, multiple recipients, collaborative creation, version history/live published edits, arbitrary HTML/CSS/JavaScript template builders, video, HEIC/GIF support, drag-and-drop gallery ordering, direct resumable uploads, uploaded fonts or 3D models, AI writing tools, public discovery, payments, admin UI, localization, automated account self-deletion, and end-to-end encryption.

## 7. Release acceptance

- Two distinct creators and an anonymous browser complete the ownership and recipient flows against a real test Supabase project.
- Correct verification unlocks only the matching published letter; incorrect, expired, revoked, cross-letter, and missing sessions reveal no protected content or media.
- All private photos remain inaccessible via anonymous Storage requests. No sensitive data appears in page source, metadata, logs, or caches before access.
- Publish validates content and gate configuration; pending uploads block publish; republish invalidates the old link/session; delete denies new requests.
- At 360 px and desktop width, there is no horizontal overflow; keyboard-only and reduced-motion reading work; failed WebGL does not block reading.
- Typecheck, lint, production build, important business/security tests, and deployed smoke tests pass. Milestone criteria are in [TASKS.md](../TASKS.md).
- Architecture approval is recorded before source scaffolding, dependency installation, schema application, or deployment.

## 8. Dependencies and risks

| Dependency/risk                                          | MVP consequence and response                                                                                                                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase project/Auth/PostgreSQL/private Storage         | Provision early; configure grants/RLS before exposing any data; separate test and production environments.                                                                                                                    |
| Email confirmation/recovery delivery                     | Configure sender/SMTP and callback allowlist before testing with external users; email outage cannot produce a success response.                                                                                              |
| Vercel hosting, HTTPS, request limits, scheduled cleanup | Small server-mediated uploads; confirm chosen plan/runtime supports limits and protected daily cleanup.                                                                                                                       |
| Motion/R3F/editor/image/QR libraries                     | Pin compatible versions at implementation; basic editor toolbar and procedural heart; local QR only.                                                                                                                          |
| Guessable personal details/leaked links                  | Low-security warning, optional passphrase, database-backed throttling and revocation; do not market identity assurance.                                                                                                       |
| Three-day schedule                                       | Aggressive beta target, estimated 30–40 engineering hours; reserve 1–2 additional working days if needed. No teams, snapshot publishing, analytics, or asset pipeline. Simplify visual polish first; never cut access checks. |
| Storage/DB operations cannot share a transaction         | Tombstone access first; queue cleanup and retry; test partial failures.                                                                                                                                                       |
| Authorized recipient can copy content                    | State limitation in creator UI; revocation stops subsequent requests, not copies already received.                                                                                                                            |

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [API.md](API.md), and [SECURITY.md](SECURITY.md) for the proposed technical contracts.

Final design review and requirement traceability: [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md). The user subsequently approved the design; current implementation and acceptance evidence are in TASKS.md.

## 9. Historical customization design and remaining future requirements

Original planning date: 2026-10-14 (Asia/Bangkok). That documentation-only plan preserved source/dependencies/migrations. The later explicitly authorized MP3 extension implements the music rows below, with evidence in MUSIC_TEST_REPORT.md; all broader customization remains proposed. Configuration is presentation data and never controls verification, publication or permissions. Detailed future proposals are in ARCHITECTURE.md section 10; implemented music is section 11.

| Requirement                          | Proposed scope                                                                                                                               | Future acceptance criteria                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Themes and colors                    | Curated presets with primary, canvas background, surface and text color tokens; no free-form CSS                                             | Save/reload/preview agree; invalid values are rejected; text/control contrast and focus remain accessible; existing rose/minimal letters retain their original appearance.                                                                                                                                                                                                                                                                       |
| Fonts                                | Select bundled system fonts first; optionally add licensed self-hosted fonts later                                                           | Font IDs resolve through a trusted registry; no remote font URLs or font uploads; the greeting/message remain readable if a font cannot load.                                                                                                                                                                                                                                                                                                    |
| Backgrounds                          | Solid color, bounded two-color gradient, then one private uploaded background                                                                | Background never contains arbitrary URLs/SVG/HTML; uploaded backgrounds use authorized media delivery; contrast is validated against a safe opaque text surface; failures fall back to a solid color.                                                                                                                                                                                                                                            |
| Letter layout and decorative effects | Trusted layout/width presets and bounded effects such as none/petals                                                                         | Save/reload/preview agree; layout stays usable at 360 px; effects cannot obscure text or controls and honor reduced motion/device limits. Creator-authored CSS, positioning code and shaders are excluded.                                                                                                                                                                                                                                       |
| Background music                     | Upload an authorized audio file, attach one private track, enable/disable it, set default volume/loop and explicitly audition it while draft | Ownership, letter membership, size/duration/format and ready state are checked server-side; settings survive Save/reload; disabling retains the ready attachment without fetching it for recipients; detaching clears the reference and queues cleanup. Owner Preview/Play is authorized and does not change the saved enable flag. Publication rejects incomplete references; no storage paths, external embeds or signed URLs in config.       |
| Recipient music controls             | Start, pause/resume, mute/unmute and volume controls after authorization; one provider persists across scenes                                | Playback begins only through an explicit Play gesture; Next/Back/Skip does not restart the track or reset recipient volume/mute. Controls reflect actual playback, loop/ended state and rejected playback. Volume is adjustable where supported, with an honest device/native-volume fallback. Music failure never prevents reading. No request occurs before access, while disabled or before Play. Close/expiry/access loss releases playback. |
| Animation and 3D customization       | Curated presets and a few bounded parameters first: pacing, heart color/scale                                                                | Only registered implementations run; reduced-motion and device budgets override creator settings; every optional animation has a static fallback and can be skipped. Custom code/models/timelines remain a separate later proposal.                                                                                                                                                                                                              |
| Optional final message               | Short separately protected rich-text closing after the main letter; post-MVP content extension                                               | Null/empty content adds no scene; maximum 500 visible Unicode code points/4 KiB compact JSON; main letter remains reachable; old letters keep their existing reading sequence. Closing text is never embedded in presentation options.                                                                                                                                                                                                           |
| Additional templates                 | Versioned developer-authored definitions using registered scene/layout components                                                            | A new definition and registry entry suffice for templates composed from existing components; adding a new scene implementation does not change the generic renderer. Older template revisions remain available and unchanged.                                                                                                                                                                                                                    |

### Day 2 essentials versus post-MVP

The original Day 2 request authorized the complete protected recipient journey and an in-memory legacy adapter. The later music extension adds stored V1 music preferences and editor music controls only. Day 1's static saved-letter preview stays unchanged; explicit music audition is in the editor. Heart/closing copy remains generic for legacy letters; authored closing text remains P1. Both additive recipient and music migrations were manually applied by the user after local review/tests.

Remaining phases: P1 themes/layout/effects/closing content/templates, P2 private backgrounds and broader audio formats/features, P3 bounded animation/procedural-3D controls. Initial MP3 music is implemented with native audio and server-only bounded mpg123 inspection; no transcoding. Each remaining phase needs separate scope/estimate/authorization and acceptance tests.

### Backward compatibility and safety acceptance

- Day 1 letters lacking configuration/revision resolve to their existing `template_id` at revision 1, with music disabled, no extra final-message scene and no overrides. A later letter with a pinned revision and null config uses that pinned definition's defaults; resetting config never changes template identity. No read-time writes/backfill or reinterpretation of `body_doc`.
- Existing create/Save requests continue to work. Omitting future configuration or final-message content preserves it; explicit null intentionally resets/clears it. Resubmitting the unchanged legacy template ID does not reset a future pinned template revision or wipe settings.
- Theme/music settings are protected alongside letter content. The generic landing/bootstrap uses platform defaults and discloses no selected theme, track, private background or per-letter preload.
- Editing presentation/assets respects draft-only locks and the existing string `expectedVersion`; published letters stay frozen. Recipient access is rechecked on every media request. Delivered/buffered bytes cannot be recalled.
- Recipient background/audio routes also require current published selection, including enabled music; knowing an unused/disabled asset UUID grants no bytes or metadata. Explicit detach clears references, removes active metadata and queues bytes atomically; physical removal stays pending until verified.
- Recipient preferences are runtime state: playing, volume and current scene are not persisted as letter content or used to renew the session.
- Audio licensing, server audio inspection, target-browser volume behavior, deployment payload budgets and actual physical cleanup are future acceptance gates, not capabilities claimed by the existing Day 1 tests.

### Decisions requiring approval before the relevant implementation

- Initial MP3 music is explicitly authorized as a separate Day 2 extension; keep broader customization/background/final-message editing outside the original three-day scope.
- Historical P2 proposal: one active background and one active track per letter (pending reservations count), initially MP3 <=3 MiB/180 seconds. The later full-song request authorizes audio <=16 MiB/360 seconds only; background assets remain deferred. Default volume 0.35, manual start and looping off; replacement requires detaching the current slot first.
- Initial MP3 inspection/metadata-removal, rights reminder and aggregate quotas are implemented as documented in MUSIC_SETUP.md. Deployed resource budget and browser acceptance remain release gates; broader formats need a new design.
- Approve supported desktop/mobile browsers and the device-volume fallback where programmatic volume is unavailable; approve the trusted font/template/layout/effect catalog before enabling those controls.


## 10. Approved Day 2 particle-heart extension

The latest user request explicitly authorizes an original procedural volumetric particle heart and bounded 3D customization, superseding the earlier solid-heart and deferred P3 subset descriptions. It does not authorize Day 3, broader themes, drag-and-drop, creator shaders/models/fonts, deployment or a general animation editor.

Requirements: reference-like black cosmic stage, glowing pink particle sculpture, sparse stars, gentle heartbeat/float, tilted rotating 3D phrases underneath, desktop/portrait framing. Retain message reveal, every reading scene, protected access and the current continuous background soundtrack. Creator preview controls remain; recipient playback controls stay absent under the latest soundtrack requirement, superseding the older pasted regression checklist.

Studio offers up to five Vietnamese/English phrases (1–60 NFC Unicode code points each), add/remove/count validation, pink/red/purple color, slow/normal/fast rotation, enabled rings and reset. Empty phrase array uses defaults. Explicit unsaved actual-scene preview and saved owner preview reuse HeartScene. Shared Save must normalize values, persist/reload and become clean; publication freezes the version, unpublish before editing. Reset does not erase unrelated content/music.

Acceptance: inspect/extract video frames; compare real rendered screenshots; exercise desktop and animated portrait plus reduced-motion/context-failure fallbacks; verify message reveal/keyboard/navigation and audio continuity. Oversized/unknown configuration denied server-side; protected phrases absent while locked and cross-letter/owner access denied. Record performance/resource measurements and actual PASS/FAIL/NOT TESTED separately. No claim of exact identity to the reference or uniform hardware frame rate.
