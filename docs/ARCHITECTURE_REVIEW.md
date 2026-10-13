# SecretLove — Final Architecture Review

Review date: 2026-10-14 (Asia/Bangkok).
Disposition: the user subsequently approved this architecture and authorized Day 1 Creator Studio implementation. This historical review remains a design review, not an audit of deployed software. Current implementation evidence and remaining live gates are in TASKS.md. The user moved Studio/media/owner preview into Day 1 and deferred all recipient and publication work.

## 1. Seven requested checks

| Check | Finding | Evidence/required verification |
| --- | --- | --- |
| All MVP requirements covered | Covered in the revised design, with explicit limits on rich text/templates/media | Traceability below and PRD feature acceptance table; end-to-end real-backend acceptance in TASKS.md. |
| Creator/recipient separation | Separate Studio routes, creator APIs, recipient routes/APIs, identities, and DTOs | Shared rendering only; recipient cookie cannot authorize Studio; creator cookie cannot bypass recipient gate; owner-only preview. |
| Multiple creators/letters | Supported: auth.users 1:N letters; every letter has immutable owner_id | RLS owner reads, DAL-derived actor ID and transaction ownership checks, creator-scoped quota/index/locks; no global singleton letter. |
| Server-enforced recipient access | Required on every content/media request, not just unlock UI | Opaque session digest + letter/share/access version + expiry/revocation/current publication state; issue/revoke race tests. |
| Authorized private media only | Private bucket with no browser grants; all reads through server authorization | Membership checks, same-origin proxies, no signed/public URLs/optimizer/CDN cache, test direct Storage denial. |
| Realistic three-day scope | **Conditional/stretch target, not a reliable strict 24-hour commitment** | Estimated 30–40 engineering hours for one experienced engineer with services ready; 1–2 days contingency or explicit scope revision requires approval. |
| TASKS order/acceptance | Revised and explicit | Day 1 Creator Studio/media/owner preview; Day 2 publish/share/recipient access; Day 3 recipient scenes/deployed validation. Each has measurable exit gates and tests. |

## 2. Requirement traceability

| Original requirement | Final MVP implementation boundary | Milestone |
| --- | --- | --- |
| Creator authentication | Supabase email/password, confirmation, sign-out, recovery; verified server identity | Day 1 |
| Dashboard | Owner-only list with title, status, created/updated dates and actions | Day 1 |
| Create/edit/delete/publish letters | Draft CRUD, version checks, publish validation; unpublish to edit; delete/revoke then cleanup | CRUD Day 1; publish Day 2 |
| Recipient details | Separate private greeting/display name and write-only name/DOB verification digest | Day 1 |
| Rich-text messages | Structured paragraphs/breaks/bold/italic/lists; safe renderer, explicit Save | Day 1 |
| Private photo uploads | Six JPEG/PNG/WebP inputs <=3 MiB; server-normalized private WebP, alt text/removal | Day 1 |
| Visual template selection | Rose/minimal fixed presets sharing the same content model | Day 1 |
| Letter preview | Owner-authorized saved-data preview; shared scenes completed on Day 3 | Basic preview Day 1; scenes Day 3 |
| Sharing links/QR | Random active share locator; owner-only retrieval; local copy/QR PNG | Day 2 |
| Romantic recipient landing | Generic welcome with no private personalization/content before access | Day 3 |
| Name + DOB verification | HMAC comparison with documented normalization and low-security warning | Configuration Day 1; access Day 2; form Day 3 |
| Optional secret passphrase | Salted async scrypt; gate prerequisite; separate-channel sharing reminder | Configuration Day 1; access Day 2; form Day 3 |
| Protected recipient session | Opaque HttpOnly cookie, fixed 30-minute expiry, resume/Close, server checks | Day 2 |
| Animated envelope | Motion scene with accessible explicit navigation and reduced-motion path | Day 3 |
| Animated 3D pink heart | Procedural/lazy R3F scene, low polygon count; static failure/accessibility fallback | Day 3 |
| Memory gallery/final reading | Authorized photo proxies and safe rich-text renderer; no-photo skip; keyboard/mobile | Day 2–3 |

No requested main journey was moved to future scope. The rich editor, two presets, image limits, fixed lifetime, and unpublish-before-edit are approved MVP constraints. Future features remain listed in PRD.md.

## 3. Contradictions, omissions, and risks addressed

| Finding | Documentation correction | Status |
| --- | --- | --- |
| Initial schedule placed most backend/UI/media work on Day 2 while implying three working days | Redistributed core lifecycle/recipient APIs to Day 1; explicit 30–40-hour estimate and contingency decision | Architecture approved; no hard deadline guarantee |
| PRD dashboard creation date missing from list contract | Added createdAt to list DTO and Day 1 acceptance | Corrected design |
| Passphrase Save could precede required non-null identity fields in gate table | Require existing gate or verification in same Save; otherwise 422 with no writes | Corrected design |
| Returning within a valid session had no concrete resume/expiry contract | Generic Continue reading uses protected content; content includes safe expiresAt; no renewal | Corrected design |
| “No app bearer tokens in URLs” contradicted share locator routes | Distinguish intentional share locator from forbidden session/credential URL data | Corrected design |
| Photo reservation/finalization and editor expectedVersion behavior underspecified; blindly adopting an upload version could hide another tab's Save | Define parent version increments/serialized UI writes; finalization requires server-issued post-reservation version; conflict preserves input and requires explicit reconciliation | Corrected design; concurrent upload/Save no-lost-update tests required |
| Generic mismatch response alone could still reveal correct name/DOB via skipped passphrase hashing | Same bounded scrypt comparison path for syntactically valid attempts, including wrong identity/missing required phrase | Corrected security requirement; timing review required |
| Cleanup “retry” could be read as automatic scheduler retry; bounded orphan scan had no progress state | Durable jobs/leases plus maintenance cursor; later scheduled/operator retries; backlog/missed-run visibility; no erasure-time SLA | Corrected design; account settings/operator responsibility remain |
| Name-collision warning was inapplicable to one recipient | Replace with documented normalization preview and post-normalization validation | Corrected design |
| JSONB serialization size differs from compact API JSON size | 64 KiB canonical application limit plus separate 96 KiB database defensive bound | Corrected design |
| Media pipeline overstated universal polyglot detection | Decode and re-encode; never retain/serve original; reject unsupported/animated/decode-failing input | Corrected design |
| Email delivery and hosting schedule were described too generically | Custom SMTP/sender prerequisites, explicit cron bearer auth/daily limits/no automatic retry, provider setup checklist | Configuration pending |

