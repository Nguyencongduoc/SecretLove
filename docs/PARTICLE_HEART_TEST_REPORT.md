# Particle-heart extension test report — 2026-10-14

Scope: approved Day 2 particle heart and private rotating phrases, on `feature/particle-heart-customization`. No Day 3, deployment, imported model/font, new dependency or environment change. Migration 006 was applied manually by the user and its read-only checks confirmed successful.

## Rendering and reference comparison

The local recording decoded successfully: 1920×1200, 5.802646 seconds. The extraction script writes PNGs/metadata under `references/heart/frames`; frames at 0.20/2.00/4.00/5.50 seconds were visually inspected before implementation. The source shows a rounded dense pink point heart, dark interior gaps, tiny sparse white stars, multiple tilted white text rings below the heart and gentle rhythmic size/rotation changes. Recording/player overlays and watermark are not reproduced.

Original procedural source: implicit heart volume `(x² + 2.25z² + y² − 1)³ − x²y³ − 0.1125z²y³ <= 0`, seeded rejection samples throughout the interior with a shell bias. No GLB/GLTF/model download or video playback. Typed buffers are created per device/configuration change; group transforms and a time uniform animate the heart without CPU particle position updates. Independent star/dust Points draws, efficient trusted shaders and DPR <=1.5; no bloom pipeline.

Circular text consists of genuine instanced 3D tangent planes with locally drawn glyph atlases. NFC/grapheme segmentation keeps Vietnamese diacritics together; measured advances, adaptive bounded size, repetition/separators and different radii/heights/tilts prevent overlap. System fonts avoid new licensed/external assets. Each ring rotates independently using slow/normal/fast presets. The existing HeartScene/typed registry is shared by recipient and owner preview; one recipient audio element remains outside scene keys.

Initial screenshot comparison found particles too dim and glyphs too small. Increased particle disc visibility and measured text size, then removed additive saturation that caused white clusters. Portrait camera distance is computed from FOV/aspect and the maximum ring envelope. Final default-pink and five-ring purple desktop/mobile captures were visually reviewed against all four reference frames. The heart has a rounded 3D silhouette and visible filled depth; black starfield, white/pink orbital glyphs, centered upper placement and gentle animation match the reference composition. Normal blending removes white glare, and all five orbits remain within the portrait framing. Original procedural shape/brightness and minimal SecretLove chrome differ from the recording; exact model/camera/animation reconstruction is not claimed. Visual similarity is reviewed, not a claim of exact reconstruction.

## Verification status

| Check | Status | Evidence / limit |
| --- | --- | --- |
| Video read/extracted/inspected | PASS | Four representative frames, source dimensions/duration verified. |
| Local migration/database/security/validation tests | PASS | 47 passing tests, 1 optional external-MP3 test skipped, 6 files. |
| Migration 006 manual remote application | PASS | User confirmation; no remote SQL performed by the agent. |
| Typecheck/lint/production build | PASS | Final checks after the owner-preview hydration fix; exit code 0. |
| Creator heart and renderer acceptance | PASS | Both projects in the final suite: five phrases including 60 wide characters, add/remove/overlength rejection, NFC save/reload, reset, preview without Save, pointer/Enter reveal, actual animated canvas, context loss/reduced motion, no horizontal overflow and direct saved-preview refresh without runtime/hydration errors. |
| Full final browser regressions | PASS | 18 passed, 0 failed, 0 skipped. Gift 2, music 2, heart 2, recipient 4, Creator/auth 8; desktop and 360px viewport, production build and real isolated Supabase. Summary archived at assets/heart/browser-summary.json. |
| Final client bundle/hash audit | PASS | 63 assets scanned for configured server secrets. .env.local/package/lock/migrations 001–005 match the baseline (8 files); 006 matches its manually applied hash. Git diff whitespace check passes with repository settings. |
| Physical iOS/Android/Safari audibility, GPU/battery/memory | NOT TESTED | Headless Chromium is not physical-device acceptance. |

## Defects found and corrected

- Windows sandbox path/symlink access produced unrelated dependency-resolution errors; approved checks outside that sandbox passed. One approval-review attempt did not execute due a temporary review usage limit; normal review retry succeeded.
- Login-page interaction preceded hydration in the initial focused test. The test now waits for the page load and actual successful login response; no auth/session change or bypass.
- Canvas fallback notification ran even with WebGL available because R3F mounts fallback children inside `<canvas>`. Removed notification; real renderer errors/context loss still trigger static fallback.
- Owner preview reveal button submitted its parent Save form. Added `type="button"` and an assertion that pointer/keyboard preview leaves saved settings unchanged.
- Direct owner-preview refresh exposed an SSR/client reduced-motion markup mismatch. The preview now uses useSyncExternalStore with a static server snapshot, then subscribes to the live browser preference. Auth/media rules are unchanged. The added direct-refresh check initially failed in both projects, then passed in the final complete suite after correction.
- Existing saved-preview heading test now scopes to its article because the actual 3D preview adds a second rendering of the heart heading.
- One diagnostic accidentally included a disposable synthetic test fixture password. The exact marked isolated fixture's password was replaced with fresh random bytes and discarded. No environment/service key or real-account credential was printed; normal diagnostics now emit only render modes/counts/error categories.
- One obsolete browser run was deliberately stopped while waiting on the preview-submit defect. It has no PASS claim; its synthetic account IDs remain tracked for cleanup. Earlier failed runs are historical, not final acceptance.

## Visual/performance evidence

| Metric | Desktop owner preview | Mobile owner preview |
| --- | --- | --- |
| Heart particles | 11000 | 6000 |
| Draw calls / live geometries / textures (three rings) | 7 / 7 / 3 | 7 / 7 / 3 |
| Sampled frame intervals | 95 | 95 |
| Median / p95 interval | 16.7 / 16.8 ms | 16.7 / 16.7 ms |

