# SecretLove — Security Design and Release Gates

Status: architecture approved. Day 1 creator ownership, validation, private media, transactional writes, recovery proof, throttling and cleanup controls are implemented with local tests. Live Supabase/email acceptance is tracked in TASKS.md. Recipient controls below remain required future implementation; this document is not a certification of deployed protections. Read before changing authentication, authorization, verification, sessions, content APIs, or Storage permissions.

## 1. Security claims and trust boundaries

SecretLove protects private content from unauthenticated visitors and other creators. A recipient must possess an active share link and satisfy the configured gate, then use a short-lived letter-bound session. The browser is untrusted; hidden UI and animation state are never authorization.

Name/date of birth are often known, discoverable, or guessable. They are a **low-security gate, not proof of identity**, even with rate limits. The optional passphrase is stronger only when sufficiently unpredictable and shared separately. Do not describe this MVP as highly secure, end-to-end encrypted, screenshot-proof, or one-time viewing.

Trusted systems: Next.js server/DAL, Supabase Auth/PostgreSQL/Storage, deployment administrators, and configured providers. They can access application content. Supabase/service-key/database compromise exposes letters; HMAC verification digests are data minimization, not content encryption. Authorized recipients can retain/share any delivered content.

## 2. Threats and mandatory controls

| Threat | Required mitigation | Residual limitation |
| --- | --- | --- |
| Another creator guesses IDs | Validated identity, explicit owner checks, RLS, service-only write RPCs, generic 404 | Privileged server bugs still require tests/review. |
| Link enumeration/leak | 256-bit random token, indexed digest lookup, generic metadata, no-referrer/noindex, redacted logs | URLs/QRs can be forwarded; infrastructure/browser history may retain them. |
| Name/DOB/passphrase guessing | Optional slow-hashed passphrase, durable limits before comparison, generic failure response | Distributed guesses and targeted lockout remain possible; no identity proof. |
| DB-only gate digest attack | Nonce + server-keyed HMAC for name/DOB; salted scrypt for passphrase | Display names/content remain in DB; stolen DB + keys defeats this protection. |
| Session theft/fixation | Fresh random token, digest-only DB storage, HttpOnly/Secure cookie, short fixed expiry, letter/version binding | Browser/device compromise and XSS can still use an active session. |
| Pre-unlock content leak | Minimal bootstrap DTO; no protected HTML/RSC/metadata/preloads; no public Storage | A URL's availability and passphrase-required flag are intentionally public. |
| Stale access after revoke | Transactional access version; recheck each content/media request; proxy media; no caches | Delivered/in-flight bytes and screenshots cannot be recalled. |
| Cross-site requests | SameSite cookies, strict Origin/content-type checks for mutations, no permissive CORS | XSS on the application's origin is separately mitigated. |
| Stored XSS/malicious text | Schema-validated rich-text JSON, allowlisted React renderer, no arbitrary HTML/URLs | Must test renderer and editor serialized input together. |
| Malicious/oversized image | Bounded input/decode dimensions, signature/format check, re-encode/metadata stripping | Decoder dependencies need maintained versions and runtime resource bounds. |
| Partial delete/upload failure | Tombstone/reservation transaction, private objects, durable cleanup jobs | Physical erasure may lag logical revocation; provider backups have separate retention. |
| Excessive cost/abuse | Per-user quotas, durable public/verify/upload throttling, small media and worker batches | Not a full DDoS solution; provider capacity/alerts still needed. |

## 3. Creator authentication and ownership