Security tradeoffs that remain deliberate:

- Name/DOB provides low assurance. Optional passphrase does not verify identity; authorized readers can copy content.
- Service role bypasses RLS. All writes/private reads depend on the server-only DAL and restricted functions doing the required checks; tests must cover each privileged path.
- A private share table retains raw links for owner retrieval. Database/admin compromise exposes them and letter content; no end-to-end encryption claim.
- Revocation stops subsequent authorized requests; it cannot erase delivered/in-flight bytes or browser screenshots.
- Daily best-effort cleanup can leave private objects pending physical erasure. Provider backup/log retention must be documented; no immediate-erasure claim.
- Fixed-window/global-letter throttling can cause boundary bursts or targeted lockout; high-assurance recipient verification/anti-abuse is future scope.

## 4. Final architecture and database

One Next.js App Router/TypeScript/Tailwind application on Vercel. Studio and recipient have separate routes, APIs, identity checks, and DTOs; owner preview shares scenes only. Supabase provides Auth, PostgreSQL, and private Storage. Route Handlers call a server-only DAL; Server Components call it directly. Motion handles envelope/navigation; R3F provides the procedural heart; the editor/QR generation are local app components.

Creator reads use user JWT/RLS. Writes and private access use restricted service-only transactional RPCs and explicit ownership/session checks. No browser grants for writes/private tables/Storage. Published content is frozen; unpublish invalidates access; republish rotates link. Private photo upload/decode/re-encode/download all pass through the authorized Node server.

Database relationships/tables:

- Supabase `auth.users` → `public.letters` via owner_id (many creators, many letters each).
- `public.letter_photos` → letters, six unique slots and private generated paths, pending/ready state.
- `private.letter_gates` → one identity digest and optional scrypt record per letter.
- `private.letter_shares` → one current active/inactive random link per letter.
- `private.recipient_sessions` → multiple independent letter/version-bound token digests with expiry/revocation.
- `private.rate_limit_buckets`, `private.media_cleanup_jobs`, `private.maintenance_state` → durable throttling, physical deletion retries, and bounded reconciliation progress.

Version/access-version counters, parent row locks, and creator advisory locks support safe editing, quotas, publication, and verification. No ORM, Redis, separate backend/queue service, recipient account system, snapshots, or arbitrary template builder.

## 5. Day 1 plan and external configuration

Day 1 order: environment/scaffold → verified identity and SSR clients → additive schema/RLS/private bucket → draft CRUD and editor/dashboard → private uploads and owner preview → cleanup → local and live two-creator tests → typecheck/lint/build. Recipient and publication APIs are deferred to Day 2 by the user.

The user must configure Supabase isolated test/production projects and regions, custom SMTP and verified sender/DNS, Vercel project/eligible plan/HTTPS origin, secrets/callback allowlists, and daily cleanup delivery plus operational/log access. Exact values, provider choice, and deployment target have not been supplied. Secrets belong in service settings/environment stores, not chat or source.

Supabase's [default SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp) require custom email delivery for external users. Vercel's [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) allow daily Hobby jobs with a timing window; [cron delivery](https://vercel.com/docs/cron-jobs/manage-cron-jobs) is best effort and failed invocations are not automatically retried. Configuration/testing remains required; this review did not provision either service.

## 6. Approved design and remaining operational decisions

1. **Architecture/scope — approved:** the single-app/service-only-write/private-proxy design and limits (two presets, basic editor, six 3 MiB photos, 20 active letters, 30-minute future recipient sessions, write-only DOB, unpublish-before-edit with fresh links). The user reordered the milestones to Creator Studio first.
2. **Schedule:** accept a three-day beta stretch target with up to 1–2 days contingency, or require a separately proposed scope reduction for a hard 24-hour budget. No required journey is removed without approval.
3. **Deployment configuration:** an isolated Supabase project and local origin/secrets are configured and its initial schema is verified. SMTP delivery, production region/origin, Vercel plan/target and retention settings still require confirmation before production launch.
4. **Privacy acceptance:** retain low-security name/DOB mode with optional separately shared phrase and honest limitations; accept pending best-effort physical cleanup. If stronger identity assurance or a guaranteed deletion deadline is required, redesign/estimate before coding.

Architecture is approved. Day 1 implementation and manually applied test migration are recorded in TASKS.md. Production deployment, email delivery, resource validation and remaining MVP milestones are not complete.