Measured over approximately 1.6 seconds in headless Chromium, not a hardware performance guarantee or a GPU timer measurement. Stars/dust and hit mesh are included in draw/resource counts. Three-ring budgets are retained after these measurements; five-ring visual/interaction/fit coverage also passes, but hardware frame/VRAM/battery profiling for worst-case phrases remains NOT TESTED. Position/phase/star/dust arrays alone are approximately 184 KiB desktop / 100 KiB mobile; glyph atlas/mesh/driver costs are additional. Code explicitly disposes these resources; DOM unmount/count tests do not independently prove physical GPU memory reclamation.

Compare [reference frame](../references/heart/frames/frame-2.00.png), [desktop](assets/heart/desktop.png), [portrait](assets/heart/mobile.png), [five desktop rings](assets/heart/five-rings-desktop.png), [five portrait rings](assets/heart/five-rings-mobile.png). Final profiles are archived alongside the captures. The original reference recording remains outside public app assets.

## Files

New: `src/lib/validation/heart.ts`, `src/lib/experience/particle-heart.ts`, `src/components/recipient/text-ring.tsx`, `src/components/heart-customization.tsx`, migration 006, `scripts/extract-heart-reference.mjs`, `tests/particle-heart.test.ts`, `tests/browser/particle-heart.spec.ts`, this report and `PARTICLE_HEART_SETUP.md`. Extracted reference frames/metadata reside outside public assets.

Modified: heart canvas/scenes/recipient CSS/host cosmic styling; editor/shared Save; owner saved preview; V1 config/types/validation; owner/recipient DAL resolvers; database/gift-flow tests; safe reporter (whitelisted diagnostics); PRD/architecture/database/API/security/TASKS. `next-env.d.ts` is regenerated by the production build. No authentication/session or media-access rule changes. No package/lock or applied-migration edits.

## Manual UAT — remaining physical-device checklist

- [ ] Open the new scene on an actual low-end Android and iPhone/Safari; compare composition/glow/ring spacing with the reference at portrait/landscape sizes and 320 px width.
- [ ] Read Vietnamese diacritics/emoji and five maximum-length phrases; check installed-system-font appearance and front-facing ring readability.
- [ ] Check frame rate, thermal/battery behavior and browser memory across repeated preview/scene/replay cycles; headless frame intervals and Three.js resource counts do not prove hardware GPU memory reclamation.
- [ ] Test OS reduced motion changed while reading, browser WebGL disabled initially, GPU reset/context restoration and accessibility with a screen reader.
- [ ] Verify actual audible soundtrack on supported phones, autoplay permission fallback, close/expiry cleanup, and device/browser audio controls; application controls remain as previously approved.
- [ ] Run deployed hosting/large-private-audio-transport/headers/cron/SMTP checks only after a separately approved deployment target. Existing release gates remain.

Operator cleanup: 100 tracked synthetic Auth accounts (39 added this task), including earlier/interrupted fixtures, remain in ignored `.test-fixtures.json`, with no passwords. Completed browser tests remove their synthetic letters through normal authorized APIs; interrupted/earlier failed runs may leave synthetic data. Full account/cleanup queue drainage and production deployment are not claimed.


Current failures: **0**. No new authorization blocker found by the executed tests. Remaining limits: physical browser/device/font/audio/accessibility/performance matrix; far-side text naturally recedes/mirrors on a real ring; static fallback keeps the existing pink icon; exact reference fidelity is not claimed. Existing Vercel >4.5 MB private audio transport, deployed resource/cron/SMTP and operator cleanup gates remain. No deployment or Day 3 work.

### Exact changed-file inventory

Modified:

- `TASKS.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/PRD.md`
- `docs/SECURITY.md`
- `next-env.d.ts`
- `src/app/studio/letters/[id]/preview/page.tsx`
- `src/components/letter-editor.tsx`
- `src/components/recipient/experience.tsx`
- `src/components/recipient/heart-canvas.tsx`
- `src/components/recipient/recipient.css`
- `src/components/recipient/scenes.tsx`
- `src/lib/experience/configuration.ts`
- `src/lib/server/letters.ts`
- `src/lib/server/recipient.ts`
- `src/lib/types.ts`
- `src/lib/validation/letters.ts`
- `tests/browser/gift-flow.spec.ts`
- `tests/browser/safe-reporter.ts`
- `tests/database.test.ts`

Created/generated:

- `docs/PARTICLE_HEART_SETUP.md`
- `docs/PARTICLE_HEART_TEST_REPORT.md`
- `docs/assets/heart/browser-summary.json`
- `docs/assets/heart/desktop.png`
- `docs/assets/heart/five-rings-desktop.png`
- `docs/assets/heart/five-rings-mobile.png`
- `docs/assets/heart/mobile.png`
- `docs/assets/heart/profile-desktop.json`
- `docs/assets/heart/profile-mobile.json`
- `references/heart/frames/frame-0.20.png`
- `references/heart/frames/frame-2.00.png`
- `references/heart/frames/frame-4.00.png`
- `references/heart/frames/frame-5.50.png`
- `references/heart/frames/metadata.json`
- `scripts/extract-heart-reference.mjs`
- `src/components/heart-customization.tsx`
- `src/components/recipient/text-ring.tsx`
- `src/lib/experience/particle-heart.ts`
- `src/lib/validation/heart.ts`
- `supabase/migrations/202610140006_particle_heart.sql`
- `tests/browser/particle-heart.spec.ts`
- `tests/particle-heart.test.ts`
