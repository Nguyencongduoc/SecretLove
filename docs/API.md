# SecretLove — API Contracts

Status: Day 1 creator/auth/owner-photo routes implemented; publishing/sharing and all recipient contracts below are deferred. All paths are same-origin. Next.js Route Handlers delegate to a shared server-only DAL; Server Components call that DAL directly instead of fetching their own HTTP API. `GET /api/letters` returns all active owner cards (maximum 20), so pagination is currently unnecessary and `nextCursor` is null.

Implemented auth mutations: `POST /api/auth/login`, `/signup`, `/recover`, `/reset`, `/logout`; email confirmation/recovery uses `GET /auth/callback`. `GET /api/cron/cleanup` is a separate server bearer-authorized maintenance route, with aggregate counts only. Owner photo mutations return updated string versions; removal/deletion reports pending physical cleanup. See SETUP.md for required configuration.

## 1. Conventions

- JSON uses camelCase; UUID resource IDs, ISO UTC timestamps, and date-only `YYYY-MM-DD` DOB inputs.
- Successful JSON: `{ "data": ... }`. Error: `{ "error": { "code": "...", "message": "...", "requestId": "...", "fieldErrors": { } } }`. Omit fieldErrors unless validation needs it; never include sensitive input values.
- Server allowlist validation rejects unknown fields and client-controlled owner/status/version writes. Generic JSON cap 96 KiB; rich-text document cap 64 KiB/10,000 visible characters/1,000 nodes/depth 8; verify body cap 4 KiB. Uploads have a separate bounded multipart limit.
- `400 VALIDATION_ERROR`, `401 AUTH_REQUIRED`/`ACCESS_REQUIRED`/`VERIFICATION_FAILED`, `403 ORIGIN_DENIED`, `404 NOT_FOUND`, `409 VERSION_CONFLICT`/`LETTER_PUBLISHED`/`UPLOAD_PENDING`, `413 PAYLOAD_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `422 INVALID_IMAGE`/`PUBLISH_INCOMPLETE`, `429 RATE_LIMITED`, `503 TEMPORARILY_UNAVAILABLE`.
- For creator letter/photo IDs, missing and unowned return identical 404. Creator authentication failure is 401. Unknown/inactive/deleted share returns generic 404 with no state distinction. Missing/expired/revoked/mismatched sessions on an active share return generic 401.
- All creator/recipient private responses and availability responses use `Cache-Control: private, no-store`. No CORS access from arbitrary origins. Mutations require exact allowed Origin and supported content type for routes with bodies; no-body session close accepts an absent Content-Type. Reject absent/null origins in browser mutation routes. Auth provider callbacks are separately handled.
- Cookie authentication; no session/verification/passphrase tokens in URLs. The random share locator is intentionally in `/l/{shareToken}` and related recipient API paths, and must be redacted from logs/referrers. `Retry-After` for throttling, request ID for safe diagnostics. No endpoint accepts arbitrary Storage paths/redirect URLs.
- JSON version counters serialize as decimal **strings**, preventing JavaScript bigint precision loss. Updates include `expectedVersion`; missing is 400, stale is 409. No overwrite-on-conflict.

## 2. Shared data shapes

```typescript
type TemplateId = 'rose' | 'minimal';
type Version = string; // Positive decimal bigint from server
type RichTextDoc = {
  type: 'doc';
  content: RichTextNode[];
};
// Strict nodes: paragraph, text, hardBreak, bulletList, orderedList, listItem.
// Strict marks: bold, italic. No arbitrary attrs, HTML, links, embeds, or images.

