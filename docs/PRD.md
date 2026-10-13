# SecretLove — MVP Product Requirements

Status: architecture approved by the user; Day 1 Creator Studio implementation is underway. Publishing/sharing and Recipient Experience remain later milestones.
Planning date: 2026-10-14 (Asia/Bangkok). The three implementation days start after approval and environment readiness.

## 1. Product and objective

SecretLove lets an authenticated creator compose a private digital letter, add personal photos, and share a link or QR code. The recipient verifies access and moves through an envelope, pink heart, memories, and letter scene.

The MVP must prove one complete journey: create a draft → preview → publish → share → verify → read → revoke access. Privacy and working persistence take priority over animation polish.

Historical planning baseline: README.md and AGENTS.md only. The repository now contains the Day 1 application, migration, and tests; TASKS.md distinguishes implemented code from pending live acceptance.

## 2. Assumptions and boundaries

- One experienced full-stack engineer; a three-day private-beta target with external setup complete beforehand. Final review estimates 30–40 engineering hours including integration/security checks, so a strict 24-hour implementation budget is not reliable. Approve contingency or explicit scope changes before coding; modest private beta traffic only.
- One creator owns each letter; exactly one intended recipient per letter. A recipient has no account.
- Creator authentication uses Supabase email/password, email confirmation, sign-out, and password recovery. No social providers in the MVP.
- English interface initially; names and messages support Unicode. No translation system.
- Two fixed templates: `rose` and `minimal`. Both use the same content and reading sequence.
- Name + date of birth is explicitly a **low-security access gate**, not identity proof. An optional separately shared passphrase adds resistance to guessing.
- Creators have permission to use the recipient's details and photos. This product does not offer end-to-end encryption or prevent screenshots/downloads after access.
- Supabase and Vercel accounts, an email delivery configuration, and deployment secrets are available before Day 1. Delays in provisioning move the schedule.

## 3. Required MVP features

| Area | Required behavior | Acceptance criteria |
| --- | --- | --- |
| Authentication | Register, confirm email, sign in/out, recover password | Unauthenticated Studio requests are denied; creator A cannot access creator B's data; callback redirects are allowlisted. |
| Dashboard | List own drafts/published letters; new/edit/preview/share/delete actions | Empty, loading, error states; private titles visible only to owner; creation date and status displayed. |
| Draft editor | Private title, recipient display name, verification name/DOB, optional passphrase, message, template | Explicit Save with unsaved-change warning; server validation; refresh restores saved data; secret fields never returned. |
| Rich text | Paragraphs, line breaks, bold, italic, ordered/unordered lists | Structured JSON with a small node/mark allowlist; no raw HTML, links, embeds, scripts, or external media. Maximum 10,000 visible characters and 64 KiB serialized body. |
| Photos | Upload, inspect, remove up to six images in upload order; alt text editable | JPEG/PNG/WebP only; maximum 3 MiB input each; server validates decoded image, strips metadata, stores private normalized bytes. No photos is valid. |
| Templates | Select rose/minimal presets | Both responsive at 360 px; recipient template choice disclosed only after access. |
| Preview | Owner-only preview using saved content and the real scene components | Works without publishing or issuing a recipient session; labelled preview; unsaved edits require Save first. |
| Publish/share | Validate and publish saved draft; copy link; download QR PNG | At least one non-whitespace message character and configured verification required; no pending uploads; unguessable link; QR encodes only that link and is generated locally. |
| Edit/revoke | Published content is frozen; Unpublish before editing | Unpublish immediately denies subsequent protected requests and invalidates sessions. Republish creates a fresh link; old QR/link stays unavailable. |
| Delete | Confirm destructive action and delete own letter | Immediate logical removal and access denial; storage cleanup retried separately. UI distinguishes removal from pending physical cleanup. |
| Recipient landing | Generic romantic welcome, verification form | No title, recipient identity, DOB, photo, message, private template, or credential hint in HTML, metadata, hydration, or preload requests. |
| Verification | Name + DOB and passphrase if configured | Generic incorrect-details message; field labels and accessible errors; distributed rate limits; success creates a letter-bound server session. |
| Reading | Envelope opening → pink heart → photo gallery → final rich-text letter | Explicit Next/Skip/Back controls; keyboard/touch operation; empty gallery skipped; session expiry prompts verification again. |
| Animation | Motion envelope and lightweight procedural R3F pink heart | Lazy-load 3D after access; no external model assets; static heart fallback for reduced motion, unavailable WebGL, or runtime failure. |

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

Social login/MFA, stronger recipient verification (email OTP/account), scheduled delivery, expiry settings, read receipts/analytics, recipient replies, multiple recipients, collaborative creation, version history/live published edits, custom template builder, music/video, HEIC/GIF support, drag-and-drop gallery ordering, direct resumable uploads, custom 3D models, AI writing tools, public discovery, payments, admin UI, localization, automated account self-deletion, and end-to-end encryption.

## 7. Release acceptance

- Two distinct creators and an anonymous browser complete the ownership and recipient flows against a real test Supabase project.
- Correct verification unlocks only the matching published letter; incorrect, expired, revoked, cross-letter, and missing sessions reveal no protected content or media.
- All private photos remain inaccessible via anonymous Storage requests. No sensitive data appears in page source, metadata, logs, or caches before access.
- Publish validates content and gate configuration; pending uploads block publish; republish invalidates the old link/session; delete denies new requests.
- At 360 px and desktop width, there is no horizontal overflow; keyboard-only and reduced-motion reading work; failed WebGL does not block reading.
- Typecheck, lint, production build, important business/security tests, and deployed smoke tests pass. Milestone criteria are in [TASKS.md](../TASKS.md).
- Architecture approval is recorded before source scaffolding, dependency installation, schema application, or deployment.

## 8. Dependencies and risks

| Dependency/risk | MVP consequence and response |
| --- | --- |
| Supabase project/Auth/PostgreSQL/private Storage | Provision early; configure grants/RLS before exposing any data; separate test and production environments. |
| Email confirmation/recovery delivery | Configure sender/SMTP and callback allowlist before testing with external users; email outage cannot produce a success response. |
| Vercel hosting, HTTPS, request limits, scheduled cleanup | Small server-mediated uploads; confirm chosen plan/runtime supports limits and protected daily cleanup. |
| Motion/R3F/editor/image/QR libraries | Pin compatible versions at implementation; basic editor toolbar and procedural heart; local QR only. |
| Guessable personal details/leaked links | Low-security warning, optional passphrase, database-backed throttling and revocation; do not market identity assurance. |
| Three-day schedule | Aggressive beta target, estimated 30–40 engineering hours; reserve 1–2 additional working days if needed. No teams, snapshot publishing, analytics, or asset pipeline. Simplify visual polish first; never cut access checks. |
| Storage/DB operations cannot share a transaction | Tombstone access first; queue cleanup and retry; test partial failures. |
| Authorized recipient can copy content | State limitation in creator UI; revocation stops subsequent requests, not copies already received. |

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [API.md](API.md), and [SECURITY.md](SECURITY.md) for the proposed technical contracts.

Final design review and requirement traceability: [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md). The user subsequently approved the design; current implementation and acceptance evidence are in TASKS.md.
