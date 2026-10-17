# G3 — Local public-release controls

2026-10-16, Asia/Bangkok. Owner explicitly approved G3 after switching to `codex/g3-production-implementation`. Baseline HEAD: `5f25d2ec7f5aebd67274d0234ff612105833e02a`, initially clean. This approval covers the G2 implementation locally, not G4 settings/SQL/accounts/mail, Git commit/push, deployment or public opening.

## Implemented source

- Authenticated identity is separate from fresh Creator approval and registry/verified-AAL2 operator access. Closed application signup returns `REGISTRATION_CLOSED` without calling provider signup. Pending/suspended users can recover passwords and sign out. Invite callback accepts `type=invite` without issuing a recovery proof; setup uses a separate fresh recovery email and the existing single-use proof 007.
- Migration `202610160009_public_release_controls.sql` creates five private RLS tables with no user seeds or approval backfill. All privileged gateways remain service-only except the no-argument, current-user boolean RLS predicate `sl_creator_is_active()`, authenticated-only and fixed-search-path SECURITY DEFINER. The generic RPC transport was narrowly extracted to avoid an identity import cycle.
- Approval checks cover owner RLS/view, central letter/ingest locks and independent create/read/finalize/reserve gateways. Recipient bootstrap, gate, session issuance and central content/photo/audio authorization require an approved owner and no hold. Owner preview/edit remains available while held; publish/share do not. Cleanup/failure/cancel/Close do not require approved Creator role.
- Operator registry is separate from Creator approval. `/operator/security` permits active operators at AAL1 to enroll/challenge TOTP through the existing SDK; all report/admin data/actions require verified matching claims at AAL2. No app operator bootstrap/grant, invitation, Auth-delete or email endpoint is added. Proxy refresh covers Studio, operator and access-pending routes.
- Report intake has strict 8 KiB JSON, Unicode/UTF-8 limits, same-Origin checks and durable HMAC-scoped limits before target lookup. Valid-shaped unknown tokens receive a real persisted generic receipt. Report descriptions render as plain escaped text; they are excluded from audit/logs. Operator lists paginate by UUID, maximum 50. Detail reads are audited.
- Hold and Creator suspension invalidate shares, sessions and access versions transactionally. Clear/reapproval never republishes or restores old access. Mutations require expected revisions; stale actions must reload. Operator audit failure rolls back changes. Scoped deletion shares an internal tombstone helper after explicit operator authorization; it does not impersonate an owner RPC. Case reference and reason are restricted audit fields, never letter contents.
- Privacy/report/request links are available on public/auth/Studio/reading shells. `/privacy` deliberately remains a draft with pending contact when unset; no legal-compliance or physical-erasure guarantee. Account closure remains an individually verified operator process. Finite report/audit retention is supported by a bounded maintenance gateway; cron remains disabled and has not been invoked.
- `public-private-gate` adds a Production-only guard bound to exact project/team/origin and a **new** Production Supabase reference. `config/public-deployment.json` intentionally has `supabaseProjectRef: null`: deployment must fail closed until G4 supplies an approved real public identifier. No fallback to the old test reference. Modern credentials, independent security secrets, Corepack, conservative upload limit and a real contact are checked without logging values. Existing private Preview/owner-only paths remain separate.
- Tailwind class detection is explicitly bounded to `src` through `source('../')` in `src/app/globals.css`. The clean snapshots omit local ignore/credential files; default scanning did not complete a five-second isolated PostCSS probe, while explicit source scanning completed in about 0.2 seconds. A regression compiles real UI utilities and excludes a class placed in a disposable build artifact outside `src`. No dependency, component style definition, authentication guard or deployment setting was removed. This uses Tailwind's [documented source base path](https://tailwindcss.com/docs/detecting-classes-in-source-files#setting-your-base-path).

## SQL review and coverage

001–008 remain unchanged. 009 is one transaction with a bounded lock timeout. Application-time operations are DDL, grants/revokes and function definitions; there is no top-level user seed/backfill, data DELETE, TRUNCATE or table DROP. Runtime deletion bodies are limited to explicit moderation, suspension, tombstones and maintenance. Narrow ALTER POLICY adds approval predicates, never disables RLS. Do not apply 009 to the historical isolated project.

| Boundary | Gateways covered |
| --- | --- |
| Direct approval | `private.lock_letter`, `private.sl_ingest_lock`, create, gate flags, photo finalize/path, audio finalize/owner/reserve, share, ingest flags/begin, owner delete |
| Through letter lock | Save, photo reserve/change, music settings/remove, publish/unpublish |
| Through ingest lock | Part reserve/ready, commit begin/finish |
| Before recipient session | Bootstrap, verification gate, session issue |
| Every protected recipient read | Central `private.recipient_letter` → content/photo/audio; existing HTTP authorization remains before HEAD/Range/416 |
| Termination-only exceptions | Photo/audio fail, ingest release/cancel, Close and service maintenance; ownership/path/lease checks preserved |

