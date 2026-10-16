
# SecretLove — Agent Instructions

SecretLove is a private digital letter platform: authenticated Creator Studio and gated Recipient Experience. Stack: Next.js App Router, TypeScript, Tailwind, Supabase Auth/PostgreSQL/private Storage, Motion, React Three Fiber, Vercel.

## Approval and scope

- G6 MFA source review (2026-10-17): review PASS for exact 11-file candidate in `docs/G6_MFA_SOURCE_FREEZE_REVIEW.md`; all 167 inputs match final tests, credential/whitespace/exclusion checks PASS and index empty. Hash manifests in ignored `test-results/g6-mfa-freeze-review`. Stop for separate exact one-local-commit approval; no stage/commit/push/deploy/provider mutation yet. Keep deployed baseline, migrations and environment unchanged.

- G6 local MFA remediation (2026-10-17): exact source/test/docs patch approved and implemented locally; see `docs/G6_MFA_REMEDIATION_PLAN.md`. Typecheck/lint/build PASS, 139 portable tests PASS/2 SKIPPED and 22 mocked desktop/mobile tests PASS. Same-enrollment manual key/local PNG and no implicit factor deletion; server authorization/migrations/dependencies/environment/deployed baseline unchanged. Stop for review: no real factor/account mutation, cleanup, mail, credentials, commit/push, remote settings or deployment. Current Production factor recovery and a new source freeze/deployment remain separately gated; no live MFA PASS.

- G6 MFA gate (2026-10-17): owner approved exact one-account TOTP packet for UID `3f043619-e816-49b9-ab42-e4919ef5e3d4`, then reported pre-MFA checks correct but factor state unclear and enrollment/verification/post-check errors. Stop further MFA mutations/retries/deletions and perform read-only diagnosis; obtain exact errors/statuses without QR/seeds/codes/cookies. No confirmed root cause or Creator bypass. No Creator approval, provider setting change, SQL, fixtures, cleanup, deployment or public opening. See `docs/G6_PRODUCTION_HTTPS_ACCEPTANCE.md`; earlier pending-MFA status is historical.

- G6 bootstrap gate (2026-10-17): owner approved and reports successful exact transaction in `docs/G6_OPERATOR_BOOTSTRAP.md` for Production UID `3f043619-e816-49b9-ab42-e4919ef5e3d4`, with verification counts 1/1/1/0. Bootstrap PASS is operator evidence, not agent/provider re-query; do not rerun. Prepare one-account TOTP/denial checks only; enrollment/verification still needs separate approval and must not remove unexpected existing/pending factors. No credential export, migration/RLS/grant change, Creator approval, cleanup, deployment or public opening is authorized.

- G6 Recovery gate (2026-10-17): owner approved and subsequently reported PASS for one normal application Recovery request, Inbox delivery/correct domain/reset page, private password setup and local sign-out/login for newly invited Production account `nguyencongduociot2124@gmail.com`; final access remains pending. This is operator evidence, not independent browser/cookie/replay verification. No agent reads passwords/tokens/cookies. Next collect only exact Production Auth UID and email-confirmation status to prepare separately reviewed bootstrap SQL; no bootstrap, MFA enrollment, Creator approval, replay tests, fixtures, cleanup or public opening is authorized. Earlier Recovery-pending statements below are historical.

- G6 invitation gate (2026-10-17): owner explicitly approved checking Production Auth user existence and, only if absent, sending exactly one Dashboard Invite to `nguyencongduociot2124@gmail.com` in project `mdoaageegovutlxhhicz`, followed by private callback/pending-access verification. Existing identity or error means stop; no automatic resend. Operator performs Dashboard/mail actions because available browser automation is blocked. Recovery/password setup, role bootstrap, MFA enrollment, Creator approval, fixtures and cleanup still require their own approvals. Approval is not execution evidence; see the G6 report.

- Current G6 (2026-10-17): owner confirmed `codex/g6-production-https-acceptance`. Frozen deployed source is `f1832f7be25a312974d79bcc9a44a9d86ffe7942`; protected Production deployment and canonical alias assignment were separately approved and completed. Only read-only HTTPS acceptance preparation and evidence/documentation are currently authorized. Preserve All Deployments protection and the new Production backend; no further deployment, public opening, invitations/recovery mail, bootstrap, fixtures, SQL, cleanup, credentials, commit or push without a separate exact approval. See `docs/G6_PRODUCTION_HTTPS_ACCEPTANCE.md`. Earlier G4/G5 pending statuses below are historical where superseded.