type PhotoDto = {
  id: string;
  altText: string;
  status: 'pending' | 'ready'; // Creator only; recipient sees ready photos only
  createdAt: string;
};
type OwnerLetterDto = {
  id: string;
  title: string;
  recipientDisplayName: string | null;
  bodyDoc: RichTextDoc;
  templateId: TemplateId;
  status: 'draft' | 'published';
  version: Version;
  verificationConfigured: boolean;
  passphraseRequired: boolean;
  photos: PhotoDto[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
type RecipientContentDto = {
  expiresAt: string; // Safe session expiry, including when resuming after reload
  recipientDisplayName: string;
  bodyDoc: RichTextDoc;
  templateId: TemplateId;
  photos: Array<{ id: string; altText: string }>;
};
```

Type sketches are illustrative; runtime schemas are required. Neither DTO includes verification inputs/digests, owner ID, share token, session token, storage path, or passphrase record.

## 3. Creator auth

Use Supabase Auth SDK for registration, password sign-in, sign-out, and reset-email requests; do not invent application password storage/endpoints. `/auth/callback` exchanges allowed provider codes and handles confirmation/recovery; `/reset-password` requires a valid recovery session. Use generic auth errors and provider throttling. Studio reads/mutations validate identity server-side. No service-role credential is ever used in the browser.

## 4. Creator letters

| Method/path | Auth | Request | Success |
| --- | --- | --- | --- |
| `GET /api/letters` | Creator | `?cursor=...&limit=20` (1–20) | 200 `{items, nextCursor}`; items contain id/title/status/templateId/version/createdAt/updatedAt only |
| `POST /api/letters` | Creator | `{ "title": "..." }` | 201 OwnerLetterDto, default empty rose draft; reject active-letter quota with 409 `LETTER_LIMIT` |
| `GET /api/letters/{id}` | Owner | None | 200 OwnerLetterDto |
| `PATCH /api/letters/{id}` | Owner, draft | Save payload below | 200 updated OwnerLetterDto; expectedVersion mandatory |
| `POST /api/letters/{id}/publish` | Owner | `{ "expectedVersion": "..." }` | 200 `{letter, shareUrl, publishedAt}`; invalid draft 422; pending photos 409 |
| `GET /api/letters/{id}/share` | Owner, published | None | 200 `{shareUrl}`; draft 409 `NOT_PUBLISHED` |
| `POST /api/letters/{id}/unpublish` | Owner | `{ "expectedVersion": "..." }` | 200 updated OwnerLetterDto; revocation committed before response |
| `DELETE /api/letters/{id}` | Owner | `{ "expectedVersion": "..." }` | 202 `{deleted: true, mediaCleanup: "pending"}`; or 200 with cleanup `not_required` if no photo reservations, media, or outstanding cleanup jobs |

Dashboard list uses stable keyset ordering by updatedAt/id descending; cursor is validated and never changes ownership scope. No body/photos in list responses. The creator share panel locally generates a QR PNG encoding `APP_ORIGIN + /l/{shareToken}`; no external QR service/API. Owner preview page authenticates and reads saved OwnerLetterDto directly through the DAL.

Save payload (all fields except expectedVersion optional; at least one change required):

```typescript
type SaveLetterRequest = {
  expectedVersion: Version;
  title?: string;
  recipientDisplayName?: string;
  bodyDoc?: RichTextDoc;
  templateId?: TemplateId;
  verification?: { name: string; dateOfBirth: string };
  passphrase?: { action: 'set'; value: string } | { action: 'remove' };
};
```

Omitted verification/passphrase means preserve existing configuration. Never return raw verification name/DOB or passphrase on reload. Empty passphrase is rejected when setting; removing uses an explicit action. Published Save/upload/photo mutations return 409 `LETTER_PUBLISHED`. Saving verification/passphrase increments access_version even while draft.

Setting a passphrase requires an existing gate or a valid `verification` object in this same Save; otherwise return 422 `VERIFICATION_REQUIRED` without writes. Removal with no existing passphrase is a harmless no-op. Verification name length/non-emptiness is checked after normalization as well as before it.

Publish validates saved body/display name/gate and ready photos in a transaction; returns only after persistence. Repeating publish at the current published version returns the same link (no rotation). A stale expectedVersion still returns 409, allowing the caller to fetch current state. Republish after unpublish creates a new link.

Deletion is immediate for authorization but physical Storage cleanup can be asynchronous. Repeating a delete against an existing owned tombstone returns its removal/cleanup state; no longer retained IDs return 404. UI must not present pending cleanup as confirmed physical erasure.

## 5. Creator photo endpoints

| Method/path | Request | Success/behavior |
| --- | --- | --- |
| `POST /api/letters/{id}/photos` | multipart `file`, optional `altText`, required `expectedVersion`; exactly one file | 201 `{photo, version}` only after normalized private upload/finalization; owner/draft required |
| `GET /api/letters/{id}/photos/{photoId}/media` | No body | 200 image/webp bytes, owner only; ready status; no redirect/cache |
| `PATCH /api/letters/{id}/photos/{photoId}` | `{altText, expectedVersion}` | 200 `{photo, version}`; owner/draft and membership required |
| `DELETE /api/letters/{id}/photos/{photoId}` | `{expectedVersion}` | 202 `{removed: true, version, mediaCleanup: "pending"}`; draft only; queued path inaccessible immediately |

Input file <=3 MiB; total multipart request <=3.5 MiB. Validate signature, actual decode, allowed format/dimensions/pixel count; strip metadata/re-encode; output <=3 MiB. More than six ready/pending slots returns 409 `PHOTO_LIMIT`. Pending uploads block publish; quota counts pending too. Concurrent modifications can cause a safe 409; late Storage success is cleaned rather than resurrecting metadata. SDK/storage/decode failures never produce 201.

The Studio serializes mutations/uploads per letter; disable Save/publish while an upload is pending. Reservation increments version and returns a server-internal reservedVersion. Finalization requires that current parent version still equals that post-reservation version, as well as matching ownership/draft/reservation/path. It never reuses the pre-reservation expectedVersion. If another tab changes the letter during upload, finalize safely returns 409 and queues uploaded bytes/removes the reservation; preserve unsaved form input but require explicit reload/reconciliation rather than adopting the newer version and silently overwriting that tab's edits. Only an uninterrupted successful operation advances the editor's version automatically. Successful finalization and failed-reservation cleanup each increment version when changing visible state.

## 6. Recipient endpoints

| Method/path | Auth | Request | Success |
| --- | --- | --- | --- |
| `GET /api/recipient/{shareToken}/bootstrap` | None | None | 200 `{available: true, passphraseRequired: boolean}` for active published link only |
| `POST /api/recipient/{shareToken}/verify` | None; throttled | `{name, dateOfBirth, passphrase?}` | 200 `{verified: true, expiresAt}` and Set-Cookie; no content/token in JSON |
| `GET /api/recipient/{shareToken}/content` | Letter-bound recipient cookie | None | 200 RecipientContentDto |
| `GET /api/recipient/{shareToken}/photos/{photoId}/media` | Same recipient cookie | None | 200 image/webp bytes after session + photo membership checks |
| `DELETE /api/recipient/{shareToken}/session` | Existing cookie if present | No body; Origin check | 204, revoke matching session if found and clear cookie; idempotent even if no session |

Landing `/l/{shareToken}` uses only the minimal bootstrap function and a generic title/description/graphic. It must not query or serialize the message/photo paths into the server-rendered shell. Bootstrap exposes link availability and passphrase requirement only; rate-limit unknown tokens before lookup too. There is no public “check name”, “check DOB”, photo list, or content endpoint without session.

Generic Continue reading invokes the protected content endpoint to resume an existing session. A valid server-checked cookie returns content plus expiresAt; 401 returns to the verification form, and 404 shows unavailable. This does not issue/renew a session, fetch private content in the landing shell, or extend expiry. Client expiry timers use the returned server timestamp; server checks remain authoritative after sleep/reload/clock skew.

Verification syntax errors return 400 without checking whether personal details match. Any validly shaped wrong name/DOB/passphrase (including missing required passphrase) returns the same 401 `VERIFICATION_FAILED` message. An unknown/inactive share is generic 404; no draft/deleted distinction. Throttle applies before comparing credentials; DB/provider failure is 503 and no cookie.

Cookie: `__Host-sl-recipient-{shareDigestPrefix}` (first 16 digest bytes encoded hex), raw 32-byte random token encoded base64url; Secure, HttpOnly, SameSite=Lax, Path=/, Max-Age=1800; no Domain. Production HTTPS required. Derive cookie name server-side from the requested share, enabling separate sessions for different letters. Local development can use a clearly separate non-prefixed cookie only when Secure/HTTPS is unavailable; never weaken production flags.

On successful reverification, revoke/replace any matching prior session cookie and create a fresh session; prevent fixation. Missing session is never solved by falling back to a creator cookie. No sliding refresh endpoint. Content/media validates the active share and access version on every request; changing a photoId cannot cross letter boundaries.

Media URLs are same-origin endpoint paths computed from photo IDs/current share. Never return Supabase signed URLs. Disable private image optimizers, external analytics, and caching; limit accepted HTTP methods and reject unsupported Range requests rather than bypass authorization.

## 7. Internal cleanup contract

`GET /api/internal/cleanup` is exclusively an authenticated Vercel scheduler/operator invocation with `Authorization: Bearer {CRON_SECRET}`. It is dynamic/no-store and not a browser user mutation endpoint; no cookie auth/CORS. Return only bounded aggregate counts and redacted errors, including remaining queued work. No secret in the URL, no arbitrary path/bucket input. Invalid/missing/unconfigured secret returns 401. Vercel supplies this header when CRON_SECRET is configured; do not trust a cron user-agent/header alone. See [Vercel cron security](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

Process leased jobs in bounded batches, retry failed deletions, reconcile stale pending uploads, prune expired sessions/rate buckets, then purge completed tombstones. Unexpected failure returns non-success and remains retryable. Photo bytes are deleted via Storage API, not by modifying storage.objects alone.

Retries occur on a later scheduled/operator invocation; Vercel does not automatically retry a failed cron call. Each invocation has a runtime budget and bounded batches; reconciliation uses a resumable bucket-list cursor and ignores recent uploads/active reservations. Daily execution is best effort, not a physical-deletion SLA. Operator reruns drain backlog; no response claims all media deleted while jobs remain.

## 8. Contract acceptance examples

1. Creator B sends A's letter ID on GET/PATCH/publish/delete/photo APIs → identical 404, no mutation or leaked fields.
2. Anonymous client directly calls tables, private schema, RPC gateways, or Storage → denied regardless of a valid share token.
3. Session for share A requests share B's content/image → generic 401; guessed foreign photo ID under A → 404.
4. Correct verification races with unpublish → issuance rechecks version/state; no active session can authorize the unpublished letter.
5. Six concurrent upload reservations plus a seventh → at most six slots; pending/failure never becomes published media.
6. Stale expectedVersion Save → 409 with no writes; client offers reload instead of silently losing changes.
7. Successful unpublish/delete followed by content/media request → unavailable; a prior response already delivered cannot be recalled.
8. Supabase/Storage/throttle outage → retryable real error; no fake success or unthrottled verification.