- Use Supabase Auth; no app password table. Confirm emails before protected Studio operations; test actual email callbacks/recovery, not a mocked success screen.
- Server DAL validates identity using `getUser()` before protected data operations. Never trust client actor IDs, cookie-decoded claims without verification, UI visibility, or `getSession()`'s user alone. Follow Supabase's [server-side identity guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
- Explicitly require a confirmed email for Studio access, derive actor ID from the verified user, and use request-scoped owner clients. The separate service client must never inherit a browser Authorization header, creator cookie adapter, or client-controlled credentials. Creator sign-out follows Supabase's token lifecycle; do not claim that every previously issued JWT is instantly invalidated. Recipient session revocation is independently enforced by the application.
- Creator JWT-scoped reads use RLS (`owner_id = auth.uid()`); deny direct browser writes. Service-only transactional writes recheck owner and parent/photo membership after locks. Never import privileged clients into browser components.
- Refresh integration/layout protection does not replace authorization on pages, Route Handlers, Server Actions if later introduced, RPC gateways, or media downloads. See [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication).
- Restrict callback/recovery redirects to configured app origins and safe relative paths; no user-controlled open redirect. Respect Supabase SSR cookie/session behavior rather than hand-rolling creator cookies.
- Anonymous and unrelated creators cannot access draft/published content through Data API, REST, GraphQL, functions, or Storage. Publication does not create anonymous RLS access.

## 4. Input rules and verification secrets

- Apply authoritative allowlist schemas server-side. Enforce body/field/Unicode-byte limits before expensive hashing/decode. Reject unknown fields, invalid UUID/token encodings, malformed JSON, and impossible dates.
- Verification name: NFKC → trim → collapse Unicode whitespace → locale-independent lowercase; retain punctuation/accents. DOB: strictly parsed valid `YYYY-MM-DD`, no time-zone conversion. Same canonicalization on configuration and verification; test Unicode and calendar edge cases.
- HMAC-SHA-256 the canonical JSON tuple `[letterId, nonceBase64, normalizedName, dateString]` using server-only `VERIFICATION_HMAC_KEY` (32+ random bytes). Random nonce is 16 bytes per gate; store only nonce/digest/key version. Constant-time compare equal-length digests. Do not retain/log raw DOB or verification input.
- Recipient display name remains separately stored for greetings, so this is not anonymization. On edit, return only configured/not-configured state; replacing name/DOB requires both values again.
- A passphrase cannot be saved into an incomplete gate: require an existing name/DOB configuration or both inputs in the same Save transaction. Remove-passphrase leaves identity verification intact. Validate name length/non-emptiness after normalization as well as before it.
- Passphrase is exact, without automatic lowercasing/trimming; 12–128 code points/512 UTF-8 bytes maximum. Store a versioned salted scrypt record using Node async crypto: N=2^17, r=8, p=1, random salt >=16 bytes, derived key 32 bytes, explicit maxmem budget >=192 MiB. Never use a fast hash, plaintext, or reversible encoding for passphrases.
- These scrypt parameters follow the [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Benchmark memory/latency in the chosen Node runtime; bound expensive operations to at most two concurrently per instance and reject overload. Parameter changes need review, not silent weakening to make a test pass.
- Perform rate checks first, generic gate comparisons next, then transactional publication/version recheck when issuing session. Reject malformed stored hash records safely; no stack/provider dump to recipient.
- For a passphrase-protected letter, every syntactically valid attempt takes the same scrypt comparison path even if name/DOB is wrong or the required passphrase is absent (use a bounded dummy candidate for absence). Do not short-circuit on identity mismatch and reveal correctness through an obvious timing oracle. This reduces a distinguisher; it is not a promise of perfectly equal network timing.
- Save never returns secrets. Removing a passphrase is explicit and allowed only while draft. Warn creators to share passphrase through a different channel from the link; never embed it in QR/URL.
- HMAC key loss/rotation cannot recompute digests without raw DOB: require affected owners to unpublish/reconfigure/republish, or retain the old server key during a planned transition. Never fail open. Key compromise revokes affected recipient access; operational plan must include owner notification outside automatic app messaging.

## 5. Share links and recipient sessions

- Share token: 32 CSPRNG bytes, base64url; private table keeps token for deliberate owner share retrieval and digest for lookup. It is a confidential locator, not content authorization.
- Session token: independently generated 32 CSPRNG bytes; only SHA-256 digest stored in DB. It is never exposed in JSON, logs, URLs, localStorage, or a recipient-accessible JS value.
- Cookie: `__Host-sl-recipient-{shareDigestPrefix}`, Secure, HttpOnly, SameSite=Lax, Path=/, Max-Age=1800, no Domain. Prefix is first 16 share-digest bytes in hex. Fixed 30-minute lifetime enforced using server time, with no automatic renewal. Development exception is explicitly non-production and separately named.
- Reverification replaces/revokes that letter's old cookie session; new session prevents fixation. Distinct letter cookies support multiple tabs without authorizing another letter.
- Every content/media query requires session digest, letter ID, unexpired/unrevoked session, matching access_version, active share, published state, and deleted_at NULL. Do not check only once on page load.
- Unpublish/delete atomically denies future reads; republish rotates link and version. Verify-to-issue race checks under the parent letter lock ensure credentials validated against a prior gate/publication cannot create current access.
- Explicit Close revokes current session/clears cookie and client state. Session rows are pruned after expiry; access checks never wait for cleanup. Expiry timer/errors clear client state, but this cannot erase a recipient's saved copies.
- Resuming a session uses the protected content API and returns the current expiresAt; the initial landing remains generic. Neither a client timer nor the existence of a cookie is sufficient authorization, and resume never renews expiry.
- Owner preview is a separate ownership path; a creator's login is never a generic recipient-session bypass.

## 6. Durable throttling

Initial private-beta limits (fixed windows; tune only with recorded evidence):

| Scope | Limit | Applies before |
| --- | --- | --- |
| Verification, letter + IP | 5 attempts / 15 minutes | Gate comparison, including success |
| Verification, IP across all tokens | 30 attempts / 15 minutes | Share lookup and expensive hashing |
| Verification, letter across IPs | 100 attempts / 24 hours | Comparison/session issuance |
| Recipient bootstrap/content/media, IP | 120 requests / minute | Database lookup/media fetch; verification also has its own limits |
| Creator mutation, verified user | 60 requests / minute | Any privileged write |
| Photo upload, verified user | 12 uploads / 10 minutes | Decode/Storage pipeline |

Use atomic PostgreSQL buckets across instances, not in-memory counters. Consume the global IP scope before share lookup; known letters additionally consume letter scopes before comparison. Return a denial decision without rolling back counters; unknown-link verification and successful attempts still count. Key buckets using a separate HMAC key and canonical IP/letter identifiers; do not store raw IP or share tokens. Bound accepted token length before deriving keys.

Only trust the client IP header supplied/overwritten by the configured hosting boundary; verify deployment behavior and reject arbitrary spoofable forwarding headers. Local tests use an explicit test adapter. If a trusted address is unavailable, use a conservative shared anonymous bucket instead of bypassing throttling. DB/limiter outage returns 503 and denies verification.

429 returns generic rate-limit message and Retry-After. Limits apply to all attempts; no per-field correctness oracle. Avoid promising identical timing, but test for obvious distinguishers and do not expose which secret failed. Global letter limits can be weaponized to lock out readers; higher-assurance OTP/CAPTCHA/adaptive controls are future work, not reasons to disable limits.

## 7. Private content and media

- No message, personal greeting, title, private template, photo path, or verification hint in initial HTML, RSC payload, page metadata, OG images, prefetch/preload, error responses, or public bootstrap DTO.
- Structured rich text only: allowlisted paragraphs/text/breaks/lists with bold/italic; cap 64 KiB, 10,000 visible characters, 1,000 nodes, depth 8. Render React elements/text, never `dangerouslySetInnerHTML`. No raw HTML, user links, styles, embeds, SVG, script, or external images.
- Use a private `letter-media` bucket; deny anon/authenticated object read/list/write. Only bounded server routes access Storage after authorization. No public buckets or signed recipient media URLs.
- Supabase [private bucket documentation](https://supabase.com/docs/guides/storage/buckets/fundamentals) explains the access distinction. Its [download guidance](https://supabase.com/docs/guides/storage/serving/downloads) explains that signed URLs remain valid until expiry; this proposal uses proxy reads so future requests are checked after revocation.
- Server-generated paths under owner/letter/photo IDs; membership checks prevent cross-letter access and path traversal. Do not accept arbitrary keys, remote URL fetches, or user filenames as paths.
- Validate JPEG/PNG/WebP input <=3 MiB; signature and actual decode; <=4096 px/dimension and <=16 MP; normalize orientation, re-encode WebP, strip EXIF/GPS, reject unsupported/animated/truncated data, output <=3 MiB. Keep no original. Bound multipart bytes and decode resource use; Sharp is server-only and maintained.
- Serve image/webp with nosniff, no redirects, and private no-store headers. No private Next Image optimizer, CDN transformations, browser/service-worker caching, or public placeholder derived from a private photo. Unauthorized media returns no image bytes.
- SQL and Storage are separate systems. Pending reservations, parent locks, and durable cleanup must prevent partial failures from publishing phantom photos or resurrecting deleted letters.

## 8. Web protections and logs

- HTTPS in production; HttpOnly/Secure recipient cookies. Strict same-origin Origin check for mutations plus allowed content types; reject null/missing origins. Supabase Auth callbacks and authenticated scheduler invocations have their own explicit paths, not a blanket exemption.
- No permissive CORS. Generic metadata and `X-Robots-Tag: noindex, nofollow`; robots directives are privacy hygiene, not authorization.
- `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, frame denial via CSP frame-ancestors, object-src none, base-uri restriction, and a tested Next.js-compatible CSP with nonces for runtime scripts where needed. Avoid unsafe-eval/wildcard script sources. Scope Supabase connections narrowly; no third-party recipient analytics/fonts that leak paths.
- Dynamic private pages and APIs with `Cache-Control: private, no-store`; no shared memoization/ISR/CDN cache of user data. Request-scoped memoization must not span users/sessions. Verify actual deployed headers and response bodies, not just configuration files.
- Redact raw share paths, cookies, DOB, names, content, passphrases, hashes, Storage paths, and provider errors from app logs/traces. Use route templates/request IDs/aggregate counters. Disable request-body tracing on secret routes.
- Platform/proxy logs and browser histories may contain share URLs despite app redaction; check configured retention/access and communicate this limitation. Never put verification/session/passphrase data in query strings.

## 9. Grants, privileged functions, and secrets

- RLS enabled everywhere; public owner tables have owner-only SELECT policies; no browser table writes. Private schema unexposed with no anon/authenticated usage/grants.
- Revoke function EXECUTE from PUBLIC, anon, authenticated; grant service role only on required gateways. Fix search_path/schema-qualify identifiers; prefer SECURITY INVOKER, use SECURITY DEFINER only with documented need and equivalent restrictions. Default function privileges are permissive unless changed, as described by [Supabase's function security guidance](https://supabase.com/docs/guides/database/functions).
- Service key/HMAC/rate-limit/cron secrets stay in approved server secret stores and server-only modules, never client env or source. Public project URL/publishable key are permitted only with the configured denial policies. No hardcoded production data or secrets in fixtures.
- Test/preview use separate Supabase project and synthetic data; never run destructive integration tests against production. Ignore env files and inspect repository/client bundle for accidental secret exposure before release.
- Rotate leaked service key immediately; revoke affected sessions/shares and inspect data access. A compromised provider/admin can read content; do not imply RLS protects against service-role leakage.

## 10. Retention, deletion, and operation

- Delete transaction tombstones and clears message/display name, removes gate/share/session/photo metadata, and enqueues storage paths. Queued paths remain private; future application reads denied immediately. Purge tombstone after cleanup; UI accurately reports pending physical deletion.
- Daily protected cleanup: expired/revoked sessions >24 hours past expiry, rate buckets >48 hours, stale upload reservations >1 hour, orphan detection and queued Storage retries. Late upload completions must enqueue deletion; reconcile generated paths against ready/pending records without treating actively leased uploads as orphans.
- Stale uploads may survive a worker crash. Cleanup lists only the fixed private bucket with service credentials; skip recent objects/active reservations; idempotent Storage removals. Never directly DELETE storage.objects metadata as a substitute for deleting bytes.
- Keep retry job until success; bounded batches/leases/backoff and redacted operational failure signal. Cleanup outage cannot restore recipient access.
- Scheduled retries mean a later cron/operator invocation; do not assume Vercel retries failed cron requests. Persist a bounded reconciliation cursor/last-success marker and regularly restart full sweeps so pagination shifts cannot permanently hide orphan objects. Monitor remaining jobs and missed runs; daily best-effort cleanup is not a guaranteed erasure deadline. See [Vercel cron behavior](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
- Account deletion is operator-assisted for MVP: tombstone all owned letters/enqueue media first, then remove Auth account after dependencies are handled. Do not silently cascade Auth deletion and lose cleanup paths.
- Provider backups/log retention and recovery are distinct from live deletion; document selected account settings before launch. Do not claim instantaneous erasure from backups or a jurisdiction-specific compliance guarantee. No recipient data in analytics.

## 11. Required security validation before release

- Direct anonymous/cross-owner table, RPC, and Storage access denied; client cannot write ownership, publication, or access versions through Supabase APIs.
- Test page source, HTML/RSC/hydration, metadata, bootstrap, errors, prefetch network requests, cache headers, and logs for pre-verification disclosure.
- Verify canonical names/DOB, incorrect credentials, absent passphrase, malformed hashes, and payload/rich-text limits; stored XSS renders harmless text or is rejected.
- Check session expiry/revoke, cross-letter/media mismatch, cookie flags, no session data in JSON/localStorage, and verify/unpublish concurrent race.
- Check ownership/quota/optimistic-version transactions, concurrent upload slots, pending-upload publish rejection, late uploads after delete, and durable cleanup retries.
- Test anonymous/private photo URLs, malformed MIME/signature, oversized/pixel-bomb/animated images, EXIF removal, and generated path membership.
- Test Origin/redirect restrictions, distributed rate limits (including unknown links), spoofed headers, and fail-closed DB/Storage/limiter outages.
- Verify passphrase-only Save is rejected safely; normalization cannot produce an empty/over-limit identity; resumed content includes correct fixed expiry; passphrase comparison does not short-circuit on a wrong name/DOB.
- Typecheck/lint/production build and real deployed smoke test pass; inspect deployed HTTPS/headers/email flows. Visual improvements cannot substitute for any failed security gate.