- Latest G5: owner requested source-freeze preparation and confirmed `codex/g5-production-source-freeze`. Review carried G4.4 changes, verify deployment-source continuity/exclusions, and prepare the exact commit manifest/report. Do not change runtime/guard/migrations, read secrets, stage, commit/push, mutate remote settings/data, invite users, send mail, run cleanup or deploy. A local commit requires separate approval of the reviewed file manifest. See `docs/G5_PRODUCTION_SOURCE_FREEZE_REVIEW.md`.

- Latest G4.4: owner authorized local Production binding/guard/tests/docs updates on `codex/g4-production-configuration`: origin `https://secretlove-production.vercel.app`, backend `mdoaageegovutlxhhicz`. G4.1–G4.3 completion is operator-reported, not direct provider/HTTPS acceptance. Preserve historical Preview/owner-only modes and migrations 001–009. Do not read/change `.env.local`, use real credentials, mutate remote settings/data, send mail, create fixtures, invoke cleanup, commit/push or deploy. See `docs/G4_PRODUCTION_CONFIGURATION_STATUS.md` for current evidence and outstanding gates. Earlier milestone restrictions/status below are historical where superseded.

- Latest: user approved G3 public-release implementation on `codex/g3-production-implementation`, following `docs/G2_PUBLIC_PRODUCTION_DESIGN.md`. Local approval/report/operator/privacy/public guard work is authorized. New migration 009 is for the separately approved new Production backend only. Preserve 001–008, `.env.local`, historical test data and the existing server; no remote SQL/settings/accounts/mail/fixtures, cleanup, commit/push or deployment without their later exact gates. See `docs/G3_PUBLIC_RELEASE_IMPLEMENTATION.md` and the G4 preparation packet.

- Read docs/PRD.md, docs/ARCHITECTURE.md, docs/ARCHITECTURE_REVIEW.md, docs/DATABASE.md, docs/API.md, and TASKS.md before work.
- The user approved the core and Day 1.5 architecture and authorized Day 2 publishing/access plus the complete recipient scenes (previously planned for Day 3). Preserve Day 1 functionality and .env.local; no destructive SQL. Advanced theme/drag-and-drop editors, video, private music uploads and deployment remain outside this milestone.
- After approval, implement one milestone at a time; keep future features out of scope. The three-day target is a stretch estimate requiring schedule/scope approval. Record approval and progress in TASKS.md.
- Public-release phases follow docs/PUBLIC_PRODUCTION_WORKFLOW.md. Present a new `codex/gN-...` branch command before each phase and verify the branch before work; preserve uncommitted work and do not commit/merge/push automatically. G2 is design-only; implementation, remote configuration, deployment and public opening have separate approval gates.

## Implementation

- Prefer simple maintainable architecture and existing conventions; avoid unnecessary dependencies.
- Use Server Components for server data/shells; Client Components for forms, editor, and animations. Share authorization logic in a server-only DAL.
- Mobile-first layout; accessible labels/focus/controls; loading, empty, validation, error, and reduced-motion/fallback states.
- No mock success in production paths, hardcoded personal data/secrets, or silent security-check removal.

## Security

- Read docs/SECURITY.md before modifying authentication/authorization, recipient verification, sessions, protected content APIs, or Storage permissions.
- Never expose service-role/server secrets or protected letter content before authorization; private letter media must never use public Storage.
- Validate all input and enforce ownership server-side on every entry point; service role bypasses RLS and needs explicit checks.
- Enforce recipient letter-bound session, expiry, publication, and access version on every content/media request. Name/DOB is low security, not identity proof.
- Published letters are frozen; unpublish before edits. Republish rotates the link and invalidates prior access. No secret content in metadata, hydration, preloads, shared caches, or logs.

## Completion

- Test important business/security rules and relevant failure/concurrency cases against an isolated environment.
- Run typecheck, lint, production build, and relevant tests after implementation; fix failures before marking a milestone complete. Planning-only edits do not require nonexistent app checks.
- Update TASKS.md with acceptance evidence, failures, and remaining work. Summarize changed files and limitations honestly.
- Deploy only to an approved target after release gates pass; never mark proposed or untested behavior implemented.