Lock ordering is registry → Creator membership → parent letter(s sorted by UUID) → dependent records. Approved Creator paths lock membership before advisory/parent locks; operator suspension locks membership for update before parents. In-flight authorized reads/bytes can finish; subsequent authorized requests must deny after revocation commits. No immediate recall of downloaded bytes is promised.

Final SQL review corrected a local-only metadata disclosure before remote application: the new `sl_share` initially checked hold before ownership. Ownership now precedes moderation, so an approved foreign Creator receives `NOT_FOUND` for both held and other unavailable letters. The regression is included in the hold/isolation DB test. No remote project received the defective 009 definition.

## Validation and limits

| Check | Actual result / evidence |
| --- | --- |
| Next type generation + TypeScript | PASS, credential-free candidate snapshot |
| ESLint | PASS, no warnings in the final candidate |
| PGlite database integration/catalog/RLS | PASS, 42 tests using real local PostgreSQL execution, not hosted Supabase |
| Identity/operator/report/auth boundaries | PASS, 9 tests with mocked Supabase SDK/HTTP boundaries |
| All local tests including existing scenes/music/private transport | PASS, 122 passed / 0 failed / 2 skipped, 12 files |
| Production build | PASS, exit 0, 99 seconds; full Next.js production compilation on the final candidate |
| Applied migrations 001–008 | PASS, unchanged against baseline Git source |
| Migration 009 application-time destructive DML review | PASS, no top-level data deletion/backfill; no remote application |
| Actual installed CLI source selection | PASS, 164 files; required binding/source/nine migrations retained, credential/private artifacts excluded; no upload/network |
| Staged files / remote mutations | Empty index / none performed |
| Live modern Storage + optional decoder-capacity test | SKIPPED, not PASS |
| New-backend provider/MFA/email/browser/multi-connection races/physical cleanup/HTTPS acceptance | NOT TESTED; separate scoped authorization and prerequisites required |

Candidate evidence is retained only under ignored `test-results` and the local visualization workspace. Validation runners use a system-variable allowlist and inert test values; they do not import local/Preview/Production credentials. Obsolete/slow compiler runs were stopped only after process-tree identity verification; their partial outputs are not final source-freeze evidence. No application server was intentionally restarted or stopped. A dev server watching this checkout can pick up the new source; do not point the G3 branch at the old 001–008-only backend and expect approved-Creator access. Missing 009 correctly fails closed.

Final evidence: ignored `test-results/g3-validation-1792124435371/validation-results.json` and its logs/source manifest. Typegen 1 s, typecheck 18 s, lint 26 s, tests 15 s, production build 99 s: all exit 0. **122 PASS / 0 FAIL / 2 SKIPPED**. All **164 deployment inputs remained unchanged** during this complete run; historical migrations 001–008 unchanged and source-safety checks PASS. No reuse of the earlier partial build or SQL-only proof was needed. Earlier development runs found and corrected callback/reset/validation/type/hold-isolation issues; their partial results do not certify the final candidate. Tests execute disposable in-memory PostgreSQL/PGlite and mocked SDK/HTTP boundaries with inert test values only, never the hosted isolated Supabase or `.env.local`.

PGlite serializes queued commands: stale competing operations and rollback are tested, but independent PostgreSQL connections/deadlock scheduling are **NOT TESTED**. They remain a G4/G6 acceptance requirement, along with real provider signup denial, invitation/recovery delivery, TOTP enrollment/AAL2, new-backend RLS, trusted IP and physical cleanup. Browser flows on the new backend are NOT TESTED until separately authorized fixtures/configuration exist.

Actual modern Storage GET/206/HEAD/416, anonymous/cross-letter/revocation denial, >4.5 MB Vercel upload/streaming, HTTPS/cookies/CSP and Heart/music/mobile regression on the target remain **NOT TESTED**. Optional local live Storage remains SKIPPED; no fixture was created. Historical synthetic data and running local backend configuration are preserved.

## Decision

**GO for local G3 source review / preparing a separately approved G4.** Final local checks pass; this is not a hosted or public-release acceptance. Backend provisioning, actual SQL and onboarding/bootstrap require their own exact approval. Public release and any new deployment remain **NO-GO** pending real backend binding/contact/provider operations, true multi-connection races and hosted acceptance. No automatic G4, deployment retry, alias assignment, Cron, credential change, commit or push.
